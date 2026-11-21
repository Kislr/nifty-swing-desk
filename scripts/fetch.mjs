#!/usr/bin/env node
/* Daily job: pull the NSE market-watch table, save a snapshot into data/, recompute
 * signals, and (optionally) send a Telegram digest.
 *
 *   node scripts/fetch.mjs            # normal run
 *   node scripts/fetch.mjs --force    # save even if the snapshot date already exists with the same time
 *   node scripts/fetch.mjs --dry      # fetch + compute, print digest, write nothing
 *
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (optional) — set as GitHub Actions secrets.
 *
 * Paper book (13 Nov 2026): with config.paper = {from, capital?, benchmarks: [...]} the job also replays the momentum engine's
 * rules from `from` on the history it already has (M.paperBook), saves each benchmark index's close for the day into
 * data/benchmarks/live.json, prints a PAPER BOOK block in the digest and writes the book into latest.json for the site.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { membershipFilter } from './membership.mjs';
import { NSE_DEFAULT, nseSession as openSession, nseHeaders, originOf, describeRefusal, parseIndexHistory } from './nse.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js')); const M = require(path.join(ROOT, 'momentum.js')); 
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry'), FORCE = args.has('--force');
const DATA = path.join(ROOT, 'data'), SNAPS = path.join(DATA, 'snapshots');

// NSE's host (audit A17, 21 Nov 2026): the first visit says where NSE answers from this connection (www.nseindia.com, or www.nseindia.in
// when .com redirects there) and every API call goes to that host — a call sent to .com with a cookie issued on .in is refused, because
// fetch drops the Cookie header when a redirect crosses hosts. scripts/nse.mjs holds the logic; results-dates.mjs has done this since PR #45.
let ORIGIN = NSE_DEFAULT; let LAST_NSE = null;   // LAST_NSE: what NSE last answered and where, for the failure message
const PAGE = '/market-data/live-equity-market';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function nseSession() {
  // NSE sits behind a bot-filter that wants a browser-like first visit; keep the cookies it sets and note the host that answered.
  const s = await openSession(PAGE, { origin: ORIGIN });
  if (s.origin !== ORIGIN) { console.log(`NSE answered on ${s.origin}; the API calls go there`); ORIGIN = s.origin; }
  return s;
}
/** One API call inside a fresh session. Throws with the status and the host that answered, so a refusal can be read from the log. */
async function nseApi(pathAndQuery) {
  const s = await nseSession(); await sleep(800);
  const res = await fetch(s.origin + pathAndQuery, { headers: nseHeaders(s, { Referer: s.origin + PAGE }) });
  const landed = originOf(res.url || s.origin, s.origin); if (landed !== ORIGIN) { console.log(`NSE's API answered on ${landed}; the next call starts there`); ORIGIN = landed; }
  const text = await res.text();
  if (!res.ok) { LAST_NSE = describeRefusal(res.status, s, res.url); throw new Error(LAST_NSE); }
  return text;
}
async function fetchIndex(indexName, attempts = 4) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const text = await nseApi(`/api/NextApi/apiClient/marketWatchApi?functionName=getIndicesData&symbol=${encodeURIComponent(indexName)}`);
      if (!text.trim().startsWith('{')) throw new Error(`non-JSON body from ${ORIGIN.replace('https://', '')} (bot filter?)`);
      const json = JSON.parse(text);
      const rows = E.rowsFromNseApi(json);
      if (rows.filter(r => !r.isIndex).length < 10) throw new Error(`only ${rows.length} rows parsed`);
      const meta = json && json.data && !Array.isArray(json.data) ? json.data : {};
      if (meta.marketStatus) console.log(`market: ${meta.marketStatus.marketStatusMessage || meta.marketStatus.marketStatus} · ${meta.timestamp || ''}`);
      return rows;
    } catch (e) { lastErr = e; console.warn(`attempt ${attempt} failed: ${e.message}`); await sleep(2500 * attempt); }
  }
  throw lastErr;
}
/** NIFTY 50 bars for a range of dates from NSE's index history — the source the October 2026 holes were filled from by hand. Used by the
 *  index repair below, best effort: at most four calls of 90 days, and a refusal is the caller's warning, not a failed job. */
