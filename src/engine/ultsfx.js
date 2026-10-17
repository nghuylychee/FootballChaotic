/* Tiếng riêng của từng Tuyệt kỹ (user 2026-10-17: mỗi chiêu một tiếng đặc trưng hợp nội dung, không dùng lại tiếng chung).
 * Gọi từ mô phỏng: g.sfx('ult', '<chiêu>.<sự kiện>') -> SFC.Audio.ult(key). Online: tên gửi đi như mọi sfx (net/sync.js), không đổi gói tin;
 * máy chủ riêng không nạp file này (SFC.Audio rỗng) nên không kêu gì ở đó.
 * Tất cả tổng hợp chiptune bằng SFC.Audio.synth (engine/audio.js). Danh sách + mô tả: docs/SFX.md (mục Ultimates).
 * Tiếng va chạm chung (hit, kick...) vẫn giữ ở chỗ va chạm để tay cầm rung như cũ; tiếng ở đây là phần "nhận ra chiêu nào".
 */
window.SFC = window.SFC || {};

(function () {
  if (!SFC.Audio || !SFC.Audio.synth) return;
  const { tone: T, noise: N } = SFC.Audio.synth;
  const P = (id) => (SFC_CONFIG.cores.list[id] || {}).params || {};
  // chuỗi nốt cách nhau step giây (0 / null = nghỉ)
  const seq = (notes, step, o) => notes.forEach((f, i) => f && T(Object.assign({}, o, { freq: f, delay: (o.delay || 0) + i * step })));
  const R = (a, b) => a + Math.random() * (b - a);
  // tiếng nổ trầm dùng chung trong các công thức (độ to v, dài d)
  const boom = (v = 0.3, d = 0.6, delay = 0) => { v *= 0.7; T({ freq: 75, to: 28, dur: d, type: 'sine', vol: v, delay }); N({ dur: d * 1.2, vol: v, freq: 220, type: 'lowpass', delay }); };   // x0.7: đo bằng OfflineAudioContext, tiếng nổ không lấn át tiếng khác

  const LIB = {
    /* ---- cut-in: mỗi trường phái một câu nhạc ngắn (CoreSystem.activateUltimate) ---- */
    'cut.runner'() { N({ dur: 0.3, vol: 0.15, freq: 900, to: 6000, q: 0.7 }); seq([659, 880, 1318, 1760], 0.04, { type: 'sawtooth', dur: 0.1, vol: 0.09 }); },
    'cut.playmaker'() { N({ dur: 0.3, vol: 0.08, freq: 800, to: 4000, q: 0.7 }); seq([523, 659, 784, 1046], 0.07, { type: 'triangle', dur: 0.16, vol: 0.13 }); },
    'cut.striker'() { N({ dur: 0.3, vol: 0.1, freq: 700, to: 5000, q: 0.7 }); [196, 294, 392].forEach((f) => T({ freq: f, dur: 0.4, type: 'square', vol: 0.06 })); T({ freq: 784, dur: 0.3, type: 'square', vol: 0.06, delay: 0.12 }); },
    'cut.brawler'() { N({ dur: 0.12, vol: 0.3, freq: 400 }); T({ freq: 110, to: 55, dur: 0.3, type: 'sawtooth', vol: 0.14 }); [220, 330].forEach((f) => T({ freq: f, dur: 0.35, type: 'square', vol: 0.06, delay: 0.1 })); },
    'cut.launcher'() { T({ freq: 90, to: 360, dur: 0.35, type: 'square', vol: 0.1 }); N({ dur: 0.35, vol: 0.12, freq: 300, to: 3000, q: 0.8 }); },
    'cut.trickster'() { seq([988, 740, 1175, 880], 0.06, { type: 'sine', dur: 0.2, vol: 0.1, vib: 9, vibDepth: 18 }); N({ dur: 0.4, vol: 0.05, freq: 5000, q: 2 }); },
    'cut.iron'() { T({ freq: 523, to: 505, dur: 0.6, type: 'triangle', vol: 0.12 }); T({ freq: 787, to: 770, dur: 0.45, type: 'triangle', vol: 0.07 }); N({ dur: 0.05, vol: 0.25, freq: 3000, q: 2 }); T({ freq: 98, dur: 0.35, type: 'square', vol: 0.08 }); },
    'cut.chaos'() { for (let i = 0; i < 5; i++) T({ freq: R(300, 1600), dur: 0.08, type: Math.random() < 0.5 ? 'square' : 'sawtooth', vol: 0.09, delay: i * 0.05 }); N({ dur: 0.3, vol: 0.08, freq: 2000, q: 0.5 }); },

    /* ---- 1. Light Cycle: rồ máy điện rồi tường sét kêu rè rè ---- */
    'cycle.start'() { T({ freq: 70, to: 520, dur: 0.6, type: 'sawtooth', vol: 0.11, vib: 30, vibDepth: 8 }); N({ dur: 0.5, vol: 0.12, freq: 300, type: 'lowpass' }); },
    'cycle.zap'() { T({ freq: 120, dur: 0.25, type: 'sawtooth', vol: 0.14, vib: 60, vibDepth: 40 }); N({ dur: 0.08, vol: 0.18, freq: 4000, q: 2 }); },
    /* ---- 2. Endless Tiki-Taka: sáo samba mở màn, mỗi đường chuyền một nốt marimba cao dần, kết bằng hợp âm ---- */
    'tiki.start'() { seq([784, 988, 1175, 1568], 0.07, { type: 'sine', dur: 0.12, vol: 0.14 }); },
    'tiki.pass0'() { T({ freq: 523, dur: 0.14, type: 'triangle', vol: 0.18 }); T({ freq: 1046, dur: 0.06, type: 'sine', vol: 0.05 }); },
    'tiki.pass1'() { T({ freq: 659, dur: 0.14, type: 'triangle', vol: 0.18 }); T({ freq: 1318, dur: 0.06, type: 'sine', vol: 0.05 }); },
    'tiki.pass2'() { T({ freq: 784, dur: 0.14, type: 'triangle', vol: 0.18 }); T({ freq: 1568, dur: 0.06, type: 'sine', vol: 0.05 }); },
    'tiki.pass3'() { T({ freq: 988, dur: 0.14, type: 'triangle', vol: 0.18 }); T({ freq: 1976, dur: 0.06, type: 'sine', vol: 0.05 }); },
    'tiki.finale'() { [523, 659, 784, 1046].forEach((f) => T({ freq: f, dur: 0.5, type: 'triangle', vol: 0.08 })); N({ dur: 0.4, vol: 0.08, freq: 3000, q: 0.5 }); },
    /* ---- 3. Meteor Shot: bay vút lên, tiếng rít bom rơi, nổ trầm ---- */
    'meteor.leap'() { N({ dur: 0.4, vol: 0.15, freq: 400, to: 3000, q: 1 }); T({ freq: 300, to: 900, dur: 0.35, type: 'square', vol: 0.05 }); },
    'meteor.fall'() { T({ freq: 2200, to: 300, dur: 0.5, type: 'sine', vol: 0.11 }); },
    'meteor.boom'() { boom(0.32, 0.7); N({ dur: 0.08, vol: 0.2, freq: 3500, type: 'highpass' }); },
    /* ---- 4. Hundred Fists: tràng đấm liên thanh cao dần, cú chốt ---- */
    'fists.pop'() { N({ dur: 0.035, vol: 0.2, freq: R(800, 1400), q: 1.5 }); T({ freq: R(180, 260), dur: 0.03, type: 'square', vol: 0.05 }); },
    'fists.final'() { T({ freq: 160, to: 40, dur: 0.35, type: 'sawtooth', vol: 0.2 }); N({ dur: 0.3, vol: 0.35, freq: 400 }); T({ freq: 1046, dur: 0.2, type: 'square', vol: 0.05, delay: 0.04 }); },
    /* ---- 5. Moon Stomp: dậm đất + tiếng theremin lơ lửng ---- */
    'moon.stomp'() { boom(0.28, 0.45); },
    'moon.float'() { T({ freq: 880, to: 520, dur: 1.6, type: 'sine', vol: 0.09, vib: 5, vibDepth: 30, attack: 0.15 }); T({ freq: 1320, to: 780, dur: 1.6, type: 'sine', vol: 0.03, vib: 5, vibDepth: 40, attack: 0.3 }); },
    /* ---- 6. Clone Army: bụp bụp bụp phân thân hiện ra + tiếng chuông phép ---- */
    'clone.poof'() { for (let i = 0; i < 4; i++) N({ dur: 0.12, vol: 0.24, freq: 1800 - i * 200, q: 0.8, delay: i * 0.06 }); T({ freq: 1318, dur: 0.3, type: 'triangle', vol: 0.06, delay: 0.2 }); },
    'clone.strike'() { seq([988, 1318], 0.05, { type: 'square', dur: 0.06, vol: 0.06 }); },
    /* ---- 7. Titan: lớn dần (bass trượt lên) + bước chân khổng lồ ---- */
    'titan.grow'() { T({ freq: 45, to: 140, dur: 1.0, type: 'sawtooth', vol: 0.13, vib: 8, vibDepth: 5 }); N({ dur: 1.0, vol: 0.14, freq: 200, type: 'lowpass' }); seq([196, 262, 330, 392], 0.18, { type: 'square', dur: 0.2, vol: 0.05 }); },
    'titan.step'() { T({ freq: 70, to: 38, dur: 0.22, type: 'sine', vol: 0.25 }); N({ dur: 0.15, vol: 0.18, freq: 150, type: 'lowpass' }); },
    /* ---- 8. Pitch Tilt: sân nghiêng kêu cót két ---- */
    'tilt.creak'() { T({ freq: 62, to: 44, dur: 0.9, type: 'sawtooth', vol: 0.12, vib: 9, vibDepth: 6 }); N({ dur: 0.9, vol: 0.08, freq: 500, type: 'lowpass' }); T({ freq: 330, to: 250, dur: 0.6, type: 'triangle', vol: 0.04, vib: 14, vibDepth: 12, delay: 0.1 }); },
    /* ---- 9. Comet One-Two: 2 chạm "tích tắc" rồi xe đạp chổng ngược lấp lánh ---- */
    'comet.one'() { T({ freq: 660, dur: 0.05, type: 'square', vol: 0.09 }); },
    'comet.two'() { T({ freq: 880, dur: 0.05, type: 'square', vol: 0.09 }); },
    'comet.bike'() { N({ dur: 0.35, vol: 0.14, freq: 3000, to: 700, q: 1.2 }); T({ freq: 523, to: 1046, dur: 0.3, type: 'triangle', vol: 0.1 }); },
    'comet.strike'() { T({ freq: 1046, dur: 0.25, type: 'square', vol: 0.07 }); T({ freq: 1568, dur: 0.3, type: 'square', vol: 0.05, delay: 0.04 }); N({ dur: 0.4, vol: 0.06, freq: 5000, q: 1, delay: 0.05 }); },
    /* ---- 10. Rising Dragon: móc hàm vút lên + tiếng rồng gầm ---- */
    'dragon.up'() { T({ freq: 180, to: 1400, dur: 0.3, type: 'square', vol: 0.11 }); N({ dur: 0.3, vol: 0.12, freq: 500, to: 3500 }); },
    'dragon.roar'() { T({ freq: 115, to: 70, dur: 0.8, type: 'sawtooth', vol: 0.14, vib: 22, vibDepth: 15 }); N({ dur: 0.8, vol: 0.18, freq: 700, to: 200, type: 'lowpass' }); },
    /* ---- 11. Hurricane Kick: gió lốc hú suốt thời gian xoay ---- */
    'hurricane'() {
      const t = P('hurricane_kick').time || 2;
      N({ dur: t, vol: 0.24, freq: 500, to: 1400, q: 3, attack: 0.2 });
      N({ dur: t, vol: 0.16, freq: 1100, to: 600, q: 4, attack: 0.3 });
      T({ freq: 300, to: 620, dur: t, type: 'sine', vol: 0.07, vib: 5, vibDepth: 80, attack: 0.3 });
    },
    /* ---- 12. Smoke Bomb: "bụp" + khói xì xì ---- */
    'smoke.pop'() { T({ freq: 150, to: 55, dur: 0.15, type: 'sine', vol: 0.22 }); N({ dur: 1.4, vol: 0.13, freq: 3000, type: 'highpass', attack: 0.05 }); N({ dur: 0.9, vol: 0.06, freq: 800, q: 0.5, delay: 0.1 }); },
    /* ---- 13. Iron Chain: xích kêu loảng xoảng + cái móc khoá ---- */
    'chain.rattle'() { for (let i = 0; i < 12; i++) T({ freq: R(2000, 3200), dur: 0.05, type: 'triangle', vol: 0.11, delay: i * 0.03 }); T({ freq: 220, dur: 0.12, type: 'square', vol: 0.08, delay: 0.36 }); T({ freq: 330, dur: 0.1, type: 'square', vol: 0.06, delay: 0.38 }); },
    'chain.trip'() { N({ dur: 0.05, vol: 0.2, freq: 2500, q: 3 }); T({ freq: 1500, to: 1200, dur: 0.12, type: 'triangle', vol: 0.07 }); },
    /* ---- 14. Iron Hammer: búa vù vù mỗi vòng xoay, nện: nổ trầm + tiếng thép + địa chấn ầm ì ---- */
    'hammer.spin'() { N({ dur: 0.3, vol: 0.3, freq: 300, to: 1200, q: 1.5 }); T({ freq: 140, to: 220, dur: 0.25, type: 'sawtooth', vol: 0.04 }); },
    'hammer.slam'() { boom(0.35, 0.8); T({ freq: 520, to: 500, dur: 0.5, type: 'triangle', vol: 0.09 }); T({ freq: 780, dur: 0.4, type: 'triangle', vol: 0.05 }); N({ dur: 1.1, vol: 0.2, freq: 140, type: 'lowpass', delay: 0.1 }); },
    /* ---- 15. Phase Step: cổng "vù-ụp" (chui vào rồi trồi ra) + lấp lánh ---- */
    'phase.blink'() { T({ freq: 1400, to: 220, dur: 0.08, type: 'sine', vol: 0.12 }); T({ freq: 220, to: 1600, dur: 0.1, type: 'sine', vol: 0.1, delay: 0.08 }); N({ dur: 0.12, vol: 0.05, freq: 5000, q: 2, delay: 0.06 }); },
    /* ---- 16. Slingshot: kéo dây cao su kẽo kẹt rồi "boing" bắn đi ---- */
    'sling.stretch'() { T({ freq: 150, to: 460, dur: 0.25, type: 'sine', vol: 0.1, vib: 18, vibDepth: 10 }); },
    'sling.release'() { T({ freq: 380, dur: 0.5, type: 'triangle', vol: 0.18, vib: 25, vibDepth: 60 }); N({ dur: 0.06, vol: 0.15, freq: 2500 }); },
    /* ---- 17. Thunderstorm: tiếng tít cảnh báo, sét nổ "đoàng" + sấm rền ---- */
    'storm.warn'() { T({ freq: 1200, dur: 0.06, type: 'sine', vol: 0.07 }); },
    'storm.bolt'() { N({ dur: 0.12, vol: 0.28, freq: 2000, type: 'highpass' }); N({ dur: 1.0, vol: 0.18, freq: 300, type: 'lowpass', delay: 0.05 }); T({ freq: 60, to: 30, dur: 0.5, type: 'sawtooth', vol: 0.08 }); },
    /* ---- 18. Bullet Time: thế giới chậm lại "buuuum" + nhịp tim, kết bằng tiếng nổ siêu thanh ---- */
    'bullet.slow'() { T({ freq: 520, to: 60, dur: 1.0, type: 'sine', vol: 0.13 }); T({ freq: 60, dur: 0.12, type: 'sine', vol: 0.25, delay: 0.15 }); T({ freq: 55, dur: 0.12, type: 'sine', vol: 0.22, delay: 0.4 }); N({ dur: 1.0, vol: 0.05, freq: 1500, to: 300, q: 0.6 }); },
    'bullet.boom'() { N({ dur: 0.05, vol: 0.25, freq: 3500, type: 'highpass' }); N({ dur: 0.45, vol: 0.28, freq: 400, type: 'lowpass' }); T({ freq: 200, to: 40, dur: 0.3, type: 'sawtooth', vol: 0.11 }); },
    /* ---- 19. Rocket Punch: đánh lửa động cơ tên lửa rồi phụt đi ---- */
    'rocket.ignite'() { N({ dur: 0.45, vol: 0.26, freq: 500, type: 'lowpass', attack: 0.1 }); T({ freq: 200, to: 900, dur: 0.45, type: 'sawtooth', vol: 0.08 }); },
    'rocket.launch'() { N({ dur: 0.8, vol: 0.2, freq: 1200, to: 300, q: 0.6 }); T({ freq: 900, to: 400, dur: 0.6, type: 'sawtooth', vol: 0.04 }); },
    'rocket.boom'() { boom(0.32, 0.6); },
    /* ---- 20. Monster Truck: bóp còi 2 tông + máy nổ gầm gừ suốt lúc lái ---- */
    'truck.horn'() { [0, 0.3].forEach((d) => { T({ freq: 330, dur: 0.22, type: 'square', vol: 0.09, delay: d }); T({ freq: 415, dur: 0.22, type: 'square', vol: 0.07, delay: d }); }); },
    'truck.engine'() { const t = P('monster_truck').time || 2.6; T({ freq: 55, to: 70, dur: t, type: 'sawtooth', vol: 0.11, vib: 12, vibDepth: 8 }); N({ dur: t, vol: 0.13, freq: 250, type: 'lowpass' }); },
    'truck.crash'() { boom(0.3, 0.5); for (let i = 0; i < 5; i++) T({ freq: R(1500, 3000), dur: 0.06, type: 'triangle', vol: 0.05, delay: i * 0.04 }); },
    /* ---- 21. Mega Boomerang: tiếng vù vù cánh quạt suốt đường bay, bắt lại "cạch" gỗ ---- */
    'boomer.throw'() { const t = P('mega_boomerang').time || 6; T({ freq: 140, to: 220, dur: t, type: 'sawtooth', vol: 0.05, vib: 16, vibDepth: 50, attack: 0.2 }); N({ dur: t, vol: 0.1, freq: 900, q: 2, attack: 0.2 }); },
    'boomer.catch'() { T({ freq: 180, dur: 0.05, type: 'square', vol: 0.12 }); N({ dur: 0.05, vol: 0.2, freq: 1500, q: 2 }); T({ freq: 600, dur: 0.08, type: 'triangle', vol: 0.06 }); },
    /* ---- 22. Puppet Master: dây bắn "vút" như dây đàn, căng dây cót két, nối xong: hộp nhạc giọng thứ ---- */
    'puppet.shoot'() { T({ freq: 1600, to: 900, dur: 0.14, type: 'sawtooth', vol: 0.07 }); T({ freq: 2400, dur: 0.18, type: 'triangle', vol: 0.03, vib: 30, vibDepth: 40 }); },
    'puppet.link'() { const t = P('puppet_master').link || 0.9; T({ freq: 220, to: 330, dur: t, type: 'triangle', vol: 0.06, vib: 30, vibDepth: 15 }); },
    'puppet.gotcha'() { seq([880, 1046, 1318, 1245], 0.12, { type: 'triangle', dur: 0.22, vol: 0.13 }); },
    'puppet.snap'() { T({ freq: 2000, to: 300, dur: 0.1, type: 'sawtooth', vol: 0.12 }); },
    /* ---- 23. Rage: King Kong gầm + đấm ngực thùng thùng, mỗi cú dậm nổ trầm + đất rền ---- */
    'rage.roar'() { T({ freq: 120, to: 70, dur: 0.9, type: 'sawtooth', vol: 0.16, vib: 25, vibDepth: 20 }); N({ dur: 0.9, vol: 0.2, freq: 400, q: 0.8 }); for (let i = 0; i < 6; i++) T({ freq: 95, to: 60, dur: 0.08, type: 'sine', vol: 0.25, delay: 0.05 + i * 0.09 }); },
    'rage.stomp'() { boom(0.4, 0.7); N({ dur: 1.2, vol: 0.3, freq: 160, type: 'lowpass', delay: 0.05 }); N({ dur: 0.1, vol: 0.18, freq: 900 }); },
    /* ---- 24. Cannonball: đại bác "đoàng" + rít bom rơi + nổ lớn ---- */
    'cannon.fire'() { boom(0.35, 0.5); N({ dur: 0.08, vol: 0.2, freq: 2500, type: 'highpass' }); },
    'cannon.whistle'() { T({ freq: 1800, to: 380, dur: 1.2, type: 'sine', vol: 0.07, delay: 0.25 }); },
    'cannon.boom'() { boom(0.4, 0.9); N({ dur: 0.35, vol: 0.1, freq: 4000, type: 'highpass', delay: 0.05 }); },
    /* ---- 25. Boulder Rider: đá trồi lên, mỗi lần to: rạn đá + nốt cao dần, trượt: chao đảo, vỡ: lạo xạo, cưỡi: lăn ầm ầm ---- */
    'boulder.summon'() { N({ dur: 0.3, vol: 0.2, freq: 400, type: 'lowpass' }); T({ freq: 110, to: 60, dur: 0.3, type: 'sine', vol: 0.18 }); },
    'boulder.grow1'() { N({ dur: 0.15, vol: 0.22, freq: 700 }); T({ freq: 262, dur: 0.15, type: 'square', vol: 0.08 }); },
    'boulder.grow2'() { N({ dur: 0.18, vol: 0.26, freq: 550 }); T({ freq: 330, dur: 0.18, type: 'square', vol: 0.08 }); T({ freq: 392, dur: 0.18, type: 'square', vol: 0.06, delay: 0.05 }); },
    'boulder.grow3'() { N({ dur: 0.25, vol: 0.3, freq: 400 }); seq([392, 523, 659, 784], 0.05, { type: 'square', dur: 0.2, vol: 0.07 }); },
    'boulder.miss'() { T({ freq: 400, dur: 0.35, type: 'sine', vol: 0.09, vib: 9, vibDepth: 70 }); },
    'boulder.crumble'() { for (let i = 0; i < 9; i++) N({ dur: 0.06, vol: 0.2, freq: R(500, 1600), q: 1.5, delay: i * 0.045 }); T({ freq: 90, to: 40, dur: 0.4, type: 'sine', vol: 0.2 }); },
    'boulder.roll'() { const t = P('boulder_shot').time || 4; N({ dur: t, vol: 0.2, freq: 140, type: 'lowpass', attack: 0.1 }); T({ freq: 42, dur: t, type: 'sawtooth', vol: 0.06, vib: 6, vibDepth: 4 }); },
    /* ---- 26. Ghost Hands: giọng ma "uuu" + bàn tay chộp ---- */
    'ghost.rise'() { T({ freq: 350, to: 300, dur: 1.0, type: 'sine', vol: 0.08, vib: 4, vibDepth: 40, attack: 0.3 }); T({ freq: 525, to: 450, dur: 1.0, type: 'sine', vol: 0.04, vib: 4.5, vibDepth: 50, attack: 0.4 }); },
    'ghost.grab'() { N({ dur: 0.1, vol: 0.25, freq: 600 }); T({ freq: 180, to: 90, dur: 0.12, type: 'square', vol: 0.08 }); },
    /* ---- 27. Portal Kicks: cổng mở "vúp" + cú đá xuyên cổng ---- */
    'portal.open'() { T({ freq: 300, to: 1200, dur: 0.15, type: 'sine', vol: 0.08 }); N({ dur: 0.15, vol: 0.05, freq: 4000, q: 3 }); },
    'portal.kick'() { T({ freq: 880, to: 440, dur: 0.08, type: 'square', vol: 0.11 }); N({ dur: 0.05, vol: 0.12, freq: 3000, q: 2 }); },
    /* ---- 28. Earth Spike: đá phun lên lạo xạo + nện đất ---- */
    'spike.erupt'() { N({ dur: 0.25, vol: 0.3, freq: 600, q: 0.7 }); T({ freq: 120, to: 50, dur: 0.25, type: 'sine', vol: 0.24 }); N({ dur: 0.1, vol: 0.12, freq: 2500, type: 'highpass' }); },
    /* ---- 29. Medusa Gaze: rắn rít "xìiii" + hoá đá răng rắc ---- */
    'medusa.hiss'() { N({ dur: 0.6, vol: 0.12, freq: 5000, type: 'highpass', attack: 0.1 }); T({ freq: 1200, to: 1100, dur: 0.5, type: 'sine', vol: 0.03, vib: 12, vibDepth: 40 }); },
    'medusa.stone'() { N({ dur: 0.3, vol: 0.2, freq: 1500, q: 4 }); T({ freq: 90, dur: 0.2, type: 'square', vol: 0.09 }); },
    /* ---- 30. VHS Rewind: dừng băng "u u u" trước khi tua ---- */
    'vhs.stop'() { T({ freq: 420, to: 60, dur: 0.5, type: 'sawtooth', vol: 0.15 }); N({ dur: 0.06, vol: 0.15, freq: 1800, q: 2, delay: 0.5 }); },
    /* ---- 31. Magic Wall Pass: đá vào tường, mỗi bàn tay ma thuật bắt bóng một tiếng chuông cao dần, tới nơi "ta-da" ---- */
    'wall.hand0'() { T({ freq: 784, dur: 0.15, type: 'triangle', vol: 0.13 }); N({ dur: 0.15, vol: 0.04, freq: 6000, q: 2 }); },
    'wall.hand1'() { T({ freq: 988, dur: 0.15, type: 'triangle', vol: 0.13 }); N({ dur: 0.15, vol: 0.04, freq: 6000, q: 2 }); },
    'wall.hand2'() { T({ freq: 1175, dur: 0.15, type: 'triangle', vol: 0.13 }); N({ dur: 0.15, vol: 0.04, freq: 6000, q: 2 }); },
    'wall.arrive'() { seq([1046, 1318, 1568], 0.06, { type: 'triangle', dur: 0.2, vol: 0.12 }); },
    /* ---- 32. Chicken Ray: tia biến hình méo mó + gà kêu "cục ta cục tác" ---- */
    'chicken.ray'() { T({ freq: 600, to: 1200, dur: 0.3, type: 'sine', vol: 0.13, vib: 40, vibDepth: 200 }); T({ freq: 300, to: 600, dur: 0.3, type: 'square', vol: 0.03, vib: 40, vibDepth: 100 }); },
    'chicken.bawk'() { T({ freq: 900, to: 700, dur: 0.06, type: 'square', vol: 0.11 }); T({ freq: 1100, to: 800, dur: 0.05, type: 'square', vol: 0.11, delay: 0.08 }); T({ freq: 700, to: 1250, dur: 0.14, type: 'square', vol: 0.12, delay: 0.16 }); },
    /* ---- 33. Jack-in-the-Box: hộp nhạc lên dây cót + lò xo "boing" bật ra ---- */
    'jack.crank'() { seq([523, 587, 659, 784, 659, 523], 0.08, { type: 'triangle', dur: 0.1, vol: 0.12 }); },
    'jack.pop'() { T({ freq: 200, to: 800, dur: 0.15, type: 'sine', vol: 0.15, vib: 30, vibDepth: 100 }); N({ dur: 0.05, vol: 0.12, freq: 2000 }); },
    /* ---- 34. Pinball Kick: chuông nấm pinball "ding" + cần gạt "cạch" ---- */
    'pinball.flip'() { N({ dur: 0.03, vol: 0.2, freq: 3000, q: 2 }); T({ freq: 300, dur: 0.03, type: 'square', vol: 0.08 }); },
    'pinball.ding'() { T({ freq: 1568, dur: 0.14, type: 'square', vol: 0.11 }); T({ freq: 2093, dur: 0.12, type: 'square', vol: 0.08, delay: 0.02 }); },
    /* ---- 35. Panic Ball: theremin ma quái khi bóng thả ra, trúng ai: tiếng hét "aaa" tụt xuống ---- */
    'panic.spook'() { T({ freq: 700, to: 420, dur: 0.8, type: 'sine', vol: 0.08, vib: 8, vibDepth: 40 }); T({ freq: 466, to: 300, dur: 0.8, type: 'sine', vol: 0.04, vib: 7, vibDepth: 30, delay: 0.1 }); },
    'panic.boo'() { T({ freq: 900, to: 200, dur: 0.35, type: 'sawtooth', vol: 0.12, vib: 20, vibDepth: 30 }); N({ dur: 0.2, vol: 0.08, freq: 2000 }); },
    /* ---- 36. Mega Magnet: nam châm rơi rít xuống + tiếng ù từ trường suốt lúc hút ---- */
    'magnet.drop'() { T({ freq: 1200, to: 200, dur: 0.4, type: 'sine', vol: 0.13 }); },
    'magnet.hum'() { const p = P('mega_magnet'), t = (p.time || 2) + 0.2; T({ freq: 60, dur: t, type: 'sine', vol: 0.12, attack: 0.05 }); T({ freq: 120, dur: t, type: 'square', vol: 0.025, vib: 10, vibDepth: 3 }); },
  };

  SFC.Audio.ult = function (key) { const f = LIB[key]; if (f) f(); };
  SFC.Audio.ultKeys = () => Object.keys(LIB);
})();
