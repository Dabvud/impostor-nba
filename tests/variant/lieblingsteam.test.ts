import { describe, expect, it } from "vitest";
import teamsJson from "../../src/data/teams.json";
import { MODES, allImpostorsMax, buildPool, poolKey } from "../../src/variant/modes";
import { player, playerExtras } from "./fixtures";

const [selected, other] = teamsJson.map((t) => t.name);
const options = { choice: selected, excludedFilters: [], casual: false };
const squad = [
  player("A", { teams: [selected, other], hints: { nation: "USA", position: "Point Guard", tips: ["Dunker"] },
    extras: playerExtras({ team: selected, hand: "Linkshänder", era: "90er" }) }),
  player("B", { teams: [selected], tags: ["legende"], hints: { nation: "USA", position: "Point Guard", tips: ["Scorer"] },
    extras: playerExtras({ team: selected, hand: "Linkshänder", era: "80er" }) }),
  player("C", { teams: [selected], tags: [], hints: { nation: "Kanada", position: "Center", tips: ["Scorer"] },
    extras: playerExtras({ team: other, hand: "Rechtshänder" }) }),
  player("Fremd", { teams: [other], hints: { nation: "USA", position: "Center", tips: ["Dunker"] } }),
  player("Ohne"),
];

describe("Lieblingsteam", () => {
  it("wählt alle Spieler einer prägenden Station, unabhängig von Tags, Casual und Ären", () => {
    const pool = buildPool("lieblingsteam", 1, squad, [], options);
    expect(pool.map((e) => e.name)).toEqual(["A", "B", "C"]);
    expect(buildPool("lieblingsteam", 3, squad, [], {
      ...options, casual: true, excludedFilters: ["90er", "80er"],
    })).toEqual(pool);
    expect(buildPool("lieblingsteam", 1, squad, [], { ...options, choice: other }).map((e) => e.name))
      .toEqual(["A", "Fremd"]);
  });

  it("nimmt jeden Namen einmal auf, bevor Tipps gezählt werden", () => {
    const original = buildPool("lieblingsteam", 1, squad, [], options);
    const duplicate = { ...squad[0], hints: { ...squad[0].hints, tips: ["Scorer"] } };
    expect(buildPool("lieblingsteam", 1, [...squad, duplicate, squad[1]], [], options)).toEqual(original);
  });

  it("berechnet beide Tipparten nur über den gewählten Topf und lässt den Team-Slot weg", () => {
    const pool = buildPool("lieblingsteam", 1, squad, [], options);
    expect(pool[0].hints).not.toContain("Dunker");
    expect(pool[1].hints).toContain("Scorer");
    expect(pool[2].hints).toContain("Scorer");
    expect(pool[0].allHints).toContainEqual({ slot: "hand", value: "Linkshänder" });
    expect(pool.every((e) => e.allHints?.every((h) => h.slot !== "team"))).toBe(true);
    expect(buildPool("alle", 1, squad.slice(0, 3), [])[0].allHints)
      .toContainEqual({ slot: "team", value: selected });
    expect(buildPool("lieblingsteam", 1, squad.slice(0, 1), [], options)[0])
      .toMatchObject({ hints: [], allHints: [] });
  });

  it("liefert ohne Wahl und für unbekannte Teams einen leeren Topf", () => {
    expect(buildPool("lieblingsteam", 1, squad, [])).toEqual([]);
    for (const choice of [null, "", "unbekannt"]) {
      expect(buildPool("lieblingsteam", 1, squad, [], { ...options, choice })).toEqual([]);
    }
  });

  it("trennt schon gespielte Namen pro Team und behält den Schlüssel bei anderer Schwierigkeit", () => {
    expect(poolKey("lieblingsteam", 1, selected)).toBe("lieblingsteam:" + selected);
    expect(poolKey("lieblingsteam", 3, selected)).toBe(poolKey("lieblingsteam", 1, selected));
    expect(poolKey("lieblingsteam", 1, other)).not.toBe(poolKey("lieblingsteam", 1, selected));
    expect(poolKey("alle", 1, selected)).toBe("alle");
    expect(allImpostorsMax("lieblingsteam")).toBe(10);
  });

  it("bietet genau die 30 Teams alphabetisch mit einer Mindestgröße von fünf an", () => {
    const mode = MODES.find((m) => m.id === "lieblingsteam")!;
    expect(mode.choices).toHaveLength(30);
    expect(new Set(mode.choices?.map((c) => c.id)).size).toBe(30);
    expect(mode.choices).toEqual(teamsJson.map(({ name }) => ({ id: name, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label, "de")));
    expect(mode).toMatchObject({ choiceLabel: "Team", minChoicePool: 5, hasDifficulty: false });
    expect(mode.filters).toBeUndefined();
    expect(mode.hasCasual).toBeUndefined();
  });
});
