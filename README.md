# Bachmann Jass

Lokale Web-App für Schweizer Jass mit gemeinsamem Grundgerüst für mehrere Jassarten.

## Aktueller Stand

- `Bieterjass` mit 3 Spielern: du gegen 2 Computer
- `Schieber Jass` mit 4 Spielern: du mit Partner gegen 2 Computer
- Homescreen mit Auswahl der Jassart, des Punkteziels, der Schwierigkeit und des Tempos
- Laufende Partie wird lokal gesichert und kann fortgesetzt werden
- Jasstafel mit dem ganzen Partieverlauf, Regel-Screen mit allen Punktetabellen
- Gemeinsame Frontend-Spielengine für Kartenlogik, Trumpfwahl, Weis, Stöck, Match, Stichauswertung und Rundensummen
- Bedienpflicht nach den offiziellen Schweizer Jassregeln, abgesichert durch eine Testsuite
- Express-Server für lokale Auslieferung und als Basis für späteren Online-Zugang

## Projektstruktur

- `public/index.html` -> Homescreen und Spielfeld
- `public/style.css` -> Layout für 3- und 4-Spieler-Tisch
- `public/game-engine.js` -> Spielregeln und Rundenlogik (kennt keine Strategie)
- `public/ai.js` -> Spielstrategie der Computergegner
- `public/app.js` -> UI, Rendering und Spielablauf
- `src/server.js` -> lokaler Webserver
- `src/game.js` -> Regelprofile und Projektstatus für den späteren Backend-Ausbau

## Regeln in dieser Grundversion

### Bedienpflicht (gilt in allen Jassarten)

Umgesetzt in `getLegalCards()`:

- die angespielte Farbe muss bedient werden
- Trumpf darf jederzeit gespielt werden, auch wenn man bedienen könnte
- Untertrumpfen ist verboten, ausser man hält nur noch Trumpf
- wird Trumpf angespielt, muss Trumpf bedient werden; einzige Ausnahme ist der Puur (Trumpf-Under) als letzter verbliebener Trumpf
- wer nicht bedienen kann, darf abwerfen - es gibt **keinen** Trumpfzwang und keinen Übertrumpfzwang

### Schieber Jass

- 36 Karten, 9 Karten pro Spieler, in 3er-Paketen verteilt
- 2 feste Teams, Partner sitzt gegenüber
- Geber und Vorhand rücken jede Runde gemeinsam weiter; die Rosen 7 bestimmt nur den ersten Geber
- Vorhand wählt Trumpf, Obe-Abe oder Une-Ufe oder schiebt einmal an den Partner
- Weis vor dem ersten Stich: nur das Team mit dem höchsten Weis schreibt seine Weise
- Stöck (König + Ober der Trumpffarbe) gibt 20 Punkte, unabhängig vom Weis-Vergleich
- Letzter Stich +5, alle neun Stiche (Match) +100
- Ziel: 1000 oder 2500 Punkte

### Bieterjass (Hausregel)

Bieterjass ist **keine offizielle Schweizer Jassart**, sondern eine Hausvariante. Kartenwerte und Bedienpflicht folgen den offiziellen Regeln, der Rest ist gesetzt:

- 36 Karten, 12 Karten pro Spieler
- gesteigert wird reihum, bis alle bis auf einen gepasst haben
- passen alle, spielt der Geber mit 60
- der Höchstbietende wählt die Trumpffarbe und spielt alleine gegen die anderen zwei
- erfüllt er sein Gebot, erhält er den Gebotswert, sonst wird er ihm abgezogen; die Verteidiger teilen sich den Gebotswert
- kein Weis, kein Stöck, kein Match
- Ziel: 1500 Spielpunkte

## Regelvarianten

Regional abweichende Punkte stehen gesammelt in `RULE_SET` in `public/game-engine.js`. Aktuell gesetzt:

| Regel | Wert | Bemerkung |
| --- | --- | --- |
| Letzter Stich | 5 | |
| Match (alle Stiche) | 100 | |
| Stöck | 20 | nur in Trumpfrunden |
| Vier Sechser | zählen nicht | `fourSixesCount: false` |
| Vier Gleiche vs. Folge bei gleicher Punktzahl | Vier Gleiche gewinnen | `fourOfAKindBeatsSequence: true` |
| Multiplikatoren 2500er | Schellen/Schilten x1, Rosen/Eicheln x2, Obe-Abe x3, Une-Ufe x4 | |

Abweichung von den offiziellen Regeln aus Gründen der Bedienbarkeit: Weis und Stöck werden in einer eigenen Phase **vor** dem ersten Stich gemeldet, nicht während des ersten Stichs.

Noch nicht enthalten: Online-Rooms.

## Computergegner

Die Gegner rechnen ausschliesslich lokal im Browser. Es gibt keine Netzwerkaufrufe und keine externen Dienste - die App bleibt vollständig offline spielbar und verursacht keine Kosten.

