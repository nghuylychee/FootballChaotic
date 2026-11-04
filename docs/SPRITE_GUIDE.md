# SPRITE GUIDE — luật vẽ người chơi

Luật user đặt ra trong lúc làm Sprite v2 (2026-10-31 → 2026-11-01), gom lại để dùng khi thêm động tác, đồ, hiệu ứng, áo đội mới. Chi tiết từng động tác và lịch sử quyết định: `docs/SPRITE_V2.md`. Code: `src/render/player/` (công cụ duyệt: `tools/sprite-v2/`).

Đọc hết mục 1–3 trước khi vẽ bất cứ thứ gì trên người chơi.

## 1. Hình người: đừng đổi

Nhân vật là bộ mặt của game. Mọi thay đổi phải nhẹ tay, không làm lại từ đầu.

- **Cỡ trong trận giữ nguyên.** Canvas trận 1x (1 px canvas = 1 px game, 2026-11-04); code sprite tính bằng px game, chỉ vẽ px game nguyên (mục 2).
- **Cao 24 px game** như sprite cũ. Đầu A 15 × 13 tròn, mắt vuông 3 × 3. Thân B: áo 3 hàng ăn vào quần, không hàng đầu gối, tất ngắn ngay dưới quần, 2 chân sát nhau.
- **Viền mực 1 px game quanh cả người**, như viền đầu. Riêng chỗ tay áo nối thân thì không viền (liền màu tối).
- **Thấy mặt / thấy lưng**: thấy mặt khi nhìn xuống, chéo xuống, ngang; thấy lưng khi nhìn lên và chéo lên. Mặt trượt ngang theo hướng nhìn. Chéo lên (`bdiag`, user 2026-11-03; trước đó chéo lên dùng hình sau lưng thẳng) là lưng xoay về 1 bên: nút băng đô và cổ áo sau lệch 1 cột ngược hướng mặt, bên hướng mặt lộ dải má 2 cột, tay gần bên hướng mặt + cục da tay xa bên kia (ngược chéo xuống). Không có hình nghiêng hẳn.
- **Nhìn trái = lật hình nhìn phải.** Đừng "sửa" cho đúng tay chân (xem mục 3).
- **Mũi giày**: nhìn thẳng xuống / lên không có mũi; chéo và ngang thì cả 2 mũi theo hướng mặt.
- **Quần đứng yên.** Ống quần theo đùi đã thử rồi bỏ.

Đã bỏ, đừng thử lại:
- Vẽ cho thật ("trying too hard to be realistic").
- Bản 2x vẽ lại mượt, thêm chi tiết, bo cong.
- Người cao hơn (vai xấu), thân 26 px, giữ đầu gối.
- Đầu v2 / đầu B, mắt to.

## 2. Một lưới: chỉ px game

- **Mọi khung chỉ vẽ px game** (user 2026-11-04 bỏ nửa px): tư thế đứng, tư thế khoá, khung chuyển động, nhoè, vị trí trên sân. Mục tiêu: chụp ở bất kỳ lúc nào, cỡ màn hình nào, px cũng đều nhau.
  - Lý do: lúc chạy nhanh mắt không thấy px mịn, chỉ thấy viền dày / mỏng thất thường; canvas bị phóng không tròn số thì px mịn còn lệch thêm.
  - Code: 1 đơn vị = 1 px game. Độ lệch số thực (ngả, nhấp, khuỵu, bật nhảy, đầu dẫn) qua `snapPx` (base.js, làm tròn đối xứng quanh 0). Chi tự do dùng `limbCells` / `blockCells` / `drawCells`. Gốc sprite = vị trí làm tròn về px game (`drawPlayer`).
  - Kiểm: mọi lệnh vẽ ở toạ độ nguyên; ảnh chụp ở mức phóng nguyên k thì mọi khối k × k cùng 1 màu.
