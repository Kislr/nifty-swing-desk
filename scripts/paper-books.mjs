#!/usr/bin/env node
/* The twenty-one paper books (A21) — replayed from the stored bars, outside the daily job.
 *
 *   node scripts/paper-books.mjs                    # the books as of the last bar on file: one row each, the digest line, the reading if its day has come
 *   node scripts/paper-books.mjs --to 2027-06-14    # as of that close — what the job computed that evening; the reading is made with this
 *   node scripts/paper-books.mjs --to 2027-06-14 --write   # and write reports/momentum-books-reading-<to>.md
 *   node scripts/paper-books.mjs --history          # the reading rule tried on the ten years before the books: how often it says ahead / monitor
 *   node scripts/paper-books.mjs --history --step 21 --write
 *   (--hist, --config, --live, --benchmarks, --sectors, --members / --no-members, --adjust, --out point it at other files — the tests use them)
 *
 * The books are M.paperBooks (momentum.js): the paper book's rules, reinvested, started at the close of each of the first
 * config.paper.books sessions on or after config.paper.from (or on config.paper.starts once frozen), each read against
 * config.paper.fund over its own days from data/benchmarks/live.json — the price index, as the digest reads it.
 * The rule for the reading was written first: reports/momentum-books-reading-rule-2026-11-23.md (M.booksReading applies it).
 *
 * --history: for an anchor day every --step bars (default 21), 21 books start on the 21 sessions from the anchor and are read on
 * the first session six calendar months after the last one starts — the live design, moved back in time. Only readings that fall
 * before config.paper.from are used, so no day of the live books is in it. The fund is the total-return file in data/benchmarks/
 * (the only daily series on file for those years), which counts dividends the books do not: it leans against the books by
 * roughly a third of a point per reading. Overlapping anchors are not independent; the non-overlapping count is printed beside. */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as BM from './benchmarks.mjs';
import { membershipFilter } from './membership.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js')); const M = require(path.join(ROOT, 'momentum.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; }; const flag = k => argv.includes('--' + k);
const readJSON = async (p, fb) => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fb; } };
const config = await readJSON(arg('config', path.join(ROOT, 'config.json')), {}); const PAPER = config.paper || {};
const HIST = arg('hist', path.join(ROOT, 'data', 'history')); const OUT = arg('out', path.join(ROOT, 'reports'));
const files = []; for (const f of (await fs.readdir(HIST).catch(() => [])).sort()) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
if (!files.length) { console.error(`No history files in ${HIST}.`); process.exit(2); }
if (!PAPER.from) { console.error('config.json has no paper.from — there is no paper book to replay.'); process.exit(2); }
const custom = (await readJSON(arg('sectors', path.join(ROOT, 'data', 'sectors.json')), { map: {} })).map || {};
const adjustments = await readJSON(arg('adjust', path.join(ROOT, 'data', 'adjustments.json')), null);
const memFile = arg('members', path.join(ROOT, 'data', 'membership', 'members.json')); const MEMB = !flag('no-members') && existsSync(memFile) ? await readJSON(memFile, null) : null;   // that day's NIFTY 500 members, as the daily job ranks them
const all = E.buildBars(files, [], { adjustments }); const filter = MEMB ? membershipFilter(MEMB) : null;
const nBooks = +arg('books', PAPER.books || 21); const capital = PAPER.capital || (config.risk && config.risk.capital) || 500000;
const fund = arg('fund', PAPER.fund || (PAPER.benchmarks || []).find(n => n !== 'NIFTY 50'));
const pc = (x, d = 1) => x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(d) + '%'; const dd = x => x == null ? '—' : (x * 100).toFixed(1) + '%'; const pts = x => x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1);
const ruleLine = R => `ahead = median gap ≥ +${(R.gap * 100).toFixed(1)} point and at least ${Math.ceil(nBooks * R.share - 1e-9)} of ${nBooks} books ahead; behind = median gap below zero; clearly better on drawdown = median drawdown gap ≥ ${(R.dd * 100).toFixed(1)} points and at least ${Math.ceil(nBooks * R.share - 1e-9)} of ${nBooks} fell less`;
const addMonths = (d, n) => { const t = new Date(d + 'T00:00:00Z'); const day = t.getUTCDate(); t.setUTCDate(1); t.setUTCMonth(t.getUTCMonth() + n); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(day, last)); return t.toISOString().slice(0, 10); };

