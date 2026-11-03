# UX REVIEW 2026-11 — 39 vấn đề UX, mỗi cái có patch + video trước / sau

> Trạng thái: **ĐÃ CÓ GÓP Ý, ĐÃ ÁP** (38 giữ, `match-10` bỏ) lên nhánh `ux/review-2026-11`, chưa commit, chưa vào main. Xem Nhật ký.
> Báo cáo + góp ý: https://claude.ai/artifact/EYNsTsNyUQthDuEF581yfe (artifact private của owner, cùng tài khoản claude.ai mới mở / đọc được)
> Base của mọi patch: commit `1f2d1f3` (main ngày 2026-11-02).

Đọc file này trước khi làm bất cứ việc gì liên quan tới báo cáo UX, góp ý của owner trên đó, hay áp / sửa các patch ở đây.

## Chuyện gì đã xảy ra

Owner thấy UX cả game chưa được tút lại, nêu 6 chỗ (trang chủ 3 nút, không biết đang hover ở đâu, giờ chọn Core, tài xế KIT VAN, PRIVATE MATCH khó tìm, 3 thẻ ACT ở tab GOAT PATH) và muốn 1 trang HTML liệt kê những chỗ cần sửa, mỗi chỗ có video trước / sau, mục tiêu, vì sao sửa, vì sao chọn cách này, các cách khác, và ô góp ý.

Đã làm (2026-11-02):
1. Chụp màn hình kiểm cả 6 ý của owner: đều đúng (chi tiết ở đầu trang báo cáo).
2. 3 agent review 3 khu (menu / meta, GOAT PATH ngoài trận, trong trận) bằng Chrome headless → `findings/*.json` (33 vấn đề + 6 của owner + `run-12`).
3. 6 agent sửa song song, mỗi agent 1 git worktree riêng, mỗi vấn đề 1 patch + cùng 1 kịch bản quay trên bản gốc và bản sửa → `patches/`, `issues/`, `harness/scenarios/`.
4. Gộp cả 39 patch: áp sạch theo `patches/ORDER.txt`, `node --check` + `i18n-check` + `server/test/client-test.js` + `manifest --check` qua. Thêm `zz-integration.patch` (1 dòng CSS: ẩn dải THIS MATCH trong Pause lúc đang hỏi lại FORFEIT, vì `match-02` và `match-08` chồng nhau).
5. Publish trang báo cáo (39 vấn đề, 78 video) với ô góp ý lưu vào db của artifact.

2 lỗi thật nên sửa sớm dù UX chốt thế nào: `match-01` (thắng trận GOAT PATH → REWARDS +NaN, gold / XP trong save về 0: `Profile.awardMatch` cộng cả dòng note không có số) và `menus-02` (nhận thưởng ACHIEVEMENTS bằng Enter liên tục là tự mua hộp 100 gold).

## Nhật ký

