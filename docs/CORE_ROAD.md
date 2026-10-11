# CORE ROAD — Mở Core theo rank + chọn Core ngẫu nhiên từ Core đã mở

> Trạng thái: **ĐÃ DUYỆT + ĐÃ LÀM (2026-10-11)**. Cân bằng để sau.
> **Thay cho:** mọi Core thường mở sẵn cho mọi người (Main Path theo Elo, 2026-10-10).
> **Không đụng:** DRILL / OVR (`docs/DRILL_DESIGN.md`) — user tính sau. Tuyệt kỹ đặc trưng giữ nguyên (1 ô riêng, chọn ở CHARACTER › ULTIMATE).

### Quyết định đã chốt

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Mở Core theo rank | Leo Elo mở Core mới (trophy road kiểu Clash Royale). **Mỗi Area rải Core của nhiều trường phái**, không dồn 1 trường phái / Area (tránh đóng khung người chơi vào 1 lối chơi từ đầu) |
| 2 | Chọn Core trong trận | **Ngẫu nhiên từ mọi Core đã mở** như Võ Đài LoL. Không có deck |
| 3 | Bộ khởi đầu | **16 lá** (đổi từ 8, 2026-10-11): 8 THƯỜNG + 1 HIẾM mỗi trường phái + Chaos Ball → trường phái nào cũng ≥ 2 lá từ trận đầu, đầu game đủ đa dạng. + Tuyệt kỹ AURA FARMING |
| 4 | Đổi bài (REROLL) khi chọn Core | **Tạm bỏ** (`cores.draft.rerollsPerRound = 0`, nút REROLL ẩn, phím R không đổi). Đổi bài ở màn DRILL giữ nguyên |
| 5 | Trần level theo rank | **Bỏ** (`progression.levelCapByRank = false`): level chỉ dừng ở `maxLevel`. `areas[].levelCap` vẫn dùng để ước lượng OVR người chơi giả theo Elo |
| 6 | Cân bằng | **Để sau** |

### Lịch sử: đã thử DECK rồi bỏ (2026-10-11)
Cùng ngày đã làm deck 8 lá (draft chỉ bốc trong deck, trang CHARACTER › DECK, "dấu deck" lộ build đối thủ). User chơi thử rồi **bỏ**:
có deck quen thì chỉ muốn dùng mãi deck đó → **mất động lực thử Core mới**. Quay về bốc ngẫu nhiên từ pool Core đã mở.
Đánh đổi đã biết: càng mở nhiều Core, pool càng loãng (ít gặp lá mình muốn build). Nếu sau này thấy loãng, núm vặn rẻ nhất là
cho người chơi tự **tắt bớt Core khỏi pool** (mặc định bật hết) thay vì bắt xếp deck.

## 1. Chọn Core trong trận

Khung giữ như cũ: 5 lượt (`game.match.maxUpgrades`), mỗi lượt 3 lá (`upgradeChoices`), bảo đảm hướng từ lượt 2.
- **Pool** = Core thường đã mở (`Profile.unlockedCores()` → `opts.coreUnlocks`; online gửi trong `Profile.public().cores`).
- **Trọng số** = độ hiếm × (1 + `buildWeight` × số Core cùng trường phái đang có) — như cũ (`cores.draft`).
- **Core vừa mở** (`MainPath.state.fresh`): lượt nào cũng đưa 1 lá chưa hiện vào, nhãn **NEW**, hiện 1 lần rồi bỏ — để Core mới chắc chắn được thử ngay trận sau.
- **Người chơi giả** (`MainPath.fakePlayer`): pool = `MainPath.collectionAt(elo)` (bộ khởi đầu + Core Road tới Elo của họ) — bốc như người thật ở Elo đó.
- Đội AI thuần (đội bot co-op, đối thủ Luyện tập): bốc từ toàn bộ Core theo thiên hướng đội (như cũ).

## 2. Core Road — mở Core theo Elo

Mốc mở = **các nấc `levelCap`** của Area: mỗi Area chia khoảng Elo làm 3 nấc → mốc **vào Area**, **⅓** và **⅔** (`MainPath.roadElo`).
Mở theo **Elo cao nhất từng đạt** (`peak`): rớt Area không mất Core, lên lại không nhận lại.

Nguyên tắc rải:
- **Bộ khởi đầu rộng** (16 lá) để người mới được thử nhiều Core ngay; Area 1 mở nốt 6 lá HIẾM còn lại → hết Area 1 có 22 lá.
- Từ Area 2 chỉ còn SỬ THI / HUYỀN THOẠI. **Trường phái nào cũng đạt 4 lá (đủ bậc 4) trong khoảng Area 2–3**, trường phái thiếu (Thép, Sát thủ, Tiki) được ưu tiên mở trước.
- Mỗi Area có nhiều trường phái khác nhau, mỗi mốc 1–2 Core. Mỗi Area 5–10 có **1 HUYỀN THOẠI**.

Viết tắt: BRA Đấu sĩ · LAU Võ sĩ đá · STR Sát thủ · RUN Tốc độ · PM Tiki-taka · TRI Ảo ảnh · IRN Thép · CHA Hỗn loạn. R / E / L = HIẾM / SỬ THI / HUYỀN THOẠI.

**Bộ khởi đầu (16):** 8 THƯỜNG `sniper_foot` STR · `speed_demon` RUN · `quick_feet` TRI · `street_fighter` BRA · `iron_body` IRN · `heavy_boot` LAU · `maestro` PM · `eagle_eye` PM
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
| Bắt đầu | 16 | 2 | 3 | 2 | 3 | 2 | 2 | 2 |
| Hết Area 1 | 22 | 4 | 3 | 3 | 5 | 4 | 3 | 2 |
| Hết Area 2 | 26 | 4 | 4 | 4 | 5 | 4 | 4 | 3 |
| Hết Area 3 | 30 | 5 | 4 | 4 | 6 | 5 | 4 | 4 |
| Hết Area 10 | 46 | 7 | 8 | 9 | 8 | 8 | 7 | 7 |

Kiểm: 46 Core thường (8 THƯỜNG + 14 HIẾM + 18 SỬ THI + 6 HUYỀN THOẠI), mỗi lá đúng 1 chỗ.
Area 9–10 vẫn chưa có Tuyệt kỹ; mốc ⅓ / ⅔ của Area 8–10 để trống, dành cho phần thưởng khác sau này.

Config: `mainpath.config.js → areas[].road = [[...vào Area], [...⅓], [...⅔]]`. `areas[].ult` giữ nguyên.
**Thêm Core mới:** phải có đúng 1 chỗ mở — `progression.starterCores` hoặc 1 nấc `areas[].road` (Tuyệt kỹ: `areas[].ult`).

## 3. UI
- **Màn lật thẻ sau trận:** qua mốc → lật thẻ Core (`src: road` — "Reached ★284 in BACK ALLEY"; mốc vào Area: `src: area`).
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
