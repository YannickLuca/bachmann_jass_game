/**
 * Spielstrategie der Computergegner.
 *
 * Reine lokale Heuristik: keine Netzwerkaufrufe, keine externen Dienste.
 * Die Engine (game-engine.js) bleibt davon unberuehrt und enthaelt nur Regeln.
 *
 * Schwierigkeitsgrade:
 * - einfach: die alte, naive Logik
 * - normal:  Stellungsspiel (Trumpf ziehen, schmieren, billig stechen, sparsam abwerfen)
 * - schwer:  zusaetzlich Kartengedaechtnis (sichere Stiche und sicheres Schmieren erkennen)
 */

import {
  SUITS,
  ROUND_MODE_OPTIONS,
  cardPoints,
  createDeck,
  getGameDifficulty,
  getGameTrickMode,
  getPlayableCardsForPlayer,
  getRoundMultiplier,
  isTrumpMode,
  rankIndex,
  sameSide,
  trickPoints,
  trickWinner,
} from './game-engine.js';

/* ------------------------------------------------------------------ *
 * Handbewertung
 * ------------------------------------------------------------------ */

const TRUMP_STRENGTH = {
  under: 20,
  '9': 14,
  ass: 11,
  koenig: 7,
  ober: 5,
  '10': 3,
  '8': 1,
  '7': 1,
  '6': 1,
};

const SIDE_STRENGTH = {
  ass: 9,
  koenig: 5,
  ober: 3,
  under: 2,
  '10': 2,
  '9': 1,
  '8': 0,
  '7': 0,
  '6': 0,
};

const OBE_ABE_ORDER = ['ass', 'koenig', 'ober', 'under', '10', '9', '8', '7', '6'];
const UNE_UFE_ORDER = [...OBE_ABE_ORDER].reverse();

const HALF_ROUND_POINTS = 78;

/** Bewertet eine Trumpffarbe aus Sicht des Ansagers. */
export function evaluateTrumpSuit(hand, suit) {
  const trumps = hand.filter((card) => card.suit === suit);
  let score = trumps.reduce((sum, card) => sum + TRUMP_STRENGTH[card.rank], 0);

  if (trumps.length > 3) {
    score += (trumps.length - 3) * 6;
  } else if (trumps.length < 3) {
    score -= (3 - trumps.length) * 12;
  }

  SUITS.filter((other) => other !== suit).forEach((other) => {
    const cards = hand.filter((card) => card.suit === other);
    score += cards.reduce((sum, card) => sum + SIDE_STRENGTH[card.rank], 0);
    if (cards.length === 0) {
      score += 6;
    } else if (cards.length === 1) {
      score += 3;
    }
  });

  return Math.max(0, score);
}

/** Bewertet Obe-Abe und Une-Ufe ueber die von oben bzw. unten sicheren Stiche. */
export function evaluateNoTrumpMode(hand, roundMode) {
  const order = roundMode === 'uneUfe' ? UNE_UFE_ORDER : OBE_ABE_ORDER;
  let score = 0;

  SUITS.forEach((suit) => {
    const ranks = new Set(hand.filter((card) => card.suit === suit).map((card) => card.rank));
    if (ranks.size === 0) {
      return;
    }

    let sure = 0;
    for (const rank of order) {
      if (!ranks.has(rank)) {
        break;
      }
      sure += 1;
    }

    score += sure * 14;
    score += Math.max(0, ranks.size - sure);
    if (sure === 0) {
      score -= 4;
    }
  });

  return Math.max(0, score);
}

export function evaluateRoundMode(hand, roundMode) {
  if (isTrumpMode(roundMode)) {
    return evaluateTrumpSuit(hand, roundMode);
  }
  if (roundMode === 'slalom') {
    // Slalom braucht beides: hohe Karten fuer die Obenabe-Stiche und tiefe
    // fuer die Une-Ufe-Stiche.
    return Math.round((evaluateNoTrumpMode(hand, 'obeAbe') + evaluateNoTrumpMode(hand, 'uneUfe')) / 2);
  }
  return evaluateNoTrumpMode(hand, roundMode);
}

/** Uebersetzt eine Handbewertung in erwartete Rundenpunkte. */
function estimateRoundPoints(evaluation) {
  return Math.max(0, Math.min(157, Math.round(evaluation * 1.15)));
}

/**
 * Vorteil gegenueber einer ausgeglichenen Runde.
 * Der Multiplikator vervielfacht die Punkte beider Teams, also zaehlt er auf die
 * Differenz - nicht auf die erwartete Punktzahl.
 */
export function modeAdvantage(hand, roundMode, targetScore = 1000) {
  const estimate = estimateRoundPoints(evaluateRoundMode(hand, roundMode));
  return (estimate - HALF_ROUND_POINTS) * getRoundMultiplier(targetScore, roundMode);
}

export function bestTrumpSuit(hand) {
  return SUITS.reduce((best, suit) =>
    evaluateTrumpSuit(hand, suit) > evaluateTrumpSuit(hand, best) ? suit : best
  );
}

