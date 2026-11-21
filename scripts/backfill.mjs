#!/usr/bin/env node
/* One-time (and resumable) history backfill from NSE's daily bhavcopy archives.
 *
 *   node scripts/backfill.mjs --from 2024-01-01            # to today
 *   node scripts/backfill.mjs --from 2023-01-01 --to 2024-12-31
 *   node scripts/backfill.mjs --years 2                    # last 2 years
 *   node scripts/backfill.mjs --from 2025-01-01 --universe nifty500   # (default) | nifty50 | all
 *   node scripts/backfill.mjs --years 10 --members                     # past members: add every name that was ever in the index
 *   node scripts/backfill.mjs --from 2016-11-07 --weekends --members   # the sessions NSE held on a Saturday or Sunday, and nothing else
 *
 * Writes data/history/<year>.json (aligned OHLCV+turnover per symbol, plus NIFTY 50 index bars),
 * refreshes data/sectors.json from the Nifty 500 constituent list (industry → sector), and skips any
 * date already present, so you can stop and re-run (a saved day missing its NIFTY 50 bar gets the bar
 * filled in without a re-fetch). Run it from your own computer (NSE's archive host refuses most cloud
 * IPs). Expect ~1 second per trading day: two years ≈ 10 minutes.
 *
 * --members (12 Nov 2026, ROADMAP item 5c): the universe is every symbol that was ever a NIFTY 500 member
 * according to data/membership/members.json, days already saved are visited again and only the symbols
 * still missing a close that day are added, and a bhavcopy symbol is stored under today's ticker by
 * following NSE's symbolchange.csv (plus the renames in data/membership/overrides.json) forward from
 * that day — so a company renamed since gets its pre-rename bars too. Nothing already in the files is
 * rewritten. Ten years is one fetch per trading day again, about an hour; progress is saved every 20 days.
 *
 * Weekend sessions (21 Nov 2026, audit A18). NSE trades on some Saturdays and Sundays — the Muhurat hour when Diwali falls on
 * a weekend, Budget day, the disaster-recovery drills — and until now this script skipped every weekend date, so none of
 * those sessions was in ten years of history (seen on 9 Nov 2026: the previous close on file differed from NSE's for 350 of
 * 500 names, because Sunday 8 Nov's Muhurat session was missing). Now:
 *   - a weekend date in the last 60 days of the range is tried on every run (a 404 means no session, as for a holiday), so
 *     the top-up the digest's HISTORY GAP line asks for picks the missing day up by itself;
 *   - `--weekends` visits every weekend date in the range that is not on file, and no weekday — the one-off catch-up for
 *     the past (ten years is about 1,040 dates, nearly all of them a quick 404). Use it with --members, so the day gets
 *     every name that was a member, not only today's 500.
 * A weekend session is added only together with its NIFTY 50 bar: a day without it would leave a hole in the gate's average.
 * The bar comes from NSE's index history; when that call has no row for the session (2 Mar 2024, the disaster-recovery drill:
 * found by the owner's home run on 21 Nov 2026 — the bhavcopy and NSE's total-return files have the day, the index-history call
 * does not), from NSE's daily index file for the date (ind_close_all_DDMMYYYY.csv on the archive host), and failing that from
 * data/index-bars.json, a short list of such bars with the source of each figure. If none of the three has it, the date is
 * listed at the end and nothing is added.
 *
 * NSE's host (audit A17): the index-history call follows NSE to whichever host answers (scripts/nse.mjs).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { nseSession, nseHeaders, parseIndexHistory, parseIndexCloseAll } from './nse.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const DATA = path.join(ROOT, 'data'), HIST = path.join(DATA, 'history');
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const HDR = { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9', 'Referer': 'https://www.nseindia.com/' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const iso = d => d.toISOString().slice(0, 10);
const todayIST = () => new Date(Date.now() + 330 * 60000);

let from = arg('from'), to = arg('to', iso(todayIST())); const years = arg('years');
if (!from && years) { const d = todayIST(); d.setUTCFullYear(d.getUTCFullYear() - Number(years)); from = iso(d); }
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!from && isMain) { console.error('usage: node scripts/backfill.mjs --from YYYY-MM-DD [--to YYYY-MM-DD] | --years N [--members] [--weekends]'); process.exit(2); }
const universeMode = arg('universe', 'nifty500'); const membersMode = argv.includes('--members'); const weekendsOnly = argv.includes('--weekends');
const RECENT_WEEKEND_DAYS = 60;

/** Which dates a run looks at (audit A18). Weekdays always, unless `weekendsOnly`; a Saturday or Sunday when `weekendsOnly`, or when it
 *  falls in the last RECENT_WEEKEND_DAYS days up to `to`. Returns 'weekday', 'weekend' or null (not visited). */
