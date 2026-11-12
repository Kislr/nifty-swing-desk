# Swing engine — setups inside the momentum list (12 Nov 2026, adjusted history)

Hypothesis written before the run: `reports/swing-hypotheses-2026-11-12.md`. History 2016-11-07 → 2026-11-11, corporate-action-adjusted, today's 501 Nifty 500 constituents (survivorship bias applies, and more so to the momentum list). All rows start on 2017-06-09, the first day the momentum ranking is defined; the controls are run with `--from 2017-06-09`. Rule under test: `--set universe=momentum[:N]` — an act signal becomes an order only if its symbol holds rank ≤ N in the momentum engine's ranking at that day's close. Everything else unchanged (score ≥ 50, 4 slots, one per sector, next-day buy-stop, 2R target, breakeven at +1R, 15-bar time stop, 30 bps). Pass mark: above +0.1R over 300+ trades.

## The six rows

| run | trades | win rate | expectancy | profit factor | total | max DD | avg bars |
|---|---|---|---|---|---|---|---|
| Control — unfiltered, all setups | 858 | 42% | -0.01R | 0.99 | -5.2R | 36.6R | 10.6 |
| Control — unfiltered, pullbacks only | 818 | 42% | 0.02R | 1.03 | 12.6R | 56.6R | 11.0 |
| Momentum top 30, all setups (primary) | 717 | 46% | 0.10R | 1.23 | 70.2R | 21.8R | 10.8 |
| Momentum top 30, pullbacks only | 638 | 46% | 0.16R | 1.39 | 99.9R | 21.3R | 10.6 |
| Momentum top 30, breakouts only | 571 | 45% | 0.08R | 1.17 | 44.8R | 30.1R | 11.5 |
| Momentum top 50, all setups (robustness) | 766 | 46% | 0.12R | 1.29 | 92.0R | 20.8R | 10.9 |

## By setup inside each run

| run | trades | win rate | expectancy | profit factor | total | max DD | avg bars |
|---|---|---|---|---|---|---|---|
| Control — unfiltered, all setups — 52W breakout | 479 | 43% | 0.04R | 1.08 | 17.0R | 16.1R | 10.6 |
| Control — unfiltered, all setups — Pullback buy | 379 | 40% | -0.06R | 0.88 | -22.2R | 33.2R | 10.5 |
| Control — unfiltered, pullbacks only — Pullback buy | 818 | 42% | 0.02R | 1.03 | 12.6R | 56.6R | 11.0 |
| Momentum top 30, all setups (primary) — Pullback buy | 350 | 49% | 0.19R | 1.47 | 65.9R | 10.9R | 10.8 |
| Momentum top 30, all setups (primary) — 52W breakout | 367 | 43% | 0.01R | 1.03 | 4.3R | 20.9R | 10.7 |
| Momentum top 30, pullbacks only — Pullback buy | 638 | 46% | 0.16R | 1.39 | 99.9R | 21.3R | 10.6 |
| Momentum top 30, breakouts only — 52W breakout | 571 | 45% | 0.08R | 1.17 | 44.8R | 30.1R | 11.5 |
| Momentum top 50, all setups (robustness) — Pullback buy | 361 | 47% | 0.16R | 1.39 | 56.1R | 13.6R | 10.6 |
| Momentum top 50, all setups (robustness) — 52W breakout | 405 | 46% | 0.09R | 1.21 | 35.9R | 16.4R | 11.1 |

## By year (expectancy / trades)

