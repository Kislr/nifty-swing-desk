# Backtest — 2026-11-05, corporate-action-adjusted history

History 2022-01-27 → 2026-11-04 (1237 days, 501 symbols). Parameters: {"minRR":2,"capital":500000,"riskPct":1,"maxPos":25,"maxPositions":4,"maxHold":15,"minScore":50,"costBps":30,"warmup":60,"exit":"time","sectorBump":15,"volumeBump":10}. Setups: all.

## Overall

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| all | 433 | 42% | 0.01R | 1.02 | 3.4R | 22.6R | 10.6 | ₹8,306 |

## By setup

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| Pullback buy | 190 | 41% | -0.05R | 0.89 | -10.2R | 16.4R | 10.5 | ₹-52,601 |
| 52W breakout | 243 | 43% | 0.06R | 1.13 | 13.6R | 16.1R | 10.7 | ₹60,907 |

## By score band

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 50-59 | 8 | 38% | 0.22R | 1.64 | 1.7R | 1.6R | 9.1 | ₹6,244 |
| 60-69 | 31 | 52% | 0.29R | 1.76 | 9.0R | 4.1R | 10.2 | ₹20,965 |
| 70+ | 394 | 42% | -0.02R | 0.96 | -7.3R | 33.1R | 10.7 | ₹-18,903 |

## By year

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 2022 | 87 | 34% | -0.06R | 0.88 | -4.9R | 16.1R | 9.9 | ₹2,168 |
| 2023 | 86 | 50% | 0.19R | 1.49 | 16.5R | 9.7R | 11.3 | ₹34,277 |
| 2024 | 90 | 47% | 0.08R | 1.20 | 7.5R | 13.1R | 10.9 | ₹37,786 |
| 2025 | 90 | 47% | 0.05R | 1.11 | 4.6R | 12.5R | 10.9 | ₹-149 |
| 2026 | 80 | 33% | -0.25R | 0.55 | -20.3R | 20.6R | 10.1 | ₹-65,776 |

## Exit reasons

- stop: 138
- time stop: 199
- gap through stop: 21
- target: 58
- breakeven stop: 15
- gap above target: 2

## How to read this

Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.

Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today's constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.