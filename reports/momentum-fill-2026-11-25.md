# The fill rule at the band — the reading (25 Nov 2026, A22 step 2)

**The expectation was right, on all four counts.** Read against `reports/momentum-fill-hypothesis-2026-11-25.md`, committed before the series of any earlier bar was on file. The median of the 21 starts falls from 20.1% to **18.8% a year** — inside the bracket written beforehand (18.4% to the baseline) and nearer its lower end; it comes from a handful of trades, TTML first; the sales-only row is the same to a tenth of a point; and the engine is ahead of the momentum fund by two points from **7 starts of 21, not 12**. By the decision fixed beforehand, the rule is from today the momentum backtest's fill model. No verdict on record changes and the twenty-one paper books are not touched.

## The data

The owner's second series home run, 25 Nov (`node scripts/backfill.mjs --from 2016-11-07 --members`): **2,491 days written, the series on record for 2,491 of 2,491**; 53,931 bars in a series other than `EQ` (BE 36,477, BZ 13,995, RR 3,459); 0 failures. One saved day (23 Nov) was topped up with the past members' bars. **496 bars had no row in their day's bhavcopy** and are read as EQ: all of them are `ICICIPRULI`, 18 Oct 2024 – 22 Oct 2026 — the ticker NSE renamed to `ICICILIFE` on 23 Oct 2026, stored under the old name by the first two-year load. `ICICILIFE` has a bar with the same close on every one of those days and `ICICIPRULI` is not on the membership list, so it is never ranked. A leftover for the final audit; it touches no figure.

History 7 Nov 2016 → 23 Nov 2026. The three sweeps and the three single-start runs were made on the same bars within the hour, before the default was changed.

## The sweep — the paper book's rules, 21 starts

`node scripts/backtest-momentum.mjs --benchmarks --phases`, then with `--set bandFill=both`, then `--set bandFill=sell`.

| | close fills (baseline) | **fill rule, both sides** | sales only |
|---|---|---|---|
| CAGR, median | 20.1% | **18.8%** | 18.8% |
| CAGR, range | 14.2% to 23.1% | **12.7% to 21.3%** | 12.6% to 21.3% |
| CAGR, mean | 19.4% | 18.0% | 17.9% |
| Sharpe, median | 1.15 | 1.07 | 1.06 |
| Max drawdown, median | 27.2% | 28.9% | 29.7% |
| Ahead of NIFTY500 MOMENTUM 50 TR | 16 of 21 | **14 of 21** | 13 of 21 |
| … by two points or more | 12 | **7** | 7 |
| Ahead of NIFTY200 MOMENTUM 30 TR (by two points) | 19 (16) | 18 (14) | 17 (14) |
| Ahead of NIFTY 50 TR (by two points) | 21 (20) | 21 (19) | 21 (19) |

Start by start, the rule lowers the result in **20 of 21**: by 0.7 to 3.0 points, 1.4 at the median; the one start that rises does so by 0.2. Per run the rule holds back **10 to 12 sales** (median 11) for 34 to 39 closes in all, and 5 to 10 purchases. The fund makes 17.3% to 17.9% over the same windows.

| Expected, written beforehand | Read |
|---|---|
| The median falls, to between 18.4% and the baseline (20.1%), nearer the lower end | 18.8% — yes |
| Few events, large effect; TTML first | 11 sales held back in the run on record; TTML is 82% of the net fall — yes |
| Sales-only within 0.2 points of both sides | 18.84% against 18.76% — yes |
| The count ahead by two points falls from 12 and stays above 5 | 7 — yes |
| Drawdown: no expectation | the median is 1.7 points deeper |

## The run on record (start 12 Jun 2017), trade by trade

Reinvested: **17.0% → 15.8% a year**, max drawdown 28.4% → 31.0%, Sharpe 0.99 → 0.93 (sales only: 15.3%). Fixed slots: 12.3% → 11.7%. The trade lists below are the fixed-slot ones, as in every report.

- **594 of the 630 trades are the same in both lists.** Profit ₹9,75,514 → ₹9,11,249, a fall of ₹64,265 (6.6%).
- The baseline made **ten sales at a lower band and two purchases at an upper band** — the count of 23 Nov. With the rule: none.
- Trades held through at least one day in `BE` / `BZ`: 33 in both lists; their part of the profit falls from 31.7% to 25.0%. (The 23 Nov table gave 40% for trades held through an *added* bar; that is a different count and the two were not reconciled.)

**The eleven sales held back:**

