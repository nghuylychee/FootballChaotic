/* Cloudflare Worker: domain ngắn -> trang Steam kèm UTM. Deploy: `npx wrangler deploy` trong tools/mkt/links (xem wrangler.toml).
 *   GET /yt-ptbr-R12        -> 302 Steam ?utm_source=yt&utm_medium=ptbr&utm_campaign=prelaunch&utm_content=R12&utm_term=w46
 *   GET /play               -> bí danh trong links.json
 *   GET /                   -> HOME_URL
 *   GET /_stats?token=...   -> số lượt bấm theo mã (cần KV binding CLICKS + STATS_TOKEN)
 * Thêm mã theo quy ước thì KHÔNG cần deploy lại; chỉ bí danh mới cần. */
import { resolve, NOT_FOUND_HTML } from './resolve.js';
import links from './links.json';

async function bump(env, code) {
  if (!env.CLICKS) return;
  try {
    const cur = Number(await env.CLICKS.get(code)) || 0;
    await env.CLICKS.put(code, String(cur + 1));
  } catch { /* đếm sai một lượt không sao */ }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect(env.HOME_URL || env.FALLBACK_URL || 'https://team41.itch.io/sfc', 302);
    }
    if (url.pathname === '/_stats') {
      if (!env.STATS_TOKEN || url.searchParams.get('token') !== env.STATS_TOKEN) return new Response('forbidden', { status: 403 });
      if (!env.CLICKS) return Response.json({ error: 'no KV binding CLICKS' }, { status: 500 });
      const out = {};
      let cursor;
      do {
        const page = await env.CLICKS.list({ cursor });
        for (const k of page.keys) out[k.name] = Number(await env.CLICKS.get(k.name)) || 0;
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return Response.json(out, { headers: { 'cache-control': 'no-store' } });
    }
    const query = Object.fromEntries(url.searchParams.entries());
    const r = resolve(url.pathname, { links, env, now: new Date(), query });
    if (!r) return new Response(NOT_FOUND_HTML, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
    ctx.waitUntil(bump(env, r.code));
    return new Response(null, { status: 302, headers: { location: r.to, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer-when-downgrade' } });
  },
};
