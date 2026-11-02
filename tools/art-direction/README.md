# tools/art-direction — ảnh khung mẫu của bộ cảnh

Luật vẽ: `docs/art-direction/`. Code cảnh nằm trong game ở `src/render/art/` (`SFC.Art`: kit, npcs, props, village; mô tả ở `docs/art-direction/village.md`). Thư mục này chỉ có 2 script chụp ảnh cảnh đó trong Chrome headless (dùng `tools/sprite-v2/cdp.mjs`); script nạp lại 4 file của `src/render/art/` nên sửa xong chạy lại là thấy, không cần tải lại game.

## Chạy

Cần server game (`npm run serve`) và Chrome (`CHROME` đổi đường dẫn, `SPRITE_URL` đổi cổng).

```sh
node tools/art-direction/render.mjs
node tools/art-direction/action.mjs 4 7
```

- `render.mjs`: khung Village đủ lớp + 1 trận thật (cầu thủ, bóng, khung thành, bóng cầu thủ đúng như trong game).
- `action.mjs [số khung] [hạt giống]`: trận AI, mỗi cầu thủ 1 Tuyệt kỹ nạp lại liên tục, vẽ bằng `SFC.Renderer` thật; giữ các khoảnh khắc nhiều VFX nhất. Đổi hạt giống = đổi bộ Tuyệt kỹ.
- `aspect.mjs [hạt giống]`: 1 khoảnh khắc trận (có cut-in Tuyệt kỹ) vẽ ở nhiều tỉ lệ màn hình (16:9 … 32:9) qua `Renderer.setView`, như khung nhìn trận trong game.

## Ảnh ra

`tools/art-direction/out/village/` (không đưa vào git):

- `frame.png`: đủ khung 880 x 512 + trận đấu, x2, có viền tối
- `background.png`, `props.png`, `npcs.png`, `match.png`: từng lớp, x2, nền trong
- `layers.png`: 4 ô (nền · nền + props · nền + npcs · đủ)
- `catalog.png`, `plants.png`: người / thú / đồ vật / cây dùng lại, phóng to
- `crop-*.png`: vùng cắt x4 để soi chi tiết
- `action-<hạt giống>-N.png`: khoảnh khắc Tuyệt kỹ trên đủ khung; `action-<hạt giống>-N-view.png`: đúng màn 640 x 360 người chơi thấy
- `aspect-<tỉ lệ>.png`: khung nhìn trận ở từng tỉ lệ màn hình
