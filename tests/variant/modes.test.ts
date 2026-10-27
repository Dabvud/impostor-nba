import { describe, expect, it } from "vitest";
import { MODES, buildPool, poolFor, poolKey, allImpostorsMax } from "../../src/variant/modes";
import playersJson from "../../src/data/players.json";
import teamsJson from "../../src/data/teams.json";
import { drawRound } from "../../src/game/engine";
import { poolSizes } from "../../src/game/modes";
import type { Entry } from "../../src/game/types";
import type { NbaPlayer, NbaTeam } from "../../src/variant/types";
import { seededRng } from "../helpers/rng";
import { player, playerExtras, players, team, teamExtras, teams } from "./fixtures";

/** Nur die normalen Tipps – die Tipps der Alle-Impostor-Runde prüfen eigene Tests. */
const normal = (entries: Entry[]) => entries.map(({ name, hints }) => ({ name, hints }));
const names = (mode: Parameters<typeof buildPool>[0], difficulty: 1 | 2 | 3 = 1) =>
  buildPool(mode, difficulty, players, teams).map((e) => e.name);

describe("poolFor – Tipps für die Runde, in der alle Impostor sind", () => {
  const squad = [
    player("M", { hints: { nation: "USA", position: "Point Guard", special: null },
      extras: playerExtras({ continent: "Nordamerika", hand: "Linkshänder", era: "2010er", hair: "Glatze" }) }),
    player("R", { hints: { nation: "Deutschland", position: "Point Guard", special: null },
      extras: playerExtras({ continent: "Europa", hand: "Linkshänder", era: "2010er", hair: "blond" }) }),
    player("K", { hints: { nation: "Kanada", position: "Center", special: null },
      extras: playerExtras({ continent: "Nordamerika", hand: "Rechtshänder", era: "2010er", hair: "Locken" }) }),
  ];

  it("sammelt geteilte Tipps mit ihrer Konfliktgruppe und der Positionsgruppe", () => {
    const byName = Object.fromEntries(buildPool("stars", 1, squad, []).map((e) => [e.name, e]));
    expect(byName.M.allHints).toEqual([
      { slot: "position", value: "Point Guard" },
      { slot: "herkunft", value: "Nordamerika" },
      { slot: "hand", value: "Linkshänder" },
    ]);
    expect(byName.R.allHints).toEqual([
      { slot: "position", value: "Point Guard" },
      { slot: "hand", value: "Linkshänder" },
    ]);
    expect(byName.K.allHints).toEqual([{ slot: "herkunft", value: "Nordamerika" }]);
    expect([byName.M.group, byName.K.group]).toEqual(["Guard", "Center"]);
  });

  it("nimmt bei Teams auch Gründungszeit, Maskottchen und Co. dazu", () => {
    const league = [
      { ...team("A", "Rot", "Westen"), extras: teamExtras({ founded: "1960er", mascot: "Tier-Maskottchen" }) },
      { ...team("B", "Blau", "Osten"), extras: teamExtras({ founded: "1970er", mascot: "Tier-Maskottchen" }) },
      { ...team("C", "Grün", "Norden"), extras: teamExtras({ founded: "1970er", mascot: "kein Maskottchen" }) },
    ];
    expect(buildPool("teams", 1, [], league).map((e) => e.allHints)).toEqual([
      [{ slot: "maskottchen", value: "Tier-Maskottchen" }],
      [
        { slot: "gruendung", value: "1970er" },
        { slot: "maskottchen", value: "Tier-Maskottchen" },
      ],
      [{ slot: "gruendung", value: "1970er" }],
    ]);
  });

  it("ordnet Division und Conference demselben Konflikt-Slot zu", () => {
    const league = [
      ...["A", "B"].map((name) => ({ ...team(name, "Rot", "Western Conference"),
        hints: { ...team(name, "Rot", "Western Conference").hints, division: "Pacific Division" } })),
      ...["C", "D"].map((name) => ({ ...team(name, "Rot", "Eastern Conference"),
        hints: { ...team(name, "Rot", "Eastern Conference").hints, division: "Atlantic Division" } })),
    ];
    expect(buildPool("teams", 1, [], league).map((e) => e.allHints)).toEqual([
      ...Array.from({ length: 2 }, () => [
        { slot: "conference", value: "Western Conference" },
        { slot: "conference", value: "Pacific Division" },
      ]),
      ...Array.from({ length: 2 }, () => [
        { slot: "conference", value: "Eastern Conference" },
        { slot: "conference", value: "Atlantic Division" },
      ]),
    ]);
  });
});

