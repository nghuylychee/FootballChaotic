# SPRITE GUIDE — luật vẽ người chơi

Luật user đặt ra trong lúc làm Sprite v2 (2026-10-31 → 2026-11-01), gom lại để dùng khi thêm động tác, đồ, hiệu ứng, áo đội mới. Chi tiết từng động tác và lịch sử quyết định: `docs/SPRITE_V2.md`. Code: `src/render/player/` (công cụ duyệt: `tools/sprite-v2/`).

Đọc hết mục 1–3 trước khi vẽ bất cứ thứ gì trên người chơi.

## 1. Hình người: đừng đổi

Nhân vật là bộ mặt của game. Mọi thay đổi phải nhẹ tay, không làm lại từ đầu.

- **Cỡ trong trận giữ nguyên.** Vấn đề là độ phân giải quá thấp, không phải cỡ. Lưới 2x (1 px mịn = nửa px game) có là để chuyển động có chỗ, không phải để vẽ thêm chi tiết.
- **Cao 24 px game** như sprite cũ. Đầu A 15 × 13 tròn, mắt vuông 3 × 3. Thân B: áo 3 hàng ăn vào quần, không hàng đầu gối, tất ngắn ngay dưới quần, 2 chân sát nhau.
- **Viền mực 1 px game quanh cả người** (= 2 px mịn), như viền đầu. Riêng chỗ tay áo nối thân thì không viền (liền màu tối).
- **2 góc nhìn**: thấy mặt ở mọi hướng trừ nhìn lên; nhìn lên thấy lưng. Mặt trượt ngang theo hướng nhìn. Không có hình nghiêng hẳn, không 3/4 lên.
- **Nhìn trái = lật hình nhìn phải.** Đừng "sửa" cho đúng tay chân (xem mục 3).
- **Mũi giày**: nhìn thẳng xuống / lên không có mũi; chéo và ngang thì cả 2 mũi theo hướng mặt.
- **Quần đứng yên.** Ống quần theo đùi đã thử rồi bỏ.

Đã bỏ, đừng thử lại:
- Vẽ cho thật ("trying too hard to be realistic").
- Bản 2x vẽ lại mượt, thêm chi tiết, bo cong.
- Người cao hơn (vai xấu), thân 26 px, giữ đầu gối.
- Đầu v2 / đầu B, mắt to.

## 2. Hai lưới: lúc nào dùng lưới nào

- **Tư thế đứng và tư thế khoá** của động tác (nghỉ, lấy đà, hết tầm, giữ): lưới game, bậc 1 px game, khối chắc. Không bo, không thêm chi tiết.
- **Khung chuyển động** giữa 2 tư thế khoá: dùng lưới mịn thoải mái. Góc chi mượt từng px mịn, nhoè (smear) dọc đường vừa đi, viền mịn. Không cần bó theo kiểu cũ.
- **Đồ nhỏ trên mặt / người** (ria, băng cá nhân, mũi hề…): chi tiết tới từng px mịn (lớp `fine`). Mặt nhỏ nên đồ vẽ ở lưới game trông lạ.
- **Không có hình chữ nhật trơn.** Khung hình còn khối chữ nhật là dấu hiệu thiếu chỗ hoặc vẽ lười: chóp mũ phẳng, quầng sáng hình hộp, lưng tóc thành 1 khối.

## 3. Trái / phải và trục

- "Tay trái", "chân trái" = bên trái **của cầu thủ**. Mặc định cầu thủ nhìn xuống (về máy quay). Khi muốn nói bên màn hình thì ghi rõ "trái màn hình".
- Trục cục bộ kiểu Unity: +Y lên, +Z = hướng mặt, +X = bên phải của cầu thủ.
- Tay / chân phải nằm bên **trái** màn hình khi nhìn xuống, chéo xuống, ngang; bên **phải** màn hình khi thấy lưng (lên, chéo lên).
- Đấm luôn bằng tay trái, Hard attack luôn đá chân phải (mọi hướng nhìn phải / xuống / lên). Nhìn trái là hình lật nên ngược lại; giữ vậy.
- Đồ một bên (bịt mắt, kính một mắt, sẹo, băng chấn thương) theo bên của cầu thủ, không theo màn hình.

## 4. Chuyển động

**Cả người cùng làm.**
- Không tay chân nào đứng yên khi ra đòn. Đấm thì tay kia vung, vai áo nhô theo tay đấm, thân ngả, chân bước.
- Bị đấm thì tay văng / lắc, không để tay yên.

