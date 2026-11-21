# PEAD backtest — 2026-11-21-adjusted-members

History 2016-11-07 → 2026-11-20 (2480 days, 895 symbols, corporate actions applied). Events: `data/results/events.json` built 2026-11-19, sources raw. Rule: {"volx":2,"decile":0.9,"window":90,"minWindow":30,"hold":20,"atrMult":2,"stopFloor":0.02,"gapSkip":0.03,"costBps":30,"maxPositions":4}. Universe: that day's NIFTY 500 members. Hypothesis, pass mark and decision rule were written before the data existed: `reports/pead-hypotheses-2026-11-13.md`.

## Verdict: **PASS** — 0.154R over 1929 trades; excess positive in 7 of 10 years; largest year 38% of total R

Per the decision rule a pass means a paper season for "Results drift" before any talk of orders; swingMode stays watch. Owner, 21 Nov 2026: the season is taken as a frozen re-run — nothing built into the engine, the rule fixed, each results season read off this trade list afterwards (section "Results drift" below).

## Rows

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **primary**: top decile, volx ≥ 2, 20-bar hold | 1929 | +0.154R | 1.33 | 47% | +1.03% | +0.13% | 4.86 | 57.4R | 15 | 7/10 | 38% |
| top decile, no volume screen | 2406 | +0.147R | 1.31 | 46% | +1.09% | +0.13% | 5.16 | 71.3R | 15 | 6/10 | 34% |
| bottom decile, volx ≥ 2 (direction control) | 1472 | -0.133R | 0.74 | 37% | -1.12% | -1.87% | -4.68 | 223.4R | 15 | 2/10 | — |
| every event with volx ≥ 2 (base rate) | 9260 | +0.049R | 1.10 | 43% | +0.28% | -0.56% | 3.55 | 446.3R | 14 | 3/10 | 91% |
| desk: primary with ≤ 4 open, one per sector | 334 | +0.069R | 1.14 | 45% | +0.52% | -0.38% | 0.97 | 26.3R | 14 | 4/10 | 90% |

Expectancy is in R (risk = entry − stop, stop = 2 × ATR(14) below the entry, floor 2%), after 30 bps round trip, so it reads like every other swing report. "Mean excess vs Nifty" is the trade's return minus the NIFTY 50's from the reaction day's close to the exit day's close. t is the mean R over its standard error. The desk row shows what four slots, one per sector, would have captured — results come in seasons, so it is a fraction of the primary row.

## Information only (not for the verdict)

| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |
|---|---|---|---|---|---|---|---|---|---|---|---|
| primary rule, 10-bar hold | 1929 | +0.076R | 1.20 | 49% | +0.51% | -0.16% | 3.14 | 40.7R | 8 | 3/10 | 60% |
| primary rule, 30-bar hold | 1929 | +0.196R | 1.37 | 43% | +1.28% | +0.09% | 5.31 | 82.8R | 20 | 6/10 | 43% |
| top quintile instead of decile, volx ≥ 2, 20 bars | 3177 | +0.198R | 1.42 | 47% | +1.30% | +0.39% | 7.65 | 84.0R | 15 | 7/10 | 35% |

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
| 2026 | 197 | +14.03 | +0.56% | -1.21% | -0.95% on 1210 |

## Results drift — the paper reading (rule frozen 21 Nov 2026)

Owner's decision, 21 Nov 2026: the pass by the letter is taken as the paper season the 13 Nov rule prescribes, run as a **frozen re-run** — no setup in the engine, no orders; the rule is fixed and each results season is read off this trade list after it has happened (`reports/pead-results-drift-reading-2026-11-21.md`, written before any forward trade existed). A trade is **forward** when its reaction day is after 2026-11-21; earlier ones had been seen when the rule was frozen and are context, not evidence. **★ = showing promise**: at least +1R and ahead of the NIFTY 50 over the same bars, as of 2026-11-20 — listed first, in bold. The mark describes, it does not select: 23.6% of closed trades on the ten-year record carry it, and an open trade can lose it before it closes.

