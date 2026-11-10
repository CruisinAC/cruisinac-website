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
| `ek-track-mods-banner.webp` | 1600x400, ~810 KB | EK Track Mods banner (`ek_project_banner.webp`), for the track credit. Lazy-loaded, so only a Credits visit fetches it |
| `srp-logo-main-white.svg` | ~6 KB, vector, white on transparent | Shutoko Revival Project logo, for the car credit. Their site states no terms for its use |
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

## Track Credit (2026-10-30)
All six levels' tracks are by **Euro and Kozzren** (`ui_track.json` author on each `ek_*` track),
released free as **EK Track Mods**. The Credits page credits them below Wolf and Raven, with
their banner and a link to **https://www.patreon.com/c/u38695696/posts**. The banner is 4:1, so
its card is `.credit-card--banner` (image on top) instead of the square logo layout. A level
on a track by anyone else would make the page's "All Initial DriftRun levels" line wrong.

## Car Credit (2026-10-30)
The third Credits section points players to the **Car Pack** at
**https://shutokorevivalproject.com/** (home page, not the versioned `SRP_Car_Pack_3.6.7z`
link, which would go stale). Keep the wording to "modded cars and traffic":

- SRP distributes the pack but did not build these cars (the `ddm_` cars' author is ДЯДЯ ДИМА, the
  traffic cars' Opperslang + Just Kauser, the two Hondas' RaptorJeezus and Seb/Amy), so the page must not say SRP made them.
- Checked against the pack 3.6 file list on 2026-10-30: all six `traffic_*` cars and the
  `ddm_*` / `p3_*` cars on the level servers are in it. `ks_toyota_ae86_tuned` and
  `ks_toyota_supra_mkiv` are NOT: they are official AC cars.
- **2026-11-08:** the front-wheel-drive `rj_honda_civic_eg6_tuned` (by RaptorJeezus) and
  `amy_honda_dc2_turbo` (by Seb/Amy) replaced the official `bmw_m3_e30_s1` and
  `ddm_toyota_supra_ma70` on every server. Both are in pack 3.6, and their `data.acd` is identical
  to the servers' copies, so players with the pack pass the checksum.
- The site does not say the pack is free, so the page does not either.

## Opening Sequence and Sound (2026-10-10)
Browsers allow no sound until the visitor clicks, taps or presses a key, so the site opens on a
landing screen that waits for one:

