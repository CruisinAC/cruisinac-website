const VALID_VIEWS = [
  'start', 'level-select', 'leaderboard', 'credits',
  'options', 'about', 'how-to-play', 'controls', 'rules', 'downloads',
];
// Where Back / Esc goes from each view: one level up the menus.
const VIEW_PARENT = {
  'level-select': 'start',
  leaderboard: 'start',
  credits: 'start',
  options: 'start',
  about: 'options',
  'how-to-play': 'options',
  controls: 'options',
  rules: 'options',
  downloads: 'options',
};
const MUTE_KEY = 'cruisinAcMuted';
// Volume sliders in the Sound panel run 0-100. Loudness is the square of the slider
// position (25 -> 0.06), which feels even across the range, unlike a straight line.
// The player's choice is remembered in this browser (VOLUME_KEY).
const VOLUME_KEY = 'cruisinAcVolume';
const DEFAULT_MUSIC_LEVEL = 25;
const DEFAULT_SFX_LEVEL = 60;
const MUSIC_FADE_MS = 1000; // the music fades in from silence over this long
// The track is silent for its first 2.75 s (measured; music is audible from ~2.9 s), so
// playback, and every loop, starts here instead of at 0.
const MUSIC_START_SECONDS = 2.7;

// Where the results API (cruisinac-api) lives. The published API, reached through
// its Cloudflare Tunnel, except when the site itself is being served locally
// (python -m http.server), which talks to the local API as before.
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const API_BASE_URL = LOCAL_HOSTS.includes(window.location.hostname)
  ? 'http://localhost:8000'
  : 'https://api.cruisin-ac.com';
const LEADERBOARD_PAGE_SIZE = 25;
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

// The two boards the API offers (`sort=`), and how each one ranks. The rule is
// shown under the level name so what drives the numbers is always visible.
const LEADERBOARD_SORTS = {
  score: { best: 'best-scoring', rule: 'Highest score ranks first; a tied score goes to the faster time.' },
  time: { best: 'fastest', rule: 'Lowest time ranks first; a tied time goes to whoever set it first.' },
};
const DEFAULT_LEADERBOARD_SORT = 'score';

