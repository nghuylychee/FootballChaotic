/* Kick public API (tùy chọn). CHƯA TEST với tài khoản thật: tên tham số lấy theo tài liệu docs.kick.com (2025), có thể cần chỉnh.
 * Kick chiếm hơn nửa giờ xem tiếng Bồ / Tây Ban Nha (Q3/2026) nên đáng thử khi có app. */
import fs from 'node:fs';
import { env } from '../lib/env.js';
import { request } from '../lib/http.js';
import { dataFile } from '../lib/paths.js';

const API = 'https://api.kick.com/public/v1';
const tokenFile = () => dataFile('kick-token.json');

export const configured = () => Boolean(env('KICK_CLIENT_ID') && env('KICK_CLIENT_SECRET'));

export async function appToken() {
  const f = tokenFile();
  if (fs.existsSync(f)) {
    const t = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (t.expires_at - Date.now() > 60_000) return t.access_token;
  }
  const res = await request('https://id.kick.com/oauth/token', {
    method: 'POST',
    form: { client_id: env('KICK_CLIENT_ID'), client_secret: env('KICK_CLIENT_SECRET'), grant_type: 'client_credentials' },
  });
  fs.writeFileSync(f, JSON.stringify({ access_token: res.access_token, expires_at: Date.now() + (res.expires_in || 3600) * 1000 }));
  return res.access_token;
}

async function get(path, query) {
  const token = await appToken();
  return request(`${API}${path}`, { query, headers: { authorization: `Bearer ${token}` } });
}

export async function categories(q) {
  const res = await get('/categories', { q });
  return res.data || [];
}

// livestream đang live theo category + ngôn ngữ, sắp theo người xem
export async function livestreams({ categoryId, language, limit = 100 }) {
  const res = await get('/livestreams', { category_id: categoryId, language, limit, sort: 'viewer_count' });
  return res.data || [];
}

export const channelUrl = (slug) => `https://kick.com/${slug}`;
