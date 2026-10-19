# FOOTBALL STORY — Cup knockout co-op PvE

> Trạng thái: **ĐÃ CHỐT THIẾT KẾ + ĐÃ LÀM BẢN CHƠI MỘT MÌNH (2026-10-18)**. Chưa làm: co-op online (xem "Việc tiếp theo").
> Code: `config/stories.config.js` (nội dung) · `src/meta/cup.js` (`SFC.Cup`) · `src/ui/cup.js` (`SFC.CupUI`) · `app.startCupMatch` (main.js).
> Mục tiêu: một mode cho người chơi không thích đá rank. Đá cùng bạn (hoặc bot) qua 1 cup knockout có câu chuyện riêng, gom đủ các Story để có động lực completion.

## Quyết định đã chốt (user, 2026-10-18)

| # | Câu hỏi | Chốt |
|---|---|---|
| 1 | Độ dài | 1 Story = 1 cup = **4 trận knockout** (1/8 → tứ kết → bán kết → chung kết), chơi hết trong 1 buổi (~20–30 phút) |
| 2 | Core giữa các trận | **Reset mỗi trận** như hiện tại (4 lượt chọn / trận, công thức Tuyệt kỹ tính trong trận) |
| 3 | Thua | **Thua là out**, không có vé vớt ("bóng đá là như vậy") |
| 4 | Thưởng | **Gold + cosmetic + achievement**. Không mở Core, không Elo. Có trang tổng hợp mọi Story để chinh phục từng cái (completion) |
| 5 | Demo (itch / CrazyGames) | Có mode này, **chỉ chơi được 1 Story** |
| — | Tên mode | **FOOTBALL STORY** |
| 6 | Menu | **Tab thứ 2 màn PLAY**: `RANKED · FOOTBALL STORY · PRIVATE MATCH` |
| 7 | Thử thách phụ | **Có**: mỗi Story có sao thử thách cho completion |
| 8 | Thống kê | Trận Story **tính vào** `matches` / `wins` / `goals` (achievement cũ, level) |
| 9 | Độ khó | **Config theo từng Story**, người chơi không chọn |
| 10 | Chủ phòng thoát giữa cup | **Kết thúc cup** cho cả phòng |
| 11 | Luật trận (2026-10-19) | **Mỗi đối thủ một luật trận, được nặng tay** cho thấy rõ, nhưng **không lấy / cấm Core** (mất fun) |
| 12 | Mạch truyện (2026-10-19) | **Mỗi Story gói gọn trong chính nó**, không có cốt truyện xuyên suốt các Story |
| 13 | Đồng đội (2026-10-19) | Vẫn là đồng đội **mở** (`SFC.Mates`), không thành nhân vật cố định, vì hướng tới co-op |
| 14 | Co-op online (2026-10-19) | Chạy **player-host** (người chơi làm chủ phòng), **không qua máy chủ riêng** |
| 15 | Cốt truyện (2026-10-19) | **Mỗi Story một concept riêng** (tham khảo anime), không trùng mô-típ. Theme (sân, màu, đội, luật trận) giữ nguyên |

## Luồng chơi

```
chọn Story ─► (phòng: mời bạn / đá một mình) ─► intro Story ─► BRACKET
   ▲                                                              │
   │        ┌──── thua ── màn KẾT (vòng đã tới + thưởng) ◄────────┤
   │        │                                                     ▼
   └────────┴──── thắng chung kết ── NÂNG CÚP + outro ◄── hội thoại trước trận ─► TRẬN ─► hội thoại sau trận ─► BRACKET
```

- **Đội người chơi luôn là 1 đội (co-op).** 3 người online thì 3 người đá. Thiếu người thì ghế trống do AI đá: đồng đội AI đang chọn của người chơi (`SFC.Mates`), giống PRIVATE MATCH co-op hiện tại.
- **Một mình:** 1 người + 2 đồng đội AI, chạy offline, không cần mạng. Đây là cách duy nhất để chơi ở bản demo (ONLINE khoá).
- **Vào / ra giữa cup:**
  - Rớt mạng giữa trận: như hiện tại (`away`, AI đá thay, `hello{tok}` để vào lại).
  - Người mới chỉ vào được **giữa 2 trận** (ở màn BRACKET), nhận 1 ghế AI.
  - Chủ phòng thoát: cả cup kết thúc, mọi người nhận thưởng tới vòng đã qua (chốt, không chuyển chủ phòng).
