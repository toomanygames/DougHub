const coinEl = document.getElementById('coins');
const perTapStat = document.getElementById('perTapStat');
const tapText = document.getElementById('tapText');
const storeEl = document.getElementById('store');
const achievementsEl = document.getElementById('achievements');
const pigEl = document.getElementById('pig');
const homeBtn = document.getElementById('homeBtn');
const feverFill = document.getElementById('feverFill');
const feverStat = document.getElementById('feverStat');
const feverLabel = document.getElementById('feverLabel');
const autoStat = document.getElementById('autoStat');
const rebirthStat = document.getElementById('rebirthStat');
const rebirthButton = document.getElementById('rebirthButton');

const SPACE_UNLOCK_COST = 1e34;

const formatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});

const saveKey = 'pig-clicker-save-v1';

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;

    if (Ctx) {
      audioCtx = new Ctx();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, duration, type, gainValue = 0.04, delay = 0) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.value = 0.0001;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime + delay;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    gainValue,
    now + 0.02
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration
  );

  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function playClickSfx() {
  ensureAudio();

  playTone(220, 0.08, 'square', 0.03);
  playTone(330, 0.06, 'triangle', 0.02, 0.04);
}

function playBuySfx() {
  ensureAudio();

  playTone(988, 0.07, 'square', 0.04);
  playTone(1319, 0.09, 'square', 0.035, 0.05);
  playTone(1760, 0.1, 'triangle', 0.03, 0.1);
}

function playOinkSfx() {
  ensureAudio();

  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';

  gain.gain.value = 0.0001;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.start(now);
  osc.stop(now + 0.25);
}

function playRewardSfx() {
  ensureAudio();

  playTone(520, 0.12, 'triangle', 0.07);
  playTone(780, 0.18, 'triangle', 0.06, 0.08);
  playTone(1040, 0.2, 'square', 0.04, 0.16);
}

