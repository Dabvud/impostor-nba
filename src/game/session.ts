import { allImpostorsMax } from "../variant/modes";
import { drawImpostorCount, drawRound } from "./engine";
import { poolFor, poolKey } from "./modes";
import { maxImpostors, normalizeNames } from "./settings";
import type { Rng, Round, Settings } from "./types";

/** 8 Zeichen base36 aus dem Zufallsgenerator. */
function roundId(rng: Rng): string {
  return Array.from({ length: 8 }, () => Math.floor(rng() * 36).toString(36)).join("");
}

/** Schon gespielte Begriffe pro Topf (Schlüssel aus `poolKey`). */
export type UsedMap = Record<string, string[]>;

export function nextRound(
  s: Settings,
  used: UsedMap,
  rng: Rng,
): { round: Round; used: UsedMap } {
  const key = poolKey(s.mode, s.difficulty);
  const pool = poolFor(s.mode, s.difficulty, { excludedFilters: s.excludedFilters, casual: s.casual });
  const names = normalizeNames(s.names);
  // Eigene Tipps nur, solange die Variante genügend Kategorien für alle vorsieht.
  const allowAll = names.length <= allImpostorsMax(s.mode);
  const impostorCount = s.secretImpostors
    ? drawImpostorCount(maxImpostors(names.length), names.length, rng, allowAll)
    : s.impostorCount;
  const result = drawRound(names, impostorCount, pool, used[key] ?? [], rng, s.hintsEnabled);
  const round = {
    ...result.round,
    id: roundId(rng),
    thinkSeconds: s.thinkSeconds,
    discussSeconds: s.discussSeconds,
    guessEnabled: s.guessEnabled,
  };
  return { round, used: { ...used, [key]: result.used } };
}
