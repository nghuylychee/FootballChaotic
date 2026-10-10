# Street Football Chaos — MVP (web)

Bóng đá đường phố 2v2 (không có thủ môn cố định), top-down 2.5D kiểu *Binding of Isaac*, điều khiển full bàn phím kiểu *FC Online*,
với hệ thống **Core Upgrade** (kiểu Augment LoL Arena) thay đổi lối chơi giữa trận.

## Chạy game
Không cần build, không cần thư viện, không cần file ảnh/âm thanh (vẽ + tổng hợp âm bằng code).

- **Cách 1:** mở trực tiếp `index.html` bằng Chrome/Edge.
- **Cách 2 (server local, cần Node):**
  ```
  npm run serve
  ```
  rồi mở http://localhost:8080 (`npm run serve -- --port 3000` để đổi cổng)
- **Thử online với máy chủ trận riêng:** `npm run online` (game ở :8080 + máy chủ trận ở :8081, xem `server/README.md`)

## Điều khiển (mặc định, sửa ở `config/controls.config.js`)
| Phím | Tấn công | Phòng ngự |
|---|---|---|
| ← ↑ ↓ → | Di chuyển | Di chuyển |
| E (giữ) | Chạy nước rút | Chạy nước rút |
| S | Chuyền sệt tự động (mũi tên chỉ vào đồng đội = chuẩn) | — |
| W (giữ/thả) | Chọc khe (lực = độ sâu khoảng trống) | — |
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
Cắt được đường chuyền / chặn được cú sút ngoài vòng cấm nhà (bóng còn nhanh hơn `aiDelayMinSpeed`) → hiện chữ INTERCEPT (đội có Core Counter Attack: hiện COUNTER! thay vào);
AI cắt được thì khựng `aiDelay` giây (vẫn rê bóng) mới chuyền / sút.
Chỉnh trong `SFC_CONFIG.game.pass.intercept`. Sút / phá bóng / bóng lỏng giữ luật cũ.

**Chuyền bóng (assisted passing, W / A):** giữ W/A để nạp lực, thả để chuyền. Bóng đi theo hướng mũi tên (không bấm hướng = hướng mặt). Nếu trong vùng ±35° quanh hướng đó có đồng đội thì người đó được khóa làm người nhận: hướng bóng tự căn vào họ, lực mặc định = lực lý tưởng theo khoảng cách (vạch trắng trên thanh lực), giữ vượt vạch thì bóng căng hơn. Nếu hướng đó không có ai, bóng đi thẳng theo mũi tên, lực = quãng đường. Người nhận chủ động chạy tới điểm đón bóng sớm nhất; mũi tên đang giữ lúc chuyền không ảnh hưởng người nhận cho tới khi thả ra (bấm hướng mới thì tự điều khiển). Chỉnh trong `SFC_CONFIG.game.pass`.

**Sút & chọc khe:** thanh lực sút bắt đầu từ mức nhỏ (gần ~10%, xa ~25% theo khoảng cách tới khung thành), giữ D để nạp dần; tốc độ tối thiểu (`shotMinSpeed`) đủ cao để chạm nhẹ vẫn là cú sút có lực. Core Fire/Thunder vẫn tính theo phần giữ thêm. Hướng sút = hướng phím giữ lúc thả, giới hạn trong khung thành (không giữ phím = sút vào giữa khung); hướng phím chỉ ra ngoài cột dọc thì bóng vào góc gần nhất nhưng bị cộng sai số "tư thế gượng" tăng theo góc lệch (`kick.awkward*`). Chọc khe (W) mặc định đi căng như chuyền sệt (`throughArriveSpeed`), người nhận chủ động băng lên đón; chọc khe vào khoảng trống cũng còn lực khi qua điểm rơi (`freeThroughArrive`). Chỉnh trong `SFC_CONFIG.game.kick` (`shotBase*`) và `SFC_CONFIG.game.pass`; thủ môn cân lại theo `player.gkSpeedFree`.

Bóng chạm cột dọc / xà ngang (trong 1 bán kính bóng) → chữ **WOODWORK** + tiếng "keng" (`Ball.checkWoodwork`, chỉ hiển thị, đường bóng không đổi).

Khi đồng đội AI giữ bóng: S / W để đòi bóng (sệt / chọc khe), D / A vẫn ra đòn Light / Hard. `1/2/3` chọn Core, `Esc/P` tạm dừng (online: mở menu), `M` tắt âm.

