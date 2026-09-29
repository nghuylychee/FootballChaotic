# DRILL — Thiết kế tiến trình chỉ số character

> Trạng thái: **ĐÃ DUYỆT (2026-09-29)** — xem *Quyết định đã chốt* ngay dưới. Số liệu là số khởi điểm, sẽ cân bằng lại khi chơi thử.
> **Thay cho hệ điểm cộng tay:** bản đầu cho mỗi level +điểm để tự chia vào 6 chỉ số (+1 mỗi lần bấm). Chơi thử thấy **quá thủ công**
> và **lựa chọn giả**: nhiều quyết định nhỏ không cảm nhận được, không có đánh đổi, không biết nên build gì. DRILL đổi thành
> **mỗi level 1 lượt chọn 1 trong 3**, mỗi lựa chọn là một bước tăng thấy rõ, và lựa chọn tự nghiêng theo build đang có.

### Quyết định đã chốt

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Chỉ số | 6 chỉ số PACE · SHOOTING · PASSING · DRIBBLE · FIGHT · KEEPER. Bắt đầu **60** (hệ số x0.75 — character mới yếu hơn đồng đội AI), **80 = x1.0**, tối đa **99** (x1.24). Cùng thang OVR của màn giới thiệu (rating = hệ số x 80) |
| 2 | Cách lên chỉ số | Mỗi level +1 **DRILL**: bốc 3 drill, **chọn 1**, cộng vĩnh viễn. Không còn điểm, không còn chia tay |
| 3 | Đổi bài | **1 lần đổi cả 3 / mỗi drill**. Bộ 3 đang mời được lưu lại — đóng rồi mở lại / tải lại trang không được đổi miễn phí |
| 4 | Lúc nào chọn | Màn DRILL tự mở **sau màn kết quả** (khi thưởng chạy xong). Có nút **LATER**: drill chưa chọn nằm chờ ở **CHARACTER → DRILL** (trang chủ có huy hiệu nhắc) |
| 5 | Trang STATS | **Chỉ xem**: rating, radar, chi tiết từng chỉ số. **Không có RESPEC** — mỗi lựa chọn là vĩnh viễn |
| 6 | Online | Chỉ số character **không áp dụng** online (dùng chỉ số đội như cũ). Lên level ở trận online vẫn được drill, nhưng **chỉ tích lại** (không mở màn DRILL giữa trận online) |
| 7 | Badge (perk đổi luật chơi) | **Bỏ khỏi v1** — chỉ có drill tăng chỉ số. Ý tưởng giữ ở mục 9 |
| 8 | Hồ sơ cũ (hệ điểm) | **Reset chỉ số về 60 + cho 1 drill chờ mỗi level đã lên** (LV12 → 11 drill). Kết quả giống người chơi mới ở cùng level |
| 9 | Tên gọi | **DRILL** (không dùng "TRAINING" vì trùng chế độ Luyện tập trong SETTINGS; không dùng "card" vì trùng lá Core + món gacha) |
| 10 | Giao diện màn DRILL | **Tường phố + poster** (tường gạch như sân, stencil icon chỉ số trên vệt sơn, xịt chữ DONE!). Bản bảng đen phấn trắng đã bỏ vì lệch phong cách game |

### Tiến độ triển khai

| Giai đoạn | Trạng thái | Ghi chú |
|---|---|---|
| 0 · Hệ điểm cộng tay | ✅ Đã thay | Base 60, 6 điểm / level, giá theo bậc 1/2/3, RESPEC tốn gold. Bị thay bởi giai đoạn 1 (giữ lại: 6 chỉ số, móc vào engine, thang rating, trang STATS dạng xem) |
| 1 · DRILL | ✅ Xong — chờ chơi thử | 13 drill · bốc 3 nghiêng theo build · 1 lần đổi · màn DRILL sau kết quả + LATER · CHARACTER → DRILL · STATS chỉ xem · chuyển đổi hồ sơ cũ. Code: `src/ui/drill.js` (màn DRILL), `src/core/profile.js` (bốc / lưu / cộng), `progression.config.js → attrs.drills`. Giả lập 50 lần dàn đều tới LV30: OVR 84–86 |
| 2 · Nguồn drill khác | ⏸ Chưa làm | Drill thưởng khi thắng trận thăng hạng / mốc thành tích (dùng `attrs.bonus` / `attrs.milestones` còn giữ trong hồ sơ) |

