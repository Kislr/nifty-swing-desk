#!/usr/bin/env node
/* Point-in-time NIFTY 500 membership (ROADMAP item 5a/5b).
 *
 *   node scripts/membership.mjs            # parse data/membership/src/, rebuild history, write data/membership/members.json + report
 *   node scripts/membership.mjs --parse    # only print what each press release yields (debugging the parser)
 *   exit status 1 when any check fails (the report lists every problem)
 *
 * Sources (saved by the owner, PR #31): NSE Indices press releases `ind_prsDDMMYYYY[_n].pdf` (every "Replacements in
 * indices" release 2017 → 2026), `symbolchange.csv` (old symbol → new symbol, effective date) and `ind_nifty500list.csv`
 * (today's members). Each release has, for every index it touches, a numbered section ("2) NIFTY 500 Index") with two
 * tables, "The following companies are being excluded / included", rows Sr. No. / Company Name / Symbol, and one
 * effective date for the release (occasionally one per section). Text comes from `pdftotext -layout`; one release
 * (23 Aug 2021) is a scanned image and is read from the OCR text committed beside it (`ind_prs23082021.ocr.txt`).
 *
 * Releases that say it in prose instead of a table (revocations, "exclusion of X on account of merger") are not
 * guessed at: `data/membership/overrides.json` carries them by hand, one entry per release, with the sentence quoted.
 *
 * Rebuild: start from today's list and undo every event going backwards (members before = members − included +
 * excluded). Three checks on every event, all written to the report: every excluded name was a member the day before,
 * every included name was not, and the count stays near 500. A failed check is a parsing or source problem to look at,
 * not something to paper over. Symbols are canonicalised to today's ticker through symbolchange.csv so the result keys
 * on the same symbols as data/history/.
 *
 * Output `data/membership/members.json`: { asOf, from, events: [{date, file, add, drop}], symbols: { SYM: [[from|null, to|null]…] } }
 * where [from, to) is a membership interval (ISO dates; from null = since before the first release, to null = still in). `memberOn(M, sym, date)` and
 * `membersOn(M, date)` below are what the backtests use. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SRC = path.join(ROOT, 'data', 'membership', 'src');
const MONTHS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12', jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12' };

/** "March 31, 2017", "31 March 2017", "30-OCT-2019", "31-Mar-2017" → ISO; null when unreadable. */
export function isoDate(s) {
  if (!s) return null; s = String(s).trim().replace(/\s+/g, ' ');
  let m = s.match(/^([A-Za-z]+)\.? (\d{1,2}),? (\d{4})$/); if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[ -]([A-Za-z]+)\.?,?[ -](\d{4})$/); if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? s : null;
}
/** Release date from the file name: ind_prs16022017.pdf → 2017-02-16. */
export function fileDate(f) { const m = path.basename(f).match(/ind_prs(\d{2})(\d{2})(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; }

const DATE_RE = /([A-Z][a-z]+\.? \d{1,2},? \d{4}|\d{1,2} [A-Z][a-z]+,? \d{4})/;
/** Every "effective [from] <date>" / "with effect from <date>" / "w.e.f. <date>" in the text, with the line it starts on.
 *  Matched on the lines joined with spaces, because "shall become effective\nfrom December 30, 2022" wraps. */
export function effectiveDates(lines) {
  const starts = []; let joined = ''; for (const l of lines) { starts.push(joined.length); joined += l.replace(/\s+/g, ' ').trim() + ' '; }
  const lineOf = pos => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo; };
  const re = new RegExp(`(?:effective(?: from)?|with effect from|w\\.e\\.f\\.?)\\s+${DATE_RE.source}`, 'gi'); const out = []; let m;
  while ((m = re.exec(joined))) { const d = isoDate(m[1]); if (d) out.push({ line: lineOf(m.index), date: d }); }
  return out;
}

const HEADER = /^\s*(?:\d{1,2}|[a-zA-Z]|[ivx]+)\s*[).:]\s*(NIFTY\s*500)(?:\s+Index)?\s*$/i;        // "2) NIFTY 500 Index", "b) Nifty 500"
const NEXT_SECTION = /^\s*(?:\d{1,2}|[a-zA-Z]|[ivx]+)\s*[).]\s+\S|^\s*[A-Z]\.\s+\S|^\s*The above (?:replacement|change)|^\s*Note\b|^\s*For more information|^\s*About NSE Indices/i;
const ROW = /^\s*(\d{1,3})\s+(?:(\S.*?)\s{2,})?([A-Z0-9][A-Z0-9&\-]{0,19})\s*$/;                     // "  1   Alok Industries Ltd.      ALOKTEXT"; a wrapped name leaves "16   JCHAC"
const NOISE = /^\s*(?:Sr\.?(?:\s*No\.?)?|No\.?|Company Name|Symbol|Company Name\s+Symbol|Sr\.?\s*No\.?\s+Company Name\s+Symbol|\d{1,2}|Page \d+.*)\s*$/i;

