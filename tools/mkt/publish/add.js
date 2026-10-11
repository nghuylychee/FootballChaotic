/* Tool 3a: xếp clip vào hàng đợi đăng (data/publish-queue.jsonl) theo giờ vàng địa phương của từng kênh.
 *   node publish/add.js --clip R12 --channel tt-br,yt-en            -> slot trống kế tiếp của mỗi kênh
 *   node publish/add.js --clip R12__pt --channel tt-br --at "2026-11-03 19:00"   (giờ địa phương của kênh)
 *   node publish/add.js --clip G1_B3 --channel yt-en --title "..." --file path/to.mp4
 *   node publish/add.js --batch out/batch.csv                       (cột: clip, channel, title?, at?)
 *   node publish/add.js --cancel <id>
 * Clip tìm trong CLIP_DIRS (.env, mặc định brag-output/hook-test/out); title mặc định lấy từ share-copy.txt của pipeline;
 * description / hashtag / pinned comment lấy từ presskit/facts.json với link UTM đúng kênh. */
import '../lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../lib/env.js';
import { args, list, log, warn, fail, table } from '../lib/log.js';
import { readJsonl, appendJsonl, updateJsonl } from '../lib/jsonl.js';
import { parseCsv } from '../lib/csv.js';
import { dataFile, REPO } from '../lib/paths.js';
import { mediumOf } from '../lib/utm.js';
import { FACTS, channelLinks } from '../presskit/build.js';
import { zonedToUtc, localDate, fmtLocal, parseWhen } from './time.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const QUEUE = () => dataFile('publish-queue.jsonl');
export const CHANNELS = JSON.parse(fs.readFileSync(path.join(here, 'channels.json'), 'utf8'));
delete CHANNELS._doc;

const clipDirs = () => (env('CLIP_DIRS') ? env('CLIP_DIRS').split(';') : [path.join(REPO, 'brag-output', 'hook-test', 'out'), path.join(REPO, 'brag-output', 'clips')]).map((d) => path.resolve(REPO, d));

export function findClip(clip, explicit) {
  if (explicit) return { file: path.resolve(explicit), poster: fs.existsSync(explicit.replace(/\.mp4$/i, '.jpg')) ? path.resolve(explicit.replace(/\.mp4$/i, '.jpg')) : null };
  for (const dir of clipDirs()) {
    const f = path.join(dir, `${clip}.mp4`);
    if (fs.existsSync(f)) return { file: f, poster: fs.existsSync(path.join(dir, `${clip}.jpg`)) ? path.join(dir, `${clip}.jpg`) : null };
  }
  return { file: null, poster: null };
}

// title từ share-copy.txt (dòng "R12  ronaldo irl vs ronaldo in my game"); biến thể R12__pt tìm share-copy.pt-BR.txt trước
export function defaultTitle(clip) {
  const [base, variant] = clip.split('__');
  const dir = path.join(REPO, 'brag-output', 'hook-test');
  const files = variant ? [`share-copy.${variant}.txt`, 'share-copy.txt'] : ['share-copy.txt'];
  for (const f of files) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(\S+)\s{2,}(.+)$/);
      if (m && (m[1] === clip || m[1] === base)) return m[2].trim();
    }
  }
  return base;
}

export function nextSlots(channelKey, queue, { count = 1, from = new Date(), leadMin = 30 } = {}) {
  const ch = CHANNELS[channelKey];
  if (!ch) throw new Error(`kênh lạ: ${channelKey} (có: ${Object.keys(CHANNELS).join(', ')})`);
  const mine = queue.filter((r) => r.channel === channelKey && r.status !== 'canceled');
  const taken = new Set(mine.map((r) => r.publishAt));
  const perDay = {};
  for (const r of mine) { const d = localDate(ch.tz, Date.parse(r.publishAt)); perDay[d] = (perDay[d] || 0) + 1; }
  const out = [];
  const earliest = from.getTime() + leadMin * 60000;
  for (let i = 0; i < 90 && out.length < count; i++) {
    const day = localDate(ch.tz, from.getTime() + i * 86400000);
    for (const slot of ch.slots) {
      if (out.length >= count) break;
      if ((perDay[day] || 0) >= ch.maxPerDay) break;
      const t = zonedToUtc(day, slot, ch.tz);
      if (t.getTime() < earliest) continue;
      const iso = t.toISOString();
      if (taken.has(iso)) continue;
      taken.add(iso); perDay[day] = (perDay[day] || 0) + 1; out.push(iso);
    }
  }
  return out;
}

