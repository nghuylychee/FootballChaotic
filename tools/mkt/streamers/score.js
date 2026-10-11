/* Chấm điểm kênh cho outreach. Mục tiêu: kênh NHỎ, đúng ngách, còn hoạt động, liên hệ được (mục 8 của kế hoạch:
 * kênh < 20k sub trả lời ~25%, kênh > 50k ~0,5%). Điểm 0-100, tier S/A/B/C. */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINK_RE = /https?:\/\/[^\s)>\]]+/gi;

export function extractContacts(text = '') {
  const emails = [...new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase()).filter((e) => !/\.(png|jpg|gif)$/.test(e)))];
  const links = [...new Set((text.match(LINK_RE) || []).filter((u) => /twitter\.com|x\.com|instagram\.com|discord\.gg|discord\.com|linktr\.ee|beacons\.ai|tiktok\.com|t\.me|facebook\.com|twitch\.tv|youtube\.com|kick\.com/i.test(u)))];
  return { email: emails[0] || null, emails, links };
}

const daysSince = (iso, now) => (iso ? (now - new Date(iso).getTime()) / 86400000 : Infinity);

export function score(row, now = Date.now()) {
  let s = 0;
  const why = [];
  if (row.platform === 'youtube') {
    const n = row.subs;
    if (n == null) { s += 15; why.push('sub ẩn'); }
    else if (n >= 5000 && n <= 50000) { s += 50; why.push('5k-50k sub'); }
    else if (n >= 3000 && n <= 150000) { s += 40; why.push('3k-150k sub'); }
    else if (n > 150000 && n <= 400000) { s += 25; why.push('150k-400k sub'); }
    else if (n > 400000) { s += 5; why.push('kênh quá lớn'); }
    else { s += 10; why.push('< 3k sub'); }
  } else {
    const v = row.avgViewers || 0;
    if (v >= 10 && v <= 200) { s += 50; why.push('10-200 người xem'); }
    else if (v > 200 && v <= 800) { s += 30; why.push('200-800 người xem'); }
    else if (v > 800) { s += 10; why.push('kênh lớn'); }
    else { s += 15; why.push('< 10 người xem'); }
    if ((row.samples || []).length >= 2) { s += 15; why.push('live đều'); }
  }
  const d = daysSince(row.lastActive, now);
  if (d <= 14) { s += 25; why.push('hoạt động 14 ngày'); }
  else if (d <= 45) { s += 10; why.push('hoạt động 45 ngày'); }
  else why.push('lâu không hoạt động');
  if (row.email) { s += 15; why.push('có email'); }
  else if ((row.contacts || []).length) { s += 5; why.push('có link liên hệ'); }
  if ((row.games || []).some((g) => /rematch|rocket league|fc 2|fifa|efootball|football|futebol|fútbol|soccer/i.test(g))) { s += 10; why.push('game bóng đá'); }
  s = Math.min(100, s);
  return { score: s, tier: s >= 75 ? 'S' : s >= 55 ? 'A' : s >= 35 ? 'B' : 'C', why: why.join(', ') };
}
