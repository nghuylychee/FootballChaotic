# CORE ROAD — Mở Core theo rank + chọn Core ngẫu nhiên từ Core đã mở

> Trạng thái: **ĐÃ DUYỆT + ĐÃ LÀM (2026-10-11)**. Cân bằng để sau.
> **Thay cho:** mọi Core thường mở sẵn cho mọi người (Main Path theo Elo, 2026-10-10).
> **Không đụng:** DRILL / OVR (`docs/DRILL_DESIGN.md`) — user tính sau.
> **Cập nhật 2026-10-13 (`docs/ULT_RECIPE.md`):** Area **không còn thưởng Tuyệt kỹ** (`areas[].ult` đã bỏ, thưởng Area chỉ còn là Core). Tuyệt kỹ mở theo công thức trong trận; bỏ trang CHARACTER › ULTIMATE (thay bằng ULT BOOK). Các cột "ult" trong bảng dưới là lịch sử.
> **Cập nhật 2026-10-13:** bỏ Core cầu nối 2 hệ — 11 lá đổi về 1 hệ (Counter Attack / Rubber Arm / Dragon Uppercut → ĐẤU SĨ · Iron Fist → THÉP · One-Two / Captain → TIKI · Fake Run / Counter Strike → ẢO ẢNH · Flying Kick → TỐC ĐỘ · Scissor Kick → VÕ SĨ ĐÁ · Ghost Ball → SÁT THỦ). Vị trí mở trên Core Road giữ nguyên; bảng "số lá mỗi trường phái" dưới là lịch sử (hết Area 10: SÁT THỦ 8 · TIKI 8 · ĐẤU SĨ 7 · VÕ SĨ ĐÁ 7 · ẢO ẢNH 7 · THÉP 7 · TỐC ĐỘ 6).

### Cập nhật 2026-10-14 — Area đầu ngắn lại + rải lại Core Road (user: "các area đầu ngắn lại để người chơi nhanh progress")
Thắng / thua ngang Elo = ±20 (`elo.k = 40`) → số **trận thắng ròng** (thắng − thua) để qua 1 Area = khoảng Elo ÷ 20.
Số trận qua 1 Area tỉ lệ với khoảng Elo (độ khó AI nội suy theo vị trí trong Area, nên tỉ lệ thắng ở cùng "đoạn" Area không đổi).

| Area | Elo cũ | Elo mới | Khoảng cũ → mới | Thắng ròng cũ → mới |
|---|---|---|---|---|
| 1 VILLAGE | 0 | 0 | 200 → **80** | 10 → **4** |
| 2 ALLEY | 200 | 80 | 250 → **120** | 12.5 → **6** |
| 3 SCHOOL | 450 | 200 | 300 → **160** | 15 → **8** |
| 4 ROOFTOP | 750 | 360 | 350 → **220** | 17.5 → **11** |
| 5 MARKET | 1100 | 580 | 400 → **300** | 20 → **15** |
| 6 HARBOR | 1500 | 880 | 450 | 22.5 |
| 7 CAGE | 1950 | 1330 | 500 | 25 |
| 8 PLAZA | 2450 | 1830 | 550 | 27.5 |
| 9 CYBER | 3000 | 2380 | 600 | 30 |
| 10 STADIUM | 3600 | 2980 | 600 (`lastSpan`) | 30 |

Tới Area 5: 37.5 → **18** thắng ròng (nhanh gấp ~2). Area 6+ giữ nguyên độ dài, chỉ dời ngưỡng.

**Core Road mới — mỗi mốc 1 Core** (30 Core trên 30 mốc; mốc vào Area 1 trống, mốc vào Area 3 có 2). Trước đây Area 1 dồn 6 lá
còn Area 8–10 bỏ trống 4 mốc → giờ Area đầu (ngắn) mở dồn dập, Area sau (dài) vẫn có Core ở cả 3 mốc.
- HIẾM ở Area 1–3 · SỬ THI từ Area 3 · Area 5–10 mỗi Area 1 HUYỀN THOẠI ở mốc ⅔ (như cũ).
- Hết Area 3 (Elo 360, trước là 750) trường phái nào cũng **≥ 4 lá** → dạng ★★ (X4) đạt được. Mỗi Area 3 trường phái khác nhau.

