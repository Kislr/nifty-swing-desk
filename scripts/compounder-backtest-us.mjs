#!/usr/bin/env node
/* Compounder screen — walk-forward backtest (SCREEN.md step 6), US.
 *
 *   node scripts/compounder-backtest-us.mjs                       # every quarterly cohort the store supports
 *   node scripts/compounder-backtest-us.mjs --from 2018-01-01 --to 2024-12-31
 *   node scripts/compounder-backtest-us.mjs --no-robustness       # skip the ±20% threshold re-runs (3× faster)
 *   node scripts/compounder-backtest-us.mjs --deciles 5            # quintiles instead of deciles
 *   node scripts/compounder-backtest-us.mjs --band all             # rank every priced filer, not only the $300M–$10B band
 *
 * What it does, as specified in compounder/screen.json "backtest" and the 29 Oct 2026 decisions in SCREEN.md / README:
 *   - Cohorts on the first trading day of Jan / Apr / Jul / Oct. On each date the screen runs point-in-time (only 10-Ks filed by
 *     then), prices are the close on or before the date, market cap = price × cover-page shares as of that date (never today's cap).
 *   - The whole screenable universe that is priced, inside the cap band and above the liquidity floor is ranked on the composite
 *     (compounder.rankUniverse — v0.2: passers first per trait, then failers, non-computable at the midpoint; v0.3 'gates-then-level':
 *     tiers by gates passed, then the profitability level) and cut into deciles. --screen <file> selects the definition.
 *   - Four equal-weight portfolios per cohort: top decile, bottom decile, all passers (the quality list) and quality AND momentum
 *     (the overlay exactly as the live screen computes it). Each is bought at the cohort close and held twelve months (buy and hold,
 *     no rebalancing inside the year). A name that stops trading during the hold is sold at its last available close and counted.
 *   - Benchmark: Russell 2000 (^RUT) over the same window. Excess = portfolio − index.
 *   - Survivor gap, per cohort and per cap bucket: of the companies with 5+ filed fiscal years on the date, the share with no price on
 *     the date, and of those priced, the share that stop trading before the exit. Each is tagged from the EDGAR store as "stopped
 *     filing (last 10-K …)" or "still filing". What this CANNOT see: companies that left EDGAR before the universe was built
 *     (compounder/data/us/universe.json is today's filers), which is the larger, uncounted part of the bias.
 *   - Pass criteria from screen.json: top decile beats bottom decile in ≥ 70% of cohorts; top decile mean AND median excess > 0;
 *     no single ±20% shift of any threshold flips the first condition.
 * Writes reports/compounder-backtest-us-<stamp>.md and .json. */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = require(path.join(ROOT, 'compounder.js')); const E = require(path.join(ROOT, 'engine.js')); const MOM = require(path.join(ROOT, 'momentum.js'));
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; }; const flag = n => args.includes('--' + n);
const market = 'us'; const FROM = opt('from', '0000-00-00'), TO = opt('to', '9999-99-99'); const DECILES = Number(opt('deciles', 10)); const BAND = opt('band', 'screen');
const ROBUST = !flag('no-robustness'); const HOLD_DAYS = 365; const STALE_BARS = 10;   // a price counts if the last bar is within 10 sessions of the date

/* ---------- load ---------- */
const screen = JSON.parse(await fs.readFile(opt('screen', path.join(ROOT, 'compounder', 'screen.json')), 'utf8'));
const dir = opt('data', path.join(ROOT, 'compounder', 'data', market)); const M = screen.markets[market];
const universe = JSON.parse(await fs.readFile(path.join(dir, 'universe.json'), 'utf8'));
const facts = {}; for (const f of await fs.readdir(path.join(dir, 'facts'))) if (f.endsWith('.json')) Object.assign(facts, JSON.parse(await fs.readFile(path.join(dir, 'facts', f), 'utf8')));
const yearFiles = []; const pdir = path.join(dir, 'prices');
const seenYears = new Set();   // .json wins over an older .json.gz of the same year
for (const f of (await fs.readdir(pdir)).sort()) if (/^\d{4}\.json(\.gz)?$/.test(f) && !seenYears.has(f.slice(0, 4))) { seenYears.add(f.slice(0, 4)); const raw = await fs.readFile(path.join(pdir, f)); yearFiles.push(JSON.parse((f.endsWith('.gz') ? zlib.gunzipSync(raw) : raw).toString())); }
if (!yearFiles.length) { console.error('no price files in compounder/data/us/prices/ — run scripts/compounder-prices-us.mjs --backfill first'); process.exit(2); }
const bars = E.buildBars(yearFiles, []); const N = bars.dates.length; const pos = {}; bars.dates.forEach((d, i) => (pos[d] = i));
const byTicker = {}; for (const c of universe.companies) if (c.ticker) byTicker[c.ticker] = c.cik;
const tickerOf = {}; for (const c of universe.companies) tickerOf[c.cik] = c.ticker;
const store = { universe, facts };
console.log(`prices: ${N} days ${bars.dates[0]} → ${bars.dates[N - 1]}, ${Object.keys(bars.sym).length} symbols${bars.index ? ', ' + bars.index.name : ', NO index'}; facts: ${Object.keys(facts).length} companies; screen v${screen.version}`);