- **Độ khó** do từng Story tự config (`ai` mỗi vòng), không có lựa chọn NORMAL / HARD. Story sau khó hơn Story trước.
- **Hoà:** knockout phải có người thắng. Hiện `goldenGoal` hết `goldenGoalMaxTime` (60 s) là hoà.
  - MVP: trận Story tắt giới hạn đó, nghĩa là bàn thắng vàng tới khi có bàn.
  - Sau này: luân lưu (penalty shootout). Đây là khoảnh khắc co-op rất kịch tính nhưng là cơ chế mới phải làm.

## Một Story gồm gì (content)

Mỗi Story là **1 mục config** (đề xuất `config/stories.config.js`), không cần code riêng trừ khi có gimmick mới:

```js
{
  id: 'ward_cup',
  name: 'The Ward Cup',                 // chữ người chơi thấy (i18n)
  blurb: 'One-line pitch on the card',
  cover: 'alley',                       // arena làm ảnh bìa thẻ Story
  rounds: [                             // 4 vòng: R16, QF, SF, F
    {
      team: 'uncles_fc',                // id trong teams.list (đội mới hoặc có sẵn)
      arena: 'alley',
      elo: 30,                          // độ khó AI cả 2 đội = MainPath.aiProfile(elo) (thang Elo của Main Path)
      signature: 'giant_keeper',        // Core đặc trưng đội AI chắc chắn cầm (opts.signature có sẵn)
      before: [/* hội thoại trước trận */],
      after:  [/* hội thoại sau trận thắng */],
    },
    // ... QF, SF, F (F = boss)
  ],
  rival: 3,                             // vòng có đội kình địch (thắng đậm ở nhánh bên kia, gặp ở chung kết)
  fillers: [/* 11 đội lấp các nhánh khác */],
  reward: { gold: [25, 40, 60, 120], item: 'ward_trophy' },   // gold theo vòng đã thắng, costume khi vô địch lần đầu
  stars: [                              // thử thách phụ (completion), kind: champ · cleanFinal · hattrick · bigWin
    { id: 'champ',       kind: 'champ',      desc: 'Win the cup' },
    { id: 'clean_final', kind: 'cleanFinal', desc: 'Keep a clean sheet in the final' },
    { id: 'hattrick',    kind: 'hattrick',   desc: 'Score a hat-trick in one match' },
  ],
}
```

### Đối thủ là content chính
PvE được phép làm điều PvP không làm được: **đối thủ bất đối xứng**. Mỗi vòng nên có 1 nét riêng người chơi nhớ được:
- **Đội** có kit, tên, cầu thủ, `coreWeights` / `aiStyle` riêng (đội chỉ đấm, đội chỉ chuyền, đội toàn thủ môn...).
- **Core đặc trưng** (`signature`): có sẵn từ boss Main Path.
- **Luật trận (`mods`, đã làm cho Ward Cup, xem mục "Luật trận" bên dưới)**, ưu tiên dùng lại status sẵn có. Ý tưởng cũ:
  - sân trơn: `slip` theo chu kỳ
  - đội AI to gấp đôi: ngược với `tiny`
  - bóng nặng
  - đối thủ có Tuyệt kỹ ngay từ đầu trận
- **Boss chung kết**: 1 gimmick lớn, có thể có Tuyệt kỹ chỉ boss dùng được. Vẫn theo luật Tuyệt kỹ: có telegraph và né được bằng Z.

