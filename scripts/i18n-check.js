/* Kiểm tra bản dịch (quy trình: docs/LOCALIZATION.md)
 *   node scripts/i18n-check.js                  tóm tắt từng ngôn ngữ + lỗi / cảnh báo
 *   node scripts/i18n-check.js --missing es     liệt kê chuỗi chưa dịch của 1 ngôn ngữ (kèm chỗ dùng)
 *   node scripts/i18n-check.js --long           thêm danh sách bản dịch dài hơn hẳn tiếng Anh (dễ tràn khung)
 *   node scripts/i18n-check.js --sheet file.csv bảng duyệt cho người bản xứ: key · chỗ dùng · tiếng Anh · từng ngôn ngữ
 *   node scripts/i18n-check.js --extract file.json  danh sách chuỗi nguồn (cho công cụ dịch / người dịch)
 * Chuỗi nguồn gom từ:
 *   - code (src/**, trừ src/dev, src/i18n, src/core/i18n.js): SFC.t / _t · SFC.tc / _tc · SFC.tn / _tn · SFC.N_ với chuỗi viết thẳng
 *   - chữ bay trong trận: mọi chuỗi trong lời gọi .text( .comic( .callout( (trừ mã màu) — dịch lúc vẽ
 *   - config: các đường dẫn trong src/i18n/fields.js (chạy config/*.js trong vm theo thứ tự của index.html)
 * LỖI (exit 1): lệch biến {x} · lệch thẻ HTML · lệch *từ khoá* · giá trị sai kiểu.
 * Cảnh báo: chưa dịch · bản dịch thừa (không còn dùng) · sai thuật ngữ (cột Lint ✓ trong docs/i18n/GLOSSARY.md)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1] || true; };

/* ---------------- đọc chuỗi viết thẳng trong code ---------------- */
// s[i] là dấu nháy mở -> { value, end } (end = sau dấu nháy đóng) · template có ${} -> dynamic
function readLiteral(s, i) {
  const q = s[i];
  let out = '', j = i + 1, dynamic = false;
  const ESC = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '`': '`', $: '$' };
  for (; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') { const n = s[++j]; out += ESC[n] != null ? ESC[n] : n; continue; }
    if (q === '`' && c === '$' && s[j + 1] === '{') dynamic = true;
    if (c === q) return { value: out, end: j + 1, dynamic };
    out += c;
  }
  return null;
}
function skipWs(s, i) { while (i < s.length && /\s/.test(s[i])) i++; return i; }
// đọc các tham số chuỗi đầu tiên của lời gọi bắt đầu ngay sau '(' ở vị trí i
function literalArgs(s, i, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    i = skipWs(s, i);
    if (!/['"`]/.test(s[i])) return out;
    const lit = readLiteral(s, i);
    if (!lit || lit.dynamic) return out;
    out.push(lit.value);
    i = skipWs(s, lit.end);
    if (s[i] !== ',') return out;
    i++;
  }
  return out;
}
// đoạn văn bản của lời gọi (từ '(' tới ')' khớp), bỏ qua ngoặc trong chuỗi
function callBody(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === "'" || c === '"' || c === '`') { const lit = readLiteral(s, j); if (!lit) return ''; j = lit.end - 1; continue; }
    if (c === '(') depth++;
    if (c === ')' && --depth === 0) return s.slice(i, j + 1);
  }
  return '';
}
function allLiterals(body) {
  const out = [];
  for (let j = 0; j < body.length; j++) {
    if (!/['"`]/.test(body[j])) continue;
    const lit = readLiteral(body, j);
    if (!lit) break;
    if (!lit.dynamic) out.push(lit.value);
    j = lit.end - 1;
  }
  return out;
}

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? jsFiles(p) : d.name.endsWith('.js') ? [p] : [];
  });
}

const sources = new Map();   // key -> { en, other?, ctx?, where: Set, kind }
function addSource(key, info, where) {
  let s = sources.get(key);
  if (!s) sources.set(key, (s = Object.assign({ where: new Set() }, info)));
  s.where.add(where);
}
const dynamicCalls = [];

