/* =========================================================
 * TUTORIAL CONFIG — nội dung màn Hướng dẫn (menu chính).
 * type: 'controls' = tự sinh bảng phím từ controls.config.js
 *       'cores'    = tự sinh danh sách Core từ cores.config.js
 * lines: các dòng giải thích; dòng bắt đầu bằng '#' là tiêu đề nhỏ.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.tutorial = {
  pages: [
    {
      title: 'CONTROLS',
      type: 'controls',
    },
    {
      title: 'PASS & SHOOT',
      lines: [
        '# Ground pass (S)',
        'Press S to pass instantly, no charging. The game picks the receiver and the power.',
        'Hold an arrow pointing at a teammate while pressing S → a clean pass, and the receiver runs onto it.',
        'No direction, or pointing off to the side → the ball goes toward the nearest teammate but always a little off in direction and power, and the receiver won\'t come for it. Chase it yourself.',
        '# Assisted pass (W / A)',
        'Hold W / A to charge, release to pass. The ball follows the arrow you are holding.',
        'A teammate in that direction → the ball locks onto them. Nobody there → it rolls straight that way.',
        'A light tap is already enough to reach them. The white mark on the bar = default power; charge past it for a firmer ball.',
        'The receiver runs to meet the ball. Press a new direction to take control.',
        '# Through ball & lob',
        'W: into the space ahead of your teammate. Hold longer → deeper.',
        'A: lofted over the defender\'s head.',
        '# Shooting',
        'Hold D to charge, release to shoot. The ball goes where your arrow points when you release (no arrow → dead center). The power bar starts low; the longer you hold, the harder the shot.',
        'Hold too long (red bar) → you shoot automatically, high and likely off target.',
        'Arrow pointing at the goal → accurate shot. Pointing wide of the post → it still goes to the nearest corner, but from an awkward stance: the wider you aim, the more likely it misses.',
        '# Clearance',
        'On the ball in your own half with an opponent still ahead of you (not counting their keeper): press D to boot a clearance up the pitch. ↑ / ↓ adjusts the angle.',
        'Nobody ahead of you → D is a normal shot, even from your own half.',
      ],
    },
    {
      title: 'DEFENSE',
      lines: [
        '# Defensive moves',
        'There are no tackles. Want the ball? Hit someone.',
        'D: LIGHT ATTACK. A short straight punch. Brief stun + knockback, may knock the ball loose. Short cooldown.',
        'A: HARD ATTACK. Wind up your leg (red aura, you can still turn), then kick. Hit: the opponent flies across the pitch, long stun, always drops the ball. Miss: long recovery. Long cooldown.',
        'Cooldowns show on the skill bar at the bottom center of the screen. Faded slot = your team has the ball (you can\'t attack).',
        'Z (dash) at the right moment when they attack → DODGE.',
        'Intercepting: a pass that goes through your reach can be cut out. Slower passes and passes straight at you are easier to cut. Miss the cut → the ball clips you and keeps going.',
        'An AI teammate playing FORWARD presses the ball carrier to win it back. An AI teammate playing DEFENDER stays home and only steps up when you are far from the ball.',
        'Q: switch to the player closest to the ball.',
        '# Guarding the goal',
        'No fixed goalkeeper: whoever stands in your own box becomes the keeper (gloves on). They can catch lobs and make saves.',
        'Catch the ball in your box → you can\'t be tackled for a few seconds. Dribbling into your box yourself gives no protection.',
        'An AI DEFENDER drops back to guard the goal when the opponent brings the ball close. An AI FORWARD only drops back when it is really dangerous: the opponent is right at goal and you are not in the box. Otherwise, the goal is your job!',
        'Harder shots and shots into the corners are harder to save.',
      ],
    },
    {
      title: 'MATCH RULES',
      lines: [
        '# Street 2v2',
        'Two players per team, split attack / defense however you like. Matches last 2:30.',
        '# Control mode (Solo)',
        'WHOLE TEAM: Q switches player, and passing hands you control of the receiver.',
        'ONE PLAYER: you control only the player you picked for the whole match; your teammate is AI. Call for the ball with S / W / A. An AI FORWARD loves to dribble, shoot and press to win the ball; an AI DEFENDER stays home, marks and feeds you passes.',
        'The ball bounces off the walls like street futsal. No out of bounds.',
        '# Training',
        'Your team has 1 or 2 players, the opponent 0 or 2. No clock, no score, no Core draft, no rewards.',
        '# Final Push',
        'Last 30 seconds: every goal counts x2 and players run faster.',
        '# Golden Goal',
        'Tied at full time → next goal wins (up to 60 seconds).',
      ],
    },
    {
      title: 'CORES',
      type: 'cores',
      lines: [
        'After every goal, while the ball is dead, both teams pick 1 of 3 Cores (up to 4 times per match).',
        'Cores change how you play: fire shots, illusion dashes, goal shields, chaos balls...',
        'You can only draw Cores you have unlocked. You start with 6 basic Cores; get more from the Core Box in the SHOP (each Core needs a certain level before you can use it).',
      ],
    },
    {
      title: 'SHOP',
      lines: [
        '# Your character',
        'Your character takes the pitch with your name, wearing the team kit you picked. Solo ONE PLAYER: choose to play DEFENDER or FORWARD (the AI teammate takes the other spot). WHOLE TEAM / online: you play FORWARD.',
        'CHARACTER: change your name, skin color and hair color (free), open the INVENTORY to mix and match costumes.',
        '# XP & Gold',
        'Finish a match (solo / online) to earn XP + gold: win > draw > loss, plus a bonus per goal scored.',
        'Solo on HARD gives x1.5 rewards, EASY x0.6. Online pays more than solo.',
        'Every level up gives bonus gold. Quitting mid-match gives nothing.',
        '# Shop: gacha boxes',
        'Spend gold to open boxes: the item reel spins and stops on your prize. Rarities: COMMON · RARE · EPIC · LEGENDARY · MYTHIC.',
        'Street Box / Legend Box drop costumes (hair & hats, face, shoes, trail FX). The Core Box drops Core Upgrades.',
        '# Inventory',
        'Enter: equip · X: dismantle an item for gold (rare items need 2 presses) · R: dismantle all duplicates · Q / E: switch tab.',
      ],
    },
    {
      title: 'ONLINE',
      lines: [
        '# 1 vs 1 Versus',
        'One player picks CREATE ROOM and sends the 5-character room code to a friend.',
        'The other picks JOIN ROOM, types the code and presses Enter.',
        'Each player picks a team, then the host presses START.',
        '# Connection',
        'The match runs on the host\'s machine; the other machine sends inputs and receives the picture.',
        'The two machines connect directly (P2P). You need Internet for the handshake when joining.',
        'In online matches Esc only opens the menu; the match keeps running.',
      ],
    },
  ],
};
