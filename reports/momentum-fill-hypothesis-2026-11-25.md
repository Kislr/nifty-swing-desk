# The fill rule at the band — hypothesis, written before the run (25 Nov 2026, A22 step 2)

Written and committed on 25 Nov 2026, **before the series of any bar earlier than that day was on file** (`data/history/*.json` had no `series` entry when this was written) and before any run of the rule on real series. The rule was run only on synthetic bars (`npm test`). Nothing below is to be changed after the first real run; an amendment is a dated addendum under this text, as in the other hypothesis files.

## The question

On 23 Nov the trade-for-trade bars were loaded and the paper book's rules moved from 18.4% to 20.1% a year at the median of the 21 starts, ahead of the fund by two points from 12 starts instead of 5 — with 40% of the run-on-record's profit in 33 trades held through trade-for-trade days, and ten exits and two entries made on a day the share closed 4.9% or more from the day before (`reports/series-fill-2026-11-23.md`). A share in `BE` or `BZ` locked at its lower band has sellers and no buyers; the close the backtest sells at is not a price anyone had. **How much of the 1.7 points is that?**

## The rule, exactly

`bandFill: 'both'` in `momentum.js` (`M.simulate`). Everything else is the paper book's rules as they stand (`refill: 'close'`, `volScale: true`, reinvested, point-in-time members, 30 bps round trip).

- **At its band** (`M.bandAt`): the bar's series is `BE` or `BZ` and its close is **4.9% or more** from the close of the bar before, down for the lower band, up for the upper. Both closes on the adjusted bars. A bar whose series is not on record, or with no bar the day before, is not at a band.
- **A sale** — trailing stop, rank drop or ineligible — that falls due on a day the share closed at its lower band **is not made**. It stays due and is tried at every later close the share has; it is made at the first that is not at the lower band, at that close, **whatever the stop or the rank says by then**. "The next day" is the next day the share trades (RELINFRA, Dec 2025 – Feb 2026: one bar a week, each locked 5% down). While it waits the share is held, marked at its close, and its slot is not free. A holding with no bar for 20 sessions is closed at its last close, as before.
- **A purchase** of a share that closed at its upper band **is not made**. Its slot stays empty for that day — it is not handed to the next name on the list — and is filled, or not, by the usual rules at the next close (the refill at the close; the same name if it is still at the top and no longer locked).
- A sale at the upper band and a purchase at the lower band are made at the close: the other side of the book is there.

**Rows.** Primary: `bandFill=both`. For information: `bandFill=sell` (the owner asked for the sales-only row on 23 Nov; the 21 purchases on trade-for-trade days summed to −1% of the profit, the 27 sales to 37%). Baseline: `bandFill=off` re-run the same day on the same bars, so the three differ in nothing else.

**The measurement.** The 21-start sweep (`node scripts/backtest-momentum.mjs --benchmarks --phases`, then with `--set bandFill=both`, then `--set bandFill=sell`) on the full history with the series of every bar on record. Read: the median CAGR, the range, and the number of starts ahead of NIFTY500 MOMENTUM 50 TR by two points or more; beside them, per start, the sales not made on the day they fell due, the bars they waited, and the purchases not made. One single-start run (`--set bandFill=both`, the run on record's start) for the trade list: which of the 33 trades moved, and by how much.

## What is expected

- **The median falls from the baseline's, to between 18.4% and 20.1%, nearer the lower end** (the README's line of 23 Nov, kept). If the history has grown since, the bracket is read as "between the pre-series-fill level and the baseline", not as the two numbers.
- **Few events, large effect per event.** Ten exits and two entries were on a band day in the run on record. A sale deferred from a share falling 5% a day is made 5%, 10%, 15% lower — on positions that had become the book's largest. So the fall should come from a handful of trades (TTML first), not from many small ones.
- **The sales-only row is within 0.2 points of the two-sided one.**
- **The count ahead of the fund by two points falls from 12 of 21, and stays above 5.**
- Drawdown: no expectation written. A deferred sale deepens a fall; a purchase not made at an upper band misses a winner or a top. Reported, not predicted.

If the median **rises**, or falls **below 18.4%**, the expectation was wrong and that is said in the write-up's first line; it does not change what follows.

## What the result decides — fixed beforehand (owner, 25 Nov 2026)

**The backtest's fill model only, and whatever the result.**

1. After the sweep is read, `bandFill: 'both'` becomes the default of `M.simulate` — the standing fill model of the momentum backtest, a measurement convention like `compound`. From then on the engine's figures are the band-fill figures, quoted without the trade-for-trade caveat: the median, the range and the count ahead of the fund. The `off` rows stay reproducible (`--set bandFill=off`) and every earlier report keeps its name and its numbers.
2. **The twenty-one live paper books do not take it.** Their rules were fixed on 23 Nov, before this rule existed; `M.paperBook` forces `bandFill: 'off'`. The doubt is carried at their reading by the line added to the reading rule on 25 Nov (the share of the median book's profit from trades held through a trade-for-trade day, in the verdict's sentence if above a third).
3. **No verdict on record is reopened by this test.** The fund is the holding; whether the engine earns real money is the books' reading of 14 Jun 2027. This test changes what number is quoted for the ten years, not that decision.
4. The swing and event studies are not re-run: they moved by hundredths of an R on 23 Nov and have no position held through weeks.

## What would count against the reading — said now

- **A 2% band is not seen.** The bhavcopy names the series, not the band. A share NSE holds to 2% closes "at its band" at −2% and the rule sells it at that close. The rule therefore under-counts locked days; the true figure is at or below the one it gives.
- **A close at the band is not proof of no buyers.** A share that touched −5% and closed there on full volume may have had buyers all day. The rule treats every such close as unsellable; on those days it over-counts. The two errors pull in opposite directions and neither is measured. The write-up reports the volume on each deferred sale's due day against the share's 20-day average, as a description.
- **The retry sells at the first close off the band, however far down.** A real holder might have got out intraday on an earlier day, or not at all. One convention, stated; not tuned.
- **The series is the one the bar was taken from** (`bestSeries`: EQ before BE before BZ). A share listed in both on one day is read as EQ.
- **One path.** The sweep is 21 starts on one ten-year history. A difference between rows smaller than the spread across starts is not a finding (`reports/momentum-phases-2026-11-23-adjusted-members.md`).

## Not to be done after the run

No second value of the 4.9%. No variant that waits a fixed number of days, sells at the open, or exempts a reason for the sale. No rule that avoids trade-for-trade shares (option (b), dropped by the owner on 23 Nov). If the result suggests one of these, it is a new hypothesis file, written first.

## Order of work

1. `scripts/backfill.mjs --members` writes the series of every member's bar on every saved day (built 25 Nov; the owner's home run, about an hour — BACKFILL.md, "Series — the second home run").
2. The next session checks the coverage line (`series on record: N of N days`), runs the three sweeps and the single-start run, and writes `reports/momentum-fill-<date>.md` against this file.
3. Then, and only then, the default is changed and the README, the site's report card and the digest's citations quote the new figures.
