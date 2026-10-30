# Nifty Swing Desk

A self-hosted, rules-based swing-trading desk for NSE stocks. Every weekday after the close, a scheduled job pulls the NSE market-watch table, stores a snapshot in this repository, recomputes sector leadership and trade setups, and sends you a Telegram digest. A static website (GitHub Pages) shows the full picture: regime, sector board, signal queue with entry / stop / target / quantity, the universe table, and a trade journal scored in R-multiples.

Everything runs on free tiers: GitHub (hosting, scheduler, storage) and Telegram (alerts). There is no server to maintain and no database account to create.

**This is a decision aid built on fixed rules, not investment advice.** Nothing it prints is a recommendation to buy or sell.

## Where things stand

> **Rule for every working session, fresh or continued:** before finishing, update this checklist — tick what was done, add what was found, re-order what is next — and ship it in the same PR as the work. If a session ends with nothing merged, update the date and the "open decisions" anyway. The detailed reasoning behind each item lives in `ROADMAP.md` (swing desk) and `compounder/SCREEN.md` (compounder); this list is only the scoreboard. Last updated **2026-10-30**.

**Swing desk (NSE)**

- [x] Daily job, Telegram digest, website, journal; snapshot strip collapses behind "Show all" (PR #10)
- [x] Walk-forward backtests for the swing rules, the momentum engine and the pairs engine (`reports/`)
- [x] Digest moves to 18:00 IST (PR #11)
- [ ] Five-year history reload, then re-run all three backtests (ROADMAP item 1) — must run from a home connection: `node scripts/backfill.mjs --years 5`; NSE refuses cloud IPs, confirmed again 30 Oct
- [ ] Test "enter at the signal day's close" against "buy-stop next day"; add the 14:45 run only if it wins (ROADMAP item 8)

**Compounder screen (US)**

- [x] EDGAR universe and 10-K store (3,152 screenable companies), five-trait screen, weekly report
- [x] Yahoo prices 2020–2026 for the whole universe; screen uses real market caps, the $3M/day liquidity floor and the momentum overlay (PR #9); daily incremental run
- [x] Save step pulls main before pushing, so a merge during a run no longer loses its data; `meta.json` lists every year on disk; `screen.json` names the real price source
- [x] Hand-check the first priced screen (findings in `compounder/SCREEN.md`, version history): six market caps match quote pages within 3%; ^RUT closes and the 200-day average verified, gate open only since 27 Oct by 2%; the $3M floor removes none of the list; 21 → 18 in band (UI, STRL, WTS were float-understated). Fixed: dual-class filers with no cover-page count now use price × diluted shares instead of float (13% of the universe was silently on float); sensitivity table now uses prices
- [x] Backtest design decisions settled before any result exists (see "Decisions taken" below): whole-universe deciles, survivor gap measured and tagged from EDGAR, cap floor set by the gap
- [ ] Load 12 years of prices (`--years 12`, about 45 quarterly cohorts instead of 22)
- [ ] Build the backtest (SCREEN step 6): quarterly rebalance, 12-month hold, four portfolios vs the Russell 2000; pass criteria are fixed in `screen.json`. Fails twice → shelve the screen and write up why, as with pairs
- [ ] Dashboard page (SCREEN step 7), only if the backtest passes
- [ ] After the backtest: two "early detector" reports on data already in the store — industry over-representation among quality-and-momentum names vs the universe, and a revenue-acceleration flag (latest year's growth vs own 5-year CAGR). Reports, not alerts; each needs its own test
- [ ] India screen stays parked until the US backtest passes (data source Screener.in vs EODHD; NIFTY 500 membership history)

**Decisions taken (29 Oct 2026, before any backtest result existed)**

- *Deciles on a short list → rank the whole screenable universe.* With 20–45 passers a decile is 2–4 stocks and one takeover or blow-up decides a cohort, so the 70% test would be reading noise. The pass/fail test therefore ranks every screenable company (~3,100) on the composite score and compares top and bottom deciles of ~300, which also asks the right question: does the score separate winners from losers across all filers, not only among names already chosen. Sanity check for free: the quality list should sit inside the top decile. The composite must handle failing or missing traits (a failed trait scores, it is not "not applicable"). Passers-only terciles stay as a second, descriptive table, since that is the list one would actually buy.
- *Delisted companies → measure the gap and tag it from EDGAR, don't guess.* Yahoo has prices only for stocks still listed, so every past cohort is survivors only. Picks of a quality screen tend to leave by takeover (flatters the screen); rejects tend to leave by failure (also flatters it). No free source fixes this, so the backtest must report, for every cohort and every cap bucket, the share of the universe with no price history, and tag each missing name from the EDGAR store as *stopped filing* (with the date of the last 10-K) or *still filing* (a ticker change Yahoo mislabelled). Results carry a "survivor gap: X%" line until a delisted-price source exists.
- *If the gap is large → raise the cap floor, don't drop small caps on principle.* Delistings cluster at the bottom of the band, so the lever is the $300M floor in `screen.json`: set it at the lowest cap where the gap falls under about 5%, judged from the per-bucket measurement, not in advance. Reasons not to cut small caps wholesale: that is where quality and momentum effects are strongest and where a compounder screen is meant to look; mid-caps delist too, mostly by takeover, so a smaller gap is not automatically a more honest one; and if the floor climbs past about $2B the benchmark must change from the Russell 2000 to the S&P MidCap 400 or the comparison flatters the screen. If the gap is bad everywhere below $1B, the band becomes $1B–$10B and the report says so plainly.

**Housekeeping**

- [x] `actions/checkout` and `actions/setup-node` on v7 in all five workflows (Node 20 retirement)
- [x] Merged branches deleted
- [ ] Nothing else open

## How it fits together

```
index.html + app.js      the website (reads data/, keeps journal & settings in your browser)
engine.js                the swing rules engine, shared by the site, the job and the backtest
momentum.js              the momentum engine (ranked strength, monthly rebalance, regime gate) — independent of engine.js
pairs.js                 the relationship-stocks engine (cointegration + spread z-score over curated pairs) — a monitor; see its backtest
scripts/fetch.mjs        the daily job: NSE → data/snapshots/DATE.json + data/history/YEAR.json → signals → Telegram
scripts/backfill.mjs     one-time history load from NSE bhavcopy archives (see BACKFILL.md)
scripts/backtest.mjs     walk-forward backtest of the swing rules over data/history/
scripts/backtest-momentum.mjs  walk-forward backtest (and --sweep) of the momentum engine
scripts/backtest-pairs.mjs     walk-forward backtest (and --sweep) of the pairs engine, pair-trade and long-only modes
.github/workflows/       runs fetch.mjs at 18:00 IST Mon–Fri and commits the result
config.json              index to track, risk settings for the digest, retention
data/sectors.json        sector overrides (the backfill fills this from NSE's industry list)
ROADMAP.md               what is implemented, what is next, what is deliberately excluded
```

The rules themselves (what counts as a leading sector, when a breakout or pullback fires, where the stop goes, how size is computed) all live in `engine.js`, in one place, so the website and the Telegram digest can never disagree.

## Setup (about 15 minutes)

### 1. Put the files on GitHub

Create a new repository (private is fine), then upload this folder's contents to it. If you use git locally:

```
git init && git add . && git commit -m "Nifty Swing Desk"
git branch -M main
git remote add origin https://github.com/YOUR-USER/nifty-swing-desk.git
git push -u origin main
```

### 2. Let the job write to the repo

In the repository: **Settings → Actions → General → Workflow permissions → "Read and write permissions"**, then Save. Without this the job can fetch data but cannot commit it.

### 3. Turn on the website

**Settings → Pages → Build and deployment → Source: "Deploy from a branch" → Branch: `main`, folder `/ (root)`**, Save. After a minute the page reports the URL (`https://YOUR-USER.github.io/nifty-swing-desk/`). Every time the job commits new data, Pages republishes automatically.

A private repository needs a paid GitHub plan for Pages. If you want to keep the data private at no cost, make the repository public but note that the only thing in it is public market data and this code; your journal and settings never leave your browser.

### 4. Telegram alerts (optional but worth it)

1. In Telegram, message **@BotFather**, send `/newbot`, follow the prompts, and copy the bot token it gives you.
2. Open a chat with your new bot and send it any message (bots can't message you first).
3. Find your chat id: message **@userinfobot** and it replies with your numeric id.
4. In the repository: **Settings → Secrets and variables → Actions → New repository secret**. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

The digest arrives once a day after the job runs. Set `"alertIntraday": true` in `config.json` if you also want messages from manual daytime runs.

### 5. Load price history (recommended, 10 minutes, from your own computer)

The indicators need up to a year of bars per stock. Follow **BACKFILL.md** — one command (`node scripts/backfill.mjs --years 2`), then `git push`. Without it the tool still works, but moving averages, ATR stops, RSI and relative strength switch on gradually as the daily job accumulates data.

### 6. Run it once by hand

**Actions → Daily NSE snapshot → Run workflow.** Watch the log: it should say `fetched N stocks for YYYY-MM-DD HH:MM` and then `wrote data/snapshots/...`. Open the website; the status pill at the top shows when the data was last updated.

From then on it runs on its own at 18:00 IST every weekday (the Telegram digest arrives a few minutes after six). On a market holiday NSE serves the previous session's figures; the job notices the timestamp hasn't moved and does nothing.

## Backtest before you trust it

```
node scripts/backtest.mjs                                   # all history
node scripts/backtest.mjs --set minRR=2 --set minScore=60   # try other parameters
node scripts/backtest.mjs --setups breakout                 # one setup at a time
```

The latest committed report is `reports/backtest-2026-10-24.md` (with a parameter sweep and what it does and does not show). The report lands in `reports/` with expectancy (average R per trade after costs), profit factor, max drawdown and breakdowns by setup, score band and year. Read the "How to read this" footer; fewer than ~60 trades in a slice is noise. Every parameter in `engine.js` is a convention until this says otherwise.

## The momentum engine

A second engine with a different philosophy, kept separate so each is accountable to its own backtest. Every day it ranks the universe on its return over the last six months *excluding the most recent month* (short-term reversal is the best-documented wrinkle in momentum), drops anything thinly traded or more than 20% below its 52-week high, and lists the top 15, at most four per sector. The site shows this list in the **Momentum portfolio** card and the Telegram digest carries it below the swing signals.

The rules of use: hold the list equal-weighted; rebalance every 21 trading days, selling anything that has fallen below rank 30 and refilling from the top; between rebalances the only exit is a 20% fall from the highest close since entry. A **regime gate** — Nifty 50 above its 200-day average — decides whether new buys are allowed at all; when it is closed, holdings run out on their stops. Expect 35–50% winners: momentum earns from a few large winners and many small quick losses, so the win rate is the wrong number to watch.

```
node scripts/backtest-momentum.mjs                       # defaults
node scripts/backtest-momentum.mjs --set lookback=252 --set topN=10 --set trail=15
node scripts/backtest-momentum.mjs --sweep               # 96-cell parameter map
```

Reports land in `reports/momentum-*.md`. The warm-up is lookback + 21 bars, so with two years of history a 12-month lookback leaves under a year to test; the backfill at five years (`node scripts/backfill.mjs --years 5`) is what makes these numbers meaningful. Parameters can be overridden for the daily job under a `"momentum"` key in `config.json` (same names as `DEFAULTS` in `momentum.js`).

## Relationship stocks (pairs)

Thirty-three curated pairs of businesses that move together (HDFC Bank / ICICI Bank, TCS / Infosys, Maruti / M&M…). For each, every day: fit the price relationship over the last 120 bars, test whether the gap between the two is stable (Engle–Granger cointegration; pairs that fail are shown but never signal), estimate how fast a gap closes (half-life), and read today's gap in standard deviations. A **stretched** pair is one whose relationship passed the test and whose gap is more than 2σ wide; the lagging leg is named. The site shows the whole board; the digest lists only stretched pairs.

**Read the backtest before trading this.** On the history so far, buying the lagging leg and shorting the leader returned +0.03% per trade after costs; buying the lagging leg alone was similar; across a 162-cell sweep only the shortest estimation window was consistently positive, and only just. The idea that "when one lags it's a quick profit" did not survive contact with two years of Nifty data: stretches tended to keep stretching. The card exists as a monitor, and so that the test can be re-run on longer history (`npm run backtest:pairs`, `--sweep`). Edit the pair list in `pairs.js` (`PAIRS`); override parameters under a `"pairs"` key in `config.json`.

## The compounder screen (in progress)

A fourth engine with a different horizon: a quality screen over fundamentals (return on capital, gross margin, growth without dilution, cash conversion, debt), with the momentum engine borrowed as its timing layer. The screen is written down in `compounder/screen.json` and explained in `compounder/SCREEN.md`, including the backtest's pass criteria, fixed before any data was pulled. US first; India later.

**Data (US).** `scripts/compounder-fetch-us.mjs` builds `compounder/data/us/universe.json` (every NYSE / Nasdaq filer with CIK, SIC, fiscal year end, flagged financial / 10-K filer) and `compounder/data/us/facts/NN.json` (per company, per fiscal-year end, the sixteen line items the five traits need). Both come from SEC EDGAR, free, with no account. The store is **point-in-time**: for each fiscal year it keeps the value from the earliest 10-K that reported it, with the filing date, and records any later restatement separately. That is what lets the backtest only use what was knowable on each date.

```
node scripts/compounder-fetch-us.mjs --universe                 # ~5,000 submissions lookups, ~10 min
node scripts/compounder-fetch-us.mjs --facts --limit 50         # quick test
npm run compounder:us                                           # everything, ~30 min
```

The job `.github/workflows/compounder-us.yml` runs this quarterly and commits the result; run it by hand from the Actions tab the first time. The SEC asks that pulls identify themselves: set a repository variable `EDGAR_USER_AGENT` (Settings → Secrets and variables → Actions → Variables) such as `nifty-swing-desk you@example.com`. Requests stay under the SEC's 10-per-second limit.

**The screen.** `compounder.js` evaluates the five traits for every company as of a date, using only filings made on or before it, and ranks the passers inside the market-cap band by rank-sum across the traits. `node scripts/compounder-screen.mjs` runs it as of today (`--asof 2022-04-01` for a point-in-time run) and writes `compounder/data/us/screen-latest.json` plus `reports/compounder-us-DATE.md`: the funnel, the quality list, the near-misses (four passes, one trait not computable), and a sensitivity table showing how many names each threshold set would yield. The weekly job `compounder-screen.yml` keeps the report current. Tests: `node scripts/test-compounder.mjs` (also part of `npm test`).

**Prices (US).** `scripts/compounder-prices-us.mjs` pulls daily bars for every screenable ticker plus the Russell 2000 from Yahoo Finance's chart endpoint (no key; Stooq turned out to need a login for bulk and to refuse scripts per symbol). Closes are split- and dividend-adjusted, and dollar turnover in $ millions is stored alongside, so `momentum.js`'s turnover floor means "$M" here. The store is `compounder/data/us/prices/YYYY.json.gz`, the same shape as `data/history/YYYY.json`, which is what lets `engine.buildBars()` and the momentum engine read it unchanged.

```
node scripts/compounder-prices-us.mjs --backfill                # six years for ~3,100 symbols, ~10 min
node scripts/compounder-prices-us.mjs                           # daily: last 10 sessions, appended
node scripts/compounder-prices-us.mjs --symbols QLYS,IESC,^RUT  # a few names, for checking
```

With prices present the screen changes in three ways: market cap becomes last close × cover-page shares instead of the 10-K public float; passers trading under $3M a day on average (20 bars) drop out of the quality list into their own section; and the momentum overlay runs over the quality list with the desk's own parameters (six-month return skipping the last month, within 20% of the 52-week high, Russell 2000 above its 200-day average as the gate). The report gains a **moving** column and a **Quality AND momentum** list, which is the only list meant to trigger an alert. The job `compounder-prices.yml` runs every weekday after the US close and re-runs the screen; the first time, run it from the Actions tab with the **backfill** box ticked.

Not yet built: the backtest (pass criteria already in `screen.json`), the dashboard page, and India.

## Daily use

The site is read top-down. The **regime** strip tells you whether to be trading at all (weak breadth halves every position size automatically). The **sector board** shows where the money is; only the top three sectors with a positive score count as leaders, and momentum setups fire only inside them. The **signal queue** has four tabs: Orders for tomorrow (pullback buys and confirmed breakouts as *conditional* buy-stop orders for the next session — if the price never reaches the entry, the order expires and the setup is void; a name that disappears the next day was not triggered and cost nothing), Set alerts (names within 2% of a 52-week high and the exact close to wait for), Watch (strong days in leading sectors, tagged "don't chase"), and Avoid (near 52-week lows or down 8%+ in 30 days). Each row carries a **score** (0–100): base 50, plus sector leadership, relative strength, moving-average trend, volume, RSI extension and candle confirmation. Click a row for the full reasoning, the indicator readings and a **Log this trade** button that prefills the journal.

Pullback detection and relative volume need a few days of history; the tool gets sharper after its first week.

### Your data

Snapshots are committed to the repo, so every device sees the same market data. Your capital, risk settings, sector overrides and journal are stored in the browser you use (localStorage). Use **Backup** in the journal card to download them as a JSON file and **Restore** on another device. Do this before clearing browser data.

The Telegram digest sizes positions from `config.json`, not from the browser settings, so keep the two in step.

## Configuration

`config.json`:

| key | meaning |
|---|---|
| `index` | NSE index whose constituents to track: `NIFTY 500` (default), `NIFTY 50`, `NIFTY NEXT 50`, `NIFTY MIDCAP 100` … any name the NSE market-watch dropdown offers |
| `historyDays` | how many past snapshots the engine reads for pullback / volume logic |
| `keepDays` | snapshots older than this are deleted from `data/snapshots/` |
| `alertIntraday` | send a Telegram digest even when the snapshot is from before 2:30 pm |
| `risk` | `capital`, `riskPct`, `minRR`, `maxPos` used in the digest's sizing |

`data/sectors.json` maps symbols to sectors for anything the built-in map in `engine.js` doesn't cover (Nifty 500 has many such names; they show as "Unmapped" and never qualify as a leading sector until mapped). The site's "Assign sector" box changes your browser only; copy the mapping into this file so the job agrees.

To change the schedule, edit the cron line in `.github/workflows/daily.yml` (times are UTC; 12:30 UTC = 18:00 IST).

## Running locally

```
npm test            # engine self-tests + a synthetic end-to-end backtest
npm run backfill    # = node scripts/backfill.mjs --years 2   (see BACKFILL.md)
npm run backtest    # = node scripts/backtest.mjs
npm run fetch:dry   # fetch NSE, print the digest, write nothing
npm run fetch       # fetch, write data/, send Telegram (if TELEGRAM_* env vars are set)
npm run serve       # open http://localhost:8080 to view the site
```

Node 20 or newer; no dependencies to install.

## When the fetch fails

NSE sits behind a bot filter that occasionally refuses requests from cloud IP ranges. The job retries four times with fresh cookies and, if it still fails, sends you a Telegram message instead of a digest. Three fallbacks, in order of effort:

1. Re-run the workflow later from the Actions tab (blocks are often temporary).
2. Run `npm run fetch` on your own computer and `git push` the result — a home connection is almost never blocked.
3. Upload the CSV from the NSE page (Market Data → Equity/Stock → download) in the site's Manual snapshot panel. That stores it in your browser only, but the signals work.

If blocks become the norm, register your own PC as a GitHub self-hosted runner and change `runs-on` in the workflow to `self-hosted`; the job then runs from your IP on the same schedule, as long as the machine is on.

NSE changes its website from time to time. The job calls `/api/NextApi/apiClient/marketWatchApi?functionName=getIndicesData` (the endpoint the live-equity page itself uses as of October 2026). If that moves, `scripts/fetch.mjs` is the only file to update: `E.rowsFromNseApi` in `engine.js` documents the field names it expects.

## Benchmark index

The history files carry **NIFTY 50** as the benchmark (relative strength, the 20-day index return, the momentum gate). When `config.index` is a different index, its market-watch payload only includes that index's own row, so the daily job fetches the NIFTY 50 row separately; the engine refuses to splice a differently named index close into the series (a NIFTY 500 close in a NIFTY 50 series looks like a 7% crash). If the NIFTY 50 fetch fails on a given day, that day's index bar is left empty and the gate uses the latest available bar.

## The rules, in one paragraph

Regime: breadth ≥ 60% advancing with the index up is Strong; ≤ 40% or index below −0.5% is Weak (half size); otherwise Mixed. Sector score = today's average move + 30-day average ÷ 6 + 2 × (breadth − 0.5) + average relative strength ÷ 4; the top three with score ≥ 1 lead. Relative strength = 20-day return minus the Nifty's, ranked as a percentile. **52W breakout**: within 2% of the 52-week high, 30-day change ≥ 0; entry 0.3% above the *prior* high (the 52-week high before today — NSE's figure includes today's bar), stop 2 × ATR(14) below entry (floor 2%), target at the configured reward:risk; actionable only on a close above the level and not more than 4% through it. **Pullback buy**: an impulse day of ≥ 3% within the last five sessions, today between −3% and +1%, holding above the impulse low and within 2% of the 20-day average, 30-day change ≥ 5%, not in a lagging sector; entry 0.3% above today's high, stop half an ATR under the lower of today's low and the impulse low. **Momentum watch**: up ≥ 2% today in a leading sector with 30-day ≥ 5% — never bought on the day. **Avoid**: within 5% of the 52-week low, down ≥ 8% in 30 days, or below both moving averages with a negative 30-day change. **Score**: 50 base; leading sector +15 / lagging −10; relative strength top 30% +10 / bottom 30% −10; price > 20-day > 50-day +10 / below both −10; volume ≥ 1.5× average +10; RSI ≥ 75 −15; bullish candle +5 / bearish −10; an Act-now setup under 50 becomes an alert. Quantity = (capital × risk%) ÷ (entry − stop), capped at `maxPos`% of capital. No entries before 2:30 pm, max four open positions, never two in one sector, stop to breakeven at +1R.

Run the backtest before trading it, then paper-trade the first weeks and judge the system on expectancy (average R per closed trade), which the Performance card tracks for you.
