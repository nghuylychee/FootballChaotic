/* Tool 10: một trang HTML tĩnh từ dữ liệu cục bộ (không cần server): wishlist/ngày và theo quốc gia (CSV Steam đã nhập),
 * wishlist theo UTM, top clip theo "hỏi tên game / 1.000 view", hàng đợi đăng, outreach theo đợt, streamer đã tìm.
 *   node dashboard/build.js      -> out/dashboard.html (mở bằng trình duyệt; chạy lại mỗi sáng sau khi kéo số)
 * Gợi ý cron sáng: node analytics/youtube-pull.js && node analytics/comments.js && node dashboard/build.js */
import '../lib/env.js';
import fs from 'node:fs';
import { log } from '../lib/log.js';
import { readJsonl } from '../lib/jsonl.js';
import { dataFile, outFile } from '../lib/paths.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-US'));

function sparkline(values, { w = 320, h = 60, color = 'var(--accent)' } = {}) {
  if (!values.length) return '<em class="mute">chưa có số</em>';
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * (w - 4) + 2},${h - 2 - (v / max) * (h - 8)}`);
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts.join(' ')}"/><text x="${w - 2}" y="12" text-anchor="end" font-size="11" fill="var(--mute)">max ${fmt(max)}</text></svg>`;
}
function bars(rows, { label, value, w = 320 } = {}) {
  if (!rows.length) return '<em class="mute">chưa có số</em>';
  const max = Math.max(...rows.map((r) => r[value]), 1);
  return `<table class="bars">${rows.map((r) => `<tr><td>${esc(r[label])}</td><td style="width:${w}px"><div class="bar" style="width:${(r[value] / max * 100).toFixed(1)}%"></div></td><td class="num">${fmt(r[value])}</td></tr>`).join('')}</table>`;
}
function tbl(rows, cols) {
  if (!rows.length) return '<em class="mute">chưa có dữ liệu</em>';
  return `<table><thead><tr>${cols.map(([, t]) => `<th>${esc(t)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map(([k]) => `<td>${typeof r[k] === 'number' ? fmt(r[k]) : esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);

export function build() {
  const wl = readJsonl(dataFile('steam-wishlists.jsonl')).sort((a, b) => a.date.localeCompare(b.date));
  const countries = readJsonl(dataFile('steam-countries.jsonl'));
  const latestAsOf = countries.reduce((m, r) => (r.asOf > m ? r.asOf : m), '');
  const countryRows = countries.filter((r) => r.asOf === latestAsOf).sort((a, b) => b.adds - a.adds).slice(0, 12);
  const utm = readJsonl(dataFile('steam-utm.jsonl'));
  const bySource = Object.values(utm.reduce((m, r) => { const k = `${r.source}/${r.medium}`; m[k] = m[k] || { k, visits: 0, wishlists: 0 }; m[k].visits += r.visits; m[k].wishlists += r.wishlists; return m; }, {})).sort((a, b) => b.wishlists - a.wishlists).slice(0, 15);
  const metrics = readJsonl(dataFile('yt-metrics.jsonl'));
  const latest = {};
  for (const m of metrics) if (!latest[m.videoId] || m.date > latest[m.videoId].date) latest[m.videoId] = m;
  const comments = readJsonl(dataFile('comments.jsonl'));
  const asks = comments.reduce((m, c) => { m[c.videoId] = m[c.videoId] || { ask: 0, neg: 0, n: 0 }; m[c.videoId].n++; if (c.ask) m[c.videoId].ask++; if (c.neg) m[c.videoId].neg++; return m; }, {});
  const clips = Object.values(latest).map((v) => ({ ...v, ask: (asks[v.videoId] || {}).ask || 0, neg: (asks[v.videoId] || {}).neg || 0, askPer1k: v.views ? +(((asks[v.videoId] || {}).ask || 0) / v.views * 1000).toFixed(2) : 0 })).sort((a, b) => b.views - a.views);
  const queue = readJsonl(dataFile('publish-queue.jsonl'));
  const upcoming = queue.filter((r) => ['queued', 'scheduled', 'manual'].includes(r.status)).sort((a, b) => a.publishAt.localeCompare(b.publishAt)).slice(0, 20);
  const outreach = readJsonl(dataFile('outreach.jsonl'));
  const waves = Object.values(outreach.reduce((m, r) => { const k = `${r.wave}|${r.lang}`; m[k] = m[k] || { wave: r.wave, lang: r.lang, total: 0, sent: 0, replied: 0, played: 0 }; m[k].total++; if (['sent', 'followup', 'replied', 'played'].includes(r.status)) m[k].sent++; if (['replied', 'played'].includes(r.status)) m[k].replied++; if (r.status === 'played') m[k].played++; return m; }, {})).map((w) => ({ ...w, rate: w.sent ? `${(w.replied / w.sent * 100).toFixed(0)}%` : '–' }));
  const streamers = readJsonl(dataFile('streamers.jsonl'));
  const tiers = streamers.reduce((m, s) => { m[s.tier] = (m[s.tier] || 0) + 1; return m; }, {});
  const last7 = wl.slice(-7), prev7 = wl.slice(-14, -7);
  const kpi = [
    ['Wishlist cộng dồn', wl.length ? fmt(wl[wl.length - 1].total || sum(wl, 'adds') - sum(wl, 'deletes')) : '–', 'từ CSV Steam'],
    ['Wishlist 7 ngày', wl.length ? fmt(sum(last7, 'adds')) : '–', prev7.length ? `7 ngày trước: ${fmt(sum(prev7, 'adds'))}` : ''],
    ['Video đã đăng', fmt(queue.filter((r) => ['live', 'scheduled', 'processing'].includes(r.status)).length), `${fmt(upcoming.length)} sắp đăng`],
    ['View YouTube (tổng)', fmt(sum(Object.values(latest), 'views')), `${fmt(Object.keys(latest).length)} video`],
    ['Comment hỏi game', fmt(comments.filter((c) => c.ask).length), `${fmt(comments.length)} comment`],
    ['Outreach', `${fmt(sum(waves, 'replied'))}/${fmt(sum(waves, 'sent'))}`, 'trả lời / đã gửi'],
    ['Streamer tìm được', fmt(streamers.length), `S ${tiers.S || 0} · A ${tiers.A || 0} · B ${tiers.B || 0}`],
  ];
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SFC wishlist dashboard</title>
<style>
:root{--bg:#f6f4f1;--card:#fff;--ink:#1b1820;--mute:#6b6573;--line:#e4dfd8;--accent:#d9304a}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#140c16;--card:#1f1b22;--ink:#f1edf4;--mute:#a39cab;--line:#322c37;--accent:#ff5a72}}
:root[data-theme="dark"]{--bg:#140c16;--card:#1f1b22;--ink:#f1edf4;--mute:#a39cab;--line:#322c37;--accent:#ff5a72}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:0 auto;padding:20px 16px 60px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px;color:var(--mute);text-transform:uppercase;letter-spacing:.04em}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}.kpi b{display:block;font-size:24px}.kpi span{color:var(--mute);font-size:12px}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;overflow:auto}
table{border-collapse:collapse;width:100%}td,th{padding:4px 8px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}th{color:var(--mute);font-weight:600;font-size:12px}td.num{text-align:right}
.bars td{border:0;padding:2px 6px}.bar{height:12px;background:var(--accent);border-radius:3px;min-width:2px}.mute{color:var(--mute)}
</style></head><body><main>
<h1>Street Football Chaos · wishlist dashboard</h1><div class="mute">cập nhật ${new Date().toLocaleString('vi-VN')} · dữ liệu: tools/mkt/data/</div>
<h2>Tổng quan</h2><div class="kpis">${kpi.map(([t, v, s]) => `<div class="kpi"><span>${esc(t)}</span><b>${v}</b><span>${esc(s)}</span></div>`).join('')}</div>
<div class="row">
<div class="card"><h2>Wishlist / ngày</h2>${sparkline(wl.map((r) => r.adds))}<div class="mute">${wl.length ? `${wl[0].date} → ${wl[wl.length - 1].date}` : 'nhập CSV: node analytics/steam-import.js'}</div></div>
<div class="card"><h2>Theo quốc gia${latestAsOf ? ` (${latestAsOf})` : ''}</h2>${bars(countryRows, { label: 'country', value: 'adds' })}</div>
<div class="card"><h2>Wishlist theo UTM (source/medium)</h2>${bars(bySource, { label: 'k', value: 'wishlists' })}</div>
</div>
<h2>Clip: view và "hỏi tên game" / 1.000 view</h2><div class="card">${tbl(clips.slice(0, 40), [['clip', 'clip'], ['channel', 'kênh'], ['views', 'views'], ['avgViewPct', '% xem'], ['likes', 'like'], ['comments', 'cmt'], ['ask', 'hỏi game'], ['askPer1k', 'hỏi/1k'], ['neg', 'neg'], ['subsGained', 'sub+'], ['title', 'title']])}</div>
<div class="row">
<div class="card"><h2>Sắp đăng</h2>${tbl(upcoming, [['local', 'giờ địa phương'], ['channel', 'kênh'], ['status', 'trạng thái'], ['clip', 'clip'], ['title', 'title']])}</div>
<div class="card"><h2>Outreach theo đợt</h2>${tbl(waves, [['wave', 'đợt'], ['lang', 'lang'], ['total', 'liên hệ'], ['sent', 'đã gửi'], ['replied', 'trả lời'], ['played', 'đã chơi'], ['rate', 'tỉ lệ']])}</div>
</div>
<h2>Streamer tier S/A chưa liên hệ</h2><div class="card">${tbl(streamers.filter((s) => ['S', 'A'].includes(s.tier) && !s.status).sort((a, b) => b.score - a.score).slice(0, 30).map((s) => ({ ...s, url: s.url, email: s.email || '' })), [['tier', 'tier'], ['score', 'điểm'], ['platform', 'nền tảng'], ['name', 'tên'], ['lang', 'lang'], ['subs', 'sub'], ['avgViewers', 'xem tb'], ['email', 'email'], ['url', 'url']])}</div>
</main></body></html>`;
  const file = outFile('dashboard.html');
  fs.writeFileSync(file, html);
  return file;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) log('dashboard ->', build());
