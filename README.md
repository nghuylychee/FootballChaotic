# Street Football Chaos — MVP (web)

Bóng đá đường phố 3v3, top-down 2.5D kiểu *Binding of Isaac*, điều khiển full bàn phím kiểu *FC Online*,
với hệ thống **Core Upgrade** (kiểu Augment LoL Arena) thay đổi lối chơi giữa trận.

## Chạy game
Không cần build, không cần thư viện, không cần file ảnh/âm thanh (vẽ + tổng hợp âm bằng code).

- **Cách 1:** mở trực tiếp `index.html` bằng Chrome/Edge.
- **Cách 2 (server local):**
  ```
  powershell -ExecutionPolicy Bypass -File serve.ps1
  ```
  rồi mở http://localhost:8080

## Điều khiển (mặc định, sửa ở `config/controls.config.js`)
| Phím | Tấn công | Phòng ngự |
|---|---|---|
| ← ↑ ↓ → | Di chuyển | Di chuyển |
| E (giữ) | Chạy nước rút | Chạy nước rút |
| S (giữ/thả) | Chuyền sệt | Tắc bóng |
| W (giữ/thả) | Chọc khe (lực = độ sâu khoảng trống) | Gọi đồng đội áp sát (giữ) |
| A (giữ/thả) | Chuyền bổng | Va chạm vai |
| D (giữ/thả) | Sút, ↑/↓ chỉnh góc; giữ quá lâu thì bóng bay cao | Xoạc bóng |
| Z | Skill move (né tắc) | Lướt |
| Q | — | Đổi cầu thủ |

**Chuyền bóng (assisted passing):** giữ S/W/A để nạp lực, thả để chuyền. Bóng đi theo hướng mũi tên (không bấm hướng = hướng mặt). Nếu trong vùng ±35° quanh hướng đó có đồng đội thì người đó được khóa làm người nhận: hướng bóng tự căn vào họ, lực mặc định = lực lý tưởng theo khoảng cách (vạch trắng trên thanh lực), giữ vượt vạch thì bóng căng hơn. Nếu hướng đó không có ai, bóng đi thẳng theo mũi tên, lực = quãng đường. Người nhận chủ động chạy tới điểm đón bóng sớm nhất; mũi tên đang giữ lúc chuyền không ảnh hưởng người nhận cho tới khi thả ra (bấm hướng mới thì tự điều khiển). Chỉnh trong `SFC_CONFIG.game.pass`.

**Sút & chọc khe:** thanh lực sút bắt đầu từ mức nhỏ (gần ~10%, xa ~25% theo khoảng cách tới khung thành), giữ D để nạp dần; tốc độ tối thiểu (`shotMinSpeed`) đủ cao để chạm nhẹ vẫn là cú sút có lực. Core Fire/Thunder vẫn tính theo phần giữ thêm. Chọc khe (W) mặc định đi căng như chuyền sệt (`throughArriveSpeed`), người nhận chủ động băng lên đón; chọc khe vào khoảng trống cũng còn lực khi qua điểm rơi (`freeThroughArrive`). Chỉnh trong `SFC_CONFIG.game.kick` (`shotBase*`) và `SFC_CONFIG.game.pass`; thủ môn cân lại theo `player.gkSpeedFree`.

Khi đồng đội AI giữ bóng: S / W / A để đòi bóng. `1/2/3` chọn Core, `Esc/P` tạm dừng (online: mở menu), `M` tắt âm.

## Menu
Trang chủ tối giản: **CHƠI ĐƠN** (chọn đội / đối thủ / độ khó) · **ĐỐI KHÁNG ONLINE** · **HƯỚNG DẪN**
(điều khiển, chuyền & sút, phòng ngự, luật trận, danh sách Core, online — nội dung ở `config/tutorial.config.js`).
↑↓ chọn · ←→ đổi · Enter · Esc/Backspace quay lại.

