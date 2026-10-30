/* Self-test for the compounder's EDGAR extractor: node scripts/test-compounder.mjs */
import { extractFacts, FIELDS } from './compounder-fetch-us.mjs';
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL:', m); } else console.log('ok  ', m); };

// A synthetic companyfacts document shaped like data.sec.gov's. FY2022 revenue is reported first in the FY2022 10-K (filed 2023-02-15)
// and restated a year later in the FY2023 10-K. There is also a quarterly value and an 8-K value that must be ignored.
const f = (val, start, end, filed, form, fy, fp, accn) => ({ val, start, end, filed, form, fy, fp, accn: accn || `acc-${filed}` });
const doc = { cik: 1, entityName: 'Synthetic Compounder Inc', facts: {
  'us-gaap': {
    Revenues: { units: { USD: [
      f(1000, '2021-01-01', '2021-12-31', '2022-02-20', '10-K', 2021, 'FY'),
      f(1200, '2022-01-01', '2022-12-31', '2023-02-15', '10-K', 2022, 'FY', 'acc-orig'),
      f(1250, '2022-01-01', '2022-12-31', '2024-02-14', '10-K', 2023, 'FY', 'acc-restated'),   // restated comparative
      f(1500, '2023-01-01', '2023-12-31', '2024-02-14', '10-K', 2023, 'FY', 'a'),
      f(400,  '2023-01-01', '2023-03-31', '2023-05-01', '10-Q', 2023, 'Q1'),                 // quarterly: ignore
      f(9999, '2023-01-01', '2023-12-31', '2024-01-30', '8-K', 2023, 'FY'),                  // 8-K earnings release: ignore
    ] } },
    CostOfRevenue: { units: { USD: [ f(600, '2023-01-01', '2023-12-31', '2024-02-14', '10-K', 2023, 'FY') ] } },
    CostOfGoodsAndServicesSold: { units: { USD: [ f(500, '2022-01-01', '2022-12-31', '2023-02-15', '10-K', 2022, 'FY') ] } },
    Assets: { units: { USD: [ { val: 5000, end: '2023-12-31', filed: '2024-02-14', form: '10-K', fy: 2023, fp: 'FY', accn: 'a' }, { val: 4000, end: '2022-12-31', filed: '2023-02-15', form: '10-K', fy: 2022, fp: 'FY', accn: 'b' } ] } },
    LongTermDebtNoncurrent: { units: { USD: [ { val: 700, end: '2023-12-31', filed: '2024-02-14', form: '10-K', fy: 2023, fp: 'FY', accn: 'a' } ] } },
    // a 52-week filer's balance sheet tagged 3 days off its income-statement year end, and a stray 10-K/A balance sheet at a non-year-end date
    LiabilitiesCurrent: { units: { USD: [ { val: 900, end: '2024-01-03', filed: '2024-02-14', form: '10-K', fy: 2023, fp: 'FY', accn: 'a' }, { val: 1, end: '2024-06-30', filed: '2024-08-01', form: '10-K/A', fy: 2024, fp: 'FY', accn: 'z' } ] } },
  },
  dei: {
    EntityCommonStockSharesOutstanding: { units: { shares: [ { val: 100e6, end: '2024-02-01', filed: '2024-02-14', form: '10-K', fy: 2023, fp: 'FY', accn: 'a' } ] } },
    EntityPublicFloat: { units: { USD: [ { val: 2e9, end: '2023-06-30', filed: '2024-02-14', form: '10-K', fy: 2023, fp: 'FY', accn: 'a' } ] } },
  } } };

