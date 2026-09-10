/**
 * Misst zwei KI-Stufen gegeneinander.
 *
 * Beide Teams spielen dieselben Kartenverteilungen (Seeded RNG), damit der
 * Vergleich nicht vom Glueck abhaengt. Spielart waehlt in beiden Faellen dieselbe
 * Heuristik - verglichen wird also das Kartenspiel.
 *
 * Usage: node scripts/benchmark-ai.mjs [stufeA] [stufeB] [partien]
 *   node scripts/benchmark-ai.mjs normal einfach 500
 */

import {
  chooseTrump,
  createGame,
  getGameTargetScore,
  getPlayableCardsForPlayer,
  playCard,
  pushTrumpChoice,
  canPushTrump,
  resolveTrick,
  setRandomSeed,
  startNextTrick,
  startRound,
  submitWeisDeclaration,
} from '../public/game-engine.js';
import { aiChooseCard, bestSchieberMode, shouldPushTrump } from '../public/ai.js';

const [, , levelA = 'normal', levelB = 'einfach', gamesArg = '400'] = process.argv;
const totalGames = Number.parseInt(gamesArg, 10);

function playRound(game, levelByTeam) {
  if (game.phase === 'chooseTrump') {
    const hand = game.players[game.currentPlayer].hand;
    if (canPushTrump(game) && shouldPushTrump(hand, getGameTargetScore(game))) {
      pushTrumpChoice(game);
    }
    chooseTrump(game, bestSchieberMode(game.players[game.currentPlayer].hand, getGameTargetScore(game)));
  }
  while (game.phase === 'announceWeis') {
    submitWeisDeclaration(game, game.currentPlayer);
  }

  for (let trickIndex = 0; trickIndex < game.variant.handSize; trickIndex += 1) {
    for (let seat = 0; seat < game.players.length; seat += 1) {
      const playerIndex = game.currentPlayer;
      const level = levelByTeam[game.players[playerIndex].teamId];
      const card = aiChooseCard(game, playerIndex, level);

      if (getPlayableCardsForPlayer(game, playerIndex).every((entry) => entry.id !== card.id)) {
        throw new Error(`Illegaler Zug von Spieler ${playerIndex} (${level})`);
      }
      if (playCard(game, playerIndex, card.id)) {
        resolveTrick(game);
      }
    }
    if (game.phase === 'trickEnd') {
      startNextTrick(game);
    }
  }
}

function runMatch(seed, levelByTeam) {
  setRandomSeed(seed);
  const game = createGame({ variantId: 'schieber', matchConfig: { targetScore: 1000 } });
  let rounds = 0;

  while (game.phase !== 'gameOver' && rounds < 60) {
    startRound(game);
    playRound(game, levelByTeam);
    rounds += 1;
  }

  return {
    scores: [game.teams[0].totalScore, game.teams[1].totalScore],
    rounds,
  };
}

const tally = { a: 0, b: 0, draw: 0, pointsA: 0, pointsB: 0, rounds: 0 };

for (let seed = 1; seed <= totalGames; seed += 1) {
  // Jede Verteilung zweimal, mit vertauschten Sitzplaetzen.
  const first = runMatch(seed, { 0: levelA, 1: levelB });
  const second = runMatch(seed, { 0: levelB, 1: levelA });

  const results = [
    { a: first.scores[0], b: first.scores[1], rounds: first.rounds },
    { a: second.scores[1], b: second.scores[0], rounds: second.rounds },
  ];

  results.forEach((result) => {
    tally.pointsA += result.a;
    tally.pointsB += result.b;
    tally.rounds += result.rounds;
    if (result.a > result.b) {
      tally.a += 1;
    } else if (result.b > result.a) {
      tally.b += 1;
    } else {
      tally.draw += 1;
    }
  });
}

setRandomSeed(null);

const played = tally.a + tally.b + tally.draw;
const winRate = ((tally.a / played) * 100).toFixed(1);

console.log(`${played} Partien (${totalGames} Verteilungen, Sitzplaetze getauscht)`);
console.log(`  ${levelA}: ${tally.a} Siege | Schnitt ${(tally.pointsA / played).toFixed(0)} Punkte`);
console.log(`  ${levelB}: ${tally.b} Siege | Schnitt ${(tally.pointsB / played).toFixed(0)} Punkte`);
if (tally.draw > 0) {
  console.log(`  Unentschieden: ${tally.draw}`);
}
console.log(`  Siegquote ${levelA}: ${winRate}%`);
console.log(`  Runden pro Partie: ${(tally.rounds / played).toFixed(1)}`);
