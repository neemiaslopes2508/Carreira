import { kinds, type Kind, type Snapshot, type RecordData } from "./models";
export const links: Partial<Record<Kind, Record<string, Kind>>> = {
  jobs: { pathId: "paths" },
  requirements: { jobId: "jobs", skillId: "skills" },
  applications: { jobId: "jobs" },
  events: { applicationId: "applications" },
  contacts: { jobId: "jobs" },
  actions: {
    goalId: "goals",
    skillId: "skills",
    jobId: "jobs",
    planId: "careerPlans",
    stepId: "planSteps",
    milestoneId: "milestones",
  },
  declarations: { skillId: "skills" },
  evidence: { skillId: "skills", projectId: "projects", actionId: "actions" },
  assessments: { skillId: "skills" },
  sessions: { actionId: "actions" },
  reviews: { planId: "careerPlans" },
  planSteps: { planId: "careerPlans" },
  milestones: { planId: "careerPlans" },
  deliverables: {
    stepId: "planSteps",
    milestoneId: "milestones",
    projectId: "projects",
    evidenceId: "evidence",
    resourceId: "resources",
  },
  resources: { stepId: "planSteps" },
};
export function validateRelations(data: Snapshot) {
  for (const k of kinds) {
    const ids = new Set<string>();
    for (const row of data[k]) {
      if (ids.has(row.id)) throw Error("Identificador duplicado em " + k);
      ids.add(row.id);
      for (const [field, target] of Object.entries(links[k] ?? {})) {
        const value = (row as RecordData)[field];
        if (value && !data[target].some((r) => r.id === value))
          throw Error("Vínculo inexistente: " + k + " → " + target);
      }
    }
  }
  if (data.profiles.length > 1)
    throw Error("O backup deve conter no máximo um perfil");
  const jobs = new Set<string>();
  for (const a of data.applications) {
    if (jobs.has(a.jobId)) throw Error("Mais de uma candidatura por vaga");
    jobs.add(a.jobId);
    const events = data.events
      .filter((e) => e.applicationId === a.id)
      .sort((a, b) => a.sequence - b.sequence);
    if (new Set(events.map((e) => e.sequence)).size !== events.length)
      throw Error("Sequência de eventos duplicada");
    if (!events.length || events.at(-1)?.stage !== a.stage)
      throw Error("Histórico incompatível com a candidatura");
  }
  for (const r of data.requirements)
    for (const id of r.evidenceIds) {
      const evidence = data.evidence.find((e) => e.id === id);
      if (!evidence || (r.skillId && evidence.skillId !== r.skillId))
        throw Error("Evidência incompatível com requisito");
    }
  for (const k of ["jobs", "profiles"] as const)
    for (const r of data[k])
      if (
        r.salaryMin !== undefined &&
        r.salaryMax !== undefined &&
        r.salaryMin > r.salaryMax
      )
        throw Error("Salário mínimo maior que máximo");
  for (const a of data.actions)
    if (a.status === "Concluída" && !a.completedAt)
      throw Error("Ação concluída sem data de conclusão");
  for (const d of data.deliverables) {
    if (d.status === "Concluída" && !d.completedAt)
      throw Error("Entrega concluída sem data de conclusão");
    if (d.stepId && d.milestoneId) {
      const step = data.planSteps.find((s) => s.id === d.stepId);
      const milestone = data.milestones.find((m) => m.id === d.milestoneId);
      if (step?.planId !== milestone?.planId)
        throw Error("Etapa e marco pertencem a planos diferentes");
    }
  }
  for (const s of data.planSteps) {
    if (s.startMonth > s.endMonth)
      throw Error("Fim da etapa anterior ao início");
    for (const id of s.skillIds)
      if (!data.skills.some((k) => k.id === id))
        throw Error("Competência da etapa inexistente");
  }
  for (const m of data.milestones)
    if (
      m.horizonStartMonth &&
      m.horizonEndMonth &&
      m.horizonStartMonth > m.horizonEndMonth
    )
      throw Error("Horizonte final anterior ao inicial");
  for (const p of data.careerPlans)
    for (const id of [...p.pathIds, ...p.highlightPathIds])
      if (!data.paths.some((x) => x.id === id))
        throw Error("Caminho do plano inexistente");
  for (const a of data.actions) {
    const step = a.stepId
      ? data.planSteps.find((s) => s.id === a.stepId)
      : undefined;
    const milestone = a.milestoneId
      ? data.milestones.find((m) => m.id === a.milestoneId)
      : undefined;
    if (step && milestone && step.planId !== milestone.planId)
      throw Error("Ação vinculada a etapa e marco de planos diferentes");
    if (
      a.planId &&
      ((step && step.planId !== a.planId) ||
        (milestone && milestone.planId !== a.planId))
    )
      throw Error("Ação vinculada a outro plano");
  }
}
export function deleteImpact(kind: Kind, id: string, data: Snapshot) {
  const cascades = new Map<Kind, Set<string>>([[kind, new Set([id])]]);
  let changed = true;
  const required: Partial<Record<Kind, string[]>> = {
    requirements: ["jobId"],
    applications: ["jobId"],
    events: ["applicationId"],
    contacts: ["jobId"],
    declarations: ["skillId"],
    evidence: ["skillId"],
    assessments: ["skillId"],
    sessions: ["actionId"],
    planSteps: ["planId"],
    milestones: ["planId"],
  };
  while (changed) {
    changed = false;
    for (const k of kinds)
      for (const row of data[k])
        for (const field of required[k] ?? []) {
          const target = links[k]?.[field];
          if (
            target &&
            cascades.get(target)?.has(String((row as RecordData)[field])) &&
            !cascades.get(k)?.has(row.id)
          ) {
            if (!cascades.has(k)) cascades.set(k, new Set());
            cascades.get(k)!.add(row.id);
            changed = true;
          }
        }
    for (const d of data.deliverables) {
      const stepGone = d.stepId && cascades.get("planSteps")?.has(d.stepId);
      const milestoneGone =
        d.milestoneId && cascades.get("milestones")?.has(d.milestoneId);
      if (
        (stepGone && (!d.milestoneId || milestoneGone)) ||
        (milestoneGone && !d.stepId)
      ) {
        if (!cascades.has("deliverables"))
          cascades.set("deliverables", new Set());
        if (!cascades.get("deliverables")!.has(d.id)) {
          cascades.get("deliverables")!.add(d.id);
          changed = true;
        }
      }
    }
  }
  return cascades;
}
