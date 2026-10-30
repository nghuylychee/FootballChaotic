# Street Football Chaos: bản "THEY SAID" (phỏng vấn trước trận)

**Mục tiêu:** video hài ngắn cho Shorts / TikTok / Reels. Đối thủ nói một đằng trong phỏng vấn, cắt sang sân thì làm một nẻo. Người xem cười trước, rồi mới hiểu là game có luật trận riêng cho từng đội.
**Vì sao làm lại:** bản "diver" bị góp ý là cảnh đũa không rõ và chưa buồn cười. Nguyên nhân:
- Big Mama ở ngoài khung hình nên người xem không thấy ai gắp.
- Bốn gag cùng một kiểu, không leo thang.

Bản này sửa cả hai:
- Mỗi gag có người gây ra trong khung (chính người vừa trả lời phỏng vấn ra tay).
- Câu đùa nằm ở cú cắt.
- Leo thang từ ghế nhựa → bom chim → trọng tài → King Leo.

| Dave the Diver làm | Bản này làm bằng gì |
|---|---|
| Dàn nhân vật lập dị, mỗi người một câu khó quên | 4 người phỏng vấn, mỗi người một câu, đều là đối thủ thật trong game (UNCLE SAU, FEATHERS, VAR, GRANDPA) |
| Nhân vật chính khô khốc, chỉ phản ứng | THE KID chỉ có `...`, chớp mắt, giọt mồ hôi, câu duy nhất là "I just want to play football." |
| Giọng nói líu ríu theo chữ | Mỗi nhân vật một giọng blip riêng (chú trầm khàn, Feathers kêu cục cu, VAR nói xong huýt còi, ông nội run run) |
| Nhịp hài | Phỏng vấn là nhạc nền nhẹ, cắt sang sân thì trống dồn dập, ngắt đúng lúc BONK / SLIP / SMASH, thẻ vàng thì kèn xì hơi |

**Định dạng:** dọc 1080×1920, 30fps, **29.2s**. Gameplay là game thật quay headless (`work/said_scenes.js`). Chân dung phỏng vấn là sprite đứng của chính game (`drawAvatar`), phóng to ×36. Chữ trên màn hình bằng tiếng Anh.
**Phần chỉ có trong video** (không ghi vào repo):
- Giờ ra tay của luật trận được chỉnh để gag rơi đúng nhịp.
- Thẻ vàng hiện lâu hơn (3.2s).
- King Leo có giáp 99 để không bị tách.
- Câu nói tự động của đối thủ tắt.
- Vết thương trên người THE KID (bãi chim trên mũ, muội than, khói) vẽ thêm trong khung phỏng vấn.
- Tấm thẻ vàng phóng to lúc đứng hình.

## Storyboard (đã dựng)

| Thời gian | Nhịp | Hình | Chữ |
|---|---|---|---|
| 0.0–1.85 | Phỏng vấn 1 | UNCLE SAU, nền sân làng mờ | `"We play fair."` |
| 1.85–4.2 | Cắt | Bảng `0:00 · YOU 0-1 UNCLES`, chính UNCLE SAU nhặt ghế nhựa ném: BONK! | |
| 4.2–6.1 | Phỏng vấn 2 | FEATHERS (Pigeon Gang) | `"We respect the pitch."` |
| 6.1–9.3 | Cắt | Vòng ngắm báo bom rơi quanh bóng, bãi chim kín sân, THE KID đi tới bóng: SLIP! | |
| 9.3–11.4 | Phỏng vấn 3 | VAR (Retired Refs), nói xong huýt còi | `"The referee is always neutral."` |
| 11.4–15.0 | Cắt | VAR xoạc THE KID bay người: SMASH! (không còi). Cậu đứng dậy đẩy nhẹ: còi, FOUL!, đứng hình, thẻ vàng to | |
| 15.0–18.9 | THE KID | Bãi chim trên mũ. `...` trong im lặng có tiếng dế, mồ hôi chảy | `"I just want to play football."` |
| 18.9–21.0 | Phỏng vấn 4 | GRANDPA | `"Back in my day, football was simple."` |
| 21.0–24.6 | Cắt | Khung rộng: phim nháy 1976!, 2 Legends bị hút vào, FUSION! → King Leo chạy như tia chớp húc bay THE KID, ghi bàn | |
| 24.6–29.2 | THE KID | Mũ còn bốc khói, `...`, thanh tên đổi `just` → `still wants to play football`, logo | `STREET FOOTBALL CHAOS · every team plays by its own rules · PLAYTEST SOON · FOLLOW` |

## Dựng lại
```
npm run serve -- --port 8765            # ở thư mục gốc repo
cd brag-output/said/work
python cap.py portraits 1               # sprite phỏng vấn -> portraits/*.png
python cap.py village 4; python cap.py rooftop 6; python cap.py refs 5.5; python cap.py leo 7
python audio.py                         # game_sfx.wav + said_audio.wav (REGAME=1 để render lại tiếng game)
python render.py                        # render/*.png (comp.html + edl.json)
python render.py --stills 1.4 && cp stills/s_01.40.png render/0000.png   # ảnh bìa = frame 0
ffmpeg -framerate 30 -i render/%04d.png -i said_audio.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart ../said.mp4
```
