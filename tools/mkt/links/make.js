/* Sinh link cho một đợt đăng / một đợt mail, in ra bảng để dán.
 *   node links/make.js --source yt --medium ptbr R12 R13 G1_B3     -> link ngắn + URL đầy đủ cho từng clip
 *   node links/make.js --source mail --medium ptbr airton rodrigao  -> cho streamer
 *   node links/make.js --alias discord --to https://discord.gg/xxx --no-utm   -> thêm bí danh vào links.json (cần deploy lại Worker)
 * LINK_DOMAIN trong .env (vd. sfc.gg); chưa có domain thì in URL đầy đủ để dùng tạm. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../lib/env.js';
import { args, table, fail } from '../lib/log.js';
import { shortCode, buildUrl, steamBase, SOURCES, MEDIUMS } from '../lib/utm.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, 'links.json');
const a = args();

if (a.alias) {
  const links = JSON.parse(fs.readFileSync(file, 'utf8'));
  const entry = {};
  if (a.to) entry.to = a.to;
  if (a.source) entry.source = a.source;
  if (a.medium) entry.medium = a.medium;
  if (a.content) entry.content = a.content;
  if (a.campaign) entry.campaign = a.campaign;
  if (a['no-utm']) entry.utm = false;
  links[a.alias] = entry;
  fs.writeFileSync(file, JSON.stringify(links, null, 2) + '\n');
  console.log(`đã thêm bí danh "${a.alias}" vào links.json ->`, entry, '\nnhớ `npx wrangler deploy` trong tools/mkt/links');
  process.exit(0);
}

const source = a.source || 'yt', medium = a.medium || 'en';
if (!SOURCES.includes(source)) fail(`source phải là một trong: ${SOURCES.join(', ')}`);
if (!MEDIUMS.includes(medium)) fail(`medium phải là một trong: ${MEDIUMS.join(', ')}`);
const base = steamBase({ STEAM_URL: env('STEAM_URL'), STEAM_APPID: env('STEAM_APPID'), FALLBACK_URL: env('FALLBACK_URL', 'https://team41.itch.io/sfc') });
const domain = env('LINK_DOMAIN', '');
const contents = a._.length ? a._ : [undefined];
const rows = contents.map((content) => {
  const code = shortCode({ source, medium, content });
  return {
    code,
    short: domain ? `https://${domain}/${code}` : '(chưa đặt LINK_DOMAIN)',
    full: buildUrl(base, { source, medium, content, campaign: a.campaign || env('CAMPAIGN', 'prelaunch') }),
  };
});
table(rows, [['code', 'mã', 22], ['short', 'link ngắn', 34], ['full', 'URL đầy đủ (dán tạm khi chưa có domain)', 110]]);