---

## 1. Vì sao đổi

Ba vấn đề của hệ điểm cộng tay:

1. **Quá nhiều quyết định nhỏ.** 6 điểm mỗi level, đầu game lên vài level mỗi trận → hàng chục lần bấm +1, mỗi lần ~+1.25% — không cảm nhận được trên sân.
2. **Không có đánh đổi.** Cả 6 chỉ số chỉ làm mạnh lên, không mất gì. Cách "đúng" hiển nhiên (dàn đều, hoặc dồn vào thứ đang dùng) → lựa chọn không có nghĩa.
3. **Không gì chỉ đường build.** Chỉ số không nối với thứ gì khác trong game.

Kiểu "chọn 1 trong 3 khi lên cấp" đã quen thuộc: **Hades** (boon sau mỗi phòng), **Vampire Survivors / Brotato** (nâng cấp khi lên level),
**LoL Arena** (augment — chính là cảm hứng của Core). Khác biệt: ở đây lựa chọn là **vĩnh viễn** (meta), không reset mỗi lượt chơi.

## 2. Luồng

```
lên level (Profile.addXp) ──► attrs.drills.pending += 1
        │
        ▼
màn kết quả: "★ +1 DRILL" ──(thưởng chạy xong, ~0.6s)──► màn DRILL (chơi đơn / Main Path)
                                                           │   ├─ chọn 1 trong 3 ─► cộng chỉ số ─► còn drill? bộ 3 mới : đóng
                                                           │   ├─ R: đổi cả 3 (1 lần / drill)
                                                           │   └─ Esc: LATER ─► nút "DRILL (n)" trên màn kết quả
                                                           ▼
                                           còn drill chờ ─► CHARACTER → DRILL · trang chủ "★ n DRILLS"
```

Online: dòng "★ +1 DRILL · CHARACTER → DRILL", không mở màn DRILL (vòng lặp online tự xử lý phím).

## 3. Chỉ số

Rating = `60 + steps` (steps = số bước đã cộng, 0..39). Hệ số trong trận = `1 + (rating / 80 − 1) × weight` (weight = 1 cho mọi khoá hiện tại).

| Chỉ số | Viết tắt | Khoá trong trận (`Player.stats`) | Tác dụng |
|---|---|---|---|
| PACE | PAC | `speed`, `stamina` | Tốc độ chạy (có / không bóng), tốc độ hồi thể lực |
| SHOOTING | SHO | `power`, `accuracy` | Lực sút + độ chính xác |
| PASSING | PAS | `pass` | Tốc độ + độ chính xác đường chuyền (chuyền S không nhắm lệch ít hơn) |
| DRIBBLE | DRI | `dribble` | Tốc độ khi rê bóng, trụ bóng khi bị đấm, khống chế bóng nhanh |
| FIGHT | FIG | `tackle`, `knock` | Tỉ lệ đấm rơi bóng, cắt đường chuyền, lực đẩy lùi của đấm / Hard |
| KEEPER | GK | `keeper` | Tỉ lệ cứu thua khi đứng trong vòng cấm nhà |

Áp dụng ở **Main Path + Luyện tập** (`main.js → avatarStats`). Đồng đội AI giữ chỉ số đội (x1.0). OVR = trung bình 6 rating.

## 4. Danh sách drill

13 drill, 3 loại. Tổng bước mỗi drill ~5 (Boot Camp 6 vì hiếm).

| id | Tên | Loại | Tăng | Mô tả |
|---|---|---|---|---|
| `sprint` | Sprint Ladder | single | PAC +5 | Quick feet through the ladder, then flat-out sprints. |
| `finish` | Finishing | single | SHO +5 | Shot after shot from every angle until the net gives up. |
| `rondo` | Rondo | single | PAS +5 | Keep it moving in the circle. One touch, never lose it. |
| `slalom` | Cone Slalom | single | DRI +5 | Weave the cones with the ball glued to your feet. |
| `sparring` | Sparring | single | FIG +5 | Pads, footwork, and a lot of getting hit back. |
| `wall` | Reaction Wall | single | GK +5 | Balls fired off a wall. Catch them before they catch you. |
| `counter` | Counter Run | combo | PAC +3 · DRI +2 | Break forward with the ball at full speed. |
| `onetwo` | One-Two | combo | PAS +3 · SHO +2 | Give and go, then finish the move. |
| `volley` | Volleys | combo | SHO +3 · PAC +2 | Sprint onto the cross and hit it first time. |
| `keepups` | Keep-Ups | combo | DRI +3 · PAS +2 | Never let the ball touch the ground. |
| `scrap` | Street Scrap | combo | FIG +3 · PAC +2 | Chase, shove, win it back. Repeat. |
| `duel` | Penalty Duel | combo | GK +3 · FIG +2 | One on one in the box. Read them, then stand your ground. |
| `camp` | Boot Camp | all | tất cả +1 | A bit of everything. Rare, and brutal. |

