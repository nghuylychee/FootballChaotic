# Street Football Chaos: bản thử "chill" (sunday league)

**Câu hỏi cần trả lời:** format video chill/thanh bình đang viral có hợp với game không? Bản này thử theo hướng chill hoàn toàn, chỉ có tên game ở cuối là gợi ra chữ "CHAOS".
**Người xem phải nhận ra ngay đây là bóng đá:** sân cỏ xanh kẻ vôi đầy đủ, hai đội đi bộ ra sân, xếp đội hình 1-2-1-1 (có vẽ đường phấn kiểu bảng chiến thuật), còi giao bóng, chuyền ba nhịp, sút, ăn mừng.
**Định dạng:** dọc 1080×1920, 30fps, 26.5s, quay vòng liền (khung cuối và khung đầu đều là bầu trời).
**Footage:** game thật, quay headless (`work/chill_scenes.js`). Phần tuỳ biến chỉ có trong video, không ghi vào repo:
- **5v5** (game đang là 3v3): roles `GK · LB · RB · MID · FWD`.
- **Arena `meadow`:** sân cỏ sọc kết hợp nền ruộng lúa hoàng hôn của `village`, có hàng rào tre, vài người xem đội nón lá, gà và rơm ở mép sân.
- Tắt vignette, rung màn hình, flash trắng và camera ăn mừng của game, vì comp tự làm camera.
- Bầu trời phía trên (mây, chim, sao) và bãi cỏ phía trước được vẽ thêm trong `work/chill_comp.html`, cùng tỉ lệ pixel ×3 với game.

## Storyboard

| Thời gian | Hình | Chữ |
|---|---|---|
| 0.0–5.4 | Mở trên bầu trời tím hồng, máy quay hạ dần xuống sân trống, bóng nằm ở chấm giữa sân | `sunday, 5:47 pm` |
| 5.4–9.5 | Hai hàng cầu thủ đi bộ ra từ mép dưới rồi tản về vị trí | `the village pitch / five a side` |
| 9.5–11.6 | Đội hình đứng yên, đường phấn nối 5 người mỗi đội | `1 - 2 - 1 - 1` |
| 11.6 | Còi giao bóng (đầu ô nhịp 4) | |
| 11.6–16.5 | Chuyền về → chuyền ra biên → bóng xuyên tuyến, camera bám bóng | |
| 16.5–17.36 | Cú sút quay chậm 0.5x, thủ môn đổ sai hướng, nhạc chìm như dưới nước | |
| 17.36 | Bóng vào lưới đúng phách đầu ô nhịp 6, nhạc mở lại, glockenspiel vang lên | |
| 17.4–20.5 | Ăn mừng "Airplane", đồng đội chạy lại | `1 - 0` |
| 20.5–26.5 | Lùi ra toàn sân, cầu thủ đi bộ về, máy quay ngẩng lên trời | `STREET FOOTBALL / CHAOS / coming soon` |

## Âm thanh (`work/audio.py`)
Lo-fi 82.76 BPM (1 ô nhịp = 2.9s): Rhodes FM, bass, trống swing nhẹ, tiếng đĩa than; hoà âm Gmaj9 · F#m7 · Em9 · A7sus4. Nền âm thanh có gió, chim và dế lúc chạng vạng. Tiếng còi, tiếng chuyền và tiếng sút đặt đúng các sự kiện game ghi lại (file wav thật trong `assets/sfx`). Lúc bóng vào lưới có tiếng lưới rung và vài người xem vỗ tay.

## Dựng lại
```
npm run serve -- --port 8765            # ở thư mục gốc repo
cd brag-output/chill/work
python cap.py sunday 26.4 7             # frames/sunday/*.png + meta.json
python audio.py                         # chill_audio.wav
python render.py                        # render/*.png
ffmpeg -framerate 30 -i render/%04d.png -i chill_audio.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest ../sunday-league.mp4
```
