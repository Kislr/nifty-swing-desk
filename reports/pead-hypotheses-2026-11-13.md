# Post-earnings-announcement drift — written before the data exists (13 Nov 2026)

Step 3 of the owner's order (13 Nov 2026): steps 1 and 2 — the index fund as the holding, the engine beside it as a paper book — are done (PR #38); the swing entries come next, starting with the post-earnings-announcement drift (PEAD), README queue item (6). This file is written before `scripts/results-dates.mjs` has been run and before `scripts/backtest-pead.mjs` has seen a real event, so that the rule, the pass mark and the reading are fixed before any number exists.

## Why this and not another swing rule

Ten years of swing backtests say the entries are the problem: breakouts and pullbacks are breakeven after costs (−0.01R over 885 trades), the score does not separate winners from losers, the regime gate and the fill test did not help, and the one slice that passed on today's names (pullbacks inside the momentum top 30) failed on the full membership (+0.09R). Every one of those entries is a price pattern. PEAD is an event: a company reports, the price jumps on heavy volume, and the literature — Ball and Brown 1968 onward, with Indian evidence from the 2000s on in NSE large and mid caps — says the move continues for weeks because the market under-reacts to the news. It is the most-replicated anomaly in the empirical literature after momentum itself, it has a reason (slow diffusion, analyst revisions arriving over the following weeks), and it is the only swing idea on the list that is not a different way of drawing a trend line.

The cost of testing it is a data set the desk does not have: the date and time of every quarterly results announcement for every name that was ever in the NIFTY 500 over the history. NSE publishes it, NSE refuses cloud IPs, so the pull is a home run (BACKFILL.md, "Results dates").

## The rule (fixed here)

**Event.** A quarterly results announcement for symbol S, with NSE's dissemination timestamp T (date and time the exchange published the filing). From the board-meetings list, where only the meeting date is known, the event is the meeting date with no time, tagged `bm`; such events are used only when the results list has no entry for the same symbol within three days.

**Reaction day R.** The first trading day on which the close reflects the news: T's own date if T is a trading day and the time is before 15:30 IST; otherwise the next trading day after T's date (announcements after the close, on weekends and holidays, and all `bm` events, which are evening announcements in practice).

**Reaction.** `ret_R` = close[R] / close[R−1] − 1. `volx` = volume[R] / mean(volume[R−20 … R−1]). Both need the bars to exist; an event without them is counted as uncovered, not as a miss.

**Signal at the close of R.** `volx ≥ 2` and `ret_R` in the top decile of the reaction returns of all events whose reaction day fell in the trailing 90 calendar days up to and including R (point-in-time: every one of those reactions has already happened; at least 30 events in the window, else no signal that day — this only bites in the first quarter of coverage). The decile and the 2× are the README's words from 12 Nov and are not tuned.

**Trade.** Buy at the next day's open (R+1) plus half the round-trip cost; if the open is more than 3% above R's close the trade is skipped (the digest arrives after the close, the order goes in before the open — the same convention as the swing backtest). Stop = entry − 2 × ATR(14 as of R), floor 2% below entry — the breakout stop, so the R-multiple means the same thing as in every other swing report. Exit at the stop if a day's low touches it (at the open if the open is already below), otherwise at the close of the 20th bar after entry. No target, no breakeven move, no trailing: the hypothesis is drift, and a target would cut it. Costs 30 bps round trip. Risk per trade = entry − stop; expectancy in R = (exit − entry) / risk, as everywhere else in `reports/`.

**Universe.** Names in the NIFTY 500 on day R (`data/membership/members.json`); the history holds the past members' bars, so this is the full correction from the first run.

## Rows, fixed in advance

1. **Primary**: top decile, `volx ≥ 2`, 20-bar hold, as above.
2. **Volume control**: top decile without the volume condition — does the 2× earn its place?
3. **Direction control**: bottom decile with `volx ≥ 2` — drift should be negative or absent there; a positive number here says the result is a market-rising effect, not drift.
4. **Base rate**: every event with `volx ≥ 2` regardless of decile — the average post-results 20-bar return, which the primary row must beat.
5. **Desk version**: the primary rule with the swing desk's limits — at most 4 open, one per sector, candidates taken in `ret_R` order — so the number the digest would actually have produced is on the page.
6. **Excess over the index**: each row also reports the mean 20-bar return minus the NIFTY 50's over the same bars, so a rising market cannot be mistaken for drift.

Read for information, not for the verdict: the same primary row with a 10- and a 30-bar hold, and with the top quintile instead of the decile — one table, no choosing among them.

## Pass mark

The repo's rule for a swing re-promotion, unchanged since 5 Nov: **expectancy ≥ +0.1R over 300 or more trades after costs**, on the primary row. Added for an event study: the mean 20-bar excess return over the NIFTY 50 must be positive in at least six of the calendar years with 20 or more trades, and no single year may supply more than 40% of the total R. Fail on any one of the three.

If the covered window gives fewer than 300 trades in the primary row, the result is **insufficient**, not a fail: the report says how many years NSE's results list reaches back, and the board-meetings source and the page's CSV download are the ways to extend it before the question is closed.

## What is expected numerically

The honest prior from the literature, scaled to a 2-ATR stop and 30 bps costs on NSE names: **+0.05R to +0.15R on the primary row, 600–1,200 trades over eight to ten years** (about 500 names × 4 quarters × 10% × roughly half passing the volume screen), with a hit rate near 45% and the gains in the right tail; excess 20-bar return over the index of +1% to +2%. The volume control should be a little worse, the bottom decile near zero or negative, the base rate near zero. The desk version will capture a fraction of the trades (results cluster into four seasons, so four slots fill in a day) and its expectancy should be similar or better, since it takes the largest reactions first.

So the primary row is expected to land *around* the bar, not clearly over it. The things that would push it under: NSE's dissemination times being mostly after the close (fine — that is what R handles) but with a share of filings arriving late at night and reported the next morning, which the data cannot distinguish from a same-day pre-open filing; and the 2× volume screen being too loose in 2024–2026, when results-day volume is routinely 3–5× for mid caps.

## What would count against a reading even if the numbers pass

A pass that is 2020–2021 (the recovery) and nothing else; a primary row that beats the base rate by less than the base rate's own standard error; a desk version far below the primary row (the rule works only if you can take every signal, which a four-slot desk cannot); and a reaction-day mapping that puts more than a fifth of events on the same day as their timestamp after 15:30 (a bug, not a finding — the report prints the split).

## Decision rule

**Pass.** PEAD becomes a swing setup in `engine.js` — "Results drift", an act signal on the evening of R with the entry, stop and 20-bar horizon printed, tagged in the digest and the site the way momentum pullbacks are — in paper mode for one results season (the journal's "Results drift" setup, like "Momentum pullback"), before any talk of orders. `swingMode` stays `'watch'`; a re-promotion of swing orders remains a separate decision after the paper season. The daily job gains a small, cheap results-list pull (the same API, the last seven days) so R is known on the day.

**Fail.** The result is recorded in this folder and the README; PEAD is closed; the next swing hypothesis is the short-term reversal in Nifty 100 names above their 200-day average (bottom decile of 5-day return, hold 5 bars — a separate engine, opposite philosophy), written first like this one.

**Insufficient.** The coverage line in the report says what to extend; the question stays open and nothing is built.
