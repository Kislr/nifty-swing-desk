#!/usr/bin/env node
/* A descriptive split, not a backtest (18 Nov 2026, owner's question: "can we be inside the 47% that win by dropping the more
 * volatile stocks?"). Takes the trade list of a momentum report that already exists, measures each stock's volatility over the
 * 63 bars before its entry (annualised, adjusted closes), and reads the trades in thirds: win rate, average and median return,
 * share of the profit, share stopped out, and where the biggest winners sat.
 *
 *   node scripts/momentum-vol-split.mjs                      # the paper book's rules (refill + volScale), full membership
 *   node scripts/momentum-vol-split.mjs --report reports/momentum-2026-11-12-adjusted-members.json
 *
 * What it cannot say: what a low-volatility rule would have earned. Dropping a name changes which name fills the slot, so that
 * needs its own hypothesis, written first, and a run of the engine — and it would be a second look at these same ten years.
 */
import fs from 'node:fs/promises'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const E = require(path.join(ROOT, 'engine.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const REPORT = path.resolve(ROOT, arg('report', 'reports/momentum-2026-11-13-adjusted-members-refill-volscale.json')); const LOOK = Number(arg('lookback', 63));
const HIST = path.join(ROOT, 'data', 'history'); const files = [];
for (const f of (await fs.readdir(HIST)).filter(f => /^\d{4}\.json$/.test(f)).sort()) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
const adjustments = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'adjustments.json'), 'utf8').catch(() => 'null'));
const bars = E.buildBars(files, [], { adjustments }); const at = Object.fromEntries(bars.dates.map((d, i) => [d, i]));
const rep = JSON.parse(await fs.readFile(REPORT, 'utf8')); const closed = rep.trades.filter(t => t.reason !== 'end of data');
const rows = [];
for (const t of closed) { const B = bars.sym[t.sym], i = at[t.entryDate]; if (!B || i == null) continue; const r = [];
  for (let k = i - LOOK + 1; k <= i; k++) if (k > 0 && B.c[k] != null && B.c[k - 1] != null) r.push(Math.log(B.c[k] / B.c[k - 1]));
  if (r.length < LOOK * 0.6) continue; const m = r.reduce((a, b) => a + b, 0) / r.length;
  rows.push({ ...t, vol: Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1)) * Math.sqrt(250) * 100 }); }
const n = rows.length; const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const byVol = [...rows].sort((a, b) => a.vol - b.vol); const third = k => byVol.slice(Math.floor(k * n / 3), Math.floor((k + 1) * n / 3)); const pnl = rows.reduce((a, t) => a + t.pnl, 0);
const pc = (x, d = 0) => (x * 100).toFixed(d) + '%'; const sg = (x, d = 1) => (x >= 0 ? '+' : '') + x.toFixed(d) + '%';
const L = [`# Momentum trades split by the stock's volatility before entry — ${new Date().toISOString().slice(0, 10)}`, '',
  `A description of trades that already exist, not a test of a rule. Source: \`${path.relative(ROOT, REPORT)}\` (${closed.length} closed trades, ${rows.length} with ${LOOK} bars of history before entry). Volatility = standard deviation of daily log returns over the ${LOOK} bars to the entry day, annualised, on corporate-action-adjusted closes.`, '',
  `All trades: ${pc(rows.filter(t => t.ret > 0).length / n)} winners, average ${sg(mean(rows.map(t => t.ret)), 2)}, median ${sg(median(rows.map(t => t.ret)))}.`, '',
  '| third | trades | volatility | winners | average | median | average win | average loss | share of profit | stopped out |', '|---|---|---|---|---|---|---|---|---|---|'];
['calmest', 'middle', 'most volatile'].forEach((name, k) => { const g = third(k), w = g.filter(t => t.ret > 0), l = g.filter(t => t.ret <= 0);
  L.push(`| ${name} | ${g.length} | ${g[0].vol.toFixed(0)}–${g[g.length - 1].vol.toFixed(0)}% | ${pc(w.length / g.length)} | ${sg(mean(g.map(t => t.ret)), 2)} | ${sg(median(g.map(t => t.ret)))} | ${sg(mean(w.map(t => t.ret)))} | ${sg(mean(l.map(t => t.ret)))} | ${pc(g.reduce((a, t) => a + t.pnl, 0) / pnl)} | ${pc(g.filter(t => /stop/.test(t.reason)).length / g.length)} |`); });
const byRet = [...rows].sort((a, b) => b.ret - a.ret); const top = byRet.slice(0, Math.round(n / 10)); const rank = new Map(byVol.map((t, i) => [t, i / n])); const sumRet = rows.reduce((a, t) => a + t.ret, 0);
const where = [0, 1, 2].map(k => top.filter(t => { const v = rank.get(t); return v >= k / 3 && v < (k + 1) / 3; }).length);
L.push('', `**Where the money is.** The best tenth of the trades (${top.length}, average ${sg(mean(top.map(t => t.ret)), 0)}) add up to ${pc(top.reduce((a, t) => a + t.ret, 0) / sumRet)} of the summed returns; the other nine-tenths average ${sg(mean(byRet.slice(top.length).map(t => t.ret)), 2)}. Of those ${top.length}, ${where[0]} were in the calmest third, ${where[1]} in the middle and ${where[2]} in the most volatile.`);
const yrs = {}; for (const t of rows) { const y = t.entryDate.slice(0, 4); (yrs[y] = yrs[y] || { lo: [], hi: [] })[rank.get(t) < 0.5 ? 'lo' : 'hi'].push(t.ret); }
L.push('', '| entry year | calmer half: trades | average | more volatile half: trades | average |', '|---|---|---|---|---|', ...Object.keys(yrs).sort().map(y => `| ${y} | ${yrs[y].lo.length} | ${sg(mean(yrs[y].lo))} | ${yrs[y].hi.length} | ${sg(mean(yrs[y].hi))} |`));
L.push('', '**Reading.** The calmest names win more often and earn less: a higher win rate and a lower average, because the engine\'s profit is a few very large winners and most of those sit in the more volatile two-thirds. Calmer names lose less in the falling years and give up most of the rising ones — a defensive tilt, the same shape the compounder\'s profitability screen showed (reports/compounder-shelved-2026-11-05.md).', '',
  '**What this is not.** It is not what a low-volatility rule would have earned: removing a name changes which name takes its slot, the split is made after the fact on one ten-year path, and a rule built from it would be a second look at the data that suggested it. A real test needs the hypothesis written first (for example: rank the top 30 by return ÷ volatility instead of return; pass = CAGR and Sharpe both above the 13 Nov row and above NIFTY500 Momentum 50 from at least four of six start years), then a run of the engine.');
const out = path.join(ROOT, 'reports', `momentum-vol-split-${new Date().toISOString().slice(0, 10)}${/refill-volscale/.test(REPORT) ? '' : '-' + path.basename(REPORT, '.json').replace(/^momentum-/, '')}.md`);
await fs.writeFile(out, L.join('\n') + '\n'); console.log(L.join('\n')); console.log('\nwrote ' + path.relative(ROOT, out));
