// Giữ phần đã duyệt không bị đổi ngoài ý muốn: đứng, chạy (kể cả nghiêng khi chạy nước rút), cú đấm, Hard attack, sút, vô-lê, đánh đầu, thủ môn đổ người, bị đá bay, trạng thái của sprite v2 (src/render/player/).
// Băm lệnh vẽ từng trường hợp rồi so với baseline.json. Không cần trình duyệt (bỏ qua bóng đổ).
//   node tools/sprite-v2/check.cjs           so sánh, khác thì liệt kê và thoát mã 1
//   node tools/sprite-v2/check.cjs --update  ghi lại baseline (chỉ sau khi user duyệt thay đổi)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
global.window = global; global.SFC_CONFIG = {};
require('../../config/game.config.js');
require('../../config/run.config.js');   // chỗ quấn băng chấn thương (run.badges[id].part)
// ăn mừng: dữ liệu động tác của game (CelebrateDraw.POSES, lead() của Celebrate)
global.SFC = {};
require('../../config/progression.config.js');
require('../../shared/systems/celebrate.js');
require('../../src/render/celebrate-draw.js');
// sprite v2: các file src/render/player/*.js theo thứ tự trong scripts/manifest.js
for (const f of require('../../scripts/manifest.js').files('game').filter((f) => f.startsWith('src/render/player/'))) require('../../' + f);
const Sprite = global.SFC.PlayerSprite;
const BASE = path.join(__dirname, 'baseline.json');
const LOOK = { skin: '#b97a4e', shirt: '#e0303f', shirtD: '#9e1f33', shorts: '#26283a', sock: '#ecebe6', shoe: '#e8e8e8', sole: '#b9c2d0', hair: '#3a2418', band: '#ffd23f' };

