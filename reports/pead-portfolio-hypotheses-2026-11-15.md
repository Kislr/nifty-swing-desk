# PEAD as a portfolio engine — written before the run (15 Nov 2026)

The owner's call at the end of the ninth session (13 Nov 2026) was option (iii): PEAD stays closed as a swing setup, and the question becomes whether the same signals, taken as a *portfolio* rather than through four swing slots, beat the index on total capital. This file fixes the rule, the pass mark and the reading before `scripts/backtest-pead-portfolio.mjs` has produced a number.

## What this is and is not

**This is a second look at the data that produced the finding.** The 13 Nov study (`reports/pead-2026-11-13-adjusted-members.md`) found the effect — +0.151R over 1,860 trades, +0.39% excess over the NIFTY 50 per 20-bar hold, t 4.65, 9 of 10 years positive — and failed it by a point on the 40% single-year cap. Running a portfolio over the same 1,860 trades cannot discover the effect again; the trades are the same and the mean excess per trade is already known. What it *can* answer is the question the desk row raised: results come in seasons, the four swing slots filled on day one and caught 329 of the 1,860 trades at +0.034R, so the edge existed but the desk could not harvest it. A portfolio that takes every signal, sized like the momentum book, is the only shape in which the finding is usable at all. Whether it is worth using is a question about idle cash, concentration and drawdown on total capital, which the per-trade study did not measure. Because the signals are reused, a pass here is a reason to start a paper book, not a reason to trade: **the paper book afterward is the real test.**

## The trades (unchanged from 13 Nov)

The trade list is the primary row of the 13 Nov study, trade for trade: a quarterly-results event with NSE's dissemination timestamp; reaction day R (same day if the time is before 15:30, else the next trading day); `volx ≥ 2` and `ret_R` in the top decile of the trailing 90 calendar days' reactions (≥ 30 in the window); NIFTY 500 member on R; buy at R+1's open plus half the 30 bps round trip, skipped if the open is more than 3% above R's close; stop = entry − max(2 × ATR(14 at R), 2%), exit at the stop when a low touches it (at the open if the open is already below), else at the close of the 20th bar after entry. Nothing in that list is tuned here; `study()` in `scripts/backtest-pead.mjs` produces it and the portfolio script consumes it.

## The portfolio (fixed here)

**Capital.** ₹5,00,000 (`config.json`), the momentum book's size, reinvested: a slot is current equity ÷ K at the close of R, equity = cash + open positions at that close. Cash earns nothing.

**Slots.** K = 30. This is a capacity fact, not a tuned number: the 13 Nov trade list has at most 46 trades open at once, a median of 17 and a 90th percentile of 34 on days with an entry or exit, so K = 30 holds the whole book on about 85% of active days and skips the tail of the heaviest weeks. The owner's "10–20 names a season" (13 Nov) undershot the count; the literal "every signal" needs K ≥ 46 and leaves the book two-thirds cash on an ordinary season day. Both are reported as companion rows (K = 20, K = 50) so the dependence on K is on the page, but the primary row is K = 30 and the verdict is read off it alone.

