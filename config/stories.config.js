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
 *     [{ who, text, art?, team?, zoom?, dur? }] — who: 'you' (character của bạn) · 'opp' (đội trưởng đội đối thủ vòng đó) · 'host' (bình luận viên)
 *     art mặc định theo chỗ + người nói: intro (host cupAlley · you / opp cupTalk) · before (host cupHost · you / opp cupTalk, tự chèn cảnh VS cupFace
 *     trước câu đầu tiên của 2 đội) · after (opp cupSad · host cupHost · you cupTalk) · outro (cupLift, tự chèn chữ CHAMPIONS).
 *     art / team / zoom ghi riêng để đổi cảnh (vd. cupRival + team = đội kình địch). dur: giây (mặc định theo độ dài câu)
 *   fillers: đội lấp các nhánh khác của bracket (11 đội, đá giả lập ra tỉ số) · rival: vòng có đội kình địch (luôn thắng đậm ở nhánh bên kia)
 *   stars: thử thách phụ, mỗi Story 3 sao, giữ vĩnh viễn, mỗi sao chỉ cần đạt 1 lần. kind:
 *     champ (vô địch) · cleanFinal (chung kết không thủng lưới) · hattrick (bạn ghi 3 bàn trong 1 trận) · bigWin (thắng chung kết cách 3 bàn) ·
 *     noGolden (vô địch không trận nào phải đá bàn thắng vàng) · goals (vô địch, đội ghi đủ n bàn cả cup) · sweep (vô địch, trận nào cũng thắng cách 2 bàn)
 *     · modClean (vô địch, luật trận chung kết không trúng đội bạn lần nào)
 *   theme: nền cut scene (alley · rooftop · market · stadium, src/ui/story-cup.js) · trophy: pot (nồi cơm vàng) · cup (cúp vàng)
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
    // Ghế trên sân vẫn chặn người cầm bóng, bóng thấp (z < h) dội ra; sút mạnh (>= breakSpeed) vỡ ghế
    stools: {
      name: 'PLASTIC STOOLS', hint: 'Walk into a stool to pick it up, attack to throw it',
      n: 5, r: 7, h: 14, gap: 70, pickPad: 3, breakSpeed: 250, respawn: 5,
      throwSpeed: 330, throwRange: 210, stun: 1.0, knock: 200, aiHold: 1.2, aiSeek: 130, aiGap: 8, color: '#ff3d3d',
    },
    // Moped Boys: làn giao hàng chạy dọc sân (gần bóng) nhấp nháy warn giây rồi xe máy phóng qua. Đội bạn trúng: văng + choáng + rơi bóng
    // (lướt né được). Moped Boys trúng: được "quá giang" — chạy nhanh x boost trong boostT giây. Họ bị dẫn: xe ra dày hơn (trailing)
    mopeds: {
      name: 'DELIVERY LANE', hint: 'Get out of the flashing lane',
      first: 4, every: [6, 9], trailing: 1.6, warn: 1.3, speed: 460, r: 11, stun: 0.8, knock: 240, ballKick: 260,
      boost: 1.35, boostT: 2.5, color: '#ffd23f',
    },
    // School Ghosts: ma ở xa bóng mờ dần (vẫn thấy bóng hình, không vô hình — docs/CORE_DESIGN.md), cầm bóng / gần bóng thì hiện rõ.
    // Chuông trường reo mỗi bell giây: 2 con ma (không cầm bóng) đổi chỗ cho nhau. Họ bị dẫn: chuông reo dày hơn (trailing)
    ghosts: {
      name: 'NOW YOU SEE THEM', hint: 'Ghosts fade away from the ball and swap when the bell rings',
      near: 60, fade: 50, alpha: 0.14, first: 6, bell: [9, 13], trailing: 1.5,
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
    // Night Owls: đèn pha quét sân (đường Lissajous). Đội bạn cầm bóng trong đèn catchT giây -> FREEZE: choáng + rơi bóng, đèn dừng pause giây.
    // Lướt né được. Wardens bị dẫn: bật thêm 1 đèn (LOCKDOWN)
    searchlight: {
      name: 'SEARCHLIGHT', hint: 'Never hold the ball in the light',
      r: 34, speedX: 0.42, speedY: 0.67, marginX: 70, marginY: 40, catchT: 0.6, stun: 1.0, pause: 1.6, color: '#fff3b0',
      lockdown: 'LOCKDOWN', lockdownHint: 'A second light switches on',
    },
  },

  list: [
    {
      id: 'ward_cup', name: 'THE WARD CUP', color: '#ff9a3d', cover: 'alley', theme: 'alley', trophy: 'pot', tier: 1,
      blurb: 'Win the neighbourhood cup and take the alley pitch back from the Block Wardens.',
      rival: 3,
      rounds: [
        {
          // luật nhà: các chú được dẫn trước 1 bàn (score = tỉ số lúc giao bóng [đội bạn, đối thủ])
          team: 'ward_uncles', arena: 'village', elo: 30, mod: 'stools', score: [0, 1],
          before: [
            { who: 'host', text: 'Round of sixteen! The Uncles have played this pitch for thirty years. They brought their own chairs.' },
            { who: 'opp', text: 'House rules, kid. The elders start one goal up.' },
            { who: 'you', text: 'One goal up?! That is not a rule!' },
            { who: 'opp', text: 'It is now. And nobody touches the stools.' },
            { who: 'host', text: 'The stools stay on the pitch. Bounce your passes off them, or smash them with a hard shot!' },
          ],
          after: [
            { who: 'opp', text: 'My stool... my beautiful stool. Fine. Go beat those Wardens for us.' },
            { who: 'host', art: 'cupRival', team: 'block_wardens', text: 'On the other side of the bracket, the Block Wardens won seven to nothing. They did not even sweat.' },
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
            { who: 'host', text: 'Quarter-final! The Moped Boys deliver noodles down this street all night, and they are not stopping for a match.' },
            { who: 'opp', text: 'Deliveries do not wait. Stand in the lane and you get run over.' },
            { who: 'you', text: 'You are going to ride THROUGH the match?' },
            { who: 'opp', text: 'Every few seconds. Hot noodles, cold hearts.' },
            { who: 'host', text: 'When a lane flashes, get out of it! A moped that hits a Moped Boy only makes him faster.' },
          ],
          after: [
            { who: 'opp', text: 'You dodged every delivery... Ever thought about a job in noodles?' },
            { who: 'you', text: 'Ask me after the final.' },
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
            { who: 'host', text: 'Semi-final, in the old school yard! Nobody knows who the School Ghosts are. Nobody has seen them leave.' },
            { who: 'opp', text: 'You cannot mark what you cannot see.' },
            { who: 'you', text: '...Is it getting cold in here?' },
            { who: 'host', text: 'Ghosts fade away when they are far from the ball. And when the school bell rings, they swap places!' },
          ],
          after: [
            { who: 'opp', text: 'You saw us. Nobody sees us...' },
            { who: 'you', text: 'Then come to class more often.' },
            { who: 'host', art: 'cupRival', team: 'block_wardens', text: 'And the Block Wardens are in the final. Again. Nobody has scored on them all cup.' },
            { who: 'opp', art: 'cupTalk', team: 'block_wardens', text: 'Enjoy the semi-final, kid. That is as far as you go.' },
            { who: 'you', text: '...Nobody has scored on them. Not once.' },
          ],
          barks: {
            kickoff: ['Booo...', 'Roll call!'],
            goal: ['Spooky!', 'Did you see that? No.'],
            conceded: ['Impossible!', 'You saw me?!'],
            mod: ['RING RING!', 'Change classes!'],
          },
        },
        {
          team: 'block_wardens', arena: 'alley', elo: 240, signature: 'giant_keeper', mod: 'giants',
          before: [
            { who: 'host', text: 'THE FINAL! The Block Wardens, five-time champions. And tonight the whole ward came to watch.' },
            { who: 'host', text: 'The Uncles, the Moped Boys, even the Ghosts. They are all chanting one name. Yours.' },
            { who: 'opp', text: 'Look at you. Tiny. We eat kids like you for breakfast.' },
            { who: 'you', text: 'Wait... were you always this BIG?!' },
            { who: 'host', text: 'Light punches just bounce off the Wardens. Hit them with heavy attacks! And if they fall behind, they get angry. And bigger.' },
          ],
          after: [
            { who: 'opp', text: 'Six years... it was supposed to be six years.' },
          ],
          barks: {
            kickoff: ['This is our block!', 'Stomp them!'],
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
        { id: 'clean_final', kind: 'cleanFinal', desc: 'Keep a clean sheet in the final' },
        { id: 'hattrick', kind: 'hattrick', desc: 'Score a hat-trick in one match' },
      ],
      intro: [
        { who: 'host', text: 'Every summer the whole ward squeezes into one alley for the Ward Cup.' },
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'The prize: a dented rice pot painted gold. And the alley pitch, for a whole year.' },
        { who: 'host', art: 'cupRival', team: 'block_wardens', text: 'Five years in a row, the Block Wardens have won it. Five years with no kids allowed on the pitch.' },
        { who: 'opp', art: 'cupTalk', team: 'block_wardens', text: 'Kids? On OUR pitch? Go play in the car park.' },
        { who: 'you', text: 'Four wins and that pitch is ours. Let us go.' },
      ],
      outro: [
        { who: 'host', text: 'UNBELIEVABLE! A new champion of the Ward Cup!' },
        { who: 'host', text: 'The alley pitch is open again, and the kids are already running onto it!' },
        { who: 'you', text: 'Put the pot on my head. The pitch belongs to everyone now.' },
      ],
    },
    /* ---------- Story 2: sân thượng, độ khó 2 (Elo 380 → 700) ---------- */
    {
      id: 'rooftop_league', name: 'ROOFTOP NIGHT LEAGUE', color: '#6ec8ff', cover: 'rooftop', theme: 'rooftop', trophy: 'cup', tier: 2,
      blurb: 'Football above the city, under the eyes of the Night Owls.',
      rival: 3,
      rounds: [
        {
          team: 'pigeon_gang', arena: 'rooftop', elo: 380, mod: 'pigeons',
          before: [
            { who: 'host', text: 'Round of sixteen! The Pigeon Gang has owned this ledge forever, and their friends are circling overhead.' },
            { who: 'opp', text: 'Coo. Coo. COO!' },
            { who: 'you', text: 'Is that... a threat?' },
            { who: 'host', text: 'Watch the sky! When the flock flies over, dodge the splats or you will slip.' },
          ],
          after: [
            { who: 'opp', text: 'Coo...' },
            { who: 'host', text: 'Meanwhile, the Night Owls won without anyone seeing a single goal. Literally. The lights were off.', art: 'cupRival', team: 'night_owls' },
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
            { who: 'host', text: 'Quarter-final! The Sky Hoppers jump roof to roof just to get to practice.' },
            { who: 'opp', text: 'Up here the wind is our fourth player. And it is on our side.' },
            { who: 'you', text: 'You cannot pass to the wind.' },
            { who: 'opp', text: 'No. But it can pass to us. Feel that?' },
            { who: 'host', text: 'When the night wind blows, the ball drifts down the roof. The Hoppers ride it!' },
          ],
          after: [
            { who: 'opp', text: 'You played against the wind... and won?' },
            { who: 'you', text: 'I just kicked harder.' },
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
            { who: 'host', text: 'Semi-final, under the giant billboard! The Billboard Kids paint the whole city every night.' },
            { who: 'opp', text: 'Every path to our goal? Painted shut. Smile for the wall.' },
            { who: 'you', text: 'You painted a wall in the middle of a football pitch?' },
            { who: 'opp', text: 'Art has no rules.' },
            { who: 'host', text: 'Spray walls pop up between you and the goal! Go around them, or lift the ball over.' },
          ],
          after: [
            { who: 'opp', text: 'Fine. We will paint you winning. Just this once.' },
            { who: 'host', text: 'And the Night Owls are in the final. Again. Their captain has not blinked all night.', art: 'cupRival', team: 'night_owls' },
            { who: 'opp', text: 'We watched every pass you made. We know what you will do next.', art: 'cupTalk', team: 'night_owls' },
            { who: 'you', text: 'Funny. I do not even know that.' },
          ],
          barks: {
            kickoff: ['Smile!', 'Fresh paint!'],
            goal: ['Masterpiece!', 'Sign it!'],
            conceded: ['Smudged it!', 'Not my style!'],
            mod: ['Wet paint!', 'Tag!'],
          },
        },
        {
          team: 'night_owls', arena: 'rooftop', elo: 700, signature: 'thunder_kick', mod: 'searchlight',
          before: [
            { who: 'host', text: 'THE FINAL! Midnight on the highest roof in the city. The Night Owls switch on their searchlight.' },
            { who: 'host', text: 'The Pigeon Gang, the Hoppers, the Billboard Kids... the whole league climbed up to watch.' },
            { who: 'opp', text: 'In our light, nothing moves without us knowing. Hold the ball and you FREEZE.' },
            { who: 'you', text: 'Then I will not hold it. I will pass it.' },
            { who: 'host', text: 'Never hold the ball in the light! And if the Owls fall behind, a second light switches on.' },
          ],
          after: [
            { who: 'opp', text: 'Hoo... I did not see that coming.' },
          ],
          barks: {
            kickoff: ['We see you.', 'Lights on!'],
            goal: ['Saw it coming!', 'Hoo hoo!'],
            conceded: ['Who? WHO?!', 'Did not see that!'],
            mod: ['FREEZE!', 'Gotcha!'],
          },
        },
      ],
      fillers: ['alley_cats', 'trash_pandas', 'hall_monitors', 'detention_club', 'noodle_kickers', 'lantern_crew', 'crane_crushers',
        'rust_buckets', 'metro_express', 'downtown_stars', 'chain_gang'],
      reward: { gold: [40, 60, 90, 180], item: 'moon_cap' },
      stars: [
        { id: 'champ', kind: 'champ', desc: 'Win the cup' },
        { id: 'big_final', kind: 'bigWin', desc: 'Win the final by 3 goals or more' },
        { id: 'hattrick', kind: 'hattrick', desc: 'Score a hat-trick in one match' },
      ],
      intro: [
        { who: 'host', text: 'When the city goes to sleep, the Rooftop Night League wakes up.' },
        { who: 'host', text: 'Sixteen teams. One golden cup. And a very long way down.', art: 'cupAlley', zoom: 1 },
        { who: 'host', text: 'The Night Owls have not lost up here in three years. They play every match in the dark.', art: 'cupRival', team: 'night_owls' },
        { who: 'opp', text: 'We saw you climb the stairs, kid. We see everything.', art: 'cupTalk', team: 'night_owls' },
        { who: 'you', text: 'Then you saw me coming. Good.' },
      ],
      outro: [
        { who: 'host', text: 'A NEW KING OF THE ROOFTOPS! The whole city will hear about this in the morning!' },
        { who: 'host', text: 'And for the first time in three years, the Night Owls blinked.' },
        { who: 'you', text: 'Let them sleep. I will tell them tomorrow.' },
      ],
    },
    /* ---------- Story 3: chợ đêm, độ khó 3 (Elo 620 → 1150) ---------- */
    {
      id: 'market_cup', name: 'NIGHT MARKET CUP', color: '#ff3fb4', cover: 'market', theme: 'market', trophy: 'cup', tier: 3,
      blurb: 'Neon, noodles, and the Market Mamas who never lose.',
      rival: 3,
      rounds: [
        {
          team: 'lantern_crew', arena: 'market', elo: 620, mod: 'lanterns',
          before: [
            { who: 'host', text: 'Round of sixteen! The Lantern Crew hung every lantern in this market. Not all of them very well.' },
            { who: 'opp', text: 'Our lanterns are perfectly safe. Mostly.' },
            { who: 'you', text: 'One just fell on your own head.' },
            { who: 'opp', text: '...Mostly.' },
            { who: 'host', text: 'Watch for a growing shadow on the pitch. A lantern is coming down!' },
          ],
          after: [
            { who: 'opp', text: 'We will hang them better next year. Probably.' },
            { who: 'host', text: 'On the other side, the Market Mamas haggled their opponents down to zero. Again.', art: 'cupRival', team: 'market_mamas' },
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
            { who: 'host', text: 'Quarter-final! The Noodle Kickers cook all night and play with a ball straight out of the pot.' },
            { who: 'opp', text: 'Our hands are used to boiling water. Are yours?' },
            { who: 'you', text: 'Wait, the BALL is hot?' },
            { who: 'host', text: 'When the ball glows, pass it fast! Hold a hot ball too long and you get burned.' },
          ],
          after: [
            { who: 'opp', text: 'You passed like a real chef. Fast hands. Respect.' },
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
            { who: 'host', text: 'Semi-final! The Fortune Tellers say they already know the final score.' },
            { who: 'opp', text: 'The cards say you lose. Shall I draw another?' },
            { who: 'you', text: 'Draw as many as you like.' },
            { who: 'opp', text: 'Careful what you wish for. Every card changes the match.' },
            { who: 'host', text: 'When a card is drawn, read the banner. You might shrink, a storm might hit, or the Tellers might speed up!' },
          ],
          after: [
            { who: 'opp', text: 'Impossible... the cards lied to me!' },
            { who: 'host', text: 'And the Mamas are in the final. They already cleared a spot for the trophy on their noodle stall.', art: 'cupRival', team: 'market_mamas' },
            { who: 'opp', text: 'You played well, sweetie. Now go home before you get hurt.', art: 'cupTalk', team: 'market_mamas' },
            { who: 'you', text: 'She is scary. And she smells like dumplings.' },
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
            { who: 'host', text: 'THE FINAL! The Market Mamas, champions of every Night Market Cup. Tonight the whole market stayed open to watch.' },
            { who: 'host', text: 'The Lantern Crew, the Noodle Kickers, even the Fortune Tellers. They are all cheering for you.' },
            { who: 'opp', text: 'This is our market. Our stalls go wherever we want. Even onto the pitch.' },
            { who: 'you', text: 'You cannot just roll a stall into a football match!' },
            { who: 'opp', text: 'Watch me, sweetie.' },
            { who: 'host', text: 'The stalls push in from the sides and squeeze the pitch! If the Mamas fall behind, two come in at once.' },
          ],
          after: [
            { who: 'opp', text: 'Hmph. Fine, take the cup. And take some dumplings, you look thin.' },
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
        { id: 'no_golden', kind: 'noGolden', desc: 'Win the cup without a golden goal' },
        { id: 'goals', kind: 'goals', n: 12, desc: 'Win the cup with 12 goals or more' },
      ],
      intro: [
        { who: 'host', text: 'Every night after ten, the market turns into a football pitch.' },
        { who: 'host', text: 'The prize: a golden cup and free noodles for a whole year.', art: 'cupAlley', zoom: 1 },
        { who: 'host', text: 'And every single year, the Market Mamas take both. Nobody argues with the Mamas.', art: 'cupRival', team: 'market_mamas' },
        { who: 'opp', text: 'Sweetie, you look hungry. Lose early and I will give you a free bowl.', art: 'cupTalk', team: 'market_mamas' },
        { who: 'you', text: 'One bowl, or noodles for a year. I can do maths.' },
      ],
      outro: [
        { who: 'host', text: 'THE NIGHT MARKET HAS A NEW CHAMPION! Free noodles for everyone!' },
        { who: 'you', text: 'Everyone? Wait, those were MY noodles!' },
      ],
    },
    /* ---------- Story 4: sân vận động, độ khó 4 (Elo 1450 → 2700) ---------- */
    {
      id: 'legends_cup', name: "GRANDPA'S LEGENDS", color: '#ffd23f', cover: 'stadium', theme: 'stadium', trophy: 'cup', tier: 4,
      blurb: 'The old greats are back for one last tournament.',
      rival: 3,
      rounds: [
        {
          team: 'rust_buckets', arena: 'harbor', elo: 1450, mod: 'tide',
          before: [
            { who: 'host', text: "Welcome to Grandpa's Legends! First up: the Rust Buckets. Forty years at sea, and the tide is coming in." },
            { who: 'opp', text: 'The sea always comes back, kid. And it is on our side.' },
            { who: 'you', text: 'Can you even play football in water?' },
            { who: 'opp', text: 'We have done it all our lives.' },
            { who: 'host', text: 'When the tide rolls in, stay out of the water. It slows you down, but not the sailors!' },
          ],
          after: [
            { who: 'opp', text: 'Heh. The tide has turned. Go on, sail.' },
            { who: 'host', text: 'On the other side, The Legends won by six. They were not even trying.', art: 'cupRival', team: 'the_legends' },
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
            { who: 'host', text: 'Quarter-final! The Retired Refs spent their lives watching football. Now they finally get to play.' },
            { who: 'opp', text: 'Forty years of whistles. Touch one of us and that is a card.' },
            { who: 'you', text: 'Street football has no rules. Remember?' },
            { who: 'opp', text: 'Not today. Today, WE are the rules.' },
            { who: 'host', text: 'Hit a Ref and you get a card. Two cards and you sit out! The Refs, of course, do whatever they want.' },
          ],
          after: [
            { who: 'opp', text: 'No card for that? ...No card for that.' },
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
            { who: 'host', text: "Semi-final! Grandpa's old squad won this cup fifty years ago, with a ball made of rags." },
            { who: 'opp', text: 'Your grandpa was our captain, kid. He never stops talking about you.' },
            { who: 'you', text: 'He never stops talking about you either. Mostly your knees.' },
            { who: 'opp', text: 'Ha! Back in my day...' },
            { who: 'host', text: 'When the old stories start, everything slows down for you. Not for them!' },
          ],
          after: [
            { who: 'opp', text: 'He was right about you. Do not tell him we said that.' },
            { who: 'host', text: 'And waiting in the final... The Legends. Not a single goal against them all cup.', art: 'cupRival', team: 'the_legends' },
            { who: 'opp', text: 'Your grandpa needed a miracle to beat us. Do you have one?', art: 'cupTalk', team: 'the_legends' },
            { who: 'you', text: 'I have something better. I have his stories.' },
          ],
          barks: {
            kickoff: ['Back in my day!', 'Mind the knees!'],
            goal: ['Still got it!', 'Class of 76!'],
            conceded: ['My hip!', 'Kids today...'],
            mod: ['Back in my day...', 'Let me tell you...'],
          },
        },
        {
          team: 'the_legends', arena: 'stadium', elo: 2700, signature: 'black_hole', mod: 'golden',
          before: [
            { who: 'host', text: 'THE FINAL! The Legends have never lost. Not once. Not ever.' },
            { who: 'host', text: 'The sailors, the Refs, Grandpa and his squad. The whole stadium is on its feet.' },
            { who: 'opp', text: 'One of us is always the star. Try to keep up with a legend.' },
            { who: 'you', text: 'Stars can be stolen.' },
            { who: 'host', text: 'Steal the ball from the golden star and the golden boot is yours!' },
          ],
          after: [
            { who: 'opp', text: 'The street game is in good hands now.' },
          ],
          barks: {
            kickoff: ['Legends never die!', 'Showtime!'],
            goal: ['Legendary!', 'Hall of fame!'],
            conceded: ['A new legend?', 'Impossible!'],
            mod: ['Star power!', 'Shine!'],
          },
        },
      ],
      fillers: ['crane_crushers', 'iron_knuckles', 'chain_gang', 'metro_express', 'downtown_stars', 'glitch_squad', 'chrome_wolves',
        'golden_eagles', 'royal_lions', 'noodle_kickers', 'lantern_crew'],
      reward: { gold: [70, 100, 150, 320], item: 'laurel' },
      stars: [
        { id: 'champ', kind: 'champ', desc: 'Win the cup' },
        { id: 'clean_final', kind: 'cleanFinal', desc: 'Keep a clean sheet in the final' },
        { id: 'sweep', kind: 'sweep', desc: 'Win every match by 2 goals or more' },
      ],
      intro: [
        { who: 'host', text: 'Once every fifty years, the old greats come back for one last tournament.' },
        { who: 'host', text: 'The golden cup of the Legends. Your grandpa lifted it once.', art: 'cupAlley', zoom: 1 },
        { who: 'host', text: 'Waiting at the end: The Legends. Every great who ever played the street game, on one team.', art: 'cupRival', team: 'the_legends' },
        { who: 'opp', text: 'Your grandpa beat us once, kid. It will not happen twice.', art: 'cupTalk', team: 'the_legends' },
        { who: 'you', text: 'Now it is my turn.' },
      ],
      outro: [
        { who: 'host', text: 'A NEW LEGEND OF STREET FOOTBALL IS BORN!' },
        { who: 'you', text: 'Grandpa... I did it. I am the GOAT.' },
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
