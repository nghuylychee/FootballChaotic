/* Google OAuth2 kiểu "Desktop app" dùng chung cho Gmail (gửi mail), YouTube Data (upload, comment) và YouTube Analytics.
 *   node lib/google.js            -> mở trình duyệt, đăng nhập, lưu data/google-token.json
 *   node lib/google.js --scopes gmail   (chỉ xin quyền Gmail)
 * Token refresh tự động. Xóa data/google-token.json để đăng nhập lại / đổi tài khoản. */
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { need } from './env.js';
import { request } from './http.js';
import { dataFile } from './paths.js';
import { args, list, log } from './log.js';

export const SCOPES = {
  youtube: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl'],
  analytics: ['https://www.googleapis.com/auth/yt-analytics.readonly'],
  gmail: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
};
const tokenFile = () => dataFile('google-token.json');

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url.replace(/&/g, '^&')]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref(); } catch { /* in link ra là đủ */ }
}

export async function login(scopeGroups = Object.keys(SCOPES)) {
  const clientId = need('GOOGLE_CLIENT_ID', 'console.cloud.google.com > Credentials > OAuth client (Desktop app)');
  const clientSecret = need('GOOGLE_CLIENT_SECRET');
  const scopes = [...new Set(scopeGroups.flatMap((g) => SCOPES[g] || []))];
  const port = 8790 + Math.floor(Math.random() * 100);
  const redirect = `http://127.0.0.1:${port}/cb`;
  const code = await new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      if (u.pathname !== '/cb') { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<h2>Đăng nhập xong, đóng tab này được rồi.</h2>');
      srv.close();
      if (u.searchParams.get('error')) reject(new Error(u.searchParams.get('error')));
      else resolve(u.searchParams.get('code'));
    }).listen(port, '127.0.0.1', () => {
      const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', access_type: 'offline', prompt: 'consent', scope: scopes.join(' ') })}`;
      log('mở trình duyệt để đăng nhập Google. Nếu không tự mở, dán link này:\n' + url);
      openBrowser(url);
    });
  });
  const tok = await request('https://oauth2.googleapis.com/token', { method: 'POST', form: { code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' } });
  const saved = { refresh_token: tok.refresh_token, access_token: tok.access_token, expires_at: Date.now() + tok.expires_in * 1000, scopes };
  fs.writeFileSync(tokenFile(), JSON.stringify(saved, null, 2));
  log('đã lưu token vào', tokenFile());
  return saved;
}

export async function accessToken() {
  const f = tokenFile();
  if (!fs.existsSync(f)) throw new Error('chưa đăng nhập Google: chạy `node lib/google.js` trước');
  const t = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (t.expires_at - Date.now() > 60_000) return t.access_token;
  const res = await request('https://oauth2.googleapis.com/token', { method: 'POST', form: { refresh_token: t.refresh_token, client_id: need('GOOGLE_CLIENT_ID'), client_secret: need('GOOGLE_CLIENT_SECRET'), grant_type: 'refresh_token' } });
  t.access_token = res.access_token; t.expires_at = Date.now() + res.expires_in * 1000;
  fs.writeFileSync(f, JSON.stringify(t, null, 2));
  return t.access_token;
}

export const hasToken = () => fs.existsSync(tokenFile());

/** gọi API Google kèm Bearer token: gapi('https://www.googleapis.com/youtube/v3/videos', { query, method, body }) */
export async function gapi(url, opts = {}) {
  const token = await accessToken();
  return request(url, { ...opts, headers: { ...(opts.headers || {}), authorization: `Bearer ${token}` } });
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  const groups = list(a.scopes).length ? list(a.scopes) : Object.keys(SCOPES);
  login(groups).catch((e) => { console.error(e.message); process.exit(1); });
}