// ctx giả: ghi màu + hình chữ nhật theo thứ tự vẽ
function record(fn) {
  const out = [];
  const ctx = { fillStyle: '#000', globalAlpha: 1, globalCompositeOperation: 'source-over', fillRect(x, y, w, h) { out.push(this.fillStyle + '|' + this.globalAlpha.toFixed(2) + '|' + x + ',' + y + ',' + w + ',' + h); }, drawImage() {} };
  fn(ctx);
  return crypto.createHash('sha1').update(out.join(';')).digest('hex').slice(0, 16);
}
const cases = {};
for (let a = 0; a < 16; a++) {
  const facing = (a * Math.PI) / 8;
  cases['stand/' + a] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing }, LOOK)));
  for (let f = 0; f < 4; f++) for (const lean of [0, 1]) cases[`run/${a}/${f}/${lean}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, moving: true, anim: f / 12 + 0.001, lean }, LOOK)));
}
const C = SFC_CONFIG.game.combat.light;
for (const [name, facing] of [['right', 0], ['downright', Math.PI / 4], ['down', Math.PI / 2], ['downleft', Math.PI * 0.75], ['left', Math.PI], ['up', -Math.PI / 2]])
  for (let i = 0; i * (1 / 60) < C.startup + C.recover; i++) {
    const atk = Sprite.attackPose({ atkType: 'light', atkT: i / 60 });
    cases[`punch/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, atk }, LOOK)));
    cases[`punch-keeper/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, atk, glove: '#ffd23f' }, LOOK)));
  }
// Hard attack (duyệt 2026-11-01): gồng (hào quang đỏ) -> vung -> về, mọi hướng, có / không găng thủ môn
const H = SFC_CONFIG.game.combat.hard;
for (const [name, facing] of [['right', 0], ['downright', Math.PI / 4], ['down', Math.PI / 2], ['downleft', Math.PI * 0.75], ['left', Math.PI], ['up', -Math.PI / 2], ['upright', -Math.PI / 4]])
  for (let i = 0; i * (1 / 60) < H.windup + H.kickTime + 0.15; i++) {
    const t = i / 60, atk = Sprite.attackPose({ atkType: 'hard', atkT: t }), st = { facing, atk, windup: t < H.windup, anim: t };
    cases[`hard/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign(st, LOOK)));
    cases[`hard-keeper/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, st, { glove: '#ffd23f' }, LOOK)));
  }

// sút + vô-lê (duyệt 2026-11-01): suốt thời gian tư thế, mọi hướng, có / không găng thủ môn
for (const [type, D] of [['shoot', SFC_CONFIG.game.kick.poseTime], ['volley', SFC_CONFIG.game.firstTime.volley.pose]])
  for (const [name, facing] of [['right', 0], ['downright', Math.PI / 4], ['down', Math.PI / 2], ['downleft', Math.PI * 0.75], ['left', Math.PI], ['up', -Math.PI / 2], ['upright', -Math.PI / 4]])
    for (let i = 0; i * (1 / 60) < D; i++) {
      const st = { facing, atk: Sprite.attackPose({ atkType: type, atkT: i / 60 }) };
      cases[`${type}/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, st, LOOK)));
      cases[`${type}-keeper/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, st, { glove: '#ffd23f' }, LOOK)));
    }

// đánh đầu (duyệt 2026-11-01): suốt cú nhảy, mọi hướng, có / không găng thủ môn
{
  const D = SFC_CONFIG.game.firstTime.header.pose;
  for (const [name, facing] of [['right', 0], ['downright', Math.PI / 4], ['down', Math.PI / 2], ['downleft', Math.PI * 0.75], ['left', Math.PI], ['up', -Math.PI / 2], ['upright', -Math.PI / 4]])
    for (let i = 0; i * (1 / 60) < D; i++) {
      const st = { facing, atk: Sprite.attackPose({ atkType: 'header', atkT: i / 60 }) };
      cases[`header/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, st, LOOK)));
      cases[`header-keeper/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, st, { glove: '#ffd23f' }, LOOK)));
    }
}

// thủ môn đổ người (duyệt 2026-11-04): cú nhảy bằng khung vẽ riêng (keeper.js) lúc bay / chạm đất / nằm / bò + đứng dậy (gkball.js)
{
  const PL = SFC_CONFIG.game.player, F = PL.gkDiveTime, D = F + PL.gkDivePose;
  for (const d of ['diveU', 'diveD']) for (const [name, facing] of [['right', 0], ['left', Math.PI], ['down', Math.PI / 2], ['up', -Math.PI / 2]])
    for (let i = 0; i * (1 / 60) < D; i++) {
      const t = i / 60, p = { atkType: d, atkT: t, state: t < F ? 'dash' : 'normal' }, atk = Sprite.attackPose(p), gk = Sprite.gkState(p, atk, false);
      cases[`dive/${d}/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, atk, gk, glove: '#ffd23f' }, LOOK)));
    }
}

// bị đá bay (duyệt 2026-11-01): tư thế lộn / nằm / dậy + góc xoay flyRot + bóng nằm flyShadowSpec
{
  const num = (v) => crypto.createHash('sha1').update(JSON.stringify(v, (k, x) => (typeof x === 'number' ? +x.toFixed(4) : x))).digest('hex').slice(0, 16);
  for (const [name, facing] of [['right', 0], ['left', Math.PI], ['down', Math.PI / 2], ['up', -Math.PI / 2]])
    for (const [phase, ks] of [['tumble', [0]], ['sprawl', [0, 0.1, 0.5, 1]]])
      for (const k of ks) for (const dir of [1, -1]) {
        const fs = { phase, t: k * 0.4, dir, rot0: 2.3 * dir };
        cases[`fly/${name}/${phase}/${k}/${dir}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, stun: true, fly: fs, anim: 0.4 }, LOOK)));
        cases[`flyx/${name}/${phase}/${k}/${dir}`] = num([Sprite.flyRot(fs, 0.4), Sprite.flyShadowSpec(fs)]);
      }
  // đứng dậy (duyệt 2026-11-07): ngồi dậy -> nhổm -> quỳ -> khuỵu, không xoay (flyGetUp, drawPlayer đổi o như thế này)
  let e = 0;
  for (const [stage, d] of Sprite.FLY.getUp) {
    for (const dir of [1, -1]) {
      const u = Sprite.flyGetUp({ phase: 'rise', r: e + d / 2, dir });
      cases[`flyup/${stage}/${dir}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ stun: true, anim: 0.4 }, LOOK, u)));
    }
    e += d;
  }
}

