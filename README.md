# Forex Backtester Wiki

A plain static multi-page wiki for the Forex Backtester project. There is **no build step** and no framework dependency.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static HTTP server.

## GitHub

Commit the contents of this folder to a repository (or a folder inside your existing `forex-backtester` repository).

## Cloudflare Pages

If this folder is the repository root:

- Framework preset: **None**
- Build command: **leave blank**
- Build output directory: **`.`**

If you place this site inside an existing repository folder such as `wiki/`, configure Cloudflare Pages to use that folder as the **Root directory**, then use the same settings above.

The site uses only relative links and local CSS/JavaScript, so it can be hosted directly by Cloudflare Pages without Node, npm, or a build pipeline.

## Main pages

- `index.html` — overview and current status
- `data.html` — D1 data, BID/ASK/MID and candle reading
- `engine.html` — runner, context, execution, SL/TP, trade records and summaries
- `strategies.html` — test strategies and repeatability
- `time.html` — generic timezones and sessions
- `orb.html` — ORB-specific foundation and TradingView validation
- `architecture.html` — folder philosophy and system mental model
- `roadmap.html` — Pine-to-batch-testing vision and next steps
