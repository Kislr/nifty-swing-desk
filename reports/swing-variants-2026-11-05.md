# Swing engine variants — 2026-11-05

One change at a time against the five-year baseline (`data/history/`, 2022-01-27 → 2026-11-04, 1,237 days, 501 symbols), as ROADMAP items 2 and 3 asked. Pass mark set in advance: expectancy above **+0.1R over 300+ trades**. Each row is a full run of `node scripts/backtest.mjs` with the flags shown; every other parameter at its default (2R target, 4 slots, one per sector, 15-bar time stop unless replaced, 30 bps costs, score ≥ 50).

| variant | flags | trades | win rate | expectancy | profit factor | total | max DD | avg bars | by year (R/trade) |
|---|---|---|---|---|---|---|---|---|---|
| Baseline (as traded; = reports/backtest-2026-11-05.md) | — | 419 | 40% | -0.08R | 0.84 | -34.4R | 38.4R | 11.0 | 22: -0.14, 23: -0.01, 24: -0.16, 25: +0.04, 26: -0.13 |
| No sector (+15) / volume (+10) score points | `--set sectorBump=0 --set volumeBump=0` | 428 | 42% | -0.08R | 0.86 | -32.2R | 37.2R | 10.8 | 22: -0.09, 23: +0.01, 24: -0.13, 25: -0.02, 26: -0.17 |
| Exit on close below 10-day average (no time stop) | `--set exit=ma10` | 766 | 32% | -0.06R | 0.84 | -44.6R | 58.5R | 5.9 | 22: -0.15, 23: +0.14, 24: -0.06, 25: -0.12, 26: -0.08 |
| Exit on close below 20-day average (no time stop) | `--set exit=ma20` | 481 | 30% | -0.11R | 0.76 | -54.6R | 56.8R | 9.5 | 22: -0.28, 23: -0.00, 24: -0.03, 25: -0.11, 26: -0.12 |
| Breakouts only | `--setups breakout` | 383 | 42% | -0.02R | 0.97 | -6.1R | 36.8R | 10.7 | 22: -0.05, 23: +0.18, 24: -0.07, 25: -0.15, 26: -0.04 |
| Breakouts only + no score points (combination, for the record) | `--setups breakout --set sectorBump=0 --set volumeBump=0` | 387 | 42% | -0.09R | 0.83 | -35.4R | 50.6R | 10.5 | 22: -0.21, 23: +0.22, 24: -0.06, 25: -0.29, 26: -0.21 |
| Breakouts only + 10-day exit (combination, for the record) | `--setups breakout --set exit=ma10` | 585 | 32% | -0.11R | 0.73 | -63.0R | 71.8R | 6.7 | 22: -0.35, 23: -0.08, 24: -0.04, 25: -0.08, 26: -0.07 |

## Score bands

| variant | 50–59 | 60–69 | 70+ |
|---|---|---|---|
| Baseline | 10 trades, -0.17R | 25 trades, +0.19R | 384 trades, -0.10R |
| No sector | 16 trades, +0.19R | 57 trades, +0.20R | 355 trades, -0.13R |
| Exit on close below 10-day average | 21 trades, -0.09R | 56 trades, -0.16R | 689 trades, -0.05R |
| Exit on close below 20-day average | 18 trades, -0.39R | 31 trades, -0.03R | 432 trades, -0.11R |
| Breakouts only | 12 trades, -0.55R | 27 trades, -0.00R | 344 trades, +0.00R |
| Breakouts only + no score points | 23 trades, -0.08R | 85 trades, -0.17R | 279 trades, -0.07R |
| Breakouts only + 10-day exit | 14 trades, -0.16R | 46 trades, -0.08R | 525 trades, -0.11R |

## Exit reasons

| variant | exits |
|---|---|
| Baseline | time stop 202 · stop 135 · target 46 · gap through stop 23 · breakeven stop 11 · gap above target 2 |
| No sector | time stop 191 · stop 151 · target 49 · gap through stop 20 · breakeven stop 13 · gap above target 4 |
| Exit on close below 10-day average | close below 10-day average 586 · target 80 · stop 64 · gap through stop 16 · breakeven stop 14 · gap above target 6 |
| Exit on close below 20-day average | close below 20-day average 283 · stop 84 · target 72 · gap through stop 20 · breakeven stop 17 · gap above target 5 |
| Breakouts only | time stop 164 · stop 135 · target 48 · gap through stop 18 · breakeven stop 14 · gap above target 4 |
| Breakouts only + no score points | time stop 163 · stop 144 · target 51 · gap through stop 15 · breakeven stop 12 · gap above target 2 |
| Breakouts only + 10-day exit | close below 10-day average 447 · stop 63 · target 54 · gap through stop 13 · gap above target 4 · breakeven stop 4 |

## Reading

- **Nothing passes.** The best single change, breakouts only, is −0.02R over 383 trades with a profit factor of 0.97: a coin toss after costs. It owes everything to 2023 (+0.18R on 91 trades) and loses in each of the other four years, so it is a rising-market-only effect — the same thing the momentum engine captures, except momentum has a regime gate and a five-year record of +106.9% against the index's +39.7%.
- **The score points were not the problem.** Removing the sector and volume bumps shuffles which trades get taken (428 vs 419) and leaves expectancy unchanged at −0.08R. The 70+ band is still the worst (−0.13R on 355 trades) and 60–69 the best (+0.20R on 57). The score orders candidates for the four slots; it does not create or remove an edge.
- **A moving-average exit is not a fix either.** Exiting on a close below the 10-day average nearly doubles the trade count (766) because slots are recycled every six bars, and improves expectancy only to −0.06R while deepening the drawdown to 58R. The 20-day version is worse than the time stop (−0.11R). Winners do not run far enough for a trailing exit to matter; the problem is the entries, not the exits.
- **Combinations do not help.** Breakouts without the score points: −0.09R. Breakouts with the 10-day exit: −0.11R. Listed for completeness; the pass mark was for single changes and nothing here suggests a combination would clear it.
- **Decision (ROADMAP item 1, README checklist):** the swing signal queue is demoted to watch only. Setups are still computed and shown as levels, without order sizing, so they can be paper-traded and the rules re-tested; the Telegram digest leads with the momentum list. `engine.DEFAULTS.swingMode = 'watch'`; set it back to `'orders'` only when a backtest earns it.
- **Caveats that cut both ways.** Corporate actions are unadjusted in this data (ROADMAP item 4), so some stop-outs are phantom — but so are some gains, and the pattern (negative in four of five years, half of all exits the time stop) is too consistent for that to be the explanation. The universe is today's Nifty 500, which flatters the rules rather than hurting them.

Reproduce: `node scripts/backtest.mjs <flags>` with the flags in the table (the baseline needs none). Each run takes about a minute on five years of history.
