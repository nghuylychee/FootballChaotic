/* YouTube Data API v3 qua OAuth (lib/google.js): upload resumable, hẹn giờ công khai, thumbnail, comment đầu, bản dịch title/mô tả. */
import fs from 'node:fs';
import { gapi } from '../lib/google.js';

const UP = 'https://www.googleapis.com/upload/youtube/v3';
const API = 'https://www.googleapis.com/youtube/v3';

// mã ngôn ngữ YouTube: pt-BR -> pt-BR được, nhưng defaultAudioLanguage hợp lệ nhất là mã ngắn
export const ytLang = (lang) => ({ 'pt-BR': 'pt', 'pt-PT': 'pt', 'zh-CN': 'zh-Hans' }[lang] || String(lang).slice(0, 2));

/** upload({ file, title, description, tags, lang, publishAt }) -> { id, status }.
 *  publishAt trong tương lai -> private + hẹn giờ (YouTube tự công khai đúng giờ); không có -> public ngay. */
export async function upload({ file, title, description, tags = [], lang = 'en', publishAt }) {
  const scheduled = publishAt && Date.parse(publishAt) > Date.now() + 2 * 60000;
  const meta = {
    snippet: { title: title.slice(0, 100), description: description.slice(0, 5000), tags, categoryId: '20', defaultLanguage: ytLang(lang), defaultAudioLanguage: ytLang(lang) },
    status: { privacyStatus: scheduled ? 'private' : 'public', publishAt: scheduled ? new Date(publishAt).toISOString() : undefined, selfDeclaredMadeForKids: false, embeddable: true },
  };
  const size = fs.statSync(file).size;
  const init = await gapi(`${UP}/videos`, { method: 'POST', query: { uploadType: 'resumable', part: 'snippet,status' }, body: meta, headers: { 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) }, expect: 'response' });
  const location = init.headers.get('location');
  if (!location) throw new Error('YouTube không trả về upload URL');
  const res = await gapi(location, { method: 'PUT', raw: fs.readFileSync(file), headers: { 'content-type': 'video/mp4' }, timeout: 15 * 60000 });
  return { id: res.id, status: res.status, scheduled: Boolean(scheduled) };
}

export async function setThumbnail(videoId, jpg) {
  return gapi(`${UP}/thumbnails/set`, { method: 'POST', query: { videoId }, raw: fs.readFileSync(jpg), headers: { 'content-type': 'image/jpeg' } });
}

export async function comment(videoId, text) {
  const res = await gapi(`${API}/commentThreads`, { method: 'POST', query: { part: 'snippet' }, body: { snippet: { videoId, topLevelComment: { snippet: { textOriginal: text } } } } });
  return res.id;
}

export async function reply(parentId, text) {
  const res = await gapi(`${API}/comments`, { method: 'POST', query: { part: 'snippet' }, body: { snippet: { parentId, textOriginal: text } } });
  return res.id;
}

/** localizations: { pt: { title, description }, es: {...} } */
export async function setLocalizations(videoId, localizations) {
  const cur = await gapi(`${API}/videos`, { query: { part: 'localizations', id: videoId } });
  const item = (cur.items || [])[0] || { id: videoId };
  return gapi(`${API}/videos`, { method: 'PUT', query: { part: 'localizations' }, body: { id: videoId, localizations: { ...(item.localizations || {}), ...localizations } } });
}

export async function videoStatus(videoId) {
  const res = await gapi(`${API}/videos`, { query: { part: 'status,statistics', id: videoId } });
  return (res.items || [])[0] || null;
}
