#!/usr/bin/env node
/* Compounder — the survivor count from EDGAR's full index (SCREEN.md, open decision 4; the US leg's step (a), 23 Nov 2026).
 *
 *   node scripts/compounder-survivors-us.mjs                # every quarter's index, every departed filer classified, report written
 *   node scripts/compounder-survivors-us.mjs --limit 200    # classify only the first 200 departed filers (a quick trial of the whole path)
 *   node scripts/compounder-survivors-us.mjs --fresh        # ignore compounder/data/us/survivors.json and ask EDGAR again
 *   node scripts/compounder-survivors-us.mjs --report-only  # rebuild the report from survivors.json, no network
 *
 * The question. compounder/data/us/universe.json is today's NYSE / Nasdaq filers, so every backtest cohort is made of companies that
 * are still listed. Both screen backtests of 5 Nov 2026 failed on that store, and the write-up says a fail there is weaker evidence
 * than a fail on a complete universe would be — by an amount nobody has measured. This measures it: for each of the 44 cohort dates,
 * how many companies were filing 10-Ks then and are not in the store now, and how large they were.
 *
 * How. EDGAR's quarterly full index (Archives/edgar/full-index/YYYY/QTRn/form.gz) lists every filing by form type. From 2013 Q4 on:
 *   - every 10-K (10-K, 10-K405, 10-KT, 10-KSB; amendments are not counted) → who was an annual filer, and when;
 *   - every Form 25 / 25-NSE → a class of securities was removed from a national exchange (the trace a delisting, a merger or a
 *     bankruptcy leaves, filed by the exchange or the issuer);
 *   - every Form 15-12B / 15-12G / 15-15D → registration ended.
 * A filer is ACTIVE on a cohort date when it filed a 10-K in the 456 days up to it (the 15 months the backtest uses). It is IN THE
 * STORE when its CIK is in universe.json, and DEPARTED when it is not. A departed filer is not yet a missing company: EDGAR's 10-K
 * filers include trusts, shells, companies with public debt and private shares, non-traded REITs, and the over-the-counter market,
 * none of which the screen could have bought. So each departed CIK is asked two small questions of data.sec.gov:
 *   - submissions/CIK##########.json → SIC code (financials 6000–6799 are outside the screen), name, state;
 *   - api/xbrl/companyconcept/CIK##########/dei/EntityPublicFloat.json → the public float on each 10-K's cover page, with its filing
 *     date. The float a filer had reported by the cohort date is its size bucket — the proxy the backtest already uses for a name
 *     with no price.
 * A departed filer counts as A COMPANY THE SCREEN COULD HAVE SEEN when it is non-financial and had reported a public float above
 * zero by the date; the table also says how many of those left a Form 25 behind, which is the stronger sign that the shares were on
 * an exchange and not over the counter. Both are proxies and the report says so: float is a company's own figure for non-affiliates'
 * holdings on a day months before the filing, and a Form 25 is also filed for a bond or a warrant.
 *
 * The same buckets as scripts/compounder-backtest-us.mjs (<$300M, $300M–1B, $1–2B, $2–10B, >$10B, unknown), and the store's own
 * filers bucketed the same way — by reported float, from the facts store — so the two sides of each ratio are measured alike.
 *
 * Writes compounder/data/us/survivors.json (every departed CIK with what EDGAR said: the list the Sharadar step starts from) and
 * reports/compounder-survivors-us-<date>.md. About 55 index files and two small calls per departed filer at 8 a second.
 * SEC's fair-access policy asks for a User-Agent with contact details: EDGAR_USER_AGENT, as in compounder-fetch-us.mjs.
 * Reachable from the GitHub job (Actions → Compounder US survivor count → Run workflow) or a home connection; not from a cloud session.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const US = path.join(ROOT, 'compounder', 'data', 'us');
const UA = process.env.EDGAR_USER_AGENT || 'nifty-swing-desk research (https://github.com/Kislr/nifty-swing-desk)';
const RPS = Number(process.env.EDGAR_RPS || 8);
const args = process.argv.slice(2); const flag = n => args.includes('--' + n); const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

export const ACTIVE_DAYS = 456;   // a 10-K in the previous 15 months, as the backtest's survivor gap counts an active filer
export const FIRST_QUARTER = { year: 2013, q: 4 };   // 15 months before the first cohort (January 2015)
export const BUCKETS = ['<$300M', '$300M–1B', '$1–2B', '$2–10B', '>$10B', 'unknown'];
export const BAND = ['$300M–1B', '$1–2B', '$2–10B'];   // the screen's $300M–$10B market-cap band
/** Size bucket from a figure in US dollars (the backtest's capBucket, which takes $ millions). */
export const bucketOf = usd => { const m = usd == null ? null : usd / 1e6; return m == null ? 'unknown' : m < 300 ? '<$300M' : m < 1000 ? '$300M–1B' : m < 2000 ? '$1–2B' : m <= 10000 ? '$2–10B' : '>$10B'; };
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

