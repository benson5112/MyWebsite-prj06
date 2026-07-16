/*
  Resurrection W: Save the Plant
  Plain JavaScript game logic for difficulty, scoring, milestones, modal, and sounds.
*/
const difficultySettings = {
  easy: {
    label: "Easy",
    timeLimit: 40,
    targetScore: 8,
    spawnInterval: 1000,
    dirtyWaterChance: 0.15
  },
  normal: {
    label: "Normal",
    timeLimit: 30,
    targetScore: 10,
    spawnInterval: 750,
    dirtyWaterChance: 0.25
  },
  hard: {
    label: "Hard",
    timeLimit: 25,
    targetScore: 15,
    spawnInterval: 500,
    dirtyWaterChance: 0.35
  }
};

const milestones = [
  {
    percent: 0.25,
    message: "Great start! Clean water is on the way!"
  },
  {
    percent: 0.5,
    message: "Halfway there! Keep collecting clean water!"
  },
  {
    percent: 0.75,
    message: "Almost there! The plant is waiting!"
  }
];

const MESSAGES = {
  start: "Click clean water drops!",
  ready: "Choose a difficulty, then press Start to begin!",
  clean: "Great! Clean water helps the plant grow. +1",
  jerryCan: "Jerry Can bonus! +3",
  dirty: "Dirty water! -1",
  combo: "Combo! Keep the clean water coming!",
  win: "You saved the plant! Clean water helps communities grow, learn, and stay healthy.",
  lose: "Time is up! Try again to bring clean water. Every drop matters."
};

const soundFiles = {
  clean: "sounds/clean-water.wav",
  jerryCan: "sounds/jerry-can-bonus.wav",
  dirty: "sounds/dirty-water-warning.wav",
  win: "sounds/win.wav"
};

const scoreDisplay = document.getElementById("scoreDisplay");
const timerDisplay = document.getElementById("timerDisplay");
const targetDisplay = document.getElementById("targetDisplay");
const difficultyDisplay = document.getElementById("difficultyDisplay");
const feedbackText = document.getElementById("feedbackText");
const gameArea = document.getElementById("gameArea");
const plant = document.getElementById("plant");
const plantEmoji = plant.querySelector(".plant-emoji");
const plantLabel = document.getElementById("plantLabel");
const startButtonContainer = document.getElementById("startButtonContainer");
const startButton = document.getElementById("startButton");
const countdownOverlay = document.getElementById("countdownOverlay");
const warningText = document.getElementById("warningText");
const countdownNumber = document.getElementById("countdownNumber");
const resetButton = document.getElementById("resetButton");
const soundToggleButton = document.getElementById("soundToggleButton");
const difficultyButtons = document.querySelectorAll(".difficulty-button");
const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const starRating = document.getElementById("starRating");
const finalScore = document.getElementById("finalScore");
const resultMessage = document.getElementById("resultMessage");
const playAgainButton = document.getElementById("playAgainButton");
const closeModalButton = document.getElementById("closeModalButton");

let currentDifficulty = "normal";
let score = 0;
let timeLeft = difficultySettings[currentDifficulty].timeLimit;
let timerInterval = null;
let spawnInterval = null;
let activeTimeouts = [];
let countdownTimeouts = [];
let gameRunning = false;
let countdownRunning = false;
let comboCount = 0;
let reachedMilestones = new Set();
let soundEnabled = true;
let lastFocusedElement = null;
let feedbackTimeout = null;
let milestoneMessageActive = false;

const sounds = Object.fromEntries(
  Object.entries(soundFiles).map(([name, src]) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = 1;
    audio.addEventListener("error", () => {
      console.warn(`Sound file could not be loaded: ${src}`);
    });
    return [name, audio];
  })
);

resetGame();

startButton.addEventListener("click", handleStartButtonClick);
resetButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", resetGame);
closeModalButton.addEventListener("click", closeResultModal);
soundToggleButton.addEventListener("click", toggleSound);

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !resultOverlay.classList.contains("hidden")) {
    closeResultModal();
  }
});

