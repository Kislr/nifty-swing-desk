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

## Caveats worth knowing

Bhavcopy prices are not adjusted for splits and bonuses. A 1:1 bonus shows as a 50% drop on the ex-date, which the engine will read as a stop-out or an "avoid". Rare in large caps, worth remembering when a backtest trade looks absurd.

The constituent list is today's Nifty 500. Stocks that were in the index two years ago but have since left are not in the backfill, which flatters backtests slightly (survivorship bias). The report says so in its footer.

NSE's index-history endpoint is sometimes unavailable from outside India. If the script says `index history unavailable`, everything still works: the regime uses breadth alone and relative strength is measured against the universe median instead of the Nifty. Re-running later fills the index in.

If NSE changes the archive URL (it has done so once, in July 2024, and the script knows both formats), the function to update is `bhavUrls()` at the top of `scripts/backfill.mjs`.
