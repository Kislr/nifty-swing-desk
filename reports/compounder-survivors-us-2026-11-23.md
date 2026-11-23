# The survivor count — who was filing 10-Ks and is not in the store (2026-11-23)

EDGAR's full index, 53 quarters (2013 Q4 → 2026 Q4): 14,899 distinct filers of a 10-K. The store (`compounder/data/us/universe.json`, built 2026-10-25) holds 6,041 filers on NYSE or Nasdaq today, 3,152 of them screenable. 44 cohort dates, 2015-01-01 → 2025-10-01; a filer is active on a date when it filed a 10-K in the 456 days before it. 10,355 filers were active on at least one date and are not in the store; 10,355 of them were asked of data.sec.gov for their SIC code and their reported public float.

**A departed filer is not yet a missing company.** EDGAR's 10-K filers include trusts, shells, issuers of public debt with private shares, non-traded REITs and the over-the-counter market. The table counts a departed filer only when it is non-financial and had reported a public float above zero by the cohort date, and buckets it by that float — the proxy the backtest uses for a name with no price. "With a Form 25" is the stricter reading: a class of its securities was at some point removed from a national exchange.

## By size, all cohorts together

| reported float on the date | in the store (screenable) | departed | share departed | departed, with a Form 25 | share |
|---|---|---|---|---|---|
| <$300M | 36,925 | 66,162 | 64.2% | 27,985 | 43.1% |
| $300M–1B | 15,710 | 11,073 | 41.3% | 10,566 | 40.2% |
| $1–2B | 9,954 | 5,508 | 35.6% | 5,254 | 34.5% |
| $2–10B | 20,017 | 7,605 | 27.5% | 7,391 | 27.0% |
| >$10B | 15,965 | 2,796 | 14.9% | 2,582 | 13.9% |
| unknown | 3,057 | 0 | 0.0% | 0 | 0.0% |
| **the screen's band, $300M–$10B** | **45,681** | **24,186** | **34.6%** | **23,211** | **33.7%** |

Figures are company-cohorts: a company active on twenty cohort dates is counted twenty times, on each side. "Share departed" = departed ÷ (departed + in the store). The store's "unknown" row is screenable filers with no float on file by the date; a departed filer with no float is not in the table (next paragraph).

Not in the table, per company-cohort: 70,879 departed financials (SIC 6000–6799, outside the screen), 25,720 departed filers that had reported no public float above zero by the date. All active filers: 324,138; in the store 134,395 (41.5%), of which screenable 101,628.

## By cohort year, inside the band

| year | cohorts | in the store | departed | share departed | with a Form 25 | share |
|---|---|---|---|---|---|---|
| 2015 | 4 | 3,220 | 3,340 | 50.9% | 3,247 | 50.2% |
| 2016 | 4 | 3,372 | 3,223 | 48.9% | 3,128 | 48.1% |
| 2017 | 4 | 3,416 | 2,788 | 44.9% | 2,695 | 44.1% |
| 2018 | 4 | 3,638 | 2,511 | 40.8% | 2,433 | 40.1% |
| 2019 | 4 | 3,873 | 2,391 | 38.2% | 2,310 | 37.4% |
| 2020 | 4 | 3,999 | 2,096 | 34.4% | 2,007 | 33.4% |
| 2021 | 4 | 4,168 | 1,830 | 30.5% | 1,763 | 29.7% |
| 2022 | 4 | 4,887 | 2,108 | 30.1% | 1,994 | 29.0% |
| 2023 | 4 | 5,032 | 1,756 | 25.9% | 1,649 | 24.7% |
| 2024 | 4 | 4,996 | 1,258 | 20.1% | 1,176 | 19.1% |
| 2025 | 4 | 5,080 | 885 | 14.8% | 809 | 13.7% |

The earlier the cohort, the more of its companies have since left: a 2015 cohort has had eleven years to lose them, a 2025 cohort one.

## How to read it

The backtests of 5 Nov 2026 measured a survivor gap of 2.0% of active filers — but only inside the store, among companies that are still there. This is the part that could not be seen from there. The share in the band is the share of each cohort's candidates the two failed backtests never ranked. SCREEN.md's rule of 29 Oct stands: if the gap is large, the floor rises to the lowest bucket where it falls under about 5%, and past about $2B the benchmark changes. What it settles for the reopening is the size of the pull from Sharadar: `compounder/data/us/survivors.json` is the list of CIKs to price.

## What this count cannot say

- **Float is not market cap.** It is the company's own figure for shares held by non-affiliates, as of the end of its second fiscal quarter, printed on a 10-K filed months later. A closely held company is larger than its float.
- **A Form 25 is not always a delisting of the shares** — it is also filed for a bond, a warrant or a preferred series of a company that stays listed. Among filers that are not on NYSE or Nasdaq today it is good evidence, not proof.
- **Over-the-counter companies report a float too.** Without the Form 25 they cannot be told from exchange-listed ones here; that inflates the smallest bucket most and the band least.
- **Foreign private issuers (20-F, 40-F) are not counted**, as they are not in the screen.
- **Why a company left** — taken over at a premium, or bankrupt — is not in the index. That is the delisting-return convention the third hypothesis has to fix before any price is loaded.

