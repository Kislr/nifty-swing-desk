# Momentum refinements — written before the runs (13 Nov 2026)

Written and saved before either option existed in `momentum.js`. These are the engine's last two hypotheses (README queue item 5, 12 Nov 2026), run because the owner asked for the next item on the list and the README's own marker said the session starts with the choice between (a) monitor + index fund, (b) these two tests, (c) the swing entries. (b) was taken because it is the only one that can still change the verdict.

Baseline, the full-membership verdict of 12 Nov 2026 (`reports/momentum-2026-11-12-adjusted-members.md`, reproduced in this session on history to 12 Nov with identical figures): momentum reinvested +228.2%, **13.6% a year**, 30.5% max drawdown, **Sharpe 0.71**, 527 trades, 75% of equity at work, Jun 2017 → Nov 2026. Yardsticks over the same window: NIFTY500 MOMENTUM 50 TR 17.3% a year / Sharpe 0.88 / drawdown 38.1%; NIFTY200 MOMENTUM 30 TR 15.2% / 0.82 / 34.0%; NIFTY 50 TR 12.3% / 0.79 / 38.3%.

## Pass mark, fixed on 12 Nov and repeated here

A refinement passes only if the reinvested run on the full membership (`--members --benchmarks`) **beats NIFTY500 MOMENTUM 50 TR by 2 points a year — 19.3% or better — with Sharpe above 0.88.** Both conditions, on the same run. That is a 5.7-point climb from 13.6%, and it is written down here so nobody is tempted to call +1 point a success: an index fund is the alternative, and a desk has to pay for itself.

A result that misses the mark but moves in the predicted direction is recorded as what it is — a measurement — and does not become the default.

## What is being tested

**(a) Refill freed slots at the next close.** Today a slot freed by the trailing stop stays empty until the next monthly rebalance (up to 20 bars), and when the gate is closed on a rebalance day nothing is bought until the next one even if the gate reopens the day after. On 813 of the 1,708 gate-open test days the book held fewer than 15 names (13.6 on average on those days). The change: on any day the gate is open and the book holds fewer than `topN` names, rank at that day's close and fill the free slots from the top of the list, under the same sector cap and the same `holdRank` hysteresis for exits (exits are unchanged: rank drops are still judged at rebalances only). Under `compound` the slot for such a buy is current equity ÷ topN on that day. Nothing else changes: lookback, skip, topN, holdRank, trail, gate are untouched, and a stopped-out name may be re-bought only if it is still ranked and eligible (the 20%-off-high screen will usually have removed it).

Option: `refill: 'close'` (default stays `'rebalance'`, which reproduces today's figures exactly).

**(b) Volatility-scaled sizing.** The momentum-crash literature's fix: momentum's worst months come when market volatility is high, and the 200-day gate is the crude version of that filter. The change: new buys are sized at half the slot while the NIFTY 50's realised volatility over the last 20 bars is above the median of that same 20-bar volatility over the trailing 250 bars. Realised volatility = standard deviation of daily close-to-close returns over 20 bars; the median needs 250 such values, so on days before the series exists the full slot is used (the test window starts after a 147-bar warm-up and the history starts seven months earlier, so this affects the first few months of 2017 only). Positions already open are not resized; exits are unchanged. The threshold (median) and the factor (half) are fixed here and will not be tuned.

Option: `volScale: true` (default `false`).

**(c) Both together** — one row, because the two touch different things (how often slots are filled; how large the fills are) and the owner would run them together if both helped.

## Rows, fixed in advance

All on the full membership, ten adjusted years, reinvested (`--set compound=true --members --benchmarks`), reported with the same benchmark table as the verdict:

1. `--set refill=close`
2. `--set volScale=true`
3. `--set refill=close --set volScale=true`
4. The baseline (defaults), re-run on the same history as a check that nothing moved.

For context only — never for the verdict — the same three on today's constituents (no `--members`), so the direction of each change can be seen on the survivorship-biased data too. If a change helps on today's names and hurts on the membership, that is a sign it is fitting the survivors.

## What is expected numerically

**(a)** A small gain in return and a larger turnover: CAGR 13.6% → somewhere in 13–16%; trades 527 → 600–800 (more re-fills, some of them whipsaws); equity at work 75% → 80–88%; drawdown about the same or a little worse, because more capital is in the market when stops are firing. Sharpe roughly unchanged. The gain, if any, should come from the years when the gate reopened mid-cycle (2020 after March, 2023) and from fewer idle slots in 2021.

**(b)** Lower drawdown and a somewhat higher Sharpe, with CAGR flat or lower: CAGR 11–14%; drawdown 30.5% → 22–28%; Sharpe 0.71 → 0.75–0.90; equity at work falls toward 60–65%. The years that should improve are 2018, 2022 and 2025 (the losing years, all with volatility above median for long stretches); 2021 and 2023 should give back some return.

**(c)** Between the two, 12–16% CAGR, Sharpe 0.75–0.90.

**None of the three is expected to reach 19.3% with Sharpe above 0.88.** The honest prior is that (a) adds under two points and (b) trades return for drawdown; the verdict of 12 Nov stands and these are the measurements that close the question. That expectation is written here so that if a row does pass, it is read with suspicion first (check the trade list for look-ahead, check that the gate and the volatility series use only bars up to that day) and with pleasure second.

## What would count against a reading even if a number passes

- A pass that depends on one year (2020 or 2021 contributing most of the gain) — the by-year table is read before the headline.
- A pass on today's constituents that disappears on the membership — fitting survivors.
- For (a): a trade count that more than doubles, meaning the change has turned a monthly engine into a daily one and the cost model (30 bps round trip) is now the thing being tested.
- For (b): the volatility series must be computed from index bars up to and including the sizing day only; the report's JSON carries the equity curve so the exposure can be checked against the gate and the volatility flag.

## Decision rule

Pass (row 1, 2 or 3 at 19.3%+ with Sharpe > 0.88, on the membership, not carried by one year): the option becomes the default in `momentum.DEFAULTS`, the site and the digest follow automatically because they call `selectAt` daily already, the README's claim is rewritten to the new figures, and the positions card (owner item) is built next so the daily refill is actually actionable.

Fail (every row short of the mark): the options stay in the code, off, so the runs are reproducible; the result goes into the README and ROADMAP as the close of queue item 5; the engine has no hypotheses left on the list, so the standing reading becomes option (a) of the 12 Nov marker — the desk is a monitor and the investable alternative is the momentum index fund — unless the owner ranks the swing entries (6) next. Nothing is promoted either way, and lookback / topN / trail are not tuned, as decided on 12 Nov.
