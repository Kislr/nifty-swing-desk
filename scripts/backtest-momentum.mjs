#!/usr/bin/env node
/* Walk-forward backtest of the momentum engine (momentum.js) over data/history/*.json.
 *
 *   node scripts/backtest-momentum.mjs                       # defaults from momentum.js
 *   node scripts/backtest-momentum.mjs --set lookback=252 --set topN=10 --set trail=20
 *   node scripts/backtest-momentum.mjs --from 2025-06-01 --to 2026-06-30
 *   node scripts/backtest-momentum.mjs --sweep               # a fixed grid of lookback / topN / trail / gate, one table
 *   node scripts/backtest-momentum.mjs --benchmarks          # also NSE's total-return indices (data/benchmarks/) over the same window
 *   node scripts/backtest-momentum.mjs --benchmarks --phases # the same rules started on each day of one rebalance cycle (21 runs): how much of the result is the calendar
 *   node scripts/backtest-momentum.mjs --benchmarks path/to/dir
 *   node scripts/backtest-momentum.mjs --members           # rank and trade only that day's NIFTY 500 members (data/membership/members.json)
 *                                                          # — the default since 19 Nov 2026 when that file exists and no --hist is given;
 *   node scripts/backtest-momentum.mjs --no-members        # every symbol with bars on every day (not a universe that existed; report gets -allnames)
 *   node scripts/backtest-momentum.mjs --set refill=rebalance --set volScale=false   # the 12 Nov 2026 rules (both switches off; report gets -norefill -novolscale)
 *                                                          # refill=close fills a slot freed by a stop (or left empty by a closed gate) at the next close; volScale=true half-sizes
 *                                                          # new buys while the index's 20-bar volatility is above its one-year median — both on by default since 13 Nov 2026
 *                                                          # (owner's decision; tests in reports/momentum-hypotheses-2026-11-13.md and momentum-refinements-2026-11-13-adjusted-members.md)
 *
 * Model: ranks on each rebalance day's close and buys at that close plus half the round-trip cost (a conservative
 * stand-in for the next open); trailing stops are checked on closes. Equal weight = capital / topN, fixed for the run
 * (profits sit as cash). Every single run also reports the same rules with `compound` flipped — slot = current equity /
 * topN at each rebalance — in the next row, so the fixed-slot and reinvested records are always read together
 * (`--set compound=true` makes the reinvested run the primary one). The warm-up is lookback + skip bars, so a 12-month lookback on
 * two years of history leaves under a year of test — read the report's warning line.
 * `--benchmarks` loads niftyindices.com total-return files from data/benchmarks/ (see scripts/benchmarks.mjs) and measures
 * each index over the test window exactly as the equity curve is measured — a row per index in the Overall table, a
 * column per index in the by-year table, and a section comparing the reinvested run with the investable momentum indices.
 * `--members [file]` applies the point-in-time membership list built by scripts/membership.mjs: on every day only the
 * names in the index that day are ranked, so a holding that leaves the index is unranked at the next rebalance and exits
 * as 'ineligible'. Names that left the index before the history was loaded have no bars until the owner's price load
 * for past members, so until then the option removes future members only (the report says how many names it saw).
 * The report file gets a `-members` suffix so it never overwrites the plain run.
 * Writes reports/momentum-<stamp>.md and .json. */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as BM from './benchmarks.mjs';
