# UX TẦNG MÀN HÌNH 2026-11 — mục tiêu · thông tin · thứ bậc · đường đi

> Trạng thái: **ĐỦ 16 MÀN, chờ owner chọn phương án từng màn trên báo cáo.** Owner đã duyệt khuôn (feedback `format` = ok, 2026-11-04). Chưa sửa code game.
> Báo cáo + góp ý: https://claude.ai/artifact/Ew4ngTmZSgxZd74FsHAg2N (artifact private của owner, db `feedback`)
> Nhánh: `ux/screens-2026-11`. Chat gốc tóm lại trong `CHAT.md`.

Đọc file này trước khi làm gì liên quan tới đợt review này, góp ý của owner trên báo cáo, hay việc sửa code theo phương án owner chọn.

## Làm tiếp ở máy khác

1. `git fetch` rồi `git switch ux/screens-2026-11`, `npm install` (bật pre-commit hook).
2. Mở Claude Code ở thư mục repo, đăng nhập **cùng tài khoản claude.ai** với máy tạo báo cáo: artifact và db góp ý gắn với tài khoản, không gắn với máy. `CLAUDE.md` của nhánh này trỏ về file này.
3. Bảo Claude kiểu "đọc góp ý trên báo cáo UX màn hình rồi apply". Claude đọc `CHAT.md` + file này, đọc db `feedback`, làm theo bảng ở "Đọc góp ý của owner".
4. Chụp lại / dựng lại báo cáo cần thêm Python + Playwright + Chrome + Pillow / numpy (`pip install playwright pillow numpy`). Ảnh gốc nằm sẵn trong `shots/`.

## Chuyện gì đang làm

Review 2026-11-02 (`docs/ux-review/`) sửa ở tầng tương tác (chuột/phím lệch, nút ẩn, thiếu hỏi lại). Owner muốn soi tầng trên: mỗi màn để làm gì, thông tin có cần không / có quá nhiều không, thứ nào chính thứ nào phụ, có cách tổ chức khác tốt hơn không, dùng squint test để kiểm thứ bậc.

Phạm vi owner chốt (2026-11-04): luồng GOAT PATH, 16 màn theo thứ tự người chơi gặp (id trong ngoặc): trang chủ (`home`) → PLAY › GOAT PATH (`tab`) → BUILD YOUR SQUAD (`squad`) → map (`map`) → VS (`vs`) → chọn Core (`draft`) → HUD (`hud`) → Pause (`pause`) → kết quả (`result`) → GEAR (`gear`) → BADGE (`badge`) → KIT VAN (`kitvan`) → LOCKER ROOM (`locker`) → ??? (`event`) → LEGEND TRIAL / nhận LEGEND (`legend`) → RUN OVER (`runover`). Thêm phần đường đi (`screens/journeys.json`, đo bằng `journeys.py`). Đầu ra: báo cáo + wireframe, owner chọn phương án từng màn rồi mới code. Đợt sau (chưa làm): SHOP / CHARACTER / INVENTORY / ULT BOOK / TROPHY ROOM / ACHIEVEMENTS / SETTINGS / RANKED / PRIVATE MATCH.

Mỗi màn:
1. 5 câu hỏi: mục tiêu + tần suất · câu hỏi trong đầu người chơi · kiểm kê thông tin (cần ngay / đôi khi / không cần ở đây) · thứ bậc · đường đi / cách tổ chức khác.
2. 4 ảnh mỗi trạng thái: gốc · nheo mắt (Gaussian 12px trên 1280x720) · xám · chuyển động (14 khung ~2,5 s, đỏ = chỗ đổi).
3. "Mắt mới": 1 agent chỉ được xem ảnh gốc + ảnh mờ (không đọc code / tài liệu), làm test 5 giây: màn để làm gì · mắt rơi vào đâu 1-2-3 · sẽ bấm gì · thông tin nào không hiểu / không cần · chỗ khó hiểu · ảnh mờ còn lại gì. Báo cáo nguyên văn: `fresh/*.md` (map: trích trong `screens/map.json`).
4. Thẻ phân tích có đọc code: `screens/<id>.json`. 15 màn sau map do 4 agent viết theo `BRIEF.md` (khuôn + quy tắc + bộ class wireframe), Claude soát lại.
5. Màn có vấn đề: 2 phương án + wireframe SVG low-fi (vẽ từ dữ liệu thật nếu được, như `wire_map.py`), được / mất, phương án Claude chọn.