| year | Control — unfiltered, all setups | Control — unfiltered, pullbacks only | Momentum top 30, all setups | Momentum top 30, pullbacks only | Momentum top 30, breakouts only | Momentum top 50, all setups |
|---|---|---|---|---|---|---|
| 2017 | -0.14R / 50 | 0.30R / 40 | -0.01R / 37 | 0.07R / 36 | -0.01R / 36 | -0.15R / 45 |
| 2018 | -0.11R / 90 | -0.38R / 96 | -0.08R / 71 | -0.02R / 54 | -0.09R / 52 | -0.09R / 78 |
| 2019 | -0.10R / 84 | -0.14R / 81 | -0.05R / 70 | 0.13R / 62 | -0.00R / 60 | 0.17R / 72 |
| 2020 | 0.06R / 90 | 0.21R / 77 | 0.39R / 82 | 0.60R / 75 | 0.25R / 63 | 0.20R / 84 |
| 2021 | -0.00R / 99 | 0.05R / 97 | 0.16R / 80 | 0.14R / 73 | 0.22R / 68 | 0.23R / 91 |
| 2022 | 0.00R / 96 | -0.08R / 95 | 0.14R / 71 | 0.12R / 70 | -0.04R / 47 | -0.08R / 76 |
| 2023 | 0.19R / 86 | 0.28R / 83 | 0.11R / 78 | 0.32R / 76 | 0.38R / 68 | 0.32R / 83 |
| 2024 | 0.08R / 90 | 0.14R / 90 | -0.08R / 80 | -0.04R / 69 | -0.27R / 56 | 0.00R / 84 |
| 2025 | 0.05R / 90 | 0.08R / 80 | 0.09R / 78 | -0.03R / 65 | -0.02R / 64 | 0.09R / 85 |
| 2026 | -0.18R / 83 | -0.09R / 79 | 0.24R / 70 | 0.14R / 58 | 0.22R / 57 | 0.41R / 68 |

## Score bands, pullbacks inside the top 30

| run | trades | win rate | expectancy | profit factor | total | max DD | avg bars |
|---|---|---|---|---|---|---|---|
| 50-59 | 91 | 52% | 0.24R | 1.64 | 21.9R | 8.2R | 10.5 |
| 60-69 | 202 | 49% | 0.23R | 1.62 | 46.4R | 5.9R | 11.0 |
| 70+ | 345 | 44% | 0.09R | 1.21 | 31.7R | 22.3R | 10.4 |

## Exit reasons, pullbacks inside the top 30

- stop: 189
- target: 114
- time stop: 278
- gap through stop: 20
- breakeven stop: 29
- gap above target: 8

## Reading

- **Pullbacks inside the momentum top 30 pass the pre-registered mark:** +0.16R over 638 trades, profit factor 1.39, 21.3R max drawdown, against +0.02R over 818 for the same rule on the whole universe over the same window (and −0.06R for the pullback slice of the all-setups control). Seven of ten calendar years positive; the three negative ones (2018, 2024, 2025) are small (−0.02R to −0.04R).
- **The caveat the hypothesis asked for:** 2020 contributes 45R of the 100R. Without 2020 the row is +0.10R over 563 trades — exactly the bar, not above it. 2020 was not the only good year (2019, 2021–2023 and 2026 are all above +0.1R), so the result is not one year's, but it is thinner than the headline.
- **Robustness holds:** top 50 sits between the control and top 30 on all setups (+0.12R over 766) and its pullback slice is the same +0.16R. Nothing flips sign.
- **All setups inside the top 30 is +0.10R over 717** — at the bar, not above it — because breakouts inside the list are only +0.08R (571 trades, PF 1.17). The breakout rule does not pass in either universe.
- **The score still does not help:** inside the list the 70+ band is the weakest (+0.09R on 345) and 50–59 the best (+0.24R on 91), as in every previous run.
- **Survivorship:** this filter inherits the momentum engine's bias in full — the top 30 of today's constituents in 2017–2019 is a list that could not have been known then. The membership work (ROADMAP item 5) has to be read before this is traded as orders.

## Decision

Per the hypothesis's decision rule: the swing queue can be re-promoted **for pullbacks inside the momentum top 30 only**, and only after the point-in-time membership results are in. Until then the site keeps watch mode; the next session can add a "momentum pullback" tag to the setups card so those rows can be paper-traded separately from the rest. Breakouts stay watch-only. Not tuned: N = 30 is the momentum engine's own `holdRank` and was fixed before the run.