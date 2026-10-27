import { describe, expect, it } from "vitest";
import playersJson from "../../src/data/players.json";
import teamsJson from "../../src/data/teams.json";
import type { NbaPlayer, NbaTeam, PlayerExtras } from "../../src/variant/types";

const players = playersJson as NbaPlayer[];
const teams = teamsJson as NbaTeam[];
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const PLAYER_VALUES: Partial<Record<keyof PlayerExtras, string[]>> = {
  continent: ["Europa", "Nordamerika", "Südamerika", "Afrika", "Asien", "Ozeanien"],
  conference: ["meist im Westen", "meist im Osten"],
  hand: ["Linkshänder", "Rechtshänder"], status: ["aktiv", "Karriere beendet"],
  draft: ["Nummer-1-Pick", "Top-3-Pick", "Top-10-Pick", "Erstrunden-Pick", "Zweitrunden-Pick", "undrafted"],
};
const PLAYER_EXTRA_KEYS: (keyof PlayerExtras)[] = [
  "continent", "conference", "team", "playStyle", "trait", "moment", "award", "title", "hair", "look",
  "era", "build", "hand", "careerType", "shirtNumber", "status", "afterCareer", "draft", "college", "transfer",
];
const DIVISIONS: Record<string, string> = {
  "Atlantic Division": "Eastern Conference", "Central Division": "Eastern Conference", "Southeast Division": "Eastern Conference",
  "Northwest Division": "Western Conference", "Pacific Division": "Western Conference", "Southwest Division": "Western Conference",
};
const TEAM_VALUES = {
  conference: ["Western Conference", "Eastern Conference"], division: Object.keys(DIVISIONS),
  color: ["Rot", "Blau", "Grün", "Lila", "Gelb", "Orange", "Schwarz", "Weinrot", "Türkis"],
  region: ["Westküste", "Ostküste", "Süden", "Mittlerer Westen", "Texas", "Südwesten & Rockies", "Kanada"],
  success: ["mehrfacher NBA-Champion", "einmal NBA-Champion", "noch nie NBA-Champion"],
  logo: ["Tier im Logo", "Basketball im Logo", "Figur im Logo", "Schriftzug-Logo", "Symbol im Logo"],
};
const TEAM_EXTRA_VALUES = {
  cityType: ["Millionenstadt", "Großstadt", "kleinerer Markt"], rival: ["hat eine berühmte Rivalität"],
  mascot: ["Tier-Maskottchen", "Fantasiefigur als Maskottchen", "kein Maskottchen"],
  relocated: ["ist schon einmal umgezogen"],
  nameType: ["Tiername", "Name aus der Stadtgeschichte", "Name nach Natur oder Wetter", "Name nach Musik oder Kultur", "Name nach Beruf oder Leuten"],
};

describe("players.json", () => {
  it("ist eine Liste und darf vorerst leer sein", () => {
    expect(Array.isArray(playersJson)).toBe(true);
  });
  it("hat eindeutige, nicht leere Namen und gültige Tags", () => {
    expect(new Set(players.map((p) => p.name.trim().toLowerCase())).size).toBe(players.length);
    for (const p of players) {
      expect(text(p.name)).toBe(true);
      expect(Array.isArray(p.tags)).toBe(true);
      expect(p.tags.length).toBeGreaterThan(0);
      expect(new Set(p.tags).size).toBe(p.tags.length);
      for (const tag of p.tags) expect(["star", "legende"]).toContain(tag);
    }
  });
  it("hat Nation, eine der fünf Positionen und einen optionalen Spezialtipp", () => {
    for (const p of players) {
      expect(Object.keys(p.hints).sort()).toEqual(["nation", "position", "special"]);
      expect(text(p.hints.nation)).toBe(true);
      expect(["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"]).toContain(p.hints.position);
      expect(p.hints.special === null || text(p.hints.special)).toBe(true);
    }
  });
  it("prüft alle Zusatzkategorien und ihre erlaubten Werte", () => {
    for (const p of players) {
      if (p.extras === undefined) continue;
      expect(Object.keys(p.extras).sort()).toEqual([...PLAYER_EXTRA_KEYS].sort());
      for (const key of PLAYER_EXTRA_KEYS) {
        const value = p.extras[key];
        if (value === null) continue;
        expect(text(value), p.name + ": " + key).toBe(true);
        if (PLAYER_VALUES[key]) expect(PLAYER_VALUES[key]).toContain(value);
      }
    }
  });
});

describe("teams.json", () => {
  it("hat genau 30 Teams mit eindeutigen, nicht leeren Namen", () => {
    expect(teams).toHaveLength(30);
    expect(new Set(teams.map((t) => t.name.trim().toLowerCase())).size).toBe(30);
    for (const t of teams) expect(text(t.name)).toBe(true);
  });
  it("verwendet für alle sechs Tipps nur erlaubte Werte", () => {
    for (const t of teams) {
      expect(Object.keys(t.hints).sort()).toEqual(Object.keys(TEAM_VALUES).sort());
      for (const key of Object.keys(TEAM_VALUES) as (keyof typeof TEAM_VALUES)[]) {
        expect(TEAM_VALUES[key], t.name + ": " + key).toContain(t.hints[key]);
      }
    }
  });
  it("hat je 15 Teams pro Conference und je fünf pro passender Division", () => {
    for (const conference of TEAM_VALUES.conference) expect(teams.filter((t) => t.hints.conference === conference)).toHaveLength(15);
    for (const [division, conference] of Object.entries(DIVISIONS)) {
      const members = teams.filter((t) => t.hints.division === division);
      expect(members).toHaveLength(5);
      expect(members.every((t) => t.hints.conference === conference)).toBe(true);
    }
  });
  it("prüft Gründungsjahrzehnt und alle sechs Zusatzkategorien", () => {
    for (const t of teams) {
      expect(t.extras, t.name).toBeDefined();
      expect(Object.keys(t.extras!).sort()).toEqual(["founded", ...Object.keys(TEAM_EXTRA_VALUES)].sort());
      const founded = t.extras!.founded;
      if (founded !== null) expect(founded).toMatch(/^(19|20)\d0er$/);
      for (const key of Object.keys(TEAM_EXTRA_VALUES) as (keyof typeof TEAM_EXTRA_VALUES)[]) {
        const value = t.extras![key];
        if (value !== null) expect(TEAM_EXTRA_VALUES[key], t.name + ": " + key).toContain(value);
      }
    }
  });
  it("zählt nur NBA-Titel, einschließlich der Thunder 2025 und früherer Standorte", () => {
    const success = (name: string) => teams.find((t) => t.name === name)?.hints.success;
    expect(success("Thunder")).toBe("mehrfacher NBA-Champion");
    expect(success("Kings")).toBe("einmal NBA-Champion");
    expect(success("Hawks")).toBe("einmal NBA-Champion");
    expect(success("Nets")).toBe("noch nie NBA-Champion");
    expect(success("Pacers")).toBe("noch nie NBA-Champion");
  });
});