import { membershipFilter, membersOn } from './membership.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js')); const M = require(path.join(ROOT, 'momentum.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; }; const flag = k => argv.includes('--' + k);
const sets = {}; argv.forEach((a, i) => { if (a === '--set') { const [k, v] = argv[i + 1].split('='); sets[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; } });
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const capital = config.risk.capital; const from = arg('from'), to = arg('to');

const HIST = arg('hist', path.join(ROOT, 'data', 'history'));
const files = []; for (const f of (await fs.readdir(HIST).catch(() => []))) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
if (!files.length) { console.error('No history files in data/history/. Run the backfill first: node scripts/backfill.mjs --years 5'); process.exit(2); }
const custom = (JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'sectors.json'), 'utf8').catch(() => '{"map":{}}'))).map || {};
const adjustments = JSON.parse(await fs.readFile(arg('adjust', path.join(ROOT, 'data', 'adjustments.json')), 'utf8').catch(() => 'null'));   // corporate actions (scripts/corporate-actions.mjs); optional
const bars = E.buildBars(files, [], { adjustments }); const N = bars.dates.length;
if (bars.adjusted) console.log(`corporate actions applied: ${bars.adjusted.events} events across ${bars.adjusted.symbols} symbols`);
console.log(`history: ${N} days, ${Object.keys(bars.sym).length} symbols, ${bars.dates[0]} → ${bars.dates[N - 1]}${bars.index ? ', index bars present' : ', no index bars (gate disabled)'}`);
// A22 step 2: the fill rule at the band acts only on days whose series are on record; say how many there are, and stop a band-fill run that has almost none
const seriesOnFile = bars.dates.filter(d => bars.series && bars.series[d]).length;
console.log(`series on record: ${seriesOnFile} of ${N} days${seriesOnFile < N ? ' — the rest are read as "not known" and bought and sold at the close (BACKFILL.md, "Series — the second home run")' : ''}`);
if (flag('coverage')) process.exit(0);   // --coverage: print the two lines above and stop (the check after a series home run)
if ((sets.bandFill === 'both' || sets.bandFill === 'sell') && seriesOnFile < N * 0.9 && !flag('allow-partial-series')) { console.error(`bandFill=${sets.bandFill} needs the series of the bars: only ${seriesOnFile} of ${N} days have them. Run the series home run first (BACKFILL.md), or pass --allow-partial-series to run on what there is.`); process.exit(2); }

const pc = (x, d = 1) => x == null ? '—' : (x * 100).toFixed(d) + '%';
const f = (x, d = 2) => (x == null || !isFinite(x)) ? '—' : Number(x).toFixed(d);
const run = (params, start = from) => { const sim = M.simulate(bars, params, custom, { from: start, to, capital, filter: MEM ? membershipFilter(MEM) : null, stale: MEM ? 20 : 0 }); return { sim, st: M.stats(sim) }; };   // with --members a name with no close for 20 bars has stopped trading
const row = (name, st) => `| ${name} | ${st.n} | ${pc(st.totalReturn)} | ${pc(st.cagr)} | ${pc(st.indexReturn)} | ${pc(st.maxDrawdown)} | ${f(st.sharpe)} | ${st.winRate == null ? '—' : pc(st.winRate, 0)} | ${f(st.avgBars, 0)} | ${pc(st.inMarket, 0)} | ${pc(st.atWork, 0)} |`;
const hdr = '| run | trades | total return | CAGR | Nifty (same period) | max DD | Sharpe | win rate | avg bars | time in market | equity at work |\n|---|---|---|---|---|---|---|---|---|---|---|';
// --members [file]: point-in-time NIFTY 500 membership; the filter goes into every rankAt through simulate's opts.
let MEM = null, memStats = null;
// 19 Nov 2026 (interim audit A4): membership is the default on the repository's own history. Since the past members were loaded the
// history holds every name that was ever in the index, for all of its bars, so a run without the list trades a universe that never
// existed. `--no-members` asks for that run by name (report suffix -allnames); a custom `--hist` store has no list unless `--members` gives one.
const memDefault = path.join(ROOT, 'data', 'membership', 'members.json'); const allNames = flag('no-members');
const memOn = !allNames && (flag('members') || (!argv.includes('--hist') && existsSync(memDefault)));
if (allNames) console.warn('NOTE: --no-members — every symbol in the history is traded on every day it has a bar, members or not. Not a universe that existed; for comparison only.');
if (memOn) { const v = arg('members'); const file = v && !v.startsWith('--') ? path.resolve(v) : memDefault;
  MEM = JSON.parse(await fs.readFile(file, 'utf8').catch(() => { console.error(`--members: cannot read ${file}. Build it first: node scripts/membership.mjs`); process.exit(2); }));
  const ever = Object.keys(MEM.symbols); const withBars = ever.filter(s => bars.sym[s]); const todayOnly = Object.keys(bars.sym).filter(s => !MEM.symbols[s]);
  memStats = { from: MEM.from, asOf: MEM.asOf, events: MEM.events.length, everMembers: ever.length, everWithBars: withBars.length, barsNotMembers: todayOnly.length, membersOnFirstDay: membersOn(MEM, bars.dates[0] < MEM.from ? MEM.from : bars.dates[0]).filter(s => bars.sym[s]).length };
  console.log(`membership: ${memStats.events} events ${MEM.from} → ${MEM.asOf}; ${memStats.everMembers} names were ever members, ${memStats.everWithBars} of them have bars (the rest await the past-members price load); ${memStats.barsNotMembers} symbols with bars were never members`); }
