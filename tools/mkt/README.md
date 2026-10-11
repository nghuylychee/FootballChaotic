# tools/mkt — bộ tool marketing wishlist

Hiện thực các tool ở mục 10 của kế hoạch marketing (Claude Doc "Kế hoạch Marketing Wishlist"). Node ≥ 22, **không có thư viện ngoài**; mọi API gọi qua `fetch`. Dữ liệu cục bộ nằm ở `tools/mkt/data/` (JSON Lines, mở bằng tay được), file sinh ra ở `tools/mkt/out/`; cả hai không commit. Credentials ở `tools/mkt/.env` (chép từ `.env.example`).

```
cd tools/mkt
npm test                      # 23 test, không cần mạng (mock API)
cp .env.example .env          # điền key cho tool định dùng
```

| # (theo kế hoạch) | Tool | Lệnh | Cần gì | Trạng thái |
|---|---|---|---|---|
| 1 | Link router + UTM | `node links/make.js`, `node links/serve.js`, Worker `links/worker.js` | Cloudflare (miễn phí) + domain ngắn | Chạy được, có test |
| 2 | Biến thể ngôn ngữ cho clip | `brag-output/hook-test/work/captions.py` + `edl_zzz_lang.py` | Pipeline clip sẵn có (Playwright) | Chạy được, đã render thử pt-BR / ja |
| 3 | Scheduler đa nền tảng | `node publish/add.js`, `node publish/run.js` | Google OAuth cho YouTube; TikTok / IG API tùy chọn | YouTube đầy đủ (mock test); TikTok / IG viết theo tài liệu, **chưa test thật** |
| 4 | Kéo số liệu | `node analytics/youtube-pull.js`, `node analytics/steam-import.js` | Google OAuth; CSV xuất từ Steamworks | Chạy được; cột CSV Steam đoán theo tiêu đề, kiểm tra lần nhập đầu |
| 5 | Đào comment | `node analytics/comments.js` | API key hoặc OAuth (trả lời cần OAuth) | Chạy được, phân loại 6 ngôn ngữ, có test |
| 6 | Tìm streamer | `node streamers/find.js`, `node streamers/export.js` | Twitch app (miễn phí), YouTube API key; Kick tùy chọn | Chạy được (mock test); Kick **chưa test** |
| 7 | Mailer outreach | `node outreach/mail.js` | Resend / Gmail OAuth / SMTP; key Steam trong `data/keys.txt` | Chạy được (dry-run ra .eml), có test |
| 8 | Fact sheet + press kit + copy | `node presskit/build.js` | Không | Chạy được; `facts.json` là nguồn duy nhất |
| 9 | Replay buffer trong game | — | Code game (`src/`) | **Chưa làm** (là tính năng game, để tách PR riêng) |
| 10 | Dashboard | `node dashboard/build.js` | Dữ liệu từ 4 / 5 / 6 / 7 | Chạy được, có test |

## Thứ tự dựng credentials (30 phút)

1. **Cloudflare**: `cd tools/mkt/links && npx wrangler login && npx wrangler deploy`, điền `STEAM_URL` / `FALLBACK_URL` trong `wrangler.toml`, gắn domain ngắn ở dashboard. Điền `LINK_DOMAIN` vào `.env`. Chưa có domain thì mọi tool in URL đầy đủ có UTM, vẫn dùng được.
2. **Twitch**: dev.twitch.tv/console → Register Application → Client ID + Secret vào `.env`.
3. **Google Cloud**: project mới → bật YouTube Data API v3, YouTube Analytics API, Gmail API → OAuth consent (External, thêm email team vào test users) → Credentials: OAuth client "Desktop app" (vào `GOOGLE_CLIENT_ID/SECRET`) + API key (`YOUTUBE_API_KEY`). Rồi `node lib/google.js` một lần, đăng nhập bằng tài khoản sở hữu kênh YouTube.
4. **Mail**: Resend (xác minh domain, `RESEND_API_KEY`, `MAIL_VIA=resend`) hoặc Gmail (`MAIL_VIA=gmail`, dùng OAuth ở bước 3). Để `MAIL_VIA=dryrun` cho tới khi template được duyệt.
5. **Steam**: khi page live, điền `STEAM_URL` vào `.env` và `wrangler.toml`, chạy lại `node presskit/build.js`.

## 1 · Link UTM (`links/`)

Quy ước (mục 12 kế hoạch): `utm_source` = nền tảng (yt, tt, ig, kwai, x, reddit, discord, itch, crazygames, web, twitch, kick, mail, press), `utm_medium` = ngôn ngữ kênh (en, ptbr, ptpt, es, ja, hi, zh), `utm_campaign` = giai đoạn (prelaunch → pagelive → playtest1 → launch), `utm_content` = ID clip / streamer / vị trí nút, `utm_term` = tuần ISO lúc bấm (router tự điền).

