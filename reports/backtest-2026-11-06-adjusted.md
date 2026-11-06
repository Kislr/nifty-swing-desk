# Backtest — 2026-11-06-adjusted

History 2017-02-01 → 2026-11-05 (2470 days, 501 symbols). Parameters: {"minRR":2,"capital":500000,"riskPct":1,"maxPos":25,"maxPositions":4,"maxHold":15,"minScore":50,"costBps":30,"warmup":60,"exit":"time","sectorBump":15,"volumeBump":10,"gate":0,"fill":"next"}. Setups: all.

## Overall

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| all | 885 | 42% | -0.01R | 0.99 | -4.5R | 40.0R | 10.6 | ₹-30,161 |

## By setup

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| Pullback buy | 401 | 41% | -0.03R | 0.93 | -13.1R | 32.1R | 10.7 | ₹-60,735 |
| 52W breakout | 484 | 43% | 0.02R | 1.04 | 8.6R | 16.1R | 10.6 | ₹30,574 |

## By score band

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 50-59 | 18 | 44% | 0.17R | 1.55 | 3.1R | 2.7R | 9.9 | ₹8,572 |
| 60-69 | 70 | 50% | 0.19R | 1.53 | 13.3R | 5.9R | 10.8 | ₹33,200 |
| 70+ | 797 | 41% | -0.03R | 0.94 | -20.8R | 37.3R | 10.6 | ₹-71,933 |

## By year

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 2017 | 79 | 46% | -0.03R | 0.94 | -2.1R | 11.1R | 11.1 | ₹-21,963 |
| 2018 | 90 | 38% | -0.11R | 0.78 | -9.5R | 14.8R | 10.4 | ₹-17,876 |
| 2019 | 84 | 43% | -0.10R | 0.78 | -8.3R | 15.0R | 11.4 | ₹-39,095 |
| 2020 | 90 | 42% | 0.06R | 1.14 | 5.5R | 13.5R | 10.3 | ₹37,685 |
| 2021 | 99 | 40% | -0.00R | 1.00 | -0.1R | 11.1R | 9.8 | ₹-8,571 |
| 2022 | 96 | 36% | 0.00R | 1.01 | 0.5R | 11.2R | 10.3 | ₹10,565 |
| 2023 | 86 | 50% | 0.19R | 1.49 | 16.5R | 9.7R | 11.3 | ₹34,277 |
| 2024 | 90 | 47% | 0.08R | 1.20 | 7.5R | 13.1R | 10.9 | ₹37,786 |
| 2025 | 90 | 47% | 0.05R | 1.11 | 4.6R | 12.5R | 10.9 | ₹-149 |
| 2026 | 81 | 33% | -0.23R | 0.58 | -19.0R | 20.6R | 10.1 | ₹-62,820 |

## Exit reasons

- breakeven stop: 28
- time stop: 411
- gap above target: 6
- stop: 288
- target: 115
- gap through stop: 37

## How to read this

Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.

Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today's constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.