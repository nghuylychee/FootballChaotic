# GOAT PATH — Football Story thành run kiểu Slay the Spire

> Trạng thái: **GIAI ĐOẠN 1–5 ĐÃ LÀM (2026-10-25), chờ chơi thử.** Còn: co-op (giai đoạn 6), PHÒNG TRƯNG BÀY theo run, màn Elite riêng. Số liệu là số khởi điểm.
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
| 6 | Loại node | Matchday · Elite · Skill game · Shop · Locker Room (nghỉ) · `?` · Boss. **Elite tạm chơi như Matchday**, sau này thiết kế màn riêng |
| 7 | Câu chuyện | **Phương án B**: mỗi act là một vùng có theme, đối thủ và người dẫn truyện riêng. 4 Story cũ bỏ |
| 8 | Mở Core | **Theo tiến trình run** (thay Elo / CORE ROAD theo Area) |
| 9 | Ranked | **Hạ xuống chế độ phụ** |
| 10 | Co-op | Ưu tiên, nhưng **làm sau khi xong bản chơi một mình** |
| 11 | Gold | **Tách** tiền trong run khỏi gold meta: tiêu trong run, hết run đổi một phần ra gold meta |
| 12 | Tên chế độ | **GOAT PATH**. Tên này đang là màn bản đồ Area của RANKED (page `road`, `src/ui/road.js`) → màn đó phải đổi tên khi làm |
| 13 | Tên item | **BADGE** |
| 14 | Bỏ run | **Có nút FORFEIT** (bỏ run, tính như thua). Thoát giữa trận = forfeit = hết run |
| 15 | Item áp cho ai | **Chỉ character của người chơi**, đồng đội AI không được cộng |
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
- **FORFEIT** (bỏ run): nút ở MAP và ở menu tạm dừng trong trận, có hỏi xác nhận. Tính như thua: màn KẾT THÚC RUN, vẫn quy đổi thưởng theo tầng đã tới.
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
| 1 | **KHU PHỐ** (ban ngày: làng, phố, trường, hẻm) | Ward Uncles · Moped Boys · School Ghosts · Pigeon Gang | Block Wardens (GIANT WARDENS) | 30 → 300 · boss 350 |
| 2 | **THÀNH PHỐ ĐÊM** (sân thượng, quảng trường, chợ đêm) | Sky Hoppers · Billboard Kids · Lantern Crew · Noodle Kickers · Fortune Tellers | ngẫu nhiên: Night Owls hoặc Market Mamas | 450 → 1000 · boss 1150 |
| 3 | **HUYỀN THOẠI** (vịnh, quảng trường, làng xưa) | Rust Buckets · Retired Refs · Grandpa's Squad + boss act 2 không được bốc (làm Elite) | The Old Legends (KING LEO 1976) | 1300 → 2150 · boss 2700 |

- Elo AI tính theo **act + tầng**, không theo đội. Đội giữ kit, cầu thủ, Core đặc trưng (`signature`), luật trận, câu nói trong trận.
- Tỉ số khởi đầu (`score`, The Uncles dẫn 1–0): **đề xuất bỏ trong run**. Gặp ở tầng 1 mà thua là hết run thì quá gắt; giữ lại cho Elite / boss nếu cần.
- Pool act 3 mỏng (3–4 đội). Thêm đội mới cho act 3 là việc content sau.

## Các loại node

| Node | Nội dung | Thắng / xong | Thua / hỏng |
|---|---|---|---|
| **Matchday** | 1 trận 3v3 bình thường với đội trên node, có luật trận của họ | Tiền + **chọn 1 trong 3 BADGE** | Hết run |
| **Elite** | **Tạm thời = Matchday** với đối thủ mạnh hơn (Elo + 1 bậc), BADGE hiếm hơn. Chỗ dành cho màn đặc biệt thiết kế sau | Tiền nhiều hơn + chọn 1 trong 3 BADGE (độ hiếm cao hơn) | Hết run |
| **Skill game** | Bài tập ngắn 30–60 giây (xem dưới) | Tiền + 1 BADGE ngẫu nhiên | Nhận 1 **chấn thương** (BADGE xấu) |
| **Shop** | 4–5 BADGE bày bán (giá theo độ hiếm) + dịch vụ chữa 1 chấn thương | — | — |
| **Locker Room** | Chọn 1: **chữa 1 chấn thương** hoặc **nâng cấp 1 BADGE** (lên 1 bậc độ hiếm) | — | — |
| **`?`** | Bốc 1 trong: sự kiện (cut-scene + 2–3 lựa chọn được / mất) · Matchday · Skill game · Shop · BADGE miễn phí | tuỳ | tuỳ |
| **Boss** | Trận boss cuối act. Cut-scene trước trận | Nhiều tiền + **chọn 1 trong 3** BADGE hiếm trở lên + cúp act | Hết run |

