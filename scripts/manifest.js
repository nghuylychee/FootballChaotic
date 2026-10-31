/* Danh sách script của game — NGUỒN DUY NHẤT cho thứ tự nạp (game không có bundler: mỗi file là 1 thẻ <script>).
 * Thêm / xoá / đổi chỗ file: sửa FILES bên dưới rồi chạy  npm run manifest  (ghi lại các trang HTML).
 *  - Mỗi file ghi các nơi nạp nó:
 *      game    = index.html (bản web + Electron)
 *      sandbox = sandbox.html (trang thử VFX / Core)
 *      itch    = tools/itch-page/generate.html (tạo ảnh trang itch.io)
 *      server  = máy chủ trận riêng (server/sim.js nạp thẳng từ đây, không qua HTML) — chỉ code mô phỏng, không vẽ / UI / âm thanh
 *  - Thứ tự trong FILES = thứ tự nạp ở mọi nơi. File sau dùng được SFC.* của file trước lúc nạp, không dùng được file sau.
 *  - Trang HTML: các thẻ nằm giữa <!-- scripts:begin --> và <!-- scripts:end --> là do file này ghi, đừng sửa tay.
 *    Script riêng của trang (src/dev/sandbox.js, generate.js) đặt sau scripts:end.
 * Lệnh:
 *   npm run manifest                    ghi lại các trang HTML
 *   node scripts/manifest.js --check    chỉ kiểm, lệch thì báo + exit 1 (build tự chạy: prebuild:*)
 * Code khác dùng: require('./manifest').files('server') -> danh sách đường dẫn theo thứ tự.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// [đường dẫn, nơi nạp] · { comment, gap } = dòng chú thích trong HTML (gap: thêm 1 dòng trống trước)
const FILES = [
  { comment: 'Config (chỉnh cân bằng game tại đây)', gap: true },
  ['config/build.config.js', 'game sandbox itch server'],
  ['config/game.config.js', 'game sandbox itch server'],
  ['config/controls.config.js', 'game sandbox itch server'],
  ['config/teams.config.js', 'game sandbox itch server'],
  ['config/cores.config.js', 'game sandbox itch server'],
  ['config/net.config.js', 'game sandbox itch server'],
  ['config/tutorial.config.js', 'game itch server'],
  ['config/progression.config.js', 'game sandbox itch server'],
  ['config/namefilter.config.js', 'game sandbox itch'],     // lọc tên ở máy người chơi; máy chủ không lọc
  ['config/arenas.config.js', 'game sandbox itch server'],
  ['config/mainpath.config.js', 'game sandbox itch server'],
  ['config/stories.config.js', 'game sandbox itch server'],   // FOOTBALL STORY (cup knockout co-op PvE) + đội riêng
  ['config/run.config.js', 'game sandbox itch server'],       // GOAT PATH: run 3 act kiểu Slay the Spire (đối thủ lấy từ stories)
  ['config/elites.config.js', 'game sandbox itch server'],    // GOAT PATH: đội Elite riêng (pool act.elite) + luật trận của họ
  ['config/legends.config.js', 'game sandbox itch server'],   // GOAT PATH: LEGEND (huyền thoại gắn vào 1 người của đội hình)
  ['config/teammates.config.js', 'game sandbox itch server'],
  ['config/achievements.config.js', 'game'],
  ['config/intro.config.js', 'game itch server'],
  ['config/music.config.js', 'game itch server'],
  ['config/ftue.config.js', 'game itch server'],
  ['config/demo.config.js', 'game server'],
  ['config/social.config.js', 'game'],
  ['config/platform.config.js', 'game'],
  ['config/privacy.config.js', 'game'],

  { comment: 'Engine', gap: true },
  ['src/engine/utils.js', 'game sandbox itch server'],
  ['src/target/target.js', 'game sandbox itch'],            // web / desktop (Adapter): nơi lưu, cửa sổ, thoát, mở link
  ['src/engine/storage.js', 'game sandbox itch'],          // máy chủ: SFC.Storage giả (server/sim.js)
  ['src/platform/platform.js', 'game'],                    // dịch vụ nền tảng (Adapter): tài khoản, ngôn ngữ, mời bạn bè
  ['src/platform/crazygames.js', 'game'],                  // adapter CrazyGames (SDK v3)
  ['src/engine/i18n.js', 'game sandbox server'],
  { comment: 'Bản dịch (thứ tự = thứ tự trong popup chọn ngôn ngữ) · trường config cần dịch' },
  ['src/i18n/fields.js', 'game'],
  ['src/i18n/pt-BR.js', 'game'],
  ['src/i18n/pt-PT.js', 'game'],
  ['src/i18n/es.js', 'game'],
  ['src/i18n/ja.js', 'game'],
  ['src/engine/gamepad.js', 'game sandbox itch'],
  ['src/engine/input.js', 'game sandbox itch'],
  ['src/engine/audio.js', 'game sandbox itch'],
  ['src/engine/ultsfx.js', 'game sandbox itch'],   // tiếng riêng của từng Tuyệt kỹ (SFC.Audio.ult)
  ['src/meta/settings.js', 'game itch'],
  ['src/meta/teammates.js', 'game sandbox itch server'],
  ['src/meta/profile.js', 'game sandbox itch server'],
  ['src/meta/mainpath.js', 'game sandbox itch server'],
  ['src/meta/cup.js', 'game sandbox itch server'],         // FOOTBALL STORY: lượt chơi cup + tiến độ (Profile.data.story)
  ['src/meta/run.js', 'game sandbox itch server'],         // GOAT PATH: sinh map + run đang dở (Profile.data.run)
  ['src/meta/achievements.js', 'game'],
  ['src/meta/social.js', 'game'],                          // bạn bè giả + phòng chờ (placeholder), chỉ menu
  ['src/entities/ball.js', 'game sandbox itch server'],
  ['src/entities/player.js', 'game sandbox itch server'],
  ['src/systems/actions.js', 'game sandbox itch server'],
  ['src/systems/corescale.js', 'game sandbox itch server'],
  ['src/systems/cores.js', 'game sandbox itch server'],
  ['src/systems/cores-new.js', 'game sandbox itch server'],
  ['src/systems/cores-hybrid.js', 'game sandbox itch server'],
  ['src/systems/cores-ult2.js', 'game sandbox itch server'],
  ['src/systems/effects.js', 'game sandbox itch server'],
  ['src/systems/vfxkit.js', 'game sandbox itch server'],
  ['src/systems/celebrate.js', 'game sandbox itch server'],   // ăn mừng bàn thắng: chọn động tác + di chuyển
  ['src/systems/matchmods.js', 'game sandbox itch server'],   // FOOTBALL STORY: luật trận của từng đội + câu nói trong trận
  ['src/systems/drills.js', 'game server'],                   // GOAT PATH: SKILL GAME (bài tập trên sân thật)
  ['src/systems/hurt.js', 'game server'],                     // GOAT PATH: chấn thương ra tay trong trận (khựng / đấm xịt / sút trượt)
  ['src/systems/legends.js', 'game server'],                  // GOAT PATH: LEGEND trong trận (khoảnh khắc LEGEND + nhược điểm)
  ['src/systems/ai.js', 'game sandbox itch server'],
  ['src/systems/human.js', 'game sandbox itch server'],
  ['src/game/match.js', 'game sandbox itch server'],
  ['src/game/tutorial.js', 'game itch'],
  ['src/render/sprites.js', 'game sandbox itch'],
  ['src/render/celebrate-draw.js', 'game sandbox itch'],     // ăn mừng bàn thắng: tư thế + đạo cụ
  ['src/render/background.js', 'game sandbox itch'],
  ['src/render/crowd.js', 'game sandbox itch'],
  ['src/render/vfx.js', 'game sandbox itch'],
  ['src/render/modsdraw.js', 'game sandbox itch'],   // FOOTBALL STORY: hình vật thể của luật trận
  ['src/render/rundraw.js', 'game'],                 // GOAT PATH: bia / cổng của SKILL GAME + dấu chấn thương trên đầu
  ['src/render/legenddraw.js', 'game'],              // GOAT PATH: bóng mờ LEGEND sau lưng + cut-in chân dung bên cạnh màn hình
  ['src/render/renderer.js', 'game sandbox itch'],
  ['src/render/pixelicons.js', 'game itch'],
  ['src/net/transport.js', 'game server'],                 // máy chủ: NetCommon (mã phòng)
  ['src/net/transport-peer.js', 'game'],
  ['src/net/transport-steam.js', 'game'],
  ['src/platform/steam.js', 'game'],                       // adapter Steam (mời bạn bè qua overlay) — sau transport-steam
  ['src/net/transport-server.js', 'game'],
  ['src/net/sync.js', 'game server'],
  ['src/net/room.js', 'game server'],
  ['src/net/matchmaker.js', 'server'],                     // hàng chờ trận xếp hạng (chỉ máy chủ riêng)
  ['src/net/predict.js', 'game'],                          // dự đoán cầu thủ của mình ở máy khách
  ['src/net/session.js', 'game'],
  ['src/ui/corepreview.js', 'game'],
  ['src/ui/controls.js', 'game'],
  ['src/ui/helpers.js', 'game'],                           // hàm vẽ dùng chung của SFC.UI
  ['src/ui/matchui.js', 'game'],                           // SFC.UI: lõi giao diện trận (các file dưới gắn thêm vào)
  ['src/ui/hud.js', 'game'],
  ['src/ui/draft.js', 'game'],
  ['src/ui/endscreen.js', 'game'],
  ['src/ui/endtest.js', 'game'],                           // dev (SFC_DEBUG)
  ['src/ui/recipefx.js', 'game'],
  ['src/ui/gacha.js', 'game'],
  ['src/ui/reveal.js', 'game'],
  ['src/ui/team.js', 'game'],
  ['src/ui/achievements.js', 'game'],
  ['src/ui/trophies.js', 'game'],                          // PHÒNG TRƯNG BÀY: cúp Story + kỷ lục + lối vào ACHIEVEMENTS
  ['src/ui/road.js', 'game'],
  ['src/ui/cup.js', 'game'],                               // FOOTBALL STORY: tab PLAY + màn cup
  ['src/ui/kitvan.js', 'game'],                            // GOAT PATH: Shop = KIT VAN (xe bán đồ pixel art, canvas 320x180)
  ['src/ui/runmap.js', 'game'],                            // GOAT PATH: tab PLAY + màn map
  ['src/ui/intro.js', 'game'],
  ['src/ui/drill.js', 'game'],
  ['src/ui/story.js', 'game'],
  ['src/ui/story-cup.js', 'game'],                         // FOOTBALL STORY: khuôn cảnh cut scene (Story.addArt)
  ['src/ui/langpick.js', 'game'],
  ['src/ui/menu.js', 'game'],
  ['src/ui/ulttest.js', 'game'],                           // phòng test Tuyệt kỹ (dev, SFC_DEBUG — bản đóng gói thành rỗng)
  ['src/ui/storytest.js', 'game'],                         // phòng test FOOTBALL STORY (dev, SFC_DEBUG — bản đóng gói thành rỗng)
  ['src/ui/runtest.js', 'game'],                           // phòng test GOAT PATH: BADGE + LEGEND (dev, SFC_DEBUG — bản đóng gói thành rỗng)
  ['src/ui/online.js', 'game'],
  ['src/main.js', 'game'],
];

// trang HTML do file này ghi: đường dẫn trang, nơi nạp, tiền tố đường dẫn script (trang nằm trong thư mục con)
const PAGES = [
  { file: 'index.html', target: 'game', prefix: '' },
  { file: 'sandbox.html', target: 'sandbox', prefix: '' },
  { file: 'tools/itch-page/generate.html', target: 'itch', prefix: '../../' },
];
const TARGETS = ['game', 'sandbox', 'itch', 'server'];

const BEGIN = '<!-- scripts:begin · tạo bởi scripts/manifest.js (npm run manifest), đừng sửa tay -->';
const END = '<!-- scripts:end -->';

const has = (entry, target) => Array.isArray(entry) && entry[1].split(/\s+/).includes(target);

/** đường dẫn (tính từ gốc repo) các file của 1 nơi nạp, đúng thứ tự */
function files(target) {
  if (!TARGETS.includes(target)) throw new Error(`manifest: unknown target "${target}"`);
  return FILES.filter((e) => has(e, target)).map((e) => e[0]);
}

