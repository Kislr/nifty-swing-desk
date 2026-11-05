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
// Whole-universe composite (backtest): passers first per trait, then failers by value, non-computable at the midpoint; deciles cut from the sum.
{ const rows = C.screenAt({ universe: { companies: [1, 2, 3, 4].map(cik => ({ cik, ticker: 'T' + cik, domestic: true, financial: false })) }, facts: { 1: good, 2: Object.assign({}, levered, { cik: 2 }), 3: Object.assign({}, diluter, { cik: 3 }), 4: Object.assign({}, service, { cik: 4 }) } }, screen, '2025-06-01', 'us').universe;
  const R = C.rankUniverse(rows, 2);
  assert(R[0].ticker === 'T1' && R[0].decile === 1 && R[0].uRank === 1, 'the all-five passer ranks first');
  assert(R.find(r => r.ticker === 'T2').uRanks.leverage > R.find(r => r.ticker === 'T1').uRanks.leverage && R.find(r => r.ticker === 'T2').uRanks.leverage <= 4, 'a failed trait scores (below every passer), it is not dropped');
  assert(R.find(r => r.ticker === 'T4').uRanks.grossMargin === 2.5, 'a trait that cannot be computed sits at the midpoint rank');
  assert(R.filter(r => r.decile === 1).length === 2 && R.filter(r => r.decile === 2).length === 2, 'deciles (here halves) are equal cuts of the ranking');
  const V = C.rankUniverse(rows.map(r => Object.assign({}, r, { uRanks: null })), 2, 'value');
  assert(V.every(r => r.uRankSum > 0) && V[0].uRank === 1, 'value mode ranks on trait values alone'); }
// v0.3 (compounder/screen-v0.3.json): ROCE as a level, gross margin disabled, gates-then-level composite
{ const v3 = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../compounder/screen-v0.3.json', import.meta.url), 'utf8'));
  let e3 = C.evaluate(good, v3, '2025-06-01');
  assert(e3.ok && e3.traits.roce.pass && /3-year average/.test(e3.traits.roce.why) && Math.abs(e3.traits.roce.rank - e3.traits.roce.value / 100) < 1e-3, 'v0.3 ROCE is a 3-year average level, ranked on the average');
  assert(e3.traits.grossMargin.enabled === false && e3.traits.roce.enabled === true && !e3.na.includes('grossMargin') && !e3.failed.includes('grossMargin'), 'a disabled trait is computed for the record but takes no part in the verdict');
  e3 = C.evaluate(service, v3, '2025-06-01'); assert(e3.ok && !e3.nearMiss, 'v0.3: a service business with no gross margin now passes outright');
  const dip = mk([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => yr(`${y}-12-31`, `${y + 1}-02-15`, { rev: 1000 * Math.pow(1.15, i), ebit: i === 4 ? 20 : 300 })));   // one bad year in a strongly profitable run
  assert(!C.evaluate(dip, screen, '2025-06-01').traits.roce.pass && C.evaluate(dip, v3, '2025-06-01').traits.roce.pass, 'the stability rule (v0.2) fails one bad year; the level rule (v0.3) averages through it');
  const rows = C.screenAt({ universe: { companies: [1, 2, 3, 4].map(cik => ({ cik, ticker: 'T' + cik, domestic: true, financial: false })) }, facts: { 1: good, 2: Object.assign({}, levered, { cik: 2 }), 3: Object.assign({}, diluter, { cik: 3 }), 4: Object.assign({}, service, { cik: 4 }) } }, v3, '2025-06-01', 'us');
  assert(rows.quality.length === 2 && rows.quality[0].rank === 1 && rows.quality.every(r => r.ranks.roce), 'v0.3 quality list: both all-gate passers, ordered by ROCE level alone');
  const R3 = C.rankUniverse(rows.universe, 2, undefined, v3.composite);
  assert(R3[0].gatesPassed === 3 && R3[R3.length - 1].gatesPassed === 2 && R3.every((r, i) => i === 0 || r.gatesPassed < R3[i - 1].gatesPassed || r.level <= R3[i - 1].level), 'gates-then-level: tiers by gates passed, ROCE level descending inside a tier');
  assert(R3[0].uRanks.gates === 3 && typeof R3[0].uRanks.roce === 'number' && R3.filter(r => r.decile === 1).length === 2, 'ranks recorded and deciles cut from the order'); }
