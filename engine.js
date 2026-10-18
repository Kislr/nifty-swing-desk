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

  const DEFAULTS = { capital: 500000, riskPct: 1, minRR: 2.5, maxPos: 25 };
  const F = ['open', 'high', 'low', 'prev', 'ltp', 'chg', 'pct', 'vol', 'val', 'h52', 'l52', 'd30'];
  const tick = x => Math.round(x * 20) / 20;
  const fmt = (n, d = 2) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n, d = 2) => (n == null || isNaN(n)) ? '—' : (n > 0 ? '+' : '') + Number(n).toFixed(d) + '%';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rowObj = (sym, arr) => { const o = { sym }; F.forEach((k, i) => (o[k] = arr[i])); return o; };
  const sectorOf = (sym, custom) => (custom && custom[sym]) || SECTOR_OF[sym] || 'Unmapped';

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
  function toSnapshotDoc(rows, date, time, source) {
    const doc = { date, time: time || null, source: source || 'manual', savedAt: new Date().toISOString(), count: 0, rows: {}, index: null };
    for (const r of rows) {
      if (r.isIndex) { if (!doc.index || /^NIFTY 50$/.test(r.sym)) doc.index = { name: r.sym, ltp: r.ltp, pct: r.pct, chg: r.chg, high: r.high, low: r.low, open: r.open }; continue; }
      doc.rows[r.sym] = F.map(k => (r[k] == null ? null : r[k])); doc.count++;
    }
    return doc;
  }

  /* ---------- bars: one aligned OHLCV table built from history files + daily snapshots ----------
   * history file: {year, dates:[...], symbols:{SYM:{o:[],h:[],l:[],c:[],v:[],t:[]}}, index:{name,o:[],h:[],l:[],c:[]}}
   * bars:         {dates:[...], sym:{SYM:{o,h,l,c,v,t}}, index:{name,o,h,l,c}|null, extras:{date:{SYM:{h52,l52,d30,val,pct,prev}}}}
   * History (end-of-day) wins over a snapshot for the same date; snapshots fill the gaps. */
  function buildBars(historyFiles, snaps) {
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
        if (index.c[i] == null) { index.o[i] = s.index.open; index.h[i] = s.index.high; index.l[i] = s.index.low; index.c[i] = s.index.ltp; } ex.__index = { pct: s.index.pct, time: s.time }; }
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
      file.index.o[k] = snap.index.open; file.index.h[k] = snap.index.high; file.index.l[k] = snap.index.low; file.index.c[k] = snap.index.ltp; }
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
   *  opts: {settings, custom, time}. Returns {signals, reg, board, universe, date, coverage}. */
  function analyzeAt(bars, i, opts) {
    opts = opts || {}; const st = Object.assign({}, DEFAULTS, opts.settings || {}); const custom = opts.custom || {}; const RR = st.minRR;
    const date = bars.dates[i]; const ex = bars.extras[date] || {}; const time = opts.time || (ex.__index && ex.__index.time) || null;
    const idxB = bars.index; const idxRet20 = idxB && idxB.c[i] != null && idxB.c[i - 20] != null ? idxB.c[i] / idxB.c[i - 20] - 1 : null;
    const idxPct = ex.__index && ex.__index.pct != null ? ex.__index.pct : (idxB && idxB.c[i] != null && idxB.c[i - 1] != null ? (idxB.c[i] / idxB.c[i - 1] - 1) * 100 : null);
    const rows = [];
    for (const [s, B] of Object.entries(bars.sym)) {
      const c = B.c[i]; if (c == null) continue; const e = ex[s] || {};
      const prev = e.prev != null ? e.prev : B.c[i - 1]; const r = { sym: s, sector: sectorOf(s, custom), open: B.o[i], high: B.h[i], low: B.l[i], ltp: c, prev, vol: B.v[i], val: e.val != null ? e.val : B.t[i] };
      r.pct = e.pct != null ? e.pct : (prev ? (c / prev - 1) * 100 : null); r.chg = prev != null ? c - prev : null;
      let bars250 = 0; for (let k = Math.max(0, i - 249); k <= i; k++) if (B.c[k] != null) bars250++;
      r.histDays = bars250;
      r.h52 = e.h52 != null ? e.h52 : (bars250 >= 120 ? windowMax(B.h, i - 249, i) : null);
      r.l52 = e.l52 != null ? e.l52 : (bars250 >= 120 ? windowMin(B.l, i - 249, i) : null);
      r.d30 = e.d30 != null ? e.d30 : (B.c[i - 21] != null ? (c / B.c[i - 21] - 1) * 100 : null);
      r.sma20 = sma(B.c, 20, i); r.sma50 = sma(B.c, 50, i); r.atr = atr(B, 14, i); r.rsi = rsi(B.c, 14, i);
      r.ret20 = B.c[i - 20] != null ? c / B.c[i - 20] - 1 : null;
      const vols = []; for (let k = Math.max(0, i - 20); k < i; k++) if (B.v[k]) vols.push(B.v[k]); r.relVol = vols.length >= 5 && r.vol ? r.vol / mean(vols) : null;
      const rng = (r.high != null && r.low != null) ? r.high - r.low : null; r.range = rng;
      r.closePos = rng ? (c - r.low) / rng : null; r.distHi = r.h52 ? (r.h52 - c) / r.h52 * 100 : null; r.distLo = r.l52 ? (c - r.l52) / r.l52 * 100 : null;
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
      if (r.leader) bump(15, 'leading sector'); else if (r.laggard) bump(-10, 'lagging sector');
      if (r.rsPct != null) { if (r.rsPct >= 70) bump(10, `relative strength top ${Math.round(100 - r.rsPct)}%`); else if (r.rsPct <= 30) bump(-10, 'weak relative strength'); }
      if (r.trend === 'up') bump(10, 'price > 20-day > 50-day average'); else if (r.trend === 'down') bump(-10, 'below both moving averages');
      if (r.relVol != null && r.relVol >= 1.5) bump(10, `volume ${r.relVol.toFixed(1)}× average`);
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
        const level = r.h52; const entry = tick(level * 1.003);
        const stopDist = r.atr != null ? Math.max(2 * r.atr, entry * 0.02) : Math.max(1.5 * (rng(r) || 0), entry * 0.025);
        const stop = tick(entry - stopDist); const risk = entry - stop; const target = tick(entry + RR * risk);
        const triggered = r.ltp > level; const kind = triggered ? (reg.intraday ? 'alert' : 'act') : 'alert';
        push({ kind, setup: '52W breakout', level, entry, stop, target, rr: RR, trigger: triggered ? `Above ${fmt(level)} now${reg.intraday ? ' — needs a close above it' : ''}` : `Close above ${fmt(level)}`,
          why: `${triggered ? 'Closed above' : 'Sitting ' + r.distHi.toFixed(1) + '% below'} its 52-week high of <b>${fmt(level)}</b>${r.d30 != null ? ` with ${pct(r.d30, 1)} 30-day momentum` : ''}${r.leader ? ' in a <b>leading sector</b>' : ''}. Stop is ${r.atr != null ? '2 × ATR' : '1.5 × today\'s range'} below entry (${(stopDist / entry * 100).toFixed(1)}%); target ${RR}× the risk. Rule: buy only after a <b>close</b> above the level, ideally on the next day's retest.` });
        continue;
      }
      const strongToday = r.pct >= 2 && (r.d30 == null || r.d30 >= 5) && r.leader;
      const imp = r.impulse;
      const pullback = imp && r.pct <= 1 && r.pct >= -3 && r.ltp > imp.low && (r.d30 == null || r.d30 >= 5) && !r.laggard && (r.sma20 == null || r.ltp >= r.sma20 * 0.98);
      if (pullback) {
        const entry = tick(r.high * 1.003); const base = Math.min(r.low, imp.low); const stop = tick(r.atr != null ? base - 0.5 * r.atr : base * 0.995); const risk = entry - stop; const target = tick(entry + RR * risk);
        const capped = r.h52 && target > r.h52;
        push({ kind: 'act', setup: 'Pullback buy', level: r.high, entry, stop, target, rr: RR, trigger: `Reclaim ${fmt(entry)} (today's high)`,
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
  function analyzeLatest(historyFiles, snaps, settings, custom) {
    const bars = buildBars(historyFiles, snaps); if (!bars.dates.length) return { signals: [], reg: null, board: null, universe: [], bars, snap: null, coverage: 0 };
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
  function digest(result, settings) {
    const { signals, reg, board } = result; if (!reg) return 'No data.'; const st = Object.assign({}, DEFAULTS, settings || {});
    const L = []; const snap = result.snap; const idx = snap && snap.index ? `${snap.index.name} ${fmt(snap.index.ltp)} (${pct(snap.index.pct)})` : 'index n/a';
    L.push(`Nifty Swing Desk — ${result.date}${result.time ? ' ' + result.time : ''}${reg.intraday ? ' (intraday)' : ''}`);
    L.push(`Tape: ${reg.state} · breadth ${reg.up}▲/${reg.down}▼ · ${idx} · history ${result.coverage}/250 bars`);
    const leaders = [...board.leaders]; L.push(`Leading sectors: ${leaders.length ? leaders.join(', ') : 'none qualify'}`);
    const by = k => signals.filter(s => s.kind === k); const act = by('act'), alert = by('alert'), watch = by('watch');
    L.push('', `ACT NOW (${act.length})`);
    act.slice(0, 8).forEach(s => L.push(`• ${s.sym} [${s.score}] — ${s.setup}: entry ${fmt(s.entry)}, stop ${fmt(s.stop)}, target ${fmt(s.target)}${s.size ? `, qty ${s.size.qty}` : ''}`));
    if (!act.length) L.push('• nothing — no trade is a valid outcome');
    L.push('', `ALERTS (${alert.length})`); alert.slice(0, 8).forEach(s => L.push(`• ${s.sym} [${s.score}] — ${s.trigger}`)); if (!alert.length) L.push('• none');
    L.push('', `WATCH (${watch.length})`); watch.slice(0, 8).forEach(s => L.push(`• ${s.sym} [${s.score}] — ${s.setup}${s.trigger ? ': ' + s.trigger : ''}`)); if (!watch.length) L.push('• none');
    L.push('', `Avoid list: ${by('avoid').length} names. Risk/trade ₹${fmt(st.capital * st.riskPct / 100 * reg.sizeMult, 0)}${reg.sizeMult < 1 ? ' (halved: weak breadth)' : ''}. [score] = 0–100 setup quality.`);
    L.push('Rules engine output, not advice. Decide on the close.');
    return L.join('\n');
  }

  return { SECTOR_LISTS, SECTOR_OF, DEFAULTS, F, tick, fmt, pct, esc, rowObj, sectorOf, parseAny, rowsFromCSV, rowsFromPaste, rowsFromNseApi, toSnapshotDoc,
    buildBars, appendSnapshotToHistory, analyzeAt, analyzeLatest, buildSignals, sizing, journalStatus, digest, indicators: { sma, atr, rsi, candles } };
});
