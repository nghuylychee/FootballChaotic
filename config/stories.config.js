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
      blurb: 'The alley gets torn down at the end of summer. This is the last Ward Cup ever.',
      narrator: { name: 'WARD LOUDSPEAKER' },
      rival: 3,
      rounds: [
        {
          // luật nhà: các chú được dẫn trước 1 bàn (score = tỉ số lúc giao bóng [đội bạn, đối thủ])
          team: 'ward_uncles', arena: 'village', elo: 30, mod: 'stools', score: [0, 1],
          before: [
            { who: 'host', text: 'Round of sixteen. The Uncles have played in this alley since before the lamp posts.' },
            { who: 'opp', text: 'I scored my first goal against that wall. Thirty years ago.' },
            { who: 'opp', text: 'So, house rules. The elders start one goal up. Last summer, last favour.' },
            { who: 'you', text: 'One goal up?! ...Fine. Just this once.' },
            { who: 'host', text: 'Their plastic stools are on the pitch. Pick one up and throw it, if you dare.' },
          ],
          after: [
            { who: 'opp', text: 'Ha. You kick like we used to. Make the alley proud, kid.' },
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
            { who: 'host', text: 'Quarter-final. The Moped Boys deliver lunch to the construction site every day.' },
            { who: 'opp', text: 'Car park, alley, who cares? The boss pays us to deliver. So we deliver.' },
            { who: 'you', text: 'Through the middle of a football match?' },
            { who: 'opp', text: 'Especially through the middle of a football match.' },
            { who: 'host', text: 'When a lane flashes, get out of it! A moped that hits a Moped Boy only makes him faster.' },
          ],
          after: [
            { who: 'opp', text: 'Okay. Okay! No more lunches for the bulldozer guys. My mum learned to ride in this alley.' },
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
            { who: 'host', text: 'Semi-final, in the old school yard. The School Ghosts... nobody knows where they came from.' },
            { who: 'opp', text: 'We played here every summer. Then summer ended, and we just... stayed.' },
            { who: 'you', text: '...Is it getting cold in here?' },
            { who: 'host', text: 'Ghosts fade away from the ball. When the school bell rings, they swap places!' },
          ],
          after: [
            { who: 'opp', text: 'One more summer. That is all we wanted. Win it for us.' },
            { who: 'host', art: 'cupRival', team: 'block_wardens', text: 'In the final: the Block Wardens. The security crew guarding the construction site.' },
            { who: 'opp', art: 'cupTalk', team: 'block_wardens', text: 'At dawn the machines come in. Play your little final. Then go home.' },
            { who: 'host', art: 'cupItem', item: 'notice', text: 'One day until the bulldozers.' },
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
            { who: 'host', text: 'THE LAST FINAL. The whole ward came out. Even the construction workers put down their tools to watch.' },
            { who: 'opp', text: 'Rules are rules. Tomorrow this alley is gone.' },
            { who: 'you', text: 'You wear the uniform. But you play like you grew up here.' },
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
        { id: 'clean_final', kind: 'cleanFinal', desc: 'Keep a clean sheet in the final' },
        { id: 'hattrick', kind: 'hattrick', desc: 'Score a hat-trick in one match' },
      ],
      intro: [
        { who: 'host', text: 'Attention, residents. This is your ward loudspeaker.' },
        { who: 'host', art: 'cupItem', item: 'notice', text: 'At the end of this summer, the old alley will be torn down. A car park is coming.' },
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'So this is it. The last Ward Cup ever. One rice pot painted gold, for the last champion.' },
        { who: 'you', text: 'Then the last champion is going to be me.' },
      ],
      outro: [
        { who: 'host', text: 'THE LAST WARD CUP HAS A CHAMPION!' },
        { who: 'host', art: 'cupItem', item: 'notice', text: 'And news just in: the Wardens quit, the whole ward signed a letter, and the car park is CANCELLED!' },
        { who: 'you', text: 'Put the pot on my head. Same time next summer?' },
      ],
    },
    /* ---------- Story 2: sân thượng, độ khó 2 (Elo 380 → 700) ---------- */
    {
      id: 'rooftop_league', name: 'ROOFTOP NIGHT LEAGUE', color: '#6ec8ff', cover: 'rooftop', theme: 'rooftop', trophy: 'cup', tier: 2,
      blurb: 'A black card with a golden owl. A secret league. Four trials before dawn.',
      narrator: { name: 'THE VOICE', art: 'cupVoice' },
      rival: 3,
      rounds: [
        {
          team: 'pigeon_gang', arena: 'rooftop', elo: 380, mod: 'pigeons',
          before: [
            { who: 'host', text: 'FIRST TRIAL: keep your footing. The Pigeon Gang guards the ledge.' },
            { who: 'opp', text: 'Coo. Coo. COO!' },
            { who: 'you', text: 'I am going to take that as a threat.' },
            { who: 'host', text: 'Watch the sky. When the flock flies over, step around the splats.' },
          ],
          after: [
            { who: 'opp', text: 'Coo...' },
            { who: 'host', text: 'First trial: passed. The roof is watching you now.' },
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
            { who: 'host', text: 'SECOND TRIAL: read the wind. The Sky Hoppers jump roof to roof just to get here.' },
            { who: 'opp', text: 'You got a card too? We got ours three years ago. We never got past the Owls.' },
            { who: 'you', text: 'Then why are you still here?' },
            { who: 'opp', text: 'Because up here, the wind is on our side. Feel that?' },
            { who: 'host', text: 'When the night wind blows, the ball drifts down the roof. The Hoppers ride it.' },
          ],
          after: [
            { who: 'opp', text: 'Go on. Get further than we did.' },
            { who: 'host', text: 'Second trial: passed. Nobody with a card has come this far in years.' },
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
            { who: 'host', text: 'THIRD TRIAL: find the way through. The Billboard Kids paint walls faster than you can run.' },
            { who: 'opp', text: 'We painted the Voice once. Just a shadow with two owl eyes. Want to see it?' },
            { who: 'you', text: 'After I win.' },
            { who: 'host', text: 'Spray walls block your way to goal. Go around them, or lift the ball over.' },
          ],
          after: [
            { who: 'opp', text: 'Fine. We will paint you on the billboard. Winning.' },
            { who: 'host', art: 'cupRival', team: 'night_owls', text: 'FINAL TRIAL. The Night Owls. They have not lost on this roof in three years.' },
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
          team: 'night_owls', arena: 'rooftop', elo: 700, signature: 'thunder_kick', mod: 'searchlight',
          before: [
            { who: 'host', text: 'Step into the light.' },
            { who: 'opp', text: 'Yes. I am the Voice. I sent you the card.' },
            { who: 'opp', text: 'I leave the city at dawn. Somebody has to keep this roof alive. Show me it is you.' },
            { who: 'you', text: 'Then watch closely.' },
            { who: 'opp', text: 'Never hold the ball in my light. And if I fall behind, a second one switches on.' },
          ],
          after: [
            { who: 'opp', text: 'Hoo... I did not see that coming. Good. Very good.' },
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
        { who: 'host', art: 'cupItem', item: 'invite', text: 'You found my card. Good.' },
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'This is the Rooftop Night League. Sixteen teams. Four trials. One golden cup, and something more.' },
        { who: 'you', text: 'Who are you?' },
        { who: 'host', art: 'cupVoice', text: 'Win, and you will see my face. Lose, and you will forget this roof exists.' },
      ],
      outro: [
        { who: 'host', text: 'The sun is coming up over the city. The roof is yours now.' },
        { who: 'opp', art: 'cupTalk', team: 'night_owls', text: 'Keep the cap. Send the next card. Choose well.' },
        { who: 'you', text: 'See you at midnight, Owl.' },
      ],
    },
    /* ---------- Story 3: chợ đêm, độ khó 3 (Elo 620 → 1150) ---------- */
    {
      id: 'market_cup', name: 'NIGHT MARKET CUP', color: '#ff3fb4', cover: 'market', theme: 'market', trophy: 'cup', tier: 3,
      blurb: 'Win four ingredients, cook one legendary bowl, and save the noodle cart.',
      narrator: { name: 'UNCLE NOODLE', horn: false, look: { skin: '#e0a878', hair: '#1a1216', cut: 'bandana', face: 'mustache', shoes: 'slides', fx: 'smoke' }, kit: { shirt: '#f3ead7', shirtDark: '#c9b48a', shorts: '#3a2a20', accent: '#e8322a', hair: ['#1a1216'] } },
      rival: 3,
      rounds: [
        {
          team: 'lantern_crew', arena: 'market', elo: 620, mod: 'lanterns',
          before: [
            { who: 'host', text: 'Ingredient one: the eternal flame! Only a Lantern Crew lantern burns hot enough for the broth.' },
            { who: 'opp', text: 'You want our flame? Earn it. And mind your head.' },
            { who: 'you', text: 'Why would I need to mind my... oh.' },
            { who: 'host', text: 'When you see a growing shadow, MOVE! Those lanterns are not hung very well.' },
          ],
          after: [
            { who: 'opp', text: 'Take the flame. Cook something worthy of it!' },
            { who: 'host', art: 'cupItem', item: 'bowl', text: 'The broth is boiling! It smells like... VICTORY!' },
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
            { who: 'host', text: 'Ingredient two: hand-pulled noodles. The Noodle Kickers pull them with their FEET.' },
            { who: 'opp', text: 'Our noodles come out of a boiling pot. So does our ball. Catch!' },
            { who: 'you', text: 'The BALL is hot?!' },
            { who: 'host', text: 'When the ball glows, pass it fast! Hold it too long and you get burned.' },
          ],
          after: [
            { who: 'opp', text: 'You pass like a real chef. Take the noodles. Take them!' },
            { who: 'host', art: 'cupItem', item: 'recipe', text: 'Flame! Noodles! We are halfway to a legend!' },
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
            { who: 'host', text: 'Ingredient three: the spice of fate. Only the Fortune Tellers know where it grows.' },
            { who: 'opp', text: 'The cards say your noodles will be... interesting. Shall I draw another?' },
            { who: 'you', text: 'Just give me the spice.' },
            { who: 'host', text: 'When a card is drawn, read the banner. You might shrink, a storm might hit, or they might speed up!' },
          ],
          after: [
            { who: 'opp', text: 'The cards never lie... but tonight they looked nervous.' },
            { who: 'host', art: 'cupItem', item: 'recipe', text: 'Flame, noodles, spice. Only the last ingredient is missing.' },
            { who: 'you', text: 'What is the last ingredient?' },
            { who: 'host', text: 'Nobody knows. The recipe just says: the taste of a hard-won final.' },
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
            { who: 'host', text: 'THE FINAL! The Market Mamas taste every bowl in this market. Win, and they taste ours!' },
            { who: 'opp', text: 'Sweetie, nobody cooks in OUR market without our say. Watch the stalls.' },
            { who: 'you', text: 'You cannot roll a stall onto a football pitch!' },
            { who: 'opp', text: 'Watch me.' },
            { who: 'host', text: 'The stalls push in from the sides and squeeze the pitch! If the Mamas fall behind, two come in at once!' },
          ],
          after: [
            { who: 'opp', text: 'Hmph. Fine. Bring me the bowl.' },
            { who: 'opp', art: 'cupItem', item: 'bowl', text: "...This taste. It is my mother's cooking. It is the market when I was a girl!" },
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
        { who: 'host', art: 'cupHost', text: 'Kid! Bad news. The Market Mamas want my noodle cart out of the market. Tonight!' },
        { who: 'opp', art: 'cupTalk', team: 'market_mamas', text: 'Your noodles are bland, old man. The market deserves better.' },
        { who: 'host', art: 'cupItem', item: 'recipe', text: 'Unless... we cook the Midnight Noodle. The legendary recipe. Four ingredients, four teams.' },
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'Win the Night Market Cup, collect them all, and serve the bowl to the Mamas in the final!' },
        { who: 'you', text: 'I came here to play football. Now I am a chef?' },
      ],
      outro: [
        { who: 'host', text: 'The Midnight Noodle is back, and the cart stays!' },
        { who: 'you', text: 'So I get free noodles for a year, right?' },
        { who: 'host', text: 'For a WEEK. Do not push it, kid.' },
      ],
    },
    /* ---------- Story 4: sân vận động, độ khó 4 (Elo 1450 → 2700) ---------- */
    {
      id: 'legends_cup', name: "GRANDPA'S LEGENDS", color: '#ffd23f', cover: 'stadium', theme: 'stadium', trophy: 'cup', tier: 4,
      blurb: 'Fifty years ago, Grandpa never finished his final. You will.',
      narrator: { name: 'GRANDPA', horn: false, look: { skin: '#d99a6c', hair: '#e8ecf5', cut: 'buzz', face: 'beard', shoes: 'slides', fx: 'nofx' }, kit: { shirt: '#8a5a30', shirtDark: '#5a3a1a', shorts: '#3a3a44', accent: '#f3ead7', hair: ['#e8ecf5'] }, youngLook: { skin: '#d99a6c', hair: '#1a1216', cut: 'bowl', face: 'blush', shoes: 'socks', fx: 'nofx' }, youngKit: { shirt: '#c9781a', shirtDark: '#7a4510', shorts: '#f3ead7', accent: '#f3ead7', hair: ['#1a1216'] } },
      rival: 3,
      rounds: [
        {
          team: 'rust_buckets', arena: 'harbor', elo: 1450, mod: 'tide',
          before: [
            { who: 'host', text: 'The Rust Buckets. Sailors. After my injury, they carried me home on their boat.' },
            { who: 'opp', text: 'Those boots... we know those boots. The tide always brings old things back.' },
            { who: 'you', text: 'Then let it bring me a win.' },
            { who: 'host', text: 'When the tide rolls in, stay out of the water. It slows you down, but not the sailors!' },
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
            { who: 'host', text: 'The Retired Refs. One of them refereed my final.' },
            { who: 'opp', text: 'Forty years of whistles. On this pitch, we are the rules.' },
            { who: 'you', text: 'Were you the referee fifty years ago?' },
            { who: 'opp', text: '...Play first. Talk after.' },
            { who: 'host', text: 'Hit a Ref and you get a card. Two cards and you sit out! The Refs, of course, do whatever they want.' },
          ],
          after: [
            { who: 'opp', text: 'It was me. I saw that tackle, and I never blew the whistle. Fifty years I have regretted it.' },
            { who: 'host', art: 'cupMemory', team: 'the_legends', young: true, text: 'The tackle came from their captain. The best player I ever faced.' },
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
            { who: 'host', text: 'My old squad. I quit on them after that day. They never forgave me.' },
            { who: 'opp', text: 'Those are his boots. He walked away from us. Why should you get to wear them?' },
            { who: 'you', text: 'Because he never stopped talking about you. Every single day.' },
            { who: 'opp', text: '...Ha! Then show us what he taught you. Back in my day...' },
            { who: 'host', text: 'When the old stories start, everything slows down for you. Not for them!' },
          ],
          after: [
            { who: 'opp', text: 'You play just like him. Tell him... tell him to come and watch the final.' },
            { who: 'host', art: 'cupRival', team: 'the_legends', text: 'And in the final... The Legends. With the same captain.' },
            { who: 'opp', art: 'cupTalk', team: 'the_legends', text: 'Fifty years I have waited for that match to end properly. Bring the boots.' },
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
            { who: 'host', art: 'cupMemory', team: 'the_legends', young: true, text: 'Fifty years ago, it was him and me. Today, it is you.' },
            { who: 'opp', text: 'I never wanted to hurt your grandpa. I wanted to beat him. One of us is always the star.' },
            { who: 'you', text: 'Stars can be stolen.' },
            { who: 'host', text: 'Steal the ball from the golden star, and the golden boot is yours!' },
          ],
          after: [
            { who: 'opp', text: 'The match is finally over. Your grandpa... he is in the stands. Look.' },
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
        { who: 'host', art: 'cupHost', text: 'Sit down, kid. I never told you why I stopped playing.' },
        { who: 'host', art: 'cupMemory', young: true, text: 'Fifty years ago, my squad made it to the final of the Legends Cup.' },
        { who: 'host', art: 'cupMemory', young: true, fall: true, text: 'Then, one tackle. My knee. I never played again.' },
        { who: 'host', art: 'cupItem', item: 'boots', text: 'These are my old boots. The Legends Cup is back this year. Finish it for me.' },
        { who: 'you', text: 'I will, Grandpa.' },
      ],
      outro: [
        { who: 'host', text: 'Fifty years. My match is finally over. And we won.' },
        { who: 'you', text: 'Grandpa! You came!' },
        { who: 'host', text: 'Of course I came. Now give me back my boots.' },
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