/* ---------- helpers ---------- */
const idxOnOrBefore = date => { let i = N - 1; while (i >= 0 && bars.dates[i] > date) i--; return i; };
const idxOnOrAfter = date => { let i = 0; while (i < N && bars.dates[i] < date) i++; return i < N ? i : -1; };
const addDays = (date, n) => { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** close of `sym` at bar i or the latest within STALE_BARS before it; null if none. */
const closeAt = (sym, i) => { const B = bars.sym[sym]; if (!B || i < 0) return null; let j = i; while (j >= 0 && B.c[j] == null) j--; return j < 0 || i - j > STALE_BARS ? null : { price: B.c[j], j }; };
const lastClose = sym => { const B = bars.sym[sym]; if (!B) return null; let j = N - 1; while (j >= 0 && B.c[j] == null) j--; return j < 0 ? null : { price: B.c[j], j }; };
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const pctile = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const k = (s.length - 1) * p; const lo = Math.floor(k), hi = Math.ceil(k); return s[lo] + (s[hi] - s[lo]) * (k - lo); };
const capBucket = cap => cap == null ? 'unknown' : cap < 300 ? '<$300M' : cap < 1000 ? '$300M–1B' : cap < 2000 ? '$1–2B' : cap <= 10000 ? '$2–10B' : '>$10B';
const BUCKETS = ['<$300M', '$300M–1B', '$1–2B', '$2–10B', '>$10B', 'unknown'];
const latestFiledOf = cik => { const co = facts[cik]; if (!co) return null; let best = null; for (const rec of Object.values(co.fy || {})) { const a = rec.ni || rec.rev || rec.ocf || rec.ebit; if (a && (!best || a.filed > best)) best = a.filed; } return best; };
const UNIVERSE_ASOF = universe.asOf || facts && Object.values(facts)[0] && Object.values(facts)[0].fetched || '2026-10-25';
/** EDGAR-store tag for a name with missing prices: stopped filing if its newest 10-K is more than 15 months before the universe build. */
const edgarTag = cik => { const lf = latestFiledOf(cik); if (!lf) return 'no facts'; return lf < addDays(UNIVERSE_ASOF, -456) ? `stopped filing (last 10-K ${lf})` : 'still filing'; };

/* ---------- prices as of a date, cached per cohort ---------- */
function pricesAt(i) {
  const prices = {}; const date = bars.dates[i];
  for (const [t, B] of Object.entries(bars.sym)) { const cik = byTicker[t]; if (!cik) continue; const c = closeAt(t, i); if (!c) continue;
    const turn = []; for (let k = Math.max(0, c.j - 19); k <= c.j; k++) if (B.t[k] != null) turn.push(B.t[k]);
    prices[cik] = { price: c.price, date: bars.dates[c.j], avgTurnover: turn.length ? +(mean(turn)).toFixed(3) : null }; }
  return { date, prices };
}

/* ---------- cohort dates ---------- */
const cohortDates = [];
{ const y0 = Number(bars.dates[0].slice(0, 4)), y1 = Number(bars.dates[N - 1].slice(0, 4));
  for (let y = y0; y <= y1; y++) for (const m of ['01', '04', '07', '10']) { const i = idxOnOrAfter(`${y}-${m}-01`); if (i < 1) continue; const d = bars.dates[i];
    if (d.slice(5, 7) !== m || bars.dates[i - 1] >= `${y}-${m}-01` || d < FROM || d > TO) continue;   // the first trading day of that month, with the prior day in the data
    const exitDate = addDays(d, HOLD_DAYS); if (exitDate > bars.dates[N - 1]) continue;   // needs the full twelve months
    cohortDates.push(d); } }
if (!cohortDates.length) { console.error('no cohort has twelve months of forward prices in this window'); process.exit(2); }