const SKIP = ['src/dev/', 'src/i18n/', 'src/core/i18n.js'];
for (const file of jsFiles(path.join(ROOT, 'src'))) {
  const r = rel(file);
  if (SKIP.some((p) => r.startsWith(p))) continue;
  const s = fs.readFileSync(file, 'utf8');
  const line = (i) => s.slice(0, i).split('\n').length;
  const re = /(?:\bSFC\.|(?<![\w.$])_)(t|tc|tn|N_)\(/g;
  let m;
  while ((m = re.exec(s))) {
    const fn = m[1], at = m.index + m[0].length, where = `${r}:${line(m.index)}`;
    if (fn === 't' || fn === 'N_') {
      const [en] = literalArgs(s, at, 1);
      if (en == null) { dynamicCalls.push(where); continue; }
      addSource(en, { en, kind: 'code' }, where);
    } else if (fn === 'tc') {
      const [ctx, en] = literalArgs(s, at, 2);
      if (en == null) { dynamicCalls.push(where); continue; }
      addSource(`${ctx}|${en}`, { en, ctx, kind: 'code' }, where);
    } else {
      const [one, other] = literalArgs(s, at, 2);
      if (other == null) { dynamicCalls.push(where); continue; }
      addSource(one, { en: one, other, kind: 'plural' }, where);
    }
  }
  // chữ bay trong trận (effects.text / comic / callout): dịch lúc vẽ
  const fx = /\.(text|comic|callout)\(/g;
  while ((m = fx.exec(s))) {
    const body = callBody(s, m.index + m[0].length - 1);
    for (const str of allLiterals(body)) {
      if (!/[A-Za-z]/.test(str) || /^#[0-9a-f]{3,8}$/i.test(str) || str !== str.trim()) continue;   // ' HIT!' = mảnh ghép số
      addSource(str, { en: str, kind: 'callout' }, `${r}:${line(m.index)}`);
    }
  }
}

/* ---------------- config (vm) ---------------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((x) => x[1]);
const sandbox = { console, SFC: { I18n: {} } };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const src of scripts.filter((x) => x.startsWith('config/')).concat('src/i18n/fields.js')) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src });
}
const CONFIG = sandbox.SFC_CONFIG, FIELDS = sandbox.SFC.I18n.fields || [];
function walk(obj, parts, i, trail, cb) {
  if (!obj || typeof obj !== 'object') return;
  const k = parts[i];
  for (const key of k === '*' ? Object.keys(obj) : [k]) {
    if (!(key in obj)) continue;
    const t = trail.concat(Array.isArray(obj) ? `[${key}]` : key);
    if (i === parts.length - 1) { if (typeof obj[key] === 'string') cb(obj[key], t); } else walk(obj[key], parts, i + 1, t, cb);
  }
}
for (const f of FIELDS) {
  const [spec, max] = f.split('@'), [p, ctx] = spec.split('#');
  walk(CONFIG, p.split('.'), 0, [], (en, t) => {
    if (!en.trim()) return;
    const key = ctx ? `${ctx}|${en}` : en;
    addSource(key, { en, ctx, kind: 'config' }, 'config:' + t.join('.').replace(/\.\[/g, '['));
    if (max) sources.get(key).max = Math.min(sources.get(key).max || Infinity, +max);
  });
}

/* ---------------- bản dịch ---------------- */
const packs = [];
const dictCtx = { SFC: { I18n: { add: (p) => packs.push(p) } } };
dictCtx.window = dictCtx;
vm.createContext(dictCtx);
for (const src of scripts.filter((x) => x.startsWith('src/i18n/') && !x.endsWith('fields.js'))) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), dictCtx, { filename: src });
}

