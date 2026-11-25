# Momentum backtest, by rebalance phase — 2026-11-25-adjusted-members-bandfill

History 2016-11-07 → 2026-11-23 (2491 days, 895 symbols). Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"gateHoles":5,"gateUnknown":"open","minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":true,"refill":"close","volScale":true,"volWindow":20,"volMedian":250,"volFactor":0.5,"bandFill":"both"}. Reinvested runs, that day's NIFTY 500 members.

The engine rebalances every 21 bars counted from its first day, so the day a run starts fixes which days it trades on for the next ten years. Each row below is the same rules, the same prices and the same last day, started one trading day later than the row above — one full cycle of 21 starts. Nothing else differs between the rows. The run on record (the first row, 2017-06-12) is one of them.

| start | trades | total return | CAGR | max DD | Sharpe | win rate | Nifty 50 TR, same window | N200 Momentum 30 TR, same window | N500 Momentum 50 TR, same window |
|---|---|---|---|---|---|---|---|---|---|
| **2017-06-12** | 632 | 295.9% | **15.8%** | 31.0% | 0.93 | 44% | 12.3% | 15.2% | 17.3% |
| 2017-06-13 | 624 | 400.5% | 18.8% | 30.0% | 1.07 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-14 | 629 | 375.7% | 18.1% | 28.7% | 1.05 | 44% | 12.3% | 15.3% | 17.3% |
| 2017-06-15 | 612 | 394.1% | 18.6% | 25.7% | 1.08 | 46% | 12.3% | 15.4% | 17.4% |
| 2017-06-16 | 597 | 443.4% | 19.8% | 27.6% | 1.14 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-19 | 606 | 453.1% | 20.1% | 26.6% | 1.14 | 46% | 12.2% | 15.2% | 17.3% |
| 2017-06-20 | 611 | 500.0% | 21.1% | 25.3% | 1.19 | 48% | 12.2% | 15.2% | 17.3% |
| 2017-06-21 | 616 | 448.6% | 20.0% | 25.9% | 1.12 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-22 | 635 | 493.9% | 21.0% | 28.9% | 1.19 | 47% | 12.3% | 15.5% | 17.5% |
| 2017-06-23 | 612 | 439.7% | 19.8% | 30.1% | 1.14 | 46% | 12.4% | 15.7% | 17.7% |
| 2017-06-27 | 614 | 505.8% | 21.3% | 28.7% | 1.20 | 46% | 12.4% | 15.8% | 17.9% |
| 2017-06-28 | 622 | 417.1% | 19.3% | 27.8% | 1.09 | 44% | 12.5% | 15.7% | 17.8% |
| 2017-06-29 | 588 | 325.5% | 16.8% | 28.1% | 0.99 | 46% | 12.5% | 15.6% | 17.8% |
| 2017-06-30 | 593 | 400.4% | 18.9% | 28.7% | 1.09 | 47% | 12.4% | 15.6% | 17.7% |
| 2017-07-03 | 600 | 354.8% | 17.7% | 30.6% | 1.02 | 45% | 12.3% | 15.4% | 17.6% |
| 2017-07-04 | 599 | 404.1% | 19.0% | 30.4% | 1.07 | 45% | 12.3% | 15.4% | 17.6% |
| 2017-07-05 | 610 | 205.4% | 12.7% | 37.2% | 0.77 | 42% | 12.3% | 15.4% | 17.5% |
| 2017-07-06 | 615 | 265.4% | 14.9% | 30.5% | 0.88 | 43% | 12.3% | 15.3% | 17.5% |
| 2017-07-07 | 616 | 229.8% | 13.7% | 30.8% | 0.83 | 46% | 12.3% | 15.4% | 17.5% |
| 2017-07-10 | 617 | 281.6% | 15.5% | 33.8% | 0.93 | 44% | 12.2% | 15.3% | 17.5% |
| 2017-07-11 | 614 | 288.4% | 15.7% | 30.6% | 0.94 | 45% | 12.1% | 15.3% | 17.5% |

## The spread

CAGR across the 21 starts: **12.7% to 21.3%**, median **18.8%**, middle half 15.8% to 19.8%, mean 18.0%, standard deviation 2.5%. Sharpe 0.77 to 1.20, median 1.07. Max drawdown 25.3% to 37.2%, median 28.9%.

- **NIFTY 50** (12.1% to 12.5% a year over the same windows): the engine is ahead in **21 of 21** starts, and ahead by two points or more in 19.
- **NIFTY200 MOMENTUM 30** (15.2% to 15.8% a year over the same windows): the engine is ahead in **18 of 21** starts, and ahead by two points or more in 14.
- **NIFTY500 MOMENTUM 50** (17.3% to 17.9% a year over the same windows): the engine is ahead in **14 of 21** starts, and ahead by two points or more in 7.

## Fill rule at the band (A22)

`bandFill=both` in every row (hypothesis: `reports/momentum-fill-hypothesis-2026-11-25.md`). Series on record for 2343 of the first row's days. Across the 21 starts, sales not made on the day they fell due: 10 to 12 a run (median 11); bars waited in all: 34 to 39; purchases not made: 5 to 10.

## How to read this

One row is one draw. A difference between two versions of the rules, or between the engine and an index, that is smaller than this spread is not a finding — the same rules differ from themselves by that much when the calendar moves by a day. Compare medians, or count starts, and treat the single run on record as what it is: the row that happens to begin on 2017-06-12. The live paper book is one row too: it began on the day it began.

An index fund has no such row: it rebalances on published dates and holds the result. That is part of what "the fund is the holding" buys.