### Luật trận (cả 4 Story, 2026-10-19)
Mỗi vòng có `mod` (id trong `stories.mods`, số liệu ở config) chạy bởi `src/systems/matchmods.js` (`SFC.MatchMods`), hình ở `src/render/modsdraw.js`.
- **Chủ luật = đội đối thủ:** luật chỉ đánh vào đội bạn, có khi còn giúp đội họ. **Không lấy / cấm Core** (user chốt).
- Mỗi luật **báo trước bằng hình** (làn nhấp nháy, bóng đổ, vòng đếm ngược...) và **lướt (Z) né được** nếu là đòn trúng người. Có banner tên luật + 1 câu gợi ý lúc bóng lăn lần đầu, có dòng PITCH RULE ở thẻ đối thủ màn cup, và lời thoại trước trận giải thích luật.
- **Leo thang khi đội chủ luật bị dẫn** (dày hơn, mạnh hơn): trận không dễ dần khi bạn đã dẫn.
- Hình = `Effects.prop` / `pop`. Vật di chuyển (xe máy, đèn pha, ghế bay, đàn chim) có vị trí là hàm thuần của tuổi vật thể (`MatchMods.at`), nên khi làm co-op player-host thì khách vẽ được qua lệnh hiệu ứng sẵn có. Ma mờ tính lúc vẽ (`MatchMods.alpha`).
- Hook trong code trận: `match.js` (create / kickoff / clock / update / goal), `human.js` (cầm ghế: phím ra đòn = ném), `actions.js` lightHit (khổng lồ: `shrug`), `player.js` hit (trọng tài: `hitBy`), AI qua `g.aiHook` (các chú đi nhặt ghế). Trạng thái dùng lại `SFC.CoreStat` (trơn té, teo nhỏ) của `cores-ult2.js`. Hệ số tốc độ liên tục dùng `keepSpeed` (1 buff mỗi người, không chồng).
- Âm thanh riêng: `g.sfx('ult', 'mod.*')` (`src/engine/ultsfx.js`, danh sách ở `docs/SFX.md`).
- **Câu nói trong trận** (`rounds[i].barks`: `kickoff` · `goal` · `conceded` · `mod`): bong bóng thoại trên đầu đội trưởng đối thủ (popup kind `talk`), cách nhau `stories.barkGap` giây.
- **Biến tấu thể thức:** `rounds[i].score` = tỉ số lúc giao bóng (The Uncles được dẫn 1–0 theo "luật nhà").
- Sao `modClean` (vô địch mà luật trận chung kết không trúng đội bạn lần nào, `g.mod.hits`) có sẵn, hiện chưa Story nào dùng.

| Story | Vòng | Đội | Luật | Cách chơi | Khi họ bị dẫn |
|---|---|---|---|---|---|
| Ward Cup | 1/8 | The Uncles | **PLASTIC STOOLS** + bắt đầu thua 0–1 | Ghế nhựa trên sân: không cầm bóng mà đi vào là nhặt lên, ra đòn = ném. Ghế trúng người: choáng + rơi bóng (lướt né được). Các chú cũng đi nhặt ghế ném bạn (mỗi lúc 1 người). Ghế trên sân chặn người cầm bóng, bóng dội ra, sút mạnh vỡ ghế | (luật nhà: họ dẫn sẵn) |
| | Tứ kết | Moped Boys | **DELIVERY LANE** | Làn dọc nhấp nháy rồi xe máy phóng qua: văng + choáng + rơi bóng. Moped Boys trúng thì được quá giang | xe dày hơn |
| | Bán kết | School Ghosts | **NOW YOU SEE THEM** | Ma xa bóng mờ dần còn bóng hình. Chuông reo: 2 con ma đổi chỗ | chuông dày hơn |
| | Chung kết | Block Wardens | **GIANT WARDENS** | Cả đội to x1.5, mạnh hơn, chậm hơn chút. Đấm nhẹ bật ra (TOO BIG!), phải dùng đòn nặng | ANGRY GIANTS: to x1.7 |
| Rooftop | 1/8 | Pigeon Gang | **PIGEON BOMBS** | Đàn chim bay ngang thả "bom" (vòng báo chỗ rơi), bãi nằm lại: dẫm phải trơn té | thả dày hơn |
| | Tứ kết | Sky Hoppers | **NIGHT WIND** | Gió dọc sân: bóng trôi theo gió, đội bạn bị đẩy, Hoppers xuôi gió chạy nhanh | gió hay thổi về khung thành bạn |
| | Bán kết | Billboard Kids | **SPRAY WALLS** | Tường sơn mọc giữa bóng và khung thành bạn tấn công: chặn người + bóng thấp (lốp qua được), Kids đi xuyên | dày hơn |
| | Chung kết | Night Owls | **SEARCHLIGHT** | Đèn pha quét sân, cầm bóng trong đèn đủ lâu = FREEZE (từ bản Ward Cup đầu, user chuyển sang đây) | LOCKDOWN: đèn thứ 2 |
| Night Market | 1/8 | Lantern Crew | **FALLING LANTERNS** | Đèn lồng rơi gần bóng (bóng đổ to dần): choáng + văng | 2 cái một lúc |
| | Tứ kết | Noodle Kickers | **HOT BALL** | Bóng nóng một lúc: cầm quá lâu (vòng cam) là bỏng, rơi bóng. Noodle Kickers cầm thoải mái | nóng dày hơn |
| | Bán kết | Fortune Tellers | **FORTUNE CARDS** | Rút bài đổi trận vài giây: THE MOUSE (đội bạn teo nhỏ) · THE STORM (1 cơn gió) · THE STAR (Tellers chạy nhanh) | rút dày hơn |
| | Chung kết | Market Mamas | **MARKET STALLS** | Sạp hàng đẩy ra từ mép trên / dưới, bóp sân: người bị đẩy, bóng dội | 2 sạp cùng lúc |
| Legends | 1/8 | Rust Buckets | **HIGH TIDE** | Nước dâng từ mép trên / dưới: đội bạn lội chậm, bóng lăn nặng. Thuỷ thủ không sao | dâng dày hơn |
| | Tứ kết | Retired Refs | **THE REFS** | Người chơi đánh choáng 1 Ref: thẻ vàng, lần 2 thẻ đỏ (đứng ngoài vài giây). Đồng đội AI không bị thẻ. Refs phạm lỗi thoải mái | — |
| | Bán kết | Grandpa's Squad | **BACK IN MY DAY** | "Hồi đó...": màn hình sepia, đội bạn chạy chậm như phim cũ | dày hơn |
| | Chung kết | The Legends | **GOLDEN STAR** | 1 Legend thành STAR (sút mạnh, chạy nhanh). Cướp bóng từ STAR: bạn nhận GOLDEN BOOT | — |