export function bestSchieberMode(hand, targetScore = 1000) {
  return ROUND_MODE_OPTIONS.reduce((best, mode) =>
    modeAdvantage(hand, mode, targetScore) > modeAdvantage(hand, best, targetScore) ? mode : best
  );
}

/** Geschoben wird, wenn die eigene Hand keinen Vorteil verspricht. */
export function shouldPushTrump(hand, targetScore = 1000) {
  return modeAdvantage(hand, bestSchieberMode(hand, targetScore), targetScore) <= 0;
}

export function aiBidDecision(hand, currentHighestBid) {
  const suit = bestTrumpSuit(hand);
  // Kalibriert an gespielten Runden: mit Faktor 0.85 bot die KI im Schnitt 69
  // und holte dann 96 Punkte. Mit 1.1 liegt das Gebot bei 83 gegenueber 91
  // geholten Punkten, die Erfuellungsquote bei rund 70 Prozent.
  const estimate = Math.round(estimateRoundPoints(evaluateTrumpSuit(hand, suit)) * 1.1);
  const proposed = Math.min(140, Math.floor(estimate / 10) * 10);

  if (proposed < 60 || proposed <= currentHighestBid) {
    return 0;
  }
  return proposed;
}

/* ------------------------------------------------------------------ *
 * Kartenspiel
 * ------------------------------------------------------------------ */

/**
 * Im Slalom wechselt die Spielart pro Stich. Alle Stichbewertungen muessen
 * darum die Spielart des laufenden Stichs verwenden, nicht die der Runde.
 */
function trickMode(game) {
  return getGameTrickMode(game);
}

function isTrumpCard(game, card) {
  return isTrumpMode(trickMode(game)) && card.suit === trickMode(game);
}

function wouldWin(game, playerIndex, card) {
  return trickWinner([...game.trick, { playerIndex, card }], trickMode(game)) === playerIndex;
}

/** Karten, die weder gespielt wurden noch auf der eigenen Hand liegen. */
function unseenCards(game, playerIndex) {
  const seen = new Set([
    ...game.playedCards.map((card) => card.id),
    ...game.players[playerIndex].hand.map((card) => card.id),
  ]);
  return createDeck().filter((card) => !seen.has(card.id));
}

/** Konservative Pruefung, ob der Stich nach dieser Karte nicht mehr zu holen ist. */
function isTrickSafe(game, playerIndex, card, leadingPlayerIndex) {
  const simulated = [...game.trick, { playerIndex, card }];
  const openSeats = game.players.length - simulated.length;

  if (openSeats <= 0) {
    return trickWinner(simulated, trickMode(game)) === leadingPlayerIndex;
  }

  return unseenCards(game, playerIndex).every((other) =>
    trickWinner([...simulated, { playerIndex: -1, card: other }], trickMode(game)) !== -1
  );
}

/** Hoechste noch nicht gesehene Karte dieser Farbe schlagen? */
function isHighestRemaining(game, playerIndex, card) {
  return !unseenCards(game, playerIndex).some((other) =>
    other.suit === card.suit && rankIndex(other, trickMode(game)) > rankIndex(card, trickMode(game))
  );
}

const byPointsAscending = (game) => (first, second) =>
  cardPoints(first, trickMode(game)) - cardPoints(second, trickMode(game));
const byPointsDescending = (game) => (first, second) =>
  cardPoints(second, trickMode(game)) - cardPoints(first, trickMode(game));
const byRankAscending = (game) => (first, second) =>
  rankIndex(first, trickMode(game)) - rankIndex(second, trickMode(game));
const byRankDescending = (game) => (first, second) =>
  rankIndex(second, trickMode(game)) - rankIndex(first, trickMode(game));

function suitLength(hand, suit) {
  return hand.filter((card) => card.suit === suit).length;
}

/* ---------------- Ausspielen ---------------- */

function chooseLead(game, playerIndex, legal, useMemory) {
  const hand = game.players[playerIndex].hand;
  const trumps = legal.filter((card) => isTrumpCard(game, card));

  // Als Ansager zuerst Trumpf ziehen, solange man die Kontrolle hat.
  const isChooser = game.chooserPlayer === playerIndex || game.soloPlayer === playerIndex;
  const strongTrump = trumps.some((card) => card.rank === 'under' || card.rank === '9');
  if (trumps.length >= 3 || (isChooser && trumps.length >= 2 && strongTrump)) {
    return [...trumps].sort(byRankDescending(game))[0];
  }

  if (useMemory) {
    const sureWinners = legal
      .filter((card) => !isTrumpCard(game, card))
      .filter((card) => isHighestRemaining(game, playerIndex, card));
    if (sureWinners.length > 0) {
      return [...sureWinners].sort(byPointsDescending(game))[0];
    }
  }

  const sideCards = legal.filter((card) => !isTrumpCard(game, card));
  const candidates = sideCards.length > 0 ? sideCards : legal;

  // Asse in Nebenfarben holen frueh die Punkte heim.
  const aces = candidates.filter((card) => card.rank === 'ass');
  if (aces.length > 0) {
    return [...aces].sort((first, second) => suitLength(hand, second.suit) - suitLength(hand, first.suit))[0];
  }

  // Sonst billig aus der kuerzesten Farbe anspielen.
  return [...candidates].sort((first, second) => {
    const lengthDiff = suitLength(hand, first.suit) - suitLength(hand, second.suit);
    if (lengthDiff !== 0) {
      return lengthDiff;
    }
    return byPointsAscending(game)(first, second);
  })[0];
}