**No forward trade yet** — the first results season after the freeze is the Dec-quarter one (reaction days in January and February 2027); it is read after 12 Apr 2027, once the results dates have been topped up from home.

### Sep-quarter 2026 results (reaction days Oct–Dec 2026)

65 trades (0 forward, 65 seen before the freeze; 47 still open): +0.369R a trade, mean excess -6.39%; **5 ★** (8%); desk row took 7.

| | symbol | reaction day | reaction | volume × | entry | stop | status | return | R | vs Nifty | desk | forward |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ★ | **PNB** | 2026-10-19 | +4.8% | 5.6 | 2026-10-21 @ 122.68 | 115.28 | time 2026-11-19 | **+26.0%** | **+4.31R** | **+14.6%** | yes |  |
| ★ | **MAHABANK** | 2026-10-27 | +5.1% | 3.0 | 2026-10-28 @ 79.07 | 73.33 | open, 16 bars | **+25.6%** | **+3.53R** | **+12.2%** |  |  |
| ★ | **TATACONSUM** | 2026-10-27 | +6.8% | 5.4 | 2026-10-28 @ 998.45 | 950.37 | open, 16 bars | **+15.6%** | **+3.24R** | **+2.2%** |  |  |
| ★ | **IGIL** | 2026-10-22 | +9.7% | 14.7 | 2026-10-23 @ 357.54 | 335.63 | open, 19 bars | **+17.7%** | **+2.89R** | **+4.0%** | yes |  |
| ★ | **ATHERENERG** | 2026-10-26 | +14.1% | 3.1 | 2026-10-27 @ 1609.41 | 1451.01 | open, 17 bars | **+20.1%** | **+2.04R** | **+6.7%** | yes |  |
|  | HCLTECH | 2026-10-13 | +8.4% | 7.8 | 2026-10-14 @ 1321.98 | 1246.85 | time 2026-11-13 | +4.1% | +0.72R | -6.6% | yes |  |
|  | BHEL | 2026-10-14 | +4.9% | 4.0 | 2026-10-15 @ 451.18 | 421.6 | stop 2026-10-21 | -6.7% | -1.02R | -7.5% | yes |  |
|  | TARIL | 2026-10-14 | +15.0% | 13.8 | 2026-10-15 @ 351.08 | 319.43 | stop 2026-10-21 | -9.2% | -1.01R | -10.0% |  |  |
|  | TATAELXSI | 2026-10-14 | +5.7% | 11.2 | 2026-10-15 @ 3654.47 | 3419.79 | time 2026-11-16 | +2.5% | +0.38R | -9.3% |  |  |
|  | TECHM | 2026-10-16 | +8.5% | 8.1 | 2026-10-19 @ 1762.64 | 1651.54 | time 2026-11-18 | -0.9% | -0.14R | -9.9% |  |  |
|  | WIPRO | 2026-10-16 | +6.0% | 3.3 | 2026-10-19 @ 184.28 | 174.07 | time 2026-11-18 | +0.3% | +0.06R | -8.7% |  |  |
|  | LTTS | 2026-10-21 | +10.9% | 108.5 | 2026-10-22 @ 3966.84 | 3635.04 | time 2026-11-20 | +2.5% | +0.29R | -10.7% |  |  |
|  | CYIENT | 2026-10-23 | +6.8% | 25.3 | 2026-10-26 @ 1222.33 | 1109.93 | stop 2026-11-04 | -9.3% | -1.01R | -15.3% |  |  |
|  | COFORGE | 2026-10-26 | +4.9% | 2.1 | 2026-10-27 @ 1981.97 | 1842.28 | open, 17 bars | +5.1% | +0.73R | -8.3% |  |  |
|  | DRREDDY | 2026-10-26 | +6.6% | 4.6 | 2026-10-27 @ 1310.96 | 1245.02 | open, 17 bars | +5.9% | +1.17R | -7.5% |  |  |
|  | APLAPOLLO | 2026-10-27 | +6.5% | 3.8 | 2026-10-28 @ 2222.33 | 2090.19 | stop 2026-11-20 | -6.1% | -1.02R | -19.5% |  |  |
|  | KFINTECH | 2026-10-27 | +4.9% | 5.5 | 2026-10-28 @ 870.3 | 810.45 | open, 16 bars | +7.3% | +1.06R | -6.2% |  |  |
|  | MANKIND | 2026-10-27 | +8.2% | 4.7 | 2026-10-28 @ 2500.34 | 2330.09 | open, 16 bars | +6.4% | +0.94R | -7.0% |  |  |
|  | ONESOURCE | 2026-10-27 | +13.9% | 36.1 | 2026-10-28 @ 1622.43 | 1493.63 | open, 16 bars | -0.9% | -0.12R | -14.3% |  |  |
|  | SONACOMS | 2026-10-27 | +8.9% | 8.1 | 2026-10-28 @ 855.33 | 797.82 | open, 16 bars | +4.2% | +0.62R | -9.2% |  |  |
|  | KPRMILL | 2026-10-28 | +5.7% | 11.3 | 2026-10-29 @ 1101.65 | 1015.81 | open, 15 bars | +8.0% | +1.02R | -5.7% |  |  |
|  | PGEL | 2026-10-28 | +7.2% | 8.9 | 2026-10-29 @ 534.8 | 494.65 | open, 15 bars | +9.9% | +1.32R | -3.8% |  |  |
|  | PPLPHARMA | 2026-10-28 | +15.4% | 50.8 | 2026-10-29 @ 232.08 | 214.45 | open, 15 bars | +2.7% | +0.35R | -11.0% |  |  |
|  | SYNGENE | 2026-10-28 | +9.9% | 43.5 | 2026-10-29 @ 413.62 | 376.33 | open, 15 bars | +9.4% | +1.04R | -4.3% |  |  |
|  | ADANIPORTS | 2026-10-29 | +6.3% | 2.5 | 2026-10-30 @ 1873.81 | 1773.99 | open, 14 bars | +2.1% | +0.40R | -10.3% |  |  |
|  | BSOFT | 2026-10-29 | +11.5% | 21.1 | 2026-10-30 @ 336.1 | 301.49 | stop 2026-11-18 | -10.4% | -1.01R | -20.4% |  |  |
|  | CUB | 2026-10-29 | +5.5% | 3.1 | 2026-10-30 @ 226.35 | 207.2 | stop 2026-11-02 | -8.6% | -1.02R | -10.8% |  |  |
|  | JSWENERGY | 2026-10-29 | +5.6% | 7.0 | 2026-10-30 @ 510.76 | 476.66 | open, 14 bars | +0.4% | +0.06R | -12.1% |  |  |
|  | ZENSARTECH | 2026-10-29 | +8.1% | 5.5 | 2026-10-30 @ 537.81 | 492.99 | open, 14 bars | -1.8% | -0.21R | -14.3% |  |  |
|  | LAURUSLABS | 2026-10-30 | +7.2% | 4.8 | 2026-11-02 @ 2409.61 | 2261.18 | stop 2026-11-03 | -6.3% | -1.02R | -9.6% |  |  |
|  | TRENT | 2026-10-30 | +5.4% | 3.9 | 2026-11-02 @ 3038.95 | 2860.65 | open, 13 bars | +7.0% | +1.19R | -4.9% |  |  |
|  | VEDPOWER | 2026-10-30 | +14.4% | 11.3 | 2026-11-02 @ 33.05 | 29.34 | open, 13 bars | +4.9% | +0.44R | -7.0% |  |  |
|  | VOGL | 2026-10-30 | +8.0% | 13.1 | 2026-11-02 @ 30.34 | 27.18 | open, 13 bars | -3.8% | -0.36R | -15.7% |  |  |
|  | AFFLE | 2026-11-02 | +12.1% | 31.1 | 2026-11-03 @ 1506.26 | 1388.24 | open, 12 bars | +6.1% | +0.77R | -4.0% |  |  |
|  | DIXON | 2026-11-02 | +12.0% | 6.0 | 2026-11-03 @ 12360.51 | 11428.66 | open, 12 bars | +6.0% | +0.79R | -4.1% |  |  |
|  | ENGINERSIN | 2026-11-02 | +14.4% | 8.9 | 2026-11-03 @ 287.03 | 259.43 | open, 12 bars | +3.3% | +0.34R | -6.8% |  |  |
|  | INTELLECT | 2026-11-02 | +6.2% | 8.0 | 2026-11-03 @ 531.85 | 462.05 | open, 12 bars | +2.7% | +0.20R | -7.4% |  |  |
|  | MSUMI | 2026-11-02 | +12.4% | 18.2 | 2026-11-03 @ 38.86 | 36.14 | open, 12 bars | +9.3% | +1.33R | -0.7% |  |  |
|  | NH | 2026-11-02 | +7.0% | 5.1 | 2026-11-03 @ 1858.58 | 1751 | open, 12 bars | +4.5% | +0.78R | -5.6% |  |  |
|  | RELIANCE | 2026-11-02 | +11.6% | 5.8 | 2026-11-03 @ 1289.83 | 1216.45 | open, 12 bars | +6.6% | +1.17R | -3.4% |  |  |
|  | RKFORGE | 2026-11-02 | +7.8% | 11.1 | 2026-11-03 @ 707.16 | 640.01 | open, 12 bars | +4.7% | +0.49R | -5.4% |  |  |
|  | SJVN | 2026-11-02 | +6.2% | 7.8 | 2026-11-03 @ 57.19 | 51.72 | open, 12 bars | -2.8% | -0.29R | -12.8% |  |  |
|  | WELSPUNLIV | 2026-11-02 | +9.4% | 11.6 | 2026-11-03 @ 245.37 | 220.76 | open, 12 bars | +7.3% | +0.73R | -2.7% |  |  |
|  | ZENTEC | 2026-11-02 | +7.5% | 17.8 | 2026-11-03 @ 1672.51 | 1518.31 | open, 12 bars | +0.6% | +0.07R | -9.5% |  |  |
|  | MARICO | 2026-11-03 | +10.0% | 8.2 | 2026-11-04 @ 873.31 | 829.16 | open, 11 bars | +4.8% | +0.96R | -3.5% |  |  |
|  | TRIDENT | 2026-11-03 | +8.1% | 76.6 | 2026-11-04 @ 24.23 | 22.5 | open, 11 bars | -3.6% | -0.50R | -11.9% |  |  |
|  | EMCURE | 2026-11-04 | +10.6% | 8.1 | 2026-11-05 @ 2182.27 | 2024.25 | open, 10 bars | +7.0% | +0.97R | -0.7% |  |  |
|  | FRACTAL | 2026-11-04 | +16.8% | 17.3 | 2026-11-05 @ 838.26 | 752.08 | open, 10 bars | -2.5% | -0.24R | -10.1% |  |  |
|  | JYOTICNC | 2026-11-04 | +6.7% | 4.1 | 2026-11-05 @ 1060.59 | 958.59 | open, 10 bars | -1.1% | -0.12R | -8.8% |  |  |
|  | LINDEINDIA | 2026-11-04 | +10.8% | 13.9 | 2026-11-05 @ 6455.17 | 6028.45 | open, 10 bars | +1.6% | +0.23R | -6.1% |  |  |
|  | MEDANTA | 2026-11-04 | +6.4% | 11.2 | 2026-11-05 @ 1435.15 | 1333.79 | open, 10 bars | +3.2% | +0.45R | -4.5% |  |  |
|  | REDINGTON | 2026-11-04 | +8.7% | 5.1 | 2026-11-05 @ 375.56 | 336.08 | stop 2026-11-06 | -10.7% | -1.01R | -15.1% |  |  |
|  | BALKRISIND | 2026-11-05 | +8.0% | 4.8 | 2026-11-06 @ 2403.6 | 2257.4 | stop 2026-11-13 | -6.2% | -1.02R | -8.7% |  |  |
|  | SUNDARMFIN | 2026-11-05 | +6.5% | 2.9 | 2026-11-06 @ 4186.27 | 3920.1 | open, 9 bars | +2.8% | +0.44R | -2.3% |  |  |
|  | SAILIFE | 2026-11-06 | +10.6% | 27.5 | 2026-11-09 @ 1741.41 | 1616.49 | open, 8 bars | +3.2% | +0.45R | +0.1% |  |  |
|  | DATAPATTNS | 2026-11-09 | +6.8% | 8.3 | 2026-11-11 @ 4033.24 | 3595.16 | open, 7 bars | +4.3% | +0.40R | +1.3% |  |  |
|  | DIVISLAB | 2026-11-09 | +12.1% | 3.8 | 2026-11-11 @ 11777.64 | 11099 | stop 2026-11-16 | -5.9% | -1.02R | -6.9% |  |  |
|  | FINCABLES | 2026-11-09 | +11.9% | 10.8 | 2026-11-11 @ 1221.83 | 1070.67 | open, 7 bars | -1.9% | -0.15R | -4.9% |  |  |
|  | KALYANKJIL | 2026-11-11 | +8.6% | 10.8 | 2026-11-12 @ 676.01 | 620.71 | stop 2026-11-20 | -8.3% | -1.02R | -10.5% |  |  |
|  | CUPID | 2026-11-12 | +8.0% | 4.0 | 2026-11-13 @ 389.48 | 360.88 | stop 2026-11-16 | -7.5% | -1.02R | -7.5% |  |  |
|  | AMBER | 2026-11-13 | +9.1% | 13.9 | 2026-11-16 @ 6700.03 | 6106.11 | open, 4 bars | +0.5% | +0.05R | -2.2% | yes |  |
|  | AMBER | 2026-11-13 | +9.1% | 13.9 | 2026-11-16 @ 6700.03 | 6106.11 | open, 4 bars | +0.5% | +0.05R | -2.2% | yes |  |
|  | POWERINDIA | 2026-11-13 | +10.7% | 5.8 | 2026-11-16 @ 31942.84 | 29081.41 | open, 4 bars | -5.8% | -0.64R | -8.4% |  |  |
|  | BELRISE | 2026-11-16 | +9.2% | 32.6 | 2026-11-17 @ 236.6 | 219.1 | open, 3 bars | -0.1% | -0.02R | -2.1% |  |  |
|  | DEEPAKFERT | 2026-11-16 | +8.0% | 12.9 | 2026-11-17 @ 1369.45 | 1262.68 | open, 3 bars | +4.2% | +0.54R | +2.2% |  |  |

