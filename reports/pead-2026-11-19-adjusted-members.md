# PEAD backtest — 2026-11-19-adjusted-members

History 2016-11-07 → 2026-11-18 (2478 days, 895 symbols, corporate actions applied). Events: `data\results\events.json` built 2026-11-19, sources raw. Rule: {"volx":2,"decile":0.9,"window":90,"minWindow":30,"hold":20,"atrMult":2,"stopFloor":0.02,"gapSkip":0.03,"costBps":30,"maxPositions":4}. Universe: that day's NIFTY 500 members. Hypothesis, pass mark and decision rule were written before the data existed: `reports/pead-hypotheses-2026-11-13.md`.

## Verdict: **PASS** — 0.15R over 1929 trades; excess positive in 7 of 10 years; largest year 39% of total R

Per the decision rule: "Results drift" becomes a swing setup in paper mode for one results season before any talk of orders; swingMode stays watch.

## Rows

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **primary**: top decile, volx ≥ 2, 20-bar hold | 1929 | +0.150R | 1.32 | 47% | +1.01% | +0.16% | 4.76 | 57.4R | 15 | 7/10 | 39% |
| top decile, no volume screen | 2406 | +0.144R | 1.31 | 46% | +1.06% | +0.16% | 5.05 | 71.3R | 15 | 6/10 | 34% |
| bottom decile, volx ≥ 2 (direction control) | 1472 | -0.134R | 0.74 | 37% | -1.13% | -1.83% | -4.73 | 223.4R | 14 | 2/10 | — |
| every event with volx ≥ 2 (base rate) | 9260 | +0.044R | 1.09 | 43% | +0.25% | -0.53% | 3.23 | 446.3R | 14 | 3/10 | 101% |
| desk: primary with ≤ 4 open, one per sector | 334 | +0.067R | 1.13 | 45% | +0.50% | -0.37% | 0.94 | 26.3R | 14 | 4/10 | 93% |

Expectancy is in R (risk = entry − stop, stop = 2 × ATR(14) below the entry, floor 2%), after 30 bps round trip, so it reads like every other swing report. "Mean excess vs Nifty" is the trade's return minus the NIFTY 50's from the reaction day's close to the exit day's close. t is the mean R over its standard error. The desk row shows what four slots, one per sector, would have captured — results come in seasons, so it is a fraction of the primary row.

## Information only (not for the verdict)

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| primary rule, 10-bar hold | 1929 | +0.075R | 1.20 | 49% | +0.50% | -0.15% | 3.11 | 40.7R | 8 | 3/10 | 61% |
| primary rule, 30-bar hold | 1929 | +0.192R | 1.36 | 43% | +1.25% | +0.13% | 5.21 | 82.8R | 20 | 6/10 | 44% |
| top quintile instead of decile, volx ≥ 2, 20 bars | 3177 | +0.193R | 1.41 | 47% | +1.27% | +0.42% | 7.49 | 84.0R | 15 | 7/10 | 36% |

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
| 2025 | 194 | -6.54 | -0.26% | -0.31% | -1.24% on 1147 |
| 2026 | 197 | +7.39 | +0.3% | -0.85% | -0.71% on 1210 |

## Coverage

96071 events in the file; 59143 on 1939 symbols with no bars (AMJLAND, ANDHRSUGAR, ANTGRAPHIC, ATULAUTO, BAFNAPHARM, BALKRISHNA, BSLIMITED, DSKULKARNI, DWARKESH, INSPIRISYS, JAYAGROGN, KARUNACAB, MAZDA, MUNJALAU, PAISALO, PALREDTEC, PDMJEPAPER, PENINLAND, ROHLTD, RUSHIL, …); 0 outside the bars or the --from/--to window; 2021 without the 21 bars a reaction needs; 9706 not in the NIFTY 500 on the reaction day; **25201 reactions measured**, 25175 of them with a trailing-90-day decile (the first quarter of coverage has none). Reaction-day mapping: 5744 same day (timestamp before 15:30), 14481 next trading day (at or after 15:30, weekend or holiday), 4976 next trading day because the source had no time (board meetings). Primary-row skips: {"gap":64}; desk-row skips: {"full":1644,"gap":15}.

## Exit reasons (primary)

- stop: 739
- time: 1084
- stop (gap): 55
- end of data: 51

## How to read this

Drift is the claim that the reaction-day move continues; the base-rate row is what every heavy-volume results day did on average and the primary row has to beat it, not zero. The bottom-decile row is the symmetry check: if it is as positive as the top decile, the market rose and nothing drifted. Membership is point-in-time and the history holds the past members, so there is no survivorship correction left to make; the remaining biases are the ones the hypothesis names (late-night filings reported next morning cannot be told from pre-open filings; the 2× screen is looser in recent years).