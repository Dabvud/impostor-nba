import type { Group } from "./game/groups";
import { MODES } from "./game/modes";
import type { UsedMap } from "./game/session";
import type { GameState } from "./game/state";
import type { RoundRecord } from "./game/stats";
import type { Round, Settings } from "./game/types";

const KEYS = {
  settings: "impostor:v1:settings",
  game: "impostor:v1:game",
  used: "impostor:v1:used",
  groups: "impostor:v1:groups",
};

const statsKey = (groupId: string) => `impostor:v1:stats:${groupId}`;

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speicher voll oder blockiert: Spiel läuft trotzdem weiter.
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isStringRecord = (v: unknown): v is Record<string, string> =>
  isObject(v) && Object.values(v).every((x) => typeof x === "string");

function isSettings(v: unknown): v is Settings {
  return (
    isObject(v) &&
    isStringArray(v.names) &&
    typeof v.impostorCount === "number" &&
    MODES.some((m) => m.id === v.mode) &&
    [1, 2, 3].includes(v.difficulty as number) &&
    (v.hintsEnabled === undefined || typeof v.hintsEnabled === "boolean") &&
    (v.secretImpostors === undefined || typeof v.secretImpostors === "boolean") &&
    isOptionalSeconds(v.thinkSeconds) &&
    isOptionalSeconds(v.discussSeconds) &&
    (v.groupId === undefined || v.groupId === null || typeof v.groupId === "string") &&
    (v.guessEnabled === undefined || typeof v.guessEnabled === "boolean")
  );
}

function isOptionalSeconds(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "number" && v > 0);
}

const secondsOrNull = (v: unknown): number | null => (typeof v === "number" && v > 0 ? v : null);

function isRound(v: unknown): v is Round {
  return (
    isObject(v) &&
    isObject(v.word) &&
    typeof v.word.name === "string" &&
    isStringArray(v.impostors) &&
    isStringArray(v.revealOrder) &&
    v.revealOrder.length > 0 &&
    typeof v.starter === "string"
  );
}

/** Ältere Runden: v1.0 ohne Tipp, v1.1 ohne Hinweisrunde und Timer. */
function upgradeRound(round: Round): Round {
  const hints = (round.word as { hints?: unknown }).hints;
  const start = Math.max(0, round.revealOrder.indexOf(round.starter));
  const fallbackOrder = [...round.revealOrder.slice(start), ...round.revealOrder.slice(0, start)];
  return {
    ...round,
    // ältere Runden: ohne ID (nie in einer Statistik) und ohne Raten
    id: typeof round.id === "string" ? round.id : "",
    guessEnabled: round.guessEnabled === true,
    word: { name: round.word.name, hints: isStringArray(hints) ? hints : [] },
    hint: typeof round.hint === "string" ? round.hint : null,
    speakingOrder: isStringArray(round.speakingOrder) && round.speakingOrder.length > 0 ? round.speakingOrder : fallbackOrder,
    thinkSeconds: secondsOrNull(round.thinkSeconds),
    discussSeconds: secondsOrNull(round.discussSeconds),
    personalHints: isStringRecord(round.personalHints) ? round.personalHints : null,
  };
}

function isGameState(v: unknown): v is GameState {
  if (!isObject(v)) return false;
  switch (v.phase) {
    case "setup":
      return true;
    case "handoff":
    case "reveal":
      return isRound(v.round) && typeof v.index === "number" && v.index >= 0 && v.index < v.round.revealOrder.length;
    case "clues":
      return (
        isRound(v.round) &&
        isStringArray(v.round.speakingOrder) &&
        typeof v.index === "number" &&
        v.index >= 0 &&
        v.index < v.round.speakingOrder.length
      );
    case "discussion":
      return isRound(v.round);
    case "resolution":
      // v1.3 kannte noch keine Schritte – fehlender Schritt gilt als abgeschlossen
      return (
        isRound(v.round) &&
        (v.step === undefined || ["caught?", "guess", "guessed?", "done"].includes(v.step as string)) &&
        (v.winner === undefined || v.winner === null || v.winner === "crew" || v.winner === "impostor") &&
        (v.caught === undefined || v.caught === null || typeof v.caught === "boolean")
      );
    default:
      return false;
  }
}

export function loadSettings(): Settings | null {
  const v = read(KEYS.settings);
  if (!isSettings(v)) return null;
  return {
    ...v,
    hintsEnabled: v.hintsEnabled ?? true,
    secretImpostors: v.secretImpostors ?? false,
    thinkSeconds: secondsOrNull(v.thinkSeconds),
    discussSeconds: secondsOrNull(v.discussSeconds),
    groupId: v.groupId ?? null,
    guessEnabled: v.guessEnabled ?? true,
  };
}

export function saveSettings(s: Settings): void {
  write(KEYS.settings, s);
}

export function loadGame(): GameState | null {
  const v = read(KEYS.game);
  if (!isGameState(v)) return null;
  if (v.phase === "setup") return v;
  if (v.phase === "resolution") {
    return { ...v, round: upgradeRound(v.round), step: v.step ?? "done", winner: v.winner ?? null, caught: v.caught ?? null };
  }
  return { ...v, round: upgradeRound(v.round) };
}

export function saveGame(g: GameState): void {
  write(KEYS.game, g);
}

export function loadUsed(): UsedMap {
  const v = read(KEYS.used);
  if (!isObject(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([, list]) => isStringArray(list))) as UsedMap;
}

export function saveUsed(u: UsedMap): void {
  write(KEYS.used, u);
}

function isGroup(v: unknown): v is Group {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    Array.isArray(v.members) &&
    v.members.every((m) => isObject(m) && typeof m.id === "string" && typeof m.name === "string") &&
    isStringArray(v.selected) &&
    typeof v.evening === "number" && Number.isInteger(v.evening) && v.evening >= 1
  );
}

export function loadGroups(): Group[] {
  const v = read(KEYS.groups);
  if (!Array.isArray(v)) return [];
  return v.filter(isGroup).map((g) => ({
    ...g,
    selected: g.selected.filter((id) => g.members.some((m) => m.id === id)),
  }));
}

export function saveGroups(groups: Group[]): void {
  write(KEYS.groups, groups);
}

function isRoundRecord(v: unknown): v is RoundRecord {
  return (
    isObject(v) &&
    typeof v.roundId === "string" &&
    typeof v.evening === "number" && Number.isInteger(v.evening) && v.evening >= 1 &&
    typeof v.at === "string" &&
    MODES.some((m) => m.id === v.mode) &&
    isStringArray(v.players) &&
    isStringArray(v.impostors) &&
    typeof v.starter === "string" &&
    (v.winner === null || v.winner === "crew" || v.winner === "impostor") &&
    (v.caught === null || typeof v.caught === "boolean")
  );
}

export function loadStats(groupId: string): RoundRecord[] {
  const v = read(statsKey(groupId));
  return Array.isArray(v) ? v.filter(isRoundRecord) : [];
}

export function appendRecord(groupId: string, record: RoundRecord): void {
  const records = loadStats(groupId);
  if (records.some((r) => r.roundId === record.roundId)) return;
  write(statsKey(groupId), [...records, record]);
}

export function clearStats(groupId: string): void {
  try {
    localStorage.removeItem(statsKey(groupId));
  } catch {
    // Speicher blockiert: nichts zu löschen
  }
}
