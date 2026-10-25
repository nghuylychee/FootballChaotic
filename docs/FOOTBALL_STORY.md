# FOOTBALL STORY — Cup knockout co-op PvE

> Trạng thái: **ĐÃ CHỐT THIẾT KẾ + ĐÃ LÀM BẢN CHƠI MỘT MÌNH (2026-10-18)**. 2026-10-20: mỗi Story 1 thể thức riêng + PHÒNG TRƯNG BÀY. Chưa làm: co-op online (xem "Việc tiếp theo").
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
| 16 | Cách kể (2026-10-20) | 4 Story kể cùng 1 kiểu là **không ổn**. Thử cho mỗi Story 1 thể thức chơi riêng thì user thấy **không ổn**, bỏ. Chốt: **cùng luật knockout 4 vòng + luật trận (gimmick) từng đối thủ**, khác nhau ở **cách kể**: mỗi Story 1 kiểu trình chiếu riêng (nhật ký · manga · show TV · cuộn phim hồi tưởng), concept không trùng |
| 17 | Phòng trưng bày (2026-10-20) | Cúp vô địch của các Story trưng trong **TROPHY ROOM**: chỗ người chơi nhìn lại thành tựu. Nút cúp ở trang chủ mở phòng này, ACHIEVEMENTS thành 1 khu trong phòng. Mỗi Story 1 chiếc cúp riêng |

## Cách kể riêng từng Story (2026-10-20)

Luật chơi giống nhau (cup knockout 16 đội, 4 trận, thua là out, mỗi đối thủ 1 luật trận). Khác nhau ở **cách kể**: `stories.list[].tell` chọn 1 kiểu trình chiếu cut scene (`src/ui/story.js` `TELL`). Cảnh vẫn vẽ bằng các khuôn ở `src/ui/story-cup.js` nhưng vào canvas phụ, rồi kiểu kể ghép khung riêng + đổi kiểu chữ (CSS `#story.st-tell-<kiểu>`). Đầu mỗi chặng (`stages`: mở đầu · 4 vòng · kết) có 1 trang / thẻ tên chặng do `CupUI.scenes` chèn.

| Story | `tell` | Trình chiếu | Lời thoại | Đầu chặng |
|---|---|---|---|---|
| THE WARD CUP | `diary` | **Nhật ký mùa hè** của bạn: giấy kẻ dòng + gáy lò xo, cảnh = ảnh dán băng keo hơi nghiêng (rơi xuống trang khi đổi cảnh), bút chì vẽ nguệch ngoạc ở lề | Chữ viết tay mực xanh, tên người nói bút đỏ; nhiều câu là bạn viết nhật ký ("Dear diary...") | Ngày tháng (JULY 28 → AUGUST 2) |
| ROOFTOP NIGHT LEAGUE | `manga` | **Trang truyện tranh**: đen trắng tương phản + chấm tram, 3 ô mỗi trang (ô đã xong đứng yên kèm bóng thoại của nó), đầy trang thì lật; cảnh VS / kình địch / nâng cúp = 1 ô to cả trang | Bóng thoại trắng trong ô đang chạy, The Voice = khung tường thuật đen, chữ hiệu ứng `sfx` (FLAP FLAP, DOOM...) | Trang chương (CHAPTER 1 · THE CARD...) với tia tốc độ |
| NIGHT MARKET CUP | `tv` | **Show nấu ăn trên TV** "Midnight Noodle Showdown", Uncle Noodle dẫn: logo kênh `channel`, LIVE nhấp nháy, tên tập, chữ chạy tin tức `ticker`, dòng quét, nhiễu sóng khi cắt cảnh | Thanh tên kiểu lower third | Thẻ tên tập trên sọc màu thử sóng (PILOT, EP.1...) |
| GRANDPA'S LEGENDS | `film` | **Cuộn phim hồi tưởng** của ông nội: sepia, hạt phim, vết xước, nhấp nháy, khung rung, 2 dải lỗ phim chạy. Đoạn kết (`outroColor`) và câu cuối của King Leo (`color: true`) phim **có màu lại**: hết hồi tưởng | Phụ đề phim cũ (chữ kem viền đen) | Thẻ chữ phim câm (REEL ONE...) |

