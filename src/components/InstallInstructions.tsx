import type { Platform } from "../install";

export const IOS_INSTALL_STEPS = [
  "Auf das Teilen-Symbol tippen",
  "Nach unten scrollen und „Zum Home-Bildschirm“ wählen",
  "Auf „Hinzufügen“ tippen",
];
export const ANDROID_INSTALL_STEPS = [
  "Oben rechts auf das Menü ⋮ tippen",
  "„App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen",
];
export const OPEN_IN_SAFARI = "Link in Safari öffnen";

export default function InstallInstructions({ platform }: { platform: Platform }) {
  const steps = platform === "ios-safari" ? IOS_INSTALL_STEPS : platform === "android" ? ANDROID_INSTALL_STEPS : null;
  if (steps) return <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>;
  if (platform === "ios-other") return <p>{OPEN_IN_SAFARI}. Kopiere die Adresse oder wähle im Browser-Menü „In Safari öffnen“.</p>;
  if (platform === "other") return <p>Öffne diese Seite auf deinem Handy, um die passende Installationshilfe zu sehen.</p>;
  return null;
}