### 4 concept cốt truyện (user chốt 2026-10-19: không trùng mô-típ)
Mỗi Story khác nhau ở **concept, người dẫn truyện, cách kể và vai của đội boss**. Người dẫn truyện = `stories.list[].narrator`
(`name` hiện trên hộp chữ, `look` / `kit` vẽ trên khuôn cupHost, `horn: false` = không cầm loa, `art` = khuôn mặc định cho lời của họ;
Legends có thêm `youngLook` / `youngKit` cho cảnh hồi tưởng).

| Story | Concept (tham khảo) | Người dẫn truyện | Cách kể riêng | Đội boss |
|---|---|---|---|---|
| THE WARD CUP | **Mùa hè cuối cùng**: hẻm sắp bị giải toả làm bãi đỗ xe, đây là Ward Cup cuối (hoài niệm mùa hè, buồn mà ấm) | WARD LOUDSPEAKER (loa phường) | Đếm ngược "còn N ngày tới máy ủi" sau mỗi vòng, tờ giấy giải toả (cupItem notice) | Block Wardens = bảo vệ công trường, lạnh lùng; twist: đội trưởng lớn lên ở hẻm, chính anh vẽ khung thành trên tường → bỏ việc, bãi đỗ xe bị huỷ |
| ROOFTOP NIGHT LEAGUE | **Thư mời / kỳ thi bí ẩn** (Hunter x Hunter): thiệp đen hình cú, giải đấu bí mật, 4 thử thách trước bình minh | THE VOICE (giọng nói từ loa, không thấy mặt: khuôn cupVoice) | Mỗi vòng là "TRIAL", đối thủ là người đã thi trượt / giám khảo | Night Owls; twist: đội trưởng chính là The Voice, sắp rời thành phố, đang tìm người kế nghiệp → trao mũ (Night Owl Cap) |
| NIGHT MARKET CUP | **Đại chiến mì** (Food Wars, hài): cứu xe mì của Uncle Noodle bằng món Mì Nửa Đêm huyền thoại | UNCLE NOODLE (ông chủ xe mì, không cầm loa) | Mỗi trận thắng lấy 1 nguyên liệu (lửa · sợi mì · gia vị · "vị của trận chung kết"), cuộn công thức + tô mì (cupItem recipe / bowl) | Market Mamas = giám khảo nếm mì; không phải phản diện: nếm xong nhớ món mẹ nấu, cho xe ở lại |
| GRANDPA'S LEGENDS | **Trận đấu dang dở** (bí ẩn kể bằng hồi tưởng, truyền thừa): 50 năm trước ông nội chấn thương ở chung kết rồi bỏ bóng đá | GRANDPA (kể chuyện, không cầm loa) | Hồi tưởng sepia (cupMemory), mỗi vòng lộ thêm 1 mảnh: thuỷ thủ chở ông về → trọng tài đã bỏ qua pha phạm lỗi → đồng đội cũ giận ông bỏ cuộc → đội trưởng Legends là người phạm lỗi | The Legends; muốn khép lại trận đấu 50 năm, cuối cùng ông nội có mặt trên khán đài |

