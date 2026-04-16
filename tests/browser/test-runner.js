import {
  compareWeis,
  createGame,
  chooseTrump,
  detectWeis,
  getGameTargetScore,
  getPlayableCards,
  getRoundMultiplier,
  resolveTrick,
  submitWeisDeclaration,
  trickPoints,
  trickWinner,
} from '../../public/game-engine.js';

const resultsEl = document.getElementById('results');
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

function equal(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message || 'Values differ'}\nexpected: ${expected}\nactual: ${actual}`);
  }
}

function includes(haystack, needle, message = '') {
  if (!haystack.includes(needle)) {
    throw new Error(message || `Expected to find "${needle}"`);
  }
}

function match(text, pattern, message = '') {
  if (!pattern.test(text)) {
    throw new Error(message || `Expected pattern ${pattern}`);
  }
}

function card(suit, rank) {
  return { id: `${suit}_${rank}`, suit, rank };
}

function findWeis(weisen, predicate, message) {
  const found = weisen.find(predicate);
  assert(Boolean(found), message);
  return found;
}

function primeSchieberGame(handsByPlayer, { targetScore = 1000, forehandPlayer = 0 } = {}) {
  const game = createGame({
    variantId: 'schieber',
    playerName: 'Du',
    matchConfig: { targetScore },
  });

  game.phase = 'chooseTrump';
  game.forehandPlayer = forehandPlayer;
  game.currentPlayer = forehandPlayer;
  game.chooserPlayer = forehandPlayer;
  game.roundNumber = 1;

  game.players.forEach((player, playerIndex) => {
    player.hand = handsByPlayer[playerIndex].slice();
    player.pointsWon = 0;
    player.tricksWon = 0;
  });

  return game;
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Konnte ${path} nicht laden (${response.status})`);
  }
  return response.text();
}

test('Layout: Gegner-Piles sitzen im HTML ueber den Namensschildern', async () => {
  const html = await fetchText('../../public/index.html');

  ['left', 'top', 'right'].forEach((zone) => {
    const sectionMatch = html.match(new RegExp(`<section id="zone-${zone}"[\\s\\S]*?<\\/section>`));
    assert(sectionMatch, `Zone ${zone} fehlt im HTML`);
    const section = sectionMatch[0];
    const anchorIndex = section.indexOf(`id="pile-anchor-${zone}"`);
    const labelIndex = section.indexOf('class="player-label"');
    assert(anchorIndex >= 0, `Pile-Anchor fuer ${zone} fehlt`);
    assert(labelIndex >= 0, `Namensschild fuer ${zone} fehlt`);
    assert(anchorIndex < labelIndex, `Pile-Anchor fuer ${zone} steht nicht vor dem Namensschild`);
  });
});

