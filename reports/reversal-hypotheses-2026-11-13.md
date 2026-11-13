# Short-term reversal — written before the run (13 Nov 2026)

The last swing entry on the list (README queue item 6, second half), written after PEAD failed (`reports/pead-2026-11-13-adjusted-members.md`) and before `scripts/backtest-reversal.mjs` existed. Same discipline: the rule, the rows, the pass mark and the decision are fixed here; the first number is the one that counts.

## The idea, and why it is different from everything tested so far

Every swing entry so far has been a continuation bet — breakouts, pullbacks in leading sectors, momentum names, results drift — and the record says NSE large and mid caps do not continue over days in a way that pays 30 bps. Short-term reversal is the opposite claim: a liquid stock that has fallen hard over a week, inside an uptrend, bounces over the next week. It is the second-best-documented effect in the cross-section after momentum (Jegadeesh 1990, Lehmann 1990; it is also why the momentum engine skips the most recent month), it has a mechanism (liquidity provision: someone has to take the other side of a week of selling and is paid for it), and it is known to be strongest in exactly the names a desk cannot trade cheaply — small, illiquid ones — which is why it has to be tested on the liquid ones, where it may already be arbitraged away. PEAD's table gave a hint in the same direction: heavy-volume reaction days reverted before they drifted.

## The rule (fixed here)

**Universe on day i.** That day's NIFTY 500 members (`data/membership/members.json`; the history holds the past members) ranked by average daily turnover over the last 20 bars; the top 100 is the point-in-time stand-in for the NIFTY 100, which the desk has no membership history for. Of those, the names whose close is above their own 200-day average (the README's "above their 200-day": the bounce is bought inside an uptrend, not in a falling knife).

**Signal at the close of day i.** 5-day return `r5` = close[i] / close[i−5] − 1 in the bottom decile of `r5` across that day's eligible names, and `r5` below zero (a decile of a rising week is not a reversal). With up to 100 eligible names that is at most ten signals a day.

**Trade.** Buy at the next day's open (i+1) plus half the round-trip cost; skipped if that open is more than 3% above day i's close (the setup is gone). Stop = entry − 2 × ATR(14 as of i), floor 2% — the breakout stop, so R means what it means in every other swing report. Exit at the stop when a low touches it (at the open if the open is already below), otherwise at the close of the 5th bar after entry. No target. Costs 30 bps round trip. Expectancy in R = (exit − entry) / (entry − stop).

Nothing else: no RSI, no volume, no index gate (the stock's own 200-day is the regime filter the README named). The mechanics — `trade()`, `summarize()`, `verdict()` — are the PEAD script's, imported, so the two swing event studies are measured identically.

## Rows, fixed in advance

1. **Primary**: as above, 5-bar hold.
2. **Direction control**: the top decile of `r5` among the same eligible names — the continuation bet; reversal predicts it does worse than the primary row.
3. **Base rate**: every eligible name every day is too many; instead the *median* decile (the 5th), same mechanics — what a random liquid uptrending name does over five bars.
4. **Liquidity control**: the primary rule on all members above their 200-day, not only the top 100 by turnover — reversal should be stronger there and costs are understated there; the row shows whether the liquid universe is where the edge dies.
5. **Desk version**: primary rule with at most 4 open, one per sector, the most negative `r5` taken first.
6. Each row reports the mean 5-bar return minus the NIFTY 50's over the same bars.

Information only: the primary rule with 3- and 10-bar holds, and the bottom quintile instead of the decile. One table, no choosing.

## Pass mark

Unchanged: **expectancy ≥ +0.1R over 300 or more trades after costs** on the primary row; mean 5-bar excess over the NIFTY 50 positive in at least six of the calendar years with 20 or more trades; no year above 40% of the total R. The trade count will be large (thousands), so the 300 is not the constraint here; the three conditions are.

## What is expected numerically

Reversal in liquid NSE names after 30 bps: the honest prior is **−0.05R to +0.08R on the primary row**, several thousand trades, hit rate 40–50%, mean 5-bar excess between −0.2% and +0.4%. The direction control should be lower than the primary row (that would at least confirm the sign of the effect even if costs eat it). The liquidity control should be better than the primary row — if it is not, there is no reversal effect to speak of in this data at any liquidity. The desk version, taking the most extreme names first, may be a little better than the primary row or a little worse; either is consistent with the literature.

So the expectation is a fail, with the sign of the effect visible in the controls. A pass would be a surprise and is read with suspicion first: check that the 5-day return uses closes up to day i only, that the turnover ranking uses bars up to day i only, and that the by-year table is not 2020.

## Decision rule

**Pass.** Reversal becomes its own small engine (`reversal.js`, opposite philosophy to `engine.js`, as the ROADMAP's "deliberately not planned" paragraph requires of any mean-reversion idea), run in paper mode for one quarter: a "Reversal buy" block in the digest with entry, stop and the five-bar horizon, a journal setup of the same name, no orders.

**Fail.** The swing queue is empty. Every entry on the list — breakouts, pullbacks, their variants, regime gate, fill test, momentum-filtered pullbacks, results drift, short-term reversal — has been tested against the same +0.1R-over-300 bar and none has cleared it on the full membership. The reading becomes: the desk's swing leg does not exist on this data; the swing setups stay on the site and in the digest as levels to watch, `swingMode` stays `'watch'` for good unless a new idea arrives with its own hypothesis file, and the desk is the momentum paper book beside the index fund. What remains on the list after that is housekeeping and the final audit.