**Entry.** On R+1's open, every signal from R's close in descending `ret_R` order (largest reaction first — the desk row's order) until the book has K open or cash is short. Quantity = floor(min(slot, cash) ÷ entry); a quantity of zero (a stock dearer than a slot, or no cash) is a skip, counted. Positions already open are never resized.

**Exit.** As the trade list says — stop or 20th-bar close — at that trade's exit price. A slot freed by an exit at day D's close is available for entries at D+1's open. Equity is marked at each day's close; a position stopped intraday is cash from that close.

**Window.** From the first entry to the last bar of the history. The by-year table counts calendar years inside it; the first year is partial and is shown but not scored.

*Amendment, same session, before the verdict was read but after the first run had printed the book's rows:* the first run started the book on 19 Dec 2016 and the NIFTY 50 TR files in `data/benchmarks/` begin on 12 Jun 2017 and end on 11 Nov 2026, so the script reported "insufficient — the index does not cover the window". The window is now the index's coverage — entries from 12 Jun 2017, the curve to 11 Nov 2026, the same window every momentum report uses — so that book and index are measured over the same days. This moves the book's start by six months and drops 100 trades from a list of 1,860; the first run's primary row read 6.2% a year, 14.5% drawdown, Sharpe 0.75, so the amendment could not have changed the verdict, and it is recorded here because the rule is that nothing in this file changes after a number exists.

## Rows, fixed in advance

1. **Primary**: K = 30, the 13 Nov trades, reinvested.
2. **K = 20** and **K = 50**: the same trades with fewer and more slots. K = 50 takes every signal (the peak is 46).
3. **No stop**: K = 30, exit at the 20th-bar close only — the pure drift portfolio; information, since the finding was made with the stop.
4. **Elastic capital**: every signal at 1 ÷ 30 of equity with no cash limit, peak gross exposure reported — what the edge is worth if capital could be borrowed at zero; information only, it is not investable as written.
5. **NIFTY 50 TR** over the same window, from `data/benchmarks/` via `scripts/benchmarks.mjs`, measured with the same arithmetic (CAGR on 250-day years, drawdown on closes, Sharpe without a risk-free rate); the two momentum indices are shown for context and are not the bar.

Each row reports: trades taken and skipped (by reason), total return, CAGR, max drawdown, Sharpe, average share of equity invested, peak positions, and the by-year table against the NIFTY 50 TR.

## Pass mark

The README's words from 13 Nov, made exact:

- **Return:** the primary row's CAGR ≥ the NIFTY 50 total-return CAGR over the same window **+ 2 points**.
- **Risk:** the primary row's Sharpe > the NIFTY 50 TR's Sharpe over the same window.
- **Concentration:** no calendar year supplies more than **40%** of the book's total log return, ln(end ÷ start) per year over ln(final ÷ initial) — the size-neutral form of the 13 Nov cap, so a late year in a compounding book is not penalised for being late; applied only when the total is positive.
- At least 300 trades taken (the standing minimum; it will be met).

Fail on any one. There is no "near pass" this time: the 13 Nov near-miss is what put this hypothesis on the queue, and a second rule bent for the same data would be reading noise twice.

## What is expected numerically

Arithmetic from the 13 Nov table, not a forecast: 1,860 trades averaging 15 bars is about 27,900 position-days over roughly 2,370 trading days, so a 30-slot book is on average **about 40% invested** and empty between seasons. At +1.02% mean return per trade after costs, that is roughly 196 trades a year × 1.02% ÷ 30 slots ≈ **6–7% a year on total capital, before the trades that capacity skips**, against about 12% for the NIFTY 50 TR over the window. The honest prior is therefore a **fail on return with a shallower drawdown**: the drift is real per trade but too thin and too seasonal to carry a book that sits in cash for half the year. The elastic-capital row is expected to beat the index — that is the per-trade excess at full use — and K = 20 to beat K = 30 on return and lose to it on drawdown. If the primary row passes, the surprise would be the stop clipping the drawdown in 2018 and 2022 enough to lift the Sharpe above the index's while the return clears the bar on 2020–2023.

## What would count against a reading even if the numbers pass

A pass that is 2020 and 2023 (the two years that carried the 13 Nov table); a Sharpe above the index's only because the book is mostly cash (a drawdown number earned by not being invested is not a risk edge — the invested-share column is there to catch it); K = 20 and K = 50 both failing while K = 30 passes; and a return edge that disappears in the no-stop row, which would say the result is the stop, not the drift.

## Decision rule

**Pass.** The PEAD portfolio becomes a second paper book beside the momentum one, run by the daily job from the next results season (a "RESULTS DRIFT BOOK" block in the digest and a card on the site, the same shape as `M.paperBook`), which needs a small results-list pull in the job (the same NSE API, the trailing seven days, from the runner — if NSE refuses the cloud, the owner's home run supplies it weekly). Three- and six-month readings against the NIFTY 50 TR, the same decision rule as the momentum book. No orders, no engine change.

**Fail.** PEAD is closed at every level — setup and portfolio — and the finding stays on record as what it is: a real, thin drift that neither four slots nor a book can turn into a return over the index. The swing queue is empty and the next session moves to the items behind it (the first PAPER BOOK digest check, the Discretionary journal setup, housekeeping).

**Insufficient** cannot happen here: the trade count is known.
