#!/usr/bin/env node
/* Walk-forward backtest of the momentum engine (momentum.js) over data/history/*.json.
 *
 *   node scripts/backtest-momentum.mjs                       # defaults from momentum.js
 *   node scripts/backtest-momentum.mjs --set lookback=252 --set topN=10 --set trail=20
 *   node scripts/backtest-momentum.mjs --from 2025-06-01 --to 2026-06-30
 *   node scripts/backtest-momentum.mjs --sweep               # a fixed grid of lookback / topN / trail / gate, one table
 *
 * Model: ranks on each rebalance day's close and buys at that close plus half the round-trip cost (a conservative
 * stand-in for the next open); trailing stops are checked on closes. Equal weight = capital / topN, fixed for the run
 * (profits sit as cash). Every single run also reports the same rules with `compound` flipped — slot = current equity /
 * topN at each rebalance — in the next row, so the fixed-slot and reinvested records are always read together
 * (`--set compound=true` makes the reinvested run the primary one). The warm-up is lookback + skip bars, so a 12-month lookback on
 * two years of history leaves under a year of test — read the report's warning line.
 * Writes reports/momentum-<stamp>.md and .json. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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

const pc = (x, d = 1) => x == null ? '—' : (x * 100).toFixed(d) + '%';
const f = (x, d = 2) => (x == null || !isFinite(x)) ? '—' : Number(x).toFixed(d);
const run = params => { const sim = M.simulate(bars, params, custom, { from, to, capital }); return { sim, st: M.stats(sim) }; };
const row = (name, st) => `| ${name} | ${st.n} | ${pc(st.totalReturn)} | ${pc(st.cagr)} | ${pc(st.indexReturn)} | ${pc(st.maxDrawdown)} | ${f(st.sharpe)} | ${st.winRate == null ? '—' : pc(st.winRate, 0)} | ${f(st.avgBars, 0)} | ${pc(st.inMarket, 0)} | ${pc(st.atWork, 0)} |`;
const hdr = '| run | trades | total return | CAGR | Nifty (same period) | max DD | Sharpe | win rate | avg bars | time in market | equity at work |\n|---|---|---|---|---|---|---|---|---|---|---|';
const stamp = new Date().toISOString().slice(0, 10) + (bars.adjusted && bars.adjusted.events ? '-adjusted' : '');   // adjusted-history runs get their own file name
const OUT = arg('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });

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

const { sim, st } = run(sets); const P = sim.params;
const alt = run(Object.assign({}, sets, { compound: !P.compound })); const label = c => c ? 'momentum, reinvested (compound)' : 'momentum, fixed slots';
const warn = st.days < 250 ? `**Warning: only ${st.days} trading days in the test window** (warm-up ate ${sim.warmup} of ${N}). That is ${Math.round(st.days / P.rebalance)} rebalances — enough to see the machinery work, not enough to trust the numbers. Extend the history: \`node scripts/backfill.mjs --years 5\`.` : st.days < 750 ? `**Caution: ${st.days} trading days (~${(st.days / 250).toFixed(1)} years) in the test window.** Momentum's edge shows up over full cycles; one bull or one bear year proves little.` : '';
const yr = Object.entries(st.byYear).map(([y, b]) => { const a = alt.st.byYear[y]; return `| ${y} | ${pc(b.end / b.start - 1)} | ${a ? pc(a.end / a.start - 1) : '—'} | ${b.idx0 && b.idx1 ? pc(b.idx1 / b.idx0 - 1) : '—'} |`; });
const bySym = {}; for (const t of sim.trades) { const s = bySym[t.sym] || (bySym[t.sym] = { n: 0, pnl: 0 }); s.n++; s.pnl += t.pnl; }
const topSyms = Object.entries(bySym).sort((a, b) => b[1].pnl - a[1].pnl); const fmtS = ([s, v]) => `${s} (${v.n}×, ₹${Math.round(v.pnl).toLocaleString('en-IN')})`;
const md = [`# Momentum backtest — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days, ${Object.keys(bars.sym).length} symbols). Test window ${st.start} → ${st.end}. Parameters: ${JSON.stringify(P)}. Capital ₹${capital.toLocaleString('en-IN')}, equal weight ₹${Math.round(capital / P.topN).toLocaleString('en-IN')} per name at the start${P.compound ? ', then current equity ÷ ' + P.topN + ' at each rebalance' : ' for the whole run'}.`, '',
  warn, '', '## Overall', '', hdr, row(label(P.compound), st), row(label(!P.compound) + ' — same rules', alt.st), '',
  'The two rows trade the same signals; only the size of new buys differs. Fixed slots keep every buy at starting capital ÷ topN, so profits pile up as idle cash and, over a long window, CAGR and drawdown are both understated relative to the capital at work ("equity at work" is the average share of equity in open positions). Reinvested sizes each rebalance\'s buys at current equity ÷ topN — the way the list would actually be run — so it is the row to compare with the Nifty, which compounds too. Trade counts can differ slightly: a bigger or smaller slot changes the cash left for the last buy.', '',
  '## By year', '', `| year | ${P.compound ? 'reinvested' : 'fixed slots'} | ${P.compound ? 'fixed slots' : 'reinvested'} | Nifty 50 |`, '|---|---|---|---|', ...yr, '',
  '## Exit reasons', '', ...Object.entries(st.byReason).map(([k, v]) => `- ${k}: ${v}`), '',
  '## Best and worst names', '', `Best: ${topSyms.slice(0, 5).map(fmtS).join(', ')}`, '', `Worst: ${topSyms.slice(-5).reverse().map(fmtS).join(', ')}`, '',
  '## How to read this', '', 'A momentum portfolio is judged against the index over the same window, on drawdown as much as on return, because the whole point is to be out (gate closed, stops hit) when the market falls. CAGR and Sharpe over fewer than ~3 years are indicative only. Win rate matters less than for the swing engine: momentum makes its money from a few large winners and many small, quick losses — expect 40–50% winners. "Time in market" below 100% is the gate and the stops doing their job; if it is very low the gate is too tight.',
  '', 'Known simplifications: fills at the rebalance close (plus half the round-trip cost); no dividends; survivorship bias if the universe is today\'s Nifty 500; corporate actions are adjusted only when data/adjustments.json is present (otherwise a bonus or split looks like a crash and trips the trailing stop); under compounding, positions already open keep the size they were bought at — only new buys take the new slot.'].filter(l => l != null).join('\n');
await fs.writeFile(path.join(OUT, `momentum-${stamp}.md`), md);
await fs.writeFile(path.join(OUT, `momentum-${stamp}.json`), JSON.stringify({ params: P, stats: st, equity: sim.equity, trades: sim.trades, companion: { params: alt.sim.params, stats: alt.st, equity: alt.sim.equity } }, null, 1));
console.log(md.split('\n').slice(0, 16).join('\n')); console.log(`\nfull report: reports/momentum-${stamp}.md (and .json with equity curve and every trade)`);