export function composeText(channelKey, clip, title) {
  const ch = CHANNELS[channelKey];
  const S = FACTS.social[ch.lang] || FACTS.social.en;
  const l = channelLinks(ch.source, ch.lang);
  const fill = (s) => s.replace('{web}', l.web).replace('{steam}', l.steam);
  const hashtags = S.hashtags[ch.source] || S.hashtags.yt || '';
  return {
    title,
    description: `${fill(S.description)}${hashtags ? `\n\n${hashtags}` : ''}`,
    pinned: fill(S.pinned),
    hashtags,
    tags: hashtags.split(/\s+/).filter(Boolean).map((h) => h.replace(/^#/, '')).slice(0, 15),
    links: l,
  };
}

export function add({ clip, channels, at, title, file }) {
  const queue = readJsonl(QUEUE());
  const found = findClip(clip, file);
  if (!found.file) warn(`chưa thấy file ${clip}.mp4 trong ${clipDirs().join(' ; ')} (vẫn xếp lịch; run.js sẽ báo nếu thiếu lúc đăng)`);
  const rows = [];
  for (const channelKey of channels) {
    const ch = CHANNELS[channelKey];
    if (!ch) fail(`kênh lạ: ${channelKey} (có: ${Object.keys(CHANNELS).join(', ')})`);
    const publishAt = at ? parseWhen(at, ch.tz).toISOString() : nextSlots(channelKey, [...queue, ...rows], { count: 1 })[0];
    if (!publishAt) { warn(`${channelKey}: không còn slot trống`); continue; }
    const t = composeText(channelKey, clip, title || defaultTitle(clip));
    const row = {
      id: `${channelKey}-${clip}-${Date.now().toString(36)}${rows.length}`, clip, file: found.file, poster: found.poster,
      channel: channelKey, platform: ch.platform, lang: ch.lang, manual: Boolean(ch.manual),
      title: t.title, description: t.description, pinned: t.pinned, tags: t.tags,
      utm: { source: ch.source, medium: mediumOf(ch.lang), content: clip },
      publishAt, local: `${fmtLocal(publishAt, ch.tz)} ${ch.tz}`, status: 'queued', createdAt: new Date().toISOString(),
    };
    rows.push(row);
  }
  appendJsonl(QUEUE(), rows);
  return rows;
}

export function cancel(id) {
  const n = updateJsonl(QUEUE(), (r) => (r.id === id && r.status === 'queued' ? { ...r, status: 'canceled' } : undefined));
  log(n ? `đã hủy ${id}` : `không thấy ${id} ở trạng thái queued`);
}

export function listQueue(filter = () => true) {
  const rows = readJsonl(QUEUE()).filter(filter).sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  table(rows, [['id', 'id', 30], ['status', 'trạng thái', 10], ['local', 'giờ địa phương', 36], ['title', 'title', 44]]);
  return rows;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  try {
    if (a.cancel) cancel(String(a.cancel));
    else if (a.batch) {
      const rows = parseCsv(fs.readFileSync(String(a.batch), 'utf8'));
      let n = 0;
      for (const r of rows) { n += add({ clip: r.clip, channels: list(r.channel), at: r.at || undefined, title: r.title || undefined, file: r.file || undefined }).length; }
      log(`đã xếp ${n} lượt đăng từ ${a.batch}`);
    } else if (a.clip) {
      const rows = add({ clip: String(a.clip), channels: list(a.channel), at: a.at, title: a.title, file: a.file });
      for (const r of rows) log(`${r.channel}  ${r.local}  ${r.title}  [${r.id}]`);
      if (!rows.length) fail('không xếp được lượt nào');
    } else listQueue((r) => r.status === 'queued' || r.status === 'scheduled');
  } catch (e) { fail(e.message); }
}
