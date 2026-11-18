#!/usr/bin/env node
/* One switch of the momentum engine against the paper book's rules, read the way the 13 Nov refinements were: the full window,
 * six cold starts, by year, each beside NSE's total-return momentum index, and the written pass mark checked line by line.
 * Built for the risk-adjusted ranking test of 18 Nov 2026 (reports/momentum-volatility-hypotheses-2026-11-18.md).
 *
 *   node scripts/momentum-rank-compare.mjs                          # --set volAdjust=true, the row the hypothesis fixed
 *   node scripts/momentum-rank-compare.mjs --set volAdjust=true --name voladjust
 *
 * Always: full point-in-time membership, corporate-action-adjusted bars, reinvested, 30 bps round trip — the same inputs as
 * `backtest-momentum.mjs --members --benchmarks --set compound=true`. Writes reports/momentum-<name>-<date>-adjusted-members.md and .json.
 */
import fs from 'node:fs/promises'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import * as BM from './benchmarks.mjs'; import { membershipFilter } from './membership.mjs';
const require = createRequire(import.meta.url); const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js')), M = require(path.join(ROOT, 'momentum.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const sets = {}; argv.forEach((a, i) => { if (a === '--set') { const [k, v] = String(argv[i + 1]).split('='); sets[k] = v === 'true' ? true : v === 'false' ? false : isNaN(Number(v)) ? v : Number(v); } });
if (!Object.keys(sets).length) sets.volAdjust = true; const NAME = arg('name', Object.keys(sets).join('-').toLowerCase());
const STARTS = ['2018-01-01', '2019-01-01', '2020-01-01', '2021-01-01', '2022-01-01', '2023-01-01'];
const MARK = { fund: 'NIFTY500 MOMENTUM 50', over: 0.02, starts: 4, yearShare: 0.40 };   // the pass mark of the hypothesis file

const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8')); const capital = config.risk.capital;
const HIST = path.join(ROOT, 'data', 'history'); const files = [];
for (const f of (await fs.readdir(HIST)).filter(f => /^\d{4}\.json$/.test(f)).sort()) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
const custom = (JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'sectors.json'), 'utf8').catch(() => '{"map":{}}'))).map || {};
const adjustments = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'adjustments.json'), 'utf8').catch(() => 'null'));
const bars = E.buildBars(files, [], { adjustments }); const MEM = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'membership', 'members.json'), 'utf8'));
const benchmarks = await BM.loadBenchmarks(path.join(ROOT, 'data', 'benchmarks')); const fund = Object.values(benchmarks).find(S => E.sameIndex(S.name, MARK.fund));
if (!fund) { console.error(`benchmark ${MARK.fund} not found in data/benchmarks/`); process.exit(2); }
const base = Object.assign({}, config.momentum || {}, { compound: true }); const variant = Object.assign({}, base, sets);
const run = (params, from) => { const sim = M.simulate(bars, params, custom, { from, capital, filter: membershipFilter(MEM), stale: 20 }); return { sim, st: M.stats(sim) }; };
const pc = (x, d = 1) => x == null ? '—' : (x * 100).toFixed(d) + '%'; const f2 = x => x == null ? '—' : x.toFixed(2); const pp = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1);
const closed = sim => sim.trades.filter(t => t.reason !== 'end of data'); const share = (sim, re) => { const c = closed(sim); return c.length ? c.filter(t => re.test(t.reason)).length / c.length : null; };
const tradeLine = r => { const c = closed(r.sim); const w = c.filter(t => t.ret > 0), l = c.filter(t => t.ret <= 0); const m = a => a.length ? a.reduce((x, t) => x + t.ret, 0) / a.length : 0;
  const byRet = [...c].sort((a, b) => b.ret - a.ret); const top = byRet.slice(0, Math.round(c.length / 10)); const sum = c.reduce((x, t) => x + t.ret, 0);
  return { n: c.length, win: w.length / c.length, avg: m(c), avgWin: m(w), avgLoss: m(l), stopped: share(r.sim, /stop/), bars: c.reduce((x, t) => x + t.bars, 0) / c.length, topMean: m(top), topShare: top.reduce((x, t) => x + t.ret, 0) / sum }; };

