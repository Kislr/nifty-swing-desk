/* Run the compounder screen on the stored fundamentals and write the result.
 *   node scripts/compounder-screen.mjs                 # US, as of today
 *   node scripts/compounder-screen.mjs --asof 2022-04-01   # point-in-time: only filings on or before that date
 * Writes compounder/data/us/screen-latest.json (or screen-DATE.json with --asof) and reports/compounder-us-DATE.md.
 * No prices yet: the market-cap band uses each company's 10-K public float as a labelled proxy. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = require(path.join(ROOT, 'compounder.js'));
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const market = opt('market', 'us'); const asOf = opt('asof', new Date().toISOString().slice(0, 10));

const screen = JSON.parse(await fs.readFile(path.join(ROOT, 'compounder', 'screen.json'), 'utf8'));
const dir = path.join(ROOT, 'compounder', 'data', market);
const universe = JSON.parse(await fs.readFile(path.join(dir, 'universe.json'), 'utf8'));
const facts = {}; for (const f of await fs.readdir(path.join(dir, 'facts'))) if (f.endsWith('.json')) Object.assign(facts, JSON.parse(await fs.readFile(path.join(dir, 'facts', f), 'utf8')));

const S = C.screenAt({ universe, facts }, screen, asOf, market, null);
const slim = r => ({ rank: r.rank, cik: r.cik, ticker: r.ticker, name: r.name, sic: r.sic, sicDesc: r.sicDesc, latest: r.latest, latestFiled: r.latestFiled, cap: r.cap, capSource: r.capSource, inBand: r.inBand, rankSum: r.rankSum, ranks: r.ranks, failed: r.failed, na: r.na,
  traits: Object.fromEntries(Object.entries(r.traits).map(([k, t]) => [k, { pass: t.pass, value: t.value, series: t.series, dilution: t.dilution, why: t.why }])) });
const out = { asOf, market, screenVersion: S.screenVersion, dataVintage: universe.asOf, counts: S.counts, capNote: 'no price feed yet: cap = 10-K public float',
  quality: S.quality.map(slim), nearMiss: S.nearMiss.map(slim), allPassersOutOfBand: S.universe.filter(r => r.ok && r.inBand === false).map(slim) };
const isToday = asOf === new Date().toISOString().slice(0, 10);
await fs.writeFile(path.join(dir, isToday ? 'screen-latest.json' : `screen-${asOf}.json`), JSON.stringify(out));

const M = screen.markets[market]; const L = [];
L.push(`# Compounder screen — ${M.name}, as of ${asOf}`, '', `Screen v${screen.version} on the EDGAR store of ${universe.asOf}. **Research aid, not investment advice.** Market cap here is the 10-K public float (no price feed yet); the band is $${M.marketCap.min}M–$${M.marketCap.max}M.`, '');
L.push(`## Funnel`, '', `| step | companies |`, `|---|---|`, `| screenable (10-K filers, non-financial) | ${S.counts.screened} |`, `| with 5+ fiscal years filed by ${asOf} | ${S.counts.enoughYears} |`, `| pass all five traits | ${S.counts.passAll} |`, `| …and inside the cap band (the quality list) | ${S.counts.inBand} |`, `| four passes, one trait not applicable (near-miss) | ${S.counts.nearMiss} |`, '');
L.push(`Failed by trait (a company can fail several): ${Object.entries(S.counts.failedBy).map(([k, v]) => `${k} ${v}`).join(', ')}.`, `Not applicable by trait: ${Object.entries(S.counts.naBy).map(([k, v]) => `${k} ${v}`).join(', ')}.`, '');
L.push(`## Quality list (${S.quality.length})`, '', `| # | ticker | company | industry | ROCE med | GM | 5y rev CAGR | shares 5y | OCF/NI | net debt/EBITDA | cap $M | latest FY |`, `|---|---|---|---|---|---|---|---|---|---|---|---|`);
for (const r of S.quality) L.push(`| ${r.rank} | ${r.ticker} | ${r.name} | ${r.sicDesc || ''} | ${r.traits.roce.value}% | ${r.traits.grossMargin.value}% | ${r.traits.growth.value}% | ${r.traits.growth.dilution >= 0 ? '+' : ''}${r.traits.growth.dilution}% | ${r.traits.cashConversion.value} | ${r.traits.leverage.value === 0 ? 'net cash' : r.traits.leverage.value} | ${r.cap != null ? r.cap : '—'} | ${r.latest} |`);
L.push('', `## Near-misses: four passes, one trait not applicable (${S.nearMiss.length})`, '', `These fail the "all five" rule only because one trait cannot be computed, mostly gross margin for businesses with no cost-of-revenue line. The rule decision is open (SCREEN.md).`, '', `| ticker | company | industry | not applicable | why |`, `|---|---|---|---|---|`);
for (const r of S.nearMiss.slice(0, 60)) L.push(`| ${r.ticker} | ${r.name} | ${r.sicDesc || ''} | ${r.na[0]} | ${r.traits[r.na[0]].why} |`);
const oob = S.universe.filter(r => r.ok && r.inBand === false);
L.push('', `## Pass all five but outside the cap band (${oob.length})`, '', oob.map(r => `${r.ticker} ($${r.cap}M)`).join(', ') || 'none', '');
// Sensitivity: how many names each threshold set yields. The backtest decides which set is right; this only shows how binding each rule is.
const variants = [
  ['v0.1 as written', {}],
  ['ROCE ≥ 12% in 3 of 5, floor 8%', s => { s.traits.roce.threshold = 12; s.traits.roce.minYearsPassing = 3; s.traits.roce.floor = 8; }],
  ['revenue CAGR ≥ 8%', s => { s.traits.growthWithoutDilution.minRevenueCagr = 8; }],
  ['gross margin within 4 pts of high', s => { s.traits.grossMargin.maxDropFromHighPts = 4; }],
  ['all three relaxations together', s => { s.traits.roce.threshold = 12; s.traits.roce.minYearsPassing = 3; s.traits.roce.floor = 8; s.traits.growthWithoutDilution.minRevenueCagr = 8; s.traits.grossMargin.maxDropFromHighPts = 4; }],
];
L.push(`## Sensitivity of the thresholds`, '', `| thresholds | pass all five | in cap band | near-miss |`, `|---|---|---|---|`);
for (const [name, mod] of variants) { const s2 = JSON.parse(JSON.stringify(screen)); if (typeof mod === 'function') mod(s2); const S2 = C.screenAt({ universe, facts }, s2, asOf, market, null); L.push(`| ${name} | ${S2.counts.passAll} | ${S2.counts.inBand} | ${S2.counts.nearMiss} |`); }
L.push('', `Per-trait pass rates where the trait is computable: ${['roce', 'grossMargin', 'growth', 'cashConversion', 'leverage'].map(k => { const app = S.universe.filter(r => !r.reason && r.traits[k].pass != null); return `${k} ${Math.round(100 * app.filter(r => r.traits[k].pass).length / app.length)}% of ${app.length}`; }).join('; ')}.`, '');
L.push(`## How to read this`, '', `Every number is as first reported in the 10-K that covered that year (point-in-time), not as later restated. ROCE = operating income / (total assets − current liabilities); the rule is 4 of 5 years ≥ ${screen.traits.roce.threshold}% and no year under ${screen.traits.roce.floor}%. Gross margin must be within ${screen.traits.grossMargin.maxDropFromHighPts} points of its 5-year high. Revenue CAGR ≥ ${screen.traits.growthWithoutDilution.minRevenueCagr}% with diluted shares up ≤ ${screen.traits.growthWithoutDilution.maxShareCountGrowth}%. 3-year OCF / net income ≥ ${screen.traits.cashConversion.minRatio}. Net debt / EBITDA ≤ ${screen.traits.leverage.maxNetDebtToEbitda} (net cash passes). Rank = sum of the five per-trait ranks, no weights. None of this has been backtested yet; see SCREEN.md for the pass criteria it must meet.`);
await fs.mkdir(path.join(ROOT, 'reports'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'reports', `compounder-${market}-${asOf}.md`), L.join('\n'));
console.log(C.digest(S, 40));
console.log(`\nwrote compounder/data/${market}/${isToday ? 'screen-latest.json' : 'screen-' + asOf + '.json'} and reports/compounder-${market}-${asOf}.md`);
