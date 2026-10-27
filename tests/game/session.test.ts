import { describe, expect, it } from "vitest";
import { nextRound } from "../../src/game/session";
import type { Club, Footballer, Settings } from "../../src/game/types";
import { seededRng } from "../helpers/rng";

const players: Footballer[] = [{ name: "A", tier: 1, tags: [], hints: { nation: "N", position: "Torwart", special: null } }];
const club = (name: string, color: string, character: string): Club => ({
  name,
  region: "de",
  inAllClubs: true,
  hints: { region: `Region ${name}`, color, league: `Liga ${name}`, character, success: `Erfolg ${name}`, crest: `Wappen ${name}` },
});
// Jeder Verein teilt mindestens einen Tipp mit einem anderen, aber keiner trifft auf alle zu.
const clubs: Club[] = [club("X", "Rot", "Kultklub"), club("Y", "Rot", "Großklub"), club("Z", "Blau", "Großklub")];
const settings: Settings = {
  names: [" Anna ", "Ben", "Cem"],
  impostorCount: 1,
  mode: "vereine-de",
  difficulty: 2,
  hintsEnabled: true,
  secretImpostors: false,
  thinkSeconds: 30,
  discussSeconds: 120,
  groupId: null,
  guessEnabled: true,
};

describe("nextRound", () => {
  it("aktualisiert nur den Topf des gewählten Modus", () => {
    const used = { "alle-1": ["A"] };
    const result = nextRound(settings, players, clubs, used, seededRng(5));
    expect(result.used["alle-1"]).toEqual(["A"]);
    expect(result.used["vereine-de"]).toEqual([result.round.word.name]);
    expect(["X", "Y", "Z"]).toContain(result.round.word.name);
  });

  it("gibt mit eingeschaltetem Schalter einen Tipp, sonst keinen", () => {
    expect(["Rot", "Großklub"]).toContain(nextRound(settings, players, clubs, {}, seededRng(5)).round.hint);
    expect(nextRound({ ...settings, hintsEnabled: false }, players, clubs, {}, seededRng(5)).round.hint).toBeNull();
  });

  it("gibt jeder Runde eine ID und übernimmt den Raten-Schalter", () => {
    const a = nextRound({ ...settings, guessEnabled: false }, players, clubs, {}, seededRng(5)).round;
    const b = nextRound(settings, players, clubs, {}, seededRng(6)).round;
    expect(a.id).toMatch(/^[0-9a-z]{8}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.guessEnabled).toBe(false);
    expect(b.guessEnabled).toBe(true);
  });

  it("übernimmt die Timer-Einstellungen in die Runde", () => {
    const { round } = nextRound(settings, players, clubs, {}, seededRng(5));
    expect(round.thinkSeconds).toBe(30);
    expect(round.discussSeconds).toBe(120);
  });

  it("lost im geheimen Modus 0 bis max Impostor aus", () => {
    const secret = { ...settings, names: ["A", "B", "C", "D", "E", "F", "G"], secretImpostors: true, impostorCount: 1 };
    const seen = new Set<number>();
    for (let seed = 0; seed < 300; seed++) {
      seen.add(nextRound(secret, players, clubs, {}, seededRng(seed)).round.impostors.length);
    }
    // 1 % „alle“ taucht in 300 Runden nicht zuverlässig auf – geprüft wird es in drawImpostorCount
    expect([...seen].filter((n) => n <= 3).sort()).toEqual([0, 1, 2, 3]);
    expect([...seen].every((n) => n <= 3 || n === 7)).toBe(true);
  });

  it("erlaubt „alle Impostor“ bei Spielern nur bis 10, bei Vereinen nur bis 6 Mitspielern", () => {
    const allOrNone = (mode: Settings["mode"], count: number) => {
      const names = Array.from({ length: count }, (_, i) => `S${i}`);
      const s = { ...settings, mode, names, secretImpostors: true };
      return nextRound(s, players, clubs, {}, () => 0).round.impostors.length;
    };
    expect(allOrNone("vereine-de", 6)).toBe(6);
    expect(allOrNone("vereine-de", 7)).toBe(0);
    expect(allOrNone("alle", 10)).toBe(10);
    expect(allOrNone("alle", 11)).toBe(0);
  });

  it("verwendet normalisierte Namen", () => {
    const { round } = nextRound(settings, players, clubs, {}, seededRng(5));
    expect([...round.revealOrder].sort()).toEqual(["Anna", "Ben", "Cem"]);
  });
});
