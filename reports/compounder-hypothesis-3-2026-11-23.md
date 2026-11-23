# The compounder's third hypothesis — "loses less, and not merely by holding less risk"

**Written 23 Nov 2026 (sixteenth session), before the Sharadar subscription exists and before any price of a delisted company has been seen. Committed the same day on the owner's instruction, as drafted — the owner changed nothing.** The numbers marked *(owner)* were the session's proposals and stand unless the owner changes them, which is free until the day the Sharadar prices are loaded and not after. **Three things are still open and are listed at the end; the file is final only when they are closed, and no Sharadar price is loaded before that.** The definition under test is `compounder/screen-v0.3.json`, unchanged since 5 Nov.

Research aid, not investment advice.

## Where this starts from

Two attempts, both run on 5 Nov 2026, both failed the bar written on 25 Oct — top decile beats bottom decile in at least 70% of twelve-month cohorts — and the screen was shelved (`reports/compounder-shelved-2026-11-05.md`). The write-up named three conditions for reopening it:

1. a survivor-complete universe;
2. a test that fits the claim actually being made;
3. a new pre-registered hypothesis — not a third set of thresholds on the same traits.

This file is 2 and 3. Condition 1 is the Sharadar pull, which this file has to precede.

What the failed runs showed and did not test: under v0.3 the top decile's rolling portfolio made 10.7% a year with a 23% maximum drawdown, against 12.4% and 34% for the bottom decile and a 34% drawdown for the Russell 2000; its twelve-month returns varied half as much across cohorts as the bottom decile's; it won the down and flat years and lost every cohort of 2020. All of it on a store that holds only companies still listed in 2026.

## The claim

**A portfolio of the screen's top decile falls less than the market it is drawn from, and does not pay for that with a matching loss of return.**

Both halves are needed. "Falls less" alone is true of anything with less market exposure, and that can be had for nothing by holding some cash beside an index fund. The claim worth testing is that the screen's names fall less *and* the return per unit of risk is better than the market's — the same bar the desk set for momentum on 12 Nov: an index fund is the alternative, and a screen has to pay for itself.

## What is tested

**The definition is v0.3, frozen** (`compounder/screen-v0.3.json`, written 5 Nov): three-year average ROCE is the rank; growth without dilution, cash conversion and leverage are gates; gross margin is dropped. No threshold is changed. What is new is the claim and the test, not the traits — which is how this is not "a third set of thresholds".

**The universe is survivor-complete:** every company that had filed a 10-K by the cohort date, priced on the date, inside the cap band and above the liquidity floor — including those since taken over, bankrupt or delisted, with prices from Sharadar and facts from EDGAR.

**Cohorts and holding** are unchanged: the first trading day of each quarter, January 2015 to October 2025, equal weight, held twelve months, no rebalancing inside the year; the rolling portfolio holds the last four cohorts, a quarter of capital each, marked monthly.

**Costs:** 25 basis points a side *(owner)* on every purchase and sale, charged to the screen's portfolio and to the benchmark alike. The earlier runs charged none.

## The benchmark

**The deciding comparison is the equal-weight portfolio of every eligible company in the band** — the whole ranked universe, same dates, same weights, same holding rule, same costs, same delisting convention. It differs from the screen's portfolio in one thing only: which names are held.

Not the bottom decile: junk is not the alternative anyone holds, and its return is dominated by lottery outcomes and by exactly the survivorship this rebuild removes. Not the Russell 2000 as the decider: it is capitalisation-weighted, so a comparison with an equal-weight portfolio mixes a size effect into the answer. The Russell 2000 is reported beside every row as the thing one could actually buy.

## The test — three conditions, all required

Measured on the rolling portfolio's monthly marks over the whole window.

| | condition | bar | why this number |
|---|---|---|---|
| 1 | **Drawdown** | the top decile's largest peak-to-trough fall is no more than **80%** of the benchmark's *(owner)* | on the survivor store it was 23% against 34%, about 68%; 80% leaves room for what the departed names do to it |
| 2 | **Down episodes** | over each fall of the benchmark of **15% or more** *(owner)*, measured peak to trough on the benchmark's own curve, the top decile falls less — in at least **three of every four** episodes, rounded up *(owner)* | counts separate market falls, not overlapping twelve-month windows; the episodes are whatever the benchmark's curve shows, not a list chosen now. Expected: 2015–16, late 2018, early 2020, 2022, perhaps 2025 |
| 3 | **Not just less risk** | the top decile's Sharpe ratio is above the benchmark's, **and** its annual return is no more than **1.0 point** below the benchmark's *(owner)* | this is what separates "loses less" from "holds less" |

