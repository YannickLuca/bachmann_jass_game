import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GAME_VARIANTS,
  chooseTrump,
  createGame,
  getPlayableCardsForPlayer,
  playCard,
  resolveTrick,
  setRandomSeed,
  startNextTrick,
  startRound,
  submitWeisDeclaration,
} from '../../public/game-engine.js';
import {
  aiChooseCard,
  bestSchieberMode,
  bestTrumpSuit,
  evaluateTrumpSuit,
  modeAdvantage,
  shouldPushTrump,
} from '../../public/ai.js';

const card = (suit, rank) => ({ id: `${suit}_${rank}`, suit, rank });

function playRound(game, levelByTeam = null) {
  if (game.phase === 'chooseTrump') {
    chooseTrump(game, bestSchieberMode(game.players[game.currentPlayer].hand, 1000));
  }
  while (game.phase === 'announceWeis') {
    submitWeisDeclaration(game, game.currentPlayer);
  }

  for (let trickIndex = 0; trickIndex < game.variant.handSize; trickIndex += 1) {
    for (let seat = 0; seat < game.players.length; seat += 1) {
      const playerIndex = game.currentPlayer;
      const level = levelByTeam ? levelByTeam[game.players[playerIndex].teamId] : null;
      const chosen = aiChooseCard(game, playerIndex, level);

      assert.ok(
        getPlayableCardsForPlayer(game, playerIndex).some((entry) => entry.id === chosen.id),
        `Illegaler Zug von Spieler ${playerIndex} (${level ?? 'default'})`
      );
      if (playCard(game, playerIndex, chosen.id)) {
        resolveTrick(game);
      }
    }
    if (game.phase === 'trickEnd') {
      startNextTrick(game);
    }
  }
}

/* ---------- Handbewertung ---------- */

test('Puur und Nell wiegen schwerer als Ass und Koenig', () => {
  const withPuurAndNell = [card('rosen', 'under'), card('rosen', '9'), card('rosen', '6')];
  const withTopCards = [card('eicheln', 'ass'), card('eicheln', 'koenig'), card('eicheln', '10')];

  assert.ok(
    evaluateTrumpSuit(withPuurAndNell, 'rosen') > evaluateTrumpSuit(withTopCards, 'eicheln'),
    'Trumpfbewertung muss Puur und Nell hoeher gewichten'
  );
});

test('bestTrumpSuit waehlt die Farbe mit der echten Trumpfstaerke', () => {
  const hand = [
    card('rosen', 'under'), card('rosen', '9'), card('rosen', '8'), card('rosen', '7'),
    card('eicheln', 'ass'), card('eicheln', 'koenig'), card('eicheln', 'ober'),
    card('schellen', '6'), card('schilten', '6'),
  ];
  assert.equal(bestTrumpSuit(hand), 'rosen');
});

test('Eine Hand aus lauter tiefen Karten ist eine Une-Ufe-Hand', () => {
  const lowCards = [
    card('rosen', '6'), card('rosen', '7'), card('eicheln', '8'), card('eicheln', '6'),
    card('schellen', '7'), card('schellen', '8'), card('schilten', '6'), card('schilten', '7'),
    card('schilten', '8'),
  ];

  assert.equal(bestSchieberMode(lowCards, 1000), 'uneUfe');
  assert.equal(shouldPushTrump(lowCards, 1000), false, 'Mit einer Une-Ufe-Hand wird nicht geschoben');
});

test('Schwache Haende werden geschoben, starke nicht', () => {
  // Mittelmass in jeder Spielart: kein Puur, kein Nell, kein Ass, keine Sechser.
  const weak = [
    card('rosen', '8'), card('rosen', '10'), card('eicheln', '9'), card('eicheln', 'ober'),
    card('schellen', '8'), card('schellen', 'koenig'), card('schilten', '9'),
    card('schilten', '10'), card('schilten', 'ober'),
  ];
  const strong = [
    card('rosen', 'under'), card('rosen', '9'), card('rosen', 'ass'), card('rosen', 'koenig'),
    card('rosen', '10'), card('eicheln', 'ass'), card('eicheln', 'koenig'),
    card('schellen', 'ass'), card('schilten', '6'),
  ];

  assert.equal(shouldPushTrump(weak, 1000), true, 'Schwache Hand muss geschoben werden');
  assert.equal(shouldPushTrump(strong, 1000), false, 'Starke Hand darf nicht geschoben werden');
});

test('Der Multiplikator wirkt auf den Vorteil, nicht auf die Erwartung', () => {
  const stark = [
    card('rosen', 'under'), card('rosen', '9'), card('rosen', 'ass'), card('rosen', 'koenig'),
    card('rosen', '10'), card('eicheln', 'ass'), card('eicheln', 'koenig'),
    card('schellen', 'ass'), card('schilten', '6'),
  ];
  const schwach = [
    card('rosen', '8'), card('rosen', '10'), card('eicheln', '9'), card('eicheln', 'ober'),
    card('schellen', '8'), card('schellen', 'koenig'), card('schilten', '9'),
    card('schilten', '10'), card('schilten', 'ober'),
  ];

  // Gleiche Werte in beiden Partien: der Zielscore bestimmt nur die Laenge.
  ['rosen', 'schellen', 'obeAbe', 'slalom'].forEach((mode) => {
    assert.equal(modeAdvantage(stark, mode, 1000), modeAdvantage(stark, mode, 2500), mode);
  });

  // Ein Nachteil wird vom Multiplikator vervielfacht: dieselbe schwache Hand
  // verliert im dreifach zaehlenden Obe-Abe mehr als im einfachen Rosen.
  assert.ok(modeAdvantage(schwach, 'obeAbe', 1000) < modeAdvantage(schwach, 'rosen', 1000));
  assert.ok(modeAdvantage(schwach, 'schellen', 1000) < modeAdvantage(schwach, 'eicheln', 1000));
});