const fy = extractFacts(doc);
assert(Object.keys(fy).sort().join(',') === '2021-12-31,2022-12-31,2023-12-31', 'three fiscal-year ends, dei cover dates folded in');
assert(fy['2022-12-31'].rev.v === 1200 && fy['2022-12-31'].rev.filed === '2023-02-15', 'point-in-time: earliest filed value wins');
assert(fy['2022-12-31'].rev.r && fy['2022-12-31'].rev.r.v === 1250 && fy['2022-12-31'].rev.r.filed === '2024-02-14', 'restatement kept separately');
assert(!fy['2023-12-31'].rev.r, 'no restatement recorded when values agree');
assert(fy['2023-12-31'].rev.v === 1500, '10-Q and 8-K values ignored');
assert(fy['2023-12-31'].cogs.v === 600 && fy['2023-12-31'].cogs.tag === 'CostOfRevenue', 'higher-priority tag used when present');
assert(fy['2022-12-31'].cogs.v === 500 && fy['2022-12-31'].cogs.tag === 'CostOfGoodsAndServicesSold', 'lower-priority tag fills years the first tag lacks (companies re-tag over time)');
assert(fy['2023-12-31'].assets.v === 5000 && fy['2023-12-31'].debtLT.v === 700, 'instant concepts keyed by period end');
assert(fy['2023-12-31'].sharesOut.v === 100e6 && fy['2023-12-31'].sharesOut.asOf === '2024-02-01', 'cover-page share count attached to the fiscal year its 10-K reports');
assert(fy['2023-12-31'].float.v === 2e9 && fy['2023-12-31'].float.asOf === '2023-06-30', 'mid-year public float attached to the fiscal year its 10-K reports');
assert(fy['2023-12-31'].curLiab && fy['2023-12-31'].curLiab.v === 900 && fy['2023-12-31'].curLiab.asOf === '2024-01-03', 'instant dated 3 days off the year end merged into it');
assert(!fy['2024-06-30'] && !fy['2024-01-03'], 'instant-only dates with no duration facts are dropped');
assert(Object.keys(FIELDS).length === 16, '16 fields defined');
// utilities tag revenue under the regulated-revenue concepts
const util = { facts: { 'us-gaap': { RegulatedAndUnregulatedOperatingRevenue: { units: { USD: [ f(13441e6, '2024-01-01', '2024-12-31', '2025-02-20', '10-K', 2024, 'FY') ] } }, NetIncomeLoss: { units: { USD: [ f(1e9, '2024-01-01', '2024-12-31', '2025-02-20', '10-K', 2024, 'FY') ] } } } } };
const ufy = extractFacts(util); assert(ufy['2024-12-31'].rev.v === 13441e6 && ufy['2024-12-31'].rev.tag === 'RegulatedAndUnregulatedOperatingRevenue', 'utility revenue tag picked up');

if (fails) { console.error(`${fails} failing`); process.exit(1); } else console.log('extractor tests passed');