export function visitKind(date, { to, weekendsOnly }) {
  const d = new Date(date + 'T00:00:00Z'); const dow = d.getUTCDay(); const weekend = dow === 0 || dow === 6;
  if (!weekend) return weekendsOnly ? null : 'weekday';
  if (weekendsOnly) return 'weekend';
  return (Date.parse(to + 'T00:00:00Z') - d.getTime()) / 86400000 <= RECENT_WEEKEND_DAYS ? 'weekend' : null;
}
const pause = Number(arg('pause', '900'));

/** --members: the rows to add for one day. `rows` are the bhavcopy's EQ rows; `canon(sym, date)` maps a symbol as it
 *  stood that day to today's ticker; `ever` is the set of today's tickers that were ever members; `has(sym)` says whether
 *  the file already holds a close for that ticker on the day. Returns { rows: snapRows keyed by today's ticker, renamed }. */
export function membersRows(rows, date, { ever, canon, has }) {
  const out = {}; let renamed = 0;
  for (const r of rows) { if (!(r.c > 0)) continue; const c = canon(r.sym, date); const sym = c.sym; if (!ever.has(sym) || has(sym)) continue; if (sym !== r.sym) renamed++;
    out[sym] = [r.o, r.h, r.l, null, r.c, null, null, r.v, r.t, null, null, null]; }
  return { rows: out, renamed };
}

