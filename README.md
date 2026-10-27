# Impostor

Fußball-Impostor für eure Runde: Ein Handy wird reihum weitergegeben, alle sehen denselben
Fußballer oder Verein – nur der Impostor nicht. Läuft nach der Installation komplett offline.

## Auf dem Handy installieren

Einmal den Link öffnen (braucht beim ersten Mal Internet), danach:

- **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“

Neue Versionen lädt die App automatisch, sobald sie wieder Internet hat.

## Entwicklung

```bash
npm install
npm run dev     # lokaler Server
npm test        # alle Tests
npm run build   # Produktions-Build nach dist/
```

Spieler und Vereine stehen in `src/data/players.json` und `src/data/clubs.json`.
Nach Änderungen prüft `npm test`, dass die Listen gültig sind.

Jeder Push auf `main` baut die App per GitHub Actions und veröffentlicht sie auf GitHub Pages
(Repository-Einstellungen → Pages → Source: „GitHub Actions“).
