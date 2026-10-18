/* Nifty Swing Desk — site UI. Market data comes from data/ (written by the daily job);
 * settings, sector overrides, journal and manual snapshots live in this browser's localStorage
 * (Backup / Restore moves them between devices). */
(() => {
'use strict';
const E = window.SwingEngine;
const { fmt, pct, esc, tick, rowObj } = E;
const fmt0 = n => fmt(n, 0);
const $ = id => document.getElementById(id);
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
let toastT; const toast = m => { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600); };

const S = {
  repoSnaps: [], manualSnaps: [], snaps: [], histFiles: [], bars: null, coverage: 0,
  settings: { ...E.DEFAULTS }, custom: {}, journal: [],
  meta: null, pending: null,
  tab: 'act', sector: null, open: null, closing: null,
  uniSort: { key: 'pct', dir: -1 }, search: '',
};
const sectorOf = sym => E.sectorOf(sym, S.custom);

/* ---------- persistence (localStorage) ---------- */
const LS = 'nifty-swing-desk-v1';
function load() { try { const d = JSON.parse(localStorage.getItem(LS) || 'null'); if (d) { S.settings = { ...E.DEFAULTS, ...(d.settings || {}) }; S.custom = d.custom || {}; S.journal = d.journal || []; S.manualSnaps = d.manualSnaps || []; } } catch (e) {} }
function save() { try { localStorage.setItem(LS, JSON.stringify({ settings: S.settings, custom: S.custom, journal: S.journal, manualSnaps: S.manualSnaps })); } catch (e) { toast('Could not save in this browser (private mode?)'); } }
function mergeSnaps() {
  const by = {}; for (const s of S.manualSnaps) by[s.date] = s;
  for (const s of S.repoSnaps) { const m = by[s.date]; if (!m || (s.time || '') >= (m.time || '')) by[s.date] = s; } // job data wins unless the manual one is later in the day
  S.snaps = Object.values(by).sort((a, b) => a.date.localeCompare(b.date));
}
async function loadRepoData() {
  try {
    const idx = await (await fetch('data/index.json', { cache: 'no-cache' })).json(); S.meta = idx;
    const dates = (idx.dates || []).slice(-120);
    const docs = await Promise.all(dates.map(d => fetch(`data/snapshots/${d}.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null)));
    S.repoSnaps = docs.filter(d => d && d.rows);
    const years = (idx.historyYears && idx.historyYears.length ? idx.historyYears : [new Date().getFullYear() - 1, new Date().getFullYear()]).slice(-2);
    const hf = await Promise.all(years.map(y => fetch(`data/history/${y}.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null)));
    S.histFiles = hf.filter(Boolean);
    const latest = S.repoSnaps[S.repoSnaps.length - 1];
    pillSet('pillData', 'accent', latest ? `Auto data · ${idx.index || ''} · updated ${idx.generatedAt ? new Date(idx.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : latest.date}` : 'No job data yet');
  } catch (e) { pillSet('pillData', 'warn', 'Job data not found — upload manually'); }
  mergeSnaps(); render();
}

/* ---------- render ---------- */
function pillSet(id, cls, text) { const el = $(id); el.className = 'pill ' + (cls || ''); el.innerHTML = '<span class="dot"></span>' + text; }
function render() {
  const res = E.analyzeLatest(S.histFiles, S.snaps, S.settings, S.custom);
  const { signals, reg, board, universe, snap } = res; S.bars = res.bars; S.coverage = res.coverage;
  renderStrip(snap, reg); renderRegime(reg, snap); renderSizing(reg); renderRules(reg, snap);
  renderSectors(board); renderQueue(signals, reg); renderUniverse(universe); renderJournal(); renderSnaplist();
  $('secList').innerHTML = Object.keys(E.SECTOR_LISTS).map(s => `<option value="${esc(s)}">`).join('');
}
function renderStrip(snap, reg) {
  if (!snap) { pillSet('pillRegime', '', 'No data yet'); pillSet('pillIndex', '', 'Index —'); pillSet('pillBreadth', '', 'Breadth —'); pillSet('pillAsOf', '', 'Waiting for a snapshot'); return; }
  pillSet('pillRegime', { Strong: 'up', Weak: 'down', Mixed: 'warn' }[reg.state], `${reg.state} tape`);
  pillSet('pillIndex', reg.idx == null ? '' : (reg.idx >= 0 ? 'up' : 'down'), snap.index ? `${esc(snap.index.name)} ${fmt(snap.index.ltp)} <span class="num">${pct(snap.index.pct)}</span>` : 'Index not in data');
  pillSet('pillBreadth', reg.breadth >= 0.6 ? 'up' : reg.breadth <= 0.4 ? 'down' : 'warn', `Breadth ${reg.up}▲ ${reg.down}▼`);
  pillSet('pillAsOf', reg.intraday ? 'warn' : 'accent', `As of ${snap.date}${snap.time ? ' ' + snap.time : ''}${reg.intraday ? ' · intraday' : ''}`);
}
function renderRegime(reg, snap) {
  const st = $('regimeStats'), n = $('regimeNote');
  if (!reg) { st.innerHTML = ''; n.className = 'note'; n.textContent = 'Regime is computed from breadth (advances vs declines) and the index move in the latest snapshot. The daily job fills this in after each close.'; return; }
  st.innerHTML = `<div class="stat"><span class="v">${(reg.breadth * 100).toFixed(0)}%</span><span class="l">advancing</span></div>
    <div class="stat"><span class="v ${reg.idx > 0 ? 'chg up' : reg.idx < 0 ? 'chg down' : ''}">${pct(reg.idx)}</span><span class="l">index</span></div>
    <div class="stat"><span class="v">${snap.count}</span><span class="l">stocks</span></div>
    <div class="stat"><span class="v">${S.coverage}<span class="muted" style="font-size:13px">/250</span></span><span class="l">bars of history</span></div>`;
  const msgs = { Strong: 'Broad participation. Full position size; momentum and breakout setups have the wind behind them.',
    Mixed: 'Narrow tape — gains concentrated in a few sectors. Trade only the leading sectors, keep size normal, expect failed breakouts.',
    Weak: 'More decliners than advancers. Size is halved automatically, new longs limited to the strongest sector, and no mean-reversion buys.' };
  n.className = 'note' + (reg.state === 'Weak' ? ' down' : reg.state === 'Mixed' ? ' warn' : '');
  n.innerHTML = msgs[reg.state] + (reg.intraday ? ' <br><b>Intraday snapshot:</b> every signal is provisional until the post-close snapshot lands.' : '') + (S.coverage < 50 ? ` <br>Moving averages, ATR, RSI and 52-week levels need up to 250 bars of history (you have ~${S.coverage}). Run <code>scripts/backfill.mjs</code> once to load it.` : '');
}
function renderSizing(reg) {
  const st = S.settings; ['capital', 'riskPct', 'minRR', 'maxPos'].forEach(k => { const el = $(k); if (document.activeElement !== el) el.value = st[k]; });
  const mult = reg ? reg.sizeMult : 1; const riskAmt = st.capital * st.riskPct / 100 * mult;
  $('sizingNote').innerHTML = `Risking <b class="num">₹${fmt0(riskAmt)}</b> per trade${mult < 1 ? ' (halved — weak breadth)' : ''}. Quantity = risk ÷ (entry − stop), capped at ${st.maxPos}% of capital per name. Only setups with at least <b>${st.minRR}:1</b> reward-to-risk are shown as actionable. <span class="muted">Telegram digests use the figures in config.json.</span>`;
}
function renderRules(reg, snap) {
  const now = new Date(); const istMin = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440; const hhmm = `${String(Math.floor(istMin / 60)).padStart(2, '0')}:${String(istMin % 60).padStart(2, '0')}`;
  const mktOpen = istMin >= 555 && istMin <= 930; const afterCutoff = istMin >= 870;
  const items = [
    { ok: !mktOpen || afterCutoff, bad: mktOpen && !afterCutoff, t: mktOpen ? (afterCutoff ? `It's ${hhmm} IST — entries allowed (after 2:30 pm)` : `It's ${hhmm} IST — no entries before 2:30 pm; the close decides`) : `Market closed (${hhmm} IST) — plan, don't trade` },
    { ok: !!snap && !(reg && reg.intraday), bad: !!(reg && reg.intraday), t: snap ? (reg.intraday ? 'Latest snapshot is intraday — wait for the post-close run' : 'Latest snapshot reflects the close') : 'No snapshot loaded' },
    { ok: reg ? reg.state !== 'Weak' : false, bad: !!(reg && reg.state === 'Weak'), t: reg ? (reg.state === 'Weak' ? 'Weak breadth — half size, leaders only' : 'Breadth permits normal size') : 'Regime unknown' },
    { ok: true, t: "Never chase the day's biggest gainer; buy pullbacks or confirmed breakouts" },
    { ok: true, t: 'Stop goes in with the order. Move it to breakeven at +1R, never lower it' },
    { ok: true, t: 'Max 4 open positions, no two in the same sector' },
  ];
  $('rules').innerHTML = items.map(i => `<li class="${i.bad ? 'bad' : i.ok ? 'ok' : ''}"><span class="tick">${i.bad ? '✕' : i.ok ? '✓' : ''}</span><span>${i.t}</span></li>`).join('');
}
function renderSectors(board) {
  const el = $('sectors');
  if (!board) { el.innerHTML = '<div class="empty">Sectors rank by a blend of today\'s average move, 30-day momentum and breadth within the sector. The top three with a positive score are <b>leaders</b>; momentum signals only fire inside them.</div>'; return; }
  const list = board.list; const max = Math.max(0.5, ...list.map(s => Math.abs(s.avgPct || 0)));
  el.innerHTML = list.map(s => { const w = Math.min(50, Math.abs(s.avgPct || 0) / max * 50); const lead = board.leaders.has(s.sec), lag = board.laggards.has(s.sec);
    return `<div class="sec-row ${S.sector === s.sec ? 'active' : ''}" data-sec="${esc(s.sec)}" role="button" tabindex="0">
      <span class="name">${esc(s.sec)}<span class="n">${s.n}</span>${lead ? ' <span class="tag act" style="font-size:10px">LEAD</span>' : lag ? ' <span class="tag avoid" style="font-size:10px">LAG</span>' : ''}</span>
      <span class="bar-track"><span class="zero"></span><span class="bar ${s.avgPct >= 0 ? 'pos' : 'neg'}" style="width:${w}%"></span></span>
      <span class="num chg ${s.avgPct > 0 ? 'up' : s.avgPct < 0 ? 'down' : ''}">${pct(s.avgPct)}</span>
      <span class="num chg ${s.avg30 > 0 ? 'up' : s.avg30 < 0 ? 'down' : ''}">${pct(s.avg30, 1)}</span>
      <span class="num muted">${(s.breadth * 100).toFixed(0)}%↑</span></div>`; }).join('');
  el.querySelectorAll('.sec-row').forEach(r => { const f = () => { S.sector = S.sector === r.dataset.sec ? null : r.dataset.sec; S.open = null; render(); }; r.onclick = f; r.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; });
  $('secSub').textContent = S.sector ? `filtered to ${S.sector} — click again to clear` : 'click a sector to filter the queue';
}
const TABS = [['act', 'Act now'], ['alert', 'Set alerts'], ['watch', 'Watch'], ['avoid', 'Avoid']];
const stripTags = s => s.replace(/<[^>]+>/g, '');
function renderQueue(signals, reg) {
  const counts = {}; signals.forEach(s => (counts[s.kind] = (counts[s.kind] || 0) + 1));
  $('tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" role="tab" data-k="${k}" aria-selected="${S.tab === k}">${l}<span class="count">${counts[k] || 0}</span></button>`).join('');
  $('tabs').querySelectorAll('.tab').forEach(b => (b.onclick = () => { S.tab = b.dataset.k; S.open = null; render(); }));
  let rows = signals.filter(s => s.kind === S.tab); if (S.sector) rows = rows.filter(s => s.sector === S.sector);
  const tbl = $('queueTbl'), empty = $('queueEmpty');
  $('queueSub').textContent = S.snaps.length ? `${signals.length} flagged of ${Object.keys(S.snaps[S.snaps.length - 1].rows).length}` : '';
  const withLevels = S.tab !== 'avoid' && S.tab !== 'watch';
  tbl.querySelector('thead').innerHTML = `<tr><th>Symbol</th><th>Setup</th><th class="r">Score</th><th class="r">LTP</th><th class="r">Today</th><th class="r">30D</th>${withLevels ? '<th class="r">Entry</th><th class="r">Stop</th><th class="r">Target</th><th class="r">Qty</th>' : '<th>Trigger / reason</th>'}<th></th></tr>`;
  if (!rows.length) { tbl.querySelector('tbody').innerHTML = ''; empty.hidden = false;
    const m = { act: 'Nothing to act on right now. That is the normal state — most days the right trade is no trade.', alert: 'No stocks within 2% of a 52-week high today.', watch: 'No momentum names in leading sectors today.', avoid: 'Nothing near its 52-week low.' };
    empty.innerHTML = S.snaps.length ? (S.sector ? `No ${S.tab} signals in ${esc(S.sector)}.` : m[S.tab]) : 'The queue fills in once the daily job has written a snapshot (or you upload one below).'; return; }
  empty.hidden = true;
  tbl.querySelector('tbody').innerHTML = rows.map(s => { const r = s.row; const open = S.open === s.sym;
    const lv = withLevels ? `<td class="r num">${fmt(s.entry)}</td><td class="r num">${fmt(s.stop)}</td><td class="r num">${fmt(s.target)}</td><td class="r num">${s.size ? fmt0(s.size.qty) : '—'}</td>` : `<td style="white-space:normal;max-width:420px">${s.trigger ? '<span class="muted">Trigger:</span> ' + esc(s.trigger) : stripTags(s.why).slice(0, 120) + '…'}</td>`;
    return `<tr class="row" data-sym="${esc(s.sym)}"><td><span class="sym">${esc(s.sym)}<span class="sec">${esc(s.sector)}</span></span></td><td><span class="tag ${s.kind}">${esc(s.setup)}</span></td>
      <td class="r"><span class="score ${s.score >= 70 ? 'hi' : s.score >= 55 ? 'mid' : 'lo'}" title="${esc(s.confidence)} confidence">${s.score}</span></td><td class="r num">${fmt(r.ltp)}</td><td class="r num chg ${r.pct > 0 ? 'up' : r.pct < 0 ? 'down' : ''}">${pct(r.pct)}</td><td class="r num chg ${r.d30 > 0 ? 'up' : r.d30 < 0 ? 'down' : ''}">${pct(r.d30, 1)}</td>${lv}
      <td class="r"><button class="btn small" data-open="${esc(s.sym)}">${open ? 'Hide' : 'Detail'}</button></td></tr>${open ? detailRow(s) : ''}`; }).join('');
  tbl.querySelectorAll('[data-open]').forEach(b => (b.onclick = e => { e.stopPropagation(); S.open = S.open === b.dataset.open ? null : b.dataset.open; render(); }));
  tbl.querySelectorAll('tr.row').forEach(tr => (tr.onclick = () => { S.open = S.open === tr.dataset.sym ? null : tr.dataset.sym; render(); }));
  tbl.querySelectorAll('[data-log]').forEach(b => (b.onclick = e => { e.stopPropagation(); prefillJournal(rows.find(x => x.sym === b.dataset.log)); }));
}
function detailRow(s) { const r = s.row; const sz = s.size;
  const cells = [['52W range', `${fmt(r.l52)} – ${fmt(r.h52)}`], ['Pos. in range', r.pos52 != null ? (r.pos52 * 100).toFixed(0) + '%' : '—'], ['Day range', `${fmt(r.low)} – ${fmt(r.high)}`], ['Close in range', r.closePos != null ? (r.closePos * 100).toFixed(0) + '%' : '—'], ['Turnover', r.val != null ? '₹' + fmt(r.val, 0) + ' cr' : '—'], ['Rel. volume', r.relVol != null ? r.relVol.toFixed(2) + '×' : `needs ${Math.max(0, 3 - r.histDays)} more days`]];
  cells.push(['20 / 50-day avg', r.sma20 != null ? `${fmt(r.sma20, 0)} / ${r.sma50 != null ? fmt(r.sma50, 0) : '—'}` : 'needs history'], ['ATR (14)', r.atr != null ? fmt(r.atr) : '—'], ['RSI (14)', r.rsi != null ? r.rsi.toFixed(0) : '—'], ['Rel. strength', r.rsPct != null ? `top ${Math.max(1, Math.round(100 - r.rsPct))}%` : '—'], ['Candle', (r.candle.bull.concat(r.candle.bear).filter((x, i, a) => a.indexOf(x) === i).join(', ') || 'plain')]);
  if (s.entry) { cells.push(['Risk / share', fmt(s.entry - s.stop)], ['Stop distance', ((s.entry - s.stop) / s.entry * 100).toFixed(1) + '%'], ['Reward:risk', s.rr + ':1']); if (sz) cells.push(['Position', `${fmt0(sz.qty)} sh ≈ ₹${fmt0(sz.value)}${sz.capped ? ' (capped)' : ''}`], ['₹ at risk', '₹' + fmt0(sz.riskActual)]); }
  return `<tr class="detail"><td colspan="11"><div class="detail-grid">${cells.map(([l, v]) => `<div><div class="l">${l}</div><div class="v">${v}</div></div>`).join('')}</div>
    <div class="why">${s.why}</div><div class="why" style="margin-top:8px"><b>Score ${s.score} (${esc(s.confidence)})</b>: base 50${s.reasons.length ? ', ' + s.reasons.map(esc).join(', ') : ''}.</div>${s.entry ? `<div style="margin-top:10px"><button class="btn small primary" data-log="${esc(s.sym)}">Log this trade</button></div>` : ''}</td></tr>`;
}
function renderUniverse(universe) {
  const tbl = $('uniTbl'), empty = $('uniEmpty');
  if (!universe.length) { tbl.querySelector('thead').innerHTML = ''; tbl.querySelector('tbody').innerHTML = ''; empty.hidden = false; empty.textContent = 'Every stock in the latest snapshot appears here with its sector, 52-week position and today\'s move.'; return; }
  empty.hidden = true;
  let rows = universe; if (S.sector) rows = rows.filter(r => r.sector === S.sector); if (S.search) rows = rows.filter(r => r.sym.includes(S.search) || r.sector.toUpperCase().includes(S.search));
  const { key, dir } = S.uniSort; rows = [...rows].sort((a, b) => { const x = a[key], y = b[key]; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; });
  const cols = [['sym', 'Symbol'], ['sector', 'Sector'], ['ltp', 'LTP', 'r'], ['pct', 'Today', 'r'], ['d30', '30D', 'r'], ['rsPct', 'RS %ile', 'r'], ['rsi', 'RSI', 'r'], ['val', 'Turnover ₹cr', 'r'], ['pos52', '52W position', 'r'], ['distHi', 'To 52W high', 'r']];
  tbl.querySelector('thead').innerHTML = '<tr>' + cols.map(([k, l, r]) => `<th class="sortable ${r || ''} ${key === k ? 'sorted' : ''}" data-k="${k}">${l}${key === k ? (dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('') + '</tr>';
  tbl.querySelectorAll('th').forEach(th => (th.onclick = () => { const k = th.dataset.k; S.uniSort = S.uniSort.key === k ? { key: k, dir: -S.uniSort.dir } : { key: k, dir: (k === 'sym' || k === 'sector') ? 1 : -1 }; render(); }));
  tbl.querySelector('tbody').innerHTML = rows.slice(0, 600).map(r => `<tr><td><span class="sym">${esc(r.sym)}</span></td><td class="muted">${esc(r.sector)}</td><td class="r num">${fmt(r.ltp)}</td>
    <td class="r num chg ${r.pct > 0 ? 'up' : r.pct < 0 ? 'down' : ''}">${pct(r.pct)}</td><td class="r num chg ${r.d30 > 0 ? 'up' : r.d30 < 0 ? 'down' : ''}">${pct(r.d30, 1)}</td><td class="r num">${r.rsPct != null ? r.rsPct.toFixed(0) : '—'}</td><td class="r num">${r.rsi != null ? r.rsi.toFixed(0) : '—'}</td><td class="r num">${fmt(r.val, 0)}</td>
    <td class="r">${r.pos52 != null ? `<span class="range ${r.pos52 >= 0.95 ? 'hi' : r.pos52 <= 0.05 ? 'lo' : ''}" title="${(r.pos52 * 100).toFixed(0)}% of 52W range"><span class="mk" style="left:${(r.pos52 * 100).toFixed(1)}%"></span></span>` : '—'}</td>
    <td class="r num">${r.distHi != null ? '-' + r.distHi.toFixed(1) + '%' : '—'}</td></tr>`).join('');
  $('uniSub').textContent = `${rows.length} stocks${S.sector ? ' in ' + S.sector : ''} · sorted by ${cols.find(c => c[0] === key)[1].toLowerCase()}`;
}
function renderJournal() {
  const tbl = $('jTbl'), empty = $('jEmpty'); const open = S.journal.filter(t => t.status !== 'closed'), closed = S.journal.filter(t => t.status === 'closed');
  if (!S.journal.length) { tbl.querySelector('thead').innerHTML = ''; tbl.querySelector('tbody').innerHTML = ''; empty.hidden = false; }
  else { empty.hidden = true;
    tbl.querySelector('thead').innerHTML = '<tr><th>Symbol</th><th>Setup</th><th>Entered</th><th class="r">Entry</th><th class="r">Stop</th><th class="r">Target</th><th class="r">Qty</th><th class="r">Mark</th><th class="r">R</th><th class="r">P&amp;L ₹</th><th>Status</th><th></th></tr>';
    const list = [...open, ...closed].sort((a, b) => b.date.localeCompare(a.date));
    tbl.querySelector('tbody').innerHTML = list.map(t => { const st = E.journalStatus(t, S.bars); const cls = st.R > 0 ? 'r-pos' : st.R < 0 ? 'r-neg' : '';
      return `<tr class="jrow"><td><span class="sym">${esc(t.sym)}</span></td><td class="muted">${esc(t.setup || '')}</td><td class="num">${t.date}</td><td class="r num">${fmt(t.entry)}</td><td class="r num">${fmt(t.stop)}</td><td class="r num">${fmt(t.target)}</td><td class="r num">${fmt0(t.qty)}</td>
        <td class="r num">${fmt(st.mark)}</td><td class="r num ${cls}">${st.R != null ? (st.R > 0 ? '+' : '') + st.R.toFixed(2) + 'R' : '—'}</td><td class="r num ${cls}">${st.pnl != null ? fmt0(st.pnl) : '—'}</td>
        <td><span class="tag ${t.status === 'closed' ? '' : st.stopHit ? 'avoid' : st.targetHit ? 'act' : 'alert'}">${esc(st.label)}</span></td>
        <td class="r" style="white-space:nowrap">${t.status !== 'closed' ? `<button class="btn small" data-close="${esc(t.id)}">Close…</button> ` : ''}<button class="btn small danger" data-del="${esc(t.id)}">Delete</button></td></tr>
        ${S.closing === t.id ? `<tr class="detail"><td colspan="12"><div class="form-row"><div class="field w-110"><label for="xPrice">Exit price</label><input id="xPrice" type="number" step="0.05" value="${st.mark ?? ''}"></div><div class="field w-150"><label for="xDate">Exit date</label><input id="xDate" type="date" value="${todayISO()}"></div><button class="btn primary" data-confirm="${esc(t.id)}">Confirm close</button><button class="btn" data-cancel="1">Cancel</button></div></td></tr>` : ''}`; }).join('');
    tbl.querySelectorAll('[data-close]').forEach(b => (b.onclick = () => { S.closing = b.dataset.close; render(); }));
    tbl.querySelectorAll('[data-cancel]').forEach(b => (b.onclick = () => { S.closing = null; render(); }));
    tbl.querySelectorAll('[data-confirm]').forEach(b => (b.onclick = () => { const t = S.journal.find(x => x.id === b.dataset.confirm); const exit = parseFloat($('xPrice').value); if (!(exit > 0)) return toast('Enter an exit price');
      Object.assign(t, { status: 'closed', exit, exitDate: $('xDate').value || todayISO() }); S.closing = null; save(); render(); toast('Trade closed'); }));
    tbl.querySelectorAll('[data-del]').forEach(b => (b.onclick = () => { if (b.dataset.armed) { S.journal = S.journal.filter(x => x.id !== b.dataset.del); save(); render(); } else { b.dataset.armed = '1'; b.textContent = 'Sure?'; setTimeout(() => { b.dataset.armed = ''; b.textContent = 'Delete'; }, 2500); } }));
  }
  const Rs = closed.map(t => E.journalStatus(t, S.bars).R).filter(x => x != null); const wins = Rs.filter(x => x > 0).length; const avgR = Rs.length ? Rs.reduce((a, b) => a + b, 0) / Rs.length : null;
  const openRisk = open.reduce((a, t) => a + (t.entry - t.stop) * t.qty, 0); const openPnl = open.reduce((a, t) => a + (E.journalStatus(t, S.bars).pnl || 0), 0);
  $('perfStats').innerHTML = `<div class="stat"><span class="v">${open.length}</span><span class="l">open trades</span></div><div class="stat"><span class="v">₹${fmt0(openRisk)}</span><span class="l">capital at risk</span></div>
    <div class="stat"><span class="v ${openPnl > 0 ? 'chg up' : openPnl < 0 ? 'chg down' : ''}">${openPnl ? fmt0(openPnl) : '—'}</span><span class="l">open P&amp;L ₹</span></div>
    <div class="stat"><span class="v">${Rs.length ? ((wins / Rs.length) * 100).toFixed(0) + '%' : '—'}</span><span class="l">win rate (${Rs.length})</span></div><div class="stat"><span class="v">${avgR != null ? (avgR > 0 ? '+' : '') + avgR.toFixed(2) + 'R' : '—'}</span><span class="l">expectancy / trade</span></div>`;
  const secs = new Set(open.map(t => sectorOf(t.sym))); const dup = open.length - secs.size;
  $('perfNote').innerHTML = !S.journal.length ? 'Expectancy = average R per closed trade. A system with 40% winners and +0.5R expectancy is profitable; a system with 70% winners and −0.2R is not. Judge yourself on R, not on rupees. The journal lives in this browser — use Backup to keep a copy.'
    : `${open.length > 4 ? '<b>More than 4 open positions</b> — above the rule. ' : ''}${dup > 0 ? `<b>${dup} overlapping sector exposure${dup > 1 ? 's' : ''}</b> — correlated risk. ` : ''}${Rs.length < 20 ? 'Fewer than 20 closed trades: the win rate is noise until then.' : 'Enough trades to start trusting the statistics.'}`;
}
function renderSnaplist() {
  const el = $('snaplist'); const manual = new Set(S.manualSnaps.map(s => s.date));
  el.innerHTML = S.snaps.length ? S.snaps.map((s, i) => `<span class="snap ${i === S.snaps.length - 1 ? 'cur' : ''}" title="${s.source === 'nse-api' ? 'from the daily job' : 'uploaded manually'}"><span class="num">${s.date}${s.time ? ' ' + s.time : ''}</span><span class="muted">${s.count}${s.source === 'nse-api' ? ' · auto' : ''}</span>${manual.has(s.date) && s.source !== 'nse-api' ? `<button title="Remove manual snapshot" data-delsnap="${s.date}">×</button>` : ''}</span>`).join('') : '<span class="muted small">None yet. The first run of the daily job (or a manual upload) adds one.</span>';
  el.querySelectorAll('[data-delsnap]').forEach(b => (b.onclick = () => { if (b.dataset.armed) { S.manualSnaps = S.manualSnaps.filter(s => s.date !== b.dataset.delsnap); save(); mergeSnaps(); render(); } else { b.dataset.armed = '1'; b.textContent = '✓?'; setTimeout(() => { b.dataset.armed = ''; b.textContent = '×'; }, 2500); } }));
}
function prefillJournal(s) { if (!s) return; $('jSym').value = s.sym; $('jEntry').value = s.entry; $('jStop').value = s.stop; $('jTarget').value = s.target; $('jQty').value = s.size ? s.size.qty : ''; $('jDate').value = todayISO(); $('jSetup').value = s.setup.includes('breakout') ? 'Breakout' : s.setup.includes('Pullback') ? 'Pullback' : 'Momentum'; $('jForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Journal form prefilled — review and log'); }

/* ---------- wiring ---------- */
function wire() {
  $('snapDate').value = todayISO(); $('jDate').value = todayISO();
  const setPending = (text, src) => { const rows = E.parseAny(text); const n = rows.filter(r => !r.isIndex).length; const idx = rows.find(r => r.isIndex);
    if (n < 2) { S.pending = null; $('saveSnap').disabled = true; $('parseNote').className = 'note down'; $('parseNote').textContent = `Couldn't read a stock table from the ${src}. Expected columns: symbol, open, high, low, prev close, LTP, change, % change, volume, value, 52W high, 52W low, 30D %.`; return; }
    S.pending = rows; $('saveSnap').disabled = false; $('parseNote').className = 'note';
    $('parseNote').innerHTML = `Parsed <b>${n}</b> stocks${idx ? ` + index <b>${esc(idx.sym)}</b>` : ' (no index row — regime will use breadth only)'} from the ${src}. Set the capture time, then save.`; };
  $('paste').addEventListener('input', e => setPending(e.target.value, 'pasted text'));
  const readFile = f => { if (!f) return; const r = new FileReader(); r.onload = () => setPending(String(r.result), 'file ' + f.name); r.readAsText(f); };
  $('file').addEventListener('change', e => readFile(e.target.files[0]));
  const drop = $('drop'); ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); })); ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
  $('saveSnap').onclick = () => { if (!S.pending) return; const date = $('snapDate').value; if (!date) return toast('Pick the snapshot date');
    const doc = E.toSnapshotDoc(S.pending, date, $('snapTime').value || null, 'manual');
    S.manualSnaps = S.manualSnaps.filter(s => s.date !== date).concat([doc]).sort((a, b) => a.date.localeCompare(b.date)); save(); mergeSnaps(); render();
    toast(`Saved ${doc.count} stocks for ${date}`); S.pending = null; $('paste').value = ''; $('file').value = ''; $('saveSnap').disabled = true; $('parseNote').className = 'note'; $('parseNote').textContent = 'Saved in this browser. The daily job\'s snapshot for the same date replaces it when it lands.'; };
  let setT; ['capital', 'riskPct', 'minRR', 'maxPos'].forEach(k => $(k).addEventListener('input', e => { const v = parseFloat(e.target.value); if (!(v > 0)) return; S.settings[k] = v; render(); clearTimeout(setT); setT = setTimeout(save, 500); }));
  $('search').addEventListener('input', e => { S.search = e.target.value.trim().toUpperCase(); render(); });
  $('assignBtn').onclick = () => { const sym = $('assignSym').value.trim().toUpperCase(), sec = $('assignSec').value.trim(); if (!sym || !sec) return toast('Enter a symbol and a sector'); S.custom[sym] = sec; save(); render(); $('assignSym').value = ''; toast(`${sym} → ${sec} (add it to data/sectors.json too so the Telegram digest agrees)`); };
  $('jAdd').onclick = () => { const sym = $('jSym').value.trim().toUpperCase(), entry = parseFloat($('jEntry').value), stop = parseFloat($('jStop').value), target = parseFloat($('jTarget').value), qty = parseInt($('jQty').value, 10), date = $('jDate').value || todayISO();
    if (!sym || !(entry > 0) || !(stop > 0) || !(qty > 0)) return toast('Symbol, entry, stop and qty are required'); if (stop >= entry) return toast('Stop must be below entry for a long');
    S.journal.push({ id: date + '-' + sym + '-' + Date.now().toString(36), sym, entry, stop, target: target > 0 ? target : tick(entry + S.settings.minRR * (entry - stop)), qty, date, setup: $('jSetup').value, status: 'open', created: new Date().toISOString() });
    save(); render(); toast('Trade logged'); ['jSym', 'jEntry', 'jStop', 'jTarget', 'jQty'].forEach(k => ($(k).value = '')); };
  $('exportBtn').onclick = () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings: S.settings, custom: S.custom, journal: S.journal, manualSnaps: S.manualSnaps }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `swing-desk-backup-${todayISO()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $('importFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(String(r.result)); if (!d || typeof d !== 'object') throw 0;
    S.settings = { ...E.DEFAULTS, ...(d.settings || {}) }; S.custom = d.custom || {}; S.journal = Array.isArray(d.journal) ? d.journal : []; S.manualSnaps = Array.isArray(d.manualSnaps) ? d.manualSnaps : []; save(); mergeSnaps(); render(); toast('Backup restored'); } catch { toast('That file is not a Swing Desk backup'); } e.target.value = ''; }; r.readAsText(f); });
}
load(); wire(); mergeSnaps(); render(); loadRepoData();
})();
