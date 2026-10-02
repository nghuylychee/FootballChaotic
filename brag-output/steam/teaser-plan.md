# Steam slot #2: TEASER HYPE "ROAD TO THE WORLD STAGE" (bản nháp, chờ duyệt)

## Vai trò của slot #2
- Slot #1 (bản đã xong) **giải thích** game: tự phát không tiếng, HUD bật, chữ hướng dẫn.
- Slot #2 được xem khi người dùng **chủ động bấm** vào thumbnail thứ hai. Lúc này họ đã biết đây là game gì, nên video được phép **dựng theo nhạc và gây hype**. Steam xếp loại này vào mục *Teaser*. Nội dung story hoặc cinematic hợp với trailer thứ hai hơn trailer đầu ([GameWorldObserver](https://gameworldobserver.com/2023/05/03/steam-two-trailers-before-screenshots-categories), [wnhub](https://wnhub.io/news/analytics/item-237)).
- Vẫn giữ luật: 2 giây đầu phải có hành động, mọi hình đều quay từ game thật, kết bằng Wishlist.

## Khác gì so với #1 (để 2 video không trùng nhau)
| | #1 Gameplay | #2 Teaser |
|---|---|---|
| Mục đích | Hiểu game | Muốn chơi |
| Dài | 63s | **~36s** |
| HUD | Bật, ghim lại | **Tắt**, sạch hình |
| Khung | 16:9 full | **Letterbox điện ảnh** (2 dải đen trên dưới) |
| Chữ | Góc trái, giải thích | **Giữa màn, to, 1–3 chữ mỗi nhịp** |
| Dựng | Theo tính năng | **Cắt đúng phách nhạc** (160 BPM, cùng key với #1) |
| Câu chuyện | Danh sách tính năng | **Một hành trình leo hạng**: từ sân làng tới World Stage |
| Kỹ thuật riêng | — | Slow-mo, freeze frame, cắt nhạc đột ngột (stop-time) |

## Mạch truyện
Từ một sân đất ở làng, bạn đá lên qua từng Area. Mỗi sân lớn hơn, mỗi đòn mạnh hơn, rồi tới boss, rồi tới sân vận động World Stage. Chữ trên màn chỉ là các nhịp ngắn, không giải thích.

## Storyboard (1920×1080 @30fps, letterbox, ~36s; 1 ô nhịp = 1.5s)

| # | Thời gian | Nhịp | Hình (game thật) | Chữ | Tiếng |
|---|---|---|---|---|---|
| 1 | 0.0–1.5 | **Cold open** | Village Green lúc hoàng hôn, chuyền bóng nhẹ, gà chạy ngoài sân | `AREA 1 · VILLAGE GREEN` (nhỏ, góc dưới) | Piano/keys êm, tiếng khán giả xa |
| 2 | 1.5–2.6 | **CRACK** | Dropkick bất ngờ, **freeze frame** 0.3s ngay lúc trúng đòn | — | **Nhạc tắt** → CRACK |
| 3 | 2.6–4.1 | **Title slam** | Nạn nhân bay vào tường (slow-mo), logo đập vào | `STREET FOOTBALL CHAOS` | Drop chiptune |
| 4 | 4.1–16.1 | **Leo hạng** (8 ô nhịp) | Mỗi ô nhịp = 1 Area, đòn mạnh dần: Back Alley (đấm) → Schoolyard (dropkick) → Rooftop (Fireball) → Night Market (Bomb Ball) → Harbor (Black Hole) → Underground Cage (Titan) → City Plaza (Meteor Drop) → Cyber Arena (Lightning Dash). 2 cú cắt mỗi ô nhịp, đúng phách | Tên Area nhỏ góc dưới. Giữa màn hiện 3 nhịp chữ: `ONE BALL.` · `FOUR PLAYERS.` · `ZERO RULES.` | Groove + riser dài dần |
| 5 | 16.1–17.6 | **Break** | Cắt đen 0.3s → màn VS **PROMOTION MATCH** vs boss đập vào | `THEN THE BOSSES SHOW UP.` | **Im lặng** → 1 cú boom |
| 6 | 17.6–26.6 | **Barrage Ultimate** (6 ô nhịp, gấp đôi tốc độ) | Banner cut-in của 8 Ultimate liên tiếp, mỗi cái nửa ô nhịp, xen kết quả nổ / bay người / ghi bàn | — (banner của game tự nói tên) | Full groove, mỗi cut-in 1 stinger |
| 7 | 26.6–32.6 | **World Stage climax** | Sân vận động World Stage, FINAL PUSH, còn vài giây: Clone Army → cú sút **slow-mo** → GOAL x2, pháo hoa khán đài | `FINAL PUSH.` → (im) → `GOAL x2.` | Half-time + heartbeat → nhạc vỡ òa đúng lúc bóng vào lưới |
| 8 | 32.6–36.5 | **End** | Logo trên nền cảnh ăn mừng mờ | `WISHLIST NOW` + 1 dòng: `10 AREAS · 54 CORES · 8 ULTIMATES · NO REFS` | Hit cuối, ngân dài |

## Cần quay thêm (đều là game thật, chạy headless như #1)
- **Bản HUD tắt** cho mọi cảnh. Cảnh cũ có HUD nên phải quay lại (dùng chung director `steam_scenes.js`, thêm cờ ẩn HUD).
- Village Green yên bình, có gà (prop sẵn của sân).
- Một đòn "đặc trưng" cho mỗi Area trong 8 Area, mỗi đòn ở đúng sân của Area đó.
- Pháo hoa ở World Stage khi ghi bàn (config khán giả của sân này có `fireworks`).
- Slow-mo: render lại khung hình với `rate < 1`. Pipeline đã hỗ trợ, nhưng hình sẽ lặp frame. Nếu cần mượt thì quay riêng ở 60fps rồi phát chậm lại.

## Thumbnail
Khác hẳn #1 để hai ô trên Steam không giống nhau: dùng **màn VS boss** hoặc **banner cut-in Ultimate** làm frame đại diện.

## Câu hỏi cần bạn chốt
1. **Có lộ các Area cuối (Cyber Arena, World Stage) và boss không?** Trong game các Area chưa mở là `???`. Teaser cần cao trào ở World Stage để có hype. Nếu muốn giữ bí ẩn, cảnh 7 sẽ chuyển sang Night Market và cảnh 4 dừng ở Area 5.
2. **Độ dài**: ~36s (đề xuất) hay đẩy lên ~45s để Ultimate barrage thong thả hơn?
3. **Câu chữ**: `ONE BALL. FOUR PLAYERS. ZERO RULES.` và `THEN THE BOSSES SHOW UP.` có ổn không, hay bạn muốn giọng khác (ví dụ deadpan / meme)?
