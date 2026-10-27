import { describe, expect, it, vi } from "vitest";
import { firstPlayableMode, MODES, poolFor, poolSizes, type ModeId } from "../../src/game/modes";
import type { Entry } from "../../src/game/types";

vi.mock("../../src/variant/modes", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/variant/modes")>(),
  poolFor: vi.fn(),
}));

const sizesWith = (size: number): Record<ModeId, number> =>
  Object.fromEntries(MODES.map((m) => [m.id, size])) as Record<ModeId, number>;

describe("poolSizes", () => {
  it("ermittelt für jeden Modus die Topfgröße bei Schwierigkeit 3, auch leere Töpfe", () => {
    const entries: Entry[] = [{ name: "A", hints: [] }, { name: "B", hints: [] }];
    vi.mocked(poolFor).mockImplementation((mode, difficulty) => {
      expect(difficulty).toBe(3);
      return mode === MODES[0].id ? [] : entries;
    });
    const sizes = poolSizes();
    expect(Object.keys(sizes)).toEqual(MODES.map((m) => m.id));
    for (const m of MODES) expect(sizes[m.id]).toBe(m.id === MODES[0].id ? 0 : 2);
  });
});

describe("firstPlayableMode", () => {
  it("wählt den ersten gefüllten Topf in der Reihenfolge der Modi", () => {
    const sizes = sizesWith(2);
    sizes[MODES[0].id] = 0;
    expect(firstPlayableMode(sizes)).toBe(MODES[1].id);
  });

  it("bleibt beim ersten Modus, wenn dessen Topf gefüllt ist", () => {
    expect(firstPlayableMode(sizesWith(2))).toBe(MODES[0].id);
  });

  it("fällt bei ausschließlich leeren Töpfen auf den ersten Modus zurück", () => {
    expect(firstPlayableMode(sizesWith(0))).toBe(MODES[0].id);
  });
});
