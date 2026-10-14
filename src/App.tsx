import { useEffect, useState } from "react";
import { readableError } from "./features/errors";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  initialize,
  snapshot,
  save,
  remove,
  changeStage,
  deleteImpact,
  addDemo,
} from "./data/db";
import {
  today,
  weeklyMinutes,
  kinds,
  type Kind,
  type RecordData,
  type Snapshot,
} from "./data/models";
import { downloadBackup, parseBackup, restoreBackup } from "./data/backup";
import { fields, labels } from "./features/fields";
import "./style.css";
import { CareerPlanPage } from "./features/CareerPlanPage";
const nav = [
  ["overview", "◈", "Meu Plano de Carreira"],
  ["jobs", "▣", "Vagas e candidaturas"],
  ["plan", "☷", "Ações e estudos"],
  ["skills", "◇", "Competências"],
  ["profile", "○", "Meu perfil"],
  ["settings", "⚙", "Configurações"],
];
const titleOf = (r: Record<string, unknown>) =>
  r.company
    ? `${r.title} · ${r.company}`
    : String(
        r.name ||
          r.title ||
          r.description ||
          r.criteria ||
          r.channel ||
          r.date ||
          "Registro",
      );
const formatDay = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? v.split("-").reverse().join("/")
    : String(v);
