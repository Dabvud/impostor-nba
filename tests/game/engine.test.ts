import { describe, expect, it } from "vitest";
import { drawImpostorCount, drawRound } from "../../src/game/engine";
import type { Entry } from "../../src/game/types";
import { seededRng } from "../helpers/rng";

const names = ["Anna", "Ben", "Cem", "Dana", "Eli"];
const pool: Entry[] = Array.from({ length: 10 }, (_, i) => ({ name: `E${i}`, hints: [`Tipp${i}a`, `Tipp${i}b`] }));
const poolNames = pool.map((e) => e.name);

describe("drawRound", () => {
  it.each([1, 2])("zieht genau %i verschiedene Impostor aus den Spielern", (count) => {
    const { round } = drawRound(names, count, pool, [], seededRng(7));
    expect(round.impostors).toHaveLength(count);
    expect(new Set(round.impostors).size).toBe(count);
    round.impostors.forEach((n) => expect(names).toContain(n));
  });

  it("liefert als Reihenfolge eine Permutation der Spieler", () => {
    const { round } = drawRound(names, 1, pool, [], seededRng(3));
    expect([...round.revealOrder].sort()).toEqual([...names].sort());
  });

  it("zieht den Starter aus allen Spielern, auch Impostor", () => {
    const starters = new Set<string>();
    let impostorStarted = false;
    for (let seed = 0; seed < 500; seed++) {
      const { round } = drawRound(names, 1, pool, [], seededRng(seed));
      expect(names).toContain(round.starter);
      starters.add(round.starter);
      if (round.impostors.includes(round.starter)) impostorStarted = true;
    }
    expect(starters.size).toBe(names.length);
    expect(impostorStarted).toBe(true);
  });

  it("zieht das Wort aus dem Topf, nicht aus used, und hängt es an used an", () => {
    const used = ["E0", "E1", "E2"];
    const result = drawRound(names, 1, pool, used, seededRng(11));
    expect(poolNames).toContain(result.round.word.name);
    expect(used).not.toContain(result.round.word.name);
    expect(result.used).toEqual([...used, result.round.word.name]);
  });

  it("leert used unter 50 % nicht", () => {
    const used = ["E0", "E1", "E2", "E3"];
    expect(drawRound(names, 1, pool, used, seededRng(1)).used).toHaveLength(5);
  });

  it("leert used ab 50 % des Topfs", () => {
    const used = ["E0", "E1", "E2", "E3", "E4"];
    const result = drawRound(names, 1, pool, used, seededRng(1));
    expect(result.used).toEqual([result.round.word.name]);
  });

  it("zählt fremde Einträge in used nicht zur 50-%-Grenze", () => {
    const foreign = ["X1", "X2", "X3", "X4", "X5", "X6"];
    const used = [...foreign, "E0", "E1", "E2", "E3"];
    const result = drawRound(names, 1, pool, used, seededRng(1));
    expect(result.used).toHaveLength(11);
  });

  it("entfernt fremde Einträge beim Leeren", () => {
    const used = ["X1", "E0", "E1", "E2", "E3", "E4"];
    const result = drawRound(names, 1, pool, used, seededRng(1));
    expect(result.used).toEqual([result.round.word.name]);
  });

  it("setzt einen verkleinerten, bereits vollständig gespielten Topf zurück", () => {
    const smaller = pool.slice(0, 2);
    let used = [...poolNames, "Fremd"];
    for (let seed = 0; seed < 20; seed++) {
      const result = drawRound(names, 1, smaller, used, seededRng(seed));
      expect(smaller.map((e) => e.name)).toContain(result.round.word.name);
      expect(result.used).toEqual([result.round.word.name]);
      used = result.used;
    }
  });

  it("spielt auch einen einzelnen Begriff mit alter Verlaufsliste wiederholt", () => {
    let used = [...poolNames];
    for (let seed = 0; seed < 5; seed++) {
      const result = drawRound(names, 1, pool.slice(0, 1), used, seededRng(seed));
      expect(result.round.word).toEqual(pool[0]);
      expect(result.used).toEqual([pool[0].name]);
      used = result.used;
    }
  });

  it("ist bei gleichem Seed reproduzierbar", () => {
    expect(drawRound(names, 2, pool, [], seededRng(99))).toEqual(drawRound(names, 2, pool, [], seededRng(99)));
  });

  it("zieht mit Tipp einen der Tipps des gezogenen Worts", () => {
    const tips = new Set<string | null>();
    for (let seed = 0; seed < 50; seed++) {
      const { round } = drawRound(names, 1, pool, [], seededRng(seed), true);
      expect(round.word.hints).toContain(round.hint);
      tips.add(round.hint?.slice(-1) ?? null);
    }
    expect(tips).toEqual(new Set(["a", "b"]));
  });

  it("zieht ohne Tipp-Schalter keinen Tipp", () => {
    expect(drawRound(names, 1, pool, [], seededRng(1), false).round.hint).toBeNull();
    expect(drawRound(names, 1, pool, [], seededRng(1)).round.hint).toBeNull();
  });

  it("liefert keinen Tipp, wenn das Wort keine Tipps hat", () => {
    const bare: Entry[] = [{ name: "Solo", hints: [] }];
    expect(drawRound(names, 1, bare, [], seededRng(1), true).round.hint).toBeNull();
  });

  it("legt die Hinweis-Reihenfolge ab dem Starter in Namensreihenfolge fest", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { round } = drawRound(names, 1, pool, [], seededRng(seed));
      const start = names.indexOf(round.starter);
      expect(round.speakingOrder).toEqual([...names.slice(start), ...names.slice(0, start)]);
    }
  });

  it("erlaubt eine Runde ohne Impostor", () => {
    expect(drawRound(names, 0, pool, [], seededRng(3)).round.impostors).toEqual([]);
  });

  describe("wenn alle Impostor sind", () => {
    const SLOTS = Array.from({ length: 8 }, (_, i) => `Kategorie${i}`);
    const donor = (name: string, group: string, tipDonor = true): Entry => ({
      name,
      hints: ["h"],
      group,
      tipDonor,
      allHints: SLOTS.map((slot) => ({ slot, value: `${slot}:${name}` })),
    });
    const squad: Entry[] = [
      donor("T1", "Ausgeschlossen", false),
      donor("T2", "Ausgeschlossen", false),
      ...["A1", "A2", "A3", "A4", "A5", "A6"].map((n) => donor(n, "Gruppe A")),
      ...["V1", "V2", "V3", "V4", "V5", "V6"].map((n) => donor(n, "Gruppe B")),
    ];
    const tipsOf = (seed: number) =>
      Object.values(drawRound(names, names.length, squad, [], seededRng(seed), true).round.personalHints ?? {});

    it("gibt jedem einen Tipp aus einer anderen Konfliktgruppe", () => {
      for (let seed = 0; seed < 30; seed++) {
        const tips = tipsOf(seed);
        expect(tips).toHaveLength(names.length);
        expect(new Set(tips.map((t) => t.split(":")[0])).size).toBe(names.length);
      }
    });

    it("nimmt die Tipps von verschiedenen Einträgen derselben Gruppe", () => {
      for (let seed = 0; seed < 30; seed++) {
        const donors = tipsOf(seed).map((t) => t.split(":")[1]);
        expect(new Set(donors).size).toBe(names.length);
        expect(new Set(donors.map((d) => d[0])).size).toBe(1);
      }
    });

    it("nutzt Einträge mit tipDonor: false nie als Tipp-Geber", () => {
      for (let seed = 0; seed < 100; seed++) {
        expect(tipsOf(seed).some((t) => t.split(":")[1].startsWith("T"))).toBe(false);
      }
      const excluded = [donor("X", "Gruppe A", false)];
      expect(drawRound(names, names.length, excluded, [], seededRng(1), true).round.personalHints).toBeNull();
    });

    it("gibt keinen gemeinsamen Tipp, wenn Tipp-Schalter aus oder nicht alle Impostor sind", () => {
      expect(drawRound(names, names.length, squad, [], seededRng(1), false).round.personalHints).toBeNull();
      expect(drawRound(names, 2, squad, [], seededRng(1), true).round.personalHints).toBeNull();
    });
  });

  it("wirft bei leerem Topf", () => {
    expect(() => drawRound(names, 1, [], [], seededRng(1))).toThrow("Leerer Topf");
  });
});

