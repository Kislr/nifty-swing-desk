# Momentum refinements — results (13 Nov 2026)

The two hypotheses in `reports/momentum-hypotheses-2026-11-13.md` (written and committed before `momentum.js` had either option), run on the full point-in-time NIFTY 500 membership, ten corporate-action-adjusted years, reinvested, against NSE's total-return indices. History 2016-11-07 → 2026-11-12 (2,474 days, 895 symbols); test window 2017-06-12 → 2026-11-12. The baseline reproduces the 12 Nov verdict trade for trade (526 of 526 fixed-slot trades identical; one more day of history).

**Pass mark, fixed in advance:** reinvested CAGR ≥ 19.3% (NIFTY500 MOMENTUM 50 TR 17.3% + 2 points) **and** Sharpe > 0.88, on the membership.

## The four rows

| run | trades | total return | CAGR | max DD | Sharpe | equity at work | refills | half-size buys | vs N500 Momentum 50 TR |
|---|---|---|---|---|---|---|---|---|---|
| baseline (defaults, reinvested) | 527 | 228.2% | 13.6% | 30.5% | 0.71 | 75% | — | — | −3.6 a year |
| **(a) `refill=close`** | 608 | 427.7% | **19.6%** | 30.3% | **0.89** | 83% | 258 (42%) | — | **+2.3 a year — at the bar** |
| (b) `volScale=true` | 524 | 207.6% | 12.8% | 24.8% | 0.79 | 61% | — | 252 (48%) | −4.4 a year |
| (c) both | 609 | 392.7% | 18.7% | 27.3% | 0.98 | 68% | 257 | 295 | +1.4 a year — short of the bar |
| NIFTY 50 TR | — | 194.5% | 12.3% | 38.3% | 0.79 | | | | |
| NIFTY200 MOMENTUM 30 TR | — | 275.6% | 15.2% | 34.0% | 0.82 | | | | |
| NIFTY500 MOMENTUM 50 TR | — | 342.5% | 17.3% | 38.1% | 0.88 | | | | |

Full reports: `momentum-2026-11-13-adjusted-members.md` (baseline), `-refill.md`, `-volscale.md`, `-refill-volscale.md`, each with its `.json` (equity curve with the gate and volatility flags, every trade with its fill type and size).

## By year (reinvested)

| year | baseline | (a) refill | (b) volScale | (c) both | N500 Momentum 50 TR | N200 Momentum 30 TR |
|---|---|---|---|---|---|---|
| 2017 (from Jun) | 21.7% | 29.6% | 20.9% | 29.2% | 26.6% | 21.8% |
| 2018 | −16.6% | −22.0% | −15.2% | −19.8% | −10.7% | −1.7% |
| 2019 | 14.3% | 18.0% | 8.1% | 12.5% | 8.6% | 10.6% |
| 2020 | 27.6% | 38.3% | 26.5% | 43.6% | 21.0% | 20.0% |
| 2021 | 66.5% | 89.8% | 61.6% | 74.1% | 78.9% | 53.8% |
| 2022 | −17.6% | −5.1% | −6.5% | 2.5% | −7.6% | −5.4% |
| 2023 | 52.6% | 58.1% | 47.2% | 56.7% | 47.7% | 41.7% |
| 2024 | 21.7% | 35.4% | 8.2% | 17.8% | 27.2% | 21.3% |
| 2025 | −13.6% | −16.0% | −8.6% | −9.2% | −7.6% | −4.6% |
| 2026 (to 12 Nov) | 0.7% | −1.3% | −0.4% | −1.6% | 3.8% | −0.9% |

Refill beats the baseline in seven of ten years and loses in the three falling ones (2018, 2025, 2026): more capital in the market when the stops are firing, as predicted. Volatility scaling does what it says in 2018, 2022 and 2025 and gives back 2019, 2021 and 2024. The volatility flag was on for 50% of test days by construction (it is a median), but unevenly: 12% of 2017, 62% of 2018, 61% of 2020, 15% of 2023, 79% of 2024, 74% of 2026 so far.

## What the refill buys actually were

258 refills in the (a) row, 42% of all trades; rebalance buys fell from 527 to 350 because a slot filled at the close is not free at the next rebalance. 101 refills followed a rebalance that found the gate closed (the "buy when the gate reopens" half; ₹4.4 lakh of P&L) and 157 followed a trailing stop with the gate open (₹5.5 lakh). Refill buys were the better trades: +5.7% average return and 53% winners against +5.1% and 42% for rebalance buys in the same run (baseline: +4.6%, 43%). The plausible mechanism is not look-ahead but timing: a trailing stop fires on a down day, so the replacement is bought into a dip, and a gate reopening is the index crossing above its 200-day average. 26 refills re-bought a name the engine had exited within the previous 21 bars (₹0.9 lakh, positive); none re-bought a name at the close it was sold. Gate-open days with a short book fell from 796 to 24. Exits: 266 rank drops, 219 trailing stops, 97 ineligible, 11 stopped trading, 15 open at the end.

