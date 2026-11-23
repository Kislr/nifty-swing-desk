# PEAD as a portfolio — 2026-11-23-adjusted-members

History 2016-11-07 → 2026-11-20 (2490 days, 895 symbols, corporate actions applied). Events `data/results/events.json` built 2026-11-19. Trades: the 13 Nov study's primary row re-run on this history — 1928 trades, +0.154R, verdict pass (0.154R over 1928 trades; excess positive in 7 of 10 years; largest year 35% of total R); 1821 of them enter inside the measured window 2017-06-12 → 2026-11-11 (the NIFTY 50 TR series' coverage, so book and index are measured over the same days). Book: ₹5,00,000, reinvested, slot = equity ÷ K at R's close, entries at R+1's open in descending reaction-return order, integer quantities, idle cash earns nothing. Universe: that day's NIFTY 500 members. Hypothesis, pass mark and decision rule were written before the run: `reports/pead-portfolio-hypotheses-2026-11-15.md`. **This is a second look at the data that produced the 13 Nov finding; a pass here starts a paper book, not trading.**

## Verdict: **FAIL** — CAGR 6.7% against NIFTY 50 TR 12.3% — needs +2.0% over it (14.3%); 2020 supplies 48% of the total log return (cap 40%)

Per the decision rule: PEAD is closed at every level — setup and portfolio. The finding stays on record as a real, thin drift that neither four slots nor a book turns into a return over the index. The swing queue is empty.

## Rows

Window 2017-06-13 → 2026-11-11 (2334 trading days, from the first entry inside the window to its last bar). The bar is the NIFTY 50 TR row: CAGR + 2 points, a higher Sharpe, no year over 40% of the log return.

| row | trades taken | skipped (full / cash / price) | final value | total return | CAGR | max DD | Sharpe | avg invested | peak positions | win rate | largest year share of log return |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **primary**: K = 30, the 13 Nov trades, reinvested | 1591 | 217 / 0 / 13 | ₹9,17,363 | 83.1% | 6.7% | 14.2% | 0.80 | 33% | 30 | 47% | 48% (2020) |
| K = 20 | 1204 | 615 / 0 / 2 | ₹10,61,453 | 111.7% | 8.4% | 15.5% | 0.87 | 38% | 20 | 48% | 47% (2020) |
| K = 50 (every signal fits) | 1794 | 0 / 0 / 27 | ₹7,18,441 | 43.5% | 3.9% | 8.9% | 0.73 | 22% | 50 | 47% | 44% (2020) |
| no stop: K = 30, 20th-bar close only (information) | 1340 | 475 / 0 / 6 | ₹11,87,576 | 137.1% | 9.7% | 12.1% | 1.04 | 37% | 30 | 57% | 30% (2020) |
| elastic capital: 1/30 of equity per signal, no cash limit (information) | 1805 | 0 / 0 / 16 | ₹9,00,604 | 79.8% | 6.5% | 15.0% | 0.72 | 37% | 50 (exposure 163%) | 47% | 43% (2020) |
| NIFTY 50 (total return index) | — | — | — | 194.7% | 12.3% | 38.3% | 0.79 | 100% | — | — | — |
| NIFTY200 MOMENTUM 30 (total return index) | — | — | — | 276.3% | 15.3% | 34.0% | 0.83 | 100% | — | — | — |
| NIFTY500 MOMENTUM 50 (total return index) | — | — | — | 343.0% | 17.3% | 38.1% | 0.88 | 100% | — | — | — |

"Avg invested" is the mean share of equity in open positions over the window — the rest is cash earning nothing, which is the whole question for a seasonal signal. "Skipped" counts signals the book could not take: full = K already open, cash = a slot's worth of cash was not there, price = one share cost more than a slot. The elastic row ignores both limits and reports its peak gross exposure; it is what the per-trade edge would be worth with free leverage and is not investable as written. The momentum-index rows are context, not the bar.

## By year

| year | K = 30 (primary) | K = 20 | K = 50 | no stop | elastic | NIFTY 50 TR | N200 Momentum 30 TR | N500 Momentum 50 TR | share of primary log return | trades taken (primary) | avg invested (primary) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2017 (partial) | 3.6% | 3.5% | 1.3% | 6.6% | 2.2% | 10.4% | 22.1% | 26.8% | 6% | 94 | 34% |
| 2018 | -7.8% | -4.5% | -5.6% | -6.8% | -9.3% | 4.6% | -1.7% | -10.7% | -13% | 186 | 36% |
| 2019 | 3.3% | 2.8% | 3.0% | 8.3% | 4.9% | 13.5% | 10.6% | 8.6% | 5% | 181 | 36% |
| 2020 | 33.6% | 42.0% | 17.0% | 29.1% | 28.7% | 16.1% | 20.0% | 21.0% | 48% | 168 | 37% |
| 2021 | 14.5% | 20.1% | 9.2% | 19.7% | 16.2% | 25.6% | 53.8% | 78.9% | 22% | 161 | 32% |
| 2022 | -2.9% | 0.3% | -1.9% | 2.5% | -3.5% | 5.7% | -5.4% | -7.6% | -5% | 152 | 28% |
| 2023 | 21.1% | 20.0% | 13.3% | 17.8% | 23.6% | 21.3% | 41.7% | 47.7% | 32% | 158 | 33% |
| 2024 | 2.8% | 4.7% | 2.3% | 11.2% | 3.7% | 10.1% | 21.3% | 27.2% | 4% | 158 | 31% |
| 2025 | -1.9% | -8.9% | -1.3% | 1.2% | -2.9% | 11.9% | -4.6% | -7.6% | -3% | 171 | 32% |
| 2026 | 2.4% | 6.4% | 1.7% | 4.9% | 2.9% | -2.4% | -0.9% | 3.8% | 4% | 162 | 33% |

Calendar years inside the window; a partial first year is shown and not scored. "Share of log return" is ln(end ÷ start) for the year over ln(final ÷ initial) for the window, the size-neutral form of the 40% cap; it is blank when the book is down over the window.

## Exit reasons (primary, trades taken)

- stop: 611
- time: 915
- stop (gap): 44
- end of data: 21

## How to read this

The per-trade study already said what each trade did (+1.04% mean return, +0.17% over the index per 20-bar hold). A book adds two things the trade table cannot show: how much of the capital the signals can keep busy (results come in four seasons, so a book of 30 slots is empty between them), and what the equity curve's drawdown and Sharpe look like on total capital with the idle cash counted. A Sharpe above the index's that comes from being mostly in cash is not a risk edge — read the invested column beside it. The K = 20 / K = 50 rows show whether the answer depends on the slot count, and the no-stop row whether it depends on the stop rather than the drift.