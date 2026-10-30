# Street Football Chaos: bản "diver" (hài bựa kiểu Dave the Diver)

**Mục tiêu:** một video hài ngắn để đăng Shorts / TikTok / Reels. Người xem cười trước, sau đó mới nhận ra game có chiều sâu: mỗi đối thủ một luật trận điên rồ, có Ultimate kiểu anime.
**Học gì từ Dave the Diver:** chỉ học *cách pha trò*, không lấy art, nhạc hay font của họ.

| Dave the Diver làm | Bản này làm bằng gì (đều là game thật) |
|---|---|
| **Dave là "người thường"** giữa một đám lập dị | **THE KID** (mũ bucket, băng cá nhân, tất ống). Không nói câu nào, chỉ có bong bóng `...` |
| **Thẻ giới thiệu nhân vật**: đứng hình, tên to, một dòng khô khốc | Đứng hình + spotlight + thẻ chéo màu áo đội: THE KID, THE UNCLES, PIGEON GANG (tagline lấy từ config) |
| **Cảnh cường điệu kiểu anime cho chuyện vớ vẩn** | Cut-in Ultimate thật, tách thành 2 ô manga trên nền tia tốc độ → CHICKEN RAY biến 3 bà thành gà |
| **Đổi thể loại bất ngờ** | Khung TV thật (NMTV, Uncle Noodle) và cuộn phim sepia thật (ông nội lúc trẻ + King Leo) |
| **Nhịp hài**: dồn → khựng → chốt | Đĩa xước + đứng hình, im lặng có tiếng dế, nhạc ngắt ở BONK / SLIP, taiko trước cú bắn |

**Định dạng:** dọc 1080×1920, 30fps, **35.4s**. Footage là game thật quay headless (`work/diver_scenes.js`), chữ trên màn hình tiếng Anh.
**Phần chỉ có trong video** (không ghi vào repo): giờ ra tay của luật trận chỉnh để gag rơi đúng nhịp, choáng / hoá gà lâu hơn, điểm THE KID rơi khỏi nồi cố định, câu nói tự động của đối thủ tắt (director nói từng câu đúng lúc), look của THE KID gán thẳng vào avatar.

## Storyboard (đã dựng)

| Thời gian | Nhịp | Hình | Chữ |
|---|---|---|---|
| 0.0–3.0 | **HOOK** | Chợ đêm: đũa khổng lồ cắm xuống, GOTCHA!, nhấc THE KID lên. Đứng hình, mũi tên chỉ vào cậu | `yep. that's me.` · `you're probably wondering how I got here.` |
| 3.0–3.55 | Tua VHS | Hình chạy ngược, sọc nhiễu, OSD `◀◀ REW` | |
| 3.55–5.85 | THE KID | Sân làng, dắt bóng một mình → thẻ | `THE KID` / `just wants to play football.` |
| 5.85–10.55 | THE UNCLES | Lia sang các chú → thẻ + dấu `HOUSE RULE: THEY START 1-0 UP` → bảng `YOU 0 - 1 UNCLES`, chú nhặt ghế nhựa ném: *"Sit down, kids!"*, BONK! | `thirty years on the same pitch.` |
| 10.55–15.05 | PIGEON GANG | Mái nhà: *"Bombs away!"*, 3 bãi rơi quanh quả bóng → thẻ → THE KID đi tới bóng, dẫm bãi, SLIP! | `they have a game plan.` |
| 15.05–17.3 | Show TV | Tivi gỗ chiếu NMTV: thẻ tập EP.4, Uncle Noodle | `"tonight's special..."` · `YOU!` |
| 17.3–21.25 | MARKET MAMAS | ORDER UP!, đũa đón đầu, gắp, đứng hình đúng khung mở đầu, PLOP! vào nồi | lower third `MARKET MAMAS / no discounts. ever.` · `...and that's how I got here.` |
| 21.25–28.5 | Cú lật | BOING! bay khỏi nồi, đáp đất, `...`. Cut-in CHICKEN RAY (2 ô manga) → tia xuyên 3 bà, BAWK! ×3 → `▶▶ x2` đi bộ vào khung trống → GOAL, nằm ngủ ăn mừng (Zz), gà: *"Daylight robbery!" "I want a refund!"* | bảng `YOU 1 - 0 MAMAS` · `(he's fine.)` |
| 28.5–32.4 | Nhá boss | Cuộn phim: ông nội lúc trẻ + King Leo. Sân World Stage: 1976!, các Legends hợp thể, FUSION! | `"fifty years ago, it was him and me."` · `it gets worse.` |
| 32.4–35.4 | Outro | THE KID vẫn ngủ (tối đi), logo | `STREET FOOTBALL / CHAOS` · `pixel street football with superpowers` · `PLAYTEST SOON · FOLLOW` |

## Âm thanh (`work/audio.py`)
- **Tiếng game thật:** sự kiện âm thanh của từng take được quy đổi sang thời gian video theo `edl.json`, rồi render offline bằng chính `src/engine/audio.js` + `ultsfx.js` (ghế, chim, đũa, nồi, Chicken Ray, bàn thắng, FUSION).
- **Nhạc:** funk đảo nhiệt đới tự tổng hợp, F trưởng 104 BPM (bass tưng, guitar chặn kiểu Karplus-Strong, marimba, trống nhẹ). Nhạc chỉ là vibe gần Dave the Diver, giai điệu là của mình.
- **Gag:** đĩa xước, dế kêu lúc im lặng, tua băng, woodblock trên mỗi thẻ, còi trượt khi SLIP, organ show TV, taiko + riser trước cú bắn, kèn đồng khi ghi bàn, ngáy, máy chiếu phim + piano cũ, "dun dun DUNNN" sau FUSION.

## Dựng lại
```
npm run serve -- --port 8765            # ở thư mục gốc repo
cd brag-output/diver/work
for s in "village 4.5" "rooftop 6" "market 16.5" "leo 4.5" "tv 4" "film 4"; do python cap.py $s 7; done
python audio.py                         # game_sfx.wav + diver_audio.wav (REGAME=1 để render lại tiếng game)
python render.py                        # render/*.png (comp.html + edl.json)
ffmpeg -framerate 30 -i render/%04d.png -i diver_audio.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest ../diver.mp4
```
