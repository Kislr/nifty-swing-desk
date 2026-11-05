# Compounder backtest — United States, 2026-11-05

Screen v0.2.0 replayed point-in-time on 44 quarterly cohorts, 2015-01-02 → 2025-10-01, each held twelve months (last exit 2026-10-01). Universe: 3152 screenable 10-K filers in the EDGAR store of 2026-10-25; prices from Yahoo (2014-10-30 → 2026-11-04); benchmark Russell 2000. Ranked universe = priced, inside the $300M–$10000M cap band on the date and above the $3M/day liquidity floor. **Research aid, not investment advice.**

## Verdict: FAIL

| criterion (fixed in screen.json before any result existed) | result | pass |
|---|---|---|
| top decile beats bottom decile in at least 70% of cohorts | 57% of 44 cohorts | **no** |
| top decile mean excess return > 0 AND median excess return > 0 | mean +7.3%, median +5.7% | yes |
| no single +/- 20% threshold shift flips topBeatsBottom to false | ROCE threshold 9.6: 61%; ROCE threshold 14.4: 57%; ROCE floor 6.4: 57%; ROCE floor 9.6: 57%; gross-margin drop 2.4: 61%; gross-margin drop 3.6: 59%; revenue CAGR 8: 61%; revenue CAGR 12: 57%; share-count growth 8: 57%; share-count growth 12: 55%; OCF / NI 0.64: 57%; OCF / NI 0.96: 57%; net debt / EBITDA 1.6: 57%; net debt / EBITDA 2.4: 57% | **no** |

**Read the second row with the survivor gap in mind.** The store holds today's filers, so every cohort is made of companies that were still listed in 2026; the Russell 2000 of the day included the ones that later failed. That flatters every portfolio against the index — the bottom decile included (see below) — so "beats the index" is not evidence on its own. Top decile against bottom decile is the comparison where both sides carry the same bias, and it is the one that decides.

## The four portfolios, twelve-month returns averaged over cohorts

| portfolio | cohorts | mean return | mean excess vs RUT | median excess | beats the index in | worst cohort | best cohort |
|---|---|---|---|---|---|---|---|
| Top decile by composite | 44 | +17.3% | +7.3% | +5.7% | 82% | -8.6% | +39.1% |
| Bottom decile | 44 | +20.7% | +10.7% | +4.8% | 73% | -14.3% | +97.5% |
| All passers (the quality list) | 44 | +17.9% | +8.0% | +8.0% | 75% | -12.5% | +41.5% |
| Quality AND momentum | 26 | +11.9% | +5.8% | +1.7% | 54% | -15.6% | +45.3% |
| Russell 2000 | 44 | +10.0% | | | | | |

Average decile size 85 names (ranked universe 844 per cohort); the quality list averages 17 names and 81% of it sits inside the top decile (the sanity check in the decisions). Quality AND momentum is empty whenever the Russell 2000 was below its 200-day average on the cohort date (15 of 41 dated cohorts).

## Rolling portfolio (the last four cohorts held, a quarter each, marked monthly)

| portfolio | 2015-01-02 → 2026-11-04 | total | CAGR | max drawdown |
|---|---|---|---|---|
| Top decile | | +282% | +12.0% | 27% |
| All passers | | +295% | +12.3% | 29% |
| Bottom decile | | +389% | +14.4% | 34% |
| Russell 2000 | | +138% | | 34% |

## By cohort

