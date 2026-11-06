# Swing engine — two hypotheses, written before the runs (6 Nov 2026)

Written and saved before any of the runs below existed. Baseline it is measured against: corporate-action-adjusted five-year history, `reports/backtest-2026-11-05-adjusted.md` (433 trades, +0.01R, profit factor 1.02) and breakouts only (376 trades, +0.04R, profit factor 1.09) from `reports/swing-variants-2026-11-05-adjusted.md`.

Pass mark, unchanged from the README: **expectancy above +0.1R over 300+ trades**. A variant that clears +0.1R on fewer than 300 trades is "promising, not passed" and waits for the ten-year backfill. No parameter is tuned after seeing a result; the robustness rows are fixed here.

## Hypothesis 1 — regime-gated breakouts (README owner item 1)

**Claim.** Every positive swing year was a rising one, so taking 52-week breakouts only while the Nifty 50 is above its 200-day average should lift breakouts-only expectancy from +0.04R to above +0.1R, mainly by removing the losing stretches of 2022, 2024–25.

**Rule.** `--setups breakout --set gate=200`. A signal produced at the close of day *i* becomes an order only if the gate is open on day *i*, using the momentum engine's own `gateAt` (index close above its N-day simple average, latest index bar within 10 bars, breadth fallback). Only data up to day *i* is used. Gate closed or not yet computable (fewer than N index bars) → no new order. Open positions are not touched by the gate; they leave on their normal exits.

**Fair comparison.** The gate cannot be computed for roughly the first 200 bars of the history, so the ungated breakouts-only run is repeated from the first date the gate is defined, and the gated run is judged against that same-window figure as well as against the pass mark.

**Robustness (fixed in advance).** Gate length ±20%: 160 and 240. The result should not depend on the exact length.

**What would count against it even with a good average.** Fewer than 300 trades; one year carrying the whole result (the 2023 problem again); a 160/240 row that flips sign.

## Hypothesis 2 — enter at the signal day's close (ROADMAP item 8)

**Claim.** The buy-stop next day pays up for confirmation: it fills at or above 0.3% over the prior high, often on a gap. Buying at the signal day's close (the breakout has already closed above the level) should give a better entry price and a better result.

**Rule.** `--set fill=close`. An act signal on day *i* is filled at day *i*'s close instead of becoming tomorrow's buy-stop. The stop stays at the engine's stop price; risk is fill − stop and the target is fill + 2 × that risk (the same treatment the script already gives a gap-up fill). Slot, sector, score-order, cost and exit rules unchanged. Exits start on day *i* + 1.

**Primary comparison.** Breakouts only, close fill versus next-day buy-stop — the breakout is the setup whose trigger (a close above the level) is complete at the close. **Secondary:** all setups. For pullback buys a close fill removes the confirmation the rule asks for (a reclaim of the day's high), so that row tests a different rule, and is reported as such.

**Known optimism.** The signal uses the full day's bar (close, volume, candle, sector board). A 14:45 run would see none of those final values, and daily bars cannot test a 14:45 price. A pass here is therefore necessary but not sufficient; a fail settles it.

**Decision rule.** Build the 14:45 run only if the close fill passes the mark, or beats the next-day fill by a margin that survives in at least three of the five calendar years.

## Combination, for the record only

Breakouts only + gate 200 + close fill. Reported, not used to claim a pass unless both single changes help on their own.
