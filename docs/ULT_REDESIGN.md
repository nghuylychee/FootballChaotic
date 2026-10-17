# THIẾT KẾ LẠI TUYỆT KỸ — Mỗi chiêu một cơ chế, điên hơn, vẫn là đá bóng

> Trạng thái: **ĐÃ LÀM (2026-10-15)**, user duyệt (mục 7). Cân bằng số để sau, thử cảm giác ở phòng test (mục 8).
> Giữ nguyên: công thức X3 / X4 / X2 + Y2 (`docs/ULT_RECIPE.md`), 8 trường phái, ô của từng chiêu trong ULT BOOK,
> luật `needsBall`, báo trước + né Z, bất khả xâm phạm ngắn.

## 1. Chẩn đoán: 36 chiêu nhưng chỉ có ~5 động từ

| Cụm trùng | Chiêu | Vấn đề |
|---|---|---|
| **Lao vào 1 người rồi đấm / đá văng** | Hundred Fists, Rising Dragon, Thunder Rush, Wild Haymaker, Pinball Kick, Shadow Ambush, Crossfire Kicks | 7 chiêu cùng một nhịp: khoá mục tiêu gần → lao → văng. Khác nhau chủ yếu ở màu VFX |
| **Lướt đường thẳng, hất người trên đường** | Lightning Dash, Comet Dropkick, Steel Express, Flash Strike, Wormhole Dash, Iron Dice | 6 chiêu = "vạch đường 0.35s → lao → văng". Cả 3 chiêu lai của TỐC ĐỘ đều là lướt |
| **Đập vùng tròn hất tung** | Meteor Drop, Iron Hammer, Iron Quake, Knockout Volley, mưa thiên thạch của Chaos Roulette | 5 chiêu = vòng báo trước → nổ |
| **Sút mạnh + trừ thủ môn (`gk`)** | Meteor Shot, Comet One-Two, Flash Strike, Phantom Barrage, Sky Volley, Knockout Volley, Wrecking Ball, Jackpot Shot, Endless Tiki-Taka | 9 chiêu kết thúc bằng 1 cú sút được cộng điểm thủ môn → cảm giác "Tuyệt kỹ = bàn thắng", đúng điều cần tránh |
| **Phân thân / bóng giả** | Clone Army, Phantom Barrage, Mirage Sprint, Ghost Pass, Shell Game, Mirror Wall, Shadow Ambush, Crossfire Kicks | 8 chiêu dùng phân thân → cả hệ ẢO ẢNH chỉ có 1 chiêu |

Hệ quả: đạt công thức mới không cho cảm giác "mở khoá thứ mới". Đối thủ cũng không cần học cách đỡ từng chiêu, vì đỡ 1 chiêu lướt là đỡ được cả 6.

## 2. Luật thiết kế mới

1. **Một cơ chế, một chiêu.** Không hai Tuyệt kỹ nào dùng chung cơ chế lõi (lướt thẳng, khoá mục tiêu, vùng tròn, phân thân…). Bảng kiểm ở mục 5.
2. **Tuyệt kỹ tạo ra tình huống, không tạo ra bàn thắng.** Bỏ dần hệ số `gk`. Bàn thắng đến từ khoảng trống mà chiêu mở ra, người chơi vẫn phải tự ngắm, tự sút.
3. **Mỗi chiêu có ít nhất 1 cách đỡ nhìn thấy được**, ghi rõ trong bảng:
   *né Z* · *ngắt lúc gồng* (đấm người đang gồng là huỷ chiêu) · *đứng vị trí* (chắn đường, ra khỏi vùng) · *thủ môn đọc được* · *chờ hết giờ* · *đồng đội cứu*.
4. **Bóng luôn là nhân vật chính.** Chiêu đánh nhau thuần phải đổi lại bóng rơi hoặc khoảng trống, không chỉ để đối thủ nằm đó.
5. **Nhìn 1 giây là gọi được tên.** Mỗi chiêu có một hình ảnh riêng (tường sét, bàn tay ma, tấm gương, cuộn băng tua…), không chỉ là "vòng tròn + màu".

## 3. 8 Tuyệt kỹ gốc (X3)

| Hệ | Hiện tại | Đề xuất | Cơ chế | Cách đỡ | desc trên lá |
|---|---|---|---|---|---|
| TỐC ĐỘ | Lightning Dash | 🔁 **Light Cycle** | 3s chạy siêu tốc (có / không bóng đều được), để lại **vệt tường sét** tồn tại ~2.5s. Đối thủ chạy qua tường bị giật choáng. Vẽ tường để rào hậu vệ, cắt đường lui, quây thủ môn. ★★: vệt dài hơn, tồn tại lâu hơn | Né Z xuyên qua tường an toàn · người dùng vẫn bị đấm được · tường không chặn bóng | Sprint as lightning, leaving a wall that zaps anyone crossing. |
| TIKI-TAKA | Endless Tiki-Taka | ✏ **Giữ, sửa nhẹ** | Bỏ cú sút tự động cuối chuỗi + `gk`. Thay bằng: người nhận cuối có **ô 1 chạm vàng** 1.5s, cú sút chạm đầu tiên đủ lực tối đa nhưng tự ngắm | Đường chuyền thật, đứng đúng chỗ vẫn cắt được · thủ môn thấy ai đang loé vàng | Opponents slow down while your team auto-passes the ball. |
| SÁT THỦ | Meteor Shot | ✅ **Giữ** | (hiện tại) Hạ `gk` 0.3 → 0.15, bóng đổ trên sân hiện điểm rơi | Thủ môn đọc bóng đổ · chắn đường bóng | — |
| ĐẤU SĨ | Hundred Fists | ✅ **Giữ** | Chiêu chuẩn của cụm "khoá 1 người": giữ ở đây, mọi chiêu lai khác bỏ cơ chế này | Né Z lúc lao tới | — |
| VÕ SĨ ĐÁ | Meteor Drop | 🔁 **Moon Stomp** | Dậm đất, vòng báo trước 0.5s. **Mọi người trong vòng lơ lửng** như mất trọng lực ~2s (cả bóng, cả đồng đội), không chạy được, không đấm được. Chỉ người dùng đi lại bình thường: đá người đang lơ lửng là văng cực xa, đá bóng đang lơ lửng là vô-lê. Đây là chiêu "hất tung tất cả" | Ra khỏi vòng lúc báo trước · người lơ lửng được lướt Z trên không 1 lần để thoát | Stomp the ground and everyone nearby floats helplessly. |
| ẢO ẢNH | Clone Army | ✅ **Giữ** | Chiêu chuẩn của phân thân: giữ ở đây, các chiêu lai ẢO ẢNH khác chuyển sang ảo thuật khác (cổng, tàng hình, gương, bàn tay ma) | (hiện tại) | — |
| THÉP | Titan | ✅ **Giữ** | (hiện tại) | Chậm hơn, kéo dài hết giờ | — |
| HỖN LOẠN | Chaos Roulette | ✏ **Giữ, đổi bánh xe** | Bỏ mưa thiên thạch + mất trọng lực (trùng Anvil Rain / Moon Stomp). 3 tai hoạ mới, đều **toàn sân**: **Sân băng** (sân nhà đối thủ trơn: trượt, khó dừng) · **Nghiêng sân** (sân nghiêng về khung thành đối thủ, người + bóng trôi về phía đó) · **Mất điện** (đèn sân tắt ~2.5s, chỉ thấy bóng + vòng chân) | Ảnh hưởng chung, đọc được qua bánh xe · chờ hết giờ | Spin the wheel: a random disaster hits the pitch. |

