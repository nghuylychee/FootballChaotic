/* TikTok Content Posting API: đăng trực tiếp từ file. CHƯA TEST (cần app được TikTok duyệt scope video.publish;
 * app chưa audit chỉ đăng được riêng tư SELF_ONLY). Tài liệu: developers.tiktok.com/doc/content-posting-api-reference-direct-post */
import fs from 'node:fs';
import { env } from '../lib/env.js';
import { request } from '../lib/http.js';

const API = 'https://open.tiktokapis.com/v2/post/publish';
export const configured = () => Boolean(env('TIKTOK_ACCESS_TOKEN'));
const headers = () => ({ authorization: `Bearer ${env('TIKTOK_ACCESS_TOKEN')}` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function directPost({ file, title, privacy = env('TIKTOK_PRIVACY', 'PUBLIC_TO_EVERYONE') }) {
  const size = fs.statSync(file).size;
  if (size > 64 * 1024 * 1024) throw new Error('TikTok: file > 64 MB cần upload nhiều chunk, chưa hỗ trợ');
  const init = await request(`${API}/video/init/`, { method: 'POST', headers: headers(), body: {
    post_info: { title: title.slice(0, 2200), privacy_level: privacy, disable_duet: false, disable_comment: false, disable_stitch: false, video_cover_timestamp_ms: 0 },
    source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 },
  } });
  const { publish_id, upload_url } = init.data || {};
  if (!upload_url) throw new Error(`TikTok init lỗi: ${JSON.stringify(init.error || init)}`);
  await request(upload_url, { method: 'PUT', raw: fs.readFileSync(file), headers: { 'content-type': 'video/mp4', 'content-range': `bytes 0-${size - 1}/${size}` }, timeout: 10 * 60000 });
  for (let i = 0; i < 40; i++) {
    await sleep(5000);
    const st = await request(`${API}/status/fetch/`, { method: 'POST', headers: headers(), body: { publish_id } });
    const s = st.data && st.data.status;
    if (s === 'PUBLISH_COMPLETE') return { publishId: publish_id, ids: st.data.publicaly_available_post_id || [] };
    if (s === 'FAILED') throw new Error(`TikTok publish FAILED: ${st.data.fail_reason}`);
  }
  return { publishId: publish_id, pending: true };
}
