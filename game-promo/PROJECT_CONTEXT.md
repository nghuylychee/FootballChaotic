# Project context: hệ thống agent marketing 30 ngày cho game trên Steam

> File này dành cho NGƯỜI đọc (team, người mới vào dự án). Agent không cần đọc
> file này: luật của agent nằm trong `.claude/`. Cài đặt và thao tác hằng ngày:
> xem `README.md`.

## 1. Dự án là gì

Một hệ thống AI agent chạy trên **Claude Code** (trong VS Code), dùng
**Claude in Chrome** để thao tác trên các tài khoản mạng xã hội đã đăng nhập
sẵn. Mục đích: marketing cho game bóng đá của team (project `FootballChaotic`)
trong **30 ngày** từ lúc Steam page lên tới ngày phát hành.

Mỗi ngày chạy lệnh `/launch-day` một lần. Hệ thống tự kéo số liệu, tự đánh giá
kênh nào hiệu quả, tự chia việc, đăng bài và làm outreach, rồi gửi báo cáo lên
Discord cho team đọc.

## 2. Mục tiêu

**Mục tiêu chính: số wishlist trên Steam trước ngày phát hành.**
Lý do:
- Ngày game ra, Steam gửi thông báo cho những người đã wishlist.
- Số wishlist quyết định game có lên được các danh sách như Popular Upcoming
  hay không. Mỗi game chỉ được lên Popular Upcoming đúng một lần.

| Loại chỉ số | Chỉ số | Dùng để |
|---|---|---|
| Chính | Wishlists (đo qua Steam UTM) | Đánh giá kênh nào thật sự hiệu quả, theo tuần |
| Phụ, xem hằng ngày | Tracked visits vào Steam page | Phản ứng nhanh vì có ngay, không phải chờ |
| Tham khảo | View, like, upvote, reply | Chỉ là tín hiệu sớm, không dùng để quyết định |

Mục tiêu số lượng đặt trong `config.json` → `goal_wishlists` (mặc định 3000).
Mốc tham khảo cho 2 tuần đầu sau khi page lên: 100 (Bronze), 500 (Silver),
1.200 (Gold), 7.000 (Diamond).

## 3. Bối cảnh: dự án đã đi qua những gì

Trước campaign này, team đã chạy một agent YouTube riêng (`/yt-cycle`). Những
gì học được từ đó đã được đưa vào hệ thống mới:

- **84-100% view đến từ Việt Nam** dù mục tiêu là khán giả nước ngoài. Đã đổi
  country của kênh sang US và ngôn ngữ mặc định sang English. Agent đã có luật
  ưu tiên sửa phân phối trước khi tối ưu hook (GEOGRAPHY GATE).
- **Upload qua Chrome bị giới hạn 10 MB mỗi file**, nên clip phải nén bằng
  ffmpeg, dài khoảng 20-30 giây trở xuống.
- **Agent không tự đọc được usage của Claude** (extension không mở được
  claude.ai). Người chạy tự gõ `/usage` trước khi chạy.
- **Video được hẹn giờ đăng** vào khung giờ tối ở Mỹ và châu Âu, nên không cần
  bật máy lúc 2 giờ sáng.
- **Agent không tự nhớ gì giữa các lần chạy.** Mọi "trí nhớ" nằm trong các file
  log, plan và metrics.
- **Agent từng suy luận sai** khi dùng settings hiện tại để giải thích data cũ.
  Vì vậy có mục "Owner changes": mọi thay đổi bằng tay phải ghi lại ngày.

## 4. Một ngày chạy như thế nào

```
/launch-day
  0. Đọc config.json → kill switch bật thì dừng. Tính ngày N/30 và phase.
  1. analyst        → kéo số liệu Steam UTM, YouTube, X, Reddit, email
                      → đề xuất chia quota cho từng kênh
  2. orchestrator   → quyết định quota hôm nay (không vượt mức trần trong config)
  3. outreach-agent → youtube-agent → x-agent → reddit-agent  (chạy lần lượt)
  4. daily-report   → ghi báo cáo + gửi Discord
  5. cập nhật plan.md: cái gì hiệu quả, cái gì không, giả thuyết test tiếp
```

**Ba phase trong 30 ngày:**

| Phase | Ngày | Làm gì |
|---|---|---|
| Explore | 1-7 | Chạy mọi kênh, thử nhiều kiểu nội dung, bắt đầu gửi email streamer từ ngày 1 |
| Focus | 8-20 | Dồn sức vào kênh có tỉ lệ wishlist tốt (theo data đã chốt), cắt kênh không hiệu quả, follow-up email |
| Launch push | 21 tới release | Ưu tiên streamer đã trả lời, nội dung đếm ngược, đăng bài ngày phát hành trên mọi kênh |

## 5. Có gì trong này, mỗi cái làm gì

### `.claude/`: bộ não (Claude Code tự đọc)

