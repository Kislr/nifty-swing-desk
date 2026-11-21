# Results drift — how the paper season is read (written 21 Nov 2026, before the season exists)

Owner's decision, 21 Nov 2026 (fourteenth session), on audit item A1. On the complete results file the PEAD setup **passes by the letter** of the 13 Nov rule (`reports/pead-2026-11-19-adjusted-members.md`: +0.150R over 1,929 trades, excess over the NIFTY 50 positive in 7 of 10 years, largest year 39% of the R). The rule's consequence for a pass is a paper season for "Results drift", no orders. The owner takes that season **as a frozen re-run**: nothing is built into `engine.js`, the digest and the queue, the rule is fixed as it stands today, and after the next results season the same script is run again on the new events and the season's trades are read off. Trades that show promise are to be shown differently from the rest in the Results drift section. This file fixes what "frozen" and "showing promise" mean before any of those trades exists.

## Why a re-run and not a live setup

Read from the committed trade list (`reports/pead-2026-11-19-adjusted-members.json`), all on record before this decision:

- The pass is by 0.7 of a point and not yet final: 2023 supplies 113.9R of 290.0R, **39.3%** against the 40% cap, and 51 of the 1,929 trades were still open at the end of the data, marked at +26.5R together. If they give back 5.2R of that, 2023 is over the cap again.
- The mean 20-bar excess over the NIFTY 50 is +0.16%, with a t of 0.74: the R the row earns is mostly the market's own rise while the trades were open, not drift over it.
- 2020, 2021 and 2023 supply 279.7R of the 290.0R (96%); the other years make +0.007R a trade over 1,382 trades, and 2024–2026 make +0.03R over 563 with a mean excess of −0.35%.
- The desk row — four slots, one per sector, what the digest would actually print — is +0.067R over 334 trades with −0.37% excess. The hypothesis listed "a desk version far below the primary row" among the things that count against a pass.
- One season is about 55 to 65 trades. The standard deviation of a trade's R on the record is 1.39, so a season's mean carries a standard error of about 0.19R: a paper season cannot tell +0.15R from zero, whichever way it is run. The cheap way is therefore the right one.

## What is frozen

- **The rule**: `RULE` in `scripts/backtest-pead.mjs` as committed today — reaction-day return in the top decile of the trailing 90 days, volume ≥ 2× the 20-day mean, buy at the next open unless it gaps more than 3%, stop 2 × ATR(14) below the entry (floor 2%), out at the stop or at the close of the 20th bar, 30 bps round trip, that day's NIFTY 500 members. No parameter is changed between now and the reading; a change makes the season a new backtest, not a paper season.
- **The freeze date**: 21 Nov 2026. A trade is **forward** when its reaction day is after that date. Everything up to it — including the Sep-quarter 2026 season, whose trades were on the page on 19 Nov — has been seen and is context, not evidence.
- **The events**: `data/results/events.json`, topped up from home after the season with `node scripts/results-dates.mjs` (BACKFILL.md, "Results dates") — the same pull that closed the gap on 19 Nov.

## The Results drift section

`scripts/backtest-pead.mjs` writes it into every report from now on, and into `data/results/drift.json`: every primary-row trade with a reaction day on or after 1 Oct 2026, grouped by results season (the calendar quarter of the reaction day), each trade tagged *forward* or *seen before the freeze*, *open* or closed, and whether the four-slot desk row would have taken it.

**Showing promise (★)** — fixed here: a trade, open or closed, whose result at the reading is **at least +1R and ahead of the NIFTY 50 over the same bars** (R-multiple ≥ 1.0 and excess > 0). In words: it has moved at least the distance of its own stop in the right direction, and by more than the market did. Starred trades are listed first in their season, in bold, with the mark; the rest follow in date order, plain.

The mark describes; it does not select. On the ten-year record **23.6% of closed trades** carry it (443 of 1,878; their mean is +2.14R) — the right tail every 46%-winner rule has. A season in which about a quarter of the trades are starred is the record repeating itself, not news. An open trade can lose its star before it closes.

## The reading

1. **After 16 Dec 2026** — the 51 trades open on 19 Nov have closed (20 bars after the last entry, 17 Nov). Re-run `npm run backtest:pead` and read the three conditions of the 13 Nov rule on the completed list. If 2023 is back over 40%, the setup is a fail by the letter again, PEAD is closed as the rule says, and the paper season below is not owed. (Since 21 Nov `--to` ends the data, so this report will reproduce later — audit A3.)
2. **After 12 Apr 2027** — the Dec-quarter 2026 results season (reaction days in January and February 2027) has run its 20 bars. From home: the results-dates top-up; then `npm run backtest:pead` and `npm run backtest:pead-portfolio`. Read the forward season in the Results drift section: trades, expectancy in R, mean excess over the NIFTY 50, the starred share against 23.6%, and the desk row's trades among them.
3. **What the season can and cannot say.** It is a record, not a verdict: with a standard error near 0.19R it neither confirms nor refutes the ten-year row. It is appended; forward seasons accumulate in the same section. Building the setup into the engine stays the owner's call and stays out of reach of one season — the sensible moment to ask is when the forward trades number 150 or more (about three seasons) and their own expectancy, excess over the index and desk row can be read against the +0.1R bar without the years that made the record.

Nothing in this file changes `swingMode`, the digest or the queue. The 15 Nov portfolio verdict (fail on two of three conditions) stands.
