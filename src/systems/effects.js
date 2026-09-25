/* Effects — hazard trên sân (lửa, chém, mìn, phân thân) + particle/hình ảnh */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;

  class Effects {
    constructor(g) {
      this.g = g;
      this.particles = [];
      this.texts = [];
      this.rings = [];
      this.afterimages = [];
      this.clearHazards();
      this.shakeA = 0;
      this.shakeT = 0;
      this.flashA = 0;
    }

    clearHazards() {
      this.fires = [];
      this.slashes = [];
      this.mines = [];
      this.decoys = [];
    }

    /* ---------- spawn ---------- */
    burst(x, y, z, color, n, speed, life = 0.5) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * U.rand(0.3, 1);
        this.particles.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: U.rand(20, 80), t: life * U.rand(0.6, 1), max: life, color, size: Math.random() < 0.3 ? 2 : 1 });
      }
    }
    text(x, y, str, color) { this.texts.push({ x, y, str, color, t: 0.9, max: 0.9 }); }
    ring(x, y, color) { this.rings.push({ x, y, color, t: 0.4, max: 0.4 }); }
    shake(a, t = 0.25) { this.shakeA = Math.max(this.shakeA, a); this.shakeT = Math.max(this.shakeT, t); }
    flash(a = 0.6) { this.flashA = Math.max(this.flashA, a); }
    afterimage(p) {
      this.afterimages.push({ x: p.x, y: p.y, facing: p.facing, team: p.team, role: p.role, look: p.look, anim: p.anim, vx: 0, vy: 0, t: 0.3, max: 0.3 });
    }
    fire(x, y, fx) {
      this.fires.push({ x: x + U.rand(-2, 2), y: y + U.rand(-2, 2), team: fx.team, t: fx.duration, max: fx.duration, r: fx.radius, stun: fx.stun, kb: fx.knockback, seed: Math.random() * 10 });
    }
    slash(p, params) {
      const d = { x: Math.cos(p.facing), y: Math.sin(p.facing) };
      this.slashes.push({ x: p.x + d.x * 8, y: p.y + d.y * 8, dx: d.x, dy: d.y, team: p.team, t: params.life, max: params.life, speed: params.speed, len: params.length, stun: params.stun, hits: new Set() });
    }
    mine(x, y, team, params) {
      const own = this.mines.filter((m) => m.team === team);
      if (own.length >= params.max) this.mines.splice(this.mines.indexOf(own[0]), 1);
      this.mines.push({ x, y, team, t: params.life, arm: params.arm, r: params.radius, stun: params.stun });
    }
    decoy(src, x, y, vx, vy, dur) {
      const d = {
        x, y, vx, vy, t: dur, max: dur,
        srcId: src ? src.id : -1,
        runner: src ? { team: src.team, role: src.role, look: src.look, facing: Math.atan2(vy, vx), anim: src.anim } : null,
        alive: true,
      };
      this.decoys.push(d);
      return d;
    }

    /* ---------- update ---------- */
    update(dt) {
      this.updateCosmetic(dt);
      this.updateHazards(dt);
    }

    // particle, chữ, rung, chớp — chỉ để nhìn (máy khách online chỉ chạy phần này)
    updateCosmetic(dt) {
      for (const p of this.particles) {
        p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.vz -= 300 * dt; p.z += p.vz * dt;
        if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
      }
      this.particles = this.particles.filter((p) => p.t > 0);
      this.texts.forEach((t) => { t.t -= dt; t.y -= 18 * dt; });
      this.texts = this.texts.filter((t) => t.t > 0);
      this.rings.forEach((r) => (r.t -= dt));
      this.rings = this.rings.filter((r) => r.t > 0);
      this.afterimages.forEach((a) => (a.t -= dt));
      this.afterimages = this.afterimages.filter((a) => a.t > 0);
      this.shakeT -= dt;
      if (this.shakeT <= 0) this.shakeA = 0;
      this.flashA = Math.max(0, this.flashA - dt * 2);
    }

    // hazard ảnh hưởng gameplay: lửa, chém, mìn, phân thân
    updateHazards(dt) {
      const g = this.g, f = g.field;

      // lửa
      for (const fi of this.fires) {
        fi.t -= dt;
        for (const pl of g.teams[1 - fi.team].players) {
          if (pl.hitImmune > 0 || pl.state === 'stun') continue;
          if (Math.hypot(pl.x - fi.x, pl.y - fi.y) < fi.r + pl.radius) {
            const d = U.norm(pl.x - fi.x, pl.y - fi.y);
            pl.hit({ stun: fi.stun * 0.7, kbx: d.x * fi.kb * 0.6, kby: d.y * fi.kb * 0.6, type: 'fire' });
            this.burst(pl.x, pl.y, 6, '#ff9a3d', 6, 50);
          }
        }
      }
      this.fires = this.fires.filter((fi) => fi.t > 0);

      // đường chém năng lượng
      for (const s of this.slashes) {
        s.t -= dt;
        s.x += s.dx * s.speed * dt; s.y += s.dy * s.speed * dt;
        if (s.x < f.x || s.x > f.x + f.w || s.y < f.y || s.y > f.y + f.h) s.t = 0;
        for (const pl of g.teams[1 - s.team].players) {
          if (s.hits.has(pl.id)) continue;
          if (U.segDist(pl.x, pl.y - 4, s.x, s.y, s.x - s.dx * s.len, s.y - s.dy * s.len) < pl.radius + 3) {
            s.hits.add(pl.id);
            if (pl.hasBall) g.looseBall(pl, s.dx, s.dy, 120);
            pl.hit({ stun: s.stun, kbx: s.dx * 80, kby: s.dy * 80, type: 'slash' });
            this.burst(pl.x, pl.y, 8, '#7fe7ff', 8, 70);
          }
        }
      }
      this.slashes = this.slashes.filter((s) => s.t > 0);

      // mìn EMP
      for (const m of this.mines) {
        m.t -= dt; m.arm -= dt;
        if (m.arm > 0) continue;
        for (const pl of g.teams[1 - m.team].players) {
          if (Math.hypot(pl.x - m.x, pl.y - m.y) < m.r + pl.radius) {
            if (pl.hasBall) g.looseBall(pl, U.rand(-1, 1), U.rand(-1, 1), 90);
            pl.hitImmune = 0;
            pl.hit({ stun: m.stun, kbx: 0, kby: 0, type: 'emp' });
            this.burst(m.x, m.y, 4, '#c6ff3f', 14, 90);
            this.ring(m.x, m.y, '#c6ff3f');
            g.sfx('zap');
            m.t = 0;
            break;
          }
        }
      }
      this.mines = this.mines.filter((m) => m.t > 0);

      // phân thân / bóng giả
      for (const d of this.decoys) {
        d.t -= dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.vx = U.damp(d.vx, 0.8, dt); d.vy = U.damp(d.vy, 0.8, dt);
        if (d.y < f.y + 4 || d.y > f.y + f.h - 4) d.vy = -d.vy;
        if (d.x < f.x + 4 || d.x > f.x + f.w - 4) d.vx = -d.vx;
        d.x = U.clamp(d.x, f.x + 4, f.x + f.w - 4);
        d.y = U.clamp(d.y, f.y + 4, f.y + f.h - 4);
        if (d.runner) d.runner.anim += dt;
        if (d.t <= 0) { d.alive = false; this.burst(d.x, d.y, 4, '#9d7bff', 6, 40); }
      }
      this.decoys = this.decoys.filter((d) => d.alive);
    }
  }

  SFC.Effects = Effects;
})();
