/** Insider der Runde: Wer Paul heißt, bekommt in der Anzeige immer einen Regenbogen. */
export function displayName(name: string): string {
  const trimmed = name.trim();
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  return firstWord === "paul" ? `${trimmed} 🌈` : name;
}
