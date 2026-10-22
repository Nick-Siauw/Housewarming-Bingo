const STORAGE_KEY = 'housewarming-bingo-state-v1';
const PLAYER_PROFILE_KEY = 'housewarming-bingo-player-profile-v1';
const PARTY_PLAYERS_KEY = 'housewarming-bingo-party-players-v1';
const EMOJI_OPTIONS = ['🐸','🐱','🐙','🦋','🦈','🍒','🍓','🥑','🍸','🪩','👽','🤠','🤡','🐧','🦖','🌷','🐝','🧃','🦀','🎀','🐶','🦄','🌈','🍉','🪐','🌙','🎉','🍔','🧁','🔥'];
const FREE_INDEX = 12;
const WINNING_LINES = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20]
];

const BINGO_PROMPTS = [
  { id: 'prompt-01', text: 'Has been friends with a host for 10+ years' },
  { id: 'prompt-02', text: 'Has been to both Hong Kong and Shanghai' },
  { id: 'prompt-03', text: 'Is currently unemployed' },
  { id: 'prompt-04', text: 'Has a really niche hobby' },
  { id: 'prompt-05', text: 'Knows what SMIC stands for' },
  { id: 'prompt-06', text: 'Has attended boarding school' },
  { id: 'prompt-07', text: 'Has kissed someone at this party' },
  { id: 'prompt-08', text: 'Can do the worm' },
  { id: 'prompt-09', text: 'Has been to Geronimo’s' },
  { id: 'prompt-10', text: 'Has partied on a bouncy club dance floor' },
  { id: 'prompt-11', text: 'Has seen a host black out drunk' },
  { id: 'prompt-12', text: 'Has slept in the same bed as a host' },
  { id: 'prompt-13', text: 'Knows a host\'s full passport name' },
  { id: 'prompt-14', text: 'Has seen a host throw up' },
  { id: 'prompt-15', text: 'Is the reason two people at this party know each other' },
  { id: 'prompt-16', text: 'Plays pickleball regularly' },
  { id: 'prompt-17', text: 'Goes bouldering regularly' },
  { id: 'prompt-18', text: 'Plays soccer regularly' },
  { id: 'prompt-19', text: 'Plays basketball regularly' },
  { id: 'prompt-20', text: 'Is currently a student' },
  { id: 'prompt-21', text: 'Has tequila as their favorite alcohol' },
  { id: 'prompt-22', text: 'Is allergic to cats' },
  { id: 'prompt-23', text: 'Is over 6\'1" tall' },
  { id: 'prompt-24', text: 'Is under 5\'4" tall' },
  { id: 'prompt-25', text: 'Is staying completely sober tonight' },
  { id: 'prompt-26', text: 'Collects Pokémon cards' },
  { id: 'prompt-27', text: 'Does not work a corporate or white-collar job' },
  { id: 'prompt-28', text: 'Has skipped both breakfast and lunch today' },
  { id: 'prompt-29', text: 'Has a birthday in October' },
  { id: 'prompt-30', text: 'Has lychee as their favorite soju flavor' },
  { id: 'prompt-31', text: 'Does not have a driver\'s license' },
  { id: 'prompt-32', text: 'Has taken more than 10 AP classes in high school' },
  { id: 'prompt-33', text: 'Spreads a crazy rumor about Cynthia' },
  { id: 'prompt-34', text: 'Has never had a cavity' },
  { id: 'prompt-35', text: 'Has a twin' },
  { id: 'prompt-36', text: 'Has a tattoo they regret' },
  { id: 'prompt-37', text: 'Has been arrested' },
  { id: 'prompt-38', text: 'Has lost their phone on a night out' },
  { id: 'prompt-39', text: 'Can name all three hosts\' birthdays' },
  { id: 'prompt-40', text: 'Can touch their tongue to their nose' }
];

const QUESTION_BANK = BINGO_PROMPTS.map((prompt) => prompt.text);

const state = {
  playerId: '',
  playerName: '',
  selectedEmoji: '🐸',
  card: Array(25).fill(''),
  completed: Array(25).fill(false),
  squareNames: Array(25).fill(''),
  promptIds: Array(25).fill(''),
  lastCelebratedKey: '',
  isJoined: false
};