Mã link ngắn `<source>-<medium>[-<content>]` tự dựng UTM, **không cần sửa gì khi có clip mới**: `sfc.gg/yt-ptbr-R12`, `sfc.gg/tt-ja`, `sfc.gg/mail-es-airton`. Bí danh đặt tay trong `links/links.json` (`/play`, `/press`, `/discord`...). `?c=playtest1` ghi đè campaign.

```
node links/make.js --source yt --medium ptbr R12 R13 G1_B3     # bảng link để dán
node links/serve.js --print yt-ptbr-R12                        # xem URL đích
node links/serve.js                                            # server thử http://127.0.0.1:8787/yt-ptbr-R12
node links/make.js --alias discord --to https://discord.gg/xxx --no-utm   # rồi npx wrangler deploy
```

Worker đếm lượt bấm vào KV nếu bật binding `CLICKS` (`/_stats?token=...`). Steam chỉ ghi nhận UTM khi người dùng đã đăng nhập, nên số UTM dùng để **so sánh kênh**, không dùng làm tổng.

## 2 · Biến thể ngôn ngữ cho clip (`brag-output/hook-test/work/`)

Caption nằm trong `edl.json` và được vẽ bằng Chrome khi render, nên đổi ngôn ngữ = dịch chuỗi rồi render lại phần có chữ (hook 0–4 s của từng clip + BODY dùng chung một lần mỗi ngôn ngữ).

```
cd brag-output/hook-test/work
python captions.py export R12 G1 BODY B2 ...   # captions/todo.csv: cột key, en, pt-BR, es, ja, zh-CN (giữ <br> và emoji)
# dịch trong Google Sheets (người bản xứ), xuất CSV
python captions.py import captions/todo.csv    # -> captions/<lang>.json
python edl.py                                  # tạo <ID>__<lang> cho mọi clip đã đủ bản dịch (in "lang variants: ...")
python build.py BODY__pt-BR R12__pt-BR G1__pt-BR  # render + mix + encode như clip thường -> ../out/R12__pt-BR.mp4
python captions.py copy                        # ../share-copy.<lang>.txt: title đã dịch cho publish/add.js
```

Đã có bản dịch khởi điểm pt-BR / es / ja cho 33 caption (12 clip gốc → 24 clip kể cả combo mỗi ngôn ngữ) trong `captions/*.json`, do AI viết, **cần người bản xứ duyệt**. `_meta.size` thu nhỏ chữ (0.9) vì câu Bồ / Tây Ban Nha dài hơn; `@R12` trong file dịch cho phép dịch riêng một clip. `comp.html` đã thêm Noto Sans JP / SC cho caption và DotGothic16 (font pixel Nhật của game) cho end card. Caption "53 superpowers" của BODY gốc đã cũ (game có 54 Core): bản dịch ghi 54, bản EN nên sửa trong `edl.py` và render lại BODY.

## 3 · Đăng clip (`publish/`)

`publish/channels.json` khai kênh: nền tảng, ngôn ngữ, **múi giờ thị trường**, giờ vàng, trần clip/ngày, `manual: true` nếu chưa có API.

```
node publish/add.js --clip R12 --channel yt-en,tt-br          # slot trống kế tiếp theo giờ địa phương của từng kênh
node publish/add.js --clip R12__pt-BR --channel tt-br --at "2026-11-03 19:00"
node publish/add.js --batch out/batch.csv                     # cột clip, channel, title?, at?
node publish/add.js                                           # xem hàng đợi
node publish/run.js --dry                                     # việc sẽ làm
node publish/run.js --loop                                    # chạy nền mỗi 60 s
```

- Title mặc định lấy từ `share-copy.txt` (hoặc `share-copy.<lang>.txt` cho biến thể); description, hashtag, pinned comment lấy từ `presskit/facts.json` với link UTM đúng kênh.
- **YouTube**: upload sớm 24 h với hẹn giờ (YouTube tự công khai đúng phút), đặt thumbnail = poster frame 0, sau khi công khai tự đăng comment đầu (ghim tay trong Studio; API không ghim được). Quota 10.000 đơn vị/ngày ≈ 6 upload/ngày/project; cần nhiều hơn thì xin tăng quota hoặc thêm project.
- **TikTok / Instagram / X / Kwai**: kênh `manual: true` → tool ghi **thẻ đăng tay** `out/manual/<id>.md` (file, title, caption, hashtag, comment đầu) đúng 5 phút trước giờ đăng; đăng xong `node publish/run.js --done <id> --url <link>`. Có token TikTok (app được duyệt) hoặc IG Business thì bỏ `manual` để đăng tự động (code theo tài liệu, chưa chạy thật).

## 4 · 5 · Số liệu và comment (`analytics/`)