Khuôn cảnh mới cho các concept (`src/ui/story-cup.js`): `cupMemory` (hồi tưởng sepia, hạt phim; `young` = người dẫn truyện hồi trẻ, `fall` = ngã chấn thương),
`cupVoice` (loa trên cột đèn + đôi mắt cú trong bóng tối), `cupItem` (`item`: notice · invite · recipe · bowl · boots). Lời thoại ghi `art` + các tham số này.
Story mới sau này: chọn 1 concept chưa dùng (vd. hoán đổi thân xác, du hành thời gian, giải đấu của các sư phụ ẩn danh, đội bóng của người máy...), 1 người dẫn truyện riêng, 1 cách kể riêng.

### Câu chuyện = cut scene kiểu PROLOGUE (user chốt 2026-10-18)
Cốt truyện kể bằng cut scene giống PROLOGUE (`src/ui/story.js`: cả màn là cảnh vẽ procedural, chữ gõ máy, chữ hét rung màn, giữ Enter để bỏ qua),
chiếu lúc mở cup · trước mỗi trận · sau trận thắng · lúc nâng cúp. Để không phải vẽ cảnh mới cho từng câu, có **bộ khuôn cảnh dùng lại** ở
`src/ui/story-cup.js` (đăng ký bằng `Story.addArt`), nhận tham số từ config:
- `cupAlley` hẻm ngày hội + cúp (zoom vào cúp) · `cupHost` bình luận viên cầm loa · `cupFace` đối mặt VS (tự chèn trước câu đầu tiên của 2 đội, kèm tên vòng)
- `cupTalk` cận cảnh người nói · `cupSad` đối thủ vừa thua dưới đám mây mưa · `cupRival` đội kình địch đè bẹp nhánh bên kia · `cupLift` nâng cúp
- Config chỉ là lời thoại `[{ who, text, art?, team?, zoom? }]`: mỗi dòng 1 cảnh, khuôn mặc định theo chỗ + người nói (`CupUI.scenes`), hộp chữ có nhãn tên người nói màu áo.
- Story mới: viết lời thoại, chỉ vẽ thêm khuôn cảnh khi muốn 1 khoảnh khắc riêng (vd. sóng biển cho Beach Cup).
- **BRACKET kể chuyện phụ:** các trận khác trong cup được giả lập ra tỉ số. Riêng đội kình địch luôn thắng đậm để lên chung kết gặp mình.
- Giọng văn: street football chaos, hài, trash talk. Chữ tiếng Anh làm key i18n như mọi chỗ khác.

## Thưởng và completion

- **Gold** theo vòng đã thắng, kể cả khi bị loại. Thắng chung kết được nhiều nhất.
- **Cosmetic** khi vô địch lần đầu: 1 món riêng của Story đó (ví dụ cúp đội trên đầu, áo đội rival), không có trong gacha.
- **Sao thử thách** (`stars`, 3 sao mỗi Story): sao 1 luôn là vô địch, 2 sao còn lại là thử thách riêng của Story. Sao giữ vĩnh viễn, mỗi sao chỉ cần đạt 1 lần (không cần cả 3 trong cùng 1 lần chơi). Lý do để chơi lại Story đã vô địch.
  - Thử thách nên đo được từ dữ liệu trận có sẵn: thủng lưới, tỉ số, có dùng Tuyệt kỹ không, số người online, vòng nào...
  - Chữ thử thách ngắn, không số (theo luật mô tả Core).
- **Trận Story tính vào thống kê chung** (`matches`, `wins`, `goals`), nên cũng cộng vào achievement cũ và level.
- **Achievement** (thêm `stat` mới vào `achievements.config.js`):
  - `story`: vô địch Story `story` (target 1), mỗi Story 1 cái
  - `stories`: số Story đã vô địch (3, 5, tất cả)
  - `finals`: số lần vào chung kết
  - `stars`: tổng số sao thử thách
