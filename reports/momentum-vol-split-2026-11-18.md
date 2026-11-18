# Momentum trades split by the stock's volatility before entry — 2026-11-18

A description of trades that already exist, not a test of a rule. Source: `reports/momentum-2026-11-13-adjusted-members-refill-volscale.json` (594 closed trades, 594 with 63 bars of history before entry). Volatility = standard deviation of daily log returns over the 63 bars to the entry day, annualised, on corporate-action-adjusted closes.

All trades: 46% winners, average +5.44%, median -1.4%.

| third | trades | volatility | winners | average | median | average win | average loss | share of profit | stopped out |
|---|---|---|---|---|---|---|---|---|---|
| calmest | 198 | 17–40% | 53% | +2.88% | +1.4% | +15.4% | -11.3% | 18% | 23% |
| middle | 198 | 40–53% | 42% | +5.41% | -2.6% | +26.6% | -9.9% | 42% | 39% |
| most volatile | 198 | 53–102% | 43% | +8.04% | -3.3% | +36.8% | -13.6% | 40% | 54% |

**Where the money is.** The best tenth of the trades (59, average +75%) add up to 138% of the summed returns; the other nine-tenths average -2.28%. Of those 59, 10 were in the calmest third, 23 in the middle and 26 in the most volatile.

| entry year | calmer half: trades | average | more volatile half: trades | average |
|---|---|---|---|---|
| 2017 | 26 | +7.4% | 16 | +11.0% |
| 2018 | 50 | -1.3% | 31 | -5.9% |
| 2019 | 50 | +3.3% | 14 | +10.3% |
| 2020 | 15 | +21.5% | 33 | +21.9% |
| 2021 | 20 | +8.2% | 53 | +10.8% |
| 2022 | 29 | +1.8% | 40 | -6.5% |
| 2023 | 29 | +8.7% | 28 | +31.7% |
| 2024 | 25 | +0.7% | 53 | +3.6% |
| 2025 | 47 | +0.0% | 24 | -3.8% |
| 2026 | 6 | -12.6% | 5 | +10.1% |

**Reading.** The calmest names win more often and earn less: a higher win rate and a lower average, because the engine's profit is a few very large winners and most of those sit in the more volatile two-thirds. Calmer names lose less in the falling years and give up most of the rising ones — a defensive tilt, the same shape the compounder's profitability screen showed (reports/compounder-shelved-2026-11-05.md).

**What this is not.** It is not what a low-volatility rule would have earned: removing a name changes which name takes its slot, the split is made after the fact on one ten-year path, and a rule built from it would be a second look at the data that suggested it. A real test needs the hypothesis written first (for example: rank the top 30 by return ÷ volatility instead of return; pass = CAGR and Sharpe both above the 13 Nov row and above NIFTY500 Momentum 50 from at least four of six start years), then a run of the engine.
