#!/usr/bin/env node
/* Post-earnings-announcement drift (PEAD) backtest — the rule in reports/pead-hypotheses-2026-11-13.md, nothing else.
 *
 *   node scripts/backtest-pead.mjs                       # data/results/events.json × data/history/, adjusted, that day's NIFTY 500 members
 *   node scripts/backtest-pead.mjs --from 2019-01-01 --to 2026-12-31
 *   node scripts/backtest-pead.mjs --no-members          # every name with bars, membership ignored (survivorship-biased control)
 *   node scripts/backtest-pead.mjs --events file --hist dir --out dir   # the test harness
 *
 * Event → reaction day R: the timestamp's own day if it is a trading day and the time is before 15:30, else the next trading day
 * (after-close filings, weekends, holidays, and board-meeting dates that carry no time). Reaction: ret_R = close[R]/close[R−1] − 1,
 * volx = volume[R] / mean(volume[R−20…R−1]). Signal at R's close: volx ≥ 2 and ret_R in the top decile of the reaction returns of all
 * events whose R fell in the trailing 90 calendar days (≥ 30 of them, else nothing). Trade: buy at R+1's open + half the cost, skipped
 * if that open is > 3% above R's close; stop = entry − 2 × ATR(14 at R), floor 2%; exit at the stop when a low touches it (at the open
 * if the open is already below), else at the close of the 20th bar after entry. Expectancy in R = (exit − entry) / (entry − stop).
 * Rows: primary; top decile without the volume screen; bottom decile with it; every event with volx ≥ 2 (base rate); the desk
 * version (≤ 4 open, one per sector, taken in ret_R order). Information only: 10- and 30-bar holds, top quintile.
 * Pass mark (fixed in the hypothesis): primary ≥ +0.1R over 300+ trades, mean 20-bar excess over the NIFTY 50 positive in ≥ 6 of the
 * years with ≥ 20 trades, no year > 40% of total R. Under 300 trades = insufficient, not fail.
 * Writes reports/pead-<stamp>.md and .json (every trade of the primary row). */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { memberOn } from './membership.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; }; const flag = k => argv.includes('--' + k);
export const RULE = { volx: 2, decile: 0.9, window: 90, minWindow: 30, hold: 20, atrMult: 2, stopFloor: 0.02, gapSkip: 0.03, costBps: 30, maxPositions: 4 };

/* ---------- the pieces, exported for the tests ---------- */
/** Index of the reaction day for an event, or null when it is outside the bars. `pos` maps date → index. */
export function reactionIndex(bars, pos, ev) {
  const N = bars.dates.length; const sameDay = ev.time != null && ev.time < '15:30';
  if (pos[ev.date] != null && sameDay) return pos[ev.date];
  let i = pos[ev.date] != null ? pos[ev.date] + 1 : bars.dates.findIndex(d => d > ev.date); if (i < 0 || i >= N) return null; return i;
}
/** Reaction return and volume multiple at R, or null when the bars are missing. */
export function reaction(B, R) {
  if (R < 21 || B.c[R] == null || B.c[R - 1] == null || B.v[R] == null) return null;
  const vs = []; for (let k = R - 20; k < R; k++) if (B.v[k] != null) vs.push(B.v[k]); if (vs.length < 15) return null;
  const avg = vs.reduce((p, c) => p + c, 0) / vs.length; if (!(avg > 0)) return null;
  return { ret: B.c[R] / B.c[R - 1] - 1, volx: B.v[R] / avg };
}
/** Percentile rank of each event's reaction return among the events whose R fell in the trailing `window` days (inclusive).
 *  Events sorted by R; sets ev.pct (0–1) or null when fewer than minWindow events are in the window. */
