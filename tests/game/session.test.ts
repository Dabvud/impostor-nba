import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextRound } from "../../src/game/session";
import { SPECIAL_RULES } from "../../src/variant/config";
import type { Entry, Settings } from "../../src/game/types";
import { seededRng } from "../helpers/rng";
import { MODES, poolKey } from "../../src/game/modes";
import { allImpostorsMax, poolFor } from "../../src/variant/modes";

vi.mock("../../src/variant/modes", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/variant/modes")>(),
  poolFor: vi.fn(),
  poolKey: vi.fn((mode: string, _difficulty: number, choice?: string | null) => choice ? `${mode}:${choice}` : mode),
  allImpostorsMax: vi.fn(),
}));

vi.mock("../../src/variant/config", () => ({
  SPECIAL_RULES: [
    { id: "a", title: "Regel A", text: "Text A" },
    { id: "b", title: "Regel B", text: "Text B" },
    { id: "c", title: "Regel C", text: "Text C" },
    { id: "d", title: "Regel D", text: "Text D" },
  ],
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
  hintsEnabled: true, specialRules: false,
  secretImpostors: false,
  thinkSeconds: 30,
  discussSeconds: 120,
  groupId: null,
  guessEnabled: true,
  excludedFilters: [],
  casual: false, choice: null,
};

describe("nextRound", () => {
  it("übergibt die aktuellen Optionen an die Variante und behält den Topfschlüssel", () => {
    const selected = { ...settings, excludedFilters: ["a"], casual: true, choice: "option-a" };
    const result = nextRound(selected, {}, seededRng(5));
    expect(poolFor).toHaveBeenLastCalledWith(settings.mode, settings.difficulty, {
      excludedFilters: ["a"], casual: true, choice: "option-a",
    });
    expect(poolKey).toHaveBeenCalledWith(settings.mode, settings.difficulty, "option-a");
    expect(Object.keys(result.used)).toEqual([poolKey(settings.mode, settings.difficulty, "option-a")]);
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


describe("Sonderregel der Runde", () => {
  const enabled = { ...settings, specialRules: true };

  it("lost in ungefähr 10 % von 1000 Runden eine gleichverteilte Regel aus", () => {
    const rng = seededRng(42);
    const counts = new Map(SPECIAL_RULES.map((rule) => [rule.id, 0]));
    for (let i = 0; i < 1000; i++) {
      const rule = nextRound(enabled, {}, rng).round.specialRule;
      if (rule) counts.set(rule.id, counts.get(rule.id)! + 1);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(70);
    expect(total).toBeLessThanOrEqual(130);
    for (const count of counts.values()) {
      expect(count / total).toBeGreaterThan(0.12);
      expect(count / total).toBeLessThan(0.38);
    }
  });

  it("benutzt getrennte Züge für Regelchance, Regelwahl und Rollenanzahl", () => {
    for (const chance of [0.05, 0.5]) {
      for (const roleDraw of [0, 0.05, 0.5, 0.99]) {
        const rng = vi.fn(() => 0.5)
          .mockReturnValueOnce(chance).mockReturnValueOnce(0.75).mockReturnValueOnce(roleDraw);
        const secret = nextRound({ ...enabled, names: ["A", "B", "C", "D", "E", "F", "G"], secretImpostors: true }, {}, rng).round;
        expect(secret.impostors.length).toBe(roleDraw === 0 ? 7 : roleDraw === 0.05 ? 0 : roleDraw === 0.5 ? 2 : 3);
        expect(secret.specialRule).toEqual(chance < 0.1 ? SPECIAL_RULES[3] : null);
      }
    }
    for (const impostorCount of [0, 1, 3]) {
      const rng = vi.fn(() => 0.5).mockReturnValueOnce(0.05).mockReturnValueOnce(0.25);
      const round = nextRound({ ...enabled, impostorCount }, {}, rng).round;
      expect(round.specialRule).toEqual(SPECIAL_RULES[1]);
      expect(round.impostors).toHaveLength(impostorCount);
    }
  });

  it("hat auch in Keiner-, Alle- und normalen Runden ungefähr denselben Anteil", () => {
    const rng = seededRng(73);
    const totals = [0, 0, 0];
    const special = [0, 0, 0];
    for (let i = 0; i < 30000; i++) {
      const round = nextRound({ ...enabled, secretImpostors: true }, {}, rng).round;
      const category = round.impostors.length === 0 ? 0 : round.impostors.length === 3 ? 1 : 2;
      totals[category]++;
      if (round.specialRule) special[category]++;
    }
    for (let i = 0; i < 3; i++) {
      expect(totals[i]).toBeGreaterThan(200);
      expect(special[i] / totals[i]).toBeGreaterThan(0.06);
      expect(special[i] / totals[i]).toBeLessThan(0.14);
    }
  });

  it("liefert ausgeschaltet nie eine Regel und verbraucht keine zusätzlichen Züge", () => {
    for (let seed = 0; seed < 100; seed++) {
      expect(nextRound(settings, {}, seededRng(seed)).round.specialRule).toBeNull();
    }
    const rng = vi.fn(() => 0.5);
    nextRound(settings, {}, rng);
    const calls = rng.mock.calls.length;
    rng.mockClear();
    nextRound(enabled, {}, rng);
    expect(rng).toHaveBeenCalledTimes(calls + 2);
  });

  it("liefert ohne Variantenregeln keine Regel", () => {
    const rules = SPECIAL_RULES.splice(0);
    try {
      expect(nextRound(enabled, {}, () => 0).round.specialRule).toBeNull();
    } finally {
      SPECIAL_RULES.push(...rules);
    }
  });
});
