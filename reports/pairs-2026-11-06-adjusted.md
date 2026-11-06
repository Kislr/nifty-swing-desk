# Pairs backtest — 2026-11-06-adjusted

History 2016-11-07 → 2026-11-05 (2470 days). 33 curated pairs; on the last bar 3 pass the cointegration test at the 10% level with a usable half-life. Parameters: {"window":120,"zWindow":30,"entryZ":2,"exitZ":0.5,"stopZ":3,"maxHold":30,"maxHalfLife":40,"minHalfLife":2,"costBps":30,"pLevel":10}.

## Overall

| run | mode | trades | win rate | avg / trade | total | avg bars | max DD (sum of %) | converged / time / stop |
|---|---|---|---|---|---|---|---|---|
| defaults | pair (long cheap / short rich) | 553 | 41% | -0.17% | -93.4% | 6 | 140.6 | 205 / 8 / 340 |
| defaults | long-only (buy the cheap leg) | 553 | 46% | 0.36% | 200.0% | 6 | 158.7 | 205 / 8 / 340 |

## By pair (pair mode)

| pair | trades | win rate | avg / trade | total |
|---|---|---|---|---|
| APOLLOHOSP/MAXHEALTH | 18 | 67% | 3.00% | 54.0% |
| BPCL/HINDPETRO | 23 | 48% | 0.46% | 10.7% |
| INFY/WIPRO | 18 | 39% | 0.51% | 9.2% |
| ONGC/OIL | 26 | 42% | 0.29% | 7.4% |
| ULTRACEMCO/SHREECEM | 16 | 56% | 0.45% | 7.2% |
| BHARTIARTL/IDEA | 19 | 47% | 0.35% | 6.7% |
| TATASTEEL/JSWSTEEL | 12 | 42% | 0.54% | 6.5% |
| NTPC/POWERGRID | 18 | 44% | 0.33% | 5.9% |
| HCLTECH/TECHM | 19 | 42% | 0.31% | 5.9% |
| COALINDIA/NMDC | 14 | 43% | 0.41% | 5.8% |
| ADANIPORTS/GMRAIRPORT | 1 | 100% | 5.38% | 5.4% |
| LT/SIEMENS | 14 | 50% | 0.36% | 5.0% |
| KOTAKBANK/AXISBANK | 12 | 42% | 0.09% | 1.0% |
| SUNPHARMA/DRREDDY | 15 | 47% | 0.00% | 0.0% |
| ICICIGI/ICICIPRULI | 3 | 33% | -0.32% | -1.0% |
| SBIN/BANKBARODA | 13 | 31% | -0.16% | -2.1% |
| TITAN/KALYANKJIL | 2 | 0% | -1.81% | -3.6% |
| BAJFINANCE/BAJAJFINSV | 12 | 42% | -0.33% | -3.9% |
| CIPLA/LUPIN | 22 | 41% | -0.21% | -4.6% |
| IOC/BPCL | 32 | 50% | -0.15% | -4.7% |
| ASIANPAINT/BERGEPAINT | 26 | 46% | -0.20% | -5.2% |
| MARUTI/M&M | 19 | 42% | -0.29% | -5.5% |
| HINDUNILVR/NESTLEIND | 13 | 31% | -0.53% | -7.0% |
| PIDILITIND/ASIANPAINT | 20 | 30% | -0.60% | -12.1% |
| TCS/INFY | 12 | 33% | -1.03% | -12.4% |
| HINDALCO/VEDL | 25 | 32% | -0.51% | -12.7% |
| AMBUJACEM/ACC | 22 | 50% | -0.61% | -13.4% |
| HDFCBANK/ICICIBANK | 25 | 48% | -0.54% | -13.4% |
| BRITANNIA/DABUR | 17 | 35% | -0.90% | -15.4% |
| HDFCLIFE/SBILIFE | 23 | 30% | -0.74% | -17.1% |
| TVSMOTOR/EICHERMOT | 18 | 33% | -1.11% | -19.9% |
| BAJAJ-AUTO/HEROMOTOCO | 10 | 10% | -2.61% | -26.1% |
| DMART/TRENT | 14 | 14% | -3.17% | -44.3% |

## Relationships on the last bar

