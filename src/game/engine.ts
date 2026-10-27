import type { Entry, Rng, Round } from "./types";

function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/**
 * Alle sind Impostor: Jeder bekommt einen Tipp von einem anderen, zufälligen Spieler. Damit die
 * Tipps sich nicht verraten, kommen alle Tipp-Geber aus einer Positionsgruppe und
 * jeder Konflikt-Slot (z. B. Herkunft = Nation oder Kontinent) wird nur einmal vergeben.
 */
function personalTips(names: string[], pool: Entry[], rng: Rng): Record<string, string> | null {
  const field = pool.filter((e) => (e.allHints?.length ?? 0) > 0);
  if (field.length === 0) return null;
  const positionGroup = pick([...new Set(field.map((e) => e.positionGroup))], rng);
  const donors = shuffle(
    field.filter((e) => e.positionGroup === positionGroup),
    rng,
  );
  const usedSlots = new Set<string>();
  const tips: Record<string, string> = {};
  let next = 0;
  for (const name of names) {
    // nächster Tipp-Geber, der noch einen freien Slot hat
    for (let tries = 0; tries < donors.length; tries++) {
      const donor = donors[(next + tries) % donors.length];
      const open = (donor.allHints ?? []).filter((t) => !usedSlots.has(t.slot));
      if (open.length === 0) continue;
      const tip = pick(open, rng);
      tips[name] = tip.value;
      usedSlots.add(tip.slot);
      next = (next + tries + 1) % donors.length;
      break;
    }
  }
  return Object.keys(tips).length > 0 ? tips : null;
}

/**
 * Lost eine Runde aus. Stehen mindestens 50 % des Topfs in `used`, wird `used`
 * vorher geleert, damit nie vorhersehbar ist, welche Begriffe noch übrig sind.
 */
export function drawRound(
  names: string[],
  impostorCount: number,
  pool: Entry[],
  used: string[],
  rng: Rng,
  withHint = false,
): { round: Round; used: string[] } {
  if (pool.length === 0) throw new Error("Leerer Topf");

  const poolNames = new Set(pool.map((e) => e.name));
  const usedInPool = used.filter((n) => poolNames.has(n));
  const baseUsed = usedInPool.length >= pool.length / 2 ? [] : used;

  const blocked = new Set(baseUsed);
  const word = pick(
    pool.filter((e) => !blocked.has(e.name)),
    rng,
  );
  const impostors = shuffle(names, rng).slice(0, impostorCount);
  const revealOrder = shuffle(names, rng);
  const starter = pick(names, rng);
  const everyone = names.length > 0 && impostors.length === names.length;
  let hint: string | null = null;
  let personalHints: Record<string, string> | null = null;
  if (withHint && everyone) {
    personalHints = personalTips(names, pool, rng);
  } else if (withHint && word.hints.length > 0) {
    hint = pick(word.hints, rng);
  }
  const start = names.indexOf(starter);
  const speakingOrder = [...names.slice(start), ...names.slice(0, start)];

  return {
    round: {
      id: "",
      guessEnabled: false,
      word,
      hint,
      personalHints,
      impostors,
      revealOrder,
      starter,
      speakingOrder,
      thinkSeconds: null,
      discussSeconds: null,
    },
    used: [...baseUsed, word.name],
  };
}

/** Geheimer Modus: Chance, dass ausnahmslos alle Impostor sind. */
const ALL_IMPOSTORS_CHANCE = 0.01;
/** Geheimer Modus: Chance auf eine Runde ganz ohne Impostor. */
const NO_IMPOSTOR_CHANCE = 0.1;

/**
 * Geheimer Modus: 1 % alle Spieler, 10 % keiner, die übrigen 89 % gleich verteilt auf 1 bis max.
 * Ohne `allowAll` (zu viele Mitspieler für eigene Tipp-Kategorien) entfällt das 1 %.
 */
export function drawImpostorCount(max: number, playerCount: number, rng: Rng, allowAll = true): number {
  const allChance = allowAll ? ALL_IMPOSTORS_CHANCE : 0;
  const r = rng();
  if (r < allChance) return playerCount;
  if (r < allChance + NO_IMPOSTOR_CHANCE) return 0;
  const rest = allChance + NO_IMPOSTOR_CHANCE;
  const share = (r - rest) / (1 - rest);
  return Math.min(max, 1 + Math.floor(share * max));
}