| Area (Elo) | Vào Area | ⅓ | ⅔ | Tổng sở hữu · số lá TỐC/TIKI/SÁT/ĐẤU/ĐÁ/ẢO/THÉP |
|---|---|---|---|---|
| Bắt đầu | | | | 23 · 3/4/3/3/3/3/3 |
| **1 VILLAGE** (0) | — | `fire_shot` STR·R | `juggle` LAU·R | 25 · 3/4/4/3/4/3/3 |
| **2 ALLEY** (80) | `counter_attack` BRA·R | `fake_run` TRI·R | `warp_walls` CHA·R | 28 · 3/4/4/4/4/4/3 |
| **3 SCHOOL** (200) | `uppercut` BRA·R + `symphony` PM·E | `sonic_boom` RUN·E | `bulldozer` IRN·E | 32 · 4/5/4/5/4/4/4 |
| **4 ROOFTOP** (360) | `shadow_clone` TRI·E | `energy_wave` STR·E | `giant_keeper` IRN·E | 35 · 4/5/5/5/4/5/5 |
| **5 MARKET** (580) | `freight_train` RUN·E | `giant_fist` BRA·E | `thunder_kick` STR·**L** | 38 · 5/5/6/6/4/5/5 |
| **6 HARBOR** (880) | `witch_time` TRI·E | `one_two` PM·E | `blade_runner` LAU·**L** | 41 · 5/6/6/6/5/6/5 |
| **7 CAGE** (1330) | `ground_slam` LAU·E | `rubber_arm` BRA·E | `aegis_wall` IRN·**L** | 44 · 5/6/6/7/6/6/6 |
| **8 PLAZA** (1830) | `flying_kick` RUN·E | `phantom_pass` PM·E | `bomb_ball` CHA·**L** | 47 · 6/7/6/7/6/6/6 |
| **9 CYBER** (2380) | `counter_strike` TRI·E | `emp_trap` IRN·E | `black_hole` STR·**L** | 50 · 6/7/7/7/6/7/7 |
| **10 STADIUM** (2980) | `ghost_ball` STR·E | `captain` PM·E | `scissor_kick` LAU·**L** | 53 · 6/8/8/7/7/7/7 |

**+3 Core Hỗn loạn (2026-10-14, `docs/ULT_RECIPE.md`):** `glitch_step` CHA·R ở Area 3 ⅓ (cùng `sonic_boom`) · `wild_card` CHA·E ở vào Area 4
(cùng `shadow_clone`) · `loaded_dice` CHA·E ở Area 6 ⅓ (cùng `one_two`) → 56 Core thường; Hỗn loạn 1 → 6 lá, đủ 3 lá ở Area 3, 4 lá ở Area 4.

Hồ sơ cũ: Area tính lại theo Elo đang có (Elo giữ nguyên → nhiều người nhảy lên Area cao hơn); `backfill` theo Elo cao nhất từng đạt
cấp bù mọi Core ở mốc ≤ Elo đó (không bao giờ thu lại Core). Bảng Area / Core Road ở mục 2 bên dưới là **lịch sử**.

### Quyết định đã chốt

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Mở Core theo rank | Leo Elo mở Core mới (trophy road kiểu Clash Royale). **Mỗi Area rải Core của nhiều trường phái**, không dồn 1 trường phái / Area (tránh đóng khung người chơi vào 1 lối chơi từ đầu) |
| 2 | Chọn Core trong trận | **Ngẫu nhiên từ mọi Core đã mở** như Võ Đài LoL. Không có deck |
| 3 | Bộ khởi đầu | **23 lá** (8 → 16 → 23, 2026-10-11): 8 THƯỜNG + **7 Core chỉ số** (THƯỜNG, mỗi trường phái 1 lá) + 1 HIẾM mỗi trường phái + Chaos Ball → trường phái nào cũng ≥ 3 lá từ trận đầu. + Tuyệt kỹ AURA FARMING |
| 7 | Chỉ số / OVR / DRILL | **Tạm ẩn** (`progression.attrs.hidden`): game thuần kỹ năng + Core. Mọi người chơi chung rating `attrs.fixed` = 80 (hệ số 1.0). Khác biệt chỉ số đến từ **Core chỉ số** chọn trong trận (`CORE_DESIGN.md` mục Core chỉ số) |
| 4 | Đổi bài (REROLL) khi chọn Core | ~~Tạm bỏ~~ → **bật lại 2026-10-13**: 1 lần / lượt (`cores.draft.rerollsPerRound = 1`). Bỏ luôn bảo đảm hướng (`docs/ULT_RECIPE.md`) |
| 5 | Trần level theo rank | **Bỏ** (`progression.levelCapByRank = false`): level chỉ dừng ở `maxLevel`. `areas[].levelCap` vẫn dùng để ước lượng OVR người chơi giả theo Elo |
| 6 | Cân bằng | **Để sau** |

### Lịch sử: đã thử DECK rồi bỏ (2026-10-11)
Cùng ngày đã làm deck 8 lá (draft chỉ bốc trong deck, trang CHARACTER › DECK, "dấu deck" lộ build đối thủ). User chơi thử rồi **bỏ**:
có deck quen thì chỉ muốn dùng mãi deck đó → **mất động lực thử Core mới**. Quay về bốc ngẫu nhiên từ pool Core đã mở.
Đánh đổi đã biết: càng mở nhiều Core, pool càng loãng (ít gặp lá mình muốn build). Nếu sau này thấy loãng, núm vặn rẻ nhất là
cho người chơi tự **tắt bớt Core khỏi pool** (mặc định bật hết) thay vì bắt xếp deck.

