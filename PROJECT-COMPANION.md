# Forex Backtester Project Companion

**Current state:** Generic backtesting platform foundation with real OANDA EUR/USD M1 data, deterministic execution, reusable strategy interface, timezone-aware sessions, and the beginnings of an ORB strategy.

**Last updated:** 4 September 2026

> The most important idea: this is becoming a **generic backtesting platform**, not an ORB-only backtester. ORB is simply the first proper strategy we are using to prove the architecture.

---

## 1. The Big Picture

The project is now split into clear layers:

```text
market data
    |
    v
generic backtest engine
    |
    v
strategy interface
    |
    v
individual strategies
    |
    v
trade results / summaries
```

The longer-term goal is much bigger than ORB:

> Paste or import a Pine strategy -> run it against years of data -> batch test parameter combinations -> compare the results.

The work we are doing now is the engine underneath that future service.

---

## 2. Historical Market Data

Historical data is stored in **Cloudflare D1**.

Current dataset:

- Instrument: `EUR_USD`
- Granularity: `M1`
- Approximate history: 2021 to 2026
- Around 2.09 million candles
- Source: OANDA
- Stored once centrally so backtests do not need to repeatedly download market data

Each candle contains:

```text
time
volume

bid OHLC
ask OHLC
mid OHLC
```

Conceptually:

```javascript
candle = {
  time,
  bid: { open, high, low, close },
  ask: { open, high, low, close },
  mid: { open, high, low, close },
  volume
}
```

This is a strong foundation because we are not limited to a single chart price. We have OANDA BID, ASK and MID prices.

---

## 3. BID, ASK and MID

We deliberately use different prices for **strategy logic** and **trade execution**.

### Strategy calculations use MID

Examples:

- Opening range high and low
- Moving averages
- Breakout levels
- Indicators

MID is a sensible chart-level price and broadly matches the sort of price logic a strategy sees visually.

### Trade execution uses BID / ASK

For a **LONG**:

```text
enter at ASK
exit at BID
```

For a **SHORT**:

```text
enter at BID
exit at ASK
```

This means the spread is naturally represented in the backtest rather than every trade unrealistically using one price.

---

## 4. Candle Reader

File:

```text
src/data/candle-reader.js
```

Its job is simple:

> Fetch a requested section of historical candles from D1 and return them in the standard candle structure.

Example:

```javascript
getCandles({
  instrument: "EUR_USD",
  granularity: "M1",
  from: "...",
  to: "..."
});
```

It handles paging through D1 when more than one query page is required.

The rest of the application does not need to know how D1 works. It simply receives:

```text
[candle, candle, candle, candle, ...]
```

---

## 5. Generic Backtest Runner

File:

```text
src/backtest/backtest-runner.js
```

This is one of the central pieces of the project.

Think of it as the machine that moves historical time forwards:

```text
candle 1 -> strategy
candle 2 -> strategy
candle 3 -> strategy
...
```

A strategy can respond with an instruction such as:

```javascript
{
  action: "ENTER",
  side: "LONG",
  stopLossPips: 10,
  takeProfitPips: 20
}
```

The strategy says **what it wants to do**.

The backtest engine decides **how that instruction is executed**.

That separation is fundamental to making the engine reusable for many strategies.

---

## 6. Avoiding Lookahead

A major rule already built into the engine is:

> A strategy cannot see the future.

If a signal is created from a candle that has just closed:

```text
13:09 candle closes
        |
        v
strategy detects signal
        |
        v
trade executes at 13:10 open
```

We do not allow the backtester to see the completed 13:09 candle and then pretend it entered at the 13:09 open.

That would create unrealistic historical results.

---

## 7. Strategy Context

File:

```text
src/backtest/strategy-context.js
```

The strategy context controls what a strategy is allowed to see at each moment in historical time.

It exposes things such as:

```javascript
candle
index
getCandle(...)
getRecentCandles(...)
```

For example:

```javascript
getRecentCandles(3)
```

means:

> Give me the current candle and the previous two candles.

A strategy cannot ask for a positive future offset such as:

```javascript
getCandle(+5)
```

because that would expose future market data.

So the platform already contains basic protection against accidental lookahead bias.

---

## 8. Strategy Interface

File:

```text
src/strategies/strategy-interface.js
```