// trạng thái (duyệt 2026-11-01): choáng (lắc đầu + sao), găng thủ môn, chấn thương, bóng mờ / mồi Chạy Giả (tô áo), đứng + 4 khung chạy, 6 hướng.
// Smoke Bomb / khổng lồ / hoảng sợ là alpha / phóng / dịch của renderer, không đổi lệnh vẽ
{
  const inj = ['wrist', 'ankle', 'toe', 'hamstring'];
  for (const [name, facing] of [['right', 0], ['downright', Math.PI / 4], ['down', Math.PI / 2], ['downleft', Math.PI * 0.75], ['left', Math.PI], ['up', -Math.PI / 2]]) {
    for (let k = 0; k < 8; k++) cases[`stun/${name}/${k}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, stun: true, anim: k * 0.13 }, LOOK)));
    for (let f = -1; f < 4; f++) {
      const mv = f < 0 ? {} : { moving: true, anim: f / 12 + 0.001 };
      cases[`keeper/${name}/${f}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, glove: '#ffd23f' }, mv, LOOK)));
      cases[`injured/${name}/${f}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, inj }, mv, LOOK)));
      cases[`ghost/${name}/${f}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, LOOK, { facing, shirt: '#9d7bff', shirtD: '#9d7bff', noShadow: true }, mv)));
    }
    // giơ 2 tay (duyệt 2026-11-01): bị đấm (o.hit = giây từ lúc bị đánh) · nhảy Ground Slam (o.slam) · móc xe đạp (attackPose 'bicycle')
    for (let i = 0; i * (1 / 60) < Sprite.HIT.down; i++) cases[`hit/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, stun: true, hit: i / 60, anim: 0.3 + i / 60 }, LOOK)));
    for (const k of [0.1, 0.3, 0.6, 1]) cases[`slam/${name}/${k}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, slam: k }, LOOK)));
    for (let i = 0; i < 60; i++) { const atk = Sprite.attackPose({ atkType: 'bicycle', atkT: i / 60 }); cases[`bicycle/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing, atk }, LOOK))); }
  }
}

// ăn mừng (duyệt theo đợt, A6): tư thế sprite v2 (celPose) + điểm neo đạo cụ (celAnchors) + nâng / xoay, 3.2 s ở 30 khung / s, nhìn xuống như xem trước
{
  const num = (v) => crypto.createHash('sha1').update(JSON.stringify(v, (k, x) => (typeof x === 'number' ? +x.toFixed(4) : x))).digest('hex').slice(0, 16);
  // [tên case, id động tác, thêm vào người]: _lose ngồi bệt = cầu thủ id lẻ
  const ids = ['fistpump', 'airplane', 'skypoint', 'shush', 'kneeslide', 'flex', 'bow', 'spinjump', 'robot', 'dab', 'worm', 'phonecall', 'nap', 'backflip', 'moonwalk', 'firebreath', 'fireworks', 'ascend', '_win2', '_draw', 'makeitrain', 'levitate'].map((id) => [id, id, {}]);
  ids.push(['_lose_sit', '_lose', { id: 1 }], ['_lose_stand', '_lose', { id: 0 }]);
  for (const [name, id, extra] of ids)
    for (let i = 0; i < 96; i++) {
      const t = i / 30, p = Object.assign({ celId: id, celT: t, facing: Math.PI / 2, preview: true, vx: 0, vy: 0 }, extra), cp = Sprite.celPose(id, t, p), A = Sprite.celAnchors(cp);
      cases[`cel/${name}/${i}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({ facing: cp.face != null ? cp.face : Math.PI / 2, moving: !!cp.run, anim: t, cp }, LOOK)));
      cases[`celx/${name}/${i}`] = num([cp.lift || 0, cp.rot || 0, A.hand(0), A.hand(1), A.elbow(0), A.elbow(1), A.head, A.mouth]);
    }
}

