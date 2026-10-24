/* Self-test: node scripts/test.mjs  (engine rules + a synthetic end-to-end backtest) */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
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
console.log('\n' + E.digest(res, E.DEFAULTS).split('\n').slice(0, 6).join('\n'));
if (fails) { console.error(`\n${fails} test(s) failed`); process.exit(1); } else console.log('\nall tests passed');
