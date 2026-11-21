# The weekend sessions, loaded — what moved and why (21 Nov 2026, audit A18)

Until today the history had no bar for any session NSE held on a Saturday or Sunday. The owner's home runs of 21 Nov added all ten that fall inside the ten years: 27 Oct 2019, 1 Feb 2020, 14 Nov 2020, 12 Nov 2023, 20 Jan 2024, 2 Mar 2024, 18 May 2024, 1 Feb 2025, 1 Feb 2026 and 8 Nov 2026 — four Muhurat hours, three Budget days, the Saturday before the January 2024 holiday and the two disaster-recovery drills. 2,490 days on file now, each with its NIFTY 50 bar; every index member that traded on both neighbouring days has a bar on the session itself, except five names on 8 Nov 2026 (see "Left open"). The corporate-actions table is unchanged: 307 events, 281 applied.

The README had said that after this load "every figure is expected to move a little". The swing and event studies did. The momentum engine did not move a little.

## Before and after, like for like

Same code, same windows, same last day; the only difference is the ten sessions. "Before" is `main` at the merge of PR #47.

| run | before | after |
|---|---|---|
| Momentum, the paper book's rules, to 18 Nov | 609 trades, +386.6%, **18.5% a year**, drawdown 27.3%, Sharpe 0.97 | 625 trades, +284.8%, **15.5% a year**, drawdown 27.3%, Sharpe 0.87 |
| Momentum, the 12 Nov rules (`refill=rebalance volScale=false`), to 17 Nov | 527 trades, +228.2%, **13.6%**, 30.5%, 0.71 | 552 trades, +164.8%, **11.0%**, 31.7%, 0.61 |
| Momentum, `volAdjust=true`, to 17 Nov | 583 trades, +305.6%, **16.2%**, 25.1%, 1.04 | 590 trades, +348.3%, **17.4%**, 25.0%, 1.00 |
| NIFTY500 MOMENTUM 50, total return, same window | 17.3% a year, Sharpe 0.88 | the same — an index file, not a simulation |
| Swing rules, all setups, to 18 Nov | 865 trades, −0.03R, profit factor 0.93, drawdown 46.2R | 872 trades, −0.05R, 0.89, 56.1R |
| Pullbacks inside the momentum top 30, to 11 Nov | 594 trades, +0.09R, 1.22, 28.2R | 587 trades, +0.08R, 1.19, 35.7R |
| PEAD, primary row, to 18 Nov | 1,929 trades, +0.150R, +0.16% over the index, 7 of 10 years, largest year 39% | 1,926 trades, +0.149R, +0.19%, 7 of 10, largest year 36% |
| PEAD, desk row | 334 trades, +0.067R | 340 trades, +0.068R |
| PEAD as a portfolio | 6.6% a year against 12.3%; 2020 = 47% of the log return | 6.6% against 12.3%; 2020 = 49%; Sharpe 0.79, no longer above the index's |
| Reversal, to 12 Nov | 21,837 trades, −0.048R | 21,939 trades, −0.046R |

Every verdict on record reads the same way after as before. No rule was changed.

## Why three points, for ten bars

Not the data: the ten bars are ordinary sessions with ordinary closes, and removing nothing else changes. The engine rebalances **every 21 bars counted from its first day**. Ten extra bars move every rebalance after October 2019 a few days earlier in the calendar — one bar at first, ten by the end — and a different rebalance day means a different ranking, different names bought, and ten years of different compounding. The rules, the prices and the last day are the same.

That can be measured without touching the history. `backtest-momentum.mjs --phases` (new today) starts the same rules on each of the 21 trading days of one rebalance cycle and lets each run to the same last day:

| rules | run on record (starts 12 Jun 2017) | lowest start | median | highest start | standard deviation | ahead of NIFTY500 MOMENTUM 50 | ahead by two points or more |
|---|---|---|---|---|---|---|---|
| The paper book's (`refill: close`, `volScale`) | 15.6% | 12.7% | **18.4%** | 21.6% | 2.6 points | 14 of 21 starts | 5 of 21 |
| The 12 Nov rules | 11.1% | 8.8% | **14.0%** | 20.9% | 2.8 points | 1 of 21 | 1 of 21 |
| `volAdjust=true` (not committed; `--phases --set volAdjust=true`) | 17.4% | 15.9% | **17.5%** | 20.2% | 1.1 points | 11 of 21 | 2 of 21 |