| entry | exit | ranked | decile | passers | Q&M | gate | top | bottom | passers | Q&M | RUT | top − RUT | top > bottom | top p10 / p50 / p90 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015-01-02 | 2015-12-31 | 600 | 60 | 13 | 0 | — | -2% | -5% | -3% | — | -5% | +3% | yes | -36% / -4% / +28% |
| 2015-04-01 | 2016-03-31 | 653 | 66 | 30 | 0 | — | -6% | -10% | -2% | — | -11% | +5% | yes | -33% / -8% / +18% |
| 2015-07-01 | 2016-06-30 | 649 | 65 | 32 | 0 | — | -2% | -2% | -0% | — | -8% | +6% | no | -36% / -1% / +31% |
| 2015-10-01 | 2016-09-30 | 645 | 65 | 27 | 0 | closed | +16% | +26% | +10% | — | +14% | +2% | no | -27% / +10% / +63% |
| 2016-01-04 | 2017-01-03 | 632 | 64 | 27 | 0 | closed | +24% | +15% | +15% | — | +23% | +1% | yes | -8% / +26% / +51% |
| 2016-04-01 | 2017-03-31 | 678 | 68 | 23 | 0 | closed | +22% | +38% | +20% | — | +24% | -2% | no | -15% / +21% / +64% |
| 2016-07-01 | 2017-06-30 | 677 | 68 | 20 | 10 | open | +24% | +23% | +17% | +16% | +22% | +1% | yes | -18% / +20% / +80% |
| 2016-10-03 | 2017-10-03 | 668 | 67 | 17 | 9 | open | +19% | +20% | +9% | +18% | +21% | -2% | no | -28% / +18% / +66% |
| 2017-01-03 | 2018-01-03 | 683 | 69 | 17 | 9 | open | +25% | +28% | +19% | +33% | +14% | +11% | no | -18% / +21% / +70% |
| 2017-04-03 | 2018-04-03 | 712 | 72 | 12 | 6 | open | +24% | +9% | +19% | +29% | +10% | +14% | yes | -12% / +20% / +68% |
| 2017-07-03 | 2018-07-03 | 707 | 71 | 13 | 7 | open | +34% | +15% | +21% | +11% | +16% | +17% | yes | -9% / +29% / +82% |
| 2017-10-02 | 2018-10-02 | 705 | 71 | 13 | 7 | open | +31% | +15% | +17% | +30% | +10% | +21% | yes | -19% / +23% / +76% |
| 2018-01-02 | 2019-01-02 | 698 | 70 | 13 | 7 | open | -2% | -15% | -16% | -13% | -13% | +10% | yes | -39% / -3% / +36% |
| 2018-04-02 | 2019-04-02 | 770 | 77 | 14 | 7 | open | +10% | +10% | -8% | -8% | +4% | +6% | no | -17% / +5% / +40% |
| 2018-07-02 | 2019-07-02 | 786 | 79 | 13 | 7 | open | -0% | -3% | -11% | -15% | -6% | +5% | yes | -37% / -1% / +31% |
| 2018-10-01 | 2019-10-01 | 751 | 76 | 13 | 6 | open | -3% | -14% | -2% | -9% | -11% | +8% | yes | -38% / -9% / +39% |
| 2019-01-02 | 2020-01-02 | 784 | 79 | 13 | 0 | closed | +36% | +25% | +37% | — | +23% | +13% | yes | -24% / +38% / +86% |
| 2019-04-01 | 2020-03-31 | 817 | 82 | 18 | 0 | closed | -19% | -31% | -15% | — | -26% | +7% | yes | -63% / -23% / +28% |
| 2019-07-01 | 2020-06-30 | 798 | 80 | 13 | 7 | open | +6% | +21% | +9% | -6% | -8% | +14% | no | -39% / +0% / +55% |
| 2019-10-01 | 2020-09-30 | 788 | 79 | 14 | 0 | closed | +13% | +54% | +21% | — | +1% | +12% | no | -40% / +9% / +60% |
| 2020-01-02 | 2020-12-31 | 791 | 80 | 13 | 7 | open | +23% | +90% | +28% | +37% | +18% | +4% | no | -19% / +14% / +63% |
| 2020-04-01 | 2021-04-01 | 848 | 85 | 13 | 0 | closed | +149% | +208% | +146% | — | +110% | +39% | no | +30% / +131% / +307% |
| 2020-07-01 | 2021-07-01 | 859 | 86 | 12 | 0 | closed | +74% | +96% | +85% | — | +63% | +11% | no | +5% / +71% / +157% |
| 2020-10-01 | 2021-10-01 | 828 | 83 | 13 | 7 | open | +58% | +85% | +55% | +44% | +46% | +11% | no | +1% / +53% / +119% |
| 2021-01-04 | 2022-01-04 | 841 | 85 | 13 | 7 | open | +35% | +33% | +58% | +62% | +17% | +19% | yes | -13% / +29% / +87% |
| 2021-04-01 | 2022-04-01 | 941 | 95 | 9 | 5 | open | -1% | +3% | -3% | -12% | -7% | +6% | no | -26% / -4% / +29% |
| 2021-07-01 | 2022-07-01 | 909 | 91 | 9 | 5 | open | -21% | -22% | -22% | -21% | -26% | +5% | yes | -47% / -21% / +6% |
| 2021-10-01 | 2022-09-30 | 886 | 89 | 9 | 5 | open | -21% | -23% | -21% | -22% | -26% | +5% | yes | -45% / -21% / +13% |
| 2022-01-03 | 2023-01-03 | 855 | 86 | 11 | 6 | open | -20% | -11% | -20% | -25% | -23% | +3% | no | -51% / -21% / +9% |
| 2022-04-01 | 2023-03-31 | 920 | 92 | 20 | 0 | closed | +1% | -12% | +7% | — | -14% | +14% | yes | -41% / +3% / +36% |
| 2022-07-01 | 2023-06-30 | 928 | 93 | 23 | 0 | closed | +28% | +24% | +33% | — | +9% | +18% | yes | -25% / +25% / +74% |
| 2022-10-03 | 2023-10-03 | 913 | 92 | 23 | 0 | closed | +17% | +13% | +27% | — | +1% | +16% | yes | -25% / +13% / +59% |
| 2023-01-03 | 2024-01-03 | 911 | 92 | 25 | 0 | closed | +20% | +19% | +37% | — | +12% | +8% | yes | -18% / +17% / +66% |
| 2023-04-03 | 2024-04-02 | 973 | 98 | 20 | 0 | closed | +27% | +8% | +37% | — | +15% | +13% | yes | -32% / +20% / +95% |
| 2023-07-03 | 2024-07-02 | 975 | 98 | 19 | 10 | open | +17% | +9% | +18% | +21% | +7% | +10% | yes | -36% / +13% / +78% |
| 2023-10-02 | 2024-10-01 | 941 | 95 | 20 | 0 | closed | +28% | +24% | +30% | — | +25% | +3% | yes | -34% / +28% / +99% |
| 2024-01-02 | 2024-12-31 | 964 | 97 | 18 | 9 | open | +9% | +15% | +23% | +46% | +11% | -1% | no | -42% / +1% / +74% |
| 2024-04-01 | 2025-04-01 | 1075 | 108 | 18 | 9 | open | -2% | -8% | +10% | +12% | -4% | +2% | yes | -43% / -10% / +39% |
| 2024-07-01 | 2025-07-01 | 1061 | 107 | 21 | 11 | open | +7% | +3% | +19% | +22% | +8% | -1% | yes | -39% / -1% / +58% |
| 2024-10-01 | 2025-10-01 | 1021 | 103 | 21 | 11 | open | +5% | +18% | +14% | +24% | +11% | -6% | no | -36% / -4% / +61% |
| 2025-01-02 | 2026-01-02 | 1048 | 105 | 19 | 10 | open | +4% | +29% | +15% | +9% | +12% | -9% | no | -39% / -3% / +54% |
| 2025-04-01 | 2026-04-01 | 1126 | 113 | 16 | 0 | closed | +26% | +39% | +22% | — | +25% | +1% | no | -38% / +9% / +79% |
| 2025-07-01 | 2026-07-01 | 1137 | 114 | 13 | 7 | open | +36% | +50% | +29% | +21% | +37% | -1% | no | -29% / +16% / +129% |
| 2025-10-01 | 2026-10-01 | 1164 | 117 | 13 | 7 | open | +14% | +1% | +7% | +4% | +15% | -1% | yes | -39% / +7% / +60% |

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
| as written (cap band, passers first) | 85 | 57% | +7.3% | +5.7% | +10.7% | +8.0% | 81% |
| value-ranked composite (thresholds ignored) | 85 | 64% | +7.0% | +6.3% | +9.5% | +8.0% | 67% |
| every priced filer, no cap band or liquidity floor | 186 | 50% | +6.2% | +7.2% | +91.1% | +4.8% | 84% |
| both | 186 | 50% | +6.7% | +6.9% | +91.9% | +4.8% | 71% |

