import {
  BID_VALUES,
  GAME_VARIANTS,
  ROUND_MODE_LABELS,
  ROUND_MODE_OPTIONS,
  SCHIEBER_TARGET_SCORES,
  AI_DIFFICULTIES,
  AI_DIFFICULTY_LABELS,
  RANKS,
  RANK_LABELS,
  RULE_SET,
  SEQUENCE_POINTS,
  fourOfAKindPoints,
  partnerOf,
  cardImagePath,
  cardPoints,
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
  getDisplayScore,
  getGameTargetScore,
  getRoundMultiplier,
  getRoundModeLabel,
  getSchieberTeamBasePoints,
  getSchieberTeamRoundPoints,
  getSchieberTeamMatchPoints,
  getTeamStoeckPoints,
  getTeamWeisPoints,
  getPossibleWeisForPlayer,
  submitWeisDeclaration,
  declineWeis,
  describeWeis,
  isBieter,
  isSchieber,
  isTrumpMode,
  pileIdForWinner,
} from './game-engine.js';
import {
  aiBidDecision,
  aiChooseCard,
  bestSchieberMode,
  bestTrumpSuit,
  shouldPushTrump,
} from './ai.js';

const ZONE_POSITIONS = ['left', 'top', 'right', 'bottom'];
const PLAYER_POSITIONS = {
  bieter: { 0: 'bottom', 1: 'left', 2: 'right' },
  schieber: { 0: 'bottom', 1: 'left', 2: 'top', 3: 'right' },
};
const AI_DELAYS = {
  bidding: [1200, 2100],
  trump: [1500, 2600],
  weis: [900, 1700],
  card: [1500, 2700],
  trickEnd: [1700, 2500],
};

const SPEED_FACTORS = { langsam: 1.5, normal: 1, schnell: 0.45 };
const SPEED_LABELS = { langsam: 'Langsam', normal: 'Normal', schnell: 'Schnell' };
const SPEED_ORDER = ['langsam', 'normal', 'schnell'];
const SPEED_COPY = {
  langsam: 'Viel Zeit, jeden Zug in Ruhe mitlesen.',
  normal: 'Ausgewogenes Tempo.',
  schnell: 'Zügig. Ein Tipp auf den Tisch überspringt zusätzlich jede Wartezeit.',
};

const DIFFICULTY_COPY = {
  einfach: 'Spielt geradeaus, ohne Plan. Gut zum Reinkommen.',
  normal: 'Zieht Trumpf, schmiert dem Partner und sticht sparsam.',
  schwer: 'Merkt sich zusätzlich alle gespielten Karten.',
};

let selectedVariantId = 'bieter';
let selectedSchieberTargetScore = 1000;
let selectedDifficulty = 'normal';
let selectedSpeed = 'normal';
let game = null;
let aiLocked = false;
let animatedTrickCards = new Set();
let pendingAiAction = null;
let pendingAiTimeout = null;

const screenSetup = document.getElementById('screen-setup');
const screenGame = document.getElementById('screen-game');
const setupSub = document.getElementById('setup-sub');
const setupRulesList = document.getElementById('setup-rules-list');
const setupTargetSection = document.getElementById('setup-target-section');
const setupTargetOptions = document.getElementById('setup-target-options');
const setupTargetHint = document.getElementById('setup-target-hint');
const setupDifficultyOptions = document.getElementById('setup-difficulty-options');
const setupDifficultyHint = document.getElementById('setup-difficulty-hint');
const setupSpeedOptions = document.getElementById('setup-speed-options');
const setupSpeedHint = document.getElementById('setup-speed-hint');
const btnRulesSetup = document.getElementById('btn-rules-setup');
const variantCards = [...document.querySelectorAll('.variant-card')];
const playerNameInput = document.getElementById('player-name');
const btnStart = document.getElementById('btn-start');
const btnResume = document.getElementById('btn-resume');
const resumeHint = document.getElementById('resume-hint');
const scorePanel = document.getElementById('score-panel');
const msgEl = document.getElementById('message');
const trumpDisplay = document.getElementById('trump-display');
const targetDisplay = document.getElementById('target-display');
const logEl = document.getElementById('log-messages');
const gameModeLabel = document.getElementById('game-mode-label');
const tableArea = document.getElementById('table-area');
const playArea = document.querySelector('.play-area');
const trickTable = document.getElementById('trick-table');
const bidControls = document.getElementById('bid-controls');
const bidSelect = document.getElementById('bid-select');
const btnBid = document.getElementById('btn-bid');
const trumpControls = document.getElementById('trump-controls');
const trumpPrompt = document.getElementById('trump-prompt');
const btnPush = document.getElementById('btn-push');
const weisControls = document.getElementById('weis-controls');
const weisPrompt = document.getElementById('weis-prompt');
const weisList = document.getElementById('weis-list');
const btnWeis = document.getElementById('btn-weis');
const btnWeisSkip = document.getElementById('btn-weis-skip');
const roundEndControls = document.getElementById('round-end-controls');
const roundEndMsg = document.getElementById('round-end-msg');
const btnNextRound = document.getElementById('btn-next-round');
const gameOverControls = document.getElementById('game-over-controls');
const gameOverMsg = document.getElementById('game-over-msg');
const btnNewGame = document.getElementById('btn-new-game');
const btnHome = document.getElementById('btn-home');
const btnSpeed = document.getElementById('btn-speed');
const btnScoreboard = document.getElementById('btn-scoreboard');
const btnRules = document.getElementById('btn-rules');
const scoreboard = document.getElementById('scoreboard');
const scoreboardBody = document.getElementById('scoreboard-body');
const btnCloseScoreboard = document.getElementById('btn-close-scoreboard');
const rulesSheet = document.getElementById('rules-sheet');
const rulesSheetBody = document.getElementById('rules-sheet-body');
const btnCloseRules = document.getElementById('btn-close-rules');
const trickReview = document.getElementById('trick-review');
const trickReviewText = document.getElementById('trick-review-text');
const trickReviewCards = document.getElementById('trick-review-cards');
const btnCloseReview = document.getElementById('btn-close-review');

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
const pileAnchorEls = {
  left: document.getElementById('pile-anchor-left'),
  top: document.getElementById('pile-anchor-top'),
  right: document.getElementById('pile-anchor-right'),
};
const trickSlots = Object.fromEntries(
  ZONE_POSITIONS.map((position) => [position, document.getElementById(`trick-slot-${position}`)])
);
const pileEls = [0, 1].map((pileId) => ({
  root: document.getElementById(`pile-${pileId}`),
  label: document.getElementById(`pile-label-${pileId}`),
  deck: document.getElementById(`pile-deck-${pileId}`),
  count: document.getElementById(`pile-count-${pileId}`),
}));

