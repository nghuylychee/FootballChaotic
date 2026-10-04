# Đa ngôn ngữ (localization)

Trạng thái 2026-10: có **English · Português (Brasil) · Português (Portugal) · Español** (tiếng Tây Ban Nha cho Mỹ Latinh, nền kiểu Mexico).
Trong popup chọn ngôn ngữ, bản Brazil ghi **Brasil**, bản Bồ Đào Nha ghi **Português** (chốt 2026-10-04).
Bản pt-BR và es đã qua **bản dịch đầu + 2 lượt tự trau chuốt**, CHƯA qua người bản xứ duyệt. Bản **pt-PT** (2026-10-04) mới có bản dịch đầu: viết lại bản pt-BR theo chuẩn Bồ Đào Nha (xưng *tu*, golo / guarda-redes / equipa / remate, chính tả kiểu Bồ Đào Nha), tên Area và tên đội đặt mới cho người Bồ Đào Nha. Bản này cũng chưa qua người bản xứ duyệt. Lượt 2 (2026-10-04) sửa những câu nghe như dịch máy và đối chiếu thuật ngữ với cách game / truyền hình ở từng nước đang dùng: EA FC, eFootball, Overwatch 2, LoL, Valorant, Fortnite, TUDN, báo Brazil.
Tài liệu cho người dịch / duyệt (tiếng Anh): [i18n/STYLE_GUIDE.md](i18n/STYLE_GUIDE.md) · [i18n/GLOSSARY.md](i18n/GLOSSARY.md) · [i18n/REVIEW_QUESTIONS.md](i18n/REVIEW_QUESTIONS.md) (những chỗ chưa chắc, người duyệt trả lời trước).

## Cách hoạt động

- **Câu tiếng Anh chính là key** (kiểu gettext). Câu chưa có bản dịch thì hiện tiếng Anh, không bao giờ hiện key lạ.
- **Code:** `src/core/i18n.js`. Mỗi file UI đặt tắt `const _t = SFC.t, _tn = SFC.tn;`. Không đặt tên là `t`, vì `t` đã được dùng cho biến team / time ở khắp nơi.
  | Hàm | Dùng khi | Ví dụ |
  |---|---|---|
  | `_t(s, vars)` | chuỗi thường, có biến | `_t('vs {team}', { team: boss.name })` |
  | `_tn(one, other, n, vars)` | số nhiều | `_tn('{n} free box to open!', '{n} free boxes to open!', free)` |
  | `SFC.tc(ctx, s)` | cùng câu tiếng Anh nhưng nghĩa khác | `SFC.tc('attack', 'HARD')` (đòn mạnh) ≠ `_t('HARD')` (độ khó) |
  | `SFC.N_(s)` | chỉ đánh dấu, dịch ở chỗ khác lúc hiện | banner sự kiện trong `match.js` (online: khách nhận sự kiện của host) |
- **Config:** các trường liệt kê trong `src/i18n/fields.js` được dịch tại chỗ mỗi lần đổi ngôn ngữ, nên code đọc config không phải sửa. Bản tiếng Anh gốc được giữ lại để đổi qua lại. Đuôi `#ngữ cảnh` hoạt động như `tc`. Đuôi `@N` giới hạn bản dịch tối đa N ký tự, dùng cho chỗ hiển thị có bề rộng cố định (sơ đồ tay cầm).
- **Chữ bay trong trận** (`effects.text` / `effects.comic` / `callout`): dịch lúc vẽ (`renderer.js`, `vfx.js`), không phải sửa systems. Tiếng tượng thanh (BOOM!, POW!) để nguyên trong bản dịch.
- **Bản dịch:** `src/i18n/pt-BR.js`, `src/i18n/pt-PT.js`, `src/i18n/es.js`. Mỗi file gọi `SFC.I18n.add({ id, name, steam, accentCaps, strings })`. Thứ tự `<script>` trong `index.html` là thứ tự trong popup.
- **Số:** `SFC.I18n.num(n, digits)` tách hàng nghìn / thập phân theo ngôn ngữ (12,500 / 12.500 · 0.5 / 0,5). Tiền ở trang chủ và số trong mô tả Core đã dùng hàm này.

## Popup chọn ngôn ngữ (`src/ui/langpick.js`)

