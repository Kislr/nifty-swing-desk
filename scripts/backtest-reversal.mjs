#!/usr/bin/env node
/* Short-term reversal backtest — the rule in reports/reversal-hypotheses-2026-11-13.md, nothing else.
 *
 *   node scripts/backtest-reversal.mjs                   # data/history/, adjusted, that day's NIFTY 500 members
 *   node scripts/backtest-reversal.mjs --from 2019-01-01 --to 2026-12-31
 *   node scripts/backtest-reversal.mjs --no-members      # every name with bars (survivorship-biased control)
 *   node scripts/backtest-reversal.mjs --hist dir --out dir   # the test harness
 *
 * Universe on day i: that day's members ranked by 20-bar average turnover, top `liquid` (100) as the stand-in for the NIFTY 100,
 * close above the own 200-day average. Signal at i's close: 5-day return in the bottom decile of the eligible names and below zero.
 * Trade (PEAD's trade(), imported): next open + half the cost, skipped on a gap > 3% up; stop 2 × ATR(14 at i), floor 2%; exit at
 * the stop or at the close of the 5th bar. Rows: primary; top decile (continuation control); median decile (base rate); all members
 * above their 200-day (liquidity control); desk (≤ 4 open, one per sector, most negative first). Information: 3- and 10-bar holds,
 * bottom quintile. Pass mark: +0.1R over 300+ trades, mean 5-bar excess over the NIFTY 50 positive in ≥ 6 of the years with 20+
 * trades, no year > 40% of total R. Writes reports/reversal-<stamp>.md and .json. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { memberOn } from './membership.mjs';
import { trade, summarize, verdict } from './backtest-pead.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; }; const flag = k => argv.includes('--' + k);
export const RULE = { liquid: 100, turnBars: 20, trend: 200, lookback: 5, decile: 0.1, hold: 5, atrMult: 2, stopFloor: 0.02, gapSkip: 0.03, costBps: 30, maxPositions: 4, minEligible: 20 };

/** Running means over the last n bars with no gap allowed: out[i] = mean(a[i-n+1..i]) or null. */
function rolling(a, n) { const N = a.length; const out = new Array(N).fill(null); let s = 0, cnt = 0, bad = 0;
  for (let i = 0; i < N; i++) { const v = a[i]; if (v == null) bad++; else s += v; cnt++;
    if (cnt > n) { const o = a[i - n]; if (o == null) bad--; else s -= o; cnt--; }
    if (cnt === n && bad === 0) out[i] = s / n; } return out; }