// ---- engine: a synthetic compounder, a diluter, and a service business with no gross margin ----
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../compounder.js');
const screen = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../compounder/screen.json', import.meta.url), 'utf8'));
const yr = (end, filed, o) => [end, Object.fromEntries(Object.entries(Object.assign({ rev: 1000, cogs: 500, ebit: 200, ni: 150, ocf: 180, da: 20, sharesDil: 100e6, assets: 1200, curLiab: 200, cash: 300, debtLT: 100, sharesOut: 100e6, float: 5000e6 }, o)).map(([k, v]) => [k, { v, filed }]))];
const mk = (years) => ({ cik: 1, ticker: 'SYN', name: 'Synthetic', fy: Object.fromEntries(years) });
const good = mk([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => yr(`${y}-12-31`, `${y + 1}-02-15`, { rev: 1000 * Math.pow(1.15, i), cogs: 500 * Math.pow(1.15, i), ebit: 200 * Math.pow(1.15, i), ni: 150 * Math.pow(1.15, i), ocf: 180 * Math.pow(1.15, i), sharesDil: 100e6 * (1 + 0.01 * i) })));
let ev = C.evaluate(good, screen, '2025-06-01');
assert(ev.ok && ev.failed.length === 0, 'synthetic compounder passes all five: ' + JSON.stringify(ev.failed) + JSON.stringify(ev.na));
assert(Math.abs(ev.traits.growth.value - 15) < 0.2 && ev.traits.growth.dilution === 5, '5-year revenue CAGR 15%, shares +5%');
assert(ev.traits.roce.value === 30.4, 'median ROCE 30.4% (EBIT grows, capital employed fixed at 1000)');
ev = C.evaluate(good, screen, '2024-06-01');
assert(ev.years === 5 && ev.latest === '2023-12-31' && ev.traits.growth.pass == null, 'point-in-time: FY2024 10-K (filed 2025-02-15) invisible on 2024-06-01, so only 5 years and no 5-year CAGR');
const diluter = mk([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => yr(`${y}-12-31`, `${y + 1}-02-15`, { rev: 1000 * Math.pow(1.3, i), sharesDil: 100e6 * Math.pow(1.3, i) })));
ev = C.evaluate(diluter, screen, '2025-06-01'); assert(ev.failed.includes('growth') && /share count/.test(ev.traits.growth.why), 'growth bought with shares fails on dilution with the reason attached');
const service = mk([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => { const [e, o] = yr(`${y}-12-31`, `${y + 1}-02-15`, { rev: 1000 * Math.pow(1.15, i), ebit: 200 * Math.pow(1.15, i), ni: 150 * Math.pow(1.15, i), ocf: 180 * Math.pow(1.15, i) }); delete o.cogs; delete o.debtLT; return [e, o]; }));
ev = C.evaluate(service, screen, '2025-06-01'); assert(!ev.ok && ev.nearMiss && ev.na[0] === 'grossMargin' && ev.traits.leverage.pass && /assumed none/.test(ev.traits.leverage.why), 'no cost-of-revenue line → near-miss; no debt tag with a tagged balance sheet → net cash, labelled');
const levered = mk([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => yr(`${y}-12-31`, `${y + 1}-02-15`, { rev: 1000 * Math.pow(1.15, i), debtLT: 900, cash: 50 })));
ev = C.evaluate(levered, screen, '2025-06-01'); assert(ev.failed.includes('leverage') && ev.traits.leverage.value === 3.86, 'net debt 850 / EBITDA 220 = 3.86 fails');
const unitFault = mk([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => yr(`${y}-12-31`, `${y + 1}-02-15`, { rev: 1000 * Math.pow(1.15, i), sharesDil: i < 3 ? 100e6 : 100e3 })));
ev = C.evaluate(unitFault, screen, '2025-06-01'); assert(ev.traits.growth.pass == null && /unit change/.test(ev.traits.growth.why), 'a 99.9% share-count drop is treated as a data fault, not a buyback');
const S = C.screenAt({ universe: { companies: [{ cik: 1, ticker: 'SYN', domestic: true, financial: false }, { cik: 2, ticker: 'BIG', domestic: true, financial: false }, { cik: 3, ticker: 'BNK', domestic: true, financial: true }] }, facts: { 1: good, 2: Object.assign({}, good, { cik: 2 }), 3: Object.assign({}, good, { cik: 3 }) } }, screen, '2025-06-01', 'us', { 2: { price: 500 } });
assert(S.quality.length === 1 && S.quality[0].ticker === 'SYN' && S.quality[0].capSource === 'public float (10-K)', 'screenAt: float proxy keeps SYN in band');
assert(S.universe.find(r => r.ticker === 'BIG').inBand === false && S.universe.find(r => r.ticker === 'BIG').cap === 50000, 'price × shares = $50,000M is outside the band');
// Dual-class filers tag the cover-page share count per class (dimensioned), which the companyfacts API drops; price × diluted FY-average shares
// stands in, ahead of the float, which understates a closely held company (WTS sat in the band at its $6.7B float; it is a $11.8B company).
const dual = Object.assign({}, good, { cik: 4, fy: Object.fromEntries(Object.entries(good.fy).map(([e, o]) => { const c = Object.assign({}, o); delete c.sharesOut; return [e, c]; })) });
const S4 = C.screenAt({ universe: { companies: [{ cik: 4, ticker: 'DUAL', domestic: true, financial: false }] }, facts: { 4: dual } }, screen, '2025-06-01', 'us', { 4: { price: 200 } });
const r4 = S4.universe.find(r => r.ticker === 'DUAL');
assert(r4.cap === 21000 && r4.inBand === false && /diluted/.test(r4.capSource), 'no cover-page count + price → price × diluted shares (200 × 105M = $21,000M, out of band), not the $5,000M float');
assert(!S.universe.find(r => r.ticker === 'BNK'), 'financials excluded from the screen');
if (fails) { console.error(`${fails} failing`); process.exit(1); } else console.log('all compounder engine tests passed');

