# PEAD backtest — 2026-11-13-adjusted-members

History 2016-11-07 → 2026-11-12 (2474 days, 895 symbols, corporate actions applied). Events: `data\results\events.json` built 2026-11-13, sources raw. Rule: {"volx":2,"decile":0.9,"window":90,"minWindow":30,"hold":20,"atrMult":2,"stopFloor":0.02,"gapSkip":0.03,"costBps":30,"maxPositions":4}. Universe: that day's NIFTY 500 members. Hypothesis, pass mark and decision rule were written before the data existed: `reports/pead-hypotheses-2026-11-13.md`.

## Verdict: **FAIL** — expectancy 0.093R < +0.1R; excess over the index positive in 5 of 10 years with 20+ trades (needs 6); one year supplies 63% of total R (cap 40%)

Per the decision rule: PEAD is closed; the next swing hypothesis is the short-term reversal in Nifty 100 names above their 200-day average, written first.

## Rows

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **primary**: top decile, volx ≥ 2, 20-bar hold | 1860 | +0.093R | 1.10 | 17% | +0.18% | -0.10% | 1.19 | 181.8R | 5 | 5/10 | 63% |
| top decile, no volume screen | 2332 | +0.122R | 1.13 | 16% | +0.24% | -0.08% | 1.66 | 158.8R | 5 | 7/10 | 47% |
| bottom decile, volx ≥ 2 (direction control) | 1421 | -0.440R | 0.55 | 10% | -0.88% | -1.03% | -7.20 | 654.9R | 3 | 0/10 | — |
| every event with volx ≥ 2 (base rate) | 8898 | -0.103R | 0.89 | 15% | -0.21% | -0.45% | -3.35 | 1009.5R | 5 | 2/10 | — |
| desk: primary with ≤ 4 open, one per sector | 689 | +0.089R | 1.10 | 18% | +0.18% | -0.16% | 0.69 | 93.3R | 5 | 4/10 | 79% |

Expectancy is in R (risk = entry − stop, stop = 2 × ATR(14) below the entry, floor 2%), after 30 bps round trip, so it reads like every other swing report. "Mean excess vs Nifty" is the trade's return minus the NIFTY 50's from the reaction day's close to the exit day's close. t is the mean R over its standard error. The desk row shows what four slots, one per sector, would have captured — results come in seasons, so it is a fraction of the primary row.

## Information only (not for the verdict)

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| primary rule, 10-bar hold | 1860 | -0.030R | 0.96 | 20% | -0.06% | -0.32% | -0.52 | 186.3R | 3 | 3/10 | — |
| primary rule, 30-bar hold | 1860 | +0.148R | 1.16 | 14% | +0.29% | -0.09% | 1.69 | 176.2R | 7 | 5/10 | 65% |
| top quintile instead of decile, volx ≥ 2, 20 bars | 3067 | +0.166R | 1.18 | 17% | +0.33% | +0.00% | 2.64 | 264.4R | 5 | 7/10 | 61% |

## Primary row by year

| year | trades | total R | mean return | mean excess vs Nifty | base rate (all ≥2× vol) |
|---|---|---|---|---|---|
| 2016 | 1 | -1.07 | -2.15% | -1.19% | -1.46% on 6 |
| 2017 | 210 | -59.47 | -0.57% | -0.73% | -0.54% on 746 |
| 2018 | 221 | -86.95 | -0.79% | -1.31% | -1.29% on 893 |
| 2019 | 209 | +0.65 | +0% | +0% | -0.57% on 926 |
| 2020 | 199 | +104.64 | +1.05% | -0.06% | +0.12% on 824 |
| 2021 | 167 | +90.22 | +1.08% | +0.15% | -0.43% on 782 |
| 2022 | 178 | +16.37 | +0.18% | +0.24% | -0.51% on 879 |
| 2023 | 181 | +108.53 | +1.2% | +0.48% | +0.15% on 916 |
| 2024 | 172 | -16.06 | -0.19% | -0.2% | -0.6% on 931 |
| 2025 | 190 | +21.47 | +0.22% | +0.2% | -0.62% on 1108 |
| 2026 | 132 | -5.06 | -0.08% | +0.8% | -0.13% on 887 |

## Coverage

93106 events in the file; 57165 on 1866 symbols with no bars (AMJLAND, ANDHRSUGAR, ANTGRAPHIC, ATULAUTO, BAFNAPHARM, BALKRISHNA, BSLIMITED, DSKULKARNI, DWARKESH, INSPIRISYS, JAYAGROGN, KARUNACAB, MAZDA, MUNJALAU, PAISALO, PALREDTEC, PDMJEPAPER, PENINLAND, ROHLTD, RUSHIL, …); 0 outside the bars or the --from/--to window; 1923 without the 21 bars a reaction needs; 9403 not in the NIFTY 500 on the reaction day; **24615 reactions measured**, 24589 of them with a trailing-90-day decile (the first quarter of coverage has none). Reaction-day mapping: 5464 same day (timestamp before 15:30), 11256 next trading day (at or after 15:30, weekend or holiday), 7895 next trading day because the source had no time (board meetings). Primary-row skips: {"gap":63}; desk-row skips: {"full":1213,"gap":21}.

## Exit reasons (primary)

- stop: 1499
- time: 312
- stop (gap): 49

## How to read this

Drift is the claim that the reaction-day move continues; the base-rate row is what every heavy-volume results day did on average and the primary row has to beat it, not zero. The bottom-decile row is the symmetry check: if it is as positive as the top decile, the market rose and nothing drifted. Membership is point-in-time and the history holds the past members, so there is no survivorship correction left to make; the remaining biases are the ones the hypothesis names (late-night filings reported next morning cannot be told from pre-open filings; the 2× screen is looser in recent years).