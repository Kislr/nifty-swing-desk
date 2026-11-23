/* Nifty Swing Desk — the "?" beside every section title (21 Nov 2026, owner's request).
 * For someone seeing the desk for the first time, possibly new to investing: what the section is, and what a reader can do with it,
 * in the plainest words that stay true. One entry per section, keyed by the data-help attribute on the button in index.html.
 *
 * Behaviour: the popup opens on hover or keyboard focus and closes when the pointer leaves; a click or tap pins it open until the
 * "?" is clicked again, the × is pressed, Esc is pressed, or anything outside is clicked. No dependencies; if this file fails to
 * load the page works as before and the buttons do nothing.
 *
 * Writing rule for these texts: no jargon without its meaning in the same sentence, no numbers that will go stale (the cards carry
 * those), and never a word that reads as a recommendation — the desk is a set of rules and a record of how they did. */
(() => {
'use strict';
const HELP = {
  desk: { title: 'Nifty Swing Desk — what this page is',
    what: 'A daily report on India’s 500 largest listed companies (the NIFTY 500). After the market closes, a program collects the day’s prices and applies a fixed set of written rules to them. This page shows what those rules say today.',
    use: 'Use it to see how the market did, which stocks and industries are strongest, and how the rules themselves have performed when tested on ten years of past prices. It is a tool for learning and for keeping decisions consistent — it is not advice to buy or sell anything.',
    more: 'New here? Read “What the rules have earned” at the bottom first: it says plainly which rules worked in the past and which did not.' },
  regime: { title: 'Market regime',
    what: 'A health check of the whole market for the day: how many of the 500 stocks went up and how many went down, and what the main index (the NIFTY 50, a basket of the 50 biggest companies) did.',
    use: 'Tells you at a glance whether it was a strong, mixed or weak day. Most stocks move with the market, so on weak days the rules take smaller positions or none at all. Look here first.' },
  risk: { title: 'Risk & sizing',
    what: 'A calculator for how much to put into a single trade. You enter your capital and the most you are willing to lose on one trade (1% is a common choice), and it works out how many shares that allows.',
    use: 'Change the boxes to match your own money. Every quantity shown lower down is worked out from them, so that one losing trade cannot cost more than the amount you chose. Your numbers stay in this browser only.' },
  rules: { title: 'Today’s rules',
    what: 'A short checklist for the day, filled in by the program from today’s prices — for example whether conditions allow new buying, and which industries are leading.',
    use: 'Read it before the lists below. It is the same checklist every day with today’s facts in it, so that choices are made by rule and not by mood.' },
  momentum: { title: 'Momentum portfolio',
    what: 'A ranking of the stocks that have risen the most over roughly the last six months. “Momentum” is the observation that shares which have been strong often stay strong for a while longer.',
    use: 'Shows which names the rules would hold today, and whether the “gate” is open — that is, whether the market as a whole is above its average level of the last 200 trading days, which the rules require before any new buying. The list comes from fixed rules; tested on ten years of prices it did not beat a simple momentum index fund, so read it as something to watch, not a tip.' },
  swing: { title: 'Swing setups',
    what: 'Stocks whose price pattern today matches one of the desk’s short-term rules: a “breakout” (pushing above a recent high) or a “pullback” (a strong stock dipping back towards its average). A swing trade is one meant to last days or a few weeks.',
    use: 'Shows the price levels the rules would use: where a purchase would trigger, where it would be abandoned (the “stop”), and where profit would be taken (the “target”). These are for watching and for practice trades only — tested over ten years, the patterns made no money after costs.' },
  sectors: { title: 'Sector momentum',
    what: 'The market divided into industries — banks, software, medicines, cars and so on — and ranked by how well each group has been doing lately.',
    use: 'Shows which parts of the market are leading and which are lagging. Click an industry to show only its stocks in the lists above. Strong stocks are usually found in strong industries.' },
  universe: { title: 'Universe',
    what: 'The full table of the stocks the desk looks at, with today’s price, the day’s change and how each has done over the past month and year. “Universe” simply means “all the stocks being considered”.',
    use: 'Look up any company, sort by any column, or correct the industry a stock is filed under. Nothing in this table is a suggestion; it is the raw material the other sections are built from.' },
  paper: { title: 'Paper book vs the index fund',
    what: 'A pretend portfolio. The momentum rules “buy” and “sell” with imaginary money, day by day, with nobody intervening — and the result is compared with simply holding a momentum index fund (a ready-made basket anyone can buy).',
    use: 'Lets you see, with no money at risk, whether following the rules is doing better or worse than the simple alternative. Each holding has one line saying hold or sell. Because the result depends partly on the day the pretend portfolio happened to start, twenty more copies are started on the following twenty trading days (“The twenty-one books”) and the middle one is what counts. Any decision about real money waits until all of them are at least six months old, and the test they have to pass was written down before they began.' },
  positions: { title: 'Open positions — today’s line',
    what: 'For every trade you have written into the journal below and not yet closed, one line stating what the rules say today: hold, move the stop up, or exit.',
    use: 'A daily to-do list for trades you already have. It applies the same exit rules that were used in the tests, so the decision is made in advance rather than in the heat of the moment.' },
  journal: { title: 'Trade journal',
    what: 'Your own diary of trades, real or pretend. You record what you bought, at what price, and the price at which you would give up (the stop).',
    use: 'Keeps an honest record. The page checks each trade against every day’s prices and scores it in “R”: profit or loss measured in units of the amount you risked, so +2R means you made twice what you were prepared to lose. It is stored only in this browser — use Backup to keep a copy.' },
  performance: { title: 'Performance',
    what: 'The scorecard for the journal: how many trades won, the average result per trade, and the total — all in R (units of the amount risked on each trade).',
    use: 'Shows whether your trades make money on average, and which kind of trade is responsible. A handful of trades proves very little; it takes dozens before the averages mean much.' },
  import: { title: 'Manual snapshot',
    what: 'A way to load the day’s prices by hand. Normally a scheduled program fetches them from the exchange (NSE) after the close; this is the spare key for a day it fails.',
    use: 'If the daily update has not arrived, download the price table from the NSE website and drop it here, or paste it in. The page then recalculates everything from your file. What you load stays in this browser.' },
  backtest: { title: 'What the rules have earned',
    what: 'The report card. Each rule on this page was replayed over ten years of past prices as if it had been followed every single day — a “backtest” — with trading costs included.',
    use: 'Before trusting any list above, read here whether its rule would have made money in the past and how it compared with simply holding an index fund. Most did not beat the fund, which is why most of this page is labelled “watch” or “paper”.' },
  drift: { title: 'Results drift',
    what: 'Stocks that jumped on unusually heavy trading on the day their quarterly results came out, and what would have happened had you bought the next morning and held for about a month. “Drift” is the idea that good news keeps nudging a price upward for weeks.',
    use: 'Lets you watch the idea play out with no money on it. Rows marked ★ are “showing promise”: up by at least the amount risked, and ahead of the market over the same days. Some rows are always starred — about a quarter were over ten years of history — so a star is a description, not a signal to buy. The rule was fixed on 21 Nov 2026 and is only read after each results season.' },
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let pop = null, owner = null, pinned = false, hideT = null, showT = null;
const hoverable = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: true };

function build() {
  pop = document.createElement('div'); pop.id = 'helppop'; pop.className = 'helppop'; pop.setAttribute('role', 'note'); pop.hidden = true;
  pop.addEventListener('mouseenter', () => clearTimeout(hideT)); pop.addEventListener('mouseleave', () => { if (!pinned) later(); });
  pop.addEventListener('click', e => { if (e.target.closest('.helppop-x')) { const b = owner; close(); if (b) b.focus(); } });
  document.body.appendChild(pop);
}
function place(btn) {
  const r = btn.getBoundingClientRect(); const sx = window.scrollX, sy = window.scrollY; const vw = document.documentElement.clientWidth, vh = window.innerHeight; const m = 12;
  pop.style.left = '0px'; pop.style.top = '0px'; const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = r.left + r.width / 2 - 28; left = Math.max(m, Math.min(left, vw - w - m));
  let top = r.bottom + 8; const above = r.top - 8 - h; if (top + h > vh - m && above > m) top = above;   // flip above the button when there is no room below
  pop.style.left = (left + sx) + 'px'; pop.style.top = (top + sy) + 'px';
}
function open(btn, pin) {
  const h = HELP[btn.dataset.help]; if (!h) return; if (!pop) build(); clearTimeout(hideT);
  if (owner && owner !== btn) owner.setAttribute('aria-expanded', 'false');
  owner = btn; pinned = !!pin;
  pop.innerHTML = `<button type="button" class="helppop-x" aria-label="Close">×</button><h3 id="helppop-t">${esc(h.title)}</h3>` +
    `<p><span class="helppop-l">What this is</span>${esc(h.what)}</p><p><span class="helppop-l">What you can do with it</span>${esc(h.use)}</p>` + (h.more ? `<p class="helppop-m">${esc(h.more)}</p>` : '');
  pop.classList.toggle('pinned', pinned); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-describedby', 'helppop'); place(btn);
}
function close() { clearTimeout(hideT); clearTimeout(showT); if (owner) { owner.setAttribute('aria-expanded', 'false'); owner.removeAttribute('aria-describedby'); } if (pop) pop.hidden = true; owner = null; pinned = false; }
function later() { clearTimeout(hideT); hideT = setTimeout(() => { if (!pinned) close(); }, 220); }

function wire() {
  const btns = document.querySelectorAll('button.help[data-help]');
  btns.forEach(btn => { const h = HELP[btn.dataset.help]; if (!h) { btn.hidden = true; return; }
    btn.type = 'button'; btn.setAttribute('aria-label', `About this section: ${h.title}`); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'helppop');
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation();   // inside a <summary> the click must not fold the card
      if (owner === btn && pinned) close(); else open(btn, true); });
    btn.addEventListener('mouseenter', () => { if (!hoverable.matches || (owner === btn)) { clearTimeout(hideT); return; } if (pinned) return; clearTimeout(showT); showT = setTimeout(() => open(btn, false), 120); });
    btn.addEventListener('mouseleave', () => { clearTimeout(showT); if (owner === btn && !pinned) later(); });
    btn.addEventListener('focus', () => { if (!owner && btn.matches(':focus-visible')) open(btn, false); });
    btn.addEventListener('blur', () => { if (owner === btn && !pinned) later(); });
    btn.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); }); });   // Space on a button inside <summary> would otherwise toggle the <details>
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && owner) { const b = owner; close(); b.focus(); } });
  document.addEventListener('click', e => { if (owner && !e.target.closest('.helppop') && !e.target.closest('button.help')) close(); });
  window.addEventListener('resize', () => { if (owner) place(owner); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
window.DeskHelp = { HELP, open, close };
})();