async function fetchIndexHistory(fromISO, toISO) {
  const dmy = d => d.split('-').reverse().join('-'); const iso = d => d.toISOString().slice(0, 10); const out = {};
  let a = new Date(fromISO + 'T00:00:00Z'); const end = new Date(toISO + 'T00:00:00Z'); let calls = 0;
  while (a <= end && calls++ < 4) { const b = new Date(Math.min(end.getTime(), a.getTime() + 89 * 86400000));
    Object.assign(out, parseIndexHistory(JSON.parse(await nseApi(`/api/historicalOR/indicesHistory?indexType=${encodeURIComponent('NIFTY 50')}&from=${dmy(iso(a))}&to=${dmy(iso(b))}`))));
    a = new Date(b.getTime() + 86400000); }
  return out;
}
function stampOf(rows) {
  // "2026-10-16 15:30:00" → {date:'2026-10-16', time:'15:30'}; fall back to IST now.
  const lu = rows.map(r => r.lastUpdate).filter(Boolean).sort().pop();
  const m = lu && String(lu).match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (m) return { date: m[1], time: m[2] };
  const d = new Date(Date.now() + 330 * 60000); return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}
async function readJSON(p, fallback) { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; } }
async function loadHistory(limit) {
  const idx = await readJSON(path.join(DATA, 'index.json'), { dates: [] });
  const dates = idx.dates.slice(-limit);
  const snaps = []; for (const d of dates) { const s = await readJSON(path.join(SNAPS, d + '.json'), null); if (s) snaps.push(s); }
  return snaps;
}
const HISTDIR = path.join(DATA, 'history');
async function loadHistoryFiles(year, fromYear) { // this year and the previous one: enough for 52-week levels and all indicators; back to the year before the paper book started, so the book can be replayed from its first day
  const first = Math.min(year - 1, fromYear ? fromYear - 1 : year - 1); const out = []; for (let y = first; y <= year; y++) { const f = await readJSON(path.join(HISTDIR, y + '.json'), null); if (f) out.push(f); } return out;
}
const PAPER = config.paper || null; const LIVE_BM = path.join(DATA, 'benchmarks', 'live.json');   // paper book (13 Nov 2026): {from, capital?, benchmarks: [index names]}; the job saves those indices' closes here, one series per index
/** NSE's index list (display name → the short code the market-watch call takes). Best effort: E.indexCode falls back to the codes it carries. */
async function fetchIndexList() {
  try { const text = await nseApi('/api/NextApi/apiClient/marketWatchApi?functionName=getIndexList'); if (!text.trim().startsWith('{')) throw new Error('non-JSON body'); return JSON.parse(text); }
  catch (e) { console.warn(`index list unavailable (${e.message}); using the built-in index codes`); return null; }
}
/** Today's close (and the previous close) of each benchmark index — price index, from the same market-watch call the universe comes from.
 *  The call wants NSE's short code (NIFTY500MOMENTM50), not the display name in config.json: with the display name it answers {"data":{}},
 *  which is why no close was saved from 13 to 17 Nov 2026 (found 18 Nov). Never fatal: a missing day is a gap in the comparison, not a failed job. */