const defaultState = {
  coins: 0,
  totalCoins: 0,
  perTap: 1,
  pigs: 0,
  autoPerSecond: 0,
  feverMeter: 0,
  feverActive: false,
  feverTimer: 0,
  playTimeSeconds: 0,
  rebirths: 0,
  storeComplete: false,
  achievements: {},
  readyAchievements: {},

  upgrades: [
    {
      id: 'piglet',
      name: 'Piglet',
      icon: '🐷',
      cost: 15,
      unlockAt: 1,
      value: 1,
      type: 'tap',
      owned: 0
    },

    {
      id: 'snout',
      name: 'Snout',
      icon: '🐽',
      cost: 100,
      unlockAt: 10,
      value: 5,
      type: 'tap',
      owned: 0
    },

    {
      id: 'pigAuto1',
      name: 'Auto Pig',
      icon: '🤖',
      cost: 120,
      unlockAt: 25,
      value: 2,
      type: 'auto',
      owned: 0
    },

    {
      id: 'sty',
      name: 'Pig Sty',
      icon: '🏠',
      cost: 800,
      unlockAt: 35,
      value: 35,
      type: 'tap',
      owned: 0
    },

    {
      id: 'slop',
      name: 'Slop Bot',
      icon: '🛢️',
      cost: 5000,
      unlockAt: 100,
      value: 25,
      type: 'auto',
      owned: 0
    },

    {
      id: 'gold',
      name: 'Golden Pig',
      icon: '🥇',
      cost: 25000,
      unlockAt: 200,
      value: 1200,
      type: 'tap',
      owned: 0
    },

    {
      id: 'farm',
      name: 'Mega Auto Farm',
      icon: '🏭',
      cost: 150000,
      unlockAt: 400,
      value: 7000,
      type: 'auto',
      owned: 0
    },

    {
      id: 'bank',
      name: 'Pig Bank',
      icon: '🏦',
      cost: 900000,
      unlockAt: 800,
      value: 45000,
      type: 'tap',
      owned: 0
    },

    {
      id: 'rocket',
      name: 'Rocket Auto Pig',
      icon: '🚀',
      cost: 6000000,
      unlockAt: 1500,
      value: 280000,
      type: 'auto',
      owned: 0
    },

    {
      id: 'space',
      name: 'Space Pig',
      icon: '🪐',
      cost: 45000000,
      unlockAt: 3000,
      value: 1600000,
      type: 'tap',
      owned: 0
    },

    {
      id: 'moon',
      name: 'Moon Auto Pig',
      icon: '🌙',
      cost: 300000000,
      unlockAt: 7000,
      value: 10000000,
      type: 'auto',
      owned: 0
    },

    {
      id: 'queen',
      name: 'Queen Pig',
      icon: '👑',
      cost: 2000000000,
      unlockAt: 15000,
      value: 75000000,
      type: 'tap',
      owned: 0
    },

    {
      id: 'galaxy',
      name: 'Galaxy Auto Pig',
      icon: '🌌',
      cost: 15000000000,
      unlockAt: 35000,
      value: 500000000,
      type: 'auto',
      owned: 0
    },

    {
      id: 'cluster',
      name: 'Cluster Pig',
      icon: '✨',
      cost: 100e9,
      costLabel: '100 billion',
      unlockAt: 100e9,
      value: 4e9,
      type: 'tap',
      owned: 0
    },

    {
      id: 'nebula',
      name: 'Nebula Auto Pig',
      icon: '☁️',
      cost: 1e12,
      costLabel: '1 trillion',
      unlockAt: 1e12,
      value: 30e9,
      type: 'auto',
      owned: 0
    },

    {
      id: 'supernova',
      name: 'Supernova Pig',
      icon: '💥',
      cost: 10e12,
      costLabel: '10 trillion',
      unlockAt: 10e12,
      value: 250e9,
      type: 'tap',
      owned: 0
    },

    {
      id: 'blackHole',
      name: 'Black Hole Auto Pig',
      icon: '🕳️',
      cost: 100e12,
      costLabel: '100 trillion',
      unlockAt: 100e12,
      value: 2e12,
      type: 'auto',
      owned: 0
    },

    {
      id: 'universe',
      name: 'Universe Pig',
      icon: '🌍',
      cost: 1e15,
      costLabel: '1 quadrillion',
      unlockAt: 1e15,
      value: 15e12,
      type: 'tap',
      owned: 0
    },

    {
      id: 'quad10',
      name: 'Ten Quadrillion Auto Pig',
      icon: '🛸',
      cost: 10e15,
      costLabel: '10 quadrillion',
      unlockAt: 10e15,
      value: 120e12,
      type: 'auto',
      owned: 0
    },

    {
      id: 'quad100',
      name: 'Hundred Quadrillion Pig',
      icon: '🌎',
      cost: 100e15,
      costLabel: '100 quadrillion',
      unlockAt: 100e15,
      value: 1e15,
      type: 'tap',
      owned: 0
    },

    {
      id: 'multiverse',
      name: 'Multiverse Auto Pig',
      icon: '🌀',
      cost: 1e18,
      costLabel: '1 quintillion',
      unlockAt: 1e18,
      value: 1e15,
      type: 'auto',
      owned: 0
    },

    {
      id: 'quint10',
      name: 'Ten Quintillion Pig',
      icon: '🌐',
      cost: 10e18,
      costLabel: '10 quintillion',
      unlockAt: 10e18,
      value: 8e15,
      type: 'tap',
      owned: 0
    },

    {
      id: 'quint100',
      name: 'Hundred Quintillion Auto Pig',
      icon: '🤖',
      cost: 100e18,
      costLabel: '100 quintillion',
      unlockAt: 100e18,
      value: 70e15,
      type: 'auto',
      owned: 0
    },

    {
      id: 'dimension',
      name: 'Dimension Pig',
      icon: '🔮',
      cost: 1e21,
      costLabel: '1 sextillion',
      unlockAt: 1e21,
      value: 1e18,
      type: 'tap',
      owned: 0
    },

    {
      id: 'sext10',
      name: 'Ten Sextillion Auto Pig',
      icon: '⚙️',
      cost: 10e21,
      costLabel: '10 sextillion',
      unlockAt: 10e21,
      value: 8e18,
      type: 'auto',
      owned: 0
    },

    {
      id: 'sext100',
      name: 'Hundred Sextillion Pig',
      icon: '🧿',
      cost: 100e21,
      costLabel: '100 sextillion',
      unlockAt: 100e21,
      value: 70e18,
      type: 'tap',
      owned: 0
    },

    {
      id: 'eternity',
      name: 'Eternity Auto Pig',
      icon: '♾️',
      cost: 1e24,
      costLabel: '1 septillion',
      unlockAt: 1e24,
      value: 1e21,
      type: 'auto',
      owned: 0
    },

    {
      id: 'sept10',
      name: 'Ten Septillion Pig',
      icon: '⏳',
      cost: 10e24,
      costLabel: '10 septillion',
      unlockAt: 10e24,
      value: 8e21,
      type: 'tap',
      owned: 0
    },

    {
      id: 'sept100',
      name: 'Hundred Septillion Auto Pig',
      icon: '⏱️',
      cost: 100e24,
      costLabel: '100 septillion',
      unlockAt: 100e24,
      value: 70e21,
      type: 'auto',
      owned: 0
    },

    {
      id: 'octillion',
      name: 'Octillion Pig',
      icon: '🌠',
      cost: 1e27,
      costLabel: '1 octillion',
      unlockAt: 1e27,
      value: 1e24,
      type: 'tap',
      owned: 0
    },

    {
      id: 'oct10',
      name: 'Ten Octillion Auto Pig',
      icon: '🛰️',
      cost: 10e27,
      costLabel: '10 octillion',
      unlockAt: 10e27,
      value: 8e24,
      type: 'auto',
      owned: 0
    },

    {
      id: 'oct100',
      name: 'Hundred Octillion Pig',
      icon: '🌟',
      cost: 100e27,
      costLabel: '100 octillion',
      unlockAt: 100e27,
      value: 70e24,
      type: 'tap',
      owned: 0
    },

    {
      id: 'nonillion10',
      name: 'Ten Nonillion Auto Pig',
      icon: '💫',
      cost: 10e30,
      costLabel: '10 nonillion',
      unlockAt: 10e30,
      value: 1e28,
      type: 'auto',
      owned: 0
    },

    {
      id: 'nonillion100',
      name: 'Hundred Nonillion Pig',
      icon: '⭐',
      cost: 100e30,
      costLabel: '100 nonillion',
      unlockAt: 100e30,
      value: 1e29,
      type: 'tap',
      owned: 0
    },

    {
      id: 'quint',
      name: 'Nonillion Auto Pig',
      icon: '🐖',
      cost: 999e30,
      costLabel: '999 nonillion',
      unlockAt: 999e30,
      value: 1e30,
      type: 'auto',
      owned: 0
    }
  ],

  achievementDefs: [
    {
      id: 'firstTap',
      name: 'First Pig',
      goal: 1,
      reward: 25,
      description: 'Earn 1 coin',
      metric: 'totalCoins'
    },

    {
      id: 'pigFarm',
      name: 'Pig Farmer',
      goal: 100,
      reward: 200,
      description: 'Reach 100 coins',
      metric: 'totalCoins'
    },

    {
      id: 'tapBoost',
      name: 'Tap Boss',
      goal: 25,
      reward: 500,
      description: 'Reach 25 per tap'
    },

    {
      id: 'autoCrew',
      name: 'Auto Crew',
      goal: 5,
      reward: 1200,
      description: 'Buy 5 auto pigs'
    },

    {
      id: 'feverTime',
      name: 'Fever Time',
      goal: 1,
      reward: 2500,
      description: 'Trigger fever'
    },

    {
      id: 'superPig',
      name: 'Super Pig',
      goal: 1e6,
      reward: 1e7,
      description: 'Reach 1 million total coins',
      metric: 'totalCoins'
    },

    {
      id: 'billionBoar',
      name: 'Billion Boar',
      goal: 1e9,
      reward: 1e10,
      description: 'Reach 1 billion total coins',
      metric: 'totalCoins'
    },

    {
      id: 'trillionTrotter',
      name: 'Trillion Trotter',
      goal: 1e12,
      reward: 1e13,
      description: 'Reach 1 trillion total coins',
      metric: 'totalCoins'
    },

    {
      id: 'quadrillionQueen',
      name: 'Quadrillion Queen',
      goal: 1e15,
      reward: 1e16,
      description: 'Reach 1 quadrillion total coins',
      metric: 'totalCoins'
    },

    {
      id: 'quintillionKing',
      name: 'Quintillion King',
      goal: 1e18,
      reward: 1e19,
      description: 'Reach 1 quintillion total coins',
      metric: 'totalCoins'
    },

    {
      id: 'sextillionSnout',
      name: 'Sextillion Snout',
      goal: 1e21,
      reward: 1e22,
      description: 'Reach 1 sextillion total coins',
      metric: 'totalCoins'
    },

    {
      id: 'septillionSty',
      name: 'Septillion Sty',
      goal: 1e24,
      reward: 1e25,
      description: 'Reach 1 septillion total coins',
      metric: 'totalCoins'
    },

    {
      id: 'octillionOinker',
      name: 'Octillion Oinker',
      goal: 1e27,
      reward: 1e28,
      description: 'Reach 1 octillion total coins',
      metric: 'totalCoins'
    },

    {
      id: 'nonillionLegend',
      name: 'Nonillion Legend',
      goal: 1e30,
      reward: 1e29,
      description: 'Reach 1 nonillion total coins',
      metric: 'totalCoins'
    }
  ]
};

