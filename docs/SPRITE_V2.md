# SPRITE v2 — người chơi kiểu key art trên lưới 2x

> Trạng thái: **TRONG GAME từ 2026-11-01** (không cờ test, user: "no need for a dev flag"). Mọi động tác, đồ, hiệu ứng, áo đội đã duyệt. Phần vẽ người 1x cũ đã xoá (mục 19).
> Luật vẽ dùng lại khi thêm động tác / đồ / hiệu ứng mới: `docs/SPRITE_GUIDE.md`.
> Code: `src/render/player/` (`SFC.PlayerSprite`, mỗi động tác 1 file, thứ tự nạp trong `scripts/manifest.js`) · công cụ vẽ + trang xem + `check.cjs`: `tools/sprite-v2/README.md`.
> Trang duyệt: `node tools/sprite-v2/page.mjs` -> `tools/sprite-v2/out/site/sprites.html`.
> Giữ nguyên: mọi logic trận, online, số liệu. Sprite chỉ đọc trạng thái người chơi như `SFC.Sprites.drawPlayer`.

## 1. Quyết định của user

Đừng làm lại phương án đã bỏ.

- **Kiểu.** Key art, 2 góc nhìn như hiện tại: mặt cho mọi hướng trừ lên, sau lưng khi nhìn lên. Mặt trượt ngang theo hướng nhìn.
- **Lưới 2x.** 1 px mịn = nửa px game; game sẽ vẽ ở 1280 × 720 thay 640 × 360. Tư thế đứng = sprite v2 1x nhân đôi đúng từng px (viền 2 px mịn = 1 px game).
- **Không bo, không thêm chi tiết ở tư thế khoá.** Bản 2x vẽ lại mượt + thêm chi tiết đã bị bỏ. Tư thế đứng và tư thế khoá của động tác ở lưới game, bậc 1 px game.
- **Khung chuyển động được dùng lưới mịn** (user 2026-11-01): khung giữa các tư thế khoá cho tự nhiên, không cần bó theo kiểu hiện tại: góc chi mượt từng px mịn, nhoè (smear), viền mịn.
- **Đầu A.** 15 × 13, tròn hơn đầu v2, mắt vuông 3 × 3 như sprite hiện tại. Nhìn trái lệch mặt 1 px (không 2) để mắt trái không dính viền.
- **Cao 24 px như sprite hiện tại** (thân B): áo 3 hàng, không hàng đầu gối, tất ngay dưới quần. Đã bỏ: giữ đầu gối bằng quần 1 hàng; bớt áo 2 hàng.
- **Tay chéo xuống.** Tay gần đủ + cục da tay xa (user chỉnh, đừng phá).
- **Mũi giày.** Nhìn thẳng xuống / lên: không mũi. Chéo, ngang: cả 2 mũi theo hướng mặt.
- **Chạy.** 4 khung, 12 khung / s như nhịp hiện tại: trụ trước · lướt qua · đá gót · nhấc gối. Thân nhấp nửa px, tay vung 1 và 2 px mịn, chạy ngang chân sải trước / sau.
- **Động tác: tay chân giữ đúng độ dài lúc đứng.** Tay = tay áo + 2 px cẳng tay + nắm tay 3 × 3; chân = 4.5 px từ hông tới bàn chân. Tầm với đến từ thân: ngả, lao tới, bước chân. Đã bỏ: chuyển thẳng tư thế hôm nay sang người mới (tay "dây thun" 12 px, chân 11 px).
- **Cả người cùng ra đòn.** Không tay nào đứng yên khi ra đòn.

## 2. Cú đấm (đã duyệt 2026-11-01)

- **Pha.** `attackPose` trả `e`: −1 thu nắm tay về, 0 nắm tay cạnh vai, 1 duỗi hết (suy từ `fist` của sprites.js, cùng nhịp `combat.light`).
- **Tư thế khoá** mỗi góc nhìn (`PUNCH`): ô trên trái nắm tay lúc nghỉ / thu / duỗi, và độ ngả của thân.
  - Ngang: thu nắm tay về ngực, thân ngả sau nửa px. Đấm: thân lao 1 px, đầu dẫn trước nửa px, chân trước bước tới, gót chân sau nhấc (thấy đế).
  - Chéo xuống: như ngang, tay đấm chéo xuống.
  - Xuống: nắm tay băng qua trước bụng và to lên 4 × 4 (gần máy quay), đầu cúi nửa px.
  - Mọi hướng đấm bằng tay trái của cầu thủ (user 2026-11-01): hình vẽ tay bên phải màn hình, nhìn lên (thấy lưng) thì lật riêng 2 tay (`pm`).
  - Lên: nắm tay dựng cạnh đầu; vẽ trước khi vẽ đầu nên đầu che một phần (tay ở xa máy quay hơn đầu).
- **Tay kia** (`OFF`):
  - Ngang: lúc đấm vung mạnh ra sau thân (vẽ sau thân, da tối). Lúc thu tay đấm giữ tay đứng: vươn ra trước thì khuất hẳn, trông như mất tay.
  - Chéo: thu tay đấm = vươn qua ngực, đấm = vung ra sau.
  - Xuống: lúc đấm vung ra sau lưng (user: không giơ lên), từ máy quay thấy tay ngắn, bàn tay khuất sau hông.
  - Lên: vung xuống phía máy quay.
- **Vai áo** (`shoulderPush`): tay ra khỏi vai thì vai áo nhô 1 ô theo tay; chỗ tay áo nối thân liền màu tối, không viền.
- **Khung chuyển động** (`punchFine`): lưới mịn; khung giữa thu và duỗi nhoè nắm tay dọc đường vừa đi, đuôi sáng dần.

## 2b. Hard attack (đã duyệt 2026-11-01)

User yêu cầu: 1) lấy đà: khuỵu gối, hạ người · 2) cú đá: vung chân đá từ sau chân trụ, bật nhảy nhẹ, trông mạnh.

- **Nhịp** (`attackPose`, theo `combat.hard`): gồng nửa đầu khuỵu + thu chân, nửa sau giữ tư thế lấy đà · `kickTime` nửa đầu vung tới hết tầm, nửa sau giữ (vùng đá vẫn có hiệu lực) · 0.15 s về: hạ chân, rơi, tiếp đất khuỵu 1 px.
- **Lấy đà**: thân hạ 1 px, ngả sau nửa px; chân trụ bước rộng 1 ô; chân đá thu ra sau chân trụ, gót nhấc (thấy đế); tay phải giơ cao, tay trái buông (tay ngược chân, user 2026-11-01). Ngược cả trước / sau: nhìn ngang / chéo, lấy đà = tay phải vung lên phía TRƯỚC (vắt qua ngực về hướng mặt), hết tầm = tay phải vung thấp ra SAU.
- **Đá**: bật nhảy 2 px (bóng thu nhỏ), thân lao 1 px; chân đá vung từ sau, qua dưới hông, ra hết tầm (đế ra trước); chân trụ co lại tại chỗ trên không, không đổi bên (user: thu chân phải lấy đà thì chân phải phải là chân đá; co sang chỗ chân đá vừa rời thì trông như 2 chân đổi nhau); tay bên chân đá vung ra sau, tay kia ra trước / lên; đầu ngả sau nửa px; tia sáng ở bàn chân 4 khung đầu lúc hết tầm.
- **Theo hướng** (`KICK`): ngang / chéo: chân sau xoay quanh hông, hông trượt từ sau ra trước (−4 → 3). Xuống: đế giày 4 × 4 (mũi rộng, gót hẹp) đè lên trước thân. Luôn đá bằng chân phải của cầu thủ: hình `KICK.front` vẽ chân đá bên phải màn hình nên nhìn xuống lật riêng chân (`km`). Lên: đá chếch ra cạnh người (đá thẳng ra xa thì thân che hết).
- Ống chân từ hông 2.5 ô + bàn chân (= chân đứng); tay 2.4 ô từ vai. Tư thế khoá ở lưới thế giới, khung vung ở lưới mịn (cung sáng + 2 bóng bàn chân).
- Hào quang gồng đỏ vẽ sau người (trước đây đè lên, che tư thế lấy đà).

