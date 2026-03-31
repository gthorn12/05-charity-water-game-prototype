// Log a message to the console to ensure the script is linked correctly
console.log('JavaScript file is linked correctly.');

const game = document.getElementById('game');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const difficultyScreen = document.getElementById('difficultyScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resetBtn = document.getElementById('resetBtn');
const easyBtn = document.getElementById('easyBtn');
const normalBtn = document.getElementById('normalBtn');
const hardBtn = document.getElementById('hardBtn');
const messageEl = document.getElementById('message');
const charityFooter = document.getElementById('charityFooter');

let score = 0;
let lives = 3;
let running = false;
let animationId = null;
let lastSpawn = 0;
let spawnDelay = 650;
let speedMultiplier = 1;
let messageTimeout = null;
let selectedDifficulty = 'normal';
let streak = 0;
let points = 0;
let speedIncreaseCounter = 0;
let bonus2x = false;
let bonus3x = false;
const drops = [];
const groundTop = () => game.clientHeight - 72;

// Preload water sound
const waterSound = new Audio('audio/water.mp3');
waterSound.preload = 'auto';

// Preload applause sound
const applauseSound = new Audio('audio/applause.mp3');
applauseSound.preload = 'auto';

function showMessage(text, duration = 900, always = false) {
  if (!always && Math.random() > 0.45) return; // 45% chance to show messages unless always

  messageEl.textContent = text;
  messageEl.classList.add('show');
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    messageEl.classList.remove('show');
  }, duration);
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
}

function createSplash(text, x, y, bad = false) {
  const splash = document.createElement('div');
  splash.className = `splash${bad ? ' bad-text' : ''}`;
  splash.textContent = text;
  splash.style.left = `${x}px`;
  splash.style.top = `${y}px`;
  game.appendChild(splash);
  setTimeout(() => splash.remove(), 650);
}

function removeDrop(dropObj) {
  const index = drops.indexOf(dropObj);
  if (index >= 0) drops.splice(index, 1);
  dropObj.el.remove();
}

function catchDrop(dropObj) {
  if (!running) return;

  dropObj.el.style.transform = "scale(1.2)";
  dropObj.el.style.opacity = "0.6";

  if (dropObj.type === 'good') {
    // Play water sound
    waterSound.currentTime = 0;
    waterSound.play().catch(e => console.log('Audio play failed:', e));

    streak++;
    points = 1;

    if (streak > 10) {
      points = 2;
    }
    if (streak > 25) {
      points = 3;
    }

    score += points;
    createSplash(`+${points}`, dropObj.x, dropObj.y);
    speedIncreaseCounter += points;

    if (streak > 10 && !bonus2x) {
      showMessage('2X BONUS!', 900, true);
      bonus2x = true;
    } else if (streak > 25 && !bonus3x) {
      showMessage('3X BONUS!', 900, true);
      bonus3x = true;
      launchConfetti();
      applauseSound.currentTime = 0;
      applauseSound.play().catch(e => console.log('Applause play failed:', e));
    } else if (speedIncreaseCounter >= 50) {
      speedMultiplier += 0.05;
      spawnDelay = Math.max(300, spawnDelay - 35);
      showMessage('Nice! The rain is picking up!');
      speedIncreaseCounter -= 50;
    } else {
      showMessage('Fresh water collected!', 550);
    }
  } else {
    streak = 0;
    bonus2x = false;
    bonus3x = false;
    score = Math.max(0, score - 2);
    lives -= 1;
    createSplash('-2', dropObj.x, dropObj.y, true);
    showMessage('You caught dirty water! Watch out!');
  }

  updateHud();
  removeDrop(dropObj);
  if (lives <= 0) endGame(false);
}

function missDrop(dropObj) {
  if (dropObj.type === 'good') {
    showMessage('You missed clean water!', 700);
    streak = 0;
    bonus2x = false;
    bonus3x = false;
  } else {
    showMessage('Good job avoiding dirty water!', 650);
  }
  removeDrop(dropObj);
}