- **Trang FOOTBALL STORY:**
  - Lưới thẻ Story, mỗi thẻ gồm ảnh bìa, tên, vòng xa nhất từng tới, cúp nếu đã vô địch, 3 sao thử thách.
  - Story chưa chơi được (demo) vẫn hiện nhưng có khoá, để người chơi thấy còn nhiều content.
  - Đầu trang: tổng completion (ví dụ `3 / 8 CUPS · 11 / 24 ★`).
- **Lưu:** `Profile.data.story = { <id>: { best: 0..4, wins, stars: [id...] } }` (`best` = số trận đã thắng, 4 = vô địch). Lưu qua `SFC.Storage` như các phần khác. Cập nhật `docs/SAVE.md` khi làm.

## Đặt ở đâu trong menu

**Tab thứ 2 của màn PLAY** (chốt): `RANKED · FOOTBALL STORY · PRIVATE MATCH`, đổi bằng Q/E (LB/RB) như hiện tại.
- Tab FOOTBALL STORY = trang tổng hợp Story. Chọn 1 Story thì vào phòng Story: mời bạn bằng mã phòng như PRIVATE MATCH, hoặc START đá một mình.
- `Menu.playTabs` thêm 1 tab ở giữa. Ở demo, tab này mở (khác PRIVATE MATCH đang khoá).

## Kỹ thuật (đại khái)

- **Trận:** `SFC.Game` với `opts.story = { id, round }`. Đội người chơi là đội 0. Đội 1, sân, `aiProfile`, `signature`, `mods` lấy từ vòng tương ứng. Bàn thắng vàng không giới hạn thời gian. Không có `mainPath` nên không có Elo và không có `pending` loss.
- **Phòng online:** `Room` thêm loại phòng `story`.
  - Lineup co-op có sẵn, tất cả người ở đội 0.
  - Hết trận thì về màn BRACKET, **không gửi `lobby`**. Trạng thái cup (Story, vòng, kết quả bracket) đi trong `start{opts.story}`.
  - Vào lại giữa cup dùng cơ chế `resume` sẵn có.
- **Chỉ player-host (user chốt 2026-10-19):** phòng Story do người chơi làm chủ (Steam P2P / PeerJS), không qua máy chủ riêng. Máy chủ vẫn nạp `stories.config.js` + `matchmods.js` (target `server`) nhưng không mở phòng Story.
- **Luật không đổi:** người chơi không được biết phòng chạy kiểu nào (server / Steam / PeerJS). Mọi chữ trung tính.
- **Demo:** `config/demo.config.js` thêm `stories: 1` (số Story chơi được). Story khoá bấm vào ra thông báo "full game", theo luật CrazyGames về link store.
- **Mỗi luật trận mới, Core boss mới:** theo luật cũ, có hình trong `src/render/vfx.js` (không có Core vô hình), có SFX riêng nếu là Tuyệt kỹ.

## Đã làm (2026-10-18)

- Story 1 **THE WARD CUP**: 4 đội riêng (The Uncles · Moped Boys · School Ghosts · boss Block Wardens với Giant Keeper), cut scene mở cup / trước trận / sau trận / nâng cúp (7 khuôn cảnh, `src/ui/story-cup.js`), 3 sao, costume vô địch **Ward Cup** (nồi cơm vàng, `noBox`).
- 2026-10-19: làm nốt 3 Story Rooftop Night League · Night Market Cup · Grandpa's Legends (xem bảng dưới), cut scene có nền theo theme (alley · rooftop · market · stadium) + 2 kiểu cúp, thêm sao noGolden · goals · sweep.
- Tab FOOTBALL STORY (thứ 2 màn PLAY), màn cup (đường đi 4 vòng · đối thủ kế · kết quả nhánh khác), màn bị loại / vô địch.
- Trận: character đá ĐÁ CAO + 2 đồng đội AI cố định cả cup (đồng đội đang chọn + 1 người trong đội hình, thiếu thì 1 cầu thủ ngẫu nhiên), bàn thắng vàng không giới hạn, Pause chỉ có RESUME / FORFEIT (CUP OVER), màn giới thiệu đội ghi tên Story + vòng.
- Thưởng: gold mỗi vòng thắng (dòng riêng ở màn kết quả), thống kê chung, 3 thành tích (`story` · `finals` · `stars`), demo `demo.stories: 1`.
- Bản dịch pt-BR · pt-PT · es · ja (chưa qua người bản xứ duyệt).

