/* Nifty Swing Desk — momentum engine.
 * A second, independent engine: cross-sectional momentum (buy the strongest names in the universe, hold for
 * weeks, rebalance monthly) rather than the day-after trigger setups in engine.js. Same bars, different philosophy,
 * its own backtest (scripts/backtest-momentum.mjs). Pure functions, no DOM, no network; loads in the browser
 * (window.MomentumEngine) or from Node (module.exports).
 *
 * Rules (every number is a parameter in DEFAULTS and a convention until the backtest says otherwise):
 *   Momentum    = return over `lookback` bars ending `skip` bars ago (the most recent month is skipped: short-term
 *                 reversal is the best-documented wrinkle in the momentum literature), divided by the stock's daily
 *                 volatility over the same window when `volAdjust` is on, so a steady riser outranks a lottery ticket.
 *   Eligible    = full price history for the window, average turnover over 20 bars ≥ `minTurnover` ₹ crore,
 *                 and not more than `maxOffHigh` % below its 252-bar high (a name that has already broken is not momentum).
 *   Gate        = Nifty close above its `gateSma`-day average. Gate closed → no new buys; holdings exit on their own rules.
 *   Portfolio   = top `topN` eligible names by momentum, equal weight. Rebalance every `rebalance` bars: sell anything
 *                 that has fallen below rank `holdRank` (hysteresis: you leave later than you entered), fill the free
 *                 slots from the top of the list. Between rebalances the only exit is the `trail` % stop from the
 *                 highest close since entry, checked daily. A position is also closed if its sector would exceed
 *                 `maxPerSector` names.
 *   Sizing      = `compound: false` (default): every slot is starting capital ÷ topN for the whole run, profits sit as
 *                 cash. `compound: true`: on each rebalance day the slot for new buys is current equity (cash + open
 *                 positions at that close) ÷ topN, so profits are reinvested and losses shrink the next buys. Changes
 *                 the measurement, not the rules: ranks, gate, stops and exits are identical in both modes.
 *   Refill      = `refill: 'rebalance'` (default): a slot freed by a trailing stop stays empty until the next rebalance, and
 *                 a rebalance that finds the gate closed buys nothing until the next one. `refill: 'close'`: on any day the
 *                 gate is open and the book holds fewer than topN names, rank at that close and fill the free slots from the
 *                 top of the list (same sector cap; exits unchanged — rank drops are still judged at rebalances only).
 *                 Tested 13 Nov 2026 (reports/momentum-hypotheses-2026-11-13.md); off unless the backtest earns it.
 *   Vol scaling = `volScale: false` (default). `true`: new buys are half the slot while the index's 20-bar realised
 *                 volatility is above the median of that same series over the trailing 250 bars (the momentum-crash
 *                 literature's fix; the 200-day gate is the crude version). Open positions are never resized. Same test.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root.SwingEngine || (typeof require === 'function' ? require('./engine.js') : null));
  else root.MomentumEngine = factory(root.SwingEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const DEFAULTS = { lookback: 126, skip: 21, volAdjust: false, topN: 15, holdRank: 30, rebalance: 21, trail: 20, gateSma: 200, minTurnover: 5, maxOffHigh: 20, maxPerSector: 4, costBps: 30, compound: false, refill: 'rebalance', volScale: false, volWindow: 20, volMedian: 250, volFactor: 0.5 };

  const mean = a => a.length ? a.reduce((p, c) => p + c, 0) / a.length : null;
  const stdev = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((p, c) => p + (c - m) * (c - m), 0) / (a.length - 1)); };
  function smaAt(c, n, i) { if (i + 1 < n) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) { if (c[k] == null) return null; s += c[k]; } return s / n; }

  /** Regime gate at bar i: index above its gateSma-day average, using the latest index bar within 10 bars (the daily
   *  job can lag the backfilled index series). Without usable index bars, fall back to breadth: more than half of the
   *  universe above its own 200-day average. */
  function gateAt(bars, i, P) {
    const idx = bars.index;
    if (idx) for (let j = i; j >= Math.max(0, i - 10); j--) { if (idx.c[j] == null) continue; const sma = smaAt(idx.c, P.gateSma, j); if (sma == null) break;
      return { open: idx.c[j] > sma, index: idx.c[j], sma, n: P.gateSma, asOf: bars.dates[j], source: 'index' }; }
    let above = 0, n = 0; for (const B of Object.values(bars.sym)) { const c = B.c[i]; if (c == null) continue; const sma = smaAt(B.c, 200, i); if (sma == null) continue; n++; if (c > sma) above++; }
    return n >= 50 ? { open: above / n > 0.5, breadth: above / n, n: P.gateSma, source: 'breadth' } : { open: null, source: 'none' };
  }
  /** High-volatility flag per bar for `volScale`: true when the index's realised volatility over the last `volWindow` bars
   *  (standard deviation of daily close-to-close returns) is above the median of that series over the trailing `volMedian`
   *  bars, both computed on closes up to and including bar i only. null where the series is too short or there are no index
   *  bars (→ full slot). Index days without a close carry the previous flag, as gateAt reads the latest index bar. */
  function volFlags(bars, P) {
    const N = bars.dates.length; const out = new Array(N).fill(null); const idx = bars.index; if (!idx) return out;
    const js = [], cs = []; for (let j = 0; j < N; j++) if (idx.c[j] != null) { js.push(j); cs.push(idx.c[j]); }
    const vols = new Array(cs.length).fill(null);
    for (let k = P.volWindow; k < cs.length; k++) { const r = []; for (let m = k - P.volWindow + 1; m <= k; m++) r.push(cs[m] / cs[m - 1] - 1); vols[k] = stdev(r); }
    let flag = null;
    for (let k = 0; k < cs.length; k++) {
      if (k >= P.volWindow + P.volMedian - 1 && vols[k] != null) { const w = vols.slice(k - P.volMedian + 1, k + 1).filter(v => v != null).sort((a, b) => a - b);
        if (w.length) { const med = w.length % 2 ? w[(w.length - 1) / 2] : (w[w.length / 2 - 1] + w[w.length / 2]) / 2; flag = vols[k] > med; } }
      const from = js[k], to = k + 1 < js.length ? js[k + 1] : N; for (let j = from; j < to; j++) out[j] = flag;
    }
    return out;
  }
  /** Rank the universe as of bar index i. Returns {date, gate, ranked, eligible, universe}.
   *  `filter(sym, date)` → false drops a symbol before ranking (point-in-time index membership); the gate is unaffected. */
  function rankAt(bars, i, params, custom, filter) {
    const P = Object.assign({}, DEFAULTS, params || {}); const date = bars.dates[i];
    const gate = gateAt(bars, i, P);
    const rows = [];
    for (const [s, B] of Object.entries(bars.sym)) {
      if (filter && !filter(s, date)) continue;
      const end = i - P.skip, start = end - P.lookback; if (start < 0) continue;
      const c = B.c; if (c[i] == null || c[end] == null || c[start] == null) continue;
      const rets = []; let ok = true, hi = null;
      for (let k = start + 1; k <= end; k++) { if (c[k] == null || c[k - 1] == null) { ok = false; break; } rets.push(c[k] / c[k - 1] - 1); }
      if (!ok) continue;
      for (let k = Math.max(0, i - 251); k <= i; k++) if (c[k] != null && (hi == null || c[k] > hi)) hi = c[k];
      const turn = []; for (let k = Math.max(0, i - 19); k <= i; k++) if (B.t && B.t[k] != null) turn.push(B.t[k]);
      const ret = c[end] / c[start] - 1; const vol = stdev(rets); const ret6 = c[i - 126] != null ? c[i] / c[i - 126] - 1 : null; const ret12 = c[i - 252] != null ? c[i] / c[i - 252] - 1 : null;
      const ret1 = c[i - 21] != null ? c[i] / c[i - 21] - 1 : null;
      const score = P.volAdjust ? (vol ? ret / (vol * Math.sqrt(252)) : null) : ret;
      const offHigh = hi ? (hi - c[i]) / hi * 100 : null; const avgTurn = turn.length ? mean(turn) : null;
      const why = []; if (avgTurn != null && avgTurn < P.minTurnover) why.push(`turnover ₹${avgTurn.toFixed(1)} cr < ${P.minTurnover}`); if (offHigh != null && offHigh > P.maxOffHigh) why.push(`${offHigh.toFixed(0)}% off its high`); if (score == null) why.push('no score');
      rows.push({ sym: s, sector: E ? E.sectorOf(s, custom) : 'Unmapped', ltp: c[i], ret, vol: vol != null ? vol * Math.sqrt(252) : null, score, ret1, ret6, ret12, offHigh, avgTurn, eligible: !why.length, why: why.join(', '), sma200: smaAt(c, 200, i) });
    }
    const eligible = rows.filter(r => r.eligible).sort((a, b) => b.score - a.score); eligible.forEach((r, k) => (r.rank = k + 1));
    return { date, gate, ranked: eligible, universe: rows, params: P };
  }

  /** The list to show / act on today: top N (respecting the per-sector cap) plus the gate. */
  function selectAt(bars, i, params, custom, filter) {
    const R = rankAt(bars, i, params, custom, filter); const P = R.params; const bySec = {}; const picks = [];
    for (const r of R.ranked) { const n = bySec[r.sector] || 0; if (n >= P.maxPerSector) { r.skipped = 'sector cap'; continue; } bySec[r.sector] = n + 1; picks.push(r); if (picks.length >= P.topN) break; }
    return Object.assign(R, { picks });
  }

  /** Walk-forward simulation over bars. Returns {trades, equity, params, warmup}. Equal weight = capital / topN per name,
   *  or current equity / topN at each rebalance when P.compound is on. Each equity point carries `invested` (open
   *  positions at that close) so the share of equity actually at work can be read off the curve.
   *  opts.filter(sym, date): point-in-time universe (see rankAt); a holding that drops out of it is unranked at the next
   *  rebalance and leaves as 'ineligible', like any other name that fails the screen. opts.stale = N: a holding with no
   *  close for N bars in a row (a delisting or suspension once past members' bars are loaded) is closed at its last
   *  close as 'stopped trading'; off by default (0), because on today's constituents a long run of missing bars is a
   *  hole in the history files, and the plain run should not change for a membership feature. */
  function simulate(bars, params, custom, opts) {
    const P = Object.assign({}, DEFAULTS, params || {}); const N = bars.dates.length; const warmup = P.lookback + P.skip + 1; opts = opts || {}; const filter = opts.filter || null; const stale = opts.stale || 0;
    const from = opts.from || '0000-00-00', to = opts.to || '9999-99-99'; const capital = opts.capital || 500000; let slot = capital / P.topN;
    const open = {}; const trades = []; const equity = []; let cash = capital; let lastReb = -Infinity; const cost = px => px * P.costBps / 2 / 10000;
    const close = (sym, i, px, reason) => { const p = open[sym]; const exitPx = px - cost(px); const pnl = (exitPx - p.entry) * p.qty; cash += exitPx * p.qty;
      trades.push({ sym, sector: p.sector, entryDate: bars.dates[p.i], exitDate: bars.dates[i], entry: +p.entry.toFixed(2), exit: +exitPx.toFixed(2), qty: p.qty, bars: i - p.i, ret: +((exitPx / p.entry - 1) * 100).toFixed(2), pnl: +pnl.toFixed(0), rankIn: p.rank, reason, fill: p.fill, size: p.size }); delete open[sym]; };
    const vflag = P.volScale ? volFlags(bars, P) : null;   // high-volatility flag per bar, closes up to that bar only
    const marked = i => { let mv = cash; for (const sym of Object.keys(open)) { const c = bars.sym[sym].c[i]; mv += (c != null ? c : open[sym].entry) * open[sym].qty; } return mv; };
    // Buy from the top of the ranking into the free slots: sector cap, then the slot (half of it while volatility is high), then the cash left.
    const fill = (R, i, how) => { const bySec = {}; for (const sym of Object.keys(open)) bySec[open[sym].sector] = (bySec[open[sym].sector] || 0) + 1;
      const half = !!(vflag && vflag[i]); const size = slot * (half ? P.volFactor : 1);
      for (const r of R.ranked) { if (Object.keys(open).length >= P.topN) break; if (open[r.sym]) continue; if ((bySec[r.sector] || 0) >= P.maxPerSector) continue;
        const px = r.ltp + cost(r.ltp); const qty = Math.floor(Math.min(size, cash) / px); if (qty < 1) continue;
        cash -= qty * px; bySec[r.sector] = (bySec[r.sector] || 0) + 1; open[r.sym] = { entry: px, qty, i, peak: r.ltp, last: r.ltp, gap: 0, sector: r.sector, rank: r.rank, fill: how, size: half ? 'half' : 'full' }; } };
    let lastI = N - 1;   // last bar inside the window: positions still open there are closed at that close, not at the end of the whole history
    for (let i = warmup; i < N; i++) {
      const date = bars.dates[i]; if (date < from || date > to) continue; lastI = i;
      // 1. daily: trailing stops on open positions, marked on today's close
      for (const sym of Object.keys(open)) { const p = open[sym]; const c = bars.sym[sym].c[i];
        if (c == null) { if (stale && ++p.gap >= stale) close(sym, i, p.last, 'stopped trading'); continue; } p.gap = 0; p.last = c; p.peak = Math.max(p.peak, c);
        if (c < p.peak * (1 - P.trail / 100)) close(sym, i, c, 'trailing stop'); }
      // 2. rebalance day: rank, drop names below holdRank (or ineligible), fill free slots if the gate is open
      const gate = gateAt(bars, i, P);
      if (i - lastReb >= P.rebalance) { lastReb = i; const R = selectAt(bars, i, P, custom, filter); const rankOf = {}; R.ranked.forEach(r => (rankOf[r.sym] = r.rank));
        for (const sym of Object.keys(open)) { const rk = rankOf[sym]; const c = bars.sym[sym].c[i]; if (c == null) continue;
          if (rk == null) close(sym, i, c, 'ineligible'); else if (rk > P.holdRank) close(sym, i, c, 'rank ' + rk); }
        if (P.compound) slot = marked(i) / P.topN;
        if (R.gate.open !== false) fill(R, i, 'rebalance'); }
      // 2b. refill: 'close' — any other day the gate is open and the book is short, rank at this close and fill the free slots
      else if (P.refill === 'close' && gate.open !== false && Object.keys(open).length < P.topN) { const R = selectAt(bars, i, P, custom, filter);
        if (P.compound) slot = marked(i) / P.topN; fill(R, i, 'refill'); }
      let inv = 0; for (const sym of Object.keys(open)) { const c = bars.sym[sym].c[i]; inv += (c != null ? c : open[sym].entry) * open[sym].qty; } const mv = cash + inv;
      equity.push({ date, value: +mv.toFixed(0), invested: +inv.toFixed(0), positions: Object.keys(open).length, gate: gate.open, index: bars.index ? bars.index.c[i] : null, volHigh: P.volScale ? vflag[i] : undefined });
    }
    for (const sym of Object.keys(open)) { const i = lastI; const c = bars.sym[sym].c[i]; close(sym, i, c != null ? c : open[sym].last, 'end of data'); }   // (13 Nov 2026: was N - 1 even with --to, so a windowed run's last trades were marked at the final bar of the whole history)
    return { trades, equity, params: P, warmup, capital };
  }

  function stats(sim) {
    const eq = sim.equity; if (!eq.length) return { n: 0 };
    const v0 = eq[0].value, v1 = eq[eq.length - 1].value; const years = eq.length / 250; const cagr = years > 0 ? Math.pow(v1 / v0, 1 / years) - 1 : 0;
    let peak = -Infinity, dd = 0; for (const e of eq) { peak = Math.max(peak, e.value); dd = Math.max(dd, (peak - e.value) / peak); }
    const i0 = eq.find(e => e.index != null), i1 = [...eq].reverse().find(e => e.index != null); const idxRet = i0 && i1 ? i1.index / i0.index - 1 : null;
    const dr = []; for (let k = 1; k < eq.length; k++) dr.push(eq[k].value / eq[k - 1].value - 1); const sd = stdev(dr); const sharpe = sd ? mean(dr) / sd * Math.sqrt(250) : null;
    const t = sim.trades; const wins = t.filter(x => x.pnl > 0); const byReason = {}; for (const x of t) byReason[x.reason.replace(/^rank \d+$/, 'rank drop')] = (byReason[x.reason.replace(/^rank \d+$/, 'rank drop')] || 0) + 1;
    const byYear = {}; for (let k = 1; k < eq.length; k++) { const y = eq[k].date.slice(0, 4); const b = byYear[y] || (byYear[y] = { start: eq[k - 1].value, end: 0, idx0: eq[k - 1].index, idx1: null }); b.end = eq[k].value; b.idx1 = eq[k].index; }
    const inMarket = eq.filter(e => e.positions > 0).length / eq.length;
    const atWork = eq[0].invested != null ? mean(eq.map(e => e.value ? e.invested / e.value : 0)) : null;   // average share of equity in open positions
    const refills = t.filter(x => x.fill === 'refill').length, halfSized = t.filter(x => x.size === 'half').length;   // 13 Nov 2026 options; both 0 at the defaults
    const volHighDays = eq.some(e => e.volHigh != null) ? eq.filter(e => e.volHigh === true).length / eq.length : null;
    return { atWork, refills, halfSized, volHighDays, n: t.length, days: eq.length, start: eq[0].date, end: eq[eq.length - 1].date, totalReturn: v1 / v0 - 1, cagr, maxDrawdown: dd, sharpe, indexReturn: idxRet, winRate: t.length ? wins.length / t.length : null,
      avgWin: wins.length ? mean(wins.map(x => x.ret)) : null, avgLoss: t.length - wins.length ? mean(t.filter(x => x.pnl <= 0).map(x => x.ret)) : null, avgBars: t.length ? mean(t.map(x => x.bars)) : null, byReason, byYear, inMarket, final: v1 };
  }

  /** Text block for the Telegram digest. */
  function digest(sel, fmt) {
    const f = fmt || (n => Number(n).toFixed(2)); const L = [];
    L.push(`MOMENTUM (${sel.params.lookback}-bar, skip ${sel.params.skip}, top ${sel.params.topN}) — gate ${sel.gate.open == null ? 'n/a' : sel.gate.open ? 'OPEN' : 'CLOSED'}${sel.gate.sma != null ? ` (Nifty ${f(sel.gate.index)} vs ${sel.gate.n}-day ${f(sel.gate.sma)})` : sel.gate.breadth != null ? ` (${Math.round(sel.gate.breadth * 100)}% of stocks above their 200-day)` : ''}`);
    if (sel.gate.open === false) L.push('• no new buys while the index is below its average; holdings exit on trailing stops');
    sel.picks.slice(0, sel.params.topN).forEach(r => L.push(`• #${r.rank} ${r.sym} — 6m ${r.ret6 != null ? (r.ret6 * 100).toFixed(0) + '%' : '—'}, 1m ${r.ret1 != null ? (r.ret1 * 100).toFixed(0) + '%' : '—'}, ${r.offHigh.toFixed(0)}% off high`));
    if (!sel.picks.length) L.push('• not enough history yet');
    return L.join('\n');
  }

  return { DEFAULTS, gateAt, rankAt, selectAt, simulate, stats, digest, smaAt, volFlags };
});
