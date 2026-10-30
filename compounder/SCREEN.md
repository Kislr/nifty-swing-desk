# Compounder screen — the definition, before any data

This file and `screen.json` are step 1 of the compounder project: write the screen down before touching data, so the backtest tests a hypothesis rather than fits one. Every threshold in `screen.json` is an opinion. The backtest (step 6) is what turns it into a finding or throws it out, and the pass criteria for that backtest are written in `screen.json` now, so the result cannot move the goalposts later.

The screen is a separate engine from the swing rules, the momentum engine and the pairs monitor, as ROADMAP.md asks: its own module, its own store, its own backtest. It borrows the momentum engine unchanged for its timing layer and the daily NSE pull for Indian prices.

**This is a research aid built on fixed rules, not investment advice.** Nothing it prints is a recommendation to buy or sell.

## The five traits

**Return on capital employed.** EBIT over (total assets minus current liabilities). The bar is 12% in at least four of the last five fiscal years, with no year below 8% (v0.2; the v0.1 draft said 15% and 10%, which the first US run showed passes only 9% of companies and left seven names in the cap band). The original draft said all five years; that is too strict for a universe that includes US small caps and would leave too few names to rank, and one bad year is exactly what a good business is supposed to survive. The floor of 10% stops a company that had one catastrophic year from passing on the other four. Ranked on the five-year median.

**Gross margin holding or widening.** Latest fiscal-year gross margin within three points of its five-year high (v0.2; two in the draft). This is pricing power as it appears in a filing. Ranked on the five-year change in margin.

**Growth without dilution.** Revenue CAGR of at least 10% over five years (v0.2; 12% in the draft) with the diluted share count up no more than 10% over the same period. A share count that falls by more than 60% in five years is treated as a filing unit change, not a buyback, and the trait as not applicable; the first run caught one such case. The second half is the part that matters: growth bought with shares is a story, not a business. Ranked on revenue CAGR minus share-count CAGR.

**Cash conversion.** Operating cash flow over net income, computed as a ratio of three-year sums rather than an average of yearly ratios, so a year with near-zero net income cannot produce a meaningless number. At least 0.8, and the three-year net income sum must be positive. Ranked on the ratio, capped at 3 for ranking so one odd year does not dominate.

**Little debt.** Net debt over EBITDA at or below 2 in the latest fiscal year; net cash passes outright. Ranked ascending, net cash first.

## What is excluded and why

Banks, insurers, brokers, REITs and holding companies have no gross margin and their ROCE is not comparable to an operating company's. Version 0.1 excludes them (US by SIC code 6000–6799, India by sector name) rather than giving them their own rules. If the screen earns its keep, a financials variant on return on equity and book-value growth is a later step.

Any company with fewer than five fiscal years of filed data is excluded, six for the growth trait. This means recent IPOs never appear, which is intended: the screen is looking for businesses that have already been unusual for years.

## The composite

A company must pass all five rules to be on the quality list. Among passers, each trait produces a rank, and the five ranks are summed; lowest sum is best. There are no weights because any weight would be fitted to the past. Each failure is recorded by trait, so the dashboard can say "fails on debt" rather than showing a number.

## Market bands

| | US | India |
|---|---|---|
| Market cap | $300m – $10bn | ₹500 cr – ₹25,000 cr |
| Liquidity floor | $3m average daily dollar volume, 20 days | ₹5 cr average daily turnover, 20 days (same floor as the momentum engine) |
| Momentum gate index | Russell 2000 | NIFTY 50 for now; NIFTY MIDCAP 150 once the history carries it |
| Fundamentals source | SEC EDGAR XBRL, free | Pending: Screener.in Premium (manual quarterly download) or EODHD (API); decided after a one-week trial |
| Point-in-time | Yes, from each fact's EDGAR filing date | No, data is restated; approximated as year end + 60 days and labelled as such |

The market cap band is computed as of the screening date in the backtest (price × shares at that date), never from today's cap, otherwise the screen quietly picks today's survivors.

## The timing layer

The momentum engine's `rankAt()` is run on the quality list with the desk's own parameters (six-month return skipping the last month, not more than 20% off the 52-week high, index above its 200-day average). The dashboard shows two lists per market: the quality list, and the intersection with momentum, which is the only thing that triggers an alert.

