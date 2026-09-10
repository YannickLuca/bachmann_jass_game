import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RULE_SET,
  cardPoints,
  chooseTrump,
  createGame,
  declineWeis,
  getGameTrickMode,
  getPlayableCardsForPlayer,
  getRoundMultiplier,
  getTrickMode,
  hasStoeck,
  playCard,
  rankIndex,
  resolveTrick,
  setRandomSeed,
  startNextTrick,
  startRound,
  submitWeisDeclaration,
  trickWinner,
} from '../../public/game-engine.js';
import { aiChooseCard } from '../../public/ai.js';

const card = (suit, rank) => ({ id: `${suit}_${rank}`, suit, rank });

/* ---------- Slalom ---------- */

test('Slalom wechselt die Spielart mit jedem Stich', () => {
  assert.equal(getTrickMode('slalom', 0), 'obeAbe', 'erster Stich obenabe');
  assert.equal(getTrickMode('slalom', 1), 'uneUfe', 'zweiter Stich unten-ufe');
  assert.equal(getTrickMode('slalom', 2), 'obeAbe');
  assert.equal(getTrickMode('slalom', 8), 'obeAbe', 'neunter Stich wieder obenabe');
  assert.equal(getTrickMode('rosen', 3), 'rosen', 'andere Spielarten bleiben gleich');
});

test('Slalom: im ersten Stich sticht das Ass, im zweiten die Sechs', () => {
  const trick = [
    { playerIndex: 0, card: card('rosen', '6') },
    { playerIndex: 1, card: card('rosen', 'ass') },
    { playerIndex: 2, card: card('rosen', '10') },
    { playerIndex: 3, card: card('rosen', '7') },
  ];

  assert.equal(trickWinner(trick, getTrickMode('slalom', 0)), 1, 'obenabe gewinnt das Ass');
  assert.equal(trickWinner(trick, getTrickMode('slalom', 1)), 0, 'unten-ufe gewinnt die Sechs');
});

test('Slalom: Kartenwerte folgen der Spielart des Stichs', () => {
  assert.equal(cardPoints(card('rosen', 'ass'), getTrickMode('slalom', 0)), 11);
  assert.equal(cardPoints(card('rosen', 'ass'), getTrickMode('slalom', 1)), 0);
  assert.equal(cardPoints(card('rosen', '6'), getTrickMode('slalom', 0)), 0);
  assert.equal(cardPoints(card('rosen', '6'), getTrickMode('slalom', 1)), 11);
});

test('Slalom kennt keinen Trumpf und zaehlt dreifach', () => {
  assert.equal(getRoundMultiplier('slalom'), 3);
  assert.equal(rankIndex(card('rosen', 'under'), 'slalom'), rankIndex(card('rosen', 'under'), 'obeAbe'));
});

