import { describe, expect, it } from "vitest";
import clubsJson from "../src/data/clubs.json";
import playersJson from "../src/data/players.json";
import { MODES, poolFor } from "../src/game/modes";
import type { Club, Footballer, Tier } from "../src/game/types";

const players = playersJson as Footballer[];
const clubs = clubsJson as Club[];
const TAGS = ["bundesliga", "cl-legende", "wm-legende", "fifa-icon", "bvb"];
const POSITIONS = [
  "Torwart",
  "Innenverteidiger",
  "Außenverteidiger",
  "Defensives Mittelfeld",
  "Zentrales Mittelfeld",
  "Offensives Mittelfeld",
  "Flügelspieler",
  "Stürmer",
];

const CLUB_VALUES = {
  color: ["Rot", "Blau", "Weiß", "Schwarz", "Gelb", "Grün", "Orange", "Lila"],
  league: [
    "Bundesliga",
    "Premier League",
    "LaLiga",
    "Serie A",
    "Ligue 1",
    "Eredivisie",
    "Liga Portugal",
    "Süper Lig",
    "Scottish Premiership",
    "Österreichische Bundesliga",
  ],
  character: [
    "Traditionsverein",
    "Werksklub",
    "Großklub",
    "Kultklub",
    "Investorenklub",
    "Ausbildungsverein",
    "Arbeiterklub",
    "Stimmungshochburg",
  ],
  success: ["Champions-League-Sieger", "Europapokalsieger", "Meister", "Pokalsieger", "noch nie Meister"],
  crest: [
    "Tier im Wappen",
    "Stern im Wappen",
    "Buchstaben im Wappen",
    "Krone im Wappen",
    "Kreuz im Wappen",
    "Kreis-Wappen",
  ],
};

const PLAYER_EXTRA_VALUES: Record<string, string[] | RegExp | "frei"> = {
  continent: ["Europa", "Südamerika", "Nordamerika", "Afrika", "Asien", "Ozeanien"],
  league: [
    "Bundesliga", "Premier League", "LaLiga", "Serie A", "Ligue 1", "Eredivisie", "Liga Portugal", "Süper Lig",
    "Scottish Premiership", "MLS", "Saudi Pro League", "Brasilianische Liga", "Argentinische Liga", "andere Liga",
  ],
  playStyle: "frei",
  trait: "frei",
  moment: [
    "wichtiges WM-Tor", "wichtiges EM-Tor", "Finaltor", "Last-Minute-Tor", "Elfmeter-Held",
    "Hattrick in großem Spiel", "Traumtor", "Platzverweis in großem Spiel",
  ],
  competition: [
    "WM", "EM", "Champions League", "Europa League", "Copa América", "Afrika-Cup", "Asienmeisterschaft",
    "Gold Cup", "Olympia", "nationale Meisterschaft", "nationaler Pokal",
  ],
  title: [
    "Weltmeister", "Europameister", "Champions-League-Sieger", "Copa-América-Sieger", "Afrika-Cup-Sieger",
    "Ballon d'Or", "Meister", "Pokalsieger", "keine großen Titel",
  ],
  hair: [
    "blond", "dunkle Haare", "rote Haare", "graue Haare", "Glatze", "Locken", "lange Haare", "Kurzhaarschnitt",
    "Irokese", "gefärbte Haare",
  ],
  look: ["Bart", "Tattoos", "Stirnband", "Brille"],
  era: ["1950er", "1960er", "1970er", "1980er", "1990er", "2000er", "2010er", "2020er"],
  build: ["klein und wendig", "groß gewachsen", "kräftig", "schlank", "durchschnittlich"],
  foot: ["Linksfuß", "Rechtsfuß", "beidfüßig"],
  careerType: ["Vereinstreue", "Wandervogel", "Spätstarter", "Wunderkind", "Karriere im Ausland"],
  shirtNumber: /^trug die \d{1,2}$/,
  status: ["aktiv", "Karriere beendet"],
  afterCareer: ["Trainer", "TV-Experte", "Funktionär", "Unternehmer"],
  bundesliga: ["spielte in der Bundesliga", "nie in der Bundesliga"],
  transfer: ["Rekordtransfer", "teurer Transfer", "ablösefrei gewechselt", "Eigengewächs", "Schnäppchen"],
};