Look-ahead checks done before reading the number: rankings, membership filter, gate and volatility flag all read bars up to and including the buy day (the volatility flags computed on a series cut at bar k equal the full series' flags up to k — a test in `scripts/test.mjs` now asserts it); fills are at the close plus half the round-trip cost, as at rebalances; the fixed-slot companion row moves the same way (11.1% → 13.3%, Sharpe 0.78 → 0.91), so it is not a compounding artefact.

## Robustness — where the pass comes from

The pass is by 0.3 points of CAGR and 0.01 of Sharpe. The hypothesis said a pass is read against the by-year table before the headline, so two more readings, neither of them tuning:

**Two halves, each run cold from its first day (fresh ₹5 lakh, the engine's own warm-up already behind it):**

| window | baseline | (a) refill | (b) volScale | (c) both | N500 Momentum 50 TR |
|---|---|---|---|---|---|
| Jun 2017 → Dec 2021 | 22.1% / Sharpe 1.02 / DD 26.9% | **28.8% / 1.16 / 30.3%** | 19.9% / 1.12 / 22.7% | 26.8% / 1.21 / 27.3% | 24.2% / 1.16 / 38.1% |
| Jan 2022 → Nov 2026 | 8.0% / 0.49 / 34.3% | 7.8% / 0.46 / 32.4% | 9.2% / 0.65 / 25.9% | 8.1% / 0.57 / 22.4% | 10.9% / 0.61 / 31.6% |

**Start-date sensitivity, each run cold from 1 January to 12 Nov 2026:**

| start | baseline | (a) refill | (c) both | N500 Momentum 50 TR | (a) clears the bar? |
|---|---|---|---|---|---|
| 2018 | 7.2% / 0.46 | 9.9% / 0.54 | 12.5% / 0.74 | 15.3% / 0.79 | no |
| 2019 | 18.4% / 0.84 | 22.4% / 0.96 | 22.1% / 1.10 | 19.1% / 0.94 | **yes** (+3.3, Sharpe 0.96) |
| 2020 | 12.4% / 0.62 | 19.8% / 0.87 | 20.8% / 1.02 | 20.7% / 0.97 | no |
| 2021 | 13.7% / 0.67 | 17.8% / 0.79 | 19.4% / 0.94 | 20.4% / 1.01 | no |
| 2022 | 8.0% / 0.49 | 7.8% / 0.46 | 8.1% / 0.57 | 10.9% / 0.61 | no |
| 2023 | 8.7% / 0.51 | 9.8% / 0.55 | 10.0% / 0.65 | 16.5% / 0.86 | no |

Read together: **refill is a real improvement to the engine** — above the baseline in the full window, in the first half and in five of six later starts, with the same drawdown and a higher Sharpe — **but it does not robustly clear the index fund.** It clears the written bar on the full window (by 0.3) and from a 2019 start (by 3.3), and misses from every other start, by 1 to 7 points. All of its lead over the fund is earned in 2017–2021; started in or after 2020 the engine with refill is level with or behind the fund in every window. Volatility scaling is the robust one in a different sense: it cuts the maximum drawdown by 6 to 12 points in every window, lifts Sharpe in every window, and in the 2022–2026 half it is the only row above the baseline on return — at a cost of about a point of CAGR when used alone, and roughly nothing when used with refill.

A second thing the start-date table says, about the engine rather than the refinements: a cold start in January 2022 or 2023 earns 8–9% a year while the same rules running since 2017 made 52.6% in calendar 2023 — the result depends heavily on what the book was holding when the year began. An index fund does not have that property. The by-year columns above are therefore read as the record of one path, not as what a new investor would have got.

## Decision, per the rule written first

The rule said: pass → the option becomes the default; fail → the options stay in the code, off, and the standing reading becomes option (a) of the 12 Nov marker. Row (a) passes the written mark on the primary run and fails the robustness reading the same document asked for (the pass depends on the start date as the 12 Nov result did not). So:

1. **Nothing is promoted by this session.** `refill` and `volScale` stay in `momentum.js`, off by default, reproducible with `--set refill=close` and `--set volScale=true`. The verdict of 12 Nov — the engine does not beat the investable version of its own idea — stands on every window that starts in 2020 or later.
2. **If the engine is kept at all, it should run with both options on.** That is the owner's call, written here as a recommendation and not applied: refill + volScale is better than the baseline in every one of the nine windows tested on return, drawdown and Sharpe together, and the only configuration whose maximum drawdown (22–27%) is clearly below the momentum index fund's (32–38%) in every window. It would make the live rule "fill a free slot at today's close when the gate is open; half size when the Nifty's 20-day volatility is above its one-year median", which the digest does not yet say and the positions card (owner item) is where it would appear.
3. The engine's list of hypotheses is now empty, as decided on 12 Nov: lookback, topN and trail are not tuned, and no third refinement is added behind these two.

## Also found and fixed

`M.simulate` closed positions still open at `--to` at the last bar of the whole history, not the last bar inside the window, so a windowed run's end-of-data trades were marked at 2026 prices (the equity curve, and so CAGR / drawdown / Sharpe, were unaffected — only the trade list and the trade-level figures). Fixed (`lastI`), with a test. The full-window reports are unchanged by it.
