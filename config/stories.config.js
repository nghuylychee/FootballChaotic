/* =========================================================
 * STORIES CONFIG — FOOTBALL STORY (docs/FOOTBALL_STORY.md): cup knockout co-op PvE, 4 trận 1/8 → tứ kết → bán kết → chung kết.
 * Logic: src/meta/cup.js (SFC.Cup) · UI: src/ui/cup.js (SFC.CupUI, tab thứ 2 màn PLAY).
 * Thua là out. Core reset mỗi trận như trận thường. Hoà hết giờ: bàn thắng vàng tới khi có bàn (knockout).
 * Thưởng: gold mỗi trận thắng (reward.gold[vòng]) + costume khi vô địch lần đầu (reward.item) + sao thử thách (stars) + thành tích.
 *
 * Mỗi Story: { id, name, blurb, cover (id sân làm ảnh bìa), color, rounds[4], fillers, rival, reward, stars, intro, outro }
 *   rounds[i]: { team (id trong teams.list), arena, elo (độ khó AI = MainPath.aiProfile(elo), cả đồng đội AI của bạn),
 *                signature (Core đặc trưng đội AI chắc chắn cầm), before / after: hội thoại trước trận / sau khi thắng,
 *                mod: id luật trận (mods bên dưới) · score: [bạn, đối thủ] tỉ số lúc giao bóng · barks: câu nói trong trận của đối thủ
 *                { kickoff, goal (họ ghi), conceded (bạn ghi), mod (luật vừa ra tay) } — chữ ngắn, hiện thành bong bóng thoại }
 *   hội thoại = cut scene kiểu PROLOGUE (src/ui/cup.js dựng cảnh, khuôn cảnh ở src/ui/story-cup.js), mỗi dòng 1 cảnh:
 *     [{ who, text, art?, team?, zoom?, dur?, sfx?, color? }] — who: 'you' (character của bạn) · 'opp' (đội trưởng đội đối thủ vòng đó) · 'host' (bình luận viên)
 *     art mặc định theo chỗ + người nói: intro (host cupAlley · you / opp cupTalk) · before (host cupHost · you / opp cupTalk, tự chèn cảnh VS cupFace
 *     trước câu đầu tiên của 2 đội) · after (opp cupSad · host cupHost · you cupTalk) · outro (cupLift, tự chèn chữ CHAMPIONS).
 *     art / team / zoom ghi riêng để đổi cảnh (vd. cupRival + team = đội kình địch). dur: giây (mặc định theo độ dài câu)
 *   fillers: đội lấp các nhánh khác của bracket (11 đội, đá giả lập ra tỉ số) · rival: vòng có đội kình địch (luôn thắng đậm ở nhánh bên kia)
 *   stars: thử thách phụ, mỗi Story 3 sao, giữ vĩnh viễn, mỗi sao chỉ cần đạt 1 lần. kind:
 *     champ (vô địch) · cleanFinal (chung kết không thủng lưới) · hattrick (bạn ghi 3 bàn trong 1 trận) · bigWin (thắng chung kết cách 3 bàn) ·
 *     noGolden (vô địch không trận nào phải đá bàn thắng vàng) · goals (vô địch, đội ghi đủ n bàn cả cup) · sweep (vô địch, trận nào cũng thắng cách 2 bàn)
 *     · modClean (vô địch, luật trận chung kết không trúng đội bạn lần nào)
 *   tell: KIỂU KỂ của Story (src/ui/story.js TELL; user 2026-10-20: cùng luật knockout, mỗi Story kể 1 cách): diary · manga · tv · film
 *     · stages: 6 tên chặng (trang / thẻ đầu chặng) · channel / ticker (tv) · outroColor (film)
 *   theme: nền cut scene (alley · rooftop · market · stadium, src/ui/story-cup.js) · trophy: cúp riêng của Story (cut scene nâng cúp + PHÒNG TRƯNG BÀY):
 *     pot (nồi cơm vàng) · owl (tượng cú vàng) · bowl (tô mì vàng) · cup (cúp vàng cổ điển)
 *   tier: độ khó 1..4 (chấm trên thẻ Story; độ khó thật = elo từng vòng)
 *   soon: true = thẻ COMING SOON (chưa có nội dung, chỉ hiện ở trang FOOTBALL STORY)
 * Độ khó cố định theo từng Story (user chốt 2026-10-18), người chơi không chọn.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.stories = {
  roundNames: ['ROUND OF 16', 'QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'],
  host: 'ANNOUNCER',   // tên người nói của lời thoại who: 'host'

  /* LUẬT TRẬN (src/systems/matchmods.js, docs/FOOTBALL_STORY.md mục "Luật trận"): vòng nào có rounds[i].mod = id thì trận đó chạy luật đó.
   * Luật chỉ đánh vào đội bạn (đội đối thủ là "chủ luật"). User chốt 2026-10-19: nặng tay cho thấy rõ, nhưng không lấy / cấm Core.
   * name / hint: banner lúc bóng lăn lần đầu + dòng PITCH RULE ở màn cup (chữ ngắn, không số). Thời gian giây, khoảng cách px, tốc độ px/s.
   * barkGap: giây tối thiểu giữa 2 câu nói của đối thủ trong trận (rounds[i].barks). */
  barkGap: 3.5,
  mods: {
    // The Uncles: ghế nhựa đỏ trên sân. Không cầm bóng mà đi vào (cách pickPad px) là nhặt lên, ra đòn = ném (throwSpeed, bay tối đa throwRange px).
    // Trúng đối thủ: choáng stun giây + văng knock + rơi bóng (lướt né được), ghế vỡ, respawn giây sau đặt ghế mới. AI cầm ghế quá aiHold giây thì ném người gần; các chú (trừ người đang đuổi bóng) tự chạy đi nhặt ghế trong vòng aiSeek px, mỗi lúc 1 người, ném xong nghỉ aiGap giây.
    // Ghế trên sân vẫn chặn người cầm bóng, bóng thấp (z < h) dội ra; sút mạnh (>= breakSpeed) vỡ ghế.
    // Ghế ném đập tường không vỡ: bật ngược bounceRange px với tốc độ bounceSpeed rồi rơi xuống ngay đó (nhặt ném tiếp)
    stools: {
      name: 'PLASTIC STOOLS', hint: 'Walk into a stool to pick it up, attack to throw it',
      n: 5, r: 7, h: 14, gap: 70, pickPad: 3, breakSpeed: 250, respawn: 5,
      throwSpeed: 330, throwRange: 210, bounceSpeed: 150, bounceRange: 30, stun: 1.0, knock: 200, aiHold: 1.2, aiSeek: 130, aiGap: 8, color: '#ff3d3d',
    },
    // Moped Boys: làn giao hàng chạy dọc sân (gần bóng) nhấp nháy warn giây rồi xe máy phóng qua. Đội bạn trúng: văng + choáng + rơi bóng
    // (lướt né được). Moped Boys trúng: được "quá giang" — chạy nhanh x boost trong boostT giây. Họ bị dẫn: xe ra dày hơn (trailing)
    mopeds: {
      name: 'DELIVERY LANE', hint: 'Get out of the flashing lane',
      first: 4, every: [6, 9], trailing: 1.6, warn: 1.3, speed: 460, r: 11, stun: 0.8, knock: 240, ballKick: 260,
      boost: 1.35, boostT: 2.5, color: '#ffd23f',
    },
    // School Ghosts (user 2026-10-21): sau first giây, n con ma (không cầm bóng) tàng hình (còn chút bóng hình độ đậm alpha) + chạy x speed, tới khi bị lộ.
    // Đội bạn ra đòn nặng trúng 1 con ma không tàng hình -> cả đội ma hiện hình, cooldown giây sau mới tàng hình lại.
    // Chuông trường reo mỗi bell giây: 2 con ma (không cầm bóng) đổi chỗ cho nhau. Họ bị dẫn: chuông + hồi tàng hình nhanh hơn (trailing)
    ghosts: {
      name: 'NOW YOU SEE THEM', hint: 'Two ghosts vanish and speed up. Heavy-hit a visible one to reveal them all',
      n: 2, alpha: 0.1, speed: 1.3, first: 5, cooldown: 8, bell: [9, 13], trailing: 1.5,
    },
    // Block Wardens: cả đội khổng lồ (to scale lần, power / tackle x power, speed x speed). Đấm nhẹ không tác dụng (người đấm bật ra bounce px/s),
    // phải dùng đòn nặng. Bị dẫn: to thêm rageScale (banner rage)
    giants: {
      name: 'GIANT WARDENS', hint: 'Light punches bounce off, use heavy attacks',
      scale: 1.5, rageScale: 1.7, power: 1.15, speed: 0.92, bounce: 140,
      rage: 'ANGRY GIANTS', rageHint: 'The Wardens grow even bigger',
    },
    /* ---- Story 2–4 (2026-10-19). Luật lặp lại: first = giây tới lần đầu, every = [min, max] giây giữa 2 lần, trailing = nhanh x lần khi đội chủ luật bị dẫn ---- */
    // Pigeon Gang: đàn bồ câu bay ngang (flySpeed) thả n "bom" quanh bóng (spread px), vòng báo trước fall giây, bãi nằm life giây.
    // Đội bạn dẫm phải (bán kính r): trơn té stun giây, trượt slide px/s
    pigeons: {
      name: 'PIGEON BOMBS', hint: 'Watch the sky and step around the splats',
      first: 4, every: [5, 8], trailing: 1.5, n: 3, spread: 50, flySpeed: 300, fall: 0.8, life: 9, r: 6, stun: 0.8, slide: 160,
    },
    // Sky Hoppers: gió dọc sân, báo trước warn giây rồi thổi len giây: bóng lỏng tăng tốc ballPush px/s² theo gió, đội bạn bị đẩy push px/s,
    // Sky Hoppers chạy xuôi gió x boost. Bị dẫn: 3/4 cơn gió thổi về khung thành đội bạn. Lá bài THE STORM dùng lại số liệu này
    wind: {
      name: 'NIGHT WIND', hint: 'Gusts blow the ball down the rooftop',
      first: 5, every: [7, 10], trailing: 1.3, warn: 1.2, len: 3.5, ballPush: 150, push: 28, boost: 1.25,
    },
    // Billboard Kids: tường sơn dài len px, đặt cách bóng ahead px về phía khung thành bạn đang tấn công, báo trước warn giây, đứng life giây.
    // Chặn đội bạn + bóng thấp (lốp bóng qua được); Billboard Kids đi xuyên
    graffiti: {
      name: 'SPRAY WALLS', hint: 'Paint walls block your way to goal, lift the ball over them',
      first: 4, every: [5, 8], trailing: 1.5, ahead: 70, len: 64, warn: 0.9, life: 5,
      colors: ['#9dff3d', '#ff3fb4', '#3ff6ff', '#ffd23f'],
    },
    // Lantern Crew: đèn lồng rơi quanh chỗ bóng sắp tới (spread px), bóng đổ to dần warn giây, đập xuống: đội bạn trong bán kính r choáng stun giây,
    // văng knock (lướt né được). Lantern Crew không sao. Bị dẫn: rơi 2 cái
    lanterns: {
      name: 'FALLING LANTERNS', hint: 'Step away from a growing shadow',
      first: 4, every: [3.5, 6], trailing: 1.4, spread: 45, warn: 1.1, r: 20, stun: 0.9, knock: 160,
      colors: ['#ff3d5a', '#ffd23f', '#ff9a3d'],
    },
    // Noodle Kickers: bóng nóng time giây; đội bạn cầm bóng nóng quá holdMax giây là bỏng (choáng stun giây, rơi bóng). Noodle Kickers cầm thoải mái
    hotball: {
      name: 'HOT BALL', hint: 'When the ball glows, pass it fast',
      first: 5, every: [6, 9], trailing: 1.5, time: 6, holdMax: 1.2, stun: 0.8,
    },
    // Fortune Tellers: rút 1 lá mỗi every giây, tác dụng time giây. mouse: đội bạn teo còn tinySize, chạy x tinySlow · storm: 1 cơn gió (mods.wind)
    // · star: Fortune Tellers chạy x starSpeed. Không rút trùng lá vừa rồi
    fortune: {
      name: 'FORTUNE CARDS', hint: 'Every card changes the match for a while',
      first: 5, every: [9, 12], trailing: 1.3, time: 7, tinySize: 0.7, tinySlow: 0.85, starSpeed: 1.3,
      cards: [
        { id: 'mouse', name: 'THE MOUSE', hint: 'Your team shrinks' },
        { id: 'storm', name: 'THE STORM', hint: 'A gust sweeps the pitch' },
        { id: 'star', name: 'THE STAR', hint: 'The Fortune Tellers speed up' },
      ],
    },
    // Market Mamas: sạp rộng w px, sâu depth px đẩy ra từ mép trên / dưới gần bóng, báo trước warn giây, đứng life giây (người bị đẩy ra, bóng dội).
    // Bị dẫn: 2 sạp cùng lúc (trên + dưới)
    stalls: {
      name: 'MARKET STALLS', hint: 'The market pushes into the pitch',
      first: 5, every: [7, 10], trailing: 1.3, w: 150, depth: 55, warn: 1.2, life: 7,
      colors: ['#ff3d5a', '#3fa8ff', '#6bff7a'],
    },
    // Rust Buckets: nước dâng từ mép trên / dưới tới depth phần chiều cao sân (dâng warn giây, giữ len giây, rút recede giây).
    // Đội bạn trong nước chạy x slow, bóng lăn trong nước giảm tốc thêm drag. Rust Buckets không sao
    tide: {
      name: 'HIGH TIDE', hint: 'Stay out of the water, it slows you down',
      first: 5, every: [6, 9], trailing: 1.4, depth: 0.45, warn: 1.5, len: 5, recede: 1.2, slow: 0.55, drag: 4,
    },
    // Retired Refs: người chơi (không tính đồng đội AI) ra đòn làm choáng 1 Ref = phạm lỗi. Lần lẻ: thẻ vàng (hiện yellowTime giây). Lần chẵn: thẻ đỏ, đứng ngoài redTime giây
    refs: {
      name: 'THE REFS', hint: 'Hit a Ref and you get a card. Two cards and you sit out',
      yellowTime: 1.6, redTime: 4,
    },
    // Grandpa's Squad: báo trước warn giây (câu "Back in my day..."), rồi len giây màn hình sepia + đội bạn chạy x slow
    flashback: {
      name: 'BACK IN MY DAY', hint: 'When the old stories start, you slow down',
      first: 6, every: [9, 13], trailing: 1.4, warn: 1.2, len: 3.5, slow: 0.55,
    },
    // The Legends: sau first giây (rồi every giây sau khi STAR hết) 1 Legend thành STAR time giây: sút x power, chạy x speed.
    // Đội bạn cướp bóng từ STAR: người cướp thành GOLDEN BOOT bootTime giây (cùng sức mạnh)
    golden: {
      name: 'GOLDEN STAR', hint: 'Steal the ball from the star to take the golden boot',
      first: 3, every: [4, 7], time: 10, bootTime: 8, power: 1.4, speed: 1.15,
    },
    // Night Owls (user 2026-10-22, thay SEARCHLIGHT): con cú khổng lồ trên khán đài cả trận, bình thường nhắm mắt. "HOO..." rồi mắt mở dần warn giây (báo trước),
    // mở hẳn open giây: ai bên bạn đang chạy nhanh (đè phím chạy) / lướt bị tia ngắm khoá, đứng lại / đi bộ thì nhả. Chạy tiếp đủ lockT giây -> bắn đạn
    // bay boltT giây đuổi theo, lướt đúng lúc là né; trúng = hoá đá stone giây (đứng chôn chân + rơi bóng). Core / Tuyệt kỹ không tính.
    // Đồng đội AI tuân luật với xác suất aiObey mỗi lần. Owls không ra đòn / sút / chuyền lúc mắt mở. Bị dẫn: mở thường hơn (trailing) + lâu hơn (x trailOpen)
    owlgaze: {
      name: "OWL'S GAZE", hint: 'When the owl opens its eyes, stop running or turn to stone',
      first: 6, every: [7, 10], trailing: 1.4, warn: 1.0, open: 2.4, trailOpen: 1.35, lockT: 0.8, boltT: 0.45, stone: 1.5, aiObey: 0.85, color: '#ffd23f',
    },
    // (chưa dùng, để dành cho Story sau) đèn pha quét sân (đường Lissajous). Đội bạn cầm bóng trong đèn catchT giây -> FREEZE: choáng + rơi bóng, đèn dừng pause giây.
    // Lướt né được. Wardens bị dẫn: bật thêm 1 đèn (LOCKDOWN)
    searchlight: {
      name: 'SEARCHLIGHT', hint: 'Never hold the ball in the light',
      r: 34, speedX: 0.42, speedY: 0.67, marginX: 70, marginY: 40, catchT: 0.6, stun: 1.0, pause: 1.6, color: '#fff3b0',
      lockdown: 'LOCKDOWN', lockdownHint: 'A second light switches on',
    },
  },

  /* 4 Story, cùng luật cup knockout 4 vòng + luật trận từng đối thủ, khác nhau ở CÁCH KỂ (user chốt 2026-10-20, src/ui/story.js TELL):
   *   ward_cup nhật ký mùa hè (diary) · rooftop_league manga · market_cup show TV (tv) · legends_cup cuộn phim hồi tưởng (film)
   * stages: tên 6 chặng [mở đầu, 1/8, tứ kết, bán kết, chung kết, kết] — trang / thẻ đầu mỗi chặng theo kiểu kể (ngày · chương · tập · cuộn)
   * Thẻ Story không ghi tên kiểu kể (user 2026-10-21) · channel / ticker: logo kênh + chữ chạy (tv) · outroColor: phim có màu lại ở đoạn kết (film)
   * Dòng thoại thêm: sfx (chữ hiệu ứng đập màn cùng câu, hợp manga) · color: true (film: cảnh có màu, hết hồi tưởng) */
  list: [
    /* ---------- Story 1: hẻm phường, độ khó 1 (Elo 30 → 240) · kể bằng NHẬT KÝ MÙA HÈ của bạn ---------- */
    {
      id: 'ward_cup', name: 'THE WARD CUP', color: '#ff9a3d', cover: 'alley', theme: 'alley', trophy: 'pot', tier: 1,
      blurb: 'The alley gets torn down at the end of summer. This is the last Ward Cup ever.',
      tell: 'diary',
      stages: ['JULY 28', 'JULY 29', 'JULY 30', 'JULY 31', 'AUGUST 1', 'AUGUST 2'],
      narrator: { name: 'WARD LOUDSPEAKER' },
      rival: 3,
      rounds: [
        {
          // luật nhà: các chú được dẫn trước 1 bàn (score = tỉ số lúc giao bóng [đội bạn, đối thủ])
          team: 'ward_uncles', arena: 'village', elo: 30, mod: 'stools', score: [0, 1],
          before: [
            { who: 'you', text: 'Round of sixteen today. Against the Uncles. Mum says be polite.' },
            { who: 'opp', text: 'House rules, kid. The elders start one goal up.' },
            { who: 'you', text: 'Since when?!' },
            { who: 'opp', text: 'Since thirty years ago. Sit down.' },
            { who: 'host', text: 'Mind the plastic stools. Walk into one to pick it up, attack to throw it.' },
          ],
          after: [
            { who: 'opp', text: 'Rematch. Next summer. Same time, same stools.' },
            { who: 'you', text: 'There is no next summer, Uncle.' },
            { who: 'opp', text: '...Right. The bulldozers.' },
            { who: 'host', art: 'cupItem', item: 'notice', text: 'Three days until the bulldozers.' },
          ],
          barks: {
            kickoff: ['Sit down, kids!', 'Respect your elders!'],
            goal: ['Old school!', 'Still got it!'],
            conceded: ['My back...', 'Lucky kick!'],
            mod: ['MY STOOL!', 'Put that down!'],
          },
        },
        {
          team: 'moped_boys', arena: 'street', elo: 90, signature: 'speed_demon', mod: 'mopeds',
          before: [
            { who: 'you', text: 'Quarter-final. The Moped Boys bring lunch to the construction site every day.' },
            { who: 'opp', text: 'Move it! Lunch for the bulldozer guys, coming through!' },
            { who: 'you', text: 'Through the middle of our match?' },
            { who: 'opp', text: 'The boss pays per delivery. Not per manners.' },
            { who: 'host', text: 'When a lane flashes, get out of it! A moped that hits a Moped Boy only makes him faster.' },
          ],
          after: [
            { who: 'opp', text: 'Whatever. The site still pays us tomorrow.' },
            { who: 'you', text: 'They rode off without a word. I drew their mopeds anyway.' },
            { who: 'host', art: 'cupItem', item: 'notice', text: 'Two days until the bulldozers.' },
          ],
          barks: {
            kickoff: ['Order up!', 'Express delivery!'],
            goal: ['Delivered!', 'Still hot!'],
            conceded: ['Wrong address!', 'Return to sender!'],
            mod: ['HONK HONK!', 'Out of the lane!'],
          },
        },
        {
          team: 'school_ghosts', arena: 'school', elo: 160, signature: 'phantom_step', mod: 'ghosts',
          before: [
            { who: 'you', text: 'Semi-final in the old school yard. Nobody has seen the School Ghosts in daylight.' },
            { who: 'opp', text: 'This school closed ten years ago. We never finished our last summer here.' },
            { who: 'you', text: '...Wait. Are you actual ghosts?' },
            { who: 'opp', text: 'Does it matter? The bell is about to ring.' },
            { who: 'host', text: 'Two ghosts at a time turn invisible and run faster. Hit a visible one hard and they all show up!' },
          ],
          after: [
            { who: 'opp', text: 'Ha. We were never ghosts. Just kids who moved away. We came back for the last cup.' },
            { who: 'host', art: 'cupRival', team: 'block_wardens', text: 'In the final: the Block Wardens. They guard the construction site, and they have not lost in five summers.' },
            { who: 'opp', art: 'cupTalk', team: 'block_wardens', text: 'At dawn the machines come in. Play your little final. Then go home.' },
            { who: 'host', art: 'cupItem', item: 'notice', text: 'One day until the bulldozers.' },
          ],
          barks: {
            kickoff: ['Booo...', 'Roll call!'],
            goal: ['Spooky!', 'Did you see that? No.'],
            conceded: ['Impossible!', 'You saw me?!'],
            mod: ['RING RING!', 'Change classes!', "Now you don't!"],
          },
        },
        {
          team: 'block_wardens', arena: 'alley', elo: 240, signature: 'giant_keeper', mod: 'giants',
          before: [
            { who: 'you', text: 'The last final. The whole ward came out. Even the construction workers put down their tools.' },
            { who: 'opp', text: 'Rules are rules. Tomorrow this alley is gone.' },
            { who: 'you', text: 'You wear their uniform. But you stand like you grew up here.' },
            { who: 'opp', text: '...Just play.' },
            { who: 'host', text: 'The Wardens are giants! Light punches bounce off them. Use heavy attacks!' },
          ],
          after: [
            { who: 'opp', text: 'That goal painted on the wall... I painted it. When I was your age.' },
            { who: 'opp', art: 'cupTalk', text: 'I am not guarding any bulldozers tomorrow. Let them find someone else.' },
          ],
          barks: {
            kickoff: ['Rules are rules!', 'Stomp them!'],
            goal: ['Trespassers!', 'Off our block!'],
            conceded: ['Lock the gates!', 'GRRR!'],
            mod: ['That tickles.', 'Was that a punch?'],
          },
        },
      ],
      fillers: ['paddy_kickers', 'muddy_ducks', 'buffalo_chiefs', 'alley_cats', 'trash_pandas', 'hall_monitors', 'detention_club',
        'sky_hoppers', 'pigeon_gang', 'noodle_kickers', 'lantern_crew'],
      reward: { gold: [25, 40, 60, 120], item: 'ward_trophy' },
      stars: [
        { id: 'champ', kind: 'champ', desc: 'Win the cup' },
        { id: 'clean_final', kind: 'cleanFinal', desc: 'Clean sheet in the final' },
        { id: 'hattrick', kind: 'hattrick', desc: 'Hat-trick in one match' },
      ],
      intro: [
        { who: 'you', text: 'Dear diary. This morning the ward loudspeaker woke up the whole alley.' },
        { who: 'host', art: 'cupItem', item: 'notice', text: 'At the end of this summer, the old alley will be torn down. A car park is coming.' },
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'So this is the last Ward Cup ever. One rice pot painted gold, for the last champion.' },
        { who: 'you', text: 'I am going to win that pot. I wrote it down, so now it is true.' },
      ],
      outro: [
        { who: 'host', text: 'THE LAST WARD CUP HAS A CHAMPION!' },
        { who: 'host', art: 'cupItem', item: 'notice', text: 'And news just in: the Wardens quit, the whole ward signed a letter, and the car park is CANCELLED!' },
        { who: 'you', text: 'Dear diary. Best. Summer. Ever. Same time next year.' },
      ],
    },
    /* ---------- Story 2: sân thượng, độ khó 2 (Elo 380 → 700) · kể bằng MANGA (trang truyện đen trắng, bóng thoại, chữ hiệu ứng) ---------- */
    {
      id: 'rooftop_league', name: 'ROOFTOP NIGHT LEAGUE', color: '#6ec8ff', cover: 'rooftop', theme: 'rooftop', trophy: 'owl', tier: 2,
      blurb: 'A black card with a golden owl. A secret league. Four trials before dawn.',
      tell: 'manga',
      stages: ['CHAPTER 1 · THE CARD', 'CHAPTER 2 · FIRST TRIAL', 'CHAPTER 3 · SECOND TRIAL', 'CHAPTER 4 · THIRD TRIAL', 'CHAPTER 5 · FINAL TRIAL', 'LAST CHAPTER · DAWN'],
      narrator: { name: 'THE VOICE', art: 'cupVoice' },
      rival: 3,
      rounds: [
        {
          team: 'pigeon_gang', arena: 'rooftop', elo: 380, mod: 'pigeons',
          before: [
            { who: 'host', text: 'FIRST TRIAL. Your examiners: the Pigeon Gang. They guard the ledge.' },
            { who: 'opp', sfx: 'FLAP FLAP', text: 'Coo.' },
            { who: 'you', text: 'Was that a threat?' },
            { who: 'host', text: 'Watch the sky. When the flock flies over, step around the splats.' },
          ],
          after: [
            { who: 'opp', text: 'Coo...' },
            { who: 'host', text: 'First trial passed. Half the candidates already went home.' },
          ],
          barks: {
            kickoff: ['COO!', 'Coo coo!'],
            goal: ['COO COO COO!', 'Coo!'],
            conceded: ['...coo.', 'Coo?!'],
            mod: ['Bombs away!', 'COO!'],
          },
        },
        {
          team: 'sky_hoppers', arena: 'rooftop', elo: 470, signature: 'flying_kick', mod: 'wind',
          before: [
            { who: 'host', text: 'SECOND TRIAL. The Sky Hoppers jump roof to roof just to get here.' },
            { who: 'opp', sfx: 'WHOOSH', text: 'We failed this exam three years ago. Now we are the wind.' },
            { who: 'you', text: 'Then I will run against it.' },
            { who: 'host', text: 'When the night wind blows, the ball drifts down the roof. The Hoppers ride it.' },
          ],
          after: [
            { who: 'opp', text: 'You ran into the wind and won. We never did.' },
            { who: 'host', text: 'Second trial passed. Nobody with a card has come this far in years.' },
          ],
          barks: {
            kickoff: ['Feel the breeze!', 'Up we go!'],
            goal: ['Wind assist!', 'Too easy!'],
            conceded: ['Bad gust!', 'Wrong way, wind!'],
            mod: ['Here it comes!', 'WHOOSH!'],
          },
        },
        {
          team: 'billboard_kids', arena: 'plaza', elo: 580, signature: 'shadow_clone', mod: 'graffiti',
          before: [
            { who: 'host', text: 'THIRD TRIAL. The Billboard Kids paint walls faster than you can run.' },
            { who: 'opp', sfx: 'PSSHHT', text: 'We painted the Voice once. Just a shadow with two owl eyes.' },
            { who: 'you', text: 'Paint me after I win.' },
            { who: 'host', text: 'Spray walls block your way to goal. Go around them, or lift the ball over.' },
          ],
          after: [
            { who: 'opp', text: 'Fine. You get the billboard. Winning.' },
            { who: 'host', art: 'cupRival', team: 'night_owls', sfx: 'DOOM', text: 'FINAL TRIAL. The Night Owls. They have not lost on this roof in three years.' },
            { who: 'you', text: 'Wait. That voice... it is coming from their captain.' },
          ],
          barks: {
            kickoff: ['Smile!', 'Fresh paint!'],
            goal: ['Masterpiece!', 'Sign it!'],
            conceded: ['Smudged it!', 'Not my style!'],
            mod: ['Wet paint!', 'Tag!'],
          },
        },
        {
          team: 'night_owls', arena: 'rooftop', elo: 700, signature: 'thunder_kick', mod: 'owlgaze',
          before: [
            { who: 'host', text: 'Step into the light.' },
            { who: 'opp', sfx: 'CLICK', text: 'Yes. I am the Voice. Every card on this roof came from me.' },
            { who: 'opp', sfx: 'HOO...', text: 'The final trial is simple. When my eyes open, nobody runs.' },
            { who: 'you', text: 'You talk a lot for an owl.' },
          ],
          after: [
            { who: 'opp', art: 'cupTalk', sfx: 'HOO...', text: 'The exam is over. You passed.' },
            { who: 'opp', art: 'cupTalk', text: 'I leave the city at dawn. This roof needs a new Voice.' },
          ],
          barks: {
            kickoff: ['We see you.', 'Eyes open.'],
            goal: ['Saw it coming!', 'Hoo hoo!'],
            conceded: ['Who? WHO?!', 'Did not see that!'],
            mod: ['I saw that!', 'Gotcha!', 'No running!'],
          },
        },
      ],
      fillers: ['alley_cats', 'trash_pandas', 'hall_monitors', 'detention_club', 'noodle_kickers', 'lantern_crew', 'crane_crushers',
        'rust_buckets', 'metro_express', 'downtown_stars', 'chain_gang'],
      reward: { gold: [40, 60, 90, 180], item: 'moon_cap' },
      stars: [
        { id: 'champ', kind: 'champ', desc: 'Win the cup' },
        { id: 'big_final', kind: 'bigWin', desc: 'Win the final by 3' },
        { id: 'hattrick', kind: 'hattrick', desc: 'Hat-trick in one match' },
      ],
      intro: [
        { who: 'host', art: 'cupItem', item: 'invite', sfx: 'FWIP!', text: 'A black card with a golden owl. If you are reading it, you were chosen.' },
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'Sixteen teams got a card tonight. Four trials before dawn. Only one leaves with the cup.' },
        { who: 'you', text: 'Sounds like my kind of night.' },
        { who: 'host', art: 'cupVoice', text: 'Lose once, and you forget this roof exists.' },
      ],
      outro: [
        { who: 'host', text: 'The sun comes up over the city. The roof is yours now.' },
        { who: 'opp', art: 'cupTalk', team: 'night_owls', text: 'Keep the cap. From tonight, the cards come from you.' },
        { who: 'you', art: 'cupItem', item: 'invite', text: 'Sixteen black cards. Let us see who finds one.' },
      ],
    },
    /* ---------- Story 3: chợ đêm, độ khó 3 (Elo 620 → 1150) · kể bằng SHOW NẤU ĂN TRÊN TV (Uncle Noodle dẫn chương trình) ---------- */
    {
      id: 'market_cup', name: 'NIGHT MARKET CUP', color: '#ff3fb4', cover: 'market', theme: 'market', trophy: 'bowl', tier: 3,
      blurb: 'Win four ingredients, cook one legendary bowl, and save the noodle cart. Live on TV.',
      tell: 'tv', channel: 'NMTV',
      stages: ['PILOT', 'EP.1 · THE FLAME', 'EP.2 · THE NOODLES', 'EP.3 · THE SPICE', 'EP.4 · THE TASTING', 'SEASON FINALE'],
      ticker: ["UNCLE NOODLE'S CART FACES EVICTION", 'MARKET MAMAS: NO DISCOUNTS, EVER', 'LANTERN SAFETY CHECK FAILED AGAIN', 'FORTUNE TELLER PREDICTS RAIN, IT IS SUNNY'],
      narrator: { name: 'UNCLE NOODLE', horn: false, look: { skin: '#e0a878', hair: '#1a1216', cut: 'bandana', face: 'mustache', shoes: 'slides', fx: 'smoke' }, kit: { shirt: '#f3ead7', shirtDark: '#c9b48a', shorts: '#3a2a20', accent: '#e8322a', hair: ['#1a1216'] } },
      rival: 3,
      rounds: [
        {
          team: 'lantern_crew', arena: 'market', elo: 620, mod: 'lanterns',
          before: [
            { who: 'host', text: "Episode one! Tonight's ingredient: the eternal flame of the Lantern Crew!" },
            { who: 'opp', text: 'One rule in our stall. Mind your head.' },
            { who: 'host', text: 'Viewers at home: when a shadow grows under you, MOVE! Those lanterns were hung by amateurs!' },
            { who: 'opp', text: 'We heard that.' },
          ],
          after: [
            { who: 'host', art: 'cupItem', item: 'bowl', text: 'The broth meets the flame... I can see my childhood! Stay tuned!' },
            { who: 'you', text: 'It is just soup, Uncle.' },
          ],
          barks: {
            kickoff: ['Lights up!', 'Mind your head!'],
            goal: ['Bright idea!', 'Lit!'],
            conceded: ['Lights out...', 'Burnt out!'],
            mod: ['Oops!', 'Heads up!'],
          },
        },
        {
          team: 'noodle_kickers', arena: 'street', elo: 780, signature: 'fire_shot', mod: 'hotball',
          before: [
            { who: 'host', text: 'Episode two! The Noodle Kickers pull noodles with their FEET. Kids, do not try this at home.' },
            { who: 'opp', text: 'Our noodles come straight out of a boiling pot. So does our ball. Catch!' },
            { who: 'you', text: 'The ball is HOT?!' },
            { who: 'host', text: 'When the ball glows, pass it fast! Hold it too long and you get burned.' },
          ],
          after: [
            { who: 'opp', text: 'You pass like a real chef. Fine. Take the noodles.' },
            { who: 'host', art: 'cupItem', item: 'bowl', text: 'Flame AND noodles! Our ratings just went through the roof!' },
          ],
          barks: {
            kickoff: ['Order up!', 'Fresh from the pot!'],
            goal: ['Served hot!', 'Extra spicy!'],
            conceded: ['Overcooked!', 'Too salty!'],
            mod: ['Careful, hot!', 'Sizzle!'],
          },
        },
        {
          team: 'fortune_tellers', arena: 'market', elo: 920, signature: 'loaded_dice', mod: 'fortune',
          before: [
            { who: 'host', text: 'Episode three! Madame Fate grows the spice of fate. Nobody knows where. Not even her.' },
            { who: 'opp', text: 'I see a bowl. I see... you losing. Shall I draw another card?' },
            { who: 'you', text: 'Draw all you want.' },
            { who: 'host', text: 'Read every card! You might shrink, a storm might hit, or the Tellers speed up!' },
          ],
          after: [
            { who: 'opp', text: 'The cards never lie. Tonight they just... exaggerated.' },
            { who: 'host', art: 'cupItem', item: 'recipe', text: 'Flame, noodles, spice. The last ingredient is the taste of a hard-won final.' },
            { who: 'host', art: 'cupRival', team: 'market_mamas', text: 'After the break: the Market Mamas. Forty years, and they have never lost a haggle.' },
          ],
          barks: {
            kickoff: ['It is written.', 'Pick a card!'],
            goal: ['Foreseen!', 'As the cards said!'],
            conceded: ['Impossible!', 'Bad omen!'],
            mod: ['Draw!', 'Your fate!'],
          },
        },
        {
          team: 'market_mamas', arena: 'market', elo: 1150, signature: 'giant_fist', mod: 'stalls',
          before: [
            { who: 'host', text: 'THE BIG TASTING! Win, and my sister has to taste the bowl. Lose, and the cart goes in the river.' },
            { who: 'opp', text: 'Little brother. You are hiding behind a child now?' },
            { who: 'host', text: 'That is not a child. That is my HEAD CHEF.' },
            { who: 'you', text: 'I am your WHAT?' },
            { who: 'host', text: 'The stalls push in and squeeze the pitch! If the Mamas fall behind, two come in at once!' },
          ],
          after: [
            { who: 'opp', text: 'Hmph. Bring me the bowl.' },
            { who: 'opp', art: 'cupItem', item: 'bowl', text: "...This is Mum's Midnight Noodle. You had Mum's recipe this whole time?!" },
            { who: 'host', text: 'I INHERITED it! You got the house!' },
          ],
          barks: {
            kickoff: ['No discounts!', 'Move, sweetie!'],
            goal: ['Bargain!', 'Sold!'],
            conceded: ['Daylight robbery!', 'I want a refund!'],
            mod: ['Coming through!', 'Make room!'],
          },
        },
      ],
      fillers: ['alley_cats', 'trash_pandas', 'hall_monitors', 'detention_club', 'sky_hoppers', 'pigeon_gang', 'crane_crushers',
        'rust_buckets', 'chain_gang', 'iron_knuckles', 'metro_express'],
      reward: { gold: [55, 80, 120, 240], item: 'lantern_hat' },
      stars: [
        { id: 'champ', kind: 'champ', desc: 'Win the cup' },
        { id: 'no_golden', kind: 'noGolden', desc: 'Win with no golden goal' },
        { id: 'goals', kind: 'goals', n: 12, desc: 'Win with 12 goals' },
      ],
      intro: [
        { who: 'host', art: 'cupHost', text: 'Good evening, night market! Welcome to MIDNIGHT NOODLE SHOWDOWN, live from my cart!' },
        { who: 'host', text: 'This is our first season, and maybe our last. The Market Mamas want my cart gone.' },
        { who: 'opp', art: 'cupTalk', team: 'market_mamas', text: 'Your noodles are bland, little brother. They have been bland for forty years.' },
        { who: 'you', text: 'Little BROTHER?' },
        { who: 'host', art: 'cupItem', item: 'recipe', text: 'Win four matches, win four ingredients, cook the Midnight Noodle. Then we serve it to my sister!' },
      ],
      outro: [
        { who: 'host', text: 'The cart stays! Thank you, night market, and goodnight!' },
        { who: 'opp', art: 'cupTalk', team: 'market_mamas', text: 'We share a stall. Half the recipe each. Final offer.' },
        { who: 'you', text: 'So do I get free noodles?' },
        { who: 'host', text: 'For a WEEK, head chef. Do not push it.' },
      ],
    },
    /* ---------- Story 4: sân vận động, độ khó 4 (Elo 1450 → 2700) · kể bằng CUỘN PHIM HỒI TƯỞNG của ông nội (đoạn kết phim có màu lại) ---------- */
    {
      id: 'legends_cup', name: "GRANDPA'S LEGENDS", color: '#ffd23f', cover: 'stadium', theme: 'stadium', trophy: 'cup', tier: 4,
      blurb: 'Fifty years ago, Grandpa never finished his final. You will.',
      tell: 'film', outroColor: true,
      stages: ['REEL ONE', 'REEL TWO · THE HARBOR', 'REEL THREE · THE WHISTLE', 'REEL FOUR · THE OLD SQUAD', 'REEL FIVE · THE LEGENDS', 'THE END'],
      narrator: { name: 'GRANDPA', horn: false, look: { skin: '#d99a6c', hair: '#e8ecf5', cut: 'buzz', face: 'beard', shoes: 'slides', fx: 'nofx' }, kit: { shirt: '#8a5a30', shirtDark: '#5a3a1a', shorts: '#3a3a44', accent: '#f3ead7', hair: ['#e8ecf5'] }, youngLook: { skin: '#d99a6c', hair: '#1a1216', cut: 'bowl', face: 'blush', shoes: 'socks', fx: 'nofx' }, youngKit: { shirt: '#c9781a', shirtDark: '#7a4510', shorts: '#f3ead7', accent: '#f3ead7', hair: ['#1a1216'] } },
      rival: 3,
      rounds: [
        {
          team: 'rust_buckets', arena: 'harbor', elo: 1450, mod: 'tide',
          before: [
            { who: 'host', art: 'cupMemory', young: true, text: 'After the tackle, the harbor sailors carried me home on their boat.' },
            { who: 'opp', text: 'Those boots... we know those boots. The tide always brings old things back.' },
            { who: 'you', text: 'Then let it bring me a win.' },
            { who: 'host', text: 'When the tide rolls in, stay out of the water. It slows you down, never the sailors!' },
          ],
          after: [
            { who: 'opp', text: 'Tell the old man the Rust Buckets said hello. And tell him it was not his fault.' },
            { who: 'you', text: 'Not his fault? What does that mean?' },
          ],
          barks: {
            kickoff: ['Anchors up!', 'All hands!'],
            goal: ['Land ho!', 'Full steam!'],
            conceded: ['Man overboard!', 'Abandon ship!'],
            mod: ['High tide!', 'Here comes the sea!'],
          },
        },
        {
          team: 'retired_refs', arena: 'plaza', elo: 1750, signature: 'aegis_wall', mod: 'refs',
          before: [
            { who: 'host', art: 'cupMemory', young: true, team: 'legends_76', text: 'There was a whistle that day. Or there should have been.' },
            { who: 'opp', text: 'Forty years of whistles. On this pitch, we are the rules.' },
            { who: 'you', text: 'Were you the referee in the 1976 final?' },
            { who: 'opp', text: '...Play first. Talk after.' },
            { who: 'host', text: 'Hit a Ref and you get a card. Two cards and you sit out! The Refs, of course, do whatever they want.' },
          ],
          after: [
            { who: 'opp', text: 'It was me. King Leo went in late, studs up. I saw it, and I never blew the whistle.' },
            { who: 'host', art: 'cupMemory', young: true, fall: true, team: 'legends_76', text: 'The match was abandoned. And I walked away from football.' },
          ],
          barks: {
            kickoff: ['Play fair!', 'By the book!'],
            goal: ['Goal stands!', 'Check complete!'],
            conceded: ['Offside!', 'VAR! VAR!'],
            mod: ['Foul!', 'Card!'],
          },
        },
        {
          team: 'grandpa_squad', arena: 'village', elo: 2150, signature: 'counter_attack', mod: 'flashback',
          before: [
            { who: 'host', art: 'cupMemory', young: true, text: 'My old squad. I quit on them after that day. They never forgave me.' },
            { who: 'opp', text: 'Those are his boots. He walked away from us. Why should you get to wear them?' },
            { who: 'you', text: 'Because he never stopped talking about you. Every single day.' },
            { who: 'opp', text: 'Ha! Then show us what he taught you. Back in my day...' },
            { who: 'host', text: 'When the old stories start, you slow down. They do not!' },
          ],
          after: [
            { who: 'opp', text: 'You play just like him. Tell him... tell him to come and watch the final.' },
            { who: 'host', art: 'cupRival', team: 'old_legends', text: 'And in the final: The Legends. The same men. The same captain.' },
            { who: 'opp', art: 'cupTalk', team: 'old_legends', text: 'Fifty years I have waited for that match to end properly. Bring the boots.' },
          ],
          barks: {
            kickoff: ['Back in my day!', 'Mind the knees!'],
            goal: ['Still got it!', 'Class of 76!'],
            conceded: ['My hip!', 'Kids today...'],
            mod: ['Back in my day...', 'Let me tell you...'],
          },
        },
        {
          team: 'old_legends', arena: 'stadium', elo: 2700, signature: 'black_hole', mod: 'golden',
          before: [
            { who: 'host', art: 'cupMemory', young: true, team: 'legends_76', text: 'Fifty years ago, it was him and me. Today, it is you.' },
            { who: 'opp', text: 'One of us is always the star, kid. Tonight it is still me.' },
            { who: 'you', text: 'Stars can be stolen.' },
            { who: 'host', text: 'Steal the ball from the golden star, and the golden boot is yours!' },
          ],
          after: [
            { who: 'opp', art: 'cupTalk', text: 'Fifty years, and I still lose to that family.' },
            { who: 'opp', art: 'cupTalk', color: true, text: 'Your grandpa is in the stands. Go on. He has waited long enough.' },
          ],
          barks: {
            kickoff: ['Legends never die!', 'One more time!'],
            goal: ['Legendary!', 'Hall of fame!'],
            conceded: ['A new legend?', 'My knees...'],
            mod: ['Star power!', 'Shine!'],
          },
        },
      ],
      fillers: ['crane_crushers', 'iron_knuckles', 'chain_gang', 'metro_express', 'downtown_stars', 'glitch_squad', 'chrome_wolves',
        'golden_eagles', 'royal_lions', 'noodle_kickers', 'lantern_crew'],
      reward: { gold: [70, 100, 150, 320], item: 'laurel' },
      stars: [
        { id: 'champ', kind: 'champ', desc: 'Win the cup' },
        { id: 'clean_final', kind: 'cleanFinal', desc: 'Clean sheet in the final' },
        { id: 'sweep', kind: 'sweep', desc: 'Win every match by 2' },
      ],
      intro: [
        { who: 'host', art: 'cupHost', text: 'Sit down, kid. Let me thread the old projector.' },
        { who: 'host', art: 'cupMemory', young: true, text: 'Fifty years ago, my squad made it to the final of the Legends Cup. I was the fastest boy on the coast.' },
        { who: 'host', art: 'cupMemory', young: true, fall: true, team: 'legends_76', text: 'Then, one tackle. My knee. Nobody ever finished that match.' },
        { who: 'host', art: 'cupItem', item: 'boots', text: 'The Legends Cup is back this year. These are my boots. Finish it for me.' },
        { who: 'you', text: 'I will, Grandpa.' },
      ],
      outro: [
        { who: 'host', text: 'Fifty years. My match is finally over. And we won.' },
        { who: 'you', text: 'Grandpa! You saw it?' },
        { who: 'host', text: 'Every second. Now give me back my boots.' },
      ],
    },
  ],

  /* Đội riêng của FOOTBALL STORY (gộp vào teams.list như đội Main Path). Khuôn giống mainPath.teams. */
  teams: {
    billboard_kids: {
      name: 'Billboard Kids', short: 'BIL', tagline: 'SPRAY & PRAY', desc: 'A graffiti crew who hang off billboards at night. Messy, fast and very colourful.',
      kit: { shirt: '#9dff3d', shirtDark: '#4a8a1a', shorts: '#1a1c26', accent: '#ff3fb4', hair: ['#ff3fb4', '#3ff6ff', '#1a1216'] },
      stats: { speed: 1.02, power: 0.9, pass: 0.96, tackle: 0.9, dribble: 1.06, accuracy: 0.94 },
      coreWeights: { trickster: 2.5, chaos: 1.5 }, aiStyle: { light: 0.9, hard: 0.8 },
      players: ['SPRAY', 'TAGGER', 'DRIP'],
      looks: [{ cut: 'bandana', face: 'mask', shoes: 'hightop', fx: 'confetti', skin: 2 }, { cut: 'beanie', face: 'clown', shoes: 'rainbowkick', fx: 'rainbow', skin: 0 }, { cut: 'cap', face: 'shades', shoes: 'neonkick', fx: 'neon', skin: 3 }],
    },
    night_owls: {
      name: 'Night Owls', short: 'OWL', tagline: 'BOSS · NEVER SLEEP', desc: 'They run the rooftop league from midnight to dawn. They see every pass before you make it.',
      kit: { shirt: '#2a2050', shirtDark: '#140f2a', shorts: '#0a0818', accent: '#ffd23f', hair: ['#e8ecf5', '#9aa3b5'] },
      stats: { speed: 1.06, power: 1.02, pass: 1.1, tackle: 1.04, dribble: 1.02, accuracy: 1.08 },
      coreWeights: { playmaker: 3, striker: 1.5 }, aiStyle: { light: 1.2, hard: 1.2 },
      players: ['HOOT', 'MIDNIGHT', 'GRAND OWL'],
      looks: [{ cut: 'longhair', face: 'visor', shoes: 'cleats', fx: 'shadow', skin: 4 }, { cut: 'beanie', face: 'monocle', shoes: 'socks', fx: 'frost', skin: 1 }, { cut: 'mohawk', face: 'lasereyes', shoes: 'goldboot', fx: 'galaxy', skin: 3 }],
    },
    fortune_tellers: {
      name: 'Fortune Tellers', short: 'FOR', tagline: 'IT IS WRITTEN', desc: 'They read your palm, your cards and your next pass. Mostly they just guess.',
      kit: { shirt: '#9d7bff', shirtDark: '#5a3aa8', shorts: '#1a1030', accent: '#ffd23f', hair: ['#1a1216', '#e8ecf5', '#8a4b22'] },
      stats: { speed: 1.04, power: 0.98, pass: 1.08, tackle: 0.98, dribble: 1.1, accuracy: 1.06 },
      coreWeights: { trickster: 2, chaos: 2.5 }, aiStyle: { light: 1.0, hard: 0.9 },
      players: ['TAROT', 'CRYSTAL', 'MADAME FATE'],
      looks: [{ cut: 'bun', face: 'monocle', shoes: 'socks', fx: 'petals', skin: 1 }, { cut: 'longhair', face: 'eyepatch', shoes: 'mismatch', fx: 'notes', skin: 2 }, { cut: 'afro', face: 'goldtooth', shoes: 'rainbowkick', fx: 'galaxy', skin: 4 }],
    },
    market_mamas: {
      name: 'Market Mamas', short: 'MAM', tagline: 'BOSS · NO DISCOUNTS', desc: 'The aunties who run every stall. They haggle, they shove, and they never, ever lose.',
      kit: { shirt: '#ff8a3f', shirtDark: '#b35a14', shorts: '#3a2440', accent: '#fff3d6', hair: ['#9aa0a8', '#1a1216', '#3b2415'] },
      stats: { speed: 1.04, power: 1.16, pass: 1.06, tackle: 1.18, dribble: 1.02, accuracy: 1.08 },
      coreWeights: { brawler: 3, iron: 2 }, aiStyle: { light: 1.6, hard: 1.5 },
      players: ['AUNTIE MAI', 'AUNTIE LAN', 'BIG MAMA'],
      looks: [{ cut: 'bun', face: 'blush', shoes: 'slides', fx: 'smoke', skin: 2 }, { cut: 'longhair', face: 'nerd', shoes: 'clogs', fx: 'coins', skin: 1 }, { cut: 'bun', face: 'goldtooth', shoes: 'clogs', fx: 'fire', skin: 3 }],
    },
    retired_refs: {
      name: 'Retired Refs', short: 'REF', tagline: 'BY THE BOOK', desc: 'Forty years of whistles and cards. Now they finally get to play, and they still think they are in charge.',
      kit: { shirt: '#1a1a1a', shirtDark: '#0a0a0a', shorts: '#1a1a1a', accent: '#ffd23f', hair: ['#e8ecf5', '#9aa0a8'] },
      stats: { speed: 1.08, power: 1.12, pass: 1.14, tackle: 1.2, dribble: 1.06, accuracy: 1.12 },
      coreWeights: { iron: 3, playmaker: 1.5 }, aiStyle: { light: 1.4, hard: 1.3 },
      players: ['WHISTLE', 'RED CARD', 'VAR'],
      looks: [{ cut: 'buzz', face: 'mustache', shoes: 'cleats', fx: 'nofx', skin: 1 }, { cut: 'bowl', face: 'nerd', shoes: 'cleats', fx: 'dust', skin: 0 }, { cut: 'cap', face: 'monocle', shoes: 'goldboot', fx: 'lightning', skin: 2 }],
    },
    grandpa_squad: {
      name: "Grandpa's Squad", short: 'GPA', tagline: 'CLASS OF 76', desc: "Your grandpa's old teammates. Bad knees, a great first touch and endless stories.",
      kit: { shirt: '#c9781a', shirtDark: '#7a4510', shorts: '#f3ead7', accent: '#f3ead7', hair: ['#e8ecf5', '#c7ccd6'] },
      stats: { speed: 1.04, power: 1.14, pass: 1.24, tackle: 1.12, dribble: 1.14, accuracy: 1.22 },
      coreWeights: { playmaker: 2.5, striker: 2 }, aiStyle: { light: 1.2, hard: 1.4 },
      players: ['OLD TOM', 'SPEEDY', 'THE PROFESSOR'],
      looks: [{ cut: 'bucket', face: 'beard', shoes: 'socks', fx: 'leaves', skin: 0 }, { cut: 'cowboy', face: 'mustache', shoes: 'boots', fx: 'dust', skin: 2 }, { cut: 'buzz', face: 'monocle', shoes: 'goldboot', fx: 'aura', skin: 1 }],
    },
    // Legends: The Legends năm 1976 (chỉ hiện trong cảnh hồi tưởng cupMemory) · The Legends bây giờ (chung kết)
    legends_76: {
      name: "The Legends '76", short: 'L76', tagline: 'BOSS · 1976', desc: 'The greatest team of 1976, and King Leo, the brightest star of them all.',
      kit: { shirt: '#f7f2e0', shirtDark: '#c9b060', shorts: '#1a1a1a', accent: '#ffd23f', hair: ['#1a1216', '#3b2415', '#ffd23f'] },
      stats: { speed: 1.2, power: 1.18, pass: 1.16, tackle: 1.14, dribble: 1.2, accuracy: 1.16 },
      coreWeights: { striker: 3, runner: 2 }, aiStyle: { light: 1.4, hard: 1.5 },
      players: ['ROCKET', 'DUKE', 'KING LEO'],
      looks: [{ cut: 'mohawk', face: 'shades', shoes: 'goldboot', fx: 'lightning', skin: 3 }, { cut: 'afro', face: 'goldtooth', shoes: 'cleats', fx: 'aura', skin: 4 }, { cut: 'crown', face: 'scar', shoes: 'goldboot', fx: 'aura', skin: 0 }],
    },
    old_legends: {
      name: 'The Old Legends', short: 'OLD', tagline: 'BOSS · FIFTY YEARS LATER', desc: 'The same Legends, fifty years older. Slower legs, sharper minds, and King Leo still wants to win.',
      kit: { shirt: '#f7f2e0', shirtDark: '#c9b060', shorts: '#1a1a1a', accent: '#ffd23f', hair: ['#e8ecf5', '#c7ccd6', '#e8ecf5'] },
      stats: { speed: 1.1, power: 1.22, pass: 1.3, tackle: 1.18, dribble: 1.2, accuracy: 1.28 },
      coreWeights: { playmaker: 3, striker: 2 }, aiStyle: { light: 1.5, hard: 1.6 },
      players: ['ROCKET', 'DUKE', 'KING LEO'],
      looks: [{ cut: 'buzz', face: 'beard', shoes: 'slides', fx: 'aura', skin: 3 }, { cut: 'bucket', face: 'mustache', shoes: 'clogs', fx: 'aura', skin: 4 }, { cut: 'crown', face: 'beard', shoes: 'goldboot', fx: 'aura', skin: 0 }],
    },
    ward_uncles: {
      name: 'The Uncles', short: 'UNC', tagline: 'OLD SCHOOL', desc: 'Thirty years on the same pitch. Slow legs, heavy shoulders.',
      kit: { shirt: '#c9b48a', shirtDark: '#8a7650', shorts: '#3a3a44', accent: '#ffffff', hair: ['#9aa0a8', '#e8ecf5'] },
      stats: { speed: 0.76, power: 0.9, pass: 0.84, tackle: 0.9, dribble: 0.74, accuracy: 0.8 },
      coreWeights: { iron: 2, brawler: 1.5 }, aiStyle: { light: 1.2, hard: 1.0 },
      players: ['UNCLE BA', 'UNCLE TU', 'UNCLE SAU'],
      looks: [{ cut: 'buzz', face: 'mustache', shoes: 'slides', fx: 'nofx', skin: 1 }, { cut: 'bucket', face: 'nerd', shoes: 'clogs', fx: 'smoke', skin: 2 }, { cut: 'cap', face: 'beard', shoes: 'slides', fx: 'nofx', skin: 0 }],
    },
    moped_boys: {
      name: 'Moped Boys', short: 'MPD', tagline: 'EXPRESS DELIVERY', desc: 'Noodle couriers who never stop moving. Fast, reckless, loud.',
      kit: { shirt: '#ff3d5a', shirtDark: '#a81d30', shorts: '#ffd23f', accent: '#ffd23f', hair: ['#1a1216', '#3b2415'] },
      stats: { speed: 1.08, power: 0.8, pass: 0.86, tackle: 0.8, dribble: 0.94, accuracy: 0.84 },
      coreWeights: { runner: 3, trickster: 1.2 }, aiStyle: { light: 0.9, hard: 0.7 },
      players: ['ZOOM', 'HONK', 'VROOM'],
      looks: [{ cut: 'helmet', face: 'shades', shoes: 'canvas', fx: 'dust', skin: 2 }, { cut: 'helmet', face: 'mask', shoes: 'reds', fx: 'dust', skin: 1 }, { cut: 'helmet', face: 'shades', shoes: 'neonkick', fx: 'smoke', skin: 3 }],
    },
    school_ghosts: {
      name: 'School Ghosts', short: 'GHO', tagline: 'NOW YOU SEE THEM', desc: 'Nobody knows which class they are in. Nobody has seen them leave.',
      kit: { shirt: '#e8ecf5', shirtDark: '#9aa3b5', shorts: '#2a2440', accent: '#9d7bff', hair: ['#1a1216', '#e8ecf5'] },
      stats: { speed: 0.96, power: 0.86, pass: 0.94, tackle: 0.86, dribble: 1.0, accuracy: 0.9 },
      coreWeights: { trickster: 3, playmaker: 1.5 }, aiStyle: { light: 0.8, hard: 0.8 },
      players: ['WHISPER', 'HALLWAY', 'ROLLCALL'],
      looks: [{ cut: 'longhair', face: 'ninja', shoes: 'socks', fx: 'shadow', skin: 4 }, { cut: 'bowl', face: 'mask', shoes: 'socks', fx: 'smoke', skin: 0 }, { cut: 'longhair', face: 'skull', shoes: 'hightop', fx: 'shadow', skin: 4 }],
    },
    block_wardens: {
      name: 'Block Wardens', short: 'BLK', tagline: 'BOSS · THIS IS OUR BLOCK', desc: 'The apartment security crew. Five cups in a row, and nobody gets past their keeper.',
      kit: { shirt: '#2a3a5a', shirtDark: '#141e30', shorts: '#2a2440', accent: '#ffd23f', hair: ['#1a1216', '#3b2415'] },
      stats: { speed: 0.92, power: 1.02, pass: 0.9, tackle: 1.04, dribble: 0.88, accuracy: 0.92 },
      coreWeights: { iron: 3, brawler: 1.5 }, aiStyle: { light: 1.4, hard: 1.3 },
      players: ['GATEKEEPER', 'PATROL', 'CAPTAIN LOCK'],
      looks: [{ cut: 'cap', face: 'shades', shoes: 'boots', fx: 'nofx', skin: 3 }, { cut: 'cap', face: 'mustache', shoes: 'boots', fx: 'nofx', skin: 1 }, { cut: 'helmet', face: 'scar', shoes: 'cleats', fx: 'coins', skin: 2 }],
    },
  },
};

// đội FOOTBALL STORY dùng chung danh sách đội của trận (không thêm vào teams.order)
Object.assign(SFC_CONFIG.teams.list, SFC_CONFIG.stories.teams);