1. **Landing:** only "PRESS ENTER TO START", flashing (`.intro__press` inside `#intro`).
2. **First press** (Enter, click or tap): the coin sound, the prompt strobes for 0.8 s and
   holds lit, the screen fades to black (0.8 s, from 1 s after the press), the surf and gulls start in the dark (~1 s of black), then
   the black fades away (0.8 s) to the Cruisin AC screen just before the sun drops, and
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
  **Joining from full screen (2026-10-31):** measured in Edge 156, the browser's "Open Content
  Manager?" box is what drops page full screen, not the other window: with the link already
  allowed, full screen held with an app opening on top, and the user confirmed it with the real
  car select. F11 holds even through the box, but a page cannot trigger F11. A page cannot skip
  the box or go back by itself (requestFullscreen was refused 1 s later: no fresh press). So
  (`script.js`, right after "Full screen"): a drop within `EXPECTED_DROP_MS` (1 s) of a join
  shows the "Always allow" hint for `JOIN_HINT_MS` (12 s), bottom centre
  (`.account-toast.is-bottom`) so the box at the top does not cover it, and the next press goes
  back to full screen. Players who ticked the box never see any of it. The Steam sign-in popup
  and the Credits links (new tab) drop full screen too, so they arm the same return with no hint
  (`expectFullscreenDrop`). Anything else the site adds that opens a window or tab needs that
  call as well. A drop the player chose (Esc, the button) is never undone. requestFullscreen
  uses up the press, so `NEEDS_ITS_OWN_PRESS` lists what is skipped (window.open for sign-in
  needs that press); every other button, menu links, the page itself and the arrow keys go
  back. Sign-in's fallback when the popup is blocked leaves the page, so it comes back windowed.
  Esc never does. Going back on an arrow
  key still moves the cursor, unless the mouse rests on a tile: the layout change re-selects
  whatever is under it. **Firefox** (user's test, 2026-10-31) does not hold full screen when the
  car select appears, so it gets no hint (`IS_FIREFOX`, user agent check); the next press still
  goes back.
- **Sound panel** (the speaker button, top right): Music and Effects sliders (0-100) and Mute
  All. Loudness = (slider / 100)^2, so the defaults `DEFAULT_MUSIC_LEVEL` 25 and
  `DEFAULT_SFX_LEVEL` 60 (top of `script.js`) are 0.06 and 0.36. Slider positions are saved in
  `localStorage` (`cruisinAcVolume`); Mute All is per browser tab (`sessionStorage`). The
  Effects slider blips as it moves so the level can be heard. Esc or a click elsewhere closes it.
- **Cruisin AC intro sounds** (2026-10-11): recorded files in `assets/audio/`, played through
  the sound engine (`Sfx.playSample`, so the Effects slider and Mute All apply): surf and gulls
  (`the-cries-of-seagulls-...mp3`) from the sun drop until the intro ends (0.6 s fade-in);
  the neon buzz (`vadim_makes_sound-...-546577.mp3`) for 1.3 s with the Cruisin' flicker; the
  car crash (`freesound_community-...-6054.mp3`; levels `SURF_VOLUME` 0.6, `FLICKER_VOLUME` 1,
  `CRASH_VOLUME` 0.55 at the top of `script.js`, set by ear on 2026-10-11)
  timed so its impact, 1.45 s into the file, lands when AC reaches its place (68% of
  acZoomIn). The file's own end is a second of silence, so aligning the file end would have
  put the crash a second early. Played through, the surf starts fading as the crash's tail dies away
  (`CRASH_TAIL_MS`) and reaches silence as the logo screen arrives; a skip fades every intro
  sound over 0.6 s. Phase timings and the crash alignment are the `INTRO_*`, `AC_LANDS_MS` and
  `CRASH_IMPACT_MS` constants at the top of `script.js`; the intro order is now sun (3.2 s drop),
  then Cruisin' (as the sun settles, 2.7 s), a short pause, then the crash squeal and AC
  (5.15 s), Presents at 6.75 s (all from the start of the intro). Testing note: headless Edge with
  `--virtual-time-budget` never finishes decoding the large surf file, so check audio
  timing in a real-time browser.
- **Sound effects** live in `sfx.js`, synthesised with the Web Audio API (no audio files):
  `coin` (two-note coin drop: the first press on the landing screen), `start` (coin + whoosh +
  synth-brass stab; not used since the user asked for just the coin), `select` (confirm; also a press
  that skips Presents or the logo stamp), `thump` (thud + reverb tail; unused: the logo landing has no sound effect, as the music starting there does that job (user, 2026-10-11); an explosive smash was also tried and rejected as awful and too loud), `move` (cursor), `tick`
  (tabs, Score/Time, pager, car filter, speaker button), `back`, `denied` (offline level,
  Options; joining an online level plays `select`; the engine-rev `launch` sound there was
  deleted on 2026-10-11 as awful). The user is not keen on most
  of these yet (2026-10-10); they are to be adjusted or replaced later, not removed.
- **Keyboard menus** (`script.js`, "Menu cursor and sounds"): Up/Down moves a highlighted
  cursor on the title menu, all four arrows on the Level Select grid (mouse hover moves it too), Enter confirms,
  Backspace goes back (not Esc since 2026-10-31: browsers keep Esc for leaving full screen, the
  two collided, and Keyboard Lock, the way round it, is Chrome/Edge only; Esc still closes the
  sound and account panels), Left/Right changes level on the Leaderboard. Returning to the title
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

Navigation: `VIEW_PARENT` at the top of `script.js` says where Back / Backspace goes from each view
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
- `LEADERBOARD_SORTS` - the two boards behind the Score / Time toggle. Score: highest score,
  ties to the faster time. Time: fastest run, ties to whoever set it first. (A one-line rule
  under the level name used to spell this out; removed at the user's request on 2026-10-11.) A player's row can be a different run on each board. The ranked
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

## Sign In Through Steam (2026-10-11)
The **account button, top left** (`#accountButton`, `script.js` "Steam sign-in"). Signed
out it reads SIGN IN WITH STEAM and sends the player to the API's `/auth/steam/login?view=<current
view>`; the API does the Steam part (see `cruisinac-api` `app/routers/auth.py` and
`docs/LEVEL_UNLOCK_PLAN.md`) and sends them back to `/?login=ok#<view>` (or `?login=failed`).
The button is **hidden on the landing screen and during the Cruisin AC intro**; it appears with
the first view (the title screen's logo stamp, where the music starts). A `?login=` return shows
the landing screen as **PRESS ENTER TO CONTINUE** (a new page may not play music before a press);
that press plays the coin, skips the Cruisin AC intro and goes back to the view the player left
(the title screen with its logo stamp and music, or another view with music straight away). A
small toast says "Signed in as ..." or what failed.

**Sign-in opens Steam in a popup** (`startSignIn`, `?popup=true` on the login URL), so the
page and its music stay where the player is. The API returns the popup to
`/?login=ok&popup=1#<view>`; `IS_SIGNIN_POPUP` at the top of `script.js` then replaces the popup's
page with a short note, posts the result on a `BroadcastChannel` (`cruisinac-auth`, not
`window.opener`, which a site on the way may cut) and closes it; the main window loads the
account and shows the toast. If the popup is blocked (or no BroadcastChannel), the button
falls back to leaving the page, which returns via WELCOME BACK as described above.

Signed in, the button shows the player's name; clicking it opens a panel with name, Steam ID
and Sign out. The site reads `GET /me` and `GET /me/progress` with `credentials: 'include'`
(the cookie is the API's, HttpOnly; the site never sees it).

- **Level Select:** a level whose previous level is not finished shows **Locked** (wins over
  Online), loses its Join link (buzzes like offline cards) and reads "Finish Level N to
  unlock."; finished levels get a FINISHED chip (`applyProgressToCard`). Progress refreshes
  with the 15 s server-status poll.
- **Leaderboard:** the signed-in player's own row is highlighted (`tr.is-me`).
- **Signed out:** every level after Level 1 is Locked ("Sign in with Steam to unlock."; the
  user's choice, 2026-10-11). Level 1 is open to everyone. Clicking a locked card buzzes
  (`Sfx.denied`), shakes, and signed out also shows a toast pointing at the sign-in button.
  Locked cards keep the cursor, get a padlock on the badge and over a greyed thumbnail.
- **Passwords** (`GET /me/passwords`, only for the signed-in player, only those earned:
  finishing Level N earns Level N+1's): a tray under each unlocked card whose password was
  earned (`.level-password`, `applyPasswordToCard`), dots until **Show**, plus **Copy**. Show and
  Copy sit together in `.level-password__actions` and never split across two lines (2026-11-09): the label
  wraps first (down to its longest word), then the pair moves below it as one. It
  is a sibling of the card, not inside it, because the card is the Join link. Rows hide again
  each time Level Select opens. Signed in, Level 1's card has a tray too, "Not needed · open to
  every driver" (`.level-password--open`). Signed out it has none (a tray under one tile leaves
  a hole under its neighbours): `#levelSelectNote` under the title says the same. Finishes
  count whether or not the player was signed in on the site: the game server records them by
  Steam ID, so signing in later shows every password already earned (no need to redo a level).
  Tray text and the status badges (ONLINE / LOCKED / ...) use Exo 2 SemiBold Italic like the numbers. Passwords are never in the site's code or files; the game
  no longer shows them once the plugin's `PasswordWebsiteUrl` is set.
- The lock is only a display; the real gate is still each level's password from the plugin.

**Local testing:** the live API runs without these settings until it is configured, so test
against a test copy of the API on port 8001 (started with `PUBLIC_API_URL=http://localhost:8001`,
`SITE_URL=http://localhost:5500` and a `SESSION_SECRET`), and open
`http://localhost:5500/?api=8001`: on localhost, `?api=<port>` points that browser tab at
another API port (kept in `sessionStorage`).

## Level Select by Difficulty Tier (2026-11-07)
History: an arcade course grid (2026-10-30, `auto-fill` columns), then briefly a staggered
starting grid (2026-11-07, rejected: tiles packed too tight, and a starting grid does not suit a
checkpoint drifting game). Now the levels are grouped into difficulty tiers (the user's design):
one `<section class="level-tier level-tier--<tier>">` band per tier inside `.level-select`, each
with a heading (`.level-tier__name`, the tier's colour, and `.level-tier__meter`: four slanted
bars, 1 lit for Easy, 2 Medium, 3 Hard, 4 Extreme) over `.level-tier__levels`, an `auto-fill`
grid of its tiles (up to three across on a desktop, one on a phone). Each tile gets a 3px top
stripe in its tier's colour. Colours: Easy green `#4fe08a`, Medium `--sunset`, Hard `--hot`,
**Extreme purple `#c46bff`** (the user wants the tier after Hard purple). A band's free places are
"Coming soon" tiles (`.level-soon`: the size of a level tile, striped picture area in the tier's colour
with a "?", dashed border). They are not `.level-card`s, so they get no status, no join link and no
cursor, and Up / Down skip a band without level cards. Replace a tile with a real `.level-slot` when
a level for that tier arrives; remove the tiles once the band is full.

Tiers as of 2026-11-09 (Nanamagari go-live): **Easy** Myogi, Momiji, Akagi; **Medium** Tsukuba Fruits Line,
Sadamine, Akina; **Hard** Hakone Turnpike, Nagao Uphill, Tsuchisaka Inbound; **Extreme** Nanamagari
Downhill, Tsubaki Line, Irohazaka. Every band is full, so there is no "Coming soon" tile left (`.level-soon`
takes its tier's colour; copy one back from git history for a new slot). Planned: Happogahara Extreme.
The bands follow the level order (the level numbers run 01-12 across them), so the tier a level is
in is where its `.level-slot` sits in `index.html`. Keys (`moveGridCursor`, the user's choice):
Right / Left go through all levels in order, across bands; Down / Up jump to the band below /
above, to its card nearest the current one horizontally (the first on a tie, so on a phone the
band's first card). Both wrap.

- **Adding a level:** copy a whole `.level-slot` block into its tier's `.level-tier__levels` in
  `index.html` (a new tier: copy a whole `.level-tier` section and change its class and name), change the rank badge
  (its number is how `cardLevel` finds the level), pictures and name (no description line), renumber the badges
  after it, and add it to `LEVELS` in `script.js`. Pictures are the game's own
  `content/tracks/<track>/ui/<layout>/preview.png` and `outline.png`, named after the track
  without a level number (`assets/images/tracks/akagi-downhill.png`, `...-outline.png`), so
  reordering levels needs no renames. Exceptions (the user's choice): Sadamine's and Hakone Turnpike's previews
  come from their `_real` layouts. Sadamine's outline is from `downhill_idas`; Hakone's from `_real` too,
  because its `_idas` outlines carry an "Initial D Zero" logo. `hakone-turnpike-uphill*.png` (`uphill_real`)
  is in the folder unused, for an uphill card if one comes. The level order itself lives in the API's
  `game_servers.json`; the badges and `LEVELS` here must match it (deploy them together).
- **`.level-slot`** wraps each card because the password tray must stay the card's next sibling
  (`passwordRow`). It spans two rows of its tier's grid through `subgrid`, so tiles in a row line
  up whether or not they have a tray.
- **Tile:** the track picture at the top with scanlines over it, the number and status on the
  picture, the FINISHED sticker on its bottom edge (absolute, so it never changes a tile's
  height). Number and status are absolute within the card; DOM order is unchanged.
- **Cursor:** blinking corner brackets (`.level-card::before`, `--cursor-color`: sunset, hot on
  a level that cannot be joined), the other tiles dim (`:has(.is-selected)`). It starts on
  Level 1 or the last level chosen, except on touch screens. `moveGridCursor`: Right / Left =
  next / previous level in order, Down / Up = the next / previous tier (see above); the key hint
  shows all four arrows.
- **No card lines (2026-11-09, the user's choice):** a tile shows only the track picture, number,
  status and name; the one-line descriptions under the names were removed (they took up too much
  space). A locked tile still gets one line under its name, made by `applyProgressToCard`: "Sign in
  with Steam to unlock." or "Finish Level N to unlock." (hidden again once it unlocks).

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
