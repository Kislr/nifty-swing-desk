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

## What gets written

`data/history/<year>.json` — one file per calendar year with aligned open/high/low/close/volume/turnover for every symbol in the universe, plus NIFTY 50 index bars (open/high/low/close) for the regime and relative-strength calculations. The site loads only the current and previous year; the backtest loads them all.

`data/sectors.json` — industry names from NSE's Nifty 500 constituent list are added for any symbol the built-in sector map doesn't know, so the sector board covers the whole index instead of showing half of it as "Unmapped". Edit the names freely; they are just labels.

`data/index.json` gains a `historyYears` list the site uses to know which files exist.

## Options

| flag | meaning |
|---|---|
| `--years N` | last N years to today |
| `--from YYYY-MM-DD [--to YYYY-MM-DD]` | exact range |
| `--universe nifty500` (default), `nifty50`, `all` | which symbols to keep; `all` stores every EQ-series stock (~2,000 names, ~4× the file size) |
| `--pause 900` | milliseconds between requests; raise it if you get blocked |
| `--members` | past members (12 Nov 2026): the universe becomes every ticker that was ever in NIFTY 500 according to `data/membership/members.json`; days already saved are visited again and only the names still missing that day are added, stored under today's ticker by following NSE's rename list forward from that day. Run `node scripts/backfill.mjs --years 10 --members` once from home (about an hour, one fetch per trading day, progress saved every 20 days), then `corporate-actions` again and the backtests with `--members`. Nothing already in the files is rewritten |

## Caveats worth knowing

Bhavcopy prices are not adjusted for splits and bonuses. A 1:1 bonus shows as a 50% drop on the ex-date, which the engine will read as a stop-out, an "avoid" or a momentum trailing-stop exit. The fix is the corporate-actions step below; until it has been run, remember it when a backtest trade looks absurd.

The constituent list is today's Nifty 500. Stocks that were in the index two years ago but have since left are not in the backfill, which flatters backtests (survivorship bias) — on ten years the momentum engine's reinvested CAGR fell from 25.3% to 16.8% just from no longer ranking future members before they entered. `--members` is the fix for the other half: it adds the names that left. Until it has been run, the backtests' `--members` option can only remove the future members.

A day saved without its NIFTY 50 bar now gets the bar on any later run that covers the date (the index history is fetched first and a saved day is topped up without re-fetching the bhavcopy). Renamed companies: in plain mode a bhavcopy row is stored under the symbol it carried that day, so a company renamed since has no bars before the rename under today's ticker; `--members` maps old symbols forward and fills those in too.

NSE's index-history endpoint is sometimes unavailable from outside India. If the script says `index history unavailable`, everything still works: the regime uses breadth alone and relative strength is measured against the universe median instead of the Nifty. Re-running later fills the index in.

If NSE changes the archive URL (it has done so once, in July 2024, and the script knows both formats), the function to update is `bhavUrls()` at the top of `scripts/backfill.mjs`.
