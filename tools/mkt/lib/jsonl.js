/* Lưu trữ dạng JSON Lines: một object mỗi dòng, dễ grep, dễ mở bằng tay, không cần database. */
import fs from 'node:fs';
import path from 'node:path';

export function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const rows = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* dòng hỏng thì bỏ qua, không làm sập tool */ }
  }
  return rows;
}

export function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
  fs.renameSync(tmp, file);
}

export function appendJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const arr = Array.isArray(rows) ? rows : [rows];
  if (!arr.length) return;
  fs.appendFileSync(file, arr.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

// gộp theo khóa: dòng cũ giữ lại các trường không bị ghi đè; trả về { added, updated, rows }
export function upsertJsonl(file, rows, keyOf, merge = (oldRow, newRow) => ({ ...oldRow, ...newRow })) {
  const existing = readJsonl(file);
  const index = new Map(existing.map((r, i) => [keyOf(r), i]));
  let added = 0, updated = 0;
  for (const r of rows) {
    const k = keyOf(r);
    if (index.has(k)) { existing[index.get(k)] = merge(existing[index.get(k)], r); updated++; }
    else { index.set(k, existing.length); existing.push(r); added++; }
  }
  writeJsonl(file, existing);
  return { added, updated, rows: existing };
}

// cập nhật tại chỗ một số dòng: patch(row) trả về row mới hoặc undefined (giữ nguyên)
export function updateJsonl(file, patch) {
  const rows = readJsonl(file);
  let n = 0;
  const out = rows.map((r) => { const p = patch(r); if (p) { n++; return p; } return r; });
  writeJsonl(file, out);
  return n;
}
