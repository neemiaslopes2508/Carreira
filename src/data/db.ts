import { links, validateRelations, deleteImpact } from "./domain";
export { deleteImpact, validateRelations } from "./domain";
import Dexie, { type Table } from "dexie";
import {
  schemas,
  kinds,
  stamp,
  today,
  type Kind,
  type RecordData,
  type Snapshot,
  type Entity,
} from "./models";
export class CareerDB extends Dexie {
  constructor(name = "CareerOS") {
    super(name);
    this.version(1).stores(
      Object.fromEntries(
        kinds
          .filter(
            (k) =>
              ![
                "careerPlans",
                "planSteps",
                "milestones",
                "deliverables",
                "resources",
              ].includes(k),
          )
          .map((k) => [k, "id,updatedAt"]),
      ),
    );
    this.version(2).stores({ metadata: "id" });
    this.version(3).stores({
      careerPlans: "id,templateKey,updatedAt",
      planSteps: "id,planId,updatedAt",
      milestones: "id,planId,updatedAt",
      deliverables: "id,stepId,milestoneId,updatedAt",
      resources: "id,stepId,updatedAt",
    });
  }
  records(k: Kind) {
    return this.table(k) as Table<RecordData, string>;
  }
}
export const db = new CareerDB();
export async function snapshot(database = db): Promise<Snapshot> {
  return database.transaction(
    "r",
    kinds.map((k) => database.table(k)),
    async () =>
      Object.fromEntries(
        await Promise.all(
          kinds.map(async (k) => [
            k,
            k === "events"
              ? (await database.table(k).toArray()).sort(
                  (a, b) => a.sequence - b.sequence,
                )
              : await database.table(k).toArray(),
          ]),
        ),
      ),
  ) as Promise<Snapshot>;
}
export async function save(
  kind: Kind,
  input: Record<string, unknown>,
  database = db,
) {
  if (kind === "events" || kind === "applications")
    throw Error("Use o registro de etapas para alterar candidaturas.");
  const row = schemas[kind].parse(input) as RecordData;
  await database.transaction(
    "rw",
    kinds.map((k) => database.table(k)),
    async () => {
      if (
        ["declarations", "assessments"].includes(kind) &&
        (await database.table(kind).get(row.id))
      )
        throw Error("Histórico preservado: adicione um novo registro.");
      if (kind === "careerPlans" && row.templateKey) {
        const other = await database
          .table("careerPlans")
          .where("templateKey")
          .equals(String(row.templateKey))
          .first();
        if (other && other.id !== row.id)
          throw Error("Este modelo de plano já foi criado.");
      }
      const data = await snapshot(database);
      (data[kind] as Entity[]) = (data[kind] as Entity[])
        .filter((r) => r.id !== row.id)
        .concat(row);
      validateRelations(data);
      await database.records(kind).put(row);
    },
  );
}
export async function changeStage(
  jobId: string,
  stage: Entity<"applications">["stage"],
  date = today(),
  reason = "",
  certainty: Entity<"events">["certainty"] = "Desconhecido",
  notes = "",
  database = db,
) {
  await database.transaction(
    "rw",
    kinds.map((k) => database.table(k)),
    async () => {
      if (!(await database.table("jobs").get(jobId)))
        throw Error("Vaga inexistente");
      let application = (await database
        .table("applications")
        .filter((a) => a.jobId === jobId)
        .first()) as Entity<"applications"> | undefined;
      application = application
        ? { ...application, stage, updatedAt: new Date().toISOString() }
        : { ...stamp(), jobId, stage };
      const previous = await database
        .table("events")
        .filter((e) => e.applicationId === application!.id)
        .toArray();
      const sequence = Math.max(0, ...previous.map((e) => e.sequence)) + 1;
      const event = schemas.events.parse({
        ...stamp(),
        applicationId: application.id,
        sequence,
        stage,
        date,
        reason,
        certainty,
        notes,
      });
      await database.table("applications").put(application);
      await database.table("events").add(event);
    },
  );
}
export async function remove(kind: Kind, id: string, database = db) {
  await database.transaction(
    "rw",
    kinds.map((k) => database.table(k)),
    async () => {
      const data = await snapshot(database),
        cascade = deleteImpact(kind, id, data);
      for (const k of kinds) {
        for (const row of data[k]) {
          if (cascade.get(k)?.has(row.id)) {
            await database.table(k).delete(row.id);
            continue;
          }
          const changed = { ...row } as RecordData;
          let dirty = false;
          for (const [field, target] of Object.entries(links[k] ?? {}))
            if (cascade.get(target)?.has(String(changed[field]))) {
              delete changed[field];
              dirty = true;
            }
          if (k === "requirements") {
            const ids = changed.evidenceIds as string[];
            const filtered = ids.filter(
              (i) => !cascade.get("evidence")?.has(i),
            );
            if (filtered.length !== ids.length) {
              changed.evidenceIds = filtered;
              dirty = true;
            }
          }
          if (k === "planSteps") {
            const ids = changed.skillIds as string[];
            const kept = ids.filter((i) => !cascade.get("skills")?.has(i));
            if (kept.length !== ids.length) {
              changed.skillIds = kept;
              dirty = true;
            }
          }
          if (k === "careerPlans") {
            const pathIds = changed.pathIds as string[];
            const focusIds = changed.highlightPathIds as string[];
            const kept = pathIds.filter((i) => !cascade.get("paths")?.has(i));
            const focusKept = focusIds.filter(
              (i) => !cascade.get("paths")?.has(i),
            );
            if (
              kept.length !== pathIds.length ||
              focusKept.length !== focusIds.length
            ) {
              changed.pathIds = kept;
              changed.highlightPathIds = focusKept;
              dirty = true;
            }
          }
          if (dirty) {
            changed.updatedAt = new Date().toISOString();
            await database.table(k).put(changed);
          }
        }
      }
    },
  );
}
export async function initialize() {
  await db.transaction("rw", db.table("profiles"), async () => {
    if (!(await db.table("profiles").count()))
      await db.table("profiles").add({
        ...stamp(),
        summary: "",
        preferences: "",
        salaryMin: 4000,
        salaryMax: 5000,
        regime: "CLT",
        weeklyHours: 6,
        priorities:
          "Estabilidade; aprendizado e crescimento; remuneração; competências valorizadas; segurança para futuras oportunidades.",
      });
  });
}
export async function addDemo() {
  await db.transaction(
    "rw",
    kinds.map((k) => db.table(k)),
    async () => {
      const data = await snapshot();
      if (kinds.some((k) => k !== "profiles" && data[k].length))
        throw Error(
          "Demonstração disponível apenas em uma base sem cadastros. Exporte seus dados antes de restaurar uma base vazia.",
        );
      const path = {
        ...stamp(),
        name: "Análise de Sistemas / Funcional",
        kind: "Hipótese principal",
      };
      await db.table("paths").add(path);
      await db.table("paths").bulkAdd([
        { ...stamp(), name: "CRM / HubSpot", kind: "Estratégico" },
        { ...stamp(), name: "QA Funcional / Integração", kind: "Alternativa" },
      ]);
      const skill = schemas.skills.parse({
        ...stamp(),
        name: "Levantamento de requisitos",
        priority: "Alta",
      });
      await db.table("skills").add(skill);
      const job = schemas.jobs.parse({
        ...stamp(),
        company: "Aurora Sistemas (fictícia)",
        title: "Analista Funcional",
        tracking: "Avaliando",
        origin: "Demonstração",
        interest: "Interessado",
        pathId: path.id,
      });
      await db.table("jobs").add(job);
      await db.table("actions").add(
        schemas.actions.parse({
          ...stamp(),
          title: "Mapear requisitos da oportunidade",
          priority: "Alta",
          status: "A fazer",
          jobId: job.id,
          skillId: skill.id,
          due: today(),
        }),
      );
    },
  );
}