let state = JSON.parse(JSON.stringify(defaultState));
let lastStatsSave = 0;

function loadState() {
  const raw = localStorage.getItem(saveKey);

  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    state = {
      ...JSON.parse(JSON.stringify(defaultState)),
      ...parsed
    };

    state.upgrades = defaultState.upgrades.map((base) => {
      const saved = (parsed.upgrades || []).find(
        (u) => u.id === base.id
      );

      return {
        ...base,
        owned: saved?.owned ?? base.owned
      };
    });

    state.achievementDefs = defaultState.achievementDefs;
    state.achievements = parsed.achievements || {};
    state.readyAchievements = parsed.readyAchievements || {};

  } catch (e) {
    console.log('Save failed to load');
  }
}

function saveState() {
  state.storeComplete = state.upgrades.every(
    (upg) => upg.owned > 0
  );

  localStorage.setItem(
    saveKey,
    JSON.stringify(state)
  );

  lastStatsSave = performance.now();
}

function formatNumber(num) {
  if (!Number.isFinite(num)) return '∞';

  const scales = [
    [1e30, 'nonillion'],
    [1e27, 'octillion'],
    [1e24, 'septillion'],
    [1e21, 'sextillion'],
    [1e18, 'quintillion'],
    [1e15, 'quadrillion'],
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million']
  ];

  const scale = scales.find(([value]) => num >= value);

  if (scale) {
    return (
      Math.floor((num / scale[0]) * 10) / 10
    ).toFixed(1) + ' ' + scale[1];
  }

  return formatter.format(Math.floor(num));
}

