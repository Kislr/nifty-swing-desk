# Backtest — 2026-11-21-adjusted-members

History 2017-02-01 → 2026-11-20 (2490 days, 895 symbols). Parameters: {"minRR":2,"capital":500000,"riskPct":1,"maxPos":25,"maxPositions":4,"maxHold":15,"minScore":50,"costBps":30,"warmup":60,"exit":"time","sectorBump":15,"volumeBump":10,"gate":0,"fill":"next","universe":"all","members":true}. Setups: all.

## Overall

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| all | 872 | 41% | -0.05R | 0.89 | -43.2R | 56.1R | 10.9 | ₹-1,33,863 |

## By setup

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| Pullback buy | 366 | 44% | -0.02R | 0.95 | -7.5R | 29.9R | 11.2 | ₹-578 |
| 52W breakout | 506 | 39% | -0.07R | 0.85 | -35.7R | 40.6R | 10.7 | ₹-1,33,285 |

## By score band

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 50-59 | 7 | 71% | 0.37R | 2.46 | 2.6R | 1.4R | 12.1 | ₹11,942 |
| 60-69 | 58 | 48% | 0.05R | 1.14 | 2.9R | 4.9R | 11.6 | ₹-2,098 |
| 70+ | 807 | 40% | -0.06R | 0.87 | -48.7R | 60.8R | 10.8 | ₹-1,43,707 |

## By year

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 2017 | 74 | 49% | 0.02R | 1.06 | 1.6R | 11.4R | 11.8 | ₹-6,898 |
| 2018 | 94 | 40% | -0.08R | 0.83 | -7.9R | 18.1R | 10.1 | ₹-21,672 |
| 2019 | 86 | 33% | -0.15R | 0.67 | -13.2R | 18.6R | 11.3 | ₹-32,277 |
| 2020 | 84 | 45% | 0.11R | 1.28 | 9.7R | 9.8R | 11.2 | ₹54,670 |
| 2021 | 86 | 41% | 0.00R | 1.01 | 0.3R | 13.4R | 11.4 | ₹-6,679 |
| 2022 | 94 | 34% | -0.21R | 0.59 | -19.8R | 21.9R | 10.4 | ₹-62,369 |
| 2023 | 93 | 42% | 0.03R | 1.06 | 2.4R | 11.2R | 10.4 | ₹-4,616 |
| 2024 | 93 | 55% | 0.16R | 1.42 | 14.9R | 9.0R | 10.7 | ₹46,144 |
| 2025 | 84 | 42% | -0.08R | 0.83 | -6.7R | 18.0R | 11.8 | ₹-25,524 |
| 2026 | 84 | 32% | -0.29R | 0.49 | -24.6R | 26.7R | 10.1 | ₹-74,642 |

## Exit reasons

- breakeven stop: 28
- time stop: 423
- stop: 289
- target: 98
- gap through stop: 27
- gap above target: 7

## Universe: point-in-time NIFTY 500 membership

Each day's analysis and the momentum ranking saw only that day's members (`data/membership/members.json`: 74 events, 2017-01-23 → 2026-11-12). 895 names were members at some point; 894 have bars, 1 do not yet (left the index before the history was loaded; the owner's past-members price load fills them in); 1 symbols with bars were never members and were never seen. Until the past members have bars this removes the future members only.

## How to read this

Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.

Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today's constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.