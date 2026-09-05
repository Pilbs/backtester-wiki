# Forex Backtester — Project Companion

Updated 5 September 2026.

## What this project is

The project is a **strategy research tool**, not a charting platform or strategy designer.

The core goal is:

> Take an existing automated trading strategy, test it over more historical data than is convenient in TradingView, sweep its important parameters, and understand whether the apparent edge is robust.

The product should make strategy testing easier, not become another place to visually design strategies.

The long-term flow is:

```text
Existing strategy / Pine Script
        |
        v
Strategy input / translation
        |
        v
Internal strategy contract
        |
        v
Human Backtesting V1
        |
        v
Parameter research
        |
        v
Human web UI
        |
        +------> later Pine ingestion
        |
        +------> later AI research agent
```

The most important principle is that **the backtester is the foundation, not the final product**.

## Milestone status

### Completed — Historical data foundation

- OANDA historical candles stored in Cloudflare D1
- BID / ASK / MID OHLC data
- native EUR/USD M1 and M5 datasets proven end-to-end
- generic instrument metadata and D1 selection
- chronological keyset-paged candle reading
- reusable historical data rather than repeatedly downloading from OANDA

### Completed — Human Backtesting V1

The engine is now good enough for a human to manually port a reasonably typical automated strategy into JavaScript and perform serious historical parameter research without redesigning the core.

It supports:

- multiple simultaneous trades
- HEDGING and NETTING modes
- market, limit, stop and stop-limit orders
- GTC, DAY, IOC and FOK lifecycle rules
- partial exits
- explicit strategy exits
- dynamic stop and target updates/removal
- fixed units, cash, percent-equity and risk-percent sizing
- balance, equity, realised/unrealised P&L
- leverage, margin, free margin and buying-power rejection
- drawdown, daily-loss and margin-related risk controls
- bid/ask-aware execution
- slippage and commissions
- deterministic same-candle conflict policy
- strategy/account/execution configuration separation
- generic multi-parameter Cartesian sweeps
- pre-run combination counting and validation
- warning and maximum run limits
- one D1 dataset load reused across every run in an experiment
- structured schema-v5 experiment JSON
- yearly/monthly summaries
- causal/conservative MFE, MAE and holding-time diagnostics
- common indicator helpers: SMA, EMA, RMA, ATR, RSI, rolling high/low, standard deviation, crossover/crossunder and confirmed pivots

The final Human V1 acceptance experiment successfully loaded three months of EUR/USD M5/M1 history once and ran six account-aware ORB configurations with no failed runs.

## The simplest mental model

```text
Historical data
      |
      v
Strategy definition ----> Strategy parameters
      |                         |
      v                         v
Strategy runtime         Parameter combinations
      |                         |
      +------------+------------+
                   |
                   v
             Backtest engine
                   |
                   v
          Account + execution
                   |
                   v
          Structured run result
                   |
                   v
             Research engine
                   |
                   v
          Experiment result JSON
```

### Strategy definition vs strategy runtime

A strategy has two pieces.

The **runtime strategy** contains trading logic:

```javascript
{
    name: "My Strategy",
    reset() { ... },
    onCandle(context) { ... }
}
```

The **strategy definition** describes what can be configured and swept:

```javascript
{
    id: "ema-cross",
    name: "EMA Cross",
    version: 1,
    createStrategy,
    parameters: {
        fastLength: { type: "integer", default: 20, min: 1 },
        slowLength: { type: "integer", default: 50, min: 2 }
    }
}
```

That distinction solves an important product problem: every strategy can have different parameters while still using the same research engine and future web UI.

## How to test a strategy today

### Existing ORB strategy

The current usable entry point is:

```text
src/experiments/orb-sweep.js
```

That file contains:

```text
backtestConfig      market + dates + timeframes
accountConfig       balance + leverage + sizing + risk controls
executionPolicy     slippage + commission + fill assumptions
baseStrategyConfig  one normal set of strategy parameters
parameterGrid       values to sweep
policy              experiment run-count limits
```

Run it with:

```text
npm run research:orb
```

### New strategy

Today a new strategy must be manually ported into JavaScript:

```text
TradingView / strategy idea
        |
        v
src/strategies/my-strategy/
    my-strategy.js
    my-strategy-definition.js
        |
        v
small deterministic test
        |
        v
real-data smoke test
        |
        v
parameter experiment
```

This manual porting step is acceptable for the current personal tool. Pine ingestion comes later.

## Experiment configuration — what is universal

Account, execution and research settings are generic and apply to any strategy.

### Account configuration

```text
initialCapital
currency
quoteToAccountRate
leverage
positionMode
riskTimeZone
marginCallLevelPercent

defaultSizing.type:
  UNITS
  CASH
  PERCENT_EQUITY
  RISK_PERCENT

risk:
  maxOpenTrades
  maxTradesPerSide
  maxPositionUnits
  maxGrossExposure
  maxMarginUsagePercent
  maxDrawdownPercent
  maxDailyLossPercent
  breachAction
```

`positionMode` is either `HEDGING` or `NETTING`.

`breachAction` is either:

```text
HALT_NEW_ENTRIES
CLOSE_ALL_AND_HALT
```