- Story mới: chọn 1 kiểu kể chưa dùng (có thể thêm vào `TELL`: vd. tin nhắn điện thoại, video livestream, bản tin radio, truyện tranh 4 ô báo...), không lặp kiểu đã có.
- Đã thử rồi bỏ (2026-10-20): mỗi Story 1 thể thức chơi riêng (kỳ thi điều kiện thắng khác nhau, tự chọn quầy + quà nguyên liệu, đá trong vai ông nội năm 1976). User: không ổn, giữ knockout.

## Giao diện: hình là chính, ít chữ (user 2026-10-20)

Màn FOOTBALL STORY, màn cup và TROPHY ROOM: thông tin hiện bằng icon pixel + số / chữ ngắn, câu dài để ở tooltip (`title`).
- Thẻ Story: tiến độ = 4 ô + cúp (không ghi "Best: ..."). Không ghi tên kiểu kể (SUMMER DIARY, MANGA...) trên UI (user 2026-10-21): người chơi tự cảm nhận qua cut scene.
- Màn cup: thẻ vòng cao cố định (không nhảy chữ), chỉ tên Story ở đầu, thẻ đối thủ bỏ đoạn mô tả đội (ở tooltip), mỗi thông tin 1 dòng icon (luật trận · Core đặc trưng).
- Phòng trưng bày: dữ kiện = icon + số, tường kỷ lục 1 hàng icon, nút ACHIEVEMENTS = icon + đếm.
- Mô tả sao thử thách viết ngắn (vd. "Hat-trick in one match").

## Phòng trưng bày (TROPHY ROOM, 2026-10-20)

`src/ui/trophies.js` (`SFC.TrophyUI`, page `trophy`), mở bằng nút cúp dưới SETTINGS ở trang chủ.
- Căn phòng vẽ pixel (canvas 640x360, dùng bộ hàm cut scene qua `SFC.Story.paint`): mỗi Story 1 tủ kính trên bục đá.
  Đã vô địch: **cúp riêng của Story** (`stories.list[].trophy`: `pot` nồi cơm vàng · `owl` tượng cú vàng · `bowl` tô mì vàng · `cup` cúp vàng cổ, vẽ ở `src/ui/story-cup.js`, cũng là cúp trong cảnh nâng cúp) toả sáng.
  Chưa vô địch: bục phủ vải nhung + dấu ? (vàng nếu đã từng chơi). Khoá (demo / COMING SOON): ổ khoá. Biển dưới bục: màu Story + 3 sao, vạch vàng = số lần vô địch. Character của bạn đứng ngắm tủ đang chọn.
