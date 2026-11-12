# Swing rules on point-in-time NIFTY 500 membership — 12 Nov 2026 (first half of the correction)

Hypothesis written first: `reports/membership-hypotheses-2026-11-12.md`. Every row: ten-year corporate-action-adjusted history, `--members` (each day's analysis and the momentum ranking see only that day's NIFTY 500 members, `data/membership/members.json`, 74 events), rows 1–3 from 2017-06-09 so they share the window on which the momentum ranking exists, as on 12 Nov. Reference rows on today's constituents from `reports/swing-universe-2026-11-12-adjusted.md`. Past members still have no bars, so this removes the future members only; the second half of the correction (the names that fell out) is still to come.

| row | trades | win rate | expectancy | profit factor | total | max DD | on today's names (12 Nov) |
|---|---|---|---|---|---|---|---|
| 1. all setups, whole universe (control) | 841 | 41% | −0.06R | 0.87 | −51.4R | 56.1R | breakeven-ish (−0.01R over 885, from 2017-02) |
| 2. pullbacks only, whole universe | 845 | 40% | −0.03R | 0.94 | −25.4R | 79.1R | +0.02R over 818 |
| **3. pullbacks only, momentum top 30** | **603** | **46%** | **+0.12R** | **1.29** | **71.4R** | **23.1R** | +0.16R over 638, PF 1.39, 21.3R |
| 4. all setups, momentum top 30 | 713 | 45% | +0.07R | 1.16 | 50.3R | 26.1R | +0.10R over 717 |
| 5. pullbacks only, momentum top 50 (robustness) | 696 | 45% | +0.10R | 1.24 | 66.7R | 29.3R | +0.16R |

Row 3 by year (trades, expectancy, total): 2017 36, −0.17R, −6.2R · 2018 52, +0.03R, +1.4R · 2019 59, +0.12R, +7.3R · 2020 73, **+0.44R, +31.9R** · 2021 79, +0.25R, +19.8R · 2022 68, +0.05R, +3.7R · 2023 57, +0.26R, +14.6R · 2024 71, +0.02R, +1.5R · 2025 57, 0.00R, +0.1R · 2026 51, −0.05R, −2.7R. Score bands: 70+ 335 trades +0.11R; 60–69 170 trades +0.18R (again the best band); 50–59 98 trades +0.06R. Exits: 263 time stops, 174 stops, 101 targets, 29 gap-through, 29 breakeven, 7 gap-above. Trades: `reports/swing-membership-pullback-top30-2026-11-12-adjusted-members.json`.

## Reading

The whole-universe rules get worse, as predicted: all setups −0.01R → −0.06R, pullbacks +0.02R → −0.03R. Names that were being traded before they entered the index were, on average, the better trades.

The slice that passed on 12 Nov still clears the bar as written — +0.12R over 603 trades, both above the +0.1R / 300-trade line — and inside the range the hypothesis gave (450–600 trades, +0.08R to +0.14R). But the pre-written disqualifier bites harder than before: 2020 is 31.9R of 71.4R, and without it the row is **+0.075R over 530 trades**, under the bar (on today's names the same cut left it at exactly +0.10R). The top-50 robustness row fell from +0.16R to +0.10R, on the bar, so it did not flip sign but no longer sits comfortably above. Everything that was marginal got more marginal, and the second half of the correction is expected to push the same way.

**Decision, per the rule written in advance.** Not a pass that can be acted on: the slice is at the bar only with 2020 in it, and the names that left the index are not yet in the record. Momentum pullbacks stay **watch-only**; the paper record started on 12 Nov continues; the re-promotion decided on 12 Nov is **deferred to the past-members price load**, which settles it either way. Nothing is tuned.
