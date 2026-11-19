# Momentum backtest — 2026-11-19-adjusted-members

History 2016-11-07 → 2026-11-18 (2478 days, 895 symbols). Test window 2017-06-12 → 2026-11-18. Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":false,"refill":"close","volScale":true,"volWindow":20,"volMedian":250,"volFactor":0.5}. Capital ₹5,00,000, equal weight ₹33,333 per name at the start for the whole run.



## Overall

| run | trades | total return | CAGR | Nifty (same period) | max DD | Sharpe | win rate | avg bars | time in market | equity at work |
|---|---|---|---|---|---|---|---|---|---|---|
| momentum, fixed slots | 608 | 209.0% | 12.9% | 162.3% | 23.9% | 1.03 | 46% | 48 | 92% | 41% |
| momentum, reinvested (compound) — same rules | 609 | 386.6% | 18.5% | 162.3% | 27.3% | 0.97 | 46% | 48 | 92% | 68% |
| NIFTY 50 (total return index) | — | 194.5% | 12.3% | — | 38.3% | 0.79 | — | — | — | — |
| NIFTY200 MOMENTUM 30 (total return index) | — | 275.6% | 15.2% | — | 34.0% | 0.82 | — | — | — | — |
| NIFTY500 MOMENTUM 50 (total return index) | — | 342.5% | 17.3% | — | 38.1% | 0.88 | — | — | — | — |

The two rows trade the same signals; only the size of new buys differs. Fixed slots keep every buy at starting capital ÷ topN, so profits pile up as idle cash and, over a long window, CAGR and drawdown are both understated relative to the capital at work ("equity at work" is the average share of equity in open positions). Reinvested sizes each rebalance's buys at current equity ÷ topN — the way the list would actually be run — so it is the row to compare with the Nifty, which compounds too. Trade counts can differ slightly: a bigger or smaller slot changes the cash left for the last buy.

## By year

| year | fixed slots | reinvested | Nifty 50 | Nifty 50 TR | N200 Momentum 30 TR | N500 Momentum 50 TR |
|---|---|---|---|---|---|---|
| 2017 | 27.9% | 29.2% | 9.5% | 10.3% | 21.8% | 26.6% |
| 2018 | -16.5% | -19.8% | 3.2% | 4.6% | -1.7% | -10.7% |
| 2019 | 11.6% | 12.5% | 12.0% | 13.5% | 10.6% | 8.6% |
| 2020 | 37.0% | 43.6% | 14.9% | 16.1% | 20.0% | 21.0% |
| 2021 | 47.8% | 74.1% | 24.1% | 25.6% | 53.8% | 78.9% |
| 2022 | 1.9% | 2.5% | 4.3% | 5.7% | -5.4% | -7.6% |
| 2023 | 22.7% | 56.7% | 20.0% | 21.3% | 41.7% | 47.7% |
| 2024 | 5.7% | 17.8% | 8.8% | 10.1% | 21.3% | 27.2% |
| 2025 | -2.0% | -9.2% | 10.5% | 11.9% | -4.6% | -7.6% |
| 2026 | -1.2% | -2.8% | -3.5% | -2.4% | -0.9% | 3.8% |

"TR" columns are NSE's total-return indices (dividends reinvested); the Nifty 50 column is the price index from the bars. Years are calendar years inside the test window; the first is partial.

## Against NSE's own indices (total return)

Total-return indices from niftyindices.com (`data/benchmarks/`, 30 files stitched by `scripts/benchmarks.mjs`), each measured over the same test window 2017-06-12 → 2026-11-18 with the same arithmetic as the equity curve (CAGR on 250-day years, drawdown on closes, Sharpe without a risk-free rate). The Nifty 50 column elsewhere in this report is the price index from the daily bars; the total-return version below adds dividends, which is what an index fund actually earns before its own costs. The two momentum indices are the free, survivorship-free, investable version of this engine's idea — index funds and ETFs track both — so the question for each is whether the reinvested row beats it by enough to pay for running a desk.

