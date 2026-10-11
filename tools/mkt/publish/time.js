/* Giờ địa phương theo múi giờ IANA mà không cần thư viện: đổi "2026-11-03 19:00 ở America/Sao_Paulo" ra UTC và ngược lại. */

export function tzOffsetMin(tz, utcMs) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - utcMs) / 60000);
}

/** 'YYYY-MM-DD', 'HH:MM', tz -> Date (UTC). Chỉnh 2 lần để đúng cả ngày đổi giờ mùa hè. */
export function zonedToUtc(dateStr, timeStr, tz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let utc = wall - tzOffsetMin(tz, wall) * 60000;
  utc = wall - tzOffsetMin(tz, utc) * 60000;
  return new Date(utc);
}

/** ngày địa phương 'YYYY-MM-DD' của một thời điểm */
export function localDate(tz, utcMs = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function fmtLocal(iso, tz) {
  const d = new Date(iso);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// "2026-11-03 19:00" (giờ địa phương tz) hoặc ISO có Z/offset -> Date
export function parseWhen(s, tz) {
  const m = String(s).trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/);
  if (m) return zonedToUtc(m[1], m[2], tz);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`không hiểu thời gian "${s}" (dùng "YYYY-MM-DD HH:MM" theo giờ của kênh, hoặc ISO)`);
  return d;
}
