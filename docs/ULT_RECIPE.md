# TUYỆT KỸ THEO CÔNG THỨC — Bỏ tài nguyên + Cộng hưởng, mốc trường phái mở Tuyệt kỹ

> Trạng thái: **ĐÃ LÀM THỬ bước A + B + C (2026-10-13)**: 8 Tuyệt kỹ lai đầu tiên, rồi **đủ 21 cặp (2026-10-14)**. Cân bằng để sau.
> **Thay cho:** 4 tài nguyên trường phái (Đà / Nhịp / Nộ / Giáp), 21 bonus Cộng hưởng 2/3/4, Tuyệt kỹ đặc trưng chọn trước trận (CHARACTER › ULTIMATE, `docs/CORE_DESIGN.md` giai đoạn 9).
> **Giữ nguyên:** năng lượng Tuyệt kỹ (nạp khi ghi bàn / bị thủng lưới / cướp bóng / đấm trúng), 5 lượt chọn Core, Core Road (`docs/CORE_ROAD.md`).

### Vấn đề
- Thiếu động lực chơi tiếp từ trận này qua trận khác, thiếu động lực thử build mới (so với Balatro: 1 run dài, nhiều lựa chọn; ARAM: ít lựa chọn nhưng nhân với pool tướng).
- Mốc Cộng hưởng khó hiểu, tác dụng không rõ. Tài nguyên (tích Đà, Nhịp, Nộ...) khó hiểu.

### Quyết định đã chốt

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Tài nguyên trường phái | **Bỏ cả 4**: Đà, Nhịp, Nộ, Giáp (Giáp bỏ hẳn, không giữ làm hiệu ứng riêng). Năng lượng Tuyệt kỹ giữ |
| 2 | Mốc trường phái | Đạt mốc N của trường phái X (hoặc tổ hợp X + Y) → **mở 1 Tuyệt kỹ** thay cho bonus Cộng hưởng |
| 3 | Bậc 3 / bậc 4 | **Dạng tiến hoá** của Tuyệt kỹ bậc 2 cùng trường phái (★★ / ★★★), không phải chiêu khác hẳn |
| 4 | Hiển thị | **Mọi Tuyệt kỹ đều giấu** trong sổ, chỉ hiện khi người chơi đã khám phá |
| 5 | Phần thưởng Area | **Chỉ còn Core** (bỏ `areas[].ult`) |
| 6 | Tuyệt kỹ của người khác | Cut-in **hiện tên bình thường** (kể cả Tuyệt kỹ mình chưa khám phá) — thấy là muốn thử |
| 7 | Bảng đề xuất 22 Core | User bảo "triển khai thử" → làm theo bảng mục 1 |

### Cập nhật 2026-10-13 (sau khi làm thử) — user chốt lại
| # | Chủ đề | Quyết định |
|---|---|---|
| 8 | Số lần chọn Core | **4 lần / trận**, gồm lượt trước giao bóng (`game.match.maxUpgrades = 4` → lượt ở giây 0 · 30 · 60 · 90, lượt 2–4 vẫn chỉ mở sau bàn thắng) |
| 9 | Mốc | **X3 = mở Tuyệt kỹ gốc · X4 = dạng nâng cấp** (★★, 1 dạng duy nhất — `ults.tiers = [3, 4]`, `evolve` còn 1 bộ số = bộ ★★★ cũ). Thay cho X2 / X3 / X4 ở bảng dưới |
| 10 | Tuyệt kỹ lai | Mở khi đạt **X2 + Y2** (`ults.hybridTier = 2`). Đủ 21 cặp (bảng ở mục Tuyệt kỹ lai bên dưới) |
| 11 | Aura Farming | **Tạm ẩn**: không ai mang Tuyệt kỹ khởi đầu, ô X chỉ hiện khi đạt công thức (`ults.start = null`). Năng lượng vẫn nạp ngầm từ đầu trận. Cảnh ông nội trao bí kíp trong PROLOGUE cũng ẩn (`SFC_FTUE_HEIRLOOM_ON = false`) |