## 1. Chọn Core trong trận

Khung: **4 lượt** (`game.match.maxUpgrades`, từ 2026-10-13), mỗi lượt 3 lá (`upgradeChoices`), **không** bảo đảm hướng, 1 lần REROLL / lượt.
- **Pool** = Core thường đã mở (`Profile.unlockedCores()` → `opts.coreUnlocks`; online gửi trong `Profile.public().cores`).
- **Trọng số** = độ hiếm × (1 + `buildWeight` × số Core cùng trường phái đang có) — như cũ (`cores.draft`).
- **Core vừa mở** (`MainPath.state.fresh`): lượt nào cũng đưa 1 lá chưa hiện vào, nhãn **NEW**, hiện 1 lần rồi bỏ — để Core mới chắc chắn được thử ngay trận sau.
- **Người chơi giả** (`MainPath.fakePlayer`): pool = `MainPath.collectionAt(elo)` (bộ khởi đầu + Core Road tới Elo của họ) — bốc như người thật ở Elo đó.
- Đội AI thuần (đội bot co-op, đối thủ Luyện tập): bốc từ toàn bộ Core theo thiên hướng đội (như cũ).

## 2. Core Road — mở Core theo Elo

Mốc mở = **các nấc `levelCap`** của Area: mỗi Area chia khoảng Elo làm 3 nấc → mốc **vào Area**, **⅓** và **⅔** (`MainPath.roadElo`).
Mở theo **Elo cao nhất từng đạt** (`peak`): rớt Area không mất Core, lên lại không nhận lại.

Nguyên tắc rải:
- **Bộ khởi đầu rộng** (23 lá) để người mới được thử nhiều Core ngay; Area 1 mở nốt 6 lá HIẾM còn lại → hết Area 1 có 29 lá.
- Từ Area 2 chỉ còn SỬ THI / HUYỀN THOẠI. **Trường phái nào cũng đạt 4 lá (đủ bậc 4) trong khoảng Area 2–3**, trường phái thiếu (Thép, Sát thủ, Tiki) được ưu tiên mở trước.
- Mỗi Area có nhiều trường phái khác nhau, mỗi mốc 1–2 Core. Mỗi Area 5–10 có **1 HUYỀN THOẠI**.

Viết tắt: BRA Đấu sĩ · LAU Võ sĩ đá · STR Sát thủ · RUN Tốc độ · PM Tiki-taka · TRI Ảo ảnh · IRN Thép · CHA Hỗn loạn. R / E / L = HIẾM / SỬ THI / HUYỀN THOẠI.

**Bộ khởi đầu (23):** 8 THƯỜNG `sniper_foot` STR · `speed_demon` RUN · `quick_feet` TRI · `street_fighter` BRA · `iron_body` IRN · `heavy_boot` LAU · `maestro` PM · `eagle_eye` PM
+ 7 Core chỉ số `leg_day` RUN · `cannon_leg` STR · `silk_pass` PM · `close_control` TRI · `heavy_hands` BRA · `thunder_thighs` LAU · `safe_hands` IRN
+ `burst_start` RUN·R · `one_touch` PM·R · `banana_kick` STR·R · `fist_storm` BRA·R · `wall_slam` LAU·R · `phantom_step` TRI·R · `iron_fist` BRA/IRN·R · `chaos_ball` CHA·R

| Area (Elo) | Vào Area | ⅓ | ⅔ | Tổng sở hữu |
|---|---|---|---|---|
| **1 VILLAGE** (0) | — | `fire_shot` STR·R · `juggle` LAU·R · `counter_attack` BRA/RUN·R | `fake_run` RUN/TRI·R · `uppercut` BRA/LAU·R · `warp_walls` CHA·R | 22 |
| **2 ALLEY** (200) | ult `hundred_fists` · `symphony` PM·E | `energy_wave` STR·E · `bulldozer` IRN·E | `shadow_clone` TRI·E | 26 |
| **3 SCHOOL** (450) | ult `lightning_dash` · `giant_keeper` IRN·E | `sonic_boom` RUN·E · `ground_slam` LAU·E | `giant_fist` BRA·E | 30 |
| **4 ROOFTOP** (750) | ult `endless_tiki` · `witch_time` TRI·E | `one_two` PM/STR·E | `freight_train` RUN·E | 33 |
| **5 MARKET** (1100) | ult `meteor_strike` · `emp_trap` IRN·E | `flying_kick` RUN/LAU·E | `thunder_kick` STR·**L** | 36 |
| **6 HARBOR** (1500) | ult `titan` · `phantom_pass` PM·E | `counter_strike` TRI/BRA·E | `blade_runner` LAU·**L** | 39 |
| **7 CAGE** (1950) | ult `meteor_drop` · `rubber_arm` BRA/PM·E | `ghost_ball` TRI/STR·E | `aegis_wall` IRN·**L** | 42 |
| **8 PLAZA** (2450) | ult `clone_army` · `captain` IRN/PM·E | `bomb_ball` CHA·**L** | — | 44 |
| **9 CYBER** (3000) | `black_hole` STR·**L** | — | — | 45 |
| **10 STADIUM** (3600) | `scissor_kick` LAU/STR·**L** | — | — | 46 |