const A = run(base), B = run(variant); const P = Object.assign({}, M.DEFAULTS, variant); const win = { start: A.st.start, end: A.st.end };
const F = BM.windowStats(fund, win.start, win.end); const others = Object.values(benchmarks).filter(S => S !== fund).sort((a, b) => a.name.localeCompare(b.name)).map(S => ({ S, w: BM.windowStats(S, win.start, win.end) }));
const row = (name, st) => `| ${name} | ${st.n} | ${pc(st.totalReturn)} | ${pc(st.cagr)} | ${pc(st.maxDrawdown)} | ${f2(st.sharpe)} | ${pc(st.winRate, 0)} | ${Math.round(st.avgBars)} | ${pc(st.atWork, 0)} |`;
const brow = (name, w) => `| ${name} | — | ${pc(w.totalReturn)} | ${pc(w.cagr)} | ${pc(w.maxDrawdown)} | ${f2(w.sharpe)} | — | — | — |`;
const label = Object.entries(sets).map(([k, v]) => `${k}=${v}`).join(' ');
const L = [`# Momentum: \`${label}\` against the paper book's rules — ${new Date().toISOString().slice(0, 10)}`, '',
  `Hypothesis, rows and pass mark written first: \`reports/momentum-volatility-hypotheses-2026-11-18.md\`. History ${bars.dates[0]} → ${bars.dates[bars.dates.length - 1]} (${bars.dates.length} days), corporate-action-adjusted, point-in-time NIFTY 500 membership (${MEM.events.length} events), reinvested, ${P.costBps} bps round trip. Test window ${win.start} → ${win.end}. Baseline parameters: ${JSON.stringify(Object.assign({}, M.DEFAULTS, base))}.`, '',
  '## Full window', '', '| run | trades | total return | CAGR | max DD | Sharpe | win rate | avg bars | equity at work |', '|---|---|---|---|---|---|---|---|---|',
  row('row 1 — the paper book\'s rules', A.st), row(`row 2 — \`${label}\``, B.st), brow(`${fund.name} TR`, F), ...others.map(o => brow(`${o.S.name} TR`, o.w)), ''];
const ta = tradeLine(A), tb = tradeLine(B);
L.push('## The trades', '', '| run | closed trades | winners | average | average win | average loss | stopped out | avg bars | best tenth: average | best tenth: share of summed returns |', '|---|---|---|---|---|---|---|---|---|---|',
  ...[['row 1', ta], ['row 2', tb]].map(([n, t]) => `| ${n} | ${t.n} | ${pc(t.win, 0)} | ${pp(t.avg / 100)}% | ${pp(t.avgWin / 100)}% | ${pp(t.avgLoss / 100)}% | ${pc(t.stopped, 0)} | ${Math.round(t.bars)} | ${pp(t.topMean / 100)}% | ${pc(t.topShare, 0)} |`), '');
const symsA = new Set(closed(A.sim).map(t => t.sym + '|' + t.entryDate)), symsB = new Set(closed(B.sim).map(t => t.sym + '|' + t.entryDate)); const both = [...symsB].filter(k => symsA.has(k)).length;
L.push(`${both} of row 2's ${symsB.size} closed trades are the same name bought on the same day as in row 1 (${pc(both / symsB.size, 0)}): the two rankings overlap that much.`, '');
const fy = BM.byYear(fund, win.start, win.end); const years = Object.keys(A.st.byYear); const yret = (st, y) => st.byYear[y] ? st.byYear[y].end / st.byYear[y].start - 1 : null;
L.push('## By year', '', `| year | row 1 | row 2 | row 2 − row 1 | ${BM.shortName(fund.name)} TR | Nifty 50 |`, '|---|---|---|---|---|---|',
  ...years.map(y => { const a = yret(A.st, y), b = yret(B.st, y), by = A.st.byYear[y]; return `| ${y} | ${pc(a)} | ${pc(b)} | ${pp(b - a)} | ${fy[y] ? pc(fy[y].ret) : '—'} | ${by.idx0 && by.idx1 ? pc(by.idx1 / by.idx0 - 1) : '—'} |`; }), '');