function isUnlocked(upg) {
  return state.totalCoins >= upg.unlockAt;
}

function getUpgradeCost(upg) {
  return Math.ceil(
    upg.cost * Math.pow(1.2, upg.owned)
  );
}

function getMultiplier() {
  return state.feverActive ? 2 : 1;
}

function getRebirthMultiplier() {
  return 1 + (state.rebirths || 0) * 0.5;
}

function refreshHud() {
  coinEl.textContent =
    formatNumber(state.coins) + ' coins';

  tapText.textContent =
    '+' +
    formatNumber(
      state.perTap * getMultiplier()
    ) +
    ' per tap';

  perTapStat.textContent =
    formatNumber(state.perTap);

  autoStat.textContent =
    formatNumber(state.autoPerSecond) + '/s';

  feverStat.textContent =
    Math.min(
      100,
      Math.round(state.feverMeter)
    ) + '%';

  feverFill.style.width =
    Math.min(
      100,
      Math.max(0, state.feverMeter)
    ) + '%';

  feverLabel.textContent =
    state.feverActive
      ? 'Fever time!'
      : (
          state.feverMeter >= 100
            ? 'Fever ready'
            : 'Build fever'
        );

  rebirthStat.textContent =
    formatNumber(state.rebirths || 0);

  updateRebirthButton();
}

