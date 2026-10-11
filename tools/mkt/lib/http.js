/* fetch có retry + giới hạn tốc độ + chỗ cắm mock cho test (mock.handler). Mọi API trong bộ tool đi qua đây. */
import { warn } from './log.js';

export class HttpError extends Error {
  constructor(status, body, url) {
    super(`HTTP ${status} ${url}\n${typeof body === 'string' ? body.slice(0, 400) : JSON.stringify(body).slice(0, 400)}`);
    this.status = status; this.body = body; this.url = url;
  }
}

// test gán mock.handler = async (url, opts) => ({ status, body }) ; null = gọi mạng thật
export const mock = { handler: null, calls: [] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function withQuery(url, query) {
  if (!query) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => u.searchParams.append(k, x));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/** request(url, { method, headers, query, body (object -> JSON), form (object -> x-www-form-urlencoded), raw (Buffer/string gửi nguyên), retries, timeout }) */
export async function request(url, opts = {}) {
  const { method = 'GET', headers = {}, query, body, form, raw, retries = 3, timeout = 60000, expect = 'auto' } = opts;
  const full = withQuery(url, query);
  const h = { 'user-agent': 'sfc-mkt-tools/1.0 (+https://github.com/nghuylychee/FootballChaotic)', ...headers };
  let payload;
  if (form) { payload = new URLSearchParams(form).toString(); h['content-type'] = h['content-type'] || 'application/x-www-form-urlencoded'; }
  else if (raw !== undefined) payload = raw;
  else if (body !== undefined) { payload = JSON.stringify(body); h['content-type'] = h['content-type'] || 'application/json'; }

  if (mock.handler) {
    mock.calls.push({ url: full, method, headers: h, body: body ?? form ?? raw });
    const res = await mock.handler(full, { method, headers: h, body: body ?? form ?? raw });
    if (res.status >= 400) throw new HttpError(res.status, res.body, full);
    if (expect === 'response') return { status: res.status, headers: new Headers(res.headers || {}), body: res.body };
    return res.body;
  }

  for (let attempt = 0; ; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    let res;
    try {
      res = await fetch(full, { method, headers: h, body: payload, signal: ctl.signal });
    } catch (e) {
      clearTimeout(timer);
      if (attempt < retries) { warn(`mạng lỗi (${e.message}), thử lại ${attempt + 1}/${retries}`); await sleep(1000 * 2 ** attempt); continue; }
      throw e;
    }
    clearTimeout(timer);
    const type = res.headers.get('content-type') || '';
    let parsed;
    if (expect === 'buffer') parsed = Buffer.from(await res.arrayBuffer());
    else {
      const text = await res.text();
      parsed = type.includes('json') && text ? JSON.parse(text) : text;
    }
    if (res.ok) return expect === 'response' ? { status: res.status, headers: res.headers, body: parsed } : parsed;
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const ra = Number(res.headers.get('retry-after'));
      const wait = ra ? ra * 1000 : 1500 * 2 ** attempt;
      warn(`HTTP ${res.status}, chờ ${Math.round(wait / 1000)}s rồi thử lại`);
      await sleep(wait);
      continue;
    }
    throw new HttpError(res.status, parsed, full);
  }
}

export const getJSON = (url, query, headers) => request(url, { query, headers });
export const postJSON = (url, body, headers) => request(url, { method: 'POST', body, headers });
