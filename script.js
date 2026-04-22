console.log('JavaScript file is linked correctly.');

const game = document.getElementById('game');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const difficultyScreen = document.getElementById('difficultyScreen');
const upgradeScreen = document.getElementById('upgradeScreen');
const upgradeOptions = document.getElementById('upgradeOptions');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resetBtn = document.getElementById('resetBtn');
const easyBtn = document.getElementById('easyBtn');
const normalBtn = document.getElementById('normalBtn');
const hardBtn = document.getElementById('hardBtn');
const messageEl = document.getElementById('message');
const charityFooter = document.getElementById('charityFooter');

const activeUpgradesBar = document.getElementById('activeUpgradesBar');
const frenzyFill = document.getElementById('frenzyFill');

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

let inDraft = false;
let totalCleanCaught = 0;
let draftCount = 0;
let nextDraftMilestone = 25;
let lastCatchTime = 0;
let recentCatchChain = 0;

let frenzyActive = false;
let frenzyTimeout = null;
let frenzyCharge = 0;
let frenzyThreshold = 30;

let lastPowerupSpawnScore = 0;
const activePowerups = new Map();

let playerMods = {
  comboBoost: 0,
  goldenDrops: false,
  comboShields: 0,
  stormHarvest: false,
  purifier: false,
  monsoon: false,
  reservoir: false,
  extraBucketStacks: 0,
  echoCatch: false,
  diamondDrops: false,
  frenzyEngine: false,
  guardianMist: false,
  catalyst: false,
  jackpotRain: false,
  overclockedFrenzy: false
};

let activeUpgrades = [];

const waterSound = new Audio('audio/water.mp3');
waterSound.preload = 'auto';

const applauseSound = new Audio('audio/applause.mp3');
applauseSound.preload = 'auto';