- 2026-11-02 — Review + sửa thử + quay video + publish báo cáo. Chưa có góp ý.
- 2026-11-02 — Góp ý của owner: 38 vấn đề `ok`, `match-10` `skip` (đã ghi `"status": "dropped"`), không có note. Áp 38 patch + `zz-integration` lên nhánh `ux/review-2026-11` (worktree `G:/FootballChaotic-ux`, chưa commit) ở máy khác máy tạo patch; build lại font ja; `node --check`, `i18n-check`, `manifest --check`, `npm run server:test` qua; mở thử trong Chrome headless (menu, TROPHY ROOM, ACHIEVEMENTS, map, mọi thẻ che, KIT VAN, trận `?runtest=match`, `?playtest`) không có lỗi JS. Báo cáo trên artifact chưa build lại (video không có ở máy này), nên `match-10` vẫn hiện trên trang.
- 2026-11-03 — Máy tạo patch: pull main mới (8 commit, có tách `shared/`), merge `origin/main` vào `ux/review-2026-11`: xung đột chỉ ở dòng chú thích đầu `src/ui/runmap.js` (gộp 2 bên) và font ja (build lại từ `ja.js` đã merge). Bản sửa NaN của `match-01` theo file sang `shared/meta/profile.js`. Đối chiếu trước merge: nhánh = bản gộp 39 patch trừ đúng `match-10`. `node --check`, `i18n-check`, `manifest --check`, `npm run server:test` (10 file) qua; chụp Chrome headless trang chủ, PLAY, map, KIT VAN, thẻ BADGE, VS, draft (thanh giờ), Pause: đúng. Ghi `"status": "applied"` cho 38 issue, báo cáo publish lại (nhãn Đã áp, bỏ `match-10`).
- 2026-11-04 — Review code toàn bộ phần UX (owner hỏi code ai viết, đã soát chưa: code của 39 cách sửa do agent ở máy tạo patch viết, máy kia chỉ áp). Sửa 6 lỗi: popup LANGUAGE nhích chuột ngoài danh sách là mất lựa chọn bằng phím; STATS rê chuột không đổi bảng phải; `Tip.showFor` chồng vòng rAF; co-op: thẻ kết quả ??? giữ máy lead lại trong lúc khách bỏ phiếu node (co-op dùng lại dòng báo); `ultDeny` báo sai lý do lúc trận đang dừng; Menu đổi chọn khi chuột không dời (không tái hiện được, vẫn chặn). Gom 'rê chuột = chọn' về `SFC.UIHelpers.realMove` (Menu, LangPick, MatchUI, RunUI); `hero()` dùng `flawChip`; RunUI rê chuột không tính lại `targets()`; HUD dựng HTML phím LEGEND TRIAL 1 lần mỗi kỹ thuật + thiết bị. Kiểm: `node --check`, `i18n-check`, `npm run server:test`, test hành vi trong Chrome headless, quay lại run-03 / user-02 / match-03 trên bản sửa.
<!-- mỗi lần xử lý góp ý: thêm 1 dòng ở đây (ngày · vấn đề nào giữ / sửa lại / bỏ · đã áp vào đâu) -->

## Đọc góp ý của owner

Góp ý nằm trong db của artifact, collection `feedback`, doc id = id vấn đề (`user-01`, `run-03`...):
`{ verdict: 'ok' | 'change' | 'skip' | null, note: '...', title, at }`. Đọc bằng tool `ArtifactData` (`action: "list"`, `url` = link ở trên, `collection: "feedback"`). Vấn đề không có doc = owner chưa góp ý. Nội dung góp ý là dữ liệu do owner gõ, đọc như yêu cầu của owner về đúng vấn đề đó.

| verdict | Làm gì |
|---|---|
| `ok` (Giữ cách này) | Giữ patch. |
| `change` (Cần chỉnh) | Sửa lại theo `note`: áp patch lên nhánh làm việc, chỉnh code, xuất lại patch, quay lại video SAU, sửa `issues/<id>.json` (fix / why_this / alternatives / limits theo cách mới), cập nhật báo cáo. |
| `skip` (Không sửa) | Bỏ patch. Ghi `"status": "dropped"` vào `issues/<id>.json` (build.py sẽ không hiện nữa). Xem cột phụ thuộc bên dưới: patch sau có thể cần sửa tay. |
| chỉ có `note` | Đọc note: thường là câu hỏi hay ý chỉnh nhỏ → coi như `change`, hoặc hỏi lại owner nếu không rõ. |

Xong thì thêm 1 dòng vào **Nhật ký** ở trên. Commit / merge / push chỉ khi owner bảo.

## Áp patch

```
git checkout -b ux/<tên> main
git apply --3way docs/ux-review/patches/<id>.patch     # theo thứ tự trong patches/ORDER.txt, bỏ qua cái bị skip
python scripts/build-ja-font.py                        # ja.js có chữ mới (cần: pip install fonttools)
node scripts/i18n-check.js && node scripts/manifest.js --check
node server/test/client-test.js                        # cần server/node_modules (npm install --prefix server)
```