const ANNUAL = /^10-K(405|T|SB)?$/, DELIST = /^25(-NSE)?$/, DEREG = /^15-(12B|12G|15D)$/;
/** One quarter's form index → [{ form, name, cik, date }] for the three kinds of form this count reads. The file is fixed-width with a
 *  header; a data line ends "<CIK>  <YYYY-MM-DD>  edgar/data/…", and the form type is everything before the first run of two spaces. */
export function parseFormIdx(text) {
  const out = [];
  for (const line of text.split('\n')) { const m = line.match(/\s(\d{1,10})\s+(\d{4}-\d{2}-\d{2})\s+edgar\/\S+\s*$/); if (!m) continue;
    const head = line.slice(0, m.index); const k = head.search(/\s{2,}/); if (k < 0) continue; const form = head.slice(0, k).trim();
    if (!ANNUAL.test(form) && !DELIST.test(form) && !DEREG.test(form)) continue;
    out.push({ form, name: head.slice(k).trim(), cik: Number(m[1]), date: m[2] }); }
  return out;
}
/** Fold index rows into { cik → { name, annual: [dates], delist: [dates], dereg: [dates] } }, dates ascending and distinct. */
export function foldFilings(rows, into = {}) {
  for (const r of rows) { const c = into[r.cik] || (into[r.cik] = { name: r.name, annual: [], delist: [], dereg: [] });
    const list = ANNUAL.test(r.form) ? c.annual : DELIST.test(r.form) ? c.delist : c.dereg; if (!list.includes(r.date)) list.push(r.date);
    if (ANNUAL.test(r.form)) c.name = r.name; }
  for (const c of Object.values(into)) { c.annual.sort(); c.delist.sort(); c.dereg.sort(); }
  return into;
}
/** The quarterly cohort dates the backtest uses, as calendar dates: the first of January, April, July and October. */
export function cohortDates(from = '2015-01-01', to = '2025-10-01') { const out = []; for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) for (const m of ['01', '04', '07', '10']) { const d = `${y}-${m}-01`; if (d >= from && d <= to) out.push(d); } return out; }
/** Was this filer filing annual reports on the date: a 10-K in the ACTIVE_DAYS up to and including it. */
export const activeOn = (c, date) => { const lo = addDays(date, -ACTIVE_DAYS); return c.annual.some(d => d > lo && d <= date); };
/** The latest value filed on or before `date` from [{ v, filed }] (a public float series); null when there is none. */
export function valueAt(series, date) { let best = null; for (const x of series || []) if (x.filed <= date && x.v != null && (!best || x.filed > best.filed)) best = x; return best ? best.v : null; }
/** data.sec.gov companyconcept (dei:EntityPublicFloat) → [{ v, filed, end }], one per period end: the value from the earliest 10-K that reported it. */
export function floatSeries(doc) {
  const byEnd = {}; for (const u of (doc && doc.units && doc.units.USD) || []) { if (!/^10-K/.test(u.form || '') || u.val == null || !u.filed) continue; const cur = byEnd[u.end]; if (!cur || u.filed < cur.filed) byEnd[u.end] = { v: u.val, filed: u.filed, end: u.end }; }
  return Object.values(byEnd).sort((a, b) => a.filed.localeCompare(b.filed));
}
/** The store's own float series for a company, from a facts shard entry ({ fy: { end: { float: { v, filed } } } }). */
export const storeFloat = co => Object.entries((co && co.fy) || {}).filter(([, r]) => r.float && r.float.v != null).map(([end, r]) => ({ v: r.float.v, filed: r.float.filed, end }));

/** The count. filings: foldFilings' map. universe: universe.json. facts: { cik → facts entry } for the store. departed: { cik → { sic, float: [...] } }
 *  as classified (may be partial: `classified` says how many were asked). Returns { cohorts: [...], total, byYear }. Per cohort and bucket:
 *  store = screenable store filers active on the date; gone = departed, non-financial, a public float above zero reported by the date;
 *  goneExch = those of them with a Form 25 on file at any time. Outside the buckets: goneFinancial, goneNoFloat, goneUnasked. */
