import { MODES } from "../../src/game/modes";
import { describe, expect, it, vi } from "vitest";
import { maxImpostors, normalizeNames, validateSettings } from "../../src/game/settings";
import type { Settings } from "../../src/game/types";

vi.mock("../../src/variant/modes", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/variant/modes")>();
  return {
    ...original,
    MODES: original.MODES.map((mode, i) => ({
      ...mode,
      filters: i === 0 ? [{ id: "a", label: "A" }, { id: "b", label: "B" }] : undefined,
    })),
  };
});

const base: Settings = {
  names: ["Anna", "Ben", "Cem"],
  impostorCount: 1,
  mode: MODES[0].id,
  difficulty: 1,
  hintsEnabled: true,
  secretImpostors: false,
  thinkSeconds: null,
  discussSeconds: null,
  groupId: null,
  guessEnabled: true,
  excludedFilters: [],
  casual: false,
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

  it("meldet einen leeren Topf vor allen anderen Fehlern", () => {
    const errors = validateSettings({ ...base, names: [] }, 0);
    expect(errors).toEqual(["In diesem Modus gibt es noch keine Begriffe", "Mindestens 3 Spieler"]);
    expect(validateSettings({ ...base, secretImpostors: true }, 0)).toEqual(["In diesem Modus gibt es noch keine Begriffe"]);
  });

  it("akzeptiert gefüllte Töpfe und eine fehlende Topfgröße", () => {
    expect(validateSettings(base, 1)).toEqual([]);
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


describe("Topfauswahl validieren", () => {
  it("verlangt bei Filtern mindestens eine aktive Auswahl, auch im geheimen Modus", () => {
    for (const secretImpostors of [false, true]) {
      expect(validateSettings({ ...base, excludedFilters: ["a", "b", "unbekannt"], secretImpostors }, 5, 0))
        .toEqual(["Mit dieser Auswahl gibt es keine Begriffe", "Mindestens eine Auswahl nötig"]);
    }
  });

  it("akzeptiert eine aktive Auswahl und ignoriert unbekannte IDs", () => {
    expect(validateSettings({ ...base, excludedFilters: ["a", "unbekannt"] }, 5, 2)).toEqual([]);
  });

  it("ignoriert Abwahlen in einem Modus ohne Filter", () => {
    expect(validateSettings({ ...base, mode: MODES[1].id, excludedFilters: ["a", "b"] }, 5, 5)).toEqual([]);
  });

  it("unterscheidet leere Auswahl und grundsätzlich leeren Modus", () => {
    expect(validateSettings(base, 5, 0)).toEqual(["Mit dieser Auswahl gibt es keine Begriffe"]);
    expect(validateSettings(base, 0, 0)).toEqual(["In diesem Modus gibt es noch keine Begriffe"]);
  });
});
