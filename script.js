/*
  Resurrection W: Save the Plant
  Beginner-friendly JavaScript game logic.

  Customize game settings here:
*/
const SCORE_GOAL = 10;
const START_TIME = 30;
const NORMAL_DROP_SPEED = 900; // score 0-4
const FAST_DROP_SPEED = 700; // score 5-7
const FASTEST_DROP_SPEED = 550; // score 8+

// Customize messages here.
const MESSAGES = {
  start: "Click clean water drops!",
  ready: "Press Start to begin!",
  clean: "Great! Clean water helps the plant grow. +1",
  jerryCan: "Jerry Can bonus! +3",
  dirty: "Dirty water! -1",
  combo: "Combo! Keep the clean water coming!",
  win: "You saved the plant!",
  lose: "Time is up! Try again to bring clean water."
};

// Get important HTML elements.
const scoreDisplay = document.getElementById("scoreDisplay");
const timerDisplay = document.getElementById("timerDisplay");
const feedbackText = document.getElementById("feedbackText");
const gameArea = document.getElementById("gameArea");
const plant = document.getElementById("plant");
const plantEmoji = plant.querySelector(".plant-emoji");
const plantLabel = document.getElementById("plantLabel");
const startButtonContainer = document.getElementById("startButtonContainer");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const starRating = document.getElementById("starRating");
const finalScore = document.getElementById("finalScore");
const resultMessage = document.getElementById("resultMessage");
const playAgainButton = document.getElementById("playAgainButton");
const closeModalButton = document.getElementById("closeModalButton");

// Track game state.
let score = 0;
let timeLeft = START_TIME;
let timerInterval;
let dropInterval;
let gameRunning = false;
let currentDropSpeed = NORMAL_DROP_SPEED;
let comboCount = 0;

// Show the ready screen when the page loads. The game does not start yet.
showStartState();

// Button controls.
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", showStartState);
playAgainButton.addEventListener("click", showStartState);
closeModalButton.addEventListener("click", closeResultModal);

function showStartState() {
  score = 0;
  timeLeft = START_TIME;
  gameRunning = false;
  comboCount = 0;
  currentDropSpeed = NORMAL_DROP_SPEED;

  clearInterval(timerInterval);
  clearInterval(dropInterval);
  clearDrops();
  closeResultModal();

  scoreDisplay.textContent = `Score: ${score}`;
  timerDisplay.textContent = `Time: ${timeLeft}`;
  feedbackText.textContent = MESSAGES.ready;

  plant.className = "plant dry";
  plant.setAttribute("aria-label", "Dry plant");
  plantEmoji.textContent = "🥀";
  plantLabel.textContent = "Dry plant";

  // Show the big centered Start button before the game begins.
  startButtonContainer.classList.remove("hidden");
  startButton.disabled = false;
}

function startGame() {
  if (gameRunning) {
    return;
  }

  gameRunning = true;
  feedbackText.textContent = MESSAGES.start;
  // Hide the Start button so it does not block water drops.
  startButtonContainer.classList.add("hidden");
  startButton.disabled = true;

  timerInterval = setInterval(updateTimer, 1000);
  dropInterval = setInterval(createWaterDrop, currentDropSpeed);
  createWaterDrop();
}

function updateTimer() {
  timeLeft--;
  timerDisplay.textContent = `Time: ${timeLeft}`;

  if (timeLeft <= 0) {
    endGame(false);
  }
}

function createWaterDrop() {
  if (!gameRunning) {
    return;
  }

  const drop = document.createElement("button");
  const dropType = chooseDropType();

  drop.classList.add("water-drop", dropType);
  drop.type = "button";
  drop.setAttribute("aria-label", dropType === "jerry-can" ? "Jerry Can bonus" : `${dropType} water drop`);

  // Jerry Can bonus uses the provided transparent image without recoloring or distortion.
  if (dropType === "jerry-can") {
    const jerryCanImage = document.createElement("img");
    jerryCanImage.src = "png/water-can-transparent.png";
    jerryCanImage.alt = "Jerry Can bonus";
    jerryCanImage.classList.add("jerry-can-image");
    drop.appendChild(jerryCanImage);
  }

  // Keep drops inside the visible game area and away from the plant at the bottom.
  const dropSize = 52;
  const maxX = gameArea.clientWidth - dropSize;
  const maxY = gameArea.clientHeight - 150;
  drop.style.left = `${randomNumber(8, Math.max(8, maxX))}px`;
  drop.style.top = `${randomNumber(8, Math.max(8, maxY))}px`;

  drop.addEventListener("click", () => handleDropClick(drop, dropType));
  gameArea.appendChild(drop);

  // Remove old drops if the player does not click them.
  setTimeout(() => {
    if (drop.parentElement) {
      drop.remove();
    }
  }, 2200);
}

