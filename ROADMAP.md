# Roadmap

What the engine does today, what was deliberately left out, and what comes next. The guiding rule: every addition must earn its place in the backtest. An indicator that doesn't move expectancy gets removed, however sophisticated it looks.

## Done

**History foundation.** `scripts/backfill.mjs` loads years of daily bars from NSE's archives into `data/history/`; the daily job appends to the same files. Every rule below runs on bars, so the website, the Telegram digest and the backtest share one code path (`engine.js → analyzeAt`).

**Relative strength.** Each stock's 20-day return minus the Nifty's (or the universe median when index bars are missing), ranked as a percentile across the universe. Top 30% adds to the score; bottom 30% subtracts. The sector board also averages it, so "leadership" now means outperforming the index, not merely rising.

**Moving-average trend filter.** Price above the 20-day above the 50-day is "aligned up" (+10). Below both is a downtrend (−10, and an automatic Avoid when 30-day change is also negative). Pullback buys must hold within 2% of the 20-day average.

**ATR-based stops.** Breakouts: 2 × ATR(14) below entry (floor 2%). Pullbacks: half an ATR below the structural low. Falls back to the old range-based rule when ATR isn't available yet.

**RSI extension check.** RSI(14) ≥ 75 subtracts 15 from the score; chasing extended names is the most common way the breakout rule loses money.

**Candlestick confirmation.** Hammer, bullish/bearish engulfing, shooting star, inside bar, doji, strong/weak close. Used only as confirmation at an entry the other rules already like: bullish +5, bearish −10. Never a signal on their own, because in isolation they have little predictive value.

**Setup score (0–100).** Base 50 plus the adjustments above. Shown on every row, drives the sort order and the Telegram digest, and an Act-now setup scoring below 50 is downgraded to an alert. Confidence labels: High ≥ 70, Medium ≥ 55, Low otherwise.

**Walk-forward backtest.** `scripts/backtest.mjs` replays the rules day by day with next-day fills, gap handling, breakeven stop moves, position and sector limits, time stops and round-trip costs, and reports expectancy, profit factor, drawdown, and breakdowns by setup, score band and year.

## Next (in order of expected value)

1. **Run the backtest on real history and prune.** The thresholds (2% from the 52-week high, 3% impulse day, 2 × ATR, score cut-off at 50) are conventions, not fitted values. Sweep each with `--set`, keep what improves out-of-sample expectancy, drop what doesn't. Check that the score bands separate: 70+ should beat 50–59 clearly, or the score is decoration.
2. **Corporate-action adjustment.** Pull NSE's corporate-action list and adjust history for splits and bonuses so the backtest stops seeing phantom crashes.
3. **Point-in-time universe.** Store historical Nifty 500 membership so the backtest only trades names that were in the index at the time (removes survivorship bias).
4. **Earnings-date awareness.** Flag setups with results due within the holding window; many breakout failures cluster there.
5. **Exit refinements, tested one at a time.** Trailing stop on the 20-day average after +2R; partial profit at the first target; volatility-scaled holding period.
6. **Alert on price, not just on the close.** A lightweight intraday check (one extra run at 14:45 IST) so a breakout that is confirming into the close reaches you before the bell rather than after.

## Deliberately not planned

Mean-reversion buys at 52-week lows, Bollinger/Keltner squeezes, Ichimoku, Elliott waves, Fibonacci retracements, options data, and fundamental screens. Each is a different philosophy with its own time horizon. Mixing them into one page produces a dashboard where something is always green and nothing is accountable. If one of them interests you, build it as a separate engine with its own backtest rather than bolting it onto this one.
