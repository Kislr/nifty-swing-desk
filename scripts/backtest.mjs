#!/usr/bin/env node
/* Walk-forward backtest of the rules in engine.js over data/history/*.json.
 *
 *   node scripts/backtest.mjs                         # all history
 *   node scripts/backtest.mjs --from 2025-01-01 --to 2025-12-31
 *   node scripts/backtest.mjs --set minRR=2 --set maxPositions=6 --set minScore=60
 *   node scripts/backtest.mjs --setups breakout       # only 52W breakouts (or: pullback)
 *
 * Model (deliberately simple and conservative):
 *   - Each day's ACT signals are candidates for the NEXT day. A buy-stop at `entry` fills if the next
 *     day's high reaches it (at the open if the open is already above entry; skipped if the open gaps
 *     more than 3% above entry).
 *   - Exits, checked in this order each day: open below stop → exit at open; low ≤ stop → exit at stop;
 *     high ≥ target → exit at target (at the open if it gaps above); after `maxHold` bars → exit at close.
 *   - Stop moves to breakeven once a close is ≥ entry + 1R (the rule on the site).
 *   - Max `maxPositions` open, never two in one sector, candidates taken in score order.
 *   - Costs: `costBps` round-trip (default 30 bps ≈ brokerage + STT + slippage for delivery trades).
 * Writes reports/backtest-<stamp>.md and .json. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const sets = {}; argv.forEach((a, i) => { if (a === '--set') { const [k, v] = argv[i + 1].split('='); sets[k] = isNaN(+v) ? v : +v; } });
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const P = Object.assign({ minRR: config.risk.minRR, capital: config.risk.capital, riskPct: config.risk.riskPct, maxPos: config.risk.maxPos, maxPositions: 4, maxHold: 15, minScore: 50, costBps: 30, warmup: 60 }, sets);
const setupsFilter = arg('setups', 'all');
const from = arg('from', '0000-00-00'), to = arg('to', '9999-99-99');

const HIST = arg('hist', path.join(ROOT, 'data', 'history'));
const files = []; for (const f of (await fs.readdir(HIST).catch(() => []))) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
if (!files.length) { console.error('No history files in data/history/. Run the backfill first: node scripts/backfill.mjs --years 2'); process.exit(2); }
const custom = (JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'sectors.json'), 'utf8').catch(() => '{"map":{}}'))).map || {};
const bars = E.buildBars(files, []); const N = bars.dates.length;
console.log(`history: ${N} days, ${Object.keys(bars.sym).length} symbols, ${bars.dates[0]} → ${bars.dates[N - 1]}${bars.index ? ', index bars present' : ', no index bars'}`);

const settings = { capital: P.capital, riskPct: P.riskPct, minRR: P.minRR, maxPos: P.maxPos };
const open = []; const trades = []; let pending = []; const equityR = []; let cumR = 0;
const sectorOf = s => E.sectorOf(s, custom);
for (let i = P.warmup; i < N - 1; i++) {
  const date = bars.dates[i]; if (date < from || date > to) continue;
  // 1. manage open positions on day i (bars of day i)
  for (const p of [...open]) { const B = bars.sym[p.sym]; const o = B.o[i], h = B.h[i], l = B.l[i], c = B.c[i]; if (c == null) continue;
    let exit = null, reason = null;
    if (o != null && o <= p.stop) { exit = o; reason = 'gap through stop'; }
    else if (l != null && l <= p.stop) { exit = p.stop; reason = p.stop >= p.entry ? 'breakeven stop' : 'stop'; }
    else if (o != null && o >= p.target) { exit = o; reason = 'gap above target'; }
    else if (h != null && h >= p.target) { exit = p.target; reason = 'target'; }
    else if (i - p.fillIdx >= P.maxHold) { exit = c; reason = 'time stop'; }
    if (exit != null) { const risk = p.entry - p.stop0; const cost = (p.entry + exit) * P.costBps / 2 / 10000; const R = (exit - p.entry - cost) / risk;
      trades.push({ sym: p.sym, sector: p.sector, setup: p.setup, score: p.score, entryDate: bars.dates[p.fillIdx], exitDate: date, entry: p.entry, stop: p.stop0, target: p.target, exit: +exit.toFixed(2), bars: i - p.fillIdx, R: +R.toFixed(3), pnl: +((exit - p.entry - cost) * p.qty).toFixed(0), reason });
      cumR += R; open.splice(open.indexOf(p), 1); continue; }
    if (c >= p.entry + (p.entry - p.stop0) && p.stop < p.entry) p.stop = p.entry; // breakeven at +1R
  }
  // 2. fill yesterday's pending orders on day i
  for (const q of pending) { if (open.length >= P.maxPositions) break; if (open.some(x => x.sym === q.sym || x.sector === q.sector)) continue;
    const B = bars.sym[q.sym]; const o = B.o[i], h = B.h[i]; if (o == null || h == null) continue;
    let fill = null; if (o >= q.entry) { if (o <= q.entry * 1.03) fill = o; } else if (h >= q.entry) fill = q.entry;
    if (fill == null) continue;
    const stop = q.stop, risk = fill - stop; if (!(risk > 0)) continue;
    const target = fill + P.minRR * risk; const sz = E.sizing(fill, stop, q.reg, settings); if (!sz || sz.qty < 1) continue;
    open.push({ sym: q.sym, sector: q.sector, setup: q.setup, score: q.score, entry: fill, stop, stop0: stop, target, qty: sz.qty, fillIdx: i }); }
  pending = [];
  // 3. generate tomorrow's orders from today's close
  const res = E.analyzeAt(bars, i, { settings, custom });
  for (const s of res.signals) { if (s.kind !== 'act' || s.score < P.minScore) continue; if (setupsFilter !== 'all' && !s.setup.toLowerCase().includes(setupsFilter)) continue;
    pending.push({ sym: s.sym, sector: s.sector, setup: s.setup, score: s.score, entry: s.entry, stop: s.stop, reg: res.reg }); }
  pending.sort((a, b) => b.score - a.score);
  equityR.push({ date, cumR: +cumR.toFixed(2), open: open.length });
  if ((i - P.warmup) % 50 === 0) process.stdout.write(`\r${date}  trades ${trades.length}  cumR ${cumR.toFixed(1)}   `);
}
process.stdout.write('\n');

/* ---------- report ---------- */
const stats = ts => { const n = ts.length; if (!n) return { n: 0 }; const Rs = ts.map(t => t.R); const wins = Rs.filter(r => r > 0); const losses = Rs.filter(r => r <= 0);
  const sum = Rs.reduce((a, b) => a + b, 0); const gp = wins.reduce((a, b) => a + b, 0), gl = -losses.reduce((a, b) => a + b, 0);
  let peak = 0, cum = 0, dd = 0; for (const r of Rs) { cum += r; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); }
  return { n, winRate: wins.length / n, avgWin: wins.length ? gp / wins.length : 0, avgLoss: losses.length ? gl / losses.length : 0, expectancy: sum / n, totalR: sum, profitFactor: gl ? gp / gl : Infinity, maxDrawdownR: dd, avgBars: ts.reduce((a, t) => a + t.bars, 0) / n, pnl: ts.reduce((a, t) => a + t.pnl, 0) }; };
