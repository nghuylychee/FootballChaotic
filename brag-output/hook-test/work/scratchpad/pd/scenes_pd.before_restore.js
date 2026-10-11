/* pd scenes (PvP bodies B22-B31): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with pd_. Nothing here runs at load time except Object.assign.
   Matches are online-style 3v3: all six players sit in seats (so the game draws its own online rings: yellow = you,
   cyan = teammates, red = opponents, and the HUD shows P1..P6), each named and dressed as the made-up cast
   (portraits.py looks) with one signature ultimate. Seated players skip the game's AI loop, so the director runs the
   game's own AI functions for every seated player that isn't a puppet (runAI). Screens (room lobby, match intro, results,
   friends) are the game's own UI, filled with the cast's handles. CSS animations are pinned to scene time (syncCss) so
   the fake capture clock and the menus agree. */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, hush, mark, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;

  // handle -> team, look (as portraits.py), signature ultimate
  const CAST = {
    NGH: ['street_kings', { hair: 'spiky', face: 'none', fx: 'nofx', skin: 0, hairColor: 0 }, 'meteor_strike'],
    tuanbeo: ['street_kings', { hair: 'cap', face: 'mustache', fx: 'nofx', skin: 2, hairColor: 1 }, 'titan'],
    kaito_04: ['street_kings', { hair: 'headphones', face: 'shades', fx: 'nofx', skin: 1, hairColor: 0 }, 'lightning_dash'],
    zzz_mi: ['neon_strikers', { hair: 'bun', face: 'blush', fx: 'hearts', skin: 1, hairColor: 0 }, 'aura_farming'],
    bigboss99: ['neon_strikers', { hair: 'crown', face: 'goldtooth', fx: 'nofx', skin: 3, hairColor: 1 }, 'hundred_fists'],
    xX_vex_Xx: ['neon_strikers', { hair: 'mohawk', face: 'warpaint', fx: 'nofx', skin: 0, hairColor: 2 }, 'meteor_drop'],
    mochi: ['cyber_united', { hair: 'beanie', face: 'nerd', fx: 'nofx', skin: 1, hairColor: 1 }, 'clone_army'],
    DUKE: ['cyber_united', { hair: 'helmet', face: 'visor', fx: 'nofx', skin: 4, hairColor: 0 }, 'endless_tiki'],
    'panda.exe': ['cyber_united', { hair: 'bowl', face: 'cyborg', fx: 'nofx', skin: 0, hairColor: 0 }, 'meteor_drop'],
    ratking: ['underground_fc', { hair: 'bandana', face: 'scar', fx: 'smoke', skin: 2, hairColor: 0 }, 'hundred_fists'],
    jinx: ['underground_fc', { hair: 'longhair', face: 'eyepatch', fx: 'nofx', skin: 3, hairColor: 2 }, 'aura_farming'],
    m0le: ['underground_fc', { hair: 'afro', face: 'freckles', fx: 'nofx', skin: 4, hairColor: 1 }, 'titan'],
  };
  const SQUAD = {
    us: ['kaito_04', 'tuanbeo', 'NGH'], rivals: ['xX_vex_Xx', 'zzz_mi', 'bigboss99'],
    r1: ['panda.exe', 'DUKE', 'mochi'], r2: ['m0le', 'jinx', 'ratking'],
  };
  // the game-side look ({skin, hair, cut, face, shoes, fx}) built exactly like portraits.py
  const lookOf = (h, kitTeam) => {
    const [team, lk] = CAST[h], kit = SFC_CONFIG.teams.list[kitTeam || team].kit;
    const full = Object.assign({}, SFC_CONFIG.progression.defaultLook, lk);
    full.skin = SFC_CONFIG.teams.skins[lk.skin % SFC_CONFIG.teams.skins.length];
    full.cut = lk.hair;
    full.hair = kit.hair[lk.hairColor % kit.hair.length];
    return full;
  };

  // pin every CSS animation on the page to scene time (first seen = its start), so screens animate at 30 fps of scene time
  const seen = new WeakMap();
  const syncCss = () => {
    for (const a of document.getAnimations()) {
      if (!seen.has(a)) seen.set(a, B.t);
      try { a.pause(); a.currentTime = Math.max(0, (B.t - seen.get(a)) * 1000); } catch (e) { /* finished / detached */ }
    }
  };
  const cssEvery = (t1) => { for (let k = 0; k <= Math.ceil(t1 * 30); k++) at(k / 30, syncCss); };

  // menu screens: SFC.Audio cues are not game sfx -> log them so the soundtrack can play them (names audio.py knows)
  const logMenuAudio = () => {
    const A = SFC.Audio;
    if (A.__pd) return;
    A.__pd = true;
    const map = { tick: 'pass', reveal: 'upgrade', whoosh: 'whoosh', pick: 'pick', menu: 'pass', hit: 'hit', upgrade: 'upgrade' };
    for (const k of Object.keys(map)) {
      const f0 = A[k];
      if (typeof f0 !== 'function') continue;
      A[k] = function () { B.sfx.push({ t: B.t, name: map[k], arg: null }); return f0.apply(this, arguments); };
    }
  };
  // a stand-in network backend: only its id is read (Session.mine / isOwner); nothing is ever sent
  const offline = (id = 'host') => { SFC.NetCommon.use({ id, on() {}, send() {}, drop() {}, close() {}, host() {}, join() {} }); };

  // ---------- online-style 3v3 match ----------
  // a / b: handles of team 0 / team 1 (DEF, MID, FWD order); me: the local player (yellow ring, HUD card, YOU)
  function pvp(o = {}) {
    const home = o.home || 'street_kings', away = o.away || 'neon_strikers';
    const a = o.a || SQUAD.us, b = o.b || SQUAD.rivals, me = o.me || 'NGH';
    const roles = SFC_CONFIG.game.roles;
    SFC.Profile.data.name = me;
    const seats = [];
    [a, b].forEach((list, t) => list.forEach((h, i) => seats.push({
      team: t, idx: i, avatar: { name: h, look: lookOf(h, t ? away : home), ult: CAST[h][2], role: roles[i], level: 20 + ((h.length * 7) % 30) },
    })));
    const meSeat = seats.findIndex((s) => s.avatar.name === me);
    app.startMatch(Object.assign({
      home, away, difficulty: 'hard', online: true, humanTeam: seats[meSeat].team, seats, me: meSeat, noDraft: true,
    }, o.opts || {}));
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    if (o.score) { g.teams[0].score = o.score[0]; g.teams[1].score = o.score[1]; }
    if (o.left != null) g.elapsed = Math.max(0, g.cfg.match.duration - o.left);
    B.puppets = new Set();
    g.aiHook = (p) => B.puppets.has(p);
    hush();
    const P = {};
    for (const p of g.players) P[p.name] = p;
    return { g, P, A: g.teams[0].players, Bt: g.teams[1].players };
  }
  // the game's own AI step (systems/ai.js update loop body) for a seated player
  const aiStep = (dt, g, p) => {
    const AI = SFC.AI;
    p.ai.t -= dt;
    if (p.state === 'windup' && g.ball.owner && g.ball.owner.team !== p.team) {
      const c = g.ball.owner, d = U.norm(c.x - p.x, c.y - p.y);
      p.intent.mx = d.x; p.intent.my = d.y; p.intent.sprint = false; return;
    }
    if (p.state !== 'normal') { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; return; }
    const own = g.ball.owner;
    if (own === p) AI.carrier(dt, g, p);
    else if (own && own.team === p.team) AI.support(dt, g, p);
    else if (own) AI.defend(dt, g, p);
    else AI.loose(dt, g, p);
  };
  const runAI = (dt, g) => { for (const p of g.players) if (!B.puppets.has(p)) aiStep(dt, g, p); };
  const one = (g, re) => { const E = g.effects; E.V.comics = E.V.comics.filter((c) => !re.test(c.str || '')); };

  // ---------- screens ----------
  const menu = (page, me = 'NGH') => {
    SFC.Profile.data.name = me;
    logMenuAudio();
    app.toMenu('home');
    if (page) SFC.Menu.go(page);
    return SFC.Menu;
  };
  // private room lobby: members [[handle, slot]], the first is the host (= this machine)
  const pf = (h, kitTeam) => ({ name: h, level: 12 + ((h.charCodeAt(0) * 7 + h.length * 3) % 37), look: lookOf(h, kitTeam), ovr: 60 + ((h.charCodeAt(1) * 5) % 25), mate: null });
  function room(code, members, meId = 'host') {
    offline(meId);
    const S = SFC.Session;
    S.status = 'lobby'; S.role = 'host'; S.code = code; S.ranked = false;
    S.lobby = { members: members.map(([h, slot, id]) => ({ id: id || h, pf: pf(h), slot, away: 0 })), owner: members[0][2] || members[0][0], ground: -1 };
    return S;
  }

  // stun log for the cams: marks hit_<name>_<n> each time a player gets stunned
  const hitLog = (g) => {
    const n = {}, prev = {};
    return () => {
      for (const p of g.players) {
        if (p.state === 'stun' && prev[p.id] !== 'stun') { n[p.name] = (n[p.name] || 0) + 1; mark(`hit_${p.name}_${n[p.name]}`); }
        prev[p.id] = p.state;
      }
    };
  };
  // keep trying an ultimate from scene time t on (it waits while the player is busy / in the air)
  const ultAt = (g, p, t, key) => { let done = false; p.res.ult = 1; return (tt) => { if (!done && tt >= t) { done = g.cores.activateUltimate(p); if (done) mark(key || 'ult_' + p.name); } return done; }; };

  // results screen of a finished room match (the game's own end screen + reward panel; buttons as for the room owner)
  function results(o) {
    const { g, P } = pvp({ score: o.score, left: 0.5 });
    B.puppets = new Set(g.players);
    for (const h in o.cores) for (const id of o.cores[h]) g.cores.add(P[h], id);
    offline('host');
    SFC.Session.lobby = { members: [], owner: 'host', ground: -1 };
    Object.defineProperty(SFC.UI, 'roomMatch', { get: () => true, configurable: true });
    logMenuAudio();
    at(0.03, () => { g.end(); mark('end'); });
    B.dir = (dt, g) => { for (const p of g.players) still(p); };
    cssEvery(o.secs || 6);
    B.focusFn = () => ({ x: 320, y: 180 });
    return g;
  }
  const CORES_A = { NGH: ['fire_shot', 'heavy_boot', 'counter_attack'], tuanbeo: ['fist_storm', 'iron_body'], kaito_04: ['speed_demon', 'phantom_step', 'one_touch'],
    zzz_mi: ['maestro', 'banana_kick'], bigboss99: ['iron_fist', 'ground_slam'], xX_vex_Xx: ['shadow_clone', 'emp_trap'] };

  Object.assign(B.SCENES, {
    /* test: a plain online-style 3v3, everyone on the game's AI (rings / HUD / looks check) */
    pd_test() {
      const { g, P } = pvp({});
      B.dir = (dt, g) => runAI(dt, g);
      B.focusFn = () => g.ball;
    },

    /* B22 PRIVATE ROOM: the game's lobby, ROOM CODE, the squad already in; the rivals join one by one, START */
    pd_room() {
      const M = menu(null);
      const S = room('K7P2X9Q', [['NGH', 2, 'host'], ['tuanbeo', 1], ['kaito_04', 0], ['zzz_mi', 4]]);
      M.go('lobby', '');
      const join = (h, slot, t) => at(t, () => {
        S.lobby.members.push({ id: h, pf: pf(h), slot, away: 0 });
        M.go('lobby', SFC.OnlineUI.TEXT.joined(h)); SFC.Audio.pick(); mark('join_' + h);
      });
      join('bigboss99', 5, B.pdJoin1 || 0.5);
      join('xX_vex_Xx', 3, B.pdJoin2 || 1.0);
      at(B.pdStart || 1.6, () => { mark('start'); SFC.Audio.upgrade(); });
      cssEvery(3);
      B.focusFn = () => ({ x: 320, y: 180 });
    },

    /* B22 KICKOFF BRAWL: whistle, NGH taps it forward... and all six forget the ball: a punch-up in the centre circle while
       the ball rolls on its own into the empty net */
    pd_brawl() {
      const { g, P } = pvp({});
      const b = g.ball, G = g.attackGoal(0), all = g.players, me = P.NGH;
      B.puppets = new Set(all);
      place(me, 318, 203, 0); give(g, me);
      const spots = { kaito_04: [250, 150], tuanbeo: [262, 262], xX_vex_Xx: [392, 150], zzz_mi: [380, 262], bigboss99: [356, 203] };
      for (const h in spots) place(P[h], spots[h][0], spots[h][1]);
      let tapped = false;
      const next = {}, log = hitLog(g), kb = {};
      at(0.05, () => { g.sfx('whistle'); mark('whistle'); });
      B.dir = (dt, g, t) => {
        log();
        // softer hits (half the knockback) keep the punch-up in the centre circle
        for (const p of all) {
          if (p.state === 'stun' && !kb[p.id]) { kb[p.id] = 1; p.kbx *= B.pdKb || 0.5; p.kby *= B.pdKb || 0.5; }
          if (p.state !== 'stun') kb[p.id] = 0;
        }
        if (!tapped) {
          for (const p of all) { still(p); if (p !== me) face(p, me); }
          if (t > 0.35) { tapped = true; face(me, G); b.owner = null; b.kick(me, B.pdTap || 300, (G.y + 4 - b.y) * 1.1, 0); mark('tap'); for (const p of all) b.noPickup.set(p.id, 99); }
          return;
        }
        if (t < 0.55) return;
        for (const p of all) {
          if (p.state !== 'normal') continue;
          if (B.marks.goal != null && t > (B.marks.goal - 0.15)) { still(p); continue; }
          const opp = g.teams[1 - p.team].players.filter((q) => q.state !== 'stun' || U.dist(p, q) < 40);
          const q = (opp.length ? opp : g.teams[1 - p.team].players).reduce((a, c) => (U.dist(p, c) < U.dist(p, a) ? c : a));
          const d = U.dist(p, q);
          if (d > 22) { steer(p, q.x, q.y, true); continue; }
          still(p); face(p, q);
          if (t > (next[p.id] || 0)) {
            p.cd.light = p.cd.hard = 0;
            const hard = (p.id * 7 + Math.floor(t * 4)) % 3 !== 0;
            if (hard ? Act.hardAttack(g, p) : Act.lightAttack(g, p)) next[p.id] = t + 0.55 + (p.id % 3) * 0.12;
          }
        }
      };
      B.focusFn = () => ({ x: 400, y: 200 });
    },

    /* B24 round 1: bigboss99 goes TITAN with the ball; tuanbeo answers with HUNDRED FISTS... 20 HIT, the giant doesn't move,
       then walks through him (BONK) */
    pd_clash_fists() {
      const { g, P } = pvp({ me: 'tuanbeo' });
      const Bb = P.bigboss99, T = P.tuanbeo, G = g.attackGoal(0);
      B.puppets = new Set(g.players);
      place(T, 300, 204, 0); place(Bb, 380, 200, PI);
      place(P.NGH, 230, 140, 0); place(P.kaito_04, 220, 268, 0); place(P.zzz_mi, 450, 140, PI); place(P.xX_vex_Xx, 470, 262, PI);
      give(g, T);
      T.res.ult = 1; Bb.res.ult = 1;
      let titan = false, fists = false;
      const log = hitLog(g);
      B.dir = (dt, g, t) => {
        log();
        for (const p of [P.NGH, P.kaito_04, P.zzz_mi, P.xX_vex_Xx]) { still(p); face(p, T); }
        if (!titan && t > 0.3) { titan = g.cores.activateUltimate(T); if (titan) mark('titan'); }
        if (titan && !fists) { if (Bb.state === 'normal') { still(Bb); face(Bb, T); } if (T.state === 'normal') { still(T); face(T, Bb); } }
        if (titan && !fists && t > (B.pdFistsT || 1.5)) { fists = g.cores.activateUltimate(Bb); if (fists) mark('fists'); }
        if (fists && T.state === 'normal' && B.t - B.marks.fists > 2.15) { mark('walk'); steer(T, Bb.x, Bb.y, true); }
        else if (fists) still(T);
      };
      B.focusFn = () => ({ x: (Bb.x + T.x) / 2, y: (Bb.y + T.y) / 2 - 10 });
    },

    /* B24 round 2: bigboss99 TITAN in his own box (keeper gloves); NGH fires METEOR SHOT at him */
    pd_clash_meteor() {
      const { g, P } = pvp({ me: 'tuanbeo' });
      const Bb = P.bigboss99, me = P.NGH, G = g.attackGoal(0);
      B.puppets = new Set(g.players);
      place(Bb, G.x - 30, G.y, PI); place(me, G.x - 190, G.y + 10, 0);
      place(P.tuanbeo, G.x - 300, G.y - 70, 0); place(P.kaito_04, G.x - 280, G.y + 80, 0); place(P.zzz_mi, G.x - 120, G.y - 60, PI); place(P.xX_vex_Xx, G.x - 130, G.y + 75, PI);
      give(g, me);
      Bb.res.ult = 1; me.res.ult = 1;
      let titan = false, met = false;
      B.dir = (dt, g, t) => {
        for (const p of [P.tuanbeo, P.kaito_04, P.zzz_mi, P.xX_vex_Xx]) { still(p); face(p, me); }
        if (!titan && t > 0.2) { titan = g.cores.activateUltimate(Bb); if (titan) mark('titan'); }
        if (Bb.state === 'normal') { steer(Bb, G.x - 26, G.y + (g.ball.y - G.y) * 0.5, false); face(Bb, me); }
        if (!met) { still(me); face(me, G); }
        if (titan && !met && t > (B.pdMetT || 1.3)) { met = g.cores.activateUltimate(me); if (met) mark('meteor'); }
      };
      B.focusFn = () => (met && B.t - B.marks.meteor > 0.9 ? { x: (g.ball.x + Bb.x) / 2, y: Bb.y - 10 } : { x: (me.x + Bb.x) / 2, y: me.y - 10 });
    },
  });
})();
