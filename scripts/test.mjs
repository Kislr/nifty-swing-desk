/* Self-test: node scripts/test.mjs  (engine rules + a synthetic end-to-end backtest) */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js')); const M = require(path.join(ROOT, 'momentum.js'));
let fails = 0; const assert = (c, m) => { if (!c) { fails++; console.error('FAIL:', m); } else console.log('ok  ', m); };

// 1. NSE API payload (shape served by /api/NextApi/apiClient/marketWatchApi?functionName=getIndicesData)
const api = { data: { timestamp: '16-Oct-2026 16:00:00', marketStatus: { marketStatus: 'Closed' }, data: [
  { priority: 1, symbol: 'NIFTY 50', open: 23065.1, dayHigh: 23149.85, dayLow: 22913.8, previousClose: 22997.35, lastPrice: 23106.5, change: 109.15, pChange: 0.47, totalTradedVolume: 299922266, totalTradedValue: 300481157847.69, yearHigh: 26373.2, yearLow: 22179.9, perChange30d: -0.48, lastUpdateTime: '2026-10-16 15:30:14' },
  { priority: 0, symbol: 'BHARTIARTL', open: 1866, dayHigh: 1909.7, dayLow: 1857.7, previousClose: 1854, lastPrice: 1898, change: 44, pChange: 2.37, totalTradedVolume: 19257193, totalTradedValue: 36437690306.88, yearHigh: 2174.5, yearLow: 1726.3, perChange30d: 2.89, lastUpdateTime: '2026-10-16 15:30:01' },
  { priority: 0, symbol: 'KOTAKBANK', open: 448.7, dayHigh: 450.85, dayLow: 444, previousClose: 447.95, lastPrice: 450.3, change: 2.35, pChange: 0.52, totalTradedVolume: 4411576, totalTradedValue: 1969900000, yearHigh: 453.2, yearLow: 345.5, perChange30d: 8.58, lastUpdateTime: '2026-10-16 15:30:01' },
] } };
assert(E.rowsFromNseApi({ data: api.data.data }).length === 3, 'flat payload shape also accepted');
const rows = E.rowsFromNseApi(api); assert(rows.length === 3 && rows[0].isIndex, 'api rows parsed, index flagged');
assert(Math.abs(rows[1].val - 3643.77) < 0.01, 'traded value converted to ₹ crore');
const doc = E.toSnapshotDoc(rows, '2026-10-16', '15:30', 'nse-api'); assert(doc.count === 2 && doc.index.name === 'NIFTY 50', 'snapshot doc built');

// 2. engine on a lone snapshot (no history → fallback rules)
const res = E.buildSignals([doc], E.DEFAULTS, {});
const kb = res.signals.find(s => s.sym === 'KOTAKBANK');
assert(kb && kb.kind === 'alert' && kb.setup === '52W breakout', 'KOTAKBANK flagged as 52W breakout alert');
assert(kb.entry === 454.55 && kb.stop === 443.2 && kb.target === 477.25, `fallback levels ${kb.entry}/${kb.stop}/${kb.target} (2R)`);
assert(kb.size && kb.size.qty === 274 && kb.size.capped, 'sizing capped at 25% of capital');
assert(typeof kb.score === 'number' && Array.isArray(kb.reasons), 'score and reasons present');