Full tables: `reports/momentum-phases-2026-11-21-adjusted-members.md` and `…-norefill-novolscale.md`. The fund makes 17.3% to 17.9% a year over the same 21 windows.

The same sweep on the history **without** the weekend sessions gives 13.6% to 20.2% for the paper book's rules, with the same mean (17.8%): the sessions did not move the distribution, they moved which draw the run on record is. On 19 Nov it happened to be 18.5%; today it happens to be 15.5%.

## What this changes in how the record is read

- **A single momentum figure is one draw from a spread of about ±2.6 points.** The 18.7% of 13 Nov, the 18.6% of 18 Nov and today's 15.6% are the same rules. A difference between two variants, or between the engine and the fund, smaller than that spread is not a finding.
- **The 12 Nov verdict is firmer than its number.** The rules it was read on are ahead of the fund from one start in 21.
- **The 13 Nov refinements are worth more than the 13 Nov test could show.** Refill and volatility sizing lift the median from 14.0% to 18.4% and the count of starts ahead of the fund from 1 to 14. They still clear the written bar — the fund plus two points — from only 5 starts in 21, so "nothing is promoted" stands, and the fund remains the holding.
- **The volatility-ranked variant (18 Nov, FAIL 2 of 4) still fails its first condition** (17.4% against the 19.3% required). What the sweep adds: its spread is 1.1 points against 2.6, its median Sharpe 1.05 against 0.95, its median drawdown 23.3% against 26.5%, for a median return 0.9 of a point lower. That is a measurement on the data the idea came from, not a re-test; the hypothesis file's one remaining reading, on the US store, is unchanged.
- **The live paper book is one draw too.** It began on 13 Nov 2026 and rebalances every 21 sessions from there. The six-month reading will compare one row with the fund. Whether to run the other twenty starts beside it as paper books is the owner's call; nothing is changed here.
- **A1 is less of a knife-edge.** On the complete history the largest year in the PEAD row is 2020 with 104.6R of 292.9R, 35.7% (2023: 35.6%). The 44 trades still open are marked at +27.1R together; the cap is breached only if they give back 31.5R, more than they hold. The other readings are as they were: +0.15% a trade over the index (t 0.68), 94% of the R from 2020, 2021 and 2023, +0.064R for the desk row.

## The paper book against the digests already sent

The book is replayed from its first day on every run, so its bars now include 8 Nov. Replayed on them, **fourteen of the fifteen opening names are the same and one differs: CARTRADE where the digests of 13 to 20 Nov listed ATHERENERG.** No sale happened; the ranking at the close of 13 Nov changed by one name. Value at the close of 20 Nov: ₹4,97,909 against ₹4,97,996 as sent. The replay on the old bars reproduces the digest of 20 Nov exactly, name for name. From the next run the digest and the site carry the new book; a reminder dated 23 Nov says so in the digest itself.

## Left open

- **Five members have no bar on 8 Nov 2026**: STLTECH, HFCL, and the three REITs that entered at the September review (BIRET, EMBASSY, BAGMANE). They traded — NSE's previous close on 9 Nov differs from their 6 Nov close — but the bhavcopy rows the backfill keeps are series `EQ` only. The REITs trade in their own series and have 24 bars in all, so they are not rankable for another six months either way; STLTECH and HFCL already had holes in October. None is a paper-book holding. The fix is to accept a member's row in the series it actually trades in; listed as A20.
- **`--phases` covers one cycle of starts in June–July 2017.** It says nothing new about the later cold starts (2020 onward), where the 13 Nov tables had the engine level with or behind the fund.
- The site's report card and the digest's two citations now quote today's figures, with the older ones named as what they were.

## Reproduce

```
node scripts/backtest-momentum.mjs --benchmarks                                   # 15.6%
node scripts/backtest-momentum.mjs --benchmarks --phases                          # 12.7% … 21.6%, median 18.4%
node scripts/backtest-momentum.mjs --benchmarks --phases --set refill=rebalance --set volScale=false
node scripts/backtest-momentum.mjs --benchmarks --phases --set volAdjust=true --out /tmp/x
node scripts/backtest.mjs                                                         # 872 trades, −0.05R
node scripts/backtest.mjs --set universe=momentum --setups pullback --from 2017-06-09   # 587 trades, +0.08R
node scripts/backtest-pead.mjs ; node scripts/backtest-pead-portfolio.mjs ; node scripts/backtest-reversal.mjs
```
The "before" column needs the history as it stood at the merge of PR #47 (`git checkout 1191b24 -- data/history data/adjustments.json`).
