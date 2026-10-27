import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_NAME, MANIFEST_DESCRIPTION, QR_COLORS, RULES_SUBJECT, SHARE_TEXT, STORAGE_PREFIX, THEME_COLOR } from "../../src/variant/config";
import { appendRecord, clearStats, loadGame, loadGroups, loadSettings, loadStats, loadUsed, saveGame, saveGroups, saveSettings, saveUsed } from "../../src/storage";
import { settings } from "./fixtures";

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("NBA-Konfiguration", () => {
  it("verwendet NBA-Namen, Texte, Farben und einen eigenen Speicherpräfix", () => {
    expect({ APP_NAME, STORAGE_PREFIX, MANIFEST_DESCRIPTION, THEME_COLOR, SHARE_TEXT, RULES_SUBJECT, QR_COLORS }).toEqual({
      APP_NAME: "Impostor NBA",
      STORAGE_PREFIX: "impostor-nba",
      MANIFEST_DESCRIPTION: "NBA-Impostor für eure Runde – ein Handy, alle Spieler.",
      THEME_COLOR: "#0a1530",
      SHARE_TEXT: "Unser NBA-Impostor für die nächste Runde:",
      RULES_SUBJECT: "denselben NBA-Spieler oder dasselbe Team",
      QR_COLORS: { dark: "#0a1530", light: "#ffffff" },
    });
    // Beide Apps können auf derselben Domain laufen und dürfen sich keinen Speicher teilen.
    expect(STORAGE_PREFIX).not.toBe("impostor");
  });
});

describe("NBA-Speicherschlüssel", () => {
  const record = {
    roundId: "r1", evening: 1, at: "2026-10-27T20:00:00.000Z", mode: settings.mode,
    players: settings.names, impostors: ["Anna"], starter: "Ben", winner: "crew" as const, caught: true,
  };
  const keys = [
    "impostor-nba:v1:settings", "impostor-nba:v1:game", "impostor-nba:v1:used",
    "impostor-nba:v1:groups", "impostor-nba:v1:stats:g1",
  ];

  it("schreibt, liest und löscht ausschließlich unter impostor-nba:v1:", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    saveSettings(settings);
    saveGame({ phase: "setup" });
    saveUsed({ teams: ["Bulls"] });
    saveGroups([]);
    appendRecord("g1", record);
    expect(setItem.mock.calls.map(([key]) => key)).toEqual(keys);
    expect(setItem.mock.calls.every(([key]) => key.startsWith("impostor-nba:v1:"))).toBe(true);
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    expect(loadSettings()).toEqual(settings);
    expect(loadGame()).toEqual({ phase: "setup" });
    expect(loadUsed()).toEqual({ teams: ["Bulls"] });
    expect(loadGroups()).toEqual([]);
    expect(loadStats("g1")).toEqual([record]);
    expect(getItem.mock.calls.map(([key]) => key)).toEqual(keys);
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    clearStats("g1");
    expect(removeItem).toHaveBeenCalledExactlyOnceWith("impostor-nba:v1:stats:g1");
  });

  it("ignoriert und erhält vorhandene Daten der Fußball-App auf derselben Domain", () => {
    const football = {
      "impostor:v1:settings": { ...settings, mode: "alle" },
      "impostor:v1:game": { phase: "setup" },
      "impostor:v1:used": { alle: ["Fußballer A"] },
      "impostor:v1:groups": [],
      "impostor:v1:stats:g1": [{ ...record, mode: "alle" }],
    };
    for (const [key, value] of Object.entries(football)) localStorage.setItem(key, JSON.stringify(value));
    expect(loadSettings()).toBeNull();
    expect(loadGame()).toBeNull();
    expect(loadUsed()).toEqual({});
    expect(loadGroups()).toEqual([]);
    expect(loadStats("g1")).toEqual([]);
    saveSettings(settings);
    saveGame({ phase: "setup" });
    saveUsed({ teams: ["Bulls"] });
    saveGroups([]);
    appendRecord("g1", record);
    clearStats("g1");
    for (const [key, value] of Object.entries(football)) expect(localStorage.getItem(key)).toBe(JSON.stringify(value));
  });
});
