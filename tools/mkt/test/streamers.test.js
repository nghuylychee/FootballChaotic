import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

process.env.TWITCH_CLIENT_ID = 'x'; process.env.TWITCH_CLIENT_SECRET = 'y'; process.env.YOUTUBE_API_KEY = 'k';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfc-mkt-'));
process.env.SFC_MKT_DATA = tmp;

const { mock } = await import('../lib/http.js');
const { extractContacts, score } = await import('../streamers/score.js');
const { findTwitch, findYouTube } = await import('../streamers/find.js');

test('extractContacts bắt email và link mạng xã hội', () => {
  const c = extractContacts('Contato: parcerias@exemplo.com.br | twitter.com/x https://instagram.com/airton https://linktr.ee/a img.png');
  assert.equal(c.email, 'parcerias@exemplo.com.br');
  assert.deepEqual(c.links, ['https://instagram.com/airton', 'https://linktr.ee/a']);
});

test('score: kênh YouTube 5k-50k sub, mới đăng, có email -> tier S; kênh khổng lồ -> C', () => {
  const now = Date.parse('2026-11-01T00:00:00Z');
  const s = score({ platform: 'youtube', subs: 20000, lastActive: '2026-10-28T00:00:00Z', email: 'a@b.com', games: ['Rematch'] }, now);
  assert.equal(s.tier, 'S');
  const big = score({ platform: 'youtube', subs: 5_000_000, lastActive: '2026-01-01T00:00:00Z' }, now);
  assert.equal(big.tier, 'C');
  const tw = score({ platform: 'twitch', avgViewers: 60, samples: [{}, {}], lastActive: '2026-10-31T00:00:00Z' }, now);
  assert.equal(tw.tier, 'S');
});

test('findTwitch: token -> games -> streams -> users, gom thành dòng kênh', async () => {
  mock.handler = async (url) => {
    if (url.startsWith('https://id.twitch.tv/oauth2/token')) return { status: 200, body: { access_token: 't', expires_in: 3600 } };
    if (url.includes('/helix/games')) return { status: 200, body: { data: [{ id: '1', name: 'Rematch' }] } };
    if (url.includes('/helix/streams')) return { status: 200, body: { data: [{ id: 's1', user_id: '42', user_login: 'joao', user_name: 'João', game_id: '1', game_name: 'Rematch', title: 'REMATCH RANKED', viewer_count: 35, started_at: '2026-10-11T01:00:00Z', language: 'pt' }], pagination: {} } };
    if (url.includes('/helix/users')) return { status: 200, body: { data: [{ id: '42', login: 'joao', display_name: 'João', description: 'parcerias: joao@mail.com', created_at: '2020-01-01T00:00:00Z' }] } };
    return { status: 404, body: 'no' };
  };
  const rows = await findTwitch({ langs: ['pt'], gameNames: ['Rematch'], pages: 1 });
  mock.handler = null;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, 'twitch:42');
  assert.equal(rows[0].email, 'joao@mail.com');
  assert.equal(rows[0].samples[0].v, 35);
  assert.equal(rows[0].url, 'https://www.twitch.tv/joao');
});

test('findYouTube: search -> channels, lastActive = video mới nhất tìm thấy', async () => {
  mock.handler = async (url) => {
    if (url.includes('/youtube/v3/search')) return { status: 200, body: { items: [
      { id: { videoId: 'v1' }, snippet: { channelId: 'UC1', channelTitle: 'Canal A', title: 'REMATCH é o novo futebol', publishedAt: '2026-10-01T00:00:00Z' } },
      { id: { videoId: 'v2' }, snippet: { channelId: 'UC1', channelTitle: 'Canal A', title: 'Rocket League com amigos', publishedAt: '2026-10-09T00:00:00Z' } },
    ] } };
    if (url.includes('/youtube/v3/channels')) return { status: 200, body: { items: [{ id: 'UC1', snippet: { title: 'Canal A', description: 'contato comercial: canala@gmail.com', customUrl: '@canala', country: 'BR', publishedAt: '2019-01-01T00:00:00Z' },
      statistics: { subscriberCount: '12000', videoCount: '300', viewCount: '5000000' }, brandingSettings: { channel: { keywords: 'futebol games' } }, contentDetails: { relatedPlaylists: { uploads: 'UU1' } } }] } };
    return { status: 404, body: 'no' };
  };
  const rows = await findYouTube({ langs: ['pt'], days: 30, maxSearches: 1 });
  mock.handler = null;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].lastActive, '2026-10-09T00:00:00Z');
  assert.equal(rows[0].url, 'https://www.youtube.com/@canala');
  assert.deepEqual(rows[0].games, ['Rematch', 'Rocket League', 'football']);
  assert.equal(rows[0].email, 'canala@gmail.com');
});
