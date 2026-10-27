import { describe, expect, it } from "vitest";
import { maxImpostors, normalizeNames, validateSettings } from "../../src/game/settings";
import type { Settings } from "../../src/game/types";

const base: Settings = {
  names: ["Anna", "Ben", "Cem"],
  impostorCount: 1,
  mode: "alle",
  difficulty: 1,
  hintsEnabled: true,
  secretImpostors: false,
  thinkSeconds: null,
  discussSeconds: null,
  groupId: null,
  guessEnabled: true,
};

describe("maxImpostors", () => {
  it.each([
    [3, 1],
    [4, 1],
    [5, 2],
    [6, 2],
    [7, 3],
  ])("bei %i Spielern höchstens %i", (players, max) => {
    expect(maxImpostors(players)).toBe(max);
  });
});

describe("normalizeNames", () => {
  it("trimmt und entfernt leere Namen", () => {
    expect(normalizeNames([" Luca ", "", "  ", "Ben"])).toEqual(["Luca", "Ben"]);
  });
});

describe("validateSettings", () => {
  it("akzeptiert gültige Einstellungen", () => {
    expect(validateSettings(base)).toEqual([]);
  });

  it("verlangt mindestens 3 Spieler", () => {
    expect(validateSettings({ ...base, names: ["Anna", "Ben"] })).toContain("Mindestens 3 Spieler");
  });

  it("verlangt mindestens einen Impostor", () => {
    expect(validateSettings({ ...base, impostorCount: 0 })).toContain("Mindestens 1 Impostor");
  });

  it("begrenzt die Impostor-Anzahl", () => {
    expect(validateSettings({ ...base, impostorCount: 2 })).toContain("Höchstens 1 Impostor bei 3 Spielern");
  });

  it("ignoriert die Impostor-Anzahl im geheimen Modus", () => {
    expect(validateSettings({ ...base, secretImpostors: true, impostorCount: 0 })).toEqual([]);
    expect(validateSettings({ ...base, secretImpostors: true, impostorCount: 9 })).toEqual([]);
  });

  it("erkennt doppelte Namen getrimmt und ohne Groß-/Kleinschreibung", () => {
    expect(validateSettings({ ...base, names: ["Luca", "luca ", "Ben"] })).toContain("Namen doppelt");
  });
});
