/* pb scenes (PvP hooks P26-P50): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with pb_. Nothing here runs at load time except Object.assign.
   Online 3v3 like the current build: each in-game player is named + dressed as the made-up handle on his cam
   (same looks as portraits.py), and every player keeps one signature ultimate. */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, mark, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;

  // handle -> look (same as portraits.py: cut, face, fx, skin index, hair colour index)
  const LOOKS = {
    NGH: ['spiky', 'none', 'nofx', 0, 0], tuanbeo: ['cap', 'mustache', 'nofx', 2, 1], kaito_04: ['headphones', 'shades', 'nofx', 1, 0],
    zzz_mi: ['bun', 'blush', 'hearts', 1, 0], bigboss99: ['crown', 'goldtooth', 'nofx', 3, 1], xX_vex_Xx: ['mohawk', 'warpaint', 'nofx', 0, 2],
    mochi: ['beanie', 'nerd', 'nofx', 1, 1], DUKE: ['helmet', 'visor', 'nofx', 4, 0], 'panda.exe': ['bowl', 'cyborg', 'nofx', 0, 0],
    ratking: ['bandana', 'scar', 'smoke', 2, 0], jinx: ['longhair', 'eyepatch', 'nofx', 3, 2], m0le: ['afro', 'freckles', 'nofx', 4, 1],
  };
  const SQUAD = {
    street_kings: ['kaito_04', 'tuanbeo', 'NGH'],          // [DEF, MID, FWD] slots of the team
    neon_strikers: ['xX_vex_Xx', 'zzz_mi', 'bigboss99'],
    cyber_united: ['DUKE', 'mochi', 'panda.exe'],
    underground_fc: ['m0le', 'jinx', 'ratking'],
  };
  // one signature ultimate per player, the same in every PvP clip (coordinator's table)
  const ULT = { NGH: 'meteor_strike', tuanbeo: 'titan', kaito_04: 'lightning_dash', zzz_mi: 'aura_farming', bigboss99: 'hundred_fists', xX_vex_Xx: 'meteor_drop',
    mochi: 'clone_army', DUKE: 'endless_tiki', 'panda.exe': 'meteor_drop', ratking: 'hundred_fists', jinx: 'aura_farming', m0le: 'titan' };
  const drawLook = (team, h) => {
    const [cut, fc, fx, skin, hc] = LOOKS[h], kit = SFC_CONFIG.teams.list[team].kit, skins = SFC_CONFIG.teams.skins;
    return Object.assign({}, SFC_CONFIG.progression.defaultLook, { cut, face: fc, fx, shoes: 'kicks', skin: skins[skin % skins.length], hair: kit.hair[hc % kit.hair.length] });
  };

  // the director drives everyone: no keyboard handling for our player
  const noHuman = () => {
    if (!SFC.Human.__pb) {
      const h0 = SFC.Human.update;
      SFC.Human.update = function () { if (B.pbNoHuman) return; return h0.apply(this, arguments); };
      SFC.Human.__pb = true;
    }
    B.pbNoHuman = true;
  };
  // a forced roll for the next Math.random() calls (keeper SAVE / PARRY / SLIP outcome), null = the seeded roll
  const forceRoll = () => {
    if (Math.__pb) return;
    const r0 = Math.random;
    Math.random = function () { return B.pbRoll != null ? B.pbRoll : r0(); };
    Math.__pb = true;
  };
  const one = (g, re) => { const E = g.effects; E.V.comics = E.V.comics.filter((c) => !re.test(c.str || '')); };

  /* a live online-style 3v3: o.home / o.away kits, o.order0 / o.order1 = handles for [DEF, MID, FWD] slots,
     o.me = the handle we control (HUD ability bar), o.full = handles whose signature ultimate (ULT) is charged.
     returns { g, P: {handle: player}, T: [team0 players, team1 players] } */
  function pvp(o = {}) {
    noHuman();
    forceRoll(); B.pbRoll = null;
    const home = o.home || 'street_kings', away = o.away || 'neon_strikers';
    const n0 = o.order0 || SQUAD[home], n1 = o.order1 || SQUAD[away];
    const meIdx = Math.max(0, n0.indexOf(o.me || n0[2]));
    SFC.Profile.data.name = n0[meIdx];
    app.startMatch(Object.assign({ home, away, difficulty: 'hard', humanTeam: 0, solo: [meIdx, null], noDraft: true, avatars: null }, o.opts || {}));
    const g = app.game;
    if (!o.kickoff) { g.state = 'play'; g.stateT = 0; }
    B.puppets = new Set();
    g.aiHook = (p) => B.puppets.has(p);
    B.lib.hush();
    const P = {};
    [n0, n1].forEach((names, t) => g.teams[t].players.forEach((p, i) => {
      const h = names[i]; if (!h) return;
      p.name = h; p.look = drawLook(g.teams[t].id, h); p.avatar = true; P[h] = p;
    }));
    for (const [h, p] of Object.entries(P)) if (ULT[h]) sig(g, p, ULT[h], (o.full || []).includes(h));
    for (const [h, ids] of Object.entries(o.cores || {})) for (const id of ids) g.cores.add(P[h], id);
    return { g, P, T: [g.teams[0].players, g.teams[1].players] };
  }
  // give p signature ultimate `id` (replaces his default one); full = bar charged
  function sig(g, p, id, full) {
    const C = g.cores;
    for (const c of C.coresOf(p).slice()) if (C.def(c).role === 'ult') C.remove(p, c);
    p.ult = id; C.add(p, id);
    p.res.ult = full ? 1 : 0;
  }
  const puppet = (...ps) => { for (const p of ps) B.puppets.add(p); };
  const keep = (g, ...ps) => { for (const p of ps) g.ball.noPickup.set(p.id, 99); };
  const ready = (...ps) => { for (const p of ps) p.cd.light = p.cd.hard = p.cd.skill = 0; };
  // a pass in flight homes in on the receiver (readable, always arrives)
  const fly = (g, to, dt, spd = 260, home = 7) => {
    const b = g.ball;
    if (b.owner) return;
    const d = U.norm(to.x - b.x, to.y - b.y), s0 = Math.hypot(b.vx, b.vy) || 1, k = Math.min(1, dt * home);
    const vx = b.vx / s0 * (1 - k) + d.x * k, vy = b.vy / s0 * (1 - k) + d.y * k, n = Math.hypot(vx, vy) || 1;
    b.vx = vx / n * spd; b.vy = vy / n * spd; b.z = Math.min(b.z, 3); b.vz = Math.min(b.vz, 0);
  };
  const near = (a, b, r) => U.dist(a, b) < r;
  const wob = (p, x, y, t, ax = 0, ay = 6, w = 2) => steer(p, x + Math.sin(t * w) * ax, y + Math.sin(t * w) * ay, false);

  B.pb = { LOOKS, SQUAD, ULT, pvp, sig, puppet, keep, ready, fly, one, noHuman };

  Object.assign(B.SCENES, {
    /* test: plain 3v3 kickoff, AI plays */
    pb_test() {
      const { g } = pvp({});
      B.focusFn = () => g.ball;
    },

    /* P26 the rematch: NGH showboats with the ball by the top wall... bigboss99's HUNDRED FISTS, slammed into the wall */
    pb_fists() {
      const { g, P } = pvp({ full: ['bigboss99'] });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      place(BB, 296, 128, 0); place(NGH, 350, 126, PI); place(TB, 404, 222, PI); place(KA, 470, 262, PI); place(ZM, 236, 232, 0); place(VX, 180, 186, 0);
      give(g, NGH);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      let fired = false, slam = null;
      B.dir = (dt, g, t) => {
        steer(TB, 400, 215); steer(KA, 465, 255); steer(ZM, 240, 228); steer(VX, 190, 190);
        if (!fired) {
          still(BB); face(BB, NGH);
          if (NGH.state === 'normal') { steer(NGH, 350 + (Math.floor(t / 0.3) % 2 ? 8 : -6), 126, false); face(NGH, BB); }
        }
        if (!fired && t > (B.pbUltT || 0.8)) { fired = g.cores.activateUltimate(BB); if (fired) mark('ult'); }
        if (fired && BB.state === 'normal') still(BB);
        if (fired && NGH.state === 'normal') still(NGH);
        if (B.marks.ult != null && !slam && NGH.y <= g.field.y + NGH.radius + 2) { slam = { x: NGH.x, y: NGH.y + 34 }; mark('slam'); }
      };
      B.focusFn = () => slam || { x: (NGH.x + BB.x) / 2, y: 150 };
    },

    /* P27 the duo signal: tuanbeo slides it to NGH, one touch, METEOR SHOT -> goal */
    pb_duo() {
      const { g, P } = pvp({ full: ['NGH'] });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const G = g.attackGoal(0), b = g.ball;
      place(TB, 222, 262, 0); place(NGH, 282, 194, 0); place(KA, 170, 150, 0);
      place(VX, 344, 238, PI); place(ZM, 312, 134, PI); place(BB, G.x - 22, G.y, PI);
      give(g, TB);
      puppet(TB, KA, ZM, BB, VX); noAttack(TB, KA, ZM, BB, VX);
      keep(g, ZM, VX, BB, KA);
      let passed = false, got = false, fired = false;
      B.dir = (dt, g, t) => {
        steer(KA, 200, 150);
        if (!fired) { wob(BB, G.x - 22, G.y, t); face(BB, b); } else steer(BB, G.x - 18, G.y + 44, true);
        if (VX.state === 'normal') { if (!passed) steer(VX, 338, 236); else steer(VX, NGH.x + 40, NGH.y + 34, true); face(VX, b); }
        if (ZM.state === 'normal') { steer(ZM, 318, 140); face(ZM, b); }
        if (!passed) {
          TB.intent.mx = 0.3; TB.intent.my = 0;
          still(NGH); face(NGH, TB);
          if (t > 0.45) { face(TB, NGH); Act.quickPass(g, TB, NGH.x - TB.x, NGH.y - TB.y); passed = true; mark('pass'); }
          return;
        }
        steer(TB, 262, 262);
        if (!got) { still(NGH); face(NGH, b); if (b.owner === NGH) { got = true; mark('recv'); } return; }
        if (!fired) { still(NGH); face(NGH, G); if (B.t - B.marks.recv > 0.1) { fired = g.cores.activateUltimate(NGH); if (fired) mark('ult'); } return; }
        still(NGH);
        if (B.marks.goal == null && !b.owner && b.fx && b.fx.meteor) mark('shot');
      };
      B.focusFn = () => (B.marks.shot != null ? { x: Math.max(b.x, NGH.x + 30), y: b.y } : got ? { x: NGH.x + 30, y: NGH.y } : t0focus(TB, NGH));
    },

    /* P28 friendly fire: tuanbeo holds the bomb ball, passes it to kaito_04 at "1"... KABOOM on his own teammate */
    pb_bomb() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      place(TB, 300, 200, 0); place(KA, 356, 222, PI); place(NGH, 240, 150, 0);
      place(VX, 392, 206, PI); place(ZM, 262, 262, 0); place(BB, 440, 160, PI);
      g.cores.add(TB, 'bomb_ball');
      const st = g.cores.st(TB, 'bomb_ball');
      st.t = g.cores.params('bomb_ball').every - 0.02;
      give(g, TB);
      puppet(TB, KA, ZM, BB, VX); noAttack(TB, KA, ZM, BB, VX);
      keep(g, ZM, VX, BB, NGH);
      let short = false, passed = false, got = false;
      B.dir = (dt, g, t) => {
        if (!short && st.fuse > 0) { short = true; mark('bomb'); }
        steer(NGH, 250, 150); steer(BB, 440, 160); steer(ZM, 270, 255);
        if (VX.state === 'normal') { steer(VX, KA.x + 30, KA.y - 8); face(VX, KA); }
        if (!passed) {
          still(TB); face(TB, KA); still(KA); face(KA, TB);
          if (short && st.fuse < (B.pbPassAt || 0.95)) { Act.quickPass(g, TB, KA.x - TB.x, KA.y - TB.y); passed = true; mark('pass'); }
          return;
        }
        if (TB.state === 'normal') steer(TB, 250, 196, true);   // and walks away
        if (!got) { still(KA); face(KA, b); if (b.owner === KA) { got = true; mark('recv'); } return; }
        if (KA.state === 'normal') { still(KA); face(KA, TB); }
        if (B.marks.boom == null && st.fuse === 0 && short) mark('boom');
      };
      B.focusFn = () => (got ? { x: KA.x - 10, y: KA.y - 6 } : t0focus(TB, KA));
    },

    /* P29 no fixed keeper: tuanbeo + kaito_04 both walk out of the box arguing who keeps... bigboss99 rolls it into the empty net */
    pb_nokeeper() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball, OG = { x: 56, y: 203 };
      place(TB, 94, 176, 0); place(KA, 94, 232, 0); place(NGH, 340, 236, PI);
      place(BB, 262, 198, PI); place(ZM, 300, 142, PI); place(VX, 318, 262, PI);
      give(g, BB);
      puppet(TB, KA, ZM, BB, VX); noAttack(TB, KA, ZM, BB, VX);
      keep(g, TB, KA, NGH, ZM, VX);
      let shot = false;
      B.dir = (dt, g, t) => {
        // the argument: both step out to the edge of the box, facing each other, pointing at the goal now and then
        if (t < 1.6) { steer(TB, 132, 184, false); steer(KA, 130, 224, false); }
        else { still(TB); still(KA); }
        if (t > 0.35) { face(TB, KA); face(KA, TB); }
        if (t > 1.0 && t < 1.25) { TB.facing = PI; }
        steer(NGH, 300, 236, true); steer(ZM, 240, 150); steer(VX, 250, 262);
        if (!shot) {
          if (b.owner === BB) { BB.intent.mx = -0.42; BB.intent.my = 0.0; BB.intent.sprint = false; }
          if (t > (B.pbShotT || 1.5)) { face(BB, { x: OG.x, y: 203 }); Act.shoot(g, BB, 0.35, 0); shot = true; mark('shot'); }
        } else still(BB);
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.05 ? { x: Math.max(110, b.x + 20), y: 204 } : { x: (BB.x + 120) / 2 + 10, y: 204 });
    },

    /* P30 the reveal: matched vs Cyber United, mochi never used his ultimate... CLONE ARMY, 4 fakes run at us, we chase the fakes,
       he walks it in. (ZM / BB / VX here are mochi / DUKE / panda.exe) */
    pb_clones() {
      const { g, P } = pvp({ away: 'cyber_united', full: ['mochi'] });
      const { NGH, tuanbeo: TB, kaito_04: KA, mochi: ZM, DUKE: BB, 'panda.exe': VX } = P;
      const OG = { x: 56, y: 203 }, b = g.ball, E = g.effects;
      place(ZM, 262, 204, PI); place(KA, 204, 198, 0); place(TB, 192, 244, 0); place(NGH, 80, 203, 0);
      place(BB, 340, 140, PI); place(VX, 340, 262, PI);
      give(g, ZM);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, TB, KA, NGH, BB, VX);
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        steer(BB, 300, 140); steer(VX, 300, 262);
        const dec = (E.decoys || []).filter((d) => d.alive !== false);
        if (!fired) {
          still(ZM); face(ZM, OG);
          if (NGH.state === 'normal') { wob(NGH, 80, 203, t); face(NGH, b); }
          for (const o of [KA, TB]) if (o.state === 'normal') { steer(o, ZM.x - 40, o === KA ? 198 : 240); face(o, ZM); }
          if (t > (B.pbUltT || 0.5)) { fired = g.cores.activateUltimate(ZM); if (fired) mark('ult'); }
          return;
        }
        // each of us bites on a different fake
        const d0 = dec[0], d1 = dec[3] || dec[2], d2 = dec[1];
        if (KA.state === 'normal') { if (d0) steer(KA, d0.x, d0.y, true); else still(KA); }
        if (TB.state === 'normal') { if (d1) steer(TB, d1.x, d1.y, true); else still(TB); }
        if (NGH.state === 'normal') { if (!shot && d2 && B.t - B.marks.ult > 0.9) steer(NGH, 84, 160, true); else if (!shot) wob(NGH, 80, 203, t); else steer(NGH, 84, 158, true); }
        if (ZM.state !== 'normal') return;
        if (!shot && b.owner === ZM) {
          if (ZM.x - OG.x > (B.pbShootD || 125)) { ZM.intent.mx = -0.55; ZM.intent.my = 0.06; ZM.intent.sprint = true; }
          else { face(ZM, { x: OG.x, y: OG.y + 20 }); Act.shoot(g, ZM, 0.8, 0.5); shot = true; mark('shot'); }
        } else still(ZM);
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, OG.x + 50), y: OG.y } : fired ? { x: ZM.x - 40, y: 203 } : { x: ZM.x - 30, y: 205 });
    },

    /* P31 results flex: last second of a 4-0, the whistle, the real results screen (VICTORY, both teams' builds) */
    pb_results() {
      const C = { NGH: ['street_fighter', 'fist_storm', 'heavy_boot'], tuanbeo: ['maestro', 'one_touch', 'eagle_eye'], kaito_04: ['phantom_step', 'quick_feet', 'shadow_clone'],
        zzz_mi: ['fire_shot', 'sniper_foot'], bigboss99: ['iron_body', 'bulldozer'], xX_vex_Xx: ['speed_demon', 'burst_start'] };
      const { g, P } = pvp({ cores: C });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      g.teams[0].score = B.pbScore ? B.pbScore[0] : 5; g.teams[1].score = B.pbScore ? B.pbScore[1] : 0;
      g.elapsed = g.cfg.match.duration - (B.pbRem || 0.6); g.finalPush = true; g.cfg.match.goldenGoal = false;
      place(NGH, 470, 120, 0); place(TB, 400, 170, 0); place(KA, 300, 230, 0);
      place(BB, 500, 150, PI); place(ZM, 430, 110, PI); place(VX, 380, 240, PI);
      give(g, NGH);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      B.dir = (dt, g, t) => {
        // keep-ball in the corner while the clock dies
        NGH.intent.mx = Math.sin(t * 5) * 0.4; NGH.intent.my = -0.1;
        steer(BB, NGH.x + 18, NGH.y + 10, true); steer(ZM, NGH.x - 10, NGH.y - 4, true);
        steer(TB, 420, 170); steer(KA, 320, 220); steer(VX, NGH.x - 40, NGH.y + 60, true);
        if (g.state === 'ended') mark('end');
      };
      at(0.2, () => {
        g.humans = [0, 1];
        Object.defineProperty(SFC.UI, 'roomMatch', { get: () => true, configurable: true });
        Object.defineProperty(SFC.Session, 'isOwner', { get: () => true, configurable: true });
      });
      B.focusFn = () => ({ x: 320, y: 203 });
    },

    /* P32 "gg" vs "gg ez": zzz_mi typed gg, bigboss99 typed gg ez... three dropkicks land on bigboss99 at once, zzz_mi untouched */
    pb_ggez() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball, E = g.effects;
      place(BB, 352, 206, PI); place(ZM, 366, 150, PI); place(VX, 470, 250, PI);
      place(NGH, 286, 206, 0); place(TB, 304, 262, 0); place(KA, 300, 150, 0);
      give(g, BB);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, ZM, VX);
      let go = false, flew = false;
      B.dir = (dt, g, t) => {
        steer(VX, 470, 250); still(ZM); face(ZM, BB);
        if (BB.state === 'normal' && !go) { still(BB); BB.facing = PI + Math.sin(t * 6) * 0.6; }
        if (!go) {
          // the three close in on him (and walk past zzz_mi)
          for (const [p, dx, dy] of [[NGH, -24, 0], [TB, -14, 20], [KA, -14, -20]]) { steer(p, BB.x + dx, BB.y + dy, true); face(p, BB); }
          if (t > (B.pbKickT || 0.95)) {
            for (const p of [NGH, TB, KA]) { face(p, BB); p.cd.hard = 0; Act.hardAttack(g, p); }
            go = true; mark('kick');
          }
          return;
        }
        for (const p of [NGH, TB, KA]) if (p.state === 'normal') still(p);
        if (!flew && BB.state === 'stun') { flew = true; mark('fly'); }
      };
      B.focusFn = () => (flew ? { x: Math.min(BB.x, 470) - 30, y: 200 } : { x: 340, y: 200 });
    },

    /* P33 the silent carry: kaito_04 (never talks) LIGHTNING DASH through two defenders, finishes */
    pb_carry() {
      const { g, P } = pvp({ full: ['kaito_04'], me: 'kaito_04' });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const G = g.attackGoal(0), b = g.ball;
      place(KA, 316, 204, 0); place(VX, 366, 200, PI); place(ZM, 420, 208, PI); place(BB, G.x - 22, G.y, PI);
      place(NGH, 262, 146, 0); place(TB, 262, 262, 0);
      give(g, KA);
      puppet(NGH, TB, ZM, BB, VX); noAttack(NGH, TB, ZM, BB, VX);
      keep(g, BB, VX, ZM, NGH, TB);
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        steer(NGH, 300, 146); steer(TB, 300, 262);
        if (!fired) {
          KA.intent.mx = 0.12; KA.intent.my = 0;
          for (const o of [VX, ZM]) { if (o.state === 'normal') { steer(o, o === VX ? KA.x + 34 : 410, o === VX ? 200 : 208); face(o, KA); } }
          wob(BB, G.x - 22, G.y, t); face(BB, b);
          if (t > (B.pbUltT || 0.6)) { KA.intent.mx = 0; fired = g.cores.activateUltimate(KA); if (fired) mark('ult'); }
          return;
        }
        for (const o of [VX, ZM]) if (o.state === 'normal') still(o);
        if (BB.state === 'normal') { if (!shot) { wob(BB, G.x - 22, G.y, t); face(BB, b); } else steer(BB, G.x - 22, G.y + 40, true); }
        if (KA.state !== 'normal') return;
        if (!shot && b.owner === KA) {
          if (B.marks.dash == null && KA.x > 420) mark('dash');
          if (B.marks.dash == null) { still(KA); return; }
          if (B.t - B.marks.dash < 0.12) { still(KA); face(KA, G); return; }
          face(KA, { x: G.x, y: G.y - 24 }); Act.shoot(g, KA, 0.9, -0.6); shot = true; mark('shot');
        } else still(KA);
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 50), y: G.y } : { x: KA.x + 50, y: 205 });
    },

    /* P34 the friend who laughs at everything: tuanbeo gets dropkicked, kaito_04 stands there laughing... then he gets dropkicked */
    pb_laugh() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      place(TB, 300, 214, 0); place(VX, 344, 224, PI); place(KA, 262, 166, 0); place(ZM, 196, 140, 0);
      place(NGH, 210, 270, 0); place(BB, 420, 150, PI);
      give(g, TB);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, KA, ZM, NGH, BB);
      let k1 = false, k2 = false;
      B.dir = (dt, g, t) => {
        steer(NGH, 220, 270); steer(BB, 420, 150);
        if (!k1) {
          if (b.owner === TB) { TB.intent.mx = 0.25; TB.intent.my = 0; }
          face(VX, TB); still(VX);
          if (VX.state === 'windup') face(VX, TB);
          if (t > (B.pbK1 || 0.3) && U.dist(VX, TB) < 34) { VX.cd.hard = 0; k1 = Act.hardAttack(g, VX); if (k1) mark('kick1'); }
        } else if (VX.state === 'normal') { if (b.owner == null) steer(VX, b.x, b.y, false); else if (b.owner === VX) { VX.intent.mx = 0.3; VX.intent.my = 0; } }
        // kaito_04 just stands and laughs, facing the action; zzz_mi sneaks up behind him
        if (KA.state === 'normal') { still(KA); face(KA, TB); }
        if (!k2) {
          if (t > (B.pbSneak || 0.9)) steer(ZM, KA.x - 22, KA.y - 4, true); else still(ZM);
          if (t > (B.pbK2 || 1.55) && U.dist(ZM, KA) < 30) { face(ZM, { x: KA.x + 4, y: KA.y + 4 }); ZM.cd.hard = 0; k2 = Act.hardAttack(g, ZM); if (k2) mark('kick2'); }
        } else if (ZM.state === 'normal') still(ZM);
        else if (ZM.state === 'windup') { still(ZM); face(ZM, KA); }
      };
      B.focusFn = () => (B.marks.kick2 != null ? { x: (KA.x + ZM.x) / 2 + 10, y: (KA.y + TB.y) / 2 } : { x: (TB.x + KA.x) / 2 + 6, y: (TB.y + KA.y) / 2 + 4 });
    },

    /* P35 "doesn't play games": tuanbeo goes TITAN and bowls straight through the three Neon Strikers around the ball */
    pb_titan() {
      const { g, P } = pvp({ full: ['tuanbeo'], me: 'tuanbeo' });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      place(BB, 392, 204, PI); place(ZM, 406, 186, PI); place(VX, 408, 224, PI);
      place(TB, 318, 204, 0); place(NGH, 286, 150, 0); place(KA, 286, 258, 0);
      give(g, BB);
      puppet(NGH, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, ZM, VX, NGH, KA);
      let fired = false;
      B.dir = (dt, g, t) => {
        steer(NGH, 296, 150); steer(KA, 296, 258);
        if (!fired) { still(TB); face(TB, BB); if (t > (B.pbUltT || 0.4)) { fired = g.cores.activateUltimate(TB); if (fired) mark('ult'); } }
        else if (TB.state === 'normal') { if (B.t - B.marks.ult < (B.pbGrow || 1.0)) still(TB); else { mark('go'); TB.intent.mx = 1; TB.intent.my = 0; TB.intent.sprint = true; } }
        // the three keep their little huddle around the ball, right in his path
        if (BB.state === 'normal') { wob(BB, 392, 204, t, 6, 4, 3); face(BB, TB); }
        if (ZM.state === 'normal') { wob(ZM, 406, 186, t, 4, 3, 2.5); face(ZM, BB); }
        if (VX.state === 'normal') { wob(VX, 408, 224, t, 4, 3, 2.2); face(VX, BB); }
      };
      B.focusFn = () => ({ x: Math.max(TB.x + 40, 360), y: 204 });
    },

    /* P36 private room: six players on the centre spot, the whistle... everyone hits everyone */
    pb_brawl() {
      const { g, P } = pvp({ kickoff: true });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      g.stateT = B.pbWhistle || 0.9;
      place(NGH, 312, 203, 0); place(BB, 334, 203, PI);
      place(TB, 300, 182, 0); place(KA, 300, 226, 0); place(ZM, 344, 182, PI); place(VX, 344, 226, PI);
      give(g, NGH);
      const all = [NGH, TB, KA, ZM, BB, VX];
      puppet(TB, KA, ZM, BB, VX);
      // who hits whom, when (s after the whistle), with what
      const plan = B.pbPlan || [[BB, NGH, 0.0, 'hard'], [TB, ZM, 0.05, 'light'], [VX, KA, 0.08, 'hard'], [KA, VX, 0.02, 'light'],
        [ZM, TB, 0.25, 'light'], [NGH, BB, 0.3, 'light'], [TB, ZM, 0.55, 'hard'], [KA, VX, 0.6, 'hard']];
      const done = new Set();
      B.dir = (dt, g, t) => {
        if (B.marks.play == null) mark('play');
        const k = B.t - B.marks.play;
        plan.forEach((s, i) => {
          const [a, o, at0, kind] = s;
          if (done.has(i) || k < at0) return;
          if (a.state !== 'normal') { if (k > at0 + 0.5) done.add(i); return; }
          face(a, o); a.cd.light = a.cd.hard = 0;
          if (kind === 'hard' ? Act.hardAttack(g, a) : Act.lightAttack(g, a)) done.add(i);
        });
        for (const p of all) if (p.state === 'normal' && p !== NGH) { const o = all.filter((q) => q.team !== p.team).sort((x, y) => U.dist(p, x) - U.dist(p, y))[0]; steer(p, o.x, o.y, false); }
        if (NGH.state === 'normal') { const o = BB; steer(NGH, o.x, o.y, false); }
      };
      B.focusFn = () => ({ x: 322, y: 204 });
    },

    /* P37 3 friends, 1 brain cell: one-touch triangle NGH -> tuanbeo -> kaito_04 -> NGH, past the three of them, goal */
    pb_tiki() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const G = g.attackGoal(0), b = g.ball;
      place(NGH, 316, 206, 0); place(TB, 372, 148, 0); place(KA, 384, 262, 0);
      place(VX, 350, 204, PI); place(ZM, 420, 196, PI); place(BB, G.x - 22, G.y, PI);
      give(g, NGH);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, VX, ZM, BB);
      const seq = [[NGH, TB], [TB, KA], [KA, NGH]];
      let step = 0, recv = 0, shot = false;
      B.dir = (dt, g, t) => {
        // defenders always one pass late
        if (VX.state === 'normal') { steer(VX, b.x - 8, b.y, true); face(VX, b); }
        if (ZM.state === 'normal') { const tg = step < 3 ? seq[step][1] : NGH; steer(ZM, (b.x + tg.x) / 2 + 26, (b.y + tg.y) / 2 + (tg.y < 200 ? -10 : 10), true); face(ZM, b); }
        if (!shot) { wob(BB, G.x - 22, G.y, t); face(BB, b); } else steer(BB, G.x - 20, G.y + 42, true);
        // runners
        if (step >= 1) steer(NGH, 470, 196, true);
        if (step >= 2) steer(TB, 450, 150, false);
        if (step < 3) {
          const [from, to] = seq[step];
          if (b.owner === from) {
            for (const p of [NGH, TB, KA]) if (p !== from && !(step >= 1 && p === NGH)) still(p);
            still(from); face(from, to);
            if (B.t - recv > (step === 0 ? 0.35 : (B.pbHold || 0.22))) { Act.quickPass(g, from, to.x - from.x, to.y - from.y); mark('pass' + step); }
          } else if (!b.owner) { if (!(step === 2 && to === NGH)) { still(to); } face(to, b); }
          else if (b.owner === to) { recv = B.t; step++; mark('recv' + step); }
          return;
        }
        if (!shot && b.owner === NGH) { face(NGH, { x: G.x, y: G.y + 22 }); Act.shoot(g, NGH, 0.85, 0.6); shot = true; mark('shot'); }
        if (shot) still(NGH);
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 60), y: G.y } : { x: Math.max(b.x, 330) + 20, y: 205 });
    },

    /* P38 ranked nerves: open net, NGH freezes... xX_vex_Xx dropkicks him from behind */
    pb_nerves() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const G = g.attackGoal(0), b = g.ball;
      place(NGH, B.pbNx || 440, 204, 0); place(VX, (B.pbNx || 440) - 96, 222, 0); place(TB, 300, 146, 0); place(KA, 270, 268, 0); place(BB, 380, 120, 0); place(ZM, 548, 262, PI);
      give(g, NGH);
      puppet(TB, KA, ZM, BB, VX); noAttack(TB, KA, ZM, BB, VX, NGH);
      keep(g, TB, KA, BB, VX);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(TB, 400, 150, true); steer(KA, 380, 262, true); steer(BB, 470, 130, true);
        if (!kicked) {
          steer(ZM, 546, 256, false); face(ZM, NGH);
          // the shaky approach: two baby steps, a stop, a look back
          if (t < 0.5) { NGH.intent.mx = 0.22; NGH.intent.my = 0; }
          else if (t < 0.9) still(NGH);
          else if (t < 1.1) { still(NGH); NGH.facing = PI * 0.7; }
          else { still(NGH); NGH.facing = 0.1 * Math.sin(t * 40); }
          if (VX.state === 'normal') steer(VX, NGH.x - 22, NGH.y + 4, true);
          if (t > (B.pbKickT || 1.15) && U.dist(VX, NGH) < 32) { face(VX, { x: NGH.x + 4, y: NGH.y - 2 }); VX.cd.hard = 0; kicked = Act.hardAttack(g, VX); if (kicked) mark('kick'); }
        } else {
          if (VX.state === 'normal') still(VX);
          if (ZM.state === 'normal') { if (b.owner === ZM) { ZM.intent.mx = -0.6; ZM.intent.my = -0.1; } else if (b.x > 470 && U.dist(ZM, b) < 70) steer(ZM, b.x, b.y, true); else still(ZM); }
          if (NGH.state === 'normal') still(NGH);
        }
      };
      B.focusFn = () => ({ x: Math.max(NGH.x, 420) + 10, y: 204 });
    },

    /* P39 FINAL PUSH own goal x2: bigboss99's shot is going wide, tuanbeo (the keeper this time) clears it... into his own net */
    pb_own2() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball, f = g.field;
      g.teams[0].score = 2; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - (B.pbRem || 6.0); g.finalPush = true; g.cfg.match.goldenGoal = false;
      place(BB, B.pbBBx || 214, B.pbBBy || 292, PI); place(TB, B.pbTBx || 137, B.pbTBy || 247, PI); place(VX, 74, 150, 0);
      place(KA, 220, 200, PI); place(NGH, 262, 236, PI); place(ZM, 300, 170, PI);
      give(g, BB);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, KA, NGH, ZM, TB);
      let shot = false, swung = false, cleared = false;
      const aim = { x: 52, y: B.pbAimY || 206 };
      B.dir = (dt, g, t) => {
        steer(NGH, 230, 236, true); steer(KA, 190, 200, true); steer(ZM, 280, 170);
        still(VX); face(VX, b);
        if (!shot) {
          if (b.owner === BB) { BB.intent.mx = -0.32; BB.intent.my = -0.08; }
          if (t > (B.pbShotT || 0.55)) { face(BB, VX); Act.quickPass(g, BB, VX.x - BB.x, VX.y - BB.y); shot = true; mark('shot'); }
          still(TB); TB.facing = Math.atan2(aim.y - TB.y, aim.x - TB.x);
          if (!swung && t > (B.pbShotT || 0.55) - (B.pbEarly || 0.05)) { TB.cd.hard = 0; swung = Act.hardAttack(g, TB); if (swung) mark('swing'); }
          return;
        }
        still(BB); still(TB);
        // tuanbeo steps in to cut the cross out, facing his own goal mouth: his boot sends it into his own net
        if (!swung) {
          TB.facing = Math.atan2(aim.y - TB.y, aim.x - TB.x);
          TB.cd.hard = 0; swung = Act.hardAttack(g, TB); if (swung) mark('swing');
        } else if (TB.state === 'windup') TB.facing = Math.atan2(aim.y - TB.y, aim.x - TB.x);
        if (!cleared && b.lastTouch === TB) { cleared = true; mark('slice'); }
        if (B.pbDebug) mark(`d${Math.round(t * 30)}_b${Math.round(b.x)},${Math.round(b.y)}_tb${Math.round(TB.x)},${Math.round(TB.y)}_${TB.state}`);
      };
      B.focusFn = () => ({ x: Math.max(110, Math.min(b.x + 30, 190)), y: 214 });
    },

    /* P40 6 players, 1 ball: a pile-up of punches in front of goal; NGH's dropkick at bigboss99 hits the loose ball first,
       it trundles into the net while all six keep fighting */
    pb_pileup() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const G = g.attackGoal(0), b = g.ball, all = [NGH, TB, KA, ZM, BB, VX];
      const cx = B.pbCx || 440, cy = 204;
      // only bigboss99 stands in front of NGH's boot; the other four brawl in pairs beside him
      place(NGH, cx - 20, cy, 0); place(BB, cx + 14, cy, PI);
      place(TB, cx - 22, cy + 26, 0); place(ZM, cx + 2, cy + 34, PI); place(KA, cx - 22, cy - 26, 0); place(VX, cx + 2, cy - 34, PI);
      b.owner = null; b.x = cx - 10; b.y = cy; b.vx = b.vy = 0;
      puppet(TB, KA, ZM, BB, VX);
      for (const p of all) b.noPickup.set(p.id, 99);
      const nextT = new Map(all.map((p, i) => [p, (B.pbOthers || 0.5) + i * 0.12]));
      let boot = false;
      B.dir = (dt, g, t) => {
        for (const p of all) {
          if (p === NGH && !boot) continue;
          const pair = { [TB.id]: ZM, [ZM.id]: TB, [KA.id]: VX, [VX.id]: KA, [BB.id]: TB, [NGH.id]: VX };   // after his boot NGH joins the fight on KA's side
          const opp = pair[p.id];
          if (p.state === 'normal') { if (U.dist(p, opp) > 16) steer(p, opp.x, opp.y, false); else still(p); face(p, opp); }
          if (t > nextT.get(p) && p.state === 'normal') {
            const hard = Math.random() < 0.3;
            if (hard ? Act.hardAttack(g, p) : Act.lightAttack(g, p)) nextT.set(p, t + 0.45 + Math.random() * 0.35);
          }
        }
        // NGH lines up bigboss99 (and the ball between them, straight at the goal)
        if (!boot) {
          still(NGH); NGH.facing = Math.atan2(G.y - NGH.y, G.x - NGH.x);
          if (t > (B.pbBootT || 0.1)) { boot = Act.hardAttack(g, NGH); if (boot) mark('boot'); }
        } else if (NGH.state === 'windup') NGH.facing = Math.atan2(G.y - NGH.y, G.x - NGH.x);
        if (boot && b.lastTouch === NGH && Math.hypot(b.vx, b.vy) > 50 && B.marks.roll == null) mark('roll');
      };
      B.focusFn = () => ({ x: 486, y: 206 });
    },

    /* P41 3am "last game": bigboss99 kicks off and hits a THUNDER KICK from the centre spot, it zaps through NGH and goes in -> 0-1 */
    pb_3am() {
      const { g, P } = pvp({ kickoff: true, cores: { bigboss99: ['thunder_kick'] } });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball, OG = { x: 56, y: 203 };
      g.kickoff(1); B.lib.hush();
      g.stateT = B.pbWhistle || 0.5;
      place(NGH, 286, 201, 0); place(TB, 250, 150, 0); place(KA, 96, 206, 0);
      place(ZM, 362, 150, PI); place(VX, 362, 258, PI); place(BB, 328, 203, PI);
      give(g, BB);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, TB);
      let shot = false;
      B.dir = (dt, g, t) => {
        if (B.marks.play == null) mark('play');
        const k = B.t - B.marks.play;
        steer(ZM, 340, 150); steer(VX, 340, 258); still(TB); face(TB, BB);
        if (NGH.state === 'normal') { still(NGH); face(NGH, BB); }
        if (KA.state === 'normal') { wob(KA, 96, 206, t); face(KA, b); }
        if (!shot) {
          still(BB); face(BB, OG);
          if (k > (B.pbShotT || 0.35)) { BB.charge = 1; BB.charging = true; Act.shoot(g, BB, 1, B.pbAim != null ? B.pbAim : 0.1); shot = true; mark('shot'); }
          return;
        }
        still(BB);
        // the keeper gets a hand to it, it still goes in
        B.pbRoll = !b.owner && U.dist(b, KA) < 48 && B.marks.goal == null ? 0.97 : null;
      };
      B.focusFn = () => (shot ? { x: Math.max(Math.min(b.x, 300), 120), y: 203 } : { x: 300, y: 203 });
    },

    /* P42 the friend in goal: bigboss99 shoots, kaito_04 (in our box) ignores the ball and dropkicks HIM... the ball rolls in anyway */
    pb_keeper_dk() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball, OG = { x: 56, y: 203 };
      place(KA, 96, 212, 0); place(BB, 214, 196, PI); place(NGH, 300, 240, PI); place(TB, 320, 150, PI); place(ZM, 300, 120, PI); place(VX, 330, 270, PI);
      give(g, BB);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, KA, NGH, TB, ZM, VX);
      let shot = false, kicked = false;
      B.dir = (dt, g, t) => {
        steer(NGH, 240, 236, true); steer(TB, 250, 160, true); steer(ZM, 260, 120); steer(VX, 280, 270);
        if (!shot) {
          if (b.owner === BB) { BB.intent.mx = -0.62; BB.intent.my = 0.0; BB.intent.sprint = true; }
          // kaito_04 rushes out of his box at the man
          if (KA.state === 'normal') { if (t > (B.pbRushT || 0.15)) steer(KA, BB.x - 20, BB.y + 4, true); else wob(KA, 96, 212, t, 0, 4); face(KA, BB); }
          if (BB.x < (B.pbShootX || 176) || U.dist(KA, BB) < (B.pbShootD || 44)) { face(BB, { x: OG.x, y: 176 }); Act.shoot(g, BB, B.pbCharge || 0.7, -0.6); shot = true; mark('shot'); }
          return;
        }
        still(BB);
        if (!kicked && KA.state === 'normal') { face(KA, BB); KA.cd.hard = 0; kicked = Act.hardAttack(g, KA); if (kicked) mark('kick'); }
        if (KA.state === 'windup') face(KA, BB);
      };
      B.focusFn = () => ({ x: 128, y: 200 });
    },

    /* P43 duo combo: tuanbeo's BLACK HOLE SHOT bunches all three of them up, NGH lands a GROUND SLAM on the pile */
    pb_bh() {
      const { g, P } = pvp({ cores: { tuanbeo: ['black_hole'], NGH: ['ground_slam'] } });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const G = g.attackGoal(0), b = g.ball;
      place(TB, 330, 210, 0); place(NGH, 372, 160, 0); place(KA, 260, 262, 0);
      place(VX, 432, 186, PI); place(ZM, 440, 232, PI); place(BB, G.x - 26, G.y, PI);
      give(g, TB);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, ZM, VX, BB, NGH, KA);
      let shot = false, slam = false;
      B.dir = (dt, g, t) => {
        steer(KA, 300, 262);
        if (!shot) {
          TB.intent.mx = 0.4; TB.intent.my = 0; still(NGH); face(NGH, VX);
          for (const o of [VX, ZM]) { still(o); face(o, TB); }
          wob(BB, G.x - 26, G.y, t); face(BB, b);
          if (t > (B.pbShotT || 0.45)) { face(TB, { x: G.x, y: 210 }); TB.charge = 1; TB.charging = true; Act.shoot(g, TB, B.pbCharge || 0.85, 0.05); shot = true; mark('shot'); }
          return;
        }
        still(TB);
        for (const o of [VX, ZM]) if (o.state === 'normal') { still(o); face(o, b); }
        if (!slam && NGH.state === 'normal' && B.t - B.marks.shot > (B.pbSlamAfter || 0.3)) { face(NGH, VX); NGH.cd.hard = 0; slam = Act.hardAttack(g, NGH); if (slam) mark('slam'); }
        if (slam && NGH.state === 'normal') still(NGH);
      };
      B.focusFn = () => (shot ? { x: Math.min(Math.max(b.x, 420), 500), y: 205 } : { x: 400, y: 205 });
    },

    /* P44 AFK in the box: kaito_04 stands in our box looking at nothing, bigboss99 smashes it straight at him -> SAVE */
    pb_afk() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball, OG = { x: 56, y: 203 };
      place(KA, 88, 206, -PI / 2); place(BB, 226, 200, PI); place(NGH, 300, 150, PI); place(TB, 290, 262, PI); place(ZM, 300, 110, PI); place(VX, 320, 240, PI);
      give(g, BB);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, NGH, TB, ZM, VX);
      let shot = false;
      B.dir = (dt, g, t) => {
        still(KA); if (B.marks.save == null) KA.facing = -PI / 2;
        steer(NGH, 240, 150, true); steer(TB, 240, 262, true); steer(ZM, 260, 110); steer(VX, 270, 240);
        if (!shot) {
          if (b.owner === BB) { BB.intent.mx = -0.4; BB.intent.my = 0.02; }
          if (t > (B.pbShotT || 0.8)) { face(BB, { x: KA.x, y: KA.y - 2 }); Act.shoot(g, BB, 1.0, 0); shot = true; mark('shot'); }
          return;
        }
        still(BB);
        // the save: forced roll while the ball reaches him
        B.pbRoll = !b.owner && U.dist(b, KA) < 26 && B.marks.save == null ? (B.pbSaveRoll != null ? B.pbSaveRoll : 0.01) : null;
        if (b.owner === KA && B.marks.save == null) mark('save');
      };
      B.focusFn = () => ({ x: 126, y: 204 });
    },

    /* P45 "I got him": NGH flies in with a dropkick, xX_vex_Xx dodges (PERFECT DODGE slow-mo), NGH kicks thin air */
    pb_whiff() {
      const { g, P } = pvp({ cores: { xX_vex_Xx: ['witch_time'] } });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      place(VX, 356, 198, PI); place(NGH, 262, 206, 0); place(TB, 200, 150, 0); place(KA, 190, 270, 0); place(ZM, 430, 150, PI); place(BB, 450, 260, PI);
      give(g, VX);
      puppet(TB, KA, ZM, BB, VX); noAttack(TB, KA, ZM, BB, VX);
      keep(g, TB, KA, ZM, BB);
      let kicked = false, dodged = false;
      B.dir = (dt, g, t) => {
        steer(TB, 220, 150); steer(KA, 210, 270); steer(ZM, 420, 150); steer(BB, 440, 260);
        if (!dodged && VX.state === 'normal') { if (b.owner === VX) { VX.intent.mx = -0.22; VX.intent.my = 0.02; } }
        if (!kicked) {
          steer(NGH, VX.x - 20, VX.y, true); face(NGH, VX);
          if (t > (B.pbKickT || 0.7) && U.dist(NGH, VX) < 34) { NGH.cd.hard = 0; face(NGH, VX); kicked = Act.hardAttack(g, NGH); if (kicked) mark('kick'); }
          return;
        }
        if (NGH.state === 'windup') face(NGH, VX);
        if (!dodged && (NGH.state === 'kick' || (NGH.state === 'windup' && NGH.stateT < (B.pbDodgeLead || 0.04)))) {
          VX.cd.skill = 0; Act.skill(g, VX, 0.15, -1); dodged = true; mark('dodge');
        }
        if (dodged && VX.state === 'normal') { if (b.owner === VX) { VX.intent.mx = -0.5; VX.intent.my = 0.1; VX.intent.sprint = true; } else steer(VX, b.x, b.y, true); }
        if (NGH.state === 'normal') still(NGH);
      };
      B.focusFn = () => ({ x: (NGH.x + VX.x) / 2, y: 196 });
    },

    /* P46 everyone's ultimate at once: METEOR DROP, TITAN, HUNDRED FISTS back to back in a six-player scramble */
    pb_ults() {
      const { g, P } = pvp({ full: ['tuanbeo', 'xX_vex_Xx', 'bigboss99'] });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball, cx = 340, cy = 204;
      place(TB, cx - 8, cy, 0); place(BB, cx + 22, cy + 4, PI); place(NGH, cx - 34, cy - 26, 0); place(KA, cx - 40, cy + 30, 0);
      place(ZM, cx + 36, cy - 28, PI); place(VX, cx + 40, cy + 26, PI);
      give(g, TB);
      puppet(TB, KA, ZM, BB, VX); noAttack(TB, KA, ZM, BB, VX, NGH);
      const order = B.pbOrder || [[VX, 0.3], [TB, 0.45], [BB, 0.6]];
      const fired = new Set();
      B.dir = (dt, g, t) => {
        for (const [p, at0] of order) if (!fired.has(p) && t > at0) { if (g.cores.activateUltimate(p)) { fired.add(p); mark('ult_' + p.name); } }
        if (TB.state === 'normal' && fired.has(TB) && B.t - B.marks.ult_tuanbeo > 0.7) { if (b.owner === TB) { TB.intent.mx = 0.6; TB.intent.my = 0.05; TB.intent.sprint = true; } else steer(TB, b.x, b.y, true); }
        else if (TB.state === 'normal') still(TB);
        for (const p of [NGH, KA]) if (p.state === 'normal') { still(p); face(p, TB); }
        if (BB.state === 'normal') { still(BB); face(BB, NGH); }
        if (ZM.state === 'normal') still(ZM);
        if (VX.state === 'normal') still(VX);
      };
      B.focusFn = () => ({ x: cx + 10, y: cy });
    },

    /* P47a revenge, part 1: kickoff, xX_vex_Xx runs straight through and dropkicks NGH */
    pb_kicked() {
      const { g, P } = pvp({ kickoff: true });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      g.stateT = B.pbWhistle || 0.3;
      place(NGH, 312, 203, 0); place(VX, 356, 206, PI); place(TB, 280, 150, 0); place(KA, 270, 262, 0); place(ZM, 390, 140, PI); place(BB, 400, 262, PI);
      give(g, NGH);
      puppet(TB, KA, ZM, BB, VX); noAttack(TB, KA, ZM, BB, VX, NGH);
      keep(g, TB, KA, ZM, BB);
      let kicked = false;
      B.dir = (dt, g, t) => {
        if (B.marks.play == null) mark('play');
        steer(TB, 290, 150); steer(KA, 280, 262); steer(ZM, 380, 140); steer(BB, 390, 262);
        if (!kicked) {
          if (b.owner === NGH) { NGH.intent.mx = 0.2; NGH.intent.my = 0; }
          steer(VX, NGH.x + 22, NGH.y, true); face(VX, NGH);
          if (U.dist(VX, NGH) < 30) { VX.cd.hard = 0; face(VX, NGH); kicked = Act.hardAttack(g, VX); if (kicked) mark('kick'); }
        } else {
          if (NGH.state === 'normal') still(NGH);
          if (VX.state === 'normal') { if (b.owner === VX) { VX.intent.mx = -0.3; VX.intent.my = 0; } else steer(VX, b.x, b.y, false); }
        }
      };
      B.focusFn = () => ({ x: Math.min(NGH.x + 10, 330), y: 203 });
    },

    /* P47b revenge, part 2: same guy on the ball by the top wall; NGH (IRON BOOTS + WALL SLAM) dropkicks him into it: CRACK */
    pb_payback() {
      const { g, P } = pvp({ cores: { NGH: ['heavy_boot', 'wall_slam'] } });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      place(VX, 330, 116, PI); place(NGH, 316, 170, -PI / 2); place(TB, 250, 220, 0); place(KA, 200, 160, 0); place(ZM, 420, 200, PI); place(BB, 440, 140, PI);
      give(g, VX);
      puppet(TB, KA, ZM, BB, VX); noAttack(TB, KA, ZM, BB, VX);
      keep(g, TB, KA, ZM, BB);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(TB, 260, 215); steer(KA, 220, 160); steer(ZM, 410, 200); steer(BB, 430, 145);
        if (!kicked) {
          if (VX.state === 'normal' && b.owner === VX) { VX.intent.mx = -0.25; VX.intent.my = 0; }
          steer(NGH, VX.x - 6, VX.y + 24, true); face(NGH, VX);
          if (t > (B.pbKickT || 0.5) && U.dist(NGH, VX) < 30) { NGH.cd.hard = 0; face(NGH, { x: VX.x + 2, y: VX.y - 4 }); kicked = Act.hardAttack(g, NGH); if (kicked) mark('kick'); }
        } else {
          if (NGH.state === 'windup') face(NGH, { x: VX.x + 2, y: VX.y - 4 });
          if (NGH.state === 'normal') still(NGH);
          if (VX.state === 'stun' && VX.y <= g.field.y + VX.radius + 3 && B.marks.wall == null) mark('wall');
        }
      };
      B.focusFn = () => ({ x: (NGH.x + VX.x) / 2, y: 150 });
    },

    /* P48 celebrated too early: NGH's shot, the squad already screaming... bigboss99 happens to be in the box: SAVE */
    pb_early() {
      const { g, P } = pvp({});
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const G = g.attackGoal(0), b = g.ball;
      place(NGH, 440, 220, 0); place(BB, 520, 150, PI / 2); place(TB, 380, 160, 0); place(KA, 360, 270, 0); place(ZM, 400, 250, PI); place(VX, 470, 270, PI);
      give(g, NGH);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, TB, KA, ZM, VX);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(TB, 420, 160, true); steer(KA, 400, 268); steer(ZM, 430, 250, true); steer(VX, 480, 262);
        if (!shot) {
          // bigboss99 strolls back across the box, not even looking
          steer(BB, 548, 214, false);
          if (b.owner === NGH) { NGH.intent.mx = 0.3; NGH.intent.my = -0.05; }
          if (t > (B.pbShotT || 0.55)) { face(NGH, { x: G.x, y: 214 }); Act.shoot(g, NGH, 0.8, 0.3); shot = true; mark('shot'); }
          return;
        }
        still(NGH);
        if (BB.state === 'normal' && B.marks.save == null) steer(BB, b.x, b.y, true);
        B.pbRoll = !b.owner && U.dist(b, BB) < 26 && B.marks.save == null ? (B.pbSaveRoll != null ? B.pbSaveRoll : 0.01) : null;
        if (b.owner === BB && B.marks.save == null) mark('save');
        if (B.marks.save != null && BB.state === 'normal') { if (b.owner === BB) { BB.intent.mx = -0.3; BB.intent.my = 0; } }
      };
      B.focusFn = () => ({ x: 500, y: 204 });
    },

    /* P49 squad wipe: all three of us press xX_vex_Xx... GROUND SLAM, three of us in the air */
    pb_wipe() {
      const { g, P } = pvp({ cores: { xX_vex_Xx: ['ground_slam'] } });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const b = g.ball;
      place(VX, 352, 204, PI); place(NGH, 290, 204, 0); place(TB, 304, 256, 0); place(KA, 300, 150, 0); place(ZM, 440, 150, PI); place(BB, 460, 260, PI);
      give(g, VX);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, NGH, TB, KA, ZM, BB);
      let slam = false;
      B.dir = (dt, g, t) => {
        steer(ZM, 440, 150); steer(BB, 460, 260);
        for (const [p, dx, dy] of [[NGH, -24, 0], [TB, -10, 22], [KA, -10, -22]]) if (p.state === 'normal') { steer(p, VX.x + dx, VX.y + dy, true); face(p, VX); }
        if (!slam) {
          still(VX); VX.facing = PI;
          if (t > (B.pbSlamT || 0.8)) { VX.cd.hard = 0; face(VX, NGH); slam = Act.hardAttack(g, VX); if (slam) mark('slam'); }
        } else if (VX.state === 'normal') still(VX);
        if (slam && VX.state !== 'windup' && VX.state !== 'slam' && B.marks.land == null && B.t - B.marks.slam > 0.35) mark('land');
      };
      B.focusFn = () => ({ x: 330, y: 204 });
    },

    /* P50 the friend nobody trusts: 0:03 left, down 2-3 in FINAL PUSH, it goes to tuanbeo... FIREBALL from distance, GOAL x2 */
    pb_doubt() {
      const { g, P } = pvp({ cores: { tuanbeo: ['fire_shot'] } });
      const { NGH, tuanbeo: TB, kaito_04: KA, zzz_mi: ZM, bigboss99: BB, xX_vex_Xx: VX } = P;
      const G = g.attackGoal(0), b = g.ball;
      g.teams[0].score = 2; g.teams[1].score = 3;
      g.elapsed = g.cfg.match.duration - (B.pbRem || 3.4); g.finalPush = true; g.cfg.match.goldenGoal = false;
      place(NGH, 330, 146, 0); place(TB, 360, 246, 0); place(KA, 260, 210, 0);
      place(VX, 372, 150, PI); place(ZM, 450, 226, PI); place(BB, G.x - 22, G.y, PI);
      give(g, NGH);
      puppet(TB, KA, ZM, BB, VX); noAttack(NGH, TB, KA, ZM, BB, VX);
      keep(g, VX, ZM, KA);
      let passed = false, got = false, shot = false;
      B.dir = (dt, g, t) => {
        steer(KA, 300, 210);
        if (VX.state === 'normal') { steer(VX, NGH.x + 20, NGH.y, true); face(VX, b); }
        if (ZM.state === 'normal') { steer(ZM, shot ? 450 : TB.x + 30, shot ? 280 : TB.y + 26, true); face(ZM, b); }
        if (!shot) { wob(BB, G.x - 22, G.y, t); face(BB, b); }
        if (!passed) { still(NGH); face(NGH, TB); still(TB); face(TB, NGH); if (t > (B.pbPassT || 0.3)) { Act.quickPass(g, NGH, TB.x - NGH.x, TB.y - NGH.y); passed = true; mark('pass'); } return; }
        if (!got) { still(TB); face(TB, b); if (b.owner === TB) { got = true; mark('recv'); } return; }
        if (!shot) {
          if (B.t - B.marks.recv < (B.pbHold || 0.35)) { still(TB); face(TB, G); return; }
          face(TB, { x: G.x, y: G.y - 20 }); TB.charge = 1; Act.shoot(g, TB, 1, -0.5); shot = true; mark('shot');
          return;
        }
        still(TB);
        // the keeper gets a hand to it... and it still goes in
        B.pbRoll = !b.owner && U.dist(b, BB) < 48 && B.marks.goal == null ? 0.97 : null;
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 70), y: 204 } : { x: (NGH.x + TB.x) / 2 + 30, y: 200 });
    },
  });
})();
