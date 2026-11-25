# Momentum backtest, by rebalance phase — 2026-11-25-adjusted-members-bandsell

History 2016-11-07 → 2026-11-23 (2491 days, 895 symbols). Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"gateHoles":5,"gateUnknown":"open","minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":true,"refill":"close","volScale":true,"volWindow":20,"volMedian":250,"volFactor":0.5,"bandFill":"sell"}. Reinvested runs, that day's NIFTY 500 members.

The engine rebalances every 21 bars counted from its first day, so the day a run starts fixes which days it trades on for the next ten years. Each row below is the same rules, the same prices and the same last day, started one trading day later than the row above — one full cycle of 21 starts. Nothing else differs between the rows. The run on record (the first row, 2017-06-12) is one of them.

| start | trades | total return | CAGR | max DD | Sharpe | win rate | Nifty 50 TR, same window | N200 Momentum 30 TR, same window | N500 Momentum 50 TR, same window |
|---|---|---|---|---|---|---|---|---|---|
| **2017-06-12** | 632 | 280.0% | **15.3%** | 31.3% | 0.91 | 44% | 12.3% | 15.2% | 17.3% |
| 2017-06-13 | 622 | 397.4% | 18.7% | 30.0% | 1.06 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-14 | 629 | 375.2% | 18.1% | 29.1% | 1.04 | 44% | 12.3% | 15.3% | 17.3% |
| 2017-06-15 | 615 | 433.5% | 19.6% | 24.3% | 1.12 | 46% | 12.3% | 15.4% | 17.4% |
| 2017-06-16 | 596 | 444.0% | 19.8% | 27.4% | 1.14 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-19 | 607 | 445.2% | 19.9% | 26.4% | 1.13 | 46% | 12.2% | 15.2% | 17.3% |
| 2017-06-20 | 614 | 507.4% | 21.3% | 25.6% | 1.19 | 48% | 12.2% | 15.2% | 17.3% |
| 2017-06-21 | 617 | 446.5% | 19.9% | 25.8% | 1.12 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-22 | 634 | 475.6% | 20.6% | 29.7% | 1.17 | 46% | 12.3% | 15.5% | 17.5% |
| 2017-06-23 | 613 | 431.7% | 19.6% | 30.0% | 1.13 | 46% | 12.4% | 15.7% | 17.7% |
| 2017-06-27 | 614 | 506.2% | 21.3% | 28.7% | 1.20 | 46% | 12.4% | 15.8% | 17.9% |
| 2017-06-28 | 623 | 425.4% | 19.5% | 27.7% | 1.10 | 44% | 12.5% | 15.7% | 17.8% |
| 2017-06-29 | 589 | 331.9% | 17.0% | 28.8% | 0.99 | 46% | 12.5% | 15.6% | 17.8% |
| 2017-06-30 | 594 | 399.6% | 18.8% | 28.3% | 1.08 | 47% | 12.4% | 15.6% | 17.7% |
| 2017-07-03 | 601 | 347.6% | 17.5% | 30.6% | 1.01 | 44% | 12.3% | 15.4% | 17.6% |
| 2017-07-04 | 599 | 400.3% | 18.9% | 30.3% | 1.06 | 45% | 12.3% | 15.4% | 17.6% |
| 2017-07-05 | 610 | 202.2% | 12.6% | 37.1% | 0.77 | 42% | 12.3% | 15.4% | 17.5% |
| 2017-07-06 | 617 | 256.5% | 14.6% | 30.4% | 0.86 | 43% | 12.3% | 15.3% | 17.5% |
| 2017-07-07 | 616 | 216.5% | 13.2% | 32.3% | 0.80 | 45% | 12.3% | 15.4% | 17.5% |
| 2017-07-10 | 619 | 265.8% | 15.0% | 34.0% | 0.90 | 44% | 12.2% | 15.3% | 17.5% |
| 2017-07-11 | 614 | 280.5% | 15.5% | 30.7% | 0.93 | 45% | 12.1% | 15.3% | 17.5% |

## The spread

CAGR across the 21 starts: **12.6% to 21.3%**, median **18.8%**, middle half 15.5% to 19.8%, mean 17.9%, standard deviation 2.6%. Sharpe 0.77 to 1.20, median 1.06. Max drawdown 24.3% to 37.1%, median 29.7%.

- **NIFTY 50** (12.1% to 12.5% a year over the same windows): the engine is ahead in **21 of 21** starts, and ahead by two points or more in 19.
- **NIFTY200 MOMENTUM 30** (15.2% to 15.8% a year over the same windows): the engine is ahead in **17 of 21** starts, and ahead by two points or more in 14.
- **NIFTY500 MOMENTUM 50** (17.3% to 17.9% a year over the same windows): the engine is ahead in **13 of 21** starts, and ahead by two points or more in 7.

## Fill rule at the band (A22)

`bandFill=sell` in every row (hypothesis: `reports/momentum-fill-hypothesis-2026-11-25.md`). Series on record for 2343 of the first row's days. Across the 21 starts, sales not made on the day they fell due: 11 to 13 a run (median 12); bars waited in all: 38 to 45; purchases not made: 0 to 0.

## How to read this

One row is one draw. A difference between two versions of the rules, or between the engine and an index, that is smaller than this spread is not a finding — the same rules differ from themselves by that much when the calendar moves by a day. Compare medians, or count starts, and treat the single run on record as what it is: the row that happens to begin on 2017-06-12. The live paper book is one row too: it began on the day it began.

An index fund has no such row: it rebalances on published dates and holds the result. That is part of what "the fund is the holding" buys.