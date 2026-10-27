import type { Group, Member } from "./groups";
import type { Winner } from "./state";
import type { ModeId } from "./modes";
import type { Round } from "./types";

export type { Winner };
export type RoundRecord = {
  roundId: string;
  evening: number;
  at: string;
  mode: ModeId;
  players: string[];
  impostors: string[];
  starter: string;
  winner: Winner | null;
  /** Wurde der Impostor erwischt? (Er kann trotzdem gewinnen, wenn er das Wort errät.) */
  caught: boolean | null;
};
export type StatsRow = { name: string; rounds: number; impostor: number; impostorWins: number; caught: number };
export type StatsSummary = {
  rounds: number;
  crewRate: number | null;
  masterImpostor: string[];
  unlucky: string[];
  starterKing: string[];
  favoriteMode: ModeId | null;
  table: StatsRow[];
};

export type Outcome = { winner: Winner | null; caught: boolean | null };

export function toRecord(round: Round, group: Group, mode: ModeId, outcome: Outcome, at: string): RoundRecord {
  // Wer während der Runde umbenannt oder entfernt wurde, wird übersprungen statt abzustürzen.
  const ids = (names: string[]) => names.flatMap((name) => group.members.find((m) => m.name === name)?.id ?? []);
  return {
    roundId: round.id,
    evening: group.evening,
    at,
    mode,
    players: ids(round.revealOrder),
    impostors: ids(round.impostors),
    starter: ids([round.starter])[0] ?? "",
    winner: outcome.winner,
    caught: outcome.caught,
  };
}

export function computeStats(records: RoundRecord[], members: Member[], scope: "all" | { evening: number }): StatsSummary {
  const rounds = scope === "all" ? records : records.filter((r) => r.evening === scope.evening);
  const decided = rounds.filter((r) => r.winner !== null);
  const rows = [...members].sort((a, b) => a.name.localeCompare(b.name, "de")).map((m) => {
    const impostor = rounds.filter((r) => r.impostors.includes(m.id));
    return {
      name: m.name,
      rounds: rounds.filter((r) => r.players.includes(m.id)).length,
      impostor: impostor.length,
      impostorWins: impostor.filter((r) => r.winner === "impostor").length,
      caught: impostor.filter((r) => r.caught === true).length,
      starts: rounds.filter((r) => r.starter === m.id).length,
    };
  });
  const leaders = (key: "impostorWins" | "impostor" | "starts"): string[] => {
    const best = Math.max(0, ...rows.map((r) => r[key]));
    return rows.filter((r) => r[key] > 0 && r[key] === best).map((r) => r.name);
  };
  const modes = new Map<ModeId, number>();
  for (const round of rounds) modes.set(round.mode, (modes.get(round.mode) ?? 0) + 1);
  const favoriteMode = [...modes.keys()].sort().reduce<ModeId | null>((best, mode) =>
    best === null || modes.get(mode)! > modes.get(best)! ? mode : best, null);
  return {
    rounds: rounds.length,
    crewRate: decided.length ? decided.filter((r) => r.winner === "crew").length / decided.length : null,
    masterImpostor: leaders("impostorWins"),
    unlucky: leaders("impostor"),
    starterKing: leaders("starts"),
    favoriteMode,
    table: rows.map(({ name, rounds, impostor, impostorWins, caught }) => ({ name, rounds, impostor, impostorWins, caught })),
  };
}