- **Lần đầu mở game:** popup hiện trước mọi thứ, menu phía sau được ẩn đi. Chọn xong mới tới màn đặt tên / PROLOGUE. Hồ sơ cũ (từ trước khi có đa ngôn ngữ) cũng thấy popup này **một lần**, vì `Settings.lang` của họ đang là null.
- **Dòng chọn sẵn** là ngôn ngữ đoán theo máy: ngôn ngữ Steam đặt cho game (bỏ qua `english`, vì khi Steamworks chưa khai báo ngôn ngữ khác thì Steam luôn trả english), sau đó tới ngôn ngữ hệ điều hành (bản desktop đọc qua `electron/preload.js`), cuối cùng là trình duyệt.
  - Tiếng Bồ: Steam `brazilian` → pt-BR, `portuguese` → pt-PT. Máy để `pt-BR` → pt-BR, `pt-PT` → pt-PT, `pt` trơn → pt-BR (file nạp trước). Angola, Mozambique và các nước theo chính tả Bồ Đào Nha (`pt-AO`, `pt-MZ`...) → pt-PT, khai báo ở `tags` của `pt-PT.js`.
- **Mỗi ngôn ngữ một dòng**, tên viết bằng chính ngôn ngữ đó. Tiêu đề, ghi chú và gợi ý phím đổi theo dòng đang chọn, để người không đọc được tiếng Anh vẫn hiểu.
- **Điều khiển:** ↑↓ chọn, xác nhận để chọn. Lần đầu không có nút quay lại (bắt buộc chọn). Từ SETTINGS thì B / Esc để quay lại. Chuột rê qua để xem trước, bấm để chọn.
- **Console / TV:** khung nằm giữa màn, gọn trong vùng an toàn (90%). Chữ cỡ bằng nút menu chính. Dòng đang chọn có viền + ▶, không chỉ đổi màu. Gợi ý phím theo thiết bị đang dùng (Enter / A / ✕).
- **Đổi lại:** SETTINGS > LANGUAGE. Dòng phụ ghi tên ngôn ngữ kèm chữ "Language" tiếng Anh, để ai lỡ chọn ngôn ngữ mình không đọc được vẫn tìm ra. Ngôn ngữ đổi ngay, không cần khởi động lại.
- **Console (đã chốt 2026-10-04):** bản console bỏ popup lần đầu, tự dùng ngôn ngữ của máy (máy để ngôn ngữ game không có thì dùng tiếng Anh), vẫn giữ SETTINGS > LANGUAGE. Bản PC giữ popup như hiện tại. Lúc làm bản port, đối chiếu lại yêu cầu chứng nhận của từng hãng (TRC / XR / Lotcheck).

## Viết chuỗi mới

1. **Code:** bọc bằng `_t('...')`, dùng chuỗi viết thẳng (script kiểm tra chỉ gom được chuỗi viết thẳng). Nếu chuỗi nằm trong mảng hằng số tạo lúc nạp file, hãy viết thành hàm gọi lúc vẽ, ví dụ `const STAT_LABELS = () => ({ ... })`. Lý do: ngôn ngữ có thể đổi khi game đang chạy.
2. **Config:** thêm đường dẫn vào `src/i18n/fields.js`.
3. **Không ghép câu:** viết cả câu với `{biến}`, không dùng `'You got ' + n + ' coins'`. Thứ tự từ ở mỗi ngôn ngữ khác nhau.
4. **Số nhiều** dùng `_tn`. Không viết `n > 1 ? 's' : ''`, vì tiếng Nga có 3 dạng số nhiều.
5. **Chuỗi trả về là HTML** (gán vào innerHTML): `esc()` các biến lấy từ người chơi. Bản dịch được tin cậy nên có thể chứa `<b>`, `<em>`, `<br>`.
6. Chạy `node scripts/i18n-check.js`. Câu mới sẽ hiện ở mục "thiếu" của từng ngôn ngữ, gửi phần đó đi dịch.

## Kiểm tra

