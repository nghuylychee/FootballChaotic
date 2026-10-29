# Save game (2026-09-30)

> Logic: `src/engine/storage.js` (SFC.Storage) · nơi lưu theo target: `src/target/target.js` (SFC.Target.save) · file: `electron/preload.js` (SFC_DESKTOP.store) · thư mục: `electron/main.js` (`sfc-save-dir`)

## Lưu ở đâu
| Bản | Nơi lưu |
|---|---|
| Desktop (Electron / Steam) | `%APPDATA%\Street Football Chaos\save\<key>.json` — tên thư mục cố định, đổi `productName` không mất save |
| Web | `localStorage` |

Không chuyển save cũ từ `localStorage` sang file: bản desktop chỉ đọc file.

| Key | Nội dung | Xoá khi RESET DATA |
|---|---|---|
| `sfc_profile_v1` | hồ sơ: level, gold, túi đồ, Main Path, đồng đội, chỉ số, thành tích đã nhận (`ach`), tiến độ FOOTBALL STORY (`story`: `{ <id>: { best, plays, wins, finals, stars, first?, fin? } }`, src/meta/cup.js; `first` = ngày vô địch đầu, `fin` = tỉ số chung kết đẹp nhất, hiện ở PHÒNG TRƯNG BÀY), run GOAT PATH đang dở (`run`: map act hiện tại + node đã qua + `pending` lúc giao bóng, null = không có; src/meta/run.js) và thống kê mọi run (`runs`: `{ plays, wins, bestAct, bestFloor, bosses, road }`, `road` = tiến trình CORE ROAD theo run). Run đang dở giữ thêm tiền `cash`, túi BADGE của cả đội `bag` (chấn thương kèm `who` = người bị), thưởng chờ chọn `offer`, đội hình `squad` (mỗi người có thể có `legend` = id LEGEND), LEGEND chờ trả lời `join`, chấn thương đã chặn ở act này `guard`, phòng đang mở `room` (Shop: `items[{ id, price, sold, hot }]` / Locker Room / Skill game / LEGEND TRIAL / sự kiện), cut-scene chờ chiếu `cue` / đã chiếu `seen`. Run lưu trước 2026-10-28: BADGE chỉ số cũ bị bỏ khi mở lại (id không còn) | ✅ |
| `sfc_social_v1` | bạn bè giả (placeholder) + lịch sử chat + lời mời kết bạn đã gửi / nhận | ✅ |
| `sfc_settings` | âm lượng, cỡ cửa sổ | — |
| `sfc_fx` | Giảm nháy | — |

## Ghi an toàn
Mỗi lần ghi: viết `<key>.json.tmp` → bản đang có đổi tên thành `<key>.json.bak` → `.tmp` thành `<key>.json`.
Tắt ngang lúc ghi hoặc bản chính hỏng (không parse được) → đọc `.bak` (mất tối đa 1 lần lưu).

## Steam Cloud (Auto-Cloud)
Steamworks → *Application* → *Steam Cloud*: bật Auto-Cloud, thêm Root Override / đường dẫn:

| Root | Subdirectory | Pattern | OS |
|---|---|---|---|
| `WinAppDataRoaming` | `Street Football Chaos/save` | `sfc_profile_v1.json` | Windows |

Chỉ đồng bộ hồ sơ (`sfc_settings` là cỡ cửa sổ của từng máy). Không đồng bộ `.bak` / `.tmp`.
Quota gợi ý: 1 file, 1 MB (hồ sơ ~1–5 KB).
