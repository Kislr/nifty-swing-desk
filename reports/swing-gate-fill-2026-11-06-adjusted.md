# Swing engine — regime gate and fill test — 2026-11-06, corporate-action-adjusted history

Two hypotheses, written down before the runs in `reports/swing-hypotheses-2026-11-06.md`: (1) take 52-week breakouts only while the Nifty 50 is above its 200-day average; (2) enter at the signal day's close instead of a buy-stop the next day. History `data/history/`, 2022-01-27 → 2026-11-05, 1,238 days, 501 symbols, corporate actions applied. Pass mark unchanged: expectancy above **+0.1R over 300+ trades**. Every other parameter at its default (2R target, 4 slots, one per sector, 15-bar time stop, 30 bps costs, score ≥ 50).

**Verdict: both fail. Nothing reaches +0.1R; watch-only stands; the 14:45 run is not built.**

| variant | flags | trades | win rate | expectancy | profit factor | total | max DD | by year (R/trade) |
|---|---|---|---|---|---|---|---|---|
| Baseline, all setups (reproduces backtest-2026-11-05-adjusted, one more day) | — | 434 | 42% | +0.01R | 1.02 | +4.6R | 22.6R | 22: -0.06, 23: +0.19, 24: +0.08, 25: +0.05, 26: -0.23 |
| Breakouts only | `--setups breakout` | 377 | 43% | +0.05R | 1.10 | +18.0R | 28.9R | 22: -0.05, 23: +0.26, 24: -0.07, 25: -0.02, 26: +0.09 |
| Breakouts only, same window as the gate | `--setups breakout --from 2022-08-19` | 350 | 43% | +0.05R | 1.10 | +16.8R | 28.9R | 22: -0.14, 23: +0.26, 24: -0.07, 25: -0.02, 26: +0.09 |
| **H1: breakouts + gate 200** | `--setups breakout --set gate=200` | 288 | 42% | **-0.01R** | 0.97 | -4.0R | 20.4R | 22: -0.21, 23: +0.17, 24: -0.11, 25: +0.06, 26: -0.32 |
| H1 robustness: gate 160 | `--setups breakout --set gate=160` | 288 | 48% | +0.06R | 1.13 | +17.0R | 21.2R | 22: +0.03, 23: +0.37, 24: -0.06, 25: +0.04, 26: -0.37 |
| H1 robustness: gate 240 | `--setups breakout --set gate=240` | 275 | 45% | +0.05R | 1.12 | +14.6R | 19.0R | 22: -0.34, 23: +0.28, 24: -0.03, 25: +0.08, 26: +0.02 |
| **H2 primary: breakouts, close fill** | `--setups breakout --set fill=close` | 361 | 42% | **-0.02R** | 0.96 | -7.0R | 27.9R | 22: -0.27, 23: +0.08, 24: +0.01, 25: -0.02, 26: -0.00 |
| H2 secondary: all setups, close fill | `--set fill=close` | 446 | 40% | +0.03R | 1.07 | +14.9R | 16.5R | 22: -0.08, 23: +0.01, 24: +0.21, 25: +0.10, 26: -0.10 |
| Combination, for the record: breakouts + gate 200 + close fill | `--setups breakout --set gate=200 --set fill=close` | 264 | 42% | -0.02R | 0.96 | -4.7R | 14.5R | 22: -0.19, 23: -0.06, 24: +0.10, 25: +0.07, 26: -0.32 |

## Reading

- **Every row is zero within noise.** The standard error of the average is about 0.06R at these trade counts (per-trade spread ≈ 1.1–1.3R), so −0.02R, +0.01R and +0.06R cannot be told apart, and none is near +0.1R.
- **H1 fails on its premise, not only on the count.** Splitting the ungated same-window breakouts by the gate on their signal day: gate open 270 trades at +0.054R, gate closed 80 trades at +0.028R. The gate does not separate good breakouts from bad ones; it only removes trades, which takes every gated row below the 300-trade minimum (288 / 288 / 275). Gate 200 at −0.01R against gate 160 and 240 at about +0.05R is the size of swing that slot order alone produces, which is the noise point again.
- **"Every positive swing year was a rising one" does not carry over to breakouts.** In 2026 the Nifty was below its 200-day average on 170 of 208 days, and ungated breakouts made +0.09R on 69 trades that year; gated, 22 trades at −0.32R.
- **H2 fails its decision rule.** For breakouts the close fill is worse overall (−0.02R against +0.05R; +0.02R against +0.05R on the common window) and clearly better in only one of five years (2024; 2025 is identical, and 2022 is better only on the common window, on 28 trades). The next-day buy-stop skips signals that do not follow through, and that filter is worth more than the better price. With all setups the close fill is +0.03R against +0.01R, a difference well inside noise, and for pullbacks it is a different rule (no reclaim of the day's high). The close fill is also the optimistic version of a 14:45 entry, so a real one would do no better.
- **Lower drawdown is the one consistent effect** (20R gated against 29R ungated; 16.5R all-setups close fill against 22.6R), from fewer or earlier-stopped trades — not a reason to trade a zero-expectancy rule.

## Checks made

- Default run of the changed script is trade-for-trade identical to the unchanged script (434 trades).
- Every gated trade's signal day re-checked with an independently written index average: 0 violations.
- Every close-fill entry equals that day's close; every next-day fill lies inside that day's range.
- `node scripts/test.mjs` passes.

## Side finding, fixed in the same change — the live momentum gate was reading breadth, not the index

Five index days (16, 19, 21, 22, 23 Oct 2026) had been blanked after the NIFTY 500 mix-up, and `gateAt` needs 200 unbroken closes, so from 26 Oct the momentum gate came from the breadth fallback (share of stocks above their own 200-day average). On 5 Nov the two disagreed: the fallback said closed (breadth 46%; it opens above 50%) while the index had closed above its average for the first time.

The five NIFTY 50 bars were taken from NSE's index history (the endpoint `scripts/backfill.mjs` uses), checked against the four neighbouring days already in the file (14, 15, 26, 27 Oct — identical) and against the 26 Oct snapshot's change (22,753.2 − 153.2 = 22,600.0, the 23 Oct close), and written into `data/history/2026.json`:

| date | open | high | low | close |
|---|---|---|---|---|
| 2026-10-16 | 23,065.10 | 23,149.85 | 22,913.80 | 23,146.15 |
| 2026-10-19 | 23,150.85 | 23,175.25 | 22,845.00 | 22,888.95 |
| 2026-10-21 | 23,016.00 | 23,120.90 | 22,649.90 | 22,811.35 |
| 2026-10-22 | 22,687.75 | 22,785.00 | 22,554.85 | 22,687.65 |
| 2026-10-23 | 22,742.20 | 22,787.25 | 22,372.00 | 22,600.00 |

With them in place the gate reads from the index on every day: closed through 4 Nov (23,960.6 against a 200-day average of 24,008.7), **open on 5 Nov (24,536.6 against 24,002.4)**. All nine swing runs above were repeated after the fill and are trade-for-trade unchanged; the momentum backtest is unchanged too (233 trades, +138.8%, 22.1% CAGR, 20.0% max drawdown).

Found on the way and fixed in the same change: `scripts/backtest-momentum.mjs` and `scripts/backtest-pairs.mjs` both stopped with `OUT is not defined` when writing their reports — `const OUT = …` sat behind a `//` comment on the same line (momentum line 41, pairs line 35). A line break in each fixes it, and `scripts/test.mjs` now runs both end to end.

Reproduce: `node scripts/backtest.mjs <flags>` with data/adjustments.json present.
