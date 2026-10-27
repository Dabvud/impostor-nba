import type { Tip } from "./types";

export const toTips = (row: (string | null)[], slots: string[]): Tip[] =>
  row.flatMap((value, c) => (value ? [{ slot: slots[c], value }] : []));

export const isText = (h: string | null | undefined): h is string => Boolean(h);

export function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

/**
 * Behält pro Spalte (Kategorie) nur Werte, die mindestens `min` Einträge im Topf teilen
 * (sonst verraten sie den Begriff) und nicht alle (sonst sagen sie nichts).
 */
export function sharedOnly(rows: (string | null | undefined)[][], min: (column: number) => number): (string | null)[][] {
  const columns = rows[0]?.length ?? 0;
  const counts = Array.from({ length: columns }, (_, c) => countBy(rows, (row) => row[c] ?? ""));
  return rows.map((row) =>
    row.map((value, c) => {
      if (!value) return null;
      const n = counts[c].get(value) ?? 0;
      return n >= min(c) && n < rows.length ? value : null;
    }),
  );
}
