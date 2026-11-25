# Momentum backtest, by rebalance phase — 2026-11-25-adjusted-members-norefill-novolscale-closefill

History 2016-11-07 → 2026-11-23 (2491 days, 895 symbols). Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"gateHoles":5,"gateUnknown":"open","minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":true,"refill":"rebalance","volScale":false,"volWindow":20,"volMedian":250,"volFactor":0.5,"bandFill":"off"}. Reinvested runs, that day's NIFTY 500 members.

The engine rebalances every 21 bars counted from its first day, so the day a run starts fixes which days it trades on for the next ten years. Each row below is the same rules, the same prices and the same last day, started one trading day later than the row above — one full cycle of 21 starts. Nothing else differs between the rows. The run on record (the first row, 2017-06-12) is one of them.

| start | trades | total return | CAGR | max DD | Sharpe | win rate | Nifty 50 TR, same window | N200 Momentum 30 TR, same window | N500 Momentum 50 TR, same window |
|---|---|---|---|---|---|---|---|---|---|
| **2017-06-12** | 549 | 195.3% | **12.2%** | 34.1% | 0.70 | 44% | 12.3% | 15.2% | 17.3% |
| 2017-06-13 | 537 | 344.1% | 17.3% | 30.2% | 0.92 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-14 | 525 | 219.2% | 13.2% | 33.9% | 0.74 | 44% | 12.3% | 15.3% | 17.3% |
| 2017-06-15 | 517 | 356.7% | 17.6% | 31.9% | 0.94 | 46% | 12.3% | 15.4% | 17.4% |
| 2017-06-16 | 517 | 379.5% | 18.2% | 25.5% | 0.97 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-19 | 525 | 377.1% | 18.2% | 27.9% | 0.96 | 44% | 12.2% | 15.2% | 17.3% |
| 2017-06-20 | 545 | 305.1% | 16.1% | 34.6% | 0.86 | 48% | 12.2% | 15.2% | 17.3% |
| 2017-06-21 | 540 | 275.9% | 15.2% | 34.9% | 0.82 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-22 | 573 | 380.5% | 18.3% | 29.9% | 0.95 | 47% | 12.3% | 15.5% | 17.5% |
| 2017-06-23 | 540 | 370.1% | 18.0% | 35.2% | 0.93 | 47% | 12.4% | 15.7% | 17.7% |
| 2017-06-27 | 553 | 548.6% | 22.2% | 35.9% | 1.12 | 46% | 12.4% | 15.8% | 17.9% |
| 2017-06-28 | 532 | 340.4% | 17.2% | 34.2% | 0.91 | 43% | 12.5% | 15.7% | 17.8% |
| 2017-06-29 | 512 | 247.6% | 14.3% | 39.6% | 0.78 | 46% | 12.5% | 15.6% | 17.8% |
| 2017-06-30 | 520 | 242.2% | 14.1% | 36.2% | 0.77 | 47% | 12.4% | 15.6% | 17.7% |
| 2017-07-03 | 522 | 237.1% | 13.9% | 38.3% | 0.76 | 44% | 12.3% | 15.4% | 17.6% |
| 2017-07-04 | 520 | 280.3% | 15.4% | 43.1% | 0.82 | 45% | 12.3% | 15.4% | 17.6% |
| 2017-07-05 | 536 | 116.4% | 8.6% | 51.0% | 0.52 | 42% | 12.3% | 15.4% | 17.5% |
| 2017-07-06 | 554 | 156.5% | 10.7% | 40.3% | 0.61 | 41% | 12.3% | 15.3% | 17.5% |
| 2017-07-07 | 527 | 240.1% | 14.1% | 38.4% | 0.78 | 47% | 12.3% | 15.4% | 17.5% |
| 2017-07-10 | 547 | 197.5% | 12.4% | 39.4% | 0.71 | 44% | 12.2% | 15.3% | 17.5% |
| 2017-07-11 | 555 | 216.6% | 13.2% | 34.2% | 0.74 | 46% | 12.1% | 15.3% | 17.5% |

## The spread

CAGR across the 21 starts: **8.6% to 22.2%**, median **15.2%**, middle half 13.2% to 17.6%, mean 15.3%, standard deviation 3.1%. Sharpe 0.52 to 1.12, median 0.82. Max drawdown 25.5% to 51.0%, median 34.9%.

- **NIFTY 50** (12.1% to 12.5% a year over the same windows): the engine is ahead in **18 of 21** starts, and ahead by two points or more in 11.
- **NIFTY200 MOMENTUM 30** (15.2% to 15.8% a year over the same windows): the engine is ahead in **9 of 21** starts, and ahead by two points or more in 6.
- **NIFTY500 MOMENTUM 50** (17.3% to 17.9% a year over the same windows): the engine is ahead in **6 of 21** starts, and ahead by two points or more in 1.

## How to read this

One row is one draw. A difference between two versions of the rules, or between the engine and an index, that is smaller than this spread is not a finding — the same rules differ from themselves by that much when the calendar moves by a day. Compare medians, or count starts, and treat the single run on record as what it is: the row that happens to begin on 2017-06-12. The live paper book is one row too: it began on the day it began.

An index fund has no such row: it rebalances on published dates and holds the result. That is part of what "the fund is the holding" buys.