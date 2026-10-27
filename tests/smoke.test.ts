import { describe, expect, it } from "vitest";
import { seededRng } from "./helpers/rng";

describe("seededRng", () => {
  it("liefert bei gleichem Seed dieselbe Folge", () => {
    const a = seededRng(1);
    const b = seededRng(1);
    const seqA = Array.from({ length: 5 }, a);
    const seqB = Array.from({ length: 5 }, b);
    expect(seqA).toEqual(seqB);
  });

  it("liefert Werte in [0, 1)", () => {
    const rng = seededRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
