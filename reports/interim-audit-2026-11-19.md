# Interim audit of the swing desk — 19 Nov 2026 (thirteenth session)

The final audit's list, run now (README, next-session marker, owner 18 Nov). Scope: `engine.js` and `momentum.js` against README.md and ROADMAP.md; `npm test` and the backtests from a clean clone of `main` at `42ac100`; each workflow's schedule against its comment and its last runs; every report named in a document; stale branches. `compounder.js` and SCREEN.md are left for the US leg. **Nothing was fixed** — the rule is to list every mismatch first. Items are numbered A1–A16 and repeated as checklist items in the README.

## What was run

| check | result |
|---|---|
| `npm test` (Node 22.23) | 220 checks, all pass |
| Pullbacks in the momentum top 30, `--members`, to 11 Nov | 594 trades, +0.09R, PF 1.22, 55.1R, 28.2R drawdown — as quoted |
| Momentum, paper-book rules, `--members --benchmarks`, to 12 Nov | reinvested 609 trades, +392.7%, 18.7%, 27.3%, Sharpe 0.98 — as quoted |
| Same, to 17 Nov (row 1 of the 18 Nov test) | +388.7%, 18.6%, 0.97 — as quoted |
| Same with `volAdjust=true`, to 17 Nov (row 2) | 583 trades, +305.6%, 16.2%, 25.1%, 1.04 — as quoted |
| Momentum, 12 Nov rules (`refill=rebalance volScale=false`), `--members`, to 12 Nov | 527 trades, +228.2%, 13.6%, 30.5%, 0.71 — as quoted |
| PEAD, to 12 Nov | 1,860 trades, +0.151R; trade list identical to the committed one |
| PEAD as a portfolio | 6.3% a year, Sharpe 0.76, 2020 = 49% — as quoted |
| Reversal, to 12 Nov | 21,846 trades against 21,837 committed, −0.048R both — see A3 |
| Swing rules, no `--members`, to 5 Nov | 881 trades, −0.04R, PF 0.91 against the 885 / −0.01R / 0.99 quoted — see A4 |
| Momentum, 12 Nov rules, no `--members`, to 11 Nov | 16.7%, 37.3% drawdown, Sharpe 0.78 against the 25.3% / 27.0% / 1.19 quoted — see A4 |
| Swing rules, all setups, `--members` (new, not on record before) | 865 trades, −0.03R, PF 0.93, 46.2R drawdown; pullbacks −0.03R (370), breakouts −0.03R (495) — see A5 |
| Reports and files named in README / ROADMAP / BACKFILL | all present (the only absent names are retired or planned files, named as such) |
| Index series | no hole in 2,478 days |

Every verdict on record reproduces. The mismatches are in the data behind one verdict (A1, A2), in what a run without `--members` now means (A4, A5), in how the live paper book will differ from its backtest (A6, A7), and in text.

## The record

**A1. The results-dates file has no Sep-quarter 2026 season, and PEAD's one failed condition is inside that gap's reach.** `data/results/events.json` holds 0 events for October 2026 and 1 for November, against 510 and 1,786 a year earlier. In `data/results/raw/` the last financial-results window (`fr-2026-09-16-2026-11-12.json`) is one row, and the board-meetings file for that window does not exist (41 `fr` windows, 40 `bm`). The coverage table calls 2026 "looks complete" because its test is 1,200 events in the year. The PEAD setup failed on one condition: 2023 supplies 113.9R of 281.2R, **40.5%** against a 40% cap (the report rounds it to 41%). The missing season is about 55 trades (Oct–Nov 2025 had 55). At the primary row's own average (+0.151R) they add about 8R and 2023 falls to about 39.3% — under the cap; at the average of the 2026 trades on file (−0.085R) it stays over. So the setup verdict is not settled by the data on file. The portfolio verdict (6.3% a year against 12.3%) does not turn on 55 trades. Needs the owner's home run for the last window, then `backtest-pead.mjs` and `backtest-pead-portfolio.mjs` again.

