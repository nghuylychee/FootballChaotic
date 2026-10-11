/* Lõi của link router, dùng chung cho Cloudflare Worker (worker.js) và server thử cục bộ (serve.js).
 * Không import gì ngoài utm.js để Worker bundle được. */
import { parseCode, buildUrl, isoWeek, steamBase } from '../lib/utm.js';

/**
 * resolve('/yt-ptbr-R12', { links, env, now, query }) -> { code, to, kind } | null
 *  - links[code] (links.json): bí danh đặt tay: { to?, source?, medium?, campaign?, content?, utm?: false }
 *  - mã theo quy ước <source>-<medium>[-<content>] -> tự dựng UTM, không cần sửa links.json
 *  - query.c = campaign (vd. ?c=playtest1), query.x = content ghi đè
 */
export function resolve(pathname, { links = {}, env = {}, now = new Date(), query = {} } = {}) {
  const code = decodeURIComponent(String(pathname || '/')).replace(/^\/+|\/+$/g, '');
  if (!code) return null;
  const base = steamBase(env);
  const term = isoWeek(now);

  const alias = links[code];
  if (alias) {
    const target = alias.to || base;
    if (!target) return null;
    if (alias.utm === false) return { code, to: target, kind: 'alias' };
    return {
      code, kind: 'alias',
      to: buildUrl(target, { source: alias.source || 'direct', medium: alias.medium || 'all', campaign: query.c || alias.campaign || env.CAMPAIGN || 'prelaunch', content: query.x || alias.content, term }),
    };
  }

  const parsed = parseCode(code);
  if (!parsed || !base) return null;
  return {
    code, kind: 'pattern',
    to: buildUrl(base, { ...parsed, campaign: query.c || env.CAMPAIGN || 'prelaunch', content: query.x || parsed.content, term }),
  };
}

export const NOT_FOUND_HTML = `<!doctype html><meta charset="utf-8"><title>Street Football Chaos</title>
<body style="font:16px/1.5 system-ui;background:#140c16;color:#fff;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1 style="color:#ff3d5a">Street Football Chaos</h1><p>Link này không tồn tại / this link does not exist.</p></div></body>`;
