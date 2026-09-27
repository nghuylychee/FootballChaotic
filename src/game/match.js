/* Game — một trận đấu: đội hình, luồng trận (kickoff → play → upgrade → final push → end) */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;

  class Game {
    /**
     * opts: { home, away, difficulty, silent,
     *         humanTeam: đội của người chơi tại máy này (góc nhìn UI; -1 = demo),
     *         humans: các đội do người điều khiển (mặc định [humanTeam]; PvP = [0, 1]),
     *         draftTimeLimit: giây tối đa để chọn Core (0 = không giới hạn),
     *         solo: [idx đội 0, idx đội 1] — khóa người chơi vào 1 cầu thủ (chỉ số trong đội; null = điều khiển cả đội),
     *         avatars: [{name, look, role?} | null, ...] — character của người chơi, thay cầu thủ ở vị trí role
     *                  (DEF / FWD, mặc định FWD) của đội đó,
     *         coreUnlocks: [[id...] | null, ...] — Core đội đó được bốc khi chọn Core (null = tất cả),
     *         training: true = luyện tập (không giờ trận, không chọn Core, không kết thúc / không thưởng),
     *         teamSize: [n đội 0, n đội 1] — số cầu thủ mỗi đội (mặc định đủ đội hình; 0 = đội trống) }
     */
    constructor(opts) {
      const C = SFC_CONFIG.game;
      this.opts = opts;
      this.cfg = C;
      this.silent = !!opts.silent;
      const f = C.field;
      this.field = Object.assign({}, f, {
        cx: f.x + f.w / 2, cy: f.y + f.h / 2,
        gTop: f.y + f.h / 2 - f.goalWidth / 2,
        gBot: f.y + f.h / 2 + f.goalWidth / 2,
      });
      this.humanTeam = opts.humanTeam != null ? opts.humanTeam : 0;
      this.humans = opts.humans || (this.humanTeam >= 0 ? [this.humanTeam] : []);
      const diffKey = C.ai.difficulty[opts.difficulty] ? opts.difficulty : 'normal';
      this.difficulty = C.ai.difficulty[diffKey];
      // đồng đội AI của người chơi: theo ai.teammate nhưng không bao giờ giỏi hơn độ khó đã chọn
      const order = C.ai.difficultyOrder, mi = order.indexOf(C.ai.teammate);
      this.teammateProfile = C.ai.difficulty[mi >= 0 && mi < order.indexOf(diffKey) ? C.ai.teammate : diffKey];

      this.teams = [opts.home, opts.away].map((id, i) => ({
        index: i, id, cfg: SFC_CONFIG.teams.list[id], score: 0, dir: i === 0 ? 1 : -1, players: [],
      }));
      this.ball = new SFC.Ball(this);
      this.effects = new SFC.Effects(this);
      this.cores = new SFC.CoreSystem(this);
      this.players = [];
      // teamSize (luyện tập): số cầu thủ mỗi đội; bớt người thì bỏ từ vị trí đầu (1 người = ĐÁ CAO, 0 = đội trống)
      for (const t of this.teams) {
        const n = opts.teamSize ? opts.teamSize[t.index] : C.roles.length;
        C.roles.slice(C.roles.length - n).forEach((role) => {
          const p = new SFC.Player(this, t, role, C.roles.indexOf(role));
          t.players.push(p);
          this.players.push(p);
        });
      }
      // character đại diện của người chơi (Profile): thay cầu thủ ở vị trí đã chọn (mặc định ĐÁ CAO), vẫn mặc áo đội
      (opts.avatars || []).forEach((av, t) => {
        if (!av || !this.teams[t]) return;
        const role = av.role || 'FWD';
        const p = this.teams[t].players.find((q) => q.role === role) || this.teams[t].players[0];
        p.name = av.name;
        p.look = Object.assign({}, av.look);
        p.avatar = true;
      });
      // trạng thái điều khiển theo từng đội người chơi
      this.ctrl = [null, null];
      this.solo = (opts.solo || [null, null]).map((idx, t) => (idx == null ? null : this.teams[t].players[idx] || null));
      this.receiveLock = [false, false];
      this.passPreview = null;
      this.lastPossessionTeam = -1;
      this.time = 0;
      this.elapsed = 0;
      this.upgradeIdx = 0;
      this.finalPush = false;
      this.golden = false;
      this.draft = null;
      this.events = [];
      this.lastScorer = null;
      this.kickoff(0);
    }

    /* ---------- helpers ---------- */
    sfx(name, arg) { if (!this.silent && SFC.Audio[name]) SFC.Audio[name](arg); }
    emit(type, data) { this.events.push(Object.assign({ type }, data)); }
    aiProfile(team) { return this.isHuman(team) ? this.teammateProfile : this.difficulty; }
    isHuman(team) { return this.humans.includes(team); }
    // cầu thủ người chơi tại máy này đang điều khiển
    get controlled() { return this.humanTeam >= 0 ? this.ctrl[this.humanTeam] : null; }
    inputFor(team, input) { return Array.isArray(input) ? input[team] : input; }
    chargeTime(p) { return this.cfg.kick.chargeTime * this.cores.mod(p.team, 'chargeTime'); }
    attackGoal(team) {
      const f = this.field;
      return { x: this.teams[team].dir > 0 ? f.x + f.w : f.x, y: f.cy };
    }
    ownGoal(team) { return this.attackGoal(1 - team); }
    inOwnHalf(p) { return (p.x - this.field.cx) * this.teams[p.team].dir < 0; }
    // "vai thủ môn": cầu thủ đứng trong vòng cấm nhà -> được bắt bóng / cứu thua / đổ người
    inKeeperZone(p) {
      const f = this.field;
      return Math.abs(p.x - this.ownGoal(p.team).x) < f.boxDepth && Math.abs(p.y - f.cy) < f.boxWidth / 2;
    }
    // D ở phần sân nhà = phá bóng, trừ khi phía trước (theo trục x) không còn cầu thủ đối phương nào
    // (bỏ qua người đang trông khung thành của họ) -> được sút
    shouldClear(p) {
      if (!this.inOwnHalf(p)) return false;
      const dir = this.teams[p.team].dir;
      return this.teams[1 - p.team].players.some((o) => !this.inKeeperZone(o) && (o.x - p.x) * dir > 0);
    }
    get remaining() { return Math.max(0, this.cfg.match.duration - this.elapsed); }

    formationPos(p) {
      const f = this.field, fm = this.cfg.formation[p.role];
      const dir = this.teams[p.team].dir;
      const fx = dir > 0 ? fm.x : 1 - fm.x;
      const fy = dir > 0 ? fm.y : 1 - fm.y;
      return { x: f.x + fx * f.w, y: f.y + fy * f.h };
    }

    // Vị trí xếp hàng lúc giao bóng. vary = true: lệch ngẫu nhiên quanh đội hình gốc (mirror = lật trên <-> dưới),
    // vẫn ở phần sân nhà và ngoài vòng tròn giữa sân
    kickoffPos(p, vary, mirror) {
      if (!vary) return this.formationPos(p);
      const f = this.field, V = this.cfg.match.kickoffVary, fm = this.cfg.formation[p.role];
      const dir = this.teams[p.team].dir;
      // tính trong khung "tấn công sang phải" như formationPos
      const nx = U.clamp(fm.x + U.rand(-1, 1) * V.x, 0.08, 0.5 - 12 / f.w);
      const ny = U.clamp((mirror ? 1 - fm.y : fm.y) + U.rand(-1, 1) * V.y, 0.12, 0.88);
      let x = f.x + (dir > 0 ? nx : 1 - nx) * f.w;
      let y = f.y + (dir > 0 ? ny : 1 - ny) * f.h;
      // vòng tròn giữa sân chỉ dành cho người giao bóng -> đẩy ra mép vòng (vẫn cùng phía sân)
      const min = f.centerCircle + p.radius + 4;
      const d = Math.hypot(x - f.cx, y - f.cy);
      if (d < min) {
        const n = d > 0.01 ? U.norm(x - f.cx, y - f.cy) : { x: -dir, y: 0 };
        x = f.cx + n.x * min; y = f.cy + n.y * min;
      }
      return { x, y };
    }

    // chế độ 1 cầu thủ: đội này chỉ điều khiển đúng 1 người (không đổi người, không tự chuyển)
    lockedPlayer(team) { return this.solo[team]; }

    setControlled(p) {
      const lock = this.solo[p.team];
      if (lock) p = lock;
      const prev = this.ctrl[p.team];
      if (prev && prev !== p) {
        prev.charging = false;
        prev.intent.mx = prev.intent.my = 0;
      }
      this.ctrl[p.team] = p;
    }

    switchPlayer(team = this.humanTeam) {
      if (!this.isHuman(team) || this.solo[team]) return;
      const b = this.ball, cur = this.ctrl[team];
      let best = null, bd = Infinity;
      for (const p of this.teams[team].players) {
        if (p === cur) continue;
        const d = U.dist(p, b);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) { this.setControlled(best); this.effects.ring(best.x, best.y, '#ffe14f'); }
    }

    // bắt được bóng trong vòng cấm nhà -> không thể bị tắc/xoạc/va vai (trong gkHoldProtect giây, khi còn ở trong vòng cấm)
    isProtected(p) {
      return p.hasBall && p.keeperHold > 0 && this.inKeeperZone(p);
    }

    looseBall(p, dx, dy, speed = 110) {
      const b = this.ball;
      if (b.owner !== p) return;
      const d = U.norm(dx, dy);
      b.owner = null;
      b.vx = d.x * speed + U.rand(-20, 20);
      b.vy = d.y * speed + U.rand(-20, 20);
      b.vz = 50;
      b.lastTouch = p;
      b.lastKickTeam = -1;
      b.clearFx();
      b.noPickup.set(p.id, this.cfg.ball.looseNoPickup);
      p.charging = false; p.charge = 0;
      p.cancelPass();
    }

    gainPossession(p) {
      const b = this.ball;
      b.setOwner(p);
      p.keeperHold = 0;
      p.cancelPass();
      p.ai.holdT = 0;
      p.ai.t = 0;
      p.ai.runT = 0;
      p.ai.openSeen = false;
      if (this.lastPossessionTeam !== -1 && this.lastPossessionTeam !== p.team) {
        this.cores.dispatch(p.team, 'onPossessionGained', p);
      }
      this.lastPossessionTeam = p.team;
      for (const t of this.humans) {
        const cur = this.ctrl[t];
        if (p.team === t) this.setControlled(p);
        else if (this.cfg.match.autoSwitchOnDefense && cur &&
                 U.dist(cur, p) > this.cfg.match.autoSwitchDistance) this.switchPlayer(t);
      }
      this.sfx('touch');
    }

    /* ---------- luồng trận ---------- */
    // mỗi lần giao bóng (đầu trận + sau bàn thắng) đội hình lệch ngẫu nhiên (match.kickoffVary)
    kickoff(teamIdx) {
      const f = this.field, V = this.cfg.match.kickoffVary;
      if (!this.teams[teamIdx].players.length) teamIdx = 1 - teamIdx; // luyện tập không đối thủ: luôn giao bóng cho đội còn người
      this.state = 'kickoff';
      this.stateT = this.cfg.match.kickoffDelay;
      this.effects.clearHazards();
      this.passPreview = null;
      this.ball.reset(f.cx, f.cy);
      const vary = !!V;
      const mirror = [0, 1].map(() => vary && Math.random() < (V.mirrorY || 0));
      for (const p of this.players) {
        const pos = this.kickoffPos(p, vary, mirror[p.team]);
        Object.assign(p, { x: pos.x, y: pos.y, vx: 0, vy: 0, kbx: 0, kby: 0, state: 'normal', charging: false, charge: 0, confused: null, keeperHold: 0, airZ: 0, airVz: 0, atkType: null });
        p.facing = this.teams[p.team].dir > 0 ? 0 : Math.PI;
        p.intent.mx = p.intent.my = 0;
        p.ai.runT = 0; p.ai.requestedPass = null;
        p.stamina = this.cfg.player.staminaMax;
      }
      // tiền đạo đội giao bóng đứng giữa sân
      const fwd = this.teams[teamIdx].players.find((p) => p.role === 'FWD') || this.teams[teamIdx].players[0];
      fwd.x = f.cx - this.teams[teamIdx].dir * 8;
      fwd.y = f.cy;
      this.lastPossessionTeam = -1;
      this.gainPossession(fwd);
      this.lastPossessionTeam = teamIdx;
      for (const t of this.humans) {
        const tp = this.teams[t].players;
        if (tp.length) this.setControlled(teamIdx === t ? fwd : tp.find((p) => p.role === 'FWD') || tp[0]);
      }
    }

    update(dt, input) {
      this.time += dt;
      switch (this.state) {
        case 'kickoff':
          this.stateT -= dt;
          this.effects.update(dt);
          this.ball.update(dt);
          if (this.stateT <= 0) { this.state = 'play'; this.sfx('whistle'); }
          break;
        case 'play':
          this.simulate(dt, input);
          this.tickClock(dt);
          break;
        case 'goal':
          this.stateT -= dt;
          for (const p of this.players) { p.intent.mx = p.intent.my = 0; p.update(dt); }
          this.ball.update(dt);
          this.effects.update(dt);
          if (this.stateT <= 0) this.afterGoal();
          break;
        case 'draft':
          // PvP: hết giờ chọn -> tự chọn thẻ đầu cho ai chưa chọn
          if (this.draft && this.draft.limit > 0) {
            this.draft.t -= dt;
            if (this.draft.t <= 0) for (const t of this.humans) this.pickCore(0, t);
          }
          break;
        default: // ended: đứng hình
          break;
      }
    }

    simulate(dt, input) {
      this.passPreview = null;
      for (const t of this.humans) {
        const inp = input && this.inputFor(t, input);
        if (inp) SFC.Human.update(dt, this, inp, t);
      }
      SFC.AI.update(dt, this);
      for (const p of this.players) p.update(dt);
      this.separate();
      this.ball.update(dt);
      if (this.checkGoal()) return;
      this.updatePossession();
      this.effects.update(dt);
      this.cores.update(dt);
    }

    tickClock(dt) {
      const M = this.cfg.match;
      if (this.opts.training) return; // luyện tập: không giờ trận, không Final Push / Golden Goal, không kết thúc
      if (this.golden) {
        this.goldenT = (this.goldenT || 0) + dt;
        if (this.goldenT >= M.goldenGoalMaxTime) this.end();
        return;
      }
      this.elapsed += dt;
      if (!this.finalPush && this.remaining <= M.finalPushTime) {
        this.finalPush = true;
        this.emit('banner', { text: 'FINAL PUSH', sub: 'Bàn thắng x' + M.finalPushGoalValue, color: '#ff3d5a' });
        this.sfx('whistle');
      }
      if (this.elapsed >= M.duration) {
        if (this.teams[0].score === this.teams[1].score && M.goldenGoal) {
          this.golden = true;
          this.emit('banner', { text: 'GOLDEN GOAL', sub: 'Bàn thắng tiếp theo quyết định', color: '#ffd23f' });
          this.sfx('whistle');
        } else this.end();
      }
    }

    // Mở Core Upgrade lúc bóng chết (gọi khi chuẩn bị giao bóng lại sau bàn thắng)
    startDraft() {
      const n = this.cfg.match.upgradeChoices;
      this.upgradeIdx++;
      const aiTeams = [0, 1].filter((t) => !this.isHuman(t));
      const aiPicks = aiTeams.map((t) => ({ team: t, id: this.cores.aiPick(t) })).filter((x) => x.id);
      // mỗi đội người chơi có bộ thẻ riêng
      const options = {};
      for (const t of this.humans) options[t] = this.cores.rollOptions(t, n);
      if (!this.humans.some((t) => options[t].length)) {
        if (aiPicks.length) this.emit('corePicked', { picks: aiPicks });
        return;
      }
      const limit = this.opts.draftTimeLimit || 0;
      this.state = 'draft';
      this.draft = { options, picked: {}, aiPicks, round: this.upgradeIdx, limit, t: limit };
      this.releaseInputs();
      this.emit('draft', { round: this.upgradeIdx });
      this.sfx('upgrade');
    }

    // team chọn thẻ thứ i; Core chỉ được thêm khi mọi người chơi đã chọn xong
    pickCore(i, team = this.humanTeam) {
      const d = this.draft;
      if (this.state !== 'draft' || !d || !d.options[team] || d.picked[team]) return;
      const id = d.options[team][i];
      if (!id) return;
      d.picked[team] = id;
      if (this.humans.some((t) => d.options[t].length && !d.picked[t])) {
        this.emit('draftWait', { team });
        return;
      }
      const picks = this.humans.filter((t) => d.picked[t]).map((t) => ({ team: t, id: d.picked[t] }));
      for (const pk of picks) this.cores.add(pk.team, pk.id);
      this.emit('corePicked', { picks: picks.concat(d.aiPicks) });
      this.draft = null;
      // chọn xong -> đếm ngược giao bóng lại từ đầu
      this.state = 'kickoff';
      this.stateT = this.cfg.match.kickoffDelay;
      this.sfx('pick');
    }

    releaseInputs() {
      for (const p of this.players) { p.charging = false; p.charge = 0; }
    }

    checkGoal() {
      const b = this.ball, f = this.field;
      if (b.owner) return false;
      let scorer = -1;
      if (b.x < f.x - b.r && b.netSide === -1) scorer = 1;
      else if (b.x > f.x + f.w + b.r && b.netSide === 1) scorer = 0;
      if (scorer < 0) return false;

      const value = this.finalPush && !this.golden ? this.cfg.match.finalPushGoalValue : 1;
      if (!this.opts.training) this.teams[scorer].score += value; // luyện tập: không tính tỉ số
      const by = b.lastTouch;
      const own = by && by.team !== scorer;
      this.lastScorer = by;
      this.state = 'goal';
      this.stateT = this.cfg.match.goalCelebration;
      this.scoredBy = scorer;
      this.effects.shake(this.cfg.fx.shakeGoal, 0.5);
      this.effects.flash(0.7);
      const gx = scorer === 0 ? f.x + f.w : f.x;
      const col = this.teams[scorer].cfg.kit.shirt;
      this.effects.burst(gx, f.cy, 10, col, 40, 160, 1.2);
      this.effects.burst(gx, f.cy, 10, '#ffffff', 20, 120, 1.0);
      this.emit('goal', { team: scorer, value, scorer: by ? by.name : '', own });
      this.sfx('goal');
      return true;
    }

    afterGoal() {
      if (this.golden || this.elapsed >= this.cfg.match.duration) return this.end();
      this.kickoff(1 - this.scoredBy);
      // bóng chết: xếp đội hình giao bóng xong thì mở Core Upgrade (nếu còn lượt)
      if (!this.opts.training && this.upgradeIdx < this.cfg.match.maxUpgrades) this.startDraft();
    }

    end() {
      this.state = 'ended';
      this.sfx('whistle', true);
      this.emit('end', {});
    }

    /* ---------- vật lý tương tác ---------- */
    separate() {
      const ps = this.players;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i], b = ps[j];
          if (a.airZ > 4 || b.airZ > 4) continue; // người đang bay qua đầu
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy), min = a.radius + b.radius;
          if (d > 0.01 && d < min) {
            const push = (min - d) / 2, nx = dx / d, ny = dy / d;
            a.x -= nx * push; a.y -= ny * push;
            b.x += nx * push; b.y += ny * push;
          }
        }
      }
    }

    updatePossession() {
      const b = this.ball, C = this.cfg, f = this.field;
      if (b.owner) {
        if (b.owner.state === 'stun') this.looseBall(b.owner, U.rand(-1, 1), U.rand(-1, 1));
        return;
      }
      let best = null, bd = Infinity;
      // đường chuyền còn sống -> đồng đội khác của người nhận không chặn bóng
      const pt = b.passTarget;
      const passAlive = pt && pt.state !== 'stun' && b.speed > 40;
      for (const p of this.players) {
        if (p.state === 'stun' || p.state === 'kick' || b.noPickup.has(p.id)) continue;
        if (passAlive && p !== pt && p.team === pt.team) continue;
        const gk = this.inKeeperZone(p);
        const reach = p.radius + b.r + (gk ? C.player.gkReach + (p.state === 'dash' ? 5 : 0) : C.ball.pickupRange)
          + (b.passTarget === p ? C.pass.receiveRangeBonus : 0);
        const maxZ = gk ? C.player.gkCatchHeight : C.ball.pickupHeight;
        const d = U.dist(p, b);
        if (d < reach && b.z < maxZ && d < bd) { bd = d; best = p; }
      }
      if (best) this.tryControl(best);
    }

    tryControl(p) {
      const b = this.ball, C = this.cfg, spd = b.speed;
      const opp = b.lastKickTeam >= 0 && b.lastKickTeam !== p.team;
      const isGK = this.inKeeperZone(p);
      const dir = U.norm(b.vx, b.vy);

      if (opp && !isGK && b.fx.thunder && b.pierce > 0 && spd > 150) {
        b.pierce--;
        b.noPickup.set(p.id, 0.5);
        p.hit({ stun: b.fx.thunder.stun, kbx: dir.x * 70, kby: dir.y * 70, type: 'thunder' });
        this.effects.burst(p.x, p.y, 8, '#7fe7ff', 10, 90);
        this.sfx('zap');
        return;
      }
      if (opp && !isGK && b.fx.fire && spd > 150) {
        const fi = b.fx.fire;
        p.hit({ stun: fi.stun, kbx: dir.x * fi.knockback, kby: dir.y * fi.knockback, type: 'fire' });
        this.deflect(p, 0.6);
        return;
      }
      if (isGK && opp && b.kind === 'shot') {
        // càng phải vươn xa (bóng góc) và bóng càng mạnh -> càng khó bắt
        const reach = p.radius + b.r + C.player.gkReach + (p.state === 'dash' ? 5 : 0);
        // khoảng cách vuông góc từ thủ môn tới đường bay của bóng
        const perp = Math.abs((p.x - b.x) * dir.y - (p.y - b.y) * dir.x);
        const stretch = U.clamp(perp / reach, 0, 1);
        let chance = C.player.gkSaveBase - Math.max(0, spd - C.player.gkSpeedFree) / C.player.gkSpeedPenalty - stretch * C.player.gkStretchPenalty;
        if (b.fx.thunder) chance -= b.fx.thunder.gkPenalty;
        if (b.fx.fire) chance -= 0.1;
        chance = U.clamp(chance * (0.7 + this.aiProfile(p.team).shotAccuracy * 0.35), 0.15, 0.95);
        const r = Math.random();
        if (r > chance) {
          if (r < chance + (1 - chance) * C.player.gkParryShare) {
            this.deflect(p, 0.45);
            this.effects.text(p.x, p.y - 26, 'PARRY', '#ffffff');
            this.sfx('save');
          } else {
            // bóng quá mạnh, lọt tay thủ môn
            b.noPickup.set(p.id, 0.5);
            this.effects.text(p.x, p.y - 26, 'SLIP!', '#ff6a3d');
          }
          return;
        }
        this.effects.text(p.x, p.y - 26, 'SAVE!', '#9dff3d');
        this.sfx('save');
      } else if (opp && b.kind === 'pass' && spd > C.pass.intercept.minSpeed) {
        if (!this.intercepts(p)) return;
      } else if (opp && spd > C.ball.controlSpeed) {
        if (Math.random() > 0.35 * p.stats.dribble) { this.deflect(p, 0.4); return; }
      }
      this.gainPossession(p);
      // bắt bóng trong vòng cấm nhà (không phải đường chuyền của đồng đội) -> ôm bóng như thủ môn
      if (isGK && b.lastKickTeam !== p.team) p.keeperHold = C.player.gkHoldProtect;
    }

    // Cắt đường chuyền (pass.intercept): 1 lần thử, tỉ lệ theo tốc độ bóng + độ lệch khỏi người.
    // Trượt -> bóng chạm người, chậm lại, lệch nhẹ rồi đi tiếp tới người nhận
    intercepts(p) {
      const b = this.ball, C = this.cfg, I = C.pass.intercept;
      const dir = U.norm(b.vx, b.vy);
      const reach = p.radius + b.r + (this.inKeeperZone(p) ? C.player.gkReach : C.ball.pickupRange);
      // khoảng cách vuông góc từ người tới đường bóng: 0 = đi thẳng vào người, 1 = sượt mép tầm với
      const edge = U.clamp(Math.abs((p.x - b.x) * dir.y - (p.y - b.y) * dir.x) / reach, 0, 1);
      const fast = U.clamp((b.speed - I.slowSpeed) / (I.fastSpeed - I.slowSpeed), 0, 1);
      let chance = I.base * U.lerp(1, I.speedMin, fast) * U.lerp(1, I.edgeMin, edge) * p.stats.tackle;
      if (!this.isHuman(p.team) || !p.isControlled) chance *= this.aiProfile(p.team).tackleMult;
      if (Math.random() < U.clamp(chance, 0.05, 0.95)) return true;
      b.noPickup.set(p.id, I.retry);
      b.vx *= I.failSlow; b.vy *= I.failSlow;
      b.rotate(U.rand(-I.failDeflect, I.failDeflect));
      b.lastTouch = p;
      this.effects.burst(b.x, b.y, b.z, '#ffffff', 4, 50);
      this.sfx('touch');
      return false;
    }

    deflect(p, keep) {
      const b = this.ball;
      // người trông khung (trong vòng cấm nhà) luôn đẩy bóng ra xa khung thành; ngoài vòng cấm thì bật theo hướng va chạm
      const n = this.inKeeperZone(p)
        ? { x: this.teams[p.team].dir, y: U.randSign() * U.rand(0.5, 1.2) }
        : U.norm(b.x - p.x, b.y - p.y);
      const spd = Math.max(80, b.speed * keep);
      const out = U.norm(n.x * 1.2 - U.norm(b.vx, b.vy).x * 0.2, n.y * 1.2 + U.rand(-0.6, 0.6));
      b.vx = out.x * spd; b.vy = out.y * spd; b.vz = Math.max(b.vz, 50);
      b.noPickup.set(p.id, 0.35);
      b.lastTouch = p;
      b.lastKickTeam = -1;
      b.kind = null;
      b.passTarget = null;
      b.passPoint = null;
      b.sloppy = false;
      b.clearFx();
      this.effects.burst(b.x, b.y, b.z, '#ffffff', 5, 60);
    }
  }

  SFC.Game = Game;
})();
