#!/usr/bin/env node
/* Corporate actions → data/adjustments.json (ROADMAP item 4).
 *
 * Bhavcopy prices in data/history/ are raw: a 1:1 bonus shows as a 50% fall on the ex-date, which the engine reads as a stop-out, an
 * "avoid" or a momentum trailing-stop exit. This script builds the table of bonuses, splits and consolidations for every symbol in
 * the history, checks each one against the bars (the close before the ex-date over the open on it should be about the factor), and
 * writes data/adjustments.json. engine.buildBars() applies the verified ones at load, so the history files stay raw and the daily
 * job keeps appending raw bars. Run it from a home connection — NSE refuses cloud IPs, like the backfill — then re-run the backtests.
 *
 *   node scripts/corporate-actions.mjs                       # NSE's corporate-actions API, from the first history date to today
 *   node scripts/corporate-actions.mjs --csv CF-CA-equities-*.csv   # the CSV downloaded from nseindia.com → Corporates → Corporate Actions
 *   node scripts/corporate-actions.mjs --from 2021-01-01 --to 2026-12-31
 *   options: --dry (print, write nothing)   --no-verify (skip the bar check: every parsed event gets apply:true)
 *
 * What it parses: "Bonus a:b" (factor (a+b)/b), "Face Value Split (Sub-Division) - From Rs X Per Share To Rs Y Per Share" (X/Y),
 * "Consolidation of Shares - From Rs X ... To Rs Y" (X/Y, below 1). Everything else — dividends, rights, buybacks, demergers,
 * schemes of arrangement — is listed in the report as unhandled, because it cannot be reduced to a single price factor; a demerger
 * ex-date in particular leaves an unadjusted gap the owner should know about.
 * Verification: observed = close on the last bar before the ex-date ÷ open on the ex-date (close if no open). An event is applied
 * when observed is within 12% of the factor; otherwise apply:false and it goes in the report (bars already adjusted, a mis-parsed
 * line, or an ex-date NSE moved). Events before the history starts or after its end cannot be checked and are kept with apply:true
 * when they are after the end (they will matter once bars arrive) and dropped when before the start (nothing to adjust). */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; }; const flag = n => args.includes('--' + n);