// khối thẻ <script> của 1 trang (chú thích chỉ hiện khi file ngay sau nó thuộc trang)
function block(page, indent) {
  const lines = [indent + BEGIN];
  let pending = null;
  for (const e of FILES) {
    if (!Array.isArray(e)) { pending = e; continue; }
    if (!has(e, page.target)) { pending = null; continue; }
    if (pending) {
      if (pending.gap && lines.length > 1) lines.push('');
      lines.push(`${indent}<!-- ${pending.comment} -->`);
      pending = null;
    }
    lines.push(`${indent}<script src="${page.prefix}${e[0]}"></script>`);
  }
  lines.push(indent + END);
  return lines;
}

// nội dung trang sau khi ghi lại khối script (null = trang thiếu cặp đánh dấu)
function render(page) {
  const full = path.join(ROOT, page.file);
  const raw = fs.readFileSync(full, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const b = lines.findIndex((l) => l.includes('<!-- scripts:begin')), e = lines.findIndex((l) => l.includes(END));
  if (b < 0 || e < b) return { full, raw, next: null };
  const indent = lines[b].match(/^\s*/)[0];
  const next = [...lines.slice(0, b), ...block(page, indent), ...lines.slice(e + 1)].join(eol);
  return { full, raw, next };
}

// kiểm mọi file trong FILES có thật + mọi trang khớp. Trả về danh sách lỗi
function check() {
  const errs = [];
  for (const e of FILES) {
    if (!Array.isArray(e)) continue;
    if (!fs.existsSync(path.join(ROOT, e[0]))) errs.push(`missing file: ${e[0]}`);
    for (const t of e[1].split(/\s+/)) if (!TARGETS.includes(t)) errs.push(`${e[0]}: unknown target "${t}"`);
  }
  for (const page of PAGES) {
    const r = render(page);
    if (r.next == null) errs.push(`${page.file}: no <!-- scripts:begin --> / <!-- scripts:end --> markers`);
    else if (r.next !== r.raw) errs.push(`${page.file}: script list is out of date (run: npm run manifest)`);
  }
  return errs;
}

function write() {
  const changed = [];
  for (const page of PAGES) {
    const r = render(page);
    if (r.next == null) throw new Error(`${page.file}: no <!-- scripts:begin --> / <!-- scripts:end --> markers`);
    if (r.next !== r.raw) { fs.writeFileSync(r.full, r.next); changed.push(page.file); }
  }
  return changed;
}

module.exports = { FILES, PAGES, TARGETS, files, check, write };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const errs = check();
    if (errs.length) { console.error('[manifest] ' + errs.join('\n[manifest] ')); process.exit(1); }
    console.log('[manifest] OK');
  } else {
    const missing = FILES.filter((e) => Array.isArray(e) && !fs.existsSync(path.join(ROOT, e[0]))).map((e) => e[0]);
    if (missing.length) { console.error('[manifest] missing files:\n  ' + missing.join('\n  ')); process.exit(1); }
    const changed = write();
    console.log(changed.length ? `[manifest] updated: ${changed.join(', ')}` : '[manifest] pages already up to date');
  }
}