| Stufe | Verhalten |
| --- | --- |
| Einfach | spielt geradeaus, ohne Plan (das bisherige Verhalten) |
| Normal | zieht Trumpf, schmiert dem Partner, sticht billig, wirft sparsam ab |
| Schwer | zusätzlich mit Kartengedächtnis: erkennt sichere Stiche und sicheres Schmieren |

Die Trumpfwahl bewertet Puur, Nell, Farblänge und Nebenfarben statt nur Kartenpunkte. Der 2500er-Multiplikator wird auf den erwarteten **Vorteil** angewendet, nicht auf die erwartete Punktzahl - er vervielfacht ja die Punkte beider Teams.

Zwei Stufen lassen sich direkt gegeneinander messen:

```powershell
node scripts/benchmark-ai.mjs normal einfach 300
```

Beide Seiten spielen dieselben Kartenverteilungen mit getauschten Sitzplätzen. Gemessene Siegquoten (600 Partien): normal gegen einfach 74%, schwer gegen normal 63%, schwer gegen einfach 80%.

## Bedienung

- **Tempo**: Langsam, Normal oder Schnell, umschaltbar im Setup und jederzeit über den Knopf in der Kopfzeile. Ein Tipp auf den Tisch überspringt zusätzlich die laufende Wartezeit des Computers.
- **Jasstafel**: zeigt jede gespielte Runde mit Spielart, Multiplikator, Rundenpunkten und Gesamtstand. Weis, Stöck und Match sind markiert.
- **Regeln**: Bedienpflicht, Kartenwerte, Weis-Tabelle, Zusatzpunkte und Multiplikatoren. Die Tabellen werden aus der Engine erzeugt und können darum nicht vom Code abweichen.
- **Tastatur**: Handkarten sind echte Buttons mit `aria-label` und lassen sich per Tab und Enter spielen. `Escape` schliesst jeden Dialog.
- Der Geber und der eigene Partner sind am Tisch mit einem Abzeichen markiert.

## Spielstand

Die laufende Partie liegt in `localStorage` (`bachmann-jass:game:v1`) und wird nach jedem Zug sowie beim Wegschalten der App gesichert. Auf dem Homescreen erscheint dann `Partie fortsetzen`. Name, Jassart, Punkteziel und Schwierigkeit werden ebenfalls gemerkt. Ist `localStorage` blockiert (privates Fenster, gesperrte Site-Daten), läuft die App normal weiter, nur ohne Speicherstand.

## Tests

```powershell
npm.cmd test
npm.cmd run check:docs
```

`npm test` prüft Regelengine, Strategie und App-Struktur mit `node --test`. Enthalten sind unter anderem:

- Vollsimulation von 400 Runden gegen die Regelinvarianten (157 Punkte pro Runde, jederzeit mindestens ein legaler Zug, saubere Rundenenden)
- die Rangfolge der Schwierigkeitsstufen (schwer und normal müssen einfach schlagen)
- ein Spielstand, der JSON überlebt und danach zu Ende gespielt wird
- alle `getElementById`-Referenzen aus `app.js` gegen die IDs im HTML

`npm run check:docs` schlägt fehl, wenn `docs/` nicht dem aktuellen Stand von `public/` entspricht. Genau das prüft auch die GitHub Action in `.github/workflows/ci.yml`.

### Browsertest

```powershell
npm.cmd run test:e2e
```

Startet den lokalen Server, fährt Edge oder Chrome headless über das DevTools-Protokoll und spielt eine Runde durch: Regel-Screen, Tempo, Abzeichen, Tastaturbedienung, Jasstafel, Speicherstand und das Layout in fünf Fenstergrössen von 1440x780 bis iPhone SE. Der Treiber in `tests/browser/cdp.mjs` kommt ohne Abhängigkeiten aus. Ist kein Chromium-Browser installiert, überspringt sich der Test. Er läuft deshalb nicht in der CI, sondern lokal.

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
- in GitHub steht unter `Settings -> Pages` aktuell `Deploy from a branch` mit **Root** statt `/docs`

Die App liegt deshalb unter `https://yannickluca.github.io/bachmann_jass_game/docs/`, nicht direkt unter der Repo-URL. Sie funktioniert so vollständig. Stellt man Pages auf `/docs` um, wandert die App auf die kürzere Adresse ohne `/docs` - dann muss aber jedes bereits gespeicherte Home-Bildschirm-Symbol neu angelegt werden.

Nach jeder Änderung an `public/`:

```powershell
npm.cmd run deploy
```

Der Build kopiert `public/` nach `docs/` und setzt dabei den Cachenamen des Service Workers aus einem Hash der App-Dateien. Ohne diesen Bump würde eine bereits installierte PWA weiterhin die alte Version aus ihrem Cache ausliefern.

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