function getCurrentSettings() {
  return difficultySettings[currentDifficulty];
}

function selectDifficulty(level) {
  if (!difficultySettings[level]) {
    return;
  }

  currentDifficulty = level;
  resetGame();
  showFeedback(`${getCurrentSettings().label} mode selected. Target: ${getCurrentSettings().targetScore} points.`, "info", 0);
}

function updateDifficultyDisplay() {
  const settings = getCurrentSettings();

  difficultyButtons.forEach((button) => {
    const isSelected = button.dataset.difficulty === currentDifficulty;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.disabled = gameRunning || countdownRunning;
  });

  difficultyDisplay.innerHTML = `Difficulty:<span class="difficulty-value">${settings.label}</span>`;
  targetDisplay.textContent = `Target: ${settings.targetScore}`;
}

function resetGame() {
  countdownRunning = false;
  gameRunning = false;
  clearCountdownTimers();
  clearGameTimers();
  clearGameObjects();
  hideCountdownOverlay();
  closeResultModal();

  score = 0;
  timeLeft = getCurrentSettings().timeLimit;
  comboCount = 0;
  reachedMilestones = new Set();
  milestoneMessageActive = false;

  updateStatsDisplay();
  updateDifficultyDisplay();
  showFeedback(MESSAGES.ready, "info", 0);
  resetPlant();

  startButtonContainer.classList.remove("hidden");
  startButton.disabled = false;
}

function handleStartButtonClick() {
  if (gameRunning || countdownRunning) {
    return;
  }

  prepareGameForStart();
  runPreGameCountdown();
}

function prepareGameForStart() {
  countdownRunning = true;
  gameRunning = false;
  clearGameTimers();
  clearCountdownTimers();
  clearGameObjects();
  closeResultModal();

  score = 0;
  timeLeft = getCurrentSettings().timeLimit;
  comboCount = 0;
  reachedMilestones = new Set();
  milestoneMessageActive = false;

  resetPlant();
  updateStatsDisplay();
  updateDifficultyDisplay();
  showFeedback("Get ready! Watch out for dirty water.", "warning", 0);

  startButtonContainer.classList.add("hidden");
  startButton.disabled = true;
}

function runPreGameCountdown() {
  showCountdownOverlay("Warning: Don’t touch dirty water!", "");

  setCountdownTimeout(() => showCountdownOverlay("Warning: Don’t touch dirty water!", "3"), 1500);
  setCountdownTimeout(() => showCountdownOverlay("Warning: Don’t touch dirty water!", "2"), 2500);
  setCountdownTimeout(() => showCountdownOverlay("Warning: Don’t touch dirty water!", "1"), 3500);
  setCountdownTimeout(() => showCountdownOverlay("", "Go!"), 4500);
  setCountdownTimeout(beginActiveGameplay, 5000);
}

function beginActiveGameplay() {
  if (!countdownRunning) {
    return;
  }

  countdownRunning = false;
  gameRunning = true;
  hideCountdownOverlay();
  updateDifficultyDisplay();
  showFeedback(MESSAGES.start, "info", 0);

  timerInterval = setInterval(updateTimer, 1000);
  scheduleSpawning();
  spawnGameObject();
}

function showCountdownOverlay(warningMessage, countdownMessage) {
  warningText.textContent = warningMessage;
  countdownNumber.textContent = countdownMessage;
  countdownOverlay.hidden = false;
}

function hideCountdownOverlay() {
  warningText.textContent = "Warning: Don’t touch dirty water!";
  countdownNumber.textContent = "";
  countdownOverlay.hidden = true;
}

