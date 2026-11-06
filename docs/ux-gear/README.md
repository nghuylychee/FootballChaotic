# MÀN GEAR 2026-11-06 — review lại (rối) + 5 phương án

> Trạng thái: **OWNER CHỌN B (2026-11-06), ĐÃ LÀM VÀO GAME** trên nhánh `ux/gear-2026-11` (tách từ `ux/motion-2026-11` để dùng chung
> `config/motion.config.js`; worktree `G:\FootballChaotic-gear`). Đã commit + push (`e8ffb96` review, `cb4e6d5` code), chưa merge vào main.
> Trang review + mockup: `tools/mockups/gear-pick.html` (mở qua `npm run serve` → http://localhost:8080/tools/mockups/gear-pick.html;
> `?opt=B&st=who&view=gray` mở thẳng 1 khung). Review làm trên `main` @ `60f9741`. Ảnh sau khi sửa: `shots/after/`.

Đọc file này trước khi làm gì liên quan tới màn thưởng GEAR (chọn món → ai đeo → bỏ món), mockup `gear-pick.html`, hay phương án owner chọn.

## Chuyện gì

Màn GEAR đã sửa theo phương án B của đợt UX màn hình (2026-11-05, `docs/ux-screens/README.md` dòng `gear`): 1 màn 2 hàng, 3 món ở trên, 3 thẻ cầu thủ
luôn hiện ở dưới. Owner 2026-11-06: "màn hình nó đang bị rối quá", muốn review bằng thứ bậc, nheo mắt, trắng đen, thứ tự anim và các kỹ thuật khác,
xem thông tin nào cần / bỏ được / dời sang màn sau, tham khảo game khác, rồi cho 5 phương án.

## Đã làm

1. Chụp màn hiện tại trên main (`tools/cap.py`, dựa vào `docs/ux-screens/capture.py`): `shots/g1` bước 1 trỏ Grip Socks · `g1s` bước 1 trỏ Tactics Board
   (GEAR trường phái) · `g2` bước 2 · `g3` bước 3 (bỏ món). Mỗi cái 4 ảnh (gốc / nheo / xám / chuyển động) + json. Đội cố định: FWD (bạn) 1 món, MID đủ 3 ô,
   DEF đã có Grip Socks; 3 món Grip Socks (hiếm, DRI +6) · Tactics Board (TIKI-TAKA) · Keeper Gloves (sử thi, GK +9).
2. Đo (`metrics.json`, script `tools/imgmetrics.py`, `tools/dom.py`, `tools/mock.py`): mẩu chữ, con số, khung, màu chữ / viền, họ màu, mật độ cạnh, bản đồ mắt
   (saliency spectral residual trên L, a, b), diện tích từng khối, khe hàng / cột. So với BADGE và LEGEND "Who gets him?".
3. Mắt mới: 1 agent chỉ xem ảnh, test 5 giây + "xoá nửa màn thì xoá gì". Nguyên văn: `fresh.md`.
4. Tra 15 game có "nhận đồ → chọn ai dùng" (agent, có nguồn): `refs.md`.
5. Mockup 5 phương án vẽ bằng script game thật (nhân vật, icon, chỉ số), 4 trạng thái mỗi phương án, nút nheo mắt / trắng đen / bản đồ mắt / phát lại anim;
   đo lại cùng cách. Ảnh: `tools/mockups/gear-pick/` (`now-*.png` = ảnh game thật, `sal/*.jpg` = bản đồ mắt).

## Kết quả chính

- Bước 1 (chọn món): 3 thẻ cầu thủ chiếm diện tích gấp **3,2 lần** 3 món. Bản đồ mắt: 2 món không chọn sáng nhất, món đang chọn đứng thứ 4.
- Món và thẻ cầu thủ cùng bề ngang, xếp thẳng hàng, khe hàng 14 px < khe cột 16 px (ảnh 1280x720) → đọc thành **3 cặp "món này của người này"**.
  Mắt mới tự nói ra, và đọc nhầm "Already wearing one." sang món ở cột trên.