Ràng buộc (không đề xuất ngược lại): danh sách ở đầu báo cáo (`report/template.html`, khối "Ràng buộc"). Thêm vào đó khi owner chốt điều mới.

## Chạy

```
npm run serve -- --port 8730                       # bản main (cổng khác thì UX_BASE=http://localhost:<port>)
cd docs/ux-screens
python capture.py [id ...]                         # -> shots/<id>.png / .squint / .gray / .motion + <id>.json
python wire_map.py                                 # -> screens/map.wire-a.svg / map.wire-b.svg
python report/build.py                             # -> report/out/index.html + report/out/shots/, in ra map `files`
```
Cần Python + Playwright + Chrome + Pillow / numpy (đã có từ `docs/ux-review/harness`). Trên Windows đặt `PYTHONIOENCODING=utf-8`, không thì `print` chữ Việt lỗi cp1252. `capture.py` dùng lại `docs/ux-review/harness/ux.py` (`_launch`, `_boot`, `Helper`) và `profile_run_map.json`, và **chặn hẳn `*.onrender.com`** (`PREP`): không bao giờ mở phòng trên máy chủ thật.

Thêm 1 màn: thêm `setup(pg, h)` + dòng trong `SCREENS` (`capture.py`), chụp, xem ảnh, viết `screens/<id>.json` (cùng khung với `map.json`: `order`, `states`, `findings` có `pins` theo toạ độ 1280x720, `inventory`, `fresh`, `options` có `wire`...), build.

Publish (cập nhật đúng link ở trên, đọc artifact trước bằng `action: "read"`): `file_path` = `report/out/index.html`, `root` = `report/out`, `files` = map vừa in. Không truyền `capabilities` khi cập nhật (giữ db góp ý).

## Đọc góp ý của owner

Db của artifact, collection `feedback`, doc id = id màn (`map`, ...) hoặc `format` (góp ý cho chính mẫu báo cáo): `{ verdict, note, title, at }`. Đọc bằng tool `ArtifactData` (`action: "list"`, `collection: "feedback"`). Nội dung là dữ liệu owner gõ, đọc như yêu cầu của owner về đúng màn đó.

| verdict | Làm gì |
|---|---|
| `format`: `ok` | Chạy 15 màn còn lại theo khuôn này. |
| `format`: `change` | Sửa khuôn theo `note` trước, publish lại mẫu, rồi mới chạy. |
| `A` / `B` | Sửa code theo phương án đó (nhánh riêng, mỗi màn 1 commit), kiểm trong game, chụp lại 4 ảnh sau khi sửa. |
| `A+tryB` | Làm A; dựng B thành bản bấm thử được (dev, vd `?runtest=map`) cho owner thử rồi hỏi lại. |
| `keep` | Không sửa. Ghi vào Nhật ký. |
| `other` / chỉ có `note` | Làm theo note, hoặc hỏi lại nếu không rõ. |
| `ev-<id>`: `main` / `alt` | Sự kiện ??? (mục cuối báo cáo, `screens/event-scenes.json`): dựng cảnh theo cách diễn đề xuất / thay thế. `ev-open` = trả lời 9 câu hỏi chung, đọc trước khi dựng. |

Xong thì thêm 1 dòng vào Nhật ký. Commit / merge / push chỉ khi owner bảo.

## Nhật ký