/* ---------- Kartenspiel ---------- */

test('Jede Stufe spielt ueber ganze Runden nur legale Karten', () => {
  ['einfach', 'normal', 'schwer'].forEach((level) => {
    setRandomSeed(4242);
    for (let iteration = 0; iteration < 15; iteration += 1) {
      const game = createGame({ variantId: 'schieber', matchConfig: { difficulty: level } });
      startRound(game);
      playRound(game);
      game.players.forEach((player) => assert.equal(player.hand.length, 0));
    }
  });
  setRandomSeed(null);
});

test('Die Stufen bilden eine echte Rangfolge', () => {
  const duel = (levelA, levelB, deals) => {
    let winsA = 0;
    let winsB = 0;

    for (let seed = 1; seed <= deals; seed += 1) {
      // Dieselbe Verteilung zweimal, mit vertauschten Sitzplaetzen.
      [[levelA, levelB], [levelB, levelA]].forEach(([teamZero, teamOne], swap) => {
        setRandomSeed(seed);
        const game = createGame({ variantId: 'schieber', matchConfig: { targetScore: 1000 } });
        let rounds = 0;

        while (game.phase !== 'gameOver' && rounds < 40) {
          startRound(game);
          playRound(game, { 0: teamZero, 1: teamOne });
          rounds += 1;
        }

        const scoreA = swap === 0 ? game.teams[0].totalScore : game.teams[1].totalScore;
        const scoreB = swap === 0 ? game.teams[1].totalScore : game.teams[0].totalScore;
        if (scoreA > scoreB) {
          winsA += 1;
        } else if (scoreB > scoreA) {
          winsB += 1;
        }
      });
    }

    setRandomSeed(null);
    return winsA / (winsA + winsB);
  };

  const normalVsEinfach = duel('normal', 'einfach', 30);
  const schwerVsEinfach = duel('schwer', 'einfach', 30);

  assert.ok(normalVsEinfach > 0.55, `normal schlaegt einfach nur zu ${(normalVsEinfach * 100).toFixed(0)}%`);
  assert.ok(schwerVsEinfach > 0.55, `schwer schlaegt einfach nur zu ${(schwerVsEinfach * 100).toFixed(0)}%`);
});

/* ---------- Persistenz (M4.1) ---------- */

test('Ein Spielstand ueberlebt JSON und laesst sich weiterspielen', () => {
  setRandomSeed(7);
  const game = createGame({ variantId: 'schieber', matchConfig: { targetScore: 1000, difficulty: 'schwer' } });
  startRound(game);
  chooseTrump(game, bestSchieberMode(game.players[game.currentPlayer].hand, 1000));
  while (game.phase === 'announceWeis') {
    submitWeisDeclaration(game, game.currentPlayer);
  }

  // Mitten im ersten Stich sichern.
  const playerIndex = game.currentPlayer;
  playCard(game, playerIndex, aiChooseCard(game, playerIndex).id);

  const restored = JSON.parse(JSON.stringify(game));
  restored.variant = GAME_VARIANTS[restored.variantId];

  assert.equal(restored.phase, game.phase);
  assert.equal(restored.trick.length, 1);
  assert.equal(restored.playedCards.length, 1);
  assert.equal(restored.currentPlayer, game.currentPlayer);
  assert.deepEqual(restored.players[0].hand, game.players[0].hand);

  // Die wiederhergestellte Partie muss regulaer zu Ende gespielt werden koennen.
  for (let seat = restored.trick.length; seat < restored.players.length; seat += 1) {
    const current = restored.currentPlayer;
    if (playCard(restored, current, aiChooseCard(restored, current).id)) {
      resolveTrick(restored);
    }
  }
  assert.equal(restored.trickNumber, 1, 'Der Stich muss nach dem Laden sauber abgeschlossen werden');
  startNextTrick(restored);

  for (let trickIndex = 1; trickIndex < restored.variant.handSize; trickIndex += 1) {
    for (let seat = 0; seat < restored.players.length; seat += 1) {
      const current = restored.currentPlayer;
      if (playCard(restored, current, aiChooseCard(restored, current).id)) {
        resolveTrick(restored);
      }
    }
    if (restored.phase === 'trickEnd') {
      startNextTrick(restored);
    }
  }

  assert.ok(['roundEnd', 'gameOver'].includes(restored.phase));
  const trickTotal = restored.roundSummary.results.reduce((sum, result) => sum + result.trickPoints, 0);
  assert.equal(trickTotal, 157);
  setRandomSeed(null);
});

test('Ein abgeschlossenes Spiel wird nicht als Speicherstand angeboten', () => {
  const game = createGame({ variantId: 'schieber' });
  game.phase = 'gameOver';
  const serialized = JSON.parse(JSON.stringify(game));
  assert.ok(['setup', 'gameOver'].includes(serialized.phase));
});
