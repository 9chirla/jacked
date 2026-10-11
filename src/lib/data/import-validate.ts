import {
  EXPORT_SCHEMA_VERSION,
  EXPORT_TABLES,
  type ExportTableName,
} from "@/lib/data/schema-version";

export type ValidatedImport = {
  schemaVersion: string;
  tables: Record<ExportTableName, Record<string, unknown>[]>;
  counts: Record<ExportTableName, number>;
};

export type ValidateImportResult =
  | { ok: true; data: ValidatedImport }
  | { ok: false; error: string };

function isRowArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.every((row) => row !== null && typeof row === "object" && !Array.isArray(row))
  );
}

/** Pure validation — no DB. Rejects unknown schema versions. */
export function validateImportPayload(raw: unknown): ValidateImportResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Export must be a JSON object." };
  }

  const obj = raw as Record<string, unknown>;
  const schemaVersion = obj.schemaVersion;
  if (typeof schemaVersion !== "string" || !schemaVersion.trim()) {
    return { ok: false, error: "Missing schemaVersion." };
  }
  if (schemaVersion !== EXPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schemaVersion "${schemaVersion}". Expected ${EXPORT_SCHEMA_VERSION}.`,
    };
  }

  const tablesRaw = obj.tables;
  if (tablesRaw === null || typeof tablesRaw !== "object" || Array.isArray(tablesRaw)) {
    return { ok: false, error: "Missing tables object." };
  }

  const tablesObj = tablesRaw as Record<string, unknown>;
  const tables = {} as Record<ExportTableName, Record<string, unknown>[]>;
  const counts = {} as Record<ExportTableName, number>;

  for (const name of EXPORT_TABLES) {
    const rows = tablesObj[name];
    if (rows === undefined) {
      tables[name] = [];
      counts[name] = 0;
      continue;
    }
    if (!isRowArray(rows)) {
      return { ok: false, error: `Table "${name}" must be an array of objects.` };
    }
    for (const row of rows) {
      if (typeof row.id !== "string" || !row.id) {
        return { ok: false, error: `Table "${name}" has a row without id.` };
      }
    }
    tables[name] = rows;
    counts[name] = rows.length;
  }

  return {
    ok: true,
    data: { schemaVersion, tables, counts },
  };
}
