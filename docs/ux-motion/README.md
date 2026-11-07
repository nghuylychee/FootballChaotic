# MOTION REVIEW 2026-11-06 — staggered reveal (màn nào nên hiện lần lượt, màn nào đang làm sai)

> Trạng thái: **ĐÃ ÁP DỤNG PHƯƠNG ÁN A (owner 2026-11-06) cho mọi màn, trừ màn chọn GEAR (owner: để nguyên).** Nhánh `ux/motion-2026-11`
> (đã merge vào main 2026-11-06, cùng nhánh GEAR `ux/gear-2026-11`). Xem "Áp dụng" bên dưới. Preview Before / đề xuất của cả 16 màn (High / Medium / Low) trên 1 trang: `preview/index.html`
> (mở thẳng từ đĩa hoặc qua `npm run serve` → http://localhost:8080/docs/ux-motion/preview/index.html). Bản đăng: https://claude.ai/artifact/XyEHHNPdM4v3bofQfpH6Cb
> (artifact private của owner). Làm trên `main` @ `99781ef`.

Đọc file này trước khi làm gì liên quan tới đợt review animation / staggered reveal, các trang preview, hay việc gom timing vào motion config.

## Owner chốt (2026-11-06)

- Danh sách màn ở bước 1 đủ; bỏ các màn đang không vào được (RANKED + tìm trận + MATCH FOUND, MAIN PATH, AREA MAP, thẻ thưởng `#reveal`, `#drill`, STATS, TEAM,
  HOW TO PLAY, FOOTBALL STORY, sự kiện ??? (`run.map.weights.event: 0`), LOCKER ROOM (`rest: 0`)).
- Màn cảm xúc cao = tất cả ứng viên Claude đưa: VICTORY / DEFEAT, REWARDS + LEVEL UP, CHAMPIONS / RUN OVER, NEW ULTIMATE, ký LEGEND, thẻ ACT, kết quả mở hộp,
  intro trận, chọn BADGE / GEAR, banner GOAL!. Còn lại = cảm xúc thấp, trừ mục "cần xác nhận".
- Tần suất: Claude tự suy từ code. Preview: khung 640x360 (game ngang 16:9), không phải tỉ lệ điện thoại.
- Vòng 2 (cùng ngày): **chọn Core** tính là cảm xúc cao · **cut scene** và **thẻ GOAT PATH cuối PROLOGUE** không đưa vào phạm vi · **LEGEND "Who gets him?"**
  gộp chung với anim ký LEGEND · dựng preview cả Medium / Low · dồn hết lên 1 trang (không phải bấm vào từng màn rồi back ra).

## Tần suất (suy từ config)

1 act = 7 tầng + boss (`run.map.floors`), mỗi đường 2–4 trận trước boss (`minMatches` / `maxMatches`) → 3–5 trận + 3–5 node khác (Skill / Shop / LEGEND).
1 trận = 150 s (`game.match.duration`) + intro ~3–6 s + 4 lượt chọn Core (`maxUpgrades`) + kết quả ~6 s ≈ 3,5 phút. 1 act ≈ 15–20 phút; demo chỉ có act 1.
"Vào nhiều" = mỗi trận / mỗi node trở lên (≥ ~4 lần một act). "Vào ít" = 1–2 lần một act hoặc ít hơn.

## Bước 2 — 4 nhóm

| Nhóm | Quy tắc | Màn |
|---|---|---|
| Vào nhiều + thấp | fade cả cụm ≤150 ms hoặc không anim | trang chủ, tab GOAT PATH, map run, khoanh phấn node, SQUAD, HUD, thanh kỹ năng, toast, đồng hồ / chờ chọn Core, PAUSE, tooltip |
| Vào nhiều + cao | pop nhẹ phần chính, 300–500 ms | intro trận, banner (tên node / GOAL! / KICK OFF), kết quả nhịp 1 + nhịp 2, chọn GEAR + anim đeo GEAR, **chọn Core** (owner vòng 2), NEW ULTIMATE bản "UNLOCKED" |
| Vào ít + thấp | fade đơn giản | BUILD YOUR SQUAD, KIT VAN, giới thiệu SKILL GAME / LEGEND TRIAL, SETTINGS / ngôn ngữ / tên, SHOP, INVENTORY, TROPHY ROOM, ACHIEVEMENTS, WISHLIST, hỏi thoát |
| Vào ít + cao | full stagger 1–3 s, bấm để hiện đủ | thẻ ACT, chọn BADGE + BADGE bay, LEGEND "Who gets him?" + anim ký (gộp, owner vòng 2), RUN OVER / CHAMPIONS, kết quả mở hộp, NEW ULTIMATE bản "DISCOVERED" / "EVOLVED" |

Ngoài phạm vi (owner vòng 2): cut scene (`story.js`, nhịp chữ do kịch bản), thẻ GOAT PATH cuối PROLOGUE (`story.js` `pathCard`).

## Bước 3 — soi lỗi màn đang có anim

| Kiểm tra | Màn dính |
|---|---|
| Stagger ở màn vào nhiều | kết quả nhịp 2 (2,92 s), intro (2,55 s), NEW ULTIMATE "UNLOCKED" (≈2,9 s mỗi lần), chọn Core (0,56–0,64 s, nếu xếp thấp) |
| Anim chạy lại khi back / data refresh | chọn Core (lá lật lại sau PAUSE / đổi tay cầm), kết quả mở hộp (E / X và tin nhắn tự ẩn 3,5 s vẽ lại → `rvIn` lại), RUN OVER (trỏ phím sang ô Core mới → NEW BEST + thanh CORE ROAD chạy lại), tab trang chủ (`hnPop` mỗi lần vẽ), HUD (vẽ lại mỗi giây → pulse vô hạn khởi động lại, nhịp 0,8 s bị cắt ở 1,0 s) |
| Thứ tự sai ưu tiên | NEW ULTIMATE (tiêu đề hiện sau ô công thức, ở 1,08–1,24 s), banner đầu trận bị lượt chọn Core đầu trận đè (mở cùng khung hình), kết quả mở hộp (độ hiếm / tên / nút cùng 1 khối) |
| Hiện lẻ, không gom nhịp | intro (11 nhịp: 6 thẻ xen kẽ trái / phải mỗi 0,22 s + 6 chấm + 6 chỉ số). Không có list > 8 nào bị stagger |
| Không skip được / bấm chỉ tua | ký LEGEND (2,0–3,2 s, khoá, không bỏ qua; Esc giữa chừng vẽ lại làm vỡ hình; màn "Who gets him?" trước đó chọn sẵn thẻ đầu, Enter = ký ngay), khoanh phấn node (0,7 s khoá mỗi node), anim chọn lá Core (bấm 1 lần dừng ở trạng thái giữa, ô chưa đầy; lần 2 mới bỏ morph) |
| Close / Back bị ẩn tới khi anim xong | kết quả nhịp 2: nút ẩn (opacity 0, `pointer-events: none`) tới 2,39 s; LEAVE ROOM hiện nhưng click trong `#end` bị coi là "tua" |
| CTA nhận input ngay | chọn GEAR, chọn BADGE, LEGEND "Who gets him?" (Enter = ký cho thẻ đầu), RUN OVER (CONTINUE = xoá run), thẻ ACT (LET'S GO), kết quả mở hộp (OPEN ANOTHER = trừ gold), kết quả nhịp 2 (CONTINUE nhận Enter từ 2,39 s khi còn tàng hình, đèn chỉ hiện từ 2,67 s). Đã ổn: chọn Core (khoá 0,5 s), intro (0,35 s), kết quả nhịp 1 (0,45 s) |
| Layout dịch trong lúc anim | kết quả nhịp 2: cột thưởng trượt 204 px ngay lúc nút xuất hiện; dòng LEVEL UP / Unlocked / DRILL chèn sau khi đếm xong đẩy nút xuống (`showEndItems`) |
| Duration / easing rải rác | 103 `@keyframes`; 12 đường cubic-bezier khác nhau; 10 mức `steps(n)`; 23 `setTimeout` ghi số ms trong 7 file UI; banner: JS gỡ class ở 0,8–2,4 s còn CSS chạy 2,2 s; chuỗi chọn lá (200 / 620 / 970 / 1150 ms) phải khớp tay với CSS 0,42 s / 0,35 s |

## Bước 4 — bảng (xếp theo ưu tiên)

| Màn | File | Nhóm | Hiện trạng | Vấn đề | Đề xuất (nhịp + timing) | Ưu tiên | Effort |
|---|---|---|---|---|---|---|---|
| Kết quả trận nhịp 2 (REWARDS + bảng tỉ số) | `src/ui/endscreen.js` 336 / 224, CSS 2784–2795 | nhiều + cao | dòng ở 0,25 + i·0,24 s → đếm 1,0 s → chờ 0,42 s → cột trượt 0,42 s + bảng 0,5 s; nút đủ ở 2,92 s | stagger dài ở màn mỗi trận; CONTINUE nhận Enter khi tàng hình; layout trượt 204 px; dòng chèn sau đẩy nút; số hardcode | **A** pop 0,5 s: bố cục cuối đứng yên, thưởng 0–0,2 → số 0,1–0,45 → bảng 0,15–0,3 → nút 0,3–0,45, Enter từ 0,5 s. **B** 1,0 s: thưởng ở giữa 0,7 s (dòng + số cùng lúc) → trượt 0,3 s, nút + Enter từ 1,0 s, bấm sớm = hiện đủ. Cả 2: chừa sẵn chỗ dòng LEVEL UP | High | M |
| Intro trận | `src/ui/intro.js`, `config/intro.config.js`, CSS 1482–1602 | nhiều + cao | 11 nhịp lẻ, đủ ở 2,55 s, tự đóng 6,2 s, bấm sau 0,35 s = đóng | stagger dài 3–5 lần / act; 6 thẻ hiện lẻ xen kẽ | **A** 0,5 s: nền + tiêu đề 0–0,2 → 2 đội kèm thẻ 0,05–0,3 → VS 0,15–0,5, sân + chỉ số 0,2–0,5. **B** 0,9 s: đội + VS → 6 thẻ cùng lúc 0,45 + sân + chỉ số 0,6–0,9, bấm sớm = hiện đủ. Thời gian đọc 6,2 s giữ nguyên | High | S |
| Chọn GEAR | `src/ui/runmap.js` 646 (`gearCard`), 344 (`firstSel`), 1764 (`input`) | nhiều + cao | không anim, chọn sẵn món 1, Enter nhận ngay | bấm liên tay từ màn kết quả = chọn mù + đeo cho người đầu; `innerHTML` vẽ lại mỗi phím (thêm anim phải chặn chạy lại) | pop 0,5 s: lớp che 0,12 s → bước + 3 món 0,1–0,35 → thẻ cầu thủ 0,2–0,4 → SKIP 0,3–0,45; khoá Enter 0,5 s; chỉ chạy khi `RunUI.key` đổi | High | M |
| LEGEND "Who gets him?" + ký (gộp) | `src/ui/runmap.js` 1093 (`joinCard`), 1282 (`sign`) | ít + cao | màn chọn hiện tức thì, chọn sẵn thẻ đầu, Enter = ký ngay; anim ký: chân dung bay 650 ms → chỉ số +380 ms / cái → NEW COMBO, 2,0–3,2 s, khoá | bấm liên tay từ màn kết quả TRIAL = ký mù cho người đầu; anim không bỏ qua được, Esc giữa chừng vỡ hình | màn chọn: stagger ≈1,0 s (chân dung + tia → tên → câu hỏi → 3 thẻ cùng lúc → NO THANKS), Enter từ 1,0 s, bấm sớm = hiện đủ; anim ký: bấm / Esc = tới OVR + NEW COMBO ngay | High | M |
| RUN OVER / CHAMPIONS | `src/ui/runmap.js` 1420 (`endCard`), CSS 3176–3190, 3288 | ít + cao | hiện cùng lúc, chỉ NEW BEST 0,3–0,65 s + thanh CORE ROAD 0,4–1,3 s; CONTINUE chọn sẵn, Enter từ 0 s | Enter liên tay xoá run trước khi đọc; trỏ ô Core mới làm 2 anim chạy lại | 6 nhịp ≈2,3 s: tiêu đề 0,1 → thua ai + tới đâu 0,5 → NEW BEST 0,8 → đếm thắng 0,95 → mang về 1,25 (thanh 1,35–2,25) → Core mới 1,7 → CONTINUE 2,1; Enter từ 2,4 s; bấm sớm = hiện đủ + khoá 0,3 s | High | M |
| Chọn BADGE | `src/ui/runmap.js` 893 (`offerCard`), 922 (`fly`) | ít + cao | không anim, chọn sẵn thẻ 1, Enter nhận ngay (rồi BADGE bay 0,9 s) | chọn mù đồ cả đội cho cả run | 1,5 s: lớp che → tiêu đề 0,1–0,45 → 3 miếng vá lật 0,55 / 0,70 / 0,85 → hàng BADGE đội 1,2 → SKIP 1,35; bấm sớm = hiện đủ, khoá 0,3 s | High | M |
| Kết quả mở hộp | `src/ui/gacha.js` 272 (`tick`), 231 (`revealHtml`), CSS 984–990 | ít + cao | quay 4,8 s → cả khối `rvIn` 0,35 s; OPEN ANOTHER nhận Enter ngay | Enter tua rồi Enter tiếp = mua hộp mới; kết quả 1 khối không thứ tự; E / X / tin nhắn vẽ lại → `rvIn` lại | giữ quay; loé ô trúng 0,2 s → hình 4,95 → độ hiếm + tên 5,25 → nút 5,55; OPEN ANOTHER nhận Enter từ 5,95 s (hoặc 0,3 s sau khi tua); E / X sửa tại chỗ | High | S |
| Thẻ ACT | `src/ui/runmap.js` 1500 (`actCard`) | ít + cao | không anim; LET'S GO nhận Enter ngay sau cut scene | bấm liên tay qua cut scene là qua luôn thẻ | 1,2 s: "ACT n" đập 0–0,3 → tên act 0,35 → boss + sprite 0,6 → LET'S GO 0,9; bấm sớm = hiện đủ, khoá 0,3 s | Med | S |
| NEW ULTIMATE | `src/ui/recipefx.js` 30, CSS 2703–2733 | DISCOVERED / EVOLVED: ít + cao · UNLOCKED: nhiều + cao | ô công thức 0,15 + 0,16i → glow → mũi tên → tiêu đề + lật lá ở 1,08–1,24 s → tên → ghi chú; tự đóng ≈2,9 s; bấm = nhảy cuối (tốt) | tiêu đề (thứ chính) hiện gần cuối; bản UNLOCKED lặp mỗi lần đạt công thức mà vẫn ≈2,9 s | DISCOVERED / EVOLVED: tiêu đề 0–0,3 → ô công thức 1 nhịp 0,3–0,5 → lật lá 0,6 → tên 0,85. UNLOCKED: pop 0,4 s (tiêu đề + lá), tự đóng 1,2 s | Med | S |
| Banner (tên node, GOAL!, KICK OFF…) | `src/ui/hud.js` 367, CSS 233–240, `src/main.js` 227 | nhiều + cao | `bannerIn` 2,2 s; JS gỡ class ở 0,8–2,4 s | dur < 2,2 s → tắt cụt ngay đầu đoạn mờ (tên node 1,8 s, KICK OFF 1,4–1,6 s); banner đầu trận bị lượt chọn Core đè | vào 0,35 s + giữ `dur` + ra 0,3 s, JS điều khiển cả 3; banner đầu trận hiện sau khi chọn Core xong | Med | S |
| Chọn Core (draft) | `src/ui/draft.js` 12 / 148, CSS 270–282 | nhiều + cao | lá lật `cardFlipIn` 0,38 s lệch 0,02 / 0,10 / 0,18 (/ 0,26) → 0,56–0,64 s; khoá 0,5 s; sau khi chọn 1,53 s diễn | lật lại sau PAUSE / đổi tay cầm; bấm bỏ anim chọn lá: lần 1 dừng ở trạng thái giữa (ô chưa đầy), lần 2 mới bỏ morph | lá lật cả cụm 1 nhịp 0,3 s; chuỗi chọn rút còn 0,85 s (bay 0,3 s, morph 0,3 s); bấm 1 lần = trạng thái cuối; không chạy lại khi về từ PAUSE | Med | S |
| Khoanh phấn node | `src/ui/runmap.js` 412 | nhiều + thấp | nét SVG 0,45 s + bụi tới 0,97 s; khoá 0,7 s | khoá mỗi node, không bỏ qua; bụi bị cắt | Enter lần 2 = vào node ngay, hoặc rút còn 0,35 s | Low | S |
| HUD trong trận | `src/ui/hud.js` 24 | nhiều + thấp | không anim; `innerHTML` mỗi giây | pulse vô hạn khởi động lại mỗi giây | sửa chữ tại chỗ thay vì ghi đè `innerHTML` | Low | M |
| Trang chủ (tab) | `src/ui/menu.js` 1252, CSS 518–526 | nhiều + thấp | `hnPop` 0,2 s ở tab đang chọn | chạy lại mỗi lần vẽ (rê chuột, tin nhắn tự ẩn, hỏi thoát) | chỉ thêm class khi đổi tab | Low | S |
| Toast | `src/ui/hud.js` 389 | nhiều + thấp | vào tức thì, ra 0,4 s | hiện giật | fade vào 0,15 s | Low | S |
| Kết quả nhịp 1 | `src/ui/endscreen.js` 75 | nhiều + cao | `inDrop` 0,28 s + giữ 3 s, bấm sau 0,45 s | đúng quy tắc; sang nhịp 2 cắt cứng (nền đổi tức thì) | fade nền 0,15 s khi sang nhịp 2 | Low | S |
| Trang menu, map, KIT VAN, SQUAD, PAUSE, SETTINGS… | `menu.js`, `runmap.js`, `kitvan.js`, `matchui.js` | thấp | không anim (đổi `innerHTML`) | đúng quy tắc | giữ | — | — |

## Motion config dùng chung

Nên gom. Đặt ở **`config/motion.config.js` → `SFC_CONFIG.motion`** (đúng luật "số tuning nằm trong `config/`"; chỉ client: manifest target `game`, không `server`,
nên không cần bump server). Nội dung:
- `dur`: `instant 0 · fast 0.15 · pop 0.3 · beat 0.5 · stagger 0.15` (bước giữa 2 thứ trong 1 chuỗi).
- `ease`: `pixel` = `steps(n)` theo độ dài (≈ 1 bước / 60–80 ms, khớp các số đang dùng), `out` = `cubic-bezier(0.22, 1, 0.36, 1)`, `back` = `cubic-bezier(0.25, 1.35, 0.5, 1)`
  — thay 12 đường cubic-bezier hiện có bằng 2–3.
- `grace`: CTA nhận phím sau `0.5` s ở màn vào nhiều, `0.3` s sau khi bấm "hiện đủ" (thay `cores.draft.inputGrace`, `intro.skipAfter`, 450 ms của nhịp 1).
- `groups`: 4 nhóm ở bước 2 (`often.low / often.high / rare.low / rare.high`) với trần tổng thời gian; preset từng màn (`results`, `intro`, `reward`, `runEnd`, `box`, `actCard`) đọc từ đó.
- CSS đọc qua biến `--m-*` (đặt 1 lần lúc boot trong `main.js`), JS đọc `SFC_CONFIG.motion` trực tiếp. `intro.config.js` giữ khoá cũ, đổi số thì trỏ về `motion`.
- Kèm 3 helper nhỏ trong `src/ui/helpers.js` (`SFC.Motion`): `once(key)` (chỉ thêm class anim khi trạng thái đổi, vì `Menu.render` ghi đè `innerHTML`),
  `finish(root)` (`root.getAnimations({ subtree: true }).forEach(a => a.finish())` = "bấm để hiện đủ" cho mọi anim CSS), `grace(at)` (chặn CTA).

## Preview (bước 5)

`preview/index.html` là 1 trang: thanh điều khiển dính trên cùng (tốc độ / Auto-loop / thanh nhảy nhanh theo High · Medium · Low) + 16 mục, mỗi mục = vấn đề +
đề xuất + các cột Before / Option. Mỗi màn 1 file `preview/screens/<id>.js` (`MP.screen({...})`: mock 640x360 + CSS riêng + timeline từng cột); engine
`preview/preview.js` (`MP.mount`) + `preview/preview.css`. Mỗi mục có đồng hồ riêng: cuộn tới = chạy lại từ đầu, ra khỏi màn hình = dừng. Bản Before chép đúng
timing / easing / thứ tự từ code (dẫn file + hàm trong từng mục); WAAPI dừng + đặt `currentTime`, easing trên từng đoạn keyframe như CSS; `period` mô phỏng
`innerHTML` vẽ lại (HUD). Nút **Bấm thử** (phím T, hoặc bấm vào khung) mô phỏng Enter theo đúng luật `input` của code (Before) / đề xuất (After); cờ cột
(`flags`) giữ trạng thái lỡ dở như "ô chưa đầy" khi bỏ anim chọn Core. Màn có thao tác của người chơi (LEGEND, chọn Core, banner) giả lập lúc chọn giống nhau ở mọi cột.
Kiểm tra: Chrome headless qua CDP cuộn qua cả 16 mục (36 cột), không lỗi runtime, không tràn ngang.

## Áp dụng (phương án A, 2026-11-06)

Owner: "chọn A hết, trừ màn chọn GEAR để nguyên". NEW ULTIMATE: A và B là 2 bản (DISCOVERED / EVOLVED và UNLOCKED), không phải 2 phương án —
"A hết" đọc theo chữ = nhịp A cho mọi bản, kể cả UNLOCKED (hỏi lại owner nếu muốn bản UNLOCKED theo B: pop 0,45 s, tự đóng 1,2 s).

Số JS (lúc CTA nhận phím, lúc hiện đủ, chuỗi hẹn giờ) ở **`config/motion.config.js`** (`SFC_CONFIG.motion`, chỉ client: manifest target `game`, không cần
bump máy chủ). Độ dài / độ trễ từng phần tử ở `css/style.css` (chú thích "motion review"). Nhịp intro ở `config/intro.config.js` (máy chủ load ->
đã `npm run server:bump`, 12.3.5 -> 12.3.6).

| Màn | Đổi gì | Code |
|---|---|---|
| Kết quả trận nhịp 1 → 2 | bỏ `rw-focus` (cột căn giữa + trượt 204 px) và `revealScoreboard`; `#end.b2-in`: nền mờ 0,15 s, khung thưởng 0,2 s, bảng 0,15 s từ 0,15, nút từ 0,3; số đếm 0,1–0,45 s; Enter / click từ 0,5 s (`endReady`); dòng Unlocked / DRILL / LV CAP vẽ sẵn ẩn (`rwNewLine`, `.rw-new.pending`), `.rw-up` cao sẵn 16 px | `endscreen.js`, `matchui.js` (click, `show`), CSS `#end.b2-in` |
| Intro trận | 1 nhịp 0,5 s: `teamIn 0.05`, `vsAt 0.15`, `cardsAt 0.05` / `cardGap 0`, `pitchAt 0.2`, `statsAt 0.2`, khoá mới `statGap`, `dotGap`, `dotTime`; thẻ không còn anim riêng (vào cùng đội, `inSideL/R` 20 px); 1 tiếng thẻ | `intro.config.js`, `intro.js`, CSS `.in-*` |
| LEGEND "Who gets him?" + ký | stagger ≈1,0 s (`.rm-in.lgx.join`), Enter từ 1,0 s; ký: Enter / Esc / click = tới cuối ngay (`fxSkip`), giữ `signHold` 0,75 s; `tickStats` nhận `timers` (GEAR không truyền -> như cũ) | `runmap.js` `sign`, `tickStats` |
| RUN OVER / CHAMPIONS | 6 nhịp ≈2,3 s, GOLD đếm (`countGold`), Enter từ 2,4 s; NEW BEST / thanh CORE ROAD chỉ chạy lúc thẻ vừa mở (trước đây chạy lại khi trỏ ô Core mới) | `runmap.js`, CSS `.rm-in.rm-end` |
| Chọn BADGE | 1,5 s: tiêu đề → 3 miếng vá lật lần lượt → hàng BADGE → SKIP, Enter từ 1,5 s | CSS `.rm-in.rm-sheet.pick` |
| Thẻ ACT | 1,1 s, Enter từ 1,2 s (thẻ thêm class `act`) | `runmap.js` `actCard`, CSS `.rm-in.act` |
| Chung cho 4 thẻ che trên | `RunUI.enter` đặt khi `RunUI.key` đổi (`enterKind`); `.rm-in` + `--in0` (trên `#menu`) = -giây đã chạy -> vẽ lại giữa chừng chạy tiếp; Enter / Esc / click lúc đó = hiện đủ (`skipEnter`) + khoá `motion.lock` | `runmap.js` `render`, `input`, `click`, `back` |
| Kết quả mở hộp | ô trúng loé → khung → hình → độ hiếm + tên → nút (≈1,0 s, `.rv-in`); bấm lúc quay / lúc hiện = hiện đủ, OPEN ANOTHER từ 1,15 s (hoặc `lock` sau khi tua); vẽ lại (E / X / tin nhắn) không bật lại | `gacha.js` `tick`, `openAct`, `pageOpen`, CSS `.reveal.rv-in` |
| NEW ULTIMATE | tiêu đề 0,05 s, lá công thức 1 nhịp 0,25 s, lá lật 0,6 s, tự đóng 2,5 s (mọi bản) | `recipefx.js`, CSS `.rfx-*` |
| Banner | vào 0,35 + giữ `dur` + ra 0,3 (JS); banner đầu trận chờ lượt chọn Core đầu trận xong (`UI.kickoffBanner`, `updateHud` thử lại mỗi khung) | `hud.js`, `main.js` `kickoff`, CSS `#banner` |
| Chọn Core | lá lật cả cụm 0,3 s chỉ ở lượt mới / đổi bài (`renderDraft(game, flip)`, gỡ `.flip` sau 0,35 s -> PAUSE / đổi tay cầm không lật lại); chuỗi chọn 0,85 s; bấm 1 lần = ô đầy + không morph (`draftFill`, `draftSkipMorph`) | `draft.js`, CSS `.cards.flip`, `.flying-card`, `.morphing-square` |
| Khoanh phấn | giữ 0,7 s; Enter lần 2 / click = vào node ngay; Esc như cũ (`fxEsc` tắt) | `runmap.js` `chalk` |
| HUD | khoá vẽ lại không còn số giây; đồng hồ + dòng "Next Core in" sửa chữ tại chỗ | `hud.js` `updateHud` |
| Tab trang chủ | `hnPop` chỉ khi mục chọn đổi / vừa vào trang chủ (`.pop`, `homePopSel`) | `menu.js`, CSS `.hn-tab.sel.pop` |
| Toast | vào 0,15 s (`toastIn`, fill backwards để chiều ra vẫn chạy) | CSS `.toast` |
| Chọn GEAR | **không đổi** ở đợt này; làm lại cả màn ở review GEAR 2026-11-06 (`docs/ux-gear`, phương án B): mỗi bước ≤ 0,5 s, khoá nút tới lúc đó (`motion.run.gear` / `gearwho` / `gearswap`, CSS `.rm-in.gearx`), nhánh `ux/gear-2026-11` | `runmap.js` `gearCard` |

Kiểm tra: `node --check` các file sửa, `manifest --check`, `i18n-check` (không thêm chữ), `npm run server:test` OK; Chrome headless chạy game thật
(`?runtest=join.pirlow`, `?runtest=map`, `?runtest=match`, SHOP): tab trang chủ, mở hộp (bấm lúc hiện không mua, sau khoá mới mua), LEGEND (bấm 0,2 s =
hiện đủ, không ký; ký bấm = tới cuối), ACT / BADGE / RUN OVER (bấm lúc stagger = hiện đủ, sau khoá mới nhận), intro 0,45 s đã đủ, banner chờ draft rồi
mới hiện, màn kết quả bấm ở 0,2 s bị bỏ qua / ở 0,6 s nhận. Không lỗi runtime.

## Nhật ký

- 2026-11-06: bước 1 (kiểm kê 55 mục còn vào được + nhóm không vào được) → owner xác nhận → bước 2–5 (6 màn High, mỗi màn 1 trang). Chưa đụng code game.
- 2026-11-06 (vòng 2): owner chốt 4 mục cần xác nhận; LEGEND "Who gets him?" gộp với anim ký → High (cũng nhận Enter ngay); dựng thêm 10 màn Medium / Low;
  gộp tất cả về 1 trang (`screens/*.js`), bỏ 6 trang lẻ.
- 2026-11-06 (vòng 3): owner chọn A hết, trừ màn GEAR để nguyên -> áp dụng trên nhánh `ux/motion-2026-11` (bảng "Áp dụng"), commit + push.
- 2026-11-07: owner muốn lại anim lật / hiện **từng thẻ**: chọn Core lật lệch 0,02 / 0,10 / 0,18 / 0,26 s (0,38 s mỗi lá, vẫn không lật lại sau PAUSE);
  intro trận thẻ cầu thủ hiện xen kẽ trái / phải (`cardsAt 0.3`, `cardGap 0.22`, CSS `inCardL/R`), phần còn lại của intro giữ phương án A.