const stamp = new Date().toISOString().slice(0, 10) + (bars.adjusted && bars.adjusted.events ? '-adjusted' : '') + (MEM ? '-members' : allNames ? '-allnames' : '')
  + (sets.refill === 'rebalance' ? '-norefill' : '') + (sets.volScale === false ? '-novolscale' : '') + (sets.bandFill === 'both' ? '-bandfill' : sets.bandFill === 'sell' ? '-bandsell' : '');   // adjusted-history, members and switched-off runs get their own file names, so a variant never overwrites a baseline (13 Nov 2026: both switches are on by default; the 13 Nov reports were written while they were off, hence their -refill / -volscale names)
const OUT = arg('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });

// --benchmarks [dir]: NSE total-return indices, stitched from the one-year files the site serves. Optional; nothing changes without the flag.
let benchmarks = null;
if (flag('benchmarks')) { const v = arg('benchmarks'); const dir = v && !v.startsWith('--') ? path.resolve(v) : path.join(ROOT, 'data', 'benchmarks');
  benchmarks = await BM.loadBenchmarks(dir); const list = Object.values(benchmarks);
  if (!list.length) { console.error(`--benchmarks: no CSV files in ${dir}. Download the total-return histories from niftyindices.com into data/benchmarks/ (one year per file, as the site serves them).`); process.exit(2); }
  for (const S of list) { console.log(`benchmark ${S.name}: ${S.files} files, ${S.dates.length} days, ${S.dates[0]} → ${S.dates[S.dates.length - 1]}${S.ntr ? ', TR and Net TR' : ', TR only'}${S.gaps.length ? ` — GAPS: ${S.gaps.map(g => `${g.from}→${g.to}`).join(', ')}` : ''}`); } }

if (flag('sweep')) {
  const grid = [];
  for (const lookback of [63, 126, 189, 252]) for (const topN of [10, 15, 20]) for (const trail of [10, 15, 20, 25]) for (const volAdjust of [true, false]) grid.push({ lookback, topN, trail, volAdjust, holdRank: topN * 2 });
  const lines = [`# Momentum sweep — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days). Each row is a full walk-forward run; the test window shrinks as the lookback grows (warm-up = lookback + 21 bars).`, '', hdr];
  const results = [];
  for (const g of grid) { const { st } = run(Object.assign({}, sets, g)); results.push({ g, st }); lines.push(row(`lb ${g.lookback} · top ${g.topN} · trail ${g.trail}% · ${g.volAdjust ? 'vol-adj' : 'raw'}`, st)); process.stdout.write(`\r${results.length}/${grid.length}   `); }
  process.stdout.write('\n');
  const best = [...results].filter(r => r.st.days > 120).sort((a, b) => (b.st.sharpe || -9) - (a.st.sharpe || -9)).slice(0, 5);
  lines.push('', '## Top 5 by Sharpe (test window > 120 days)', '', hdr, ...best.map(r => row(`lb ${r.g.lookback} · top ${r.g.topN} · trail ${r.g.trail}% · ${r.g.volAdjust ? 'vol-adj' : 'raw'}`, r.st)));
  lines.push('', '**Read this as a map of the parameter space, not a recommendation.** With one or two years of history every cell is a handful of rebalances; the best cell is the luckiest cell. Look for broad plateaus (neighbouring cells that all look similar), not peaks.');
  await fs.writeFile(path.join(OUT, `momentum-sweep-${stamp}.md`), lines.join('\n')); await fs.writeFile(path.join(OUT, `momentum-sweep-${stamp}.json`), JSON.stringify(results.map(r => ({ params: r.g, stats: r.st })), null, 1));
  console.log(lines.slice(-8).join('\n')); console.log(`\nfull table: reports/momentum-sweep-${stamp}.md`);
  process.exit(0);
}

// --phases (21 Nov 2026, audit A18). The engine rebalances every `rebalance` bars counted from its first day, so the start day fixes
// which days it trades on for the whole run. Loading ten weekend sessions moved every rebalance after October 2019 by a few bars and
// the ten-year figure with it — 18.5% a year to 15.5% on the same rules and the same prices. This mode measures that directly: the
// reinvested run started on each of the first `rebalance` trading days of the window, everything else equal, each beside the
// indices over its own window. The single run on record is one of these rows; the spread is what a single row cannot show.
if (flag('phases')) {
  const first = run(Object.assign({}, sets, { compound: true })); const cyc = first.sim.params.rebalance; const i0 = bars.dates.indexOf(first.st.start);
  const bmList = benchmarks ? Object.values(benchmarks).sort((a, b) => a.name.localeCompare(b.name)) : []; const rows = [];
  for (let k = 0; k < cyc && i0 + k < N; k++) { const r = k === 0 ? first : run(Object.assign({}, sets, { compound: true }), bars.dates[i0 + k]); const st = r.st;
    rows.push({ start: st.start, end: st.end, trades: st.n, totalReturn: st.totalReturn, cagr: st.cagr, maxDrawdown: st.maxDrawdown, sharpe: st.sharpe, winRate: st.winRate, band: st.band, bm: Object.fromEntries(bmList.map(S => { const w = BM.windowStats(S, st.start, st.end); return [S.name, w && w.covered ? w.cagr : null]; })) }); process.stdout.write(`\r${rows.length}/${cyc}   `); }
  process.stdout.write('\n');
  const q = (a, p) => { const v = [...a].sort((x, y) => x - y); const i = (v.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return v[lo] + (v[hi] - v[lo]) * (i - lo); }; const mean = a => a.reduce((x, y) => x + y, 0) / a.length; const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
  const C = rows.map(r => r.cagr), S = rows.map(r => r.sharpe), DD = rows.map(r => r.maxDrawdown); const P0 = first.sim.params;
  const summary = { starts: rows.length, cagr: { min: Math.min(...C), q1: q(C, 0.25), median: q(C, 0.5), q3: q(C, 0.75), max: Math.max(...C), mean: mean(C), sd: sd(C) }, sharpe: { min: Math.min(...S), median: q(S, 0.5), max: Math.max(...S) }, maxDrawdown: { min: Math.min(...DD), median: q(DD, 0.5), max: Math.max(...DD) },
    against: Object.fromEntries(bmList.map(B => { const ok = rows.filter(r => r.bm[B.name] != null); return [B.name, { compared: ok.length, ahead: ok.filter(r => r.cagr > r.bm[B.name]).length, aheadBy2: ok.filter(r => r.cagr >= r.bm[B.name] + 0.02).length, indexCagrMin: ok.length ? Math.min(...ok.map(r => r.bm[B.name])) : null, indexCagrMax: ok.length ? Math.max(...ok.map(r => r.bm[B.name])) : null }]; })) };
  const lines = [`# Momentum backtest, by rebalance phase — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days, ${Object.keys(bars.sym).length} symbols). Parameters: ${JSON.stringify(P0)}. Reinvested runs${MEM ? ', that day\'s NIFTY 500 members' : ''}.`, '',
    `The engine rebalances every ${cyc} bars counted from its first day, so the day a run starts fixes which days it trades on for the next ten years. Each row below is the same rules, the same prices and the same last day, started one trading day later than the row above — one full cycle of ${rows.length} starts. Nothing else differs between the rows. The run on record (the first row, ${rows[0].start}) is one of them.`, '',
    `| start | trades | total return | CAGR | max DD | Sharpe | win rate |${bmList.map(B => ` ${BM.shortName(B.name)} TR, same window |`).join('')}`, '|---|---|---|---|---|---|---|' + bmList.map(() => '---|').join(''),
    ...rows.map((r, k) => `| ${k === 0 ? '**' + r.start + '**' : r.start} | ${r.trades} | ${pc(r.totalReturn)} | ${k === 0 ? '**' + pc(r.cagr) + '**' : pc(r.cagr)} | ${pc(r.maxDrawdown)} | ${f(r.sharpe)} | ${r.winRate == null ? '—' : pc(r.winRate, 0)} |${bmList.map(B => ` ${r.bm[B.name] == null ? '—' : pc(r.bm[B.name])} |`).join('')}`), '',
    '## The spread', '', `CAGR across the ${rows.length} starts: **${pc(summary.cagr.min)} to ${pc(summary.cagr.max)}**, median **${pc(summary.cagr.median)}**, middle half ${pc(summary.cagr.q1)} to ${pc(summary.cagr.q3)}, mean ${pc(summary.cagr.mean)}, standard deviation ${pc(summary.cagr.sd)}. Sharpe ${f(summary.sharpe.min)} to ${f(summary.sharpe.max)}, median ${f(summary.sharpe.median)}. Max drawdown ${pc(summary.maxDrawdown.min)} to ${pc(summary.maxDrawdown.max)}, median ${pc(summary.maxDrawdown.median)}.`, '',
    ...bmList.map(B => { const a = summary.against[B.name]; return a.compared ? `- **${B.name}** (${pc(a.indexCagrMin)}${a.indexCagrMax - a.indexCagrMin > 0.0005 ? ' to ' + pc(a.indexCagrMax) : ''} a year over the same windows): the engine is ahead in **${a.ahead} of ${a.compared}** starts, and ahead by two points or more in ${a.aheadBy2}.` : `- **${B.name}**: not covered.`; }), bmList.length ? '' : null,
    ...(P0.bandFill === 'both' || P0.bandFill === 'sell' ? ['## Fill rule at the band (A22)', '', `\`bandFill=${P0.bandFill}\` in every row (hypothesis: \`reports/momentum-fill-hypothesis-2026-11-25.md\`). Series on record for ${rows[0].band.seriesDays} of the first row's days. Across the ${rows.length} starts, sales not made on the day they fell due: ${Math.min(...rows.map(r => r.band.unfilled.sells))} to ${Math.max(...rows.map(r => r.band.unfilled.sells))} a run (median ${q(rows.map(r => r.band.unfilled.sells), 0.5)}); bars waited in all: ${Math.min(...rows.map(r => r.band.deferredBars))} to ${Math.max(...rows.map(r => r.band.deferredBars))}; purchases not made: ${Math.min(...rows.map(r => r.band.unfilled.buys))} to ${Math.max(...rows.map(r => r.band.unfilled.buys))}.`, ''] : []),
    '## How to read this', '', `One row is one draw. A difference between two versions of the rules, or between the engine and an index, that is smaller than this spread is not a finding — the same rules differ from themselves by that much when the calendar moves by a day. Compare medians, or count starts, and treat the single run on record as what it is: the row that happens to begin on ${rows[0].start}. The live paper book is one row too: it began on the day it began.`, '',
    'An index fund has no such row: it rebalances on published dates and holds the result. That is part of what "the fund is the holding" buys.'].filter(l => l != null);
  await fs.writeFile(path.join(OUT, `momentum-phases-${stamp}.md`), lines.join('\n')); await fs.writeFile(path.join(OUT, `momentum-phases-${stamp}.json`), JSON.stringify({ params: P0, summary, rows }, null, 1));
  console.log(lines.slice(lines.indexOf('## The spread')).join('\n')); console.log(`\nfull table: reports/momentum-phases-${stamp}.md`);
  process.exit(0);
}
const { sim, st } = run(sets); const P = sim.params;
const alt = run(Object.assign({}, sets, { compound: !P.compound })); const label = c => c ? 'momentum, reinvested (compound)' : 'momentum, fixed slots';
const warn = st.days < 250 ? `**Warning: only ${st.days} trading days in the test window** (warm-up ate ${sim.warmup} of ${N}). That is ${Math.round(st.days / P.rebalance)} rebalances — enough to see the machinery work, not enough to trust the numbers. Extend the history: \`node scripts/backfill.mjs --years 5\`.` : st.days < 750 ? `**Caution: ${st.days} trading days (~${(st.days / 250).toFixed(1)} years) in the test window.** Momentum's edge shows up over full cycles; one bull or one bear year proves little.` : '';
// Benchmarks over the same test window, measured like the equity curve (BM.windowStats mirrors M.stats); sorted so NIFTY 50 comes first.
const bm = benchmarks ? Object.values(benchmarks).sort((a, b) => a.name.localeCompare(b.name)).map(S => ({ S, w: BM.windowStats(S, st.start, st.end), yr: BM.byYear(S, st.start, st.end) })) : [];
const bmRow = b => b.w && b.w.covered ? `| ${b.S.name} (total return index) | — | ${pc(b.w.totalReturn)} | ${pc(b.w.cagr)} | — | ${pc(b.w.maxDrawdown)} | ${f(b.w.sharpe)} | — | — | — | — |` : `| ${b.S.name} (total return index) | — | not covered: files run ${b.w.first} → ${b.w.last} | | | | | | | | |`;
const yr = Object.entries(st.byYear).map(([y, b]) => { const a = alt.st.byYear[y]; return `| ${y} | ${pc(b.end / b.start - 1)} | ${a ? pc(a.end / a.start - 1) : '—'} | ${b.idx0 && b.idx1 ? pc(b.idx1 / b.idx0 - 1) : '—'} |${bm.map(x => ` ${x.yr[y] ? pc(x.yr[y].ret) : '—'} |`).join('')}`; });
const rein = P.compound ? st : alt.st;   // the reinvested run is the one to compare with an index, whichever row is primary
const against = [];
if (bm.length) {
  const years = Object.keys(rein.byYear); const reinY = y => rein.byYear[y].end / rein.byYear[y].start - 1;
  against.push('## Against NSE\'s own indices (total return)', '', `Total-return indices from niftyindices.com (\`data/benchmarks/\`, ${bm.reduce((n, b) => n + b.S.files, 0)} files stitched by \`scripts/benchmarks.mjs\`), each measured over the same test window ${st.start} → ${st.end} with the same arithmetic as the equity curve (CAGR on 250-day years, drawdown on closes, Sharpe without a risk-free rate). The Nifty 50 column elsewhere in this report is the price index from the daily bars; the total-return version below adds dividends, which is what an index fund actually earns before its own costs. The two momentum indices are the free, survivorship-free, investable version of this engine's idea — index funds and ETFs track both — so the question for each is whether the reinvested row beats it by enough to pay for running a desk.`, '');
  for (const b of bm) { if (!b.w || !b.w.covered) { against.push(`- **${b.S.name}**: files cover ${b.w.first} → ${b.w.last}, not the test window — nothing to compare.`); continue; }
    const ahead = years.filter(y => b.yr[y] && reinY(y) > b.yr[y].ret).length, scored = years.filter(y => b.yr[y]).length; const gap = rein.cagr - b.w.cagr;
    against.push(`- **${b.S.name}** — ${pc(b.w.totalReturn)} total, ${pc(b.w.cagr)} a year, max drawdown ${pc(b.w.maxDrawdown)}, Sharpe ${f(b.w.sharpe)}. Reinvested run: ${pc(rein.totalReturn)}, ${pc(rein.cagr)} a year, drawdown ${pc(rein.maxDrawdown)}, Sharpe ${f(rein.sharpe)} — **${gap >= 0 ? '+' : ''}${pc(gap)} a year ${gap >= 0 ? 'ahead of' : 'behind'} the index**, ahead in ${ahead} of ${scored} calendar years${b.S.ntr && BM.windowStats(b.S, st.start, st.end, 'ntr').covered ? ` (Net TR, after dividend tax: ${pc(BM.windowStats(b.S, st.start, st.end, 'ntr').totalReturn)} total)` : ''}.`); }
  against.push('', `Read with three caveats. ${MEM ? (memStats.everWithBars >= 0.98 * memStats.everMembers ? `The engine's row ranks only each day's NIFTY 500 members and ${memStats.everWithBars} of the ${memStats.everMembers} names that were ever members have bars, so the survivorship correction is complete on both sides: no name is bought before it entered the index, and the names that fell out are in the record.` : 'The engine\'s row ranks only each day\'s NIFTY 500 members, so names that entered the index later are no longer bought on their pre-entry run-up; but names that left the index before the history was loaded still have no bars, so the second half of the survivorship correction is still to come and the gap above is still an upper bound.') : 'The engine\'s row still runs on today\'s Nifty 500 constituents, so it carries survivorship bias the indices do not — the membership work sizes that, and until it is done the gap above is an upper bound.'} The indices are before fund costs: an index fund or ETF lags its index by its expense ratio and tracking error, which is small for the Nifty 50 and larger for the momentum indices (semi-annual reconstitution, higher turnover). And both momentum indices are back-calculated before their launch — Nifty200 Momentum 30 since 25 Aug 2020, Nifty500 Momentum 50 since June 2024 — so their early years are a published methodology replayed on history, not a live record; the engine's backtest is the same kind of number.`, '');
}
// A22 step 2: what the fill rule at the band did in this run — or, with the rule off, which trades on record it would have touched
const lateSales = sim.trades.filter(t => t.deferred > 0).sort((x, y) => y.deferred - x.deferred);
const bandSection = P.bandFill === 'both' || P.bandFill === 'sell' ? ['## Fill rule at the band (A22)', '',
  `\`bandFill=${P.bandFill}\`: a sale that falls due on a day a trade-for-trade share (BE / BZ) closed at its lower band — ${M.BAND}% or more under the previous close — is not made and is tried at every later close the share has${P.bandFill === 'both' ? '; a purchase of a share at its upper band is not made, and its slot stays empty for the day' : '; purchases are made at the close as before (the sales-only row)'}. Series on record for **${st.band.seriesDays} of ${st.days}** days of the test window; on the others the rule cannot act.`, '',
  `- sales not made on the day they fell due: **${st.band.unfilled.sells}**, held for ${st.band.unfilled.sellDays} locked closes in all; ${st.band.deferred} of them sold later, ${st.band.deferredBars} bars late in total` + (lateSales.length ? ` (longest: ${lateSales.slice(0, 5).map(t => `${t.sym} due ${t.dueDate}, sold ${t.exitDate}, ${t.deferred} bars, ${t.ret >= 0 ? '+' : ''}${t.ret}%`).join('; ')})` : ''),
  `- purchases not made: **${st.band.unfilled.buys}**`, '',
  'Hypothesis, written before any run on real series: `reports/momentum-fill-hypothesis-2026-11-25.md`.', ''] : [];
const bySym = {}; for (const t of sim.trades) { const s = bySym[t.sym] || (bySym[t.sym] = { n: 0, pnl: 0 }); s.n++; s.pnl += t.pnl; }
const topSyms = Object.entries(bySym).sort((a, b) => b[1].pnl - a[1].pnl); const fmtS = ([s, v]) => `${s} (${v.n}×, ₹${Math.round(v.pnl).toLocaleString('en-IN')})`;
const md = [`# Momentum backtest — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days, ${Object.keys(bars.sym).length} symbols). Test window ${st.start} → ${st.end}. Parameters: ${JSON.stringify(P)}. Capital ₹${capital.toLocaleString('en-IN')}, equal weight ₹${Math.round(capital / P.topN).toLocaleString('en-IN')} per name at the start${P.compound ? ', then current equity ÷ ' + P.topN + ' at each rebalance' : ' for the whole run'}.`, '',
  warn, '', '## Overall', '', hdr, row(label(P.compound), st), row(label(!P.compound) + ' — same rules', alt.st), ...bm.map(bmRow), '',
  'The two rows trade the same signals; only the size of new buys differs. Fixed slots keep every buy at starting capital ÷ topN, so profits pile up as idle cash and, over a long window, CAGR and drawdown are both understated relative to the capital at work ("equity at work" is the average share of equity in open positions). Reinvested sizes each rebalance\'s buys at current equity ÷ topN — the way the list would actually be run — so it is the row to compare with the Nifty, which compounds too. Trade counts can differ slightly: a bigger or smaller slot changes the cash left for the last buy.', '',
  '## By year', '', `| year | ${P.compound ? 'reinvested' : 'fixed slots'} | ${P.compound ? 'fixed slots' : 'reinvested'} | Nifty 50 |${bm.map(b => ` ${BM.shortName(b.S.name)} TR |`).join('')}`, '|---|---|---|---|' + bm.map(() => '---|').join(''), ...yr, '',
  bm.length ? '"TR" columns are NSE\'s total-return indices (dividends reinvested); the Nifty 50 column is the price index from the bars. Years are calendar years inside the test window; the first is partial.' : null, bm.length ? '' : null,
  ...against,
  ...(MEM ? ['## Universe: point-in-time NIFTY 500 membership', '', `Ranked only the names in the index on each day (\`data/membership/members.json\`: ${memStats.events} events, ${MEM.from} → ${MEM.asOf}, built by \`scripts/membership.mjs\` from NSE's press releases). ${memStats.everMembers} names were members at some point in that window; ${memStats.everWithBars} of them have bars in the history and ${memStats.everMembers - memStats.everWithBars} do not yet (they left the index before the history was loaded — the owner's price load for past members fills them in). ${memStats.barsNotMembers} symbols in the history were never members. On the first day of the history ${memStats.membersOnFirstDay} of the members had bars. A holding with no close for 20 bars in a row is closed at its last close as "stopped trading" (on today's constituents that is a hole in the history files; after the past-members load it is a delisting). ${memStats.everWithBars >= 0.98 * memStats.everMembers ? 'With the past members loaded this is the full correction: no name is ranked before it entered the index, and the names that fell out are in the record.' : 'Until the past members have bars this option removes the future members only — names that entered the index later and were being ranked on their pre-entry run-up — so the result is the half of the survivorship correction that makes the record worse; the other half (the names that fell out) usually makes it worse again.'}`, ''] : []),
  ...(P.refill === 'close' || P.volScale ? ['## Refinements (tested 13 Nov 2026, on by default since)', '', `${P.refill === 'close' ? `**Refill at the close** (\`refill=close\`): on any day the gate is open and the book holds fewer than ${P.topN} names, the free slots are filled from that close's ranking instead of waiting for the next rebalance. ${st.refills} of the ${st.n} trades (${pc(st.n ? st.refills / st.n : 0, 0)}) were such refills (companion row: ${alt.st.refills}).` : ''}${P.refill === 'close' && P.volScale ? ' ' : ''}${P.volScale ? `**Volatility-scaled sizing** (\`volScale=true\`): new buys are ${P.volFactor * 100}% of the slot while the index's ${P.volWindow}-bar realised volatility is above its trailing ${P.volMedian}-bar median. The flag was on for ${pc(st.volHighDays, 0)} of the test days; ${st.halfSized} of ${st.n} trades (${pc(st.n ? st.halfSized / st.n : 0, 0)}) were bought at half size (companion row: ${alt.st.halfSized}).` : ''} Hypotheses, pass mark and decision rule: \`reports/momentum-hypotheses-2026-11-13.md\`; results \`reports/momentum-refinements-2026-11-13-adjusted-members.md\`. Open positions are never resized in either option; ranks, gate, trailing stop and rank-drop exits are unchanged. The 12 Nov rules: \`--set refill=rebalance --set volScale=false\`.`, ''] : []),
  ...bandSection,
  '## Exit reasons', '', ...Object.entries(st.byReason).map(([k, v]) => `- ${k}: ${v}`), '',
  '## Best and worst names', '', `Best: ${topSyms.slice(0, 5).map(fmtS).join(', ')}`, '', `Worst: ${topSyms.slice(-5).reverse().map(fmtS).join(', ')}`, '',
  '## How to read this', '', 'A momentum portfolio is judged against the index over the same window, on drawdown as much as on return, because the whole point is to be out (gate closed, stops hit) when the market falls. CAGR and Sharpe over fewer than ~3 years are indicative only. Win rate matters less than for the swing engine: momentum makes its money from a few large winners and many small, quick losses — expect 40–50% winners. "Time in market" below 100% is the gate and the stops doing their job; if it is very low the gate is too tight.',
  '', 'Known simplifications: fills at the rebalance close (plus half the round-trip cost); no dividends; survivorship bias if the universe is today\'s Nifty 500; corporate actions are adjusted only when data/adjustments.json is present (otherwise a bonus or split looks like a crash and trips the trailing stop); under compounding, positions already open keep the size they were bought at — only new buys take the new slot.'].filter(l => l != null).join('\n');
await fs.writeFile(path.join(OUT, `momentum-${stamp}.md`), md);
await fs.writeFile(path.join(OUT, `momentum-${stamp}.json`), JSON.stringify({ params: P, stats: st, equity: sim.equity, trades: sim.trades, companion: { params: alt.sim.params, stats: alt.st, equity: alt.sim.equity },
  membership: memStats || undefined, benchmarks: bm.length ? bm.map(b => ({ name: b.S.name, files: b.S.files, series: { first: b.S.dates[0], last: b.S.dates[b.S.dates.length - 1], days: b.S.dates.length, netTR: !!b.S.ntr }, window: b.w, byYear: b.yr })) : undefined }, null, 1));
console.log(md.split('\n').slice(0, 16).join('\n')); console.log(`\nfull report: reports/momentum-${stamp}.md (and .json with equity curve and every trade)`);