function chooseDropType() {
  const chance = Math.random();

  if (chance < 0.15) {
    return "jerry-can";
  }

  if (chance < 0.42) {
    return "dirty";
  }

  return "clean";
}

function handleDropClick(drop, dropType) {
  if (!gameRunning) {
    return;
  }

  if (dropType === "clean") {
    score++;
    comboCount++;
    feedbackText.textContent = MESSAGES.clean;
  } else if (dropType === "jerry-can") {
    score += 3;
    comboCount++;
    feedbackText.textContent = MESSAGES.jerryCan;
  } else {
    score = Math.max(0, score - 1);
    comboCount = 0;
    feedbackText.textContent = MESSAGES.dirty;
  }

  if (comboCount >= 3 && dropType !== "dirty") {
    feedbackText.textContent += ` ${MESSAGES.combo}`;
  }

  scoreDisplay.textContent = `Score: ${score}`;
  drop.remove();
  updateDropSpeed();

  if (score >= SCORE_GOAL) {
    endGame(true);
  }
}

function endGame(playerWon) {
  gameRunning = false;
  clearInterval(timerInterval);
  clearInterval(dropInterval);
  clearDrops();
  startButton.disabled = true;

  if (playerWon) {
    feedbackText.textContent = MESSAGES.win;
    plant.className = "plant healthy";
    plant.setAttribute("aria-label", "Healthy saved plant");
    plantEmoji.textContent = "🌱";
    plantLabel.textContent = "Plant saved!";
  } else {
    feedbackText.textContent = MESSAGES.lose;
  }

  showResultModal(playerWon);
}

function updateDropSpeed() {
  let newSpeed = NORMAL_DROP_SPEED;

  if (score >= 8) {
    newSpeed = FASTEST_DROP_SPEED;
  } else if (score >= 5) {
    newSpeed = FAST_DROP_SPEED;
  }

  if (newSpeed !== currentDropSpeed) {
    currentDropSpeed = newSpeed;
    clearInterval(dropInterval);
    dropInterval = setInterval(createWaterDrop, currentDropSpeed);
  }
}

function showResultModal(playerWon) {
  const stars = getStarCount();

  resultTitle.textContent = playerWon ? "You Saved the Plant!" : "Round Complete";
  starRating.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  finalScore.textContent = `Final Score: ${score}`;
  resultMessage.textContent = getRatingMessage(stars);

  resultOverlay.classList.remove("hidden");
  resultOverlay.setAttribute("aria-hidden", "false");

  if (stars === 3) {
    celebrate();
  }
}

function closeResultModal() {
  resultOverlay.classList.add("hidden");
  resultOverlay.setAttribute("aria-hidden", "true");
}

function getStarCount() {
  if (score >= SCORE_GOAL) {
    return 3;
  }

  if (score >= 8) {
    return 2;
  }

  if (score >= 3) {
    return 1;
  }

  return 0;
}

function getRatingMessage(stars) {
  if (stars === 3) {
    return "Plant saved!";
  }

  if (stars === 2) {
    return "Almost there!";
  }

  if (stars === 1) {
    return "Keep trying!";
  }

  return "Please try again!";
}

function clearDrops() {
  const drops = document.querySelectorAll(".water-drop, .confetti");
  drops.forEach((drop) => drop.remove());
}

function celebrate() {
  const colors = ["#ffc907", "#1ca3ec", "#35a853", "#ffffff", "#111827"];

  for (let i = 0; i < 35; i++) {
    const confetti = document.createElement("span");
    confetti.classList.add("confetti");
    confetti.style.left = `${randomNumber(0, gameArea.clientWidth)}px`;
    confetti.style.backgroundColor = colors[i % colors.length];
    confetti.style.animationDelay = `${Math.random() * 0.6}s`;
    gameArea.appendChild(confetti);
  }
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}