const STORAGE_KEY = 'bachmann-jass:game:v1';
const SETTINGS_KEY = 'bachmann-jass:settings:v1';

/**
 * localStorage kann in privaten Fenstern oder bei blockierten Site-Daten werfen.
 * Die App muss auch dann laufen, nur eben ohne Speicherstand.
 */
function withStorage(action, fallback = null) {
  try {
    return action(window.localStorage);
  } catch (error) {
    return fallback;
  }
}

function saveGame() {
  if (!game || game.phase === 'gameOver') {
    return;
  }
  withStorage((store) => store.setItem(STORAGE_KEY, JSON.stringify({
    savedAt: Date.now(),
    game,
  })));
}

function clearSavedGame() {
  withStorage((store) => store.removeItem(STORAGE_KEY));
}

function loadSavedGame() {
  return withStorage((store) => {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const saved = parsed?.game;
    if (!saved || !GAME_VARIANTS[saved.variantId] || ['setup', 'gameOver'].includes(saved.phase)) {
      return null;
    }

    // Die Variantendefinition wird frisch verknuepft, damit Regelaenderungen
    // auch in einer laufenden Partie greifen.
    saved.variant = GAME_VARIANTS[saved.variantId];
    return { game: saved, savedAt: parsed.savedAt };
  });
}

function saveSettings() {
  withStorage((store) => store.setItem(SETTINGS_KEY, JSON.stringify({
    playerName: playerNameInput.value.trim(),
    variantId: selectedVariantId,
    targetScore: selectedSchieberTargetScore,
    difficulty: selectedDifficulty,
    speed: selectedSpeed,
  })));
}

function restoreSettings() {
  const settings = withStorage((store) => JSON.parse(store.getItem(SETTINGS_KEY) || 'null'));
  if (!settings) {
    return;
  }

  if (settings.playerName) {
    playerNameInput.value = settings.playerName;
  }
  if (GAME_VARIANTS[settings.variantId]) {
    selectedVariantId = settings.variantId;
  }
  if (SCHIEBER_TARGET_SCORES.includes(settings.targetScore)) {
    selectedSchieberTargetScore = settings.targetScore;
  }
  if (AI_DIFFICULTIES.includes(settings.difficulty)) {
    selectedDifficulty = settings.difficulty;
  }
  if (SPEED_ORDER.includes(settings.speed)) {
    selectedSpeed = settings.speed;
  }
}

