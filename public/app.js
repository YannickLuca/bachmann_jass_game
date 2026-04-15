import {
  BID_VALUES,
  GAME_VARIANTS,
  SUITS,
  SUIT_LABELS,
  cardImagePath,
  cardLabel,
  createGame,
  startRound,
  submitBid,
  canPushTrump,
  pushTrumpChoice,
  chooseTrump,
  playCard,
  resolveTrick,
  startNextTrick,
  getPlayableCardsForPlayer,
  aiBidDecision,
  bestTrumpSuit,
  aiChooseCard,
  getDisplayScore,
  getPlayerTeam,
  isBieter,
  isSchieber,
  pileIdForWinner,
} from './game-engine.js';

const ZONE_POSITIONS = ['left', 'top', 'right', 'bottom'];
const PLAYER_POSITIONS = {
  bieter: { 0: 'bottom', 1: 'left', 2: 'right' },
  schieber: { 0: 'bottom', 1: 'left', 2: 'top', 3: 'right' },
};
const AI_DELAYS = {
  bidding: [1200, 2100],
  trump: [1500, 2600],
  card: [1500, 2700],
  trickEnd: [1700, 2500],
};

let selectedVariantId = 'bieter';
let game = null;
let aiLocked = false;
let animatedTrickCards = new Set();

const screenSetup = document.getElementById('screen-setup');
const screenGame = document.getElementById('screen-game');
const setupSub = document.getElementById('setup-sub');
const setupRulesList = document.getElementById('setup-rules-list');
const variantCards = [...document.querySelectorAll('.variant-card')];
const playerNameInput = document.getElementById('player-name');
const btnStart = document.getElementById('btn-start');
const scorePanel = document.getElementById('score-panel');
const msgEl = document.getElementById('message');
const trumpDisplay = document.getElementById('trump-display');
const logEl = document.getElementById('log-messages');
const gameModeLabel = document.getElementById('game-mode-label');
const tableArea = document.getElementById('table-area');
const trickTable = document.getElementById('trick-table');
const bidControls = document.getElementById('bid-controls');
const bidSelect = document.getElementById('bid-select');
const btnBid = document.getElementById('btn-bid');
const trumpControls = document.getElementById('trump-controls');
const trumpPrompt = document.getElementById('trump-prompt');
const btnPush = document.getElementById('btn-push');
const roundEndControls = document.getElementById('round-end-controls');
const roundEndMsg = document.getElementById('round-end-msg');
const btnNextRound = document.getElementById('btn-next-round');
const gameOverControls = document.getElementById('game-over-controls');
const gameOverMsg = document.getElementById('game-over-msg');
const btnNewGame = document.getElementById('btn-new-game');

const zoneEls = Object.fromEntries(
  ZONE_POSITIONS.map((position) => [position, document.getElementById(`zone-${position}`)])
);
const handEls = Object.fromEntries(
  ZONE_POSITIONS.map((position) => [position, document.getElementById(`hand-${position}`)])
);
const nameEls = Object.fromEntries(
  ZONE_POSITIONS.map((position) => [position, document.getElementById(`pname-${position}`)])
);
const badgeEls = Object.fromEntries(
  ZONE_POSITIONS.map((position) => [position, document.getElementById(`badge-${position}`)])
);
const trickSlots = Object.fromEntries(
  ZONE_POSITIONS.map((position) => [position, document.getElementById(`trick-slot-${position}`)])
);
const pileEls = [0, 1].map((pileId) => ({
  root: document.getElementById(`pile-${pileId}`),
  label: document.getElementById(`pile-label-${pileId}`),
  deck: document.getElementById(`pile-deck-${pileId}`),
  count: document.getElementById(`pile-count-${pileId}`),
}));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSelectedVariant() {
  return GAME_VARIANTS[selectedVariantId];
}

function playerIndexForPosition(position) {
  return Object.entries(PLAYER_POSITIONS[game.variantId])
    .find(([, currentPosition]) => currentPosition === position)?.[0];
}

function isInteractivePhase() {
  return ['bidding', 'chooseTrump', 'playing'].includes(game.phase);
}