## 4. 28 Tuyệt kỹ lai (X2 + Y2)

✅ giữ · ✏ sửa nhẹ · 🔁 thay mới (giữ ô trong ULT BOOK, đổi id)

### TỐC ĐỘ +
| Cặp | Hiện tại | Đề xuất | Cơ chế | Cách đỡ | desc |
|---|---|---|---|---|---|
| + TIKI | Lightning Relay | ✅ **Giữ** | Chuyền sét giật người chắn đường, người nhận tăng tốc. Chiêu "chuyền" duy nhất của TỐC ĐỘ | Vạch sét báo trước, tránh khỏi đường | — |
| + SÁT THỦ | Flash Strike | 🔁 **Time Stop Strike** | **Thời gian ngưng** ~1.5s (sân xám), chỉ người dùng cử động. Đá bóng tối đa 3 lần: mỗi cú bóng đứng yên giữa không trung, hiện mũi tên hướng. Hết ngưng → bóng bay theo hướng cuối với **lực sút thường**. Không đánh được người trong lúc ngưng | Mọi người thấy mũi tên suốt lúc ngưng → thủ môn và hậu vệ đứng chắn sẵn, hết ngưng là phản ứng ngay | Freeze time, kick the ball thrice, then let it fly. |
| + ĐẤU SĨ | Thunder Rush | 🔁 **Sonic Fist** | Gồng 0.4s (nắm tay phát sáng, vạch thẳng ngang sân) → đấm ra **cục sóng chấn hình nắm đấm** bay xuyên sân. Đối thủ đầu tiên trúng văng vào tường. Bóng nằm trên đường bị thổi bay về phía trước | Né Z · đấm người đang gồng là huỷ chiêu · đồng đội đứng chắn đỡ thay | Punch so fast the shockwave flies across the pitch. |
| + THÉP | Steel Express | 🔁 **Lead Blocker** | (cần đội cầm bóng) Hoá thép, **tự chạy mở đường ngay trước người cầm bóng của đội** ~3s, húc đổ ai đứng chắn phía trước, như lead blocker trong bóng bầu dục | Vòng qua hai bên (chỉ chặn phía trước) · đấm thẳng người cầm bóng | Turn to steel and bulldoze a path for the ball. |
| + VÕ SĨ ĐÁ | Comet Dropkick | 🔁 **Hurricane Kick** | Xoay thành **lốc xoáy** đi chậm theo hướng ngắm ~2s (điều khiển được). Ai chạm bị hút lên rồi văng sang bên. Bóng bị cuốn vào thì văng ra **ngẫu nhiên phía trước**, nên có thể mất bóng | Lốc chậm, né sang bên · bóng văng ngẫu nhiên, ai cũng tranh được | Spin into a tornado that swallows and spits out everyone. |
| + ẢO ẢNH | Mirage Sprint | 🔁 **Phase Step** | 4s: mỗi lần lướt Z thành **dịch chuyển xa** và để lại ảo ảnh của mình chạy tiếp hướng cũ (không có bóng giả). Chiêu dựa vào kỹ năng: người bấm Z khéo thì múa được | Người thật có bóng đổ, ảo ảnh không có · ảo ảnh vỡ khi chạm | Your dodges become blinks that leave running afterimages behind. |
| + HỖN LOẠN | Wormhole Dash | 🔁 **VHS Rewind** | Màn hình nhiễu băng "◀◀" 0.4s → **mọi người trừ bạn bị tua về chỗ đứng 2s trước**. Bóng không tua (giữ luật không giật bóng). Dùng để thoát vây, hoặc kéo hậu vệ vừa áp sát về chỗ cũ. Không tua được bàn thắng | Tua cả đồng đội của bạn · 2s trước đối thủ có thể đứng tốt hơn · báo trước 0.4s | Rewind everyone else a few seconds; the ball stays put. |

