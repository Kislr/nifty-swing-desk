#!/usr/bin/env node
/* PEAD as a portfolio engine — the rule in reports/pead-portfolio-hypotheses-2026-11-15.md, nothing else.
 *
 *   node scripts/backtest-pead-portfolio.mjs                  # data/results/events.json × data/history/, adjusted, that day's NIFTY 500 members, NIFTY 50 TR from data/benchmarks/
 *   node scripts/backtest-pead-portfolio.mjs --no-members     # survivorship-biased control
 *   node scripts/backtest-pead-portfolio.mjs --events f --hist dir --out dir [--benchmarks dir] [--capital 500000]   # the test harness
 *
 * The trades are the 13 Nov study's primary row, trade for trade (study() in backtest-pead.mjs: top decile of trailing-90-day
 * reaction returns on 2× volume, next open, 2-ATR stop with a 2% floor, 20-bar hold, point-in-time members). This script only
 * adds the portfolio layer: a book of `capital`, reinvested, slot = equity ÷ K at R's close, entries at R+1's open in descending
 * reaction-return order until K are open or cash is short, integer quantities, exits at the trade's own exit price and day,
 * equity marked at every close with idle cash included. K = 30 is the primary row (a capacity fact — see the hypothesis);
 * K = 20 and K = 50 (every signal fits) are companions; a no-stop row and an elastic-capital row (no cash limit, exposure
 * reported) are information only. The bar is the NIFTY 50 total-return index over the same window: CAGR + 2 points, a higher
 * Sharpe, no calendar year over 40% of the book's log return. Writes reports/pead-portfolio-<stamp>.md and .json. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as BM from './benchmarks.mjs';
import { study } from './backtest-pead.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; }; const flag = k => argv.includes('--' + k);
export const BOOK = { K: 30, companions: [20, 50], bar: { cagrOver: 0.02, maxYearShare: 0.4, minTrades: 300 } };

/* ---------- the portfolio layer, exported for the tests ---------- */
/** Run a book over a trade list. trades: [{sym, entryDate, exitDate, entry, exit, retR, ...}] from study(); bars for closes.
 *  opts: { K, capital, elastic, from, to } — elastic ignores K and cash (weight 1/K of equity per trade, cash may go negative);
 *  from / to (ISO dates) bound the window: entries before `from` are not taken and the curve stops at the last bar ≤ `to`
 *  (the main run sets both to the NIFTY 50 TR series' coverage, so the book and the index are measured over the same days).
 *  Returns { equity: [{date, value, cash, positions, invested}], taken: [...trades with qty, pnl], skipped: {full, cash, price}, peakPositions, peakExposure }. */
export function simulate(trades, bars, opts) {
  const K = opts.K, capital = opts.capital, elastic = !!opts.elastic; const pos = {}; bars.dates.forEach((d, i) => (pos[d] = i)); const N = bars.dates.length;
  const from = opts.from || '0000', to = opts.to || '9999'; let last = N - 1; while (last > 0 && bars.dates[last] > to) last--;
  const byEntry = {}; for (const t of trades) { if (pos[t.entryDate] == null || pos[t.exitDate] == null || t.entryDate < from || pos[t.entryDate] > last) continue; (byEntry[t.entryDate] || (byEntry[t.entryDate] = [])).push(t); }
  for (const list of Object.values(byEntry)) list.sort((a, b) => (b.retR || 0) - (a.retR || 0) || a.sym.localeCompare(b.sym));   // largest reaction first, the desk row's order
  const firstDay = Object.keys(byEntry).sort()[0]; if (!firstDay) return { equity: [], taken: [], skipped: {}, peakPositions: 0, peakExposure: 0 };
  let cash = capital, open = []; const equity = [], taken = [], skipped = { full: 0, cash: 0, price: 0 }; let peakPositions = 0, peakExposure = 0; let prevValue = capital;
  const mark = i => { let inv = 0; for (const p of open) { const B = bars.sym[p.sym]; let c = B && B.c[i]; if (c == null) c = p.lastClose; else p.lastClose = c; inv += p.qty * c; } return inv; };
  for (let i = pos[firstDay]; i <= last; i++) { const d = bars.dates[i];
    for (const t of byEntry[d] || []) {   // entries at the open, sized on yesterday's close (= R's close)
      if (!elastic && open.length >= K) { skipped.full++; continue; }
      const slot = prevValue / K; const budget = elastic ? slot : Math.min(slot, cash); const qty = Math.floor(budget / t.entry);
      if (qty < 1) { if (slot < t.entry) skipped.price++; else skipped.cash++; continue; }
      cash -= qty * t.entry; const p = { sym: t.sym, qty, entry: t.entry, exitDate: t.exitDate, exitPx: t.exit, lastClose: t.entry, t }; open.push(p);
      taken.push(Object.assign({}, t, { qty, cost: +(qty * t.entry).toFixed(2), pnl: +(qty * (t.exit - t.entry)).toFixed(2) })); }
    peakPositions = Math.max(peakPositions, open.length);
    for (let k = open.length - 1; k >= 0; k--) if (open[k].exitDate === d) { cash += open[k].qty * open[k].exitPx; open.splice(k, 1); }   // exits at the stop or the 20th close: cash from this close
    const invested = mark(i); const value = cash + invested; peakExposure = Math.max(peakExposure, value > 0 ? invested / value : 0);
    equity.push({ date: d, value: +value.toFixed(2), cash: +cash.toFixed(2), positions: open.length, invested: +invested.toFixed(2) }); prevValue = value; }
  return { equity, taken, skipped, peakPositions, peakExposure };
}
const mean = a => a.length ? a.reduce((p, c) => p + c, 0) / a.length : null;
const stdev = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((p, c) => p + (c - m) * (c - m), 0) / (a.length - 1)); };
/** Equity-curve statistics with the momentum backtest's arithmetic (CAGR on 250-day years, drawdown on closes, Sharpe = mean daily / sd × √250),
 *  plus each calendar year's return and its share of the total log return (the size-neutral form of the 40% cap). */