// ---- prices: Yahoo chart parsing (adjustment, New York dates, splits, EDGAR→Yahoo symbol mapping) ----
const P = await import('./compounder-prices-us.mjs');
assert(P.yahooSymbol('BRK.B') === 'BRK-B' && P.yahooSymbol('QLYS') === 'QLYS', 'dotted class tickers map to Yahoo dashes');
const ts = [Date.UTC(2024, 5, 7, 13, 30) / 1000, Date.UTC(2024, 5, 10, 13, 30) / 1000, Date.UTC(2024, 5, 11, 13, 30) / 1000];   // 09:30 New York
const chartJson = { chart: { result: [{ meta: { currency: 'USD', exchangeName: 'NMS', instrumentType: 'EQUITY', exchangeTimezoneName: 'America/New_York' }, timestamp: ts,
  indicators: { quote: [{ open: [200, 202, 20.5], high: [210, 205, 21], low: [198, 199, 20], close: [205, 200, 20.8], volume: [1e6, 1.2e6, 9e6] }], adjclose: [{ adjclose: [20.5, 20, 20.8] }] },
  events: { splits: { '1718110800': { date: ts[2], numerator: 10, denominator: 1, splitRatio: '10:1' } } } }], error: null } };
const pc = P.parseChart(chartJson);
assert(pc.bars.length === 3 && pc.bars[0].d === '2024-06-07' && pc.bars[2].d === '2024-06-11', 'bars dated in New York time');
assert(pc.bars[0].c === 20.5 && pc.bars[0].o === 20 && pc.bars[0].h === 21, 'pre-split bars scaled by adjclose/close so the series is continuous');
assert(pc.bars[2].c === 20.8 && pc.bars[2].t === +(20.8 * 9e6 / 1e6).toFixed(3), 'post-split bar unchanged; turnover in $M');
assert(pc.splits['2024-06-11'] === '10:1', 'split event recorded by date');
assert(P.parseChart({ chart: { result: null, error: { code: 'Not Found', description: 'No data found' } } }).error === 'No data found', 'error surfaced');
const files = {};
P.mergeBars(files, '^RUT', [{ d: '2024-06-07', o: 1, h: 1, l: 1, c: 2000 }, { d: '2024-06-10', o: 1, h: 1, l: 1, c: 2010 }, { d: '2024-06-11', o: 1, h: 1, l: 1, c: 2020 }], true);
P.mergeBars(files, 'AAA', [{ d: '2024-06-07', o: 1, h: 1, l: 1, c: 10, v: 100, t: 0.001 }, { d: '2024-06-11', o: 1, h: 1, l: 1, c: 11, v: 100, t: 0.001 }], false);   // no bar on the 10th (halted)
P.mergeBars(files, 'BBB', [{ d: '2024-06-10', o: 1, h: 1, l: 1, c: 5, v: 1, t: 0 }, { d: '2024-06-12', o: 1, h: 1, l: 1, c: 6, v: 1, t: 0 }], false);              // adds a new date after the others
const f24 = files['2024'];
assert(f24.dates.join(',') === '2024-06-07,2024-06-10,2024-06-11,2024-06-12', 'calendar is the union of all symbols, sorted');
assert(JSON.stringify(f24.symbols.AAA.c) === '[10,null,11,null]' && JSON.stringify(f24.symbols.BBB.c) === '[null,5,null,6]', 'series aligned to the calendar with null gaps');
assert(JSON.stringify(f24.index.c) === '[2000,2010,2020,null]' && f24.index.name === '^RUT', 'index aligned and padded');
const E2 = createRequire(import.meta.url)('../engine.js'); const bars = E2.buildBars([f24], []);
assert(bars.dates.length === 4 && bars.sym.AAA.c[2] === 11 && bars.index.c[1] === 2010, 'engine.buildBars reads the US price file unchanged');
if (fails) { console.error(`${fails} failing`); process.exit(1); } else console.log('all compounder price tests passed');