function showMessage(text, duration = 900, always = false) {
  if (!always && Math.random() > 0.45) return;

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

function breakCombo() {
  if (hasTimedPowerup('combo_guard')) {
    consumeTimedPowerup('combo_guard');
    showMessage('Combo Guard saved you!', 900, true);
    return;
  }

  if (playerMods.comboShields > 0) {
    playerMods.comboShields--;
    showMessage('Combo Shield saved your streak!', 950, true);
    updateActiveBar();
    return;
  }

  streak = 0;
  bonus2x = false;
  bonus3x = false;
  recentCatchChain = 0;
  frenzyCharge = 0;
  updateFrenzyMeter();
}

function getDraftInterval(draftCountValue) {
  if (draftCountValue < 10) return 25;
  return Math.floor(draftCountValue / 10) * 50;
}

function resetRunState() {
  inDraft = false;
  totalCleanCaught = 0;
  draftCount = 0;
  nextDraftMilestone = 25;
  lastCatchTime = 0;
  recentCatchChain = 0;
  activeUpgrades = [];
  activePowerups.clear();
  frenzyActive = false;
  frenzyCharge = 0;
  lastPowerupSpawnScore = 0;

  if (frenzyTimeout) {
    clearTimeout(frenzyTimeout);
    frenzyTimeout = null;
  }

  playerMods = {
    comboBoost: 0,
    goldenDrops: false,
    comboShields: 0,
    stormHarvest: false,
    purifier: false,
    monsoon: false,
    reservoir: false,
    extraBucketStacks: 0,
    echoCatch: false,
    diamondDrops: false,
    frenzyEngine: false,
    guardianMist: false,
    catalyst: false,
    jackpotRain: false,
    overclockedFrenzy: false
  };

  updateFrenzyMeter();
  updateActiveBar();
}

function updateFrenzyMeter() {
  const pct = Math.max(0, Math.min(100, (frenzyCharge / frenzyThreshold) * 100));
  frenzyFill.style.width = `${pct}%`;
}

function startFrenzy() {
  if (frenzyActive) return;

  frenzyActive = true;
  frenzyCharge = frenzyThreshold;
  updateFrenzyMeter();

  const duration = playerMods.overclockedFrenzy ? 9000 : 6500;
  showMessage('FRENZY MODE!', 1200, true);
  launchConfetti();

  if (frenzyTimeout) clearTimeout(frenzyTimeout);
  frenzyTimeout = setTimeout(() => {
    frenzyActive = false;
    frenzyCharge = 0;
    updateFrenzyMeter();
    showMessage('Frenzy ended.', 800, true);
  }, duration);
}

function addFrenzyCharge(amount = 1) {
  if (frenzyActive) return;

  frenzyCharge += amount;
  updateFrenzyMeter();

  if (frenzyCharge >= frenzyThreshold) {
    startFrenzy();
  }
}

function getCleanDropPoints() {
  let gained = 1;

  if (streak > 10) gained = 2;
  if (streak > 25) gained = 3;

  if (playerMods.comboBoost > 0 && streak >= 10) {
    gained += playerMods.comboBoost;
  }

  if (playerMods.monsoon) {
    gained += 1;
  }

  if (playerMods.diamondDrops && streak >= 20) {
    gained += 2;
  }

  if (playerMods.goldenDrops && Math.random() < 0.10) {
    gained += 5;
    showMessage('GOLDEN DROP!', 700, true);
  }

  if (playerMods.jackpotRain && Math.random() < 0.04) {
    gained += 20;
    showMessage('JACKPOT!', 900, true);
  }

  if (frenzyActive) {
    gained *= playerMods.overclockedFrenzy ? 4 : 3;
  }

  if (hasTimedPowerup('double_points')) {
    gained *= 2;
  }

  return gained;
}

function handleReservoirBonus(dropObj) {
  if (!playerMods.reservoir) return;
  if (totalCleanCaught > 0 && totalCleanCaught % 20 === 0) {
    score += 10;
    createSplash('+10', dropObj.x + 18, dropObj.y - 10);
    showMessage('RESERVOIR BONUS!', 850, true);
  }
}

function handleStormHarvest(dropObj) {
  if (!playerMods.stormHarvest) return;

  const now = performance.now();
  if (now - lastCatchTime <= 2000) {
    recentCatchChain++;
  } else {
    recentCatchChain = 1;
  }

  lastCatchTime = now;

  if (recentCatchChain >= 3) {
    let bonus = 8;
    if (playerMods.catalyst) bonus += 4;
    if (frenzyActive) bonus *= 2;

    score += bonus;
    createSplash(`+${bonus}`, dropObj.x + 12, dropObj.y - 18);
    showMessage('STORM HARVEST!', 850, true);
    recentCatchChain = 0;
  }
}

function maybeOpenDraft(dropObj) {
  if (totalCleanCaught < nextDraftMilestone) return false;

  removeDrop(dropObj);
  openUpgradeDraft();
  return true;
}

function hasTimedPowerup(id) {
  const p = activePowerups.get(id);
  return !!p && p.expiresAt > performance.now();
}

function consumeTimedPowerup(id) {
  activePowerups.delete(id);
  updateActiveBar();
}

function activateTimedPowerup(powerup) {
  const durationMs = powerup.durationMs;
  activePowerups.set(powerup.id, {
    ...powerup,
    expiresAt: performance.now() + durationMs
  });

  showMessage(`${powerup.name}!`, 900, true);
  updateActiveBar();
}

function cleanupExpiredPowerups() {
  const now = performance.now();
  let changed = false;

  for (const [id, value] of activePowerups.entries()) {
    if (value.expiresAt <= now) {
      activePowerups.delete(id);
      changed = true;
    }
  }

  if (changed) updateActiveBar();
}

const FALLING_POWERUPS = [
  {
    id: 'double_points',
    name: 'Double Points',
    durationMs: 7000,
    description: 'All clean drops score double for a short time.'
  },
  {
    id: 'cleanse',
    name: 'Cleanse',
    durationMs: 1,
    instant: true,
    description: 'Removes all dirty drops on screen.'
  },
  {
    id: 'combo_guard',
    name: 'Combo Guard',
    durationMs: 12000,
    description: 'Next combo break is ignored.'
  },
  {
    id: 'slow_time',
    name: 'Slow Time',
    durationMs: 7000,
    description: 'Falling drops slow down temporarily.'
  }
];

function applyInstantPowerup(powerup) {
  if (powerup.id === 'cleanse') {
    for (let i = drops.length - 1; i >= 0; i--) {
      if (drops[i].type === 'bad') {
        removeDrop(drops[i]);
      }
    }
    showMessage('CLEANSE!', 900, true);
  }
}

function catchPowerup(dropObj) {
  if (!running || inDraft) return;

  const powerup = dropObj.powerupData;
  if (!powerup) return;

  createSplash(powerup.name, dropObj.x - 10, dropObj.y - 10);
  removeDrop(dropObj);

  if (powerup.instant) {
    applyInstantPowerup(powerup);
    return;
  }

  activateTimedPowerup(powerup);
}

function maybeSpawnPowerupDrop() {
  if (score < lastPowerupSpawnScore + 40) return false;
  if (Math.random() > 0.35) return false;

  lastPowerupSpawnScore = score;

  const powerup = FALLING_POWERUPS[Math.floor(Math.random() * FALLING_POWERUPS.length)];
  const el = document.createElement('div');
  el.className = 'drop powerup';

  const x = 20 + Math.random() * (game.clientWidth - 70);
  const y = 120;
  const speed = (2 + Math.random() * 1.3) * speedMultiplier * 0.45;
  const sway = (Math.random() * 1.4 - 0.7);

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  const dropObj = {
    el,
    type: 'powerup',
    powerupData: powerup,
    x,
    y,
    speed,
    sway,
    angle: Math.random() * Math.PI * 2,
    id: Math.random() * 1000
  };

  el.addEventListener('click', () => catchPowerup(dropObj));
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    catchPowerup(dropObj);
  }, { passive: false });

  game.appendChild(el);
  drops.push(dropObj);
  return true;
}