## 2c. Chuyền, sút mạnh, chạy nước rút (2026-11-01, đang thử trong game)

User chọn: P2 cho chuyền sệt + chọc khe, P3 cho chuyền bổng, S2 cho sút mạnh, R1 cho chạy nước rút. Thân chuyển động (`torso.js`: thân nghiêng thật, vai vặn, lai quần nhấc) chỉ dùng cho các động tác mới này.

- **Chuyền** (`pass.js`, `atkType` `pass` / `lob` đặt ở `Actions.passTo`, giữ `pass.poseTime`): P2 nhẹ hơn P3 (vung vừa, theo đà ngang ống quyển, không bật); P3 ngả sau, xúc bóng, bật nhẹ. Bóng rời chân lúc thả phím nên vẽ từ đầu cú vung; tư thế lấy đà chỉ hiện khi đứng yên giữ phím nạp lực chuyền (đang chạy thì vẫn chạy: chuyền không làm chậm người, lấy đà đứng hình trượt theo trông giả).
- **Sút mạnh** (`power.js`, `kick.powerPose` …): chỉ đổi hình, di chuyển / lúc sút / AI giữ nguyên (user). Lực thật (`Actions.shotPower`) qua 60% lúc người chơi giữ phím (AI: định sút từ 60%, `ai.chargeTarget`, thì ngay từ đầu lúc nạp) → `atkType` `pw` tới lúc sút; hình chọn theo vận tốc mỗi khung: đang chạy = chạm đẩy bóng (`push`) rồi bước nặng (`HEAVY`), đứng = thu chân `powerWind` giây rồi giữ, người run dần. Thả phím là sút ngay (bản thử chờ tới bóng mới sút làm người sút bất khả xâm phạm và cú sút trễ, user bỏ; bản thử khoá chân khi đứng lấy đà cũng bỏ). Ngoại lệ duy nhất ngoài hình (user yêu cầu): bóng của người chơi đang chạy lấy đà nằm xa chân thêm `powerPush` px (`Actions.powerPushes` → `Ball.follow`). Cú sút từ 60% trở lên (cả AI) diễn vung chân sút mạnh (`atkType` `power`). Online không cần thêm trường.
- **Chạy nước rút** (`sprint.js`): sải dài 4 khung 12 / s khi nhìn ngang và chéo (chéo: tầm với ngang co 0.6, tay xa sau thân); nhìn xuống / lên giữ bước chạy thường (user). Bật khi `p.sprinting` (máy khách online: nhanh hơn `fx.run.sprint`). Bước nặng của sút mạnh dùng cùng máy vẽ; nhìn xuống / lên là bước chạy thường chậm lại + hạ người lúc đặt chân.

## 3. Toạ độ (thân B, đầu A)

- **Trái / phải khi user nói** (user 2026-11-01): "tay trái", "chân trái" = bên trái của chính cầu thủ, mặc định nhìn xuống (về máy quay) -> tay / chân trái của cầu thủ nằm bên **phải** màn hình. Chú thích cũ trong `player/` và mục 2 dùng trái / phải theo màn hình (vd. "chân trái cột viền −4" = bên trái màn hình = chân phải của cầu thủ khi nhìn xuống).
- **Trục cục bộ kiểu Unity** (user duyệt 2026-11-01): +Y lên, +Z = hướng mặt, +X = bên phải của cầu thủ (hệ tay trái: nhìn từ trên, X = Z xoay 90° theo chiều kim đồng hồ).
- **Tay / chân phải nằm bên nào màn hình**: thân là hình nhìn thẳng trượt theo hướng mặt, nên nhìn xuống, chéo xuống, ngang (cả trái lẫn phải) -> tay / chân phải của cầu thủ bên **trái** màn hình; nhìn lên, chéo lên (thấy lưng) -> bên **phải**. Lật hình nhìn phải thành nhìn trái là đổi tay / chân với nhau. Hướng nhìn trái giữ nguyên là hình lật của nhìn phải (user chốt 2026-11-01): nhìn trái đấm bằng tay phải, đá bằng chân trái, băng chấn thương cũng lật theo.
- Hard attack luôn đá bằng chân phải, cú đấm luôn bằng tay trái (mọi hướng).
- Gốc mịn (X, Y) = 2 × gốc thế giới (giữa dưới chân). Lật ngang: cột thế giới x ↔ −x; px mịn u ↔ 1 − u.
- Thân hàng −11..−4 (cột −5..5). Chân −4..0. Đầu −23..−11 (cột −7..7). Tay đứng cột −8..−6 hàng −10..−5, vai (∓6, −9).
- Mặt: mắt hàng −17..−15 (cột −4 và 1, lệch theo hướng nhìn), mũi −14, miệng −13.
- Bộ phận là bản đồ chữ: K viền · S/s da · T/t áo · P quần · O tất · G/g giày / đế · H tóc · B/b băng đô · W trắng.

## 4. Cấu trúc player/

Classic script như game (không module): mỗi file là 1 IIFE, lấy hàm dùng chung từ `window.PlayerSprite` và gắn hàm của mình vào đó. Thứ tự nạp = `player/order.json` (`cdp.mjs`, `check.cjs` đọc file này; khi vào game sẽ thành các dòng trong `scripts/manifest.js`).

