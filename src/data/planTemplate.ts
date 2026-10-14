import { z } from "zod";
import { schemas, stamp, type Entity, type Snapshot } from "./models";
import { db, snapshot, type CareerDB } from "./db";

export const TEMPLATE_KEY = "plano-cinco-caminhos-2026-2027-v1";
export const TEMPLATE_REFERENCE = "Outubro de 2026 a março de 2027";
export const TEMPLATE_OBJECTIVE =
  "Fortalecer conhecimentos técnicos e funcionais, aproveitar a experiência profissional existente e buscar uma empresa que ofereça estabilidade, aprendizado e crescimento.";

const paths = [
  [
    "Sistemas / Aplicações",
    "Investigação, configuração, SQL, requisitos, integrações e melhorias. Filtrar vagas centradas em desenvolvimento.",
    true,
  ],
  [
    "Integrações",
    "APIs, webhooks, testes, dados, logs e plataformas. Verificar o peso real da programação.",
    true,
  ],
  [
    "CRM / Soluções Corporativas",
    "HubSpot, automações, pipelines, dados, implantação e integrações. Não restringir a marketing operacional.",
    true,
  ],
  [
    "Qualidade de Software",
    "Testes funcionais, API e integração, evidências e defeitos. Observar exigências de automação.",
    false,
  ],
  [
    "Negócios / Processos de TI",
    "Requisitos, BPMN, regras, processos e validação. Investigar a rotina com stakeholders.",
    false,
  ],
] as const;
const skills = [
  "CRM / HubSpot",
  "Análise de requisitos",
  "Processos / BPMN",
  "APIs REST e integrações",
  "SQL",
  "Lógica e JavaScript",
  "Testes funcionais e QA",
  "Arquitetura de software",
  "Fundamentos de cloud",
] as const;
const steps = [
  {
    title: "SQL e modelagem de dados",
    description: "SELECT, filtros, JOIN, GROUP BY, chaves e modelagem básica.",
    delivery: "10 consultas de clientes, pedidos e pagamentos",
    criterion:
      "Dez consultas documentadas e verificadas no contexto do exercício.",
    skills: ["SQL"],
  },
  {
    title: "APIs REST e Postman",
    description:
      "HTTP, JSON, métodos e status, autenticação, Postman e webhooks.",
    delivery: "Coleção Postman com cenários positivos e de falha",
    criterion: "Coleção criada, executada e documentada.",
    skills: ["APIs REST e integrações"],
  },
  {
    title: "Análise de requisitos",
    description:
      "Elicitação, regras de negócio, especificação funcional e critérios de aceite.",
    delivery: "Documento funcional de integração CRM–ERP",
    criterion: "Documento com fluxo, regras, requisitos e critérios de aceite.",
    skills: ["Análise de requisitos", "CRM / HubSpot"],
  },
  {
    title: "Lógica e JavaScript básico",
    description:
      "Condicionais, funções, arrays, objetos e interpretação de scripts; sem exigir autonomia de desenvolvedor.",
    delivery: "Script simples de validação de dados lido e adaptado",
    criterion: "Explicar o funcionamento e demonstrar a alteração realizada.",
    skills: ["Lógica e JavaScript"],
  },
  {
    title: "Processos e QA",
    description: "BPMN, AS-IS, TO-BE, testes funcionais e de integração.",
    delivery: "Fluxos atual/futuro e cenários de teste",
    criterion: "Diagramas e casos de teste documentados.",
    skills: ["Processos / BPMN", "Testes funcionais e QA"],
  },
  {
    title: "Arquitetura e cloud",
    description:
      "Cliente-servidor, camadas, filas, logs e fundamentos de nuvem.",
    delivery: "Diagrama simplificado da solução estudada",
    criterion: "Diagrama e explicação das principais decisões técnicas.",
    skills: ["Arquitetura de software", "Fundamentos de cloud"],
  },
] as const;
const milestones = [
  {
    title: "30 dias — Organizar a busca",
    days: 30,
    description:
      "Currículo e LinkedIn revisados; apresentações para três caminhos; 10 vagas reais analisadas; SQL iniciado; candidaturas seletivas.",
  },
  {
    title: "60 dias — Consolidar fundamentos",
    days: 60,
    description:
      "Exercícios básicos de SQL concluídos; Postman iniciado; requisitos recorrentes registrados.",
  },
  {
    title: "90 dias — Produzir evidências",
    days: 90,
    description:
      "Primeiras entregas do portfólio produzidas; resultados de candidaturas revistos; estratégia ajustada.",
  },
  {
    title: "180 dias — Revisar a direção",
    days: 180,
    description:
      "Ciclo comum avançado ou concluído; cinco caminhos comparados; até duas especializações escolhidas.",
  },
  {
    title: "12 meses — Aumentar autonomia",
    months: 12,
    description:
      "Reunir evidências de autonomia e focar funções alinhadas. Horizonte futuro, sem cobrança imediata.",
  },
  {
    title: "3 a 5 anos — Consolidação profissional",
    months: 36,
    endMonths: 60,
    description:
      "Buscar posição sólida e progressão salarial e de responsabilidade. Horizonte, não prazo pontual.",
  },
] as const;
const actions = [
  ["Revisar currículo para vagas de Sistemas / Aplicações", 0, 0],
  ["Revisar posicionamento profissional para CRM e Integrações", 0, 0],
  ["Atualizar LinkedIn", 0, 0],
  ["Analisar dez vagas reais", 0, 0],
  ["Identificar requisitos recorrentes", 1, 1],
  ["Iniciar estudos de SQL", 0, 0],
  ["Praticar consultas entre tabelas", 0, 0],
  ["Registrar experiência real com chatbot, HubSpot e integrações", 0, 2],
  ["Registrar experiência real com testes funcionais e ponta a ponta", 0, 4],
  ["Iniciar candidaturas seletivas", 0, 0],
  ["Revisar resultados das candidaturas após o primeiro mês", 2, 2],
  ["Preparar os artefatos do projeto integrador", 2, 0],
  ["Realizar revisão mensal do plano", 3, 5],
] as const;
const resources = [
  [
    "SQL — Do Zero ao Avançado",
    "https://www.udemy.com/course/curso-sql-do-zero-ao-avancado/",
    0,
    "Principal",
  ],
  [
    "Postman e Testes de APIs",
    "https://www.udemy.com/course/postman-seu-uso-no-mercado-de-trabalho/",
    1,
    "Principal",
  ],
  [
    "Análise de Requisitos de Software",
    "https://www.udemy.com/course/analise-de-requisitos-de-software/",
    2,
    "Principal",
  ],
  [
    "Fundamentos de JavaScript",
    "https://www.udemy.com/course/fundamentos-javascript/",
    3,
    "Principal",
  ],
  [
    "BPM, BPMN e Modelagem de Processos com Bizagi",
    "https://www.udemy.com/course/bpm-bpmn-e-modelagem-de-processos-com-bizagi/",
    4,
    "Principal",
  ],
  [
    "Fundamentos de Computação em Nuvem — Microsoft Learn",
    "https://learn.microsoft.com/pt-br/training/paths/describe-cloud-compute/",
    5,
    "Principal",
  ],
  [
    "HubSpot Academy — CRM e Sales Hub",
    "https://academy.hubspot.com/",
    -1,
    "Complementar",
  ],
  [
    "Microsoft AZ-900 — Azure Fundamentals",
    "https://learn.microsoft.com/pt-br/credentials/certifications/azure-fundamentals/",
    -1,
    "Complementar",
  ],
  [
    "ISTQB CTFL — Certificação de Testes de Software",
    "https://istqb.org/certifications/certified-tester-foundation-level/",
    -1,
    "Complementar",
  ],
  [
    "IIBA ECBA — Certificação em Análise de Negócios",
    "https://www.iiba.org/business-analysis-certifications/ecba/",
    -1,
    "Complementar",
  ],
] as const;
export const templateSummary = {
  paths: paths.length,
  steps: steps.length,
  deliverables: steps.length,
  milestones: milestones.length,
  actions: actions.length,
  skills: skills.length,
  resources: resources.length,
  projects: 1,
};
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(+new Date(v + "T12:00:00Z")) &&
      new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v,
  );
