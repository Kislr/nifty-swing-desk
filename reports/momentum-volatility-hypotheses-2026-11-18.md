# Risk-adjusted ranking — written before the run (18 Nov 2026)

Written and committed before the option was run on the full membership. One hypothesis, not a sweep. The owner's question of 18 Nov — *the engine wins on 46–47% of its trades; can it be kept among the winners by dropping the more volatile stocks?* — and the owner's instruction the same day to test it next.

## What has already been seen, and why that matters

This is **not a clean test**, and the reading at the end has to carry that.

- **The split of 18 Nov** (`reports/momentum-vol-split-2026-11-18.md`) was made on the same trades this test will largely reproduce: the calmest third of entries won 53% of the time and averaged +2.9% a trade, the most volatile third won 43% and averaged +8.0%; the best tenth of the trades were 138% of the summed returns and only 10 of those 59 came from the calmest third. That split is why this hypothesis exists, so a run on the same ten years is a second look at the data that suggested it.
- **The 24 Oct sweep** (`reports/momentum-sweep-2026-10-24.md`) carried a vol-adjusted row beside every raw one, on two years of today's constituents: at the engine's parameters it read −9.4% a year against +0.5% raw, over 63 trades. Too short and survivor-biased to mean anything, and it points against the idea.
- The option itself, `volAdjust`, has been in `momentum.js` since October and has never been run on the full membership or on ten years.

The clean test is the same rule on data never looked at for this: the US store once it is survivor-complete (the US leg), and the live paper record. This run is the NSE half, for the record.

## The claim

Ranking the universe by **return per unit of volatility** instead of raw return picks steadier risers. Steadier risers hit the 20% trailing stop less often and fall less in the bad years, so the book should win more often, draw down less and have a higher Sharpe. The cost is the right tail: the handful of very large winners that make the engine's whole profit are mostly volatile names, and a risk-adjusted rank will hold fewer of them.

So the question the run answers is not "does the win rate go up" — it very probably does — but **whether what is gained in the losing years pays for what is given up in the winning ones.**

## The rule, fixed

`volAdjust: true`. Score = the 126-bar return (skipping the last 21 bars) ÷ the annualised standard deviation of daily close-to-close returns **over the same 126 bars**. Nothing else changes: top 15, hold to rank 30, 21-bar rebalance, 20% trailing stop, 200-day gate, the ₹5 cr turnover floor, not more than 20% off the high, four per sector, 30 bps round trip, and both paper-book switches on (`refill: 'close'`, `volScale: true`). The volatility window is the return's own window, so no parameter is added and none is tuned. No second variant (smoothness of path, a volatility cap, a different window) is run if this one fails.

## Rows, fixed in advance

All on the full point-in-time membership, ten adjusted years, reinvested, against NSE's total-return indices (`--members --benchmarks --set compound=true`):

1. The baseline — the paper book's rules as they stand — re-run on today's history as a check that nothing moved. On 13 Nov it read **18.7% a year, Sharpe 0.98, 27.3% max drawdown, 609 trades, 46% winners**.
2. The same with `--set volAdjust=true`.
3. Rows 1 and 2 again from six cold starts, 1 January 2018, 2019, 2020, 2021, 2022 and 2023 to the end of the history, each beside NIFTY500 MOMENTUM 50 TR over the same window — the start-date table that undid the refill result on 13 Nov.

Yardsticks over the full window: NIFTY500 MOMENTUM 50 TR 17.3% a year / Sharpe 0.88 / 38.1% drawdown; NIFTY200 MOMENTUM 30 TR 15.2% / 0.82 / 34.0%; NIFTY 50 TR 12.3% / 0.79 / 38.3%.

## Pass mark

The mark of 12 Nov, unchanged, plus the two readings 13 Nov showed are needed. **All four, on row 2:**

1. **19.3% a year or better** on the full window — the momentum index fund plus two points;
2. **Sharpe above 0.98** — above the rules it would replace, not merely above the fund's 0.88;
3. **ahead of NIFTY500 MOMENTUM 50 TR in at least four of the six cold starts**, on CAGR over the same window;
4. **no single calendar year supplying more than 40% of the log return.**

A row that misses the mark but moves the way the claim says is recorded as a measurement and changes nothing.

## What is expected numerically

- Win rate **up**: 46% → 48–53%.
- Stop-outs **down**, average holding period up.
- Max drawdown **a little lower**: 27.3% → 22–27%.
- CAGR **lower**: 18.7% → 13–17%. The split says the calm names earn about a third as much per trade; a rank is gentler than a cut, so the loss should be smaller than that, but it should be a loss.
- Sharpe **about the same**: 0.90–1.05.
- Better than the baseline in 2018, 2022 and 2025; worse in 2019, 2020, 2021 and 2023.

**It is not expected to pass.** The honest prior is that this trades return for comfort, as `volScale` did and as the compounder's profitability screen did, and that the investable version of "momentum, but calmer" already exists as an index. If row 2 does pass, it is read with suspicion first: the by-year table before the headline, and the reminder at the top of this file that the idea came from these same trades.

## What would count against a reading even if a number passes

- A pass carried by one year, or by 2017–2021 only (condition 3 exists for this).
- A higher win rate presented as the result. It is the mechanism, not the pay-off.
- Comparing row 2 with the 13 Nov figures instead of with row 1 on the same history, if row 1 has moved.

## Decision rule

**Pass (all four):** nothing is switched on for money and the first paper book is not touched — its record since 13 Nov has to stay one continuous series. A second paper book with `volAdjust: true` is started beside it from the day of the pass, and the rule goes to the US store as the first thing run there. The NSE result alone promotes nothing, because it is a second look.

**Fail (any of the four):** the option stays in the code, off, reproducible with `--set volAdjust=true`. The result goes into the README and ROADMAP. Whether the rule is still worth running on the US store is decided from *how* it failed: if it bought drawdown with return as expected, it joins the "loses less" family that the compounder's third hypothesis has to be written for, and is tested there with a test that fits that claim; if it was simply worse on every count, it is closed here.

Either way: no further volatility variant on this history.