function renderResumeOption() {
  const saved = loadSavedGame();
  if (!saved) {
    btnResume.classList.add('hidden');
    resumeHint.classList.add('hidden');
    resumeHint.textContent = '';
    return;
  }

  const variantLabel = GAME_VARIANTS[saved.game.variantId].label;
  const savedDate = new Date(saved.savedAt);
  const timeLabel = Number.isNaN(savedDate.getTime())
    ? ''
    : ` - ${savedDate.toLocaleDateString('de-CH')} ${savedDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;

  btnResume.classList.remove('hidden');
  resumeHint.classList.remove('hidden');
  resumeHint.textContent = `${variantLabel}, Runde ${saved.game.roundNumber}${timeLabel}`;
}

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
  return ['bidding', 'chooseTrump', 'announceWeis', 'playing'].includes(game.phase);
}

function getPlayerBadge(playerIndex) {
  const player = game.players[playerIndex];

  if (isBieter(game)) {
    if (player.bid === null) {
      return playerIndex === game.dealer ? 'Geber' : '';
    }
    return player.bid === 0 ? 'Pass' : String(player.bid);
  }

  // Der Partner kann zugleich Geber sein - dann muss beides sichtbar bleiben.
  const marks = [];
  if (playerIndex === partnerOf(game, 0)) {
    marks.push('Partner');
  }
  if (playerIndex === game.dealer) {
    marks.push('Geber');
  }
  return marks.join(' · ');
}

function cardBackEl() {
  const element = document.createElement('div');
  element.className = 'card card-back';
  return element;
}

function cardFaceEl(card, isPlayable, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `card card-face${isPlayable ? ' playable' : ''}`;
  element.setAttribute(
    'aria-label',
    onClick ? `${cardLabel(card)} spielen` : `${cardLabel(card)}${isPlayable ? '' : ' - nicht spielbar'}`
  );

  if (!onClick) {
    element.disabled = true;
  }

  const image = document.createElement('img');
  image.src = cardImagePath(card);
  image.alt = '';
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

/**
 * Zieht die eigene Hand so weit zusammen, dass alle Karten sichtbar bleiben.
 * Noetig, weil ein Bieterjass-Blatt zwoelf Karten hat und auf schmalen Geraeten
 * sonst ueber den Rand laeuft.
 */
function fitHumanHand(handEl) {
  handEl.style.removeProperty('--human-hand-overlap-current');

  const cards = [...handEl.children];
  if (cards.length < 2 || handEl.clientWidth === 0) {
    return;
  }

  const cardWidth = cards[0].getBoundingClientRect().width;
  if (cardWidth === 0) {
    return;
  }

  // Bis zu drei Durchgaenge: die Begrenzung auf 88 Prozent Ueberdeckung kann
  // einen Rest offen lassen, den der naechste Durchgang aufnimmt.
  for (let pass = 0; pass < 3; pass += 1) {
    const overflow = handEl.scrollWidth - handEl.clientWidth;
    if (overflow <= 0) {
      return;
    }

    const currentMargin = Number.parseFloat(window.getComputedStyle(cards[1]).marginLeft) || 0;
    const tightened = currentMargin - overflow / (cards.length - 1);
    const margin = Math.max(tightened, -cardWidth * 0.88);

    handEl.style.setProperty('--human-hand-overlap-current', `${margin.toFixed(2)}px`);
    if (margin === -cardWidth * 0.88) {
      return;
    }
  }
}

function isSuitBreak(hand, index) {
  return index > 0 && hand[index - 1].suit !== hand[index].suit;
}

function trickCardEl(card, isWinner, flyTargetClass = '', shouldFlyIn = false) {
  const element = document.createElement('div');
  element.className = [
    'trick-card',
    isWinner ? 'trick-winner' : '',
    flyTargetClass,
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

function teamRoundTricks(teamId) {
  return game.players
    .filter((player) => player.teamId === teamId)
    .reduce((sum, player) => sum + player.tricksWon, 0);
}

function pileOwnerIndex(pileId) {
  if (!isSchieber(game)) {
    return -1;
  }

  const fallbackTeam = game.teams.find((team) => team.id === pileId);
  return game.capturedPileOwners?.[pileId] ?? fallbackTeam?.playerIds[0] ?? 0;
}

function pileOwnerPosition(pileId) {
  if (isSchieber(game) && pileId === 0) {
    return 'top';
  }

  const ownerIndex = pileOwnerIndex(pileId);
  return PLAYER_POSITIONS[game.variantId][ownerIndex] || 'bottom';
}

function pileFlyTargetClass(pileId) {
  if (pileId === null) {
    return '';
  }

  if (isSchieber(game)) {
    return `fly-to-player-${pileOwnerPosition(pileId)}`;
  }

  return `fly-to-pile-${pileId}`;
}

function placeCapturedPiles() {
  if (!isSchieber(game)) {
    pileEls.forEach((pile) => {
      pile.root.classList.remove('pile-in-player-zone');
      delete pile.root.dataset.ownerPosition;
      delete pile.root.dataset.ownerPlayer;
    });

    playArea.insertBefore(pileEls[0].root, trickTable);
    playArea.appendChild(pileEls[1].root);
    return;
  }

  pileEls.forEach((pile, pileId) => {
    const ownerIndex = pileOwnerIndex(pileId);
    const ownerPosition = pileOwnerPosition(pileId);
    const anchor = pileAnchorEls[ownerPosition];

    pile.root.classList.add('pile-in-player-zone');
    pile.root.dataset.pileId = String(pileId);
    pile.root.dataset.ownerPosition = ownerPosition;
    pile.root.dataset.ownerPlayer = String(ownerIndex);

    if (anchor) {
      anchor.appendChild(pile.root);
    }
  });
}

function closeTrickReview() {
  trickReview.classList.add('hidden');
  trickReviewText.textContent = '';
  trickReviewCards.innerHTML = '';
}

function closeAllDialogs() {
  closeTrickReview();
  closeScoreboard();
  closeRulesSheet();
}

function openFirstTrickReview(pileId) {
  if (!game?.firstCapturedTrick) {
    msgEl.textContent = 'Nach dem ersten Stich kannst du ihn hier nochmals ansehen.';
    return;
  }

  if (game.firstCapturedTrick.pileId !== pileId) {
    msgEl.textContent = 'Der erste Stich liegt nicht in diesem Stapel.';
    return;
  }

  const firstTrick = game.firstCapturedTrick;
  const winner = game.players[firstTrick.winner];
  trickReviewText.textContent = `${winner.name} hat diesen ersten Stich gewonnen.`;
  trickReviewCards.innerHTML = '';

  firstTrick.cards.forEach(({ playerIndex, card }) => {
    const wrapper = document.createElement('div');
    wrapper.className = `review-card${playerIndex === firstTrick.winner ? ' review-card-winner' : ''}`;

    const image = document.createElement('img');
    image.src = cardImagePath(card);
    image.alt = cardLabel(card);
    image.draggable = false;

    const caption = document.createElement('div');
    caption.className = 'review-card-name';
    caption.textContent = game.players[playerIndex].name;

    wrapper.appendChild(image);
    wrapper.appendChild(caption);
    trickReviewCards.appendChild(wrapper);
  });

  trickReview.classList.remove('hidden');
}

/** Fasst die Spielart-Multiplikatoren aus dem RULE_SET als Text zusammen. */
function describeMultipliers() {
  const byFactor = new Map();
  Object.entries(RULE_SET.roundMultipliers).forEach(([mode, factor]) => {
    if (!byFactor.has(factor)) {
      byFactor.set(factor, []);
    }
    byFactor.get(factor).push(getRoundModeLabel(mode));
  });

  return [...byFactor.entries()]
    .sort((first, second) => first[0] - second[0])
    .map(([factor, modes]) => `${modes.join('/')} x${factor}`)
    .join(', ');
}

function renderSetupTargetOptions() {
  if (selectedVariantId !== 'schieber') {
    setupTargetSection.classList.add('hidden');
    return;
  }

  setupTargetSection.classList.remove('hidden');
  setupTargetOptions.innerHTML = SCHIEBER_TARGET_SCORES.map((score) => {
    const active = selectedSchieberTargetScore === score;
    // Aus dem RULE_SET erzeugt, damit die Beschreibung nicht von den echten
    // Multiplikatoren abweichen kann.
    const copy = score === 1000
      ? 'Alle Spielarten zählen einfach.'
      : describeMultipliers();

    return `
      <button
        type="button"
        class="target-card${active ? ' active' : ''}"
        data-target-score="${score}"
        aria-pressed="${active ? 'true' : 'false'}"
      >
        <span class="target-title">${score} Punkte</span>
        <span class="target-copy">${escapeHtml(copy)}</span>
      </button>
    `;
  }).join('');

  setupTargetHint.textContent = selectedSchieberTargetScore === 2500
    ? '2500er-Partie mit Multiplikatoren pro Spielart.'
    : '1000er-Partie ohne Spielart-Multiplikatoren.';
}

function renderSetupDifficultyOptions() {
  setupDifficultyOptions.innerHTML = AI_DIFFICULTIES.map((level) => {
    const active = selectedDifficulty === level;
    return `
      <button
        type="button"
        class="target-card${active ? ' active' : ''}"
        data-difficulty="${level}"
        aria-pressed="${active ? 'true' : 'false'}"
      >
        <span class="target-title">${escapeHtml(AI_DIFFICULTY_LABELS[level])}</span>
      </button>
    `;
  }).join('');

  setupDifficultyHint.textContent = DIFFICULTY_COPY[selectedDifficulty];
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
  const rules = [...variant.rules];
  if (variantId === 'schieber') {
    rules.push(selectedSchieberTargetScore === 2500
      ? 'Aktuelle Setup-Wahl: 2500 Punkte mit Runden-Multiplikatoren.'
      : 'Aktuelle Setup-Wahl: 1000 Punkte, alle Spielarten einfach.');
  }
  setupRulesList.innerHTML = rules
    .map((rule) => `<li>${escapeHtml(rule)}</li>`)
    .join('');

  renderSetupTargetOptions();
  renderSetupDifficultyOptions();
  renderSetupSpeedOptions();
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
  if (isSchieber(game)) {
    const currentTeamId = game.players[game.currentPlayer]?.teamId;
    const targetScore = getGameTargetScore(game);
    const multiplier = getRoundMultiplier(game);
    scorePanel.innerHTML = game.teams.map((team) => {
      const roundPoints = getSchieberTeamRoundPoints(game, team.id);
      const basePoints = getSchieberTeamBasePoints(game, team.id);
      const weisPoints = getTeamWeisPoints(game, team.id);
      const stoeckPoints = getTeamStoeckPoints(game, team.id);
      const matchPoints = getSchieberTeamMatchPoints(game, team.id);
      const tricks = teamRoundTricks(team.id);
      const active = team.id === currentTeamId && isInteractivePhase();
      const allied = team.id === game.players[0].teamId;
      const multiplierText = multiplier > 1 && game.roundMode ? ` x${multiplier}` : '';

      return `
        <div class="score-card score-team${active ? ' active' : ''}${allied ? ' allied' : ''}">
          <div class="score-name">${escapeHtml(team.name)}</div>
          <div class="score-total">${roundPoints}</div>
          <div class="score-sub">Runde ${basePoints}${multiplierText} | Gesamt ${team.totalScore}/${targetScore}</div>
          <div class="score-stats">${tricks} ${tricks === 1 ? 'Stich' : 'Stiche'}${weisPoints ? ` | Weis ${weisPoints}` : ''}${stoeckPoints ? ` | Stöck ${stoeckPoints}` : ''}${matchPoints ? ' | Match' : ''}</div>
        </div>
      `;
    }).join('');
    return;
  }

  scorePanel.innerHTML = game.players.map((player) => {
    const active = player.id === game.currentPlayer && isInteractivePhase();
    const isSolo = player.id === game.soloPlayer && game.phase !== 'bidding' && game.phase !== 'setup';
    return `
      <div class="score-card${active ? ' active' : ''}${isSolo ? ' special' : ''}">
        <div class="score-name">${escapeHtml(player.name)}</div>
        <div class="score-total">${getDisplayScore(game, player.id)}</div>
        <div class="score-sub">/ ${getGameTargetScore(game)}</div>
        ${player.bid !== null ? `<div class="score-badge">${player.bid === 0 ? 'Pass' : `Gebot ${player.bid}`}</div>` : ''}
        ${game.phase !== 'bidding' && game.phase !== 'setup'
          ? `<div class="score-stats">${player.tricksWon} Stiche | ${player.pointsWon} Pkt</div>`
          : ''}
      </div>
    `;
  }).join('');
}

function renderTrumpDisplay() {
  if (!game.roundMode) {
    trumpDisplay.classList.add('hidden');
    trumpDisplay.innerHTML = '';
    return;
  }

  trumpDisplay.classList.remove('hidden');
  const modeLabel = getRoundModeLabel(game.roundMode);
  const content = isTrumpMode(game.roundMode)
    ? `
      <span class="trump-label">Spielart</span>
      <img class="trump-suit-icon" src="${cardImagePath({ suit: game.roundMode, rank: 'under' })}" alt="">
      <span>${escapeHtml(modeLabel)} Trumpf</span>
    `
    : `
      <span class="trump-label">Spielart</span>
      <span class="mode-chip">${escapeHtml(modeLabel)}</span>
    `;
  trumpDisplay.innerHTML = content;
}

function renderTargetDisplay() {
  if (!game) {
    targetDisplay.classList.add('hidden');
    targetDisplay.innerHTML = '';
    return;
  }

  targetDisplay.classList.remove('hidden');
  targetDisplay.innerHTML = `
    <span class="target-label">Ziel</span>
    <span>${getGameTargetScore(game)} Punkte</span>
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
      fitHumanHand(handEl);
      window.requestAnimationFrame(() => fitHumanHand(handEl));
      return;
    }

    player.hand.forEach((_, cardIndex) => {
      const element = cardBackEl();
      applyFanStyle(element, cardIndex, player.hand.length);
      handEl.appendChild(element);
    });
  });
}

