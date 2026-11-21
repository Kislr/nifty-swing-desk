/* Nifty Swing Desk — the Results drift card (21 Nov 2026, audit A1, owner's decision).
 * Post-results drift passed its written test by the letter on 19 Nov 2026; instead of a live setup the rule was frozen and each results
 * season is read off the backtest's own trade list after it has happened (reports/pead-results-drift-reading-2026-11-21.md).
 * scripts/backtest-pead.mjs writes data/results/drift.json; this file only draws it. Trades "showing promise" — at least +1R and
 * ahead of the NIFTY 50 over the same bars, a mark fixed before any forward trade existed — are listed first and highlighted.
 * Nothing here is an order, and nothing here feeds the engine, the queue or the digest. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sg = (x, d, suf) => x == null ? '—' : (x > 0 ? '+' : '') + Number(x).toFixed(d) + (suf || '');
const chg = (x, d, suf) => x == null ? '—' : `<span class="chg ${x > 0 ? 'up' : x < 0 ? 'down' : ''}">${sg(x, d, suf)}</span>`;
function render(D) {
  const card = $('driftCard'); if (!card) return; const body = $('driftBody'), sub = $('driftSub'); const f = D.forward || { n: 0 };
  const share = n => (n ? Math.round(n * 100) : 0) + '%';
  sub.innerHTML = `paper reading, no orders · rule frozen <b>${esc(D.frozen)}</b> · data to ${esc(D.asOf)} · ${f.n ? `<b>${f.n}</b> forward trade${f.n === 1 ? '' : 's'}, ${f.starred} ★` : 'no forward trade yet'}`;
  const p = D.primary || {}, v = D.verdict || {};
  let html = `<div class="note" style="margin-bottom:12px">Ten-year test of the rule: <b>${esc(String(v.result || '').toUpperCase())} by the letter</b> — ${sg(p.expectancy, 3, 'R')} a trade over ${p.n} trades, but only ${sg(p.meanExcess, 2, '%')} ahead of the NIFTY 50 per trade, and the four-slot version a desk could actually run made ${sg(D.desk && D.desk.expectancy, 3, 'R')}. So the rule is <b>watched, not traded</b>: it was fixed on ${esc(D.frozen)} and each results season is read afterwards. `
    + (f.n ? `Since then: <b>${f.n}</b> trades (${f.open} open), ${sg(f.expectancy, 3, 'R')} a trade, ${sg(f.meanExcess, 2, '%')} against the index; ${f.starred} starred (${share(f.starred / f.n)}, against ${(D.recordShare * 100).toFixed(1)}% on the record). One season is about 60 trades — a record, not a verdict.`
      : `No trade has a results day after the freeze yet; the first season to read is January–February 2027.`)
    + ` <b>★ showing promise</b> = at least +${D.starR}R and ahead of the NIFTY 50 over the same days; ${(D.recordShare * 100).toFixed(1)}% of trades on the ten-year record earned it, so a star describes — it is not a signal. ${p.openAtEnd ? `${p.openAtEnd} trades are still open and can change.` : ''} Full tables: <code>${esc(D.report || 'reports/')}</code>.</div>`;
  for (const S of (D.seasons || []).slice().reverse()) { const a = S.all;
    html += `<div class="drift-season"><b>${esc(S.label)}</b> <span class="muted">· ${a.n} trades (${S.forward.n} forward, ${S.seen.n} seen before the freeze; ${a.open} open) · ${sg(a.expectancy, 3, 'R')} a trade · ${sg(a.meanExcess, 2, '%')} vs the index · ${a.starred} ★</span></div>`
      + `<div class="tbl-wrap"><table class="drift-tbl"><thead><tr><th></th><th>Stock</th><th>Results day</th><th class="r">Jump</th><th>Bought</th><th class="r">Entry</th><th class="r">Stop</th><th>Status</th><th class="r">Return</th><th class="r">R</th><th class="r">vs Nifty</th><th>Desk</th><th>When</th></tr></thead><tbody>`
      + S.trades.map(t => `<tr class="${t.promise ? 'star' : ''}"><td class="starcell">${t.promise ? '<span class="tag star" title="Showing promise: at least +1R and ahead of the NIFTY 50 over the same days">★ promise</span>' : ''}</td><td><span class="sym">${esc(t.sym)}</span></td><td class="num">${esc(t.R)}</td><td class="num r">${sg(t.retR, 1, '%')}</td><td class="num">${esc(t.entryDate)}</td><td class="num r">${esc(t.entry)}</td><td class="num r">${esc(t.stop)}</td><td>${t.open ? `<span class="tag open">open · ${t.bars} bars</span>` : esc(t.reason) + ' <span class="num muted">' + esc(t.exitDate) + '</span>'}</td><td class="num r">${chg(t.ret, 1, '%')}</td><td class="num r">${chg(t.Rm, 2, 'R')}</td><td class="num r">${chg(t.excess, 1, '%')}</td><td>${t.desk ? '<span class="tag" title="The four-slot, one-per-sector version of the rule would have taken this trade">desk</span>' : ''}</td><td>${t.forward ? '<span class="tag fwd" title="Results day after the rule was frozen: forward evidence">forward</span>' : '<span class="muted small" title="Results day before the rule was frozen: already seen, context only">seen</span>'}</td></tr>`).join('')
      + `</tbody></table></div>`; }
  if (!(D.seasons || []).length) html += `<div class="empty">No trade with a results day on or after ${esc(D.showFrom)}.</div>`;
  body.innerHTML = html; card.hidden = false;
}
fetch('data/results/drift.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(D => { if (D && D.seasons) render(D); }).catch(() => {});
const openIt = () => { if (location.hash === '#driftCard') { const d = $('driftCard'); if (d && 'open' in d) d.open = true; } }; openIt(); window.addEventListener('hashchange', openIt);
})();