This defines the basic contract between a strategy and the engine.

Conceptually a strategy looks like:

```javascript
strategy = {
  reset() {
    // reset strategy state
  },

  onCandle(context) {
    // inspect market data
    // optionally return a signal
  }
}
```

The engine should not care whether the strategy is:

- ORB
- EMA crossover
- RSI
- Mean reversion
- London breakout
- AI-generated
- Eventually translated from Pine Script

They should all communicate through the same generic strategy contract.

---

## 9. Strategy State and Reset

Strategies are allowed to remember state, for example:

```text
Have I already entered today?
What was yesterday's high?
Has this pattern already fired?
What is the current opening range?
```

Before a backtest starts, the runner can call:

```javascript
strategy.reset()
```

This prevents a second backtest from accidentally inheriting state from a previous run.

We explicitly tested this behaviour.

---

## 10. Trade Execution

The current runner supports **one open position at a time**.

When a strategy signals LONG, the engine waits until the next candle and enters using:

```text
ASK open
```

For SHORT:

```text
BID open
```

The runner then watches subsequent candles for stop-loss or take-profit conditions.

---

## 11. Stop Loss and Take Profit

For a LONG position:

```text
SL checked against BID low
TP checked against BID high
```

A long position closes by selling at the BID.

For a SHORT position:

```text
SL checked against ASK high
TP checked against ASK low
```

A short position closes by buying at the ASK.

This gives the engine much more realistic execution behaviour than a single-price backtester.

---

## 12. The M1 Same-Candle Limitation

Suppose a single one-minute candle touches both:

```text
your stop loss
and
your take profit
```

OHLC data tells us that both prices occurred during that minute, but not which occurred first.

Our current rule is deliberately conservative:

> If both SL and TP are touched in the same candle, STOP LOSS wins.

This prevents the backtester from flattering a strategy when the sequence inside the candle is unknowable.

Tick data could resolve this later, but M1 is appropriate for the platform at this stage.

---

## 13. Trade Records

Each completed trade is recorded with information including:

- Side
- Entry time
- Entry price
- Stop loss
- Take profit
- Exit time
- Exit price
- Exit reason
- PnL in pips
- WIN / LOSS / BREAKEVEN

So we do not just know that a strategy made or lost a number of pips. We have the underlying trades that produced the result.

This will later support deeper analysis such as:

- Time of day
- Holding time
- MAE / MFE
- Drawdown
- Day of week
- Session
- Entry type
- Parameter combinations

---

## 14. Backtest Summary

File:

```text
src/backtest/backtest-summary.js
```

It currently calculates basic metrics including:

- Total trades
- Wins
- Losses
- Breakevens
- Win rate
- Total PnL in pips

Later this can grow into:

- Profit factor
- Expectancy
- Maximum drawdown
- Average winner
- Average loser
- Consecutive losses
- Monthly breakdown
- Risk-adjusted metrics

But those are not needed yet.

---

## 15. Test Strategies

We deliberately built several simple or artificial strategies.

Examples include:

```text
dumb test strategy
forced losing strategy
multi-trade strategy
three-up strategy
```

These are not intended to make money. Their purpose is to prove individual engine behaviours:

```text
Does entry work?
Does SHORT execution work?
Does SL work?
Does TP work?
Can we make multiple trades?
Can a strategy inspect previous candles?
Can a strategy reset correctly?
Does the same test produce identical results twice?
```

This is how we build trust in the engine before trusting results from a complex real strategy.

Test-only strategy implementations now live separately under the strategy test folder, while test scripts themselves live under `src/tests/`.

---

## 16. Three-Up Strategy

The first simple multi-candle strategy looks for three consecutively higher MID closes:

```text
candle 1 close
        <
candle 2 close
        <
candle 3 close
```

It then generates a LONG signal.

The strategy itself is deliberately simplistic. Its purpose was to prove that a strategy could:

- Look backwards over multiple candles
- Recognise a pattern
- Generate repeated signals
- Run against real D1 history

It did.

---

## 17. Repeatability

We ran the same strategy twice using:

```text
same candles
+
same strategy
+
same configuration
```

and compared the outputs.

They matched.

This matters because a backtester should be deterministic:

```text
same input + same configuration = same result
```

Without repeatability, future parameter optimisation would be meaningless.

