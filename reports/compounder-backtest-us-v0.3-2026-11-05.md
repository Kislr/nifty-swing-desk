# Compounder backtest — United States, 2026-11-05 — v0.3, attempt two of two

Screen v0.3.0 replayed point-in-time on 44 quarterly cohorts, 2015-01-02 → 2025-10-01, each held twelve months (last exit 2026-10-01). Universe: 3152 screenable 10-K filers in the EDGAR store of 2026-10-25; prices from Yahoo (2014-10-30 → 2026-11-04); benchmark Russell 2000. Ranked universe = priced, inside the $300M–$10000M cap band on the date and above the $3M/day liquidity floor. **Research aid, not investment advice.** Composite (v0.3.0): every company is ordered by the number of gates it passes (growthWithoutDilution, cashConversion, leverage: 3 down to 0), then by ROCE level inside each tier; the quality list passes all gates and the ROCE level rule. Hypothesis as written before the run (SCREEN.md, v0.3): Among companies that are not diluting, convert earnings to cash and carry little debt, the more profitable (higher return on capital employed, measured as a level) outperform the less profitable over the following twelve months.

## Verdict: FAIL

| criterion (fixed in screen.json before any result existed) | result | pass |
|---|---|---|
| top decile beats bottom decile in at least 70% of cohorts | 50% of 44 cohorts | **no** |
| top decile mean excess return > 0 AND median excess return > 0 | mean +4.9%, median +7.2% | yes |
| no single +/- 20% threshold shift flips topBeatsBottom to false | ROCE threshold 9.6: 50%; ROCE threshold 14.4: 50%; revenue CAGR 8: 52%; revenue CAGR 12: 57%; share-count growth 8: 55%; share-count growth 12: 55%; OCF / NI 0.64: 50%; OCF / NI 0.96: 52%; net debt / EBITDA 1.6: 52%; net debt / EBITDA 2.4: 52% | **no** |

**Read the second row with the survivor gap in mind.** The store holds today's filers, so every cohort is made of companies that were still listed in 2026; the Russell 2000 of the day included the ones that later failed. That flatters every portfolio against the index — the bottom decile included (see below) — so "beats the index" is not evidence on its own. Top decile against bottom decile is the comparison where both sides carry the same bias, and it is the one that decides.

## The four portfolios, twelve-month returns averaged over cohorts

| portfolio | cohorts | mean return | mean excess vs RUT | median excess | beats the index in | worst cohort | best cohort |
|---|---|---|---|---|---|---|---|
| Top decile by composite | 44 | +14.9% | +4.9% | +7.2% | 64% | -11.2% | +19.3% |
| Bottom decile | 44 | +18.8% | +8.8% | +4.7% | 68% | -19.2% | +96.1% |
| All passers (the quality list) | 44 | +16.0% | +6.0% | +6.0% | 70% | -11.4% | +21.0% |
| Quality AND momentum | 26 | +13.8% | +7.7% | +8.3% | 81% | -12.9% | +30.7% |
| Russell 2000 | 44 | +10.0% | | | | | |

Average decile size 85 names (ranked universe 844 per cohort); the quality list averages 35 names and 100% of it sits inside the top decile (the sanity check in the decisions). Quality AND momentum is empty whenever the Russell 2000 was below its 200-day average on the cohort date (15 of 41 dated cohorts).

## Rolling portfolio (the last four cohorts held, a quarter each, marked monthly)

| portfolio | 2015-01-02 → 2026-11-04 | total | CAGR | max drawdown |
|---|---|---|---|---|
| Top decile | | +233% | +10.7% | 23% |
| All passers | | +252% | +11.3% | 25% |
| Bottom decile | | +298% | +12.4% | 34% |
| Russell 2000 | | +138% | | 34% |

## By cohort

