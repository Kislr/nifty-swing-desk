# Backtest — 2026-11-23-adjusted-members

History 2017-06-09 → 2026-11-20 (2343 days walked of 2490 on file, 895 symbols). Parameters: {"minRR":2,"capital":500000,"riskPct":1,"maxPos":25,"maxPositions":4,"maxHold":15,"minScore":50,"costBps":30,"warmup":60,"exit":"time","sectorBump":15,"volumeBump":10,"gate":0,"fill":"next","universe":"momentum","members":true}. Setups: pullback.

## Overall

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| all | 616 | 42% | 0.06R | 1.13 | 35.3R | 39.2R | 10.4 | ₹1,28,674 |

## By setup

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| Pullback buy | 616 | 42% | 0.06R | 1.13 | 35.3R | 39.2R | 10.4 | ₹1,28,674 |

## By score band

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 50-59 | 97 | 48% | 0.13R | 1.32 | 12.6R | 14.8R | 10.5 | ₹53,761 |
| 60-69 | 176 | 40% | 0.05R | 1.12 | 9.0R | 8.0R | 10.3 | ₹22,237 |
| 70+ | 343 | 41% | 0.04R | 1.09 | 13.7R | 27.7R | 10.4 | ₹52,676 |

## By year

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 2017 | 31 | 35% | -0.00R | 1.00 | -0.1R | 4.0R | 10.5 | ₹-1,351 |
| 2018 | 54 | 35% | 0.06R | 1.15 | 3.4R | 8.2R | 10.7 | ₹26,220 |
| 2019 | 64 | 42% | -0.08R | 0.82 | -4.9R | 10.5R | 11.7 | ₹-22,973 |
| 2020 | 70 | 54% | 0.35R | 1.97 | 24.5R | 6.2R | 10.6 | ₹1,03,246 |
| 2021 | 75 | 44% | 0.22R | 1.54 | 16.5R | 4.9R | 10.4 | ₹60,044 |
| 2022 | 72 | 40% | -0.03R | 0.94 | -2.2R | 22.6R | 9.5 | ₹-1,998 |
| 2023 | 70 | 51% | 0.31R | 2.02 | 21.6R | 4.6R | 11.3 | ₹76,100 |
| 2024 | 78 | 29% | -0.28R | 0.53 | -21.6R | 27.9R | 9.1 | ₹-80,883 |
| 2025 | 54 | 46% | 0.08R | 1.20 | 4.5R | 11.8R | 10.8 | ₹14,443 |
| 2026 | 48 | 35% | -0.13R | 0.72 | -6.4R | 9.7R | 9.7 | ₹-44,174 |

## Exit reasons

- stop: 190
- time stop: 262
- target: 98
- breakeven stop: 33
- gap above target: 6
- gap through stop: 27

## Universe

Momentum top 30: of the act signals that reached this filter, 5472 were in the list and 65254 were not (2326 signal days; ranking undefined on 0 of them; first defined 2017-06-09). Repeat the unfiltered run with `--from 2017-06-09` for a same-window control.

## Universe: point-in-time NIFTY 500 membership

Each day's analysis and the momentum ranking saw only that day's members (`data/membership/members.json`: 74 events, 2017-01-23 → 2026-11-12). 895 names were members at some point; 894 have bars, 1 do not yet (left the index before the history was loaded; the owner's past-members price load fills them in); 1 symbols with bars were never members and were never seen. Until the past members have bars this removes the future members only.

## How to read this

Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.

Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today's constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.