function renderTrick() {
  // Nach der letzten Karte gehoert die Buehne der Abrechnung, nicht mehr dem
  // liegengebliebenen Stich.
  const roundFinished = game.phase === 'roundEnd' || game.phase === 'gameOver';
  const capturedPile = game.phase === 'trickEnd'
    ? pileIdForWinner(game, game.trickLeader)
    : null;
  const flyTargetClass = pileFlyTargetClass(capturedPile);

  ZONE_POSITIONS.forEach((position) => {
    const slot = trickSlots[position];
    const playerIndexString = playerIndexForPosition(position);
    slot.innerHTML = '';
    slot.classList.remove('has-card');
    slot.style.removeProperty('--stack-x');
    slot.style.removeProperty('--stack-y');
    slot.style.removeProperty('--stack-angle');
    slot.style.removeProperty('--stack-z');

    if (playerIndexString === undefined) {
      slot.classList.add('hidden-slot');
      return;
    }

    const playerIndex = Number(playerIndexString);
    const entry = roundFinished
      ? undefined
      : game.trick.find((current) => current.playerIndex === playerIndex);
    const trickIndex = game.trick.findIndex((current) => current.playerIndex === playerIndex);
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
      const offsets = [
        { x: -12, y: 4, angle: -8 },
        { x: 8, y: -5, angle: 6 },
        { x: -2, y: 12, angle: -2 },
        { x: 15, y: 8, angle: 10 },
      ];
      const offset = offsets[trickIndex] || offsets[0];
      slot.classList.add('has-card');
      slot.style.setProperty('--stack-x', `${offset.x}px`);
      slot.style.setProperty('--stack-y', `${offset.y}px`);
      slot.style.setProperty('--stack-angle', `${offset.angle}deg`);
      slot.style.setProperty('--stack-z', String(10 + trickIndex));
      slot.appendChild(trickCardEl(
        entry.card,
        game.phase === 'trickEnd' && game.trickLeader === playerIndex,
        flyTargetClass,
        shouldFlyIn
      ));
      return;
    }

    slot.classList.add('hidden-slot');
  });
}

