# Backtest — 2026-11-23-adjusted-members

History 2017-02-01 → 2026-11-20 (2490 days, 895 symbols). Parameters: {"minRR":2,"capital":500000,"riskPct":1,"maxPos":25,"maxPositions":4,"maxHold":15,"minScore":50,"costBps":30,"warmup":60,"exit":"time","sectorBump":15,"volumeBump":10,"gate":0,"fill":"next","universe":"all","members":true}. Setups: all.

## Overall

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| all | 891 | 42% | -0.03R | 0.93 | -28.1R | 50.4R | 10.7 | ₹-94,929 |

## By setup

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| Pullback buy | 377 | 44% | -0.03R | 0.93 | -11.9R | 28.7R | 10.8 | ₹-19,770 |
| 52W breakout | 514 | 41% | -0.03R | 0.93 | -16.2R | 30.7R | 10.6 | ₹-75,159 |

## By score band

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 50-59 | 7 | 71% | 0.43R | 3.14 | 3.0R | 1.0R | 11.6 | ₹12,913 |
| 60-69 | 56 | 46% | 0.00R | 1.00 | 0.1R | 3.6R | 11.0 | ₹-10,897 |
| 70+ | 828 | 41% | -0.04R | 0.92 | -31.2R | 50.9R | 10.6 | ₹-96,945 |

## By year

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 2017 | 74 | 49% | 0.02R | 1.06 | 1.6R | 11.4R | 11.8 | ₹-6,898 |
| 2018 | 94 | 40% | -0.08R | 0.83 | -7.9R | 18.1R | 10.1 | ₹-21,672 |
| 2019 | 86 | 33% | -0.15R | 0.67 | -13.2R | 18.6R | 11.3 | ₹-32,287 |
| 2020 | 84 | 45% | 0.11R | 1.28 | 9.7R | 9.8R | 11.2 | ₹54,670 |
| 2021 | 101 | 43% | -0.00R | 1.00 | -0.2R | 15.1R | 9.7 | ₹-13,752 |
| 2022 | 94 | 34% | -0.19R | 0.62 | -18.2R | 20.3R | 10.4 | ₹-55,452 |
| 2023 | 93 | 43% | 0.04R | 1.10 | 3.9R | 11.2R | 10.4 | ₹3,024 |
| 2024 | 93 | 55% | 0.17R | 1.45 | 16.0R | 9.0R | 10.7 | ₹48,791 |
| 2025 | 85 | 42% | -0.07R | 0.85 | -6.3R | 16.9R | 11.4 | ₹-33,628 |
| 2026 | 87 | 37% | -0.16R | 0.70 | -13.6R | 19.4R | 10.1 | ₹-37,725 |

## Exit reasons

- breakeven stop: 26
- time stop: 432
- stop: 286
- target: 106
- gap through stop: 34
- gap above target: 7

## Universe: point-in-time NIFTY 500 membership

Each day's analysis and the momentum ranking saw only that day's members (`data/membership/members.json`: 74 events, 2017-01-23 → 2026-11-12). 895 names were members at some point; 894 have bars, 1 do not yet (left the index before the history was loaded; the owner's past-members price load fills them in); 1 symbols with bars were never members and were never seen. Until the past members have bars this removes the future members only.

## How to read this

Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.

Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today's constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.