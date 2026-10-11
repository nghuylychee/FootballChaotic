/* YouTube Data API v3 bằng API key: tìm video theo từ khóa + vùng + ngôn ngữ, rồi lấy hồ sơ kênh.
 * Chi phí quota: search.list = 100 đơn vị, channels.list = 1, playlistItems.list = 1; mặc định 10.000 đơn vị/ngày/project. */
import { need } from '../lib/env.js';
import { request } from '../lib/http.js';

const API = 'https://www.googleapis.com/youtube/v3';
export const quota = { used: 0 };

async function get(path, query, cost) {
  quota.used += cost;
  return request(`${API}/${path}`, { query: { ...query, key: need('YOUTUBE_API_KEY', 'Google Cloud > Credentials > API key') } });
}

/** tìm video: trả về items[{videoId, channelId, channelTitle, title, publishedAt}] */
export async function searchVideos({ q, regionCode, relevanceLanguage, publishedAfter, maxResults = 50, order = 'relevance', pageToken }) {
  const res = await get('search', { part: 'snippet', type: 'video', q, regionCode, relevanceLanguage, publishedAfter, maxResults, order, pageToken, safeSearch: 'none' }, 100);
  return {
    items: (res.items || []).map((it) => ({ videoId: it.id && it.id.videoId, channelId: it.snippet.channelId, channelTitle: it.snippet.channelTitle, title: it.snippet.title, publishedAt: it.snippet.publishedAt })),
    nextPageToken: res.nextPageToken,
  };
}

/** hồ sơ kênh theo id (tối đa 50/lần) */
export async function channels(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const res = await get('channels', { part: 'snippet,statistics,brandingSettings,contentDetails', id: ids.slice(i, i + 50).join(','), maxResults: 50 }, 1);
    out.push(...(res.items || []).map(normalizeChannel));
  }
  return out;
}

/** kênh theo @handle hoặc URL (seed list) */
export async function channelByHandle(handle) {
  const h = handle.replace(/^https?:\/\/(www\.)?youtube\.com\//, '').replace(/\/.*$/, '').replace(/^@/, '');
  const res = await get('channels', { part: 'snippet,statistics,brandingSettings,contentDetails', forHandle: h }, 1);
  const it = (res.items || [])[0];
  return it ? normalizeChannel(it) : null;
}

/** ngày đăng video gần nhất (1 đơn vị) qua playlist uploads */
export async function lastUpload(uploadsPlaylistId) {
  if (!uploadsPlaylistId) return null;
  try {
    const res = await get('playlistItems', { part: 'snippet', playlistId: uploadsPlaylistId, maxResults: 1 }, 1);
    const it = (res.items || [])[0];
    return it ? it.snippet.publishedAt : null;
  } catch { return null; }
}

export function normalizeChannel(it) {
  const s = it.snippet || {}, st = it.statistics || {}, br = (it.brandingSettings && it.brandingSettings.channel) || {};
  return {
    id: it.id,
    name: s.title,
    handle: s.customUrl || null,
    url: s.customUrl ? `https://www.youtube.com/${s.customUrl}` : `https://www.youtube.com/channel/${it.id}`,
    desc: s.description || '',
    country: s.country || br.country || null,
    keywords: br.keywords || '',
    subs: st.hiddenSubscriberCount ? null : Number(st.subscriberCount || 0),
    videos: Number(st.videoCount || 0),
    views: Number(st.viewCount || 0),
    createdAt: s.publishedAt,
    uploads: it.contentDetails && it.contentDetails.relatedPlaylists && it.contentDetails.relatedPlaylists.uploads,
  };
}

// từ khóa mặc định theo ngôn ngữ kênh (game bóng đá + indie co-op); --queries để ghi đè
export const DEFAULT_QUERIES = {
  pt: ['Rematch gameplay', 'Rematch jogando', 'jogo de futebol indie', 'Rocket League gameplay', 'EA FC 26 gameplay', 'jogos indie novos steam'],
  es: ['Rematch gameplay español', 'juego de fútbol indie', 'Rocket League gameplay', 'EA FC 26 gameplay', 'juegos indie nuevos steam'],
  ja: ['Rematch 実況', 'サッカーゲーム 実況', 'ロケットリーグ 実況', 'インディーゲーム 実況 steam', 'EA FC 26 実況'],
  en: ['Rematch gameplay', 'indie football game', 'Rocket League funny moments', 'new indie games steam', 'co-op games with friends'],
  hi: ['Rematch gameplay hindi', 'football game hindi gameplay', 'Rocket League hindi', 'indie games hindi'],
};
export const REGION_OF = { pt: 'BR', es: 'MX', ja: 'JP', en: 'US', hi: 'IN', ptpt: 'PT' };