if (fails) { console.error(`${fails} failing`); process.exit(1); } else console.log('all compounder engine tests passed');

// ---- backtest: end to end on a synthetic store (facts + prices + index) where the good companies are built to win ----
{ const fsP = await import('node:fs/promises'); const os = await import('node:os'); const pathM = await import('node:path'); const { spawnSync } = await import('node:child_process');
  const tmp = await fsP.mkdtemp(pathM.join(os.tmpdir(), 'compounder-bt-')); await fsP.mkdir(pathM.join(tmp, 'facts')); await fsP.mkdir(pathM.join(tmp, 'prices'));
  // 6 good compounders (growth 12–17%), 6 levered, one good company with no prices at all, one good company whose prices stop in mid-2025
  const cos = [], universe = [];
  const add = (cik, ticker, facts) => { cos.push(Object.assign({}, facts, { cik, ticker, name: ticker })); universe.push({ cik, ticker, domestic: true, financial: false }); };
  const grow = g => mk([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => yr(`${y}-12-31`, `${y + 1}-02-15`, { rev: 1000 * Math.pow(g, i), cogs: 500 * Math.pow(g, i), ebit: 200 * Math.pow(g, i), ni: 150 * Math.pow(g, i), ocf: 180 * Math.pow(g, i), sharesOut: 20e6 })));
  for (let k = 0; k < 6; k++) add(100 + k, 'G' + k, grow(1.12 + 0.01 * k));
  // the levered six also have flat revenue, a shrinking gross margin and a 10% ROCE, so they fail three traits, not one
  for (let k = 0; k < 6; k++) add(200 + k, 'B' + k, mk([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => yr(`${y}-12-31`, `${y + 1}-02-15`, { rev: 1000, cogs: 500 + 20 * i, ebit: 100 - k, ni: 60, ocf: 70, debtLT: 900 + 10 * k, cash: 50, sharesOut: 20e6 }))));
  add(300, 'NP', grow(1.15)); add(301, 'LV', grow(1.15));
  await fsP.writeFile(pathM.join(tmp, 'universe.json'), JSON.stringify({ asOf: '2026-03-01', screenable: universe.length, companies: universe }));
  await fsP.writeFile(pathM.join(tmp, 'facts', '00.json'), JSON.stringify(Object.fromEntries(cos.map(c => [c.cik, c]))));
  // weekday bars 2024-01-02 → 2026-10-30: good names drift +0.08%/day, levered ones −0.04%/day, the index +0.02%/day
  const files = {}; const d = new Date('2024-01-02T00:00:00Z'); let n = 0; const px = {}; for (const c of cos) px[c.ticker] = 100; let idx = 2000;
  while (d <= new Date('2026-10-30T00:00:00Z')) { const dow = d.getUTCDay(); if (dow !== 0 && dow !== 6) { const ds = d.toISOString().slice(0, 10); const y = ds.slice(0, 4); const f = files[y] || (files[y] = { year: +y, dates: [], symbols: {}, index: { name: '^RUT', o: [], h: [], l: [], c: [] }, splits: {} });
      f.dates.push(ds); idx *= 1.0002; for (const a of ['o', 'h', 'l', 'c']) f.index[a].push(+idx.toFixed(2));
      for (const c of cos) { if (c.ticker === 'NP') continue; if (c.ticker === 'LV' && ds > '2025-06-15') continue; const drift = c.ticker.startsWith('B') ? 0.9996 : 1.0008; px[c.ticker] *= drift * (1 + 0.004 * Math.sin(n * (1 + c.cik % 7))); const p = +px[c.ticker].toFixed(3);
        const S = f.symbols[c.ticker] || (f.symbols[c.ticker] = { o: [], h: [], l: [], c: [], v: [], t: [] }); const k = f.dates.length - 1; for (const a of ['o', 'h', 'l', 'c', 'v', 't']) while (S[a].length < k) S[a].push(null); S.o.push(p); S.h.push(p); S.l.push(p); S.c.push(p); S.v.push(1e6); S.t.push(+(p * 1e6 / 1e6).toFixed(3)); }
      n++; } d.setUTCDate(d.getUTCDate() + 1); }
  for (const f of Object.values(files)) { const N = f.dates.length; for (const S of Object.values(f.symbols)) for (const a of ['o', 'h', 'l', 'c', 'v', 't']) while (S[a].length < N) S[a].push(null); await fsP.writeFile(pathM.join(tmp, 'prices', f.year + '.json'), JSON.stringify(f)); }
  const bt = spawnSync(process.execPath, [new URL('./compounder-backtest-us.mjs', import.meta.url).pathname, '--data', tmp, '--out', pathM.join(tmp, 'out'), '--deciles', '2', '--no-robustness'], { encoding: 'utf8' });
  assert(bt.status === 0 && /Verdict/.test(bt.stdout), 'compounder backtest runs end to end on a synthetic store' + (bt.status ? '\n' + bt.stderr : ''));
  if (bt.status === 0) { const rep = JSON.parse(await fsP.readFile(pathM.join(tmp, 'out', (await fsP.readdir(pathM.join(tmp, 'out'))).find(f => f.endsWith('.json'))), 'utf8'));
    const c0 = rep.cohorts[0]; const c25 = rep.cohorts.find(c => c.date >= '2025-04-01'); const cLeft = rep.cohorts.find(c => c.date <= '2025-06-15' && c.exitDate > '2025-06-15');
    assert(rep.cohorts.length >= 4 && c0.date === '2024-04-01' && c0.portfolios.passers.n === 0 && rep.cohorts.every(c => c.date.slice(8) <= '03'), `cohorts start when five fiscal years are visible (ranked, no passers yet: the 5-year CAGR needs six), on the first trading day of a quarter (${rep.cohorts.map(c => c.date).join(', ')})`);
    assert(rep.summary.topBeatsBottom === 1 && rep.summary.top.meanExcess > 0 && rep.summary.bottom.meanExcess < 0, 'top half (the compounders) beats the bottom half (the levered) in every cohort and beats the index');
    assert(c25 && c25.portfolios.passers.n >= 6 && c25.qualityInTop >= 0.8 && c25.portfolios.top.tickers.filter(t => /^G|^LV/.test(t)).length >= 6 && c25.portfolios.bottom.tickers.every(t => /^B/.test(t)), 'once six years are visible the quality list sits inside the top decile, and the bottom decile is the levered companies');
    assert(c0.gap.noPrice === 1 && c0.gap.byBucket['$1–2B'].noPrice + c0.gap.byBucket['$2–10B'].noPrice === 1, 'a filer with no price history is counted in the survivor gap, in its cap bucket');
    assert(cLeft && cLeft.gap.leftDuringHold === 1 && cLeft.portfolios.top.left === 1 && rep.gap.tags.left['still filing'] >= 1, 'a name that stops trading during the hold is sold at its last close, counted and tagged from the EDGAR store');
    assert(rep.summary.verdict === 'PASS' && rep.summary.criteria.robust.tested === false, 'pass criteria evaluated; robustness reported as not run'); }
  if (process.env.KEEP) console.log("kept", tmp); else await fsP.rm(tmp, { recursive: true, force: true }); }