Giả lập 60 trận AI vs AI với luật mới: 58/60 trận đủ 4 lượt · Tuyệt kỹ trường phái đầu tiên ~giây 92 ·
**41% cầu thủ hết trận vẫn cầm Aura Farming** (chưa đạt X3) · ~22% đạt bản nâng cấp X4 · Tuyệt kỹ trường phái được dùng ~0.5–1 lần / trận.
Tuyệt kỹ lai (X2 + Y2) sẽ đỡ phần "kẹt Aura Farming" — cần làm nội dung.

### Cập nhật 2026-10-13 (lần 4) — bốc lá + đoạn diễn mở Tuyệt kỹ (user chốt, đã làm)
| # | Chủ đề | Quyết định |
|---|---|---|
| 16 | Bảo đảm hướng ở lượt chọn | **Bỏ** (`draft.guaranteeFromRound` xoá): ra đúng build phải là cảm giác *may mắn*. Vd. người mới có 2 lá SÁT THỦ: lượt 3 có lá SÁT THỦ ~26% (trước 100%) |
| 17 | REROLL | **Bật lại**: 1 lần / lượt chọn (`draft.rerollsPerRound = 1`, phím R / nút REROLL; online đã có sẵn) |
| 18 | Đoạn diễn mở Tuyệt kỹ | Chọn lá đạt công thức → **RecipeFx** (`src/ui/recipefx.js`) diễn ~3s *trước* khi gửi lượt chọn: các lá cùng trường phái rơi vào ô công thức ("TIKI-TAKA ×3", lá vừa chọn viền vàng) → nhóm loé sáng → mũi tên → lá Tuyệt kỹ lật ra (chưa khám phá: lá úp ??? lật). Lai: 2 nhóm "STRIKER ×2 + TIKI-TAKA ×2". Nâng cấp: 4 lá + ★★, tiêu đề ULTIMATE EVOLVED!. Enter / click bỏ qua; online chỉ diễn khi đồng hồ chọn còn ≥ 4s. Diễn rồi thì banner NEW ULTIMATE trong trận không hiện lặp |

### Cập nhật 2026-10-13 (lần 3) — bỏ Core 2 hệ + review Tuyệt kỹ (user duyệt, đã làm)
| # | Chủ đề | Quyết định |
|---|---|---|
| 12 | Core cầu nối 2 hệ | **Bỏ**: 11 lá đổi về 1 hệ (bảng ở `docs/CORE_ROAD.md`). Tuyệt kỹ lai giờ cần đúng 2 + 2 lá riêng |
| 13 | Luật 1 — chiêu cần bóng | `needsBall`: Meteor Shot, Endless Tiki-Taka, Comet One-Two, Phantom Barrage, Slingshot chỉ bấm được khi đội mình cầm bóng (ô X mờ), **không bao giờ giật bóng**; mất bóng trong lúc cut-in thì chiêu xịt |
| 14 | Luật 2 — báo trước + né Z | Hundred Fists / Rising Dragon **lao tới nhìn thấy được** (không dịch chuyển, `CoreHelpers.rush`), lướt Z kịp là trượt · Lightning Dash / Comet Dropkick vạch đường lao 0.35s trước · Iron Hammer gồng 0.4s + vòng bóng đổ · Clone Army, Meteor Drop, Slingshot: né Z được · Endless Tiki-Taka chuyền **thật** (nhanh hơn, đối thủ đứng đúng chỗ vẫn cắt được) |
| 15 | Luật 3 — bất khả xâm phạm ngắn | Mirage Sprint vẫn đánh trúng được (chỉ vẽ mờ) · Titan chậm 15% · Steel Formation 4s → 3s |

Đã kiểm (giả lập ngầm): đối thủ cầm bóng → 5 chiêu needsBall không bấm được, không ai giật bóng; 6 chiêu trúng chắc trước đây giờ trượt khi mục tiêu lướt Z đúng lúc.

