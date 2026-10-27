import type { Club, ClubExtras, ClubHints, Entry, Footballer, ModeId, PlayerExtras, Tag, Team, Tier, Tip } from "./types";

export const MODES: { id: ModeId; label: string; hasDifficulty: boolean }[] = [
  { id: "alle", label: "⚽ Alle Fußballer", hasDifficulty: true },
  { id: "bundesliga", label: "🇩🇪 Bundesliga", hasDifficulty: false },
  { id: "bvb", label: "🟡 BVB", hasDifficulty: false },
  { id: "cl-legenden", label: "🏆 CL-Legenden", hasDifficulty: false },
  { id: "wm-legenden", label: "🌍 WM-Legenden", hasDifficulty: false },
  { id: "fifa-icons", label: "🎮 FIFA Icons", hasDifficulty: false },
  { id: "vereine-de", label: "🏟️ Vereine Bundesliga", hasDifficulty: false },
  { id: "vereine-int", label: "🌐 Alle Vereine", hasDifficulty: false },
];

/** Kommen weniger Spieler eines Landes im Topf vor, verrät die Nation als Tipp zu viel. */
const MIN_SAME_NATION = 5;
const CLUB_HINT_KEYS: (keyof ClubHints)[] = ["region", "color", "league", "character", "success", "crest"];
/** Zusatz-Kategorien der Spieler und ihr Konflikt-Slot (siehe `Tip`). */
const PLAYER_EXTRA_SLOTS: [keyof PlayerExtras, string][] = [
  ["continent", "herkunft"],
  ["league", "liga"],
  ["playStyle", "spielart"],
  ["trait", "eigenschaft"],
  ["moment", "erfolg"],
  ["competition", "erfolg"],
  ["title", "erfolg"],
  ["hair", "frisur"],
  ["look", "aussehen"],
  ["era", "zeit"],
  ["build", "koerperbau"],
  ["foot", "fuss"],
  ["careerType", "karriere"],
  ["shirtNumber", "nummer"],
  ["status", "zeit"],
  ["afterCareer", "zeit"],
  ["bundesliga", "liga"],
  ["transfer", "transfer"],
];
const PLAYER_SLOTS = ["herkunft", "position", ...PLAYER_EXTRA_SLOTS.map(([, slot]) => slot)];
const CLUB_SLOTS = [
  "ort", "farbe", "ort", "charakter", "erfolg", "wappen", // region, color, league, character, success, crest
  "stadion", "gruendung", "ort", "derby", "sponsor", "maskottchen",
];
const CLUB_EXTRA_KEYS: (keyof ClubExtras)[] = ["stadium", "founded", "cityType", "derby", "sponsor", "mascot"];

const TEAMS: Record<string, Team> = {
  Torwart: "Tor",
  Innenverteidiger: "Abwehr",
  Außenverteidiger: "Abwehr",
  "Defensives Mittelfeld": "Mittelfeld",
  "Zentrales Mittelfeld": "Mittelfeld",
  "Offensives Mittelfeld": "Mittelfeld",
  Flügelspieler: "Angriff",
  Stürmer: "Angriff",
};

const toTips = (row: (string | null)[], slots: string[]): Tip[] =>
  row.flatMap((value, c) => (value ? [{ slot: slots[c], value }] : []));

const isText = (h: string | null | undefined): h is string => Boolean(h);

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

/**
 * Behält pro Spalte (Kategorie) nur Werte, die mindestens `min` Einträge im Topf teilen
 * (sonst verraten sie den Begriff) und nicht alle (sonst sagen sie nichts).
 */
function sharedOnly(rows: (string | null | undefined)[][], min: (column: number) => number): (string | null)[][] {
  const columns = rows[0]?.length ?? 0;
  const counts = Array.from({ length: columns }, (_, c) => countBy(rows, (row) => row[c] ?? ""));
  return rows.map((row) =>
    row.map((value, c) => {
      if (!value) return null;
      const n = counts[c].get(value) ?? 0;
      return n >= min(c) && n < rows.length ? value : null;
    }),
  );
}

function playerEntries(players: Footballer[]): Entry[] {
  const nations = countBy(players, (p) => p.hints.nation);
  // Spalte 0 = Nation (strengere Grenze), danach Position und die Zusatz-Kategorien
  const all = sharedOnly(
    players.map((p) => [p.hints.nation, p.hints.position, ...PLAYER_EXTRA_SLOTS.map(([k]) => p.extras?.[k])]),
    (c) => (c === 0 ? MIN_SAME_NATION : 2),
  );
  return players.map(({ name, hints }, i) => {
    const nation = (nations.get(hints.nation) ?? 0) >= MIN_SAME_NATION ? hints.nation : null;
    return {
      name,
      hints: [nation, hints.position, hints.special].filter(isText),
      allHints: toTips(all[i], PLAYER_SLOTS),
      team: TEAMS[hints.position],
    };
  });
}

/**
 * Vereins-Tipps nur, wenn mindestens zwei Vereine im Topf sie teilen (sonst verraten sie den
 * Verein) und nicht alle (sonst sagen sie nichts, z. B. „Bundesliga“ im Bundesliga-Modus).
 */
function clubEntries(clubs: Club[]): Entry[] {
  const all = sharedOnly(
    clubs.map((c) => [...CLUB_HINT_KEYS.map((k) => c.hints[k]), ...CLUB_EXTRA_KEYS.map((k) => c.extras?.[k])]),
    () => 2,
  );
  return clubs.map(({ name }, i) => ({
    name,
    hints: all[i].slice(0, CLUB_HINT_KEYS.length).filter(isText),
    allHints: toTips(all[i], CLUB_SLOTS),
  }));
}

const withTag = (players: Footballer[], tag: Tag) => players.filter((p) => p.tags.includes(tag));

/** Liefert den Topf an Begriffen für einen Modus. Die Schwierigkeit wirkt nur bei "alle". */
export function poolFor(mode: ModeId, difficulty: Tier, players: Footballer[], clubs: Club[]): Entry[] {
  switch (mode) {
    case "alle":
      return playerEntries(players.filter((p) => p.tier <= difficulty));
    case "bundesliga":
      return playerEntries(withTag(players, "bundesliga"));
    case "bvb":
      return playerEntries(withTag(players, "bvb"));
    case "cl-legenden":
      return playerEntries(withTag(players, "cl-legende"));
    case "wm-legenden":
      return playerEntries(withTag(players, "wm-legende"));
    case "fifa-icons":
      return playerEntries(withTag(players, "fifa-icon"));
    case "vereine-de":
      return clubEntries(clubs.filter((c) => c.region === "de"));
    case "vereine-int":
      return clubEntries(clubs.filter((c) => c.inAllClubs));
  }
}

/** Schlüssel, unter dem die schon gespielten Begriffe eines Topfs gespeichert werden. */
export function poolKey(mode: ModeId, difficulty: Tier): string {
  return mode === "alle" ? `alle-${difficulty}` : mode;
}