### TIKI-TAKA +
| Cặp | Hiện tại | Đề xuất | Cơ chế | Cách đỡ | desc |
|---|---|---|---|---|---|
| + SÁT THỦ | Comet One-Two | ✏ **Giữ, bỏ `gk`** | Chiêu 1-2 chuẩn. Giữ xuyên người, bỏ cộng điểm thủ môn | Thủ môn | — |
| + ĐẤU SĨ | Slingshot | ✅ **Giữ** | Phóng đồng đội: độc nhất | (hiện tại) | — |
| + VÕ SĨ ĐÁ | Sky Volley | 🔁 **Boomerang Kick** | Đá bóng theo **một vòng cung khổng lồ** (đường chấm hiện trước), hất ngã mọi đối thủ bóng đi qua, cuối vòng bóng quay về chân đồng đội. Thay vì trùng Meteor Shot (bật lên đập xuống) | Đường cung hiện sẵn: bước ra, hoặc đứng thủ thế ngay trên đường để đỡ bóng | Kick a huge curving arc that flattens opponents, then returns. |
| + ẢO ẢNH | Ghost Pass | ✅ **Giữ** | Chiêu "chuyền giả" duy nhất | (hiện tại) | — |
| + THÉP | Steel Formation | 🔁 **Iron Chain** | ~3s: **xích thép nối bạn với từng đồng đội**. Đối thủ chạy vào xích bị vấp ngã (clothesline). Chuyền dọc theo xích thì không cắt được. Đồng đội đứng quá xa thì xích đứt. Đội hình thành vũ khí | Lướt Z nhảy qua xích · kéo giãn đội hình để xích đứt | Steel chains link your team and clothesline anyone crossing. |
| + HỖN LOẠN | Wild Card Pass | 🔁 **Magnet Ball** | ~4s: bóng **nhiễm từ** về đội bạn. Đường chuyền bẻ cong vòng qua người để tìm chân đồng đội, bóng lỏng trôi dần về phía đồng đội gần nhất, đối thủ lại gần bóng bị đẩy nhẹ ra (cùng cực) | Lấy người chắn (bóng không xuyên người) · tắc người nhận như thường · lực đẩy yếu, ép sát vẫn được | The ball clings to your team and repels opponents. |

### SÁT THỦ +
| Cặp | Hiện tại | Đề xuất | Cơ chế | Cách đỡ | desc |
|---|---|---|---|---|---|
| + ĐẤU SĨ | Knockout Volley | 🔁 **Parry Volley** | **Thế thủ** ~1.2s (tư thế rõ, vòng vàng). Bị đấm trong lúc này: phản đòn đánh văng. Bóng (sút / chuyền) bay tới: **vô-lê trả ngược** về khung thành đối thủ, nhanh hơn. Không ai đánh vào là phí chiêu: chiêu duy nhất mang tính đấu trí | Thấy thế thủ thì đừng sút / đấm vào, chờ 1.2s | Take a stance: parry punches, volley back incoming shots. |
| + VÕ SĨ ĐÁ | Cannonball | ✅ **Giữ** | Bóng bom: độc nhất | (hiện tại) | — |
| + ẢO ẢNH | Phantom Barrage | 🔁 **Vanishing Ball** | Cú sút **tàng hình** giữa đường bay ~0.6s, chỉ còn một vệt gợn sóng mờ. Hết tàng hình bóng hiện lại gần khung thành | Thủ môn và hậu vệ đọc vệt gợn · bóng không đổi hướng, chặn đúng đường vẫn chặn được | Your shot turns invisible mid-flight; only a shimmer shows. |
| + THÉP | Wrecking Ball | 🔁 **Boulder Shot** | Bóng hoá **tảng đá khổng lồ** lăn chậm, cán bẹp ai đứng trước (kiểu hoạt hình). Mỗi cú đá / đấm của đối thủ vào tảng đá làm nó chậm lại và lệch hướng, nên cả đội đối thủ phải xúm vào đá. Hết ~3s hoặc dừng hẳn thì về bóng thường | Nhiều người cùng đá chặn · tránh đường lăn · lăn chậm, thủ môn có thời gian | The ball becomes a giant boulder rolling over everyone. |
| + HỖN LOẠN | Jackpot Shot | ✏ **Giữ, bỏ `gk`** | Ngẫu nhiên là bản sắc riêng | — | — |

### ĐẤU SĨ +
| Cặp | Hiện tại | Đề xuất | Cơ chế | Cách đỡ | desc |
|---|---|---|---|---|---|
| + VÕ SĨ ĐÁ | Rising Dragon | ✅ **Giữ** | Có rồng VFX riêng, combo đấm → đá rõ ràng | (hiện tại) | — |
| + ẢO ẢNH | Shadow Ambush | 🔁 **Ghost Hands** | Vũng bóng tím hiện dưới chân tối đa 3 đối thủ (0.5s báo trước) → **bàn tay ma quái** trồi lên túm chân, giữ chặt ~1.2s (đứng yên, rơi bóng nếu đang cầm) | Bước ra khỏi vũng / lướt Z lúc báo trước · đồng đội đấm vào bàn tay để giải cứu | Ghostly hands burst from the ground and grab opponents. |
| + THÉP | Iron Hammer | ✅ **Giữ** | Nắm đấm khổng lồ đập từ trên xuống. Là chiêu "vùng hình nón" duy nhất sau khi bỏ Iron Quake / Knockout Volley | (hiện tại) | — |
| + HỖN LOẠN | Wild Haymaker | 🔁 **Jack-in-the-Box** | Đặt 3 **hộp lò xo** trên sân (nhìn thấy rõ). Đối thủ đi tới gần thì găng đấm bật ra hất văng. Tồn tại ~6s hoặc tới khi nổ. Chiêu đặt bẫy duy nhất | Nhìn thấy để đi vòng · lướt Z qua · đấm hộp để phá | Plant spring-loaded boxing gloves that punch passing opponents. |

### VÕ SĨ ĐÁ +
| Cặp | Hiện tại | Đề xuất | Cơ chế | Cách đỡ | desc |
|---|---|---|---|---|---|
| + ẢO ẢNH | Crossfire Kicks | 🔁 **Portal Kicks** | Đá vào không trung: **cổng nhỏ mở cạnh tối đa 3 đối thủ** (0.5s báo trước), chân bạn thò ra từ cổng đá văng họ từ hướng bất ngờ. Bạn đứng yên tại chỗ suốt chiêu (kiểu Dhalsim) | Né Z khi thấy cổng mở · đấm bạn lúc đang đá là huỷ các cú còn lại | Kick into portals; your foot strikes opponents from anywhere. |
| + THÉP | Iron Quake | 🔁 **Earth Spike** | Đá xuống đất: vết nứt chạy thẳng ra trước (báo trước) → **hàng cột đá trồi lên** hất tung ai đứng trên đó. Cột đá đứng lại ~3s **như tường thật**: chặn người, chặn bóng (của cả hai đội). Tạo địa hình | Vết nứt báo trước · cột cũng chặn đội bạn: dùng cột để che sút | Kick the ground: a rock wall erupts, launching opponents. |
| + HỖN LOẠN | Pinball Kick | ✅ **Giữ** | Đá người thành bi pinball: chiêu "dùng người làm đạn" duy nhất | (hiện tại) | — |

