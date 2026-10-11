import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from '../links/resolve.js';
import { parseCode, buildUrl, isoWeek, shortCode, steamBase } from '../lib/utm.js';

const env = { STEAM_APPID: '123456' };
const links = {
  play: { to: 'https://example.com/play', source: 'web', medium: 'all', content: 'play' },
  discord: { to: 'https://discord.gg/abc', utm: false },
  steam: { source: 'direct', medium: 'all' },
};
const now = new Date('2026-11-12T10:00:00Z'); // tuần ISO 46

test('mã theo quy ước dựng UTM đúng và không cần khai báo', () => {
  const r = resolve('/yt-ptbr-R12', { links, env, now });
  const u = new URL(r.to);
  assert.equal(u.origin + u.pathname, 'https://store.steampowered.com/app/123456/');
  assert.equal(u.searchParams.get('utm_source'), 'yt');
  assert.equal(u.searchParams.get('utm_medium'), 'ptbr');
  assert.equal(u.searchParams.get('utm_content'), 'R12');
  assert.equal(u.searchParams.get('utm_campaign'), 'prelaunch');
  assert.equal(u.searchParams.get('utm_term'), 'w46');
  assert.equal(r.kind, 'pattern');
});

test('content có gạch dưới và dấu chấm, campaign ghi đè bằng ?c=', () => {
  const r = resolve('/tt-ja-G1_B3', { links, env, now, query: { c: 'playtest1' } });
  const u = new URL(r.to);
  assert.equal(u.searchParams.get('utm_content'), 'G1_B3');
  assert.equal(u.searchParams.get('utm_campaign'), 'playtest1');
});

test('bí danh: đích riêng, giữ UTM; utm:false thì chuyển thẳng', () => {
  const play = resolve('/play', { links, env, now });
  assert.ok(play.to.startsWith('https://example.com/play?utm_source=web'));
  const dc = resolve('/discord', { links, env, now });
  assert.equal(dc.to, 'https://discord.gg/abc');
  const st = resolve('/steam/', { links, env, now });
  assert.ok(st.to.startsWith('https://store.steampowered.com/app/123456/?utm_source=direct'));
});

test('mã lạ -> null; không có Steam và không có fallback -> null; có fallback thì dùng', () => {
  assert.equal(resolve('/foo-bar', { links, env, now }), null);
  assert.equal(resolve('/yt-en', { links, env: {}, now }), null);
  const r = resolve('/yt-en', { links, env: { FALLBACK_URL: 'https://team41.itch.io/sfc' }, now });
  assert.ok(r.to.startsWith('https://team41.itch.io/sfc?utm_source=yt&utm_medium=en'));
});

test('utm helpers', () => {
  assert.deepEqual(parseCode('ig-es'), { source: 'ig', medium: 'es', content: undefined });
  assert.equal(parseCode('IG-es'), null);
  assert.equal(parseCode('yt-klingon'), null);
  assert.equal(shortCode({ source: 'mail', medium: 'pt-BR', content: 'airton' }), 'mail-ptbr-airton');
  assert.equal(isoWeek(new Date('2026-01-01T12:00:00Z')), 'w01');
  assert.equal(isoWeek(new Date('2026-12-31T12:00:00Z')), 'w53');
  assert.equal(steamBase({ STEAM_URL: 'https://store.steampowered.com/app/1/' }), 'https://store.steampowered.com/app/1/');
  assert.equal(steamBase({}), null);
  const u = new URL(buildUrl('https://store.steampowered.com/app/1/?x=1', { source: 'x', medium: 'ja' }));
  assert.equal(u.searchParams.get('x'), '1');
  assert.equal(u.searchParams.get('utm_medium'), 'ja');
});
