# Short-term reversal backtest — 2026-11-23-adjusted-members

History 2016-11-07 → 2026-11-20 (2490 days, 895 symbols, corporate actions applied). Rule: {"liquid":100,"turnBars":20,"trend":200,"lookback":5,"decile":0.1,"hold":5,"atrMult":2,"stopFloor":0.02,"gapSkip":0.03,"costBps":30,"maxPositions":4,"minEligible":20}. Universe: that day's NIFTY 500 members, top 100 by 20-bar turnover, close above the own 200-day average. Hypothesis, pass mark and decision rule were written before the run: `reports/reversal-hypotheses-2026-11-13.md`. Mechanics (trade, stats, verdict) are the PEAD script's, so the two event studies are measured identically.

## Verdict: **FAIL** — expectancy -0.048R < +0.1R; excess over the index positive in 1 of 10 years with 20+ trades (needs 6)

Per the decision rule: the swing queue is empty. Every entry on the list has been tested against the same +0.1R-over-300 bar on the full membership and none cleared it; swingMode stays watch, the swing setups stay on the site and in the digest as levels, and the desk is the momentum paper book beside the index fund.

## Rows

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **primary**: bottom decile of 5-day return (< 0), top-100 liquid, above 200-day, 5-bar hold | 22025 | -0.048R | 0.84 | 46% | -0.36% | -0.57% | -9.75 | 1083.5R | 4.6 | 1/10 | — |
| top decile of 5-day return (continuation control) | 22048 | -0.048R | 0.86 | 44% | -0.41% | -0.64% | -8.40 | 1152.0R | 4.5 | 1/10 | — |
| median decile (base rate) | 22376 | -0.042R | 0.88 | 46% | -0.24% | -0.47% | -7.71 | 1026.8R | 4.5 | 0/10 | — |
| primary rule on all members above their 200-day (liquidity control) | 60817 | -0.033R | 0.89 | 46% | -0.21% | -0.44% | -11.26 | 2219.5R | 4.7 | 2/10 | — |
| desk: primary with ≤ 4 open, one per sector, most negative first | 1612 | -0.015R | 0.95 | 46% | -0.08% | -0.35% | -0.84 | 37.6R | 4.7 | 3/10 | — |

Expectancy is in R (risk = entry − stop, stop = 2 × ATR(14) below the entry, floor 2%), after 30 bps round trip. "Mean excess vs Nifty" is the trade's return minus the NIFTY 50's from the signal day's close to the exit day's close. The continuation row is the same universe's best week bought instead of its worst; reversal predicts it does worse than the primary row. The liquidity row drops the top-100 screen: reversal is known to be strongest where trading is dearest, so a big gap between that row and the primary one says the effect lives where the desk cannot trade it.

## Information only (not for the verdict)

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| primary rule, 3-bar hold | 22025 | -0.051R | 0.80 | 45% | -0.36% | -0.50% | -12.49 | 1130.4R | 2.9 | 0/10 | — |
| primary rule, 10-bar hold | 22025 | -0.040R | 0.90 | 44% | -0.35% | -0.73% | -6.10 | 937.7R | 8.5 | 1/10 | — |
| bottom quintile instead of decile, 5 bars | 42220 | -0.049R | 0.85 | 46% | -0.34% | -0.55% | -13.28 | 2110.1R | 4.6 | 1/10 | — |

## Primary row by year

| year | trades | total R | mean return | mean excess vs Nifty | top decile (continuation) excess | median decile excess |
|---|---|---|---|---|---|---|
| 2017 | 845 | +11.52 | +0.28% | -0.12% | +0.02% on 835 | -0.55% on 856 |
| 2018 | 2359 | -281.65 | -1.04% | -1.14% | -1.36% on 2363 | -0.97% on 2388 |
| 2019 | 2422 | -178.49 | -0.62% | -0.87% | -0.87% on 2426 | -0.60% on 2436 |
| 2020 | 2285 | -1.06 | -0.15% | -0.56% | -0.75% on 2236 | -0.41% on 2322 |
| 2021 | 2433 | -106.97 | -0.25% | -0.72% | -0.28% on 2420 | -0.30% on 2471 |
| 2022 | 2383 | -81.44 | -0.19% | -0.19% | -1.16% on 2411 | -0.47% on 2431 |
| 2023 | 2435 | +245.71 | +0.64% | +0.20% | -0.02% on 2409 | -0.12% on 2453 |
| 2024 | 2423 | -160.26 | -0.36% | -0.47% | -0.42% on 2417 | -0.14% on 2465 |
| 2025 | 2304 | -284.52 | -0.98% | -1.07% | -0.80% on 2374 | -0.72% on 2385 |
| 2026 | 2136 | -211.65 | -0.58% | -0.50% | -0.29% on 2157 | -0.44% on 2169 |

## Coverage

2288 signal days from 2017-08-28 (the 200-day average needs 200 bars; the first day with 20+ eligible names), 98.4 eligible names a day on average (members, top 100 by turnover, above their 200-day), 9.75 signals a day. Primary-row skips: {"gap":277}; desk-row skips: {"full":20632,"gap":58}.

## Exit reasons (primary)

- time: 18242
- stop: 3387
- stop (gap): 347
- end of data: 49

## How to read this

Reversal is the claim that a liquid name's worst week in an uptrend is followed by a better one. The median-decile row is what an ordinary week does; the primary row has to beat it, and the continuation row should sit below both. Membership is point-in-time and the history holds the past members. The remaining caveat is liquidity itself: the top-100-by-turnover screen is a stand-in for the NIFTY 100, chosen because no membership history for that index exists in the repository.