export function countSurvivors({ filings, universe, facts, departed, dates }) {
  const inStore = new Map(universe.companies.map(c => [c.cik, c])); const blank = () => Object.fromEntries(BUCKETS.map(b => [b, { store: 0, gone: 0, goneExch: 0 }]));
  const cohorts = [];
  for (const date of dates) { const row = { date, active: 0, inStore: 0, screenable: 0, departed: 0, goneFinancial: 0, goneNoFloat: 0, goneUnasked: 0, by: blank() };
    for (const [k, c] of Object.entries(filings)) { const cik = Number(k); if (!activeOn(c, date)) continue; row.active++;
      const u = inStore.get(cik);
      if (u) { row.inStore++; if (!(u.domestic && !u.financial)) continue; row.screenable++; row.by[bucketOf(valueAt(storeFloat(facts[cik]), date))].store++; continue; }
      row.departed++; const d = departed[cik];
      if (!d) { row.goneUnasked++; continue; }
      if (d.sic != null && d.sic >= 6000 && d.sic <= 6799) { row.goneFinancial++; continue; }
      const fl = valueAt(d.float, date); if (!(fl > 0)) { row.goneNoFloat++; continue; }
      const b = row.by[bucketOf(fl)]; b.gone++; if (c.delist.length) b.goneExch++; }
    cohorts.push(row); }
  const sum = (rows, f) => rows.reduce((p, r) => p + f(r), 0); const agg = rows => { const o = { cohorts: rows.length, active: sum(rows, r => r.active), inStore: sum(rows, r => r.inStore), screenable: sum(rows, r => r.screenable), departed: sum(rows, r => r.departed), goneFinancial: sum(rows, r => r.goneFinancial), goneNoFloat: sum(rows, r => r.goneNoFloat), goneUnasked: sum(rows, r => r.goneUnasked), by: blank() };
    for (const b of BUCKETS) for (const k of ['store', 'gone', 'goneExch']) o.by[b][k] = sum(rows, r => r.by[b][k]); return o; };
  const byYear = {}; for (const r of cohorts) (byYear[r.date.slice(0, 4)] = byYear[r.date.slice(0, 4)] || []).push(r);
  return { cohorts, total: agg(cohorts), byYear: Object.fromEntries(Object.entries(byYear).map(([y, rows]) => [y, agg(rows)])) };
}
/** gone ÷ (gone + store) over a set of buckets: the share of the companies the screen could have seen that the store does not hold. */
export const goneShare = (by, buckets, key = 'gone') => { const g = buckets.reduce((p, b) => p + by[b][key], 0), s = buckets.reduce((p, b) => p + by[b].store, 0); return g + s ? g / (g + s) : null; };

