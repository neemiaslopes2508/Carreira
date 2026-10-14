import { z } from "zod";
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
  }, "Data inválida");
const url = z
  .string()
  .refine(
    (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
    "Use um link HTTP ou HTTPS válido",
  )
  .default("");
const date = day.optional();
const text = z.string().default("");
const ref = z.string().optional();
const base = {
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};
export const levels = [
  "Não avaliado",
  "Iniciante",
  "Básico",
  "Intermediário",
  "Avançado",
] as const;
export const stages = [
  "Candidatado",
  "Entrevista",
  "Teste",
  "Proposta",
  "Contratado",
  "Encerrado",
] as const;
export const planStates = [
  "Planejado",
  "Em andamento",
  "Concluído",
  "Adiado",
] as const;
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const schemas = {
  profiles: z.object({
    ...base,
    summary: text,
    preferences: text,
    salaryMin: z.number().nonnegative().optional(),
    salaryMax: z.number().nonnegative().optional(),
    regime: text,
    weeklyHours: z.number().nonnegative(),
    priorities: text,
  }),
  goals: z.object({ ...base, name: z.string().min(1), description: text }),
  paths: z.object({
    ...base,
    name: z.string().min(1),
    kind: z.enum(["Hipótese principal", "Estratégico", "Alternativa"]),
    description: text,
    focus: z.enum(["Em destaque", "Aberto"]).default("Aberto"),
  }),
  qualifications: z.object({
    ...base,
    name: z.string().min(1),
    kind: z.enum(["Formação", "Certificação"]),
    institution: text,
    date,
    notes: text,
  }),
  projects: z.object({
    ...base,
    name: z.string().min(1),
    kind: z.enum(["Experiência", "Projeto"]),
    context: text,
    start: date,
    end: date,
    participation: text,
    autonomy: text,
    tools: text,
    results: text,
    notes: text,
  }),
  skills: z.object({
    ...base,
    name: z.string().min(1),
    description: text,
    priority: z.enum(["Alta", "Média", "Baixa"]),
    desiredLevel: z.enum(levels).optional(),
  }),
  declarations: z.object({
    ...base,
    skillId: z.string(),
    level: z.enum(levels),
    date: day,
    justification: z.string().min(1),
  }),
  evidence: z.object({
    ...base,
    skillId: z.string(),
    description: z.string().min(1),
    context: text,
    date: day,
    link: url,
    projectId: ref,
    actionId: ref,
  }),
  assessments: z.object({
    ...base,
    skillId: z.string(),
    criteria: z.string().min(1),
    result: z.enum(levels),
    date: day,
    responsible: z.string().min(1),
    notes: text,
  }),
  jobs: z.object({
    ...base,
    company: z.string().min(1),
    title: z.string().min(1),
    description: text,
    link: url,
    location: text,
    mode: text,
    regime: text,
    seniority: text,
    salaryMin: z.number().nonnegative().optional(),
    salaryMax: z.number().nonnegative().optional(),
    payPeriod: text,
    benefits: text,
    notes: text,
    pathId: ref,
    tracking: z.enum(["Salva", "Avaliando"]),
    origin: z
      .enum(["Real", "Demonstração", "Não classificada"])
      .default("Não classificada"),
    interest: z.enum(["Interessado", "Em dúvida", "Sem interesse"]),
    interestNotes: text,
    stability: text,
    learning: text,
    mentoring: text,
    team: text,
    questions: text,
  }),
  requirements: z.object({
    ...base,
    jobId: z.string(),
    name: z.string().min(1),
    kind: z.enum(["Obrigatório", "Desejável"]),
    skillId: ref,
    status: z.enum(["Não avaliado", "Atendido", "Parcial", "Não atendido"]),
    justification: text,
    evidenceIds: z.array(z.string()).default([]),
  }),
  applications: z.object({ ...base, jobId: z.string(), stage: z.enum(stages) }),
  events: z.object({
    ...base,
    applicationId: z.string(),
    sequence: z.number().int().positive(),
    stage: z.enum(stages),
    date: day,
    reason: text,
    certainty: z.enum(["Conhecido", "Hipótese", "Desconhecido"]),
    notes: text,
  }),
  contacts: z.object({
    ...base,
    jobId: z.string(),
    date: day,
    channel: z.string().min(1),
    notes: text,
  }),
  actions: z.object({
    ...base,
    title: z.string().min(1),
    description: text,
    priority: z.enum(["Alta", "Média", "Baixa"]),
    status: z.enum(["A fazer", "Em andamento", "Concluída", "Cancelada"]),
    due: date,
    completedAt: date,
    goalId: ref,
    skillId: ref,
    jobId: ref,
    planId: ref,
    stepId: ref,
    milestoneId: ref,
    link: url,
    estimatedMinutes: z.number().nonnegative().optional(),
  }),
  sessions: z.object({
    ...base,
    actionId: z.string(),
    date: day,
    minutes: z.number().int().positive(),
    notes: text,
    category: z.enum(["Teoria", "Prática", "Revisão"]).optional(),
  }),
  reviews: z.object({
    ...base,
    date: day,
    learnings: text,
    difficulties: text,
    decisions: text,
    priorities: text,
    planId: ref,
  }),
  careerPlans: z.object({
    ...base,
    title: z.string().min(1),
    description: text,
    objective: text,
    startDate: day,
    endMonth: month.optional(),
    referencePeriod: text,
    status: z.enum(planStates),
    origin: text,
    templateKey: ref,
    pathIds: z.array(z.string()).default([]),
    highlightPathIds: z.array(z.string()).default([]),
    theoryHours: z.number().nonnegative().optional(),
    practiceHours: z.number().nonnegative().optional(),
    reviewHours: z.number().nonnegative().optional(),
  }),
  planSteps: z.object({
    ...base,
    planId: z.string(),
    title: z.string().min(1),
    description: text,
    order: z.number().int().positive(),
    startMonth: month,
    endMonth: month,
    status: z.enum(planStates),
    skillIds: z.array(z.string()).default([]),
  }),
  milestones: z.object({
    ...base,
    planId: z.string(),
    title: z.string().min(1),
    description: text,
    order: z.number().int().positive(),
    dueDate: date,
    horizonStartMonth: month.optional(),
    horizonEndMonth: month.optional(),
    status: z.enum(planStates),
    notes: text,
  }),
  deliverables: z
    .object({
      ...base,
      title: z.string().min(1),
      description: text,
      criterion: z.string().min(1),
      status: z.enum(["Planejada", "Em andamento", "Concluída", "Cancelada"]),
      completedAt: date,
      stepId: ref,
      milestoneId: ref,
      projectId: ref,
      evidenceId: ref,
      resourceId: ref,
      notes: text,
    })
    .refine(
      (v) => Boolean(v.stepId || v.milestoneId),
      "Vincule a entrega a uma etapa ou marco",
    ),
  resources: z.object({
    ...base,
    title: z.string().min(1),
    url,
    kind: z.enum(["Principal", "Complementar"]),
    stepId: ref,
    notes: text,
    verification: z
      .enum(["Não verificado", "Verificado pelo usuário"])
      .default("Não verificado"),
  }),
};
export type Kind = keyof typeof schemas;
export type Entity<K extends Kind = Kind> = z.infer<(typeof schemas)[K]>;
export type RecordData = Entity & Record<string, unknown>;
export const kinds = Object.keys(schemas) as Kind[];
export type Snapshot = { [K in Kind]: Entity<K>[] };
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const stamp = () => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
export const emptySnapshot = () =>
  Object.fromEntries(kinds.map((k) => [k, []])) as unknown as Snapshot;
export function weeklyMinutes(
  sessions: Entity<"sessions">[],
  dayString = today(),
) {
  const now = new Date(dayString + "T12:00:00");
  const offset = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - offset);
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  now.setDate(now.getDate() + 6);
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return sessions
    .filter((s) => s.date >= start && s.date <= end)
    .reduce((sum, s) => sum + s.minutes, 0);
}
