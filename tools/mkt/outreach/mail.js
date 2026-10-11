/* Tool 7: outreach streamer bằng mail cá nhân hóa, có key, có link chơi web, theo dõi trạng thái, follow-up một lần.
 *
 *   node outreach/mail.js draft --from-csv out/streamers-2026-10-20.csv --wave 1 --lang pt-BR --limit 60
 *       -> tạo dòng trong data/outreach.jsonl (status=draft) + file xem trước out/mail/<id>.eml
 *          CHỈ nhận dòng có cột personal_line (một câu thật về video của họ). --allow-generic để bỏ qua luật này.
 *   node outreach/mail.js send --wave 1 --limit 50            -> gửi các draft (MAIL_VIA=dryrun|resend|gmail|smtp), gán key từ data/keys.txt
 *   node outreach/mail.js followup --days 4 --news "A data de lançamento é 29/1."   -> nhắc 1 lần những ai chưa trả lời
 *   node outreach/mail.js mark joao@mail.com replied|played|skip|bounced
 *   node outreach/mail.js sync-gmail                           -> tự đánh dấu replied theo hộp thư Gmail (cần OAuth)
 *   node outreach/mail.js status                               -> bảng tổng
 * Luật an toàn: trần MAIL_DAILY_CAP mail/ngày (mặc định 50); không gửi 2 lần cho cùng email; không follow-up quá 1 lần. */
import '../lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, need } from '../lib/env.js';
import { args, list, log, warn, fail, table } from '../lib/log.js';
import { readJsonl, appendJsonl, updateJsonl } from '../lib/jsonl.js';
import { parseCsv } from '../lib/csv.js';
import { request } from '../lib/http.js';
import { dataFile, outFile, ensureDir, today } from '../lib/paths.js';
import { buildUrl, steamBase, mediumOf } from '../lib/utm.js';
import { gapi } from '../lib/google.js';
import { sendSmtp } from './smtp.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const STORE = () => dataFile('outreach.jsonl');
const KEYS = () => dataFile('keys.txt');
const KEYS_USED = () => dataFile('keys-used.jsonl');

/* ---------------- template ---------------- */
export function loadTemplate(lang) {
  const file = path.join(here, 'templates', `${lang}.txt`);
  if (!fs.existsSync(file)) throw new Error(`không có template cho ${lang} (có: ${fs.readdirSync(path.join(here, 'templates')).join(', ')})`);
  const txt = fs.readFileSync(file, 'utf8');
  const [head, rest] = txt.split(/\r?\n---\r?\n/);
  const [body, followup] = rest.split(/\r?\n---followup---\r?\n/);
  const meta = {};
  for (const line of head.split(/\r?\n/)) { const m = line.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2]; }
  return { subject: meta.subject, subjectFollowup: meta.subject_followup || `Re: ${meta.subject}`, body: body.trim(), followup: (followup || '').trim() };
}

export function render(tpl, vars) {
  const fill = (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k]))).replace(/\n{3,}/g, '\n\n');
  return { subject: fill(tpl.subject), body: fill(tpl.body), subjectFollowup: fill(tpl.subjectFollowup), followup: fill(tpl.followup) };
}

// link theo kênh: mail-<lang>-<handle>
export function linksFor(row) {
  const medium = mediumOf(row.lang);
  const content = (row.handle || row.name || row.email || 'x').toString().toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30) || 'x';
  const steam = steamBase({ STEAM_URL: env('STEAM_URL'), STEAM_APPID: env('STEAM_APPID'), FALLBACK_URL: env('FALLBACK_URL', 'https://team41.itch.io/sfc') });
  const web = env('WEB_URL', 'https://nghuylychee.github.io/FootballChaotic/');
  const domain = env('LINK_DOMAIN');
  return {
    steam_link: domain ? `https://${domain}/mail-${medium}-${content}` : buildUrl(steam, { source: 'mail', medium, content, campaign: env('CAMPAIGN', 'prelaunch') }),
    web_link: buildUrl(web, { source: 'mail', medium, content, campaign: env('CAMPAIGN', 'prelaunch') }),
    presskit_link: domain ? `https://${domain}/press` : `${web.replace(/\/$/, '')}/presskit/`,
    policy_link: `${web.replace(/\/$/, '')}/presskit/streaming-policy.html`,
    discord_link: env('DISCORD_URL', ''),
  };
}