- Bảng phải: trạng thái, ngày vô địch đầu (`first`), tỉ số chung kết đẹp nhất (`fin`), số lần chơi, sao, costume vô địch, nút chơi Story đó.
- Tường kỷ lục: Elo cao nhất, Area xa nhất, trận / thắng / bàn, ULT BOOK, nút ACHIEVEMENTS (Esc ở ACHIEVEMENTS quay về phòng).
- Hơn 4 Story: phòng trượt theo tủ đang chọn (4 tủ mỗi lúc).

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
| Ward Cup | 1/8 | The Uncles | **PLASTIC STOOLS** + bắt đầu thua 0–1 | Ghế nhựa trên sân: không cầm bóng mà đi vào là nhặt lên, ra đòn = ném. Ghế trúng người: choáng + rơi bóng (lướt né được). Các chú cũng đi nhặt ghế ném bạn (mỗi lúc 1 người). Ghế ném đập tường không vỡ: bật lại rồi rơi ngay đó, nhặt ném tiếp. Ghế trên sân chặn người cầm bóng, bóng dội ra, sút mạnh vỡ ghế | (luật nhà: họ dẫn sẵn) |
| | Tứ kết | Moped Boys | **DELIVERY LANE** | Làn dọc nhấp nháy rồi xe máy phóng qua: văng + choáng + rơi bóng. Moped Boys trúng thì được quá giang: chạy nhanh một lúc, có quầng vàng + vệt tốc độ + khói xả suốt lúc đó | xe dày hơn |
| | Bán kết | School Ghosts | **NOW YOU SEE THEM** | Tối đa 2 con ma tàng hình (còn chút bóng hình) + chạy nhanh hơn. Đòn nặng trúng con ma không tàng hình: cả đội lộ, chờ hồi mới tàng hình lại (user 2026-10-21). Chuông reo: 2 con ma đổi chỗ | chuông + hồi tàng hình nhanh hơn |
| | Chung kết | Block Wardens | **GIANT WARDENS** | Cả đội to x1.5, mạnh hơn, chậm hơn chút. Đấm nhẹ bật ra (TOO BIG!), phải dùng đòn nặng | ANGRY GIANTS: to x1.7 |
| Rooftop | 1/8 | Pigeon Gang | **PIGEON BOMBS** | Đàn chim bay ngang thả "bom" (vòng báo chỗ rơi), bãi nằm lại: dẫm phải ngã ngửa thật (nằm sõng soài, sao quay trên đầu, tiếng "bẹp"; không tia lửa / tiếng đấm như bị đánh — user 2026-10-22) | thả dày hơn |
| | Tứ kết | Sky Hoppers | **NIGHT WIND** | Gió dọc sân: bóng trôi theo gió, đội bạn bị đẩy, Hoppers xuôi gió chạy nhanh | gió hay thổi về khung thành bạn |
| | Bán kết | Billboard Kids | **SPRAY WALLS** | Tường sơn mọc giữa bóng và khung thành bạn tấn công: chặn người + bóng thấp (lốp qua được). Kids chạy tới tường thì **nhảy parkour qua** (user 2026-10-25, thay đi xuyên: bật lên, 1 tay chống mép tường, co chân lướt qua; đang dẫn bóng thì bóng nảy qua cùng). Hình: bình xịt bay dọc đường báo trước, rồi 1 **khối tường bê tông liền** dựng lên (2026-10-25, thay dãy tấm rời vì tường chéo bị hở; ngọn tường ngả theo phối cảnh nên tường dọc / chéo vẫn thấy mặt có sơn) + phun 1 dải sơn uốn lượn liền cả bức (tag trắng, sơn chảy) | dày hơn |
| | Chung kết | Night Owls | **OWL'S GAZE** (user 2026-10-22, thay SEARCHLIGHT vì khó hiểu) | "Đèn xanh, đèn đỏ": con cú khổng lồ đậu giữa khán đài trên **cả trận**, bình thường nhắm mắt. "HOO..." rồi mắt mở dần ~1 giây, mở hẳn thì sân tối lại: ai bên bạn đang **chạy nhanh (đè phím chạy) hoặc lướt** bị **tia ngắm** khoá (2 tia đỏ + vòng ngắm co dần, SPOTTED!), đứng lại / đi bộ là tia nhả. Chạy tiếp đủ ~0,8 giây → mắt cú **bắn đạn** đuổi theo, tới nơi nổ thành **tia laser** từ mắt cú qua người đó tới mép sân, đứng ~0,8 giây và **xuyên qua mọi người** (user 2026-10-25: ai bên bạn chạm tia đều trúng, kể cả người đứng chắn giữa đường); mắt mở hẳn ~3,6 giây (trước 2,4). **Lướt đúng lúc là né**; trúng = **HOÁ ĐÁ** (user đổi từ đóng băng: đá lan từ chân lên thành tượng trên bệ đá, đứng chôn chân + rơi bóng, hết giờ tượng nứt rồi vỡ vụn). Đi bộ / đứng im / sút / chuyền / đấm tại chỗ đều được; Core / Tuyệt kỹ không tính. Ai phạm luật người đó chịu, kể cả đồng đội AI (thường tuân luật, đôi khi quên). Owls đi lại được nhưng không ra đòn / sút / chuyền lúc mắt mở → counter: dừng đúng chỗ trước khung thành rồi sút. Code SEARCHLIGHT giữ lại cho Story sau | mắt mở thường hơn + lâu hơn (báo trước giữ nguyên) |
| Night Market | 1/8 | Lantern Crew | **FALLING LANTERNS** | Đèn lồng rơi gần bóng (bóng đổ to dần), để lại đốm lửa cháy 5 giây. Bị đèn trúng / chạm lửa = bắt lửa: đứng lại phủi phủi dập lửa (rơi bóng), lướt né được (user 2026-10-23) | 2 cái một lúc |
| | Tứ kết | Noodle Kickers | **NOODLE LASSO** | Kicker đứng tấn, bưng tô mì, quay vòng mì trên đầu 1.3 giây (vạch ngắm) rồi quăng như cao bồi; trúng = bị trói (rơi bóng), bấm trái / phải luân phiên để vùng ra, đồng đội AI tự vùng (user 2026-10-23, thay HOT BALL) | quăng dày hơn |
| | Bán kết | Fortune Tellers | **FORTUNE CARDS** | Bộ bài bay lên giữa sân, xào 2 lượt, rút 1 lá, lật mặt cho người chơi xem rồi mới có tác dụng (user 2026-10-23): THE MOON (tắt đèn, chỉ còn vầng sáng quanh đội bạn + bóng, mắt Tellers sáng trong tối) · THE MAGICIAN (2 bóng giả lăn ra, chạm là tan) · THE RABBITS (mũ ảo thuật thả đàn thỏ + 1 củ cà rốt; đội cầm cà rốt thì thỏ cắn đội kia, choáng ngắn; đánh người cầm cho rơi rồi chạy chạm để cướp) · THE WHEEL (mọi cầu thủ cả 2 đội tăng tốc chốc lát) | rút dày hơn |
| | Chung kết | Market Mamas | **GIANT CHOPSTICKS** (user 2026-10-24, thay HAGGLE rồi DÉP BAY: chưa hài lòng; user dặn hình phải rõ) | **2 Big Mama** khổng lồ ngồi trên khán đài, mỗi bà 1 bên bảng tỉ số (user 2026-10-24), mỗi bà sau 1 **nồi mì khổng lồ** ở mép trên sân, cả trận (không ra sân; đội trưởng trên sân là AUNTIE HOA). Bình thường bà quấy nồi + phe phẩy quạt. Định kỳ 1 bà vươn **đôi đũa khổng lồ nối từ tay bà xuống sân** (2 bà **lần lượt**; **FINAL PUSH: cả 2 bà cùng lúc**, gắp 2 người): mũi đũa há rộng lơ lửng trên đầu người cầm bóng bên bạn (bóng đũa + vòng đỏ + "!", đi theo người đó) → đũa **dừng lại đón đầu** chỗ người đó sắp chạy tới (vòng đỏ đặc nhấp nháy) rồi cắm xuống: **đổi hướng hoặc lướt là né** (CLACK!). Trúng: GOTCHA!, bị gắp nhấc bổng lên, thả PLOP! vào nồi (ló đầu đội sợi mì trên mặt nước dùng ~2 giây), rồi BOING! bật ra chỗ ngẫu nhiên trên sân. Đồng đội AI đôi khi tự né | gắp thường hơn |
| Legends | 1/8 | Rust Buckets | **ROGUE WAVES** (user 2026-10-24, thay HIGH TIDE) | Sân riêng `pirate_cove` (vịnh cướp biển: sàn ván tàu, mạn tàu có ô pháo, tàu buồm đen cờ đầu lâu). Sóng dữ gần chỗ bóng, từ mép trên **hoặc mép dưới** sân (user 2026-10-24). Biển rút trước ~1,4 giây: vùng nước sắp tràn tới nhấp nháy + mép bọt + mũi tên. Sóng ập vào: mép sóng quét qua ai bên bạn thì choáng + bị cuốn xuôi (rơi bóng, SPLASH!), **lướt xuyên sóng là né**; bóng cũng bị cuốn. Sóng rút: ai còn trong nước bị kéo về phía mép sóng tới + lội chậm, bóng bị kéo theo. Thuỷ thủ bị sóng chạm thì **lướt ván** (chạy nhanh một lúc, SURF'S UP!) | sóng dày hơn + rộng hơn |
| | Tứ kết | Retired Refs | **THE REFS** | Người chơi đánh choáng 1 Ref: thẻ vàng, lần 2 thẻ đỏ (đứng ngoài vài giây). 1 pha vào bóng trúng 2 lần vẫn chỉ 1 thẻ (user 2026-10-24). Đồng đội AI không bị thẻ. Refs phạm lỗi thoải mái. Áo xanh chanh dạ quang (áo đen không thấy trên bảng tỉ số) | — |
| | Bán kết | Grandpa's Squad | **DUST DEVILS** (user 2026-10-24, thay BACK IN MY DAY vì không hiểu, không tác dụng) | Định kỳ gió làng cuộn lên **3 cột lốc cát** một lượt (FINAL PUSH: **6 cột**, user 2026-10-24), xoáy cát dưới đất báo trước 1 giây, lang thang ngẫu nhiên trên sân. Ai bên bạn chạm lốc: bị xoáy hất tung lên trời (rơi bóng), lơ lửng xoay vòng ~2 giây rồi rơi xuống mới đá tiếp được; lướt né được. Bóng chạm lốc bị hất lên. Các cụ đi xuyên lốc không sao | thường hơn |
| | Chung kết | The Old Legends | **KING LEO 1976** (user 2026-10-24, thay GOLDEN STAR vì khó hiểu, chưa đủ wow) | Trận đánh boss. Định kỳ King Leo hoá lại chàng trai năm 1976 (phim nháy, 1976!) và **2 Legends còn lại hợp thể vào hắn** (user 2026-10-24: một mình Leo hơi OP): bị hút vào theo vệt vàng, FUSION!, sân chỉ còn 1 nhân vật siêu mạnh (bóng mờ 2 người chập chờn 2 bên) **chạy như tia chớp** (x2,1, tàn ảnh + tia điện zig-zag, user 2026-10-24). **Giữ khung lúc cast** (user 2026-10-24, chỉ trong lúc cast): hắn chớp về trước khung nhà rồi hợp thể ở đó; trong lúc cast cú sút vào khung họ bị hắn chớp chắn (BLOCKED!), bóng chạm vạch khung cũng dội ra. Hợp thể xong khung mở lại. Đánh đủ 3 vạch / hết lượt: SPLIT!, 2 người văng ra đá lại bình thường. Lúc hợp thể hắn to hơn, nhanh hơn, sút mạnh hơn, hào quang sepia + hạt phim, **giáp 3 vạch** (ô khung phim trên đầu): đòn trúng không làm choáng mà trừ 1 vạch, không cướp bóng được. Hắn tự lấy bóng solo thẳng về khung bạn, húc bật ai chắn đường. Cả đội đánh hết 3 vạch = FILM BURN!, hắn ngã choáng. Không phá kịp: **cú vào bóng muộn** — đứng ngắm (mũi tên đỏ dài đúng tầm lao tới người gần nhất, lúc này hết giáp, đánh choáng là huỷ) rồi lao gầm giày; trúng = choáng + văng, lướt né được, không ai thổi còi (NO WHISTLE?!) | biến hình thường hơn |

### 4 concept cốt truyện (user chốt 2026-10-19: không trùng mô-típ)
Mỗi Story khác nhau ở **concept, người dẫn truyện, cách kể và vai của đội boss**. Người dẫn truyện = `stories.list[].narrator`
(`name` hiện trên hộp chữ, `look` / `kit` vẽ trên khuôn cupHost, `horn: false` = không cầm loa, `art` = khuôn mặc định cho lời của họ;
Legends có thêm `youngLook` / `youngKit` cho cảnh hồi tưởng).

| Story | Concept (tham khảo) | Người dẫn truyện | Kiểu kể | Đội boss |
|---|---|---|---|---|
| THE WARD CUP | **Mùa hè cuối cùng**: hẻm sắp bị giải toả làm bãi đỗ xe, đây là Ward Cup cuối (hoài niệm mùa hè, buồn mà ấm) | WARD LOUDSPEAKER (loa phường) + chính bạn viết nhật ký | Nhật ký mùa hè, đếm ngược ngày tới máy ủi | Block Wardens = bảo vệ công trường; twist: đội trưởng lớn lên ở hẻm, chính anh vẽ khung thành trên tường → bỏ việc, bãi đỗ xe bị huỷ |
| ROOFTOP NIGHT LEAGUE | **Thư mời / kỳ thi bí ẩn** (Hunter x Hunter): thiệp đen hình cú, giải bí mật, 4 thử thách trước bình minh | THE VOICE (giọng nói từ loa, không thấy mặt: khuôn cupVoice) | Manga shōnen: chương, bóng thoại, chữ hiệu ứng | Night Owls; đội trưởng chính là The Voice, sắp rời thành phố → bạn thành The Voice mới, gửi thiệp cho lứa sau |
| NIGHT MARKET CUP | **Đại chiến mì** (Food Wars, hài): cứu xe mì của Uncle Noodle bằng món Mì Nửa Đêm | UNCLE NOODLE (dẫn show TV từ xe mì) | Show nấu ăn phát trực tiếp, mỗi vòng 1 tập, thắng = lấy 1 nguyên liệu | Market Mamas; Big Mama là **chị gái** Uncle Noodle, giành công thức của mẹ → hai chị em chia đôi 1 sạp |
| GRANDPA'S LEGENDS | **Trận đấu dang dở** (hồi tưởng, truyền thừa): 50 năm trước ông nội chấn thương ở chung kết, trận bị bỏ dở | GRANDPA (chiếu cuộn phim cũ) | Phim hồi tưởng sepia, mỗi vòng 1 cuộn lộ thêm 1 mảnh: thuỷ thủ chở ông về → trọng tài thú nhận → đồng đội cũ → King Leo | The Legends (The Old Legends, King Leo); kết: ông nội trên khán đài, phim có màu lại |

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
- Trận: character đá ĐÁ CAO + 2 đồng đội AI cố định cả cup (đồng đội đang chọn + 1 người trong đội hình, thiếu thì 1 cầu thủ ngẫu nhiên). **Đồng đội AI theo trình đối thủ** (user 2026-10-25): cùng độ khó AI với đối thủ (`aiProfile(elo)`) và chép chỉ số của đội đối thủ vòng đó (`stories.mateStats`, `Cup.mateSpec`; character không đổi). Giả lập AI vs AI (không luật trận): trước đây vòng đầu thắng ~100%, chung kết Legends ~10%; giờ ~35–85%, phần lớn quanh 50–65%. Bàn thắng vàng không giới hạn, Pause chỉ có RESUME / FORFEIT (CUP OVER), màn giới thiệu đội ghi tên Story + vòng.
- Thưởng: gold mỗi vòng thắng (dòng riêng ở màn kết quả), thống kê chung, 3 thành tích (`story` · `finals` · `stars`), demo `demo.stories: 1`.
- Bản dịch pt-BR · pt-PT · es · ja (chưa qua người bản xứ duyệt).

## Co-op online (đã làm 2026-10-20)

Luồng: tab FOOTBALL STORY › chọn Story › **PLAY WITH FRIENDS** = tạo phòng Story (máy này làm host, PeerJS / Steam P2P, không qua máy chủ riêng) → trang phòng chờ Story (`slobby`): mã phòng to (bấm để chép), 3 ô vị trí DEF / MID / FWD. Bạn bè vào bằng mã: tab FOOTBALL STORY › **JOIN** (hoặc PRIVATE MATCH › JOIN ROOM). Chủ phòng **START CUP**.
- **Mỗi người mang character của mình** (ngoại hình, chỉ số, Core đã mở) vào đúng vị trí đang đứng (Enter ô trống để đổi vị trí). Cả phòng 1 đội, tối đa 3 người; vị trí không có người = đồng đội AI cố định của lượt chơi (`Cup.run.mates` của host).
- **Lượt chơi nằm ở máy host** (`SFC.Cup` thật: bracket, giả lập nhánh khác). Khách giữ bản sao: gói `lobby` của phòng Story mang `k` (id Story) + `c` (`Cup.share()`), khách `Cup.mirror(state)` (lọc dữ liệu, `run.mirror`). Màn cup giống nhau ở mọi máy; chỉ chủ phòng có KICK OFF / QUIT CUP / PLAY AGAIN, người khác thấy "Waiting for {name}..." + LEAVE ROOM.
- **Cut scene chiếu cùng lúc:** mở cup + sau trận + nâng cúp: mỗi máy tự chiếu khi trạng thái cup đổi. Trước trận: chủ phòng bấm KICK OFF → `cs{k:'before'}` → mọi máy chiếu → khách xem xong gửi `csd` → host chờ cả phòng (tối đa `net.sceneWait` giây) rồi vào trận.
- **Trận:** `Room.startStory` dựng trận đội 0 (người thật + AI) vs đội của vòng, opts giống trận một mình (`cup`, `knockout`, luật trận, câu nói, tỉ số đầu trận). Khách chỉ nhận id Story + vòng, tự lấy luật trận / câu nói từ config của mình; trận "gương" (`opts.mirror`) không tự chạy luật trận (`MatchMods` chỉ giữ id để vẽ, vật thể tới từ host — `Sync.capture` gửi kèm cả vật thể đã có trước khi bắt đầu ghi).
- **Thưởng riêng từng người** (`Cup.pay`, mỗi vòng 1 lần): gold vòng thắng, vòng xa nhất, vô địch + costume lần đầu, sao hat-trick của chính mình. Sao của cả đội (vô địch, chung kết sạch lưới, không bàn thắng vàng...) host tính rồi gửi kèm `ts`.
- Hết trận: chủ phòng bấm CONTINUE ở màn kết quả → cả phòng về màn cup (`backToLobby`, gói lobby mang trạng thái cup mới). Người mới vào được **giữa 2 trận** (ô còn trống), vào giữa cup thì bỏ qua cut scene các vòng trước.
- **Rời phòng:** khách rời = hết cup với người đó (phòng đá tiếp, AI thế chỗ). Chủ phòng rời = phòng đóng, cả phòng về tab FOOTBALL STORY ("The room was closed.").
- Bản DEMO: không có nút co-op (online khoá như PRIVATE MATCH). `net.protocol` 11, máy chủ riêng `11.0.0` (máy chủ không mở phòng Story nhưng phải cùng protocol).
- Test: `node server/test/story-test.js` (ghế, gói lobby, cut scene, đá hết trận, người vào giữa cup, trận gương không tự đặt vật thể).
- **Mời bạn bè (Steam, 2026-10-21):** phòng Steam có nút **INVITE FRIENDS** (trang `slobby`, cả phòng chờ PRIVATE MATCH; chỉ hiện khi `Session.canInvite`: phòng player-host trên Steam, bản web / máy chủ riêng / itch desktop không có, chỉ dùng mã) → `lobby.openInviteDialog()` mở bảng mời của overlay Steam (`electron/main.js` bật `electronEnableSteamOverlay`). Bạn nhận lời:
  - game đang chạy → callback `GameLobbyJoinRequested` (steamworks.js 0.4.0 build với napi6 nên lobby id tới dưới dạng **bigint chính xác**, không bị làm tròn như từng lo; id dạng number thì bỏ qua) → mã phòng = 32 bit thấp của lobby id;
  - game chưa chạy → Steam mở game với `+connect_lobby <id>` (main đọc argv → preload `SFC_STEAM.launchLobby`).
  - `Session` phát sự kiện `invite {code}` (không có UI); `OnlineUI.tryInvite` chờ lúc rảnh ở menu (hết trận: banner INVITE ACCEPTED, hết cut scene / PROLOGUE / đặt tên), bỏ tìm trận / rời phòng đang ở rồi `joinRoom(code)` như gõ mã. Test: `node server/test/invite-test.js` (steamworks giả).

## Việc tiếp theo

1. Mời bạn qua Steam: **đã làm 2026-10-21** (xem "Co-op online" › Mời bạn bè), test tự động bằng steamworks giả. Còn lại: chạy thử thật bản Electron (App ID 480) với 2 tài khoản Steam trên 2 máy — nút mở overlay, nhận lời lúc game đang chạy và lúc game chưa mở (`+connect_lobby`), overlay hiện được trên cửa sổ Electron (Windows / macOS).
2. Luật trận `mods`: cả 4 Story đã có (Ward Cup user duyệt 2026-10-19 sau 2 chỉnh sửa; Story 2–4 chờ user chơi thử). Kiểu kể + thoại mới (2026-10-20) chờ user xem thử. Bản dịch các chữ mới (tên luật, câu nói, lời thoại, tên chặng, chữ hiệu ứng, chữ chạy TV) làm sau khi user duyệt nội dung; chữ giao diện (TROPHY ROOM, STORYTELLING...) đã dịch.
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
| 2 | ROOFTOP NIGHT LEAGUE | rooftop · tượng cú | 380 → 700 | Pigeon Gang · Sky Hoppers · Billboard Kids · **Night Owls** | vô địch · thắng chung kết cách 3 bàn · hat-trick | Night Owl Cap |
| 3 | NIGHT MARKET CUP | market · tô mì | 620 → 1150 | Lantern Crew · Noodle Kickers · Fortune Tellers · **Market Mamas** | vô địch · không cần bàn thắng vàng · 12 bàn cả cup | Lantern Hat |
| 4 | GRANDPA'S LEGENDS | stadium · cúp | 1450 → 2700 | Rust Buckets (sân pirate_cove) · Retired Refs · Grandpa's Squad · **The Old Legends** | vô địch · chung kết sạch lưới · trận nào cũng thắng cách 2 bàn | Golden Laurel |

- Đội in đậm = boss chung kết, cũng là đội kình địch (thắng đậm ở nhánh bên kia). Story 2–4 dùng lại 2 đội Main Path hợp chủ đề ở 2 vòng đầu, 2 vòng sau là đội riêng. `legends_76` (The Legends năm 1976) chỉ xuất hiện trong cảnh hồi tưởng.
- Mọi Story đều mở (không cần thắng Story trước); độ khó tăng dần theo thứ tự, thẻ có 1–4 vạch đỏ (`tier`). Story 4 rất khó với người chỉ có Core khởi đầu.
- Thành tích: vô địch từng Story (4) · `Trophy Cabinet` vô địch cả 4 (thưởng Crown) · `finals` · `stars`.

## Câu hỏi còn mở

Không còn (đã chốt hết ngày 2026-10-18, xem bảng đầu doc). Phần còn lại là content của Story đầu tiên: tên, 4 đội, boss, lời thoại, 2 sao thử thách.
