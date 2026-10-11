# CruisinAC Website - Project Context

## What This Is
The public website for **Cruisin AC** and its **Initial DriftRun** game mode: an Initial D
inspired drift/touge series of Assetto Corsa servers where players progress level by level
(each level is a separate server/track). The site should let players see the servers and
**join a server from a link**, and later grow into accounts, leaderboards and level unlocks.

The game mode itself is a separate project - see "Related Project" below.

## Look and Feel
- The site should feel like a **game UI**: 80s/OutRun synthwave style (sunset gradients,
  chrome, neon), with a **boot/intro animation** when it loads.
- Brand colors come from the logo: orange-to-pink sunset stripes, neon blue "Cruisin'"
  script, chrome-edged red "AC".
- Fonts (Google Fonts): **Orbitron** for headings, labels and menus, **Rajdhani** for body text,
  and **Exo 2 SemiBold 600 Italic** for numbers (`--font-numbers` in `styles.css`; chosen
  2026-10-10 to bring the site closer to the logos, after trying Kanit). Numbers = level badges,
  the player count in Level Select status badges (`.status__count`, "Online · 3/8"),
  leaderboard level tabs, leaderboard rank / score / time cells, Sound panel values. Exo 2 has
  equal-width digits (`font-variant-numeric: tabular-nums`), so score and time columns line up.
  Kanit does not; switching back would need per-digit fixed-width boxes.

