#!/usr/bin/env node
/* Daily job: pull the NSE market-watch table, save a snapshot into data/, recompute
 * signals, and (optionally) send a Telegram digest.
 *
 *   node scripts/fetch.mjs            # normal run
 *   node scripts/fetch.mjs --force    # save even if the snapshot date already exists with the same time
 *   node scripts/fetch.mjs --dry      # fetch + compute, print digest, write nothing
 *
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (optional) — set as GitHub Actions secrets.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require(path.join(ROOT, 'engine.js'));
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry'), FORCE = args.has('--force');
const DATA = path.join(ROOT, 'data'), SNAPS = path.join(DATA, 'snapshots');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE = 'https://www.nseindia.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function nseSession() {
  // NSE sits behind a bot-filter that wants a browser-like first visit; keep the cookies it sets.
  const res = await fetch(BASE + '/market-data/live-equity-market', { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow' });
  const cookies = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
  return cookies;
}
async function fetchIndex(indexName) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const cookie = await nseSession();
      await sleep(800);
      const url = `${BASE}/api/NextApi/apiClient/marketWatchApi?functionName=getIndicesData&symbol=${encodeURIComponent(indexName)}`;
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9', 'Referer': BASE + '/market-data/live-equity-market', 'Cookie': cookie } });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!text.trim().startsWith('{')) throw new Error('non-JSON body (bot filter?)');
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
async function loadHistoryFiles(year) { // this year and the previous one: enough for 52-week levels and all indicators
  const out = []; for (const y of [year - 1, year]) { const f = await readJSON(path.join(HISTDIR, y + '.json'), null); if (f) out.push(f); } return out;
}
async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.log('(telegram not configured)'); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }) });
  if (!res.ok) console.warn('telegram failed', res.status, await res.text());
}

try {
  const rows = await fetchIndex(config.index || 'NIFTY 500');
  const { date, time } = stampOf(rows);
  const doc = E.toSnapshotDoc(rows, date, time, 'nse-api');
  console.log(`fetched ${doc.count} stocks for ${date} ${time} (${config.index})`);

  const existing = await readJSON(path.join(SNAPS, date + '.json'), null);
  if (existing && existing.time === time && !FORCE) { console.log('snapshot unchanged (market closed today?) — nothing to do'); process.exit(0); }

  const hist = (await loadHistory(config.historyDays || 90)).filter(s => s.date !== date);
  const snaps = [...hist, doc].sort((a, b) => a.date.localeCompare(b.date));
  const custom = (await readJSON(path.join(DATA, 'sectors.json'), { map: {} })).map || {};
  const year = Number(date.slice(0, 4)); const histFiles = await loadHistoryFiles(year);
  const result = E.analyzeLatest(histFiles, snaps, config.risk, custom);
  const text = E.digest(result, config.risk);
  console.log('\n' + text + '\n');

  if (DRY) process.exit(0);
  await fs.mkdir(SNAPS, { recursive: true });
  await fs.writeFile(path.join(SNAPS, date + '.json'), JSON.stringify(doc));
  // append today's bar to the history file so indicators keep working without re-reading every snapshot
  if (!result.reg.intraday || config.alertIntraday) {
    await fs.mkdir(HISTDIR, { recursive: true });
    const yf = (await readJSON(path.join(HISTDIR, year + '.json'), null)) || { year, dates: [], symbols: {}, index: null };
    E.appendSnapshotToHistory(yf, doc); await fs.writeFile(path.join(HISTDIR, year + '.json'), JSON.stringify(yf));
  }
  const idx = await readJSON(path.join(DATA, 'index.json'), { dates: [] });
  const dates = [...new Set([...idx.dates, date])].sort();
  const keep = config.keepDays || 400; const pruned = dates.slice(-keep);
  for (const old of dates.filter(d => !pruned.includes(d))) await fs.rm(path.join(SNAPS, old + '.json'), { force: true });
  const historyYears = (await fs.readdir(HISTDIR).catch(() => [])).filter(f => /^\d{4}\.json$/.test(f)).map(f => Number(f.slice(0, 4))).sort();
  await fs.writeFile(path.join(DATA, 'index.json'), JSON.stringify({ dates: pruned, latest: date, latestTime: time, index: config.index, historyYears, generatedAt: new Date().toISOString() }, null, 1));
  const strip = s => ({ sym: s.sym, sector: s.sector, kind: s.kind, setup: s.setup, score: s.score, entry: s.entry ?? null, stop: s.stop ?? null, target: s.target ?? null, qty: s.size ? s.size.qty : null, trigger: s.trigger || null, ltp: s.row.ltp, pct: s.row.pct, d30: s.row.d30, reasons: s.reasons });
  await fs.writeFile(path.join(DATA, 'latest.json'), JSON.stringify({ date, time, regime: { ...result.reg }, leaders: [...result.board.leaders], laggards: [...result.board.laggards], signals: result.signals.map(strip), digest: text }, null, 1));
  console.log(`wrote data/snapshots/${date}.json, data/index.json, data/latest.json`);
  const intraday = result.reg.intraday;
  if (!intraday || config.alertIntraday || FORCE) await telegram(text);
} catch (e) {
  console.error('FETCH FAILED:', e.message);
  await telegram(`Nifty Swing Desk: today's NSE fetch failed (${e.message}). NSE may be blocking the runner — run "npm run fetch" from your own machine, or upload the CSV on the site.`);
  process.exit(1);
}
