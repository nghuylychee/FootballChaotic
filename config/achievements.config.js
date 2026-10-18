/* =========================================================
 * ACHIEVEMENTS CONFIG — thành tích (logic: src/meta/achievements.js, UI: src/ui/achievements.js — nút cúp dưới SETTINGS ở trang chủ).
 * Tiến độ tính thẳng từ hồ sơ (không lưu riêng), hồ sơ chỉ lưu thành tích đã nhận thưởng (Profile.data.ach).
 *
 * Mỗi thành tích: { id, name, desc, stat, target, reward }
 *   stat   : matches (trận đã đá hết giờ) · wins · goals · boxes (hộp gacha đã mở) · level · elo (Elo cao nhất) ·
 *            area (Area cao nhất từng tới, 1..10) · cores (Core thường đã mở) · ults (Tuyệt kỹ đã sưu tập) ·
 *            outfits (số món costume khác nhau trong túi đồ) · core (đã mở Core `core` — target luôn 1) ·
 *            FOOTBALL STORY (src/meta/cup.js): story (đã vô địch Story `story` — target luôn 1) · cups (số Story đã vô địch) ·
 *            finals (số lần vào chung kết) · stars (tổng sao thử thách)
 *   target : số cần đạt · 'all' = toàn bộ (vd. mọi Core thường)
 *   reward : { item: id costume (progression.items) } — vào túi đồ ngay · { box: id hộp (progression.boxes), n } — hộp miễn phí ở SHOP
 * Thứ tự trong list = thứ tự nhóm khi chưa làm xong (UI xếp: nhận được trước · đang làm · đã nhận).
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.achievements = {
  // nhóm (icon pixel + màu viền) — chỉ để hiển thị
  groups: {
    matches: { icon: 'ui-star', color: '#ffe14f' },
    wins:    { icon: 'ui-trophy', color: '#ffb81f' },
    goals:   { icon: 'arch-striker', color: '#ff7a3d' },
    rank:    { icon: 'ui-crown', color: '#c6ff3f' },
    cores:   { icon: 'ui-card', color: '#9d7bff' },
    style:   { icon: 'ui-gift', color: '#3ff6ff' },
    story:   { icon: 'ui-trophy', color: '#ff9a3d' },
  },
  list: [
    /* ---------- trận đấu ---------- */
    { id: 'kickoff',      group: 'matches', name: 'Kickoff',          desc: 'Play your first match',        stat: 'matches', target: 1,   reward: { box: 'street' } },
    { id: 'regular',      group: 'matches', name: 'Regular',          desc: 'Play 10 matches',              stat: 'matches', target: 10,  reward: { item: 'cap' } },
    { id: 'street_rat',   group: 'matches', name: 'Street Rat',       desc: 'Play 25 matches',              stat: 'matches', target: 25,  reward: { box: 'street', n: 2 } },
    { id: 'lifer',        group: 'matches', name: 'Lifer',            desc: 'Play 50 matches',              stat: 'matches', target: 50,  reward: { item: 'headphones' } },
    { id: 'no_days_off',  group: 'matches', name: 'No Days Off',      desc: 'Play 100 matches',             stat: 'matches', target: 100, reward: { box: 'legend' } },
    /* ---------- thắng ---------- */
    { id: 'first_win',    group: 'wins', name: 'First Blood',         desc: 'Win a match',                  stat: 'wins', target: 1,   reward: { item: 'sparkle' } },
    { id: 'winner',       group: 'wins', name: 'Winning Habit',       desc: 'Win 10 matches',               stat: 'wins', target: 10,  reward: { box: 'street', n: 2 } },
    { id: 'champion',     group: 'wins', name: 'Street Champion',     desc: 'Win 25 matches',               stat: 'wins', target: 25,  reward: { item: 'shades' } },
    { id: 'unstoppable',  group: 'wins', name: 'Unstoppable',         desc: 'Win 50 matches',               stat: 'wins', target: 50,  reward: { box: 'legend' } },
    { id: 'goat',         group: 'wins', name: 'The GOAT',            desc: 'Win 100 matches',              stat: 'wins', target: 100, reward: { item: 'flamehair' } },
    /* ---------- bàn thắng ---------- */
    { id: 'first_goal',   group: 'goals', name: 'Off the Mark',       desc: 'Score your first goal',        stat: 'goals', target: 1,   reward: { item: 'bandaid' } },
    { id: 'poacher',      group: 'goals', name: 'Poacher',            desc: 'Score 25 goals',               stat: 'goals', target: 25,  reward: { item: 'reds' } },
    { id: 'hitman',       group: 'goals', name: 'Hitman',             desc: 'Score 100 goals',              stat: 'goals', target: 100, reward: { item: 'neonkick' } },
    { id: 'golden_boot',  group: 'goals', name: 'Golden Boot',        desc: 'Score 250 goals',              stat: 'goals', target: 250, reward: { item: 'goldboot' } },
    /* ---------- leo rank ---------- */
    { id: 'moving_up',    group: 'rank', name: 'Moving Up',           desc: 'Reach AREA 2',                 stat: 'area', target: 2,  reward: { box: 'street' } },
    { id: 'schoolyard',   group: 'rank', name: 'Known Around Town',   desc: 'Reach AREA 3',                 stat: 'area', target: 3,  reward: { item: 'mohawk' } },
    { id: 'night_owl',    group: 'rank', name: 'Night Market Star',   desc: 'Reach AREA 5',                 stat: 'area', target: 5,  reward: { box: 'legend' } },
    { id: 'big_stage',    group: 'rank', name: 'Big Stage',           desc: 'Reach AREA 8',                 stat: 'area', target: 8,  reward: { item: 'halo' } },
    { id: 'world_stage',  group: 'rank', name: 'World Stage',         desc: 'Reach AREA 10',                stat: 'area', target: 10, reward: { item: 'crown' } },
    /* ---------- Core ---------- */
    { id: 'collector',    group: 'cores', name: 'Collector',          desc: 'Unlock 30 Cores',              stat: 'cores', target: 30, reward: { box: 'street', n: 2 } },
    { id: 'hoarder',      group: 'cores', name: 'Hoarder',            desc: 'Unlock 40 Cores',              stat: 'cores', target: 40, reward: { box: 'legend' } },
    { id: 'completionist',group: 'cores', name: 'Completionist',      desc: 'Unlock every Core',            stat: 'cores', target: 'all', reward: { item: 'aura' } },
    { id: 'signature',    group: 'cores', name: 'Signature Move',     desc: 'Discover 3 Ultimates',          stat: 'ults', target: 3,   reward: { item: 'viking' } },
    { id: 'storm_chaser', group: 'cores', name: 'Storm Chaser',       desc: 'Unlock Light Cycle',           stat: 'core', core: 'light_cycle', target: 1, reward: { item: 'lightning' } },
    { id: 'event_horizon',group: 'cores', name: 'Event Horizon',      desc: 'Unlock Black Hole Shot',       stat: 'core', core: 'black_hole', target: 1,     reward: { item: 'galaxy' } },
    /* ---------- FOOTBALL STORY ---------- */
    { id: 'ward_champ',   group: 'story', name: 'King of the Ward',   desc: 'Win THE WARD CUP',             stat: 'story', story: 'ward_cup', target: 1, reward: { box: 'party' } },
    { id: 'finalist',     group: 'story', name: 'Big Final Energy',   desc: 'Reach 3 cup finals',           stat: 'finals', target: 3,  reward: { box: 'street', n: 2 } },
    { id: 'star_chaser',  group: 'story', name: 'Star Chaser',        desc: 'Earn 3 story stars',           stat: 'stars', target: 3,   reward: { box: 'legend' } },
    /* ---------- phong cách ---------- */
    { id: 'unboxer',      group: 'style', name: 'Unboxer',            desc: 'Open 10 boxes',                stat: 'boxes', target: 10,   reward: { box: 'legend' } },
    { id: 'drip',         group: 'style', name: 'Drip',               desc: 'Own 15 different outfit items', stat: 'outfits', target: 15, reward: { item: 'bucket' } },
    { id: 'veteran',      group: 'style', name: 'Veteran',            desc: 'Reach LV 10',                  stat: 'level', target: 10,   reward: { item: 'cowboy' } },
  ],
};
