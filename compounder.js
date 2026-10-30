/* Nifty Swing Desk — compounder screen engine.
 * A fourth engine, separate from the swing rules, momentum and pairs (ROADMAP: "build it as a separate engine with its own
 * backtest"). It reads the point-in-time fundamentals store (compounder/data/<market>/facts) and the screen definition
 * (compounder/screen.json) and, for a given date, says for every company whether it passes each of the five traits and why,
 * then ranks the passers. Pure functions, no I/O; loads in the browser (window.CompounderEngine) or from Node.
 *
 * Point-in-time: a fiscal year is visible on date D only if the 10-K that first reported it was filed on or before D
 * (`filed` on the net-income fact, which every 10-K has). Values are the as-first-reported ones (`v`), never the restated `r`.
 * Market cap and the momentum overlay need prices and are applied by the caller when available (see screenAt's `prices` arg).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CompounderEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  const val = (rec, k) => rec && rec[k] && typeof rec[k].v === 'number' ? rec[k].v : null;
  const pct = x => x == null ? null : +(x * 100).toFixed(1);

  /** Fiscal years of one company visible on `asOf` (filed on or before), oldest → newest, as [{end, filed, ...fields}]. */
  function visibleYears(company, asOf) {
    const out = [];
    for (const [end, rec] of Object.entries(company.fy || {})) {
      const anchor = rec.ni || rec.rev || rec.ocf || rec.ebit; if (!anchor) continue;
      if (asOf && anchor.filed > asOf) continue;
      out.push(Object.assign({ end, filed: anchor.filed }, rec));
    }
    return out.sort((a, b) => a.end < b.end ? -1 : 1);
  }

  /** Net debt and EBITDA for one year. Missing debt tags count as zero debt only when the balance sheet is otherwise tagged. */
  function debtOf(y) {
    const lt = val(y, 'debtLT'), st = val(y, 'debtST'), tot = val(y, 'debtTotal');
    let debt = null, note = null;
    if (lt != null || st != null) debt = (lt || 0) + (st || 0);
    else if (tot != null) debt = tot;
    else if (val(y, 'assets') != null && val(y, 'curLiab') != null) { debt = 0; note = 'no debt tag; assumed none'; }
    return { debt, note };
  }

  /** Evaluate the five traits for one company. Returns {ok, years, traits:{roce,grossMargin,growth,cashConversion,leverage}, failed:[], na:[]}. */
  function evaluate(company, screen, asOf) {
    const T = screen.traits; const years = visibleYears(company, asOf);
    const n = years.length; const res = { years: n, latest: n ? years[n - 1].end : null, latestFiled: n ? years[n - 1].filed : null, traits: {}, failed: [], na: [] };
    const need = screen.exclusions.minFiscalYearsOfData || 5;
    if (n < need) { res.ok = false; res.na = ['roce', 'grossMargin', 'growth', 'cashConversion', 'leverage']; res.reason = `${n} fiscal years of data (need ${need})`; return res; }
    const last5 = years.slice(-5), latest = years[n - 1];

    // 1. ROCE = EBIT / (assets − current liabilities), each of the last 5 years
    { const r = last5.map(y => { const e = val(y, 'ebit'), a = val(y, 'assets'), c = val(y, 'curLiab'); return e == null || a == null || c == null || a - c <= 0 ? null : e / (a - c); });
      const have = r.filter(x => x != null);
      if (have.length < 5) res.traits.roce = { pass: null, series: r.map(pct), why: `ROCE computable in ${have.length}/5 years` };
      else { const passing = have.filter(x => x * 100 >= T.roce.threshold).length; const worst = Math.min(...have);
        const pass = passing >= T.roce.minYearsPassing && worst * 100 >= T.roce.floor;
        res.traits.roce = { pass, series: r.map(pct), value: pct(median(have)), rank: median(have), why: pass ? `median ROCE ${pct(median(have))}%, ${passing}/5 years ≥ ${T.roce.threshold}%` : passing < T.roce.minYearsPassing ? `only ${passing}/5 years ≥ ${T.roce.threshold}%` : `worst year ${pct(worst)}% < floor ${T.roce.floor}%` }; } }

    // 2. Gross margin: latest within N points of its 5-year high
    { const gm = last5.map(y => { const rev = val(y, 'rev'); if (!rev) return null; const gp = val(y, 'gp'); const cogs = val(y, 'cogs'); return gp != null ? gp / rev : cogs != null ? (rev - cogs) / rev : null; });
      const have = gm.filter(x => x != null);
      if (gm[4] == null || have.length < 3) res.traits.grossMargin = { pass: null, series: gm.map(pct), why: have.length ? `gross margin in ${have.length}/5 years` : 'no cost-of-revenue or gross-profit line (service business?)' };
      else { const hi = Math.max(...have); const latestGm = gm[4]; const pass = (hi - latestGm) * 100 <= T.grossMargin.maxDropFromHighPts; const first = have[0];
        res.traits.grossMargin = { pass, series: gm.map(pct), value: pct(latestGm), rank: latestGm - first, why: pass ? `gross margin ${pct(latestGm)}% vs 5-year high ${pct(hi)}%` : `gross margin ${pct(latestGm)}% is ${((hi - latestGm) * 100).toFixed(1)} pts below its 5-year high ${pct(hi)}%` }; } }

    // 3. Growth without dilution: 5-year revenue CAGR and diluted share count change (needs 6 year-ends)
    { const need6 = screen.exclusions.minFiscalYearsForGrowth || 6;
      if (n < need6) res.traits.growth = { pass: null, why: `${n} fiscal years (need ${need6} for a 5-year CAGR)` };
      else { const y0 = years[n - 6], y1 = latest; const r0 = val(y0, 'rev'), r1 = val(y1, 'rev'), s0 = val(y0, 'sharesDil'), s1 = val(y1, 'sharesDil');
        if (!r0 || !r1 || r0 <= 0) res.traits.growth = { pass: null, why: 'revenue missing at one end of the 5-year window' };
        else if (!s0 || !s1) res.traits.growth = { pass: null, why: 'diluted share count missing at one end of the window' };
        else if ((1 - s1 / s0) * 100 > (T.growthWithoutDilution.maxShareCountDropPct || 60)) res.traits.growth = { pass: null, why: `share count fell ${((1 - s1 / s0) * 100).toFixed(0)}% over 5 years: likely a unit change in the filing, not a buyback` };
        else { const cagr = Math.pow(r1 / r0, 1 / 5) - 1; const dil = s1 / s0 - 1; const sCagr = Math.pow(s1 / s0, 1 / 5) - 1;
          const pass = cagr * 100 >= T.growthWithoutDilution.minRevenueCagr && dil * 100 <= T.growthWithoutDilution.maxShareCountGrowth;
          res.traits.growth = { pass, value: pct(cagr), dilution: pct(dil), rank: cagr - sCagr, why: pass ? `revenue CAGR ${pct(cagr)}%, shares ${dil >= 0 ? '+' : ''}${pct(dil)}% over 5 years` : cagr * 100 < T.growthWithoutDilution.minRevenueCagr ? `revenue CAGR ${pct(cagr)}% < ${T.growthWithoutDilution.minRevenueCagr}%` : `share count +${pct(dil)}% over 5 years (> ${T.growthWithoutDilution.maxShareCountGrowth}%)` }; } } }

    // 4. Cash conversion: 3-year sums of OCF / NI
    { const l3 = years.slice(-3); const ocf = l3.map(y => val(y, 'ocf')), ni = l3.map(y => val(y, 'ni'));
      if (ocf.some(x => x == null) || ni.some(x => x == null)) res.traits.cashConversion = { pass: null, why: 'operating cash flow or net income missing in the last 3 years' };
      else { const so = ocf.reduce((a, b) => a + b, 0), sn = ni.reduce((a, b) => a + b, 0);
        if (sn <= 0) res.traits.cashConversion = { pass: false, value: null, why: '3-year net income sum ≤ 0' };
        else { const ratio = so / sn; const pass = ratio >= T.cashConversion.minRatio; res.traits.cashConversion = { pass, value: +ratio.toFixed(2), rank: Math.min(ratio, 3), why: `3-year OCF / net income ${ratio.toFixed(2)}${pass ? '' : ' < ' + T.cashConversion.minRatio}` }; } } }

    // 5. Leverage: net debt / EBITDA, latest year
    { const { debt, note } = debtOf(latest); const cash = val(latest, 'cash'); const ebit = val(latest, 'ebit'), da = val(latest, 'da');
      if (debt == null || cash == null) res.traits.leverage = { pass: null, why: 'debt or cash not tagged' };
      else { const net = debt - cash; const ebitda = ebit != null ? ebit + (da || 0) : null;
        if (net <= 0) res.traits.leverage = { pass: true, value: 0, netCash: -net, rank: -1e9 + net, why: `net cash ${fmtMoney(-net)}` + (note ? ` (${note})` : '') };
        else if (ebitda == null || ebitda <= 0) res.traits.leverage = { pass: false, value: null, why: 'net debt with EBITDA ≤ 0 or untagged' };
        else { const x = net / ebitda; const pass = x <= T.leverage.maxNetDebtToEbitda; res.traits.leverage = { pass, value: +x.toFixed(2), rank: x, why: `net debt / EBITDA ${x.toFixed(2)}${pass ? '' : ' > ' + T.leverage.maxNetDebtToEbitda}` + (note ? ` (${note})` : '') }; } } }

    for (const [k, t] of Object.entries(res.traits)) { if (t.pass === false) res.failed.push(k); else if (t.pass == null) res.na.push(k); }
    res.ok = res.failed.length === 0 && res.na.length === 0;
    res.nearMiss = res.failed.length === 0 && res.na.length === 1;   // four passes, one not applicable
    return res;
  }

  function fmtMoney(x) { const a = Math.abs(x); return (x < 0 ? '-' : '') + (a >= 1e9 ? (a / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(0) + 'M' : a.toFixed(0)); }

  /** Screen a whole market. store = {universe, facts}; prices (optional) = {cik: {price, date}} for the cap band. Returns lists with reasons. */
  function screenAt(store, screen, asOf, market, prices) {
    const M = screen.markets[market]; const uni = {}; for (const c of store.universe.companies) uni[c.cik] = c;
    const rows = [];
    for (const co of Object.values(store.facts)) {
      const u = uni[co.cik]; if (!u || !u.domestic || u.financial) continue;
      const ev = evaluate(co, screen, asOf); const latest = ev.latest ? co.fy[ev.latest] : null;
      // market cap: price × cover-page shares when prices are given. Dual-class filers (GOOGL, META, RL, ~13% of the universe) tag
      // the cover-page count per class with a dimension, which the companyfacts API drops, so they have no sharesOut; for them use
      // price × the latest fiscal year's diluted weighted-average share count (one undimensioned total across classes). Only when
      // neither exists fall back to the 10-K public float as a labelled proxy — it understates closely held companies badly.
      let cap = null, capSource = null; const shares = latest && latest.sharesOut ? latest.sharesOut.v : null; const sharesDil = latest && latest.sharesDil ? latest.sharesDil.v : null;
      if (prices && prices[co.cik] && shares) { cap = prices[co.cik].price * shares / 1e6; capSource = 'price × shares'; }
      else if (prices && prices[co.cik] && sharesDil) { cap = prices[co.cik].price * sharesDil / 1e6; capSource = 'price × diluted shares (FY average)'; }
      else if (latest && latest.float) { cap = latest.float.v / 1e6; capSource = 'public float (10-K)'; }
      const inBand = cap == null ? null : cap >= M.marketCap.min && cap <= M.marketCap.max;
      // liquidity floor: average daily dollar turnover ($M) over the last 20 bars, when prices carry it
      const turn = prices && prices[co.cik] && prices[co.cik].avgTurnover != null ? prices[co.cik].avgTurnover : null;
      const floor = M.minAvgDailyDollarVolume != null ? M.minAvgDailyDollarVolume : M.minAvgDailyTurnoverCrore;
      const illiquid = turn != null && floor != null ? turn < floor : null;
      rows.push({ cik: co.cik, ticker: u.ticker, name: co.name || u.name, sic: u.sic, sicDesc: u.sicDesc, fye: u.fye, latest: ev.latest, latestFiled: ev.latestFiled, years: ev.years,
        traits: ev.traits, failed: ev.failed, na: ev.na, ok: ev.ok, nearMiss: ev.nearMiss, reason: ev.reason, cap: cap != null ? +cap.toFixed(0) : null, capSource, inBand,
        price: prices && prices[co.cik] ? prices[co.cik].price : null, priceDate: prices && prices[co.cik] ? prices[co.cik].date : null, avgTurnover: turn, illiquid });
    }
    // composite: rank-sum among passers inside the cap band and above the liquidity floor (null = unknown, kept but flagged)
    const passers = rows.filter(r => r.ok && r.inBand !== false && r.illiquid !== true);
    const keys = { roce: -1, grossMargin: -1, growth: -1, cashConversion: -1, leverage: +1 };   // −1: higher is better
    for (const [k, dir] of Object.entries(keys)) { const sorted = [...passers].sort((a, b) => dir * (a.traits[k].rank - b.traits[k].rank)); sorted.forEach((r, i) => { (r.ranks || (r.ranks = {}))[k] = i + 1; }); }
    for (const r of passers) r.rankSum = Object.values(r.ranks).reduce((a, b) => a + b, 0);
    passers.sort((a, b) => a.rankSum - b.rankSum); passers.forEach((r, i) => (r.rank = i + 1));
    const nearMiss = rows.filter(r => r.nearMiss && r.inBand !== false).sort((a, b) => (a.traits.roce.rank || 0) < (b.traits.roce.rank || 0) ? 1 : -1);
    const counts = { screened: rows.length, enoughYears: rows.filter(r => !r.reason).length, passAll: rows.filter(r => r.ok).length, inBand: passers.length, nearMiss: nearMiss.length,
      illiquidPassers: rows.filter(r => r.ok && r.inBand !== false && r.illiquid === true).length, pricedRows: rows.filter(r => r.price != null).length,
      failedBy: {} , naBy: {} };
    for (const r of rows) { for (const k of r.failed) counts.failedBy[k] = (counts.failedBy[k] || 0) + 1; for (const k of r.na) counts.naBy[k] = (counts.naBy[k] || 0) + 1; }
    return { asOf, market, quality: passers, nearMiss, universe: rows, counts, screenVersion: screen.version };
  }

  /** Text block for the digest / report. */
  function digest(S, n) {
    const L = [`COMPOUNDER ${S.market.toUpperCase()} as of ${S.asOf} — ${S.counts.inBand} pass all five (of ${S.counts.enoughYears} with 5+ years; ${S.counts.nearMiss} near-misses)`];
    for (const r of S.quality.slice(0, n || 40)) L.push(`• #${r.rank} ${r.ticker} ${r.name} — ROCE ${r.traits.roce.value}%, GM ${r.traits.grossMargin.value}%, growth ${r.traits.growth.value}%/yr, OCF/NI ${r.traits.cashConversion.value}, ${r.traits.leverage.why}; cap ${r.cap != null ? '$' + r.cap + 'M' : 'n/a'}`);
    return L.join('\n');
  }

  return { visibleYears, evaluate, screenAt, digest, debtOf };
});
