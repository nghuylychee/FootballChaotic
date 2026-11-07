# SPRITE v3 — người chơi to hơn cho sân to

> Trạng thái (2026-11-07): **trong game** từ đợt 2 (user: "đưa vào game"). Đứng, chạy, nước rút, ra đòn, thủ môn, tóc / mặt / giày đã duyệt; đợt 5 xong phần vẽ người; đợt 6 đưa cảnh Village, vật thể Tuyệt kỹ / luật sân và VFX bám người theo cỡ mới. Mọi kiểu tóc / mặt / cú đá đều có v3; v2 phóng `render.playerScale` chỉ còn là đường dự phòng. Còn mở: avatar menu (xem đợt 6).
> Trang duyệt: `npm run serve` rồi mở `http://localhost:8080/tools/sprite-v3/pilot.html` (nạp thẳng `src/render/player3/`).
> Luật vẽ vẫn là `docs/SPRITE_GUIDE.md`, trừ luật "cỡ trong trận giữ nguyên" (đổi khi user duyệt bản thử).

## Vì sao

Sân to hơn (`pitchScale`) thì khung trận zoom out, nên người trên màn hình nhỏ đi. User muốn người to rõ, bóng vẫn cỡ gốc (9 px cả viền), nên phải vẽ lại sprite ở cỡ px lớn hơn. Phóng sprite v2 lẻ lần (1,2 / 1,3) chỉ dùng để chọn cỡ: px không đều.

## Đứng (đã duyệt 2026-11-07)

- **Cao 31 px game** (24 × 1,3, khớp `playerScale` 1.3 user đặt). Cùng kiểu v2: đầu A tròn, thân B, viền mực 1 px, không nửa px, nhìn trái = lật.
- Đầu 19 × 17 (hàng −30..−14) · thân rộng 13, 10 hàng (vai, áo 4, dải tối, quần 3, viền) · tay: tay áo 2 ô + cẳng tay da 3 ô, bàn tay chạm hàng quần cuối · chân rộng 5: tất 2 hàng, giày, đế.
- Mắt **A 4 × 4** (user chọn 2026-11-07; đúng tỉ lệ mắt 3 × 3 trên đầu 15), chấm sáng 1 ô góc trên trái. Đã bỏ: B 3 × 4. Mặt trượt theo hướng nhìn như v2 (chéo 1, ngang 2).
- Chỉ có đứng, 5 góc nhìn, kiểu tóc classic.

## Đợt 1: chạy, chạy nước rút (đã duyệt 2026-11-07)

- **Chạy**: 4 khung 12 / s như v2 (trụ trước · lướt qua · đá gót · nhấc gối), thân + đầu nhấp 1 px. Chân đóng dấu theo pha (`PLANT` dài thêm 1 hàng da, `LIFT` / `KICK_F` / `KICK_B` ngắn 1 hàng). Bước ngang rộng hơn v2 (x 1,5): ngang 2 ô, chéo 1 ô. Nhìn xuống / lên: tay vung lên xuống 1 ô, tay vung ra sau ngắn 1 hàng. Nhìn ngang / chéo: tay thẳng xoay quanh vai (góc `ARM_A` của v2).
- **Chạy nước rút** (nhìn ngang / chéo): 4 khung sải dài như v2 R1 (góc `SPRINT` giữ nguyên), chân / tay là chi tự do bút 3 × 3 (v2: 2 × 2), chân dài 4,2 ô từ hông, tay 3,5 ô từ vai; thân ngả 1 px, đầu dẫn trước 2 (ngang) / 1 (chéo). Nhìn xuống / lên: bước chạy thường.
- Thân vặn vai + lai quần nhấc khi chạy nước rút và bước nặng: làm ở đợt 2.

## Đợt 2: ra đòn (đã duyệt + vào game 2026-11-07)