function updateRebirthButton() {
  if (!rebirthButton) return;

  const unlocked =
    state.coins >= SPACE_UNLOCK_COST;

  rebirthButton.disabled = !unlocked;

  if (unlocked) {
    rebirthButton.textContent =
      '🚀 Enter Pig Clicker Space';

    rebirthButton.style.background =
      'linear-gradient(180deg,#a855f7,#6366f1)';
  } else {
    rebirthButton.textContent =
      '🔒 Reach 10,000 nonillion coins';

    rebirthButton.style.background =
      'linear-gradient(180deg,#6b7280,#4b5563)';
  }
}

if (rebirthButton) {
  rebirthButton.addEventListener('click', () => {
    if (state.coins < SPACE_UNLOCK_COST) return;

    saveState();

    window.location.href =
      'pig-clicker-space.html';
  });
}

function claimAchievement(id) {
  if (
    !state.readyAchievements[id] ||
    state.achievements[id]
  ) {
    return;
  }

  const def =
    state.achievementDefs.find(
      (a) => a.id === id
    );

  if (!def) return;

  state.achievements[id] = true;

  delete state.readyAchievements[id];

  state.coins += def.reward;

  playRewardSfx();

  refreshHud();
  checkAchievements();
  renderAchievements();
  saveState();
}

function isAchievementReady(ach) {
  if (ach.metric === 'totalCoins') {
    return state.totalCoins >= ach.goal;
  }

  if (ach.id === 'tapBoost') {
    return state.perTap >= ach.goal;
  }

  if (ach.id === 'autoCrew') {
    return state.upgrades
      .filter((upg) => upg.type === 'auto')
      .reduce(
        (sum, upg) => sum + upg.owned,
        0
      ) >= ach.goal;
  }

  return (
    ach.id === 'feverTime' &&
    state.feverActive
  );
}

function checkAchievements() {
  let hasNewReadyAchievement = false;

  state.achievementDefs.forEach((ach) => {
    if (
      !state.achievements[ach.id] &&
      !state.readyAchievements[ach.id] &&
      isAchievementReady(ach)
    ) {
      state.readyAchievements[ach.id] = true;
      hasNewReadyAchievement = true;
    }
  });

  if (hasNewReadyAchievement) {
    renderAchievements();
  }
}

function addCoins(n) {
  state.coins += n;
  state.totalCoins += n;

  refreshHud();
  checkAchievements();

  if (
    performance.now() - lastStoreRender >=
    STORE_REFRESH_INTERVAL
  ) {
    renderStore();
  }
}

const FEVER_DURATION = 8;
const FEVER_CHARGE_PER_CLICK = 10;
const FEVER_DECAY_PER_SECOND = 8;

const STORE_REFRESH_INTERVAL = 300;
const SAVE_INTERVAL = 4000;

let lastStoreRender = 0;