**A2. Since April 2025 almost no event carries a dissemination time.** Share of events with a time, by year: 2021–2024 87–94%, 2025 25%, 2026 0% (Jan–Mar 2025 are timed; from April 2025 it is 0–6 events a month). The `fr` windows fall from 2–3 MB each to 3–44 KB after 25 March 2025, so those seasons come from the board-meetings list alone and every one of their events is treated as after the close, reaction on the next trading day. A result published during market hours is then measured a day late. README says "65% with a dissemination time" and "complete from 2017"; both are true only of the total. 2025 and 2026 are PEAD's two weakest years (+3.3R on 190 trades, −11.2R on 132); whether the missing times are part of that is not known until the list is pulled again (or the page's CSV download is used).

**A3. `--to` in the two event studies limits the signal day, not the trade.** `backtest-pead.mjs` and `backtest-reversal.mjs` take signals up to `--to` and then run their exits to the end of the whole history, so a past report cannot be reproduced exactly once new bars exist (reversal: 21,846 trades against 21,837, 46 exits moved; the verdict line is unchanged). This is the fault fixed in `momentum.simulate` on 13 Nov. Smaller, same family: `backtest.mjs` prints the full history range in its header on a windowed run.

**A4. A run without `--members` is no longer "today's constituents".** Since the 12 Nov home run the history holds 895 symbols — every name that was ever a member, for all of its bars. Without `--members` both backtests trade all of them on every day, a universe that never existed. So the figures the README still presents as the plain run cannot be reproduced from the repository: `backtest-2026-11-06-adjusted.md` ("the latest committed report", 885 trades, −0.01R, PF 0.99) now comes out 881 / −0.04R / 0.91; `momentum-2026-11-12-adjusted.md` (25.3%, 27.0%, Sharpe 1.19) now comes out 16.7% / 37.3% / 0.78. The README's command lists lead with the plain run, and the monthly reminder in `config.json` (`npm run backtest:momentum -- --benchmarks && npm run backtest`) has no `--members` either, so the 1 Dec re-run would produce two reports comparable with nothing.

**A5. The digest and the site quote the swing rules' figure on today's names.** `engine.digest` prints "breakeven over ten years (−0.01R, 885 trades)" every day and `app.js` says the same in the queue note. On the full point-in-time membership the whole-universe rules are 865 trades, −0.03R, profit factor 0.93 (this audit's run; the README's −0.06R over 841 is the half-corrected figure). The momentum-pullback line beside it already quotes its full-membership figure.

## The live paper book against its backtest

**A6. Index reviews.** The daily job saves bars only for the day's NIFTY 500 constituents. A paper-book holding that leaves the index gets no more bars: `simulate` skips it at the rebalance (`c == null`), marks it at its last close for 20 bars and then closes it as "stopped trading" at that stale price; in the backtest the bars exist and it is sold at the rebalance as "ineligible" at the real close. A name that enters the index arrives with no earlier bars and cannot be ranked for 148 bars; in the backtest it is rankable on its first day. The next semi-annual review normally takes effect at the end of March — inside the six-month reading. Nothing in the reminders covers it.

**A7. Corporate actions between refreshes.** `data/adjustments.json` is as of 12 Nov and the refresh is quarterly, from home (next reminder 5 Jan). A bonus or split in a holding before then reads as a fall of more than 20% and the paper book prints a trailing-stop sale — the same thing that produced 13 false exits in the unadjusted five-year backtest. When the table is refreshed the book is replayed from 13 Nov on adjusted bars, so the digests already sent no longer match the book.

**A8. A missing NIFTY 50 bar.** README, "Benchmark index": "that day's index bar is left empty and the gate uses the latest available bar". That holds on the day itself. From the next day `gateAt`'s 200-day average has a hole in it, returns nothing, and the gate comes from the breadth fallback for 200 bars or until the bar is filled — what happened from 26 Oct to 5 Nov. The code is as it was; only the data was repaired. The digest shows which source the gate used but nothing flags the switch.

**A9. An unknown gate counts as open in `momentum.simulate` and as closed in `backtest.mjs`.** On the first 51 days of the momentum test window (12 Jun – 23 Aug 2017) neither the 200-day average nor the breadth fallback exists, so the opening buys were made ungated. The index was rising and the effect is probably nil; the branch is not written down anywhere.

## Rules against their descriptions

