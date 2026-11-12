#!/usr/bin/env node
/* Walk-forward backtest of the rules in engine.js over data/history/*.json.
 *
 *   node scripts/backtest.mjs                         # all history
 *   node scripts/backtest.mjs --from 2025-01-01 --to 2025-12-31
 *   node scripts/backtest.mjs --set minRR=2 --set maxPositions=6 --set minScore=60
 *   node scripts/backtest.mjs --setups breakout       # only 52W breakouts (or: pullback)
 *   node scripts/backtest.mjs --set sectorBump=0 --set volumeBump=0   # score without the sector / volume points
 *   node scripts/backtest.mjs --set exit=ma10         # exit on a close below the 10-day average instead of the time stop (or: ma20)
 *   node scripts/backtest.mjs --set gate=200          # regime gate: new orders only while the Nifty is above its 200-day average
 *   node scripts/backtest.mjs --set fill=close        # enter at the signal day's close instead of a buy-stop the next day
 *   node scripts/backtest.mjs --set universe=momentum # orders only for names in the momentum engine's top 30 that day (momentum:50 for top 50)
 *   node scripts/backtest.mjs --members                # only that day's NIFTY 500 members, for the analysis and for the momentum ranking alike
 *
 * Model (deliberately simple and conservative):
 *   - Each day's ACT signals are candidates for the NEXT day. A buy-stop at `entry` fills if the next
 *     day's high reaches it (at the open if the open is already above entry; skipped if the open gaps
 *     more than 3% above entry).
 *   - Exits, checked in this order each day: open below stop → exit at open; low ≤ stop → exit at stop;
 *     high ≥ target → exit at target (at the open if it gaps above); then the `exit` rule at the close:
 *     `time` (default) after `maxHold` bars; `ma10` / `ma20` on a close below that moving average (no time
 *     stop unless maxHold is also set explicitly).
 *   - Stop moves to breakeven once a close is ≥ entry + 1R (the rule on the site).
 *   - Max `maxPositions` open, never two in one sector, candidates taken in score order.
 *   - Costs: `costBps` round-trip (default 30 bps ≈ brokerage + STT + slippage for delivery trades).
 *   - `gate=N` (default 0 = off): a signal from day i's close becomes an order only if the momentum engine's gate
 *     (index close above its N-day average, breadth fallback) is open on day i. Closed or not yet computable → no
 *     order. Open positions are untouched and leave on their normal exits.
 *   - `fill=close` (default `next`): an act signal on day i is filled at day i's close, same stop price, risk =
 *     fill − stop, target = fill + minRR × risk; exits start on day i + 1. Optimistic: it assumes the full day's bar
 *     is known at the moment of buying, which a pre-close run would not have.
 *   - `universe=momentum[:N]` (default `all`): a signal from day i's close becomes an order only if its symbol holds
 *     rank ≤ N (default 30) in the momentum engine's ranking as of day i's close (momentum.js rankAt, default
 *     parameters, only bars up to i). The ranking needs lookback + skip + 1 bars, so no order is placed before that;
 *     the report names the first date it was defined so the unfiltered run can be repeated from the same date.
 *   - `--members [file]`: point-in-time NIFTY 500 membership (data/membership/members.json, scripts/membership.mjs).
 *     Each day's analysis — sector board, relative strength, signals — and the momentum ranking behind
 *     `universe=momentum` see only that day's members. Open positions are untouched. Report files get a `-members`
 *     suffix. Until past members have bars this removes future members only (see the report's Universe section).
 * Writes reports/backtest-<stamp>.md and .json. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const M = require(path.join(ROOT, 'momentum.js'));
import { membershipFilter, membersOn } from './membership.mjs';
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; }; const flag = k => argv.includes('--' + k);
const sets = {}; argv.forEach((a, i) => { if (a === '--set') { const [k, v] = argv[i + 1].split('='); sets[k] = isNaN(+v) ? v : +v; } });
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const P = Object.assign({ minRR: config.risk.minRR, capital: config.risk.capital, riskPct: config.risk.riskPct, maxPos: config.risk.maxPos, maxPositions: 4, maxHold: 15, minScore: 50, costBps: 30, warmup: 60, exit: 'time', sectorBump: E.DEFAULTS.sectorBump, volumeBump: E.DEFAULTS.volumeBump, gate: 0, fill: 'next', universe: 'all' }, sets);
if (!/^(time|ma\d+)$/.test(String(P.exit))) { console.error(`--set exit= must be time, ma10, ma20 …; got ${P.exit}`); process.exit(2); }
if (!/^(next|close)$/.test(String(P.fill))) { console.error(`--set fill= must be next or close; got ${P.fill}`); process.exit(2); }
if (!(Number.isInteger(P.gate) && P.gate >= 0)) { console.error(`--set gate= must be a whole number of days (0 = off); got ${P.gate}`); process.exit(2); }
const uniM = /^momentum(?::(\d+))?$/.exec(String(P.universe)); if (P.universe !== 'all' && !uniM) { console.error(`--set universe= must be all or momentum[:N]; got ${P.universe}`); process.exit(2); }
const uniRank = uniM ? +(uniM[1] || 30) : 0;
const maExit = P.exit === 'time' ? 0 : +String(P.exit).slice(2);
const timeStop = (P.exit === 'time' || 'maxHold' in sets) ? P.maxHold : Infinity;
const setupsFilter = arg('setups', 'all');
const from = arg('from', '0000-00-00'), to = arg('to', '9999-99-99');

const HIST = arg('hist', path.join(ROOT, 'data', 'history'));
const files = []; for (const f of (await fs.readdir(HIST).catch(() => []))) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
if (!files.length) { console.error('No history files in data/history/. Run the backfill first: node scripts/backfill.mjs --years 2'); process.exit(2); }
const custom = (JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'sectors.json'), 'utf8').catch(() => '{"map":{}}'))).map || {};
const adjustments = JSON.parse(await fs.readFile(arg('adjust', path.join(ROOT, 'data', 'adjustments.json')), 'utf8').catch(() => 'null'));   // corporate actions (scripts/corporate-actions.mjs); optional
const bars = E.buildBars(files, [], { adjustments }); const N = bars.dates.length;
if (bars.adjusted) console.log(`corporate actions applied: ${bars.adjusted.events} events across ${bars.adjusted.symbols} symbols`);
console.log(`history: ${N} days, ${Object.keys(bars.sym).length} symbols, ${bars.dates[0]} → ${bars.dates[N - 1]}${bars.index ? ', index bars present' : ', no index bars'}`);

// --members [file]: point-in-time NIFTY 500 membership, applied to analyzeAt and to the momentum ranking alike
let MEM = null, memStats = null, memFilter = null;
if (flag('members')) { const v = arg('members'); const file = v && !v.startsWith('--') ? path.resolve(v) : path.join(ROOT, 'data', 'membership', 'members.json');
  MEM = JSON.parse(await fs.readFile(file, 'utf8').catch(() => { console.error(`--members: cannot read ${file}. Build it first: node scripts/membership.mjs`); process.exit(2); })); memFilter = membershipFilter(MEM); P.members = true;
  const ever = Object.keys(MEM.symbols); const withBars = ever.filter(s => bars.sym[s]);
  memStats = { from: MEM.from, asOf: MEM.asOf, events: MEM.events.length, everMembers: ever.length, everWithBars: withBars.length, barsNotMembers: Object.keys(bars.sym).filter(s => !MEM.symbols[s]).length, membersOnFirstDay: membersOn(MEM, bars.dates[0] < MEM.from ? MEM.from : bars.dates[0]).filter(s => bars.sym[s]).length };
  console.log(`membership: ${memStats.events} events ${MEM.from} → ${MEM.asOf}; ${memStats.everMembers} names were ever members, ${memStats.everWithBars} have bars; ${memStats.barsNotMembers} symbols with bars were never members`); }
const settings = { capital: P.capital, riskPct: P.riskPct, minRR: P.minRR, maxPos: P.maxPos, sectorBump: P.sectorBump, volumeBump: P.volumeBump };
const open = []; const trades = []; let pending = []; const equityR = []; let cumR = 0;
const sectorOf = s => E.sectorOf(s, custom);
// regime gate at the close of day i (momentum.js gateAt: only bars up to i). Not computable counts as closed.
const gateStats = { open: 0, closed: 0, undefined: 0, index: 0, breadth: 0, skipped: 0, firstDefined: null };
const gateAt = i => { if (!P.gate) return true; const g = M.gateAt(bars, i, { gateSma: P.gate });
  if (g.open == null) { gateStats.undefined++; return false; } if (!gateStats.firstDefined) gateStats.firstDefined = bars.dates[i];
  gateStats[g.source] = (gateStats[g.source] || 0) + 1; gateStats[g.open ? 'open' : 'closed']++; return g.open; };
// momentum universe: rank ≤ uniRank in momentum.js's ranking at the close of day i (only bars up to i). Undefined before the warm-up.
const uniStats = { days: 0, undefined: 0, kept: 0, dropped: 0, firstDefined: null };
const inUniverse = (() => { let cache = { i: -1, ranks: null }; return (sym, i) => { if (!uniRank) return true;
  if (cache.i !== i) { const R = M.rankAt(bars, i, {}, custom, memFilter); const ranks = {}; for (const r of R.ranked) ranks[r.sym] = r.rank; cache = { i, ranks, n: R.ranked.length }; uniStats.days++;
    if (!cache.n) uniStats.undefined++; else if (!uniStats.firstDefined) uniStats.firstDefined = bars.dates[i]; }
  const ok = cache.ranks[sym] != null && cache.ranks[sym] <= uniRank; uniStats[ok ? 'kept' : 'dropped']++; return ok; }; })();
const tryFill = (q, fill, i) => { const stop = q.stop, risk = fill - stop; if (!(risk > 0)) return false;
  const target = fill + P.minRR * risk; const sz = E.sizing(fill, stop, q.reg, settings); if (!sz || sz.qty < 1) return false;
  open.push({ sym: q.sym, sector: q.sector, setup: q.setup, score: q.score, entry: fill, stop, stop0: stop, target, qty: sz.qty, fillIdx: i }); return true; };
for (let i = P.warmup; i < N - 1; i++) {
  const date = bars.dates[i]; if (date < from || date > to) continue;
  // 1. manage open positions on day i (bars of day i)
  for (const p of [...open]) { const B = bars.sym[p.sym]; const o = B.o[i], h = B.h[i], l = B.l[i], c = B.c[i]; if (c == null) continue;
    let exit = null, reason = null;
    if (o != null && o <= p.stop) { exit = o; reason = 'gap through stop'; }
    else if (l != null && l <= p.stop) { exit = p.stop; reason = p.stop >= p.entry ? 'breakeven stop' : 'stop'; }
    else if (o != null && o >= p.target) { exit = o; reason = 'gap above target'; }
    else if (h != null && h >= p.target) { exit = p.target; reason = 'target'; }
    else if (maExit && (ma => ma != null && c < ma)(E.indicators.sma(B.c, maExit, i))) { exit = c; reason = `close below ${maExit}-day average`; }
    else if (i - p.fillIdx >= timeStop) { exit = c; reason = 'time stop'; }
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
    tryFill(q, fill, i); }
  pending = [];
  // 3. generate tomorrow's orders from today's close
  const res = E.analyzeAt(bars, i, { settings, custom, filter: memFilter }); const gateOpen = gateAt(i);
  for (const s of res.signals) { if (s.kind !== 'act' || s.score < P.minScore) continue; if (setupsFilter !== 'all' && !s.setup.toLowerCase().includes(setupsFilter)) continue;
    if (!gateOpen) { gateStats.skipped++; continue; }
    if (!inUniverse(s.sym, i)) continue;
    pending.push({ sym: s.sym, sector: s.sector, setup: s.setup, score: s.score, entry: s.entry, stop: s.stop, reg: res.reg }); }
  pending.sort((a, b) => b.score - a.score);
  // fill=close: take today's signals at today's close (same slot and sector limits, score order); nothing carries over
  if (P.fill === 'close') { for (const q of pending) { if (open.length >= P.maxPositions) break; if (open.some(x => x.sym === q.sym || x.sector === q.sector)) continue;
    const c = bars.sym[q.sym].c[i]; if (c == null) continue; tryFill(q, c, i); } pending = []; }
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
const stamp = new Date().toISOString().slice(0, 10) + (bars.adjusted && bars.adjusted.events ? '-adjusted' : '') + (MEM ? '-members' : '');   // adjusted-history and members runs get their own file names
const md = [`# Backtest — ${stamp}`, '', `History ${bars.dates[P.warmup]} → ${bars.dates[N - 1]} (${N} days, ${Object.keys(bars.sym).length} symbols). Parameters: ${JSON.stringify(P)}. Setups: ${setupsFilter}.`, '',
  '## Overall', '', hdr, row('all', all), '', '## By setup', '', hdr, ...Object.entries(bySetup).map(([k, v]) => row(k, v)), '', '## By score band', '', hdr, ...Object.entries(byScore).map(([k, v]) => row(k, v)), '', '## By year', '', hdr, ...Object.entries(byYear).map(([k, v]) => row(k, v)), '',
  '## Exit reasons', '', ...Object.entries(byReason).map(([k, v]) => `- ${k}: ${v}`), '',
  ...(P.gate ? ['## Regime gate', '', `Nifty above its ${P.gate}-day average: open on ${gateStats.open} days, closed on ${gateStats.closed}, not yet computable on ${gateStats.undefined} (first computable ${gateStats.firstDefined || '—'}; ${gateStats.index} days read from the index, ${gateStats.breadth} from the breadth fallback). ${gateStats.skipped} act signals were not turned into orders.`, ''] : []),
  ...(uniRank ? ['## Universe', '', `Momentum top ${uniRank}: of the act signals that reached this filter, ${uniStats.kept} were in the list and ${uniStats.dropped} were not (${uniStats.days} signal days; ranking undefined on ${uniStats.undefined} of them; first defined ${uniStats.firstDefined || '—'}). Repeat the unfiltered run with \`--from ${uniStats.firstDefined || '…'}\` for a same-window control.`, ''] : []),
  ...(MEM ? ['## Universe: point-in-time NIFTY 500 membership', '', `Each day's analysis and the momentum ranking saw only that day's members (\`data/membership/members.json\`: ${memStats.events} events, ${MEM.from} → ${MEM.asOf}). ${memStats.everMembers} names were members at some point; ${memStats.everWithBars} have bars, ${memStats.everMembers - memStats.everWithBars} do not yet (left the index before the history was loaded; the owner's past-members price load fills them in); ${memStats.barsNotMembers} symbols with bars were never members and were never seen. Until the past members have bars this removes the future members only.`, ''] : []),
  ...(P.fill === 'close' ? ['## Fill', '', 'Entries are at the signal day\'s close, not a buy-stop the next day. This assumes the whole day\'s bar is known when buying; a run before the close would see less.', ''] : []),
  '## How to read this', '', 'Expectancy is the average R (multiple of the initial risk) per trade after costs; above +0.2R with a profit factor above 1.3 over 100+ trades is a system worth trading small. Max DD is the deepest peak-to-trough fall in cumulative R: with 1% risk per trade, 10R of drawdown ≈ 10% of capital. The P&L column uses fixed-fraction sizing at the configured capital with no compounding. Fewer than ~60 trades in a slice is noise.',
  '', 'Known simplifications: fills assume the stop order is working at the open; no partial exits; survivorship bias if the universe list is today\'s constituents (names that left the index are absent); corporate actions (splits, bonuses) are not adjusted in bhavcopy data and can produce false stop-outs on ex-dates.'].join('\n');
const OUT = arg('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, `backtest-${stamp}.md`), md);
await fs.writeFile(path.join(OUT, `backtest-${stamp}.json`), JSON.stringify({ params: P, overall: all, bySetup, byYear, byScore, byReason, ...(P.gate ? { gate: gateStats } : {}), ...(uniRank ? { universe: uniStats } : {}), ...(MEM ? { membership: memStats } : {}), equityR, trades }, null, 1));
console.log(md.split('\n').slice(0, 12).join('\n')); console.log(`\nfull report: reports/backtest-${stamp}.md (and .json with every trade)`);
