/* Đường dẫn dùng chung cho mọi tool: ROOT = tools/mkt, DATA = dữ liệu cục bộ (không commit), OUT = file sinh ra (không commit). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(ROOT, '..', '..');
export const DATA = process.env.SFC_MKT_DATA || path.join(ROOT, 'data');   // SFC_MKT_DATA: test trỏ sang thư mục tạm
export const OUT = process.env.SFC_MKT_OUT || path.join(ROOT, 'out');

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const dataFile = (name) => path.join(ensureDir(DATA), name);
export const outFile = (name) => path.join(ensureDir(OUT), name);

// yyyy-mm-dd theo giờ địa phương (tên file, cột ngày)
export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
