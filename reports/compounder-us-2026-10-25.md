# Compounder screen — United States, as of 2026-10-25

Screen v0.1.0 on the EDGAR store of 2026-10-25. **Research aid, not investment advice.** Market cap here is the 10-K public float (no price feed yet); the band is $300M–$10000M.

## Funnel

| step | companies |
|---|---|
| screenable (10-K filers, non-financial) | 3152 |
| with 5+ fiscal years filed by 2026-10-25 | 2776 |
| pass all five traits | 19 |
| …and inside the cap band (the quality list) | 7 |
| four passes, one trait not applicable (near-miss) | 6 |

Failed by trait (a company can fail several): cashConversion 1476, leverage 1036, roce 2124, growth 1857, grossMargin 851.
Not applicable by trait: roce 812, grossMargin 1229, growth 965, cashConversion 386, leverage 400.

## Quality list (7)

| # | ticker | company | industry | ROCE med | GM | 5y rev CAGR | shares 5y | OCF/NI | net debt/EBITDA | cap $M | latest FY |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | QLYS | Qualys, Inc. | Services-Prepackaged Software | 35.4% | 82.8% | 13% | -10.7% | 1.52 | net cash | 3714 | 2025-12-31 |
| 2 | IESC | IES Holdings, Inc. | Electrical Work | 27.5% | 25.5% | 23.1% | -4.3% | 1.06 | net cash | 1378 | 2025-09-30 |
| 3 | XPEL | XPEL, INC. | Coating, Engraving & Allied Services | 31.1% | 42.2% | 24.5% | +0.3% | 1.02 | net cash | 901 | 2025-12-31 |
| 4 | PCTY | Paylocity Holding Corporation | Services-Prepackaged Software | 20.5% | 69.2% | 22.7% | -2.7% | 1.9 | net cash | 6600 | 2026-06-30 |
| 5 | IRMD | IRADIMED CORPORATION | Surgical & Medical Instruments & Apparatus | 24.5% | 76.7% | 21.5% | +3.3% | 1.09 | net cash | 481 | 2025-12-31 |
| 6 | IBP | Installed Building Products, Inc. | General Bldg Contractors - Residential Bldgs | 22.5% | 34% | 12.4% | -8% | 1.37 | 1.26 | 4124 | 2025-12-31 |
| 7 | HWKN | HAWKINS, INC. | Wholesale-Chemicals & Allied Products | 17.6% | 22.6% | 12.7% | -1.9% | 1.72 | 1.38 | 3550 | 2026-03-29 |

## Near-misses: four passes, one trait not applicable (6)

These fail the "all five" rule only because one trait cannot be computed, mostly gross margin for businesses with no cost-of-revenue line. The rule decision is open (SCREEN.md).

| ticker | company | industry | not applicable | why |
|---|---|---|---|---|
| MEDP | Medpace Holdings, Inc. | Services-Commercial Physical & Biological Research | grossMargin | no cost-of-revenue or gross-profit line (service business?) |
| IPAR | INTERPARFUMS, INC. | Perfumes, Cosmetics & Other Toilet Preparations | leverage | debt or cash not tagged |
| SAIA | Saia, Inc. | Trucking (No Local) | grossMargin | no cost-of-revenue or gross-profit line (service business?) |
| BYD | BOYD GAMING CORP | Hotels & Motels | grossMargin | no cost-of-revenue or gross-profit line (service business?) |
| BBW | BUILD-A-BEAR WORKSHOP INC | Retail-Hobby, Toy & Game Shops | roce | ROCE computable in 0/5 years |
| IMAX | IMAX Corporation | Photographic Equipment & Supplies | roce | ROCE computable in 0/5 years |

## Pass all five but outside the cap band (12)

EME ($17258M), RCMT ($99M), ADSK ($64500M), MSFT ($3600000M), ADBE ($144940M), RMD ($34917M), FIX ($18640M), MANH ($11791M), META ($1600000M), ULTA ($16866M), FN ($17100M), PAYC ($11900M)

## Sensitivity of the thresholds

| thresholds | pass all five | in cap band | near-miss |
|---|---|---|---|
| v0.1 as written | 19 | 7 | 6 |
| ROCE ≥ 12% in 3 of 5, floor 8% | 32 | 14 | 7 |
| revenue CAGR ≥ 8% | 44 | 17 | 9 |
| gross margin within 4 pts of high | 24 | 10 | 6 |
| all three relaxations together | 81 | 38 | 11 |

Per-trait pass rates where the trait is computable: roce 9% of 2340; grossMargin 56% of 1923; growth 15% of 2187; cashConversion 47% of 2766; leverage 62% of 2752.

## How to read this

Every number is as first reported in the 10-K that covered that year (point-in-time), not as later restated. ROCE = operating income / (total assets − current liabilities); the rule is 4 of 5 years ≥ 15% and no year under 10%. Gross margin must be within 2 points of its 5-year high. Revenue CAGR ≥ 12% with diluted shares up ≤ 10%. 3-year OCF / net income ≥ 0.8. Net debt / EBITDA ≤ 2 (net cash passes). Rank = sum of the five per-trait ranks, no weights. None of this has been backtested yet; see SCREEN.md for the pass criteria it must meet.