// 3. history-aware path: synthetic bars with a trending stock, verify indicators + pullback detection
function synth(nSyms, nDays, seed = 7) {
  let x = seed; const rnd = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
  const dates = []; let d = new Date('2025-01-01'); while (dates.length < nDays) { if (d.getUTCDay() % 6) dates.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
  const symbols = {}; const idx = { name: 'NIFTY 50', o: [], h: [], l: [], c: [] }; let ic = 20000;
  for (let i = 0; i < nDays; i++) { const r = (rnd() - 0.5) * 0.02; const o = ic; ic = ic * (1 + r); idx.o.push(o); idx.c.push(ic); idx.h.push(Math.max(o, ic) * 1.004); idx.l.push(Math.min(o, ic) * 0.996); }
  for (let s = 0; s < nSyms; s++) { const drift = (s % 3 === 0 ? 0.0015 : s % 3 === 1 ? 0 : -0.001); const vol = 0.015 + (s % 5) * 0.004; let c = 100 + s * 7; const b = { o: [], h: [], l: [], c: [], v: [], t: [] };
    for (let i = 0; i < nDays; i++) { const o = c * (1 + (rnd() - 0.5) * 0.006); c = c * (1 + drift + (rnd() - 0.5) * 2 * vol); const h = Math.max(o, c) * (1 + rnd() * 0.01), l = Math.min(o, c) * (1 - rnd() * 0.01); const v = 1e5 * (0.5 + rnd() * (i % 17 === 0 ? 4 : 1));
      b.o.push(+o.toFixed(2)); b.h.push(+h.toFixed(2)); b.l.push(+l.toFixed(2)); b.c.push(+c.toFixed(2)); b.v.push(Math.round(v)); b.t.push(+(v * c / 1e7).toFixed(2)); }
    symbols['SYM' + s] = b; }
  return { year: 2025, dates, symbols, index: idx };
}
const hf = synth(60, 300); const bars = E.buildBars([hf], []);
const last = bars.dates.length - 1; const custom = {}; Object.keys(hf.symbols).forEach((s, i) => (custom[s] = 'Sector ' + (i % 6)));
const a = E.analyzeAt(bars, last, { custom });
const r0 = a.universe[0];
assert(r0.sma20 != null && r0.sma50 != null && r0.atr != null && r0.rsi != null && r0.rsPct != null, 'indicators computed from history');
assert(r0.h52 != null && r0.histDays >= 250, '52-week levels derived from bars');
assert(a.signals.every(s => s.score >= 0 && s.score <= 100), 'scores within 0–100');
// hand-check one indicator against a naive computation
const B = bars.sym.SYM3; const naive = B.c.slice(last - 19, last + 1).reduce((p, c) => p + c, 0) / 20; assert(Math.abs(E.indicators.sma(B.c, 20, last) - naive) < 1e-9, 'SMA20 matches naive mean');
// candles: construct an obvious bullish engulfing
const cb = { o: [100, 95], h: [101, 103], l: [94, 94.5], c: [95, 102], v: [1, 1], t: [1, 1] }; const cd = E.indicators.candles(cb, 1); assert(cd.bull.includes('bullish engulfing'), 'bullish engulfing detected');

// 3b. breakout trigger: the level is the 52-week high BEFORE today, so a close above it can actually fire
{ const n = 300; const dates = hf.dates.slice(0, n); const flat = { o: [], h: [], l: [], c: [], v: [], t: [] };
  for (let i = 0; i < n; i++) { const c = 100 + (i % 7) * 0.1; flat.o.push(c); flat.h.push(c + 0.5); flat.l.push(c - 0.5); flat.c.push(c); flat.v.push(1e5); flat.t.push(1); }
  const peak = 110; flat.h[200] = peak; flat.c[200] = 109; // prior 52-week high set 100 bars ago
  const brk = JSON.parse(JSON.stringify(flat)); brk.o[n - 1] = 108; brk.h[n - 1] = 112; brk.l[n - 1] = 107.5; brk.c[n - 1] = 111; // today closes above it
  const near = JSON.parse(JSON.stringify(flat)); near.o[n - 1] = 108; near.h[n - 1] = 109.5; near.l[n - 1] = 107.5; near.c[n - 1] = 109; // today stays below it
  const far = JSON.parse(JSON.stringify(flat)); far.o[n - 1] = 112; far.h[n - 1] = 118; far.l[n - 1] = 111; far.c[n - 1] = 117; // >4% through: extended
  const b2 = E.buildBars([{ year: 2025, dates, symbols: { BRK: brk, NEAR: near, FAR: far, FILL: flat }, index: null }], []);
  const a2 = E.analyzeAt(b2, n - 1, { custom: { BRK: 'X', NEAR: 'X', FAR: 'X', FILL: 'X' } });
  const g = sym => a2.signals.find(s => s.sym === sym);
  assert(g('BRK') && g('BRK').row.priorHi === peak && g('BRK').level === peak, 'breakout level is the prior 52-week high, not today\'s high');
  assert(g('BRK').kind === 'act' && g('BRK').setup === '52W breakout', 'close above the prior high fires as an order for tomorrow');
  assert(g('NEAR').kind === 'alert' && /Close above/.test(g('NEAR').trigger), 'close below the prior high stays an alert');
  assert(g('FAR').kind === 'alert' && /Extended/.test(g('FAR').trigger), 'close >4% through the level is extended, not an order'); }

// 3c. index guard: a snapshot whose index is a different index must not be spliced into the history series
{ const h = { year: 2026, dates: ['2026-10-14', '2026-10-15'], symbols: { A: { o: [1, 1], h: [1, 1], l: [1, 1], c: [1, 1], v: [1, 1], t: [1, 1] } }, index: { name: 'NIFTY 50', o: [100, 101], h: [100, 101], l: [100, 101], c: [100, 101] } };
  const s500 = { date: '2026-10-16', time: '16:00', rows: { A: [1, 1, 1, 1, 1, 0, 0, 1, 1, null, null, null] }, index: { name: 'NIFTY 500', ltp: 90, pct: 0.4, open: 90, high: 90, low: 90 } };
  const s50 = { date: '2026-10-19', time: '16:00', rows: { A: [1, 1, 1, 1, 1, 0, 0, 1, 1, null, null, null] }, index: { name: 'NIFTY 50', ltp: 102, pct: 1, open: 102, high: 102, low: 102 } };
  const b = E.buildBars([h], [s500, s50]);
  assert(b.index.c.join() === '100,101,,102', 'buildBars keeps a NIFTY 500 close out of the NIFTY 50 series but accepts a NIFTY 50 one');
  assert(b.extras['2026-10-16'].__index.pct === 0.4, 'the snapshot\'s own daily % is still available for the regime');
  const hh = JSON.parse(JSON.stringify(h)); E.appendSnapshotToHistory(hh, s500); E.appendSnapshotToHistory(hh, s50);
  assert(hh.index.c.join() === '100,101,,102' && hh.symbols.A.c.length === 4, 'appendSnapshotToHistory applies the same guard and keeps arrays aligned'); }

// 3d. momentum engine on the synthetic history: ranks, gate, sector cap, simulation
{ const sel = M.selectAt(bars, last, { topN: 5, maxPerSector: 2 }, custom);
  assert(sel.ranked.length > 0 && sel.ranked.every((r, k) => k === 0 || r.score <= sel.ranked[k - 1].score), 'momentum ranking is sorted by score');
  assert(sel.picks.length === 5 && Object.values(sel.picks.reduce((m, r) => (m[r.sector] = (m[r.sector] || 0) + 1, m), {})).every(n => n <= 2), 'top-N respects the per-sector cap');
  assert(sel.gate.open != null && sel.gate.source === 'index', 'regime gate computed from index bars');
  const noIdx = { dates: bars.dates, sym: bars.sym, index: null, extras: {} }; const g = M.gateAt(noIdx, last, M.DEFAULTS); assert(g.source === 'breadth' && typeof g.open === 'boolean', 'gate falls back to breadth without index bars');
  const sim = M.simulate(bars, { topN: 5 }, custom, { capital: 500000 }); const st = M.stats(sim);
  assert(sim.trades.length > 0 && sim.equity.length === bars.dates.length - sim.warmup, `momentum simulation ran (${sim.trades.length} trades, synthetic data — numbers are meaningless)`);
  assert(Math.abs(sim.equity[sim.equity.length - 1].value - st.final) < 1 && st.maxDrawdown >= 0 && st.maxDrawdown <= 1, 'momentum stats consistent with the equity curve');
  assert(/MOMENTUM/.test(M.digest(sel, E.fmt)), 'momentum digest renders');
  // compound option (6 Nov 2026 finding: fixed slots leave profits idle). Fixed mode: no buy ever exceeds capital / topN.
  // Compound mode: same first rebalance, later buys sized from current equity. A longer series (500 days) is needed so that
  // some buys happen after equity has grown — on the 300-day series above the two modes are identical, which proves nothing.
  assert(sim.trades.every(t => (t.entry * t.qty) <= 500000 / 5 + 1e-6) && sim.equity.every(e => e.invested >= 0 && e.invested <= e.value + 1), 'fixed slots: every buy ≤ capital ÷ topN; invested never exceeds equity');
  const lb = E.buildBars([synth(60, 500)], []); const fxL = M.simulate(lb, { topN: 5 }, custom, { capital: 500000 }); const cmp = M.simulate(lb, { topN: 5, compound: true }, custom, { capital: 500000 }); const cst = M.stats(cmp);
  const firstDay = fxL.trades.reduce((d, t) => t.entryDate < d ? t.entryDate : d, '9999'); const firstSet = s => s.trades.filter(t => t.entryDate === firstDay).map(t => t.sym + ':' + t.qty).sort().join();
  assert(firstSet(fxL) === firstSet(cmp), 'compound: the first rebalance buys the same names in the same sizes (equity = capital before any trade)');
  const slotOk = cmp.trades.every(t => { const k = cmp.equity.findIndex(e => e.date === t.entryDate); const eqPrev = k > 0 ? cmp.equity[k - 1].value : 500000; return t.entry * t.qty <= eqPrev * 1.5 / 5 + t.entry; });
  const bigger = cmp.trades.filter(t => t.entry * t.qty > 500000 / 5 + t.entry).length;   // a buy larger than the fixed slot by more than one share: impossible in fixed mode
  assert(slotOk && bigger > 0 && fxL.trades.every(t => t.entry * t.qty <= 500000 / 5 + 1e-6) && cst.final !== M.stats(fxL).final && cst.atWork > 0 && cst.atWork <= 1, `compound: ${bigger} buy(s) larger than the fixed slot and a different end value (fixed ₹${M.stats(fxL).final}, reinvested ₹${cst.final}, synthetic)`); }

// 3e. momentum refinements (13 Nov 2026, reports/momentum-hypotheses-2026-11-13.md): refill at the close, volatility-scaled sizing. Both ON by default since the
// owner's decision of 13 Nov 2026; the 12 Nov rules are refill: 'rebalance', volScale: false and must still reproduce.
{ const lb = E.buildBars([synth(60, 500)], []); const key = t => [t.sym, t.entryDate, t.exitDate, t.qty].join('|'); const OFF = { refill: 'rebalance', volScale: false };
  assert(M.DEFAULTS.refill === 'close' && M.DEFAULTS.volScale === true, 'defaults: both switches on (owner, 13 Nov 2026)');
  const base = M.simulate(lb, { topN: 5, ...OFF }, custom, { capital: 500000 }); const bst = M.stats(base);
  assert(base.trades.every(t => t.fill === 'rebalance' && t.size === 'full') && bst.refills === 0 && bst.halfSized === 0 && bst.volHighDays === null, 'switches off (12 Nov rules): every buy is a full-size rebalance buy; no refills, no half sizes, no volatility flag in the curve');
  const rf = M.simulate(lb, { topN: 5, refill: 'close', volScale: false }, custom, { capital: 500000 }); const rst = M.stats(rf); const rebDays = new Set(); for (let i = base.warmup; i < lb.dates.length; i += M.DEFAULTS.rebalance) rebDays.add(lb.dates[i]);
  const refills = rf.trades.filter(t => t.fill === 'refill'); const gateOn = Object.fromEntries(rf.equity.map(e => [e.date, e.gate]));
  assert(refills.length > 0 && rst.refills === refills.length && refills.every(t => !rebDays.has(t.entryDate) && gateOn[t.entryDate] !== false) && rf.trades.filter(t => t.fill === 'rebalance').every(t => rebDays.has(t.entryDate)), `refill=close: ${refills.length} refill buys, none on a rebalance day or with the gate closed; rebalance buys only on rebalance days`);
  assert(rf.equity.every(e => e.positions <= 5) && rf.equity.filter(e => e.gate && e.positions < 5).length <= base.equity.filter(e => e.gate && e.positions < 5).length, 'refill=close: never more than topN names; fewer gate-open days with a short book than at the defaults');
  const closedOn = {}; for (const t of rf.trades) (closedOn[t.exitDate] = closedOn[t.exitDate] || []).push(t.sym);
  assert(refills.every(t => !(closedOn[t.entryDate] || []).includes(t.sym)), 'refill=close: a name closed at a close is not bought back at the same close');
  const flags = M.volFlags(lb, M.DEFAULTS); const k = 400; const sf = synth(60, 500); const sl = a => a.slice(0, k + 1);
  const cut = E.buildBars([{ year: sf.year, dates: sl(sf.dates), symbols: Object.fromEntries(Object.entries(sf.symbols).map(([s, b]) => [s, Object.fromEntries(Object.entries(b).map(([q, a]) => [q, sl(a)]))])), index: { name: sf.index.name, o: sl(sf.index.o), h: sl(sf.index.h), l: sl(sf.index.l), c: sl(sf.index.c) } }], []);
  const cutFlags = M.volFlags(cut, M.DEFAULTS);
  assert(flags.slice(0, 20 + 250 - 1).every(f => f === null) && flags.slice(20 + 250 - 1).every(f => typeof f === 'boolean') && flags.some(f => f) && flags.some(f => f === false) && cutFlags.every((f, i) => f === flags[i]), 'volFlags: null until 20 + 250 bars exist, then boolean, both values occur; flags up to bar k are the same when the series is cut at k (no look-ahead)');
  const vs = M.simulate(lb, { topN: 5, volScale: true, refill: 'rebalance' }, custom, { capital: 500000 }); const vst = M.stats(vs); const halves = vs.trades.filter(t => t.size === 'half'); const flagOn = Object.fromEntries(lb.dates.map((d, i) => [d, flags[i]]));
  assert(halves.length > 0 && vst.halfSized === halves.length && halves.every(t => flagOn[t.entryDate] === true && t.entry * t.qty <= 500000 / 5 / 2 + 1e-6) && vs.trades.filter(t => t.size === 'full').every(t => flagOn[t.entryDate] !== true) && vst.volHighDays > 0 && vst.volHighDays < 1 && vs.equity.every(e => e.volHigh === flagOn[e.date]), `volScale: ${halves.length} half-size buys, each on a flagged day and ≤ half the slot; full-size buys only on unflagged days; the curve carries the flag`);
  const noIdx = { dates: lb.dates, sym: lb.sym, index: null, extras: {} }; assert(M.volFlags(noIdx, M.DEFAULTS).every(f => f === null) && M.simulate(noIdx, { topN: 5, volScale: true, refill: 'rebalance' }, custom, { capital: 500000 }).trades.every(t => t.size === 'full'), 'volScale without index bars: no flag, every buy full size');
  // windowed run (13 Nov 2026 fix): positions open at --to are closed at the last bar inside the window, not at the end of the whole history
  const to = lb.dates[300]; const win = M.simulate(lb, { topN: 5 }, custom, { capital: 500000, to }); const eod = win.trades.filter(t => t.reason === 'end of data');
  const lastEq = win.equity[win.equity.length - 1]; const exitCost = lastEq.invested * M.DEFAULTS.costBps / 2 / 10000;   // the curve marks open names at the close; closing them pays half the round trip
  assert(win.trades.every(t => t.exitDate <= to) && eod.length > 0 && eod.every(t => t.exitDate === to) && Math.abs(lastEq.value - exitCost - (500000 + win.trades.reduce((p, t) => p + t.pnl, 0))) < eod.length + 2, `windowed run: ${eod.length} end-of-data exits on ${to}, none after it; trade P&L sums to the last equity point less the exit cost`); }

// 3f. paper book (13 Nov 2026): the engine's rules replayed from a start date, beside the index funds; the same function feeds the job, the digest and the site
{ const lb = E.buildBars([synth(60, 500)], []); const D = lb.dates; const from = D[300]; const today = D[D.length - 1];
  const bm = { 'TEST MOMENTUM 50': Object.fromEntries(D.slice(290).map((d, k) => [d, 1000 + k * 2])), 'TEST EMPTY': {} };
  const pb = M.paperBook(lb, {}, custom, { from, capital: 500000, benchmarks: bm }); const sim = M.simulate(lb, { compound: true }, custom, { from, capital: 500000, stale: 20 });
  assert(pb && pb.from === from && pb.to === today && pb.capital === 500000 && pb.params.compound === true && pb.params.refill === 'close' && pb.params.volScale === true && pb.days === sim.equity.length && pb.value === sim.equity[sim.equity.length - 1].value, `paperBook: runs the defaults (both switches on, reinvested) from ${from} to ${today}; value equals the simulation's last equity point`);
  const held = sim.trades.filter(t => t.reason === 'end of data').map(t => t.sym).sort();
  assert(pb.positions.map(p => p.sym).join() === held.join() && pb.positions.every(p => p.stop === +(p.peak * 0.8).toFixed(2) && p.last > p.stop && p.qty > 0 && lb.sym[p.sym].c[D.length - 1] === p.last), `paperBook: ${pb.positions.length} holdings = the names still open at the end, each with stop = peak × 0.8, LTP above it`);
  assert(pb.buys.every(b => b.price > 0 && b.qty > 0) && pb.sells.every(x => x.reason !== 'end of data') && typeof pb.nextRebalanceIn === 'number' && pb.nextRebalanceIn >= 0 && pb.nextRebalanceIn < 21 && pb.gate && (pb.volHigh === null || typeof pb.volHigh === 'boolean') && pb.slot > 0, 'paperBook: today\'s buys / sells, next rebalance, gate, volatility flag and slot are all present');
  const b50 = pb.benchmarks.find(b => b.name === 'NIFTY 50'), bt = pb.benchmarks.find(b => b.name === 'TEST MOMENTUM 50'), be = pb.benchmarks.find(b => b.name === 'TEST EMPTY');
  assert(b50 && b50.from === from && Math.abs(b50.ret - (lb.index.c[D.length - 1] / lb.index.c[300] - 1)) < 1e-12 && bt && bt.from === from && Math.abs(bt.ret - ((1000 + (D.length - 1 - 290) * 2) / (1000 + 10 * 2) - 1)) < 1e-12 && bt.stale === false && be && be.missing === true, 'paperBook: NIFTY 50 from the bars and a saved index series are both measured from the book\'s first day; a series with no closes is reported missing, not zero');
  const txt = M.paperDigest(pb, E.fmt);
  assert(/^PAPER BOOK — /.test(txt) && txt.includes(`since ${from}`) && txt.includes('TEST MOMENTUM 50') && !txt.includes('TEST EMPTY') && /gate (OPEN|CLOSED|n\/a)/.test(txt) && /next rebalance in \d+ bar/.test(txt) && (pb.positions.length ? /holding .*\(hold unless a close is below the stop\)/.test(txt) : true), 'paperDigest: header with the fund comparison, the gate / size / rebalance line, and the holdings line');
  assert(M.paperBook(lb, {}, custom, { from: '2099-01-01', capital: 500000 }) === null && M.paperBook(lb, {}, custom, { capital: 500000 }) === null && M.paperDigest(null) === null, 'paperBook: null before the start date exists or without one; paperDigest(null) is null');
  const full = E.digest(E.analyzeLatest([synth(60, 300)], [], E.DEFAULTS, custom), E.DEFAULTS, { momentum: 'MOMENTUM test', paper: txt, reminders: null });
  assert(full.indexOf('MOMENTUM test') < full.indexOf('PAPER BOOK') && full.indexOf('PAPER BOOK') < full.indexOf('SWING'), 'digest: the paper book block follows the momentum list and precedes the swing setups');
  const long = Array.from({ length: 12 }, (_, k) => `BLOCK ${k}\n` + 'x'.repeat(600)).join('\n\n'); const parts = E.chunks(long, 2000);
  assert(parts.length > 1 && parts.every(p => p.length <= 2000) && parts.join('\n\n') === long && parts.every(p => /^BLOCK \d+\n/.test(p)) && E.chunks('short').length === 1 && E.chunks('short')[0] === 'short', `chunks: a ${long.length}-character digest splits into ${parts.length} messages at blank lines, each under the cap, nothing lost; a short one is one message`); }


// 3f-2. the twenty-one paper books (A21, 23 Nov 2026): the same rules started on 21 consecutive sessions, book 1 unchanged, each read against the
// fund over its own days; the reading rule (reports/momentum-books-reading-rule-2026-11-23.md) as a function of the numbers
{ const lb = E.buildBars([synth(60, 500)], []); const D = lb.dates; const b = 340; const from = D[b]; const L = D.length - 1; const fundName = 'TEST MOMENTUM 50';   // the synthetic gate is open from bar 336 to 398, so every book buys on its first day
  const fund = Object.fromEntries(D.slice(290).map((d, k) => [d, 1000 + k * 2 - (k % 9 === 0 ? 40 : 0)])); const bm = { [fundName]: fund, 'TEST EMPTY': {} };
  const opt = { from, capital: 500000, benchmarks: bm, books: 21, fund: fundName };
  const B = M.paperBooks(lb, {}, custom, opt); const one = M.paperBook(lb, {}, custom, { from, capital: 500000, benchmarks: bm });
  assert(B && B.n === 21 && B.started === 21 && B.pending === 0 && B.frozen === false && B.list.length === 21 && B.rows.length === 21 && JSON.stringify(B.list[0]) === JSON.stringify(one), 'paperBooks: 21 books; book 1 is the paper book itself, to the last field');
  assert(B.rows.every((r, k) => r.k === k + 1 && r.from === D[b + k] && r.days === L - b - k + 1) && B.starts.join() === D.slice(b, b + 21).join() && B.from === from && B.to === D[L], 'paperBooks: book k starts at the close of the k-th session on or after `from`, one a day');
  const alone = [1, 7, 20].map(k => M.paperBook(lb, {}, custom, { from: D[b + k], capital: 500000, benchmarks: bm }));
  assert(alone.every((pb, j) => JSON.stringify(pb) === JSON.stringify(B.list[[1, 7, 20][j]])), 'paperBooks: a book replayed alone, without the shared ranking, is the same book (books 2, 8 and 21)');
  assert(new Set(B.rows.map(r => r.value)).size > 1, 'paperBooks: the start day changes the result on the same rules — the reason there are twenty-one');
  const fr = k => fund[D[L]] / fund[D[b + k]] - 1; const mdd = k => { let pk = -Infinity, dd = 0; for (const d of D.slice(b + k)) { pk = Math.max(pk, fund[d]); dd = Math.max(dd, (pk - fund[d]) / pk); } return dd; };
  assert(B.fund === fundName && B.measured === 21 && B.inexact.length === 0 && B.rows.every((r, k) => r.fundExact && Math.abs(r.fundRet - fr(k)) < 1e-12 && Math.abs(r.gap - (r.ret - fr(k))) < 1e-12 && r.ahead === (r.gap > 0) && Math.abs(r.fundDrawdown - mdd(k)) < 1e-12 && Math.abs(r.ddGap - (mdd(k) - r.maxDrawdown)) < 1e-12),
    'paperBooks: each book against the fund over its own days — return, gap, and both drawdowns from the daily closes');
  const med = a => { const x = [...a].sort((p, q) => p - q); return x.length % 2 ? x[(x.length - 1) / 2] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2; };
  assert(Math.abs(B.G - med(B.rows.map(r => r.gap))) < 1e-15 && B.A === B.rows.filter(r => r.gap > 0).length && Math.abs(B.D - med(B.rows.map(r => r.ddGap))) < 1e-15 && B.L === B.rows.filter(r => r.ddGap > 0).length && B.ret.median === med(B.rows.map(r => r.ret)) && B.ret.min === Math.min(...B.rows.map(r => r.ret)) && B.ret.max === Math.max(...B.rows.map(r => r.ret)) && B.gap.min <= B.G && B.G <= B.gap.max,
    `paperBooks: G = median gap, A = books ahead (${B.A} of 21), D and L the same for drawdown, median and range of the returns`);
  // the reading day: six calendar months after the last book starts; the reading exists once all 21 are measured, `due` says whether its day has come
  const six = d => { const t = new Date(d + 'T00:00:00Z'); t.setUTCMonth(t.getUTCMonth() + 6); return t.toISOString().slice(0, 10); };
  assert(B.readingFrom === six(D[b + 20]) && B.due === (D[L] >= B.readingFrom) && B.due === true && B.reading && ['ahead', 'level', 'behind'].includes(B.reading.ret) && B.reading.need === 14, `paperBooks: reading from ${B.readingFrom} (six months after book 21 starts), due on ${D[L]}; two books in three of 21 = 14`);
  const early = M.paperBooks(E.clipBars(lb, D[b + 40]), {}, custom, opt); assert(early.started === 21 && early.reading && early.due === false && JSON.stringify(early.rows[4]) !== JSON.stringify(B.rows[4]), 'paperBooks: before the reading day the rule can be applied but is not due');
  // books not yet started start by themselves; nothing is read until all exist
  const cut = M.paperBooks(E.clipBars(lb, D[b + 5]), {}, custom, opt); const line = M.booksLine(cut);
  assert(cut.started === 6 && cut.pending === 15 && cut.reading === null && cut.readingFrom === null && cut.due === false && cut.rows[5].from === D[b + 5] && cut.rows[5].days === 1 && cut.rows[5].ret < 0 && cut.rows[5].names > 0 && cut.rows[5].maxDrawdown === 0 && cut.rows[5].fundDrawdown === 0,
    'paperBooks: on the sixth day six books exist, fifteen are pending, no reading; a book on its first day is down by its buying costs');
  assert(/^• 21 BOOKS \(6 started, one a day\): median [+-]\d+\.\d%, [+-]\d+\.\d% to [+-]\d+\.\d% · ahead of TEST MOMENTUM 50, own days: \d of 6, median gap [+-]\d+\.\d pts$/.test(line) && line.length < 150 && /^• 21 BOOKS: median /.test(M.booksLine(B)), `booksLine: "${line}"`);
  const day1 = M.paperBooks(E.clipBars(lb, D[b]), {}, custom, opt); const txt1 = M.paperDigest(day1.list[0], E.fmt, day1), txt = M.paperDigest(cut.list[0], E.fmt, cut).split('\n');
  assert(day1.started === 1 && M.booksLine(day1) === null && txt1 === M.paperDigest(day1.list[0], E.fmt) && M.booksLine(null) === null && txt[1] === line && txt.filter(l => / BOOKS/.test(l)).length === 1 && /^PAPER BOOK — /.test(txt[0]) && /^• gate /.test(txt[2]) && txt.length === M.paperDigest(cut.list[0], E.fmt).split('\n').length + 1,
    'paperDigest: the books add exactly one line, under the header, once a second book exists; without them the block is what it was');
  assert(M.paperBooks(lb, {}, custom, { ...opt, from: '2099-01-01' }) === null && M.paperBooks(lb, {}, custom, { ...opt, from: undefined }) === null && M.paperBooks(lb, {}, custom, { ...opt, books: 1 }).started === 1 && M.paperBooks(lb, {}, custom, { from, capital: 500000 }).G === null, 'paperBooks: null before the first day or without one; books: 1 is the single book; no fund → no gap');
  // frozen start days: once in config.json they are used as written, so a session loaded later cannot move a book
  const starts = D.slice(b, b + 21); const fz = M.paperBooks(lb, {}, custom, { ...opt, starts }); const moved = starts.map((d, k) => k >= 10 ? D[b + 1 + k] : d); const mv = M.paperBooks(lb, {}, custom, { ...opt, starts: moved });
  assert(fz.frozen === true && JSON.stringify(fz.rows) === JSON.stringify(B.rows) && mv.rows[9].from === D[b + 9] && mv.rows[10].from === D[b + 11] && JSON.stringify(mv.rows[9]) === JSON.stringify(B.rows[9]) && JSON.stringify({ ...mv.rows[10], k: 0 }) === JSON.stringify({ ...B.rows[11], k: 0 }),
    'paperBooks: opts.starts fixes the start days — the same books when they are the counted days, and each book follows its own date when they are not');
  // a hole in the fund's series on a book's first day: measured from the next close, and said so
  const holed = { ...fund }; delete holed[D[b + 3]]; const hb = M.paperBooks(lb, {}, custom, { ...opt, benchmarks: { [fundName]: holed } });
  assert(hb.inexact.join() === '4' && hb.rows[3].fundExact === false && hb.rows[3].fundFrom === D[b + 4] && hb.rows[2].fundExact && hb.measured === 21, 'paperBooks: a fund close missing on a book\'s first day is flagged (inexact), not hidden');
  assert(M.seriesDrawdown({ a: 100, b: 120, c: 90, d: 130, e: 117 }, 'a', 'e') === 0.25 && M.seriesDrawdown({ a: 100, b: 120, c: 90 }, 'b', 'b') === 0 && M.seriesDrawdown({}, 'a', 'z') === null && M.seriesDrawdown({ a: 100, b: 120, c: 90, d: 130, e: 117 }, 'd', 'e') === 0.1, 'seriesDrawdown: the largest fall from a running peak between two dates');
  // the rule, on the numbers alone
  const S = (G, A, Dg, Lg, more) => M.booksReading({ n: 21, started: 21, measured: 21, G, A, D: Dg, L: Lg, ...more }); const R = M.READING;
  assert(R.gap === 0.01 && R.dd === 0.02 && R.months === 6 && S(0.012, 14, 0, 5).verdict === 'ahead' && S(0.01, 14, -0.05, 0).ret === 'ahead' && S(0.012, 13, 0, 5).ret === 'level' && S(0.0099, 21, 0, 5).ret === 'level' && S(0, 10, 0, 5).ret === 'level' && S(-0.0001, 10, 0, 5).ret === 'behind',
    'booksReading: ahead = median gap ≥ +1.0 point and 14 of 21 ahead; below zero = behind; everything between = level');
  assert(S(0.002, 12, 0.02, 14).verdict === 'monitor, loses less' && S(-0.03, 4, 0.02, 14).verdict === 'monitor, loses less' && S(0.002, 12, 0.0199, 21).verdict === 'monitor' && S(0.002, 12, 0.05, 13).verdict === 'monitor' && S(-0.03, 4, null, 0).verdict === 'monitor' && S(0.02, 20, 0.05, 21).verdict === 'ahead' && S(0.02, 20, 0.05, 21).losesLess === true,
    'booksReading: clearly better on drawdown = 2.0 points at the median and 14 of 21; it changes the wording of a monitor, never an ahead');
  assert(S(0.02, 20, 0, 0, { started: 20 }) === null && S(0.02, 20, 0, 0, { measured: 20 }) === null && S(null, 0, null, 0) === null && M.booksReading(null) === null && M.booksReading({ n: 3, started: 3, measured: 3, G: 0.02, A: 2, D: 0, L: 0 }).need === 2, 'booksReading: no reading until every book has started and has a fund close; the count scales as two in three'); }
// 3g. PEAD (13 Nov 2026, reports/pead-hypotheses-2026-11-13.md): results-date parsing, reaction-day mapping, the study, the script end to end
{ const RD = await import('./results-dates.mjs'); const PD = await import('./backtest-pead.mjs');
  assert(JSON.stringify(RD.parseStamp('13-Nov-2026 18:32:11')) === '{"date":"2026-11-13","time":"18:32"}' && JSON.stringify(RD.parseStamp('13 Nov 2026 02:15 PM')) === '{"date":"2026-11-13","time":"14:15"}' && RD.parseStamp('13-11-2026').time === null && RD.parseStamp('2026-11-13T09:05:00').time === '09:05' && RD.parseStamp('-') === null, 'results-dates: NSE\'s timestamp forms parse to ISO date + HH:MM; a dash is null');
  const fr = RD.normaliseRecord({ symbol: 'TCS', companyName: 'Tata', period: 'Quarterly', relatingTo: 'Second Quarter', exchdisstime: '09-Oct-2026 16:05:00' }, 'fr'), bm = RD.normaliseRecord({ symbol: 'TCS', bm_date: '09-Oct-2026', bm_purpose: 'Financial Results' }, 'bm');
  assert(fr && fr.date === '2026-10-09' && fr.time === '16:05' && fr.period === 'Second Quarter' && fr.src === 'fr' && bm && bm.time === null && bm.src === 'bm' && RD.normaliseRecord({ symbol: 'TCS', bm_date: '20-Oct-2026', bm_purpose: 'Dividend' }, 'bm') === null && RD.normaliseRecord({ symbol: 'TCS', period: 'Annual', exchdisstime: '09-Oct-2026 16:05:00' }, 'fr').skip === 'Annual', 'results-dates: field detection on both lists; a non-results board meeting is dropped, an annual filing is skipped');
  { const inf = RD.normaliseRecord({ symbol: 'JKSHAH', cmName: 'J.K.Shah', broadcast_Date: '18-Nov-2026 23:26:09', creation_Date: '18-Nov-2026 23:26:24', qe_Date: '30-JUN-2026', type_Sub: 'Original', revised_Date: null }, 'fr');
    assert(inf && inf.date === '2026-11-18' && inf.time === '23:26' && inf.period === '30-JUN-2026' && inf.src === 'fr' && RD.normaliseRecord({ symbol: 'JKSHAH', broadcast_Date: null, creation_Date: '19-Nov-2026 10:00:00', revised_Date: '19-Nov-2026 10:00:00', type_Sub: 'Revision' }, 'fr') === null, 'results-dates: an integrated-filing row is read as a timed financial result; a revision without a broadcast time is dropped');
    const cv = RD.coverage(RD.buildEvents([inf, RD.normaliseRecord({ symbol: 'INFY', bm_date: '10-Oct-2026', bm_purpose: 'Financial Results' }, 'bm')], null), null); assert(cv.years['2026'].events === 2 && cv.years['2026'].timed === 1 && cv.lastMonths['2026-11'] === 1 && cv.lastMonths['2026-10'] === 1, 'results-dates: coverage counts timed events per year and events per month'); }
  const ev = RD.buildEvents([fr, bm, fr, RD.normaliseRecord({ symbol: 'OLDTCS', exchdisstime: '10-Jul-2019 17:00:00', period: 'Quarterly' }, 'fr'), RD.normaliseRecord({ symbol: 'INFY', bm_date: '10-Oct-2026', bm_purpose: 'Financial Results' }, 'bm')], { OLDTCS: [{ to: 'TCS', date: '2020-01-01' }] });
  assert(Object.keys(ev.symbols).sort().join() === 'INFY,TCS' && ev.symbols.TCS.length === 2 && ev.symbols.TCS[0].date === '2019-07-10' && ev.symbols.TCS[1].src === 'fr' && ev.renamed === 1 && ev.dupes === 2 && ev.symbols.INFY[0].src === 'bm', 'results-dates: events keyed by today\'s ticker through the rename chain, duplicates and the meeting twin of a filing folded, a lone meeting date kept as bm');
  const lb = E.buildBars([synth(60, 500)], []); const D = lb.dates; const pos = {}; D.forEach((d, i) => (pos[d] = i)); const sat = (() => { const d = new Date(D[50] + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + (6 - d.getUTCDay())); return d.toISOString().slice(0, 10); })();
  assert(PD.reactionIndex(lb, pos, { date: D[50], time: '10:30' }) === 50 && PD.reactionIndex(lb, pos, { date: D[50], time: '17:45' }) === 51 && PD.reactionIndex(lb, pos, { date: D[50], time: null }) === 51 && PD.reactionIndex(lb, pos, { date: sat, time: '12:00' }) === D.findIndex(d => d > sat) && PD.reactionIndex(lb, pos, { date: '2099-01-01', time: null }) === null, 'pead: reaction day = same day before 15:30, next trading day after the close / without a time / on a weekend; null past the end');
  const evs = { built: 'test', sources: ['fr'], symbols: {} }; let n = 0; for (let s = 0; s < 60; s++) { const list = []; for (let i = 40 + (s % 7); i < 480; i += 63) { const kind = n++ % 3; list.push({ date: D[i], time: kind === 0 ? '10:30' : kind === 1 ? '17:45' : null, period: 'Q', src: kind === 2 ? 'bm' : 'fr' }); } evs.symbols['SYM' + s] = list; }
  const S = PD.study(lb, evs, { custom, params: { minWindow: 10, volx: 1.2 } }); const cov = S.coverage; const all = [...S.rows.primary.trades, ...S.rows.noVolume.trades, ...S.rows.baseRate.trades];
  assert(cov.used === 420 && cov.sameDay === 140 && cov.nextDay === 140 && cov.noTime === 140 && S.ranked > 350 && S.ranked < 420, `pead study: 420 reactions measured, mapping split 140 / 140 / 140, ${S.ranked} ranked (the first window has no decile)`);
  assert(all.length > 20 && all.every(t => pos[t.entryDate] === pos[t.R] + 1 && t.exitDate >= t.entryDate && Math.abs(t.stop - (t.entry - Math.max(2 * E.indicators.atr(lb.sym[t.sym], 14, pos[t.R]), t.entry * 0.02))) < 0.02 && t.stop <= t.entry * 0.98 + 1e-9 && Math.sign(t.Rm) === Math.sign(t.exit - t.entry) && (t.reason !== 'time' || t.bars === 20)), `pead study: ${all.length} trades enter at the next open, stop = 2 ATR below entry and never nearer than 2%, R-multiple signed like the P&L, time exits after exactly 20 bars`);
  const desk = S.rows.desk.trades; assert(desk.length > 0 && desk.length <= S.rows.primary.trades.length && desk.every(a => desk.filter(b => b !== a && b.entryDate <= a.entryDate && b.exitDate > a.entryDate).length < 4) && S.rows.info.hold10.n >= 0 && PD.verdict({ n: 10 }).result === 'insufficient' && PD.verdict({ n: 400, expectancy: 0.12, positiveYears: 7, yearsWith20: 9, maxYearShare: 0.3 }).result === 'pass' && PD.verdict({ n: 400, expectancy: 0.12, positiveYears: 4, yearsWith20: 9, maxYearShare: 0.3 }).result === 'fail', 'pead study: the desk row never has four positions open when it enters; verdict() applies the three written conditions and calls under 300 trades insufficient');
  const pdir = await fs.mkdtemp(path.join(os.tmpdir(), 'pead-')); await fs.mkdir(path.join(pdir, 'hist'), { recursive: true }); await fs.writeFile(path.join(pdir, 'hist', '2025.json'), JSON.stringify(synth(60, 500))); await fs.writeFile(path.join(pdir, 'events.json'), JSON.stringify(evs));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backtest-pead.mjs'), '--hist', path.join(pdir, 'hist'), '--events', path.join(pdir, 'events.json'), '--out', path.join(pdir, 'out'), '--no-members'], { encoding: 'utf8' });
  const pf = r.status === 0 ? await fs.readdir(path.join(pdir, 'out')) : []; const pmd = pf.length ? await fs.readFile(path.join(pdir, 'out', pf.find(f => f.endsWith('.md'))), 'utf8') : '';
  assert(r.status === 0 && pf.length === 2 && /## Verdict: \*\*INSUFFICIENT\*\*/.test(pmd) && /\| \*\*primary\*\*/.test(pmd) && /## Coverage/.test(pmd), 'backtest-pead.mjs runs end to end on synthetic history and events, writes the report and the JSON, and calls a short record insufficient' + (r.status ? '\n' + String(r.stderr).split('\n').slice(0, 6).join('\n') : ''));
  // 3h. PEAD as a portfolio (15 Nov 2026, reports/pead-portfolio-hypotheses-2026-11-15.md): the book over the study's trade list, the no-stop switch, the verdict, the script end to end
  { const PP = await import('./backtest-pead-portfolio.mjs'); const T = S.rows.primary.trades; const sim = PP.simulate(T, lb, { K: 5, capital: 500000 }); const st = PP.stats(sim);
    const lastE = sim.equity[sim.equity.length - 1]; const closed = sim.taken.filter(t => t.exitDate <= lastE.date), stillOpen = sim.taken.filter(t => t.exitDate > lastE.date);
    const expect = 500000 + closed.reduce((p, c) => p + c.pnl, 0) + lastE.invested - stillOpen.reduce((p, c) => p + c.qty * c.entry, 0);   // cash after every closed trade + what the open ones are marked at
    assert(st.n > 0 && st.n + sim.skipped.full + sim.skipped.cash + sim.skipped.price === T.length && sim.equity.every(e => e.positions <= 5) && sim.taken.every(t => t.qty >= 1 && t.qty * t.entry <= 500000 / 5 * 1.5) && Math.abs(st.final - expect) < 1, `pead portfolio: ${st.n} of ${T.length} trades taken, never more than K open, integer quantities within a slot, final value = capital + realised P&L + open positions at the last close (synthetic)`);
    const el = PP.simulate(T, lb, { K: 5, capital: 500000, elastic: true }); const win = PP.simulate(T, lb, { K: 5, capital: 500000, from: T[Math.floor(T.length / 2)].entryDate });
    assert(el.taken.length === T.length - el.skipped.price && el.skipped.full === 0 && win.taken.length < T.length && win.equity[0].date >= T[Math.floor(T.length / 2)].entryDate, 'pead portfolio: the elastic row takes every signal; --from drops the earlier entries and starts the curve there');
    const ns = PD.study(lb, evs, { custom, params: { minWindow: 10, volx: 1.2, noStop: true } }).rows.primary.trades; assert(ns.length === T.length && ns.every(t => t.reason === 'time' || t.reason === 'end of data') && ns.every((t, i) => t.sym === T[i].sym && t.entryDate === T[i].entryDate && t.stop === T[i].stop), 'pead noStop: the same trades, the same stop level for R, exits only at the 20th bar');
    const good = { n: 400, cagr: 0.16, sharpe: 1.1, maxYearShare: 0.3, maxYear: '2020' }, idx = { covered: true, cagr: 0.12, sharpe: 0.8 };
    assert(PP.verdict({ n: 100 }, idx).result === 'insufficient' && PP.verdict(good, null).result === 'insufficient' && PP.verdict(good, idx).result === 'pass' && PP.verdict({ ...good, cagr: 0.139 }, idx).result === 'fail' && PP.verdict({ ...good, sharpe: 0.8 }, idx).result === 'fail' && PP.verdict({ ...good, maxYearShare: 0.41 }, idx).result === 'fail', 'pead portfolio verdict(): CAGR + 2 points over the index, a higher Sharpe and the 40% year cap; no index series = insufficient');
    const r2 = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backtest-pead-portfolio.mjs'), '--hist', path.join(pdir, 'hist'), '--events', path.join(pdir, 'events.json'), '--out', path.join(pdir, 'out2'), '--no-members', '--benchmarks', path.join(pdir, 'none')], { encoding: 'utf8' });
    const pf2 = r2.status === 0 ? await fs.readdir(path.join(pdir, 'out2')) : []; const md2 = pf2.length ? await fs.readFile(path.join(pdir, 'out2', pf2.find(f => f.endsWith('.md'))), 'utf8') : '';
    assert(r2.status === 0 && pf2.length === 2 && /## Verdict: \*\*INSUFFICIENT\*\*/.test(md2) && /\| \*\*primary\*\*: K = 30/.test(md2) && /## By year/.test(md2), 'backtest-pead-portfolio.mjs runs end to end on synthetic history and events, writes the report and the JSON, and is insufficient without an index series' + (r2.status ? '\n' + String(r2.stderr).split('\n').slice(0, 6).join('\n') : '')); } }

// 4. appendSnapshotToHistory keeps arrays aligned
const f2 = { year: 2026, dates: [], symbols: {}, index: null }; E.appendSnapshotToHistory(f2, doc); E.appendSnapshotToHistory(f2, { date: '2026-10-15', rows: { KOTAKBANK: [1, 2, 0.5, 1, 1.5, 0, 0, 10, 1, null, null, null] }, index: null });
assert(f2.dates.join() === '2026-10-15,2026-10-16' && f2.symbols.KOTAKBANK.c.join() === '1.5,450.3' && f2.symbols.BHARTIARTL.c[0] === null, 'history append aligns dates and pads gaps');

// 5. parsers still accept the NSE CSV
const csv = '"SYMBOL \\n","OPEN \\n","HIGH \\n","LOW \\n","PREV. CLOSE \\n","LTP \\n","INDICATIVE CLOSE \\n","CHNG \\n","%CHNG \\n","VOLUME \\n(shares)","VALUE \\n(₹ Crores)","52W H \\n","52W L \\n","30 D   %CHNG \\n","365 D % CHNG \\n 16-Oct-2025"\n"TECHM","1,712.00","1,767.00","1,690.10","1,650.00","1,760.10","-","110.10","6.67","90,19,758","1,561.08","1,854.00","1,304.10","13.04","5.2"\n"TCS","2,382.00","2,434.00","2,375.70","2,350.00","2,428.60","-","78.60","3.34","36,08,975","871.28","3,350.00","1,976.80","10.98","1"\n';
const c = E.parseAny(csv); assert(c.length === 2 && c[0].h52 === 1854 && c[0].d30 === 13.04, 'CSV parsed with 52W and 30D columns');

// 6. end-to-end backtest on the synthetic history
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'swing-')); await fs.mkdir(path.join(tmp, 'hist')); await fs.writeFile(path.join(tmp, 'hist', '2025.json'), JSON.stringify(hf));
const bt = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backtest.mjs'), '--hist', path.join(tmp, 'hist'), '--out', path.join(tmp, 'out'), '--set', 'warmup=60'], { encoding: 'utf8' });
assert(bt.status === 0 && /Overall/.test(bt.stdout), 'backtest runs end to end on synthetic history' + (bt.status ? '\n' + bt.stderr : ''));
const rep = JSON.parse(await fs.readFile(path.join(tmp, 'out', (await fs.readdir(path.join(tmp, 'out'))).find(f => f.endsWith('.json'))), 'utf8'));
assert(rep.trades.length > 0 && rep.trades.every(t => typeof t.R === 'number'), `backtest produced ${rep.trades.length} trades (synthetic data — numbers are meaningless)`);
{ const bt2 = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backtest.mjs'), '--hist', path.join(tmp, 'hist'), '--out', path.join(tmp, 'out2'), '--set', 'warmup=60', '--set', 'exit=ma10', '--set', 'sectorBump=0', '--set', 'volumeBump=0'], { encoding: 'utf8' });
  const rep2 = bt2.status === 0 ? JSON.parse(await fs.readFile(path.join(tmp, 'out2', (await fs.readdir(path.join(tmp, 'out2'))).find(f => f.endsWith('.json'))), 'utf8')) : null;
  assert(rep2 && rep2.params.exit === 'ma10' && !('time stop' in rep2.byReason) && Object.keys(rep2.byReason).some(k => /10-day/.test(k)), 'backtest variants: ma10 exit replaces the time stop' + (bt2.status ? '\n' + bt2.stderr : ''));
  assert(rep2 && rep2.trades.every(t => t.score <= 85), 'backtest variants: score bumps removed (no trade can exceed 50+10+10+10+5)'); }
// 6a. regime gate and close fill (6 Nov 2026): defaults off; gated trades only on gate-open signal days; close fills at the signal day's close
{ const runBt = async (name, extra) => { const b = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backtest.mjs'), '--hist', path.join(tmp, 'hist'), '--out', path.join(tmp, name), '--set', 'warmup=60', ...extra], { encoding: 'utf8' });
    return b.status === 0 ? JSON.parse(await fs.readFile(path.join(tmp, name, (await fs.readdir(path.join(tmp, name))).find(f => f.endsWith('.json'))), 'utf8')) : { failed: b.status }; };
  const pos = Object.fromEntries(bars.dates.map((d, i) => [d, i])); const ic = bars.index.c; const avg = (n, i) => ic.slice(i - n + 1, i + 1).reduce((p, c) => p + c, 0) / n;
  assert(rep.params.gate === 0 && rep.params.fill === 'next' && !rep.gate, 'backtest defaults: no gate, buy-stop next day');
  const g = await runBt('out3', ['--set', 'gate=50']);
  assert(g.trades && g.gate && g.gate.open > 0 && g.gate.closed > 0 && g.gate.skipped > 0, `backtest gate: open on ${g.gate && g.gate.open} days, closed on ${g.gate && g.gate.closed}, ${g.gate && g.gate.skipped} signals not ordered`);
  assert(g.trades && g.trades.length > 0 && g.trades.every(t => { const k = pos[t.entryDate] - 1; return ic[k] > avg(50, k); }), 'backtest gate: every trade was signalled on a day the index closed above its own 50-day average (independent check)');
  const cl = await runBt('out4', ['--set', 'fill=close']);
  assert(cl.trades && cl.trades.length > 0 && cl.trades.every(t => t.entry === bars.sym[t.sym].c[pos[t.entryDate]]), 'backtest fill=close: every entry is the close of its entry date');
  assert(rep.trades.every(t => { const B = bars.sym[t.sym], k = pos[t.entryDate]; return t.entry <= B.h[k] && t.entry >= B.l[k]; }) && rep.trades.some(t => t.entry !== bars.sym[t.sym].c[pos[t.entryDate]]), 'backtest fill=next: entries sit inside the next day\'s range and are not simply its close');
  const bad = await runBt('out5', ['--set', 'fill=open']); assert(bad.failed === 2, 'backtest rejects an unknown fill mode');
  // 6a3. momentum universe (12 Nov 2026): orders only for names ranked ≤ N by momentum.js at the signal day's close; nothing before the ranking exists
  const u = await runBt('out6', ['--set', 'universe=momentum:10']);
  const rankOn = (sym, i) => { const r = M.rankAt(bars, i, {}, custom).ranked.find(x => x.sym === sym); return r ? r.rank : null; };
  assert(u.trades && u.universe && u.universe.kept > 0 && u.universe.dropped > 0 && u.universe.firstDefined, `backtest universe=momentum:10: ${u.universe && u.universe.kept} signals kept, ${u.universe && u.universe.dropped} dropped, ranking first defined ${u.universe && u.universe.firstDefined}`);
  assert(u.trades.length > 0 && u.trades.length < rep.trades.length && u.trades.every(t => { const k = pos[t.entryDate] - 1; const rk = rankOn(t.sym, k); return rk != null && rk <= 10 && bars.dates[k] >= u.universe.firstDefined; }), 'backtest universe=momentum:10: every trade was signalled on a day its symbol ranked in the momentum top 10 (independent check), none before the ranking existed');
  const badU = await runBt('out7', ['--set', 'universe=sector']); assert(badU.failed === 2, 'backtest rejects an unknown universe'); }

// 6a2. the momentum backtest script runs end to end and writes its report (6 Nov 2026: it had `const OUT` behind a // comment and died at the write; pairs retired 12 Nov 2026)
for (const [script, prefix] of [['backtest-momentum.mjs', 'momentum-']]) { const out = path.join(tmp, 'out-' + prefix.replace('-', ''));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), '--hist', path.join(tmp, 'hist'), '--out', out], { encoding: 'utf8' });
  const written = r.status === 0 ? await fs.readdir(out).catch(() => []) : [];
  assert(r.status === 0 && written.some(f => f.startsWith(prefix) && f.endsWith('.md')) && written.some(f => f.startsWith(prefix) && f.endsWith('.json')), `${script} runs end to end and writes its report` + (r.status ? '\n' + String(r.stderr).split('\n').slice(0, 6).join('\n') : '')); }

