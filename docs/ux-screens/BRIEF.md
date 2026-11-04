# Brief cho agent phân tích màn (review UX tầng màn hình)

Đọc trước: `docs/ux-screens/README.md` (đợt review này là gì), `AGENTS.md` (kiến trúc + các quyết định của owner), mẫu đã được owner duyệt: `docs/ux-screens/screens/map.json` + `wire_map.py` (wireframe). Viết đúng khuôn và đúng độ kỹ đó.

## Việc của bạn

Với mỗi màn được giao: viết `docs/ux-screens/screens/<id>.json` (+ wireframe SVG nếu có phương án). **Không sửa code game, không sửa file nào khác.** Không chạy server, không mở trình duyệt: ảnh đã chụp sẵn.

Nguồn có sẵn cho mỗi trạng thái `<st>` (danh sách trạng thái của màn ở trong prompt):
- `docs/ux-screens/shots/<st>.png` (gốc 1280x720), `.squint.png` (mờ 12px), `.gray.png` (xám), `.motion.png` (đỏ = chỗ động trong ~2,5 s).
- `docs/ux-screens/shots/<st>.json`: mục đang chọn sẵn (`sel`), thứ tự focus (`order`, chỉ có ở trang runmap), `moving_pct`.
- Báo cáo "mắt mới" (agent chỉ xem ảnh, không biết game): dán trong prompt của bạn.
- Code: đọc đúng chỗ vẽ màn (prompt có gợi ý file). Mọi khẳng định về nguyên nhân phải kiểm trong code (dẫn `file` + hàm / selector).

Xem đủ 4 ảnh của mỗi trạng thái bằng Read trước khi kết luận về thứ bậc.

## Cách soi (5 câu hỏi, theo thứ tự)

1. **Mục tiêu** của màn trong 1 câu + **tần suất** (1 lần / mỗi run / mỗi trận / vài lần mỗi trận...) → chọn `lens`: "người mới" (màn gặp ít) hay "người đã quen" (màn gặp liên tục).
2. **Câu hỏi trong đầu người chơi** lúc tới màn (3–5 câu). Thứ nổi nhất phải trả lời câu quan trọng nhất.
3. **Kiểm kê** mọi phần tử: trả lời câu hỏi nào, mức cần (`cần ngay` / `cần khi <tình huống>` / `đôi khi` / `không cần ở đây` / `trang trí`), đang nổi hạng mấy khi nheo mắt. Phép thử: che đi thì quyết định có khó hơn không.
4. **Thứ bậc**: hạng 1-2-3 nên là gì vs thực tế (ảnh mờ + ảnh xám + chuyển động + mắt mới) vs mục chọn sẵn của phím.
5. **Đường đi**: có cách tổ chức khác tới cùng mục tiêu không (gộp / tách màn, chọn sẵn mặc định, hiện dần, đổi hướng bố cục...).

Màn trong trận (HUD...): tiêu chí ngược — mắt phải ở bóng và cầu thủ, HUD không được giành mắt.

## Quy tắc

- **Không bịa vấn đề.** Màn ổn thì nói ổn (`level: "ổn"`, `options: []`, `findings` có thể rỗng hoặc chỉ vài cái nhẹ). Owner đánh giá cao sự trung thực hơn số lượng.
- Mỗi vấn đề phải có bằng chứng thấy được: ảnh nào (nheo mắt / xám / chuyển động / gốc), lời mắt mới, hoặc code. Lời mắt mới chỉ là 1 người: nó đoán sai thì nói vậy, đừng lấy làm vấn đề.
- **Không mở lại 38 vấn đề đã sửa** (danh sách trong `docs/ux-review/README.md`) và không đề xuất ngược các quyết định đã chốt (AGENTS.md, khối "Ràng buộc" trong `report/template.html`). Ví dụ: Core desc không có số; không hiện use rule Ultimate trên HUD; không lộ đối thủ trước trận; BADGE không cộng chỉ số thẳng; KIT VAN / TROPHY ROOM giữ pixel art; chữ không viết phím cứng; popup qua `Effects.pop`. Đề xuất nào đụng tới quyết định cũ của owner thì ghi rõ trong `cost` ("đổi quyết định 2026-xx-xx của m").
- Tối đa 8 vấn đề mỗi màn, xếp nặng → nhẹ, đánh số từ 1. `sev`: `nặng` (người chơi hiểu sai / bỏ lỡ thứ chính) · `vừa` · `nhẹ`.
- Phương án: chỉ khi có vấn đề đáng sửa. 2 phương án (A rẻ / ít đổi, B tổ chức lại) khi có lựa chọn thật; 1 phương án nếu chỉ có 1 cách hợp lý. Mỗi phương án có wireframe, `notes` đánh số khớp số đỏ trên wireframe, `gain` / `cost` thật (kể cả code phải đụng: file + hàm), và `pick` = phương án bạn chọn + vì sao.
- `level`: `ổn` · `chỉnh` (sửa thứ bậc / chữ / trạng thái, giữ bố cục) · `tổ chức lại` (đổi bố cục / luồng).

