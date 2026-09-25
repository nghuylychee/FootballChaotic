/* Core Upgrade System
 * - mods thụ động lấy từ config (cores.config.js -> mods)
 * - hành vi đặc biệt: object Behaviors, key = id core, value = các hook:
 *   onShoot(sys, team, params, player, ball, charge)
 *   onPass(sys, team, params, player, target, mode)
 *   onSkillMove / onSprintStart / onSlideStart / onTackle / onTackleWin
 *   onPossessionGained(sys, team, params, player)
 *   onHit(sys, team, params, victim, opts)        -> true = chặn đòn
 *   onGoalLine(sys, team, params, ball)           -> true = chặn bóng vào lưới
 *   onWallHit(sys, team, params, ball, side)      -> true = đã xử lý
 */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const DEF = () => SFC_CONFIG.cores;

  function applyFire(sys, team, ball, p) {
    ball.fx.fire = { team, stun: p.stun, knockback: p.knockback, interval: p.trailInterval, duration: p.trailDuration, radius: p.trailRadius };
  }
  function applyThunder(ball, p) {
    ball.fx.thunder = { stun: p.stun, gkPenalty: p.gkPenalty };
    ball.pierce = p.pierce;
  }
  function spawnDecoy(sys, team, player, params) {
    const g = sys.g, b = g.ball;
    const base = Math.hypot(player.vx, player.vy) > 10 ? Math.atan2(player.vy, player.vx) : player.facing;
    const a = base + U.randSign() * (params.angle || 0.8);
    const spd = Math.max(90, Math.hypot(player.vx, player.vy));
    const decoy = g.effects.decoy(player, b.x, b.y, Math.cos(a) * spd, Math.sin(a) * spd, params.duration || 1.6);
    for (const o of g.teams[1 - team].players) {
      if (o.role !== 'GK' && U.dist(o, player) < (params.confuseRadius || 90) && !o.isControlled) {
        o.confused = { decoy, t: params.confuseTime || 1.2 };
      }
    }
    g.effects.text(player.x, player.y - 26, 'FAKE!', '#3dd6ff');
  }

  const Behaviors = {
    fire_shot: {
      onShoot(sys, team, p, pl, ball, charge) {
        if (charge < p.minCharge) return;
        applyFire(sys, team, ball, p);
        sys.g.sfx('fire');
      },
    },
    sniper_foot: {
      onShoot(sys, team, p, pl, ball) {
        ball.frictionMult = p.frictionMult;
        ball.vx *= p.speedMult; ball.vy *= p.speedMult;
      },
    },
    thunder_kick: {
      onShoot(sys, team, p, pl, ball, charge) {
        if (charge < p.minCharge) return;
        applyThunder(ball, p);
        ball.vx *= p.speedMult; ball.vy *= p.speedMult;
        sys.g.sfx('zap');
      },
    },
    banana_kick: {
      onShoot(sys, team, p, pl, ball) {
        const f = sys.g.field, dir = sys.g.teams[team].dir;
        ball.homing = { x: dir > 0 ? f.x + f.w + 10 : f.x - 10, y: f.cy + (ball.y < f.cy ? 1 : -1) * f.goalWidth * 0.3, strength: p.strength };
      },
    },
    phantom_step: {
      onSkillMove(sys, team, p, pl, d) {
        const f = sys.g.field;
        sys.g.effects.afterimage(pl);
        pl.x = U.clamp(pl.x + d.x * p.distance, f.x + 8, f.x + f.w - 8);
        pl.y = U.clamp(pl.y + d.y * p.distance, f.y + 8, f.y + f.h - 8);
        sys.g.effects.burst(pl.x, pl.y, 8, '#9d7bff', 8, 60);
        if (pl.hasBall) sys.g.ball.follow(0);
      },
    },
    fake_run: {
      onSprintStart(sys, team, p, pl) { this.trigger(sys, team, p, pl); },
      onSkillMove(sys, team, p, pl) { if (pl.hasBall) this.trigger(sys, team, p, pl); },
      trigger(sys, team, p, pl) {
        const st = sys.st(team, 'fake_run');
        if ((st.cd || 0) > 0 || !pl.hasBall) return;
        st.cd = p.cooldown;
        spawnDecoy(sys, team, pl, p);
      },
    },
    street_fighter: {
      onTackleWin(sys, team, p, pl, victim) {
        if (victim.state !== 'stun') return; // đòn gốc đã bị chặn (Iron Body...)
        const d = U.norm(victim.x - pl.x, victim.y - pl.y);
        victim.hitImmune = 0;
        victim.state = 'normal';
        victim.hit({ stun: p.stun, kbx: d.x * p.knockback, kby: d.y * p.knockback, source: pl, type: 'fighter' });
      },
    },
    iron_body: {
      onHit(sys, team, p, victim) {
        if (victim.ironCd > 0) return false;
        victim.ironCd = p.cooldown;
        sys.g.effects.ring(victim.x, victim.y - 8, '#ffd23f');
        sys.g.effects.text(victim.x, victim.y - 26, 'IRON!', '#ffd23f');
        sys.g.sfx('block');
        return true;
      },
    },
    blade_runner: {
      onSlideStart(sys, team, p, pl) {
        sys.g.effects.slash(pl, p);
        sys.g.sfx('zap');
      },
    },
    aegis_wall: {
      onAdd(sys, team) { sys.st(team, 'aegis_wall').ready = true; },
      onGoalLine(sys, team, p, ball) {
        const st = sys.st(team, 'aegis_wall');
        if (!st.ready) return false;
        st.ready = false;
        st.cd = p.cooldown;
        ball.vy += U.rand(-60, 60);
        ball.vz = 60;
        ball.clearFx();
        const f = sys.g.field;
        const x = team === 0 ? f.x : f.x + f.w;
        sys.g.effects.burst(x, ball.y, 10, '#7fe7ff', 16, 120);
        sys.g.effects.text(x + (team === 0 ? 30 : -30), f.cy - 40, 'AEGIS!', '#7fe7ff');
        sys.g.effects.shake(3);
        sys.g.sfx('block');
        return true;
      },
      update(sys, team, p, dt) {
        const st = sys.st(team, 'aegis_wall');
        if (!st.ready) { st.cd -= dt; if (st.cd <= 0) st.ready = true; }
      },
    },
    counter_attack: {
      onPossessionGained(sys, team, p, pl) {
        sys.buffs[team].push({ speed: p.speedMult, shotPower: p.shotMult, t: p.duration });
        sys.g.effects.text(pl.x, pl.y - 26, 'COUNTER!', '#9dff3d');
      },
    },
    emp_trap: {
      onTackle(sys, team, p, pl) {
        const st = sys.st(team, 'emp_trap');
        if ((st.cd || 0) > 0) return;
        st.cd = p.cooldown;
        sys.g.effects.mine(pl.x, pl.y, team, p);
      },
    },
    maestro: {
      onPass(sys, team, p, pl, target) {
        if (target) target.buffs.push({ speed: p.speedMult, t: p.duration + 0.8 });
      },
    },
    chaos_ball: {
      roll(sys, team, p, pl, ball, isShot) {
        const opts = isShot ? ['curve', 'rocket', 'fire', 'thunder', 'split'] : ['curve', 'rocket', 'split'];
        const pick = U.pick(opts);
        const lib = DEF().list;
        if (pick === 'curve') ball.curve = U.randSign() * p.curve;
        if (pick === 'rocket') { ball.vx *= p.rocketMult; ball.vy *= p.rocketMult; }
        if (pick === 'fire') applyFire(sys, team, ball, lib.fire_shot.params);
        if (pick === 'thunder') applyThunder(ball, lib.thunder_kick.params);
        if (pick === 'split') {
          const a = Math.atan2(ball.vy, ball.vx) + U.randSign() * 0.5;
          sys.g.effects.decoy(null, ball.x, ball.y, Math.cos(a) * ball.speed, Math.sin(a) * ball.speed, 1.2);
        }
        sys.g.effects.text(pl.x, pl.y - 26, pick.toUpperCase() + '!', '#c63dff');
      },
      onShoot(sys, team, p, pl, ball) { this.roll(sys, team, p, pl, ball, true); },
      onPass(sys, team, p, pl) { if (Math.random() < 0.5) this.roll(sys, team, p, pl, sys.g.ball, false); },
    },
    warp_walls: {
      onWallHit(sys, team, p, ball, side) {
        const f = sys.g.field, g = sys.g;
        g.effects.burst(ball.x, ball.y, ball.z, '#c63dff', 8, 60);
        ball.y = side === 'top' ? f.y + f.h - ball.r - 1 : f.y + ball.r + 1;
        g.effects.burst(ball.x, ball.y, ball.z, '#c63dff', 8, 60);
        g.sfx('zap');
        return true;
      },
    },
  };

  class CoreSystem {
    constructor(g) {
      this.g = g;
      this.owned = [[], []];
      this.state = [{}, {}];
      this.buffs = [[], []];
    }
    def(id) { return DEF().list[id]; }
    has(team, id) { return this.owned[team].includes(id); }
    params(id) { return (this.def(id) && this.def(id).params) || {}; }
    st(team, id) { return this.state[team][id] || (this.state[team][id] = {}); }

    add(team, id) {
      if (!this.def(id) || this.has(team, id)) return;
      this.owned[team].push(id);
      const b = Behaviors[id];
      if (b && b.onAdd) b.onAdd(this, team, this.params(id));
    }

    mod(team, key) {
      if (team < 0) return 1;
      let m = 1;
      for (const id of this.owned[team]) {
        const mods = this.def(id).mods;
        if (mods && mods[key] != null) m *= mods[key];
      }
      for (const b of this.buffs[team]) if (b[key]) m *= b[key];
      return m;
    }

    dispatch(team, hook, ...args) {
      if (team < 0) return false;
      let res = false;
      for (const id of this.owned[team]) {
        const b = Behaviors[id];
        if (b && b[hook] && b[hook].call(b, this, team, this.params(id), ...args)) res = true;
      }
      return res;
    }

    blockHit(victim, opts) { return this.dispatch(victim.team, 'onHit', victim, opts); }
    goalLine(ball, defTeam) { return this.dispatch(defTeam, 'onGoalLine', ball); }
    wallHit(ball, side) { return ball.lastKickTeam >= 0 && this.dispatch(ball.lastKickTeam, 'onWallHit', ball, side); }
    shieldReady(team) { return this.has(team, 'aegis_wall') && !!this.st(team, 'aegis_wall').ready; }

    update(dt) {
      for (let t = 0; t < 2; t++) {
        for (const id in this.state[t]) {
          const s = this.state[t][id];
          if (s.cd > 0 && id !== 'aegis_wall') s.cd -= dt;
        }
        for (const id of this.owned[t]) {
          const b = Behaviors[id];
          if (b && b.update) b.update(this, t, this.params(id), dt);
        }
        if (this.buffs[t].length) {
          this.buffs[t].forEach((b) => (b.t -= dt));
          this.buffs[t] = this.buffs[t].filter((b) => b.t > 0);
        }
      }
    }

    // Random N core chưa sở hữu, trọng số theo tier * bản sắc đội
    rollOptions(team, n) {
      const cfg = DEF();
      const weights = this.g.teams[team].cfg.coreWeights || {};
      let pool = Object.keys(cfg.list).filter((id) => !this.has(team, id));
      const out = [];
      while (out.length < n && pool.length) {
        const id = U.weightedPick(pool, (id) => {
          const c = cfg.list[id];
          return (cfg.tiers[c.tier] ? cfg.tiers[c.tier].weight : 1) * (weights[c.category] || 1);
        });
        out.push(id);
        pool = pool.filter((x) => x !== id);
      }
      return out;
    }

    aiPick(team) {
      const opts = this.rollOptions(team, SFC_CONFIG.game.match.upgradeChoices);
      if (!opts.length) return null;
      const weights = this.g.teams[team].cfg.coreWeights || {};
      const id = U.weightedPick(opts, (id) => (weights[this.def(id).category] || 1) + 0.5);
      this.add(team, id);
      return id;
    }
  }

  SFC.CoreSystem = CoreSystem;
})();
