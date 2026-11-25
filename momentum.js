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
 *                 highest close since entry, checked daily. A holding that is no longer on the ranked list at a rebalance
 *                 — it fails the Eligible screen, or has left the point-in-time universe — is sold there as 'ineligible'
 *                 (about one exit in six in the ten-year run). `maxPerSector` caps new buys only; nothing is sold for it.
 *   Sizing      = `compound: false` (default): every slot is starting capital ÷ topN for the whole run, profits sit as
 *                 cash. `compound: true`: on each rebalance day the slot for new buys is current equity (cash + open
 *                 positions at that close) ÷ topN, so profits are reinvested and losses shrink the next buys. Changes
 *                 the measurement, not the rules: ranks, gate, stops and exits are identical in both modes.
 *   Refill      = `refill: 'rebalance'` (the 12 Nov rules; `'close'` is the default since 13 Nov): a slot freed by a trailing stop stays empty until the next rebalance, and
 *                 a rebalance that finds the gate closed buys nothing until the next one. `refill: 'close'`: on any day the
 *                 gate is open and the book holds fewer than topN names, rank at that close and fill the free slots from the
 *                 top of the list (same sector cap; exits unchanged — rank drops are still judged at rebalances only).
 *                 Tested 13 Nov 2026 (reports/momentum-hypotheses-2026-11-13.md, momentum-refinements-2026-11-13-adjusted-members.md).
 *   Vol scaling = `volScale: true` (default). New buys are half the slot while the index's 20-bar realised volatility is above
 *                 the median of that same series over the trailing 250 bars (the momentum-crash literature's fix; the 200-day
 *                 gate is the crude version). Open positions are never resized. Same test.
 *                 Owner's decision, 13 Nov 2026: both switches ON as the engine's rules. The engine did not beat the momentum
 *                 index fund on return from any start in 2020 or later, so the fund is the holding; the engine runs as a paper
 *                 book (paperBook below, started 13 Nov 2026 by the daily job) beside the fund, to see whether the live record
 *                 agrees. The 12 Nov verdict figures (switches off) stay reproducible with refill=rebalance volScale=false.
 *   Trade-for-trade (A22, 25 Nov 2026) = reported, not acted on. A share NSE has moved to BE or BZ trades inside a 5% daily band with
 *                 no intraday trading; locked at the lower band it has sellers and no buyers, and the close the book sells at is not
 *                 a price anyone had (the same for a purchase at the upper band). The paper books say which holdings are in such a
 *                 series and which of their purchases and sales were made on a day the share closed at its band (bandAt, t2tReport).
 *                 No rule reads any of it: the fill rule is a hypothesis to be written and tested first (README, A22, step 2).
 *   Band fill   = `bandFill: 'off'` (default: bought and sold at the close, as every report before 25 Nov 2026). `'both'`: a sale that
 *                 falls due on a day the share is in trade-for-trade and closed at its lower band is not made; it is tried again at
 *                 every later close the share has, and made at the first that is not at the lower band, whatever the stop or the
 *                 rank says by then. A purchase of a share that closed at its upper band is not made either; its slot stays empty
 *                 for the day and is filled, or not, by the usual rules at the next close. `'sell'`: the sale half only. Acts only
 *                 on days whose series are on record (bandAt). Hypothesis written before any run on real series:
 *                 reports/momentum-fill-hypothesis-2026-11-25.md. The paper books do not take it: their rules were fixed on 23 Nov.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root.SwingEngine || (typeof require === 'function' ? require('./engine.js') : null));
  else root.MomentumEngine = factory(root.SwingEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const DEFAULTS = { lookback: 126, skip: 21, volAdjust: false, topN: 15, holdRank: 30, rebalance: 21, trail: 20, gateSma: 200, gateHoles: 5, gateUnknown: 'open', minTurnover: 5, maxOffHigh: 20, maxPerSector: 4, costBps: 30, compound: false, refill: 'close', volScale: true, volWindow: 20, volMedian: 250, volFactor: 0.5, bandFill: 'off' };

  const BAND = 4.9;   // percent from the previous close at which a trade-for-trade share is read as at its band (bandAt)
  const mean = a => a.length ? a.reduce((p, c) => p + c, 0) / a.length : null;
  const stdev = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((p, c) => p + (c - m) * (c - m), 0) / (a.length - 1)); };
  function smaAt(c, n, i) { if (i + 1 < n) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) { if (c[k] == null) return null; s += c[k]; } return s / n; }
  /** The same average when the window has a hole in it (audit A8, 21 Nov 2026): the last n closes on file ending at bar i, stepping over
   *  at most `maxHoles` bars whose close is missing. null when more are missing or the series is too short. One missing close moves a
   *  200-day average by (the close 200 sessions earlier − the missing close) ÷ 200 — under a tenth of a percent of the level — and the
   *  step-over ends the day the bar is repaired (the daily job retries at every run), so nothing accumulates. volFlags below has always
   *  read the index this way. */
  function smaOver(c, n, i, maxHoles) { let s = 0, got = 0, holes = 0; for (let k = i; k >= 0 && got < n; k--) { if (c[k] == null) { if (++holes > maxHoles) return null; continue; } s += c[k]; got++; } return got === n ? { sma: s / n, holes } : null; }

  /** Regime gate at bar i: index above its gateSma-day average, using the latest index bar within 10 bars (the daily
   *  job can lag the backfilled index series). A window with up to `gateHoles` (5) missing index closes is averaged over the
   *  closes on file (smaOver) and the answer carries `holes` — until 21 Nov 2026 one missing bar sent the gate to the breadth
   *  fallback for the next 200 bars (26 Oct – 5 Nov 2026: breadth said closed on a day the index was above its average). With
   *  a complete series the result is the old one to the last digit. Without usable index bars, fall back to breadth: more
   *  than half of the universe above its own 200-day average. An unknown gate (`open: null` — neither exists, the first 51
   *  days of the ten-year window) is treated as open by simulate and as closed by scripts/backtest.mjs; see the README, A9. */
  function gateAt(bars, i, P) {
    const idx = bars.index; const maxHoles = P.gateHoles != null ? P.gateHoles : DEFAULTS.gateHoles;
    if (idx) for (let j = i; j >= Math.max(0, i - 10); j--) { if (idx.c[j] == null) continue; let sma = smaAt(idx.c, P.gateSma, j), holes = 0;
      if (sma == null && maxHoles > 0) { const t = smaOver(idx.c, P.gateSma, j, maxHoles); if (t) { sma = t.sma; holes = t.holes; } }
      if (sma == null) break;
      return Object.assign({ open: idx.c[j] > sma, index: idx.c[j], sma, n: P.gateSma, asOf: bars.dates[j], source: 'index' }, holes ? { holes } : null); }
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
   *  hole in the history files, and the plain run should not change for a membership feature. opts.cache = a Map: the day's
   *  ranking is kept there by bar number and reused — for runs that differ only in their start day (the twenty-one paper
   *  books), where bars, parameters, sector map and filter are the same and the ranking at a close is therefore the same
   *  object. The caller answers for that; without the option nothing is kept. */
  function simulate(bars, params, custom, opts) {
    const P = Object.assign({}, DEFAULTS, params || {}); const N = bars.dates.length; const warmup = P.lookback + P.skip + 1; opts = opts || {}; const filter = opts.filter || null; const stale = opts.stale || 0;
    const from = opts.from || '0000-00-00', to = opts.to || '9999-99-99'; const capital = opts.capital || 500000; let slot = capital / P.topN;
    const open = {}; const trades = []; const equity = []; let cash = capital; let lastReb = -Infinity; const cost = px => px * P.costBps / 2 / 10000;
    const close = (sym, i, px, reason) => { const p = open[sym]; const exitPx = px - cost(px); const pnl = (exitPx - p.entry) * p.qty; cash += exitPx * p.qty;
      trades.push(Object.assign({ sym, sector: p.sector, entryDate: bars.dates[p.i], exitDate: bars.dates[i], entry: +p.entry.toFixed(2), exit: +exitPx.toFixed(2), qty: p.qty, bars: i - p.i, ret: +((exitPx / p.entry - 1) * 100).toFixed(2), pnl: +pnl.toFixed(0), rankIn: p.rank, reason, fill: p.fill, size: p.size, peak: +p.peak.toFixed(2) }, p.due != null ? { deferred: i - p.due, dueDate: bars.dates[p.due] } : null)); delete open[sym]; };
    // Band fill (A22 step 2): `sell` asks for a sale; with bandFill on, a share locked at its lower band is not sold today — the sale stays due
    // (p.due = the day it first fell due, p.dueReason) and is tried at every later close the share has. Off, sell is close.
    const bf = P.bandFill === 'both' || P.bandFill === 'sell' ? P.bandFill : null; const unfilled = { sells: 0, sellDays: 0, buys: 0 };
    const lockedAt = (sym, i, side) => !!bf && (side === 'sell' || bf === 'both') && bandAt(bars, sym, i).band === (side === 'sell' ? 'lower' : 'upper');
    const sell = (sym, i, px, reason) => { const p = open[sym]; if (lockedAt(sym, i, 'sell')) { if (p.due == null) { p.due = i; p.dueReason = reason; unfilled.sells++; } unfilled.sellDays++; return false; } close(sym, i, px, p.due != null ? p.dueReason : reason); return true; };
    const vflag = P.volScale ? volFlags(bars, P) : null;   // high-volatility flag per bar, closes up to that bar only
    const cache = opts.cache || null; const select = i => { if (!cache) return selectAt(bars, i, P, custom, filter); let R = cache.get(i); if (!R) cache.set(i, R = selectAt(bars, i, P, custom, filter)); return R; };
    const marked = i => { let mv = cash; for (const sym of Object.keys(open)) { const c = bars.sym[sym].c[i]; mv += (c != null ? c : open[sym].entry) * open[sym].qty; } return mv; };
    // Buy from the top of the ranking into the free slots: sector cap, then the slot (half of it while volatility is high), then the cash left.
    const fill = (R, i, how) => { const bySec = {}; for (const sym of Object.keys(open)) bySec[open[sym].sector] = (bySec[open[sym].sector] || 0) + 1;
      const half = !!(vflag && vflag[i]); const size = slot * (half ? P.volFactor : 1);
      let held = 0;   // slots kept empty today for a purchase that could not be made (band fill)
      for (const r of R.ranked) { if (Object.keys(open).length + held >= P.topN) break; if (open[r.sym]) continue; if ((bySec[r.sector] || 0) >= P.maxPerSector) continue;
        if (lockedAt(r.sym, i, 'buy')) { held++; unfilled.buys++; continue; }
        const px = r.ltp + cost(r.ltp); const qty = Math.floor(Math.min(size, cash) / px); if (qty < 1) continue;
        cash -= qty * px; bySec[r.sector] = (bySec[r.sector] || 0) + 1; open[r.sym] = { entry: px, qty, i, peak: r.ltp, last: r.ltp, gap: 0, sector: r.sector, rank: r.rank, fill: how, size: half ? 'half' : 'full' }; } };
    let lastI = N - 1;   // last bar inside the window: positions still open there are closed at that close, not at the end of the whole history
    for (let i = warmup; i < N; i++) {
      const date = bars.dates[i]; if (date < from || date > to) continue; lastI = i;
      // 1. daily: trailing stops on open positions, marked on today's close
      for (const sym of Object.keys(open)) { const p = open[sym]; const c = bars.sym[sym].c[i];
        if (c == null) { if (stale && ++p.gap >= stale) close(sym, i, p.last, 'stopped trading'); continue; } p.gap = 0; p.last = c; p.peak = Math.max(p.peak, c);
        if (p.due != null) { sell(sym, i, c, p.dueReason); continue; }   // a sale already due: made today unless the share is at its lower band again
        if (c < p.peak * (1 - P.trail / 100)) sell(sym, i, c, 'trailing stop'); }
      // 2. rebalance day: rank, drop names below holdRank (or ineligible), fill free slots if the gate is open
      // (an unknown gate — no 200-day average and no breadth yet, the first 51 days of the ten-year window — counts as open: `gateUnknown: 'open'`,
      //  the behaviour every report on record was made with; 'closed' is the fail-safe reading, kept as a switch so the difference stays measurable — README, A9)
      const gateOK = g => g.open === true || (g.open == null && P.gateUnknown !== 'closed');
      const gate = gateAt(bars, i, P);
      if (i - lastReb >= P.rebalance) { lastReb = i; const R = select(i); const rankOf = {}; R.ranked.forEach(r => (rankOf[r.sym] = r.rank));
        for (const sym of Object.keys(open)) { const rk = rankOf[sym]; const c = bars.sym[sym].c[i]; if (c == null || open[sym].due != null) continue;   // a sale already due was tried above
          if (rk == null) sell(sym, i, c, 'ineligible'); else if (rk > P.holdRank) sell(sym, i, c, 'rank ' + rk); }
        if (P.compound) slot = marked(i) / P.topN;
        if (gateOK(R.gate)) fill(R, i, 'rebalance'); }
      // 2b. refill: 'close' — any other day the gate is open and the book is short, rank at this close and fill the free slots
      else if (P.refill === 'close' && gateOK(gate) && Object.keys(open).length < P.topN) { const R = select(i);
        if (P.compound) slot = marked(i) / P.topN; fill(R, i, 'refill'); }
      let inv = 0; for (const sym of Object.keys(open)) { const c = bars.sym[sym].c[i]; inv += (c != null ? c : open[sym].entry) * open[sym].qty; } const mv = cash + inv;
      equity.push({ date, value: +mv.toFixed(0), invested: +inv.toFixed(0), positions: Object.keys(open).length, gate: gate.open, index: bars.index ? bars.index.c[i] : null, volHigh: P.volScale ? vflag[i] : undefined });
    }
    for (const sym of Object.keys(open)) { const i = lastI; const c = bars.sym[sym].c[i]; close(sym, i, c != null ? c : open[sym].last, 'end of data'); }   // (13 Nov 2026: was N - 1 even with --to, so a windowed run's last trades were marked at the final bar of the whole history)
    // seriesDays: the days of the run whose series are on record — the only days band fill can act on (and bandAt can speak of)
    let seriesDays = 0; for (const e of equity) if (bars.series && bars.series[e.date]) seriesDays++;
    return { trades, equity, params: P, warmup, capital, unfilled, seriesDays };
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
    const band = { mode: sim.params.bandFill || 'off', seriesDays: sim.seriesDays || 0, unfilled: sim.unfilled || { sells: 0, sellDays: 0, buys: 0 }, deferred: t.filter(x => x.deferred > 0).length, deferredBars: t.reduce((p, x) => p + (x.deferred || 0), 0) };   // A22 step 2
    return { band, atWork, refills, halfSized, volHighDays, n: t.length, days: eq.length, start: eq[0].date, end: eq[eq.length - 1].date, totalReturn: v1 / v0 - 1, cagr, maxDrawdown: dd, sharpe, indexReturn: idxRet, winRate: t.length ? wins.length / t.length : null,
      avgWin: wins.length ? mean(wins.map(x => x.ret)) : null, avgLoss: t.length - wins.length ? mean(t.filter(x => x.pnl <= 0).map(x => x.ret)) : null, avgBars: t.length ? mean(t.map(x => x.bars)) : null, byReason, byYear, inMarket, final: v1 };
  }

  /** Trade-for-trade (A22, 25 Nov 2026). What the series on record says about one symbol on bar i:
   *  { series, t2t, pct, band } — series: E.seriesAt (null = not recorded that day); t2t: true in BE / BZ, false in any other series,
   *  null when the series is not on record; pct: the close against the close of the bar before, in percent (null without both);
   *  band: 'lower' | 'upper' when the share is in trade-for-trade and closed BAND percent or more from the previous close, else null.
   *  BAND is 4.9, the figure the 23 Nov count was made with (reports/series-fill-2026-11-23.md): the band is 5% and the band price is
   *  rounded to a tick. A share NSE holds to a 2% band is not seen by this — the market-watch row carries the series, not the band. */
  function bandAt(bars, sym, i) {
    const series = E && E.seriesAt ? E.seriesAt(bars, sym, i) : null; const t2t = series == null ? null : E.T2T.includes(series);
    const B = bars.sym[sym]; const c = B ? B.c[i] : null, pc = B && i > 0 ? B.c[i - 1] : null; const pct = c != null && pc > 0 ? (c / pc - 1) * 100 : null;
    return { series, t2t, pct: pct == null ? null : +pct.toFixed(2), band: t2t && pct != null ? (pct <= -BAND ? 'lower' : pct >= BAND ? 'upper' : null) : null };
  }
  /** One book's trades (simulate's list, open positions included as 'end of data') read against the series on record. Nothing here
   *  changes a trade. Returns { days, known, from, held, fills, doubtful, pnl, profit, share }:
   *  days / known / from / today — the book's sessions, how many of them have the series on record, the first that has, and whether today's has;
   *  held        — today's holdings in trade-for-trade: [{ sym, series, band, pct, since }] (since = first day of the present run in BE / BZ while held);
   *  fills       — every purchase or sale made on a day the share was in trade-for-trade and closed at its band:
   *                [{ sym, side: 'buy' | 'sell', date, series, band, pct, doubtful }]; doubtful = a sale at the lower band or a purchase
   *                at the upper one, the two the close may not have filled;
   *  pnl / profit / share — rupee profit (closed and open) of the trades that spent at least one held day in trade-for-trade, the
   *                book's whole profit, and the first over the second (null unless the book is in profit — a share of a loss says nothing). */
  function t2tReport(bars, trades, eq, capital) {
    const pos = {}; bars.dates.forEach((d, i) => (pos[d] = i)); const last = bars.dates.length - 1; const today = bars.dates[last];
    const i0 = eq.length ? pos[eq[0].date] : last; let known = 0, from = null; for (let i = i0; i <= last; i++) if (bars.series && bars.series[bars.dates[i]]) { known++; if (!from) from = bars.dates[i]; }
    const held = [], fills = []; let pnl = 0;
    for (const t of trades) { const a = pos[t.entryDate], openNow = t.reason === 'end of data' && t.exitDate === today; const b = pos[t.exitDate]; if (a == null || b == null) continue;
      let any = false, since = null; for (let i = a; i <= b; i++) { const x = bandAt(bars, t.sym, i); if (x.t2t) { any = true; if (!since) since = bars.dates[i]; } else if (x.t2t === false) since = null; }
      if (any) pnl += t.pnl;
      const atIn = bandAt(bars, t.sym, a); if (atIn.band) fills.push({ sym: t.sym, side: 'buy', date: t.entryDate, series: atIn.series, band: atIn.band, pct: atIn.pct, doubtful: atIn.band === 'upper' });
      const atOut = bandAt(bars, t.sym, b);
      if (openNow) { if (atOut.t2t) held.push({ sym: t.sym, series: atOut.series, band: atOut.band, pct: atOut.pct, since }); }
      else if (atOut.band) fills.push({ sym: t.sym, side: 'sell', date: t.exitDate, series: atOut.series, band: atOut.band, pct: atOut.pct, doubtful: atOut.band === 'lower' }); }
    const profit = eq.length ? eq[eq.length - 1].value - capital : 0;
    return { days: eq.length, known, from, today: !!(bars.series && bars.series[today]), held: held.sort((x, y) => x.sym.localeCompare(y.sym)), fills: fills.sort((x, y) => x.date.localeCompare(y.date) || x.sym.localeCompare(y.sym)), doubtful: fills.filter(f => f.doubtful).length, pnl: +pnl.toFixed(0), profit: +profit.toFixed(0), share: profit > 0 ? +(pnl / profit).toFixed(4) : null };
  }

  /** The paper book (13 Nov 2026): the engine's rules run forward from `opts.from` on the live history, exactly as the
   *  backtest runs them — a fresh book of `opts.capital` bought at the first close on or after `from`, then rebalances,
   *  stops, refills and half-size buys day by day — so the daily job can print what the book holds, what it did today and
   *  how it stands against the index funds since that day, with no human input and nothing to reconcile. Reinvested
   *  (compound: true) unless params say otherwise, because that is the row the indices are compared with.
   *  opts.benchmarks = { 'NIFTY500 MOMENTUM 50': { 'YYYY-MM-DD': close, ... }, ... } — price-index closes saved by the job;
   *  NIFTY 50 comes from bars.index. Each is measured from the first close it has on or after the book's first day.
   *  Returns null before the first day exists in the bars. */
  function paperBook(bars, params, custom, opts) {
    opts = opts || {}; const P = Object.assign({}, DEFAULTS, { compound: true }, params || {}, { bandFill: 'off' }); const from = opts.from; if (!from) return null;   // bandFill off whatever the parameters say: the books' rules were fixed on 23 Nov 2026, before the fill rule existed (owner, 25 Nov)
    const N = bars.dates.length; const last = N - 1; const today = bars.dates[last]; if (!N || today < from) return null;
    const sim = simulate(bars, P, custom, { from, capital: opts.capital || 500000, stale: 20, filter: opts.filter || null, cache: opts.cache || null }); const eq = sim.equity; if (!eq.length) return null;   // opts.filter (19 Nov 2026, audit A6): the point-in-time membership the backtest ranks on, so a name that leaves the index is sold at the next rebalance as 'ineligible', as it is there
    const i0 = bars.dates.indexOf(eq[0].date); const value = eq[eq.length - 1].value; const st = stats(sim);
    const positions = sim.trades.filter(t => t.reason === 'end of data' && t.exitDate === today).map(t => { const B = bars.sym[t.sym]; const lastPx = B && B.c[last] != null ? B.c[last] : t.exit;
      let lb = last; while (B && lb > 0 && B.c[lb] == null) lb--;   // the last day this holding has a bar: not today when the daily job no longer gets it (it left the index, or stopped trading)
      return { lastBar: bars.dates[lb], noBar: lb !== last, sym: t.sym, sector: t.sector, entryDate: t.entryDate, entry: t.entry, qty: t.qty, last: lastPx, peak: t.peak, stop: +(t.peak * (1 - P.trail / 100)).toFixed(2), ret: +((lastPx / t.entry - 1) * 100).toFixed(2), bars: t.bars, fill: t.fill, size: t.size, rankIn: t.rankIn, series: bandAt(bars, t.sym, last).series }; }).sort((a, b) => a.sym.localeCompare(b.sym));   // series (A22): the series today's bar came from, null when not on record
    const atBand = sym => { const x = bandAt(bars, sym, last); return x.band ? { band: x.band, series: x.series, pct: x.pct } : null; };   // A22: said of a trade made today, never used to make or stop one
    const buys = sim.trades.filter(t => t.entryDate === today).map(t => Object.assign({ sym: t.sym, qty: t.qty, price: t.entry, size: t.size, fill: t.fill, rank: t.rankIn }, atBand(t.sym)));
    const sells = sim.trades.filter(t => t.exitDate === today && t.reason !== 'end of data').map(t => Object.assign({ sym: t.sym, qty: t.qty, price: t.exit, ret: t.ret, pnl: t.pnl, reason: t.reason, entryDate: t.entryDate }, atBand(t.sym)));
    const sinceReb = (last - i0) % P.rebalance; const nextRebalanceIn = sinceReb === 0 ? 0 : P.rebalance - sinceReb;
    const gate = gateAt(bars, last, P); const volHigh = P.volScale ? volFlags(bars, P)[last] : null; const slot = value / P.topN;
    const benchmarks = []; const first = eq[0].date;
    if (bars.index) { let b = null; for (let i = i0; i <= last; i++) if (bars.index.c[i] != null) { b = { date: bars.dates[i], value: bars.index.c[i] }; break; }
      if (b && bars.index.c[last] != null) benchmarks.push({ name: bars.index.name || 'NIFTY 50', from: b.date, fromValue: b.value, value: bars.index.c[last], ret: bars.index.c[last] / b.value - 1, kind: 'price index' }); }
    for (const [name, series] of Object.entries(opts.benchmarks || {})) { const ds = Object.keys(series).filter(d => d >= first && d <= today).sort(); if (!ds.length) { benchmarks.push({ name, missing: true }); continue; }
      const d0 = ds[0], d1 = ds[ds.length - 1]; benchmarks.push({ name, from: d0, fromValue: series[d0], asOf: d1, value: series[d1], ret: series[d1] / series[d0] - 1, kind: 'price index', stale: d1 !== today }); }
    const inv = eq[eq.length - 1].invested;
    const membersAge = opts.membersAsOf ? Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(opts.membersAsOf + 'T00:00:00Z')) / 86400000) : null;   // NIFTY 500 is reviewed twice a year: a list older than ~200 days has missed a review
    return { membersAsOf: opts.membersAsOf || null, membersStale: membersAge != null && membersAge > 200, from: first, to: today, days: eq.length, capital: sim.capital, value, ret: value / sim.capital - 1, maxDrawdown: st.maxDrawdown, invested: inv, investedShare: value ? inv / value : 0,
      positions, buys, sells, t2t: t2tReport(bars, sim.trades, eq, sim.capital), gate, volHigh, slot: +slot.toFixed(0), halfSize: volHigh === true, nextRebalanceIn, trades: sim.trades.filter(t => t.reason !== 'end of data').length, params: P, benchmarks, equity: eq.map(e => ({ date: e.date, value: e.value, invested: e.invested, positions: e.positions })) };
  }
  /** The twenty-one paper books (A21; owner's decision 21 Nov 2026, built 23 Nov). The engine rebalances every 21 bars from its
   *  first day, so one book is one draw of 21 (reports/momentum-phases-2026-11-21-adjusted-members.md: 12.7% to 21.6% a year on the
   *  same rules). Book 1 is the paper book above, unchanged, from opts.from; books 2…n are the same rules and the same capital
   *  started at the close of each of the next n − 1 sessions on file. Every book is a replay (paperBook), so a start day already
   *  past is replayed and one not yet reached starts by itself on its day; the day's ranking is computed once and shared.
   *  opts.starts = [dates]: the start days, frozen — once all n exist they go into config.json → paper.starts, because counted
   *  from the bars they would all move if a session were loaded later (as the weekend sessions were on 21 Nov 2026).
   *  opts.fund = the benchmark every book is read against over its own days (default: the first series in opts.benchmarks).
   *  Returns { n, started, pending, starts, fund, rows (one per started book), list (the full paperBook objects; list[0] is book 1),
   *  ret {median, min, max}, measured, G (median gap to the fund), gap {min, max}, A (books ahead), D (median drawdown gap,
   *  positive = the book fell less), L (books that fell less), readingFrom, due, reading }. The rule for the reading —
   *  what counts as ahead, and when — was written before this function: reports/momentum-books-reading-rule-2026-11-23.md. */
  const READING = { gap: 0.01, dd: 0.02, share: 2 / 3, months: 6 };   // +1.0 point at the median and two books in three (14 of 21) ahead; 2.0 points and two in three for "clearly better on drawdown"; read six calendar months after the last book starts
  const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const addMonths = (d, n) => { const t = new Date(d + 'T00:00:00Z'); const day = t.getUTCDate(); t.setUTCDate(1); t.setUTCMonth(t.getUTCMonth() + n); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(day, last)); return t.toISOString().slice(0, 10); };
  /** Largest peak-to-trough fall of a { date: close } series between two dates, both included, as a fraction. null without a close. */
  function seriesDrawdown(series, from, to) { let peak = -Infinity, dd = null; for (const d of Object.keys(series || {}).filter(x => x >= from && x <= to).sort()) { const v = series[d]; if (!(v > 0)) continue; peak = Math.max(peak, v); dd = Math.max(dd || 0, (peak - v) / peak); } return dd; }
  function paperBooks(bars, params, custom, opts) {
    opts = opts || {}; const n = opts.books > 0 ? Math.floor(opts.books) : 21; const from = opts.from; const N = bars && bars.dates ? bars.dates.length : 0; if (!from || !N) return null;
    const today = bars.dates[N - 1]; const frozen = Array.isArray(opts.starts) && opts.starts.length > 0;
    let starts; if (frozen) starts = opts.starts.slice(0, n).map(String); else { const i0 = bars.dates.findIndex(d => d >= from); starts = i0 < 0 ? [] : bars.dates.slice(i0, i0 + n); }
    const cache = opts.cache || new Map(); const fund = opts.fund || Object.keys(opts.benchmarks || {})[0] || null; const series = fund && opts.benchmarks ? opts.benchmarks[fund] : null;
    const list = [], rows = [];
    starts.forEach((d, k) => { if (d > today) return; const pb = paperBook(bars, params, custom, Object.assign({}, opts, { from: k === 0 && !frozen ? from : d, cache })); if (!pb) return;
      const fb = fund ? pb.benchmarks.find(b => b.name === fund && !b.missing) : null; const fdd = series ? seriesDrawdown(series, pb.from, pb.to) : null; const gap = fb ? pb.ret - fb.ret : null;
      list.push(pb); rows.push({ k: k + 1, from: pb.from, days: pb.days, value: pb.value, ret: pb.ret, maxDrawdown: pb.maxDrawdown, names: pb.positions.length, investedShare: pb.investedShare, trades: pb.trades, nextRebalanceIn: pb.nextRebalanceIn,
        fundRet: fb ? fb.ret : null, fundFrom: fb ? fb.from : null, fundAsOf: fb ? fb.asOf : null, fundExact: !!fb && fb.from === pb.from && !fb.stale,   // exact: the fund has a close on the book's first day and on the last one
        gap, ahead: gap == null ? null : gap > 0, fundDrawdown: fdd, ddGap: fdd == null ? null : fdd - pb.maxDrawdown, holdings: pb.positions.map(p => ({ sym: p.sym, ret: p.ret })),
        t2t: pb.t2t.held.map(h => h.sym), bandFills: pb.t2t.fills.length, t2tShare: pb.t2t.share }); });   // A22: holdings in trade-for-trade today, purchases and sales made at a band so far, and their part of the book's profit
    if (!list.length) return null;
    const rets = rows.map(r => r.ret), gaps = rows.filter(r => r.gap != null).map(r => r.gap), dds = rows.filter(r => r.ddGap != null).map(r => r.ddGap);
    const out = { n, started: rows.length, pending: n - rows.length, frozen, from: rows[0].from, to: today, starts: rows.map(r => r.from), fund, rows, list,
      ret: { median: median(rets), min: Math.min(...rets), max: Math.max(...rets) }, measured: gaps.length, G: median(gaps), gap: gaps.length ? { min: Math.min(...gaps), max: Math.max(...gaps) } : null, A: gaps.filter(g => g > 0).length,
      D: median(dds), L: dds.filter(g => g > 0).length, inexact: rows.filter(r => r.gap != null && !r.fundExact).map(r => r.k) };
    out.readingFrom = rows.length === n ? addMonths(rows[n - 1].from, READING.months) : null; out.due = !!out.readingFrom && today >= out.readingFrom; out.reading = booksReading(out);
    out.t2t = booksT2T(out);
    return out;
  }
  /** The books' trade-for-trade record in one object (A22): { days, known, from, today, held, fills, doubtful, share }.
   *  days / known / from — book 1's sessions (the longest book), how many have the series on record, and the first that has; today — whether today's is;
   *  held  — [{ sym, series, band, pct, since, books: [k…] }]: names held today in BE / BZ, and by which books;
   *  fills — [{ sym, side, date, series, band, pct, doubtful, books: [k…] }]: purchases and sales made on a day the share closed at its band, one
   *          entry per name, side and day; doubtful (the count: `doubtful`) = a sale at the lower band or a purchase at the upper one;
   *  share — the part of the median book's profit that came from trades held through a trade-for-trade day: the middle book by return
   *          (the two middle books together when their number is even); null while that book is not in profit. */
  function booksT2T(B) {
    const merge = (acc, key, item, k) => { const cur = acc.get(key); if (cur) cur.books.push(k); else acc.set(key, Object.assign({}, item, { books: [k] })); };
    const held = new Map(), fills = new Map();
    B.list.forEach((pb, j) => { const k = B.rows[j].k; for (const h of pb.t2t.held) merge(held, h.sym, h, k); for (const f of pb.t2t.fills) merge(fills, f.sym + '|' + f.side + '|' + f.date, f, k); });
    const order = B.list.map((pb, j) => j).sort((x, y) => B.list[x].ret - B.list[y].ret); const m = order.length; const mid = m % 2 ? [order[(m - 1) / 2]] : [order[m / 2 - 1], order[m / 2]];
    const pnl = mid.reduce((p, j) => p + B.list[j].t2t.pnl, 0), profit = mid.reduce((p, j) => p + B.list[j].t2t.profit, 0); const f = [...fills.values()].sort((x, y) => x.date.localeCompare(y.date) || x.sym.localeCompare(y.sym));
    const b1 = B.list[0].t2t;
    return { days: b1.days, known: b1.known, from: b1.from, today: b1.today, held: [...held.values()].sort((x, y) => x.sym.localeCompare(y.sym)), fills: f, doubtful: f.filter(x => x.doubtful).length, medianBooks: mid.map(j => B.rows[j].k), share: profit > 0 ? +(pnl / profit).toFixed(4) : null };
  }
  /** The digest's line for it: only when there is something to say today — a holding in BE / BZ, or a purchase or sale made today at a band.
   *  `T` is a book's t2t (one book) or the books' (booksT2T); `today` the last bar's date; `started` the number of books, when there are several. */
  function t2tLine(T, today, started) {
    if (!T) return null; const pc = x => (x >= 0 ? '+' : '') + x.toFixed(1) + '%'; const inBooks = x => (started > 1 && x.books ? `, ${x.books.length === started ? 'all' : x.books.length + ' of ' + started} books` : '');
    const held = T.held.map(h => `${h.sym} ${h.series}${h.band ? ` at its ${h.band} band today (${pc(h.pct)})` : ''}${inBooks(h)}`);
    const now = T.fills.filter(f => f.date === today).map(f => `${f.side === 'sell' ? 'sold' : 'bought'} ${f.sym} at its ${f.band} band (${pc(f.pct)})${inBooks(f)}${f.doubtful ? ' — that close may not have been a price to be had' : ''}`);
    if (!held.length && !now.length) return null;
    return `• TRADE-FOR-TRADE — reported, no rule reads it (A22): ${[held.length ? 'held: ' + held.join('; ') : null, now.length ? 'today: ' + now.join('; ') : null].filter(Boolean).join(' · ')}`;
  }
  /** The reading, by the rule written on 23 Nov 2026 (reports/momentum-books-reading-rule-2026-11-23.md). null until every book has
   *  started and is measured against the fund. Return: 'ahead' = median gap ≥ +1.0 point and two books in three ahead; 'behind' = median
   *  gap below zero; otherwise 'level'. Drawdown: `losesLess` = median drawdown gap ≥ 2.0 points and two books in three fell less.
   *  verdict: 'ahead' (the owner's call on real money) | 'monitor' | 'monitor, loses less' (the fund stays the holding in both).
   *  A function of the numbers only: whether the day has come (`due`) and whether the data conditions hold is the reader's to check. */
  function booksReading(B, rule) {
    const R = Object.assign({}, READING, rule || {}); if (!B || B.started < B.n || B.measured < B.n || B.G == null) return null;
    const need = Math.ceil(B.n * R.share - 1e-9); const ret = B.G >= R.gap && B.A >= need ? 'ahead' : B.G < 0 ? 'behind' : 'level';
    const losesLess = B.D != null && B.D >= R.dd && B.L >= need;
    return { ret, losesLess, need, verdict: ret === 'ahead' ? 'ahead' : losesLess ? 'monitor, loses less' : 'monitor', rule: R };
  }
  /** The twenty-one books' line in the digest: median, range, how many are ahead of the fund. null until a second book exists. */
  function booksLine(B) {
    if (!B || B.started < 2) return null; const pc = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%'; const pts = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' pts';
    return `• ${B.n} BOOKS${B.pending ? ` (${B.started} started, one a day)` : ''}: median ${pc(B.ret.median)}, ${pc(B.ret.min)} to ${pc(B.ret.max)}` + (B.measured ? ` · ahead of ${B.fund}, own days: ${B.A} of ${B.measured}, median gap ${pts(B.G)}` : '');
  }
  /** Telegram block for the paper book. `books` (paperBooks, optional) adds the twenty-one books' one line under the header. */
  function paperDigest(pb, fmt, books) {
    if (!pb) return null; const f = fmt || (n => Number(n).toFixed(2)); const pc = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%'; const L = [];
    const bm = pb.benchmarks.filter(b => !b.missing).map(b => `${b.name} ${pc(b.ret)}${b.stale ? ' (to ' + b.asOf + ')' : ''}`).join(' · ');
    L.push(`PAPER BOOK — the engine's rules run forward since ${pb.from}, reinvested, beside the index fund: ₹${f(pb.capital, 0)} → ₹${f(pb.value, 0)} (${pc(pb.ret)}) after ${pb.days} day${pb.days === 1 ? '' : 's'}${bm ? ' · ' + bm : ''} · max drawdown ${(pb.maxDrawdown * 100).toFixed(1)}% · ${pb.positions.length} of ${pb.params.topN} names, ${Math.round(pb.investedShare * 100)}% invested`);
    const bl = booksLine(books); if (bl) L.push(bl);
    const tl = books && books.started > 1 ? t2tLine(books.t2t, pb.to, books.started) : t2tLine(pb.t2t, pb.to, 1); if (tl) L.push(tl);
    L.push(`• gate ${pb.gate.open == null ? 'n/a' : pb.gate.open ? 'OPEN' : 'CLOSED'}${pb.volHigh == null ? '' : pb.volHigh ? ' · Nifty 20-day volatility above its 1-year median → new buys at HALF size' : ' · volatility normal → full size'} · slot ₹${f(pb.slot, 0)}${pb.halfSize ? ' (₹' + f(pb.slot * pb.params.volFactor, 0) + ' today)' : ''} · next rebalance in ${pb.nextRebalanceIn} bar${pb.nextRebalanceIn === 1 ? '' : 's'}`);
    if (pb.buys.length) L.push(`• BOUGHT today: ${pb.buys.map(b => `${b.sym} ${b.qty} @ ${f(b.price)}${b.size === 'half' ? ' (half)' : ''}${b.fill === 'refill' ? ' (refill)' : ''}`).join(', ')}`);
    if (pb.sells.length) L.push(`• SOLD today: ${pb.sells.map(s => `${s.sym} ${s.qty} @ ${f(s.price)} (${s.reason}, ${s.ret >= 0 ? '+' : ''}${s.ret}%)`).join(', ')}`);
    if (!pb.buys.length && !pb.sells.length) L.push('• no trades today');
    if (pb.positions.length) L.push(`• holding — name, return, stop (hold unless a close is below the stop): ${pb.positions.map(p => `${p.sym} ${p.ret >= 0 ? '+' : ''}${p.ret.toFixed(1)}% / ${f(p.stop)}`).join(' · ')}`);
    const nb = pb.positions.filter(p => p.noBar); if (nb.length) L.push(`• NO BAR TODAY: ${nb.map(p => `${p.sym} (last close ${p.lastBar})`).join(', ')} — out of the index, or not trading. Carried at that close, closed there after 20 bars. If an index review has just taken effect, run the index-review top-up (BACKFILL.md) and the book is replayed on the real bars`);
    if (pb.membersStale) L.push(`• membership list is as of ${pb.membersAsOf}: an index review has passed since — run the index-review top-up (BACKFILL.md)`);
    return L.join('\n');
  }

  /** Text block for the Telegram digest. */
  function digest(sel, fmt) {
    const f = fmt || (n => Number(n).toFixed(2)); const L = [];
    L.push(`MOMENTUM (${sel.params.lookback}-bar, skip ${sel.params.skip}, top ${sel.params.topN}) — gate ${sel.gate.open == null ? 'n/a' : sel.gate.open ? 'OPEN' : 'CLOSED'}${sel.gate.sma != null ? ` (Nifty ${f(sel.gate.index)} vs ${sel.gate.n}-day ${f(sel.gate.sma)})` : sel.gate.breadth != null ? ` (${Math.round(sel.gate.breadth * 100)}% of stocks above their 200-day)` : ''}`);
    if (sel.gate.open === false) L.push('• no new buys while the index is below its average; holdings exit on trailing stops');
    else if (sel.params.refill === 'close') L.push(`• rules: top ${sel.params.topN} equal-weight; a free slot is refilled at the close; ${sel.params.trail}% trailing stop; out at the monthly rebalance if below rank ${sel.params.holdRank} or off the list${sel.params.volScale ? '; half-size buys while Nifty volatility is high' : ''}`);   // one line; the full wording is on the site (15 Nov 2026: digest length)
    sel.picks.slice(0, sel.params.topN).forEach(r => L.push(`• #${r.rank} ${r.sym} — 6m ${r.ret6 != null ? (r.ret6 * 100).toFixed(0) + '%' : '—'}, 1m ${r.ret1 != null ? (r.ret1 * 100).toFixed(0) + '%' : '—'}, ${r.offHigh.toFixed(0)}% off high`));
    if (!sel.picks.length) L.push('• not enough history yet');
    return L.join('\n');
  }

  return { DEFAULTS, READING, gateAt, rankAt, selectAt, simulate, stats, digest, smaAt, smaOver, volFlags, paperBook, paperDigest, paperBooks, booksReading, booksLine, seriesDrawdown, BAND, bandAt, t2tReport, booksT2T, t2tLine };
});
