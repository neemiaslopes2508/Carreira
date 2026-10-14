import "fake-indexeddb/auto";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { CareerDB, save, changeStage, snapshot, remove } from "../src/data/db";
import { stamp, schemas, weeklyMinutes } from "../src/data/models";
import { exportBackup, restoreBackup, parseBackup } from "../src/data/backup";
let db: CareerDB;
beforeEach(() => {
  db = new CareerDB("test-" + crypto.randomUUID());
});
afterEach(async () => {
  await db.delete();
});
async function seed() {
  const job = schemas.jobs.parse({
    ...stamp(),
    company: "Empresa fictícia",
    title: "Analista",
    tracking: "Salva",
    interest: "Em dúvida",
  });
  const skill = schemas.skills.parse({
    ...stamp(),
    name: "Requisitos",
    priority: "Alta",
  });
  const action = schemas.actions.parse({
    ...stamp(),
    title: "Estudar",
    priority: "Alta",
    status: "A fazer",
    jobId: job.id,
    skillId: skill.id,
    estimatedMinutes: 900,
  });
  await save("jobs", job, db);
  await save("skills", skill, db);
  await save("actions", action, db);
  return { job, skill, action };
}
describe("Regras do CareerOS", () => {
  it("preserva histórico ao pular, retroagir e corrigir a etapa; uma candidatura por vaga", async () => {
    const { job } = await seed();
    await changeStage(
      job.id,
      "Teste",
      "2026-10-10",
      "",
      "Desconhecido",
      "",
      db,
    );
    await changeStage(
      job.id,
      "Entrevista",
      "2026-10-08",
      "",
      "Desconhecido",
      "Correção",
      db,
    );
    const data = await snapshot(db);
    expect(data.applications).toHaveLength(1);
    expect(data.applications[0].stage).toBe("Entrevista");
    expect(data.events.map((e) => e.stage)).toEqual(["Teste", "Entrevista"]);
    expect(data.events[1].date).toBe("2026-10-08");
    expect(data.jobs[0].tracking).toBe("Salva");
  });
  it("ações, estudos e evidências não elevam nível de competência", async () => {
    const { skill, action } = await seed();
    await save(
      "declarations",
      schemas.declarations.parse({
        ...stamp(),
        skillId: skill.id,
        level: "Básico",
        date: "2026-10-13",
        justification: "Autoavaliação",
      }),
      db,
    );
    await save(
      "actions",
      { ...action, status: "Concluída", completedAt: "2026-10-13" },
      db,
    );
    await save(
      "evidence",
      schemas.evidence.parse({
        ...stamp(),
        skillId: skill.id,
        actionId: action.id,
        date: "2026-10-13",
        description: "Exercício",
      }),
      db,
    );
    const data = await snapshot(db);
    expect(data.skills[0]).toEqual(skill);
    expect(data.declarations[0].level).toBe("Básico");
    expect(data.assessments).toHaveLength(0);
  });
  it("contabiliza só sessões da semana local, incluindo domingo, sem estimativas", async () => {
    const { action } = await seed();
    for (const [date, minutes] of [
      ["2026-10-11", 100],
      ["2026-10-12", 30],
      ["2026-10-18", 45],
      ["2026-10-19", 90],
    ] as const)
      await save(
        "sessions",
        schemas.sessions.parse({
          ...stamp(),
          actionId: action.id,
          date,
          minutes,
        }),
        db,
      );
    expect(weeklyMinutes((await snapshot(db)).sessions, "2026-10-13")).toBe(75);
  });
  it("exporta e restaura todos os relacionamentos e eventos", async () => {
    const { job, skill, action } = await seed();
    await changeStage(
      job.id,
      "Candidatado",
      "2026-10-13",
      "",
      "Desconhecido",
      "",
      db,
    );
    const evidence = schemas.evidence.parse({
      ...stamp(),
      skillId: skill.id,
      actionId: action.id,
      description: "Mapeamento",
      date: "2026-10-13",
    });
    await save("evidence", evidence, db);
    await save(
      "requirements",
      schemas.requirements.parse({
        ...stamp(),
        jobId: job.id,
        name: "Requisitos",
        kind: "Obrigatório",
        skillId: skill.id,
        status: "Parcial",
        evidenceIds: [evidence.id],
      }),
      db,
    );
    const before = await snapshot(db);
    const backup = await exportBackup(db);
    await remove("jobs", job.id, db);
    await restoreBackup(JSON.parse(JSON.stringify(backup)), db);
    expect(await snapshot(db)).toEqual(before);
  });
  it("backup inválido, duplicado, data impossível ou vínculo quebrado não altera base", async () => {
    await seed();
    const before = await snapshot(db);
    const original = await exportBackup(db);
    for (const mutate of [
      (b: any) => (b.version = 99),
      (b: any) => b.data.jobs.push(b.data.jobs[0]),
      (b: any) => (b.data.actions[0].jobId = "inexistente"),
      (b: any) => (b.data.actions[0].due = "2026-02-31"),
    ]) {
      const bad = structuredClone(original);
      mutate(bad);
      await expect(restoreBackup(bad, db)).rejects.toThrow();
      expect(await snapshot(db)).toEqual(before);
    }
    expect(() => parseBackup({})).toThrow();
  });
  it("exclusão de vaga elimina dependentes, mantém competência, projeto e ação desvinculada", async () => {
    const { job, skill, action } = await seed();
    await changeStage(
      job.id,
      "Candidatado",
      "2026-10-13",
      "",
      "Desconhecido",
      "",
      db,
    );
    await save(
      "contacts",
      schemas.contacts.parse({
        ...stamp(),
        jobId: job.id,
        date: "2026-10-13",
        channel: "Email",
      }),
      db,
    );
    await remove("jobs", job.id, db);
    const data = await snapshot(db);
    expect(data.jobs).toHaveLength(0);
    expect(data.applications).toHaveLength(0);
    expect(data.events).toHaveLength(0);
    expect(data.contacts).toHaveLength(0);
    expect(data.skills[0].id).toBe(skill.id);
    expect(data.actions[0].id).toBe(action.id);
    expect(data.actions[0].jobId).toBeUndefined();
  });
  it("excluir evidência limpa requisitos; excluir ação limpa sessões e preserva evidência", async () => {
    const { job, skill, action } = await seed();
    const e = schemas.evidence.parse({
      ...stamp(),
      skillId: skill.id,
      actionId: action.id,
      date: "2026-10-13",
      description: "Exercício",
    });
    await save("evidence", e, db);
    await save(
      "sessions",
      schemas.sessions.parse({
        ...stamp(),
        actionId: action.id,
        date: "2026-10-13",
        minutes: 30,
      }),
      db,
    );
    await remove("actions", action.id, db);
    expect((await snapshot(db)).evidence[0].actionId).toBeUndefined();
    expect((await snapshot(db)).sessions).toHaveLength(0);
    await save(
      "requirements",
      schemas.requirements.parse({
        ...stamp(),
        jobId: job.id,
        name: "Teste",
        kind: "Desejável",
        status: "Parcial",
        evidenceIds: [e.id],
      }),
      db,
    );
    await remove("evidence", e.id, db);
    expect((await snapshot(db)).requirements[0].evidenceIds).toEqual([]);
  });
  it("migra banco v1 para v3 preservando registros", async () => {
    const name = "migration-" + crypto.randomUUID();
    const { default: Dexie } = await import("dexie");
    const old = new Dexie(name);
    old
      .version(1)
      .stores(
        Object.fromEntries(
          Object.keys(schemas).map((k) => [k, "id,updatedAt"]),
        ),
      );
    await old
      .table("skills")
      .add(
        schemas.skills.parse({ ...stamp(), name: "Legado", priority: "Alta" }),
      );
    old.close();
    const migrated = new CareerDB(name);
    expect((await migrated.table("skills").toArray())[0].name).toBe("Legado");
    expect(migrated.verno).toBe(3);
    await migrated.delete();
  });
  it("uma falha durante a escrita reverte toda a restauração", async () => {
    await seed();
    const before = await snapshot(db);
    const backup = await exportBackup(db);
    backup.data.jobs[0].title = "Modificado";
    const fail = () => {
      throw Error("Falha simulada de escrita");
    };
    db.table("skills").hook("creating", fail);
    await expect(restoreBackup(backup, db)).rejects.toThrow("Falha simulada");
    db.table("skills").hook("creating").unsubscribe(fail);
    expect(await snapshot(db)).toEqual(before);
  });
  it("preserva avaliações e autodeclarações contra sobrescrita", async () => {
    const { skill } = await seed();
    const assessment = schemas.assessments.parse({
      ...stamp(),
      skillId: skill.id,
      criteria: "Explicar regras e exceções",
      result: "Básico",
      date: "2026-10-13",
      responsible: "Autoavaliação",
    });
    await save("assessments", assessment, db);
    await expect(
      save("assessments", { ...assessment, result: "Avançado" }, db),
    ).rejects.toThrow("Histórico preservado");
    const declaration = schemas.declarations.parse({
      ...stamp(),
      skillId: skill.id,
      level: "Iniciante",
      date: "2026-10-13",
      justification: "Primeiro registro",
    });
    await save("declarations", declaration, db);
    await expect(
      save("declarations", { ...declaration, level: "Avançado" }, db),
    ).rejects.toThrow("Histórico preservado");
    expect((await snapshot(db)).assessments[0].result).toBe("Básico");
    expect((await snapshot(db)).declarations[0].level).toBe("Iniciante");
  });
  it("excluir projeto apenas desvincula a evidência e preserva a competência", async () => {
    const { skill } = await seed();
    const project = schemas.projects.parse({
      ...stamp(),
      name: "Exercício fictício",
      kind: "Projeto",
    });
    await save("projects", project, db);
    await save(
      "evidence",
      schemas.evidence.parse({
        ...stamp(),
        skillId: skill.id,
        projectId: project.id,
        description: "Resultado do exercício",
        date: "2026-10-13",
      }),
      db,
    );
    await remove("projects", project.id, db);
    const data = await snapshot(db);
    expect(data.projects).toHaveLength(0);
    expect(data.evidence).toHaveLength(1);
    expect(data.evidence[0].projectId).toBeUndefined();
    expect(data.skills[0].id).toBe(skill.id);
  });
  it("não converte salário desconhecido em zero e rejeita links executáveis", async () => {
    const { job } = await seed();
    expect((await snapshot(db)).jobs[0].salaryMin).toBeUndefined();
    await expect(
      save("jobs", { ...job, link: "javascript:alert(1)" }, db),
    ).rejects.toThrow();
    expect((await snapshot(db)).jobs[0].link).toBe("");
  });
});
