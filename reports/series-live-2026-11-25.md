# A22, step 1 — the series on the live side (25 Nov 2026, seventeenth session)

The owner's choice of 23 Nov was to test the fill rule at the band. The live side comes first because it cannot be done afterwards: a day the daily job does not record is a day whose series has to be fetched again from the bhavcopy. This note says what was found and what was built. **No rule of the books or the engine was changed**; the fill rule itself is step 2 and is still a hypothesis to be written before its run.

## (i) Does NSE's market-watch row carry the series? Yes.

Read from a live payload on 25 Nov 2026 at 10:33 IST, from an Indian connection (`getIndicesData`, symbol `NIFTY 500`; NSE answered on `www.nseindia.in`, as in A17). Every row has these keys:

`priority, identifier, symbol, series, marketType, lastPrice, change, pChange, open, dayHigh, dayLow, previousClose, totalTradedVolume, totalTradedValue, yearHigh, yearLow, ffmc, lastUpdateTime, stockIndClosePrice, perChange365d, perChange30d, date365dAgo, date30dAgo, nearWKH, nearWKL, chart30Path, chart365Path, companyName`

- `series` is `EQ`, `BE`, `RR` … on a stock row and `null` on the index row; `identifier` repeats it (`STLTECHBEN`, `EMBASSYRRN`).
- That morning: **495 rows in EQ, 2 in BE (STLTECH and HFCL), 3 in RR** (EMBASSY among them), 500 stocks and the index row. HFCL stood at 169.67 against a previous close of 178.60 — minus 5.00%, at its lower band.
- **The row carries the series, not the band.** A share NSE holds to a 2% band cannot be told from the payload; the desk reads "at its band" as trade-for-trade and 4.9% or more from the previous close, the figure the 23 Nov count used.
- The NIFTY 500 row's previous close was 23,748.15, the close on file for 23 Nov: there was no session on 24 Nov.

## (ii) Where it is kept

| Place | What is added | What is unchanged |
|---|---|---|
| `E.rowsFromNseApi` | each row gets `series` (null when the payload has none) | every other field |
| snapshot `data/snapshots/<date>.json` | `series: { SYM: "BE", … }` — only the names that are **not** in EQ; the key is absent when the source named no series (a CSV, a pasted table) | `rows` (the twelve-number arrays), `index`, `count` |
| history `data/history/<year>.json` | `series: { "<date>": { SYM: "BE", … } }` | `dates`, `symbols`, `index` |
| bars (`E.buildBars`) | `bars.series`, read by `E.seriesAt(bars, sym, i)` | `dates`, `sym`, `index`, `extras` |

The reading: **a date listed under `series` says every bar of that day not named there is EQ; a date not listed says nothing** — which is every day before this merge until step 2 fills them in. `E.seriesAt` gives `null` on such a day and for a symbol without a bar.

