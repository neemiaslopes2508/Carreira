import { levels, stages, type Kind } from "../data/models";
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "month"
    | "url"
    | "select"
    | "multi";
  options?: readonly string[];
  relation?: Kind;
  required?: boolean;
};
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  extra: Partial<Field> = {},
): Field => ({ key, label, type, ...extra });
const select = (
  key: string,
  label: string,
  options: readonly string[],
  required = true,
) => f(key, label, "select", { options, required });
const rel = (key: string, label: string, relation: Kind, required = false) =>
  f(key, label, "select", { relation, required });
const date = () => f("date", "Data do registro", "date", { required: true });
export const labels: Record<Kind, string> = {
  profiles: "Perfil",
  goals: "Objetivos",
  paths: "Caminhos de carreira",
  qualifications: "Formação e certificações",
  projects: "Experiências e projetos",
  skills: "Competências",
  declarations: "Autodeclarações",
  evidence: "Evidências",
  assessments: "Avaliações manuais",
  jobs: "Vagas",
  requirements: "Requisitos",
  applications: "Candidaturas",
  events: "Histórico de candidatura",
  contacts: "Contatos",
  actions: "Ações",
  sessions: "Sessões de estudo",
  reviews: "Revisões periódicas",
  careerPlans: "Planos de carreira",
  planSteps: "Etapas do plano",
  milestones: "Marcos",
  deliverables: "Entregas",
  resources: "Recursos sugeridos",
};
export const fields: Record<Kind, Field[]> = {
  profiles: [
    f("summary", "Resumo profissional", "textarea"),
    f("preferences", "Objetivos e preferências", "textarea"),
    f("salaryMin", "Expectativa mínima (R$)", "number"),
    f("salaryMax", "Expectativa máxima (R$)", "number"),
    f("regime", "Regime pretendido"),
    f("weeklyHours", "Capacidade semanal de estudos (horas)", "number", {
      required: true,
    }),
    f("priorities", "Prioridades profissionais", "textarea"),
  ],
  goals: [
    f("name", "Objetivo", "text", { required: true }),
    f("description", "Descrição", "textarea"),
  ],
  paths: [
    f("name", "Caminho", "text", { required: true }),
    select("kind", "Papel", [
      "Hipótese principal",
      "Estratégico",
      "Alternativa",
    ]),
    f("description", "Descrição", "textarea"),
    select("focus", "Destaque inicial", ["Aberto", "Em destaque"]),
  ],
  qualifications: [
    f("name", "Nome", "text", { required: true }),
    select("kind", "Tipo", ["Formação", "Certificação"]),
    f("institution", "Instituição"),
    f("date", "Data", "date"),
    f("notes", "Observações", "textarea"),
  ],
  projects: [
    f("name", "Nome", "text", { required: true }),
    select("kind", "Tipo", ["Experiência", "Projeto"]),
    f("context", "Contexto", "textarea"),
    f("start", "Início", "date"),
    f("end", "Fim", "date"),
    f("participation", "Participação", "textarea"),
    f("autonomy", "Autonomia"),
    f("tools", "Ferramentas"),
    f("results", "Resultados (números opcionais)", "textarea"),
    f("notes", "Observações", "textarea"),
  ],
  skills: [
    f("name", "Nome", "text", { required: true }),
    f("description", "Descrição", "textarea"),
    select("priority", "Prioridade", ["Alta", "Média", "Baixa"]),
    select("desiredLevel", "Nível desejado (opcional)", levels, false),
  ],
  declarations: [
    rel("skillId", "Competência", "skills", true),
    select("level", "Nível autodeclarado", levels),
    date(),
    f("justification", "Justificativa", "textarea", { required: true }),
  ],
  evidence: [
    rel("skillId", "Competência", "skills", true),
    f("description", "Descrição", "textarea", { required: true }),
    f("context", "Contexto", "textarea"),
    date(),
    f("link", "Link", "url"),
    rel("projectId", "Experiência ou projeto", "projects"),
    rel("actionId", "Ação", "actions"),
  ],
  assessments: [
    rel("skillId", "Competência", "skills", true),
    f("criteria", "Critérios", "textarea", { required: true }),
    select("result", "Resultado", levels),
    date(),
    f("responsible", "Responsável (pode ser autoavaliação)", "text", {
      required: true,
    }),
    f("notes", "Observações", "textarea"),
  ],
  jobs: [
    f("company", "Empresa", "text", { required: true }),
    f("title", "Cargo", "text", { required: true }),
    f("description", "Descrição", "textarea"),
    f("link", "Link da vaga", "url"),
    f("location", "Localização"),
    select("mode", "Modalidade", [
      "Desconhecida",
      "Remoto",
      "Híbrido",
      "Presencial",
    ]),
    f("regime", "Regime"),
    f("seniority", "Senioridade"),
    f("salaryMin", "Salário mínimo (R$)", "number"),
    f("salaryMax", "Salário máximo (R$)", "number"),
    select("payPeriod", "Periodicidade", [
      "Desconhecida",
      "Mensal",
      "Anual",
      "Hora",
    ]),
    f("benefits", "Benefícios", "textarea"),
    rel("pathId", "Caminho de carreira", "paths"),
    select("tracking", "Acompanhamento anterior à candidatura", [
      "Salva",
      "Avaliando",
    ]),
    select("origin", "Origem da oportunidade", [
      "Não classificada",
      "Real",
      "Demonstração",
    ]),
    select("interest", "Interesse pessoal", [
      "Interessado",
      "Em dúvida",
      "Sem interesse",
    ]),
    f("interestNotes", "Observação sobre interesse", "textarea"),
    f("stability", "Estabilidade percebida (vazio = desconhecida)"),
    f("learning", "Aprendizado"),
    f("mentoring", "Mentoria"),
    f("team", "Estrutura da equipe"),
    f("questions", "Dúvidas a investigar", "textarea"),
    f("notes", "Observações", "textarea"),
  ],
  requirements: [
    rel("jobId", "Vaga", "jobs", true),
    f("name", "Requisito", "text", { required: true }),
    select("kind", "Tipo", ["Obrigatório", "Desejável"]),
    rel("skillId", "Competência", "skills"),
    select("status", "Situação", [
      "Não avaliado",
      "Atendido",
      "Parcial",
      "Não atendido",
    ]),
    f("justification", "Justificativa", "textarea"),
    f("evidenceIds", "Evidências associadas", "multi", {
      relation: "evidence",
    }),
  ],
  applications: [],
  events: [
    select("stage", "Etapa", stages),
    date(),
    select("reason", "Motivo de encerramento", [
      "Desconhecido",
      "Rejeição",
      "Desistência",
      "Cancelamento da vaga",
      "Outro",
    ]),
    select("certainty", "Origem do motivo", [
      "Desconhecido",
      "Conhecido",
      "Hipótese",
    ]),
    f("notes", "Observações", "textarea"),
  ],
  contacts: [
    rel("jobId", "Vaga", "jobs", true),
    date(),
    f("channel", "Canal", "text", { required: true }),
    f("notes", "Observação", "textarea"),
  ],
  actions: [
    f("title", "Título", "text", { required: true }),
    f("description", "Descrição", "textarea"),
    select("priority", "Prioridade", ["Alta", "Média", "Baixa"]),
    select("status", "Status", [
      "A fazer",
      "Em andamento",
      "Concluída",
      "Cancelada",
    ]),
    f("due", "Prazo", "date"),
    f("completedAt", "Data de conclusão", "date"),
    rel("goalId", "Objetivo", "goals"),
    rel("skillId", "Competência", "skills"),
    rel("jobId", "Vaga", "jobs"),
    rel("planId", "Plano de carreira", "careerPlans"),
    rel("stepId", "Etapa do plano", "planSteps"),
    rel("milestoneId", "Marco", "milestones"),
    f("link", "Curso ou recurso", "url"),
    f("estimatedMinutes", "Dedicação estimada (minutos)", "number"),
  ],
  sessions: [
    rel("actionId", "Ação", "actions", true),
    date(),
    f("minutes", "Duração realizada (minutos)", "number", { required: true }),
    f("notes", "Observações", "textarea"),
    select(
      "category",
      "Categoria opcional",
      ["Teoria", "Prática", "Revisão"],
      false,
    ),
  ],
  reviews: [
    date(),
    f("learnings", "Aprendizados", "textarea"),
    f("difficulties", "Dificuldades", "textarea"),
    f("decisions", "Decisões", "textarea"),
    f("priorities", "Próximas prioridades", "textarea"),
    rel("planId", "Plano de carreira", "careerPlans"),
  ],
  careerPlans: [
    f("title", "Nome do plano", "text", { required: true }),
    f("description", "Descrição", "textarea"),
    f("objective", "Objetivo principal", "textarea"),
    f("startDate", "Data de início", "date", { required: true }),
    f("endMonth", "Último mês planejado", "month"),
    f("referencePeriod", "Período original de referência"),
    select("status", "Situação", [
      "Planejado",
      "Em andamento",
      "Concluído",
      "Adiado",
    ]),
    f("origin", "Origem"),
    f("theoryHours", "Horas semanais previstas para teoria", "number"),
    f("practiceHours", "Horas semanais previstas para prática", "number"),
    f("reviewHours", "Horas semanais previstas para revisão", "number"),
  ],
  planSteps: [
    rel("planId", "Plano", "careerPlans", true),
    f("title", "Título da etapa", "text", { required: true }),
    f("description", "Conteúdos previstos", "textarea"),
    f("order", "Ordem", "number", { required: true }),
    f("startMonth", "Mês inicial", "month", { required: true }),
    f("endMonth", "Mês final", "month", { required: true }),
    select("status", "Situação", [
      "Planejado",
      "Em andamento",
      "Concluído",
      "Adiado",
    ]),
    f("skillIds", "Competências relacionadas", "multi", { relation: "skills" }),
  ],
  milestones: [
    rel("planId", "Plano", "careerPlans", true),
    f("title", "Título do marco", "text", { required: true }),
    f("description", "Critérios observáveis", "textarea"),
    f("order", "Ordem", "number", { required: true }),
    f("dueDate", "Prazo pontual (se houver)", "date"),
    f("horizonStartMonth", "Início do horizonte", "month"),
    f("horizonEndMonth", "Fim do horizonte", "month"),
    select("status", "Situação", [
      "Planejado",
      "Em andamento",
      "Concluído",
      "Adiado",
    ]),
    f("notes", "Observações", "textarea"),
  ],
  deliverables: [
    rel("stepId", "Etapa", "planSteps"),
    rel("milestoneId", "Marco", "milestones"),
    f("title", "Entrega", "text", { required: true }),
    f("description", "Descrição", "textarea"),
    f("criterion", "Critério de conclusão", "textarea", { required: true }),
    select("status", "Situação", [
      "Planejada",
      "Em andamento",
      "Concluída",
      "Cancelada",
    ]),
    f("completedAt", "Data de conclusão", "date"),
    rel("projectId", "Projeto integrador", "projects"),
    rel("evidenceId", "Evidência real", "evidence"),
    rel("resourceId", "Recurso", "resources"),
    f("notes", "Observações", "textarea"),
  ],
  resources: [
    f("title", "Título do recurso", "text", { required: true }),
    f("url", "Link", "url"),
    select("kind", "Tipo", ["Principal", "Complementar"]),
    rel("stepId", "Etapa relacionada", "planSteps"),
    select("verification", "Conferência do link e conteúdo", [
      "Não verificado",
      "Verificado pelo usuário",
    ]),
    f("notes", "Observações", "textarea"),
  ],
};