---

## 18. Generic Time Utilities

Folder:

```text
src/time/
```

These are deliberately **not ORB-specific**.

They provide reusable concepts such as:

- Date handling
- Hour and minute handling
- Trading-day detection
- Session windows
- Timezone conversion

Many future strategies could need these capabilities, for example:

```text
trade only London session
avoid New York lunchtime
reset state every trading day
trade the first hour of Tokyo
calculate a US opening range
```

---

## 19. Timezone Handling

This was the important improvement added most recently.

D1 timestamps remain permanently stored in:

```text
UTC
```

We do **not** modify the stored data.

Instead, a strategy can specify an IANA timezone such as:

```javascript
timeZone: "America/New_York"
```

The generic time layer converts each UTC candle into the appropriate local strategy time.

During US daylight saving time:

```text
12:15 UTC = 08:15 New York
```

During winter standard time:

```text
13:15 UTC = 08:15 New York
```

The strategy can therefore always express its actual intent as:

```text
08:15 New York
```

rather than manually changing between 12:15 and 13:15 UTC during the year.

Daylight-saving changes are handled automatically by JavaScript's timezone support.

---

## 20. Session Windows

File:

```text
src/time/session-window.js
```

A generic session can be described with configuration such as:

```javascript
{
  startHour: 8,
  startMinute: 15,
  durationMinutes: 60,
  timeZone: "America/New_York"
}
```

The session utility can classify a candle as:

```text
BEFORE
IN_SESSION
AFTER
```

For the current ORB range:

```text
08:14 -> BEFORE
08:15 -> IN_SESSION
09:14 -> IN_SESSION
09:15 -> AFTER
```

That gives exactly 60 M1 candles from 08:15 through 09:14 inclusive.

---

## 21. ORB-Specific Code

ORB-specific logic has been moved under:

```text
src/strategies/orb/
```

Current ORB components include:

```text
opening-range.js
daily-opening-range.js
```

This is an important architectural rule:

> The generic backtest engine does not know what an opening range is.

ORB-specific behaviour lives inside the ORB strategy area. Generic capabilities such as timezones and sessions live outside it.

That keeps the platform reusable for completely different strategies later.

---

## 22. Opening Range

`opening-range.js` currently does one focused job.

During the configured session it tracks:

```text
highest MID high
lowest MID low
number of candles collected
```

For example:

```text
High: 1.16490
Low:  1.16397
Range: 9.3 pips
```

At the end of the session the range becomes complete and freezes.

Later candles cannot alter that range.

It also avoids marking a range as complete when the backtest started after the session and no range candles were actually seen.

---

## 23. Daily Opening Range

`daily-opening-range.js` wraps the opening-range logic and handles one range per trading day:

```text
Monday range
Tuesday range
Wednesday range
...
```

At a new trading day the previous range is reset and a new one begins.

Crucially, the trading day is now determined in the **strategy's timezone**.

For:

```javascript
timeZone: "America/New_York"
```

"new day" means midnight in New York, not midnight UTC.

---

## 24. The Timezone Test Bug We Found

During the timezone change, the real opening-range test temporarily produced hundreds of duplicate ranges.

The reason was useful to understand:

```text
ORB component = comparing New York dates
test script    = comparing UTC dates
```

For several hours each day, the UTC date and New York date are different.

The test therefore thought the day had changed repeatedly and stored the same completed range many times.

The test was corrected to use the same `America/New_York` date interpretation as the strategy.

This was a good demonstration of why timezone handling needs to be a first-class platform capability rather than a hard-coded ORB workaround.

---

## 25. Manual Validation Against TradingView

We manually checked a real opening range against TradingView.

Initially the test was manually set to:

```text
12:15 UTC
```

which matched the TradingView range displayed against New York time during August.

The implementation was then changed properly to:

```javascript
startHour: 8,
startMinute: 15,
timeZone: "America/New_York"
```

The timezone layer automatically selected the corresponding UTC candles, and the calculated range still matched TradingView.

This gives us practical evidence that these pieces are lining up correctly:

```text
D1 data
+
timezone conversion
+
session selection
+
opening-range calculation
```

---

## 26. Current Folder Philosophy

The exact list of files will evolve, but the important separation is:

