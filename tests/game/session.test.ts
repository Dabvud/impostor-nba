import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextRound } from "../../src/game/session";
import type { Entry, Settings } from "../../src/game/types";
import { seededRng } from "../helpers/rng";
import { MODES, poolKey } from "../../src/game/modes";
import { allImpostorsMax, poolFor } from "../../src/variant/modes";

vi.mock("../../src/variant/modes", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/variant/modes")>(),
  poolFor: vi.fn(),
  allImpostorsMax: vi.fn(),
}));

const pool: Entry[] = [
  { name: "X", hints: ["Geteilt A"] },
  { name: "Y", hints: ["Geteilt A", "Geteilt B"] },
  { name: "Z", hints: ["Geteilt B"] },
];
beforeEach(() => {
  vi.mocked(poolFor).mockReturnValue(pool);
  vi.mocked(allImpostorsMax).mockReturnValue(10);
});

const settings: Settings = {
  names: [" Anna ", "Ben", "Cem"],
  impostorCount: 1,
  mode: MODES[0].id,
  difficulty: 2,
  hintsEnabled: true,
  secretImpostors: false,
  thinkSeconds: 30,
  discussSeconds: 120,
  groupId: null,
  guessEnabled: true,
  excludedFilters: [],
  casual: false,
};

describe("nextRound", () => {
  it("übergibt die aktuellen Optionen an die Variante und behält den Topfschlüssel", () => {
    const selected = { ...settings, excludedFilters: ["a"], casual: true };
    const result = nextRound(selected, {}, seededRng(5));
    expect(poolFor).toHaveBeenLastCalledWith(settings.mode, settings.difficulty, {
      excludedFilters: ["a"], casual: true,
    });
    expect(Object.keys(result.used)).toEqual([poolKey(settings.mode, settings.difficulty)]);
  });

  it("aktualisiert nur den Topf des gewählten Modus", () => {
    const used = { fremderTopf: ["A"] };
    const result = nextRound(settings, used, seededRng(5));
    expect(result.used.fremderTopf).toEqual(["A"]);
    expect(result.used[poolKey(settings.mode, settings.difficulty)]).toEqual([result.round.word.name]);
    expect(["X", "Y", "Z"]).toContain(result.round.word.name);
  });

  it("gibt mit eingeschaltetem Schalter einen Tipp, sonst keinen", () => {
    expect(["Geteilt A", "Geteilt B"]).toContain(nextRound(settings, {}, seededRng(5)).round.hint);
    expect(nextRound({ ...settings, hintsEnabled: false }, {}, seededRng(5)).round.hint).toBeNull();
  });

  it("gibt jeder Runde eine ID und übernimmt den Raten-Schalter", () => {
    const a = nextRound({ ...settings, guessEnabled: false }, {}, seededRng(5)).round;
    const b = nextRound(settings, {}, seededRng(6)).round;
    expect(a.id).toMatch(/^[0-9a-z]{8}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.guessEnabled).toBe(false);
    expect(b.guessEnabled).toBe(true);
  });

  it("übernimmt die Timer-Einstellungen in die Runde", () => {
    const { round } = nextRound(settings, {}, seededRng(5));
    expect(round.thinkSeconds).toBe(30);
    expect(round.discussSeconds).toBe(120);
  });

  it("lost im geheimen Modus 0 bis max Impostor aus", () => {
    const secret = { ...settings, names: ["A", "B", "C", "D", "E", "F", "G"], secretImpostors: true, impostorCount: 1 };
    const seen = new Set<number>();
    for (let seed = 0; seed < 300; seed++) {
      seen.add(nextRound(secret, {}, seededRng(seed)).round.impostors.length);
    }
    // 1 % „alle“ taucht in 300 Runden nicht zuverlässig auf – geprüft wird es in drawImpostorCount
    expect([...seen].filter((n) => n <= 3).sort()).toEqual([0, 1, 2, 3]);
    expect([...seen].every((n) => n <= 3 || n === 7)).toBe(true);
  });

  it("verwendet normalisierte Namen", () => {
    const { round } = nextRound(settings, {}, seededRng(5));
    expect([...round.revealOrder].sort()).toEqual(["Anna", "Ben", "Cem"]);
  });

  it("übernimmt die Grenze für persönliche Tipps aus der Variante", () => {
    vi.mocked(allImpostorsMax).mockReturnValue(3);
    const secret = { ...settings, names: ["A", "B", "C"], secretImpostors: true };
    expect(nextRound(secret, {}, () => 0).round.impostors).toHaveLength(3);
    expect(nextRound({ ...secret, names: [...secret.names, "D"] }, {}, () => 0).round.impostors).toHaveLength(0);
    expect(allImpostorsMax).toHaveBeenCalledWith(settings.mode);
  });
});
