# tools/sprite-v2 — công cụ vẽ / duyệt sprite người chơi 2x (sprite đã vào game: `src/render/player/`)

Thiết kế, quyết định của user, tình trạng từng phần: `docs/SPRITE_V2.md`. Luật vẽ: `docs/SPRITE_GUIDE.md`.

## File

| File | Việc |
|---|---|
| `src/render/player/` (trong game) | Sprite 2x (`SFC.PlayerSprite`), mỗi động tác 1 file, thứ tự nạp trong `scripts/manifest.js` (bảng file: `docs/SPRITE_V2.md` mục 4). API: `draw(ctx, X, Y, o)` ở px mịn, `drawPlayer(ctx, p, g, …)` (= `SFC.Sprites.drawPlayer`), `attackPose(p)` |
| `cdp.mjs` | Mở game trong Chrome headless, chờ menu (game tự nạp sprite 2x); `save()` ghi ảnh + manifest; `PAGE_COMMON` = code dùng chung chạy trong trang. Cột "hôm nay" (`OLD = SFC.Sprites`) giờ cũng là sprite mới |
| `player.mjs` | Ảnh người chơi: trên sân (đứng, chạy), 6 hướng hôm nay / 2x, bảng chạy + chạy nước rút → `out/player/` |
| `pilot.mjs` | Ra đòn bằng sprite 2x × 4 hướng, 60 khung = 1 s → `out/pilot/pilot.png`; thủ môn đổ người bay thật dọc vạch vôi ở bảng ô cao `out/pilot/dive.png`. Nhóm `review` (đang làm) / `done` (đã duyệt) |
| `moves.mjs` | Mọi động tác khác (trạng thái, ra đòn, thủ môn, bị đá bay, ăn mừng) chạy bằng code game → `out/moves/` |
| `page.mjs` | Trang xem gọn → `out/site/sprites.html`: động tác đang làm (vòng lặp + khung chính) + 1 hàng mỗi động tác đã duyệt (đọc `out/player` + `out/pilot`); nút tốc độ 1× / ¼× và zoom; ảnh có `?v=<băm>` để trình duyệt không dùng ảnh cũ |
| `grid.mjs` | Ghép vùng cắt phóng to để soi khung hình |
| `check.cjs` | Giữ đứng / chạy / đấm / Hard attack / sút / vô-lê / đánh đầu / thủ môn đổ người / bị đá bay (đã duyệt) không bị đổi: so lệnh vẽ với `baseline.json` |
| `page.css` | CSS của trang xem |

`out/` là ảnh sinh ra, không đưa vào git.

## Chạy

Cần server game (`npm run serve`) và Chrome (`CHROME` đổi đường dẫn). Server khác cổng 8080 thì đặt `SPRITE_URL`.

```sh
node tools/sprite-v2/check.cjs                 # sau mỗi lần sửa src/render/player/
SPRITE_URL=http://localhost:8080 node tools/sprite-v2/player.mjs
SPRITE_URL=http://localhost:8080 node tools/sprite-v2/pilot.mjs
SPRITE_URL=http://localhost:8080 node tools/sprite-v2/moves.mjs
node tools/sprite-v2/page.mjs                  # -> out/site/sprites.html
node tools/sprite-v2/grid.mjs z.png 4 2 tools/sprite-v2/out/pilot/pilot.png:312,96,104,96 tools/sprite-v2/out/pilot/pilot.png:416,96,104,96
```

- 3 script vẽ dùng cổng DevTools riêng (9361 / 9362 / 9363), chạy song song được.
- `check.cjs --update` ghi lại baseline. Chỉ chạy khi user đã duyệt thay đổi ở phần đã duyệt (đứng, chạy, đấm, Hard attack, sút, vô-lê, đánh đầu, thủ môn đổ người, bị đá bay).
- Trang xem đăng lên artifact Sprite v2: publish `out/site/sprites.html` kèm `out/site/sheets/*`.
