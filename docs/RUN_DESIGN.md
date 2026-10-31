# GOAT PATH — Football Story thành run kiểu Slay the Spire

> Trạng thái: **GIAI ĐOẠN 1–5 ĐÃ LÀM (2026-10-25), chờ chơi thử.** Còn: co-op (giai đoạn 6), PHÒNG TRƯNG BÀY theo run. Đội Elite riêng: đã làm 2026-10-27 (mục "Đội Elite"). **BADGE làm lại + LEGEND: đã làm 2026-10-28** (mục "Lớp sức mạnh, BADGE mới và LEGEND" — thay các mục BADGE cũ bên dưới). Số liệu là số khởi điểm.
> Code: `config/run.config.js` · `src/meta/run.js` (`SFC.Run`) · `src/ui/runmap.js` (`SFC.RunUI`, page `run` = tab PLAY, `runmap` = map) · `app.startRunMatch` (main.js).
> Thay cho: cup knockout 4 trận của `docs/FOOTBALL_STORY.md`. 4 Story cũ (cốt truyện, người dẫn truyện, sao thử thách) **bỏ**;
> giữ lại đối thủ, luật trận (`MatchMods`), câu nói trong trận, khuôn cut-scene và co-op player-host để dùng lại.
> Lý do: PvP cần đủ người online cùng lúc mới vui. Run chơi một mình vẫn trọn vẹn, và content PvE (16 đội có luật trận riêng) đã có sẵn.
> **Đây là chế độ chính của game**, RANKED thành chế độ phụ.

## Quyết định đã chốt (user, 2026-10-25)

| # | Chủ đề | Chốt |
|---|---|---|
| 1 | Hình thức | 1 run = **3 act**, mỗi act 1 map nhiều nhánh như Slay the Spire: xong 1 node thì chọn node kế ở tầng trên. Cuối act luôn là **boss** |
| 2 | Thua | **Thua 1 trận (Matchday / Elite / Boss) = hết run.** Không có máu / thể lực. Bản đơn giản trước |
| 3 | Core | **Giữ như hiện tại**: mỗi trận bắt đầu lại, 4 lượt chọn ngẫu nhiên từ Core đã mở, công thức Tuyệt kỹ tính trong trận. Thứ giữ qua run là **item** |
| 4 | Item | **1 hệ item duy nhất** trong run: tăng chỉ số + sức mạnh Core. Mua ở Shop, nhận khi thắng trận / làm xong bài tập. Hết run là mất |
| 5 | Costume | Skin hiện tại **giữ nguyên**, chỉ là cosmetic cho tiến trình meta, **không tăng sức mạnh** |
| 6 | Loại node | Matchday · Elite · Skill game · Shop · Locker Room (nghỉ) · `?` · Boss. **Elite = đội Elite riêng của act** (luật trận riêng, Elo + 150) |
| 7 | Câu chuyện | **Phương án B**: mỗi act là một vùng có theme, đối thủ và người dẫn truyện riêng. 4 Story cũ bỏ |
| 8 | Mở Core | **Theo tiến trình run** (thay Elo / CORE ROAD theo Area) |
| 9 | Ranked | **Hạ xuống chế độ phụ** |
| 10 | Co-op | Ưu tiên, nhưng **làm sau khi xong bản chơi một mình** |
| 11 | Gold | **Tách** tiền trong run khỏi gold meta: tiêu trong run, hết run đổi một phần ra gold meta |
| 12 | Tên chế độ | **GOAT PATH**. Tên này đang là màn bản đồ Area của RANKED (page `road`, `src/ui/road.js`) → màn đó phải đổi tên khi làm |
| 13 | Tên item | **BADGE** |
| 14 | Bỏ run | **Có nút FORFEIT** (bỏ run, tính như thua). Thoát giữa trận = forfeit = hết run |
| 15 | Item áp cho ai | ~~Chỉ character của người chơi~~ → 2026-10-26 gắn cho 1 người → **2026-10-28: BADGE của cả đội** (mục "Lớp sức mạnh, BADGE mới và LEGEND") |
| 16 | Thưởng trận | Matchday / Elite / Boss: **chọn 1 trong 3 BADGE** |
| 17 | Chấn thương | **Không tự hết**, phải chữa ở Locker Room hoặc Shop |

## Luồng chơi

```
PLAY › GOAT PATH › bắt đầu run (hoặc TIẾP TỤC run đang dở)
  └ ACT 1 intro (cut-scene người dẫn truyện act)
     └ MAP: chọn node tầng 1 → chơi node → thưởng → về MAP, chọn node tầng kế → … → tầng 7 (Locker Room) → BOSS
  └ thắng boss: cúp act + thưởng boss → ACT 2 intro → … → BOSS act 3 = vô địch run
  └ thua bất kỳ trận nào: màn KẾT THÚC RUN (tầng đã tới, đối thủ đã hạ, BADGE đã có) → quy đổi gold meta + XP → về menu
```

- Run lưu sau mỗi node (`Profile.data.run`), thoát game rồi vào lại thì tiếp ở MAP.
- **FORFEIT** (bỏ run): nút ở tab GOAT PATH và ở menu tạm dừng trong trận (2026-10-29: bỏ khỏi MAP), có hỏi xác nhận. Tính như thua: màn KẾT THÚC RUN, vẫn quy đổi thưởng theo tầng đã tới.
- Thoát game giữa trận = forfeit: ghi `pending` lúc giao bóng (như Main Path), vào lại thì run đã hết. Không cho thoát để đá lại trận đang thua.

## Cấu trúc act và map

**Đề xuất số liệu** (chỉnh khi chơi thử):
- Mỗi act **7 tầng + tầng boss**. Mỗi tầng 2–4 node, có 3–4 đường xuất phát. Các đường không cắt nhau.
- Trận ~4 phút (150 giây + giao bóng / ăn mừng). Mỗi act thường đá 3–4 trận, cả run ~10–12 trận, khoảng **50–60 phút**.
- Map sinh từ `seed` (lưu trong run). Sau này có thể làm daily run.

| Tầng | Luật |
|---|---|
| 1 | Luôn là Matchday (mọi đường) |
| 2–6 | Bốc theo trọng số: Matchday 40 · `?` 22 · Skill 15 · Shop 10 · Elite 8 (từ tầng 3) · Locker Room 5 (từ tầng 3) |
| 7 | Luôn là Locker Room |
| Boss | 1 node, mọi đường dồn về |

Ràng buộc khi sinh map:
- Mỗi đường đi có **ít nhất 2 trận** (Matchday / Elite) trước boss, để không né hết trận được.
- Không có 2 Shop hoặc 2 Locker Room liền nhau trên cùng 1 đường.
- **Không gặp lại 1 đội trong cùng run.** Đối thủ gán vào node lúc sinh map nhưng **không hiện trên MAP** (user 2026-10-25): vào trận mới biết gặp ai.

### 3 act (phương án B)

Mỗi act là 1 vùng: sân, màu MAP, người dẫn truyện, nhạc và pool đối thủ riêng. Chia lại 16 đội có sẵn theo theme + Elo:

| Act | Vùng | Đối thủ thường | Boss | Elo AI (đề xuất) |
|---|---|---|---|---|
| 1 | **KHU PHỐ** (ban ngày: làng, phố, trường, hẻm) | Ward Uncles · Moped Boys · School Ghosts · Pigeon Gang | Block Wardens (PROTEIN SHAKE: mỗi pha bóng 1 người uống whey hoá khổng lồ) | 0 → 220 · boss 280 (chỉ số đối thủ × 0.92, `oppStat`) |
| 2 | **THÀNH PHỐ ĐÊM** (sân thượng, quảng trường, chợ đêm) | Sky Hoppers · Billboard Kids · Lantern Crew · Noodle Kickers · Fortune Tellers | ngẫu nhiên: Night Owls hoặc Market Mamas | 450 → 1000 · boss 1150 |
| 3 | **HUYỀN THOẠI** (vịnh, quảng trường, làng xưa) | Rust Buckets · Retired Refs · Grandpa's Squad | The Old Legends (KING LEO 1976) | 1300 → 2150 · boss 2700 |

- 2026-10-30 (user: act 1 bot tranh bóng quá gắt): act 1 hạ Elo (trước 30 → 300 · boss 350) + `acts[].oppStat` nhân mọi chỉ số đối thủ trận đấu của act; áp sát `ai.press` nhân theo aggression AI (`press.fullAt`) nên AI Elo thấp ít phản pressing / lao vào hơn.
- Elo AI tính theo **act + tầng**, không theo đội. Đội giữ kit, cầu thủ, Core đặc trưng (`signature`), luật trận, câu nói trong trận.
- Tỉ số khởi đầu (`score`, The Uncles dẫn 1–0): **đề xuất bỏ trong run**. Gặp ở tầng 1 mà thua là hết run thì quá gắt; giữ lại cho Elite / boss nếu cần.
- Pool act 3 mỏng (3–4 đội). Thêm đội mới cho act 3 là việc content sau.

### Đội Elite (pool riêng, user duyệt + ĐÃ LÀM 2026-10-27)

Elite không bốc chung pool Matchday nữa: mỗi act có pool `elite` riêng gồm **đội Elite mới hoàn toàn**, mỗi đội 1 **luật trận mới** (không lấy / cấm Core). Matchday giữ 16 đội Story cũ. Act 3: pool Elite có thêm boss act 2 không được bốc. Mỗi đường đi gặp tối đa 2 Elite (Elite không liền nhau, từ tầng 2), nên 2 đội / act là đủ không trùng. Elo vẫn = Matchday cùng tầng + 150.

