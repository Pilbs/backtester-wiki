# Forex Backtester Wiki

Static documentation for the Forex Backtester project. There is no build step and no framework dependency.

## Current project state

The deterministic backtesting foundation is in place:

- OANDA historical candles stored in Cloudflare D1
- Native EUR/USD M1 and M5 data
- Generic D1 selection by instrument
- Strategy and execution timeframes separated
- Causal candle timing to avoid lookahead
- BID / ASK execution with MID strategy calculations
- Instrument-specific pip metadata
- Generic trade-intent contract with PIPS and PRICE levels
- Timezone-aware sessions
- ORB strategy implemented end-to-end
- Focused deterministic and real-data regression tests

The next development phase is strategy configuration and parameter sweeps.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static HTTP server.

## Cloudflare Pages

If the repository is connected to Cloudflare Pages and `main` is the production branch, pushes to `main` automatically trigger a new deployment.

For this repository:

- Framework preset: **None**
- Build command: **leave blank**
- Build output directory: **`.`**

## Main pages

- `index.html` — current project status and principles
- `data.html` — D1 storage, OANDA candles and historical import
- `engine.html` — service layer, multi-timeframe execution and trade intents
- `strategies.html` — strategy contract, context and configuration direction
- `time.html` — timezones, sessions and causal candle timing
- `orb.html` — current ORB implementation and regression run
- `architecture.html` — folder model and component boundaries
- `roadmap.html` — parameter sweeps, experiments, AI tools and Pine direction
