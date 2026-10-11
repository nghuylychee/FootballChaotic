import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfc-mkt-pub-'));
process.env.SFC_MKT_DATA = tmp;
process.env.SFC_MKT_OUT = path.join(tmp, 'out');
process.env.STEAM_APPID = '7';
process.env.LINK_DOMAIN = '';
process.env.CLIP_DIRS = tmp;
process.env.GOOGLE_CLIENT_ID = 'id'; process.env.GOOGLE_CLIENT_SECRET = 'sec';

const { zonedToUtc, localDate, tzOffsetMin } = await import('../publish/time.js');
const { add, nextSlots, QUEUE, CHANNELS } = await import('../publish/add.js');
const { runOnce } = await import('../publish/run.js');
const { readJsonl } = await import('../lib/jsonl.js');
const { mock } = await import('../lib/http.js');

test('giờ địa phương -> UTC: São Paulo (UTC-3), Tokyo (UTC+9), New York đổi giờ mùa hè', () => {
  assert.equal(zonedToUtc('2026-11-03', '19:00', 'America/Sao_Paulo').toISOString(), '2026-11-03T22:00:00.000Z');
  assert.equal(zonedToUtc('2026-11-03', '20:00', 'Asia/Tokyo').toISOString(), '2026-11-03T11:00:00.000Z');
  assert.equal(tzOffsetMin('America/New_York', Date.parse('2026-07-01T12:00:00Z')), -240);
  assert.equal(tzOffsetMin('America/New_York', Date.parse('2026-12-01T12:00:00Z')), -300);
  assert.equal(localDate('Asia/Tokyo', Date.parse('2026-11-03T20:00:00Z')), '2026-11-04');
});

test('nextSlots: bỏ slot đã qua, không trùng, tôn trọng maxPerDay', () => {
  const from = new Date('2026-11-03T12:00:00Z'); // 09:00 São Paulo
  const slots = nextSlots('tt-br', [], { count: 6, from });
  assert.equal(slots[0], '2026-11-03T14:30:00.000Z'); // 11:30 BRT
  assert.equal(slots.length, 6);
  const day1 = slots.filter((s) => localDate('America/Sao_Paulo', Date.parse(s)) === '2026-11-03').length;
  assert.equal(day1, CHANNELS['tt-br'].maxPerDay);
  const more = nextSlots('tt-br', slots.map((publishAt) => ({ channel: 'tt-br', publishAt, status: 'queued' })), { count: 1, from });
  assert.ok(!slots.includes(more[0]));
});

test('add: xếp 2 kênh, description có link UTM đúng kênh, title mặc định từ share-copy', () => {
  fs.writeFileSync(path.join(tmp, 'R12.mp4'), 'x');
  fs.writeFileSync(path.join(tmp, 'R12.jpg'), 'y');
  const rows = add({ clip: 'R12', channels: ['yt-en', 'tt-br'] });
  assert.equal(rows.length, 2);
  assert.ok(rows[0].description.includes('utm_source=yt') && rows[0].description.includes('utm_medium=en'));
  assert.ok(rows[1].description.includes('utm_source=tt') && rows[1].description.includes('utm_medium=ptbr'));
  assert.ok(rows[1].pinned.includes('Street Football Chaos'));
  assert.equal(rows[0].poster, path.join(tmp, 'R12.jpg'));
  assert.ok(rows[0].title.length > 2);
  assert.equal(readJsonl(QUEUE()).length, 2);
});

test('run: kênh manual ra thẻ đăng tay; YouTube upload (mock) -> scheduled + thumbnail', async () => {
  const soon = new Date(Date.now() + 60 * 60000).toISOString();      // YouTube: upload trước 24 h -> tới lượt
  const now3 = new Date(Date.now() + 3 * 60000).toISOString();        // TikTok: chỉ xử lý 5 phút trước giờ đăng
  add({ clip: 'R12', channels: ['tt-br'], at: now3 });
  add({ clip: 'R12', channels: ['yt-en'], at: soon });
  // giả lập đã đăng nhập Google
  fs.writeFileSync(path.join(tmp, 'google-token.json'), JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_at: Date.now() + 3600e3 }));
  const calls = [];
  mock.handler = async (url, opts) => {
    calls.push(`${opts.method} ${url.split('?')[0]}`);
    if (url.includes('/upload/youtube/v3/videos')) return { status: 200, body: '', headers: { location: 'https://upload.example/session1' } };
    if (url.startsWith('https://upload.example/session1')) return { status: 200, body: { id: 'VID123', status: { privacyStatus: 'private' } } };
    if (url.includes('/thumbnails/set')) return { status: 200, body: {} };
    return { status: 404, body: 'no' };
  };
  const n = await runOnce();
  mock.handler = null;
  const rows = readJsonl(QUEUE());
  const manual = rows.find((r) => r.channel === 'tt-br' && r.publishAt === now3);
  assert.equal(manual.status, 'manual');
  assert.ok(fs.existsSync(manual.card));
  const ytRow = rows.find((r) => r.channel === 'yt-en' && r.publishAt === soon);
  assert.equal(ytRow.status, 'scheduled');
  assert.equal(ytRow.youtubeId, 'VID123');
  assert.ok(calls.some((c) => c.includes('/thumbnails/set')));
  assert.ok(n >= 2);
});
