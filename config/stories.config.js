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
 *     champ (vô địch) · cleanFinal (chung kết không thủng lưới) · hattrick (bạn ghi 3 bàn trong 1 trận) · bigWin (thắng chung kết cách 3 bàn)
 *   soon: true = thẻ COMING SOON (chưa có nội dung, chỉ hiện ở trang FOOTBALL STORY)
 * Độ khó cố định theo từng Story (user chốt 2026-10-18), người chơi không chọn.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.stories = {
  roundNames: ['ROUND OF 16', 'QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'],
  host: 'ANNOUNCER',   // tên người nói của lời thoại who: 'host'

  list: [
    {
      id: 'ward_cup', name: 'THE WARD CUP', color: '#ff9a3d', cover: 'alley',
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
    // các Story sau (chưa có nội dung): thẻ COMING SOON ở trang FOOTBALL STORY
    { id: 'rooftop_league', soon: true, name: 'ROOFTOP NIGHT LEAGUE', color: '#6ec8ff', cover: 'rooftop', blurb: 'Football above the city, one bad pass from the street below.' },
    { id: 'market_cup', soon: true, name: 'NIGHT MARKET CUP', color: '#ff3fb4', cover: 'market', blurb: 'Neon, noodles and the loudest crowd in town.' },
    { id: 'legends_cup', soon: true, name: "GRANDPA'S LEGENDS", color: '#ffd23f', cover: 'stadium', blurb: 'The old greats are back for one last tournament.' },
  ],

  /* Đội riêng của FOOTBALL STORY (gộp vào teams.list như đội Main Path). Khuôn giống mainPath.teams. */
  teams: {
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