`RISK_PERCENT` sizing means the engine sizes the position so the configured stop represents that percentage of current equity. It therefore requires a stop.

### Execution configuration

```text
sameCandleConflict:
  STOP_FIRST
  TARGET_FIRST

slippagePips

commission.type:
  NONE
  PIPS_PER_SIDE
  FIXED_PER_ORDER
  PERCENT_NOTIONAL

closeOpenTradesAtEnd
rejectOnInsufficientMargin
defaultTimeInForce:
  GTC
  DAY
  IOC
  FOK
```

### Research policy

```text
warningRunCount
maximumRunCount
overrideLimits
```

The engine counts parameter combinations before executing the experiment.

## What is strategy-specific

Only the strategy itself defines its own parameter catalogue.

ORB currently exposes:

```text
startHour
startMinute
durationMinutes
timeZone
stopLossPips
takeProfitPips
```

Another strategy might expose:

```text
fastEma
slowEma
atrLength
stopAtrMultiplier
targetAtrMultiplier
rsiFilter
```

The generic research layer does not need to know those names. It asks the chosen strategy definition what is valid.

This is the intended basis of the future browser UI: choose a strategy, then dynamically render the fields from that strategy's definition.

## Current limitations

Human Backtesting V1 deliberately does **not** yet provide:

```text
browser UI
single simple research.config.js workflow
Pine parser / full Pine runtime
AI research agent
true synchronized multi-instrument execution
tick simulation
order-book simulation
dynamic historical account-currency conversion
broker-specific margin models
```

A backtest currently represents one instrument dataset. Multiple trades can be open simultaneously within that instrument.

If account currency differs from the instrument quote currency, an explicit fixed `quoteToAccountRate` is required. The engine does not invent historical FX conversion rates.

## Next milestone — Usable Research Platform V1

The next milestone should make the existing engine easy to use, not add more speculative execution features.

### Phase 1 — One obvious research configuration

Create one generic config such as:

```javascript
export default {
    strategy: "orb",

    market: {
        instrument: "EUR_USD",
        strategyTimeframe: "M5",
        executionTimeframe: "M1",
        from: "2022-01-01",
        to: "2026-09-01"
    },

    account: {
        initialCapital: 10000,
        currency: "USD",
        leverage: 30,
        sizing: { type: "RISK_PERCENT", value: 1 }
    },

    strategyConfig: {
        startHour: 8,
        startMinute: 15,
        durationMinutes: 60,
        timeZone: "America/New_York",
        stopLossPips: 10,
        takeProfitPips: 20
    },

    parameterGrid: {
        stopLossPips: [8, 10, 12],
        takeProfitPips: [15, 20, 25],
        durationMinutes: [30, 60, 90]
    }
};
```

Then the normal human workflow becomes:

```text
edit research.config.js
        |
        v
npm run research
        |
        v
preview combination count
        |
        v
load data once
        |
        v
run experiment
        |
        v
console + JSON result
```

### Phase 2 — Strategy registry / discoverability

Provide one central catalogue that maps a simple strategy ID such as `orb` to its strategy definition.

This should allow the runner and future UI to discover:

```text
available strategies
strategy labels
valid parameters
parameter types
min/max/default/options
```

Universal account/execution choices should likewise be exposed as configuration metadata rather than requiring the user to inspect validator source code.

### Phase 3 — Minimal human web UI

Once the configuration model is comfortable from the command line, put a browser on top of the exact same model.

The acceptance target is:

> Open the app, choose ORB, choose EUR/USD and dates, choose parameter values, see the run count, start the experiment, see progress, and inspect/rank the results without editing JavaScript.

The UI is a **research UI**, not a visual strategy builder.

### Phase 4 — Job/persistence boundary as needed by the UI

Long experiments should execute behind a job abstraction rather than holding one browser request open. Add only the infrastructure required to support the real human workflow.

## Later milestones

### Pine Ingestion V1

```text
Pine strategy
    |
    v
supported parser / translator
    |
    v
internal strategy + definition
    |
    v
same backtest + research engine
```

Do not promise arbitrary Pine compatibility initially.

### AI Researcher V1

The AI should call deterministic research tools rather than calculating over raw candle history itself.

Likely tools:

```text
plan_experiment
run_experiment
compare_runs
inspect_trades
analyse_periods
```

The research loop then becomes:

```text
hypothesis
 -> experiment
 -> inspect
 -> refine
 -> robustness test
```

## Immediate next actions

1. Keep Human Backtesting V1 frozen as the completed foundation.
2. Start a new milestone/branch for Research Platform V1 rather than a "Batch 6" of engine work.
3. Design the shape of one generic `research.config.js`.
4. Add a strategy registry so `strategy: "orb"` resolves to the correct definition.
5. Centralise discoverable metadata for universal account/execution options.
6. Add a generic `npm run research` runner.
7. Prove it by reproducing the current ORB smoke experiment without editing `orb-sweep.js`.
8. Only then design the minimal browser form over the same configuration model.

## Guiding rules

> The primary benefit is testing strategies, not designing them.

> If a capability could be useful to many strategies, build it generically. If it describes how one strategy works, keep it inside that strategy.

> The next layer should make the existing engine easier to use before making the engine itself more complicated.
