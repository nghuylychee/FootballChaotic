/* =========================================================
 * STORIES CONFIG — FOOTBALL STORY (docs/FOOTBALL_STORY.md): cup knockout co-op PvE, 4 trận 1/8 → tứ kết → bán kết → chung kết.
 * Logic: src/meta/cup.js (SFC.Cup) · UI: src/ui/cup.js (SFC.CupUI, tab thứ 2 màn PLAY).
 * Thua là out. Core reset mỗi trận như trận thường. Hoà hết giờ: bàn thắng vàng tới khi có bàn (knockout).
 * Thưởng: gold mỗi trận thắng (reward.gold[vòng]) + costume khi vô địch lần đầu (reward.item) + sao thử thách (stars) + thành tích.
 *
 * Mỗi Story: { id, name, blurb, cover (id sân làm ảnh bìa), color, rounds[4], fillers, rival, reward, stars, intro, outro }
 *   rounds[i]: { team (id trong teams.list), arena, elo (độ khó AI = MainPath.aiProfile(elo), cả đồng đội AI của bạn),
 *                signature (Core đặc trưng đội AI chắc chắn cầm), before / after: hội thoại trước trận / sau khi thắng }
 *   hội thoại = cut scene kiểu PROLOGUE (src/ui/cup.js dựng cảnh, khuôn cảnh ở src/ui/story-cup.js), mỗi dòng 1 cảnh:
 *     [{ who, text, art?, team?, zoom?, dur? }] — who: 'you' (character của bạn) · 'opp' (đội trưởng đội đối thủ vòng đó) · 'host' (bình luận viên)
 *     art mặc định theo chỗ + người nói: intro (host cupAlley · you / opp cupTalk) · before (host cupHost · you / opp cupTalk, tự chèn cảnh VS cupFace
 *     trước câu đầu tiên của 2 đội) · after (opp cupSad · host cupHost · you cupTalk) · outro (cupLift, tự chèn chữ CHAMPIONS).
 *     art / team / zoom ghi riêng để đổi cảnh (vd. cupRival + team = đội kình địch). dur: giây (mặc định theo độ dài câu)
 *   fillers: đội lấp các nhánh khác của bracket (11 đội, đá giả lập ra tỉ số) · rival: vòng có đội kình địch (luôn thắng đậm ở nhánh bên kia)
 *   stars: thử thách phụ, mỗi Story 3 sao, giữ vĩnh viễn, mỗi sao chỉ cần đạt 1 lần. kind:
 *     champ (vô địch) · cleanFinal (chung kết không thủng lưới) · hattrick (bạn ghi 3 bàn trong 1 trận) · bigWin (thắng chung kết cách 3 bàn) ·
 *     noGolden (vô địch không trận nào phải đá bàn thắng vàng) · goals (vô địch, đội ghi đủ n bàn cả cup) · sweep (vô địch, trận nào cũng thắng cách 2 bàn)
 *   theme: nền cut scene (alley · rooftop · market · stadium, src/ui/story-cup.js) · trophy: pot (nồi cơm vàng) · cup (cúp vàng)
 *   tier: độ khó 1..4 (chấm trên thẻ Story; độ khó thật = elo từng vòng)
 *   soon: true = thẻ COMING SOON (chưa có nội dung, chỉ hiện ở trang FOOTBALL STORY)
 * Độ khó cố định theo từng Story (user chốt 2026-10-18), người chơi không chọn.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.stories = {
  roundNames: ['ROUND OF 16', 'QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'],
  host: 'ANNOUNCER',   // tên người nói của lời thoại who: 'host'

  list: [
    {
      id: 'ward_cup', name: 'THE WARD CUP', color: '#ff9a3d', cover: 'alley', theme: 'alley', trophy: 'pot', tier: 1,
      blurb: 'The neighbourhood cup. Sixteen teams, one battered trophy, zero rules.',
      rival: 3,
      rounds: [
        {
          team: 'ward_uncles', arena: 'village', elo: 30,
          before: [
            { who: 'host', text: 'Welcome to the Ward Cup! First up: the Uncles, who have played this pitch for thirty years.' },
            { who: 'opp', text: 'Kids these days. We were scoring here before you could walk.' },
            { who: 'you', text: 'Then you must be tired. Sit down, uncle.' },
          ],
          after: [
            { who: 'opp', text: 'Fine, fine. My knees are done anyway. Go win the thing.' },
          ],
        },
        {
          team: 'moped_boys', arena: 'street', elo: 90, signature: 'speed_demon',
          before: [
            { who: 'host', text: 'Quarter-final! The Moped Boys deliver noodles in nine minutes flat. Can you keep up?' },
            { who: 'opp', text: 'We deliver goals faster than soup. Blink and you lose.' },
            { who: 'you', text: 'Your soup is cold, and so is your finishing.' },
          ],
          after: [
            { who: 'opp', text: 'Too fast?! Nobody is faster than us! ...Okay, today somebody was.' },
          ],
        },
        {
          team: 'school_ghosts', arena: 'school', elo: 160, signature: 'phantom_step',
          before: [
            { who: 'host', text: 'Semi-final! Nobody knows who the School Ghosts are. Nobody has ever seen them leave.' },
            { who: 'opp', text: 'You cannot mark what you cannot see.' },
            { who: 'you', text: 'Then I will just watch the ball.' },
          ],
          after: [
            { who: 'opp', text: 'You saw us. Nobody sees us. We will haunt you in the rematch.' },
            { who: 'host', art: 'cupRival', team: 'block_wardens', text: 'And on the other side of the bracket... the Block Wardens are crushing everyone. Again.' },
          ],
        },
        {
          team: 'block_wardens', arena: 'alley', elo: 240, signature: 'giant_keeper',
          before: [
            { who: 'host', text: 'THE FINAL! The Block Wardens have won the Ward Cup five years running. Nobody gets past their keeper.' },
            { who: 'opp', text: 'This is our block. Our pitch. Our trophy. You are trespassing.' },
            { who: 'you', text: 'Then call security. Oh wait, that is you. Good luck.' },
          ],
          after: [
            { who: 'opp', text: 'Six years... it was supposed to be six years.' },
          ],
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
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'The trophy is a dented rice pot painted gold. People would kill for it.' },
        { who: 'you', text: 'Four wins. That is all it takes. Let us go.' },
      ],
      outro: [
        { who: 'host', text: 'UNBELIEVABLE! A new champion of the Ward Cup!' },
        { who: 'you', text: 'Put the pot on my head. I earned it.' },
      ],
    },
    /* ---------- Story 2: sân thượng, độ khó 2 (Elo 380 → 700) ---------- */
    {
      id: 'rooftop_league', name: 'ROOFTOP NIGHT LEAGUE', color: '#6ec8ff', cover: 'rooftop', theme: 'rooftop', trophy: 'cup', tier: 2,
      blurb: 'Football above the city, one bad pass from the street below.',
      rival: 3,
      rounds: [
        {
          team: 'pigeon_gang', arena: 'rooftop', elo: 380,
          before: [
            { who: 'host', text: 'Welcome to the Rooftop Night League! Thirty floors up, no nets, and the Pigeon Gang wants their ledge back.' },
            { who: 'opp', text: 'Coo. Coo. COO!' },
            { who: 'you', text: 'I am going to take that as a threat.' },
          ],
          after: [
            { who: 'opp', text: 'Coo...' },
          ],
        },
        {
          team: 'sky_hoppers', arena: 'rooftop', elo: 470, signature: 'flying_kick',
          before: [
            { who: 'host', text: 'Quarter-final! The Sky Hoppers jump roof to roof just to get to practice.' },
            { who: 'opp', text: 'The ground is for people who cannot fly. Try to keep up.' },
            { who: 'you', text: 'Then I will keep the ball on the ground.' },
          ],
          after: [
            { who: 'opp', text: 'You never left the floor... so how are you this fast?' },
          ],
        },
        {
          team: 'billboard_kids', arena: 'plaza', elo: 580, signature: 'shadow_clone',
          before: [
            { who: 'host', text: 'Semi-final, under the giant billboard! The Billboard Kids paint the city every night.' },
            { who: 'opp', text: 'Smile! Tomorrow you will be on every wall in town. Losing.' },
            { who: 'you', text: 'Paint my good side.' },
          ],
          after: [
            { who: 'opp', text: 'Fine. We will paint you winning. Just this once.' },
            { who: 'host', art: 'cupRival', team: 'night_owls', text: 'Meanwhile, the Night Owls have not conceded a goal in three years. Nobody has ever seen them blink.' },
          ],
        },
        {
          team: 'night_owls', arena: 'rooftop', elo: 700, signature: 'thunder_kick',
          before: [
            { who: 'host', text: 'THE FINAL! The Night Owls own this league. They play every match at midnight, and they never lose.' },
            { who: 'opp', text: 'We see everything up here. Every pass. Every mistake. Every dream.' },
            { who: 'you', text: 'Then watch closely. You are about to see something new.' },
          ],
          after: [
            { who: 'opp', text: 'Hoo... I did not see that coming.' },
          ],
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
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'Sixteen teams. One golden cup. And a very long way down.' },
        { who: 'you', text: 'Do not look down. Got it.' },
      ],
      outro: [
        { who: 'host', text: 'A NEW KING OF THE ROOFTOPS! The whole city will hear about this in the morning!' },
        { who: 'you', text: 'Let them sleep. I will tell them tomorrow.' },
      ],
    },
    /* ---------- Story 3: chợ đêm, độ khó 3 (Elo 620 → 1150) ---------- */
    {
      id: 'market_cup', name: 'NIGHT MARKET CUP', color: '#ff3fb4', cover: 'market', theme: 'market', trophy: 'cup', tier: 3,
      blurb: 'Neon, noodles and the loudest crowd in town.',
      rival: 3,
      rounds: [
        {
          team: 'lantern_crew', arena: 'market', elo: 620,
          before: [
            { who: 'host', text: 'Welcome to the Night Market Cup! The stalls stay open, the crowd stays loud, and the Lantern Crew is up first.' },
            { who: 'opp', text: 'We hung every lantern in this market. Tonight we hang you out to dry.' },
            { who: 'you', text: 'Your lanterns are crooked.' },
          ],
          after: [
            { who: 'opp', text: 'They are NOT crooked. ...Are they?' },
          ],
        },
        {
          team: 'noodle_kickers', arena: 'street', elo: 780, signature: 'fire_shot',
          before: [
            { who: 'host', text: 'Quarter-final! The Noodle Kickers cook all night and score all morning.' },
            { who: 'opp', text: 'Our shots are hotter than our broth. Careful, it burns.' },
            { who: 'you', text: 'I like it spicy.' },
          ],
          after: [
            { who: 'opp', text: 'You swallowed our best shot like it was nothing. Respect.' },
          ],
        },
        {
          team: 'fortune_tellers', arena: 'market', elo: 920, signature: 'loaded_dice',
          before: [
            { who: 'host', text: 'Semi-final! The Fortune Tellers say they already know the final score.' },
            { who: 'opp', text: 'The cards say you lose three to nothing. The cards are never wrong.' },
            { who: 'you', text: 'Shuffle again.' },
          ],
          after: [
            { who: 'opp', text: 'Impossible... the cards lied to me!' },
            { who: 'host', art: 'cupRival', team: 'market_mamas', text: 'And on the other side, the Market Mamas just haggled their opponents down to zero. Again.' },
          ],
        },
        {
          team: 'market_mamas', arena: 'market', elo: 1150, signature: 'giant_fist',
          before: [
            { who: 'host', text: 'THE FINAL! The Market Mamas run every stall in this market. Nobody argues with them. Nobody.' },
            { who: 'opp', text: 'Sweetie, you look hungry. Lose quietly and I will give you a free bowl.' },
            { who: 'you', text: 'Thank you, auntie. I will take the cup instead.' },
          ],
          after: [
            { who: 'opp', text: 'Hmph. Fine, take the cup. And take some dumplings, you look thin.' },
          ],
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
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'The prize: a golden cup and free noodles for a whole year.' },
        { who: 'you', text: 'Free noodles. Now I am motivated.' },
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
          team: 'rust_buckets', arena: 'harbor', elo: 1450,
          before: [
            { who: 'host', text: "Welcome to Grandpa's Legends! The old greats are back for one last tournament. First up: the Rust Buckets." },
            { who: 'opp', text: 'Forty years at sea, kid. We have seen storms bigger than you.' },
            { who: 'you', text: 'Then you know when to drop anchor.' },
          ],
          after: [
            { who: 'opp', text: 'Heh. The tide has turned. Go on, sail.' },
          ],
        },
        {
          team: 'retired_refs', arena: 'plaza', elo: 1750, signature: 'aegis_wall',
          before: [
            { who: 'host', text: 'Quarter-final! The Retired Refs spent their lives watching football. Now they finally get to play.' },
            { who: 'opp', text: 'Forty years of whistles. Today, we make the rules.' },
            { who: 'you', text: 'Street football has no rules. Remember?' },
          ],
          after: [
            { who: 'opp', text: 'No card for that? ...No card for that.' },
          ],
        },
        {
          team: 'grandpa_squad', arena: 'village', elo: 2150, signature: 'counter_attack',
          before: [
            { who: 'host', text: "Semi-final! Grandpa's old squad won this cup fifty years ago, with a ball made of rags." },
            { who: 'opp', text: 'Your grandpa was our captain, kid. He never stops talking about you.' },
            { who: 'you', text: 'Then let me show you why.' },
          ],
          after: [
            { who: 'opp', text: 'He was right about you. Do not tell him we said that.' },
            { who: 'host', art: 'cupRival', team: 'the_legends', text: 'And waiting in the final... The Legends. Every great who ever played the street game, on one team.' },
          ],
        },
        {
          team: 'the_legends', arena: 'stadium', elo: 2700, signature: 'black_hole',
          before: [
            { who: 'host', text: 'THE FINAL! The Legends have never lost. Not once. Not ever.' },
            { who: 'opp', text: 'We are the dream you had as a kid. Can you beat your own dream?' },
            { who: 'you', text: 'I have dreamed about this day my whole life. Yes.' },
          ],
          after: [
            { who: 'opp', text: 'The street game is in good hands now.' },
          ],
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
        { who: 'host', art: 'cupAlley', zoom: 1, text: 'The golden cup of the Legends. Your grandpa lifted it once.' },
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