- **NIFTY 50** — 194.5% total, 12.3% a year, max drawdown 38.3%, Sharpe 0.79. Reinvested run: 386.6%, 18.5% a year, drawdown 27.3%, Sharpe 0.97 — **+6.2% a year ahead of the index**, ahead in 5 of 10 calendar years (Net TR, after dividend tax: 171.0% total).
- **NIFTY200 MOMENTUM 30** — 275.6% total, 15.2% a year, max drawdown 34.0%, Sharpe 0.82. Reinvested run: 386.6%, 18.5% a year, drawdown 27.3%, Sharpe 0.97 — **+3.3% a year ahead of the index**, ahead in 6 of 10 calendar years.
- **NIFTY500 MOMENTUM 50** — 342.5% total, 17.3% a year, max drawdown 38.1%, Sharpe 0.88. Reinvested run: 386.6%, 18.5% a year, drawdown 27.3%, Sharpe 0.97 — **+1.2% a year ahead of the index**, ahead in 5 of 10 calendar years.

Read with three caveats. The engine's row ranks only each day's NIFTY 500 members and 894 of the 895 names that were ever members have bars, so the survivorship correction is complete on both sides: no name is bought before it entered the index, and the names that fell out are in the record. The indices are before fund costs: an index fund or ETF lags its index by its expense ratio and tracking error, which is small for the Nifty 50 and larger for the momentum indices (semi-annual reconstitution, higher turnover). And both momentum indices are back-calculated before their launch — Nifty200 Momentum 30 since 25 Aug 2020, Nifty500 Momentum 50 since June 2024 — so their early years are a published methodology replayed on history, not a live record; the engine's backtest is the same kind of number.

## Universe: point-in-time NIFTY 500 membership

Ranked only the names in the index on each day (`data/membership/members.json`: 74 events, 2017-01-23 → 2026-11-12, built by `scripts/membership.mjs` from NSE's press releases). 895 names were members at some point in that window; 894 of them have bars in the history and 1 do not yet (they left the index before the history was loaded — the owner's price load for past members fills them in). 1 symbols in the history were never members. On the first day of the history 501 of the members had bars. A holding with no close for 20 bars in a row is closed at its last close as "stopped trading" (on today's constituents that is a hole in the history files; after the past-members load it is a delisting). With the past members loaded this is the full correction: no name is ranked before it entered the index, and the names that fell out are in the record.

## Refinements (tested 13 Nov 2026, on by default since)

**Refill at the close** (`refill=close`): on any day the gate is open and the book holds fewer than 15 names, the free slots are filled from that close's ranking instead of waiting for the next rebalance. 257 of the 608 trades (42%) were such refills (companion row: 257). **Volatility-scaled sizing** (`volScale=true`): new buys are 50% of the slot while the index's 20-bar realised volatility is above its trailing 250-bar median. The flag was on for 50% of the test days; 294 of 608 trades (48%) were bought at half size (companion row: 295). Hypotheses, pass mark and decision rule: `reports/momentum-hypotheses-2026-11-13.md`; results `reports/momentum-refinements-2026-11-13-adjusted-members.md`. Open positions are never resized in either option; ranks, gate, trailing stop and rank-drop exits are unchanged. The 12 Nov rules: `--set refill=rebalance --set volScale=false`.

## Exit reasons

- rank drop: 266
- ineligible: 98
- trailing stop: 218
- stopped trading: 11
- end of data: 15

## Best and worst names

Best: ATGL (2×, ₹1,16,567), ADANIENT (3×, ₹1,01,293), DIXON (3×, ₹73,202), ADANIGREEN (5×, ₹52,395), APARINDS (1×, ₹42,930)

Worst: ITI (4×, ₹-15,535), SWANCORP (3×, ₹-12,423), GRSE (2×, ₹-11,876), IDEA (2×, ₹-11,160), CCAVENUE (2×, ₹-10,832)

## How to read this

A momentum portfolio is judged against the index over the same window, on drawdown as much as on return, because the whole point is to be out (gate closed, stops hit) when the market falls. CAGR and Sharpe over fewer than ~3 years are indicative only. Win rate matters less than for the swing engine: momentum makes its money from a few large winners and many small, quick losses — expect 40–50% winners. "Time in market" below 100% is the gate and the stops doing their job; if it is very low the gate is too tight.

Known simplifications: fills at the rebalance close (plus half the round-trip cost); no dividends; survivorship bias if the universe is today's Nifty 500; corporate actions are adjusted only when data/adjustments.json is present (otherwise a bonus or split looks like a crash and trips the trailing stop); under compounding, positions already open keep the size they were bought at — only new buys take the new slot.