/* Motion Preview — engine dùng chung (docs/ux-motion). Một trang, mỗi màn 1 mục: MP.screen(def) ở screens/*.js, MP.mount() dựng hết.
 * Mỗi mục có đồng hồ riêng (cuộn tới = chạy lại từ đầu, ra khỏi màn hình = dừng); tốc độ / Auto-loop chung cả trang.
 * Mỗi animation là WAAPI để dừng (pause) rồi đặt currentTime theo đồng hồ của mục, nên Replay / tốc độ / bấm thử luôn khớp giữa các cột.
 * Easing đặt trên từng đoạn keyframe (như animation-timing-function của CSS), không đặt cho cả vòng. Phần chạy bằng JS trong game
 * (đếm số, dải quay, chấm cầu thủ...) đi qua tl.tick((t, flags) => ...).
 *
 * def: { id, name, sub, prio: 'High'|'Med'|'Low', group, effort, problem, fix, src, note, css, pre, preLabel, cols: [col...] }
 * col: { tag: 'Before'|'After'|'Option A'..., title, line (đúng 1 dòng dưới cột, HTML), total, ctaAt, cta,
 *        skipTo (bấm trước ctaAt = nhảy tới đây + khoá 0.3s; không có = bấm bị bỏ qua),
 *        tap(ct, flags) -> { jump, lock, msg, flag } | { fire: true, msg } | { ignore: 'lý do' }   (bản Before chép đúng luật input của code),
 *        state(ct, flags) -> [chữ đèn input, 'on' | 'lock' | 'skip'], build(stage, tl) }
 */
