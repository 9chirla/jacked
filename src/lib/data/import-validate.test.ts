import { describe, expect, it } from "vitest";
import { validateImportPayload } from "@/lib/data/import-validate";
import { EXPORT_SCHEMA_VERSION } from "@/lib/data/schema-version";

describe("validateImportPayload", () => {
  it("rejects missing schemaVersion", () => {
    const r = validateImportPayload({ tables: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/schemaVersion/i);
  });

  it("rejects unknown schema version", () => {
    const r = validateImportPayload({
      schemaVersion: "jacked.export.v0",
      tables: {},
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Unsupported/);
  });

  it("accepts current schema with empty tables", () => {
    const r = validateImportPayload({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      tables: {},
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.counts.exercise).toBe(0);
      expect(r.data.tables.profile).toEqual([]);
    }
  });

  it("rejects non-array table", () => {
    const r = validateImportPayload({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      tables: { exercise: { id: "x" } },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects rows without id", () => {
    const r = validateImportPayload({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      tables: { exercise: [{ name: "Squat" }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/without id/);
  });
});
