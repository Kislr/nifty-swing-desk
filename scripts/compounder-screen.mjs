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

// Prices (optional): compounder/data/<market>/prices/YYYY.json.gz in the desk's history shape → bars via engine.buildBars.
// From them: last close × cover-page shares = market cap, 20-day average dollar turnover = liquidity, and the momentum overlay.
const E = require(path.join(ROOT, 'engine.js')); const MOM = require(path.join(ROOT, 'momentum.js'));
const zlib = await import('node:zlib');
let bars = null, prices = null, priceMeta = null;
try {
  const pdir = path.join(dir, 'prices'); const yearFiles = [];
  for (const f of (await fs.readdir(pdir)).sort()) if (/^\d{4}\.json\.gz$/.test(f)) yearFiles.push(JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(pdir, f))).toString()));
  if (yearFiles.length) { bars = E.buildBars(yearFiles, []); priceMeta = JSON.parse(await fs.readFile(path.join(pdir, 'meta.json'), 'utf8')).asOf; }
} catch (e) { if (e.code !== 'ENOENT') throw e; }
if (bars) {
  // the bar on or before asOf
  let i = bars.dates.length - 1; while (i > 0 && bars.dates[i] > asOf) i--;
  prices = {}; const byTicker = {}; for (const c of universe.companies) if (c.ticker) byTicker[c.ticker] = c.cik;
  for (const [t, B] of Object.entries(bars.sym)) { const cik = byTicker[t]; if (!cik) continue; let j = i; while (j >= 0 && B.c[j] == null) j--; if (j < 0 || i - j > 10) continue;
    const turn = []; for (let k = Math.max(0, j - 19); k <= j; k++) if (B.t[k] != null) turn.push(B.t[k]);
    prices[cik] = { price: B.c[j], date: bars.dates[j], avgTurnover: turn.length ? +(turn.reduce((a, b) => a + b, 0) / turn.length).toFixed(2) : null }; }
}
const S = C.screenAt({ universe, facts }, screen, asOf, market, prices);
// Momentum overlay: the desk's momentum engine on the quality list, with the market's turnover floor in its own units ($M here).
let mom = null;
if (bars && S.quality.length) {
  const O = screen.momentumOverlay; const Mk = screen.markets[market];
  let i = bars.dates.length - 1; while (i > 0 && bars.dates[i] > asOf) i--;
  const sub = { dates: bars.dates, index: bars.index, sym: {} }; for (const r of S.quality) if (bars.sym[r.ticker]) sub.sym[r.ticker] = bars.sym[r.ticker];
  const R = MOM.rankAt(sub, i, { lookback: O.lookback, skip: O.skip, maxOffHigh: O.maxOffHigh, gateSma: O.gateSma, minTurnover: Mk.minAvgDailyDollarVolume != null ? Mk.minAvgDailyDollarVolume : Mk.minAvgDailyTurnoverCrore, volAdjust: false }, {});
  const byT = {}; for (const r of R.universe) byT[r.sym] = r; const half = Math.ceil(S.quality.length / 2);
  for (const r of S.quality) { const m = byT[r.ticker]; r.momentum = m ? { rank: m.rank || null, eligible: m.eligible, why: m.why || null, ret6: m.ret6 != null ? +(m.ret6 * 100).toFixed(1) : null, ret1: m.ret1 != null ? +(m.ret1 * 100).toFixed(1) : null, offHigh: m.offHigh != null ? +m.offHigh.toFixed(1) : null } : { rank: null, eligible: false, why: 'no price history' };
    r.moving = !!(m && m.eligible && m.rank <= half && R.gate.open === true); }
  mom = { date: bars.dates[i], gate: R.gate, half, intersection: S.quality.filter(r => r.moving).map(r => r.ticker) };
}
const slim = r => ({ rank: r.rank, cik: r.cik, ticker: r.ticker, name: r.name, sic: r.sic, sicDesc: r.sicDesc, latest: r.latest, latestFiled: r.latestFiled, cap: r.cap, capSource: r.capSource, inBand: r.inBand, rankSum: r.rankSum, ranks: r.ranks, failed: r.failed, na: r.na,
  price: r.price, priceDate: r.priceDate, avgTurnover: r.avgTurnover, illiquid: r.illiquid, momentum: r.momentum, moving: r.moving,
  traits: Object.fromEntries(Object.entries(r.traits).map(([k, t]) => [k, { pass: t.pass, value: t.value, series: t.series, dilution: t.dilution, why: t.why }])) });
