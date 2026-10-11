import { describe, expect, it } from "vitest";
import { csvEscape, rowsToCsv } from "@/lib/data/csv";

describe("csvEscape", () => {
  it("leaves plain values alone", () => {
    expect(csvEscape("bench")).toBe("bench");
    expect(csvEscape(12.5)).toBe("12.5");
    expect(csvEscape(null)).toBe("");
  });

  it("quotes commas and doubles quotes", () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("rowsToCsv", () => {
  it("round-trips headers and rows", () => {
    const csv = rowsToCsv([
      { id: "1", name: "Squat", note: null },
      { id: "2", name: "Bench, press", note: '5" plate' },
    ]);
    expect(csv).toBe(
      'id,name,note\n1,Squat,\n2,"Bench, press","5"" plate"\n',
    );
  });

  it("returns empty string for no rows", () => {
    expect(rowsToCsv([])).toBe("");
  });
});
