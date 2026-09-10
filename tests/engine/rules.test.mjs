import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BID_VALUES,
  RULE_SET,
  cardPoints,
  chooseTrump,
  createDeck,
  createGame,
  declineWeis,
  detectWeis,
  compareWeis,
  getLegalCards,
  getPlayableCardsForPlayer,
  getRoundMultiplier,
  getSchieberTeamMatchPoints,
  hasStoeck,
  playCard,
  resolveTrick,
  startNextTrick,
  startRound,
  submitBid,
  submitWeisDeclaration,
} from '../../public/game-engine.js';
import { aiChooseCard } from '../../public/ai.js';

const card = (suit, rank) => ({ id: `${suit}_${rank}`, suit, rank });
const ids = (cards) => cards.map((entry) => entry.id).sort();

/* ---------- M1.1: Bedienpflicht nach offiziellen Regeln ---------- */

test('Bedienpflicht: wer die Farbe hat, muss bedienen', () => {
  const hand = [card('eicheln', '6'), card('schilten', 'ass'), card('schellen', '10')];
  const trick = [
    { playerIndex: 0, card: card('eicheln', 'ass') },
    { playerIndex: 1, card: card('rosen', 'under') },
  ];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'rosen')), ['eicheln_6']);
});

test('Kein Trumpfzwang: ohne Bedienfarbe darf abgeworfen werden', () => {
  const hand = [card('rosen', 'ass'), card('rosen', '6'), card('schilten', 'koenig')];
  const trick = [{ playerIndex: 0, card: card('eicheln', 'ass') }];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'rosen')), ['rosen_6', 'rosen_ass', 'schilten_koenig']);
});

test('Kein Uebertrumpfzwang: hoeherer Trumpf ist erlaubt, nicht Pflicht', () => {
  const hand = [card('rosen', 'ass'), card('schilten', '7'), card('schellen', '10')];
  const trick = [
    { playerIndex: 0, card: card('eicheln', 'ass') },
    { playerIndex: 1, card: card('rosen', '10') },
  ];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'rosen')), ['rosen_ass', 'schellen_10', 'schilten_7']);
});

test('Untertrumpfen ist verboten, solange Fehlkarten in der Hand sind', () => {
  const hand = [card('rosen', '6'), card('schilten', '7')];
  const trick = [
    { playerIndex: 0, card: card('eicheln', 'ass') },
    { playerIndex: 1, card: card('rosen', 'ass') },
  ];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'rosen')), ['schilten_7']);
});

test('Untertrumpfen ist erlaubt, wenn nur noch Trumpf in der Hand liegt', () => {
  const hand = [card('rosen', '6'), card('rosen', '7')];
  const trick = [
    { playerIndex: 0, card: card('eicheln', 'ass') },
    { playerIndex: 1, card: card('rosen', 'ass') },
  ];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'rosen')), ['rosen_6', 'rosen_7']);
});

test('Trumpf darf gespielt werden, obwohl man bedienen koennte', () => {
  const hand = [card('eicheln', '6'), card('rosen', 'under')];
  const trick = [{ playerIndex: 0, card: card('eicheln', 'ass') }];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'rosen')), ['eicheln_6', 'rosen_under']);
});

test('Trumpf angespielt: Trumpf muss bedient werden', () => {
  const hand = [card('rosen', '6'), card('eicheln', 'ass')];
  const trick = [{ playerIndex: 0, card: card('rosen', 'koenig') }];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'rosen')), ['rosen_6']);
});

test('Puur-Ausnahme: der einzige Trumpf-Under muss nicht bedient werden', () => {
  const hand = [card('rosen', 'under'), card('eicheln', 'ass')];
  const trick = [{ playerIndex: 0, card: card('rosen', 'koenig') }];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'rosen')), ['eicheln_ass', 'rosen_under']);
});

