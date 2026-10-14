import "fake-indexeddb/auto";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import Dexie from "dexie";
import { CareerDB, save, snapshot, remove } from "../src/data/db";
import { schemas, stamp, kinds } from "../src/data/models";
import {
  createTemplate,
  templatePreview,
  addDays,
  addMonths,
  TEMPLATE_KEY,
} from "../src/data/planTemplate";
import { exportBackup, restoreBackup, parseBackup } from "../src/data/backup";
let database: CareerDB;
beforeEach(() => {
  database = new CareerDB("plan-test-" + crypto.randomUUID());
});
afterEach(async () => {
  await database.delete();
});

describe("Plano de carreira 2026–2027", () => {
  it("cria o modelo completo e reutiliza entidades sem alterar registros reais", async () => {
    const existing = schemas.skills.parse({
      ...stamp(),
      name: "SQL",
      description: "Minha descrição",
      priority: "Alta",
    });
    const oldAction = schemas.actions.parse({
      ...stamp(),
      title: "Iniciar estudos de SQL",
      priority: "Baixa",
      status: "Concluída",
      completedAt: "2026-10-12",
    });
    const job = schemas.jobs.parse({
      ...stamp(),
      company: "Empresa real",
      title: "Analista",
      tracking: "Salva",
      interest: "Interessado",
      origin: "Real",
    });
    await save("skills", existing, database);
    await save("actions", oldAction, database);
    await save("jobs", job, database);
    const preview = templatePreview(await snapshot(database));
    expect(preview.reused.skills).toBe(1);
    expect(preview.reused.actions).toBe(1);
    const result = await createTemplate("2026-10-13", database);
    expect(result.alreadyCreated).toBe(false);
    const data = await snapshot(database);
    expect(data.careerPlans).toHaveLength(1);
    expect(data.careerPlans[0].templateKey).toBe(TEMPLATE_KEY);
    expect(data.careerPlans[0].referencePeriod).toContain("2026");
    expect(data.careerPlans[0].pathIds).toHaveLength(5);
    expect(data.careerPlans[0].highlightPathIds).toHaveLength(3);
    expect(data.planSteps).toHaveLength(6);
    expect(data.deliverables).toHaveLength(6);
    expect(data.milestones).toHaveLength(6);
    expect(data.actions).toHaveLength(13);
    expect(data.resources).toHaveLength(10);
    expect(data.projects).toHaveLength(1);
    expect(data.paths).toHaveLength(5);
    expect(data.jobs).toEqual([job]);
    expect(data.skills.find((s) => s.id === existing.id)).toEqual(existing);
    const reused = data.actions.find((a) => a.id === oldAction.id)!;
    expect(reused.status).toBe("Concluída");
    expect(reused.priority).toBe("Baixa");
    expect(reused.planId).toBe(data.careerPlans[0].id);
    expect(reused.stepId).toBeDefined();
    expect(reused.milestoneId).toBeDefined();
    expect(
      data.deliverables.every((d) => d.projectId === data.projects[0].id),
    ).toBe(true);
    expect(
      data.deliverables.every((d) => d.status === "Planejada" && !d.evidenceId),
    ).toBe(true);
    expect(
      data.resources.every((r) => r.verification === "Não verificado"),
    ).toBe(true);
    expect(data.sessions).toHaveLength(0);
    expect(data.assessments).toHaveLength(0);
  });
  it("repetir a importação não duplica nem modifica dados", async () => {
    await createTemplate("2026-10-13", database);
    const before = await snapshot(database);
    expect((await createTemplate("2027-01-31", database)).alreadyCreated).toBe(
      true,
    );
    expect(await snapshot(database)).toEqual(before);
  });
  it("usa meses civis e representa horizontes sem inventar dia", async () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02");
    expect(addDays("2027-01-31", 30)).toBe("2027-03-02");
    await createTemplate("2027-01-31", database);
    const data = await snapshot(database);
    expect(
      [...data.planSteps]
        .sort((a, b) => a.order - b.order)
        .map((s) => s.startMonth),
    ).toEqual([
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
    ]);
    const ordered = [...data.milestones].sort((a, b) => a.order - b.order);
    expect(ordered[0].dueDate).toBe("2027-03-02");
    expect(ordered[4].dueDate).toBeUndefined();
    expect(ordered[4].horizonStartMonth).toBe("2028-01");
    expect(ordered[5].horizonStartMonth).toBe("2030-01");
    expect(ordered[5].horizonEndMonth).toBe("2032-01");
  });
  it("concluir ações ou entregas não conclui etapa nem promove competência", async () => {
    await createTemplate("2026-10-13", database);
    const data = await snapshot(database);
    const action = data.actions.find((a) => a.status === "A fazer")!;
    const delivery = data.deliverables[0];
    await save(
      "actions",
      {
        ...action,
        status: "Concluída",
        completedAt: "2026-10-13",
        updatedAt: new Date().toISOString(),
      },
      database,
    );
    await save(
      "deliverables",
      {
        ...delivery,
        status: "Concluída",
        completedAt: "2026-10-13",
        updatedAt: new Date().toISOString(),
      },
      database,
    );
    const after = await snapshot(database);
    expect(after.planSteps[0].status).toBe("Planejado");
    expect(
      after.deliverables.filter((d) => d.status === "Concluída"),
    ).toHaveLength(1);
    expect(after.skills).toEqual(data.skills);
    expect(after.assessments).toHaveLength(0);
  });
  it("inclui plano e vínculos no backup v2 e aceita backup legado v1", async () => {
    const job = schemas.jobs.parse({
      ...stamp(),
      company: "Legada",
      title: "Analista",
      tracking: "Salva",
      interest: "Em dúvida",
    });
    await save("jobs", job, database);
    const legacySource = await exportBackup(database);
    const legacyData = Object.fromEntries(
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
        .map((k) => [k, legacySource.data[k]]),
    );
    const legacy = { ...legacySource, version: 1, data: legacyData };
    expect(parseBackup(legacy).data.careerPlans).toEqual([]);
    await createTemplate("2026-10-13", database);
    const full = await exportBackup(database);
    expect(full.version).toBe(2);
    const before = await snapshot(database);
    await remove("careerPlans", before.careerPlans[0].id, database);
    await restoreBackup(full, database);
    expect(await snapshot(database)).toEqual(before);
    await restoreBackup(legacy, database);
    const restored = await snapshot(database);
    expect(restored.jobs[0].company).toBe("Legada");
    expect(restored.careerPlans).toHaveLength(0);
  });
  it("falha na importação reverte todos os cadastros do modelo", async () => {
    const before = await snapshot(database);
    const fail = () => {
      throw Error("Falha de escrita simulada");
    };
    database.table("milestones").hook("creating", fail);
    await expect(createTemplate("2026-10-13", database)).rejects.toThrow(
      "Falha de escrita simulada",
    );
    database.table("milestones").hook("creating").unsubscribe(fail);
    expect(await snapshot(database)).toEqual(before);
  });
  it("migra banco v2 existente sem perda", async () => {
    const name = "legacy-v2-" + crypto.randomUUID();
    const old = new Dexie(name);
    old
      .version(1)
      .stores(
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
    old.version(2).stores({ metadata: "id" });
    await old.table("skills").add(
      schemas.skills.parse({
        ...stamp(),
        name: "Histórica",
        priority: "Alta",
      }),
    );
    old.close();
    const migrated = new CareerDB(name);
    expect((await migrated.table("skills").toArray())[0].name).toBe(
      "Histórica",
    );
    expect(await migrated.table("planSteps").toArray()).toHaveLength(0);
    expect(migrated.verno).toBe(3);
    await migrated.delete();
  });
  it("excluir plano limpa suas estruturas e desvincula ações sem apagá-las", async () => {
    await createTemplate("2026-10-13", database);
    const before = await snapshot(database);
    await remove("careerPlans", before.careerPlans[0].id, database);
    const after = await snapshot(database);
    expect(after.careerPlans).toHaveLength(0);
    expect(after.planSteps).toHaveLength(0);
    expect(after.milestones).toHaveLength(0);
    expect(after.deliverables).toHaveLength(0);
    expect(after.actions).toHaveLength(13);
    expect(
      after.actions.every((a) => !a.planId && !a.stepId && !a.milestoneId),
    ).toBe(true);
  });
});
