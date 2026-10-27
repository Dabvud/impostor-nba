import { describe, expect, it } from "vitest";
import { MODES, poolFor, poolKey } from "../../src/game/modes";
import type { Club, Entry, Footballer, PlayerExtras } from "../../src/game/types";

const players: Footballer[] = [
  { name: "A", tier: 1, tags: ["bundesliga", "bvb"], hints: { nation: "Land A", position: "Torwart", special: "Trick A" } },
  { name: "B", tier: 2, tags: ["cl-legende"], hints: { nation: "Land B", position: "Stürmer", special: null } },
  { name: "C", tier: 3, tags: ["wm-legende", "bundesliga", "fifa-icon"], hints: { nation: "Land C", position: "Stürmer", special: null } },
];
const club = (name: string, region: Club["region"], inAllClubs: boolean, h: string): Club => {
  const [r, color, league, character, success, crest] = h.split("|");
  return { name, region, inAllClubs, hints: { region: r, color, league, character, success, crest } };
};
const clubs: Club[] = [
  club("X", "de", true, "Region X|Rot|Liga X|Kultklub|Meister|Stern im Wappen"),
  club("Y", "int", true, "Region Y|Blau|Liga Y|Großklub|Pokalsieger|Kreuz im Wappen"),
  club("Z", "de", false, "Region Z|Grün|Liga Z|Werksklub|Meister|Tier im Wappen"),
];
/** Nur die normalen Tipps – die Tipps der Alle-Impostor-Runde prüfen eigene Tests. */
const normal = (entries: Entry[]) => entries.map(({ name, hints }) => ({ name, hints }));
const names = (mode: Parameters<typeof poolFor>[0], difficulty: 1 | 2 | 3 = 1) =>
  poolFor(mode, difficulty, players, clubs).map((e) => e.name);

describe("poolFor – Tipps für die Runde, in der alle Impostor sind", () => {
  const extras = (o: Partial<PlayerExtras>): PlayerExtras => ({
    continent: null, league: null, playStyle: null, trait: null, moment: null, competition: null, title: null,
    hair: null, look: null, era: null, build: null, foot: null, careerType: null, shirtNumber: null,
    status: null, afterCareer: null, bundesliga: null, transfer: null, ...o,
  });
  const p = (name: string, position: string, o: Partial<PlayerExtras>): Footballer => ({
    name, tier: 1, tags: [], hints: { nation: "Land " + name, position, special: null }, extras: extras(o),
  });
  const squad = [
    p("M", "Stürmer", { continent: "Südamerika", foot: "Linksfuß", era: "2010er", hair: "Glatze" }),
    p("R", "Stürmer", { continent: "Europa", foot: "Linksfuß", era: "2010er", hair: "blond" }),
    p("K", "Torwart", { continent: "Südamerika", foot: "Rechtsfuß", era: "2010er", hair: "Locken" }),
  ];

  it("sammelt geteilte Tipps mit ihrer Konfliktgruppe und den Mannschaftsteil", () => {
    const byName = Object.fromEntries(poolFor("alle", 1, squad, []).map((e) => [e.name, e]));
    expect(byName.M.allHints).toEqual([
      { slot: "position", value: "Stürmer" },
      { slot: "herkunft", value: "Südamerika" },
      { slot: "fuss", value: "Linksfuß" },
    ]);
    expect(byName.R.allHints).toEqual([
      { slot: "position", value: "Stürmer" },
      { slot: "fuss", value: "Linksfuß" },
    ]);
    expect(byName.K.allHints).toEqual([{ slot: "herkunft", value: "Südamerika" }]);
    expect([byName.M.team, byName.K.team]).toEqual(["Angriff", "Tor"]);
  });

  it("nimmt bei Vereinen auch Stadion, Gründungszeit und Co. dazu", () => {
    const c = (name: string, stadium: string, founded: string): Club => ({
      name, region: "de", inAllClubs: true,
      hints: { region: "R" + name, color: "C" + name, league: "L" + name, character: "X" + name, success: "S" + name, crest: "W" + name },
      extras: { stadium, founded, cityType: null, derby: null, sponsor: null, mascot: null },
    });
    const league = [c("A", "großes Stadion", "1900er"), c("B", "großes Stadion", "1910er"), c("D", "kleines Stadion", "1910er")];
    expect(poolFor("vereine-de", 1, [], league).map((e) => e.allHints)).toEqual([
      [{ slot: "stadion", value: "großes Stadion" }],
      [
        { slot: "stadion", value: "großes Stadion" },
        { slot: "gruendung", value: "1910er" },
      ],
      [{ slot: "gruendung", value: "1910er" }],
    ]);
  });
});

