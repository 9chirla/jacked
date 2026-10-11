import { describe, expect, it } from "vitest";
import { buildZipStore } from "@/lib/data/zip-store";

describe("buildZipStore", () => {
  it("emits a ZIP with local + central signatures", () => {
    const zip = buildZipStore([
      { name: "a.csv", data: new TextEncoder().encode("id\n1\n") },
      { name: "b.csv", data: new TextEncoder().encode("id\n2\n") },
    ]);
    // Local file header signature PK\x03\x04
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(zip[2]).toBe(0x03);
    expect(zip[3]).toBe(0x04);
    // End of central directory signature somewhere near the end
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    let foundEnd = false;
    for (let i = zip.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        foundEnd = true;
        expect(view.getUint16(i + 8, true)).toBe(2);
        break;
      }
    }
    expect(foundEnd).toBe(true);
  });
});