/** Parse one release's text: { file, released, sections: [{ index, excluded: [{sym, name}], included: [...], effective, unread: [lines] }], effective: [{line, date}] }. */
export function parseRelease(text, file) {
  const lines = text.split(/\r?\n/); const eff = effectiveDates(lines); const sections = []; let cur = null, mode = null;
  for (let i = 0; i < lines.length; i++) { const l = lines[i];
    if (HEADER.test(l)) { cur = { index: 'NIFTY 500', line: i, excluded: [], included: [], unread: [] }; sections.push(cur); mode = null; continue; }
    if (!cur) continue;
    if (NEXT_SECTION.test(l) && !/being (?:excluded|included)/i.test(l)) { cur = null; mode = null; continue; }
    if (/\bbeing excluded\b/i.test(l)) { mode = 'excluded'; continue; }
    if (/\bbeing included\b/i.test(l)) { mode = 'included'; continue; }
    if (!l.trim() || NOISE.test(l)) continue;
    const m = l.match(ROW);
    if (m && mode && !/^(?:LTD|LIMITED|INDIA)$/.test(m[3])) cur[mode].push({ sym: m[3], name: (m[2] || '').replace(/\s+/g, ' ').trim(), sr: +m[1] });
    else if (mode) cur.unread.push(l.trim());
  }
  for (const s of sections) { const before = eff.filter(e => e.line < s.line); s.effective = before.length ? before[before.length - 1].date : (eff[0] ? eff[0].date : null); s.effectiveChoices = [...new Set(eff.map(e => e.date))]; }
  return { file: path.basename(file), released: fileDate(file), sections, effective: eff };
}

/** Text of a release, given its path without extension: the .pdf through pdftotext -layout when present (the
 *  authoritative source), else the .txt beside it (a release the owner has not yet saved as a PDF, transcribed from the
 *  site as text and labelled as such at the top of the file). */
export async function releaseText(base) {
  const pdf = base + '.pdf'; if (await fs.access(pdf).then(() => true, () => false)) {
    const r = spawnSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`pdftotext failed on ${pdf}: ${r.stderr}`); return r.stdout; }
  return fs.readFile(base + '.txt', 'utf8');
}
/** Release base names in the folder (pdf or txt, once each), oldest first; "(1)" files are browser duplicates. */
export async function listReleases(dir) {
  const names = new Set(); for (const f of await fs.readdir(dir)) { const m = f.match(/^(ind_prs\d{8}(?:_\d+)?)\.(pdf|txt)$/i); if (m) names.add(m[1]); }
  return [...names].sort((a, b) => fileDate(a) < fileDate(b) ? -1 : fileDate(a) > fileDate(b) ? 1 : a < b ? -1 : 1);
}

/** symbolchange.csv → { old: [{ to, date }] } (one old symbol can be renamed more than once over the years). */
export function parseSymbolChanges(csv) {
  const map = {}; const lines = csv.split(/\r?\n/).slice(1);
  for (const l of lines) { if (!l.trim()) continue; const cells = l.split(','); if (cells.length < 4) continue; const to = cells[cells.length - 2].trim(), from = cells[cells.length - 3].trim(), date = isoDate(cells[cells.length - 1].trim());
    if (!from || !to || !date || from === to) continue; (map[from] || (map[from] = [])).push({ to, date }); }
  for (const k of Object.keys(map)) map[k].sort((a, b) => a.date < b.date ? -1 : 1);
  return map;
}
/** Today's ticker for a symbol as written on `date`: follow renames effective after that date. Returns { sym, via: [...] }. */
export function canonical(sym, date, changes) {
  const via = []; let s = sym; const seen = new Set();
  for (let guard = 0; guard < 10; guard++) { const list = changes[s]; if (!list) break; const next = list.find(c => c.date > date && !seen.has(c.to)); if (!next) break; seen.add(s); via.push(`${s}→${next.to} (${next.date})`); s = next.to; date = next.date; }
  return { sym: s, via };
}
/** ind_nifty500list.csv → [symbols]. */
export function parseCurrentList(csv) { const out = []; for (const l of csv.split(/\r?\n/).slice(1)) { const c = l.split(','); if (c.length >= 3 && c[2].trim()) out.push(c[2].trim()); } return out; }

