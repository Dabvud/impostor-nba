import { describe, expect, it } from "vitest";
import { nextRound } from "../../src/game/session";
import type { Settings } from "../../src/game/types";
import { players, teams } from "../helpers/nba";
import { seededRng } from "../helpers/rng";

const settings: Settings = {
  names: [" Anna ", "Ben", "Cem"],
  impostorCount: 1,
  mode: "teams",
  hintsEnabled: true,
  secretImpostors: false,
  thinkSeconds: 30,
  discussSeconds: 120,
  groupId: null,
  guessEnabled: true,
};

describe("nextRound", () => {
  it("aktualisiert nur den Topf des gewählten Modus", () => {
    const used = { "stars": ["A"] };
    const result = nextRound(settings, players, teams, used, seededRng(5));
    expect(result.used["stars"]).toEqual(["A"]);
    expect(result.used["teams"]).toEqual([result.round.word.name]);
    expect(["X", "Y", "Z"]).toContain(result.round.word.name);
  });

  it("gibt mit eingeschaltetem Schalter einen Tipp, sonst keinen", () => {
    expect(["Rot", "Osten"]).toContain(nextRound(settings, players, teams, {}, seededRng(5)).round.hint);
    expect(nextRound({ ...settings, hintsEnabled: false }, players, teams, {}, seededRng(5)).round.hint).toBeNull();
  });

  it("gibt jeder Runde eine ID und übernimmt den Raten-Schalter", () => {
    const a = nextRound({ ...settings, guessEnabled: false }, players, teams, {}, seededRng(5)).round;
    const b = nextRound(settings, players, teams, {}, seededRng(6)).round;
    expect(a.id).toMatch(/^[0-9a-z]{8}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.guessEnabled).toBe(false);
    expect(b.guessEnabled).toBe(true);
  });

  it("übernimmt die Timer-Einstellungen in die Runde", () => {
    const { round } = nextRound(settings, players, teams, {}, seededRng(5));
    expect(round.thinkSeconds).toBe(30);
    expect(round.discussSeconds).toBe(120);
  });

  it("lost im geheimen Modus 0 bis max Impostor aus", () => {
    const secret = { ...settings, names: ["A", "B", "C", "D", "E", "F", "G"], secretImpostors: true, impostorCount: 1 };
    const seen = new Set<number>();
    for (let seed = 0; seed < 300; seed++) {
      seen.add(nextRound(secret, players, teams, {}, seededRng(seed)).round.impostors.length);
    }
    // 1 % „alle“ taucht in 300 Runden nicht zuverlässig auf – geprüft wird es in drawImpostorCount
    expect([...seen].filter((n) => n <= 3).sort()).toEqual([0, 1, 2, 3]);
    expect([...seen].every((n) => n <= 3 || n === 7)).toBe(true);
  });

  it("erlaubt „alle Impostor“ bei Spielern nur bis 10, bei Teams nur bis 6 Mitspielern", () => {
    const allOrNone = (mode: Settings["mode"], count: number) => {
      const names = Array.from({ length: count }, (_, i) => `S${i}`);
      const s = { ...settings, mode, names, secretImpostors: true };
      return nextRound(s, players, teams, {}, () => 0).round.impostors.length;
    };
    expect(allOrNone("teams", 6)).toBe(6);
    expect(allOrNone("teams", 7)).toBe(0);
    expect(allOrNone("stars", 10)).toBe(10);
    expect(allOrNone("stars", 11)).toBe(0);
  });

  it("verwendet normalisierte Namen", () => {
    const { round } = nextRound(settings, players, teams, {}, seededRng(5));
    expect([...round.revealOrder].sort()).toEqual(["Anna", "Ben", "Cem"]);
  });
});