/* ---------- minimal zip reader (single-entry zip, deflate or stored) ---------- */
function unzipFirst(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); if (eocd < 0) throw new Error('not a zip');
  const cdOff = buf.readUInt32LE(eocd + 16); const method = buf.readUInt16LE(cdOff + 10); const csize = buf.readUInt32LE(cdOff + 20);
  const nlen = buf.readUInt16LE(cdOff + 28), xlen = buf.readUInt16LE(cdOff + 30); const lho = buf.readUInt32LE(cdOff + 42);
  const name = buf.slice(cdOff + 46, cdOff + 46 + nlen).toString();
  const lnlen = buf.readUInt16LE(lho + 26), lxlen = buf.readUInt16LE(lho + 28); const start = lho + 30 + lnlen + lxlen;
  const data = buf.slice(start, start + csize);
  return { name, text: (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8') };
}
async function get(url, opts = {}) {
  const res = await fetch(url, { headers: Object.assign({}, HDR, opts.headers || {}), redirect: 'follow' });
  if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
  return opts.binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
}
/* ---------- bhavcopy: new UDiFF format (from 8 Jul 2024) and the old cm<date>bhav format before it ---------- */
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function bhavUrls(date) { const [y, m, d] = date.split('-'); const ymd = y + m + d; const mon = MON[Number(m) - 1];
  return [`https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${ymd}_F_0000.csv.zip`, `https://nsearchives.nseindia.com/content/historical/EQUITIES/${y}/${mon}/cm${d}${mon}${y}bhav.csv.zip`]; }
function parseBhav(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim()); const hdr = lines[0].split(',').map(h => h.trim());
  const H = {}; hdr.forEach((h, i) => (H[h] = i)); const out = [];
  const isNew = H.TckrSymb != null;
  for (const line of lines.slice(1)) { const c = line.split(','); const g = k => (H[k] == null ? null : c[H[k]]);
    if (isNew) { if (g('SctySrs') !== 'EQ') continue; out.push({ sym: g('TckrSymb'), o: +g('OpnPric'), h: +g('HghPric'), l: +g('LwPric'), c: +g('ClsPric'), v: +g('TtlTradgVol'), t: +g('TtlTrfVal') / 1e7 }); }
    else { if (g('SERIES') !== 'EQ') continue; out.push({ sym: g('SYMBOL'), o: +g('OPEN'), h: +g('HIGH'), l: +g('LOW'), c: +g('CLOSE'), v: +g('TOTTRDQTY'), t: +g('TOTTRDVAL') / 1e7 }); } }
  return out;
}
async function fetchBhav(date) {
  let lastErr;
  for (const url of bhavUrls(date)) { try { const buf = await get(url, { binary: true }); return parseBhav(unzipFirst(buf).text); } catch (e) { lastErr = e; if (e.status && e.status !== 404 && e.status !== 403) break; } }
  if (lastErr && lastErr.status === 404) return null; // holiday
  throw lastErr || new Error('no bhavcopy');
}
/* ---------- NIFTY 50 index history (best effort) ---------- */
async function fetchIndexHistory(fromISO, toISO) {
  const f = d => { const [y, m, dd] = d.split('-'); return `${dd}-${m}-${y}`; };
  const out = {}; // date → {o,h,l,c}
  try {
    const s = await nseSession('/', { headers: HDR }); if (s.moved) console.log(`NSE answered on ${s.origin}; the index-history calls go there`);
    let a = new Date(fromISO); const end = new Date(toISO);
    while (a <= end) { const b = new Date(Math.min(end.getTime(), a.getTime() + 89 * 86400000));
      const url = `${s.origin}/api/historicalOR/indicesHistory?indexType=${encodeURIComponent('NIFTY 50')}&from=${f(iso(a))}&to=${f(iso(b))}`;
      const txt = await get(url, { headers: nseHeaders(s, { Accept: 'application/json' }) }); Object.assign(out, parseIndexHistory(JSON.parse(txt)));
      a = new Date(b.getTime() + 86400000); await sleep(600); }
    console.log(`index history: ${Object.keys(out).length} days`);
  } catch (e) { console.warn('index history unavailable (' + e.message + ') — regime will use breadth, relative strength will use the universe median'); }
  return out;
}
/* ---------- a NIFTY 50 bar the index history does not have (weekend sessions only) ---------- */
let indexBarsFile; const dmy8 = date => { const [y, m, d] = date.split('-'); return d + m + y; };
/** → { o, h, l, c, source } or null. NSE's daily index file first; then data/index-bars.json. When both exist and disagree by more than 0.05%, NSE's file is used and the difference is printed. */
async function indexBarFallback(date) {
  let fromFile = null; try { fromFile = parseIndexCloseAll(await get(`https://nsearchives.nseindia.com/content/indices/ind_close_all_${dmy8(date)}.csv`), 'NIFTY 50'); } catch (e) { console.warn(`${date}: NSE's daily index file not available (${e.message})`); }
  if (indexBarsFile === undefined) indexBarsFile = await readJSON(path.join(DATA, 'index-bars.json'), null);
  const listed = indexBarsFile && indexBarsFile['NIFTY 50'] && indexBarsFile['NIFTY 50'][date]; const ok = listed && listed.c > 0;
  if (fromFile) { if (ok && Math.abs(fromFile.c / listed.c - 1) > 0.0005) console.warn(`${date}: NSE's daily index file says NIFTY 50 ${fromFile.c}, data/index-bars.json says ${listed.c} — using NSE's file; correct the list`);
    return Object.assign({ source: "NSE's daily index file" }, fromFile); }
  return ok ? { o: listed.o ?? null, h: listed.h ?? null, l: listed.l ?? null, c: listed.c, source: 'data/index-bars.json' } : null;
}
/* ---------- universe + sectors from the constituent list ---------- */
async function constituents(mode) {
  if (mode === 'all') return { set: null, industries: {} };
  const file = mode === 'nifty50' ? 'ind_nifty50list.csv' : 'ind_nifty500list.csv';
  try { const txt = await get('https://nsearchives.nseindia.com/content/indices/' + file); const lines = txt.split(/\r?\n/).filter(Boolean); const hdr = lines[0].split(',').map(s => s.trim().toLowerCase());
    const iS = hdr.indexOf('symbol'), iI = hdr.indexOf('industry'); const set = new Set(), industries = {};
    for (const l of lines.slice(1)) { const c = l.split(','); const s = (c[iS] || '').trim(); if (!s) continue; set.add(s); if (iI >= 0 && c[iI]) industries[s] = c[iI].trim(); }
    console.log(`constituents: ${set.size} from ${file}`); return { set, industries }; }
  catch (e) { console.warn('constituent list unavailable (' + e.message + ') — using symbols already in data/ plus everything in the bhavcopy');
    const set = new Set(); try { for (const f of await fs.readdir(path.join(DATA, 'snapshots'))) { const s = JSON.parse(await fs.readFile(path.join(DATA, 'snapshots', f), 'utf8')); Object.keys(s.rows).forEach(k => set.add(k)); } } catch {}
    return { set: set.size ? set : null, industries: {} }; }
}
async function readJSON(p, fb) { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fb; } }