## Văn phong (tiếng Việt, giống `map.json`)

Câu ngắn, chủ động, nói thẳng. Gọi owner là "m", mình là "t" (chỉ trong `pick` / `cost` khi cần). Tên trong game giữ tiếng Anh viết hoa như game (GOAT PATH, KIT VAN, BADGE, GEAR, LEGEND, Core, Ultimate). Không dùng gạch ngang dài để chèn ý, không "không phải X mà là Y", không câu đố rồi lộ đáp án sau dấu hai chấm. Trích lời mắt mới nguyên văn tiếng Anh trong `fresh` (tối đa 6 câu, ngắn) và có thể trích trong `body` bằng ngoặc kép.

## JSON (đúng khung `map.json`)

```
{ "id", "order", "title", "where" (đường vào › trang · file · hàm/selector), "goal", "freq", "lens",
  "level": "ổn" | "chỉnh" | "tổ chức lại",
  "questions": [..], "states": [{ "id": "<st>", "label", "note" }],
  "keep": [ thứ đang làm đúng, nên giữ ],
  "findings": [{ "n", "sev", "kind", "title", "body", "evidence": [..], "pins": [{ "s": "<st>", "x", "y" }] }],
  "inventory": [[phần tử, trả lời câu hỏi, mức cần, đang nổi (nheo mắt), ghi chú]],
  "fresh": [..], "verdict": "1-2 câu",
  "wireNote": "wireframe vẽ trên ...",   (tuỳ chọn)
  "options": [{ "id": "A", "name", "wire": "<id>.wire-a.svg", "notes": [..], "gain", "cost" }],
  "pick": "..." }
```
`pins`: toạ độ trên ảnh 1280x720, đặt **cạnh** chỗ cần chỉ (lệch ~40–60px, không che đúng thứ đang nói), không ra ngoài ảnh. Mở ảnh gốc ra đo.

## Wireframe SVG (low-fi, cùng 1 bộ class với map)

Ghi `docs/ux-screens/screens/<id>.wire-a.svg` / `-b.svg`. Một thẻ `<svg class="wf" viewBox="0 0 640 360" role="img" xmlns="http://www.w3.org/2000/svg">`, vẽ theo khung 640x360 của game. **Chỉ dùng class, không tô màu cứng** (trang tô theo theme sáng / tối):
- nền / khung: `wf-bg` (nền màn), `wf-map` (vùng nội dung), `wf-frame` (viền), `wf-ph` (chỗ ảnh / nhân vật / sân giữ chỗ), `wf-pitch` (nhóm vạch sân).
- hộp: `wf-box` (thẻ / nút thường), `wf-box hi` (đang chọn / chính), `wf-box acc` (nút chính tô vàng), `wf-box dim` (mờ / không dùng được), `wf-box flat` (khung phụ), `wf-box bad` (viền đỏ: cảnh báo).
- đường: `wf-ln` (`dash`, `acc`).
- chữ: `wf-txt` + `big` / `md` / `sm`, `c` (giữa) / `r` (phải), `ink` (chữ tối trên nền sáng), `on-acc` (chữ trên nút vàng), `acc` (chữ vàng), `mute`.
- nhãn vàng: `<g class="wf-lab"><rect/><text/></g>`; số đánh dấu: `<g class="wf-pin"><circle r="7"/><text>1</text></g>` (y chữ = cy + 3).
- node map (nếu cần): xem `wire_map.py`.
Low-fi: hộp + chữ thật (tên nút / nhãn thật của game), không vẽ chi tiết pixel art. Chữ tiếng Việt chỉ ở ghi chú; chữ trên "màn game" giữ như game (tiếng Anh). Đặt số đỏ cạnh thứ mà ghi chú nói tới. Font-size tối thiểu 7.

## Xong thì

Kiểm JSON hợp lệ: `python -c "import json;json.load(open('docs/ux-screens/screens/<id>.json',encoding='utf-8'))"`. Kiểm SVG là XML hợp lệ: `python -c "import xml.dom.minidom as m;m.parse('docs/ux-screens/screens/<id>.wire-a.svg')"`.
Trả lời ngắn: mỗi màn 1 dòng (level, số vấn đề nặng / vừa / nhẹ, phương án chọn) + những gì bạn không chắc.
