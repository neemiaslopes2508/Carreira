import { ZodError } from "zod";
import { fields } from "./fields";
export function readableError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => {
        const key = String(issue.path.at(-1) ?? "arquivo");
        const label =
          Object.values(fields)
            .flat()
            .find((f) => f.key === key)?.label ?? key;
        return `${label}: valor inválido. Confira o preenchimento ou o formato do backup.`;
      })
      .join(" ");
  }
  return error instanceof Error ? error.message : String(error);
}