Code: `config/elites.config.js` (đội → `teams.list`, luật → `stories.mods`, dữ liệu đối thủ `run.elites` mà `Run.opp` đọc), pool `run.acts[i].elite`, luật trong `src/systems/matchmods.js` (`K.jumprope` · `K.hose` · `K.searchlight` · `K.neon` · `K.domino` · `K.taichi`), sân Domino Hall `arenas.domino_hall` (`src/render/background.js`: floor `felt`, wall `rail`, backdrop `parlor`, lights `lamps`), hình trong `src/render/modsdraw.js`, tiếng `mod.*` trong `src/engine/ultsfx.js` (docs/SFX.md). Thử nhanh: STORY TEST › STORY = GOAT PATH ELITES, hoặc `?storytest=elite.<0..5>`. Act chưa có `elite` thì Elite bốc chung pool Matchday như cũ.

| Act | Đội Elite | Sân | Luật trận | Cách chơi luật | Cách thoát | Core đặc trưng |
|---|---|---|---|---|---|---|
| 1 | **Rope Skippers** (nhóm nhảy dây trường) | school | **DOUBLE DUTCH** | 1 sợi dây khổng lồ căng ngang cả sân, 2 cô bé đứng 2 mép trái / phải quay như nhảy dây thật: đếm 3-2-1, rồi 1 vòng (2026-10-31: 2 -> 1), dây quét sát đất qua hết bề ngang sân rồi vung cao qua đầu về chỗ cũ. Dây quét qua mà không lướt = vấp ngã, rơi bóng. Rope Skippers tự bật nhảy qua dây. Bị dẫn: quay nhanh hơn (user 2026-10-27) | Nhìn dải đỏ trước dây, lướt đúng lúc dây tới | quick_feet |
| 1 | **Wash Day Aunties** (các bà rửa sân) | village | **WASH DAY** | Bà cầm vòi đứng mép trên sân, báo trước hình quạt rồi tia nước quét qua: trúng = bị đẩy văng, rơi bóng. Tia quét tới đâu để lại vũng nước tới đó, rải khắp hình quạt nhưng chừa lối đi; chạy nhanh qua vũng = trơn té (user 2026-10-27) | Lướt xuyên tia, đi chậm hoặc len giữa các vũng | bulldozer |
| 2 | **Tower Guards** (bảo vệ toà nhà) | rooftop | **SEARCHLIGHT** | Đèn pha đi lang thang; soi trúng ai đội bạn là khoá người đó (đèn ngả đỏ, không hiện chữ) và đuổi theo (chậm hơn cả đi bộ), thoát ra khỏi đèn liên tục 2.5 s mới quên. Trong đèn nóng dần (thanh nhiệt 4 nấc + quầng đỏ), ra chỗ tối thì nguội. Nóng đầy = bốc cháy: đứng phủi lửa, lắc trái / phải liên tục mới dập xong. Bị dẫn: bật đèn thứ 2 (LOCKDOWN) (user 2026-10-27) | Chạy nhanh ra khỏi đèn và giữ khoảng cách | emp_trap |
| 2 | **Neon Arcade** (dân game thùng) | cyber | **NEON ARROWS** | Ô mũi tên neon trên sân như băng chuyền: đẩy người + bóng theo hướng mũi tên. Mỗi ~10 s cả bảng đổi hướng (nhấp nháy báo trước) | Dùng mũi tên có lợi, tránh mũi tên ngược, lướt qua | light_cycle |
| 3 | **Domino Club** (các ông chơi domino) | domino_hall (sân riêng: nỉ xanh bàn domino, mép bàn gỗ có hàng quân, đèn chao treo) | **DOMINOES** | Hàng quân domino khổng lồ mọc trên sân, đứng chắn người, quân đầu nhấp nháy rồi đổ dây chuyền: trúng = đè ngã, rơi bóng. Bị dẫn: 2 hàng chéo nhau | Nhìn đầu hàng bị đẩy, chạy khỏi đường đổ hoặc lướt | wall_slam |
| 3 | **Tai Chi Masters** (các cụ thái cực quyền) | village | **QI PALM** (thay SLOW HANDS, user 2026-10-27) | 1 cụ đứng tấn gồng 1.4 s: bàn tay khí khổng lồ mọc sau lưng, vạch đường chưởng dài nửa sân nhắm người bên bạn gần nhất (khoá hướng). Rồi bàn tay lao dọc vạch: ai trong vạch bị đẩy bay xa + choáng, bóng bị hất theo. Đang gồng: đòn nhẹ không lay (ROOTED!), đòn nặng = huỷ chưởng. Bị dẫn: 2 cụ cùng lúc | Lướt ngang ra khỏi vạch, hoặc đòn nặng vào cụ | witch_time |
| 3 | + boss act 2 không được bốc | | | | | |

## Các loại node

> **2026-10-30 (user):** LOCKER ROOM **ẩn** (thừa, rối): `run.map.weights.rest = 0`, tầng sát boss đổi thành Shop (`map.last`), BADGE Ice Bath không bốc ra (`off`). Code phòng vẫn giữ (bật lại = đặt trọng số). Không còn chỗ nâng cấp BADGE / GEAR; chấn thương chữa ở Shop / sự kiện.

| Node | Nội dung | Thắng / xong | Thua / hỏng |
|---|---|---|---|
| **Matchday** | 1 trận 3v3 bình thường với đội trên node, có luật trận của họ | Tiền + **chọn 1 trong 3 BADGE** | Hết run |
| **Elite** | 1 trận với **đội Elite riêng của act** (pool `elite`, luật trận riêng, xem "Đội Elite"), Elo + 150, BADGE hiếm hơn | Tiền nhiều hơn + chọn 1 trong 3 BADGE (độ hiếm cao hơn) | Hết run |
| **Skill game** | Bài tập ngắn 30–60 giây (xem dưới) | Tiền + 1 BADGE ngẫu nhiên | Nhận 1 **chấn thương** (BADGE xấu) |
| **Shop** | 4–5 BADGE bày bán (giá theo độ hiếm) + dịch vụ chữa 1 chấn thương | — | — |
| **Locker Room** | Chọn 1: **chữa 1 chấn thương** hoặc **nâng cấp 1 BADGE** (lên 1 bậc độ hiếm) | — | — |
| **`?`** | Bốc 1 trong: sự kiện (cut-scene + 2–3 lựa chọn được / mất) · Matchday · Skill game · Shop · BADGE miễn phí | tuỳ | tuỳ |
| **Boss** | Trận boss cuối act. Cut-scene trước trận | Nhiều tiền + **chọn 1 trong 3** BADGE hiếm trở lên + cúp act | Hết run |

Hoà hết giờ: **bàn thắng vàng** như cup hiện tại (`opts.knockout`).

### Skill game (thiết kế kỹ sau)

Bài của node Skill game: `Run.pickDrill` (user 2026-10-31: 2 Skill game liền nhau không trùng bài) bốc trong các bài chưa đá ở run này; đá hết rồi thì bài nào cũng được trừ bài vừa đá.
Lấy ý tưởng từ 13 bài DRILL có sẵn (`progression.attrs.drills.list`): mỗi bài dùng lại engine trận (`opts.training`) với 1 mục tiêu đo được. Ứng viên:
- **Finishing**: ghi N bàn vào thủ môn AI trong 30 giây
- **Cone Slalom**: dẫn bóng qua cọc trước khi hết giờ
- **Rondo**: giữ bóng 30 giây trước 2 người đuổi
- **Reaction Wall**: cản N cú sút
- **Penalty Duel**: loạt đá luân lưu
- **Sprint Ladder**: chạy tới vạch, né chướng ngại

Chấn thương = **BADGE xấu** nằm chung túi (viền đỏ), ví dụ trừ PACE. **Không tự hết**, chỉ chữa ở Locker Room hoặc Shop (user chốt). Vì vậy đường đi qua Skill game có rủi ro thật: hỏng nhiều thì phải vòng qua Locker Room / Shop.

## Hệ item: BADGE

> **Đã thay 2026-10-28** bằng mục "Lớp sức mạnh, BADGE mới và LEGEND" ở cuối file: BADGE chỉ số thuần bỏ, BADGE là của cả đội, không còn thẻ WHO GETS IT?. Phần dưới giữ để biết lịch sử.

**Tên: BADGE** (user chốt; miếng huy hiệu may lên áo đấu). Cần tên riêng vì "item" trong config đã là costume (`progression.items`), "card" là lá Core, "DRILL" là hệ chỉ số cũ.

### Cơ chế: dùng lại 6 chỉ số + CoreScale có sẵn
- Run dùng 6 chỉ số PACE · SHOOTING · PASSING · DRIBBLE · FIGHT · KEEPER (`progression.attrs`). Hệ này đang ẩn ngoài trận thường (`attrs.hidden`, mọi người = `fixed` 80); **riêng run thì hiện**.
- ~~Character bắt đầu run ở 80~~ → từ 2026-10-26 nền lệch theo vị trí (`run.squad.base`), trung bình **~65** (2026-10-30; 2026-10-27 là ~70, trước nữa ~62: user thấy đá không ổn). Cùng ngày: chênh giữa chỉ số mạnh / yếu thu hẹp (nền vị trí mạnh 68–70, yếu ~61; `lean` 0.5 ±3, `ovrMax` ±2) — đồng đội mới không còn chỉ số 8x, cao nhất ~71–74. BADGE cộng thêm, tối đa **99**.
- `src/systems/corescale.js` đã nhân sức mạnh / hồi chiêu Core theo chỉ số của trường phái (80 → x1, 99 → power x1.5, hồi chiêu x0.7). Nên **+PACE tự làm Core SPEED mạnh hơn**, +FIGHT tự làm Core BRAWLER / KICKER mạnh hơn. Cùng 1 con số vừa buff chỉ số vừa buff Core, không cần hệ thứ hai.
- ~~BADGE chỉ áp cho character của người chơi~~ → từ 2026-10-26 **BADGE gắn cho 1 trong 3 người của đội hình** (xem "Vòng chỉnh sửa 2026-10-26"). Core vẫn áp cho cả đội, nhưng CoreScale tính theo chỉ số từng người, nên phần Core mạnh thêm chỉ có ở character của bạn. Co-op sau này: mỗi người 1 túi BADGE riêng.
- Không giới hạn ô: BADGE cộng dồn (như relic Slay the Spire). Trần 99 tự chặn cộng quá tay.