### Tuyệt kỹ lai — ĐÃ DUYỆT + ĐÃ LÀM cả 8 (2026-10-13)
Hành vi: `src/systems/cores-hybrid.js` · config: `cores.list` (`hybrid: true`) + `ults.hybrids` · cảnh xem trước: `corepreview.js` · icon: mượn hình Core cầu nối, đổi màu.
Trạng thái mới: Steel Formation = `CoreSystem.passGuarded(team)` + `p.armorT` cho cả đội · Mirage Sprint = `p.ghostT` (tàng hình: `Game.isProtected`, vẽ mờ người + bóng, đồng bộ online qua `PF`).
Giả lập 60 trận AI vs AI sau khi có lai: cầu thủ cả trận không có Tuyệt kỹ giảm 42% → 24%.
Rising Dragon có hình rồng lửa thật: viên gạch VFX mới `E.dragon(x0, y0, x1, y1, t, color, coil, amp)` (`systems/vfxkit.js`, vẽ ở `render/vfx.js → drawDragon`, đồng bộ online qua `sync.js` capture) — rồng cuộn xoắn bay lên lúc móc hàm, rồng thứ hai lao bổ theo cú đá.
7 cặp có sẵn Core cầu nối (lá cầu nối tính cho cả 2 trường phái → 2+2 dễ đạt hơn), mỗi trường phái góp đúng 2 cặp.
| Cặp | Core cầu nối | Tên | Làm gì | desc trên lá |
|---|---|---|---|---|
| SÁT THỦ + TIKI | One-Two | **Comet One-Two** | Bóng hoá tia vàng sang đồng đội gần nhất rồi bật về, bạn vô-lê tối đa xuyên người | Instant one-two with a teammate, then a piercing volley. |
| ĐẤU SĨ + VÕ SĨ ĐÁ | Long Quyền | **Rising Dragon** | Lao tới đối thủ gần nhất, móc hàm hất lên, nhảy theo đá văng vào tường, bóng rơi về chân | Uppercut them skyward, then dropkick them into the wall. |
| TỐC ĐỘ + VÕ SĨ ĐÁ | Phi Cước | **Comet Dropkick** | Phóng ngang sân thành cú đá bay bốc lửa theo hướng ngắm, hất tung mọi người trên đường, để vệt lửa | Rocket across the pitch in a flaming dropkick. |
| ẢO ẢNH + SÁT THỦ | Bóng Ma | **Phantom Barrage** | Bạn + 3 phân thân cùng sút một lúc, chỉ 1 quả thật, thủ môn đoán mò | Your clones all shoot too; only one ball is real. |
| THÉP + TIKI | Đội Trưởng | **Steel Formation** | Cả đội hoá bạc vài giây: miễn choáng, đường chuyền không bị cắt (Tuyệt kỹ cả đội đầu tiên) | Your whole team turns steel: stun-proof, unbreakable passes. |
| ĐẤU SĨ + THÉP | Nắm Đấm Sắt | **Iron Hammer** | Nắm đấm thép khổng lồ nện xuống hình nón trước mặt: choáng hết, bóng rơi về chân, bạn miễn choáng | A giant steel fist hammers down, flattening everyone ahead. |
| TỐC ĐỘ + ẢO ẢNH | Chạy Giả | **Mirage Sprint** | Bạn tàng hình (không bị nhắm), một bầy ảo ảnh dắt bóng giả toả ra mọi hướng | Vanish mid-sprint while fake runners scatter with fake balls. |
| *(tuỳ chọn)* ĐẤU SĨ + TIKI | Tay Cao Su | **Slingshot** | Vươn tay túm đồng đội đang cầm bóng, bắn họ như ná về phía khung thành | Stretch your arms and slingshot a teammate at the goal. |