export function stats(sim) {
  const eq = sim.equity; if (!eq.length) return { n: 0, days: 0 };
  const v0 = eq[0].value, v1 = eq[eq.length - 1].value; const years = (eq.length - 1) / 250; const cagr = years > 0 ? Math.pow(v1 / v0, 1 / years) - 1 : 0;
  let peak = -Infinity, dd = 0; for (const e of eq) { peak = Math.max(peak, e.value); dd = Math.max(dd, (peak - e.value) / peak); }
  const dr = []; for (let k = 1; k < eq.length; k++) dr.push(eq[k].value / eq[k - 1].value - 1); const sd = stdev(dr); const sharpe = sd ? mean(dr) / sd * Math.sqrt(250) : null;
  const byYear = {}; for (let k = 1; k < eq.length; k++) { const y = eq[k].date.slice(0, 4); const b = byYear[y] || (byYear[y] = { start: eq[k - 1].value, end: 0, days: 0 }); b.end = eq[k].value; b.days++; }
  const totalLog = Math.log(v1 / v0); let maxYearShare = null, maxYear = null;
  for (const [y, b] of Object.entries(byYear)) { b.ret = b.end / b.start - 1; b.logShare = totalLog > 0 ? Math.log(b.end / b.start) / totalLog : null; if (b.logShare != null && (maxYearShare == null || b.logShare > maxYearShare)) { maxYearShare = b.logShare; maxYear = y; } }
  const t = sim.taken; const wins = t.filter(x => x.pnl > 0); const byReason = {}; for (const x of t) byReason[x.reason] = (byReason[x.reason] || 0) + 1;
  return { n: t.length, skipped: sim.skipped, days: eq.length, start: eq[0].date, end: eq[eq.length - 1].date, final: v1, totalReturn: v1 / v0 - 1, cagr, maxDrawdown: dd, sharpe, winRate: t.length ? wins.length / t.length : null,
    invested: mean(eq.map(e => e.value ? e.invested / e.value : 0)), peakPositions: sim.peakPositions, peakExposure: sim.peakExposure, byYear, maxYearShare, maxYear, byReason, pnl: t.reduce((p, c) => p + c.pnl, 0) };
}
/** Verdict against the pass mark written in the hypothesis. `idx` = BM.windowStats of the NIFTY 50 TR over the book's window. */
export function verdict(st, idx, bar) {
  bar = bar || BOOK.bar; if (!st.n || st.n < bar.minTrades) return { result: 'insufficient', why: `${st.n || 0} trades taken, under ${bar.minTrades}` };
  if (!idx || !idx.covered) return { result: 'insufficient', why: 'NIFTY 50 total-return series does not cover the window — nothing to measure against' };
  const pc = x => (x * 100).toFixed(1) + '%'; const fails = [];
  if (st.cagr < idx.cagr + bar.cagrOver) fails.push(`CAGR ${pc(st.cagr)} against NIFTY 50 TR ${pc(idx.cagr)} — needs +${pc(bar.cagrOver)} over it (${pc(idx.cagr + bar.cagrOver)})`);
  if (idx.sharpe != null && !(st.sharpe > idx.sharpe)) fails.push(`Sharpe ${st.sharpe == null ? '—' : st.sharpe.toFixed(2)} not above the index's ${idx.sharpe.toFixed(2)}`);
  if (st.maxYearShare != null && st.maxYearShare > bar.maxYearShare) fails.push(`${st.maxYear} supplies ${Math.round(st.maxYearShare * 100)}% of the total log return (cap ${Math.round(bar.maxYearShare * 100)}%)`);
  return fails.length ? { result: 'fail', why: fails.join('; ') } : { result: 'pass', why: `CAGR ${pc(st.cagr)} against ${pc(idx.cagr)} for the NIFTY 50 TR, Sharpe ${st.sharpe.toFixed(2)} against ${idx.sharpe.toFixed(2)}, largest year ${Math.round((st.maxYearShare || 0) * 100)}% of the log return` };
}

