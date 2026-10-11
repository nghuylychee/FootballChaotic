import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfc-mkt-mail-'));
process.env.SFC_MKT_DATA = tmp;
process.env.MAIL_VIA = 'dryrun';
process.env.STEAM_APPID = '999';
process.env.LINK_DOMAIN = 'sfc.gg';
process.env.MAIL_DAILY_CAP = '2';
process.env.MAIL_DELAY_MS = '0';
process.env.SFC_MKT_OUT = path.join(tmp, 'out');

const { loadTemplate, render, linksFor, draft, send, followup, rfc822, STORE } = await import('../outreach/mail.js');
const { readJsonl } = await import('../lib/jsonl.js');
const { toCsv } = await import('../lib/csv.js');

test('template 4 ngôn ngữ đọc được, đủ subject + body + followup, không còn biến lạ', () => {
  for (const lang of ['pt-BR', 'en', 'es', 'ja']) {
    const t = loadTemplate(lang);
    assert.ok(t.subject.length > 10, lang);
    assert.ok(t.body.includes('{{web_link}}') && t.body.includes('{{key}}') && t.body.includes('{{personal_line}}'), lang);
    assert.ok(t.followup.includes('{{followup_news}}'), lang);
    const m = render(t, { name: 'A', personal_line: 'p', key: 'K', sender: 'S', followup_news: 'n', web_link: 'w', steam_link: 's', presskit_link: 'pk', policy_link: 'pol', discord_link: 'd' });
    assert.ok(!/\{\{\w+\}\}/.test(m.body + m.followup), `${lang} còn biến chưa điền`);
  }
});

test('link theo kênh: domain ngắn cho Steam, UTM đầy đủ cho web', () => {
  const l = linksFor({ handle: 'Airton_Silva', lang: 'pt' });
  assert.equal(l.steam_link, 'https://sfc.gg/mail-pt-airton_silva');
  assert.ok(l.web_link.includes('utm_source=mail') && l.web_link.includes('utm_medium=pt') && l.web_link.includes('utm_content=airton_silva'));
});

test('draft chỉ nhận dòng có personal_line; send tôn trọng trần ngày và phát key; followup sau N ngày', async () => {
  const csv = path.join(tmp, 's.csv');
  fs.writeFileSync(csv, toCsv([
    { name: 'João', handle: 'joao', email: 'joao@mail.com', lang: 'pt', personal_line: 'Vi seu vídeo do Rematch de ontem, aquele gol de bicicleta foi absurdo.' },
    { name: 'Sem Linha', handle: 'x', email: 'x@mail.com', lang: 'pt', personal_line: '' },
    { name: 'Dup', handle: 'joao2', email: 'JOAO@mail.com', lang: 'pt', personal_line: 'oi' },
    { name: 'Carlos', handle: 'carlos', email: 'carlos@mail.com', lang: 'es', personal_line: 'Vi tu directo de Rocket League.' },
    { name: 'Ken', handle: 'ken', email: 'ken@mail.jp', lang: 'ja', personal_line: '先日のRematch配信を拝見しました。' },
  ]));
  fs.writeFileSync(path.join(tmp, 'keys.txt'), 'AAAAA-BBBBB-CCCCC\nDDDDD-EEEEE-FFFFF\n');
  const d = draft({ csv, wave: 1, limit: 10, sender: 'Long' });
  assert.equal(d.length, 3);
  assert.equal(d[0].tplLang, 'pt-BR');
  assert.ok(d[0].body.includes('Vi seu vídeo do Rematch'));
  assert.ok(d[2].subject.includes('Steamキー'));
  assert.ok(fs.existsSync(path.join(tmp, 'out', 'mail', `${d[0].id}.eml`)), 'file .eml xem trước');

  const sent = await send({ wave: 1, limit: 10 });
  assert.equal(sent.length, 2, 'trần 2 mail/ngày');
  const rows = readJsonl(STORE());
  assert.equal(rows.filter((r) => r.status === 'sent').length, 2);
  assert.equal(rows.find((r) => r.email === 'joao@mail.com').key, 'AAAAA-BBBBB-CCCCC');
  assert.equal(rows.filter((r) => r.status === 'draft').length, 1);

  // chưa tới hạn -> không follow-up; lùi sentAt 5 ngày -> follow-up (nhưng hôm nay hết suất)
  assert.equal((await followup({ days: 4, news: 'x' })).length, 0);
  const old = rows.map((r) => (r.status === 'sent' ? { ...r, sentAt: new Date(Date.now() - 5 * 86400000).toISOString() } : r));
  fs.writeFileSync(STORE(), old.map((r) => JSON.stringify(r)).join('\n') + '\n');
  assert.equal((await followup({ days: 4, news: 'x', cap: 0 })).length, 0, 'hết suất hôm nay');
  const f = await followup({ days: 4, news: 'Data de lançamento: 29/1.', cap: 10 });
  assert.equal(f.length, 2);
  assert.equal(readJsonl(STORE()).filter((r) => r.status === 'followup').length, 2);
});

test('rfc822: subject unicode mã hóa, body base64', () => {
  const raw = rfc822({ from: 'A <a@x.com>', to: 'B <b@y.com>', subject: 'Futebol de rua — key', text: 'olá' });
  assert.ok(raw.includes('Subject: =?UTF-8?B?'));
  assert.ok(raw.includes('Content-Transfer-Encoding: base64'));
});