Hoà hết giờ: **bàn thắng vàng** như cup hiện tại (`opts.knockout`).

### Skill game (thiết kế kỹ sau)
Lấy ý tưởng từ 13 bài DRILL có sẵn (`progression.attrs.drills.list`): mỗi bài dùng lại engine trận (`opts.training`) với 1 mục tiêu đo được. Ứng viên:
- **Finishing**: ghi N bàn vào thủ môn AI trong 30 giây
- **Cone Slalom**: dẫn bóng qua cọc trước khi hết giờ
- **Rondo**: giữ bóng 30 giây trước 2 người đuổi
- **Reaction Wall**: cản N cú sút
- **Penalty Duel**: loạt đá luân lưu
- **Sprint Ladder**: chạy tới vạch, né chướng ngại

Chấn thương = **BADGE xấu** nằm chung túi (viền đỏ), ví dụ trừ PACE. **Không tự hết**, chỉ chữa ở Locker Room hoặc Shop (user chốt). Vì vậy đường đi qua Skill game có rủi ro thật: hỏng nhiều thì phải vòng qua Locker Room / Shop.

## Hệ item: BADGE

**Tên: BADGE** (user chốt; miếng huy hiệu may lên áo đấu). Cần tên riêng vì "item" trong config đã là costume (`progression.items`), "card" là lá Core, "DRILL" là hệ chỉ số cũ.

### Cơ chế: dùng lại 6 chỉ số + CoreScale có sẵn
- Run dùng 6 chỉ số PACE · SHOOTING · PASSING · DRIBBLE · FIGHT · KEEPER (`progression.attrs`). Hệ này đang ẩn ngoài trận thường (`attrs.hidden`, mọi người = `fixed` 80); **riêng run thì hiện**.
- ~~Character bắt đầu run ở 80~~ → từ 2026-10-26 nền **~62 lệch theo vị trí** (`run.squad.base`). BADGE cộng thêm, tối đa **99**.
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