test('Obe-Abe und Une-Ufe kennen nur Farbzwang', () => {
  const hand = [card('eicheln', '6'), card('schellen', 'under')];
  const trick = [{ playerIndex: 0, card: card('eicheln', 'ass') }];
  assert.deepEqual(ids(getLegalCards(hand, trick, 'obeAbe')), ['eicheln_6']);
  assert.deepEqual(ids(getLegalCards([card('schellen', 'under')], trick, 'uneUfe')), ['schellen_under']);
});

test('Bieterjass benutzt dieselbe Bedienpflicht wie der Schieber', () => {
  const game = createGame({ variantId: 'bieter' });
  game.phase = 'playing';
  game.roundMode = 'rosen';
  game.trick = [{ playerIndex: 0, card: card('eicheln', 'ass') }];
  game.currentPlayer = 1;
  game.players[1].hand = [card('rosen', 'ass'), card('schilten', '7')];
  assert.deepEqual(ids(getPlayableCardsForPlayer(game, 1)), ['rosen_ass', 'schilten_7']);
});

/* ---------- M1.2: Geber und Vorhand rotieren gemeinsam ---------- */

test('Geber und Vorhand ruecken jede Runde gemeinsam weiter', () => {
  const game = createGame({ variantId: 'schieber' });
  startRound(game);
  const firstDealer = game.dealer;

  assert.equal(game.forehandPlayer, (firstDealer + 1) % 4, 'Vorhand sitzt neben dem Geber');
  assert.ok(
    game.players[game.forehandPlayer].hand.some((entry) => entry.id === 'rosen_7'),
    'Runde 1 startet bei der Rosen 7'
  );

  for (let round = 2; round <= 8; round += 1) {
    startRound(game);
    assert.equal(game.dealer, (firstDealer + round - 1) % 4, `Geber in Runde ${round}`);
    assert.equal(game.forehandPlayer, (game.dealer + 1) % 4, `Vorhand in Runde ${round}`);
    assert.equal(game.chooserPlayer, game.forehandPlayer, 'Vorhand waehlt die Spielart');
  }
});

/* ---------- M2.6: Steigern im Bieterjass ---------- */

test('Bieterjass: gesteigert wird, bis alle bis auf einen passen', () => {
  const game = createGame({ variantId: 'bieter' });
  startRound(game);
  const [first, second, third] = game.biddingOrder;

  submitBid(game, first, 60);
  assert.equal(game.currentPlayer, second);
  submitBid(game, second, 80);
  assert.equal(game.currentPlayer, third);
  submitBid(game, third, 0);
  assert.equal(game.currentPlayer, first, 'Der erste Bieter darf nachziehen');
  submitBid(game, first, 100);
  assert.equal(game.currentPlayer, second);
  submitBid(game, second, 0);

  assert.equal(game.phase, 'chooseTrump');
  assert.equal(game.soloPlayer, first);
  assert.equal(game.highestBid, 100);
});

test('Bieterjass: passen alle, spielt der Geber mit 60', () => {
  const game = createGame({ variantId: 'bieter' });
  startRound(game);
  game.biddingOrder.forEach((playerIndex) => submitBid(game, playerIndex, 0));

  assert.equal(game.phase, 'chooseTrump');
  assert.equal(game.soloPlayer, game.dealer);
  assert.equal(game.highestBid, 60);
});

test('Bieterjass: ein zu tiefes Gebot ist ungueltig', () => {
  const game = createGame({ variantId: 'bieter' });
  startRound(game);
  const [first, second] = game.biddingOrder;
  submitBid(game, first, 80);
  assert.throws(() => submitBid(game, second, 70));
});

/* ---------- M2.1 / M2.2: Stoeck und Match ---------- */

test('Stoeck: Koenig und Ober der Trumpffarbe geben 20 Punkte', () => {
  assert.equal(hasStoeck([card('rosen', 'koenig'), card('rosen', 'ober')], 'rosen'), true);
  assert.equal(hasStoeck([card('rosen', 'koenig'), card('eicheln', 'ober')], 'rosen'), false);
  assert.equal(hasStoeck([card('rosen', 'koenig'), card('rosen', 'ober')], 'obeAbe'), false, 'Kein Stoeck ohne Trumpf');
});

