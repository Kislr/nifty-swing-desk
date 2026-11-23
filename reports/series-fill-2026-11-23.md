# Members' bars from BE, BZ and RR loaded — what moved and why (23 Nov 2026, audit A20)

Until today the backfill kept a bhavcopy row only when its series was `EQ`. A share NSE had moved to trade-for-trade is listed under `BE` or `BZ` for as long as that lasts, and a REIT under `RR`, so an index member in one of those had no bar. The owner's home run of 23 Nov (`node scripts/backfill.mjs --from 2016-11-07 --members`) read the other series for every name that was ever a member:

- **53,793 bars from a series other than `EQ`**: `BE` 36,420, `BZ` 13,989, `RR` 3,384. 2,489 of the 2,490 saved days were topped up, none added, no failures.
- **Member-days without a bar, between a name's first and last bar and while it was in the index: 4,634 → 30** (`scripts/history-holes.mjs`), in 78 names → 4. What is left: RELINFRA 22 days in six runs of three or four between 22 Dec 2025 and 28 Jan 2026, JKIL 3 from 8 Aug 2017, RBA 3 from 14 Feb 2022 (the days around its rename from BURGERKING), MAHSCOOTER 2 in October 2025. None is long enough to close a holding; why each is missing is not known from here.
- Most of the 53,793 are outside that count: days before a name's first bar on file (the three REITs' years before October 2026) and days before a name entered the index or after it left, which is when a company in difficulty sits in `BE` or `BZ`. 6,415 of all the bars added fall on a day the name was a member.
- Corporate actions re-checked on the fuller bars: 307 events, **285 verified and applied** (281 before), 22 rejected.

## Before and after, like for like

Same code, same windows, same last day (20 Nov 2026). "Before" is the 21 Nov reports.

| run | before | after |
|---|---|---|
| Momentum, the paper book's rules, run on record | 625 trades, +287.7%, **15.6% a year**, drawdown 27.3%, Sharpe 0.87 | 630 trades, +335.4%, **17.0% a year**, drawdown 28.4%, Sharpe 0.99 |
| — across the 21 start days | 12.7% to 21.6%, **median 18.4%**; ahead of NIFTY500 MOMENTUM 50 from 14 starts, by two points from 5 | 14.3% to 23.1%, **median 20.1%**; ahead from 16, **by two points from 12** |
| Momentum, the 12 Nov rules, run on record | 11.1%, drawdown 31.7%, Sharpe 0.62 | 12.3%, drawdown 34.1%, Sharpe 0.70 |
| — across the 21 start days | 8.8% to 20.9%, median 14.0%; ahead of the fund from 1 | 8.6% to 22.2%, median 15.3%; ahead from 6, by two points from 1 |
| Momentum, `volAdjust=true`, across the 21 start days (not committed) | 15.9% to 20.2%, median 17.5%; ahead from 11, by two points from 2 | 16.3% to 19.9%, median 18.0%; ahead from 14, by two points from 7 |
| NIFTY500 MOMENTUM 50, total return, same windows | 17.3% to 17.9% a year | the same — an index file |
| Swing rules, all setups | 872 trades, −0.05R, profit factor 0.89, drawdown 56.1R | 891 trades, −0.03R, 0.93, 50.4R |
| Pullbacks inside the momentum top 30 | 587 trades, +0.08R, 1.19, 35.7R | 616 trades, +0.06R, 1.13, 39.2R |
| PEAD, primary row | 1,926 trades, +0.152R, +0.15% over the index, 7 of 10 years, largest year 36% | 1,928 trades, +0.154R, +0.17%, 7 of 10, largest year 35% |
| PEAD, desk row | 340 trades, +0.064R | 340 trades, +0.095R |
| PEAD as a portfolio | 6.6% a year against 12.3%; Sharpe 0.79 | 6.7% against 12.3%; Sharpe 0.80 |
| Reversal | 21,998 trades, −0.046R | 22,025 trades, −0.048R |

The swing and event studies moved by hundredths of an R and every verdict there reads as before. **The momentum engine moved by a point and a half at the median, and the count of starts that clear the written bar went from 5 to 12 of 21.** That is the part to read slowly.

## Why momentum moved

The shares NSE puts into trade-for-trade are very often the ones that have just risen a great deal — that is what the surveillance measure is for. On the old history such a holding lost its bars the day it moved series: twenty sessions later the engine closed it at its last `EQ` close as "stopped trading", and for six months after it came back the name could not be ranked, because its window had a hole. Ten such exits were in the run on record (ATGL, ADANIENSOL and JSWENERGY in 2021, SUZLON and JBMA in 2023, among them). On the filled history there are none: the engine holds through, and exits on its own rules.

Not every case was a gain. The old run sold ATGL in July 2021 at a stale +334%; the new one, holding on, takes +233%.