- **Phòng**: tab GOAT PATH › PLAY WITH FRIENDS (mở phòng với run đang có, chưa có thì host chọn đội hình ngay trong phòng: mã phòng + INVITE trên thanh trên của BUILD YOUR SQUAD) · JOIN (mã phòng). Trước khi bắt đầu run, mọi người bấm ô vị trí để nhảy qua lại (ô có bạn bè đứng thì không vào được); ô bạn bè đứng vẫn có 1 đồng đội AI dự phòng (host chọn, hoặc ngẫu nhiên lúc START RUN). Giữa run vị trí cố định. Luôn người chơi làm host (`Session.createRoom({ run: true })`, Steam / PeerJS, không lên máy chủ riêng). Tối đa 3 người = 3 vị trí; ghế trống = đồng đội AI của run.
- **Run là của host** (lưu ở hồ sơ host, chơi tiếp một mình được khi phòng đóng). Khách giữ bản sao (`Run.mirror`, `Run.mirrorOn`): run riêng của khách không bị đụng. Host gửi bản sao trong gói `lobby` (`rn` + `r`), khách gửi thao tác `ra{a,...}` → host kiểm tra + áp (`RunUI.apply`).
- **Đội hình**: host đứng đúng vị trí character của mình (`Room.seatHost`); khách ngồi vào ô đồng đội AI cùng vị trí (`squad[i].h` = mã hồ sơ `Profile.data.uid`), dùng chỉ số + BADGE của ô đó. Khách rời: ô trở lại AI, BADGE giữ nguyên; ví khách giữ theo mã hồ sơ, vào lại là có lại.
- **Bỏ phiếu** (node trên map · lựa chọn sự kiện ??? · Locker Room): mỗi người 1 phiếu (đổi được), chấm phiếu hiện trên node / nút / thẻ. Đủ phiếu người có mặt, hoặc quá `run.coop.voteTime` giây từ phiếu đầu → bốc 1 phiếu ngẫu nhiên (lựa chọn nhiều phiếu dễ trúng hơn). Chỉ bỏ phiếu đi tiếp khi mọi người đã chọn xong BADGE. Sự kiện: tiền tính cho cả nhóm (ai cũng trả / cùng nhận), BADGE của sự kiện về 1 người đã bầu lựa chọn đó.
- **Thưởng**: thắng trận → mỗi người có mặt nhận tiền vào ví riêng + bộ 3 BADGE riêng (không trùng nhau, không trùng túi), gắn cho ai trong đội cũng được. Đối thủ mạnh lên theo số người thật ra sân (`run.coop.eloPer` Elo AI, `statPer` chỉ số — `opts.statMul`).
- **Shop**: ví riêng, hàng chung (món đã mua hết với mọi người), mỗi người bấm DONE, mọi người xong thì Shop đóng.
- **Skill game**: 1 người đá (xoay vòng trong số người có mặt, `R.room.player`), người khác xem trận (`start{watch}`, `me = -1`; host không ra sân cũng chỉ xem). Thưởng tiền / BADGE về người đá; hỏng thì chấn thương vào 1 người ngẫu nhiên của đội. Tiến độ bài đi trong snapshot (`sk`), cổng SLALOM theo `drillSeed`.
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
- **Sinh map** (`Run.genAct`, seed lưu trong run): lưới 5 cột x 7 tầng, 4 đường đi không cắt nhau; tầng 0 Matchday, tầng 6 Locker Room, tầng 1–5 theo trọng số; Elite / Locker Room từ tầng 3; Shop / Locker Room / Elite không liền nhau trên 1 đường. Mỗi đường 2–4 trận. Đối thủ gán lúc sinh map, **không trùng đội trên cùng 1 đường** (sinh lại tới 300 lần; thử 900 act: 0 lần trùng). Elite lấy thêm boss act trước không được bốc (act 3).
- **Trận**: knockout (bàn thắng vàng), luật trận + câu nói của đội, **không có tỉ số khởi đầu**, Elo AI theo act + tầng (Elite +150). Thưởng = trận đơn (gold / XP), chưa có tiền trong run.
- **Thua = hết run.** FORFEIT ở tab, ở map và ở menu tạm dừng (FORFEIT (RUN OVER)). Tắt game giữa trận: `pending` lúc giao bóng -> lần mở sau `Run.settle()` tính forfeit + 1 trận thua.
- **Màn map**: thanh trên (ACT n + 3 vạch act + tên act · FORFEIT RUN / BACK), map rộng hết màn, cuộn dọc bằng lăn chuột / phím **không hiện thanh cuộn** (user 2026-10-25). Map là **sa bàn chiến thuật** (user 2026-10-25): mặt cỏ sọc trong khung nhôm, vạch phấn (biên, giữa sân, vòng tròn giữa, vòng cấm + khung thành 2 đầu), node như nam châm, đường đi nét phấn; tầng 0 ở vòng cấm nhà dưới cùng, boss đứng trong vòng cấm đối thủ trên cùng. Mỗi tầng cách nhau 66px, node **dàn đều theo bề ngang** (chia đều theo số node của tầng, giữ thứ tự cột nên đường không cắt nhau) thay vì theo cột lưới. Node icon pixel (mới: `ui-shop` túi tiền, `ui-locker` áo treo), boss = cầu thủ đội boss + vương miện, đường đã qua tô màu act. **Không hiện thông tin đối thủ trước trận** (user 2026-10-25: vào trận mới biết; node trận chỉ cho biết MATCHDAY / ELITE, boss đã lộ ở thẻ mở act). Thẻ mở act (đầu run, sau mỗi boss). Hết run: thẻ RUN OVER (đội loại bạn + tỉ số) / CHAMPIONS + số trận thắng, boss đã hạ; CONTINUE xoá run.
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
| Chỉ số ban đầu cao quá (80 = ngang đối thủ), BADGE chỉ số không có ý nghĩa | Nền run **~62, lệch theo vị trí** (`run.squad.base`: FWD sút / tốc độ, MID chuyền / rê, DEF đấm / bắt bóng). Số BADGE tăng (thường +8, hiếm +13 hoặc 2 chỉ số +7/+6, sử thi +4 tất cả / 2 chỉ số +10/+9). Chấn thương −12 (đùi −8/−8) |
| Cần thấy rõ đội hình + BADGE + chỉ số | **BADGE gắn cho cả đội** (thay luật cũ "chỉ character"): mỗi BADGE nhận được (thưởng trận, Shop, sự kiện, Skill game) → thẻ **WHO GETS IT?** chọn 1 trong 3 người (xem trước chỉ số sau khi đeo). BADGE trường phái / nạp Tuyệt kỹ / Home Crowd gắn cho 1 người nhưng vẫn tác dụng cả đội. **Vị trí của bạn + đồng đội chọn lúc START RUN** (màn BUILD YOUR SQUAD: 3 ô vị trí FWD / MID / DEF, character đứng sẵn ô FWD, bấm ô khác để nhảy sang (đồng đội AI ở ô đó đổi chỗ), ứng viên lấp ô trống kế tiếp (danh sách luôn hiện, mờ khi đủ ô; ✕ trên ô AI = bỏ ra để chọn lại; START RUN giữa dưới khi đủ ô) — chỉ số nền theo vị trí; bỏ bước chọn vị trí riêng (user 2026-10-26): roster + cầu thủ đường phố ngẫu nhiên, mỗi người 1 sở trường), giữ cả run; chỉ số đồng đội = nền vị trí + nghiêng theo chỉ số riêng (`lean`) + chút theo OVR (`ovrLean`) + BADGE của họ (thôi chép chỉ số đối thủ). **Màn SQUAD**: 3 thẻ cầu thủ, thanh chỉ số chia phần nền / BADGE (xanh) / chấn thương (đỏ sọc), BADGE đang đeo. **Dải đội hình** luôn hiện trên thanh map (mặt + OVR + dấu ✚) = nút mở SQUAD |
| Skill game chán, cần thấy tiến độ | Mỗi bài đếm 1 thứ, **3 mốc ĐỒNG / BẠC / VÀNG** (`run.drills[].tiers`), thanh tiến độ giữa trên HUD thay tỉ số. Thưởng theo mốc (`run.tierReward`): dưới ĐỒNG = chấn thương · ĐỒNG $ · BẠC $ + 1 BADGE · VÀNG $ + chọn 1 trong 3. 6 bài: FINISHING (bàn thắng) · TARGET PRACTICE (bàn vào bia sáng trôi trong khung) · SLALOM GATES (dẫn bóng qua cổng lần lượt, 2 người đấm) · PASS CHAIN (cả đội hình, chuỗi chuyền dài nhất, đồng đội AI trả bóng) · STREET BRAWL (hạ gục 1 vs 3) · HOT POTATO (giữ bóng, người đuổi vào thêm theo giây, mất bóng là hết) |
| Chấn thương chưa thấy trong trận | Chấn thương rơi vào **1 người ngẫu nhiên** của đội. Trong trận: **băng trắng đúng chỗ** (cổ chân / cổ tay / đùi / ngón chân, `badges[].part`, `sprites.js`) + **dấu ✚ đỏ** nhấp nháy cạnh đầu (`render/rundraw.js`) + **khoảnh khắc ra tay** (`src/systems/hurt.js`, `run.hurt`): cổ chân / đùi → chạy nước rút thỉnh thoảng khựng lại (OUCH!) · cổ tay → cú đấm thỉnh thoảng xịt (POOF, không choáng) · ngón chân → cú sút thỉnh thoảng trượt chân lệch hướng (SHANK!) |