/* ---------- one cohort under one screen definition ---------- */
function runCohort(date, scr, cache, o) {
  o = Object.assign({ band: BAND, composite: 'pass-first' }, o || {});
  const i = pos[date]; const P = cache.prices[date] || (cache.prices[date] = pricesAt(i));
  const S = C.screenAt(store, scr, date, market, P.prices);
  const exitDate = addDays(date, HOLD_DAYS); const ie = idxOnOrBefore(exitDate);
  const idx0 = bars.index && bars.index.c[i] != null ? bars.index.c[i] : null; const idx1 = bars.index ? (() => { let j = ie; while (j >= 0 && bars.index.c[j] == null) j--; return j >= 0 ? bars.index.c[j] : null; })() : null;
  const idxRet = idx0 != null && idx1 != null ? idx1 / idx0 - 1 : null;
  // forward return of one company; sold at the last available close if it stops trading before the exit
  const fwd = r => { const t = tickerOf[r.cik]; const p0 = closeAt(t, i); if (!p0) return null; const p1 = closeAt(t, ie); if (p1) return { ret: p1.price / p0.price - 1, left: false };
    const last = lastClose(t); if (!last || last.j <= p0.j) return { ret: 0, left: true, note: 'no bar after entry' }; return { ret: last.price / p0.price - 1, left: true, leftDate: bars.dates[last.j] }; };
  // screenable on the date: enough fiscal years filed, and a 10-K filed within the last 15 months (a filer active on the date)
  const active = S.universe.filter(r => !r.reason && r.latestFiled && r.latestFiled >= addDays(date, -456));
  // survivor gap 1: active filers with no price on the date, by cap bucket (float as the bucket proxy when there is no price)
  const gap = { active: active.length, noPrice: 0, byBucket: {}, leftDuringHold: 0, tags: { noPrice: {}, left: {} } };
  for (const b of BUCKETS) gap.byBucket[b] = { active: 0, noPrice: 0, priced: 0, left: 0 };
  const priced = [];
  for (const r of active) { const bucket = capBucket(r.cap); gap.byBucket[bucket].active++;
    if (r.price == null) { gap.noPrice++; gap.byBucket[bucket].noPrice++; const tag = edgarTag(r.cik).replace(/ \(.*\)/, ''); gap.tags.noPrice[tag] = (gap.tags.noPrice[tag] || 0) + 1; }
    else { gap.byBucket[bucket].priced++; priced.push(r); } }
  // the ranking universe: priced, in band (unless --band all), liquid
  const ranked = C.rankUniverse(priced.filter(r => o.band === 'all' || (r.inBand === true && r.illiquid !== true)), DECILES, o.composite, scr.composite);
  const rets = new Map();
  for (const r of ranked) { const f = fwd(r); rets.set(r.cik, f); if (f && f.left) { gap.leftDuringHold++; gap.byBucket[capBucket(r.cap)].left++; const tag = edgarTag(r.cik).replace(/ \(.*\)/, ''); gap.tags.left[tag] = (gap.tags.left[tag] || 0) + 1; } }
  const port = (rows, name) => { const rs = rows.map(r => rets.get(r.cik)).filter(f => f && f.ret != null).map(f => f.ret); const left = rows.filter(r => rets.get(r.cik) && rets.get(r.cik).left).length;
    return { name, n: rows.length, priced: rs.length, left, ret: mean(rs), median: median(rs), excess: idxRet != null && rs.length ? mean(rs) - idxRet : null, p10: pctile(rs, 0.1), p50: pctile(rs, 0.5), p90: pctile(rs, 0.9), winners: rs.length ? rs.filter(x => x > (idxRet || 0)).length / rs.length : null, tickers: rows.map(r => r.ticker) }; };
  const top = ranked.filter(r => r.decile === 1), bottom = ranked.filter(r => r.decile === DECILES); const passers = ranked.filter(r => r.ok);
  // quality AND momentum: the live screen's overlay, on the quality list, with the gate as of the date
  let qm = [], gate = null;
  if (passers.length && bars.index) { const O = scr.momentumOverlay; const sub = { dates: bars.dates, index: bars.index, sym: {} }; for (const r of passers) if (bars.sym[r.ticker]) sub.sym[r.ticker] = bars.sym[r.ticker];
    const R = MOM.rankAt(sub, i, { lookback: O.lookback, skip: O.skip, maxOffHigh: O.maxOffHigh, gateSma: O.gateSma, minTurnover: M.minAvgDailyDollarVolume, volAdjust: false }, {}); gate = R.gate.open;
    const half = Math.ceil(passers.length / 2); const byT = {}; for (const r of R.universe) byT[r.sym] = r;
    qm = passers.filter(r => { const m = byT[r.ticker]; return m && m.eligible && m.rank <= half && R.gate.open === true; }); }
  const qualityInTop = passers.length ? passers.filter(r => r.decile === 1).length / passers.length : null;
  return { date, exitDate: bars.dates[ie], idxRet, universe: S.counts.screened, enoughYears: S.counts.enoughYears, active: active.length, priced: priced.length, ranked: ranked.length, decileSize: top.length, gate, qualityInTop,
    portfolios: { top: port(top, 'top decile'), bottom: port(bottom, 'bottom decile'), passers: port(passers, 'all passers'), qm: port(qm, 'quality AND momentum') }, gap };
}

