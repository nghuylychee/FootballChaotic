/* Tool 8: từ presskit/facts.json sinh ra mọi copy và trang press kit, để không bao giờ lệch số liệu giữa các nơi (2v2 / 3v3, 53 / 54 Core...).
 *   node presskit/build.js
 * Ra:
 *   out/presskit/index.html (+ index.pt-BR.html, index.es.html, index.ja.html, index.zh-CN.html) · streaming-policy.html · img/ (ảnh từ tools/itch-page/out)
 *   out/copy/steam-store.<lang>.md     mô tả ngắn + dài + tag cho Steamworks (dán tay)
 *   out/copy/social.<lang>.md          bio kênh, pinned comment, description, hashtag, câu trả lời "what game?" với link UTM đúng kênh
 *   out/copy/fact-sheet.md             một trang cho press / mail
 * Đưa out/presskit/ lên GitHub Pages (thư mục presskit/ cạnh bản web) là có link press kit + streaming policy. */
import '../lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../lib/env.js';
import { log } from '../lib/log.js';
import { outFile, ensureDir, REPO } from '../lib/paths.js';
import { buildUrl, steamBase, mediumOf } from '../lib/utm.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const FACTS = JSON.parse(fs.readFileSync(path.join(here, 'facts.json'), 'utf8'));
const LANGS = ['en', 'pt-BR', 'es', 'ja', 'zh-CN'];
const SOCIAL_LANGS = ['en', 'pt-BR', 'es', 'ja', 'hi'];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function links() {
  const steam = steamBase({ STEAM_URL: env('STEAM_URL'), STEAM_APPID: env('STEAM_APPID'), FALLBACK_URL: env('FALLBACK_URL', FACTS.links.itch) });
  return { ...FACTS.links, steam, steamLive: Boolean(env('STEAM_URL') || env('STEAM_APPID')), web: env('WEB_URL', FACTS.links.web), discord: env('DISCORD_URL', ''), contact: env('CONTACT_EMAIL', ''), domain: env('LINK_DOMAIN', '') };
}

// link cho một kênh (source) + ngôn ngữ: domain ngắn nếu có, không thì URL đầy đủ có UTM
export function channelLinks(source, lang) {
  const L = links();
  const medium = mediumOf(lang);
  const campaign = env('CAMPAIGN', 'prelaunch');
  return {
    steam: L.domain ? `https://${L.domain}/${source}-${medium}` : buildUrl(L.steam, { source, medium, campaign }),
    web: L.domain ? `https://${L.domain}/${source}-${medium}-play` : buildUrl(L.web, { source, medium, campaign, content: 'play' }),
  };
}

/* ---------------- press kit HTML ---------------- */
const CSS = `
:root{--bg:#f6f4f1;--card:#fff;--ink:#1b1820;--mute:#6b6573;--line:#e4dfd8;--red:#d9304a;--gold:#c99a00}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#140c16;--card:#1f1b22;--ink:#f1edf4;--mute:#a39cab;--line:#322c37;--red:#ff5a72;--gold:#ffe14f}}
:root[data-theme="dark"]{--bg:#140c16;--card:#1f1b22;--ink:#f1edf4;--mute:#a39cab;--line:#322c37;--red:#ff5a72;--gold:#ffe14f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:960px;margin:0 auto;padding:24px 16px 64px}header{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
nav a{margin-right:12px;color:var(--mute);text-decoration:none;font-size:14px}nav a.on{color:var(--red);font-weight:700}
h1{font-size:28px;margin:8px 0 4px}h2{font-size:20px;margin:36px 0 12px;border-bottom:1px solid var(--line);padding-bottom:6px}
.tag{color:var(--red);font-weight:700}.lead{font-size:18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.card h3{margin:0 0 6px;font-size:16px}.card p{margin:0;color:var(--mute);font-size:15px}
table{border-collapse:collapse;width:100%}td,th{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:15px}th{width:220px;color:var(--mute);font-weight:600}
figure{margin:0}figure img{width:100%;border-radius:8px;border:1px solid var(--line);image-rendering:pixelated}figcaption{font-size:13px;color:var(--mute);margin-top:4px}
.btn{display:inline-block;background:var(--red);color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;margin:4px 8px 4px 0}
.btn.alt{background:transparent;color:var(--red);border:2px solid var(--red)}kbd{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:1px 6px;font-family:ui-monospace,monospace}
footer{margin-top:48px;color:var(--mute);font-size:13px}`;