## How much of the result rests on the added bars

Measured on the run on record (`630 trades`), by comparing the history before and after the top-up bar by bar:

| | trades | share of the run's profit | winners | mean return |
|---|---|---|---|---|
| held through at least one added bar | **33** | **40%** | 55% | +29.1% |
| — of which sold on an added bar | 27 | 37% | 48% | +32.1% |
| no added bar while held, but one in the ranking window before entry | 26 | 1% | 42% | +6.3% |
| no added bar anywhere near | 571 | 58% | 44% | +3.0% |

- **One trade is a fifth of the whole run's profit:** TTML, bought 22 Oct 2021, sold 18 Jan 2022, +366%. Then SUZLON (Aug 2023 → Mar 2024, +95%), ATGL (+233%), JSWENERGY (+89%).
- **Of the 843 added bars the engine held, 123 (15%) closed 4.9% or more away from the day before** — at or near the 5% band a trade-for-trade share moves inside. Ten exits and two entries were made on such a day.

## What that means

**The filled history is the truer record of prices. It is not yet a truer record of what could have been traded.** A share in trade-for-trade has a 5% daily band and no intraday trading; when it is locked at the lower band there are sellers and no buyers, and the close the backtest sells at is a price nobody could have had that day. The engine's 20% trailing stop is read on closes. A stock that falls 5% a day, locked, for two weeks is sold in the backtest on the day the stop is crossed; in life it is sold when the lock breaks. TTML in January 2022 is that case.

So the old history understated the engine — it sold winners early and could not see them afterwards — and the new history, read with the same fill model, overstates it by an amount that is not measured. The truth is between 18.4% and 20.1% at the median, and nothing here says where.

## What stands, and what does not

- **Every verdict on record stands as written.** They were read on single runs fixed in advance; the run on record for the paper book's rules is 17.0% against the 19.3% the 13 Nov bar asks for. The fund is the holding.
- **"Nothing is promoted because 5 of 21 starts clear the bar" can no longer be said.** Twelve do, on prices whose fills are in doubt for the trades that make the difference. That is a different sentence and it is the owner's to weigh.
- **The live books are the same test, live.** The daily job reads the market-watch table, which has no series filter, so the twenty-one paper books have been able to buy a trade-for-trade share since 13 Nov, at its close. The reading of 14 Jun 2027 carries the same doubt, smaller.
- **A21's history table** (`reports/momentum-books-history-2026-11-23.md`: 105 readings, ahead 36%) was made on the history before this top-up. It is not re-run here; its conclusion — a half year is mostly weather — does not depend on the level.

## Left open

1. **How the engine should treat a share in trade-for-trade** — the owner's call, and a hypothesis to be written before any run: (a) as now, bought and sold at the close; (b) no new buys while a name is in `BE` or `BZ`, holdings kept and sold by the rules; (c) a fill rule — a sale on a day the close is at the lower band is not filled, and is tried again the next day. (b) and (c) need the history to **remember which series each bar came from**, which it does not: the backfill would store it and one more members run would fill it in.
2. **The four names still short of bars** (RELINFRA above all: its six gaps keep it out of the ranking until about August 2026).
3. **The live momentum list is not filtered by membership** — it relies on a non-member having no bar today. Replayed on 20 Nov after this top-up, which gave every past member a bar for that day, the unfiltered list shows four names that are not in the index (BLISSGVS, RAYMOND, IOLCP, MARKSANS). Tonight's job is not affected, since its bar exists for today's constituents only; a members top-up run on the same evening as the job would be. The paper books already rank on the membership list.
4. **Book 1 is unchanged by this top-up:** ₹4,97,909 on 20 Nov, the same fifteen names as after the weekend sessions were loaded.

## Reproduce

```
node scripts/history-holes.mjs                                                    # 30 member-days, 4 names
node scripts/backtest-momentum.mjs --benchmarks                                   # 17.0%
node scripts/backtest-momentum.mjs --benchmarks --phases                          # 14.3% … 23.1%, median 20.1%
node scripts/backtest-momentum.mjs --benchmarks --phases --set refill=rebalance --set volScale=false
node scripts/backtest-momentum.mjs --benchmarks --phases --set volAdjust=true --out /tmp/x
node scripts/backtest.mjs                                                         # 891 trades, −0.03R
node scripts/backtest.mjs --set universe=momentum --setups pullback --from 2017-06-09   # 616 trades, +0.06R (written to backtest-<date>; kept as swing-membership-<date>)
node scripts/backtest-pead.mjs ; node scripts/backtest-pead-portfolio.mjs ; node scripts/backtest-reversal.mjs
```
The "before" column, and the bar-by-bar comparison, need the history as it stood before the top-up (`git checkout 57c06ce -- data/history data/adjustments.json`).