test('Stoeck wird dem Team des Besitzers gutgeschrieben', () => {
  const game = createGame({ variantId: 'schieber' });
  startRound(game);
  const holder = game.players.findIndex((player) => hasStoeck(player.hand, 'rosen'));
  game.currentPlayer = game.forehandPlayer;
  chooseTrump(game, 'rosen');

  if (holder < 0) {
    assert.equal(game.stoeckPlayer, -1);
    return;
  }
  assert.equal(game.stoeckPlayer, holder);
  assert.equal(game.teamStoeckPoints[game.players[holder].teamId], RULE_SET.stoeckPoints);
});

test('Match: alle Stiche einer Runde geben 100 Zusatzpunkte', () => {
  const game = createGame({ variantId: 'schieber' });
  game.roundMode = 'rosen';
  game.players[0].tricksWon = 5;
  game.players[2].tricksWon = 4;
  assert.equal(getSchieberTeamMatchPoints(game, 0), RULE_SET.matchBonus);
  assert.equal(getSchieberTeamMatchPoints(game, 1), 0);

  game.players[2].tricksWon = 3;
  assert.equal(getSchieberTeamMatchPoints(game, 0), 0, 'Ein fehlender Stich ist kein Match');
});

/* ---------- M2.3 / M2.4: Punktetabellen ---------- */

test('2500er-Multiplikatoren folgen der offiziellen Tabelle', () => {
  assert.equal(getRoundMultiplier(2500, 'schellen'), 1);
  assert.equal(getRoundMultiplier(2500, 'schilten'), 1);
  assert.equal(getRoundMultiplier(2500, 'rosen'), 2);
  assert.equal(getRoundMultiplier(2500, 'eicheln'), 2);
  assert.equal(getRoundMultiplier(2500, 'obeAbe'), 3);
  assert.equal(getRoundMultiplier(2500, 'uneUfe'), 4);
  assert.equal(getRoundMultiplier(1000, 'uneUfe'), 1, 'Im 1000er zaehlt alles einfach');
});

test('Vier Sechser zaehlen nicht, vier Under und vier Neuner schon', () => {
  const four = (rank) => detectWeis(
    ['rosen', 'eicheln', 'schellen', 'schilten'].map((suit) => card(suit, rank)),
    'obeAbe'
  );
  assert.deepEqual(four('6'), []);
  assert.equal(four('under')[0].points, 200);
  assert.equal(four('9')[0].points, 150);
  assert.equal(four('ass')[0].points, 100);
  assert.equal(four('7')[0].points, 100);
});

test('Vier Gleiche schlagen die Folge bei gleicher Punktzahl', () => {
  const sequence = detectWeis(['6', '7', '8', '9', '10'].map((rank) => card('rosen', rank)), 'obeAbe')[0];
  const fourOfKind = detectWeis(
    ['rosen', 'eicheln', 'schellen', 'schilten'].map((suit) => card(suit, 'ass')),
    'obeAbe'
  )[0];
  assert.equal(sequence.points, 100);
  assert.equal(fourOfKind.points, 100);
  assert.ok(compareWeis(fourOfKind, sequence, 'obeAbe') > 0);
});

test('Kartenwerte ergeben in jeder Spielart 157 inklusive letztem Stich', () => {
  const deck = createDeck();
  ['rosen', 'obeAbe', 'uneUfe'].forEach((mode) => {
    const total = deck.reduce((sum, entry) => sum + cardPoints(entry, mode), 0);
    assert.equal(total + RULE_SET.lastTrickBonus, 157, `Summe fuer ${mode}`);
  });
});

/* ---------- M2.5: Weis-Verzicht ---------- */