function spawnDrop() {
  const el = document.createElement('div');
  const isBad = Math.random() < 0.24;
  el.className = `drop ${isBad ? 'bad' : 'good'}`;

  const x = 20 + Math.random() * (game.clientWidth - 70);
  const y = 120;
  const speed = (2 + Math.random() * 1.8) * speedMultiplier * 0.5;
  const sway = (Math.random() * 1.4 - 0.7);

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  const dropObj = {
    el,
    type: isBad ? 'bad' : 'good',
    x,
    y,
    speed,
    sway,
    angle: Math.random() * Math.PI * 2,
    id: Math.random() * 1000
  };

  el.addEventListener('click', () => catchDrop(dropObj));
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    catchDrop(dropObj);
  }, { passive: false });

  game.appendChild(el);
  drops.push(dropObj);
}

function gameLoop(timestamp) {
  if (!running) return;

  if (!lastSpawn) lastSpawn = timestamp;
  if (timestamp - lastSpawn >= spawnDelay) {
    spawnDrop();
    lastSpawn = timestamp;
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    drop.y += drop.speed;
    drop.angle += 0.05;
    drop.x += Math.sin(drop.angle) * drop.sway;
    drop.el.style.top = `${drop.y}px`;
    drop.el.style.left = `${drop.x}px`;

    if (drop.y + 59 >= groundTop()) {
      if (drop.type === 'good') {
        lives -= 1;
        updateHud();
        createSplash('Miss!', drop.x, groundTop() - 30, true);
        if (lives <= 0) {
          removeDrop(drop);
          endGame();
          return;
        }
      }
      missDrop(drop);
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

function clearDrops() {
  while (drops.length) {
    drops.pop().el.remove();
  }
}

function startGame() {
  score = 0;
  lives = 3;
  speedIncreaseCounter = 0;
  running = true;
  lastSpawn = 0;
  spawnDelay = 650;
  
  // Apply difficulty multiplier based on selected difficulty
  // Easy: 50% slower (multiply by 0.5)
  // Normal: no change (multiply by 1)
  // Hard: 15% faster (multiply by 1.15)
  const difficultyMultipliers = {
    'easy': 0.5,
    'normal': 1,
    'hard': 1.15
  };
  speedMultiplier = difficultyMultipliers[selectedDifficulty];
  
  clearDrops();
  updateHud();
  startScreen.classList.add('hidden');
  difficultyScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  charityFooter.classList.add('hidden');
  resetBtn.classList.remove('hidden');
  showMessage('Catch the clean water!', 1200);

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function launchConfetti() {
  const colors = ['#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A', '#F5402C'];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = `${Math.random() * game.clientWidth}px`;
    confetti.style.top = '-8px';
    const duration = 1.4 + Math.random() * 0.8;
    const drift = Math.random() * 180 - 90;
    const rotate = Math.random() * 720;
    confetti.style.animation = `confetti-fall ${duration}s ease-out forwards`;
    confetti.style.setProperty('--drift', `${drift}px`);
    confetti.style.setProperty('--rotate', `${rotate}deg`);
    game.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, duration * 1000 + 400);
  }
}

function setButtonCooldown(button, ms) {
  button.disabled = true;
  setTimeout(() => {
    button.disabled = false;
  }, ms);
}

function endGame(isWin = false) {
  running = false;
  cancelAnimationFrame(animationId);
  finalScoreEl.textContent = score;
  const panelText = document.querySelector('.panel-text');
  panelText.textContent = isWin ? 'YOU WIN!!' : 'Game Over!';
  gameOverScreen.classList.remove('hidden');
  charityFooter.classList.remove('hidden');
  showMessage(isWin ? 'Great job! You won!' : 'The well ran dry...');

  resetBtn.classList.add('hidden');
  setButtonCooldown(restartBtn, 500);

  if (isWin) {
    launchConfetti();
  }
}

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  difficultyScreen.classList.remove('hidden');
});

easyBtn.addEventListener('click', () => {
  selectedDifficulty = 'easy';
  startGame();
});

normalBtn.addEventListener('click', () => {
  selectedDifficulty = 'normal';
  startGame();
});

hardBtn.addEventListener('click', () => {
  selectedDifficulty = 'hard';
  startGame();
});

restartBtn.addEventListener('click', () => {
  gameOverScreen.classList.add('hidden');
  charityFooter.classList.add('hidden');
  difficultyScreen.classList.remove('hidden');
});
resetBtn.addEventListener('click', () => {
  resetBtn.disabled = true;
  setTimeout(() => { resetBtn.disabled = false; }, 500);
  startGame();
});

updateHud();