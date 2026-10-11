/* Quy ước UTM dùng chung (mục 12 của kế hoạch):
 *   utm_source   = nền tảng (yt, tt, ig, kwai, x, reddit, discord, itch, crazygames, poki, web, twitch, kick, mail, press)
 *   utm_medium   = ngôn ngữ kênh (en, ptbr, ptpt, es, ja, hi, zh)
 *   utm_campaign = giai đoạn (prelaunch mặc định · pagelive · playtest1 · playtest2 · launch)
 *   utm_content  = ID clip (R12, G1_B3), tên streamer, hay vị trí nút (menu, result, demo_end)
 *   utm_term     = tuần ISO lúc bấm (w46) -> router tự điền, không cần tạo link mới mỗi tuần
 * Mã link ngắn: <source>-<medium>[-<content>]   vd. yt-ptbr-R12  tt-ja  mail-es-airton
 */
export const SOURCES = ['yt', 'tt', 'ig', 'kwai', 'x', 'reddit', 'discord', 'itch', 'crazygames', 'poki', 'web', 'twitch', 'kick', 'mail', 'press', 'direct'];
export const MEDIUMS = ['en', 'ptbr', 'ptpt', 'es', 'ja', 'hi', 'zh', 'vi', 'all'];
export const CAMPAIGNS = ['prelaunch', 'pagelive', 'playtest1', 'playtest2', 'launch'];

// mã ngôn ngữ của game (pt-BR) -> medium (ptbr)
export const mediumOf = (lang) => String(lang || 'en').toLowerCase().replace(/[^a-z]/g, '') || 'en';

export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return 'w' + String(Math.ceil(((d - yearStart) / 86400000 + 1) / 7)).padStart(2, '0');
}

export function parseCode(code) {
  const m = String(code || '').match(/^([a-z]+)-([a-z]+)(?:-([A-Za-z0-9_.]+))?$/);
  if (!m) return null;
  if (!SOURCES.includes(m[1]) || !MEDIUMS.includes(m[2])) return null;
  return { source: m[1], medium: m[2], content: m[3] || undefined };
}

export function buildUrl(base, { source, medium, campaign = 'prelaunch', content, term } = {}) {
  const u = new URL(base);
  if (source) u.searchParams.set('utm_source', source);
  if (medium) u.searchParams.set('utm_medium', medium);
  if (campaign) u.searchParams.set('utm_campaign', campaign);
  if (content) u.searchParams.set('utm_content', content);
  if (term) u.searchParams.set('utm_term', term);
  return u.toString();
}

export const shortCode = ({ source, medium, content }) => `${source}-${mediumOf(medium)}${content ? `-${content}` : ''}`;
export const shortLink = (domain, parts) => `https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/${shortCode(parts)}`;

// trang Steam: STEAM_URL đầy đủ, hoặc ghép từ STEAM_APPID; chưa có thì về FALLBACK_URL (itch / bản web)
export function steamBase({ STEAM_URL, STEAM_APPID, FALLBACK_URL } = {}) {
  if (STEAM_URL) return STEAM_URL;
  if (STEAM_APPID) return `https://store.steampowered.com/app/${STEAM_APPID}/`;
  return FALLBACK_URL || null;
}