// 6a4. benchmarks (12 Nov 2026): niftyindices.com total-return files stitched by scripts/benchmarks.mjs and reported by backtest-momentum.mjs --benchmarks
{ const BM = await import('./benchmarks.mjs'); const D = bars.dates; const n = D.length; const tr = k => +(1000 * Math.pow(1.001, k)).toFixed(2);   // a known curve: +0.1% a day
  const site = d => { const [y, m, dd] = d.split('-'); return `${dd} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]} ${y}`; };   // the site's "12 Jun 2018"
  const file = (name, lo, hi, ntr) => [`"IndexName","Date","Total Returns Index"${ntr ? ',"Net Total Return Index"' : ''}`, ...D.slice(lo, hi + 1).map((d, j) => `"${name}","${site(d)}","${tr(lo + j)}"${ntr ? `,"${(tr(lo + j) * 0.98).toFixed(2)}"` : ''}`).reverse()].join('\r\n') + '\r\n';   // newest first, CRLF, like the download
  const mid = Math.floor(n / 2); const bdir = path.join(tmp, 'bench'); await fs.mkdir(bdir);
  await fs.writeFile(path.join(bdir, 'TEST 50_Historical_TR_a.csv'), file('TEST 50', 0, mid, true)); await fs.writeFile(path.join(bdir, 'TEST 50_Historical_TR_b.csv'), file('TEST 50', mid, n - 1, true));   // the two files share the day `mid`
  await fs.writeFile(path.join(bdir, 'TEST MOMENTUM 30_Historical_TR_a.csv'), file('TEST MOMENTUM 30', 0, n - 1, false));
  assert(BM.isoDate('12 Jun 2018') === '2018-06-12' && BM.isoDate('05-Sep-2020') === '2020-09-05' && BM.isoDate('2021-01-04') === '2021-01-04' && BM.isoDate('Jun 2018') === null, 'benchmarks: the site\'s date form, dashed and ISO dates parse; junk is null');
  const S = await BM.loadBenchmarks(bdir); const T = S['TEST 50'], TM = S['TEST MOMENTUM 30'];
  assert(Object.keys(S).length === 2 && T && T.files === 2 && T.dates.length === n && T.dates[0] === D[0] && T.dates[n - 1] === D[n - 1] && T.dates.every((d, k) => d === D[k]) && !T.gaps.length, `benchmarks: two files stitched into one ascending series of ${T && T.dates.length} days, overlap day deduplicated, no gaps`);
  assert(T.tr[0] === tr(0) && T.tr[mid] === tr(mid) && T.tr[n - 1] === tr(n - 1) && T.ntr && Math.abs(T.ntr[mid] - tr(mid) * 0.98) < 0.01 && TM.files === 1 && TM.ntr === null, 'benchmarks: TR values land on their dates, Net TR kept where the file has it and null for an index without the column');
  const w = BM.windowStats(T, D[10], D[n - 1]); const exp = tr(n - 1) / tr(10) - 1;
  assert(w.covered && w.days === n - 10 && Math.abs(w.totalReturn - exp) < 1e-9 && Math.abs(w.cagr - (Math.pow(1 + exp, 250 / (n - 11)) - 1)) < 1e-9 && w.maxDrawdown === 0 && w.sharpe > 0, `benchmarks: window stats on a rising curve — total ${(w.totalReturn * 100).toFixed(2)}% as expected, zero drawdown`);
  const by = BM.byYear(T, D[10], D[n - 1]); const yrs = Object.keys(by); const chained = yrs.reduce((p, y) => p * (1 + by[y].ret), 1) - 1;
  assert(yrs.length === 2 && yrs[0] === '2025' && yrs[1] === '2026' && Math.abs(chained - exp) < 1e-9 && by['2026'].start === by['2025'].end, 'benchmarks: calendar-year returns chain to the window total and hand over at the year end');
  assert(BM.windowStats(T, '2010-01-01', D[5]).covered === false && BM.windowStats(TM, D[0], D[n - 1], 'ntr') === null && BM.valueAt(T, D[3]) === tr(3) && BM.valueAt(T, '2010-01-01') === null, 'benchmarks: a window before the series, or a missing Net TR column, is reported as not covered rather than as a number');
  await fs.writeFile(path.join(bdir, 'TEST 50_Historical_TR_c.csv'), file('TEST 50', mid, mid, true).replace(tr(mid).toString(), (tr(mid) + 1).toString()));
  assert(await BM.loadBenchmarks(bdir).then(() => false, e => /differs between files/.test(e.message)), 'benchmarks: two files that disagree about a day stop the load');
  await fs.unlink(path.join(bdir, 'TEST 50_Historical_TR_c.csv'));
  const out = path.join(tmp, 'out-momentum-bm'); const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backtest-momentum.mjs'), '--hist', path.join(tmp, 'hist'), '--out', out, '--benchmarks', bdir], { encoding: 'utf8' });
  const files = r.status === 0 ? await fs.readdir(out) : []; const md = files.length ? await fs.readFile(path.join(out, files.find(f => f.endsWith('.md'))), 'utf8') : ''; const js = files.length ? JSON.parse(await fs.readFile(path.join(out, files.find(f => f.endsWith('.json'))), 'utf8')) : null;
  assert(r.status === 0 && /\| TEST 50 \(total return index\) \| — \| [\d.]+% \| [\d.]+% \| — \| 0\.0% \|/.test(md) && /\| year \| fixed slots \| reinvested \| Nifty 50 \| TEST 50 TR \| TEST Momentum 30 TR \|/.test(md) && /## Against NSE's own indices/.test(md) && /\*\*TEST MOMENTUM 30\*\* — /.test(md), 'backtest-momentum --benchmarks: a row per index in Overall, a column per index by year, and the comparison section' + (r.status ? '\n' + String(r.stderr).split('\n').slice(0, 6).join('\n') : ''));
  if (js) { const pos = Object.fromEntries(D.map((d, k) => [d, k])); const b0 = js.benchmarks[0]; const want = tr(pos[js.stats.end]) / tr(pos[js.stats.start]) - 1;
    assert(js.benchmarks.length === 2 && b0.name === 'TEST 50' && b0.window.start === js.stats.start && b0.window.end === js.stats.end && Math.abs(b0.window.totalReturn - want) < 1e-9 && Object.keys(b0.byYear).join() === Object.keys(js.stats.byYear).join(), `backtest-momentum --benchmarks: JSON carries each index measured over exactly the test window ${js.stats.start} → ${js.stats.end} (independent check), same years as the engine`); }
  const plain = JSON.parse(await fs.readFile(path.join(tmp, 'out-momentum', (await fs.readdir(path.join(tmp, 'out-momentum'))).find(f => f.endsWith('.json'))), 'utf8'));
  assert(!('benchmarks' in plain), 'backtest-momentum without --benchmarks: report unchanged (no benchmarks block)'); }

// 6a5. point-in-time membership (12 Nov 2026): scripts/membership.mjs parses NSE press releases, rebuilds the list backwards with checks; --members on both backtests
{ const MB = await import('./membership.mjs');
  assert(MB.isoDate('March 31, 2017') === '2017-03-31' && MB.isoDate('30-OCT-2019') === '2019-10-30' && MB.isoDate('12 June 2018') === '2018-06-12' && MB.fileDate('ind_prs16022017.pdf') === '2017-02-16' && MB.fileDate('ind_prs10082026_3') === '2026-08-10', 'membership: release-date forms and file-name dates parse');
  // a release in the site's layout: numbered sections, two tables, a wrapped company name, an effective date split across a line, a footnote and a page break inside a table
  const rel = ['                     PRESS RELEASE', 'Mumbai, February 16, 2025', '', '              Replacements in indices', 'The Index Maintenance Sub-Committee has decided to make the replacements listed hereunder. These changes shall become effective',
    'from March 28, 2025 (close of March 27, 2025).', '', '1)      NIFTY 50', 'The following company is being excluded:', '     Sr. No.     Company Name            Symbol', '       1      Old Co Ltd.               OLD', 'The following company is being included:',
    '       1      New Co Ltd.               NEW', '', '2)      NIFTY 500 Index', 'The following companies are being excluded:', '     Sr. No.     Company Name            Symbol', '       1      Alpha Industries Ltd.*                 ALPHA', '       2      Beta & Gamma Ltd.                      B&G',
    '* On account of proposed scheme of arrangement', 'The following companies are being included:', '     Sr. No.     Company Name            Symbol', '       1      8K Delta Ltd.                           8KDELTA', '       2      Johnson Controls - Hitachi Air Conditioning India', '              Ltd.',
    '                                                   3', '     Sr. No.     Company Name            Symbol', '       3      Epsilon Ltd.                            EPSILON', 'The above replacements will also be applicable to Nifty500 Multicap 50:25:25 index.', '', '3)      NIFTY Midcap 150',
    'The following companies are being excluded:', '       1      Alpha Industries Ltd.                  ALPHA'].join('\n');
  const P = MB.parseRelease(rel, 'ind_prs16022025.pdf');
  assert(P.released === '2025-02-16' && P.sections.length === 1 && P.sections[0].effective === '2025-03-28' && P.sections[0].excluded.map(r => r.sym).join() === 'ALPHA,B&G' && P.sections[0].included.map(r => r.sym).join() === '8KDELTA,EPSILON', `membership: one NIFTY 500 section, effective date across a line break, symbols with digits and ampersands, page break and footnote skipped (${P.sections[0] && P.sections[0].excluded.map(r => r.sym)} → ${P.sections[0] && P.sections[0].included.map(r => r.sym)})`);
  assert(P.sections[0].unread.length === 3 && P.sections[0].unread.some(l => /Johnson/.test(l)) && P.sections[0].unread.some(l => /^\* On account/.test(l)), 'membership: a wrapped name with no symbol on its line and a footnote are reported as unread, not silently dropped');
  const ch = MB.parseSymbolChanges('NAME OF THE COMPANY,OLD SYMBOL,NEW SYMBOL,EFFECTIVE DATE\n Nava Ltd,NBVENTURES,NAVA,29-JUL-2022\n Some MF,RDAX,NDAX,30-OCT-2019\n Twice Ltd,ONE,TWO,01-JAN-2018\n Twice Ltd,TWO,THREE,01-JAN-2020\n');
  assert(MB.canonical('NBVENTURES', '2017-03-31', ch).sym === 'NAVA' && MB.canonical('NBVENTURES', '2023-01-01', ch).sym === 'NBVENTURES' && MB.canonical('ONE', '2017-01-01', ch).sym === 'THREE' && MB.canonical('ONE', '2019-01-01', ch).sym === 'ONE' && MB.canonical('X', '2020-01-01', ch).sym === 'X', 'membership: renames follow the chain forward from the event date only');
  // end to end on a synthetic folder: three releases (one .txt, one rescheduled pair via an amend override, one ignored), renames from the override, today's list
  const mdir = path.join(tmp, 'members'); await fs.mkdir(path.join(mdir, 'src'), { recursive: true });
  const mk = (date, eff, exc, inc, extra = '') => [`PRESS RELEASE`, `Mumbai, ${date}`, `Replacements in indices`, `These changes shall become effective from ${eff}.`, extra, `1)  NIFTY 500`, `The following companies are being excluded:`, ...exc.map((s, i) => `   ${i + 1}   ${s} Ltd.      ${s}`), `The following companies are being included:`, ...inc.map((s, i) => `   ${i + 1}   ${s} Ltd.      ${s}`), ''].join('\n');
  await fs.writeFile(path.join(mdir, 'src', 'ind_prs15022025.txt'), mk('February 15, 2025', 'March 28, 2025 (close of March 27, 2025)', ['AAA', 'BBB'], ['CCC', 'DDD']));         // AAA/CCC rescheduled by the next file
  await fs.writeFile(path.join(mdir, 'src', 'ind_prs05032025.txt'), mk('March 05, 2025', 'March 12, 2025', ['AAA'], ['CCC']));
  await fs.writeFile(path.join(mdir, 'src', 'ind_prs20082025.txt'), mk('August 20, 2025', 'September 30, 2025', ['OLDNAME', 'DDD'], ['EEE']));                                   // OLDNAME leaves under its old symbol
  await fs.writeFile(path.join(mdir, 'src', 'ind_prs01102025.txt'), mk('October 01, 2025', 'October 10, 2025', ['ZZZ'], ['YYY']));                                                 // ignored by override
  await fs.writeFile(path.join(mdir, 'src', 'symbolchange.csv'), 'NAME OF THE COMPANY,OLD SYMBOL,NEW SYMBOL,EFFECTIVE DATE\n CCC Ltd,CCC,CCX,01-JUN-2025\n');
  await fs.writeFile(path.join(mdir, 'overrides.json'), JSON.stringify({ renames: [{ from: 'OLDNAME', to: 'RENAMED', date: '2025-09-01', why: 'test' }], 'ind_prs15022025.pdf': { note: 'rescheduled', amend: { excluded: { remove: ['AAA'] }, included: { remove: ['CCC'] } } }, 'ind_prs01102025.pdf': { note: 'void', ignore: true } }));
  const run = async (name, extra = []) => { const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'membership.mjs'), '--src', path.join(mdir, 'src'), '--overrides', path.join(mdir, 'overrides.json'), '--out', path.join(mdir, name + '.json'), '--report', path.join(mdir, name + '.md'), '--asof', '2025-11-12', ...extra], { encoding: 'utf8' });
    return { status: r.status, out: r.stdout + r.stderr, M: await fs.readFile(path.join(mdir, name + '.json'), 'utf8').then(JSON.parse, () => null), md: await fs.readFile(path.join(mdir, name + '.md'), 'utf8').catch(() => '') }; };
  await fs.writeFile(path.join(mdir, 'src', 'ind_nifty500list.csv'), 'Company Name,Industry,Symbol,Series,ISIN Code\nCCX,x,CCX,EQ,2\nE,x,EEE,EQ,3\nF,x,FFF,EQ,4\n');   // today: CCX, EEE, FFF (AAA, BBB, DDD and OLDNAME — now RENAMED — have left)
  const ok = await run('good');
  assert(ok.status === 0 && ok.M && ok.M.events.length === 3 && ok.M.events.map(e => e.date).join() === '2025-03-12,2025-03-28,2025-09-30' && /all clean/.test(ok.md), `membership rebuild: three events in effective-date order (ignored file dropped, rescheduled pair not double-counted), checks clean` + (ok.status ? '\n' + ok.out.split('\n').slice(-6).join('\n') : ''));
  const iv = ok.M ? ok.M.symbols : {};
  assert(ok.M && iv.AAA && iv.AAA[0][1] === '2025-03-12' && iv.BBB && iv.BBB[0][1] === '2025-03-28' && iv.AAA[0][0] === null && iv.CCX && iv.CCX[0][0] === '2025-03-12' && iv.CCX[0][1] === null && iv.DDD && iv.DDD[0][0] === '2025-03-28' && iv.DDD[0][1] === '2025-09-30' && iv.RENAMED && iv.RENAMED[0][0] === null && iv.RENAMED[0][1] === '2025-09-30' && iv.FFF[0][0] === null && iv.FFF[0][1] === null && !('OLDNAME' in iv) && !('CCC' in iv), 'membership rebuild: intervals — AAA out 12 Mar, BBB out 28 Mar, CCC→CCX in from 12 Mar and still in, DDD in 28 Mar out 30 Sep, OLDNAME keyed as RENAMED, FFF never changed');
  assert(ok.M && MB.memberOn(ok.M, 'DDD', '2025-05-01') && !MB.memberOn(ok.M, 'DDD', '2025-09-30') && !MB.memberOn(ok.M, 'DDD', '2025-03-27') && MB.membersOn(ok.M, '2025-11-12').sort().join() === 'CCX,EEE,FFF' && MB.membershipFilter(ok.M)('AAA', '2020-01-01') === true && MB.membershipFilter(ok.M)('EEE', '2020-01-01') === false && MB.memberOn(ok.M, 'AAA', '2025-03-11') && !MB.memberOn(ok.M, 'AAA', '2025-03-12'), 'membership lookups: memberOn is [from, to), membersOn today equals the list, dates before the first event use the earliest list');
  // a broken source: CCX excluded in June although it is in today's list and never re-included; DDD included a second time without leaving in between → both checks fail and the exit status says so
  await fs.writeFile(path.join(mdir, 'src', 'ind_prs15062025.txt'), mk('June 15, 2025', 'June 30, 2025', ['CCX'], ['DDD']));
  const bad = await run('bad'); assert(bad.status === 1 && /\*\*3 problems\*\*/.test(bad.md) && /CCX \| excluded here yet a member afterwards/.test(bad.md) && /DDD \| included here but not a member afterwards/.test(bad.md), 'membership rebuild: an exclusion contradicted by a later membership and a double inclusion are reported as problems and fail the run'); await fs.unlink(path.join(mdir, 'src', 'ind_prs15062025.txt'));
  // --members on both backtests: a synthetic list in which S1 leaves half way and S2 joins half way; the engines must never enter a non-member
  const D = bars.dates; const mid = D[Math.floor(D.length / 2)]; const syms = Object.keys(bars.sym); const memb = { asOf: D[D.length - 1], from: D[0], events: [{ date: mid, file: 'synthetic', add: ['S2'], drop: ['S1'] }], symbols: {} };
  for (const s of syms) memb.symbols[s] = s === 'SYM1' ? [[null, mid]] : s === 'SYM2' ? [[mid, null]] : [[null, null]]; delete memb.symbols.SYM3;   // SYM3 was never a member
  await fs.writeFile(path.join(mdir, 'synthetic.json'), JSON.stringify(memb));
  const mm = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backtest-momentum.mjs'), '--hist', path.join(tmp, 'hist'), '--out', path.join(tmp, 'out-momentum-members'), '--members', path.join(mdir, 'synthetic.json')], { encoding: 'utf8' });
  const mmf = mm.status === 0 ? await fs.readdir(path.join(tmp, 'out-momentum-members')) : []; const mmj = mmf.length ? JSON.parse(await fs.readFile(path.join(tmp, 'out-momentum-members', mmf.find(f => f.endsWith('.json'))), 'utf8')) : null;
  assert(mm.status === 0 && mmf.some(f => /-members\.md$/.test(f)) && mmj && mmj.membership && mmj.membership.everMembers === syms.length - 1 && mmj.membership.barsNotMembers === 1, 'backtest-momentum --members: report gets the -members suffix and the membership block' + (mm.status ? '\n' + String(mm.stderr).split('\n').slice(0, 6).join('\n') : ''));
  assert(mmj && mmj.trades.length > 0 && mmj.trades.every(t => t.sym !== 'SYM3' && !(t.sym === 'SYM1' && t.entryDate >= mid) && !(t.sym === 'SYM2' && t.entryDate < mid)), `backtest-momentum --members: ${mmj && mmj.trades.length} trades, none entered in a non-member (SYM3 never, SYM1 after it left, SYM2 before it joined)`);
  { const flt = MB.membershipFilter(memb); const i0 = D.indexOf(mid) - 1, i1 = D.indexOf(mid) + 1; const before = M.rankAt(bars, i0, {}, custom, flt).universe.map(r => r.sym), after = M.rankAt(bars, i1, {}, custom, flt).universe.map(r => r.sym); const plain = M.rankAt(bars, i1, {}, custom).universe.map(r => r.sym);
    assert(before.includes('SYM1') && !before.includes('SYM2') && !after.includes('SYM1') && after.includes('SYM2') && !before.includes('SYM3') && !after.includes('SYM3') && plain.includes('SYM3') && plain.length === after.length + 2, 'momentum rankAt filter: SYM1 ranked only before it left, SYM2 only after it joined, SYM3 never; the unfiltered ranking sees all three');
    const sa = E.analyzeAt(bars, i1, { settings: {}, custom, filter: flt }).universe.map(r => r.sym), sp = E.analyzeAt(bars, i1, { settings: {}, custom }).universe.map(r => r.sym);
    assert(!sa.includes('SYM1') && !sa.includes('SYM3') && sa.includes('SYM2') && sp.includes('SYM1') && sp.length === sa.length + 2, 'engine analyzeAt filter: the day\'s universe (and so the sector board) holds only that day\'s members'); }
  const sm = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backtest.mjs'), '--hist', path.join(tmp, 'hist'), '--out', path.join(tmp, 'out-swing-members'), '--set', 'warmup=60', '--members', path.join(mdir, 'synthetic.json')], { encoding: 'utf8' });
  const smf = sm.status === 0 ? await fs.readdir(path.join(tmp, 'out-swing-members')) : []; const smj = smf.length ? JSON.parse(await fs.readFile(path.join(tmp, 'out-swing-members', smf.find(f => f.endsWith('.json'))), 'utf8')) : null;
  assert(sm.status === 0 && smf.some(f => /-members\.json$/.test(f)) && smj && smj.params.members === true && smj.membership && smj.trades.length > 0 && smj.trades.every(t => t.sym !== 'SYM3' && !(t.sym === 'SYM1' && t.entryDate > mid) && !(t.sym === 'SYM2' && t.entryDate <= mid)), `backtest --members: ${smj && smj.trades.length} trades, none in a non-member, -members suffix, membership block` + (sm.status ? '\n' + String(sm.stderr).split('\n').slice(0, 6).join('\n') : ''));
  // backfill --members: a bhavcopy row is kept only for a ticker that was ever a member and is still missing that day, stored under today's ticker
  { const BF = await import('./backfill.mjs'); const row = (sym, c) => ({ sym, o: 1, h: 2, l: 1, c, v: 10, t: 1 });
    const r = BF.membersRows([row('BURGERKING', 1.5), row('NEVER', 1), row('HAVE', 1), row('ZERO', 0)], '2021-06-01', { ever: new Set(['RBA', 'HAVE', 'ZERO']), canon: (sym, d) => ({ sym: sym === 'BURGERKING' && d < '2022-02-14' ? 'RBA' : sym }), has: sym => sym === 'HAVE' });
    assert(Object.keys(r.rows).join() === 'RBA' && r.rows.RBA[4] === 1.5 && r.renamed === 1, 'backfill --members: BURGERKING stored as RBA, a never-member dropped, a ticker already saved that day skipped, a zero close skipped'); }
  // stale exit: a holding whose bars stop is closed after 20 missing closes, only when opts.stale is set
  { const lb = E.buildBars([synth(60, 400)], []); const first = M.simulate(lb, { topN: 5 }, custom, { capital: 500000 }); const held = first.trades[0] && first.trades[0].sym; const k0 = lb.dates.indexOf(first.trades[0].entryDate) + 2;
    const cut = JSON.parse(JSON.stringify(synth(60, 400))); for (let k = k0; k < k0 + 60; k++) for (const key of ['o', 'h', 'l', 'c']) cut.symbols[held][key][k] = null;   // 60 bars of nothing
    const hb = E.buildBars([cut], []); const on = M.simulate(hb, { topN: 5 }, custom, { capital: 500000, stale: 20 }); const off = M.simulate(hb, { topN: 5 }, custom, { capital: 500000 });
    const st = on.trades.find(t => t.sym === held && t.reason === 'stopped trading');
    assert(st && lb.dates.indexOf(st.exitDate) === k0 + 19 && !off.trades.some(t => t.reason === 'stopped trading'), `momentum stale exit: ${held} closed as "stopped trading" on the 20th missing bar with opts.stale=20, never without it`); } }

