# Momentum backtest, by rebalance phase — 2026-11-21-adjusted-members

History 2016-11-07 → 2026-11-20 (2490 days, 895 symbols). Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"gateHoles":5,"gateUnknown":"open","minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":true,"refill":"close","volScale":true,"volWindow":20,"volMedian":250,"volFactor":0.5}. Reinvested runs, that day's NIFTY 500 members.

The engine rebalances every 21 bars counted from its first day, so the day a run starts fixes which days it trades on for the next ten years. Each row below is the same rules, the same prices and the same last day, started one trading day later than the row above — one full cycle of 21 starts. Nothing else differs between the rows. The run on record (the first row, 2017-06-12) is one of them.

| start | trades | total return | CAGR | max DD | Sharpe | win rate | Nifty 50 TR, same window | N200 Momentum 30 TR, same window | N500 Momentum 50 TR, same window |
|---|---|---|---|---|---|---|---|---|---|
| **2017-06-12** | 625 | 287.7% | **15.6%** | 27.3% | 0.87 | 44% | 12.3% | 15.2% | 17.3% |
| 2017-06-13 | 627 | 395.5% | 18.6% | 28.4% | 0.96 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-14 | 626 | 356.4% | 17.6% | 24.6% | 0.93 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-15 | 609 | 360.8% | 17.7% | 24.9% | 0.92 | 47% | 12.3% | 15.4% | 17.4% |
| 2017-06-16 | 606 | 386.1% | 18.4% | 22.9% | 0.95 | 48% | 12.3% | 15.3% | 17.3% |
| 2017-06-19 | 611 | 415.7% | 19.2% | 23.6% | 0.99 | 47% | 12.2% | 15.2% | 17.3% |
| 2017-06-20 | 613 | 447.3% | 20.0% | 24.3% | 1.02 | 48% | 12.2% | 15.2% | 17.3% |
| 2017-06-21 | 613 | 481.8% | 20.7% | 24.7% | 1.05 | 48% | 12.3% | 15.3% | 17.3% |
| 2017-06-22 | 622 | 520.5% | 21.6% | 24.6% | 1.09 | 47% | 12.3% | 15.5% | 17.5% |
| 2017-06-23 | 594 | 449.6% | 20.0% | 27.1% | 1.02 | 46% | 12.4% | 15.7% | 17.7% |
| 2017-06-27 | 603 | 521.6% | 21.6% | 26.1% | 1.08 | 46% | 12.4% | 15.8% | 17.9% |
| 2017-06-28 | 606 | 436.7% | 19.7% | 26.5% | 1.01 | 44% | 12.5% | 15.7% | 17.8% |
| 2017-06-29 | 586 | 362.5% | 17.9% | 26.6% | 0.95 | 45% | 12.5% | 15.6% | 17.8% |
| 2017-06-30 | 592 | 429.4% | 19.6% | 26.5% | 1.03 | 47% | 12.4% | 15.6% | 17.7% |
| 2017-07-03 | 599 | 302.2% | 16.1% | 29.9% | 0.86 | 44% | 12.3% | 15.4% | 17.6% |
| 2017-07-04 | 590 | 418.8% | 19.3% | 25.9% | 0.99 | 47% | 12.3% | 15.4% | 17.6% |
| 2017-07-05 | 603 | 205.3% | 12.7% | 32.9% | 0.71 | 43% | 12.3% | 15.4% | 17.5% |
| 2017-07-06 | 616 | 214.6% | 13.1% | 30.5% | 0.75 | 42% | 12.3% | 15.3% | 17.5% |
| 2017-07-07 | 610 | 227.6% | 13.6% | 30.3% | 0.81 | 46% | 12.3% | 15.4% | 17.5% |
| 2017-07-10 | 608 | 281.0% | 15.5% | 32.0% | 0.84 | 44% | 12.2% | 15.3% | 17.5% |
| 2017-07-11 | 610 | 345.2% | 17.4% | 26.3% | 0.91 | 45% | 12.1% | 15.3% | 17.5% |

## The spread

CAGR across the 21 starts: **12.7% to 21.6%**, median **18.4%**, middle half 16.1% to 19.7%, mean 17.9%, standard deviation 2.6%. Sharpe 0.71 to 1.09, median 0.95. Max drawdown 22.9% to 32.9%, median 26.5%.

- **NIFTY 50** (12.1% to 12.5% a year over the same windows): the engine is ahead in **21 of 21** starts, and ahead by two points or more in 18.
- **NIFTY200 MOMENTUM 30** (15.2% to 15.8% a year over the same windows): the engine is ahead in **18 of 21** starts, and ahead by two points or more in 15.
- **NIFTY500 MOMENTUM 50** (17.3% to 17.9% a year over the same windows): the engine is ahead in **14 of 21** starts, and ahead by two points or more in 5.

## How to read this

One row is one draw. A difference between two versions of the rules, or between the engine and an index, that is smaller than this spread is not a finding — the same rules differ from themselves by that much when the calendar moves by a day. Compare medians, or count starts, and treat the single run on record as what it is: the row that happens to begin on 2017-06-12. The live paper book is one row too: it began on the day it began.

An index fund has no such row: it rebalances on published dates and holds the result. That is part of what "the fund is the holding" buys.