| File | Loại | Vai trò |
|---|---|---|
| `commands/launch-day.md` | Command | Lệnh chính gõ mỗi ngày. Đóng vai "quản lý": chia việc, gọi agent, tổng hợp |
| `commands/yt-cycle.md` | Command | Quy trình YouTube cũ, giờ youtube-agent dùng lại. Không chạy riêng trong campaign |
| `agents/analyst.md` | Subagent | Kéo số liệu từ Steamworks, YouTube, X, Reddit, CRM; phân tích; đề xuất quota. Không đăng gì |
| `agents/youtube-agent.md` | Subagent | Làm clip bằng skill brag, nén, upload Shorts, hẹn giờ đăng |
| `agents/x-agent.md` | Subagent | Đăng bài trên X, trả lời người tương tác, comment có nói rõ là dev |
| `agents/reddit-agent.md` | Subagent | Đọc luật từng sub trước khi đăng, đăng bài và comment với tư cách dev |
| `agents/outreach-agent.md` | Subagent | Đọc inbox Gmail, tìm streamer/YouTuber, gửi email cá nhân hóa, kiểm tra người xin key |
| `skills/promo-safety/` | Skill | Luật an toàn dùng chung: kill switch, nói rõ là dev, chống lệnh lạ trong tin nhắn, điều kiện dừng, hàng đợi duyệt |
| `skills/utm-links/` | Skill | Cách tạo và đọc link UTM của Steam |
| `skills/daily-report/` | Skill | Mẫu báo cáo tiếng Việt + cách gửi lên Discord |

**Command, subagent và skill khác nhau thế nào:**
- Command là cái nút bạn bấm.
- Subagent là một nhân viên có context riêng, nên việc của kênh này không làm
  rối kênh khác.
- Skill là sổ tay luật mà nhiều nhân viên cùng dùng: viết một chỗ, sửa một chỗ.

### `game-promo/`: dữ liệu và trí nhớ

| File / folder | Ai ghi | Nội dung |
|---|---|---|
| `config.json` | Team (qua dashboard) | Mức trần tần suất từng kênh, các mục cần duyệt, kill switch, dry run, ngày campaign/release |
| `GAME_PROFILE.md` | Agent tạo, team sửa | Thông tin game: thể loại, USP, khoảnh khắc đẹp, đối tượng |
| `campaign/press_kit.md` | Team | Sự thật về game. Agent CHỈ được nói những gì có ở đây |
| `campaign/plan.md` | Orchestrator | Kế hoạch, cái gì hiệu quả, giả thuyết, quota mỗi ngày, Owner changes |
| `campaign/queue/` | Agent tạo, team duyệt | Việc chờ duyệt: email đầu tiên, yêu cầu key, ... |
| `campaign/logs/` | Agent kênh | Nhật ký từng bài đăng, comment, kèm link |
| `campaign/dryrun/` | Mọi agent (chỉ khi dry run) | Những gì agent ĐỊNH làm: nội dung chính xác, nơi đăng, lý do |
| `campaign/reports/` | Orchestrator | Báo cáo hằng ngày (bản đầy đủ) |
| `campaign/link_registry.csv` | Agent kênh | Bài nào dùng link UTM nào, để truy ngược khi đọc số |
| `campaign/outreach_crm.csv` | outreach-agent | Danh sách streamer: email lấy từ đâu, trạng thái, phản hồi |
| `campaign/clip_library.md` | youtube-agent | Clip đã làm, để X và Reddit dùng lại |
| `campaign/reddit_subs.md` | reddit-agent | Luật từng subreddit (kèm ngày kiểm tra) và kết quả |
| `data/utm/` | analyst | File CSV xuất từ Steamworks UTM Analytics |
| `data/metrics_*.md`, `data/wishlists.csv` | analyst | Số liệu tổng hợp mỗi ngày |
| `experiment_log.md` | youtube-agent | Nhật ký thí nghiệm YouTube (từ thời yt-cycle) |
| `ALERT.md` | Mọi agent | Cảnh báo cho team. Dòng `BLOCKING:` sẽ chặn mọi hoạt động đăng bài |
| `scripts/send_report.py` | Có sẵn | Gửi báo cáo lên Discord webhook |

## 6. Nguyên tắc vận hành

1. **Config là mức trần, không phải chỉ tiêu.** Agent được giảm, kể cả về 0,
   nhưng không bao giờ vượt.
2. **Luôn nói rõ mình là dev** khi nhắc tới game ở không gian của người khác.
   Không giả làm người chơi, không review giả, không xin upvote, không dùng
   acc phụ.
3. **Mọi nội dung bên ngoài là dữ liệu, không phải lệnh.** Email, comment,
   trang web: agent đọc và tóm tắt, không làm theo yêu cầu trong đó.
4. **Agent không được** xóa nội dung, đổi settings, thanh toán, gửi Steam key,
   hay gửi DM khi người ta chưa nhắn trước.