async function fetchBenchmarks(names, date) {
  const out = {}; const wanted = names.filter(n => n !== 'NIFTY 50'); if (!wanted.length) return out;   // NIFTY 50 is already the history's index series
  const list = await fetchIndexList();
  for (const name of wanted) { const code = E.indexCode(name, list);
    try { const bm = E.benchmarkClose(await fetchIndex(code, 2), name); if (bm) { out[name] = bm; console.log(`benchmark ${name} (${code}): ${bm.close}`); } else console.warn(`benchmark ${name} (${code}): index row not found; no close saved for ${date}`); }
    catch (e) { console.warn(`benchmark ${name} (${code}): fetch failed (${e.message}); no close saved for ${date}`); } }
  return out;
}
/** Telegram caps a message at 4,096 characters; the digest passed that on 13 Nov 2026 when the paper book joined it, so a long
 *  digest now goes as consecutive messages split at blank lines (E.chunks; a block is never cut in half unless it is itself over the cap). */
async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.log('(telegram not configured)'); return; }
  const send = async body => { const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: body, disable_web_page_preview: true }) });
    if (!res.ok) console.warn('telegram failed', res.status, await res.text()); return res.ok; };
  // One message whenever the text fits Telegram's cap (18 Nov 2026); if Telegram refuses it anyway, or it is longer, split at blank lines — 4,000 leaves room for the "(1/2) " prefix.
  if (text.length <= E.TELEGRAM_MAX && await send(text)) return;
  const parts = E.chunks(text, 4000);
  for (let k = 0; k < parts.length; k++) if (!await send((parts.length > 1 ? `(${k + 1}/${parts.length}) ` : '') + parts[k])) break;
}

