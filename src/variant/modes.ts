import playersJson from "../data/players.json";
import teamsJson from "../data/teams.json";
import { countBy, isText, sharedOnly, toTips } from "../game/tips";
import type { Entry, ModeOption, PoolOptions, Tier } from "../game/types";
import type { NbaPlayer, NbaTeam, PlayerExtras, PositionGroup, Tag, TeamExtras, TeamHints } from "./types";

export type ModeId = "stars" | "legenden" | "alle" | "teams";

export const MODES: ModeOption<ModeId>[] = [
  { id: "stars", label: "⭐ Aktuelle Stars", hasDifficulty: false, hasCasual: true },
  { id: "legenden", label: "👑 Legenden", hasDifficulty: false, hasCasual: true },
  {
    id: "alle", label: "🏀 Alle NBA-Spieler", hasDifficulty: false, hasCasual: true,
    filters: [
      { id: "2010-heute", label: "2010–heute" },
      { id: "2000er", label: "2000er" },
      { id: "90er", label: "90er" },
      { id: "80er", label: "80er" },
      { id: "70er-frueher", label: "70er u. früher" },
    ],
  },
  { id: "teams", label: "🏟️ NBA-Teams", hasDifficulty: false },
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
  "conference", "conference", "farbe", "ort", "erfolg", "logo", // conference, division, color, region, success, logo
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

function playerEntries(players: NbaPlayer[]): Entry[] {
  const candidates = players.map(({ hints, extras }) => [...new Set([
    hints.nation === "USA" ? "US-Amerikaner" : "kein US-Amerikaner",
    ...(extras?.continent === "Europa" ? ["Europäer"] : []),
    POSITION_GROUPS[hints.position],
    ...hints.tips,
  ])]);
  const counts = countBy(candidates.flat(), (hint) => hint);
  // Spalte 0 = Nation (strengere Grenze), danach Position und die Zusatz-Kategorien
  const all = sharedOnly(
    players.map((p) => [p.hints.nation, p.hints.position, ...PLAYER_EXTRA_SLOTS.map(([k]) => p.extras?.[k])]),
    (c) => (c === 0 ? MIN_SAME_NATION : 2),
  );
  return players.map(({ name, hints }, i) => {
    return {
      name,
      hints: candidates[i].filter((hint) => (counts.get(hint) ?? 0) >= 2),
      allHints: toTips(all[i], PLAYER_SLOTS),
      group: POSITION_GROUPS[hints.position],
    };
  });
}

/**
 * Team-Tipps nur, wenn mindestens zwei Teams im Topf sie teilen (sonst verraten sie das Team)
 * und nicht alle (sonst sagen sie nichts).
 */
function teamEntries(teams: NbaTeam[]): Entry[] {
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

const ERA_FILTERS: Record<string, string> = {
  "2010er": "2010-heute", "2020er": "2010-heute", "2000er": "2000er",
  "90er": "90er", "80er": "80er", "70er": "70er-frueher", "60er": "70er-frueher", "50er": "70er-frueher",
};

/** Liefert den Topf an Begriffen für einen Modus. Schwierigkeitsstufen gibt es (noch) nicht. */
export function buildPool(
  mode: ModeId, _difficulty: Tier, players: NbaPlayer[], teams: NbaTeam[], options?: PoolOptions,
): Entry[] {
  const selectedMode = MODES.find((m) => m.id === mode);
  const excluded = new Set(selectedMode?.filters?.map((f) => f.id).filter((id) => options?.excludedFilters.includes(id)));
  const selectedPlayers = players.filter((p) => {
    if (selectedMode?.hasCasual && options?.casual && p.casual !== true) return false;
    const filter = p.extras?.era ? ERA_FILTERS[p.extras.era] : undefined;
    return !filter || !excluded.has(filter);
  });
  switch (mode) {
    case "stars":
      return playerEntries(withTag(selectedPlayers, "star"));
    case "legenden":
      return playerEntries(withTag(selectedPlayers, "legende"));
    case "alle": {
      const seen = new Set<string>();
      return playerEntries(selectedPlayers.filter(({ name }) => {
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      }));
    }
    case "teams":
      return teamEntries(teams);
  }
}

/** Schlüssel, unter dem die schon gespielten Begriffe eines Topfs gespeichert werden. */
export function poolKey(mode: ModeId, _difficulty: Tier): string {
  return mode;
}

/** Liefert den Topf mit den eingetragenen Begriffen. */
export function poolFor(mode: ModeId, difficulty: Tier, options?: PoolOptions): Entry[] {
  return buildPool(mode, difficulty, playersJson as NbaPlayer[], teamsJson as NbaTeam[], options);
}

/**
 * „Alle sind Impostor“ nur, solange jeder eine eigene Tipp-Kategorie bekommen kann
 * (Spieler haben 22 Kategorien, Teams 12 – mit Puffer, damit es nicht herleitbar wird).
 */
export function allImpostorsMax(mode: ModeId): number {
  return mode === "teams" ? 6 : 10;
}
