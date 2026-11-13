# Results dates — built 2026-11-13

Sources: data/results/raw/ (reparsed). 191990 rows read, 0 non-quarterly filings skipped, 76411 duplicates folded, 22473 board-meeting dates dropped as the twin of a filing within 3 days, 0 rows re-keyed through symbolchange.csv.

**93106 events on 2753 symbols**; 60188 (65%) carry a dissemination time, of which 36067 are at or after 15:30; 32918 come from the board-meetings list (no time → treated as after the close). 1866 symbols have no bars in data/history/ (names outside the ever-member universe, or tickers symbolchange.csv does not cover — the backtest ignores them and lists them).

## Coverage by year

| year | events | symbols | reading |
|---|---|---|---|
| 2016 | 2125 | 1423 | looks complete (≥ 4 per name for 300+ names) |
| 2017 | 11350 | 1753 | looks complete (≥ 4 per name for 300+ names) |
| 2018 | 13423 | 1809 | looks complete (≥ 4 per name for 300+ names) |
| 2019 | 9551 | 1806 | looks complete (≥ 4 per name for 300+ names) |
| 2020 | 8358 | 1800 | looks complete (≥ 4 per name for 300+ names) |
| 2021 | 7605 | 1866 | looks complete (≥ 4 per name for 300+ names) |
| 2022 | 7819 | 1938 | looks complete (≥ 4 per name for 300+ names) |
| 2023 | 8123 | 2030 | looks complete (≥ 4 per name for 300+ names) |
| 2024 | 8648 | 2154 | looks complete (≥ 4 per name for 300+ names) |
| 2025 | 9027 | 2282 | looks complete (≥ 4 per name for 300+ names) |
| 2026 | 7077 | 2371 | looks complete (≥ 4 per name for 300+ names) |

The first year that looks complete is **2016**: the PEAD backtest's window starts there (reports/pead-hypotheses-2026-11-13.md says what a short window means for the verdict).

## How it is used

The PEAD backtest (`node scripts/backtest-pead.mjs`) maps each event to its reaction day — the timestamp's own day if it is a trading day and the time is before 15:30, else the next trading day — and reads the close-to-close return and the volume multiple on that day. Events are keyed by today's ticker; the backtest applies point-in-time NIFTY 500 membership on the reaction day.