### 13 cặp còn lại — ĐÃ LÀM (2026-10-14, user: "làm đủ 13 tuyệt kỹ")
Chỉ dùng viên gạch VFX + cờ bóng / skin bóng có sẵn → online không đổi định dạng gói tin (không tăng `net.protocol`).
Mọi đòn có báo trước + né được bằng Z; chiêu sút / chuyền có `needsBall`. Icon mượn hình Core thường, đổi màu (`pixelicons.js`).
| Cặp | Tên | Làm gì | desc trên lá |
|---|---|---|---|
| TỐC ĐỘ + TIKI | **Lightning Relay** | Vạch sét 0.3s, bóng hoá tia sét sang đồng đội đứng cao nhất (giật người đứng chắn), người nhận +40% tốc độ 2.5s | The ball zaps to your furthest teammate, who bursts forward. |
| TỐC ĐỘ + SÁT THỦ | **Flash Strike** | Người cầm bóng vạch đường 0.3s, hoá sét lao 120px (giật người trên đường), tới nơi sút sấm xuyên 2 người | Blitz forward as lightning, then fire a thunder shot. |
| TỐC ĐỘ + ĐẤU SĨ | **Thunder Rush** | Lao zigzag (`CoreHelpers.rush`, né Z được) qua tối đa 3 đối thủ gần nhất, mỗi người 1 cú đấm sét, bóng rơi về chân | Zigzag through nearby opponents, punching each one in turn. |
| TỐC ĐỘ + THÉP | **Steel Express** | Vạch đường 0.35s, hoá thép (miễn choáng chỉ lúc lao) húc thẳng 220px, hất văng mọi người trên đường | Turn to steel and charge straight through anyone ahead. |
| TIKI + VÕ SĨ ĐÁ | **Sky Volley** | Bổng bóng (không ai chạm được) về phía đồng đội đứng cao nhất, người đó bật lên đá móc vào khung; sóng chấn dưới chân (vòng báo trước suốt lúc bóng bay) | Lob it skyward; a teammate leaps and smashes it goalward. |
| TIKI + ẢO ẢNH | **Ghost Pass** | Phân thân chuyền 4 bóng giả toả ra (AI đối thủ đuổi nhầm), đường chuyền thật bay xuyên người cắt (`b.fx.ghost`) | Fake passes fly everywhere; the real one ghosts through. |
| SÁT THỦ + ĐẤU SĨ | **Knockout Volley** | Gồng 0.3s (vòng đỏ = tầm đấm), đấm văng mọi đối thủ quanh người rồi sút lửa | Punch out everyone around you, then fire a burning shot. |
| SÁT THỦ + VÕ SĨ ĐÁ | **Cannonball** | Bóng hoá bom, nổ (hố + hất tung) ở chỗ chạm đối thủ đầu tiên, kể cả tay thủ môn; vào lưới thì lưới nổ; đồng đội đỡ thì tháo ngòi | A shot so heavy it blows up whatever it hits. |
| SÁT THỦ + THÉP | **Wrecking Ball** | Người sút hoá thép 1.5s, bóng sắt (skin bowling, chậm hơn 15%) xuyên 4 người, nứt sân dọc đường | Fire an iron ball that bowls over everyone ahead. |
| ĐẤU SĨ + ẢO ẢNH | **Shadow Ambush** | Phân thân hiện sau lưng tối đa 3 đối thủ (0.4s báo trước), cùng đấm văng họ về phía bạn | Clones pop up behind opponents and punch them all. |
| VÕ SĨ ĐÁ + ẢO ẢNH | **Crossfire Kicks** | 3 phân thân vây 1 đối thủ, vạch đường đá 0.45s rồi cùng đá bay xuyên qua, hất tung | Clones fly-kick in from every side at one opponent. |
| VÕ SĨ ĐÁ + THÉP | **Iron Quake** | Hoá thép, 3 cú dậm tiến dần về phía trước (vết lõm báo trước), mỗi cú hất tung người đứng gần | Three armored stomps quake forward, launching everyone nearby. |
| ẢO ẢNH + THÉP | **Mirror Wall** | 5 phân thân thép đứng thành tường giữa bóng và khung thành nhà 3.5s: bóng đối thủ đá trúng bật lại, người không đi xuyên qua (không gây choáng) | A wall of steel clones blocks passes and shots. |