export function addMonths(start: string, months: number) {
  const [y, m] = start.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function addDays(start: string, days: number) {
  const d = new Date(start + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const normalized = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const matching = <K extends "paths" | "skills" | "projects" | "actions">(
  rows: Snapshot[K],
  name: string,
) =>
  rows.find(
    (r) => normalized("name" in r ? r.name : r.title) === normalized(name),
  );
const pathAliases: Record<string, string[]> = {
  "Sistemas / Aplicações": ["Análise de Sistemas / Funcional"],
  "CRM / Soluções Corporativas": ["CRM / HubSpot"],
  "Qualidade de Software": ["QA Funcional / Integração"],
};
const matchingPath = (rows: Snapshot["paths"], name: string) =>
  rows.find((r) =>
    [name, ...(pathAliases[name] ?? [])].some(
      (candidate) => normalized(candidate) === normalized(r.name),
    ),
  );
export function templatePreview(data: Snapshot) {
  if (data.careerPlans.some((p) => p.templateKey === TEMPLATE_KEY))
    return {
      alreadyCreated: true,
      reused: { paths: 0, skills: 0, projects: 0, actions: 0 },
      created: {
        ...templateSummary,
        paths: 0,
        skills: 0,
        projects: 0,
        actions: 0,
        steps: 0,
        deliverables: 0,
        milestones: 0,
        resources: 0,
      },
    };
  const reused = {
    paths: paths.filter((p) => matchingPath(data.paths, p[0])).length,
    skills: skills.filter((s) => matching(data.skills, s)).length,
    projects: matching(data.projects, "Integração fictícia entre CRM e ERP")
      ? 1
      : 0,
    actions: actions.filter((a) => matching(data.actions, a[0])).length,
  };
  return {
    alreadyCreated: false,
    reused,
    created: {
      ...templateSummary,
      paths: paths.length - reused.paths,
      skills: skills.length - reused.skills,
      projects: 1 - reused.projects,
      actions: actions.length - reused.actions,
    },
  };
}
export async function createTemplate(
  startInput: string,
  database: CareerDB = db,
) {
  const start = day.parse(startInput);
  return database.transaction(
    "rw",
    Object.keys(schemas).map((k) => database.table(k)),
    async () => {
      const existing = await snapshot(database);
      const prior = existing.careerPlans.find(
        (p) => p.templateKey === TEMPLATE_KEY,
      );
      if (prior) return { planId: prior.id, alreadyCreated: true };
      const plan = schemas.careerPlans.parse({
        ...stamp(),
        title: "Plano Individual de Carreira e Estudos",
        description:
          "Ciclo comum de seis meses para investigar cinco caminhos profissionais, criar entregas práticas e revisar a direção.",
        objective: TEMPLATE_OBJECTIVE,
        startDate: start,
        endMonth: addMonths(start, 5),
        referencePeriod: TEMPLATE_REFERENCE,
        status: "Planejado",
        origin: "Modelo estruturado do plano 2026–2027",
        templateKey: TEMPLATE_KEY,
        theoryHours: 2,
        practiceHours: 3,
        reviewHours: 1,
      });
      await database.table("careerPlans").add(plan);
      const skillMap = new Map<string, string>();
      for (const name of skills) {
        let skill = matching(existing.skills, name);
        if (!skill) {
          skill = schemas.skills.parse({
            ...stamp(),
            name,
            description:
              "Tema do ciclo comum. Diagnóstico inicial não verificado; registre fontes próprias.",
            priority: "Média",
          });
          await database.table("skills").add(skill);
        }
        skillMap.set(name, skill.id);
      }
      const pathIds: string[] = [];
      const highlightPathIds: string[] = [];
      for (const [name, description, highlight] of paths) {
        let path = matchingPath(existing.paths, name);
        if (!path) {
          path = schemas.paths.parse({
            ...stamp(),
            name,
            description,
            focus: highlight ? "Em destaque" : "Aberto",
            kind: highlight ? "Estratégico" : "Alternativa",
          });
          await database.table("paths").add(path);
        }
        pathIds.push(path.id);
        if (highlight) highlightPathIds.push(path.id);
      }
      await database
        .table("careerPlans")
        .update(plan.id, { pathIds, highlightPathIds });
      let project = matching(
        existing.projects,
        "Integração fictícia entre CRM e ERP",
      );
      if (!project) {
        project = schemas.projects.parse({
          ...stamp(),
          name: "Integração fictícia entre CRM e ERP",
          kind: "Projeto",
          context:
            "Projeto educacional fictício. Portfólio integrado de artefatos de SQL, API, requisitos, script, BPMN e arquitetura; não é experiência profissional remunerada.",
          participation:
            "Estudo individual planejado; não indica execução concluída.",
        });
        await database.table("projects").add(project);
      }
      const stepRows: Entity<"planSteps">[] = [];
      for (const [index, s] of steps.entries()) {
        const row = schemas.planSteps.parse({
          ...stamp(),
          planId: plan.id,
          title: s.title,
          description: s.description,
          order: index + 1,
          startMonth: addMonths(start, index),
          endMonth: addMonths(start, index),
          status: "Planejado",
          skillIds: s.skills.map((n) => skillMap.get(n)!),
        });
        await database.table("planSteps").add(row);
        stepRows.push(row);
        await database
          .table("deliverables")
          .add(
            schemas.deliverables.parse({
              ...stamp(),
              title: s.delivery,
              description:
                "Artefato do projeto educacional integrador CRM–ERP.",
              criterion: s.criterion,
              status: "Planejada",
              stepId: row.id,
              projectId: project.id,
            }),
          );
      }
      const milestoneRows: Entity<"milestones">[] = [];
      for (const [index, m] of milestones.entries()) {
        const isDays = "days" in m;
        const row = schemas.milestones.parse({
          ...stamp(),
          planId: plan.id,
          title: m.title,
          description: m.description,
          order: index + 1,
          status: "Planejado",
          dueDate: isDays ? addDays(start, m.days) : undefined,
          horizonStartMonth: isDays ? undefined : addMonths(start, m.months),
          horizonEndMonth: isDays
            ? undefined
            : addMonths(start, "endMonths" in m ? m.endMonths : m.months),
          notes: isDays
            ? "Critérios observáveis na descrição; confirme manualmente a conclusão."
            : "Horizonte de longo prazo; não é tarefa imediatamente exigível.",
        });
        await database.table("milestones").add(row);
        milestoneRows.push(row);
      }
      for (const [title, milestoneIndex, stepIndex] of actions) {
        const old = matching(existing.actions, title);
        if (old) {
          await database
            .table("actions")
            .update(old.id, {
              planId: plan.id,
              milestoneId: milestoneRows[milestoneIndex].id,
              stepId: stepRows[stepIndex].id,
              updatedAt: new Date().toISOString(),
            });
        } else
          await database
            .table("actions")
            .add(
              schemas.actions.parse({
                ...stamp(),
                title,
                priority: "Média",
                status: "A fazer",
                planId: plan.id,
                milestoneId: milestoneRows[milestoneIndex].id,
                stepId: stepRows[stepIndex].id,
                description:
                  "Ação sugerida pelo plano; exige confirmação manual para conclusão.",
              }),
            );
      }
      for (const [title, url, stepIndex, kind] of resources) {
        await database
          .table("resources")
          .add(
            schemas.resources.parse({
              ...stamp(),
              title,
              url,
              kind,
              stepId: stepIndex >= 0 ? stepRows[stepIndex].id : undefined,
              notes:
                "Link fornecido pelo usuário. Curso, instrutor, conteúdo atual e inclusão na assinatura ainda não verificados.",
              verification: "Não verificado",
            }),
          );
      }
      return { planId: plan.id, alreadyCreated: false };
    },
  );
}
