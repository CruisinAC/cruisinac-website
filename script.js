// Sign-in popup <-> main window messages (see "Steam sign-in" below).
const AUTH_CHANNEL = 'cruisinac-auth';

// This window is the sign-in popup (?login=...&popup=1): Steam is done, so tell the main
// window (which then loads the account) and close. Runs straight away, not on `load`, so the
// site itself never shows in the popup; nothing else of the site runs in here.
const IS_SIGNIN_POPUP = (() => {
  const query = new URLSearchParams(window.location.search);
  return query.get('login') !== null && query.get('popup') === '1';
})();
if (IS_SIGNIN_POPUP) {
  const result = new URLSearchParams(window.location.search).get('login');
  try {
    new BroadcastChannel(AUTH_CHANNEL).postMessage({ type: 'login', result });
  } catch { /* no BroadcastChannel: the main window still shows the change on its next load */ }
  const note = document.createElement('main');
  note.className = 'popup-done';
  note.textContent = result === 'ok'
    ? 'Signed in. You can close this window.'
    : 'Steam sign-in failed. You can close this window and try again.';
  document.title = 'Cruisin AC sign-in';
  document.body.replaceChildren(note);
  window.setTimeout(() => window.close(), 300);
}

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

// Cruisin AC intro timing (ms after the intro starts) and the sounds tied to it.
// After Enter: the prompt strobes, the screen fades to black, the surf starts in the dark,
// then the black fades away to reveal the Cruisin AC screen just before the sun drops.
const PRESS_STROBE_MS = 1000; // PRESS ENTER TO START strobes 0.8 s, holds, then the fade starts
const BLACKOUT_IN_MS = 800; // fade to black (matches .intro--blackout in styles.css)
const BLACKOUT_HOLD_MS = 1000; // black, with only the surf and gulls
// The Cruisin AC animation, from the moment the black starts fading away (0.8 s fade-up).
// Paced so the surf plays on its own for a while, the flicker finishes, and there is a short
// pause before the crash squeal and AC (2026-10-11: it all felt too fast and overlapped).
const INTRO_SUN_MS = 600; // the sun starts dropping as the reveal finishes (sunDrop, 3.2 s)
const INTRO_CRUISIN_MS = 3220; // Cruisin' flickers on as the sun settles (cruisinFlicker, 1.35 s)
const INTRO_AC_MS = 5670; // AC zooms in from the left (acZoomIn, 1.05 s); squeal ~0.6 s before
const INTRO_READY_MS = 7270; // "Presents" fades in
const INTRO_END_MS = INTRO_READY_MS + 2000; // the screen moves on to the Initial DriftRun logo
const AC_LANDS_MS = 714; // into acZoomIn: AC reaches its place and overshoots (the 68% keyframe)
const CRASH_IMPACT_MS = 1450; // the impact in the car-crash sound, from the start of the file
const CRASH_TAIL_MS = 2000; // into the crash file: its tail starts dying away (silent by ~2.7 s)
// Each intro sound's level relative to its file (1 = as recorded). The crash file is far
// louder than the other two as recorded, so it plays lower; the surf sits under the others.
const SURF_VOLUME = 0.6;
const FLICKER_VOLUME = 1;
const CRASH_VOLUME = 0.55;
// The track is silent for its first 2.75 s (measured; music is audible from ~2.9 s), so
// playback, and every loop, starts here instead of at 0.
const MUSIC_START_SECONDS = 2.7;

// Where the results API (cruisinac-api) lives. The published API, reached through
// its Cloudflare Tunnel, except when the site itself is being served locally
// (python -m http.server), which talks to the local API as before.
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const IS_LOCAL = LOCAL_HOSTS.includes(window.location.hostname);
// Local testing against another API port: open http://localhost:5500/?api=8001 once and
// that browser tab keeps using it (e.g. a test copy of the API with sign-in settings).
const LOCAL_API_PORT = (() => {
  if (!IS_LOCAL) return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('api');
    if (fromUrl && /^\d{2,5}$/.test(fromUrl)) window.sessionStorage.setItem('cruisinAcApiPort', fromUrl);
    return window.sessionStorage.getItem('cruisinAcApiPort');
  } catch {
    return null;
  }
})();
const API_BASE_URL = IS_LOCAL
  ? `http://localhost:${LOCAL_API_PORT || 8000}`
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