### Các loại BADGE (bản đầu)

| Loại | Tác dụng | Ví dụ |
|---|---|---|
| **Chỉ số** | +rating 1–2 chỉ số (như DRILL single / combo) | Running Spikes: PACE+ · Captain's Armband: PASSING+ FIGHT+ |
| **Trường phái** | Core của 1 hệ mạnh hơn (cộng rating chỉ để tính CoreScale của hệ đó, không đổi chỉ số chạy / sút) | Brass Knuckles: Core BRAWLER mạnh hơn |
| **Định hướng draft** | Core của 1 hệ ra **thường hơn** khi bốc. Vẫn ngẫu nhiên đúng chốt #3, nhưng giúp nhắm công thức Tuyệt kỹ | Speed Poster: Core SPEED ra nhiều hơn |
| **Trận** (hiếm) | Đổi điều kiện đầu trận | Pre-match Hype: bắt đầu trận đã có 1 Core · Energy Drink: năng lượng Tuyệt kỹ nạp sẵn một phần |
| **Chấn thương** (xấu) | Trừ chỉ số, từ Skill game hỏng / sự kiện `?` | Twisted Ankle: PACE− |

- Độ hiếm dùng chung bảng màu `progression.rarities` (common → mythic). Đề xuất bước tăng: common +3 · rare +5 · epic +8 (hoặc 2 chỉ số) · legendary = item Trận.
- Mô tả BADGE: 1 câu ngắn, **không ghi số** (cùng luật mô tả Core). UI hình là chính: icon + màu chỉ số.
- Bản đầu khoảng **24–30 BADGE**. Số liệu nằm ở config, không trong code.
- Màn trong run có thanh chỉ số character (6 cột, rating) để thấy rõ mình đang mạnh lên.
- Màn thưởng: 3 BADGE dạng thẻ (icon + màu độ hiếm + chỉ số tăng), chọn 1. Có nút bỏ qua (không lấy gì).

## Tiền và thưởng

- **Tiền trong run** (`$`): Matchday ~25–40, Elite ~50, Skill game ~20, Boss ~100. Tiêu ở Shop / dịch vụ chữa. Hết run là mất.
- **Hết run** (thắng hoặc thua): đổi ra **gold meta** theo tầng đã tới + boss đã hạ, cộng **XP mở Core** (xem dưới). Trận trong run vẫn tính `matches` / `wins` / `goals` như hiện tại.
- Gold meta vẫn dùng cho gacha costume như cũ.

## Tiến trình meta

- **Mở Core theo run:** CORE ROAD giữ danh sách nấc (`areas[].road` + `starterCores`) nhưng điều kiện mở đổi từ "Elo cao nhất" sang **XP run tích luỹ** (tầng đã qua, boss đã hạ). Mỗi Core thường vẫn có đúng 1 chỗ mở.
- **Ranked:** vẫn chơi được, Elo / Area giữ nguyên, nhưng **không còn mở Core**. Ranked dùng Core đã mở từ run. Tab PLAY đưa RUN lên đầu.
- **TROPHY ROOM:** tủ kính đổi thành cúp của 3 boss act + cúp vô địch run. Bảng kỷ lục thêm: số run, tầng xa nhất, số lần vô địch, item hiếm nhất từng có.
- Achievement Story cũ (`story`, `stories`, `finals`, `stars`) đổi thành achievement run (hạ boss act N, vô địch run, vô địch không thua bài tập nào…).
- Dữ liệu cũ `Profile.data.story`: giữ để không mất, có thể đổi ra cúp tương ứng trong TROPHY ROOM. Cập nhật `docs/SAVE.md` khi làm.

## Câu chuyện (phương án B)

- 4 Story cũ bỏ: cốt truyện, người dẫn truyện, kiểu kể, sao thử thách, trang chọn Story.
- Mỗi act 1 **người dẫn truyện** + cut-scene **intro act**, **trước trận boss**, **sau khi hạ boss**. Cut-scene ngắn: dùng lại khuôn `src/ui/story-cup.js` (cupHost, cupRival, cupLift, cupMemory…) và `SFC.Story.play`.
- **Đề xuất:** mỗi act giữ 1 kiểu kể có sẵn trong `TELL` (`src/ui/story.js`): act 1 nhật ký mùa hè · act 2 manga · act 3 cuộn phim hồi tưởng (hợp King Leo 1976).
- Trận thường không có cut-scene, chỉ có câu nói trong trận (`barks`) + thẻ đối thủ trên MAP. Run phải nhanh.
- Mạch 3 act nối nhau thành 1 hành trình (khu phố → thành phố → huyền thoại). Đây là chỗ đổi luật cũ "mỗi Story gói gọn".

## Co-op (đã làm 2026-10-26)

Chốt với user: **bỏ phiếu, chốt bằng bốc ngẫu nhiên theo số phiếu** · **mỗi người 1 lượt chọn BADGE riêng, đối thủ mạnh lên theo số người thật** · **ví riêng** · **vào được giữa run, Skill game 1 người (xoay vòng)**.

- **Phòng**: tab GOAT PATH (3 thẻ act to, hàng nút JOIN · START RUN · HOST sát đáy; user 2026-10-27) › HOST (mở phòng với run đang có, chưa có thì host chọn đội hình ngay trong phòng: mã phòng + INVITE trên thanh trên của BUILD YOUR SQUAD) · JOIN (gõ mã ngay trên tab GOAT PATH, không sang PRIVATE MATCH; vào sai mã thì ở lại tab báo lỗi). Trước khi bắt đầu run, mọi người bấm ô vị trí để nhảy qua lại (ô có bạn bè đứng thì không vào được); ô bạn bè đứng vẫn có 1 đồng đội AI dự phòng (host chọn, hoặc ngẫu nhiên lúc START RUN). Giữa run vị trí cố định. `Session.createRoom({ run: true })`: máy chủ riêng nếu ping thấp nhất <= `net.server.coopMaxPing` (2026-10-31), không thì người chơi làm host (Steam / PeerJS). Run luôn nằm ở máy người tạo phòng (máy giữ, `Session.isLead`; trên máy chủ riêng gửi bản sao lên bằng `co`, thao tác của khách được máy chủ chuyển tới). Tối đa 3 người = 3 vị trí; ghế trống = đồng đội AI của run.
- **Run là của host** (lưu ở hồ sơ host, chơi tiếp một mình được khi phòng đóng). Khách giữ bản sao (`Run.mirror`, `Run.mirrorOn`): run riêng của khách không bị đụng. Host gửi bản sao trong gói `lobby` (`rn` + `r`), khách gửi thao tác `ra{a,...}` → host kiểm tra + áp (`RunUI.apply`).
- **Đội hình**: host đứng đúng vị trí character của mình (`Room.seatHost`); khách ngồi vào ô đồng đội AI cùng vị trí (`squad[i].h` = mã hồ sơ `Profile.data.uid`), dùng chỉ số + BADGE của ô đó. Khách rời: ô trở lại AI, BADGE giữ nguyên; ví khách giữ theo mã hồ sơ, vào lại là có lại.
- **Bỏ phiếu** (node trên map · lựa chọn sự kiện ??? · Locker Room): mỗi người 1 phiếu (đổi được), chấm phiếu hiện trên node / nút / thẻ. Đủ phiếu người có mặt, hoặc quá `run.coop.voteTime` giây từ phiếu đầu → bốc 1 phiếu ngẫu nhiên (lựa chọn nhiều phiếu dễ trúng hơn). Chỉ bỏ phiếu đi tiếp khi mọi người đã chọn xong BADGE. Sự kiện: tiền tính cho cả nhóm (ai cũng trả / cùng nhận), BADGE của sự kiện về 1 người đã bầu lựa chọn đó.
- **Thưởng**: thắng trận → mỗi người có mặt nhận tiền vào ví riêng + bộ 3 BADGE riêng (không trùng nhau, không trùng túi), gắn cho ai trong đội cũng được. Đối thủ mạnh lên theo số người thật ra sân (`run.coop.eloPer` Elo AI — đang 0 từ 2026-10-31 để não AI như chơi một mình, `statPer` chỉ số — `opts.statMul`). Đồng đội AI không nhận phần mạnh lên này.
- **Shop**: ví riêng, hàng chung (món đã mua hết với mọi người), mỗi người bấm DONE, mọi người xong thì Shop đóng.
- **Skill game**: 1 người đá (xoay vòng trong số người có mặt, `R.room.player`), người khác xem trận (`start{watch}`, `me = -1`; host không ra sân cũng chỉ xem). Thưởng tiền / BADGE về người đá; hỏng thì chấn thương vào 1 người ngẫu nhiên của đội. Tiến độ bài đi trong snapshot (`sk`), cổng SLALOM theo `drillSeed`. Máy chạy trận (host không ra sân / máy chủ riêng) có `me = -1`: bài đếm theo người đang đá `Drills.hero(g)` (ghế duy nhất), không theo `g.controlled` (lỗi cổng / xu không tính điểm, sửa 2026-10-31).
- **Ghế dự bị** (user 2026-10-31): phòng đủ 3 người muốn đổi vị trí thì 1 người ngồi ghế (slot -1) cho trống ô, người khác nhảy sang. Chỉ ở màn trước run (BUILD YOUR SQUAD / màn chờ của khách); máy giữ không ngồi được; còn người trên ghế thì chưa START RUN.
- **Cut scene của act** (mở act / trước boss / hạ boss) chiếu cùng lúc (`cs{k:'run:<act>:<kind>'}`), trước trận boss host chờ cả phòng xem xong. Thẻ mở act / hết run: chỉ host bấm.
- **Hết run**: gold meta + tiến trình CORE ROAD cộng cho từng máy (khách nhận khi bản sao báo hết run, 1 lần mỗi run).
- Không tăng `net.protocol` (chỉ thêm trường / gói mới trong phòng người chơi làm host). Test: `server/test/run-coop-test.js`.