function renderCapturedPiles() {
  pileEls.forEach((pile, pileId) => {
    const cards = game.capturedCards?.[pileId] || [];
    const tricks = game.capturedTricks?.[pileId] || 0;
    const stackSize = Math.min(5, cards.length);
    const reviewable = game.firstCapturedTrick?.pileId === pileId;
    const label = pileLabel(pileId);

    pile.root.classList.toggle('pile-highlight', game.phase === 'trickEnd' && game.lastCapturedPile === pileId);
    pile.root.classList.toggle('pile-reviewable', reviewable);
    pile.root.tabIndex = reviewable ? 0 : -1;
    pile.root.title = reviewable ? 'Ersten Stich nochmals ansehen' : '';
    pile.root.setAttribute('aria-label', reviewable ? `${label}: ersten Stich nochmals ansehen` : label);
    pile.label.textContent = label;
    pile.count.textContent = `${tricks} ${tricks === 1 ? 'Stich' : 'Stiche'}`;
    pile.deck.innerHTML = '';

    if (stackSize === 0) {
      const empty = document.createElement('div');
      empty.className = 'pile-empty-card';
      pile.deck.appendChild(empty);
      return;
    }

    Array.from({ length: stackSize }).forEach((_, index) => {
      const element = document.createElement('div');
      element.className = 'pile-card pile-card-back';
      element.style.setProperty('--pile-card-index', String(index));
      element.style.setProperty('--pile-card-turn', `${(index - 2) * 4}deg`);
      pile.deck.appendChild(element);
    });
  });
}

