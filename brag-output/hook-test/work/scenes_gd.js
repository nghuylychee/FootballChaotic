/* gd scenes (G49-G50): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with gd_. Nothing here runs at load time except Object.assign. */
(function () {
  const { U, Act, PI, place, give, face, steer, still, mark, match, cast, noAttack, t0focus } = BRAG.lib;
  const B = BRAG;

  // the director drives our player itself: keyboard handling off (it would release a charge we hold by hand).
  // Patched lazily, only when a gd_ scene is set up, so other batches' captures are untouched.
  const noHuman = () => {
    if (!SFC.Human.__gd) {
      const h0 = SFC.Human.update;
      SFC.Human.update = function () { if (B.gdNoHuman) return; return h0.apply(this, arguments); };
      SFC.Human.__gd = true;
    }
    B.gdNoHuman = true;
  };
  const hold = (p, k) => { p.charging = true; p.charge = Math.max(0, Math.min(1, k)); };

  Object.assign(B.SCENES, {
    /* G49 KEEPER SAVE: full-power shot at the top corner, the keeper reads it, full-stretch dive, fingertips, PARRY */
    gd_keeper() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0);
      const K0 = { x: G.x - 20, y: G.y + 20 };          // keeper sets himself on the near-post side
      const AIM = { x: G.x + 4, y: G.y - 35 };           // far top corner
      place(me, G.x - 172, G.y + 36, 0); place(o2, K0.x, K0.y, PI); place(mate, 250, 292, 0); place(o1, G.x - 270, G.y - 95, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      const b = g.ball, E = g.effects;
      let shot = false, dove = false, saved = false;
      B.dir = (dt, g, t) => {
        steer(mate, 250, 292, false); steer(o1, G.x - 270, G.y - 95, false);
        b.noPickup.set(o1.id, 99); b.noPickup.set(mate.id, 99);
        if (!shot) {
          hold(me, t / 0.5); me.intent.mx = 0.22; me.intent.my = -0.04; me.intent.sprint = false;
          steer(o2, K0.x, K0.y + Math.sin(t * 3.2) * 4, false); face(o2, me);
          if (t > 0.62) {
            face(me, AIM); Act.shoot(g, me, 1, -0.85);
            // full power, exactly at the top corner (no random spread)
            const sp = Math.hypot(b.vx, b.vy), d = U.norm(AIM.x - b.x, AIM.y - b.y);
            b.vx = d.x * sp; b.vy = d.y * sp;
            shot = true; mark('shot');
          }
          return;
        }
        still(me);
        if (!saved) b.noPickup.set(o2.id, 99);           // the save is scripted (the dice would decide otherwise)
        if (B.t - B.marks.shot > 1.0) b.noPickup.set(o2.id, 0);
        // he reads it: leaves it as late as he can, then flies so the fingertips meet it at the end of the stretch
        if (!dove && b.vx > 1) {
          const tta = (o2.x - b.x) / b.vx, ty = b.y + b.vy * tta, dy = ty + 7 - o2.y;
          if (tta <= Math.abs(dy) / g.cfg.player.gkDiveSpeed + 0.02) { dove = true; mark('dive'); o2.facing = PI; Act.dive(g, o2, dy); }
        }
        if (!saved && dove && b.x > o2.x - 7 && Math.abs(b.y - o2.y) < 15) {
          saved = true; mark('save');
          b.owner = null; b.vx = 45; b.vy = -200; b.vz = 150; b.lastKickTeam = -1; b.kind = null;
          E.comic(o2.x - 30, o2.y - 30, 'PARRY!', '#ffffff', 1.1, 1.0);
          { const c = E.V.comics[E.V.comics.length - 1]; c.t = c.max * 0.9; }   // no pop-in: readable on the contact frame
          E.burst(b.x, b.y, b.z, '#ffffff', 10, 90, 0.4); E.shake(4, 0.25);   // no flash: the edit freezes on this frame
          g.hitStop(0.06); g.sfx('save');
        }
        if (o2.state === 'normal') still(o2);
      };
      B.focusFn = () => (B.marks.save != null ? { x: G.x - 70, y: Math.min(G.y - 10, b.y + 20) } : { x: G.x - 92, y: G.y + 4 });
    },

    /* G50 JUGGLE x10: pop him up, then punches come faster and faster; one counter, parked above them, growing;
       the 10th punch (the counter turns red) spikes him into the floor */
    gd_juggle10() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'juggle');
      place(me, 300, 216, 0); place(o1, 316, 216, PI); place(mate, 170, 284, 0); place(o2, 540, 150, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate]) g.ball.noPickup.set(q.id, 99);
      const E = g.effects;
      const GOAL_N = B.gdJuggleN || 10;
      // bounce after each hit: a normal juggle at first, then the hits come faster and faster
      const lift = (n) => 80;
      let first = false, popped = false, last = 1, spiked = false, tenC = null;
      const ctr = () => ({ x: me.x + 9, y: me.y - 64 });
      // the game's own combo counter, restyled the moment it's made: one counter on screen, parked above them, growing
      const combo0 = E.combo;
      E.combo = function (x, y, n) {
        E.V.comics = E.V.comics.filter((c) => !/ HIT!$/.test(c.str || ''));
        combo0.call(this, x, y, n);
        const cur = E.V.comics[E.V.comics.length - 1], p0 = ctr();
        Object.assign(cur, { x: p0.x, y: p0.y, rot: -0.06, size: Math.min(1.6, 0.95 + n * 0.065) });
        if (n >= GOAL_N) Object.assign(cur, { size: 1.75, rot: -0.08, t: cur.max * 0.9 });   // the 10 lands full size (no pop-in)
        tenC = n >= GOAL_N ? cur : null;
      };
      B.dir = (dt, g, t) => {
        steer(mate, 170, 284, false); steer(o2, 540, 150, false);
        if (o1.state === 'normal' && !first) still(o1);
        // the first punch lands (end of the jab): he pops up whether or not the steal roll knocked the ball loose
        if (first && !popped && (o1.state === 'stun' || me.state === 'recover')) {
          popped = true; mark('pop');
          if (o1.state !== 'stun') { o1.state = 'stun'; o1.stateT = 0.7; }
          if (g.ball.owner === o1) g.looseBall(o1, -1, 0.3, 40);
          o1.airVz = 180; o1.airZ = Math.max(o1.airZ, 1); o1.kbx = o1.kby = 0;
        }
        const n = o1.juggleN || 1;
        if (B.gdTrace) B.gdTrace.push([+t.toFixed(3), n, +o1.airZ.toFixed(1), +o1.airVz.toFixed(0), me.state, +me.stateT.toFixed(2), +me.x.toFixed(1)]);
        if (popped && !spiked && n > last) {
          last = n; mark('hit' + n);
          if (n >= GOAL_N) {
            spiked = true; mark('ten');
            o1.airVz = -430; o1.kbx = 40; o1.kby = 0; o1.stateT = 2.6;   // spiked into the floor: out cold
            E.impactFrame(); E.shake(8, 0.45); E.flash(0.45);
            g.sfx('hit', 'hard');
          } else o1.airVz = lift(n);
        }
        // the red 10 stays up (once its pop-in is over: no second pop)
        if (tenC && B.t - B.marks.ten > 0.1 && !tenC.held) { tenC.held = true; tenC.max = 3; tenC.t = 3 * 0.88; }
        if (tenC) tenC.y = ctr().y;
        if (spiked && B.marks.crash == null && o1.airZ <= 0.5) {
          mark('crash');
          E.decal('crater', o1.x, o1.y + 2, 1, 3); E.burst(o1.x, o1.y, 0, '#b8a890', 18, 120, 0.6); E.shake(6, 0.3);
          g.sfx('land');
        }
        // keep him right in front of the puncher while he's up
        if (popped && !spiked && o1.airZ > 0) { o1.x = me.x + 13; o1.y = me.y; o1.kbx = o1.kby = 0; o1.vx = o1.vy = 0; o1.stateT = Math.max(o1.stateT, 0.5); }
        // he lunges into every punch, then settles back to his spot (so the camera, and the counter, stay put)
        if (me.state === 'recover' || me.state === 'normal') { me.x += (300 - me.x) * Math.min(1, dt * 9); me.vx *= 0.5; }
        if (me.state !== 'normal') return;
        me.cd.light = 0; still(me); face(me, o1);
        if (!first) { if (t > 0.3) { me.counterT = g.time + 0.5; if (Act.lightAttack(g, me)) { first = true; mark('punch'); } } return; }   // a sure steal: no 'HOLD' on the opener
        if (popped && !spiked && o1.airZ > 3 && o1.airZ < 36 && (n > 1 || o1.airVz < 40) && Act.lightAttack(g, me)) mark('swing');
      };
      B.focusFn = () => ({ x: me.x + 8, y: me.y - 30 });
    },
  });
})();