- **69 mẩu chữ, 25 con số, 13 màu chữ / viền** (BADGE cùng kiểu: 10 / 0 / 2). Món chỉ số chỉ đụng 1 chỉ số; quyết định cần 3 số.
- Bước 2: điểm nóng nhất là OVR 71→72 (trung bình làm tròn), không phải DRI 71→77. Bước 3 là màn khác hẳn, không có "mất gì", chọn sẵn món đầu (có thể là món mạnh nhất).
- 12 vấn đề, kiểm kê thông tin, 12 luật chung: trong trang mockup.

## 5 phương án (chi tiết trong trang)

| | Ý chính | Công | Bump server |
|---|---|---|---|
| A · Gọt | giữ 2 hàng, thẻ người còn mặt + tên + 1 dòng "DRI 71 → 77 ★" + ô; hàng món rộng hơn + nhãn giữa; bước bỏ món có mất / được | S | không |
| **B · To nhỏ theo bước** (Claude chọn) | bước 1 = 3 thẻ món to (khuôn BADGE) + dải SQUAD 1 hàng; bước 2 món thành chip, người to; bỏ món ngay trong thẻ (hết bước 3) | M | không |
| C · 1 lần bấm | bảng 3 món × 3 người, mỗi ô = "món này cho người này", chọn 1 ô là xong | M | không (chơi đơn) |
| D · Túi đồ, đeo sau | màn thưởng chỉ chọn món (như BADGE); món vào KIT BAG, đeo / đổi ở SQUAD; bỏ món = về túi | L | **có** (đổi luật run) |
| E · Phòng thay đồ | cảnh pixel như KIT VAN: 1 người 1 tủ, 3 móc = 3 ô, bàn tay treo món | L | không |

Số đo bước 1 (chữ / số / màu chữ+viền): hiện tại 69 / 25 / 13 · A 39 / 8 / 4 · B 37 / 7 / 4 · C 55 / 12 / 4 · D 23 / 2 / 4 · E 20 / 4 / 2.

## Khi owner chọn

| Owner chọn | Làm gì |
|---|---|
| A | Sửa `src/ui/runmap.js` (gearCard, squadCard thêm chế độ gọn, bước bỏ món) + `css/style.css`. Áp 12 luật chung. |
| B | Làm phần A trước (dùng lại nguyên), rồi bước 1 thẻ to + dải SQUAD, gộp bước bỏ món vào thẻ (targets bước 2; `Run.*` giữ nguyên), rồi hiệu ứng chuyển. Cân nhắc dùng chung bố cục bước 2 cho LEGEND "Who gets him?". |
| C | Bố cục bảng + targets 2 chiều; chơi đơn gọi `Run.pick` + `Run.wearGear` liền nhau; co-op giữ bố cục cũ trừ khi owner muốn phiếu "ô" (khi đó `shared/meta/run.js` → bump server). |
| D | Hỏi owner chốt cơ chế túi trước (giới hạn túi, nhắc / tự đeo khi quên, KIT VAN, Locker Room, co-op, chuyển save). Rồi mới vẽ kỹ. |
| E | Vẽ cảnh canvas 320x180 như `src/ui/kitvan.js` (đọc `docs/art-direction/`), logic như B. |
| other / chỉ ghi chú | Làm theo ghi chú, hỏi lại nếu không rõ. |

Mọi phương án: chữ mới (HAS ONE, FULL, DROP ONE, YOUR SQUAD, GIVE {gear} TO, SWAP ON {name}, KIT BAG...) phải vào 4 gói dịch + build lại font ja.
Thứ tự hiện + khoá Enter 0,5 s: đợt review motion (`docs/ux-motion/README.md`) áp phương án A cho mọi màn **trừ màn GEAR** (owner: để nguyên), trên nhánh
`ux/motion-2026-11`, số thời gian ở `config/motion.config.js`. Nên anim của màn GEAR quyết ở đợt này: dùng nhịp ghi trong mục "Thứ tự anim" của phương án
owner chọn, đọc thời gian từ `SFC_CONFIG.motion` nếu nhánh motion đã gộp. Commit / merge / push chỉ khi owner bảo.

