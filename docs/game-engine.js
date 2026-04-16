export const SUITS = ['eicheln', 'rosen', 'schellen', 'schilten'];
export const SUIT_LABELS = {
  eicheln: 'Eicheln',
  rosen: 'Rosen',
  schellen: 'Schellen',
  schilten: 'Schilten',
};

export const ROUND_MODE_OPTIONS = [...SUITS, 'obeAbe', 'uneUfe'];
export const ROUND_MODE_LABELS = {
  eicheln: 'Eicheln',
  rosen: 'Rosen',
  schellen: 'Schellen',
  schilten: 'Schilten',
  obeAbe: 'Obe-Abe',
  uneUfe: 'Une-Ufe',
};

export const SCHIEBER_TARGET_SCORES = [1000, 2500];

export const RANKS = ['6', '7', '8', '9', '10', 'under', 'ober', 'koenig', 'ass'];
export const RANK_LABELS = {
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  under: 'Under',
  ober: 'Ober',
  koenig: 'Koenig',
  ass: 'Ass',
};

const BASE_POINTS = {
  ass: 11,
  koenig: 4,
  ober: 3,
  under: 2,
  '10': 10,
  '9': 0,
  '8': 0,
  '7': 0,
  '6': 0,
};

const TRUMP_POINTS = {
  ass: 11,
  koenig: 4,
  ober: 3,
  under: 20,
  '10': 10,
  '9': 14,
  '8': 0,
  '7': 0,
  '6': 0,
};

const OBE_ABE_POINTS = {
  ass: 11,
  koenig: 4,
  ober: 3,
  under: 2,
  '10': 10,
  '9': 0,
  '8': 8,
  '7': 0,
  '6': 0,
};

const UNE_UFE_POINTS = {
  ass: 0,
  koenig: 4,
  ober: 3,
  under: 2,
  '10': 10,
  '9': 0,
  '8': 8,
  '7': 0,
  '6': 11,
};

const BASE_ORDER = ['6', '7', '8', '9', '10', 'under', 'ober', 'koenig', 'ass'];
const TRUMP_ORDER = ['6', '7', '8', '10', 'ober', 'koenig', 'ass', '9', 'under'];
const UNE_UFE_ORDER = ['ass', 'koenig', 'ober', 'under', '10', '9', '8', '7', '6'];
const HAND_SUIT_ORDER = ['rosen', 'eicheln', 'schellen', 'schilten'];
const HAND_SUIT_INDEX = Object.fromEntries(HAND_SUIT_ORDER.map((suit, index) => [suit, index]));
const HAND_RANK_INDEX = Object.fromEntries(BASE_ORDER.map((rank, index) => [rank, index]));
const NATURAL_RANK_INDEX = Object.fromEntries(BASE_ORDER.map((rank, index) => [rank, index]));
const SCHIEBER_START_CARD_ID = 'rosen_7';
const SEQUENCE_POINTS = {
  3: 20,
  4: 50,
  5: 100,
  6: 150,
  7: 200,
  8: 250,
  9: 300,
};

export const BID_VALUES = [0, 60, 70, 80, 90, 100, 110, 120, 130, 140, 157];

export const GAME_VARIANTS = {
  bieter: {
    id: 'bieter',
    label: 'Bieterjass',
    setupSubtitle: '3 Spieler - du spielst alleine gegen 2 Computer',
    playerCount: 3,
    handSize: 12,
    dealPacketSize: 3,
    targetScore: 1500,
    modeLabel: 'Bieterjass',
    rules: [
      '36 Karten (6 bis Ass), 12 Karten pro Spieler, in 3er-Paketen verteilt.',
      'Jeder bietet genau einmal. Das hoechste Gebot spielt alleine gegen die anderen zwei.',
      'Der Hoechstbietende waehlt die Trumpffarbe.',
      'Vereinfachte Bedienpflicht mit Trumpfstechen wie in der bisherigen Lokalversion.',
      'Erfuellt der Bieter sein Gebot, erhaelt er den Gebotswert. Sonst verliert er ihn.',
      'Ziel: zuerst 1500 Spielpunkte erreichen.',
    ],
  },
  schieber: {
    id: 'schieber',
    label: 'Schieber Jass',
    setupSubtitle: '4 Spieler - du spielst mit einem Partner gegen 2 Computer',
    playerCount: 4,
    handSize: 9,
    dealPacketSize: 3,
    targetScore: 1000,
    modeLabel: 'Schieber',
    rules: [
      '36 Karten (6 bis Ass), 9 Karten pro Spieler, in 3er-Paketen verteilt.',
      'Es wird zu viert in festen Teams gespielt: du mit Partner gegen 2 Computer.',
      'Vorhand waehlt Trumpf, Obe-Abe oder Une-Ufe oder schiebt die Wahl einmal an den Partner weiter.',
      'Vor dem ersten Stich wird eine Weis-Phase gespielt. Nur das Team mit dem hoechsten Weis schreibt.',
      'Zielscore ist 1000 oder 2500. Im 2500er-Spiel gelten Spielart-Multiplikatoren pro Runde.',
      'Letzter Stich gibt in jeder Schieber-Runde 5 Zusatzpunkte.',
    ],
  },
};

function getVariantOrThrow(variantId) {
  const variant = GAME_VARIANTS[variantId];
  if (!variant) {
    throw new Error(`Unbekannte Jassart: ${variantId}`);
  }
  return variant;
}

export function isTrumpMode(roundMode) {
  return SUITS.includes(roundMode);
}

export function isNoTrumpMode(roundMode) {
  return roundMode === 'obeAbe' || roundMode === 'uneUfe';
}

export function getRoundModeLabel(roundMode) {
  return ROUND_MODE_LABELS[roundMode] || '';
}