const boardElement = document.getElementById('board');
const progressLabel = document.getElementById('progressLabel');
const newCardButton = document.getElementById('newCardButton');
const clearProgressButton = document.getElementById('clearProgressButton');
const bingoToast = document.getElementById('bingoToast');
const dismissBingoButton = document.getElementById('dismissBingoButton');
const rulesButton = document.getElementById('rulesButton');
const rulesModal = document.getElementById('rulesModal');
const closeRulesButton = document.getElementById('closeRulesButton');
const confettiLayer = document.getElementById('confettiLayer');
const joinScreen = document.getElementById('joinScreen');
const gameScreen = document.getElementById('gameScreen');
const guestNameInput = document.getElementById('guestNameInput');
const joinButton = document.getElementById('joinButton');
const emojiGrid = document.getElementById('emojiGrid');
const selectedEmojiPreview = document.getElementById('selectedEmojiPreview');
const livePlayerCount = document.getElementById('livePlayerCount');
const currentPlayerChip = document.getElementById('currentPlayerChip');
const currentPlayerAvatar = document.getElementById('currentPlayerAvatar');
const currentPlayerName = document.getElementById('currentPlayerName');
const playerNameText = document.getElementById('playerNameText');
const playerNameBadge = document.getElementById('playerNameBadge');
const leaderboardList = document.getElementById('leaderboardList');
const activityFeed = document.getElementById('activityFeed');

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function getPromptPool() {
  return shuffle(BINGO_PROMPTS.map((prompt) => ({ ...prompt })));
}

function createFreshCard() {
  const promptTiles = getPromptPool().slice(0, 24);
  const positions = shuffle(Array.from({ length: 25 }, (_, index) => index).filter((index) => index !== FREE_INDEX));

  const card = Array(25).fill('');
  const promptIds = Array(25).fill('');
  card[FREE_INDEX] = 'FREE';

  promptTiles.forEach((prompt, index) => {
    const slot = positions[index];
    card[slot] = prompt.text;
    promptIds[slot] = prompt.id;
  });

  state.card = card;
  state.promptIds = promptIds;
  state.completed = Array(25).fill(false);
  state.squareNames = Array(25).fill('');
  state.completed[FREE_INDEX] = true;
  state.lastCelebratedKey = '';
  hideBingoToast();
  saveState();
}

function buildPlayerId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPartyPlayers() {
  try {
    const raw = localStorage.getItem(PARTY_PLAYERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Could not read party players:', error);
    return [];
  }
}

function savePartyPlayers(players) {
  localStorage.setItem(PARTY_PLAYERS_KEY, JSON.stringify(players));
}

function updatePlayerBadge() {
  const trimmedName = state.playerName.trim();
  const displayName = trimmedName || 'Guest';

  if (!trimmedName) {
    playerNameBadge.hidden = true;
  } else {
    playerNameText.textContent = trimmedName;
    playerNameBadge.hidden = false;
  }

  currentPlayerAvatar.textContent = state.selectedEmoji;
  currentPlayerName.textContent = displayName;
}

function updateLivePlayerCount() {
  const players = getPartyPlayers();
  livePlayerCount.textContent = String(Math.max(players.length, 1));
}

function renderEmojiPicker() {
  emojiGrid.innerHTML = '';

  EMOJI_OPTIONS.forEach((emoji) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-option';
    button.textContent = emoji;
    button.setAttribute('aria-label', `Select emoji ${emoji}`);
    if (emoji === state.selectedEmoji) {
      button.classList.add('is-selected');
    }
    button.addEventListener('click', () => {
      state.selectedEmoji = emoji;
      selectedEmojiPreview.textContent = emoji;
      renderEmojiPicker();
      updatePlayerBadge();
    });
    emojiGrid.appendChild(button);
  });

  selectedEmojiPreview.textContent = state.selectedEmoji;
}

function showJoinScreen() {
  joinScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  updateLivePlayerCount();
  guestNameInput.focus();
}

function showGameScreen() {
  joinScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  updatePlayerBadge();
}

function savePlayerProfile() {
  const profile = {
    id: state.playerId,
    name: state.playerName,
    emoji: state.selectedEmoji
  };
  localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));

  const players = getPartyPlayers();
  const existingIndex = players.findIndex((player) => player.id === state.playerId);
  const playerRecord = { id: state.playerId, name: state.playerName, emoji: state.selectedEmoji };

  if (existingIndex >= 0) {
    players[existingIndex] = playerRecord;
  } else {
    players.push(playerRecord);
  }

  savePartyPlayers(players);
  updateLivePlayerCount();
}

function loadPlayerProfile() {
  try {
    const raw = localStorage.getItem(PLAYER_PROFILE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.name !== 'string' || typeof parsed.emoji !== 'string') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Could not load saved player profile:', error);
    return null;
  }
}

function joinGame() {
  const trimmedName = guestNameInput.value.trim();

  if (!trimmedName) {
    window.alert('Please add your name before joining the party.');
    guestNameInput.focus();
    return;
  }

  state.playerName = trimmedName;
  state.selectedEmoji = state.selectedEmoji || '🐸';
  state.playerId = state.playerId || buildPlayerId();
  savePlayerProfile();
  createFreshCard();
  saveState();
  showGameScreen();
  renderBoard();
}

