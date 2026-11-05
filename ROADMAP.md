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

**Relationship-stocks engine (Oct 2026).** `pairs.js` + `scripts/backtest-pairs.mjs`: 33 curated pairs, Engle–Granger cointegration test, half-life, 30-bar z-score, stretch / break / in-line states. Backtested in both pair-trade and long-only modes: +0.03% per trade after costs at the defaults; 55 of 154 sweep cells positive, clustered only at the 120-bar window. Shipped as a monitor with the verdict on the card. Re-test on five-year history before treating any of it as a signal.

**Momentum engine (Oct 2026).** `momentum.js` + `scripts/backtest-momentum.mjs`: 6-month-minus-1 ranked momentum, top 15, four per sector, monthly rebalance with rank hysteresis, 20% trailing stop, Nifty-above-200-day gate with a breadth fallback. First backtest (May 2025 → Oct 2026, a falling market): +0.7% vs Nifty −7.1%, max drawdown 14%; 83 of 96 sweep cells beat the index over the same window. The site shows the current list; the digest carries it.

**Benchmark guard (Oct 2026).** The daily job was appending NIFTY 500 closes to a NIFTY 50 history series (one phantom −3% day, then a 7% gap). The job now fetches the NIFTY 50 row too, and `buildBars` / `appendSnapshotToHistory` refuse an index bar whose name differs from the series. Five corrupted index days in Oct 2026 were blanked.

**Five-year history and the first real verdicts (30 Oct 2026).** `data/history/` now runs Nov 2021 → Oct 2026 (1,233 days, 501 symbols, loaded from a home connection because NSE's archive refuses cloud IPs). Momentum over Jun 2022 → Oct 2026: +106.9% vs Nifty +39.7%, 18.2% CAGR, 21.3% max drawdown, Sharpe 1.20, 246 trades; by year 19.9 / 54.0 / 9.6 / −1.7 / 3.9% against the index's 10.3 / 20.0 / 8.8 / 10.5 / −12.2%. The rising-market case it was waiting for (2023) is where it earned most, and the gate kept it near flat in a 2026 that fell 12%. The swing rules over Jan 2022 → Oct 2026: 418 trades, −0.08R, profit factor 0.84, −34R total, 38R drawdown, pullbacks −0.12R and breakouts −0.05R, negative in four of five years, half of all exits the 15-day time stop, 70+ score band the worst slice (−0.10R on 384 trades) and 60–69 the best (+0.20R on 24). The two-year result was not noise. Pairs: −0.09% per trade in pair mode, +0.50% long-only, over 245 trades; still a monitor. Reports: `reports/backtest-2026-10-30.md`, `momentum-2026-10-30.md`, `pairs-2026-10-30.md`.

**Swing engine demoted to watch only (5 Nov 2026).** Items 2 and 3 below were tested one change at a time against the five-year baseline (419 trades, −0.08R, profit factor 0.84), with the pass mark fixed in advance at +0.1R over 300+ trades. Dropping the leading-sector (+15) and volume (+10) score points: 428 trades, −0.08R — the 70+ band stayed the worst (−0.13R on 355) and 60–69 the best (+0.20R on 57), so the score orders candidates but creates no edge. Replacing the 15-bar time stop with a close below the 10-day average: 766 trades, −0.06R, drawdown 58R (slots recycle every six bars); below the 20-day: 481 trades, −0.11R. Breakouts only: 383 trades, −0.02R, profit factor 0.97 — the least bad, but +0.18R in 2023 and negative in every other year, a rising-market effect that the momentum engine already captures with a gate. Both combinations were worse (−0.09R, −0.11R). Nothing passed. `engine.DEFAULTS.swingMode = 'watch'`: the site puts the momentum card first and shows setups as levels with paper quantities, the digest leads with the momentum list, and `scripts/backtest.mjs` keeps the variants reproducible (`--set sectorBump= volumeBump= exit=`). Reports: `reports/backtest-2026-11-05.md`, `reports/swing-variants-2026-11-05.md`.

**Walk-forward backtest.** `scripts/backtest.mjs` replays the rules day by day with next-day fills, gap handling, breakeven stop moves, position and sector limits, time stops and round-trip costs, and reports expectancy, profit factor, drawdown, and breakdowns by setup, score band and year. Since Nov 2026 it also takes `--set sectorBump=N`, `--set volumeBump=N` (score points, 0 to drop) and `--set exit=time|ma10|ma20` (time stop or a close below that moving average).

## Next (in order of expected value)

1. ~~Extend the history and re-run~~ Done 30 Oct 2026. ~~Fix the swing engine or demote it~~ Demoted 5 Nov 2026 (see above): neither item 2 nor item 3 got expectancy above +0.1R on 300+ trades, so the swing queue is a watch list and the digest leads with momentum. Re-promotion is `swingMode: 'orders'` in `engine.js`, after a backtest earns it.
2. ~~Make the score earn its place~~ Tested 5 Nov 2026: dropping the leading-sector (+15) and volume (+10) bumps changed nothing (−0.08R either way). Still untested: replacing the score with the backtest's own per-setup hit rate. Low priority — the score orders candidates for four slots; no reordering turns a −0.08R rule set positive.
3. ~~Replace the time stop~~ Tested 5 Nov 2026: a close below the 10-day average −0.06R on 766 trades, below the 20-day −0.11R; neither is a fix because winners do not run far enough for the exit to matter. Still untested: separate slot budgets per setup so breakouts and pullbacks stop crowding each other out (breakouts alone were −0.02R; a budget would not change that, so also low priority).
4. **Corporate-action adjustment.** Pull NSE's corporate-action list and adjust history for splits and bonuses so the backtest stops seeing phantom crashes. Now the first swing-desk item, and it matters for the momentum engine too: an unadjusted bonus looks like a 50% fall and fires the 20% trailing stop.
5. **Point-in-time universe.** Store historical Nifty 500 membership so the backtest only trades names that were in the index at the time (removes survivorship bias).
6. **Earnings-date awareness.** Flag setups with results due within the holding window; many breakout failures cluster there.
7. **Exit refinements, tested one at a time.** Trailing stop on the 20-day average after +2R; partial profit at the first target; volatility-scaled holding period.
8. **Alert on price, not just on the close.** A lightweight intraday check (one extra run at 14:45 IST) so a breakout that is confirming into the close reaches you before the bell rather than after.

## Deliberately not planned

Mean-reversion buys at 52-week lows, Bollinger/Keltner squeezes, Ichimoku, Elliott waves, Fibonacci retracements, options data, and fundamental screens. Each is a different philosophy with its own time horizon. Mixing them into one page produces a dashboard where something is always green and nothing is accountable. If one of them interests you, build it as a separate engine with its own backtest rather than bolting it onto this one.