function addFever(amount) {
  if (state.feverActive) return;

  state.feverMeter += amount;

  if (state.feverMeter >= 100) {
    state.feverMeter = 100;
    state.feverActive = true;
    state.feverTimer = FEVER_DURATION;

    playRewardSfx();
  }

  refreshHud();
}

function updateFever(dt) {
  if (state.feverActive) {
    state.feverTimer -= dt;

    state.feverMeter =
      Math.max(
        0,
        Math.min(
          100,
          (state.feverTimer / FEVER_DURATION) * 100
        )
      );

    if (state.feverTimer <= 0) {
      state.feverActive = false;
      state.feverTimer = 0;
      state.feverMeter = 0;
    }
  } else {
    state.feverMeter =
      Math.max(
        0,
        state.feverMeter -
        dt * FEVER_DECAY_PER_SECOND
      );
  }
}

function rebirth() {
  if (
    !state.upgrades.every(
      (upg) => upg.owned > 0
    )
  ) {
    return;
  }

  state.rebirths =
    (state.rebirths || 0) + 1;

  state.coins = 0;
  state.perTap = 1;
  state.pigs = 0;
  state.autoPerSecond = 0;

  state.feverMeter = 0;
  state.feverActive = false;
  state.feverTimer = 0;

  state.upgrades.forEach((upg) => {
    upg.owned = 0;
  });

  playRewardSfx();

  refreshHud();
  renderStore();
  renderAchievements();
  saveState();
}

function buyUpgrade(upg) {
  const cost = getUpgradeCost(upg);

  if (
    !isUnlocked(upg) ||
    state.coins < cost
  ) {
    return;
  }

  state.coins -= cost;

  upg.owned += 1;

  if (upg.type === 'tap') {
    state.perTap += upg.value;
  } else if (upg.type === 'auto') {
    state.autoPerSecond += upg.value;
  }

  state.pigs += 1;

  playBuySfx();

  refreshHud();
  renderStore();
  checkAchievements();
  saveState();
}

function renderStore() {
  lastStoreRender = performance.now();

  storeEl.innerHTML = '';

  state.upgrades.forEach((upg) => {
    const unlocked = isUnlocked(upg);

    const row = document.createElement('div');

    row.className =
      'upg' +
      (unlocked ? '' : ' locked');

    const left =
      document.createElement('div');

    left.className = 'upg-info';

    const bonus =
      upg.type === 'auto'
        ? '+' +
          formatNumber(upg.value) +
          ' pigs/s'
        : '+' +
          formatNumber(upg.value) +
          ' click';

    const currentCost =
      getUpgradeCost(upg);

    const cost =
      upg.costLabel &&
      upg.owned === 0
        ? upg.costLabel
        : formatNumber(currentCost);

    const availability =
      unlocked
        ? 'Cost: ' + cost
        : (
            upg.costLabel
              ? 'Cost: ' +
                cost +
                ' • Unlock: ' +
                formatNumber(upg.unlockAt)
              : 'Unlock: ' +
                formatNumber(upg.unlockAt)
          );

    left.innerHTML =
      '<div class="upg-icon" aria-hidden="true">' +
      upg.icon +
      '</div>' +
      '<div class="upg-details">' +
      '<div class="upg-name">' +
      upg.name +
      '</div>' +
      '<div class="upg-cost">' +
      bonus +
      ' • ' +
      availability +
      ' • Owned: ' +
      upg.owned +
      '</div>' +
      '</div>';

    const btn =
      document.createElement('button');

    btn.className = 'upg-btn';

    btn.dataset.upgradeId =
      upg.id;

    btn.textContent =
      unlocked ? 'Buy' : 'Locked';

    btn.disabled =
      !unlocked ||
      state.coins < currentCost;

    btn.addEventListener(
      'click',
      () => buyUpgrade(upg)
    );

    row.appendChild(left);
    row.appendChild(btn);

    storeEl.appendChild(row);
  });
}

