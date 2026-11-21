# Short-term reversal backtest — 2026-11-21-adjusted-members

History 2016-11-07 → 2026-11-20 (2490 days, 895 symbols, corporate actions applied). Rule: {"liquid":100,"turnBars":20,"trend":200,"lookback":5,"decile":0.1,"hold":5,"atrMult":2,"stopFloor":0.02,"gapSkip":0.03,"costBps":30,"maxPositions":4,"minEligible":20}. Universe: that day's NIFTY 500 members, top 100 by 20-bar turnover, close above the own 200-day average. Hypothesis, pass mark and decision rule were written before the run: `reports/reversal-hypotheses-2026-11-13.md`. Mechanics (trade, stats, verdict) are the PEAD script's, so the two event studies are measured identically.

## Verdict: **FAIL** — expectancy -0.046R < +0.1R; excess over the index positive in 1 of 10 years with 20+ trades (needs 6)

Per the decision rule: the swing queue is empty. Every entry on the list has been tested against the same +0.1R-over-300 bar on the full membership and none cleared it; swingMode stays watch, the swing setups stay on the site and in the digest as levels, and the desk is the momentum paper book beside the index fund.

## Rows

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **primary**: bottom decile of 5-day return (< 0), top-100 liquid, above 200-day, 5-bar hold | 21998 | -0.046R | 0.85 | 46% | -0.34% | -0.55% | -9.51 | 1065.6R | 4.6 | 1/10 | — |
| top decile of 5-day return (continuation control) | 22033 | -0.050R | 0.86 | 44% | -0.42% | -0.66% | -8.69 | 1181.6R | 4.6 | 1/10 | — |
| median decile (base rate) | 22341 | -0.041R | 0.88 | 46% | -0.22% | -0.45% | -7.47 | 997.6R | 4.5 | 0/10 | — |
| primary rule on all members above their 200-day (liquidity control) | 59634 | -0.030R | 0.90 | 46% | -0.17% | -0.41% | -10.19 | 2012.1R | 4.7 | 2/10 | — |
| desk: primary with ≤ 4 open, one per sector, most negative first | 1612 | -0.019R | 0.93 | 47% | -0.10% | -0.36% | -1.10 | 38.1R | 4.7 | 2/10 | — |

Expectancy is in R (risk = entry − stop, stop = 2 × ATR(14) below the entry, floor 2%), after 30 bps round trip. "Mean excess vs Nifty" is the trade's return minus the NIFTY 50's from the signal day's close to the exit day's close. The continuation row is the same universe's best week bought instead of its worst; reversal predicts it does worse than the primary row. The liquidity row drops the top-100 screen: reversal is known to be strongest where trading is dearest, so a big gap between that row and the primary one says the effect lives where the desk cannot trade it.

## Information only (not for the verdict)

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| primary rule, 3-bar hold | 21998 | -0.050R | 0.80 | 45% | -0.35% | -0.49% | -12.23 | 1111.1R | 2.9 | 0/10 | — |
| primary rule, 10-bar hold | 21998 | -0.039R | 0.90 | 45% | -0.33% | -0.71% | -6.00 | 947.5R | 8.5 | 1/10 | — |
| bottom quintile instead of decile, 5 bars | 42127 | -0.047R | 0.85 | 46% | -0.32% | -0.53% | -12.87 | 2066.5R | 4.6 | 1/10 | — |

## Primary row by year

| year | trades | total R | mean return | mean excess vs Nifty | top decile (continuation) excess | median decile excess |
|---|---|---|---|---|---|---|
| 2017 | 845 | +12.85 | +0.28% | -0.13% | -0.05% on 835 | -0.55% on 856 |
| 2018 | 2358 | -275.67 | -1.00% | -1.10% | -1.41% on 2362 | -0.97% on 2385 |
| 2019 | 2420 | -178.18 | -0.62% | -0.87% | -0.88% on 2424 | -0.61% on 2433 |
| 2020 | 2275 | +1.53 | -0.14% | -0.56% | -0.73% on 2225 | -0.35% on 2312 |
| 2021 | 2436 | -95.75 | -0.21% | -0.68% | -0.33% on 2423 | -0.29% on 2471 |
| 2022 | 2370 | -90.91 | -0.20% | -0.18% | -1.18% on 2399 | -0.34% on 2416 |
| 2023 | 2435 | +254.35 | +0.65% | +0.21% | +0.01% on 2409 | -0.11% on 2452 |
| 2024 | 2425 | -175.18 | -0.38% | -0.49% | -0.42% on 2424 | -0.14% on 2465 |
| 2025 | 2298 | -276.67 | -0.91% | -1.00% | -0.94% on 2370 | -0.73% on 2381 |
| 2026 | 2136 | -198.85 | -0.51% | -0.42% | -0.24% on 2162 | -0.44% on 2170 |

## Coverage

2288 signal days from 2017-08-28 (the 200-day average needs 200 bars; the first day with 20+ eligible names), 98.3 eligible names a day on average (members, top 100 by turnover, above their 200-day), 9.73 signals a day. Primary-row skips: {"gap":261,"none":4}; desk-row skips: {"full":20598,"gap":53}.

## Exit reasons (primary)

- time: 18218
- stop: 3413
- stop (gap): 318
- end of data: 49

## How to read this

Reversal is the claim that a liquid name's worst week in an uptrend is followed by a better one. The median-decile row is what an ordinary week does; the primary row has to beat it, and the continuation row should sit below both. Membership is point-in-time and the history holds the past members. The remaining caveat is liquidity itself: the top-100-by-turnover screen is a stand-in for the NIFTY 100, chosen because no membership history for that index exists in the repository.