function page(lang) {
  const T = FACTS.text[lang], N = FACTS.numbers, L = links();
  const file = lang === 'en' ? 'index.html' : `index.${lang}.html`;
  const nav = LANGS.map((l) => `<a href="${l === 'en' ? 'index.html' : `index.${l}.html`}" class="${l === lang ? 'on' : ''}">${{ en: 'English', 'pt-BR': 'Português (BR)', es: 'Español', ja: '日本語', 'zh-CN': '简体中文' }[l]}</a>`).join('');
  const facts = [
    ['Developer', `${FACTS.developer} (${FACTS.location})`], ['Release', FACTS.release[lang]], ['Price', FACTS.price[lang]], ['Platforms', FACTS.platforms[lang]],
    ['Players', `${N.players} · online ranked + private rooms · co-op vs bots`], ['Languages', FACTS.languages], ['Match', `${N.matchSeconds} s · FINAL PUSH ${N.finalPushSeconds} s`],
    ['Content', `${N.cores} Cores · ${N.ultimates} ultimates · ${N.areas} Areas · ${N.teams} teams`], ['Steam', `<a href="${esc(L.steam)}">${esc(L.steam)}</a>${L.steamLive ? '' : ' (store page coming soon)'}`],
    ['Browser demo', `<a href="${esc(L.web)}">${esc(L.web)}</a> · <a href="${esc(L.itch)}">${esc(L.itch)}</a>`],
    [T.contactLabel, L.contact ? `<a href="mailto:${esc(L.contact)}">${esc(L.contact)}</a>` : '<em>CONTACT_EMAIL chưa điền trong .env</em>'],
  ];
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(FACTS.name)} press kit</title><meta name="description" content="${esc(T.short)}"><style>${CSS}</style></head><body><main>
<header><div><img src="img/logo.png" alt="${esc(FACTS.name)}" style="height:72px;image-rendering:pixelated"><h1>${esc(FACTS.name)} <span class="tag">press kit</span></h1></div><nav>${nav}</nav></header>
<p class="lead"><strong>${esc(T.tagline)}</strong> ${esc(T.pitch)}</p>
<p><a class="btn" href="${esc(L.web)}">▶ Play the browser demo</a><a class="btn alt" href="${esc(L.steam)}">Steam</a><a class="btn alt" href="streaming-policy.html">${esc(T.policyTitle)}</a><a class="btn alt" href="img/">All images</a></p>
<h2>Fact sheet</h2><table>${facts.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('')}</table>
<h2>Description</h2>${T.long.map((p) => `<p>${esc(p)}</p>`).join('')}
<h2>Features</h2><div class="grid">${T.features.map((f) => `<div class="card"><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></div>`).join('')}</div>
${FACTS.trailerYouTubeId ? `<h2>Trailer</h2><div style="aspect-ratio:16/9"><iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${esc(FACTS.trailerYouTubeId)}" title="Trailer" frameborder="0" allowfullscreen></iframe></div>` : ''}
<h2>Screenshots</h2><div class="grid">${FACTS.screenshots.map((s) => `<figure><a href="img/${s.file}"><img src="img/${s.file}" alt="${esc(s.caption[lang] || s.caption.en)}" loading="lazy"></a><figcaption>${esc(s.caption[lang] || s.caption.en)}</figcaption></figure>`).join('')}</div>
<p><a href="img/logo.png">logo.png</a> · <a href="img/banner.png">banner.png</a> · <a href="img/cover.png">cover.png</a></p>
<h2>Controls</h2><table>${T.controls.map(([k, v]) => `<tr><th><kbd>${esc(k)}</kbd></th><td>${esc(v)}</td></tr>`).join('')}</table>
<h2>About ${esc(FACTS.developer)}</h2><p>${esc(T.about)}</p>
<footer>© ${new Date().getFullYear()} ${esc(FACTS.developer)}. ${L.discord ? `<a href="${esc(L.discord)}">Discord</a> · ` : ''}<a href="streaming-policy.html">${esc(T.policyTitle)}</a></footer>
</main></body></html>`;
  return { file, html };
}

function policyPage() {
  const L = links();
  const blocks = ['en', 'ja', 'pt-BR', 'es', 'zh-CN'].map((lang) => {
    const T = FACTS.text[lang];
    return `<section id="${lang}"><h2>${esc(T.policyTitle)} <small style="color:var(--mute);font-weight:400">(${{ en: 'English', ja: '日本語', 'pt-BR': 'Português', es: 'Español', 'zh-CN': '简体中文' }[lang]})</small></h2><ol>${T.policy.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></section>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(FACTS.name)} streaming policy / 配信ガイドライン</title><style>${CSS}</style></head><body><main>
