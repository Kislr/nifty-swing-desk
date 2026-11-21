/* NSE's host and session, shared by the scripts that call NSE's site (fetch.mjs, backfill.mjs, corporate-actions.mjs).
 *
 * Audit A17 (19 Nov 2026): from some connections www.nseindia.com now redirects to www.nseindia.in, pages and API alike, and
 * fetch drops the Cookie header when a redirect crosses hosts — so a script that keeps calling .com with the cookie it was given
 * on .in is refused (401/403). The fix is the one results-dates.mjs has carried since PR #45: make the first visit, note where it
 * ended up, and send every later call to that host. Nothing else about the calls changes.
 *
 *   const s = await nseSession('/market-data/live-equity-market');   // { origin, cookie, status, moved }
 *   fetch(s.origin + '/api/…', { headers: nseHeaders(s, { Referer: s.origin + '/…' }) })
 *
 * Only a host that is NSE's own (www.nseindia.com / www.nseindia.in, https) is ever followed; anything else keeps the default.
 * The archive host (nsearchives.nseindia.com) is a different server, takes no cookie and is not touched by this. */
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const NSE_DEFAULT = 'https://www.nseindia.com';

/** The origin a response really came from, if it is one of NSE's two site hosts over https; otherwise `fallback`. */
export function originOf(url, fallback = NSE_DEFAULT) {
  try { const u = new URL(url); return u.protocol === 'https:' && /^www\.nseindia\.(com|in)$/i.test(u.hostname) ? u.origin : fallback; } catch { return fallback; }
}
/** "a=1; Path=/", "b=2; HttpOnly" → "a=1; b=2" */
export function cookieHeader(setCookies) { return (setCookies || []).map(c => String(c).split(';')[0]).filter(Boolean).join('; '); }

/** First visit: a browser-like page load that collects NSE's cookies and tells us which host answers from this connection.
 *  `fetchImpl` is injectable for the tests. Never throws on a refused visit — the status comes back with it, so the caller's
 *  error message can say what NSE answered and where. */
export async function nseSession(pathname = '/', opts = {}) {
  const base = opts.origin || NSE_DEFAULT; const f = opts.fetch || fetch;
  const res = await f(base + pathname, { headers: Object.assign({ 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }, opts.headers || {}), redirect: 'follow' });
  const origin = originOf(res.url || base, base);
  const cookie = cookieHeader(res.headers && res.headers.getSetCookie ? res.headers.getSetCookie() : []);
  return { origin, cookie, status: res.status, moved: origin !== base };
}
/** Headers for an API call inside a session. */
export function nseHeaders(session, extra = {}) {
  return Object.assign({ 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9', 'Referer': session.origin + '/', 'Cookie': session.cookie }, extra);
}
/** One line for a log or an alert: what NSE answered and on which host — so the next refusal can be told apart
 *  (a redirect to the other host, or the runner's address being turned away). */
export function describeRefusal(status, session, finalUrl) {
  const host = h => { try { return new URL(h).hostname; } catch { return String(h || '?'); } };
  const asked = session ? host(session.origin) : host(NSE_DEFAULT); const landed = finalUrl ? host(finalUrl) : asked;
  return `HTTP ${status} from ${landed}${landed !== asked ? ` (asked ${asked})` : ''}${session && session.moved ? '; first visit was redirected there' : ''}${session && !session.cookie ? '; no cookie was set on the first visit' : ''}`;
}

/** NSE's index-history answer ({data:[{EOD_TIMESTAMP:'19-NOV-2026', EOD_OPEN_INDEX_VAL, EOD_HIGH_INDEX_VAL, EOD_LOW_INDEX_VAL, EOD_CLOSE_INDEX_VAL}]})
 *  → { 'YYYY-MM-DD': {o, h, l, c} }. Rows without a date or a positive close are dropped. Used by backfill.mjs and by the daily job's index repair. */
const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function parseIndexHistory(json) {
  const out = {}; const list = json && Array.isArray(json.data) ? json.data : (json && json.data && Array.isArray(json.data.indexCloseOnlineRecords) ? json.data.indexCloseOnlineRecords : []);
  for (const r of list) { if (!r) continue; const m = String(r.EOD_TIMESTAMP || '').match(/(\d{2})-([A-Za-z]{3})-(\d{4})/); if (!m) continue; const k = MON3.indexOf(m[2].toUpperCase()); if (k < 0) continue;
    const c = Number(r.EOD_CLOSE_INDEX_VAL); if (!(c > 0)) continue; const num = v => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
    out[`${m[3]}-${String(k + 1).padStart(2, '0')}-${m[1]}`] = { o: num(r.EOD_OPEN_INDEX_VAL), h: num(r.EOD_HIGH_INDEX_VAL), l: num(r.EOD_LOW_INDEX_VAL), c }; }
  return out;
}
