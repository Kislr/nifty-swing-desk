# Momentum backtest — 2026-11-12-adjusted

History 2016-11-07 → 2026-11-11 (2473 days, 501 symbols). Test window 2017-06-12 → 2026-11-11. Parameters: {"lookback":126,"skip":21,"volAdjust":false,"topN":15,"holdRank":30,"rebalance":21,"trail":20,"gateSma":200,"minTurnover":5,"maxOffHigh":20,"maxPerSector":4,"costBps":30,"compound":false}. Capital ₹5,00,000, equal weight ₹33,333 per name at the start for the whole run.



## Overall

| run | trades | total return | CAGR | Nifty (same period) | max DD | Sharpe | win rate | avg bars | time in market | equity at work |
|---|---|---|---|---|---|---|---|---|---|---|
| momentum, fixed slots | 470 | 278.9% | 15.4% | 162.6% | 25.5% | 1.18 | 47% | 57 | 98% | 47% |
| momentum, reinvested (compound) — same rules | 469 | 717.3% | 25.3% | 162.6% | 27.0% | 1.19 | 47% | 58 | 98% | 78% |

The two rows trade the same signals; only the size of new buys differs. Fixed slots keep every buy at starting capital ÷ topN, so profits pile up as idle cash and, over a long window, CAGR and drawdown are both understated relative to the capital at work ("equity at work" is the average share of equity in open positions). Reinvested sizes each rebalance's buys at current equity ÷ topN — the way the list would actually be run — so it is the row to compare with the Nifty, which compounds too. Trade counts can differ slightly: a bigger or smaller slot changes the cash left for the last buy.

## By year

| year | fixed slots | reinvested | Nifty 50 |
|---|---|---|---|
| 2017 | 32.8% | 30.9% | 9.5% |
| 2018 | -15.0% | -15.6% | 3.2% |
| 2019 | 15.8% | 14.4% | 12.0% |
| 2020 | 20.2% | 22.7% | 14.9% |
| 2021 | 51.4% | 89.4% | 24.1% |
| 2022 | 8.6% | 14.7% | 4.3% |
| 2023 | 22.1% | 54.1% | 20.0% |
| 2024 | 18.7% | 59.5% | 8.8% |
| 2025 | -0.7% | -5.8% | 10.5% |
| 2026 | 1.9% | 4.7% | -3.3% |

## Exit reasons

- rank drop: 187
- trailing stop: 203
- ineligible: 80

## Best and worst names

Best: ADANIENT (3×, ₹1,06,083), OLECTRA (3×, ₹1,03,858), ADANIGREEN (5×, ₹79,203), GRAPHITE (5×, ₹61,812), INTELLECT (3×, ₹59,598)

Worst: ADANIPOWER (7×, ₹-28,871), GMDCLTD (4×, ₹-24,167), BAJFINANCE (4×, ₹-20,804), MAZDOCK (5×, ₹-19,531), ITI (5×, ₹-15,914)

## How to read this

A momentum portfolio is judged against the index over the same window, on drawdown as much as on return, because the whole point is to be out (gate closed, stops hit) when the market falls. CAGR and Sharpe over fewer than ~3 years are indicative only. Win rate matters less than for the swing engine: momentum makes its money from a few large winners and many small, quick losses — expect 40–50% winners. "Time in market" below 100% is the gate and the stops doing their job; if it is very low the gate is too tight.

Known simplifications: fills at the rebalance close (plus half the round-trip cost); no dividends; survivorship bias if the universe is today's Nifty 500; corporate actions are adjusted only when data/adjustments.json is present (otherwise a bonus or split looks like a crash and trips the trailing stop); under compounding, positions already open keep the size they were bought at — only new buys take the new slot.