| File | Việc |
|---|---|
| `base.js` | màu (`INK`, `shade`), đóng dấu bộ phận (`stamp`), chi lưới thế giới (`limbCells` / `drawCells`) và lưới mịn (`fineLimb` / `drawFine`), nội suy |
| `body.js` | bảng màu, bộ phận chân / thân / tay (`BODY`), đầu (`HEAD_A`), mặt, bóng, băng quấn, chớp trắng |
| `run.js` | chạy 4 khung |
| `punch.js` | cú đấm |
| `kick.js` | Hard attack + máy vẽ chân / tay dùng chung theo bảng tư thế (`KICKS`, `kickTable`, `legPose`, `drawKickLeg`, `kickArm`) |
| `shoot.js` | sút + vô-lê: bảng `SHOOT` / `VOLLEY` cùng dạng bảng Hard attack |
| `pass.js` | chuyền sệt / chọc khe (`pass`), chuyền bổng (`lob`), chạm đẩy bóng (`push`) + nhịp `PASS_T` |
| `power.js` | sút mạnh: bảng `POWER`, nhịp `POWER_T`, khung bước nặng `HEAVY` |
| `torso.js` | thân chuyển động cho động tác mới (`torsoPart`, `kickTwist`) |
| `sprint.js` | bước riêng khi nhìn ngang / chéo: chạy nước rút (`SPRINT`) + bước nặng (`GAITS`, `gaitLegs`, `gaitArms`) |
| `fly.js` | bị đá bay: theo dõi lúc chạm đất ở phía vẽ (`flyState`), góc xoay (`flyRot`), tư thế lộn / nằm / dậy (`flyPose`, `flyArms`, `flyLegs`) |
| `hit.js` | bị đấm: theo dõi lúc bị đánh ở phía vẽ (`hitState`), tay văng ra rồi lắc tắt dần (`hitSwing`, `hitArms`) |
| `celebrate.js` | ăn mừng: tay theo luật độ dài (`celArmSet`, `celArms`, chỉnh riêng `CEL`), chân quỳ, điểm neo đạo cụ (`celAnchors`), vẽ cả động tác (`celDraw`) |
| `keeper.js` | thủ môn đổ người: 2 tay vươn lên (găng kẹp 2 bên mặt), chân khép, đầu rụt (`DIVE`, `diveArms`, `diveLegs`, `diveHeadDy`) |
| `header.js` | đánh đầu: tư thế khoá theo tiến độ cú nhảy (`HEADER_KEYS`), chân / tay / tia sáng ở trán |
| `ported.js` | bản chuyển thẳng chờ làm lại: chân ăn mừng (xếp bằng, ngồi bệt) |
| `pose.js` | `attackPose(p)` + nhịp chung chuyền / sút mạnh (`kickTimeline`) |
| `draw.js` | `draw()` ghép cầu thủ |
| `player.js` | `drawPlayer()` |

Động tác mới: thêm 1 file (vd. `shoot.js`) trước `pose.js` trong `order.json`, chuyển phần của nó khỏi `ported.js`, gọi từ `draw.js`.

- `draw(ctx, X, Y, o)` vẽ ở px mịn. `o` = màu + `facing`, `moving`, `anim`, `lean`, `atk` (attackPose), `cp` (celPose), `stun`, `windup`, `flash`, `glove`, `inj`, `noShadow`.
- `drawPlayer(ctx, p, g, alpha, tint, ghost)` thay được `SFC.Sprites.drawPlayer`: ctx ở toạ độ 1x (renderer scale x2), bên trong scale 0.5; ctx đang xoay thì vẽ vào bộ đệm rồi xoay cả ảnh (px sắc).
- `attackPose(p)` như sprites.js, thêm `e` (pha đấm) và cho Hard attack: `kp` / `u` (pha `in` / `go` / `out` + tiến độ), `kc` (khuỵu), `kbx` (lao tới), `khop` (bật nhảy), `impact` (mục 2b).
- Chi tự do ở tư thế khoá: `limbCells` + `drawCells` (lưới thế giới, viền 4 hướng nên góc ngoài tự bo như tay đứng). Khung chuyển động: `fineLimb` + `drawFine` (lưới mịn, viền 2 px mịn).
- Một kiểu thân (`BODY`) và một kiểu đầu (`HEAD_A`). Các biến thể đã bỏ (đầu v2 / B, thân cao 26) đã xoá khỏi code 2026-11-01 (user đồng ý).

## 5. Tình trạng

| Phần | Trạng thái |
|---|---|
| Đứng, 6 hướng | Duyệt |
| Chạy, chạy nước rút | Duyệt |
| Đấm 4 hướng | Duyệt 2026-11-01 (tay trái mọi hướng; nhìn lên lật tay cùng ngày) |
| Hard attack | Duyệt 2026-11-01 (2 bước: lấy đà + đá bay) |
| Trạng thái: choáng, gồng, găng thủ môn, chớp trắng, bóng lướt, chấn thương | Chuyển sang thân mới, chưa duyệt |
| Sút, vô-lê | Duyệt 2026-11-01 (chạm bóng -> theo đà -> về; vô-lê giữ bật nhẹ lúc theo đà) |
| Đánh đầu | Duyệt 2026-11-01 (khuỵu -> bật -> ngả sau -> gật -> rơi -> tiếp đất) |
| Thủ môn đổ người | Duyệt 2026-11-01 (2 tay vươn lên, găng kẹp mặt, đầu rụt, chân khép; cất người / đứng dậy chuyển dần) |
| Bị đá bay | Duyệt 2026-11-01 (lộn vòng tay chân văng -> nằm sõng soài -> lăn dậy -> đứng choáng) |
| Ăn mừng | Bản chuyển thẳng. Cần điểm tay mới trong `celebrate-draw.js`; `moves.mjs` vá tạm vai (±6, −1) và tâm đầu (−9) |
| Tóc, mũ, phụ kiện mặt, giày khác mặc định, aura | Chưa làm |

## 6. Đưa vào game (đề xuất, chưa duyệt)

1. Giữ công cụ trong repo: xong.
2. Renderer 1280 × 720, vẽ sprite cũ gấp đôi (màn hình y hệt). Kiểm: hiệu năng (4 lần số px, nhất là bản web), ánh xạ chuột, bộ đệm thủ môn `Renderer.diving` (48 → 96), toạ độ vai / đầu của `CelebrateDraw`.
3. Sprite mới sau cờ test (`?sprite=v2` hoặc SETTINGS › TEST); phần chưa làm dùng hình cũ.
4. Thành mặc định khi tóc / mũ / mặt / giày và các động tác còn lại xong: đồ người chơi đã mua không được mất.

Online không ảnh hưởng: sprite chỉ đọc trạng thái trận, không thêm trường snapshot.

## 7. Việc còn lại để hoàn tất (ghi 2026-11-01)

Thứ tự đề xuất: A (động tác) và D1 (renderer) làm song song được; B phải xong trước khi thành mặc định. Mỗi phần user duyệt xong thì thêm vào `check.cjs` (`--update`).

### A. Động tác (làm trong `tools/sprite-v2/`, duyệt trên trang xem)

1. ~~**Hard attack: làm lại**~~ Xong, duyệt 2026-11-01 (mục 2b). Các ý dưới là lỗi của bản trước, đã sửa.
   - Cả người cùng ra đòn: 2 tay đang đứng yên lúc đá (đúng lỗi user đã chỉ ở cú đấm).
   - Tư thế gồng chưa đọc rõ: chân thu ra sau lẫn vào chân trụ.
   - Nhìn xuống / lên yếu: đá về phía máy quay gần như không thấy chuyển động.
2. ~~**Sút + vô-lê**~~ Xong, duyệt 2026-11-01 (`player/shoot.js`).
   - Game chỉ vẽ tư thế sau khi bóng rời chân (sút `kick.poseTime` 0.12 s, vô-lê `firstTime.volley.pose` 0.22 s; bicycle cũng dùng tư thế vô-lê) nên không có lấy đà: 10% đầu chạm bóng (khoá, tia sáng ở mũi giày) · tới 40% vung theo đà · giữ tới 70% · về đứng.
   - Dùng máy vẽ chân / tay của Hard attack với bảng riêng (`atk.kt` = `shoot` / `volley`); `plant` (cột chân trụ nhìn ngang) và `tuck` (co chân trụ trên không) theo bảng.
   - Sút: chạm sát đất ngay trước chân trụ (chân trụ lùi 1 ô), người chúi tới; theo đà chân hất lên trước, nhấc người 1 px. Vô-lê: chân duỗi ngang hông, đế ra trước, người ngả sau, 2 tay dang cao; theo đà chân lên cao hơn, bật 1.5 px.
   - Tay khi đá bằng chân phải (user 2026-11-01): tay **phải** của cầu thủ buông xuống (hơi tách người), tay trái vung ra trước / lên. Áp cho sút, vô-lê và Hard attack lúc hết tầm; lúc lấy đà của Hard attack thì ngược lại (chân phải thu về -> tay phải giơ, tay trái buông). Nhìn lên: tay phải buông thẳng và chân đá ra xa hơn (hông ra tới cột 6) để bàn chân không bị tay che.
   - Ống quần theo đùi đã thử rồi bỏ (user 2026-11-01: giữ quần đứng yên như cũ).
   - `inBack` theo bảng: tư thế đầu của Hard attack (lấy đà) nằm sau thân; của sút / vô-lê (chạm bóng) nằm trước thân (trước đây chân chạm bóng của vô-lê bị thân che mất).
   - Nhánh vẽ sút cũ (`atk.shoot` trong `draw.js`, `diagLeg` trong `ported.js`) đã xoá (user 2026-11-01).