export function rankReactions(events, dates, P) {
  const ms = d => new Date(d + 'T00:00:00Z').getTime(); let lo = 0;
  for (let k = 0; k < events.length; k++) { const e = events[k]; const t = ms(dates[e.R]);
    while (lo < k && ms(dates[events[lo].R]) < t - P.window * 86400000) lo++;
    let hi = k; while (hi + 1 < events.length && events[hi + 1].R === e.R) hi++;   // every reaction on the same day is known at that close
    const win = events.slice(lo, hi + 1); if (win.length < P.minWindow) { e.pct = null; continue; }
    let below = 0; for (const w of win) if (w.ret < e.ret) below++; e.pct = below / (win.length - 1 || 1); }
  return events;
}
/** One trade from a signal at R; null if it cannot be taken (no next open, gap, no ATR). */
export function trade(bars, B, sym, R, P, hold) {
  const N = bars.dates.length; const i = R + 1; if (i >= N || B.o[i] == null || B.c[R] == null) return null;
  if (B.o[i] > B.c[R] * (1 + P.gapSkip)) return { skipped: 'gap' };
  const atr = E.indicators.atr(B, 14, R); if (atr == null) return { skipped: 'no ATR' };
  const cost = px => px * P.costBps / 2 / 10000; const entry = B.o[i] + cost(B.o[i]); const stop = entry - Math.max(P.atrMult * atr, entry * P.stopFloor); const risk = entry - stop;   // 2 × ATR below the entry, at least 2% (engine.js's breakout stop). 13 Nov 2026: the first run had max() the wrong way round, so the stop was never more than 2% below — see the report
  let exit = null, exitI = null, reason = null, last = null;
  for (let k = i; k < N; k++) { if (B.c[k] == null) continue; last = k;
    if (k > i && B.o[k] != null && B.o[k] < stop) { exit = B.o[k]; exitI = k; reason = 'stop (gap)'; break; }
    if (B.l[k] != null && B.l[k] <= stop && k > i) { exit = stop; exitI = k; reason = 'stop'; break; }
    if (k === i && B.l[k] != null && B.l[k] <= stop && B.o[k] > stop) { exit = stop; exitI = k; reason = 'stop'; break; }
    if (k >= i + hold) { exit = B.c[k]; exitI = k; reason = 'time'; break; } }
  if (exit == null) { if (last == null) return { skipped: 'no bars' }; exit = B.c[last]; exitI = last; reason = 'end of data'; }
  const exitPx = exit - cost(exit); const idx = bars.index; const nifty = idx && idx.c[exitI] != null && idx.c[R] != null ? idx.c[exitI] / idx.c[R] - 1 : null; const ret = exitPx / entry - 1;
  return { sym, R: bars.dates[R], entryDate: bars.dates[i], exitDate: bars.dates[exitI], entry: +entry.toFixed(2), stop: +stop.toFixed(2), exit: +exitPx.toFixed(2), bars: exitI - i, ret: +(ret * 100).toFixed(2), Rm: +((exitPx - entry) / risk).toFixed(3), nifty: nifty == null ? null : +(nifty * 100).toFixed(2), excess: nifty == null ? null : +((ret - nifty) * 100).toFixed(2), reason };
}
export function summarize(trades) {
  const t = trades.filter(x => x && !x.skipped); const n = t.length; if (!n) return { n: 0 };
  const R = t.map(x => x.Rm); const sum = R.reduce((p, c) => p + c, 0); const mean = sum / n; const sd = n > 1 ? Math.sqrt(R.reduce((p, c) => p + (c - mean) ** 2, 0) / (n - 1)) : 0;
  const wins = R.filter(x => x > 0), losses = R.filter(x => x <= 0); const pf = losses.length && losses.reduce((p, c) => p + c, 0) !== 0 ? wins.reduce((p, c) => p + c, 0) / -losses.reduce((p, c) => p + c, 0) : null;
  let peak = 0, cum = 0, dd = 0; for (const x of [...t].sort((a, b) => a.entryDate < b.entryDate ? -1 : 1)) { cum += x.Rm; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); }
  const ex = t.filter(x => x.excess != null); const byYear = {};
  for (const x of t) { const y = x.entryDate.slice(0, 4); const b = byYear[y] || (byYear[y] = { n: 0, R: 0, ret: 0, excess: 0, nEx: 0 }); b.n++; b.R += x.Rm; b.ret += x.ret; if (x.excess != null) { b.excess += x.excess; b.nEx++; } }
  for (const b of Object.values(byYear)) { b.R = +b.R.toFixed(2); b.meanRet = +(b.ret / b.n).toFixed(2); b.meanExcess = b.nEx ? +(b.excess / b.nEx).toFixed(2) : null; delete b.ret; delete b.excess; delete b.nEx; }
  const maxShare = sum > 0 ? Math.max(...Object.values(byYear).map(b => b.R)) / sum : null;
  const yrs20 = Object.values(byYear).filter(b => b.n >= 20); const posYears = yrs20.filter(b => b.meanExcess != null && b.meanExcess > 0).length;
  const byReason = {}; for (const x of t) byReason[x.reason] = (byReason[x.reason] || 0) + 1;
  return { n, expectancy: +mean.toFixed(3), totalR: +sum.toFixed(1), profitFactor: pf == null ? null : +pf.toFixed(2), winRate: +(wins.length / n).toFixed(3), tStat: sd > 1e-9 ? +(mean / sd * Math.sqrt(n)).toFixed(2) : null, drawdownR: +dd.toFixed(1),
    meanRet: +(t.reduce((p, c) => p + c.ret, 0) / n).toFixed(2), meanExcess: ex.length ? +(ex.reduce((p, c) => p + c.excess, 0) / ex.length).toFixed(2) : null, avgBars: +(t.reduce((p, c) => p + c.bars, 0) / n).toFixed(1), byYear, maxYearShare: maxShare == null ? null : +maxShare.toFixed(2), yearsWith20: yrs20.length, positiveYears: posYears, byReason };
}
/** Verdict against the pass mark written in the hypothesis. */
export function verdict(st) {
  if (!st.n || st.n < 300) return { result: 'insufficient', why: `${st.n || 0} trades, under 300` };
  const fails = []; if (st.expectancy < 0.1) fails.push(`expectancy ${st.expectancy}R < +0.1R`); if (st.positiveYears < 6) fails.push(`excess over the index positive in ${st.positiveYears} of ${st.yearsWith20} years with 20+ trades (needs 6)`); if (st.maxYearShare != null && st.maxYearShare > 0.4) fails.push(`one year supplies ${Math.round(st.maxYearShare * 100)}% of total R (cap 40%)`);
  return fails.length ? { result: 'fail', why: fails.join('; ') } : { result: 'pass', why: `${st.expectancy}R over ${st.n} trades; excess positive in ${st.positiveYears} of ${st.yearsWith20} years; largest year ${Math.round((st.maxYearShare || 0) * 100)}% of total R` };
}
/** The whole study: events.json + bars → rows. */
export function study(bars, eventsDoc, opts) {
  const P = Object.assign({}, RULE, opts && opts.params || {}); const MEM = opts && opts.members || null; const custom = opts && opts.custom || {}; const from = opts && opts.from || '0000', to = opts && opts.to || '9999';
  const pos = {}; bars.dates.forEach((d, i) => (pos[d] = i)); const events = []; const cov = { total: 0, noBars: 0, outside: 0, noReaction: 0, notMember: 0, sameDay: 0, nextDay: 0, noTime: 0, used: 0, symbolsNoBars: [] };
  for (const [sym, list] of Object.entries(eventsDoc.symbols || {})) { const B = bars.sym[sym]; if (!B) { cov.noBars += list.length; cov.symbolsNoBars.push(sym); continue; }
    for (const ev of list) { cov.total++; if (ev.date < from || ev.date > to) { cov.outside++; continue; } const R = reactionIndex(bars, pos, ev); if (R == null) { cov.outside++; continue; }
      const rx = reaction(B, R); if (!rx) { cov.noReaction++; continue; }
      if (MEM && !memberOn(MEM, sym, bars.dates[R])) { cov.notMember++; continue; }
      if (ev.time == null) cov.noTime++; else if (R === pos[ev.date]) cov.sameDay++; else cov.nextDay++; cov.used++;
      events.push({ sym, R, ret: rx.ret, volx: rx.volx, time: ev.time, src: ev.src }); } }
  cov.total += cov.noBars; events.sort((a, b) => a.R - b.R || a.sym.localeCompare(b.sym)); rankReactions(events, bars.dates, P);
  const take = (filter, hold, desk) => { const out = []; const skipped = {}; const open = []; let day = -1;
    for (const e of events) { if (!filter(e)) continue;
      if (desk) { if (e.R !== day) { day = e.R; } for (let k = open.length - 1; k >= 0; k--) if (pos[open[k].exitDate] <= e.R) open.splice(k, 1);   // positions closed by R's close free their slot
        const sector = E.sectorOf(e.sym, custom); if (open.length >= P.maxPositions || open.some(o => o.sector === sector)) { skipped.full = (skipped.full || 0) + 1; continue; }
        const t = trade(bars, bars.sym[e.sym], e.sym, e.R, P, hold); if (!t || t.skipped) { skipped[t ? t.skipped : 'none'] = (skipped[t ? t.skipped : 'none'] || 0) + 1; continue; } t.sector = sector; t.volx = +e.volx.toFixed(2); t.retR = +(e.ret * 100).toFixed(2); out.push(t); open.push(t); continue; }
      const t = trade(bars, bars.sym[e.sym], e.sym, e.R, P, hold); if (!t || t.skipped) { skipped[t ? t.skipped : 'none'] = (skipped[t ? t.skipped : 'none'] || 0) + 1; continue; } t.volx = +e.volx.toFixed(2); t.retR = +(e.ret * 100).toFixed(2); out.push(t); }
    return { trades: out, skipped, stats: summarize(out) }; };
  const top = e => e.pct != null && e.pct >= P.decile, vol = e => e.volx >= P.volx, bottom = e => e.pct != null && e.pct <= 1 - P.decile, quint = e => e.pct != null && e.pct >= 0.8;
  const rows = {
    primary: take(e => top(e) && vol(e), P.hold, false), noVolume: take(top, P.hold, false), bottom: take(e => bottom(e) && vol(e), P.hold, false), baseRate: take(vol, P.hold, false), desk: take(e => top(e) && vol(e), P.hold, true),
    info: { hold10: take(e => top(e) && vol(e), 10, false).stats, hold30: take(e => top(e) && vol(e), 30, false).stats, quintile: take(e => quint(e) && vol(e), P.hold, false).stats } };
  const ranked = events.filter(e => e.pct != null).length;
  return { params: P, coverage: cov, events: events.length, ranked, rows, verdict: verdict(rows.primary.stats) };
}