function setCountdownTimeout(callback, delay) {
  const timeoutId = setTimeout(() => {
    countdownTimeouts = countdownTimeouts.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  countdownTimeouts.push(timeoutId);
  return timeoutId;
}

function updateTimer() {
  timeLeft = Math.max(0, timeLeft - 1);
  updateStatsDisplay();

  if (timeLeft <= 0) {
    endGame(false);
  }
}

function scheduleSpawning() {
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnGameObject, getAdjustedSpawnInterval());
}

function getAdjustedSpawnInterval() {
  const settings = getCurrentSettings();
  const progress = score / settings.targetScore;

  if (progress >= 0.75) {
    return Math.max(320, settings.spawnInterval - 220);
  }

  if (progress >= 0.45) {
    return Math.max(380, settings.spawnInterval - 120);
  }

  return settings.spawnInterval;
}

function spawnGameObject() {
  if (!gameRunning) {
    return;
  }

  const objectType = chooseObjectType();
  const objectButton = document.createElement("button");

  objectButton.classList.add("water-drop", objectType);
  objectButton.type = "button";
  objectButton.dataset.collected = "false";
  objectButton.setAttribute("aria-label", getObjectLabel(objectType));

  if (objectType === "jerry-can") {
    const jerryCanImage = document.createElement("img");
    jerryCanImage.src = "png/water-can-transparent.png";
    jerryCanImage.alt = "Jerry Can bonus worth 3 points";
    jerryCanImage.classList.add("jerry-can-image");
    objectButton.appendChild(jerryCanImage);
  }

  positionGameObject(objectButton, objectType);
  objectButton.addEventListener("click", () => handleGameObjectClick(objectButton, objectType));
  gameArea.appendChild(objectButton);

  const removeTimeout = setTrackedTimeout(() => removeElement(objectButton), 2300);
  objectButton.dataset.timeoutId = String(removeTimeout);
}

function chooseObjectType() {
  const chance = Math.random();
  const jerryCanChance = 0.15;

  if (chance < jerryCanChance) {
    return "jerry-can";
  }

  if (chance < jerryCanChance + getCurrentSettings().dirtyWaterChance) {
    return "dirty";
  }

  return "clean";
}

function getObjectLabel(objectType) {
  if (objectType === "jerry-can") {
    return "Jerry Can bonus, plus 3 points";
  }

  if (objectType === "dirty") {
    return "Dirty water drop, minus 1 point";
  }

  return "Clean water drop, plus 1 point";
}

function positionGameObject(objectButton, objectType) {
  const objectSize = objectType === "jerry-can" ? 60 : 52;
  const maxX = Math.max(8, gameArea.clientWidth - objectSize - 8);
  const maxY = Math.max(8, gameArea.clientHeight - 165);

  objectButton.style.left = `${randomNumber(8, maxX)}px`;
  objectButton.style.top = `${randomNumber(8, maxY)}px`;
}

function handleGameObjectClick(objectButton, objectType) {
  if (!gameRunning || objectButton.dataset.collected === "true") {
    return;
  }

  objectButton.dataset.collected = "true";
  objectButton.disabled = true;

  if (objectButton.dataset.timeoutId) {
    clearTimeout(Number(objectButton.dataset.timeoutId));
  }

  if (objectType === "clean") {
    handleCleanWaterClick(objectButton);
  } else if (objectType === "jerry-can") {
    handleJerryCanClick(objectButton);
  } else {
    handleDirtyWaterClick(objectButton);
  }
}

function handleCleanWaterClick(objectButton) {
  updateScore(1);
  comboCount++;
  objectButton.classList.add("collected");
  showFloatingScore(objectButton, "+1", "positive");
  playSound("clean");
  showCollectionFeedback(MESSAGES.clean);
  removeAfterAnimation(objectButton);
}

function handleJerryCanClick(objectButton) {
  updateScore(3);
  comboCount++;
  objectButton.classList.add("collected");
  showFloatingScore(objectButton, "+3", "positive");
  playSound("jerryCan");
  showCollectionFeedback(MESSAGES.jerryCan);
  removeAfterAnimation(objectButton);
}

function handleDirtyWaterClick(objectButton) {
  updateScore(-1);
  comboCount = 0;
  objectButton.classList.add("warning");
  showFloatingScore(objectButton, "-1", "negative");
  playSound("dirty");
  showFeedback(MESSAGES.dirty, "warning");
  removeAfterAnimation(objectButton);
}

function showCollectionFeedback(message) {
  if (milestoneMessageActive) {
    return;
  }

  const comboMessage = comboCount >= 3 ? ` ${MESSAGES.combo}` : "";
  showFeedback(`${message}${comboMessage}`, "positive");
}

function updateScore(amount) {
  score = Math.max(0, score + amount);
  updateStatsDisplay();
  checkMilestones();
  checkWinCondition();

  if (gameRunning) {
    scheduleSpawning();
  }
}

function updateStatsDisplay() {
  scoreDisplay.textContent = `Score: ${score}`;
  timerDisplay.textContent = `Time: ${timeLeft}`;
  targetDisplay.textContent = `Target: ${getCurrentSettings().targetScore}`;
}

function checkWinCondition() {
  if (score >= getCurrentSettings().targetScore) {
    endGame(true);
  }
}

function checkMilestones() {
  const targetScore = getCurrentSettings().targetScore;

  milestones.forEach((milestone) => {
    const milestoneScore = Math.ceil(targetScore * milestone.percent);

    if (score >= milestoneScore && !reachedMilestones.has(milestone.percent) && score < targetScore) {
      reachedMilestones.add(milestone.percent);
      showFeedback(milestone.message, "milestone", 1800);
    }
  });
}

function showFloatingScore(sourceElement, text, type) {
  const indicator = document.createElement("span");
  const sourceRect = sourceElement.getBoundingClientRect();
  const gameRect = gameArea.getBoundingClientRect();

  indicator.className = `floating-score ${type}`;
  indicator.textContent = text;
  indicator.setAttribute("aria-hidden", "true");
  indicator.style.left = `${Math.min(gameArea.clientWidth - 40, Math.max(8, sourceRect.left - gameRect.left + sourceRect.width / 2))}px`;
  indicator.style.top = `${Math.max(8, sourceRect.top - gameRect.top)}px`;

  gameArea.appendChild(indicator);
  setTrackedTimeout(() => removeElement(indicator), 850);
}

function showFeedback(message, type = "info", minimumDuration = 900) {
  clearTimeout(feedbackTimeout);
  feedbackText.textContent = message;
  feedbackText.className = `feedback-text ${type}`;
  milestoneMessageActive = type === "milestone";

  if (minimumDuration > 0) {
    feedbackTimeout = setTrackedTimeout(() => {
      if (gameRunning && feedbackText.textContent === message) {
        feedbackText.textContent = MESSAGES.start;
        feedbackText.className = "feedback-text";
      }

      if (type === "milestone") {
        milestoneMessageActive = false;
      }
    }, minimumDuration);
  }
}

function endGame(playerWon) {
  if (!gameRunning && resultOverlay.classList.contains("hidden") === false) {
    return;
  }

  gameRunning = false;
  clearGameTimers();
  clearGameObjects();
  startButton.disabled = true;
  updateDifficultyDisplay();

  if (playerWon) {
    showFeedback(MESSAGES.win, "positive", 0);
    setHealthyPlant();
    playSound("win");
  } else {
    showFeedback(MESSAGES.lose, "warning", 0);
  }

  openResultModal(playerWon);
}

function resetPlant() {
  plant.className = "plant dry";
  plant.setAttribute("aria-label", "Dry plant");
  plantEmoji.textContent = "🥀";
  plantLabel.textContent = "Dry plant";
}

function setHealthyPlant() {
  plant.className = "plant healthy";
  plant.setAttribute("aria-label", "Healthy saved plant");
  plantEmoji.textContent = "🌱";
  plantLabel.textContent = "Plant saved!";
}

function openResultModal(playerWon) {
  const stars = getStarCount();

  lastFocusedElement = document.activeElement;
  resultTitle.textContent = playerWon ? "You Saved the Plant!" : "Round Complete";
  starRating.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  starRating.setAttribute("aria-label", `${stars} out of 3 stars`);
  finalScore.textContent = `Final Score: ${score} / ${getCurrentSettings().targetScore}`;
  resultMessage.textContent = getRatingMessage(stars, playerWon);

  resultOverlay.classList.remove("hidden");
  resultOverlay.setAttribute("aria-hidden", "false");
  playAgainButton.focus();

  if (stars === 3) {
    celebrate();
  }
}

function closeResultModal() {
  const wasOpen = !resultOverlay.classList.contains("hidden");
  resultOverlay.classList.add("hidden");
  resultOverlay.setAttribute("aria-hidden", "true");

  if (wasOpen && lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function getStarCount() {
  const targetScore = getCurrentSettings().targetScore;
  const percentOfTarget = score / targetScore;

  if (score >= targetScore) {
    return 3;
  }

  if (percentOfTarget >= 0.8) {
    return 2;
  }

  if (percentOfTarget >= 0.3) {
    return 1;
  }

  return 0;
}

function getRatingMessage(stars, playerWon) {
  if (playerWon || stars === 3) {
    return "Plant saved! Clean water helps communities grow, learn, and stay healthy.";
  }

  if (stars === 2) {
    return "Almost there! Every drop matters.";
  }

  if (stars === 1) {
    return "Keep trying and help bring clean water to the plant.";
  }

  return "Please try again! Every drop matters.";
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundToggleButton.textContent = soundEnabled ? "Sound: On" : "Sound: Off";
  soundToggleButton.setAttribute("aria-pressed", String(soundEnabled));
  soundToggleButton.classList.toggle("muted", !soundEnabled);
}

function playSound(soundName) {
  if (!soundEnabled || !sounds[soundName]) {
    return;
  }

  const sound = sounds[soundName];
  sound.muted = false;
  sound.volume = 1;
  sound.pause();
  sound.currentTime = 0;

  const playPromise = sound.play();

  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch((error) => {
      console.warn(`Sound could not be played: ${soundFiles[soundName]}`, error);
    });
  }
}

function clearGameTimers() {
  clearInterval(timerInterval);
  clearInterval(spawnInterval);
  timerInterval = null;
  spawnInterval = null;
  activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  activeTimeouts = [];
  clearTimeout(feedbackTimeout);
  feedbackTimeout = null;
}

function clearCountdownTimers() {
  countdownTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  countdownTimeouts = [];
}

function clearGameObjects() {
  const objects = gameArea.querySelectorAll(".water-drop, .confetti, .floating-score");
  objects.forEach((object) => object.remove());
}

function removeAfterAnimation(element) {
  setTrackedTimeout(() => removeElement(element), 280);
}

function removeElement(element) {
  if (element && element.parentElement) {
    element.remove();
  }
}

function setTrackedTimeout(callback, delay) {
  const timeoutId = setTimeout(() => {
    activeTimeouts = activeTimeouts.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  activeTimeouts.push(timeoutId);
  return timeoutId;
}

function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const colors = ["#ffc907", "#1ca3ec", "#35a853", "#ffffff", "#111827"];

  for (let i = 0; i < 35; i++) {
    const confetti = document.createElement("span");
    confetti.classList.add("confetti");
    confetti.setAttribute("aria-hidden", "true");
    confetti.style.left = `${randomNumber(0, gameArea.clientWidth)}px`;
    confetti.style.backgroundColor = colors[i % colors.length];
    confetti.style.animationDelay = `${Math.random() * 0.6}s`;
    gameArea.appendChild(confetti);
    setTrackedTimeout(() => removeElement(confetti), 2600);
  }
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