- `tools/sprite-v3/attack.js`. Đấm, Hard attack, sút, vô-lê, móc xe đạp (chưa xem được trên trang duyệt: trong game renderer lộn ngược người), chuyền sệt / bổng, chạm đẩy bóng, sút mạnh (lấy đà đứng run người, vung, chạy = đẩy bóng + bước nặng), đánh đầu.
- **Nhịp + góc tay chân giữ nguyên v2** (`attackPose`, bảng `KICKS` / `PUNCH` / `OFF` / `HEADER_KEYS` / `HEAVY` đã duyệt). Chỉ hình học đổi: toạ độ x 1,3 (cột 0..3 giữ chỗ chân phải v3), độ lệch thân / khuỵu / bật nhảy x 1,3, chi tự do bút 3 × 3, chân đá dài 4,2 ô, nắm tay 4 × 4 (đấm thẳng vào máy quay 5 × 5), bàn chân v2 -> hình to hơn 1 ô (`FOOT`), tia sáng chạm 9 px.
- Thân chuyển động (nghiêng, vặn vai, lai quần nhấc theo chân, `torsoPart`) cho chuyền, sút mạnh, chạy nước rút, bước nặng như v2 (đợt 1 thiếu phần này cho nước rút, giờ đã có).

## Đợt 3: thủ môn (đã duyệt 2026-11-07)

- `src/render/player3/keeper.js`. Găng trên mọi tư thế (tay đóng dấu: 2 hàng cuối bàn tay; chi tự do: ô cuối = găng; nắm tay đấm), ôm / đón bóng, đỡ tại chỗ (chữ V, chân dạng), phát bóng bổng / chuyền vô-lê (tung bóng, góc tay theo thời gian), đổ người xuống / lên (khung riêng: cất người, bay, duỗi, chạm đất, nằm, bò, quỳ ôm bóng), đứng dậy (nhổm, quỳ, khuỵu), đổ người bắt được bóng.
- Nhịp + tư thế lấy nguyên v2 (`gkGeom`, `gkState`, `getUpStage`, `DIVE_FRAMES`, bảng `gkPunt` / `gkVolley`). Toạ độ x 1,3; găng 4 × 4 (khung đổ người 6 × 6); thân / chân của khung đổ người vẽ lại theo thân v3 (10 hàng, chân cao hơn 1 hàng); thân ngả `LEAN` theo 10 hàng; bóng trên tay giữ cỡ quả bóng trận (9 px); bóng đổ nằm to theo người.

## Đợt 4: tóc / mũ, phụ kiện mặt, giày, Golden Aura (đã duyệt 2026-11-07)

- **Không vẽ tay lại từng món** (24 kiểu tóc / mũ, 19 phụ kiện mặt, 20 đôi giày): `look.js` lấy bản đồ ô của v2 (`HAIR_STYLES`, `FACE_ITEMS`, đã duyệt) rồi phóng lên lưới đầu v3 bằng lấy mẫu điểm gần nhất (v2 x -7..7 = v3 -9..9, hàng -25..-13 = -30..-14). Phóng lên nên không ô nào mất; viền mực **vẽ lại 1 px** quanh khối mới (lớp `ink`), không phóng viền -> không dày mỏng như ảnh phóng. Lớp phẳng (tóc cạo lấm tấm) vẫn chỉ tô trong viền đầu, viền không đè lên mặt / dải má (`FACE`, `INSIDE`, `CHEEK` tính lại cho đầu v3).
- Phụ kiện mặt neo theo khung mắt (mắt v2 3 × 3 lệch trái nửa ô -> mắt v3 4 × 4 giữa; mặt lệch theo hướng nhìn của từng bản). Hiệu ứng riêng của món (tia laser...) vẽ ở toạ độ v2 rồi phóng (px không đều, chỉ hiệu ứng). Chéo lên: chỉ lớp sau lưng (dây buộc), chưa có phần dải má.
- Tóc lửa: quầng sáng đổi toạ độ / bán kính theo đầu v3.
- **Giày**: chân v3 tô cùng chữ O / G / g / J nên dùng thẳng `shoePal` / `shoeBegin` / `shoeEnd` của v2 (mẫu tô theo ô, đồ dưới đế theo chỗ đế đã tô). Golden Aura: `drawAura` của v2.
- 4 kiểu tóc v2 vẽ bằng code (beanie, bandana, bun, halo; đợt 5): chụp ảnh đầu v2 có tóc vào đệm, ô nào khác đầu hói (trừ viền mực) là tóc, rồi phóng + vẽ lại viền như trên (`captureCut`, nhớ đệm theo kiểu / hướng / màu). Nếu món nào phóng lên trông chưa đẹp thì vẽ tay riêng bản v3 cho món đó.