## Kỹ thuật (đại khái)

- `config/run.config.js`: act (vùng, pool đội, boss, Elo, người dẫn truyện, kiểu kể), luật sinh map, trọng số node, tiền, BADGE, sự kiện `?`, bài tập. Đối thủ (đội, `mod`, `signature`, `barks`) chuyển từ `stories.config.js`; `stories.mods` giữ nguyên chỗ hoặc dời theo.
- `src/meta/run.js` (`SFC.Run`): sinh map theo seed, trạng thái run, chọn node, thưởng, BADGE → chỉ số character, lưu `Profile.data.run`. Không dính DOM (để co-op chạy được).
- `src/ui/runmap.js`: màn MAP (cuộn dọc như ảnh tham khảo Slay the Spire, icon node pixel, đường nét đứt, thẻ đối thủ), Shop, Locker Room, màn kết thúc run.
- `app.startRunMatch` (thay `startCupMatch`): `opts.knockout`, `opts.mod`, Elo AI theo act / tầng, chỉ số character từ BADGE, trọng số draft từ BADGE định hướng.
- BADGE chỉ số đi vào `Player.stats` của character qua `attrs.list[].keys` (cùng đường với DRILL / `Profile.avatarStats`). CoreScale đọc từ đó, không phải sửa.
- Màn bản đồ Area của RANKED (page `road`) đang tên GOAT PATH → đổi tên hiển thị khi làm giai đoạn 1.
- Thêm script mới: sửa `scripts/manifest.js` rồi `npm run manifest`.
- Chữ mới: thêm vào mọi gói ngôn ngữ, chạy `i18n-check`, build lại font ja.

## Đã làm — giai đoạn 1 (2026-10-25)

- Tab **GOAT PATH** thay tab FOOTBALL STORY ở màn PLAY (thứ tự tab tạm giữ RANKED · GOAT PATH · PRIVATE MATCH, nút PLAY trang chủ vẫn mở RANKED: đổi ở giai đoạn 5). Tab hiện 3 act (sân + boss, act chưa tới: bóng đen), số run / vô địch / boss đã hạ, START RUN / CONTINUE / FORFEIT RUN (bấm 2 lần).
- Màn ranked cũ tên GOAT PATH đổi thành **AREA MAP**. Page `story` cũ chỉ còn mở được từ PHÒNG TRƯNG BÀY.
- **Sinh map** (`Run.genAct`, seed lưu trong run): lưới 5 cột x 7 tầng, 4 đường đi không cắt nhau; tầng 0 Matchday, tầng 6 Locker Room, tầng 1–5 theo trọng số; Elite / Locker Room từ tầng 3; Shop / Locker Room / Elite không liền nhau trên 1 đường. Mỗi đường 2–4 trận. Đối thủ gán lúc sinh map, **không trùng đội trên cùng 1 đường** (sinh lại tới 300 lần; thử 900 act: 0 lần trùng). Matchday chỉ bốc `teams`, Elite chỉ bốc `elite` + boss act trước không được bốc (act 3).
- **Trận**: knockout (bàn thắng vàng), luật trận + câu nói của đội, **không có tỉ số khởi đầu**, Elo AI theo act + tầng (Elite +150). Thưởng = trận đơn (gold / XP), chưa có tiền trong run.
- **Thua = hết run.** FORFEIT ở tab và ở menu tạm dừng (2026-10-29: map không còn nút này) (FORFEIT (RUN OVER)). Tắt game giữa trận: `pending` lúc giao bóng -> lần mở sau `Run.settle()` tính forfeit + 1 trận thua.
- **Màn map**: thanh trên (~~ACT n + 3 vạch act + tên act · FORFEIT RUN / BACK~~ → 2026-10-29: chỉ dải đội hình bên trái + thẻ tiền (túi tiền pixel + số vàng) bên phải; co-op thêm INVITE / LEAVE ROOM; Esc = về tab GOAT PATH), map rộng hết màn, cuộn dọc bằng lăn chuột / phím **không hiện thanh cuộn** (user 2026-10-25). Map là **sa bàn chiến thuật** (user 2026-10-25): mặt cỏ sọc trong khung nhôm, vạch phấn (biên, giữa sân, vòng tròn giữa, vòng cấm + khung thành 2 đầu), node như nam châm, đường đi nét phấn; tầng 0 ở vòng cấm nhà dưới cùng, boss đứng trong vòng cấm đối thủ trên cùng. Mỗi tầng cách nhau 66px, node **dàn đều theo bề ngang** (chia đều theo số node của tầng, giữ thứ tự cột nên đường không cắt nhau) thay vì theo cột lưới. Node icon pixel (mới: `ui-shop` túi tiền, `ui-locker` áo treo), boss = cầu thủ đội boss + vương miện, đường đã qua tô màu act. **Không hiện thông tin đối thủ trước trận** (user 2026-10-25: vào trận mới biết; node trận chỉ cho biết MATCHDAY / ELITE, boss đã lộ ở thẻ mở act). Thẻ mở act (đầu run, sau mỗi boss). Hết run: thẻ RUN OVER (đội loại bạn + tỉ số) / CHAMPIONS + số trận thắng, boss đã hạ; CONTINUE xoá run.
- Skill game / Shop / Locker Room / ??? **chưa có nội dung**: vào là đi qua (báo "coming soon").
- Chưa dịch chữ mới (23 chuỗi), chưa có cut-scene act, chưa khoá act cho bản DEMO.

## Đã làm — giai đoạn 2–5 (2026-10-25)

- **BADGE** (`run.badges`, 30 món): 6 chỉ số thường + 6 hiếm + 3 sử thi (chỉ số) · 8 trường phái (1 món mỗi hệ, gộp "mạnh hơn" + "ra thường hơn": `power` cộng rating CoreScale cho Core hệ đó, `bias` nhân trọng số bốc) · 2 huyền thoại (Home Crowd: mỗi trận bắt đầu 1–0, không nâng cấp được · Energy Drink: nạp Tuyệt kỹ nhanh hơn) · 4 chấn thương. Không trùng trong túi, cộng dồn, chỉ áp cho character. Móc trận: `opts.coreBoost` / `draftBias` / `ultGain` (3 móc nhỏ trong `cores.js`, chỉ người có `p.avatar` / chủ ghế người chơi) + `opts.score` sẵn có; chỉ số character = `Run.avatarStats()` (nền `attrs.fixed` 80 + BADGE).
- **Tiền trong run** `$`: bắt đầu 50, thắng Matchday 26–36 / Elite 45–55 / Boss 85–100 / Skill game 16–24. Hiện ở thanh trên map; dòng "Run cash +$N" ở màn kết quả.
- **Thưởng sau trận**: thẻ "PICK A BADGE" chọn 1 trong 3 (độ hiếm theo `rarityWeights`: Matchday / Elite / Boss) hoặc SKIP. Bộ 3 lưu trong run (tải lại không đổi được).
- **Shop**: 5 BADGE (giá theo độ hiếm 40 / 70 / 110 / 160) + chữa 1 chấn thương $50 (1 lần mỗi Shop). **Locker Room**: chọn 1 — chữa 1 chấn thương hoặc nâng cấp 1 BADGE (số liệu x1.5, tên thêm "+"); thẻ nâng cấp hiện sẵn số sau nâng cấp.
- **Túi BADGE** (nút ở thanh trên, đếm BADGE + số chấn thương đỏ): thanh 6 chỉ số character + mọi thẻ.
- **Skill game** (`src/systems/drills.js`, `run.drills`): FINISHING (1 vs thủ môn, 3 bàn / 40 giây) · 1 VS 2 (2 bàn / 45 giây) · KEEP-AWAY (giữ bóng 15 giây trước 2 người đuổi). Chạy trên trận thật (đội bạn 1 người, không chọn Core, không màn giới thiệu), móc đồng hồ / bàn thắng / giao bóng của `match.js`. Màn giới thiệu bài (thưởng / rủi ro) trước khi vào. Qua: tiền + 1 BADGE ngẫu nhiên · hỏng / GIVE UP / tắt game giữa bài: 1 chấn thương (không mất run). Không tính vào thống kê trận. Màn kết quả ghi CLEAR! / FAILED.
- **???** (`run.mystery`): sự kiện 55 · rương (chọn 1 trong 3 BADGE) 15 · Skill game 15 · Shop 15. Node đã vào đổi icon theo thứ đã gặp. 5 sự kiện (`run.events`): người bán dạo, ông HLV già, thách sút xà, chuyên viên vật lý trị liệu, fan nhí; nút thiếu tiền / không có chấn thương để chữa thì mờ.
- **Hết run**: gold meta = tầng đã qua x6 + boss x60 (+250 vô địch), cộng thẳng vào gold; hiện trên thẻ RUN OVER / CHAMPIONS.
- **Cut-scene từng act** (giai đoạn 4): dùng lại người dẫn truyện + kiểu kể + khuôn cảnh của Story cũ — THE BLOCK: nhật ký (loa phường) · NIGHT CITY: manga (THE VOICE) · THE LEGENDS: phim hồi tưởng (Ông nội). Chiếu lúc vào act (trước thẻ mở act), trước trận boss (có cảnh VS), sau khi hạ boss (nâng cúp). Mạch 3 act nối thành 1 hành trình thành GOAT.
- **Meta** (giai đoạn 5): CORE ROAD tính theo run (`run.coreRoad`: tầng x15 + boss x60 vào `runs.road`, mở Core tới mốc Elo của các nấc cũ); **Ranked thôi mở Core** (Core đã mở vẫn giữ; gợi ý mở khoá ghi "GOAT PATH progress n/max"). Thẻ hết run hiện tiến trình + Core vừa mở. Nút PLAY trang chủ mở GOAT PATH, tab GOAT PATH đứng đầu (GOAT PATH · RANKED · PRIVATE MATCH). 5 thành tích mới (nhóm `run`). Bản DEMO: chỉ act 1 (`demo.runActs`), hạ boss act 1 = DEMO COMPLETE -> WISHLIST.
- Chưa dịch chữ mới; PHÒNG TRƯNG BÀY vẫn là cúp 4 Story cũ; màn AREA MAP vẫn vẽ mốc CORE ROAD theo Elo.

