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
    weights: { match: 40, event: 22, skill: 15, shop: 10, elite: 8, rest: 5 },
    minFloor: { elite: 2, rest: 2 },
    noRepeat: ['shop', 'rest', 'elite'],
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
   * Chỉ số trong run KHÔNG lấy từ ngoài run: nền theo vị trí (base, trung bình ~70 = hệ số ~0.88; user 2026-10-27: 62 đá không ổn,
   * vẫn dưới 80 để BADGE có ý nghĩa) + nghiêng theo chỉ số riêng của đồng đội (lean x (rating - OVR), kẹp ±leanMax: mỗi người 1 sở trường) + chút theo OVR
   * của họ (ovrLean x (OVR - ovrRef), kẹp ±ovrMax: đồng đội scout giỏi nhỉnh hơn) + BADGE của người đó.
   * picks: số ứng viên ở màn chọn (đội hình trong roster trước, thiếu thì cầu thủ đường phố ngẫu nhiên cùng trình act 1). */
  squad: {
    base: {
      FWD: { pace: 76, shooting: 80, passing: 68, dribble: 72, fight: 64, keeper: 60 },
      MID: { pace: 70, shooting: 66, passing: 80, dribble: 76, fight: 66, keeper: 62 },
      DEF: { pace: 66, shooting: 62, passing: 68, dribble: 64, fight: 80, keeper: 80 },
    },
    lean: 0.7, leanMax: 8,
    ovrRef: 66, ovrLean: 0.2, ovrMax: 4,
    min: 30,                // chỉ số thấp nhất (chấn thương chồng lên nhau)
    picks: 6,
  },

  /* ---------- BADGE (docs/RUN_DESIGN.md): đồ trong run, gắn cho 1 trong 3 người của đội hình (user 2026-10-26), không trùng ----------
   * stats: { chỉ số: +rating } của người đeo (tối đa attrs.max) · school + power: Core trường phái đó mạnh hơn (cộng rating chỉ để tính
   * CoreScale) · bias: Core trường phái đó ra thường hơn (nhân trọng số bốc) · score: tỉ số khởi đầu [bạn, đối thủ] · ultGain: nạp
   * Tuyệt kỹ x — school / score / ultGain vẫn tác dụng cho cả đội dù gắn cho ai. injury: chấn thương (Skill game hỏng / sự kiện, rơi
   * vào 1 người ngẫu nhiên), chỉ chữa ở Locker Room / Shop; part: chỗ quấn băng trên người (render/sprites.js) · hurt: khoảnh khắc
   * chấn thương ra tay trong trận (src/systems/hurt.js, số liệu run.hurt). Nâng cấp (Locker Room): số liệu x up.mult (noUp: không
   * nâng được). icon: ui-* (pixelicons) hoặc trường phái. */
  up: { mult: 1.5 },
  rarityWeights: {
    match: { common: 60, rare: 32, epic: 8 },
    elite: { rare: 55, epic: 35, legendary: 10 },
    boss: { epic: 60, legendary: 40 },
    shop: { common: 40, rare: 38, epic: 17, legendary: 5 },
  },
  offer: 3,                 // thưởng sau trận: chọn 1 trong ngần này
  shop: { size: 5, price: { common: 40, rare: 70, epic: 110, legendary: 160 }, heal: 50 },
  badges: {
    // chỉ số (1 chỉ số)
    spikes:   { name: 'Running Spikes', rarity: 'common', stats: { pace: 8 },     desc: 'Light spikes for a quicker first step.' },
    laces:    { name: 'Lucky Laces',    rarity: 'common', stats: { shooting: 8 }, desc: 'Same laces since the first goal.' },
    cones:    { name: 'Rondo Cones',    rarity: 'common', stats: { passing: 8 },  desc: 'Pass, move, pass again.' },
    socks:    { name: 'Sticky Socks',   rarity: 'common', stats: { dribble: 8 },  desc: 'The ball just stays close.' },
    tape:     { name: 'Wrist Tape',     rarity: 'common', stats: { fight: 8 },    desc: 'Taped up and ready to scrap.' },
    gloves:   { name: 'Old Gloves',     rarity: 'common', stats: { keeper: 8 },   desc: 'Worn out, still safe hands.' },
    // chỉ số (mạnh / 2 chỉ số)
    turbo:    { name: 'Turbo Shoes',    rarity: 'rare', stats: { pace: 13 },                  desc: 'Too fast for the street.' },
    cannon:   { name: 'Cannon Boots',   rarity: 'rare', stats: { shooting: 13 },              desc: 'Every shot sounds like a door slam.' },
    armband:  { name: "Captain's Armband", rarity: 'rare', stats: { passing: 7, fight: 6 },   desc: 'Lead the play, win it back.' },
    counter:  { name: 'Counter Kit',    rarity: 'rare', stats: { pace: 7, dribble: 6 },       desc: 'Break forward with the ball glued on.' },
    hammer:   { name: 'Hammer Laces',   rarity: 'rare', stats: { shooting: 7, fight: 6 },     desc: 'Hit the ball and anyone near it.' },
    brick:    { name: 'Brick Wall',     rarity: 'rare', stats: { keeper: 9, fight: 4 },       desc: 'Nothing gets past. Nothing.' },
    jersey:   { name: 'Lucky Jersey',   rarity: 'epic', stats: { pace: 4, shooting: 4, passing: 4, dribble: 4, fight: 4, keeper: 4 }, desc: 'Never washed. Never lost.' },
    rocket:   { name: 'Rocket Boots',   rarity: 'epic', stats: { pace: 10, shooting: 9 },     desc: 'Run past them, shoot through them.' },
    magnet:   { name: 'Magnet Boots',   rarity: 'epic', stats: { dribble: 10, passing: 9 },   desc: 'The ball goes where you want.' },
    // trường phái: Core của hệ đó mạnh hơn + ra thường hơn
    poster:   { name: 'Speed Poster',   rarity: 'rare', school: 'runner',    power: 8, bias: 1.6, desc: 'SPEED Cores come more often and hit harder.' },
    metronome:{ name: 'Metronome',      rarity: 'rare', school: 'playmaker', power: 8, bias: 1.6, desc: 'TIKI-TAKA Cores come more often and hit harder.' },
    scope:    { name: 'Sniper Scope',   rarity: 'rare', school: 'striker',   power: 8, bias: 1.6, desc: 'STRIKER Cores come more often and hit harder.' },
    knuckles: { name: 'Brass Knuckles', rarity: 'rare', school: 'brawler',   power: 8, bias: 1.6, desc: 'BRAWLER Cores come more often and hit harder.' },
    pads:     { name: 'Kick Pads',      rarity: 'rare', school: 'launcher',  power: 8, bias: 1.6, desc: 'KICKER Cores come more often and hit harder.' },
    deck:     { name: 'Magic Deck',     rarity: 'rare', school: 'trickster', power: 8, bias: 1.6, desc: 'ILLUSION Cores come more often and hit harder.' },
    plate:    { name: 'Iron Plate',     rarity: 'rare', school: 'iron',      power: 8, bias: 1.6, desc: 'IRON Cores come more often and hit harder.' },
    mask:     { name: 'Chaos Mask',     rarity: 'rare', school: 'chaos',     power: 8, bias: 1.6, desc: 'CHAOS Cores come more often and hit harder.' },
    // trận
    crowd:    { name: 'Home Crowd',     rarity: 'legendary', score: [1, 0], noUp: true, icon: 'people', desc: 'Every match starts one goal up.' },
    drink:    { name: 'Energy Drink',   rarity: 'legendary', ultGain: 1.35, icon: 'boom',  desc: 'Your Ultimate charges faster.' },
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
   * · waves: giây mỗi người đuổi vào cuộc (HOT POTATO). Độ khó AI theo Elo của act như trận cùng tầng.
   * Thưởng theo mốc (tierReward): 0 = chấn thương · ĐỒNG tiền · BẠC tiền + 1 BADGE ngẫu nhiên · VÀNG tiền + chọn 1 trong 3 BADGE */
  drills: {
    finish: { name: 'FINISHING',       icon: 'ball',   teamSize: [1, 1], time: 40, goal: 'goals',   tiers: [2, 3, 5], keeperOnly: true, desc: 'Beat the keeper as many times as you can.' },
    target: { name: 'TARGET PRACTICE', icon: 'target', teamSize: [1, 1], time: 45, goal: 'targets', tiers: [1, 2, 4], keeperOnly: true,
      target: { size: 0.36, speed: 0.22 }, desc: 'Only goals inside the glowing target count.' },
    gates:  { name: 'SLALOM GATES',    icon: 'cone',   teamSize: [1, 2], time: 40, goal: 'gates',   tiers: [3, 5, 8], gate: { r: 20, gap: 150 }, desc: 'Dribble through the gates, one after another.' },
    chain:  { name: 'PASS CHAIN',      icon: 'people', teamSize: [3, 2], time: 40, goal: 'chain',   tiers: [4, 7, 10], desc: 'String passes together. Lose it and the chain restarts.' },
    brawl:  { name: 'STREET BRAWL',    icon: 'fist',   teamSize: [1, 3], time: 35, goal: 'hits',    tiers: [3, 6, 10], desc: 'Knock down as many of them as you can.' },
    potato: { name: 'HOT POTATO',      icon: 'boom',   teamSize: [1, 3], time: 30, goal: 'hold',    tiers: [8, 15, 25], waves: [0, 6, 13], desc: 'Keep the ball. More chasers keep coming.' },
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