test('Wer verzichtet, schreibt keine Weispunkte', () => {
  const game = createGame({ variantId: 'schieber' });
  startRound(game);
  game.currentPlayer = game.forehandPlayer;
  chooseTrump(game, 'obeAbe');

  while (game.phase === 'announceWeis') {
    declineWeis(game, game.currentPlayer);
  }

  assert.equal(game.teamWeisScores[0], 0);
  assert.equal(game.teamWeisScores[1], 0);
  assert.equal(game.phase, 'playing');
});

/* ---------- Vollsimulation ---------- */

function playFullRound(game) {
  while (game.phase === 'bidding') {
    const hand = game.players[game.currentPlayer].hand;
    const nextBid = BID_VALUES.filter((value) => value > game.highestBid)[0] ?? 0;
    submitBid(game, game.currentPlayer, hand.length % 3 === 0 && nextBid ? nextBid : 0);
  }
  if (game.phase === 'chooseTrump') {
    chooseTrump(game, 'rosen');
  }
  while (game.phase === 'announceWeis') {
    submitWeisDeclaration(game, game.currentPlayer);
  }

  for (let trickIndex = 0; trickIndex < game.variant.handSize; trickIndex += 1) {
    for (let turn = 0; turn < game.players.length; turn += 1) {
      const playerIndex = game.currentPlayer;
      const legal = getPlayableCardsForPlayer(game, playerIndex);
      assert.ok(legal.length > 0, 'Es muss immer mindestens eine legale Karte geben');

      const hand = game.players[playerIndex].hand;
      legal.forEach((entry) => {
        assert.ok(hand.some((handCard) => handCard.id === entry.id), 'Legale Karte muss in der Hand liegen');
      });

      const chosen = aiChooseCard(game, playerIndex);
      assert.ok(legal.some((entry) => entry.id === chosen.id), 'Die KI muss legal spielen');

      if (playCard(game, playerIndex, chosen.id)) {
        resolveTrick(game);
      }
    }
    if (game.phase === 'trickEnd') {
      startNextTrick(game);
    }
  }
  return game;
}

test('Vollsimulation: 200 Schieber-Runden bleiben regelkonform', () => {
  for (let iteration = 0; iteration < 200; iteration += 1) {
    const game = createGame({ variantId: 'schieber', matchConfig: { targetScore: 2500 } });
    startRound(game);
    playFullRound(game);

    assert.ok(['roundEnd', 'gameOver'].includes(game.phase), 'Runde muss sauber enden');
    game.players.forEach((player) => assert.equal(player.hand.length, 0, 'Alle Karten gespielt'));

    const trickTotal = game.roundSummary.results.reduce((sum, result) => sum + result.trickPoints, 0);
    assert.equal(trickTotal, 157, 'Stichpunkte einer Runde ergeben immer 157');

    const tricks = game.roundSummary.results.reduce((sum, result) => sum + result.tricksWon, 0);
    assert.equal(tricks, 9, 'Neun Stiche pro Runde');
  }
});

test('Vollsimulation: 200 Bieterjass-Runden bleiben regelkonform', () => {
  for (let iteration = 0; iteration < 200; iteration += 1) {
    const game = createGame({ variantId: 'bieter' });
    startRound(game);
    playFullRound(game);

    assert.ok(['roundEnd', 'gameOver'].includes(game.phase));
    game.players.forEach((player) => assert.equal(player.hand.length, 0));

    const total = game.players.reduce((sum, player) => sum + player.pointsWon, 0);
    assert.equal(total, 157, 'Stichpunkte einer Runde ergeben immer 157');
  }
});

test('Vollsimulation: eine ganze Partie erreicht den Zielscore', () => {
  const game = createGame({ variantId: 'schieber', matchConfig: { targetScore: 1000 } });
  let rounds = 0;

  while (game.phase !== 'gameOver' && rounds < 100) {
    startRound(game);
    playFullRound(game);
    rounds += 1;
  }

  assert.equal(game.phase, 'gameOver', 'Die Partie muss enden');
  assert.ok(game.teams.some((team) => team.totalScore >= 1000));
});