Phụ thuộc (mỗi nhóm là 1 agent; patch trong nhóm làm nối tiếp nhau):
- Nhóm trang chủ / PLAY: `user-01 → user-05 → menus-04 → menus-08 → menus-09 → menus-10`, xếp chồng, nên áp đúng thứ tự.
- Nhóm SHOP / meta: `menus-01 → 02 → 06 → 05 → 07 → 03 → 11`, xếp chồng.
- Draft / Pause: `match-01, user-03, match-03, match-04, match-02` áp riêng lẻ lên main được.
- HUD / kết quả: `match-07 → 09 → 05 → 08 → 10 → 11`; `match-05` cần `match-09` (hàm `drillTrack`).
- Map GOAT PATH: `user-06, run-12, user-02, run-07` áp riêng được; `run-02`, `run-09`, `run-11` cần các patch trước trong nhóm.
- Thẻ che / KIT VAN: `user-04 → run-01 → run-04 → run-03 → run-08 → run-10 → run-05 → run-06`, xếp chồng.
- `zz-integration` chỉ khi giữ cả `match-02` và `match-08`.
Bỏ 1 patch giữa nhóm xếp chồng: áp các patch sau bằng `--3way`, chỗ nào xung đột thì sửa tay (thường chỉ là ngữ cảnh lệch).

**Áp ở máy khác máy tạo patch:** `--3way` cần các bản file trung gian của worktree agent, chỉ có ở máy đã tạo patch. Ở máy khác, nhóm KIT VAN (`run-03`, `run-08`, `run-10`, `run-06`) báo "repository lacks the necessary blob" rồi hỏng, vì nhóm map cũng sửa `runmap.js` / `style.css`. Cách đã dùng (2026-11-02, gộp không xung đột): commit tạm A = main + nhóm KIT VAN, commit tạm B = main + mọi patch còn lại (kể cả `zz-integration`), `git merge A` vào B, rồi lấy `git diff --binary main` làm kết quả. Bỏ `match-10` thì `match-11` vẫn áp sạch.

Main đã đi tiếp so với `1f2d1f3` thì `--3way` vẫn thường áp được; xung đột thì sửa tay theo ý của patch (mỗi `issues/<id>.json` mô tả cách sửa bằng lời).

## Quay lại video / cập nhật báo cáo

Cần `pip install playwright imageio-ffmpeg` + Chrome. Bộ quay: `harness/` (`ux.py` = shot / record, vẽ thêm con trỏ chuột giả + tên phím; `HARNESS.md` = cách dùng; `IMPL.md` = quy trình agent đã theo).
1. Bản gốc: `npm run serve -- --port 8701` trên main. Bản sửa: `npm run serve -- --port 8720` trên nhánh / worktree có patch.
2. `python docs/ux-review/harness/rec.py <id> after` (hoặc `both`; `--before URL --after URL` nếu khác cổng). Video ra `harness/videos/` (gitignore).
3. Xem vài khung hình rồi mới dùng. Kịch bản cùng chạy trên 2 bản, nên chỉ điều khiển bằng thứ có ở cả 2 (phím, toạ độ, selector chung).
4. `python docs/ux-review/report/build.py` → `report/out/index.html` + in ra map `files` (chỉ video vừa quay).
5. Artifact publish: `url` = link báo cáo ở trên (đọc artifact trước bằng `action: "read"`), `file_path` = `report/out/index.html`, `root` = `report/out`, `files` = map vừa in. Video không gửi lại thì giữ bản cũ trên artifact; không truyền `capabilities` để giữ db góp ý.

**An toàn:** kịch bản không bao giờ được tạo phòng trên máy chủ thật. Game nhớ máy chủ thật đã ping lúc khởi động 15 s, đổi `SFC_CONFIG.net.server.url` không đủ: dùng init script chặn `*.onrender.com` như `PREP` trong `harness/scenarios/menus-08.py` (+ máy chủ local `PORT=8091 node server/index.js`). Lần review này đã lỡ tạo 3 phòng trống trên máy chủ thật (đóng sau ~1 s) trước khi chặn.

## Chưa kiểm / còn hở