Giả lập 60 trận AI vs AI: cầu thủ hết trận cầm Tuyệt kỹ lai 5% → 12%; không ai có Tuyệt kỹ 55% → 52%. Phần còn lại là người ra
2 + 1 + 1 / 1 + 1 + 1 + 1 (không công thức nào thoả) — không phải do thiếu cặp.
ULT BOOK vẽ thành bảng ghép cặp 7×7 (hàng / cột = trường phái, đường chéo = gốc, dưới chéo = lai, cột cuối = ★★).

## 1. Bỏ tài nguyên

**TOÉ ĐIỆN** (`cores.surge`, `p.surge`): người có Core TỐC ĐỘ chạy nước rút liên tục ~1.2s thì toé điện (tia điện quanh người,
vòng xanh dưới chân) và nhanh hơn 6%. Thay cho Đà đầy. Quỷ Tốc Độ rút ngắn thời gian này (`mods.surgeTime`).
**Miễn choáng ngắn** (`p.armorT`): Nắm Đấm Sắt / Đội Trưởng, chặn trong `CoreSystem.blockHit` (chữ CLANG!).
**Chuỗi chuyền** (`g.passChain`): +1 mỗi đường chuyền tới chân, mất bóng / giao bóng về 0 — chỉ Giao Hưởng dùng.

Nguyên tắc thay thế: **Core kích hoạt bằng trạng thái nhìn thấy được, không bằng thanh đếm** — đang chạy nước rút, vừa nhận bóng,
vừa đấm trúng, hoặc hồi chiêu (chiêu sẵn sàng thì phát sáng trên người).
Bỏ luôn: `cores.resources`, `archetypes[].mech/resource`, dòng `BUILDS / SPENDS` trên lá Core (`roleLabels` gen/use), bộ đếm tài nguyên trên HUD + hình tài nguyên trên người (`vfx.js`).

22 Core đang dựa vào tài nguyên — **đề xuất, chờ duyệt**:

| Core | Hiện tại | Đề xuất |
|---|---|---|
| `speed_demon` | Chạy nước rút tích Đà nhanh hơn | Chạy nước rút nhanh hơn, nhanh hơn khi không cầm bóng |
| `burst_start` · `fake_run` · `counter_attack` | Có cho thêm Đà | Bỏ phần Đà, giữ hiệu ứng chính |
| `sonic_boom` | Đà đầy: hất văng hậu vệ chạm phải | Chạy nước rút liên tục ≥ ~1.5s (người toé điện) + cầm bóng: hất văng hậu vệ chạm phải |
| `freight_train` | Đà cao: húc bay người | Chạy nước rút liên tục ≥ ~1.5s rồi húc: hất bay (giữ hồi chiêu) |
| `flying_kick` | Hard attack tiêu Đà để bay xa | Hard attack khi đang chạy nước rút: bay xa, hất mạnh (cố định) |
| `maestro` · `one_touch` | Có cho thêm Nhịp | Bỏ phần Nhịp, giữ hiệu ứng chính |
| `phantom_pass` | Có Nhịp: chuyền xuyên tuyến thành tia vàng | Chuyền xuyên tuyến chạm đầu tiên (ngay sau khi nhận bóng): tia vàng không cắt được |
| `symphony` | Tiêu Nhịp cho cú sút khó bắt | Sút sau chuỗi 3 đường chuyền liên tiếp của đội (chữ "PASS x3" trên bóng, mất bóng về 0). Tránh trùng `one_two` |
| `street_fighter` · `fist_storm` · `counter_strike` · `hundred_fists` | Có cho thêm Nộ | Bỏ phần Nộ, giữ hiệu ứng chính |
| `giant_fist` | Nộ đầy: cú đấm khổng lồ luôn cướp | Hồi chiêu ~8s, nắm tay phát sáng khi sẵn sàng → cú đấm khổng lồ luôn cướp |
| `uppercut` | Nộ đầy: móc hàm hất tung | Combo: Hard attack trong ~1s sau 1 cú Light trúng → hất tung, bóng rơi về chân |
| `iron_body` | Mỗi người 1 Giáp chặn 1 lần choáng | Choáng ngắn hơn, bị đẩy lùi ít hơn (tia lửa bật ra khi trúng đòn) |
| `bulldozer` | Có Giáp + cầm bóng: hoá to, húc đổ | Cầm bóng ≥ ~1s: hoá to, không bị đấm rơi bóng, húc đổ người; hồi chiêu |
| `iron_fist` | Có Giáp: đấm luôn cướp, không bị choáng | Đấm trúng: miễn choáng ~1s (viền bạc) |
| `captain` | Người nhận chuyền được 1 Giáp | Người nhận chuyền miễn choáng ngắn (viền bạc) |
| `giant_keeper` | Tự có tối thiểu 1 Giáp | Bỏ phần Giáp, giữ hiệu ứng chính |

