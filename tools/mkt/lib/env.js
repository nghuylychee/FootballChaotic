/* Đọc tools/mkt/.env (KEY=VALUE, # là chú thích) vào process.env nếu chưa có. Xem .env.example để biết cần key gì. */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.js';

const file = path.join(ROOT, '.env');
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

export const env = (key, fallback) => (process.env[key] === undefined || process.env[key] === '' ? fallback : process.env[key]);

export function need(key, hint) {
  const v = env(key);
  if (!v) throw new Error(`Thiếu ${key} trong tools/mkt/.env${hint ? ` (${hint})` : ''}. Chép .env.example thành .env rồi điền.`);
  return v;
}

export const flag = (key) => /^(1|true|yes)$/i.test(env(key, ''));
