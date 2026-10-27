import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "../src/game/state";
import type { Settings } from "../src/game/types";
import {
  appendRecord,
  clearStats,
  loadGame,
  loadGroups,
  loadSettings,
  loadStats,
  loadUsed,
  saveGame,
  saveGroups,
  saveSettings,
  saveUsed,
} from "../src/storage";

const settings: Settings = {
  names: ["Anna", "Ben", "Cem"],
  impostorCount: 1,
  mode: "teams",
  hintsEnabled: false,
  secretImpostors: true,
  thinkSeconds: 30,
  discussSeconds: 60,
  groupId: null,
  guessEnabled: true,
};
const game: GameState = {
  phase: "reveal",
  index: 1,
  seen: true,
  round: {
    word: { name: "Nowitzki", hints: ["Deutschland"] },
    hint: "Deutschland",
    impostors: ["Ben"],
    revealOrder: ["Anna", "Ben", "Cem"],
    starter: "Cem",
    id: "r1",
    guessEnabled: true,
    speakingOrder: ["Cem", "Anna", "Ben"],
    thinkSeconds: 30,
    discussSeconds: null,
    personalHints: null,
  },
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("speichern und laden", () => {
  it("liefert dieselben Objekte zurück", () => {
    saveSettings(settings);
    saveGame(game);
    saveUsed({ "stars": ["Nowitzki"] });
    expect(loadSettings()).toEqual(settings);
    expect(loadGame()).toEqual(game);
    expect(loadUsed()).toEqual({ "stars": ["Nowitzki"] });
  });

  it("liefert ohne gespeicherte Daten null bzw. {}", () => {
    expect(loadSettings()).toBeNull();
    expect(loadGame()).toBeNull();
    expect(loadUsed()).toEqual({});
  });

  it("lädt die Einrichtungsphase ohne Runde", () => {
    saveGame({ phase: "setup" });
    expect(loadGame()).toEqual({ phase: "setup" });
  });
});

describe("Spielstände aus v1.0", () => {
  it("ergänzt bei alten Einstellungen Tipp an, kein Geheim-Modus, keine Timer", () => {
    const {
      hintsEnabled: _a,
      secretImpostors: _b,
      thinkSeconds: _c,
      discussSeconds: _d,
      groupId: _e,
      guessEnabled: _f,
      ...old
    } = settings;
    localStorage.setItem("impostor-nba:v1:settings", JSON.stringify(old));
    expect(loadSettings()).toEqual({
      ...settings,
      hintsEnabled: true,
      secretImpostors: false,
      thinkSeconds: null,
      discussSeconds: null,
      groupId: null,
      guessEnabled: true,
    });
  });

  it("lädt alte Runden ohne Tipp mit hint null", () => {
    const oldRound = { word: { name: "Nowitzki", hint: null }, impostors: ["Ben"], revealOrder: ["Anna", "Ben", "Cem"], starter: "Cem" };
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify({ phase: "discussion", round: oldRound }));
    expect(loadGame()).toEqual({
      phase: "discussion",
      round: {
        ...oldRound,
        id: "",
        guessEnabled: false,
        word: { name: "Nowitzki", hints: [] },
        hint: null,
        speakingOrder: ["Cem", "Anna", "Ben"],
        thinkSeconds: null,
        discussSeconds: null,
        personalHints: null,
      },
    });
  });
});