## 5. Cách bốc 3 drill

- **Trọng số** = `kindWeight[loại] × (1 + lean × tỉ lệ bước đã tập ở các chỉ số của drill đó)`.
  `kindWeight`: single 3 · combo 2 · all 0.6. `lean` = 1.5. Hồ sơ mới (chưa tập gì) → chỉ còn trọng số theo loại.
- **Loại trừ:** drill mà mọi chỉ số của nó đã 99.
- **Bảo đảm** (khi đã tập ít nhất 1 drill): trong 3 lựa chọn có ít nhất 1 drill chạm **chỉ số cao nhất** của bạn (giữ hướng build)
  và ít nhất 1 drill **không chạm** chỉ số đó (luôn có lối rẽ).
- **Đổi bài:** R đổi cả 3 một lần mỗi drill, bộ mới không trùng bộ cũ (hết bài thì cho trùng).
- **Lưu bộ 3:** `attrs.drills.offer` giữ bộ đang mời cho tới khi chọn — đóng màn / tải lại trang không bốc lại.
- Tăng vượt 99 thì cắt ở 99 (xem trước trên ô drill cũng đã cắt).

## 6. Ngân sách & cân bằng

- LV1 → LV40 = **39 drill**, trung bình ~5.2 bước → **~200 bước**. Dàn đều: ~+33 mỗi chỉ số → **~93** (x1.17). Dồn: 3–4 chỉ số lên 99.
- **Trần level theo Main Path** (`mainpath.config.js → areas[].levelCap`, theo hạng cao nhất từng đạt; vô địch = LV40): drill vẫn chỉ đến từ lên level,
  nhưng level không vượt trần → OVR character (dàn đều) luôn **thấp hơn OVR đội thường của Area ~3** lúc mới tới, tiến dần tới Area sau ở hạng I.
  Lý do: bản đầu level chỉ theo XP, thua cũng có XP → thắng ~65% là LV30 (~85 OVR) ngay ở Harbor (Area 6/10), chỉ số vượt xa Area.
  XP vượt trần vẫn tích; lên hạng / sang Area là lên level (và nhận drill) ngay.
- Đường cong XP phẳng (60 + 20 / level): thắng liên tục thì chạm trần gần cuối mỗi Area; thắng ~65% thì chạm trần sớm hơn.
- So với đối thủ Main Path (OVR đội, thang x80): Village Green ~65 · World Stage ~94 · The Legends ~98. Character LV1 = 60 → khởi đầu dưới cơ, lớn dần theo Area.
- Nút chỉnh (`progression.config.js → attrs.drills`): `gains` từng drill, `kindWeight`, `lean`, `perLevel`, `choices`, `rerolls`.
- **Cân bằng bằng chơi thử** — số AI vs AI không phản ánh cảm giác khi người điều khiển.

## 7. UI

### Màn DRILL (`src/ui/drill.js`, lớp `#drill` nằm trên cùng)

**Tường phố** (theo tường graffiti của sân) + 3 **poster dán băng keo** (cố ý khác khung lá Core và thẻ mở thưởng).
Bản đầu dùng bảng đen phấn trắng — bỏ vì lệch phong cách game.

```
┌──────────────── tường gạch (bảng màu gạch sân, gạch 12x6) ────────────────┐
│  DRILL (chữ xịt sơn)  [LV 13 · PICK 1 OF 3] (băng keo đen)   (2 LEFT) ●    │
│  ╭ poster ────────╮   ╭ poster ────────╮   ╭ poster ────────╮              │
│  │ 1          PAC │   │ 2    SHO · PAS │   │ 3           GK │              │
│  │  [stencil icon │   │  trên vệt sơn  │   │  màu chỉ số]   │              │
│  │ SPRINT LADDER  │   │ ONE-TWO        │   │ REACTION WALL  │              │
│  │ PAC 72 → 77 ▓▓ │   │ SHO 77 → 79 ▓  │   │ GK  64 → 69 ▓  │              │
│  ╰────────────────╯   ╰────────────────╯   ╰────────────────╯              │
├──────────────── vỉa hè (đá vỉa + nhựa đường) ─────────────────────────────┤
│  PAC 72  SHO 77  PAS 63  DRI 60  FIG 60  GK 64          ·  OVR 66 → 67     │
│  1/2/3 · ←→ + Enter chọn        [R REROLL (1)] [Esc LATER] (sticker)       │
└───────────────────────────────────────────────────────────────────────────┘
```