function loadSavedState() {
  const savedProfile = loadPlayerProfile();
  if (savedProfile) {
    state.playerId = savedProfile.id || buildPlayerId();
    state.playerName = savedProfile.name || '';
    state.selectedEmoji = savedProfile.emoji || '🐸';
  } else {
    state.playerId = buildPlayerId();
    state.selectedEmoji = '🐸';
  }

  const savedState = localStorage.getItem(STORAGE_KEY);
  if (!savedState) {
    createFreshCard();
    showJoinScreen();
    return;
  }

  try {
    const parsed = JSON.parse(savedState);
    const safeCard = Array.isArray(parsed.card) && parsed.card.length === 25 ? parsed.card : null;
    const safeCompleted = Array.isArray(parsed.completed) && parsed.completed.length === 25 ? parsed.completed : null;
    const safeSquareNames = Array.isArray(parsed.squareNames) && parsed.squareNames.length === 25 ? parsed.squareNames : Array(25).fill('');
    const safePromptIds = Array.isArray(parsed.promptIds) && parsed.promptIds.length === 25 ? parsed.promptIds : Array(25).fill('');

    if (!safeCard || !safeCompleted) {
      createFreshCard();
      if (savedProfile) {
        showGameScreen();
      } else {
        showJoinScreen();
      }
      return;
    }

    state.card = safeCard;
    state.promptIds = safePromptIds.map((value) => typeof value === 'string' ? value : '');
    state.completed = safeCompleted.map((value) => Boolean(value));
    state.squareNames = safeSquareNames.map((value) => typeof value === 'string' ? value : '');
    state.completed[FREE_INDEX] = true;
    state.lastCelebratedKey = '';
    hideBingoToast();

    if (savedProfile) {
      state.playerName = savedProfile.name || '';
      state.selectedEmoji = savedProfile.emoji || '🐸';
      showGameScreen();
    } else {
      showJoinScreen();
    }
  } catch (error) {
    console.warn('Failed to restore saved bingo state:', error);
    createFreshCard();
    showJoinScreen();
  }
}

