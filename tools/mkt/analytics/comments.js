/* Tool 5: đào comment YouTube: đếm "hỏi tên game / xin link" trên 1.000 view (chỉ số quan trọng nhất của vòng test hook),
 * gắn nhãn ngôn ngữ + tiêu cực, và (tùy chọn) tự trả lời bằng link đúng ngôn ngữ.
 *   node analytics/comments.js                      -> quét video đã đăng (hàng đợi) + video có trong yt-metrics
 *   node analytics/comments.js --ids VID1,VID2
 *   node analytics/comments.js --reply --yes        -> trả lời comment "hỏi tên game" chưa trả lời (cần OAuth; mỗi lần tối đa --max 30)
 * Ra: data/comments.jsonl (mỗi comment một dòng, có nhãn), out/comments-<ngày>.csv, bảng tổng theo video.
 * Lưu ý: comment có link hay bị YouTube giữ lại duyệt; trả lời vẫn đáng vì chủ kênh được ưu tiên hiển thị. */
import '../lib/env.js';
import fs from 'node:fs';
import { env } from '../lib/env.js';
import { args, list, log, warn, fail, table } from '../lib/log.js';
import { readJsonl, upsertJsonl, updateJsonl } from '../lib/jsonl.js';
import { toCsv } from '../lib/csv.js';
import { dataFile, outFile, today } from '../lib/paths.js';
import { request } from '../lib/http.js';
import { gapi, hasToken } from '../lib/google.js';
import { QUEUE } from '../publish/add.js';
import { METRICS } from './youtube-pull.js';
import { FACTS, channelLinks } from '../presskit/build.js';
import * as yt from '../publish/youtube.js';

const API = 'https://www.googleapis.com/youtube/v3';
export const STORE = () => dataFile('comments.jsonl');