// 6b. corporate actions: purpose parsing, verification against bars, and application at load (compounding, raw files untouched)
{ const CA = await import('./corporate-actions.mjs');
  const P = CA.parsePurpose;
  assert(P('Bonus 1:1').factor === 2 && P('Bonus 3:2').factor === 2.5 && P('Bonus 1:1').type === 'bonus', 'bonus a:b → (a+b)/b');
  assert(P('Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 2/- Per Share').factor === 5 && P('Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 2/- Per Share').type === 'split', 'split From Rs X To Rs Y → X/Y');
  assert(Math.abs(P('Consolidation of Shares - From Re 1/- Per Share To Rs 10/- Per Share').factor - 0.1) < 1e-9, 'consolidation → below 1');
  assert(P('Bonus 1:1 and Face Value Split From Rs 10 To Rs 5').factor === 4, 'bonus and split in one line compound');
  assert(P('Dividend - Rs 5 Per Share').factor === 1 && P('Dividend - Rs 5 Per Share').type === 'dividend' && P('Rights 1:4 @ Premium Rs 50').type === 'rights' && P('Scheme of Arrangement').type === 'demerger', 'dividends, rights and demergers are not price factors');
  assert(CA.isoDate('16-Sep-2021') === '2021-09-16' && CA.isoDate('16-SEP-2021') === '2021-09-16' && CA.isoDate('2021-09-16') === '2021-09-16' && CA.isoDate('16/09/2021') === '2021-09-16' && CA.isoDate('') === null, 'NSE date forms → ISO');
  assert(JSON.stringify(CA.parseCSV('SYMBOL,"PURPOSE",EX-DATE\r\nABC,"Bonus 1:1, plus text",16-Sep-2021\n')) === JSON.stringify([['SYMBOL', 'PURPOSE', 'EX-DATE'], ['ABC', 'Bonus 1:1, plus text', '16-Sep-2021']]), 'CSV with quoted commas');
  // synthetic bars: ABC trades at 100 until a 1:1 bonus on day 10 (then 50), and splits 10→2 on day 20 (then 10); XYZ has no gap
  const dates = []; const d0 = new Date('2025-01-01T00:00:00Z'); while (dates.length < 30) { if (d0.getUTCDay() % 6) dates.push(d0.toISOString().slice(0, 10)); d0.setUTCDate(d0.getUTCDate() + 1); }
  const px = i => i < 10 ? 100 : i < 20 ? 50 : 10; const abc = { o: dates.map((_, i) => px(i)), h: dates.map((_, i) => px(i) * 1.01), l: dates.map((_, i) => px(i) * 0.99), c: dates.map((_, i) => px(i)), v: dates.map(() => 1000), t: dates.map((_, i) => px(i) * 1000 / 1e7) };
  const xyz = { o: dates.map(() => 40), h: dates.map(() => 41), l: dates.map(() => 39), c: dates.map(() => 40), v: dates.map(() => 500), t: dates.map(() => 0.002) };
  const hf = { year: 2025, dates, symbols: { ABC: abc, XYZ: xyz }, index: null };
  const raw = E.buildBars([hf], []);
  const rows = [{ symbol: 'ABC', exDate: dates[10], purpose: 'Bonus 1:1' }, { symbol: 'ABC', exDate: dates[20], purpose: 'Face Value Split (Sub-Division) - From Rs 10/- Per Share To Rs 2/- Per Share' }, { symbol: 'XYZ', exDate: dates[15], purpose: 'Bonus 1:1' }, { symbol: 'ABC', exDate: '2024-06-01', purpose: 'Bonus 1:2' }, { symbol: 'ABC', exDate: '2027-01-05', purpose: 'Bonus 1:1' }, { symbol: 'NOPE', exDate: dates[5], purpose: 'Bonus 1:1' }, { symbol: 'ABC', exDate: dates[12], purpose: 'Dividend - Rs 2 Per Share' }, { symbol: 'XYZ', exDate: dates[3], purpose: 'Scheme of Arrangement' }];
  const T = CA.buildTable(rows, raw, true);
  assert(T.counts.parsed === 5 && T.counts.applied === 2 && T.counts.rejected === 1 && T.counts.unchecked === 1 && T.dropped.length === 1 && !T.symbols.NOPE, `verified 2, rejected 1 (XYZ has no gap), 1 after the last bar kept, 1 before the start dropped, unknown symbol ignored (${JSON.stringify(T.counts)})`);
  assert(T.symbols.ABC.length === 3 && T.symbols.ABC[0].apply && T.symbols.ABC[0].observed === 2 && T.symbols.ABC[1].apply && T.symbols.ABC[1].observed === 5 && T.symbols.ABC[2].apply && T.symbols.ABC[2].observed == null, 'ABC: bonus observed 2, split observed 5, future bonus kept unverified');
  assert(T.symbols.XYZ[0].apply === false && Math.abs(T.symbols.XYZ[0].observed - 1) < 0.1 && T.unhandled.demerger && T.unhandled.demerger.length === 1 && !T.unhandled.dividend, 'XYZ bonus rejected (observed ≈ 1); demerger listed as unhandled; dividends not listed');
  const adj = E.buildBars([hf], [], { adjustments: { symbols: T.symbols } });
  assert(adj.adjusted.events === 2 && adj.adjusted.symbols === 1 && adj.sym.ABC.c.every(c => Math.abs(c - 10) < 1e-6) && adj.sym.ABC.v[0] === 10000 && adj.sym.ABC.v[15] === 5000 && adj.sym.ABC.v[25] === 1000 && adj.sym.ABC.t[0] === abc.t[0], 'applied at load: ABC continuous at 10 across both events (factors compound), volume scaled, turnover unchanged; the event after the last bar waits');
  assert(raw.sym.ABC.c[0] === 100 && hf.symbols.ABC.c[0] === 100 && adj.sym.XYZ.c[0] === 40, 'the raw history object and the unadjusted bars are untouched; rejected events are not applied');
  const res2 = E.analyzeLatest([hf], [], E.DEFAULTS, {}, { symbols: T.symbols }); assert(res2.bars.adjusted && res2.bars.adjusted.events === 2, 'analyzeLatest passes adjustments through'); }

