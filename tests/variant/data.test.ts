import { describe, expect, it } from "vitest";
import { buildPool } from "../../src/variant/modes";
import playersJson from "../../src/data/players.json";
import teamsJson from "../../src/data/teams.json";
import type { NbaPlayer, NbaTeam, PlayerExtras } from "../../src/variant/types";

const players = playersJson as NbaPlayer[];
const teams = teamsJson as NbaTeam[];
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const STYLES = [
  "Scorer", "Dreierschütze", "Spielmacher", "Verteidiger", "Dunker", "Rebounder", "Shotblocker",
  "Allrounder", "Athlet", "Mitteldistanz-Spezialist", "Post-Spieler",
];
const SUCCESS = ["NBA-Champion", "Finals-Teilnehmer", "Conference-Finalist"];
const ROLES = ["Teamlegende", "Franchise-Spieler", "Talent"];
const TIPS = [...STYLES, "All-Star", "All-NBA", ...SUCCESS, "Clutch-Moment", "bekannter Trade", "Verletzungspech", "Top-10-Pick", ...ROLES];
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
  it("hat Nation, eine der fünf Positionen und kuratierte Tipps aus dem festen Vokabular", () => {
    for (const p of players) {
      expect(Object.keys(p.hints).sort(), p.name).toEqual(["nation", "position", "tips"]);
      expect(text(p.hints.nation)).toBe(true);
      expect(["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"]).toContain(p.hints.position);
      expect(Array.isArray(p.hints.tips), p.name).toBe(true);
      expect(p.hints.tips.length, p.name).toBeGreaterThanOrEqual(2);
      expect(new Set(p.hints.tips).size, p.name).toBe(p.hints.tips.length);
      for (const tip of p.hints.tips) expect(TIPS, p.name).toContain(tip);
      const styles = p.hints.tips.filter((tip) => STYLES.includes(tip));
      expect(styles.length, p.name).toBeGreaterThanOrEqual(1);
      expect(styles.length, p.name).toBeLessThanOrEqual(2);
      expect(p.hints.tips.filter((tip) => SUCCESS.includes(tip)).length, p.name).toBeLessThanOrEqual(1);
      expect(p.hints.tips.filter((tip) => ROLES.includes(tip)).length, p.name).toBeLessThanOrEqual(1);
    }
  });
  it("bietet mit echten Daten jedem Star mindestens drei verschiedene, geteilte Tipps", () => {
    const pool = buildPool("stars", 1, players, teams);
    expect(pool.length).toBeGreaterThan(0);
    for (const entry of pool) {
      expect(entry.hints.length, entry.name).toBeGreaterThanOrEqual(3);
      expect(new Set(entry.hints).size, entry.name).toBe(entry.hints.length);
      for (const hint of entry.hints) {
        expect(pool.filter((other) => other.hints.includes(hint)).length, entry.name + ": " + hint).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it("vergibt Top-10-Pick vollständig und ausschließlich an Draftplätze eins bis zehn", () => {
    const top10 = ["Nummer-1-Pick", "Top-3-Pick", "Top-10-Pick"];
    for (const p of players) {
      expect(p.hints.tips.includes("Top-10-Pick"), p.name).toBe(top10.includes(p.extras?.draft ?? ""));
    }
    // Ältere Jahrgänge und die echte Grenze 10/11, nicht bloß junge Lottery-Spieler.
    for (const name of ["LeBron James", "Kevin Durant", "Stephen Curry", "Paul George", "CJ McCollum", "Mikal Bridges"]) {
      expect(players.find((p) => p.name === name)?.hints.tips, name).toContain("Top-10-Pick");
    }
    for (const name of ["Klay Thompson", "Myles Turner", "Shai Gilgeous-Alexander", "Tyrese Haliburton", "Nikola Jokić", "Austin Reaves"]) {
      expect(players.find((p) => p.name === name)?.hints.tips, name).not.toContain("Top-10-Pick");
    }
  });
  it("ersetzt die junge Rolle durch Talent bei denselben fünf Spielern", () => {
    expect(players.filter((p) => p.hints.tips.includes("Talent")).map((p) => p.name).sort()).toEqual([
      "Amen Thompson", "Brandon Miller", "Cooper Flagg", "Stephon Castle", "Victor Wembanyama",
    ]);
    expect(players.some((p) => p.hints.tips.includes("junger Star"))).toBe(false);
  });
  it("enthält die prägenden Trade- und Verletzungsbeispiele als normale Tipps", () => {
    const pool = buildPool("stars", 1, players, teams);
    for (const name of ["Luka Dončić", "Anthony Davis", "Kevin Durant", "Kawhi Leonard", "James Harden", "Karl-Anthony Towns", "Julius Randle", "Mikal Bridges"]) {
      expect(pool.find((p) => p.name === name)?.hints, name).toContain("bekannter Trade");
    }
    for (const name of ["Zion Williamson", "Joel Embiid", "Kawhi Leonard", "Damian Lillard", "Tyrese Haliburton", "Jayson Tatum", "Kyrie Irving", "Jamal Murray", "Dejounte Murray"]) {
      expect(pool.find((p) => p.name === name)?.hints, name).toContain("Verletzungspech");
    }
    // Weder ein beliebiger Trade noch ein beliebiger kurzer Ausfall genügen.
    expect(pool.find((p) => p.name === "Stephen Curry")?.hints).not.toContain("bekannter Trade");
    expect(pool.find((p) => p.name === "Aaron Gordon")?.hints).not.toContain("bekannter Trade");
    expect(pool.find((p) => p.name === "Mikal Bridges")?.hints).not.toContain("Verletzungspech");
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