/* ---------------- phân loại ---------------- */
const ASK = [
  /\b(what|which|wat|whats|what's)\s+(is\s+)?(the\s+)?(name\s+of\s+(the|this|dis)\s+)?game\b/i, /\bgame\s*(name|title)\b/i, /\bname\s+of\s+(the|this)\s+game\b/i, /\bwhere\s+(can\s+i|do\s+i|to)\s+(play|get|download|find)/i, /\blink\s*(pls|plz|please|\?)/i, /\b(is|it)\s+on\s+steam\b/i, /\bsteam\s*(page|link)\b/i, /\bhow\s+(do\s+i|to)\s+(play|download|get)\b/i, /\bgame\s*\?/i,
  /\bque\s+jogo\b/i, /\bnome\s+do\s+jogo\b/i, /\bqual\s+(é\s+)?o\s+(nome\s+do\s+)?jogo\b/i, /\bonde\s+(eu\s+)?(jogo|baixo|acho|encontro)\b/i, /\bcomo\s+(jogo|baixo|baixar|jogar)\b/i, /\btem\s+(na\s+)?steam\b/i, /\blink\s*\??$/i, /\bmanda\s+o\s+link\b/i,
  /\bqu[eé]\s+juego\b/i, /\bc[oó]mo\s+se\s+llama\b/i, /\bnombre\s+del\s+juego\b/i, /\bd[oó]nde\s+(lo\s+)?(juego|descargo|consigo|encuentro)\b/i, /\best[aá]\s+en\s+steam\b/i,
  /なんのゲーム|何のゲーム|ゲーム名|ゲームの名前|どこで(遊|やれ|できる)|タイトル(は|教えて)|Steamにある/,
  /\bkaun\s*sa\s+game\b/i, /\bgame\s+ka\s+naam\b/i, /\bkahan\s+(se\s+)?(khel|download)/i, /\bkonsa\s+game\b/i,
  /这是什么游戏|什么游戏|游戏名|哪里(玩|下载)/,
];
const NEG = [/\bfake\b/i, /\bscam\b/i, /\bmobile\s+ad\b/i, /\bslop\b/i, /\btrash\b/i, /\bgarbage\b/i, /\bugly\b/i, /\blixo\b/i, /\bbasura\b/i, /クソゲー|つまらん|ゴミ/, /\bbot\s+(comment|account)/i, /\bpay\s*to\s*win\b/i];
const PLAYED = [/\bi\s+(just\s+)?(played|tried|downloaded|wishlisted)\b/i, /\bjoguei\b/i, /\bbaixei\b/i, /\blo\s+jugu[eé]\b/i, /\bya\s+lo\s+(tengo|jugu[eé])\b/i, /遊んだ|やってみた|ウィッシュリスト(に)?(入れ|追加)/];
const LANG = [['ja', /[぀-ヿ一-龯]/], ['zh', /[一-鿿]/], ['hi', /[ऀ-ॿ]|\b(bhai|yaar|kya|hai|kaise|bahut|bohot|mast)\b/i], ['pt', /\b(que|jogo|muito|mano|cara|nome|onde|baixar|legal|kkk+|demais|vc|mds|slk)\b/i], ['es', /\b(qué|juego|donde|dónde|cómo|como se llama|está|muy|jaja+|wey|chido|bro)\b/i], ['en', /\b(the|what|game|this|is|lol|bro|where|name)\b/i]];

export function classify(text) {
  const t = String(text || '');
  const ask = ASK.some((re) => re.test(t));
  const neg = NEG.some((re) => re.test(t));
  const played = PLAYED.some((re) => re.test(t));
  let lang = 'other';
  for (const [l, re] of LANG) if (re.test(t)) { lang = l; break; }
  return { ask, neg, played, lang, label: ask ? 'ask' : played ? 'played' : neg ? 'neg' : 'other' };
}

/* ---------------- lấy comment ---------------- */
async function threads(videoId) {
  const out = [];
  let pageToken;
  const useOAuth = hasToken();
  for (let p = 0; p < 10; p++) {
    const query = { part: 'snippet', videoId, maxResults: 100, order: 'time', textFormat: 'plainText', pageToken };
    const res = useOAuth ? await gapi(`${API}/commentThreads`, { query }) : await request(`${API}/commentThreads`, { query: { ...query, key: env('YOUTUBE_API_KEY') } });
    for (const th of res.items || []) {
      const c = th.snippet.topLevelComment.snippet;
      out.push({ id: th.id, videoId, author: c.authorDisplayName, authorChannel: c.authorChannelId && c.authorChannelId.value, text: c.textDisplay, likes: c.likeCount, at: c.publishedAt, replies: th.snippet.totalReplyCount });
    }
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export async function scan({ ids } = {}) {
  const queue = readJsonl(QUEUE()).filter((r) => r.youtubeId);
  const byId = new Map(queue.map((r) => [r.youtubeId, r]));
  const metrics = readJsonl(METRICS());
  const latest = {};
  for (const m of metrics) if (!latest[m.videoId] || m.date > latest[m.videoId].date) latest[m.videoId] = m;
  const targets = ids && ids.length ? ids : [...new Set([...byId.keys(), ...Object.keys(latest)])];
  if (!targets.length) fail('chưa có video nào: chạy publish trước, hoặc --ids');
  const all = [];
  for (const v of targets) {
    try {
      const rows = await threads(v);
      const q = byId.get(v) || {};
      for (const r of rows) all.push({ ...r, ...classify(r.text), clip: q.clip || null, channel: q.channel || null, scannedAt: new Date().toISOString() });
      log(`${v}: ${rows.length} comment`);
    } catch (e) { warn(`${v}: ${e.message.split('\n')[0]}`); }
  }
  upsertJsonl(STORE(), all, (r) => r.id, (oldRow, newRow) => ({ ...newRow, replied: oldRow.replied, replyId: oldRow.replyId }));
  const store = readJsonl(STORE());
  // tổng theo video
  const per = {};
  for (const c of store) {
    const p = per[c.videoId] || (per[c.videoId] = { videoId: c.videoId, clip: c.clip, channel: c.channel, comments: 0, ask: 0, neg: 0, played: 0, views: (latest[c.videoId] || {}).views || null });
    p.comments++; if (c.ask) p.ask++; if (c.neg) p.neg++; if (c.played) p.played++;
  }
  const summary = Object.values(per).map((p) => ({ ...p, askPer1k: p.views ? +(p.ask / p.views * 1000).toFixed(2) : null })).sort((a, b) => (b.askPer1k || 0) - (a.askPer1k || 0));
  fs.writeFileSync(outFile(`comments-${today()}.csv`), toCsv(store.map((c) => ({ videoId: c.videoId, clip: c.clip, channel: c.channel, at: c.at, author: c.author, lang: c.lang, label: c.label, likes: c.likes, text: c.text, replied: c.replied ? 'y' : '' }))));
  table(summary.slice(0, 30), [['videoId', 'video', 12], ['clip', 'clip', 10], ['views', 'views', 8], ['comments', 'cmt', 5], ['ask', 'hỏi game', 8], ['askPer1k', 'hỏi/1k', 7], ['neg', 'neg', 4], ['played', 'played', 6]]);
  log(`${store.length} comment trong data/comments.jsonl · CSV: out/comments-${today()}.csv`);
  return summary;
}

export async function replyAsks({ max = 30, yes = false }) {
  if (!hasToken()) fail('trả lời cần OAuth: node lib/google.js');
  const queue = readJsonl(QUEUE());
  const byId = new Map(queue.filter((r) => r.youtubeId).map((r) => [r.youtubeId, r]));
  const todo = readJsonl(STORE()).filter((c) => c.ask && !c.replied).slice(0, max);
  if (!todo.length) { log('không có comment hỏi game nào chưa trả lời'); return 0; }
  let n = 0;
  for (const c of todo) {
    const q = byId.get(c.videoId) || {};
    const lang = c.lang === 'pt' ? 'pt-BR' : ['es', 'ja', 'hi', 'en'].includes(c.lang) ? c.lang : (q.lang || 'en');
    const S = FACTS.social[lang] || FACTS.social.en;
    const l = channelLinks('yt', lang);
    const text = S.reply.replace('{web}', l.web).replace('{steam}', l.steam);
    if (!yes) { log(`[xem trước] ${c.videoId} ← ${c.author}: "${c.text.slice(0, 60)}"\n    → ${text}`); continue; }
    try {
      const id = await yt.reply(c.id, text);
      updateJsonl(STORE(), (x) => (x.id === c.id ? { ...x, replied: true, replyId: id, repliedAt: new Date().toISOString() } : undefined));
      n++; log(`đã trả lời ${c.author} (${lang})`);
      await new Promise((ok) => setTimeout(ok, 2000));
    } catch (e) { warn(`${c.id}: ${e.message.split('\n')[0]}`); }
  }
  if (!yes) log(`thêm --yes để gửi ${todo.length} câu trả lời ở trên`);
  return n;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  (a.reply ? replyAsks({ max: Number(a.max || 30), yes: Boolean(a.yes) }) : scan({ ids: list(a.ids) })).catch((e) => fail(e.message));
}