| entry | exit | ranked | decile | passers | Q&M | gate | top | bottom | passers | Q&M | RUT | top − RUT | top > bottom | top p10 / p50 / p90 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015-01-02 | 2015-12-31 | 600 | 60 | 18 | 0 | — | +6% | -5% | +2% | — | -5% | +11% | yes | -30% / -3% / +53% |
| 2015-04-01 | 2016-03-31 | 653 | 66 | 47 | 0 | — | -4% | -11% | -5% | — | -11% | +7% | yes | -37% / -1% / +27% |
| 2015-07-01 | 2016-06-30 | 649 | 65 | 48 | 0 | — | -1% | -3% | -5% | — | -8% | +7% | yes | -39% / -0% / +36% |
| 2015-10-01 | 2016-09-30 | 645 | 65 | 52 | 0 | closed | +13% | +25% | +8% | — | +14% | -1% | no | -27% / +7% / +58% |
| 2016-01-04 | 2017-01-03 | 632 | 64 | 48 | 0 | closed | +21% | +22% | +16% | — | +23% | -2% | no | -15% / +20% / +63% |
| 2016-04-01 | 2017-03-31 | 678 | 68 | 46 | 0 | closed | +13% | +39% | +15% | — | +24% | -11% | no | -21% / +12% / +48% |
| 2016-07-01 | 2017-06-30 | 677 | 68 | 44 | 22 | open | +12% | +21% | +14% | +23% | +22% | -10% | no | -25% / +9% / +49% |
| 2016-10-03 | 2017-10-03 | 668 | 67 | 36 | 18 | open | +14% | +15% | +13% | +14% | +21% | -8% | no | -23% / +7% / +49% |
| 2017-01-03 | 2018-01-03 | 683 | 69 | 37 | 19 | open | +20% | +31% | +20% | +20% | +14% | +7% | no | -19% / +15% / +67% |
| 2017-04-03 | 2018-04-03 | 712 | 72 | 29 | 15 | open | +23% | +11% | +24% | +26% | +10% | +12% | yes | -20% / +22% / +67% |
| 2017-07-03 | 2018-07-03 | 707 | 71 | 28 | 14 | open | +26% | +13% | +31% | +21% | +16% | +10% | yes | -14% / +24% / +79% |
| 2017-10-02 | 2018-10-02 | 705 | 71 | 29 | 15 | open | +28% | +9% | +26% | +33% | +10% | +18% | yes | -26% / +22% / +76% |
| 2018-01-02 | 2019-01-02 | 698 | 70 | 26 | 13 | open | -4% | -17% | -12% | -18% | -13% | +8% | yes | -47% / -4% / +44% |
| 2018-04-02 | 2019-04-02 | 770 | 77 | 28 | 14 | open | +10% | +11% | +1% | +0% | +4% | +6% | no | -19% / +7% / +42% |
| 2018-07-02 | 2019-07-02 | 786 | 79 | 27 | 14 | open | +4% | +2% | -6% | -5% | -6% | +9% | yes | -33% / -0% / +46% |
| 2018-10-01 | 2019-10-01 | 751 | 76 | 28 | 14 | open | -2% | -5% | -1% | -9% | -11% | +9% | yes | -37% / -2% / +28% |
| 2019-01-02 | 2020-01-02 | 784 | 79 | 29 | 0 | closed | +34% | +32% | +43% | — | +23% | +11% | yes | -14% / +34% / +77% |
| 2019-04-01 | 2020-03-31 | 817 | 82 | 34 | 0 | closed | -15% | -33% | -13% | — | -26% | +11% | yes | -42% / -16% / +24% |
| 2019-07-01 | 2020-06-30 | 798 | 80 | 33 | 17 | open | +11% | +6% | +11% | +3% | -8% | +19% | yes | -30% / +6% / +54% |
| 2019-10-01 | 2020-09-30 | 788 | 79 | 33 | 0 | closed | +18% | +35% | +20% | — | +1% | +17% | no | -26% / +16% / +60% |
| 2020-01-02 | 2020-12-31 | 791 | 80 | 32 | 16 | open | +31% | +70% | +28% | +39% | +18% | +13% | no | -4% / +27% / +84% |
| 2020-04-01 | 2021-04-01 | 848 | 85 | 32 | 0 | closed | +109% | +206% | +125% | — | +110% | -1% | no | +41% / +94% / +185% |
| 2020-07-01 | 2021-07-01 | 859 | 86 | 28 | 0 | closed | +55% | +99% | +66% | — | +63% | -8% | no | +5% / +50% / +101% |
| 2020-10-01 | 2021-10-01 | 828 | 83 | 26 | 13 | open | +44% | +77% | +42% | +34% | +46% | -2% | no | -3% / +39% / +93% |
| 2021-01-04 | 2022-01-04 | 841 | 85 | 23 | 12 | open | +32% | +31% | +38% | +47% | +17% | +15% | yes | -10% / +25% / +82% |
| 2021-04-01 | 2022-04-01 | 941 | 95 | 21 | 11 | open | +6% | +7% | +6% | +3% | -7% | +13% | no | -25% / -1% / +45% |
| 2021-07-01 | 2022-07-01 | 909 | 91 | 21 | 11 | open | -15% | -21% | -15% | -9% | -26% | +11% | yes | -48% / -14% / +15% |
| 2021-10-01 | 2022-09-30 | 886 | 89 | 27 | 14 | open | -16% | -22% | -20% | -13% | -26% | +10% | yes | -45% / -19% / +24% |
| 2022-01-03 | 2023-01-03 | 855 | 86 | 27 | 14 | open | -16% | -13% | -20% | -13% | -23% | +7% | no | -47% / -17% / +20% |
| 2022-04-01 | 2023-03-31 | 920 | 92 | 43 | 0 | closed | -1% | -11% | -0% | — | -14% | +12% | yes | -38% / -1% / +35% |
| 2022-07-01 | 2023-06-30 | 928 | 93 | 47 | 0 | closed | +23% | +24% | +28% | — | +9% | +14% | no | -27% / +17% / +71% |
| 2022-10-03 | 2023-10-03 | 913 | 92 | 47 | 0 | closed | +14% | +16% | +19% | — | +1% | +13% | no | -30% / +14% / +61% |
| 2023-01-03 | 2024-01-03 | 911 | 92 | 47 | 0 | closed | +26% | +20% | +30% | — | +12% | +14% | yes | -28% / +19% / +80% |
| 2023-04-03 | 2024-04-02 | 973 | 98 | 52 | 0 | closed | +28% | +8% | +27% | — | +15% | +13% | yes | -24% / +20% / +93% |
| 2023-07-03 | 2024-07-02 | 975 | 98 | 52 | 26 | open | +14% | +9% | +10% | +23% | +7% | +6% | yes | -37% / +12% / +64% |
| 2023-10-02 | 2024-10-01 | 941 | 95 | 53 | 0 | closed | +21% | +26% | +14% | — | +25% | -4% | no | -37% / +18% / +88% |
| 2024-01-02 | 2024-12-31 | 964 | 97 | 49 | 25 | open | +9% | +12% | +6% | +27% | +11% | -2% | no | -44% / -2% / +71% |
| 2024-04-01 | 2025-04-01 | 1075 | 108 | 33 | 17 | open | -6% | -6% | -1% | +5% | -4% | -2% | yes | -49% / -15% / +38% |
| 2024-07-01 | 2025-07-01 | 1061 | 107 | 36 | 18 | open | +3% | +6% | +12% | +16% | +8% | -5% | no | -37% / -2% / +47% |
| 2024-10-01 | 2025-10-01 | 1021 | 103 | 36 | 18 | open | +2% | +28% | +8% | +18% | +11% | -10% | no | -33% / -7% / +52% |
| 2025-01-02 | 2026-01-02 | 1048 | 105 | 32 | 16 | open | +2% | +22% | +5% | +1% | +12% | -10% | no | -39% / -2% / +52% |
| 2025-04-01 | 2026-04-01 | 1126 | 113 | 32 | 0 | closed | +26% | +19% | +36% | — | +25% | +1% | yes | -37% / +10% / +94% |
| 2025-07-01 | 2026-07-01 | 1137 | 114 | 30 | 15 | open | +26% | +28% | +49% | +57% | +37% | -11% | no | -30% / +16% / +86% |
| 2025-10-01 | 2026-10-01 | 1164 | 117 | 32 | 15 | open | +11% | -4% | +10% | +17% | +15% | -3% | yes | -30% / +9% / +58% |

