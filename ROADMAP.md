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

**52-week breakout trigger fixed (Oct 2026).** The level a breakout must clear is now the 52-week high *before today*; NSE's 52W H field and a window ending today both include today's own bar, which made "closed above the 52-week high" impossible and silently disabled the setup on the site and in the backtest. A close more than 4% through the level is flagged extended rather than ordered.

**Walk-forward backtest.** `scripts/backtest.mjs` replays the rules day by day with next-day fills, gap handling, breakeven stop moves, position and sector limits, time stops and round-trip costs, and reports expectancy, profit factor, drawdown, and breakdowns by setup, score band and year.

## Next (in order of expected value)

1. **Extend the history and re-run.** The first real backtest (`reports/backtest-2026-10-24.md`) covers Jan 2025 – Oct 2026: 157 trades, −0.06R expectancy, inside the noise. Two years cannot rank configurations. Run `node scripts/backfill.mjs --years 5`, re-run the backtest, and only then prune: the thresholds (2% from the 52-week high, 3% impulse day, 2 × ATR, score cut-off at 50) are still conventions.
2. **Make the score earn its place.** In every run so far the 70+ band had the worst expectancy and 60–69 the best. Test dropping the leading-sector (+15) and volume (+10) bumps for breakouts, or replacing the score with the backtest's own per-setup hit rate.
3. **Replace the time stop.** Half of all exits are 15-day time stops. Test a trailing exit (close below the 10- or 20-day average) one change at a time, and separate slot budgets per setup so breakouts and pullbacks stop crowding each other out.
4. **Corporate-action adjustment.** Pull NSE's corporate-action list and adjust history for splits and bonuses so the backtest stops seeing phantom crashes.
5. **Point-in-time universe.** Store historical Nifty 500 membership so the backtest only trades names that were in the index at the time (removes survivorship bias).
6. **Earnings-date awareness.** Flag setups with results due within the holding window; many breakout failures cluster there.
7. **Exit refinements, tested one at a time.** Trailing stop on the 20-day average after +2R; partial profit at the first target; volatility-scaled holding period.
8. **Alert on price, not just on the close.** A lightweight intraday check (one extra run at 14:45 IST) so a breakout that is confirming into the close reaches you before the bell rather than after.

## Deliberately not planned

Mean-reversion buys at 52-week lows, Bollinger/Keltner squeezes, Ichimoku, Elliott waves, Fibonacci retracements, options data, and fundamental screens. Each is a different philosophy with its own time horizon. Mixing them into one page produces a dashboard where something is always green and nothing is accountable. If one of them interests you, build it as a separate engine with its own backtest rather than bolting it onto this one.
