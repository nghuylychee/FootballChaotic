/* Log gọn cho CLI. */
const stamp = () => new Date().toISOString().slice(11, 19);

export const log = (...a) => console.log(`[${stamp()}]`, ...a);
export const warn = (...a) => console.warn(`[${stamp()}] !`, ...a);
export function fail(msg, code = 1) {
  console.error(`[${stamp()}] LỖI:`, msg);
  process.exit(code);
}

// in bảng text đơn giản: rows = mảng object, cols = [[key, tiêu đề, độ rộng]]
export function table(rows, cols) {
  const line = cols.map(([, title, w]) => String(title).padEnd(w)).join('  ');
  console.log(line);
  console.log('-'.repeat(line.length));
  for (const r of rows) {
    console.log(cols.map(([k, , w]) => {
      let s = r[k] == null ? '' : String(r[k]);
      if (s.length > w) s = s.slice(0, w - 1) + '…';
      return s.padEnd(w);
    }).join('  '));
  }
}

// đọc tham số dòng lệnh: --key value | --flag | vị trí. Trả về { _: [...], key: value }
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[k] = true;
      else { out[k] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

// --lang pt,es -> ['pt','es']
export const list = (v) => (v == null || v === true ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));