test('Layout: Gegner-Namen behalten feste Hoehe', async () => {
  const css = await fetchText('../../public/style.css');
  match(css, /\.zone-head\s*\{[\s\S]*?min-height:/, 'zone-head braucht feste Mindesthoehe');
  match(css, /\.zone-pile-anchor\s*\{[\s\S]*?min-height:/, 'zone-pile-anchor braucht feste Mindesthoehe');
});

test('Layout: Eigene Hand im Schieber ist 1.3x gross, andere nicht', async () => {
  const css = await fetchText('../../public/style.css');
  match(css, /\.table-area\.mode-bieter\s*\{[\s\S]*?--human-card-scale:\s*1;/, 'Bieter braucht menschliche Standardgroesse');
  match(css, /\.table-area\.mode-schieber\s*\{[\s\S]*?--human-card-scale:\s*1\.3;/, 'Schieber braucht 1.3x fuer die eigene Hand');
  match(css, /\.hand-ai \.card\s*\{[\s\S]*?width:\s*var\(--ai-card-w\);/, 'AI-Karten muessen bei ihrer bisherigen Groesse bleiben');
});

test('Layout: Kleine Displays verhindern Overflow ueber Scroll/Fit', async () => {
  const css = await fetchText('../../public/style.css');
  match(css, /\.hand-human\s*\{[\s\S]*?overflow-x:\s*auto;/, 'Die eigene Hand braucht horizontales Scrollen statt Overflow');
  match(css, /@media \(max-width: 760px\)[\s\S]*?\.hand-human\s*\{[\s\S]*?width:\s*100%;/, 'Mobile Hand braucht volle Breite');
});

test('Setup: 1000 und 2500 werden in der Match-Konfiguration uebernommen', () => {
  const game1000 = createGame({ variantId: 'schieber', matchConfig: { targetScore: 1000 } });
  const game2500 = createGame({ variantId: 'schieber', matchConfig: { targetScore: 2500 } });

  equal(getGameTargetScore(game1000), 1000, '1000er Zielscore wurde nicht gespeichert');
  equal(getGameTargetScore(game2500), 2500, '2500er Zielscore wurde nicht gespeichert');
});

test('Setup: Punkteziel-Auswahl existiert im Setup-HTML', async () => {
  const html = await fetchText('../../public/index.html');
  includes(html, 'setup-target-section', 'Setup-Section fuer Zielscore fehlt');
  includes(html, 'setup-target-options', 'Setup-Buttons fuer Zielscore fehlen');
});

test('App-Smoke: Die Startseite initialisiert die neue Schieber-UI ohne Fehler', async () => {
  const iframe = document.createElement('iframe');
  iframe.src = '../../public/index.html';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Die App-Seite hat nicht rechtzeitig geladen')), 4000);
    iframe.onload = () => {
      window.setTimeout(() => {
        window.clearTimeout(timeout);
        resolve();
      }, 250);
    };
    iframe.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Die App-Seite konnte nicht geladen werden'));
    };
  });

  const appDocument = iframe.contentDocument;
  const rules = appDocument.querySelectorAll('#setup-rules-list li');
  const trumpButtons = [...appDocument.querySelectorAll('.trump-btn')].map((button) => button.textContent.trim());

  assert(rules.length > 0, 'Die Setup-Regeln wurden von app.js nicht initialisiert');
  assert(trumpButtons.some((label) => label.includes('Obe-Abe')), 'Obe-Abe wurde im UI nicht initialisiert');
  assert(trumpButtons.some((label) => label.includes('Une-Ufe')), 'Une-Ufe wurde im UI nicht initialisiert');

  iframe.remove();
});

test('Match-Ende: Schieber endet beim gewaehlten Zielscore', () => {
  const game = createGame({ variantId: 'schieber', matchConfig: { targetScore: 2500 } });
  game.phase = 'playing';
  game.roundMode = 'schellen';
  game.trickNumber = game.variant.handSize - 1;
  game.teams[0].totalScore = 2480;
  game.teams[1].totalScore = 2400;
  game.trick = [
    { playerIndex: 0, card: card('eicheln', 'ass') },
    { playerIndex: 1, card: card('rosen', '6') },
    { playerIndex: 2, card: card('eicheln', '10') },
    { playerIndex: 3, card: card('rosen', '8') },
  ];

  resolveTrick(game);

  equal(game.phase, 'gameOver', 'Die Partie haette nach Erreichen des Ziels enden muessen');
  assert(game.teams[0].totalScore >= 2500, 'Team 0 hat das Ziel nicht erreicht');
});

test('Obe-Abe: Rangfolge und Punkte stimmen', () => {
  const trick = [
    { playerIndex: 0, card: card('rosen', 'koenig') },
    { playerIndex: 1, card: card('rosen', 'ass') },
    { playerIndex: 2, card: card('rosen', 'ober') },
    { playerIndex: 3, card: card('eicheln', 'ass') },
  ];

  equal(trickWinner(trick, 'obeAbe'), 1, 'Im Obe-Abe muss das Ass die Farbe gewinnen');
  equal(trickPoints([
    { playerIndex: 0, card: card('rosen', '8') },
    { playerIndex: 1, card: card('eicheln', '10') },
    { playerIndex: 2, card: card('schellen', 'koenig') },
    { playerIndex: 3, card: card('schilten', 'ass') },
  ], 'obeAbe'), 33, 'Obe-Abe-Punkte muessen 8/10/4/11 zaehlen');
});

test('Une-Ufe: Rangfolge und Punkte stimmen', () => {
  const trick = [
    { playerIndex: 0, card: card('rosen', '7') },
    { playerIndex: 1, card: card('rosen', '6') },
    { playerIndex: 2, card: card('rosen', 'ass') },
    { playerIndex: 3, card: card('eicheln', '6') },
  ];

  equal(trickWinner(trick, 'uneUfe'), 1, 'Im Une-Ufe muss die 6 die Farbe gewinnen');
  equal(trickPoints([
    { playerIndex: 0, card: card('rosen', '6') },
    { playerIndex: 1, card: card('eicheln', '8') },
    { playerIndex: 2, card: card('schellen', 'ass') },
    { playerIndex: 3, card: card('schilten', '10') },
  ], 'uneUfe'), 29, 'Une-Ufe-Punkte muessen 11/8/0/10 zaehlen');
});

test('Obe-Abe und Une-Ufe verwenden kein Trumpfverhalten', () => {
  const hand = [card('eicheln', '6'), card('schellen', 'under'), card('schellen', '9')];
  const trick = [{ playerIndex: 1, card: card('eicheln', 'ass') }];
  const legal = getPlayableCards(hand, trick, 'obeAbe', 'schieber');
  equal(legal.length, 1, 'Bei Farbzwang ohne Trumpf darf nur die Bedienfarbe gespielt werden');
  equal(legal[0].id, 'eicheln_6', 'Es darf nicht auf einen imaginaeren Trumpf ausgewichen werden');

  const noSuitHand = [card('schellen', 'under'), card('schellen', '9')];
  const legalWithoutSuit = getPlayableCards(noSuitHand, trick, 'uneUfe', 'schieber');
  equal(legalWithoutSuit.length, 2, 'Ohne Bedienfarbe darf im Une-Ufe jede Karte gespielt werden');

  const offSuitTrick = [
    { playerIndex: 0, card: card('eicheln', '7') },
    { playerIndex: 1, card: card('schellen', 'ass') },
  ];
  equal(trickWinner(offSuitTrick, 'obeAbe'), 0, 'Eine Fremdfarbe darf ohne Trumpf keinen Stich stechen');
});

test('Weisen: Folgen und vier Gleiche werden erkannt', () => {
  const weisen = detectWeis([
    card('rosen', '6'),
    card('rosen', '7'),
    card('rosen', '8'),
    card('eicheln', '9'),
    card('rosen', '9'),
    card('schellen', '9'),
    card('schilten', '9'),
    card('eicheln', 'ass'),
    card('schellen', 'ass'),
  ], 'obeAbe');

  findWeis(weisen, (weis) => weis.type === 'sequence' && weis.points === 50, '4er-Folge wurde nicht erkannt');
  findWeis(weisen, (weis) => weis.type === 'fourOfKind' && weis.points === 150, '4 Neuner wurden nicht erkannt');
});

test('Weisen: 4 Sechser, 4 Siebner, 4 Achter und 4 Asse zaehlen je 100', () => {
  ['6', '7', '8', 'ass'].forEach((rank) => {
    const weisen = detectWeis([
      card('rosen', rank),
      card('eicheln', rank),
      card('schellen', rank),
      card('schilten', rank),
    ], 'obeAbe');

    const weis = findWeis(weisen, (entry) => entry.type === 'fourOfKind', `4x ${rank} fehlt`);
    equal(weis.points, 100, `4x ${rank} muss 100 Punkte geben`);
  });
});

test('Weisen: Kreuzweis erlaubt Folge plus vier Gleiche', () => {
  const weisen = detectWeis([
    card('rosen', '6'),
    card('rosen', '7'),
    card('rosen', '8'),
    card('eicheln', '8'),
    card('schellen', '8'),
    card('schilten', '8'),
    card('eicheln', 'ass'),
    card('schellen', 'ass'),
    card('schilten', 'ass'),
  ], 'obeAbe');

  findWeis(weisen, (weis) => weis.type === 'sequence' && weis.points === 20, 'Folge fuer Kreuzweis fehlt');
  findWeis(weisen, (weis) => weis.type === 'fourOfKind' && weis.relevantRank === '8', 'Vier Achter fuer Kreuzweis fehlen');
});

test('Weis-Aufloesung: Nur das Team mit dem hoechsten Weis schreibt', () => {
  const game = primeSchieberGame({
    0: [
      card('rosen', '6'),
      card('rosen', '7'),
      card('rosen', '8'),
      card('eicheln', 'ass'),
      card('eicheln', '10'),
      card('schellen', '6'),
      card('schilten', '6'),
      card('schellen', '10'),
      card('schilten', '10'),
    ],
    1: [
      card('rosen', '9'),
      card('eicheln', '9'),
      card('schellen', '9'),
      card('schilten', '9'),
      card('rosen', 'ass'),
      card('eicheln', '7'),
      card('schellen', '7'),
      card('schilten', '7'),
      card('eicheln', '8'),
    ],
    2: [
      card('rosen', '10'),
      card('rosen', 'under'),
      card('rosen', 'ober'),
      card('schellen', 'ass'),
      card('schilten', 'ass'),
      card('eicheln', '6'),
      card('eicheln', '8'),
      card('schellen', '8'),
      card('schilten', '8'),
    ],
    3: [
      card('rosen', 'ass'),
      card('eicheln', '7'),
      card('schellen', '8'),
      card('schilten', '10'),
      card('rosen', 'koenig'),
      card('eicheln', 'under'),
      card('schellen', 'ober'),
      card('schilten', '6'),
      card('rosen', 'ober'),
    ],
  });

  chooseTrump(game, 'obeAbe');
  submitWeisDeclaration(game, 0);
  submitWeisDeclaration(game, 1);
  submitWeisDeclaration(game, 2);
  submitWeisDeclaration(game, 3);

  equal(game.teamWeisScores[0], 0, 'Unterlegenes Team darf keine Weispunkte schreiben');
  equal(game.teamWeisScores[1], 190, 'Siegerteam muss nach dem hoechsten Weis alle eigenen gueltigen Weise schreiben');
});

test('Tie-Break: Folge schlaegt vier Gleiche bei gleicher Punktzahl', () => {
  const sequence = detectWeis([
    card('rosen', '6'),
    card('rosen', '7'),
    card('rosen', '8'),
    card('rosen', '9'),
    card('rosen', '10'),
  ], 'obeAbe')[0];
  const fourOfKind = detectWeis([
    card('rosen', 'ass'),
    card('eicheln', 'ass'),
    card('schellen', 'ass'),
    card('schilten', 'ass'),
  ], 'obeAbe')[0];

  assert(compareWeis(sequence, fourOfKind, 'obeAbe') > 0, 'Folge muss vier Gleiche bei 100 Punkten schlagen');
});

test('Tie-Break: Une-Ufe nimmt die tiefste relevante Karte', () => {
  const lowSequence = detectWeis([
    card('rosen', '6'),
    card('rosen', '7'),
    card('rosen', '8'),
    card('rosen', '9'),
    card('rosen', '10'),
  ], 'uneUfe')[0];
  const highSequence = detectWeis([
    card('eicheln', '7'),
    card('eicheln', '8'),
    card('eicheln', '9'),
    card('eicheln', '10'),
    card('eicheln', 'under'),
  ], 'uneUfe')[0];

  assert(compareWeis(lowSequence, highSequence, 'uneUfe') > 0, 'Im Une-Ufe muss die tiefere Folge gewinnen');
});

test('Tie-Break: Gleiches Weis in Trumpf schlaegt ausserhalb Trumpf', () => {
  const trumpSequence = detectWeis([
    card('rosen', '6'),
    card('rosen', '7'),
    card('rosen', '8'),
  ], 'rosen')[0];
  const offSequence = detectWeis([
    card('eicheln', '6'),
    card('eicheln', '7'),
    card('eicheln', '8'),
  ], 'rosen')[0];

  assert(compareWeis(trumpSequence, offSequence, 'rosen') > 0, 'Trumpf-Folge muss dieselbe Folge ausserhalb Trumpf schlagen');
});

test('Tie-Break: Bei kompletter Gleichheit gewinnt Vorhand / zuerst gemeldet', () => {
  const game = primeSchieberGame({
    0: [
      card('rosen', '6'),
      card('rosen', '7'),
      card('rosen', '8'),
      card('eicheln', 'ass'),
      card('schellen', '10'),
      card('schilten', 'under'),
      card('rosen', 'koenig'),
      card('eicheln', '9'),
      card('schellen', 'ober'),
    ],
    1: [
      card('eicheln', '6'),
      card('eicheln', '7'),
      card('eicheln', '8'),
      card('rosen', 'ass'),
      card('schellen', '10'),
      card('schilten', 'under'),
      card('eicheln', 'koenig'),
      card('rosen', '9'),
      card('schilten', 'ober'),
    ],
    2: [
      card('rosen', '9'),
      card('rosen', 'under'),
      card('eicheln', '10'),
      card('schellen', '6'),
      card('schilten', '7'),
      card('rosen', 'ass'),
      card('eicheln', 'ober'),
      card('schellen', 'koenig'),
      card('schilten', '9'),
      card('schellen', 'ass'),
    ],
    3: [
      card('rosen', 'ober'),
      card('eicheln', 'under'),
      card('schellen', '8'),
      card('schilten', '10'),
      card('rosen', '6'),
      card('eicheln', 'ass'),
      card('schellen', '9'),
      card('schilten', 'koenig'),
      card('rosen', '10'),
    ],
  });

  chooseTrump(game, 'obeAbe');
  submitWeisDeclaration(game, 0);
  submitWeisDeclaration(game, 1);
  submitWeisDeclaration(game, 2);
  submitWeisDeclaration(game, 3);

  equal(game.teamWeisScores[0], 20, 'Vorhand-Team muss den komplett gleichen 20er-Weis schreiben duerfen');
  equal(game.teamWeisScores[1], 0, 'Spaeter gemeldetes Team darf im Gleichstand nichts schreiben');
});

test('2500er-Multiplikatoren werden auf die Rundensumme angewendet', () => {
  const game = createGame({ variantId: 'schieber', matchConfig: { targetScore: 2500 } });
  game.phase = 'playing';
  game.roundMode = 'uneUfe';
  game.teamWeisScores[0] = 20;
  game.trickNumber = game.variant.handSize - 1;
  game.trick = [
    { playerIndex: 0, card: card('rosen', '6') },
    { playerIndex: 1, card: card('rosen', '7') },
    { playerIndex: 2, card: card('eicheln', '8') },
    { playerIndex: 3, card: card('schellen', '10') },
  ];

  resolveTrick(game);

  const ownTeam = game.roundSummary.results.find((result) => result.teamId === 0);
  equal(getRoundMultiplier(game.roundSummary.targetScore, 'uneUfe'), 3, 'Une-Ufe muss im 2500er x3 erhalten');
  equal(ownTeam.basePoints, 54, 'Basispunkte muessen Trick plus Weis enthalten');
  equal(ownTeam.roundPoints, 162, 'Rundensumme muss mit x3 multipliziert werden');
});

async function run() {
  const lines = [];
  let failed = 0;

  for (const entry of tests) {
    try {
      await entry.fn();
      lines.push(`PASS ${entry.name}`);
    } catch (error) {
      failed += 1;
      lines.push(`FAIL ${entry.name}`);
      lines.push(`  ${error.message}`);
    }
  }

  const passed = tests.length - failed;
  resultsEl.dataset.status = failed === 0 ? 'pass' : 'fail';
  resultsEl.textContent = [
    `Status: ${failed === 0 ? 'PASS' : 'FAIL'}`,
    `Tests: ${passed}/${tests.length} erfolgreich`,
    '',
    ...lines,
  ].join('\n');
}

run().catch((error) => {
  resultsEl.dataset.status = 'fail';
  resultsEl.textContent = `Status: FAIL\n\n${error.stack || error.message}`;
});