// The two boards the API offers (`sort=`): score (highest first, a tie goes to the faster
// time) and time (fastest first, a tie goes to whoever set it first).
const LEADERBOARD_SORTS = ['score', 'time'];
const DEFAULT_LEADERBOARD_SORT = 'score';

window.addEventListener('load', () => {
  // Coming back from Steam sign-in: ?login=ok or ?login=failed (set by the API).
  const loginResult = new URLSearchParams(window.location.search).get('login');

  if (IS_SIGNIN_POPUP) return; // handled at the top of this file
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
  const introSounds = []; // recorded sounds playing under the Cruisin AC intro
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
      if (account && entry.steam_id === account.steam_id) row.classList.add('is-me');
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

  // Score / Time toggle: presses the chosen button and marks the table so CSS can
  // highlight the column it is ranked by.
  const renderLeaderboardSort = () => {
    leaderboardSort.querySelectorAll('.sort-toggle__option').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.sort === leaderboardSortKey ? 'true' : 'false');
    });
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
    loadLeaderboard();
  });

  const selectLeaderboardSort = (key) => {
    if (key === leaderboardSortKey || !LEADERBOARD_SORTS.includes(key)) return;
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
      const [response] = await Promise.all([
        fetch(`${API_BASE_URL}/servers`),
        account ? loadProgress() : null, // signed in: unlocks refresh with the status
      ]);
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
        applyProgressToCard(card);
      });
    } catch {
      if (requestId !== serverStatusRequest) return;
      levelCards.forEach((card) => {
        setCardStatus(card, 'unknown', 'Status unavailable');
        applyProgressToCard(card);
      });
    }
  };

  const startServerStatus = () => {
    hideAllPasswords(); // earned passwords start hidden every time Level Select opens
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

  // ---- Steam sign-in (account button, top left) ----
  // Signing in happens on the API (cruisinac-api, app/routers/auth.py): the button sends
  // the player to /auth/steam/login, Steam sends them back to the API, and the API sets a
  // cookie and returns them here with ?login=ok (or ?login=failed). The site then asks
  // GET /me who is signed in and GET /me/progress which levels they have unlocked. The
  // cookie travels only with `credentials: 'include'`. Signed out, nothing is locked.

  const accountButton = document.getElementById('accountButton');
  const accountButtonLabel = document.getElementById('accountButtonLabel');
  const accountPanel = document.getElementById('accountPanel');
  const accountName = document.getElementById('accountName');
  const accountSteamId = document.getElementById('accountSteamId');
  const accountSignOut = document.getElementById('accountSignOut');
  const accountToast = document.getElementById('accountToast');
  let account = null; // {steam_id, name} while signed in
  let progress = null; // level number -> {finished, finished_at, unlocked}
  let passwords = null; // level number -> that level's password, for levels the player earned
  let toastTimer = null;

  const apiFetch = (path, options = {}) => fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options });

  const showToast = (text, isError = false) => {
    if (!accountToast) return;
    accountToast.textContent = text;
    accountToast.classList.toggle('is-error', isError);
    accountToast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { accountToast.hidden = true; }, 5000);
  };

  const loadProgress = async () => {
    try {
      const [progressResponse, passwordsResponse] = await Promise.all([
        apiFetch('/me/progress'),
        apiFetch('/me/passwords'),
      ]);
      if (!progressResponse.ok || !passwordsResponse.ok) throw new Error('HTTP error');
      const levels = await progressResponse.json();
      progress = new Map(levels.map((level) => [level.level, level]));
      const earned = await passwordsResponse.json();
      passwords = new Map(earned.map((entry) => [entry.level, entry.password]));
    } catch {
      // Keep what we had; the next refresh tries again.
    }
  };

  // ---- Earned passwords, under their level card ----
  // GET /me/passwords returns only the passwords this signed-in player has earned (finishing
  // Level N earns Level N+1's). Each shows in a row below its card, hidden (dots) until Show;
  // Copy puts it on the clipboard. The row sits beside the card, not inside it, because the
  // card is the Join link. Rows hide again whenever Level Select is reopened.

  const MASK = '\u2022'.repeat(10);

  const passwordRow = (card) => {
    const next = card.nextElementSibling;
    return next && next.classList.contains('level-password') ? next : null;
  };

  const setPasswordShown = (row, shown) => {
    row.dataset.shown = shown ? '1' : '';
    const password = passwords ? passwords.get(Number(row.dataset.level)) : null;
    row.querySelector('.level-password__value').textContent = shown && password ? password : MASK;
    const showButton = row.querySelector('[data-action="show"]');
    showButton.textContent = shown ? 'Hide' : 'Show';
    showButton.setAttribute('aria-pressed', shown ? 'true' : 'false');
  };

  const copyPassword = async (row, button) => {
    const password = passwords ? passwords.get(Number(row.dataset.level)) : null;
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      Sfx.select();
      button.textContent = 'Copied';
    } catch {
      // No clipboard access: show it so it can be copied by hand.
      setPasswordShown(row, true);
      Sfx.denied();
      button.textContent = 'Use Ctrl+C';
    }
    window.setTimeout(() => { button.textContent = 'Copy'; }, 1600);
  };

  const makePasswordRow = (level) => {
    const row = document.createElement('div');
    row.className = 'level-password';
    row.dataset.level = String(level);
    const label = document.createElement('span');
    label.className = 'level-password__label';
    label.textContent = `Level ${twoDigits(level)} password`;
    const value = document.createElement('span');
    value.className = 'level-password__value';
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'level-password__button';
    show.dataset.action = 'show';
    show.addEventListener('click', () => {
      setPasswordShown(row, !row.dataset.shown);
      Sfx.tick();
    });
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'level-password__button';
    copy.dataset.action = 'copy';
    copy.textContent = 'Copy';
    copy.addEventListener('click', () => copyPassword(row, copy));
    row.append(label, value, show, copy);
    setPasswordShown(row, false);
    return row;
  };

  // Called with the card's progress: a row for an unlocked level whose password was earned.
  // Level 1 is open to everyone, so its tray says no password is needed (shown signed in
  // or out; it also keeps the first two cards evenly spaced). Signed out, it also says that
  // passwords are on the website: finishes count whether or not the player is signed in
  // here (the game server records them by Steam ID), so signing in later shows them all.
  const makeOpenLevelRow = (level) => {
    const row = document.createElement('div');
    row.className = 'level-password level-password--open';
    row.dataset.level = String(level);
    const label = document.createElement('span');
    label.className = 'level-password__label';
    label.textContent = `Level ${twoDigits(level)} password`;
    const value = document.createElement('span');
    value.className = 'level-password__value';
    row.append(label, value);
    return row;
  };

  const applyPasswordToCard = (card, locked) => {
    const level = cardLevel(card);
    if (level === 1) {
      let row = passwordRow(card);
      if (!row) {
        row = makeOpenLevelRow(level);
        card.after(row);
      }
      row.querySelector('.level-password__value').textContent = account
        ? 'Not needed \u00b7 open to every driver'
        : 'Not needed \u00b7 sign in with Steam to see the passwords you earn';
      return;
    }
    const earned = Boolean(account && !locked && passwords && passwords.get(level));
    let row = passwordRow(card);
    if (!earned) {
      if (row) row.remove();
      return;
    }
    if (!row) {
      row = makePasswordRow(level);
      card.after(row);
    } else {
      setPasswordShown(row, Boolean(row.dataset.shown)); // the password may have changed
    }
  };

  const hideAllPasswords = () => {
    document.querySelectorAll('.level-password:not(.level-password--open)').forEach((row) => setPasswordShown(row, false));
  };

  // Locked / Finished on one level card. Called after the server status has been applied,
  // so Locked wins over Online. Signed out, every level after Level 1 is locked; signed in,
  // /me/progress decides (a level unlocks when the one before it is finished).
  const applyProgressToCard = (card) => {
    const level = cardLevel(card);
    const info = progress ? progress.get(level) : null;
    const signedOutLock = !account && level > 1;
    const locked = signedOutLock || Boolean(info && !info.unlocked);
    const finished = Boolean(info && info.finished);
    card.classList.toggle('level-card--locked', locked);
    card.classList.toggle('level-card--finished', finished);

    const description = card.querySelector('.level-card__body p');
    if (description) {
      if (description.dataset.original === undefined) description.dataset.original = description.textContent;
      description.textContent = !locked ? description.dataset.original
        : signedOutLock ? 'Sign in with Steam to unlock.'
          : `Finish Level ${level - 1} to unlock.`;
    }

    let mark = card.querySelector('.level-card__finished');
    if (finished && !mark) {
      mark = document.createElement('span');
      mark.className = 'level-card__finished';
      card.querySelector('.level-card__body h3').after(mark);
    }
    if (mark) {
      mark.hidden = !finished;
      mark.textContent = 'Finished';
      mark.title = finished && info.finished_at
        ? `First finished ${formatDate(info.finished_at)}`
        : '';
    }

    if (locked) setCardStatus(card, 'locked', 'Locked');
    applyPasswordToCard(card, locked);
  };

  const setAccountPanelOpen = (open) => {
    if (!accountPanel || !accountButton) return;
    accountPanel.hidden = !open;
    accountButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  const accountPanelOpen = () => Boolean(accountPanel && !accountPanel.hidden);

  const renderAccount = () => {
    if (!accountButton) return;
    const signedIn = Boolean(account);
    accountButton.classList.toggle('is-signed-in', signedIn);
    accountButtonLabel.textContent = signedIn ? (account.name || 'Signed in') : 'Sign in with Steam';
    accountButton.setAttribute('aria-label', signedIn
      ? `Signed in as ${account.name || account.steam_id}. Account menu`
      : 'Sign in with Steam');
    if (signedIn) {
      accountName.textContent = account.name || 'No runs yet';
      accountSteamId.textContent = `Steam ID ${account.steam_id}`;
    } else {
      setAccountPanelOpen(false);
    }
  };

  // Redraw whatever on screen depends on who is signed in.
  const refreshForAccount = () => {
    if (currentView === 'level-select') loadServerStatus();
    if (currentView === 'leaderboard') loadLeaderboard();
  };

  const loadAccount = async () => {
    try {
      const response = await apiFetch('/me');
      account = response.ok ? await response.json() : null;
    } catch {
      account = null;
    }
    progress = null;
    passwords = null;
    if (account) await loadProgress();
    renderAccount();
    refreshForAccount();
  };

  const announceLogin = (result) => {
    if (result === 'ok') {
      if (account) showToast(`Signed in as ${account.name || `Steam ID ${account.steam_id}`}.`);
      else showToast('Steam sign-in did not stick. Is the browser blocking cookies?', true);
    } else if (result === 'failed') {
      showToast('Steam sign-in failed. Please try again.', true);
    }
  };

  // Signing in opens Steam in a popup, so this page (and its music) stays where it is.
  // The popup comes back to the site with ?popup=1, posts the result on AUTH_CHANNEL and
  // closes; this window then loads the account. A BroadcastChannel rather than
  // window.opener, because a site on the way (Steam) may cut the popup's link to its opener.
  // If the popup is blocked, sign-in falls back to leaving the page (WELCOME BACK on return).
  let authChannel = null;
  try {
    authChannel = new BroadcastChannel(AUTH_CHANNEL);
    authChannel.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'login') return;
      loadAccount().then(() => announceLogin(event.data.result));
    });
  } catch {
    authChannel = null;
  }

  const startSignIn = () => {
    const view = VALID_VIEWS.includes(currentView) ? currentView : 'start';
    const loginUrl = `${API_BASE_URL}/auth/steam/login?view=${encodeURIComponent(view)}`;
    if (authChannel) {
      const width = 820;
      const height = 720;
      const left = Math.round(window.screenX + Math.max(0, (window.outerWidth - width) / 2));
      const top = Math.round(window.screenY + Math.max(0, (window.outerHeight - height) / 2));
      const popup = window.open(`${loginUrl}&popup=true`, 'cruisinac-steam-signin',
        `popup,width=${width},height=${height},left=${left},top=${top}`);
      if (popup) {
        popup.focus();
        return;
      }
    }
    window.location.href = loginUrl;
  };

  if (accountButton) {
    accountButton.addEventListener('click', () => {
      if (!account) {
        Sfx.select();
        startSignIn();
        return;
      }
      setAccountPanelOpen(!accountPanelOpen());
      Sfx.tick();
    });
  }

  if (accountSignOut) {
    accountSignOut.addEventListener('click', async () => {
      Sfx.back();
      try { await apiFetch('/auth/logout', { method: 'POST' }); } catch { /* signed out locally anyway */ }
      account = null;
      progress = null;
      passwords = null;
      renderAccount();
      refreshForAccount();
      showToast('Signed out.');
    });
  }

  document.addEventListener('pointerdown', (event) => {
    if (accountPanelOpen() && !event.target.closest('#accountPanel, #accountButton')) setAccountPanelOpen(false);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !accountPanelOpen()) return;
    event.preventDefault();
    setAccountPanelOpen(false);
    accountButton.focus();
  });

  renderAccount();
  loadAccount().then(() => announceLogin(loginResult));

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
        if (card.classList.contains('level-card--locked') && !account) {
          showToast('Sign in with Steam (top left) to unlock the levels you have earned.');
        }
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
    if (event.target.closest && event.target.closest('select, input, textarea, #soundPanel, #accountPanel')) return;
    if (event.key === 'Enter' && event.target.closest && event.target.closest('#muteToggle, #fullscreenToggle, #accountButton, .level-password')) return;

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
    // Views only show once the landing screen and intro are over: from here on the
    // sign-in button is available (it is hidden on the landing screen and during the intro).
    if (accountButton) accountButton.hidden = false;
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

  // Leave the landing / intro overlay for the title screen (its logo stamp starts the
  // music), or for another view (then the music starts right away).
  const dismissIntro = (view = 'start') => {
    if (dismissed || !intro) return;
    dismissed = true;
    intro.classList.add('is-hidden');
    // The Cruisin AC intro's sounds end with it (the surf fades; a crash still ringing too).
    introSounds.forEach((sound) => sound.stop(0.6));
    tryPlayBgMusic();
    window.setTimeout(() => {
      intro.hidden = true;
      justCompletedIntro = true;
      goToView(view);
      if (view !== 'start') startMusic();
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
  if (loginResult !== null && intro) {
    // Back from Steam sign-in. A new page may not play music until the player presses
    // something, so the landing screen asks once more (PRESS ENTER TO CONTINUE). That press
    // skips the Cruisin AC intro: back to the page the player left, the title screen's logo
    // stamp and music included.
    const returnView = VALID_VIEWS.includes(initialHash) ? initialHash : 'start';
    const press = intro.querySelector('.intro__press');
    if (press) press.textContent = 'Press Enter to Continue';
    const welcome = intro.querySelector('.intro__welcome-text');
    if (welcome) welcome.textContent = 'Welcome Back';
    const resume = () => {
      if (entered) return;
      entered = true;
      Sfx.coin();
      primeMusic();
      intro.classList.add('intro--pressed');
      window.setTimeout(() => dismissIntro(returnView), 450);
    };
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.repeat || dismissed) return;
      event.preventDefault();
      resume();
    });
    intro.addEventListener('pointerdown', resume);
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
      // Sounds (sfx.js playSample): surf and gulls from the black screen on, the neon buzz
      // while Cruisin' flickers, and the car crash timed so its impact lands as AC slams into
      // place (its squeal starts just before AC appears).
      const introSound = (start, play) => window.setTimeout(() => {
        if (!dismissed) introSounds.push(play());
      }, start);
      const later = (ms, step) => window.setTimeout(() => { if (!dismissed) step(); }, ms);

      later(PRESS_STROBE_MS, () => {
        intro.classList.add('intro--blackout'); // fade to black
        later(BLACKOUT_IN_MS, () => {
          // Fully black: swap WELCOME for the (still empty) Cruisin AC screen underneath,
          // and let the ocean start in the dark.
          intro.classList.add('intro--started');
          let surf = null;
          introSound(0, () => (surf = Sfx.playSample('surf', { gain: SURF_VOLUME, fadeIn: 0.6 })));
          later(BLACKOUT_HOLD_MS, () => {
            intro.classList.remove('intro--blackout'); // the black fades away (0.8 s)
            // From here: sun drops in; Cruisin' flickers on as the sun settles; then AC.
            later(INTRO_SUN_MS, () => setPhase('sun'));
            later(INTRO_CRUISIN_MS, () => setPhase('cruisin'));
            later(INTRO_AC_MS, () => setPhase('ac'));
            introSound(INTRO_CRUISIN_MS, () => Sfx.playSample('flicker', { gain: FLICKER_VOLUME, duration: 1.3, fadeOut: 0.2 }));
            introSound(INTRO_AC_MS + AC_LANDS_MS - CRASH_IMPACT_MS, () => Sfx.playSample('crash', { gain: CRASH_VOLUME }));
            // The surf fades out from where the crash's tail fades, reaching silence as the
            // screen moves on (a skip fades everything faster, see dismissIntro).
            const crashStart = INTRO_AC_MS + AC_LANDS_MS - CRASH_IMPACT_MS;
            const surfFadeStart = crashStart + CRASH_TAIL_MS;
            later(surfFadeStart, () => { if (surf) surf.stop((INTRO_END_MS - surfFadeStart) / 1000); });
            later(INTRO_READY_MS, () => intro.classList.add('intro--ready'));
            later(INTRO_END_MS, () => dismissIntro());
          });
        });
      });
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