/** Candidates on each day: the eligible set, each with r5; sorted by r5 ascending. Exported for the tests. */
export function candidatesOn(bars, i, P, pre, filter) {
  const rows = [];
  for (const [sym, B] of Object.entries(bars.sym)) { if (filter && !filter(sym, bars.dates[i])) continue; const c = B.c[i]; if (c == null || i < P.lookback || B.c[i - P.lookback] == null) continue;
    const sma = pre[sym].sma[i], turn = pre[sym].turn[i]; if (sma == null || turn == null || !(c > sma)) continue; rows.push({ sym, r5: c / B.c[i - P.lookback] - 1, turn }); }
  rows.sort((a, b) => b.turn - a.turn); const liquid = P.liquid ? rows.slice(0, P.liquid) : rows; liquid.sort((a, b) => a.r5 - b.r5); return liquid;
}
export function study(bars, opts) {
  const P = Object.assign({}, RULE, opts && opts.params || {}); const MEM = opts && opts.members || null; const custom = opts && opts.custom || {}; const from = opts && opts.from || '0000', to = opts && opts.to || '9999';
  const filter = MEM ? (s, d) => memberOn(MEM, s, d) : null; const N = bars.dates.length; const pos = {}; bars.dates.forEach((d, i) => (pos[d] = i));
  const pre = {}; for (const [sym, B] of Object.entries(bars.sym)) pre[sym] = { sma: rolling(B.c, P.trend), turn: rolling(B.t, P.turnBars) };
  const days = []; let firstDay = null; const coverage = { days: 0, eligibleAvg: 0, signalsAvg: 0 };
  for (let i = P.trend; i < N - 1; i++) { const d = bars.dates[i]; if (d < from || d > to) continue; const L = candidatesOn(bars, i, P, pre, filter); if (L.length < P.minEligible) continue; if (!firstDay) firstDay = d;
    const k = Math.max(1, Math.round(L.length * P.decile)); const bottom = L.slice(0, k).filter(r => r.r5 < 0), top = L.slice(-k), midStart = Math.floor(L.length / 2 - k / 2), mid = L.slice(midStart, midStart + k), quint = L.slice(0, Math.max(1, Math.round(L.length * 0.2))).filter(r => r.r5 < 0);
    days.push({ i, bottom, top, mid, quint }); coverage.days++; coverage.eligibleAvg += L.length; coverage.signalsAvg += bottom.length; }
  if (coverage.days) { coverage.eligibleAvg = +(coverage.eligibleAvg / coverage.days).toFixed(1); coverage.signalsAvg = +(coverage.signalsAvg / coverage.days).toFixed(2); } coverage.firstDay = firstDay;
  const take = (pick, hold, desk) => { const out = []; const skipped = {}; let open = [];
    for (const day of days) { const list = pick(day); if (!list.length) continue;
      if (desk) open = open.filter(o => pos[o.exitDate] > day.i);
      for (const r of list) { if (desk) { const sector = E.sectorOf(r.sym, custom); if (open.length >= P.maxPositions || open.some(o => o.sector === sector)) { skipped.full = (skipped.full || 0) + 1; continue; } }
        const t = trade(bars, bars.sym[r.sym], r.sym, day.i, P, hold); if (!t || t.skipped) { skipped[t ? t.skipped : 'none'] = (skipped[t ? t.skipped : 'none'] || 0) + 1; continue; }
        t.r5 = +(r.r5 * 100).toFixed(2); if (desk) { t.sector = E.sectorOf(r.sym, custom); open.push(t); } out.push(t); } }
    return { trades: out, skipped, stats: summarize(out) }; };
  const rows = { primary: take(d => d.bottom, P.hold, false), topDecile: take(d => d.top, P.hold, false), median: take(d => d.mid, P.hold, false), desk: take(d => d.bottom, P.hold, true),
    info: { hold3: take(d => d.bottom, 3, false).stats, hold10: take(d => d.bottom, 10, false).stats, quintile: take(d => d.quint, P.hold, false).stats } };
  return { params: P, coverage, rows, verdict: verdict(rows.primary.stats) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const HIST = arg('hist', path.join(ROOT, 'data', 'history')); const files = []; for (const f of (await fs.readdir(HIST).catch(() => [])).sort()) if (/^\d{4}\.json$/.test(f)) files.push(JSON.parse(await fs.readFile(path.join(HIST, f), 'utf8')));
  if (!files.length) { console.error('No history files. Run the backfill first.'); process.exit(2); }
  const custom = (JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'sectors.json'), 'utf8').catch(() => '{"map":{}}'))).map || {};
  const adjustments = JSON.parse(await fs.readFile(arg('adjust', path.join(ROOT, 'data', 'adjustments.json')), 'utf8').catch(() => 'null'));
  const bars = E.buildBars(files, [], { adjustments }); const N = bars.dates.length;
  let MEM = null; if (!flag('no-members')) { MEM = JSON.parse(await fs.readFile(arg('members', path.join(ROOT, 'data', 'membership', 'members.json')), 'utf8').catch(() => 'null')); if (!MEM) console.warn('no membership list; running on every name with bars'); }
  console.log(`history: ${N} days, ${Object.keys(bars.sym).length} symbols, ${bars.dates[0]} → ${bars.dates[N - 1]}${bars.adjusted ? `; corporate actions ${bars.adjusted.events} events` : ''}${MEM ? '; point-in-time NIFTY 500 membership on' : ''}`);
  const t0 = Date.now(); const S = study(bars, { members: MEM, custom, from: arg('from'), to: arg('to') }); const liq = study(bars, { members: MEM, custom, from: arg('from'), to: arg('to'), params: { liquid: 0 } }).rows.primary;   // liquidity control: all members above their 200-day
  console.log(`study ran in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const stamp = new Date().toISOString().slice(0, 10) + (bars.adjusted && bars.adjusted.events ? '-adjusted' : '') + (MEM ? '-members' : ''); const OUT = arg('out', path.join(ROOT, 'reports')); await fs.mkdir(OUT, { recursive: true });
  const f = (x, d = 2) => x == null ? '—' : Number(x).toFixed(d); const sg = (x, d = 2, suf = '') => x == null ? '—' : (x >= 0 ? '+' : '') + f(x, d) + suf;
  const row = (name, st) => st.n ? `| ${name} | ${st.n} | ${sg(st.expectancy, 3, 'R')} | ${f(st.profitFactor)} | ${Math.round(st.winRate * 100)}% | ${sg(st.meanRet, 2, '%')} | ${sg(st.meanExcess, 2, '%')} | ${f(st.tStat)} | ${f(st.drawdownR, 1)}R | ${f(st.avgBars, 1)} | ${st.positiveYears}/${st.yearsWith20} | ${st.maxYearShare == null ? '—' : Math.round(st.maxYearShare * 100) + '%'} |` : `| ${name} | 0 | | | | | | | | | | |`;
  const hdr = '| row | trades | expectancy | PF | win | mean return | mean excess vs Nifty | t | max DD | avg bars | years +excess (of ≥20) | largest year share of R |\n|---|---|---|---|---|---|---|---|---|---|---|---|';
  const pr = S.rows.primary.stats, V = S.verdict, cov = S.coverage; const yrs = Object.keys(pr.byYear || {}).sort();
  const yearTbl = yrs.length ? ['| year | trades | total R | mean return | mean excess vs Nifty | top decile (continuation) excess | median decile excess |', '|---|---|---|---|---|---|---|', ...yrs.map(y => { const b = pr.byYear[y], tp = S.rows.topDecile.stats.byYear[y], md = S.rows.median.stats.byYear[y]; return `| ${y} | ${b.n} | ${sg(b.R, 2)} | ${sg(b.meanRet, 2, '%')} | ${sg(b.meanExcess, 2, '%')} | ${tp ? sg(tp.meanExcess, 2, '%') + ' on ' + tp.n : '—'} | ${md ? sg(md.meanExcess, 2, '%') + ' on ' + md.n : '—'} |`; })] : ['(no trades)'];
  const md = [`# Short-term reversal backtest — ${stamp}`, '', `History ${bars.dates[0]} → ${bars.dates[N - 1]} (${N} days, ${Object.keys(bars.sym).length} symbols${bars.adjusted ? ', corporate actions applied' : ''}). Rule: ${JSON.stringify(S.params)}. ${MEM ? 'Universe: that day\'s NIFTY 500 members, top 100 by 20-bar turnover, close above the own 200-day average.' : '**Universe: every name with bars (membership off).**'} Hypothesis, pass mark and decision rule were written before the run: \`reports/reversal-hypotheses-2026-11-13.md\`. Mechanics (trade, stats, verdict) are the PEAD script's, so the two event studies are measured identically.`, '',
    `## Verdict: **${V.result.toUpperCase()}** — ${V.why}`, '', V.result === 'pass' ? 'Per the decision rule: reversal becomes its own small engine (reversal.js) in paper mode for one quarter — a "Reversal buy" block in the digest, a journal setup, no orders.' : V.result === 'fail' ? 'Per the decision rule: the swing queue is empty. Every entry on the list has been tested against the same +0.1R-over-300 bar on the full membership and none cleared it; swingMode stays watch, the swing setups stay on the site and in the digest as levels, and the desk is the momentum paper book beside the index fund.' : 'Under 300 trades — insufficient; widen the window before reading anything.', '',
    '## Rows', '', hdr, row('**primary**: bottom decile of 5-day return (< 0), top-100 liquid, above 200-day, 5-bar hold', pr), row('top decile of 5-day return (continuation control)', S.rows.topDecile.stats), row('median decile (base rate)', S.rows.median.stats), row('primary rule on all members above their 200-day (liquidity control)', liq.stats), row('desk: primary with ≤ 4 open, one per sector, most negative first', S.rows.desk.stats), '',
    'Expectancy is in R (risk = entry − stop, stop = 2 × ATR(14) below the entry, floor 2%), after 30 bps round trip. "Mean excess vs Nifty" is the trade\'s return minus the NIFTY 50\'s from the signal day\'s close to the exit day\'s close. The continuation row is the same universe\'s best week bought instead of its worst; reversal predicts it does worse than the primary row. The liquidity row drops the top-100 screen: reversal is known to be strongest where trading is dearest, so a big gap between that row and the primary one says the effect lives where the desk cannot trade it.', '',
    '## Information only (not for the verdict)', '', hdr, row('primary rule, 3-bar hold', S.rows.info.hold3), row('primary rule, 10-bar hold', S.rows.info.hold10), row('bottom quintile instead of decile, 5 bars', S.rows.info.quintile), '',
    '## Primary row by year', '', ...yearTbl, '',
    '## Coverage', '', `${cov.days} signal days from ${cov.firstDay} (the 200-day average needs 200 bars; the first day with ${S.params.minEligible}+ eligible names), ${cov.eligibleAvg} eligible names a day on average (members, top 100 by turnover, above their 200-day), ${cov.signalsAvg} signals a day. Primary-row skips: ${JSON.stringify(S.rows.primary.skipped)}; desk-row skips: ${JSON.stringify(S.rows.desk.skipped)}.`, '',
    '## Exit reasons (primary)', '', ...Object.entries(pr.byReason || {}).map(([k, v]) => `- ${k}: ${v}`), '',
    '## How to read this', '', 'Reversal is the claim that a liquid name\'s worst week in an uptrend is followed by a better one. The median-decile row is what an ordinary week does; the primary row has to beat it, and the continuation row should sit below both. Membership is point-in-time and the history holds the past members. The remaining caveat is liquidity itself: the top-100-by-turnover screen is a stand-in for the NIFTY 100, chosen because no membership history for that index exists in the repository.'].join('\n');
  await fs.writeFile(path.join(OUT, `reversal-${stamp}.md`), md);
  await fs.writeFile(path.join(OUT, `reversal-${stamp}.json`), JSON.stringify({ params: S.params, verdict: V, coverage: cov, rows: Object.fromEntries(Object.entries(S.rows).filter(([k]) => k !== 'info').map(([k, v]) => [k, { stats: v.stats, skipped: v.skipped }])), liquidity: { stats: liq.stats, skipped: liq.skipped }, info: S.rows.info, trades: S.rows.primary.trades, deskTrades: S.rows.desk.trades }, null, 1));
  console.log(md.split('\n').slice(0, 16).join('\n')); console.log(`\nfull report: reports/reversal-${stamp}.md (and .json with every primary-row trade)`);
}
