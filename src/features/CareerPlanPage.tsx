import { useState } from "react";
import { save } from "../data/db";
import {
  today,
  weeklyMinutes,
  type Kind,
  type RecordData,
  type Snapshot,
  type Entity,
} from "../data/models";
import {
  createTemplate,
  templatePreview,
  templateSummary,
  TEMPLATE_REFERENCE,
  TEMPLATE_OBJECTIVE,
  TEMPLATE_KEY,
  addMonths,
  addDays,
} from "../data/planTemplate";
import { labels } from "./fields";

type Props = {
  data: Snapshot;
  busy: boolean;
  edit: (
    kind: Kind,
    row?: RecordData,
    defaults?: Record<string, unknown>,
  ) => void;
  run: (task: () => Promise<unknown>, message?: string) => Promise<void>;
};
const day = (value?: string) =>
  value ? value.split("-").reverse().join("/") : "Sem data definida";
const month = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value + "-01T12:00:00Z"))
    : "Sem mês definido";
const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;
const isPending = (status: string) =>
  status !== "Concluída" && status !== "Cancelada";

export function CareerPlanPage({ data, busy, edit, run }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [start, setStart] = useState(today());
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const plans = [...data.careerPlans].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const plan =
    plans.find((p) => p.id === selectedPlanId) ??
    plans.find((p) => p.status !== "Concluído") ??
    plans[0];
  const preview = templatePreview(data);
  const steps = plan
    ? data.planSteps.filter((s) => s.planId === plan.id).sort(byOrder)
    : [];
  const milestones = plan
    ? data.milestones.filter((m) => m.planId === plan.id).sort(byOrder)
    : [];
  const planActions = plan
    ? data.actions.filter((a) => !a.planId || a.planId === plan.id)
    : [];
  const pending = planActions
    .filter((a) => isPending(a.status))
    .sort(
      (a, b) =>
        Number(Boolean(b.due && b.due < today())) -
          Number(Boolean(a.due && a.due < today())) ||
        (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
        { Alta: 0, Média: 1, Baixa: 2 }[a.priority] -
          { Alta: 0, Média: 1, Baixa: 2 }[b.priority] ||
        a.title.localeCompare(b.title, "pt-BR"),
    );
  const currentMonth = today().slice(0, 7);
  const focus =
    steps.find(
      (s) =>
        s.startMonth <= currentMonth &&
        currentMonth <= s.endMonth &&
        s.status !== "Concluído",
    ) ?? steps.find((s) => s.status !== "Concluído");
  const focusDelivery = focus
    ? (data.deliverables.find(
        (d) => d.stepId === focus.id && d.status !== "Concluída",
      ) ?? data.deliverables.find((d) => d.stepId === focus.id))
    : undefined;
  const nextMilestone = milestones
    .filter((m) => m.status !== "Concluído")
    .sort((a, b) =>
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
    )[0];
  const weeks = weeklyMinutes(data.sessions);
  const planReviews = data.reviews
    .filter((r) => !plan || r.planId === plan.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const reviews = planReviews.length
    ? planReviews
    : [...data.reviews].sort((a, b) => b.date.localeCompare(a.date));
  const completedDeliveries = data.deliverables.filter(
    (d) =>
      d.status === "Concluída" &&
      ((d.stepId && steps.some((s) => s.id === d.stepId)) ||
        (d.milestoneId && milestones.some((m) => m.id === d.milestoneId))),
  );
  const realAnalyzed = data.jobs.filter(
    (j) =>
      j.origin === "Real" &&
      (j.tracking === "Avaliando" ||
        data.applications.some((a) => a.jobId === j.id)),
  ).length;
  const applications = data.applications.length;
  const activeApplications = data.applications.filter(
    (a) => !(["Encerrado", "Contratado"] as string[]).includes(a.stage),
  ).length;
  const resources = data.resources
    .filter((r) => !r.stepId || steps.some((s) => s.id === r.stepId))
    .sort((a, b) => {
      const aOrder = steps.find((step) => step.id === a.stepId)?.order ?? 999;
      const bOrder = steps.find((step) => step.id === b.stepId)?.order ?? 999;
      return aOrder - bOrder || a.title.localeCompare(b.title, "pt-BR");
    });
  const create = () =>
    run(async () => {
      const result = await createTemplate(start);
      if (result.alreadyCreated)
        throw Error(
          "Este modelo de plano já foi criado. Abra o plano existente para editar.",
        );
      setShowPreview(false);
    }, "Plano criado. Revise datas, etapas e prioridades antes de começar.");
  return (
    <div className="career-plan">
      {!plan ? (
        <section className="plan-welcome">
          <p className="eyebrow">PLANEJAMENTO PERSONALIZÁVEL</p>
          <h2>Seu plano de carreira começa com uma direção clara.</h2>
          <p>
            Crie o modelo de seis meses baseado no planejamento de 2026–2027.
            Etapas, marcos e ações serão propostas; nada será marcado como
            realizado.
          </p>
          <div className="inline">
            <button className="primary" onClick={() => setShowPreview(true)}>
              Criar plano a partir do modelo 2026–2027
            </button>
            <button onClick={() => edit("careerPlans")}>
              Criar plano em branco
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="plan-intro">
            <div>
              <p className="eyebrow">
                PLANO ATIVO · {plan.status.toLocaleUpperCase("pt-BR")}
              </p>
              <h2>{plan.title}</h2>
              <p>
                {plan.objective || "Defina o objetivo principal deste plano."}
              </p>
              <div className="plan-meta">
                <span>Início: {day(plan.startDate)}</span>
                <span>Até: {month(plan.endMonth)}</span>
                {plan.referencePeriod && (
                  <span>Referência original: {plan.referencePeriod}</span>
                )}
              </div>
            </div>
            <div className="plan-intro-actions">
              <button onClick={() => edit("careerPlans", plan as RecordData)}>
                Editar plano
              </button>
              {plans.length > 1 && (
                <label>
                  Plano exibido
                  <select
                    value={plan.id}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                  >
                    {plans.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
          <div className="plan-snapshot">
            <div>
              <span>Situação atual</span>
              <strong>{plan.status}</strong>
            </div>
            <div>
              <span>Etapa em foco</span>
              <strong>{focus?.title ?? "Defina uma etapa"}</strong>
            </div>
            <div>
              <span>Próximo marco</span>
              <strong>{nextMilestone?.title ?? "Sem marco pendente"}</strong>
            </div>
          </div>
          <div className="plan-columns">
            <section className="plan-panel" id="next-actions">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">FAÇA AGORA</p>
                  <h2>Próximas ações</h2>
                </div>
                <button
                  onClick={() =>
                    edit("actions", undefined, { planId: plan.id })
                  }
                >
                  + Ação
                </button>
              </div>
              {pending.length ? (
                <div className="plan-list">
                  {pending.slice(0, 5).map((a) => (
                    <article key={a.id} className="plan-list-item">
                      <div>
                        <div className="plan-row">
                          <h3>{a.title}</h3>
                          <span className="badge">{a.priority}</span>
                        </div>
                        <p>
                          {a.status}
                          {a.due ? ` · Prazo ${day(a.due)}` : " · Sem prazo"}
                          {a.due && a.due < today() ? " · Atrasada" : ""}
                        </p>
                        <small>
                          {!a.planId ? "Ação sem vínculo com o plano · " : ""}
                          {a.stepId
                            ? data.planSteps.find((s) => s.id === a.stepId)
                                ?.title
                            : ""}
                          {a.milestoneId
                            ? ` · ${data.milestones.find((m) => m.id === a.milestoneId)?.title ?? ""}`
                            : ""}
                        </small>
                      </div>
                      <div className="inline">
                        <button
                          className="subtle"
                          onClick={() => edit("actions", a as RecordData)}
                        >
                          Editar
                        </button>
                        <button
                          className="subtle"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () =>
                                save("actions", {
                                  ...a,
                                  status: "Concluída",
                                  completedAt: today(),
                                  updatedAt: new Date().toISOString(),
                                }),
                              "Ação concluída. Entregas e competências mantêm seus estados próprios.",
                            )
                          }
                        >
                          Concluir
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty small">
                  Nenhuma ação pendente vinculada a este plano.
                </p>
              )}
              <a href="#plan">Abrir todas as ações e estudos →</a>
            </section>
            <section className="plan-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">TRILHA COMUM</p>
                  <h2>Estudo em foco</h2>
                </div>
                <button
                  onClick={() =>
                    focus && edit("planSteps", focus as RecordData)
                  }
                  disabled={!focus}
                >
                  Editar etapa
                </button>
              </div>
              {focus ? (
                <>
                  <h3>{focus.title}</h3>
                  <p>{focus.description}</p>
                  <p>
                    <strong>Entrega prática:</strong>{" "}
                    {focusDelivery?.title ?? "Nenhuma entrega cadastrada"}
                  </p>
                  <p>
                    <strong>Critério:</strong>{" "}
                    {focusDelivery?.criterion ??
                      "Defina um critério verificável"}
                  </p>
                  <p>
                    <strong>Competências:</strong>{" "}
                    {focus.skillIds
                      .map((id) => data.skills.find((s) => s.id === id)?.name)
                      .filter(Boolean)
                      .join(", ") || "Nenhuma associada"}
                  </p>
                  <p>
                    {
                      data.deliverables.filter(
                        (d) =>
                          d.stepId === focus.id && d.status === "Concluída",
                      ).length
                    }{" "}
                    de{" "}
                    {
                      data.deliverables.filter((d) => d.stepId === focus.id)
                        .length
                    }{" "}
                    entregas concluídas
                  </p>
                </>
              ) : (
                <p>Cadastre uma etapa para visualizar o foco.</p>
              )}
              <div className="study-total">
                <strong>
                  {(weeks / 60).toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  h realizadas nesta semana
                </strong>
                <span>
                  Capacidade configurada:{" "}
                  {data.profiles[0]?.weeklyHours ?? "não definida"} h
                </span>
                <span>
                  Distribuição prevista: {plan.theoryHours ?? "?"} h teoria ·{" "}
                  {plan.practiceHours ?? "?"} h prática ·{" "}
                  {plan.reviewHours ?? "?"} h revisão
                </span>
                <small>
                  Somente sessões registradas contam como tempo realizado.
                </small>
              </div>
              <div className="inline">
                <button
                  onClick={() =>
                    edit(
                      "sessions",
                      undefined,
                      planActions[0]
                        ? { actionId: planActions[0].id }
                        : undefined,
                    )
                }
                disabled={!planActions.length}
                >
                  + Registrar estudo
                </button>
                <a href="#skills">Ver competências →</a>
              </div>
            </section>
          </div>
          <section className="plan-panel" id="milestones">
            <div className="section-heading">
              <div>
                <p className="eyebrow">PONTOS DE CHEGADA</p>
                <h2>Marcos e entregas</h2>
              </div>
              <div className="inline">
                <button
                  onClick={() =>
                    edit("milestones", undefined, {
                      planId: plan.id,
                      order: milestones.length + 1,
                    })
                  }
                >
                  + Marco
                </button>
                <button
                  onClick={() =>
                    edit(
                      "deliverables",
                      undefined,
                      focus ? { stepId: focus.id } : undefined,
                    )
                  }
                >
                  + Entrega
                </button>
              </div>
            </div>
            <p>
              {completedDeliveries.length} entregas concluídas;{" "}
              {
                data.deliverables.filter(
                  (d) =>
                    steps.some((s) => s.id === d.stepId) ||
                    milestones.some((m) => m.id === d.milestoneId),
                ).length
              }{" "}
              cadastradas. Datas atingidas não concluem marcos automaticamente.
            </p>
            <div className="milestone-grid">
              {milestones.map((m) => (
                <article className="milestone" key={m.id}>
                  <div className="plan-row">
                    <h3>{m.title}</h3>
                    <span className="badge">{m.status}</span>
                  </div>
                  <p>{m.description}</p>
                  <small>
                    {m.dueDate
                      ? `Prazo: ${day(m.dueDate)}${m.dueDate < today() && m.status !== "Concluído" ? " · Atrasado" : ""}`
                      : m.horizonStartMonth
                        ? `Horizonte: ${month(m.horizonStartMonth)}${m.horizonEndMonth && m.horizonEndMonth !== m.horizonStartMonth ? ` a ${month(m.horizonEndMonth)}` : ""}`
                        : "Sem prazo definido"}
                  </small>
                  <button
                    className="subtle"
                    onClick={() => edit("milestones", m as RecordData)}
                  >
                    Editar marco
                  </button>
                </article>
              ))}
            </div>
            {!milestones.length && (
              <p className="empty small">Nenhum marco cadastrado.</p>
            )}
            <details>
              <summary>Ver todas as etapas e entregas</summary>
              <div className="plan-expanded">
                {steps.map((s) => {
                  const deliveries = data.deliverables.filter(
                    (d) => d.stepId === s.id,
                  );
                  return (
                    <article key={s.id} className="plan-expanded-item">
                      <div className="plan-row">
                        <h3>
                          {s.order}. {s.title}
                        </h3>
                        <span>{s.status}</span>
                      </div>
                      <p>
                        {month(s.startMonth)} ·{" "}
                        {
                          deliveries.filter((d) => d.status === "Concluída")
                            .length
                        }{" "}
                        de {deliveries.length} entregas concluídas
                      </p>
                      <button
                        className="subtle"
                        onClick={() => edit("planSteps", s as RecordData)}
                      >
                        Editar etapa
                      </button>
                      {deliveries.map((d) => (
                        <div key={d.id} className="delivery-row">
                          <strong>{d.title}</strong>
                          <span>
                            {d.status}
                            {d.completedAt ? ` · ${day(d.completedAt)}` : ""}
                          </span>
                          <p>Critério: {d.criterion}</p>
                          {d.evidenceId ? (
                            <small>
                              Evidência:{" "}
                              {data.evidence.find((e) => e.id === d.evidenceId)
                                ?.description ?? "Vínculo não encontrado"}
                            </small>
                          ) : (
                            <small>Sem evidência real vinculada</small>
                          )}
                          <button
                            className="subtle"
                            onClick={() =>
                              edit("deliverables", d as RecordData)
                            }
                          >
                            Editar entrega
                          </button>
                        </div>
                      ))}
                    </article>
                  );
                })}
              </div>
            </details>
          </section>
          <div className="plan-columns">
            <section className="plan-panel">
              <p className="eyebrow">CAMINHOS ABERTOS</p>
              <h2>Cinco possibilidades profissionais</h2>
              <p>
                Os caminhos em destaque são hipóteses de investigação. A revisão
                após o ciclo comum pode registrar até duas especializações.
              </p>
              <div className="path-list">
                {plan.pathIds
                  .map((id) => data.paths.find((p) => p.id === id))
                  .filter((p): p is Entity<"paths"> => Boolean(p))
                  .map((p) => (
                    <div key={p.id}>
                      <strong>{p.name}</strong>
                      <span>
                        {plan.highlightPathIds.includes(p.id)
                          ? "Em destaque"
                          : "Em aberto"}
                      </span>
                      <button
                        className="subtle"
                        onClick={() => edit("paths", p as RecordData)}
                      >
                        Editar
                      </button>
                    </div>
                  ))}
              </div>
              <a href="#profile">Perfil e caminhos →</a>
            </section>
            <section className="plan-panel">
              <p className="eyebrow">MERCADO E APRENDIZADO</p>
              <h2>Oportunidades e revisão</h2>
              <div className="opportunity-counts">
                {plan.templateKey === TEMPLATE_KEY && (
                  <div>
                    <strong>10</strong>
                    <span>vagas reais a analisar (meta do modelo)</span>
                  </div>
                )}
                <div>
                  <strong>{data.jobs.length}</strong>
                  <span>vagas cadastradas (todas as origens)</span>
                </div>
                <div>
                  <strong>{realAnalyzed}</strong>
                  <span>vagas reais em avaliação ou candidatadas</span>
                </div>
                <div>
                  <strong>{applications}</strong>
                  <span>candidaturas realizadas</span>
                </div>
                <div>
                  <strong>{activeApplications}</strong>
                  <span>candidaturas em andamento</span>
                </div>
              </div>
              <p>
                Uma vaga salva não conta como analisada. Classifique a origem da
                vaga como real e passe-a para Avaliando para contá-la nessa
                meta.
              </p>
              <a href="#jobs">Abrir oportunidades →</a>
              <div className="review-note">
                <strong>Última revisão:</strong>{" "}
                {reviews[0] ? day(reviews[0].date) : "Nenhuma registrada"}
                <p>
                  O que aprendi? O que consigo executar sozinho? Quais
                  requisitos apareceram? Quais candidaturas avançaram? Qual
                  habilidade priorizar?
                </p>
                <button
                  onClick={() =>
                    edit("reviews", undefined, { planId: plan.id })
                  }
                >
                  + Nova revisão
                </button>
              </div>
            </section>
          </div>
          <details className="resources-panel">
            <summary>Recursos de estudo sugeridos ({resources.length})</summary>
            <p>
              Links fornecidos pelo usuário. Curso, autoria, conteúdo atual e
              inclusão em assinaturas ainda não foram verificados. Recursos
              complementares não são obrigações do ciclo inicial.
            </p>
            <div className="resource-list">
              {resources.map((r) => (
                <div key={r.id}>
                  <div>
                    <strong>{r.title}</strong>
                    <small>
                      {r.kind} · {r.verification}
                    </small>
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      Abrir recurso ↗
                    </a>
                  )}
                  <button
                    className="subtle"
                    onClick={() => edit("resources", r as RecordData)}
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => edit("resources")} className="subtle">
              + Adicionar recurso
            </button>
          </details>
        </>
      )}
      {!preview.alreadyCreated && plan && (
        <button
          className="subtle model-trigger"
          onClick={() => setShowPreview(true)}
        >
          Criar outro plano com o modelo 2026–2027
        </button>
      )}
      {showPreview && !preview.alreadyCreated && (
        <section className="template-preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PRÉVIA ANTES DA CRIAÇÃO</p>
              <h2>Modelo 2026–2027</h2>
            </div>
            <button onClick={() => setShowPreview(false)}>Fechar</button>
          </div>
          <p>
            <strong>Objetivo:</strong> {TEMPLATE_OBJECTIVE}
          </p>
          <p>
            <strong>Referência histórica:</strong> {TEMPLATE_REFERENCE}. A nova
            programação será contada da data escolhida.
          </p>
          <label className="start-field">
            Data de início do novo ciclo
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              onInput={(e) => setStart(e.currentTarget.value)}
              required
            />
          </label>
          <p>
            <strong>Serão criados:</strong> 1 plano, {preview.created.paths}{" "}
            caminhos, {preview.created.skills} competências,{" "}
            {preview.created.projects} projeto educacional,{" "}
            {templateSummary.steps} etapas, {templateSummary.deliverables}{" "}
            entregas, {templateSummary.milestones} marcos,{" "}
            {preview.created.actions} ações e {templateSummary.resources}{" "}
            recursos.
          </p>
          <p>
            <strong>Registros existentes reutilizados:</strong>{" "}
            {preview.reused.paths} caminhos, {preview.reused.skills}{" "}
            competências, {preview.reused.projects} projeto e{" "}
            {preview.reused.actions} ações. Estados, avaliações, evidências,
            estudos e candidaturas atuais não serão substituídos.
          </p>
          <div className="summary-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i}>
                Mês {i + 1}: {month(addMonths(start, i))}
              </span>
            ))}
            {[30, 60, 90, 180].map((days) => (
              <span key={days}>
                {days} dias: {day(addDays(start, days))}
              </span>
            ))}
            <span>12 meses: {month(addMonths(start, 12))}</span>
            <span>
              3 a 5 anos: {month(addMonths(start, 36))} a{" "}
              {month(addMonths(start, 60))}
            </span>
          </div>
          <p>
            Os meses não recebem um dia específico. As datas podem ser revistas
            nos formulários após a criação.
          </p>
          <div className="inline">
            <button onClick={() => setShowPreview(false)}>Cancelar</button>
            <button
              className="primary"
              disabled={busy || !start}
              onClick={() => void create()}
            >
              Confirmar criação do plano
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