const logs = years.map(y => [y, Math.log(1 + yret(B.st, y))]); const logSum = logs.reduce((a, [, v]) => a + v, 0); const worst = [...logs].sort((a, b) => b[1] - a[1])[0];
const cold = STARTS.map(s => { const a = run(base, s), b = run(variant, s); const w = BM.windowStats(fund, b.st.start, b.st.end); return { s, a: a.st, b: b.st, w }; });
L.push('## Six cold starts', '', 'Each run starts with fresh capital on the first trading day on or after the date and runs to the end of the history; the fund is measured over the same days.', '',
  `| start | row 1 CAGR | row 2 CAGR | ${BM.shortName(fund.name)} TR | row 2 − fund | row 1 Sharpe | row 2 Sharpe | row 1 max DD | row 2 max DD | row 2 ahead of the fund? |`, '|---|---|---|---|---|---|---|---|---|---|',
  ...cold.map(c => `| ${c.s} | ${pc(c.a.cagr)} | ${pc(c.b.cagr)} | ${pc(c.w.cagr)} | ${pp(c.b.cagr - c.w.cagr)} | ${f2(c.a.sharpe)} | ${f2(c.b.sharpe)} | ${pc(c.a.maxDrawdown)} | ${pc(c.b.maxDrawdown)} | ${c.b.cagr > c.w.cagr ? 'yes' : 'no'} |`), '');
const ahead = cold.filter(c => c.b.cagr > c.w.cagr).length; const need = F.cagr + MARK.over;
const checks = [
  [`CAGR at least ${pc(need)} (the fund's ${pc(F.cagr)} over this window + 2 points)`, B.st.cagr >= need, pc(B.st.cagr)],
  [`Sharpe above row 1's ${f2(A.st.sharpe)}`, B.st.sharpe > A.st.sharpe, f2(B.st.sharpe)],
  [`ahead of ${fund.name} TR in at least ${MARK.starts} of ${STARTS.length} cold starts`, ahead >= MARK.starts, `${ahead} of ${STARTS.length}`],
  [`no calendar year above ${pc(MARK.yearShare, 0)} of the log return`, logSum > 0 && worst[1] / logSum <= MARK.yearShare, logSum > 0 ? `${worst[0]}: ${pc(worst[1] / logSum, 0)}` : 'log return not positive'],
]; const pass = checks.every(c => c[1]);
L.push('## Against the written pass mark', '', '| condition | row 2 | met? |', '|---|---|---|', ...checks.map(c => `| ${c[0]} | ${c[2]} | ${c[1] ? 'yes' : '**no**'} |`), '', `**Verdict by the rule written first: ${pass ? 'PASS' : 'FAIL'}** (${checks.filter(c => c[1]).length} of ${checks.length} conditions).`, '');
const stamp = new Date().toISOString().slice(0, 10); const out = path.join(ROOT, 'reports', `momentum-${NAME}-${stamp}-adjusted-members`);
await fs.writeFile(out + '.md', L.join('\n') + '\n');
await fs.writeFile(out + '.json', JSON.stringify({ sets, window: win, baseline: { params: Object.assign({}, M.DEFAULTS, base), stats: A.st, trades: A.sim.trades }, variant: { params: P, stats: B.st, trades: B.sim.trades, equity: B.sim.equity }, fund: { name: fund.name, stats: F, byYear: fy }, cold: cold.map(c => ({ start: c.s, baseline: c.a, variant: c.b, fund: c.w })), checks: checks.map(c => ({ condition: c[0], value: c[2], met: c[1] })), pass }));
console.log(L.join('\n')); console.log(`\nwrote ${path.relative(ROOT, out)}.md and .json`);
