/* Nifty Swing Desk — rules engine.
 * Pure functions shared by the website (browser) and the daily job (Node).
 * No DOM, no network. Loaded as a classic script in the browser (window.SwingEngine)
 * or required from Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SwingEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- sector map (override per symbol via custom map) ---------- */
  const SECTOR_LISTS = {
    'IT': 'TCS INFY HCLTECH WIPRO TECHM LTIM PERSISTENT COFORGE MPHASIS OFSS LTTS TATAELXSI KPITTECH TATATECH CYIENT BSOFT ZENSARTECH',
    'Banks': 'HDFCBANK ICICIBANK SBIN KOTAKBANK AXISBANK INDUSINDBK BANKBARODA PNB CANBK IDFCFIRSTB FEDERALBNK AUBANK BANDHANBNK UNIONBANK YESBANK INDIANB RBLBANK KARURVYSYA',
    'NBFC & Finance': 'BAJFINANCE BAJAJFINSV SHRIRAMFIN JIOFIN CHOLAFIN MUTHOOTFIN PFC REC IRFC HDFCAMC BAJAJHLDNG SBICARD LICHSGFIN M&MFIN ABCAPITAL POONAWALLA MANAPPURAM HUDCO',
    'Insurance': 'HDFCLIFE SBILIFE ICICIPRULI ICICIGI LICI GICRE NIACL STARHEALTH',
    'Capital Markets': 'BSE MCX CDSL ANGELONE CAMS KFINTECH NUVAMA 360ONE IIFL MOTILALOFS',
    'Auto': 'M&M MARUTI TMPV TATAMOTORS BAJAJ-AUTO EICHERMOT HEROMOTOCO TVSMOTOR ASHOKLEY HYUNDAI OLAELEC ESCORTS',
    'Auto Ancillary': 'MOTHERSON BOSCHLTD BHARATFORG TIINDIA BALKRISIND MRF APOLLOTYRE EXIDEIND SONACOMS UNOMINDA SCHAEFFLER ENDURANCE',
    'Oil & Gas': 'RELIANCE ONGC BPCL IOC HINDPETRO GAIL OIL PETRONET IGL MGL ATGL',
    'Power': 'NTPC POWERGRID TATAPOWER ADANIGREEN ADANIENSOL ADANIPOWER JSWENERGY NHPC SJVN TORNTPOWER CESC SUZLON INOXWIND NTPCGREEN',
    'Metals & Mining': 'TATASTEEL JSWSTEEL HINDALCO VEDL JINDALSTEL NMDC NATIONALUM SAIL HINDZINC COALINDIA APLAPOLLO JSL HINDCOPPER',
    'Pharma': 'SUNPHARMA DRREDDY CIPLA DIVISLAB LUPIN AUROPHARMA TORNTPHARM ZYDUSLIFE ALKEM GLENMARK MANKIND BIOCON LAURUSLABS ABBOTINDIA IPCALAB AJANTPHARM GLAND',
    'Healthcare': 'APOLLOHOSP MAXHEALTH FORTIS NH LALPATHLAB METROPOLIS MEDANTA ASTERDM',
    'FMCG': 'HINDUNILVR ITC NESTLEIND BRITANNIA TATACONSUM DABUR MARICO GODREJCP COLPAL VBL UNITDSPR EMAMILTD PATANJALI RADICO UBL JYOTHYLAB',
    'Consumer & Retail': 'TITAN TRENT DMART ETERNAL NYKAA SWIGGY PAGEIND KALYANKJIL BATAINDIA ABFRL VMART SENCO',
    'Durables & Building': 'ASIANPAINT BERGEPAINT PIDILITIND HAVELLS VOLTAS DIXON POLYCAB CROMPTON WHIRLPOOL BLUESTARCO KEI AMBER KAJARIACER',
    'Telecom': 'BHARTIARTL IDEA INDUSTOWER TATACOMM BHARTIHEXA',
    'Capital Goods & Defence': 'LT SIEMENS ABB BEL HAL BDL MAZDOCK COCHINSHIP CGPOWER BHEL CUMMINSIND THERMAX RVNL IRCON NBCC GRSE SOLARINDS HITACHIENERGY KAYNES',
    'Cement': 'ULTRACEMCO GRASIM SHREECEM AMBUJACEM ACC DALBHARAT JKCEMENT RAMCOCEM',
    'Realty': 'DLF GODREJPROP LODHA OBEROIRLTY PRESTIGE PHOENIXLTD BRIGADE SOBHA',
    'Ports & Logistics': 'ADANIPORTS CONCOR DELHIVERY JSWINFRA GESHIP',
    'Conglomerate': 'ADANIENT',
    'Aviation & Hotels': 'INDIGO INDHOTEL ITCHOTELS LEMONTREE CHALET',
    'Chemicals & Fertilisers': 'SRF PIIND UPL DEEPAKNTR AARTIIND NAVINFLUOR TATACHEM ATUL COROMANDEL CHAMBLFERT SUMICHEM',
    'Internet & Media': 'NAUKRI POLICYBZR PAYTM IRCTC INDIAMART ZEEL SUNTV PVRINOX',
  };
  const SECTOR_OF = {};
  for (const [sec, list] of Object.entries(SECTOR_LISTS)) list.split(/\s+/).forEach(s => (SECTOR_OF[s] = sec));

  // sectorBump / volumeBump are the score points for "leading sector" and "volume ≥ 1.5× average"; the backtest
  // overrides them (--set sectorBump=0) to test whether they earn their place (ROADMAP item 2).
  // swingMode: 'watch' (5 Nov 2026) — the swing rules lost −0.08R/trade over 419 trades on five years and no single tested
  // change fixed them (reports/backtest-2026-11-05.md). On ten years of point-in-time membership they are −0.03R over 865 trades
  // (reports/backtest-2026-11-19-adjusted-members.md). On corporate-action-adjusted five-year history they are breakeven (+0.01R over 433,
  // reports/backtest-2026-11-05-adjusted.md) and the best variant +0.04R: still under the +0.1R bar, so setups are levels to watch, not orders,
  // and the digest leads with the momentum list. Set back to 'orders' only after a backtest earns it.
  const DEFAULTS = { capital: 500000, riskPct: 1, minRR: 2, maxPos: 25, sectorBump: 15, volumeBump: 10, swingMode: 'watch' };
  const F = ['open', 'high', 'low', 'prev', 'ltp', 'chg', 'pct', 'vol', 'val', 'h52', 'l52', 'd30'];
  const tick = x => Math.round(x * 20) / 20;
  const fmt = (n, d = 2) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n, d = 2) => (n == null || isNaN(n)) ? '—' : (n > 0 ? '+' : '') + Number(n).toFixed(d) + '%';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rowObj = (sym, arr) => { const o = { sym }; F.forEach((k, i) => (o[k] = arr[i])); return o; };
  // NSE's Nifty 500 industry labels (what the backfill writes into data/sectors.json) folded into the built-in sector names
  const SECTOR_ALIAS = { 'Information Technology': 'IT', 'Consumer Durables': 'Durables & Building', 'Construction Materials': 'Cement', 'Telecommunication': 'Telecom',
    'Capital Goods': 'Capital Goods & Defence', 'Fast Moving Consumer Goods': 'FMCG', 'Oil Gas & Consumable Fuels': 'Oil & Gas', 'Chemicals': 'Chemicals & Fertilisers',
    'Healthcare': 'Pharma', 'Automobile and Auto Components': 'Auto', 'Media Entertainment & Publication': 'Internet & Media', 'Metals & Mining': 'Metals & Mining', 'Power': 'Power', 'Realty': 'Realty' };
  const sectorOf = (sym, custom) => { const v = (custom && custom[sym]) || SECTOR_OF[sym] || 'Unmapped'; return SECTOR_ALIAS[v] || v; };

  /* ---------- parsing (CSV download or pasted table text) ---------- */
  const num = s => { if (s == null) return null; s = String(s).replace(/[₹,%\s"]/g, ''); if (s === '' || s === '-') return null; const n = parseFloat(s); return isNaN(n) ? null : n; };
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim() !== ''));
  }
  function mapHeaders(hdr) {
    const m = {};
    hdr.forEach((h, i) => { const k = h.toUpperCase().replace(/[^A-Z0-9%]/g, '');
      if (k.startsWith('SYMBOL')) m.sym = i;
      else if (k.startsWith('OPEN')) m.open = i;
      else if (k.startsWith('HIGH')) m.high = i;
      else if (k.startsWith('LOW')) m.low = i;
      else if (k.startsWith('PREV')) m.prev = i;
      else if (k.startsWith('LTP') || k.startsWith('LASTPRICE')) m.ltp = i;
      else if (k.startsWith('INDICATIVE') || k.includes('365')) { /* skip */ }
      else if (k.includes('30D')) m.d30 = i;
      else if (k.includes('%') && (k.includes('CHNG') || k.includes('CHANGE'))) m.pct = i;
      else if (k.startsWith('CHNG') || k.startsWith('CHANGE')) m.chg = i;
      else if (k.startsWith('VOLUME')) m.vol = i;
      else if (k.startsWith('VALUE') || k.startsWith('TURNOVER')) m.val = i;
      else if (k.includes('52W') && k.includes('H')) m.h52 = i;
      else if (k.includes('52W') && k.includes('L')) m.l52 = i;
    });
    return m;
  }
  const isIndexName = s => /\s/.test(s) || /^NIFTY/.test(s) || /^INDIA ?VIX/.test(s);
  function rowsFromCSV(text) {
    const rows = parseCSV(text); if (rows.length < 2) return [];
    const m = mapHeaders(rows[0]); if (m.sym == null || m.ltp == null) return [];
    const out = [];
    for (const r of rows.slice(1)) { const sym = (r[m.sym] || '').trim().toUpperCase(); if (!sym) continue;
      const g = k => (m[k] == null ? null : num(r[m[k]]));
      const o = { sym, open: g('open'), high: g('high'), low: g('low'), prev: g('prev'), ltp: g('ltp'), chg: g('chg'), pct: g('pct'), vol: g('vol'), val: g('val'), h52: g('h52'), l52: g('l52'), d30: g('d30') };
      if (o.ltp == null) continue;
      if (o.chg == null && o.prev != null) o.chg = o.ltp - o.prev;
      if (o.pct == null && o.prev) o.pct = (o.ltp - o.prev) / o.prev * 100;
      o.isIndex = isIndexName(sym); out.push(o);
    }
    return out;
  }
  function rowsFromPaste(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const recs = []; let cur = null;
    const symRe = /^([A-Z][A-Z0-9&\-\.]*(?: (?:50|100|500|BANK|NEXT 50|MIDCAP|SMALLCAP|IT|AUTO|PHARMA|FMCG|METAL|REALTY|ENERGY))?)(?:\s+|$)/;
    for (const line of lines) {
      const toks = line.split(/\s+/); let i = 0; const m = line.match(symRe);
      if (m && !/^\d/.test(line)) { const sym = m[1].trim(); if (sym.length < 2) continue; cur = { sym, nums: [] }; recs.push(cur); i = sym.split(' ').length; }
      if (!cur) continue;
      for (; i < toks.length; i++) { const t = toks[i]; if (t === '-') { cur.nums.push(null); continue; } if (/^[-+]?[\d,]*\.?\d+%?$/.test(t)) { const n = num(t); if (n != null) cur.nums.push(n); } }
    }
    const out = [];
    for (const r of recs) { let n = r.nums; if (n.length < 12) continue;
      if (n.length >= 13) n = n.slice(0, 5).concat(n.slice(6)); // drop indicative-close column
      const [open, high, low, prev, ltp, chg, p, vol, val, h52, l52, d30] = n; if (ltp == null) continue;
      out.push({ sym: r.sym, open, high, low, prev, ltp, chg, pct: p, vol, val, h52, l52, d30, isIndex: isIndexName(r.sym) });
    }
    return out;
  }
  function parseAny(text) {
    const t = String(text || '').replace(/^﻿/, '').trim(); if (!t) return [];
    let rows = [];
    if (/^"?SYMBOL/i.test(t) || t.split('\n')[0].includes(',')) rows = rowsFromCSV(t);
    if (rows.length < 2) rows = rowsFromPaste(t);
    return rows;
  }
  /* NSE NextApi marketWatchApi?functionName=getIndicesData payload → rows */
  function rowsFromNseApi(json) {
    // The payload is {data:{data:[...], timestamp, marketStatus, aduCount}}; older shapes put the array at json.data.
    const findArr = (o, depth) => { if (!o || typeof o !== 'object' || depth > 4) return null; if (Array.isArray(o)) return (o.length && o[0] && typeof o[0] === 'object' && 'lastPrice' in o[0]) ? o : null; for (const k of Object.keys(o)) { const f = findArr(o[k], depth + 1); if (f) return f; } return null; };
    const data = findArr(json, 0) || []; const out = [];
    for (const d of data) { if (!d || d.lastPrice == null) continue;
      const val = d.totalTradedValue != null ? (d.totalTradedValue > 1e6 ? d.totalTradedValue / 1e7 : d.totalTradedValue) : null; // rupees → ₹ crore
      out.push({ sym: String(d.symbol).toUpperCase(), open: d.open, high: d.dayHigh, low: d.dayLow, prev: d.previousClose, ltp: d.lastPrice, chg: d.change, pct: d.pChange,
        vol: d.totalTradedVolume, val, h52: d.yearHigh, l52: d.yearLow, d30: d.perChange30d, isIndex: d.priority === 1 || isIndexName(String(d.symbol)), lastUpdate: d.lastUpdateTime });
    }
    return out;
  }
  /* NSE's market-watch call wants an index's short code, not its display name: getIndicesData&symbol=NIFTY500 MOMENTUM 50 answers
   * {"data":{}} (how the paper book's two index funds went unsaved from 13 to 17 Nov 2026), symbol=NIFTY500MOMENTM50 answers the
   * constituents with the index row first, and that row carries the display name again. The codes come from NSE's own list
   * (marketWatchApi?functionName=getIndexList → {data:{group:{display name: code}}}); the two the desk needs are also kept here
   * so a failed list call costs nothing. Broad indices (NIFTY 50, NIFTY 500) are their own code. */
  const INDEX_CODES = { 'NIFTY500 MOMENTUM 50': 'NIFTY500MOMENTM50', 'NIFTY200 MOMENTUM 30': 'NIFTY200MOMENTM30', 'NIFTY MIDCAP150 MOMENTUM 50': 'NIFTYM150MOMNTM50' };
  function indexCode(name, list) {
    const groups = list && list.data && typeof list.data === 'object' ? Object.values(list.data) : [];
    for (const g of groups) { if (!g || typeof g !== 'object') continue; for (const [disp, code] of Object.entries(g)) if (code && (sameIndex(disp, name) || sameIndex(code, name))) return String(code); }
    return INDEX_CODES[String(name || '').trim().toUpperCase()] || String(name || '');
  }
  /** An index's close and previous close from the rows of its own market-watch call: the row named like the index, else the one index row. */
  function benchmarkClose(rows, name) {
    const ix = (rows || []).filter(r => r && r.isIndex); const row = ix.find(r => sameIndex(r.sym, name)) || (ix.length === 1 ? ix[0] : null);
    return row && row.ltp > 0 ? { close: row.ltp, prev: row.prev > 0 ? row.prev : null } : null;
  }
  function toSnapshotDoc(rows, date, time, source) {
    const doc = { date, time: time || null, source: source || 'manual', savedAt: new Date().toISOString(), count: 0, rows: {}, index: null };
    for (const r of rows) {
      if (r.isIndex) { const ix = { name: r.sym, ltp: r.ltp, pct: r.pct, chg: r.chg, high: r.high, low: r.low, open: r.open }; if (!doc.index || /^NIFTY 50$/.test(r.sym)) doc.index = ix; if (!/^NIFTY 50$/.test(r.sym)) doc.universeIndex = ix; continue; }
      doc.rows[r.sym] = F.map(k => (r[k] == null ? null : r[k])); doc.count++;
    }
    return doc;
  }

  /* ---------- bars: one aligned OHLCV table built from history files + daily snapshots ----------
   * history file: {year, dates:[...], symbols:{SYM:{o:[],h:[],l:[],c:[],v:[],t:[]}}, index:{name,o:[],h:[],l:[],c:[]}}
   * bars:         {dates:[...], sym:{SYM:{o,h,l,c,v,t}}, index:{name,o,h,l,c}|null, extras:{date:{SYM:{h52,l52,d30,val,pct,prev}}}}
   * History (end-of-day) wins over a snapshot for the same date; snapshots fill the gaps. */
  const sameIndex = (a, b) => String(a || '').replace(/\s+/g, '').toUpperCase() === String(b || '').replace(/\s+/g, '').toUpperCase();
  /* Corporate actions. Bhavcopy prices are raw: a 1:1 bonus shows as a 50% fall on the ex-date, which reads as a stop-out, an
   * "avoid", or a momentum trailing-stop exit. data/adjustments.json (written by scripts/corporate-actions.mjs, verified against the
   * history) lists, per symbol, {exDate, factor, apply}; for every bar BEFORE the ex-date, price ÷ factor and volume × factor, with
   * several events compounding. Turnover (₹) is unchanged. The history files stay raw so the daily job can keep appending raw bars;
   * the adjustment is applied here, at load, by everything that reads bars. Events with apply:false (not verified) are skipped. */
  function applyAdjustments(bars, adj) {
    const table = adj && adj.symbols ? adj.symbols : adj; if (!table || !bars.dates.length) return { events: 0, symbols: 0 };
    let events = 0, symbols = 0;
    for (const [s, list] of Object.entries(table)) { const B = bars.sym[s]; if (!B || !Array.isArray(list)) continue;
      // an event whose ex-date is after the last bar is not applied yet: until then every bar, the latest included, is on the old basis
      const last = bars.dates[bars.dates.length - 1];
      const live = list.filter(e => e && e.apply !== false && e.exDate && e.exDate <= last && e.factor > 0 && e.factor !== 1).sort((a, b) => a.exDate < b.exDate ? -1 : 1); if (!live.length) continue;
      symbols++; events += live.length;
      // cumulative factor for a bar = product of the factors of every event whose ex-date is after the bar
      let k = 0, cum = live.reduce((p, e) => p * e.factor, 1);
      for (let i = 0; i < bars.dates.length; i++) { while (k < live.length && live[k].exDate <= bars.dates[i]) { cum /= live[k].factor; k++; } if (cum === 1) break;
        if (B.c[i] == null) continue; for (const key of ['o', 'h', 'l', 'c']) if (B[key][i] != null) B[key][i] = +(B[key][i] / cum).toFixed(4); if (B.v[i] != null) B.v[i] = Math.round(B.v[i] * cum); } }
    bars.adjusted = { events, symbols };
    return bars.adjusted;
  }

  function buildBars(historyFiles, snaps, opts) {
    const bars = buildBarsRaw(historyFiles, snaps);
    if (opts && opts.adjustments) applyAdjustments(bars, opts.adjustments);
    return bars;
  }
  /** The bars as they stood at the close of `to` (YYYY-MM-DD): every series cut after the last date on or before it. A backtest run with
   *  --to then sees what a run on that day saw — signals, exits and the "end of data" mark alike — so a past report reproduces after new
   *  bars have arrived (audit A3, 21 Nov 2026). Returns the same object when there is nothing to cut. */
  function clipBars(bars, to) {
    if (!bars || !to) return bars; let n = bars.dates.length; while (n > 0 && bars.dates[n - 1] > to) n--; if (n === bars.dates.length) return bars;
    const cut = a => (Array.isArray(a) ? a.slice(0, n) : a); const sym = {}; for (const [s, B] of Object.entries(bars.sym)) { const o = {}; for (const [k, a] of Object.entries(B)) o[k] = cut(a); sym[s] = o; }
    const index = bars.index ? Object.fromEntries(Object.entries(bars.index).map(([k, a]) => [k, cut(a)])) : bars.index;
    return Object.assign({}, bars, { dates: bars.dates.slice(0, n), sym, index, clippedAt: to });
  }
  function buildBarsRaw(historyFiles, snaps) {
    const dateSet = new Set();
    for (const f of historyFiles || []) for (const d of f.dates || []) dateSet.add(d);
    for (const s of snaps || []) dateSet.add(s.date);
    const dates = [...dateSet].sort(); const pos = {}; dates.forEach((d, i) => (pos[d] = i));
    const N = dates.length; const mk = () => ({ o: new Array(N).fill(null), h: new Array(N).fill(null), l: new Array(N).fill(null), c: new Array(N).fill(null), v: new Array(N).fill(null), t: new Array(N).fill(null) });
    const sym = {}; let index = null; const extras = {};
    for (const f of historyFiles || []) {
      for (const [s, b] of Object.entries(f.symbols || {})) { const B = sym[s] || (sym[s] = mk());
        f.dates.forEach((d, k) => { const i = pos[d]; if (b.c[k] == null) return; B.o[i] = b.o[k]; B.h[i] = b.h[k]; B.l[i] = b.l[k]; B.c[i] = b.c[k]; B.v[i] = b.v[k]; B.t[i] = b.t ? b.t[k] : null; }); }
      if (f.index && f.index.c) { index = index || { name: f.index.name, o: new Array(N).fill(null), h: new Array(N).fill(null), l: new Array(N).fill(null), c: new Array(N).fill(null) };
        f.dates.forEach((d, k) => { const i = pos[d]; if (f.index.c[k] == null) return; index.o[i] = f.index.o[k]; index.h[i] = f.index.h[k]; index.l[i] = f.index.l[k]; index.c[i] = f.index.c[k]; }); }
    }
    for (const s of snaps || []) { const i = pos[s.date]; const ex = extras[s.date] = {};
      for (const [k, a] of Object.entries(s.rows)) { const r = rowObj(k, a); const B = sym[k] || (sym[k] = mk());
        if (B.c[i] == null) { B.o[i] = r.open; B.h[i] = r.high; B.l[i] = r.low; B.c[i] = r.ltp; B.v[i] = r.vol; B.t[i] = r.val; }
        ex[k] = { h52: r.h52, l52: r.l52, d30: r.d30, val: r.val, pct: r.pct, prev: r.prev }; }
      if (s.index && s.index.ltp != null) { index = index || { name: s.index.name, o: new Array(N).fill(null), h: new Array(N).fill(null), l: new Array(N).fill(null), c: new Array(N).fill(null) };
        // Only splice a snapshot's index bar into the series when it is the same index (a NIFTY 500 close in a NIFTY 50 series is a phantom crash)
        if (index.c[i] == null && sameIndex(index.name, s.index.name)) { index.o[i] = s.index.open; index.h[i] = s.index.high; index.l[i] = s.index.low; index.c[i] = s.index.ltp; } ex.__index = { pct: s.index.pct, time: s.time, name: s.index.name }; }
    }
    return { dates, sym, index, extras };
  }
  /* Append one snapshot to a history file object (the daily job does this). Returns the mutated file. */
  function appendSnapshotToHistory(file, snap) {
    file.dates = file.dates || []; file.symbols = file.symbols || {};
    let k = file.dates.indexOf(snap.date); if (k < 0) { file.dates.push(snap.date); file.dates.sort(); k = file.dates.indexOf(snap.date);
      for (const b of Object.values(file.symbols)) ['o', 'h', 'l', 'c', 'v', 't'].forEach(key => (b[key] = b[key] || []) && b[key].splice(k, 0, null));
      if (file.index) ['o', 'h', 'l', 'c'].forEach(key => file.index[key].splice(k, 0, null)); }
    const N = file.dates.length;
    for (const [s, a] of Object.entries(snap.rows)) { const r = rowObj(s, a); const b = file.symbols[s] || (file.symbols[s] = { o: [], h: [], l: [], c: [], v: [], t: [] });
      ['o', 'h', 'l', 'c', 'v', 't'].forEach(key => { while (b[key].length < N) b[key].push(null); });
      b.o[k] = r.open; b.h[k] = r.high; b.l[k] = r.low; b.c[k] = r.ltp; b.v[k] = r.vol; b.t[k] = r.val; }
    if (snap.index && snap.index.ltp != null) { file.index = file.index || { name: snap.index.name, o: [], h: [], l: [], c: [] };
      ['o', 'h', 'l', 'c'].forEach(key => { while (file.index[key].length < N) file.index[key].push(null); });
      if (sameIndex(file.index.name, snap.index.name)) { file.index.o[k] = snap.index.open; file.index.h[k] = snap.index.high; file.index.l[k] = snap.index.low; file.index.c[k] = snap.index.ltp; } }
    else if (file.index) ['o', 'h', 'l', 'c'].forEach(key => { while (file.index[key].length < N) file.index[key].push(null); });
    return file;
  }

  /* ---------- indicators (computed at bar index i; null when not enough data) ---------- */
  const mean = a => a.length ? a.reduce((p, c) => p + c, 0) / a.length : null;
  function sma(c, n, i) { if (i + 1 < n) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) { if (c[k] == null) return null; s += c[k]; } return s / n; }
  function atr(B, n, i) { if (i < n) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) { const h = B.h[k], l = B.l[k], pc = B.c[k - 1]; if (h == null || l == null || pc == null) return null; s += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)); } return s / n; }
  function rsi(c, n, i) { if (i < n) return null; let g = 0, l = 0; for (let k = i - n + 1; k <= i; k++) { if (c[k] == null || c[k - 1] == null) return null; const d = c[k] - c[k - 1]; if (d > 0) g += d; else l -= d; } if (l === 0) return 100; const rs = (g / n) / (l / n); return 100 - 100 / (1 + rs); }
  function windowMax(a, from, to) { let m = null; for (let k = Math.max(0, from); k <= to; k++) if (a[k] != null && (m == null || a[k] > m)) m = a[k]; return m; }
  function windowMin(a, from, to) { let m = null; for (let k = Math.max(0, from); k <= to; k++) if (a[k] != null && (m == null || a[k] < m)) m = a[k]; return m; }
  function candles(B, i) {
    const o = B.o[i], h = B.h[i], l = B.l[i], c = B.c[i]; if ([o, h, l, c].some(x => x == null)) return { bull: [], bear: [] };
    const body = Math.abs(c - o), rng = h - l || 1e-9, upper = h - Math.max(o, c), lower = Math.min(o, c) - l; const bull = [], bear = [];
    if (lower >= 2 * body && upper <= body && c >= l + rng * 0.6) bull.push('hammer');
    if (upper >= 2 * body && lower <= body && c <= l + rng * 0.4) bear.push('shooting star');
    if (body <= rng * 0.1) bull.push('doji'), bear.push('doji');
    const po = B.o[i - 1], pc = B.c[i - 1], ph = B.h[i - 1], pl = B.l[i - 1];
    if (po != null && pc != null) {
      if (pc < po && c > o && o <= pc && c >= po && body > 0) bull.push('bullish engulfing');
      if (pc > po && c < o && o >= pc && c <= po && body > 0) bear.push('bearish engulfing');
      if (ph != null && pl != null && h <= ph && l >= pl) bull.push('inside bar'), bear.push('inside bar');
    }
    if (c >= l + rng * 0.75 && c > o) bull.push('strong close'); if (c <= l + rng * 0.25 && c < o) bear.push('weak close');
    return { bull, bear };
  }
  function percentileRank(values, x) { const v = values.filter(y => y != null).sort((a, b) => a - b); if (!v.length || x == null) return null; let n = 0; for (const y of v) if (y <= x) n++; return n / v.length * 100; }

  /* ---------- core analysis at bar index i ---------- */
  function regimeFromRows(rows, idxPct, time) {
    let up = 0, down = 0; for (const r of rows) { if (r.pct > 0) up++; else if (r.pct < 0) down++; }
    const breadth = (up + down) ? up / (up + down) : 0.5; const idx = idxPct == null ? null : idxPct;
    let state = 'Mixed'; if (breadth >= 0.6 && (idx == null || idx > 0)) state = 'Strong'; else if (breadth <= 0.4 || (idx != null && idx < -0.5)) state = 'Weak';
    const intraday = time ? time < '14:30' : false;
    return { up, down, breadth, idx, state, intraday, sizeMult: state === 'Weak' ? 0.5 : 1 };
  }
  function boardFromRows(rows) {
    const by = {}; for (const r of rows) (by[r.sector] = by[r.sector] || []).push(r);
    const out = [];
    for (const [sec, rs] of Object.entries(by)) { const n = rs.length; const avg = k => mean(rs.map(r => r[k]).filter(x => x != null));
      const avgPct = avg('pct'), avg30 = avg('d30'), avgRS = avg('rs'); const up = rs.filter(r => r.pct > 0).length; const breadth = up / n; const val = rs.reduce((a, r) => a + (r.val || 0), 0);
      const score = (avgPct == null ? 0 : avgPct) + ((avg30 == null ? 0 : avg30) / 6) + ((breadth - 0.5) * 2) + (avgRS == null ? 0 : avgRS / 4);
      out.push({ sec, n, avgPct, avg30, avgRS, breadth, val, score, rows: rs }); }
    out.sort((a, b) => b.score - a.score);
    const ranked = out.filter(s => s.n >= 2 && s.sec !== 'Unmapped'); ranked.forEach((s, i) => (s.rank = i + 1));
    const leaders = new Set(ranked.filter(s => s.rank <= 3 && s.score >= 1 && (s.avgPct > 0 || s.avg30 > 0)).map(s => s.sec));
    const laggards = new Set(ranked.slice(-3).filter(s => s.score < 0).map(s => s.sec));
    return { list: out, leaders, laggards };
  }
  function sizing(entry, stop, reg, settings) {
    const st = Object.assign({}, DEFAULTS, settings || {}); const riskAmt = st.capital * st.riskPct / 100 * (reg ? reg.sizeMult : 1);
    const perShare = entry - stop; if (!(perShare > 0)) return null;
    let qty = Math.floor(riskAmt / perShare); const cap = Math.floor(st.capital * st.maxPos / 100 / entry);
    const capped = qty > cap; if (capped) qty = cap;
    return { qty, riskAmt, value: qty * entry, capped, riskActual: qty * perShare };
  }
  /** Analyse the universe as of bars index i.
   *  opts: {settings, custom, time, filter}. `filter(sym, date)` → false drops a symbol from the day's universe before
   *  anything is computed (sector board, relative-strength percentiles, signals), so a point-in-time membership list
   *  makes the whole analysis point-in-time. Returns {signals, reg, board, universe, date, coverage}. */
  function analyzeAt(bars, i, opts) {
    opts = opts || {}; const st = Object.assign({}, DEFAULTS, opts.settings || {}); const custom = opts.custom || {}; const RR = st.minRR; const filter = opts.filter;
    const date = bars.dates[i]; const ex = bars.extras[date] || {}; const time = opts.time || (ex.__index && ex.__index.time) || null;
    const idxB = bars.index; const idxRet20 = idxB && idxB.c[i] != null && idxB.c[i - 20] != null ? idxB.c[i] / idxB.c[i - 20] - 1 : null;
    const idxPct = ex.__index && ex.__index.pct != null ? ex.__index.pct : (idxB && idxB.c[i] != null && idxB.c[i - 1] != null ? (idxB.c[i] / idxB.c[i - 1] - 1) * 100 : null);
    const rows = [];
    for (const [s, B] of Object.entries(bars.sym)) {
      const c = B.c[i]; if (c == null) continue; if (filter && !filter(s, date)) continue; const e = ex[s] || {};
      const prev = e.prev != null ? e.prev : B.c[i - 1]; const r = { sym: s, sector: sectorOf(s, custom), open: B.o[i], high: B.h[i], low: B.l[i], ltp: c, prev, vol: B.v[i], val: e.val != null ? e.val : B.t[i] };
      r.pct = e.pct != null ? e.pct : (prev ? (c / prev - 1) * 100 : null); r.chg = prev != null ? c - prev : null;
      let bars250 = 0; for (let k = Math.max(0, i - 249); k <= i; k++) if (B.c[k] != null) bars250++;
      r.histDays = bars250;
      r.h52 = e.h52 != null ? e.h52 : (bars250 >= 120 ? windowMax(B.h, i - 249, i) : null);
      r.l52 = e.l52 != null ? e.l52 : (bars250 >= 120 ? windowMin(B.l, i - 249, i) : null);
      // The 52-week high *before today* — the level a breakout has to clear. NSE's 52W H and a window ending at i both
      // include today's own high, so "close above the 52-week high" could never be true against them.
      // Prefer the bar window ending yesterday; else yesterday's snapshot figure; else today's figure when today did not set it.
      const exPrev = i > 0 && bars.extras[bars.dates[i - 1]] && bars.extras[bars.dates[i - 1]][s];
      r.priorHi = bars250 >= 120 ? windowMax(B.h, i - 249, i - 1)
        : (exPrev && exPrev.h52 != null) ? exPrev.h52
        : (r.h52 != null && (r.high == null || r.high < r.h52)) ? r.h52 : null;
      r.d30 = e.d30 != null ? e.d30 : (B.c[i - 21] != null ? (c / B.c[i - 21] - 1) * 100 : null);
      r.sma20 = sma(B.c, 20, i); r.sma50 = sma(B.c, 50, i); r.atr = atr(B, 14, i); r.rsi = rsi(B.c, 14, i);
      r.ret20 = B.c[i - 20] != null ? c / B.c[i - 20] - 1 : null;
      const vols = []; for (let k = Math.max(0, i - 20); k < i; k++) if (B.v[k]) vols.push(B.v[k]); r.relVol = vols.length >= 5 && r.vol ? r.vol / mean(vols) : null;
      const rng = (r.high != null && r.low != null) ? r.high - r.low : null; r.range = rng;
      r.closePos = rng ? (c - r.low) / rng : null; r.distHi = r.priorHi ? (r.priorHi - c) / r.priorHi * 100 : null; r.distLo = r.l52 ? (c - r.l52) / r.l52 * 100 : null;
      r.pos52 = (r.h52 && r.l52 && r.h52 > r.l52) ? (c - r.l52) / (r.h52 - r.l52) : null;
      r.trend = (r.sma20 != null && r.sma50 != null) ? (c > r.sma20 && r.sma20 > r.sma50 ? 'up' : c < r.sma20 && r.sma20 < r.sma50 ? 'down' : 'flat') : null;
      r.candle = candles(B, i);
      let impulse = null; for (let k = Math.max(1, i - 5); k < i; k++) { const p = B.c[k - 1] != null && B.c[k] != null ? (B.c[k] / B.c[k - 1] - 1) * 100 : null; if (p != null && p >= 3 && (!impulse || p > impulse.pct)) impulse = { pct: p, low: B.l[k], high: B.h[k], k }; }
      r.impulse = impulse; r._B = B;
      rows.push(r);
    }
    const ret20s = rows.map(r => r.ret20); const medianRet = (() => { const v = ret20s.filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; })();
    const bench = idxRet20 != null ? idxRet20 : medianRet;
    for (const r of rows) { r.rs = (r.ret20 != null && bench != null) ? (r.ret20 - bench) * 100 : null; }
    const rsVals = rows.map(r => r.rs); for (const r of rows) r.rsPct = percentileRank(rsVals, r.rs);
    const reg = regimeFromRows(rows, idxPct, time); const board = boardFromRows(rows);
    const signals = [];
    for (const r of rows) {
      r.leader = board.leaders.has(r.sector); r.laggard = board.laggards.has(r.sector);
      const sec = esc(r.sector); const reasons = []; let score = 50;
      const bump = (n, why) => { score += n; reasons.push((n > 0 ? '+' : '') + n + ' ' + why); };
      if (r.leader) { if (st.sectorBump) bump(st.sectorBump, 'leading sector'); } else if (r.laggard) bump(-10, 'lagging sector');
      if (r.rsPct != null) { if (r.rsPct >= 70) bump(10, `relative strength top ${Math.round(100 - r.rsPct)}%`); else if (r.rsPct <= 30) bump(-10, 'weak relative strength'); }
      if (r.trend === 'up') bump(10, 'price > 20-day > 50-day average'); else if (r.trend === 'down') bump(-10, 'below both moving averages');
      if (st.volumeBump && r.relVol != null && r.relVol >= 1.5) bump(st.volumeBump, `volume ${r.relVol.toFixed(1)}× average`);
      if (r.rsi != null && r.rsi >= 75) bump(-15, `RSI ${r.rsi.toFixed(0)} — extended`);
      const push = o => { let kind = o.kind;
        if (o.entry && r.candle.bull.length && !r.candle.bull.every(x => x === 'doji' || x === 'inside bar')) bump(5, 'bullish candle: ' + r.candle.bull.filter(x => x !== 'doji').join(', '));
        if (o.entry && r.candle.bear.length && !r.candle.bear.every(x => x === 'doji' || x === 'inside bar')) bump(-10, 'bearish candle: ' + r.candle.bear.filter(x => x !== 'doji').join(', '));
        score = Math.max(0, Math.min(100, score));
        if (kind === 'act' && score < 50) { kind = 'alert'; reasons.push('downgraded: score below 50'); }
        const sz = o.entry && o.stop ? sizing(o.entry, o.stop, reg, st) : null;
        signals.push(Object.assign({ sym: r.sym, sector: r.sector, row: r }, o, { kind, score, confidence: score >= 70 ? 'High' : score >= 55 ? 'Medium' : 'Low', reasons: reasons.slice(), size: sz })); };

      if ((r.distLo != null && r.distLo <= 5) || (r.d30 != null && r.d30 <= -8) || (r.trend === 'down' && r.d30 != null && r.d30 < 0)) {
        push({ kind: 'avoid', setup: 'Downtrend', why: `${r.distLo != null && r.distLo <= 5 ? `Trading ${r.distLo.toFixed(1)}% above its 52-week low` : r.trend === 'down' ? 'Below both its 20- and 50-day averages' : 'In a downtrend'}${r.d30 != null ? `, ${pct(r.d30, 1)} over 30 days` : ''}. Long swing setups have poor odds here; wait for a base and a reclaim of the 20-day average before reconsidering.` });
        continue;
      }
      if (r.distHi != null && r.distHi <= 2 && (r.d30 == null || r.d30 >= 0) && r.pct > -1.5) {
        const level = r.priorHi; const entry = tick(level * 1.003);
        const stopDist = r.atr != null ? Math.max(2 * r.atr, entry * 0.02) : Math.max(1.5 * (rng(r) || 0), entry * 0.025);
        const stop = tick(entry - stopDist); const risk = entry - stop; const target = tick(entry + RR * risk);
        const closedAbove = r.ltp > level; const extended = closedAbove && r.ltp > level * 1.04; // >4% through the level: chasing, not a breakout entry
        const triggered = closedAbove && !extended; const kind = triggered ? (reg.intraday ? 'alert' : 'act') : 'alert';
        push({ kind, setup: '52W breakout', level, entry, stop, target, rr: RR,
          trigger: triggered ? (reg.intraday ? `Above ${fmt(level)} now — needs a close above it` : `Buy-stop ${fmt(entry)} tomorrow; cancel if not filled`) : extended ? `Extended ${(r.ltp / level * 100 - 100).toFixed(1)}% above ${fmt(level)} — wait for a retest` : `Close above ${fmt(level)}`,
          why: `${closedAbove ? 'Closed above' : 'Sitting ' + r.distHi.toFixed(1) + '% below'} its prior 52-week high of <b>${fmt(level)}</b>${r.d30 != null ? ` with ${pct(r.d30, 1)} 30-day momentum` : ''}${r.leader ? ' in a <b>leading sector</b>' : ''}. Stop is ${r.atr != null ? '2 × ATR' : '1.5 × today\'s range'} below entry (${(stopDist / entry * 100).toFixed(1)}%); target ${RR}× the risk. Rule: buy only after a <b>close</b> above the level, via a buy-stop at ${fmt(entry)} the next session${extended ? '. <b>Already ' + (r.ltp / level * 100 - 100).toFixed(1) + '% through the level</b> — do not chase; wait for a pullback toward it' : ''}.` });
        continue;
      }
      const strongToday = r.pct >= 2 && (r.d30 == null || r.d30 >= 5) && r.leader;
      const imp = r.impulse;
      const pullback = imp && r.pct <= 1 && r.pct >= -3 && r.ltp > imp.low && (r.d30 == null || r.d30 >= 5) && !r.laggard && (r.sma20 == null || r.ltp >= r.sma20 * 0.98);
      if (pullback) {
        const entry = tick(r.high * 1.003); const base = Math.min(r.low, imp.low); const stop = tick(r.atr != null ? base - 0.5 * r.atr : base * 0.995); const risk = entry - stop; const target = tick(entry + RR * risk);
        const capped = r.h52 && target > r.h52;
        push({ kind: 'act', setup: 'Pullback buy', level: r.high, entry, stop, target, rr: RR, trigger: `Buy-stop ${fmt(entry)} tomorrow (above today's high); cancel if not filled`,
          why: `Impulse day of <b>${pct(imp.pct, 1)}</b> within the last 5 sessions, then a ${pct(r.pct, 1)} day that <b>held above the impulse low (${fmt(imp.low)})</b>${r.sma20 != null ? ` and the 20-day average (${fmt(r.sma20)})` : ''}. Buy the reclaim of today's high; stop ${r.atr != null ? 'half an ATR' : '0.5%'} under the lower of today's low and the impulse low.${capped ? ` <b>Target sits above the 52-week high (${fmt(r.h52)})</b> — expect resistance there.` : ''}${reg.state === 'Weak' ? ' Breadth is weak: size is halved.' : ''}` });
        continue;
      }
      if (strongToday) {
        const faded = r.closePos != null && r.closePos < 0.5; const lo = Math.min(r.prev, r.low), hi = Math.max(r.prev, r.low);
        push({ kind: 'watch', setup: 'Momentum — wait', level: r.prev, trigger: `Pullback toward ${fmt(lo)}–${fmt(hi)} on light volume`,
          why: `Up <b>${pct(r.pct, 1)}</b> today in <b>${sec}</b>, a leading sector, with ${pct(r.d30, 1)} over 30 days${r.relVol != null ? ` on ${r.relVol.toFixed(1)}× normal volume` : ''}. Rule: do not chase. ${faded ? '<b>Closed in the lower half of its range</b> — the move is fading; ' : 'Closed in the upper half of its range — follow-through intact; '}watch for a 1–3 day pullback that holds above today's low (${fmt(r.low)}), then buy the reclaim.` });
        continue;
      }
      if (r.leader && r.d30 != null && r.d30 >= 5 && r.pct > -3) {
        push({ kind: 'watch', setup: 'Sector leader', trigger: `Pullback that holds ${fmt(r.low)}`,
          why: `In <b>${sec}</b>, currently a leading sector, with ${pct(r.d30, 1)} 30-day momentum${r.rsPct != null ? ` and relative strength in the top ${Math.max(1, Math.round(100 - r.rsPct))}%` : ''}. No trigger today (${pct(r.pct, 1)}). A quiet pullback followed by a reclaim day is the entry.` });
      }
    }
    for (const r of rows) delete r._B;
    const order = { act: 0, alert: 1, watch: 2, avoid: 3 };
    signals.sort((a, b) => order[a.kind] - order[b.kind] || b.score - a.score || (b.row.val || 0) - (a.row.val || 0));
    const coverage = rows.length ? Math.round(mean(rows.map(r => Math.min(r.histDays, 250)))) : 0;
    return { signals, reg, board, universe: rows, date, time, coverage, count: rows.length };
  }
  function rng(r) { return (r.high != null && r.low != null) ? r.high - r.low : null; }

  /** Convenience for the site and the job: history files + snapshots → analysis of the latest date. */
  function analyzeLatest(historyFiles, snaps, settings, custom, adjustments) {
    const bars = buildBars(historyFiles, snaps, { adjustments }); if (!bars.dates.length) return { signals: [], reg: null, board: null, universe: [], bars, snap: null, coverage: 0 };
    const i = bars.dates.length - 1; const snap = (snaps || []).find(s => s.date === bars.dates[i]) || null;
    const res = analyzeAt(bars, i, { settings, custom, time: snap ? snap.time : null });
    res.bars = bars; res.snap = snap || { date: bars.dates[i], time: null, count: res.count, index: bars.index && bars.index.c[i] != null ? { name: bars.index.name, ltp: bars.index.c[i], pct: res.reg.idx } : null };
    return res;
  }
  /* Back-compat: snapshots only. */
  function buildSignals(snaps, settings, custom) { return analyzeLatest([], snaps, settings, custom); }

  function journalStatus(t, bars) {
    let stopHit = null, targetHit = null, last = null; const B = bars.sym[t.sym];
    if (B) for (let i = 0; i < bars.dates.length; i++) { const d = bars.dates[i]; if (d < t.date || B.c[i] == null) continue; last = { date: d, ltp: B.c[i] };
      if (!stopHit && B.l[i] != null && B.l[i] <= t.stop) stopHit = d; if (!targetHit && B.h[i] != null && B.h[i] >= t.target) targetHit = d; }
    const risk = t.entry - t.stop; const mark = t.status === 'closed' ? t.exit : (last ? last.ltp : null);
    const R = (mark != null && risk > 0) ? (mark - t.entry) / risk : null; const pnl = mark != null ? (mark - t.entry) * t.qty : null;
    const label = t.status === 'closed' ? 'Closed' : (!last ? 'No data since entry' : stopHit && (!targetHit || stopHit <= targetHit) ? 'Stop hit ' + stopHit : targetHit ? 'Target touched ' + targetHit : 'Open');
    return { label, R, pnl, mark, last, stopHit, targetHit };
  }
  /* Positions card, swing half (18 Nov 2026; owner's item of 5 Nov). For an open journal trade, one line a day — hold / raise the stop /
   * exit — from the rules the backtest applies and nothing else, so it cannot editorialise:
   *   swing setups (Momentum pullback, Breakout, Pullback): out if a day opens through or trades at the stop; out at the target (the 2R
   *     level logged with the trade); stop to the entry price after a close at +1R or better; out at the close of the 15th bar held.
   *     This is scripts/backtest.mjs's management, bar for bar. The 5 Nov note also wanted the stop trailed on the 20-day average above
   *     +2R; the backtest sells at the target instead and every moving-average exit it tried was worse, so the card follows the backtest.
   *   Momentum (a name bought off the momentum list by hand): 20% trailing stop from the highest close since entry, judged on closes;
   *     out at the next rebalance once it is below rank `holdRank` (pass opts.rank = {SYM: rank} from the day's ranking).
   *   Discretionary / Other: the stop, the target and the breakeven move, but no time stop — the owner's calls carry no holding rule.
   * Days are read strictly after the entry date. Returns { action: 'hold'|'raise'|'exit'|'wait', stop, bars, R, text, exit }. */
  const POSITION_RULES = { swing: ['Momentum pullback', 'Breakout', 'Pullback'], maxHold: 15, trail: 20, holdRank: 30 };
  function positionLine(t, bars, opts) {
    opts = opts || {}; const PR = POSITION_RULES; const B = bars && bars.sym ? bars.sym[t.sym] : null; const risk = t.entry - t.stop;
    const base = { sym: t.sym, setup: t.setup || '', stop: t.stop, bars: 0, R: null, exit: null };
    if (!B || !(risk > 0)) return Object.assign(base, { action: 'wait', text: !B ? 'No price history for this symbol' : 'Stop is not below the entry — no line' });
    const days = []; for (let i = 0; i < bars.dates.length; i++) if (bars.dates[i] > t.date && B.c[i] != null) days.push(i);
    if (!days.length) return Object.assign(base, { action: 'wait', text: `No close since entry yet — stop ${fmt(t.stop)} goes in with the order` });
    const last = days[days.length - 1], lastDate = bars.dates[last], c = B.c[last]; const R = (c - t.entry) / risk; const sR = x => (x >= 0 ? '+' : '') + x.toFixed(1) + 'R';
    if (t.setup === 'Momentum') {
      let peak = t.entry, peakDate = t.date, hit = null;
      for (const i of days) { if (B.c[i] > peak) { peak = B.c[i]; peakDate = bars.dates[i]; } if (!hit && B.c[i] < peak * (1 - PR.trail / 100)) hit = { date: bars.dates[i], price: B.c[i], reason: 'trailing stop' }; }
      const stop = +(peak * (1 - PR.trail / 100)).toFixed(2); const out = Object.assign(base, { stop, bars: days.length, R });
      if (hit) return Object.assign(out, { action: 'exit', exit: hit, text: `Exit — closed below the ${PR.trail}% trailing stop on ${hit.date} (${fmt(hit.price)})` });
      const rk = opts.rank ? opts.rank[t.sym] : undefined; const hr = opts.holdRank || PR.holdRank;
      if (opts.rank && (rk == null || rk > hr)) return Object.assign(out, { action: 'exit', exit: { date: lastDate, price: c, reason: 'rank' }, text: `Out at the next rebalance — ${rk == null ? 'no longer ranked' : 'rank ' + rk + ', below ' + hr}; until then the trailing stop is ${fmt(stop)}` });
      return Object.assign(out, { action: peakDate === lastDate && days.length > 1 ? 'raise' : 'hold', text: `${peakDate === lastDate && days.length > 1 ? 'Raise stop to' : 'Hold — trailing stop'} ${fmt(stop)} (${PR.trail}% under the highest close, ${fmt(peak)} on ${peakDate})${rk != null ? `, rank ${rk}` : ''}` });
    }
    const timed = PR.swing.includes(t.setup); let stop = t.stop, raised = null, exit = null, n = 0;
    for (const i of days) { n++; const o = B.o[i], h = B.h[i], l = B.l[i], cl = B.c[i]; const d = bars.dates[i];
      if (o != null && o <= stop) exit = { date: d, price: o, reason: 'gap through stop' };
      else if (l != null && l <= stop) exit = { date: d, price: stop, reason: stop >= t.entry ? 'breakeven stop' : 'stop' };
      else if (t.target > 0 && o != null && o >= t.target) exit = { date: d, price: o, reason: 'gap above target' };
      else if (t.target > 0 && h != null && h >= t.target) exit = { date: d, price: t.target, reason: 'target' };
      else if (timed && n >= PR.maxHold) exit = { date: d, price: cl, reason: 'time stop' };
      if (exit) break;
      if (cl >= t.entry + risk && stop < t.entry) { stop = t.entry; raised = d; } }
    const out = Object.assign(base, { stop, bars: n, R });
    if (exit) { const xR = (exit.price - t.entry) / risk; const what = { 'gap through stop': `opened through the stop at ${fmt(exit.price)}`, 'stop': `stop ${fmt(exit.price)} was hit`, 'breakeven stop': `breakeven stop ${fmt(exit.price)} was hit`, 'gap above target': `opened above the target at ${fmt(exit.price)}`, 'target': `target ${fmt(exit.price)} was reached`, 'time stop': `${PR.maxHold} bars held, out at the close ${fmt(exit.price)}` }[exit.reason];
      return Object.assign(out, { action: 'exit', exit, R: xR, text: `Exit — ${what} on ${exit.date} (${sR(xR)})` }); }
    const left = timed ? `, bar ${n} of ${PR.maxHold}` : '';
    if (raised === lastDate) return Object.assign(out, { action: 'raise', text: `Raise stop to ${fmt(stop)} (breakeven) — closed at ${sR(R)} today${t.target > 0 ? `; target ${fmt(t.target)}` : ''}${left}` });
    if (raised) return Object.assign(out, { action: 'hold', text: `Hold — stop at breakeven ${fmt(stop)} since ${raised}, now ${sR(R)}${t.target > 0 ? `; target ${fmt(t.target)}` : ''}${left}` });
    return Object.assign(out, { action: 'hold', text: `Hold — stop ${fmt(stop)} (${((c / stop - 1) * 100).toFixed(1)}% away), now ${sR(R)}; to breakeven on a close at ${fmt(tick(t.entry + risk))}${t.target > 0 ? `; target ${fmt(t.target)}` : ''}${left}` });
  }
  /** Telegram block for open positions pasted into config.json ("positions": [{sym, date, entry, stop, target?, qty?, setup}]). null when there are none. */
  function positionsDigest(list, bars, opts) {
    const open = (Array.isArray(list) ? list : []).filter(t => t && t.sym && t.date && t.entry > 0 && t.stop > 0 && t.status !== 'closed'); if (!open.length) return null;
    const L = [`OPEN POSITIONS (${open.length}) — from config.json; the line is the rule, not an opinion`];
    for (const t of open) { const p = positionLine(Object.assign({ target: 0 }, t, { sym: String(t.sym).toUpperCase() }), bars, opts); L.push(`• ${p.sym}${t.setup ? ' [' + t.setup + ']' : ''} — ${p.text}`); }
    return L.join('\n');
  }
  /* Discretionary book (18 Nov 2026; owner's instruction of 13 Nov). The owner's hunches get their own journal setup so they are scored
   * instead of argued about: a fixed budget — at most DISCRETIONARY.maxOpen open positions, each at half the normal risk and half the
   * normal position cap — and one written sentence at entry saying why. It is read in R at the three- and six-month checks beside the
   * momentum paper book and the index fund, and it never changes a rule in this file. */
  const DISCRETIONARY = { setup: 'Discretionary', maxOpen: 2, sizeFactor: 0.5, minWhy: 12 };
  /** Can this discretionary trade be logged? t = {entry, stop, qty?, why}. Returns { ok, reason, maxQty, open }: maxQty is the half-size
   *  quantity (sizing() on half the risk and half the position cap); a missing qty is to be filled with it, a larger one is refused. */
  function discretionaryCheck(journal, t, settings) {
    const D = DISCRETIONARY; const st = Object.assign({}, DEFAULTS, settings || {});
    const open = (journal || []).filter(x => x && x.setup === D.setup && x.status !== 'closed').length;
    const sz = sizing(t.entry, t.stop, null, Object.assign({}, st, { riskPct: st.riskPct * D.sizeFactor, maxPos: st.maxPos * D.sizeFactor })); const maxQty = sz ? sz.qty : 0;
    const fail = reason => ({ ok: false, reason, maxQty, open });
    if (open >= D.maxOpen) return fail(`The discretionary book is full: ${open} of ${D.maxOpen} open. Close one before adding another.`);
    if (String(t.why || '').trim().length < D.minWhy) return fail('A discretionary trade needs one written sentence saying why — it is what gets scored later.');
    if (maxQty < 1) return fail('At half size this stop allows no shares: the stop is too far from the entry for the discretionary budget.');
    if (t.qty != null && t.qty > maxQty) return fail(`Half size is at most ${maxQty} shares for this entry and stop (you entered ${t.qty}).`);
    return { ok: true, reason: null, maxQty, open };
  }
  /** The journal read book by book, in R: Discretionary, Momentum pullback, and everything else. Closed trades give the expectancy;
   *  open ones are marked at the last close. Returns [{book, open, closed, wins, totalR, avgR, openR}], only books that have trades. */
  function bookStats(journal, bars) {
    const bookOf = t => t.setup === DISCRETIONARY.setup ? DISCRETIONARY.setup : t.setup === 'Momentum pullback' ? 'Momentum pullback' : 'Other setups';
    const by = {}; for (const t of journal || []) { if (!t) continue; const k = bookOf(t); const b = by[k] = by[k] || { book: k, open: 0, closed: 0, wins: 0, totalR: 0, openR: 0 };
      const R = journalStatus(t, bars || { dates: [], sym: {} }).R; if (t.status === 'closed') { b.closed++; if (R != null) { b.totalR += R; if (R > 0) b.wins++; } } else { b.open++; if (R != null) b.openR += R; } }
    return [DISCRETIONARY.setup, 'Momentum pullback', 'Other setups'].filter(k => by[k]).map(k => Object.assign(by[k], { avgR: by[k].closed ? by[k].totalR / by[k].closed : null }));
  }
  /* Data notices (19 Nov 2026, interim audit A7 and A18). Two things the day's own NSE rows say about the bars, read before anything is computed:
   *
   * pendingAdjustments — a bonus or split the adjustments table does not know yet. On the ex-date NSE's *change* is measured from the
   *   adjusted base price while its *previous close* stays raw (CONCORDBIO, 1:1 bonus, 4 Nov 2026: previous close 1,227.90, last 655.10,
   *   change +6.69%), so previous close ÷ (last ÷ (1 + change)) is the factor — 1.9998 there. Until the table has the event the bars show a
   *   47% fall: a trailing-stop sale in the paper book, an "avoid", a name dropped from the momentum list. A name counts only when the bars'
   *   own previous close agrees with NSE's (within 3%) — otherwise the bars are missing a session and the gap is not a corporate action —
   *   and the factor is 8% or more away from 1. The factor is snapped to a simple ratio (2, 1.5, 1.25, 5 …) when it is within 0.4% of one.
   * sessionGap — the share of names whose previous close on the bars differs from NSE's by more than 0.5%. An ordinary day has 5–15%
   *   (NSE's close is a half-hour average, the bars carry the last price); the day after a session the history lacks has most of them
   *   (9 Nov 2026, after the Sunday Muhurat session of 8 Nov: 350 of 500). `missing` is true above 40%.
   * Both take bars built with the day's snapshot (extras carry NSE's prev and pct) and the index of that day. */
  function snapFactor(f) { for (let den = 1; den <= 10; den++) { const n = Math.round(f * den); if (n > 0 && Math.abs(n / den - f) / f < 0.004) return +(n / den).toFixed(6); } return +f.toFixed(4); }
  function pendingAdjustments(bars, i) {
    const date = bars.dates[i]; const ex = bars.extras && bars.extras[date]; const out = []; if (!ex || i < 1) return out;
    for (const [s, e] of Object.entries(ex)) { if (s === '__index' || !e || !(e.prev > 0) || e.pct == null || !(1 + e.pct / 100 > 0)) continue;
      const B = bars.sym[s]; const c = B && B.c[i], y = B && B.c[i - 1]; if (!(c > 0) || !(y > 0)) continue;
      if (Math.abs(y / e.prev - 1) > 0.03) continue;                       // the bars and NSE disagree about yesterday: a missing session, not an ex-date
      const implied = c / (1 + e.pct / 100); const f = e.prev / implied; if (!(f >= 1.08 || f <= 0.92)) continue;
      out.push({ sym: s, exDate: date, prevDate: bars.dates[i - 1], factor: snapFactor(f), observed: +f.toFixed(4), yclose: y, prev: e.prev, close: c, pct: e.pct, implied: +implied.toFixed(2) }); }
    return out.sort((a, b) => a.sym < b.sym ? -1 : 1);
  }
  function sessionGap(bars, i) {
    const date = bars.dates[i]; const ex = bars.extras && bars.extras[date]; if (!ex || i < 1) return null; let n = 0, off = 0;
    for (const [s, e] of Object.entries(ex)) { if (s === '__index' || !e || !(e.prev > 0)) continue; const B = bars.sym[s]; const y = B && B.c[i - 1]; if (!(y > 0)) continue; n++; if (Math.abs(y / e.prev - 1) > 0.005) off++; }
    return { date, prevDate: bars.dates[i - 1], n, off, share: n ? off / n : 0, missing: n >= 50 && off / n > 0.4 };
  }
  /** Has the latest saved snapshot already got everything NSE can have published? (21 Nov 2026.) `latest` = {date, time} of the last
   *  snapshot on file; `nowMs` = the clock. The last session that can be final is today's once it is 16:00 IST (the table's closing
   *  stamp), otherwise the previous calendar day's. If the snapshot on file is that day's — or a later one — and carries the 16:00
   *  stamp, a run has nothing to fetch and does not call NSE at all. The slot ladder starts about a dozen runs after the one that
   *  sends the digest; until this check each of them made four calls to NSE to learn that nothing had changed, and on 19 and 20 Nov
   *  2026 one of them a night was answered HTTP 403 and failed the run. Weekends and holidays are not known here, so on those days
   *  the answer is false and the run asks NSE once, as before ('snapshot unchanged'). */
  function sessionDone(latest, nowMs) {
    if (!latest || !latest.date || !latest.time || !(String(latest.time) >= '16:00')) return false;
    const ist = new Date((nowMs == null ? Date.now() : nowMs) + 330 * 60000); const hhmm = ist.toISOString().slice(11, 16);
    const cutoff = hhmm >= '16:00' ? ist.toISOString().slice(0, 10) : new Date(ist.getTime() - 86400000).toISOString().slice(0, 10);
    return String(latest.date) >= cutoff;
  }
  /** The Telegram alert for a daily run that failed (21 Nov 2026). o = { what, nowMs, latest: {date, time}|null, scheduled, runUrl }.
   *  It names the fault, the last snapshot on file, and what happens next — the ladder's later slots retry on a scheduled run. */
  function failureNotice(o) {
    o = o || {}; const ist = new Date((o.nowMs == null ? Date.now() : o.nowMs) + 330 * 60000); const at = `${ist.toISOString().slice(0, 10)} ${ist.toISOString().slice(11, 16)} IST`;
    const L = [`⚠ Nifty Swing Desk — the daily run failed at ${at}: ${o.what || 'unknown error'}.`];
    L.push(o.latest && o.latest.date ? `Last snapshot on file: ${o.latest.date}${o.latest.time ? ' ' + o.latest.time : ''}.` : 'No snapshot on file yet.');
    L.push(o.scheduled ? 'The later slots tonight try again on their own, and the digest comes from the first that gets through. If none has by morning: Actions → Daily NSE snapshot → Run workflow, or "npm run fetch" from your own machine, or upload the CSV on the site.'
      : 'Run it again (Actions → Daily NSE snapshot → Run workflow), or "npm run fetch" from your own machine, or upload the CSV on the site.');
    if (o.runUrl) L.push(`Log: ${o.runUrl}`);
    return L.join('\n');
  }
  /** Dates in the last `span` (260) bars up to bar i on which the index series has no close, once the series has started (audit A8). */
  function indexHoles(bars, i, span) {
    const idx = bars && bars.index; const out = []; if (!idx || !idx.c) return out; let j0 = idx.c.findIndex(v => v != null); if (j0 < 0) return out;
    for (let j = Math.max(j0, i - (span || 260)); j <= i; j++) if (idx.c[j] == null) out.push(bars.dates[j]);
    return out;
  }
  /** The entry the daily job writes into data/adjustments.json for a pendingAdjustments hit: applied at once, marked provisional, replaced by the verified row at the next corporate-actions refresh. */
  function provisionalEvent(p) { return { exDate: p.exDate, type: 'provisional', detail: `÷${p.factor}, read off NSE's change on the ex-date by the daily job`, factor: p.factor, observed: p.observed, source: `daily job ${p.exDate}: NSE change ${p.pct}% on a close of ${p.close} after ${p.yclose}`, checked: `${p.prevDate} close ${p.yclose} → ${p.exDate} NSE previous close ${p.prev}, adjusted base ${p.implied}`, apply: true, provisional: true }; }
  /** Telegram block for the data notices; null when there is nothing to say. `applied` false = found but not written (too many at once).
   *  `ix` (21 Nov 2026, audit A8) = { repaired: [{date, source}], missing: [dates], gate } — index closes the job filled today, the ones
   *  still missing, and the momentum gate it computed, so a gate that stepped over a hole or fell back to breadth is never silent. */
  function noticesDigest(pend, gap, applied, ix) {
    const L = []; pend = pend || [];
    for (const p of pend.slice(0, 6)) L.push(`• ${applied === false ? 'LOOKS ADJUSTED, NOT APPLIED' : 'ADJUSTED'}: ${p.sym} ÷${p.factor} before ${p.exDate} — NSE's change today is ${pct(p.pct)} where the raw bars say ${pct((p.close / p.yclose - 1) * 100, 1)}: a bonus or split went ex. ${applied === false ? 'Too many in one day to apply unseen; check and run corporate-actions' : 'Provisional until the corporate-actions refresh'} (BACKFILL.md)`);
    if (pend.length > 6) L.push(`• … and ${pend.length - 6} more`);
    if (gap && gap.missing) L.push(`• HISTORY GAP: ${gap.off} of ${gap.n} previous closes differ from NSE's — a session between ${gap.prevDate} and ${gap.date} is not in the history (a weekend or special session, or a day the job did not run). Fill it from home (BACKFILL.md)`);
    if (ix) { const list = a => a.slice(0, 4).join(', ') + (a.length > 4 ? ` and ${a.length - 4} more` : ''); const rep = ix.repaired || [], miss = ix.missing || [], g = ix.gate;
      if (rep.length) L.push(`• INDEX REPAIRED: the NIFTY 50 close for ${list(rep.map(r => r.date))} was missing and is now filled (${[...new Set(rep.map(r => r.source))].join('; ')})`);
      if (miss.length) L.push(`• INDEX GAP: no NIFTY 50 close for ${list(miss)} — the repair is retried at every run${g && g.source === 'index' && g.holes ? `; the gate's ${g.n}-day average steps over ${g.holes === 1 ? 'it' : 'them'} (${g.holes} of ${g.n})` : ''}. If it stays, fill it from home (BACKFILL.md, "A missing index bar")`);
      if (g && g.source === 'breadth') L.push(`• GATE FROM BREADTH: the NIFTY 50 series cannot give a ${g.n}-day average today (too many closes missing, or too short), so the gate is the share of stocks above their own 200-day average (${Math.round(g.breadth * 100)}%) — not the rule the backtest used`); }
    return L.length ? ['DATA NOTICES', ...L].join('\n') : null;
  }
  /** Reminders for the digest (config.json "reminders": [{date, text, repeat?: 'monthly'|'quarterly'|'semiannual', days?}]). A reminder is due from its
   *  date for `days` days if it says so, otherwise for `windowDays` (7) days, so a missed day still nags for a week; a repeating one is due around every occurrence. Returns
   *  the digest block or null. Edit or remove the entry in config.json once the check is done. */
  function remindersDue(list, today, windowDays) {
    if (!Array.isArray(list) || !list.length || !today) return null; const W = windowDays || 7;
    const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
    const addMonths = (d, n) => { const t = new Date(d + 'T00:00:00Z'); const day = t.getUTCDate(); t.setUTCDate(1); t.setUTCMonth(t.getUTCMonth() + n); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(day, last)); return t.toISOString().slice(0, 10); };
    const due = [];
    for (const r of list) { if (!r || !r.date || !r.text) continue; const step = r.repeat === 'monthly' ? 1 : r.repeat === 'quarterly' ? 3 : r.repeat === 'semiannual' ? 6 : 0;
      let occ = r.date; if (step) { let guard = 0; while (addMonths(occ, step) <= today && guard++ < 600) occ = addMonths(occ, step); }
      const d = dayDiff(occ, today); if (d >= 0 && d < (r.days > 0 ? r.days : W)) due.push({ date: occ, text: r.text, repeat: r.repeat || null }); }   // `days` (21 Nov 2026): a note that should show for fewer days than a check, so two long ones do not push the digest over Telegram's cap
    if (!due.length) return null;
    return ['DESK CHECKS DUE', ...due.map(r => `• ${r.date}${r.repeat ? ' (' + r.repeat + ')' : ''} — ${r.text}`)].join('\n');
  }

  /** Telegram text. `blocks` = { momentum, paper, reminders } are the other engines' digests (strings); in swingMode 'watch'
   *  the momentum list comes first, then the paper book (13 Nov 2026), and swing setups are listed as levels to watch, without quantities. */
  /** Tag swing signals whose symbol is in the momentum engine's top `topRank` (default 30, the engine's holdRank).
   *  Sets s.momRank on every such signal and s.tag = 'momentum pullback' on pullback buys — the slice that passed on today's
   *  names (12 Nov 2026: +0.16R over 638 trades) and failed on the full membership the same day (+0.09R over 594 trades,
   *  reports/swing-membership-2026-11-12-adjusted-members.md); tagged so the paper record stays separate, not because it earned it.
   *  Tagged pullbacks move to the front of the act list, in score order; everything else keeps its order. Returns the count. */
  function tagMomentum(signals, ranked, topRank) {
    const N = topRank || 30; const rank = {}; for (const r of ranked || []) if (r.rank <= N) rank[r.sym] = r.rank;
    let n = 0; for (const s of signals) { delete s.momRank; delete s.tag; if (rank[s.sym] == null) continue; s.momRank = rank[s.sym]; if (s.setup === 'Pullback buy') { s.tag = 'momentum pullback'; if (s.kind === 'act') n++; } }
    const order = { act: 0, alert: 1, watch: 2, avoid: 3 };
    signals.sort((a, b) => order[a.kind] - order[b.kind] || ((b.tag === 'momentum pullback') - (a.tag === 'momentum pullback')) || b.score - a.score || (b.row.val || 0) - (a.row.val || 0));
    return n;
  }
  /** Split a long text into pieces of at most `max` characters at blank lines, for Telegram's 4,096-character cap (13 Nov 2026). */
  function chunks(text, max) {
    max = max || 4000; const out = []; let cur = '';
    for (const block of String(text).split('\n\n')) { const piece = block.length > max ? block.slice(0, max) : block;
      if (cur && (cur.length + 2 + piece.length) > max) { out.push(cur); cur = piece; } else cur = cur ? cur + '\n\n' + piece : piece; }
    if (cur) out.push(cur); return out;
  }
  /** Caps on the watch-mode lists, loosest first (18 Nov 2026). digestFit walks down this ladder until the digest fits one Telegram
   *  message; the momentum list, the paper book, the momentum pullbacks and the reminders are never trimmed. 0 = header and count only. */
  const DIGEST_CAPS = [{ other: 5, alerts: 4, watch: 4 }, { other: 3, alerts: 3, watch: 3 }, { other: 3, alerts: 2, watch: 2 }, { other: 2, alerts: 0, watch: 0 }];
  const TELEGRAM_MAX = 4096;
  /** The digest at the loosest caps that fit `max` characters (Telegram's 4,096). Returns { text, level, fits }: level is the index
   *  into DIGEST_CAPS that was used; when nothing fits (a day with a long BOUGHT / SOLD line), the untrimmed text comes back with
   *  fits = false and the sender splits it at blank lines (chunks). Orders mode is never trimmed. */
  function digestFit(result, settings, blocks, max) {
    max = max || TELEGRAM_MAX; blocks = blocks || {}; const st = Object.assign({}, DEFAULTS, settings || {});
    const full = digest(result, settings, blocks); if (full.length <= max || st.swingMode !== 'watch') return { text: full, level: 0, fits: full.length <= max };
    for (let k = 1; k < DIGEST_CAPS.length; k++) { const t = digest(result, settings, Object.assign({}, blocks, { caps: DIGEST_CAPS[k] })); if (t.length <= max) return { text: t, level: k, fits: true }; }
    return { text: full, level: 0, fits: false };
  }
  function digest(result, settings, blocks) {
    const { signals, reg, board } = result; if (!reg) return 'No data.'; const st = Object.assign({}, DEFAULTS, settings || {}); blocks = blocks || {};
    const watchOnly = st.swingMode === 'watch'; const caps = Object.assign({}, watchOnly ? DIGEST_CAPS[0] : { other: 8, alerts: 8, watch: 8 }, blocks.caps || {});
    const top = (n, cap) => n > cap ? (cap ? ` — top ${cap}` : ' — on the site') : '';
    const L = []; const snap = result.snap; const idx = snap && snap.index ? `${snap.index.name} ${fmt(snap.index.ltp)} (${pct(snap.index.pct)})` : 'index n/a';
    L.push(`Nifty Swing Desk — ${result.date}${result.time ? ' ' + result.time : ''}${reg.intraday ? ' (intraday)' : ''}`);
    L.push(`Tape: ${reg.state} · breadth ${reg.up}▲/${reg.down}▼ · ${idx} · history ${result.coverage}/250 bars`);
    const leaders = [...board.leaders]; L.push(`Leading sectors: ${leaders.length ? leaders.join(', ') : 'none qualify'}`);
    if (blocks.notices) L.push('', blocks.notices);   // a corporate action applied today, a session missing from the history (19 Nov 2026); never trimmed
    if (watchOnly && blocks.momentum) L.push('', blocks.momentum);
    if (blocks.paper) L.push('', blocks.paper);
    if (blocks.positions) L.push('', blocks.positions);   // open positions pasted into config.json (18 Nov 2026); never trimmed
    const by = k => signals.filter(s => s.kind === k); const act = by('act'), alert = by('alert'), watch = by('watch');
    if (watchOnly) {
      // 15 Nov 2026: the digest passed Telegram's 4,096-character cap once the paper book joined it, so in watch mode the swing
      // blocks carry the levels and a one-line reading each; the backtest citations, the full lists and the counts beyond the
      // caps live on the site. The momentum list and the paper book — the live record — are not trimmed.
      const mp = act.filter(s => s.tag === 'momentum pullback'), rest = act.filter(s => s.tag !== 'momentum pullback');
      L.push('', `MOMENTUM PULLBACKS (${mp.length}) — paper trades, not orders: +0.08R over 587 trades on the full membership, under the +0.1R bar (reports/swing-membership-2026-11-21-adjusted-members.md); log as "Momentum pullback"`);
      mp.slice(0, 8).forEach(s => L.push(`• ${s.sym} [${s.score}] momentum #${s.momRank} — buy-stop ${fmt(s.entry)} tomorrow, stop ${fmt(s.stop)}, 2R at ${fmt(s.target)}${s.size ? `, paper qty ${s.size.qty}` : ''}`));
      if (!mp.length) L.push('• none today — most days there are none; that is the rule working, not failing');
      else L.push('  (as backtested: ≤4 open, one per sector, score order; stop to breakeven at +1R; out after 15 bars)');
      L.push('', `OTHER SWING SETUPS (${rest.length}) — levels to watch, not orders: no edge over ten years (−0.05R, 872 trades, full membership)${rest.length > caps.other ? `; top ${caps.other} here, all ${rest.length} on the site` : ''}`);
      rest.slice(0, caps.other).forEach(s => L.push(`• ${s.sym} [${s.score}]${s.momRank ? ` momentum #${s.momRank}` : ''} — ${s.setup}: trigger ${fmt(s.entry)}, invalid below ${fmt(s.stop)}, 2R at ${fmt(s.target)}`));
      if (!rest.length) L.push('• none today');
    } else {
      L.push('', `ORDERS FOR TOMORROW (${act.length}) — buy-stop with stop-loss attached; cancel if not filled`);
      act.slice(0, 8).forEach(s => L.push(`• ${s.sym} [${s.score}]${s.tag ? ' ★ momentum pullback' : ''} — ${s.setup}: buy-stop ${fmt(s.entry)}, stop-loss ${fmt(s.stop)}, target ${fmt(s.target)}${s.size ? `, qty ${s.size.qty}` : ''}`));
      if (!act.length) L.push('• nothing — no trade is a valid outcome');
    }
    // breakout alerts and the watch list are pre-setup triggers for a watch-only engine: four lines each in watch mode (alerts since 15 Nov 2026,
    // the watch list since 18 Nov — eight watch lines put both buy-free days of 16–17 Nov over the cap), the rest on the site
    L.push('', `ALERTS (${alert.length})${top(alert.length, caps.alerts)}`); alert.slice(0, caps.alerts).forEach(s => L.push(`• ${s.sym} [${s.score}] — ${s.trigger}`)); if (!alert.length) L.push('• none');
    L.push('', `WATCH (${watch.length})${top(watch.length, caps.watch)}`); watch.slice(0, caps.watch).forEach(s => L.push(`• ${s.sym} [${s.score}] — ${s.setup}${s.trigger ? ': ' + s.trigger : ''}`)); if (!watch.length) L.push('• none');
    if (watchOnly) L.push('', `Avoid list: ${by('avoid').length} names. [score] = 0–100 setup quality (no edge in the backtest).`);
    else L.push('', `Avoid list: ${by('avoid').length} names. Risk/trade ₹${fmt(st.capital * st.riskPct / 100 * reg.sizeMult, 0)}${reg.sizeMult < 1 ? ' (halved: weak breadth)' : ''}. [score] = 0–100 setup quality.`);
    if (!watchOnly && blocks.momentum) L.push('', blocks.momentum);
    if (blocks.reminders) L.push('', blocks.reminders);
    L.push('', watchOnly ? 'Rules engine output, not advice. Momentum is the only list with a positive ten-year record and the paper book is its live test; swing levels are for watching. Full lists on the site.'
      : 'Rules engine output, not advice. Orders are conditional on tomorrow\'s price; a setup that is gone tomorrow was not triggered.');
    return L.join('\n');
  }

  return { SECTOR_LISTS, SECTOR_OF, DEFAULTS, F, tick, fmt, pct, esc, rowObj, sectorOf, parseAny, rowsFromCSV, rowsFromPaste, rowsFromNseApi, toSnapshotDoc,
    sameIndex, buildBars, clipBars, applyAdjustments, appendSnapshotToHistory, analyzeAt, analyzeLatest, buildSignals, sizing, journalStatus, DISCRETIONARY, discretionaryCheck, bookStats, POSITION_RULES, positionLine, positionsDigest, pendingAdjustments, sessionGap, sessionDone, indexHoles, failureNotice, provisionalEvent, noticesDigest, snapFactor, tagMomentum, digest, digestFit, DIGEST_CAPS, TELEGRAM_MAX, chunks, remindersDue, indexCode, benchmarkClose, INDEX_CODES, indicators: { sma, atr, rsi, candles } };
});