## Menu
Trang chủ: **CHƠI ĐƠN** (chọn đội / đối thủ / độ khó / điều khiển) · **LUYỆN TẬP** · **ĐỐI KHÁNG ONLINE** · **SHOP** (hộp gacha) · **NHÂN VẬT** (túi đồ),
góc phải là thẻ hồ sơ (character, tên, level, thanh XP, gold, thống kê).
Màn Hướng dẫn (`config/tutorial.config.js`) đã được gỡ khỏi trang chủ — code trang vẫn còn trong `src/ui/menu.js` nếu cần gắn lại chỗ khác.
↑↓ chọn · ←→ đổi · Enter · Esc/Backspace quay lại.

## Ngôn ngữ
English · Português (Brasil, popup ghi "Brasil") · Português (Bồ Đào Nha, popup ghi "Português") · Español · 日本語. Lần đầu mở game hiện popup chọn ngôn ngữ (chọn sẵn theo Steam / hệ điều hành), đổi lại ở SETTINGS > LANGUAGE.
Câu tiếng Anh là key (`SFC.t`), bản dịch ở `src/i18n/`, chữ trong config dịch theo `src/i18n/fields.js`. Kiểm tra bản dịch: `node scripts/i18n-check.js`.
Bản dev: `index.html?lang=es` vào thẳng 1 ngôn ngữ · `?lang=pseudo` giả dịch để soi chữ sót / tràn. Chi tiết + quy trình dịch: [docs/LOCALIZATION.md](docs/LOCALIZATION.md).

## PROLOGUE (hướng dẫn người mới)
Người chơi mới đặt tên xong → cut scene kiểu anime *"I have a dream... to be the GOAT of street football"* → **DREAM MATCH**:
trận có kịch bản, không dừng trận để dạy, chỉ 1 hộp gợi ý nhỏ + ô kỹ năng nhấp nháy. Các bài: di chuyển → chuyền cho ACE → sút
(Core Fireball có sẵn) → bàn thắng mở lượt chọn Core (3 lá từ 3 trường phái) → đấm / đá cướp bóng → GO SCORE: đối thủ lao vào gồng đá,
trận chạy chậm + QTE bấm Z né (hụt thì làm lại) → ghi bàn → mở **ULTIMATE** theo trường phái vừa chọn (Striker: Meteor Shot · Brawler:
Hundred Fists · Illusion: Clone Army) → tích năng lượng kiểu show, don't tell (thanh 0%, đấm / cướp bóng / ghi bàn nạp x4, nguồn nạp sáng lên)
→ đầy thì bấm X → bật đồng hồ 45s đá tự do (có FINAL PUSH).
Làm trước bài sau (vd. sút vào khi đang học di chuyển) thì nhảy cóc luôn. Hết trận → cut scene tỉnh dậy ở VILLAGE GREEN (Core trong mơ chỉ là
"mượn") → thẻ giới thiệu **MAIN PATH** → trang Main Path. Cut scene: Enter = tiếp, giữ Enter / Esc = bỏ qua. Pause trong trận mơ: SKIP PROLOGUE.
Xem lại: SETTINGS → TEST → PROLOGUE (chỉ bản dev, bị xoá khi đóng gói). Hồ sơ cũ (đã có tên) coi như đã xem. Kịch bản, chữ, Core, số liệu: `config/ftue.config.js`;
cut scene: `src/ui/story.js`; kịch bản trận: `src/game/tutorial.js` (điều khiển AI qua `g.aiHook`).

## Luyện tập
Chọn **SỐ NGƯỜI** đội bạn (1 = chỉ character của bạn đá ĐÁ CAO · 2 = đủ đội, chọn ĐIỀU KHIỂN như Chơi đơn) và **ĐỐI THỦ** (không có · 2 người,
chọn đội + độ khó). Không giờ trận, không Final Push / Golden Goal, không chọn Core, không thưởng XP / gold, không tính tỉ số (HUD chỉ hiện TRAINING);
vào lưới vẫn ăn mừng rồi giao bóng lại (không có đối thủ thì luôn giao bóng cho bạn). Esc → ĐÁ LẠI / VỀ MENU. Engine: `SFC.Game` opts `training` + `teamSize`.