**Tay ngược chân, theo cả 2 trục.**
- Chân phải đá -> tay phải buông thấp ra sau, tay trái vung lên ra trước.
- Chân phải thu về lấy đà -> tay phải giơ lên phía trước, tay trái buông.
- Ngược cả lên / xuống lẫn trước / sau: chân ra sau thì tay cùng bên ra trước, và ngược lại.

**Tay chân giữ đúng độ dài lúc đứng.**
- Tay = tay áo + 2 px cẳng tay + nắm tay 3 × 3 (2.4 ô từ vai); chân = 4.5 px từ hông tới bàn chân.
- Muốn với xa thì lấy từ thân: ngả, lao tới, bước chân, bật nhảy. Không kéo dài tay chân như dây thun.
- Tay ngắn nên giơ tay qua đầu phải nhô vai lên (2 ô) và / hoặc rụt đầu xuống.

**Ra đòn mạnh = có nhịp.**
- Lấy đà rõ (khuỵu gối, hạ người, thu chân / tay) rồi mới tung đòn (vung, bật nhảy nhẹ, lao tới), rồi về.
- Lấy đà phải đọc được: chân thu về không được lẫn vào chân trụ.
- Chân thu về lấy đà nào thì chân đó đá. Chân trụ co tại chỗ, không đổi bên.
- Đòn về phía máy quay / ra xa máy quay (nhìn xuống / lên) phải thấy chuyển động: phóng to bộ phận gần máy quay (nắm tay 4 × 4, đế giày 4 × 4), hoặc đá chếch ra cạnh người cho thân khỏi che.

**"Giơ tay" là giơ hẳn.** Chữ V, vai nhô lên, không lắc nhẹ.

**Chuyển cảnh vào và ra.** Từ đứng sang tư thế lạ và từ đó về đứng cần khung chuyển (thủ môn: cất người, chạm đất, đứng dậy; bị đá bay: chạm đất, nằm, dậy).

**Chân trên không thì 2 mũi giày chĩa ra 2 phía**, không cùng hướng.

**Lớp trước / sau theo chiều sâu.** Thứ ở xa máy quay vẽ trước để bị che (tay đấm lên vẽ trước đầu; hào quang gồng vẽ sau người; chân xếp bằng che quần).

**Nhịp theo game.**
- Thời gian lấy từ config (`combat.light`, `combat.hard`, `kick.poseTime`…), không tự đặt.
- Trạng thái game không có (lúc chạm đất, lúc bị đánh) thì theo dõi ở phía vẽ (WeakMap theo cầu thủ) từ trường có trong snapshot, để máy khách online thấy giống máy chủ.

**Lười thì user thấy.** Backflip vẽ thành lăn nghiêng bị chê "lười". Làm thật thì tốn (phải vẽ đỉnh đầu cho mọi kiểu tóc). Khi không đáng làm thật thì hỏi user giữ bản nào, đừng nộp bản nửa vời.

## 5. Đồ người chơi (tóc, mũ, mặt, giày)

- **Vẽ lại, đừng chuyển thẳng.** "There is no point if you shy yourself and keep the direct port." Mỗi món là 1 bản vẽ mới có chi tiết.
- **Theo vật thật.** Mũ đội lên đầu nên to hơn đầu. Vương miện có đế tròn, không phẳng. Đồng xu tròn. Tóc Goku theo ảnh tham khảo của user. Mỗi món đều tự hỏi "ngoài đời nó trông thế nào".
- **Một khối, không ô lẻ.** Tóc bồng là 1 khối 1 viền, không viền mực giữa các chỏm. Không ô lẻ chĩa ra ngoài đầu (lỗi user bắt nhiều nhất). Tròn quá cũng không được: afro cần mép bông.
- **Mũ / mặt / tóc hợp với đầu.**
  - Mũ nào cũng lộ tóc dưới vành ở sau lưng / nhìn ngang (trừ mũ bảo hiểm).
  - Mũ hạ đủ thấp để che tóc.
  - Tóc ôm đầu (đuôi ngựa nhìn trước không to hơn đầu).
  - Tóc cạo chỉ tô trong viền đầu.
- **Viền không bắt buộc màu mực.** Lửa có viền đỏ thẫm. Thứ phát sáng có quầng sáng cộng sáng, nhưng không thành hộp: cho ánh hắt xuống sân thay vì khung sáng quanh vật.
- **Đồ trong suốt thì trong.** Tròng kính cận không tô con ngươi đen bên trong.
- **Màu suy từ màu gốc.** Sáng / tối của tóc từ màu tóc; đồ của đội dùng màu phụ của đội.
- **Đồ phải có ở mọi tư thế.** Giày tô qua chữ màu của chân (O / G / g / J) nên có ở mọi tư thế; đồ gắn thêm bám theo chỗ đã tô (đế giày), không vẽ riêng cho từng động tác.
- **Món nào khó thì cho chọn.** Ria trông lạ thì vẽ 5 kiểu cạnh nhau cho user chọn (chọn hải mã). Chọn xong thì xoá các kiểu kia.

