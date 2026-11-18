# Momentum: `volAdjust=true` against the paper book's rules — 2026-11-18

Hypothesis, rows and pass mark written first: `reports/momentum-volatility-hypotheses-2026-11-18.md`. History 2016-11-07 → 2026-11-17 (2477 days), corporate-action-adjusted, point-in-time NIFTY 500 membership (74 events), reinvested, 30 bps round trip. Test window 2017-06-12 → 2026-11-17. Baseline parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":true,"refill":"close","volScale":true,"volWindow":20,"volMedian":250,"volFactor":0.5}.

## Full window

| run | trades | total return | CAGR | max DD | Sharpe | win rate | avg bars | equity at work |
|---|---|---|---|---|---|---|---|---|
| row 1 — the paper book's rules | 609 | 388.7% | 18.6% | 27.3% | 0.97 | 46% | 48 | 68% |
| row 2 — `volAdjust=true` | 583 | 305.6% | 16.2% | 25.1% | 1.04 | 49% | 50 | 68% |
| NIFTY500 MOMENTUM 50 TR | — | 342.5% | 17.3% | 38.1% | 0.88 | — | — | — |
| NIFTY 50 TR | — | 194.5% | 12.3% | 38.3% | 0.79 | — | — | — |
| NIFTY200 MOMENTUM 30 TR | — | 275.6% | 15.2% | 34.0% | 0.82 | — | — | — |

## The trades

| run | closed trades | winners | average | average win | average loss | stopped out | avg bars | best tenth: average | best tenth: share of summed returns |
|---|---|---|---|---|---|---|---|---|---|
| row 1 | 594 | 46% | +5.4% | +25.5% | -11.6% | 39% | 49 | +75.5% | 138% |
| row 2 | 568 | 49% | +4.8% | +21.3% | -10.8% | 30% | 52 | +63.6% | 132% |

242 of row 2's 568 closed trades are the same name bought on the same day as in row 1 (43%): the two rankings overlap that much.

## By year

| year | row 1 | row 2 | row 2 − row 1 | N500 Momentum 50 TR | Nifty 50 |
|---|---|---|---|---|---|
| 2017 | 29.2% | 21.6% | -7.6 | 26.6% | 9.5% |
| 2018 | -19.8% | -15.2% | +4.6 | -10.7% | 3.2% |
| 2019 | 12.5% | 10.9% | -1.6 | 8.6% | 12.0% |
| 2020 | 43.6% | 42.6% | -1.0 | 21.0% | 14.9% |
| 2021 | 74.1% | 79.3% | +5.2 | 78.9% | 24.1% |
| 2022 | 2.5% | 3.3% | +0.8 | -7.6% | 4.3% |
| 2023 | 56.7% | 49.9% | -6.8 | 47.7% | 20.0% |
| 2024 | 17.8% | 11.3% | -6.5 | 27.2% | 8.8% |
| 2025 | -9.2% | -8.9% | +0.4 | -7.6% | 10.5% |
| 2026 | -2.4% | -11.6% | -9.2 | 3.8% | -2.8% |

## Six cold starts

Each run starts with fresh capital on the first trading day on or after the date and runs to the end of the history; the fund is measured over the same days.

| start | row 1 CAGR | row 2 CAGR | N500 Momentum 50 TR | row 2 − fund | row 1 Sharpe | row 2 Sharpe | row 1 max DD | row 2 max DD | row 2 ahead of the fund? |
|---|---|---|---|---|---|---|---|---|---|
| 2018-01-01 | 12.3% | 15.4% | 15.3% | +0.1 | 0.73 | 0.89 | 27.2% | 25.6% | yes |
| 2019-01-01 | 21.9% | 20.8% | 19.1% | +1.7 | 1.09 | 1.25 | 22.1% | 26.1% | yes |
| 2020-01-01 | 20.6% | 21.7% | 20.7% | +1.0 | 1.02 | 1.14 | 25.8% | 26.0% | yes |
| 2021-01-01 | 19.2% | 21.0% | 20.4% | +0.6 | 0.93 | 1.08 | 22.5% | 22.6% | yes |
| 2022-01-01 | 7.9% | 8.2% | 10.9% | -2.8 | 0.55 | 0.62 | 22.4% | 20.9% | no |
| 2023-01-01 | 9.8% | 10.2% | 16.5% | -6.3 | 0.64 | 0.71 | 24.9% | 24.1% | no |

## Against the written pass mark

| condition | row 2 | met? |
|---|---|---|
| CAGR at least 19.3% (the fund's 17.3% over this window + 2 points) | 16.2% | **no** |
| Sharpe above row 1's 0.97 | 1.04 | yes |
| ahead of NIFTY500 MOMENTUM 50 TR in at least 4 of 6 cold starts | 4 of 6 | yes |
| no calendar year above 40% of the log return | 2021: 42% | **no** |

**Verdict by the rule written first: FAIL** (2 of 4 conditions).