const DATA = path.join(ROOT, 'data'); const HIST = path.join(DATA, 'history'); const OUT = opt('out', path.join(DATA, 'adjustments.json'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const HDR = { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9', Referer: 'https://www.nseindia.com/companies-listing/corporate-filings-actions' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const TOL = 0.12;

/* ---------- parsing ---------- */
/** "16-Sep-2021" / "16-SEP-2021" / "2021-09-16" / "16/09/2021" → ISO, or null. */
export function isoDate(s) {
  if (!s) return null; s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/); if (m) { const k = MON.indexOf(m[2].toUpperCase()); if (k >= 0) return `${m[3]}-${String(k + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}
/** One NSE "purpose"/"subject" line → {type, factor, detail} or {type:'unhandled'}. Several actions in one line (bonus and split) compound. */
export function parsePurpose(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim(); if (!t) return { type: 'unhandled', factor: 1, detail: t };
  const parts = []; let rest = t;
  const bonus = /bonus\s*(?:issue)?\s*(\d+)\s*:\s*(\d+)/ig; let m;
  while ((m = bonus.exec(t))) { const a = +m[1], b = +m[2]; if (a > 0 && b > 0) parts.push({ type: 'bonus', factor: (a + b) / b, detail: `bonus ${a}:${b}` }); }
  // split / sub-division / consolidation: "From Rs X ... To Rs Y"; accept "Re", "Rs.", "₹", "/-", "per share" in any order
  const fv = /(split|sub-?division|consolidation)[^0-9]*?(?:from|frm)\s*(?:rs\.?|re\.?|₹|inr)?\s*([\d.]+)\s*\/?-?\s*(?:per\s*share|each)?[^0-9]*?(?:to)\s*(?:rs\.?|re\.?|₹|inr)?\s*([\d.]+)/i;
  m = t.match(fv);
  if (m) { const from = +m[2], to = +m[3]; if (from > 0 && to > 0 && from !== to) parts.push({ type: /consolid/i.test(m[1]) ? 'consolidation' : 'split', factor: from / to, detail: `${/consolid/i.test(m[1]) ? 'consolidation' : 'split'} ₹${from} → ₹${to}` }); }
  if (!parts.length) return { type: /dividend/i.test(t) ? 'dividend' : /rights/i.test(t) ? 'rights' : /buy\s*back/i.test(t) ? 'buyback' : /demerg|arrangement|amalgam|merger|spin/i.test(t) ? 'demerger' : 'unhandled', factor: 1, detail: t };
  return { type: parts.map(p => p.type).join('+'), factor: parts.reduce((f, p) => f * p.factor, 1), detail: parts.map(p => p.detail).join(' + ') };
}
/** Minimal CSV: quoted fields, commas inside quotes, CRLF. */
export function parseCSV(txt) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) { const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
/** Rows from either source → [{symbol, exDate, purpose}]. Header names are matched by keyword so NSE's renames do not break it. */
export function normaliseRows(records) {
  const out = [];
  for (const r of records) { const keys = Object.keys(r); const find = re => { const k = keys.find(k => re.test(k)); return k ? r[k] : null; };
    const symbol = (find(/^symbol$/i) || find(/symbol/i) || '').trim().toUpperCase(); const purpose = find(/purpose|subject/i); const ex = isoDate(find(/ex[\s_-]*date|exdate/i));
    if (symbol && purpose && ex) out.push({ symbol, exDate: ex, purpose: String(purpose).trim() }); }
  return out;
}

/* ---------- sources ---------- */
async function fromCSV(file) { const txt = await fs.readFile(file, 'utf8'); const rows = parseCSV(txt); const hdr = rows[0].map(h => h.trim()); return normaliseRows(rows.slice(1).map(r => Object.fromEntries(hdr.map((h, i) => [h, r[i]])))); }
async function fromNSE(fromISO, toISO) {
  const f = d => { const [y, m, dd] = d.split('-'); return `${dd}-${m}-${y}`; };
  const cookie = await (async () => { const res = await fetch('https://www.nseindia.com/', { headers: HDR }); return (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; '); })();
  const out = []; let a = new Date(fromISO + 'T00:00:00Z'); const end = new Date(toISO + 'T00:00:00Z'); let n = 0;
  while (a <= end) { const b = new Date(Math.min(end.getTime(), a.getTime() + 364 * 86400000));
    const url = `https://www.nseindia.com/api/corporates-corporateActions?index=equities&from_date=${f(a.toISOString().slice(0, 10))}&to_date=${f(b.toISOString().slice(0, 10))}`;
    let j = null; for (let t = 0; t < 4 && !j; t++) { try { const res = await fetch(url, { headers: Object.assign({}, HDR, { Cookie: cookie }) }); if (res.ok) j = await res.json(); else { console.warn(`  ${res.status} on ${url.slice(-40)}; retrying`); await sleep(2000 * (t + 1)); } } catch (e) { console.warn('  ' + e.message); await sleep(2000 * (t + 1)); } }
    if (!j) { console.error('NSE did not answer after four tries; wait fifteen minutes and run again, or use --csv with the page\'s download'); process.exit(2); }
    const list = Array.isArray(j) ? j : (j.data || j.rows || []);
    if (!Array.isArray(list)) { console.error('unexpected shape from NSE; first bytes: ' + JSON.stringify(j).slice(0, 300)); process.exit(2); }
    if (n === 0 && list.length) console.log('  sample record keys: ' + Object.keys(list[0]).join(', '));
    out.push(...normaliseRows(list)); n++;
    process.stdout.write(`\r  ${a.toISOString().slice(0, 10)} → ${b.toISOString().slice(0, 10)}: ${out.length} rows so far   `);
    a = new Date(b.getTime() + 86400000); await sleep(700); }
  process.stdout.write('\n'); return out;
}

/* ---------- build + verify ---------- */
export function buildTable(rows, bars, verify) {
  const inHist = new Set(Object.keys(bars.sym)); const first = bars.dates[0], last = bars.dates[bars.dates.length - 1]; const pos = {}; bars.dates.forEach((d, i) => (pos[d] = i));
  const symbols = {}; const unhandled = {}; const dropped = []; const seen = new Set(); let parsed = 0, applied = 0, rejected = 0, unchecked = 0;
  for (const r of rows) { if (!inHist.has(r.symbol)) continue; const key = `${r.symbol}|${r.exDate}|${r.purpose}`; if (seen.has(key)) continue; seen.add(key);
    const p = parsePurpose(r.purpose);
    if (p.factor === 1) { if (p.type !== 'dividend') (unhandled[p.type] || (unhandled[p.type] = [])).push(`${r.symbol} ${r.exDate} — ${r.purpose}`); continue; }
    parsed++;
    if (r.exDate < first) { dropped.push(`${r.symbol} ${r.exDate} ${p.detail}: before the history starts`); continue; }
    const ev = { exDate: r.exDate, type: p.type, detail: p.detail, factor: +p.factor.toFixed(6), source: r.purpose };
    if (verify && r.exDate <= last) {
      const B = bars.sym[r.symbol]; let i = pos[r.exDate]; if (i == null) { i = bars.dates.findIndex(d => d >= r.exDate); }   // ex-date on a holiday: the next bar
      let j = i - 1; while (j >= 0 && B.c[j] == null) j--; let k = i; while (k < bars.dates.length && B.c[k] == null) k++;
      if (j >= 0 && k < bars.dates.length && i - j <= 7 && k - i <= 7) { const after = B.o[k] != null && B.o[k] > 0 ? B.o[k] : B.c[k]; ev.observed = +(B.c[j] / after).toFixed(4); ev.checked = `${bars.dates[j]} close ${B.c[j]} → ${bars.dates[k]} open ${after}`;
        ev.apply = Math.abs(ev.observed / ev.factor - 1) <= TOL; if (ev.apply) applied++; else rejected++; }
      else { ev.apply = false; ev.observed = null; ev.checked = 'no bars around the ex-date'; rejected++; } }
    else { ev.apply = true; ev.observed = null; ev.checked = verify ? 'after the last bar: unverifiable yet' : 'not verified (--no-verify)'; unchecked++; }
    (symbols[r.symbol] || (symbols[r.symbol] = [])).push(ev); }
  for (const list of Object.values(symbols)) list.sort((a, b) => a.exDate < b.exDate ? -1 : 1);
  return { symbols, unhandled, dropped, counts: { rows: rows.length, parsed, applied, rejected, unchecked, symbols: Object.keys(symbols).length } };
}

/* ---------- main ---------- */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const files = []; for (const f of (await fs.readdir(HIST).catch(() => [])).sort()) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
  if (!files.length) { console.error('no history in data/history/ — run the backfill first'); process.exit(2); }
  const bars = E.buildBars(files, []); const first = bars.dates[0], last = bars.dates[bars.dates.length - 1];
  console.log(`history ${first} → ${last}, ${Object.keys(bars.sym).length} symbols`);
  const from = opt('from', first), to = opt('to', new Date().toISOString().slice(0, 10));
  const rows = opt('csv') ? await fromCSV(opt('csv')) : await fromNSE(from, to);
  console.log(`${rows.length} corporate-action rows${opt('csv') ? ' from ' + opt('csv') : ' from NSE'}`);
  const T = buildTable(rows, bars, !flag('no-verify'));
  const out = { asOf: new Date().toISOString().slice(0, 10), source: opt('csv') ? `NSE corporate-actions CSV (${path.basename(opt('csv'))})` : 'NSE corporate-actions API', history: `${first} → ${last}`, rule: 'for bars before exDate: price ÷ factor, volume × factor; apply:false events are skipped by engine.buildBars', tolerance: TOL, counts: T.counts, symbols: T.symbols };
  const L = [`# Corporate actions — ${out.asOf}`, '', `${T.counts.rows} rows from ${out.source}; ${T.counts.parsed} bonus / split / consolidation events on symbols in the history; **${T.counts.applied} verified and applied**, ${T.counts.rejected} rejected by the bar check, ${T.counts.unchecked} after the last bar (kept, unverifiable yet), ${T.dropped.length} before the history starts (dropped). ${T.counts.symbols} symbols affected.`, '',
    '| symbol | ex-date | event | factor | observed | applied | checked against |', '|---|---|---|---|---|---|---|'];
  for (const [s, list] of Object.entries(T.symbols).sort()) for (const e of list) L.push(`| ${s} | ${e.exDate} | ${e.detail} | ${e.factor} | ${e.observed == null ? '—' : e.observed} | ${e.apply ? 'yes' : '**no**'} | ${e.checked} |`);
  if (T.dropped.length) L.push('', `## Before the history starts (${T.dropped.length})`, '', ...T.dropped.map(x => '- ' + x));
  for (const [k, v] of Object.entries(T.unhandled)) L.push('', `## Not adjustable: ${k} (${v.length})`, '', 'These change the price on the ex-date without a single factor to undo it. Trades and momentum exits on these dates are suspect.', '', ...v.slice(0, 200).map(x => '- ' + x));
  L.push('', '## How to read this', '', `Factor = what the pre-event price is divided by (a 1:1 bonus is 2; a ₹10 → ₹2 split is 5; a consolidation is below 1). Observed = close before the ex-date ÷ open on it; an event is applied when observed is within ${Math.round(TOL * 100)}% of the factor. A rejected event usually means NSE's ex-date differs from the bar where the gap is, or the line was mis-read — check the \`checked against\` column and, if the factor is right, set \`apply: true\` by hand in data/adjustments.json. engine.buildBars applies the table at load; the history files stay raw.`);
  console.log(L.slice(0, 3).join('\n'));
  if (flag('dry')) { console.log('\n(dry run: nothing written)'); process.exit(0); }
  await fs.writeFile(OUT, JSON.stringify(out, null, 1)); await fs.mkdir(path.join(ROOT, 'reports'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'reports', `corporate-actions-${out.asOf}.md`), L.join('\n') + '\n');
  console.log(`\nwrote ${path.relative(ROOT, OUT)} and reports/corporate-actions-${out.asOf}.md. Next: npm run backtest:momentum, npm run backtest, npm run backtest:pairs — and git push all of it.`);
}