## The backtest, specified in advance

Quarterly rebalance, twelve-month holding, overlapping cohorts. Four portfolios per market: top decile, bottom decile, all passers, and the quality-and-momentum intersection. Benchmarks are the Russell 2000 and the NIFTY 500. The report shows mean and median excess return per cohort, the share of cohorts in which the top decile beat the bottom, the dispersion of individual stock returns inside each cohort, drawdown, and a robustness table where each threshold is moved by ±20% one at a time.

The screen passes if the top decile beats the bottom decile in at least 70% of cohorts, its mean and median excess return are both positive, and no single ±20% threshold shift flips the first condition. If it fails, the thresholds change and the backtest is re-run; if it fails twice, the screen is shelved and the reasons written up in `reports/`, the way the pairs engine was.

## Version history

v0.1 (2026-10-25): the draft above with ROCE 15% / floor 10%, gross margin within 2 points, CAGR 12%. First US run: 19 companies pass, 7 in the cap band; the 12 outside the band were Microsoft, Meta, Adobe, Autodesk, ResMed, Ulta, Paycom, Manhattan Associates, Comfort Systems, EMCOR, Fabrinet and RCM — the right kind of company, too few of them.

v0.2 (2026-10-25): the midpoint between v0.1 and a relaxed set (ROCE 12% in 3 of 5, CAGR 8%, 4 points), chosen by the owner after seeing both: ROCE 12% in 4 of 5 with an 8% floor, gross margin within 3 points, CAGR 10%. Same run: 45 pass, 21 in band. Every report carries a sensitivity table showing all three so the backtest can judge them side by side.

Hand-check of the first priced screen (2026-10-30, prices to 2026-10-29). Market caps: six names checked against stockanalysis.com quote pages by implied share count (quote-page cap ÷ quote-page price vs our cover-page count) — QLYS 34.6M vs 35.7M (cover page is from February; buybacks since), IRMD 12.7M vs 12.8M, XPEL 27.6M vs 27.6M, CVCO 7.70M vs 7.7M, MTDR 124M vs 124M, UI 60.5M vs 60.5M. All within 3%. Russell 2000 gate: our ^RUT closes match Yahoo to the cent (2026-10-22 2784.03, 10-23 2775.90); the 200-day average recomputed independently from the store is 2804.36, as the report says. The gate opened only on 2026-10-27 (2819 vs 2802) after the index spent the previous days below the average, so the quality-and-momentum list is a one-week-old signal and 2% is a thin margin. Liquidity floor: it is live — 1,079 of 3,152 priced names average under $3M/day — but removes none of the 18 in-band passers; the two passers below it (RCMT $2.5M/day, PPIH $1.8M/day) are already below the $300M cap floor, and the report counts them there, which is why its "below the liquidity floor" line reads 0. Thinnest names on the list: XPEL $7.6M/day, IRMD $9.1M/day. Cap-band list vs the 21 names under the float estimate: UI left ($2.3B float → $36.7B; the founder holds most of it), STRL left ($6.8B → $11.5B); nobody joined. Two defects found and fixed in the same PR: (a) 416 of 3,123 companies with facts (13%) have no cover-page share count because dual-class filers tag it per class with a dimension, which the companyfacts API drops, so they were silently still on the 10-K float even though the header said "3,152 companies priced" — 181 of them with a float inside the band. The screen now uses price × the latest fiscal year's diluted weighted-average shares for them, labelled, and falls back to float only when neither count exists. First consequence: WTS was in the band at its $6.7B float and is a $11.8B company (quote page: $11.98B), so it leaves; the quality list is 18 and the quality-and-momentum list 9. RL moves from $11.9B to $25.0B, META from $1.60T to $1.61T, both still out of band. (b) The sensitivity table ran without prices, so its "in cap band" column reported float-based counts (21 for v0.2 while the list above it said 19); it now uses the same prices as the main run.

## Decisions still open

1. Thresholds are v0.2 until the backtest says otherwise.
2. India fundamentals source: Screener.in Premium (₹4,999/yr, manual quarterly CSV) or EODHD (US $599.90/yr, API, NSE depth unverified).
3. Whether to extend the US universe to foreign filers (20-F) later; v0.1 is 10-K filers only.
