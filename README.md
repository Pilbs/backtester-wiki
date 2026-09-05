# Forex Backtester Wiki

Static companion documentation for the Forex Backtester / strategy research platform.

## Current project state

**Human Backtesting V1 is complete.** The project can now take a manually ported JavaScript strategy, run it against historical D1 data with realistic account/execution assumptions, sweep multiple parameter combinations, and return structured experiment results.

The core product focus is deliberately narrow:

> Take an existing automated strategy, test it over deeper history, sweep its important parameters, and understand whether the result is robust.

This is **not** intended to become a TradingView replacement, charting platform or visual strategy builder.

Current capabilities include:

- OANDA BID / ASK / MID historical candles in Cloudflare D1
- causal strategy vs execution timeframe handling
- market, limit, stop and stop-limit orders
- multiple simultaneous trades with HEDGING or NETTING
- balance, equity, leverage, margin and drawdown modelling
- UNITS, CASH, PERCENT_EQUITY and RISK_PERCENT sizing
- commissions, slippage and account risk controls
- strategy definitions with validated/sweepable parameters
- Cartesian parameter sweeps with warning/hard limits
- one dataset load reused across an experiment
- yearly/monthly summaries and causal MFE / MAE trade diagnostics
- schema-v5 JSON experiment output
- common indicator helpers including SMA, EMA, RMA, ATR and RSI
- ORB implemented as the first real reference strategy

## How to use it today

The engine is currently developer-facing.

For ORB, edit:

```text
src/experiments/orb-sweep.js
```

then run:

```text
npm run research:orb
```

For a new strategy, manually port the rules into a strategy folder and provide a matching strategy definition. See `docs/strategy-porting.md` in the main backtester repository and the **Strategy Development** page in this wiki.

The next milestone exists specifically to make this simpler: one obvious research configuration + generic runner, followed by a minimal browser UI over the same model.

## Wiki pages

- `index.html` — current state, product focus and the simplest mental model
- `data.html` — D1 storage, candle shape and current data reality
- `engine.html` — execution/account model and deterministic OHLC rules
- `strategies.html` — strategy runtime, definitions, indicators and adding a new strategy
- `research.html` — how experiments work, current config options and how to run research today
- `time.html` — timezone/session and strategy/execution timeframe semantics
- `orb.html` — ORB implementation, regression tests and acceptance experiment
- `architecture.html` — component boundaries and current repository shape
- `roadmap.html` — concise milestone roadmap and immediate next actions
- `PROJECT-COMPANION.md` — detailed project companion in Markdown

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static HTTP server.

## Cloudflare Pages

If this repository is connected to Cloudflare Pages and `main` is the production branch, pushes to `main` automatically trigger a new deployment.

- Framework preset: **None**
- Build command: **leave blank**
- Build output directory: **`.`**