// tóc / mũ (duyệt theo đợt, B8): 4 hướng đứng, tóc đen + nâu (đầu A + kiểu tóc của hair.js)
{
  for (const cut of ['classic', 'buzz', 'bowl', 'beanie', 'bun', 'bandana', 'halo', 'bucket', 'headphones', 'mohawk', 'helmet', 'afro', 'spiky', 'longhair', 'cap', 'santa', 'ward_trophy', 'moon_cap', 'lantern_hat', 'cowboy', 'viking', 'crown', 'laurel', 'flamehair', 'aura'])
    for (const [name, facing] of [['right', 0], ['downright', Math.PI / 4], ['down', Math.PI / 2], ['left', Math.PI], ['up', -Math.PI / 2]])
      for (const hair of ['#1a1216', '#8a4b22']) cases[`hair/${cut}/${name}/${hair}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, LOOK, { facing, cut, hair, anim: 0.3 })));
}

// phụ kiện mặt (duyệt theo đợt, B9): 5 hướng đứng + ăn mừng (mắt ^ ^, há miệng), 2 nhịp anim (món chuyển động), tóc đen + vàng, da sáng + tối
{
  for (const face of ['mustache', 'bandaid', 'clown', 'nerd', 'blush', 'freckles', 'beard', 'scar', 'shades', 'mask', 'goldtooth', 'warpaint', 'eyepatch', 'monocle', 'ninja', 'cyborg', 'visor', 'skull', 'lasereyes'])
    for (const [name, facing, cp] of [['right', 0], ['downright', Math.PI / 4], ['down', Math.PI / 2], ['left', Math.PI], ['up', -Math.PI / 2], ['cheer', Math.PI / 2, { eyes: 'happy', mouth: true }]])
      for (const anim of [0.1, 0.9]) for (const [hair, skin] of [['#1a1216', '#f1c7a0'], ['#f2d16b', '#6e4428']])
        cases[`face/${face}/${name}/${anim}/${hair}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, LOOK, { facing, face, hair, skin, anim, cp: cp || null })));
}

// giày (duyệt hết 2026-11-01, B10): đứng 5 hướng, chạy (2 khung), Hard attack + sút (3 nhịp), 2 nhịp anim (giày đổi theo anim: cầu vồng, lửa, phản lực, lấp lánh...)
{
  for (const shoes of Object.keys(Sprite.SHOE_STYLES))
    for (const [name, facing] of [['right', 0], ['downright', Math.PI / 4], ['down', Math.PI / 2], ['left', Math.PI], ['up', -Math.PI / 2]])
      for (const anim of [0.1, 0.7]) {
        const L = Object.assign({}, LOOK, { facing, shoes, anim });
        cases[`shoes/${shoes}/${name}/${anim}/stand`] = record((c) => Sprite.draw(c, 25, 40, L));
        for (const f of [0, 2]) cases[`shoes/${shoes}/${name}/${anim}/run${f}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, L, { moving: true, anim: f / 12 + anim })));
        for (const [type, t] of [['hard', 0.3], ['hard', 0.45], ['shoot', 0.1]]) cases[`shoes/${shoes}/${name}/${anim}/${type}${t}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, L, { atk: Sprite.attackPose({ atkType: type, atkT: t }) })));
      }
}

// hiệu ứng trang phục (duyệt theo đợt, B11): hình hạt ở px game (fx.js) theo 4 tuổi + Golden Aura trong sprite (đứng / chạy, 2 nhịp).
// Hạt giả lập tay (hình / màu như Sprites.FX của game, không nạp sprites.js); Phantom vẽ bằng drawPlayer (đã giữ ở phần đứng / chạy)
{
  const FXQ = { sparkle: ['star', 1, '#ffffff'], bubbles: ['ring', 0, '#9fe8ff'], leaves: ['px', 0, '#6bff4f'], hearts: ['heart', 0, '#ff5a9e'], snow: ['px', 0, '#ffffff'],
    notes: ['note', 0, '#ffe14f'], confetti: ['px', 0, '#ff3d5a'], petals: ['px', 0, '#ffb7d5'], neon: ['px', 1, '#3ff6ff'], frost: ['star', 1, '#bdf4ff'],
    lightning: ['bolt', 1, '#fff6a0'], rainbow: ['px', 1, '#ffe14f'], fire: ['px', 1, '#ff6a1f'], galaxy: ['star', 1, '#9d7bff'],
    smoke: ['px', 0, '#8a8490'], dust: ['px', 0, '#8a7f70'], coins: ['coin', 0, '#ffd23f'] };
  for (const [kind, [shape, add, c]] of Object.entries(FXQ))
    for (const k of [1, 0.7, 0.4, 0.15]) for (const phase of [1.3, 4.1])
      cases[`fx/${kind}/${k}/${phase}`] = record((ctx) => { ctx.save = ctx.restore = ctx.scale = () => {}; Sprite.drawFxParticle(ctx, { k: kind, shape, add: !!add, c, x: 30, y: 40, z: 6, t: k, max: 1, s: 1, phase }, null); });
  for (const anim of [0.1, 0.7]) for (const moving of [false, true])
    cases[`fx/aura/${anim}/${moving}`] = record((c) => Sprite.draw(c, 25, 40, Object.assign({}, LOOK, { facing: Math.PI / 2, fx: 'aura', anim, moving })));
}

