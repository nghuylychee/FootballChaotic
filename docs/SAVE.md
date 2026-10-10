# Save game (2026-09-30)

> Logic: `src/engine/storage.js` (SFC.Storage) · file: `electron/preload.js` (SFC_DESKTOP.store) · thư mục: `electron/main.js` (`sfc-save-dir`)

## Lưu ở đâu
| Bản | Nơi lưu |
|---|---|
| Desktop (Electron / Steam) | `%APPDATA%\Street Football Chaos\save\<key>.json` — tên thư mục cố định, đổi `productName` không mất save |
| Web | `localStorage` |

Không chuyển save cũ từ `localStorage` sang file: bản desktop chỉ đọc file.

| Key | Nội dung | Xoá khi RESET DATA |
|---|---|---|
| `sfc_profile_v1` | hồ sơ: level, gold, túi đồ, Main Path, đồng đội, chỉ số | ✅ |
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
