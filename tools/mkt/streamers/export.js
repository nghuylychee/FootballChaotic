/* Xuất data/streamers.jsonl ra CSV cho team điền "personal_line" (một dòng về video thật của họ) trước khi gửi mail.
 *   node streamers/export.js --tier S,A --lang pt --platform twitch,youtube --min-score 50 --limit 300
 * Ra out/streamers-<ngày>.csv. Nhập lại sau khi điền: node outreach/mail.js draft --from-csv out/streamers-<ngày>.csv */
import '../lib/env.js';
import fs from 'node:fs';
import { args, list, log } from '../lib/log.js';
import { readJsonl } from '../lib/jsonl.js';
import { toCsv } from '../lib/csv.js';
import { outFile, today } from '../lib/paths.js';
import { STORE } from './find.js';

export const COLUMNS = ['key', 'tier', 'score', 'platform', 'name', 'handle', 'url', 'lang', 'country', 'subs', 'avgViewers', 'maxViewers', 'lastActive', 'games', 'email', 'contacts', 'why', 'sampleTitles', 'personal_line', 'notes', 'status'];

export function exportRows({ tiers, langs, platforms, minScore = 0, limit = 1000, onlyContact = false } = {}) {
  let rows = readJsonl(STORE());
  if (tiers && tiers.length) rows = rows.filter((r) => tiers.includes(r.tier));
  if (langs && langs.length) rows = rows.filter((r) => langs.includes(r.lang));
  if (platforms && platforms.length) rows = rows.filter((r) => platforms.includes(r.platform));
  if (onlyContact) rows = rows.filter((r) => r.email || (r.contacts || []).length);
  rows = rows.filter((r) => (r.score || 0) >= minScore && !r.skip).sort((x, y) => (y.score || 0) - (x.score || 0)).slice(0, limit);
  return rows.map((r) => ({ ...r, lastActive: r.lastActive ? r.lastActive.slice(0, 10) : '', personal_line: r.personal_line || '', notes: r.notes || '', status: r.status || '' }));
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const a = args();
  const rows = exportRows({ tiers: list(a.tier), langs: list(a.lang), platforms: list(a.platform), minScore: Number(a['min-score'] || 0), limit: Number(a.limit || 1000), onlyContact: Boolean(a['only-contact']) });
  const file = outFile(`streamers-${today()}.csv`);
  fs.writeFileSync(file, toCsv(rows, COLUMNS));
  log(`${rows.length} kênh -> ${file}`);
}
