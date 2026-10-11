/* ba scenes (bodies B2-B6): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with ba_. Nothing here runs at load time except Object.assign. */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, mark, match, cast, noAttack } = BRAG.lib;
  const B = BRAG;

  // the director drives our player itself: switch off keyboard handling (same trick as scenes_ga.js, own flag)
  const noHuman = () => {
    if (!SFC.Human.__ba) {
      const h0 = SFC.Human.update;
      SFC.Human.update = function () { if (B.baNoHuman) return; return h0.apply(this, arguments); };
      SFC.Human.__ba = true;
    }
    B.baNoHuman = true;
  };
  // menu / story screens: SFC.Audio cues are not game sfx -> log them under names audio.py knows
  const logMenuAudio = () => {
    const A = SFC.Audio;
    if (A.__ba) return;
    A.__ba = true;
    const map = { whoosh: 'whoosh', hit: 'hit', upgrade: 'upgrade', reveal: 'upgrade', kick: 'kick' };
    for (const k of Object.keys(map)) {
      const f0 = A[k];
      if (typeof f0 !== 'function') continue;
      A[k] = function () { B.sfx.push({ t: B.t, name: map[k], arg: null }); return f0.apply(this, arguments); };
    }
  };
  // 3v3 now: park every player beyond the first two of each team far from the action (puppets, no attacks, never touch the ball)
  const bench = (g, spots) => {
    const out = [];
    g.teams.forEach((T, ti) => T.players.slice(2).forEach((p, k) => {
      const s = (spots && spots[ti] && spots[ti][k]) || (ti ? { x: 520, y: 110 + k * 30 } : { x: 110, y: 120 + k * 30 });
      place(p, s.x, s.y, ti ? PI : 0); out.push([p, s]);
    }));
    for (const [p] of out) { B.puppets.add(p); p.cd.light = p.cd.hard = 99; g.ball.noPickup.set(p.id, 99); }
    return () => { for (const [p, s] of out) { steer(p, s.x, s.y, false); } };
  };

  Object.assign(B.SCENES, {
    /* B3 STORY: grandpa's heirloom cut scene from the transform: "...now LET IT OUT!" -> burst -> AURA FARMING */
    ba_transform() {
      SFC.Profile.data.name = 'NGH';
      logMenuAudio();
      app.toMenu('home');
      app.screen = 'story';
      SFC.Story.play('heirloom', () => {}, 'transform');
      B.focusFn = () => ({ x: 320, y: 180 });
    },

    /* B6 D = PUNCH: the carrier dribbles at him, one jab, POW, the ball is his */
    ba_punch() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      place(me, 292, 206, 0); place(mate, 170, 262, 0); place(o1, 352, 204, PI); place(o2, 564, 203, PI);
      o1.stats.dribble = 0.05;                     // the jab always wins it (one clean take, no HOLD)
      me.res.ult = B.baUlt != null ? B.baUlt : 1;   // full bar: no "+ULT" text over the POW!
      give(g, o1);
      B.puppets = new Set([me, o1, o2, mate]); noAttack(o1, o2, mate);
      const benchStep = bench(g);
      const b = g.ball;
      for (const q of [o2, mate]) b.noPickup.set(q.id, 99);
      let punched = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 262, false); steer(o2, 564, 203, false); benchStep();
        if (!punched) {
          if (b.owner === o1) { o1.intent.mx = -0.42; o1.intent.my = 0; o1.intent.sprint = false; }
          if (t < (B.baGo || 0.35)) { still(me); face(me, o1); return; }
          steer(me, o1.x - 14, o1.y, false);
          if (U.dist(me, o1) < 23 && me.state === 'normal') { face(me, o1); me.cd.light = 0; if (Act.lightAttack(g, me)) { punched = true; mark('punch'); } }
          return;
        }
        b.noPickup.set(o1.id, 99);
        if (b.owner === me) { mark('own'); if (B.t - B.marks.own > (B.baHold || 0.25)) { me.intent.mx = 0.12; me.intent.my = -0.4; } else still(me); me.intent.sprint = false; }
        else if (me.state === 'normal' && !b.owner) steer(me, b.x, b.y, false);
        if (o1.state === 'normal') { still(o1); face(o1, me); }
      };
      B.focusFn = () => ({ x: (me.x + o1.x) / 2 + 6, y: (me.y + o1.y) / 2 });
    },

    /* B6 A = DROPKICK: he runs at the carrier, winds up (!), SMASH, the carrier flies */
    ba_kick() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      place(me, 282, 214, 0); place(mate, 170, 262, 0); place(o1, 348, 200, PI); place(o2, 564, 203, PI);
      me.res.ult = B.baUlt != null ? B.baUlt : 1;   // full bar: no "+ULT" text over the SMASH!
      give(g, o1);
      B.puppets = new Set([me, o1, o2, mate]); noAttack(o1, o2, mate);
      const benchStep = bench(g);
      const b = g.ball;
      for (const q of [o2, mate]) b.noPickup.set(q.id, 99);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 262, false); steer(o2, 564, 203, false); benchStep();
        if (o1.state === 'normal' && b.owner === o1) { o1.intent.mx = -0.4; o1.intent.my = 0.08; o1.intent.sprint = false; }
        if (!kicked) {
          if (t < (B.baGo || 0.3)) { still(me); face(me, o1); return; }
          steer(me, o1.x - 20, o1.y + 2, true);
          if (U.dist(me, o1) < (B.baKickD || 36) && me.state === 'normal') { face(me, o1); me.cd.hard = 0; if (Act.hardAttack(g, me)) { kicked = true; mark('windup'); } }
          return;
        }
        if (me.state === 'windup') face(me, o1);
        if (me.state === 'normal') still(me);
        if (o1.airZ > 0) mark('fly');
        b.noPickup.set(o1.id, 99);
      };
      B.focusFn = () => (kicked ? { x: (me.x + o1.x) / 2, y: (me.y + o1.y) / 2 - 6 } : { x: (me.x + o1.x) / 2, y: (me.y + o1.y) / 2 });
    },

    /* B6 Z = DODGE: he dribbles, the defender dropkicks, Z: he dashes through it (DODGE / MISS) and carries on */
    ba_dodge() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      place(me, 290, 206, 0); place(mate, 170, 262, 0); place(o1, 372, 204, PI); place(o2, 564, 203, PI);
      give(g, me);
      B.puppets = new Set([me, o1, o2, mate]); noAttack(o1, o2, mate);
      const benchStep = bench(g);
      const b = g.ball;
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      let kick = false, dodge = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 262, false); steer(o2, 564, 203, false); benchStep();
        me.stamina = 100;
        if (!kick) {
          if (b.owner === me && me.state === 'normal') { me.intent.mx = 0.3; me.intent.my = 0; me.intent.sprint = false; }
          if (t > (B.baGo || 0.25)) steer(o1, me.x + 10, me.y, true);
          if (t > (B.baGo || 0.25) && U.dist(me, o1) < (B.baKickD || 34) && o1.state === 'normal') { face(o1, me); o1.cd.hard = 0; if (Act.hardAttack(g, o1)) { kick = true; mark('windup'); } }
          return;
        }
        if (o1.state === 'windup') face(o1, me);
        if (!dodge) {
          if (b.owner === me && me.state === 'normal') still(me);
          if (B.t - B.marks.windup > (B.baDodgeT || 0.2)) { me.cd.skill = 0; Act.skill(g, me, B.baDx || 1, B.baDy || 0.3); dodge = true; mark('dodge'); }
          return;
        }
        if (me.state === 'normal' && b.owner === me) { me.intent.mx = 0.45; me.intent.my = 0.05; me.intent.sprint = false; }
        else if (me.state === 'normal' && !b.owner) steer(me, b.x, b.y, false);
        if (o1.state === 'normal') { still(o1); face(o1, me); }
      };
      B.focusFn = () => ({ x: (me.x + o1.x) / 2, y: (me.y + o1.y) / 2 - 4 });
    },
  });
})();
