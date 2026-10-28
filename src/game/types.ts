import type { ModeId } from "../variant/modes";

/** Schwierigkeitsstufe; wirkt nur in Modi mit `hasDifficulty`. */
export type Tier = 1 | 2 | 3;

/**
 * Tipp für die Runde, in der alle Impostor sind. `slot` fasst Kategorien zusammen, die sich
 * widersprechen könnten (z. B. Nation und Kontinent) – pro Runde wird jeder Slot nur einmal vergeben.
 */
export type Tip = { slot: string; value: string };
export type Entry = { name: string; hints: string[]; allHints?: Tip[]; group?: string; tipDonor?: boolean };
export type ModeOption<M extends string = string> = {
  id: M;
  label: string;
  hasDifficulty: boolean;
  filters?: { id: string; label: string }[];
  hasCasual?: boolean;
  choices?: { id: string; label: string }[];
  choiceLabel?: string;
  /** Mindestgröße einer wählbaren Option; ohne Angabe reicht ein Begriff. */
  minChoicePool?: number;
};
export type PoolOptions = { excludedFilters: string[]; casual: boolean; choice: string | null };
export type Settings = {
  names: string[];
  impostorCount: number;
  mode: ModeId;
  difficulty: Tier;
  hintsEnabled: boolean;
  /** IDs abgewählter Filter; neue Filter bleiben dadurch automatisch aktiv. */
  excludedFilters: string[];
  casual: boolean;
  /** Gewählte Option eines Modus mit Einfachauswahl. */
  choice: string | null;
  /** Anzahl der Impostor wird jede Runde geheim ausgelost (0 bis Maximum). */
  secretImpostors: boolean;
  /** Pro Runde kann unabhängig von den Rollen eine Sonderregel gelten. */
  specialRules: boolean;
  /** Überlegzeit pro Spieler in der Hinweisrunde; null = keine Hinweisrunde. */
  thinkSeconds: number | null;
  /** Diskussionszeit; null = kein Diskussions-Timer. */
  discussSeconds: number | null;
  /** Gewählte Gruppe (für Kader und Statistik); null = Namen frei eingetippt. */
  groupId: string | null;
  /** Ein erwischter Impostor darf das Wort raten und gewinnt bei richtiger Antwort. */
  guessEnabled: boolean;
};
export type SpecialRule = { id: string; title: string; text: string };
export type Round = {
  specialRule?: SpecialRule | null;
  /** Zufällige ID, damit eine Runde nie doppelt in die Statistik kommt. */
  id: string;
  word: Entry;
  hint: string | null;
  impostors: string[];
  revealOrder: string[];
  starter: string;
  /** Hinweisrunde: ab dem Starter in der Reihenfolge der eingetragenen Namen. */
  speakingOrder: string[];
  thinkSeconds: number | null;
  discussSeconds: number | null;
  guessEnabled: boolean;
  /** Nur wenn alle Impostor sind: jeder bekommt einen eigenen Tipp (Name → Tipp). */
  personalHints?: Record<string, string> | null;
};
/** Liefert Zufallszahlen in [0, 1). */
export type Rng = () => number;
