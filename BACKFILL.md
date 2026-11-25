# Loading price history (backfill)

The engine's indicators (20/50-day averages, ATR stops, RSI, relative strength, 52-week levels computed from your own data) need up to 250 trading days of history per stock. The daily job builds that up one day at a time; the backfill loads it in one go from NSE's public bhavcopy archives, so everything works from day one and the backtest has something to chew on.

You run this once, from your own computer. NSE's archive host refuses most cloud IP ranges, which is why it is not part of the GitHub job.

## What you need

Node.js 20 or newer (`node --version`), a copy of this repository on your computer (`git clone` it, or download the zip from GitHub and unzip it), and about ten minutes per two years of history. No API key, no account, no npm packages.

## Steps

**1. Open a terminal in the project folder.**

On Windows, open the folder in Explorer, click the address bar, type `cmd` and press Enter. On a Mac, right-click the folder in Finder → *New Terminal at Folder* (or drag the folder onto the Terminal icon).

**2. Run the backfill.**

```
node scripts/backfill.mjs --years 2
```

Two years is the sweet spot: enough for a meaningful backtest, small enough to stay fast. You can also give exact dates:

```
node scripts/backfill.mjs --from 2023-01-01 --to 2024-12-31
```

It prints one line every twenty trading days and saves as it goes. Weekends and holidays are skipped automatically. Expect roughly one second per trading day because the script deliberately pauses between requests so NSE doesn't block you.

**3. Let it finish.** The last line looks like:

```
done: 494 days added, 0 already present, 230 holidays/weekends skipped, 0 failures. History years: 2024, 2025, 2026
```

If you see `too many failures — NSE may be blocking this IP`, wait fifteen minutes and run the same command again. Progress is saved; it continues where it stopped.

**4. Check the result.**

```
node scripts/test.mjs
node scripts/backtest.mjs
```

The second command walks the rules forward across every day of history and writes a report to `reports/`. The first time you see the numbers is the moment this stops being a guess.

**5. Push it to GitHub.**

```
git add data
git commit -m "history backfill"
git push
```

The website picks the history up on its next load (the status card shows "bars of history" climbing from 1 to ~250), and from the next scheduled run the daily job appends each new day to the same files.

## Corporate actions (run once after the backfill, then after any big gap)

The history files stay raw. A separate table, `data/adjustments.json`, lists every bonus, split and consolidation with its ex-date and factor, and `engine.buildBars()` applies it when the bars are loaded — by the site, the daily job and every backtest — dividing prices before the ex-date by the factor and multiplying volume by it. Keeping the raw files raw is what lets the daily job keep appending without re-adjusting anything.

From your own computer (NSE refuses cloud IPs for this endpoint too):

```
node scripts/corporate-actions.mjs            # pulls NSE's corporate-actions list from the first history date to today, ~1 minute
```

If NSE blocks the API, download the list by hand instead: nseindia.com → Corporates → Corporate Actions → set the date range → Download (.csv), then `node scripts/corporate-actions.mjs --csv ~/Downloads/CF-CA-equities-….csv`.

The script checks every event against the bars — the close before the ex-date over the open on it should be about the factor — and applies only the ones that pass (within 12%). It writes `data/adjustments.json` and `reports/corporate-actions-DATE.md`, which lists what was applied, what was rejected and why, and the events it cannot reduce to one factor (demergers, rights, schemes of arrangement — dates on which a price gap is real but unadjustable). Then re-run the two backtests so the reports reflect adjusted history, and `git push` the lot:

```
npm run backtest:momentum -- --benchmarks && npm run backtest
```

Expect the momentum numbers to move a little: some of its 20% trailing-stop exits were bonuses, not falls.

## Past members — the home run (12 Nov 2026)

The one thing that still gates every verdict. About an hour and a half of wall-clock, almost all of it the script waiting politely between requests; nothing to decide along the way.