describe("kaputte Daten", () => {
  it("verwirft ungültiges JSON", () => {
    localStorage.setItem("impostor-nba:v1:settings", "{kaputt");
    localStorage.setItem("impostor-nba:v1:game", "{kaputt");
    localStorage.setItem("impostor-nba:v1:used", "{kaputt");
    expect(loadSettings()).toBeNull();
    expect(loadGame()).toBeNull();
    expect(loadUsed()).toEqual({});
  });

  it("verwirft unbekannte Phasen und Runden ohne round", () => {
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify({ phase: "voting", round: game.round }));
    expect(loadGame()).toBeNull();
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify({ phase: "handoff", index: 0 }));
    expect(loadGame()).toBeNull();
  });

  it("lädt persönliche Tipps einer Alle-Impostor-Runde und verwirft kaputte", () => {
    const personal = { ...game, round: { ...game.round, personalHints: { Anna: "Linkshänder", Ben: "Glatze", Cem: "2010er" } } };
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify(personal));
    expect(loadGame()).toEqual(personal);
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify({ ...personal, round: { ...personal.round, personalHints: { Anna: 5 } } }));
    expect((loadGame() as { round: { personalHints: unknown } }).round.personalHints).toBeNull();
  });

  it("lädt eine Auflösung mitten im Ablauf unverändert", () => {
    const mid = { phase: "resolution", round: game.round, step: "guess", winner: null, caught: true };
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify(mid));
    expect(loadGame()).toEqual(mid);
  });

  it("lädt eine Auflösung aus v1.3 (ohne Schritt) als abgeschlossen", () => {
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify({ phase: "resolution", round: game.round }));
    expect(loadGame()).toEqual({ phase: "resolution", round: game.round, step: "done", winner: null, caught: null });
  });

  it("verwirft einen unbekannten Auflösungs-Schritt", () => {
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify({ phase: "resolution", round: game.round, step: "?" }));
    expect(loadGame()).toBeNull();
  });

  it("lädt eine Hinweisrunde und verwirft einen ungültigen Index", () => {
    const clues = { phase: "clues", round: game.round, index: 2 };
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify(clues));
    expect(loadGame()).toEqual(clues);
    localStorage.setItem("impostor-nba:v1:game", JSON.stringify({ ...clues, index: 3 }));
    expect(loadGame()).toBeNull();
  });

  it("verwirft Einstellungen mit unbekanntem Modus", () => {
    localStorage.setItem("impostor-nba:v1:settings", JSON.stringify({ ...settings, mode: "unbekannt" }));
    expect(loadSettings()).toBeNull();
  });

  it("verwirft used-Einträge, die keine Listen sind", () => {
    localStorage.setItem("impostor-nba:v1:used", JSON.stringify({ "stars": ["Nowitzki"], "legenden": "Nowitzki", x: [1] }));
    expect(loadUsed()).toEqual({ "stars": ["Nowitzki"] });
  });

  it("übersteht einen werfenden localStorage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blockiert");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blockiert");
    });
    expect(loadSettings()).toBeNull();
    expect(loadGame()).toBeNull();
    expect(loadUsed()).toEqual({});
    expect(() => saveGame(game)).not.toThrow();
  });
});

describe("Gruppen speichern", () => {
  const group = {
    id: "g1",
    name: "Freitagsrunde",
    members: [
      { id: "m1", name: "Anna" },
      { id: "m2", name: "Ben" },
    ],
    selected: ["m2", "m1"],
    evening: 2,
  };

  it("speichert und lädt Gruppen", () => {
    saveGroups([group]);
    expect(loadGroups()).toEqual([group]);
  });

  it("liefert ohne gespeicherte Gruppen eine leere Liste", () => {
    expect(loadGroups()).toEqual([]);
  });

  it("verwirft kaputte Gruppen und Auswahl-IDs, die es nicht mehr gibt", () => {
    localStorage.setItem(
      "impostor-nba:v1:groups",
      JSON.stringify([group, { id: "g2", name: 5 }, { ...group, id: "g3", selected: ["m1", "weg"] }]),
    );
    expect(loadGroups()).toEqual([group, { ...group, id: "g3", selected: ["m1"] }]);
  });
});

describe("Statistik speichern", () => {
  const record = {
    roundId: "r1",
    evening: 1,
    at: "2026-10-26T20:00:00.000Z",
    mode: "stars" as const,
    players: ["a", "b", "c"],
    impostors: ["a"],
    starter: "b",
    winner: "crew" as const,
    caught: true,
  };

  it("hängt Runden pro Gruppe an und speichert dieselbe Runde nur einmal", () => {
    appendRecord("g1", record);
    appendRecord("g1", record);
    appendRecord("g1", { ...record, roundId: "r2" });
    appendRecord("g2", record);
    expect(loadStats("g1").map((r) => r.roundId)).toEqual(["r1", "r2"]);
    expect(loadStats("g2")).toHaveLength(1);
  });

  it("löscht die Statistik einer Gruppe", () => {
    appendRecord("g1", record);
    clearStats("g1");
    expect(loadStats("g1")).toEqual([]);
  });

  it("verwirft kaputte Einträge", () => {
    localStorage.setItem("impostor-nba:v1:stats:g1", JSON.stringify([record, { roundId: 5 }]));
    expect(loadStats("g1")).toEqual([record]);
  });
});

describe("NBA-Speicher", () => {
  it("schreibt sämtliche Daten einschließlich Statistik unter impostor-nba", () => {
    saveSettings(settings);
    saveGame(game);
    saveUsed({ stars: ["Nowitzki"] });
    saveGroups([]);
    appendRecord("g1", { roundId: "r1", evening: 1, at: "2026-10-27T20:00:00Z", mode: "teams",
      players: ["a", "b", "c"], impostors: ["a"], starter: "b", winner: null, caught: null });
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    expect(keys).toHaveLength(5);
    expect(keys.every((key) => key?.startsWith("impostor-nba:"))).toBe(true);
    expect(keys).toContain("impostor-nba:v1:stats:g1");
  });
});