## Các giai đoạn

| Giai đoạn | Nội dung |
|---|---|
| **1 · Khung run** | `Run` + sinh map + màn MAP + Matchday / Elite (= Matchday) / Boss + 3 act với 16 đội có sẵn + thua = hết run + lưu giữa chừng + màn kết thúc run. Thay tab FOOTBALL STORY |
| **2 · Item + kinh tế** | Hệ BADGE (chỉ số, trường phái, định hướng draft) + tiền trong run + Shop + Locker Room + quy đổi gold meta |
| **3 · Node phụ** | Skill game (2–3 bài đầu) + chấn thương + `?` (sự kiện) + BADGE Trận |
| **4 · Câu chuyện act** | Người dẫn truyện + cut-scene intro / boss / hạ boss cho 3 act |
| **5 · Meta** | Mở Core theo XP run · hạ Ranked · TROPHY ROOM + achievement mới · bản demo chỉ chơi act 1 |
| **6 · Co-op** | Run nhiều người, player-host — đã làm 2026-10-26 (mục "Co-op") |
| Sau | Màn Elite riêng · thêm đội cho act 3 · daily run (seed) · độ khó cao hơn sau khi vô địch (kiểu Ascension) |

## Câu hỏi còn mở

1. Màn bản đồ Area của RANKED (đang tên GOAT PATH) đổi thành tên gì?