/* ---------- aggregate ---------- */
function summarise(cohorts) {
  const withIdx = cohorts.filter(c => c.idxRet != null);
  const ex = k => withIdx.map(c => c.portfolios[k].excess).filter(x => x != null);
  const raw = k => withIdx.map(c => c.portfolios[k].ret).filter(x => x != null);
  const tb = withIdx.filter(c => c.portfolios.top.ret != null && c.portfolios.bottom.ret != null); const topBeatsBottom = tb.length ? tb.filter(c => c.portfolios.top.ret > c.portfolios.bottom.ret).length / tb.length : null;
  const out = { cohorts: cohorts.length, withIndex: withIdx.length, topBeatsBottom, topBeatsBottomN: tb.length };
  for (const k of ['top', 'bottom', 'passers', 'qm']) { const e = ex(k), r = raw(k); out[k] = { cohorts: e.length, meanRet: mean(r), meanExcess: mean(e), medianExcess: median(e), beatsIndex: e.length ? e.filter(x => x > 0).length / e.length : null, worstExcess: e.length ? Math.min(...e) : null, bestExcess: e.length ? Math.max(...e) : null }; }
  out.index = { meanRet: mean(withIdx.map(c => c.idxRet)) };
  const pc = screen.backtest && screen.backtest.passCriteria || {}; const minShare = 0.7;
  out.criteria = { topBeatsBottom: { rule: pc.topBeatsBottom || 'top decile beats bottom decile in at least 70% of cohorts', value: topBeatsBottom, pass: topBeatsBottom != null && topBeatsBottom >= minShare },
    topBeatsIndex: { rule: pc.topBeatsIndex || 'top decile mean excess return > 0 AND median excess return > 0', mean: out.top.meanExcess, median: out.top.medianExcess, pass: out.top.meanExcess != null && out.top.meanExcess > 0 && out.top.medianExcess > 0 } };
  return out;
}

/** Rolling portfolio: at any time the last four cohorts are held, a quarter of capital each; marked monthly; drawdown from the chain. */
function rollingCurve(cohorts, key) {
  const legs = cohorts.map(c => ({ start: pos[c.date], end: pos[c.exitDate], tickers: c.portfolios[key].tickers.filter(t => bars.sym[t]) })).filter(l => l.tickers.length);
  if (!legs.length) return null;
  const monthEnds = []; for (let i = 1; i < N; i++) if (bars.dates[i].slice(0, 7) !== bars.dates[i - 1].slice(0, 7)) monthEnds.push(i - 1); monthEnds.push(N - 1);
  const legVal = (l, i) => { if (i < l.start) return null; const ii = Math.min(i, l.end); const vals = []; for (const t of l.tickers) { const p0 = closeAt(t, l.start), p1 = closeAt(t, ii) || lastClose(t); if (p0 && p1 && p1.j >= p0.j) vals.push(p1.price / p0.price); } return vals.length ? mean(vals) : null; };
  const first = legs[0].start; const marks = monthEnds.filter(i => i >= first); const curve = []; let v = 1, peak = 1, dd = 0; let prev = null;
  for (const i of marks) { const act = legs.filter(l => i >= l.start && (prev == null || prev < l.end)); const w = act.length ? 1 / Math.max(4, act.length) : 0; let r = 0;
    if (prev != null) for (const l of act) { const a = legVal(l, prev), b = legVal(l, i); if (a != null && b != null && prev >= l.start) r += w * (b / a - 1); }
    v *= 1 + r; peak = Math.max(peak, v); dd = Math.max(dd, 1 - v / peak); curve.push({ date: bars.dates[i], value: +v.toFixed(4), held: act.length }); prev = i; }
  const idx = bars.index ? (() => { const a = bars.index.c[first]; let j = N - 1; while (j >= 0 && bars.index.c[j] == null) j--; const b = bars.index.c[j]; let ipk = 0, idd = 0, p0 = null; for (const i of marks) { const c = bars.index.c[i]; if (c == null) continue; if (p0 == null) p0 = c; const x = c / p0; ipk = Math.max(ipk, x); idd = Math.max(idd, 1 - x / ipk); } return { total: a && b ? b / a - 1 : null, maxDrawdown: idd }; })() : null;
  const yrs = (pos[curve[curve.length - 1].date] - first) / 252;
  return { total: v - 1, cagr: yrs > 0 ? Math.pow(v, 1 / yrs) - 1 : null, maxDrawdown: dd, from: bars.dates[first], to: curve[curve.length - 1].date, index: idx, curve };
}

