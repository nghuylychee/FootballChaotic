# UX TẦNG MÀN HÌNH, ĐỢT 2 (2026-11-11) — các màn ngoài trận

> Trạng thái: **báo cáo đã publish, chờ góp ý của owner.** Chưa sửa code.
> Báo cáo + góp ý: https://claude.ai/artifact/G7qvauAj3Zyiyk19JCao68 (artifact private của owner), db `feedback`, doc id = id màn (`shop`, `character`, `inventory`, `ultbook`, `trophy`, `achievements`, `settings`, `private`, `ranked`).

Cùng cách soi với đợt 1 (`../README.md`, luồng GOAT PATH 16 màn): 5 câu hỏi, 4 ảnh mỗi trạng thái (gốc · nheo mắt · xám · chuyển động), kiểm kê, phương án + wireframe. Khác đợt 1: không chạy bài "mắt mới" bằng agent (owner chỉ bảo làm, đợt này các màn gặp ít và đơn giản).

Phạm vi (owner 2026-11-11, mục D15): SHOP (`shop`), CHARACTER + APPEARANCE (`character`), INVENTORY (`inventory`), ULT BOOK (`ultbook`), TROPHY ROOM (`trophy`, 4 trạng thái), ACHIEVEMENTS (`achievements`), SETTINGS (`settings`), PRIVATE MATCH (`private`). RANKED + AREA MAP (`ranked`): tab RANKED đang ẩn từ 2026-10-31, chỉ ghi chú.

## Chạy

```
npm run serve                                        # hoặc cổng khác, đặt UX_BASE
cd docs/ux-screens
UX_BASE=http://localhost:8080 UX_OUT=r2/shots python capture.py m-shop m-char m-look m-inv m-ults m-trophy-room m-trophy-shelf m-trophy-album m-trophy-board m-ach m-settings m-ranked m-areamap m-private
UX_ROOT=r2 python report/build.py                    # -> r2/report/out/index.html + map `files`
```
Màn đợt 2 nằm cuối `SCREENS` trong `../capture.py` (id `m-*`, `VET_JS` = hồ sơ đã chơi vài run). Trên Mac chưa có Playwright thì tạo venv: `python3 -m venv .venv && .venv/bin/pip install playwright pillow numpy` (dùng Chrome có sẵn, không cần `playwright install`).

## Đọc góp ý của owner

Như bảng ở `../README.md` (verdict `A` / `B` / `keep` / `other` + `note`). Sửa trên nhánh riêng (`ux/screens-r2-2026-11`), mỗi màn 1 commit, chụp lại vào `r2/shots/after/`.

## Nhật ký

- 2026-11-11 — Chụp 14 trạng thái, viết 9 thẻ phân tích + 7 wireframe, publish báo cáo. SHOP / INVENTORY / SETTINGS ổn; CHARACTER, ULT BOOK, TROPHY ROOM, ACHIEVEMENTS, PRIVATE MATCH có phương án.