const immutable: Kind[] = ["declarations", "assessments", "events"];
import { EditorDialog, type Editor } from "./features/EditorDialog";
export function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "overview");
  const [editor, setEditor] = useState<Editor>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [order, setOrder] = useState("recent");
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState<ReturnType<typeof parseBackup>>();
  const [busy, setBusy] = useState(false);
  const data = useLiveQuery(() => snapshot(), []);
  const lastExport = useLiveQuery(
    () => db.table("metadata").get("lastExport"),
    [],
  );
  useEffect(() => {
    initialize().catch((e) => setError(String(e)));
    const listener = () => {
      setRoute(location.hash.slice(1) || "overview");
      setFilter("");
      setSearch("");
      setSelected("");
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  async function run(
    task: () => Promise<unknown>,
    message = "Registro salvo.",
  ) {
    setBusy(true);
    setError("");
    try {
      await task();
      setNotice(message);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }
  function edit(
    kind: Kind,
    row?: RecordData,
    defaults?: Record<string, unknown>,
  ) {
    setEditor({ kind, row, defaults });
    setError("");
  }
  function collection(
    kind: Kind,
    rows: RecordData[] = (data?.[kind] ?? []) as RecordData[],
    heading = true,
  ) {
    return (
      <section className="collection">
        {heading && (
          <div className="section-heading">
            <h2>{labels[kind]}</h2>
            <button onClick={() => edit(kind)}>+ Adicionar</button>
          </div>
        )}
        {!rows.length ? (
          <div className="empty small">
            Nenhum registro ainda. Adicione {labels[kind].toLocaleLowerCase()}{" "}
            para começar.
          </div>
        ) : (
          <div className="cards">
            {rows.map((row) => (
              <article className="card" key={row.id}>
                <div className="card-top">
                  <h3>{titleOf(row)}</h3>
                  {row.status || row.priority || row.kind ? (
                    <span className="badge">
                      {String(row.status || row.priority || row.kind)}
                    </span>
                  ) : null}
                </div>
                <dl>
                  {fields[kind]
                    .filter(
                      (f) =>
                        row[f.key] !== undefined &&
                        row[f.key] !== "" &&
                        ![
                          "name",
                          "title",
                          "company",
                          "description",
                          "evidenceIds",
                        ].includes(f.key),
                    )
                    .map((f) => (
                      <div key={f.key}>
                        <dt>{f.label}</dt>
                        <dd>
                          {f.type === "url" ? (
                            <a
                              href={String(row[f.key])}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Abrir link ↗
                            </a>
                          ) : f.relation ? (
                            titleOf(
                              ((data?.[f.relation] ?? []) as RecordData[]).find(
                                (r) => r.id === row[f.key],
                              ) ?? { name: "Desvinculado" },
                            )
                          ) : (
                            formatDay(row[f.key])
                          )}
                        </dd>
                      </div>
                    ))}
                </dl>
                {row.description ? <p>{String(row.description)}</p> : null}
                {kind === "requirements" &&
                (row.evidenceIds as string[]).length > 0 ? (
                  <p>
                    Evidências:{" "}
                    {(row.evidenceIds as string[])
                      .map(
                        (id) =>
                          data?.evidence.find((e) => e.id === id)?.description,
                      )
                      .join("; ")}
                  </p>
                ) : null}
                {kind === "skills" && data && (
                  <div className="source-summary">
                    <p>
                      <strong>Autodeclarações:</strong>{" "}
                      {data.declarations.filter((d) => d.skillId === row.id)
                        .length
                        ? data.declarations
                            .filter((d) => d.skillId === row.id)
                            .map((d) => `${d.level} em ${formatDay(d.date)}`)
                            .join("; ")
                        : "Nenhuma registrada"}
                    </p>
                    <p>
                      <strong>Avaliações manuais:</strong>{" "}
                      {data.assessments.filter((a) => a.skillId === row.id)
                        .length
                        ? data.assessments
                            .filter((a) => a.skillId === row.id)
                            .map(
                              (a) =>
                                `${a.result} em ${formatDay(a.date)} por ${a.responsible}`,
                            )
                            .join("; ")
                        : "Não avaliado"}
                    </p>
                    <p>
                      {data.evidence.filter((e) => e.skillId === row.id).length}{" "}
                      evidência(s) · Consulte as fontes abaixo.
                    </p>
                  </div>
                )}
                <p className="muted metadata">
                  Criado em {new Date(row.createdAt).toLocaleString("pt-BR")} ·
                  Alterado em {new Date(row.updatedAt).toLocaleString("pt-BR")}
                </p>
                <div className="card-actions">
                  {!immutable.includes(kind) && (
                    <button className="subtle" onClick={() => edit(kind, row)}>
                      Editar
                    </button>
                  )}
                  {kind === "skills" && (
                    <>
                      <button
                        className="subtle"
                        onClick={() =>
                          edit("evidence", undefined, { skillId: row.id })
                        }
                      >
                        + Evidência
                      </button>
                      <button
                        className="subtle"
                        onClick={() =>
                          edit("assessments", undefined, { skillId: row.id })
                        }
                      >
                        + Avaliação
                      </button>
                    </>
                  )}
                  {kind === "actions" && (
                    <button
                      className="subtle"
                      onClick={() =>
                        edit("sessions", undefined, { actionId: row.id })
                      }
                    >
                      + Registrar estudo
                    </button>
                  )}
                  {!immutable.includes(kind) && (
                    <button
                      className="danger subtle"
                      onClick={() => {
                        if (!data) return;
                        const impact = deleteImpact(kind, row.id, data);
                        const count = Array.from(impact.values()).reduce(
                          (n, s) => n + s.size,
                          0,
                        );
                        if (
                          confirm(
                            `Excluir este registro? ${count} registro(s) serão removidos: ${Array.from(
                              impact.entries(),
                            )
                              .map(([k, ids]) => labels[k] + ": " + ids.size)
                              .join(
                                "; ",
                              )}. Vínculos opcionais serão removidos; competências, projetos e ações independentes serão preservados. Esta operação não pode ser desfeita. Exporte um backup em Configurações antes de continuar.`,
                          )
                        )
                          void run(
                            () => remove(kind, row.id),
                            "Registro excluído e vínculos ajustados.",
                          );
                      }}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }
  if (!data)
    return (
      <main className="loading">
        <h1>CareerOS</h1>
        <p role="status">Carregando seus dados…</p>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  const actions = data.actions.filter((a) =>
    ["A fazer", "Em andamento"].includes(a.status),
  );
  const overdue = actions.filter((a) => a.due && a.due < today());
  const active = data.applications.filter(
    (a) => !["Encerrado", "Contratado"].includes(a.stage),
  );
  const currentJob = data.jobs.find((j) => j.id === selected);
  const minutes = weeklyMinutes(data.sessions);
  const jobStage = (id: string) =>
    data.applications.find((a) => a.jobId === id)?.stage ??
    data.jobs.find((j) => j.id === id)?.tracking;

  return (
    <div className="app">
      <aside>
        <a className="brand" href="#overview">
          <span className="brand-icon">C</span> CareerOS
        </a>
        <p className="brand-caption">CLAREZA PARA O PRÓXIMO PASSO</p>
        <nav aria-label="Navegação principal">
          {nav.map(([id, icon, label]) => (
            <a
              key={id}
              href={"#" + id}
              className={route === id ? "active" : ""}
              aria-current={route === id ? "page" : undefined}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="local-dot" /> Dados neste navegador
          <p>
            Seu espaço de carreira.
            <br />
            Uma decisão de cada vez.
          </p>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">SEU ESPAÇO DE CARREIRA</p>
            <h1>
              {nav.find((n) => n[0] === route)?.[2] ?? "Página não encontrada"}
            </h1>
          </div>
          <span className="privacy">◉ Armazenamento local</span>
        </header>
        {error && (
          <div className="alert error" role="alert">
            {error}
            <button onClick={() => setError("")}>Fechar</button>
          </div>
        )}
        {notice && (
          <div className="alert" role="status">
            {notice}
            <button onClick={() => setNotice("")}>Fechar</button>
          </div>
        )}
        {route === "overview" && (
          <CareerPlanPage data={data} busy={busy} edit={edit} run={run} />
        )}
        {route === "jobs" && (
          <>
            <div className="section-heading">
              <p>
                Salve e avalie oportunidades antes de decidir se candidatar.
              </p>
              <button className="primary" onClick={() => edit("jobs")}>
                + Cadastrar vaga
              </button>
            </div>
            <div className="toolbar">
              <label>
                Buscar empresa ou cargo
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar oportunidades…"
                />
              </label>
              <label>
                Etapa
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="active">Candidaturas em andamento</option>
                  {[
                    "Salva",
                    "Avaliando",
                    "Candidatado",
                    "Entrevista",
                    "Teste",
                    "Proposta",
                    "Contratado",
                    "Encerrado",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Ordenar
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="company">Empresa</option>
                  <option value="title">Cargo</option>
                </select>
              </label>
            </div>
            <div className="cards">
              {data.jobs
                .filter(
                  (j) =>
                    (j.company + " " + j.title)
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()) &&
                    (!filter ||
                      (filter === "active"
                        ? active.some((a) => a.jobId === j.id)
                        : jobStage(j.id) === filter)),
                )
                .sort((a, b) =>
                  order === "recent"
                    ? b.updatedAt.localeCompare(a.updatedAt)
                    : String(a[order as "company" | "title"]).localeCompare(
                        String(b[order as "company" | "title"]),
                      ),
                )
                .map((j) => (
                  <button
                    className={
                      "card job-button " + (selected === j.id ? "selected" : "")
                    }
                    key={j.id}
                    onClick={() => setSelected(j.id)}
                  >
                    <span className="badge">{jobStage(j.id)}</span>
                    <h3>{j.title}</h3>
                    <p>{j.company}</p>
                    <span className="muted">
                      {j.location || "Localização desconhecida"} · {j.interest}
                    </span>
                    <p>
                      {j.salaryMin !== undefined || j.salaryMax !== undefined
                        ? `${j.salaryMin?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "?"} – ${j.salaryMax?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "?"} · ${j.payPeriod || "Periodicidade desconhecida"}`
                        : "Salário não informado"}
                    </p>
                    <span>Abrir oportunidade →</span>
                  </button>
                ))}
            </div>
            {!data.jobs.length && (
              <div className="empty">
                Nenhuma vaga cadastrada. Empresa e cargo são suficientes para
                começar.
              </div>
            )}
            {currentJob && (
              <section className="detail">
                <div className="section-heading">
                  <h2>
                    {currentJob.title} · {currentJob.company}
                  </h2>
                  <button onClick={() => setSelected("")}>
                    Fechar detalhes
                  </button>
                </div>
                {collection("jobs", [currentJob] as RecordData[], false)}
                <div className="inline">
                  <button
                    className="primary"
                    onClick={() =>
                      setEditor({ kind: "events", jobId: currentJob.id })
                    }
                  >
                    Registrar / corrigir etapa
                  </button>
                  <button
                    onClick={() =>
                      edit("actions", undefined, { jobId: currentJob.id })
                    }
                  >
                    + Próxima ação
                  </button>
                  <button
                    onClick={() =>
                      edit("requirements", undefined, { jobId: currentJob.id })
                    }
                  >
                    + Requisito
                  </button>
                  <button
                    onClick={() =>
                      edit("contacts", undefined, { jobId: currentJob.id })
                    }
                  >
                    + Contato
                  </button>
                </div>
                <p className="info">
                  Salva e Avaliando são acompanhamento da vaga. Uma candidatura
                  é criada ao registrar Candidatado ou qualquer etapa posterior.
                  Correções e saltos de etapa acrescentam eventos; o histórico é
                  preservado.
                </p>
                <h3>Histórico da candidatura</h3>
                {data.events
                  .filter(
                    (e) =>
                      e.applicationId ===
                      data.applications.find((a) => a.jobId === currentJob.id)
                        ?.id,
                  )
                  .map((e) => (
                    <div className="timeline" key={e.id}>
                      <strong>{e.stage}</strong>
                      <span>
                        {formatDay(e.date)} · Motivo:{" "}
                        {e.reason || "Desconhecido"} ({e.certainty})
                      </span>
                      <p>{e.notes}</p>
                      <small>
                        Registrado em{" "}
                        {new Date(e.createdAt).toLocaleString("pt-BR")}
                      </small>
                    </div>
                  ))}
                {collection(
                  "requirements",
                  data.requirements.filter(
                    (r) => r.jobId === currentJob.id,
                  ) as RecordData[],
                  false,
                )}
                {collection(
                  "contacts",
                  data.contacts.filter(
                    (c) => c.jobId === currentJob.id,
                  ) as RecordData[],
                  false,
                )}
                {collection(
                  "actions",
                  data.actions.filter(
                    (a) => a.jobId === currentJob.id,
                  ) as RecordData[],
                  false,
                )}
              </section>
            )}
          </>
        )}
        {route === "plan" && (
          <>
            <div className="week-note">
              <strong>{minutes} minutos realizados nesta semana</strong>
              <span>
                Estimativas de ações não contam como estudo. Meta editável no
                perfil.
              </span>
            </div>
            <div className="toolbar">
              <label>
                Filtrar ações
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="pending">Pendentes</option>
                  <option value="overdue">Atrasadas</option>
                  {["A fazer", "Em andamento", "Concluída", "Cancelada"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            {collection(
              "actions",
              data.actions.filter(
                (a) =>
                  !filter ||
                  (filter === "pending"
                    ? ["A fazer", "Em andamento"].includes(a.status)
                    : filter === "overdue"
                      ? overdue.some((o) => o.id === a.id)
                      : a.status === filter),
              ) as RecordData[],
            )}
            {collection("sessions")}
            {collection("reviews")}
          </>
        )}
        {route === "profile" && (
          <>
            <p className="info">
              Configuração inicial editável. Não há dados pessoais reais ou
              demonstração inserida automaticamente.
            </p>
            {data.profiles[0] && (
              <section className="profile-card">
                <h2>Seu direcionamento</h2>
                <p>
                  {data.profiles[0].summary ||
                    "Adicione um resumo profissional para registrar seu ponto de partida."}
                </p>
                <p>
                  {data.profiles[0].preferences ||
                    "Registre suas preferências e objetivos."}
                </p>
                <p>{data.profiles[0].priorities}</p>
                <p>
                  Capacidade semanal:{" "}
                  <strong>{data.profiles[0].weeklyHours} h</strong> · Regime:{" "}
                  {data.profiles[0].regime || "Não informado"}
                </p>
                <p>
                  Expectativa: {data.profiles[0].salaryMin ?? "Desconhecida"} a{" "}
                  {data.profiles[0].salaryMax ?? "Desconhecida"} reais
                </p>
                <button
                  onClick={() =>
                    edit("profiles", data.profiles[0] as RecordData)
                  }
                >
                  Editar perfil
                </button>
              </section>
            )}
            {(["goals", "paths", "qualifications", "projects"] as Kind[]).map(
              (k) => (
                <div key={k}>{collection(k)}</div>
              ),
            )}
          </>
        )}
        {route === "skills" && (
          <>
            <p className="info">
              Autodeclaração, evidência e avaliação são fontes distintas.
              Cursos, projetos e ações concluídas não validam níveis
              automaticamente. Registros de avaliação e autodeclaração são
              históricos: adicione um novo registro para revisar sua opinião.
            </p>
            <label className="filter">
              Prioridade
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Todas</option>
                {["Alta", "Média", "Baixa"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {collection(
              "skills",
              data.skills.filter(
                (s) => !filter || s.priority === filter,
              ) as RecordData[],
            )}
            {(["declarations", "evidence", "assessments"] as Kind[]).map(
              (k) => (
                <div key={k}>{collection(k)}</div>
              ),
            )}
          </>
        )}
        {route === "settings" && (
          <>
            <section className="profile-card">
              <p className="eyebrow">SEUS DADOS, SOB SEU CONTROLE</p>
              <h2>Armazenamento e backup</h2>
              <p>
                Seus registros ficam no IndexedDB deste navegador, neste
                endereço. Não há servidor, login ou sincronização entre
                dispositivos. Outro navegador ou endereço terá uma base
                diferente.
              </p>
              <p>
                Limpar dados do navegador pode apagar os registros. Guarde
                backups JSON em um local seguro. O arquivo contém todos os seus
                registros e relacionamentos.
              </p>
              <p>
                Última exportação:{" "}
                <strong>
                  {lastExport?.value
                    ? new Date(lastExport.value).toLocaleString("pt-BR")
                    : "Nenhuma exportação registrada"}
                </strong>
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void run(
                    downloadBackup,
                    "Backup preparado para download. Verifique o arquivo salvo.",
                  )
                }
              >
                Exportar backup completo
              </button>
            </section>
            <section className="profile-card">
              <h2>Restaurar uma base</h2>
              <p>
                A restauração substitui todos os registros. O arquivo será
                validado e um resumo aparecerá antes de confirmar. Uma falha não
                deixa a base parcialmente substituída.
              </p>
              <label className="file-label">
                Selecionar backup JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    setPending(undefined);
                    if (!file) return;
                    try {
                      if (file.size > 20 * 1024 * 1024)
                        throw Error("Arquivo excede 20 MB.");
                      setPending(parseBackup(JSON.parse(await file.text())));
                      setError("");
                    } catch (err) {
                      setError("Backup inválido: " + readableError(err));
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {pending && (
                <div className="restore-preview">
                  <h3>
                    Backup válido ·{" "}
                    {new Date(pending.exportedAt).toLocaleString("pt-BR")}
                  </h3>
                  <div className="summary-grid">
                    {kinds.map((k) => (
                      <span key={k}>
                        {labels[k]}: <strong>{pending.data[k].length}</strong>
                      </span>
                    ))}
                  </div>
                  <p>
                    A base atual tem{" "}
                    {kinds.reduce((n, k) => n + data[k].length, 0)} registros e
                    será substituída.
                  </p>
                  <div className="inline">
                    <button
                      onClick={() =>
                        void run(
                          downloadBackup,
                          "Backup atual preparado para download.",
                        )
                      }
                    >
                      Exportar dados atuais primeiro
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            "Confirmar substituição de toda a base pelo backup selecionado?",
                          )
                        )
                          void run(async () => {
                            await restoreBackup(pending);
                            setPending(undefined);
                            setSelected("");
                          }, "Base restaurada com sucesso.");
                      }}
                    >
                      Confirmar substituição
                    </button>
                    <button onClick={() => setPending(undefined)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </section>
            <section className="profile-card">
              <h2>Explorar com dados fictícios</h2>
              <p>
                Uma pequena demonstração opcional, apenas em uma base sem
                cadastros. Seu perfil será preservado.
              </p>
              <button
                disabled={
                  busy ||
                  kinds.some((k) => k !== "profiles" && data[k].length > 0)
                }
                onClick={() =>
                  void run(addDemo, "Demonstração fictícia adicionada.")
                }
              >
                Adicionar demonstração fictícia
              </button>
            </section>
          </>
        )}
        {!nav.some((n) => n[0] === route) && (
          <p>
            <a href="#overview">Voltar à visão geral</a>
          </p>
        )}
        <footer>
          CareerOS · Decisões com contexto, progresso com evidências.
        </footer>
      </main>
      {editor && (
        <EditorDialog
          editor={editor}
          data={data}
          busy={busy}
          error={error}
          close={() => {
            setEditor(undefined);
            setError("");
          }}
          submit={async (values) => {
            await run(
              async () => {
                if (editor.kind === "events" && editor.jobId) {
                  await changeStage(
                    editor.jobId,
                    values.stage as never,
                    String(values.date),
                    String(values.reason ?? ""),
                    values.certainty as never,
                    String(values.notes ?? ""),
                  );
                } else await save(editor.kind, values);
                setEditor(undefined);
              },
              editor.kind === "events"
                ? "Etapa registrada. Histórico preservado."
                : "Registro salvo.",
            );
          }}
        />
      )}
    </div>
  );
}
