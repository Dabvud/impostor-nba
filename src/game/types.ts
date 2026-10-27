export type Tag = "star" | "legende";
/** Merkmale, aus denen der Tipp für den Impostor gezogen wird. */
export type PlayerHints = { nation: string; position: string; special: string | null };
export type TeamHints = {
  conference: string;
  division: string;
  color: string;
  region: string;
  success: string;
  logo: string;
};
/** Zusätzliche Tipp-Kategorien, nur für die Runde, in der alle Impostor sind. */
export type PlayerExtras = {
  continent: string | null;
  conference: string | null;
  team: string | null;
  playStyle: string | null;
  trait: string | null;
  moment: string | null;
  award: string | null;
  title: string | null;
  hair: string | null;
  look: string | null;
  era: string | null;
  build: string | null;
  hand: string | null;
  careerType: string | null;
  shirtNumber: string | null;
  status: string | null;
  afterCareer: string | null;
  draft: string | null;
  college: string | null;
  transfer: string | null;
};
export type TeamExtras = {
  founded: string | null;
  cityType: string | null;
  rival: string | null;
  mascot: string | null;
  relocated: string | null;
  nameType: string | null;
};
export type NbaPlayer = { name: string; tags: Tag[]; hints: PlayerHints; extras?: PlayerExtras };
export type NbaTeam = { name: string; hints: TeamHints; extras?: TeamExtras };
/**
 * Tipp für die Runde, in der alle Impostor sind. `slot` fasst Kategorien zusammen, die sich
 * widersprechen könnten (z. B. Nation und Kontinent) – pro Runde wird jeder Slot nur einmal vergeben.
 */
export type Tip = { slot: string; value: string };
export type PositionGroup = "Guard" | "Forward" | "Center";
export type Entry = { name: string; hints: string[]; allHints?: Tip[]; positionGroup?: PositionGroup };
export type ModeId = "stars" | "legenden" | "teams";
export type Settings = {
  names: string[];
  impostorCount: number;
  mode: ModeId;
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
