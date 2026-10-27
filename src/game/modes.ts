import type { Entry, ModeId, NbaPlayer, NbaTeam, PlayerExtras, PositionGroup, Tag, TeamExtras, TeamHints, Tip } from "./types";

export const MODES: { id: ModeId; label: string }[] = [
  { id: "stars", label: "⭐ Aktuelle Stars" },
  { id: "legenden", label: "👑 Legenden" },
  { id: "teams", label: "🏟️ NBA-Teams" },
];

/** Kommen weniger Spieler eines Landes im Topf vor, verrät die Nation als Tipp zu viel. */
const MIN_SAME_NATION = 5;
const TEAM_HINT_KEYS: (keyof TeamHints)[] = ["conference", "division", "color", "region", "success", "logo"];
/** Zusatz-Kategorien der Spieler und ihr Konflikt-Slot (siehe `Tip`). */
const PLAYER_EXTRA_SLOTS: [keyof PlayerExtras, string][] = [
  ["continent", "herkunft"],
  ["conference", "conference"],
  ["team", "team"],
  ["playStyle", "spielart"],
  ["trait", "eigenschaft"],
  ["moment", "erfolg"],
  ["award", "erfolg"],
  ["title", "erfolg"],
  ["hair", "frisur"],
  ["look", "aussehen"],
  ["era", "zeit"],
  ["build", "koerperbau"],
  ["hand", "hand"],
  ["careerType", "karriere"],
  ["shirtNumber", "nummer"],
  ["status", "zeit"],
  ["afterCareer", "zeit"],
  ["draft", "draft"],
  ["college", "college"],
  ["transfer", "transfer"],
];
const PLAYER_SLOTS = ["herkunft", "position", ...PLAYER_EXTRA_SLOTS.map(([, slot]) => slot)];
const TEAM_SLOTS = [
  "conference", "conference", "farbe", "ort", "erfolg", "logo",
  "gruendung", "ort", "rivale", "maskottchen", "geschichte", "name",
];
const TEAM_EXTRA_KEYS: (keyof TeamExtras)[] = ["founded", "cityType", "rival", "mascot", "relocated", "nameType"];

const POSITION_GROUPS: Record<string, PositionGroup> = {
  "Point Guard": "Guard",
  "Shooting Guard": "Guard",
  "Small Forward": "Forward",
  "Power Forward": "Forward",
  Center: "Center",
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

export function playerEntries(players: NbaPlayer[]): Entry[] {
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
      positionGroup: POSITION_GROUPS[hints.position],
    };
  });
}

/** Team-Tipps nur, wenn mindestens zwei Teams im Topf sie teilen und nicht alle. */
export function teamEntries(teams: NbaTeam[]): Entry[] {
  const all = sharedOnly(
    teams.map((t) => [...TEAM_HINT_KEYS.map((k) => t.hints[k]), ...TEAM_EXTRA_KEYS.map((k) => t.extras?.[k])]),
    () => 2,
  );
  return teams.map(({ name }, i) => ({
    name,
    hints: all[i].slice(0, TEAM_HINT_KEYS.length).filter(isText),
    allHints: toTips(all[i], TEAM_SLOTS),
  }));
}

const withTag = (players: NbaPlayer[], tag: Tag) => players.filter((p) => p.tags.includes(tag));

/** Liefert den Topf an Begriffen für einen Modus. */
export function poolFor(mode: ModeId, players: NbaPlayer[], teams: NbaTeam[]): Entry[] {
  switch (mode) {
    case "stars":
      return playerEntries(withTag(players, "star"));
    case "legenden":
      return playerEntries(withTag(players, "legende"));
    case "teams":
      return teamEntries(teams);
  }
}

/** Schlüssel, unter dem die schon gespielten Begriffe eines Topfs gespeichert werden. */
export function poolKey(mode: ModeId): string {
  return mode;
}

/** Größe jedes Topfs – leere Modi (noch keine Spieler eingetragen) sind nicht wählbar. */
export function poolSizes(players: NbaPlayer[], teams: NbaTeam[]): Record<ModeId, number> {
  return { stars: withTag(players, "star").length, legenden: withTag(players, "legende").length, teams: teams.length };
}

/** Erster Modus in MODES-Reihenfolge mit Begriffen; NBA-Teams sind immer gefüllt. */
export function firstPlayableMode(sizes: Record<ModeId, number>): ModeId {
  return MODES.find((m) => sizes[m.id] > 0)?.id ?? "teams";
}