/* ---------------- key Steam ---------------- */
export function takeKey(forEmail) {
  const f = KEYS();
  if (!fs.existsSync(f)) return null;
  const keys = fs.readFileSync(f, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!keys.length) return null;
  const key = keys.shift();
  fs.writeFileSync(f, keys.join('\n') + (keys.length ? '\n' : ''));
  appendJsonl(KEYS_USED(), { key, email: forEmail, at: new Date().toISOString() });
  return key;
}
export const keysLeft = () => (fs.existsSync(KEYS()) ? fs.readFileSync(KEYS(), 'utf8').split(/\r?\n/).filter((s) => s.trim()).length : 0);

/* ---------------- RFC822 ---------------- */
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const encHeader = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
export function rfc822({ from, to, replyTo, subject, text, inReplyTo }) {
  const lines = [
    `From: ${from}`, `To: ${to}`, replyTo ? `Reply-To: ${replyTo}` : null, `Subject: ${encHeader(subject)}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null, inReplyTo ? `References: ${inReplyTo}` : null,
    `Date: ${new Date().toUTCString()}`, `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@sfc-mkt>`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
    b64(text).replace(/(.{76})/g, '$1\n'),
  ].filter((l) => l !== null);
  return lines.join('\r\n');
}

/* ---------------- gửi ---------------- */
export async function deliver({ to, subject, text, inReplyTo }) {
  const via = env('MAIL_VIA', 'dryrun');
  const from = env('MAIL_FROM', 'Team41 <hello@example.com>');
  const replyTo = env('MAIL_REPLY_TO', '');
  if (via === 'dryrun') return { id: `dryrun-${Date.now()}`, via };
  if (via === 'resend') {
    const res = await request('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${need('RESEND_API_KEY')}` }, body: { from, to: [to], reply_to: replyTo || undefined, subject, text, headers: inReplyTo ? { 'In-Reply-To': inReplyTo, References: inReplyTo } : undefined } });
    return { id: res.id, via };
  }
  if (via === 'gmail') {
    const raw = Buffer.from(rfc822({ from, to, replyTo, subject, text, inReplyTo })).toString('base64url');
    const res = await gapi('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', body: { raw } });
    return { id: res.id, threadId: res.threadId, via };
  }
  if (via === 'smtp') {
    await sendSmtp({ host: need('SMTP_HOST'), port: env('SMTP_PORT', 465), user: need('SMTP_USER'), pass: need('SMTP_PASS'), from, to, raw: rfc822({ from, to, replyTo, subject, text, inReplyTo }) });
    return { id: `smtp-${Date.now()}`, via };
  }
  throw new Error(`MAIL_VIA không hợp lệ: ${via}`);
}

const pause = () => new Promise((ok) => setTimeout(ok, env('MAIL_DELAY_MS') != null ? Number(env('MAIL_DELAY_MS')) : 1500 + Math.random() * 2500));
const sentToday = () => readJsonl(STORE()).filter((r) => (r.sentAt || '').slice(0, 10) === today() || (r.followupAt || '').slice(0, 10) === today()).length;