```text
src/

  data/
      market-data access

  backtest/
      generic backtesting engine

  time/
      generic time/session/timezone tools

  strategies/
      strategy-interface.js

      orb/
          ORB-specific implementation

      test/
          test-only strategy implementations

      other future strategies...

  tests/
      automated validation of the components above
```

The key principle is:

> If a capability could be useful to many strategies, build it generically. If it describes how one particular strategy works, keep it inside that strategy.

---

## 27. The Mental Model to Keep in Your Head

You do not need to understand every line of JavaScript to understand the system.

The most useful mental model is:

```text
                 D1
                  |
                  v
             Candle Reader
                  |
                  v
          Backtest Runner
                  |
          +-------+-------+
          |               |
          v               v
    Strategy Context    Execution
          |               |
          v               v
       Strategy          Trades
          |               |
          |               v
          +-----------> Results
```

At every historical candle the strategy is effectively being asked:

> Here is everything you are allowed to know at this moment in history. What do you want to do?

It can answer:

```text
nothing
```

or:

```text
ENTER LONG
```

Later the strategy contract can grow to support things such as:

```text
EXIT
MOVE STOP
TAKE PARTIAL
```

The strategy decides what it wants. The engine handles execution and records what actually happened.

---

## 28. Where ORB Currently Is

We have **not yet built the actual ORB trading strategy**.

We have built the foundation that ORB needs:

- [x] Identify New York time
- [x] Handle daylight saving automatically
- [x] Identify New York trading days
- [x] Know whether a candle is before, inside or after a session
- [x] Collect an opening range
- [x] Freeze the range once complete
- [x] Reset it on the next day
- [x] Validate it against real D1 data
- [x] Manually match it against TradingView

We have **not** yet implemented:

- [ ] Breakout detection
- [ ] Long / short ORB decision logic
- [ ] ORB filters
- [ ] ORB trade signals
- [ ] Actual ORB stop-loss rules
- [ ] Actual ORB take-profit rules

That is intentional. We are constructing the strategy in small, verifiable layers.

---

## 29. The Bigger Product Goal

The long-term idea is a service that can eventually do something like:

```text
                  Pine Script
                       |
                       v
                 Pine Parser
                       |
                       v
              Internal Strategy
                       |
                       v
              Backtest Platform
                       |
             +---------+---------+
             |                   |
             v                   v
       single backtest      parameter sweep
                                 |
                                 v
                         hundreds/thousands
                           of backtests
                                 |
                                 v
                              results
```

A user could eventually paste a TradingView strategy and ask the platform to test combinations such as:

```text
ORB duration:
15 / 30 / 45 / 60 / 90

SL:
5 / 10 / 15 / 20

TP:
10 / 20 / 30 / 40

Trading window:
1 / 2 / 3 / 4 hours
```

The platform could run those combinations over years of data rather than requiring the user to manually repeat TradingView backtests.

We are nowhere near the Pine parser yet. The important point is that the engine underneath is being built so that such a layer could eventually sit on top of it.

---

## 30. Where to Resume Next

Do not add more architecture just for the sake of it.

The next small step should be:

> Give the ORB strategy access to the completed daily opening range and detect when price first breaks above or below it.

Initially, do **not** place a trade. First prove breakout detection itself.

Example:

```text
Opening range:
High 1.16490
Low  1.16397

09:46 candle:
MID high crosses 1.16490

Result:
BREAKOUT ABOVE
```

Once breakout events can be reliably detected against real D1 history and manually compared with TradingView, the breakout can then be connected to the generic trade engine.

---

## 31. What Matters Most When You Come Back to This

There has been a lot of copy and paste, and that is fine at this stage.

You do **not** need to be able to reconstruct every function from memory.

The useful level of understanding is knowing what each building block is responsible for:

- D1 stores the historical market
- Candle Reader gets the requested history
- Backtest Runner moves time forwards
- Strategy Context controls what the strategy can see
- Strategy decides what it wants to do
- Execution models how the trade actually occurs
- Trade records capture the result
- Summary reduces trades into useful metrics
- Time utilities provide generic trading-time concepts
- ORB-specific files contain only ORB-specific behaviour
- Tests prove each piece before the next layer is added

That mental model is enough to continue building the project intelligently, even if much of the implementation is still beyond what you would write unaided.
