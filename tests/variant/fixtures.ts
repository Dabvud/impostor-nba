import type { NbaPlayer, NbaTeam, PlayerExtras, TeamExtras } from "../../src/variant/types";
import type { Settings } from "../../src/game/types";

export const playerExtras = (overrides: Partial<PlayerExtras> = {}): PlayerExtras => ({
  continent: null, conference: null, team: null, playStyle: null, trait: null, moment: null, award: null,
  title: null, hair: null, look: null, era: null, build: null, hand: null, careerType: null,
  shirtNumber: null, status: null, afterCareer: null, draft: null, college: null, transfer: null, ...overrides,
});
export const teamExtras = (overrides: Partial<TeamExtras> = {}): TeamExtras => ({
  founded: null, cityType: null, rival: null, mascot: null, relocated: null, nameType: null, ...overrides,
});
export const player = (name: string, overrides: Partial<NbaPlayer> = {}): NbaPlayer => ({
  name, tags: ["star"], hints: { nation: "USA", position: "Point Guard", tips: [] }, ...overrides,
});
export const players: NbaPlayer[] = [
  player("A", { hints: { nation: "USA", position: "Point Guard", tips: ["Dreierschütze", "Scorer"] } }),
  player("B", { tags: ["legende"], hints: { nation: "Deutschland", position: "Power Forward", tips: [] } }),
  player("C", { tags: ["star", "legende"], hints: { nation: "Serbien", position: "Center", tips: [] } }),
];
export const team = (name: string, color: string, conference: string): NbaTeam => ({
  name,
  hints: { conference, division: "Division " + name, color, region: "Region " + name,
    success: "Erfolg " + name, logo: "Logo " + name },
});
// Jedes Team teilt einen Tipp mit einem anderen, aber keiner trifft auf alle zu.
export const teams = [team("X", "Rot", "Westen"), team("Y", "Rot", "Osten"), team("Z", "Blau", "Osten")];
export const settings: Settings = {
  names: ["Anna", "Ben", "Cem"], impostorCount: 1, mode: "stars", difficulty: 1, hintsEnabled: true,
  secretImpostors: false, thinkSeconds: null, discussSeconds: null, groupId: null, guessEnabled: true, excludedFilters: [], casual: false,
};