Bonus thụ động gắn với tài nguyên cũng mất (Nộ +tỉ lệ cướp / +tốc độ, Đà +tốc độ, Nhịp +tốc độ chuyền) → **cân bằng lại** (TỐC ĐỘ đang 65% nhờ Đà).

## 2. Tuyệt kỹ theo công thức

### Công thức

| Mốc | Tuyệt kỹ |
|---|---|
| Chưa đạt công thức nào | **Aura Farming** (quà PROLOGUE, ai cũng có) |
| X2 | Tuyệt kỹ gốc của trường phái X |
| X3 | Tuyệt kỹ gốc ★★ (tiến hoá: to hơn, thêm hiệu ứng, đổi hình) |
| X4 | Tuyệt kỹ gốc ★★★ |
| X2 + Y2 | Tuyệt kỹ lai (danh sách chưa chốt, làm dần) |

Tuyệt kỹ gốc: TỐC ĐỘ `lightning_dash` · TIKI-TAKA `endless_tiki` · SÁT THỦ `meteor_strike` · ĐẤU SĨ `hundred_fists` · VÕ SĨ ĐÁ `meteor_drop` · ẢO ẢNH `clone_army` · THÉP `titan`.
→ 7 × 3 = **21 dạng đơn** + lai.

- Đếm như Cộng hưởng cũ: Core cầu nối tính cho cả hai trường phái, Tuyệt kỹ không tính. HỖN LOẠN không có công thức (chưa chốt).
- **1 ô X.** Đạt công thức mới → thay Tuyệt kỹ đang có. Nhiều công thức cùng thoả → công thức dùng nhiều Core hơn thắng; bằng nhau → công thức vừa đạt.
- **Lá Core ở lượt chọn ghi trước kết quả**: "→ ??? NEW ULTIMATE" (chưa khám phá) hoặc "→ METEOR SHOT ★★" (đã khám phá). Chọn lá = chọn Tuyệt kỹ.
- **Năng lượng giữ nguyên khi đổi Tuyệt kỹ.** Lý do: bậc 4 sớm nhất mở sau giây 72; nạp lại từ 0 thì có thể không bao giờ dùng được (hiện ~0.7–1 lần / trận).
- Core Road tự khoá mốc: chưa sở hữu đủ 4 lá trường phái X thì không thể đạt X4 (bộ khởi đầu chỉ TIKI-TAKA và ĐẤU SĨ đủ 4 lá) → không cần hệ mở khoá Tuyệt kỹ riêng.

### Khám phá
- **Mọi Tuyệt kỹ đều giấu** (kể cả công thức), trừ Aura Farming. Khám phá = tự đạt công thức trong trận.
- Lần đầu khám phá: cut-in "NEW ULTIMATE" + ghi vào sổ.
- **Sổ Tuyệt kỹ** (trang mới): ô đã khám phá hiện chiêu + công thức + ảnh động; ô chưa khám phá là "???", chỉ hiện tổng "7 / 28".

### Meta
- Bỏ CHARACTER › ULTIMATE, `Profile.data.ult`, `ownedUlts()`, `progression.defaultUlt` (Aura Farming thành Tuyệt kỹ khởi đầu trận).
- `areas[].ult` không còn là phần thưởng → Area cần phần thưởng thay thế; GOAT PATH bỏ khung Tuyệt kỹ trên đảo.
- Hồ sơ lưu Tuyệt kỹ đã khám phá (vd. `Profile.data.ultBook`).