## Online PvP (1 vs 1)
- **Tạo phòng**: nhận mã 5 ký tự (bấm vào mã để sao chép), gửi cho bạn bè.
- **Vào phòng**: gõ mã, Enter. Mỗi người chọn đội của mình trong phòng chờ, chủ phòng bấm **Bắt đầu**.
- Mô hình **host-authoritative**: trận đấu chạy trên máy chủ phòng (đội trái, P1); máy khách (đội phải, P2)
  chỉ gửi phím và vẽ lại trạng thái nhận về (nội suy ~60ms). Hai máy nối P2P qua WebRTC bằng
  [PeerJS](https://peerjs.com) (tải từ CDN khi vào menu online); PeerJS Cloud chỉ dùng lúc bắt tay.
- Core Upgrade: mỗi người chọn thẻ của mình, hết `draftTimeLimit` giây thì tự chọn thẻ đầu.
- Esc trong trận online chỉ mở menu (trận không dừng). Đối thủ rời phòng → về phòng chờ / menu online.
- Tab bị ẩn hoặc thu nhỏ vẫn chạy nhờ đồng hồ Web Worker, nên chủ phòng chuyển cửa sổ khác thì trận không bị đứng.
- Mỗi người chạy bản game của mình (mở `index.html` hoặc `serve.ps1`), cần Internet để bắt tay.
  Muốn chơi qua link: đưa cả thư mục lên host tĩnh (GitHub Pages, Netlify, itch.io...).
- Thông số ở `config/net.config.js` (tần suất gửi, độ trễ nội suy, thời gian chọn Core, PeerServer riêng).
- Debug trên 1 máy: mở 2 tab, tab này tạo phòng, tab kia vào phòng.

## Luồng trận
Kick Off → chơi → bàn thắng → **Core Upgrade** lúc bóng chết, trước khi giao bóng lại (tối đa `maxUpgrades` lần, cả hai đội cùng chọn) →
**Final Push** (30s cuối, mỗi bàn được tính x2) → hết giờ mà hòa thì **Golden Goal**.

## Cấu trúc
```
config/                 ← MỌI THÔNG SỐ CÂN BẰNG (tách riêng)
  game.config.js        luật trận, vật lý, chỉ số, thủ môn, AI, độ khó
  controls.config.js    gán phím + bảng hướng dẫn
  teams.config.js       4 đội: màu áo, chỉ số, thiên hướng Core, phong cách AI
  cores.config.js       16 Core: mô tả, mods thụ động, params hành vi
  net.config.js         online PvP: PeerJS, mã phòng, tần suất snapshot, nội suy
  tutorial.config.js    nội dung màn Hướng dẫn
src/
  core/        utils, input (map phím → action), audio (WebAudio chiptune)
  entities/    ball (vật lý 2.5D x/y/z, khung thành, lưới), player
  systems/     actions (chuyền/sút/tắc/xoạc...), cores (hook hành vi), effects,
               ai (thủ môn/giữ bóng/hỗ trợ/phòng ngự), human (controller)
  game/        match.js — state machine trận đấu
  render/      sprites (pixel-art procedural), background (sân + tường), renderer
  net/         transport (PeerJS), sync (snapshot / nội suy / phím từ xa), online (phòng chờ + vòng lặp host/khách)
  ui/          menu (trang chủ, chơi đơn, online, hướng dẫn), ui (HUD, chọn Core, pause, kết quả)
```

### Thêm Core mới
1. Thêm entry vào `config/cores.config.js`.
2. Nếu chỉ cần chỉ số thụ động: dùng `mods` (speed, offBallSpeed, shotPower, passSpeed,
   tackleRange, tackleChance, knockback, chargeTime, accuracy, sprintRegen...). Không cần code.
3. Nếu cần hành vi riêng: thêm object cùng `id` vào `Behaviors` trong `src/systems/cores.js`
   với các hook: `onShoot`, `onPass`, `onSkillMove`, `onSprintStart`, `onSlideStart`, `onTackle`,
   `onTackleWin`, `onPossessionGained`, `onHit`, `onGoalLine`, `onWallHit`, `update`.

### Debug
`SFC.app` trong console: truy cập `SFC.app.game` (trạng thái trận), ví dụ
`SFC.app.game.cores.add(0, 'thunder_kick')` để thử Core ngay lập tức.
