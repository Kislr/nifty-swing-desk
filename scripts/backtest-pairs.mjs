#!/usr/bin/env node
/* Walk-forward backtest of the relationship-stocks engine (pairs.js) over data/history/*.json.
 *
 *   node scripts/backtest-pairs.mjs                          # defaults, both modes
 *   node scripts/backtest-pairs.mjs --set entryZ=1.5 --set window=180
 *   node scripts/backtest-pairs.mjs --sweep                  # grid of window / zWindow / entryZ / stop, both modes
 *
 * Modes: 'pair' = long the cheap leg, short the rich leg, equal rupees (market-neutral; needs a margin/F&O account);
 *        'long' = buy the cheap leg only (what most retail accounts can do; it is also a bet on the market).
 * Returns are % of one leg's notional per trade, after `costBps` round trip per leg. The relationship (hedge ratio,
 * spread mean and sd) is frozen at entry and the trade is judged against it. Writes reports/pairs-<stamp>.md/.json. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js')); const Pr = require(path.join(ROOT, 'pairs.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; }; const flag = k => argv.includes('--' + k);
const sets = {}; argv.forEach((a, i) => { if (a === '--set') { const [k, v] = argv[i + 1].split('='); sets[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; } });
const from = arg('from'), to = arg('to');
const HIST = arg('hist', path.join(ROOT, 'data', 'history'));
const files = []; for (const f of (await fs.readdir(HIST).catch(() => []))) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
if (!files.length) { console.error('No history files in data/history/. Run the backfill first.'); process.exit(2); }
const bars = E.buildBars(files, []); const N = bars.dates.length;
console.log(`history: ${N} days, ${bars.dates[0]} → ${bars.dates[N - 1]}, ${Pr.PAIRS.length} curated pairs`);

const f = (x, d = 2) => (x == null || !isFinite(x)) ? '—' : Number(x).toFixed(d);
const hdr = '| run | mode | trades | win rate | avg / trade | total | avg bars | max DD (sum of %) | converged / time / stop |\n|---|---|---|---|---|---|---|---|---|';
const row = (name, mode, st) => st.n ? `| ${name} | ${mode} | ${st.n} | ${f(st.winRate * 100, 0)}% | ${f(st.avgRet)}% | ${f(st.totalRet, 1)}% | ${f(st.avgBars, 0)} | ${f(st.maxDD, 1)} | ${st.byReason.converged || 0} / ${st.byReason['time stop'] || 0} / ${st.byReason['stop (relationship broke)'] || 0} |` : `| ${name} | ${mode} | 0 | | | | | | |`;
const run = (params, mode) => { const sim = Pr.simulate(bars, params, { mode, from, to }); return { sim, st: Pr.stats(sim.trades) }; };
const stamp = new Date().toISOString().slice(0, 10); const OUT = arg('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });

if (flag('sweep')) {
  const lines = [`# Pairs sweep — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days). Every row is a full walk-forward run over all curated pairs.`, '', hdr]; const results = [];
  for (const window of [120, 180, 250]) for (const zWindow of [30, 60, 90]) for (const entryZ of [1.5, 2, 2.5]) for (const stopZ of [3, 4, 99]) for (const mode of ['pair', 'long']) {
    const g = { window, zWindow, entryZ, stopZ }; const { st } = run(Object.assign({}, sets, g), mode); results.push({ params: g, mode, stats: st }); lines.push(row(`w ${window} · z ${zWindow} · entry ${entryZ}σ · stop ${stopZ === 99 ? 'none' : stopZ + 'σ'}`, mode, st)); process.stdout.write(`\r${results.length}/162   `); }
  process.stdout.write('\n');
  const pos = results.filter(r => r.stats.n >= 20 && r.stats.avgRet > 0); const byMode = m => results.filter(r => r.mode === m && r.stats.n);
  const avg = rs => rs.length ? rs.reduce((a, r) => a + r.stats.avgRet, 0) / rs.length : null;
  lines.push('', '## Summary', '', `Cells with ≥ 20 trades and a positive average: **${pos.length} of ${results.filter(r => r.stats.n >= 20).length}**. Mean average-per-trade across all cells: pair ${f(avg(byMode('pair')))}%, long-only ${f(avg(byMode('long')))}%.`, '',
    'If the positive cells are scattered rather than clustered, they are noise. A real edge shows up as a plateau: neighbouring windows, thresholds and stops that all look similar.');
  await fs.writeFile(path.join(OUT, `pairs-sweep-${stamp}.md`), lines.join('\n')); await fs.writeFile(path.join(OUT, `pairs-sweep-${stamp}.json`), JSON.stringify(results, null, 1));
  console.log(lines.slice(-4).join('\n')); console.log(`\nfull table: reports/pairs-sweep-${stamp}.md`); process.exit(0);
}

const pair = run(sets, 'pair'), long = run(sets, 'long'); const P = pair.sim.params;
const board = Pr.boardAt(bars, N - 1, sets); const stable = board.pairs.filter(p => p.tradable);
const byPair = Object.entries(pair.st.byPair || {}).sort((a, b) => b[1].sum - a[1].sum).map(([k, v]) => `| ${k} | ${v.n} | ${f(v.wins / v.n * 100, 0)}% | ${f(v.sum / v.n)}% | ${f(v.sum, 1)}% |`);
const md = [`# Pairs backtest — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days). ${Pr.PAIRS.length} curated pairs; on the last bar ${stable.length} pass the cointegration test at the ${P.pLevel}% level with a usable half-life. Parameters: ${JSON.stringify(P)}.`, '',
  '## Overall', '', hdr, row('defaults', 'pair (long cheap / short rich)', pair.st), row('defaults', 'long-only (buy the cheap leg)', long.st), '',
  '## By pair (pair mode)', '', '| pair | trades | win rate | avg / trade | total |', '|---|---|---|---|---|', ...byPair, '',
  '## Relationships on the last bar', '', '| pair | business | EG t-stat | level | half-life (bars) | z today | status |', '|---|---|---|---|---|---|---|',
  ...board.pairs.map(p => `| ${p.A} / ${p.B} | ${p.label} | ${f(p.tstat)} | ${p.level ? p.level + '%' : '—'} | ${p.halfLife != null ? f(p.halfLife, 0) : '—'} | ${f(p.z)} | ${p.status} |`), '',
  '## How to read this', '', 'A pair trade earns the closing of the gap and nothing else, so the number that matters is the average per trade after costs; with ~30 bps per leg the gap has to be worth more than ~0.6% just to break even in pair mode. "Stop (relationship broke)" exits are the tell: when they dominate, stretches are continuing rather than closing, and the cointegration test is finding in-sample artifacts. Long-only results include whatever the market did during the hold and are not comparable with pair mode.',
  '', 'Known simplifications: fills at the signal close; no borrow cost or margin on the short leg; the curated list is today\'s — pairs that stopped being pairs (mergers, delistings) are missing; corporate actions are not adjusted, so a bonus issue in one leg looks like a broken relationship.'].join('\n');
await fs.writeFile(path.join(OUT, `pairs-${stamp}.md`), md); await fs.writeFile(path.join(OUT, `pairs-${stamp}.json`), JSON.stringify({ params: P, pair: pair.st, long: long.st, trades: { pair: pair.sim.trades, long: long.sim.trades }, board: board.pairs }, null, 1));
console.log(md.split('\n').slice(0, 10).join('\n')); console.log(`\nfull report: reports/pairs-${stamp}.md`);