The Sharpe ratio is the mean of the monthly returns divided by their standard deviation, annualised, with no risk-free rate subtracted — as `momentum.js` measures it.

**Robustness, as before:** no single ±20% shift of any v0.3 threshold may turn a pass on all three into a fail.

A result that misses a bar but moves the right way is recorded as a measurement. It is not a pass.

## Rows, fixed in advance

1. **The verdict row:** v0.3 top decile against the equal-weight band, main delisting convention.
2. **The pessimistic row:** the same, with every for-cause delisting a total loss. **The verdict must hold on both.**
3. The ±20% threshold shifts on row 1.

For information only — never for the verdict:

4. **A control:** the top decile ranked on one published measure, gross profit ÷ total assets, same universe and test. If one ratio does as well as the five-trait screen, the screen's complexity is not earning anything.
5. **Survivors only:** rows 1 and 4 re-run on today's store, to show what the departed companies changed.
6. The quality list and the bottom decile, as in the earlier reports.

## The delisting convention

Applied identically to the screen's names and the benchmark's. A holding that stops trading before its twelve months are up is closed as follows, and the proceeds earn the benchmark's return for the rest of the period *(owner: the alternative is cash at zero)*.

| what happened | what the holder is assumed to get |
|---|---|
| **Acquired or merged** | the last traded price, which already reflects the offer |
| **Bankrupt, liquidated, or delisted by the exchange for cause** | the last traded price less a haircut: **30%** for a company last listed on NYSE or NYSE American, **55%** for one last listed on Nasdaq *(owner)* |
| **Voluntary or regulatory delisting** (went dark, moved over the counter) | as for cause: the same haircut, since what follows is thin over-the-counter trading |
| **Reason not given in the data** | as for cause — the conservative reading |

The haircuts are the academic correction for delisting returns that are missing from price data. The Nasdaq figure is from Shumway and Warther (1999), whose abstract gives −55% for missing performance-related delisting returns; **the 30% NYSE figure is from Shumway (1997) as I recall it and as it is usually cited — the paper's abstract does not state it, so it is to be checked against the paper before this is committed.** Both were estimated on delistings before the late 1990s; nothing says they hold for 2015–2025, which is what the pessimistic row is for.

**The pessimistic row:** every delisting that is not an acquisition is a total loss.

**To be confirmed when the Sharadar schema is printed:** whether its corporate-actions table gives a reason for each delisting, and in what categories. If it does not distinguish an acquisition from a failure, the convention cannot be applied as written and this section is rewritten — before any price is loaded, not after.

## The cap floor

`SCREEN.md`'s rule of 29 Oct stands: if the survivor gap is large, the floor rises to the lowest size bucket where it falls under about 5%, and past about $2 billion the benchmark changes. The full survivor count (`reports/compounder-survivors-us-<date>.md`; the 200-filer trial of 23 Nov is not it) is read against that rule and the floor is fixed **before** the run. With a survivor-complete universe the gap should close by construction; the count says how much of each cohort the rebuild has to add, and so how much the earlier results could have been off.

## What is expected

Written so that a surprise can be recognised as one.

- **The benchmark will look worse than anything on the survivor store did.** The departed companies are in it now, and the failures among them fall on the whole universe more than on a decile selected for profitability and low debt. The bottom decile should lose the most.
- **Condition 1 is likely to pass.** A drawdown ratio somewhere between 0.65 and 0.85.
- **Condition 2 is likely to pass, with early 2020 the one to watch.** The top decile lost every twelve-month cohort of 2020 to the bottom decile — but that was the rebound. Whether it fell less in the fall itself was never measured.
- **Condition 3 is where it most likely fails.** On the survivor store the top decile made 10.7% a year against 12.4% for the bottom decile; the equal-weight band should sit somewhere between, though it was never computed. If the top decile's smaller falls are bought with a return more than a point below the band's, the claim reduces to "holds less risk" and fails.

The honest prior is close to even, with condition 3 deciding it.

## What would count against a reading even if all three pass

- **One episode.** If the drawdown advantage comes from a single fall — 2022, say — and the others are level, that is said beside the verdict.
- **One sector.** If the top decile's advantage is a standing overweight of one or two industries, it is a sector bet. The report gives the top decile's sector mix against the band's.
- **The convention.** A pass on row 1 that fails on row 2 is a fail.
- **A pass that needs the control to be ignored.** If gross profit ÷ assets passes as comfortably, the finding is "profitability", not this screen.

## What this test can and cannot say