/* ---------- main run ---------- */
const t0 = Date.now(); const cache = { prices: {} }; const cohorts = [];
for (const d of cohortDates) { cohorts.push(runCohort(d, screen, cache)); const c = cohorts[cohorts.length - 1]; process.stdout.write(`\r${d}  ranked ${c.ranked}  passers ${c.portfolios.passers.n}  top ${(c.portfolios.top.ret * 100).toFixed(0)}%  bottom ${(c.portfolios.bottom.ret * 100).toFixed(0)}%  RUT ${c.idxRet != null ? (c.idxRet * 100).toFixed(0) + '%' : 'n/a'}   `); }
process.stdout.write('\n');
const summary = summarise(cohorts);
const rolling = { top: rollingCurve(cohorts, 'top'), passers: rollingCurve(cohorts, 'passers'), bottom: rollingCurve(cohorts, 'bottom') };

/* ---------- robustness: every threshold ±20%, one at a time ---------- */
const shifts = [['traits.roce.threshold', 'ROCE threshold'], ['traits.roce.floor', 'ROCE floor'], ['traits.grossMargin.maxDropFromHighPts', 'gross-margin drop'], ['traits.growthWithoutDilution.minRevenueCagr', 'revenue CAGR'], ['traits.growthWithoutDilution.maxShareCountGrowth', 'share-count growth'], ['traits.cashConversion.minRatio', 'OCF / NI'], ['traits.leverage.maxNetDebtToEbitda', 'net debt / EBITDA']];
const robustness = [];
const liveShifts = shifts.filter(([key]) => { const ks = key.split('.'); let o = screen; for (const k of ks.slice(0, -1)) { o = o && o[k]; } return o && typeof o[ks[ks.length - 1]] === 'number' && o.enabled !== false; });
if (ROBUST) for (const [key, name] of liveShifts) for (const mult of [0.8, 1.2]) {
  const s2 = JSON.parse(JSON.stringify(screen)); const ks = key.split('.'); let o = s2; for (const k of ks.slice(0, -1)) o = o[k]; const base = o[ks[ks.length - 1]]; o[ks[ks.length - 1]] = +(base * mult).toFixed(3);
  const cs = cohortDates.map(d => runCohort(d, s2, cache)); const sm = summarise(cs);
  robustness.push({ threshold: name, key, base, value: o[ks[ks.length - 1]], topBeatsBottom: sm.topBeatsBottom, topMeanExcess: sm.top.meanExcess, topMedianExcess: sm.top.medianExcess, passersMeanExcess: sm.passers.meanExcess, passersPerCohort: mean(cs.map(c => c.portfolios.passers.n)) });
  process.stdout.write(`\rrobustness: ${name} ×${mult}  top>bottom ${(sm.topBeatsBottom * 100).toFixed(0)}%   `); }
if (ROBUST) process.stdout.write('\n');
const robust = ROBUST ? robustness.every(r => r.topBeatsBottom != null && r.topBeatsBottom >= 0.7) : null;

/* ---------- diagnostics: does the composite construction or the cap band change the answer? ---------- */
const diagnostics = [];
const GTL = screen.composite && screen.composite.method === 'gates-then-level';
for (const [name, o] of GTL ? [['every priced filer, no cap band or liquidity floor', { band: 'all' }]] : [['value-ranked composite (thresholds ignored)', { composite: 'value' }], ['every priced filer, no cap band or liquidity floor', { band: 'all' }], ['both', { composite: 'value', band: 'all' }]]) {
  if (o.band === BAND && o.composite === 'pass-first') continue;
  const cs = cohortDates.map(d => runCohort(d, screen, cache, o)); const sm = summarise(cs);
  diagnostics.push({ name, decileSize: Math.round(mean(cs.map(c => c.decileSize))), topBeatsBottom: sm.topBeatsBottom, top: sm.top, bottom: sm.bottom, passers: sm.passers, qualityInTop: mean(cs.map(c => c.qualityInTop).filter(x => x != null)) }); }
summary.criteria.robust = { rule: (screen.backtest && screen.backtest.passCriteria && screen.backtest.passCriteria.robust) || 'no single +/- 20% threshold shift flips topBeatsBottom to false', pass: robust, tested: ROBUST };
const verdict = summary.criteria.topBeatsBottom.pass && summary.criteria.topBeatsIndex.pass && (robust !== false);
summary.verdict = verdict ? 'PASS' : 'FAIL';

