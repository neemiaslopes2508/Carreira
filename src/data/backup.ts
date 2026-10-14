import { z } from "zod";
import { schemas, kinds, today, type Snapshot } from "./models";
import { db, snapshot, validateRelations, type CareerDB } from "./db";
const dataSchema = z.object(
  Object.fromEntries(kinds.map((k) => [k, z.array(schemas[k])])),
);
const legacyKinds = kinds.filter(
  (k) =>
    ![
      "careerPlans",
      "planSteps",
      "milestones",
      "deliverables",
      "resources",
    ].includes(k),
);
const legacyDataSchema = z.object(
  Object.fromEntries(legacyKinds.map((k) => [k, z.array(schemas[k])])),
);
const backupSchema = z.object({
  format: z.literal("CareerOS"),
  version: z.literal(2),
  exportedAt: z.iso.datetime(),
  data: dataSchema,
});
const legacyBackupSchema = z.object({
  format: z.literal("CareerOS"),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  data: legacyDataSchema,
});
export function parseBackup(input: unknown) {
  const legacy =
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    input.version === 1;
  const value = legacy
    ? legacyBackupSchema.parse(input)
    : backupSchema.parse(input);
  const normalized = legacy
    ? {
        ...value,
        version: 2 as const,
        data: {
          ...value.data,
          careerPlans: [],
          planSteps: [],
          milestones: [],
          deliverables: [],
          resources: [],
        },
      }
    : value;
  const data = normalized.data as Snapshot;
  validateRelations(data);
  return { ...normalized, data };
}
export async function exportBackup(database = db) {
  return {
    format: "CareerOS" as const,
    version: 2 as const,
    exportedAt: new Date().toISOString(),
    data: await snapshot(database),
  };
}
export async function restoreBackup(input: unknown, database: CareerDB = db) {
  const backup = parseBackup(input);
  await database.transaction(
    "rw",
    kinds.map((k) => database.table(k)),
    async () => {
      for (const k of kinds) {
        await database.table(k).clear();
        await database.table(k).bulkAdd(backup.data[k]);
      }
    },
  );
}
export async function downloadBackup() {
  const backup = await exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `careeros-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await db
    .table("metadata")
    .put({ id: "lastExport", value: backup.exportedAt });
}
