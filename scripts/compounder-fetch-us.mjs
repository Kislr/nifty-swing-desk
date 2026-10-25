/* Compounder — US fundamentals store from SEC EDGAR (point-in-time).
 *
 *   node scripts/compounder-fetch-us.mjs --universe          build compounder/data/us/universe.json (tickers → CIK, exchange, SIC, fiscal year end)
 *   node scripts/compounder-fetch-us.mjs --facts             pull XBRL company facts for every universe member → compounder/data/us/facts/NN.json
 *   node scripts/compounder-fetch-us.mjs --all               both
 *   options: --limit N (first N companies, for testing)  --cik 320193,1018724 (only these)  --fresh (ignore existing store, refetch everything)
 *
 * What "point-in-time" means here. A 10-K for fiscal 2023 also restates fiscal 2022 and 2021 as comparatives, so EDGAR holds
 * several values for the same (concept, period), each with the date it was filed. For each fiscal-year end we keep the value
 * from the EARLIEST filing (what an investor could have known on that filing date) as `v`/`filed`, and, when a later filing
 * reports a different number, the latest one under `r` (restated). The screen and the backtest read `v`; `r` is for audits.
 *
 * Source: https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json  (free; ≤ 10 requests/second; a User-Agent with contact
 * details is required by SEC's fair-access policy — set EDGAR_USER_AGENT, e.g. "nifty-swing-desk you@example.com").
 * No dependencies; Node 20+.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'compounder', 'data', 'us');
const UA = process.env.EDGAR_USER_AGENT || 'nifty-swing-desk research (https://github.com/Kislr/nifty-swing-desk)';
const RPS = Number(process.env.EDGAR_RPS || 8);          // stay under SEC's 10/s
const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

/** The concepts behind the five traits, in priority order per field. First tag with data for a period wins; the tag used is recorded. */
export const FIELDS = {
  rev:       { kind: 'duration', unit: 'USD',    tags: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'RevenuesNetOfInterestExpense',
                                                      'RegulatedAndUnregulatedOperatingRevenue', 'RegulatedOperatingRevenue', 'ElectricUtilityRevenue', 'RealEstateRevenueNet', 'OilAndGasRevenue', 'HealthCareOrganizationRevenue', 'RevenueMineralSales', 'RevenuesExcludingInterestAndDividends', 'SalesRevenueGoodsNet'] },
  cogs:      { kind: 'duration', unit: 'USD',    tags: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold', 'CostOfGoodsAndServiceExcludingDepreciationDepletionAndAmortization'] },
  gp:        { kind: 'duration', unit: 'USD',    tags: ['GrossProfit'] },
  ebit:      { kind: 'duration', unit: 'USD',    tags: ['OperatingIncomeLoss'] },
  ni:        { kind: 'duration', unit: 'USD',    tags: ['NetIncomeLoss', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic'] },
  ocf:       { kind: 'duration', unit: 'USD',    tags: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'] },
  da:        { kind: 'duration', unit: 'USD',    tags: ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortizationAndAccretionNet', 'Depreciation'] },
  sharesDil: { kind: 'duration', unit: 'shares', tags: ['WeightedAverageNumberOfDilutedSharesOutstanding', 'WeightedAverageNumberOfShareOutstandingBasicAndDiluted', 'WeightedAverageNumberOfSharesOutstandingBasic'] },
  assets:    { kind: 'instant',  unit: 'USD',    tags: ['Assets'] },
  curLiab:   { kind: 'instant',  unit: 'USD',    tags: ['LiabilitiesCurrent'] },
  cash:      { kind: 'instant',  unit: 'USD',    tags: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Cash'] },
  debtLT:    { kind: 'instant',  unit: 'USD',    tags: ['LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations', 'LongTermDebt', 'LongTermNotesPayable', 'SeniorLongTermNotes'] },
  debtST:    { kind: 'instant',  unit: 'USD',    tags: ['LongTermDebtCurrent', 'DebtCurrent', 'LongTermDebtAndCapitalLeaseObligationsCurrent', 'ShortTermBorrowings', 'NotesPayableCurrent', 'LinesOfCreditCurrent', 'ConvertibleNotesPayableCurrent'] },
  debtTotal: { kind: 'instant',  unit: 'USD',    tags: ['DebtLongtermAndShorttermCombinedAmount', 'DebtInstrumentCarryingAmount', 'LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities', 'LineOfCredit', 'ConvertibleNotesPayable', 'NotesPayable'] },
  sharesOut: { kind: 'instant',  unit: 'shares', tags: ['dei:EntityCommonStockSharesOutstanding'] },
  float:     { kind: 'instant',  unit: 'USD',    tags: ['dei:EntityPublicFloat'] },
};
// Service businesses (consultancies, software) often report no cost-of-revenue line and debt-free companies report no debt tag at all;
// the engine treats a missing debt tag as zero debt only when `assets` and `curLiab` are present (the balance sheet was tagged), and
// a missing gross margin as "trait not applicable", which fails the all-five rule — see compounder/SCREEN.md.
const ANNUAL_FORMS = /^10-K/;           // 10-K, 10-K405, 10-KT, 10-K/A — never 10-Q, 8-K, S-1, 20-F
const MIN_DAYS = 350, MAX_DAYS = 380;   // an annual duration; 52/53-week years included

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Reduce one companyfacts document to {end → {field: {v, filed, tag, acc, r?}}}. Pure; unit-tested in scripts/test.mjs. */
export function extractFacts(doc) {
  const byEnd = {};
  const facts = doc.facts || {};
  const accnEnd = {};   // accession → fiscal-year end it reports (max annual-duration end seen in that filing)
  for (const [field, spec] of Object.entries(FIELDS)) {
    const isDei = spec.tags[0].startsWith('dei:');
    for (const tagName of spec.tags) {
      const [ns, tag] = tagName.includes(':') ? tagName.split(':') : ['us-gaap', tagName];
      const units = facts[ns] && facts[ns][tag] && facts[ns][tag].units; if (!units) continue;
      const list = units[spec.unit]; if (!list || !list.length) continue;
      const perEnd = {};
      for (const f of list) {
        if (!ANNUAL_FORMS.test(f.form || '')) continue;
        if (spec.kind === 'duration') { if (!f.start) continue; const d = daysBetween(f.start, f.end); if (d < MIN_DAYS || d > MAX_DAYS) continue; }
        if (!isDei && (!accnEnd[f.accn] || f.end > accnEnd[f.accn])) accnEnd[f.accn] = f.end;
        if (typeof f.val !== 'number') continue;
        (perEnd[isDei ? (f.accn + '|' + f.end) : f.end] || (perEnd[isDei ? (f.accn + '|' + f.end) : f.end] = [])).push(f);
      }
      for (const [end, fl] of Object.entries(perEnd)) {
        const slot = byEnd[end] || (byEnd[end] = {}); if (slot[field]) continue;   // an earlier-priority tag already filled this period; tags may differ across years (companies re-tag over time)
        fl.sort((a, b) => a.filed < b.filed ? -1 : a.filed > b.filed ? 1 : 0);
        const first = fl[0], last = fl[fl.length - 1];
        const rec = { v: first.val, filed: first.filed, tag: tagName, acc: first.accn };
        if (last.val !== first.val) rec.r = { v: last.val, filed: last.filed };
        slot[field] = rec;
      }
    }
  }
  // Balance-sheet instants sometimes carry a date a few days off the fiscal year end (a 52/53-week year tagged 12-28 on the income
  // statement and 12-31 on the balance sheet), or appear at dates that are not a fiscal year end at all (a 10-K/A balance sheet, a
  // transition period). A fiscal-year record needs duration facts; merge an instant-only date into a duration date within 10 days,
  // otherwise drop it.
  const DUR = Object.keys(FIELDS).filter(k => FIELDS[k].kind === 'duration');
  const realEnds = Object.keys(byEnd).filter(e => !e.includes('|') && DUR.some(k => byEnd[e][k])).sort();
  for (const end of Object.keys(byEnd)) {
    if (end.includes('|') || realEnds.includes(end)) continue;
    const slot = byEnd[end]; delete byEnd[end];
    const target = realEnds.find(e => Math.abs(daysBetween(e, end)) <= 10);
    if (target) for (const [k, rec] of Object.entries(slot)) if (!byEnd[target][k]) byEnd[target][k] = Object.assign({ asOf: end }, rec);
  }
  // dei instants (cover-page share count, public float) are dated to the cover date or mid-year, not the fiscal year end.
  // Each was keyed 'accn|date' above; attach it to the fiscal year end that the same filing reports.
  for (const key of Object.keys(byEnd)) {
    if (!key.includes('|')) continue;
    const [accn, asOf] = key.split('|'); const slot = byEnd[key]; delete byEnd[key];
    let target = accnEnd[accn]; if (!target) continue;
    if (!byEnd[target]) target = realEnds.find(e => Math.abs(daysBetween(e, target)) <= 10);   // the filing's balance-sheet date was merged into a nearby year end
    if (!target) continue;
    for (const [k, rec] of Object.entries(slot)) if (!byEnd[target][k]) byEnd[target][k] = Object.assign({ asOf }, rec);
  }
  return byEnd;
}

/** One rate-limited fetch with retries. SEC answers 403/429 when the limit is exceeded and 404 for filers with no XBRL. */
let lastTick = 0; const gap = 1000 / RPS;
async function sec(url, tries = 4) {
  for (let t = 0; t < tries; t++) {
    const now = Date.now(); const wait = lastTick + gap - now; if (wait > 0) await new Promise(r => setTimeout(r, wait)); lastTick = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate', 'Accept': 'application/json' } });
    if (res.status === 404) return null;
    if (res.ok) return res.json();
    if (res.status === 403 || res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 2000 * (t + 1))); continue; }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`gave up on ${url}`);
}

export async function buildUniverse() {
  const tk = await sec('https://www.sec.gov/files/company_tickers_exchange.json');
  const F = tk.fields; const rows = tk.data.map(r => Object.fromEntries(F.map((k, i) => [k, r[i]])));
  const listed = rows.filter(r => /^(NYSE|Nasdaq)/i.test(r.exchange || ''));
  const byCik = {};
  for (const r of listed) { const c = byCik[r.cik] || (byCik[r.cik] = { cik: r.cik, name: r.name, tickers: [], exchange: r.exchange }); c.tickers.push(r.ticker); }
  const ciks = Object.keys(byCik).map(Number).sort((a, b) => a - b);
  console.log(`universe: ${rows.length} tickers on file, ${listed.length} on NYSE/Nasdaq, ${ciks.length} distinct filers`);
  const out = []; let n = 0;
  for (const cik of ciks) {
    const s = await sec(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`);
    n++; if (n % 250 === 0) console.log(`  submissions ${n}/${ciks.length}`);
    if (!s) continue;
    const forms = (s.filings && s.filings.recent && s.filings.recent.form) || [];
    const annual = forms.find(f => /^(10-K|20-F|40-F)/.test(f)) || null;
    const sic = Number(s.sic) || null;
    out.push({ cik, ticker: byCik[cik].tickers[0], tickers: byCik[cik].tickers, name: s.name || byCik[cik].name, exchange: byCik[cik].exchange,
      sic, sicDesc: s.sicDescription || null, fye: s.fiscalYearEnd || null, state: s.stateOfIncorporation || null, annualForm: annual ? annual.slice(0, 4) : null,
      financial: sic != null && sic >= 6000 && sic <= 6799, domestic: annual ? /^10-K/.test(annual) : false });
  }
  await fs.mkdir(OUT, { recursive: true });
  const doc = { asOf: new Date().toISOString().slice(0, 10), source: 'sec.gov company_tickers_exchange.json + data.sec.gov submissions', count: out.length,
    screenable: out.filter(c => c.domestic && !c.financial).length, companies: out };
  await fs.writeFile(path.join(OUT, 'universe.json'), JSON.stringify(doc));
  console.log(`wrote universe.json: ${doc.count} filers, ${doc.screenable} screenable (10-K filers, non-financial)`);
  return doc;
}

const shardOf = cik => String(cik % 100).padStart(2, '0');

export async function buildFacts(universe, { limit, ciks, fresh } = {}) {
  let list = universe.companies.filter(c => c.domestic && !c.financial);
  if (ciks) list = list.filter(c => ciks.includes(c.cik));
  if (limit) list = list.slice(0, limit);
  const dir = path.join(OUT, 'facts'); await fs.mkdir(dir, { recursive: true });
  const shards = {}; const load = async s => { if (shards[s]) return shards[s]; try { shards[s] = fresh ? {} : JSON.parse(await fs.readFile(path.join(dir, s + '.json'), 'utf8')); } catch { shards[s] = {}; } return shards[s]; };
  const today = new Date().toISOString().slice(0, 10); let n = 0, ok = 0, empty = 0;
  for (const c of list) {
    const shard = await load(shardOf(c.cik)); n++;
    const doc = await sec(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(c.cik).padStart(10, '0')}.json`);
    if (!doc) { empty++; shard[c.cik] = { cik: c.cik, ticker: c.ticker, fetched: today, fy: {} }; continue; }
    const fy = extractFacts(doc);
    shard[c.cik] = { cik: c.cik, ticker: c.ticker, name: doc.entityName || c.name, fetched: today, fy };
    if (Object.keys(fy).length) ok++;
    if (n % 100 === 0) { console.log(`  facts ${n}/${list.length} (${ok} with data, ${empty} none)`); for (const [s, d] of Object.entries(shards)) await fs.writeFile(path.join(dir, s + '.json'), JSON.stringify(d)); }
  }
  for (const [s, d] of Object.entries(shards)) await fs.writeFile(path.join(dir, s + '.json'), JSON.stringify(d));
  const meta = { asOf: today, companies: n, withData: ok, noXbrl: empty, fields: Object.fromEntries(Object.entries(FIELDS).map(([k, v]) => [k, v.tags])), pointInTime: 'v/filed = earliest 10-K reporting the period; r = latest differing restatement' };
  await fs.writeFile(path.join(OUT, 'facts.meta.json'), JSON.stringify(meta, null, 2));
  console.log(`facts done: ${n} companies, ${ok} with annual data, ${empty} without XBRL`);
  return meta;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  (async () => {
    const doUni = flag('universe') || flag('all'), doFacts = flag('facts') || flag('all');
    if (!doUni && !doFacts) { console.log('usage: --universe | --facts | --all  [--limit N] [--cik a,b] [--fresh]'); process.exit(1); }
    let uni = null;
    if (doUni) uni = await buildUniverse();
    if (doFacts) {
      if (!uni) uni = JSON.parse(await fs.readFile(path.join(OUT, 'universe.json'), 'utf8'));
      const ciks = opt('cik') ? opt('cik').split(',').map(Number) : null;
      await buildFacts(uni, { limit: Number(opt('limit', 0)) || null, ciks, fresh: flag('fresh') });
    }
  })().catch(e => { console.error(e); process.exit(1); });
}
