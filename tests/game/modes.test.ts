import { describe, expect, it } from "vitest";
import { firstPlayableMode, MODES, playerEntries, poolFor, poolKey, poolSizes, teamEntries } from "../../src/game/modes";
import type { PlayerExtras } from "../../src/game/types";
import { player, playerExtras, players, team, teamExtras, teams } from "../helpers/nba";

describe("Modi und Töpfe", () => {
  it("hat drei Modi mit exakten Labels", () => {
    expect(MODES).toEqual([
      { id: "stars", label: "⭐ Aktuelle Stars" },
      { id: "legenden", label: "👑 Legenden" },
      { id: "teams", label: "🏟️ NBA-Teams" },
    ]);
  });
  it("filtert Spieler nach Tags und nimmt alle Teams", () => {
    expect(poolFor("stars", players, teams).map((e) => e.name)).toEqual(["A", "C"]);
    expect(poolFor("legenden", players, teams).map((e) => e.name)).toEqual(["B", "C"]);
    expect(poolFor("teams", players, teams).map((e) => e.name)).toEqual(["X", "Y", "Z"]);
  });
  it.each(MODES)("verwendet den Modus $id als Speicherschlüssel", ({ id }) => {
    expect(poolKey(id)).toBe(id);
  });
  it("zählt Einträge je Modus, auch mit mehreren Tags und leeren Spielerlisten", () => {
    expect(poolSizes(players, teams)).toEqual({ stars: 2, legenden: 2, teams: 3 });
    expect(poolSizes([], teams)).toEqual({ stars: 0, legenden: 0, teams: 3 });
    expect(poolSizes([], [])).toEqual({ stars: 0, legenden: 0, teams: 0 });
  });
  it.each([
    [{ stars: 2, legenden: 3, teams: 4 }, "stars"],
    [{ stars: 0, legenden: 3, teams: 4 }, "legenden"],
    [{ stars: 0, legenden: 0, teams: 4 }, "teams"],
    [{ stars: 0, legenden: 0, teams: 0 }, "teams"],
  ] as const)("wählt den ersten spielbaren Modus aus %j", (sizes, expected) => {
    expect(firstPlayableMode(sizes)).toBe(expected);
  });
});

describe("Spieler-Tipps", () => {
  it.each([
    ["Point Guard", "Guard"], ["Shooting Guard", "Guard"], ["Small Forward", "Forward"],
    ["Power Forward", "Forward"], ["Center", "Center"],
  ])("ordnet %s der Positionsgruppe %s zu", (position, group) => {
    expect(playerEntries([player("A", { hints: { nation: "USA", position, special: null } })])[0].positionGroup).toBe(group);
  });
  it("liefert Position und vorhandenen Spezialtipp", () => {
    expect(playerEntries(players)[0].hints).toEqual(["Point Guard", "Dreier-Spezialist"]);
  });
  it("nennt die Nation erst ab fünf Spielern desselben Landes im gewählten Topf", () => {
    const squad = [...Array.from({ length: 5 }, (_, i) => player("S" + i)),
      player("D", { hints: { nation: "Deutschland", position: "Center", special: null } })];
    expect(playerEntries(squad)[0].hints).toEqual(["USA", "Point Guard"]);
    expect(playerEntries(squad)[5].hints).toEqual(["Center"]);
    expect(playerEntries(squad.slice(1))[0].hints).toEqual(["Point Guard"]);
    expect(playerEntries(squad)[0].allHints).toContainEqual({ slot: "herkunft", value: "USA" });
    expect(playerEntries(squad.slice(0, 5))[0].allHints).not.toContainEqual({ slot: "herkunft", value: "USA" });
    squad[0].tags = ["legende"];
    expect(poolFor("stars", squad, [])[0].hints).toEqual(["Point Guard"]);
  });
  it("ordnet alle Zusatzkategorien in der richtigen Reihenfolge ihren Konflikt-Slots zu", () => {
    const slots: [keyof PlayerExtras, string][] = [
      ["continent", "herkunft"], ["conference", "conference"], ["team", "team"], ["playStyle", "spielart"],
      ["trait", "eigenschaft"], ["moment", "erfolg"], ["award", "erfolg"], ["title", "erfolg"],
      ["hair", "frisur"], ["look", "aussehen"], ["era", "zeit"], ["build", "koerperbau"],
      ["hand", "hand"], ["careerType", "karriere"], ["shirtNumber", "nummer"], ["status", "zeit"],
      ["afterCareer", "zeit"], ["draft", "draft"], ["college", "college"], ["transfer", "transfer"],
    ];
    const extras = playerExtras(Object.fromEntries(slots.map(([key]) => [key, key])));
    const pool = playerEntries([player("A", { extras }), player("B", { extras }),
      player("C", { hints: { nation: "Kanada", position: "Center", special: null } })]);
    expect(pool[0].allHints).toEqual([{ slot: "position", value: "Point Guard" },
      ...slots.map(([value, slot]) => ({ slot, value }))]);
    expect(pool[2].allHints).toEqual([]);
  });
});

describe("Team-Tipps", () => {
  it("behält nur Werte, die mindestens zwei, aber nicht alle Teams teilen", () => {
    expect(teamEntries(teams).map((e) => e.hints)).toEqual([["Rot"], ["Osten", "Rot"], ["Osten"]]);
    expect(teamEntries(teams.slice(0, 2)).map((e) => e.hints)).toEqual([[], []]);
  });
  it("verwendet sechs normale und alle zwölf Zusatzkategorien samt Konflikten", () => {
    const a = { ...team("A", "Rot", "Westen"), extras: teamExtras({ founded: "1960er", cityType: "Großstadt",
      rival: "hat eine berühmte Rivalität", mascot: "Tier-Maskottchen", relocated: "ist schon einmal umgezogen", nameType: "Tiername" }) };
    const b = { ...a, name: "B" };
    const c = team("C", "Blau", "Osten");
    const result = teamEntries([a, b, c])[0];
    expect(result.hints).toEqual(Object.values(a.hints));
    expect(result.allHints).toEqual([
      ...["conference", "conference", "farbe", "ort", "erfolg", "logo"].map((slot, i) => ({ slot, value: Object.values(a.hints)[i] })),
      ...["gruendung", "ort", "rivale", "maskottchen", "geschichte", "name"].map((slot, i) => ({ slot, value: Object.values(a.extras)[i] })),
    ]);
  });
  it("verarbeitet fehlende Extras und leere Töpfe", () => {
    expect(playerEntries([])).toEqual([]);
    expect(teamEntries([])).toEqual([]);
    expect(teamEntries([teams[0]])[0]).toMatchObject({ hints: [], allHints: [] });
  });
});
