# Swing engine variants — 2026-11-05, corporate-action-adjusted history

One change at a time against the five-year baseline (`data/history/`, 2022-01-27 → 2026-11-04, 1,237 days, 501 symbols), as ROADMAP items 2 and 3 asked. Pass mark set in advance: expectancy above **+0.1R over 300+ trades**. Each row is a full run of `node scripts/backtest.mjs` with the flags shown; every other parameter at its default (2R target, 4 slots, one per sector, 15-bar time stop unless replaced, 30 bps costs, score ≥ 50).

| variant | flags | trades | win rate | expectancy | profit factor | total | max DD | avg bars | by year (R/trade) |
|---|---|---|---|---|---|---|---|---|---|
| Baseline (as traded; = reports/backtest-2026-11-05-adjusted.md) | — | 433 | 42% | +0.01R | 1.02 | 3.4R | 22.6R | 10.6 | 22: -0.06, 23: +0.19, 24: +0.08, 25: +0.05, 26: -0.25 |
| No sector (+15) / volume (+10) score points | `--set sectorBump=0 --set volumeBump=0` | 436 | 42% | -0.03R | 0.94 | -13.3R | 31.8R | 10.6 | 22: -0.07, 23: +0.00, 24: -0.04, 25: -0.01, 26: -0.04 |
| Exit on close below 10-day average (no time stop) | `--set exit=ma10` | 763 | 32% | -0.08R | 0.79 | -60.3R | 65.0R | 5.9 | 22: -0.18, 23: +0.05, 24: -0.06, 25: -0.13, 26: -0.06 |
| Exit on close below 20-day average (no time stop) | `--set exit=ma20` | 485 | 27% | -0.17R | 0.65 | -83.8R | 84.6R | 9.4 | 22: -0.23, 23: -0.05, 24: -0.15, 25: -0.17, 26: -0.27 |
| Breakouts only | `--setups breakout` | 376 | 43% | +0.04R | 1.09 | 16.8R | 28.9R | 10.9 | 22: -0.05, 23: +0.26, 24: -0.07, 25: -0.02, 26: +0.07 |
| Breakouts only + no score points (combination, for the record) | `--setups breakout --set sectorBump=0 --set volumeBump=0` | 372 | 40% | -0.05R | 0.90 | -18.9R | 32.4R | 10.9 | 22: -0.14, 23: +0.04, 24: -0.06, 25: -0.18, 26: +0.06 |
| Breakouts only + 10-day exit (combination, for the record) | `--setups breakout --set exit=ma10` | 588 | 33% | -0.10R | 0.75 | -60.5R | 70.9R | 6.7 | 22: -0.35, 23: -0.06, 24: -0.07, 25: -0.05, 26: -0.07 |

## Score bands

| variant | 50–59 | 60–69 | 70+ |
|---|---|---|---|
| Baseline | 8 trades, +0.22R | 31 trades, +0.29R | 394 trades, -0.02R |
| No sector | 11 trades, -0.17R | 50 trades, +0.15R | 375 trades, -0.05R |
| Exit on close below 10-day average | 19 trades, -0.04R | 60 trades, -0.16R | 684 trades, -0.07R |
| Exit on close below 20-day average | 18 trades, +0.02R | 31 trades, -0.05R | 436 trades, -0.19R |
| Breakouts only | 13 trades, -0.19R | 25 trades, +0.07R | 338 trades, +0.05R |
| Breakouts only + no score points | 21 trades, +0.20R | 86 trades, -0.09R | 265 trades, -0.06R |
| Breakouts only + 10-day exit | 14 trades, +0.05R | 44 trades, +0.02R | 530 trades, -0.12R |

## Exit reasons

| variant | exits |
|---|---|
| Baseline | time stop 199 · stop 138 · target 58 · gap through stop 21 · breakeven stop 15 · gap above target 2 |
| No sector | time stop 185 · stop 158 · target 59 · gap through stop 21 · breakeven stop 9 · gap above target 4 |
| Exit on close below 10-day average | close below 10-day average 584 · target 79 · stop 70 · gap through stop 14 · breakeven stop 10 · gap above target 6 |
| Exit on close below 20-day average | close below 20-day average 292 · stop 84 · target 66 · breakeven stop 21 · gap through stop 19 · gap above target 3 |
| Breakouts only | time stop 166 · stop 130 · target 47 · gap through stop 15 · breakeven stop 13 · gap above target 5 |
| Breakouts only + no score points | time stop 151 · stop 142 · target 46 · gap through stop 15 · breakeven stop 13 · gap above target 5 |
| Breakouts only + 10-day exit | close below 10-day average 445 · stop 67 · target 53 · gap through stop 14 · gap above target 6 · breakeven stop 3 |

## Reading

- **Same six tests as reports/swing-variants-2026-11-05.md, re-run after corporate actions were applied to the history (108 bonus / split events on 102 symbols, data/adjustments.json).** The unadjusted baseline was −0.08R over 419 trades; adjusted it is +0.01R over 433, profit factor 1.02, drawdown 22.6R against 38.4R: a coin toss after costs rather than a loser. Phantom stop-outs on bonus ex-dates were a real part of the old verdict.
- **Still nothing passes the bar set in advance (+0.1R over 300+ trades).** Breakouts only is the best at +0.04R, profit factor 1.09, 376 trades — and it still owes everything to 2023 (+0.26R) with 2022, 2024 and 2025 negative. Dropping the score points, the moving-average exits and the combinations are all negative, as before.
- **The watch-only decision stands.** It was taken on the rule, and the rule is unchanged; the corrected numbers soften the write-up (breakeven, not losing) without changing the answer. Re-promotion still needs a backtest above +0.1R over 300+ trades.

Reproduce: `node scripts/backtest.mjs <flags>` with data/adjustments.json present (the script says `corporate actions applied: 108 events across 102 symbols`). Output files carry an `-adjusted` suffix.
