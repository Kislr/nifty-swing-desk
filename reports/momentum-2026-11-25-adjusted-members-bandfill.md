# Momentum backtest — 2026-11-25-adjusted-members-bandfill

History 2016-11-07 → 2026-11-23 (2491 days, 895 symbols). Test window 2017-06-12 → 2026-11-23. Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"gateHoles":5,"gateUnknown":"open","minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":false,"refill":"close","volScale":true,"volWindow":20,"volMedian":250,"volFactor":0.5,"bandFill":"both"}. Capital ₹5,00,000, equal weight ₹33,333 per name at the start for the whole run.



## Overall

| run | trades | total return | CAGR | Nifty (same period) | max DD | Sharpe | win rate | avg bars | time in market | equity at work |
|---|---|---|---|---|---|---|---|---|---|---|
| momentum, fixed slots | 632 | 182.7% | 11.7% | 163.6% | 22.7% | 1.07 | 44% | 46 | 88% | 41% |
| momentum, reinvested (compound) — same rules | 632 | 295.9% | 15.8% | 163.6% | 31.0% | 0.93 | 44% | 46 | 88% | 68% |
| NIFTY 50 (total return index) | — | 194.5% | 12.3% | — | 38.3% | 0.79 | — | — | — | — |
| NIFTY200 MOMENTUM 30 (total return index) | — | 275.6% | 15.2% | — | 34.0% | 0.82 | — | — | — | — |
| NIFTY500 MOMENTUM 50 (total return index) | — | 342.5% | 17.3% | — | 38.1% | 0.88 | — | — | — | — |

The two rows trade the same signals; only the size of new buys differs. Fixed slots keep every buy at starting capital ÷ topN, so profits pile up as idle cash and, over a long window, CAGR and drawdown are both understated relative to the capital at work ("equity at work" is the average share of equity in open positions). Reinvested sizes each rebalance's buys at current equity ÷ topN — the way the list would actually be run — so it is the row to compare with the Nifty, which compounds too. Trade counts can differ slightly: a bigger or smaller slot changes the cash left for the last buy.

## By year

| year | fixed slots | reinvested | Nifty 50 | Nifty 50 TR | N200 Momentum 30 TR | N500 Momentum 50 TR |
|---|---|---|---|---|---|---|
| 2017 | 28.4% | 30.3% | 9.5% | 10.3% | 21.8% | 26.6% |
| 2018 | -15.4% | -18.8% | 3.2% | 4.6% | -1.7% | -10.7% |
| 2019 | 13.1% | 14.9% | 12.0% | 13.5% | 10.6% | 8.6% |
| 2020 | 31.6% | 40.5% | 14.9% | 16.1% | 20.0% | 21.0% |
| 2021 | 56.3% | 98.7% | 24.1% | 25.6% | 53.8% | 78.9% |
| 2022 | -4.0% | -9.3% | 4.3% | 5.7% | -5.4% | -7.6% |
| 2023 | 19.6% | 45.1% | 20.0% | 21.3% | 41.7% | 47.7% |
| 2024 | 4.3% | 12.3% | 8.8% | 10.1% | 21.3% | 27.2% |
| 2025 | -4.1% | -14.6% | 10.5% | 11.9% | -4.6% | -7.6% |
| 2026 | -2.6% | -7.5% | -3.0% | -2.4% | -0.9% | 3.8% |

"TR" columns are NSE's total-return indices (dividends reinvested); the Nifty 50 column is the price index from the bars. Years are calendar years inside the test window; the first is partial.

## Against NSE's own indices (total return)

Total-return indices from niftyindices.com (`data/benchmarks/`, 30 files stitched by `scripts/benchmarks.mjs`), each measured over the same test window 2017-06-12 → 2026-11-23 with the same arithmetic as the equity curve (CAGR on 250-day years, drawdown on closes, Sharpe without a risk-free rate). The Nifty 50 column elsewhere in this report is the price index from the daily bars; the total-return version below adds dividends, which is what an index fund actually earns before its own costs. The two momentum indices are the free, survivorship-free, investable version of this engine's idea — index funds and ETFs track both — so the question for each is whether the reinvested row beats it by enough to pay for running a desk.

- **NIFTY 50** — 194.5% total, 12.3% a year, max drawdown 38.3%, Sharpe 0.79. Reinvested run: 295.9%, 15.8% a year, drawdown 31.0%, Sharpe 0.93 — **+3.5% a year ahead of the index**, ahead in 6 of 10 calendar years (Net TR, after dividend tax: 171.0% total).
- **NIFTY200 MOMENTUM 30** — 275.6% total, 15.2% a year, max drawdown 34.0%, Sharpe 0.82. Reinvested run: 295.9%, 15.8% a year, drawdown 31.0%, Sharpe 0.93 — **+0.6% a year ahead of the index**, ahead in 5 of 10 calendar years.
- **NIFTY500 MOMENTUM 50** — 342.5% total, 17.3% a year, max drawdown 38.1%, Sharpe 0.88. Reinvested run: 295.9%, 15.8% a year, drawdown 31.0%, Sharpe 0.93 — **-1.5% a year behind the index**, ahead in 4 of 10 calendar years.