```
node analytics/youtube-pull.js             # views, % xem, like, share, sub+ từng video -> data/yt-metrics.jsonl (mỗi ngày một dòng)
node analytics/comments.js                 # gắn nhãn comment: hỏi tên game / xin link (en, pt, es, ja, hi, zh), tiêu cực, đã chơi
node analytics/comments.js --reply --yes   # trả lời comment hỏi game bằng link đúng ngôn ngữ (tối đa 30/lần)
node analytics/steam-import.js data/steam/*.csv   # CSV Steamworks: wishlist theo ngày, theo quốc gia, UTM
```

Chỉ số quyết định của vòng test hook là **"hỏi tên game / 1.000 view"**, bảng in ra sau mỗi lần `comments.js`. "Viewed vs swiped away" của Shorts không có trong API, xem trong YouTube Studio.

## 6 · 7 · Streamer và outreach (`streamers/`, `outreach/`)

```
node streamers/find.js --twitch --lang pt,es --games "Rematch,Rocket League,EA SPORTS FC 26" --pages 3   # chạy mỗi giờ vài ngày (cron)
node streamers/find.js --youtube --lang pt --days 60 --max-searches 20      # 100 đơn vị quota mỗi search
node streamers/find.js --youtube --seed data/seed-youtube.txt --lang pt     # danh sách URL / @handle có sẵn
node streamers/export.js --tier S,A --lang pt --only-contact                # -> out/streamers-<ngày>.csv
```

Chấm điểm (`streamers/score.js`): ưu tiên kênh 5k–50k sub hoặc 10–200 người xem, hoạt động 14 ngày gần nhất, có email, chơi game bóng đá. Team mở CSV, **điền cột `personal_line`** (một câu thật về video của họ) rồi:

```
node outreach/mail.js draft --from-csv out/streamers-2026-10-20.csv --wave 1 --limit 60   # chỉ nhận dòng có personal_line
node outreach/mail.js send --wave 1          # MAIL_VIA=dryrun -> chỉ ghi .eml để xem; trần MAIL_DAILY_CAP mail/ngày
node outreach/mail.js followup --days 4 --news "A data de lançamento é 29/1."
node outreach/mail.js mark joao@mail.com replied
node outreach/mail.js sync-gmail             # tự đánh dấu replied theo hộp thư Gmail
node outreach/mail.js status
```

Template 4 ngôn ngữ ở `outreach/templates/` (subject + body + follow-up, 100–150 từ, key trong mail, link chơi web trước link Steam). Key Steam dán vào `data/keys.txt` (mỗi dòng một key), tool phát tuần tự và ghi `data/keys-used.jsonl`. Không gửi 2 lần cho một email, không follow-up quá 1 lần.

## 8 · Fact sheet, press kit, copy (`presskit/`)

`presskit/facts.json` là **nguồn duy nhất** của mọi con số và câu chữ (3v3, 54 Core, 8 Ultimate, 10 Area, 30 đội...). `node presskit/build.js` kiểm tra đủ 5 ngôn ngữ, không còn "2v2" / "53 Cores", rồi sinh:

- `out/presskit/` — trang press kit EN / pt-BR / es / ja / zh-CN, `streaming-policy.html` (cho phép stream + kiếm tiền, EN/JA/PT/ES/中文), ảnh từ `tools/itch-page/out`. Đưa thư mục này lên GitHub Pages cạnh bản web là có `/presskit/`.
- `out/copy/steam-store.<lang>.md` — mô tả ngắn (≤ 300 ký tự) + mô tả dài BBCode + 20 tag.
- `out/copy/social.<lang>.md` — bio kênh, pinned comment, description, hashtag, câu trả lời "what game?" với link UTM đúng kênh.
- `out/copy/fact-sheet.md`.

Bản dịch trong `facts.json` do AI viết, cần người bản xứ duyệt trước khi lên Steam.

## 10 · Dashboard

`node dashboard/build.js` → `out/dashboard.html`: wishlist/ngày và theo quốc gia (CSV Steam), wishlist theo UTM, top clip theo view và "hỏi game / 1k", lịch sắp đăng, outreach theo đợt, streamer tier S/A chưa liên hệ. Cron mỗi sáng:

```
node analytics/youtube-pull.js && node analytics/comments.js && node dashboard/build.js
```

## Cấu trúc

```
lib/        env · paths · log · jsonl · csv · http (retry + mock) · utm · google (OAuth)
links/      resolve.js (lõi) · worker.js (Cloudflare) · serve.js · make.js · links.json · wrangler.toml
streamers/  twitch.js · youtube.js · kick.js · score.js · find.js · export.js
outreach/   mail.js · smtp.js · templates/{pt-BR,en,es,ja}.txt
presskit/   facts.json · build.js
publish/    channels.json · time.js · add.js · run.js · youtube.js · tiktok.js · instagram.js
analytics/  youtube-pull.js · comments.js · steam-import.js
dashboard/  build.js
test/       node --test (mock HTTP, thư mục data / out tạm)
```

Mọi tool đều có `--help` ở comment đầu file. Dữ liệu `data/*.jsonl` gộp theo khóa khi chạy lại, nên chạy nhiều lần không tạo trùng.
