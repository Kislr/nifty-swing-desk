# Backtest — 2026-11-12-adjusted-members

History 2017-02-01 → 2026-11-11 (2473 days, 895 symbols). Parameters: {"minRR":2,"capital":500000,"riskPct":1,"maxPos":25,"maxPositions":4,"maxHold":15,"minScore":50,"costBps":30,"warmup":60,"exit":"time","sectorBump":15,"volumeBump":10,"gate":0,"fill":"next","universe":"momentum","members":true}. Setups: pullback.

## Overall

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| all | 594 | 44% | 0.09R | 1.22 | 55.1R | 28.2R | 11.0 | ₹2,01,000 |

## By setup

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| Pullback buy | 594 | 44% | 0.09R | 1.22 | 55.1R | 28.2R | 11.0 | ₹2,01,000 |

## By score band

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 50-59 | 92 | 47% | 0.05R | 1.12 | 4.5R | 17.0R | 10.8 | ₹17,063 |
| 60-69 | 174 | 43% | 0.12R | 1.27 | 20.0R | 9.6R | 11.8 | ₹52,044 |
| 70+ | 328 | 43% | 0.09R | 1.22 | 30.6R | 21.7R | 10.7 | ₹1,31,893 |

## By year

| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹5,00,000) |
|---|---|---|---|---|---|---|---|---|
| 2017 | 30 | 40% | 0.03R | 1.07 | 0.8R | 4.0R | 11.0 | ₹5,668 |
| 2018 | 55 | 38% | 0.13R | 1.33 | 7.3R | 7.1R | 10.2 | ₹40,574 |
| 2019 | 64 | 39% | -0.12R | 0.74 | -7.9R | 15.2R | 11.5 | ₹-42,447 |
| 2020 | 72 | 57% | 0.46R | 2.37 | 33.1R | 7.4R | 10.3 | ₹1,45,971 |
| 2021 | 65 | 43% | 0.21R | 1.52 | 13.9R | 4.6R | 10.7 | ₹37,166 |
| 2022 | 62 | 44% | 0.08R | 1.19 | 4.9R | 17.1R | 13.4 | ₹37,941 |
| 2023 | 66 | 48% | 0.20R | 1.61 | 13.2R | 4.0R | 12.4 | ₹48,803 |
| 2024 | 72 | 40% | -0.06R | 0.89 | -4.0R | 16.1R | 10.2 | ₹-17,445 |
| 2025 | 57 | 44% | 0.02R | 1.04 | 1.1R | 12.7R | 10.7 | ₹-1,294 |
| 2026 | 51 | 37% | -0.14R | 0.72 | -7.2R | 11.0R | 9.6 | ₹-53,937 |

## Exit reasons

- stop: 172
- time stop: 265
- target: 96
- breakeven stop: 27
- gap above target: 7
- gap through stop: 27

## Universe

Momentum top 30: of the act signals that reached this filter, 5417 were in the list and 64592 were not (2308 signal days; ranking undefined on 0 of them; first defined 2017-06-09). Repeat the unfiltered run with `--from 2017-06-09` for a same-window control.

## Universe: point-in-time NIFTY 500 membership

Each day's analysis and the momentum ranking saw only that day's members (`data/membership/members.json`: 74 events, 2017-01-23 → 2026-11-12). 895 names were members at some point; 894 have bars, 1 do not yet (left the index before the history was loaded; the owner's past-members price load fills them in); 1 symbols with bars were never members and were never seen. Until the past members have bars this removes the future members only.

## How to read this

Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.

Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today's constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.