3. ~~**Đánh đầu**~~ Xong, duyệt 2026-11-01 (`player/header.js`).
   - Game: `headerJump` bắt đầu cú nhảy trước khi bóng tới `lead` 0.22 s; cả cú nhảy `pose` 0.5 s, cao `hop` 14 px (chỉ vẽ); `headerPose` đặt tiến độ ≥ 42% lúc chạm (chưa nhảy: từ 30%) -> chạm ngay trước đỉnh (50%).
   - Tư thế khoá theo tiến độ: khuỵu lấy đà 8–14% (tay vung ra sau) · bật lên 28% (tay vung lên, gót co) · ngả sau ở đỉnh 38–44% (thân + đầu ngả sau, tay giơ) · gật 50–58% (đầu lao tới 1 px, tay giật xuống ra sau, tia sáng ở trán 50–56%) · rơi 78% · tiếp đất khuỵu 86–92%. Độ cao: đứng tới 12%, bay 12–88%, đỉnh 50%.
   - Tay 2.4 ô từ vai nên "giơ cao" chỉ tới ngang vai / cạnh đầu (luật độ dài).
   - Nhánh đánh đầu cũ (`tuck` / `armsUp` / `nod` / `hop` trong `draw.js`, `armUp` trong `ported.js`) đã xoá (user 2026-11-01).
4. ~~**Thủ môn đổ người**~~ Xong, duyệt 2026-11-01 (`player/keeper.js`).
   - Giữ `Renderer.diving` của game (vẽ tư thế đứng thẳng vào bộ đệm rồi nâng theo cung, ép dẹt 0.85 lúc bay / 0.7 lúc nằm, nghiêng, lật dọc khi bay xuống, vệt gió); chỉ làm lại tư thế. Bộ đệm phải gấp đôi cho sprite 2x (48 -> 96, mục D17; `pilot.mjs` có bản `diving2`).
   - `attackPose` trả `dk` = tiến độ bay (`gkDiveTime` 0.24 s), lúc nằm (`gkDivePose` 0.22 s) = 1. 35% đầu: 2 tay vung từ buông lên (lưới mịn); sau đó khoá.
   - Tay giữ độ dài tay đứng nên không qua được đầu: vai nhô lên 2 ô, đầu rụt xuống 2 ô giữa 2 tay -> 2 găng 3 x 3 kẹp 2 bên mặt. Chân khép duỗi. Mặt vẽ lại (trước đây ẩn), mắt nhìn về phía bay tới.
   - Chuyển cảnh (user 2026-11-01: "cần khung chuyển từ đứng sang bay và từ bay về đứng", "chú ý chân"). Biến hình đưa vào `diveXform` (keeper.js) để `Renderer.diving` dùng khi vào game: cung nâng 9 px bắt đầu / kết thúc ở 0 (game: nhảy lên 3 px ngay khung đầu).
     - Cất người (0.06 s đầu cú bay; game bắt đầu bay ngay nên chuyển cảnh nằm trong cú bay): ép / nghiêng / bóng đổ / tâm ảnh đi dần từ dáng đứng. Chân: khuỵu dạng rộng -> 1 chân duỗi đạp đất, chân kia co gối -> khép. Bay xuống: ép tới nửa rồi lật (không có khung dẹt thành 1 đường).
     - Chạm đất (0.05 s đầu lúc nằm): ép 0.85 -> 0.7, nghiêng 0.22 -> 0.1.
     - Đứng dậy (0.1 s cuối lúc nằm): dựng dần về dáng đứng, chân ở đúng chỗ; tay hạ, đầu ngẩng; chân: khép -> dạng rộng chống đất -> khuỵu -> đứng. (2 gối co dưới người đã thử: thân dẹt che mất chân.)
     - Thời điểm nằm xong lấy từ `p.poseEnd` (Player đặt lúc chạm đất). Trường này không đồng bộ online: máy khách coi như bay hết `gkDiveTime` (cú bay ngắn thì đứng dậy hơi trễ). Muốn đúng tuyệt đối thì thêm `poseEnd` vào `PF` của `sync.js` (đổi giao thức, mục D18).
   - `diveArm` cũ trong `ported.js` đã xoá (user 2026-11-01). Trường `lift` / `sweep` của Hard attack trong `attackPose` cũng xoá; `leg` chỉ còn là cờ "đang đá".
5. ~~**Bị đá bay**~~ Xong, duyệt 2026-11-01 (`player/fly.js`).
   - Game: Hard attack hất `launch` 190 px/s lên + `knockback` 380 px/s ngang, `airGravity` 620, `airDamp` 1.4 (dưới đất `knockbackDamp` 7), rơi nhanh hơn 140 px/s thì nảy 30%; bay ~0.6 s, cao ~29 px, trượt ~180 px. State `stun` suốt; choáng 1.6 s chỉ trôi khi đã chạm đất. `Renderer.airborne` hôm nay xoay nguyên hình đứng `dir * anim * 13` rồi về đứng thẳng ngay lúc chạm đất.
   - Pha: lộn (đang bay: tay chân văng ra, mắt X, há miệng; vẫn xoay như game) · chạm đất (góc xoay về ±90° trong 0.08 s, đầu theo hướng bay; cú nảy nằm luôn) · nằm 0.4 s (tay chân dạng như sao biển) · dậy 0.2 s (xoay về 0 qua thế khuỵu) · đứng choáng như thường.
   - Lúc chạm đất không có trong trạng thái trận -> `flyState` theo dõi ở phía vẽ (WeakMap theo cầu thủ; `p.anim` chạy ở mọi máy, `airZ` có trong snapshot) nên máy khách online thấy như máy chủ. `Renderer.airborne` vẽ bản sao cầu thủ nên phải truyền `fly: PlayerSprite.flyState(p)` vào bản sao và xoay theo `PlayerSprite.flyRot` (bản mẫu `airborne2` trong `pilot.mjs`); nằm / dậy dưới đất thì `drawPlayer` tự xoay.
   - Chân lúc văng / nằm: 2 mũi giày chĩa ra 2 phía (user: không cùng 1 hướng); lúc dậy mũi theo hướng mặt.
   - Bóng đổ lúc nằm (user: "nằm sâu hơn"): elip 30 x 12 px dưới giữa thân nằm (lệch 4 px về phía đầu, cao hơn chân 6 px), cả lúc nảy; lúc dậy thu về bóng đứng (`flyShadowSpec`, `flyShadow`; Renderer.airborne dùng khi đã chạm đất).
   - Trang xem: bảng `fly` ô rộng, vật lý như game, 30 khung / s.