<header><h1>${esc(FACTS.name)} <span class="tag">streaming &amp; video policy</span></h1><nav><a href="index.html">← press kit</a><a href="#en">EN</a><a href="#ja">日本語</a><a href="#pt-BR">PT</a><a href="#es">ES</a><a href="#zh-CN">中文</a></nav></header>
<p class="lead">Short version: yes, you can stream it, make videos, and monetize them. No permission needed.</p>${blocks}
<p>${L.contact ? `Questions: <a href="mailto:${esc(L.contact)}">${esc(L.contact)}</a>` : ''} · Last updated ${new Date().toISOString().slice(0, 10)}</p></main></body></html>`;
}

/* ---------------- copy files ---------------- */
function steamStoreMd(lang) {
  const T = FACTS.text[lang], N = FACTS.numbers;
  const bb = (f) => `[h3]${f.h}[/h3]\n${f.p}`;
  return `# Steam store copy · ${lang}\n\n> Dán vào Steamworks > Store Page > Description. Bản ${lang === 'en' ? 'gốc' : 'dịch, cần người bản xứ duyệt'}.\n\n## Short description (${T.short.length}/300 ký tự)\n\n${T.short}\n\n## About this game (BBCode Steam)\n\n[b]${T.tagline}[/b]\n\n${T.long.map((p) => p).join('\n\n')}\n\n[h2]${lang === 'en' ? 'Features' : ''}[/h2]\n\n${T.features.map(bb).join('\n\n')}\n\n[h2]Numbers[/h2]\n[list]\n[*]${N.players} · ${N.matchSeconds}-second matches · FINAL PUSH in the last ${N.finalPushSeconds} s\n[*]${N.cores} Cores · ${N.ultimates} ultimates\n[*]${N.areas} Areas · ${N.teams} teams\n[*]${FACTS.languages}\n[/list]\n\n## Tags (thứ tự = độ quan trọng, 5 tag đầu nặng nhất)\n\n${FACTS.steamTags.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n## Nhớ\n- Không đặt link ngoài trong mô tả (Steam cấm từ 8/2024).\n- GIF: dropkick vào tường · màn draft Core · 3 Ultimate · FINAL PUSH. Mỗi GIF < 3 MB (pipeline brag-output/hook-test render được).\n`;
}

function socialMd(lang) {
  const S = FACTS.social[lang];
  const plat = { yt: 'YouTube Shorts', tt: 'TikTok', ig: 'Instagram Reels', x: 'X (Twitter)' };
  const fill = (tpl, l) => tpl.replace('{web}', l.web).replace('{steam}', l.steam);
  let md = `# Social copy · ${lang}\n\n> Sinh từ facts.json + quy ước UTM. Link đã gắn utm_source theo kênh và utm_medium=${mediumOf(lang)}.${links().domain ? '' : ' Chưa có LINK_DOMAIN nên dùng URL đầy đủ; đặt domain ngắn thì chạy lại.'}\n\n## Bio kênh (mọi nền tảng)\n\n${S.bio}\n\n`;
  for (const [src, name] of Object.entries(plat)) {
    const l = channelLinks(src, lang);
    md += `## ${name}\n\n**Pinned comment / comment đầu**\n\n${fill(S.pinned, l)}\n\n**Description**\n\n${fill(S.description, l)}\n${S.hashtags[src] ? `\n**Hashtag**\n\n${S.hashtags[src]}\n` : ''}\n**Trả lời "what game is this?"**\n\n${fill(S.reply, l)}\n\n**Link bio:** ${l.web}\n\n`;
  }
  return md;
}