// màu đội ra màu vẽ (B12, duyệt 2026-11-01): kitColors trong player.js. Ca lấy từ config đội thật (băng đô trùng tóc, găng trùng da, quần gần đen, ca thường)
{
  const KC = [
    ['neon', { shirt: '#ff3fb4', shorts: '#1b1f3a', accent: '#3ff6ff' }, { hair: '#3ff6ff', skin: '#d99a6c' }],
    ['player-blonde', { shirt: '#f3ead7', shorts: '#2a2440', accent: '#ffe14f' }, { hair: '#f2d16b', skin: '#f1c7a0' }],
    ['crane-black', { shirt: '#ffcf3f', shorts: '#141018', accent: '#1a1a1a' }, { hair: '#1a1216', skin: '#a86a43' }],
    ['legends-yellow', { shirt: '#ffd23f', shorts: '#1a1a1a', accent: '#ffd23f' }, { hair: '#ffd23f', skin: '#d99a6c' }],
    ['paddy-pale', { shirt: '#6fae4a', shorts: '#5a3a22', accent: '#f2e6b0' }, { hair: '#1a1216', skin: '#f5d6b8' }],
    ['street-kings', { shirt: '#d7263d', shorts: '#221b26', accent: '#ffcf3f' }, { hair: '#1a1216', skin: '#6e4428' }],
    ['block-bosses', { shirt: '#ffcf3f', shorts: '#141018', accent: '#ff3d5a' }, { hair: '#3b2415', skin: '#d99a6c' }],
    ['plain', { shirt: '#2fb8ff', shorts: '#e8ecf5', accent: '#c6ff3f' }, { hair: '#4a4f63', skin: '#f1c7a0' }],
  ];
  for (const [id, kit, look] of KC) cases['kitcolors/' + id] = JSON.stringify(Sprite.kitColors(kit, look));
}

if (process.argv.includes('--update')) { fs.writeFileSync(BASE, JSON.stringify(cases, null, 1)); console.log('baseline written:', Object.keys(cases).length, 'cases'); process.exit(0); }
const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
// --accept <ca,ca,...> (hoặc tiền tố kết thúc bằng *): chỉ ghi lại các ca đã duyệt, giữ nguyên phần còn lại của baseline
const acc = process.argv.indexOf('--accept');
if (acc > 0) {
  const pats = (process.argv[acc + 1] || '').split(',').filter(Boolean), hit = (k) => pats.some((p) => (p.endsWith('*') ? k.startsWith(p.slice(0, -1)) : k === p));
  const keys = Object.keys(cases).filter(hit);
  for (const k of keys) base[k] = cases[k];
  fs.writeFileSync(BASE, JSON.stringify(base, null, 1)); console.log('accepted', keys.length, 'cases'); process.exit(0);
}
const diff = Object.keys(Object.assign({}, base, cases)).filter((k) => base[k] !== cases[k]);
if (diff.length) { console.log('CHANGED', diff.length, 'of', Object.keys(cases).length, ':', diff.slice(0, 20).join(' ')); process.exit(1); }
console.log('ok', Object.keys(cases).length, 'cases unchanged (stand, run, punch, hard kick, shoot, volley, header, keeper dive, knocked flying, states, celebrations, hair, face, shoes, fx, kit colours)');