/* ---------- survivor gap, aggregated ---------- */
const gapAgg = { byBucket: {}, noPriceShare: mean(cohorts.map(c => c.active ? c.gap.noPrice / c.active : null).filter(x => x != null)), leftShare: mean(cohorts.map(c => c.ranked ? c.gap.leftDuringHold / c.ranked : null).filter(x => x != null)), tags: { noPrice: {}, left: {} } };
for (const b of BUCKETS) { const a = cohorts.reduce((s, c) => s + c.gap.byBucket[b].active, 0), np = cohorts.reduce((s, c) => s + c.gap.byBucket[b].noPrice, 0), pr = cohorts.reduce((s, c) => s + c.gap.byBucket[b].priced, 0), lf = cohorts.reduce((s, c) => s + c.gap.byBucket[b].left, 0); gapAgg.byBucket[b] = { active: a, noPrice: np, noPriceShare: a ? np / a : null, priced: pr, left: lf, leftShare: pr ? lf / pr : null }; }
for (const c of cohorts) for (const k of ['noPrice', 'left']) for (const [t, n] of Object.entries(c.gap.tags[k])) gapAgg.tags[k][t] = (gapAgg.tags[k][t] || 0) + n;

/* ---------- report ---------- */
const stamp = new Date().toISOString().slice(0, 10); const f = (x, d = 1) => x == null || !isFinite(x) ? '—' : (x * 100).toFixed(d) + '%'; const sg = (x, d = 1) => x == null || !isFinite(x) ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(d) + '%';
const L = [];
const compositeText = GTL ? `Composite (v${screen.version}): every company is ordered by the number of gates it passes (${screen.composite.gates.join(', ')}: 3 down to 0), then by ${screen.composite.level === 'roce' ? 'ROCE level' : screen.composite.level} inside each tier; the quality list passes all gates and the ROCE level rule.` : `Composite (v${screen.version}): per trait, companies that pass the rule rank first by the trait's value, then those that fail it; a trait that cannot be computed sits at the midpoint; the five ranks are summed.`;
const attempt = screen.version.startsWith('0.3') ? 'attempt two of two' : 'attempt one of two';
L.push(`# Compounder backtest — ${M.name}, ${stamp}${screen.version.startsWith('0.3') ? ' — v0.3, ' + attempt : ''}`, '', `Screen v${screen.version} replayed point-in-time on ${cohorts.length} quarterly cohorts, ${cohorts[0].date} → ${cohorts[cohorts.length - 1].date}, each held twelve months (last exit ${cohorts[cohorts.length - 1].exitDate}). Universe: ${universe.screenable || 'the'} screenable 10-K filers in the EDGAR store of ${universe.asOf}; prices from Yahoo (${bars.dates[0]} → ${bars.dates[N - 1]}); benchmark Russell 2000. ${BAND === 'all' ? 'Every priced filer is ranked (--band all).' : `Ranked universe = priced, inside the $${M.marketCap.min}M–$${M.marketCap.max}M cap band on the date and above the $${M.minAvgDailyDollarVolume}M/day liquidity floor.`} **Research aid, not investment advice.** ${compositeText}${screen.hypothesis ? ' Hypothesis as written before the run (SCREEN.md, v0.3): ' + screen.hypothesis.split('. ')[0] + '.' : ''}`, '');
L.push(`## Verdict: ${summary.verdict}`, '', `| criterion (fixed in screen.json before any result existed) | result | pass |`, `|---|---|---|`,
  `| ${summary.criteria.topBeatsBottom.rule} | ${f(summary.criteria.topBeatsBottom.value, 0)} of ${summary.topBeatsBottomN} cohorts | ${summary.criteria.topBeatsBottom.pass ? 'yes' : '**no**'} |`,
  `| ${summary.criteria.topBeatsIndex.rule} | mean ${sg(summary.top.meanExcess)}, median ${sg(summary.top.medianExcess)} | ${summary.criteria.topBeatsIndex.pass ? 'yes' : '**no**'} |`,
  `| ${summary.criteria.robust.rule} | ${ROBUST ? (robust ? 'none flips it' : robustness.filter(r => r.topBeatsBottom < 0.7).map(r => `${r.threshold} ${r.value}: ${f(r.topBeatsBottom, 0)}`).join('; ')) : 'not run (--no-robustness)'} | ${ROBUST ? (robust ? 'yes' : '**no**') : '—'} |`, '',
  `**Read the second row with the survivor gap in mind.** The store holds today's filers, so every cohort is made of companies that were still listed in ${universe.asOf.slice(0, 4)}; the Russell 2000 of the day included the ones that later failed. That flatters every portfolio against the index — the bottom decile included (see below) — so "beats the index" is not evidence on its own. Top decile against bottom decile is the comparison where both sides carry the same bias, and it is the one that decides.`, '');
