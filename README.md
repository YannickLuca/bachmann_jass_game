# Bachmann Jass

Lokale Web-App für Schweizer Jass mit gemeinsamem Grundgerüst für mehrere Jassarten.

## Aktueller Stand

- `Bieterjass` mit 3 Spielern: du gegen 2 Computer
- `Schieber Jass` mit 4 Spielern: du mit Partner gegen 2 Computer
- Homescreen mit Auswahl der Jassart
- Gemeinsame Frontend-Spielengine für Kartenlogik, Trumpfwahl, Stichauswertung und Rundensummen
- Express-Server für lokale Auslieferung und als Basis für späteren Online-Zugang

## Projektstruktur

- `public/index.html` -> Homescreen und Spielfeld
- `public/style.css` -> Layout für 3- und 4-Spieler-Tisch
- `public/game-engine.js` -> Spielregeln und Rundelogik
- `public/app.js` -> UI, Rendering und KI-Zuege
- `src/server.js` -> lokaler Webserver
- `src/game.js` -> Regelprofile und Projektstatus für den späteren Backend-Ausbau

## Regeln in dieser Grundversion

### Bieterjass

- 36 Karten, 12 Karten pro Spieler
- Jeder bietet einmal
- Höchstbietender wählt Trumpf
- Vereinfachte Bedienpflicht wie in der bisherigen Testversion
- Ziel: 1500 Spielpunkte

### Schieber Jass

- 36 Karten, 9 Karten pro Spieler
- 2 feste Teams
- Vorhand wählt Trumpf oder schiebt einmal an den Partner
- Teamwertung über die Stichpunkte pro Runde
- Ziel: 1000 Punkte
- Noch nicht enthalten: Weis, Stöck, Obenabe, Undenufe, Online-Rooms

## Starten

Wenn Node.js installiert ist:

```powershell
npm.cmd install
npm.cmd start
```

Danach im Browser:

- `http://localhost:3000`

## GitHub Pages

Für GitHub Pages wird die statische Web-App aus `docs/` veröffentlicht.

- `docs/index.html` ist der Einstiegspunkt
- `docs/.nojekyll` verhindert, dass GitHub Pages die App als Jekyll-Seite behandelt
- `docs/manifest.webmanifest` und `docs/service-worker.js` machen die App installierbar
- in GitHub unter `Settings -> Pages` sollte `Deploy from a branch` mit dem Ordner `/docs` gewählt werden

Wenn du lokal neu bauen willst, ist das vorgesehene Kommando:

```powershell
npm.cmd run deploy
```

## Als Web-App Installieren

Auf iPhone/iPad funktioniert das am zuverlässigsten über die GitHub-Pages-URL, weil diese per HTTPS ausgeliefert wird:

- Seite in Safari öffnen
- Teilen-Symbol antippen
- `Zum Home-Bildschirm` wählen
- danach über das neue App-Icon starten

Lokal mit Live Server kann die App zwar im Browser getestet werden. Der Service Worker und Offline-Cache funktionieren auf Handys aber je nach Browser nur mit HTTPS oder `localhost`.

## Nächster sinnvoller Ausbau

Der aktuelle Stand ist komplett lokal und clientseitig spielbar. Für den späteren Online-Modus über GitHub/Web-App bietet sich als nächster Schritt an:

1. gemeinsamen Spielkern serverseitig nutzbar machen
2. Room-Codes und Match-Status einführen
3. Spieleraktionen über WebSocket oder Polling synchronisieren
