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

Local test: start the API, serve this folder with `python -m http.server 5500`, open
http://localhost:5500 and choose Leaderboard.

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
