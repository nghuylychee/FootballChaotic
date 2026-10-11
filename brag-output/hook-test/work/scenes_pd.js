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
       the tap trickles all the way into the empty net (a real kick on ground friction; nobody is in the box, so nobody keeps) */
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

    /* B24 CLASH: tuanbeo (YOU) goes TITAN with the ball; bigboss99 answers with HUNDRED FISTS... 20 HIT, the giant doesn't
       move (Titan is stun immune), then walks through him (BONK) */
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

    /* B24 setup: the game's match intro (online versus), every card shows the player's signature ultimate */
    pd_intro() {
      SFC_CONFIG.intro.enabled = true;
      logMenuAudio();
      const { g } = pvp({ me: B.pdMe || 'tuanbeo' });
      B.puppets = new Set(g.players);
      cssEvery(6.5);
      B.focusFn = () => ({ x: 320, y: 180 });
    },

    /* B27 / B31 results screens (room match, owner's buttons) */
    pd_res_win() { results({ score: [3, 1], cores: CORES_A }); },
    pd_res_lose() { results({ score: [1, 2], cores: CORES_A }); },
    pd_res_win2() { results({ score: [3, 2], cores: CORES_A, secs: 3.5 }); },
    pd_res_lose2() { results({ score: [2, 3], cores: CORES_A, secs: 3.5 }); },
    pd_res_win3() { results({ score: [4, 3], cores: CORES_A, secs: 3.5 }); },

    /* B27 the winner: 1-1, 0:03 left, NGH's Fireball from outside the box -> GOAL x2 (FINAL PUSH) -> 3-1 */
    pd_win() {
      const { g, P } = pvp({ score: [1, 1], left: 3.2 });
      g.finalPush = true;   // already in the last 30 s (goals x2): no FINAL PUSH banner at the cut
      const b = g.ball, G = g.attackGoal(0), me = P.NGH, V = P.xX_vex_Xx;
      for (const h in CORES_A) for (const id of CORES_A[h]) g.cores.add(P[h], id);
      B.puppets = new Set(g.players);
      place(me, G.x - 190, G.y - 30, 0); place(V, G.x - 26, G.y, PI); place(P.zzz_mi, G.x - 110, G.y + 70, PI); place(P.bigboss99, G.x - 240, G.y + 40, PI);
      place(P.tuanbeo, G.x - 300, G.y - 80, 0); place(P.kaito_04, G.x - 260, G.y + 90, 0);
      give(g, me); noAttack(V, P.zzz_mi, P.bigboss99);
      offline('host'); SFC.Session.lobby = { members: [], owner: 'host', ground: -1 };
      Object.defineProperty(SFC.UI, 'roomMatch', { get: () => true, configurable: true });
      let shot = false, ended = false;
      cssEvery(7);
      B.dir = (dt, g, t) => {
        steer(P.zzz_mi, G.x - 120, G.y + 60, false); steer(P.bigboss99, me.x - 30, me.y + 30, true);
        if (shot) for (const q of [P.zzz_mi, P.bigboss99, V]) b.noPickup.set(q.id, 99);
        if (V.state === 'normal' && !shot) steer(V, G.x - 26, G.y + (b.y - G.y) * 0.4, false);
        if (!shot) { me.intent.mx = 0.4; me.intent.my = 0.15; if (t > (B.pdShotT || 0.5)) { face(me, G); if (Act.shoot(g, me, 1, 0.6) !== false && b.owner !== me) { shot = true; mark('shot'); b.noPickup.set(V.id, 99); g.later(0.05, () => Act.dive(g, V, -1)); } } return; }
        still(me);
        if (!ended && B.marks.goal != null && B.t - B.marks.goal > (B.pdFt || 0.9)) { ended = true; g.end(); mark('ft'); }
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 70), y: b.y } : me);
    },

    /* B23 friends: jinx's PLAY screen, friends panel open; ratking and m0le send friend requests, she accepts both */
    pd_friends() {
      const SO = SFC.Social;
      Object.assign(SFC.Profile.data.look, { hair: 'longhair', face: 'eyepatch', fx: 'nofx', skin: 3, hairColor: 2 }); SFC.Profile.data.ult = CAST.jinx[2];
      if (!SO.data) SO.load();
      SO.data.friends = []; SO.data.incoming = []; SO.data.sent = []; SO.party = []; SO.incomingT = 1e12; SO.status = {};
      const M = menu(null, 'jinx');
      M.go('party'); M.friendsOpen = true; M.render();
      const req = (h, t) => at(t, () => {
        SO.data.incoming.push({ name: h, at: Date.now() });
        SO.toast(SFC.t('{name} sent you a friend request', { name: h }));
        const i = M.items().findIndex((x) => x.kind === 'freq');
        if (i >= 0) { M.sel = i; M.frAct = 0; }
        SO.changed(); SFC.Audio.pick(); mark('req_' + h);
      });
      const ok = (h, t) => at(t, () => {
        SO.acceptRequest(h);
        const f = SO.data.friends.find((x) => x.name === h);
        if (f) { f.look = Object.assign({ shoes: 'kicks' }, CAST[h][1]); delete SO.typing[f.id]; }
        const i = M.items().findIndex((x) => x.kind === 'freq');
        if (i >= 0) { M.sel = i; M.frAct = 0; }
        M.render(); SFC.Audio.upgrade(); mark('ok_' + h);
      });
      req('ratking', B.pdReq1 || 0.3); req('m0le', B.pdReq2 || 0.75);
      ok('ratking', B.pdOk1 || 1.35); ok('m0le', B.pdOk2 || 1.85);
      cssEvery(4);
      B.focusFn = () => ({ x: 480, y: 180 });
    },

    /* B23 chemistry: three strangers (Underground FC) vs Cyber United: ratking punches the ball off mochi, one-touch to jinx,
       one-touch to m0le, first-time finish */
    pd_chem() {
      const { g, P } = pvp({ home: 'underground_fc', away: 'cyber_united', a: SQUAD.r2, b: SQUAD.r1, me: 'jinx' });
      const b = g.ball, G = g.attackGoal(0);
      const R = P.ratking, J = P.jinx, M0 = P.m0le, Mo = P.mochi, Du = P.DUKE, Pa = P['panda.exe'];
      B.puppets = new Set(g.players);
      place(Mo, 330, 230, PI); place(R, 280, 226, 0); place(J, 330, 150, 0); place(M0, 250, 285, 0);
      place(Du, G.x - 26, G.y, PI); place(Pa, 420, 190, PI);
      give(g, Mo);
      noAttack(Mo, Du, Pa);
      g.cores.add(R, 'iron_fist'); R.res.guard = 2;   // the game's Iron Fist: with Guard, punches always steal
      let step = 0, shot = false;
      const log = hitLog(g);
      B.dir = (dt, g, t) => {
        log();
        steer(Du, G.x - 26, G.y + (b.y - G.y) * 0.4, false);
        if (step === 0) {
          // mochi dribbles into him
          Mo.intent.mx = -0.55; Mo.intent.my = -0.05; steer(R, Mo.x - 18, Mo.y, true); steer(J, 360, 150, false); steer(M0, 300, 280, false); steer(Pa, 400, 200, false);
          if (t > 0.45 && U.dist(R, Mo) < 26) { face(R, Mo); R.cd.light = 0; if (Act.lightAttack(g, R)) { step = 1; mark('punch'); } }
          return;
        }
        if (step >= 1 && !shot) for (const q of [Mo, Pa, Du]) b.noPickup.set(q.id, 0.3);
        if (step === 1) {
          if (b.owner === Mo) { if (R.state === 'normal') { face(R, Mo); R.cd.light = 0; Act.lightAttack(g, R); } Mo.intent.mx = -0.3; return; }   // HOLD: again
          // the ball pops loose: ratking takes it
          for (const q of [J, M0]) b.noPickup.set(q.id, 0.3);
          steer(R, b.x, b.y, true); steer(J, 400, 150, true); steer(M0, 380, 268, true); steer(Pa, J.x - 20, J.y + 30, false);
          if (b.owner === R) { step = 2; mark('own'); }
          return;
        }
        if (step === 2) {
          steer(J, 420, 150, true); steer(M0, 420, 262, true); steer(Pa, 400, 185, false);
          if (B.t - B.marks.own > 0.15) { Act.passTo(g, R, J, 'ground'); step = 3; mark('pass1'); }
          return;
        }
        if (step === 3) {
          still(R); steer(M0, 470, 250, true); steer(Pa, J.x + 10, J.y + 20, true);
          if (b.owner === J) { step = 4; mark('recv1'); }
          else steer(J, b.x, b.y, true);
          return;
        }
        if (step === 4) {
          steer(M0, 490, 240, true);
          if (B.t - B.marks.recv1 > 0.06) { Act.passTo(g, J, M0, 'ground'); step = 5; mark('pass2'); }
          return;
        }
        if (step === 5) {
          still(J); steer(Pa, M0.x - 30, M0.y, true);
          if (b.owner === M0) { step = 6; mark('recv2'); } else steer(M0, b.x, b.y, true);
          return;
        }
        if (step === 6 && !shot && B.t - B.marks.recv2 > 0.06) {
          face(M0, G); Act.shoot(g, M0, 0.8, -0.7); shot = true; mark('shot');
          b.noPickup.set(Du.id, 99); for (const q of [Mo, Pa]) b.noPickup.set(q.id, 99);
          g.later(0.05, () => { if (Du.state === 'normal') Act.dive(g, Du, 1); });
        }
        if (shot) { still(M0); still(J); still(R); }
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 60), y: b.y } : step >= 2 ? b : { x: (R.x + Mo.x) / 2, y: R.y });
    },

    /* B26 save: their striker breaks on our goal; tuanbeo backs into our box (keeper gloves come on), SAVE! */
    pd_keep_save() {
      const { g, P } = pvp({});
      const b = g.ball, G0 = g.attackGoal(1), T = P.tuanbeo, S = P.bigboss99;
      B.puppets = new Set(g.players);
      place(S, G0.x + 230, G0.y - 20, PI); place(T, G0.x + 92, G0.y - 4, PI); place(P.kaito_04, G0.x + 290, G0.y + 60, PI); place(P.NGH, G0.x + 320, G0.y - 70, PI);
      place(P.zzz_mi, G0.x + 300, G0.y + 90, PI); place(P.xX_vex_Xx, G0.x + 420, G0.y - 30, PI);
      give(g, S); noAttack(S, T);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(P.kaito_04, S.x + 30, S.y + 20, true); steer(P.NGH, S.x + 40, S.y - 30, true); steer(P.zzz_mi, S.x + 60, G0.y + 80, false); steer(P.xX_vex_Xx, G0.x + 380, G0.y - 30, false);
        if (!shot) {
          S.intent.mx = -0.7; S.intent.my = 0.05; S.intent.sprint = false;
          // tuanbeo backs into the box
          if (T.x > G0.x + 34) { T.intent.mx = -0.55; T.intent.my = (G0.y - 4 - T.y) * 0.05; } else { still(T); }
          face(T, S);
          if (T.keeper && B.marks.box == null) mark('box');
          if (t > (B.pdShotT || 1.45)) { face(S, { x: G0.x, y: G0.y - 4 }); Act.shoot(g, S, B.pdCharge || 0.9, B.pdAim != null ? B.pdAim : 0.15); shot = true; mark('shot'); }
          return;
        }
        still(S); if (T.state === 'normal' && !b.owner) steer(T, b.x, b.y, false); else still(T);
        if (b.owner === T && B.marks.save == null) mark('save');
      };
      B.focusFn = () => ({ x: (T.x + S.x) / 2 + 10, y: (T.y + S.y) / 2 });
    },

    /* B26 all three in the box: three keepers (gloves on all of them), the shot goes top corner, all three dive the other way */
    pd_keep_three() {
      const { g, P } = pvp({});
      const b = g.ball, G0 = g.attackGoal(1), Z = P.zzz_mi, us = [P.kaito_04, P.tuanbeo, P.NGH];
      B.puppets = new Set(g.players);
      place(Z, G0.x + 240, G0.y + 30, PI);
      place(P.kaito_04, G0.x + 140, G0.y - 50, PI); place(P.tuanbeo, G0.x + 150, G0.y + 10, PI); place(P.NGH, G0.x + 160, G0.y + 64, PI);
      place(P.bigboss99, G0.x + 330, G0.y - 60, PI); place(P.xX_vex_Xx, G0.x + 400, G0.y + 70, PI);
      give(g, Z); noAttack(Z, ...us);
      const spots = [[G0.x + 30, G0.y - 22], [G0.x + 22, G0.y + 4], [G0.x + 34, G0.y + 28]];
      let shot = false, dove = false;
      B.dir = (dt, g, t) => {
        steer(P.bigboss99, G0.x + 260, G0.y - 60, false); steer(P.xX_vex_Xx, G0.x + 330, G0.y + 70, false);
        if (!shot) {
          Z.intent.mx = -0.45; Z.intent.my = -0.05;
          us.forEach((p, i) => { steer(p, spots[i][0], spots[i][1], true); face(p, Z); });
          if (us.every((p) => p.keeper) && B.marks.box == null) mark('box');
          if (t > (B.pdShotT || 1.7)) { face(Z, { x: G0.x, y: G0.y - 34 }); Act.shoot(g, Z, 0.75, -0.95); shot = true; mark('shot'); for (const p of us) b.noPickup.set(p.id, 99); }
          return;
        }
        still(Z);
        if (!dove && B.t - B.marks.shot > 0.08) { dove = true; mark('dive'); for (const p of us) { p.state = 'normal'; Act.dive(g, p, 1); } }
      };
      B.focusFn = () => (shot ? { x: G0.x + 70, y: G0.y } : { x: (Z.x + G0.x) / 2 + 30, y: G0.y });
    },

    /* B25 comeback, goal 1: 0-2, punch steal from zzz_mi, NGH runs on and scores (1-2) */
    pd_cb1() {
      const { g, P } = pvp({ score: [0, 2], left: 101 });
      const b = g.ball, G = g.attackGoal(0), me = P.NGH, Z = P.zzz_mi, K = P.xX_vex_Xx;
      B.puppets = new Set(g.players);
      place(Z, 400, 200, PI); place(me, 360, 196, 0); place(K, G.x - 26, G.y, PI); place(P.bigboss99, 470, 260, PI);
      place(P.tuanbeo, 300, 150, 0); place(P.kaito_04, 250, 260, 0);
      give(g, Z); noAttack(Z, K, P.bigboss99);
      g.cores.add(me, 'iron_fist'); me.res.guard = 2;   // the game's Iron Fist: with Guard, punches always steal
      let stage = 0, shot = false;
      const log = hitLog(g);
      B.dir = (dt, g, t) => {
        log();
        steer(K, G.x - 26, G.y + (b.y - G.y) * 0.4, false); steer(P.tuanbeo, me.x - 40, 150, false); steer(P.kaito_04, me.x - 70, 260, false);
        if (stage === 0) { Z.intent.mx = -0.4; steer(me, Z.x - 16, Z.y, false); steer(P.bigboss99, 450, 250, false);
          if (t > 0.35 && U.dist(me, Z) < 24) { face(me, Z); me.cd.light = 0; if (Act.lightAttack(g, me)) { stage = 1; mark('punch'); } } return; }
        if (stage === 1) {
          if (b.owner === Z) { if (me.state === 'normal') { face(me, Z); me.cd.light = 0; Act.lightAttack(g, me); } return; }   // HOLD: punch again
          for (const q of [Z, P.bigboss99, K, P.tuanbeo, P.kaito_04]) b.noPickup.set(q.id, 0.6); steer(me, b.x, b.y, true); if (b.owner === me) { stage = 2; mark('own'); } return; }
        if (stage === 2) { steer(P.bigboss99, me.x - 20, me.y + 26, true); b.noPickup.set(P.bigboss99.id, 99); b.noPickup.set(Z.id, 99);
          if (G.x - me.x > 150) { steer(me, G.x - 140, G.y - 10, true); return; }
          face(me, G); if (Act.shoot(g, me, 0.8, -0.7) === false || b.owner === me) return;
          shot = true; stage = 3; mark('shot'); b.noPickup.set(K.id, 99); g.later(0.05, () => Act.dive(g, K, 1)); return; }
        still(me);
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 70), y: b.y } : me);
    },

    /* B25 comeback, goal 2: 1-2, kaito LIGHTNING DASH through two of them, finish (2-2) */
    pd_cb2() {
      const { g, P } = pvp({ score: [1, 2], left: 64 });
      const b = g.ball, G = g.attackGoal(0), K = P.kaito_04, V = P.xX_vex_Xx;
      B.puppets = new Set(g.players);
      place(K, 330, 205, 0); place(P.zzz_mi, 420, 195, PI); place(P.bigboss99, 470, 215, PI); place(V, G.x - 26, G.y, PI);
      place(P.NGH, 300, 140, 0); place(P.tuanbeo, 250, 270, 0);
      give(g, K); noAttack(P.zzz_mi, P.bigboss99, V);
      let dash = false, shot = false;
      const fire = ultAt(g, K, B.pdDashT || 0.4, 'dash');
      B.dir = (dt, g, t) => {
        steer(V, G.x - 26, G.y + (b.y - G.y) * 0.4, false); steer(P.NGH, 380, 140, true); steer(P.tuanbeo, 320, 270, false);
        for (const o of [P.zzz_mi, P.bigboss99]) if (o.state === 'normal') { steer(o, K.x + 20, K.y, false); }
        if (!dash) { K.intent.mx = 0.3; dash = fire(t); return; }
        if (shot || K.state !== 'normal' || b.owner !== K) { if (!shot && !b.owner && K.state === 'normal') steer(K, b.x, b.y, true); else still(K); return; }
        if (G.x - K.x > 130) { steer(K, G.x - 120, G.y + 10, true); return; }
        face(K, G); Act.shoot(g, K, 0.9, -0.8); shot = true; mark('shot'); b.noPickup.set(V.id, 99); g.later(0.05, () => Act.dive(g, V, 1));
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 70), y: b.y } : K);
    },

    /* B25 comeback, goal 3: 2-2, NGH METEOR SHOT, the net goes up in flames (3-2) */
    pd_cb3() {
      const { g, P } = pvp({ score: [2, 2], left: 37 });
      const b = g.ball, G = g.attackGoal(0), me = P.NGH, V = P.xX_vex_Xx;
      B.puppets = new Set(g.players);
      place(me, G.x - 210, G.y + 6, 0); place(V, G.x - 26, G.y, PI); place(P.zzz_mi, G.x - 120, G.y - 50, PI); place(P.bigboss99, G.x - 110, G.y + 60, PI);
      place(P.tuanbeo, G.x - 300, G.y - 70, 0); place(P.kaito_04, G.x - 320, G.y + 80, 0);
      give(g, me); noAttack(V, P.zzz_mi, P.bigboss99);
      let met = false;
      const fire = ultAt(g, me, B.pdMetT || 0.35, 'meteor');
      B.dir = (dt, g, t) => {
        for (const o of [P.zzz_mi, P.bigboss99]) if (o.state === 'normal') steer(o, me.x + 40, o.y, false);
        steer(P.tuanbeo, G.x - 260, G.y - 70, false); steer(P.kaito_04, G.x - 280, G.y + 80, false);
        if (!met) { still(me); face(me, G); met = fire(t); }
        if (met && b.fx && b.fx.meteor && B.marks.goal == null) {
          // the keeper dives out of it; the meteor stays on its line into the middle of the goal
          b.noPickup.set(V.id, 99); if (B.marks.fly == null) { mark('fly'); Act.dive(g, V, -1); }
          const sp = Math.hypot(b.vx, b.vy), d = U.norm(G.x + 10 - b.x, G.y + 4 - b.y); b.vx = d.x * sp; b.vy = d.y * sp;
        }
        if (V.state === 'normal' && B.marks.fly == null) steer(V, G.x - 26, G.y, false);
      };
      B.focusFn = () => (met && B.t - B.marks.meteor > 0.9 ? { x: Math.min(b.x, G.x - 80), y: b.y - (b.z || 0) * 0.5 } : me);
    },

    /* B28 rage quit: 4-0, NGH dropkicks xX_vex_Xx off the ball; "xX_vex_Xx LEFT · AI takes over" (the game's own banner);
       the AI in his boots gets up, dropkicks NGH off the ball, skips past tuanbeo and scores (4-1) */
    pd_rage() {
      const { g, P } = pvp({ score: [4, 0], left: 78 });
      const b = g.ball, G0 = g.attackGoal(1), V = P.xX_vex_Xx, me = P.NGH, T = P.tuanbeo, K = P.kaito_04;
      B.puppets = new Set(g.players);
      place(V, 360, 190, PI); place(me, 300, 200, 0); place(T, 230, 165, 0); place(K, G0.x + 30, G0.y, 0);
      place(P.zzz_mi, 420, 120, PI); place(P.bigboss99, 450, 270, PI);
      give(g, V); noAttack(V, T, K);
      let stage = 0, shot = false;
      const log = hitLog(g), vSeat = g.seats.findIndex((s) => s.p === V);
      at(B.pdLeftT || 1.5, () => {
        g.seats[vSeat].gone = true;
        SFC.Session.emit('player', { kind: 'left', name: V.name });
        mark('left');
      });
      B.dir = (dt, g, t) => {
        log();
        steer(P.zzz_mi, 400, 130, false); steer(P.bigboss99, 420, 260, false);
        if (K.state === 'normal') steer(K, G0.x + 26, G0.y + (b.y - G0.y) * 0.4, false);
        if (stage === 0) {
          V.intent.mx = -0.35; V.intent.my = 0.02;
          if (t > 0.3 && U.dist(me, V) < 34) { face(me, V); me.cd.hard = 0; if (Act.hardAttack(g, me)) { stage = 1; mark('kick'); } }
          return;
        }
        if (stage === 1) {
          b.noPickup.set(V.id, 0.4);
          if (me.state === 'normal') { if (b.owner !== me) steer(me, b.x, b.y, true); else { me.intent.mx = -0.25; me.intent.my = 0; } }
          for (const q of [T, K, P.zzz_mi, P.bigboss99]) b.noPickup.set(q.id, 0.3);
          if (b.owner === me && B.marks.left != null && B.t - B.marks.left > (B.pdWake || 0.45)) { stage = 2; mark('ai'); V.state = V.state === 'stun' ? 'normal' : V.state; V.stateT = 0; }
          else if (V.state === 'normal') still(V);
          return;
        }
        if (stage === 2) {
          // the AI wakes up: straight at NGH, dropkick, ball
          if (b.owner === me) { me.intent.mx = -0.3; me.intent.my = 0.05; }
          if (B.marks.punch == null && U.dist(V, me) > 30) steer(V, me.x + 20, me.y, true);
          else if (B.marks.punch == null && V.state === 'normal') { face(V, me); V.cd.hard = 0; if (Act.hardAttack(g, V)) mark('punch'); }
          else if (V.state === 'normal' || V.state === 'windup') face(V, me);
          if (b.owner !== me && B.marks.punch != null) { stage = 3; mark('steal'); }
          return;
        }
        if (stage >= 3 && !shot) for (const q of [me, T, K, P.zzz_mi, P.bigboss99]) b.noPickup.set(q.id, 0.3);
        if (stage === 3) {
          steer(V, b.x, b.y, true); if (b.owner === V) { stage = 4; mark('vown'); } return;
        }
        if (stage === 4) {
          steer(T, V.x - 16, V.y, true);
          if (U.dist(V, T) < 30 && B.marks.dodge == null) { if (Act.skill(g, V, -0.5, 1) !== false) mark('dodge'); return; }
          if (V.x - G0.x > 120) { steer(V, G0.x + 110, G0.y - 20, true); return; }
          face(V, G0); Act.shoot(g, V, 0.95, -0.85); shot = true; stage = 5; mark('shot');
          b.noPickup.set(K.id, 99); g.later(0.05, () => Act.dive(g, K, 1));
          return;
        }
        still(V); still(T);
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, G0.x + 70), y: b.y } : { x: (V.x + me.x) / 2, y: V.y });
    },

    /* B29 tiki-taka: kaito -> tuanbeo -> NGH -> kaito -> tuanbeo -> NGH, one touch each, up the pitch, finish */
    pd_tiki() {
      const { g, P } = pvp({});
      const b = g.ball, G = g.attackGoal(0), K = P.kaito_04, T = P.tuanbeo, N = P.NGH, Vx = P.xX_vex_Xx, Z = P.zzz_mi, Bb = P.bigboss99;
      B.puppets = new Set(g.players);
      place(K, 205, 210, 0); place(T, 262, 150, 0); place(N, 285, 262, 0);
      place(Z, 330, 175, PI); place(Bb, 345, 245, PI); place(Vx, G.x - 26, G.y, PI);
      give(g, K); noAttack(Z, Bb, Vx);
      // passer -> receiver, and where the receiver takes it
      const chain = B.pdChain || [[K, T, 300, 142], [T, N, 345, 262], [N, K, 372, 206], [K, T, 432, 150], [T, N, 478, 238]];
      let k = 0, shot = false, recvT = 0.25, inFlight = null;
      const spotOf = (p) => { for (let j = k; j < chain.length; j++) if (chain[j][1] === p) return [chain[j][2], chain[j][3]]; return null; };
      B.dir = (dt, g, t) => {
        steer(Vx, G.x - 26, G.y + (b.y - G.y) * 0.4, false);
        // defenders always one step late
        for (const o of [Z, Bb]) { const tgt = b.owner || b; steer(o, tgt.x - 30, tgt.y + (o === Z ? -16 : 16), false); b.noPickup.set(o.id, 0.2); }
        for (const p of [K, T, N]) {
          if (p === b.owner) { still(p); continue; }
          if (inFlight === p && !b.owner) { steer(p, b.x, b.y, true); continue; }
          const sp = spotOf(p);
          if (sp) steer(p, sp[0], sp[1], true); else still(p);
        }
        if (inFlight && b.owner === inFlight) { mark('recv' + k); recvT = t; inFlight = null; }
        if (k < chain.length) {
          const [a, r, x, y] = chain[k];
          if (b.owner === a && !inFlight && t > recvT + 0.14 && (Math.hypot(r.x - x, r.y - y) < 16 || t > recvT + 0.6)) {
            face(a, r);
            if (Act.passTo(g, a, r, 'ground') !== false && b.owner !== a) { k++; inFlight = r; mark('pass' + k); }
          }
          return;
        }
        if (!shot && !inFlight && b.owner === N && t > recvT + 0.1) {
          face(N, G); if (Act.shoot(g, N, 0.85, -0.75) === false || b.owner === N) return;
          shot = true; mark('shot'); b.noPickup.set(Vx.id, 99); g.later(0.05, () => Act.dive(g, Vx, 1));
        }
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 80), y: b.y } : { x: b.x + 30, y: b.y });
    },

    /* B30 six players, everything at once: everyone on the AI, a bomb ball, and all six signature ultimates in a row */
    pd_chaos6() {
      const { g, P } = pvp({});
      B.puppets = new Set();
      g.cores.add(P.zzz_mi, 'bomb_ball'); g.cores.add(P.kaito_04, 'chaos_ball');
      g.cores.st(P.zzz_mi, 'bomb_ball').t = B.pdBomb || 10.6;
      for (const p of g.players) p.res.ult = 1;
      const order = B.pdOrder || [['tuanbeo', 0.25], ['bigboss99', 0.65], ['xX_vex_Xx', 1.05], ['kaito_04', 1.45], ['zzz_mi', 1.85], ['NGH', 2.25]];
      const fires = order.map(([h, t]) => ultAt(g, P[h], t, 'ult_' + h));
      const log = hitLog(g);
      B.dir = (dt, g, t) => {
        runAI(dt, g); log();
        order.forEach(([h, t1], i) => {
          // still knocked down well after his turn: he gets up a moment early so all six really go off
          const p = P[h];
          if (B.marks['ult_' + h] == null && t > t1 + 0.35 && p.state === 'stun' && p.airZ <= 0) { p.state = 'normal'; p.stateT = 0; }
          fires[i](t);
        });
      };
      B.focusFn = () => g.ball;
    },
  });
})();
