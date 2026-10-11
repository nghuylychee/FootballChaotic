import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfc-mkt-pk-'));
process.env.SFC_MKT_OUT = tmp;
process.env.SFC_MKT_DATA = path.join(tmp, 'data');
process.env.STEAM_APPID = '424242';
process.env.LINK_DOMAIN = '';
process.env.CONTACT_EMAIL = 'press@example.com';

const { build, lint, FACTS, channelLinks } = await import('../presskit/build.js');

test('facts.json: đủ 5 ngôn ngữ, không còn số cũ, short ≤ 300 ký tự', () => {
  assert.deepEqual(lint(), []);
  assert.equal(FACTS.numbers.players, '3v3');
  assert.equal(FACTS.numbers.cores, 54);
});

test('build sinh press kit + copy, nội dung có số đúng và link UTM đúng kênh', () => {
  const files = build();
  assert.ok(files.length >= 16, `có ${files.length} file`);
  const en = fs.readFileSync(path.join(tmp, 'presskit', 'index.html'), 'utf8');
  assert.ok(en.includes('54 Cores') && en.includes('3v3') && !en.includes('2v2'));
  assert.ok(en.includes('store.steampowered.com/app/424242'));
  assert.ok(fs.existsSync(path.join(tmp, 'presskit', 'img', 'logo.png')));
  const ja = fs.readFileSync(path.join(tmp, 'presskit', 'index.ja.html'), 'utf8');
  assert.ok(ja.includes('配信・動画投稿ガイドライン'));
  const policy = fs.readFileSync(path.join(tmp, 'presskit', 'streaming-policy.html'), 'utf8');
  assert.ok(policy.includes('Content ID') && policy.includes('id="ja"'));
  const social = fs.readFileSync(path.join(tmp, 'copy', 'social.pt-BR.md'), 'utf8');
  assert.ok(social.includes('utm_source=tt') && social.includes('utm_medium=ptbr'));
  assert.ok(!/\{web\}|\{steam\}/.test(social), 'còn placeholder');
  const store = fs.readFileSync(path.join(tmp, 'copy', 'steam-store.en.md'), 'utf8');
  assert.ok(store.includes('[h3]') && store.includes('Football (Soccer)'));
});

test('channelLinks: domain ngắn khi có LINK_DOMAIN', () => {
  process.env.LINK_DOMAIN = 'sfc.gg';
  const l = channelLinks('yt', 'pt-BR');
  assert.equal(l.steam, 'https://sfc.gg/yt-ptbr');
  assert.equal(l.web, 'https://sfc.gg/yt-ptbr-play');
  process.env.LINK_DOMAIN = '';
});
