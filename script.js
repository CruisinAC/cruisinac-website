const VALID_VIEWS = ['start', 'level-select', 'leaderboard', 'credits'];
const MUTE_KEY = 'cruisinAcMuted';

// Where the results API (cruisinac-api) lives. The local API for now; change
// this when the API is published.
const API_BASE_URL = 'http://localhost:8000';
const LEADERBOARD_LIMIT = 50;
const LEADERBOARD_REFRESH_MS = 30000;
const SERVER_STATUS_REFRESH_MS = 15000;

// `track` must match the "Track" the plugin records for that level's server:
// TRACK-CONFIG_TRACK from its server_cfg.ini.
const LEVELS = [
  { number: 1, name: 'Myogi Downhill', short: 'Myogi', track: 'ek_myogi-downhill_idas' },
  { number: 2, name: 'Momiji Line Downhill', short: 'Momiji', track: 'ek_momiji-downhill_idas' },
  { number: 3, name: 'Tsukuba Fruits Line Outbound', short: 'Tsukuba', track: 'ek_tsukuba_fruits_line-outbound_idas' },
  { number: 4, name: 'Mt Akina Downhill', short: 'Akina', track: 'ek_akina-downhill_idas' },
  { number: 5, name: 'Tsubaki Line Downhill', short: 'Tsubaki', track: 'ek_tsubaki_line-downhill_idas' },
  { number: 6, name: 'Irohazaka Downhill', short: 'Irohazaka', track: 'ek_irohazaka-downhill_idas' },
];
// Level shown when the leaderboard opens: the only one running the plugin so far.
const DEFAULT_LEADERBOARD_LEVEL = 6;