### Online / AI
- `sync.js`: bỏ `momentum / rage / guard` khỏi `RS`; Tuyệt kỹ đổi giữa trận phải đồng bộ (`p.ult`). Tăng `net.protocol`, deploy lại server.
- AI bốc theo trọng số build sẵn có → tự đạt công thức. Dạng ★★ / ★★★ cần `aiUse` như dạng gốc.

## 3. Thứ tự làm
- **A. Bỏ tài nguyên + bỏ Cộng hưởng**: sửa 22 Core (mục 1) + cảnh xem trước (`corepreview.js`), bỏ dòng tài nguyên trên lá / HUD / người, sync + protocol. Giả lập AI vs AI cân bằng lại, chơi thử.
- **B. Tuyệt kỹ theo công thức**: 7 gốc + 14 dạng tiến hoá, luật thay Tuyệt kỹ, lá chọn ghi trước kết quả, giữ năng lượng, Sổ Tuyệt kỹ, bỏ CHARACTER › ULTIMATE.
- **C. Tuyệt kỹ lai**: làm dần.

## 4. Đã làm (2026-10-13)

| Phần | Chỗ |
|---|---|
| Config | `cores.config.js`: bỏ `resources` / `sets` / `archetypes[].mech`, thêm `surge`, `ults`, `list[ult].evolve`; 22 Core sửa theo mục 1. `mainpath.config.js`: bỏ `areas[].ult`. `progression.defaultUlt`, `teammates.deck.ultChance` bỏ |
| Mô phỏng | `CoreSystem`: `schools`, `recipes`, `bestRecipe`, `setUlt` (sự kiện `ultUnlock`), `updateStates` (TOÉ ĐIỆN / Xe Ủi / nắm tay sáng), `sp` ghép `evolve` theo `p.ultLv`; `formOf` = hình thái ★★★. `match.js`: mọi cầu thủ mang `ults.start`, `g.passChain` |
| Online | `sync.js`: `PF` thêm `surge`, `fistRdy`, `ultLv`; `RS` chỉ còn `ult`; bỏ `rh`. `net.protocol` 6 → 7, máy chủ `7.0.0` (chưa build / đẩy image) |
| UI | Lá Core ghi "→ ??? NEW ULTIMATE" / "→ TÊN ★★" (`card-ultnext`) · HUD + Pause: bậc thang 2 › 3 › 4 kèm tên Tuyệt kỹ (??? nếu chưa khám phá) · banner NEW ULTIMATE DISCOVERED! / ULTIMATE EVOLVED! · ô X có sao · cut-in "TÊN ★★★" · CHARACTER › **ULT BOOK** (thay trang ULTIMATE) · bỏ bộ đếm tài nguyên, bỏ Tuyệt kỹ ở thẻ người chơi / intro / thẻ Area |
| Hồ sơ | `Profile.data.ultBook` (khoá `id:cấp`), `ultEntries / ultKnown / discoverUlt`; thành tựu `ults` = số ô đã khám phá |

Giả lập AI vs AI 40 trận (đội AI bốc từ toàn bộ Core): công thức đầu tiên ~giây 55, ★★★ ~giây 98; **~60% cầu thủ AI đạt ★★★**
(AI dồn trường phái rất mạnh nhờ `buildWeight` + bảo đảm hướng + thiên hướng đội) · Tuyệt kỹ ~2.5 lần / cầu thủ / trận.

