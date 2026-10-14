import { Fragment, useEffect, useState, type FormEvent } from "react";
import {
  stamp,
  today,
  type Kind,
  type RecordData,
  type Snapshot,
} from "../data/models";
import { fields, labels, type Field } from "./fields";
export type Editor = {
  kind: Kind;
  row?: RecordData;
  defaults?: Record<string, unknown>;
  jobId?: string;
};
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
export function EditorDialog({
  editor,
  data,
  busy,
  error,
  close,
  submit,
}: {
  editor: Editor;
  data: Snapshot;
  busy: boolean;
  error: string;
  close: () => void;
  submit: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...editor.row,
    ...editor.defaults,
  }));
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("input,select,textarea")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      old?.focus();
    };
  }, []);
  const set = (f: Field, value: unknown) =>
    setValues((v) => ({ ...v, [f.key]: value }));
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result: Record<string, unknown> = {
      ...(editor.row ?? stamp()),
      updatedAt: new Date().toISOString(),
    };
    for (const f of fields[editor.kind]) {
      let value: unknown =
        f.type === "multi"
          ? formData.getAll(f.key)
          : (formData.get(f.key) ?? undefined);
      if (
        (value === undefined || value === "") &&
        f.required &&
        f.type === "select" &&
        !f.relation
      )
        value = f.options?.[0];
      if (value === undefined && f.key === "date") value = today();
      if (f.type === "number")
        value = value === "" || value === undefined ? undefined : Number(value);
      if (f.type === "multi") value = value ?? [];
      if (f.type === "date" && value === "") value = undefined;
      if (f.type === "month" && value === "") value = undefined;
      if ((f.relation || (f.type === "select" && !f.required)) && value === "")
        value = undefined;
      result[f.key] = value;
    }
    if (editor.kind === "actions") {
      if (result.status === "Concluída" && !result.completedAt)
        result.completedAt = today();
      if (result.status !== "Concluída") result.completedAt = undefined;
    }
    if (editor.kind === "deliverables") {
      if (result.status === "Concluída" && !result.completedAt)
        result.completedAt = today();
      if (result.status !== "Concluída") result.completedAt = undefined;
    }
    void submit(result);
  }
  return (
    <dialog onCancel={close} aria-labelledby="editor-title">
      <form onSubmit={handle}>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">
              {editor.row ? "EDITAR REGISTRO" : "NOVO REGISTRO"}
            </p>
            <h2 id="editor-title">{labels[editor.kind]}</h2>
          </div>
          <button type="button" onClick={close} aria-label="Fechar formulário">
            ×
          </button>
        </div>
        {editor.kind === "events" && (
          <p className="info">
            A data pode ser retroativa. A etapa escolhida será a atual; eventos
            anteriores serão mantidos.
          </p>
        )}
        <div className="form-grid">
          {fields[editor.kind].map((f, index) => {
            let options = f.relation
              ? (data[f.relation] as RecordData[])
              : undefined;
            if (f.key === "evidenceIds" && values.skillId)
              options = options?.filter((r) => r.skillId === values.skillId);
            return (
              <Fragment key={f.key}>
                {sectionTitle(editor.kind, f.key) && (
                  <h3 className="form-section">
                    {sectionTitle(editor.kind, f.key)}
                  </h3>
                )}
                <label
                  className={
                    f.type === "textarea" || f.type === "multi" ? "wide" : ""
                  }
                  key={f.key}
                >
                  {f.label}
                  {f.required ? " *" : ""}
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.key}
                      autoFocus={index === 0}
                      rows={3}
                      value={String(values[f.key] ?? "")}
                      required={f.required}
                      onChange={(e) => set(f, e.target.value)}
                    />
                  ) : f.type === "select" || f.type === "multi" ? (
                    <select
                      name={f.key}
                      autoFocus={index === 0}
                      multiple={f.type === "multi"}
                      required={f.required}
                      value={
                        f.type === "multi"
                          ? ((values[f.key] as string[]) ?? [])
                          : String(
                              values[f.key] ??
                                (f.required && !f.relation
                                  ? f.options?.[0]
                                  : ""),
                            )
                      }
                      onChange={(e) =>
                        set(
                          f,
                          f.type === "multi"
                            ? Array.from(e.target.selectedOptions).map(
                                (o) => o.value,
                              )
                            : e.target.value,
                        )
                      }
                    >
                      {f.type !== "multi" && (!f.required || f.relation) && (
                        <option value="">
                          {f.required
                            ? "Selecione"
                            : "Não informado / sem vínculo"}
                        </option>
                      )}
                      {options
                        ? options.map((r) => (
                            <option key={r.id} value={r.id}>
                              {titleOf(r)}
                            </option>
                          ))
                        : f.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      name={f.key}
                      autoFocus={index === 0}
                      type={f.type ?? "text"}
                      min={
                        f.type === "number"
                          ? f.key === "minutes"
                            ? 1
                            : 0
                          : undefined
                      }
                      step={
                        f.type === "number"
                          ? f.key === "minutes"
                            ? 1
                            : "any"
                          : undefined
                      }
                      value={String(
                        values[f.key] ?? (f.key === "date" ? today() : ""),
                      )}
                      required={f.required}
                      onChange={(e) => set(f, e.target.value)}
                    />
                  )}
                </label>
              </Fragment>
            );
          })}
        </div>
        {error && (
          <div role="alert" className="alert error">
            {error}
          </div>
        )}
        <div className="dialog-footer">
          <span>* Campos obrigatórios</span>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button className="primary" disabled={busy} type="submit">
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function sectionTitle(kind: Kind, key: string) {
  const sections: Partial<Record<Kind, Record<string, string>>> = {
    jobs: {
      company: "Identificação da oportunidade",
      location: "Local e condições de contratação",
      salaryMin: "Remuneração e benefícios",
      pathId: "Acompanhamento e interesse",
      stability: "Condições a investigar",
    },
    actions: {
      title: "Próxima ação",
      due: "Datas e relacionamentos",
      link: "Recurso e estimativa",
    },
    profiles: {
      summary: "Direcionamento profissional",
      salaryMin: "Expectativas e capacidade",
    },
    projects: {
      name: "Contexto e período",
      participation: "Participação e resultados",
    },
  };
  return sections[kind]?.[key];
}
