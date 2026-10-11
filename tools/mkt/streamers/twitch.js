/* Twitch Helix (app token, miễn phí): tìm kênh đang stream game X bằng ngôn ngữ Y. Tài liệu: dev.twitch.tv/docs/api/reference */
import fs from 'node:fs';
import { env, need } from '../lib/env.js';
import { request } from '../lib/http.js';
import { dataFile } from '../lib/paths.js';

const API = 'https://api.twitch.tv/helix';
const tokenFile = () => dataFile('twitch-token.json');

export async function appToken() {
  const f = tokenFile();
  if (fs.existsSync(f)) {
    const t = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (t.expires_at - Date.now() > 60_000) return t.access_token;
  }
  const res = await request('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    form: { client_id: need('TWITCH_CLIENT_ID', 'dev.twitch.tv/console'), client_secret: need('TWITCH_CLIENT_SECRET'), grant_type: 'client_credentials' },
  });
  fs.writeFileSync(f, JSON.stringify({ access_token: res.access_token, expires_at: Date.now() + res.expires_in * 1000 }));
  return res.access_token;
}

async function get(path, query) {
  const token = await appToken();
  return request(`${API}${path}`, { query, headers: { authorization: `Bearer ${token}`, 'client-id': env('TWITCH_CLIENT_ID') } });
}

// tên game -> [{id, name}] (tên phải khớp đúng tên trên Twitch, vd. "Rematch", "Rocket League", "EA SPORTS FC 26")
export async function games(names) {
  const res = await get('/games', { name: names });
  return res.data || [];
}

export async function searchCategories(q) {
  const res = await get('/search/categories', { query: q, first: 20 });
  return res.data || [];
}

// stream đang live theo game + ngôn ngữ, tối đa pages x 100
export async function streams({ gameIds, languages, pages = 3 }) {
  const out = [];
  let after;
  for (let p = 0; p < pages; p++) {
    const res = await get('/streams', { game_id: gameIds, language: languages, first: 100, after });
    out.push(...(res.data || []));
    after = res.pagination && res.pagination.cursor;
    if (!after || !(res.data || []).length) break;
  }
  return out;
}

// hồ sơ kênh (description có khi chứa email / link liên hệ), tối đa 100 id một lần
export async function users({ ids = [], logins = [] }) {
  const out = [];
  for (let i = 0; i < Math.max(ids.length, logins.length); i += 100) {
    const res = await get('/users', { id: ids.slice(i, i + 100), login: logins.slice(i, i + 100) });
    out.push(...(res.data || []));
  }
  return out;
}

export const channelUrl = (login) => `https://www.twitch.tv/${login}`;