function updateActiveBar() {
  activeUpgradesBar.innerHTML = '';

  if (activeUpgrades.length === 0 && activePowerups.size === 0 && playerMods.comboShields === 0) {
    activeUpgradesBar.innerHTML = `<span class="empty-upgrades">No upgrades yet</span>`;
    return;
  }

  activeUpgrades.forEach(upgrade => {
    const chip = document.createElement('span');
    chip.className = `upgrade-chip ${upgrade.rarity}`;
    chip.textContent = upgrade.name;
    activeUpgradesBar.appendChild(chip);
  });

  if (playerMods.comboShields > 0) {
    const shieldChip = document.createElement('span');
    shieldChip.className = 'upgrade-chip common';
    shieldChip.textContent = `Combo Shield x${playerMods.comboShields}`;
    activeUpgradesBar.appendChild(shieldChip);
  }

  const now = performance.now();
  for (const [, powerup] of activePowerups.entries()) {
    const secs = Math.max(1, Math.ceil((powerup.expiresAt - now) / 1000));
    const chip = document.createElement('span');
    chip.className = 'powerup-chip';
    chip.textContent = `${powerup.name} ${secs}s`;
    activeUpgradesBar.appendChild(chip);
  }
}

function catchDrop(dropObj) {
  if (!running || inDraft) return;

  if (dropObj.type === 'powerup') {
    catchPowerup(dropObj);
    return;
  }

  dropObj.el.style.transform = 'scale(1.2)';
  dropObj.el.style.opacity = '0.6';

  if (dropObj.type === 'good') {
    waterSound.currentTime = 0;
    waterSound.play().catch(e => console.log('Audio play failed:', e));

    streak++;
    totalCleanCaught++;

    addFrenzyCharge(playerMods.frenzyEngine ? 2 : 1);

    points = getCleanDropPoints();
    score += points;
    createSplash(`+${points}`, dropObj.x, dropObj.y);

    if (playerMods.echoCatch && Math.random() < 0.18) {
      score += points;
      createSplash(`+${points}`, dropObj.x + 16, dropObj.y - 14);
      showMessage('ECHO CATCH!', 650, true);
    }

    handleReservoirBonus(dropObj);
    handleStormHarvest(dropObj);

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
      spawnDelay = Math.max(230, spawnDelay - 35);
      showMessage('Nice! The rain is picking up!');
      speedIncreaseCounter -= 50;
    } else {
      showMessage('Fresh water collected!', 550);
    }

    if (playerMods.guardianMist && streak > 0 && streak % 15 === 0) {
      activateTimedPowerup({
        id: 'combo_guard',
        name: 'Combo Guard',
        durationMs: 12000
      });
    }

    updateHud();
    maybeSpawnPowerupDrop();

    if (maybeOpenDraft(dropObj)) {
      updateActiveBar();
      return;
    }
  } else {
    breakCombo();
    score = Math.max(0, score - 2);
    lives -= 1;
    createSplash('-2', dropObj.x, dropObj.y, true);
    showMessage('You caught dirty water! Watch out!');
    updateHud();
  }

  removeDrop(dropObj);

  if (lives <= 0) endGame(false);
  updateActiveBar();
}