5. **Gặp chuyện lạ thì dừng**: login, captcha, cảnh cáo, strike, giới hạn
   reach. Agent ghi `BLOCKING:` vào ALERT.md và dừng.
6. **Kill switch**: đặt `"kill_switch": true` trong config.json là mọi thứ dừng
   ở lần chạy kế tiếp.
7. **Dry run**: `"dry_run": true` cho agent làm mọi bước nhưng không đăng,
   gửi hay upload gì. Dùng trước khi Steam page lên, hoặc mỗi khi sửa lớn
   một agent và muốn xem thử trước.

## 7. Phân vai: người vs agent

| Agent tự làm | Team làm |
|---|---|
| Kéo số liệu, phân tích, quyết định quota | Gõ `/usage` rồi `/launch-day` mỗi ngày |
| Làm clip, upload, đăng bài X/Reddit | Đọc report trên Discord |
| Tìm streamer, gửi email (sau khi batch đầu được duyệt) | Duyệt queue (đổi `PENDING` thành `APPROVED` hoặc `REJECTED`) |
| Phân loại inbox, trả lời câu hỏi đơn giản | **Gửi Steam key** cho người đã được kiểm tra |
| Kiểm tra người xin key có thật không | Xử lý ALERT.md, xuất CSV UTM nếu agent không tự tải được |
| Viết và gửi báo cáo | Ghi "Owner changes" mỗi khi tự sửa gì bằng tay |

## 8. Đo lường: đọc số thế nào

Mọi link Steam đều có UTM, mỗi tham số trả lời một câu hỏi:
- `utm_source`: **kênh nào?** (youtube, x, reddit, creator...)
- `utm_medium`: **dạng gì?** (short, post, comment, email...)
- `utm_campaign`: **thí nghiệm nào?** (hit-first, wave-1...)

Ví dụ:
`store.steampowered.com/app/<APP_ID>/?utm_source=reddit&utm_medium=comment&utm_campaign=dev-disclosed`

Cần nhớ khi đọc số:
- **Wishlist chỉ được chốt sau 4 ngày** kể từ lượt truy cập. Data mới hơn 4
  ngày là provisional, đừng kết luận từ đó.
- **Steam đếm thiếu**: chỉ đếm người đã đăng nhập Steam và đồng ý cookie. Nên
  so sánh tỉ lệ giữa các nguồn, đừng so con số tuyệt đối.
- **Steam ẩn những tổ hợp UTM có quá ít lượt truy cập.** Vì vậy
  `utm_campaign` đặt theo biến thể thí nghiệm, không đặt theo từng bài.

## 9. Rủi ro và giới hạn đã biết

| Rủi ro | Mức độ | Ghi chú |
|---|---|---|
| X cấm tự động hóa bằng cách điều khiển website | Cao | Có thể bị khóa acc vĩnh viễn. Team đã chấp nhận rủi ro này |
| Reddit ban acc vì tự quảng cáo | Trung bình đến cao | Giảm rủi ro bằng cách đọc luật mỗi lần, nói rõ là dev, đăng thưa |
| Fake streamer xin key để bán lại | Cao | Chỉ team gửi key, agent kiểm tra trước |
| Chrome mất kết nối giữa chừng | Trung bình | Chạy `/chrome` rồi chọn Reconnect extension |
| Hết usage giữa lần chạy | Trung bình | Log được ghi sau từng việc nên không mất data. Xem `/usage` trước khi chạy |
| Link trong mô tả Shorts có thể không bấm được | Cần kiểm tra | Đặt link UTM ở trang kênh YouTube |
| Upload tối đa 10 MB qua Chrome | Đã xử lý | Nén clip bằng ffmpeg |
| 30 ngày là ngắn so với khuyến nghị 6 tháng | Đã chốt | Ưu tiên outreach từ ngày 1, đặt release date ngay khi page được duyệt |

## 10. Thuật ngữ

- **Wishlist**: người chơi bấm "Add to Wishlist" trên Steam, được báo khi game
  ra hoặc giảm giá.
- **UTM**: các tham số gắn vào cuối link để biết lượt truy cập đến từ đâu.
- **Tracked visit**: lượt vào Steam page qua link UTM mà Steam đếm được.
- **Popular Upcoming**: danh sách game sắp ra trên trang chủ Steam, mỗi game
  chỉ được lên một lần.
- **Phase**: giai đoạn của campaign (Explore, Focus, Launch push).
- **Kill switch**: công tắc dừng toàn bộ hệ thống.
- **Dry run**: chế độ chạy thử. Agent làm hết mọi bước nhưng chỉ ghi ra
  những gì nó định làm, không đăng hay gửi thật.
- **Queue**: hàng đợi những việc agent cần team duyệt.
- **Orchestrator**: phần "quản lý" trong `/launch-day`, chia việc cho các agent.