/* ---------- main ---------- */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const HIST = arg('hist', path.join(ROOT, 'data', 'history')); const files = []; for (const f of (await fs.readdir(HIST).catch(() => [])).sort()) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
  if (!files.length) { console.error('No history files. Run the backfill first.'); process.exit(2); }
  const EV = arg('events', path.join(ROOT, 'data', 'results', 'events.json')); const eventsDoc = JSON.parse(await fs.readFile(EV, 'utf8').catch(() => { console.error(`${EV} not found — run node scripts/results-dates.mjs from a home connection first (BACKFILL.md, "Results dates").`); process.exit(2); }));
  const custom = (JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'sectors.json'), 'utf8').catch(() => '{"map":{}}'))).map || {};
  const adjustments = JSON.parse(await fs.readFile(arg('adjust', path.join(ROOT, 'data', 'adjustments.json')), 'utf8').catch(() => 'null'));
  const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8').catch(() => '{"risk":{"capital":500000}}')); const capital = +arg('capital', config.risk && config.risk.capital || 500000);
  const bars = E.buildBars(files, [], { adjustments }); const N = bars.dates.length;
  let MEM = null; if (!flag('no-members')) { const mf = arg('members', path.join(ROOT, 'data', 'membership', 'members.json')); MEM = JSON.parse(await fs.readFile(mf, 'utf8').catch(() => 'null')); if (!MEM) console.warn('no membership list; running on every name with bars'); }
  const bdir = arg('benchmarks', path.join(ROOT, 'data', 'benchmarks')); const benchmarks = await BM.loadBenchmarks(bdir).catch(e => { console.warn(`benchmarks: ${e.message}`); return {}; });
  const nifty = benchmarks['NIFTY 50'] || null; if (!nifty) console.warn(`no NIFTY 50 total-return files in ${bdir} — the verdict will be "insufficient"`);
  const from = arg('from', nifty ? nifty.dates[0] : undefined), to = arg('to', nifty ? nifty.dates[nifty.dates.length - 1] : undefined);   // the book is measured over the days the NIFTY 50 TR series covers (files run Jun 2017 → the last download), the same window the momentum backtests use
  console.log(`history: ${N} days, ${Object.keys(bars.sym).length} symbols, ${bars.dates[0]} → ${bars.dates[N - 1]}${bars.adjusted ? `; corporate actions ${bars.adjusted.events} events` : ''}; events file ${eventsDoc.built || '?'}${MEM ? '; point-in-time NIFTY 500 membership on' : ''}; capital ₹${capital.toLocaleString('en-IN')}`);
  const S = study(bars, eventsDoc, { members: MEM, custom }); const trades = S.rows.primary.trades;   // the 13 Nov trade list, unchanged
  const Sns = study(bars, eventsDoc, { members: MEM, custom, params: { noStop: true } }); const tradesNoStop = Sns.rows.primary.trades;
  console.log(`trade list: ${trades.length} trades (13 Nov primary row: ${S.rows.primary.stats.expectancy >= 0 ? '+' : ''}${S.rows.primary.stats.expectancy}R, verdict ${S.verdict.result}); no-stop list ${tradesNoStop.length}`);
  const K = BOOK.K; const W = { capital, from, to }; const runs = {
    primary: simulate(trades, bars, { ...W, K }),
    k20: simulate(trades, bars, { ...W, K: BOOK.companions[0] }), k50: simulate(trades, bars, { ...W, K: BOOK.companions[1] }),
    noStop: simulate(tradesNoStop, bars, { ...W, K }), elastic: simulate(trades, bars, { ...W, K, elastic: true }) };
  const inWindow = trades.filter(t => t.entryDate >= (from || '0000') && t.entryDate <= (to || '9999')).length;
  const ST = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, stats(v)])); const pr = ST.primary;
  const idx = nifty && pr.days ? BM.windowStats(nifty, pr.start, pr.end) : null; const idxYears = nifty && pr.days ? BM.byYear(nifty, pr.start, pr.end) : {};
  const others = Object.values(benchmarks).filter(S => S.name !== 'NIFTY 50').sort((a, b) => a.name.localeCompare(b.name)).map(S => ({ S, w: pr.days ? BM.windowStats(S, pr.start, pr.end) : null, yr: pr.days ? BM.byYear(S, pr.start, pr.end) : {} }));
  const V = verdict(pr, idx);
  const stamp = new Date().toISOString().slice(0, 10) + (bars.adjusted && bars.adjusted.events ? '-adjusted' : '') + (MEM ? '-members' : ''); const OUT = arg('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });
  const pc = (x, d = 1) => x == null || !isFinite(x) ? '—' : (x * 100).toFixed(d) + '%'; const f = (x, d = 2) => x == null || !isFinite(x) ? '—' : Number(x).toFixed(d); const inr = x => '₹' + Math.round(x).toLocaleString('en-IN');
  const hdr = '| row | trades taken | skipped (full / cash / price) | final value | total return | CAGR | max DD | Sharpe | avg invested | peak positions | win rate | largest year share of log return |\n|---|---|---|---|---|---|---|---|---|---|---|---|';
  const row = (name, st) => st.days ? `| ${name} | ${st.n} | ${st.skipped.full} / ${st.skipped.cash} / ${st.skipped.price} | ${inr(st.final)} | ${pc(st.totalReturn)} | ${pc(st.cagr)} | ${pc(st.maxDrawdown)} | ${f(st.sharpe)} | ${pc(st.invested, 0)} | ${st.peakPositions}${st.peakExposure > 1.001 ? ` (exposure ${pc(st.peakExposure, 0)})` : ''} | ${pc(st.winRate, 0)} | ${st.maxYearShare == null ? '—' : Math.round(st.maxYearShare * 100) + '% (' + st.maxYear + ')'} |` : `| ${name} | 0 | | | | | | | | | | |`;
  const idxRow = (name, w) => w && w.covered ? `| ${name} (total return index) | — | — | — | ${pc(w.totalReturn)} | ${pc(w.cagr)} | ${pc(w.maxDrawdown)} | ${f(w.sharpe)} | 100% | — | — | — |` : `| ${name} (total return index) | — | not covered${w ? `: files run ${w.first} → ${w.last}` : ''} | | | | | | | | | |`;
  const years = Object.keys(pr.byYear || {}).sort();
  const yearTbl = years.length ? [`| year | K = 30 (primary) | K = 20 | K = 50 | no stop | elastic | NIFTY 50 TR |${others.map(o => ` ${BM.shortName(o.S.name)} TR |`).join('')} share of primary log return | trades taken (primary) | avg invested (primary) |`, '|---|---|---|---|---|---|---|' + others.map(() => '---|').join('') + '---|---|---|',
    ...years.map(y => { const b = pr.byYear[y]; const c = k => ST[k].byYear[y] ? pc(ST[k].byYear[y].ret) : '—'; const nTr = runs.primary.taken.filter(t => t.entryDate.slice(0, 4) === y).length; const inv = mean(runs.primary.equity.filter(e => e.date.slice(0, 4) === y).map(e => e.value ? e.invested / e.value : 0));
      return `| ${y}${b.days < 200 ? ' (partial)' : ''} | ${pc(b.ret)} | ${c('k20')} | ${c('k50')} | ${c('noStop')} | ${c('elastic')} | ${idxYears[y] ? pc(idxYears[y].ret) : '—'} |${others.map(o => ` ${o.yr[y] ? pc(o.yr[y].ret) : '—'} |`).join('')} ${b.logShare == null ? '—' : Math.round(b.logShare * 100) + '%'} | ${nTr} | ${pc(inv, 0)} |`; })] : ['(no trades)'];
  const reading = V.result === 'pass' ? 'Per the decision rule: a second paper book ("RESULTS DRIFT BOOK") beside the momentum one, run by the daily job from the next results season, with three- and six-month readings against the NIFTY 50 TR. No orders, no engine change — the paper book is the real test; this run reused the trades that produced the finding.'
    : V.result === 'fail' ? 'Per the decision rule: PEAD is closed at every level — setup and portfolio. The finding stays on record as a real, thin drift that neither four slots nor a book turns into a return over the index. The swing queue is empty.' : 'Insufficient: see the line above.';
  const md = [`# PEAD as a portfolio — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days, ${Object.keys(bars.sym).length} symbols${bars.adjusted ? ', corporate actions applied' : ''}). Events \`${path.relative(ROOT, EV)}\` built ${eventsDoc.built || '?'}. Trades: the 13 Nov study's primary row re-run on this history — ${trades.length} trades, ${S.rows.primary.stats.expectancy >= 0 ? '+' : ''}${S.rows.primary.stats.expectancy}R, verdict ${S.verdict.result} (${S.verdict.why}); ${inWindow} of them enter inside the measured window${from || to ? ` ${from || bars.dates[0]} → ${to || bars.dates[N - 1]} (the NIFTY 50 TR series' coverage, so book and index are measured over the same days)` : ''}. Book: ${inr(capital)}, reinvested, slot = equity ÷ K at R's close, entries at R+1's open in descending reaction-return order, integer quantities, idle cash earns nothing. ${MEM ? 'Universe: that day\'s NIFTY 500 members.' : '**Universe: every name with bars (membership off — survivorship-biased).**'} Hypothesis, pass mark and decision rule were written before the run: \`reports/pead-portfolio-hypotheses-2026-11-15.md\`. **This is a second look at the data that produced the 13 Nov finding; a pass here starts a paper book, not trading.**`, '',
    `## Verdict: **${V.result.toUpperCase()}** — ${V.why}`, '', reading, '',
    '## Rows', '', `Window ${pr.start || '—'} → ${pr.end || '—'} (${pr.days} trading days, from the first entry inside the window to its last bar). The bar is the NIFTY 50 TR row: CAGR + 2 points, a higher Sharpe, no year over 40% of the log return.`, '', hdr, row(`**primary**: K = ${K}, the 13 Nov trades, reinvested`, pr), row(`K = ${BOOK.companions[0]}`, ST.k20), row(`K = ${BOOK.companions[1]} (every signal fits)`, ST.k50), row(`no stop: K = ${K}, 20th-bar close only (information)`, ST.noStop), row(`elastic capital: 1/${K} of equity per signal, no cash limit (information)`, ST.elastic), idxRow('NIFTY 50', idx), ...others.map(o => idxRow(o.S.name, o.w)), '',
    '"Avg invested" is the mean share of equity in open positions over the window — the rest is cash earning nothing, which is the whole question for a seasonal signal. "Skipped" counts signals the book could not take: full = K already open, cash = a slot\'s worth of cash was not there, price = one share cost more than a slot. The elastic row ignores both limits and reports its peak gross exposure; it is what the per-trade edge would be worth with free leverage and is not investable as written. The momentum-index rows are context, not the bar.', '',
    '## By year', '', ...yearTbl, '', 'Calendar years inside the window; a partial first year is shown and not scored. "Share of log return" is ln(end ÷ start) for the year over ln(final ÷ initial) for the window, the size-neutral form of the 40% cap; it is blank when the book is down over the window.', '',
    '## Exit reasons (primary, trades taken)', '', ...Object.entries(pr.byReason || {}).map(([k, v]) => `- ${k}: ${v}`), '',
    '## How to read this', '', `The per-trade study already said what each trade did (+${S.rows.primary.stats.meanRet}% mean return, +${S.rows.primary.stats.meanExcess}% over the index per 20-bar hold). A book adds two things the trade table cannot show: how much of the capital the signals can keep busy (results come in four seasons, so a book of ${K} slots is empty between them), and what the equity curve's drawdown and Sharpe look like on total capital with the idle cash counted. A Sharpe above the index's that comes from being mostly in cash is not a risk edge — read the invested column beside it. The K = 20 / K = 50 rows show whether the answer depends on the slot count, and the no-stop row whether it depends on the stop rather than the drift.`].join('\n');
  await fs.writeFile(path.join(OUT, `pead-portfolio-${stamp}.md`), md);
  await fs.writeFile(path.join(OUT, `pead-portfolio-${stamp}.json`), JSON.stringify({ book: BOOK, capital, verdict: V, index: idx, stats: ST, equity: runs.primary.equity, taken: runs.primary.taken, tradeList: { n: trades.length, stats: S.rows.primary.stats, verdict: S.verdict } }, null, 1));
  console.log(md.split('\n').slice(0, 20).join('\n')); console.log(`\nfull report: reports/pead-portfolio-${stamp}.md (and .json with the equity curve and every trade taken)`);
}
