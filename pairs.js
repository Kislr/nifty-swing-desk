/* Nifty Swing Desk — relationship-stocks (pairs) engine.
 * Third engine, independent of the other two. Two stocks whose businesses move together (HDFC Bank / ICICI Bank,
 * TCS / Infosys) keep a roughly stable price relationship; when one runs ahead the gap tends to close over weeks.
 * This engine measures that gap and flags when it is stretched. Pure functions; browser (window.PairsEngine) or Node.
 *
 * Method, per pair (A, B), every bar:
 *   1. Hedge ratio: regress log(A) on log(B) over `window` bars → alpha, beta. Spread e_t = log A − alpha − beta·log B.
 *   2. Is the relationship real? Engle–Granger: a Dickey–Fuller regression Δe_t = γ·e_{t−1} + ε on the spread. The t-stat
 *      on γ is compared with the Engle–Granger critical values for two series (−3.37 at 5%, −3.04 at 10%). A pair whose
 *      spread is not stationary gets no signal, whatever its z-score says — that is the whole point of the test.
 *   3. Half-life of the spread = −ln2 / γ: how many bars a stretch takes to close halfway. Pairs slower than `maxHalfLife`
 *      are not tradable on a weeks horizon and are shown as such.
 *   4. z-score of today's spread against its last `zWindow` bars. |z| ≥ `entryZ` is a stretch: the stock with the positive
 *      residual is *rich*, the other is *cheap* (lagging). Exit when |z| ≤ `exitZ`, or after `maxHold` bars, or when
 *      |z| ≥ `stopZ` (the relationship is breaking, not stretching).
 * Two ways to act on a stretch, both backtested: the classic pair trade (long cheap, short rich, equal rupees, market-neutral)
 * and the long-only version most retail accounts can actually do (buy the cheap leg, nothing else) — which is a bet on the
 * relationship AND on the market, and the backtest treats it as such.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PairsEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = { window: 120, zWindow: 30, entryZ: 2, exitZ: 0.5, stopZ: 3, maxHold: 30, maxHalfLife: 40, minHalfLife: 2, costBps: 30, pLevel: 10 };
  const CRIT = { 1: -3.90, 5: -3.37, 10: -3.04 }; // Engle–Granger, two variables, with constant (MacKinnon), n ≈ 250

  /* Curated pairs: same business, both liquid, both in the Nifty 500. Everything here must still pass the cointegration test
   * before it is allowed to signal; curation only decides what gets tested. */
  const PAIRS = [
    ['HDFCBANK', 'ICICIBANK', 'Private banks'], ['KOTAKBANK', 'AXISBANK', 'Private banks'], ['SBIN', 'BANKBARODA', 'PSU banks'],
    ['BAJFINANCE', 'BAJAJFINSV', 'Bajaj twins'], ['HDFCLIFE', 'SBILIFE', 'Life insurance'], ['ICICIGI', 'ICICIPRULI', 'ICICI insurers'],
    ['TCS', 'INFY', 'IT large'], ['INFY', 'WIPRO', 'IT large'], ['HCLTECH', 'TECHM', 'IT mid'],
    ['MARUTI', 'M&M', 'Cars'], ['BAJAJ-AUTO', 'HEROMOTOCO', 'Two-wheelers'], ['TVSMOTOR', 'EICHERMOT', 'Premium two-wheelers'],
    ['HINDUNILVR', 'NESTLEIND', 'FMCG'], ['BRITANNIA', 'DABUR', 'FMCG'], ['ASIANPAINT', 'BERGEPAINT', 'Paints'], ['PIDILITIND', 'ASIANPAINT', 'Building chemicals'],
    ['TATASTEEL', 'JSWSTEEL', 'Steel'], ['HINDALCO', 'VEDL', 'Non-ferrous'], ['COALINDIA', 'NMDC', 'Mining PSUs'],
    ['SUNPHARMA', 'DRREDDY', 'Pharma'], ['CIPLA', 'LUPIN', 'Pharma'], ['APOLLOHOSP', 'MAXHEALTH', 'Hospitals'],
    ['ULTRACEMCO', 'SHREECEM', 'Cement'], ['AMBUJACEM', 'ACC', 'Adani cement'],
    ['NTPC', 'POWERGRID', 'Power PSUs'], ['BPCL', 'HINDPETRO', 'Oil marketing'], ['IOC', 'BPCL', 'Oil marketing'], ['ONGC', 'OIL', 'Upstream oil'],
    ['TITAN', 'KALYANKJIL', 'Jewellery'], ['DMART', 'TRENT', 'Retail'], ['LT', 'SIEMENS', 'Capital goods'], ['BHARTIARTL', 'IDEA', 'Telecom'], ['ADANIPORTS', 'GMRAIRPORT', 'Infrastructure'],
  ];

  const mean = a => a.reduce((p, c) => p + c, 0) / a.length;
  const stdev = a => { const m = mean(a); return Math.sqrt(a.reduce((p, c) => p + (c - m) * (c - m), 0) / (a.length - 1)); };
  function ols(y, x) { // y = a + b x
    const n = y.length, mx = mean(x), my = mean(y); let sxy = 0, sxx = 0; for (let k = 0; k < n; k++) { sxy += (x[k] - mx) * (y[k] - my); sxx += (x[k] - mx) * (x[k] - mx); }
    const b = sxx ? sxy / sxx : 0; const a = my - b * mx; const resid = y.map((v, k) => v - a - b * x[k]); return { a, b, resid };
  }
  /** Dickey–Fuller on a series with constant: Δe_t = c + γ e_{t−1} + ε. Returns {gamma, tstat, halfLife}. */
  function dickeyFuller(e) {
    const n = e.length - 1; const y = [], x = []; for (let k = 1; k <= n; k++) { y.push(e[k] - e[k - 1]); x.push(e[k - 1]); }
    const { b, resid } = ols(y, x); const mx = mean(x); let sxx = 0; for (const v of x) sxx += (v - mx) * (v - mx);
    const s2 = resid.reduce((p, c) => p + c * c, 0) / (n - 2); const se = sxx ? Math.sqrt(s2 / sxx) : Infinity; const t = se ? b / se : 0;
    return { gamma: b, tstat: t, halfLife: b < 0 ? -Math.LN2 / b : Infinity };
  }

  /** Analyse one pair as of bar index i. Returns null when either leg lacks history. */
  function analyzePair(bars, A, B, i, params) {
    const P = Object.assign({}, DEFAULTS, params || {}); const a = bars.sym[A], b = bars.sym[B]; if (!a || !b) return null;
    const from = i - P.window + 1; if (from < 0) return null;
    const la = [], lb = []; for (let k = from; k <= i; k++) { if (a.c[k] == null || b.c[k] == null || a.c[k] <= 0 || b.c[k] <= 0) return null; la.push(Math.log(a.c[k])); lb.push(Math.log(b.c[k])); }
    const reg = ols(la, lb); const df = dickeyFuller(reg.resid); const e = reg.resid; const tail = e.slice(-P.zWindow); const mu = mean(tail), sd = stdev(tail); const z = sd ? (e[e.length - 1] - mu) / sd : 0;
    const level = df.tstat <= CRIT[1] ? 1 : df.tstat <= CRIT[5] ? 5 : df.tstat <= CRIT[10] ? 10 : null; const cointegrated = level != null && level <= P.pLevel;
    const tradable = cointegrated && df.halfLife >= P.minHalfLife && df.halfLife <= P.maxHalfLife;
    const rich = z > 0 ? A : B, cheap = z > 0 ? B : A; const stretched = tradable && Math.abs(z) >= P.entryZ; const broken = Math.abs(z) >= P.stopZ;
    // what the spread implies: the cheap leg's "fair" price if the gap closed with the rich leg unchanged
    const fairCheap = z > 0 ? Math.exp((la[la.length - 1] - reg.a) / reg.b) : Math.exp(reg.a + reg.b * lb[lb.length - 1]);
    const gapPct = (fairCheap / bars.sym[cheap].c[i] - 1) * 100;
    return { A, B, i, date: bars.dates[i], beta: reg.b, alpha: reg.a, tstat: df.tstat, level, cointegrated, halfLife: df.halfLife, tradable, z, rich, cheap, stretched, broken, gapPct,
      priceA: a.c[i], priceB: b.c[i], ratio: a.c[i] / b.c[i], spread: e[e.length - 1], spreadMean: mu, spreadSd: sd,
      status: !cointegrated ? 'no stable relationship' : !tradable ? (df.halfLife > P.maxHalfLife ? `too slow (half-life ${df.halfLife.toFixed(0)} bars)` : 'half-life too short') : broken ? 'relationship breaking — stand aside' : stretched ? `${cheap} lagging` : 'in line' };
  }

  /** All curated pairs as of bar i, sorted: stretched first, then by |z|. */
  function boardAt(bars, i, params, pairs) {
    const list = (pairs || PAIRS).map(([A, B, label]) => { const r = analyzePair(bars, A, B, i, params); return r ? Object.assign(r, { label }) : { A, B, label, status: 'no history', z: 0 }; });
    list.sort((x, y) => (y.stretched === true) - (x.stretched === true) || (y.tradable === true) - (x.tradable === true) || Math.abs(y.z || 0) - Math.abs(x.z || 0));
    return { date: bars.dates[i], pairs: list, params: Object.assign({}, DEFAULTS, params || {}) };
  }

  /** Walk-forward simulation. mode 'pair' = long cheap / short rich, equal rupees each side; 'long' = buy the cheap leg only.
   *  Returns per-trade results as % of one leg's notional (pair mode sums both legs). */
  function simulate(bars, params, opts) {
    const P = Object.assign({}, DEFAULTS, params || {}); opts = opts || {}; const mode = opts.mode || 'pair'; const pairs = opts.pairs || PAIRS; const N = bars.dates.length;
    const from = opts.from || '0000-00-00', to = opts.to || '9999-99-99'; const trades = []; const open = {};
    const cost = P.costBps / 10000; // round trip per leg, applied to the leg's return
    for (let i = P.window; i < N; i++) {
      const date = bars.dates[i]; if (date < from || date > to) continue;
      for (const [A, B] of pairs) { const key = A + '/' + B; const r = analyzePair(bars, A, B, i, P); if (!r) continue; const p = open[key];
        if (p) { const pa = bars.sym[p.cheap].c[i], pb = bars.sym[p.rich].c[i]; const ca = bars.sym[A].c[i], cb = bars.sym[B].c[i]; if (pa == null || pb == null || ca == null || cb == null) continue;
          // judge the trade against the relationship as it was at entry (frozen alpha, beta, mean, sd), not today's re-fit
          const z = (Math.log(ca) - p.alpha - p.beta * Math.log(cb) - p.mu) / p.sd;
          let reason = null; if (Math.abs(z) <= P.exitZ || z * p.sign < 0) reason = 'converged'; else if (i - p.i >= P.maxHold) reason = 'time stop'; else if (Math.abs(z) >= P.stopZ) reason = 'stop (relationship broke)';
          if (reason) { const longRet = pa / p.cheapPx - 1 - cost; const shortRet = mode === 'pair' ? (1 - pb / p.richPx) - cost : 0; const ret = mode === 'pair' ? (longRet + shortRet) : longRet;
            trades.push({ pair: key, cheap: p.cheap, rich: p.rich, entryDate: bars.dates[p.i], exitDate: date, bars: i - p.i, zIn: +p.zIn.toFixed(2), zOut: +z.toFixed(2), longRet: +(longRet * 100).toFixed(2), shortRet: +(shortRet * 100).toFixed(2), ret: +(ret * 100).toFixed(2), reason }); delete open[key]; }
          continue; }
        if (P.enterOnTurn) { const prev = analyzePair(bars, A, B, i - 1, P); if (!prev || !(Math.abs(prev.z) >= P.entryZ && Math.abs(r.z) < Math.abs(prev.z) && Math.abs(r.z) >= P.exitZ && Math.sign(r.z) === Math.sign(prev.z))) continue; if (r.tradable && !r.broken) { open[key] = { i, cheap: r.cheap, rich: r.rich, cheapPx: bars.sym[r.cheap].c[i], richPx: bars.sym[r.rich].c[i], zIn: r.z, sign: Math.sign(r.z), alpha: r.alpha, beta: r.beta, mu: r.spreadMean, sd: r.spreadSd }; } continue; }
        if (r.stretched && !r.broken) open[key] = { i, cheap: r.cheap, rich: r.rich, cheapPx: bars.sym[r.cheap].c[i], richPx: bars.sym[r.rich].c[i], zIn: r.z, sign: Math.sign(r.z), alpha: r.alpha, beta: r.beta, mu: r.spreadMean, sd: r.spreadSd }; }
    }
    return { trades, params: P, mode };
  }
  function stats(trades) {
    const n = trades.length; if (!n) return { n: 0 };
    const rets = trades.map(t => t.ret); const wins = rets.filter(r => r > 0); const sum = rets.reduce((a, b) => a + b, 0);
    const byReason = {}; for (const t of trades) byReason[t.reason] = (byReason[t.reason] || 0) + 1;
    const byPair = {}; for (const t of trades) { const b = byPair[t.pair] || (byPair[t.pair] = { n: 0, sum: 0, wins: 0 }); b.n++; b.sum += t.ret; if (t.ret > 0) b.wins++; }
    let cum = 0, peak = 0, dd = 0; for (const r of rets) { cum += r; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); }
    return { n, winRate: wins.length / n, avgRet: sum / n, totalRet: sum, avgWin: wins.length ? mean(wins) : 0, avgLoss: n - wins.length ? mean(rets.filter(r => r <= 0)) : 0, avgBars: mean(trades.map(t => t.bars)), maxDD: dd, byReason, byPair };
  }

  function digest(board, fmt) {
    const f = fmt || (n => Number(n).toFixed(2)); const L = []; const live = board.pairs.filter(p => p.stretched && !p.broken); const ok = board.pairs.filter(p => p.tradable).length;
    L.push(`PAIRS — ${ok} of ${board.pairs.length} relationships stable; ${live.length} stretched`);
    live.forEach(p => L.push(`• ${p.cheap} lagging ${p.rich} (${p.label}): z ${p.z.toFixed(1)}, gap ${p.gapPct.toFixed(1)}%, half-life ${p.halfLife.toFixed(0)} bars — buy ${p.cheap}${board.params ? '' : ''} / short ${p.rich}`));
    if (!live.length) L.push('• nothing stretched — the normal state');
    return L.join('\n');
  }

  return { DEFAULTS, PAIRS, CRIT, ols, dickeyFuller, analyzePair, boardAt, simulate, stats, digest };
});