Read with three caveats. The engine's row ranks only each day's NIFTY 500 members and 894 of the 895 names that were ever members have bars, so the survivorship correction is complete on both sides: no name is bought before it entered the index, and the names that fell out are in the record. The indices are before fund costs: an index fund or ETF lags its index by its expense ratio and tracking error, which is small for the Nifty 50 and larger for the momentum indices (semi-annual reconstitution, higher turnover). And both momentum indices are back-calculated before their launch — Nifty200 Momentum 30 since 25 Aug 2020, Nifty500 Momentum 50 since June 2024 — so their early years are a published methodology replayed on history, not a live record; the engine's backtest is the same kind of number.

## Universe: point-in-time NIFTY 500 membership

Ranked only the names in the index on each day (`data/membership/members.json`: 74 events, 2017-01-23 → 2026-11-12, built by `scripts/membership.mjs` from NSE's press releases). 895 names were members at some point in that window; 894 of them have bars in the history and 1 do not yet (they left the index before the history was loaded — the owner's price load for past members fills them in). 1 symbols in the history were never members. On the first day of the history 501 of the members had bars. A holding with no close for 20 bars in a row is closed at its last close as "stopped trading" (on today's constituents that is a hole in the history files; after the past-members load it is a delisting). With the past members loaded this is the full correction: no name is ranked before it entered the index, and the names that fell out are in the record.

## Refinements (tested 13 Nov 2026, on by default since)

**Refill at the close** (`refill=close`): on any day the gate is open and the book holds fewer than 15 names, the free slots are filled from that close's ranking instead of waiting for the next rebalance. 275 of the 632 trades (44%) were such refills (companion row: 276). **Volatility-scaled sizing** (`volScale=true`): new buys are 50% of the slot while the index's 20-bar realised volatility is above its trailing 250-bar median. The flag was on for 50% of the test days; 311 of 632 trades (49%) were bought at half size (companion row: 311). Hypotheses, pass mark and decision rule: `reports/momentum-hypotheses-2026-11-13.md`; results `reports/momentum-refinements-2026-11-13-adjusted-members.md`. Open positions are never resized in either option; ranks, gate, trailing stop and rank-drop exits are unchanged. The 12 Nov rules: `--set refill=rebalance --set volScale=false`.

## Fill rule at the band (A22)

`bandFill=both`: a sale that falls due on a day a trade-for-trade share (BE / BZ) closed at its lower band — 4.9% or more under the previous close — is not made and is tried at every later close the share has; a purchase of a share at its upper band is not made, and its slot stays empty for the day. Series on record for **2343 of 2343** days of the test window; on the others the rule cannot act.

- sales not made on the day they fell due: **11**, held for 36 locked closes in all; 11 of them sold later, 36 bars late in total (longest: DHANI due 2018-09-25, sold 2018-10-11, 11 bars, -19.48%; TTML due 2022-01-18, sold 2022-02-02, 10 bars, +208.75%; ATGL due 2021-06-30, sold 2021-07-06, 4 bars, -30.55%; FLUOROCHEM due 2022-05-09, sold 2022-05-12, 3 bars, -26.41%; HATHWAY due 2020-07-29, sold 2020-07-31, 2 bars, -13.3%)
- purchases not made: **6**

Hypothesis, written before any run on real series: `reports/momentum-fill-hypothesis-2026-11-25.md`.

## Exit reasons

- rank drop: 270
- trailing stop: 233
- ineligible: 114
- end of data: 15

## Best and worst names

Best: ATGL (5×, ₹93,611), TTML (1×, ₹69,515), ADANIENT (3×, ₹66,562), DIXON (4×, ₹62,450), ADANIGREEN (5×, ₹56,645)

Worst: DHANI (4×, ₹-13,799), BANKINDIA (2×, ₹-13,510), ITI (4×, ₹-11,417), LINDEINDIA (2×, ₹-10,253), MINDTREE (2×, ₹-10,185)

## How to read this

A momentum portfolio is judged against the index over the same window, on drawdown as much as on return, because the whole point is to be out (gate closed, stops hit) when the market falls. CAGR and Sharpe over fewer than ~3 years are indicative only. Win rate matters less than for the swing engine: momentum makes its money from a few large winners and many small, quick losses — expect 40–50% winners. "Time in market" below 100% is the gate and the stops doing their job; if it is very low the gate is too tight.

Known simplifications: fills at the rebalance close (plus half the round-trip cost); no dividends; survivorship bias if the universe is today's Nifty 500; corporate actions are adjusted only when data/adjustments.json is present (otherwise a bonus or split looks like a crash and trips the trailing stop); under compounding, positions already open keep the size they were bought at — only new buys take the new slot.