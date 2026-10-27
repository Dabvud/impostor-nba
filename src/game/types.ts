export type Tier = 1 | 2 | 3;
export type Tag = "bundesliga" | "cl-legende" | "wm-legende" | "fifa-icon" | "bvb";
/** Merkmale, aus denen der Tipp für den Impostor gezogen wird. */
export type PlayerHints = { nation: string; position: string; special: string | null };
export type ClubHints = {
  region: string;
  color: string;
  league: string;
  character: string;
  success: string;
  crest: string;
};
/** Zusätzliche Tipp-Kategorien, nur für die Runde, in der alle Impostor sind. */
export type PlayerExtras = {
  continent: string | null;
  league: string | null;
  playStyle: string | null;
  trait: string | null;
  moment: string | null;
  competition: string | null;
  title: string | null;
  hair: string | null;
  look: string | null;
  era: string | null;
  build: string | null;
  foot: string | null;
  careerType: string | null;
  shirtNumber: string | null;
  status: string | null;
  afterCareer: string | null;
  bundesliga: string | null;
  transfer: string | null;
};
export type ClubExtras = {
  stadium: string | null;
  founded: string | null;
  cityType: string | null;
  derby: string | null;
  sponsor: string | null;
  mascot: string | null;
};
export type Footballer = { name: string; tier: Tier; tags: Tag[]; hints: PlayerHints; extras?: PlayerExtras };
/** `inAllClubs`: erscheint im Modus „Alle Vereine“ (internationale Vereine immer, Bundesliga nur die relevanten). */
export type Club = { name: string; region: "de" | "int"; inAllClubs: boolean; hints: ClubHints; extras?: ClubExtras };
/**
 * Tipp für die Runde, in der alle Impostor sind. `slot` fasst Kategorien zusammen, die sich
 * widersprechen könnten (z. B. Nation und Kontinent) – pro Runde wird jeder Slot nur einmal vergeben.
 */
export type Tip = { slot: string; value: string };
export type Team = "Tor" | "Abwehr" | "Mittelfeld" | "Angriff";
export type Entry = { name: string; hints: string[]; allHints?: Tip[]; team?: Team };
export type ModeId =
  | "alle"
  | "bundesliga"
  | "bvb"
  | "cl-legenden"
  | "wm-legenden"
  | "fifa-icons"
  | "vereine-de"
  | "vereine-int";
export type Settings = {
  names: string[];
  impostorCount: number;
  mode: ModeId;
  difficulty: Tier;
  hintsEnabled: boolean;
  /** Anzahl der Impostor wird jede Runde geheim ausgelost (0 bis Maximum). */
  secretImpostors: boolean;
  /** Überlegzeit pro Spieler in der Hinweisrunde; null = keine Hinweisrunde. */
  thinkSeconds: number | null;
  /** Diskussionszeit; null = kein Diskussions-Timer. */
  discussSeconds: number | null;
  /** Gewählte Gruppe (für Kader und Statistik); null = Namen frei eingetippt. */
  groupId: string | null;
  /** Ein erwischter Impostor darf das Wort raten und gewinnt bei richtiger Antwort. */
  guessEnabled: boolean;
};
export type Round = {
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