## 5. Chưa chốt / để sau
- Tuyệt kỹ lai (bước C): cặp nào, bao nhiêu cái lúc ra mắt (`ults.hybrids`).
- ~~HỖN LOẠN có công thức không~~ → **có** (2026-10-14, xem mục Hỗn loạn bên dưới).
- Cân bằng: ★★★ quá dễ đạt nếu dồn 1 trường phái (núm: `draft.buildWeight`, `guaranteeFromRound`, `ults.tiers`); bỏ tài nguyên làm TỐC ĐỘ / ĐẤU SĨ yếu đi.
- Dạng tiến hoá hiện chỉ tăng tham số + lớp hình chung (vòng sóng, chớp sáng); muốn khác hẳn thì thêm hình riêng từng Tuyệt kỹ.
- Deploy máy chủ `7.0.0` (protocol mới) — tới lúc đó máy khách mới sẽ tự chơi kiểu người chơi host / AI ranked.

## Hỗn loạn thành trường phái đủ công thức (2026-10-14)
User: "Chaotic là 1 hệ nhưng giờ ko có ulti, cũng ko có ulti lai". Bỏ `archetypes.chaos.noSet` → HỖN LOẠN tính công thức như mọi hệ.
Hệ chỉ có 3 lá nên ★★ (X4) không thể đạt → user chọn **thêm 3 Core Hỗn loạn** (6 lá như TỐC ĐỘ):

| Core | Độ hiếm · mở ở | Làm gì |
|---|---|---|
| **Glitch Step** | HIẾM · Area 3 ⅓ | Lướt Z: 40% "lỗi hình" nhảy thêm tới chỗ ngẫu nhiên gần đó (xoáy tím 2 đầu, hồi 2s) |
| **Wild Card** | SỬ THI · Area 4 vào Area | Mỗi lần giao bóng bốc 1 lá buff 12s: tốc độ / lực sút / chuyền / tỉ lệ đấm rơi bóng (hào quang + chữ trên đầu) |
| **Loaded Dice** | SỬ THI · Area 6 ⅓ | Đấm trúng tung xúc xắc (số hiện trên đầu): 5–6 văng mạnh + choáng, 6 hất tung |

Hỗn loạn đủ 3 lá (X3) từ Area 3, đủ 4 lá (★★) từ Area 4. Tuyệt kỹ gốc + 7 lai (`cores-new.js` / `cores-hybrid.js`):

| Công thức | Tên | Làm gì |
|---|---|---|
| HỖN LOẠN ×3 (★★ ×4) | **Chaos Roulette** | Vòng quay bốc 1 tai hoạ (★★: 2) giáng xuống đối thủ: mưa thiên thạch (vòng báo trước) · mất trọng lực (hất tung, vòng dưới chân báo trước) · nguyền chậm |
| HỖN LOẠN + TỐC ĐỘ | **Wormhole Dash** | Cửa ra xoáy tím hiện trước 0.35s, lặn vào hố rồi trồi ra xa phía trước, nổ hất người quanh cửa ra |
| HỖN LOẠN + TIKI | **Wild Card Pass** | Đường chuyền không cắt được (bóng hoá đồ vật), người nhận bốc 1 buff ngẫu nhiên |
| HỖN LOẠN + SÁT THỦ | **Jackpot Shot** | Sút tối đa, bóng bốc 2 năng lực khác nhau: lửa · sét · cong · tên lửa · tách đôi · thủ môn hoa mắt |
| HỖN LOẠN + ĐẤU SĨ | **Wild Haymaker** | Lao tới (né Z), cú đấm kết quả ngẫu nhiên: bay lên trời · văng vào tường · choáng xoay |
| HỖN LOẠN + VÕ SĨ ĐÁ | **Pinball Kick** | Lao tới (né Z), đá đối thủ thành viên bi nảy tường 3 lần, ai bị chạm cũng văng |
| HỖN LOẠN + ẢO ẢNH | **Shell Game** | 3 phân thân hiện quanh bạn rồi cả 4 tráo chỗ; có bóng thì phân thân dắt bóng giả |
| HỖN LOẠN + THÉP | **Iron Dice** | Hoá khối thép to lăn theo đường vạch trước, dừng lại tung xúc xắc: sóng chấn to theo số chấm |

ULT BOOK thành bảng 8×8 (44 ô). Giả lập 60 trận AI vs AI: không lỗi; cầu thủ hết trận cầm Tuyệt kỹ lai 12% → 16%.