/* ---------- main ---------- */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const HIST = arg('hist', path.join(ROOT, 'data', 'history')); const files = []; for (const f of (await fs.readdir(HIST).catch(() => [])).sort()) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
  if (!files.length) { console.error('No history files. Run the backfill first.'); process.exit(2); }
  const EV = arg('events', path.join(ROOT, 'data', 'results', 'events.json')); const eventsDoc = JSON.parse(await fs.readFile(EV, 'utf8').catch(() => { console.error(`${EV} not found — run node scripts/results-dates.mjs from a home connection first (BACKFILL.md, "Results dates").`); process.exit(2); }));
  const custom = (JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'sectors.json'), 'utf8').catch(() => '{"map":{}}'))).map || {};
  const adjustments = JSON.parse(await fs.readFile(arg('adjust', path.join(ROOT, 'data', 'adjustments.json')), 'utf8').catch(() => 'null'));
  const bars = E.buildBars(files, [], { adjustments }); const N = bars.dates.length;
  let MEM = null; if (!flag('no-members')) { const mf = arg('members', path.join(ROOT, 'data', 'membership', 'members.json')); MEM = JSON.parse(await fs.readFile(mf, 'utf8').catch(() => 'null')); if (!MEM) console.warn('no membership list; running on every name with bars'); }
  console.log(`history: ${N} days, ${Object.keys(bars.sym).length} symbols, ${bars.dates[0]} → ${bars.dates[N - 1]}${bars.adjusted ? `; corporate actions ${bars.adjusted.events} events` : ''}; events file ${eventsDoc.built || '?'} with ${Object.values(eventsDoc.symbols || {}).reduce((n, l) => n + l.length, 0)} events on ${Object.keys(eventsDoc.symbols || {}).length} symbols${MEM ? '; point-in-time NIFTY 500 membership on' : ''}`);
  const S = study(bars, eventsDoc, { members: MEM, custom, from: arg('from'), to: arg('to') });
  const stamp = new Date().toISOString().slice(0, 10) + (bars.adjusted && bars.adjusted.events ? '-adjusted' : '') + (MEM ? '-members' : ''); const OUT = arg('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });
  const f = (x, d = 2) => x == null ? '—' : Number(x).toFixed(d); const row = (name, st) => st.n ? `| ${name} | ${st.n} | ${st.expectancy >= 0 ? '+' : ''}${f(st.expectancy, 3)}R | ${f(st.profitFactor)} | ${Math.round(st.winRate * 100)}% | ${st.meanRet >= 0 ? '+' : ''}${f(st.meanRet)}% | ${st.meanExcess == null ? '—' : (st.meanExcess >= 0 ? '+' : '') + f(st.meanExcess) + '%'} | ${f(st.tStat)} | ${f(st.drawdownR, 1)}R | ${f(st.avgBars, 0)} | ${st.positiveYears}/${st.yearsWith20} | ${st.maxYearShare == null ? '—' : Math.round(st.maxYearShare * 100) + '%'} |` : `| ${name} | 0 | | | | | | | | | | |`;
  const hdr = '| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |\n|---|---|---|---|---|---|---|---|---|---|---|---|';
  const cov = S.coverage; const pr = S.rows.primary.stats; const V = S.verdict;
  const yrs = Object.keys(pr.byYear || {}).sort(); const yearTbl = yrs.length ? ['| year | trades | total R | mean return | mean excess vs Nifty | base rate (all ≥2× vol) |', '|---|---|---|---|---|---|', ...yrs.map(y => { const b = pr.byYear[y], base = S.rows.baseRate.stats.byYear && S.rows.baseRate.stats.byYear[y]; return `| ${y} | ${b.n} | ${b.R >= 0 ? '+' : ''}${b.R} | ${b.meanRet >= 0 ? '+' : ''}${b.meanRet}% | ${b.meanExcess == null ? '—' : (b.meanExcess >= 0 ? '+' : '') + b.meanExcess + '%'} | ${base ? (base.meanExcess == null ? '—' : (base.meanExcess >= 0 ? '+' : '') + base.meanExcess + '%') + ' on ' + base.n : '—'} |`; })] : ['(no trades)'];
  const md = [`# PEAD backtest — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days, ${Object.keys(bars.sym).length} symbols${bars.adjusted ? ', corporate actions applied' : ''}). Events: \`${path.relative(ROOT, EV)}\` built ${eventsDoc.built || '?'}, sources ${(eventsDoc.sources || []).join(' + ')}. Rule: ${JSON.stringify(S.params)}. ${MEM ? 'Universe: that day\'s NIFTY 500 members.' : '**Universe: every name with bars (membership off — survivorship-biased).**'} Hypothesis, pass mark and decision rule were written before the data existed: \`reports/pead-hypotheses-2026-11-13.md\`.`, '',
    `## Verdict: **${V.result.toUpperCase()}** — ${V.why}`, '', V.result === 'insufficient' ? 'Under 300 trades is *insufficient*, not a fail: see the coverage line below and the results-dates report for how far back NSE\'s list reaches; the board-meetings source and the page\'s CSV download are the ways to extend it.' : V.result === 'pass' ? 'Per the decision rule: "Results drift" becomes a swing setup in paper mode for one results season before any talk of orders; swingMode stays watch.' : 'Per the decision rule: PEAD is closed; the next swing hypothesis is the short-term reversal in Nifty 100 names above their 200-day average, written first.', '',
    '## Rows', '', hdr, row('**primary**: top decile, volx ≥ 2, 20-bar hold', pr), row('top decile, no volume screen', S.rows.noVolume.stats), row('bottom decile, volx ≥ 2 (direction control)', S.rows.bottom.stats), row('every event with volx ≥ 2 (base rate)', S.rows.baseRate.stats), row('desk: primary with ≤ 4 open, one per sector', S.rows.desk.stats), '',
    'Expectancy is in R (risk = entry − stop, stop = 2 × ATR(14) below the entry, floor 2%), after 30 bps round trip, so it reads like every other swing report. "Mean excess vs Nifty" is the trade\'s return minus the NIFTY 50\'s from the reaction day\'s close to the exit day\'s close. t is the mean R over its standard error. The desk row shows what four slots, one per sector, would have captured — results come in seasons, so it is a fraction of the primary row.', '',
    '## Information only (not for the verdict)', '', hdr, row('primary rule, 10-bar hold', S.rows.info.hold10), row('primary rule, 30-bar hold', S.rows.info.hold30), row('top quintile instead of decile, volx ≥ 2, 20 bars', S.rows.info.quintile), '',
    '## Primary row by year', '', ...yearTbl, '',
    '## Coverage', '', `${cov.total} events in the file; ${cov.noBars} on ${cov.symbolsNoBars.length} symbols with no bars (${cov.symbolsNoBars.slice(0, 20).join(', ')}${cov.symbolsNoBars.length > 20 ? ', …' : ''}); ${cov.outside} outside the bars or the --from/--to window; ${cov.noReaction} without the 21 bars a reaction needs; ${cov.notMember} not in the NIFTY 500 on the reaction day; **${cov.used} reactions measured**, ${S.ranked} of them with a trailing-90-day decile (the first quarter of coverage has none). Reaction-day mapping: ${cov.sameDay} same day (timestamp before 15:30), ${cov.nextDay} next trading day (at or after 15:30, weekend or holiday), ${cov.noTime} next trading day because the source had no time (board meetings). Primary-row skips: ${JSON.stringify(S.rows.primary.skipped)}; desk-row skips: ${JSON.stringify(S.rows.desk.skipped)}.`, '',
    '## Exit reasons (primary)', '', ...Object.entries(pr.byReason || {}).map(([k, v]) => `- ${k}: ${v}`), '',
    '## How to read this', '', 'Drift is the claim that the reaction-day move continues; the base-rate row is what every heavy-volume results day did on average and the primary row has to beat it, not zero. The bottom-decile row is the symmetry check: if it is as positive as the top decile, the market rose and nothing drifted. Membership is point-in-time and the history holds the past members, so there is no survivorship correction left to make; the remaining biases are the ones the hypothesis names (late-night filings reported next morning cannot be told from pre-open filings; the 2× screen is looser in recent years).'].join('\n');
  await fs.writeFile(path.join(OUT, `pead-${stamp}.md`), md);
  await fs.writeFile(path.join(OUT, `pead-${stamp}.json`), JSON.stringify({ params: S.params, verdict: V, coverage: cov, events: S.events, ranked: S.ranked, rows: Object.fromEntries(Object.entries(S.rows).filter(([k]) => k !== 'info').map(([k, v]) => [k, { stats: v.stats, skipped: v.skipped }])), info: S.rows.info, trades: S.rows.primary.trades, deskTrades: S.rows.desk.trades }, null, 1));
  console.log(md.split('\n').slice(0, 14).join('\n')); console.log(`\nfull report: reports/pead-${stamp}.md (and .json with every primary-row trade)`);
}
