/* Total-return benchmark series from niftyindices.com, for the momentum backtest's --benchmarks option.
 *
 * data/benchmarks/ holds the files exactly as the site names them — `<INDEX>_Historical_TR_DDMMYYYYtoDDMMYYYY.csv`,
 * one year each (the site's download limit), newest row first, columns IndexName / Date / Total Returns Index and,
 * for some indices, Net Total Return Index. loadBenchmarks() globs the folder, groups the files by index, stitches the
 * years into one ascending daily series per index and refuses to go on if two files disagree about a date.
 *
 * Also exported: the small set of pure helpers the report needs (value on or before a date, by-year returns, total
 * return / CAGR / max drawdown / Sharpe over a window), so a benchmark is measured exactly like the engine's equity
 * curve in momentum.js stats(). */
import fs from 'node:fs/promises';
import path from 'node:path';

const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
/** "12 Jun 2018" (the site's form), "12-Jun-2018" or an ISO date → "2018-06-12"; null when unreadable. */
export function isoDate(s) {
  if (!s) return null; s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -](\d{4})$/); if (!m) return null;
  const mo = MONTHS[m[2].toLowerCase()]; return mo ? `${m[3]}-${mo}-${m[1].padStart(2, '0')}` : null;
}
/** Minimal CSV: quoted or bare fields, comma separated, CRLF tolerated. Returns array of arrays. */
export function parseCsv(text) {
  const rows = []; for (const line of text.split(/\r?\n/)) { if (!line.trim()) continue; const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch; }
    cells.push(cur); rows.push(cells.map(c => c.trim())); }
  return rows;
}
const col = (hdr, re) => hdr.findIndex(h => re.test(h));

/** Parse one downloaded file → { name, rows: [{date, tr, ntr}] } (rows in file order; the site writes newest first). */
export function parseBenchmarkCsv(text, file) {
  const rows = parseCsv(text); if (rows.length < 2) throw new Error(`${file}: empty`);
  const hdr = rows[0].map(h => h.toLowerCase()); const iN = col(hdr, /index\s*name/), iD = col(hdr, /^date$/), iT = col(hdr, /^total\s*returns?\s*index$/), iNt = col(hdr, /net\s*total\s*return/);
  if (iD < 0 || iT < 0) throw new Error(`${file}: expected columns Date and "Total Returns Index", got ${rows[0].join(' | ')}`);
  const out = []; let name = null;
  for (const r of rows.slice(1)) { const d = isoDate(r[iD]); const tr = +r[iT]; if (!d || !isFinite(tr) || tr <= 0) throw new Error(`${file}: bad row ${JSON.stringify(r)}`);
    const nm = iN >= 0 ? r[iN] : null; if (nm) { if (name && nm !== name) throw new Error(`${file}: two index names in one file (${name}, ${nm})`); name = nm; }
    const ntr = iNt >= 0 && r[iNt] !== '' && r[iNt] != null ? +r[iNt] : null; out.push({ date: d, tr, ntr: ntr != null && isFinite(ntr) ? ntr : null }); }
  if (!name) name = path.basename(file).split('_Historical_')[0];   // fall back to the site's file name
  return { name, rows: out };
}

/** Glob dir for *.csv, stitch by index. Returns { [name]: { name, dates, tr, ntr, files, gaps } } sorted ascending by date.
 *  `ntr` is null when no file for that index carried the Net TR column. `gaps` lists stretches of more than `maxGapDays`
 *  calendar days between consecutive rows (a missing year file shows up here rather than silently flattening a return). */