test('Slalom: eine ganze Runde bleibt regelkonform', () => {
  setRandomSeed(31);

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const game = createGame({ variantId: 'schieber' });
    startRound(game);
    game.currentPlayer = game.forehandPlayer;
    chooseTrump(game, 'slalom');
    while (game.phase === 'announceWeis') {
      submitWeisDeclaration(game, game.currentPlayer);
    }

    const modes = [];
    for (let trick = 0; trick < game.variant.handSize; trick += 1) {
      modes.push(getGameTrickMode(game));
      for (let seat = 0; seat < game.players.length; seat += 1) {
        const playerIndex = game.currentPlayer;
        const legal = getPlayableCardsForPlayer(game, playerIndex);
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

    assert.deepEqual(
      modes,
      ['obeAbe', 'uneUfe', 'obeAbe', 'uneUfe', 'obeAbe', 'uneUfe', 'obeAbe', 'uneUfe', 'obeAbe'],
      'Die Spielarten muessen sich abwechseln'
    );

    const trickTotal = game.roundSummary.results.reduce((sum, result) => sum + result.trickPoints, 0);
    // Asse zaehlen nur in Obenabe-Stichen, Sechser nur in Une-Ufe-Stichen.
    // Die feste Basis betraegt 108 Punkte, dazu bis zu 44 + 44 und der letzte Stich.
    assert.ok(
      trickTotal >= 108 + RULE_SET.lastTrickBonus && trickTotal <= 196 + RULE_SET.lastTrickBonus,
      `Rundensumme ${trickTotal} liegt ausserhalb des moeglichen Bereichs`
    );
    game.players.forEach((player) => assert.equal(player.hand.length, 0));
  }

  setRandomSeed(null);
});

/* ---------- Stöck ---------- */

/** Legt Trumpf-Koenig und -Ober gezielt auf die Hand von Spieler 0. */
function primeStoeckGame(trumpSuit = 'rosen') {
  const game = createGame({ variantId: 'schieber' });
  startRound(game);

  const wanted = [`${trumpSuit}_koenig`, `${trumpSuit}_ober`];
  const pool = [];

  game.players.forEach((player) => {
    player.hand = player.hand.filter((entry) => {
      if (wanted.includes(entry.id)) {
        pool.push(entry);
        return false;
      }
      return true;
    });
  });

  const holder = game.players[0];
  holder.hand.push(...pool);

  // Ueberzaehlige Karten des Halters an die zu kurzen Haende abgeben.
  game.players.forEach((player, index) => {
    if (index === 0) {
      return;
    }
    while (player.hand.length < game.variant.handSize) {
      const donorIndex = holder.hand.findIndex((entry) => !wanted.includes(entry.id));
      player.hand.push(holder.hand.splice(donorIndex, 1)[0]);
    }
  });

  game.currentPlayer = game.forehandPlayer;
  chooseTrump(game, trumpSuit);
  return game;
}

test('Stöck wird beim Weisen noch nicht angesagt', () => {
  setRandomSeed(5);
  const game = primeStoeckGame();

  assert.equal(hasStoeck(game.players[0].hand, 'rosen'), true, 'Testaufbau: Spieler 0 hat Stöck');
  assert.equal(game.stoeckPlayer, 0);
  assert.equal(game.stoeckAnnounced, false, 'Vor dem Spielen darf nichts angesagt sein');
  assert.equal(game.teamStoeckPoints[0], 0, 'Und es darf noch nichts geschrieben sein');
  setRandomSeed(null);
});

test('Stöck zaehlt, sobald die zweite der beiden Karten gespielt ist', () => {
  setRandomSeed(6);
  const game = primeStoeckGame();

  while (game.phase === 'announceWeis') {
    declineWeis(game, game.currentPlayer);
  }
  assert.equal(game.stoeckAnnounced, false, 'Ohne Weis-Meldung bleibt es offen');

  game.phase = 'playing';
  game.trick = [];
  game.currentPlayer = 0;
  playCard(game, 0, 'rosen_koenig');
  assert.equal(game.stoeckAnnounced, false, 'Nach der ersten Karte noch nicht');

  game.trick = [];
  game.currentPlayer = 0;
  playCard(game, 0, 'rosen_ober');

  assert.equal(game.stoeckAnnounced, true, 'Nach der zweiten Karte schon');
  assert.equal(game.teamStoeckPoints[0], RULE_SET.stoeckPoints);
  assert.ok(game.log.some((line) => line.includes('Stöck')), 'Die Ansage gehoert ins Protokoll');
  setRandomSeed(null);
});

test('Ein Weis mit beiden Stöck-Karten sagt das Stöck gleich mit an', () => {
  const game = createGame({ variantId: 'schieber' });
  startRound(game);

  // Under, Ober und Koenig im Trumpf als Dreiblatt auf die Hand des Spielers.
  const sequence = ['under', 'ober', 'koenig'].map((rank) => card('rosen', rank));
  const rest = game.players[0].hand
    .filter((entry) => !sequence.some((wanted) => wanted.id === entry.id))
    .slice(0, game.variant.handSize - sequence.length);
  game.players[0].hand = [...sequence, ...rest];
  game.players.slice(1).forEach((player) => {
    player.hand = player.hand.filter((entry) => !sequence.some((wanted) => wanted.id === entry.id));
  });

  game.currentPlayer = game.forehandPlayer;
  chooseTrump(game, 'rosen');

  assert.equal(game.stoeckPlayer, 0);
  assert.equal(game.stoeckAnnounced, false);

  // Der Spieler meldet sein Dreiblatt.
  while (game.phase === 'announceWeis' && game.currentPlayer !== 0) {
    declineWeis(game, game.currentPlayer);
  }
  submitWeisDeclaration(game, 0);

  assert.equal(game.stoeckAnnounced, true, 'Das Stöck steckt im gemeldeten Weis');
  assert.equal(game.teamStoeckPoints[0], RULE_SET.stoeckPoints);
  assert.ok(
    game.log.some((line) => line.includes('Stöck') && line.includes('Weis')),
    'Das Protokoll soll den Grund nennen'
  );
});