6. ~~**Ăn mừng**~~ Xong, duyệt hết 2026-11-01 (`player/celebrate.js`, giữ trong `check.cjs`; levitate bản "kiểu Gojo" đã thử rồi bỏ, giữ bản xếp bằng). (20 động tác + `_win2` / `_lose` / `_draw`): điểm tay mới trong `celebrate-draw.js` theo luật độ dài; đạo cụ (điện thoại, tiền, pháo hoa…) bám tay / đầu / miệng mới; chân xếp bằng / ngồi / xoạc / quỳ.
   - Đang làm theo đợt 5 động tác (`player/celebrate.js`, bảng `cel` trong `pilot.mjs`: nhìn xuống như xem trước túi đồ, 3.2 s, 30 khung / s). Đợt 1: fistpump, airplane, kneeslide, skypoint, shush.
   - Dữ liệu động tác vẫn là `CelebrateDraw.POSES` của game. Tay: `arms [dx, dy]` (bàn tay tính từ vai, tay dây thun) đổi thành góc quanh vai, dài như tay đứng (`celArmSet`); bàn tay cao hơn vai nhiều thì nhô vai 2 ô như giơ tay khi bị đấm; gần như buông thì vẽ tay đứng. `CEL[id]` chỉnh riêng (`ang`, `shrug`, `point` = ngón trỏ chĩa lên, `drop`). Đạo cụ (`under` / `fx` của game) bám điểm neo mới (`celAnchors`: tay, khuỷu, đầu -9, miệng -5 theo hệ hông). `celDraw` = `CelebrateDraw.draw` cho sprite 2x (khi vào game: `CelebrateDraw.draw` dùng điểm neo + tư thế này, mục D17).
   - Chân quỳ (`legs: 'kneel'`): sprite hôm nay chưa vẽ (đứng thẳng); 2x = 2 đầu gối dưới quần, thân hạ 2 (game hạ 4: trông như đứng trong hố).
   - airplane: vệt gió vắt qua ngực khi tay ngắn -> vẽ fx dưới người (`CEL_FX_UNDER`).
   - Đợt 1 duyệt 2026-11-01: fistpump, airplane (giữ vệt gió), skypoint, shush (giữ trong `check.cjs`). kneeslide: user thêm 1 hàng da ở đầu gối.
   - Đợt 2: kneeslide (sửa), flex, bow, spinjump, robot, dab. Tay gập khuỷu (`bend`, flex / robot / dab): cánh tay 1.5 ô theo hướng khuỷu cũ, cẳng tay 2 ô theo hướng bàn tay cũ (tổng dài hơn tay thẳng 2.4 một chút; ngắn hơn thì chữ L dính thành cục).
   - Đợt 2 duyệt 2026-11-01 (kneeslide, flex, bow, robot, dab, tư thế spinjump). spinjump: vòng sóng tiếng hét bắt đầu to hơn (user) -> `CEL_FX.spinjump` thay fx của game (11 + 16k x 6 + 8k thay 4 + 16k x 2 + 9k; khi vào game sửa thẳng số trong `celebrate-draw.js`).
   - Đợt 3: phonecall (tay phải gập đưa máy lên tai), nap, backflip, worm, moonwalk.
   - Đợt 3 (user 2026-11-01): duyệt spinjump (vòng to), worm. Sửa: backflip (xoay trong mặt phẳng màn hình trông như lộn nghiêng) -> lộn ra sau = ép dọc theo cos góc, qua nửa vòng thấy lưng lộn ngược, |sy| ≥ 0.35, co gối (`legs: 'tuck'`), tay đứng, vệt cung dọc rx 3 x ry 11 vẽ dưới người; `drawPlayer` vẽ qua bộ đệm khi phóng dọc không tròn số. phonecall: điện thoại giữa nắm tay và tai. nap: 2 nắm tay sát nhau trên ngực (tay gập `paths`). moonwalk: chân phẳng trượt ra sau, chân kia kiễng gót đi tới (`legs: 'moon'`, chỉ nhìn ngang / chéo).
   - Duyệt 2026-11-01: phonecall, nap, moonwalk. backflip: user bỏ bản lộn ra sau ("lười"; lộn ra sau thật phải vẽ đỉnh đầu cho mọi kiểu tóc) -> giữ lộn vòng trong mặt phẳng màn hình như game, đã duyệt. Đã xoá phần lộn ra sau (ép dọc, vệt cung dọc, chân co `tuck` của ăn mừng).
   - Đợt cuối: makeitrain, fireworks, `_win2`, `_lose` tay gập (`bend`); firebreath vai nhô hẳn lúc phun lửa (`shrug` giờ dùng được cả khi tự đổi góc); levitate, ascend, `_draw` tự đổi. `_lose` 2 hàng: id chẵn đứng ôm đầu, id lẻ ngồi bệt. Chân ngồi bệt (`sitLegs`, `ported.js`) làm lại theo luật độ dài: hông -> gối 2.2 ô, gối -> cổ chân 2.2 ô (bản cũ 3.6 + 4.2).
   - Duyệt 2026-11-01: firebreath, fireworks, ascend, `_win2`, `_draw`. Sửa (user): makeitrain tiền vọt lên trước rồi văng ra 2 bên (`CEL_FX.makeitrain`); levitate 2 ống chân xếp bằng vẽ sau thân, che quần; `_lose` đứng 2 tay ôm ra sau đầu (`armsBehind`: vẽ tay trước đầu), nhắm mắt (há miệng trông như vui); `_lose` ngồi giọt mồ hôi ở phần đầu trống, ngược hướng mặt (`CEL_FX._lose`).
   - Duyệt 2026-11-01: makeitrain, `_lose` ngồi. Sửa (user): levitate hạ 2 ống chân xếp bằng 2 ô (giày 2 đầu trông như tất lơ lửng cạnh tay); `_lose` đứng bỏ mếu, miệng thường (đã xoá kiểu miệng 'frown').
   - Duyệt 2026-11-01: `_lose` đứng. levitate (user): tô lại chân xếp bằng = 2 nửa đối xứng, mỗi nửa từ ngoài vào da (đầu gối) · giày (hàng dưới đế) · tất, 2 tất gặp nhau ở giữa (`crossLegs`); giơ 2 tay chữ V.