| Lệnh | Để làm gì |
|---|---|
| `node scripts/i18n-check.js` | Tóm tắt: % đã dịch, thiếu, thừa, sai thuật ngữ. **LỖI** (exit 1) khi lệch `{biến}` / thẻ HTML / `*từ khoá*`, hoặc vượt giới hạn `@N` |
| `... --missing es` | Liệt kê chuỗi chưa dịch kèm chỗ dùng |
| `... --long` | Bản dịch dài hơn hẳn tiếng Anh, dễ tràn khung |
| `... --sheet review.csv` | Bảng duyệt (UTF-8, mở được bằng Excel / Google Sheets): key · chỗ dùng · tiếng Anh · từng ngôn ngữ |
| `... --extract src.json` | Danh sách chuỗi nguồn cho công cụ dịch |
| `index.html?lang=es` | (chỉ bản dev) vào thẳng 1 ngôn ngữ, không hỏi, không lưu, để chụp màn hình |
| `index.html?lang=pseudo` | (chỉ bản dev) giả dịch: thêm dấu và kéo dài ~35% để tìm chuỗi sót / chữ tràn trước khi có bản dịch thật. Cũng chọn được trong popup ở bản dev |
| `SFC.I18n.report()` trong console | (bản dev) các key chưa dịch đã gặp từ lúc mở game |

Bảng thuật ngữ được kiểm tự động: dòng nào có `Lint ✓` trong `GLOSSARY.md` thì câu tiếng Anh chứa từ đó phải được dịch bằng một trong các cách đã chốt.

## Quy trình dịch

1. **Văn phong** ([STYLE_GUIDE.md](i18n/STYLE_GUIDE.md)): loại chữ nào dịch sát, loại nào dịch thoáng; quy tắc kỹ thuật; ghi chú cho từng ngôn ngữ.
2. **Thuật ngữ** ([GLOSSARY.md](i18n/GLOSSARY.md)): chốt một lần, bắt buộc dùng thống nhất. Muốn đổi thì đổi ở bảng trước rồi mới tới bản dịch.
3. **Bản dịch đầu:** đã làm cho pt-BR, pt-PT và es (dịch theo văn phong + thuật ngữ + ngữ cảnh từng màn). Bản pt-PT viết lại từ pt-BR, nên câu nào sửa nghĩa ở pt-BR thì xem lại cả pt-PT.
4. **Người bản xứ duyệt trong game.** Gửi REVIEW_QUESTIONS.md trước, rồi bảng `--sheet` kèm ảnh chụp từng màn (`?lang=xx`). Sửa thẳng trên bảng rồi nhập lại vào file `src/i18n/*.js`. Danh sách kiểm ở cuối STYLE_GUIDE.

## Thêm ngôn ngữ mới

1. Tạo `src/i18n/<mã>.js` (chép cấu trúc của `es.js`), thêm `<script>` vào `index.html` sau các file dịch khác.
2. Khai báo `steam: [...]` theo mã ngôn ngữ API của Steam (`russian`, `schinese`, `japanese`...).
3. **Font:** Press Start 2P và VT323 đang đóng gói chỉ có Latin (+ chữ Việt cho VT323).
   - Tiếng Nga: Press Start 2P có bản Cyrillic (tải thêm file `cyrillic` vào `assets/fonts`, khai báo `@font-face` với `unicode-range`). VT323 không có Cyrillic, nên phải chọn font thay cho phần chữ thân.
   - Trung / Nhật: cần font pixel có chữ Hán (vài MB), ảnh hưởng dung lượng bản web.
   - **Chữ hoa có dấu** (Á É Ó Ñ... pt-BR, pt-PT, es; sau này È Î Ö... cho Pháp, Đức): Press Start 2P vẽ chúng thấp như chữ thường. Bật `accentCaps: true` trong file dịch để dùng font phụ **SFC Accent Caps**. Chữ nào font phụ chưa có thì thêm vào `GLYPHS` trong `scripts/build-accent-caps.py`, chạy lại, rồi thêm mã chữ vào `unicode-range` của `@font-face` "SFC Accent Caps" trong `css/style.css`.
4. Thêm cột ngôn ngữ đó vào `GLOSSARY.md` và một mục trong STYLE_GUIDE.

## Phạm vi đã dịch / chưa dịch

