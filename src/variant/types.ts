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
/** Positionsgruppe, aus der in der Alle-Impostor-Runde die Tipp-Geber kommen. */
export type PositionGroup = "Guard" | "Forward" | "Center";