L.push(`## The four portfolios, twelve-month returns averaged over cohorts`, '', `| portfolio | cohorts | mean return | mean excess vs RUT | median excess | beats the index in | worst cohort | best cohort |`, `|---|---|---|---|---|---|---|---|`);
for (const [k, name] of [['top', 'Top decile by composite'], ['bottom', 'Bottom decile'], ['passers', 'All passers (the quality list)'], ['qm', 'Quality AND momentum']]) { const s = summary[k]; L.push(`| ${name} | ${s.cohorts} | ${sg(s.meanRet)} | ${sg(s.meanExcess)} | ${sg(s.medianExcess)} | ${f(s.beatsIndex, 0)} | ${sg(s.worstExcess)} | ${sg(s.bestExcess)} |`); }
L.push(`| Russell 2000 | ${summary.withIndex} | ${sg(summary.index.meanRet)} | | | | | |`, '');
L.push(`Average decile size ${Math.round(mean(cohorts.map(c => c.decileSize)))} names (ranked universe ${Math.round(mean(cohorts.map(c => c.ranked)))} per cohort); the quality list averages ${Math.round(mean(cohorts.map(c => c.portfolios.passers.n)))} names and ${f(mean(cohorts.map(c => c.qualityInTop).filter(x => x != null)), 0)} of it sits inside the top decile (the sanity check in the decisions). Quality AND momentum is empty whenever the Russell 2000 was below its 200-day average on the cohort date (${cohorts.filter(c => c.gate === false).length} of ${cohorts.filter(c => c.gate != null).length} dated cohorts).`, '');
if (rolling.top) L.push(`## Rolling portfolio (the last four cohorts held, a quarter each, marked monthly)`, '', `| portfolio | ${rolling.top.from} → ${rolling.top.to} | total | CAGR | max drawdown |`, `|---|---|---|---|---|`, ...[['top', 'Top decile'], ['passers', 'All passers'], ['bottom', 'Bottom decile']].filter(([k]) => rolling[k]).map(([k, n]) => `| ${n} | | ${sg(rolling[k].total, 0)} | ${sg(rolling[k].cagr)} | ${f(rolling[k].maxDrawdown, 0)} |`), `| Russell 2000 | | ${sg(rolling.top.index && rolling.top.index.total, 0)} | | ${f(rolling.top.index && rolling.top.index.maxDrawdown, 0)} |`, '');
L.push(`## By cohort`, '', `| entry | exit | ranked | decile | passers | Q&M | gate | top | bottom | passers | Q&M | RUT | top − RUT | top > bottom | top p10 / p50 / p90 |`, `|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
for (const c of cohorts) { const P = c.portfolios; L.push(`| ${c.date} | ${c.exitDate} | ${c.ranked} | ${c.decileSize} | ${P.passers.n} | ${P.qm.n} | ${c.gate == null ? '—' : c.gate ? 'open' : 'closed'} | ${sg(P.top.ret, 0)} | ${sg(P.bottom.ret, 0)} | ${sg(P.passers.ret, 0)} | ${P.qm.n ? sg(P.qm.ret, 0) : '—'} | ${sg(c.idxRet, 0)} | ${sg(P.top.excess, 0)} | ${P.top.ret != null && P.bottom.ret != null ? (P.top.ret > P.bottom.ret ? 'yes' : 'no') : '—'} | ${sg(P.top.p10, 0)} / ${sg(P.top.p50, 0)} / ${sg(P.top.p90, 0)} |`); }
L.push('');
L.push(`## Survivor gap`, '', `The store holds today's filers only, so every cohort is survivors of the present: companies that left EDGAR before ${universe.asOf} (taken over, failed, delisted) are **absent and uncounted** — that is the larger part of the bias and it cannot be measured from this store (it needs the EDGAR full-index of 10-K filers per quarter, which this environment cannot reach). What can be measured, and is: among companies with 5+ fiscal years filed by the cohort date and a 10-K in the previous 15 months, the share with **no price on the date** (${f(gapAgg.noPriceShare)} on average — a name listed later under its current ticker, or a Yahoo history that does not reach back), and among the ranked names the share that **stop trading before the exit** (${f(gapAgg.leftShare)} — sold at the last close, which flatters a takeover and understates a failure). Tags from the EDGAR store: no price → ${Object.entries(gapAgg.tags.noPrice).map(([t, n]) => `${t} ${n}`).join(', ') || 'none'}; left during hold → ${Object.entries(gapAgg.tags.left).map(([t, n]) => `${t} ${n}`).join(', ') || 'none'} (company-cohorts, so one company counts once per cohort).`, '',
  `| cap bucket on the date | active filers (company-cohorts) | no price | share | priced | left during hold | share |`, `|---|---|---|---|---|---|---|`);