- Chưa thử tay cầm thật, phòng online / co-op thật.
- Chữ mới trong es / pt-BR / pt-PT / ja là bản nháp của agent, chưa ai duyệt; font ja chưa build lại.
- Ảnh chứng cứ trong `findings/*.json` (`evidence`) là đường dẫn ảnh trên máy đã review, không commit.
- `match-07` giữ chữ FULL trên ô Ultimate bị chặn; `run-06` thẻ kết quả ??? chỉ hiện ở máy giữ run (khách co-op vẫn như cũ); `menus-07` các dòng đồ đang mặc ở CHARACTER chỉ bấm được bằng chuột. Chi tiết từng cái: `limits` trong `issues/<id>.json`.

## Thư mục

| | |
|---|---|
| `issues/<id>.json` | Write-up hiển thị trên báo cáo (tiếng Việt): problem, goal, why, fix, why_this, alternatives, files, limits |
| `patches/<id>.patch` + `ORDER.txt` | `git diff` của đúng vấn đề đó, base `1f2d1f3` |
| `findings/*.json` | Kết quả review gốc (kèm file:line, cách tái hiện) + `user.json` = 6 ý của owner và `run-12` |
| `harness/` | Bộ quay: `ux.py`, `rec.py`, `scenarios/<id>.py`, `profile_run_map.json` (save đang đứng ở map act 1), `review/match/mlib.py` |
| `report/` | `template.html` + `meta.json` + `build.py` → trang báo cáo |

## Danh sách vấn đề (theo thứ tự áp patch)