describe("drawImpostorCount", () => {
  const PLAYERS = 7;
  function distribution(max: number, draws = 50000) {
    const rng = seededRng(42);
    const counts = new Array(PLAYERS + 1).fill(0);
    for (let i = 0; i < draws; i++) counts[drawImpostorCount(max, PLAYERS, rng)]++;
    return counts.map((c) => c / draws);
  }

  it.each([1, 2, 3])("max %i: 1 %% alle, 10 %% keiner, Rest gleich verteilt", (max) => {
    const shares = distribution(max);
    expect(shares[PLAYERS]).toBeCloseTo(0.01, 2);
    expect(shares[0]).toBeCloseTo(0.1, 1);
    for (let k = 1; k <= max; k++) expect(shares[k]).toBeCloseTo(0.89 / max, 1);
    for (let k = max + 1; k < PLAYERS; k++) expect(shares[k]).toBe(0);
  });

  it("lässt „alle Impostor“ weg, wenn es nicht erlaubt ist (zu viele Spieler)", () => {
    const rng = seededRng(7);
    const counts = new Array(PLAYERS + 1).fill(0);
    for (let i = 0; i < 50000; i++) counts[drawImpostorCount(2, PLAYERS, rng, false)]++;
    expect(counts[PLAYERS]).toBe(0);
    expect(counts[0] / 50000).toBeCloseTo(0.1, 1);
    expect(counts[1] / 50000).toBeCloseTo(0.45, 1);
  });

  it("trifft die Grenzen genau", () => {
    expect(drawImpostorCount(2, PLAYERS, () => 0)).toBe(PLAYERS);
    expect(drawImpostorCount(2, PLAYERS, () => 0.0099)).toBe(PLAYERS);
    expect(drawImpostorCount(2, PLAYERS, () => 0.01)).toBe(0);
    expect(drawImpostorCount(2, PLAYERS, () => 0.1099)).toBe(0);
    expect(drawImpostorCount(2, PLAYERS, () => 0.11)).toBe(1);
    expect(drawImpostorCount(2, PLAYERS, () => 0.9999999)).toBe(2);
  });
});
