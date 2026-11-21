# Backtest — 2026-11-21-adjusted-members

History 2017-06-09 → 2026-11-20 (2343 days walked of 2490 on file, 895 symbols). Parameters: {"minRR":2,"capital":500000,"riskPct":1,"maxPos":25,"maxPositions":4,"maxHold":15,"minScore":50,"costBps":30,"warmup":60,"exit":"time","sectorBump":15,"volumeBump":10,"gate":0,"fill":"next","universe":"momentum","members":true}. Setups: pullback.

## Overall

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| all | 587 | 43% | 0.08R | 1.19 | 48.6R | 35.7R | 11.2 | ₹2,06,960 |

## By setup

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| Pullback buy | 587 | 43% | 0.08R | 1.19 | 48.6R | 35.7R | 11.2 | ₹2,06,960 |

## By score band

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 50-59 | 88 | 51% | 0.22R | 1.58 | 19.1R | 11.8R | 10.8 | ₹78,156 |
| 60-69 | 178 | 42% | 0.05R | 1.12 | 9.5R | 10.0R | 12.1 | ₹28,883 |
| 70+ | 321 | 41% | 0.06R | 1.15 | 20.0R | 25.1R | 10.8 | ₹99,921 |

## By year

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 2017 | 30 | 40% | 0.03R | 1.07 | 0.8R | 4.0R | 11.0 | ₹5,668 |
| 2018 | 55 | 38% | 0.13R | 1.33 | 7.3R | 7.1R | 10.2 | ₹40,574 |
| 2019 | 64 | 42% | -0.08R | 0.82 | -4.9R | 10.5R | 11.7 | ₹-22,973 |
| 2020 | 71 | 58% | 0.50R | 2.56 | 35.5R | 4.9R | 10.5 | ₹1,47,737 |
| 2021 | 62 | 45% | 0.27R | 1.67 | 16.5R | 4.9R | 11.9 | ₹58,899 |
| 2022 | 62 | 44% | 0.08R | 1.19 | 4.9R | 17.1R | 13.4 | ₹37,941 |
| 2023 | 66 | 48% | 0.20R | 1.60 | 13.4R | 5.2R | 12.2 | ₹50,273 |
| 2024 | 76 | 30% | -0.25R | 0.57 | -18.9R | 23.8R | 10.0 | ₹-71,617 |
| 2025 | 53 | 43% | 0.01R | 1.02 | 0.4R | 11.9R | 11.0 | ₹4,539 |
| 2026 | 48 | 35% | -0.13R | 0.72 | -6.4R | 9.7R | 9.8 | ₹-44,081 |

## Exit reasons

- stop: 176
- time stop: 256
- target: 95
- breakeven stop: 30
- gap above target: 7
- gap through stop: 23

## Universe

Momentum top 30: of the act signals that reached this filter, 5444 were in the list and 64967 were not (2326 signal days; ranking undefined on 0 of them; first defined 2017-06-09). Repeat the unfiltered run with `--from 2017-06-09` for a same-window control.

## Universe: point-in-time NIFTY 500 membership

Each day's analysis and the momentum ranking saw only that day's members (`data/membership/members.json`: 74 events, 2017-01-23 → 2026-11-12). 895 names were members at some point; 894 have bars, 1 do not yet (left the index before the history was loaded; the owner's past-members price load fills them in); 1 symbols with bars were never members and were never seen. Until the past members have bars this removes the future members only.

## How to read this

Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.

Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today's constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.