const out = { asOf, market, screenVersion: S.screenVersion, dataVintage: universe.asOf, priceVintage: priceMeta, counts: S.counts, capNote: bars ? 'cap = last close × cover-page shares; public float where no price' : 'no price feed yet: cap = 10-K public float', momentum: mom,
  quality: S.quality.map(slim), nearMiss: S.nearMiss.map(slim), allPassersOutOfBand: S.universe.filter(r => r.ok && r.inBand === false).map(slim), illiquidPassers: S.universe.filter(r => r.ok && r.inBand !== false && r.illiquid === true).map(slim) };
const isToday = asOf === new Date().toISOString().slice(0, 10);
await fs.writeFile(path.join(dir, isToday ? 'screen-latest.json' : `screen-${asOf}.json`), JSON.stringify(out));

const M = screen.markets[market]; const L = [];
L.push(`# Compounder screen — ${M.name}, as of ${asOf}`, '', `Screen v${screen.version} on the EDGAR store of ${universe.asOf}${bars ? ` and prices to ${mom ? mom.date : priceMeta}` : ''}. **Research aid, not investment advice.** ${bars ? `Market cap = last close × cover-page shares (${S.counts.pricedRows} companies priced); liquidity floor $${M.minAvgDailyDollarVolume}M average daily turnover.` : 'Market cap here is the 10-K public float (no price feed yet).'} The cap band is $${M.marketCap.min}M–$${M.marketCap.max}M.`, '');
L.push(`## Funnel`, '', `| step | companies |`, `|---|---|`, `| screenable (10-K filers, non-financial) | ${S.counts.screened} |`, `| with 5+ fiscal years filed by ${asOf} | ${S.counts.enoughYears} |`, `| pass all five traits | ${S.counts.passAll} |`, `| …and inside the cap band and liquid (the quality list) | ${S.counts.inBand} |`, `| pass but below the liquidity floor | ${S.counts.illiquidPassers} |`, `| four passes, one trait not applicable (near-miss) | ${S.counts.nearMiss} |`, '');
L.push(`Failed by trait (a company can fail several): ${Object.entries(S.counts.failedBy).map(([k, v]) => `${k} ${v}`).join(', ')}.`, `Not applicable by trait: ${Object.entries(S.counts.naBy).map(([k, v]) => `${k} ${v}`).join(', ')}.`, '');
L.push(`## Quality list (${S.quality.length})`, '', `| # | ticker | company | industry | ROCE med | GM | 5y rev CAGR | shares 5y | OCF/NI | net debt/EBITDA | cap $M | latest FY |${mom ? ' 6m mom | off high | moving |' : ''}`, `|---|---|---|---|---|---|---|---|---|---|---|---|${mom ? '---|---|---|' : ''}`);
for (const r of S.quality) L.push(`| ${r.rank} | ${r.ticker} | ${r.name} | ${r.sicDesc || ''} | ${r.traits.roce.value}% | ${r.traits.grossMargin.value}% | ${r.traits.growth.value}% | ${r.traits.growth.dilution >= 0 ? '+' : ''}${r.traits.growth.dilution}% | ${r.traits.cashConversion.value} | ${r.traits.leverage.value === 0 ? 'net cash' : r.traits.leverage.value} | ${r.cap != null ? r.cap : '—'} | ${r.latest} |${mom ? ` ${r.momentum.ret6 != null ? r.momentum.ret6 + '%' : '—'} | ${r.momentum.offHigh != null ? r.momentum.offHigh + '%' : '—'} | ${r.moving ? '**yes**' : r.momentum.eligible ? 'no' : (r.momentum.why || '—')} |` : ''}`);
if (mom) L.push('', `## Quality AND momentum (${mom.intersection.length})`, '', `Gate: Russell 2000 ${mom.gate.open === true ? 'above' : mom.gate.open === false ? 'below' : 'n/a vs'} its ${mom.gate.n}-day average${mom.gate.index != null ? ` (${mom.gate.index.toFixed(0)} vs ${mom.gate.sma.toFixed(0)})` : ''} on ${mom.date}. "Moving" = momentum-eligible (turnover ≥ $${M.minAvgDailyDollarVolume}M, within ${screen.momentumOverlay.maxOffHigh}% of its 52-week high) and ranked in the top half of the quality list on 6-month return skipping the last month, with the gate open. This is the only list that is meant to trigger an alert.`, '', mom.intersection.length ? mom.intersection.join(', ') : (mom.gate.open === false ? 'none: the gate is closed' : 'none'), '');
L.push('', `## Near-misses: four passes, one trait not applicable (${S.nearMiss.length})`, '', `These fail the "all five" rule only because one trait cannot be computed, mostly gross margin for businesses with no cost-of-revenue line. The rule decision is open (SCREEN.md).`, '', `| ticker | company | industry | not applicable | why |`, `|---|---|---|---|---|`);
for (const r of S.nearMiss.slice(0, 60)) L.push(`| ${r.ticker} | ${r.name} | ${r.sicDesc || ''} | ${r.na[0]} | ${r.traits[r.na[0]].why} |`);
const oob = S.universe.filter(r => r.ok && r.inBand === false);
L.push('', `## Pass all five but outside the cap band (${oob.length})`, '', oob.map(r => `${r.ticker} ($${r.cap}M)`).join(', ') || 'none', '');
const ill = S.universe.filter(r => r.ok && r.inBand !== false && r.illiquid === true);
if (bars) L.push(`## Pass all five but below the liquidity floor (${ill.length})`, '', ill.map(r => `${r.ticker} ($${r.avgTurnover}M/day)`).join(', ') || 'none', '');
// Sensitivity: how many names each threshold set yields. The backtest decides which set is right; this only shows how binding each rule is.
const variants = [
  [`v${screen.version} as written`, {}],
  ['v0.1 strict: ROCE 15 in 4/5 floor 10, GM 2 pts, CAGR 12', s => { s.traits.roce.threshold = 15; s.traits.roce.floor = 10; s.traits.grossMargin.maxDropFromHighPts = 2; s.traits.growthWithoutDilution.minRevenueCagr = 12; }],
  ['relaxed: ROCE 12 in 3/5 floor 8, GM 4 pts, CAGR 8', s => { s.traits.roce.threshold = 12; s.traits.roce.minYearsPassing = 3; s.traits.roce.floor = 8; s.traits.growthWithoutDilution.minRevenueCagr = 8; s.traits.grossMargin.maxDropFromHighPts = 4; }],
  ['ROCE only at v0.1 (15 in 4/5, floor 10)', s => { s.traits.roce.threshold = 15; s.traits.roce.floor = 10; }],
  ['CAGR only at v0.1 (12)', s => { s.traits.growthWithoutDilution.minRevenueCagr = 12; }],
  ['gross margin only at v0.1 (2 pts)', s => { s.traits.grossMargin.maxDropFromHighPts = 2; }],
];
L.push(`## Sensitivity of the thresholds`, '', `| thresholds | pass all five | in cap band | near-miss |`, `|---|---|---|---|`);
for (const [name, mod] of variants) { const s2 = JSON.parse(JSON.stringify(screen)); if (typeof mod === 'function') mod(s2); const S2 = C.screenAt({ universe, facts }, s2, asOf, market, null); L.push(`| ${name} | ${S2.counts.passAll} | ${S2.counts.inBand} | ${S2.counts.nearMiss} |`); }
L.push('', `Per-trait pass rates where the trait is computable: ${['roce', 'grossMargin', 'growth', 'cashConversion', 'leverage'].map(k => { const app = S.universe.filter(r => !r.reason && r.traits[k].pass != null); return `${k} ${Math.round(100 * app.filter(r => r.traits[k].pass).length / app.length)}% of ${app.length}`; }).join('; ')}.`, '');
L.push(`## How to read this`, '', `Every number is as first reported in the 10-K that covered that year (point-in-time), not as later restated. ROCE = operating income / (total assets − current liabilities); the rule is 4 of 5 years ≥ ${screen.traits.roce.threshold}% and no year under ${screen.traits.roce.floor}%. Gross margin must be within ${screen.traits.grossMargin.maxDropFromHighPts} points of its 5-year high. Revenue CAGR ≥ ${screen.traits.growthWithoutDilution.minRevenueCagr}% with diluted shares up ≤ ${screen.traits.growthWithoutDilution.maxShareCountGrowth}%. 3-year OCF / net income ≥ ${screen.traits.cashConversion.minRatio}. Net debt / EBITDA ≤ ${screen.traits.leverage.maxNetDebtToEbitda} (net cash passes). Rank = sum of the five per-trait ranks, no weights. None of this has been backtested yet; see SCREEN.md for the pass criteria it must meet.`);
await fs.mkdir(path.join(ROOT, 'reports'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'reports', `compounder-${market}-${asOf}.md`), L.join('\n'));
console.log(C.digest(S, 40));
console.log(`\nwrote compounder/data/${market}/${isToday ? 'screen-latest.json' : 'screen-' + asOf + '.json'} and reports/compounder-${market}-${asOf}.md`);