// 6c. reminders: due on the date and for a week after; monthly / quarterly repeats; surfaced in the digest
{ const R = [{ date: '2026-11-13', text: 'digest still late?' }, { date: '2026-12-01', text: 'monthly re-run', repeat: 'monthly' }, { date: '2027-01-05', text: 'quarterly corporate actions', repeat: 'quarterly' }, { date: '2026-10-01', text: 'old one-off' }];
  assert(E.remindersDue(R, '2026-11-12') === null, 'nothing due the day before');
  assert(/digest still late/.test(E.remindersDue(R, '2026-11-13')) && /digest still late/.test(E.remindersDue(R, '2026-11-19')) && E.remindersDue(R, '2026-11-20') === null, 'a one-off is due on its date and for seven days');
  assert(/2027-03-01 \(monthly\)/.test(E.remindersDue(R, '2027-03-04')) && /2027-04-05 \(quarterly\)/.test(E.remindersDue(R, '2027-04-05')) && !/old one-off/.test(E.remindersDue(R, '2027-04-05')), 'repeats roll forward by month / quarter; an old one-off stays silent');
  assert(E.remindersDue([], '2026-11-13') === null && E.remindersDue(undefined, '2026-11-13') === null, 'no list → no block');
  const d = E.digest(res, E.DEFAULTS, { reminders: E.remindersDue(R, '2026-11-13') }); assert(/DESK CHECKS DUE/.test(d) && d.indexOf('DESK CHECKS DUE') > d.indexOf('WATCH'), 'digest carries the reminders block after the lists'); }

