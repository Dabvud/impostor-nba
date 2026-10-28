import { MODES, poolFor, type ModeId } from "../variant/modes";

export { MODES, poolFor, poolKey, type ModeId } from "../variant/modes";

/** Größe jedes Topfs – leere Modi (noch keine Begriffe eingetragen) sind nicht wählbar. */
export function poolSizes(): Record<ModeId, number> {
  return Object.fromEntries(MODES.map((m) => [m.id, m.choices
    ? Math.max(0, ...m.choices.map((choice) => poolFor(m.id, 3, { excludedFilters: [], casual: false, choice: choice.id }).length))
    : poolFor(m.id, 3).length])) as Record<ModeId, number>;
}

/** Erster Modus in MODES-Reihenfolge mit Begriffen. */
export function firstPlayableMode(sizes: Record<ModeId, number>): ModeId {
  return MODES.find((m) => sizes[m.id] > 0)?.id ?? MODES[0].id;
}