## Meta progression (level · XP · gold · gacha · túi đồ)
- Hồ sơ lưu ở `localStorage` của trình duyệt (`src/meta/profile.js`, key `sfc_profile_v1`). Lần đầu mở game phải đặt tên.
- **Character**: mang tên + costume của bạn, vào sân thay 1 cầu thủ của đội mình (đối thủ online thấy được). Chơi đơn `1 CẦU THỦ`: chọn
  character đá ĐÁ LÙI hay ĐÁ CAO, cầu thủ AI của đội đá vị trí còn lại; `CẢ ĐỘI` và online: character đá ĐÁ CAO.
- **Thưởng sau trận** (chỉ khi đá hết trận): thắng / hòa / thua + theo số bàn, nhân độ khó ở chơi đơn; online thưởng cao hơn.
  Màn kết quả diễn hoạt từng dòng thưởng, gold đếm lên, thanh XP chạy qua từng level, báo hộp / Core vừa mở khoá theo level.
- **Shop = hộp gacha** (kiểu CSGO): trả gold, dải item quay chậm dần rồi dừng ở món trúng (có tiếng tách, nhạc lộ đồ theo độ hiếm).
  Hộp Đường Phố (costume, LV1) · Hộp Huyền Thoại (costume từ HIẾM, LV6) · Hộp Core (Core Upgrade, LV2). Xem tỉ lệ + toàn bộ món trong hộp trước khi mở.
- **Gacha Core đang TẠM TẮT** (`config/progression.config.js` → `coreGacha: false`): mọi Core dùng được ngay cho mọi người chơi
  (chơi đơn + online), Hộp Core ẩn khỏi SHOP, mục CORE trong túi đồ thành bộ sưu tập đủ 53 lá. Core đã quay trước đó vẫn giữ trong hồ sơ; bật lại = `true`.
  Độ hiếm: THƯỜNG · HIẾM · SỬ THI · HUYỀN THOẠI · THẦN THOẠI (màu xám / xanh / tím / đỏ / vàng).
- **Costume** 4 slot phối tự do, mỗi slot 20 món (tính cả đồ mặc định): tóc & mũ · mặt · giày · hiệu ứng khi chạy. Core quay được chỉ vào pool chọn Core giữa trận khi đủ level của Core đó.
- **Túi đồ** (từ NHÂN VẬT hoặc SHOP): trùng thì cộng số lượng. Enter trang bị · X phân rã ra gold (món SỬ THI trở lên / món cuối đang mặc
  phải bấm 2 lần) · R phân rã toàn bộ đồ trùng (giữ 1) · Q / E đổi mục. Phân rã hoàn lại ~40–60% giá hộp (gold sink).
- Mọi con số (đường XP, thưởng, độ hiếm, giá trị phân rã, hộp + tỉ lệ, level Core) ở `config/progression.config.js`.
  Trang gacha ở `src/ui/gacha.js`; hình vẽ costume ở `src/render/sprites.js` (`drawHair`, `drawFace`, `SHOES` / `drawLeg`, `FX` + `spawnFx` / `drawFxParticle`,
  `drawItemIcon`); renderer (`cosmetics`) sinh hạt hiệu ứng khi chạy, menu xem trước bằng `drawAvatar`.
- **Chỉ số character + DRILL** (thiết kế: `docs/DRILL_DESIGN.md`, số liệu: `progression.attrs`): 6 chỉ số PACE · SHOOTING · PASSING · DRIBBLE · FIGHT · KEEPER,
  bắt đầu 60 (x0.75), 80 = x1.0, tối đa 99. Mỗi level +1 **DRILL** = chọn 1 trong 3 (+5 một chỉ số / +3 +2 hai chỉ số / Boot Camp +1 tất cả), cộng vĩnh viễn,
  đổi cả 3 được 1 lần. Màn DRILL (`src/ui/drill.js`) tự mở sau màn kết quả khi lên level; LATER -> drill chờ ở **NHÂN VẬT → DRILL** (trang chủ có huy hiệu).
  NHÂN VẬT → STATS chỉ xem (rating, radar, hệ số trong trận). Chỉ áp dụng ở Main Path + Luyện tập; online dùng chỉ số đội, lên level chỉ tích drill.
  Debug: `SFC.Profile.data.attrs.drills.pending = 3; SFC.Profile.save()`.
- Debug: `SFC.Profile.data` trong console (vd. `SFC.Profile.data.gold = 5000; SFC.Profile.save()`).

