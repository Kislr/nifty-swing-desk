# The compounder screen is shelved — 2026-11-05

The rule in `compounder/SCREEN.md`, written on 25 Oct before any data was pulled: the backtest's pass criteria are fixed in `screen.json`; a failed run gets one more attempt with a changed definition; a second fail shelves the screen and the reasons are written up here, the way the pairs engine was. Both attempts ran on 5 Nov 2026 and both failed. This is the write-up. **Research aid, not investment advice.**

## What was tested

Forty-four quarterly cohorts, January 2015 to October 2025, on the first trading day of each quarter. On each date the screen ran point-in-time (only 10-Ks filed by then), market cap was the price on the date times the cover-page share count of the latest visible 10-K, and every priced company inside the $300M–$10B band and above the $3M/day liquidity floor was ranked on the composite (about 845 names a cohort, so deciles of about 85). The top decile, the bottom decile, the quality list and the quality-and-momentum intersection were bought equal-weight at the close and held twelve months against the Russell 2000. The pass bar: top decile beats bottom decile in at least 70% of cohorts, top decile mean and median excess both positive, no single ±20% threshold shift flips the first condition.

| | v0.2 (as written since 25 Oct) | v0.3 (hypothesis written 5 Nov, before the run) |
|---|---|---|
| definition | five traits, all must pass; composite = rank-sum, passers first per trait | ROCE level (3-year average) is the rank; growth-without-dilution, cash conversion and leverage are gates; gross margin dropped |
| top decile beats bottom decile | **57%** of 44 cohorts | **50%** of 44 cohorts |
| top decile mean / median excess vs RUT | +7.3% / +5.7% | +4.9% / +7.2% |
| bottom decile mean excess vs RUT | +10.7% | +8.8% |
| quality list mean excess (names per cohort) | +8.0% (17) | +6.0% (35) |
| best single ±20% threshold shift | 61% | 57% |
| rolling four-cohort portfolio, top decile: CAGR / max drawdown | 12.0% / 27% | 10.7% / 23% |
| Russell 2000 over the same window | 138% total, 34% max drawdown | same |

Reports with every cohort, member list and the robustness tables: `compounder-backtest-us-2026-11-05.md` (v0.2) and `compounder-backtest-us-v0.3-2026-11-05.md` (v0.3), each with a `.json` beside it.

## Why it failed

**The composite does not separate winners from losers over twelve months.** Under either definition the top decile beats the bottom decile about as often as a coin, and no threshold shift changes that. The two definitions are different enough — a stability screen and a profitability-level screen — that this is not one unlucky construction.

**What the top decile does do is lose less.** Its twelve-month returns vary half as much across cohorts as the bottom decile's (standard deviation 21% against 38% under v0.3), its worst tenth of names falls 27% against the bottom decile's 46%, and the rolling portfolio's drawdown is 23% against the index's 34%. By year, the top decile wins in the down and flat years — three of four cohorts in each of 2018, 2021 and 2022 — and loses every cohort of 2020, when the bottom decile returned 113%. That is the shape of a defensive factor, and it is exactly the shape a "beats the bottom decile in 70% of twelve-month windows" test is built to fail across an eleven-year span that contains a melt-up.

**"Beats the index" was never evidence on this store.** Every portfolio, the bottom decile included, beat the Russell 2000, because `compounder/data/us/universe.json` is today's filers: every cohort is companies still listed in 2026, while the index of the day carried the ones that later failed. The bias is larger for the junk side (junk that is still listed is junk that recovered), which also means the top-versus-bottom test was tilted *against* passing. So a fail here is weaker evidence than a fail on a complete universe would be — but the rule is the rule, and the alternative, re-running until something passes, is the thing the rule exists to prevent.

**The quality-and-momentum intersection is not a rescue.** Under v0.3 it shows +7.7% mean excess and beats the index in 81% of the 26 cohorts where the gate was open, but it is 15 names on a survivor store with the gate selecting the rising years; it inherits every bias above and adds a gate that was chosen on the same data.

## What would reopen it

1. **A survivor-complete universe.** Rebuild each cohort from the EDGAR full-index of 10-K filers on the date (`form.idx`, reachable from the GitHub job, not from a cloud session), pull facts for the delisted CIKs, and find a price source that carries delisted names — Yahoo does not. Until then no fundamentals screen can be tested honestly on this store, and the measured 2% gap inside the store understates the real one by an unknown amount.
2. **A test that fits the claim.** If the claim is "quality loses less", the test is drawdown and down-year excess, not a twelve-month win rate against junk, and it needs to be written down before the run like the last two.
3. **A new pre-registered hypothesis.** Not a third set of thresholds on the same traits; the ±20% tables for both versions show that road is closed.

## What stays

The EDGAR store, the price store and the weekly screen report keep running: they are cheap, and item 1 above needs them. The dashboard page (SCREEN step 7), the early-detector reports and the India screen stay unbuilt; they were conditional on a pass. The screen's output is a research list, not a signal, and the README says so.