7. ~~**Duyệt trạng thái**~~ Duyệt 2026-11-01 (choáng, găng thủ môn, chấn thương, bóng lướt, mồi Chạy Giả, Smoke Bomb, khổng lồ, hoảng sợ; giữ trong `check.cjs`). Bị đấm, nhảy Ground Slam, móc xe đạp (giơ 2 tay) duyệt sau cùng ngày. Băng chấn thương giữ màu trắng.
   - Trang xem: mỗi trạng thái 4 hướng, cầu thủ chạy theo khung như trong trận: bị đấm (chớp trắng 0.12 s + choáng `light.stun` 0.7 s + đẩy lùi `light.knockback`) · choáng đứng (63 khung = sao quay 1 vòng) · lướt (bóng mờ như `Actions` / `Player.update`, y-sort như renderer: lướt lên thì bóng mờ đè lên chân) · găng thủ môn / chấn thương: đứng rồi chạy tại chỗ (chấn thương kèm dấu thập `RunDraw.hurt`). Gồng (hào quang đỏ) đã nằm trong Hard attack.
   - Chấn thương theo bên của cầu thủ (trước đây theo màn hình nên quay lưng là băng nhảy sang tay / chân kia, sprite cũ cũng vậy): cổ tay trái (tay đấm), cổ chân + ngón chân phải (chân đá), đùi trái. Nhìn chéo: 1 ô băng ở cục da tay xa. Băng cổ chân / đùi màu trắng trên tất trắng chỉ thấy chấm đỏ (chờ user).
   - Giơ 2 tay (user 2026-11-01: "giơ hẳn 2 tay lên, không phải lắc nhẹ"; `player/hit.js`): chữ V `[π + 0.9, -0.9]`, vai nhô 2 ô như thủ môn (tay 2.4 ô không nhô vai thì bàn tay chỉ tới ngang vai), vẽ sau đầu. Bị đấm: vọt lên 0.06 s, giữ tới 0.2 s, hạ xuống tới 0.45 s. Ground Slam (`o.slam`): giơ theo độ cao (hết ở 5 px) nên tiếp đất là tay vung xuống. Móc xe đạp: bảng `KICKS.bicycle` tay chữ V suốt (không nhô vai), vung chân từ 0.1 s.
   - Bị đấm (bản trước, bỏ): 2 tay văng ra rồi lắc tắt dần. Lúc bị đánh không có trong snapshot (`stateT` không đồng bộ) -> `hitState` theo dõi ở phía vẽ (WeakMap, chuyển sang `stun` khi đang dưới đất; bị hất tung thì `fly.js` lo). Nhìn ngang / chéo: tay văng ra trước; xuống / lên: dang 2 bên. `drawPlayer` truyền `o.hit`.
   - Thêm vào trang (user 2026-11-01): mồi Chạy Giả (áo tím nhấp nháy + bóng giả, như renderer), Smoke Bomb (đồng đội thấy mờ 0.3), khổng lồ (`sizeMul` 1.6), hoảng sợ (run ±1 px). Bảng ô cao `air`: nhảy Ground Slam (`jumpSlam`, chưa có tư thế riêng: bay thẳng người đứng như game) và móc xe đạp Comet One-Two (`atkType 'bicycle'`, `attackPose` mới: tư thế vô-lê, bảng `KICKS.bicycle` chân trụ co suốt, chạm bóng lúc 0.4 s đúng lúc `Renderer.airborne` lộn ngược). Móc xe đạp của LEGEND là `atkType 'volley'` + `LegendDraw` lộn vòng, đã có.
   - Phóng không tròn số (khổng lồ, camera zoom): `drawPlayer` vẽ qua bộ đệm rồi phóng lấy mẫu điểm gần nhất như lúc xoay (vẽ thẳng hở vạch giữa các px mịn).

### B. Đồ người chơi (bắt buộc trước khi thành mặc định)

8. ~~**Tóc / mũ**~~ Xong, duyệt hết 2026-11-01 (25 kiểu, giữ trong `check.cjs`). 24 món + Aura Farming (`drawHair` trong `sprites.js`), vẽ lại cho đầu A, cả mặt và sau lưng.
   - Đang làm (`player/hair.js`, bảng `hair` trong `pilot.mjs`: mỗi kiểu 1 hàng, 4 hướng tóc đen rồi 4 hướng tóc nâu). Bước 1: chuyển thẳng `drawHair` sang đầu A (tâm đầu cũ = hàng 6 của đầu A, `capRows` tô trong viền đầu A hói). User: "đừng rụt rè giữ bản chuyển thẳng" -> vẽ lại từng kiểu thành bản đồ ô (`STYLES`): lớp `{ x, y, rows, ink, under }`, tự viền mực trừ lên mặt, màu sáng / tối suy từ màu tóc, `A` = màu phụ của đội, hướng front / side / back.
   - Duyệt 2026-11-01: classic (đầu A), buzz, bowl (vẽ lại); beanie, bun, bandana, halo (giữ bản chuyển thẳng). Đợt 2 (user góp ý): spiky thu về rộng 15, mohawk nhìn ngang = mào nhọn dựng giữa đỉnh + cạo 2 bên (user phác), afro mép tròn trơn, cap (snapback) vẽ lại đủ 3 hướng, longhair đuôi ngựa cong + thấy từ trước, bucket / headphones vẽ lại, helmet to hơn đầu. Mũ nào cũng lộ tóc dưới vành ở sau lưng / nhìn ngang.
   - Duyệt 2026-11-01: bucket, headphones, rồi mohawk, helmet (nhỏ lại, tròn hơn, sau lưng không lộ tóc), afro (mép búi bông), spiky (chỏm nhô 3 ô). Lớp phẳng (tóc cạo) chỉ tô trong viền đầu.
   - Đợt 4: snapback nhìn ngang chóp tròn đối xứng, đuôi ngựa nhìn trước tóc ôm sát đầu, không thấy đuôi; vẽ lại có chi tiết: cowboy, santa, viking, flamehair (lưỡi lửa đổi theo anim: hướng dạng hàm `(anim) => lớp`), crown, ward_trophy, moon_cap, lantern_hat, laurel, aura. Hàm phụ: `sym` (vẽ nửa trái, lật đối xứng), `BACK_HAIR` (tóc sau gáy dưới mũ).
   - Duyệt 2026-11-01: longhair, cap, santa, ward_trophy, moon_cap, lantern_hat. Đợt 5 (user): cowboy / viking hạ mũ 2 ô; flamehair bỏ 2 ô tóc mai lẻ; crown hẹp lại 13, hạ xuống che tóc, đai đáy võng 1 ô giữa trước (đế tròn); laurel mọi hướng = 2 hàng lá vòng quanh đầu như bản sau lưng; aura vẽ lại bồng kiểu Goku siêu xay-da (rộng 21, chỏm ngang đâm ra 2 bên).
   - Duyệt 2026-11-01: cowboy, viking, crown, laurel. Đợt 6 (user): flamehair chân tóc nằm trong viền đầu (ô lẻ = viền chân tóc lòi ra ngoài đầu ở hàng -22), viền đỏ thẫm (lớp có `ink` = màu), quầng sáng cộng sáng nhấp nháy (`glow`, đĩa r 6 như bản cũ); aura rộng 25, thấp hơn, 9 chỏm.
   - Duyệt 2026-11-01: flamehair. aura vẽ lại theo ảnh tham khảo tóc Goku của user (`auraLayers`): mỗi chỏm là 1 tam giác lá (`spike(đỉnh, chân trái, chân phải)`, tô theo tâm ô) thành 1 lớp có viền riêng -> nét mực ngăn giữa các chỏm; sáng mép trái / vàng giữa / tối mép phải; chỏm giữa cao 11 ô trên đỉnh, 3 cặp ngả ra ngoài, 2 chỏm rủ cạnh tai, 3 lọn mái; sau lưng 3 chỏm chĩa xuống ở gáy. Rồi (user): gộp thành 1 khối 1 viền (`merge`, không nét mực giữa các chỏm), bỏ chỏm ngang ngoài cùng + chỏm rủ cạnh tai, sau lưng bỏ chỏm chĩa xuống ở gáy. Sau lưng (user: khối chữ nhật lạ): 5 lọn chĩa xuống trong viền đầu trên lớp tóc lót tới gáy, đầu lọn chỉ gợn 1 ô ở mép dưới (khe sâu giữa lọn thành vệt mực đen).
