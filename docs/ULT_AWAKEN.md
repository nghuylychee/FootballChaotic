# TUYỆT KỸ ★★ (X4) — Thức tỉnh: thêm một nét mới, không chỉ tăng số

> Trạng thái: **ĐÃ LÀM (2026-10-25)**, user duyệt (mục 6). Kết quả + chỗ khác bản đề xuất: mục 7.
> Giữ nguyên: công thức X3 / X4 (`docs/ULT_RECIPE.md`), id Tuyệt kỹ, ô ★★ trong ULT BOOK (`id:2`), luật dùng
> (`needsBall` / `noBall`), báo trước + né Z, mỗi chiêu một cơ chế (`docs/ULT_REDESIGN.md`).

## 1. Hiện tại

- ★★ = `list[id].evolve[0]` ghép đè lên `params` (`CoreSystem.sp`). Ví dụ Light Cycle 3s → 4.2s, Hundred Fists 20 → 36 cú, Titan 5s → 8s.
- Lớp hình thêm cho ★★ chỉ có: vòng sóng + chớp sáng lúc ra chiêu (`activateUltimate`, `lv >= 2`), sao ★★ trên cut-in / ô X,
  và hình thái `VFX.form` (tia điện, nốt nhạc, chân lửa… rất nhỏ; HỖN LOẠN chưa có).
- Hệ quả: đạt X4 thì thấy banner ULTIMATE EVOLVED! nhưng ra chiêu trông y như X3, chỉ dài / mạnh hơn. Không có lý do để đối thủ đỡ khác đi.

## 2. Luật cho ★★

1. **Cùng chiêu, thêm đúng một nét mới** ("twist"): xây trên cơ chế của bản X3, không thành chiêu khác, không mượn cơ chế
   của chiêu khác (vẫn qua bảng kiểm trùng ở `ULT_REDESIGN.md` mục 5).
2. **Nét mới phải nhìn thấy và gọi tên được trong 1 giây** — có hình riêng (vật thể, đổi màu sân, nhân vật phụ), không phải số to hơn.
3. **Nét mới vẫn có cách đỡ** (ghi trong bảng mục 3). ★★ mạnh hơn nhưng không thành "chắc chắn ra bàn".
4. **Số tăng ít lại**: phần lớn sức mạnh dồn vào nét mới; các `evolve` tăng thuần (Titan 8s, Hundred Fists 36 cú) hạ bớt.
5. **Có "dáng thức tỉnh" chung** cho mọi ★★ (mục 4) để cả sân nhận ra ngay đây là ★★.

## 3. 8 Tuyệt kỹ ★★