const CLUB_EXTRA_VALUES: Record<string, string[] | RegExp> = {
  stadium: ["großes Stadion", "mittelgroßes Stadion", "kleines Stadion"],
  founded: /^(18|19|20)\d0er$/,
  cityType: ["Großstadt", "Kleinstadt", "Hauptstadt", "Industriestadt"],
  derby: ["hat ein großes Derby", "kein großes Derby"],
  sponsor: [
    "Auto", "Getränke", "Airline", "Versicherung", "Telekommunikation", "Bank", "Energie", "Wettanbieter",
    "Technik", "Online-Handel", "Reisen", "Andere",
  ],
  mascot: ["Tier-Maskottchen", "Figur-Maskottchen", "kein bekanntes Maskottchen"],
};

function allowed(rule: string[] | RegExp | "frei", value: string): boolean {
  if (rule === "frei") return value.trim().length > 0 && !/\d/.test(value);
  return Array.isArray(rule) ? rule.includes(value) : rule.test(value);
}

const words = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);

/** Ein Tipp verrät den Namen, wenn ein Wort im anderen steckt (z. B. „Hamburg“ in „Hamburger SV“). */
function leaks(name: string, hint: string): boolean {
  const nameWords = words(name);
  return words(hint).some((h) => nameWords.some((n) => n.includes(h) || h.includes(n)));
}

