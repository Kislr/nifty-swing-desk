# Momentum backtest, by rebalance phase — 2026-11-25-adjusted-members-norefill-novolscale

History 2016-11-07 → 2026-11-23 (2491 days, 895 symbols). Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"gateHoles":5,"gateUnknown":"open","minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":true,"refill":"rebalance","volScale":false,"volWindow":20,"volMedian":250,"volFactor":0.5,"bandFill":"both"}. Reinvested runs, that day's NIFTY 500 members.

The engine rebalances every 21 bars counted from its first day, so the day a run starts fixes which days it trades on for the next ten years. Each row below is the same rules, the same prices and the same last day, started one trading day later than the row above — one full cycle of 21 starts. Nothing else differs between the rows. The run on record (the first row, 2017-06-12) is one of them.

| start | trades | total return | CAGR | max DD | Sharpe | win rate | Nifty 50 TR, same window | N200 Momentum 30 TR, same window | N500 Momentum 50 TR, same window |
|---|---|---|---|---|---|---|---|---|---|
| **2017-06-12** | 549 | 169.0% | **11.1%** | 35.7% | 0.65 | 44% | 12.3% | 15.2% | 17.3% |
| 2017-06-13 | 534 | 258.3% | 14.6% | 34.3% | 0.80 | 45% | 12.3% | 15.3% | 17.3% |
| 2017-06-14 | 523 | 158.3% | 10.7% | 37.3% | 0.63 | 44% | 12.3% | 15.3% | 17.3% |
| 2017-06-15 | 515 | 322.4% | 16.6% | 37.1% | 0.89 | 47% | 12.3% | 15.4% | 17.4% |
| 2017-06-16 | 518 | 331.4% | 16.9% | 25.4% | 0.91 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-19 | 524 | 334.5% | 17.0% | 30.1% | 0.91 | 44% | 12.2% | 15.2% | 17.3% |
| 2017-06-20 | 542 | 268.3% | 15.0% | 34.2% | 0.81 | 48% | 12.2% | 15.2% | 17.3% |
| 2017-06-21 | 538 | 257.7% | 14.6% | 36.5% | 0.79 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-22 | 569 | 338.8% | 17.2% | 29.7% | 0.90 | 47% | 12.3% | 15.5% | 17.5% |
| 2017-06-23 | 540 | 334.2% | 17.0% | 35.7% | 0.89 | 46% | 12.4% | 15.7% | 17.7% |
| 2017-06-27 | 549 | 524.7% | 21.7% | 35.7% | 1.10 | 47% | 12.4% | 15.8% | 17.9% |
| 2017-06-28 | 531 | 303.4% | 16.1% | 34.4% | 0.86 | 43% | 12.5% | 15.7% | 17.8% |
| 2017-06-29 | 505 | 230.7% | 13.7% | 39.5% | 0.76 | 46% | 12.5% | 15.6% | 17.8% |
| 2017-06-30 | 518 | 203.9% | 12.7% | 38.4% | 0.70 | 47% | 12.4% | 15.6% | 17.7% |
| 2017-07-03 | 519 | 231.9% | 13.7% | 37.9% | 0.75 | 45% | 12.3% | 15.4% | 17.6% |
| 2017-07-04 | 519 | 247.8% | 14.3% | 43.3% | 0.77 | 45% | 12.3% | 15.4% | 17.6% |
| 2017-07-05 | 534 | 104.1% | 8.0% | 51.3% | 0.49 | 42% | 12.3% | 15.4% | 17.5% |
| 2017-07-06 | 553 | 133.1% | 9.5% | 41.9% | 0.56 | 41% | 12.3% | 15.3% | 17.5% |
| 2017-07-07 | 525 | 211.6% | 13.0% | 38.4% | 0.73 | 46% | 12.3% | 15.4% | 17.5% |
| 2017-07-10 | 539 | 175.2% | 11.5% | 39.8% | 0.66 | 44% | 12.2% | 15.3% | 17.5% |
| 2017-07-11 | 553 | 191.8% | 12.2% | 38.4% | 0.69 | 46% | 12.1% | 15.3% | 17.5% |

## The spread

CAGR across the 21 starts: **8.0% to 21.7%**, median **14.3%**, middle half 12.2% to 16.6%, mean 14.2%, standard deviation 3.1%. Sharpe 0.49 to 1.10, median 0.77. Max drawdown 25.4% to 51.3%, median 37.1%.

- **NIFTY 50** (12.1% to 12.5% a year over the same windows): the engine is ahead in **16 of 21** starts, and ahead by two points or more in 10.
- **NIFTY200 MOMENTUM 30** (15.2% to 15.8% a year over the same windows): the engine is ahead in **7 of 21** starts, and ahead by two points or more in 1.
- **NIFTY500 MOMENTUM 50** (17.3% to 17.9% a year over the same windows): the engine is ahead in **1 of 21** starts, and ahead by two points or more in 1.

## Fill rule at the band (A22)

`bandFill=both` in every row (hypothesis: `reports/momentum-fill-hypothesis-2026-11-25.md`). Series on record for 2343 of the first row's days. Across the 21 starts, sales not made on the day they fell due: 6 to 10 a run (median 8); bars waited in all: 25 to 33; purchases not made: 0 to 5.

## How to read this

One row is one draw. A difference between two versions of the rules, or between the engine and an index, that is smaller than this spread is not a finding — the same rules differ from themselves by that much when the calendar moves by a day. Compare medians, or count starts, and treat the single run on record as what it is: the row that happens to begin on 2017-06-12. The live paper book is one row too: it began on the day it began.

An index fund has no such row: it rebalances on published dates and holds the result. That is part of what "the fund is the holding" buys.