### ẢO ẢNH + / THÉP + / HỖN LOẠN +
| Cặp | Hiện tại | Đề xuất | Cơ chế | Cách đỡ | desc |
|---|---|---|---|---|---|
| ẢO ẢNH + THÉP | Mirror Wall | 🔁 **Hall of Mirrors** | 4 tấm **gương thép** xuất hiện quanh sân ~5s. Bóng chạm gương thì **phản xạ đúng góc**, sút đập gương ăn bàn. Đội bạn thấy đường phản xạ khi ngắm. Gương vỡ sau 2 cú | Đội đối thủ cũng dùng gương được · đá vỡ gương · gương không chặn người | Mirrors appear across the pitch; shots bounce off them. |
| ẢO ẢNH + HỖN LOẠN | Shell Game | ✅ **Giữ** | Tráo chỗ: khác Clone Army (đánh / sút) | (hiện tại) | — |
| THÉP + HỖN LOẠN | Iron Dice | 🔁 **Anvil Rain** | **Đe sắt hoạt hình** rơi xuống quanh đối thủ (bóng đổ lớn dần 0.6s), trúng thì bị dẹp lép như bánh tráng ~1s (rơi bóng). Đe nằm lại trên sân thành vật cản nhỏ | Bóng đổ báo trước · né Z | Cartoon anvils rain down on your opponents' heads. |

## 5. Bảng kiểm trùng: mỗi hệ có 8 chiêu, 8 cơ chế

| Hệ | 8 Tuyệt kỹ (gốc + 7 lai) |
|---|---|
| TỐC ĐỘ | tường sét · chuyền sét · chạy chậm cả sân (đợt 3) · đấm sóng chấn · mở đường · lốc xoáy · dịch chuyển · tua băng |
| TIKI-TAKA | chuyền tự động · chuyền sét · 1-2 · phóng đồng đội · bóng vòng cung · chuyền giả · xích đội hình · bóng nam châm |
| SÁT THỦ | bật lên đập · chạy chậm cả sân (đợt 3) · 1-2 · trả đòn · bóng bom · bom khói (đợt 3) · tảng đá · sút ngẫu nhiên |
| ĐẤU SĨ | trăm cú đấm · đấm sóng chấn · phóng đồng đội · trả đòn · rồng (hất + đá) · bàn tay ma · nắm đấm khổng lồ · bẫy lò xo |
| VÕ SĨ ĐÁ | mất trọng lực · lốc xoáy · bóng vòng cung · bóng bom · rồng · đá qua cổng · cột đá · người pinball |
| ẢO ẢNH | đội phân thân · dịch chuyển · chuyền giả · bom khói (đợt 3) · bàn tay ma · đá qua cổng · gương phản xạ · tráo chỗ |
| THÉP | khổng lồ · mở đường · xích đội hình · tảng đá · nắm đấm khổng lồ · cột đá · gương phản xạ · đe sắt |
| HỖN LOẠN | bánh xe toàn sân · tua băng · bóng nam châm · sút ngẫu nhiên · bẫy lò xo · người pinball · tráo chỗ · đe sắt |

Sau khi đổi: chiêu "lao vào 1 người" còn 3 (Hundred Fists, Rising Dragon, Pinball Kick), mỗi chiêu một kết thúc khác hẳn nhau.
Lướt đường thẳng còn 0. Phân thân còn 3 (Clone Army, Ghost Pass, Shell Game). Hệ số `gk` còn 1 (Meteor Shot, đã hạ).

## 6. Kỹ thuật + thứ tự làm

Mẫu có sẵn để tái dùng: **Mirror Wall** = `sys.task` chạy trên máy chủ trận + `Effects` để vẽ (đã đồng bộ qua `sync.js capture`).
Vật thể trên sân (tường sét, cột đá, gương, hộp lò xo, đe, xích) đều làm theo mẫu này → **phần lớn không cần tăng `net.protocol`**.
Chỉ cần thêm hàm `Effects` mới vào danh sách capture trong `sync.js`. Trạng thái người mới (lơ lửng, bị túm, thế thủ) cần thêm vào `PF` nếu render cần.

| Đợt | Chiêu | Vì sao |
|---|---|---|
| **1. Rẻ, gỡ trùng nặng nhất** | Sonic Fist · Ghost Hands · Portal Kicks · Jack-in-the-Box · Anvil Rain · Vanishing Ball · Boulder Shot · Lead Blocker · Parry Volley | Dùng lại rush / clone / skin bóng / sóng chấn có sẵn. Xoá hết cụm "lao vào đấm" + phần lớn cụm "lướt thẳng" |
| **2. Trạng thái mới** | Moon Stomp (lơ lửng) · Hurricane Kick · Phase Step · Magnet Ball · Boomerang Kick · Iron Chain · Chaos Roulette (3 tai hoạ toàn sân) · sửa Endless Tiki / bỏ `gk` | Cần trạng thái người / bóng mới + AI biết né |
| **3. Hệ thống lớn** | Light Cycle · Earth Spike · Hall of Mirrors (vật cản chặn / phản xạ bóng) · Time Stop Strike (đóng băng mọi thứ trừ 1 người) · VHS Rewind (lưu vị trí 2s gần nhất) | Đụng tới vật lý bóng và vòng lặp mô phỏng, cần thử kỹ cả online |

