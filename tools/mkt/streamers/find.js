/* Tool 6: tìm streamer / YouTuber nhỏ đúng ngách theo ngôn ngữ, gom vào data/streamers.jsonl (chạy lại nhiều lần, tự gộp).
 *   node streamers/find.js --twitch --lang pt,es --games "Rematch,Rocket League,EA SPORTS FC 26" --pages 3
 *   node streamers/find.js --youtube --lang pt --days 60 --max-searches 20        (mỗi search = 100 đơn vị quota)
 *   node streamers/find.js --youtube --seed data/seed-youtube.txt                 (danh sách URL / @handle, 1 đơn vị mỗi kênh)
 *   node streamers/find.js --kick --lang pt --games Rematch                        (chưa test, cần app Kick)
 * Chạy Twitch mỗi giờ vài ngày (cron) để bắt được kênh nhỏ không live cùng lúc. Xuất CSV: streamers/export.js */
import '../lib/env.js';
import fs from 'node:fs';
import { args, list, log, warn, fail } from '../lib/log.js';
import { readJsonl, upsertJsonl } from '../lib/jsonl.js';
import { dataFile } from '../lib/paths.js';
import * as tw from './twitch.js';
import * as yt from './youtube.js';
import * as kick from './kick.js';
import { extractContacts, score } from './score.js';

export const STORE = () => dataFile('streamers.jsonl');
const nowIso = () => new Date().toISOString();

function mergeRows(oldRow, newRow) {
  const samples = [...(oldRow.samples || []), ...(newRow.samples || [])].slice(-60);
  const games = [...new Set([...(oldRow.games || []), ...(newRow.games || [])])];
  const merged = { ...oldRow, ...newRow, samples, games, firstSeen: oldRow.firstSeen || newRow.firstSeen };
  if (samples.length) {
    merged.avgViewers = Math.round(samples.reduce((a, s) => a + s.v, 0) / samples.length);
    merged.maxViewers = Math.max(...samples.map((s) => s.v));
  }
  // không ghi đè ghi chú tay của team
  for (const k of ['personal_line', 'notes', 'status', 'skip']) if (oldRow[k] !== undefined) merged[k] = oldRow[k];
  const sc = score(merged);
  return { ...merged, score: sc.score, tier: sc.tier, why: sc.why };
}

export function save(rows) {
  const stamped = rows.map((r) => {
    const sc = score(r);
    return { ...r, score: sc.score, tier: sc.tier, why: sc.why, firstSeen: r.firstSeen || nowIso(), lastSeen: nowIso() };
  });
  return upsertJsonl(STORE(), stamped, (r) => r.key, mergeRows);
}

/* ---------------- Twitch ---------------- */
export async function findTwitch({ langs, gameNames, pages }) {
  const found = await tw.games(gameNames);
  const missing = gameNames.filter((n) => !found.some((g) => g.name.toLowerCase() === n.toLowerCase()));
  if (missing.length) warn(`Twitch không có game tên đúng: ${missing.join(', ')} (thử: node -e "..." tw.searchCategories)`);
  if (!found.length) return [];
  const live = await tw.streams({ gameIds: found.map((g) => g.id), languages: langs, pages });
  log(`Twitch: ${live.length} stream đang live (${found.map((g) => g.name).join(', ')} · ${langs.join(',')})`);
  const profiles = await tw.users({ ids: live.map((s) => s.user_id) });
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const t = nowIso();
  return live.map((s) => {
    const p = byId.get(s.user_id) || {};
    const c = extractContacts(p.description || '');
    return {
      key: `twitch:${s.user_id}`, platform: 'twitch', id: s.user_id, handle: s.user_login, name: s.user_name,
      url: tw.channelUrl(s.user_login), lang: s.language, country: null,
      games: [s.game_name], samples: [{ t, v: s.viewer_count, game: s.game_name }], lastActive: s.started_at,
      title: s.title, desc: (p.description || '').slice(0, 500), email: c.email, contacts: c.links, createdAt: p.created_at,
    };
  });
}

/* ---------------- YouTube ---------------- */
export async function findYouTube({ langs, days, maxSearches, queries }) {
  const publishedAfter = new Date(Date.now() - days * 86400000).toISOString();
  const seen = new Map(); // channelId -> { lastActive, titles }
  let searches = 0;
  for (const lang of langs) {
    const qs = queries && queries.length ? queries : (yt.DEFAULT_QUERIES[lang] || yt.DEFAULT_QUERIES.en);
    for (const q of qs) {
      if (searches >= maxSearches) break;
      searches++;
      const { items } = await yt.searchVideos({ q, regionCode: yt.REGION_OF[lang], relevanceLanguage: lang === 'ptpt' ? 'pt' : lang, publishedAfter, maxResults: 50 });
      for (const it of items) {
        const cur = seen.get(it.channelId) || { lastActive: null, titles: [], lang };
        if (!cur.lastActive || it.publishedAt > cur.lastActive) cur.lastActive = it.publishedAt;
        if (cur.titles.length < 3) cur.titles.push(it.title);
        seen.set(it.channelId, cur);
      }
      log(`YouTube "${q}" [${lang}] -> ${items.length} video, ${seen.size} kênh (quota ~${yt.quota.used})`);
    }
  }
  const ids = [...seen.keys()];
  const chans = await yt.channels(ids);
  return chans.map((ch) => {
    const meta = seen.get(ch.id);
    const c = extractContacts(`${ch.desc}\n${ch.keywords}`);
    return {
      key: `youtube:${ch.id}`, platform: 'youtube', id: ch.id, handle: ch.handle, name: ch.name, url: ch.url,
      lang: meta.lang, country: ch.country, subs: ch.subs, videos: ch.videos, views: ch.views,
      games: guessGames(meta.titles.join(' ')), lastActive: meta.lastActive, sampleTitles: meta.titles,
      desc: ch.desc.slice(0, 500), email: c.email, contacts: c.links, createdAt: ch.createdAt, uploads: ch.uploads,
    };
  });
}