| Hệ | Chiêu (X3) | ★★ thêm gì | Hình riêng | Cách đỡ nét mới | `evolve` đổi |
|---|---|---|---|---|---|
| ⚡ TỐC ĐỘ | Light Cycle | **Khép lồng sét**: vệt tường cắt lại chính nó (khép một vòng kín) thì vùng bên trong **nổ điện**: mọi đối thủ đứng trong lồng bị choáng + nảy bóng ra. Chạy vòng quanh hậu vệ / thủ môn để nhốt | Tường cao 2 lớp (lõi trắng, viền xanh neon), sân phủ lưới neon kiểu Tron suốt chiêu; vòng khép thì cả vùng loé sáng, tia sét chạy dọc mép | Chạy ra khỏi vòng trước khi khép (vòng đang hở nhìn thấy rõ) · né Z xuyên tường như cũ · đấm người dùng | `time` 3 → 3.6 (cũ 4.2), `life` 2.2 → 3, mới: `cage` (choáng trong lồng), `minLoop` (diện tích tối thiểu) |
| 🎼 TIKI-TAKA | Endless Tiki-Taka | **Dây đàn**: chuỗi chuyền dùng **cả 3 người** (tam giác thay vì qua lại 2 người), mỗi đường chuyền để lại **một dây đàn vàng** trên sân. Hết chuỗi, các dây **rung lên**: đối thủ đứng trên dây bị khựng (đứng yên ngắn) | Sân phủ khuông nhạc mờ, dây đàn sáng rung theo nốt, nốt nhạc bay từ mỗi dây khi rung; mỗi đường chuyền một nốt của hợp âm | Đứng tránh khỏi đường dây (dây hiện suốt chuỗi) · vẫn cắt được đường chuyền thật như X3 · né Z lúc rung | `passes` 6 → 6, `slow` giữ, mới: `strings` (thời gian dây), `freeze` (khựng). Bỏ tăng `gk` 0.45 → giữ 0.25 |
| 🎯 SÁT THỦ | Meteor Shot | **Cú đập thứ hai**: bóng bị thủ môn đẩy ra / chạm cột / bị phá → bóng bật lên **bốc lửa lơ lửng** 1s (vòng lửa quanh bóng), người dùng bấm sút trong lúc đó là **lao tới đập lại** (rush thấy rõ, không dịch chuyển) | Trời tối đỏ khi bay lên, sao băng nhỏ rơi nền; bóng bật ra để lại vòng lửa + chữ REBOUND!; cú thứ 2 có vệt lửa đôi | Thủ môn **bắt dính** (không đẩy ra) là hết chiêu · hậu vệ chạm bóng lơ lửng trước (bóng không bị khoá ở pha 2) · đấm người đang lao tới | `jump` giữ, `speed` 680 → 600, `gk` 0.5 → 0.35, mới: `rebound` (thời gian chờ), `rush` |
| 💢 ĐẤU SĨ | Hundred Fists | **Combo dây chuyền**: sau cú kết, người dùng **lướt thẳng** sang đối thủ gần nhất kế tiếp (user chốt: lượt sau là lướt tới, né được để ngắt). Vạch đỏ báo trước 0.3s, lao theo đúng vạch; tối đa 2 người nữa, mỗi người 10 cú, combo cộng dồn | Một **hồn đấu sĩ khổng lồ** đỏ trong suốt hiện sau lưng (kiểu "stand"), tung tràng nắm đấm cùng người dùng; vạch lướt đỏ nhấp nháy có mũi tên | **Né Z lúc lướt tới / bước khỏi vạch = hết chuỗi** · đấm người dùng lúc đang gồng | `hits` 36 → 20 (lượt đầu), mới: `chain` 2, `chainHits` 10, `chainRange` 200, `chainRush`, `chainWarn` 0.3. `stun` 2 → 1.6 |
| 🦵 VÕ SĨ ĐÁ | Moon Stomp | **Trăng đi theo người**: vùng mất trọng lực **di chuyển cùng người dùng** suốt `float` giây; đối thủ nào người dùng chạy tới gần cũng bị nhấc lên (rồi đá HOME RUN như X3) | Màn đêm toàn sân, **trăng tròn to** trên nền trời, vòng trăng sáng quanh chân người dùng, bụi sao bay lên khi ai bị nhấc | Giữ khoảng cách (vòng hiện rõ, người dùng không nhanh hơn bình thường) · né Z lúc vòng chạm tới · đấm người dùng trước khi tới | `radius` 110 → 80 (vòng nhỏ nhưng di động), `float` 2.6 → 3.2, mới: `follow` |
| 🎎 ẢO ẢNH | Clone Army | **Phân thân ở lại sân**: 3 phân thân không tan sau đòn đầu mà **ở lại `time` giây như cầu thủ thật**, mỗi cái kèm một đối thủ: đội mình cầm bóng thì **chắn người** đuổi theo, đối thủ cầm bóng thì **áp sát giành bóng** (tắc như người thường) | Phân thân có mắt tím phát sáng + khói tím dưới chân; người thật có bóng đổ, phân thân không; mỗi phân thân vỡ thành khói + chữ POOF! | Đấm 1 cái là vỡ · người thật có bóng đổ · phân thân chậm hơn người thật | `time` 4.6 → 4, `gkPenalty` 0.46 → 0.3, mới: `stay` 3, `cloneSpeed` |
| 🗿 THÉP | Titan | **Túm và ném**: trong lúc khổng lồ, đòn mạnh = **túm đối thủ gần nhất** (vươn tay thấy rõ) rồi **ném như quả bowling** theo hướng ngắm: trúng ai trên đường cũng đổ | Da thép bóng loáng có vệt sáng chạy, mắt phát sáng, hơi nước phụt ở vai mỗi bước, vết nứt to hơn | Né Z lúc tay vươn tới · Titan chậm, chạy vòng · người bị ném bay theo đường thẳng thấy trước, bước ra | `time` 8 → 6, `scale` 2.6 → 2.4, mới: `grab` (tầm túm), `throw` (tốc độ ném), `grabCd` |
| 🎰 HỖN LOẠN | Pitch Tilt | **Đồ lăn xuống dốc**: sân nghiêng mạnh tới mức **đồ trên phố trượt theo**: thùng rác, lốp xe, xe đẩy chợ lăn từ mép sân phía mình về phía khung đối thủ, **quét ngã ai đứng trên đường** (cả đồng đội) | Camera nghiêng rõ hơn, khung nền (khán giả, tường) trượt theo; đồ có bóng đổ + tiếng lăn lạch cạch, mép sân rung | Đồ lăn thẳng, xuất hiện từ mép (thấy trước 0.5s): bước sang bên / né Z · chờ hết giờ | `time` 4.2 → 3.8, `tilt` 90 giữ, mới: `junk` (số đồ), `junkEvery`, `junkSpeed` |