(function () {
  'use strict';
  const STAGE_W = 640, HOLD = 1.2, LOCK = 0.3;
  const MP = (window.MP = { list: [] });

  MP.screen = (def) => MP.list.push(def);
  MP.html = function (html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content;
  };
  MP.clamp01 = (k) => Math.max(0, Math.min(1, k));
  MP.easeOut2 = (k) => 1 - (1 - k) * (1 - k);
  // con trỏ ▶ của nút đang chọn: chBob 0.6s steps(2) vô hạn (css .sel::before) — như nhau ở mọi cột
  MP.bob = (tl, el) => tl.anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(2px)', offset: 0.5 }, { transform: 'translateX(0)' }], { dur: 0.6, ease: 'steps(2)', iter: Infinity });

  function Timeline() { this.anims = []; this.ticks = []; }
  // frames: [{...}, ...] (offset tuỳ chọn) · o: { at, dur, ease, fill, iter }
  Timeline.prototype.anim = function (target, frames, o) {
    if (!target) return null;
    const ease = o.ease || 'linear';
    const kf = frames.map((f, i) => (i < frames.length - 1 ? Object.assign({ easing: ease }, f) : Object.assign({}, f)));
    const a = target.animate(kf, {
      duration: o.dur * 1000, delay: (o.at || 0) * 1000, fill: o.fill || 'both',
      iterations: o.iter == null ? 1 : o.iter, easing: 'linear',
    });
    a.pause();
    a.mpPeriod = o.period || 0;   // > 0: chạy lại từ đầu mỗi period giây (mô phỏng innerHTML vẽ lại)
    this.anims.push(a);
    return a;
  };
  Timeline.prototype.tick = function (fn) { this.ticks.push(fn); };
  Timeline.prototype.set = function (t, flags) {
    const s = Math.max(0, t);
    for (const a of this.anims) a.currentTime = (a.mpPeriod ? s % a.mpPeriod : s) * 1000;
    for (const f of this.ticks) f(s, flags);
  };

  function Column(def, sec) {
    this.def = def; this.sec = sec;
    this.reset();
    const root = (this.root = document.createElement('div'));
    root.className = 'mp-col ' + (def.tag === 'Before' ? 'before' : 'after');
    root.innerHTML = `<header class="mp-colhead"><span class="mp-tag">${def.tag}</span><b>${def.title || ''}</b>
        <span class="mp-input" data-k="lock"><i></i><span></span></span></header>
      <div class="mp-frame" role="button" tabindex="0" aria-label="Bấm thử: ${sec.def.name} · ${def.tag}"><div class="mp-stage"></div>
        ${sec.pre > 0 ? `<div class="mp-prev"><span>${sec.def.preLabel || 'Màn trước'}</span></div>` : ''}
        <div class="mp-stamp" hidden><span></span></div><div class="mp-toast" hidden></div></div>
      <p class="mp-line">${def.line || ''}</p>`;
    this.frame = root.querySelector('.mp-frame');
    this.stage = root.querySelector('.mp-stage');
    this.prev = root.querySelector('.mp-prev');
    this.stamp = root.querySelector('.mp-stamp');
    this.toast = root.querySelector('.mp-toast');
    this.input = root.querySelector('.mp-input');
    this.tl = new Timeline();
    def.build(this.stage, this.tl);
    const fit = () => { this.stage.style.transform = `scale(${this.frame.clientWidth / STAGE_W})`; };
    if (window.ResizeObserver) new ResizeObserver(fit).observe(this.frame);
    fit();
  }
  Column.prototype.reset = function () {
    this.off = 0; this.lock = -1; this.fired = null; this.toastT = 0; this.flags = {};
    if (this.stamp) { this.stamp.hidden = true; this.toast.hidden = true; }
  };
  // t = thời gian màn (đã trừ pre-roll; âm = còn ở màn trước)
  Column.prototype.ct = function (t) { return this.fired ? this.fired.ct : t + this.off; };
  Column.prototype.render = function (t, now) {
    if (this.prev) this.prev.hidden = t >= 0;
    const ct = this.ct(t), d = this.def;
    this.tl.set(ct, this.flags);
    if (this.toastT && now > this.toastT) { this.toast.hidden = true; this.toastT = 0; }
    let s;
    if (this.fired) s = [this.fired.msg || 'Đã bấm ' + d.cta, 'fired'];
    else if (t < 0) s = ['màn trước', 'lock'];
    else if (ct < this.lock) s = ['khoá sau khi bỏ qua', 'lock'];
    else if (d.state) s = d.state(ct, this.flags);
    else if (ct >= d.ctaAt) s = ['nhận phím: ' + d.cta, 'on'];
    else if (d.skipTo != null) s = ['bấm = hiện đủ', 'skip'];
    else s = ['khoá input', 'lock'];
    if (this.input.dataset.k !== s[1] || this.input.lastChild.textContent !== s[0]) {
      this.input.dataset.k = s[1];
      this.input.lastChild.textContent = s[0];
    }
  };
  Column.prototype.say = function (msg, now) { this.toast.textContent = msg; this.toast.hidden = false; this.toastT = now + 1100; };
  Column.prototype.tap = function (t, now) {
    if (t < 0 || this.fired) return;
    const d = this.def, ct = this.ct(t);
    if (ct < this.lock) return this.say('bị chặn (khoá 0.3s)', now);
    let r;
    if (d.tap) r = d.tap(ct, this.flags);
    else if (ct >= d.ctaAt) r = { fire: true };
    else if (d.skipTo != null) r = { jump: d.skipTo, lock: true };
    else r = { ignore: 'bị chặn (đang khoá)' };
    if (r.flag) this.flags[r.flag] = true;
    if (r.fire) {
      this.fired = { ct, msg: r.msg };
      this.stamp.querySelector('span').innerHTML = `▶ ${r.msg || d.cta}<br>lúc ${ct.toFixed(2)}s · rời màn`;
      this.stamp.hidden = false;
    } else if (r.jump != null) {
      this.off += r.jump - ct;
      if (r.lock) this.lock = r.jump + LOCK;
      this.say(r.msg || 'hiện đủ ngay', now);
    } else if (r.ignore) this.say(r.ignore, now);
    else if (r.msg) this.say(r.msg, now);
  };

  const PRIO = { High: 'hi', Med: 'md', Low: 'lo' };
  function Section(def, app) {
    this.def = def; this.app = app; this.pre = def.pre || 0;
    this.t = 0; this.playing = false; this.visible = false; this.ratio = 0;
    this.end = this.pre + Math.max(...def.cols.map((c) => Math.max(c.total, Number.isFinite(c.ctaAt) ? c.ctaAt : 0))) + HOLD;
    const el = (this.el = document.createElement('section'));
    el.className = 'mp-sec';
    el.id = def.id;
    el.innerHTML = `<header class="mp-sechead">
        <div class="ix-meta"><span class="ix-chip ${PRIO[def.prio]}">${def.prio.toUpperCase()}</span><span class="ix-chip">${def.group}</span>${def.effort ? `<span class="ix-chip">effort ${def.effort}</span>` : ''}</div>
        <h2>${def.name}${def.sub ? ` <small>· ${def.sub}</small>` : ''}</h2>
        ${def.problem ? `<p class="mp-prob"><b>Vấn đề</b> ${def.problem}</p>` : ''}
        ${def.fix ? `<p class="mp-fix"><b>Đề xuất</b> ${def.fix}</p>` : ''}
        ${def.note ? `<p class="mp-note">${def.note}</p>` : ''}
        <div class="mp-secbar"><button class="mp-btn main" type="button" data-a="replay">↻ Replay</button>
          <button class="mp-btn" type="button" data-a="tap">✋ Bấm thử</button><span class="mp-time">t = 0.00 s</span></div>
      </header><div class="mp-cols" style="--n:${def.cols.length}"></div>`;
    this.timeEl = el.querySelector('.mp-time');
    const host = el.querySelector('.mp-cols');
    this.cols = def.cols.map((c) => new Column(c, this));
    this.cols.forEach((c) => {
      host.appendChild(c.root);
      c.frame.addEventListener('click', () => this.tapAll());
      c.frame.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.tapAll(); } });
    });
    el.querySelector('[data-a="replay"]').addEventListener('click', () => this.replay());
    el.querySelector('[data-a="tap"]').addEventListener('click', () => this.tapAll());
    this.draw(performance.now());
  }
  Section.prototype.replay = function () { this.t = 0; this.playing = true; this.cols.forEach((c) => c.reset()); };
  Section.prototype.tapAll = function () { const now = performance.now(); this.cols.forEach((c) => c.tap(this.t - this.pre, now)); };
  Section.prototype.step = function (dt) {
    if (!this.playing) return;
    this.t += dt * this.app.speed;
    if (this.t >= this.end) { if (this.app.loop) this.replay(); else { this.t = this.end; this.playing = false; } }
  };
  Section.prototype.draw = function (now) {
    const t = this.t - this.pre;
    this.cols.forEach((c) => c.render(t, now));
    this.timeEl.textContent = t < 0 ? 'màn trước' : `t = ${t.toFixed(2)} s`;
  };

  MP.mount = function () {
    const css = document.createElement('style');
    css.textContent = MP.list.map((d) => d.css || '').join('\n');
    document.head.appendChild(css);
    const app = { speed: 1, loop: true, secs: [] };
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) app.loop = false; } catch (e) { /* bỏ qua */ }
    const host = document.getElementById('mp-secs'), nav = document.getElementById('mp-nav');
    let lastPrio = '';
    MP.list.forEach((d) => {
      if (d.prio !== lastPrio) {
        lastPrio = d.prio;
        const h = document.createElement('h2');
        h.className = 'mp-band ' + PRIO[d.prio];
        h.id = 'p-' + PRIO[d.prio];
        h.textContent = d.prio === 'High' ? 'High' : d.prio === 'Med' ? 'Medium' : 'Low';
        host.appendChild(h);
        nav.insertAdjacentHTML('beforeend', `<span class="mp-navp ${PRIO[d.prio]}">${h.textContent}</span>`);
      }
      const s = new Section(d, app);
      app.secs.push(s);
      host.appendChild(s.el);
      nav.insertAdjacentHTML('beforeend', `<a href="#${d.id}">${d.short || d.name}</a>`);
    });
    // cuộn tới = chạy lại từ đầu · ra khỏi màn hình = dừng
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      const s = app.secs.find((x) => x.el === e.target);
      s.ratio = e.intersectionRatio;
      const vis = e.isIntersecting && e.intersectionRatio >= 0.25;
      if (vis && !s.visible) s.replay();
      if (!vis) s.playing = false;
      s.visible = vis;
    }), { threshold: [0, 0.25, 0.5, 0.75, 1] });
    app.secs.forEach((s) => io.observe(s.el));
    const active = () => app.secs.filter((s) => s.visible).sort((a, b) => b.ratio - a.ratio)[0];

    const setSpeed = (v) => {
      app.speed = v;
      document.querySelectorAll('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.speed === v)));
    };
    const setLoop = (v) => {
      app.loop = v;
      document.getElementById('mp-loop').setAttribute('aria-pressed', String(v));
      if (v) app.secs.forEach((s) => { if (s.visible && !s.playing) s.replay(); });
    };
    document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
    document.getElementById('mp-loop').addEventListener('click', () => setLoop(!app.loop));
    document.getElementById('mp-replay').addEventListener('click', () => app.secs.forEach((s) => { if (s.visible) s.replay(); }));
    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase(), s = active();
      if (k === 't' && s) s.tapAll();
      else if (k === 'r' && s) s.replay();
      else if (k === 'l') setLoop(!app.loop);
      else if (k === '1') setSpeed(0.25);
      else if (k === '2') setSpeed(0.5);
      else if (k === '3') setSpeed(1);
    });
    setSpeed(1);
    setLoop(app.loop);
    let last = 0;
    const frame = (now) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      for (const s of app.secs) if (s.visible) { s.step(dt); s.draw(now); }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
})();
