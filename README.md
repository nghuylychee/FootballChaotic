# Street Football Chaos — MVP (web)

Bóng đá đường phố 2v2 (không có thủ môn cố định), top-down 2.5D kiểu *Binding of Isaac*, điều khiển full bàn phím kiểu *FC Online*,
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
| S | Chuyền sệt tự động (mũi tên chỉ vào đồng đội = chuẩn) | — |
| W (giữ/thả) | Chọc khe (lực = độ sâu khoảng trống) | Gọi đồng đội áp sát (giữ) |
| A (giữ/thả) | Chuyền bổng | **Hard attack**: gồng rồi vung chân đá bay đối thủ |
| D (giữ/thả) | Sút theo hướng phím giữ lúc thả; giữ quá lâu thì bóng bay cao. Ở phần sân nhà mà còn đối phương (trừ người đang trông khung) phía trước: phá bóng | **Light attack**: đấm |
| Z | Skill move (né tắc) | Lướt |
| Q | — | Đổi cầu thủ |

**Chuyền sệt (S):** nhấn là chuyền ngay, không nạp lực — tự chọn người nhận và lực lý tưởng. Mũi tên chỉ vào một đồng đội (±`quick.aimCone`°) thì
chuyền chuẩn cho người đó; không bấm hướng hoặc mũi tên không chỉ vào ai thì bóng đi về phía đồng đội gần nhất nhưng **luôn** lệch ngang 5–15% quãng chuyền
(trung bình ~10%) và sai lực 5–15% (`quick.sloppy`, chia cho chỉ số pass), đồng thời người nhận không tự chạy đón — sai số còn nguyên kể cả khi không ai áp sát.
Chỉnh trong `SFC_CONFIG.game.pass.quick` (`enabled: false` = S giữ nạp lực như cũ).

**Cắt đường chuyền:** bóng chuyền (S/W/A) đi qua tầm với của đối phương thì người đó có **1 lần** thử cắt — tỉ lệ = `base` x tốc độ bóng (chậm dễ cắt)
x độ lệch (đi thẳng vào người dễ cắt, sượt mép khó) x chỉ số tackle (AI: x `tackleMult` theo độ khó). Cắt hụt → bóng chạm người, chậm lại, lệch nhẹ rồi đi tiếp.
Chỉnh trong `SFC_CONFIG.game.pass.intercept`. Sút / phá bóng / bóng lỏng giữ luật cũ.

**Chuyền bóng (assisted passing, W / A):** giữ W/A để nạp lực, thả để chuyền. Bóng đi theo hướng mũi tên (không bấm hướng = hướng mặt). Nếu trong vùng ±35° quanh hướng đó có đồng đội thì người đó được khóa làm người nhận: hướng bóng tự căn vào họ, lực mặc định = lực lý tưởng theo khoảng cách (vạch trắng trên thanh lực), giữ vượt vạch thì bóng căng hơn. Nếu hướng đó không có ai, bóng đi thẳng theo mũi tên, lực = quãng đường. Người nhận chủ động chạy tới điểm đón bóng sớm nhất; mũi tên đang giữ lúc chuyền không ảnh hưởng người nhận cho tới khi thả ra (bấm hướng mới thì tự điều khiển). Chỉnh trong `SFC_CONFIG.game.pass`.

**Sút & chọc khe:** thanh lực sút bắt đầu từ mức nhỏ (gần ~10%, xa ~25% theo khoảng cách tới khung thành), giữ D để nạp dần; tốc độ tối thiểu (`shotMinSpeed`) đủ cao để chạm nhẹ vẫn là cú sút có lực. Core Fire/Thunder vẫn tính theo phần giữ thêm. Hướng sút = hướng phím giữ lúc thả, giới hạn trong khung thành (không giữ phím = sút vào giữa khung); hướng phím chỉ ra ngoài cột dọc thì bóng vào góc gần nhất nhưng bị cộng sai số "tư thế gượng" tăng theo góc lệch (`kick.awkward*`). Chọc khe (W) mặc định đi căng như chuyền sệt (`throughArriveSpeed`), người nhận chủ động băng lên đón; chọc khe vào khoảng trống cũng còn lực khi qua điểm rơi (`freeThroughArrive`). Chỉnh trong `SFC_CONFIG.game.kick` (`shotBase*`) và `SFC_CONFIG.game.pass`; thủ môn cân lại theo `player.gkSpeedFree`.

Khi đồng đội AI giữ bóng: S / W / A để đòi bóng. `1/2/3` chọn Core, `Esc/P` tạm dừng (online: mở menu), `M` tắt âm.

## Menu
Trang chủ tối giản: **CHƠI ĐƠN** (chọn đội / đối thủ / độ khó / điều khiển) · **ĐỐI KHÁNG ONLINE** · **HƯỚNG DẪN**
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