**A10. Momentum has an exit the documents do not state, and states one the code does not have.** At a rebalance a holding that fails the eligibility screen (more than 20% under its 252-bar high, turnover under ₹5 crore, a gap in its bars) is sold as "ineligible": 98 of the 609 exits (16%) in `momentum-2026-11-13-adjusted-members-refill-volscale.json`, plus 11 "stopped trading". The README's rules of use, the digest's rules line and the paper book's holding line name only rank 30 and the trailing stop (`E.positionLine` does handle it: "no longer ranked"). The header of `momentum.js` says "a position is also closed if its sector would exceed `maxPerSector` names" — there is no such exit, the cap applies to buys only — and still calls `refill: 'rebalance'` the default.

**A11. Swing rules, README against `engine.analyzeAt`.** "Daily use" says swing setups fire only inside the leading sectors: in the code a breakout fires in any sector and a pullback in any sector but the three lagging ones; leading adds 15 points and nothing else. Also: a leading sector needs two or more mapped stocks, a score of 1 or more ("positive" in Daily use) and a positive day or 30-day average; a breakout also needs today's change above −1.5%; the pullback's "within 2% of the 20-day average" is a floor only (not more than 2% under it); "no entries before 2:30 pm" turns an intraday breakout into an alert but leaves a pullback as Act; the "Sector leader" watch is not in the rules paragraph.

**A12. Stale text.** README "Backtest before you trust it": latest report named as `backtest-2026-11-06-adjusted.md`; pullbacks in the momentum top 30 "the first variant to pass, pending the membership work". README "The momentum engine": the digest "carries it below the swing signals" (it leads since 5 Nov); "the latest is `momentum-2026-11-12-adjusted.md`"; the two command comments "report gets -refill / -volscale" (those are now the defaults; switching them off gives `-norefill` / `-novolscale`). README "Daily use": the momentum-pullback slice "paper-traded … until the membership work confirms it" (it failed on 12 Nov). `engine.js`, comment on `tagMomentum`, and `app.js`, the badge's tooltip: "the one slice that passed its backtest (+0.16R over 638 trades)". README "Configuration": the table has no row for `paper` or `momentum`.

**A13. Two counts.** "Corporate actions 281 applied on 223 symbols" (README, ROADMAP): 223 symbols have an event, 215 have an applied one, which is what the scripts print. PEAD's "41%" is 40.5%.

## Housekeeping

**A14. Stale branch.** `session-12-volatility-positions` is merged (PR #43) and still on the remote; `main` is the only other branch.

**A15. Node 20 in all five workflows.** `node-version: '20'`; Node 20's support ended on 30 April 2026. The runs succeed and `npm test` passes on Node 22. The run pages also carry GitHub's notice that `ubuntu-latest` is moving to Ubuntu 26.

**A16. The slot ladder, first reading (18 Nov, a partial day).** The ladder reached `main` at 05:40 UTC, so ten of its fourteen slots were scheduled that day and all ten ran (#67–#76). The first to start was `32 6`, at 15:53 UTC — 9 h 21 min late — and it did the work: snapshot committed 15:54 UTC, digest at **21:24 IST**, one message of 3,860 characters with both momentum indices in the PAPER BOOK line. The other nine started between 16:38 and 21:48 UTC (`2 14` was 7 h 46 min late), each about 35–40 seconds of checkout and "snapshot unchanged". No run has yet been stopped by the gate, so that path is untested live. On 19 Nov at 04:47 UTC neither the 02:32 nor the 03:32 slot had started: the morning slots are delayed like the evening ones, which is the assumption the ladder rests on. If the delay stays near nine hours the 03:32 slot is the one that lands after 12:30 UTC; 19 Nov is the first full day and the 25 Nov reminder stands. The other workflows match their comments and run late by the same margin (prices 22:40 UTC, committed 03:59–04:55; weekly screen Monday 03:00, committed 10:38).

## Checked and found as described

`E.positionLine` against `scripts/backtest.mjs`, check for check: gap through the stop, stop, gap above the target, target, time stop at the 15th bar after the entry day, breakeven after a close at +1R, nothing read on the entry day; the journal's setup names match the ones it tests for. `E.discretionaryCheck`: two open at most, half the risk and half the position cap, a sentence of 12 characters or more. `E.digestFit` and its caps; `E.indexCode` and the built-in codes; the slot gate's two numbers (195, 750) against the README; `momentum.paperBook` — first buys at the first close on or after `from`, rebalance every 21 bars from that day, half size on the volatility flag, 20% stop on closes; the regime, sector-score, breakout, pullback, avoid, score and sizing rules in the README's "rules in one paragraph", apart from A11.
