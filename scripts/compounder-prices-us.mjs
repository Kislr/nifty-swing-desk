/* Compounder — US daily prices for the screenable universe plus the Russell 2000.
 *
 *   node scripts/compounder-prices-us.mjs --backfill            six years of bars for every screenable ticker (~3,100 symbols, ~10 min)
 *   node scripts/compounder-prices-us.mjs                       daily: last 10 sessions, appended (what the workflow runs)
 *   options: --limit N   --symbols QLYS,IESC,^RUT   --years 6
 *
 * Source: Yahoo Finance's chart endpoint (no key). Closes are split- and dividend-adjusted (adjclose); open/high/low are scaled by
 * the same factor so the series is internally consistent. Volume is raw shares. `t` is dollar turnover in $ millions (close × volume),
 * the US counterpart of the desk's ₹ crore turnover, so momentum.js's minTurnover means "$M" here. EDGAR tickers with a dot
 * (BRK.B) map to Yahoo's dash form (BRK-B); the store keeps the EDGAR spelling.
 *
 * Store: compounder/data/us/prices/YYYY.json.gz — the same shape as data/history/YYYY.json
 *   {year, dates:[...], symbols:{T:{o,h,l,c,v,t}}, index:{name:'^RUT', o,h,l,c}, splits:{T:{date:'num:den'}}}
 * so engine.buildBars() and momentum.js consume it unchanged. Gzipped because only the jobs read it (≈ 15 MB/yr uncompressed).
 * No dependencies; Node 20+.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'compounder', 'data', 'us', 'prices');
export const INDEX = '^RUT';
const UA = 'Mozilla/5.0 (compatible; nifty-swing-desk research; +https://github.com/Kislr/nifty-swing-desk)';
const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

export const yahooSymbol = t => t.replace(/\./g, '-');

/** Parse one Yahoo chart result into {bars:[{d,o,h,l,c,v,t}], splits:{date:'n:d'}}; adjusted via adjclose/close. */
export function parseChart(json) {
  const res = json && json.chart && json.chart.result && json.chart.result[0];
  if (!res || !res.timestamp) { const err = json && json.chart && json.chart.error; return { error: err ? err.description || err.code : 'no data', bars: [], splits: {} }; }
  const q = res.indicators.quote[0]; const adj = res.indicators.adjclose && res.indicators.adjclose[0] ? res.indicators.adjclose[0].adjclose : null;
  const tz = res.meta.exchangeTimezoneName || 'America/New_York';
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const bars = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    const c = q.close[i]; if (c == null) continue;
    const f = adj && adj[i] != null ? adj[i] / c : 1;
    const o = q.open[i], h = q.high[i], l = q.low[i], v = q.volume[i];
    const ac = +(c * f).toFixed(4);
    bars.push({ d: fmt.format(new Date(res.timestamp[i] * 1000)), o: o != null ? +(o * f).toFixed(4) : null, h: h != null ? +(h * f).toFixed(4) : null, l: l != null ? +(l * f).toFixed(4) : null, c: ac, v: v != null ? v : null, t: v != null ? +(ac * v / 1e6).toFixed(3) : null });
  }
  const splits = {}; const ev = res.events && res.events.splits; if (ev) for (const s of Object.values(ev)) splits[fmt.format(new Date(s.date * 1000))] = `${s.numerator}:${s.denominator}`;
  return { bars, splits, meta: { currency: res.meta.currency, exchange: res.meta.exchangeName, type: res.meta.instrumentType } };
}