if (fails) { console.error(`${fails} failing`); process.exit(1); } else console.log('all compounder backtest tests passed');

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
// store format: .json written, .json.gz still readable and removed once its year is rewritten
{ const fsP = await import('node:fs/promises'); const os = await import('node:os'); const pathM = await import('node:path'); const zlib = await import('node:zlib');
  const tmp = await fsP.mkdtemp(pathM.join(os.tmpdir(), 'prices-'));
  await fsP.writeFile(pathM.join(tmp, '2024.json.gz'), zlib.gzipSync(JSON.stringify(f24)));
  const back = await P.readYear('2024', tmp); assert(back && back.dates.length === 4, 'readYear falls back to the gzipped form');
  await P.writeYear(back, tmp); const names = (await fsP.readdir(tmp)).sort();
  assert(names.join(',') === '2024.json' && (await P.readYear('2024', tmp)).dates.length === 4, 'writeYear writes plain JSON and drops the .gz it replaces');
  await fsP.writeFile(pathM.join(tmp, '2023.json.gz'), zlib.gzipSync(JSON.stringify(Object.assign({}, f24, { year: 2023 }))));
  assert((await P.yearsOnDisk(tmp)).join(',') === '2023,2024', 'yearsOnDisk lists both forms once');
  await fsP.rm(tmp, { recursive: true, force: true }); }
if (fails) { console.error(`${fails} failing`); process.exit(1); } else console.log('all compounder price tests passed');
