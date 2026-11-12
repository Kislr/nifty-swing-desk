#!/usr/bin/env node
/* One-time (and resumable) history backfill from NSE's daily bhavcopy archives.
 *
 *   node scripts/backfill.mjs --from 2024-01-01            # to today
 *   node scripts/backfill.mjs --from 2023-01-01 --to 2024-12-31
 *   node scripts/backfill.mjs --years 2                    # last 2 years
 *   node scripts/backfill.mjs --from 2025-01-01 --universe nifty500   # (default) | nifty50 | all
 *   node scripts/backfill.mjs --years 10 --members                     # past members: add every name that was ever in the index
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
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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
if (!from && isMain) { console.error('usage: node scripts/backfill.mjs --from YYYY-MM-DD [--to YYYY-MM-DD] | --years N [--members]'); process.exit(2); }
const universeMode = arg('universe', 'nifty500'); const membersMode = argv.includes('--members');
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
    const cookie = await (async () => { const res = await fetch('https://www.nseindia.com/', { headers: HDR }); return (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; '); })();
    let a = new Date(fromISO); const end = new Date(toISO);
    while (a <= end) { const b = new Date(Math.min(end.getTime(), a.getTime() + 89 * 86400000));
      const url = `https://www.nseindia.com/api/historicalOR/indicesHistory?indexType=${encodeURIComponent('NIFTY 50')}&from=${f(iso(a))}&to=${f(iso(b))}`;
      const txt = await get(url, { headers: { Cookie: cookie, Accept: 'application/json' } }); const j = JSON.parse(txt);
      for (const r of (j.data || [])) { const m = String(r.EOD_TIMESTAMP).match(/(\d{2})-([A-Z]{3})-(\d{4})/); if (!m) continue; const d = `${m[3]}-${String(MON.indexOf(m[2]) + 1).padStart(2, '0')}-${m[1]}`;
        out[d] = { o: r.EOD_OPEN_INDEX_VAL, h: r.EOD_HIGH_INDEX_VAL, l: r.EOD_LOW_INDEX_VAL, c: r.EOD_CLOSE_INDEX_VAL }; }
      a = new Date(b.getTime() + 86400000); await sleep(600); }
    console.log(`index history: ${Object.keys(out).length} days`);
  } catch (e) { console.warn('index history unavailable (' + e.message + ') — regime will use breadth, relative strength will use the universe median'); }
  return out;
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
while (d <= end) {
  const date = iso(d); const dow = d.getUTCDay(); d = new Date(d.getTime() + 86400000);
  if (dow === 0 || dow === 6) continue;
  const yf = await loadYear(date.slice(0, 4)); const k = yf.dates.indexOf(date); const ix = index[date];
  if (k >= 0 && !membersMode) { skipped++;
    if (ix && (!yf.index || yf.index.c[k] == null)) { E.appendSnapshotToHistory(yf, { date, rows: {}, index: { name: 'NIFTY 50', open: ix.o, high: ix.h, low: ix.l, ltp: ix.c } }); indexFilled++; }   // gap (a): a saved day without its index bar
    continue; }
  try {
    const rows = await fetchBhav(date);
    if (!rows) { holidays++; continue; }
    let snapRows;
    if (membersMode) { const has = sym => k >= 0 && yf.symbols[sym] && yf.symbols[sym].c[k] != null; const r = membersRows(rows, date, { ever: members.ever, canon: members.canon, has }); snapRows = r.rows; renamedRows += r.renamed; }
    else { snapRows = {}; for (const r of rows) { if (universe && !universe.has(r.sym)) continue; if (!(r.c > 0)) continue; snapRows[r.sym] = [r.o, r.h, r.l, null, r.c, null, null, r.v, r.t, null, null, null]; } }
    const snap = { date, rows: snapRows, index: ix ? { name: 'NIFTY 50', open: ix.o, high: ix.h, low: ix.l, ltp: ix.c } : null };
    const n = Object.keys(snapRows).length; if (k >= 0 && !n && !(ix && (!yf.index || yf.index.c[k] == null))) { skipped++; await sleep(pause); continue; }   // members mode: nothing missing that day
    E.appendSnapshotToHistory(yf, snap); if (k >= 0) { filled++; if (ix && (!yf.index || yf.index.c[k] == null)) indexFilled++; } else added++;
    if ((added + filled) % 20 === 0) { await fs.writeFile(path.join(HIST, yf.year + '.json'), JSON.stringify(yf)); console.log(`${date}: ${n} symbols (saved, ${added} days added, ${filled} days topped up so far)`); }
  } catch (e) { failures++; console.warn(`${date}: failed (${e.message})`); if (failures > 15) { console.error('too many failures — NSE may be blocking this IP; wait and re-run (progress is saved)'); break; } }
  await sleep(pause);
}
for (const yf of Object.values(files)) { yf.dates.sort(); await fs.writeFile(path.join(HIST, yf.year + '.json'), JSON.stringify(yf)); }
// sectors.json: fill industries for symbols the built-in map doesn't know
if (Object.keys(industries).length) { const sec = await readJSON(path.join(DATA, 'sectors.json'), { map: {} }); let n = 0;
  for (const [s, ind] of Object.entries(industries)) if (!E.SECTOR_OF[s] && !sec.map[s]) { sec.map[s] = ind; n++; }
  await fs.writeFile(path.join(DATA, 'sectors.json'), JSON.stringify(sec, null, 1)); console.log(`sectors.json: +${n} industry mappings`); }
const idx = await readJSON(path.join(DATA, 'index.json'), { dates: [] }); idx.historyYears = (await fs.readdir(HIST)).filter(f => /^\d{4}\.json$/.test(f)).map(f => Number(f.slice(0, 4))).sort();
await fs.writeFile(path.join(DATA, 'index.json'), JSON.stringify(idx, null, 1));
console.log(`done: ${added} days added${membersMode ? `, ${filled} saved days topped up with missing members (${renamedRows} rows stored under a later ticker)` : ''}, ${skipped} already present${indexFilled ? ` (${indexFilled} given their missing NIFTY 50 bar)` : ''}, ${holidays} holidays/weekends skipped, ${failures} failures. History years: ${idx.historyYears.join(', ')}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