## Đợt 5 (2026-11-07)

- **Trạng thái** (`body.js`): bị đấm / nhảy Ground Slam giơ 2 tay (`liftArms`, nhịp `hitState` / `hitLift` của v2, vai nhô 3 ô), choáng (mắt gạch, đầu lắc, 3 sao quay trên đầu cao hơn), bị đá bay (tư thế `flyPose` của v2: chân văng / nằm, tay, há miệng; đứng dậy = ngồi bệt + nhổm / quỳ / khuỵu của thủ môn, `flyGetUp`; `drawPlayer` xoay quanh giữa thân mới, bóng nằm x `playerScale`), băng chấn thương GOAT PATH (cổ tay, đùi, cổ chân, ngón chân theo bên của cầu thủ).
- Mặt v3 có biểu cảm như v2: `stun` / `closed` / `happy` / `up` + há miệng.
- Chữ popup (`VFX.pops`) nâng thêm 24 x (playerScale − 1) px; chân dung HUD 22 x 22 hạ đầu xuống (y = h + 9); ô icon đồ "mặt" cắt từ hàng 10.
- **Ăn mừng** (`player3/celebrate.js`): tư thế v2 (`celPose`, `celArmSet`, `CEL_FX`) vẽ bằng v3: tay thẳng / gập (đường tay x 1,3, vai v3, nhô vai 3 ô, ngón trỏ 3 ô), chân quỳ / trượt gối chéo / ngồi bệt / xếp bằng / moonwalk / xoạc, hạ người / đầu x 1,3. `celDraw` riêng (CelebrateDraw.draw gọi khi có v3): hông cách chân 10 px, độ nhấc x 1,3, điểm neo đạo cụ (`celAnchors`: bàn tay, khuỷu, đầu, miệng) theo người mới; đạo cụ vẽ bằng code của game giữ cỡ cũ. Renderer không còn phóng ăn mừng (chỉ vật thể thay hình). Trang duyệt mục 7.
- **Chưa làm:** nhân vật do VFX / Tuyệt kỹ vẽ thay (King Kong, con gà...: cỡ cũ), mắt phát sáng / VFX bám tay đầu theo người cũ, dọn (`playerScale` về 1, xoá v2, baseline `check.cjs`, luật cỡ trong `SPRITE_GUIDE.md`).

## Đợt 6: những gì quanh người (2026-11-07, user: "làm hết đi")

