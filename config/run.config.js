/* =========================================================
 * RUN CONFIG — GOAT PATH (docs/RUN_DESIGN.md): run 3 act kiểu Slay the Spire. Logic: src/meta/run.js (SFC.Run), màn: src/ui/runmap.js.
 *
 * Mỗi act 1 map nhiều nhánh: floors tầng thường (tầng 0 luôn Matchday, tầng cuối luôn Locker Room) + 1 tầng boss.
 * Thua 1 trận (Matchday / Elite / Boss) = hết run (user chốt 2026-10-25). Core vẫn bốc lại mỗi trận như trận thường.
 * Đối thủ Matchday / boss = các đội FOOTBALL STORY cũ: sân, Core đặc trưng, luật trận, câu nói trong trận lấy từ stories.list[].rounds theo id đội
 * (SFC.Run.opp). Đối thủ Elite = đội riêng ở config/elites.config.js (run.elites). Elo AI tính theo act + tầng, không theo đội.
 * GIAI ĐOẠN 1: Skill game / Shop / Locker Room / ??? chưa có nội dung (vào là đi tiếp). BADGE + tiền trong run ở giai đoạn 2.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.run = {
  // sinh map (Run.genAct): lưới cols cột x floors tầng, vẽ paths đường đi từ dưới lên (không cắt nhau), node = hợp các ô đường đi qua
  map: {
    floors: 7,              // tầng thường mỗi act (chưa tính tầng boss)
    cols: 5,
    paths: 4,
    minMatches: 2,          // mỗi đường đi có ít nhất ngần này trận (Matchday / Elite) trước boss
    maxMatches: 4,          // và nhiều nhất ngần này (không vượt số đội của act -> không gặp lại 1 đội)
    tries: 300,             // số lần sinh lại khi map phạm luật (act ít đội cần nhiều lần)
    first: 'match',         // tầng 0
    last: 'rest',           // tầng cuối trước boss
    // trọng số loại node ở các tầng giữa · minFloor: tầng sớm nhất (tính từ 0) · noRepeat: không đứng liền nhau trên 1 đường
    // legend: LEGEND TRIAL (config/legends.config.js) — node hiện sẵn LEGEND đang chờ (chân dung), thắng bài thử thách là chiêu mộ được
    weights: { match: 40, event: 20, skill: 13, shop: 10, elite: 8, legend: 9, rest: 5 },
    minFloor: { elite: 2, rest: 2, legend: 1 },
    noRepeat: ['shop', 'rest', 'elite', 'legend'],
  },

  eliteElo: 150,            // Elite: Elo AI cao hơn Matchday cùng tầng

  // loại node: tên + icon pixel (render/pixelicons.js ui-*) + màu. play: true = vào trận
  nodes: {
    match: { name: 'MATCHDAY',    icon: 'ball',    color: '#e8ecf5', play: true },
    elite: { name: 'ELITE',       icon: 'fist',    color: '#ff3d5a', play: true },
    skill: { name: 'SKILL GAME',  icon: 'cone',    color: '#6bff4f' },
    shop:  { name: 'SHOP',        icon: 'shop',    color: '#ffd23f' },
    rest:  { name: 'LOCKER ROOM', icon: 'locker',  color: '#3ff6ff' },
    event: { name: '???',         icon: 'unknown', color: '#c7ccd6' },
    legend: { name: 'LEGEND TRIAL', icon: 'star',   color: '#ffb02e' },
    boss:  { name: 'BOSS',        icon: 'crown',   color: '#ffb02e', play: true },
  },

  /* ---------- tiền trong run ($, tiêu ở Shop; hết run là mất) + quy đổi gold meta lúc hết run ---------- */
  cash: {
    start: 50,
    win: { match: [26, 36], elite: [45, 55], boss: [85, 100] },   // [ít nhất, nhiều nhất] (Skill game: tierReward)
  },
  // hết run (thua / bỏ / vô địch): gold meta = tầng đã qua x perFloor + boss đã hạ x perBoss (+ champion nếu vô địch)
  meta: { perFloor: 6, perBoss: 60, champion: 250 },
  // CORE ROAD theo run (giai đoạn 5, user chốt 2026-10-25: mở Core theo tiến trình run, Ranked thôi mở Core): hết run cộng
  // perFloor x tầng đã qua + perBoss x boss đã hạ vào Profile.data.runs.road; Core mở khi road >= mốc Elo của nấc CORE ROAD cũ
  // (mainpath.config.js areas[].road, MainPath.roadAt). fromRuns: false = quay lại mở theo Elo Ranked
  coreRoad: { fromRuns: true, perFloor: 15, perBoss: 60 },

  /* ---------- ĐỘI HÌNH (user 2026-10-26): character + 2 đồng đội chọn lúc START RUN, giữ nguyên cả run ----------
   * Chỉ số trong run KHÔNG lấy từ ngoài run, và KHÔNG đổi theo ô được xếp (user 2026-10-29: xếp ai vào vị trí nào cũng giữ đúng chỉ số
   * của người đó): nền theo VỊ TRÍ SỞ TRƯỜNG của chính người đó (base[pos], trung bình ~70 = hệ số ~0.88; pos của đồng đội = vị trí
   * khớp nhất với chỉ số riêng của họ, Run.natural) + nghiêng theo chỉ số riêng (lean x (rating - OVR), kẹp ±leanMax) + chút theo OVR
   * (ovrLean x (OVR - ovrRef), kẹp ±ovrMax: đồng đội scout giỏi nhỉnh hơn) + LEGEND của người đó (legends.list[].stats) + chấn thương.
   * you: nền của character (toàn diện, không theo vị trí). (2026-10-28: BADGE không còn cộng chỉ số, BADGE là của cả đội.)
   * picks: số ứng viên ở màn chọn (đội hình trong roster trước, thiếu thì cầu thủ đường phố ngẫu nhiên cùng trình act 1). */
  squad: {
    base: {
      FWD: { pace: 76, shooting: 80, passing: 68, dribble: 72, fight: 64, keeper: 60 },
      MID: { pace: 70, shooting: 66, passing: 80, dribble: 76, fight: 66, keeper: 62 },
      DEF: { pace: 66, shooting: 62, passing: 68, dribble: 64, fight: 80, keeper: 80 },
    },
    you: { pace: 71, shooting: 70, passing: 72, dribble: 71, fight: 70, keeper: 67 },
    lean: 0.7, leanMax: 8,
    ovrRef: 66, ovrLean: 0.2, ovrMax: 4,
    min: 30,                // chỉ số thấp nhất (chấn thương chồng lên nhau)
    picks: 6,
  },

  /* ---------- BADGE (docs/RUN_DESIGN.md, làm lại 2026-10-28): đồ bóng đá thật, buff CẢ ĐỘI trong run, không trùng ----------
   * Luật làn (user 2026-10-28): BADGE không bao giờ tạo hiệu ứng đánh / sút / chuyền (đó là Core) và không cộng chỉ số thuần (đã bỏ):
   * chỉ bẻ cách Core ra, luật trận của đội, và map / tiền / phòng của run. Chơi co-op: thưởng chọn 1 trong 3 = bỏ phiếu.
   *   Bốc Core: school + power (Core hệ đó mạnh hơn: cộng rating khi tính CoreScale) + bias (ra thường hơn) · draftCards: thêm lá mỗi
   *     lượt chọn · rerolls: thêm lượt đổi bài mỗi lượt chọn · draftBonus: thêm lượt chọn Core trước giao bóng (chỉ đội bạn)
   *   Trận: score: tỉ số khởi đầu [bạn, đối thủ] · ultGain: nạp Tuyệt kỹ x · varCheck: { n bàn thua đầu tiên mỗi trận được xem lại,
   *     chance bị huỷ } · addedTime: giây bù giờ khi đang thua lúc hết giờ (1 lần mỗi trận)
   *   Run: winCash: $ thêm mỗi trận thắng · shopOff: giảm giá Shop (phần) · restTwice: Locker Room làm được 2 việc · guard: chặn ngần
   *     này chấn thương mỗi act · drillEase: mốc Skill game / LEGEND TRIAL giảm (phần)
   * up: số liệu sau khi nâng cấp ở Locker Room (không có up = không nâng được). icon: ui-* (pixelicons) hoặc trường phái.
   * injury: chấn thương (Skill game hỏng / sự kiện, rơi vào 1 người ngẫu nhiên của đội), chỉ chữa ở Locker Room / Shop; stats: trừ
   * chỉ số người đó · part: chỗ quấn băng (render/sprites.js) · hurt: khoảnh khắc ra tay trong trận (src/systems/hurt.js, run.hurt). */
  rarityWeights: {
    match: { common: 50, rare: 38, epic: 12 },
    elite: { rare: 55, epic: 35, legendary: 10 },
    boss: { epic: 60, legendary: 40 },
    shop: { common: 40, rare: 38, epic: 17, legendary: 5 },
  },
  offer: 3,                 // thưởng sau trận: chọn 1 trong ngần này
  // hot: mỗi Shop 1 món HOT ngẫu nhiên, giá x hot (0 / bỏ = không có)
  shop: { size: 5, price: { common: 40, rare: 70, epic: 110, legendary: 160 }, heal: 50, hot: 0.5 },
  badges: {
    // bốc Core: trường phái (Core của hệ đó ra thường hơn + mạnh hơn, mọi người trong đội)
    gps:      { name: 'GPS Vest',       rarity: 'rare', school: 'runner',    power: 8, bias: 1.6, up: { power: 12, bias: 1.9 }, desc: 'SPEED Cores come more often and hit harder.' },
    board:    { name: 'Tactics Board',  rarity: 'rare', school: 'playmaker', power: 8, bias: 1.6, up: { power: 12, bias: 1.9 }, desc: 'TIKI-TAKA Cores come more often and hit harder.' },
    boot:     { name: 'Golden Boot',    rarity: 'rare', school: 'striker',   power: 8, bias: 1.6, up: { power: 12, bias: 1.9 }, desc: 'STRIKER Cores come more often and hit harder.' },
    scarf:    { name: 'Derby Scarf',    rarity: 'rare', school: 'brawler',   power: 8, bias: 1.6, up: { power: 12, bias: 1.9 }, desc: 'BRAWLER Cores come more often and hit harder.' },
    studs:    { name: 'Steel Studs',    rarity: 'rare', school: 'launcher',  power: 8, bias: 1.6, up: { power: 12, bias: 1.9 }, desc: 'KICKER Cores come more often and hit harder.' },
    freestyle:{ name: 'Freestyle Ball', rarity: 'rare', school: 'trickster', power: 8, bias: 1.6, up: { power: 12, bias: 1.9 }, desc: 'ILLUSION Cores come more often and hit harder.' },
    armband:  { name: "Captain's Armband", rarity: 'rare', school: 'iron',   power: 8, bias: 1.6, up: { power: 12, bias: 1.9 }, desc: 'IRON Cores come more often and hit harder.' },
    vuvuzela: { name: 'Vuvuzela',       rarity: 'rare', school: 'chaos',     power: 8, bias: 1.6, up: { power: 12, bias: 1.9 }, desc: 'CHAOS Cores come more often and hit harder.' },
    // bốc Core: lượt chọn
    report:   { name: 'Scouting Report', rarity: 'rare', icon: 'book',   draftCards: 1, up: { draftCards: 1, rerolls: 1 }, desc: 'Every Core pick shows one more card.' },
    coin:     { name: "Referee's Coin",  rarity: 'common', icon: 'target', rerolls: 1, up: { rerolls: 2 }, desc: 'One more reroll on every Core pick.' },
    camp:     { name: 'Pre-Season Camp', rarity: 'epic', icon: 'calendar', draftBonus: 1, desc: 'Every match starts with an extra Core pick.' },
    // trận
    drink:    { name: 'Energy Drink',   rarity: 'epic', icon: 'boom', ultGain: 1.3, up: { ultGain: 1.5 }, desc: 'The whole team charges Ultimates faster.' },
    crowd:    { name: 'Home Crowd',     rarity: 'legendary', icon: 'people', score: [1, 0], desc: 'Every match starts one goal up.' },
    var:      { name: 'VAR Monitor',    rarity: 'legendary', icon: 'tv', varCheck: { n: 1, chance: 0.5 }, up: { varCheck: { n: 1, chance: 0.8 } }, desc: 'The first goal you concede each match may get ruled out.' },
    watch:    { name: "Referee's Watch", rarity: 'rare', icon: 'whistle', addedTime: 20, up: { addedTime: 35 }, desc: 'Losing at the final whistle? Time gets added on.' },
    // run: tiền / phòng / chấn thương / bài tập
    sponsor:  { name: 'Shirt Sponsor',  rarity: 'rare', icon: 'shop', winCash: 12, up: { winCash: 20 }, desc: 'Every win pays extra cash.' },
    ticket:   { name: 'Season Ticket',  rarity: 'common', icon: 'card', shopOff: 0.2, up: { shopOff: 0.35 }, desc: 'Everything in the Shop costs less.' },
    icebath:  { name: 'Ice Bath',       rarity: 'rare', icon: 'locker', restTwice: true, desc: 'The Locker Room lets you do two things.' },
    shin:     { name: 'Shin Guards',    rarity: 'common', icon: 'gear', guard: 1, up: { guard: 2 }, desc: 'Blocks the first injury of each act.' },
    bibs:     { name: 'Training Bibs',  rarity: 'common', icon: 'cone', drillEase: 0.2, up: { drillEase: 0.35 }, desc: 'Skill games and Legend trials get easier.' },
    // chấn thương
    ankle:    { name: 'Twisted Ankle',  injury: true, part: 'ankle', hurt: 'stumble', stats: { pace: -12 },              desc: 'Every step hurts.' },
    wrist:    { name: 'Sore Wrist',     injury: true, part: 'wrist', hurt: 'weak',    stats: { fight: -12 },             desc: 'Punches feel like pillows.' },
    hamstring:{ name: 'Tight Hamstring',injury: true, part: 'thigh', hurt: 'stumble', stats: { pace: -8, dribble: -8 },  desc: 'No sprinting, no tricks.' },
    toe:      { name: 'Stubbed Toe',    injury: true, part: 'toe',   hurt: 'shank',   stats: { shooting: -12 },          desc: 'Shots come off the side of the boot.' },
  },
  // khoảnh khắc chấn thương trong trận (src/systems/hurt.js), chữ bật lên Effects.pop kind 'status' màu color
  // stumble: chạy nước rút mỗi every giây có chance khựng lại (đi bộ walk giây) · weak: cú đấm chance xịt (lực đẩy x knock, không choáng)
  // · shank: cú sút chance trượt chân (lệch thêm angle độ)
  hurt: {
    color: '#ff5a6e',
    stumble: { every: 1.6, chance: 0.45, walk: 0.7 },
    weak: { chance: 0.4, knock: 0.35 },
    shank: { chance: 0.35, angle: 16 },
  },

  /* ---------- CO-OP (phòng GOAT PATH online, user 2026-10-26; src/meta/run.js) ----------
   * voteTime: giây tối đa từ phiếu đầu tiên tới lúc chốt (đủ phiếu thì chốt luôn) · eloPer / statPer: mỗi người thật thêm ngoài người đầu,
   * Elo AI đối thủ + eloPer và chỉ số đối thủ x (1 + statPer) (mỗi người nhận BADGE riêng nên đội mạnh lên nhanh hơn chơi một mình) */
  coop: { voteTime: 15, eloPer: 120, statPer: 0.05 },

  /* ---------- SKILL GAME (src/systems/drills.js, user 2026-10-26: mốc ĐỒNG / BẠC / VÀNG + thanh tiến độ trên HUD) ----------
   * Bài tập ngắn trên sân thật. teamSize: [bạn, đối thủ] (bạn > 1 = có 2 đồng đội trong đội hình) · time: giây ·
   * goal: thứ được đếm (goals bàn thắng · targets bàn vào đúng bia · gates cổng dẫn bóng qua · chain chuỗi chuyền dài nhất ·
   * hits lần hạ gục đối thủ · hold giây giữ bóng — mất bóng là hết bài) · tiers: [ĐỒNG, BẠC, VÀNG] (đạt VÀNG là xong luôn) ·
   * keeperOnly: đối thủ chỉ đứng khung · target: bia (size = phần khung thành, speed = vòng / giây) · gate: cổng (r px, gap px giữa 2 cổng)
   * · waves: giây mỗi người đuổi vào cuộc (HOT POTATO) · combo: số lần làm được kỹ thuật LEGEND (chỉ LEGEND TRIAL). Độ khó AI theo Elo của act như trận cùng tầng.
   * Thưởng theo mốc (tierReward): 0 = chấn thương · ĐỒNG tiền · BẠC tiền + 1 BADGE ngẫu nhiên · VÀNG tiền + chọn 1 trong 3 BADGE */
  drills: {
    finish: { name: 'FINISHING',       icon: 'ball',   teamSize: [1, 1], time: 40, goal: 'goals',   tiers: [2, 3, 5], keeperOnly: true, desc: 'Beat the keeper as many times as you can.' },
    target: { name: 'TARGET PRACTICE', icon: 'target', teamSize: [1, 1], time: 45, goal: 'targets', tiers: [1, 2, 4], keeperOnly: true,
      target: { size: 0.36, speed: 0.22 }, desc: 'Only goals inside the glowing target count.' },
    gates:  { name: 'SLALOM GATES',    icon: 'cone',   teamSize: [1, 2], time: 40, goal: 'gates',   tiers: [3, 5, 8], gate: { r: 20, gap: 150 }, desc: 'Dribble through the gates, one after another.' },
    chain:  { name: 'PASS CHAIN',      icon: 'people', teamSize: [3, 2], time: 40, goal: 'chain',   tiers: [4, 7, 10], desc: 'String passes together. Lose it and the chain restarts.' },
    brawl:  { name: 'STREET BRAWL',    icon: 'fist',   teamSize: [1, 3], time: 35, goal: 'hits',    tiers: [3, 6, 10], desc: 'Knock down as many of them as you can.' },
    potato: { name: 'HOT POTATO',      icon: 'boom',   teamSize: [1, 3], time: 30, goal: 'hold',    tiers: [8, 15, 25], waves: [0, 6, 13], desc: 'Keep the ball. More chasers keep coming.' },
    // LEGEND TRIAL (trial: chỉ dùng cho node LEGEND, không bốc cho Skill game): đếm số lần làm được kỹ thuật LEGEND cho mượn —
    // mốc / thời gian / đội hình / cách chơi theo legends.list[].trial
    combo:  { name: 'LEGEND TRIAL',    icon: 'star',   teamSize: [1, 1], time: 40, goal: 'combo',   tiers: [3], trial: true, desc: 'Pull off his combo.' },
  },
  // màu + tên mốc (thanh tiến độ, màn kết quả)
  tiers: [
    { name: 'BRONZE', color: '#d08a4a' },
    { name: 'SILVER', color: '#d4dbe8' },
    { name: 'GOLD',   color: '#ffd23f' },
  ],
  tierReward: [null, { cash: [10, 16] }, { cash: [16, 24], badge: true }, { cash: [20, 28], offer: true }],

  /* ---------- ??? (giai đoạn 3): vào node mới biết là gì ---------- */
  mystery: { event: 55, treasure: 15, skill: 15, shop: 15 },
  // sự kiện: mỗi lựa chọn 1 hiệu lực. cost: tiền (thiếu thì không chọn được) · badge: độ hiếm BADGE ngẫu nhiên ('any' = theo trọng số trận)
  // · injury: xác suất chấn thương · chance + win: xác suất được thưởng win · healAll: chữa hết chấn thương (cần có chấn thương)
  events: {
    vendor: { title: 'STREET VENDOR', icon: 'shop', text: 'A vendor waves you over. "Lucky charms! Fresh today!"',
      choices: [{ label: 'Buy one', cost: 30, badge: 'rare' }, { label: 'Walk away' }] },
    coach:  { title: 'OLD COACH', icon: 'whistle', text: 'A retired coach offers you one brutal session.',
      choices: [{ label: 'Train hard', badge: 'common', injury: 0.5 }, { label: 'Say no' }] },
    bet:    { title: 'CROSSBAR CHALLENGE', icon: 'target', text: 'Kids bet you cannot hit the crossbar from the corner.',
      choices: [{ label: 'Bet', cost: 25, chance: 0.5, win: { cash: 60 } }, { label: 'Pass' }] },
    physio: { title: 'PARK PHYSIO', icon: 'check', text: 'A physio has set up a table in the park.',
      choices: [{ label: 'Get treated', cost: 40, healAll: true }, { label: 'Keep going' }] },
    fan:    { title: 'BIGGEST FAN', icon: 'gift', text: 'A kid in your shirt runs up with a present.',
      choices: [{ label: 'Thank you!', badge: 'any' }] },
  },

  // 3 act (phương án B: mỗi act 1 vùng). teams = đối thủ Matchday · elite = đối thủ Elite (pool riêng, dữ liệu ở run.elites; thiếu = bốc chung teams)
  // boss = bốc 1 lúc bắt đầu run · elo = [tầng 0, tầng cuối] (nội suy) · bossElo · spareBoss: true = boss các act trước không được bốc đá Elite ở act này
  // Câu chuyện (giai đoạn 4, src/ui/runmap.js cutscene): mạch 3 act nối nhau thành 1 hành trình (khu phố -> thành phố -> huyền thoại).
  //   tell: kiểu kể (src/ui/story.js TELL) · narrator: id Story cũ lấy người dẫn truyện (tên + hình) · theme / trophy: khuôn cảnh
  //   src/ui/story-cup.js · stages: tên chặng [mở act, trước boss, hạ boss] · intro / bossTalk / after: lời thoại (who: host · you · opp;
  //   art: khuôn riêng; {boss} = tên đội boss của act). Chiếu: intro lúc vào act, bossTalk trước trận boss, after sau khi hạ boss.
  acts: [
    { id: 'block', name: 'THE BLOCK', color: '#ffd23f', arena: 'village',
      teams: ['ward_uncles', 'moped_boys', 'school_ghosts', 'pigeon_gang'], elite: ['rope_skippers', 'wash_aunties'], boss: ['block_wardens'], elo: [30, 300], bossElo: 350,
      tell: 'diary', narrator: 'ward_cup', theme: 'alley', trophy: 'pot', stages: ['DAY 1', 'DAY 6', 'DAY 7'],
      intro: [
        { who: 'host', text: 'Attention, the whole block! Somebody here wants to walk the GOAT PATH.' },
        { who: 'you', text: 'Every street legend started on a pitch like this one.' },
        { who: 'host', text: 'Win the block, and the whole city will hear your name.' },
      ],
      bossTalk: [
        { who: 'host', text: 'Only {boss} stand between you and the city.' },
        { who: 'opp', text: 'Nobody leaves the block. Not on our watch.' },
      ],
      after: [
        { who: 'host', art: 'cupLift', text: 'THE BLOCK IS YOURS!' },
        { who: 'you', text: 'Next stop: the city.' },
      ] },
    { id: 'night', name: 'NIGHT CITY', color: '#9d7bff', arena: 'rooftop',
      teams: ['sky_hoppers', 'billboard_kids', 'lantern_crew', 'noodle_kickers', 'fortune_tellers'], elite: ['tower_guards', 'neon_arcade'], boss: ['night_owls', 'market_mamas'], elo: [450, 1000], bossElo: 1150,
      tell: 'manga', narrator: 'rooftop_league', theme: 'rooftop', trophy: 'owl', stages: ['CHAPTER 1 · NIGHT CITY', 'CHAPTER 2 · THE CROWN', 'CHAPTER 3 · DAWN'],
      intro: [
        { who: 'host', text: 'So. The kid from the block made it to the city.' },
        { who: 'host', sfx: 'DOOM!', text: 'Up here nobody plays fair. Every crew has its own rules.' },
        { who: 'you', text: 'Then I will learn them all.' },
      ],
      bossTalk: [
        { who: 'host', text: '{boss} rule the night. Beat them and the Legends will notice you.' },
        { who: 'opp', sfx: 'SLAM!', text: 'The city is ours. Go back to your little block.' },
      ],
      after: [
        { who: 'host', art: 'cupLift', text: 'The city bows to you.' },
        { who: 'host', text: 'One road left. The old greats are waiting.' },
      ] },
    { id: 'legends', name: 'THE LEGENDS', color: '#e4ae39', arena: 'stadium',
      teams: ['rust_buckets', 'retired_refs', 'grandpa_squad'], elite: ['domino_club', 'taichi_masters'], boss: ['old_legends'], spareBoss: true, elo: [1300, 2150], bossElo: 2700,
      tell: 'film', narrator: 'legends_cup', theme: 'stadium', trophy: 'cup', stages: ['REEL ONE', 'REEL TWO · THE KING', 'THE END'],
      intro: [
        { who: 'host', art: 'cupMemory', text: 'Fifty years ago, I walked this same road.' },
        { who: 'host', art: 'cupMemory', text: 'At the end of it, the Legends were waiting. They still are.' },
        { who: 'you', text: 'Then I will finish it for you, Grandpa.' },
      ],
      bossTalk: [
        { who: 'host', text: 'King Leo. The greatest there ever was.' },
        { who: 'opp', text: 'Many walked the path. None reached the end.' },
      ],
      after: [
        { who: 'host', art: 'cupLift', text: 'The GOAT of street football.' },
        { who: 'you', text: 'Grandpa... we did it.' },
      ] },
  ],
};