describe("poolFor", () => {
  it("filtert Stars, Legenden und Teams anhand der Tags", () => {
    expect(names("stars")).toEqual(["A", "C"]);
    expect(names("legenden")).toEqual(["B", "C"]);
    expect(names("teams")).toEqual(["X", "Y", "Z"]);
  });

  it.each(["stars", "legenden", "teams"] as const)("ignoriert die Schwierigkeit bei %s", (mode) => {
    expect(buildPool(mode, 2, players, teams)).toEqual(buildPool(mode, 1, players, teams));
    expect(buildPool(mode, 3, players, teams)).toEqual(buildPool(mode, 1, players, teams));
  });

  it("liefert Name und die vorhandenen Tipps als Liste", () => {
    expect(normal(buildPool("stars", 1, players, teams))).toEqual([
      { name: "A", hints: ["Point Guard", "Dreier-Spezialist"] },
      { name: "C", hints: ["Center"] },
    ]);
    expect(normal(buildPool("legenden", 1, players, teams))).toEqual([
      { name: "B", hints: ["Power Forward"] },
      { name: "C", hints: ["Center"] },
    ]);
  });

  it.each(["stars", "legenden"] as const)("nennt die Nation bei %s erst ab 5 Spielern im Topf", (mode) => {
    const squad = [
      ...["U1", "U2", "U3", "U4", "U5"].map((name) => player(name, { tags: ["star", "legende"] })),
      player("K", { tags: ["star", "legende"], hints: { nation: "Kanada", position: "Center", special: null } }),
    ];
    const pool = buildPool(mode, 1, squad, []);
    expect(pool[0].hints).toEqual(["USA", "Point Guard"]);
    expect(pool[0].allHints).toContainEqual({ slot: "herkunft", value: "USA" });
    expect(pool[5].hints).toEqual(["Center"]);
    expect(pool[5].allHints).toEqual([]);
    const smaller = buildPool(mode, 1, squad.slice(1), []);
    expect(smaller[0].hints).toEqual(["Point Guard"]);
    expect(smaller[0].allHints).not.toContainEqual({ slot: "herkunft", value: "USA" });
  });

  it("zählt für die Nation nur Spieler des gewählten Modus", () => {
    const squad = Array.from({ length: 5 }, (_, i) => player("U" + i, { tags: i === 4 ? ["legende"] : ["star"] }));
    expect(buildPool("stars", 1, squad, []).every((e) => !e.hints.includes("USA"))).toBe(true);
    expect(buildPool("stars", 1, squad, []).every((e) => !e.allHints?.some((h) => h.value === "USA"))).toBe(true);
  });

  it("lässt eine auf alle zutreffende Nation nur aus den persönlichen Tipps weg", () => {
    const squad = Array.from({ length: 5 }, (_, i) => player("U" + i));
    const pool = buildPool("stars", 1, squad, []);
    expect(pool.every((e) => e.hints.includes("USA"))).toBe(true);
    expect(pool.map((e) => e.allHints)).toEqual([[], [], [], [], []]);
  });

  it("nennt Team-Tipps nur, wenn mindestens 2, aber nicht alle Teams sie teilen", () => {
    expect(normal(buildPool("teams", 1, [], teams))).toEqual([
      { name: "X", hints: ["Rot"] },
      { name: "Y", hints: ["Osten", "Rot"] },
      { name: "Z", hints: ["Osten"] },
    ]);
    // Rot trifft auf beide (alle) zu und fällt ebenso weg wie die jeweils einmalige Conference.
    expect(buildPool("teams", 1, [], teams.slice(0, 2)).map((e) => e.hints)).toEqual([[], []]);
    expect(buildPool("teams", 1, [], teams).map((e) => e.allHints)).toEqual([
      [{ slot: "farbe", value: "Rot" }],
      [{ slot: "conference", value: "Osten" }, { slot: "farbe", value: "Rot" }],
      [{ slot: "conference", value: "Osten" }],
    ]);
  });

  it("ordnet alle fünf Positionen Guard, Forward oder Center zu", () => {
    const squad = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"].map((position) =>
      player(position, { hints: { nation: "USA", position, special: null } }));
    expect(buildPool("stars", 1, squad, []).map((e) => e.group)).toEqual(["Guard", "Guard", "Forward", "Forward", "Center"]);
  });

  it("lässt auch Center als Tipp-Geber zu", () => {
    const pool = buildPool("stars", 1, players, teams);
    expect(pool.find((e) => e.name === "C")).toMatchObject({ group: "Center" });
    expect(pool.every((e) => e.tipDonor !== false)).toBe(true);
    const donors = pool.map((e) => ({ ...e, allHints: [{ slot: "test", value: e.name }] }));
    const names = ["Anna", "Ben", "Cem"];
    const seen = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const tips = drawRound(names, names.length, donors, [], seededRng(seed), true).round.personalHints;
      expect(Object.values(tips ?? {})).toHaveLength(1);
      for (const tip of Object.values(tips ?? {})) seen.add(tip);
    }
    expect([...seen].sort()).toEqual(["A", "C"]);
  });
});

describe("poolKey", () => {
  it("verwendet in jedem Modus und jeder Stufe nur den Modus", () => {
    for (const mode of MODES) {
      for (const difficulty of [1, 2, 3] as const) expect(poolKey(mode.id, difficulty)).toBe(mode.id);
    }
  });
});

describe("MODES", () => {
  it("hat drei Modi mit exakten Labels und ohne Schwierigkeit", () => {
    expect(MODES).toEqual([
      { id: "stars", label: "⭐ Aktuelle Stars", hasDifficulty: false },
      { id: "legenden", label: "👑 Legenden", hasDifficulty: false },
      { id: "teams", label: "🏟️ NBA-Teams", hasDifficulty: false },
    ]);
  });
});

describe("Anbindung der Spieldaten", () => {
  it("verwendet in allen Modi und Stufen dieselbe Topflogik wie mit übergebenen Daten", () => {
    for (const mode of MODES) {
      for (const difficulty of [1, 2, 3] as const) {
        expect(poolFor(mode.id, difficulty)).toEqual(buildPool(mode.id, difficulty, playersJson as NbaPlayer[], teamsJson as NbaTeam[]));
      }
    }
  });

  it("hat einen gefüllten Star-Topf, noch keine Legenden und genau 30 NBA-Teams", () => {
    const sizes = poolSizes();
    expect(sizes.stars).toBeGreaterThanOrEqual(60);
    expect(sizes.stars).toBeLessThanOrEqual(90);
    expect(sizes.legenden).toBe(0);
    expect(sizes.teams).toBe(30);
  });

  it("setzt die Grenze bei Teams auf 6, bei Stars und Legenden auf 10", () => {
    expect(MODES.map((mode) => allImpostorsMax(mode.id))).toEqual([10, 10, 6]);
  });
});
