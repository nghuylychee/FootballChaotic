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
- **Luật trận (`mods`, CHƯA LÀM)**, dùng lại status sẵn có trước khi làm cái mới. Ví dụ:
  - sân trơn: `slip` theo chu kỳ
  - đội AI to gấp đôi: ngược với `tiny`
  - bóng nặng
  - đối thủ có Tuyệt kỹ ngay từ đầu trận
- **Boss chung kết**: 1 gimmick lớn, có thể có Tuyệt kỹ chỉ boss dùng được. Vẫn theo luật Tuyệt kỹ: có telegraph và né được bằng Z.

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
- **Máy chủ riêng:** chạy `Room` nên cần đọc `stories.config.js` (thêm target `server` trong `scripts/manifest.js`) và các đội mới. Bump `net.protocol`. Server phải redeploy, trước khi redeploy thì phòng Story rơi về player-hosting (vẫn chạy được).
- **Luật không đổi:** người chơi không được biết phòng chạy kiểu nào (server / Steam / PeerJS). Mọi chữ trung tính.
- **Demo:** `config/demo.config.js` thêm `stories: 1` (số Story chơi được). Story khoá bấm vào ra thông báo "full game", theo luật CrazyGames về link store.
- **Mỗi luật trận mới, Core boss mới:** theo luật cũ, có hình trong `src/render/vfx.js` (không có Core vô hình), có SFX riêng nếu là Tuyệt kỹ.

## Đã làm (2026-10-18)

- Story 1 **THE WARD CUP**: 4 đội riêng (The Uncles · Moped Boys · School Ghosts · boss Block Wardens với Giant Keeper), cut scene mở cup / trước trận / sau trận / nâng cúp (7 khuôn cảnh, `src/ui/story-cup.js`), 3 sao, costume vô địch **Ward Cup** (nồi cơm vàng, `noBox`).
- 3 thẻ COMING SOON (Rooftop Night League · Night Market Cup · Grandpa's Legends) để người chơi thấy còn content.
- Tab FOOTBALL STORY (thứ 2 màn PLAY), màn cup (đường đi 4 vòng · đối thủ kế · kết quả nhánh khác), màn bị loại / vô địch.
- Trận: character đá ĐÁ CAO + 2 đồng đội AI cố định cả cup (đồng đội đang chọn + 1 người trong đội hình, thiếu thì 1 cầu thủ ngẫu nhiên), bàn thắng vàng không giới hạn, Pause chỉ có RESUME / FORFEIT (CUP OVER), màn giới thiệu đội ghi tên Story + vòng.
- Thưởng: gold mỗi vòng thắng (dòng riêng ở màn kết quả), thống kê chung, 3 thành tích (`story` · `finals` · `stars`), demo `demo.stories: 1`.
- Bản dịch pt-BR · pt-PT · es · ja (chưa qua người bản xứ duyệt).

## Việc tiếp theo

1. **Co-op online qua mã phòng** (chưa làm): loại phòng `story` trong `Room`, trạng thái cup (Story, vòng, bracket) trong `start{opts.cup}`, màn cup chung cho cả phòng (chủ phòng bấm KICK OFF, hội thoại chạy cùng lúc), người mới vào giữa 2 trận nhận ghế AI, chủ phòng thoát = hết cup. Bump `net.protocol`.
2. Luật trận `mods` cho boss / đội đặc biệt.
2b. Co-op online: cut scene chiếu cùng lúc ở mọi máy (như màn giới thiệu đội: chủ phòng chờ cả phòng xem xong).
3. Story thứ 2 trở đi.

## MVP

1. 1 Story đầy đủ 4 vòng: 4 đội riêng, boss chung kết có 1 gimmick, hội thoại trước và sau trận, intro và nâng cúp bằng thẻ hội thoại.
2. Chơi một mình (offline) + co-op với bạn qua mã phòng.
3. Màn BRACKET, màn kết (vòng đã tới + thưởng), trang FOOTBALL STORY (1 thẻ mở + vài thẻ "COMING SOON" để thấy trước).
4. Gold + 1 cosmetic vô địch + 3 sao thử thách + 2–3 achievement.
5. Đo: % người vào Story mà đá hết cup, % vô địch, số lần chơi lại. Số tốt thì mới làm thêm Story.

Chưa làm: tìm trận co-op với người lạ, luân lưu, cut scene procedural riêng cho Story.

## Ý tưởng Story (để sau)

| Story | Sân / không khí | Gimmick boss |
|---|---|---|
| The Ward Cup | hẻm phường, cup nhập môn (Story của demo) | đội bảo vệ chung cư, thủ môn chặn cả khung thành |
| Rooftop Night League | sân thượng ban đêm | băng đảng ném pháo sáng làm loá màn hình |
| Night Market Cup | chợ đêm, đèn neon, khán giả ồn nhất | (chưa nghĩ) |
| Grandpa's Legends | đá với các huyền thoại già (đội `The Legends` có sẵn) | nối với cốt truyện heirloom đang ẩn |

## Câu hỏi còn mở

Không còn (đã chốt hết ngày 2026-10-18, xem bảng đầu doc). Phần còn lại là content của Story đầu tiên: tên, 4 đội, boss, lời thoại, 2 sao thử thách.