window.addEventListener('load', () => {
  const intro = document.getElementById('intro');
  const bgMusic = document.getElementById('bgMusic');
  const muteToggle = document.getElementById('muteToggle');
  const muteIcon = muteToggle ? muteToggle.querySelector('.mute-toggle__icon') : null;
  const views = document.querySelectorAll('.view');
  const startGate = document.getElementById('startGate');
  const startGatePrompt = document.getElementById('startGatePrompt');
  const levelCards = document.querySelectorAll('.level-card');
  const leaderboardTabs = document.getElementById('leaderboardTabs');
  const leaderboardLevelName = document.getElementById('leaderboardLevelName');
  const leaderboardMessage = document.getElementById('leaderboardMessage');
  const leaderboardTable = document.getElementById('leaderboardTable');
  const leaderboardBody = document.getElementById('leaderboardBody');
  const leaderboardUpdated = document.getElementById('leaderboardUpdated');

  let dismissed = false;
  let justCompletedIntro = false;
  let startGateStamped = false;
  let startGateMenuShown = false;

  const tryPlayBgMusic = () => {
    if (!bgMusic) return;
    try {
      const p = bgMusic.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch { /* ignore */ }
  };

  const isMuted = () => window.sessionStorage.getItem(MUTE_KEY) === '1';

  const applyMuteState = (muted) => {
    if (bgMusic) bgMusic.muted = muted;
    if (muteToggle) {
      muteToggle.classList.toggle('is-muted', muted);
      muteToggle.setAttribute('aria-pressed', muted ? 'true' : 'false');
      muteToggle.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
    }
    if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊';
  };

  applyMuteState(isMuted());

  if (muteToggle) {
    muteToggle.addEventListener('click', () => {
      const next = !isMuted();
      window.sessionStorage.setItem(MUTE_KEY, next ? '1' : '0');
      applyMuteState(next);
      if (!next) tryPlayBgMusic();
    });
  }

  const handleStartView = () => {
    if (!startGate) return;
    if (startGateMenuShown) return;

    if (justCompletedIntro && !startGateStamped) {
      startGateStamped = true;
      window.setTimeout(() => startGate.classList.add('start-gate--stamp'), 80);
      window.setTimeout(() => {
        startGate.classList.add('start-gate--ready');
        if (startGatePrompt) startGatePrompt.classList.add('is-visible');
      }, 1220);
    } else {
      startGate.classList.add('start-gate--instant', 'start-gate--menu');
      startGateMenuShown = true;
    }
  };

  // ---- Leaderboard ----

  let leaderboardLevel = LEVELS.find((l) => l.number === DEFAULT_LEADERBOARD_LEVEL) || LEVELS[0];
  let leaderboardTimer = null;
  let leaderboardRequest = 0;

  const twoDigits = (n) => String(n).padStart(2, '0');

  const formatScore = (score) => Number(score).toLocaleString('en-US');

  // 322.61047 -> "5:22.610"
  const formatTime = (seconds) => {
    const totalMs = Math.round(seconds * 1000);
    const minutes = Math.floor(totalMs / 60000);
    const rest = (totalMs % 60000) / 1000;
    return `${minutes}:${rest.toFixed(3).padStart(6, '0')}`;
  };

  // "ks_toyota_ae86_tuned" -> "toyota ae86 tuned" (shown uppercase by CSS)
  const formatCar = (car) => car.replace(/^ks_/, '').replace(/_/g, ' ');

  const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const setLeaderboardMessage = (text) => {
    leaderboardMessage.textContent = text;
    leaderboardMessage.hidden = !text;
  };

  const renderLeaderboard = (entries) => {
    const columns = [
      { className: 'leaderboard__rank', value: (e) => twoDigits(e.rank) },
      { className: 'leaderboard__name', value: (e) => e.name },
      { className: 'leaderboard__car', value: (e) => formatCar(e.car) },
      { className: 'num leaderboard__score', value: (e) => formatScore(e.score) },
      { className: 'num', value: (e) => formatTime(e.total_time_seconds) },
      { className: 'leaderboard__date', value: (e) => formatDate(e.timestamp_utc) },
    ];

    // textContent only: names come from players and must never be treated as HTML.
    leaderboardBody.replaceChildren(...entries.map((entry) => {
      const row = document.createElement('tr');
      columns.forEach((column) => {
        const cell = document.createElement('td');
        cell.className = column.className;
        cell.textContent = column.value(entry);
        row.append(cell);
      });
      return row;
    }));

    leaderboardTable.hidden = entries.length === 0;
    setLeaderboardMessage(entries.length === 0 ? 'No finished runs on this level yet.' : '');
  };

  const loadLeaderboard = async () => {
    const requestId = ++leaderboardRequest;
    if (leaderboardTable.hidden) setLeaderboardMessage('Loading...');

    const url = `${API_BASE_URL}/leaderboard?track=${encodeURIComponent(leaderboardLevel.track)}&limit=${LEADERBOARD_LIMIT}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entries = await response.json();
      if (requestId !== leaderboardRequest) return; // a newer request replaced this one
      renderLeaderboard(entries);
      leaderboardUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch {
      if (requestId !== leaderboardRequest) return;
      leaderboardTable.hidden = true;
      setLeaderboardMessage('Leaderboard offline. Could not reach the results server.');
      leaderboardUpdated.textContent = '';
    }
  };

  const renderLeaderboardTabs = () => {
    leaderboardTabs.replaceChildren(...LEVELS.map((level) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'leaderboard-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', level === leaderboardLevel ? 'true' : 'false');
      tab.setAttribute('aria-label', `Level ${level.number} ${level.name}`);

      const number = document.createElement('span');
      number.className = 'leaderboard-tab__number';
      number.textContent = twoDigits(level.number);
      const label = document.createElement('span');
      label.textContent = level.short;
      tab.append(number, label);

      tab.addEventListener('click', () => selectLeaderboardLevel(level));
      return tab;
    }));
    leaderboardLevelName.textContent = `Level ${twoDigits(leaderboardLevel.number)} - ${leaderboardLevel.name}`;
  };

  const selectLeaderboardLevel = (level) => {
    if (level === leaderboardLevel) return;
    leaderboardLevel = level;
    leaderboardTable.hidden = true;
    leaderboardBody.replaceChildren();
    leaderboardUpdated.textContent = '';
    renderLeaderboardTabs();
    loadLeaderboard();
  };

  const startLeaderboard = () => {
    renderLeaderboardTabs();
    loadLeaderboard();
    if (leaderboardTimer === null) {
      leaderboardTimer = window.setInterval(() => {
        if (!document.hidden) loadLeaderboard();
      }, LEADERBOARD_REFRESH_MS);
    }
  };

  const stopLeaderboard = () => {
    if (leaderboardTimer === null) return;
    window.clearInterval(leaderboardTimer);
    leaderboardTimer = null;
  };

  // ---- Server status (Level Select) ----

  let serverStatusTimer = null;
  let serverStatusRequest = 0;

  // A card's level number comes from its rank badge ("01" -> 1).
  const cardLevel = (card) => Number.parseInt(card.querySelector('.level-card__rank').textContent, 10);

  // Online cards link to Content Manager; offline ones have no href, so they cannot be clicked.
  const setCardStatus = (card, state, text, server) => {
    const badge = card.querySelector('.status');
    badge.className = `status status--${state}`;
    badge.textContent = text;

    const online = state === 'live';
    const label = `Level ${cardLevel(card)} ${card.querySelector('h3').textContent}`;
    card.classList.toggle('level-card--live', online);
    card.classList.toggle('level-card--featured', online);
    if (online) {
      card.href = server.join_url;
      card.dataset.fallbackUrl = server.fallback_url;
      card.setAttribute('aria-label', `Join ${label}`);
      card.removeAttribute('aria-disabled');
    } else {
      card.removeAttribute('href');
      delete card.dataset.fallbackUrl;
      card.setAttribute('aria-label', `${label}, ${text.toLowerCase()}`);
      card.setAttribute('aria-disabled', 'true');
    }
  };

  const loadServerStatus = async () => {
    const requestId = ++serverStatusRequest;
    try {
      const response = await fetch(`${API_BASE_URL}/servers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const servers = await response.json();
      if (requestId !== serverStatusRequest) return;

      const byLevel = new Map(servers.map((server) => [server.level, server]));
      levelCards.forEach((card) => {
        const server = byLevel.get(cardLevel(card));
        if (server && server.online) {
          const drivers = server.max_clients ? ` · ${server.clients}/${server.max_clients}` : '';
          setCardStatus(card, 'live', `Online${drivers}`, server);
        } else {
          setCardStatus(card, 'offline', 'Offline');
        }
      });
    } catch {
      if (requestId !== serverStatusRequest) return;
      levelCards.forEach((card) => setCardStatus(card, 'unknown', 'Status unavailable'));
    }
  };

  const startServerStatus = () => {
    loadServerStatus();
    if (serverStatusTimer === null) {
      serverStatusTimer = window.setInterval(() => {
        if (!document.hidden) loadServerStatus();
      }, SERVER_STATUS_REFRESH_MS);
    }
  };

  const stopServerStatus = () => {
    if (serverStatusTimer === null) return;
    window.clearInterval(serverStatusTimer);
    serverStatusTimer = null;
  };

  const showView = (name) => {
    const target = VALID_VIEWS.includes(name) ? name : 'start';
    views.forEach((v) => {
      v.hidden = v.dataset.view !== target;
    });
    if (target === 'start') handleStartView();
    if (target === 'leaderboard') startLeaderboard();
    else stopLeaderboard();
    if (target === 'level-select') startServerStatus();
    else stopServerStatus();
  };

  const revealStartMenu = () => {
    if (!startGate || startGateMenuShown) return;
    startGateMenuShown = true;
    startGate.classList.add('start-gate--menu');
  };

  const goToView = (name) => {
    const target = VALID_VIEWS.includes(name) ? name : 'start';
    const hash = '#' + target;
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      showView(target);
    }
  };

  document.querySelectorAll('[data-view-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      goToView(link.dataset.viewLink);
    });
  });

  window.addEventListener('hashchange', () => {
    const name = (window.location.hash || '').replace('#', '') || 'start';
    showView(name);
  });

  const dismissIntro = () => {
    if (dismissed || !intro) return;
    dismissed = true;
    intro.classList.add('is-hidden');
    tryPlayBgMusic();
    window.setTimeout(() => {
      intro.hidden = true;
      justCompletedIntro = true;
      goToView('start');
      window.setTimeout(() => { justCompletedIntro = false; }, 50);
    }, 420);
  };

  const setPhase = (phase) => {
    if (dismissed || !intro) return;
    intro.classList.add(`intro--${phase}`);
  };

  const initialHash = (window.location.hash || '').replace('#', '');
  if (initialHash) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  const skipIntro = false;

  if (skipIntro) {
    dismissed = true;
    if (intro) {
      intro.hidden = true;
      intro.classList.add('is-hidden');
    }
    showView(initialHash);
    if (!isMuted()) tryPlayBgMusic();
  } else {
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      if (!dismissed) {
        event.preventDefault();
        dismissIntro();
      }
    });

    window.setTimeout(() => setPhase('sun'), 80);
    window.setTimeout(() => setPhase('ac'), 1850);
    window.setTimeout(() => setPhase('cruisin'), 3000);
    window.setTimeout(() => tryPlayBgMusic(), 4300);
    window.setTimeout(() => {
      if (dismissed || !intro) return;
      intro.classList.add('intro--ready');
      window.setTimeout(() => dismissIntro(), 2000);
    }, 4300);
  }

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (!dismissed) return;
    const startView = document.getElementById('viewStart');
    if (!startView || startView.hidden) return;
    const currentView = (window.location.hash || '').replace('#', '') || 'start';
    if (currentView !== 'start') return;
    if (!startGateMenuShown && startGate) {
      event.preventDefault();
      startGate.classList.add('start-gate--ready');
      revealStartMenu();
    }
  });

  const kickstart = () => {
    if (!bgMusic || isMuted()) return;
    if (bgMusic.paused) tryPlayBgMusic();
    if (!bgMusic.paused) {
      window.removeEventListener('pointerdown', kickstart, true);
      window.removeEventListener('keydown', kickstart, true);
    }
  };
  window.addEventListener('pointerdown', kickstart, true);
  window.addEventListener('keydown', kickstart, true);

  // Resume music when returning to the tab (e.g. after CM launches)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (isMuted()) return;
    if (bgMusic && bgMusic.paused) tryPlayBgMusic();
  });

  // Joining hands off to Content Manager, so pause the music. Offline cards have no href.
  levelCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (card.hasAttribute('href') && bgMusic) bgMusic.pause();
    });
  });
});