- Poster: giấy xé mép + 2 miếng băng keo, stencil **icon pixel** của chỉ số tăng nhiều nhất (`attrs.list[id].icon`, vẽ ở
  `src/render/pixelicons.js`) trên **vệt sơn màu chỉ số** (`attrs.list[id].color`, theo màu trường phái Core; KEEPER xanh thép cho nổi trên giấy).
  Drill có thể tự đặt `icon` / `color` (Boot Camp: nổ + xanh lá). Ô đang chọn nhấc lên, viền vàng.

- Ô: chỉ số, tên drill, rating trước → sau, thanh nhỏ, mô tả. Dải dưới: 6 rating hiện tại, ô đang chọn tô sáng phần tăng, OVR trước → sau.
- Phím: ←→ chọn · 1/2/3 chọn thẳng · Enter · R đổi (mờ khi đã dùng) · Esc / Backspace = LATER. Chuột bấm ô / nút LATER / REROLL.
- Chọn xong: xịt chữ **DONE!** hồng (quét từ trái sang, có vệt sơn chảy) lên poster, 2 poster kia xám đi ~0.5s; bộ 3 kế tiếp dán vào; hết drill thì đóng.

### Màn kết quả

- Lên level: dòng "★ +N DRILL · pick after this screen" (online: "· CHARACTER → DRILL").
- Còn drill chờ: nút đầu tiên là **DRILL (n)** để mở lại sau khi bấm LATER.

### Menu

- Trang chủ: nút CHARACTER "★ n drills ready!", thẻ hồ sơ có huy hiệu "★ n DRILLS".
- CHARACTER: dòng **DRILL** ở đầu (chỉ khi còn drill chờ) · STATS · APPEARANCE · INVENTORY.
- STATS: 6 dòng chỉ xem (↑↓ đổi khung chi tiết), radar, OVR, nút DRILL (n) khi còn drill chờ.

## 8. Dữ liệu lưu & chuyển đổi

```js
Profile.data.attrs = {
  steps: { pace: 0, shooting: 0, passing: 0, dribble: 0, fight: 0, keeper: 0 },   // rating = 60 + steps
  drills: { pending: 0, offer: null, rerolls: 0 },       // offer = [id, id, id] đang mời · rerolls = số lần đã đổi bộ này
  bonus: 0, milestones: {},                              // giữ cho giai đoạn 2 (drill thưởng)
}
```

- `sanitize()`: steps kẹp 0..39 · `pending` kẹp 0..maxLevel · offer có id lạ hoặc thiếu → bỏ, bốc lại khi mở.
- **Hồ sơ cũ** (hệ điểm, hoặc từ trước khi có chỉ số): chưa có `attrs.drills` → steps về 0, `pending = level − 1`.
- Hồ sơ mới: pending 0. Online không gửi chỉ số / drill cho đối thủ.

## 9. Ngoài phạm vi / sau này

- **Badge** (perk vĩnh viễn đổi luật một động tác, hiện icon trên character — kiểu badge NBA 2K / PlayStyle EA FC). Đã bỏ khỏi v1. Ví dụ đã phác:
  Second Wind (đội ghi bàn → hồi đầy thể lực) · Laser Foot (không bị phạt tư thế gượng khi sút) · Pinpoint (chuyền S không bao giờ lệch) ·
  Slippery (bị đấm rơi bóng −30%) · Pickpocket (đấm rơi bóng → bóng luôn về chân) · Cat Reflexes (cửa sổ Đọc Cú Sút rộng hơn 30%).
- **Giai đoạn 2:** drill thưởng khi thắng trận thăng hạng / mốc thành tích (`attrs.bonus`, `attrs.milestones`).
- **Vật phẩm tập luyện** trong hộp gacha (kiểu trainer eFootball) — cộng XP, drill vẫn giới hạn theo level.