function getPlayerBadge(playerIndex) {
  const player = game.players[playerIndex];

  if (isBieter(game)) {
    if (player.bid === null) {
      return '';
    }
    return player.bid === 0 ? 'Pass' : String(player.bid);
  }

  if (playerIndex === game.dealer) {
    return 'Geber';
  }
  if (playerIndex === 2) {
    return 'Partner';
  }
  return '';
}

function cardBackEl() {
  const element = document.createElement('div');
  element.className = 'card card-back';
  return element;
}

function cardFaceEl(card, isPlayable, onClick) {
  const element = document.createElement('div');
  element.className = `card card-face${isPlayable ? ' playable' : ''}`;

  const image = document.createElement('img');
  image.src = cardImagePath(card);
  image.alt = cardLabel(card);
  image.draggable = false;
  element.appendChild(image);

  if (onClick) {
    element.addEventListener('click', onClick);
  }

  return element;
}

function applyFanStyle(element, index, count) {
  const center = (count - 1) / 2;
  const offset = index - center;
  const angle = Math.max(-22, Math.min(22, offset * 4.2));
  const yOffset = Math.abs(offset) * 2.8;

  element.style.setProperty('--fan-angle', `${angle}deg`);
  element.style.setProperty('--fan-y', `${yOffset}px`);
  element.style.setProperty('--fan-z', String(index + 1));
}

function isSuitBreak(hand, index) {
  return index > 0 && hand[index - 1].suit !== hand[index].suit;
}

function trickCardEl(card, isWinner, pileId = null, shouldFlyIn = false) {
  const element = document.createElement('div');
  element.className = [
    'trick-card',
    isWinner ? 'trick-winner' : '',
    pileId !== null ? `fly-to-pile-${pileId}` : '',
    shouldFlyIn ? 'fly-in' : '',
  ].filter(Boolean).join(' ');

  const image = document.createElement('img');
  image.src = cardImagePath(card);
  image.alt = cardLabel(card);
  image.draggable = false;
  element.appendChild(image);

  return element;
}

function pileLabel(pileId) {
  if (isSchieber(game)) {
    return pileId === 0 ? 'Dein Team' : 'Gegner-Team';
  }

  if (game.soloPlayer >= 0) {
    return pileId === 0 ? `${game.players[game.soloPlayer].name}` : 'Verteidiger';
  }

  return pileId === 0 ? 'Bieter' : 'Gegner';
}

