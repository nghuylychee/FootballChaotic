/* Brag capture director — injected after the real game boots. Drives the REAL game code. */
(function () {
  const U = SFC.U, Act = SFC.Actions, PI = Math.PI;
  const app = SFC.app;
  const B = (window.BRAG = { sfx: [], events: [], focus: null, t: 0, stepT: 0, dir: null, timeline: [], done: 0 });

  // log every sound effect the game fires (drives the soundtrack's hit points)
  const sfx0 = SFC.Game.prototype.sfx;
  SFC.Game.prototype.sfx = function (name, arg) { if (!this.silent) B.sfx.push({ t: B.t, name }); return sfx0.call(this, name, arg); };
  for (const k of Object.keys(SFC.Audio)) if (typeof SFC.Audio[k] === 'function' && !['toggleMute', 'init', 'resume', 'unlock'].includes(k)) {
    const f = SFC.Audio[k];
    SFC.Audio[k] = function (...a) { if (!B.inGameSfx) B.sfx.push({ t: B.t, name: 'ui:' + k }); return f.apply(this, a); };
  }
  const sfx1 = SFC.Game.prototype.sfx;
  SFC.Game.prototype.sfx = function (n, a) { B.inGameSfx = true; try { return sfx1.call(this, n, a); } finally { B.inGameSfx = false; } };

  // director runs after the AI each sim step: override intents of scripted players
  const ai0 = SFC.AI.update.bind(SFC.AI);
  SFC.AI.update = (dt, g) => { ai0(dt, g); B.stepT += dt; if (B.dir) B.dir(dt, g, B.stepT); };

  const place = (p, x, y, facing) => Object.assign(p, {
    x, y, vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0, airVz: 0, state: 'normal', stateT: 0, hitImmune: 0,
    facing: facing != null ? facing : p.team ? PI : 0,
  });
  const give = (g, p) => { g.ball.owner = null; g.gainPossession(p); };
  const face = (p, q) => { p.facing = Math.atan2(q.y - p.y, q.x - p.x); };
  const steer = (p, x, y, sprint) => { const d = U.norm(x - p.x, y - p.y); const k = Math.min(1, Math.hypot(x - p.x, y - p.y) / 12); p.intent.mx = d.x * k; p.intent.my = d.y * k; p.intent.sprint = !!sprint; };
  const hush = () => { const el = document.getElementById('banner'); el.classList.remove('show'); el.innerHTML = ''; SFC.UI.clearToasts(); };

  function match(opts) {
    SFC.Profile.data.name = 'NGH';
    const look = Object.assign({}, SFC.Profile.data.look, { hair: 'spiky', fx: 'nofx' });
    app.sel.team = 0;
    app.startMatch(Object.assign({
      home: 'street_kings', away: 'neon_strikers', difficulty: 'hard', humanTeam: 0, solo: [1, null], noDraft: true,
      avatars: [{ name: 'NGH', look, role: 'FWD' }, null],
    }, opts));
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    hush();
    return g;
  }
  const at = (t, fn) => B.timeline.push([t, fn]);

  // called by the capture loop once per video frame (t = seconds since clip start)
  B.frame = function (t) {
    B.t = t;
    while (B.done < B.timeline.length && t >= B.timeline[B.done][0]) { B.timeline[B.done][1](); B.done++; }
    const g = app.game;
    const f = B.focusFn ? B.focusFn(g) : null;
    return { focus: f ? { x: f.x, y: f.y } : null, state: g ? g.state : null, ball: g ? [Math.round(g.ball.x), Math.round(g.ball.y), Math.round(g.ball.z)] : null };
  };

  const SCENES = {
    /* HOOK: a normal-looking attack... then the dropkick */
    hook() {
      const g = match({});
      g.cores.add(0, 'heavy_boot'); g.cores.add(0, 'wall_slam');
      const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players;
      place(me, 250, 250, 0); place(mate, 150, 150, 0);
      place(o1, 400, 222, PI); place(o2, 540, 203, PI);
      give(g, o1);
      let kicked = false;
      B.dir = (dt, g, t) => {
        o1.intent.mx = -0.75; o1.intent.my = -0.1; o1.intent.sprint = false;
        if (!kicked) {
          steer(me, o1.x - 22, o1.y + 3, true);
          if (t > 0.45 && U.dist(me, o1) < 34) { face(me, o1); Act.hardAttack(g, me); kicked = true; }
        } else if (me.state === 'normal') { me.intent.mx = me.intent.my = 0; }
      };
      B.focusFn = () => (kicked ? o1 : me);
    },

    /* the draft: pick a Core mid-match */
    draft() {
      SFC.Profile.data.name = 'NGH';
      app.startMatch({ home: 'street_kings', away: 'neon_strikers', difficulty: 'hard', humanTeam: 0, solo: [1, null] });
      const g = app.game;
      at(0, () => {
        hush();
        if (g.state !== 'draft') g.startDraft(true);
        g.draft.options[0] = ['bomb_ball', 'hundred_fists', 'meteor_strike'];
        SFC.UI.draftSel = 0; SFC.UI.renderDraft(g); SFC.UI.show('draft');
      });
      at(0.9, () => SFC.UI.setDraftSel(1));
      at(1.5, () => SFC.UI.setDraftSel(2));
      at(2.3, () => { SFC.UI.pick(g, 2); });
    },

    ult_meteor() {
      const g = match({});
      g.cores.add(0, 'meteor_strike'); g.ult[0] = 1;
      const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players;
      place(me, 245, 206, 0); place(mate, 150, 150, 0); place(o1, 568, 203, PI); place(o2, 400, 262, PI);
      give(g, me);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired) { me.intent.mx = 0.6; me.intent.my = -0.1; }
        if (!fired && t > 0.35) { fired = g.cores.activateUltimate(0, me); }
      };
      B.focusFn = () => (fired ? g.ball : me);
    },

    ult_fists() {
      const g = match({});
      g.cores.add(0, 'hundred_fists'); g.ult[0] = 1;
      const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players;
      place(me, 290, 190, 0); place(mate, 160, 250, 0); place(o1, 350, 185, PI); place(o2, 470, 260, PI);
      give(g, o1);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired) { o1.intent.mx = -0.3; o1.intent.my = 0; }
        if (!fired && t > 0.3) fired = g.cores.activateUltimate(0, me);
      };
      B.focusFn = () => o1;
    },

    ult_drop() {
      const g = match({});
      g.cores.add(0, 'meteor_drop'); g.ult[0] = 1;
      const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players;
      place(me, 260, 205, 0); place(mate, 150, 150, 0); place(o1, 350, 210, PI); place(o2, 368, 188, PI);
      give(g, o1);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired && t > 0.3) fired = g.cores.activateUltimate(0, me);
        if (me.state === 'meteor') steer(me, o1.x, o1.y);
        if (o1.state === 'normal') { o1.intent.mx = -0.35; o1.intent.my = 0; o2.intent.mx = -0.3; o2.intent.my = 0.05; }
      };
      B.focusFn = () => me;
    },

    ult_titan() {
      const g = match({});
      g.cores.add(0, 'titan'); g.ult[0] = 1;
      const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players;
      place(me, 250, 205, 0); place(mate, 150, 250, 0); place(o1, 330, 200, PI); place(o2, 390, 222, PI);
      give(g, me);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired && t > 0.25) fired = g.cores.activateUltimate(0, me);
        if (fired && t > 1.1) { me.intent.mx = 1; me.intent.my = 0; me.intent.sprint = true; }
        else { me.intent.mx = 0; me.intent.my = 0; }
        for (const o of [o1, o2]) if (o.state === 'normal') { steer(o, me.x + 20, me.y + (o === o1 ? -4 : 8)); }
      };
      B.focusFn = () => me;
    },

    ult_clone() {
      const g = match({});
      g.cores.add(0, 'clone_army'); g.ult[0] = 1;
      const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players;
      place(me, 270, 205, 0); place(mate, 150, 250, 0); place(o1, 330, 205, PI); place(o2, 470, 150, PI);
      give(g, o1);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired && t > 0.3) fired = g.cores.activateUltimate(0, me);
        if (o1.state === 'normal') { o1.intent.mx = -0.3; o1.intent.my = 0.1; }
      };
      B.focusFn = () => o1;
    },

    ult_lightning() {
      const g = match({});
      g.cores.add(0, 'lightning_dash'); g.ult[0] = 1;
      const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players;
      place(me, 200, 205, 0); place(mate, 150, 280, 0); place(o1, 300, 200, PI); place(o2, 350, 212, PI);
      give(g, me);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired) { me.intent.mx = 0.5; me.intent.my = 0; }
        if (!fired && t > 0.3) fired = g.cores.activateUltimate(0, me);
      };
      B.focusFn = () => me;
    },

    /* full-field AI vs AI chaos with a stack of Cores — background plate */
    chaos() {
      const g = match({ humanTeam: -1, humans: [], solo: [null, null], avatars: null, difficulty: 'hard' });
      for (const id of ['chaos_ball', 'fire_shot', 'heavy_boot', 'street_fighter']) g.cores.add(0, id);
      for (const id of ['bomb_ball', 'thunder_kick', 'sonic_boom', 'uppercut']) g.cores.add(1, id);
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('abar').classList.add('hidden');
      B.focusFn = () => g.ball;
    },

    /* costume gacha crate spin (every sprite drawn in code) */
    gacha() {
      const P = SFC.Profile;
      P.data.name = 'NGH'; P.data.gold = 99999; P.data.level = 10; P.save && P.save();
      app.toMenu('home');
      SFC.Gacha.shopBack = 'home';
      SFC.Menu.go('shop');
      SFC.Gacha.boxSel = 1;
      SFC.Menu.render && SFC.Menu.render();
      SFC_CONFIG.progression.reelTime = 2.0;   // faster spin for the clip
      at(0.4, () => SFC.Gacha.openBox(SFC.Menu, 'legend'));
    },

    /* CHARACTER page: cycle through costume combos on the spinning player */
    custom() {
      const P = SFC.Profile;
      P.data.name = 'NGH'; P.data.level = 12;
      const LOOKS = [
        { hair: 'crown', face: 'lasereyes', shoes: 'flame', fx: 'aura', hairColor: 3 },
        { hair: 'cowboy', face: 'shades', shoes: 'rollers', fx: 'coins', hairColor: 1 },
        { hair: 'viking', face: 'skull', shoes: 'rocket', fx: 'fire', hairColor: 5 },
        { hair: 'afro', face: 'clown', shoes: 'rainbowkick', fx: 'rainbow', hairColor: 7 },
        { hair: 'halo', face: 'visor', shoes: 'iceboot', fx: 'galaxy', hairColor: 4 },
        { hair: 'headphones', face: 'goldtooth', shoes: 'goldboot', fx: 'lightning', hairColor: 6 },
        { hair: 'flamehair', face: 'ninja', shoes: 'neonkick', fx: 'neon', hairColor: 0 },
        { hair: 'santa', face: 'monocle', shoes: 'camo', fx: 'snow', hairColor: 2 },
      ];
      const wear = (i) => { P.data.look = Object.assign({}, P.data.look, LOOKS[i % LOOKS.length]); SFC.Menu.render(); };
      app.toMenu('home');
      SFC.Menu.go('char');
      wear(0);
      for (let i = 1; i < 12; i++) at(i * 0.3, () => wear(i));
    },
  };

  B.setup = (name) => { B.timeline.length = 0; B.done = 0; B.dir = null; B.focusFn = null; B.stepT = 0; SCENES[name](); B.timeline.sort((a, b) => a[0] - b[0]); };
})();