/** The report, as lines of Markdown. */
export function reportLines(R, meta) {
  const pc = x => x == null ? '—' : (x * 100).toFixed(1) + '%'; const n = x => Number(x).toLocaleString('en-US'); const T = R.total; const L = [];
  L.push(`# The survivor count — who was filing 10-Ks and is not in the store (${meta.asOf})`, '');
  L.push(`EDGAR's full index, ${meta.quarters} quarters (${meta.firstQuarter} → ${meta.lastQuarter}): ${n(meta.annualFilers)} distinct filers of a 10-K. The store (\`compounder/data/us/universe.json\`, built ${meta.universeAsOf}) holds ${n(meta.universe)} filers on NYSE or Nasdaq today, ${n(meta.screenable)} of them screenable. ${R.cohorts.length} cohort dates, ${R.cohorts[0].date} → ${R.cohorts[R.cohorts.length - 1].date}; a filer is active on a date when it filed a 10-K in the ${ACTIVE_DAYS} days before it. ${n(meta.departedCiks)} filers were active on at least one date and are not in the store; ${n(meta.classified)} of them were asked of data.sec.gov for their SIC code and their reported public float${meta.classified < meta.departedCiks ? ` — **a partial run: ${n(meta.departedCiks - meta.classified)} not asked, counted below as "not asked"**` : ''}.`, '');
  L.push('**A departed filer is not yet a missing company.** EDGAR\'s 10-K filers include trusts, shells, issuers of public debt with private shares, non-traded REITs and the over-the-counter market. The table counts a departed filer only when it is non-financial and had reported a public float above zero by the cohort date, and buckets it by that float — the proxy the backtest uses for a name with no price. "With a Form 25" is the stricter reading: a class of its securities was at some point removed from a national exchange.', '');
  L.push('## By size, all cohorts together', '', '| reported float on the date | in the store (screenable) | departed | share departed | departed, with a Form 25 | share |', '|---|---|---|---|---|---|');
  for (const b of BUCKETS) { const x = T.by[b]; if (!x.store && !x.gone) continue; L.push(`| ${b} | ${n(x.store)} | ${n(x.gone)} | ${pc(goneShare(T.by, [b]))} | ${n(x.goneExch)} | ${pc(goneShare(T.by, [b], 'goneExch'))} |`); }
  L.push(`| **the screen's band, $300M–$10B** | **${n(BAND.reduce((p, b) => p + T.by[b].store, 0))}** | **${n(BAND.reduce((p, b) => p + T.by[b].gone, 0))}** | **${pc(goneShare(T.by, BAND))}** | **${n(BAND.reduce((p, b) => p + T.by[b].goneExch, 0))}** | **${pc(goneShare(T.by, BAND, 'goneExch'))}** |`, '');
  L.push('Figures are company-cohorts: a company active on twenty cohort dates is counted twenty times, on each side. "Share departed" = departed ÷ (departed + in the store). The store\'s "unknown" row is screenable filers with no float on file by the date; a departed filer with no float is not in the table (next paragraph).', '');
  L.push(`Not in the table, per company-cohort: ${n(T.goneFinancial)} departed financials (SIC 6000–6799, outside the screen), ${n(T.goneNoFloat)} departed filers that had reported no public float above zero by the date${T.goneUnasked ? `, ${n(T.goneUnasked)} not asked` : ''}. All active filers: ${n(T.active)}; in the store ${n(T.inStore)} (${pc(T.inStore / T.active)}), of which screenable ${n(T.screenable)}.`, '');
  L.push('## By cohort year, inside the band', '', '| year | cohorts | in the store | departed | share departed | with a Form 25 | share |', '|---|---|---|---|---|---|---|');
  for (const [y, A] of Object.entries(R.byYear)) L.push(`| ${y} | ${A.cohorts} | ${n(BAND.reduce((p, b) => p + A.by[b].store, 0))} | ${n(BAND.reduce((p, b) => p + A.by[b].gone, 0))} | ${pc(goneShare(A.by, BAND))} | ${n(BAND.reduce((p, b) => p + A.by[b].goneExch, 0))} | ${pc(goneShare(A.by, BAND, 'goneExch'))} |`);
  L.push('', 'The earlier the cohort, the more of its companies have since left: a 2015 cohort has had eleven years to lose them, a 2025 cohort one.', '');
  L.push('## How to read it', '', `The backtests of 5 Nov 2026 measured a survivor gap of 2.0% of active filers — but only inside the store, among companies that are still there. This is the part that could not be seen from there. The share in the band is the share of each cohort's candidates the two failed backtests never ranked. SCREEN.md's rule of 29 Oct stands: if the gap is large, the floor rises to the lowest bucket where it falls under about 5%, and past about $2B the benchmark changes. What it settles for the reopening is the size of the pull from Sharadar: \`compounder/data/us/survivors.json\` is the list of CIKs to price.`, '');
  L.push('## What this count cannot say', '', '- **Float is not market cap.** It is the company\'s own figure for shares held by non-affiliates, as of the end of its second fiscal quarter, printed on a 10-K filed months later. A closely held company is larger than its float.', '- **A Form 25 is not always a delisting of the shares** — it is also filed for a bond, a warrant or a preferred series of a company that stays listed. Among filers that are not on NYSE or Nasdaq today it is good evidence, not proof.', '- **Over-the-counter companies report a float too.** Without the Form 25 they cannot be told from exchange-listed ones here; that inflates the smallest bucket most and the band least.', '- **Foreign private issuers (20-F, 40-F) are not counted**, as they are not in the screen.', '- **Why a company left** — taken over at a premium, or bankrupt — is not in the index. That is the delisting-return convention the third hypothesis has to fix before any price is loaded.', '');
  return L;
}

/* ---------- network (the GitHub job or a home connection) ---------- */
let lastTick = 0; const gapMs = 1000 / RPS;
async function sec(url, { binary = false, tries = 5 } = {}) {
  for (let t = 0; t < tries; t++) {
    const wait = lastTick + gapMs - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait)); lastTick = Date.now();
    let res; try { res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate' } }); } catch (e) { await new Promise(r => setTimeout(r, 2000 * (t + 1))); continue; }
    if (res.status === 404) return null;
    if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : res.json();
    if (res.status === 403 || res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 3000 * (t + 1))); continue; }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`gave up on ${url}`);
}
const readJSON = async (p, fb) => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fb; } };
const cik10 = cik => String(cik).padStart(10, '0');