1. **Pull `main`** so you have `scripts/backfill.mjs --members`, `data/membership/members.json` and the `corporate-actions` script: `git pull`.
2. **Check the starting point** (optional, ten seconds): `node -e "const M=require('./data/membership/members.json');console.log(Object.keys(M.symbols).length,'ever members')"` should print 895. `ls data/history/` should show 2016.json … 2026.json.
3. **Run the load**, from home, in the repository folder:
   `node scripts/backfill.mjs --years 10 --members`
   It prints `members mode: 895 tickers were ever NIFTY 500 members (2017-01-23 → 2026-11-12)` first, then `index history: N days` (should be about 2,470; if it says *unavailable*, stop and re-run later — the index fill is part of the job). Then one line every 20 days it touches: `YYYY-MM-DD: n symbols (saved, a days added, b days topped up so far)`. Expect about 2,470 days topped up with 0–400 names each (many in 2017, few in 2026) and 0 days added. It saves as it goes; if it stops (`too many failures — NSE may be blocking this IP`), wait ten minutes and run the same command again — it skips nothing in members mode but adds only what is still missing, so a re-run is harmless and fast for days already complete.
4. **Read the last line**: `done: 0 days added, N saved days topped up with missing members (R rows stored under a later ticker), …`. N should be in the hundreds or low thousands, R in the low thousands (renamed companies' pre-rename bars).
5. **Corporate actions on the new names**: `node scripts/corporate-actions.mjs` — the bonus/split table is rebuilt for the larger universe; the report in `reports/corporate-actions-DATE.md` says how many events were applied (expect more than 192).
6. **The two backtests that settle it**:
   `node scripts/backtest-momentum.mjs --members --benchmarks`
   `node scripts/backtest.mjs --members --set universe=momentum --setups pullback --from 2017-06-09`
   Each writes a report with a `-members` suffix in `reports/`. The momentum report's Universe section should now say that all 895 ever-members have bars (or nearly so); if it still says ~500, the load did not take.
7. **Commit everything**: `git add data/history data/adjustments.json reports && git commit -m "Past members loaded; backtests re-run on the full membership" && git push`. The history files roughly double in size; that is expected and happens once.
8. **Tell the next session** (or me, in a new conversation) the two headline numbers: the momentum reinvested CAGR against NIFTY500 MOMENTUM 50 TR, and the pullback slice's expectancy and trade count. The decision rules are already written in `reports/membership-hypotheses-2026-11-12.md`; the session's job is only to read them off and write the verdict into the README.

What not to do: do not run `--years 10` without `--members` (it would skip every saved day and add nothing); do not delete or hand-edit the history files first; do not run two copies at once.

## After each index review — the top-up (twice a year; 19 Nov 2026, interim audit A6)

NIFTY 500 is reviewed twice a year and the changes take effect on the last trading day of March and of September. The daily job saves bars only for the day's constituents, so from that day a name that left gets no more bars and a name that entered arrives with no history: the paper book carries the first at a stale price (the digest says `NO BAR TODAY`) and cannot rank the second for 148 bars. The backtest had bars for both. The book is replayed from its first day on every run, so once the bars are in, it corrects itself — the digest reminds you on 2 April and 2 October.

1. **Three files into `data/membership/src/`**, then commit and push: the "Replacements in indices" press release for the review from niftyindices.com (keep its name, `ind_prsDDMMYYYY.pdf`); a fresh `ind_nifty500list.csv` (nsearchives.nseindia.com/content/indices/ind_nifty500list.csv); a fresh `symbolchange.csv` (nsearchives.nseindia.com/content/equities/symbolchange.csv).
2. **Rebuild the membership list**: `node scripts/membership.mjs --asof YYYY-MM-DD` (the date of the constituent list). It needs `pdftotext`; a cloud session has it, so this step can be left to the next session. All three checks must be clean; commit `data/membership/members.json` and the report.
3. **From home, the bars**: `git pull`, then `node scripts/backfill.mjs --years 1 --members` — about ten minutes; it revisits the year's saved days and adds only the names missing on each (the new entrants' history, the leavers' bars since they left).
4. **`node scripts/corporate-actions.mjs`** (the new names bring their own bonuses and splits), then `git add data reports && git commit -m "Index review top-up" && git push`.
5. **Once more about a month later** (step 3 and 4 only), so the names that left have bars up to the rebalance at which the book sells them.

## Weekend sessions — the home run (21 Nov 2026, interim audit A18)

NSE trades on some Saturdays and Sundays: the Muhurat hour when Diwali falls on a weekend, Budget day, the disaster-recovery drills. Until 21 Nov 2026 the backfill skipped every weekend date and the daily job runs Monday to Friday, so none of those sessions is in the history — not one weekend date in 2,480 days. It showed on 9 Nov 2026: the previous close on file differed from NSE's for 350 of 500 names, because Sunday 8 Nov's Muhurat session was missing. About twenty minutes, nothing to decide along the way.

1. **Pull `main`** (`git pull`) so you have the backfill that knows about weekends.
2. **Run the catch-up**, from home, in the repository folder:
   `node scripts/backfill.mjs --from 2016-11-07 --weekends --members`
   It prints `members mode: 895 tickers…`, then `index history: N days` (about 2,490; **if it says *unavailable*, stop and run it again later** — a weekend session is only added together with its NIFTY 50 bar), then `weekends only: every Saturday and Sunday from … that is not on file is asked for; weekdays are left alone`. About 1,040 dates are asked for and nearly all answer "no such file" at once. Each session found prints its own line: `2026-11-08: weekend session added — 8xx symbols, NIFTY 50 25xxx.x`.
3. **Read the two last lines.** `weekend dates: N asked for, K session(s) found and added (dates…)` — the list of dates is the thing to pass on (the run of 21 Nov 2026 found ten: nine added at once, and 2024-03-02 after the fallback below). If it says `got an answer that was neither a file nor a 404`, run the same command again: it asks only for what is still missing. If it says `sessions NOT added for want of their NIFTY 50 bar`: when the run began with `index history unavailable`, run it again; otherwise NSE's index history has no row for that session, and neither has NSE's daily index file — add the bar to `data/index-bars.json` (the close is enough; write down where the figure comes from, as the entry for 2024-03-02 does) and run `node scripts/backfill.mjs --from DATE --to DATE --weekends --members` for that one date.
4. **Corporate actions**: `node scripts/corporate-actions.mjs` (a bonus or split whose ex-date is the Monday after is checked against the bar before it, which is now the weekend session).
5. **Commit and push**: `git add data/history data/adjustments.json reports && git commit -m "Weekend sessions loaded (audit A18)" && git push`.
6. **Tell the next session** the dates the run added. Its job: both baselines and the event studies re-run and set beside the 19 Nov reports (every figure is expected to move a little — a 21-bar rebalance counts sessions), and the paper book's replay from 13 Nov read against the digests already sent, since its bars now include 8 Nov.

What not to do: do not leave out `--members` (the day would get today's 500 names only, and the past members a hole); do not add `--years` as well as `--from`; do not run it at the same time as another backfill.

From now on nothing special is needed: any top-up tries the weekend dates of its last 60 days by itself, so when the digest says `HISTORY GAP`, `node scripts/backfill.mjs --from <the earlier date in that line> --members` fills the session.

## Series — the home run (23 Nov 2026, interim audit A20)

The bhavcopy lists every security under the series it traded in that day. Until 23 Nov 2026 the backfill kept `EQ` rows only, so a member NSE had moved to trade-for-trade (`BE`, `BZ`) got no bar for as long as that lasted, and a REIT (`RR`) or InvIT (`IV`) never got one. It showed on 8 Nov 2026 — STLTECH, HFCL and the three REITs had no bar for the Muhurat session — and it is not five names: `node scripts/history-holes.mjs` counts **4,634 member-days without a bar in 78 names** over the ten years (0.37% of all member-days), nearly all in runs of weeks or months: ALOKINDS 193 days from May 2022, JSWENERGY 182 from July 2021, ATGL and ADANIENSOL from September 2021, SUZLON, TTML … A name with a run like that cannot be ranked by the momentum engine for six months after it ends, and a holding with one is closed as "stopped trading" after 20 bars. The backfill now takes a name's bar from the first of `EQ`, `BE`, `BZ`, `RR`, `IV` that has one, and never from a debt series. About an hour and a quarter, nothing to decide along the way.

1. **Pull `main`** (`git pull`) so you have the backfill that reads the other series.
2. **Count the holes before**: `node scripts/history-holes.mjs` — it should say `without a bar: 4,634 (0.37%), in 78 names`. Keep the output.
3. **Run the members top-up over the whole history**, from home, in the repository folder:
   `node scripts/backfill.mjs --from 2016-11-07 --members`
   It prints `members mode: 895 tickers…` and `index history: N days` (about 2,490), then a progress line every 20 days. Every saved day is visited again — the ten weekend sessions too — and only the names still missing that day are added; nothing already in the files is rewritten. One fetch per trading day, as on 12 Nov. If it stops with `too many failures`, wait a few minutes and run the same command again.
4. **Read the two last lines.** `series: N bars came from a series other than EQ (BE …, BZ …, RR …, IV …)` is what the fix added; `done: 0 days added, K saved days topped up…` — days added should be 0 unless a session was missing.
5. **Count the holes after**: `node scripts/history-holes.mjs` again. What is left is a suspension, or a day NSE has no row for; `--list` prints every run that remains.
6. **Corporate actions**: `node scripts/corporate-actions.mjs` — an event rejected by the bar check because the bars around its ex-date were missing can now be verified.
7. **Commit and push**: `git add data/history data/adjustments.json reports && git commit -m "Members' bars from BE, BZ, RR and IV loaded (audit A20)" && git push`.
8. **Tell the next session** the two counts and the `series:` line. Its job: every baseline and event study re-run and set beside the 21 Nov reports — this moves the ranking universe, not only the calendar, so the figures are expected to move — and the twenty-one paper books' replay read against the digests already sent.

**Since 25 Nov 2026 (A22, step 1) the series is also remembered.** The daily job writes the day's names that are not in `EQ` into the snapshot (`series`) and the history file (`series["<date>"]`), and a day listed there says every other bar of that day is `EQ`. A top-up from this file's commands keeps that true: the rows it adds carry their series when the day is new to the file or already listed, and are added without one on an older day, whose other bars are of unknown series. **The history before 25 Nov has no series on record yet** — filling it in is one more pass over the same bhavcopies, built later the same day: the next section.

## Series — the second home run (25 Nov 2026, A22 step 2)

The fill rule at the band (`reports/momentum-fill-hypothesis-2026-11-25.md`) needs to know, for every bar, whether the share was in trade-for-trade that day. The members top-up downloads each day's bhavcopy anyway; since 25 Nov it also writes, for every day it visits, the series of **every member's bar on file** that is not `EQ` — not only of the bars it adds. Same command as on 23 Nov, from home, about an hour:

1. **Pull `main`** (`git pull`).
2. **Run** `node scripts/backfill.mjs --from 2016-11-07 --members`
   A progress line every 20 days (`…: series written (saved, N days so far)`). If it stops with `too many failures`, wait a few minutes and run the same command again — a day already written is simply written again.
3. **Read the last lines.** `series on record: N days written this run, K bars in a series other than EQ` — N should be the number of sessions on file (about 2,490) and K about 54,000 (the 53,793 bars loaded on 23 Nov, and any since). `; U bars on file had no row in their day's bhavcopy and are read as EQ` — if it appears, keep the number: it is the bars the rule cannot speak for. `done: 0 days added, 0 saved days topped up…` is the expected last line; anything added is a session or a bar that was missing.
4. **Check the coverage**: `node scripts/backtest-momentum.mjs --coverage` prints `series on record: N of N days` and stops. If the two numbers differ, the days missing are sessions the run did not reach — run step 2 again.
5. **Commit and push**: `git add data/history && git commit -m "Series of the bars on file (A22 step 2)" && git push`.
6. **Do not run the sweep.** Tell the next session the `series on record:` line; it runs the three sweeps and reads them against the hypothesis file.

Only 8 Nov and nothing else, if an hour is not to hand: `node scripts/backfill.mjs --from 2026-11-08 --to 2026-11-08 --members` (a minute; it fills the five names for that session and leaves the rest of the count where it is).

What not to do: do not leave out `--members` (a plain run skips every day already on file); do not add `--weekends` (that asks for a thousand weekend dates that never had a session; the members run already revisits the ten that did); do not run it at the same time as another backfill.

## A missing index bar (21 Nov 2026, interim audit A8)

If the NIFTY 50 call fails on an evening, that day is saved without its index bar. The daily job repairs it by itself at the next run — yesterday's close from today's NIFTY 50 row, older ones from NSE's index history — and the digest says `INDEX REPAIRED`. While a close is missing the digest carries `INDEX GAP`, and the gate's 200-day average steps over it (up to five; beyond that the digest says `GATE FROM BREADTH`).

If `INDEX GAP` is still there after two or three days, GitHub's runner is not getting NSE's index history. From home: `git pull`, then `node scripts/backfill.mjs --from <the first date in the INDEX GAP line>` — check that it prints `index history: N days` and ends with `(N given their missing NIFTY 50 bar)` — then `git add data/history && git commit -m "Index bars filled" && git push`. No `--members` needed: a saved day only gets the bar it lacks.

## Results dates — the home run for the PEAD test (13 Nov 2026)

The post-earnings-announcement-drift test (`reports/pead-hypotheses-2026-11-13.md`) needs the date and time NSE published every quarterly result over the history. NSE has it; NSE refuses cloud IPs; so this is a home run, like the three before it. Budget about 25 minutes of wall-clock, almost all of it the script pausing between requests, plus a minute to read one table. Nothing to decide along the way — the hypothesis file already says how the result is read.

1. **Pull `main`** so you have `scripts/results-dates.mjs` and `scripts/backtest-pead.mjs`: `git pull`.
2. **Check the starting point** (ten seconds): `ls data/history/` shows 2016.json … 2026.json; `ls data/membership/src/symbolchange.csv` exists (it maps old tickers to today's, so a result filed under an old name lands on the right bars). If `symbolchange.csv` is missing, download it again from nsearchives.nseindia.com/content/equities/symbolchange.csv into that folder first.
3. **Run the pull**, from home, in the repository folder:
   `node scripts/results-dates.mjs`
   It walks the history from the first bar (Nov 2016) to today in 90-day windows, first NSE's **financial-results** list (the one with the dissemination time), then the **board-meetings** list (meeting dates, the fallback for older filings). The first window of each prints `sample record keys: …` — glance at it; the script finds the symbol, the timestamp and the period by name pattern, and if the names it sees are unusual it will say so at the end. Every response is saved under `data/results/raw/` before it is parsed, so a parsing fix later needs no second evening. One line per window: `fr 2017-01-01 → 2017-03-31: 1,840 rows in 1 windows (0 empty)`. Roughly 40 windows per list.
   If it stops with `NSE did not answer four times`, wait fifteen minutes and run the same command again: saved windows are skipped, so the second run is fast and only fetches what is missing. If NSE keeps refusing the API, use the pages' own downloads instead: on nseindia.com → Companies → Corporate filings → *Financial Results*, set the period to Quarterly and the dates to a year at a time, download the CSV for each year (about ten files), and run `node scripts/results-dates.mjs --csv CF-FR-equities-2017.csv --csv CF-FR-equities-2018.csv …` (the board-meetings page's CSVs go in the same list; the script tells them apart by their columns).
4. **Read the coverage table** the script prints at the end (also `reports/results-dates-<date>.md`): one row per year with the number of events and of symbols. A complete year has about 1,800–2,200 events (450–550 names × four quarters). The line under the table names **the first year that looks complete** — that is where the PEAD window starts. If no year looks complete, the field patterns missed: send the `sample record keys` line to the next session and run `node scripts/results-dates.mjs --reparse` after the fix; nothing needs re-fetching.
5. **Run the backtest** (ten seconds, no network):
   `node scripts/backtest-pead.mjs`
   It writes `reports/pead-<date>-adjusted-members.md` and `.json`. The first line under the title is the verdict — PASS, FAIL or INSUFFICIENT — with the reason, judged against the pass mark fixed in the hypothesis before the data existed (primary row ≥ +0.1R over 300+ trades; excess over the Nifty positive in six of the years with 20+ trades; no year above 40% of total R). Read the Coverage paragraph too: the reaction-day split (same day / next day / no time) should be mostly "next day", because most results come after the close.
6. **Commit everything**: `git add data/results reports && git commit -m "Results dates loaded; PEAD backtest run" && git push`. `data/results/raw/` is a few megabytes of JSON; the events file is small.
7. **Tell the next session** the verdict line and the first complete year. The decision rule is already written: pass → "Results drift" becomes a paper-mode swing setup for one results season; fail → PEAD is closed and the short-term reversal is next; insufficient → extend the coverage (step 3's CSV route reaches further back than the API on some lists) before anything is built.

What not to do: do not hand-edit `data/results/events.json` (re-run with `--reparse` instead); do not run two copies at once; do not change the rule in `scripts/backtest-pead.mjs` before the first run has been read — the whole point of writing the hypothesis first is that the first number is the one that counts.

## Results dates — the top-up (19 Nov 2026, interim audit A1 and A2)

The 13 Nov pull left two holes (`reports/interim-audit-2026-11-19.md`): the last window (16 Sep → 12 Nov 2026) has one financial-results row and no board-meetings file, so the Sep-quarter 2026 season is missing; and since April 2025 NSE files results under *Integrated Filing → Financials*, a list the script did not read, so those seasons have dates from the board-meetings list and no times. The script now reads that list too and follows NSE to whichever host answers (`www.nseindia.com` redirects to `www.nseindia.in` from some connections). About five minutes at home, most of it pauses.

1. `git pull` — you need this version of `scripts/results-dates.mjs` and the history up to the latest close (the last window ends on the history's last day).
2. `node scripts/results-dates.mjs` — every window already in `data/results/raw/` is skipped. It fetches the last financial-results window again under its new end date (one row is NSE's real answer: that list is empty now), then the integrated-filing list from 1 Jan 2025 in pages of 1,000 (`if-…-p1.json`, about forty requests; the first prints `if sample record keys: …` — `symbol` and `broadcast_Date` should be among them), then the missing board-meetings window. If it prints `NSE answered on https://www.nseindia.in; the API calls go there`, that is the host fix working. If it stops with `NSE did not answer four times`, wait fifteen minutes and run the same command.
3. Read the table it prints. **2025 and 2026 should now show 80–95% "with a time"** (they were 25% and 0%), and the "Last months" line should show October and November 2026 in the hundreds or thousands (they were 0 and 1). If 2025–2026 are still near zero, send the `if sample record keys` line to the next session and stop here; the raw pages are saved and a `--reparse` after the fix needs no second pull.
4. `node scripts/backtest-pead.mjs` and then `node scripts/backtest-pead-portfolio.mjs` — ten seconds each, no network. Do not pass any option and do not touch the rule: the pass mark of 13 Nov and of 15 Nov is what the new numbers are read against. Expect more than the 55 missing trades to change, because every 2025–2026 reaction day is re-mapped from its real time.
5. `git add data/results reports && git commit -m "Results dates topped up: Sep-quarter 2026 season, integrated-filing times; PEAD re-run" && git push`.
6. Tell the next session the two verdict lines, the "largest year share of R" of the primary row, and the 2025 / 2026 rows of the by-year table.

## What gets written

`data/history/<year>.json` — one file per calendar year with aligned open/high/low/close/volume/turnover for every symbol in the universe, plus NIFTY 50 index bars (open/high/low/close) for the regime and relative-strength calculations. The site loads only the current and previous year; the backtest loads them all.

`data/sectors.json` — industry names from NSE's Nifty 500 constituent list are added for any symbol the built-in sector map doesn't know, so the sector board covers the whole index instead of showing half of it as "Unmapped". Edit the names freely; they are just labels.

`data/index.json` gains a `historyYears` list the site uses to know which files exist.

## Options

| flag | meaning |
|---|---|
| `--years N` | last N years to today |
| `--from YYYY-MM-DD [--to YYYY-MM-DD]` | exact range |
| `--universe nifty500` (default), `nifty50`, `all` | which symbols to keep; `all` stores every EQ-series stock (~2,000 names, ~4× the file size). With a list of names (`nifty500`, `nifty50`, `--members`) a name's bar is taken from the first of `EQ`, `BE`, `BZ`, `RR`, `IV` that has one (23 Nov 2026, audit A20) |
| `--pause 900` | milliseconds between requests; raise it if you get blocked |
| `--weekends` | weekend sessions (21 Nov 2026, audit A18): visit every Saturday and Sunday in the range that is not on file, and no weekday — the one-off catch-up, `--from 2016-11-07 --weekends --members`. Without the flag a run still tries the weekend dates of its last 60 days. A weekend session is added only with its NIFTY 50 bar |
| `--members` | past members (12 Nov 2026): the universe becomes every ticker that was ever in NIFTY 500 according to `data/membership/members.json`; days already saved are visited again and only the names still missing that day are added, stored under today's ticker by following NSE's rename list forward from that day. Run `node scripts/backfill.mjs --years 10 --members` once from home (about an hour, one fetch per trading day, progress saved every 20 days), then `corporate-actions` again and the backtests with `--members`. Nothing already in the files is rewritten |

## Caveats worth knowing

**Corporate actions between refreshes (19 Nov 2026, interim audit A7).** The daily job now reads a bonus or split off NSE's own row on the ex-date — NSE's change is measured from the adjusted price while its previous close is not — writes a provisional entry into `data/adjustments.json` and says so in the digest under DATA NOTICES. The quarterly `corporate-actions` run replaces provisional entries with verified ones. More than five in one day are reported and not applied.

**Weekend sessions (interim audit A18; code 21 Nov 2026, the catch-up is the home run above).** The daily job runs Monday to Friday, so a session held on a weekend — the Muhurat session of Sunday 8 Nov 2026 for one — is not saved by it; the digest's DATA NOTICES line `HISTORY GAP` says so on the next trading day, and any backfill top-up from that date now picks the session up (it tries the weekend dates of its last 60 days). The sessions before November 2026 need the one-off `--weekends` run.

**NSE's host.** From some connections `www.nseindia.com` redirects to `www.nseindia.in`. Every script that calls NSE's site follows it to whichever host answers (`scripts/nse.mjs`, 21 Nov 2026) and prints `NSE answered on …` when that is not `.com`. The archive host (`nsearchives.nseindia.com`) is a different server and is not affected.

Bhavcopy prices are not adjusted for splits and bonuses. A 1:1 bonus shows as a 50% drop on the ex-date, which the engine will read as a stop-out, an "avoid" or a momentum trailing-stop exit. The fix is the corporate-actions step below; until it has been run, remember it when a backtest trade looks absurd.

The constituent list is today's Nifty 500. Stocks that were in the index two years ago but have since left are not in the backfill, which flatters backtests (survivorship bias) — on ten years the momentum engine's reinvested CAGR fell from 25.3% to 16.8% just from no longer ranking future members before they entered. `--members` is the fix for the other half: it adds the names that left. Until it has been run, the backtests' `--members` option can only remove the future members.

A day saved without its NIFTY 50 bar now gets the bar on any later run that covers the date (the index history is fetched first and a saved day is topped up without re-fetching the bhavcopy). Renamed companies: in plain mode a bhavcopy row is stored under the symbol it carried that day, so a company renamed since has no bars before the rename under today's ticker; `--members` maps old symbols forward and fills those in too.

NSE's index-history endpoint is sometimes unavailable from outside India. If the script says `index history unavailable`, everything still works: the regime uses breadth alone and relative strength is measured against the universe median instead of the Nifty. Re-running later fills the index in.

If NSE changes the archive URL (it has done so once, in July 2024, and the script knows both formats), the function to update is `bhavUrls()` at the top of `scripts/backfill.mjs`.