## 6. Hiệu ứng

- **Giống thứ thật.** Khói là cụm mây liền nhau, tan dần, không phải từng hạt rời. Bụi đường cũng vậy, dẹt sát đất.
- **Cỡ vừa phải.** Hiệu ứng không được to hơn hay che người. Khói đã phải thu nhỏ và giảm đời hạt (`Sprites.FX`).
- **Giữ mô phỏng của game, chỉ thay phần vẽ.** Hạt vẫn sinh / bay bằng code game; sprite mới chỉ thay `drawFxParticle`.

## 7. Màu áo, da, tóc

- Màu trong config đội giữ nguyên; sửa độ tương phản lúc vẽ (`kitColors`, `player/player.js`):
  - băng đô trùng màu tóc -> màu áo;
  - găng thủ môn trùng màu da -> màu áo;
  - áo cũng trùng thì màu phụ sẫm đi;
  - quần gần đen -> nâng sáng tới khi tách khỏi viền mực.
- Đội mới: xem trên bảng `kits` với đủ 5 màu da và màu tóc của đội. Kiểm: băng đô có thấy không, quần có dính viền không, găng trên da sáng.

## 8. Cách làm với user

- **Thử trước, vẽ hết sau.** Làm 1 bản thử (1 hướng, 1 động tác) cho user xem hướng đi trước khi làm hết.
- **Xem trên sân và đang chạy.** "Can't judge from just in place animation": thủ môn bay thật dọc vạch vôi, hạt hiệu ứng trôi như sân trôi, cầu thủ chạy như trong trận. Tốc độ thật của game, có nút chậm ¼×.
- **Trang xem (artifact) theo đợt.**
  - 4 hướng (xuống, chéo xuống, ngang, lên); khung khoá đặt cạnh vòng lặp.
  - Theo đợt (ăn mừng 5 động tác / đợt; đồ thì cả nhóm, món chưa đạt làm lại ở đợt sau).
  - User duyệt từng món: món duyệt xong chuyển xuống phần đã duyệt; phương án đã bỏ xoá khỏi trang.
- **Tự soi trước khi đưa.** Phóng to từng khung, tìm ô lẻ, khối chữ nhật, vật dính nhau (ria dính mắt, chấm sáng thành "cặp mắt", sọc giày trông như tất), tương phản thấp trên da tối. Sửa rồi mới đưa, và ghi vào doc những gì đã tự sửa.
- **Duyệt xong thì khoá.** Thêm ca vào `tools/sprite-v2/check.cjs` rồi `--update`; chỉ ghi lại baseline sau khi user duyệt. Sửa gì làm đổi phần đã duyệt thì phải đưa user xem lại.
- **Code là sản phẩm.** Không xoá code sprite khi chưa hỏi. Thay bản nháp của chính mình thì được nhưng phải nói. Mỗi động tác 1 file trong `player/`.
- **Ghi lại quyết định ngay** vào `docs/SPRITE_V2.md` (gồm cả phương án đã bỏ, để không làm lại). Luật mới dùng chung được thì thêm vào file này.
- **Vẽ nhanh.** Bảng xem vẽ từng ô vào canvas nháp rồi chép (vẽ thẳng lên canvas lớn chậm ~100 lần); `pilot.mjs --only <bảng>` khi chỉ sửa 1 bảng.

## 9. Kiểm tra nhanh cho thứ mới

1. Tư thế khoá ở lưới game, khung chuyển động ở lưới mịn?
2. Tay chân đúng độ dài đứng? Tầm với lấy từ thân?
3. Cả người cùng chuyển động? Tay ngược chân?
4. Đúng tay / chân của cầu thủ theo mục 3? Nhìn trái là hình lật?
5. Có khung chuyển vào và ra?
6. Có ô lẻ, khối chữ nhật, vật dính nhau không?
7. Giống vật thật chưa? Mũ to hơn đầu, đồ tròn thì tròn?
8. Xem trên sân, đang chạy, với tóc đen / sáng, da sáng / tối, vài màu áo?
9. Nhịp lấy từ config? Online thấy giống máy chủ?
10. Duyệt xong: thêm vào `check.cjs`, ghi doc.
