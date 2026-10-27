import { describe, expect, it } from "vitest";
import type { Group, Member } from "../../src/game/groups";
import { computeStats, toRecord, type RoundRecord } from "../../src/game/stats";
import type { Round } from "../../src/game/types";

const members: Member[] = [
  { id: "a", name: "Anna" },
  { id: "b", name: "Ben" },
  { id: "c", name: "Cem" },
  { id: "d", name: "Dana" },
];
const all = ["a", "b", "c", "d"];
const rec = (o: Partial<RoundRecord>): RoundRecord => ({
  roundId: Math.random().toString(36),
  evening: 1,
  at: "2026-10-26T20:00:00.000Z",
  mode: "stars",
  players: all,
  impostors: ["a"],
  starter: "a",
  winner: "crew",
  caught: o.winner === "impostor" ? false : true,
  ...o,
});

// Abend 1: Anna 2× Impostor (1× erwischt, 1× gewonnen), Ben 1× Impostor (gewonnen)
// Abend 2: Cem 1× Impostor (erwischt), eine Runde ohne Impostor, Ben 1× Impostor (erwischt)
// Modi: 2× stars, 4× legenden
const records: RoundRecord[] = [
  rec({ evening: 1, impostors: ["a"], starter: "b", winner: "crew" }),
  rec({ evening: 1, impostors: ["a"], starter: "b", winner: "impostor" }),
  rec({ evening: 1, impostors: ["b"], starter: "c", winner: "impostor", mode: "legenden" }),
  rec({ evening: 2, impostors: ["c"], starter: "c", winner: "crew", mode: "legenden" }),
  rec({ evening: 2, impostors: [], starter: "d", winner: null, mode: "legenden" }),
  rec({ evening: 2, impostors: ["b"], starter: "c", winner: "crew", mode: "legenden", players: ["b", "c", "d"] }),
];

describe("computeStats", () => {
  it("berechnet Allzeit-Kennzahlen", () => {
    const s = computeStats(records, members, "all");
    expect(s.rounds).toBe(6);
    expect(s.crewRate).toBeCloseTo(3 / 5);
    expect(s.masterImpostor).toEqual(["Anna", "Ben"]); // je 1 Sieg als Impostor → Gleichstand alphabetisch
    expect(s.unlucky).toEqual(["Anna", "Ben"]); // je 2× Impostor
    expect(s.starterKing).toEqual(["Cem"]); // 3× Starter
    expect(s.favoriteMode).toBe("legenden");
    expect(s.table).toEqual([
      { name: "Anna", rounds: 5, impostor: 2, impostorWins: 1, caught: 1 },
      { name: "Ben", rounds: 6, impostor: 2, impostorWins: 1, caught: 1 },
      { name: "Cem", rounds: 6, impostor: 1, impostorWins: 0, caught: 1 },
      { name: "Dana", rounds: 6, impostor: 0, impostorWins: 0, caught: 0 },
    ]);
  });

  it("zählt als „erwischt“ auch Impostor, die erwischt wurden, aber richtig geraten haben", () => {
    const s = computeStats([rec({ impostors: ["d"], winner: "impostor", caught: true })], members, "all");
    expect(s.table.find((r) => r.name === "Dana")).toMatchObject({ impostorWins: 1, caught: 1 });
  });

  it("beschränkt „Heute“ auf den aktuellen Abend", () => {
    const s = computeStats(records, members, { evening: 2 });
    expect(s.rounds).toBe(3);
    expect(s.crewRate).toBe(1);
    expect(s.masterImpostor).toEqual([]); // kein Impostor-Sieg an Abend 2
    expect(s.unlucky).toEqual(["Ben", "Cem"]);
  });

  it("liefert ohne Runden leere Werte", () => {
    const s = computeStats([], members, "all");
    expect(s).toEqual({
      rounds: 0,
      crewRate: null,
      masterImpostor: [],
      unlucky: [],
      starterKing: [],
      favoriteMode: null,
      table: members.map((m) => ({ name: m.name, rounds: 0, impostor: 0, impostorWins: 0, caught: 0 })),
    });
  });

  it("zeigt umbenannte Mitglieder mit neuem Namen und lässt entfernte weg", () => {
    const renamed = [{ id: "a", name: "Annika" }, members[1]];
    const s = computeStats(records, renamed, "all");
    expect(s.table.map((r) => r.name)).toEqual(["Annika", "Ben"]);
    expect(s.unlucky).toEqual(["Annika", "Ben"]);
    expect(s.starterKing).toEqual(["Ben"]); // Cem (3×) ist kein Mitglied mehr, Ben 2×
  });
});

describe("toRecord bei geänderter Gruppe", () => {
  it("überspringt Namen, die während der Runde umbenannt oder entfernt wurden", () => {
    const group: Group = { id: "g", name: "G", members: members.slice(1), selected: [], evening: 1 };
    const round = { id: "r2", revealOrder: ["Anna", "Ben", "Cem"], impostors: ["Anna"], starter: "Anna" } as Round;
    expect(toRecord(round, group, "stars", { winner: "crew", caught: true }, "t")).toMatchObject({
      players: ["b", "c"],
      impostors: [],
      starter: "",
    });
  });
});

describe("toRecord", () => {
  it("übersetzt Namen der Runde in Mitglieds-IDs", () => {
    const group: Group = { id: "g", name: "G", members, selected: all, evening: 3 };
    const round = {
      id: "r1",
      revealOrder: ["Cem", "Anna", "Ben"],
      impostors: ["Ben"],
      starter: "Anna",
    } as Round;
    expect(toRecord(round, group, "teams", { winner: "impostor", caught: false }, "2026-10-26T21:00:00.000Z")).toEqual({
      roundId: "r1",
      evening: 3,
      at: "2026-10-26T21:00:00.000Z",
      mode: "teams",
      players: ["c", "a", "b"],
      impostors: ["b"],
      starter: "a",
      winner: "impostor",
      caught: false,
    });
  });
});
