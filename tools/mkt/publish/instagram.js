/* Instagram Graph API (Reels): cần tài khoản Business/Creator nối Facebook Page, app Meta có quyền instagram_content_publish,
 * và video phải ở một URL công khai (IG tải về, không nhận upload file). CHƯA TEST.
 * PUBLIC_CLIP_BASE trong .env (vd. https://cdn.example.com/clips/) + tên file = URL; hoặc đặt row.publicUrl khi xếp lịch. */
import { env } from '../lib/env.js';
import { request } from '../lib/http.js';

const G = 'https://graph.facebook.com/v21.0';
export const configured = () => Boolean(env('IG_USER_ID') && env('IG_ACCESS_TOKEN'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function publishReel({ videoUrl, caption, coverUrl }) {
  const user = env('IG_USER_ID'), token = env('IG_ACCESS_TOKEN');
  const c = await request(`${G}/${user}/media`, { method: 'POST', form: { media_type: 'REELS', video_url: videoUrl, caption: caption.slice(0, 2200), share_to_feed: 'true', cover_url: coverUrl || undefined, access_token: token } });
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const st = await request(`${G}/${c.id}`, { query: { fields: 'status_code,status', access_token: token } });
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error(`IG container lỗi: ${st.status}`);
  }
  const p = await request(`${G}/${user}/media_publish`, { method: 'POST', form: { creation_id: c.id, access_token: token } });
  return { id: p.id };
}