## Survivor gap

The store holds today's filers only, so every cohort is survivors of the present: companies that left EDGAR before 2026-10-25 (taken over, failed, delisted) are **absent and uncounted** — that is the larger part of the bias and it cannot be measured from this store (it needs the EDGAR full-index of 10-K filers per quarter, which this environment cannot reach). What can be measured, and is: among companies with 5+ fiscal years filed by the cohort date and a 10-K in the previous 15 months, the share with **no price on the date** (2.0% on average — a name listed later under its current ticker, or a Yahoo history that does not reach back), and among the ranked names the share that **stop trading before the exit** (0.0% — sold at the last close, which flatters a takeover and understates a failure). Tags from the EDGAR store: no price → still filing 1400, stopped filing 110; left during hold → none (company-cohorts, so one company counts once per cohort).

| cap bucket on the date | active filers (company-cohorts) | no price | share | priced | left during hold | share |
|---|---|---|---|---|---|---|
| <$300M | 19402 | 1027 | 5.3% | 18375 | 0 | 0.0% |
| $300M–1B | 14177 | 204 | 1.4% | 13973 | 0 | 0.0% |
| $1–2B | 9878 | 52 | 0.5% | 9826 | 0 | 0.0% |
| $2–10B | 21990 | 185 | 0.8% | 21805 | 0 | 0.0% |
| >$10B | 17470 | 34 | 0.2% | 17436 | 0 | 0.0% |
| unknown | 104 | 8 | 7.7% | 96 | 0 | 0.0% |

