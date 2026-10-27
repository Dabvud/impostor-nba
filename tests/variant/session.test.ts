import { describe, expect, it } from "vitest";
import teamsJson from "../../src/data/teams.json";
import { nextRound } from "../../src/game/session";
import { seededRng } from "../helpers/rng";
import { settings as fixtureSettings } from "./fixtures";

const settings = { ...fixtureSettings, mode: "teams" as const };

describe("nextRound mit NBA-Teams", () => {
  it("zieht ein echtes Team mit einem seiner geteilten Tipps und speichert es unter teams", () => {
    const used = { stars: ["Spieler A"], teams: [teamsJson[0].name] };
    const { round, used: nextUsed } = nextRound(settings, used, seededRng(5));
    const team = teamsJson.find((t) => t.name === round.word.name);
    expect(team).toBeDefined();
    expect(round.word.name).not.toBe(teamsJson[0].name);
    expect(round.word.hints).toContain(round.hint);
    expect(Object.values(team!.hints)).toContain(round.hint);
    const sharing = teamsJson.filter((t) => Object.values(t.hints).includes(round.hint!));
    expect(sharing.length).toBeGreaterThanOrEqual(2);
    expect(sharing.length).toBeLessThan(30);
    expect(round.impostors).toHaveLength(1);
    expect(nextUsed).toEqual({ stars: ["Spieler A"], teams: [teamsJson[0].name, round.word.name] });
    expect(used).toEqual({ stars: ["Spieler A"], teams: [teamsJson[0].name] });
  });

  it("verwendet auch nach einem Schwierigkeitswechsel dieselben schon gespielten Teams", () => {
    const first = nextRound(settings, {}, seededRng(5));
    const next = nextRound({ ...settings, difficulty: 3 }, first.used, seededRng(5));
    expect(next.round.word.name).not.toBe(first.round.word.name);
    expect(next.used).toEqual({ teams: [first.round.word.name, next.round.word.name] });
  });
});

describe("Grenzen der Alle-Impostor-Runde", () => {
  it("erlaubt bei Teams alle Impostor bis 6, ab 7 Mitspielern keine Alle-Impostor-Runde", () => {
    const allOrNone = (count: number) => {
      const names = Array.from({ length: count }, (_, i) => "S" + i);
      return nextRound({ ...settings, names, secretImpostors: true }, {}, () => 0).round;
    };
    const all = allOrNone(6);
    expect(all.impostors).toHaveLength(6);
    expect(all.personalHints).not.toBeNull();
    expect(Object.keys(all.personalHints ?? {}).length).toBeGreaterThan(0);
    const none = allOrNone(7);
    expect(none.impostors).toHaveLength(0);
    expect(none.personalHints).toBeNull();
  });
});