async function main() {
  const universe = await readJSON(path.join(US, 'universe.json'), null); if (!universe) { console.error('needs compounder/data/us/universe.json (node scripts/compounder-fetch-us.mjs --universe)'); process.exit(2); }
  const facts = {}; for (const f of await fs.readdir(path.join(US, 'facts')).catch(() => [])) if (/^\d\d\.json$/.test(f)) Object.assign(facts, await readJSON(path.join(US, 'facts', f), {}));
  const storeFile = path.join(US, 'survivors.json'); const prev = flag('fresh') ? null : await readJSON(storeFile, null); const dates = cohortDates();
  let filings, quarters;
  if (flag('report-only')) { if (!prev) { console.error('--report-only needs compounder/data/us/survivors.json'); process.exit(2); } filings = prev.filings; quarters = prev.quarters; }
  else {
    filings = {}; quarters = []; const now = new Date(); const yEnd = now.getUTCFullYear(), qEnd = Math.floor(now.getUTCMonth() / 3) + 1;
    for (let y = FIRST_QUARTER.year; y <= yEnd; y++) for (let q = 1; q <= 4; q++) { if ((y === FIRST_QUARTER.year && q < FIRST_QUARTER.q) || (y === yEnd && q > qEnd)) continue;
      const buf = await sec(`https://www.sec.gov/Archives/edgar/full-index/${y}/QTR${q}/form.gz`, { binary: true }); if (!buf) { console.warn(`${y} Q${q}: no index file`); continue; }
      const text = (buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf).toString('latin1'); const rows = parseFormIdx(text); foldFilings(rows, filings); quarters.push(`${y} Q${q}`);
      console.log(`${y} Q${q}: ${rows.filter(r => ANNUAL.test(r.form)).length} annual reports, ${rows.filter(r => DELIST.test(r.form)).length} Form 25, ${rows.filter(r => DEREG.test(r.form)).length} Form 15`); }
    if (!quarters.length) { console.error('no index file could be read — EDGAR is not reachable from here (use the GitHub job or a home connection)'); process.exit(1); }
  }
  const inStore = new Set(universe.companies.map(c => c.cik));
  const gone = Object.keys(filings).map(Number).filter(cik => !inStore.has(cik) && dates.some(d => activeOn(filings[cik], d))).sort((a, b) => a - b);
  console.log(`${Object.values(filings).filter(c => c.annual.length).length} filers of a 10-K since ${quarters[0]}; ${gone.length} were active on a cohort date and are not in the store`);
  const departed = (prev && prev.departed) || {}; const limit = Number(opt('limit', 0)); let asked = 0;
  if (!flag('report-only')) for (const cik of gone) { if (departed[cik]) continue; if (limit && asked >= limit) break; asked++;
    const s = await sec(`https://data.sec.gov/submissions/CIK${cik10(cik)}.json`); const f = await sec(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik10(cik)}/dei/EntityPublicFloat.json`);
    departed[cik] = { name: (s && s.name) || filings[cik].name, sic: s && Number(s.sic) ? Number(s.sic) : null, sicDesc: (s && s.sicDescription) || null, state: (s && s.stateOfIncorporation) || null, float: floatSeries(f) };
    if (asked % 250 === 0) { console.log(`  classified ${asked} (${Object.keys(departed).length} of ${gone.length} on file)`); await fs.writeFile(storeFile, JSON.stringify({ asOf: new Date().toISOString().slice(0, 10), quarters, filings, departed })); } }
  const asOf = new Date().toISOString().slice(0, 10);
  if (!flag('report-only')) await fs.writeFile(storeFile, JSON.stringify({ asOf, source: "sec.gov Archives/edgar/full-index form.gz; data.sec.gov submissions and companyconcept dei:EntityPublicFloat", quarters, filings, departed }));
  const R = countSurvivors({ filings, universe, facts, departed, dates });
  const meta = { asOf: flag('report-only') && prev ? prev.asOf : asOf, quarters: quarters.length, firstQuarter: quarters[0], lastQuarter: quarters[quarters.length - 1], annualFilers: Object.values(filings).filter(c => c.annual.length).length, universe: universe.companies.length, screenable: universe.companies.filter(c => c.domestic && !c.financial).length, universeAsOf: universe.asOf, departedCiks: gone.length, classified: gone.filter(c => departed[c]).length };
  const text = reportLines(R, meta).join('\n') + '\n'; const out = path.join(ROOT, 'reports', `compounder-survivors-us-${meta.asOf}.md`); await fs.mkdir(path.dirname(out), { recursive: true }); await fs.writeFile(out, text);
  console.log('\n' + text); console.log(`wrote ${path.relative(ROOT, out)}${flag('report-only') ? '' : ' and compounder/data/us/survivors.json'}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
