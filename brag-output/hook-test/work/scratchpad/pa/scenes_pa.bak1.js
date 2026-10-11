/* pa scenes (PvP hooks P1-P25): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with pa_. Nothing here runs at load time except Object.assign.
   Current build: 3v3. Every player is named after a cast handle (work/portraits/players.json) and wears the same look as his cam
   portrait, through the game's own avatars / mates options; each carries one signature ultimate (CHARACTER > ULTIMATE). */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, hush, mark, at, t0focus } = BRAG.lib;
  const B = BRAG;

  // handle -> [cut, face, fx, skin, hairColor] (same table as portraits.py)
  const LOOKS = {
    NGH: ['spiky', 'none', 'nofx', 0, 0], tuanbeo: ['cap', 'mustache', 'nofx', 2, 1], kaito_04: ['headphones', 'shades', 'nofx', 1, 0],
    zzz_mi: ['bun', 'blush', 'hearts', 1, 0], bigboss99: ['crown', 'goldtooth', 'nofx', 3, 1], xX_vex_Xx: ['mohawk', 'warpaint', 'nofx', 0, 2],
    mochi: ['beanie', 'nerd', 'nofx', 1, 1], DUKE: ['helmet', 'visor', 'nofx', 4, 0], 'panda.exe': ['bowl', 'cyborg', 'nofx', 0, 0],
    ratking: ['bandana', 'scar', 'smoke', 2, 0], jinx: ['longhair', 'eyepatch', 'nofx', 3, 2], m0le: ['afro', 'freckles', 'nofx', 4, 1],
  };
  // squads in role order [DEF, MID, FWD]
  const SQ = {
    street_kings: ['kaito_04', 'tuanbeo', 'NGH'], neon_strikers: ['zzz_mi', 'bigboss99', 'xX_vex_Xx'],
    cyber_united: ['DUKE', 'mochi', 'panda.exe'], underground_fc: ['m0le', 'jinx', 'ratking'],
  };
  // one signature ultimate per player, the same in every clip
  const ULT = {
    NGH: 'meteor_strike', tuanbeo: 'titan', kaito_04: 'lightning_dash',
    zzz_mi: 'clone_army', bigboss99: 'aura_farming', xX_vex_Xx: 'hundred_fists',
    mochi: 'endless_tiki', DUKE: 'meteor_drop', 'panda.exe': 'lightning_dash',
    ratking: 'hundred_fists', jinx: 'clone_army', m0le: 'titan',
  };
  const lookOf = (h, team) => {
    const [cut, fc, fx, skin, hc] = LOOKS[h], kit = SFC_CONFIG.teams.list[team].kit, sk = SFC_CONFIG.teams.skins;
    return { cut, face: fc, fx, shoes: 'kicks', skin: sk[skin % sk.length], hair: kit.hair[hc % kit.hair.length] };
  };
  // the director drives every player itself: keyboard handling off (own flag, patched lazily)
  const noHuman = () => {
    if (!SFC.Human.__pa) {
      const h0 = SFC.Human.update;
      SFC.Human.update = function () { if (B.paNoHuman) return; return h0.apply(this, arguments); };
      SFC.Human.__pa = true;
    }
    B.paNoHuman = true;
  };
  const keep = (g, ...ps) => { for (const q of ps) g.ball.noPickup.set(q.id, 99); };
  const free = (g, ...ps) => { for (const q of ps) g.ball.noPickup.set(q.id, 0); };
  const arm = (...ps) => { for (const q of ps) q.cd.light = q.cd.hard = 0; };
  const disarm = (...ps) => { for (const q of ps) q.cd.light = q.cd.hard = 99; };
  const loose = (g, x, y) => { const b = g.ball; b.owner = null; b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; };

  /* a 3v3 match between two squads of the cast. o: {home, away, me (handle = the human slot, gets the YOU marker), ults, opts}
     returns {g, P (handle -> player), F (field)}; every player is a puppet with attacks off until the scene arms him */
  function pvp(o = {}) {
    noHuman();
    const home = o.home || 'street_kings', away = o.away || 'neon_strikers';
    const H = [SQ[home], SQ[away]], roles = SFC_CONFIG.game.roles, me = o.me || 'NGH';
    const mt = H[0].includes(me) ? 0 : 1, mi = H[mt].indexOf(me);
    const spec = (h, t, i) => ({ name: h, look: lookOf(h, t ? away : home), role: roles[i], ult: (o.ults && o.ults[h]) || ULT[h] });
    const avatars = [null, null], mates = [[], []], solo = [null, null];
    H.forEach((hs, t) => hs.forEach((h, i) => { if (t === mt && i === mi) avatars[t] = spec(h, t, i); else mates[t].push(spec(h, t, i)); }));
    solo[mt] = mi;
    SFC.Profile.data.name = me;
    app.startMatch(Object.assign({ home, away, difficulty: 'hard', humanTeam: mt, solo, noDraft: true, avatars, mates }, o.opts || {}));
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    B.puppets = new Set(g.players);
    g.aiHook = (p) => B.puppets.has(p);
    hush();
    const by = {};
    for (const p of g.players) { by[p.name] = p; p.res.ult = 0; }
    disarm(...g.players);
    return { g, P: by, F: g.field, E: g.effects, b: g.ball };
  }
  // bystanders amble around their spot (facing the ball) so a wide shot never looks frozen
  function crowd(g, spots) {
    const L = spots.map(([p, x, y]) => { place(p, x, y, p.team ? PI : 0); return [p, x, y]; });
    return (t, busy) => {
      for (const [p, x, y] of L) {
        if ((busy && busy.has(p)) || p.state !== 'normal') continue;
        const k = p.id * 1.7;
        steer(p, x + Math.sin(t * 1.3 + k) * 7, y + Math.cos(t * 1.05 + k) * 6, false);
        if (Math.hypot(p.x - x, p.y - y) < 4) face(p, g.ball);
      }
    };
  }
  // a hard knock on a player (scripted when the real hit test can't be trusted)
  const smash = (q, kbx, kby, launch, stun = 2.5, src = null) => { q.state = 'normal'; q.hitImmune = 0; return q.hit({ stun, kbx, kby, launch, source: src, type: 'hard' }); };

  Object.assign(B.SCENES, {
    /* P1 "1v1 me": kickoff, he rushes the ball, I dropkick him before he touches it */
    pa_1v1() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, vx = P.xX_vex_Xx;
      g.cores.add(me, 'heavy_boot');
      const idle = crowd(g, [[P.kaito_04, 150, 210], [P.tuanbeo, 238, 138], [P.zzz_mi, 512, 203], [P.bigboss99, 410, 268]]);
      place(me, F.cx - 34, F.cy, 0); place(vx, F.cx + 34, F.cy, PI);
      loose(g, F.cx, F.cy);
      keep(g, ...g.players);
      at(0.35, () => { g.sfx('whistle'); mark('whistle'); });
      let kicked = false;
      B.dir = (dt, g, t) => {
        idle(t, new Set([me, vx]));
        if (t < 0.4) { still(me); face(me, vx); still(vx); face(vx, me); return; }
        if (!kicked) {
          steer(vx, b.x + 4, b.y, true);
          steer(me, vx.x - 18, vx.y + 2, true);
          if (t > 0.5 && U.dist(me, vx) < 34) { face(me, vx); me.cd.hard = 0; kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (vx.state === 'stun' && B.marks.fly == null) { mark('fly'); vx.kbx = 300; vx.kby = -40; vx.airVz = Math.max(vx.airVz, 210); E.comic(vx.x, vx.y - 34, 'BYE!', '#ffe14f', 1.3, 0.8); }
        if (B.marks.fly != null && B.t - B.marks.fly > 0.5) { free(g, me); if (me.state === 'normal') { if (b.owner !== me) steer(me, b.x, b.y, false); else { me.intent.mx = 0.3; me.intent.my = 0; } } }
        else if (me.state === 'normal') { still(me); }
      };
      B.focusFn = () => (B.marks.fly == null ? t0focus(me, vx) : { x: U.clamp((me.x + vx.x) / 2, 300, 420), y: 203 });
    },

    /* P2 "ez": he poses with the ball (EZ), I come from behind with 5 Rage: GIANT FIST, he flies into the top wall */
    pa_ez() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, bb = P.bigboss99;
      g.cores.add(me, 'giant_fist'); me.res.rage = 5;
      const A = -PI / 4;
      const idle = crowd(g, [[P.kaito_04, 150, 230], [P.tuanbeo, 205, 140], [P.zzz_mi, 548, 203], [P.xX_vex_Xx, 440, 290]]);
      place(me, 262, 262, 0); place(bb, 330, 214, PI / 2);
      give(g, bb);
      keep(g, P.kaito_04, P.tuanbeo, P.zzz_mi, P.xX_vex_Xx);
      at(0.12, () => { E.comic(bb.x, bb.y - 30, 'EZ', '#ffffff', 1.3, 1.0); mark('ez'); });
      let punched = false;
      B.dir = (dt, g, t) => {
        idle(t, new Set([me, bb]));
        if (!punched) {
          if (bb.state === 'normal') { still(bb); bb.facing = PI / 2 + Math.sin(t * 7) * 0.5; }
          me.res.rage = 5;
          if (t < 0.45) { still(me); face(me, bb); return; }
          steer(me, bb.x - 22, bb.y + 24, true);
          if (U.dist(me, bb) < 34) { me.facing = A; me.cd.light = 0; if (Act.lightAttack(g, me)) { punched = true; mark('punch'); } }
          return;
        }
        keep(g, bb);
        if (bb.state === 'stun' && B.marks.fly == null) { mark('fly'); bb.kbx = 330; bb.kby = -330; bb.airVz = Math.max(bb.airVz, 240); }
        if (B.marks.fly != null && B.marks.bonk == null && bb.y <= F.y + bb.radius + 1) { mark('bonk'); bb.kbx *= 0.15; }
        if (me.state !== 'normal') return;
        if (b.owner === me) { if (B.marks.bonk != null && B.t - B.marks.bonk > 0.4) { me.intent.mx = 0.35; me.intent.my = -0.05; } else { still(me); me.facing = A; } }
        else if (!b.owner) steer(me, b.x, b.y, false); else still(me);
      };
      B.focusFn = () => (B.marks.fly == null ? { x: 305, y: 225 } : { x: U.clamp(bb.x - 20, 305, 400), y: U.clamp(bb.y + 40, 150, 225) });
    },

    /* P3 randoms: I pass to my random teammate... he turns and passes it straight to their striker, who scores */
    pa_randoms() {
      const { g, P, F, E, b } = pvp({ home: 'cyber_united', away: 'underground_fc', me: 'panda.exe' });
      const me = P['panda.exe'], rd = P.DUKE, mo = P.mochi, rk = P.ratking;
      const H = g.ownGoal(0);
      const idle = crowd(g, [[mo, 250, 120], [P.jinx, 330, 270], [P.m0le, 460, 210]]);
      place(me, 232, 238, PI); place(rd, 140, 196, 0); place(rk, 238, 150, PI);
      give(g, me);
      keep(g, mo, P.jinx, P.m0le);
      let p1 = false, p2 = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t, new Set([me, rd, rk]));
        if (!p1) { still(me); face(me, rd); still(rd); face(rd, me); still(rk); face(rk, rd); keep(g, rk);
          if (t > 0.3) { Act.passTo(g, me, rd, 'ground'); p1 = true; mark('pass1'); } return; }
        if (!p2) {
          keep(g, rk, me);
          if (rd.state === 'normal' && b.owner !== rd) steer(rd, b.x, b.y, false);
          if (b.owner === rd) { mark('recv'); still(rd); face(rd, rk); if (B.t - B.marks.recv > 0.35) { Act.passTo(g, rd, rk, 'ground'); p2 = true; mark('pass2'); g.effects.comic(rd.x, rd.y - 26, 'HERE U GO', '#ffffff', 0.8, 0.9); } }
          still(me); face(me, b); still(rk); face(rk, b);
          return;
        }
        free(g, rk); keep(g, rd, me, mo);
        still(rd); face(rd, rk);
        if (me.state === 'normal') { if (B.marks.recv2 != null) steer(me, rk.x + 30, rk.y, true); else { still(me); face(me, rd); } }
        if (shot) { still(rk); return; }
        if (b.owner !== rk) { if (rk.state === 'normal') steer(rk, b.x, b.y, false); return; }
        mark('recv2');
        if (B.t - B.marks.recv2 < 0.3) { still(rk); face(rk, H); return; }
        face(rk, H); Act.shoot(g, rk, 0.85, 0.3); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, 110), y: 205 } : { x: 190, y: 195 });
    },

    /* P4 1 star from promotion: 2-2, five seconds left, FINAL PUSH: METEOR SHOT -> GOAL x2 */
    pa_promo() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, kp = P.zzz_mi;
      g.teams[0].score = 2; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - (B.paRem || 5.4); g.finalPush = true; g.cfg.match.goldenGoal = false;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.kaito_04, 150, 250], [P.tuanbeo, 230, 132]]);
      place(me, 262, 210, 0); place(kp, G.x - 22, G.y, PI); place(P.xX_vex_Xx, 352, 178, PI); place(P.bigboss99, 380, 250, PI);
      give(g, me);
      keep(g, P.kaito_04, P.tuanbeo, P.xX_vex_Xx, P.bigboss99, kp);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        for (const o of [P.xX_vex_Xx, P.bigboss99]) if (o.state === 'normal') steer(o, me.x + 26, me.y + (o === P.bigboss99 ? 16 : -14), true);
        if (kp.state === 'normal') { if (!fired || B.t - B.marks.ult < 1.0) steer(kp, G.x - 22, G.y + Math.sin(t * 2.4) * 8, false); else steer(kp, G.x - 26, G.y - 36, true); }
        if (!fired) { me.intent.mx = 0.55; me.intent.my = -0.05; me.res.ult = 1; if (t > 0.45) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } }
        else if (me.state === 'normal') still(me);
        if (fired && B.t - B.marks.ult > 0.9) keep(g, kp);
      };
      B.focusFn = () => (fired && B.t - B.marks.ult > 0.9 ? { x: Math.max(b.x, 380), y: U.clamp(b.y, 170, 236) } : me);
    },

    /* P5 first match: the new guy dribbles the wrong way, past his own teammate, into our own net. GOLAZO! */
    pa_firstmatch() {
      const { g, P, F, E, b } = pvp({});
      const nb = P.kaito_04, tb = P.tuanbeo, me = P.NGH;
      const H = g.ownGoal(0);
      const idle = crowd(g, [[me, 300, 268], [P.zzz_mi, 520, 203], [P.bigboss99, 340, 130]]);
      place(nb, 262, 200, PI); place(tb, H.x + 24, H.y + 6, 0); place(P.xX_vex_Xx, 300, 196, PI);
      give(g, nb);
      keep(g, tb, P.xX_vex_Xx, P.zzz_mi, P.bigboss99, me);
      let shot = false, dodged = false;
      B.dir = (dt, g, t) => {
        idle(t, new Set([nb, tb, P.xX_vex_Xx]));
        const vx = P.xX_vex_Xx;
        if (vx.state === 'normal') { if (!shot) steer(vx, nb.x + 18, nb.y, false); else still(vx); }
        if (!shot && tb.state === 'normal') { steer(tb, H.x + 22, U.clamp(nb.y, H.y - 22, H.y + 22), false); face(tb, nb); }
        if (!shot && B.marks.no == null && nb.x < H.x + 110) { mark('no'); E.comic(tb.x + 4, tb.y - 28, 'NO NO NO', '#ff3d5a', 1.0, 1.4); }
        if (shot && tb.state === 'normal') still(tb);
        if (nb.state !== 'normal') return;
        if (shot) { still(nb); return; }
        if (b.owner !== nb) { steer(nb, b.x, b.y, true); return; }
        if (!dodged && U.dist(nb, tb) < 34) { nb.cd.skill = 0; Act.skill(g, nb, -0.6, -1); dodged = true; mark('dodge'); return; }
        if (dodged && nb.x < H.x + 52) {
          shot = true; mark('shot');
          nb.facing = PI; Act.startAttack(nb, 'shoot');
          b.kick(nb, -320, (H.y - b.y) * 2.2, 20); b.kind = 'shot'; g.sfx('kick', 0.8);
          keep(g, nb, tb);
          g.later(0.35, () => { nb.state = 'normal'; nb.airVz = 230; nb.airZ = 0.5; nb.facing = PI / 2; E.comic(nb.x, nb.y - 40, 'GOLAZO!', '#ffe14f', 1.2, 1.2); });
          return;
        }
        steer(nb, H.x + 10, H.y + (dodged ? -10 : 6), true);
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, H.x + 75), y: H.y } : { x: Math.max(nb.x - 20, H.x + 75), y: nb.y });
    },

    /* P6 the Titan friend: he goes giant and runs straight through his own two teammates first */
    pa_titan() {
      const { g, P, F, E, b } = pvp({});
      const tb = P.tuanbeo, me = P.NGH, kt = P.kaito_04;
      const idle = crowd(g, [[P.zzz_mi, 548, 203], [P.xX_vex_Xx, 430, 175], [P.bigboss99, 445, 240]]);
      place(tb, 236, 206, 0); place(me, 292, 198, 0); place(kt, 330, 214, 0);
      give(g, tb);
      keep(g, me, kt, P.zzz_mi, P.xX_vex_Xx, P.bigboss99);
      at(0.15, () => E.comic(me.x, me.y - 26, 'PASS?', '#ffffff', 0.8, 0.7));
      let fired = false;
      const hitBy = new Set();
      B.dir = (dt, g, t) => {
        idle(t, new Set([tb, me, kt, P.xX_vex_Xx, P.bigboss99]));
        for (const o of [P.xX_vex_Xx, P.bigboss99]) if (o.state === 'normal') { still(o); face(o, tb); }
        if (!fired) { still(tb); face(tb, me); tb.res.ult = 1; if (t > 0.3) { fired = g.cores.activateUltimate(tb); if (fired) mark('ult'); } }
        for (const q of [me, kt]) if (q.state === 'normal' && !hitBy.has(q)) { still(q); if (fired && B.t - B.marks.ult > 0.75) face(q, tb); else q.facing = 0; }
        if (!fired || B.t - B.marks.ult < 0.85) return;
        if (tb.state === 'normal') { tb.intent.mx = 1; tb.intent.my = 0.02; tb.intent.sprint = true; }
        for (const q of [me, kt]) {
          if (hitBy.has(q) || U.dist(tb, q) > 6 * (tb.sizeMul || 1) + q.radius + 4) continue;
          hitBy.add(q); mark(q === me ? 'squish1' : 'squish2');
          smash(q, 160, q.y < tb.y ? -260 : 260, 230, 2.5, tb);
          E.comic(q.x, q.y - 30, q === me ? 'SQUISH!' : 'BONK!', '#ff3d5a', 1.2, 0.8); E.shake(5, 0.25); g.sfx('hit', 'hard');
        }
      };
      B.focusFn = () => ({ x: tb.x + 30, y: 206 });
    },

    /* P7 "don't dropkick me": so I didn't. HUNDRED FISTS instead, the finisher blasts him into the wall */
    pa_dontdk() {
      const { g, P, F, E, b } = pvp({ home: 'neon_strikers', away: 'cyber_united', me: 'xX_vex_Xx' });
      const me = P.xX_vex_Xx, mo = P.mochi;
      const idle = crowd(g, [[P.zzz_mi, 140, 230], [P.bigboss99, 230, 290], [P.DUKE, 548, 203], [P['panda.exe'], 470, 280]]);
      place(me, 292, 128, 0); place(mo, 350, 128, PI);
      give(g, mo);
      keep(g, P.zzz_mi, P.bigboss99, P.DUKE, P['panda.exe']);
      at(0.1, () => E.comic(mo.x, mo.y - 28, "DON'T", '#ffffff', 0.9, 0.9));
      let fired = false, slam = null;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(me); face(me, mo); if (mo.state === 'normal') { still(mo); face(mo, me); } me.res.ult = 1;
          if (t > 0.6) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } return; }
        if (me.state === 'normal') still(me);
        if (mo.state === 'normal') still(mo);
        if (!slam && mo.y <= F.y + mo.radius + 2 && B.t - B.marks.ult > 1.2) { slam = { x: mo.x, y: mo.y + 30 }; mark('slam'); }
      };
      B.focusFn = () => slam || t0focus(me, mo);
    },

    /* P8 trash talk vs reality: he dribbles by the top wall... dropkick, WALL SLAM, CRACK, the ball bounces back to us */
    pa_trash() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc', me: 'tuanbeo' });
      const me = P.tuanbeo, jx = P.jinx;
      g.cores.add(me, 'heavy_boot'); g.cores.add(me, 'wall_slam');
      const idle = crowd(g, [[P.NGH, 330, 270], [P.kaito_04, 200, 220], [P.m0le, 556, 203], [P.ratking, 380, 230]]);
      place(me, 452, 194, -PI / 2); place(jx, 462, 138, PI / 2);
      give(g, jx);
      keep(g, P.NGH, P.kaito_04, P.m0le, P.ratking);
      let kicked = false, stash = 0, back = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!kicked) {
          if (jx.state === 'normal') { jx.intent.mx = Math.sin(t * 4.2) * 0.32; jx.intent.my = 0; jx.intent.sprint = false; }
          if (t < 0.95) { still(me); face(me, jx); return; }
          steer(me, jx.x - 2, jx.y + 30, false);
          if (U.dist(me, jx) < 40) { face(me, { x: jx.x + 3, y: jx.y - 10 }); me.cd.hard = 0; kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        keep(g, jx);
        if (jx.state === 'stun' && B.marks.hit == null) { mark('hit'); if (!b.owner) { b.vx = jx.kbx * 0.15; b.vy = Math.min(-150, jx.kby * 0.6); } }
        if (B.marks.hit != null && B.marks.bonk == null && jx.y <= F.y + jx.radius + 1) { mark('bonk'); jx.kbx *= 0.2; jx.kby = 30; }   // he sticks to the wall, slides down
        if (B.marks.bonk != null && !back) {
          if (!stash) { stash = 1; b.vx = 0; b.vy = -230; }
          else if (b.vy > 0) { const d = U.norm(me.x - b.x, me.y + 3 - b.y), sp = Math.max(140, Math.hypot(b.vx, b.vy)); b.vx = d.x * sp; b.vy = d.y * sp; b.lastKickTeam = -1; b.kind = null; b.noPickup.set(me.id, 0); back = true; mark('back'); }
        }
        if (me.state !== 'normal') return;
        if (b.owner === me) { mark('own'); still(me); face(me, jx); } else if (!b.owner && B.marks.bonk != null) steer(me, b.x, b.y, false); else still(me);
      };
      B.focusFn = () => ({ x: 460, y: 156 });
    },

    /* P9 duo steals the goal: my shot is rolling into the empty net, my duo sprints in and taps it over the line. MINE! */
    pa_steal() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, tb = P.tuanbeo, kp = P.zzz_mi;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.kaito_04, 250, 250], [P.bigboss99, G.x - 180, G.y + 100], [P.xX_vex_Xx, 330, 150]]);
      place(me, G.x - 100, G.y + 40, 0); place(tb, G.x - 138, G.y - 34, 0); place(kp, G.x - 30, G.y + 30, PI);
      give(g, me);
      keep(g, tb, kp, P.kaito_04, P.bigboss99, P.xX_vex_Xx);
      let shot = false, tapped = false, dived = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot) { still(me); face(me, G); still(tb); face(tb, G); if (kp.state === 'normal') { still(kp); face(kp, me); } }
        if (!shot && t > 0.4) { Act.shoot(g, me, 0, -0.5); shot = true; mark('shot'); }
        if (!shot) return;
        keep(g, me);
        if (me.state === 'normal') { still(me); face(me, b); }
        if (!dived && B.t - B.marks.shot > 0.12) { dived = true; Act.dive(g, kp, 40); mark('dive'); }
        if (dived && kp.state === 'normal') { still(kp); kp.poseEnd = 99; }
        if (!tapped && !b.owner) {
          const tx = G.x + 6, ty = G.y - 22, d = U.norm(tx - b.x, ty - b.y);
          const sp = Math.max(48, 112 - (B.t - B.marks.shot) * 120);
          b.vx = d.x * sp; b.vy = d.y * sp; b.z = Math.min(b.z, 2); b.vz = 0;
        }
        if (!tapped) {
          if (B.t - B.marks.shot > 0.15) { steer(tb, b.x - 4, b.y, true); tb.stamina = 99; } else still(tb);
          if (U.dist(tb, b) < 10 && b.x > G.x - 34) {
            tapped = true; mark('tap'); b.noPickup.set(tb.id, 0); g.gainPossession(tb); face(tb, G); Act.shoot(g, tb, 0, -0.4);
            E.comic(tb.x, tb.y - 30, 'MINE!', '#ffe14f', 1.1, 0.8);
          }
        } else if (tb.state === 'normal') still(tb);
      };
      B.focusFn = () => (B.marks.tap != null ? { x: G.x - 40, y: G.y - 10 } : { x: Math.max(b.x, G.x - 90) - 20, y: b.y - 6 });
    },

    /* P10 the meteor lands: their DUKE leaps off the map, the shadow follows our three... METEOR DROP on all of us */
    pa_meteor() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'cyber_united' });
      const me = P.NGH, tb = P.tuanbeo, kt = P.kaito_04, dk = P.DUKE;
      const idle = crowd(g, [[P.mochi, 470, 150], [P['panda.exe'], 490, 262]]);
      place(me, 318, 206, 0); place(tb, 336, 184, 0); place(kt, 334, 230, 0); place(dk, 405, 206, PI);
      give(g, me);
      keep(g, tb, kt, dk, P.mochi, P['panda.exe']);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(dk); face(dk, me); dk.res.ult = 1; if (t > 0.25) { fired = g.cores.activateUltimate(dk); if (fired) mark('ult'); } }
        if (dk.state === 'meteor') { mark('air'); steer(dk, (me.x + tb.x + kt.x) / 3, (me.y + tb.y + kt.y) / 3, true); }
        if (B.marks.land == null && fired && dk.state !== 'meteor' && B.marks.air != null) mark('land');
        // our three: keep jogging on... then panic and bunch up
        const k = fired ? B.t - B.marks.ult : -1;
        for (const [q, oy] of [[me, 0], [tb, -20], [kt, 22]]) {
          if (q.state !== 'normal') continue;
          if (k < 0.9) { if (q === me) { q.intent.mx = 0.25; q.intent.my = 0; } else steer(q, me.x + 16, me.y + oy, false); }
          else { const a = t * 9 + q.id; q.intent.mx = Math.cos(a) * 0.5; q.intent.my = Math.sin(a) * 0.5; q.intent.sprint = false; }
        }
      };
      B.focusFn = () => ({ x: (me.x + tb.x + kt.x) / 3 + 10, y: 206 });
    },

    /* P11 3 friends vs 3 strangers: their striker has the ball, the three of us dropkick him at once, then walk it in */
    pa_strangers() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc' });
      const me = P.NGH, tb = P.tuanbeo, kt = P.kaito_04, rk = P.ratking, kp = P.m0le;
      const G = g.attackGoal(0);
      for (const q of [me, tb, kt]) g.cores.add(q, 'heavy_boot');
      const idle = crowd(g, [[P.jinx, 330, 118], [kp, G.x - 22, G.y]]);
      place(rk, 420, 205, PI); place(me, 376, 207, 0); place(tb, 424, 162, PI / 2); place(kt, 424, 250, -PI / 2);
      give(g, rk);
      keep(g, tb, kt, P.jinx, kp);
      // all three kicks must land: every hit on him goes through while the three of them are mid-kick
      const hit0 = rk.hit.bind(rk);
      let nHits = 0;
      rk.hit = (o) => { if (B.marks.kick != null && nHits < 3) { rk.state = 'normal'; rk.hitImmune = 0; } const r = hit0(o); if (r) { nHits++; if (nHits === 3) mark('third'); } return r; };
      let kicked = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t, new Set(shot ? [] : [kp]));
        if (!shot && kp.state === 'normal') { steer(kp, G.x - 22, G.y + Math.sin(t * 2) * 6, false); face(kp, b); }
        if (shot && kp.state === 'normal') { steer(kp, G.x - 24, G.y + 44, true); keep(g, kp); }
        if (!kicked) {
          if (rk.state === 'normal') { still(rk); face(rk, me); }
          for (const q of [me, tb, kt]) { still(q); face(q, rk); }
          if (t > 0.75) { for (const q of [me, tb, kt]) { q.cd.hard = 0; face(q, rk); Act.hardAttack(g, q); } kicked = true; mark('kick'); }
          return;
        }
        keep(g, rk);
        for (const q of [me, tb, kt]) if (q.state === 'kick' || q.state === 'windup') q.hardLanded = true;   // three boots on one guy: none of them reads as a MISS
        if (rk.state === 'stun' && B.marks.fly == null && (nHits >= 3 || B.t - B.marks.kick > 0.3)) { mark('fly'); rk.kbx = 340; rk.kby = 0; rk.airVz = Math.min(Math.max(rk.airVz, 150), 200); E.comic(me.x + 30, 172, 'TRIPLE!', '#ffe14f', 1.5, 0.9); }
        for (const q of [tb, kt]) if (q.state === 'normal') still(q);
        if (B.marks.fly != null && B.marks.pick == null && B.t - B.marks.fly > 0.2 && me.state === 'normal') { mark('pick'); free(g, me); b.owner = null; g.gainPossession(me); }
        if (me.state !== 'normal') return;
        if (shot) { still(me); return; }
        if (b.owner !== me) { if (B.marks.pick != null) steer(me, b.x, b.y, false); else still(me); return; }
        mark('own');
        if (B.t - B.marks.own < 0.3) { me.intent.mx = 0.4; me.intent.my = 0; return; }
        face(me, G); Act.shoot(g, me, 0.8, -0.35); shot = true; mark('shot'); keep(g, kp); if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, 40); }
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, 470), y: 203 } : B.marks.fly != null ? { x: U.clamp((me.x + rk.x) / 2, 420, 480), y: 203 } : { x: 410, y: 206 });
    },

    /* P12 rage quit: I dropkick him off the ball, he LEFT (the game's own banner)... and the AI that takes over steals it and scores */
    pa_ragequit() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, vx = P.xX_vex_Xx, kp = P.kaito_04;
      const H = g.ownGoal(0);
      const idle = crowd(g, [[P.tuanbeo, 250, 120], [P.bigboss99, 300, 270], [P.zzz_mi, 520, 203]]);
      place(vx, 222, 206, PI); place(me, 176, 210, 0); place(kp, H.x + 22, H.y, 0);
      give(g, vx);
      me.stats = Object.assign({}, me.stats, { dribble: 0.05 });   // the AI's steal must land first time
      keep(g, kp, P.tuanbeo, P.bigboss99, P.zzz_mi);
      let kicked = false, back = false, stole = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot && kp.state === 'normal') { steer(kp, H.x + 22, U.clamp(b.y, H.y - 20, H.y + 20), false); face(kp, b); }
        if (!kicked) {
          if (vx.state === 'normal') { vx.intent.mx = -0.3; vx.intent.my = 0; }
          still(me); face(me, vx);
          if (t > 0.3 && U.dist(me, vx) < 34) { me.cd.hard = 0; face(me, vx); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (vx.state === 'stun' && B.marks.fly == null) { mark('fly'); vx.kbx *= 0.45; vx.kby *= 0.45; vx.airVz *= 0.7; }
        if (B.marks.left == null && B.marks.fly != null && B.t - B.marks.fly > 0.45) { mark('left'); SFC.UI.banner('xX_vex_Xx LEFT', 'AI takes over', '#9aa3b5', 1.6); }
        // the AI takes over: straight up, straight at me
        if (!back && B.marks.left != null && B.t - B.marks.left > 0.3 && vx.airZ <= 0.5) { back = true; mark('ai'); vx.state = 'normal'; vx.stateT = 0; vx.airZ = 0; vx.kbx = vx.kby = 0; }
        if (!stole) {
          free(g, me); keep(g, vx);
          if (me.state === 'normal') { if (b.owner !== me) steer(me, b.x, b.y, false); else { still(me); face(me, vx); } }
          if (back && vx.state === 'normal') {
            steer(vx, me.x + 14, me.y, true);
            if (U.dist(vx, me) < 24 && b.owner === me) { vx.cd.light = 0; face(vx, me); if (Act.lightAttack(g, vx)) { stole = true; mark('steal'); } }
          }
          return;
        }
        keep(g, me); free(g, vx);
        if (me.state === 'normal') still(me);
        if (vx.state !== 'normal' || shot) { if (shot) still(vx); return; }
        if (b.owner !== vx) { steer(vx, b.x, b.y, true); return; }
        mark('own');
        if (B.t - B.marks.own < 0.12) { still(vx); face(vx, H); return; }
        face(vx, H); Act.shoot(g, vx, 0.9, -0.5); shot = true; mark('shot'); keep(g, kp);
        if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, 30); }
      };
      B.focusFn = () => (shot ? { x: Math.min(Math.max(b.x, 110), 200), y: 203 } : { x: U.clamp((me.x + vx.x) / 2, 150, 260), y: 206 });
    },

    /* P13 never passes: he dribbles on, we shout PASS three times... both of us dropkick him at once, then the ball finally moves */
    pa_nopass() {
      const { g, P, F, E, b } = pvp({});
      const tb = P.tuanbeo, me = P.NGH, kt = P.kaito_04;
      for (const q of [me, kt]) g.cores.add(q, 'heavy_boot');
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.zzz_mi, G.x - 22, G.y], [P.xX_vex_Xx, 450, 150], [P.bigboss99, 470, 262]]);
      place(tb, 236, 206, 0); place(me, 262, 158, 0); place(kt, 262, 256, 0);
      give(g, tb);
      keep(g, me, kt, P.zzz_mi, P.xX_vex_Xx, P.bigboss99);
      B.traitor = me;
      at(0.2, () => E.comic(me.x, me.y - 24, 'PASS!', '#ffffff', 0.9, 0.7));
      at(0.6, () => E.comic(kt.x, kt.y - 24, 'PASS!!', '#ffffff', 1.0, 0.7));
      at(1.0, () => E.comic(me.x, me.y - 24, 'PASS!!!', '#ff3d5a', 1.15, 0.7));
      let kicked = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!kicked) {
          if (b.owner === tb) { tb.intent.mx = 0.5; tb.intent.my = 0; tb.intent.sprint = false; }
          if (t < 1.2) { steer(me, tb.x + 18, 158, false); steer(kt, tb.x + 18, 256, false); return; }
          steer(me, tb.x + 4, tb.y - 22, true); steer(kt, tb.x + 4, tb.y + 22, true);
          if (U.dist(me, tb) < 30 && me.state === 'normal') { for (const q of [me, kt]) { q.cd.hard = 0; face(q, tb); Act.hardAttack(g, q); } kicked = true; mark('kick'); }
          return;
        }
        if (tb.state === 'stun' && B.marks.hit == null) { mark('hit'); tb.kbx = 120; tb.kby = 40; tb.airVz = Math.max(tb.airVz, 230); E.comic(tb.x, tb.y - 34, 'DOUBLE!', '#ffe14f', 1.4, 0.9); }
        if (B.marks.hit == null && kicked && B.t - B.marks.kick > 0.32 && tb.state === 'normal') { mark('hit'); smash(tb, 120, 40, 230, 2.5, me); E.comic(tb.x, tb.y - 34, 'DOUBLE!', '#ffe14f', 1.4, 0.9); }
        free(g, me);
        if (me.state === 'normal') { if (b.owner === me) { if (B.marks.pass == null && B.t - B.marks.kick > 0.9) { Act.passTo(g, me, kt, 'ground'); mark('pass'); } else still(me); } else if (!b.owner) steer(me, b.x, b.y, false); else still(me); }
        if (kt.state === 'normal') { if (B.marks.pass != null) free(g, kt); if (b.owner === kt) { kt.intent.mx = 0.4; kt.intent.my = 0; } else still(kt); }
      };
      B.focusFn = () => (B.marks.hit != null ? { x: U.clamp((me.x + tb.x) / 2, 280, 400), y: 206 } : { x: tb.x + 20, y: 206 });
    },

    /* P14 "I'd score from here": a full charge from the halfway line becomes a black hole that drags the defender and their keeper into the net */
    pa_bet() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, kp = P.bigboss99, d1 = P.xX_vex_Xx, d2 = P.zzz_mi;
      g.cores.add(me, 'black_hole');
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.tuanbeo, 230, 270], [P.kaito_04, 150, 160]]);
      place(me, G.x - 262, G.y + 4, 0); place(d1, G.x - 150, G.y - 34, PI); place(d2, G.x - 112, G.y + 36, PI); place(kp, G.x - 18, G.y, PI);
      give(g, me);
      keep(g, kp, d1, d2, P.tuanbeo, P.kaito_04);
      let shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot) {
          for (const o of [d1, d2]) { still(o); face(o, me); }
          steer(kp, G.x - 18, G.y + Math.sin(t * 2) * 5, false); face(kp, me);
          me.intent.mx = 0.35; me.intent.my = 0;
          if (t > 0.6) { face(me, G); Act.shoot(g, me, 1, 0); shot = true; mark('shot'); }
          return;
        }
        still(me);
        if (b.x < G.x + 4 && B.marks.goal == null) { b.owner = null; b.vx = B.t - B.marks.shot < 0.25 ? Math.max(b.vx * 0.9, 100) : 100; b.vy = (G.y - b.y) * 1.2; b.z = Math.min(b.z, 2); }
        for (const o of [d1, d2, kp]) {
          const d = Math.hypot(b.x - o.x, b.y - o.y);
          if (d < 90 && b.x < G.x) { if (o.state === 'normal') { o.state = 'stun'; if (B.marks['grab_' + o.name] == null) mark('grab_' + o.name); } o.stateT = Math.max(o.stateT, 0.4); o.x += (b.x - o.x) * Math.min(1, dt * 3.2); o.y += (b.y - o.y) * Math.min(1, dt * 3.2); o.facing += dt * 14; }
        }
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x - 20, G.x - 60), y: b.y } : me);
    },

    /* P15 best friends, different teams: I'm through on goal, my best friend is in their box... he sprints off his line and dropkicks me */
    pa_bestie() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, kp = P.zzz_mi;
      const G = g.attackGoal(0);
      g.cores.add(kp, 'heavy_boot');
      const idle = crowd(g, [[P.tuanbeo, 340, 140], [P.kaito_04, 250, 250], [P.bigboss99, 380, 262], [P.xX_vex_Xx, 330, 196]]);
      place(me, 440, 212, 0); place(kp, G.x - 22, G.y, PI);
      give(g, me);
      keep(g, P.tuanbeo, P.kaito_04, P.bigboss99, P.xX_vex_Xx);
      let kicked = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!kicked) {
          if (b.owner === me) { me.intent.mx = 0.4; me.intent.my = -0.03; me.intent.sprint = false; }
          if (t < 0.55) { steer(kp, G.x - 22, G.y + Math.sin(t * 5) * 8, false); face(kp, me); return; }
          steer(kp, me.x + 12, me.y, true);
          if (U.dist(kp, me) < 34 && kp.state === 'normal') { face(kp, me); kp.cd.hard = 0; kicked = Act.hardAttack(g, kp); if (kicked) mark('kick'); }
          return;
        }
        if (me.state === 'stun' && B.marks.hit == null) { mark('hit'); me.kbx = Math.min(me.kbx, -260); me.airVz = Math.max(me.airVz, 200); }
        if (me.state === 'normal') still(me);
        if (kp.state === 'normal') { if (B.marks.hit != null && B.marks.sorry == null && B.t - B.marks.hit > 0.5) { mark('sorry'); E.comic(kp.x, kp.y - 28, 'SORRY!', '#ffffff', 1.0, 1.0); } if (b.owner === kp) { still(kp); face(kp, me); } else if (!b.owner) steer(kp, b.x, b.y, false); else still(kp); }
      };
      B.focusFn = () => (B.marks.hit != null ? { x: U.clamp((me.x + kp.x) / 2, 420, 500), y: 208 } : t0focus(me, { x: Math.max(kp.x - 30, me.x + 40), y: kp.y }));
    },

    /* P16 aura farming: he just stands there glowing; I walk up to take the ball and faint before I touch him */
    pa_aura() {
      const { g, P, F, E, b } = pvp({ me: 'kaito_04' });
      const me = P.kaito_04, bb = P.bigboss99;
      const idle = crowd(g, [[P.NGH, 230, 140], [P.tuanbeo, 210, 270], [P.zzz_mi, 548, 203], [P.xX_vex_Xx, 470, 140]]);
      place(me, 336, 206, 0); place(bb, 394, 202, PI);
      give(g, bb);
      keep(g, P.NGH, P.tuanbeo, P.zzz_mi, P.xX_vex_Xx);
      let fired = false, fell = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { bb.res.ult = 1; if (t > 0.12) { fired = g.cores.activateUltimate(bb); if (fired) mark('ult'); } }
        if (bb.state === 'normal' && (!fell || B.t - B.marks.faint < 0.9)) { still(bb); face(bb, me); }
        else if (bb.state === 'normal' && b.owner === bb) { bb.intent.mx = -0.3; bb.intent.my = 0.12; }
        if (!fell && me.state === 'normal') { if (t < 0.8) { still(me); face(me, bb); } else steer(me, bb.x - 4, bb.y, true); }
        if (!fell && t > 0.8 && U.dist(me, bb) < 28) {
          fell = true; mark('faint');
          smash(me, -120, 30, 120, 3, bb);
          E.comic(me.x, me.y - 28, '*faints*', '#ffe14f', 1.0, 1.1);
        }
      };
      B.focusFn = () => ({ x: (me.x + Math.min(bb.x, 420)) / 2, y: 204 });
    },

    /* P17 the whole lobby only dropkicks: six at the centre circle, whistle, all six dropkick at once, all six fly... the ball rolls in alone */
    pa_lobby() {
      const { g, P, F, E, b } = pvp({});
      const pairs = [[P.NGH, P.xX_vex_Xx, -34], [P.tuanbeo, P.bigboss99, 0], [P.kaito_04, P.zzz_mi, 34]];
      for (const p of g.players) g.cores.add(p, 'heavy_boot');
      for (const [a, c, dy] of pairs) { place(a, F.cx - 30, F.cy + dy, 0); place(c, F.cx + 30, F.cy + dy, PI); }
      loose(g, F.cx, F.cy);
      keep(g, ...g.players);
      at(0.3, () => { g.sfx('whistle'); mark('whistle'); });
      let go = false;
      B.dir = (dt, g, t) => {
        for (const [a, c] of pairs) for (const [x, y] of [[a, c], [c, a]]) {
          if (t < 0.35) { still(x); face(x, y); continue; }
          if (B.marks.kick == null && x.state === 'normal') steer(x, y.x, y.y, true);
        }
        if (t >= 0.35 && !go) { go = true; mark('go'); }
        if (go && B.marks.kick == null && U.dist(P.NGH, P.xX_vex_Xx) < 34) {
          for (const [a, c] of pairs) for (const [x, y] of [[a, c], [c, a]]) { face(x, y); x.cd.hard = 0; Act.hardAttack(g, x); }
          mark('kick');
        }
        if (B.marks.kick != null && B.marks.boom == null && B.t - B.marks.kick > 0.18) {
          mark('boom');
          for (const [a, c, dy] of pairs) { const sy = dy < 0 ? -1 : dy > 0 ? 1 : 0.15; smash(a, -230, sy * 170, 190, 6); smash(c, 230, sy * 170 + (dy === 0 ? -20 : 0), 190, 6); }
          E.comic(F.cx, F.cy - 40, 'SMASH!!', '#ff3d5a', 1.6, 0.9); E.flash(0.5); E.shake(7, 0.4); g.sfx('hit', 'hard');
        }
        if (B.marks.kick != null) for (const p of g.players) if (p.state === 'normal') still(p);
        if (B.marks.boom != null && B.t - B.marks.boom > 1.0 && B.marks.roll == null) { mark('roll'); b.vx = 175; b.vy = 0; }
        if (B.marks.roll != null && B.marks.goal == null) { const G0 = g.attackGoal(0); b.owner = null; b.z = 0; b.vz = 0; b.vx = Math.max(b.vx, 175); b.vy = (G0.y - b.y) * 0.8; }
      };
      B.focusFn = () => (B.marks.roll != null && B.t - B.marks.roll > 0.2 ? { x: Math.max(b.x, F.cx), y: F.cy } : { x: F.cx, y: F.cy });
    },

    /* P18 AFK: my friend stands frozen in front of their goal; their keeper's clearance smacks him in the head and goes in */
    pa_afk() {
      const { g, P, F, E, b } = pvp({});
      const afk = P.kaito_04, kp = P.zzz_mi, me = P.NGH;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.tuanbeo, 300, 260], [P.bigboss99, 380, 250], [P.xX_vex_Xx, 400, 140]]);
      place(afk, G.x - 62, G.y + 2, PI / 2); place(kp, G.x - 22, G.y, PI); place(me, G.x - 140, G.y - 60, 0);
      give(g, kp);
      keep(g, afk, me, P.tuanbeo, P.bigboss99, P.xX_vex_Xx);
      at(0.15, () => E.comic(afk.x, afk.y - 26, 'AFK', '#9aa3b5', 0.9, 2.2));
      let cleared = false, bonk = false;
      B.dir = (dt, g, t) => {
        idle(t);
        still(afk); afk.facing = PI / 2; afk.anim = 0;
        if (me.state === 'normal') { if (!bonk) steer(me, G.x - 120, G.y - 40, false); else still(me); face(me, b); }
        if (!cleared) { if (kp.state === 'normal') { still(kp); face(kp, afk); } if (t > 0.9) { b.kick(kp, -330, (afk.y - kp.y) * 2, 28); b.kind = 'pass'; Act.startAttack(kp, 'shoot'); g.sfx('kick', 0.9); cleared = true; mark('clear'); keep(g, kp); } return; }
        if (!bonk && U.dist(b, afk) < 10) {
          bonk = true; mark('bonk');
          b.kick(afk, 300, (G.y + 14 - b.y) * 2.2, 40); b.kind = 'shot';
          E.comic(afk.x, afk.y - 32, 'BONK', '#ffffff', 1.1, 0.8); g.sfx('hit', 'light');
          if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, -40); }
        }
        if (bonk && kp.state === 'normal') { still(kp); kp.poseEnd = 99; }
      };
      B.focusFn = () => ({ x: G.x - 58, y: G.y });
    },

    /* P19 celebrating in front of me: he scores, runs over and does the SIUUU jump right in my face... dropkick mid-air */
    pa_celebrate() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc' });
      const me = P.NGH, ml = P.m0le, kp = P.kaito_04;
      const H = g.ownGoal(0);
      g.cores.add(me, 'heavy_boot');
      const idle = crowd(g, [[P.tuanbeo, 230, 120], [P.jinx, 300, 270], [P.ratking, 330, 160]]);
      place(ml, H.x + 92, H.y + 30, PI); place(kp, H.x + 20, H.y - 8, 0); place(me, H.x + 150, H.y + 6, PI);
      give(g, ml);
      keep(g, kp, me, P.tuanbeo, P.jinx, P.ratking);
      let shot = false, resumed = false, jumped = false, kicked = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot) {
          still(ml); face(ml, H); still(kp); face(kp, ml); still(me); face(me, ml);
          if (t > 0.15) { face(ml, { x: H.x, y: H.y + 18 }); Act.shoot(g, ml, 0.9, 0.4); shot = true; mark('shot'); keep(g, kp, ml); kp.cd.skill = 0; Act.dive(g, kp, -40);
            g.later(0.75, () => { if (g.state === 'goal') { g.state = 'play'; resumed = true; mark('resume'); give(g, kp); keep(g, kp); } }); }
          return;
        }
        if (!resumed) return;
        if (kp.state === 'normal') { still(kp); }
        // he runs out to me...
        if (!jumped) {
          if (ml.state === 'normal') steer(ml, me.x - 26, me.y - 2, true);
          still(me); face(me, ml);
          if (U.dist(ml, me) < 32) { jumped = true; mark('jump'); still(ml); ml.facing = PI / 2; ml.airVz = 250; ml.airZ = 1; E.comic(ml.x, ml.y - 30, 'SIUUU!', '#ffe14f', 1.6, 1.2); ml.glow('#6bff4f', 1.2); }
          return;
        }
        if (!kicked && B.t - B.marks.jump > 0.12) { face(me, ml); me.cd.hard = 0; kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
        if (kicked && B.marks.hit == null && me.state === 'kick' && U.dist(me, ml) < 30) {
          mark('hit'); smash(ml, -330, -20, 120, 2.5, me);
          E.comic(ml.x, ml.y - 40, 'SMASH!', '#ff3d5a', 1.3, 0.8); E.flash(0.4); E.shake(6, 0.3);
        }
        if (me.state === 'normal' && kicked) still(me);
        if (ml.state === 'normal' && B.marks.hit == null) still(ml);
      };
      B.focusFn = () => (B.marks.resume == null ? { x: H.x + 100, y: H.y + 6 } : { x: U.clamp((me.x + ml.x) / 2, 120, 220), y: H.y });
    },

    /* P20 "I'm a pro": a slick dodge past the defender, open net from 5 metres... off the post */
    pa_pro() {
      const { g, P, F, E, b } = pvp({ home: 'cyber_united', away: 'underground_fc', me: 'mochi' });
      const me = P.mochi, jx = P.jinx, kp = P.m0le;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.DUKE, 300, 150], [P['panda.exe'], 330, 275], [P.ratking, 360, 120], [kp, G.x - 70, G.y - 95]]);
      place(me, 404, 214, 0); place(jx, 470, 212, PI);
      give(g, me);
      keep(g, jx, kp, P.DUKE, P['panda.exe'], P.ratking);
      let dodged = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t, new Set([jx]));
        if (jx.state === 'normal') { if (!dodged) { steer(jx, me.x + 16, me.y, false); } else { still(jx); face(jx, me); } }
        if (me.state !== 'normal') return;
        if (shot) { still(me); }
        else if (b.owner === me) {
          if (t < 0.3) { still(me); face(me, jx); }
          else if (!dodged && U.dist(me, jx) < 30) { me.cd.skill = 0; Act.skill(g, me, 0.5, -1); dodged = true; mark('dodge'); }
          else if (dodged && B.t - B.marks.dodge > 0.25 && me.x > G.x - 90) { face(me, { x: G.x, y: F.gBot - 2 }); Act.shoot(g, me, 0.85, 1); shot = true; mark('shot'); }
          else steer(me, G.x - 80, G.y + 18, dodged);
        } else if (!shot) steer(me, b.x, b.y, true);
        if (shot && B.marks.post == null && b.x > G.x - 8) {
          mark('post'); b.x = G.x - 8; b.y = Math.min(b.y, F.gBot + 2); b.vx = -Math.abs(b.vx) * 0.55; b.vy = 60; b.z = Math.min(b.z, 6);
          E.comic(G.x - 10, F.gBot + 14, 'CLANG', '#c7ccd6', 1.2, 0.8); g.sfx('clang'); E.shake(3, 0.2);
        }
        if (B.marks.post != null && B.marks.dots == null && B.t - B.marks.post > 0.5) { mark('dots'); E.comic(me.x, me.y - 26, '...', '#ffffff', 1.2, 1.2); }
      };
      B.focusFn = () => (shot ? { x: G.x - 50, y: U.clamp(b.y, 200, 240) } : { x: Math.max(me.x + 20, 430), y: 214 });
    },

    /* P21 the quiet one: says nothing all game... LIGHTNING DASH through all three of them, walks it in */
    pa_quiet() {
      const { g, P, F, E, b } = pvp({ me: 'kaito_04' });
      const me = P.kaito_04;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.NGH, 230, 140], [P.tuanbeo, 220, 275]]);
      const foes = [[P.xX_vex_Xx, 372, 200], [P.bigboss99, 424, 212], [P.zzz_mi, 474, 198]];
      for (const [q, x, y] of foes) place(q, x, y, PI);
      place(me, 304, 205, 0);
      give(g, me);
      keep(g, P.NGH, P.tuanbeo, ...foes.map((f) => f[0]));
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        for (const [q] of foes) if (q.state === 'normal') { still(q); face(q, me); }
        if (me.state !== 'normal') return;
        if (!fired) { me.intent.mx = 0.25; me.intent.my = 0; me.res.ult = 1; if (t > 0.6) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } return; }
        if (shot) { still(me); return; }
        if (b.owner !== me) { if (!b.owner) steer(me, b.x, b.y, false); return; }
        if (B.t - B.marks.ult < 0.7) { me.intent.mx = 0.6; me.intent.my = 0; return; }
        mark('own');
        if (G.x - me.x > 70) { steer(me, G.x - 60, G.y, false); return; }
        face(me, G); Act.shoot(g, me, 0.5, 0.2); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x - 30, 460), y: 205 } : { x: Math.max(me.x + 40, 360), y: 205 });
    },

    /* P22 the duo syncs: ENDLESS TIKI-TAKA, the other team slows to a crawl, four golden one-touch passes between the two of them, max shot */
    pa_sync() {
      const { g, P, F, E, b } = pvp({ home: 'cyber_united', away: 'neon_strikers', me: 'mochi' });
      const me = P.mochi, pd = P.DUKE, kp = P.zzz_mi, o1 = P.bigboss99;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P['panda.exe'], 230, 255], [P.xX_vex_Xx, 480, 140]]);
      place(me, 410, 184, 0); place(pd, 400, 232, 0); place(o1, 452, 208, PI); place(kp, G.x - 20, G.y, PI);
      give(g, me);
      keep(g, P['panda.exe'], P.xX_vex_Xx);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(me); face(me, G); still(pd); me.res.ult = 1; if (t > 0.3) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } }
        if (o1.state === 'normal') steer(o1, b.x, b.y, true);
        if (b.kind === 'shot' && b.owner == null && B.marks.ult != null && B.t - B.marks.ult > 1.0) mark('shot');
        if (B.marks.shot != null) { keep(g, kp, o1); steer(kp, G.x - 22, b.y > G.y ? G.y - 40 : G.y + 40, true); }
        else steer(kp, G.x - 20, G.y + Math.sin(t * 2) * 6, false);
        if (fired) { if (me.state === 'normal' && b.owner !== me) still(me); if (pd.state === 'normal' && b.owner !== pd) still(pd); }
      };
      B.focusFn = () => (B.marks.shot != null ? g.ball : { x: (me.x + pd.x) / 2 + 20, y: (me.y + pd.y) / 2 });
    },

    /* P23 nobody keeps: street 3v3 has no fixed keeper. All three of us step out of the box at once; their striker walks it in */
    pa_keeper() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc' });
      const me = P.NGH, tb = P.tuanbeo, kt = P.kaito_04, rk = P.ratking;
      const H = g.ownGoal(0);
      const idle = crowd(g, [[P.jinx, 290, 120], [P.m0le, 470, 220]]);
      place(kt, H.x + 30, H.y + 4, 0); place(tb, H.x + 52, H.y - 44, 0); place(me, H.x + 56, H.y + 50, 0); place(rk, 238, 198, PI);
      give(g, rk);
      keep(g, kt, tb, me, P.jinx, P.m0le);
      const outs = [[kt, H.x + 112, H.y - 6], [tb, H.x + 100, H.y - 96], [me, H.x + 104, H.y + 92]];
      at(0.95, () => { for (const [q] of outs) E.comic(q.x, q.y - 24, 'NOT ME', '#ffffff', 0.75, 0.8); mark('notme'); });
      let shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        for (const [q, x, y] of outs) if (q.state === 'normal') { if (t < 1.0) { still(q); face(q, rk); } else { steer(q, x, y, true); } }
        if (rk.state !== 'normal') return;
        if (shot) { still(rk); return; }
        if (t < 1.25) { rk.intent.mx = -0.3; rk.intent.my = 0.02; rk.intent.sprint = false; return; }
        if (rk.x > H.x + 150 && t < 1.7) { rk.intent.mx = -0.55; rk.intent.my = 0; return; }
        face(rk, H); Act.shoot(g, rk, 0.25, 0); shot = true; mark('shot');
      };
      B.focusFn = () => ({ x: U.clamp(Math.min(rk.x, b.x) - 40, 120, 200), y: 203 });
    },

    /* P24 "what does your ultimate do?": CLONE ARMY, four of him pour out and mug me for the ball */
    pa_reveal() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, zm = P.zzz_mi;
      const idle = crowd(g, [[P.tuanbeo, 220, 130], [P.kaito_04, 200, 270], [P.bigboss99, 470, 270], [P.xX_vex_Xx, 560, 203]]);
      place(me, 300, 208, 0); place(zm, 368, 202, PI);
      give(g, me);
      keep(g, P.tuanbeo, P.kaito_04, P.bigboss99, P.xX_vex_Xx);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(zm); face(zm, me); zm.res.ult = 1; if (t > 0.55) { fired = g.cores.activateUltimate(zm); if (fired) mark('ult'); } }
        if (me.state === 'normal') { if (b.owner === me) { me.intent.mx = fired ? 0.12 : 0.05; me.intent.my = 0; } else still(me); }
        if (fired && me.state === 'stun' && B.marks.mugged == null) mark('mugged');
        if (B.marks.mugged != null && B.marks.take == null && B.t - B.marks.mugged > 0.25) { mark('take'); keep(g, me); b.owner = null; g.gainPossession(zm); }
        if (fired && zm.state === 'normal' && B.t - B.marks.ult > 0.7) { if (b.owner === zm) { if (B.t - B.marks.take < 0.3) { still(zm); face(zm, me); } else { zm.intent.mx = -0.65; zm.intent.my = 0.15; zm.intent.sprint = false; } } else if (!b.owner) steer(zm, b.x, b.y, false); else still(zm); }
        else if (zm.state === 'normal') still(zm);
      };
      B.focusFn = () => ({ x: U.clamp((me.x + zm.x) / 2, 300, 360), y: 205 });
    },

    /* P25 last second, 2-2: their defender's huge clearance hits his own teammate in the back... and flies into their own net. GOAL x2 */
    pa_lastsecond() {
      const { g, P, F, E, b } = pvp({});
      const bb = P.bigboss99, vx = P.xX_vex_Xx, kp = P.zzz_mi, me = P.NGH;
      const G = g.attackGoal(0);
      g.teams[0].score = 2; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - (B.paRem || 3.4); g.finalPush = true; g.cfg.match.goldenGoal = false;
      const idle = crowd(g, [[P.tuanbeo, 400, 128], [P.kaito_04, 300, 262]]);
      place(me, G.x - 214, G.y + 34, 0); place(bb, G.x - 96, G.y + 14, PI); place(vx, G.x - 128, G.y + 6, PI); place(kp, G.x - 22, G.y - 4, PI);
      give(g, me);
      keep(g, bb, vx, kp, P.tuanbeo, P.kaito_04);
      let shot = false, got = false, cleared = false, bonk = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (kp.state === 'normal' && !bonk) { still(kp); face(kp, b); }
        if (vx.state === 'normal' && !bonk) { still(vx); face(vx, b.owner === bb ? me : b); }
        if (!shot) { still(bb); face(bb, me); if (me.state === 'normal') { me.intent.mx = 0.3; me.intent.my = -0.04; }
          if (t > 0.5) { const d = U.norm(bb.x - me.x, bb.y - me.y); me.facing = Math.atan2(d.y, d.x); Act.startAttack(me, 'shoot'); b.owner = null; b.kick(me, d.x * 330, d.y * 330, 12); b.kind = 'shot'; g.sfx('kick', 0.8); shot = true; mark('shot'); keep(g, me); }
          return; }
        if (me.state === 'normal') still(me);
        if (!got) { still(bb); face(bb, b); if (U.dist(b, bb) < 11) { got = true; mark('block'); b.owner = null; g.gainPossession(bb); } return; }
        // the big clearance... straight into his own teammate's back
        if (!cleared) { still(bb); face(bb, vx); if (B.t - B.marks.block > 0.28) { const d = U.norm(vx.x - bb.x, vx.y - bb.y); Act.startAttack(bb, 'shoot'); b.owner = null; b.kick(bb, d.x * 430, d.y * 430, 14); b.kind = 'pass'; g.sfx('kick', 1); cleared = true; mark('clear'); E.comic(bb.x, bb.y - 28, 'CLEAR!', '#ffffff', 0.9, 0.6); } return; }
        if (!bonk && U.dist(b, vx) < 12) {
          bonk = true; mark('bonk');
          const d = U.norm(G.x + 8 - b.x, G.y - 14 - b.y);
          b.kick(vx, d.x * 440, d.y * 440, 18); b.kind = 'shot';
          E.comic(vx.x, vx.y - 30, 'BONK', '#ffffff', 1.1, 0.8); g.sfx('hit', 'light');
          if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, 40); }
        }
        if (bonk && kp.state === 'normal') { still(kp); kp.poseEnd = 99; }
        if (bb.state === 'normal') still(bb);
      };
      B.focusFn = () => ({ x: G.x - 92, y: G.y + 8 });
    },
  });
})();