## Coverage

96071 events in the file; 59143 on 1939 symbols with no bars (AMJLAND, ANDHRSUGAR, ANTGRAPHIC, ATULAUTO, BAFNAPHARM, BALKRISHNA, BSLIMITED, DSKULKARNI, DWARKESH, INSPIRISYS, JAYAGROGN, KARUNACAB, MAZDA, MUNJALAU, PAISALO, PALREDTEC, PDMJEPAPER, PENINLAND, ROHLTD, RUSHIL, …); 0 outside the bars or the --from/--to window; 2021 without the 21 bars a reaction needs; 9706 not in the NIFTY 500 on the reaction day; **25201 reactions measured**, 25175 of them with a trailing-90-day decile (the first quarter of coverage has none). Reaction-day mapping: 5744 same day (timestamp before 15:30), 14481 next trading day (at or after 15:30, weekend or holiday), 4976 next trading day because the source had no time (board meetings). Primary-row skips: {"gap":64}; desk-row skips: {"full":1644,"gap":15}.

## Exit reasons (primary)

- stop: 741
- time: 1086
- stop (gap): 55
- end of data: 47

## How to read this

Drift is the claim that the reaction-day move continues; the base-rate row is what every heavy-volume results day did on average and the primary row has to beat it, not zero. The bottom-decile row is the symmetry check: if it is as positive as the top decile, the market rose and nothing drifted. Membership is point-in-time and the history holds the past members, so there is no survivorship correction left to make; the remaining biases are the ones the hypothesis names (late-night filings reported next morning cannot be told from pre-open filings; the 2× screen is looser in recent years).