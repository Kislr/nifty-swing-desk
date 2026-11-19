# Backtest — 2026-11-19-adjusted-members

History 2017-02-01 → 2026-11-18 (2478 days, 895 symbols). Parameters: {"minRR":2,"capital":500000,"riskPct":1,"maxPos":25,"maxPositions":4,"maxHold":15,"minScore":50,"costBps":30,"warmup":60,"exit":"time","sectorBump":15,"volumeBump":10,"gate":0,"fill":"next","universe":"all","members":true}. Setups: all.

## Overall

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| all | 865 | 42% | -0.03R | 0.93 | -25.8R | 46.2R | 10.9 | ₹-88,840 |

## By setup

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| Pullback buy | 370 | 44% | -0.03R | 0.93 | -10.5R | 37.6R | 11.0 | ₹-41,197 |
| 52W breakout | 495 | 41% | -0.03R | 0.93 | -15.3R | 28.4R | 10.9 | ₹-47,643 |

## By score band

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 50-59 | 6 | 83% | 0.66R | 11.91 | 4.0R | 0.4R | 13.2 | ₹14,732 |
| 60-69 | 60 | 45% | 0.04R | 1.11 | 2.5R | 5.0R | 11.3 | ₹-1,980 |
| 70+ | 799 | 41% | -0.04R | 0.91 | -32.4R | 47.9R | 10.9 | ₹-1,01,592 |

## By year

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 2017 | 74 | 49% | 0.02R | 1.06 | 1.6R | 11.4R | 11.8 | ₹-6,898 |
| 2018 | 94 | 40% | -0.08R | 0.83 | -7.9R | 18.1R | 10.1 | ₹-21,672 |
| 2019 | 86 | 35% | -0.14R | 0.68 | -12.4R | 18.6R | 11.3 | ₹-33,245 |
| 2020 | 85 | 42% | 0.04R | 1.09 | 3.2R | 11.8R | 11.1 | ₹28,281 |
| 2021 | 87 | 47% | 0.12R | 1.29 | 10.1R | 9.5R | 11.3 | ₹36,098 |
| 2022 | 93 | 34% | -0.20R | 0.60 | -18.6R | 20.8R | 10.5 | ₹-66,202 |
| 2023 | 91 | 43% | -0.01R | 0.98 | -0.7R | 11.2R | 10.6 | ₹-22,615 |
| 2024 | 91 | 47% | 0.11R | 1.29 | 10.4R | 11.0R | 10.7 | ₹29,671 |
| 2025 | 82 | 44% | -0.04R | 0.91 | -3.3R | 12.9R | 12.0 | ₹-16,540 |
| 2026 | 82 | 39% | -0.10R | 0.80 | -8.2R | 13.8R | 10.2 | ₹-15,718 |

## Exit reasons

- breakeven stop: 29
- time stop: 430
- stop: 271
- target: 103
- gap through stop: 27
- gap above target: 5

## Universe: point-in-time NIFTY 500 membership

Each day's analysis and the momentum ranking saw only that day's members (`data/membership/members.json`: 74 events, 2017-01-23 → 2026-11-12). 895 names were members at some point; 894 have bars, 1 do not yet (left the index before the history was loaded; the owner's past-members price load fills them in); 1 symbols with bars were never members and were never seen. Until the past members have bars this removes the future members only.

## How to read this

Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.

Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today's constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.