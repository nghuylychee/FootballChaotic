/* =========================================================
 * MUSIC CONFIG — nhạc nền tổng hợp bằng WebAudio (src/engine/audio.js -> SFC.Music), không cần file nhạc.
 * menu: phát ở mọi màn ngoài trận (trang chủ, Main Path, Shop, Nhân vật, Settings, phòng chờ online).
 *
 * Cách viết nhạc (mỗi ô nhịp = 16 bước nốt móc kép):
 *   chords   : tên hợp âm -> { root: nốt gốc (không số quãng tám), notes: [các nốt của hợp âm] }
 *   sections : các đoạn nhạc, phát lần lượt theo order rồi lặp lại. Mỗi đoạn:
 *     chords : hợp âm từng ô nhịp (số ô nhịp của đoạn = độ dài mảng này)
 *     drums  : kick / snare / hat — chuỗi 16 ký tự: x = đánh, o = hi-hat mở, . = nghỉ
 *     fill   : (tuỳ chọn) trống thay thế cho ô nhịp cuối đoạn (dồn trống chuyển đoạn)
 *     bass   : chuỗi 16 ký tự: 1 = nốt gốc, 5 = quãng 5, 8 = nốt gốc quãng tám trên, . = nghỉ
 *     stab   : chuỗi 16 ký tự: x = đánh cả hợp âm (ngắn)
 *     arp    : chuỗi 16 chữ số: chỉ số nốt trong hợp âm (vượt số nốt = lên quãng tám), . = nghỉ; arpFrom: bắt đầu từ ô nhịp thứ mấy (0 = đầu)
 *     lead   : giai điệu, mỗi ô nhịp 1 chuỗi 16 token cách nhau bởi dấu cách: nốt (A4, C#5...) · - = ngân tiếp nốt trước · . = nghỉ
 *   instruments: âm sắc + âm lượng từng bè (type: square | triangle | sawtooth | sine; len = số bước nốt ngân)
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.music = {
  enabled: true,
  volume: 0.55,          // so với âm lượng tổng (game.config.js -> audio.volume)
  fadeIn: 1.8,           // giây nhạc lên dần khi về menu
  fadeOut: 0.7,          // giây nhạc tắt dần khi vào trận

  menu: {
    bpm: 98,
    swing: 0.14,         // độ "nhún" hip-hop: nốt móc kép lẻ trễ bấy nhiêu phần của 1 bước
    chords: {
      Am: { root: 'A', notes: ['A3', 'C4', 'E4'] },
      F:  { root: 'F', notes: ['F3', 'A3', 'C4'] },
      C:  { root: 'C', notes: ['C4', 'E4', 'G4'] },
      G:  { root: 'G', notes: ['G3', 'B3', 'D4'] },
      Em: { root: 'E', notes: ['E3', 'G3', 'B3'] },
      E:  { root: 'E', notes: ['E3', 'G#3', 'B3'] },
    },
    order: ['A', 'B'],
    sections: {
      // A: trống + bass + hợp âm, nửa sau thêm arpeggio
      A: {
        chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
        drums: { kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xo' },
        fill:  { kick: 'x.....x.x.x.....', snare: '....x.......xxxx', hat: 'x.x.x.x.x.x.....' },
        bass: '1..1..5.1..8.5..',
        stab: '......x.......x.',
        arp: '0120120120120121', arpFrom: 4,
      },
      // B: giai điệu chính
      B: {
        chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'E', 'E'],
        drums: { kick: 'x.....x.x..x..x.', snare: '....x.......x...', hat: 'xxx.xxx.xxx.xxxo' },
        fill:  { kick: 'x.....x.x.x.x.x.', snare: '....x...x.xxxxxx', hat: 'x.x.x.x.........' },
        bass: '1.11..5.1.11.5.8',
        stab: '......x.......x.',
        lead: [
          'C5 - - A4 - - C5 - D5 - C5 - A4 - - .',
          'B4 - - G4 - - B4 - D5 - - - B4 - - .',
          'E5 - - - D5 - B4 - G4 - - - B4 - - .',
          'A4 - - - - - - - C5 - B4 - A4 - - .',
          'C5 - - A4 - - C5 - F5 - E5 - C5 - - .',
          'D5 - - B4 - - D5 - G5 - F5 - D5 - - .',
          'E5 - - - G#4 - - - B4 - - - D5 - - .',
          'E5 - - - - - - - - - - - . . . .',
        ],
      },
    },
    instruments: {
      kick:  { vol: 0.55, from: 150, to: 45, dur: 0.2 },
      snare: { vol: 0.26, freq: 1800, body: 180, dur: 0.13 },
      hat:   { vol: 0.06, freq: 8000, dur: 0.03, open: 0.14 },
      bass:  { type: 'triangle', vol: 0.34, octave: 2, len: 2 },
      stab:  { type: 'square', vol: 0.045, len: 1 },
      arp:   { type: 'square', vol: 0.03, len: 1 },
      lead:  { type: 'square', vol: 0.065 },
    },
  },
};
