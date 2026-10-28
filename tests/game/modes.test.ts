import { describe, expect, it, vi } from "vitest";
import { firstPlayableMode, MODES, poolFor, poolSizes, type ModeId } from "../../src/game/modes";
import type { Entry } from "../../src/game/types";

vi.mock("../../src/variant/modes", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/variant/modes")>(),
  MODES: (await importOriginal<typeof import("../../src/variant/modes")>()).MODES.map((mode, i) => ({
    id: mode.id, label: "Modus " + i, hasDifficulty: false,
    ...(i === 1 ? { choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }] } : {}),
  })),
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

it("verwendet für Einfachauswahlen den größten Optionstopf, auch wenn der Topf ohne Wahl leer ist", () => {
  vi.mocked(poolFor).mockImplementation((_mode, difficulty, options) => {
    expect(difficulty).toBe(3);
    return Array.from({ length: options?.choice === "b" ? 6 : options?.choice === "a" ? 2 : 0 },
      (_, i) => ({ name: "Begriff " + i, hints: [] }));
  });
  expect(poolSizes()[MODES[1].id]).toBe(6);
  expect(firstPlayableMode(poolSizes())).toBe(MODES[1].id);
  vi.mocked(poolFor).mockReturnValue([]);
  expect(poolSizes()[MODES[1].id]).toBe(0);
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
