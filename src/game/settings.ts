import { MODES } from "./modes";
import type { Settings } from "./types";

export const MIN_PLAYERS = 3;

export function normalizeNames(names: string[]): string[] {
  return names.map((n) => n.trim()).filter((n) => n.length > 0);
}

/** Höchstens so viele Impostor, dass die Crew in der Mehrheit bleibt. */
export function maxImpostors(playerCount: number): number {
  return Math.max(1, Math.floor((playerCount - 1) / 2));
}

/** Topfgröße vor und nach der Auswahl; leere Fehlerliste = gültig. */
export function validateSettings(s: Settings, poolSize?: number, filteredPoolSize?: number): string[] {
  const names = normalizeNames(s.names);
  const errors: string[] = [];
  const filters = MODES.find((m) => m.id === s.mode)?.filters;
  if (poolSize === 0) errors.push("In diesem Modus gibt es noch keine Begriffe");
  else if (filteredPoolSize === 0) errors.push("Mit dieser Auswahl gibt es keine Begriffe");
  if (filters?.length && filters.every((f) => s.excludedFilters.includes(f.id))) {
    errors.push("Mindestens eine Auswahl nötig");
  }
  if (names.length < MIN_PLAYERS) errors.push(`Mindestens ${MIN_PLAYERS} Spieler`);
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) errors.push("Namen doppelt");
  if (s.secretImpostors) return errors;
  if (s.impostorCount < 1) errors.push("Mindestens 1 Impostor");
  else if (names.length >= MIN_PLAYERS && s.impostorCount > maxImpostors(names.length)) {
    errors.push(`Höchstens ${maxImpostors(names.length)} Impostor bei ${names.length} Spielern`);
  }
  return errors;
}