export function normalizeSchieberTargetScore(targetScore) {
  return SCHIEBER_TARGET_SCORES.includes(targetScore) ? targetScore : 1000;
}

function normalizeMatchConfig(variantId, matchConfig = {}) {
  if (variantId !== 'schieber') {
    return {
      targetScore: GAME_VARIANTS[variantId].targetScore,
    };
  }

  return {
    targetScore: normalizeSchieberTargetScore(matchConfig.targetScore),
  };
}

export function getGameTargetScore(game) {
  return game.matchConfig?.targetScore ?? game.variant.targetScore;
}

export function getRoundMultiplier(gameOrTargetScore, maybeRoundMode = null) {
  const targetScore = typeof gameOrTargetScore === 'number'
    ? normalizeSchieberTargetScore(gameOrTargetScore)
    : getGameTargetScore(gameOrTargetScore);
  const roundMode = typeof gameOrTargetScore === 'number'
    ? maybeRoundMode
    : gameOrTargetScore.roundMode;

  if (targetScore !== 2500) {
    return 1;
  }
  if (roundMode === 'obeAbe' || roundMode === 'uneUfe') {
    return 3;
  }
  if (roundMode === 'schellen' || roundMode === 'schilten') {
    return 2;
  }
  return 1;
}

export function cardImagePath(card) {
  return `assets/jasskarten_deck_png_sharper/${card.suit}_${card.rank}.png`;
}

export function cardLabel(card) {
  return `${SUIT_LABELS[card.suit]} ${RANK_LABELS[card.rank]}`;
}

export function cardPoints(card, roundMode = null) {
  if (roundMode === 'obeAbe') {
    return OBE_ABE_POINTS[card.rank];
  }
  if (roundMode === 'uneUfe') {
    return UNE_UFE_POINTS[card.rank];
  }
  return card.suit === roundMode ? TRUMP_POINTS[card.rank] : BASE_POINTS[card.rank];
}

export function rankIndex(card, roundMode = null) {
  if (roundMode === 'uneUfe') {
    return UNE_UFE_ORDER.indexOf(card.rank);
  }
  return card.suit === roundMode
    ? TRUMP_ORDER.indexOf(card.rank)
    : BASE_ORDER.indexOf(card.rank);
}

export function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({
    id: `${suit}_${rank}`,
    suit,
    rank,
  })));
}