A snapshot speaks for its own rows only (a later run of the same day corrects them; a past member's bar loaded by the backfill keeps its entry; an index repair touches nothing). `scripts/backfill.mjs` now passes on the series of the rows it adds when the day is new to the file or already on record, and holds them back on an old day whose other bars are of unknown series — otherwise one trade-for-trade bar added to an unrecorded day would declare the other five hundred EQ.

## (iii) What the books say

`M.bandAt` reads one symbol on one bar; `M.t2tReport` reads one book's trades against it; `M.booksT2T` merges the books.

- **Digest**, PAPER BOOK block: one line, **only on a day there is something to say** — a holding in BE or BZ, or a purchase or sale made today on a day the share closed at its band:
  `• TRADE-FOR-TRADE — reported, no rule reads it (A22): held: HFCL BE at its lower band today (-5.0%), 3 of 8 books · today: sold …`
- **Site**: the holding carries a `BE` / `BZ` mark in book 1's table and in the twenty-one books' table; the books' note lists the holdings in trade-for-trade, every purchase and sale made at a band since the books began (a sale at the lower band and a purchase at the upper one are the doubtful ones), and for how many of book 1's days the series is on record.
- **`data/latest.json`**: `paper.t2t`, `paper.positions[].series`, `paperBooks.t2t`, and `t2t` / `bandFills` / `t2tShare` on each book's row.
- **The share of the median book's profit from trades held through a trade-for-trade day** is computed (`paperBooks.t2t.share`, null while that book is not in profit). The line in the reading rule that uses it is step 1 (iv) — added the same day with the owner's yes, see below.

## What was checked

- `npm test`: 302 checks (288 before), on Node 22.
- **The 23 Nov job replayed offline against a stand-in for NSE**, twice — on `main` and on this branch — with the payload rebuilt from the snapshot on file and the series NSE served on 25 Nov:
  - on `main` the replay writes the snapshot, the history file and `latest.json` **identical to the ones committed on 23 Nov**, digest included (4,068 characters), so the stand-in is a fair copy of that evening;
  - on this branch the **digest is identical, character for character**; `data/index.json`, `data/benchmarks/live.json`, `data/adjustments.json` and `data/history/2025.json` are identical; the snapshot differs by the one `series` key, `data/history/2026.json` by the one `series` entry, and `latest.json` by added fields only (38, all under `paper` and `paperBooks`). Nothing was removed or changed.
- **A made-up next day** (three holdings put into BE / BZ at their bands, in a scratch copy, never committed): the digest gains the one line, book 8 — which started that day — is shown to have bought at the upper band, and the site shows the marks on a desktop and a phone screen without a script error.
- A payload without the `series` key (the shape before): the job runs as it did, records no series for the day and says so in its log.
- **Not checked from here:** the first live run. The job's log will say `series: N in EQ, …` and `paper books, trade-for-trade (A22): …` — the first evening after the merge is the reading.

## (v) The live momentum list is ranked on the membership list

`scripts/fetch.mjs` and the site pass the point-in-time NIFTY 500 filter to `M.selectAt`, as the paper books have since 19 Nov. On 23 Nov it changes nothing: the 500 rows of the payload are all members (the list has 501; `DUMMYHEG` has no row). It matters on an evening after a members top-up has given past members a bar for the day — the case `reports/series-fill-2026-11-23.md` found (BLISSGVS, RAYMOND, IOLCP, MARKSANS on 20 Nov).

## (vi) RELINFRA's six gaps are not gaps

The history has no RELINFRA bar on 22 member-days in six runs between 22 Dec 2025 and 30 Jan 2026. NSE's own security-wise history for the symbol, all series, 15 Dec 2025 → 10 Feb 2026 (read from an Indian connection on 25 Nov) has **exactly the rows the history has**: after 19 Dec 2025 the share traded on 29 Dec, 5, 12, 19 and 27 Jan, 1 and 2 Feb, and daily again from 3 Feb — all in `BE`.

| Date | Prev close | Open = high = low = close | Change | Shares | Trades |
|---|---|---|---|---|---|
| 29 Dec 2025 | 173.20 | 164.54 | −5.0% | 51,971 | 589 |
| 5 Jan 2026 | 164.54 | 156.32 | −5.0% | 65,113 | 351 |
| 12 Jan 2026 | 156.32 | 148.51 | −5.0% | 36,078 | 620 |
| 19 Jan 2026 | 148.51 | 141.09 | −5.0% | 34,582 | 524 |
| 27 Jan 2026 | 141.09 | 134.04 | −5.0% | 151,139 | 1,055 |
| 1 Feb 2026 | 134.04 | 127.34 | −5.0% | 183,110 | 2,034 |
| 2 Feb 2026 | 127.34 | 120.98 | −5.0% | 154,571 | 2,262 |

One session a week, the first of the week, at one price exactly 5% under the last — against a quarter of a million to nearly four million shares a day in the weeks before. The share was allowed to trade once a week and was locked at its lower band each time. **Nothing is missing from the history**; `scripts/history-holes.mjs` counts days NSE has no row for. Why NSE restricted it is not in the data and is not asserted here.

What follows from it:

- **It is A22's own case at full size**: a fall from 173.20 to 120.98, 30%, in which a holder could not have sold more than a few tens of thousands of shares a week. The engine's 20% trailing stop would have "sold" at one of those closes.
- **The run on record never held it** (no RELINFRA trade among the 630 in `reports/momentum-2026-11-23-adjusted-members.json`), so no figure on record rests on these bars.
- **For the step-2 hypothesis**: "tried again the next day" has to mean the next day the share trades — here that is a week later, at a price another 5% down.
- The other three names (JKIL 3 days from 8 Aug 2017, RBA 3 from 14 Feb 2022, MAHSCOOTER 2 in October 2025) were not looked at.

## (iv), and what is left for step 2

1. **Step 1 (iv) — done the same day, with the owner's yes ("as proposed")**: one dated line in `reports/momentum-books-reading-rule-2026-11-23.md`, under "What would count against a reading even if the rule passes" — the wording proposed and taken: *"**Trade-for-trade (added 25 Nov 2026, A22).** The share of the median book's profit that came from trades held through a day the share was in BE or BZ is reported beside G (`paperBooks.t2t.share`), with every purchase and sale made on a day the share closed at its band. If that share is above a third, it is said in the same sentence as the verdict."* The "third" is a convention chosen before any book has held such a share, not a finding.
2. **Step 2, the backtest, not started.** Two things learned here that the hypothesis and the home run need:
   - the members top-up visits a saved day only for the names still missing, so "the backfill stores the series" is a new pass: for every saved day, the series of every member's bar already on file, written under `series[date]` — the rows are in the bhavcopy the run already downloads;
   - the home run also fills the paper books' first seven days (13–23 Nov), which the daily job did not record.
3. **A share on a 2% band** is not seen by the 4.9% reading. The bhavcopy does not carry the band either; NSE's daily price-band file does. Whether it matters is a question for step 2's count.