/* ---------------- lệnh ---------------- */
export function draft({ csv, wave = 1, lang, limit = 50, allowGeneric = false, sender }) {
  const rows = parseCsv(fs.readFileSync(csv, 'utf8'));
  const existing = new Set(readJsonl(STORE()).map((r) => r.email.toLowerCase()));
  const tplCache = {};
  const out = [];
  let skipped = { noEmail: 0, dup: 0, noLine: 0, skip: 0 };
  for (const r of rows) {
    if (out.length >= limit) break;
    const email = (r.email || '').trim().toLowerCase();
    if (!email) { skipped.noEmail++; continue; }
    if (existing.has(email)) { skipped.dup++; continue; }
    if (/^(skip|no|x)$/i.test(r.status || '')) { skipped.skip++; continue; }
    const personal = (r.personal_line || '').trim();
    if (!personal && !allowGeneric) { skipped.noLine++; continue; }
    const rowLang = lang || r.lang || 'en';
    const tplLang = rowLang === 'pt' ? 'pt-BR' : rowLang;
    const tpl = tplCache[tplLang] || (tplCache[tplLang] = loadTemplate(tplLang));
    const name = (r.name || r.handle || '').trim();
    const vars = { name, personal_line: personal, key: '{{key}}', sender: sender || env('MAIL_SENDER', 'Long'), followup_news: '{{followup_news}}', ...linksFor({ ...r, lang: rowLang }) };
    const m = render(tpl, vars);
    const id = `${wave}-${email.replace(/[^a-z0-9]/g, '_')}`;
    const row = { id, wave: Number(wave), email, name, lang: rowLang, tplLang, platform: r.platform || '', url: r.url || '', handle: r.handle || '', personal: Boolean(personal), subject: m.subject, body: m.body, subjectFollowup: m.subjectFollowup, followupBody: m.followup, status: 'draft', createdAt: new Date().toISOString() };
    out.push(row);
    existing.add(email);
    const dir = ensureDir(outFile('mail'));
    fs.writeFileSync(path.join(dir, `${id}.eml`), rfc822({ from: env('MAIL_FROM', 'Team41 <hello@example.com>'), to: `${name} <${email}>`, subject: m.subject, text: m.body }));
  }
  appendJsonl(STORE(), out);
  log(`draft: ${out.length} mail (đợt ${wave}) -> data/outreach.jsonl + out/mail/*.eml · bỏ qua: không email ${skipped.noEmail}, trùng ${skipped.dup}, thiếu personal_line ${skipped.noLine}, đánh dấu skip ${skipped.skip}`);
  if (skipped.noLine) log('   -> điền cột personal_line trong CSV rồi chạy lại; --allow-generic nếu chấp nhận mail không cá nhân hóa (tỉ lệ trả lời thấp hơn hẳn)');
  return out;
}

export async function send({ wave, limit = 50, cap = Number(env('MAIL_DAILY_CAP', 50)) }) {
  const rows = readJsonl(STORE()).filter((r) => r.status === 'draft' && (!wave || r.wave === Number(wave)));
  const room = Math.max(0, cap - sentToday());
  const batch = rows.slice(0, Math.min(limit, room));
  if (!batch.length) { log(`không có gì để gửi (draft: ${rows.length}, còn ${room} suất hôm nay, key còn ${keysLeft()})`); return []; }
  if (keysLeft() < batch.length) warn(`chỉ còn ${keysLeft()} key trong data/keys.txt cho ${batch.length} mail; mail thiếu key sẽ ghi "key sẽ gửi sau" (nên nạp thêm key trước)`);
  const done = [];
  for (const r of batch) {
    const key = takeKey(r.email) || '(key sẽ gửi trong mail sau)';
    const text = r.body.replace(/\{\{key\}\}/g, key);
    try {
      const res = await deliver({ to: `${r.name} <${r.email}>`, subject: r.subject, text });
      updateJsonl(STORE(), (x) => (x.id === r.id ? { ...x, status: 'sent', key, sentAt: new Date().toISOString(), msgId: res.id, threadId: res.threadId, via: res.via } : undefined));
      done.push(r.id);
      log(`gửi ${r.email} [${res.via}] key ${key}`);
      await pause(); // không bắn dồn
    } catch (e) {
      warn(`${r.email}: ${e.message.split('\n')[0]}`);
      updateJsonl(STORE(), (x) => (x.id === r.id ? { ...x, status: 'error', error: e.message.slice(0, 300) } : undefined));
    }
  }
  log(`xong: ${done.length}/${batch.length} · hôm nay đã gửi ${sentToday()}/${cap}`);
  return done;
}

