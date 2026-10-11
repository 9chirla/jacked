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

  it("accepts week_plan rows in export round-trip shape", () => {
    const r = validateImportPayload({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      tables: {
        week_plan: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            user_id: "22222222-2222-2222-2222-222222222222",
            week_start: "2026-10-11",
            timezone: "Europe/London",
            available_days: [1, 3, 5],
            planned_days: [
              {
                date: "2026-10-13",
                templateId: "33333333-3333-3333-3333-333333333333",
                status: "planned",
              },
            ],
            status: "active",
            client_updated_at: "2026-10-11T12:00:00.000Z",
          },
        ],
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.counts.week_plan).toBe(1);
      expect(r.data.tables.week_plan[0]?.id).toBe(
        "11111111-1111-1111-1111-111111111111",
      );
    }
  });
});

