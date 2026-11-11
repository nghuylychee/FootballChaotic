# Street Football Chaos

Bóng đá đường phố **3v3** góc nhìn từ trên xuống, pixel art vẽ bằng code, âm thanh WebAudio. Chơi bằng bàn phím hoặc tay cầm; giữa trận chọn
**Core Upgrade** (kiểu Augment của LoL Arena) để đổi lối chơi, gom đủ Core của 1 trường phái thì mở **Ultimate**.
JavaScript thuần chạy trên trình duyệt (không bundler). Ra 2 dạng: bản web (itch.io, CrazyGames) và bản desktop Electron (Steam).

> README này là bản tóm tắt cho người mới (cập nhật 2026-11-11). Luật kiến trúc + lệnh đầy đủ ở [AGENTS.md](AGENTS.md); thiết kế từng hệ thống ở `docs/`.

## Chạy game

| Việc | Lệnh |
|---|---|
| Chạy game (http://localhost:8080) | `npm run serve` (`-- --port N` để đổi cổng) |
| Game + máy chủ trận chạy trên máy (ws://localhost:8081) | `npm run online` |
| Bản desktop (Electron; có Steam đang mở thì dùng Steam P2P) | `npm start` |
| Test máy chủ trận | `npm run server:test` |
| Kiểm bản dịch | `node scripts/i18n-check.js` |
| Đóng gói | `npm run build:steam` · `build:itch-web` · `build:itch-desktop` · `build:crazygames` |

Mở thẳng `index.html` từ ổ đĩa cũng chạy, nhưng trình duyệt chặn tải `assets/sfx/*.wav` qua `file://` (âm thanh thu sẵn rơi về âm tổng hợp). Cần âm thanh thì dùng `npm run serve`.

## Điều khiển mặc định

Đổi trong game ở SETTINGS › CONTROLS (mặc định: `config/controls.config.js`). Trong chữ hiện cho người chơi không bao giờ ghi thẳng tên phím (`Input.label`).

| Phím | Cầm bóng | Không cầm bóng |
|---|---|---|
| Mũi tên | Di chuyển | Di chuyển |
| E (giữ) | Chạy nước rút | Chạy nước rút |
| S | Chuyền sệt | Đòi bóng |
| W (giữ) | Chọc khe | Đòi bóng chọc khe · trong vòng cấm nhà (chỉ DEF): bắt bóng |
| A (giữ) | Chuyền bổng | **Hard attack** (đá bay) |
| D (giữ) | Sút (mũi tên = hướng sút) | **Light attack** (đấm) |
| Q | Skill move (né), nhả phím mới ra | Lướt |
| Z (giữ) + D | Sút xoáy (mỗi trận bạn chỉ điều khiển 1 người nên Z không còn là đổi người) | |
| Space | Ultimate (khi đầy) | Ultimate |
| 1–5 · R | Chọn Core · đổi 3 lá | |
| Esc / P · M | Tạm dừng · tắt âm | |

Kỹ thuật nâng cao (sút xoáy, sút bổng, giả sút, chọc khe bổng) chỉ có trong bảng hướng dẫn phím. Trong GOAT PATH, kỹ thuật nâng cao chỉ đến từ LEGEND (F / C).

## Chế độ chơi

- **GOAT PATH** (chế độ chính, tab đầu của PLAY): run 3 act kiểu Slay the Spire. Chọn đội hình 3 người, đi trên map (Matchday · Elite · Skill game ·
  KIT VAN · LEGEND TRIAL · ??? · Boss), thua 1 trận là hết run. Thưởng trong run: **BADGE** (đồ của cả đội, bẻ luật chọn Core / trận / run),
  **GEAR** (đồ 1 người đeo), **LEGEND** (10 huyền thoại tên nhái, mỗi người 1 kỹ thuật riêng). Hết run mang về gold + điểm **Core Road** (mở Core mới).
  Chơi co-op được với bạn bè (PLAY WITH FRIENDS). Thiết kế: [docs/RUN_DESIGN.md](docs/RUN_DESIGN.md).
- **RANKED** (Main Path): 3v3 xếp hạng theo Elo (★), 10 Area. Ghép người thật qua máy chủ trận; ghế trống / không tìm được ai thì người chơi giả do AI đá
  (người chơi không phân biệt được người thật và AI). AREA MAP: bản đồ đảo các Area + mốc Core Road. **Tab RANKED đang ẩn** từ 2026-10-31
  (`mainPath.tab: false`): PLAY chỉ còn GOAT PATH · PRIVATE MATCH, code + dữ liệu Elo giữ nguyên.
- **PRIVATE MATCH**: phòng có mã 7 ký tự, đấu nhau hoặc cùng đội đấu AI, không tính Elo.
- **PROLOGUE**: trận mơ có kịch bản cho người mới (`config/ftue.config.js`, `src/game/tutorial.js`).
- **FOOTBALL STORY**: chế độ cúp 4 trận cũ, không còn lối vào từ menu (chỉ còn ở STORY TEST); nội dung đội / luật sân được GOAT PATH dùng lại.
- Ngoài trận: CHARACTER (ngoại hình, túi đồ, chỉ số), SHOP (hộp gacha costume / ăn mừng), TROPHY ROOM (kệ cúp act, album sticker, bảng run gần nhất, thành tích).

## Trận đấu

- Mỗi đội 3 người (FWD · MID · DEF), **chỉ DEF giữ khung**. Trận 150 s, hoà thì bàn thắng vàng (GOAT PATH: knockout).
- **Core Upgrade**: 4 lượt chọn mỗi trận (1 trước giao bóng). 49 Core thuộc 8 trường phái; 3 Core cùng trường phái = Ultimate của trường phái đó,
  4 = dạng thức tỉnh, 2 + 2 hai trường phái = Ultimate lai (37 Ultimate, xem ULT BOOK). Luật: [docs/CORE_DESIGN.md](docs/CORE_DESIGN.md),
  [docs/ULT_RECIPE.md](docs/ULT_RECIPE.md), [docs/ULT_REDESIGN.md](docs/ULT_REDESIGN.md).
- Mọi số cân bằng ở `config/` (file dữ liệu thuần, không chạy code).

## Online

Mô hình host-authoritative, cùng 1 logic phòng (`shared/net/room.js`) chạy ở 3 chỗ: **máy chủ trận riêng** (Node, `server/`, nhiều vùng trên Render,
client tự chọn máy ping thấp nhất), **Steam P2P** (bản desktop) và **PeerJS / WebRTC** (bản web). Người chơi không được phân biệt được phòng chạy kiểu nào.
Có vào lại phòng khi rớt mạng (giữ ghế 60 s). Đổi định dạng gói tin = tăng `net.protocol` + deploy lại máy chủ (chỉ khi được yêu cầu).
Chi tiết: [AGENTS.md](AGENTS.md) mục Online, [server/README.md](server/README.md).

## Ngôn ngữ

English · Português (Brasil) · Português (Portugal) · Español · 日本語. Câu tiếng Anh là key (`SFC.t`), bản dịch ở `src/i18n/`.
`index.html?lang=es` vào thẳng 1 ngôn ngữ, `?lang=pseudo` giả dịch để soi chữ sót. Quy trình: [docs/LOCALIZATION.md](docs/LOCALIZATION.md).

## Cấu trúc

```
config/      mọi số cân bằng + nội dung (Core, đội, Area, run, LEGEND, BADGE / GEAR...); view.config.js = phần chỉ để vẽ (máy chủ không nạp)
shared/      code máy chủ trận cũng chạy: engine, meta (hồ sơ, Main Path, run), entities + systems (mô phỏng trận), game/match.js, net (phòng)
src/         chỉ client: engine (input, âm thanh, lưu), render (sprite, VFX, sân), ui (các màn), net (session, transport), platform (Steam / itch / CrazyGames)
server/      máy chủ trận (Node + Docker)
scripts/     manifest (danh sách script theo thứ tự nạp), build, kiểm bản dịch, bump phiên bản máy chủ
tools/       trang duyệt sprite / mockup / art direction
docs/        thiết kế từng hệ thống + các đợt review UX
```

Không có module: mỗi file là 1 `<script>` gắn vào `window.SFC`, **thứ tự nạp quan trọng** và lấy từ `scripts/manifest.js` (sửa ở đó rồi `npm run manifest`).

## Trang thử (chỉ bản dev, bị xoá khi đóng gói)

- `index.html?runtest` — GOAT PATH: chọn act / đối thủ / LEGEND / BADGE rồi đá, mở thẳng map / Shop / thẻ thưởng.
- `index.html?ulttest` — phòng thử Ultimate.
- `index.html?playtest` — phòng thử lối chơi (số người, AI, tốc độ bóng).
- `index.html?storytest` — các cúp FOOTBALL STORY + đội Elite.
- `sandbox.html` — VFX / Core.
- Console: `SFC.app.game` (trận đang chạy, vd. `SFC.app.game.cores.add(0, 'thunder_kick')`), `SFC.Profile.data` (hồ sơ, gọi `SFC.Profile.save()` sau khi sửa).
