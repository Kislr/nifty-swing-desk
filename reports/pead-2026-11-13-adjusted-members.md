# PEAD backtest — 2026-11-13-adjusted-members

History 2016-11-07 → 2026-11-12 (2474 days, 895 symbols, corporate actions applied). Events: `data/results/events.json` built 2026-11-13, sources raw. Rule: {"volx":2,"decile":0.9,"window":90,"minWindow":30,"hold":20,"atrMult":2,"stopFloor":0.02,"gapSkip":0.03,"costBps":30,"maxPositions":4}. Universe: that day's NIFTY 500 members. Hypothesis, pass mark and decision rule were written before the data existed: `reports/pead-hypotheses-2026-11-13.md`.

## Verdict: **FAIL** — one year supplies 41% of total R (cap 40%)

Per the decision rule: PEAD is closed; the next swing hypothesis is the short-term reversal in Nifty 100 names above their 200-day average, written first.

## Rows

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **primary**: top decile, volx ≥ 2, 20-bar hold | 1860 | +0.151R | 1.32 | 46% | +1.02% | +0.39% | 4.65 | 57.4R | 15 | 9/10 | 41% |
| top decile, no volume screen | 2332 | +0.143R | 1.30 | 46% | +1.06% | +0.34% | 4.89 | 71.3R | 15 | 8/10 | 36% |
| bottom decile, volx ≥ 2 (direction control) | 1421 | -0.142R | 0.73 | 37% | -1.19% | -1.75% | -4.92 | 224.2R | 15 | 3/10 | — |
| every event with volx ≥ 2 (base rate) | 8898 | +0.041R | 1.08 | 42% | +0.22% | -0.41% | 2.90 | 423.5R | 15 | 4/10 | 114% |
| desk: primary with ≤ 4 open, one per sector | 329 | +0.034R | 1.07 | 44% | +0.26% | -0.49% | 0.49 | 29.1R | 14 | 4/10 | 184% |

Expectancy is in R (risk = entry − stop, stop = 2 × ATR(14) below the entry, floor 2%), after 30 bps round trip, so it reads like every other swing report. "Mean excess vs Nifty" is the trade's return minus the NIFTY 50's from the reaction day's close to the exit day's close. t is the mean R over its standard error. The desk row shows what four slots, one per sector, would have captured — results come in seasons, so it is a fraction of the primary row.

## Information only (not for the verdict)

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| primary rule, 10-bar hold | 1860 | +0.074R | 1.19 | 49% | +0.51% | +0.05% | 2.97 | 40.7R | 8 | 4/10 | 64% |
| primary rule, 30-bar hold | 1860 | +0.193R | 1.36 | 43% | +1.27% | +0.34% | 5.08 | 82.8R | 20 | 7/10 | 46% |
| top quintile instead of decile, volx ≥ 2, 20 bars | 3067 | +0.190R | 1.40 | 47% | +1.27% | +0.59% | 7.17 | 84.0R | 15 | 8/10 | 38% |

## Primary row by year

| year | trades | total R | mean return | mean excess vs Nifty | base rate (all ≥2× vol) |
|---|---|---|---|---|---|
| 2016 | 1 | -1.02 | -7.07% | -4.23% | -1.46% on 6 |
| 2017 | 210 | +19.1 | +0.63% | +0.03% | -0.28% on 746 |
| 2018 | 221 | -30.6 | -1.25% | -2.24% | -2.71% on 893 |
| 2019 | 209 | +19.59 | +0.76% | +0.24% | -0.81% on 926 |
| 2020 | 199 | +102.45 | +4.05% | +1.56% | +0.88% on 824 |
| 2021 | 167 | +63.37 | +2.49% | +1.19% | +0.19% on 782 |
| 2022 | 178 | -11.99 | -0.64% | +0.06% | -0.83% on 879 |
| 2023 | 181 | +113.93 | +4.17% | +2.43% | +1.61% on 916 |
| 2024 | 172 | +14.32 | +0.37% | +0.17% | -0.95% on 931 |
| 2025 | 190 | +3.27 | +0.14% | +0.05% | -1.27% on 1108 |
| 2026 | 132 | -11.18 | -0.41% | +1.29% | +0.52% on 887 |

## Coverage

93106 events in the file; 57165 on 1866 symbols with no bars (AMJLAND, ANDHRSUGAR, ANTGRAPHIC, ATULAUTO, BAFNAPHARM, BALKRISHNA, BSLIMITED, DSKULKARNI, DWARKESH, INSPIRISYS, JAYAGROGN, KARUNACAB, MAZDA, MUNJALAU, PAISALO, PALREDTEC, PDMJEPAPER, PENINLAND, ROHLTD, RUSHIL, …); 0 outside the bars or the --from/--to window; 1923 without the 21 bars a reaction needs; 9403 not in the NIFTY 500 on the reaction day; **24615 reactions measured**, 24589 of them with a trailing-90-day decile (the first quarter of coverage has none). Reaction-day mapping: 5464 same day (timestamp before 15:30), 11256 next trading day (at or after 15:30, weekend or holiday), 7895 next trading day because the source had no time (board meetings). Primary-row skips: {"gap":63}; desk-row skips: {"full":1578,"gap":16}.

## Exit reasons (primary)

- stop: 724
- time: 1081
- stop (gap): 55

## How to read this

Drift is the claim that the reaction-day move continues; the base-rate row is what every heavy-volume results day did on average and the primary row has to beat it, not zero. The bottom-decile row is the symmetry check: if it is as positive as the top decile, the market rose and nothing drifted. Membership is point-in-time and the history holds the past members, so there is no survivorship correction left to make; the remaining biases are the ones the hypothesis names (late-night filings reported next morning cannot be told from pre-open filings; the 2× screen is looser in recent years).