## Vòng chỉnh sửa 2026-10-26 (feedback user)

| Feedback | Quyết định (user chốt) |
|---|---|
| Chỉ số ban đầu cao quá (80 = ngang đối thủ), BADGE chỉ số không có ý nghĩa | Nền run **~65, lệch theo vị trí** (2026-10-30; 2026-10-27 là ~70, trước ~62) (`run.squad.base`: FWD sút / tốc độ, MID chuyền / rê, DEF đấm / bắt bóng). Số BADGE tăng (thường +8, hiếm +13 hoặc 2 chỉ số +7/+6, sử thi +4 tất cả / 2 chỉ số +10/+9). Chấn thương −12 (đùi −8/−8) |
| Cần thấy rõ đội hình + BADGE + chỉ số | **BADGE gắn cho cả đội** (thay luật cũ "chỉ character"): mỗi BADGE nhận được (thưởng trận, Shop, sự kiện, Skill game) → thẻ **WHO GETS IT?** chọn 1 trong 3 người (xem trước chỉ số sau khi đeo). BADGE trường phái / nạp Tuyệt kỹ / Home Crowd gắn cho 1 người nhưng vẫn tác dụng cả đội. **Vị trí của bạn + đồng đội chọn lúc START RUN** (màn BUILD YOUR SQUAD: 3 ô vị trí FWD / MID / DEF, character đứng sẵn ô FWD, bấm ô khác để nhảy sang (đồng đội AI ở ô đó đổi chỗ), ứng viên lấp ô trống kế tiếp (danh sách luôn hiện, mờ khi đủ ô; ✕ trên ô AI = bỏ ra để chọn lại; START RUN giữa dưới khi đủ ô) — chỉ số nền theo vị trí; bỏ bước chọn vị trí riêng (user 2026-10-26): roster + cầu thủ đường phố ngẫu nhiên, mỗi người 1 sở trường), giữ cả run; chỉ số đồng đội = nền vị trí + nghiêng theo chỉ số riêng (`lean`) + chút theo OVR (`ovrLean`) + BADGE của họ (thôi chép chỉ số đối thủ). **Màn SQUAD**: 3 thẻ cầu thủ, thanh chỉ số chia phần nền / BADGE (xanh) / chấn thương (đỏ sọc), BADGE đang đeo. **Dải đội hình** luôn hiện trên thanh map (mặt + OVR + dấu ✚) = nút mở SQUAD |
| Skill game chán, cần thấy tiến độ | Mỗi bài đếm 1 thứ, **3 mốc ĐỒNG / BẠC / VÀNG** (`run.drills[].tiers`), thanh tiến độ giữa trên HUD thay tỉ số. Thưởng theo mốc (`run.tierReward`): dưới ĐỒNG = chấn thương · ĐỒNG $ · BẠC $ + 1 BADGE · VÀNG $ + chọn 1 trong 3. 6 bài: FINISHING (bàn thắng) · TARGET PRACTICE (bàn vào bia sáng trôi trong khung) · SLALOM GATES (dẫn bóng qua cổng lần lượt, 2 người đấm) · PASS CHAIN (cả đội hình, chuỗi chuyền dài nhất, đồng đội AI trả bóng) · STREET BRAWL (hạ gục 1 vs 3) · HOT POTATO (giữ bóng, người đuổi vào thêm theo giây, mất bóng là hết) |
| Chấn thương chưa thấy trong trận | Chấn thương rơi vào **1 người ngẫu nhiên** của đội. Trong trận: **băng trắng đúng chỗ** (cổ chân / cổ tay / đùi / ngón chân, `badges[].part`, `sprites.js`) + **dấu ✚ đỏ** nhấp nháy cạnh đầu (`render/rundraw.js`) + **khoảnh khắc ra tay** (`src/systems/hurt.js`, `run.hurt`): cổ chân / đùi → chạy nước rút thỉnh thoảng khựng lại (OUCH!) · cổ tay → cú đấm thỉnh thoảng xịt (POOF, không choáng) · ngón chân → cú sút thỉnh thoảng trượt chân lệch hướng (SHANK!) |

## Lớp sức mạnh, BADGE mới và LEGEND (user chốt + ĐÃ LÀM 2026-10-28)

Vấn đề (user 2026-10-28): BADGE +chỉ số không đổi được gì thấy được trong trận (+8 trên nền ~70 = vài %, mà luật game là người chơi không đọc số); chọn BADGE cho đồng đội nào cũng không thú vị (lựa chọn tối ưu quá rõ, không thấy kết quả trên AI). Muốn đưa cảm giác bóng đá thật vào run.

### 4 lớp sức mạnh, mỗi lớp 1 làn riêng

| Lớp | Câu hỏi | Nhịp | Làm gì | Không bao giờ làm |
|---|---|---|---|---|
| **CORE** (giữ nguyên) | Trận này đá kiểu gì? | Reset mỗi trận | Chiêu trong trận: đánh, sút, chuyền, lướt + công thức Tuyệt kỹ | — |
| **LEGEND** (mới) | Người này là ai? | Hiếm (node LEGEND TRIAL) | Làm người đeo giỏi hơn ở thứ đã có (chỉ số) theo phong cách huyền thoại + khoảnh khắc LEGEND + nhược điểm | Tạo chiêu mới |
| **BADGE** (làm lại) | Đội mình bẻ luật nào? | Sau mỗi node | Bẻ cách Core ra, luật trận của đội, map / tiền / phòng của run | Hiệu ứng đánh / sút / chuyền · cộng chỉ số thuần |
| **CHỈ SỐ** | Mạnh cỡ nào? | Nền | Nền vị trí + sở trường đồng đội + LEGEND + chấn thương | — |

### BADGE mới: đồ bóng đá thật, của cả đội (`run.badges`)

- **Của cả đội**: túi chung `R.bag` (chấn thương vẫn theo người: `who`). Bỏ thẻ WHO GETS IT? (`R.assign`). Thưởng chọn 1 trong 3 = **1 bộ chung** `R.offer`; co-op **bỏ phiếu** (`vote.kind = 'pick'`, lựa chọn `0..n-1` / `skip`). Shop: ví riêng, đồ mua vào túi chung.
- **Chỉ số thuần bỏ khỏi pool**. Đồ bóng đá thật để người chơi thấy quen (user 2026-10-28).
- Nâng cấp ở Locker Room: `badges[id].up` = số liệu sau nâng cấp (không có `up` = không nâng được).

| Làn | BADGE | Hiệu lực (móc) |
|---|---|---|
| ~~Bốc Core~~ | ~~GPS Vest · Tactics Board · Golden Boot · Derby Scarf · Steel Studs · Freestyle Ball · Captain's Armband · Vuvuzela~~ | **Chuyển thành GEAR (2026-10-30)**: Core hệ đó ra thường hơn + mạnh hơn cho **riêng người đeo** — xem "GEAR" bên dưới |
| GEAR | Kit Bag (2026-10-30) | Mọi người trong đội thêm 1 ô GEAR (`gearSlots`) |
| Bốc Core | Scouting Report | +1 lá mỗi lượt chọn (`opts.draftCards`, màn chọn 4 lá `.cards.n4`); nâng cấp thêm 1 lượt đổi bài |
| Bốc Core | Referee's Coin | +lượt đổi bài mỗi lượt chọn (`opts.rerollBonus`) |
| Bốc Core | Pre-Season Camp | **Chọn Core sớm hơn 1 lượt** (user 2026-10-30): lượt thứ 2 dời lên trước giao bóng, đội đó bỏ lượt cuối — **tổng vẫn `match.maxUpgrades` Core** (`opts.draftBonus`; `startDraft(true, team)` không tính vào `upgradeIdx`, `startDraft()` bỏ đội đã chọn sớm ở `maxUpgrades − draftBonus` lượt cuối; đối thủ không bốc thêm) |
| Trận | Energy Drink | Cả đội nạp Tuyệt kỹ nhanh hơn (`opts.ultGain`) |
| Trận | Home Crowd | Mỗi trận bắt đầu 1–0 (`opts.score`) |
| Trận | VAR Monitor | Bàn thua đầu tiên mỗi trận được xem lại, trúng `chance` thì huỷ (NO GOAL! · VAR check), giao bóng cho bạn (`opts.varCheck`, `checkGoal`) |
| Trận | Referee's Watch | Đang thua lúc hết giờ: bù giờ 1 lần (ADDED TIME, lùi đồng hồ; `opts.addedTime`, `tickClock`) |
| Run | Shirt Sponsor | Thêm tiền mỗi trận thắng (`winCash`) |
| Run | Season Ticket | Shop rẻ hơn (`shopOff`, cả giá chữa) |
| Run | Ice Bath | Locker Room làm được 2 việc (`room.left`) |
| Run | Shin Guards | Chặn chấn thương đầu tiên mỗi act (`guard`, `R.guard`) |
| Run | Training Bibs | Mốc Skill game / LEGEND TRIAL giảm (`drillEase` -> `opts.drillEase`) |

