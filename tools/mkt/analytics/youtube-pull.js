/* Tool 4a: kéo số liệu từng video YouTube về data/yt-metrics.jsonl (một dòng / video / ngày) để dashboard và vòng test hook đọc.
 *   node analytics/youtube-pull.js                 -> video trong hàng đợi đã đăng + 200 video mới nhất của kênh đang đăng nhập
 *   node analytics/youtube-pull.js --days 28       -> cửa sổ Analytics (mặc định 28 ngày)
 *   node analytics/youtube-pull.js --ids a,b,c     -> chỉ các video này
 * Cần OAuth (node lib/google.js) với scope youtube + analytics. "viewed vs swiped away" của Shorts KHÔNG có trong API, chỉ xem trong Studio. */
import '../lib/env.js';
import { args, list, log, warn, fail, table } from '../lib/log.js';
import { readJsonl, upsertJsonl } from '../lib/jsonl.js';
import { dataFile, today } from '../lib/paths.js';
import { gapi } from '../lib/google.js';
import { QUEUE } from '../publish/add.js';

const API = 'https://www.googleapis.com/youtube/v3';
export const METRICS = () => dataFile('yt-metrics.jsonl');

export async function myUploads(limit = 200) {
  const ch = await gapi(`${API}/channels`, { query: { part: 'contentDetails,snippet', mine: true } });
  const item = (ch.items || [])[0];
  if (!item) return [];
  const pl = item.contentDetails.relatedPlaylists.uploads;
  const ids = [];
  let pageToken;
  while (ids.length < limit) {
    const res = await gapi(`${API}/playlistItems`, { query: { part: 'contentDetails,snippet', playlistId: pl, maxResults: 50, pageToken } });
    for (const it of res.items || []) ids.push({ id: it.contentDetails.videoId, title: it.snippet.title, publishedAt: it.contentDetails.videoPublishedAt });
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }
  return ids;
}

export async function stats(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const res = await gapi(`${API}/videos`, { query: { part: 'statistics,snippet,contentDetails', id: ids.slice(i, i + 50).join(',') } });
    for (const v of res.items || []) out[v.id] = { title: v.snippet.title, publishedAt: v.snippet.publishedAt, duration: v.contentDetails.duration, views: +v.statistics.viewCount || 0, likes: +v.statistics.likeCount || 0, comments: +v.statistics.commentCount || 0 };
  }
  return out;
}

export async function analytics(ids, days) {
  const end = today(), start = today(new Date(Date.now() - days * 86400000));
  const out = {};
  for (let i = 0; i < ids.length; i += 200) {
    const res = await gapi('https://youtubeanalytics.googleapis.com/v2/reports', { query: {
      ids: 'channel==MINE', startDate: start, endDate: end, dimensions: 'video', filters: `video==${ids.slice(i, i + 200).join(',')}`,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained', sort: '-views', maxResults: 200,
    } });
    const cols = (res.columnHeaders || []).map((c) => c.name);
    for (const row of res.rows || []) { const o = {}; cols.forEach((c, j) => { o[c] = row[j]; }); out[o.video] = o; }
  }
  return out;
}

export async function pull({ days = 28, onlyIds } = {}) {
  const queue = readJsonl(QUEUE()).filter((r) => r.youtubeId);
  const byId = new Map(queue.map((r) => [r.youtubeId, r]));
  let ids = onlyIds && onlyIds.length ? onlyIds : [...byId.keys()];
  if (!onlyIds || !onlyIds.length) {
    try { for (const u of await myUploads()) if (!byId.has(u.id)) ids.push(u.id); } catch (e) { warn(`không đọc được danh sách upload: ${e.message.split('\n')[0]}`); }
  }
  ids = [...new Set(ids)];
  if (!ids.length) { log('chưa có video nào'); return []; }
  const st = await stats(ids);
  let an = {};
  try { an = await analytics(ids, days); } catch (e) { warn(`Analytics API lỗi (${e.message.split('\n')[0]}); chỉ lưu thống kê cơ bản`); }
  const date = today();
  const rows = ids.filter((id) => st[id]).map((id) => {
    const q = byId.get(id) || {}, s = st[id], a = an[id] || {};
    return { date, videoId: id, clip: q.clip || null, channel: q.channel || null, lang: q.lang || null, title: s.title, publishedAt: s.publishedAt, duration: s.duration,
      views: s.views, likes: s.likes, comments: s.comments,
      viewsWindow: a.views ?? null, avgViewPct: a.averageViewPercentage ?? null, avgViewSec: a.averageViewDuration ?? null, shares: a.shares ?? null, subsGained: a.subscribersGained ?? null, minutesWatched: a.estimatedMinutesWatched ?? null };
  });
  upsertJsonl(METRICS(), rows, (r) => `${r.date}|${r.videoId}`);
  return rows;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  pull({ days: Number(a.days || 28), onlyIds: list(a.ids) }).then((rows) => {
    rows.sort((x, y) => y.views - x.views);
    table(rows.slice(0, 25), [['videoId', 'video', 12], ['clip', 'clip', 10], ['views', 'views', 8], ['avgViewPct', '%xem', 6], ['likes', 'like', 6], ['comments', 'cmt', 5], ['subsGained', 'sub+', 5], ['title', 'title', 40]]);
    log(`${rows.length} video -> data/yt-metrics.jsonl (${today()})`);
  }).catch((e) => fail(e.message));
}
