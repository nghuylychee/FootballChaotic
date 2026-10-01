/* PixelIcon — icon pixel art thay cho emoji trong UI (Core, trường phái, Area, biểu tượng giao diện).
 * Mỗi icon là lưới 12x12 ký tự (bảng màu PAL, '.' = trong suốt), render 1 lần ra canvas 14x14 kèm viền mực 1px tự động,
 * rồi gắn thành CSS class .pxi-<key> (ảnh nền data URL) -> HTML chỉ là <x-px class="pxi pxi-core-fire_shot"></x-px>.
 * Icon có thể mượn hình icon khác: { ref: 'key', map: { màu cũ: màu mới } }.
 * Chưa vẽ icon nào thì trả về emoji cũ (fallback) để UI không vỡ.
 * Dùng: SFC.PixelIcon.core(id) · .arch(tag) · .area(id) · .ui(name) · .res(name) — thêm class 'x2' / 'x3' để phóng to đúng bội số pixel.
 */
window.SFC = window.SFC || {};

(function () {
  const INK = '#140c16';
  const PAL = {
    k: INK, w: '#ffffff', l: '#c7ccd6', e: '#8b93a3', E: '#4a4f5c',
    y: '#ffe14f', Y: '#c9a227', o: '#ff9a3d', O: '#c4621a', r: '#ff3d5a', R: '#a8203a', p: '#ff7ab8',
    m: '#c63dff', M: '#7a1f9e', v: '#9d7bff', V: '#5b3fb0', b: '#4b69ff', B: '#2a3a9a', c: '#3ff6ff', C: '#1ea0b0',
    g: '#6bff4f', G: '#2f9a3a', n: '#a8683a', N: '#6a3d20', s: '#f2c79a', S: '#c98f5f', a: '#a8e6ff',
  };

  /* ---------- hình ---------- */
  const ART = {
    /* giao diện */
    'ui-lock': ['....llll....', '...l....l...', '...l....l...', '...e....e...', '..yyyyyyyy..', '..yyyyyyyy..', '..yyykkyyy..', '..yyykkyyy..', '..yyyykyyy..', '..YYYYYYYY..', '..YYYYYYYY..', '............'],
    'ui-crown': ['............', '............', 'y....yy....y', 'yy..yyyy..yy', 'yyy.yyyy.yyy', 'yyyyyyyyyyyy', 'yyryyccyyryy', 'yyyyyyyyyyyy', 'YYYYYYYYYYYY', '............', '............', '............'],
    'ui-star': ['.....y......', '.....y......', '....yyy.....', 'yyyyywyyyyy.', '.yyyywyyyy..', '..yyyyyyy...', '..yyyyyyy...', '.yyyyYyyyy..', '.yyY...YyY..', 'yY.......Yy.', '............', '............'],
    'ui-gift': ['...y....y...', '....y..y....', '.....yy.....', '.rrrryyrrrr.', '.RRRRyyRRRR.', '..rrryyrrr..', '..rrryyrrr..', '..rrryyrrr..', '..rrryyrrr..', '..RRRyyRRR..', '............', '............'],
    'ui-trophy': ['............', '..yyyyyyyy..', 'yyyyyyyyyyyy', 'y.yyyyyyyy.y', 'y.yyyyyyyy.y', '.yyyyyyyyyy.', '...yyyyyy...', '.....yy.....', '.....YY.....', '....yyyy....', '...YYYYYY...', '............'],
    'ui-check': ['............', '..........g.', '.........gg.', '........gg..', '.......gg...', 'g.....gg....', 'gg...gg.....', '.gg.gg......', '..ggg.......', '...g........', '............', '............'],
    'ui-unknown': ['....llll....', '...llllll...', '..ll....ll..', '........ll..', '.......ll...', '......ll....', '.....ll.....', '.....ll.....', '............', '.....ll.....', '.....ll.....', '............'],
    'ui-fist': ['............', '....sssss...', '...sSsSsSs..', '..ssSsSsSss.', '..sssssssss.', '..sSSSSSSss.', '..ssssssss..', '...sssssss..', '....SSSSS...', '....nnnnn...', '....nnnnn...', '............'],
    'ui-boom': ['.....o......', '.o...oo...o.', '..o.oyyo.o..', '..ooyyyyoo..', '.ooyywwyyoo.', 'ooyywwwwyyoo', '.ooyywwyyoo.', '..ooyyyyoo..', '..o.oyyo.o..', '.o...oo...o.', '.....o......', '............'],
    'ui-dash': ['............', '............', '......llll..', '.wwwwl....l.', '.........l..', '..wwwwwwll..', '............', '.wwwwwwwll..', '.........l..', '..wwwl....l.', '......llll..', '............'],
    'ui-card': ['..vvvvvvvv..', '..vwwwwwwv..', '..vwbbbbwv..', '..vwbyybwv..', '..vwbyybwv..', '..vwbbbbwv..', '..vwwwwwwv..', '..vwkkkkwv..', '..vwwwwwwv..', '..vwkkkwwv..', '..vwwwwwwv..', '..vvvvvvvv..'],
    // cọc tập xanh lá: hình của thẻ DRILL (túi đồ, màn mở thẻ drill)
    'ui-cone': ['.....gg.....', '.....gG.....', '....wwww....', '....ggGg....', '....ggGg....', '...wwwwww...', '...gggGgg...', '..ggggGggg..', '..wwwwwwww..', '..gggggGgg..', 'GGGGGGGGGGGG', '.GGGGGGGGGG.'],

    /* lọc slot costume (túi đồ -> APPEARANCE) */
    'slot-hair': ['............', '....rrrr....', '...rrrrrr...', '..rrwrrrrr..', '..rrrrrrrr..', '..RRRRRRRR..', '..RRRRRRRRrr', '.........rrr', '............', '............', '............', '............'],
    'slot-face': ['...ssssss...', '..ssssssss..', '.ssssssssss.', '.sskksskkss.', '.sskksskkss.', '.ssssssssss.', '.ssssssssss.', '.ssksssskss.', '..sskkkkss..', '...ssssss...', '............', '............'],
    'slot-shoes': { ref: 'core-heavy_boot' },
    'slot-fx': { ref: 'core-one_touch' },

    /* tài nguyên */
    'res-momentum': ['.......yyy..', '......yyy...', '.....yyy....', '....yyy.....', '...yyyyyyy..', '..yyyyyyy...', '......yyy...', '.....yyy....', '....yyy.....', '...yy.......', '..yy........', '..y.........'],
    'res-rhythm': ['......yyyy..', '......y..yy.', '......y...y.', '......y.....', '......y.....', '......y.....', '......y.....', '...yyyy.....', '..yyyyy.....', '..yyyyy.....', '...yyy......', '............'],
    'res-rage': ['.....r......', '.....rr.....', '....rrr..r..', '...rrorr.rr.', '..rrroorrrr.', '..rrooyoorr.', '.rrooyyyoorr', '.rroyyyyyorr', '.rroyywyyorr', '..rooyyyoor.', '...rrooorr..', '............'],
    'res-guard': ['.eeeeeeeeee.', '.elllllllle.', '.elwwllllle.', '.elwlllllle.', '.elllllllle.', '.elllllllle.', '..elllllle..', '..elllllle..', '...elllle...', '....elle....', '.....ee.....', '............'],

    /* trường phái */
    'arch-runner': ['............', '............', '....cccc....', 'w...cccc....', 'ww..ccccc...', 'www.cccwcwcc', '.ww.cccccccc', '..w.CCCCCCCC', '....wwwwwwww', '............', '............', '............'],
    'arch-playmaker': ['....yyyyyyy.', '....yyyyyyy.', '....y.....y.', '....y.....y.', '....y.....y.', '....y.....y.', '..yyy...yyy.', '.yyyy..yyyy.', '.yyyy..yyyy.', '..yy....yy..', '............', '............'],
    'arch-striker': ['....rrrr....', '..rrrrrrrr..', '.rrwwwwwwrr.', '.rwwrrrrwwr.', 'rrwrrrrrrwrr', 'rrwrrwwrrwrr', 'rrwrrwwrrwrr', 'rrwrrrrrrwrr', '.rwwrrrrwwr.', '.rrwwwwwwrr.', '..rrrrrrrr..', '....rrrr....'],
    'arch-brawler': ['....rrrrr...', '...rrrrrrr..', '..rrrrrrrrr.', '..rrwrrrrrr.', '.rrrrrrrrrr.', '.rrrrrrRrrr.', '.rrrrrrRrr..', '..rrrrrrrr..', '...RRRRRR...', '...wwwwww...', '...eeeeee...', '............'],
    'arch-launcher': ['............', '..vv........', '..vv........', '..vv........', '..vvv.......', '..vvvvvv.www', '..vvvvvvwwkw', '..VVVVVVwkkk', '........wwkw', '.........www', '............', '............'],
    'arch-trickster': ['..vvvvvvvv..', '.v........v.', '.v.vvvvvv.v.', '.v.v....v.v.', '.v.v.vv.v.v.', '.v.v.v..v.v.', '.v.v.vvvv.v.', '.v.v......v.', '.v.vvvvvvvv.', '.v..........', '..vvvvvvvv..', '............'],
    'arch-iron': ['.llllllllll.', '.lwwleellll.', '.lwlleellll.', '.lllleellll.', '.eeeeeeeeee.', '.lllleellll.', '..llleelll..', '..llleelll..', '...lleell...', '....leel....', '.....ee.....', '............'],
    'arch-chaos': ['............', '.mmmmmmmmmm.', '.mwwmmmmwwm.', '.mwwmmmmwwm.', '.mmmmwwmmmm.', '.mmmmwwmmmm.', '.mwwmmmmwwm.', '.mwwmmmmwwm.', '.mmmmmmmmmm.', '.MMMMMMMMMM.', '............', '............'],

    /* Area */
    'area-village': ['.....y......', '....yyy.....', '...y.y.y....', '....yyy.....', '...y.y.y....', '....yyy.....', '...y.y.y....', '.....G......', '.....G......', '.....G......', '....GGG.....', '............'],
    'area-alley': ['.....ee.....', '..eeeeeeee..', '.EEEEEEEEEE.', '..lelelele..', '..lelelele..', '..lelelele..', '..lelelele..', '..lelelele..', '..lelelele..', '..eeeeeeee..', '............', '............'],
    'area-school': ['.....yy.....', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '.rrrrrrrrrr.', '..nnnnnnnn..', '..nwwnnwwn..', '..nwwnnwwn..', '..nnnNNnnn..', '..nnnNNnnn..', '.EEEEEEEEEE.', '............'],
    'area-rooftop': ['.......BB...', '......BBBB..', '..BB..ByBB..', '..BB..BBBB..', '.BBBB.BByB.B', '.ByBBBBBBBBB', '.BBBBByBBBBB', '.BByBBBBByBB', '.BBBBBBBBBBB', '.BBBByBBBBBB', '.EEEEEEEEEEE', '............'],
    'area-market': ['.....NN.....', '....yyyy....', '..rrrrrrrr..', '.rrrRrrRrrr.', '.rrrRrrRrrr.', '.rrrRrrRrrr.', '.rrrRrrRrrr.', '.rrrRrrRrrr.', '..rrrrrrrr..', '....yyyy....', '.....yy.....', '.....y......'],
    'area-harbor': ['.....ll.....', '....l..l....', '.....ll.....', '..llllllll..', '.....ll.....', '.....ll.....', '.....ll.....', 'l....ll....l', 'll...ll...ll', '.ll..ll..ll.', '..llllllll..', '....llll....'],
    'area-cage': ['....llll....', '...l....l...', '...l....l...', '...l....l...', '....llll....', '.....ee.....', '.....ee.....', '....llll....', '...l....l...', '...l....l...', '...l....l...', '....llll....'],
    'area-plaza': ['.y........y.', '.E........E.', '.E.llllll.E.', '.ElllllllllE', 'llllllllllll', 'lGGGGGGGGGGl', 'lGGGwwwwGGGl', 'lGGGGGGGGGGl', 'llllllllllll', '.eeeeeeeeee.', '............', '............'],
    'area-cyber': ['............', '..c......c..', '...c....c...', '..cccccccc..', '.cc.cccc.cc.', 'cccccccccccc', 'c.cccccccc.c', 'c.c......c.c', '...cc..cc...', '............', '............', '............'],
    'area-stadium': { ref: 'ui-trophy' },

    /* Core */
    'core-sniper_foot': ['.....rr.....', '.....rr.....', '...rrrrrr...', '..rr.rr.rr..', '..r..rr..r..', 'rrrrr..rrrrr', 'rrrrr..rrrrr', '..r..rr..r..', '..rr.rr.rr..', '...rrrrrr...', '.....rr.....', '.....rr.....'],
    'core-banana_kick': ['..gggggg....', '.ggGGGGgg...', 'gg......gg..', 'gg...www.gg.', 'gg..wwkww...', 'gg..wkkkw...', 'gg..wwkww...', 'gg...www....', 'gg......g...', '.ggGGGGggg..', '..gggggggg..', '............'],
    'core-fire_shot': ['r......o....', '.r...oo.....', '..roooyo....', '..ooyyyyo...', '.ooyywwwyo..', '.oyywwkwwyo.', '.oyywkkkwyo.', '.oyywwkwwyo.', '..oyywwwyo..', '...ooyyyo...', '.....ooo....', '............'],
    'core-thunder_kick': { ref: 'res-momentum', map: { y: 'c' } },
    'core-speed_demon': ['............', '.........ww.', '.......wwww.', '.....wwwwcw.', '...wwwwwcc..', '..wwwwwccc..', '.wwwwcccc...', 'wwwwcccc....', '.wwccc......', '..cc........', '............', '............'],
    'core-phantom_step': { ref: 'arch-trickster', map: { v: 'p' } },
    'core-fake_run': ['...nnnnnn...', '..nlllwwln..', '..nllllwln..', '..nlllllwn..', '..nlllllln..', '..nlllllln..', '..nlllllln..', '...nnnnnn...', '.....nn.....', '.....nn.....', '....nnnn....', '............'],
    'core-street_fighter': { ref: 'arch-brawler' },
    'core-iron_body': { ref: 'res-guard' },
    'core-blade_runner': ['.....cccc...', '...cccc.....', '..ccc.......', '.cccw.......', '.ccw........', '.ccw........', '.cccw.......', '..ccc.......', '...cccc.....', '.....cccc...', '............', '............'],
    'core-aegis_wall': ['....cccc....', '..cc....cc..', '.c...cc...c.', 'c...cccc...c', 'c..cccccc..c', 'c..cccccc..c', 'c...cccc...c', '.c...cc...c.', '..cc....cc..', '....cccc....', '............', '............'],
    'core-counter_attack': ['............', '....b.......', '...bb.......', '..bbbbbbbb..', '.bbbbbbbbbb.', '..bb.....bb.', '...b.....bb.', '.........bb.', '.........bb.', '....bbbbbbb.', '....bbbbbb..', '............'],
    'core-emp_trap': ['............', '.c.......c..', '..c.....c...', '...c.y.c....', '.....y......', '....EEE.....', '..EEEEEEE...', '.EEEcccEEE..', '.EEEcccEEE..', '..EEEEEEE...', '............', '............'],
    'core-maestro': { ref: 'arch-playmaker' },
    'core-lightning_dash': ['............', '.......yyy..', 'cc....yyy...', '.....yyy....', 'ccc.yyyyyy..', '...yyyyyy...', 'cc....yyy...', '.....yyy....', 'cc..yyy.....', '...yy.......', '..y.........', '............'],
    'core-burst_start': ['............', '......o.....', '......oo....', '......ooo...', 'e.e.ooooooo.', '.eeeoooooooo', 'e.e.ooooooo.', '......ooo...', '......oo....', '......o.....', '............', '............'],
    'core-sonic_boom': ['....cccc....', '..cc....cc..', '.c..cccc..c.', '.c.c....c.c.', 'c.c..ww..c.c', 'c.c.wwww.c.c', 'c.c.wwww.c.c', 'c.c..ww..c.c', '.c.c....c.c.', '.c..cccc..c.', '..cc....cc..', '....cccc....'],
    'core-freight_train': ['............', '.rrrrrrr....', '.rrrrrrr....', '.rrrrrrrbb..', '.rrrrrrrbwb.', '.rrrrrrrbbbb', '.RRRRRRRbbbb', '..EE....EE..', '..EE....EE..', '............', '............', '............'],
    'core-eagle_eye': ['............', '....yyyy....', '..yywwwwyy..', '.ywwwnnwwwy.', 'ywwwnkknwwwy', 'ywwwnkknwwwy', '.ywwwnnwwwy.', '..yywwwwyy..', '....yyyy....', '............', '............', '............'],
    'core-one_touch': ['.....y......', '.....y......', '....yyy.....', '.yyyywyyyy..', '....yyy.....', '.....y....y.', '.....y...yyy', '..........y.', '..y.........', '.yyy........', '..y.........', '............'],
    'core-phantom_pass': ['............', '............', '............', '.VVV.vvv.www', 'VVVVvvvvwwkw', 'VVVVvvvvwkkk', 'VVVVvvvvwwkw', '.VVV.vvv.www', '............', '............', '............', '............'],
    'core-symphony': ['..........N.', '.........N..', '........k...', '.......k....', '....nnnk....', '...nnnnn....', '..nnkknn....', '..nnnnnn....', '.nnnkknn....', '.nnnnnn.....', '..nnnn......', '............'],
    'core-energy_wave': ['............', '.....bbbb...', '....bccccb..', '...bcw....b.', '...bc.......', '..bcc...bb..', '..bccbbbcb..', '.bcccccccb..', 'bcccccccccb.', 'bbbbbbbbbbbb', '............', '............'],
    'core-black_hole': ['....vvvv....', '..vvVVVVvv..', '.vVVkkkkVVv.', '.vVkkkkkkVv.', 'vVkkkkkkkkVv', 'vVkkkkkkkkVv', '.vVkkkkkkVv.', '.vVVkkkkVVv.', '..vvVVVVvv..', '....vvvv....', '............', '............'],
    'core-fist_storm': ['............', '...ssssss...', '..ssSsSsSs..', 'e.sssSsSsSs.', '..ssssssssS.', 'e.sssssssss.', '..sSSSSsss..', 'e..ssssss...', '...nn.......', '............', '............', '............'],
    'core-giant_fist': ['............', '...sSsSsSs..', '..ssSsSsSss.', '..ssSsSsSss.', '..sssssssss.', '..SSsssssss.', '...sssssss..', '...sssssss..', '....sssss...', '....rrrrr...', '....rrrrr...', '............'],
    'core-heavy_boot': ['............', '...eeee.....', '...eeee.....', '...eeee.....', '...eeee.....', '...eeeelll..', '...eeeeeeel.', '..eeeeeeeee.', '..EEEEEEEEE.', '............', '............', '............'],
    'core-juggle': ['.....ww.....', '....wkkw....', '....wkkw....', '.....ww.....', '.ww......ww.', 'wkkw....wkkw', 'wkkw....wkkw', '.ww......ww.', '............', '...s....s...', '..sss..sss..', '............'],
    'core-wall_slam': ['NNNNNNNNNNNN', 'nnnnNnnkNnnn', 'nnnnNnnkNnnn', 'NNNNNNkNNNNN', 'nnNnnnkknNnn', 'nnNnnnnkkNnn', 'NNNNNNNNkNNN', 'nnnnNnnnkNnn', 'nnnnNnnnnknn', 'NNNNNNNNNNNN', '............', '............'],
    'core-ground_slam': ['............', '............', '.....yy.....', '..o..yy..o..', '...o.yy.o...', '....oyyo....', '.nnnnnnnnnn.', 'nnnnkknnnnnn', 'nNnkNNknnNnn', 'NNkNNNNkNNNN', '............', '............'],
    'core-quick_feet': ['...EEEEEE...', '..EEEEEEEE..', '.rrrrrrrrrrr', '.EssssssssEr', '.EskssssksE.', '.EEEEEEEEEE.', '.EEEEEEEEEE.', '..EEEEEEEE..', '...EEEEEE...', '............', '............', '............'],
    'core-witch_time': ['.nnnnnnnnnn.', '..wwwwwwww..', '..wyyyyyyw..', '...wyyyyw...', '....wyyw....', '.....ww.....', '....w..w....', '...w.yy.w...', '..wyyyyyyw..', '..wwwwwwww..', '.nnnnnnnnnn.', '............'],
    'core-shadow_clone': ['............', '.......vv...', '..VV..vvvv..', '.VVVV.vvvv..', '.VVVV..vv...', '..VV..vvvvv.', '.VVVVvvvvvvv', 'VVVVVVvvvvvv', 'VVVVVVvvvvvv', '............', '............', '............'],
    'core-bulldozer': ['............', '....yyyy....', '....ywwy....', '..yyyyyyyy..', 'E.yyyyyyyy..', 'EEyyyyyyyy..', 'E.EEEEEEEE..', 'E.EkEEkEEk..', '..EEEEEEEE..', '............', '............', '............'],
    'core-giant_keeper': ['...g.g.g....', '..gg.g.g.g..', '..gg.g.g.g..', '..gggggggg..', '..gggggggg..', 'gggggggggg..', '.ggggggggg..', '..gggggggg..', '...gggggg...', '...wwwwww...', '...wwwwww...', '............'],
    'core-rubber_arm': ['............', '............', '........sss.', '.......sSsSs', 'rrssssssssss', 'rrssssssssss', '.......sssss', '........SSS.', '............', '............', '............', '............'],
    'core-uppercut': ['.y........y.', '.yy......yy.', '..gggggggg..', '.gggggggggg.', '.ggrgggggrg.', '.gggggggggg.', '.gGggggggGg.', '..gggggggg..', '..gwgwwgwg..', '...gggggg...', '............', '............'],
    'core-iron_fist': { ref: 'ui-fist', map: { s: 'l', S: 'e', n: 'E' } },
    'core-one_two': ['...oooooo...', '..oooooooo.o', '.oo......ooo', '.oo.....oooo', '.oo.........', '............', '.........oo.', 'oooo.....oo.', 'ooo......oo.', 'o.oooooooo..', '...oooooo...', '............'],
    'core-captain': ['..bbb..rrr..', '...bbb.rr...', '....bbrr....', '.....br.....', '....yyyy....', '...yyyyyy...', '..yyyYYyyy..', '..yyYyyYyy..', '..yyyYYyyy..', '...yyyyyy...', '....yyyy....', '............'],
    'core-counter_strike': ['ll........ll', 'lll......lll', '.lll....lll.', '..lll..lll..', '...llllll...', '....llll....', '...ylllllly.', '..yy.ll.yy..', '.nn......nn.', 'nn........nn', '............', '............'],
    'core-flying_kick': ['............', '............', '..rr........', '..rrrwwwww..', 'yoorwwwbwwr.', 'oyyrwwwwwwwr', 'yoorwwwbwwr.', '..rrrwwwww..', '..rr........', '............', '............', '............'],
    'core-ghost_ball': ['....wwww....', '..wwwwwwww..', '.wwwwwwwwww.', '.wwkkwwkkww.', '.wwkkwwkkww.', '.wwwwwwwwww.', '.wwwwkkwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.ww.ww.ww.w.', '............', '............'],
    'core-scissor_kick': ['l..........l', 'll........ll', '.ll......ll.', '..ll....ll..', '...ll..ll...', '....llll....', '.....ll.....', '....rrrr....', '..rr....rr..', '.r..r..r..r.', '.r..r..r..r.', '..rr....rr..'],
    'core-endless_tiki': ['............', '............', '.yyy....yyy.', 'yyyyy..yyyyy', 'yy..yyyy..yy', 'yy...yy...yy', 'yy..yyyy..yy', 'yyyyy..yyyyy', '.yyy....yyy.', '............', '............', '............'],
    'core-meteor_strike': ['r...........', '.ro.........', '..roo.......', '...rooo.....', '....roowww..', '.....owwkww.', '......wkkkw.', '......wwkww.', '.......www..', '............', '............', '............'],
    'core-hundred_fists': ['............', '...rr..rr...', '...rr..rr...', '.rrrr..rrrr.', '.rr......rr.', '............', '............', '.rr......rr.', '.rrrr..rrrr.', '...rr..rr...', '...rr..rr...', '............'],
    'core-meteor_drop': ['...r.oo.r...', '....ooyo....', '...roooyr...', '...ooyyoo...', '....oyyo....', '...nnnnnn...', '..nnNnnnnn..', '..nnnnnNnn..', '..nNnnnnnn..', '...nnnnnn...', '............', '............'],
    'core-clone_army': ['............', '.VV..vv..ww.', 'VVVVvvvvwwww', 'VVVVvvvvwwww', '.VV..vv..ww.', 'VVVVvvvvwwww', 'VVVVvvvvwwww', 'VVVVvvvvwwww', 'VVVVvvvvwwww', '............', '............', '............'],
    'core-titan': ['...eeeeee...', '..eeeeeeee..', '..EEEEEEEE..', '..eeEeeEee..', '..eeeeeeee..', '..eeeEEeee..', '..eeeEEeee..', '..eeeeeeee..', '..eeEEEEee..', '..eeeeeeee..', '.eeeeeeeeee.', '............'],
    'core-aura_farming': ['.y...yy...y.', '.yy..yy..yy.', '.yyy.yy.yyy.', '..yyyyyyyy..', '.yyyyyyyyyy.', '.yYyyYYyyYy.', '..ssssssss..', '..skksskks..', '..ssssssss..', '...sskkss...', '...ssssss...', '....ssss....'],
    'core-bomb_ball': ['.........y..', '........yoy.', '.......n.y..', '......n.....', '...EEEEE....', '..EEEEEEE...', '.EElEEEEEE..', '.ElEEEEEEE..', '.EEEEEEEEE..', '.EEEEEEEEE..', '..EEEEEEE...', '...EEEEE....'],
    'core-chaos_ball': { ref: 'arch-chaos' },
    'core-warp_walls': ['....vvvv....', '..vvccccvv..', '.vccvvvvccv.', '.vcvwwwwvcv.', 'vcvwwkkwwvcv', 'vcvwkkkkwvcv', 'vcvwkkkkwvcv', 'vcvwwkkwwvcv', '.vcvwwwwvcv.', '.vccvvvvccv.', '..vvccccvv..', '....vvvv....'],

    /* hiệu ứng trail của costume (progression.items, slot fx) */
    'fx-sparkle': { ref: 'core-one_touch' },
    'fx-bubbles': ['......cccc..', '.....caaawc.', '.....caaaac.', '.....caaaac.', '......cccc..', '.ccc........', 'caawc.......', 'caaac..ccc..', '.ccc..caawc.', '......caaac.', '.......ccc..', '............'],
    'fx-leaves': ['.........gg.', '.......gggg.', '.....gggGgg.', '....ggGggg..', '...ggGggg...', '...gGggg....', '..Gggg......', '.G..........', 'G.....gg....', '.....gGgg...', '......ggg...', '............'],
    'fx-hearts': ['............', '.rr..rr.....', 'rrrrrrrr....', 'rwrrrrrr....', 'rrrrrrrr....', '.rrrrrr.....', '..rrrr..p.p.', '...rr..ppppp', '.......ppppp', '........ppp.', '.........p..', '............'],
    'fx-snow': ['.....w......', '...w.w.w....', '....www.....', '.w...w...w..', '..ww.w.ww...', 'wwwwwawwwww.', '..ww.w.ww...', '.w...w...w..', '....www.....', '...w.w.w....', '.....w......', '............'],
    'fx-smoke': ['............', '.....llll...', '...llllllll.', '..lllwlllll.', '.llllllllle.', '..eelllllee.', '....eeee....', '..ll........', '.llll...ll..', '.lllee.llll.', '..ee....ee..', '............'],
    'fx-dust': { ref: 'ui-dash', map: { w: 'S', l: 'n' } },
    'fx-notes': { ref: 'arch-playmaker', map: { y: 'c' } },
    'fx-confetti': ['.r....y...b.', '....g.....y.', '.b.....r....', '...y..b...g.', '.g...r......', '.....yy.r...', '....yyy.....', '...yyyy..b..', '..yyyyr.....', '.yyyrr......', 'yyrr........', 'yr..........'],
    'fx-petals': ['....pppp....', '...pppppp...', '.ppp.pp.ppp.', 'pppppyyppppp', 'ppppyyyypppp', '.ppppyypppp.', '..pp.pp.pp..', '...pppppp...', '..pppppppp..', '..ppp..ppp..', '...p....p...', '............'],
    'fx-coins': ['....yyyy....', '...yYYYYy...', '...yYyyYy...', '...yYYYYy...', '....yyyy....', '............', '.yyyy..yyyy.', 'yYYYYyyYYYYy', 'yYyyYyyYyyYy', 'yYYYYyyYYYYy', '.yyyy..yyyy.', '............'],
    'fx-neon': ['............', '..........gw', '........ggwg', '......ggwg..', '....ggwg....', '..ggwg......', 'ggwg........', 'gg..........', '............', '..........gg', '........gg..', '......gg....'],
    'fx-frost': ['............', '..aaaaaaaa..', '.awwaaaaaaC.', '.awaaaaaaaC.', '.aaaaaaaaaC.', '.aaaaawaaaC.', '.aaaaaaaaaC.', '.aaaaaaaaaC.', '.aaaaaaaaaC.', '..CCCCCCCC..', '............', '............'],
    'fx-lightning': { ref: 'res-momentum' },
    'fx-rainbow': ['............', '............', '...rrrrrr...', '.rroooooorr.', 'rooyyyyyyoor', 'royyggggyyor', 'roygbbbbgyor', 'roygb..bgyor', 'roygb..bgyor', 'roygb..bgyor', 'wwww....wwww', '............'],
    'fx-fire': { ref: 'res-rage' },
    'fx-shadow': { ref: 'core-ghost_ball', map: { w: 'v' } },
    'fx-galaxy': { ref: 'core-warp_walls', map: { c: 'm', w: 'y', k: 'w' } },
    'fx-aura': ['....y.......', '...yyy...y..', '....y...yyy.', '.........y..', '..yyyyyyyy..', '.yyYYYYYYyy.', 'yyY......Yyy', '.yyYYYYYYyy.', '..yyyyyyyy..', '............', '............', '............'],
  };

  // lưới pixel của 1 icon (theo ref + đổi màu)
  function grid(key, depth = 0) {
    const a = ART[key];
    if (!a || depth > 4) return null;
    if (Array.isArray(a)) return a;
    const base = grid(a.ref, depth + 1);
    if (!base || !a.map) return base;
    return base.map((row) => row.replace(/./g, (ch) => a.map[ch] || ch));
  }

  // vẽ 12x12 vào canvas 14x14 + viền mực quanh mọi pixel có màu (4 hướng)
  function render(rows) {
    const H = rows.length, W = rows[0].length, cv = document.createElement('canvas');
    cv.width = W + 2; cv.height = H + 2;
    const x = cv.getContext('2d');
    const on = (i, j) => i >= 0 && j >= 0 && i < H && j < W && rows[i][j] !== '.';
    x.fillStyle = INK;
    for (let i = -1; i <= H; i++) {
      for (let j = -1; j <= W; j++) {
        if (on(i, j)) continue;
        if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) x.fillRect(j + 1, i + 1, 1, 1);
      }
    }
    for (let i = 0; i < H; i++) {
      for (let j = 0; j < W; j++) {
        const ch = rows[i][j];
        if (ch === '.') continue;
        x.fillStyle = PAL[ch] || '#ff00ff';
        x.fillRect(j + 1, i + 1, 1, 1);
      }
    }
    return cv.toDataURL();
  }

  let ready = false;
  const cls = (key) => 'pxi-' + key.replace(/[^a-z0-9_-]/gi, '_');

  const PixelIcon = {
    ART, PAL,
    // tạo CSS class cho mọi icon (gọi 1 lần, tự gọi khi dùng lần đầu)
    init() {
      if (ready) return;
      ready = true;
      const css = [];
      for (const key in ART) {
        const rows = grid(key);
        if (rows) css.push(`.${cls(key)}{background-image:url(${render(rows)})}`);
      }
      const st = document.createElement('style');
      st.id = 'pixel-icons';
      st.textContent = css.join('\n');
      document.head.appendChild(st);
    },
    has(key) { return !!grid(key); },
    // html icon; chưa có hình -> emoji fallback. extra: class thêm (x2 / x3 / sil ...)
    html(key, fallback = '', extra = '') {
      if (!this.has(key)) return fallback ? `<span class="pxi-fb ${extra}">${fallback}</span>` : '';
      this.init();
      // thẻ riêng <x-px>: không dính các luật CSS cũ viết cho <i> / <span> / <b>
      return `<x-px class="pxi ${cls(key)} ${extra}"></x-px>`;
    },
    core(id, extra) { const c = SFC_CONFIG.cores.list[id]; return this.html('core-' + id, c && c.icon, extra); },
    arch(tag, extra) { const a = SFC_CONFIG.cores.archetypes[tag]; return this.html('arch-' + tag, a && a.icon, extra); },
    area(id, extra) { const a = SFC_CONFIG.mainPath.areas.find((x) => x.id === id); return this.html('area-' + id, a && a.icon, extra); },
    res(name, extra) { const r = SFC_CONFIG.cores.resources[name]; return this.html('res-' + name, r && r.icon, extra); },
    ui(name, extra) { return this.html('ui-' + name, '', extra); },
  };

  SFC.PixelIcon = PixelIcon;
})();