Season Ticket kiểu "giữ 1 Core sang trận sau" đã được bàn rồi **bỏ** (đụng chốt #3: Core reset mỗi trận).

### GEAR: đồ cá nhân, 1 cầu thủ đeo (user duyệt mockup + ĐÃ LÀM 2026-10-30)

Mockup đã duyệt: `tools/mockups/gear.html`. BADGE = đồ của cả đội (miếng vá thêu tròn), **GEAR = đồ của 1 người** (thẻ treo góc vát có lỗ xỏ dây). Config `run.gear`, logic `src/meta/run.js` (phần GEAR), UI `src/ui/runmap.js` (`gearCard`, `gearSlots`), icon `gear-*` trong `pixelicons.js`.

- **Khi nào nhận:** thắng **trận thường** (node match) = chọn 1 trong 3 GEAR → **Who wears it?** (3 thẻ cầu thủ xem trước chỉ số ▲ / OVR mới, ô trống kế tiếp nhấp nháy) → người đã đủ ô: **Swap out which one?** (chọn món bỏ ra). BACK lùi 1 bước. Elite / Boss / Treasure / Skill game / sự kiện vẫn cho **BADGE đội**. KIT VAN: `shop.gear` món GEAR treo cạnh BADGE, mua xong chọn người đeo (không bỏ qua được).
- **GEAR chỉ số** (6 món, 1 chỉ số mỗi món): Running Spikes PAC · Power Boots SHO · Play Wristband PAS · Grip Socks DRI · Hand Wraps FIG · Keeper Gloves GK. Độ hiếm bốc theo `rarityWeights.gear`: THƯỜNG +4 · HIẾM +6 · SỬ THI +9 · HUYỀN THOẠI +12 (`gear.amount`); nâng cấp ở Locker Room + `gear.up`. Chỉ số tính trong `Run.ratingsOf`.
- **GEAR trường phái** (8 món, BADGE đội cũ chuyển sang): Core hệ đó ra thường hơn (`bias`) + mạnh hơn (`power`) **chỉ cho người đeo** — `Run.gearCore(i)` → `gearBoost` / `gearBias` trên spec avatar / đồng đội / ghế co-op → `p.gearBoost` / `p.gearBias` (`CoreSystem.rating` / `weight`). Không ra món trường phái mà đội đã có người đeo.
- **Ô:** mỗi người `gear.slots` = 3 ô (+ BADGE Kit Bag). Đủ ô thì đổi 1 món ra.
- **Hiển thị:** chân thẻ cầu thủ (SQUAD, thẻ LEGEND, màn chọn người đeo): ô LEGEND + ô GEAR (viền độ hiếm, vạch đáy = màu chỉ số / trường phái, tooltip tên + hiệu lực) · dải đội hình trên thanh map: 1 vạch dưới OVR mỗi ô GEAR.
- **Co-op:** bỏ phiếu từng bước như LEGEND (`vote` kind `pick` → `wear` → `swap`, `back` = lùi). Bản sao khách mang `squad[i].gear` + `offer.gear / sel / who`.
- **Run lưu từ trước:** BADGE trường phái trong túi đội tự thành GEAR của character (còn ô thì đeo).

### LEGEND (`config/legends.config.js`, `src/systems/legends.js`, `src/render/legenddraw.js`)

- Huyền thoại bóng đá **tên nhái** (kiểu PES chưa bản quyền: không tên thật, không mặt, không số áo / CLB thật). Nhận ra qua **hành vi + danh hiệu**, không qua tên. Toàn bộ tên ở config để đổi nhanh nếu có vấn đề pháp lý (cần người có chuyên môn xem trước khi lên Steam).
- **1 người tối đa 1 LEGEND** (`squad[i].legend`). **Ai trong đội cũng nhận được, gắn lệch vị trí được** (user 2026-10-28: để người chơi tự sáng tạo; `role` của LEGEND chỉ là vị trí sở trường để hiện). Người thật hay AI đều đeo được, nên co-op 3 người vẫn có lớp này.
- **Có được**: node **LEGEND TRIAL** trên map (`nodes.legend`, trọng số `map.weights.legend`, từ tầng 1, không liền nhau). Node hiện sẵn chân dung LEGEND đang chờ (biết trước để chọn đường). Vào node: thẻ giới thiệu · START / SKIP. **Trial khớp combo** (user 2026-10-30): LEGEND **cho người đá mượn kỹ thuật của mình** trong bài (`match.js` gắn `p.legend` + `p.lent`: không kèm nhược điểm), bài SKILL GAME `combo` (`run.drills.combo`, không bốc cho Skill game thường) đếm **số lần làm được đúng kỹ thuật đó** (`trial.goal` lần trong `trial.time` giây, `opts.trial`; HUD 1 mốc màu LEGEND, đơn vị = tên kỹ thuật; banner tên kỹ thuật + "Pull it off n times"; kết thúc SIGNED! / TRIAL FAILED). Đội hình + cách chơi theo `trial` của từng LEGEND (bảng dưới): `size` [bạn, đối thủ] · `keepers` (số đối thủ trông khung) · `foeBall` (đối thủ cầm bóng tấn công, bạn giữ bóng lâu thì trả lại) · `feed` (đồng đội AI cầm bóng là chuyền trả bạn: `ground` / `lob` = tạt bổng). Đếm: kỹ thuật sút (power / trivela / finesse / bicycle) = bàn thắng mà cú đá cuối mang `ball.legTech` đúng kỹ thuật (sai kỹ thuật: chữ NO COMBO) · lofted through = đồng đội đón được (`match.js gainPossession`) · bruiser / slide / engine / sweeper / rainbow (hất qua đầu khi có đối thủ trong `tuning.rainbow.near` px) = `Legends` gọi `Drills.combo`. Qua → thẻ **"wants to join"** (`R.join = { id }`). Hỏng: không mất gì.
- **UI** (user 2026-10-30, mockup `tools/mockups/legend-ui.html`: bớt chữ, combo là chính): cả 2 màn dùng **dải LEGEND** (`RunUI.hero`): chân dung to quay mặt ra trước trên hào quang + tia màu LEGEND · danh hiệu · tên · **chip COMBO** (ngôi sao + tên kỹ thuật + keycap từng phím, mô tả ở tooltip) · nhãn nhược điểm đỏ (DIVER / FEATHERWEIGHT / HOTHEAD / WILD CARD, câu đầy đủ ở tooltip; LEGEND chỉ đánh đổi chỉ số thì câu nằm ở tooltip tên). Màn trial: "LEGEND TRIAL" nhỏ + dải LEGEND + ô **"n×" + tên kỹ thuật | đồng hồ** + 1 dòng "He lends you his combo…" · START / SKIP. Màn nhận: dải LEGEND + "Who gets him?" + 3 thẻ cầu thủ (thẻ đang trỏ / chọn bằng phím = xem trước ▲▼ + OVR mới + bóng LEGEND sau lưng; nhãn "Replaces <danh hiệu>" nếu thay LEGEND cũ) · NO THANKS (`Run.answerJoin(who | null)`). **Bấm chọn = hoạt cảnh** (`RunUI.sign`, chơi một mình): chân dung bay vào thẻ → từng chỉ số đổi lần lượt (số chạy + bật +n / −n) → OVR mới + chip COMBO **NEW COMBO** đóng dấu lên thẻ + chip LEGEND dưới thẻ → mới vào đội. Co-op bỏ phiếu thì không diễn.
- **Co-op**: trial 1 người đá (xoay vòng như Skill game). Người nhận LEGEND: **bỏ phiếu** (`vote.kind = 'join'`, lựa chọn `0` / `1` / `2` / `no`).
- **Trong trận** (`p.legend`, gắn từ avatars / mates / seats; online gửi kèm ghế, `Profile.sanitizeLegend`):
  - Nghiêng chỉ số luôn bật (`stats`, tính trong `Run.ratingsOf`) + Core trường phái của LEGEND ra thường hơn cho riêng người đeo (`legends.schoolBias`).
  - **Khoảnh khắc LEGEND**: đúng tình huống của huyền thoại (`moment.on`: box · hold · final · longShot · longPass · steal · dodge · goal · hardHit · win) → cộng chỉ số mạnh trong `moment.dur` giây (final: tới hết trận), tối đa `moment.max` lần / trận, nghỉ `cooldown`. Hình: **cut-in chân dung cạnh trái màn hình** (LEGEND + danh hiệu + tên; không phủ tối, không dừng trận, cách nhau `cutGap`, không đè cut-in Tuyệt kỹ) + **bóng huyền thoại sau lưng** (viền màu + chính LEGEND mờ, to gấp rưỡi) + tiếng khán đài (`Audio.legend`). `Effects.legendCut` / `legendAura` đi qua `sync.js`.
  - **Nhược điểm cơ chế** (áp như nhau cho người và AI): đánh đổi chỉ số (số âm trong `stats`) · `dive` (bị đánh nằm lâu hơn, DIVE!) · `light` (văng xa hơn) · `red` (đòn nặng đủ `hits` lần = RED CARD!: không ra đòn / sút / chuyền + đi bộ `time` giây) · `random` (mỗi trận 1 chỉ số lên, 1 xuống).

| LEGEND (tên nhái) | Danh hiệu | Vị trí · trường phái | Khoảnh khắc (khi nào) | Nhược điểm | Trial (khớp combo, 2026-10-30) |
|---|---|---|---|---|---|
| Erling Haalandroid | THE CYBORG | FWD · STRIKER | cầm bóng vào vòng cấm đối thủ | chuyền / rê kém | BRUISER RUN: giật chỏ văng 4 người / 35s · 1 vs 3 người đuổi |
| Zlatko Ibrakadabra | THE LION | FWD · KICKER | ra đòn nặng trúng | không chịu chuyền | BICYCLE KICK: 2 bàn / 45s · cả đội hình (đồng đội tạt bổng) vs 1 thủ môn |
| Mario Balotello | WHY ALWAYS ME? | FWD · CHAOS | ghi bàn | mỗi trận 1 chỉ số lên, 1 xuống | POWER SHOT: 3 bàn / 40s · vs thủ môn |
| Neymor Jr. | SAMBA STAR | FWD · ILLUSION | né đòn (lướt xuyên) | ăn vạ: nằm lâu hơn | RAINBOW FLICK: hất qua người 4 lần / 35s · 1 vs 2 người đuổi |
| Leo Mecci | THE LITTLE MAGICIAN | MID · SPEED | giữ bóng lâu | nhỏ con: văng xa | FINESSE SHOT: 3 bàn / 40s · vs thủ môn + 1 hậu vệ |
| Andrea Pirlow | THE ARCHITECT | MID · TIKI-TAKA | chuyền dài tới chân | chậm | LOFTED THROUGH: 3 đường đồng đội đón được / 40s · cả đội hình vs 2 |
| N'Golo Kantay | THE ENGINE | MID · IRON | cướp bóng | sút kém | ENGINE PRESS: cướp 4 lần / 35s · 1 vs 3 (đối thủ cầm bóng) |
| Sergio Ramen | MINUTE 93 | DEF · BRAWLER | FINAL PUSH / bàn thắng vàng (tới hết trận) | THẺ ĐỎ | SLIDE TACKLE: xoạc bay 4 người / 35s · 1 vs 3 (đối thủ cầm bóng) |
| Manuel Neuermann | THE SWEEPER | DEF · IRON | giành bóng từ đối thủ | sút kém | SWEEPER SPIN: đọc + bắt 3 cú sút / 40s · 1 vs 2 người sút |
| Roberto Carloss | THE CANNON | DEF · SPEED | gồng sút ở sân nhà | bỏ vị trí (thủ môn kém) | TRIVELA: 2 bàn / 45s · vs thủ môn + 1 hậu vệ |

- **KỸ THUẬT ĐẶC TRƯNG** (user 2026-10-29, hướng A — tăng trần kỹ năng): mỗi LEGEND dạy người đeo 1 kỹ thuật nâng cao (`legends.techniques`, `tech` từng LEGEND). **Trong run, kỹ thuật nâng cao chỉ có qua LEGEND** (`gateInRun`; 4 kỹ thuật cũ cũng chuyển vào lớp này), ngoài run 4 kỹ thuật cũ vẫn mở cho mọi người như trước. AI không dùng 4 kỹ thuật cũ; **cầu thủ AI đeo LEGEND tự dùng kỹ thuật của LEGEND đó** (user 2026-10-30, `legends.ai`: sút POWER / FINESSE / TRIVELA, RAINBOW khi người chắn phía trước, BRUISER giật chỏ (đối thủ ra đòn sát bên: phản ngay), LOFTED THROUGH khi chọc khe / đường chuyền bị chắn, ENGINE PRESS khi áp sát còn thể lực, SLIDE TACKLE từ 18–46px, BICYCLE với bóng bổng trong tầm sút, SWEEPER SPIN khi thủ môn AI bắt được cú sút). Thẻ LEGEND / trial / ô LEGEND trên HUD hiện tên + tổ hợp phím (`Input.keysText`, theo phím người chơi đã đổi).

Bản 3 (feedback user 2026-10-29, lần 2): **tạm tắt KHOẢNH KHẮC LEGEND** (tăng chỉ số theo tình huống + cut-in + bóng mờ: `legends.moment.enabled = false`, cơ chế vẫn giữ, bật lại được) — LEGEND chỉ còn kỹ thuật (combo) + nghiêng chỉ số luôn bật + nhược điểm; **bỏ mọi chữ bật lên trên đầu** do LEGEND (tên kỹ thuật, WIPEOUT!, STOLEN!, RED CARD!, DIVE!...) — tên kỹ thuật chỉ hiện ở ô LEGEND trên HUD; ô LEGEND hiện hồi chiêu của kỹ thuật (slide / bruiser...) thay cho hồi chiêu khoảnh khắc. Phím C đổi tên action thành `trick` (Trivela + Bruiser Run).

Bản 2 (feedback user 2026-10-29): kỹ thuật hợp với hình ảnh từng huyền thoại + mỗi kỹ thuật có **diễn riêng** (tư thế trên người `Effects.legendTech`, vệt bóng `legendBall`, vẽ ở `src/render/legenddraw.js`; chữ tên kỹ thuật; ô LEGEND trên HUD phóng to + loé + tia toả, tên kỹ thuật bay lên). Phím mới `power` (F) và `trivela` (C) chỉ có trên bàn phím; tay cầm dùng tổ hợp (mỗi LEGEND chỉ 1 kỹ thuật nên không lẫn).

| LEGEND | Kỹ thuật | Bàn phím | Tay cầm | Cơ chế | Diễn |
|---|---|---|---|---|---|
| Haalandroid | BRUISER RUN (bản 3) | dẫn bóng + giữ E, bấm C | giữ RB, bấm LB | Giật chỏ: đối thủ sát bên văng ra + choáng, vẫn giữ bóng. Trong 0.3s sau khi bấm, ai đấm / tắc vào bạn cũng văng ngược (bấm đúng lúc bị tắc) · nghỉ 1.1s | Vai xô, người bè ra, sóng va chạm 2 bên vai, khựng hình khi chặn được |
| Balotello | POWER SHOT (bản 3) | F + D | Q + Z + D (RT + LB + X) | Bóng nhanh x1.35, chuẩn hơn, sệt hơn | Gồng ra sau rồi bung, người phình to, vết nứt + sóng dưới chân, khựng hình + rung, vệt bóng thiên thạch trắng cam |
| Carloss | TRIVELA | C + D | E + Z + D (RB + LB + X) | Như cứa lòng nhưng **cong ngược phía**, cong mạnh hơn | Nghiêng người, cung quét má ngoài màu LEGEND, vệt bóng cong + lấp lánh |
| Neymor | RAINBOW FLICK | phím sút giả (giữ D / A + S) | như vậy | Bóng cuộn lên sau gót, vòng qua đầu (đỉnh ~30px, 0.6s, không ai chạm được lúc bay) rồi **rơi ngay trước mặt** người đang chạy và về chân, dẫn bóng tiếp (bản 3) | Bật nhảy ngửa ra sau, vệt bóng **cầu vồng 7 màu** |
| Mecci | FINESSE SHOT | Z + D | LB + X | Cứa lòng (cơ chế cũ) | Xoay người 1 vòng như vũ công, vòng sáng quanh người, vệt cong lấp lánh |
| Ibrakadabra | BICYCLE KICK | D khi bóng cao tới | như vậy | Dứt điểm 1 chạm với bóng cao ≥ `minZ`: tự nhắm khung thành, lực x1.35 | Bay lên lộn ngược 1 vòng, khựng hình + tia tốc độ, vệt bóng tia chớp |
| Kantay | ENGINE PRESS | giữ E + D (không cầm bóng) | giữ RB + X | Tự đuổi người cầm bóng / bóng lỏng, rút thể lực x2.2; chạm người cầm bóng = chọc bóng (STOLEN!) | Chúi người, tia tốc độ + khói động cơ phía sau suốt lúc giữ |
| Ramen | SLIDE TACKLE | E + A (không cầm bóng) | RB + B | Nằm trượt theo hướng mũi tên; chạm đối thủ đầu tiên = họ bay **lộn đúng 3 vòng** (rơi bóng); hụt = nằm | Nằm ngang trượt + bụi cỏ, đối thủ lộn 3 vòng trên không (WIPEOUT!) |
| Neuermann | SWEEPER SPIN | đọc cú sút (W trong vòng cấm) rồi bắt bóng | như vậy | Bắt được bóng trong 2.5s sau khi đọc trúng → xoay 1 vòng rồi chuyền cho người dâng cao nhất, người đó tăng tốc thoáng chốc (GO!) | Bật lên xoay 1 vòng, sóng màu LEGEND; người nhận có bóng huyền thoại |
| Pirlow | LOFTED THROUGH | Q + W | RT + Y | Chọc khe bổng (cũ) | Ưỡn người như nhạc trưởng, vệt bóng lụa vàng |
| ~~Balotello~~ | TOE POKE | chạm D thật nhanh | chạm X | Tạm không LEGEND nào dạy (Balotello đổi sang POWER SHOT) | Chọc chân tới trước, vệt ngắn |

Ghi chú: Ibra BICYCLE KICK gần ý với hình móc xe đạp của Tuyệt kỹ Comet One-Two (cùng là xe đạp chổng ngược) — user chọn; diễn khác (tia chớp, màu LEGEND). Chip shot / Fake shot không còn LEGEND nào dạy trong run (vẫn mở cho mọi người ngoài run).

- **Sửa phím** (user 2026-10-29): khi cầm bóng, lướt (Q) chỉ ra lúc **nhấc phím** và chưa dùng cho kỹ thuật (`p.skillArm`, `human.js`), nên bấm Q trước rồi D / W vẫn thành sút bổng / chọc khe bổng. Không cầm bóng: lướt vẫn ra ngay lúc bấm (né đòn).
- **HUD trong trận** (`src/ui/hud.js`, user 2026-10-28: không làm rối sân): 2 cánh của thanh kỹ năng ở dải đáy dưới vạch biên (2 góc dưới đã có ô PING / thông báo). Trái = **BADGE của cả đội** (lưới 2 hàng icon 11px, viền màu độ hiếm, góc vàng = đã nâng cấp; VAR / Referee's Watch mờ khi dùng hết trong trận, loé khi vừa ra tay). Phải = **ô LEGEND của bạn** (chân dung LEGEND; sẵn sàng = sáng · đang bật = viền màu LEGEND nhấp nháy + vạch cạn dần + số giây · nghỉ = quét tối + số giây đếm lùi, loé khi xong · hết lượt = xám; 2 chấm dưới = số lần trong trận; Ramen: vạch đỏ trên đầu ô = đòn nặng tới THẺ ĐỎ, bị thẻ = ✕ đỏ). Máy khách online nhận trạng thái qua `Effects.legendHud` (sync.js) rồi tự đếm lùi; BADGE lấy từ bản sao run. LEGEND của đồng đội không có ô (thấy qua cut-in).
- Ý tưởng HLV (Pep / Mourinho / Ferguson...) **không làm thành lớp riêng**: phần "cả đội" của họ thành BADGE (Referee's Watch ~ Fergie time), user gộp phần cá nhân vào LEGEND.
- Chưa làm: hành vi AI riêng theo LEGEND (Haalandroid đứng chờ trong vòng cấm...), lương LEGEND (trừ tiền run mỗi trận), icon pixel riêng cho từng BADGE mới (đang dùng lại icon có sẵn), bản dịch chữ mới (pt-BR / pt-PT / es / ja).
- Test: `server/test/run-coop-test.js` mục 3 (bỏ phiếu BADGE) + mục 6 (LEGEND: trial → join ai cũng được, lệch vị trí, bỏ phiếu co-op, chỉ số, khoảnh khắc, thẻ đỏ, BADGE -> opts trận).
- **Thử nhanh (dev)**: SETTINGS › TEST › **RUN TEST** (`src/ui/runtest.js`) hoặc `index.html?runtest`: chọn act / đối thủ / vị trí / LEGEND từng người / BADGE (thêm từng món, tất cả, bản nâng cấp), rồi MATCH · LEGEND TRIAL · LEGEND JOIN CARD · MAP · PICK A BADGE · SHOP · LOCKER ROOM. Đường tắt: `?runtest=match&badges=var,report,camp&legends=ramen,haalandroid,` · `?runtest=trial.pirlow` · `?runtest=trialcard.pirlow` (thẻ giới thiệu trial) · `?runtest=join.pirlow` (thẻ nhận LEGEND) · `?runtest=map`. Trong trận: `[` `]` đổi LEGEND của bạn ngay (chỉ số + kỹ thuật) · `L` khoảnh khắc LEGEND của bạn ngay · `K` mọi LEGEND đội bạn · `8` / `9` / `0` / `-` như STORY TEST; bảng góc dưới trái hiện trạng thái LEGEND + BADGE đang bật. Run thử không đụng run thật (chạy qua `Run.mirrorOn`), END TEST RUN / tải lại trang là về run thật.

## Các giai đoạn

| Giai đoạn | Nội dung |
|---|---|
| **1 · Khung run** | `Run` + sinh map + màn MAP + Matchday / Elite (= Matchday) / Boss + 3 act với 16 đội có sẵn + thua = hết run + lưu giữa chừng + màn kết thúc run. Thay tab FOOTBALL STORY |
| **2 · Item + kinh tế** | Hệ BADGE (chỉ số, trường phái, định hướng draft) + tiền trong run + Shop + Locker Room + quy đổi gold meta |
| **3 · Node phụ** | Skill game (2–3 bài đầu) + chấn thương + `?` (sự kiện) + BADGE Trận |
| **4 · Câu chuyện act** | Người dẫn truyện + cut-scene intro / boss / hạ boss cho 3 act |
| **5 · Meta** | Mở Core theo XP run · hạ Ranked · TROPHY ROOM + achievement mới · bản demo chỉ chơi act 1 |
| **6 · Co-op** | Run nhiều người, player-host — đã làm 2026-10-26 (mục "Co-op") |
| Sau | thêm đội cho act 3 · daily run (seed) · độ khó cao hơn sau khi vô địch (kiểu Ascension) |

## Câu hỏi còn mở

1. Màn bản đồ Area của RANKED (đang tên GOAT PATH) đổi thành tên gì?

## Vòng chỉnh UI 2026-10-29 (feedback user)

- **Thanh trên map**: bỏ nút BACK, FORFEIT RUN, tên act + vạch act. Còn dải đội hình (trái) + thẻ tiền run (phải, cùng khung với dải đội hình; Shop dùng chung thẻ này: `RunUI.cash`). Esc trên map = về tab GOAT PATH (phòng co-op: ở lại).
- **Khoanh phấn khi chọn node**: bấm node = 1 vòng phấn vẽ tay quanh node (elip nghiêng, méo, nét cuối chồng qua nét đầu, mép sần bằng filter SVG `#rmChalk`, bụi phấn rơi) trong 0.45s + tiếng cào phấn (`Audio.chalk`), xong mới vào node; khoá thao tác lúc vẽ (`RunUI.drawing`). Node đang đứng giữ 1 vòng phấn mờ cố định (seed theo id node nên không đổi hình). Co-op: khoanh xong mới gửi phiếu.
- **Thẻ cầu thủ (SQUAD + thẻ LEGEND xin vào đội)**: hình cầu thủ to ở giữa (nền đèn sân, màu LEGEND nếu có / LEGEND đang xem trước), OVR + vị trí góc trái trên, ✚ chấn thương góc phải, chỉ số nhỏ 2 bên (3 trái · 3 phải, số + vạch mảnh; xanh = trên nền, đỏ = dưới nền, xem trước: vàng ▲ / đỏ ▼), tên + nhãn YOU / PLAYER dưới hình, hàng LEGEND + chấn thương dưới cùng (`RunUI.statCols` / `squadCard`).
- **Thẻ cầu thủ: chỗ trống không dùng chữ** — chưa có LEGEND = ô nét đứt với bóng đen 1 huyền thoại, hàng BADGE của đội lấp ô trống nét đứt cho đủ 10 ô (`TEAM_SLOTS`); chữ "No legend yet" / "No badges" chỉ còn ở tooltip.
- **Màn chọn BADGE** (user bỏ ý tưởng Crossbar Challenge, chọn bố cục như SQUAD): 3 thẻ to (miếng vá có chỉ khâu màu độ hiếm + tên + công dụng, **không ghi độ hiếm** — màu viền là đủ) · dưới là hàng **TEAM BADGES** (`RunUI.teamBar`, dùng chung với SQUAD). Chọn = icon BADGE bay theo đường cong vào ô trống đầu tiên của hàng, ô loé lên rồi mới nhận (`RunUI.fly`; có hẹn giờ dự phòng nếu trình duyệt không chạy hoạt cảnh). Co-op: bỏ phiếu như cũ (không bay).
- **Shop = KIT VAN** (`src/ui/kitvan.js`, `SFC.KitVan`; mockup duyệt ở `tools/mockups/run-ui.html`): xe bán đồ đá bóng ven đường lúc hoàng hôn, **pixel art thật** trên canvas 320x180 (khối màu cứng + dither, chữ pixel 3x5 cho bảng hiệu / thẻ giá). BADGE treo móc trên bảng gỗ đục lỗ, thẻ giá bìa cát-tông (đồng xu + số; đã bán = SOLD đỏ); hộp cứu thương trên quầy = chữa 1 chấn thương (1 hộp / chấn thương, tối đa 4; chữa 1 lần mỗi Shop như cũ). **Tài xế** trong cabin giải thích món đang trỏ trong bong bóng thoại (tên + công dụng, không ghi độ hiếm) và nói kết quả (Good choice! / thiếu tiền / hết hàng). Con trỏ = bàn tay pixel chỉ. **Mua = bàn tay góc nhìn người chơi** (úp tay, tay áo sân nhà của đội) với từ mép dưới lên, nắm món đồ, giật khỏi móc rồi rút xuống ra khỏi màn. Xe nổ máy: thân xe nhún nhẹ 1 pixel mỗi 1.4 giây, bánh xe đứng yên, ống xả nhả khói pixel. Không còn title SHOP; tiền ở góc phải trên, LEAVE (co-op: DONE) góc phải dưới.
- **Món HOT**: mỗi Shop 1 món ngẫu nhiên giá x `run.shop.hot` (0.5), sticker HOT đỏ + thẻ giá đỏ; lưu `items[].hot`.
- Chưa dịch: 4 câu mới của tài xế (cùng phần chữ GOAT PATH chưa dịch).
- **Màn SQUAD**: thẻ cầu thủ cao 204px (lấp khoảng trống), hình cầu thủ to hơn, chỉ số giãn theo chiều cao (chỉ màn SQUAD; thẻ LEGEND xin vào đội giữ cỡ cũ).
- **Cheat dev** (chỉ bản dev, `src/ui/runtest.js`): trên map GOAT PATH bấm `0` = thắng ngay node trận đang chọn 3-0 (không đá), nhận tiền + bộ 3 BADGE như thắng thật.

## Vòng chỉnh đội hình 2026-10-29 (feedback user)

- **Chỉ số là của cầu thủ, không của ô** (user: xếp vào vị trí nào cũng giữ đúng chỉ số của người đó): nền = `run.squad.base[vị trí sở trường]` của chính người đó (`Run.natural(m)`: vị trí có nền khớp nhất với độ lệch chỉ số riêng rating − OVR; chỉ số đều nhau thì chọn theo tên cho cố định) + lean + ovrLean như cũ. Character: nền toàn diện `run.squad.you` (~65, trung bình 3 nền vị trí). `Run.traits` bỏ.
- **Trường phái Core hay ra** của đồng đội (2 trường phái nhiều nhất trong deck, `Run.schoolsOf`): icon ở góc phải trên thẻ cầu thủ (SQUAD, thẻ LEGEND xin vào đội, BUILD YOUR SQUAD, băng ghế). Character / bạn bè co-op: không có.
- **Thẻ cầu thủ dùng chung** `RunUI.pcard` (SQUAD · LEGEND xin vào đội · BUILD YOUR SQUAD). SQUAD: thẻ nhỏ lại ~10% (166x184).
- **BUILD YOUR SQUAD làm lại** (bố cục như SQUAD): tiêu đề giữa trên (BACK / INVITE / LEAVE ROOM góc phải) · 3 ô vị trí = thẻ cầu thủ (ô trống: viền nét đứt + bóng đen, ô cần chọn kế tiếp nhấp nháy xanh, ✕ = bỏ đồng đội) · dòng gợi ý / START RUN · **băng ghế** ứng viên (mặt, tên, OVR, vị trí sở trường, 2 chỉ số mạnh nhất, trường phái). **Kéo thả** (HTML5 drag & drop, `RunUI.bindDrag` / `pkDrop`): ứng viên → ô (người đang ở đó về băng ghế; ô của bạn / bạn bè không nhận) · thẻ của bạn → ô khác = đổi chỗ · đồng đội giữa 2 ô = đổi chỗ · đồng đội → băng ghế = bỏ ra. Bấm / phím vẫn như cũ.