Mỗi chiêu mới cần đủ: config (`cores.config.js`) · hành vi (`cores-hybrid.js` / `cores.js`) · `aiUse` (AI biết lúc dùng) + AI biết né ·
VFX (luật "no invisible Cores") · cảnh xem trước (`corepreview.js SCENES`) · icon · chuỗi i18n cả 4 gói + build lại font ja.
**ULT BOOK:** đổi id thì chuyển id cũ → id mới trong `Profile.data.ultBook` lúc tải save, để ai đã mở ô đó vẫn còn mở.

## 7. User đã chốt (2026-10-15)

| # | Câu hỏi | Chốt |
|---|---|---|
| 1 | Đổi cả 2 Tuyệt kỹ gốc? | **Đổi hết**: Lightning Dash → Light Cycle, Meteor Drop → Moon Stomp |
| 2 | Bỏ hệ số thủ môn `gk`? | **Không**: giữ nguyên `gk` ở mọi chiêu sút cũ (Meteor Shot, Comet One-Two, Jackpot Shot, Endless Tiki-Taka giữ y như cũ) |
| 3 | Chiêu toàn sân (ngưng thời gian, tua băng, nghiêng sân, mất điện)? | **Muốn thử** |
| 4 | Làm theo đợt? | **Làm hết một lần** + phòng test để thử cảm giác (chỉ bản dev, không vào bản build) |

## 8. Đã làm

- Hành vi 19 chiêu mới: `src/systems/cores-ult2.js` (Chaos Roulette mới ở `cores-new.js`). Config: `cores.config.js` (`ults.base`, `ults.hybrids`,
  `ults.renamed` = id cũ → id mới). Gỡ 20 chiêu cũ khỏi `cores.js` / `cores-new.js` / `cores-hybrid.js`.
- Viên gạch mới: `Effects.prop / propOff` (vật thể trên sân, `render/vfx.js → drawProp`), lớp phủ `vhs / dark / tilt`, skin bóng `boulder` / `ghost`,
  chiêu bay `fist`. Đồng bộ online qua `sync.js capture`. Trạng thái trận: `Game.stopT` (Time Stop Strike), `Game.pitchIce` + `CoreSystem.slip` (SÂN BĂNG),
  `st(đội, 'iron_chain').t` (`passGuarded`, thay Steel Formation).
- **ULT BOOK**: hồ sơ cũ đã mở chiêu bị thay -> tự đổi sang chiêu mới cùng ô (`Profile.sanitize`, `ults.renamed`).
- Ảnh xem trước (`corepreview.js`), icon (`pixelicons.js`), bản dịch pt-BR / pt-PT / es / ja + font ja dựng lại.
- **`net.protocol` 7 → 8**, máy chủ `8.0.0`: danh sách Tuyệt kỹ đổi nên bản cũ / mới không được vào chung phòng. Cần build image + deploy tay.
- Thành tích `storm_chaser` giờ là "Unlock Light Cycle".

Khác bản đề xuất (đơn giản hoá khi làm):
| Chiêu | Khác gì |
|---|---|
| Moon Stomp | Không có "lướt Z trên không để thoát": né bằng cách ra khỏi vòng lúc báo trước hoặc lướt Z đúng lúc dậm. Người lơ lửng nằm choáng trên không |
| Ghost Hands | Chưa có "đồng đội đấm bàn tay để giải cứu" |
| Hall of Mirrors | Chưa vẽ đường phản xạ khi ngắm |
| Boomerang Kick | Đối thủ không đỡ bằng thế thủ được; cách đỡ = né / tránh đường cung, thủ môn trong vòng cấm bắt được |
| Time Stop Strike | 3 cú đá tự động (lách người đứng chắn), người chơi chọn hướng cú đầu + góc khung cú cuối bằng phím đang giữ |
| VHS Rewind | Người cầm bóng bị tua kèm bóng (không giật bóng); bóng lỏng đứng yên |

Giả lập: 40 trận AI vs AI không lỗi. Mỗi chiêu bắn thử 30 lần ở tình huống ngẫu nhiên: không chiêu nào ghi bàn chắc chắn
(cao nhất ~40% trong 6 giây sau khi ra chiêu, AI đánh AI).