## Chạy lại

```
npm run serve -- --port 8730
cd docs/ux-gear/tools
python cap.py g1 g1s g2 g2s g3          # -> ../shots (Windows: PYTHONIOENCODING=utf-8, UX_BASE=http://localhost:8730)
python mock.py A,B,C,D,E pick,who,full,school   # -> ../mock/<opt>-<st>.png + dom.json (ảnh mockup, không đưa vào git)
cd ../mock && python ../tools/imgmetrics.py *.png      # -> sal/*.sal.png + imgmetrics.json
```
Cần Python + Playwright + Chrome + Pillow + numpy + opencv-python. `cap.py` dùng lại `docs/ux-screens/capture.py` (chặn `*.onrender.com`).

## Chưa kiểm

- Số đo 5 phương án lấy từ mockup HTML, không phải code game.
- Co-op chưa vẽ ở phương án nào.
- Mắt mới 1 lần, chỉ trên màn hiện tại; chưa có người chơi thật.
- Vài dòng ở `refs.md` ghi unverified (Hades thẻ thay boon, Wildfrost, Super Auto Pets); không dùng làm căn cứ.

## Nhật ký

- 2026-11-06 — Review + mockup 5 phương án, chờ owner chọn.
- 2026-11-06 — Owner: "ok chọn cái B". Làm trên nhánh `ux/gear-2026-11` (worktree riêng, thư mục chung đang là nhánh motion của phiên khác).
  `src/ui/runmap.js`: `gearCard` viết lại (bước 1 thẻ món to + dải SQUAD có dòng xem trước của cả 3 món, CSS `:has` đổi theo thẻ `.sel` nên rê chuột
  không cần vẽ lại · bước 2 chip món + thẻ người gọn · người đủ ô mở món bỏ ra ngay trong thẻ, bỏ màn bước 3), helper mới `gearFits` / `gearLine` /
  `gearLoss` / `gearCheap` / `gearSay` / `gearPips` / `gearFace`, `firstSel` chọn sẵn người hợp (★) / món mất ít nhất, `enterKind` thêm `gear` /
  `gearwho` / `gearswap`, `wearFx` / `swapFx` viết lại cho bố cục mới, bỏ `gearRow` và đích `gswitch` (đổi món ở bước 2 = BACK), dọn tham số GEAR
  khỏi `squadCard` / `schoolIcons` / `gearSlots`. `gearChip`: GEAR trường phái = icon + tên (bỏ ▲). `config/motion.config.js`: `run.gear` 0,5 s,
  `gearwho` 0,5 s, `gearswap` 0,3 s. `css/style.css`: khối `.gearx` / `.gx-*` thay khối `.gearwho` / `.gr-card.row` cũ; thẻ treo 2 món không trỏ
  tối nhẹ. Chữ mới (4 gói, build lại font ja): HAS ONE, DROP ONE, `gear|FULL`. Docs: `RUN_DESIGN.md` mục GEAR, bảng "Áp dụng" của `ux-motion`.
  Kiểm bằng game thật (`tools/flow.py`): đeo (LONG wears Grip Socks), đổi (chọn sẵn Play Wristband +4, đổi đúng ô), rê chuột sang Keeper Gloves
  thì dải SQUAD đổi sang GK, món mua ở KIT VAN vào thẳng bước 2 và Esc không bỏ được, khung anim 0,1 / 0,25 / 0,6 s. `i18n-check` không lỗi.
  Số đo bước 1: chữ 69 → 36 · con số 25 → 8 · khung 20 → 11 · màu chữ / viền 13 → 4 · họ màu 7 → 5; diện tích 3 món gấp 4,1 lần dải đội
  (trước: đội gấp 3,2 lần món). Bước 2: 71 / 25 / 14 → 31 / 7 / 2. Chưa kiểm: co-op (bỏ phiếu từng bước giữ như cũ, chưa mở phòng thật).
<!-- mỗi lần xử lý: thêm 1 dòng (ngày · owner chọn gì · đã làm gì) -->
