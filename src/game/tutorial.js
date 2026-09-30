/* Tutorial — PROLOGUE cho người chơi mới (config/ftue.config.js).
 * begin(): cut scene "intro" -> DREAM MATCH -> cut scene "outro" + thẻ MAIN PATH -> trang Main Path.
 * DREAM MATCH là trận thường (opts.tutorial) có kịch bản, chạy qua các bài theo thứ tự:
 *   move -> pass -> shoot -> (bàn thắng) chọn Core -> defend (đấm cướp bóng) -> attack (QTE: đối thủ lao vào đá, bấm Z né)
 *   -> (bàn thắng) mở ULTIMATE -> charge (tích năng lượng: show, don't tell) -> ult (dùng Ultimate) -> final (đá tự do tới hết giờ)
 * Không dừng trận để dạy: chỉ 1 hộp gợi ý nhỏ (#coach) + ô kỹ năng cần dùng nhấp nháy. Làm trước bài sau (vd. sút vào
 * luôn khi đang học di chuyển) thì nhảy cóc luôn. Đối thủ / đồng đội bị điều khiển qua g.aiHook tuỳ bài.
 * update(dt, input, g) gọi từ vòng lặp chính, trước UI.consume (đọc g.events trước khi UI lấy đi).
 */
window.SFC = window.SFC || {};