Kiểm trùng (với 36 chiêu hiện tại):
- Lồng sét ≠ Thunderstorm (sét rơi theo vòng cảnh báo), ≠ Iron Chain (xích nối người).
- Dây đàn ≠ Iron Chain: dây nằm cố định trên sân theo đường bóng đã đi, chỉ khựng một lần cuối chuỗi.
- Cú đập thứ hai ≠ Cannonball (Cannonball nổ khi chạm đất rồi tự nảy; ở đây người chơi phải tự bấm, chỉ khi bóng bị đỡ ra).
- Combo dây chuyền ≠ Pinball Kick (Pinball: người dùng nảy như bi; ở đây đấm tại chỗ từng người).
- Trăng đi theo ≠ Mega Magnet (không hút, chỉ nhấc người trong vòng).
- Phân thân ở lại: Clone Army vẫn là chiêu phân thân duy nhất của ẢO ẢNH, chỉ kéo dài vai trò.
- Túm và ném ≠ Slingshot (Slingshot phóng đồng đội, có lợi; đây ném đối thủ làm bi bowling).
- Đồ lăn ≠ Mega Boomerang / Monster Truck (đồ không ai lái, lăn thẳng theo dốc).

## 4. Dáng thức tỉnh chung (mọi ★★)

| Phần | Bây giờ | Đề xuất |
|---|---|---|
| Cut-in | Như X3 + chữ ★★ | Khung cut-in riêng: viền vàng 2 lớp, nền màu trường phái có tia toả, chữ **AWAKENED** nhỏ trên tên, dài hơn ~0.15s (`ultimate.cutInAwaken`) |
| Lúc ra chiêu | Vòng sóng + chớp sáng | Giữ, thêm vết nứt sáng màu trường phái dưới chân + màn hình viền màu trường phái 0.5s |
| Hình thái (`VFX.form`) | Vài pixel nhỏ, HỖN LOẠN chưa có | Rõ hơn: hào quang màu trường phái bao người (nhấp nháy nhẹ), mắt phát sáng; thêm ca **HỖN LOẠN** (tia màu cầu vồng nhiễu) |
| Âm thanh | Câu cut-in theo trường phái | Thêm 1 lớp "thức tỉnh" chồng lên câu cut-in + mỗi nét mới một tiếng riêng (`ultsfx.js`, ghi trong `docs/SFX.md`) |
| ULT BOOK ô ★★ | Cùng lá + cùng ảnh động với X3 | Ảnh động riêng cho nét mới (`corepreview.js SCENES['<id>:2']`), desc riêng 1 dòng |

## 5. Kỹ thuật

- **Giữ id**: ô sổ `id:2` không đổi → không cần `ults.renamed`, không đổi hồ sơ. Nét mới bật bằng tham số chỉ có trong `evolve[0]`
  (vd. `cage`, `chain`, `grab`); hành vi kiểm `prm.<tham số>` nên X3 không đổi gì.
- **Config**: thêm `evolveDesc` (1 dòng 7–10 chữ, không số) cho ô ★★ trong ULT BOOK + cut-in; i18n 4 gói + dựng lại font ja.
- **Hành vi**: `cores-ult2.js` (Light Cycle, Moon Stomp), `cores-new.js` (6 chiêu còn lại). Mỗi nét mới có `aiUse` (vd. AI Titan biết túm ném,
  AI Meteor biết đập lại) + AI biết né (thêm vào chỗ AI đang né vật thể / vòng báo trước).