/** Filter for the engines (engine.analyzeAt / momentum.rankAt `filter`): member of the index on that date. Dates before
 *  the first event are judged on the earliest list known (the start set's intervals are open at the start). */
export function membershipFilter(M) { return (sym, date) => memberOn(M, sym, date); }
/** Membership on a date from members.json. Intervals are [from, to): `from` null = member since before the first
 *  release (the earliest list known), `to` null = still a member. */
export function memberOn(M, sym, date) { const iv = M.symbols[sym]; if (!iv) return false; for (const [a, b] of iv) if ((a == null || date >= a) && (b == null || date < b)) return true; return false; }
export function membersOn(M, date) { const out = []; for (const s of Object.keys(M.symbols)) if (memberOn(M, s, date)) out.push(s); return out; }

async function main() {
  const argv = process.argv.slice(2); const flag = k => argv.includes('--' + k); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const SRC = path.resolve(arg('src', DEFAULT_SRC)); const files = await listReleases(SRC);   // --src, --overrides, --out, --report: for tests on a synthetic folder
  const changes = parseSymbolChanges(await fs.readFile(path.join(SRC, 'symbolchange.csv'), 'utf8'));
  const overrides = JSON.parse(await fs.readFile(arg('overrides', path.join(ROOT, 'data', 'membership', 'overrides.json')), 'utf8').catch(() => '{}'));
  for (const r of overrides.renames || []) { (changes[r.from] || (changes[r.from] = [])).push({ to: r.to, date: r.date }); changes[r.from].sort((a, b) => a.date < b.date ? -1 : 1); }   // renames NSE's csv lacks
  const parsed = []; for (const f of files) parsed.push(parseRelease(await releaseText(path.join(SRC, f)), f + '.pdf'));
  if (flag('parse')) { for (const p of parsed) { const o = overrides[p.file]; console.log(`${p.file} released ${p.released} effective ${[...new Set(p.effective.map(e => e.date))].join(',') || '—'}${o ? ' OVERRIDE' : ''}`);
      for (const s of p.sections) console.log(`   NIFTY 500 @${s.effective}: −${s.excluded.length} +${s.included.length}${s.unread.length ? '  UNREAD: ' + s.unread.slice(0, 4).join(' | ') : ''}`); } return; }
  // 1. events: one per (file, NIFTY 500 section), after overrides. An override either replaces the file's sections
  //    (`replace: [{effective, excluded, included}]`) or amends one (`amend: {effective?, excluded: {add, remove}, included: {add, remove}}`).
  const events = []; const notes = [];
  for (const p of parsed) { const o = overrides[p.file]; let secs = p.sections.map(s => ({ effective: s.effective, excluded: s.excluded.map(r => r.sym), included: s.included.map(r => r.sym) }));
    if (o && o.replace) { secs = o.replace.map(s => ({ effective: s.effective, excluded: s.excluded || [], included: s.included || [] })); notes.push(`${p.file}: replaced by override — ${o.note}`); }
    else if (o && o.amend) { const a = o.amend; if (!secs.length) secs.push({ effective: a.effective, excluded: [], included: [] }); const s = secs[0]; if (a.effective) s.effective = a.effective;
      for (const k of ['excluded', 'included']) { if (!a[k]) continue; s[k] = s[k].filter(x => !(a[k].remove || []).includes(x)).concat(a[k].add || []); } notes.push(`${p.file}: amended by override — ${o.note}`); }
    else if (o && o.ignore) { secs = []; notes.push(`${p.file}: ignored by override — ${o.note}`); }
    for (const s of secs) { if (!s.effective) { notes.push(`${p.file}: NIFTY 500 section but no effective date found — skipped (needs an override)`); continue; } if (!s.excluded.length && !s.included.length) continue;
      events.push({ file: p.file, released: p.released, date: s.effective, excluded: s.excluded, included: s.included }); } }
  events.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.released < b.released ? -1 : a.released > b.released ? 1 : a.file < b.file ? -1 : 1);
  // 2. canonical symbols (today's ticker) and the backward walk from today's list
  const today = parseCurrentList(await fs.readFile(path.join(SRC, 'ind_nifty500list.csv'), 'utf8')); const asOf = arg('asof', '2026-11-12');
  const renamed = {}; const canon = (sym, date) => { const c = canonical(sym, date, changes); if (c.via.length) renamed[sym] = c.via.join(' → '); return c.sym; };
  const members = new Set(today); const problems = []; const trail = [];
  for (let k = events.length - 1; k >= 0; k--) { const e = events[k]; const inc = e.included.map(s => canon(s, e.released)), exc = e.excluded.map(s => canon(s, e.released)); e.add = inc; e.drop = exc;   // a release names a symbol as it stood on the day it was written
    for (const s of inc) { if (!members.has(s)) problems.push({ file: e.file, date: e.date, sym: s, what: 'included here but not a member afterwards (a later exclusion is missing, or the symbol is misread)' }); members.delete(s); }
    for (const s of exc) { if (members.has(s)) problems.push({ file: e.file, date: e.date, sym: s, what: 'excluded here yet a member afterwards (a later inclusion is missing, or the symbol is misread)' }); members.add(s); }
    trail.unshift({ date: e.date, file: e.file, before: members.size, add: inc.length, drop: exc.length }); }
  const start = [...members].sort(); const first = events[0] ? events[0].date : asOf;
  // 3. forward pass → intervals per symbol
  const iv = {}; const open = {}; for (const s of start) open[s] = null;   // in the index since before the first release
  const closeAt = (s, d) => { (iv[s] || (iv[s] = [])).push([open[s], d]); delete open[s]; };
  for (const e of events) { for (const s of e.drop) { if (s in open) closeAt(s, e.date); else problems.push({ file: e.file, date: e.date, sym: s, what: 'exclusion of a name with no open membership in the forward pass' }); }
    for (const s of e.add) { if (s in open) problems.push({ file: e.file, date: e.date, sym: s, what: 'inclusion of a name already a member in the forward pass' }); else open[s] = e.date; } }
  for (const s of Object.keys(open)) (iv[s] || (iv[s] = [])).push([open[s], null]);
  const M = { asOf, from: first, built: new Date().toISOString().slice(0, 10), sources: { releases: files.length, events: events.length, renames: Object.keys(renamed).length }, events: events.map(e => ({ date: e.date, file: e.file, add: e.add, drop: e.drop })), symbols: iv };
  const current = membersOn(M, asOf); const sameAsToday = current.length === today.length && today.every(s => current.includes(s));
  const outFile = arg('out', path.join(ROOT, 'data', 'membership', 'members.json')); await fs.writeFile(outFile, JSON.stringify(M, null, 1));
  // 4. report
  const counts = trail.map(t => t.before); const lo = Math.min(...counts, today.length), hi = Math.max(...counts, today.length);
  const L = [`# NIFTY 500 membership — rebuilt ${M.built}`, '', `${files.length} press releases in \`data/membership/src/\` (${parsed.filter(p => p.sections.length).length} with a NIFTY 500 section), ${events.length} events from ${first} to ${events[events.length - 1].date}, ${Object.keys(renamed).length} symbols canonicalised through symbolchange.csv. Today's list (${asOf}): ${today.length} names; the forward pass ends with ${current.length} — ${sameAsToday ? 'identical' : '**DIFFERENT**'}. Member count across the walk: ${lo} → ${hi}. ${Object.keys(iv).length} symbols were ever members; ${start.length} at ${first}.`, '',
    `## Checks: ${problems.length ? `**${problems.length} problems**` : 'all clean'}`, '', ...(problems.length ? ['| file | effective | symbol | problem |', '|---|---|---|---|', ...problems.map(p => `| ${p.file} | ${p.date} | ${p.sym} | ${p.what} |`)] : ['Every excluded name was a member the day before, every included name was not, both directions.']), '',
    '## Overrides and skips', '', ...(notes.length ? notes.map(n => `- ${n}`) : ['- none']), '',
    '## Events', '', '| effective | file | members before | +in | −out |', '|---|---|---|---|---|', ...trail.map(t => `| ${t.date} | ${t.file} | ${t.before} | ${t.add} | ${t.drop} |`), '',
    '## Renames applied', '', ...Object.entries(renamed).sort().map(([k, v]) => `- ${k}: ${v}`), '',
    '## Releases with no NIFTY 500 table', '', 'Listed so each can be read once by hand: a release that changes NIFTY 500 in prose needs an entry in `data/membership/overrides.json`.', '', ...parsed.filter(p => !p.sections.length && !overrides[p.file]).map(p => `- ${p.file} (${p.released})`)];
  const rep = arg('report', path.join(ROOT, 'reports', `membership-${M.built}.md`)); await fs.writeFile(rep, L.join('\n'));
  console.log(L.slice(0, 12).join('\n')); console.log(`\nfull report: ${path.relative(ROOT, rep)}; ${path.relative(ROOT, outFile)} written`);
  if (problems.length) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
