#!/usr/bin/env node
/* Member-days without a bar (audit A20, 23 Nov 2026).
 *
 *   node scripts/history-holes.mjs              # the count, by year and by name, and the longest runs
 *   node scripts/history-holes.mjs --list       # every run: symbol, first day, length
 *
 * A hole is a day on which a name was in the NIFTY 500 (data/membership/members.json) and has no close in data/history/, although
 * it has one on an earlier day and on a later one — so not the days before a listing or after a delisting. On 23 Nov 2026 the
 * history had 4,634 of them in 78 names, most in runs of weeks or months — what a share in a series the backfill did not read looks
 * like, though a suspension looks the same until the bhavcopies are asked. Run it before and after the
 * members top-up (BACKFILL.md, "Series — the home run") to see what the run filled and what is left; what is left is a suspension,
 * or a day NSE has no row for. Reads only; writes nothing. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const E = require(path.join(ROOT, 'engine.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };

/** → { memberDays, holes, names, byYear, bySym, runs: [{ sym, from, days }] } for bars (engine.buildBars) and a membership list. */
export function memberHoles(bars, M) {
  const D = bars.dates; const inIdx = (s, d) => (M.symbols[s] || []).some(([a, b]) => (a == null || d >= a) && (b == null || d < b));
  let memberDays = 0, holes = 0; const bySym = {}, byYear = {}, runs = [];
  for (const s of Object.keys(M.symbols)) { const B = bars.sym[s]; if (!B) continue; let first = -1, last = -1; for (let i = 0; i < D.length; i++) if (B.c[i] != null) { if (first < 0) first = i; last = i; }
    let run = null; const end = () => { if (run) runs.push(run); run = null; };
    for (let i = first; first >= 0 && i <= last; i++) { if (!inIdx(s, D[i])) { end(); continue; } memberDays++;
      if (B.c[i] != null) { end(); continue; }
      holes++; bySym[s] = (bySym[s] || 0) + 1; const y = D[i].slice(0, 4); byYear[y] = (byYear[y] || 0) + 1; if (run) run.days++; else run = { sym: s, from: D[i], days: 1 }; }
    end(); }
  return { memberDays, holes, names: Object.keys(bySym).length, byYear, bySym, runs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const HIST = arg('hist', path.join(ROOT, 'data', 'history')); const files = [];
  for (const f of (await fs.readdir(HIST).catch(() => [])).sort()) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
  const M = JSON.parse(await fs.readFile(arg('members', path.join(ROOT, 'data', 'membership', 'members.json')), 'utf8').catch(() => 'null'));
  if (!files.length || !M) { console.error('needs data/history/*.json and data/membership/members.json'); process.exit(2); }
  const bars = E.buildBars(files, []); const R = memberHoles(bars, M); const n = x => x.toLocaleString('en-IN');
  console.log(`history ${bars.dates[0]} → ${bars.dates[bars.dates.length - 1]}, ${bars.dates.length} days`);
  console.log(`member-days between a name's first and last bar: ${n(R.memberDays)}; without a bar: ${n(R.holes)} (${(R.holes / R.memberDays * 100).toFixed(2)}%), in ${R.names} names`);
  console.log('by year: ' + Object.keys(R.byYear).sort().map(y => `${y} ${R.byYear[y]}`).join(', '));
  console.log('most: ' + Object.entries(R.bySym).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([s, k]) => `${s} ${k}`).join(', '));
  const len = (a, b) => R.runs.filter(r => r.days >= a && r.days <= b).length;
  console.log(`runs: ${len(1, 1)} of one day, ${len(2, 5)} of 2–5, ${len(6, 20)} of 6–20, ${len(21, Infinity)} longer`);
  const sorted = [...R.runs].sort((a, b) => b.days - a.days || a.from.localeCompare(b.from));
  if (argv.includes('--list')) for (const r of sorted) console.log(`${r.sym}\t${r.from}\t${r.days}`); else console.log('longest: ' + sorted.slice(0, 10).map(r => `${r.sym} ${r.from} ×${r.days}`).join(', '));
}