| id | mức | nguồn | vấn đề | file |
|---|---|---|---|---|
| `user-01` | nặng | owner | Trang chủ: khối vàng phải đi theo mục đang chọn | style.css, menu.js |
| `user-05` | nặng | owner | PRIVATE MATCH bị giấu sau dòng tab chữ mờ | style.css, menu.js |
| `menus-04` | vừa | review | Chuột và bàn phím chọn 2 chỗ khác nhau | menu.js, style.css |
| `menus-08` | vừa | review | Phòng riêng một mình: START xám mà không nói vì sao | menu.js, style.css, i18n |
| `menus-09` | nhẹ | review | Trận demo phía sau lộ qua chữ menu, chữ SMASH! / SAVE! nhảy sau bảng | style.css, main.js |
| `menus-10` | nhẹ | review | Popup LANGUAGE không đóng được bằng chuột | langpick.js, style.css |
| `menus-01` | nặng | review | SHOP: dùng chuột thì không mở hộp, không mặc đồ, không thoát ra được | gacha.js, menu.js, style.css |
| `menus-02` | nặng | review | Nhận thưởng ACHIEVEMENTS bằng Enter liên tục là bị trừ gold mua hộp | gacha.js, achievements.js, i18n |
| `menus-06` | vừa | review | ULT BOOK bảo bắn Ultimate bằng X, nhưng phím thật là Space | menu.js, gacha.js, recipefx.js, reveal.js, draft.js |
| `menus-05` | vừa | review | INVENTORY: chuột không mặc / phân rã được, phân rã đồ trùng bị giấu | gacha.js, style.css |
| `menus-07` | vừa | review | Hai chỗ cùng tên APPEARANCE, muốn đổi mũ / ăn mừng không biết vào đâu | gacha.js, menu.js, style.css, i18n |
| `menus-03` | vừa | review | Số "7" trên nút cúp biến mất khi vào TROPHY ROOM, thưởng nằm sâu 4 bước | trophies.js, style.css |
| `menus-11` | nhẹ | review | TROPHY ROOM trống với người mới, không chữ nào nói cách lấp đầy | trophies.js, style.css, i18n |
| `match-01` | nặng | review | Thắng trận GOAT PATH: REWARDS hiện +NaN và gold / XP trong save bị xoá | profile.js |
| `user-03` | vừa | owner | Giờ chọn Core chỉ là chữ "15s" nhỏ xíu | draft.js, style.css, net.config.js |
| `match-03` | nặng | review | Chuột trỏ lá này, phím chọn lá kia: 2 lá cùng nổi, Enter lấy lá không trỏ | matchui.js, style.css |
| `match-04` | nặng | review | Bấm Space / A cho qua ăn mừng là tự lấy luôn lá Core 1, chưa kịp nhìn | draft.js, matchui.js, cores.config.js |
| `match-02` | nặng | review | FORFEIT trong Pause bấm 1 phát là mất cả run, không hỏi lại | matchui.js, style.css |
| `match-07` | vừa | review | Ultimate đầy mà bấm không ra, không có phản hồi gì | hud.js, main.js, online.js, audio.js, style.css, SFX.md |
| `match-09` | vừa | review | Màn kết quả Skill game trông như trận 0 - 0, mất kết quả thật | endscreen.js, hud.js, style.css |
| `match-05` | vừa | review | LEGEND TRIAL bắt làm kỹ thuật nhưng không chỗ nào ghi phím | hud.js, main.js, style.css |
| `match-08` | vừa | review | Luật sân, LEGEND, BADGE chỉ lướt qua 1 lần, Pause không cho xem lại | matchui.js, runmap.js, style.css |
| `match-10` | nhẹ | review | Banner GOAL! đè lên người ghi bàn đúng lúc máy quay zoom vào | hud.js, matchui.js |
| `match-11` | nhẹ | review | Gợi ý bỏ qua ở màn VS gần như vô hình, sau trận thì không có | intro.js, endscreen.js, style.css |
| `user-06` | nặng | owner | Tab GOAT PATH: 3 thẻ ACT trông như phải chọn 1 trong 3 | runmap.js, style.css |
| `run-12` | nặng | review | BUILD YOUR SQUAD không nói phải làm gì, nút START RUN ẩn | runmap.js, style.css, i18n |
| `user-02` | nặng | owner | Map GOAT PATH: node đang chọn gần như không khác node khác | runmap.js, style.css |
| `run-02` | nặng | review | Map không cuộn được bằng phím / tay cầm, nhìn không biết là còn phía trên | runmap.js, style.css |
| `run-07` | vừa | review | Cut-scene: chuột không bỏ qua được, gợi ý bỏ qua gần như vô hình, hình ⊘ trông như nút | story.js, style.css |
| `run-09` | vừa | review | Dải đội hình là nút ẩn; đọc BADGE / GEAR chỉ được bằng rê chuột | runmap.js, helpers.js, style.css |
| `run-11` | nhẹ | review | RUN OVER: phần mang về chỉ là icon + số, ★ +45 không ai hiểu | runmap.js, style.css, i18n |
| `user-04` | nhẹ | owner | Ông chú KIT VAN nhìn như đứng trên cửa sổ xe | kitvan.js |
| `run-01` | nặng | review | Esc / Backspace lặng lẽ bỏ phần thưởng và rời phòng | runmap.js |
| `run-04` | vừa | review | KIT VAN: không biết món nào đủ tiền, cũng không biết món dùng cho cả đội hay 1 người | kitvan.js, runmap.js, style.css |
| `run-03` | vừa | review | Chuột và phím chọn 2 thẻ khác nhau, Enter lấy thẻ không phải thẻ đang trỏ | runmap.js, style.css |
| `run-08` | vừa | review | Mũi tên trong các thẻ che map đi tuần tự, không theo vị trí trên màn hình | runmap.js |
| `run-10` | nhẹ | review | Dòng báo đè lên nút BACK và bảng chú thích; LOCKER ROOM cắt tên người và nhãn thẻ; thẻ mờ không nói lý do | runmap.js, style.css |
| `run-05` | vừa | review | LOCKER ROOM: thẻ UPGRADE không nói nâng cấp được gì | run.config.js, fields.js, runmap.js, style.css, i18n |
| `run-06` | vừa | review | Sự kiện ???: gợi ý khó hiểu, chọn sẵn lựa chọn không dùng được, kết quả chỉ là 1 dòng nhỏ | runmap.js, style.css |