**Light / Hard attack (phòng ngự):** không có tắc bóng — chỉ dùng đòn khi đội mình không có bóng, mỗi đòn có cooldown riêng hiển thị trên thanh kỹ năng
ở giữa đáy màn hình (kiểu LoL: chân dung · ô D / A / Z với cooldown quét · thanh thể lực · Core như ô item).
Light (D): cú đấm thẳng — kéo tay lấy đà rồi đấm, tầm ngắn, choáng ngắn + đẩy lùi, người cầm bóng có tỉ lệ rơi bóng. Hard (A): gồng co chân (hào quang đỏ, xoay hướng được)
rồi vung chân đá — trúng thì đối thủ bị hất tung bay rất xa (văng vào tường thì bật lại), choáng lâu và chắc chắn rơi bóng; trượt thì khựng lâu. Z (lướt) đúng lúc thì né được cả hai. Chỉnh trong `SFC_CONFIG.game.combat.light / hard`.

**Chế độ điều khiển (Chơi đơn):** `CẢ ĐỘI` (Q đổi người, chuyền bóng thì điều khiển luôn người nhận) hoặc `1 CẦU THỦ`
— chỉ điều khiển đúng cầu thủ đã chọn cả trận (không đổi người, không tự chuyển), đồng đội do AI chơi; đòi bóng bằng S / W / A.
Cơ chế nằm ở `opts.solo` của `SFC.Game` (khóa theo từng đội, dùng lại được cho online).

**Trông khung thành (2v2):** mỗi đội 2 cầu thủ sân, vai trò chỉ là vị trí xuất phát. Ai đứng trong vòng cấm nhà thì có cơ chế thủ môn
(tầm bắt `gkReach`, bắt bóng bổng `gkCatchHeight`, tỉ lệ cứu thua / PARRY, đeo găng). Bắt được bóng trong vòng cấm → miễn tắc `gkHoldProtect` giây;
tự rê bóng vào vòng cấm thì không. AI không áp sát sẽ lùi về trông khung khi đối phương cầm bóng cách khung thành dưới `ai.keeperCoverDist`.

## Luồng trận
Kick Off → chơi → bàn thắng → **Core Upgrade** lúc bóng chết, trước khi giao bóng lại (tối đa `maxUpgrades` lần, cả hai đội cùng chọn) →
**Final Push** (30s cuối, mỗi bàn được tính x2) → hết giờ mà hòa thì **Golden Goal**.
Mỗi lần giao bóng (đầu trận và sau bàn thắng): đội hình lệch ngẫu nhiên quanh vị trí gốc và có thể lật trên/dưới
(vẫn ở phần sân nhà, ngoài vòng tròn giữa sân) để không có thế trận cố định. Chỉnh ở `SFC_CONFIG.game.match.kickoffVary`.

## Cấu trúc
```
config/                 ← MỌI THÔNG SỐ CÂN BẰNG (tách riêng)
  game.config.js        luật trận, vật lý, chỉ số, cơ chế trông khung, AI, độ khó
  controls.config.js    gán phím + bảng hướng dẫn
  teams.config.js       4 đội: màu áo, chỉ số, thiên hướng Core, phong cách AI
  cores.config.js       16 Core: mô tả, mods thụ động, params hành vi
  net.config.js         online PvP: PeerJS, mã phòng, tần suất snapshot, nội suy
  tutorial.config.js    nội dung màn Hướng dẫn
src/
  core/        utils, input (map phím → action), audio (WebAudio chiptune)
  entities/    ball (vật lý 2.5D x/y/z, khung thành, lưới), player
  systems/     actions (chuyền/sút/tắc/Light & Hard attack...), cores (hook hành vi), effects,
               ai (trông khung/giữ bóng/hỗ trợ/phòng ngự), human (controller)
  game/        match.js — state machine trận đấu
  render/      sprites (pixel-art procedural), background (sân + tường), renderer
  net/         transport (PeerJS), sync (snapshot / nội suy / phím từ xa), online (phòng chờ + vòng lặp host/khách)
  ui/          menu (trang chủ, chơi đơn, online, hướng dẫn), ui (HUD, chọn Core, pause, kết quả)
```

### Thêm Core mới
1. Thêm entry vào `config/cores.config.js`.
2. Nếu chỉ cần chỉ số thụ động: dùng `mods` (speed, offBallSpeed, shotPower, passSpeed,
   tackleRange / tackleChance (tầm / tỉ lệ cướp bóng của Light attack), knockback, chargeTime, accuracy, sprintRegen...). Không cần code.
3. Nếu cần hành vi riêng: thêm object cùng `id` vào `Behaviors` trong `src/systems/cores.js`
   với các hook: `onShoot`, `onPass`, `onSkillMove`, `onSprintStart`, `onHardAttack`, `onTackle`,
   `onTackleWin`, `onPossessionGained`, `onHit`, `onGoalLine`, `onWallHit`, `update`.

### Debug
`SFC.app` trong console: truy cập `SFC.app.game` (trạng thái trận), ví dụ
`SFC.app.game.cores.add(0, 'thunder_kick')` để thử Core ngay lập tức.