## Assets (assets/images/)
Copied from `C:\Users\mannr\Pictures\CruisinAC-Logo-images\` (originals untouched, renamed here):

| File | Size | What it is |
|---|---|---|
| `cruisinac-logo.png` | 700x678, transparent | Full logo: striped sunset sun, neon blue "Cruisin'" script, chrome red "AC" |
| `cruisinac-logo-purple-bg.png` | 787x660 | Same logo on a purple background |
| `logo-layer-sun.png` | 700x678, transparent | Logo layer: the striped sun only |
| `logo-layer-cruisin.png` | 700x678, transparent | Logo layer: the "Cruisin'" script only |
| `logo-layer-ac.png` | 700x678, transparent | Logo layer: the chrome "AC" only |
| `sun-centered.png` | 698x501 | Sun graphic, centered |
| `wolf-and-raven-logo.jpg` | 800x800, black background | Wolf and Raven logo: chrome script, red sun, wolf and raven silhouette |
| `initial_driftrun_logo_v0.1.svg` | 900x400, ~250 KB (embedded PNGs) | Initial DriftRun logo: chrome "INITIAL", red "D", chrome "RIFTRUN". Used on the title screen, Level Select and Leaderboard (replaced `initial-driftrun-placeholder.svg`, 2026-10-10) |

The three `logo-layer-*` files share the same 700x678 canvas, so stacking them exactly
reproduces the full logo - ideal for the boot animation (e.g. sun rises, script draws in,
AC slams in).

More game-style art (OutRun-style digit images, labels like SCORE / TIME / GOAL, stage
banners) lives in the plugin's images folder and could be reused for the game-UI look:
`C:\Users\mannr\Documents\GitHub\AssettoServer\InitialDriftRunPlugin\images\`.
Never use any `password_unlock_*.png` image - those contain real level passwords.

## Music Credit (required)
The in-game music is by **Wolf and Raven** (albums "Tribute to OutRun" and "Tokyo Turbo").
The site must credit them visibly, with their logo and a link to
**https://www.wolfandravenmusic.com/**.

## Opening Sequence and Sound (2026-10-10)
Browsers allow no sound until the visitor clicks, taps or presses a key, so the site opens on a
landing screen that waits for one:

1. **Landing:** only "PRESS ENTER TO START", flashing (`.intro__press` inside `#intro`).
2. **First press** (Enter, click or tap): the coin sound, the prompt strobes for 0.45 s, and
   the Cruisin AC "Presents" animation plays (sun, AC, Cruisin', Presents) with no music, so
   it has room for its own sound effects.
3. **Second press, or Presents finishing** (~6.8 s): the Initial DriftRun logo stamps in and
   the music starts with it.
4. **The menu appears by itself** when the stamp lands (1.2 s); a press during the stamp skips
   straight to it. Held-down Enter (key repeat) is ignored, so one press = one step.

- **Music:** starts as the Initial DriftRun logo stamps in (`startMusic`, called from
  `handleStartView`; `tryPlayBgMusic` does nothing before it), fading in over `MUSIC_FADE_MS`
  (1 s) to the Music slider's volume. Playback and every loop start at `MUSIC_START_SECONDS`
  (2.7 s): the track is silent for its first 2.75 s. Looping is done by hand (`ended` event),
  not the `loop` attribute, so repeats skip that silence too.
  **The music only plays while the page is the active window:** it pauses on `blur` /
  hidden tab (e.g. joining a level brings up Content Manager and the CSP car select) and
  resumes where it left off on `focus` / visible again, unless Mute All is on. Before
  2026-10-11 a level click paused it and only a tab switch resumed it, so it never came back.
  Known limitation (accepted by the user): the CSP car select window appears on top without
  taking focus, so the music keeps playing until the player clicks into that window. A page
  can only see its own focus, not whether another window covers it. Browsers only let music start from a click or key press
  (Safari strictly per element), so the first press calls `primeMusic`, which plays it muted
  and pauses at once; that unlocks the later start, which has no press of its own. It was far too loud at the browser default of 1.0.
  Live site: music was switched off entirely on 2026-10-10 (commit `d60d2ab`) until this
  version is deployed.
- **Full-screen button** (left of the speaker button; `script.js` "Full screen"): the browser
  Fullscreen API on the whole page, so it only works from a real click. Esc or F11 also leaves
  full screen and the icon follows. Hidden where the browser cannot do it (iPhone Safari only
  allows video full screen).
- **Sound panel** (the speaker button, top right): Music and Effects sliders (0-100) and Mute
  All. Loudness = (slider / 100)^2, so the defaults `DEFAULT_MUSIC_LEVEL` 25 and
  `DEFAULT_SFX_LEVEL` 60 (top of `script.js`) are 0.06 and 0.36. Slider positions are saved in
  `localStorage` (`cruisinAcVolume`); Mute All is per browser tab (`sessionStorage`). The
  Effects slider blips as it moves so the level can be heard. Esc or a click elsewhere closes it.
- **Sound effects** live in `sfx.js`, synthesised with the Web Audio API (no audio files):
  `coin` (two-note coin drop: the first press on the landing screen), `start` (coin + whoosh +
  synth-brass stab; not used since the user asked for just the coin), `select` (confirm; also a press
  that skips Presents or the logo stamp), `thump` (thud + reverb tail; unused: the logo landing has no sound effect, as the music starting there does that job (user, 2026-10-11); an explosive smash was also tried and rejected as awful and too loud), `move` (cursor), `tick`
  (tabs, Score/Time, pager, car filter, speaker button), `back`, `denied` (offline level,
  Options; joining an online level plays `select`; the engine-rev `launch` sound there was
  deleted on 2026-10-11 as awful). The user is not keen on most
  of these yet (2026-10-10); they are to be adjusted or replaced later, not removed.
- **Keyboard menus** (`script.js`, "Menu cursor and sounds"): Up/Down moves a highlighted
  cursor on the title menu and Level Select (mouse hover moves it too), Enter confirms,
  Esc/Backspace goes back, Left/Right changes level on the Leaderboard. Returning to the title
  menu puts the cursor on the item you came from. A key-hint bar (`#keyLegend`) shows the keys
  per view, hidden on touch screens.

## Options Menu (2026-10-10)
Title menu > **Options** (`#options`) is a second menu in the same arcade style, with five
pages: **About** (`#about`), **How to Play** (`#how-to-play`), **Controls** (`#controls`),
**Rules** (`#rules`) and **Downloads / Installation** (`#downloads`). Each page is its own
`<section class="view">` in `index.html` and currently shows an UNDER CONSTRUCTION placeholder
(`.under-construction`); replace that block with the real content.

Planned content for Downloads / Installation: links to the sites where players download the
cars and tracks.

Navigation: `VIEW_PARENT` at the top of `script.js` says where Back / Esc goes from each view
(a page -> Options -> title menu). Coming back to a menu puts the cursor on the item you left.
A new view needs: a `<section class="view" data-view="...">`, an entry in `VALID_VIEWS` and
`VIEW_PARENT`, and a line in `KEY_LEGENDS`.

## Joining a Server From a Link
AssettoServer prints a Content Manager invite link at startup, in this format:

    https://acstuff.ru/s/q:race/online/join?ip=<public ip>&httpPort=<http port>

The acstuff.ru page hands off to Content Manager (CM), which then joins the server, so
players need CM installed (normal for these players). A "Join" button is just this link.

Known server so far - the local **test server** (Irohazaka downhill, Level 6):
- public IP `73.109.53.181`, HTTP port `8087`, TCP/UDP port `9606`
- invite link: `https://acstuff.ru/s/q:race/online/join?ip=73.109.53.181&httpPort=8087`

Caveats:
- That is a **home IP**. Residential IPs can change, which breaks every Join link; a static
  IP or hosted servers are needed before relying on links publicly.
- **Never put level passwords in links or anywhere on the site.** Passwords are held
  server-side by the plugin and only sent to a player who actually finished the level.

TODO (from the user): the full list of level servers in order, with each one's IP and
HTTP port. Existing level configs live in
`C:\Users\mannr\Documents\GitHub\cruisin_ac_overtake_server\cruisin_ac_overtake_server\`
(folders such as `ek_akina_outrun`, `tsubaki_line_outrun`, `tsukuba_fruits_line_outrun`,
`momiji_line_outrun`, `batang_kali_outrun`, `pch_outrun`).

## Leaderboard
The Leaderboard view (`#leaderboard`) reads `GET /leaderboard?track=<key>&sort=score|time&page=<n>&page_size=25[&car=<model>]` from the results API,
`C:\Users\mannr\Documents\GitHub\cruisinac-api\` (FastAPI + Postgres; game servers feed it via
its `scripts/watch_jsonl.py`). Settings at the top of `script.js`:
- `API_BASE_URL` - `https://api.cruisin-ac.com`, the API on the home PC through a Cloudflare
  Tunnel. When the site is served from localhost it uses `http://localhost:8000` instead, so
  the local test flow below still works. The site itself is published by Cloudflare Pages
  from the `main` branch at `https://driftrun.cruisin-ac.com`. `_headers` makes Pages serve
  `script.js` and `styles.css` with `max-age=0, must-revalidate`, so a deploy reaches every
  visitor on their next load instead of after Pages' default four-hour asset cache.
- `LEVELS` - each level's number, name and track key. The key is `TRACK-CONFIG_TRACK` from that
  level server's `server_cfg.ini`, the same `Track` the plugin records.
- `LEADERBOARD_SORTS` - the two boards behind the Score / Time toggle and the one-line rule
  shown for each. Score: highest score, ties to the faster time. Time: fastest run, ties to
  whoever set it first. A player's row can be a different run on each board. The ranked
  column is highlighted via the table's `data-sort` attribute.
- The car dropdown and the car names in the table come from the API's `GET /cars`
  (`cars.json` there, model folder -> display name). Choosing a car adds `&car=` and
  the rule sentence names the car. If `/cars` fails the dropdown keeps only "All cars"
  and the table falls back to tidied folder names.
- `LEADERBOARD_PAGE_SIZE` (25) - the API answers one page at a time as
  `{entries, total, page, page_size, pages}`; Prev / Next under the table and
  "Page 2 of 7 · 164 drivers" come from that. The pager is hidden when everything fits on
  one page. Changing level, board or car goes back to page 1; the 30 s refresh keeps the page.
  A plain list response (the pre-paging shape) is still accepted during a switchover.

Player names come from players, so they are only ever inserted with `textContent`, never as HTML.

## Server Status (Level Select)
Level cards are not hard-coded Online/Offline. While Level Select is open, `script.js` polls
`GET /servers` on the same API every 15 s. The API asks each configured game server's HTTP
port whether it is up (cached ~10 s) and returns, per level: `online`, `clients`,
`max_clients`, `join_url` (Content Manager link) and `fallback_url` (acstuff.ru link). Online
cards get the join link; offline ones have no `href`, so they cannot be clicked. The list of
servers, their ports and the public address used in join links live in the API's
`game_servers.json`, not in this site. A card's level number comes from its rank badge
("01" -> 1).

Local test: start the API, serve this folder with `python dev_server.py` (port 5500), open
http://localhost:5500 and choose Leaderboard. Use `dev_server.py`, not `python -m http.server`:
the plain server has no HTTP range requests, so the browser cannot jump into the music file
and it always plays from 0 (ignoring `MUSIC_START_SECONDS`). Cloudflare Pages supports them.

## Plan (staged)
**Stage 1 - static site, no backend (current stage).**
Landing page with the boot animation and logo art, a server list with Join buttons, and the
Wolf and Raven credit. Plain HTML/CSS/JS or a static site generator; free hosting such as
GitHub Pages, Cloudflare Pages or Netlify.

**Stage 2 - backend, when needed.**
Steam login, player profiles, leaderboards, and level unlocks tied to Steam accounts.
Suggested: Python (FastAPI) + PostgreSQL, since Python is the user's strongest language. The
game servers will POST results to this API as JSON; the API is the only thing that talks to
the database. The plugin is C#, but it only needs to speak HTTP/JSON to the API.

## Grand Vision (for reference)
- Website with Steam login for player profiles, leaderboard, and server select
- Game-UI look with a boot animation
- Players unlock levels by beating the previous one; ideally by Steam ID (the next level's
  server lets that player in) rather than a shared password that can be passed around
- Database + REST API replacing the old approach of parsing results from Discord chat
- Eventually: multiple game modes, achievements, stats tracking

## Related Project: the Initial DriftRun plugin
`C:\Users\mannr\Documents\GitHub\AssettoServer\InitialDriftRunPlugin\` (AssettoServer plugin,
C#/.NET 8), with its own detailed `CLAUDE.md` at
`C:\Users\mannr\Documents\GitHub\AssettoServer\CLAUDE.md`. It runs the race server-side
(score, checkpoints, drift multipliers, overtakes, off-track and skip detection) so scores
cannot be faked on the client.

It already records every run, one JSON object per line, to `driftrun_results.jsonl` next to
each server's `extra_cfg.yml` - the future data source for leaderboards:

    {"TimestampUtc": "...", "Track": "ek_irohazaka-downhill_idas", "SteamId": "7656...",
     "Name": "...", "Car": "ks_toyota_ae86_tuned", "Outcome": "Finished|OutOfTime|Invalidated",
     "Score": 1234567, "TotalTimeSeconds": 245.3, "StageTimesSeconds": [60.1, 62.4, 61.0, 61.8],
     "WorstTravelRatio": 0.93, "Note": null}

Steam IDs are only trustworthy on servers with `UseSteamAuth: true`.

## About the User
Most familiar with Python; newer to C#. Prefers clear explanations of unfamiliar code, and
wants what drives any number shown to players to be visible and explainable.