export async function followup({ days = 4, news = '', limit = 50, cap = Number(env('MAIL_DAILY_CAP', 50)) }) {
  const cutoff = Date.now() - days * 86400000;
  const rows = readJsonl(STORE()).filter((r) => r.status === 'sent' && !r.followupAt && r.sentAt && Date.parse(r.sentAt) < cutoff);
  const room = Math.max(0, cap - sentToday());
  const batch = rows.slice(0, Math.min(limit, room));
  if (!batch.length) { log(`chưa ai tới hạn follow-up (${days} ngày) hoặc hết suất hôm nay`); return []; }
  for (const r of batch) {
    const text = r.followupBody.replace(/\{\{key\}\}/g, r.key || '').replace(/\{\{followup_news\}\}/g, news);
    try {
      const res = await deliver({ to: `${r.name} <${r.email}>`, subject: r.subjectFollowup, text, inReplyTo: r.via === 'gmail' ? undefined : r.msgId });
      updateJsonl(STORE(), (x) => (x.id === r.id ? { ...x, status: 'followup', followupAt: new Date().toISOString(), followupMsgId: res.id } : undefined));
      log(`follow-up ${r.email}`);
      await pause();
    } catch (e) { warn(`${r.email}: ${e.message.split('\n')[0]}`); }
  }
  return batch.map((r) => r.id);
}

export function mark(email, status, note) {
  const n = updateJsonl(STORE(), (x) => (x.email === email.toLowerCase() ? { ...x, status, note: note || x.note, markedAt: new Date().toISOString() } : undefined));
  log(n ? `${email} -> ${status}` : `không thấy ${email}`);
  return n;
}

// Gmail: ai đã trả lời (có mail từ địa chỉ đó sau ngày gửi) -> replied
export async function syncGmail() {
  const rows = readJsonl(STORE()).filter((r) => ['sent', 'followup'].includes(r.status));
  let n = 0;
  for (const r of rows) {
    const after = Math.floor(Date.parse(r.sentAt) / 1000);
    const res = await gapi('https://gmail.googleapis.com/gmail/v1/users/me/messages', { query: { q: `from:${r.email} after:${after}`, maxResults: 1 } });
    if ((res.messages || []).length) { mark(r.email, 'replied'); n++; }
  }
  log(`sync Gmail: ${n} người đã trả lời`);
}

export function status() {
  const rows = readJsonl(STORE());
  const by = {};
  for (const r of rows) { const k = `${r.wave}|${r.lang}`; by[k] = by[k] || { wave: r.wave, lang: r.lang, draft: 0, sent: 0, followup: 0, replied: 0, played: 0, skip: 0, error: 0, bounced: 0 }; by[k][r.status] = (by[k][r.status] || 0) + 1; }
  table(Object.values(by).sort((a, b) => a.wave - b.wave), [['wave', 'đợt', 4], ['lang', 'lang', 6], ['draft', 'draft', 6], ['sent', 'sent', 6], ['followup', 'f-up', 6], ['replied', 'replied', 8], ['played', 'played', 7], ['skip', 'skip', 5], ['error', 'lỗi', 5]]);
  log(`tổng ${rows.length} liên hệ · hôm nay đã gửi ${sentToday()} · key còn ${keysLeft()} · MAIL_VIA=${env('MAIL_VIA', 'dryrun')}`);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  const cmd = a._[0];
  try {
    if (cmd === 'draft') { if (!a['from-csv']) fail('cần --from-csv <file.csv>'); draft({ csv: a['from-csv'], wave: a.wave || 1, lang: a.lang, limit: Number(a.limit || 50), allowGeneric: Boolean(a['allow-generic']), sender: a.sender }); }
    else if (cmd === 'send') await send({ wave: a.wave, limit: Number(a.limit || 50) });
    else if (cmd === 'followup') await followup({ days: Number(a.days || 4), news: a.news || '', limit: Number(a.limit || 50) });
    else if (cmd === 'mark') { if (a._.length < 3) fail('mark <email> <status>'); mark(a._[1], a._[2], a.note); }
    else if (cmd === 'sync-gmail') await syncGmail();
    else if (cmd === 'status' || !cmd) status();
    else fail(`lệnh lạ: ${cmd} (draft | send | followup | mark | sync-gmail | status)`);
  } catch (e) { fail(e.message); }
}