- **It is a second look.** The "loses less" shape was seen on these same years. The companies added by the rebuild are new evidence; the calendar is not. A pass is support, not proof.
- **Four or five market falls is a small sample.** That is why the three conditions are required together and none is allowed to carry the verdict.
- **The real test comes after.** As with the momentum paper books, a forward record is the only evidence the hypothesis did not have a hand in.

## Decision rule

**Pass** (all three conditions on rows 1 and 2, robust to the ±20% shifts, none of the readings above against it): the weekly screen moves to v0.3 and publishes its top decile as a **paper list for twelve months** — a record beside the equal-weight band and the Russell 2000, read by a rule written before it starts. No money on it before that reading. The US dashboard (SCREEN step 7) is built then, not before.

**Fail:** the screen is closed for good. No fourth hypothesis on this store. The EDGAR and price stores keep running only while they cost nothing; the India compounder is not started on the strength of this one.

Either way the result is written into `SCREEN.md` and the README the day it is read.

## The same test for the risk-adjusted momentum rule

The decision of 18 Nov gave `volAdjust` one more reading, "on the US store once it is survivor-complete, with a test written for that claim". It is this test: the three conditions above, with the momentum engine's rules and `volAdjust` on as the portfolio and the same rules with it off as the benchmark. The universe, the rebalance calendar and the costs for that run are written down in their own short file before it is made; nothing in this one is changed by it.

## Still open — to be closed in this file, by dated addendum, before any Sharadar price is loaded

1. **The 30% NYSE haircut**, checked against the 1997 paper. If the paper says otherwise the figure is corrected here; the pessimistic row does not depend on it.
2. ~~**The cap floor**, from the full survivor count.~~ **Closed 23 Nov 2026 — addendum 1 below: the floor stays at $300M.**
3. **The delisting categories**, from the Sharadar schema — the one item that waits for the key, and the reason printing the schema is the first job with it. If the data cannot tell an acquisition from a failure, the convention is rewritten here first.

Settled by the commit: the numbers marked *(owner)* as proposed, and the proceeds of a departed holding earning the benchmark's return. The owner can change either before the pull.

---

## Addendum 1, 23 Nov 2026 — the full survivor count, and the cap floor

The owner's full run finished the same day (`reports/compounder-survivors-us-2026-11-23.md`, all 10,355 departed filers classified). No price of a departed company has been seen; this is a count of filers and their reported floats.

**The hole is not 2%. In the screen's band it is a third of every cohort, and half of the early ones.**

| reported float on the date | in the store | departed | share departed |
|---|---|---|---|
| $300M–1B | 15,710 | 11,073 | 41.3% |
| $1–2B | 9,954 | 5,508 | 35.6% |
| $2–10B | 20,017 | 7,605 | 27.5% |
| **the band, $300M–$10B** | **45,681** | **24,186** | **34.6%** |
| above $10B | 15,965 | 2,796 | 14.9% |

Company-cohorts; 96% of the departed in the band left a Form 25 behind, so they were on an exchange. By cohort year the share runs from **50.9% in 2015** to 14.8% in 2025. In companies: **1,675 departed filers were in the band on at least one cohort date** (1,557 with a Form 25), leaving at 100 to 175 a year.

**What it means for the two runs of 5 Nov.** They ranked about two candidates in three, and one in two for 2015. Their fails stand as recorded; they were fails on a different universe from the one the screen was written for, by far more than the write-up could say.

**The cap floor.** `SCREEN.md`'s rule of 29 Oct raises the floor to the lowest size bucket where the gap falls under about 5%. **No bucket is under 5%** — the smallest gap, above $10 billion, is 14.9%. The rule was written for a store that would stay incomplete; it has no answer here, and raising the floor would not buy what it was meant to buy. **So the floor stays at $300M and the band at $300M–$10B, on the survivor-complete universe**, where the gap closes by construction because the departed companies are priced and ranked. The benchmark does not change.

**What it means for this test.** Everything said under "What is expected" holds with more force: a third of the benchmark is companies the earlier runs never saw, and the for-cause delistings among them are where the two delisting rows will differ. Condition 3 is still the one most likely to decide it.

**The size of the pull.** `compounder/data/us/survivors.json` lists the departed filers; the 1,675 that were ever in the band are the ones whose prices and EDGAR facts the rebuild needs first.

**Limits of the count, repeated:** float is the company's own figure for non-affiliates' holdings, not market cap; a company that reorganised under a new registrant number is counted as departed although its business is in the store under the new one; over-the-counter companies report a float too, though the Form 25 share says they are few in the band.

Still open: items 1 and 3 above.