function shuffle(cards) {
  const deck = [...cards];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

export function sortPlayerHand(hand) {
  return [...hand].sort((first, second) => {
    if (first.suit !== second.suit) {
      return HAND_SUIT_INDEX[first.suit] - HAND_SUIT_INDEX[second.suit];
    }
    return HAND_RANK_INDEX[first.rank] - HAND_RANK_INDEX[second.rank];
  });
}

export function dealHands(playerCount, packetSize = 3, dealer = playerCount - 1) {
  const shuffled = shuffle(createDeck());
  const hands = Array.from({ length: playerCount }, () => []);
  const dealOrder = Array.from(
    { length: playerCount },
    (_, index) => (dealer + 1 + index) % playerCount
  );
  const targetHandSize = shuffled.length / playerCount;
  let deckIndex = 0;

  while (deckIndex < shuffled.length) {
    for (const playerIndex of dealOrder) {
      for (
        let packetCard = 0;
        packetCard < packetSize && hands[playerIndex].length < targetHandSize && deckIndex < shuffled.length;
        packetCard += 1
      ) {
        hands[playerIndex].push(shuffled[deckIndex]);
        deckIndex += 1;
      }
    }
  }

  return hands;
}

function createPlayers(variantId, playerName) {
  if (variantId === 'bieter') {
    return [
      { id: 0, name: playerName, isHuman: true, teamId: 0, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
      { id: 1, name: 'Yannick', isHuman: false, teamId: 1, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
      { id: 2, name: 'Papsli', isHuman: false, teamId: 1, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
    ];
  }

  return [
    { id: 0, name: playerName, isHuman: true, teamId: 0, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
    { id: 1, name: 'Yannick', isHuman: false, teamId: 1, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
    { id: 2, name: 'Papsli', isHuman: false, teamId: 0, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
    { id: 3, name: 'Gusti', isHuman: false, teamId: 1, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
  ];
}

function createTeams(variantId, players) {
  if (variantId !== 'schieber') {
    return [];
  }

  return [
    { id: 0, name: `${players[2].name} + ${players[0].name}`, playerIds: [0, 2], totalScore: 0 },
    { id: 1, name: `${players[1].name} + ${players[3].name}`, playerIds: [1, 3], totalScore: 0 },
  ];
}

export function createGame({ variantId = 'bieter', playerName = 'Du', matchConfig = {} } = {}) {
  const variant = getVariantOrThrow(variantId);
  const players = createPlayers(variantId, playerName || 'Du');

  return {
    variantId,
    variant,
    matchConfig: normalizeMatchConfig(variantId, matchConfig),
    players,
    teams: createTeams(variantId, players),
    phase: 'setup',
    dealer: variant.playerCount - 1,
    currentPlayer: 0,
    biddingOrder: [],
    biddingIndex: 0,
    highestBid: 0,
    highestBidder: -1,
    roundMode: null,
    trumpSuit: null,
    soloPlayer: -1,
    chooserPlayer: -1,
    forehandPlayer: -1,
    trumpWasPushed: false,
    trick: [],
    trickLeader: -1,
    trickNumber: 0,
    capturedCards: { 0: [], 1: [] },
    capturedTricks: { 0: 0, 1: 0 },
    capturedPileOwners: { 0: 0, 1: 1 },
    firstCapturedTrick: null,
    lastCapturedPile: null,
    teamWeisScores: { 0: 0, 1: 0 },
    teamWeisBreakdown: { 0: [], 1: [] },
    weisState: null,
    log: [],
    roundSummary: null,
    roundNumber: 0,
  };
}

export function isBieter(game) {
  return game.variantId === 'bieter';
}

export function isSchieber(game) {
  return game.variantId === 'schieber';
}

export function nextPlayerIndex(game, playerIndex) {
  return (playerIndex + 1) % game.players.length;
}

export function partnerOf(game, playerIndex) {
  if (!isSchieber(game)) {
    return -1;
  }
  return (playerIndex + 2) % game.players.length;
}

export function getPlayerTeam(game, playerIndex) {
  if (!isSchieber(game)) {
    return null;
  }
  return game.teams.find((team) => team.playerIds.includes(playerIndex)) || null;
}

export function getDisplayScore(game, playerIndex) {
  if (isBieter(game)) {
    return game.players[playerIndex].totalScore;
  }
  const team = getPlayerTeam(game, playerIndex);
  return team ? team.totalScore : 0;
}

export function sameSide(game, firstPlayerIndex, secondPlayerIndex) {
  if (firstPlayerIndex < 0 || secondPlayerIndex < 0) {
    return false;
  }
  return game.players[firstPlayerIndex].teamId === game.players[secondPlayerIndex].teamId;
}

function resetRoundPlayerState(player) {
  player.hand = [];
  player.bid = null;
  player.tricksWon = 0;
  player.pointsWon = 0;
}

function roundHeader(game) {
  const targetInfo = isSchieber(game) ? ` - Ziel ${getGameTargetScore(game)}` : '';
  return `Runde ${game.roundNumber} - ${game.variant.label}${targetInfo} - Geber: ${game.players[game.dealer].name}`;
}

function playerIndexWithCard(hands, cardId) {
  const playerIndex = hands.findIndex((hand) => hand.some((card) => card.id === cardId));
  return playerIndex >= 0 ? playerIndex : 0;
}

export function startRound(game) {
  game.roundNumber += 1;
  game.dealer = (game.dealer + 1) % game.players.length;
  game.currentPlayer = 0;
  game.biddingOrder = [];
  game.biddingIndex = 0;
  game.highestBid = 0;
  game.highestBidder = -1;
  game.roundMode = null;
  game.trumpSuit = null;
  game.soloPlayer = -1;
  game.chooserPlayer = -1;
  game.forehandPlayer = -1;
  game.trumpWasPushed = false;
  game.trick = [];
  game.trickLeader = -1;
  game.trickNumber = 0;
  game.capturedCards = { 0: [], 1: [] };
  game.capturedTricks = { 0: 0, 1: 0 };
  game.capturedPileOwners = { 0: 0, 1: 1 };
  game.firstCapturedTrick = null;
  game.lastCapturedPile = null;
  game.teamWeisScores = { 0: 0, 1: 0 };
  game.teamWeisBreakdown = { 0: [], 1: [] };
  game.weisState = null;
  game.roundSummary = null;

  const hands = dealHands(game.variant.playerCount, game.variant.dealPacketSize, game.dealer);
  game.players.forEach((player, playerIndex) => {
    resetRoundPlayerState(player);
    player.hand = sortPlayerHand(hands[playerIndex]);
  });

  game.log = [roundHeader(game)];
  game.log.push(`Gemischt und in ${game.variant.dealPacketSize}er-Paketen verteilt.`);

  if (isBieter(game)) {
    const order = [];
    let current = nextPlayerIndex(game, game.dealer);
    while (order.length < game.players.length) {
      order.push(current);
      current = nextPlayerIndex(game, current);
    }
    game.biddingOrder = order;
    game.currentPlayer = order[0];
    game.phase = 'bidding';
    return;
  }

  game.forehandPlayer = playerIndexWithCard(hands, SCHIEBER_START_CARD_ID);
  game.chooserPlayer = game.forehandPlayer;
  game.currentPlayer = game.forehandPlayer;
  game.phase = 'chooseTrump';
  game.log.push(`${game.players[game.forehandPlayer].name} hat die Rosen 7, ist Vorhand und waehlt Spielart oder schiebt.`);
}

export function submitBid(game, playerIndex, bidValue) {
  if (!isBieter(game)) {
    throw new Error('Gebote gibt es nur im Bieterjass.');
  }
  if (game.phase !== 'bidding') {
    throw new Error('Nicht in der Bietrunde.');
  }
  if (playerIndex !== game.currentPlayer) {
    throw new Error('Dieser Spieler ist nicht am Zug.');
  }
  if (!BID_VALUES.includes(bidValue)) {
    throw new Error('Ungueltiger Gebotswert.');
  }
  if (bidValue !== 0 && bidValue <= game.highestBid) {
    throw new Error(`Gebot muss hoeher als ${game.highestBid} sein.`);
  }

  const player = game.players[playerIndex];
  player.bid = bidValue;

  if (bidValue > game.highestBid) {
    game.highestBid = bidValue;
    game.highestBidder = playerIndex;
  }

  game.log.push(bidValue === 0 ? `${player.name}: Pass` : `${player.name}: bietet ${bidValue}`);

  game.biddingIndex += 1;
  if (game.biddingIndex < game.biddingOrder.length) {
    game.currentPlayer = game.biddingOrder[game.biddingIndex];
    return;
  }

  finishBidding(game);
}

function finishBidding(game) {
  if (game.highestBidder === -1) {
    game.highestBidder = game.dealer;
    game.highestBid = 60;
    game.players[game.dealer].bid = 60;
    game.log.push(`Alle passen - ${game.players[game.dealer].name} muss mit 60 spielen.`);
  }

  game.soloPlayer = game.highestBidder;
  game.currentPlayer = game.highestBidder;
  game.chooserPlayer = game.highestBidder;
  game.phase = 'chooseTrump';
  game.log.push(`${game.players[game.soloPlayer].name} gewinnt das Gebot mit ${game.highestBid}.`);
}

export function canPushTrump(game) {
  return (
    isSchieber(game)
    && game.phase === 'chooseTrump'
    && !game.trumpWasPushed
    && game.currentPlayer === game.forehandPlayer
  );
}

export function pushTrumpChoice(game) {
  if (!canPushTrump(game)) {
    throw new Error('Schieben ist aktuell nicht moeglich.');
  }

  const partnerIndex = partnerOf(game, game.forehandPlayer);
  game.trumpWasPushed = true;
  game.chooserPlayer = partnerIndex;
  game.currentPlayer = partnerIndex;
  game.log.push(`${game.players[game.forehandPlayer].name} schiebt. ${game.players[partnerIndex].name} waehlt die Spielart.`);
}

function getAnnouncementOrder(game) {
  const order = [];
  let current = game.forehandPlayer;
  while (order.length < game.players.length) {
    order.push(current);
    current = nextPlayerIndex(game, current);
  }
  return order;
}

function createSequenceWeis(cards, roundMode) {
  const orderedCards = [...cards].sort((first, second) => NATURAL_RANK_INDEX[first.rank] - NATURAL_RANK_INDEX[second.rank]);
  const lowRank = orderedCards[0].rank;
  const highRank = orderedCards[orderedCards.length - 1].rank;
  const points = SEQUENCE_POINTS[orderedCards.length];

  return {
    id: `sequence:${orderedCards[0].suit}:${lowRank}:${highRank}`,
    type: 'sequence',
    points,
    suit: orderedCards[0].suit,
    ranks: orderedCards.map((card) => card.rank),
    cards: orderedCards.map((card) => card.id),
    length: orderedCards.length,
    lowRank,
    highRank,
    relevantRank: roundMode === 'uneUfe' ? lowRank : highRank,
  };
}

function createFourOfKindWeis(cards) {
  const rank = cards[0].rank;
  const points = rank === 'under' ? 200 : rank === '9' ? 150 : 100;

  return {
    id: `fourOfKind:${rank}`,
    type: 'fourOfKind',
    points,
    suit: null,
    ranks: [rank, rank, rank, rank],
    cards: cards.map((card) => card.id),
    length: 4,
    lowRank: rank,
    highRank: rank,
    relevantRank: rank,
  };
}

export function compareWeis(first, second, roundMode) {
  if (!first && !second) {
    return 0;
  }
  if (!first) {
    return -1;
  }
  if (!second) {
    return 1;
  }
  if (first.points !== second.points) {
    return first.points > second.points ? 1 : -1;
  }
  if (first.type !== second.type) {
    return first.type === 'sequence' ? 1 : -1;
  }

  const firstRank = NATURAL_RANK_INDEX[first.relevantRank];
  const secondRank = NATURAL_RANK_INDEX[second.relevantRank];
  if (firstRank !== secondRank) {
    if (roundMode === 'uneUfe') {
      return firstRank < secondRank ? 1 : -1;
    }
    return firstRank > secondRank ? 1 : -1;
  }

  const firstTrumpWise = isTrumpMode(roundMode) && first.type === 'sequence' && first.suit === roundMode;
  const secondTrumpWise = isTrumpMode(roundMode) && second.type === 'sequence' && second.suit === roundMode;
  if (firstTrumpWise !== secondTrumpWise) {
    return firstTrumpWise ? 1 : -1;
  }

  return 0;
}

function sortWeisDescending(weisen, roundMode) {
  return [...weisen].sort((first, second) => {
    const comparison = compareWeis(second, first, roundMode);
    if (comparison !== 0) {
      return comparison;
    }
    return first.id.localeCompare(second.id);
  });
}

export function describeWeis(weis) {
  if (!weis) {
    return 'Kein Weis';
  }
  if (weis.type === 'sequence') {
    return `${weis.points}er Folge ${SUIT_LABELS[weis.suit]} ${RANK_LABELS[weis.lowRank]}-${RANK_LABELS[weis.highRank]}`;
  }
  return `${weis.points} fuer 4x ${RANK_LABELS[weis.relevantRank]}`;
}

export function detectWeis(hand, roundMode = null) {
  const sequences = [];
  const bySuit = Object.fromEntries(SUITS.map((suit) => [suit, []]));
  hand.forEach((card) => {
    bySuit[card.suit].push(card);
  });

  SUITS.forEach((suit) => {
    const suitedCards = bySuit[suit]
      .slice()
      .sort((first, second) => NATURAL_RANK_INDEX[first.rank] - NATURAL_RANK_INDEX[second.rank]);
    let run = [];

    suitedCards.forEach((card, index) => {
      if (run.length === 0) {
        run.push(card);
      } else {
        const previous = suitedCards[index - 1];
        if (NATURAL_RANK_INDEX[card.rank] === NATURAL_RANK_INDEX[previous.rank] + 1) {
          run.push(card);
        } else {
          if (run.length >= 3) {
            sequences.push(createSequenceWeis(run, roundMode));
          }
          run = [card];
        }
      }
    });

    if (run.length >= 3) {
      sequences.push(createSequenceWeis(run, roundMode));
    }
  });

  const byRank = Object.fromEntries(RANKS.map((rank) => [rank, []]));
  hand.forEach((card) => {
    byRank[card.rank].push(card);
  });

  const fourOfKinds = RANKS
    .filter((rank) => byRank[rank].length === 4)
    .map((rank) => createFourOfKindWeis(byRank[rank]));

  return sortWeisDescending([...sequences, ...fourOfKinds], roundMode);
}

function highestWeis(weisen, roundMode) {
  return sortWeisDescending(weisen, roundMode)[0] ?? null;
}

function formatModeChoice(mode, chooserName, leaderName, chooserStarts) {
  if (isTrumpMode(mode)) {
    return chooserStarts
      ? `${chooserName} waehlt ${ROUND_MODE_LABELS[mode]} als Trumpf und spielt aus.`
      : `${chooserName} waehlt ${ROUND_MODE_LABELS[mode]} als Trumpf. ${leaderName} spielt aus.`;
  }

  return chooserStarts
    ? `${chooserName} waehlt ${ROUND_MODE_LABELS[mode]} und spielt aus.`
    : `${chooserName} waehlt ${ROUND_MODE_LABELS[mode]}. ${leaderName} spielt aus.`;
}

function startWeisPhase(game) {
  const order = getAnnouncementOrder(game);
  const possibleByPlayer = {};
  const highestByPlayer = {};

  order.forEach((playerIndex) => {
    const detected = detectWeis(game.players[playerIndex].hand, game.roundMode)
      .map((weis) => ({ ...weis, playerIndex }));
    possibleByPlayer[playerIndex] = detected;
    highestByPlayer[playerIndex] = highestWeis(detected, game.roundMode);
  });

  game.weisState = {
    order,
    currentIndex: 0,
    possibleByPlayer,
    highestByPlayer,
    declaredByPlayer: {},
    declaredEntries: [],
    winningDeclaration: null,
    awardedTeamId: null,
  };
  game.phase = 'announceWeis';
  game.currentPlayer = order[0];
  game.log.push('Weisrunde beginnt.');
}

function finishWeisPhase(game) {
  const declaredEntries = game.weisState.declaredEntries.filter((entry) => entry.weis);

  if (declaredEntries.length === 0) {
    game.log.push('Kein Team meldet einen gueltigen Weis.');
    game.phase = 'playing';
    game.currentPlayer = game.trickLeader;
    return;
  }

  const bestEntry = declaredEntries.reduce((best, current) => {
    if (!best) {
      return current;
    }
    const comparison = compareWeis(current.weis, best.weis, game.roundMode);
    if (comparison > 0) {
      return current;
    }
    if (comparison < 0) {
      return best;
    }
    return current.orderIndex < best.orderIndex ? current : best;
  }, null);

  const winningTeamId = game.players[bestEntry.playerIndex].teamId;
  const awardedWeis = game.teams
    .find((team) => team.id === winningTeamId)
    .playerIds
    .flatMap((playerIndex) => game.weisState.possibleByPlayer[playerIndex] || []);

  const totalWeisPoints = awardedWeis.reduce((sum, weis) => sum + weis.points, 0);
  game.teamWeisScores[winningTeamId] = totalWeisPoints;
  game.teamWeisBreakdown[winningTeamId] = sortWeisDescending(awardedWeis, game.roundMode);
  game.weisState.winningDeclaration = bestEntry;
  game.weisState.awardedTeamId = winningTeamId;

  declaredEntries.forEach((entry) => {
    game.log.push(`${game.players[entry.playerIndex].name} meldet ${describeWeis(entry.weis)}.`);
  });
  Object.entries(game.weisState.declaredByPlayer)
    .filter(([, weis]) => !weis)
    .forEach(([playerIndex]) => {
      game.log.push(`${game.players[Number(playerIndex)].name} meldet keinen Weis.`);
    });

  const teamName = game.teams.find((team) => team.id === winningTeamId)?.name || 'Das Team';
  game.log.push(`${teamName} schreibt ${totalWeisPoints} Weispunkte mit ${describeWeis(bestEntry.weis)}.`);
  game.teamWeisBreakdown[winningTeamId].forEach((weis) => {
    game.log.push(`  ${game.players[weis.playerIndex].name}: ${describeWeis(weis)}`);
  });

  game.phase = 'playing';
  game.currentPlayer = game.trickLeader;
}

export function getPossibleWeisForPlayer(game, playerIndex) {
  return game.weisState?.possibleByPlayer?.[playerIndex] || [];
}

export function submitWeisDeclaration(game, playerIndex, selectedWeisId = null) {
  if (game.phase !== 'announceWeis') {
    throw new Error('Nicht in der Weisrunde.');
  }
  if (playerIndex !== game.currentPlayer) {
    throw new Error('Dieser Spieler ist nicht am Zug.');
  }

  const available = getPossibleWeisForPlayer(game, playerIndex);
  let selectedWeis = null;

  if (selectedWeisId) {
    selectedWeis = available.find((weis) => weis.id === selectedWeisId) || null;
    if (!selectedWeis) {
      throw new Error('Dieser Weis ist fuer den Spieler nicht gueltig.');
    }
  } else {
    selectedWeis = game.weisState.highestByPlayer[playerIndex] || null;
  }

  game.weisState.declaredByPlayer[playerIndex] = selectedWeis;
  game.weisState.declaredEntries.push({
    playerIndex,
    weis: selectedWeis,
    orderIndex: game.weisState.currentIndex,
  });

  game.weisState.currentIndex += 1;
  if (game.weisState.currentIndex >= game.weisState.order.length) {
    finishWeisPhase(game);
    return;
  }

  game.currentPlayer = game.weisState.order[game.weisState.currentIndex];
}

export function chooseTrump(game, roundMode) {
  if (game.phase !== 'chooseTrump') {
    throw new Error('Nicht in der Spielartwahl.');
  }
  if (game.currentPlayer < 0 || game.currentPlayer >= game.players.length) {
    throw new Error('Kein gueltiger Spieler fuer die Spielartwahl.');
  }

  const allowedModes = isSchieber(game) ? ROUND_MODE_OPTIONS : SUITS;
  if (!allowedModes.includes(roundMode)) {
    throw new Error('Unbekannte Spielart.');
  }

  const chooserPlayer = game.players[game.currentPlayer];
  game.roundMode = roundMode;
  game.trumpSuit = isTrumpMode(roundMode) ? roundMode : null;
  game.trickLeader = isBieter(game) ? game.soloPlayer : game.forehandPlayer;

  game.players.forEach((player) => {
    player.hand = sortPlayerHand(player.hand);
  });

  game.log.push(formatModeChoice(
    roundMode,
    chooserPlayer.name,
    game.players[game.trickLeader].name,
    chooserPlayer.id === game.trickLeader
  ));

  if (isSchieber(game)) {
    startWeisPhase(game);
    return;
  }

  game.phase = 'playing';
  game.currentPlayer = game.trickLeader;
}

function highestTrumpCard(trickCards, roundMode) {
  if (!isTrumpMode(roundMode)) {
    return null;
  }

  const trumps = trickCards
    .map((entry) => entry.card)
    .filter((card) => card.suit === roundMode);

  if (trumps.length === 0) {
    return null;
  }

  return trumps.reduce((best, current) =>
    rankIndex(current, roundMode) > rankIndex(best, roundMode) ? current : best
  );
}

function uniqueCards(cards) {
  const seen = new Set();
  return cards.filter((card) => {
    if (seen.has(card.id)) {
      return false;
    }
    seen.add(card.id);
    return true;
  });
}

function getBieterPlayableCards(hand, ledSuit, roundMode) {
  if (!ledSuit) {
    return [...hand];
  }

  const suited = hand.filter((card) => card.suit === ledSuit);
  if (suited.length > 0) {
    return suited;
  }

  const trumpSuit = isTrumpMode(roundMode) ? roundMode : null;
  const trumps = hand.filter((card) => card.suit === trumpSuit);
  if (trumps.length === 0) {
    return [...hand];
  }

  const nonPuurTrumps = trumps.filter((card) => card.rank !== 'under');
  if (nonPuurTrumps.length === 0) {
    return [...hand];
  }

  return trumps;
}

function getNoTrumpPlayableCards(hand, trickCards) {
  const ledSuit = trickCards.length > 0 ? trickCards[0].card.suit : null;
  if (!ledSuit) {
    return [...hand];
  }

  const suited = hand.filter((card) => card.suit === ledSuit);
  return suited.length > 0 ? suited : [...hand];
}

function getSchieberTrumpPlayableCards(hand, trickCards, roundMode) {
  const ledSuit = trickCards.length > 0 ? trickCards[0].card.suit : null;
  if (!ledSuit) {
    return [...hand];
  }

  const suited = hand.filter((card) => card.suit === ledSuit);
  const trumps = hand.filter((card) => card.suit === roundMode);

  if (ledSuit === roundMode) {
    if (trumps.length === 0) {
      return [...hand];
    }
    if (trumps.length === 1 && trumps[0].rank === 'under') {
      return [...hand];
    }
    return trumps;
  }

  const highestTrump = highestTrumpCard(trickCards, roundMode);
  const higherTrumps = highestTrump
    ? trumps.filter((card) => rankIndex(card, roundMode) > rankIndex(highestTrump, roundMode))
    : trumps;

  const nonTrumps = hand.filter((card) => card.suit !== roundMode);
  const onlyTrumpsInHand = trumps.length === hand.length;
  const onlyPuurTrump = trumps.length === 1 && trumps[0].rank === 'under';

  let legal = [...suited];

  if (highestTrump) {
    if (higherTrumps.length > 0) {
      legal = legal.concat(higherTrumps);
    } else if (onlyTrumpsInHand || onlyPuurTrump) {
      legal = legal.concat(trumps);
    } else {
      legal = legal.concat(nonTrumps);
    }
  } else {
    legal = legal.concat(trumps);
  }

  if (legal.length === 0) {
    return [...hand];
  }

  return uniqueCards(legal);
}

export function getPlayableCards(hand, trickCards, roundMode, variantId = 'bieter') {
  if (variantId === 'schieber') {
    return isNoTrumpMode(roundMode)
      ? getNoTrumpPlayableCards(hand, trickCards)
      : getSchieberTrumpPlayableCards(hand, trickCards, roundMode);
  }

  return getBieterPlayableCards(hand, trickCards.length > 0 ? trickCards[0].card.suit : null, roundMode);
}

export function getPlayableCardsForPlayer(game, playerIndex) {
  return getPlayableCards(
    game.players[playerIndex].hand,
    game.trick,
    game.roundMode,
    game.variantId
  );
}

export function trickWinner(trickCards, roundMode) {
  const ledSuit = trickCards[0].card.suit;
  let best = trickCards[0];

  for (let index = 1; index < trickCards.length; index += 1) {
    const entry = trickCards[index];
    const current = entry.card;
    const bestCard = best.card;

    if (isTrumpMode(roundMode)) {
      const currentTrump = current.suit === roundMode;
      const bestTrump = bestCard.suit === roundMode;

      if (currentTrump && !bestTrump) {
        best = entry;
        continue;
      }
      if (!currentTrump && bestTrump) {
        continue;
      }
      if (currentTrump && bestTrump) {
        if (rankIndex(current, roundMode) > rankIndex(bestCard, roundMode)) {
          best = entry;
        }
        continue;
      }
    }

    if (current.suit !== ledSuit) {
      continue;
    }
    if (bestCard.suit !== ledSuit || rankIndex(current, roundMode) > rankIndex(bestCard, roundMode)) {
      best = entry;
    }
  }

  return best.playerIndex;
}

export function trickPoints(trickCards, roundMode) {
  return trickCards.reduce((sum, entry) => sum + cardPoints(entry.card, roundMode), 0);
}

export function pileIdForWinner(game, winningPlayer) {
  if (isSchieber(game)) {
    return game.players[winningPlayer].teamId;
  }
  return winningPlayer === game.soloPlayer ? 0 : 1;
}

export function playCard(game, playerIndex, cardId) {
  if (game.phase !== 'playing') {
    throw new Error('Nicht in der Spielphase.');
  }
  if (playerIndex !== game.currentPlayer) {
    throw new Error('Dieser Spieler ist nicht am Zug.');
  }

  const player = game.players[playerIndex];
  const cardIndex = player.hand.findIndex((card) => card.id === cardId);
  if (cardIndex === -1) {
    throw new Error('Karte nicht in der Hand.');
  }

  const legalCards = getPlayableCardsForPlayer(game, playerIndex);
  if (!legalCards.some((card) => card.id === cardId)) {
    throw new Error('Diese Karte darf in diesem Stich nicht gespielt werden.');
  }

  const [card] = player.hand.splice(cardIndex, 1);
  game.trick.push({ playerIndex, card });
  game.log.push(`${player.name} spielt ${cardLabel(card)}.`);

  if (game.trick.length === game.players.length) {
    return true;
  }

  game.currentPlayer = nextPlayerIndex(game, playerIndex);
  return false;
}

function teamTrickPoints(game, teamId) {
  return game.players
    .filter((player) => player.teamId === teamId)
    .reduce((sum, player) => sum + player.pointsWon, 0);
}

function teamTricksWon(game, teamId) {
  return game.players
    .filter((player) => player.teamId === teamId)
    .reduce((sum, player) => sum + player.tricksWon, 0);
}

export function getTeamWeisPoints(game, teamId) {
  return game.teamWeisScores?.[teamId] ?? 0;
}

export function getSchieberTeamBasePoints(game, teamId) {
  return teamTrickPoints(game, teamId) + getTeamWeisPoints(game, teamId);
}

export function getSchieberTeamRoundPoints(game, teamId) {
  return getSchieberTeamBasePoints(game, teamId) * getRoundMultiplier(game);
}

export function resolveTrick(game) {
  const winningPlayer = trickWinner(game.trick, game.roundMode);
  const pileId = pileIdForWinner(game, winningPlayer);
  const isLastTrick = game.trickNumber === game.variant.handSize - 1;
  let points = trickPoints(game.trick, game.roundMode);

  if (isLastTrick) {
    points += 5;
  }

  game.players[winningPlayer].tricksWon += 1;
  game.players[winningPlayer].pointsWon += points;
  game.capturedPileOwners[pileId] = winningPlayer;

  if (game.trickNumber === 0) {
    game.firstCapturedTrick = {
      pileId,
      winner: winningPlayer,
      cards: game.trick.map((entry) => ({
        playerIndex: entry.playerIndex,
        card: entry.card,
      })),
    };
  }

  game.capturedCards[pileId].push(...game.trick.map((entry) => entry.card));
  game.capturedTricks[pileId] += 1;
  game.lastCapturedPile = pileId;
  game.trickNumber += 1;

  const cardsSummary = game.trick
    .map((entry) => `${game.players[entry.playerIndex].name}: ${cardLabel(entry.card)}`)
    .join(', ');

  game.log.push(
    `Stich ${game.trickNumber}: [${cardsSummary}] -> ${game.players[winningPlayer].name} (${points} Pkt)`
  );

  game.trickLeader = winningPlayer;
  game.phase = 'trickEnd';

  if (isLastTrick) {
    resolveRound(game);
  }
}

export function startNextTrick(game) {
  game.trick = [];
  game.currentPlayer = game.trickLeader;
  game.phase = 'playing';
}

function resolveBieterRound(game) {
  const soloPlayer = game.players[game.soloPlayer];
  const bid = game.highestBid;
  const soloPoints = soloPlayer.pointsWon;
  const succeeded = soloPoints >= bid;
  const soloGain = succeeded ? bid : -bid;
  const defenders = game.players.filter((player) => player.id !== game.soloPlayer);
  const defenderGain = succeeded ? 0 : Math.floor(bid / defenders.length);

  soloPlayer.totalScore = Math.max(0, soloPlayer.totalScore + soloGain);
  defenders.forEach((player) => {
    player.totalScore += defenderGain;
  });

  game.roundSummary = {
    type: 'bieter',
    soloPlayer: game.soloPlayer,
    bid,
    soloPoints,
    succeeded,
    soloGain,
    defenderGain,
  };

  if (succeeded) {
    game.log.push(`${soloPlayer.name} erfuellt ${bid} und erhaelt ${soloGain} Spielpunkte.`);
  } else {
    game.log.push(`${soloPlayer.name} scheitert mit ${soloPoints}/${bid} Punkten.`);
    if (defenderGain > 0) {
      game.log.push(`Die Verteidiger erhalten je ${defenderGain} Spielpunkte.`);
    }
  }

  const winner = game.players.find((player) => player.totalScore >= game.variant.targetScore);
  game.phase = winner ? 'gameOver' : 'roundEnd';
}

function compareRoundResults(first, second) {
  if (first.roundPoints !== second.roundPoints) {
    return second.roundPoints - first.roundPoints;
  }
  if (first.basePoints !== second.basePoints) {
    return second.basePoints - first.basePoints;
  }
  if (first.tricksWon !== second.tricksWon) {
    return second.tricksWon - first.tricksWon;
  }
  return first.teamId - second.teamId;
}

function compareTeamsByTotal(first, second, resultByTeamId) {
  if (first.totalScore !== second.totalScore) {
    return second.totalScore - first.totalScore;
  }
  const firstResult = resultByTeamId[first.id];
  const secondResult = resultByTeamId[second.id];
  return compareRoundResults(firstResult, secondResult);
}

function resolveSchieberRound(game) {
  const multiplier = getRoundMultiplier(game);
  const results = game.teams.map((team) => {
    const trickPointsWon = teamTrickPoints(game, team.id);
    const weisPointsWon = getTeamWeisPoints(game, team.id);
    const basePoints = trickPointsWon + weisPointsWon;

    return {
      teamId: team.id,
      name: team.name,
      trickPoints: trickPointsWon,
      weisPoints: weisPointsWon,
      basePoints,
      roundPoints: basePoints * multiplier,
      tricksWon: teamTricksWon(game, team.id),
    };
  });

  const resultByTeamId = Object.fromEntries(results.map((result) => [result.teamId, result]));
  results.forEach((result) => {
    const team = game.teams.find((entry) => entry.id === result.teamId);
    team.totalScore += result.roundPoints;
  });

  const rankedTeams = [...game.teams].sort((first, second) => compareTeamsByTotal(first, second, resultByTeamId));
  const winningTeam = rankedTeams[0];
  const roundWinner = [...results].sort(compareRoundResults)[0];
  const targetScore = getGameTargetScore(game);

  game.roundSummary = {
    type: 'schieber',
    results,
    roundWinnerTeamId: roundWinner.teamId,
    trumpChooser: game.chooserPlayer,
    pushed: game.trumpWasPushed,
    roundMode: game.roundMode,
    multiplier,
    targetScore,
    weisWinnerTeamId: game.weisState?.awardedTeamId ?? null,
    highestWeis: game.weisState?.winningDeclaration?.weis ?? null,
  };

  results.forEach((result) => {
    const multiplierInfo = multiplier > 1 ? ` x${multiplier}` : '';
    const weisInfo = result.weisPoints > 0 ? ` + ${result.weisPoints} Weis` : '';
    game.log.push(`${result.name}: ${result.trickPoints}${weisInfo} = ${result.basePoints}${multiplierInfo} -> ${result.roundPoints} Punkte.`);
  });

  game.phase = winningTeam.totalScore >= targetScore ? 'gameOver' : 'roundEnd';
}

function resolveRound(game) {
  if (isBieter(game)) {
    resolveBieterRound(game);
    return;
  }
  resolveSchieberRound(game);
}

export function handValue(hand, roundMode) {
  return hand.reduce((sum, card) => sum + cardPoints(card, roundMode), 0);
}

function estimateSchieberModeValue(hand, roundMode, targetScore = 1000) {
  const rawHandValue = handValue(hand, roundMode);
  const possibleWeis = detectWeis(hand, roundMode);
  const bestOwnWeis = highestWeis(possibleWeis, roundMode);
  return (rawHandValue + (bestOwnWeis?.points ?? 0)) * getRoundMultiplier(targetScore, roundMode);
}

export function bestTrumpSuit(hand) {
  return SUITS.reduce((bestSuit, suit) =>
    handValue(hand, suit) > handValue(hand, bestSuit) ? suit : bestSuit
  );
}

export function bestSchieberMode(hand, targetScore = 1000) {
  return ROUND_MODE_OPTIONS.reduce((bestMode, currentMode) =>
    estimateSchieberModeValue(hand, currentMode, targetScore) > estimateSchieberModeValue(hand, bestMode, targetScore)
      ? currentMode
      : bestMode
  );
}

export function aiBidDecision(hand, currentHighestBid) {
  const bestSuit = bestTrumpSuit(hand);
  const estimatedPoints = handValue(hand, bestSuit);
  const proposedBid = Math.min(130, Math.floor(estimatedPoints / 10) * 10);
  if (proposedBid < 60 || proposedBid <= currentHighestBid) {
    return 0;
  }
  return proposedBid;
}

function wouldWin(game, playerIndex, card) {
  const simulated = [...game.trick, { playerIndex, card }];
  return trickWinner(simulated, game.roundMode) === playerIndex;
}

export function aiChooseCard(game, playerIndex) {
  const legalCards = getPlayableCardsForPlayer(game, playerIndex);
  const byPointsAscending = (first, second) => cardPoints(first, game.roundMode) - cardPoints(second, game.roundMode);
  const byPointsDescending = (first, second) => cardPoints(second, game.roundMode) - cardPoints(first, game.roundMode);
  const byRankDescending = (first, second) => rankIndex(second, game.roundMode) - rankIndex(first, game.roundMode);

  if (game.trick.length === 0) {
    const trumpCards = isTrumpMode(game.roundMode)
      ? legalCards.filter((card) => card.suit === game.roundMode)
      : [];
    if (trumpCards.length >= 2) {
      return [...trumpCards].sort(byRankDescending)[0];
    }
    return [...legalCards].sort(byRankDescending)[0];
  }

  const currentWinner = trickWinner(game.trick, game.roundMode);
  const teammateWinning = sameSide(game, currentWinner, playerIndex);
  const winningCards = legalCards.filter((card) => wouldWin(game, playerIndex, card));

  if (winningCards.length > 0 && !teammateWinning) {
    return [...winningCards].sort(byPointsAscending)[0];
  }
  if (teammateWinning) {
    return [...legalCards].sort(byPointsDescending)[0];
  }
  if (winningCards.length > 0) {
    return [...winningCards].sort(byPointsAscending)[0];
  }
  return [...legalCards].sort(byPointsAscending)[0];
}
