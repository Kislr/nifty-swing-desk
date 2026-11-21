# Momentum backtest, by rebalance phase — 2026-11-21-adjusted-members-norefill-novolscale

History 2016-11-07 → 2026-11-20 (2490 days, 895 symbols). Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"gateHoles":5,"gateUnknown":"open","minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":true,"refill":"rebalance","volScale":false,"volWindow":20,"volMedian":250,"volFactor":0.5}. Reinvested runs, that day's NIFTY 500 members.

The engine rebalances every 21 bars counted from its first day, so the day a run starts fixes which days it trades on for the next ten years. Each row below is the same rules, the same prices and the same last day, started one trading day later than the row above — one full cycle of 21 starts. Nothing else differs between the rows. The run on record (the first row, 2017-06-12) is one of them.

| start | trades | total return | CAGR | max DD | Sharpe | win rate | Nifty 50 TR, same window | N200 Momentum 30 TR, same window | N500 Momentum 50 TR, same window |
|---|---|---|---|---|---|---|---|---|---|
| **2017-06-12** | 552 | 167.1% | **11.1%** | 31.7% | 0.62 | 44% | 12.3% | 15.2% | 17.3% |
| 2017-06-13 | 542 | 241.3% | 14.0% | 30.0% | 0.71 | 45% | 12.3% | 15.3% | 17.3% |
| 2017-06-14 | 527 | 174.0% | 11.4% | 32.6% | 0.65 | 44% | 12.3% | 15.3% | 17.3% |
| 2017-06-15 | 514 | 250.8% | 14.4% | 29.3% | 0.72 | 47% | 12.3% | 15.4% | 17.4% |
| 2017-06-16 | 521 | 235.5% | 13.8% | 28.6% | 0.75 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-19 | 530 | 279.3% | 15.3% | 29.5% | 0.78 | 45% | 12.2% | 15.2% | 17.3% |
| 2017-06-20 | 549 | 208.9% | 12.8% | 35.0% | 0.66 | 48% | 12.2% | 15.2% | 17.3% |
| 2017-06-21 | 543 | 241.2% | 14.0% | 36.7% | 0.71 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-22 | 567 | 301.1% | 16.0% | 28.7% | 0.76 | 47% | 12.3% | 15.5% | 17.5% |
| 2017-06-23 | 534 | 340.0% | 17.2% | 31.8% | 0.81 | 46% | 12.4% | 15.7% | 17.7% |
| 2017-06-27 | 550 | 485.7% | 20.9% | 34.3% | 0.95 | 45% | 12.4% | 15.8% | 17.9% |
| 2017-06-28 | 513 | 301.9% | 16.1% | 32.5% | 0.78 | 43% | 12.5% | 15.7% | 17.8% |
| 2017-06-29 | 504 | 282.8% | 15.5% | 34.9% | 0.77 | 46% | 12.5% | 15.6% | 17.8% |
| 2017-06-30 | 523 | 316.1% | 16.5% | 34.4% | 0.79 | 48% | 12.4% | 15.6% | 17.7% |
| 2017-07-03 | 517 | 195.7% | 12.3% | 38.6% | 0.64 | 44% | 12.3% | 15.4% | 17.6% |
| 2017-07-04 | 517 | 241.0% | 14.1% | 44.8% | 0.71 | 45% | 12.3% | 15.4% | 17.6% |
| 2017-07-05 | 533 | 119.8% | 8.8% | 46.7% | 0.49 | 42% | 12.3% | 15.4% | 17.5% |
| 2017-07-06 | 546 | 138.7% | 9.8% | 39.3% | 0.54 | 42% | 12.3% | 15.3% | 17.5% |
| 2017-07-07 | 517 | 239.1% | 14.0% | 34.5% | 0.71 | 47% | 12.3% | 15.4% | 17.5% |
| 2017-07-10 | 536 | 149.8% | 10.4% | 40.6% | 0.57 | 43% | 12.2% | 15.3% | 17.5% |
| 2017-07-11 | 551 | 206.9% | 12.8% | 35.0% | 0.69 | 45% | 12.1% | 15.3% | 17.5% |

## The spread

CAGR across the 21 starts: **8.8% to 20.9%**, median **14.0%**, middle half 12.3% to 15.5%, mean 13.9%, standard deviation 2.8%. Sharpe 0.49 to 0.95, median 0.71. Max drawdown 28.6% to 46.7%, median 34.4%.

- **NIFTY 50** (12.1% to 12.5% a year over the same windows): the engine is ahead in **16 of 21** starts, and ahead by two points or more in 8.
- **NIFTY200 MOMENTUM 30** (15.2% to 15.8% a year over the same windows): the engine is ahead in **6 of 21** starts, and ahead by two points or more in 1.
- **NIFTY500 MOMENTUM 50** (17.3% to 17.9% a year over the same windows): the engine is ahead in **1 of 21** starts, and ahead by two points or more in 1.

## How to read this

One row is one draw. A difference between two versions of the rules, or between the engine and an index, that is smaller than this spread is not a finding — the same rules differ from themselves by that much when the calendar moves by a day. Compare medians, or count starts, and treat the single run on record as what it is: the row that happens to begin on 2017-06-12. The live paper book is one row too: it began on the day it began.

An index fund has no such row: it rebalances on published dates and holds the result. That is part of what "the fund is the holding" buys.