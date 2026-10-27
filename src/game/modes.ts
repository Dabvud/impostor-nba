import { MODES, poolFor, type ModeId } from "../variant/modes";

export { MODES, poolFor, poolKey, type ModeId } from "../variant/modes";

/** Größe jedes Topfs – leere Modi (noch keine Begriffe eingetragen) sind nicht wählbar. */
export function poolSizes(): Record<ModeId, number> {
  return Object.fromEntries(MODES.map((m) => [m.id, poolFor(m.id, 3).length])) as Record<ModeId, number>;
}

/** Erster Modus in MODES-Reihenfolge mit Begriffen. */
export function firstPlayableMode(sizes: Record<ModeId, number>): ModeId {
  return MODES.find((m) => sizes[m.id] > 0)?.id ?? MODES[0].id;
}
