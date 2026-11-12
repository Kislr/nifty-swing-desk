# Point-in-time NIFTY 500 membership — written before the runs (12 Nov 2026)

Written and saved before any membership-filtered backtest existed. Baselines, ten-year corporate-action-adjusted history on today's 501 constituents: momentum `reports/momentum-2026-11-12-adjusted.md` — reinvested +717.3%, 25.3% CAGR, 27.0% max drawdown, Sharpe 1.19, 469 trades, against NIFTY500 MOMENTUM 50 TR 17.3% a year and NIFTY200 MOMENTUM 30 TR 15.2%; swing pullbacks inside the momentum top 30 `reports/swing-universe-2026-11-12-adjusted.md` — 638 trades, +0.16R, profit factor 1.39.

## What is being corrected

Every number above was computed on the names that are in the index *today*. That flatters a momentum engine twice over. First, a name that entered the index in 2021 was being ranked in 2018 on the run-up that got it in — the engine was allowed to buy future winners before the index knew them. Second, the names that fell out of the index (and often out of existence) are absent from the history entirely, so the losers that a live portfolio would have held are not in the record. `data/membership/members.json` (built by `scripts/membership.mjs` from 74 NSE press-release events, all checks clean) says who was in the index on each day; `--members` on both backtests ranks and trades only those names.

Only the first half can be measured now. The history files hold bars for today's constituents only, so names that left the index before the ten-year load have no prices until the owner runs the past-members price load from home. This run therefore removes the future members and nothing else; the second correction is still to come and is expected to push the same way.

## Hypothesis

**The record gets worse; the question is by how much.** Specifically, for the momentum engine: the reinvested CAGR falls, because the engine loses the pre-entry run-ups of future members, which are exactly the kind of steady riser the 126-day ranking rewards. For the swing pullback result: expectancy falls for the same reason and the trade count falls with it, since on any day the momentum top 30 is being drawn from a smaller pool.

**What would make the correction matter.** For momentum: the engine's lead over the investable index fund (NIFTY500 MOMENTUM 50 TR, 17.3% a year) is 8.1 points on today's constituents. If the first half of the correction takes more than about 4 points of that, the second half, which cannot be measured yet, is likely to take the rest, and the honest reading becomes "the engine matches an index fund, with a desk's effort on top". If it takes less than 2 points, the engine's edge is mostly not survivorship. The numbers 2 and 4 are set here, in advance, so the reading is not chosen after the fact. For the swing pullback slice: the pass mark stays +0.1R over 300+ trades; it was +0.16R over 638 on today's names, so a fall of 0.06R or a loss of more than half the trades fails it, and the re-promotion decided on 12 Nov does not happen.

**Rows, fixed in advance.**

1. Momentum, `--members --benchmarks`, defaults — the primary row, read against the same benchmark table as before (the indices need no correction, which is why they are the yardstick).
2. Swing, `--members --set universe=momentum --setups pullback` — the pullback slice that passed on 12 Nov, now with the momentum ranking and the swing analysis both drawn from that day's members.
3. Swing, `--members` with no other filter, all setups — the whole-universe control, so the pullback slice can still be read against its own baseline.

**What is expected numerically.** Momentum reinvested CAGR somewhere between 19% and 23% (a fall of 2–6 points), drawdown unchanged or slightly worse, trade count similar (the slots still fill, from a slightly worse list). Pullbacks inside the top 30: 450–600 trades, +0.08R to +0.14R.

**What would count against the reading even if the numbers hold.** The by-year table: if the fall is concentrated in 2017–2019, when only 280 of today's 501 names have bars and the members list is thinnest relative to the bars, the measurement is about data coverage, not the engine, and says so. The number of members with bars on each day is in the report's Universe section for that reason.

**Decision rule.** Written here so it is not reinterpreted later. Momentum: the engine stays the live engine whatever this run says, because the gate and stops are what the 2022 column showed and nothing in membership touches them; what changes is the claim — the README's "ahead of the index fund by X a year" is rewritten to the members figure, labelled "future members removed; past members' bars still to load". Pullback slice: pass → re-promotion of momentum pullbacks to orders proceeds as decided on 12 Nov, after the past-members load confirms it; fail → it stays watch-only and the paper record continues.