| Share | Stop fell due | Close that day | Sold | Bars late | Price sold | Profit against the baseline | Volume on the due day |
|---|---|---|---|---|---|---|---|
| DHANI | 25 Sep 2018 | 628.50 (−5.0%) | 11 Oct 2018 | 11 | 393.31 | −₹7,965 | 0.06× its 20-day average |
| HATHWAY | 29 Jul 2020 | 42.05 (−5.0%) | 31 Jul 2020 | 2 | 37.94 | −₹3,077 | 0.25× |
| ATGL | 18 Jun 2021 | 1,258.45 (−5.0%) | 21 Jun 2021 | 1 | 1,319.37 | +₹5,527 | 0.11× |
| ADANIENSOL | 18 Jun 2021 | 1,240.15 (−5.0%) | 21 Jun 2021 | 1 | 1,300.20 | +₹1,300 | 0.07× |
| ATGL (bought again 23 Jun) | 30 Jun 2021 | 1,019.85 (−5.0%) | 6 Jul 2021 | 4 | 916.82 | −₹10,080 (a trade the baseline did not make) | 0.12× |
| **TTML** | 18 Jan 2022 | 224.65 (−5.0%) | 2 Feb 2022 | 10 | 148.58 | **−₹52,409** | 0.21× |
| TRIDENT | 14 Feb 2022 | 54.00 (−4.9%) | 15 Feb 2022 | 1 | 56.61 | +₹828 | 0.76× |
| FLUOROCHEM | 9 May 2022 | 2,437.75 (−5.0%) | 12 May 2022 | 3 | 2,259.81 | −₹871 | 0.67× |
| SUZLON | 6 Mar 2024 | 38.70 (−4.9%) | 7 Mar 2024 | 1 | 40.54 | +₹3,187 | 0.62× |
| TATAINVEST | 20 Mar 2024 | 647.30 (−5.0%) | 21 Mar 2024 | 1 | 626.59 | −₹375 | 0.14× |
| RPOWER | 28 Jul 2025 | 53.94 (−5.0%) | 29 Jul 2025 | 1 | 56.09 | +₹1,054 | 3.22× |

Together −₹62,881 of the −₹64,265; the rest is the knock-on in other names (a slot freed later, a different purchase).

What the table says:

- **One trade is the result.** TTML: bought 22 Oct 2021, the stop fell due on 18 Jan 2022 at 224.65 with the share locked; it stayed locked for ten sessions and was sold at 148.58. The baseline books +366% on it; the rule, +209%.
- **Waiting is not always worse.** Five of the eleven were sold higher at the next close: a share locked at its lower band one day often opens off it the next. The rule does not assume the worst; it assumes the close at the band was not to be had.
- **The volume column is the caveat written beforehand, in numbers.** On seven of the eleven due days the share traded a quarter of its usual volume or less — locked, as the rule assumes. On three it traded between 0.6 and 0.8 of it, and on one (RPOWER) three times its usual volume: a holder could very probably have sold that day, and there the rule over-counts. It happened to cost nothing.
- **The two purchases at an upper band** (JSWENERGY 11 Feb 2022, GVT&D 12 Nov 2024) were both made at the next close instead.

## Outside the hypothesis, for information: the 12 Nov rules

The site also quotes the rules the 12 Nov verdict was read on (`refill=rebalance`, `volScale=false`). They were run after the reading above, on the same bars, because their figures change with the default too:

| | close fills | fill rule |
|---|---|---|
| CAGR across the 21 starts | 8.6% to 22.2%, median 15.2% | **8.0% to 21.7%, median 14.3%** |
| Ahead of NIFTY500 MOMENTUM 50 TR | 6 of 21 | **1 of 21** |
| The run on record | 12.2% (12.3% on the history to 20 Nov) | **11.1%** |

The verdict of 12 Nov — the engine does not beat the investable version of its own idea — reads the same, more firmly.

## What follows — as fixed beforehand

1. **`bandFill: 'both'` is the default of `M.simulate` from this commit.** The engine's ten-year figures are, from now on: **12.7% to 21.3% a year across the 21 starts, median 18.8%, ahead of the fund from 14 and by two points from 7; 15.8% on the run on record.** They are quoted without the trade-for-trade caveat.
2. Close fills stay reproducible: `--set bandFill=off` (report suffix `-closefill`). Checked after the change: the default run is, field for field, the `-bandfill` run made before it, and `--set bandFill=off` is the plain run made before it.
3. **File names.** The six momentum reports dated 25 Nov were made before the default changed: there the plain name is close fills and `-bandfill` is the rule. From the next report on, the plain name is the rule and `-closefill` the old fills. The two `-norefill-novolscale` sweeps of the same date were made after it and follow the new naming.
4. **The twenty-one paper books are unchanged** (`M.paperBook` forces `bandFill: 'off'`); their reading carries the line added to the reading rule on 25 Nov.
5. The swing and event studies were not re-run.

## What this does not say

- **A 2% band is still not seen**, so the true figure is at or below the one given — except where the rule over-counts a close at the band on full volume (RPOWER above). Neither error is measured.
- **"Nothing is promoted" is unchanged, and so is why.** Seven starts of 21 clear the two-point bar; the median start is about a point ahead of a fund whose own figure is before costs and tracking error, on one ten-year path in which a single trade moves the run on record by about a point. The fund is the holding. Whether the engine earns real money is the books' reading of 14 Jun 2027.
- Nothing here was tuned: one value of the band (4.9%), one retry convention, both written first.
