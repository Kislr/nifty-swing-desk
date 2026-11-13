#!/usr/bin/env node
/* Quarterly results dates → data/results/events.json (PEAD, reports/pead-hypotheses-2026-11-13.md).
 *
 * The post-earnings-announcement-drift test needs, for every name that was ever in the NIFTY 500, the date and time NSE
 * published each quarterly result. NSE has it in two lists, both behind the same bot filter that refuses cloud IPs, so this is a
 * home run like the backfill and the corporate-actions pull:
 *   1. Financial results  (nseindia.com → Companies → Corporate filings → Financial Results): one row per filing with the
 *      exchange dissemination time — the primary source, because the time decides which day's close first reflects the news.
 *   2. Board meetings     (… → Board Meetings, purpose "Financial Results"): the meeting date only; the fallback for filings the
 *      first list lacks (older years, re-filings), tagged `bm` so the backtest can treat them as after-the-close announcements.
 *
 *   node scripts/results-dates.mjs                       # both lists, from the first history date to today, in 90-day windows
 *   node scripts/results-dates.mjs --from 2017-01-01 --to 2026-12-31
 *   node scripts/results-dates.mjs --csv CF-FR-equities-*.csv [--csv CF-BM-equities-*.csv]   # the pages' CSV downloads instead of the API
 *   node scripts/results-dates.mjs --reparse             # rebuild events.json from data/results/raw/ without touching NSE
 *   options: --no-bm (results list only)   --dry (print, write nothing)   --out file
 *
 * Every API response is saved verbatim under data/results/raw/<list>-<from>-<to>.json before it is parsed, so that if NSE's field
 * names differ from the ones this script knows, the fix is a --reparse in the next session, not another evening at home. Field
 * detection is by name pattern (symbol; a dissemination / broadcast / filing timestamp; a meeting date; the period) and the first
 * record's keys are printed, as corporate-actions.mjs does. Symbols are canonicalised to today's ticker through
 * data/membership/src/symbolchange.csv (the same chain the membership list uses), so an event filed under an old ticker lands on
 * the symbol the history files carry. Output: { built, from, to, sources, symbols: { SYM: [{date, time|null, period|null, src}] } }
 * de-duplicated per symbol and date, plus reports/results-dates-<date>.md with the coverage by year — read that before the backtest:
 * if the results list starts in, say, 2019, the PEAD window starts there and the hypothesis file says what that means. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseSymbolChanges, canonical } from './membership.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; }; const flag = n => args.includes('--' + n);
const csvs = []; args.forEach((a, i) => { if (a === '--csv' && args[i + 1]) csvs.push(args[i + 1]); });
const DATA = path.join(ROOT, 'data'); const HIST = path.join(DATA, 'history'); const RAW = path.join(DATA, 'results', 'raw'); const OUT = opt('out', path.join(DATA, 'results', 'events.json'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const HDR = { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9', Referer: 'https://www.nseindia.com/companies-listing/corporate-filings-financial-results' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/* ---------- parsing ---------- */
/** "13-Nov-2026 18:32:11" / "13-11-2026" / "2026-11-13T18:32:11" / "13 Nov 2026" → { date: ISO, time: 'HH:MM' | null } or null. */
export function parseStamp(s) {
  if (s == null) return null; s = String(s).trim(); if (!s || /^(-|null|na|n\/a)$/i.test(s)) return null;
  let date = null, m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) date = `${m[1]}-${m[2]}-${m[3]}`;
  else if ((m = s.match(/^(\d{1,2})[-\s\/]([A-Za-z]{3})[a-z]*[-\s\/](\d{4})/))) { const k = MON.indexOf(m[2].slice(0, 3).toUpperCase()); if (k >= 0) date = `${m[3]}-${String(k + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  else if ((m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/))) date = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (!date) return null;
  const t = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?/); let time = null;
  if (t) { let h = +t[1]; const mm = t[2]; if (t[3]) { const pm = /pm/i.test(t[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; } time = `${String(h).padStart(2, '0')}:${mm}`; }
  return { date, time };
}
const findKey = (obj, patterns) => { const keys = Object.keys(obj); for (const p of patterns) { const k = keys.find(k => p.test(k)); if (k) return k; } return null; };
/** One record of either list → { symbol, date, time, period, src } or null. `src` 'fr' (financial results) or 'bm' (board meeting). */
export function normaliseRecord(r, src) {
  if (!r || typeof r !== 'object') return null;
  const symK = findKey(r, [/^symbol$/i, /^sm_symbol$/i, /symbol/i]); if (!symK || !r[symK]) return null;
  const symbol = String(r[symK]).trim().toUpperCase(); if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return null;
  let stampK, stamp = null;
  if (src === 'fr') { stampK = findKey(r, [/exchdisstime/i, /dissem/i, /broadcast/i, /^an_dt$/i, /filing\s*date/i, /filingdate/i, /^date$/i, /date/i]); stamp = stampK ? parseStamp(r[stampK]) : null; }
  else { stampK = findKey(r, [/^bm_date$/i, /meeting\s*date/i, /meetingdate/i, /^bm_timestamp$/i, /^date$/i, /date/i]); stamp = stampK ? parseStamp(r[stampK]) : null; if (stamp) stamp.time = null;   // a meeting date says nothing about the hour the result went out
    const purposeK = findKey(r, [/purpose/i, /^bm_desc$/i, /desc/i, /subject/i]); if (purposeK && !/result|financial|quarter|audited|unaudited/i.test(String(r[purposeK]))) return null; }
  if (!stamp) return null;
  const perK = findKey(r, [/^relatingto$/i, /^period$/i, /relating/i, /^qe$/i, /quarter/i, /^todate$/i, /^to_date$/i]); const period = perK && r[perK] ? String(r[perK]).trim() : null;
  if (src === 'fr') { const kind = findKey(r, [/^period$/i, /periodicity/i]); if (kind && r[kind] && /annual|half|nine/i.test(String(r[kind])) && !/quarter/i.test(String(r[kind]))) return { symbol, date: stamp.date, time: stamp.time, period, src, skip: String(r[kind]) }; }
  return { symbol, date: stamp.date, time: stamp.time, period, src };
}
export function parseCSV(text) { const rows = []; let row = [], cell = '', q = false; for (let i = 0; i < text.length; i++) { const ch = text[i];
  if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
  else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch; }
  if (cell || row.length) { row.push(cell); rows.push(row); } return rows.filter(r => r.some(c => c.trim())); }
const listOf = j => Array.isArray(j) ? j : j && typeof j === 'object' ? (j.data || j.rows || j.results || Object.values(j).find(v => Array.isArray(v)) || []) : [];

/** rows (already normalised) → events keyed by canonical symbol, de-duplicated per symbol+date; a `bm` event is dropped when an `fr`
 *  event for the same symbol sits within 3 days of it (the filing the meeting produced). */
export function buildEvents(rows, changes) {
  const bySym = {}; let renamed = 0, skipped = 0;
  for (const r of rows) { if (!r) continue; if (r.skip) { skipped++; continue; } const c = changes ? canonical(r.symbol, r.date, changes) : { sym: r.symbol, via: [] }; if (c.via.length) renamed++;
    (bySym[c.sym] || (bySym[c.sym] = [])).push({ date: r.date, time: r.time, period: r.period, src: r.src }); }
  let dupes = 0, bmDropped = 0;
  for (const s of Object.keys(bySym)) { const list = bySym[s].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.src === 'fr' ? -1 : 1));
    const out = []; for (const e of list) { const prev = out[out.length - 1]; if (prev && prev.date === e.date) { dupes++; if (!prev.time && e.time) { prev.time = e.time; prev.src = e.src; } continue; } out.push(e); }
    const fr = out.filter(e => e.src === 'fr'); const kept = out.filter(e => e.src === 'fr' || !fr.some(f => Math.abs(new Date(f.date) - new Date(e.date)) <= 3 * 86400000)); bmDropped += out.length - kept.length;
    bySym[s] = kept; }
  return { symbols: bySym, renamed, skipped, dupes, bmDropped };
}

/* ---------- sources ---------- */
async function session() { const res = await fetch('https://www.nseindia.com/', { headers: HDR }); return (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; '); }
const dmy = d => { const [y, m, dd] = d.split('-'); return `${dd}-${m}-${y}`; };
const ENDPOINTS = {
  fr: (a, b) => `https://www.nseindia.com/api/corporates-financial-results?index=equities&from_date=${dmy(a)}&to_date=${dmy(b)}&period=Quarterly`,
  bm: (a, b) => `https://www.nseindia.com/api/corporate-board-meetings?index=equities&from_date=${dmy(a)}&to_date=${dmy(b)}`,
};
async function pull(src, fromISO, toISO, days) {
  let cookie = await session(); const rows = []; let a = new Date(fromISO + 'T00:00:00Z'); const end = new Date(toISO + 'T00:00:00Z'); let n = 0, empty = 0, shown = false;
  while (a <= end) { const b = new Date(Math.min(end.getTime(), a.getTime() + (days - 1) * 86400000)); const A = a.toISOString().slice(0, 10), B = b.toISOString().slice(0, 10);
    const file = path.join(RAW, `${src}-${A}-${B}.json`); let j = null;
    try { j = JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
    if (!j) { for (let t = 0; t < 4 && !j; t++) { try { const res = await fetch(ENDPOINTS[src](A, B), { headers: Object.assign({}, HDR, { Cookie: cookie }) }); const text = await res.text();
          if (res.ok && /^\s*[\[{]/.test(text)) j = JSON.parse(text); else { console.warn(`  ${src} ${A}→${B}: HTTP ${res.status}${/^\s*</.test(text) ? ' (HTML: bot filter)' : ''}; retrying`); cookie = await session(); await sleep(2500 * (t + 1)); } }
        catch (e) { console.warn(`  ${src} ${A}→${B}: ${e.message}; retrying`); await sleep(2500 * (t + 1)); } }
      if (!j) { console.error(`\nNSE did not answer four times for ${src} ${A}→${B}. Wait fifteen minutes and run the same command again (windows already saved under data/results/raw/ are not re-fetched), or use --csv with the page's download.`); process.exit(2); }
      await fs.mkdir(RAW, { recursive: true }); await fs.writeFile(file, JSON.stringify(j)); await sleep(900); }
    const list = listOf(j); if (!shown && list.length) { console.log(`  ${src} sample record keys: ${Object.keys(list[0]).join(', ')}`); shown = true; }
    if (!list.length) empty++; for (const r of list) rows.push(normaliseRecord(r, src)); n++;
    process.stdout.write(`\r  ${src} ${A} → ${B}: ${rows.filter(Boolean).length} rows in ${n} windows (${empty} empty)   `);
    a = new Date(b.getTime() + 86400000); }
  process.stdout.write('\n'); return rows;
}
async function reparse() { const rows = []; const files = (await fs.readdir(RAW).catch(() => [])).filter(f => /^(fr|bm)-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of files) { const src = f.slice(0, 2); const j = JSON.parse(await fs.readFile(path.join(RAW, f), 'utf8')); for (const r of listOf(j)) rows.push(normaliseRecord(r, src)); }
  console.log(`reparsed ${files.length} saved windows → ${rows.filter(Boolean).length} rows`); return rows; }
async function fromCSV(file) { const rows = parseCSV(await fs.readFile(file, 'utf8')); if (rows.length < 2) return []; const hdr = rows[0].map(h => h.trim()); const src = hdr.some(h => /meeting|purpose|bm_/i.test(h)) ? 'bm' : 'fr';
  const out = rows.slice(1).map(r => normaliseRecord(Object.fromEntries(hdr.map((h, k) => [h, r[k]])), src)); console.log(`  ${path.basename(file)}: ${out.filter(Boolean).length} rows read as ${src === 'fr' ? 'financial results' : 'board meetings'} (columns: ${hdr.join(', ')})`); return out; }

/* ---------- report ---------- */
export function coverage(ev, bars) {
  const years = {}; let total = 0, withTime = 0, bm = 0; const inHist = new Set(bars ? Object.keys(bars.sym) : []); let notInHist = 0; const symsPerYear = {};
  for (const [s, list] of Object.entries(ev.symbols)) { if (bars && !inHist.has(s)) notInHist++; for (const e of list) { const y = e.date.slice(0, 4); years[y] = (years[y] || 0) + 1; (symsPerYear[y] || (symsPerYear[y] = new Set())).add(s); total++; if (e.time) withTime++; if (e.src === 'bm') bm++; } }
  const afterClose = Object.values(ev.symbols).flat().filter(e => e.time && e.time >= '15:30').length;
  return { total, withTime, afterClose, bm, symbols: Object.keys(ev.symbols).length, notInHist, years: Object.fromEntries(Object.keys(years).sort().map(y => [y, { events: years[y], symbols: symsPerYear[y].size }])) };
}

/* ---------- main ---------- */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const files = []; for (const f of (await fs.readdir(HIST).catch(() => [])).sort()) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
  const bars = files.length ? E.buildBars(files, []) : null; const first = bars ? bars.dates[0] : '2016-01-01', last = bars ? bars.dates[bars.dates.length - 1] : new Date().toISOString().slice(0, 10);
  const from = opt('from', first), to = opt('to', last);
  let changes = null; try { changes = parseSymbolChanges(await fs.readFile(path.join(DATA, 'membership', 'src', 'symbolchange.csv'), 'utf8')); } catch { console.warn('no data/membership/src/symbolchange.csv — symbols are not canonicalised (events filed under old tickers will miss their bars)'); }
  let rows = [];
  if (csvs.length) for (const f of csvs) rows.push(...await fromCSV(f));
  else if (flag('reparse')) rows = await reparse();
  else { console.log(`pulling NSE's financial-results list ${from} → ${to} in 90-day windows (raw responses saved under data/results/raw/)`); rows.push(...await pull('fr', from, to, 90));
    if (!flag('no-bm')) { console.log('pulling the board-meetings list (fallback for filings the first list lacks)'); rows.push(...await pull('bm', from, to, 90)); } }
  const ev = buildEvents(rows, changes); const cov = coverage(ev, bars);
  const built = new Date().toISOString().slice(0, 10);
  const yrs = Object.entries(cov.years); const firstFull = yrs.find(([, v]) => v.events >= 1200);   // ~400 names × 4 quarters: the first year the list looks complete
  const L = [`# Results dates — built ${built}`, '', `Sources: ${csvs.length ? csvs.map(f => path.basename(f)).join(', ') : flag('reparse') ? 'data/results/raw/ (reparsed)' : `NSE financial-results list${flag('no-bm') ? '' : ' + board-meetings list'}, ${from} → ${to}`}. ${rows.filter(Boolean).length} rows read, ${ev.skipped} non-quarterly filings skipped, ${ev.dupes} duplicates folded, ${ev.bmDropped} board-meeting dates dropped as the twin of a filing within 3 days, ${ev.renamed} rows re-keyed through symbolchange.csv.`, '',
    `**${cov.total} events on ${cov.symbols} symbols**; ${cov.withTime} (${cov.total ? Math.round(cov.withTime / cov.total * 100) : 0}%) carry a dissemination time, of which ${cov.afterClose} are at or after 15:30; ${cov.bm} come from the board-meetings list (no time → treated as after the close). ${cov.notInHist} symbols have no bars in data/history/ (names outside the ever-member universe, or tickers symbolchange.csv does not cover — the backtest ignores them and lists them).`, '',
    '## Coverage by year', '', '| year | events | symbols | reading |', '|---|---|---|---|', ...yrs.map(([y, v]) => `| ${y} | ${v.events} | ${v.symbols} | ${v.events >= 1200 ? 'looks complete (≥ 4 per name for 300+ names)' : v.events >= 300 ? 'partial' : 'thin — the list does not reach back this far, or the pull missed windows'} |`), '',
    firstFull ? `The first year that looks complete is **${firstFull[0]}**: the PEAD backtest's window starts there (reports/pead-hypotheses-2026-11-13.md says what a short window means for the verdict).` : '**No year looks complete.** Check the sample keys printed above against normaliseRecord() in scripts/results-dates.mjs, fix the field pattern, and run again with --reparse — the raw responses are saved.', '',
    '## How it is used', '', 'The PEAD backtest (`node scripts/backtest-pead.mjs`) maps each event to its reaction day — the timestamp\'s own day if it is a trading day and the time is before 15:30, else the next trading day — and reads the close-to-close return and the volume multiple on that day. Events are keyed by today\'s ticker; the backtest applies point-in-time NIFTY 500 membership on the reaction day.'];
  console.log('\n' + L.slice(0, 12).join('\n'));
  if (flag('dry')) process.exit(0);
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify({ built, from, to, sources: csvs.length ? csvs.map(f => path.basename(f)) : flag('reparse') ? ['raw'] : ['fr'].concat(flag('no-bm') ? [] : ['bm']), coverage: cov, symbols: ev.symbols }, null, 0));
  await fs.mkdir(path.join(ROOT, 'reports'), { recursive: true }); await fs.writeFile(path.join(ROOT, 'reports', `results-dates-${built}.md`), L.join('\n'));
  console.log(`\nwrote ${path.relative(ROOT, OUT)} and reports/results-dates-${built}.md`);
}