## Online PvP (1 vs 1)
- **Tạo phòng**: nhận mã 7 ký tự (bấm vào mã để sao chép), gửi cho bạn bè.
- **Vào phòng**: gõ mã, Enter. Mỗi người chọn đội của mình trong phòng chờ, chủ phòng bấm **Bắt đầu**.
- Mô hình **host-authoritative**: trận đấu chạy trên máy chủ phòng (đội trái, P1); máy khách (đội phải, P2)
  chỉ gửi phím và vẽ lại trạng thái nhận về (nội suy ~60ms). Hai đường kết nối, cùng một mã phòng:
  - **Steam** (bản Electron, Steam đang mở): mã phòng = lobby id của Steam, dữ liệu đi P2P / qua relay của Steam.
  - **PeerJS** (bản web, hoặc không có Steam): WebRTC bằng [PeerJS](https://peerjs.com) (`lib/peerjs.min.js`);
    PeerJS Cloud chỉ dùng lúc bắt tay. Người chơi Steam và PeerJS không vào chung phòng được.
- Core Upgrade: mỗi người chọn thẻ của mình, hết `draftTimeLimit` giây thì tự chọn thẻ đầu.
- Esc trong trận online chỉ mở menu (trận không dừng). Đối thủ rời phòng → về phòng chờ / menu online.
- Tab bị ẩn hoặc thu nhỏ vẫn chạy nhờ đồng hồ Web Worker, nên chủ phòng chuyển cửa sổ khác thì trận không bị đứng.
- Mỗi người chạy bản game của mình (mở `index.html` hoặc `npm run serve`), cần Internet để bắt tay.
  Muốn chơi qua link: đưa cả thư mục lên host tĩnh (GitHub Pages, Netlify, itch.io...).
- Thông số ở `config/net.config.js` (tần suất gửi, độ trễ nội suy, thời gian chọn Core, PeerServer riêng).
- Debug trên 1 máy: mở 2 tab, tab này tạo phòng, tab kia vào phòng.

**Light / Hard attack (phòng ngự):** không có tắc bóng — chỉ dùng đòn khi đội mình không có bóng, mỗi đòn có cooldown riêng hiển thị trên thanh kỹ năng
ở giữa đáy màn hình (kiểu LoL: chân dung · ô D / A / Z với cooldown quét · thanh thể lực · Core như ô item).
Light (D): cú đấm thẳng — kéo tay lấy đà rồi đấm, tầm ngắn, choáng ngắn + đẩy lùi, người cầm bóng có tỉ lệ rơi bóng. Hard (A): gồng co chân (hào quang đỏ, xoay hướng được)
rồi vung chân đá — trúng thì đối thủ bị hất tung bay rất xa (văng vào tường thì bật lại), choáng lâu và chắc chắn rơi bóng; trượt thì khựng lâu. Z (lướt) đúng lúc thì né được cả hai. Chỉnh trong `SFC_CONFIG.game.combat.light / hard`.

**Chế độ điều khiển (Chơi đơn):** `CẢ ĐỘI` (Q đổi người, chuyền bóng thì điều khiển luôn người nhận) hoặc `1 CẦU THỦ`
— chỉ điều khiển đúng cầu thủ đã chọn cả trận (không đổi người, không tự chuyển), đồng đội do AI chơi; đòi bóng bằng S / W (D / A vẫn ra đòn).
Cơ chế nằm ở `opts.solo` của `SFC.Game` (khóa theo từng đội, dùng lại được cho online).

**Trông khung thành (2v2):** mỗi đội 2 cầu thủ sân, vai trò chỉ là vị trí xuất phát. Ai đứng trong vòng cấm nhà thì có cơ chế thủ môn
(tầm bắt `gkReach`, bắt bóng bổng `gkCatchHeight`, tỉ lệ cứu thua / PARRY, đeo găng). Bắt được bóng trong vòng cấm → miễn tắc `gkHoldProtect` giây;
tự rê bóng vào vòng cấm thì không. Đội máy: AI không áp sát sẽ lùi về trông khung khi đối phương cầm bóng cách khung thành dưới `ai.keeperCoverDist`.

**Đồng đội AI của người chơi** (`ai.mate`, vd. người còn lại ở chế độ 1 CẦU THỦ) — lối chơi theo vị trí (`mate.roles`):
- **ĐÁ CAO** (bạn đá ĐÁ LÙI): phòng ngự luôn áp sát người cầm bóng, chỉ về trông khung khi nguy hiểm rõ ràng
  (người cầm bóng cách khung nhà < `dangerDist`, bạn không đứng trong vòng cấm nhà, và nó không đang áp sát); tấn công ưu tiên rê bóng + dứt điểm, ít chuyền
  (`passChance`), sút ở bất kỳ đâu trên phần sân đối phương nhưng càng xa càng ít sút; né (lướt) quyết định 1 lần mỗi lần bị áp sát (`skillChance`).
  Cơ hội mười mươi (khung trống, đường sút thoáng, cách khung < `quickShotRange`): `quickShotChance` sút nhanh lực nhẹ thay vì nạp lực.
- **ĐÁ LÙI** (bạn đá ĐÁ CAO): chơi thủ như đội máy — lùi về trông khung khi người cầm bóng cách khung nhà < `ai.keeperCoverDist`, kèm người còn lại
  khi bạn đang áp sát, chỉ lên áp sát khi bạn ở xa người cầm bóng (> `ai.keeperPressDist`); bóng lỏng ở phần sân nhà mà bạn đuổi bóng → về trông khung; chuyền nhiều.
- Mọi vị trí: đón đường chuyền bằng chạy nước rút (chuyền lỗi: luôn chạy); hồi chiêu riêng dài hơn người chơi (`cooldownMult`: đấm x1.8, Hard x1.5, lướt x2.2),
  đấm với tỉ lệ `lightChance`. Độ khó của nó = `ai.teammate` nhưng không bao giờ cao hơn độ khó đã chọn.

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
  ftue.config.js        PROLOGUE: kịch bản cut scene, các bài của trận mơ, Core / Ultimate, đội + sân trong mơ
  progression.config.js level / XP / gold, thưởng sau trận, costume, độ hiếm, hộp gacha, level Core
src/
  engine/      utils, input + gamepad (map phím → action), audio (WebAudio chiptune), storage (localStorage / file save), i18n
  meta/        profile (hồ sơ + tiến trình), mainpath (Main Path), teammates (đồng đội), settings
  entities/    ball (vật lý 2.5D x/y/z, khung thành, lưới), player
  systems/     actions (chuyền/sút/tắc/Light & Hard attack...), cores (hook hành vi), effects,
               ai (trông khung/giữ bóng/hỗ trợ/phòng ngự), human (controller)
  game/        match.js — state machine trận đấu · tutorial.js — kịch bản trận mơ PROLOGUE
  render/      sprites (pixel-art procedural), background (sân + tường), renderer
  net/         transport (chọn backend) + transport-steam / transport-peer, sync (snapshot / nội suy / phím từ xa), online (phòng chờ + vòng lặp host/khách)
  ui/          menu (trang chủ + hồ sơ, chơi đơn, online, nhân vật, hướng dẫn), story (cut scene PROLOGUE), gacha (shop hộp, quay hộp, túi đồ), ui (HUD, chọn Core, pause, kết quả + thưởng)
```

### Thêm Core mới
1. Thêm entry vào `config/cores.config.js`.
2. Nếu chỉ cần chỉ số thụ động: dùng `mods` (speed, offBallSpeed, shotPower, passSpeed,
   tackleRange / tackleChance (tầm / tỉ lệ cướp bóng của Light attack), knockback, chargeTime, accuracy, sprintRegen, momentumGain...).
   Theo luật "không Core vô hình" (docs/CORE_DESIGN.md), Core chỉ số vẫn nên có hình ở `src/render/vfx.js`.
3. Nếu cần hành vi riêng: thêm object cùng `id` vào `Behaviors` trong `src/systems/cores.js` (Core cũ) hoặc `src/systems/cores-new.js` (Core Giai đoạn 3)
   với các hook: `onShoot`, `onChargedShot`, `onPass`, `onPassReceived`, `onSkillMove`, `onSprintStart`, `onHardAttack`, `onTackle`,
   `onTackleWin`, `onLightHit`, `onHardHit`, `onWallBonk`, `onDodge`, `onSteal`, `onGoalScored`, `onKickoff`, `onPossessionGained`,
   `onHit`, `onGoalLine`, `onWallHit`, `update`; Tuyệt kỹ: `onUltimate` + `aiUse` (danh sách đầy đủ ở đầu file).

### Core Upgrade (docs/CORE_DESIGN.md)
- Mỗi Core có **trường phái** (`tags`: runner / playmaker / striker / brawler / launcher / trickster / iron / chaos), **vai trò** (`role`) và **độ hiếm** (`rarity`) trong `config/cores.config.js`.
- **Cộng hưởng**: gom 2 / 3 / 4 Core cùng trường phái (Core cầu nối tính cho cả hai) → mở bonus (`sets`); bậc 4 đổi **hình thái** cả đội. Hiện trên HUD dạng `🏃3`.
- **Tài nguyên**: Đà (chạy nước rút), Nhịp (chuyền tới chân, của cả đội), Nộ (đấm trúng), Giáp (chặn 1 lần choáng) — chỉ chạy khi đội có Core của trường phái đó; bộ đếm ở thanh kỹ năng.
- **Tuyệt kỹ** (`role: 'ult'`, phím **X**): năng lượng nạp khi ghi bàn / cướp bóng; cut-in rồi mới ra chiêu; AI tự dùng. Chỉ xuất hiện khi đã có ≥ 2 Core cùng trường phái, mỗi đội tối đa 1.
- **Chọn Core**: 5 lượt — 1 trước khi giao bóng, sau đó cứ `match.draftEvery` giây (mặc định 24s) tích +1 lượt, **chỉ mở khi có bàn thắng**
  (tích nhiều thì chọn liền); tới FINAL PUSH mà còn lượt thì tạm dừng trận để chọn nốt. Mỗi lượt được **đổi 3 lá 1 lần (phím R)**; trọng số theo build, từ lượt 2 luôn có ít nhất 1 lá cùng trường phái. Logic ở `src/systems/cores.js` (`CoreSystem`).
- **Không Core vô hình**: tài nguyên hiện trên người cầu thủ (tia điện dưới chân = Đà, nắm tay bốc lửa = Nộ, ánh bạc + khiên nhỏ = Giáp,
  nốt nhạc quanh đội = Nhịp), bóng mang vệt theo Core (`ball.fx`: dây đàn vàng, xoắn rồng, laser, sét), hào quang cầu thủ (`player.glow`).
  Vẽ ở `src/render/vfx.js` (`under` / `look` / `ballFx`).
- **53 Core**, mỗi trường phái 1 **Tuyệt kỹ**: Tia Chớp Xuyên Sân 🏃, Tiki-taka Vô Tận 🎼, Cú Sút Sao Băng 🎯, Bách Quyền 🥊, Thiên Thạch Giáng 🦵 (điều khiển tâm ngắm bằng mũi tên), Đại Phân Thân 🌀, Hoá Khổng Lồ 🛡.
- **Ảnh động xem trước Core** (`src/ui/corepreview.js`): trận mini thật chạy kịch bản của từng Core (bảng `SCENES`), vẽ bằng Renderer vào `<canvas data-preview="id">` rồi `SFC.CorePreview.scan(el)`. Core mới cần thêm 1 kịch bản (mặc định: chạy nước rút).
- Màn kết quả: **Khoảnh khắc của trận** (sự kiện `ultimate` / `moment`) + build nổi bật mỗi đội.
- Debug: `SFC.app.game.cores.add(0, 'lightning_dash')`, `SFC.app.game.ult[0] = 1` rồi bấm X.

### VFX Sandbox
Mở `http://localhost:8080/sandbox.html` — trang thử **VFX Kit** (Giai đoạn 0 của `docs/CORE_DESIGN.md`): nút cho từng viên gạch
(hit-stop, slow-mo, zoom, impact frame, callout, cut-in, sóng chấn, vết nứt / hố, tay co giãn, phân thân, lưỡi gió, luồng tia, lỗ đen,
khổng lồ, skin bóng, khiên lục giác, cổng xoáy, lưới cháy...) và 12 "khoảnh khắc" ghép sẵn (phím 1–9, 0).
Mục **CORE THẬT** bật / tắt từng Core của `cores.config.js` cho đội vàng (kèm nút đầy tài nguyên / đầy Tuyệt kỹ) để xem hành vi thật trong trận. Viên gạch ở `src/systems/vfxkit.js` (gắn vào `Effects`, tự đồng bộ online),
hình vẽ ở `src/render/vfx.js`, hit-stop / slow-mo ở `Game.hitStop / slowMo`. Tuỳ chọn *Giảm nháy* lưu ở `localStorage` (`sfc_fx`).

### Debug
`SFC.app` trong console: truy cập `SFC.app.game` (trạng thái trận), ví dụ
`SFC.app.game.cores.add(0, 'thunder_kick')` để thử Core ngay lập tức.