**Phòng test (dev):** SETTINGS › TEST › ULT TEST ROOM hoặc `index.html?ulttest` (`?ulttest=moon_stomp` chọn sẵn). Trận luyện tập 3v3, X tự nạp đầy,
không ghi hồ sơ. Phím: `[` `]` đổi chiêu · `\` ★★ · `O` đối thủ cũng có Tuyệt kỹ mới · `F` đối thủ đứng yên · `B` bóng về chân · `N` giao bóng lại · `H` ẩn bảng.
File `src/ui/ulttest.js` nằm trong `if (SFC_DEBUG)`: bản đóng gói thành rỗng (`strip-debug.js`, MARKERS có `ULT TEST`).

## 9. Đợt 2 (2026-10-15, sau khi user thử phòng test) — ĐÃ LÀM

Số trong cột # = số thứ tự trong phòng test (`ULT n/36`).

**Trạng thái mới dùng chung** (`Stat` trong `cores-ult2.js`, gợi ý của user để ý tưởng chiêu đa dạng hơn):
**trơn té** (ngã + trượt) · **hoá đá** (đứng chết trân, phủ tượng xám) · **thôi miên** (đi lang thang, ai / bóng chạm là tỉnh) · **teo nhỏ** (`sizeMul`: bé, chậm, thủ môn bé thì tầm bắt bóng nhỏ theo).

| # | Chiêu | User góp ý | Đã làm |
|---|---|---|---|
| 8 | Chaos Roulette → **Pitch Tilt** | Chỉ giữ nghiêng sân | Bỏ sân băng + mất điện. Giữ id `chaos_roulette` (sổ Tuyệt kỹ) |
| 9 | **Comet One-Two** | Giống Endless Tiki | 1-2 với đồng đội → đồng đội hất bổng → bay lên **móc xe đạp** (renderer lộn người, `atkType 'bicycle'`). Giữ `gk` |
| 12 | Vanishing Ball → **Hypno Eyes** | Quá nhiều cú sút | Tia thôi miên (báo trước 0.3s, né Z / chạy khỏi chỗ nhắm là thoát) vào 2 đối thủ đứng giữa mình và khung: đi lang thang ra xa khung |
| 13 | **Iron Chain** | Đụng cái là mất | Xích tồn tại trọn thời gian, giãn theo người, không đứt nữa |
| 14 | **Iron Hammer** | Búa kiểu Poppy, chỉ khi không cầm bóng | `noBall` (ô X mờ khi cầm bóng). Lôi búa ra gồng 0.55s (xoay hướng được, hình quạt đỏ báo trước), nện: bay rất xa theo hướng búa |
| 17 | Lightning Relay → **Thunderstorm** | Triệu hồi sét, cảnh báo 0.5s | 9 tia sét quanh đối thủ (đón đầu) + quanh bóng, mỗi tia có vòng cảnh báo 0.5s |
| 18 | **Time Stop Strike** | Bá, không đỡ được | Bóng chỉ nhích ít (không còn dắt tới sát khung), hết ngưng **đối thủ cử động trước 0.45s** (chạy ra chắn mũi tên) rồi bóng mới bay, lực ×0.85, thủ môn dễ bắt hơn |
| 19 | Sonic Fist → **Rocket Punch** | Đổi thành rocket punch | Cùng cơ chế, hình nắm đấm tên lửa (vây, lửa + khói đuôi) |
| 20 | Lead Blocker → **Monster Truck** | Cũ, khó hiểu, cần điên hơn | Gọi xe tải quái vật, tự lái (rẽ theo phím), cán bẹp ai chạm; bị đánh trúng là xe nổ |
| 22 | Ghost Pass → **Switcheroo** | Đổi ý tưởng | Tráo chỗ với đồng đội đứng đúng chỗ (tấn công: người cao nhất; phòng thủ: người gần người cầm bóng), vòng phép báo trước |
| 23 | Parry Volley → **Dodgeball** | Đổi ý tưởng | Bóng né nảy từ đầu đối thủ này sang đầu đối thủ khác (trơn té), hết người thì bay về khung |
| 26 | **Ghost Hands** | Khó trúng | Vũng to gấp đôi + đặt đón đầu chỗ đối thủ sắp chạy tới |
| 27 | **Portal Kicks** | Chân ngắn | Chân vươn tới 54px, đuổi theo chỗ đối thủ đang đứng |
| 28 | **Earth Spike** | 3 lần xài | 3 lượt trong 8s: bấm X lại (hook `recast`, không cần năng lượng / cut-in), số lượt còn lại hiện trên đầu |
| 29 | Hall of Mirrors → **Medusa Gaze** | Không hiệu quả | Nón ánh mắt báo trước 0.5s, đối thủ trong nón **hoá đá** 2.2s |
| 30 | **VHS Rewind** | Diễn chậm, rõ, có SFX | Cả sân đứng yên 1s, mọi người chạy lùi theo đúng đường cũ (tàn ảnh), nhiễu băng + tiếng tua (`Audio.rewind`) |
| 31 | Magnet Ball → **Banana Pass** | Không hợp lý | Chuyền tới đồng đội, bóng rải vỏ chuối dọc đường: đối thủ dẫm phải **trơn té** |
| 32 | Jackpot Shot → **Shrink Ray** | Đổi ý tưởng | Tia thu nhỏ xuyên mọi đối thủ trên đường: **teo nhỏ** 4s |
| 34 | **Pinball Kick** | Nảy gấp đôi | 6 lần nảy, bay 2.4s |
| 36 | Anvil Rain → **Mega Magnet** | Đổi cái khác | Nam châm khổng lồ hạ xuống giữa đám đối thủ, hút về tâm (chạy nước rút / lướt Z thoát được), dính tâm thì choáng |

Ghi chú: Monster Truck và Hurricane Kick đều là "hoá thành vật cản tự lái"; khác ở chỗ xe nhanh, rẽ theo bán kính, cán bẹp, còn lốc chậm, hút người lên rồi nhả bóng ngẫu nhiên.
`cores.ults.renamed` trỏ thẳng từ id gốc (trước đợt 1) và id đợt 1 tới id mới nhất.

## 10. Đợt 3 (2026-10-17) — ĐÃ LÀM

| # | Chiêu | User góp ý | Đã làm |
|---|---|---|---|
| 12 | Hypno Eyes → **Smoke Bomb** (`smoke_bomb`) | Khó hiểu, cần ý khác. User chọn: bom khói kiểu Akali | Bom khói elip to (`radius` 82, `squash` 0.6) tồn tại 5s. Người đội mình đứng trong khói **tàng hình với đối thủ** (`p.ghostT`, đã có trong `PF`): máy đối thủ không vẽ người lẫn bóng ở chân, đội mình thấy bóng mờ. Người đang điều khiển tàng hình thì có viền màn hình tím than + mắt gạch chéo, chữ HIDDEN trên đầu (`Renderer.hiddenMark / stealthVignette`). Chuyền / sút: lộ `reveal` 0.5s rồi lại ẩn nếu còn trong khói; bị đánh trúng: lộ tới khi đứng dậy. AI đối thủ không thấy người cầm bóng: đuổi theo chỗ đoán trong khói (`confused.decoy`). Đỡ: đấm mò vào khói, chặn lối ra, chờ chuyền / sút |
| 14 | **Iron Hammer** | Diễn xoay búa vòng tròn rồi mới vung; địa chấn hất tung theo đường thẳng, bay cao | Giữ `noBall`. Xoay búa 2 vòng trong 0.95s (xoay hướng được, dải đỏ báo trước đường địa chấn; bị đấm lúc xoay là huỷ). Nện: địa chấn chạy thẳng 560 px/s, dài 270px, rộng 22px (vết nứt + đá trồi, `prop 'quake'`): mọi đối thủ trên đường **bay cao** (`launch` 400, ~160px), bóng lỏng trên đường bị hất tung. Lướt Z lúc sóng tới là thoát. Khác Earth Spike: không để lại vật cản, chỉ 1 lần, sóng chạy từ chân người nện |
| 15 | **Phase Step** | Không thấy được ý "lướt liên tục"; muốn hiệu ứng như chui qua cổng portal | 5 lượt trong 5s, **pip** trên đầu = số lượt còn (người điều khiển thấy thêm nhãn phím lướt). Không hồi chiêu giữa các lượt (`gap` 0.12s). Mỗi lượt: chui vào cổng tím, ra ở cổng xanh cách 78px (không trượt như Z thường), chữ BLINK!, vẫn để ảo ảnh chạy tiếp hướng cũ |
| 18 | Time Stop Strike → **Bullet Time** (`bullet_time`) | Ý khác, kiểu Quicksilver, kết thúc bằng cú sút | Cả sân chạy chậm ×0.12 (`Game.slowMo`, không phải ngưng hẳn: đối thủ vẫn nhích được), người cầm bóng chạy 280 px/s thời gian thật tối đa 1s, lái theo phím, vệt ảo ảnh + phủ xanh + tia tốc độ. Đối thủ bị lướt sát qua (trừ thủ môn trong vòng cấm): thời gian chạy lại thì quay ngược + **trơn té**. Kết thúc bằng cú sút: bấm sút (`intent.shootTap`, `human.js`) / hết giờ / chạy tới cách khung 200px; lực ×0.8, thủ môn dễ bắt hơn (`gk` -0.25) |

Cân số (AI đánh AI, xuất phát cách khung 200–330px, 6 giây sau khi ra chiêu): Bullet Time ~36% ra bàn (mốc không dùng chiêu ~8%;
bản đầu không giới hạn khoảng cách sút ~75%, nên thêm `shootAt`), Smoke Bomb ~20%. Iron Hammer: đối thủ đứng trên đường bay cao ~160px.
`cores.ults.renamed`: `hypno_eyes` / `vanishing_ball` / `phantom_barrage` → `smoke_bomb`, `time_stop_strike` / `flash_strike` → `bullet_time`.
Bỏ prop `arrow` (chỉ Time Stop Strike dùng). Định dạng gói tin không đổi (`ghostT` đã có trong `PF`, prop mới đi qua lệnh hiệu ứng có sẵn),
nhưng id Tuyệt kỹ đổi nên **`net.protocol` 8 → 9**, máy chủ `9.0.0` (như đợt 1): cần build image + deploy tay.

## 11. Đợt 4 (2026-10-17) — ĐÃ LÀM

| # | Chiêu | User góp ý | Đã làm |
|---|---|---|---|
| 21 | Boomerang Kick → **Mega Boomerang** (`mega_boomerang`) | Ném boomerang khổng lồ quét cả địch lẫn đồng đội, bay 3 vòng khắp sân rồi về tay | Không cần bóng. Bay xoắn ốc 3 vòng quanh tâm sân trong 6s (vòng nhỏ dần, `spiral`), rồi về tay người ném (đường bay = `CoreBehaviors.mega_boomerang.at`, hình vẽ dùng chung). Trúng ai (trừ người ném) cũng bị hất ngã, rơi bóng; bóng lỏng bị quét thì văng theo. Né Z |
| 22 | Switcheroo → **Puppet Master** (`puppet_master`) | Cần ý khác. User chọn con rối | Sợi chỉ (báo trước 0.3s, né Z / chạy ra xa là thoát) móc tối đa 2 đối thủ gần nhất (ưu tiên người cầm bóng) trong 2.6s: chạy theo đúng hướng bạn chạy (`Player.puppet`, bỏ qua hệ số tốc độ AI), không ra đòn / chuyền / sút / lướt (`noActT`). Đứt chỉ khi bạn bị đánh choáng hoặc đi quá 280px |
| 23 | Dodgeball → **Rage** (`rage`) | Hoá King Kong, dậm nhảy tại chỗ 3 lần ra 3 đợt địa chấn, ai cũng bị, né bằng lướt đúng lúc, vẽ rõ | Gầm đấm ngực 0.55s rồi 3 cú dậm cách nhau 0.8s. Mỗi cú: vòng địa chấn elip (dọc ×0.6, khớp hình vẽ) lan 220 px/s tới 190px, vành dày 14px: ai đứng đúng chỗ vành đi qua (cả đồng đội) bay cao ~70px. Lướt Z lúc vành tới là thoát. Bị đánh choáng thì hết King Kong |
| 24 | **Cannonball** | Bóng bay vòng cung như đạn pháo | Sút bổng cao ~95px rơi xuống cách khung 80px (giữ đúng vòng cung, không ai chạm được khi còn cao, có vòng điểm rơi). Nổ lúc chạm đất / chạm người, bóng nảy tiếp về khung ×0.5 |
| 25 | **Boulder Shot** | Đứng trên tảng đá, giữ thăng bằng bằng thanh quicktime; trúng 3 lần thì thả đá lăn; đá cán người thì nhỏ lại, đủ 3 người thành bóng thường | Thanh kim chạy qua lại (1 lượt 0.9s, vùng giữa 24%), bấm sút đúng vùng: đá to thêm 1 cỡ; trượt: chao đảo, khoá phím 0.35s. Đủ 3 cỡ (hoặc hết 4s, ít nhất cỡ 1) thì thả đá lăn vào khung (cỡ càng to càng nhanh). Cán đối thủ: nhỏ 1 cỡ, chậm ×0.85; cỡ 0 = bóng thường. Đứng trên đá: không bị đánh choáng / cướp bóng (`armorT`, `noStealT`, tối đa 4s) — thêm vào sau khi giả lập thấy AI đấm ngã gần như mọi lần |
| 31 | Banana Pass → **Magic Wall Pass** (`magic_wall_pass`) | Đá bóng vào tường, hiện điểm hẹn ưu tiên gần khung, bàn tay ma thuật từ tường ném bóng qua lại tới đúng chỗ; có mặt đúng lúc thì nhận bóng | Điểm hẹn trước khung 110px, kéo về phía người chơi nếu không chạy tới kịp. Đá vào tường gần → 3 bàn tay găng trắng ném so le giữa tường trên / dưới (bóng bay cao, không ai chạm được) → thả xuống điểm hẹn sau 1.85s. Người ra chiêu đứng trong 18px nhận bóng; không thì người gần nhất (đối thủ đứng chờ sẵn cũng cướp được); không ai thì bóng lỏng |
| 32 | Shrink Ray → **Chicken Ray** (`chicken_ray`) | Trúng chiêu hoá gà 3s | Giữ tia + báo trước. Trúng: hoá gà 3s (`Stat.chicken`): rơi bóng, không chạm được bóng (cả thủ môn bắt bóng), không ra đòn / chuyền / sút / lướt, chạy ×1.05. Nhắm người cầm bóng / người gần nhất, không nhắm thủ môn |
| 35 | Shell Game → **Panic Ball** (`panic_ball`) | Bóng dí đối thủ, trúng thì hoảng sợ (đảo ngược mọi hướng di chuyển), thể hiện rõ | Bóng ma quái (mắt đỏ, răng nhọn) đuổi tối đa 3 đối thủ trong 4s (không nhắm thủ môn, không bay vào khung). Trúng: hoảng sợ 3s (`Stat.panic`, `Player.panicT`: di chuyển + hướng nhắm đảo ngược), rơi bóng, "!!" to nhấp nháy, vạch sốc trên mặt, mồ hôi, người run lẩy bẩy. Né Z. Xong thì bóng bay về chân bạn |

Viên gạch mới: `Player.noActT` (chặn ra đòn / chuyền / sút / lướt / Tuyệt kỹ, kiểm ở `Actions` + `activateUltimate`), `panicT`, `chickenT`, `puppet`;
vật thể tự vẽ nhân vật thay sprite thật (`VFX.hides`, `PROP_HIDE`: King Kong, đứng trên đá, con gà) — chạy được ở máy khách online vì chỉ đọc vật thể đã đồng bộ;
skin bóng `monster`, `hide`, `boulder1..3` (cỡ nằm trong tên skin, đã đồng bộ). `Human.update` ghi `intent.shootTap`; chiêu đọc xong tự xoá.

Giả lập (AI đánh AI, xuất phát cách khung 200–330px, 6 giây sau khi ra chiêu, mốc không dùng chiêu 2–5%): Rage ~25% · Cannonball 14–22%
(bản đầu rơi sát khung 54%) · Mega Boomerang / Puppet Master / Magic Wall Pass / Boulder Shot / Panic Ball 9–14% · Chicken Ray ~4% (chiêu phòng thủ).
`cores.ults.renamed`: `boomerang_kick` / `sky_volley` → `mega_boomerang`, `switcheroo` / `ghost_pass` → `puppet_master`, `dodgeball` / `parry_volley` /
`knockout_volley` → `rage`, `banana_pass` / `magnet_ball` / `wild_pass` → `magic_wall_pass`, `shrink_ray` / `jackpot_shot` → `chicken_ray`, `shell_game` → `panic_ball`.
Vẫn `net.protocol` 9 (chưa deploy bản 9 nên không tăng thêm).

## 12. Đợt 5 (2026-10-17) — ĐÃ LÀM

**Luật dùng Tuyệt kỹ** (`CoreSystem.ultUse`, user chốt): mỗi chiêu đúng 1 loại, hiện ở ULT BOOK (dòng dưới công thức) và ở bảng phòng test.
Không hiện trên ô X trong trận (đã thử nhãn BALL / NO BALL, user thấy xấu) — ô X chỉ mờ đi khi chưa dùng được.

| Loại | Config | Chiêu |
|---|---|---|
| Chỉ khi **chính mình** cầm bóng (đồng đội cầm cũng không được) | `needsBall` | Endless Tiki-Taka · Meteor Shot · Comet One-Two · Slingshot · Bullet Time · Cannonball · Magic Wall Pass · Panic Ball |
| Chỉ khi **không** cầm bóng | `noBall` | Iron Hammer · Boulder Rider |
| Lúc nào cũng được | (không có) | 26 chiêu còn lại |

Trước đây `needsBall` = đội mình cầm bóng. AI cũng không thử ra chiêu khi đang bị chặn (`aiUltimate`).

| # | Chiêu | User góp ý | Đã làm |
|---|---|---|---|
| 22 | **Puppet Master** | Làm rõ cơ chế bắn dây rồi giữ N giây mới nối được | 3 pha nhìn thấy được: **bắn dây** 0.3s (chỉ xám bay tới, đầu có móc; lướt Z là né) → **nối dây** 0.9s (chỉ căng rung, vòng tiến trình quanh chân + thanh trên đầu đầy dần, đối thủ bị kéo chậm ×0.45; đứt nếu họ lướt Z / chạy xa quá 200px, hoặc người giật dây bị đánh choáng — người giật dây đứng yên giữ dây) → **con rối** 2.6s như cũ. Giữ dây là tự động (đứng yên), không phải giữ phím |
| 25 | Boulder Shot → **Boulder Rider** (id giữ `boulder_shot`) | Chỉ dùng khi không cầm bóng; tự tạo đá riêng (không biến bóng); mỗi lần to gấp đôi; quicktime chậm lại; trượt nhiều thì đá vỡ, ngã choáng; thành công thì cưỡi đá lái đi cán hết | `noBall`. Đá bán kính 5 → 10 → 20 → 40px. Thanh quicktime 1.4s / lượt (cũ 0.9s), vùng giữa 26%. Trượt 3 lần (hoặc hết 6s mà chưa trúng lần nào): đá vỡ vụn (`rubble`), ngã choáng 1.5s. Đủ 3 lần (hết 6s: cỡ đang có): cưỡi đá 4s, lái theo phím (125 px/s), cán bẹp **mọi người** chạm phải (cả đồng đội), đá văng bóng lỏng. Đứng / cưỡi đá không bị đánh choáng (`armorT`). Giả lập: AI cưỡi được ~73% lần, mỗi lượt cưỡi cán ~6 lượt người |

Ghi chú: Boulder Rider giờ gần Monster Truck (cùng hệ THÉP, cùng "lái vật to cán người"); khác ở pha nhịp quicktime + đá to dần + rủi ro vỡ.
Bỏ skin bóng `boulder1..3` / `hide` và `noStealT` (chỉ bản Boulder trước dùng).