const all = stats(trades); const by = key => { const g = {}; for (const t of trades) (g[t[key]] = g[t[key]] || []).push(t); return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, stats(v)])); };
const bySetup = by('setup'), byYear = (() => { const g = {}; for (const t of trades) (g[t.exitDate.slice(0, 4)] = g[t.exitDate.slice(0, 4)] || []).push(t); return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, stats(v)])); })();
const byReason = (() => { const g = {}; for (const t of trades) g[t.reason] = (g[t.reason] || 0) + 1; return g; })();
const byScore = (() => { const g = { '50-59': [], '60-69': [], '70+': [] }; for (const t of trades) (t.score >= 70 ? g['70+'] : t.score >= 60 ? g['60-69'] : g['50-59']).push(t); return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, stats(v)])); })();
const f = (x, d = 2) => (x == null || !isFinite(x)) ? '—' : Number(x).toFixed(d);
const row = (name, s) => s.n ? `| ${name} | ${s.n} | ${f(s.winRate * 100, 0)}% | ${f(s.expectancy)}R | ${f(s.profitFactor)} | ${f(s.totalR, 1)}R | ${f(s.maxDrawdownR, 1)}R | ${f(s.avgBars, 1)} | ₹${Math.round(s.pnl).toLocaleString('en-IN')} |` : `| ${name} | 0 | | | | | | | |`;
const hdr = '| slice | trades | win rate | expectancy | profit factor | total | max DD | avg bars | P&L (fixed ₹' + P.capital.toLocaleString('en-IN') + ') |\n|---|---|---|---|---|---|---|---|---|';
const stamp = new Date().toISOString().slice(0, 10);
const md = [`# Backtest — ${stamp}`, '', `History ${bars.dates[P.warmup]} → ${bars.dates[N - 1]} (${N} days, ${Object.keys(bars.sym).length} symbols). Parameters: ${JSON.stringify(P)}. Setups: ${setupsFilter}.`, '',
  '## Overall', '', hdr, row('all', all), '', '## By setup', '', hdr, ...Object.entries(bySetup).map(([k, v]) => row(k, v)), '', '## By score band', '', hdr, ...Object.entries(byScore).map(([k, v]) => row(k, v)), '', '## By year', '', hdr, ...Object.entries(byYear).map(([k, v]) => row(k, v)), '',
  '## Exit reasons', '', ...Object.entries(byReason).map(([k, v]) => `- ${k}: ${v}`), '',
  '## How to read this', '', 'Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.',
  '', 'Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today\'s constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.'].join('\n');
const OUT = arg('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, `backtest-${stamp}.md`), md);
await fs.writeFile(path.join(OUT, `backtest-${stamp}.json`), JSON.stringify({ params: P, overall: all, bySetup, byYear, byScore, byReason, equityR, trades }, null, 1));
console.log(md.split('\n').slice(0, 12).join('\n')); console.log(`\nfull report: reports/backtest-${stamp}.md (and .json with every trade)`);