window.addEventListener('load', () => {
  const intro = document.getElementById('intro');
  const bgMusic = document.getElementById('bgMusic');
  const muteToggle = document.getElementById('muteToggle');
  const muteIcon = muteToggle ? muteToggle.querySelector('.mute-toggle__icon') : null;
  const soundPanel = document.getElementById('soundPanel');
  const musicSlider = document.getElementById('musicVolume');
  const musicSliderValue = document.getElementById('musicVolumeValue');
  const sfxSlider = document.getElementById('sfxVolume');
  const sfxSliderValue = document.getElementById('sfxVolumeValue');
  const muteAllButton = document.getElementById('soundMute');
  const views = document.querySelectorAll('.view');
  const startGate = document.getElementById('startGate');
  const levelCards = document.querySelectorAll('.level-card');
  const leaderboardTabs = document.getElementById('leaderboardTabs');
  const leaderboardLevelName = document.getElementById('leaderboardLevelName');
  const leaderboardSort = document.getElementById('leaderboardSort');
  const leaderboardCar = document.getElementById('leaderboardCar');
  const leaderboardRule = document.getElementById('leaderboardRule');
  const leaderboardMessage = document.getElementById('leaderboardMessage');
  const leaderboardTable = document.getElementById('leaderboardTable');
  const leaderboardBody = document.getElementById('leaderboardBody');
  const leaderboardUpdated = document.getElementById('leaderboardUpdated');
  const leaderboardPager = document.getElementById('leaderboardPager');
  const leaderboardPrev = document.getElementById('leaderboardPrev');
  const leaderboardNext = document.getElementById('leaderboardNext');
  const leaderboardPageStatus = document.getElementById('leaderboardPageStatus');

  let dismissed = false;
  let justCompletedIntro = false;
  let startGateStamped = false;
  let startGateMenuShown = false;
  let entered = false; // the first press on the landing screen has happened
  let musicStarted = false;

  // ---- Volume (the Sound panel behind the speaker button) ----

  const loadLevels = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(VOLUME_KEY) || '{}');
      const level = (value, fallback) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback);
      return { music: level(saved.music, DEFAULT_MUSIC_LEVEL), sfx: level(saved.sfx, DEFAULT_SFX_LEVEL) };
    } catch {
      return { music: DEFAULT_MUSIC_LEVEL, sfx: DEFAULT_SFX_LEVEL };
    }
  };

  const levels = loadLevels();
  let musicFading = false;
  const loudness = (level) => (level / 100) ** 2;
  const musicVolume = () => loudness(levels.music);

  const saveLevels = () => {
    try { window.localStorage.setItem(VOLUME_KEY, JSON.stringify(levels)); } catch { /* not saved */ }
  };

  Sfx.setVolume(loudness(levels.sfx));

  // Loop by hand rather than with the `loop` attribute, so each repeat also skips the
  // silent lead-in.
  if (bgMusic) {
    bgMusic.loop = false;
    bgMusic.addEventListener('ended', () => {
      bgMusic.currentTime = MUSIC_START_SECONDS;
      tryPlayBgMusic();
    });
  }

  // Every play path goes through here. Nothing plays before startMusic (the first press).
  const tryPlayBgMusic = () => {
    if (!bgMusic || !musicStarted) return;
    try {
      const p = bgMusic.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch { /* ignore */ }
  };

  // The music starts when the Initial DriftRun logo stamps in (handleStartView), not on the
  // Enter press, so the Cruisin AC intro has room for its own sounds. Browsers only let
  // music start from a click or key press, so the Enter press primes it: plays it silently
  // and pauses at once, which counts as permission for the later, press-less start.
  const primeMusic = () => {
    if (!bgMusic || musicStarted) return;
    bgMusic.muted = true;
    try {
      const p = bgMusic.play();
      const settle = () => {
        if (musicStarted) return; // the real start already happened (fast presses)
        bgMusic.pause();
        bgMusic.currentTime = 0;
      };
      const restoreMute = () => { bgMusic.muted = isMuted(); };
      if (p && typeof p.then === 'function') {
        p.then(settle, () => {}).finally(restoreMute);
      } else {
        settle();
        restoreMute();
      }
    } catch {
      bgMusic.muted = isMuted();
    }
  };

  // Fades in from silence to the Music slider's volume.
  const startMusic = () => {
    if (!bgMusic || musicStarted) return;
    musicStarted = true;
    bgMusic.volume = 0;
    bgMusic.muted = isMuted();
    // Jumping into the file only works once the browser knows its length (metadata).
    if (bgMusic.readyState >= 1) bgMusic.currentTime = MUSIC_START_SECONDS;
    else bgMusic.addEventListener('loadedmetadata', () => { bgMusic.currentTime = MUSIC_START_SECONDS; }, { once: true });
    tryPlayBgMusic();
    // Not the active window right now (switched away during the intro): wait for focus.
    if (document.hidden || !document.hasFocus()) bgMusic.pause();
    const began = performance.now();
    musicFading = true;
    const fade = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - began) / MUSIC_FADE_MS);
      bgMusic.volume = musicVolume() * t; // follows the slider if it moves mid-fade
      if (t >= 1) {
        window.clearInterval(fade);
        musicFading = false;
      }
    }, 50);
  };

  const isMuted = () => window.sessionStorage.getItem(MUTE_KEY) === '1';

  const applyMuteState = (muted) => {
    if (bgMusic) bgMusic.muted = muted;
    if (muteToggle) muteToggle.classList.toggle('is-muted', muted);
    if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊';
    if (muteAllButton) {
      muteAllButton.setAttribute('aria-pressed', muted ? 'true' : 'false');
      muteAllButton.textContent = muted ? 'Sound off' : 'Mute all';
    }
    if (soundPanel) soundPanel.classList.toggle('is-muted', muted);
  };

  applyMuteState(isMuted());

  const showLevel = (slider, output, level) => {
    if (slider) slider.value = String(level);
    if (output) output.textContent = String(level);
  };
  showLevel(musicSlider, musicSliderValue, levels.music);
  showLevel(sfxSlider, sfxSliderValue, levels.sfx);

  const setSoundPanelOpen = (open) => {
    if (!soundPanel || !muteToggle) return;
    soundPanel.hidden = !open;
    muteToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  const soundPanelOpen = () => Boolean(soundPanel && !soundPanel.hidden);

  if (muteToggle) {
    muteToggle.addEventListener('click', () => {
      setSoundPanelOpen(!soundPanelOpen());
      Sfx.tick();
    });
  }

  // Close the panel on a click elsewhere or Esc (Esc then does not also leave the page).
  document.addEventListener('pointerdown', (event) => {
    if (soundPanelOpen() && !event.target.closest('#soundPanel, #muteToggle')) setSoundPanelOpen(false);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !soundPanelOpen()) return;
    event.preventDefault();
    setSoundPanelOpen(false);
    if (muteToggle) muteToggle.focus();
  });

  if (musicSlider) {
    musicSlider.addEventListener('input', () => {
      levels.music = Number(musicSlider.value);
      showLevel(null, musicSliderValue, levels.music);
      if (bgMusic && !musicFading) bgMusic.volume = musicVolume();
      saveLevels();
    });
  }

  // The effects slider plays a tick as it moves, at the new volume, so you hear the level.
  let lastSliderTick = 0;
  if (sfxSlider) {
    sfxSlider.addEventListener('input', () => {
      levels.sfx = Number(sfxSlider.value);
      showLevel(null, sfxSliderValue, levels.sfx);
      Sfx.setVolume(loudness(levels.sfx));
      saveLevels();
      const now = performance.now();
      if (now - lastSliderTick > 90) {
        lastSliderTick = now;
        Sfx.move(1);
      }
    });
  }

  if (muteAllButton) {
    muteAllButton.addEventListener('click', () => {
      const next = !isMuted();
      window.sessionStorage.setItem(MUTE_KEY, next ? '1' : '0');
      applyMuteState(next);
      if (!next) {
        tryPlayBgMusic();
        Sfx.tick();
      }
    });
  }

  const handleStartView = () => {
    if (!startGate) return;
    if (startGateMenuShown) return;

    if (justCompletedIntro && !startGateStamped) {
      startGateStamped = true;
      window.setTimeout(() => {
        startGate.classList.add('start-gate--stamp');
        startMusic(); // the music arrives with the logo
      }, 80);
      window.setTimeout(revealStartMenu, 1220); // the menu follows once the logo has landed
    } else {
      startGate.classList.add('start-gate--instant', 'start-gate--menu');
      startGateMenuShown = true;
    }
  };

  // ---- Leaderboard ----

  let leaderboardLevel = LEVELS.find((l) => l.number === DEFAULT_LEADERBOARD_LEVEL) || LEVELS[0];
  let leaderboardSortKey = DEFAULT_LEADERBOARD_SORT;
  let leaderboardCarKey = ''; // a car's model folder, or '' for all cars
  let leaderboardPage = 1; // 1-based; back to 1 whenever the level, board or car changes
  let carNames = new Map(); // model folder -> display name, from GET /cars
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

  // The car's display name from GET /cars, or a tidied-up folder name until
  // that list has loaded (or if it never does).
  const carName = (car) => carNames.get(car) || formatCar(car);

  const formatDate = (timestamp) =>
    new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const setLeaderboardMessage = (text) => {
    leaderboardMessage.textContent = text;
    leaderboardMessage.hidden = !text;
  };

  // "Page 2 of 7 · 164 drivers". Hidden while the board fits on one page.
  const renderPager = (page) => {
    const drivers = `${page.total} ${page.total === 1 ? 'driver' : 'drivers'}`;
    leaderboardPageStatus.textContent = `Page ${page.page} of ${page.pages} · ${drivers}`;
    leaderboardPrev.disabled = page.page <= 1;
    leaderboardNext.disabled = page.page >= page.pages;
    leaderboardPager.hidden = page.pages <= 1;
  };

  const renderLeaderboard = (entries) => {
    const columns = [
      { className: 'leaderboard__rank', value: (e) => twoDigits(e.rank) },
      { className: 'leaderboard__name', value: (e) => e.name },
      { className: 'leaderboard__car', value: (e) => carName(e.car) },
      { className: 'num leaderboard__col-score', value: (e) => formatScore(e.score) },
      { className: 'num leaderboard__col-time', value: (e) => formatTime(e.total_time_seconds) },
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
    const nothingYet = leaderboardCarKey
      ? 'No finished runs in this car on this level yet.'
      : 'No finished runs on this level yet.';
    setLeaderboardMessage(entries.length === 0 ? nothingYet : '');
  };

  const loadLeaderboard = async () => {
    const requestId = ++leaderboardRequest;
    if (leaderboardTable.hidden) setLeaderboardMessage('Loading...');

    const url = `${API_BASE_URL}/leaderboard?track=${encodeURIComponent(leaderboardLevel.track)}`
      + `&sort=${leaderboardSortKey}&page=${leaderboardPage}&page_size=${LEADERBOARD_PAGE_SIZE}`
      + (leaderboardCarKey ? `&car=${encodeURIComponent(leaderboardCarKey)}` : '');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (requestId !== leaderboardRequest) return; // a newer request replaced this one
      // The API answers {entries, total, page, page_size, pages}. A plain list (the shape
      // before paging) is still accepted so the site and API can be updated separately.
      const page = Array.isArray(body)
        ? { entries: body, total: body.length, page: 1, page_size: body.length, pages: 1 }
        : body;
      if (page.entries.length === 0 && page.page > page.pages) {
        // The board shrank under us (fewer drivers than when the page was chosen): show the last page.
        leaderboardPage = page.pages;
        loadLeaderboard();
        return;
      }
      renderLeaderboard(page.entries);
      renderPager(page);
      leaderboardUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch {
      if (requestId !== leaderboardRequest) return;
      leaderboardTable.hidden = true;
      leaderboardPager.hidden = true;
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

  // Clear the table before a different level or board loads, so stale rows
  // are never shown under the new heading.
  const clearLeaderboard = () => {
    leaderboardTable.hidden = true;
    leaderboardPager.hidden = true;
    leaderboardBody.replaceChildren();
    leaderboardUpdated.textContent = '';
    leaderboardPage = 1;
  };

  const goToLeaderboardPage = (page) => {
    leaderboardPage = Math.max(1, page);
    leaderboardTable.hidden = true;
    leaderboardBody.replaceChildren();
    setLeaderboardMessage('Loading...');
    loadLeaderboard();
  };

  leaderboardPrev.addEventListener('click', () => goToLeaderboardPage(leaderboardPage - 1));
  leaderboardNext.addEventListener('click', () => goToLeaderboardPage(leaderboardPage + 1));

  const selectLeaderboardLevel = (level) => {
    if (level === leaderboardLevel) return;
    leaderboardLevel = level;
    clearLeaderboard();
    renderLeaderboardTabs();
    loadLeaderboard();
  };

  // One sentence stating exactly what the table ranks, e.g. "Each driver's
  // fastest finished run in the Toyota AE86 Tuned, Steam-verified only. ..."
  const leaderboardRuleText = () => {
    const sort = LEADERBOARD_SORTS[leaderboardSortKey];
    const inCar = leaderboardCarKey ? ` in the ${carName(leaderboardCarKey)}` : '';
    return `Each driver's ${sort.best} finished run${inCar}, Steam-verified only. ${sort.rule}`;
  };

  // Score / Time toggle: presses the chosen button, explains that board's
  // rule, and marks the table so CSS can highlight the column it is ranked by.
  const renderLeaderboardSort = () => {
    leaderboardSort.querySelectorAll('.sort-toggle__option').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.sort === leaderboardSortKey ? 'true' : 'false');
    });
    leaderboardRule.textContent = leaderboardRuleText();
    leaderboardTable.dataset.sort = leaderboardSortKey;
  };

  // Car filter: "All cars" plus every car from GET /cars, in the API's order.
  const renderCarOptions = () => {
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'All cars';
    leaderboardCar.replaceChildren(all, ...[...carNames].map(([model, name]) => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = name;
      return option;
    }));
    leaderboardCar.value = leaderboardCarKey;
  };

  const loadCars = async () => {
    if (carNames.size > 0) return;
    try {
      const response = await fetch(`${API_BASE_URL}/cars`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const cars = await response.json();
      carNames = new Map(cars.map((car) => [car.model, car.name]));
      renderCarOptions();
    } catch {
      // Leave just "All cars"; the leaderboard itself reports when the API is offline.
    }
  };

  leaderboardCar.addEventListener('change', () => {
    leaderboardCarKey = leaderboardCar.value;
    clearLeaderboard();
    renderLeaderboardSort(); // the rule names the chosen car
    loadLeaderboard();
  });

  const selectLeaderboardSort = (key) => {
    if (key === leaderboardSortKey || !(key in LEADERBOARD_SORTS)) return;
    leaderboardSortKey = key;
    clearLeaderboard();
    renderLeaderboardSort();
    loadLeaderboard();
  };

  leaderboardSort.addEventListener('click', (event) => {
    const button = event.target.closest('.sort-toggle__option');
    if (button) selectLeaderboardSort(button.dataset.sort);
  });

  const startLeaderboard = async () => {
    renderLeaderboardTabs();
    // Start the refresh timer before any awaiting, so stopLeaderboard can always
    // find it if the player leaves the view while the car list is still loading.
    if (leaderboardTimer === null) {
      leaderboardTimer = window.setInterval(() => {
        if (!document.hidden) loadLeaderboard();
      }, LEADERBOARD_REFRESH_MS);
    }
    setLeaderboardMessage('Loading...');
    await loadCars(); // names first, so the first table already shows them
    renderLeaderboardSort();
    loadLeaderboard();
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
  // `count` ("3/8") is shown after the text in the number font: "Online · 3/8".
  const setCardStatus = (card, state, text, server, count = '') => {
    const badge = card.querySelector('.status');
    badge.className = `status status--${state}`;
    if (count) {
      const number = document.createElement('span');
      number.className = 'status__count';
      number.textContent = count;
      badge.replaceChildren(`${text} · `, number);
    } else {
      badge.textContent = text;
    }

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
          const drivers = server.max_clients ? `${server.clients}/${server.max_clients}` : '';
          setCardStatus(card, 'live', 'Online', server, drivers);
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

  // ---- Full screen ----
  // The browser's Fullscreen API. It only works from a click or key press, which the
  // button is. Esc (or F11) also leaves full screen; the button follows either way.
  // Hidden where the browser cannot do it (e.g. iPhone Safari, which only allows video).

  const fullscreenToggle = document.getElementById('fullscreenToggle');
  const root = document.documentElement;
  const canFullscreen = Boolean(root.requestFullscreen || root.webkitRequestFullscreen)
    && document.fullscreenEnabled !== false;
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

  const toggleFullscreen = () => {
    try {
      if (fullscreenElement()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        const request = root.requestFullscreen || root.webkitRequestFullscreen;
        const result = request.call(root, { navigationUI: 'hide' });
        if (result && typeof result.catch === 'function') result.catch(() => {});
      }
    } catch { /* the browser refused; nothing to do */ }
  };

  const syncFullscreenButton = () => {
    const on = Boolean(fullscreenElement());
    fullscreenToggle.classList.toggle('is-fullscreen', on);
    fullscreenToggle.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
    fullscreenToggle.title = on ? 'Exit full screen' : 'Full screen';
  };

  if (fullscreenToggle && canFullscreen) {
    fullscreenToggle.hidden = false;
    syncFullscreenButton();
    fullscreenToggle.addEventListener('click', () => {
      Sfx.tick();
      toggleFullscreen();
    });
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
  }

  // ---- Menu cursor and sounds ----
  // Arcade-style menus: Up/Down moves a highlighted cursor (the mouse moves it too),
  // Enter confirms, Esc/Backspace goes back. The highlighted item is also the focused one,
  // so Tab and screen readers stay in step with it.

  const startMenuItems = startGate ? [...startGate.querySelectorAll('.start-menu__item')] : [];
  const optionsMenu = document.getElementById('optionsMenu');
  const optionsMenuItems = optionsMenu ? [...optionsMenu.querySelectorAll('.start-menu__item')] : [];
  const keyLegend = document.getElementById('keyLegend');
  let currentView = null;
  let selected = null;

  // Disabled menu items and offline level cards can still be highlighted (and buzz when chosen).
  startMenuItems.forEach((item) => { if (!item.hasAttribute('href')) item.tabIndex = -1; });
  levelCards.forEach((card) => { card.tabIndex = 0; });

  const isUnavailable = (item) => item.getAttribute('aria-disabled') === 'true' || !item.hasAttribute('href');

  const navItems = () => {
    if (currentView === 'start') return startGateMenuShown ? startMenuItems : [];
    if (currentView === 'options') return optionsMenuItems;
    if (currentView === 'level-select') return [...levelCards];
    return [];
  };

  const clearSelection = () => {
    if (selected) selected.classList.remove('is-selected');
    selected = null;
  };

  const select = (item, { sound = true, direction = 1 } = {}) => {
    if (!item || item === selected) return;
    clearSelection();
    selected = item;
    item.classList.add('is-selected');
    if (document.activeElement !== item) item.focus({ preventScroll: true });
    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (sound) Sfx.move(direction);
  };

  const flash = (item, className, ms) => {
    item.classList.remove(className);
    void item.offsetWidth; // restart the animation on repeated presses
    item.classList.add(className);
    window.setTimeout(() => item.classList.remove(className), ms);
  };

  const deny = (item) => {
    Sfx.denied();
    if (item) flash(item, 'is-denied', 320);
  };

  const moveCursor = (direction) => {
    const items = navItems();
    if (items.length === 0) return;
    const index = items.indexOf(selected);
    const next = index === -1
      ? items[direction > 0 ? 0 : items.length - 1]
      : items[(index + direction + items.length) % items.length];
    select(next, { direction });
  };

  // Mouse hover moves the cursor (not touch: a tap would blip and confirm at once).
  [...startMenuItems, ...optionsMenuItems, ...levelCards].forEach((item) => {
    item.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') select(item);
    });
    item.addEventListener('focus', () => select(item)); // Tab key
  });

  // Every view link: confirm going in, the "back" sound going up a level.
  document.querySelectorAll('[data-view-link]').forEach((link) => {
    link.addEventListener('click', () => {
      if (link.dataset.viewLink === VIEW_PARENT[currentView]) Sfx.back();
      else Sfx.select();
    });
  });

  startMenuItems.filter((item) => !item.hasAttribute('href')).forEach((item) => {
    item.addEventListener('click', () => deny(item));
  });

  // Online cards hand off to Content Manager. Offline cards cannot be joined.
  levelCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (isUnavailable(card)) {
        deny(card);
      } else {
        Sfx.select();
        flash(card, 'is-launching', 900);
      }
    });
  });

  document.querySelectorAll('.credit-card').forEach((card) => card.addEventListener('click', () => Sfx.select()));

  // Leaderboard controls (the tabs are rebuilt on every render, so listen on their container).
  leaderboardTabs.addEventListener('click', (event) => { if (event.target.closest('.leaderboard-tab')) Sfx.tick(); });
  leaderboardSort.addEventListener('click', (event) => { if (event.target.closest('.sort-toggle__option')) Sfx.tick(); });
  leaderboardCar.addEventListener('change', () => Sfx.tick());
  [leaderboardPrev, leaderboardNext].forEach((button) => button.addEventListener('click', () => Sfx.tick()));

  const stepLeaderboardLevel = (direction) => {
    const index = LEVELS.indexOf(leaderboardLevel);
    const next = LEVELS[(index + direction + LEVELS.length) % LEVELS.length];
    Sfx.move(direction);
    selectLeaderboardLevel(next);
  };

  // The key hints along the bottom of the screen, per view (hidden on touch screens).
  const KEY_LEGENDS = {
    start: [['\u2191\u2193', 'Select'], ['Enter', 'Confirm']],
    'level-select': [['\u2191\u2193', 'Select'], ['Enter', 'Join'], ['Esc', 'Back']],
    leaderboard: [['\u2190\u2192', 'Level'], ['Esc', 'Back']],
    credits: [['Esc', 'Back']],
    options: [['\u2191\u2193', 'Select'], ['Enter', 'Confirm'], ['Esc', 'Back']],
    about: [['Esc', 'Back']],
    'how-to-play': [['Esc', 'Back']],
    controls: [['Esc', 'Back']],
    rules: [['Esc', 'Back']],
    downloads: [['Esc', 'Back']],
  };

  const renderKeyLegend = () => {
    if (!keyLegend) return;
    const show = currentView && !(currentView === 'start' && !startGateMenuShown);
    keyLegend.hidden = !show;
    if (!show) return;
    keyLegend.replaceChildren(...KEY_LEGENDS[currentView].map(([key, action]) => {
      const hint = document.createElement('span');
      hint.className = 'key-legend__hint';
      const cap = document.createElement('kbd');
      cap.textContent = key;
      hint.append(cap, action);
      return hint;
    }));
  };

  window.addEventListener('keydown', (event) => {
    if (!dismissed || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest && event.target.closest('select, input, textarea, #soundPanel')) return;
    if (event.key === 'Enter' && event.target.closest && event.target.closest('#muteToggle, #fullscreenToggle')) return;

    if (event.key === 'Escape' || event.key === 'Backspace') {
      if (currentView && currentView !== 'start') {
        event.preventDefault();
        Sfx.back();
        goToView(VIEW_PARENT[currentView] || 'start');
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (navItems().length === 0) return;
      event.preventDefault();
      moveCursor(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (currentView === 'leaderboard' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      stepLeaderboardLevel(event.key === 'ArrowRight' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' && selected && navItems().includes(selected)) {
      event.preventDefault();
      selected.click(); // the click handlers above play the sound and do the rest
    }
  });

  const showView = (name) => {
    const target = VALID_VIEWS.includes(name) ? name : 'start';
    const previousView = currentView;
    currentView = target;
    clearSelection();
    views.forEach((v) => {
      v.hidden = v.dataset.view !== target;
    });
    if (target === 'start') handleStartView();
    if (target === 'leaderboard') startLeaderboard();
    else stopLeaderboard();
    if (target === 'level-select') startServerStatus();
    else stopServerStatus();
    // Back on a menu: the cursor returns to the item you came out of.
    const menu = target === 'start' && startGateMenuShown ? startMenuItems
      : target === 'options' ? optionsMenuItems
        : null;
    if (menu && menu.length > 0) {
      const cameFrom = menu.find((item) => item.dataset.viewLink === previousView);
      select(cameFrom || menu[0], { sound: false });
    }
    renderKeyLegend();
  };

  const revealStartMenu = () => {
    if (!startGate || startGateMenuShown) return;
    startGateMenuShown = true;
    startGate.classList.add('start-gate--menu');
    select(startMenuItems[0], { sound: false });
    renderKeyLegend();
  };

  // Enter or a click while the logo is still stamping in skips straight to the menu.
  const skipToMenu = () => {
    if (!startGate || startGateMenuShown) return;
    Sfx.select();
    startGate.classList.add('start-gate--instant');
    revealStartMenu();
  };

  if (startGate) {
    startGate.addEventListener('click', () => {
      if (dismissed && !startGateMenuShown) skipToMenu();
    });
  }

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

  // The first click, tap or key press anywhere unlocks sound (see sfx.js).
  ['pointerdown', 'keydown', 'touchend'].forEach((type) => {
    window.addEventListener(type, () => Sfx.unlock(), true);
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
    // Landing screen: PRESS ENTER TO START flashes until the first press (Enter, click or
    // tap). That press starts the music and the Cruisin AC "Presents" animation. A second
    // press, or the animation finishing, moves on to the Initial DriftRun logo.
    const enter = () => {
      if (entered || !intro) return;
      entered = true;
      Sfx.coin();
      primeMusic();
      intro.classList.add('intro--pressed'); // the prompt strobes, like a cabinet taking a credit
      window.setTimeout(() => {
        intro.classList.add('intro--started');
        window.setTimeout(() => setPhase('sun'), 80);
        window.setTimeout(() => setPhase('ac'), 1850);
        window.setTimeout(() => setPhase('cruisin'), 3000);
        window.setTimeout(() => {
          if (dismissed) return;
          intro.classList.add('intro--ready');
          window.setTimeout(() => dismissIntro(), 2000);
        }, 4300);
      }, 450);
    };

    const pressOnIntro = () => {
      if (!entered) {
        enter();
      } else if (!dismissed) {
        Sfx.select();
        dismissIntro();
      }
    };

    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.repeat || dismissed) return;
      event.preventDefault();
      pressOnIntro();
    });
    if (intro) intro.addEventListener('pointerdown', pressOnIntro);
  }

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.repeat) return;
    if (!dismissed) return;
    const startView = document.getElementById('viewStart');
    if (!startView || startView.hidden) return;
    if (currentView !== 'start') return;
    if (!startGateMenuShown && startGate) {
      event.preventDefault();
      skipToMenu();
    }
  });

  // The music only plays while this page is the active window. It pauses when another
  // window takes focus (joining a level opens Content Manager / the CSP car select on
  // top, switching apps, another tab) and resumes where it left off on coming back,
  // unless sound is muted. `blur`/`focus` cover other windows; `visibilitychange` covers
  // tab switches and minimising, where focus events are not always sent.
  const pauseForFocus = () => {
    if (bgMusic && musicStarted) bgMusic.pause();
  };
  const resumeForFocus = () => {
    if (document.hidden || !document.hasFocus() || isMuted()) return;
    if (bgMusic && bgMusic.paused) tryPlayBgMusic();
  };
  window.addEventListener('blur', pauseForFocus);
  window.addEventListener('focus', resumeForFocus);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseForFocus();
    else resumeForFocus();
  });
});