function setSetupVariant(variantId) {
  selectedVariantId = variantId;
  const variant = getSelectedVariant();

  variantCards.forEach((card) => {
    const isActive = card.dataset.variant === variantId;
    card.classList.toggle('active', isActive);
    card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  setupSub.textContent = variant.setupSubtitle;
  setupRulesList.innerHTML = variant.rules
    .map((rule) => `<li>${escapeHtml(rule)}</li>`)
    .join('');
}

function applyVariantClasses() {
  const schieberMode = game && isSchieber(game);
  tableArea.classList.toggle('mode-schieber', schieberMode);
  tableArea.classList.toggle('mode-bieter', !schieberMode);
  trickTable.classList.toggle('mode-schieber', schieberMode);
  trickTable.classList.toggle('mode-bieter', !schieberMode);
  screenGame.dataset.variant = game ? game.variantId : '';
}

function renderScorePanel() {
  scorePanel.innerHTML = game.players.map((player) => {
    const active = player.id === game.currentPlayer && isInteractivePhase();

    if (isBieter(game)) {
      const isSolo = player.id === game.soloPlayer && game.phase !== 'bidding' && game.phase !== 'setup';
      return `
        <div class="score-card${active ? ' active' : ''}${isSolo ? ' special' : ''}">
          <div class="score-name">${escapeHtml(player.name)}</div>
          <div class="score-total">${getDisplayScore(game, player.id)}</div>
          <div class="score-sub">/ ${game.variant.targetScore}</div>
          ${player.bid !== null ? `<div class="score-badge">${player.bid === 0 ? 'Pass' : `Gebot ${player.bid}`}</div>` : ''}
          ${game.phase !== 'bidding' && game.phase !== 'setup'
            ? `<div class="score-stats">${player.tricksWon} Stiche | ${player.pointsWon} Pkt</div>`
            : ''}
        </div>
      `;
    }

    const team = getPlayerTeam(game, player.id);
    const allied = player.teamId === game.players[0].teamId;

    return `
      <div class="score-card${active ? ' active' : ''}${allied ? ' allied' : ''}">
        <div class="score-name">${escapeHtml(player.name)}</div>
        <div class="score-total">${getDisplayScore(game, player.id)}</div>
        <div class="score-sub">${escapeHtml(team ? team.name : '')}</div>
        <div class="score-stats">${player.tricksWon} Stiche | ${player.pointsWon} Pkt</div>
      </div>
    `;
  }).join('');
}

function renderTrumpDisplay() {
  if (!game.trumpSuit) {
    trumpDisplay.classList.add('hidden');
    trumpDisplay.innerHTML = '';
    return;
  }

  trumpDisplay.classList.remove('hidden');
  trumpDisplay.innerHTML = `
    <span class="trump-label">Trumpf</span>
    <img class="trump-suit-icon" src="${cardImagePath({ suit: game.trumpSuit, rank: 'under' })}" alt="">
    <span>${escapeHtml(SUIT_LABELS[game.trumpSuit])}</span>
  `;
}

function renderZones() {
  ZONE_POSITIONS.forEach((position) => {
    const zone = zoneEls[position];
    const handEl = handEls[position];
    const nameEl = nameEls[position];
    const badgeEl = badgeEls[position];
    const playerIndexString = playerIndexForPosition(position);

    handEl.innerHTML = '';

    if (playerIndexString === undefined) {
      zone.classList.add('hidden');
      badgeEl.textContent = '';
      nameEl.textContent = '';
      return;
    }

    const playerIndex = Number(playerIndexString);
    const player = game.players[playerIndex];
    const isActive = player.id === game.currentPlayer && isInteractivePhase();
    zone.classList.remove('hidden');
    zone.classList.toggle('active-zone', isActive);

    nameEl.textContent = player.name;
    badgeEl.textContent = getPlayerBadge(playerIndex);
    badgeEl.className = `player-badge${badgeEl.textContent ? ' has-badge' : ''}`;

    if (player.isHuman) {
      const humanTurn = game.phase === 'playing' && game.currentPlayer === playerIndex;
      const playableCards = humanTurn ? getPlayableCardsForPlayer(game, playerIndex) : [];
      const playableIds = new Set(playableCards.map((card) => card.id));

      player.hand.forEach((card, cardIndex) => {
        const playable = humanTurn && playableIds.has(card.id);
        const element = cardFaceEl(card, playable, playable ? () => {
          try {
            const trickComplete = playCard(game, playerIndex, card.id);
            if (trickComplete) {
              resolveTrick(game);
            }
            gameLoop();
          } catch (error) {
            msgEl.textContent = error.message;
          }
        } : null);

        if (humanTurn && !playable) {
          element.classList.add('dimmed');
        }
        if (isSuitBreak(player.hand, cardIndex)) {
          element.classList.add('suit-break');
        }

        applyFanStyle(element, cardIndex, player.hand.length);

        handEl.appendChild(element);
      });
      return;
    }

    player.hand.forEach(() => {
      handEl.appendChild(cardBackEl());
    });
  });
}

function renderTrick() {
  const capturedPile = game.phase === 'trickEnd'
    ? pileIdForWinner(game, game.trickLeader)
    : null;

  ZONE_POSITIONS.forEach((position) => {
    const slot = trickSlots[position];
    const playerIndexString = playerIndexForPosition(position);
    slot.innerHTML = '';

    if (playerIndexString === undefined) {
      slot.classList.add('hidden-slot');
      return;
    }

    const playerIndex = Number(playerIndexString);
    const player = game.players[playerIndex];
    const entry = game.trick.find((current) => current.playerIndex === playerIndex);
    const animationKey = entry
      ? `${game.roundNumber}:${game.trickNumber}:${playerIndex}:${entry.card.id}`
      : '';
    const shouldFlyIn = Boolean(entry)
      && game.phase === 'playing'
      && !animatedTrickCards.has(animationKey);

    if (shouldFlyIn) {
      animatedTrickCards.add(animationKey);
    }

    slot.classList.remove('hidden-slot');

    if (entry) {
      slot.appendChild(trickCardEl(
        entry.card,
        game.phase === 'trickEnd' && game.trickLeader === playerIndex,
        capturedPile,
        shouldFlyIn
      ));
      return;
    }

    const empty = document.createElement('div');
    empty.className = 'trick-empty';
    empty.textContent = player.name;
    slot.appendChild(empty);
  });
}

function renderCapturedPiles() {
  pileEls.forEach((pile, pileId) => {
    const cards = game.capturedCards?.[pileId] || [];
    const tricks = game.capturedTricks?.[pileId] || 0;
    const visibleCards = cards.slice(-5);

    pile.root.classList.toggle('pile-highlight', game.phase === 'trickEnd' && game.lastCapturedPile === pileId);
    pile.label.textContent = pileLabel(pileId);
    pile.count.textContent = `${tricks} ${tricks === 1 ? 'Stich' : 'Stiche'}`;
    pile.deck.innerHTML = '';

    if (visibleCards.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'pile-empty-card';
      pile.deck.appendChild(empty);
      return;
    }

    visibleCards.forEach((card, index) => {
      const element = document.createElement('div');
      element.className = 'pile-card';
      element.style.setProperty('--pile-card-index', String(index));
      element.style.setProperty('--pile-card-turn', `${(index - 2) * 4}deg`);

      const image = document.createElement('img');
      image.src = cardImagePath(card);
      image.alt = cardLabel(card);
      image.draggable = false;
      element.appendChild(image);
      pile.deck.appendChild(element);
    });
  });
}

function renderMessage() {
  msgEl.className = 'message';

  if (game.phase === 'bidding') {
    msgEl.textContent = game.players[game.currentPlayer].isHuman
      ? 'Dein Gebot:'
      : `${game.players[game.currentPlayer].name} bietet...`;
    return;
  }

  if (game.phase === 'chooseTrump') {
    if (game.players[game.currentPlayer].isHuman) {
      msgEl.textContent = canPushTrump(game)
      ? 'Wähle Trumpf oder schiebe an deinen Partner.'
      : 'Wähle den Trumpf.';
      return;
    }

    msgEl.textContent = `${game.players[game.currentPlayer].name} wählt Trumpf...`;
    return;
  }

  if (game.phase === 'playing') {
    msgEl.textContent = game.players[game.currentPlayer].isHuman
      ? 'Wähle eine Karte zum Spielen.'
      : `${game.players[game.currentPlayer].name} spielt...`;
    return;
  }

  if (game.phase === 'trickEnd') {
    msgEl.textContent = `${game.players[game.trickLeader].name} gewinnt den Stich.`;
    return;
  }

  if (game.phase === 'roundEnd' && game.roundSummary) {
    if (isBieter(game)) {
      const soloPlayer = game.players[game.roundSummary.soloPlayer];
      msgEl.textContent = game.roundSummary.succeeded
        ? `${soloPlayer.name} erfüllt ${game.roundSummary.bid}.`
        : `${soloPlayer.name} verpasst ${game.roundSummary.bid}.`;
      msgEl.classList.add(game.roundSummary.succeeded ? 'msg-ok' : 'msg-bad');
      return;
    }

    const winner = game.teams.find((team) => team.id === game.roundSummary.roundWinnerTeamId);
    msgEl.textContent = `${winner.name} gewinnt die Runde.`;
    msgEl.classList.add('msg-ok');
    return;
  }

  if (game.phase === 'gameOver') {
    if (isBieter(game)) {
      const winner = [...game.players].sort((first, second) => second.totalScore - first.totalScore)[0];
      msgEl.textContent = `${winner.name} gewinnt das Spiel.`;
      msgEl.classList.add('msg-ok');
      return;
    }

    const winner = [...game.teams].sort((first, second) => second.totalScore - first.totalScore)[0];
    msgEl.textContent = `${winner.name} gewinnt das Spiel.`;
    msgEl.classList.add('msg-ok');
  }
}

function renderControls() {
  const humanTurn = game.players[game.currentPlayer]?.isHuman;
  const showBid = isBieter(game) && game.phase === 'bidding' && humanTurn;
  const showTrump = game.phase === 'chooseTrump' && humanTurn;

  bidControls.classList.toggle('hidden', !showBid);
  trumpControls.classList.toggle('hidden', !showTrump);
  roundEndControls.classList.toggle('hidden', game.phase !== 'roundEnd');
  gameOverControls.classList.toggle('hidden', game.phase !== 'gameOver');

  if (showBid) {
    bidSelect.innerHTML = '';
    BID_VALUES.forEach((value) => {
      if (value === 0 || value > game.highestBid) {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = value === 0 ? 'Pass' : String(value);
        bidSelect.appendChild(option);
      }
    });
  }

  if (showTrump) {
    trumpPrompt.textContent = canPushTrump(game) ? 'Trumpf wählen oder schieben:' : 'Trumpf wählen:';
    btnPush.classList.toggle('hidden', !canPushTrump(game));
  }
}

function renderRoundSummary() {
  if (game.phase !== 'roundEnd' || !game.roundSummary) {
    roundEndMsg.innerHTML = '';
    return;
  }

  if (isBieter(game)) {
    const soloPlayer = game.players[game.roundSummary.soloPlayer];
    const defenderNames = game.players
      .filter((player) => player.id !== game.roundSummary.soloPlayer)
      .map((player) => player.name)
      .join(' & ');

    roundEndMsg.innerHTML = game.roundSummary.succeeded
      ? `<strong>${escapeHtml(soloPlayer.name)}</strong> erfüllt ${game.roundSummary.bid}.<br>${game.roundSummary.soloPoints} Punkte in der Runde, +${game.roundSummary.soloGain} Spielpunkte.`
      : `<strong>${escapeHtml(soloPlayer.name)}</strong> scheitert mit ${game.roundSummary.soloPoints}/${game.roundSummary.bid}.<br>${escapeHtml(soloPlayer.name)}: ${game.roundSummary.soloGain} Spielpunkte.<br>${escapeHtml(defenderNames)}: je +${game.roundSummary.defenderGain} Spielpunkte.`;
    return;
  }

  const ownTeam = game.roundSummary.results.find((result) => result.teamId === 0);
  const enemyTeam = game.roundSummary.results.find((result) => result.teamId === 1);
  const winner = game.teams.find((team) => team.id === game.roundSummary.roundWinnerTeamId);
  const pushLine = game.roundSummary.pushed
    ? `<br>Trumpfwahl wurde an ${escapeHtml(game.players[game.roundSummary.trumpChooser].name)} geschoben.`
    : '';

  roundEndMsg.innerHTML = `
    <strong>${escapeHtml(ownTeam.name)}</strong>: ${ownTeam.roundPoints} Punkte, ${ownTeam.tricksWon} Stiche<br>
    <strong>${escapeHtml(enemyTeam.name)}</strong>: ${enemyTeam.roundPoints} Punkte, ${enemyTeam.tricksWon} Stiche<br>
    Rundensieger: <strong>${escapeHtml(winner.name)}</strong>${pushLine}
  `;
}

function renderGameOver() {
  if (game.phase !== 'gameOver') {
    gameOverMsg.innerHTML = '';
    return;
  }

  if (isBieter(game)) {
    const ranking = [...game.players].sort((first, second) => second.totalScore - first.totalScore);
    gameOverMsg.innerHTML = ranking
      .map((player, index) => `${index + 1}. ${escapeHtml(player.name)} - ${player.totalScore} Punkte`)
      .join('<br>');
    return;
  }

  const ranking = [...game.teams].sort((first, second) => second.totalScore - first.totalScore);
  gameOverMsg.innerHTML = ranking
    .map((team, index) => `${index + 1}. ${escapeHtml(team.name)} - ${team.totalScore} Punkte`)
    .join('<br>');
}

function renderLog() {
  logEl.innerHTML = [...game.log]
    .reverse()
    .map((line) => `<div class="log-line">${escapeHtml(line)}</div>`)
    .join('');
}

function render() {
  if (!game) {
    return;
  }

  gameModeLabel.textContent = game.variant.modeLabel;
  applyVariantClasses();
  renderScorePanel();
  renderTrumpDisplay();
  renderZones();
  renderTrick();
  renderCapturedPiles();
  renderMessage();
  renderControls();
  renderRoundSummary();
  renderGameOver();
  renderLog();
}

function queueAiAction(delayMs, action) {
  aiLocked = true;
  window.setTimeout(() => {
    aiLocked = false;
    if (!game) {
      return;
    }
    try {
      action();
    } catch (error) {
      msgEl.textContent = error.message;
      return;
    }
    gameLoop();
  }, delayMs);
}

function randomDelay([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function gameLoop() {
  render();

  if (!game || aiLocked) {
    return;
  }

  const currentPlayer = game.players[game.currentPlayer];

  if (game.phase === 'bidding' && !currentPlayer.isHuman) {
    queueAiAction(randomDelay(AI_DELAYS.bidding), () => {
      submitBid(game, game.currentPlayer, aiBidDecision(currentPlayer.hand, game.highestBid));
    });
    return;
  }

  if (game.phase === 'chooseTrump' && !currentPlayer.isHuman) {
    queueAiAction(randomDelay(AI_DELAYS.trump), () => {
      chooseTrump(game, bestTrumpSuit(currentPlayer.hand));
    });
    return;
  }

  if (game.phase === 'playing' && !currentPlayer.isHuman) {
    queueAiAction(randomDelay(AI_DELAYS.card), () => {
      const card = aiChooseCard(game, game.currentPlayer);
      const trickComplete = playCard(game, game.currentPlayer, card.id);
      if (trickComplete) {
        resolveTrick(game);
      }
    });
    return;
  }

  if (game.phase === 'trickEnd') {
    queueAiAction(randomDelay(AI_DELAYS.trickEnd), () => {
      if (game.phase === 'trickEnd') {
        startNextTrick(game);
      }
    });
  }
}

function startSelectedGame() {
  const playerName = playerNameInput.value.trim() || 'Du';
  game = createGame({ variantId: selectedVariantId, playerName });
  aiLocked = false;
  animatedTrickCards = new Set();

  screenSetup.classList.add('hidden');
  screenGame.classList.remove('hidden');

  startRound(game);
  gameLoop();
}

variantCards.forEach((card) => {
  card.addEventListener('click', () => {
    setSetupVariant(card.dataset.variant);
  });
});

btnStart.addEventListener('click', startSelectedGame);

playerNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    startSelectedGame();
  }
});

btnBid.addEventListener('click', () => {
  try {
    submitBid(game, game.currentPlayer, Number.parseInt(bidSelect.value, 10));
    gameLoop();
  } catch (error) {
    msgEl.textContent = error.message;
  }
});

document.querySelectorAll('.trump-btn').forEach((button) => {
  button.addEventListener('click', () => {
    try {
      chooseTrump(game, button.dataset.suit);
      gameLoop();
    } catch (error) {
      msgEl.textContent = error.message;
    }
  });
});

btnPush.addEventListener('click', () => {
  try {
    pushTrumpChoice(game);
    gameLoop();
  } catch (error) {
    msgEl.textContent = error.message;
  }
});

btnNextRound.addEventListener('click', () => {
  animatedTrickCards = new Set();
  startRound(game);
  gameLoop();
});

btnNewGame.addEventListener('click', () => {
  game = null;
  aiLocked = false;
  animatedTrickCards = new Set();
  screenGame.classList.add('hidden');
  screenSetup.classList.remove('hidden');
});

setSetupVariant(selectedVariantId);

SUITS.forEach((suit) => {
  const button = document.querySelector(`.trump-btn[data-suit="${suit}"]`);
  if (button) {
    button.textContent = SUIT_LABELS[suit];
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Local non-HTTPS testing can block service workers; the game still runs.
    });
  });
}
