/* Tool 4b: nhập CSV xuất từ Steamworks (không có API) vào data/steam-*.jsonl cho dashboard.
 *   Steamworks > Marketing & Visibility > Wishlists > "Download as CSV" (theo ngày và theo quốc gia)
 *   Steamworks > Marketing & Visibility > UTM Analytics > export
 *   node analytics/steam-import.js data/steam/wishlists-by-day.csv data/steam/wishlists-by-country.csv data/steam/utm.csv
 * Tool đoán loại file theo tiêu đề cột (date / country / utm_source ...). Nếu đoán sai: --as wishlists|countries|utm. */
import '../lib/env.js';
import fs from 'node:fs';
import { args, log, warn, fail } from '../lib/log.js';
import { upsertJsonl } from '../lib/jsonl.js';
import { parseCsv } from '../lib/csv.js';
import { dataFile } from '../lib/paths.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const pick = (row, ...names) => {
  const keys = Object.keys(row);
  for (const n of names) { const k = keys.find((x) => norm(x) === norm(n)) || keys.find((x) => norm(x).includes(norm(n))); if (k !== undefined) return row[k]; }
  return undefined;
};
const num = (v) => { const n = Number(String(v ?? '').replace(/[,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
const isoDate = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10); };

export function detect(rows) {
  const h = Object.keys(rows[0] || {}).map(norm).join('|');
  if (/utmsource|utmmedium|utmcampaign/.test(h)) return 'utm';
  if (/country|region/.test(h)) return 'countries';
  if (/date|day/.test(h) && /wishlist|add/.test(h)) return 'wishlists';
  return null;
}

export function convert(kind, rows) {
  if (kind === 'wishlists') return rows.map((r) => ({ date: isoDate(pick(r, 'date', 'day')), adds: num(pick(r, 'adds', 'wishlist additions', 'additions', 'wishlists')), deletes: num(pick(r, 'deletes', 'deletions', 'removals')), purchases: num(pick(r, 'purchases & activations', 'purchases', 'activations')), gifts: num(pick(r, 'gifts')), total: num(pick(r, 'total', 'outstanding', 'balance')) })).filter((r) => r.date);
  if (kind === 'countries') return rows.map((r) => ({ country: pick(r, 'country', 'region'), adds: num(pick(r, 'adds', 'wishlist additions', 'wishlists', 'additions')), deletes: num(pick(r, 'deletes', 'deletions')), total: num(pick(r, 'total', 'outstanding')), pct: num(pick(r, 'percent', '%', 'share')), asOf: new Date().toISOString().slice(0, 10) })).filter((r) => r.country);
  if (kind === 'utm') return rows.map((r) => ({ date: pick(r, 'date') ? isoDate(pick(r, 'date')) : null, source: pick(r, 'utm_source', 'source'), medium: pick(r, 'utm_medium', 'medium'), campaign: pick(r, 'utm_campaign', 'campaign'), content: pick(r, 'utm_content', 'content'), term: pick(r, 'utm_term', 'term'), visits: num(pick(r, 'visits', 'total visits', 'page visits')), trackedVisits: num(pick(r, 'tracked visits')), wishlists: num(pick(r, 'wishlists', 'wishlist adds', 'wishlist additions')), purchases: num(pick(r, 'purchases', 'activations')) })).filter((r) => r.source);
  throw new Error(`loại lạ: ${kind}`);
}

export function importFile(file, as) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!rows.length) { warn(`${file}: rỗng`); return 0; }
  const kind = as || detect(rows);
  if (!kind) { warn(`${file}: không đoán được loại (cột: ${Object.keys(rows[0]).join(', ')}); dùng --as`); return 0; }
  const out = convert(kind, rows);
  const key = kind === 'wishlists' ? (r) => r.date : kind === 'countries' ? (r) => `${r.asOf}|${r.country}` : (r) => `${r.date}|${r.source}|${r.medium}|${r.campaign}|${r.content}|${r.term}`;
  const res = upsertJsonl(dataFile(`steam-${kind}.jsonl`), out, key);
  log(`${file} -> steam-${kind}.jsonl: +${res.added} / cập nhật ${res.updated}`);
  return out.length;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  if (!a._.length) fail('cho đường dẫn CSV: node analytics/steam-import.js <file.csv> [...] [--as wishlists|countries|utm]');
  for (const f of a._) importFile(f, a.as);
}
