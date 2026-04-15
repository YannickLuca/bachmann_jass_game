export const SUITS = ['eicheln', 'rosen', 'schellen', 'schilten'];
export const SUIT_LABELS = {
  eicheln: 'Eicheln',
  rosen: 'Rosen',
  schellen: 'Schellen',
  schilten: 'Schilten',
};

export const RANKS = ['6', '7', '8', '9', '10', 'under', 'ober', 'koenig', 'ass'];
export const RANK_LABELS = {
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  under: 'Under',
  ober: 'Ober',
  koenig: 'König',
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

const BASE_ORDER = ['6', '7', '8', '9', '10', 'under', 'ober', 'koenig', 'ass'];
const TRUMP_ORDER = ['6', '7', '8', '10', 'ober', 'koenig', 'ass', '9', 'under'];
const HAND_SUIT_ORDER = ['rosen', 'eicheln', 'schellen', 'schilten'];
const HAND_SUIT_INDEX = Object.fromEntries(HAND_SUIT_ORDER.map((suit, index) => [suit, index]));
const HAND_RANK_INDEX = Object.fromEntries(BASE_ORDER.map((rank, index) => [rank, index]));

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
      'Jeder bietet genau einmal. Das höchste Gebot spielt alleine gegen die anderen zwei.',
      'Der Höchstbietende wählt die Trumpffarbe.',
      'Vereinfachte Bedienpflicht mit Trumpfstechen wie in der bisherigen Lokalversion.',
      'Erfüllt der Bieter sein Gebot, erhält er den Gebotswert. Sonst verliert er ihn.',
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
      'Vorhand wählt Trumpf oder schiebt die Wahl einmal an den Partner weiter.',
      'Bedienpflicht und Trumpfregeln sind als saubere Grundversion umgesetzt.',
      'Keine Weis-, Stöck-, Obenabe- oder Undenufe-Regeln in dieser ersten Ausbaustufe.',
      'Teamwertung: die Stichpunkte werden pro Runde addiert. Ziel: zuerst 1000 Punkte.',
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

export function cardImagePath(card) {
  return `assets/jasskarten_deck_png_sharper/${card.suit}_${card.rank}.png`;
}

export function cardLabel(card) {
  return `${SUIT_LABELS[card.suit]} ${RANK_LABELS[card.rank]}`;
}

export function cardPoints(card, trumpSuit) {
  return card.suit === trumpSuit ? TRUMP_POINTS[card.rank] : BASE_POINTS[card.rank];
}

export function rankIndex(card, trumpSuit) {
  return card.suit === trumpSuit
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

export function sortPlayerHand(hand, trumpSuit) {
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
      { id: 1, name: 'Computer 1', isHuman: false, teamId: 1, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
      { id: 2, name: 'Computer 2', isHuman: false, teamId: 1, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
    ];
  }

  return [
    { id: 0, name: playerName, isHuman: true, teamId: 0, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
    { id: 1, name: 'Computer Links', isHuman: false, teamId: 1, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
    { id: 2, name: 'Partner', isHuman: false, teamId: 0, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
    { id: 3, name: 'Computer Rechts', isHuman: false, teamId: 1, hand: [], bid: null, tricksWon: 0, pointsWon: 0, totalScore: 0 },
  ];
}

function createTeams(variantId, players) {
  if (variantId !== 'schieber') {
    return [];
  }

  return [
    { id: 0, name: `${players[0].name} & ${players[2].name}`, playerIds: [0, 2], totalScore: 0 },
    { id: 1, name: `${players[1].name} & ${players[3].name}`, playerIds: [1, 3], totalScore: 0 },
  ];
}

export function createGame({ variantId = 'bieter', playerName = 'Du' } = {}) {
  const variant = getVariantOrThrow(variantId);
  const players = createPlayers(variantId, playerName || 'Du');

  return {
    variantId,
    variant,
    players,
    teams: createTeams(variantId, players),
    phase: 'setup',
    dealer: variant.playerCount - 1,
    currentPlayer: 0,
    biddingOrder: [],
    biddingIndex: 0,
    highestBid: 0,
    highestBidder: -1,
    trumpSuit: null,
    soloPlayer: -1,
    chooserPlayer: -1,
    forehandPlayer: -1,
    trumpWasPushed: false,
    trick: [],
    trickLeader: -1,
    trickNumber: 0,
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
  return `Runde ${game.roundNumber} - ${game.variant.label} - Geber: ${game.players[game.dealer].name}`;
}

export function startRound(game) {
  game.roundNumber += 1;
  game.dealer = (game.dealer + 1) % game.players.length;
  game.currentPlayer = 0;
  game.biddingOrder = [];
  game.biddingIndex = 0;
  game.highestBid = 0;
  game.highestBidder = -1;
  game.trumpSuit = null;
  game.soloPlayer = -1;
  game.chooserPlayer = -1;
  game.forehandPlayer = -1;
  game.trumpWasPushed = false;
  game.trick = [];
  game.trickLeader = -1;
  game.trickNumber = 0;
  game.roundSummary = null;

  const hands = dealHands(game.variant.playerCount, game.variant.dealPacketSize, game.dealer);
  game.players.forEach((player, playerIndex) => {
    resetRoundPlayerState(player);
    player.hand = sortPlayerHand(hands[playerIndex], '');
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

  game.forehandPlayer = nextPlayerIndex(game, game.dealer);
  game.chooserPlayer = game.forehandPlayer;
  game.currentPlayer = game.forehandPlayer;
  game.phase = 'chooseTrump';
  game.log.push(`${game.players[game.forehandPlayer].name} ist Vorhand und wählt Trumpf oder schiebt.`);
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
    throw new Error('Ungültiger Gebotswert.');
  }
  if (bidValue !== 0 && bidValue <= game.highestBid) {
    throw new Error(`Gebot muss höher als ${game.highestBid} sein.`);
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
    throw new Error('Schieben ist aktuell nicht möglich.');
  }

  const partnerIndex = partnerOf(game, game.forehandPlayer);
  game.trumpWasPushed = true;
  game.chooserPlayer = partnerIndex;
  game.currentPlayer = partnerIndex;
  game.log.push(`${game.players[game.forehandPlayer].name} schiebt. ${game.players[partnerIndex].name} wählt Trumpf.`);
}

export function chooseTrump(game, suit) {
  if (game.phase !== 'chooseTrump') {
    throw new Error('Nicht in der Trumpfwahl.');
  }
  if (game.currentPlayer < 0 || game.currentPlayer >= game.players.length) {
    throw new Error('Kein gültiger Spieler für die Trumpfwahl.');
  }
  if (!SUITS.includes(suit)) {
    throw new Error('Unbekannte Trumpffarbe.');
  }

  const chooserPlayer = game.players[game.currentPlayer];
  game.trumpSuit = suit;
  game.phase = 'playing';
  game.trickLeader = isBieter(game) ? game.soloPlayer : game.forehandPlayer;
  game.currentPlayer = game.trickLeader;

  if (chooserPlayer.id === game.trickLeader) {
    game.log.push(`${chooserPlayer.name} wählt ${SUIT_LABELS[suit]} als Trumpf und spielt aus.`);
  } else {
    game.log.push(`${chooserPlayer.name} wählt ${SUIT_LABELS[suit]} als Trumpf. ${game.players[game.trickLeader].name} spielt aus.`);
  }

  game.players.forEach((player) => {
    player.hand = sortPlayerHand(player.hand, suit);
  });
}

function highestTrumpCard(trickCards, trumpSuit) {
  const trumps = trickCards
    .map((entry) => entry.card)
    .filter((card) => card.suit === trumpSuit);

  if (trumps.length === 0) {
    return null;
  }

  return trumps.reduce((best, current) =>
    rankIndex(current, trumpSuit) > rankIndex(best, trumpSuit) ? current : best
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

function getBieterPlayableCards(hand, ledSuit, trumpSuit) {
  if (!ledSuit) {
    return [...hand];
  }

  const suited = hand.filter((card) => card.suit === ledSuit);
  if (suited.length > 0) {
    return suited;
  }

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

function getSchieberPlayableCards(hand, trickCards, trumpSuit) {
  const ledSuit = trickCards.length > 0 ? trickCards[0].card.suit : null;
  if (!ledSuit) {
    return [...hand];
  }

  const suited = hand.filter((card) => card.suit === ledSuit);
  const trumps = hand.filter((card) => card.suit === trumpSuit);

  if (ledSuit === trumpSuit) {
    if (trumps.length === 0) {
      return [...hand];
    }
    if (trumps.length === 1 && trumps[0].rank === 'under') {
      return [...hand];
    }
    return trumps;
  }

  const highestTrump = highestTrumpCard(trickCards, trumpSuit);
  const higherTrumps = highestTrump
    ? trumps.filter((card) => rankIndex(card, trumpSuit) > rankIndex(highestTrump, trumpSuit))
    : trumps;

  const nonTrumps = hand.filter((card) => card.suit !== trumpSuit);
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

export function getPlayableCards(hand, trickCards, trumpSuit, variantId = 'bieter') {
  return variantId === 'schieber'
    ? getSchieberPlayableCards(hand, trickCards, trumpSuit)
    : getBieterPlayableCards(hand, trickCards.length > 0 ? trickCards[0].card.suit : null, trumpSuit);
}

export function getPlayableCardsForPlayer(game, playerIndex) {
  return getPlayableCards(
    game.players[playerIndex].hand,
    game.trick,
    game.trumpSuit,
    game.variantId
  );
}

export function trickWinner(trickCards, trumpSuit) {
  const ledSuit = trickCards[0].card.suit;
  let best = trickCards[0];

  for (let index = 1; index < trickCards.length; index += 1) {
    const entry = trickCards[index];
    const current = entry.card;
    const bestCard = best.card;
    const currentTrump = current.suit === trumpSuit;
    const bestTrump = bestCard.suit === trumpSuit;

    if (currentTrump && !bestTrump) {
      best = entry;
      continue;
    }
    if (!currentTrump && bestTrump) {
      continue;
    }
    if (currentTrump && bestTrump) {
      if (rankIndex(current, trumpSuit) > rankIndex(bestCard, trumpSuit)) {
        best = entry;
      }
      continue;
    }
    if (current.suit === ledSuit && bestCard.suit !== ledSuit) {
      best = entry;
      continue;
    }
    if (
      current.suit === ledSuit
      && bestCard.suit === ledSuit
      && rankIndex(current, trumpSuit) > rankIndex(bestCard, trumpSuit)
    ) {
      best = entry;
    }
  }

  return best.playerIndex;
}

export function trickPoints(trickCards, trumpSuit) {
  return trickCards.reduce((sum, entry) => sum + cardPoints(entry.card, trumpSuit), 0);
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

function teamRoundPoints(game, teamId) {
  return game.players
    .filter((player) => player.teamId === teamId)
    .reduce((sum, player) => sum + player.pointsWon, 0);
}

function teamTricksWon(game, teamId) {
  return game.players
    .filter((player) => player.teamId === teamId)
    .reduce((sum, player) => sum + player.tricksWon, 0);
}

export function resolveTrick(game) {
  const winningPlayer = trickWinner(game.trick, game.trumpSuit);
  const isLastTrick = game.trickNumber === game.variant.handSize - 1;
  let points = trickPoints(game.trick, game.trumpSuit);

  if (isLastTrick) {
    points += 5;
  }

  game.players[winningPlayer].tricksWon += 1;
  game.players[winningPlayer].pointsWon += points;
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
    game.log.push(`${soloPlayer.name} erfüllt ${bid} und erhält ${soloGain} Spielpunkte.`);
  } else {
    game.log.push(`${soloPlayer.name} scheitert mit ${soloPoints}/${bid} Punkten.`);
    if (defenderGain > 0) {
      game.log.push(`Die Verteidiger erhalten je ${defenderGain} Spielpunkte.`);
    }
  }

  const winner = game.players.find((player) => player.totalScore >= game.variant.targetScore);
  game.phase = winner ? 'gameOver' : 'roundEnd';
}

function resolveSchieberRound(game) {
  const results = game.teams.map((team) => ({
    teamId: team.id,
    name: team.name,
    roundPoints: teamRoundPoints(game, team.id),
    tricksWon: teamTricksWon(game, team.id),
  }));

  results.forEach((result) => {
    const team = game.teams.find((entry) => entry.id === result.teamId);
    team.totalScore += result.roundPoints;
  });

  const winningTeam = [...game.teams].sort((first, second) => second.totalScore - first.totalScore)[0];
  const roundWinner = [...results].sort((first, second) => second.roundPoints - first.roundPoints)[0];

  game.roundSummary = {
    type: 'schieber',
    results,
    roundWinnerTeamId: roundWinner.teamId,
    trumpChooser: game.chooserPlayer,
    pushed: game.trumpWasPushed,
  };

  game.log.push(`${results[0].name}: ${results[0].roundPoints} Punkte.`);
  game.log.push(`${results[1].name}: ${results[1].roundPoints} Punkte.`);

  game.phase = winningTeam.totalScore >= game.variant.targetScore ? 'gameOver' : 'roundEnd';
}

function resolveRound(game) {
  if (isBieter(game)) {
    resolveBieterRound(game);
    return;
  }
  resolveSchieberRound(game);
}

export function handValue(hand, trumpSuit) {
  return hand.reduce((sum, card) => sum + cardPoints(card, trumpSuit), 0);
}

export function bestTrumpSuit(hand) {
  return SUITS.reduce((bestSuit, suit) =>
    handValue(hand, suit) > handValue(hand, bestSuit) ? suit : bestSuit
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
  return trickWinner(simulated, game.trumpSuit) === playerIndex;
}

export function aiChooseCard(game, playerIndex) {
  const player = game.players[playerIndex];
  const legalCards = getPlayableCardsForPlayer(game, playerIndex);
  const byPointsAscending = (first, second) => cardPoints(first, game.trumpSuit) - cardPoints(second, game.trumpSuit);
  const byPointsDescending = (first, second) => cardPoints(second, game.trumpSuit) - cardPoints(first, game.trumpSuit);
  const byRankDescending = (first, second) => rankIndex(second, game.trumpSuit) - rankIndex(first, game.trumpSuit);

  if (game.trick.length === 0) {
    const trumpCards = legalCards.filter((card) => card.suit === game.trumpSuit);
    if (trumpCards.length >= 2) {
      return [...trumpCards].sort(byRankDescending)[0];
    }
    return [...legalCards].sort(byRankDescending)[0];
  }

  const currentWinner = trickWinner(game.trick, game.trumpSuit);
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