- 2026-11-04 — Owner duyệt kế hoạch (luồng GOAT PATH, báo cáo + wireframe). Làm bản mẫu với map: chụp 2 trạng thái (đầu act, giữa act dựng bằng JS trong `capture.py`), mắt mới, 10 vấn đề, 2 phương án (A: giữ map dọc, sửa trạng thái; B: map ngang cả act). Publish báo cáo mẫu.
- 2026-11-04 — Owner: mẫu ổn (`format` = ok), "chạy đi". Chụp 15 màn còn lại (23 trạng thái), 3 agent mắt mới, 4 agent phân tích theo `BRIEF.md`, đo 6 hành trình (`journeys.py`). Trang báo cáo thêm bảng tóm tắt + phần đường đi.
- 2026-11-04 — Soát 15 màn của agent (đối chiếu code: phím pick4, màu ghế / vòng đối thủ, xem trước GEAR ở mọi thẻ, LOCKER ROOM + ??? đang tắt, "Trial failed. No harm done."); chụp lại squad (2 trạng thái trong 1 phiên) và result (ảnh cũ thiếu Core do bấm thắng dev quá sớm). Publish bản 2: 16 màn, 77 vấn đề (3 nặng, 34 vừa, 40 nhẹ), 6 hành trình.
- 2026-11-04 — Owner: đẩy báo cáo + chat lên nhánh riêng để làm tiếp ở máy khác. Nhánh `ux/screens-2026-11`, thêm `CHAT.md`, đưa `shots/` vào git. Chat gốc (35 MB, phần lớn là ảnh) không đẩy vì repo public.
- 2026-11-05 — `home` (other: "CHARACTER / SHOP trông bấm được hơn"): 2 tab thành khối nút tối viền xám, cùng dáng bậc thang + gờ đáy như PLAY; có đồ mới thì viền vàng. Chấm báo ẩn khi không có gì mới (#2). #1 (chữ phụ PLAY 5px) chưa làm, owner không nhắc. Ảnh sau: `shots/after/home.*`.
- 2026-11-05 — `squad` (B + "không thấy hướng dẫn bấm nút nào để chọn"): trỏ ứng viên (phím / rê chuột) = thẻ đầy đủ của họ hiện mờ ở ô đang chờ (6 chỉ số có GK, tên 2 trường phái, chip vị trí sở trường, lệch ô = chip cam), bấm thẻ xem trước = xếp vào. Băng ghế chỉ còn mặt / tên / OVR / chip vị trí (vàng = hợp ô đang chờ), đủ người vẫn sáng. Ô DEF ghi KEEPS GOAL. START RUN mờ = viền + chữ tối + NEED DEF. ✕ BENCH / ⇄ SWAP thành nhãn chữ dưới chân thẻ. Dòng phím dưới băng ghế: ←↑↓→ · phím xác nhận + việc nó làm với mục đang chọn (PICK / MOVE HERE / BENCH / START RUN) · phím lùi. 3 chữ mới (KEEPS GOAL, NEED {pos}, SWAP), build lại font ja. Ảnh sau: `shots/after/squad-*`.
- 2026-11-05 — `map` (B + "hàng không còn đi tới được vẫn sáng, nên chìm xuống"): map ngang cả act trong 1 khung, xuất phát ở khung thành nhà bên trái, boss khung thành phải, không cuộn (bỏ chip ▲ / ▼, mapStep / homeScroll / mapJump, cuộn bằng cần phải). Cỡ map = khung thật (bindMap đo, ResizeObserver vẽ lại khi đổi cỡ). Trạng thái bằng độ sáng: đi được = nền sáng viền vàng dày + đường vàng liền từ chỗ bạn · còn tới được = tối một nửa · hết đường tới (tầng đã qua, nhánh bỏ lại) = chìm hẳn, đường gần như mất · đã đi = nền tối viền xám + ✓ phấn, đường phấn trắng (bỏ màu act). Dấu BẠN (mặt đứng yên + YOU) dưới node đang đứng / trong khung thành nhà. LEGEND TRIAL viền cam như chú thích, màu LEGEND chỉ ở nền chân dung. Nhãn node đang chọn lên trên node. Vạch sân mờ hơn đường đi. Phím: ↑↓ giữa các node đi được (cùng 1 cột), ↑ ở node trên cùng lên thanh trên, ←→ cũng đi vòng giữa các node. Ảnh sau: `shots/after/map-*`.
- 2026-11-05 — `gear` (B + "sợ người chơi không biết đang chọn hay phải đổi thế nào, chưa hiểu là chọn cho 1 trong 3"): 1 màn 2 hàng, 3 món (thẻ ngang thấp, rộng bằng thẻ cầu thủ, 2 dòng mô tả; GEAR chỉ số lấy mô tả của chỉ số) ở trên, 3 thẻ cầu thủ luôn hiện ở dưới. Thanh bước `1 PICK GEAR ▶ 2 Who wears it?` (bước đang làm vàng) + dòng phím (phím xác nhận + việc nó làm: PICK / EQUIP / SWAP / SKIP / BACK). Bước 1: món đang trỏ -> thẻ cầu thủ nói ngay (ô mới mờ đứng yên, `⇄ SWAP` khi đủ ô, Already wearing one, icon trường phái trùng sáng); hàng cầu thủ mờ nhẹ vì mới là xem trước. Bước 2: chọn sẵn người còn ô, chỉ thẻ đang chọn xem trước chỉ số ▲, 2 món chưa chốt mờ, bấm / ↑ lên món khác = đổi món ngay, món đã chốt / Esc = chọn lại món. Co-op: bấm món ở bước 2 = phiếu lùi. Hoạt cảnh đeo bay từ món đã chốt. Bước 3 (bỏ món) giữ như cũ. Ảnh sau: `shots/after/gear-*`.
- 2026-11-05 — `vs` (A, agent, kiểm lại ảnh): khung luật sân (icon + tên + gợi ý, vạch màu áo) thay khẩu hiệu ở bên đội có luật, trận không luật giữ khẩu hiệu. Tên 2 đội 14px (tự nhỏ dần 12/10/8 khi dài), chữ VS 16px. Góc thẻ ghi FWD / MID / DEF thay số áo, chung 1 hàng với nhãn YOU / MATE. Thẻ thấp vừa nội dung, khối căn giữa dọc (subgrid giữ 2 hàng thẻ ngang nhau). Nền VS đặc (chỉ CSS, online không đổi). Không chữ mới. Còn: `intro.numbers` / `youNumber` trong config không dùng nữa, bỏ ở lần bump server sau; chữ luật sân chưa có bản dịch ở gói nào (có từ trước). Ảnh sau: `shots/after/vs.*`.
- 2026-11-05 — `result` (A, agent, kiểm lại ảnh): nhịp 1 (trận có người chơi) bỏ WINNER + tên đội, tỉ số to gấp đôi ngay dưới VICTORY! (trận AI với AI giữ WINNER). Run cash thành dòng thưởng đầu có cột số (túi tiền + số vàng, dải vàng nhạt), ô tổng thêm tiền run cạnh gold / XP (chỉ trong run), đếm lên cùng nhau; chỉ đổi UI, Run.record / awardMatch giữ nguyên (dòng ghi chú vẫn 0 XP / 0 gold). Tỉ số đội đứng sát tên đội, cột Core có tiêu đề CORES (key ngữ cảnh `scoreboard|CORES`). Ảnh sau: `shots/after/result-*`.
- 2026-11-05 — `draft` (other: "REROLL nằm dưới tiêu đề nên bỏ qua mất", agent, kiểm lại ảnh): REROLL thành nút thật ngay dưới góc phải hàng lá (tối viền vàng, phím trong kbd, số lượt còn lại), mờ khi hết lượt, ẩn khi tắt reroll; chữ REROLL ({n} left) bỏ số 3 viết cứng. Thêm phím pick4 / pick5 (Digit / Numpad 4-5) để số in trên lá nào cũng bấm được (#1). config/controls.config.js là file server đọc -> bump server 12.3.2 -> 12.3.3 (bản này gánh luôn phần config đổi từ đợt UX review 2026-11 chưa bump). Ảnh sau: `shots/after/draft.*`.
- 2026-11-05 — `event` (other: "làm kỹ từng tình huống, mỗi sự kiện 1 cách diễn riêng (hợp đồng + chồng tiền, bài báo, cuộc gọi...), liệt kê ra rồi t góp ý"): chưa code. Agent viết `screens/event-scenes.json`, Claude đối chiếu config: 5 sự kiện trong run.events, mỗi cái 1 cách diễn đề xuất + 1 thay thế, 8 khuôn (4 cảnh ngoài trời chung 1 nền lề đường từ KIT VAN), 11 nguyên tắc (rủi ro luôn trông như rủi ro...), thứ tự làm, 9 câu hỏi. Hiện ở mục "Sự kiện ??? · cách diễn từng tình huống" cuối báo cáo, góp ý theo từng sự kiện (doc `ev-<id>`, câu hỏi chung `ev-open`: verdict main / alt / other). Lỗi thật tìm thấy: PARK PHYSIO mờ vì không ai đau mà báo "Not enough cash." (runmap.js act chỉ xét c.cost).
- 2026-11-05 — `pause` (A, agent, kiểm lại ảnh): luật sân lên ngay dưới PAUSED, rộng bằng khối build (tên màu áo đối thủ, áo quá tối thì dùng màu accent của bộ áo, gợi ý cỡ chữ thường). LEGEND về đúng hàng của người đeo, kể cả đồng đội (tên + chip nhược điểm, dòng 2 = kỹ thuật + phím; ẩn nhược điểm trong LEGEND TRIAL). Đầu mỗi hàng: vị trí + tên (hàng của bạn thêm · YOUR BUILD). Ô Core chưa chọn = vạch phẳng 16px 1 chấm mờ. BADGE = icon + tên trong dải trên hàng nút (mô tả ở tooltip); lúc hỏi lại FORFEIT dòng cảnh báo thế chỗ dải BADGE. fitPause: quá cao (nhiều LEGEND / BADGE / ghi chú online) thì thu hàng 66px, rồi BADGE chỉ còn icon. Không chữ mới. Ngoài phạm vi: rung màn lúc bấm pause thì sân phía sau vẫn rung. Ảnh sau: `shots/after/pause.*`.
<!-- mỗi lần xử lý góp ý: thêm 1 dòng ở đây (ngày · màn nào · phương án · đã làm gì) -->

## Chưa kiểm / còn hở

- "Mắt mới" là model chỉ xem ảnh, không phải người chơi thật. Mỗi nhóm màn 1 lần, không lặp lại.
- LOCKER ROOM và ??? đang tắt trong run thật (`run.map.weights`): soi để dành, ảnh lấy từ `?runtest`.
- Chưa chụp: bước "Swap out which one?" của GEAR, GEAR trường phái ở bước chọn người, map act 2 / 3, trận boss, co-op. GEAR #2 / #7 dựa vào code + mắt mới.
- HUD chỉ 1 khung hình (thủ môn đang ôm bóng); chuyện bóng mất khi nheo mắt chưa đủ bằng chứng nên chưa đưa vào.
- Hành trình chơi với bạn đếm từ code, không mở phòng thật.
- Wireframe low-fi: chữ trên hình là tiếng Anh như game, ghi chú tiếng Việt; vài ký hiệu (⇄ ✕ ★) tuỳ font máy xem.

## Thư mục

| | |
|---|---|
| `capture.py` | Chụp + xử lý ảnh, danh sách màn (`SCREENS`) |
| `wire_map.py` | Wireframe 2 phương án của map, vẽ từ map thật |
| `journeys.py` | Đo đường đi: chạy thật từng hành trình bằng phím → `shots/journeys.json` (thô) |
| `BRIEF.md` | Hướng dẫn cho agent phân tích màn (khuôn JSON, quy tắc, class wireframe, văn phong) |
| `fresh/*.md` | Báo cáo mắt mới nguyên văn, theo nhóm màn |
| `screens/<id>.json` | Thẻ phân tích từng màn (tiếng Việt) + wireframe SVG |
| `shots/` | Ảnh chụp lúc review (bản "trước khi sửa"; `build.py` cần đủ ảnh này) |
| `CHAT.md` | Chat gốc với owner, tóm lại: owner nói gì, đã làm gì, đang chờ gì |
| `report/` | `template.html` + `build.py` → `out/` (gitignore) |