try {
  // Nothing new to fetch (21 Nov 2026): once the snapshot on file is the last session's, with its closing stamp, NSE is not called at all.
  // The slot ladder runs about a dozen more slots after the one that sends the digest; each used to make four calls to learn "snapshot
  // unchanged", and on 19 and 20 Nov one a night was refused (HTTP 403) and failed the run. --force and --dry always fetch.
  if (!DRY && !FORCE) { const idx0 = await readJSON(path.join(DATA, 'index.json'), null); const latest0 = idx0 && idx0.latest ? { date: idx0.latest, time: idx0.latestTime } : null;
    if (E.sessionDone(latest0)) { console.log(`snapshot ${latest0.date} ${latest0.time} is the latest NSE can have published — nothing to fetch, NSE not called`); process.exit(0); } }
  const rows = await fetchIndex(config.index || 'NIFTY 500');
  const { date, time } = stampOf(rows);
  // The history files carry NIFTY 50 as the benchmark (see backfill.mjs). When the universe is a different index its
  // market-watch payload only includes that index's row, so fetch the NIFTY 50 row separately and use it as doc.index;
  // the universe's own index row is kept as doc.universeIndex for display.
  if ((config.index || 'NIFTY 500') !== 'NIFTY 50') {
    try { const n50 = (await fetchIndex('NIFTY 50')).filter(r => r.isIndex && /^NIFTY 50$/.test(r.sym)); if (n50.length) rows.push(n50[0]); else console.warn('NIFTY 50 row not found; index bar will not be appended to history'); }
    catch (e) { console.warn('NIFTY 50 fetch failed (' + e.message + '); index bar will not be appended to history'); }
  }
  const doc = E.toSnapshotDoc(rows, date, time, 'nse-api');
  console.log(`fetched ${doc.count} stocks for ${date} ${time} (${config.index})`);

  const existing = await readJSON(path.join(SNAPS, date + '.json'), null);
  if (existing && existing.time === time && !FORCE) { console.log('snapshot unchanged (market closed today?) — nothing to do'); process.exit(0); }

  const hist = (await loadHistory(config.historyDays || 90)).filter(s => s.date !== date);
  const snaps = [...hist, doc].sort((a, b) => a.date.localeCompare(b.date));
  const custom = (await readJSON(path.join(DATA, 'sectors.json'), { map: {} })).map || {};
  const year = Number(date.slice(0, 4)); const histFiles = await loadHistoryFiles(year, PAPER && PAPER.from ? Number(String(PAPER.from).slice(0, 4)) : null);
  let adjustments = await readJSON(path.join(DATA, 'adjustments.json'), null);   // corporate actions, optional (scripts/corporate-actions.mjs)
  // Data notices (19 Nov 2026, audit A7 / A18), before anything is computed: a bonus or split that went ex today and is not in the table yet is
  // read off NSE's own row and applied now, provisionally — otherwise the bars show a fall of a third or more and the paper book sells on it;
  // and a day on which most previous closes disagree with NSE's means the history is missing a session.
  const pre = E.buildBars(histFiles, snaps, { adjustments }); const iL = pre.dates.length - 1; const pend = E.pendingAdjustments(pre, iL), gap = E.sessionGap(pre, iL); const applyPend = pend.length > 0 && pend.length <= 5;
  if (applyPend) { if (!adjustments) adjustments = { asOf: date, source: 'daily job (provisional entries only; run scripts/corporate-actions.mjs)', symbols: {} }; const table = adjustments.symbols || adjustments;
    for (const p of pend) { (table[p.sym] = table[p.sym] || []).push(E.provisionalEvent(p)); console.log(`corporate action: ${p.sym} ÷${p.factor} before ${p.exDate} (NSE change ${p.pct}%, bars ${((p.close / p.yclose - 1) * 100).toFixed(1)}%) — provisional entry added to data/adjustments.json`); } }
  else if (pend.length) console.warn(`corporate actions: ${pend.length} names look adjusted today (${pend.map(p => p.sym).join(', ')}) — too many to apply unseen; nothing written`);
  if (gap && gap.missing) console.warn(`history gap: ${gap.off} of ${gap.n} previous closes differ from NSE's — a session between ${gap.prevDate} and ${gap.date} is missing`);
  // Index repair (audit A8, 21 Nov 2026), before anything is computed: a day saved without its NIFTY 50 bar (the second fetch failed that
  // evening) is filled here, so a hole lasts until the next run instead of for good. Yesterday's close comes with today's own NIFTY 50 row
  // (its previous close — no extra call, and not used when the history is missing a session); older holes are asked of NSE's index history.
  // Whatever stays missing is named in the digest, and the gate's average steps over up to five missing closes meanwhile (momentum.js).
  const repairs = []; { const holes = E.indexHoles(pre, iL).filter(d => d !== date);
    if (holes.length) { const fills = {}; const prevDate = pre.dates[iL - 1]; const n50 = rows.find(r => r.isIndex && /^NIFTY 50$/.test(r.sym));
      if (holes.includes(prevDate) && n50 && n50.prev > 0 && !(gap && gap.missing)) fills[prevDate] = { c: n50.prev, source: "from today's previous close" };
      const older = holes.filter(d => !fills[d]);
      if (older.length) { try { const got = await fetchIndexHistory(older[0], older[older.length - 1]); for (const d of holes) if (got[d]) fills[d] = Object.assign({ source: "from NSE's index history" }, got[d]); }
        catch (e) { console.warn(`index repair: NSE's index history did not answer (${e.message}); ${older.length} NIFTY 50 close(s) still missing: ${older.slice(0, 6).join(', ')}`); } }
      for (const d of Object.keys(fills).sort()) { const f = fills[d]; const file = histFiles.find(h => h.dates && h.dates.includes(d)); if (!file) continue;
        const snap = { date: d, rows: {}, index: { name: 'NIFTY 50', open: f.o ?? null, high: f.h ?? null, low: f.l ?? null, ltp: f.c } };
        E.appendSnapshotToHistory(file, snap); repairs.push({ date: d, source: f.source, snap }); console.log(`index repair: NIFTY 50 ${d} = ${f.c} (${f.source})`); } } }
  const result = E.analyzeLatest(histFiles, snaps, config.risk, custom, adjustments);
  const mom = M.selectAt(result.bars, result.bars.dates.length - 1, config.momentum || {}, custom);
  const notices = E.noticesDigest(pend, gap, pend.length ? applyPend : undefined, { repaired: repairs, missing: E.indexHoles(result.bars, result.bars.dates.length - 1), gate: mom.gate });
  E.tagMomentum(result.signals, mom.ranked, (config.momentum && config.momentum.holdRank) || M.DEFAULTS.holdRank);   // momentum pullbacks first, tagged for the digest and latest.json
  // Paper book: the engine's rules replayed from PAPER.from on the same bars, beside the index funds (price indices saved day by day in data/benchmarks/live.json).
  let paper = null, live = null, todayBm = {};
  if (PAPER && PAPER.from) {
    live = await readJSON(LIVE_BM, {}); const got = await fetchBenchmarks(PAPER.benchmarks || [], date);
    // The call also carries the previous close: if the last trading day's close is missing (a failed fetch that day), fill it — a one-day gap heals itself.
    const prevDate = result.bars.dates.filter(d => d < date).pop();
    for (const [name, bm] of Object.entries(got)) { todayBm[name] = { [date]: bm.close }; if (prevDate && bm.prev && !(live[name] && live[name][prevDate] != null)) { todayBm[name][prevDate] = bm.prev; console.log(`benchmark ${name}: filled ${prevDate} from the previous close (${bm.prev})`); } }
    const merged = JSON.parse(JSON.stringify(live)); for (const [name, days] of Object.entries(todayBm)) Object.assign(merged[name] = merged[name] || {}, days);
    for (const name of PAPER.benchmarks || []) if (name !== 'NIFTY 50' && !merged[name]) merged[name] = {};
    const MEMB = await readJSON(path.join(DATA, 'membership', 'members.json'), null);   // point-in-time NIFTY 500 membership (audit A6): the book ranks what the backtest ranks
    paper = M.paperBook(result.bars, config.momentum || {}, custom, { from: PAPER.from, capital: PAPER.capital || config.risk.capital, benchmarks: merged, filter: MEMB ? membershipFilter(MEMB) : null, membersAsOf: MEMB ? MEMB.asOf : null });
    if (!paper) console.log(`paper book starts ${PAPER.from}; no bar on or after that date yet`);
  }
  // One Telegram message whenever possible: the watch-only lists give way first (E.DIGEST_CAPS); momentum, the paper book, the pullbacks and the reminders never do.
  // Open positions pasted into config.json get one rule line each (E.positionLine); a hand-bought momentum name is read against today's ranking.
  const rankOf = Object.fromEntries(mom.ranked.map(r => [r.sym, r.rank])); const positions = E.positionsDigest(config.positions, result.bars, { rank: rankOf, holdRank: (config.momentum && config.momentum.holdRank) || M.DEFAULTS.holdRank });
  const fit = E.digestFit(result, config.risk, { momentum: M.digest(mom, E.fmt), paper: M.paperDigest(paper, E.fmt), positions, notices, reminders: E.remindersDue(config.reminders, date) }); const text = fit.text;
  console.log('\n' + text + '\n'); console.log(`digest: ${text.length} characters, ${fit.fits ? 'one message' + (fit.level ? ` (lists trimmed to level ${fit.level})` : '') : 'over the cap — sent in parts'}`);

  if (DRY) process.exit(0);
  await fs.mkdir(SNAPS, { recursive: true });
  await fs.writeFile(path.join(SNAPS, date + '.json'), JSON.stringify(doc));
  // append today's bar to the history file so indicators keep working without re-reading every snapshot; repaired index bars go into the
  // files they belong to, read fresh from disk (a hole can sit in last year's file), whether or not today's bar is appended
  await fs.mkdir(HISTDIR, { recursive: true });
  const yfs = {}; const yearFile = async y => yfs[y] || (yfs[y] = (await readJSON(path.join(HISTDIR, y + '.json'), null)) || { year: Number(y), dates: [], symbols: {}, index: null });
  for (const r of repairs) { const yf = await yearFile(r.date.slice(0, 4)); if (yf.dates.includes(r.date)) E.appendSnapshotToHistory(yf, r.snap); }
  if (!result.reg.intraday || config.alertIntraday) E.appendSnapshotToHistory(await yearFile(String(year)), doc);
  for (const yf of Object.values(yfs)) await fs.writeFile(path.join(HISTDIR, yf.year + '.json'), JSON.stringify(yf));
  if (!result.reg.intraday || config.alertIntraday) {
    if (applyPend) await fs.writeFile(path.join(DATA, 'adjustments.json'), JSON.stringify(adjustments, null, 1));   // the provisional corporate-action entries, saved with the bar they belong to
    if (live && Object.keys(todayBm).length) { for (const [name, days] of Object.entries(todayBm)) { const merged = Object.assign(live[name] || {}, days); live[name] = Object.fromEntries(Object.keys(merged).sort().map(d => [d, merged[d]])); } await fs.mkdir(path.dirname(LIVE_BM), { recursive: true }); await fs.writeFile(LIVE_BM, JSON.stringify(live, null, 1)); }
  }
  const idx = await readJSON(path.join(DATA, 'index.json'), { dates: [] });
  const dates = [...new Set([...idx.dates, date])].sort();
  const keep = config.keepDays || 400; const pruned = dates.slice(-keep);
  for (const old of dates.filter(d => !pruned.includes(d))) await fs.rm(path.join(SNAPS, old + '.json'), { force: true });
  const historyYears = (await fs.readdir(HISTDIR).catch(() => [])).filter(f => /^\d{4}\.json$/.test(f)).map(f => Number(f.slice(0, 4))).sort();
  await fs.writeFile(path.join(DATA, 'index.json'), JSON.stringify({ dates: pruned, latest: date, latestTime: time, index: config.index, historyYears, generatedAt: new Date().toISOString() }, null, 1));
  const strip = s => ({ sym: s.sym, sector: s.sector, kind: s.kind, setup: s.setup, tag: s.tag || null, momRank: s.momRank ?? null, score: s.score, entry: s.entry ?? null, stop: s.stop ?? null, target: s.target ?? null, qty: s.size ? s.size.qty : null, trigger: s.trigger || null, ltp: s.row.ltp, pct: s.row.pct, d30: s.row.d30, reasons: s.reasons });
  const momOut = { date: mom.date, gate: mom.gate, params: mom.params, picks: mom.picks.map(r => ({ rank: r.rank, sym: r.sym, sector: r.sector, ltp: r.ltp, ret: r.ret, ret1: r.ret1, ret6: r.ret6, ret12: r.ret12, offHigh: r.offHigh })) };
  await fs.writeFile(path.join(DATA, 'latest.json'), JSON.stringify({ date, time, regime: { ...result.reg }, leaders: [...result.board.leaders], laggards: [...result.board.laggards], signals: result.signals.map(strip), momentum: momOut, paper, digest: text }, null, 1));
  console.log(`wrote data/snapshots/${date}.json, data/index.json, data/latest.json`);
  const intraday = result.reg.intraday;
  if (!intraday || config.alertIntraday || FORCE) await telegram(text);
} catch (e) {
  console.error('FETCH FAILED:', e.message); if (LAST_NSE && !String(e.message).includes(LAST_NSE)) console.error('last answer from NSE:', LAST_NSE);
  // The alert says what failed, what is already on file and what happens next (21 Nov 2026) — the old one said "run it from your own
  // machine" on two nights when the digest had already gone out and nothing was missing.
  const idxF = await readJSON(path.join(DATA, 'index.json'), null); const env = process.env;
  await telegram(E.failureNotice({ what: e.message, nowMs: Date.now(), latest: idxF && idxF.latest ? { date: idxF.latest, time: idxF.latestTime } : null, scheduled: env.GITHUB_EVENT_NAME === 'schedule',
    runUrl: env.GITHUB_RUN_ID && env.GITHUB_REPOSITORY ? `${env.GITHUB_SERVER_URL || 'https://github.com'}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : null }));
  process.exit(1);
}