**Đã dịch:**
- popup ngôn ngữ, đặt tên, trang chủ, SETTINGS (âm thanh, điều khiển, ngôn ngữ, xoá dữ liệu)
- CHARACTER (chỉ số, ngoại hình, tên đồ đang mặc), Main Path, Luyện tập, Online / phòng chờ, màn WISHLIST (bản demo)
- toàn bộ PROLOGUE (cut scene, trận mơ, thẻ Main Path), màn giới thiệu đội, chọn Core (tên + mô tả 54 Core, Cộng hưởng), HUD, Pause, kết quả + thưởng, màn mở thẻ, màn DRILL / LEVEL UP
- chữ bay trong trận; tên đội, khẩu hiệu, mô tả 30+ đội; tên Area.

**Chưa dịch** (vẫn hiện tiếng Anh):
- SHOP / mở hộp / túi đồ (`gacha.js`): mô tả đồ, tỉ lệ, nút
- TEAM / scout (`team.js`)
- trang TEST (chỉ bản dev, cố ý để tiếng Anh)
- chữ vẽ trên sân (bảng quảng cáo, graffiti, màn hình sân vận động) và chữ trong hình cut scene (GOAT, FAMILY...): cố ý giữ như chữ trong tranh.

## Giới hạn đã biết

- **Chữ hoa có dấu (đã sửa 2026-10-04):** Press Start 2P vẽ chữ hoa có dấu thấp như chữ thường (MUéVETE, PRóLOGO, VOCê). Font phụ **SFC Accent Caps** (`assets/fonts/SFCAccentCaps.woff2`, dựng bằng `scripts/build-accent-caps.py` từ chính pixel của Press Start 2P, giấy phép OFL) vẽ lại 13 chữ đủ cao. Font này chỉ bật cho ngôn ngữ có `accentCaps: true` (pt-BR, pt-PT, es, giả dịch): `i18n.js` gắn class `accent-caps` lên `<html>`, CSS đổi biến `--px`, chữ vẽ trên canvas lấy font qua `SFC.I18n.pxFont()`. Dấu nhô lên trên ô chữ 1/4 cỡ chữ, nên khung `overflow: hidden` dùng `--px` phải chừa chỗ (`:root.accent-caps :is(...)` trong `css/style.css`). Thêm khung kiểu đó thì thêm selector vào danh sách này.
- **Icon tài nguyên trong mô tả Core** thay theo đúng chữ (Embalo, Furia...). Ngôn ngữ biến cách như tiếng Nga sẽ không khớp. Trước khi dịch tiếng Nga nên đổi mô tả sang token kiểu `{res:rage}`.
- **Mô tả Core ghi phím bàn phím** (D, Z): khi chơi bằng tay cầm / console thì sai. Nên đổi sang token phím theo thiết bị (`{key:shoot}`), giống gợi ý phím ở menu.
- **Ô đặt tên** chỉ nhận A-Z, 0-9, không gõ được dấu (João, Íñigo). Trên console cũng chưa có bàn phím ảo.
- **Trang Main Path:** ô đội chỉ vừa khoảng 14 ký tự cho tên đội và khoảng 16 ký tự cho tagline, dài hơn bị cắt "…". Tên Core của chefão được xuống tối đa 2 dòng (đã kiểm cả 10 Area ở 3 ngôn ngữ, không tên nào bị cắt). pt-PT: tên đội và tagline (trừ dòng của chefão) đều nằm trong giới hạn; tên Core exclusivo dài nhất là "Arrancada Relâmpago" / "Remate Buraco Negro" (19 ký tự), chưa chụp màn từng Area.
- **Online:** tên Core trong cut-in Tuyệt kỹ đến từ máy host nên có thể khác ngôn ngữ với máy khách. Banner và chữ bay thì mỗi máy tự dịch.
- **Brazil cấm hộp quà ngẫu nhiên trả tiền** trong game mà trẻ vị thành niên có thể chơi (Lei 15.211/2025, hiệu lực từ 17/03/2026; luật định nghĩa "caixa de recompensa" là mua "mediante pagamento"). Hộp gacha hiện chỉ mở bằng vàng kiếm trong trận nên nằm ngoài định nghĩa này. Nếu sau này bán vàng hoặc bán hộp bằng tiền thật (kể cả qua một loại tiền nạp), phải hỏi lại pháp lý trước khi phát hành ở Brazil.
- **`electronLanguages`** (package.json) chỉ có `en-US`, `vi`. Mục này chỉ ảnh hưởng chữ của Chromium (menu chuột phải...), không ảnh hưởng game. Game đọc ngôn ngữ hệ điều hành qua preload.