// 7. digest: watch mode leads with momentum and lists setups without quantities; orders mode is unchanged
{ const blocks = { momentum: 'MOMENTUM (test)\n• #1 X' };
  const w = E.digest(res, { ...E.DEFAULTS, swingMode: 'watch' }, blocks), o = E.digest(res, { ...E.DEFAULTS, swingMode: 'orders' }, blocks);
  assert(w.indexOf('MOMENTUM (') < w.indexOf('MOMENTUM PULLBACKS') && w.indexOf('MOMENTUM PULLBACKS') < w.indexOf('OTHER SWING SETUPS') && /levels to watch, not orders/.test(w) && !/ORDERS FOR TOMORROW/.test(w) && !/[^r] qty \d/.test(w), 'watch-mode digest: momentum list, then momentum pullbacks, then other setups as levels (no quantities except paper qty)');
  // 7a. momentum tagging (12 Nov 2026): pullbacks on names in the momentum top N are tagged, moved first and listed in their own digest block
  { const mk = (sym, setup, score, kind = 'act') => ({ sym, sector: 'S' + sym, kind, setup, score, entry: 100, stop: 95, target: 110, size: { qty: 7 }, row: { val: 1 }, reasons: [] });
    const sig = [mk('A', '52W breakout', 80), mk('B', 'Pullback buy', 60), mk('C', 'Pullback buy', 90), mk('D', 'Pullback buy', 70), mk('E', 'Pullback buy', 55, 'alert')];
    const n = E.tagMomentum(sig, [{ sym: 'B', rank: 3 }, { sym: 'A', rank: 10 }, { sym: 'D', rank: 31 }, { sym: 'E', rank: 1 }], 30);
    assert(n === 1 && sig.map(x => x.sym).join('') === 'BCADE' && sig[0].tag === 'momentum pullback' && sig[0].momRank === 3 && sig[2].momRank === 10 && !sig[2].tag && !sig[3].momRank && sig[4].tag && sig[4].kind === 'alert', `tagMomentum: B (pullback, rank 3) first and tagged; A (breakout, rank 10) ranked but not tagged; D (rank 31) untouched; order BCADE, ${n} act pullback tagged`);
    const d = E.digest({ signals: sig, reg: res.reg, board: res.board, date: '2026-11-12', coverage: 250 }, { ...E.DEFAULTS, swingMode: 'watch' }, {});
    const mp = d.slice(d.indexOf('MOMENTUM PULLBACKS'), d.indexOf('OTHER SWING SETUPS')), rest = d.slice(d.indexOf('OTHER SWING SETUPS'), d.indexOf('ALERTS'));
    assert(/MOMENTUM PULLBACKS \(1\)/.test(mp) && /• B \[60\] momentum #3 — buy-stop 100\.00 tomorrow, stop 95\.00, 2R at 110\.00, paper qty 7/.test(mp) && /OTHER SWING SETUPS \(3\)/.test(rest) && /• C \[90\]/.test(rest) && /• A \[80\] momentum #10 — 52W breakout/.test(rest) && !/• B /.test(rest), 'digest: tagged pullback in its own block with paper qty; breakout in the list shows its rank under other setups');
    E.tagMomentum(sig, [], 30); assert(sig.every(x => !x.tag && x.momRank == null) && sig.map(x => x.sym).join('') === 'CADBE', 'tagMomentum with an empty ranking clears tags and restores score order'); }
  assert(/ORDERS FOR TOMORROW/.test(o) && o.indexOf('ORDERS FOR TOMORROW') < o.indexOf('MOMENTUM') && !/SWING SETUPS/.test(o), 'orders-mode digest unchanged: orders first, then momentum');
  assert(E.DEFAULTS.swingMode === 'watch', 'swing engine is in watch mode by default (demoted 5 Nov 2026 — change only with a passing backtest)'); }
// 8. benchmark index closes (18 Nov 2026): the market-watch call wants NSE's short code, not the display name — with the display name it
//    answered {"data":{}} and no index-fund close was saved for the paper book's first three days. Shapes below are the ones NSE served on 18 Nov.
{ const list = { data: { 'Broad Market Indices': { 'NIFTY 50': 'NIFTY 50', 'NIFTY 500': 'NIFTY 500' }, 'Strategy Market Indices': { 'NIFTY200 MOMENTUM 30': 'NIFTY200MOMENTM30', 'NIFTY500 MOMENTUM 50': 'NIFTY500MOMENTM50', 'NIFTY ALPHA 50': 'NIFTY ALPHA 50' } } };
  assert(E.indexCode('NIFTY500 MOMENTUM 50', list) === 'NIFTY500MOMENTM50' && E.indexCode('NIFTY200 MOMENTUM 30', list) === 'NIFTY200MOMENTM30' && E.indexCode('NIFTY 500', list) === 'NIFTY 500', 'index code: display name → NSE short code from the index list');
  assert(E.indexCode('NIFTY500 MOMENTUM 50', null) === 'NIFTY500MOMENTM50' && E.indexCode('nifty200 momentum 30', {}) === 'NIFTY200MOMENTM30' && E.indexCode('NIFTY 50', null) === 'NIFTY 50' && E.indexCode('NIFTY500MOMENTM50', list) === 'NIFTY500MOMENTM50', 'index code: built-in codes when the list is unavailable; a broad index and a code map to themselves');
  const mk = (symbol, priority, lastPrice, previousClose) => ({ priority, symbol, identifier: symbol, open: lastPrice, dayHigh: lastPrice, dayLow: lastPrice, previousClose, lastPrice, change: 0, pChange: 0, totalTradedVolume: 1, totalTradedValue: 1, yearHigh: lastPrice, yearLow: lastPrice, perChange30d: 0, lastUpdateTime: '2026-11-18 16:00:00' });
  const payload = { data: { timestamp: '18-Nov-2026 16:00:00', data: [mk('NIFTY500 MOMENTUM 50', 1, 53815.15, 54135.7), ...Array.from({ length: 50 }, (_, k) => mk('STK' + k, 0, 100 + k, 100))] } };
  const bm = E.benchmarkClose(E.rowsFromNseApi(payload), 'NIFTY500 MOMENTUM 50');
  assert(bm && bm.close === 53815.15 && bm.prev === 54135.7, 'benchmark close: the index row of its own market-watch call gives the close and the previous close');
  assert(E.benchmarkClose(E.rowsFromNseApi({ data: {} }), 'NIFTY500 MOMENTUM 50') === null && E.benchmarkClose(E.rowsFromNseApi(payload), 'NIFTY200 MOMENTUM 30').close === 53815.15, 'benchmark close: an empty answer is null (no close saved); a lone index row is taken even if NSE renames it'); }

// 9. one Telegram message whenever possible (18 Nov 2026): the watch-only lists give way, momentum / paper book / pullbacks / reminders never do
{ const sig = []; const row = { val: 1 };
  for (let k = 0; k < 4; k++) sig.push({ sym: 'PB' + k, kind: 'act', setup: 'Pullback buy', tag: 'momentum pullback', momRank: k + 1, score: 60, entry: 100, stop: 95, target: 110, size: { qty: 7 }, row });
  for (let k = 0; k < 30; k++) sig.push({ sym: 'OTH' + k, kind: 'act', setup: '52W breakout', score: 70, entry: 100, stop: 95, target: 110, row });
  for (let k = 0; k < 30; k++) sig.push({ sym: 'ALR' + k, kind: 'alert', setup: '52W breakout', score: 70, trigger: 'Close above 123.45', row });
  for (let k = 0; k < 12; k++) sig.push({ sym: 'WAT' + k, kind: 'watch', setup: 'Sector leader', score: 70, trigger: 'Pullback that holds 1,091.95', row });
  const R = { signals: sig, reg: res.reg, board: res.board, date: '2026-11-17', time: '16:00', coverage: 250 }; const W = { ...E.DEFAULTS, swingMode: 'watch' };
  const d0 = E.digest(R, W, {});
  assert((d0.match(/^• WAT/gm) || []).length === 4 && /WATCH \(12\) — top 4/.test(d0) && (d0.match(/^• ALR/gm) || []).length === 4 && (d0.match(/^• OTH/gm) || []).length === 5, 'watch-mode digest: four watch lines, four alerts, five other setups by default');
  const pad = n => 'PAPER BOOK\n' + 'x'.repeat(n); const base = d0.length;
  const f0 = E.digestFit(R, W, { paper: pad(E.TELEGRAM_MAX - base - 30) });
  assert(f0.fits && f0.level === 0 && f0.text.length <= E.TELEGRAM_MAX, 'digestFit: a digest under the cap is returned untrimmed');
  const f1 = E.digestFit(R, W, { paper: pad(E.TELEGRAM_MAX - base + 100), reminders: 'DESK CHECKS DUE\n• check' });
  assert(f1.fits && f1.level > 0 && f1.text.length <= E.TELEGRAM_MAX && (f1.text.match(/^• PB/gm) || []).length === 4 && /DESK CHECKS DUE/.test(f1.text) && /PAPER BOOK/.test(f1.text) && (f1.text.match(/^• WAT/gm) || []).length < 4, `digestFit: a digest over the cap → lists trimmed to level ${f1.level}, one message of ${f1.text.length}; pullbacks, paper book and reminders intact`);
  const lens = E.DIGEST_CAPS.map(c => E.digest(R, W, { caps: c }).length); assert(lens.every((n, k) => !k || n < lens[k - 1]), `digest caps: each level is shorter than the one before (${lens.join(' > ')})`);
  const f3 = E.digestFit(R, W, { paper: pad(E.TELEGRAM_MAX - lens[2] + 20) });   // too long for level 2, fits level 3
  assert(f3.fits && f3.level === 3 && /ALERTS \(30\) — on the site/.test(f3.text) && /WATCH \(12\) — on the site/.test(f3.text) && !/^• (ALR|WAT)/m.test(f3.text), 'digestFit: at the last level alerts and watch are counts only');
  const f9 = E.digestFit(R, W, { paper: pad(E.TELEGRAM_MAX) });
  assert(!f9.fits && f9.level === 0 && f9.text.length > E.TELEGRAM_MAX && (f9.text.match(/^• WAT/gm) || []).length === 4 && E.chunks(f9.text, 4000).length > 1, 'digestFit: when nothing fits the untrimmed digest comes back and is split into parts');
  const o = E.digest(R, { ...E.DEFAULTS, swingMode: 'orders' }, {}); assert((o.match(/^• WAT/gm) || []).length === 8 && (o.match(/^• ALR/gm) || []).length === 8, 'orders-mode digest keeps eight alerts and eight watch lines'); }

// 10. discretionary book (18 Nov 2026): two open at most, half size, one sentence; the journal is read book by book in R
{ const S10 = { ...E.DEFAULTS, capital: 500000, riskPct: 1, maxPos: 25 }; const why = 'Order book doubled and the price has not moved.';
  const full = E.sizing(200, 190, null, S10).qty; const c = E.discretionaryCheck([], { entry: 200, stop: 190, why }, S10);
  assert(c.ok && c.maxQty === 250 && full === 500 && c.open === 0, `discretionary: half size is ${c.maxQty} shares where the rules would take ${full}`);
  assert(E.discretionaryCheck([], { entry: 2000, stop: 1990, why }, S10).maxQty === 31, 'discretionary: the position cap is halved too (12.5% of capital)');
  assert(!E.discretionaryCheck([], { entry: 200, stop: 190, qty: 251, why }, S10).ok && E.discretionaryCheck([], { entry: 200, stop: 190, qty: 250, why }, S10).ok, 'discretionary: a quantity above half size is refused');
  assert(!E.discretionaryCheck([], { entry: 200, stop: 190, why: 'hunch' }, S10).ok && !E.discretionaryCheck([], { entry: 200, stop: 190 }, S10).ok, 'discretionary: the sentence saying why is required');
  const J = [{ sym: 'AAA', setup: 'Discretionary', status: 'open', entry: 100, stop: 90, target: 120, qty: 10, date: '2026-11-18' }, { sym: 'BBB', setup: 'Discretionary', status: 'open', entry: 100, stop: 90, target: 120, qty: 10, date: '2026-11-18' },
    { sym: 'CCC', setup: 'Discretionary', status: 'closed', entry: 100, stop: 90, exit: 115, target: 120, qty: 10, date: '2026-11-01' }, { sym: 'DDD', setup: 'Discretionary', status: 'closed', entry: 100, stop: 90, exit: 95, target: 120, qty: 10, date: '2026-11-01' },
    { sym: 'EEE', setup: 'Momentum pullback', status: 'closed', entry: 50, stop: 45, exit: 60, target: 60, qty: 10, date: '2026-11-01' }, { sym: 'FFF', setup: 'Breakout', status: 'open', entry: 50, stop: 45, target: 60, qty: 10, date: '2026-11-18' }];
  const full2 = E.discretionaryCheck(J, { entry: 200, stop: 190, why }, S10); assert(!full2.ok && full2.open === 2 && /2 of 2/.test(full2.reason), 'discretionary: a third open position is refused');
  assert(E.discretionaryCheck(J.filter(t => t.sym !== 'BBB'), { entry: 200, stop: 190, why }, S10).ok, 'discretionary: closed trades and other setups do not count against the two');
  const bars10 = { dates: ['2026-11-18', '2026-11-19'], sym: { AAA: { c: [100, 105], h: [101, 106], l: [99, 100] }, BBB: { c: [100, 95], h: [101, 100], l: [99, 94] } } };
  const B = E.bookStats(J, bars10); const D = B.find(b => b.book === 'Discretionary'), P = B.find(b => b.book === 'Momentum pullback'), O = B.find(b => b.book === 'Other setups');
  assert(B.length === 3 && B[0].book === 'Discretionary' && D.open === 2 && D.closed === 2 && D.wins === 1 && Math.abs(D.totalR - 1.0) < 1e-9 && Math.abs(D.avgR - 0.5) < 1e-9 && Math.abs(D.openR - 0) < 1e-9, 'book stats: the discretionary book in R — +1.5R and −0.5R closed, +0.5R and −0.5R open');
  assert(P.closed === 1 && P.avgR === 2 && O.open === 1 && O.closed === 0 && O.avgR === null && E.bookStats([], bars10).length === 0, 'book stats: momentum pullbacks and other setups are separate books; an empty journal has none'); }

// 11. positions card, swing half (18 Nov 2026): one rule line per open trade — the backtest's management, bar for bar
{ const D = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-23', '2026-11-24'];
  const mk = closes => ({ o: closes.map(c => c), h: closes.map(c => c + 1), l: closes.map(c => c - 1), c: closes, v: closes.map(() => 1), t: closes.map(() => 10) });
  const T = (setup, extra) => Object.assign({ sym: 'X', date: D[0], entry: 100, stop: 95, target: 110, qty: 10, setup }, extra || {});
  const B = closes => ({ dates: D.slice(0, closes.length), sym: { X: mk(closes) } });
  let p = E.positionLine(T('Breakout'), B([100]));
  assert(p.action === 'wait' && /No close since entry/.test(p.text), 'position line: nothing to say until there is a close after the entry day');
  p = E.positionLine(T('Breakout'), B([100, 101, 102]));
  assert(p.action === 'hold' && p.stop === 95 && p.bars === 2 && /Hold — stop 95\.00/.test(p.text) && /breakeven on a close at 105\.00/.test(p.text) && /bar 2 of 15/.test(p.text), 'position line: hold, with the stop, the +1R level and the bar count');
  p = E.positionLine(T('Breakout'), B([100, 101, 105.5]));
  assert(p.action === 'raise' && p.stop === 100 && /Raise stop to 100\.00 \(breakeven\)/.test(p.text), 'position line: a close at +1R raises the stop to the entry that day');
  p = E.positionLine(T('Breakout'), B([100, 101, 105.5, 104]));
  assert(p.action === 'hold' && p.stop === 100 && /stop at breakeven 100\.00 since 2026-11-04/.test(p.text), 'position line: the day after, it is a hold with the stop at breakeven');
  p = E.positionLine(T('Breakout'), B([100, 101, 105.5, 100.5]));
  assert(p.action === 'exit' && p.exit.reason === 'breakeven stop' && p.exit.price === 100 && Math.abs(p.R) < 1e-9, 'position line: the low trades at the raised stop → out at breakeven, 0R');
  p = E.positionLine(T('Pullback'), B([100, 99, 95.5]));
  assert(p.action === 'exit' && p.exit.reason === 'stop' && p.exit.price === 95 && Math.abs(p.R + 1) < 1e-9 && /stop 95\.00 was hit on 2026-11-04 \(-1\.0R\)/.test(p.text), 'position line: the low trades at the stop → out at the stop, −1R');
  p = E.positionLine(T('Pullback'), B([100, 99, 93]));
  assert(p.action === 'exit' && p.exit.reason === 'gap through stop' && p.exit.price === 93, 'position line: an open below the stop → out at the open');
  p = E.positionLine(T('Momentum pullback'), B([100, 103, 109.5]));
  assert(p.action === 'exit' && p.exit.reason === 'target' && p.exit.price === 110 && Math.abs(p.R - 2) < 1e-9, 'position line: the high reaches the target → out at the target, +2R');
  const flat = [100, ...Array.from({ length: 16 }, () => 101)];
  p = E.positionLine(T('Breakout'), B(flat.slice(0, 15))); const p15 = E.positionLine(T('Breakout'), B(flat.slice(0, 16)));
  assert(p.action === 'hold' && /bar 14 of 15/.test(p.text) && p15.action === 'exit' && p15.exit.reason === 'time stop' && p15.exit.date === D[15], 'position line: a swing trade is out at the close of its 15th bar');
  const d17 = E.positionLine(T('Discretionary'), B(flat));
  assert(d17.action === 'hold' && d17.bars === 16 && !/of 15/.test(d17.text), 'position line: a discretionary trade has the stop and the target but no time stop');
  // a hand-bought momentum name: 20% trailing stop on closes, and the rank rule against today's ranking
  let m = E.positionLine(T('Momentum', { stop: 80, target: 0 }), B([100, 110, 120]), { rank: { X: 4 } });
  assert(m.action === 'raise' && m.stop === 96 && /Raise stop to 96\.00/.test(m.text) && /rank 4/.test(m.text), 'position line (momentum): the trailing stop follows the highest close');
  m = E.positionLine(T('Momentum', { stop: 80, target: 0 }), B([100, 110, 120, 118]), { rank: { X: 4 } });
  assert(m.action === 'hold' && m.stop === 96, 'position line (momentum): hold while the close is above the trailing stop');
  m = E.positionLine(T('Momentum', { stop: 80, target: 0 }), B([100, 110, 120, 95]), { rank: { X: 4 } });
  assert(m.action === 'exit' && m.exit.reason === 'trailing stop' && m.exit.date === D[3], 'position line (momentum): a close below the trailing stop is an exit');
  m = E.positionLine(T('Momentum', { stop: 80, target: 0 }), B([100, 110, 120, 118]), { rank: { X: 41 }, holdRank: 30 }); const m2 = E.positionLine(T('Momentum', { stop: 80, target: 0 }), B([100, 110, 120, 118]), { rank: {} });
  assert(m.action === 'exit' && /rank 41, below 30/.test(m.text) && m2.action === 'exit' && /no longer ranked/.test(m2.text), 'position line (momentum): below rank 30, or unranked, is out at the next rebalance');
  // the digest block: only for positions in config.json; never trimmed by digestFit
  assert(E.positionsDigest([], B([100, 101])) === null && E.positionsDigest(undefined, B([100, 101])) === null, 'positions digest: no block when config.json has no positions');
  const blk = E.positionsDigest([T('Breakout', { sym: 'x' }), T('Pullback', { status: 'closed' })], B([100, 101, 105.5]));
  assert(/^OPEN POSITIONS \(1\)/.test(blk) && /• X \[Breakout\] — Raise stop to 100\.00/.test(blk), 'positions digest: one rule line per open position, closed ones skipped, symbol upper-cased');
  const dg = E.digest(res, { ...E.DEFAULTS, swingMode: 'watch' }, { momentum: 'MOMENTUM test', paper: 'PAPER BOOK test', positions: blk });
  assert(dg.indexOf('PAPER BOOK test') < dg.indexOf('OPEN POSITIONS') && dg.indexOf('OPEN POSITIONS') < dg.indexOf('MOMENTUM PULLBACKS'), 'digest: open positions follow the paper book and precede the swing lists'); }

// 12. risk-adjusted ranking (the volAdjust switch, tested as a hypothesis on 18 Nov 2026): a steady riser outranks a wilder one with the larger raw return
{ const n = 200; const dates = []; let d = new Date('2025-01-01'); while (dates.length < n) { if (d.getUTCDay() % 6) dates.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
  const series = (drift, amp) => { const c = []; let x = 100; for (let i = 0; i < n; i++) { x *= 1 + drift + (i % 2 ? amp : -amp); c.push(+x.toFixed(4)); } return { o: c, h: c, l: c, c, v: c.map(() => 1e6), t: c.map(() => 50) }; };
  const bars12 = { dates, sym: { STEADY: series(0.002, 0.002), WILD: series(0.0026, 0.03) }, index: null };
  const raw = M.rankAt(bars12, n - 1, { volAdjust: false, maxOffHigh: 100 }, {}), adj = M.rankAt(bars12, n - 1, { volAdjust: true, maxOffHigh: 100 }, {});
  assert(raw.ranked[0].sym === 'WILD' && adj.ranked[0].sym === 'STEADY' && adj.ranked[0].vol < adj.ranked[1].vol, `ranking: raw return puts the wilder name first, return ÷ volatility the steadier one (scores ${adj.ranked.map(r => r.score.toFixed(1)).join(' v ')})`); }

// 13. data notices and the paper book at an index review (19 Nov 2026, interim audit A6 / A7 / A18)
{ const mk = rows => ({ dates: ['2026-11-03', '2026-11-04'], sym: Object.fromEntries(rows.map(r => [r[0], { o: [r[1], r[2]], h: [r[1], r[2]], l: [r[1], r[2]], c: [r[1], r[2]], v: [10, 20], t: [1, 1] }])), extras: { '2026-11-04': Object.fromEntries(rows.map(r => [r[0], { prev: r[3], pct: r[4] }])) } });
  // BONUS is CONCORDBIO's own row of 4 Nov 2026 (1:1 bonus); FALL is a real 20% fall; GAPUP is FINCABLES on 9 Nov 2026, the day after a session the bars lack; SPLIT5 a 5-for-1 split
  const rows = [['BONUS', 1234, 655.1, 1227.9, 6.69], ['FALL', 100, 80, 100.2, -20.16], ['GAPUP', 1098, 1229.2, 1309, -6.1], ['FLAT', 200, 202, 199.8, 1.1], ['SPLIT5', 1000, 205, 1001, 2.4]];
  const b = mk(rows); const pend = E.pendingAdjustments(b, 1);
  assert(pend.length === 2 && pend[0].sym === 'BONUS' && pend[0].factor === 2 && Math.abs(pend[0].observed - 1.9998) < 0.001 && pend[1].sym === 'SPLIT5' && pend[1].factor === 5, `pendingAdjustments: a bonus and a split are read off NSE's change (${pend.map(x => x.sym + ' ÷' + x.factor).join(', ')}); a real 20% fall and the day after a missing session are not`);
  assert(E.snapFactor(1.5003) === 1.5 && E.snapFactor(1.2496) === 1.25 && E.snapFactor(10.02) === 10 && E.pendingAdjustments(b, 0).length === 0 && E.pendingAdjustments({ dates: b.dates, sym: b.sym, extras: {} }, 1).length === 0, 'pendingAdjustments: factors snap to simple ratios; nothing without a previous day or without NSE rows');
  const ev = E.provisionalEvent(pend[0]); const b2 = mk(rows); E.applyAdjustments(b2, { symbols: { BONUS: [ev] } });
  assert(ev.apply === true && ev.provisional === true && ev.exDate === '2026-11-04' && b2.sym.BONUS.c[0] === 617 && b2.sym.BONUS.v[0] === 20 && b2.sym.BONUS.c[1] === 655.1 && !E.pendingAdjustments(b2, 1).some(x => x.sym === 'BONUS'), 'provisional entry: applied by applyAdjustments (the bar before the ex-date halves, volume doubles) and not found a second time');
  const many = n => mk(Array.from({ length: 60 }, (_, k) => ['S' + k, 100, 101, k < n ? 103 : 100.1, 1]));
  const g0 = E.sessionGap(many(6), 1), g1 = E.sessionGap(many(45), 1);
  assert(g0.n === 60 && g0.off === 6 && g0.missing === false && g1.off === 45 && g1.missing === true && g1.prevDate === '2026-11-03' && E.sessionGap(b, 1).missing === false && E.sessionGap(b, 0) === null, 'sessionGap: a tenth of previous closes off is an ordinary day, three quarters is a missing session');
  const nd = E.noticesDigest(pend, g1, true);
  assert(/^DATA NOTICES\n• ADJUSTED: BONUS ÷2 before 2026-11-04/.test(nd) && /HISTORY GAP: 45 of 60/.test(nd) && /LOOKS ADJUSTED, NOT APPLIED/.test(E.noticesDigest(pend, null, false)) && E.noticesDigest([], g0) === null && E.noticesDigest(null, null) === null, 'noticesDigest: one line per adjustment, one for a missing session, null when there is nothing');
  const dg = E.digest(res, E.DEFAULTS, { notices: nd, momentum: 'MOMENTUM block' }); assert(dg.indexOf('DATA NOTICES') > 0 && dg.indexOf('DATA NOTICES') < dg.indexOf('MOMENTUM block') && !/DATA NOTICES/.test(E.digest(res, E.DEFAULTS, { momentum: 'MOMENTUM block' })), 'digest: the notices sit above the momentum list and only when there are any');
  const R = [{ date: '2027-04-02', text: 'index review top-up', repeat: 'semiannual' }];
  assert(/index review/.test(E.remindersDue(R, '2027-04-02')) && E.remindersDue(R, '2027-07-02') === null && /2027-10-02 \(semiannual\)/.test(E.remindersDue(R, '2027-10-05')) && E.remindersDue(R, '2027-04-01') === null, 'reminders: a semiannual repeat is due every six months');
  const lb = E.buildBars([synth(60, 500)], []); const D = lb.dates; const from = D[300]; const L = D.length - 1;
  const plain = M.paperBook(lb, {}, custom, { from, capital: 500000 }), all = M.paperBook(lb, {}, custom, { from, capital: 500000, filter: () => true, membersAsOf: D[0] });
  const out = plain.positions[0].sym; const cut = M.paperBook(lb, {}, custom, { from, capital: 500000, filter: (s, d) => !(s === out && d >= D[L - 30]), membersAsOf: D[L - 10] });
  assert(all.value === plain.value && all.membersStale === true && plain.membersStale === false && plain.positions.every(p => p.noBar === false && p.lastBar === D[L]) && cut.membersStale === false && !cut.positions.some(p => p.sym === out) && cut.equity.length === plain.equity.length, `paperBook: a filter that passes everything changes nothing; a name the filter drops (${out}) is gone from the book after the next rebalance; a list older than 200 days is flagged`);
  const lb2 = E.buildBars([synth(60, 500)], []); lb2.sym[out].c[L] = null; const nb = M.paperBook(lb2, {}, custom, { from, capital: 500000 }); const held = nb.positions.find(p => p.sym === out);
  assert(held && held.noBar === true && held.lastBar === D[L - 1] && /NO BAR TODAY: \S+ \(last close /.test(M.paperDigest(nb, E.fmt)) && !/NO BAR TODAY/.test(M.paperDigest(plain, E.fmt)) && /membership list is as of/.test(M.paperDigest(all, E.fmt)), 'paperBook: a holding without a bar today is carried at its last close and named in the digest; a stale membership list is named too'); }

// 14. fourteenth session (21 Nov 2026): the audit decisions — A3 (--to ends the data), A8 (index holes), A17 (NSE's host), A18 (weekend sessions),
//     the daily job's "nothing new to fetch" check and failure alert, and the Results drift reading (A1)
{ const NSE = await import('./nse.mjs'); const BF = await import('./backfill.mjs'); const PD = await import('./backtest-pead.mjs'); const RV = await import('./backtest-reversal.mjs');
  // A8: the gate's average steps over a short hole; a complete series gives the old number to the last digit
  const c = []; for (let i = 0; i < 260; i++) c.push(20000 + 37 * Math.sin(i / 9) * 50 + i * 12); const mk = cc => ({ dates: cc.map((_, i) => 'd' + String(i).padStart(3, '0')), index: { name: 'NIFTY 50', c: cc.slice() }, sym: {} });
  const full = M.gateAt(mk(c), 259, { gateSma: 200 }); assert(full.source === 'index' && full.holes === undefined && full.sma === M.smaAt(c, 200, 259), 'gate: with every index close on file the 200-day average is the old one to the last digit, and no hole is reported');
  const one = c.slice(); one[231] = null; const g1 = M.gateAt(mk(one), 259, { gateSma: 200 }); const expect1 = (c.slice(59, 260).reduce((p, v) => p + v, 0) - c[231]) / 200;
  assert(g1.source === 'index' && g1.holes === 1 && Math.abs(g1.sma - expect1) < 1e-6 && Math.abs(g1.sma / full.sma - 1) < 0.001 && g1.open === full.open, `gate: one missing close is stepped over — the average is the last 200 closes on file, ${(Math.abs(g1.sma / full.sma - 1) * 100).toFixed(3)}% from the true one, and the answer still comes from the index`);
  const six = c.slice(); [200, 210, 220, 230, 240, 250].forEach(k => (six[k] = null)); const five = six.slice(); five[250] = c[250];
  assert(M.gateAt(mk(five), 259, { gateSma: 200 }).holes === 5 && M.gateAt(mk(six), 259, { gateSma: 200 }).source !== 'index' && M.gateAt(mk(one), 259, { gateSma: 200, gateHoles: 0 }).source !== 'index' && M.smaOver(c, 200, 150, 5) === null, 'gate: five holes are stepped over, a sixth sends it to the fallback (as one did before); gateHoles 0 is the old behaviour; a series shorter than the window gives nothing');
  const today = c.slice(); today[259] = null; const gt = M.gateAt(mk(today), 259, { gateSma: 200 }); assert(gt.source === 'index' && gt.asOf === 'd258' && gt.holes === undefined, 'gate: a day without its own index bar still reads the latest bar, unchanged');
  const hb = mk(one); hb.index.c[259] = null; assert(E.indexHoles(hb, 259).join() === 'd231,d259' && E.indexHoles(mk(c), 259).length === 0 && E.indexHoles({ dates: ['a'], index: null, sym: {} }, 0).length === 0 && E.indexHoles(hb, 259, 20).join() === 'd259', 'indexHoles: the dates without an index close inside the span, none on a complete series or without an index');
  const nd = E.noticesDigest([], null, undefined, { repaired: [{ date: '2026-11-20', source: "from today's previous close" }], missing: ['2026-11-11'], gate: { source: 'index', holes: 1, n: 200 } });
  assert(/INDEX REPAIRED: the NIFTY 50 close for 2026-11-20/.test(nd) && /INDEX GAP: no NIFTY 50 close for 2026-11-11/.test(nd) && /steps over it \(1 of 200\)/.test(nd) && E.noticesDigest([], null, undefined, { repaired: [], missing: [], gate: { source: 'index', n: 200 } }) === null && /GATE FROM BREADTH/.test(E.noticesDigest([], null, undefined, { repaired: [], missing: ['a', 'b', 'c', 'd', 'e', 'f'], gate: { source: 'breadth', breadth: 0.52, n: 200 } })) && E.noticesDigest([], null) === null, 'notices: a repaired index close, one still missing and a gate from breadth are each said in the digest; nothing to say is still null');
  // the daily job: nothing new to fetch once the last session's snapshot is on file; the failure alert
  const at = s2 => Date.parse(s2); const L = { date: '2026-11-20', time: '16:00' };
  assert(E.sessionDone(L, at('2026-11-20T13:30:00Z')) && E.sessionDone(L, at('2026-11-20T19:11:00Z')) && E.sessionDone(L, at('2026-11-20T21:45:00Z')), 'sessionDone: with Friday\'s 16:00 snapshot on file a run at 19:00 IST, at 00:41 and at 03:15 the next morning has nothing to fetch (runs #89 and #100 would not have called NSE)');
  assert(!E.sessionDone(L, at('2026-11-23T12:35:00Z')) && !E.sessionDone(L, at('2026-11-21T11:30:00Z')) && !E.sessionDone({ date: '2026-11-20', time: '15:30' }, at('2026-11-20T13:30:00Z')) && !E.sessionDone(null, at('2026-11-20T13:30:00Z')) && !E.sessionDone({ date: '2026-11-20', time: '16:00' }, at('2026-11-23T02:00:00Z')), 'sessionDone: Monday evening, a weekend afternoon, an intraday stamp, no snapshot and Monday before the open all fetch as before');
  const fn = E.failureNotice({ what: 'HTTP 403 from www.nseindia.com', nowMs: at('2026-11-23T13:30:00Z'), latest: L, scheduled: true, runUrl: 'https://github.com/o/r/actions/runs/7' });
  assert(/failed at 2026-11-23 19:00 IST: HTTP 403 from www\.nseindia\.com\./.test(fn) && /Last snapshot on file: 2026-11-20 16:00/.test(fn) && /later slots tonight try again/.test(fn) && /Log: https:\/\/github\.com\/o\/r\/actions\/runs\/7/.test(fn) && !/later slots/.test(E.failureNotice({ what: 'x', scheduled: false })) && /No snapshot on file yet/.test(E.failureNotice({ what: 'x' })), 'failureNotice: what failed and where, the last snapshot on file, what happens next, and the log');
  // A17: NSE's host is followed, and only to NSE
  assert(NSE.originOf('https://www.nseindia.in/market-data/x') === 'https://www.nseindia.in' && NSE.originOf('https://www.nseindia.com/') === NSE.NSE_DEFAULT && NSE.originOf('https://evil.example/www.nseindia.in') === NSE.NSE_DEFAULT && NSE.originOf('http://www.nseindia.in/') === NSE.NSE_DEFAULT && NSE.originOf('not a url') === NSE.NSE_DEFAULT && NSE.cookieHeader(['a=1; Path=/', 'b=2; HttpOnly']) === 'a=1; b=2', 'nse: the host that answered is followed when it is www.nseindia.com or .in over https, and nothing else is');
  const fake = (landing, cookies) => async (url, o) => ({ url: landing || url, status: 200, headers: { getSetCookie: () => cookies } });
  const s1 = await NSE.nseSession('/', { fetch: fake('https://www.nseindia.in/', ['nsit=abc; Path=/']) }); const s0 = await NSE.nseSession('/x', { fetch: fake(null, []) });
  assert(s1.origin === 'https://www.nseindia.in' && s1.moved && s1.cookie === 'nsit=abc' && NSE.nseHeaders(s1).Cookie === 'nsit=abc' && NSE.nseHeaders(s1).Referer === 'https://www.nseindia.in/' && s0.origin === NSE.NSE_DEFAULT && !s0.moved && /HTTP 403 from www\.nseindia\.in; first visit was redirected there/.test(NSE.describeRefusal(403, s1)) && /no cookie was set/.test(NSE.describeRefusal(403, s0)), 'nse: a first visit that lands on .in sends the API calls and the cookie there; a refusal names the status and the host');
  const ih = NSE.parseIndexHistory({ data: [{ EOD_TIMESTAMP: '08-NOV-2026', EOD_OPEN_INDEX_VAL: 25510, EOD_HIGH_INDEX_VAL: 25560, EOD_LOW_INDEX_VAL: 25500, EOD_CLOSE_INDEX_VAL: 25536.4 }, { EOD_TIMESTAMP: '09-Nov-2026', EOD_CLOSE_INDEX_VAL: '25600.5' }, { EOD_TIMESTAMP: 'junk', EOD_CLOSE_INDEX_VAL: 1 }, { EOD_TIMESTAMP: '10-NOV-2026', EOD_CLOSE_INDEX_VAL: 0 }] });
  assert(Object.keys(ih).join() === '2026-11-08,2026-11-09' && ih['2026-11-08'].c === 25536.4 && ih['2026-11-08'].h === 25560 && ih['2026-11-09'].c === 25600.5 && ih['2026-11-09'].o === null && Object.keys(NSE.parseIndexHistory(null)).length === 0, 'nse: index-history rows parsed to dated bars; rows without a date or a close are dropped');
  const ica = 'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value,Points Change\nNifty 50,02-03-2024,22406.95,22419.55,22368.35,22378.4,39.65\n"Nifty Next 50",02-03-2024,-,-,-,60000,1\n';
  assert(NSE.parseIndexCloseAll(ica).c === 22378.4 && NSE.parseIndexCloseAll(ica).o === 22406.95 && NSE.parseIndexCloseAll(ica, 'NIFTY NEXT 50').c === 60000 && NSE.parseIndexCloseAll(ica, 'NIFTY NEXT 50').o === null && NSE.parseIndexCloseAll(ica, 'NIFTY 100') === null && NSE.parseIndexCloseAll('') === null && NSE.parseIndexCloseAll('a,b\n1,2') === null, 'nse: an index\'s bar read from NSE\'s daily index file by column name; an index that is not in the file, or a file that is not one, gives nothing');
  { const ib = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'index-bars.json'), 'utf8')); const b = ib['NIFTY 50']['2024-03-02']; const h24 = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'history', '2024.json'), 'utf8').catch(() => 'null'));
    const fri = h24 ? h24.index.c[h24.dates.indexOf('2024-03-01')] : null;
    assert(b.c === 22378.4 && /Business Today/.test(b.source) && Object.values(ib['NIFTY 50']).every(x => x.c > 0 && x.source && x.source.length > 40) && (fri == null || Math.abs(b.c - (fri + 39.65)) < 0.01), 'index-bars.json: every listed bar has a close and says where it comes from; 2 Mar 2024 is Friday\'s close on file plus the published 39.65 points'); }
  assert(/note/.test(E.remindersDue([{ date: '2026-11-23', days: 2, text: 'note' }], '2026-11-24') || '') && E.remindersDue([{ date: '2026-11-23', days: 2, text: 'note' }], '2026-11-25') === null && /check/.test(E.remindersDue([{ date: '2026-11-23', text: 'check' }], '2026-11-29') || ''), 'reminders: one with `days` shows for that many days; without it, for a week as before');
  // A18: weekend dates
  const vk = (d, o) => BF.visitKind(d, Object.assign({ to: '2026-11-20', weekendsOnly: false }, o));
  assert(vk('2026-11-06') === 'weekday' && vk('2026-11-08') === 'weekend' && vk('2026-09-20') === null && vk('2019-10-27', { weekendsOnly: true }) === 'weekend' && vk('2019-10-28', { weekendsOnly: true }) === null && vk('2026-09-21') === 'weekday', 'backfill: a weekend date is tried when it is within 60 days of the end of the range, or always with --weekends (which leaves weekdays alone)');
  // A3: --to ends the data
  const lb = E.buildBars([synth(60, 500)], []); const D = lb.dates; const cut = E.clipBars(lb, D[300]); const anySym = Object.keys(lb.sym)[0];
  assert(cut.dates.length === 301 && cut.dates[300] === D[300] && cut.sym[anySym].c.length === 301 && cut.sym[anySym].c[300] === lb.sym[anySym].c[300] && (!lb.index || cut.index.c.length === 301) && lb.dates.length === 500 && E.clipBars(lb, '9999') === lb && E.clipBars(lb, null) === lb, 'clipBars: every series is cut at the last date on or before --to; the original is untouched and nothing is copied when there is nothing to cut');
  const evs = { built: 'test', sources: ['fr'], symbols: {} }; let n = 0; for (let k = 0; k < 60; k++) { const list = []; for (let i = 40 + (k % 7); i < 480; i += 21) list.push({ date: D[i], time: n++ % 2 ? '10:30' : '17:45', period: 'Q', src: 'fr' }); evs.symbols[Object.keys(lb.sym)[k]] = list; }
  const pp = { minWindow: 10, volx: 1.0 }; const asThen = PD.study(E.clipBars(lb, D[300]), evs, { params: pp }), withTo = PD.study(lb, evs, { params: pp, to: D[300] }), whole = PD.study(lb, evs, { params: pp });
  const openThen = asThen.rows.primary.trades.filter(t => t.reason === 'end of data');
  assert(asThen.rows.primary.trades.length > 10 && JSON.stringify(withTo.rows.primary.trades) === JSON.stringify(asThen.rows.primary.trades) && JSON.stringify(withTo.rows.desk.trades) === JSON.stringify(asThen.rows.desk.trades) && withTo.rows.primary.trades.every(t => t.exitDate <= D[300]) && whole.rows.primary.trades.some(t => t.exitDate > D[300]), `pead study: --to gives the trade list a run on that day gave — ${asThen.rows.primary.trades.length} trades, none exits after the window (${openThen.length} marked "end of data" there)`);
  const rThen = RV.study(E.clipBars(lb, D[400]), { params: { minEligible: 5, liquid: 0 } }), rTo = RV.study(lb, { params: { minEligible: 5, liquid: 0 }, to: D[400] });
  assert(rThen.rows.primary.trades.length > 10 && JSON.stringify(rTo.rows.primary.trades) === JSON.stringify(rThen.rows.primary.trades) && rTo.rows.primary.trades.every(t => t.exitDate <= D[400]), `reversal study: --to reproduces the run of that day (${rThen.rows.primary.trades.length} trades)`);
  // A1: the Results drift reading — forward / seen, the star, the seasons, the order
  const T = (sym, R, Rm, excess, reason) => ({ sym, R, entryDate: R, exitDate: R, entry: 100, stop: 95, exit: 100, bars: 3, ret: Rm * 5, Rm, excess, reason: reason || 'time', volx: 3, retR: 6 });
  const tr = [T('OLD', '2026-09-30', 3, 5), T('SEEN1', '2026-10-20', 2.5, 4), T('SEEN2', '2026-11-21', 1.2, -0.5), T('FWD0', '2026-11-24', 0.99, 3), T('FWD1', '2027-01-20', 1, 0.1, 'end of data'), T('FWD2', '2027-01-21', 4, 2), T('FWD3', '2027-01-19', -1, -3), T('FWD4', '2027-02-02', 1.5, null)];
  const DR = PD.driftReading(tr, [tr[5]]); const q1 = DR.seasons.find(x => x.key === '2027Q1'), q4 = DR.seasons.find(x => x.key === '2026Q4');
  assert(DR.seasons.length === 2 && q4.trades.map(t => t.sym).join() === 'SEEN1,SEEN2,FWD0' && q4.forward.n === 1 && q4.seen.n === 2 && q4.all.starred === 1 && /Sep-quarter 2026 results/.test(q4.label) && /Dec-quarter 2026 results \(reaction days Jan–Mar 2027\)/.test(q1.label), 'results drift: trades from 1 Oct 2026 by results season; a reaction day after 21 Nov 2026 is forward, on or before it is seen');
  assert(q1.trades.map(t => t.sym).join() === 'FWD2,FWD1,FWD3,FWD4' && q1.trades.map(t => t.promise).join() === 'true,true,false,false' && q1.trades[0].desk && !q1.trades[1].desk && q1.trades[1].open && DR.forward.n === 5 && DR.forward.starred === 2 && DR.forward.open === 1 && PD.showsPromise(tr[4]) && !PD.showsPromise(tr[3]) && !PD.showsPromise(tr[2]) && !PD.showsPromise(tr[7]), 'results drift: showing promise = at least +1R and ahead of the index (0.99R, behind the index and no index figure do not qualify); starred trades come first, largest R first, then the rest by date');
  const mdl = PD.driftMarkdown(DR, '2027-03-31').join('\n'); const md0 = PD.driftMarkdown(PD.driftReading([tr[1]], []), '2026-11-20').join('\n');
  assert(/\*\*Forward trades so far: 5\*\*/.test(mdl) && /\| ★ \| \*\*FWD2\*\* \|/.test(mdl) && /\|  \| FWD3 \|/.test(mdl) && /open, 3 bars/.test(mdl) && /\*\*No forward trade yet\*\*/.test(md0) && PD.DRIFT.frozen === '2026-11-21' && PD.RULE.hold === 20 && PD.RULE.decile === 0.9 && PD.RULE.volx === 2 && PD.RULE.atrMult === 2, 'results drift: the report section marks starred rows and says when no forward trade exists; the frozen rule is the 13 Nov rule'); }