## Việc tiếp theo

1. **Co-op online qua mã phòng** (chưa làm): loại phòng `story` trong `Room`, trạng thái cup (Story, vòng, bracket) trong `start{opts.cup}`, màn cup chung cho cả phòng (chủ phòng bấm KICK OFF, hội thoại chạy cùng lúc), người mới vào giữa 2 trận nhận ghế AI, chủ phòng thoát = hết cup. Bump `net.protocol`.
2. Luật trận `mods`: cả 4 Story đã có (Ward Cup user duyệt 2026-10-19 sau 2 chỉnh sửa; Story 2–4 chờ user chơi thử). Bản dịch các chữ mới (tên luật, câu nói, lời thoại) làm sau khi user duyệt nội dung.
2b. Co-op online: cut scene chiếu cùng lúc ở mọi máy (như màn giới thiệu đội: chủ phòng chờ cả phòng xem xong).
3. Story thứ 5 trở đi (chỉ cần config + lời thoại; khuôn cảnh / theme mới khi muốn).

## MVP

1. 1 Story đầy đủ 4 vòng: 4 đội riêng, boss chung kết có 1 gimmick, hội thoại trước và sau trận, intro và nâng cúp bằng thẻ hội thoại.
2. Chơi một mình (offline) + co-op với bạn qua mã phòng.
3. Màn BRACKET, màn kết (vòng đã tới + thưởng), trang FOOTBALL STORY (1 thẻ mở + vài thẻ "COMING SOON" để thấy trước).
4. Gold + 1 cosmetic vô địch + 3 sao thử thách + 2–3 achievement.
5. Đo: % người vào Story mà đá hết cup, % vô địch, số lần chơi lại. Số tốt thì mới làm thêm Story.

Chưa làm: tìm trận co-op với người lạ, luân lưu, cut scene procedural riêng cho Story.

## 4 Story hiện có (2026-10-19)

| # | Story | theme / cúp | Độ khó (Elo AI) | Đối thủ (1/8 → chung kết) | Sao | Costume vô địch |
|---|---|---|---|---|---|---|
| 1 | THE WARD CUP | alley · nồi cơm | 30 → 240 | The Uncles · Moped Boys · School Ghosts · **Block Wardens** (mỗi đội 1 luật trận) | vô địch · chung kết sạch lưới · hat-trick | Ward Cup (nồi cơm vàng) |
| 2 | ROOFTOP NIGHT LEAGUE | rooftop · cúp | 380 → 700 | Pigeon Gang · Sky Hoppers · Billboard Kids · **Night Owls** | vô địch · thắng chung kết cách 3 bàn · hat-trick | Night Owl Cap |
| 3 | NIGHT MARKET CUP | market · cúp | 620 → 1150 | Lantern Crew · Noodle Kickers · Fortune Tellers · **Market Mamas** | vô địch · không cần bàn thắng vàng · 12 bàn cả cup | Lantern Hat |
| 4 | GRANDPA'S LEGENDS | stadium · cúp | 1450 → 2700 | Rust Buckets · Retired Refs · Grandpa's Squad · **The Legends** | vô địch · chung kết sạch lưới · trận nào cũng thắng cách 2 bàn | Golden Laurel |

- Đội in đậm = boss chung kết, cũng là đội kình địch (thắng đậm ở nhánh bên kia). Story 2–4 dùng lại 2 đội Main Path hợp chủ đề ở 2 vòng đầu, 2 vòng sau là đội riêng.
- Mọi Story đều mở (không cần thắng Story trước); độ khó tăng dần theo thứ tự, thẻ có 1–4 vạch đỏ (`tier`). Story 4 rất khó với người chỉ có Core khởi đầu.
- Thành tích: vô địch từng Story (4) · `Trophy Cabinet` vô địch cả 4 (thưởng Crown) · `finals` · `stars`.

## Câu hỏi còn mở

Không còn (đã chốt hết ngày 2026-10-18, xem bảng đầu doc). Phần còn lại là content của Story đầu tiên: tên, 4 đội, boss, lời thoại, 2 sao thử thách.