let lastTick = 0; const RPS = Number(process.env.YAHOO_RPS || 6);
async function chart(symbol, range) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(symbol))}?range=${range}&interval=1d&events=div%2Csplit`;
  for (let t = 0; t < 4; t++) {
    const wait = lastTick + 1000 / RPS - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait)); lastTick = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status === 404) return { error: 'not found', bars: [], splits: {} };
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 3000 * (t + 1))); continue; }
    if (!res.ok) return { error: `http ${res.status}`, bars: [], splits: {} };
    return parseChart(await res.json());
  }
  return { error: 'rate limited', bars: [], splits: {} };
}

export async function readYear(y) { try { return JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(DIR, y + '.json.gz'))).toString()); } catch { return null; } }
async function writeYear(f) { await fs.mkdir(DIR, { recursive: true }); await fs.writeFile(path.join(DIR, f.year + '.json.gz'), zlib.gzipSync(JSON.stringify(f), { level: 9 })); }

/** Merge bars for one symbol into the per-year files (in memory), creating date slots as needed. */
export function mergeBars(files, sym, bars, isIndex) {
  for (const b of bars) {
    const y = b.d.slice(0, 4); const f = files[y] || (files[y] = { year: +y, dates: [], symbols: {}, index: { name: INDEX, o: [], h: [], l: [], c: [] }, splits: {} });
    let k = f.dates.indexOf(b.d);
    if (k < 0) { f.dates.push(b.d); f.dates.sort(); k = f.dates.indexOf(b.d); for (const S of Object.values(f.symbols)) for (const a of ['o', 'h', 'l', 'c', 'v', 't']) S[a].splice(k, 0, null); for (const a of ['o', 'h', 'l', 'c']) f.index[a].splice(k, 0, null); }
    const N = f.dates.length;
    if (isIndex) { for (const a of ['o', 'h', 'l', 'c']) { while (f.index[a].length < N) f.index[a].push(null); f.index[a][k] = b[a]; } }
    else { const S = f.symbols[sym] || (f.symbols[sym] = { o: [], h: [], l: [], c: [], v: [], t: [] }); for (const a of ['o', 'h', 'l', 'c', 'v', 't']) { while (S[a].length < N) S[a].push(null); S[a][k] = b[a]; } }
  }
  // pad every series to the calendar length
  for (const f of Object.values(files)) { const N = f.dates.length; for (const S of Object.values(f.symbols)) for (const a of ['o', 'h', 'l', 'c', 'v', 't']) while (S[a].length < N) S[a].push(null); for (const a of ['o', 'h', 'l', 'c']) while (f.index[a].length < N) f.index[a].push(null); }
}

export async function run({ backfill, limit, symbols, years }) {
  const universe = JSON.parse(await fs.readFile(path.join(ROOT, 'compounder', 'data', 'us', 'universe.json'), 'utf8'));
  let list = universe.companies.filter(c => c.domestic && !c.financial).map(c => c.ticker).filter(Boolean);
  if (symbols) list = symbols.filter(s => s !== INDEX);
  if (limit) list = list.slice(0, limit);
  const range = backfill ? `${years || 6}y` : '10d';
  const files = {}; const thisYear = new Date().getUTCFullYear();
  if (!backfill) for (let y = thisYear - 1; y <= thisYear; y++) { const f = await readYear(y); if (f) files[y] = f; }
  const log = { ok: 0, missing: [], errors: [] }; let n = 0; const t0 = Date.now();
  const idx = await chart(INDEX, range); if (idx.error) log.errors.push([INDEX, idx.error]); else mergeBars(files, INDEX, idx.bars, true);
  for (const sym of list) {
    n++; const r = await chart(sym, range);
    if (r.error) { (r.error === 'not found' || r.error === 'no data' ? log.missing : log.errors).push([sym, r.error]); }
    else { log.ok++; mergeBars(files, sym, r.bars, false); for (const [d, s] of Object.entries(r.splits)) (files[d.slice(0, 4)] && (files[d.slice(0, 4)].splits[sym] = Object.assign(files[d.slice(0, 4)].splits[sym] || {}, { [d]: s }))); }
    if (n % 200 === 0) console.log(`  ${n}/${list.length} symbols, ${log.ok} ok, ${log.missing.length} missing, ${log.errors.length} errors, ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  for (const f of Object.values(files)) await writeYear(f);
  const meta = { asOf: new Date().toISOString().slice(0, 10), source: 'Yahoo Finance chart API (adjusted closes)', index: INDEX, symbols: log.ok, missing: log.missing.length, errors: log.errors.length,
    // every year on disk, not just the ones this run touched (an incremental run only loads the last two)
    years: (await fs.readdir(DIR)).filter(f => /^\d{4}\.json\.gz$/.test(f)).map(f => f.slice(0, 4)).sort(),
    lastDate: Object.values(files).map(f => f.dates[f.dates.length - 1] || '').sort().pop() || null, missingList: log.missing.map(x => x[0]).slice(0, 200), errorList: log.errors.slice(0, 50) };
  await fs.writeFile(path.join(DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`prices: ${log.ok} symbols ok, ${log.missing.length} missing, ${log.errors.length} errors; years ${meta.years.join(' ')}; last ${meta.lastDate}`);
  return meta;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) run({ backfill: flag('backfill'), limit: Number(opt('limit', 0)) || null, symbols: opt('symbols') ? opt('symbols').split(',') : null, years: Number(opt('years', 6)) }).catch(e => { console.error(e); process.exit(1); });
