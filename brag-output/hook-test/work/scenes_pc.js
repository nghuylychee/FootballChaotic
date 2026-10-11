/* pc scenes (PvP bodies B12-B21): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with pc_. Nothing here runs at load time except Object.assign.
   The online screens (PLAY party, matchmaking, MATCH FOUND, match intro, results, friends) are the game's own UI driven from here:
   the profile is NGH, the friends list / party / matchmaking names are the made-up PvP cast (portraits.py), each with one
   signature ultimate. Matches are 3v3 (the current build) with Us = Street Kings (red) vs Rivals = Neon Strikers (pink). */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, mark, match, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;

  /* ---------- the cast: look (profile format, as portraits.py), squad, signature ultimate, stars (Elo) ----------
     Ultimates respect the Main Path unlocks for each player's Elo (Titan = HARBOR DOCKS 1500+, Meteor Drop = CAGE 1950+...) */
  const CAST = {
    NGH:         { t: 0, look: { hair: 'spiky', face: 'none', fx: 'nofx', skin: 0, hairColor: 0 }, ult: 'meteor_strike', elo: 1478 },
    tuanbeo:     { t: 0, look: { hair: 'cap', face: 'mustache', fx: 'nofx', skin: 2, hairColor: 1 }, ult: 'titan', elo: 1561 },
    kaito_04:    { t: 0, look: { hair: 'headphones', face: 'shades', fx: 'nofx', skin: 1, hairColor: 0 }, ult: 'lightning_dash', elo: 1402 },
    zzz_mi:      { t: 1, look: { hair: 'bun', face: 'blush', fx: 'hearts', skin: 1, hairColor: 0 }, ult: 'aura_farming', elo: 1455 },
    bigboss99:   { t: 1, look: { hair: 'crown', face: 'goldtooth', fx: 'nofx', skin: 3, hairColor: 1 }, ult: 'hundred_fists', elo: 1530 },
    xX_vex_Xx:   { t: 1, look: { hair: 'mohawk', face: 'warpaint', fx: 'nofx', skin: 0, hairColor: 2 }, ult: 'meteor_drop', elo: 1962 },
    mochi:       { t: 2, look: { hair: 'beanie', face: 'nerd', fx: 'nofx', skin: 1, hairColor: 1 }, ult: 'endless_tiki', elo: 1380 },
    DUKE:        { t: 2, look: { hair: 'helmet', face: 'visor', fx: 'nofx', skin: 4, hairColor: 0 }, ult: 'lightning_dash', elo: 1290 },
    'panda.exe': { t: 2, look: { hair: 'bowl', face: 'cyborg', fx: 'nofx', skin: 0, hairColor: 0 }, ult: 'hundred_fists', elo: 1515 },
    ratking:     { t: 3, look: { hair: 'bandana', face: 'scar', fx: 'smoke', skin: 2, hairColor: 0 }, ult: 'titan', elo: 1640 },
    jinx:        { t: 3, look: { hair: 'longhair', face: 'eyepatch', fx: 'nofx', skin: 3, hairColor: 2 }, ult: 'aura_farming', elo: 1210 },
    m0le:        { t: 3, look: { hair: 'afro', face: 'freckles', fx: 'nofx', skin: 4, hairColor: 1 }, ult: 'meteor_strike', elo: 1333 },
  };
  const US = ['NGH', 'tuanbeo', 'kaito_04'], RIVALS = ['zzz_mi', 'bigboss99', 'xX_vex_Xx'];
  const SQUAD = ['street_kings', 'neon_strikers', 'cyber_united', 'underground_fc'];
  const plook = (h) => Object.assign({}, SFC_CONFIG.progression.defaultLook, { shoes: 'kicks' }, CAST[h].look);
  // in-match look (full form, drawn by SFC.Sprites): the cut is the hairstyle, hair = the kit's hair colour (as portraits.py)
  const mlook = (h) => {
    const c = CAST[h], kit = SFC_CONFIG.teams.list[SQUAD[c.t]].kit, sk = SFC_CONFIG.teams.skins;
    return { skin: sk[c.look.skin % sk.length], hair: kit.hair[c.look.hairColor % kit.hair.length], cut: c.look.hair, face: c.look.face, shoes: 'kicks', fx: c.look.fx };
  };
  // a player becomes a cast member: name, look, signature ultimate (replaces the default one)
  const be = (g, p, h, opts = {}) => {
    p.name = h; p.look = mlook(h);
    if (opts.ult !== false && CAST[h].ult) {
      if (p.ult && p.ult !== CAST[h].ult && g.cores.remove) g.cores.remove(p, p.ult);
      p.ult = CAST[h].ult;
      if (!g.cores.has(p, p.ult)) g.cores.add(p, p.ult);
    }
    return p;
  };

  // menu / intro sounds are SFC.Audio cues, not game sfx: log them so the soundtrack plays them (names audio.py knows)
  const logMenuAudio = (extraMap) => {
    const A = SFC.Audio;
    if (A.__pc) return;
    A.__pc = true;
    const map = Object.assign({ tick: 'pass', reveal: 'upgrade', whoosh: 'whoosh', pick: 'pick', menu: 'pass' }, extraMap || {});
    for (const k of Object.keys(map)) {
      const f0 = A[k];
      if (typeof f0 !== 'function') continue;
      A[k] = function () { B.sfx.push({ t: B.t, name: map[k], arg: null }); return f0.apply(this, arguments); };
    }
  };

  // profile: NGH, his look, signature ultimate, stars
  const profile = (elo) => {
    const P = SFC.Profile.data, MP = SFC.MainPath;
    P.name = 'NGH';
    Object.assign(P.look, CAST.NGH.look);
    P.ult = CAST.NGH.ult;
    const st = MP.state;
    st.elo = elo != null ? elo : CAST.NGH.elo;
    st.area = MP.areaOf(st.elo); st.best = Math.max(st.best || 0, st.area); st.peak = Math.max(st.peak || 0, st.elo);
    st.id = MP.area(st.area).id;
    for (let a = 0; a <= st.best; a++) MP.unlock(st, MP.area(a).ult, false);
    st.fresh = [];
    delete st.pending;
  };

  // friends list = the cast (everyone but NGH), statuses as given; party = handles already in the party
  const social = ({ status = {}, party = [] } = {}) => {
    const SO = SFC.Social, MP = SFC.MainPath;
    if (!SO.data) SO.load();
    const names = Object.keys(CAST).filter((h) => h !== 'NGH');
    SO.data.friends = names.map((h, i) => {
      const c = CAST[h], m = MP.fakePlayer(c.elo, []);
      return { id: i + 1, name: h, elo: c.elo, ovr: m.ovr, ratings: m.ratings, deck: m.deck, main: m.main, look: Object.assign({}, CAST[h].look, { shoes: 'kicks' }), ult: c.ult };
    });
    SO.data.chats = {}; SO.data.sent = []; SO.data.incoming = [];
    SO.status = {}; SO.pending = {}; SO.typing = {}; SO.unread = {}; SO.chatWith = null;
    for (const f of SO.data.friends) SO.status[f.id] = status[f.name] || (RIVALS.includes(f.name) ? 'match' : US.includes(f.name) ? 'online' : 'offline');
    SO.party = party.map((h) => SO.data.friends.find((f) => f.name === h).id);
    SO.incomingT = 1e9;   // no random friend requests popping up mid-take
    SO.statusT = -1e9;    // statuses hold still
    return SO;
  };
  const fid = (h) => SFC.Social.data.friends.find((f) => f.name === h).id;

  // matchmaking (the game's own placeholder matchmake): opponents are the rivals, each with his ultimate + stars, our party fills our side
  const rigMatchmaking = (opps = RIVALS) => {
    const MP = SFC.MainPath, M = SFC_CONFIG.mainPath.matchmaking;
    M.names = opps.slice();
    if (!MP.__pc) {
      MP.__pc = true;
      const fp0 = MP.fakePlayer;
      MP.fakePlayer = function (elo, taken) {
        const m = fp0.call(this, elo, taken), c = CAST[m.name];
        if (c) { m.ult = c.ult; m.elo = c.elo; m.look = Object.assign({}, c.look, { shoes: 'kicks' }); }
        return m;
      };
    }
    // ranked opponents always in the same order (zzz_mi, bigboss99, xX_vex_Xx)
    const pick0 = SFC.U.pick;
    SFC.U.pick = function (list) { if (Array.isArray(list) && list.length && list.every((n) => opps.includes(n))) return list[0]; return pick0.apply(this, arguments); };
  };

  // ranked matches keep the squads' kits on the pitch: Street Kings (us) vs Neon Strikers (rivals)
  const squadKits = () => {
    if (app.__pc) return;
    app.__pc = true;
    const s0 = app.startMatch.bind(app);
    app.startMatch = (opts) => s0(opts.mainPath ? Object.assign({}, opts, { home: 'street_kings', away: 'neon_strikers' }) : opts);
  };

  const menu = (page) => {
    logMenuAudio();
    app.toMenu('home');
    if (page) SFC.Menu.go(page);
    return SFC.Menu;
  };

  // a ranked 3v3 as the game builds it after MATCH FOUND (app.startRanked), with the cast on both sides
  const rankedLobby = () => {
    const MP = SFC.MainPath, SO = SFC.Social;
    const lb = MP.matchmake(4, app.myRole(), SO.party.length ? (roles) => SO.partyMates(roles) : null);
    return lb;
  };

  /* ---------- 3v3 with the cast: Street Kings = tuanbeo (DEF) · kaito_04 (MID) · NGH (FWD, our avatar) vs
     Neon Strikers = xX_vex_Xx (DEF) · bigboss99 (MID) · zzz_mi (FWD). Everyone is a puppet unless a scene lets the AI play. ---------- */
  function m3(opts = {}) {
    const g = match(Object.assign({ solo: [2, null] }, opts));
    const [a0, a1, a2] = g.teams[0].players, [b0, b1, b2] = g.teams[1].players;
    const P = { tuanbeo: be(g, a0, 'tuanbeo'), kaito_04: be(g, a1, 'kaito_04'), NGH: be(g, a2, 'NGH'),
      xX_vex_Xx: be(g, b0, 'xX_vex_Xx'), bigboss99: be(g, b1, 'bigboss99'), zzz_mi: be(g, b2, 'zzz_mi') };
    B.puppets = new Set(g.players);
    B.lib.hush();
    return { g, P, all: g.players.slice() };
  }
  const park = (ps, spots) => ps.forEach((p, i) => { if (p.state === 'normal') steer(p, spots[i][0], spots[i][1], false); });
  const fire = (g, p) => { p.res.ult = 1; const ok = g.cores.activateUltimate(p); if (ok) mark('ult_' + p.name); return ok; };

  // a ranked match that has just ended (the game's own end + reward flow): VICTORY, score, both teams' Core chips, stars count up
  function results(elo, score) {
    profile(elo); social({ party: ['tuanbeo', 'kaito_04'] }); rigMatchmaking(); squadKits();
    logMenuAudio({ hit: 'kick' });   // the reveal's stamp (no gameplay hits after the whistle)
    SFC_CONFIG.intro.enabled = false;
    app.toMenu('party');
    app.startRanked(rankedLobby());
    const g = app.game;
    B.lib.hush();
    for (const p of g.players) if (CAST[p.name]) p.look = mlook(p.name);
    const builds = { NGH: ['fire_shot', 'street_fighter'], tuanbeo: ['heavy_boot', 'wall_slam'], kaito_04: ['phantom_step', 'ghost_ball'],
      zzz_mi: ['banana_kick', 'maestro'], bigboss99: ['giant_fist', 'uppercut'], xX_vex_Xx: ['bomb_ball', 'sonic_boom'] };
    for (const p of g.players) for (const id of builds[p.name] || []) if (SFC_CONFIG.cores.list[id]) g.cores.add(p, id);
    g.draft = null; g.state = 'play'; SFC.UI.show(null);
    g.teams[0].score = score[0]; g.teams[1].score = score[1];
    g.elapsed = g.cfg.match.duration;
    at(0.0, () => { g.end(); mark('end'); });
    B.focusFn = () => ({ x: 320, y: 180 });
  }

  Object.assign(B.SCENES, {
    /* B14/B12 kaito_04 LIGHTNING DASH: through zzz_mi and bigboss99 as lightning, then the finish (GOAL banner: kaito_04) */
    pc_ult_kaito() {
      const { g, P } = m3();
      const k = P.kaito_04, G = g.attackGoal(0), b = g.ball;
      place(k, 300, 200, 0); place(P.zzz_mi, 372, 196, PI); place(P.bigboss99, 410, 212, PI); place(P.xX_vex_Xx, G.x - 22, G.y, PI);
      place(P.NGH, 330, 120, 0); place(P.tuanbeo, 190, 260, 0);
      give(g, k);
      noAttack(...g.players.filter((p) => p !== k));
      for (const q of [P.zzz_mi, P.bigboss99, P.xX_vex_Xx]) b.noPickup.set(q.id, 99);
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        park([P.NGH, P.tuanbeo], [[380, 118], [230, 262]]);
        if (!fired) { for (const o of [P.zzz_mi, P.bigboss99]) { steer(o, k.x + 40, o.y, false); face(o, k); } }
        if (!shot) steer(P.xX_vex_Xx, G.x - 22, G.y + Math.sin(t * 2) * 5, false);
        else steer(P.xX_vex_Xx, G.x - 24, G.y + 40, true);
        if (k.state !== 'normal') return;
        if (!fired) { k.intent.mx = 0.35; k.intent.my = 0; if (t > (B.pcUltT || 0.45)) { k.intent.mx = 1; k.intent.my = 0; fired = fire(g, k); } return; }
        if (!shot && b.owner === k) {
          if (G.x - k.x > 110) { steer(k, G.x - 100, G.y - 10, true); return; }
          face(k, G); Act.shoot(g, k, 0.9, -0.7); shot = true; mark('shot');
        } else still(k);
      };
      B.focusFn = () => (shot ? b : k);
    },

    /* B14 tuanbeo TITAN: double size, bowls bigboss99 and zzz_mi over (BONK!), then a giant's shot */
    pc_ult_tuan() {
      const { g, P } = m3();
      const k = P.tuanbeo, G = g.attackGoal(0), b = g.ball;
      place(k, 250, 205, 0); place(P.bigboss99, 345, 200, PI); place(P.zzz_mi, 400, 222, PI); place(P.xX_vex_Xx, G.x - 22, G.y, PI);
      place(P.NGH, 380, 120, 0); place(P.kaito_04, 220, 270, 0);
      give(g, k);
      noAttack(...g.players.filter((p) => p !== k));
      for (const q of [P.zzz_mi, P.bigboss99, P.xX_vex_Xx]) b.noPickup.set(q.id, 99);
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        park([P.NGH, P.kaito_04], [[420, 118], [260, 272]]);
        if (!shot) steer(P.xX_vex_Xx, G.x - 22, G.y + Math.sin(t * 2) * 5, false);
        else steer(P.xX_vex_Xx, G.x - 24, G.y - 44, true);
        for (const o of [P.bigboss99, P.zzz_mi]) if (o.state === 'normal') { if (fired) steer(o, k.x + 20, k.y + (o === P.zzz_mi ? 8 : -4), false); else still(o); face(o, k); }
        if (k.state !== 'normal') return;
        if (!fired) { still(k); face(k, G); if (t > (B.pcUltT || 0.3)) fired = fire(g, k); return; }
        if (B.t - B.marks.ult_tuanbeo < 0.9) { still(k); return; }   // grows first
        if (!shot && b.owner === k) {
          if (G.x - k.x > 140) { k.intent.mx = 1; k.intent.my = 0; k.intent.sprint = true; return; }
          face(k, G); Act.shoot(g, k, 1, 0.5); shot = true; mark('shot');
        } else still(k);
      };
      B.focusFn = () => (shot ? b : k);
    },

    /* B14 zzz_mi AURA FARMING (Neon Strikers, attacks left): gold aura, dodges NGH, powered finish */
    pc_ult_zzz() {
      const { g, P } = m3();
      const k = P.zzz_mi, G = g.attackGoal(1), b = g.ball;
      place(k, 330, 200, PI); place(P.NGH, 262, 204, 0); place(P.tuanbeo, G.x + 22, G.y, 0); place(P.kaito_04, 300, 280, 0);
      place(P.bigboss99, 380, 130, PI); place(P.xX_vex_Xx, 470, 240, PI);
      give(g, k);
      noAttack(...g.players.filter((p) => p !== k));
      for (const q of [P.NGH, P.tuanbeo, P.kaito_04]) b.noPickup.set(q.id, 99);
      let fired = false, dodged = false, shot = false;
      B.dir = (dt, g, t) => {
        park([P.bigboss99, P.xX_vex_Xx, P.kaito_04], [[330, 130], [430, 240], [250, 285]]);
        if (P.NGH.state === 'normal') { if (!dodged) { steer(P.NGH, k.x - 16, k.y, t > 0.9); face(P.NGH, k); } else still(P.NGH); }
        if (!shot) steer(P.tuanbeo, G.x + 22, G.y + Math.sin(t * 2) * 5, false);
        else steer(P.tuanbeo, G.x + 24, G.y + 42, true);
        if (k.state !== 'normal') return;
        if (!fired) { still(k); face(k, G); if (t > (B.pcUltT || 0.35)) fired = fire(g, k); return; }
        if (B.t - B.marks.ult_zzz_mi < 0.7) { still(k); return; }   // pure aura for a beat
        if (shot || b.owner !== k) { still(k); return; }
        if (!dodged && U.dist(k, P.NGH) < 34) { dodged = Act.skill(g, k, -0.5, -1) !== false; mark('dodge'); return; }
        if (k.x - G.x > 130) { steer(k, G.x + 120, G.y - 20, true); return; }
        face(k, G); Act.shoot(g, k, 1, -0.6); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? b : k);
    },

    /* B14/B17 bigboss99 HUNDRED FISTS on NGH (who has the ball): 20 punches, blasted into the wall, he takes the ball */
    pc_ult_boss() {
      const { g, P } = m3();
      const k = P.bigboss99, me = P.NGH, b = g.ball;
      place(me, 330, 140, 0); place(k, 384, 152, PI); place(P.kaito_04, 240, 230, 0); place(P.tuanbeo, 160, 250, 0);
      place(P.zzz_mi, 460, 230, PI); place(P.xX_vex_Xx, 520, 200, PI);
      give(g, me);
      noAttack(...g.players.filter((p) => p !== k));
      let fired = false;
      B.dir = (dt, g, t) => {
        park([P.kaito_04, P.tuanbeo, P.zzz_mi, P.xX_vex_Xx], [[250, 232], [170, 252], [450, 232], [520, 200]]);
        if (!fired) { if (me.state === 'normal') { me.intent.mx = 0.3; me.intent.my = 0.02; } face(k, me); still(k); if (t > (B.pcUltT || 0.5)) fired = fire(g, k); return; }
        if (me.state === 'normal') still(me);
        if (k.state !== 'normal') return;
        if (b.owner !== k && !b.owner) steer(k, b.x, b.y, false); else still(k);
      };
      B.focusFn = () => (B.marks.ult_bigboss99 != null && B.t - B.marks.ult_bigboss99 > 1.6 ? t0focus(me, k) : t0focus(me, k));
    },

    /* B14 xX_vex_Xx METEOR DROP: off the screen, aims at NGH and kaito_04, KRAKOOM */
    pc_ult_vex() {
      const { g, P } = m3();
      const k = P.xX_vex_Xx, b = g.ball;
      place(P.NGH, 300, 200, 0); place(P.kaito_04, 322, 224, 0); place(P.tuanbeo, 280, 172, 0); place(k, 380, 200, PI);
      place(P.zzz_mi, 440, 150, PI); place(P.bigboss99, 470, 260, PI);
      give(g, P.NGH);
      noAttack(...g.players.filter((p) => p !== k));
      let fired = false;
      B.dir = (dt, g, t) => {
        park([P.zzz_mi, P.bigboss99], [[440, 150], [470, 260]]);
        for (const [p, dy] of [[P.NGH, 0], [P.kaito_04, 22], [P.tuanbeo, -26]]) if (p.state === 'normal') { p.intent.mx = 0.12; p.intent.my = 0; }
        if (!fired) { still(k); face(k, P.NGH); if (t > (B.pcUltT || 0.4)) fired = fire(g, k); return; }
      };
      B.focusFn = () => (fired ? { x: 318, y: 200 } : t0focus(P.NGH, k));
    },

    /* B17 payback: bigboss99 shows off with the ball he took, NGH gets up, punches it off him, METEOR SHOT -> GOAL (NGH) */
    pc_payback() {
      const { g, P } = m3();
      const me = P.NGH, k = P.bigboss99, G = g.attackGoal(0), b = g.ball, gk = P.xX_vex_Xx;
      place(k, 300, 196, PI); place(me, 236, 206, 0); place(gk, G.x - 22, G.y, PI);
      place(P.kaito_04, 200, 280, 0); place(P.tuanbeo, 140, 220, 0); place(P.zzz_mi, 420, 130, PI);
      give(g, k);
      noAttack(...g.players.filter((p) => p !== me));
      k.stats = Object.assign({}, k.stats, { dribble: 0.1 });   // the steal lands first time
      for (const q of [P.kaito_04, P.tuanbeo, P.zzz_mi, gk]) b.noPickup.set(q.id, 99);
      let punched = false, fired = false;
      B.dir = (dt, g, t) => {
        park([P.kaito_04, P.tuanbeo, P.zzz_mi], [[220, 282], [160, 222], [430, 130]]);
        if (B.marks.goal == null) steer(gk, G.x - 22, G.y + (fired && B.t - B.marks.ult_NGH > 1.2 ? 40 : Math.sin(t * 2) * 5), fired);
        if (!punched) {
          if (k.state === 'normal') { k.intent.mx = -0.22; k.intent.my = 0.02; }
          if (t > (B.pcGo || 0.45)) steer(me, k.x - 14, k.y, true); else { still(me); face(me, k); }
          if (t > 0.6 && U.dist(me, k) < 24) { face(me, k); punched = Act.lightAttack(g, me); if (punched) mark('punch'); }
          return;
        }
        if (k.state === 'normal') still(k);
        b.noPickup.set(k.id, 99);
        if (me.state !== 'normal') return;
        if (!fired) {
          if (b.owner !== me) { steer(me, b.x, b.y, true); return; }
          mark('own');
          if (B.t - B.marks.own < 0.2) { still(me); face(me, G); return; }
          face(me, G); fired = fire(g, me);
          return;
        }
        still(me);
      };
      B.focusFn = () => (fired && B.t - B.marks.ult_NGH > 1.1 ? { x: Math.min(b.x, G.x - 70), y: b.y } : t0focus(me, k));
    },

    /* B13 the squad: tuanbeo -> kaito_04 -> NGH, one touch each, finish (GOAL: NGH) */
    pc_teamgoal() {
      const { g, P } = m3();
      const a = P.tuanbeo, m = P.kaito_04, f = P.NGH, G = g.attackGoal(0), b = g.ball, gk = P.xX_vex_Xx;
      place(a, 268, 250, 0); place(m, 360, 178, 0); place(f, 462, 236, 0);
      place(P.zzz_mi, 300, 238, PI); place(P.bigboss99, 404, 214, PI); place(gk, G.x - 22, G.y, PI);
      give(g, a);
      noAttack(...g.players);
      for (const q of [P.zzz_mi, P.bigboss99, gk]) b.noPickup.set(q.id, 99);
      let p1 = false, p2 = false, shot = false;
      B.dir = (dt, g, t) => {
        if (P.zzz_mi.state === 'normal') { steer(P.zzz_mi, a.x + 16, a.y - 4, t > 0.2); face(P.zzz_mi, a); }
        if (P.bigboss99.state === 'normal') { if (!p1) still(P.bigboss99); else steer(P.bigboss99, (b.x + m.x) / 2 + 10, (b.y + m.y) / 2, true); }
        if (!shot) steer(gk, G.x - 22, G.y + (p2 ? -12 : Math.sin(t * 2) * 5), false);
        else steer(gk, G.x - 24, G.y - 44, true);
        if (!p1) { still(m); still(f); a.intent.mx = 0.2; a.intent.my = 0; if (t > (B.pcP1 || 0.5)) { Act.passTo(g, a, m, 'ground'); p1 = true; mark('pass1'); } return; }
        still(a);
        if (!p2) { still(f); if (b.owner === m) { face(m, f); Act.passTo(g, m, f, 'ground'); p2 = true; mark('pass2'); } else steer(m, b.x, b.y, false); return; }
        still(m);
        if (!shot) { if (b.owner === f) { face(f, G); Act.shoot(g, f, 0.85, -0.6); shot = true; mark('shot'); } else steer(f, b.x, b.y, false); return; }
        still(f);
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 60), y: b.y } : b.owner || b);
    },

    /* B16 six players, everything at once (wide): punches, a dropkick, tuanbeo TITAN, xX_vex_Xx METEOR DROP, the ball rolls in */
    pc_chaos6() {
      const { g, P } = m3();
      const b = g.ball, E = g.effects;
      place(P.NGH, 304, 186, 0); place(P.kaito_04, 300, 222, 0); place(P.tuanbeo, 252, 204, 0);
      place(P.zzz_mi, 317, 222, PI); place(P.bigboss99, 321, 184, PI); place(P.xX_vex_Xx, 382, 206, PI);
      b.owner = null; b.x = 330; b.y = 204; b.vx = b.vy = 0;
      noAttack(...g.players);
      for (const p of g.players) b.noPickup.set(p.id, 99);
      const hit = (p, q, kind) => { p.cd.light = p.cd.hard = 0; face(p, q); const ok = kind === 'hard' ? Act.hardAttack(g, p) : Act.lightAttack(g, p); p.cd.light = p.cd.hard = 99; return ok; };
      at(0.15, () => { hit(P.kaito_04, P.zzz_mi, 'light'); mark('punch1'); });
      at(0.3, () => { hit(P.bigboss99, P.NGH, 'hard'); mark('kick1'); });
      at(B.pcTitanT || 0.85, () => { fire(g, P.tuanbeo); });
      at(B.pcVexT || 2.35, () => { fire(g, P.xX_vex_Xx); });
      B.dir = (dt, g, t) => {
        const T = P.tuanbeo;
        if (B.marks.ult_tuanbeo != null && B.t - B.marks.ult_tuanbeo > 0.7 && B.t - B.marks.ult_tuanbeo < 1.5 && T.state === 'normal') { T.intent.mx = 1; T.intent.my = -0.12; T.intent.sprint = true; }
        else if (T.state === 'normal') still(T);
        for (const p of [P.NGH, P.kaito_04, P.zzz_mi, P.bigboss99]) if (p.state === 'normal') { const o = p.team ? P.tuanbeo : P.zzz_mi; if (B.marks.ult_tuanbeo != null && p.team) steer(p, T.x + 24, T.y + (p === P.zzz_mi ? 10 : -8), false); else still(p); }
        if (B.marks.ult_xX_vex_Xx == null && P.xX_vex_Xx.state === 'normal') still(P.xX_vex_Xx);
        // the loose ball after the crater: it trickles into the net
        if (B.marks.land == null && B.marks.ult_xX_vex_Xx != null && P.xX_vex_Xx.state !== 'meteor' && P.xX_vex_Xx.state !== 'slam' && B.t - B.marks.ult_xX_vex_Xx > 1.5) mark('land');
      };
      B.focusFn = () => ({ x: 320, y: 204 });
    },

    /* B18 clutch: 1-2, 0:05, FINAL PUSH (goals x2): kaito_04 punches it off bigboss99, NGH METEOR SHOT, GOAL x2 -> 3-2 */
    pc_clutch() {
      const { g, P } = m3();
      const me = P.NGH, m = P.kaito_04, k = P.bigboss99, G = g.attackGoal(0), b = g.ball, gk = P.xX_vex_Xx;
      g.teams[0].score = 1; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - (B.pcRem || 5.4);
      place(k, 330, 206, PI); place(m, 280, 212, 0); place(me, 300, 150, 0); place(gk, G.x - 22, G.y, PI);
      place(P.zzz_mi, 380, 120, PI); place(P.tuanbeo, 190, 250, 0);
      give(g, k);
      k.stats = Object.assign({}, k.stats, { dribble: 0.1 });
      noAttack(...g.players.filter((p) => p !== m));
      for (const q of [P.zzz_mi, P.tuanbeo, gk]) b.noPickup.set(q.id, 99);
      let punched = false, passed = false, fired = false;
      B.dir = (dt, g, t) => {
        park([P.zzz_mi, P.tuanbeo], [[390, 124], [220, 252]]);
        if (B.marks.goal == null) steer(gk, G.x - 22, G.y + (fired && B.t - B.marks.ult_NGH > 1.0 ? 44 : Math.sin(t * 2) * 5), fired);
        if (!punched) {
          if (k.state === 'normal') { k.intent.mx = -0.3; k.intent.my = 0; }
          still(me); face(me, k);
          if (t > 0.35) steer(m, k.x - 15, k.y, true); else still(m);
          if (t > 0.55 && U.dist(m, k) < 24) { face(m, k); punched = Act.lightAttack(g, m); if (punched) { mark('punch'); m.cd.light = m.cd.hard = 99; } }
          return;
        }
        b.noPickup.set(k.id, 99);
        if (k.state === 'normal') still(k);
        if (!passed) { if (b.owner === m) { if (B.t - B.marks.punch > 0.35) { Act.passTo(g, m, me, 'ground'); passed = true; mark('pass'); } else still(m); } else if (m.state === 'normal') steer(m, b.x, b.y, true); still(me); return; }
        if (m.state === 'normal') still(m);
        if (me.state !== 'normal' || fired) { still(me); return; }
        if (b.owner !== me) { steer(me, b.x, b.y, false); return; }
        mark('own'); face(me, G);
        if (B.t - B.marks.own > 0.15) fired = fire(g, me);
      };
      B.focusFn = () => (fired && B.t - B.marks.ult_NGH > 1.1 ? { x: Math.min(b.x, G.x - 70), y: b.y } : passed ? t0focus(me, b) : t0focus(m, k));
    },

    /* B12 PLAY > RANKED: NGH + tuanbeo + kaito_04 READY -> START -> SEARCHING (timer) -> MATCH FOUND vs zzz_mi, bigboss99, xX_vex_Xx */
    pc_party() {
      profile(); social({ party: ['tuanbeo', 'kaito_04'] }); rigMatchmaking(); squadKits();
      const M = menu('party');
      at(B.pcStart || 0.6, () => { M.startSearch(); M.search.wait = B.pcWait || 1.25; mark('start'); });
      B.dir = null;
      const tick = setInterval(() => { if (M.search && M.search.lobby) { mark('found'); M.search.hold = -99; clearInterval(tick); } }, 5);
      B.focusFn = () => ({ x: 320, y: 180 });
    },

    /* B12 the match intro (RANKED MATCH): 3 cards a side, each with name, stars and signature ultimate */
    pc_intro() {
      profile(); social({ party: ['tuanbeo', 'kaito_04'] }); rigMatchmaking(); squadKits();
      logMenuAudio({ hit: 'kick', upgrade: 'upgrade' });
      SFC_CONFIG.intro.enabled = true;
      app.toMenu('party');
      const lb = rankedLobby();
      app.startRanked(lb);
      const g = app.game;
      for (const p of g.players) if (CAST[p.name]) p.look = mlook(p.name);
      SFC.Intro.abort(); app.screen = 'intro';
      SFC.Intro.start(g, () => { app.screen = 'game'; });
      B.focusFn = () => ({ x: 320, y: 180 });
    },

    /* B12/B15 results: VICTORY, the score, both teams' Core chips, stars counting up (+ promotion when elo crosses an Area) */
    pc_res0() { results(1440, [3, 2]); },     // B12: ★1440 -> +24ish, no promotion
    pc_res1() { results(1421, [2, 1]); },     // B15 climb: win 1
    pc_res2() { results(1452, [4, 2]); },     // B15 climb: win 2
    pc_res3() {                               // B15 climb: win 3 -> NEW AREA UNLOCKED: HARBOR DOCKS, then the new ultimate card flips (TITAN)
      results(1483, [3, 1]);
      const R = SFC.Reveal;
      const poll = setInterval(() => { if (R.active && R.phase === 'idle' && R.t > 0.15) { R.advance(); mark('charge'); clearInterval(poll); } }, 10);
    },

    /* B13 friends list: open FRIENDS, invite tuanbeo (Invite sent... -> joined your party), then kaito_04 */
    pc_friends() {
      profile(); social({ party: [] });
      const C = SFC_CONFIG.social;
      C.inviteWait = B.pcInvWait || [0.8, 0.8]; C.acceptChance = 1;
      SFC.Social.data.chats[fid('tuanbeo')] = [{ me: true, txt: 'ranked?', t: 0 }, { me: false, txt: 'send invite', t: 0 }];
      const M = menu('party');
      M.friendsOpen = true;
      const row = (h) => M.items().findIndex((x) => x.kind === 'friend' && x.id === fid(h));
      at(0.05, () => { M.sel = row('tuanbeo'); M.frAct = 0; M.render(); });
      at(B.pcInv1 || 0.6, () => { M.friendAction(fid('tuanbeo'), 'invite'); mark('inv1'); });
      at(B.pcSel2 || 1.0, () => { M.sel = row('kaito_04'); M.frAct = 0; SFC.Audio.menu(); M.render(); });
      at(B.pcInv2 || 1.3, () => { M.friendAction(fid('kaito_04'), 'invite'); mark('inv2'); });
      B.focusFn = () => ({ x: 320, y: 180 });
    },
  });
})();