- **Vẽ**: vật thể mới (`lồng sét`, `dây đàn`, `trăng di động`, `hồn đấu sĩ`, `đồ lăn`) qua `Effects.prop` + `drawProp` (`render/vfx.js`); lớp phủ
  (lưới neon, khuông nhạc, trời đỏ, đêm trăng) theo mẫu `dark` / `tilt`. Hàm `Effects` mới nào cũng thêm vào `capture` ở `sync.js`.
  Trạng thái người mới (bị túm / đang bay khi bị ném) thêm vào `PF` nếu render cần.
- **Online**: định dạng gói tin không đổi, id không đổi → **không tăng `net.protocol`**. Máy chủ trận chạy mô phỏng (ranked), nên ★★ mới chỉ có ở
  trận trên máy chủ sau khi build + deploy image lại (chỉ khi user yêu cầu); trước đó trận trên máy chủ vẫn ★★ cũ, không lỗi.
- **Phòng test**: `?ulttest` + `\` đã bật ★★ sẵn; thêm dòng mô tả nét mới vào bảng phòng test.
- **Cân số**: giả lập như các đợt trước (AI đánh AI, cách khung 200–330px, 6 giây sau khi ra chiêu). Mục tiêu: ★★ hơn X3 khoảng **+5–10 điểm %**
  ra bàn (hoặc số lượt người bị hạ với chiêu không nhằm ghi bàn), không chiêu nào quá ~45%.

Thứ tự làm:
1. Khung chung: `evolveDesc`, cut-in AWAKENED, form rõ hơn + HỖN LOẠN, lớp âm thức tỉnh.
2. 8 nét mới + VFX + SFX + AI.
3. Ảnh động ULT BOOK ★★, i18n, font ja, docs (`SFX.md`, `ULT_RECIPE.md`, AGENTS.md).
4. Giả lập cân số, ghi kết quả vào file này.

## 6. Cần user chốt

| # | Câu hỏi | Đề xuất |
|---|---|---|
| 1 | ★★ có **tên riêng** hay giữ tên + ★★? | **Tên riêng**, lấy từ tên cũ nhưng nghe lực hơn; **không hiện ★★ nữa** ở đâu cả |
| 2 | Nét mới cần **bấm thêm** có ổn không? | Ổn |
| 3 | 8 nét mới: giữ / đổi chiêu nào? | Giữ, chỉ đổi Hundred Fists: **lượt sau là lướt tới, né được để ngắt** |
| 4 | Đồ lăn quét cả đồng đội? | Ổn |
| 5 | Hạ bớt số tăng thuần? | Ổn |

## 7. Đã làm (2026-10-25)

**Tên dạng thức tỉnh** (`list[id].awaken = { name, desc }`, đọc qua `CoreSystem.ultName / ultDesc / awaken`):

| X3 | X4 (thức tỉnh) | desc |
|---|---|---|
| Light Cycle | **Storm Cycle** | Close a lightning loop to fry everyone trapped inside. |
| Endless Tiki-Taka | **Eternal Tiki-Taka** | Three-way passing leaves harp strings that freeze opponents. |
| Meteor Shot | **Meteor Breaker** | Meteor smash, and smash again if the ball rebounds. |
| Hundred Fists | **Thousand Fists** | Punch barrage, then dash on to chain more victims. |
| Moon Stomp | **Full Moon Stomp** | Your moon zone follows you, lifting everyone nearby. |
| Clone Army | **Clone Legion** | Clones stay on the pitch to block and tackle. |
| Titan | **Mega Titan** | Grow giant, grab opponents and bowl them over. |
| Pitch Tilt | **Pitch Landslide** | Tilt so hard the street junk slides down too. |

**Bỏ ★★ khỏi mọi chỗ**: cut-in, ô X trên HUD (+ CSS `.ult-lv`), banner ULTIMATE EVOLVED!, RecipeFx (lá + tên), ULT BOOK (cột cuối = icon vương miện, dòng công thức chỉ còn "IRON ×4"),
phòng test (bảng + banner). Id không đổi → ô sổ `id:2` giữ nguyên, không cần `ults.renamed`.

**Khung chung**: cut-in thức tỉnh dài hơn (`ultimate.cutInAwaken` 0.75s), viền vàng 2 lớp + tia toả màu trường phái + chữ AWAKENED (tham số `sub` của `Effects.cutIn`);
lúc ra chiêu thêm vết nứt sáng + viền màn hình màu trường phái; `VFX.form` thêm hào quang + mắt phát sáng, thêm ca HỖN LOẠN (cầu vồng nhiễu);
lớp âm `awaken` + 14 tiếng mới (`docs/SFX.md`); lá Core nhận cấp (`Gacha.coreCard(id, cls, w, h, lv)`) và ảnh động riêng `data-preview="id:2"` (`corepreview.js SCENES['<id>:2']`).

**Vật thể mới** (`Effects.prop`, vẽ ở `render/vfx.js`): `grid` `trail2` `cage` (Storm Cycle) · `staff` `harp` `harpz` (Eternal Tiki-Taka) · `skyfire` `rebound` (Meteor Breaker) ·
`dashline` `stand` (Thousand Fists) · `moonf` `fullmoon` (Full Moon Stomp) · `chrome` (Mega Titan) · `junkwarn` `junk` (Pitch Landslide; vị trí = x + a·t, máy khách tự tính).
Clone Legion dùng `Effects.decoy` có cờ `legion` (vẽ `VFX.legion`, không dắt bóng); snapshot `hz.d` thêm phần tử thứ 6 = 1 (máy cũ bỏ qua, chỉ vẽ thêm quả bóng giả).
`Effects.tilt` thêm `amt` (Landslide nghiêng ×1.6). **Không tăng `net.protocol`** (id + định dạng gói không đổi); trận trên máy chủ riêng chỉ có bản mới sau khi build + deploy image.

Khác bản đề xuất:
| Chiêu | Khác gì |
|---|---|
| Meteor Breaker | Bỏ tăng `jump` / `speed` của ★★ cũ: giả lập cho thấy bóng tới khung lúc còn quá cao → **đập xà** (bản ★★ cũ yếu hơn X3). Bấm sút có đệm: bấm lúc còn đang rơi từ cú nhảy vẫn tính |
| Mega Titan | Tầm túm = `grab` × cỡ khổng lồ × 0.75 (~72px): tầm 40px cố định thì lúc gồng đòn mạnh đối thủ đã chạy ra, luôn MISS. Đứng sát quá thì vẫn bị dẫm (luật X3) |
| Pitch Landslide | 4 món (đề xuất 6), to ×1.5 cho dễ thấy; không quét thủ môn đang trong vòng cấm (tránh khung trống chắc ăn) |
| Storm Cycle | AI tự chạy 1 vòng quanh đối thủ gần nhất để khép lồng (người chơi tự vẽ) |

**Giả lập** (AI đánh AI, xuất phát cách khung 200–330px, % ra bàn trong 6s / số lượt đối thủ bị choáng mỗi lần dùng, 100–250 lượt mỗi cấp; dao động ±5–7 điểm giữa các lần chạy):

| Chiêu | X3 | X4 |
|---|---|---|
| Light Cycle → Storm Cycle | 16% / 4.2 | 19% / 5.4 (lồng khép ~40% lần dùng của AI) |
| Endless Tiki-Taka → Eternal | 7–15% / 0.8 | 11–25% / 1.0–1.2 |
| Meteor Shot → Breaker | ~99% | ~99% (cú đầu đã gần chắc bàn trong tình huống này; nét mới chỉ chạy khi bị đỡ ra / chạm cột) |
| Hundred Fists → Thousand | 14–17% / 1.7 | 21–25% / 2.2 |
| Moon Stomp → Full Moon | 20% / 2.5 | 23% / 3.0 |
| Clone Army → Legion | 10–14% / 0.8–1.0 | 13–23% / 0.7 |
| Titan → Mega Titan | 31% / 3.3 | 41% / 4.0 |
| Pitch Tilt → Landslide | 8–12% / 1.1 | 24% / 1.8 |

Đã thử trong game (phòng test, bấm nút thật): lồng sét khép + LOCKED!, chuỗi lướt 20 → 30 HIT, trăng đi theo + HOME RUN, 3 phân thân ở lại sân, túm → BOWLING → STRIKE,
REBOUND → bấm sút → BREAK!, dây đàn rung khi chuỗi bị cắt, đồ lăn + biển báo; ULT BOOK cột vương miện + lá Mega Titan. Không có lỗi console.