export async function loadBenchmarks(dir, opts = {}) {
  const maxGapDays = opts.maxGapDays || 10;
  const names = (await fs.readdir(dir).catch(() => [])).filter(f => /\.csv$/i.test(f)).sort();
  const byIndex = {};
  for (const f of names) { const { name, rows } = parseBenchmarkCsv(await fs.readFile(path.join(dir, f), 'utf8'), f);
    const B = byIndex[name] || (byIndex[name] = { name, map: new Map(), files: 0 }); B.files++;
    for (const r of rows) { const prev = B.map.get(r.date);
      if (prev && (Math.abs(prev.tr - r.tr) > 1e-6 || (prev.ntr != null && r.ntr != null && Math.abs(prev.ntr - r.ntr) > 1e-6))) throw new Error(`${name}: ${r.date} differs between files (${prev.tr} vs ${r.tr} in ${f})`);
      B.map.set(r.date, prev ? { tr: r.tr, ntr: r.ntr != null ? r.ntr : prev.ntr } : r); } }
  const out = {};
  for (const [name, B] of Object.entries(byIndex)) { const dates = [...B.map.keys()].sort(); const tr = dates.map(d => B.map.get(d).tr); const ntrAll = dates.map(d => B.map.get(d).ntr);
    const ntr = ntrAll.every(x => x == null) ? null : ntrAll; const gaps = [];
    for (let i = 1; i < dates.length; i++) { const days = (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86400000; if (days > maxGapDays) gaps.push({ from: dates[i - 1], to: dates[i], days }); }
    out[name] = { name, dates, tr, ntr, files: B.files, gaps }; }
  return out;
}

/** Index of the last date ≤ d in an ascending date array (−1 if none). */
export function atOrBefore(dates, d) { let lo = 0, hi = dates.length - 1, ans = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (dates[mid] <= d) { ans = mid; lo = mid + 1; } else hi = mid - 1; } return ans; }
/** Series value on or before date d (null when the series starts later). `which` = 'tr' (default) or 'ntr'. */
export function valueAt(S, d, which = 'tr') { const i = atOrBefore(S.dates, d); const v = S[which]; return i < 0 || !v ? null : v[i]; }

const mean = a => a.length ? a.reduce((p, c) => p + c, 0) / a.length : null;
const stdev = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((p, c) => p + (c - m) * (c - m), 0) / (a.length - 1)); };

/** Measure a benchmark over the window [start, end] the way momentum.js stats() measures the equity curve: total return,
 *  CAGR on 250-day years, max drawdown on closes, Sharpe = mean daily / sd × √250 (no risk-free rate, like the engine's).
 *  Only rows inside the window count; `days` is how many there were. Null fields when the series does not cover the window. */
export function windowStats(S, start, end, which = 'tr') {
  const v = S[which]; if (!v) return null; const i0 = atOrBefore(S.dates, start), i1 = atOrBefore(S.dates, end);
  if (i0 < 0 || i1 < 0 || i1 <= i0) return { covered: false, first: S.dates[0], last: S.dates[S.dates.length - 1] };
  const vals = v.slice(i0, i1 + 1); if (vals.some(x => x == null)) return { covered: false, first: S.dates[0], last: S.dates[S.dates.length - 1], reason: `${which} column missing on some days in the window` };
  const v0 = vals[0], v1 = vals[vals.length - 1]; const years = (vals.length - 1) / 250;
  let peak = -Infinity, dd = 0; for (const x of vals) { peak = Math.max(peak, x); dd = Math.max(dd, (peak - x) / peak); }
  const dr = []; for (let k = 1; k < vals.length; k++) dr.push(vals[k] / vals[k - 1] - 1); const sd = stdev(dr);
  return { covered: true, start: S.dates[i0], end: S.dates[i1], days: vals.length, totalReturn: v1 / v0 - 1, cagr: years > 0 ? Math.pow(v1 / v0, 1 / years) - 1 : 0, maxDrawdown: dd, sharpe: sd ? mean(dr) / sd * Math.sqrt(250) : null };
}

/** Calendar-year returns inside [start, end], keyed by year, computed like the engine's byYear: from the last value of the
 *  previous year (or the window's first value for the first year) to the last value of that year. */
export function byYear(S, start, end, which = 'tr') {
  const v = S[which]; const out = {}; if (!v) return out; const i0 = atOrBefore(S.dates, start), i1 = atOrBefore(S.dates, end); if (i0 < 0 || i1 <= i0) return out;
  let prev = v[i0];
  for (let k = i0 + 1; k <= i1; k++) { const y = S.dates[k].slice(0, 4); const b = out[y] || (out[y] = { start: prev, end: null }); b.end = v[k]; if (k === i1 || S.dates[k + 1].slice(0, 4) !== y) prev = v[k]; }
  for (const b of Object.values(out)) b.ret = b.end / b.start - 1;
  return out;
}

/** Short label for a table column: "NIFTY200 MOMENTUM 30" → "N200 Momentum 30". */
export function shortName(name) { return name.replace(/^NIFTY\s*/i, 'N').replace(/^N\s*50$/i, 'Nifty 50').replace(/MOMENTUM/i, 'Momentum'); }