function duplicates(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((n) => {
    const key = n.trim().toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

describe("players.json", () => {
  it("hat keine doppelten oder leeren Namen", () => {
    expect(duplicates(players.map((p) => p.name))).toEqual([]);
    expect(players.filter((p) => p.name.trim() === "")).toEqual([]);
  });

  it("hat nur gültige Stufen und Tags", () => {
    const invalid = players.filter((p) => ![1, 2, 3].includes(p.tier) || !p.tags.every((t) => TAGS.includes(t)));
    expect(invalid).toEqual([]);
  });

  it("hat für jeden Spieler Nation und gültige Position", () => {
    const invalid = players.filter(
      (p) =>
        !p.hints?.nation?.trim() ||
        !POSITIONS.includes(p.hints.position) ||
        (p.hints.special !== null && !p.hints.special.trim()),
    );
    expect(invalid.map((p) => p.name)).toEqual([]);
  });

  it("hat für jeden Spieler eine Besonderheit ohne Jahreszahlen oder Daten", () => {
    expect(players.filter((p) => !p.hints.special || /\d/.test(p.hints.special)).map((p) => p.name)).toEqual([]);
  });

  it("verrät in keinem Tipp den Spielernamen", () => {
    const leaking = players.flatMap((p) =>
      [p.hints.nation, p.hints.special ?? ""].filter((h) => leaks(p.name, h)).map((h) => `${p.name}: ${h}`),
    );
    expect(leaking).toEqual([]);
  });

  it("erreicht die Mindestgrößen", () => {
    expect(players.filter((p) => p.tier === 1).length).toBeGreaterThanOrEqual(60);
    expect(players.filter((p) => p.tags.includes("bundesliga")).length).toBeGreaterThanOrEqual(150);
    expect(players.filter((p) => p.tags.includes("cl-legende")).length).toBeGreaterThanOrEqual(50);
    expect(players.filter((p) => p.tags.includes("wm-legende")).length).toBeGreaterThanOrEqual(50);
    expect(players.filter((p) => p.tags.includes("fifa-icon")).length).toBeGreaterThanOrEqual(120);
    expect(players.filter((p) => p.tags.includes("bvb")).length).toBeGreaterThanOrEqual(40);
  });
});

describe("Tipps für die Runde, in der alle Impostor sind", () => {
  it("hat für jeden Spieler alle 18 Zusatzfelder mit erlaubten Werten", () => {
    const invalid = players.flatMap((p) =>
      Object.entries(PLAYER_EXTRA_VALUES)
        .filter(([key, rule]) => {
          const value = (p.extras as Record<string, string | null> | undefined)?.[key];
          return value === undefined || (value !== null && !allowed(rule, value));
        })
        .map(([key]) => `${p.name}.${key}: ${(p.extras as Record<string, unknown> | undefined)?.[key]}`),
    );
    expect(invalid).toEqual([]);
  });

  it("hat für jeden Spieler mindestens 14 von 20 Kategorien", () => {
    const thin = players.filter((p) => 2 + Object.values(p.extras ?? {}).filter(Boolean).length < 14);
    expect(thin.map((p) => p.name)).toEqual([]);
  });

  it("hat für jeden Verein mindestens 10 von 12 Kategorien mit erlaubten Werten", () => {
    const invalid = clubs.flatMap((c) =>
      Object.entries(CLUB_EXTRA_VALUES)
        .filter(([key, rule]) => {
          const value = (c.extras as Record<string, string | null> | undefined)?.[key];
          return value === undefined || (value !== null && !allowed(rule, value));
        })
        .map(([key]) => `${c.name}.${key}`),
    );
    expect(invalid).toEqual([]);
    expect(clubs.filter((c) => 6 + Object.values(c.extras ?? {}).filter(Boolean).length < 10).map((c) => c.name)).toEqual([]);
  });

  it("verrät in keinem Zusatz-Tipp den Namen", () => {
    const leaking = [...players, ...clubs].flatMap((e) =>
      Object.values(e.extras ?? {})
        .filter((v): v is string => typeof v === "string" && leaks(e.name, v))
        .map((v) => `${e.name}: ${v}`),
    );
    expect(leaking).toEqual([]);
  });
});

describe("clubs.json", () => {
  it("hat keine doppelten oder leeren Namen und gültige Regionen", () => {
    expect(duplicates(clubs.map((c) => c.name))).toEqual([]);
    expect(clubs.filter((c) => c.name.trim() === "" || !["de", "int"].includes(c.region))).toEqual([]);
  });

  it("hat für jeden Verein eine Region und nur Werte aus den festen Listen", () => {
    const invalid = clubs.filter(
      (c) =>
        !c.hints?.region?.trim() ||
        (Object.keys(CLUB_VALUES) as (keyof typeof CLUB_VALUES)[]).some((key) => !CLUB_VALUES[key].includes(c.hints[key])),
    );
    expect(invalid.map((c) => c.name)).toEqual([]);
  });

  it("verrät mit der Region nicht den Vereinsnamen", () => {
    expect(clubs.filter((c) => leaks(c.name, c.hints.region)).map((c) => `${c.name}: ${c.hints.region}`)).toEqual([]);
  });

  it("hat 23 deutsche und 44 internationale Vereine", () => {
    expect(clubs.filter((c) => c.region === "de")).toHaveLength(23);
    expect(clubs.filter((c) => c.region === "int")).toHaveLength(44);
  });

  it("nimmt alle internationalen und 17 Bundesliga-Vereine in „Alle Vereine“ auf", () => {
    expect(clubs.filter((c) => c.region === "int" && !c.inAllClubs)).toEqual([]);
    expect(
      clubs.filter((c) => c.region === "de" && !c.inAllClubs).map((c) => c.name).sort(),
    ).toEqual(["1. FC Heidenheim", "1. FC Nürnberg", "FC Augsburg", "Fortuna Düsseldorf", "Hannover 96", "VfL Bochum"]);
  });
});

describe("Spielmodi", () => {
  const cases = MODES.flatMap((m) =>
    m.hasDifficulty ? ([1, 2, 3] as Tier[]).map((d) => [m.id, d] as const) : [[m.id, 1 as Tier] as const],
  );
  it.each(cases)("%s (Stufe %i) hat mindestens 20 Einträge", (mode, difficulty) => {
    expect(poolFor(mode, difficulty, players, clubs).length).toBeGreaterThanOrEqual(20);
  });
});