function renderWeisPanel() {
  if (game.phase !== 'announceWeis' || !game.players[game.currentPlayer]?.isHuman) {
    weisPrompt.textContent = '';
    weisList.innerHTML = '';
    return;
  }

  const options = getPossibleWeisForPlayer(game, game.currentPlayer);
  const ownStoeck = game.stoeckPlayer === game.currentPlayer
    ? '<div class="weis-item is-stoeck"><div class="weis-value">20</div><div class="weis-copy"><div class="weis-name">Stöck</div><div class="weis-meta">König + Ober im Trumpf | zählt automatisch</div></div></div>'
    : '';

  if (options.length === 0) {
    weisPrompt.textContent = ownStoeck
      ? 'Du hast keinen Weis, aber Stöck.'
      : 'Du hast keinen gültigen Weis in dieser Runde.';
    weisList.innerHTML = ownStoeck || '<div class="weis-item is-empty">Kein Weis</div>';
    btnWeis.textContent = 'Weiter';
    btnWeisSkip.classList.add('hidden');
    return;
  }

  btnWeisSkip.classList.remove('hidden');
  weisPrompt.textContent = options.length === 1
    ? 'Dein höchster Weis wird jetzt gemeldet:'
    : 'Deine möglichen Weise. Gemeldet wird zuerst dein höchster Weis:';
  weisList.innerHTML = options.map((weis, index) => `
    <div class="weis-item${index === 0 ? ' is-primary' : ''}">
      <div class="weis-value">${weis.points}</div>
      <div class="weis-copy">
        <div class="weis-name">${escapeHtml(describeWeis(weis))}</div>
        <div class="weis-meta">${weis.type === 'sequence' ? 'Folge' : 'Vier Gleiche'}${index === 0 ? ' | wird gemeldet' : ''}</div>
      </div>
    </div>
  `).join('') + ownStoeck;
  btnWeis.textContent = 'Weis bestätigen';
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
        ? 'Wähle Trumpf, Obe-Abe oder Une-Ufe oder schiebe an deinen Partner.'
        : 'Wähle die Spielart für diese Runde.';
      return;
    }

    msgEl.textContent = `${game.players[game.currentPlayer].name} wählt die Spielart...`;
    return;
  }

  if (game.phase === 'announceWeis') {
    if (game.players[game.currentPlayer].isHuman) {
      const options = getPossibleWeisForPlayer(game, game.currentPlayer);
      msgEl.textContent = options.length > 0
        ? 'Prüfe deine Weise und bestätige deinen höchsten Weis.'
        : 'Du hast keinen Weis. Bestätige die Runde, damit weitergemeldet wird.';
      return;
    }

    msgEl.textContent = `${game.players[game.currentPlayer].name} meldet Weis...`;
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
  const showWeis = game.phase === 'announceWeis' && humanTurn;

  bidControls.classList.toggle('hidden', !showBid);
  trumpControls.classList.toggle('hidden', !showTrump);
  weisControls.classList.toggle('hidden', !showWeis);
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
    trumpPrompt.textContent = canPushTrump(game)
      ? 'Spielart wählen oder schieben:'
      : 'Spielart wählen:';
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
  const weisWinner = game.roundSummary.weisWinnerTeamId === null
    ? null
    : game.teams.find((team) => team.id === game.roundSummary.weisWinnerTeamId);
  const pushLine = game.roundSummary.pushed
    ? `<br>Spielartwahl wurde an ${escapeHtml(game.players[game.roundSummary.trumpChooser].name)} geschoben.`
    : '';
  const multiplierLine = game.roundSummary.multiplier > 1
    ? ` x${game.roundSummary.multiplier}`
    : '';
  const weisLine = weisWinner
    ? `<br>Weis: <strong>${escapeHtml(weisWinner.name)}</strong> schreibt ${game.roundSummary.results.find((result) => result.teamId === weisWinner.id)?.weisPoints ?? 0} Punkte (${escapeHtml(describeWeis(game.roundSummary.highestWeis))}).`
    : '<br>Weis: Kein Team schreibt.';
  const stoeckLine = game.roundSummary.stoeckPlayer >= 0
    ? `<br>Stöck: <strong>${escapeHtml(game.players[game.roundSummary.stoeckPlayer].name)}</strong> schreibt 20 Punkte.`
    : '';
  const matchTeam = game.roundSummary.matchTeamId === null
    ? null
    : game.teams.find((team) => team.id === game.roundSummary.matchTeamId);
  const matchLine = matchTeam
    ? `<br>Match: <strong>${escapeHtml(matchTeam.name)}</strong> holt alle Stiche und schreibt 100 Zusatzpunkte.`
    : '';

  const teamLine = (result) => {
    const parts = [`${result.trickPoints} Stichpunkte`];
    if (result.weisPoints > 0) {
      parts.push(`${result.weisPoints} Weis`);
    }
    if (result.stoeckPoints > 0) {
      parts.push(`${result.stoeckPoints} Stöck`);
    }
    if (result.matchPoints > 0) {
      parts.push(`${result.matchPoints} Match`);
    }
    return `<strong>${escapeHtml(result.name)}</strong>: ${parts.join(' + ')} = ${result.basePoints}${multiplierLine} -> ${result.roundPoints}`;
  };

  roundEndMsg.innerHTML = `
    <strong>Spielart:</strong> ${escapeHtml(getRoundModeLabel(game.roundSummary.roundMode))}${multiplierLine}<br>
    ${teamLine(ownTeam)}<br>
    ${teamLine(enemyTeam)}<br>
    Rundensieger: <strong>${escapeHtml(winner.name)}</strong>${weisLine}${stoeckLine}${matchLine}${pushLine}
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
      .map((player, index) => `${index + 1}. ${escapeHtml(player.name)}: ${player.totalScore} Punkte`)
      .join('<br>');
    return;
  }

  const ranking = [...game.teams].sort((first, second) => second.totalScore - first.totalScore);
  gameOverMsg.innerHTML = `
    Ziel erreicht: ${getGameTargetScore(game)} Punkte<br><br>
    ${ranking
      .map((team, index) => `${index + 1}. ${escapeHtml(team.name)}: ${team.totalScore} Punkte`)
      .join('<br>')}
  `;
}

function scoreboardTags(entry) {
  const tags = [];
  if (entry.weisWinnerTeamId !== null && entry.weisWinnerTeamId !== undefined) {
    tags.push('Weis');
  }
  if (entry.stoeckPlayer >= 0) {
    tags.push('Stöck');
  }
  if (entry.matchTeamId !== null && entry.matchTeamId !== undefined) {
    tags.push('Match');
  }
  return tags.map((tag) => `<span class="scoreboard-tag">${tag}</span>`).join('');
}

function renderSchieberScoreboard(history) {
  const rows = history.map((entry) => {
    const own = entry.results.find((result) => result.teamId === 0);
    const enemy = entry.results.find((result) => result.teamId === 1);
    const multiplier = entry.multiplier > 1 ? ` x${entry.multiplier}` : '';

    return `
      <tr>
        <td>${entry.roundNumber}</td>
        <td>${escapeHtml(getRoundModeLabel(entry.roundMode))}${multiplier}${scoreboardTags(entry)}</td>
        <td>${own.roundPoints}</td>
        <td>${entry.totals[0]}</td>
        <td>${enemy.roundPoints}</td>
        <td>${entry.totals[1]}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="scoreboard-scroll">
      <table class="scoreboard-table">
        <thead>
          <tr class="scoreboard-group">
            <th colspan="2"></th>
            <th colspan="2">${escapeHtml(game.teams[0].name)}</th>
            <th colspan="2">${escapeHtml(game.teams[1].name)}</th>
          </tr>
          <tr>
            <th>Runde</th>
            <th>Spielart</th>
            <th>Runde</th>
            <th>Total</th>
            <th>Runde</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2">Ziel ${getGameTargetScore(game)}</td>
            <td></td>
            <td>${game.teams[0].totalScore}</td>
            <td></td>
            <td>${game.teams[1].totalScore}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function renderBieterScoreboard(history) {
  const rows = history.map((entry) => `
    <tr>
      <td>${entry.roundNumber}</td>
      <td>${escapeHtml(game.players[entry.soloPlayer].name)}</td>
      <td>${entry.bid}</td>
      <td>${entry.soloPoints}</td>
      <td>${entry.succeeded ? 'erfüllt' : 'verpasst'}</td>
      <td>${entry.soloGain > 0 ? '+' : ''}${entry.soloGain}</td>
    </tr>
  `).join('');

  const totals = game.players
    .map((player) => `${escapeHtml(player.name)}: ${player.totalScore}`)
    .join(' | ');

  return `
    <div class="scoreboard-scroll">
      <table class="scoreboard-table">
        <thead>
          <tr>
            <th>Runde</th>
            <th>Bieter</th>
            <th>Gebot</th>
            <th>Erreicht</th>
            <th>Ergebnis</th>
            <th>Punkte</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="6">${totals}</td></tr>
        </tfoot>
      </table>
    </div>
  `;
}

function openScoreboard() {
  const history = game?.roundHistory ?? [];
  scoreboardBody.innerHTML = history.length === 0
    ? '<div class="scoreboard-empty">Noch keine Runde abgeschlossen.</div>'
    : (isSchieber(game) ? renderSchieberScoreboard(history) : renderBieterScoreboard(history));
  scoreboard.classList.remove('hidden');
}

function closeScoreboard() {
  scoreboard.classList.add('hidden');
}

function cardValueTable() {
  const header = RANKS.map((rank) => `<th>${escapeHtml(RANK_LABELS[rank])}</th>`).join('');
  const rows = [
    { label: 'Nebenfarbe', cells: RANKS.map((rank) => cardPoints({ suit: 'eicheln', rank }, 'rosen')) },
    { label: 'Trumpf', cells: RANKS.map((rank) => cardPoints({ suit: 'rosen', rank }, 'rosen')) },
    { label: 'Obe-Abe', cells: RANKS.map((rank) => cardPoints({ suit: 'eicheln', rank }, 'obeAbe')) },
    { label: 'Une-Ufe', cells: RANKS.map((rank) => cardPoints({ suit: 'eicheln', rank }, 'uneUfe')) },
  ];

  const body = rows
    .map((row) => `<tr><td>${row.label}</td>${row.cells.map((value) => `<td>${value}</td>`).join('')}</tr>`)
    .join('');

  return `
    <table>
      <thead><tr><th>Spielart</th>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function openRulesSheet() {
  const sequences = Object.entries(SEQUENCE_POINTS)
    .map(([length, points]) => `<tr><td>${length} Karten in Folge</td><td>${points}</td></tr>`)
    .join('');
  const fourOfKinds = ['under', '9', 'ass', '6']
    .map((rank) => {
      const points = fourOfAKindPoints(rank);
      const label = rank === '6' ? 'Vier Sechser' : `Vier ${RANK_LABELS[rank]}`;
      return `<tr><td>${escapeHtml(label)}</td><td>${points === 0 ? 'zählen nicht' : points}</td></tr>`;
    })
    .join('');
  const multipliers = Object.entries(RULE_SET.roundMultipliers)
    .map(([mode, factor]) => `<tr><td>${escapeHtml(getRoundModeLabel(mode))}</td><td>x${factor}</td></tr>`)
    .join('');
  const tieBreak = RULE_SET.fourOfAKindBeatsSequence
    ? 'vier Gleiche gegen eine Folge'
    : 'die Folge gegen vier Gleiche';

  rulesSheetBody.innerHTML = `
    <h3>Bedienpflicht</h3>
    <ul>
      <li>Die angespielte Farbe muss bedient werden.</li>
      <li>Trumpf darf jederzeit gespielt werden, auch wenn du bedienen könntest.</li>
      <li>Untertrumpfen ist verboten, ausser du hast nur noch Trumpf.</li>
      <li>Wird Trumpf angespielt, musst du Trumpf bedienen. Ausnahme: der Puur als einziger Trumpf.</li>
      <li>Wer nicht bedienen kann, darf abwerfen. Einen Trumpfzwang gibt es nicht.</li>
    </ul>

    <h3>Kartenwerte</h3>
    ${cardValueTable()}

    <h3>Weis</h3>
    <table>
      <thead><tr><th>Weis</th><th>Punkte</th></tr></thead>
      <tbody>${sequences}${fourOfKinds}</tbody>
    </table>
    <ul>
      <li>Nur das Team mit dem höchsten Weis schreibt, dafür alle seine gemeldeten Weise.</li>
      <li>Bei gleicher Punktzahl gewinnen ${tieBreak}, danach die höhere Karte, dann Trumpf, dann Vorhand.</li>
    </ul>

    <h3>Zusatzpunkte</h3>
    <ul>
      <li>Stöck (König und Ober der Trumpffarbe): ${RULE_SET.stoeckPoints} Punkte, unabhängig vom Weis-Vergleich.</li>
      <li>Letzter Stich: ${RULE_SET.lastTrickBonus} Punkte.</li>
      <li>Match (alle Stiche einer Runde): ${RULE_SET.matchBonus} Punkte.</li>
      <li>Eine Runde ergibt damit ${152 + RULE_SET.lastTrickBonus} Stichpunkte.</li>
    </ul>

    <h3>Multiplikatoren im 2500er-Schieber</h3>
    <table>
      <thead><tr><th>Spielart</th><th>Faktor</th></tr></thead>
      <tbody>${multipliers}</tbody>
    </table>
  `;
  rulesSheet.classList.remove('hidden');
}

function closeRulesSheet() {
  rulesSheet.classList.add('hidden');
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
  renderSpeedButton();
  applyVariantClasses();
  placeCapturedPiles();
  renderScorePanel();
  renderTrumpDisplay();
  renderTargetDisplay();
  renderZones();
  renderTrick();
  renderCapturedPiles();
  renderWeisPanel();
  renderMessage();
  renderControls();
  renderRoundSummary();
  renderGameOver();
  renderLog();
}

function clearPendingAiAction() {
  if (pendingAiTimeout !== null) {
    window.clearTimeout(pendingAiTimeout);
    pendingAiTimeout = null;
  }
  pendingAiAction = null;
  aiLocked = false;
}

function runPendingAiAction() {
  const action = pendingAiAction;
  clearPendingAiAction();

  if (!game || !action) {
    return;
  }
  try {
    action();
  } catch (error) {
    msgEl.textContent = error.message;
    return;
  }
  gameLoop();
}

/** Ein Tipp auf den Tisch ueberspringt die laufende Wartezeit. */
function skipPendingDelay() {
  if (pendingAiAction) {
    runPendingAiAction();
  }
}

function queueAiAction(delayMs, action) {
  aiLocked = true;
  pendingAiAction = action;
  pendingAiTimeout = window.setTimeout(runPendingAiAction, delayMs);
}

function randomDelay([min, max]) {
  const base = min + Math.floor(Math.random() * (max - min + 1));
  return Math.round(base * (SPEED_FACTORS[selectedSpeed] ?? 1));
}

function renderSpeedButton() {
  btnSpeed.textContent = `Tempo: ${SPEED_LABELS[selectedSpeed]}`;
  btnSpeed.setAttribute('aria-label', `Tempo umschalten, aktuell ${SPEED_LABELS[selectedSpeed]}`);
}

function renderSetupSpeedOptions() {
  setupSpeedOptions.innerHTML = SPEED_ORDER.map((speed) => {
    const active = selectedSpeed === speed;
    return `
      <button
        type="button"
        class="target-card${active ? ' active' : ''}"
        data-speed="${speed}"
        aria-pressed="${active ? 'true' : 'false'}"
      >
        <span class="target-title">${escapeHtml(SPEED_LABELS[speed])}</span>
      </button>
    `;
  }).join('');

  setupSpeedHint.textContent = SPEED_COPY[selectedSpeed];
}

function gameLoop() {
  render();
  saveGame();

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
      if (canPushTrump(game) && shouldPushTrump(currentPlayer.hand, getGameTargetScore(game))) {
        pushTrumpChoice(game);
        return;
      }

      if (isSchieber(game)) {
        chooseTrump(game, bestSchieberMode(currentPlayer.hand, getGameTargetScore(game)));
        return;
      }

      chooseTrump(game, bestTrumpSuit(currentPlayer.hand));
    });
    return;
  }

  if (game.phase === 'announceWeis' && !currentPlayer.isHuman) {
    queueAiAction(randomDelay(AI_DELAYS.weis), () => {
      submitWeisDeclaration(game, game.currentPlayer);
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

function resumeSavedGame() {
  const saved = loadSavedGame();
  if (!saved) {
    renderResumeOption();
    return;
  }

  game = saved.game;
  clearPendingAiAction();
  animatedTrickCards = new Set();
  closeAllDialogs();

  screenSetup.classList.add('hidden');
  screenGame.classList.remove('hidden');
  gameLoop();
}

function startSelectedGame() {
  const playerName = playerNameInput.value.trim() || 'Du';
  const matchConfig = selectedVariantId === 'schieber'
    ? { targetScore: selectedSchieberTargetScore, difficulty: selectedDifficulty }
    : { difficulty: selectedDifficulty };

  saveSettings();
  clearSavedGame();

  game = createGame({ variantId: selectedVariantId, playerName, matchConfig });
  clearPendingAiAction();
  animatedTrickCards = new Set();
  closeAllDialogs();

  screenSetup.classList.add('hidden');
  screenGame.classList.remove('hidden');

  startRound(game);
  gameLoop();
}

function returnHome() {
  game = null;
  clearPendingAiAction();
  animatedTrickCards = new Set();
  closeAllDialogs();
  clearSavedGame();
  screenGame.classList.add('hidden');
  screenSetup.classList.remove('hidden');
  renderResumeOption();
}

variantCards.forEach((card) => {
  card.addEventListener('click', () => {
    setSetupVariant(card.dataset.variant);
  });
});

setupSpeedOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-speed]');
  if (!button) {
    return;
  }

  selectedSpeed = button.dataset.speed;
  renderSetupSpeedOptions();
});

btnSpeed.addEventListener('click', () => {
  const next = (SPEED_ORDER.indexOf(selectedSpeed) + 1) % SPEED_ORDER.length;
  selectedSpeed = SPEED_ORDER[next];
  renderSpeedButton();
  renderSetupSpeedOptions();
  saveSettings();
});

btnScoreboard.addEventListener('click', openScoreboard);
btnCloseScoreboard.addEventListener('click', closeScoreboard);
scoreboard.addEventListener('click', (event) => {
  if (event.target === scoreboard) {
    closeScoreboard();
  }
});

btnRules.addEventListener('click', openRulesSheet);
btnRulesSetup.addEventListener('click', openRulesSheet);
btnCloseRules.addEventListener('click', closeRulesSheet);
rulesSheet.addEventListener('click', (event) => {
  if (event.target === rulesSheet) {
    closeRulesSheet();
  }
});

// Tipp auf den Tisch ueberspringt die Wartezeit des Computers.
tableArea.addEventListener('click', (event) => {
  if (event.target.closest('.card-face, button, .control-box, .stich-pile')) {
    return;
  }
  skipPendingDelay();
});

setupDifficultyOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-difficulty]');
  if (!button) {
    return;
  }

  selectedDifficulty = button.dataset.difficulty;
  renderSetupDifficultyOptions();
});

setupTargetOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-target-score]');
  if (!button) {
    return;
  }

  selectedSchieberTargetScore = Number.parseInt(button.dataset.targetScore, 10);
  setSetupVariant(selectedVariantId);
});

btnStart.addEventListener('click', startSelectedGame);
btnResume.addEventListener('click', resumeSavedGame);

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
      chooseTrump(game, button.dataset.mode);
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

btnWeis.addEventListener('click', () => {
  try {
    submitWeisDeclaration(game, game.currentPlayer);
    gameLoop();
  } catch (error) {
    msgEl.textContent = error.message;
  }
});

btnWeisSkip.addEventListener('click', () => {
  try {
    declineWeis(game, game.currentPlayer);
    gameLoop();
  } catch (error) {
    msgEl.textContent = error.message;
  }
});

btnNextRound.addEventListener('click', () => {
  animatedTrickCards = new Set();
  closeAllDialogs();
  startRound(game);
  gameLoop();
});

btnHome.addEventListener('click', () => {
  if (window.confirm('Willst du diese Partie wirklich abbrechen und zum Homescreen zurückkehren?')) {
    returnHome();
  }
});
btnNewGame.addEventListener('click', returnHome);
btnCloseReview.addEventListener('click', closeTrickReview);

trickReview.addEventListener('click', (event) => {
  if (event.target === trickReview) {
    closeTrickReview();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  if (!trickReview.classList.contains('hidden')) {
    closeTrickReview();
  }
  if (!scoreboard.classList.contains('hidden')) {
    closeScoreboard();
  }
  if (!rulesSheet.classList.contains('hidden')) {
    closeRulesSheet();
  }
});

pileEls.forEach((pile, pileId) => {
  pile.root.addEventListener('click', () => openFirstTrickReview(pileId));
  pile.root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFirstTrickReview(pileId);
    }
  });
});

restoreSettings();
setSetupVariant(selectedVariantId);
renderResumeOption();

// Beim Wegschalten der App (iOS beendet PWAs im Hintergrund) sofort sichern.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveGame();
  }
});
window.addEventListener('pagehide', saveGame);

let resizeTimer = null;
window.addEventListener('resize', () => {
  if (resizeTimer !== null) {
    window.clearTimeout(resizeTimer);
  }
  resizeTimer = window.setTimeout(() => {
    resizeTimer = null;
    if (game) {
      render();
    }
    renderSetupSpeedOptions();
  }, 150);
});

ROUND_MODE_OPTIONS.forEach((mode) => {
  const button = document.querySelector(`.trump-btn[data-mode="${mode}"]`);
  if (button) {
    button.textContent = isTrumpMode(mode) ? `${ROUND_MODE_LABELS[mode]} Trumpf` : ROUND_MODE_LABELS[mode];
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Local non-HTTPS testing can block service workers; the game still runs.
    });
  });
}