- **`render.playerScale` (1.3) giờ là tỉ lệ người mới / người cũ**, không còn chỉ để phóng v2. Đồ / VFX viết theo người 24 px đọc nó qua `SFC.Sprites.ph(v)` (= `round(v x playerScale)`, khoảng cách dọc / cỡ bám thân) và `Sprites.scaled(ctx, x, y, fn, op)` (vẽ cả vật vào đệm 1x quanh chân rồi phóng playerScale lần lấy mẫu điểm gần nhất, px không đều như v2 phóng). Vì vậy **không đưa playerScale về 1** khi dọn.
- **Cảnh Village** (`render/art/village.js`) dựng theo khung trận: khung cảnh = `render.maxView`, sân thật ở giữa. Toạ độ vẽ tay vẫn ở lưới gốc 880 x 512 (sân 528 x 246 ở 176, 156) và đi qua `X()` / `Y()`: vật ngoài sân giữ khoảng cách tới mép sân gần nhất, vật trong bề ngang / dọc sân giãn theo sân; vật giữ cỡ px gốc. Trời / ruộng chỉ dời xuống, cụm thành phố xa đặt theo giữa sân, vật rải ngẫu nhiên theo diện tích. Dải ngoài cùng (chỉ thấy khi cửa sổ rất rộng / cao) thêm vài khóm cây.
- **Vẽ cả con / cả xe theo cỡ người mới** (`Sprites.scaled`): King Kong, con gà, xe tải (`vfx.js`), hồn đấu sĩ Hundred Fists, người lái xe máy (Moped Boys, `modsdraw.js`). Vẽ tay bản to thì thay chỗ này.
- **Độ cao theo người mới** (`ph` / `PH`): `vfx.js` (tượng đá, thôi miên, búa, cổng, số lượt Phase Step, dây rối, vòng nối, ngã, hoảng sợ, kiếm Parry, lốc xoáy, giật điện, QTE, dấu ngắm, laser, Lucky Knuckles, Chaos Ball, cổng / chân / găng thò ra, tay cao su, hào quang, AURA FARMING, nắm tay sẵn sàng, sóng âm, hình thái thức tỉnh); `modsdraw.js` (tượng đá 64 x 64, nhảy tường, bắt lửa, quăng mì, trói mì, cà rốt / thẻ phạt / ghế / đũa trên đầu, whey, King Leo, lốc cát, hút vào King Leo, Moped quá giang, tia ngắm cú, đèn nóng, báo động); `legenddraw.js` (tâm xoay + độ bật của kỹ thuật LEGEND, hiệu ứng sau kỹ thuật); `renderer.js` (người đang bay: tâm xoay giữa thân mới; vật thể thay hình không phóng đệm nữa); `rundraw.js` (dấu thập chấn thương).
- **Giữ cỡ cũ có chủ ý**: vật thể trên sân có va chạm (tường, cột, gương, đe, ghế, junk...) khớp số va chạm của mô phỏng; người làng / khán giả / NPC luật sân (Big Mama, thỏ, cú) là cảnh, cảnh zoom out cùng sân (chỉ cầu thủ được vẽ to để bù); bóng giữ 9 px (user).
- **Còn mở: avatar menu.** `drawAvatar` vẽ v3 (khung 40 x 44, chân ở hàng 40) nên 5 kiểu tóc / mũ cao hơn 40 px bị cụt đỉnh: lantern_hat 46, afro 42, flamehair 42, santa 41, ward_trophy 41. Khung 40 x 44 bị CSS cố định ở ~15 chỗ, và các cảnh vẽ tay 320 x 180 (KIT VAN, ??? event) đặt người cạnh NPC cỡ cũ -> chờ user chọn: phóng khung avatar, hay ngoài trận giữ người cỡ cũ.

## Kế hoạch

Mỗi đợt duyệt trên trang duyệt rồi mới vào game. Trong lúc chuyển: trạng thái nào v3 đã vẽ thì vẽ v3, chưa có thì dùng v2 phóng `playerScale` (cùng cỡ, chỉ khác độ sắc).

1. **Thân**: đứng, chạy, chạy nước rút ở 5 hướng.
2. **Ra đòn**: đấm, Hard attack, sút, vô-lê, chuyền sệt / bổng, chạm đẩy bóng, sút mạnh, móc xe đạp, đánh đầu.
3. **Thủ môn**: ôm bóng, tung bóng đá, đỡ tại chỗ, đổ người, đứng dậy.
4. **Đồ**: mọi kiểu tóc / mũ (`hair.js`), phụ kiện mặt (`face.js`), giày (`shoes.js`), hiệu ứng trang phục.
5. **Còn lại**: ăn mừng, bị đấm, bị đá bay, avatar menu (`drawAvatar`, `ICON_CROP`), vị trí theo chiều cao người trên sân (chữ popup, vòng chân, mũi tên, thanh lực, VFX bám tay / đầu).
6. **Dọn**: xoá phần vẽ của v2 (v3 vẫn dùng dữ liệu của v2: bản đồ tóc / mặt, giày, tư thế ăn mừng / bị đá bay), `check.cjs` baseline mới, sửa luật cỡ trong `SPRITE_GUIDE.md`. Giữ `playerScale` (tỉ lệ người mới / cũ cho VFX, xem đợt 6).

## Quyết định của user

- 2026-11-07: mắt A 4 × 4. Chạy / nước rút ổn. Ra đòn ổn -> đưa vào game ngay, làm tiếp thủ môn. Thủ môn ổn -> làm đợt 4.
- 2026-11-07: sân x1,2 rồi tự chỉnh `pitchScale` 1.4; bóng giữ cỡ gốc 9 px; người phải to rõ, vẽ lại sprite ("vẽ lại cũng phải vẽ"). `playerScale` user đặt 1.3.