export async function enrichYouTubeSeed(file, lang) {
  if (!fs.existsSync(file)) fail(`không thấy file seed ${file}`);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const rows = [];
  for (const line of lines) {
    const ch = await yt.channelByHandle(line).catch((e) => { warn(`${line}: ${e.message.split('\n')[0]}`); return null; });
    if (!ch) continue;
    const last = await yt.lastUpload(ch.uploads);
    const c = extractContacts(`${ch.desc}\n${ch.keywords}`);
    rows.push({ key: `youtube:${ch.id}`, platform: 'youtube', id: ch.id, handle: ch.handle, name: ch.name, url: ch.url, lang, country: ch.country,
      subs: ch.subs, videos: ch.videos, views: ch.views, games: [], lastActive: last, desc: ch.desc.slice(0, 500), email: c.email, contacts: c.links, createdAt: ch.createdAt, uploads: ch.uploads, seed: true });
  }
  return rows;
}

function guessGames(text) {
  const g = [];
  if (/rematch/i.test(text)) g.push('Rematch');
  if (/rocket league/i.test(text)) g.push('Rocket League');
  if (/\bfc ?2[4-7]\b|ea fc|fifa/i.test(text)) g.push('EA FC');
  if (/efootball|pes\b/i.test(text)) g.push('eFootball');
  if (/futebol|fútbol|futbol|football|soccer|サッカー/i.test(text)) g.push('football');
  if (/indie|インディー/i.test(text)) g.push('indie');
  return g;
}

/* ---------------- Kick (chưa test) ---------------- */
export async function findKick({ langs, gameNames }) {
  if (!kick.configured()) { warn('Kick: thiếu KICK_CLIENT_ID / SECRET, bỏ qua'); return []; }
  const rows = [];
  const t = nowIso();
  for (const name of gameNames) {
    const cats = await kick.categories(name);
    const cat = cats.find((c) => (c.name || '').toLowerCase() === name.toLowerCase()) || cats[0];
    if (!cat) { warn(`Kick: không thấy category ${name}`); continue; }
    for (const lang of langs) {
      const live = await kick.livestreams({ categoryId: cat.id, language: lang });
      for (const s of live) {
        const slug = s.slug || (s.channel && s.channel.slug) || String(s.broadcaster_user_id);
        rows.push({ key: `kick:${s.broadcaster_user_id || slug}`, platform: 'kick', id: String(s.broadcaster_user_id || slug), handle: slug,
          name: (s.channel && s.channel.user && s.channel.user.username) || slug, url: kick.channelUrl(slug), lang, games: [cat.name],
          samples: [{ t, v: Number(s.viewer_count || 0), game: cat.name }], lastActive: s.started_at || t, title: s.stream_title || '' });
      }
      log(`Kick ${cat.name} [${lang}] -> ${live.length} live`);
    }
  }
  return rows;
}

/* ---------------- CLI ---------------- */
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  const langs = list(a.lang).length ? list(a.lang) : ['pt'];
  const gameNames = list(a.games).length ? list(a.games) : ['Rematch', 'Rocket League', 'EA SPORTS FC 26'];
  const all = [];
  try {
    if (a.twitch) all.push(...await findTwitch({ langs, gameNames, pages: Number(a.pages || 3) }));
    if (a.youtube && a.seed) all.push(...await enrichYouTubeSeed(String(a.seed), langs[0]));
    else if (a.youtube) all.push(...await findYouTube({ langs, days: Number(a.days || 45), maxSearches: Number(a['max-searches'] || 30), queries: list(a.queries) }));
    if (a.kick) all.push(...await findKick({ langs, gameNames }));
    if (!a.twitch && !a.youtube && !a.kick) fail('chọn ít nhất một nguồn: --twitch --youtube --kick');
  } catch (e) { fail(e.message); }
  const r = save(all);
  const total = readJsonl(STORE());
  const tiers = total.reduce((m, x) => { m[x.tier] = (m[x.tier] || 0) + 1; return m; }, {});
  log(`lưu ${r.added} kênh mới, cập nhật ${r.updated} · tổng ${total.length} kênh · tier`, tiers);
  log(`xuất CSV cho team: node streamers/export.js --tier S,A`);
}
