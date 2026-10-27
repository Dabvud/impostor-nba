/** Gemeinsames Vokabular der kuratierten normalen Spieler-Tipps. */
export const PLAYER_STYLES: readonly string[] = [
  "Scorer", "Dreierschütze", "Spielmacher", "Verteidiger", "Dunker", "Rebounder", "Shotblocker",
  "Allrounder", "Athlet", "Mitteldistanz-Spezialist", "Post-Spieler",
];
export const PLAYER_SUCCESSES: readonly string[] = ["NBA-Champion", "Finals-Teilnehmer", "Conference-Finalist"];
export const PLAYER_ROLES: readonly string[] = ["Teamlegende", "Franchise-Spieler", "Talent"];
export const PLAYER_TIPS: readonly string[] = [
  ...PLAYER_STYLES, "All-Star", "All-NBA", ...PLAYER_SUCCESSES, "Clutch-Moment", "bekannter Trade",
  "Verletzungspech", "Top-10-Pick", ...PLAYER_ROLES,
];
export const LEGEND_ERAS: readonly string[] = ["2010er", "2000er", "90er", "80er", "70er", "60er", "50er"];
/** Hall of Famer meint eine bereits erfolgte individuelle Naismith-Aufnahme als Spieler. */
export const LEGEND_TIPS: readonly string[] = ["Hall of Famer", ...LEGEND_ERAS.map((era) => "Star der " + era)];
/** null bleibt erlaubt, wenn keine geeignete Tätigkeit nach der Karriere belegt ist. */
export const AFTER_CAREER_VALUES: readonly string[] = ["TV-Experte", "Trainer", "Funktionär/Besitzer", "Unternehmer", "verstorben"];
