# Momentum backtest — 2026-11-06-adjusted

History 2016-11-07 → 2026-11-05 (2470 days, 501 symbols). Test window 2017-06-12 → 2026-11-05. Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30}. Capital ₹5,00,000, equal weight ₹33,333 per name.



## Overall

| run | trades | total return | CAGR | Nifty (same period) | max DD | Sharpe | win rate | avg bars | time in market |
|---|---|---|---|---|---|---|---|---|---|
| momentum | 470 | 278.9% | 15.4% | 155.2% | 25.5% | 1.18 | 47% | 57 | 98% |

## By year

| year | strategy | Nifty 50 |
|---|---|---|
| 2017 | 32.8% | 9.5% |
| 2018 | -15.0% | 3.2% |
| 2019 | 15.8% | 12.0% |
| 2020 | 20.2% | 14.9% |
| 2021 | 51.4% | 24.1% |
| 2022 | 8.6% | 4.3% |
| 2023 | 22.1% | 20.0% |
| 2024 | 18.7% | 8.8% |
| 2025 | -0.7% | 10.5% |
| 2026 | 1.9% | -6.1% |

## Exit reasons

- rank drop: 187
- trailing stop: 203
- ineligible: 80

## Best and worst names

Best: ADANIENT (3×, ₹1,06,083), OLECTRA (3×, ₹1,03,858), ADANIGREEN (5×, ₹79,203), GRAPHITE (5×, ₹61,812), INTELLECT (3×, ₹59,598)

Worst: ADANIPOWER (7×, ₹-28,871), GMDCLTD (4×, ₹-24,167), BAJFINANCE (4×, ₹-20,804), MAZDOCK (5×, ₹-19,531), ITI (5×, ₹-15,914)

## How to read this

A momentum portfolio is judged against the index over the same window, on drawdown as much as on return, because the whole point is to be out (gate closed, stops hit) when the market falls. CAGR and Sharpe over fewer than ~3 years are indicative only. Win rate matters less than for the swing engine: momentum makes its money from a few large winners and many small, quick losses — expect 40–50% winners. "Time in market" below 100% is the gate and the stops doing their job; if it is very low the gate is too tight.

Known simplifications: fills at the rebalance close (plus half the round-trip cost); no dividends; survivorship bias if the universe is today's Nifty 500; corporate actions not adjusted (a bonus or split looks like a crash and trips the trailing stop).