// 15. scripts/paper-books.mjs end to end on a synthetic store (A21, 23 Nov 2026): the live books as of a close, and the reading rule tried on the years before them
{ const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'books-')); const sf = synth(60, 700); const D = sf.dates; const fundName = 'TEST MOMENTUM 50'; const from = D[650];
  await fs.mkdir(path.join(dir, 'hist')); await fs.mkdir(path.join(dir, 'bm')); await fs.writeFile(path.join(dir, 'hist', '2025.json'), JSON.stringify(sf));
  const px = k => +(1000 * Math.pow(1.0004, k) * (1 + 0.02 * Math.sin(k / 9))).toFixed(2); const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; const site = d => `${d.slice(8)} ${mon[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
  await fs.writeFile(path.join(dir, 'bm', `${fundName}_Historical_TR_x.csv`), ['"Index Name","Date","Total Returns Index"', ...D.map((d, k) => `"${fundName}","${site(d)}","${px(k)}"`).reverse()].join('\n'));
  await fs.writeFile(path.join(dir, 'live.json'), JSON.stringify({ [fundName]: Object.fromEntries(D.slice(650).map((d, k) => [d, px(650 + k)])) }));
  await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify({ risk: { capital: 500000 }, paper: { from, capital: 500000, books: 21, fund: fundName, benchmarks: [fundName, 'NIFTY 50'] } }));
  await fs.writeFile(path.join(dir, 'sectors.json'), JSON.stringify({ map: custom }));
  const base = ['--hist', path.join(dir, 'hist'), '--config', path.join(dir, 'config.json'), '--live', path.join(dir, 'live.json'), '--benchmarks', path.join(dir, 'bm'), '--sectors', path.join(dir, 'sectors.json'), '--adjust', path.join(dir, 'none.json'), '--no-members', '--out', path.join(dir, 'out')];
  const run = extra => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'paper-books.mjs'), ...base, ...extra], { encoding: 'utf8' }); const err = r => r.status ? '\n' + String(r.stderr).split('\n').slice(0, 6).join('\n') : '';
  const r1 = run(['--to', D[660], '--write']); const lb = E.buildBars([sf], []); const want = M.paperBooks(E.clipBars(lb, D[660]), {}, custom, { from, books: 21, fund: fundName, capital: 500000, benchmarks: { [fundName]: Object.fromEntries(D.slice(650, 661).map((d, k) => [d, px(650 + k)])) } });
  const f1 = r1.status === 0 ? await fs.readFile(path.join(dir, 'out', `momentum-books-${D[660]}.md`), 'utf8').catch(() => '') : '';
  assert(r1.status === 0 && f1.includes(`# The twenty-one paper books — as of ${D[660]}`) && f1.includes('11 of 21 books started') && (f1.match(/^\| \d+ \| \d{4}-\d\d-\d\d \|/gm) || []).length === 11 && f1.includes(`| 1 | ${from} | 11 | ₹${want.rows[0].value} |`) && f1.includes(`Digest line: ${M.booksLine(want)}`) && /\*\*No reading:\*\* 10 book\(s\) have not started/.test(f1),
    `paper-books --to: eleven books on the eleventh day, book 1's value and the digest line as the engine gives them, no reading while ten are pending${err(r1)}`);
  const r2 = run([]); const all = M.paperBooks(lb, {}, custom, { from, books: 21, fund: fundName, capital: 500000, benchmarks: { [fundName]: Object.fromEntries(D.slice(650).map((d, k) => [d, px(650 + k)])) } });
  assert(r2.status === 0 && /21 of 21 books started/.test(r2.stdout) && /not frozen yet/.test(r2.stdout) && /\*\*Not the reading day yet\*\* — the first session on or after /.test(r2.stdout) && r2.stdout.includes(`**A** ${all.A} of 21 ahead`) && all.due === false, `paper-books: all 21 started, start days not frozen, the reading named but not due${err(r2)}`);
  const inr = x => (x < 0 ? '−' : '') + '₹' + Math.round(Math.abs(x)).toLocaleString('en-IN');
  assert(r2.stdout.includes(`**As the actual investment** — ₹5,00,000 a book: the median book has made ${inr(all.ret.median * 500000)};`) && r2.stdout.includes(`the median margin is **${inr(all.G * 500000)}** ${all.G >= 0 ? 'ahead of' : 'behind'} the fund`), `paper-books: the books read as the actual investment — the median margin over the fund in rupees on ₹5,00,000 (${inr(all.G * 500000)})`);
  const r3 = run(['--history', '--step', '40', '--write']); const f3 = r3.status === 0 ? await fs.readFile(path.join(dir, 'out', (await fs.readdir(path.join(dir, 'out'))).find(f => /^momentum-books-history-/.test(f))), 'utf8') : '';
  const rd = (f3.match(/^\| \d{4}-\d\d-\d\d \| \d{4}-\d\d-\d\d \| \d{4}-\d\d-\d\d \|.*$/gm) || []).map(l => l.split('|').map(x => x.trim()));
  assert(r3.status === 0 && rd.length >= 5 && rd.every(c => c[3] < from && c[1] < c[2] && c[2] < c[3] && ['ahead', 'level', 'behind'].includes(c[10]) && /^(ahead|monitor|monitor, loses less)$/.test(c[11])) && new RegExp(`All anchors .*: ${rd.length} readings — ahead \\d+ \\(\\d+%\\), level \\d+`).test(f3) && /Non-overlapping only: \d+ readings/.test(f3) && /total return/.test(f3),
    `paper-books --history: ${rd.length} readings on the synthetic years, every one read before the first live day (${from}), each with a verdict by the rule${err(r3)}`);
  // one reading re-made by hand: 21 books from the anchor, read six calendar months after the last one starts
  if (rd.length) { const c = rd[0]; const a = D.indexOf(c[1]); const tr = Object.fromEntries(D.map((d, k) => [d, px(k)])); const hb = M.paperBooks(E.clipBars(lb, c[3]), {}, custom, { from: c[1], starts: D.slice(a, a + 21), books: 21, fund: fundName, capital: 500000, benchmarks: { [fundName]: tr } });
    const pts = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1);
    assert(c[2] === D[a + 20] && hb.readingFrom <= c[3] && D[D.indexOf(c[3]) - 1] < hb.readingFrom && c[5] === pts(hb.G) && +c[7] === hb.A && c[10] === hb.reading.ret && c[11] === hb.reading.verdict, `paper-books --history: the first reading (${c[1]} → ${c[3]}) re-made by hand — G ${c[5]} pts, ${c[7]} of 21 ahead, ${c[11]}`); }
  await fs.rm(dir, { recursive: true, force: true }); }

console.log('\n' + E.digest(res, E.DEFAULTS).split('\n').slice(0, 6).join('\n'));
if (fails) { console.error(`\n${fails} test(s) failed`); process.exit(1); } else console.log('\nall tests passed');