(function () {
  const CFG = () => SFC_CONFIG.ftue;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // các bài trước lượt chọn Core đầu: đối thủ đứng xem (bóng xuyên qua họ như trong mơ)
  const EARLY = ['move', 'pass', 'shoot', 'draft1', 'core'];
  const HOLD = ['draft2', 'ultpick'];

  function steer(p, x, y, pace = 1, arrive = 5) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d < arrive) { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; return true; }
    const s = Math.min(1, d / 18) * pace;
    p.intent.mx = (dx / d) * s; p.intent.my = (dy / d) * s; p.intent.sprint = false;
    return false;
  }

  const Tutorial = {
    active: false,
    get done() { return !!(SFC.Profile.data && SFC.Profile.data.tut && SFC.Profile.data.tut.done); },
    wanted() { return CFG() && CFG().enabled && !this.done; },

    markDone() {
      const d = SFC.Profile.data;
      if (!d) return;
      d.tut = { done: true };
      SFC.Profile.save();
    },

    /* ---------------- luồng chính ---------------- */
    begin(app) {
      this.app = app;
      this.cleanup();
      SFC.Input.textHandler = null;
      app.game = null;
      app.mode = 'single';
      app.screen = 'story';
      SFC.UI.show(null);
      SFC.UI.el.hud.classList.add('hidden');
      SFC.Story.play('intro', () => this.startMatch());
    },

    startMatch() {
      const app = this.app, F = CFG().match, MP = SFC_CONFIG.mainPath, roles = SFC_CONFIG.game.roles;
      const soloIdx = roles.indexOf(F.role);
      const avatar = Object.assign(SFC.Profile.avatar(), { role: F.role, stats: Object.assign({}, F.stats), ovr: F.ovr });
      SFC_CONFIG.teams.list[MP.playerTeam.id].name = MP.playerTeam.nameFormat.replace('{name}', avatar.name);
      app.startMatch({
        home: MP.playerTeam.id, away: CFG().team.id, difficulty: 'normal', aiProfile: F.ai, mateDifficulty: MP.teammate,
        humanTeam: 0, solo: [soloIdx, null], avatars: [avatar, null], arena: F.arena,
        tutorial: true, noDraft: true, noAiCores: true, noScale: true,
      });
      const g = this.g = app.game;
      this.me = g.controlled;
      this.mate = g.teams[0].players.find((p) => p !== this.me);
      if (this.mate) {
        this.mate.name = F.mate.name;
        F.mate.cores.forEach((id) => g.cores.add(this.mate, id));
      }
      F.presetCores.forEach((id) => g.cores.add(this.me, id));
      g.aiHook = (p, dt) => this.aiHook(g, p, dt);
      this.active = true;
      this.arch = null;
      this.ultId = null;
      this.dist = 0;
      this.last = { x: this.me.x, y: this.me.y };
      this.passed = false;
      this.mateT = 0;
      this.qte = null;
      this.ultLast = 0;
      this.coachEl = document.getElementById('coach');
      this.qteEl = document.getElementById('qte');
      this.promptEl = document.getElementById('prompt');
      document.getElementById('dreamfx').classList.remove('hidden');
      this.set('move');
    },

    // chuyển bài; gap > 0: hộp gợi ý hiện "NICE!" trước rồi mới sang
    set(step, gap = 0) {
      if (gap > 0) {
        this.pending = step; this.gapT = gap;
        if (this.coachEl) this.coachEl.classList.add('ok');
        SFC.Audio.pick();
        return;
      }
      this.pending = null;
      this.step = step;
      this.stepT = 0;
      if (step === 'attack') this.qte = { phase: 'rush', o: null, t: 0, hit: false };
      if (step === 'charge') { this.me.res.ult = 0; this.ultLast = 0; }
      if (step === 'final') { this.g.clockOn = true; this.g.elapsed = Math.max(0, SFC_CONFIG.game.match.duration - CFG().match.finalSeconds); }
      this.renderCoach();
    },
    complete(next) { if (!this.pending) this.set(next, CFG().match.stepGap); },

    update(dt, input, g) {
      if (!this.active || g !== this.g) return;
      const F = CFG().match, me = this.me, b = g.ball;
      this.stepT += dt;
      if (this.pending && (this.gapT -= dt) <= 0) this.set(this.pending);

      // sự kiện của bước mô phỏng vừa chạy (UI.consume lấy đi ngay sau đây)
      for (const e of g.events) {
        if (e.type === 'goal' && e.team === 0) this.onGoal();
        if (e.type === 'corePicked') this.onPicked(e);
        if (e.type === 'ultimate' && e.team === 0 && e.player === me.name && this.step === 'ult') { this.step = 'ultdone'; this.set('final', 2.4); }
      }

      switch (this.step) {
        case 'move':
          if (g.state === 'play') this.dist += Math.hypot(me.x - this.last.x, me.y - this.last.y);
          if (this.dist >= F.moveDistance) this.complete('pass');
          break;
        case 'pass':
          if (b.kind === 'pass' && b.lastTouch === me) this.passed = true;
          if (this.mate && b.owner === this.mate && (this.passed || this.stepT > 0.1)) this.complete('shoot');
          break;
        case 'draft1':
          if (g.state === 'kickoff') this.openDraft(CFG().match.draftCores, { title: 'CORE UPGRADE', note: CFG().draftNote }, 'core');
          break;
        case 'defend':
          if (b.owner === me) this.complete('attack');
          break;
        case 'attack':
          this.updateQte(dt, g);
          break;
        case 'draft2':
          if (g.state === 'kickoff') this.openUltDraft();
          break;
        case 'charge':
          this.updateCharge(g);
          break;
        case 'ult':
          // chưa dùng: thanh luôn đầy
          if (g.cores.ultOf(me) && g.cores.ultE(me) < 1) me.res.ult = 1;
          break;
        case 'final':
          if (this.stepT > 5 && this.coachEl) this.coachEl.classList.add('gone');
          break;
      }
      this.last.x = me.x; this.last.y = me.y;
      this.updateCoach(g);
      this.updatePrompt(g, input);
    },

    onGoal() {
      const s = this.step;
      if (['move', 'pass', 'shoot'].includes(s)) { this.pending = null; this.step = 'draft1'; this.coachOk(); }
      else if (s === 'attack' || s === 'defend') { this.endQte(); this.pending = null; this.step = 'draft2'; this.coachOk(); }
    },

    onPicked(e) {
      const mine = e.picks.find((pk) => pk.pid === this.me.id);
      if (!mine) return;
      if (this.step === 'core') {
        const c = SFC_CONFIG.cores.list[mine.id];
        this.arch = c.tags[0];
        this.set('defend');
      } else if (this.step === 'ultpick') this.set('charge');
    },

    /* ---------------- QTE né đòn (bài GO SCORE) ---------------- */
    // rush: đối thủ lao vào -> windup: gồng Hard attack, trận chạy chậm, hiện phím né -> kết quả: né được = xong bài,
    // trúng đòn / không bấm = chờ hồi lại (trả bóng cho bạn) rồi lao vào lần nữa
    updateQte(dt, g) {
      const q = this.qte, Q = CFG().qte, me = this.me, b = g.ball;
      if (!q || q.phase === 'done') return;
      if (q.phase === 'wait') {
        if (me.state !== 'normal' || (q.t -= dt) > 0) return;
        if (b.owner !== me) { if (b.owner) g.looseBall(b.owner, 0, 0, 0); b.owner = null; g.gainPossession(me); }
        q.phase = 'rush'; q.o = null; q.hit = false;
        return;
      }
      if (q.phase === 'rush') {
        if (!q.o || q.o.state === 'stun') q.o = this.rusher(g);
        return;
      }
      // windup: bấm Z (đang lướt) -> miễn đòn chắc chắn, trận chạy lại bình thường cho cú lướt gọn
      if (!q.dodging && me.state === 'dash') {
        q.dodging = true;
        me.tackleImmune = Math.max(me.tackleImmune, Q.immune);
        g.slowT = 0;
        this.showQte(false);
      }
      if (me.state === 'stun') q.hit = true;
      if (q.o.state === 'windup' || q.o.state === 'kick') return;
      // cú đá đã xong
      g.slowT = 0;
      this.showQte(false);
      if (q.dodging && !q.hit) {
        q.phase = 'done';
        g.effects.comic(me.x, me.y - 34, Q.label, '#3ff6ff', 1.3, 0.7);
        SFC.Audio.read(0);
        this.coachOk();
        setTimeout(() => { if (this.step === 'attack' && this.coachEl) this.coachEl.classList.add('gone'); }, 900);
      } else {
        q.phase = 'wait'; q.t = Q.retry; q.dodging = false;
      }
    },
    // đối thủ lao vào: người gần bạn nhất còn đứng vững
    rusher(g) {
      let best = null, bd = Infinity;
      for (const o of g.teams[1].players) {
        const d = Math.hypot(o.x - this.me.x, o.y - this.me.y);
        if (o.state === 'normal' && d < bd) { bd = d; best = o; }
      }
      return best;
    },
    startWindup(g, o) {
      const q = this.qte, Q = CFG().qte;
      o.cd.hard = 0;
      o.facing = Math.atan2(this.me.y - o.y, this.me.x - o.x);
      if (!SFC.Actions.hardAttack(g, o)) return;
      q.phase = 'windup'; q.dodging = false; q.hit = false;
      g.slowMo(Q.slow, 8);
      this.showQte(true);
    },
    endQte() {
      if (this.qte && this.qte.phase === 'windup' && this.g) this.g.slowT = 0;
      this.qte = null;
      this.showQte(false);
    },
    showQte(on) {
      const el = this.qteEl;
      if (!el) return;
      if (on) {
        el.innerHTML = `<div class="qte-box"><div class="qte-ring"></div><kbd>${esc(SFC.Input.label('skill'))}</kbd><b>DODGE</b></div>`;
        el.className = 'qte';
        SFC.Audio.whoosh();
      } else el.className = 'hidden';
    },

    /* ---------------- tích Ultimate (show, don't tell) ---------------- */
    // năng lượng vừa nạp được nhân lên (ultCharge.mult); nguồn nạp nhận theo lượng gốc -> sáng lên trên hộp gợi ý + chữ nổi ở cầu thủ
    updateCharge(g) {
      const me = this.me, C = CFG().ultCharge, U2 = SFC_CONFIG.cores.ultimate;
      const v = g.cores.ultE(me), d = v - this.ultLast;
      if (d > 0.001) {
        const src = C.sources.reduce((a, s) => (Math.abs((U2[s[2]] || 0) - d) < Math.abs((U2[a[2]] || 0) - d) ? s : a));
        me.res.ult = Math.min(1, v + d * (C.mult - 1));
        const gain = Math.round((me.res.ult - this.ultLast) * 100);
        g.effects.comic(me.x, me.y - 34, `+${gain}%`, '#ffd23f', 1.1, 0.6);
        this.flashSource(src[0]);
        SFC.Audio.reveal(1);
      }
      this.ultLast = g.cores.ultE(me);
      this.drawChargeBar();
      if (this.ultLast >= 1 && !this.pending) this.set('ult', CFG().match.stepGap);
    },
    drawChargeBar() {
      const el = this.coachEl, v = Math.round(this.ultLast * 100);
      const bar = el && el.querySelector('.co-bar');
      if (!bar || bar.dataset.v === String(v)) return;
      bar.dataset.v = v;
      bar.style.setProperty('--u', (v / 100).toFixed(2));
      bar.querySelector('em').textContent = v + '%';
    },
    flashSource(k) {
      const n = this.coachEl && this.coachEl.querySelector(`.co-src [data-s="${k}"]`);
      if (!n) return;
      n.classList.remove('hit'); void n.offsetWidth; n.classList.add('hit', 'got');
    },

    // mở lượt chọn Core có kịch bản: ghi đè 3 lá của người chơi, không đổi bài
    openDraft(ids, meta, next) {
      const g = this.g;
      g.startDraft();
      const d = g.draft;
      if (!d) return;
      d.options[g.me] = ids.filter((id) => SFC_CONFIG.cores.list[id] && !g.cores.has(this.me, id));
      d.rerolls = {};
      d.noReroll = true;
      Object.assign(d, meta);
      this.step = next;
      this.renderCoach();
    },

    // Ultimate theo trường phái của lá vừa chọn (bỏ qua điều kiện 2 Core cùng trường phái)
    openUltDraft() {
      const F = CFG().match, L = SFC_CONFIG.cores.list;
      const arch = this.arch || 'striker';
      const id = F.ultOf[arch] || Object.keys(L).find((k) => L[k].role === 'ult' && L[k].tags.includes(arch)) || 'meteor_strike';
      this.ultId = id;
      const A = SFC_CONFIG.cores.archetypes[arch];
      this.openDraft([id], { title: 'ULTIMATE UNLOCKED', special: 'ult', note: CFG().ultNote.replace('{arch}', A ? A.label : arch) }, 'ultpick');
      SFC.Audio.reveal(4);
    },

    /* ---------------- AI theo bài ---------------- */
    // trả về true = đã điều khiển cầu thủ p ở bước này (AI thường bỏ qua)
    aiHook(g, p, dt) {
      if (!this.active) return false;
      const s = this.step, b = g.ball, f = g.field, me = this.me;
      if (p.team === 1) {
        const i = g.teams[1].players.indexOf(p);
        // chỗ đứng xem: phần sân đối thủ, sát tường trên / dưới, ngoài đường sút
        const idle = () => { steer(p, f.x + f.w * 0.64, i ? f.y + f.h - 24 : f.y + 24, 0.7); p.facing = Math.atan2(b.y - p.y, b.x - p.x); return true; };
        if (EARLY.includes(s)) { b.noPickup.set(p.id, 0.15); return idle(); }
        if (s === 'defend') {
          if (b.owner === p) {
            // dắt bóng chậm về phía khung thành của bạn rồi đứng chờ (không chuyền, không sút)
            steer(p, f.x + 120, f.cy + Math.sin(g.time * 1.3) * 30, CFG().match.carrierPace, 10);
            return true;
          }
          b.noPickup.set(p.id, 0.15);
          if (p.state === 'normal') { p.intent.mx = 0; p.intent.my = 0; }
          return true;
        }
        if (HOLD.includes(s)) {
          p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false;
          return true;
        }
        if (s === 'attack' && this.qte && this.qte.phase !== 'done') {
          const q = this.qte;
          if (p !== q.o) { b.noPickup.set(p.id, 0.15); return idle(); }
          if (q.phase === 'rush' && p.state === 'normal') {
            // lao thẳng vào bạn, đủ gần thì gồng đá
            steer(p, me.x, me.y, 1, 2);
            p.intent.sprint = true;
            if (Math.hypot(me.x - p.x, me.y - p.y) < CFG().qte.triggerDist) this.startWindup(g, p);
          } else if (p.state === 'windup' && !q.dodging) {
            const d = Math.hypot(me.x - p.x, me.y - p.y) || 1;
            p.intent.mx = (me.x - p.x) / d; p.intent.my = (me.y - p.y) / d; p.intent.sprint = false;
          } else { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; }
          b.noPickup.set(p.id, 0.15);
          return true;
        }
        if (s === 'charge') {
          // đối thủ cầm bóng: dắt chậm cho bạn đấm; không cầm bóng: đá bình thường (cướp lại được thì bạn đấm tiếp)
          if (b.owner === p) { steer(p, f.x + 120, f.cy + Math.sin(g.time * 1.3) * 30, CFG().match.carrierPace, 10); return true; }
          if (b.owner && b.owner.team === 1) { b.noPickup.set(p.id, 0.15); p.intent.mx = 0; p.intent.my = 0; return true; }
          return false;
        }
        if (s === 'ult') {
          // tiến lại gần để Ultimate chắc chắn trúng người
          if (Math.hypot(me.x - p.x, me.y - p.y) > 55) steer(p, me.x, me.y, 0.55, 55);
          else { p.intent.mx = 0; p.intent.my = 0; }
          p.intent.sprint = false;
          return true;
        }
        return false;
      }
      if (p === this.mate) {
        if (s === 'defend' || s === 'charge') {
          // đồng đội lùi về giữ khung, nhường bạn cướp bóng
          b.noPickup.set(p.id, 0.15);
          const home = g.formationPos(p);
          steer(p, home.x, home.y, 0.8);
          return true;
        }
        // các bài đầu + lúc chờ Ultimate: có bóng là chuyền trả cho bạn
        if ((EARLY.includes(s) || HOLD.includes(s) || s === 'ult' || s === 'attack') && b.owner === p) {
          this.mateT += dt;
          p.intent.mx = 0; p.intent.my = 0;
          if (this.mateT >= CFG().match.mateReturn && p.state === 'normal') { this.mateT = 0; SFC.Actions.passTo(g, p, me, 'ground'); }
          return true;
        }
        this.mateT = 0;
      }
      return false;
    },

    /* ---------------- phím trên đầu nhân vật (kiểu QTE, không chạy chậm) ---------------- */
    renderPrompt() {
      const el = this.promptEl, S = CFG().steps[this.step];
      this.promptKey = this.step + '|' + SFC.Input.deviceRev;
      if (!el) return;
      if (!S || !S.prompts) { el.innerHTML = ''; return; }
      const I = SFC.Input, pad = I.device === 'pad';
      const cap = (a) => {
        if (a !== 'move') return `<kbd data-a="${a}">${esc(I.label(a))}</kbd>`;
        if (pad) return '<kbd data-a="move">L-STICK</kbd>';
        return `<span class="pr-arrows"><kbd data-a="up">↑</kbd><kbd data-a="left">←</kbd><kbd data-a="down">↓</kbd><kbd data-a="right">→</kbd></span>`;
      };
      el.innerHTML = `<div class="pr-box ${S.gold ? 'gold' : ''}">${S.prompts.map(([a, label, hold]) =>
        `<div class="pr-item">${hold ? '<i>HOLD</i>' : ''}${cap(a)}<b>${esc(label)}</b></div>`).join('')}</div>`;
    },
    updatePrompt(g, input) {
      const el = this.promptEl;
      if (!el) return;
      if (this.promptKey !== this.step + '|' + SFC.Input.deviceRev) this.renderPrompt();
      const S = CFG().steps[this.step], me = this.me, b = g.ball;
      let show = !!(S && S.prompts) && !this.pending && (g.state === 'play' || g.state === 'kickoff') && me.state !== 'stun'
        && !(this.qte && this.qte.phase === 'windup');
      if (show && S.when === 'ball') show = b.owner === me;
      if (show && S.when === 'defend') show = !!b.owner && b.owner.team === 1;
      el.className = show ? '' : 'hidden';
      if (!show) return;
      const box = el.firstElementChild;
      if (box) { box.style.left = Math.round(Math.max(60, Math.min(580, me.x))) + 'px'; box.style.top = Math.round(Math.max(60, me.y - 28)) + 'px'; }
      // phím đang giữ: lún xuống
      if (input && input.isDown) el.querySelectorAll('kbd[data-a]').forEach((k) => {
        const a = k.dataset.a;
        k.classList.toggle('on', a === 'move' ? ['up', 'down', 'left', 'right'].some((d) => input.isDown(d)) : input.isDown(a));
      });
    },

    /* ---------------- hộp gợi ý ---------------- */
    renderCoach() {
      const el = this.coachEl;
      if (!el) return;
      const S = CFG().steps[this.step];
      this.coachDev = SFC.Input.deviceRev;
      if (!S) { el.className = 'hidden'; el.innerHTML = ''; return; }
      // tích Ultimate: chỉ thanh năng lượng + các nguồn nạp (sáng lên khi vừa nạp), không chữ hướng dẫn
      const body = S.charge
        ? `<div class="co-bar" style="--u:${this.ultLast.toFixed(2)}"><i></i><em>${Math.round(this.ultLast * 100)}%</em></div>
           <div class="co-src">${CFG().ultCharge.sources.slice(0, 3).map(([k, l]) => `<span data-s="${k}">${l}</span>`).join('')}</div>`
        : S.text ? `<div class="co-x">${esc(S.text)}</div>` : '';
      el.innerHTML = `<div class="co-t">${S.charge && this.ultId ? SFC.PixelIcon.core(this.ultId, 'sm') + ' ' : ''}${esc(S.title)}</div>${body}<div class="co-ok">NICE!</div>`;
      el.className = 'coach' + (this.step === 'ult' || S.charge ? ' ult' : '') + (this.step === 'final' ? ' final' : '');
      void el.offsetWidth;
      el.classList.add('in');
    },
    coachOk() { if (this.coachEl) { this.coachEl.classList.add('ok'); SFC.Audio.pick(); } },

    updateCoach(g) {
      const el = this.coachEl;
      if (!el) return;
      if (SFC.Input.deviceRev !== this.coachDev && !this.pending) this.renderCoach();
      if (this.qte && this.qte.phase === 'windup' && this.qteEl && !this.qte.dodging) {
        // vòng co lại theo nhịp gồng đòn của đối thủ
        const o = this.qte.o, W = SFC_CONFIG.game.combat.hard.windup;
        this.qteEl.style.setProperty('--k', o && o.state === 'windup' ? Math.max(0, Math.min(1, o.stateT / W)).toFixed(2) : 0);
        // bám theo cầu thủ của bạn (sân vẽ 1:1 trong khung 640x360)
        const box = this.qteEl.firstElementChild, me = this.me;
        if (box) { box.style.left = Math.round(Math.max(60, Math.min(580, me.x))) + 'px'; box.style.top = Math.round(Math.max(70, me.y - 40)) + 'px'; }
      }
      el.classList.toggle('away', g.state === 'draft' || g.state === 'goal');
      // ô kỹ năng cần dùng nhấp nháy
      const S = CFG().steps[this.step], want = (S && S.pulse) || [];
      document.querySelectorAll('#abar .ab-slot[data-k]').forEach((n) => n.classList.toggle('tut-pulse', want.includes(n.dataset.k)));
    },

    /* ---------------- kết thúc ---------------- */
    // hết giờ trận mơ: còi, trắng xoá -> cut scene tỉnh dậy + thẻ MAIN PATH -> trang Main Path
    onEnd(g) {
      if (g !== this.g) return;
      const t0 = g.teams[0], t1 = g.teams[1];
      SFC.UI.banner('FULL TIME', `${t0.score} - ${t1.score} · what a dream...`, '#b9a8ff', 2.4);
      this.markDone();
      setTimeout(() => {
        if (this.app.game !== g) return;
        this.cleanup();
        this.app.screen = 'story';
        SFC.UI.show(null);
        SFC.UI.el.hud.classList.add('hidden');
        SFC.UI.el.abar.classList.add('hidden');
        SFC.Story.play('outro', () => this.app.toMenu('path'));
      }, 2200);
    },

    // Pause > SKIP PROLOGUE: vẫn xem thẻ MAIN PATH rồi vào trang Main Path
    skip() {
      this.markDone();
      this.cleanup();
      const app = this.app;
      app.game = null;
      app.screen = 'story';
      SFC.UI.show(null);
      SFC.UI.el.hud.classList.add('hidden');
      SFC.UI.el.abar.classList.add('hidden');
      SFC.Story.play('outro', () => app.toMenu('path'), 'path');
    },

    cleanup() {
      this.active = false;
      if (this.g) this.g.aiHook = null;
      this.g = null;
      const c = document.getElementById('coach'), fx = document.getElementById('dreamfx');
      if (c) { c.className = 'hidden'; c.innerHTML = ''; }
      this.endQte();
      this.qteEl = document.getElementById('qte');
      this.showQte(false);
      const pr = document.getElementById('prompt');
      if (pr) { pr.className = 'hidden'; pr.innerHTML = ''; }
      this.promptKey = null;
      if (fx) fx.classList.add('hidden');
      document.querySelectorAll('#abar .tut-pulse').forEach((n) => n.classList.remove('tut-pulse'));
    },
  };

  SFC.Tutorial = Tutorial;
})();
