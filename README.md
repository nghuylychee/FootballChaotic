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
| S | Chuyền ngắn | Tắc bóng |
| W | Chọc khe | Gọi đồng đội áp sát (giữ) |
| A | Chuyền bổng | Va chạm vai |
| D (giữ/thả) | Sút, ↑/↓ chỉnh góc; giữ quá lâu thì bóng bay cao | Xoạc bóng |
| Z | Skill move (né tắc) | Lướt |
| Q | — | Đổi cầu thủ |

Khi đồng đội AI giữ bóng: S / W / A để đòi bóng. `1/2/3` chọn Core, `Esc/P` tạm dừng, `M` tắt âm.

## Luồng trận
Kick Off → chơi → **Core Upgrade** (3 lần, tại các mốc thời gian) → đối thủ AI cũng chọn Core →
**Final Push** (30s cuối, mỗi bàn được tính x2) → hết giờ mà hòa thì **Golden Goal**.

## Cấu trúc
```
config/                 ← MỌI THÔNG SỐ CÂN BẰNG (tách riêng)
  game.config.js        luật trận, vật lý, chỉ số, thủ môn, AI, độ khó
  controls.config.js    gán phím + bảng hướng dẫn
  teams.config.js       4 đội: màu áo, chỉ số, thiên hướng Core, phong cách AI
  cores.config.js       16 Core: mô tả, mods thụ động, params hành vi
src/
  core/        utils, input (map phím → action), audio (WebAudio chiptune)
  entities/    ball (vật lý 2.5D x/y/z, khung thành, lưới), player
  systems/     actions (chuyền/sút/tắc/xoạc...), cores (hook hành vi), effects,
               ai (thủ môn/giữ bóng/hỗ trợ/phòng ngự), human (controller)
  game/        match.js — state machine trận đấu
  render/      sprites (pixel-art procedural), background (sân + tường), renderer
  ui/          menu, HUD, màn chọn Core, pause, kết quả
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