/* ---------------- thuật ngữ (docs/i18n/GLOSSARY.md, dòng có Lint ✓) ---------------- */
function glossary() {
  const file = path.join(ROOT, 'docs', 'i18n', 'GLOSSARY.md');
  if (!fs.existsSync(file)) return [];
  const rows = [];
  let head = null;
  for (const ln of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!ln.trim().startsWith('|')) { head = null; continue; }
    const cells = ln.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (!head) { head = cells; continue; }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const row = {};
    head.forEach((h, i) => { row[h] = (cells[i] || '').replace(/`/g, ''); });
    if (/✓/.test(row.Lint || '') && row.English) rows.push(row);
  }
  return rows;
}
const GLOSS = glossary();
const norm = (s) => s.normalize('NFC').toLowerCase();
const variants = (cell) => cell.split('/').map((x) => norm(x.replace(/\(.*?\)/g, '').trim())).filter(Boolean);
const wordRe = (w) => new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu');

/* ---------------- so khớp ---------------- */
const tokens = (s, re) => (s.match(re) || []).sort().join(' ');
const VARS = /\{[\w.+%-]+\}/g, TAGS = /<\/?[a-z][^>]*>/gi, STARS = /\*[^*]+\*/g;
const visible = (s) => s.replace(VARS, 'xx').replace(TAGS, '');

const errors = [], report = {};
for (const p of packs) {
  const R = report[p.id] = { missing: [], unused: [], long: [], gloss: [], done: 0 };
  for (const [key, src] of sources) {
    const v = p.strings[key];
    if (v == null) { R.missing.push(key); continue; }
    R.done++;
    const forms = typeof v === 'string' ? [v] : (v && typeof v === 'object' ? Object.values(v) : null);
    if (!forms || !forms.every((x) => typeof x === 'string')) { errors.push(`${p.id}: giá trị sai kiểu — ${JSON.stringify(key)}`); continue; }
    if (typeof v === 'object' && src.kind !== 'plural') errors.push(`${p.id}: dạng số nhiều cho chuỗi không phải tn() — ${JSON.stringify(key)}`);
    const enAll = src.kind === 'plural' ? [src.en, src.other] : [src.en];
    for (const f of forms) {
      // số nhiều: được bỏ {n} (vd. "uma carta"), các biến khác phải đủ
      const want = tokens(enAll.join(' '), VARS).split(' ').filter(Boolean);
      const uniq = [...new Set(want)], has = new Set(f.match(VARS) || []);
      const lack = uniq.filter((x) => !has.has(x) && !(src.kind === 'plural' && x === '{n}'));
      const extra = [...has].filter((x) => !uniq.includes(x));
      if (lack.length || extra.length) errors.push(`${p.id}: biến lệch ${lack.length ? 'thiếu ' + lack.join(',') : ''}${extra.length ? ' thừa ' + extra.join(',') : ''} — ${JSON.stringify(key)} → ${JSON.stringify(f)}`);
      if (tokens(f, TAGS) !== tokens(src.en, TAGS)) errors.push(`${p.id}: thẻ HTML lệch — ${JSON.stringify(key)} → ${JSON.stringify(f)}`);
      if ((f.match(STARS) || []).length !== (src.en.match(STARS) || []).length) errors.push(`${p.id}: *từ khoá* lệch — ${JSON.stringify(key)} → ${JSON.stringify(f)}`);
      const a = visible(src.en).length, b = visible(f).length;
      if (src.max && b > src.max) errors.push(`${p.id}: dài ${b} > ${src.max} ký tự (chỗ hiển thị cố định) — ${JSON.stringify(key)} → ${JSON.stringify(f)}`);
      if (b > a * 1.4 && b - a > 6) R.long.push(`${Math.round((b / a) * 100)}% ${JSON.stringify(src.en)} → ${JSON.stringify(f)}`);
    }
    // thuật ngữ: câu tiếng Anh có từ trong bảng -> bản dịch phải có 1 trong các cách dịch đã chốt
    const text = norm(forms.join(' '));
    for (const g of GLOSS) {
      const cell = g[p.id];
      if (!cell || /^[—-]$/.test(cell)) continue;
      const en = variants(g.English);
      if (!en.some((w) => wordRe(w).test(norm(src.en.replace(VARS, ' '))))) continue;   // bỏ tên biến ({stun}, {area}...)
      if (!variants(cell).some((w) => text.includes(w))) R.gloss.push(`${g.English} → ${cell}: ${JSON.stringify(src.en)} → ${JSON.stringify(forms.join(' | '))}`);
    }
  }
  for (const key of Object.keys(p.strings)) if (!sources.has(key)) R.unused.push(key);
}

/* ---------------- xuất ---------------- */
const where = (key) => [...sources.get(key).where].slice(0, 3).join(', ') + (sources.get(key).where.size > 3 ? ` (+${sources.get(key).where.size - 3})` : '');

if (opt('--extract')) {
  const out = [...sources].map(([key, s]) => ({ key, en: s.en, other: s.other, ctx: s.ctx, kind: s.kind, where: [...s.where] }));
  fs.writeFileSync(opt('--extract'), JSON.stringify(out, null, 1));
  console.log(`${out.length} chuỗi nguồn -> ${opt('--extract')}`);
}
if (opt('--sheet')) {
  const q = (x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`;
  const val = (v) => (v == null ? '' : typeof v === 'string' ? v : Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(' | '));
  const rows = [['key', 'where', 'en'].concat(packs.map((p) => p.id))];
  for (const [key, s] of sources) rows.push([key, [...s.where].join(' '), s.kind === 'plural' ? `one: ${s.en} | other: ${s.other}` : s.en].concat(packs.map((p) => val(p.strings[key]))));
  fs.writeFileSync(opt('--sheet'), '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n'));
  console.log(`bảng duyệt: ${rows.length - 1} dòng -> ${opt('--sheet')}`);
}

const kinds = {};
for (const s of sources.values()) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
console.log(`Chuỗi nguồn: ${sources.size} (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(' · ')}) · thuật ngữ kiểm: ${GLOSS.length}`);
// dịch biến lúc vẽ (chữ bay, banner sự kiện): chuỗi đã gom ở chỗ tạo ra nó — có lời gọi lạ ngoài các chỗ này thì nên xem lại
if (dynamicCalls.length) console.log(`  (dịch biến lúc vẽ: ${dynamicCalls.join(', ')})`);
for (const p of packs) {
  const R = report[p.id];
  console.log(`\n[${p.id}] ${p.name}: đã dịch ${R.done}/${sources.size} (${Math.round((R.done / sources.size) * 100)}%) · thiếu ${R.missing.length} · thừa ${R.unused.length} · sai thuật ngữ ${R.gloss.length} · dài ${R.long.length}`);
  if (opt('--missing') === p.id) R.missing.forEach((k) => console.log(`  - ${JSON.stringify(k)}  @ ${where(k)}`));
  R.unused.forEach((k) => console.log(`  thừa: ${JSON.stringify(k)}`));
  R.gloss.forEach((x) => console.log(`  thuật ngữ: ${x}`));
  if (opt('--long')) R.long.forEach((x) => console.log(`  dài: ${x}`));
}
if (errors.length) {
  console.log(`\nLỖI (${errors.length}):`);
  errors.forEach((e) => console.log('  ' + e));
  process.exit(1);
}
console.log('\nKhông có lỗi.');