if (flag('history')) {
  // The fund's daily series for the past: the total-return file, by the name the live series has (NSE writes it in another case).
  const bms = await BM.loadBenchmarks(arg('benchmarks', path.join(ROOT, 'data', 'benchmarks'))); const key = Object.keys(bms).find(k => k.toUpperCase().replace(/\s+/g, ' ') === String(fund).toUpperCase());
  if (!key) { console.error(`--history: no total-return file for ${fund} in data/benchmarks/ (have: ${Object.keys(bms).join(', ') || 'none'})`); process.exit(2); }
  const series = Object.fromEntries(bms[key].dates.map((d, i) => [d, bms[key].tr[i]])); const first = bms[key].dates[0];
  const step = +arg('step', 21); const warm = M.DEFAULTS.lookback + M.DEFAULTS.skip + 1; const D = all.dates; const cache = new Map(); const rows = [];
  for (let a = Math.max(warm, D.findIndex(d => d >= first)); a + nBooks - 1 < D.length; a += step) {
    const starts = D.slice(a, a + nBooks); const want = addMonths(starts[nBooks - 1], M.READING.months); const read = D.find(d => d >= want); if (!read || read >= PAPER.from) break;
    if (starts.some(d => series[d] == null) || series[read] == null) continue;   // the rule: the fund has a close on every first day and on the reading day
    const B = M.paperBooks(E.clipBars(all, read), config.momentum || {}, custom, { from: starts[0], starts, books: nBooks, fund, capital, benchmarks: { [fund]: series }, filter, cache });
    if (!B || !B.reading) continue; rows.push({ anchor: starts[0], last: starts[nBooks - 1], read, G: B.G, A: B.A, lo: B.gap.min, hi: B.gap.max, D: B.D, L: B.L, medRet: B.ret.median, ret: B.reading.ret, losesLess: B.reading.losesLess, verdict: B.reading.verdict });
  }
  if (!rows.length) { console.error('--history: no reading fits between the first fund close and the first paper-book day.'); process.exit(2); }
  const count = (list, f) => list.filter(f).length; const share = (list, f) => list.length ? Math.round(count(list, f) / list.length * 100) + '%' : '—';
  const apart = []; for (const r of rows) if (!apart.length || r.anchor > apart[apart.length - 1].read) apart.push(r);   // readings whose windows do not overlap
  const tally = list => `${list.length} readings — ahead ${count(list, r => r.ret === 'ahead')} (${share(list, r => r.ret === 'ahead')}), level ${count(list, r => r.ret === 'level')} (${share(list, r => r.ret === 'level')}), behind ${count(list, r => r.ret === 'behind')} (${share(list, r => r.ret === 'behind')}); clearly better on drawdown ${count(list, r => r.losesLess)} (${share(list, r => r.losesLess)}), of which not ahead ${count(list, r => r.losesLess && r.ret !== 'ahead')}`;
  const gs = rows.map(r => r.G).sort((x, y) => x - y); const q = p => gs[Math.min(gs.length - 1, Math.floor(p * gs.length))]; const spread = rows.map(r => r.hi - r.lo).sort((x, y) => x - y);
  // does a reading say anything about the half year after it? the next non-overlapping reading's median gap, by this reading's verdict
  const next = {}; for (const r of rows) { const n = rows.find(x => x.anchor > r.read); if (!n) continue; (next[r.ret] = next[r.ret] || []).push(n.G); }
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
  const L = [];
  L.push(`# The reading rule tried on history — ${nBooks} books, ${rows[0].anchor} → ${rows[rows.length - 1].read}`, '');
  L.push(`History ${D[0]} → ${D[D.length - 1]} (${D.length} days)${MEMB ? ", that day's NIFTY 500 members" : ''}. The paper book's rules (${JSON.stringify(Object.assign({}, M.DEFAULTS, { compound: true }, config.momentum || {}))}), ₹${capital} a book. An anchor every ${step} bars: ${nBooks} books start on the ${nBooks} sessions from the anchor, and all are read on the first session ${M.READING.months} calendar months after the last one starts — the live design moved back in time. Only readings before ${PAPER.from} (the first live paper-book day) are in the table. Fund: ${key}, **total return** (dividends counted, which the books do not get — it leans against the books by about a third of a point per reading; the live reading uses the price index).`, '');
  L.push(`Rule (reports/momentum-books-reading-rule-2026-11-23.md, fixed before this was run): ${ruleLine(M.READING)}.`, '');
  L.push('## How often the rule says what', '', `- All anchors (windows overlap, so these are not independent): ${tally(rows)}.`, `- Non-overlapping only: ${tally(apart)}.`, '');
  L.push(`Median gap G across readings: ${pts(gs[0])} to ${pts(gs[gs.length - 1])} points, middle half ${pts(q(0.25))} to ${pts(q(0.75))}, median ${pts(med(gs))}. Best book minus worst book inside one reading: median ${pts(med(spread))} points, largest ${pts(spread[spread.length - 1])}.`, '');
  L.push('## Does a reading say anything about the next half year?', '', 'The median gap of the next reading whose books start after this one was read, grouped by what this one said:', '', '| this reading | readings | next reading: median G | next G above zero |', '|---|---|---|---|');
  for (const k of ['ahead', 'level', 'behind']) { const a = next[k] || []; L.push(`| ${k} | ${a.length} | ${a.length ? pts(med(a)) + ' pts' : '—'} | ${a.length ? count(a, g => g > 0) + ' of ' + a.length : '—'} |`); }
  L.push('', '## Every reading', '', '| first book | last book | read on | median book | G (median gap, pts) | gap, worst to best | A (ahead of ' + nBooks + ') | D (median DD gap, pts) | L | return | verdict |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) L.push(`| ${r.anchor} | ${r.last} | ${r.read} | ${pc(r.medRet)} | ${pts(r.G)} | ${pts(r.lo)} to ${pts(r.hi)} | ${r.A} | ${pts(r.D)} | ${r.L} | ${r.ret} | ${r.verdict} |`);
  const text = L.join('\n') + '\n'; console.log(text);
  if (flag('write')) { await fs.mkdir(OUT, { recursive: true }); const f = path.join(OUT, `momentum-books-history-${new Date().toISOString().slice(0, 10)}.md`); await fs.writeFile(f, text); console.log(`wrote ${path.relative(ROOT, f)}`); }
  process.exit(0);
}

// The live books, as of the last bar on file or of --to.
const to = arg('to'); const bars = E.clipBars(all, to); const last = bars.dates[bars.dates.length - 1];
const live = await readJSON(arg('live', path.join(ROOT, 'data', 'benchmarks', 'live.json')), {}); const bm = {}; for (const n of PAPER.benchmarks || []) if (n !== 'NIFTY 50') bm[n] = Object.fromEntries(Object.entries(live[n] || {}).filter(([d]) => d <= last));
const B = M.paperBooks(bars, config.momentum || {}, custom, { from: PAPER.from, starts: PAPER.starts, books: nBooks, fund, capital, benchmarks: bm, filter, membersAsOf: MEMB ? MEMB.asOf : null });
if (!B) { console.log(`No book yet: the first starts at the first close on or after ${PAPER.from}; the last bar on file is ${last}.`); process.exit(0); }
const L = [];
L.push(`# The twenty-one paper books — as of ${last}`, '');
L.push(`${B.started} of ${B.n} books started (${B.starts[0]} → ${B.starts[B.started - 1]})${B.frozen ? ', start days from config.json' : ', start days counted from the bars' + (B.pending ? '' : ' — **not frozen yet**: copy them into config.json → paper.starts')}. Each ₹${capital}, the paper book's rules, reinvested; fund = ${B.fund} (price index, data/benchmarks/live.json), measured over each book's own days.`, '');
L.push('| book | started | days | value | return | fund, same days | gap (pts) | max DD | fund DD | DD gap (pts) | names | trades |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of B.rows) L.push(`| ${r.k} | ${r.from} | ${r.days} | ₹${r.value} | ${pc(r.ret)} | ${pc(r.fundRet)}${r.gap != null && !r.fundExact ? ' *' : ''} | ${pts(r.gap)} | ${dd(r.maxDrawdown)} | ${dd(r.fundDrawdown)} | ${pts(r.ddGap)} | ${r.names} | ${r.trades} |`);
if (B.inexact.length) L.push('', `\\* no fund close on the first or the last day of book ${B.inexact.join(', ')} — fill data/benchmarks/live.json from NSE's index history before a reading.`);
L.push('', `Median book ${pc(B.ret.median)} (${pc(B.ret.min)} to ${pc(B.ret.max)}). **G** (median gap) ${pts(B.G)} points${B.gap ? `, ${pts(B.gap.min)} to ${pts(B.gap.max)}` : ''}; **A** ${B.A} of ${B.measured} ahead. **D** (median drawdown gap) ${pts(B.D)} points; **L** ${B.L} fell less than the fund.`, '');
// The books read as the actual investment (owner, 23 Nov 2026): the margin over the fund in rupees on a book's own capital.
const inr = x => (x < 0 ? '−' : '') + '₹' + Math.round(Math.abs(x)).toLocaleString('en-IN'); const fr = B.rows.filter(r => r.fundRet != null).map(r => r.fundRet).sort((x, y) => x - y); const fmed = fr.length ? (fr.length % 2 ? fr[(fr.length - 1) / 2] : (fr[fr.length / 2 - 1] + fr[fr.length / 2]) / 2) : null;
if (B.G != null) L.push(`**As the actual investment** — ${inr(capital)} a book: the median book has made ${inr(B.ret.median * capital)}; the same money in ${B.fund} over a book's own days, ${inr(fmed * capital)} at the median; the median margin is **${inr(B.G * capital)}** ${B.G >= 0 ? 'ahead of' : 'behind'} the fund (from ${inr(B.gap.min * capital)} to ${inr(B.gap.max * capital)} across the books). Whether that is tangible is the owner's judgement at the reading.`, '');
L.push(`Digest line: ${M.booksLine(B) || '(none until a second book exists)'}`, '');
L.push(`Rule (reports/momentum-books-reading-rule-2026-11-23.md): ${ruleLine(M.READING)}.`, '');
if (!B.reading) L.push(`**No reading:** ${B.pending ? `${B.pending} book(s) have not started` : 'a book has no fund close to be measured against'}.`);
else if (!B.due) L.push(`**Not the reading day yet** — the first session on or after ${B.readingFrom}. By today's numbers the rule would say: return ${B.reading.ret}, ${B.reading.losesLess ? 'clearly better' : 'not clearly better'} on drawdown → ${B.reading.verdict}. A record, not a verdict.`);
else L.push(`**The reading** (first session on or after ${B.readingFrom}; this is ${last}): return **${B.reading.ret}**, ${B.reading.losesLess ? 'clearly better' : 'not clearly better'} on drawdown → **${B.reading.verdict === 'ahead' ? "ahead — the owner's call on real money" : B.reading.verdict + ' — the fund stays the holding'}**. Check the five data conditions in the rule before this is written into the README.`);
const text = L.join('\n') + '\n'; console.log(text);
if (flag('write')) { await fs.mkdir(OUT, { recursive: true }); const f = path.join(OUT, `momentum-books-${B.due ? 'reading-' : ''}${last}.md`); await fs.writeFile(f, text); console.log(`wrote ${path.relative(ROOT, f)}`); }
