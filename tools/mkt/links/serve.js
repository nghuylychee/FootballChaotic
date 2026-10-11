/* Server thử cục bộ cho link router (cùng lõi với Worker) + in link.
 *   node links/serve.js                      -> http://127.0.0.1:8787/yt-ptbr-R12 thử redirect
 *   node links/serve.js --print yt-ptbr-R12 tt-ja  -> chỉ in URL đích
 * Đọc STEAM_URL / STEAM_APPID / FALLBACK_URL / LINK_DOMAIN từ .env */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../lib/env.js';
import { args, log } from '../lib/log.js';
import { resolve, NOT_FOUND_HTML } from './resolve.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const loadLinks = () => JSON.parse(fs.readFileSync(path.join(here, 'links.json'), 'utf8'));
export const linkEnv = () => ({
  STEAM_URL: env('STEAM_URL', ''), STEAM_APPID: env('STEAM_APPID', ''),
  FALLBACK_URL: env('FALLBACK_URL', 'https://team41.itch.io/sfc'), CAMPAIGN: env('CAMPAIGN', 'prelaunch'),
});

const a = args();
if (a.print !== undefined) {
  const codes = [a.print, ...a._].filter((x) => typeof x === 'string');
  for (const c of codes) {
    const r = resolve('/' + c, { links: loadLinks(), env: linkEnv() });
    console.log(c.padEnd(24), r ? r.to : '(không hợp lệ)');
  }
} else {
  const port = Number(a.port || env('LINK_PORT', 8787));
  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const r = resolve(u.pathname, { links: loadLinks(), env: linkEnv(), query: Object.fromEntries(u.searchParams) });
    if (!r) { res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); return res.end(NOT_FOUND_HTML); }
    log(`${r.code} -> ${r.to}`);
    res.writeHead(302, { location: r.to, 'cache-control': 'no-store' });
    res.end();
  }).listen(port, '127.0.0.1', () => log(`link router thử: http://127.0.0.1:${port}/yt-ptbr-R12  (Ctrl+C để dừng)`));
}