function missDrop(dropObj) {
  if (dropObj.type === 'powerup') {
    removeDrop(dropObj);
    return;
  }

  if (dropObj.type === 'good') {
    showMessage('You missed clean water!', 700);
    breakCombo();
  } else {
    showMessage('Good job avoiding dirty water!', 650);
  }
  removeDrop(dropObj);
}

function spawnDrop() {
  const el = document.createElement('div');

  let badChance = 0.24;
  if (playerMods.monsoon) badChance = 0.30;
  if (frenzyActive) badChance *= 0.8;

  let isBad = Math.random() < badChance;

  if (isBad && playerMods.purifier && Math.random() < 0.12) {
    isBad = false;
    showMessage('Purified!', 500);
  }

  el.className = `drop ${isBad ? 'bad' : 'good'}`;

  const x = 20 + Math.random() * (game.clientWidth - 70);
  const y = 120;
  let speed = (2 + Math.random() * 1.8) * speedMultiplier * 0.5;
  if (hasTimedPowerup('slow_time')) speed *= 0.55;
  if (frenzyActive) speed *= 1.15;

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

  cleanupExpiredPowerups();

  if (inDraft) {
    animationId = requestAnimationFrame(gameLoop);
    return;
  }

  const currentSpawnDelay = frenzyActive ? Math.max(140, spawnDelay - 120) : spawnDelay;

  if (!lastSpawn) lastSpawn = timestamp;
  if (timestamp - lastSpawn >= currentSpawnDelay) {
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

  updateActiveBar();
  animationId = requestAnimationFrame(gameLoop);
}

function clearDrops() {
  while (drops.length) {
    drops.pop().el.remove();
  }
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

const ALL_UPGRADES = [
  {
    id: 'combo_boost',
    name: 'Combo Boost',
    description: '+1 point on clean drops while your streak is 10 or higher.',
    tag: 'SCORING',
    rarity: 'common',
    weight: 10,
    repeatable: true,
    synergyTags: ['combo', 'score'],
    apply() { playerMods.comboBoost += 1; }
  },
  {
    id: 'golden_drops',
    name: 'Golden Drops',
    description: '10% chance that a clean drop is worth +5 extra points.',
    tag: 'SCORING',
    rarity: 'common',
    weight: 9,
    repeatable: false,
    synergyTags: ['score', 'luck'],
    apply() { playerMods.goldenDrops = true; }
  },
  {
    id: 'combo_shield',
    name: 'Combo Shield',
    description: 'Ignore the next combo break caused by a miss or mistake.',
    tag: 'SURVIVAL',
    rarity: 'common',
    weight: 10,
    repeatable: true,
    synergyTags: ['survival', 'combo'],
    apply() { playerMods.comboShields += 1; }
  },
  {
    id: 'storm_harvest',
    name: 'Storm Harvest',
    description: 'Catch 3 clean drops within 2 seconds to gain +8 bonus points.',
    tag: 'SCORING',
    rarity: 'rare',
    weight: 7,
    repeatable: false,
    synergyTags: ['speed', 'score'],
    apply() { playerMods.stormHarvest = true; }
  },
  {
    id: 'extra_bucket',
    name: 'Extra Bucket',
    description: 'Gain +1 life immediately.',
    tag: 'SURVIVAL',
    rarity: 'common',
    weight: 10,
    repeatable: true,
    synergyTags: ['survival'],
    apply() {
      lives += 1;
      playerMods.extraBucketStacks += 1;
      updateHud();
    }
  },
  {
    id: 'purifier',
    name: 'Purifier',
    description: '12% chance for a dirty drop to spawn as a clean drop instead.',
    tag: 'SURVIVAL',
    rarity: 'rare',
    weight: 7,
    repeatable: false,
    synergyTags: ['survival', 'clean'],
    apply() { playerMods.purifier = true; }
  },
  {
    id: 'reservoir',
    name: 'Reservoir',
    description: 'Every 20th clean drop caught grants +10 bonus points.',
    tag: 'SCORING',
    rarity: 'rare',
    weight: 7,
    repeatable: false,
    synergyTags: ['score', 'clean'],
    apply() { playerMods.reservoir = true; }
  },
  {
    id: 'monsoon',
    name: 'Monsoon',
    description: 'Clean drops are worth +1 point, but dirty drops become more common.',
    tag: 'RISK/REWARD',
    rarity: 'rare',
    weight: 6,
    repeatable: false,
    synergyTags: ['risk', 'score', 'speed'],
    apply() {
      playerMods.monsoon = true;
      spawnDelay = Math.max(240, spawnDelay - 40);
    }
  },

  // new six
  {
    id: 'echo_catch',
    name: 'Echo Catch',
    description: '18% chance a clean drop scores a second time.',
    tag: 'SCORING',
    rarity: 'rare',
    weight: 7,
    repeatable: false,
    synergyTags: ['score', 'luck'],
    apply() { playerMods.echoCatch = true; }
  },
  {
    id: 'diamond_drops',
    name: 'Diamond Drops',
    description: 'Clean drops gain +2 more points while your streak is 20 or higher.',
    tag: 'SCORING',
    rarity: 'rare',
    weight: 7,
    repeatable: false,
    synergyTags: ['combo', 'score'],
    apply() { playerMods.diamondDrops = true; }
  },
  {
    id: 'frenzy_engine',
    name: 'Frenzy Engine',
    description: 'Frenzy builds twice as fast.',
    tag: 'TEMPO',
    rarity: 'rare',
    weight: 6,
    repeatable: false,
    synergyTags: ['frenzy', 'speed'],
    apply() { playerMods.frenzyEngine = true; }
  },
  {
    id: 'guardian_mist',
    name: 'Guardian Mist',
    description: 'Every 15 streak grants a temporary Combo Guard.',
    tag: 'SURVIVAL',
    rarity: 'rare',
    weight: 6,
    repeatable: false,
    synergyTags: ['survival', 'combo'],
    apply() { playerMods.guardianMist = true; }
  },
  {
    id: 'catalyst',
    name: 'Catalyst',
    description: 'Storm Harvest bonuses gain +4 points.',
    tag: 'SCORING',
    rarity: 'legendary',
    weight: 3,
    repeatable: false,
    synergyTags: ['score', 'speed'],
    apply() { playerMods.catalyst = true; }
  },
  {
    id: 'jackpot_rain',
    name: 'Jackpot Rain',
    description: '4% chance a clean drop is worth +20 points.',
    tag: 'LUCK',
    rarity: 'legendary',
    weight: 3,
    repeatable: false,
    synergyTags: ['luck', 'score'],
    apply() { playerMods.jackpotRain = true; }
  },
  {
    id: 'overclocked_frenzy',
    name: 'Overclocked Frenzy',
    description: 'Frenzy lasts longer and multiplies clean drops by 4 instead of 3.',
    tag: 'TEMPO',
    rarity: 'legendary',
    weight: 2,
    repeatable: false,
    synergyTags: ['frenzy', 'score'],
    apply() { playerMods.overclockedFrenzy = true; }
  }
];

function getCurrentSynergyBias() {
  const counts = {};
  activeUpgrades.forEach(upgrade => {
    upgrade.synergyTags.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return counts;
}

function weightedPick(pool) {
  const total = pool.reduce((sum, item) => sum + item.weightScore, 0);
  let roll = Math.random() * total;

  for (const item of pool) {
    roll -= item.weightScore;
    if (roll <= 0) return item;
  }

  return pool[pool.length - 1];
}

function getDraftChoices(count = 3) {
  const synergyBias = getCurrentSynergyBias();

  const available = ALL_UPGRADES
    .filter(upgrade => {
      if (upgrade.repeatable) return true;
      return !activeUpgrades.some(a => a.id === upgrade.id);
    })
    .map(upgrade => {
      let bonus = 0;
      upgrade.synergyTags.forEach(tag => {
        bonus += (synergyBias[tag] || 0) * 2;
      });

      return {
        ...upgrade,
        weightScore: upgrade.weight + bonus
      };
    });

  const choices = [];
  const pool = [...available];

  while (choices.length < count && pool.length > 0) {
    const picked = weightedPick(pool);
    choices.push(picked);

    const idx = pool.findIndex(p => p.id === picked.id);
    if (idx >= 0) pool.splice(idx, 1);
  }

  return choices;
}

function renderUpgradeChoices(choices) {
  upgradeOptions.innerHTML = '';

  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = `upgrade-card ${choice.rarity}`;
    btn.innerHTML = `
      <h3>${choice.name}</h3>
      <p>${choice.description}</p>
      <span class="tag">${choice.tag}</span>
      <span class="rarity">${choice.rarity.toUpperCase()}</span>
    `;

    btn.addEventListener('click', () => {
      choice.apply();

      if (!choice.repeatable || choice.id === 'combo_boost') {
        activeUpgrades.push({
          id: choice.id,
          name: choice.name,
          rarity: choice.rarity,
          synergyTags: choice.synergyTags
        });
      }

      closeUpgradeDraft();
      updateActiveBar();
    });

    upgradeOptions.appendChild(btn);
  });
}

function openUpgradeDraft() {
  inDraft = true;
  upgradeScreen.classList.remove('hidden');
  renderUpgradeChoices(getDraftChoices(3));
  showMessage(`Draft ${draftCount + 1}! Choose an upgrade.`, 1200, true);
}

function closeUpgradeDraft() {
  upgradeScreen.classList.add('hidden');
  const interval = getDraftInterval(draftCount);
  draftCount++;
  nextDraftMilestone += interval;
  inDraft = false;
}

function startGame() {
  score = 0;
  lives = 3;
  streak = 0;
  points = 0;
  speedIncreaseCounter = 0;
  bonus2x = false;
  bonus3x = false;
  running = true;
  lastSpawn = 0;
  spawnDelay = 650;

  const difficultyMultipliers = {
    easy: 0.5,
    normal: 1,
    hard: 1.15
  };
  speedMultiplier = difficultyMultipliers[selectedDifficulty];

  resetRunState();
  clearDrops();
  updateHud();

  startScreen.classList.add('hidden');
  difficultyScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  upgradeScreen.classList.add('hidden');
  charityFooter.classList.add('hidden');
  resetBtn.classList.remove('hidden');

  showMessage('Catch the clean water!', 1200);
  updateActiveBar();

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function endGame(isWin = false) {
  running = false;
  inDraft = false;
  cancelAnimationFrame(animationId);
  finalScoreEl.textContent = score;

  const panelText = gameOverScreen.querySelector('.panel-text');
  panelText.textContent = isWin ? 'YOU WIN!!' : 'Game Over!';

  gameOverScreen.classList.remove('hidden');
  charityFooter.classList.remove('hidden');
  showMessage(isWin ? 'Great job! You won!' : 'The well ran dry...');

  resetBtn.classList.add('hidden');
  setButtonCooldown(restartBtn, 500);

  if (isWin) launchConfetti();
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
updateActiveBar();
updateFrenzyMeter();