for (const b of BUCKETS) { const g = gapAgg.byBucket[b]; if (!g.active) continue; L.push(`| ${b} | ${g.active} | ${g.noPrice} | ${f(g.noPriceShare)} | ${g.priced} | ${g.left} | ${f(g.leftShare)} |`); }
L.push('', `Decision rule (SCREEN.md, 29 Oct): if the gap is large, raise the $${M.marketCap.min}M floor to the lowest bucket where it falls under about 5%, judged from this table — and if the floor climbs past about $2B, the benchmark must change from the Russell 2000. The "no price" column is the measurable proxy; the unmeasured delisted population would add to it, most in the smallest bucket.`, '');
if (diagnostics.length) { L.push(`## Diagnostics: the same cohorts, ranked differently`, '', `Not part of the pass criteria. They answer two questions the decisions raise: whether the composite construction (passers first per trait, then failers) matters, and whether the cap band does.`, '', `| ranking | decile size | top > bottom | top mean excess | top median excess | bottom mean excess | passers mean excess | quality list inside top decile |`, `|---|---|---|---|---|---|---|---|`,
  `| as written (${BAND === 'all' ? 'every priced filer' : 'cap band'}, passers first) | ${Math.round(mean(cohorts.map(c => c.decileSize)))} | ${f(summary.topBeatsBottom, 0)} | ${sg(summary.top.meanExcess)} | ${sg(summary.top.medianExcess)} | ${sg(summary.bottom.meanExcess)} | ${sg(summary.passers.meanExcess)} | ${f(mean(cohorts.map(c => c.qualityInTop).filter(x => x != null)), 0)} |`);
  for (const d of diagnostics) L.push(`| ${d.name} | ${d.decileSize} | ${f(d.topBeatsBottom, 0)} | ${sg(d.top.meanExcess)} | ${sg(d.top.medianExcess)} | ${sg(d.bottom.meanExcess)} | ${sg(d.passers.meanExcess)} | ${f(d.qualityInTop, 0)} |`); L.push(''); }
if (ROBUST) { L.push(`## Robustness: every threshold ±20%, one at a time`, '', `| threshold | as written | shifted to | top > bottom | top mean excess | top median excess | passers mean excess | passers per cohort |`, `|---|---|---|---|---|---|---|---|`);
  for (const r of robustness) L.push(`| ${r.threshold} | ${r.base} | ${r.value} | ${f(r.topBeatsBottom, 0)}${r.topBeatsBottom < 0.7 ? ' **←**' : ''} | ${sg(r.topMeanExcess)} | ${sg(r.topMedianExcess)} | ${sg(r.passersMeanExcess)} | ${Math.round(r.passersPerCohort)} |`); L.push(''); }
L.push(`## How to read this`, '', `Each cohort buys its portfolio equal-weight at the close of the first trading day of the quarter and holds twelve months with no rebalancing, so adjacent cohorts overlap by nine months and the ${cohorts.length} cohorts are nearer ${Math.round(cohorts.length / 4)} independent observations than ${cohorts.length}. ${compositeText} Top and bottom deciles are cut from that ranking inside the cap band, so a decile is ~${Math.round(mean(cohorts.map(c => c.decileSize)))} names and one takeover cannot decide it. Point-in-time: a fiscal year is visible only from the filing date of the 10-K that first reported it; market cap uses the cover-page share count of that 10-K and the price on the cohort date. Returns use Yahoo's split- and dividend-adjusted closes. Costs are not deducted (a quarterly-rebalanced portfolio of ~${Math.round(mean(cohorts.map(c => c.decileSize)))} names turns over roughly a quarter of its names a year; budget about 0.3% a year). The pass criteria were written in screen.json before this script existed. Fails twice → the screen is shelved and the reasons written up here, as with pairs.`, '',
  `Reproduce: \`node scripts/compounder-backtest-us.mjs\` (about ${Math.round((Date.now() - t0) / 1000)} s). Every number per cohort, portfolio member list and the rolling curves are in the .json beside this file.`);
const OUT = opt('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });
const fname = `compounder-backtest-${market}${screen.version.startsWith('0.2') ? '' : '-v' + screen.version.replace(/\.0$/, '')}-${stamp}`;
await fs.writeFile(path.join(OUT, `${fname}.md`), L.join('\n') + '\n');
await fs.writeFile(path.join(OUT, `${fname}.json`), JSON.stringify({ stamp, screenVersion: screen.version, params: { from: FROM, to: TO, deciles: DECILES, band: BAND, holdDays: HOLD_DAYS, robustness: ROBUST }, summary, rolling, robustness, diagnostics, gap: gapAgg, cohorts }, null, 1));
console.log(L.slice(0, 12).join('\n')); console.log(`\nfull report: reports/${fname}.md (and .json), ${Math.round((Date.now() - t0) / 1000)} s`);