/* ---------------- Bedienen ---------------- */

function chooseDiscard(game, playerIndex, legal) {
  const hand = game.players[playerIndex].hand;
  const keepers = legal.filter((card) => !isTrumpCard(game, card));
  const candidates = keepers.length > 0 ? keepers : legal;

  // Moeglichst eine Farbe leerspielen, dabei so wenig Punkte wie moeglich abgeben.
  return [...candidates].sort((first, second) => {
    const pointDiff = byPointsAscending(game)(first, second);
    if (pointDiff !== 0) {
      return pointDiff;
    }
    return suitLength(hand, first.suit) - suitLength(hand, second.suit);
  })[0];
}

function chooseSmear(game, playerIndex, legal) {
  const nonTrump = legal.filter((card) => !isTrumpCard(game, card));
  const candidates = nonTrump.length > 0 ? nonTrump : legal;
  return [...candidates].sort(byPointsDescending(game))[0];
}

function chooseFollow(game, playerIndex, legal, useMemory) {
  const currentWinner = trickWinner(game.trick, trickMode(game));
  const partnerWinning = sameSide(game, currentWinner, playerIndex) && currentWinner !== playerIndex;
  const isLastSeat = game.trick.length === game.players.length - 1;
  const pointsAtStake = trickPoints(game.trick, trickMode(game));
  const winningCards = legal.filter((card) => wouldWin(game, playerIndex, card));

  if (partnerWinning) {
    const safe = isLastSeat
      || (useMemory && isTrickSafe(game, playerIndex, chooseSmear(game, playerIndex, legal), currentWinner));
    return safe ? chooseSmear(game, playerIndex, legal) : chooseDiscard(game, playerIndex, legal);
  }

  if (winningCards.length === 0) {
    return chooseDiscard(game, playerIndex, legal);
  }

  const cheapNonTrumpWins = winningCards.filter((card) => !isTrumpCard(game, card));
  if (cheapNonTrumpWins.length > 0) {
    return [...cheapNonTrumpWins].sort(byRankAscending(game))[0];
  }

  // Nur Trumpf gewinnt: Trumpf nicht fuer Kleinkram verheizen.
  const trumpsInHand = game.players[playerIndex].hand.filter((card) => isTrumpCard(game, card)).length;
  const worthTrumping = isLastSeat
    ? pointsAtStake >= 4
    : pointsAtStake >= 10 || trumpsInHand >= 4;

  if (!worthTrumping) {
    const discard = chooseDiscard(game, playerIndex, legal);
    if (!isTrumpCard(game, discard)) {
      return discard;
    }
  }

  return [...winningCards].sort(byRankAscending(game))[0];
}

/* ---------------- Einfache Stufe (bisheriges Verhalten) ---------------- */

function chooseSimple(game, playerIndex, legal) {
  if (game.trick.length === 0) {
    const trumps = isTrumpMode(trickMode(game))
      ? legal.filter((card) => card.suit === trickMode(game))
      : [];
    if (trumps.length >= 2) {
      return [...trumps].sort(byRankDescending(game))[0];
    }
    return [...legal].sort(byRankDescending(game))[0];
  }

  const currentWinner = trickWinner(game.trick, trickMode(game));
  const teammateWinning = sameSide(game, currentWinner, playerIndex);
  const winningCards = legal.filter((card) => wouldWin(game, playerIndex, card));

  if (winningCards.length > 0 && !teammateWinning) {
    return [...winningCards].sort(byPointsAscending(game))[0];
  }
  if (teammateWinning) {
    return [...legal].sort(byPointsDescending(game))[0];
  }
  return [...legal].sort(byPointsAscending(game))[0];
}

/* ---------------- Einstiegspunkt ---------------- */

export function aiChooseCard(game, playerIndex, difficultyOverride = null) {
  const difficulty = difficultyOverride || getGameDifficulty(game);
  const legal = getPlayableCardsForPlayer(game, playerIndex);

  if (legal.length === 1) {
    return legal[0];
  }
  if (difficulty === 'einfach') {
    return chooseSimple(game, playerIndex, legal);
  }

  const useMemory = difficulty === 'schwer';
  return game.trick.length === 0
    ? chooseLead(game, playerIndex, legal, useMemory)
    : chooseFollow(game, playerIndex, legal, useMemory);
}
