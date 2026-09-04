# Forex Backtester — Project Companion

Updated 4 September 2026.

## Purpose

The project is evolving from a personal backtester into a generic strategy research platform. The long-term direction is:

```text
strategy idea / Pine Script
        |
        v
structured strategy
        |
        v
deterministic backtest engine
        |
        v
parameter sweeps / experiments
        |
        v
comparison and research tools
        |
        v
AI-assisted strategy research
```

ORB is the first real strategy and regression case, not the product architecture.

## Current milestone

Phase 1 — the deterministic backtesting foundation — is complete.

The engine now has:

- OANDA historical data in Cloudflare D1
- native EUR/USD M1 and M5 candles
- BID / ASK / MID OHLC storage
- generic per-instrument D1 selection
- resumable historical imports
- instrument pip metadata
- generic candle reading
- strategy context with future-candle protection
- timezone-aware session utilities
- separate strategy and execution timeframes
- causal strategy-candle completion timing
- BID / ASK trade simulation
- stop-loss / take-profit execution
- conservative same-candle SL/TP ordering
- generic executable trade intents
- trade records and summary metrics
- a complete ORB implementation
- focused deterministic tests and a real D1 ORB regression run

## Core architecture

```text
OANDA
  |
  v
Cloudflare D1
  |
  v
Candle Reader
  |
  v
Backtest Service
  |---------------------------|
  v                           v
Strategy Candles        Execution Candles
  |                           |
  v                           |
Strategy Context              |
  |                           |
  v                           |
Strategy                      |
  |                           |
  v                           |
Trade Intent -----------------|
              |
              v
        Backtest Runner
              |
              v
        Trades + Summary
```

`runBacktestJob()` is the main service seam. It accepts the market, timeframes, dates and strategy; loads the required candles; resolves instrument metadata; runs the engine; and returns structured results.

## Market data

Historical data is stored centrally in D1 so backtests do not repeatedly download the same market history.

The database design is instrument-sharded rather than timeframe-sharded. For example, one EUR/USD database can contain both M1 and M5 rows.

D1 database selection uses environment variables such as:

```text
CLOUDFLARE_D1_EUR_USD_DATABASE_ID
CLOUDFLARE_D1_GBP_USD_DATABASE_ID
```

The canonical schema contains:

```text
candles
import_progress
```

The importer is generic over instrument, granularity and date range.

## Price model

Strategy calculations use MID prices.

Execution uses the real side of the spread:

```text
LONG  enter ASK, exit BID
SHORT enter BID, exit ASK
```

This keeps chart-style strategy logic separate from execution realism.

## Strategy and execution timeframes

A backtest job can use different timeframes for decisions and execution:

```javascript
runBacktestJob({
  instrument: "EUR_USD",
  strategyTimeframe: "M5",
  executionTimeframe: "M1",
  from,
  to,
  strategy
});
```

An OANDA candle timestamp represents the candle start. Therefore an M5 candle stamped 09:15 is not available to the strategy until 09:20.

The engine processes the completed strategy candle when its close time has been reached, then allows the trade to enter at the first eligible execution-candle open.

This prevents lookahead while allowing lower-timeframe execution to resolve intrabar price sequencing.

A deterministic regression test proves this distinction: an M5 bar can contain both stop and target, while the M1 sequence can show which occurred first.

## Strategy contract

A strategy exposes:

```javascript
{
  name,
  reset(),
  onCandle(context)
}
```

The context provides the current completed strategy candle, history helpers, instrument and timeframe. Positive future offsets are blocked.

The strategy returns an executable trade intent rather than engine-specific or ORB-specific fields.

Example:

```javascript
{
  action: "ENTER",
  side: "LONG",
  stopLoss: {
    type: "PIPS",
    value: 10
  },
  takeProfit: {
    type: "PRICE",
    value: 1.0915
  }
}
```

The current contract supports:

```text
ENTER
LONG / SHORT
PIPS / PRICE levels
```

Indicator concepts such as ATR should remain inside the strategy. The strategy calculates the desired level and gives the engine a concrete executable instruction.

## ORB

The ORB strategy lives under:

```text
src/strategies/orb/
```

with:

```text
opening-range.js
daily-opening-range.js
breakout-detector.js
orb-strategy.js
```

It currently:

1. identifies the configured local opening-range session;
2. collects MID high/low values;
3. freezes the range when complete;
4. resets by local trading day;
5. detects the first breakout above or below the range;
6. converts the breakout into LONG or SHORT;
7. emits a generic trade intent with configured stop and target.

The retained real-data regression run uses:

```text
Instrument:       EUR_USD
Strategy TF:      M5
Execution TF:     M5
Range start:      08:15 America/New_York
Range duration:   60 minutes
Stop:             10 pips
Target:           20 pips
Window:           2026-08-01 to 2026-09-01
Known result:     17 trades
```

This known result is useful for detecting accidental behavioural changes during refactors.

## Current repository shape

```text
src/
  backtest/
  data/
  market/
  strategies/
    orb/
    strategy-interface.js
    trade-intent.js
  time/
  tests/
  import-history.js

schema.sql
package.json
package-lock.json
```

The project was cleaned up after the initial build phase so obsolete test scaffolding and historical migration clutter do not become permanent architecture.

## Tests

The simplified commands are:

```text
npm test
npm run test:data
npm run test:orb
```

`npm test` runs the deterministic engine/domain tests.

`npm run test:data` validates D1 candle reading.

`npm run test:orb` runs the real EUR/USD ORB integration regression.

## Next development phase

The next goal is not more execution plumbing. It is to turn the backtester into a research engine.

### Step 1 — Strategy configuration

Move run-specific strategy parameter values into plain configuration data.

Conceptually:

```javascript
{
  strategy: "ORB",
  parameters: {
    startHour: 8,
    startMinute: 15,
    durationMinutes: 60,
    stopLossPips: 10,
    takeProfitPips: 20
  }
}
```

The strategy implementation remains code; the chosen parameter values become data.

### Step 2 — Parameter sweeps

Generate combinations such as:

```text
SL:       5, 10, 15, 20
TP:       10, 20, 30, 40
Duration: 30, 45, 60, 75
```

Run each configuration through the same deterministic backtest service and produce comparable summaries.

### Step 3 — Experiments and persistence

Promote backtest runs into first-class research records containing:

```text
experiment
run configuration
summary
trades
```

This will make comparisons reproducible rather than transient console output.

### Step 4 — AI tools

The future AI agent should orchestrate deterministic tools, not inspect millions of candles itself.

Likely tools include:

```text
get_data_catalog()
run_backtest()
run_parameter_sweep()
compare_runs()
get_backtest_trades()
```

The research loop becomes:

```text
hypothesis
   -> backtest
   -> inspect failures
   -> refine
   -> sweep
   -> robustness checks
```

### Step 5 — Pine ingestion

Pine parsing comes after the research engine is stable.

The eventual architecture is:

```text
Pine Script
   |
   v
parser / compiler
   |
   v
internal strategy representation
   |
   v
existing backtest + research platform
```

The goal is to give Pine a stable execution target rather than building a parser before the platform underneath it is ready.

## Guiding rule

> If a capability could be useful to many strategies, build it generically. If it describes how one particular strategy works, keep it inside that strategy.

That rule remains the most important architectural constraint as the project grows.