function renderAchievements() {
  achievementsEl.innerHTML = '';

  state.achievementDefs.forEach((ach) => {
    const claimed =
      !!state.achievements[ach.id];

    const ready =
      !!state.readyAchievements[ach.id];

    const row =
      document.createElement('div');

    row.className =
      'achievement' +
      (
        claimed || ready
          ? ''
          : ' locked'
      );

    const titleWrap =
      document.createElement('div');

    titleWrap.innerHTML =
      '<div class="title">' +
      ach.name +
      '</div>' +
      '<div class="reward">' +
      ach.description +
      ' • +' +
      formatNumber(ach.reward) +
      '</div>';

    const badge =
      document.createElement(
        ready && !claimed
          ? 'button'
          : 'div'
      );

    badge.className = 'badge';

    if (claimed) {
      badge.textContent = '✅';
    } else if (ready) {
      badge.className = 'upg-btn';
      badge.textContent = 'Claim';

      badge.addEventListener(
        'click',
        () => claimAchievement(ach.id)
      );
    } else {
      badge.textContent = '🔒';
    }

    row.appendChild(titleWrap);
    row.appendChild(badge);

    achievementsEl.appendChild(row);
  });
}

function makeBurst() {
  const burst =
    document.createElement('div');

  const value =
    state.perTap *
    getMultiplier() *
    getRebirthMultiplier();

  burst.className = 'burst';

  burst.textContent =
    '+' + formatNumber(value);

  burst.style.left = '50%';
  burst.style.top = '50%';

  burst.style.transform =
    'translate(-50%, -50%)';

  pigEl.appendChild(burst);

  setTimeout(
    () => burst.remove(),
    500
  );
}

pigEl.addEventListener(
  'pointerdown',
  (event) => {
    event.preventDefault();

    ensureAudio();

    const gain =
      state.perTap *
      getMultiplier() *
      getRebirthMultiplier();

    addCoins(gain);

    addFever(
      FEVER_CHARGE_PER_CLICK
    );

    playClickSfx();
    playOinkSfx();
    makeBurst();
  }
);

homeBtn.addEventListener('click', () => {
  const gamesUrl = new URL('../douggames.html', window.location.href).href;
  if (window.parent !== window) {
    window.parent.location.href = gamesUrl;
  } else {
    window.location.href = gamesUrl;
  }
});

window.addEventListener(
  'message',
  (event) => {
    if (
      event.data?.type ===
      'pig-clicker-reset'
    ) {
      state =
        JSON.parse(
          JSON.stringify(defaultState)
        );

      lastStatsSave = 0;

      saveState();
      renderStore();
      renderAchievements();
      refreshHud();

    } else if (
      event.data?.type ===
      'pig-clicker-rebirth'
    ) {
      rebirth();
    }
  }
);

function gameLoop(ts) {
  if (!gameLoop.last) {
    gameLoop.last = ts;
  }

  const dt =
    Math.min(
      0.1,
      (ts - gameLoop.last) / 1000
    );

  gameLoop.last = ts;

  state.playTimeSeconds += dt;

  if (
    ts - lastStatsSave >=
    SAVE_INTERVAL
  ) {
    saveState();
  }

  if (state.autoPerSecond > 0) {
    const autoGain =
      state.autoPerSecond *
      getMultiplier() *
      getRebirthMultiplier() *
      dt;

    addCoins(autoGain);
  }

  updateFever(dt);

  requestAnimationFrame(gameLoop);
}

window.addEventListener(
  'beforeunload',
  saveState
);

document.addEventListener(
  'visibilitychange',
  () => {
    if (
      document.visibilityState ===
      'hidden'
    ) {
      saveState();
    }
  }
);

window.addEventListener(
  'pointerdown',
  ensureAudio,
  { once: true }
);

loadState();
renderStore();
renderAchievements();
refreshHud();

requestAnimationFrame(gameLoop);