| pair | business | EG t-stat | level | half-life (bars) | z today | status |
|---|---|---|---|---|---|---|
| INFY / WIPRO | IT large | -3.73 | 5% | 3 | -0.96 | in line |
| HCLTECH / TECHM | IT mid | -3.75 | 5% | 3 | -0.90 | in line |
| APOLLOHOSP / MAXHEALTH | Hospitals | -3.10 | 10% | 6 | 0.41 | in line |
| BAJFINANCE / BAJAJFINSV | Bajaj twins | -2.09 | — | 8 | 3.14 | no stable relationship |
| ULTRACEMCO / SHREECEM | Cement | -1.70 | — | 8 | 3.08 | no stable relationship |
| HDFCBANK / ICICIBANK | Private banks | -1.60 | — | 16 | 2.77 | no stable relationship |
| SBIN / BANKBARODA | PSU banks | -1.84 | — | 15 | 2.52 | no stable relationship |
| LT / SIEMENS | Capital goods | -1.61 | — | 14 | 2.42 | no stable relationship |
| SUNPHARMA / DRREDDY | Pharma | -1.87 | — | 13 | 2.16 | no stable relationship |
| IOC / BPCL | Oil marketing | -1.86 | — | 12 | 2.14 | no stable relationship |
| BHARTIARTL / IDEA | Telecom | -1.98 | — | 8 | 2.11 | no stable relationship |
| COALINDIA / NMDC | Mining PSUs | -2.08 | — | 10 | -2.08 | no stable relationship |
| BRITANNIA / DABUR | FMCG | -1.87 | — | 13 | 2.05 | no stable relationship |
| CIPLA / LUPIN | Pharma | -2.61 | — | 6 | 2.04 | no stable relationship |
| KOTAKBANK / AXISBANK | Private banks | -0.91 | — | 25 | 1.79 | no stable relationship |
| HINDUNILVR / NESTLEIND | FMCG | -2.37 | — | 9 | 1.74 | no stable relationship |
| TITAN / KALYANKJIL | Jewellery | -1.98 | — | 11 | 1.70 | no stable relationship |
| BPCL / HINDPETRO | Oil marketing | -2.48 | — | 8 | 1.69 | no stable relationship |
| ADANIPORTS / GMRAIRPORT | Infrastructure | -2.42 | — | 6 | 1.68 | no stable relationship |
| ONGC / OIL | Upstream oil | -2.58 | — | 19 | 1.65 | no stable relationship |
| TATASTEEL / JSWSTEEL | Steel | -2.03 | — | 18 | -1.22 | no stable relationship |
| BAJAJ-AUTO / HEROMOTOCO | Two-wheelers | -2.07 | — | 9 | -1.13 | no stable relationship |
| AMBUJACEM / ACC | Adani cement | -8.38 | 1% | 1 | 0.94 | half-life too short |
| NTPC / POWERGRID | Power PSUs | -3.01 | — | 5 | -0.81 | no stable relationship |
| PIDILITIND / ASIANPAINT | Building chemicals | -2.09 | — | 12 | 0.72 | no stable relationship |
| TCS / INFY | IT large | -1.74 | — | 12 | 0.68 | no stable relationship |
| MARUTI / M&M | Cars | -1.71 | — | 14 | 0.43 | no stable relationship |
| DMART / TRENT | Retail | -1.18 | — | 30 | -0.42 | no stable relationship |
| ASIANPAINT / BERGEPAINT | Paints | -2.93 | — | 5 | 0.40 | no stable relationship |
| HINDALCO / VEDL | Non-ferrous | -2.28 | — | 8 | -0.29 | no stable relationship |
| HDFCLIFE / SBILIFE | Life insurance | -2.27 | — | 10 | -0.08 | no stable relationship |
| TVSMOTOR / EICHERMOT | Premium two-wheelers | -0.98 | — | 34 | 0.02 | no stable relationship |
| ICICIGI / ICICIPRULI | ICICI insurers | — | — | — | 0.00 | no history |

## How to read this

A pair trade earns the closing of the gap and nothing else, so the number that matters is the average per trade after costs; with ~30 bps per leg the gap has to be worth more than ~0.6% just to break even in pair mode. "Stop (relationship broke)" exits are the tell: when they dominate, stretches are continuing rather than closing, and the cointegration test is finding in-sample artifacts. Long-only results include whatever the market did during the hold and are not comparable with pair mode.

Known simplifications: fills at the signal close; no borrow cost or margin on the short leg; the curated list is today's — pairs that stopped being pairs (mergers, delistings) are missing; corporate actions are not adjusted, so a bonus issue in one leg looks like a broken relationship.