function factSheetMd() {
  const T = FACTS.text.en, N = FACTS.numbers, L = links();
  return `# ${FACTS.name} — fact sheet\n\n**${T.tagline}** ${T.pitch}\n\n| | |\n|---|---|\n| Developer | ${FACTS.developer}, ${FACTS.location} |\n| Release | ${FACTS.release.en} |\n| Price | ${FACTS.price.en} |\n| Platforms | ${FACTS.platforms.en} |\n| Players | ${N.players}, online ranked + private rooms, co-op vs bots |\n| Match | ${N.matchSeconds} s, FINAL PUSH last ${N.finalPushSeconds} s (goals ×2) |\n| Content | ${N.cores} Cores, ${N.ultimates} ultimates, ${N.areas} Areas, ${N.teams} teams |\n| Languages | ${FACTS.languages} |\n| Steam | ${L.steam}${L.steamLive ? '' : ' (coming soon)'} |\n| Browser demo | ${L.web} |\n| Press kit | ${L.presskit} |\n| Contact | ${L.contact || '(CONTACT_EMAIL)'} |\n\n${T.long.join('\n\n')}\n\n## Features\n\n${T.features.map((f) => `- **${f.h}.** ${f.p}`).join('\n')}\n\n## About\n\n${T.about}\n`;
}

/* ---------------- build ---------------- */
export function build() {
  const pk = ensureDir(outFile('presskit'));
  const img = ensureDir(path.join(pk, 'img'));
  const srcImg = path.join(REPO, 'tools', 'itch-page', 'out');
  for (const f of fs.readdirSync(srcImg)) if (/\.(png|jpg|gif)$/i.test(f)) fs.copyFileSync(path.join(srcImg, f), path.join(img, f));
  fs.writeFileSync(path.join(img, 'index.html'), `<!doctype html><meta charset="utf-8"><title>images</title><style>body{font:14px system-ui;padding:16px}img{max-width:320px;display:block;margin:8px 0;image-rendering:pixelated}</style>${fs.readdirSync(img).filter((f) => /\.(png|jpg|gif)$/i.test(f)).map((f) => `<p><a href="${f}">${f}</a><br><img src="${f}"></p>`).join('')}`);
  const written = [];
  for (const lang of LANGS) { const { file, html } = page(lang); fs.writeFileSync(path.join(pk, file), html); written.push(`presskit/${file}`); }
  fs.writeFileSync(path.join(pk, 'streaming-policy.html'), policyPage()); written.push('presskit/streaming-policy.html');
  const copy = ensureDir(outFile('copy'));
  for (const lang of LANGS) { fs.writeFileSync(path.join(copy, `steam-store.${lang}.md`), steamStoreMd(lang)); written.push(`copy/steam-store.${lang}.md`); }
  for (const lang of SOCIAL_LANGS) { fs.writeFileSync(path.join(copy, `social.${lang}.md`), socialMd(lang)); written.push(`copy/social.${lang}.md`); }
  fs.writeFileSync(path.join(copy, 'fact-sheet.md'), factSheetMd()); written.push('copy/fact-sheet.md');
  return written;
}

// kiểm tra facts.json đủ ngôn ngữ, đủ trường, không còn số cũ
export function lint() {
  const problems = [];
  const keys = Object.keys(FACTS.text.en);
  for (const lang of LANGS) {
    for (const k of keys) if (FACTS.text[lang][k] === undefined) problems.push(`text.${lang}.${k} thiếu`);
    if (FACTS.text[lang].features.length !== FACTS.text.en.features.length) problems.push(`text.${lang}.features khác số mục`);
    if (FACTS.text[lang].short.length > 300) problems.push(`text.${lang}.short dài ${FACTS.text[lang].short.length} > 300 (Steam cắt)`);
  }
  const blob = JSON.stringify(FACTS);
  for (const bad of ['2v2', '53 Cores', '7 ultimates', '1v1']) if (blob.includes(bad)) problems.push(`facts.json còn "${bad}"`);
  return problems;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const problems = lint();
  if (problems.length) { console.error('facts.json có vấn đề:\n - ' + problems.join('\n - ')); process.exit(1); }
  const w = build();
  log(`đã sinh ${w.length} file trong tools/mkt/out/:\n - ` + w.join('\n - '));
  if (!links().steamLive) log('STEAM_URL / STEAM_APPID chưa có: link Steam tạm trỏ về itch. Điền .env rồi chạy lại khi page live.');
}