- **Khung chuyển động**: chuyển động đến từ tư thế và nhoè vẽ bằng ô px game (bản tối của nắm tay / bàn chân dọc đường vừa đi), không từ bước nửa px.
- **Đồ nhỏ trên mặt / người** (ria, băng cá nhân, mũi hề…), mẫu giày và hạt hiệu ứng cũng chỉ px game (2026-11-04). Giày chỉ 2 - 3 ô mỗi hàng nên mỗi hàng 1 màu; mẫu theo toạ độ ô (sọc từng hàng) thì nháy khi chạy lên xuống, đừng dùng.
- **Không có double** (user 2026-11-04). Double = bậc thang của đường viền nối với bậc kế bằng cạnh (chữ L) thay vì chỉ chạm góc, làm đường dày thêm ở chỗ bậc, trông đậm và rối.
  - Bậc thang 1 px game chỉ chạm góc.
  - Ô viền chỉ chạm màu bên trong ở góc chéo (góc ngoài của hình) cũng là chữ L: bỏ ô đó (góc bo). Đã sửa ở hàm, vai, viền đáy quần, đáy giày.
  - Chỗ 2 bộ phận vẽ riêng gặp nhau (tay vung lên chạm góc vai, bàn chân nhấc dưới góc lai quần) vẫn còn chữ L (2026-11-04, chưa sửa).
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
- **Món khó thì so nhiều kiểu.** Vẽ vài kiểu cạnh nhau trên trang duyệt rồi chọn 1 (ria: hải mã thắng 4 kiểu khác), xoá các kiểu còn lại.

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

## 8. Quy trình

- **Thử trước, vẽ hết sau.** Làm 1 bản thử (1 hướng, 1 động tác) để chốt hướng đi trước khi làm hết.
- **Xem trên sân và đang chạy.** "Can't judge from just in place animation": thủ môn bay thật dọc vạch vôi, hạt hiệu ứng trôi như sân trôi, cầu thủ chạy như trong trận. Tốc độ thật của game, có nút chậm ¼×.
- **Duyệt trên trang duyệt** (`tools/sprite-v2/page.mjs`): 5 hướng (xuống, chéo xuống, ngang, chéo lên, lên), khung khoá cạnh vòng lặp; món duyệt xong chuyển xuống phần đã duyệt.
- **Soi từng khung phóng to:** ô lẻ, khối chữ nhật, vật dính nhau (ria dính mắt, chấm sáng thành "cặp mắt", sọc giày trông như tất), tương phản thấp trên da tối.
- **Duyệt xong thì khoá.** Thêm ca vào `tools/sprite-v2/check.cjs` rồi `--update`; chỉ ghi lại baseline cho thay đổi đã duyệt. Sửa gì làm đổi phần đã duyệt thì phải duyệt lại.
- **Mỗi động tác 1 file** trong `src/render/player/` (thứ tự nạp trong `scripts/manifest.js`).
- **Ghi lại quyết định ngay** vào `docs/SPRITE_V2.md` (gồm cả phương án đã bỏ, để không làm lại). Luật mới dùng chung được thì thêm vào file này.
- **Vẽ bảng nhanh.** Bảng xem vẽ từng ô vào canvas nháp rồi chép (vẽ thẳng lên canvas lớn chậm ~100 lần); `pilot.mjs --only <bảng>` khi chỉ sửa 1 bảng.

## 9. Kiểm tra nhanh cho thứ mới

1. Mọi khung (cả khung chuyển động) chỉ ở px game nguyên?
2. Tay chân đúng độ dài đứng? Tầm với lấy từ thân?
3. Cả người cùng chuyển động? Tay ngược chân?
4. Đúng tay / chân của cầu thủ theo mục 3? Nhìn trái là hình lật?
5. Có khung chuyển vào và ra?
6. Có ô lẻ, khối chữ nhật, vật dính nhau không?
7. Giống vật thật chưa? Mũ to hơn đầu, đồ tròn thì tròn?
8. Xem trên sân, đang chạy, với tóc đen / sáng, da sáng / tối, vài màu áo?
9. Nhịp lấy từ config? Online thấy giống máy chủ?
10. Duyệt xong: thêm vào `check.cjs`, ghi doc.
