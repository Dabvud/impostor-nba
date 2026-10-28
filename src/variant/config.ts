import type { SpecialRule } from "../game/types";

export const FILTER_LABEL = "Diese Ären kommen in den Topf";
export const CASUAL_LABEL = "🧢 Hilfe, ich bin Casual";
export const APP_NAME = "Impostor NBA";
/** Präfix der localStorage-Schlüssel – nie ändern, sonst sind Gruppen und Statistik weg. */
export const STORAGE_PREFIX = "impostor-nba";
export const MANIFEST_DESCRIPTION = "NBA-Impostor für eure Runde – ein Handy, alle Spieler.";
export const THEME_COLOR = "#0a1530";
export const SHARE_TEXT = "Unser NBA-Impostor für die nächste Runde:";
/** Satzteil in den Regeln: „Alle bekommen {RULES_SUBJECT} – nur der Impostor nicht.“ */
export const RULES_SUBJECT = "denselben NBA-Spieler oder dasselbe Team";
export const QR_COLORS = { dark: "#0a1530", light: "#ffffff" };

export const SPECIAL_RULES_LABEL = "🎲 Sonderregeln";
export const SPECIAL_RULE_HEADING = "Sonderregel der Runde";
export const SPECIAL_RULE_ANNOUNCEMENT = "Lest die Regel allen laut vor, bevor ihr Hinweise gebt.";
export const SPECIAL_RULE_START = "Alle bereit – los geht’s";
export const SPECIAL_RULES_DESCRIPTION = "Mit Sonderregeln gilt in 10 % der Runden eine zufällige Zusatzregel. Sie wird vor den Hinweisen allen vorgelesen und ist unabhängig von den Rollen.";
export const SPECIAL_RULES: SpecialRule[] = [
  {
    id: "fussballvergleich", title: "⚽ Fußballvergleich",
    text: "Jeder nennt als Hinweis einen Fußballer, der zum gesuchten Begriff passt (ähnliche Rolle, Ausstrahlung oder Karriere). Erklären darf man erst in der Diskussion.",
  },
  {
    id: "pantomime", title: "🎭 Pantomime",
    text: "Jeder zeigt seinen Hinweis zuerst nur mit einer Bewegung – ohne Worte. Gesprochen wird erst in der Diskussion.",
  },
  {
    id: "kreuzverhoer", title: "🕵️ Kreuzverhör",
    text: "Nach der Hinweisrunde stellt jeder seinem linken Nachbarn genau eine Frage zum Begriff. Namen und direkte Fragen wie „Wer ist es?“ sind verboten.",
  },
  {
    id: "rueckwaerts", title: "🔁 Zweiter Umlauf",
    text: "Nach der Hinweisrunde gibt es einen zweiten Umlauf in umgekehrter Reihenfolge. Jeder muss etwas Neues sagen.",
  },
];
