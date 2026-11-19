# Results dates — built 2026-11-19

Sources: data/results/raw/ (reparsed). 222560 rows read, 0 non-quarterly filings skipped, 102913 duplicates folded, 23576 board-meeting dates dropped as the twin of a filing within 3 days, 0 rows re-keyed through symbolchange.csv.

**96071 events on 2826 symbols**; 76367 (79%) carry a dissemination time, of which 50200 are at or after 15:30; 19704 come from the board-meetings list (no time → treated as after the close). 1939 symbols have no bars in data/history/ (names outside the ever-member universe, or tickers symbolchange.csv does not cover — the backtest ignores them and lists them).

## Coverage by year

| year | events | symbols | with a time | reading |
|---|---|---|---|---|
| 2016 | 2125 | 1423 | 70% | looks complete (≥ 4 per name for 300+ names) |
| 2017 | 11350 | 1753 | 58% | looks complete (≥ 4 per name for 300+ names) |
| 2018 | 13423 | 1809 | 52% | looks complete (≥ 4 per name for 300+ names) |
| 2019 | 9551 | 1806 | 71% | looks complete (≥ 4 per name for 300+ names) |
| 2020 | 8358 | 1800 | 85% | looks complete (≥ 4 per name for 300+ names) |
| 2021 | 7605 | 1866 | 90% | looks complete (≥ 4 per name for 300+ names) |
| 2022 | 7819 | 1938 | 90% | looks complete (≥ 4 per name for 300+ names) |
| 2023 | 8123 | 2030 | 94% | looks complete (≥ 4 per name for 300+ names) |
| 2024 | 8648 | 2154 | 87% | looks complete (≥ 4 per name for 300+ names) |
| 2025 | 9383 | 2299 | 96% | looks complete (≥ 4 per name for 300+ names) |
| 2026 | 9686 | 2461 | 97% | looks complete (≥ 4 per name for 300+ names) |

Last months, events: 2026-04 308 · 2026-05 2072 · 2026-06 43 · 2026-07 719 · 2026-08 1665 · 2026-09 40 · 2026-10 852 · 2026-11 1642. A results month (Jan–Feb, Apr–May, Jul–Aug, Oct–Nov) with a few dozen events means the pull missed a window; a year under about 80% "with a time" means one of the timed lists is missing for it (interim audit A1, A2).

The first year that looks complete is **2016**: the PEAD backtest's window starts there (reports/pead-hypotheses-2026-11-13.md says what a short window means for the verdict).

## How it is used

The PEAD backtest (`node scripts/backtest-pead.mjs`) maps each event to its reaction day — the timestamp's own day if it is a trading day and the time is before 15:30, else the next trading day — and reads the close-to-close return and the volume multiple on that day. Events are keyed by today's ticker; the backtest applies point-in-time NIFTY 500 membership on the reaction day.