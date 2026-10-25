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

if (fails) { console.error(`${fails} failing`); process.exit(1); } else console.log('all compounder tests passed');