9. ~~**Phụ kiện mặt**~~ Xong, duyệt hết 2026-11-01 (19 món, giữ trong `check.cjs`). 20 món (`drawFace`), theo mắt 3 × 3, mũi, miệng mới.
   - Đang làm (`player/face.js`, bảng `face` trong `pilot.mjs`: mỗi món 1 hàng, tóc đen da 0 nhìn xuống / chéo / ngang / lên, rồi tóc vàng da 3: ăn mừng (mắt ^ ^, há miệng) / chéo trái / ngang trái / chạy; 2.5 s). Vẽ lại hết 19 món (không chuyển thẳng): mỗi món là các lớp ô `{ cells, clip, ink }` đặt theo mắt (`EL` / `ER`), mũi, miệng đã lệch `ex` như `face()`; `clip 'in'` chỉ tô trong viền đầu (giữ viền), `ink` viền mực trừ lên da mặt. Món một bên (bịt mắt, kính một mắt, sẹo, cyborg) theo bên của cầu thủ: mắt phải = bên trái màn hình khi nhìn xuống / phải, nhìn trái là bản lật. Món có dây thấy cả sau lưng: bịt mắt, khẩu trang, ninja, kính neon, đầu lâu. Món thay mắt (kính cận, laser, đầu lâu, cyborg) theo kiểu mắt ăn mừng / choáng. Vẽ trong `draw.js` sau mặt và tóc (`o.face` = `look.face`).
   - Chi tiết đã chốt: ria dời xuống hàng miệng (miệng xuống 1 hàng), râu chừa má, băng cá nhân gạc trắng, tàn nhang da tối sẫm hơn da, mũi hề bỏ miệng son, sơn chiến bỏ chữ V trán, ninja dải trán đè hàng băng đô + 2 dải đuôi có viền riêng, quầng cyborg / kính neon nhỏ lại, laser nhìn thẳng = vệt loé ngang.
   - Duyệt 2026-11-01: 15 món (blush, freckles, beard, scar, shades, mask, goldtooth, warpaint, eyepatch, monocle, ninja, cyborg, visor, skull, lasereyes), rồi bandaid, clown, nerd (giữ trong `check.cjs`). User: vẽ chi tiết tới từng px -> lớp `fine` (px mịn, cắt theo ô thế giới): băng cá nhân chéo trên má (gạc, lỗ thoáng, 2 đầu bo), mũi hề quả cầu 8 x 7 có viền + chấm sáng + miệng cười chữ U; kính cận bỏ con ngươi (tròng trong).
   - Ria: kiểu hải mã (khối rậm che miệng, sợi rủ tới cằm). Miệng nhỏ nên ria ghi đông trông lạ; đã thử và bỏ: ghi đông, chevron, bút chì, móng ngựa.
   - Thân (user 2026-11-01, cùng lúc chốt phụ kiện mặt): bỏ vạch cổ áo mực giữa ngực dưới cổ ở áo nhìn trước (`SHIRT` trong `body.js`); ghi lại `baseline.json` (mọi hướng không quay lưng đổi).
   - `pilot.mjs --only face` chỉ vẽ lại bảng đó (gộp manifest). `sheet()` vẽ từng ô vào canvas nháp rồi chép: vẽ thẳng lên canvas bảng rất lớn chậm ~100 lần (bảng face 5 phút -> 1 phút, ảnh y hệt).
10. ~~**Giày**~~ Xong, duyệt hết 2026-11-01 (19 kiểu + giày trắng mặc định, giữ trong `check.cjs`). 20 loại (màu, tất, guốc, bánh xe, đinh, phát sáng, lấp lánh, tên lửa, lửa, cầu vồng, lệch màu, chân trần) cho mọi bộ phận chân: đứng, 4 khung chạy, đá, sút.
   - Đang làm (`player/shoes.js`, bảng `shoes` trong `pilot.mjs`: mỗi kiểu 1 hàng, đứng nhìn xuống / chéo / ngang / lên, chạy ngang, chạy xuống, Hard attack, sút; 1 s). Mọi chân đều tô bằng O / G / g + chữ mới `J` (da ống chân; trước là `S` chung với da tay) nên giày thay 4 màu này là có ở mọi tư thế. Màu có thể là đối tượng vẽ `{ base, paint }` (`fill()` trong `base.js`): tô từng px mịn trong ô 2 x 2 theo mẫu (dây giày, sọc, rằn ri, vân gỗ), chọn màu theo chân phải / trái của cầu thủ (lệch màu, cầu vồng; `shoeBegin` nhận chân phải ở cột nào). Đế ghi chỗ đã tô -> `shoeEnd` cuối `draw()` gom thành bàn chân, vẽ đồ quanh từng bàn chân: bánh xe patin, đinh, đế guốc dày, phản lực, lửa, ánh neon hắt xuống sân, lấp lánh vàng, hơi lạnh. Giày trắng mặc định không qua đây (baseline không đổi). Tư thế đứng không có hàng ống chân (`noKnee`): ủng / tất cao chỉ phủ ống chân lúc chạy (chân trụ) và lúc đá.
   - Đã thử và bỏ: giày vải đế sọc xanh (trông như tất sọc), ủng mưa bỏ chấm sáng (bàn cờ), giày cổ cao bỏ chấm trắng (thành cặp mắt), guốc đế dày đè lên hàng viền (khối riêng trông như 2 giày chồng), neon / băng bỏ quầng chữ nhật (thành cái hộp) -> neon hắt ánh xuống sân.
11. ~~**Hiệu ứng**~~ Xong, duyệt hết 2026-11-01 (19 món, giữ trong `check.cjs`; khói thu nhỏ 3 -> 7 px, đời hạt khói trong `Sprites.FX` của game rút từ 0.7 còn 0.45 s theo user). (slot `fx`, 20 món): vẽ ở `Renderer.cosmetics` và `drawFxPreview`; kiểm vị trí neo theo thân / đầu mới. `aura` (vầng sáng dưới chân) còn nằm trong sprite.
   - Đang làm (`player/fx.js`, bảng `fx` trong `pilot.mjs`: mỗi hiệu ứng 1 hàng, hôm nay chạy ngang · mới chạy ngang · mới chạy xuống; chạy tại chỗ, hạt trôi ngược như sân trôi, Math.random gieo cố định). Thân mới cao 24 như cũ nên độ cao sinh hạt (`z`) giữ nguyên. Hạt vẫn sinh / bay bằng `Sprites.spawnFx` / `stepFx` / bảng `FX`, chỉ thay `drawFxParticle` (lúc chuyển vào game: gán `Sprites.drawFxParticle = PlayerSprite.drawFxParticle`, menu xem trước cũng dùng hàm này): vẽ ở lưới mịn, mỗi hiệu ứng 1 hình theo `q.k` (lá có gân lật theo gió, cánh hoa có khía, bông tuyết 5 x 5, khói nở dần, bụi bo góc, giấy hoa lật, neon lõi trắng, dải cầu vồng, ngọn lửa ngả đỏ) hoặc `q.shape` (sao 4 cánh lớn dần, tim, nốt nhạc, bong bóng vỡ, đồng xu xoay, tia điện), cỡ bằng hạt cũ (bản đầu 3 px mịn trông thưa). Phantom dùng `drawPlayer` 2x. Golden Aura vẽ trong sprite (`drawAura` sau bóng: 3 dải elip px mịn cộng sáng, vòng sáng loang mỗi 1.2 s, đốm bốc lên).
   - Duyệt 2026-11-01: 16 món (giữ trong `check.cjs`: hình hạt theo 4 tuổi + aura). Sửa (user): khói phải ra khói, không rời từng hạt -> mỗi hạt 1 cụm mây (`puff`: 1 cục lớn + 2 cục nhỏ, 6 -> 12 px) chồng lên nhau thành dải liền, sáng trên trái, sẫm đáy, tan dần theo chấm (không mờ đều: chỗ chồng đậm hơn, lộ mép); bụi đường cùng kiểu, cụm dẹt sát đất màu đất; đồng xu tròn 7 x 7, xoay qua elip tới cạnh.