describe("poolFor", () => {
  it("wendet die Schwierigkeit bei 'alle' kumulativ an", () => {
    expect(names("alle", 1)).toEqual(["A"]);
    expect(names("alle", 2)).toEqual(["A", "B"]);
    expect(names("alle", 3)).toEqual(["A", "B", "C"]);
  });

  it("ignoriert die Schwierigkeit bei Bundesliga", () => {
    expect(names("bundesliga", 1)).toEqual(["A", "C"]);
    expect(names("bundesliga", 3)).toEqual(["A", "C"]);
  });

  it("filtert Legenden und Vereine", () => {
    expect(names("cl-legenden")).toEqual(["B"]);
    expect(names("wm-legenden")).toEqual(["C"]);
    expect(names("fifa-icons")).toEqual(["C"]);
    expect(names("bvb")).toEqual(["A"]);
    expect(names("vereine-de")).toEqual(["X", "Z"]);
    expect(names("vereine-int")).toEqual(["X", "Y"]);
  });

  it("liefert Name und die vorhandenen Tipps als Liste", () => {
    expect(normal(poolFor("alle", 2, players, clubs))).toEqual([
      { name: "A", hints: ["Torwart", "Trick A"] },
      { name: "B", hints: ["Stürmer"] },
    ]);
    // X und Z teilen nur „Meister“ – das trifft auf beide (alle) zu und fällt weg
    expect(normal(poolFor("vereine-de", 1, players, clubs))).toEqual([
      { name: "X", hints: [] },
      { name: "Z", hints: [] },
    ]);
  });

  it("nennt die Nation nur, wenn mindestens 5 Spieler im Topf aus ihr kommen", () => {
    const squad: Footballer[] = [
      ...["B1", "B2", "B3", "B4", "B5"].map((name) => ({
        name,
        tier: 1 as const,
        tags: [],
        hints: { nation: "Brasilien", position: "Stürmer", special: null },
      })),
      { name: "K1", tier: 1, tags: [], hints: { nation: "Südkorea", position: "Stürmer", special: null } },
    ];
    const pool = poolFor("alle", 1, squad, []);
    expect(pool.find((e) => e.name === "B1")?.hints).toEqual(["Brasilien", "Stürmer"]);
    expect(pool.find((e) => e.name === "K1")?.hints).toEqual(["Stürmer"]);
    expect(poolFor("alle", 1, squad.slice(1), []).find((e) => e.name === "B2")?.hints).toEqual(["Stürmer"]);
  });

  it("nennt Vereins-Tipps nur, wenn mindestens 2, aber nicht alle Vereine im Topf sie teilen", () => {
    const league: Club[] = [
      club("D", "de", true, "Ruhrpott|Gelb|Bundesliga|Traditionsverein|Champions-League-Sieger|Buchstaben im Wappen"),
      club("S", "de", true, "Ruhrpott|Blau|Bundesliga|Traditionsverein|Pokalsieger|Buchstaben im Wappen"),
      club("R", "int", true, "Österreich|Rot|Österreichische Bundesliga|Investorenklub|Meister|Tier im Wappen"),
      club("L", "de", true, "Rheinland|Rot|Bundesliga|Werksklub|Europapokalsieger|Kreuz im Wappen"),
    ];
    expect(normal(poolFor("vereine-int", 1, [], league))).toEqual([
      { name: "D", hints: ["Ruhrpott", "Bundesliga", "Traditionsverein", "Buchstaben im Wappen"] },
      { name: "S", hints: ["Ruhrpott", "Bundesliga", "Traditionsverein", "Buchstaben im Wappen"] },
      { name: "R", hints: ["Rot"] },
      { name: "L", hints: ["Rot", "Bundesliga"] },
    ]);
    // Bundesliga-Modus: „Bundesliga“ trifft auf alle zu und verrät nichts
    expect(poolFor("vereine-de", 1, [], league).map((e) => e.hints)).toEqual([
      ["Ruhrpott", "Traditionsverein", "Buchstaben im Wappen"],
      ["Ruhrpott", "Traditionsverein", "Buchstaben im Wappen"],
      [],
    ]);
  });
});

describe("poolKey", () => {
  it("enthält die Schwierigkeit nur bei 'alle'", () => {
    expect(poolKey("alle", 2)).toBe("alle-2");
    expect(poolKey("vereine-de", 3)).toBe("vereine-de");
    expect(poolKey("bvb", 2)).toBe("bvb");
  });
});

describe("MODES", () => {
  it("hat acht Modi mit exakten Labels, nur 'alle' mit Schwierigkeit", () => {
    expect(MODES).toEqual([
      { id: "alle", label: "⚽ Alle Fußballer", hasDifficulty: true },
      { id: "bundesliga", label: "🇩🇪 Bundesliga", hasDifficulty: false },
      { id: "bvb", label: "🟡 BVB", hasDifficulty: false },
      { id: "cl-legenden", label: "🏆 CL-Legenden", hasDifficulty: false },
      { id: "wm-legenden", label: "🌍 WM-Legenden", hasDifficulty: false },
      { id: "fifa-icons", label: "🎮 FIFA Icons", hasDifficulty: false },
      { id: "vereine-de", label: "🏟️ Vereine Bundesliga", hasDifficulty: false },
      { id: "vereine-int", label: "🌐 Alle Vereine", hasDifficulty: false },
    ]);
  });
});
