/* Tool 3b: chạy hàng đợi. YouTube: upload sớm (mặc định 24 h trước) với hẹn giờ, YouTube tự công khai đúng phút; sau khi
 * công khai thì tự đăng comment đầu (ghim tay, API không ghim được). TikTok / Instagram: đăng đúng giờ nếu có API, không thì
 * in THẺ ĐĂNG TAY (out/manual/<id>.md) với file, title, caption, hashtag, pinned comment để người đăng dán.
 *   node publish/run.js              xử lý một lượt      node publish/run.js --loop      mỗi 60 s (để chạy nền)
 *   node publish/run.js --list       xem hàng đợi        node publish/run.js --dry       chỉ in việc sẽ làm
 *   node publish/run.js --done <id> --url <link đã đăng>  đánh dấu kênh đăng tay đã xong */
import '../lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../lib/env.js';
import { args, log, warn, fail } from '../lib/log.js';
import { readJsonl, updateJsonl } from '../lib/jsonl.js';
import { outFile, ensureDir } from '../lib/paths.js';
import { hasToken } from '../lib/google.js';
import { QUEUE, CHANNELS, listQueue, findClip } from './add.js';
import * as yt from './youtube.js';
import * as tiktok from './tiktok.js';
import * as ig from './instagram.js';

const AHEAD = { youtube: 24 * 60, tiktok: 5, instagram: 5, default: 10 }; // phút trước publishAt thì xử lý
const patch = (id, fields) => updateJsonl(QUEUE(), (r) => (r.id === id ? { ...r, ...fields, updatedAt: new Date().toISOString() } : undefined));

export function manualCard(row) {
  const dir = ensureDir(outFile('manual'));
  const ch = CHANNELS[row.channel] || {};
  const md = `# ĐĂNG TAY · ${row.channel} · ${row.local}\n\n- File: ${row.file || '(thiếu file)'}\n- Poster: ${row.poster || ''}\n- Kênh: ${row.channel} (${row.platform}, ${row.lang}) ${ch.note ? `· ${ch.note}` : ''}\n\n## Title\n\n${row.title}\n\n## Caption / description\n\n${row.description}\n\n## Comment đầu (ghim)\n\n${row.pinned}\n\n## Link\n\n- Web: ${row.utm ? `(utm_source=${row.utm.source}, utm_medium=${row.utm.medium}, utm_content=${row.utm.content})` : ''}\n\nXong thì chạy: node publish/run.js --done ${row.id} --url <link bài đăng>\n`;
  const file = path.join(dir, `${row.id}.md`);
  fs.writeFileSync(file, md);
  return file;
}

async function handle(row, { dry }) {
  const due = Date.parse(row.publishAt) - Date.now() <= (AHEAD[row.platform] || AHEAD.default) * 60000;
  if (!due) return false;
  if (dry) { log(`[dry] ${row.channel} ${row.local} ${row.title} -> ${row.manual ? 'thẻ đăng tay' : row.platform}`); return true; }
  if (!row.file) { const f = findClip(row.clip); if (f.file) { row.file = f.file; row.poster = f.poster; patch(row.id, { file: f.file, poster: f.poster }); } }   // clip render sau khi xếp lịch
  if (!row.file || !fs.existsSync(row.file)) { patch(row.id, { status: 'error', error: `thiếu file ${row.file || row.clip + '.mp4'}` }); warn(`${row.id}: thiếu file ${row.file || row.clip}`); return true; }

  // kênh đăng tay hoặc chưa có API -> thẻ
  const canApi = row.platform === 'youtube' ? hasToken() : row.platform === 'tiktok' ? tiktok.configured() : row.platform === 'instagram' ? ig.configured() : false;
  if (row.manual || !canApi) {
    const f = manualCard(row);
    patch(row.id, { status: 'manual', card: f });
    log(`THẺ ĐĂNG TAY: ${f}`);
    return true;
  }

  try {
    if (row.platform === 'youtube') {
      const r = await yt.upload({ file: row.file, title: row.title, description: row.description, tags: row.tags, lang: row.lang, publishAt: row.publishAt });
      const url = `https://youtube.com/shorts/${r.id}`;
      patch(row.id, { status: r.scheduled ? 'scheduled' : 'live', youtubeId: r.id, url, commentPosted: false });
      log(`YouTube ${r.scheduled ? 'đã hẹn giờ' : 'đã công khai'}: ${url}`);
      if (row.poster) { try { await yt.setThumbnail(r.id, row.poster); } catch (e) { warn(`thumbnail: ${e.message.split('\n')[0]} (kênh chưa xác minh số điện thoại thì không đặt được)`); } }
      if (!r.scheduled) await postComment({ ...row, youtubeId: r.id });
    } else if (row.platform === 'tiktok') {
      const r = await tiktok.directPost({ file: row.file, title: `${row.title}\n\n${row.description}` });
      patch(row.id, { status: r.pending ? 'processing' : 'live', tiktokPublishId: r.publishId });
      log(`TikTok: ${r.publishId}`);
    } else if (row.platform === 'instagram') {
      const videoUrl = row.publicUrl || (env('PUBLIC_CLIP_BASE') ? env('PUBLIC_CLIP_BASE').replace(/\/$/, '') + '/' + path.basename(row.file) : null);
      if (!videoUrl) throw new Error('Instagram cần URL công khai của video (PUBLIC_CLIP_BASE hoặc row.publicUrl)');
      const r = await ig.publishReel({ videoUrl, caption: `${row.title}\n\n${row.description}` });
      patch(row.id, { status: 'live', instagramId: r.id });
      log(`Instagram: ${r.id}`);
    }
  } catch (e) {
    patch(row.id, { status: 'error', error: e.message.slice(0, 400) });
    warn(`${row.id}: ${e.message.split('\n')[0]}`);
  }
  return true;
}

async function postComment(row) {
  try {
    const cid = await yt.comment(row.youtubeId, row.pinned);
    patch(row.id, { status: 'live', commentPosted: true, commentId: cid });
    log(`comment đầu đã đăng trên ${row.youtubeId} (vào YouTube Studio ghim lại)`);
  } catch (e) { warn(`comment ${row.youtubeId}: ${e.message.split('\n')[0]}`); }
}

export async function runOnce({ dry = false } = {}) {
  const rows = readJsonl(QUEUE());
  let n = 0;
  for (const row of rows.filter((r) => r.status === 'queued').sort((a, b) => a.publishAt.localeCompare(b.publishAt))) if (await handle(row, { dry })) n++;
  // video YouTube đã hẹn giờ và tới giờ -> đăng comment đầu
  if (!dry && hasToken()) {
    for (const row of rows.filter((r) => r.status === 'scheduled' && r.youtubeId && !r.commentPosted && Date.parse(r.publishAt) <= Date.now())) await postComment(row);
  }
  return n;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  if (a.list) listQueue(() => true);
  else if (a.done) {
    const n = patch(String(a.done), { status: 'live', url: a.url || '', postedAt: new Date().toISOString() });
    log(n ? `đã đánh dấu ${a.done} là đã đăng` : `không thấy ${a.done}`);
  } else if (a.loop) {
    log('chạy nền, Ctrl+C để dừng');
    const tick = () => runOnce({ dry: Boolean(a.dry) }).then((n) => n && log(`xử lý ${n} lượt`)).catch((e) => warn(e.message));
    tick(); setInterval(tick, Number(a.every || 60) * 1000);
  } else runOnce({ dry: Boolean(a.dry) }).then((n) => log(`xử lý ${n} lượt${a.dry ? ' (dry)' : ''}`)).catch((e) => fail(e.message));
}