12. ~~**Áo mọi đội, màu da, màu tóc**~~ Xong, duyệt hết 2026-11-01 (bảng `kits` / `tones` trong `pilot.mjs`): 55 bộ áo (đi hết `SFC_CONFIG` tìm `{ shirt, shirtDark, shorts }`, bỏ trùng), 23 màu tóc (bảng của người chơi + màu chỉ có ở tóc đội) × 5 màu da.
   - 3 sửa màu, duyệt (`kitColors` trong `player/player.js`, giữ trong `check.cjs` mục `kitcolors/`; màu trong config đội giữ nguyên): băng đô trùng màu tóc (accent = tóc ở Neon Strikers, Underground FC, Billboard Kids, The Legends…; đội của người chơi accent vàng + tóc vàng) -> màu áo; găng thủ môn trùng da (accent kem) -> màu áo; áo cũng trùng thì màu phụ sẫm đi; quần gần đen (~17 đội, cả Street Kings) -> nâng sáng tới khi tách khỏi viền mực. Bảng so trước / sau (`kitfix`, cờ thử `kitFix`) đã bỏ sau khi duyệt.
   - Còn ghi nhận, chưa đổi: 2 màu da `#f1c7a0` và `#f5d6b8` (`teams.skins`) trông gần như nhau.

Phần B xong.

### C. Các chỗ khác vẽ người chơi (đổi cùng renderer) — xong 2026-11-01

13. ~~Gọi `drawPlayer`~~ (xong: `SFC.Sprites.drawPlayer` / `drawFxParticle` giờ gọi `SFC.PlayerSprite`, nên mọi chỗ gọi dưới đây tự đổi; canvas trận gấp đôi nên vẽ thẳng ở px mịn): `renderer.js` (trận, bóng mờ lướt, ảo ảnh Chạy Giả, bị đá bay, thủ môn đổ người), `celebrate-draw.js`, `vfx.js` (8 chỗ: phân thân, King Kong / tảng đá / con gà, hình thái…), `modsdraw.js` (8 chỗ: luật trận), `legenddraw.js` (bóng LEGEND, cut-in), `hud.js`.
   - Ăn mừng: `CelebrateDraw.draw` gọi `PlayerSprite.celDraw` (bản 1x cũ đã xoá). Tượng đá (`modsdraw.js` `stoneSprite`): bộ đệm 96 x 96, vẽ ra 48 x 48. Chân dung HUD / bảng kết quả (`hud.js` `drawPortrait`): canvas gấp đôi.
   - Ảnh xem trước Core (`corepreview.js`): Renderer riêng trên canvas phụ giờ 1280 x 720 -> canvas xem trước gấp đôi, chép 1:1 vùng x2.
   - Chỗ nào còn vẽ người lên canvas 1x: `PlayerSprite.drawPlayer` tự vẽ qua bộ đệm rồi thu về lưới game (lấy mẫu điểm gần nhất), không nhoè.
14. ~~Ảnh nhân vật ngoài trận~~ (xong): `drawAvatar` gấp đôi độ phân giải canvas trên trang (`Sprites.hiRes`: cỡ cũ thành cỡ logic, CSS giữ cỡ hiển thị; CSS không đặt cỡ thì ghim bằng style) -> menu, intro, drill, runmap, trophies (thẻ / album), icon túi đồ thấy đủ px mịn. Cảnh pixel 1x ghép bộ đệm (KIT VAN, phòng trưng bày, canvas thấp của Story) gọi `drawAvatar(..., flat = true)`: vẽ 2x rồi thu về lưới game cho khớp cảnh. Nhân vật phóng to trong cảnh Story (`figure`, x3..x11) dùng ảnh 2x (hệ số lẻ thì px mịn rộng không đều 1 / 2 px canvas). `drawItemIcon`: giày dùng vùng cắt quanh bàn chân nhìn chéo (bỏ bản vẽ riêng `drawLeg` x3).
15. ~~Điểm neo theo đầu~~ (giữ nguyên): `PlayerSprite.drawPlayer` trả `y − 16` (tâm đầu) như bản cũ.

### D. Đưa vào game — xong 2026-11-01

16. ~~Renderer 1280 × 720~~ (xong): `Renderer.init` đặt canvas 1280 x 720, `render()` mở mỗi khung bằng `setTransform(2, …)` -> mọi thứ khác vẫn vẽ ở toạ độ 640 x 360 và trông y hệt (nền, vignette, `goalCam`, VFX); CSS `#game` giữ 640 x 360 nên `fit()` và chuột không đổi. Chữ vẽ trong canvas nét hơn (font vẽ ở 2x). Đo trong Chrome headless: 1 khung trận demo 6 người ~2.7 ms (ngân sách 16.7 ms); chưa đo trên máy yếu / bản web thật.
17. ~~`player/*.js` vào `src/render/`~~ (xong): `src/render/player/` (`SFC.PlayerSprite`), 19 dòng trong `scripts/manifest.js` (game, sandbox, itch) ngay sau `celebrate-draw.js`. Không cờ test. `Renderer.diving` bộ đệm 96 + `PlayerSprite.diveXform`; `Renderer.airborne` lộn theo `PlayerSprite.flyRot`, bóng nằm `flyShadow`, truyền `fly` vào bản sao. `tools/sprite-v2` đọc sprite từ chỗ mới (`check.cjs` lấy thứ tự từ manifest, `cdp.mjs` không nạp nữa); cột "hôm nay" trong các bảng giờ cũng là sprite mới.
18. ~~Online~~ (xong, không đổi giao thức): sprite mới đọc cùng các trường bản cũ đã đọc. Riêng `poseEnd` (thủ môn đứng dậy) không đồng bộ như đã ghi ở mục 4: máy khách đứng dậy hơi trễ khi cú bay ngắn.
19. Thành mặc định: xong. Phần vẽ người 1x cũ đã xoá 2026-11-01 (user đồng ý): trong `sprites.js` `attackPose`, `limb`, `drawPunch`, `drawKick`, `drawDiagLeg`, `SHOES`, `RAINBOW`, `shoeColors`, `drawLeg`, `drawFxParticle` (cũ), `capRows`, `ringFlat`, `drawHair`, `drawFace`, `celEyes`, `celArms`, `BANDAGE` / `BLOOD`, `drawBandages`, `drawPlayer` (cũ); trong `celebrate-draw.js` `CelebrateDraw.draw1x`. (`sprites.js` 1068 -> 310 dòng; còn lại hình vẽ chung, hạt trang phục `FX` / `spawnFx` / `stepFx` / `drawFxPreview`, bóng, `drawAvatar`, `drawItemIcon`, `hiRes`).
