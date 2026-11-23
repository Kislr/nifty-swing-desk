# Momentum backtest, by rebalance phase — 2026-11-23-adjusted-members

History 2016-11-07 → 2026-11-20 (2490 days, 895 symbols). Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"gateHoles":5,"gateUnknown":"open","minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":true,"refill":"close","volScale":true,"volWindow":20,"volMedian":250,"volFactor":0.5}. Reinvested runs, that day's NIFTY 500 members.

The engine rebalances every 21 bars counted from its first day, so the day a run starts fixes which days it trades on for the next ten years. Each row below is the same rules, the same prices and the same last day, started one trading day later than the row above — one full cycle of 21 starts. Nothing else differs between the rows. The run on record (the first row, 2017-06-12) is one of them.

| start | trades | total return | CAGR | max DD | Sharpe | win rate | Nifty 50 TR, same window | N200 Momentum 30 TR, same window | N500 Momentum 50 TR, same window |
|---|---|---|---|---|---|---|---|---|---|
| **2017-06-12** | 630 | 335.4% | **17.0%** | 28.4% | 0.99 | 44% | 12.3% | 15.2% | 17.3% |
| 2017-06-13 | 624 | 482.6% | 20.7% | 29.0% | 1.16 | 46% | 12.3% | 15.3% | 17.3% |
| 2017-06-14 | 629 | 433.3% | 19.6% | 25.8% | 1.12 | 44% | 12.3% | 15.3% | 17.3% |
| 2017-06-15 | 614 | 454.6% | 20.1% | 22.8% | 1.15 | 46% | 12.3% | 15.4% | 17.4% |
| 2017-06-16 | 597 | 527.3% | 21.7% | 22.3% | 1.23 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-19 | 607 | 532.0% | 21.8% | 22.4% | 1.22 | 46% | 12.2% | 15.2% | 17.3% |
| 2017-06-20 | 605 | 599.8% | 23.1% | 20.5% | 1.28 | 48% | 12.2% | 15.2% | 17.3% |
| 2017-06-21 | 612 | 526.4% | 21.7% | 25.2% | 1.21 | 47% | 12.3% | 15.3% | 17.3% |
| 2017-06-22 | 630 | 546.9% | 22.1% | 25.4% | 1.24 | 46% | 12.3% | 15.5% | 17.5% |
| 2017-06-23 | 610 | 468.2% | 20.5% | 27.2% | 1.17 | 46% | 12.4% | 15.7% | 17.7% |
| 2017-06-27 | 612 | 562.2% | 22.5% | 28.4% | 1.26 | 46% | 12.4% | 15.8% | 17.9% |
| 2017-06-28 | 615 | 411.4% | 19.1% | 26.2% | 1.09 | 44% | 12.5% | 15.7% | 17.8% |
| 2017-06-29 | 591 | 362.6% | 17.9% | 29.4% | 1.04 | 46% | 12.5% | 15.6% | 17.8% |
| 2017-06-30 | 586 | 463.7% | 20.4% | 29.4% | 1.16 | 47% | 12.4% | 15.6% | 17.7% |
| 2017-07-03 | 597 | 395.8% | 18.8% | 28.4% | 1.08 | 44% | 12.3% | 15.4% | 17.6% |
| 2017-07-04 | 597 | 487.5% | 21.0% | 25.9% | 1.16 | 45% | 12.3% | 15.4% | 17.6% |
| 2017-07-05 | 608 | 245.7% | 14.3% | 37.4% | 0.85 | 42% | 12.3% | 15.4% | 17.5% |
| 2017-07-06 | 612 | 319.5% | 16.7% | 29.5% | 0.97 | 42% | 12.3% | 15.3% | 17.5% |
| 2017-07-07 | 612 | 262.6% | 14.9% | 32.8% | 0.89 | 45% | 12.3% | 15.4% | 17.5% |
| 2017-07-10 | 618 | 317.4% | 16.6% | 34.7% | 0.99 | 44% | 12.2% | 15.3% | 17.5% |
| 2017-07-11 | 613 | 392.7% | 18.7% | 26.8% | 1.08 | 46% | 12.1% | 15.3% | 17.5% |

## The spread

CAGR across the 21 starts: **14.3% to 23.1%**, median **20.1%**, middle half 17.9% to 21.7%, mean 19.5%, standard deviation 2.5%. Sharpe 0.85 to 1.28, median 1.15. Max drawdown 20.5% to 37.4%, median 27.2%.

- **NIFTY 50** (12.1% to 12.5% a year over the same windows): the engine is ahead in **21 of 21** starts, and ahead by two points or more in 20.
- **NIFTY200 MOMENTUM 30** (15.2% to 15.8% a year over the same windows): the engine is ahead in **19 of 21** starts, and ahead by two points or more in 16.
- **NIFTY500 MOMENTUM 50** (17.3% to 17.9% a year over the same windows): the engine is ahead in **16 of 21** starts, and ahead by two points or more in 12.

## How to read this

One row is one draw. A difference between two versions of the rules, or between the engine and an index, that is smaller than this spread is not a finding — the same rules differ from themselves by that much when the calendar moves by a day. Compare medians, or count starts, and treat the single run on record as what it is: the row that happens to begin on 2017-06-12. The live paper book is one row too: it began on the day it began.

An index fund has no such row: it rebalances on published dates and holds the result. That is part of what "the fund is the holding" buys.