function saveState() {
  const payload = {
    playerName: state.playerName,
    card: state.card,
    promptIds: state.promptIds,
    completed: state.completed,
    squareNames: state.squareNames
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function getCompletedCount() {
  return state.completed.filter((value, index) => value && index !== FREE_INDEX).length;
}

function getWinningLines() {
  return WINNING_LINES.filter((line) => line.every((index) => state.completed[index]));
}

function serializeLines(lines) {
  return lines.map((line) => line.join('-')).join('|');
}

function triggerConfetti() {
  confettiLayer.innerHTML = '';

  const colors = ['#ff4fa0', '#d9352b', '#1f6bff', '#ffd863', '#4bb77d'];

  for (let index = 0; index < 60; index += 1) {
    const piece = document.createElement('span');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 220}px`);
    piece.style.setProperty('--r', `${(Math.random() - 0.5) * 720}deg`);
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    confettiLayer.appendChild(piece);
  }
}

function showBingoToast() {
  const winningLines = getWinningLines();
  if (!winningLines.length) {
    hideBingoToast();
    return;
  }

  const toastKey = serializeLines(winningLines);
  if (toastKey === state.lastCelebratedKey) {
    return;
  }

  state.lastCelebratedKey = toastKey;
  bingoToast.hidden = false;
  bingoToast.setAttribute('aria-hidden', 'false');
  triggerConfetti();
}

function hideBingoToast() {
  bingoToast.hidden = true;
  bingoToast.setAttribute('aria-hidden', 'true');
}

function updateWinningHighlights() {
  const winningLines = getWinningLines();
  const winnerSet = new Set();

  winningLines.forEach((line) => {
    line.forEach((index) => winnerSet.add(index));
  });

  const cells = boardElement.querySelectorAll('.board-cell');
  cells.forEach((cell) => {
    const index = Number(cell.dataset.index);
    cell.classList.toggle('is-winning', winnerSet.has(index));
  });
}

function updateProgress() {
  const completeCount = getCompletedCount();
  progressLabel.textContent = `${completeCount} / 24 completed`;
}

function renderLeaderboard() {
  const players = getPartyPlayers();

  const mergedPlayers = players.length
    ? players.map((player) => ({
        id: player.id,
        name: player.name || 'Guest',
        emoji: player.emoji || '🐸',
        score: getCompletedCount()
      }))
    : [{
        id: state.playerId,
        name: state.playerName || 'Guest',
        emoji: state.selectedEmoji || '🐸',
        score: getCompletedCount()
      }];

  const leaderboard = mergedPlayers.sort((a, b) => b.score - a.score);

  leaderboardList.innerHTML = '';

  leaderboard.forEach((player, index) => {
    const item = document.createElement('li');
    item.className = 'leaderboard-item';
    item.innerHTML = `
      <span class="leaderboard-rank">${index + 1}</span>
      <span class="leaderboard-emoji">${player.emoji}</span>
      <span>${player.name}</span>
      <span class="leaderboard-score">${player.score}</span>
    `;
    leaderboardList.appendChild(item);
  });
}

function renderActivityFeed() {
  const entries = [
    `${state.selectedEmoji} ${state.playerName || 'Guest'} joined the party`,
    `${state.selectedEmoji} ${state.playerName || 'Guest'} completed ${getCompletedCount()} squares`,
    `${state.selectedEmoji} ${state.playerName || 'Guest'} is on the move`
  ];

  activityFeed.innerHTML = '';
  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'activity-item';
    item.textContent = entry;
    activityFeed.appendChild(item);
  });
}

function promptForSquareName(index, prompt) {
  const currentName = state.squareNames[index] || '';
  const answer = window.prompt(`Who fits this square?\n\n${prompt}\n\nType a name or leave blank to undo.`, currentName);

  if (answer === null) {
    return;
  }

  const trimmed = answer.trim();
  state.squareNames[index] = trimmed;

  if (!trimmed) {
    state.completed[index] = false;
  } else {
    state.completed[index] = true;
  }

  saveState();
  renderBoard();
}

function toggleCell(index) {
  if (index === FREE_INDEX) {
    return;
  }

  const promptText = state.card[index];
  const currentName = state.squareNames[index].trim();

  if (state.completed[index] && currentName) {
    const shouldEdit = window.confirm('Edit this square name or undo it?');
    if (shouldEdit) {
      promptForSquareName(index, promptText);
    } else {
      state.completed[index] = false;
      state.squareNames[index] = '';
      saveState();
      renderBoard();
    }
    return;
  }

  promptForSquareName(index, promptText);
}

function renderBoard() {
  boardElement.innerHTML = '';

  state.card.forEach((prompt, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'board-cell';
    cell.dataset.index = String(index);
    cell.setAttribute('role', 'gridcell');

    const isFree = index === FREE_INDEX;
    const isComplete = state.completed[index];

    if (isFree) {
      cell.classList.add('free');
      cell.setAttribute('aria-label', 'Free space');
    } else {
      cell.setAttribute('aria-label', `Square ${index + 1}: ${prompt}`);
    }

    if (isComplete) {
      cell.classList.add('is-complete');
    }

    const text = document.createElement('span');
    text.className = 'cell-text';
    text.textContent = isFree ? 'FREE' : prompt;
    cell.appendChild(text);

    const checkmark = document.createElement('span');
    checkmark.className = 'cell-check';
    checkmark.textContent = '✓';
    cell.appendChild(checkmark);

    cell.addEventListener('click', () => toggleCell(index));
    boardElement.appendChild(cell);
  });

  updateWinningHighlights();
  updateProgress();
  renderLeaderboard();
  renderActivityFeed();
  showBingoToast();
}

function resetCard() {
  const shouldReset = window.confirm('Start a fresh card? Your current progress and card will be lost.');
  if (!shouldReset) {
    return;
  }

  createFreshCard();
  renderBoard();
}

function clearProgress() {
  state.completed = Array(25).fill(false);
  state.squareNames = Array(25).fill('');
  state.completed[FREE_INDEX] = true;
  state.lastCelebratedKey = '';
  hideBingoToast();
  saveState();
  renderBoard();
}

newCardButton.addEventListener('click', resetCard);
clearProgressButton.addEventListener('click', clearProgress);
dismissBingoButton.addEventListener('click', hideBingoToast);
joinButton.addEventListener('click', joinGame);
guestNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    joinGame();
  }
});

rulesButton.addEventListener('click', () => {
  rulesModal.hidden = false;
  rulesModal.setAttribute('aria-hidden', 'false');
});

closeRulesButton.addEventListener('click', () => {
  rulesModal.hidden = true;
  rulesModal.setAttribute('aria-hidden', 'true');
});

rulesModal.addEventListener('click', (event) => {
  if (event.target === rulesModal) {
    rulesModal.hidden = true;
    rulesModal.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !rulesModal.hidden) {
    rulesModal.hidden = true;
    rulesModal.setAttribute('aria-hidden', 'true');
  }

  if (event.key === 'Escape' && !bingoToast.hidden) {
    hideBingoToast();
  }
});

renderEmojiPicker();
loadSavedState();
updateLivePlayerCount();

if (state.playerName.trim()) {
  guestNameInput.value = state.playerName;
  renderBoard();
} else {
  showJoinScreen();
}
