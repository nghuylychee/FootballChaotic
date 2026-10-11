import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfc-mkt-an-'));
process.env.SFC_MKT_DATA = tmp;
process.env.SFC_MKT_OUT = path.join(tmp, 'out');

const { classify } = await import('../analytics/comments.js');
const { detect, convert, importFile } = await import('../analytics/steam-import.js');
const { build } = await import('../dashboard/build.js');
const { readJsonl, writeJsonl } = await import('../lib/jsonl.js');

test('classify: hỏi tên game 6 ngôn ngữ, tiêu cực, đã chơi', () => {
  const asks = ['what game is this??', 'name of the game pls', 'que jogo é esse', 'qual o nome do jogo mano', 'cómo se llama el juego', 'なんのゲームですか', 'kaunsa game hai bhai', 'is it on steam?', '这是什么游戏'];
  for (const t of asks) assert.equal(classify(t).ask, true, t);
  assert.equal(classify('this looks like a fake mobile ad').neg, true);
  assert.equal(classify('joguei ontem, muito bom').played, true);
  assert.equal(classify('lol the keeper').ask, false);
  assert.equal(classify('que jogo é esse').lang, 'pt');
  assert.equal(classify('なんのゲーム').lang, 'ja');
});

test('steam-import: đoán loại CSV và chuẩn hóa', () => {
  const wl = [{ 'Date': '2026-11-10', 'Adds': '120', 'Deletes': '3', 'Purchases & Activations': '0', 'Total': '1,540' }];
  assert.equal(detect(wl), 'wishlists');
  assert.deepEqual(convert('wishlists', wl)[0], { date: '2026-11-10', adds: 120, deletes: 3, purchases: 0, gifts: 0, total: 1540 });
  const utm = [{ 'utm_source': 'yt', 'utm_medium': 'ptbr', 'utm_campaign': 'prelaunch', 'utm_content': 'R12', 'utm_term': 'w46', 'Total Visits': '900', 'Wishlists': '41' }];
  assert.equal(detect(utm), 'utm');
  assert.equal(convert('utm', utm)[0].wishlists, 41);
  const cc = [{ 'Country': 'Brazil', 'Wishlist Additions': '300', 'Percent': '22%' }];
  assert.equal(detect(cc), 'countries');
  assert.equal(convert('countries', cc)[0].adds, 300);
  const f = path.join(tmp, 'wl.csv');
  fs.writeFileSync(f, 'Date,Adds,Deletes\n2026-11-10,120,3\n2026-11-11,90,1\n');
  assert.equal(importFile(f), 2);
  assert.equal(readJsonl(path.join(tmp, 'steam-wishlists.jsonl')).length, 2);
});

test('dashboard build ra HTML với KPI từ dữ liệu', () => {
  writeJsonl(path.join(tmp, 'yt-metrics.jsonl'), [{ date: '2026-11-11', videoId: 'v1', clip: 'R12', channel: 'yt-en', views: 5000, avgViewPct: 80, likes: 100, comments: 20 }]);
  writeJsonl(path.join(tmp, 'comments.jsonl'), [{ id: 'c1', videoId: 'v1', text: 'what game', ask: true, neg: false }, { id: 'c2', videoId: 'v1', text: 'lol', ask: false, neg: false }]);
  const file = build();
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(html.includes('wishlist dashboard'));
  assert.ok(html.includes('R12') && html.includes('5,000'));
  assert.ok(html.includes('0.2')); // 1 hỏi / 5000 view = 0.2 / 1k
});