Decision rule (SCREEN.md, 29 Oct): if the gap is large, raise the $300M floor to the lowest bucket where it falls under about 5%, judged from this table — and if the floor climbs past about $2B, the benchmark must change from the Russell 2000. The "no price" column is the measurable proxy; the unmeasured delisted population would add to it, most in the smallest bucket.

## Diagnostics: the same cohorts, ranked differently

Not part of the pass criteria. They answer two questions the decisions raise: whether the composite construction (passers first per trait, then failers) matters, and whether the cap band does.

| ranking | decile size | top > bottom | top mean excess | top median excess | bottom mean excess | passers mean excess | quality list inside top decile |
|---|---|---|---|---|---|---|---|
| as written (cap band, passers first) | 85 | 50% | +4.9% | +7.2% | +8.8% | +6.0% | 100% |
| every priced filer, no cap band or liquidity floor | 186 | 43% | +4.6% | +6.5% | +83.1% | +3.4% | 100% |

## Robustness: every threshold ±20%, one at a time

| threshold | as written | shifted to | top > bottom | top mean excess | top median excess | passers mean excess | passers per cohort |
|---|---|---|---|---|---|---|---|
| ROCE threshold | 12 | 9.6 | 50% **←** | +4.9% | +7.2% | +5.5% | 43 |
| ROCE threshold | 12 | 14.4 | 50% **←** | +4.9% | +7.2% | +6.6% | 27 |
| revenue CAGR | 10 | 8 | 52% **←** | +4.6% | +5.2% | +5.7% | 51 |
| revenue CAGR | 10 | 12 | 57% **←** | +5.1% | +8.5% | +6.5% | 27 |
| share-count growth | 10 | 8 | 55% **←** | +5.5% | +8.0% | +6.9% | 34 |
| share-count growth | 10 | 12 | 55% **←** | +4.8% | +7.2% | +6.1% | 37 |
| OCF / NI | 0.8 | 0.64 | 50% **←** | +4.6% | +7.1% | +6.1% | 37 |
| OCF / NI | 0.8 | 0.96 | 52% **←** | +5.2% | +6.8% | +6.2% | 33 |
| net debt / EBITDA | 2 | 1.6 | 52% **←** | +5.4% | +8.6% | +6.5% | 33 |
| net debt / EBITDA | 2 | 2.4 | 52% **←** | +4.6% | +6.5% | +6.2% | 37 |

## How to read this

Each cohort buys its portfolio equal-weight at the close of the first trading day of the quarter and holds twelve months with no rebalancing, so adjacent cohorts overlap by nine months and the 44 cohorts are nearer 11 independent observations than 44. Composite (v0.3.0): every company is ordered by the number of gates it passes (growthWithoutDilution, cashConversion, leverage: 3 down to 0), then by ROCE level inside each tier; the quality list passes all gates and the ROCE level rule. Top and bottom deciles are cut from that ranking inside the cap band, so a decile is ~85 names and one takeover cannot decide it. Point-in-time: a fiscal year is visible only from the filing date of the 10-K that first reported it; market cap uses the cover-page share count of that 10-K and the price on the cohort date. Returns use Yahoo's split- and dividend-adjusted closes. Costs are not deducted (a quarterly-rebalanced portfolio of ~85 names turns over roughly a quarter of its names a year; budget about 0.3% a year). The pass criteria were written in screen.json before this script existed. Fails twice → the screen is shelved and the reasons written up here, as with pairs.

Reproduce: `node scripts/compounder-backtest-us.mjs` (about 50 s). Every number per cohort, portfolio member list and the rolling curves are in the .json beside this file.