## Robustness: every threshold ±20%, one at a time

| threshold | as written | shifted to | top > bottom | top mean excess | top median excess | passers mean excess | passers per cohort |
|---|---|---|---|---|---|---|---|
| ROCE threshold | 12 | 9.6 | 61% **←** | +7.3% | +6.2% | +6.6% | 20 |
| ROCE threshold | 12 | 14.4 | 57% **←** | +7.2% | +6.4% | +7.4% | 12 |
| ROCE floor | 8 | 6.4 | 57% **←** | +7.3% | +5.6% | +7.8% | 17 |
| ROCE floor | 8 | 9.6 | 57% **←** | +7.5% | +6.3% | +8.5% | 16 |
| gross-margin drop | 3 | 2.4 | 61% **←** | +7.1% | +5.5% | +8.1% | 15 |
| gross-margin drop | 3 | 3.6 | 59% **←** | +6.9% | +5.6% | +7.9% | 18 |
| revenue CAGR | 10 | 8 | 61% **←** | +7.7% | +5.8% | +7.5% | 24 |
| revenue CAGR | 10 | 12 | 57% **←** | +7.3% | +5.8% | +9.1% | 13 |
| share-count growth | 10 | 8 | 57% **←** | +7.3% | +5.4% | +8.4% | 16 |
| share-count growth | 10 | 12 | 55% **←** | +7.4% | +5.9% | +8.5% | 18 |
| OCF / NI | 0.8 | 0.64 | 57% **←** | +7.3% | +5.7% | +7.4% | 17 |
| OCF / NI | 0.8 | 0.96 | 57% **←** | +7.3% | +5.7% | +8.3% | 15 |
| net debt / EBITDA | 2 | 1.6 | 57% **←** | +7.3% | +5.7% | +7.7% | 16 |
| net debt / EBITDA | 2 | 2.4 | 57% **←** | +7.3% | +5.7% | +7.9% | 18 |

## How to read this

Each cohort buys its portfolio equal-weight at the close of the first trading day of the quarter and holds twelve months with no rebalancing, so adjacent cohorts overlap by nine months and the 44 cohorts are nearer 11 independent observations than 44. The composite ranks every screenable company on the date: per trait, companies that pass its rule rank first by the trait's value, then those that fail it, and a trait that cannot be computed sits at the midpoint; the five ranks are summed. Top and bottom deciles are cut from that ranking inside the cap band, so a decile is ~85 names and one takeover cannot decide it. Point-in-time: a fiscal year is visible only from the filing date of the 10-K that first reported it; market cap uses the cover-page share count of that 10-K and the price on the cohort date. Returns use Yahoo's split- and dividend-adjusted closes. Costs are not deducted (a quarterly-rebalanced portfolio of ~85 names turns over roughly a quarter of its names a year; budget about 0.3% a year). The pass criteria were written in screen.json before this script existed. Fails twice → the screen is shelved and the reasons written up here, as with pairs.

Reproduce: `node scripts/compounder-backtest-us.mjs` (about 73 s). Every number per cohort, portfolio member list and the rolling curves are in the .json beside this file.
