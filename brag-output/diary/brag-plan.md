# Street Football Chaos: bản "DEAR DIARY" (nhật ký của THE KID)

**Mục tiêu:** video hài nhịp chậm cho Shorts / TikTok / Reels. THE KID ghi nhật ký mỗi ngày một trận, viết toàn điều tốt về đối thủ, cắt sang sân thì ngược lại, rồi quay về trang nhật ký với một dòng P.S. viết thêm. Người xem cười hai lần mỗi gag: một lần ở sân, một lần ở dòng P.S.
**Vì sao làm bản này:** bản "THEY SAID" bị góp ý là hơi nhanh (mỗi câu phỏng vấn khoảng 2s, mỗi gag khoảng 2.5s). Bản này chậm hơn:
- Chữ viết tay hiện từng ký tự (17 ký tự/s, ngày 5 chỉ 12 ký tự/s).
- Mỗi cảnh sân có đoạn chuẩn bị trước gag và đoạn hậu quả sau gag.
- Sau mỗi gag là im lặng, chỉ còn tiếng dế và tiếng bút.

**Định dạng:** dọc 1080×1920, 30fps, **54.7s**. Gameplay là game thật quay headless (`work/diary_scenes.js`). Trang nhật ký theo đúng kiểu kể "diary" của FOOTBALL STORY (giấy kẻ dòng, gáy lò xo, ảnh dán băng keo); ảnh là sprite đứng của chính game (`drawAvatar`). Chữ viết tay dùng font Gochi Hand. Chữ trên màn hình bằng tiếng Anh.
**Phần chỉ có trong video** (không ghi vào repo):
- Giờ ra tay của luật trận được chỉnh để gag rơi đúng nhịp.
- Chú Sau cầm ghế chờ khoảng 1s mới ném.
- Choáng do ghế kéo dài 2.6s.
- Thẻ vàng hiện lâu hơn.
- King Leo có giáp 99.
- Câu nói tự động của đối thủ tắt.
- Sừng, vết gạch, thẻ vàng dán trên trang và trang cháy đều vẽ thêm trong khung nhật ký.

## Storyboard (đã dựng)

| Thời gian | Nhịp | Hình | Chữ |
|---|---|---|---|
| 0.0–3.9 | Day 1 | Ảnh UNCLE SAU, caption `uncle Sau :)` | `Dear diary, / First match vs the uncles. / They are very kind.` |
| 3.9–8.8 | Sân làng | THE KID dẫn bóng thong thả, camera lia sang thấy chú Sau nhặt ghế nhựa, cầm chờ, ném: BONK! (6.1). Chú quay đi như không có gì, một chú khác thong thả đi tới lấy bóng | |
| 8.8–12.7 | Day 1 P.S. | Bút dạ đỏ vẽ sừng + lông mày giận lên ảnh chú Sau | `P.S. They have a stool.` |
| 12.7–17.0 | Day 2 (lật trang) | Ảnh FEATHERS, caption `the pigeon gang <3` | `Rooftop match! / Nice view. Lots of pigeons.` |
| 17.0–22.0 | Sân thượng | Vòng báo bom rơi quanh bóng, bãi chim kín sân, THE KID đi tới bóng: SLIP! (20.2) | |
| 22.0–25.3 | Day 2 P.S. | Gạch xoá chữ `<3` | `P.S. I need a new hat.` |
| 25.3–29.8 | Day 3 (lật trang) | Ảnh VAR, caption `a REAL referee!` | `Real referees today! / Finally, fair football.` |
| 29.8–34.9 | Quảng trường | VAR xoạc THE KID bay người: SMASH! (không còi). Cậu đứng dậy đẩy nhẹ: còi, FOUL!, đứng hình, thẻ vàng to | |
| 34.9–39.6 | Day 3 P.S. | Thẻ vàng thật bị dán lên trang | `P.S. I got a yellow card. / I don't know why.` |
| 39.6–43.0 | Day 4 (lật trang) | Ảnh GRANDPA, caption `the grandpas :)` | `Old men today. / Should be easy.` |
| 43.0–47.6 | Sân vận động | Khung rộng: phim nháy 1976!, FUSION! (44.6), King Leo húc bay THE KID (45.8), ghi bàn (46.6) | |
| 47.6–54.7 | Day 5 | Trang cháy xém, còn bốc khói, ảnh `me` (THE KID dính phân chim + muội than). Chữ run run, `still` được gạch chân hai lần, rồi logo | `I still want to / play football.` → `STREET FOOTBALL CHAOS · every team plays by its own rules · PLAYTEST SOON · FOLLOW` |

**Âm thanh:**
- Mỗi ngày mở đầu bằng một đoạn ukulele + glockenspiel 84 BPM. Nhạc chạy tiếp vào cảnh sân và tắt phụt đúng lúc gag, kèm tiếng stinger: mõ gỗ (BONK), còi trượt (SLIP), kèn đồng (SMASH), "bwamp bwaaamp" (thẻ vàng).
- Sau gag chỉ còn tiếng dế. Tiếng bút là người kể chuyện: mỗi chữ một tiếng sột soạt, thêm bút dạ rít, tiếng lật trang, tiếng dán băng keo.
- Sau mỗi dòng P.S. có một nốt ukulele/glock rơi xuống.
- Đoạn King Leo dùng tiếng máy chiếu phim, riser, FUSION boom, "dun dun DUNNN" và trống taiko.
- Ngày 5 im lặng, tiếng bút chậm lại. Khi gạch chân `still` có một tiếng strum, rồi nhạc quay lại cho logo.

## Dựng lại
```
npm run serve -- --port 8765            # ở thư mục gốc repo
cd brag-output/diary/work
# rooftop / refs / leo dùng lại take của bản THEY SAID (copy từ ../../said/work/frames); portraits/ cũng copy từ đó
python cap.py village 8.5               # take sân làng mới (chú Sau cầm ghế chờ rồi mới ném)
python build_edl.py                     # edl.json: thời lượng trang tính từ chữ viết tay
python audio.py                         # game_sfx.wav + diary_audio.wav (REGAME=1 để render lại tiếng game)
python render.py                        # render/*.png (comp.html + edl.json)
python render.py --stills 3.6 && cp stills/s_03.60.png render/0000.png   # ảnh bìa = frame 0
ffmpeg -framerate 30 -i render/%04d.png -i diary_audio.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart ../diary.mp4
```
