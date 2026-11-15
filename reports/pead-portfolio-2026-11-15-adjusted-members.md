# PEAD as a portfolio — 2026-11-15-adjusted-members

History 2016-11-07 → 2026-11-13 (2475 days, 895 symbols, corporate actions applied). Events `data/results/events.json` built 2026-11-13. Trades: the 13 Nov study's primary row re-run on this history — 1860 trades, +0.151R, verdict fail (one year supplies 41% of total R (cap 40%)); 1760 of them enter inside the measured window 2017-06-12 → 2026-11-11 (the NIFTY 50 TR series' coverage, so book and index are measured over the same days). Book: ₹5,00,000, reinvested, slot = equity ÷ K at R's close, entries at R+1's open in descending reaction-return order, integer quantities, idle cash earns nothing. Universe: that day's NIFTY 500 members. Hypothesis, pass mark and decision rule were written before the run: `reports/pead-portfolio-hypotheses-2026-11-15.md`. **This is a second look at the data that produced the 13 Nov finding; a pass here starts a paper book, not trading.**

## Verdict: **FAIL** — CAGR 6.3% against NIFTY 50 TR 12.3% — needs +2.0% over it (14.3%); Sharpe 0.76 not above the index's 0.79; 2020 supplies 49% of the total log return (cap 40%)

Per the decision rule: PEAD is closed at every level — setup and portfolio. The finding stays on record as a real, thin drift that neither four slots nor a book turns into a return over the index. The swing queue is empty.

## Rows

Window 2017-06-13 → 2026-11-11 (2324 trading days, from the first entry inside the window to its last bar). The bar is the NIFTY 50 TR row: CAGR + 2 points, a higher Sharpe, no year over 40% of the log return.

| row | trades taken | skipped (full / cash / price) | final value | total return | CAGR | max DD | Sharpe | avg invested | peak positions | win rate | largest year share of log return |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **primary**: K = 30, the 13 Nov trades, reinvested | 1538 | 210 / 0 / 12 | ₹8,85,258 | 76.7% | 6.3% | 14.5% | 0.76 | 33% | 30 | 47% | 49% (2020) |
| K = 20 | 1168 | 590 / 0 / 2 | ₹10,03,617 | 100.1% | 7.8% | 16.0% | 0.82 | 38% | 20 | 48% | 48% (2020) |
| K = 50 (every signal fits) | 1733 | 0 / 0 / 27 | ₹7,03,332 | 40.5% | 3.7% | 9.0% | 0.68 | 22% | 45 | 47% | 45% (2020) |
| no stop: K = 30, 20th-bar close only (information) | 1300 | 455 / 0 / 5 | ₹11,75,401 | 134.6% | 9.6% | 11.8% | 1.03 | 37% | 30 | 57% | 32% (2020) |
| elastic capital: 1/30 of equity per signal, no cash limit (information) | 1744 | 0 / 0 / 16 | ₹8,65,113 | 72.7% | 6.1% | 15.2% | 0.66 | 37% | 46 (exposure 146%) | 46% | 45% (2020) |
| NIFTY 50 (total return index) | — | — | — | 194.7% | 12.3% | 38.3% | 0.79 | 100% | — | — | — |
| NIFTY200 MOMENTUM 30 (total return index) | — | — | — | 276.3% | 15.3% | 34.0% | 0.83 | 100% | — | — | — |
| NIFTY500 MOMENTUM 50 (total return index) | — | — | — | 343.0% | 17.3% | 38.1% | 0.88 | 100% | — | — | — |

"Avg invested" is the mean share of equity in open positions over the window — the rest is cash earning nothing, which is the whole question for a seasonal signal. "Skipped" counts signals the book could not take: full = K already open, cash = a slot's worth of cash was not there, price = one share cost more than a slot. The elastic row ignores both limits and reports its peak gross exposure; it is what the per-trade edge would be worth with free leverage and is not investable as written. The momentum-index rows are context, not the bar.

## By year

| year | K = 30 (primary) | K = 20 | K = 50 | no stop | elastic | NIFTY 50 TR | N200 Momentum 30 TR | N500 Momentum 50 TR | share of primary log return | trades taken (primary) | avg invested (primary) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2017 (partial) | 3.6% | 3.5% | 1.3% | 6.6% | 2.2% | 10.4% | 22.1% | 26.8% | 6% | 94 | 34% |
| 2018 | -7.7% | -4.2% | -5.5% | -6.1% | -9.1% | 4.6% | -1.7% | -10.7% | -14% | 185 | 36% |
| 2019 | 3.1% | 1.7% | 2.9% | 8.3% | 4.7% | 13.5% | 10.6% | 8.6% | 5% | 181 | 36% |
| 2020 | 32.0% | 39.4% | 16.7% | 31.8% | 28.2% | 16.1% | 20.0% | 21.0% | 49% | 169 | 37% |
| 2021 | 12.2% | 17.4% | 7.8% | 19.0% | 13.7% | 25.6% | 53.8% | 78.9% | 20% | 159 | 31% |
| 2022 | -3.0% | 0.0% | -2.0% | 2.2% | -3.7% | 5.7% | -5.4% | -7.6% | -5% | 152 | 29% |
| 2023 | 22.1% | 20.4% | 15.0% | 17.9% | 26.3% | 21.3% | 41.7% | 47.7% | 35% | 158 | 33% |
| 2024 | 2.5% | 4.8% | 1.4% | 10.0% | 2.2% | 10.1% | 21.3% | 27.2% | 4% | 152 | 32% |
| 2025 | 0.7% | -7.3% | 0.5% | 2.6% | 0.3% | 11.9% | -4.6% | -7.6% | 1% | 163 | 31% |
| 2026 | -1.0% | 3.7% | -1.4% | 1.5% | -2.3% | -2.4% | -0.9% | 3.8% | -2% | 125 | 27% |

Calendar years inside the window; a partial first year is shown and not scored. "Share of log return" is ln(end ÷ start) for the year over ln(final ÷ initial) for the window, the size-neutral form of the 40% cap; it is blank when the book is down over the window.

## Exit reasons (primary, trades taken)

- stop: 595
- time: 897
- stop (gap): 46

## How to read this

The per-trade study already said what each trade did (+1.02% mean return, +0.39% over the index per 20-bar hold). A book adds two things the trade table cannot show: how much of the capital the signals can keep busy (results come in four seasons, so a book of 30 slots is empty between them), and what the equity curve's drawdown and Sharpe look like on total capital with the idle cash counted. A Sharpe above the index's that comes from being mostly in cash is not a risk edge — read the invested column beside it. The K = 20 / K = 50 rows show whether the answer depends on the slot count, and the no-stop row whether it depends on the stop rather than the drift.