/* ---------- main ---------- */
async function main() {
await fs.mkdir(HIST, { recursive: true });
const { set: universe, industries } = await constituents(universeMode);
// --members: every ticker that was ever a member, and the rename chain so old bhavcopy symbols land under today's ticker
let members = null;
if (membersMode) { const MB = await import('./membership.mjs'); const M = await readJSON(path.join(DATA, 'membership', 'members.json'), null);
  if (!M) { console.error('--members needs data/membership/members.json. Build it first: node scripts/membership.mjs'); process.exit(2); }
  const changes = MB.parseSymbolChanges(await fs.readFile(path.join(DATA, 'membership', 'src', 'symbolchange.csv'), 'utf8')); const ov = await readJSON(path.join(DATA, 'membership', 'overrides.json'), {});
  for (const r of ov.renames || []) { (changes[r.from] || (changes[r.from] = [])).push({ to: r.to, date: r.date }); changes[r.from].sort((a, b) => a.date < b.date ? -1 : 1); }
  members = { ever: new Set(Object.keys(M.symbols)), canon: (sym, date) => MB.canonical(sym, date, changes) };
  console.log(`members mode: ${members.ever.size} tickers were ever NIFTY 500 members (${M.from} → ${M.asOf}); saved days are revisited for the ones still missing`); }
const index = await fetchIndexHistory(from, to);
const files = {}; const loadYear = async y => files[y] || (files[y] = await readJSON(path.join(HIST, y + '.json'), { year: Number(y), dates: [], symbols: {}, index: null }));
let d = new Date(from); const end = new Date(to); let added = 0, skipped = 0, holidays = 0, failures = 0, filled = 0, indexFilled = 0, renamedRows = 0;
const weekendAdded = [], weekendNoIndex = [], weekendRefused = []; let weekendTried = 0;
if (weekendsOnly) console.log(`weekends only: every Saturday and Sunday from ${from} to ${to} that is not on file is asked for; weekdays are left alone`);
while (d <= end) {
  const date = iso(d); d = new Date(d.getTime() + 86400000);
  const kind = visitKind(date, { to, weekendsOnly }); if (!kind) continue; const weekend = kind === 'weekend';
  const yf = await loadYear(date.slice(0, 4)); const k = yf.dates.indexOf(date); let ix = index[date];
  if (k >= 0 && !membersMode) { skipped++;
    if (ix && (!yf.index || yf.index.c[k] == null)) { E.appendSnapshotToHistory(yf, { date, rows: {}, index: { name: 'NIFTY 50', open: ix.o, high: ix.h, low: ix.l, ltp: ix.c } }); indexFilled++; }   // gap (a): a saved day without its index bar
    continue; }
  try {
    if (weekend && k < 0) weekendTried++;
    const rows = await fetchBhav(date);
    if (!rows) { holidays++; if (weekend) await sleep(Math.min(pause, 250)); continue; }
    if (weekend && k < 0 && !ix) { ix = await indexBarFallback(date); if (ix) console.log(`${date}: the index history has no NIFTY 50 bar for this session; taken from ${ix.source} (${ix.c})`); }
    if (weekend && k < 0 && !ix) { weekendNoIndex.push(date); console.warn(`${date}: NSE held a session (${rows.length} rows in the bhavcopy) but neither the index history, nor NSE's daily index file, nor data/index-bars.json has its NIFTY 50 bar — not added`); await sleep(pause); continue; }
    let snapRows;
    if (membersMode) { const has = sym => k >= 0 && yf.symbols[sym] && yf.symbols[sym].c[k] != null; const r = membersRows(rows, date, { ever: members.ever, canon: members.canon, has }); snapRows = r.rows; renamedRows += r.renamed; }
    else { snapRows = {}; for (const r of rows) { if (universe && !universe.has(r.sym)) continue; if (!(r.c > 0)) continue; snapRows[r.sym] = [r.o, r.h, r.l, null, r.c, null, null, r.v, r.t, null, null, null]; } }
    const snap = { date, rows: snapRows, index: ix ? { name: 'NIFTY 50', open: ix.o, high: ix.h, low: ix.l, ltp: ix.c } : null };
    const n = Object.keys(snapRows).length; if (k >= 0 && !n && !(ix && (!yf.index || yf.index.c[k] == null))) { skipped++; await sleep(pause); continue; }   // members mode: nothing missing that day
    E.appendSnapshotToHistory(yf, snap); if (k >= 0) { filled++; if (ix && (!yf.index || yf.index.c[k] == null)) indexFilled++; } else { added++; if (weekend) { weekendAdded.push(date); console.log(`${date}: weekend session added — ${n} symbols, NIFTY 50 ${ix.c}`); } }
    if ((added + filled) % 20 === 0) { await fs.writeFile(path.join(HIST, yf.year + '.json'), JSON.stringify(yf)); console.log(`${date}: ${n} symbols (saved, ${added} days added, ${filled} days topped up so far)`); }
  } catch (e) { if (weekend && k < 0) { weekendRefused.push(date); console.warn(`${date}: no answer for this weekend date (${e.message})`); await sleep(pause); continue; }   // not counted towards the stop below: an odd answer for a file that never existed is not a block
    failures++; console.warn(`${date}: failed (${e.message})`); if (failures > 15) { console.error('too many failures — NSE may be blocking this IP; wait and re-run (progress is saved)'); break; } }
  await sleep(pause);
}
for (const yf of Object.values(files)) { yf.dates.sort(); await fs.writeFile(path.join(HIST, yf.year + '.json'), JSON.stringify(yf)); }
// sectors.json: fill industries for symbols the built-in map doesn't know
if (Object.keys(industries).length) { const sec = await readJSON(path.join(DATA, 'sectors.json'), { map: {} }); let n = 0;
  for (const [s, ind] of Object.entries(industries)) if (!E.SECTOR_OF[s] && !sec.map[s]) { sec.map[s] = ind; n++; }
  await fs.writeFile(path.join(DATA, 'sectors.json'), JSON.stringify(sec, null, 1)); console.log(`sectors.json: +${n} industry mappings`); }
const idx = await readJSON(path.join(DATA, 'index.json'), { dates: [] }); idx.historyYears = (await fs.readdir(HIST)).filter(f => /^\d{4}\.json$/.test(f)).map(f => Number(f.slice(0, 4))).sort();
await fs.writeFile(path.join(DATA, 'index.json'), JSON.stringify(idx, null, 1));
if (weekendTried) console.log(`weekend dates: ${weekendTried} asked for, ${weekendAdded.length} session(s) found and added${weekendAdded.length ? ' (' + weekendAdded.join(', ') + ')' : ''}${weekendNoIndex.length ? `; ${weekendNoIndex.length} sessions NOT added for want of their NIFTY 50 bar (${weekendNoIndex.join(', ')}) — if the index history was unavailable run again; otherwise add the bar to data/index-bars.json with its source` : ''}${weekendRefused.length ? `; ${weekendRefused.length} got an answer that was neither a file nor a 404 (${weekendRefused.slice(0, 8).join(', ')}${weekendRefused.length > 8 ? ', …' : ''}) — run again to retry those` : ''}`);
console.log(`done: ${added} days added${membersMode ? `, ${filled} saved days topped up with missing members (${renamedRows} rows stored under a later ticker)` : ''}, ${skipped} already present${indexFilled ? ` (${indexFilled} given their missing NIFTY 50 bar)` : ''}, ${holidays} holidays/weekends skipped, ${failures} failures. History years: ${idx.historyYears.join(', ')}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
