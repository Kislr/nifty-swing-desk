# Swing engine — momentum-conditioned setups, written before the run (12 Nov 2026)

Written and saved before any of the runs below existed. Baseline: ten-year corporate-action-adjusted history, `reports/backtest-2026-11-06-adjusted.md` — all setups 885 trades, −0.01R, profit factor 0.99; pullbacks 401 trades, −0.03R, PF 0.93; breakouts 484 trades, +0.02R, PF 1.04.

Pass mark, unchanged from the README: **expectancy above +0.1R over 300+ trades**, with the usual disqualifiers (one year carrying the result; a robustness row that flips sign). No parameter is tuned after seeing a result; the rows are fixed here.

## Hypothesis — swing setups taken only inside the momentum engine's top 30

**Why.** The swing backtests say the problem is which names are entered, not how they are exited or ranked: the score does not separate winners from losers (the 70+ band is the worst), the sector and volume points add nothing, and the "leading sector" idea is the engine's only selection filter. Cross-sectional momentum is a far better documented selection filter than sector leadership, and it is the one list in this desk with a positive record. The claim is that the pullback and breakout rules work when the candidate is a name the momentum engine already ranks in its top 30, and fail on the rest.

**Rule.** `--set universe=momentum` (default rank 30; `universe=momentum:50` for the robustness row). On each day *i*, the momentum engine ranks the universe as of day *i*'s close (`M.rankAt`, default parameters: 126-bar return skipping the last 21, eligible = turnover ≥ ₹5 cr and within 20% of the 52-week high). An act signal from the swing engine on day *i* becomes an order only if its symbol holds rank ≤ N in that day's ranking. Everything else — score threshold, slots, one-per-sector, fills, stops, targets, time stop, costs — is unchanged. Only data up to day *i* is used.

**Fair comparison.** The momentum ranking needs 147 bars of history, so a filtered run can place no order before bar 148, while the unfiltered baseline starts at bar 60. The unfiltered run is therefore repeated from the first date the ranking is defined (`--from` that date) and the filtered runs are judged against that same-window figure as well as against the pass mark.

**Rows, fixed in advance.**

1. Unfiltered, all setups, same window (the control).
2. `universe=momentum` (top 30), all setups — the primary row.
3. `universe=momentum`, pullbacks only — the row the hypothesis is named after.
4. `universe=momentum`, breakouts only.
5. `universe=momentum:50`, all setups — robustness: a looser list should sit between rows 1 and 2, not flip sign.

**What is expected.** Far fewer trades (the top 30 is 6% of the universe, and the rule already demands 30-day momentum ≥ 5%): if row 2 has fewer than 300 trades over ten years, a pass on expectancy is "promising, not passed" and the README says so. The trade count is the most likely reason this fails to settle anything, which is why row 5 exists.

**What would count against it even with a good average.** Fewer than 300 trades; one year carrying the result; row 5 flipping sign against row 2; row 2 beating row 1 only because the filter happens to keep the engine out of 2018 and 2025 (check the by-year table against the momentum by-year).

**Decision rule.** Pass on row 2 or row 3 → the swing queue is re-promoted *for that universe only* (the site would show setups inside the momentum list as orders, the rest as watch), after the point-in-time membership work has been read, since this filter inherits momentum's survivorship bias in full. Fail → the next hypotheses in order are post-earnings-announcement drift (needs results dates) and short-term reversal in large caps (a separate engine), as listed in the README.