Số lá mỗi trường phái (lá cầu nối tính cả hai; cần 4 lá cho bậc 4):

| Khi | Tổng | Tốc độ | Tiki | Sát thủ | Đấu sĩ | Võ sĩ đá | Ảo ảnh | Thép |
|---|---|---|---|---|---|---|---|---|
| Bắt đầu | 23 | 3 | 4 | 3 | 4 | 3 | 3 | 3 |
| Hết Area 1 | 29 | 5 | 4 | 4 | 6 | 5 | 4 | 3 |
| Hết Area 2 | 33 | 5 | 5 | 5 | 6 | 5 | 5 | 4 |
| Hết Area 3 | 37 | 6 | 5 | 5 | 7 | 6 | 5 | 5 |
| Hết Area 10 | 53 | 8 | 9 | 10 | 9 | 9 | 8 | 8 |

Kiểm: 53 Core thường (15 THƯỜNG gồm 7 Core chỉ số + 14 HIẾM + 18 SỬ THI + 6 HUYỀN THOẠI), mỗi lá đúng 1 chỗ.
Area 9–10 vẫn chưa có Tuyệt kỹ; mốc ⅓ / ⅔ của Area 8–10 để trống, dành cho phần thưởng khác sau này.

Config: `mainpath.config.js → areas[].road = [[...vào Area], [...⅓], [...⅔]]`. `areas[].ult` giữ nguyên.
**Thêm Core mới:** phải có đúng 1 chỗ mở — `progression.starterCores` hoặc 1 nấc `areas[].road` (Tuyệt kỹ: `areas[].ult`).

## 3. UI
- **Màn lật thẻ sau trận:** qua mốc → lật thẻ Core (`src: road` — "Reached ★284 in BACK ALLEY"; mốc vào Area: `src: area`).
- **GOAT PATH** (màn PLAY › RANKED, bấm cụm Area + thanh tiến độ ở đầu màn): bản đồ biển ngang, mỗi Area 1 đảo pixel (sân thu nhỏ, cờ tên + khoảng Elo, Tuyệt kỹ khung vàng + Core vào Area ở mép đảo). Mốc ⅓ / ⅔ = cột mốc giữa biển trên đường đi zigzag, nhân vật của bạn đứng đúng chỗ Elo hiện tại, đoạn đã đi tô vàng. Thanh dưới: chi tiết đảo đang chọn kèm tên từng phần thưởng. ←→ chọn đảo, lăn chuột cuộn ngang. Hiện hết (user bỏ ??? 2026-10-11, `mainPath.roadSpoilers`).
- **MAIN PATH:** thẻ Area có hàng **CORES**: từng mốc Elo + Core mở ở đó (đã có: sáng · chưa có: bóng xám, không lộ tên).
- **Lượt chọn Core:** lá Core vừa mở có nhãn NEW.
- **Túi đồ › CORE:** Core chưa mở bị khoá + cách mở (`MainPath.unlockHint`: "Reach ★367 · BACK ALLEY").

## 4. Code
| Phần | Chỗ |
|---|---|
| Core Road | `MainPath.roadElo / roadAt / collectionAt / coreSource / unlockHint`; `record` trả thưởng theo mốc; `backfill` theo `peak` (hồ sơ cũ nhận bù Core Road, không hiện màn lật thẻ) |
| Core đã mở | `Profile.collection()` (Core thường) · `Profile.unlockedCores()` (+ Tuyệt kỹ đã sưu tập) |
| Online | Không đổi định dạng gói tin → không tăng `net.protocol` |

## 5. Để sau
- Cân bằng (pool nhỏ ở Elo thấp → Cộng hưởng dễ đạt hơn; bỏ trần level → OVR có thể vượt người chơi giả cùng Elo).
- Tuyệt kỹ cho Area 9–10; phần thưởng cho mốc ⅓ / ⅔ Area 10.
- Nguồn Core phụ cho người kẹt rank (mua bằng vàng / thưởng level / chest) — đã bàn, chưa chốt.
- Dịch các chuỗi mới.
