/* Main — khởi tạo, vòng lặp fixed-timestep, điều hướng màn hình */
(function () {
  const C = SFC_CONFIG.game;
  const Input = SFC.Input;
  const STEP = 1 / 60;

  const app = {
    screen: 'menu',     // menu | game | pause | intro | story (cut scene PROLOGUE)
    mode: 'single',     // single | online
    game: null,
    demo: null,
    // ctrl: i > 0 = chỉ điều khiển cầu thủ thứ i - 1 (character của bạn), mặc định ĐÁ CAO.
    // 0 = cả đội — logic vẫn còn nhưng menu không cho chọn nữa (người chơi chỉ điều khiển 1 character)
    sel: { team: 0, opp: 0, diff: 1, ctrl: C.roles.indexOf('FWD') + 1 },
    train: { mine: 1, opp: 0 },                  // luyện tập: số người đội bạn (1 / 2) · đội đối thủ (0 / 2)
    lastOpts: null,

    // trận demo chạy nền ở menu: sân + 2 đội bot của Area người chơi đang đứng trên Main Path (đổi Area -> toMenu dựng lại)
    newDemo() {
      const MP = SFC.MainPath, A = SFC.Profile.data && MP.area(MP.state.area);
      const order = A && A.teams.length > 1 ? A.teams : SFC_CONFIG.teams.order;
      const a = SFC.U.pick(order);
      const b = SFC.U.pick(order.filter((t) => t !== a));
      this.demoArea = A ? MP.state.area : -1;
      this.demo = new SFC.Game({ home: a, away: b, difficulty: 'normal', humanTeam: -1, silent: true, arena: A && SFC_CONFIG.arenas[A.arena] ? A.arena : undefined });
    },

    // Main Path: vào màn tìm trận (matchmaking giả, src/ui/menu.js -> search). Tìm xong -> startRanked
    startMainPath() {
      // bản DEMO: đã tới Area bị khoá -> màn WISHLIST thay vì vào trận (cả nút NEXT MATCH ở màn kết quả)
      if (SFC.MainPath.demoOver()) return this.toMenu('wishlist');
      if (this.screen !== 'menu') this.toMenu('party');
      SFC.Menu.startSearch();
    },
    // không còn chọn vị trí (mọi người cùng 1 vai trò): character luôn vào chỗ đứng ĐÁ CAO khi giao bóng;
    // roles chỉ còn là các chỗ đứng trong đội hình (game.formation), không hiện trên giao diện
    myRole() { return C.roles.includes('FWD') ? 'FWD' : C.roles[C.roles.length - 1]; },

    // trận Main Path 3v3: character của bạn + 2 đồng đội (bạn bè trong phòng / người giả) vs 3 đối thủ giả (bot đóng vai người chơi, lb = MainPath.matchmake)
    startRanked(lb) {
      const MP = SFC_CONFIG.mainPath, st = SFC.MainPath.state;
      const soloIdx = Math.max(0, C.roles.indexOf(lb.role));   // vị trí ngẫu nhiên mỗi trận (Menu.startSearch)
      const avatar = Object.assign(SFC.Profile.avatar(), { role: C.roles[soloIdx] }, this.avatarStats());
      SFC_CONFIG.teams.list[MP.playerTeam.id].name = MP.playerTeam.nameFormat.replace('{name}', avatar.name);
      this.startMatch({
        home: MP.playerTeam.id, away: SFC.MainPath.rivalClub(lb.opps[0].name), difficulty: 'normal',
        aiProfile: lb.aiProfile, mateProfile: lb.aiProfile,
        humanTeam: 0, solo: [soloIdx, null], avatars: [avatar, null], arena: lb.arena,
        // Core mở khoá (Core thường + Tuyệt kỹ đã mở) · Core vừa mở ưu tiên hiện ở lượt chọn
        coreUnlocks: [SFC.Profile.unlockedCores(), null], coreFresh: [st.fresh.slice(), null],
        // giờ chọn Core như trận xếp hạng có người thật (net.draftTimeLimit)
        draftTimeLimit: SFC_CONFIG.net.draftTimeLimit,
        mates: [lb.mates, lb.opps],   // 3v3: 2 đồng đội (bạn bè trong phòng / người giả) vs 3 đối thủ giả
        mainPath: { area: st.area, elo: st.elo, reward: lb.reward, myElo: lb.myElo, oppElo: lb.oppElo, party: lb.party },
      });
    },

    // FOOTBALL STORY (src/meta/cup.js): trận của vòng đang tới trong lượt chơi cup. Character đá ĐÁ CAO + 2 đồng đội AI cố định cả cup
    // (Cup.pickMates), đối thủ = đội của vòng đó, độ khó AI cả 2 đội theo Elo của vòng (MainPath.aiProfile). Hoà hết giờ: bàn thắng vàng (knockout)
    startCupMatch() {
      const Cup = SFC.Cup, R = Cup.run, rd = Cup.current();
      if (!rd) return this.toMenu('story');
      const MP = SFC_CONFIG.mainPath, soloIdx = Math.max(0, C.roles.indexOf(this.myRole()));
      const avatar = Object.assign(SFC.Profile.avatar(), { role: C.roles[soloIdx] }, this.avatarStats());
      SFC_CONFIG.teams.list[MP.playerTeam.id].name = MP.playerTeam.nameFormat.replace('{name}', avatar.name);
      const ai = SFC.MainPath.aiProfile(rd.elo), mateRoles = C.roles.filter((r, i) => i !== soloIdx);
      this.startMatch({
        home: MP.playerTeam.id, away: rd.team, difficulty: 'normal', aiProfile: ai, mateProfile: ai,
        humanTeam: 0, solo: [soloIdx, null], avatars: [avatar, null], arena: SFC_CONFIG.arenas[rd.arena] ? rd.arena : undefined,
        coreUnlocks: [SFC.Profile.unlockedCores(), null],
        mates: [R.mates.map((m, i) => SFC.Cup.mateSpec(m, mateRoles[i] || null, rd)), null],   // chỉ số theo trình đối thủ (stories.mateStats)
        signature: [null, rd.signature || null],
        knockout: true, cup: { id: R.id, round: R.round },
        mod: rd.mod || null, barks: rd.barks || null, score: rd.score || null,   // luật trận + câu nói của đối thủ (src/systems/matchmods.js)
      });
      if (SFC_DEBUG && SFC.StoryTest) SFC.StoryTest.onMatch(this);   // phòng test Story: phím tắt trong trận (src/ui/storytest.js)
    },

    // GOAT PATH (src/meta/run.js): trận của node đang chọn trên map. Character đá ĐÁ CAO + 2 đồng đội AI (Run.pickMates),
    // đối thủ = đội trên node, độ khó AI cả 2 đội theo Elo của node (theo act + tầng). Hoà hết giờ: bàn thắng vàng. Thua = hết run
    startRunMatch() {
      const M = SFC.Run.match();
      if (!M) return this.toMenu('runmap');
      const MP = SFC_CONFIG.mainPath, RN = SFC.Run, roles = RN.squad().map((x) => x.role), soloIdx = Math.max(0, C.roles.indexOf(roles[0]));
      // đội hình của run (Run.squad): chỉ số = nền theo vị trí + LEGEND + chấn thương của từng người, không dùng chỉ số ngoài run;
      // inj = chấn thương (băng + khoảnh khắc) · legend = LEGEND (src/systems/legends.js) · gearBoost / gearBias = GEAR trường phái (cores.js)
      const avatar = Object.assign(SFC.Profile.avatar(), { role: roles[0], stats: RN.statsOf(0), ovr: RN.ovrOf(0), inj: RN.injuryIds(0), legend: RN.legendOf(0) || undefined }, RN.gearCore(0));
      SFC_CONFIG.teams.list[MP.playerTeam.id].name = MP.playerTeam.nameFormat.replace('{name}', avatar.name);
      const ai = SFC.MainPath.aiProfile(M.elo);
      // SKILL GAME / LEGEND TRIAL (src/systems/drills.js): đội bạn 1 người (character) hoặc cả đội hình (PASS CHAIN), không chọn Core, không luật trận,
      // không màn giới thiệu. trial: mốc riêng của LEGEND · drillEase: BADGE Training Bibs
      if (M.drill) {
        const size = M.teamSize.slice();
        this.startMatch({
          home: MP.playerTeam.id, away: M.team, difficulty: 'normal', aiProfile: ai, mateProfile: ai, humanTeam: 0, solo: [size[0] > 1 ? soloIdx : 0, null], avatars: [avatar, null],
          mates: [size[0] > 1 ? RN.mateSpecs() : null, null],
          arena: SFC_CONFIG.arenas[M.arena] ? M.arena : undefined, teamSize: size, noDraft: true, drill: M.drill, trial: M.trial || undefined, drillEase: M.ease || 0, run: M.info,
        });
        if (SFC_DEBUG && SFC.RunTest) SFC.RunTest.onMatch(this);   // phòng test GOAT PATH: phím tắt trong trận (src/ui/runtest.js)
        return;
      }
      this.startMatch({
        home: MP.playerTeam.id, away: M.team, difficulty: 'normal', aiProfile: ai, mateProfile: ai,
        humanTeam: 0, solo: [soloIdx, null], avatars: [avatar, null], arena: SFC_CONFIG.arenas[M.arena] ? M.arena : undefined,
        coreUnlocks: [SFC.Profile.unlockedCores(), null],
        mates: [RN.mateSpecs(), null],
        signature: [null, M.signature],
        knockout: true, run: M.info,
        mod: M.mod, barks: M.barks,   // luật trận + câu nói của đối thủ (src/systems/matchmods.js); không có tỉ số khởi đầu
        ...RN.matchOpts(),            // BADGE của đội: draftCards / rerollBonus / draftBonus / score / ultGain / varCheck / addedTime
      });
      if (SFC_DEBUG && SFC.RunTest) SFC.RunTest.onMatch(this);   // phòng test GOAT PATH: phím tắt trong trận (src/ui/runtest.js)
    },

    // bỏ trận Main Path giữa chừng (Pause > FORFEIT, rời trận xếp hạng online): tính là thua
    forfeit() {
      const g = this.game, mp = g && g.opts.mainPath;
      let msg = '';
      // FOOTBALL STORY: bỏ trận = thua = hết cup
      if (g && g.opts.cup && g.state !== 'ended') { SFC.Cup.forfeit(g); return this.toMenu('cup'); }
      // GOAT PATH: SKILL GAME bỏ cuộc = hỏng bài (chấn thương), màn kết quả hiện như thường
      if (g && g.opts.drill && g.state !== 'ended') { SFC.Drills.finish(g, true); return this.resume(); }
      // GOAT PATH: bỏ trận = thua = hết run
      if (g && g.opts.run && g.state !== 'ended') { SFC.Run.forfeit(); return this.toMenu('runmap'); }
      if (mp && g.state !== 'ended') {
        if (SFC_CONFIG.mainPath.forfeitCountsAsLoss) {
          const r = SFC.MainPath.record('lose', mp);
          const st = SFC.Profile.data.stats;
          st.matches++; st.losses++;
          SFC.Profile.save();
          msg = this.forfeitText(r);
        } else if (SFC.MainPath.state.pending) { delete SFC.MainPath.state.pending; SFC.Profile.save(); }
      }
      this.toMenu('party');
      if (msg) SFC.Menu.setMsg(msg, true);
    },
    forfeitText(r) { return r.delta ? SFC.t('Forfeit counts as a loss ({n} ★).', { n: r.delta }) : SFC.t('Forfeit counts as a loss.'); },

    // chỉ số riêng của character (chỉ Main Path / Luyện tập — online đi qua Profile.avatar(), không kèm chỉ số)
    // đồng đội đang chọn vào trận: đá vị trí còn lại so với character
    mateSpec(soloIdx) {
      const m = SFC.Mates.active();
      return m ? SFC.Mates.spec(m, C.roles.find((r, i) => i !== soloIdx) || null) : null;
    },

    avatarStats() { return { stats: SFC.Profile.avatarStats(), ovr: SFC.Profile.ovr() }; },

    startMatch(opts) {
      this.mode = 'single';
      this.lastOpts = opts;
      this.game = new SFC.Game(opts);
      this.beginMatch(opts);
    },

    // Luyện tập: không giờ trận, không chọn Core, không thưởng. Đội bạn 1 người (character đá ĐÁ CAO) hoặc 2 người
    // (điều khiển như Chơi đơn); đối thủ 0 hoặc 2 người (đội + độ khó như Chơi đơn)
    startTraining() {
      const o = SFC.Menu.options(), s = this.sel, t = this.train;
      const home = o.order[s.team];
      let away = o.opp[s.opp];
      if (away === 'random') away = SFC.U.pick(o.order.filter((id) => id !== home));
      // đội bạn: 1 người (character đá ĐÁ CAO) hoặc đủ đội (chỉ số slot = chỉ số vị trí trong roles)
      const two = t.mine > 1;
      const soloIdx = !two ? 0 : s.ctrl ? s.ctrl - 1 : null;
      const role = !two || soloIdx == null ? 'FWD' : C.roles[soloIdx];
      this.startMatch({
        home, away, difficulty: o.diffs[s.diff], humanTeam: 0, training: true, teamSize: [t.mine, t.opp],
        solo: [soloIdx, null], avatars: [Object.assign(SFC.Profile.avatar(), { role }, this.avatarStats()), null],
        mates: [two ? this.mateSpec(C.roles.indexOf(role)) : null, null],   // 2 người: đồng đội đang chọn đá cùng
        coreUnlocks: [SFC.Profile.unlockedCores(), null],
      });
    },

    // trận online: host truyền trận thật, khách truyền trận "gương"
    enterOnline(game) {
      this.mode = 'online';
      this.game = game;
      this.beginMatch(game.opts);
    },

    beginMatch(opts) {
      this.screen = 'game';
      SFC.Platform.gameplay(true);
      SFC.Input.textHandler = null;
      SFC.UI.hudCache = {};
      // Main Path: không cho đá lại trận đang thua — chỉ tiếp tục hoặc bỏ trận (tính thua)
      // dịch lúc vào trận (đổi ngôn ngữ chỉ làm được ở menu)
      const _t = SFC.t;
      SFC.UI.pauseItems = opts.mainPath ? [['resume', _t('RESUME')], ['forfeit', _t('FORFEIT (LOSS)')]]
        : opts.cup && this.mode !== 'online' ? [['resume', _t('RESUME')], ['forfeit', _t('FORFEIT (CUP OVER)')]]
        : opts.drill ? [['resume', _t('RESUME')], ['forfeit', _t('GIVE UP')]]
        : opts.run ? [['resume', _t('RESUME')], ['forfeit', _t('FORFEIT (RUN OVER)')]]
        : this.mode === 'online' ? [['resume', _t('BACK TO MATCH')], ['leave', _t('LEAVE ROOM')]]
        : opts.tutorial ? [['resume', _t('RESUME')], ['skiptut', _t('SKIP PROLOGUE')]]
        : [['resume', _t('RESUME')], ['restart', _t('RESTART')], ['menu', _t('MAIN MENU')]];
      // trận xếp hạng: lưu sẵn 1 trận thua tới khi có kết quả (tắt game / rớt mạng giữa trận vẫn tính thua)
      if (opts.mainPath && !opts.resume) SFC.MainPath.begin(opts.mainPath);
      if (opts.run) SFC.Run.begin(opts.run);   // GOAT PATH: tắt game giữa trận = forfeit
      SFC.UI.clearToasts();
      SFC.UI.show(null);
      const L = SFC_CONFIG.teams.list, mp = opts.mainPath;
      const kickoff = () => {
        if (opts.resume) return;   // kết nối lại giữa trận (net/session.js): trận đang đá dở
        const vsAway = _t('vs {team}', { team: L[opts.away].name });
        const vs = opts.training && opts.teamSize && !opts.teamSize[1]
          ? _t('{team} · no opponent', { team: L[opts.home].name })
          : _t('{home} vs {away}', { home: L[opts.home].name, away: L[opts.away].name });
        if (opts.tutorial) SFC.UI.banner(_t('THE DREAM'), _t('PROLOGUE'), '#b9a8ff', 2);
        else if (mp) SFC.UI.banner(_t('KICK OFF'), `${SFC.MainPath.area(mp.area).name} · ${vsAway}`, '#ffe14f', 1.6);
        else if (opts.cup) {
          const st = SFC.Cup.get(opts.cup.id);
          SFC.UI.banner(SFC.Cup.roundName(opts.cup.round), `${st ? st.name : ''} · ${vsAway}`, st ? st.color : '#ffe14f', 1.8);
        }
        else if (opts.drill) {
          // LEGEND TRIAL: tên kỹ thuật cho mượn + số lần cần làm (màu LEGEND)
          const D = SFC_CONFIG.run.drills[opts.drill], LG = opts.trial && SFC.Run.legend(opts.trial), K = LG && SFC_CONFIG.legends.techniques[LG.tech];
          if (K) SFC.UI.banner(K.name, _t('Pull it off {n} times', { n: this.game && this.game.drill ? SFC.Drills.top(this.game.drill) : LG.trial.goal }), LG.color, 2.4);
          else SFC.UI.banner(D.name, D.desc, '#6bff4f', 2.4);
        }
        else if (opts.run) {
          const A = SFC.Run.act(opts.run.act) || {}, N = SFC.Run.node(opts.run.kind) || {};
          SFC.UI.banner(N.name || _t('KICK OFF'), `${A.name || ''} · ${vsAway}`, opts.run.kind === 'match' ? A.color : N.color, 1.8);
        }
        else SFC.UI.banner(opts.training ? _t('TRAINING') : _t('KICK OFF'), vs, '#ffe14f', 1.4);
        SFC.Audio.upgrade();
      };
      // màn giới thiệu lực lượng 2 đội (config/intro.config.js): trận đứng yên tới khi xong, rồi mới chọn Core / giao bóng
      SFC.Intro.abort();
      // online: 2 máy cùng chiếu; host giữ trận đứng yên tới khi cả 2 xem xong (SFC.Session.introDone)
      if (SFC.Intro.wants(opts)) {
        this.screen = 'intro';
        SFC.Intro.start(this.game, () => {
          this.screen = 'game';
          if (this.mode === 'online') SFC.Session.introDone();
          kickoff();
        });
      } else kickoff();
    },

    // Main Path: "đá lại" = sang trận kế tiếp theo tiến trình mới
    restart() {
      // trận xếp hạng online: NEXT MATCH = rời phòng rồi tìm trận mới
      if (this.mode === 'online') {
        if (this.game && this.game.opts.mainPath) { SFC.Session.leave(); this.startMainPath(); }
        return;
      }
      if (this.mode !== 'single') return;
      if (this.lastOpts && this.lastOpts.mainPath) this.startMainPath();
      else if (this.lastOpts && this.lastOpts.cup) this.toMenu('cup');   // FOOTBALL STORY: không đá lại, về màn cup
      else if (this.lastOpts && this.lastOpts.run) this.toMenu('runmap');   // GOAT PATH: không đá lại, về map
      else this.startMatch(this.lastOpts);
    },

    pickCore(i) {
      if (this.mode === 'online') SFC.Session.pick(i);
      else if (this.game) this.game.pickCore(i);
    },

    rerollCore() {
      if (this.mode === 'online') SFC.Session.reroll();
      else if (this.game) this.game.rerollDraft();
    },

    resume() {
      if (this.mode === 'online') SFC.OnlineUI.overlay = false;
      this.screen = 'game';
      SFC.Platform.gameplay(true);
      const g = this.game;
      // đang chọn Core mà mình đã chọn xong (chờ người khác): không mở lại màn chọn, chỉ chữ chờ giữa màn (UI.draftWaitView)
      const draftOpen = g && g.state === 'draft' && !(g.draft && g.draft.picked[g.me]);
      SFC.UI.show(draftOpen ? 'draft' : g && g.state === 'ended' ? 'end' : null);
    },

    pause() {
      if (this.mode === 'online') SFC.OnlineUI.overlay = true;
      else {
        this.screen = 'pause';
        // trận xếp hạng (cả offline) vẫn chạy khi mở menu tạm dừng -> vẫn là đang chơi
        if (!(this.game && this.game.opts.mainPath)) SFC.Platform.gameplay(false);
      }
      SFC.UI.pauseSel = 0;
      SFC.UI.renderPause();
      SFC.UI.show('pause');
    },

    // về menu; page = trang menu muốn mở (home / online / lobby)
    toMenu(page = 'home') {
      // rời trận xếp hạng online (LOBBY / FORFEIT): rời phòng luôn (trận thường: OnlineUI tự rời / về phòng chờ)
      if (this.mode === 'online' && this.game && this.game.opts.mainPath) SFC.Session.leave();
      SFC.Intro.abort();
      SFC.Story.abort();
      SFC.Tutorial.cleanup();
      SFC.Drill.close();
      this.game = null;
      this.screen = 'menu';
      SFC.Platform.gameplay(false);
      if (page !== 'lobby') this.mode = 'single';
      SFC.UI.clearToasts();
      SFC.UI.show('menu');
      if (SFC.Profile.data && this.demoArea !== SFC.MainPath.state.area) this.newDemo();   // đổi Area -> đổi sân nền menu
      SFC.Menu.go(page);
    },
  };

  // đổi bàn phím <-> tay cầm: vẽ lại màn đang mở để nhãn phím khớp thiết bị (thanh kỹ năng tự vẽ lại qua hudCache)
  let deviceRev = 0;
  function refreshLabels() {
    const UI = SFC.UI, g = app.game;
    if (SFC.Drill.active) SFC.Drill.render();
    if (SFC.LangPick.active) SFC.LangPick.update();
    if (app.screen === 'menu') return SFC.Menu.render();
    if (UI.current === 'pause') UI.renderPause();
    else if (UI.current === 'draft' && g) UI.renderDraft(g);
  }

  function tick(dt) {
    if (Input.deviceRev !== deviceRev) { deviceRev = Input.deviceRev; refreshLabels(); }
    if (Input.wasPressed('mute') && !Input.textHandler) {
      const m = SFC.Audio.toggleMute();
      if (app.screen !== 'menu') SFC.UI.banner(m ? SFC.t('MUTED') : SFC.t('SOUND ON'), '', '#9aa3b5', 0.8);
    }

    // cut scene PROLOGUE (src/ui/story.js)
    if (app.screen === 'story') { SFC.Story.update(dt, Input); return; }

    if (app.screen === 'menu') {
      app.demo.update(dt, null);
      app.demo.events.length = 0;
      if (app.demo.state === 'ended') app.newDemo();
      SFC.Menu.animate(dt);
      // popup chọn ngôn ngữ / màn DRILL mở trên menu (CHARACTER / STATS): nhận phím thay menu
      if (SFC.LangPick.active) SFC.LangPick.input(Input);
      else if (SFC.Drill.active) SFC.Drill.update(dt, Input);
      else SFC.Menu.input(Input);
      return;
    }

    if (app.mode === 'online') { SFC.OnlineUI.tick(dt, Input); return; }

    // màn giới thiệu đội hình: trận chưa chạy, sự kiện (lượt chọn Core đầu trận) chờ tới khi xong
    if (app.screen === 'intro') { SFC.Intro.update(dt, Input); return; }

    const g = app.game;
    // trận xếp hạng (Main Path): giống trận online — mở menu không dừng trận (phím không vào trận), giờ chọn Core vẫn chạy
    const live = !!g.opts.mainPath;
    if (app.screen === 'pause') {
      SFC.UI.pauseInput(Input);
      if (!live || app.game !== g || app.screen !== 'pause') return;
      if (g.state === 'ended') { app.screen = 'game'; return; }   // hết trận khi đang mở menu: màn kết quả nhận phím
      g.update(dt, SFC.Sync.NULL_INPUT);
      SFC.UI.consume(g);
      return;
    }
    // màn DRILL mở trên màn kết quả: nhận phím thay các nút kết quả
    if (SFC.Drill.active) { SFC.Drill.update(dt, Input); return; }

    if (g.state === 'ended') {
      if (SFC.Reveal.active) SFC.Reveal.update(dt, Input);   // màn mở thẻ phần thưởng Main Path
      else SFC.UI.endInput(Input);
    } else if (g.state === 'draft') {
      if (Input.wasPressed('pause')) return app.pause();
      SFC.UI.draftInput(Input, g);
      if (live && app.game === g && g.state === 'draft') g.update(dt, SFC.Sync.NULL_INPUT);   // đồng hồ chọn Core
    } else {
      if (Input.wasPressed('pause')) return app.pause();
      g.update(dt, Input);
    }
    // trận mơ PROLOGUE: kịch bản đọc sự kiện trước khi UI lấy đi
    if (g.opts.tutorial) SFC.Tutorial.update(dt, Input, g);
    SFC.UI.consume(g);
  }

  function fit() {
    const stage = document.getElementById('stage');
    // phóng đúng tỉ lệ cửa sổ (không làm tròn): chỉ còn viền đen khi cửa sổ khác 16:9
    const scale = Math.min(window.innerWidth / C.render.width, window.innerHeight / C.render.height);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function boot() {
    const langChosen = SFC.I18n.init();   // ngôn ngữ đã chọn / đoán theo máy -> dịch config trước khi vẽ bất cứ gì
    SFC.Profile.load();
    const forfeited = SFC.MainPath.settle();   // lần trước tắt game giữa trận xếp hạng -> tính thua
    SFC.Run.settle();   // lần trước tắt game giữa trận GOAT PATH -> hết run (màn GOAT PATH hiện màn kết thúc)
    SFC.Run.unlockRoad(false);   // CORE ROAD theo run: cấp bù Core tới tiến trình hiện tại (đổi config / hồ sơ cũ)
    SFC.Settings.apply();   // âm lượng + cỡ cửa sổ đã lưu (SETTINGS)
    Input.init(SFC_CONFIG.controls.bindings);
    SFC.Renderer.init(document.getElementById('game'));
    app.newDemo();
    SFC.UI.init(app);
    SFC.Menu.init(app);
    SFC.UI.show('menu');
    // máy chủ trận (gói miễn phí ngủ khi không ai dùng, dậy mất ~1 phút): đánh thức ngay lúc mở game,
    // tới lúc người chơi bấm tìm trận / tạo phòng thì đã dậy
    SFC.Session.prepare();
    if (forfeited) SFC.Menu.setMsg(app.forfeitText(forfeited), true);
    // nền tảng (SDK đã init): nghe lời mời + báo phòng · mở game bằng lời mời -> OnlineUI.inviteCode có ngay · chơi cùng nhóm ngay
    SFC.Session.watchInvites();
    SFC.OnlineUI.instant = SFC.Platform.instant;
    const start = () => {
      // chưa có tên mà đã đăng nhập tài khoản nền tảng (CrazyGames): lấy tên tài khoản (bạn bè nhận ra nhau), bị lọc thì vẫn tự đặt
      const acc = SFC.Platform.user();
      if (!SFC.Profile.hasName && acc) SFC.Profile.setName(acc.name);
      // lần đầu chơi: đặt tên cho character trước khi vào trang chủ -> PROLOGUE.
      // Đã đặt tên nhưng chưa xem xong PROLOGUE (tắt giữa chừng) -> xem lại từ đầu.
      // Mở game để vào phòng bạn bè / chơi cùng nhóm (OnlineUI.joining): bỏ qua PROLOGUE lần này, vào phòng luôn
      const joining = SFC.OnlineUI.joining;
      if (!SFC.Profile.hasName) SFC.Menu.go('name');
      else if (joining) return;
      else if (SFC.Tutorial.wanted()) SFC.Tutorial.begin(app);
      // hồ sơ đã xong PROLOGUE từ trước khi có bí kíp gia truyền: phát đoạn ông nội trao AURA FARMING 1 lần
      else if (SFC.Tutorial.heirloomWanted()) SFC.Tutorial.playHeirloom(app);
    };
    // chưa chọn ngôn ngữ (lần đầu mở game, kể cả hồ sơ cũ từ trước khi có đa ngôn ngữ): popup chọn ngôn ngữ trước tiên,
    // menu phía sau ẩn đi; chọn xong mới tới đặt tên / PROLOGUE
    // dev: index.html?ulttest[=id] vào thẳng phòng test Tuyệt kỹ (src/ui/ulttest.js)
    if (SFC_DEBUG && SFC.UltTest && /[?&]ulttest\b/.test(location.search)) {
      SFC.UltTest.start(app, new URLSearchParams(location.search).get('ulttest'));
    } else if (SFC_DEBUG && SFC.StoryTest && /[?&]storytest\b/.test(location.search)) {
      // dev: index.html?storytest mở trang test Story · ?storytest=<id Story>.<vòng 0..3> đá thẳng vòng đó (src/ui/storytest.js)
      SFC.StoryTest.boot(app, new URLSearchParams(location.search).get('storytest'));
    } else if (SFC_DEBUG && SFC.RunTest && /[?&]runtest\b/.test(location.search)) {
      // dev: index.html?runtest mở trang test GOAT PATH · ?runtest=match | trial.<id LEGEND> | map (&badges= &legends= &act=; src/ui/runtest.js)
      SFC.RunTest.boot(app, new URLSearchParams(location.search).get('runtest'));
    } else if (langChosen) start();
    else {
      SFC.Menu.el.classList.add('hidden');
      SFC.LangPick.open({ first: true, done: () => { SFC.Menu.el.classList.remove('hidden'); SFC.Menu.render(); start(); } });
    }
    fit();
    window.addEventListener('resize', fit);

    let last = performance.now(), acc = 0;
    function step(now, draw) {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        Input.poll();
        tick(STEP);
        Input.endFrame();
        acc -= STEP;
      }
      let g = null;
      if (app.screen === 'story') g = null;
      else if (app.screen === 'menu') g = app.demo;
      else if (app.mode === 'online') g = SFC.OnlineUI.view(now);
      else g = app.game;
      if (g && draw) {
        SFC.Renderer.render(g);
        if (app.screen !== 'menu') SFC.UI.updateHud(g);
      }
      // nhạc nền: chỉ phát ở ngoài trận (config/music.config.js)
      if (draw) SFC.Music.update(app.screen === 'menu' || (app.screen === 'story' && SFC.Story.active && SFC.Story.music));   // cut scene FOOTBALL STORY giữ nhạc
      // âm thanh khán giả của trận đang hiện (menu: im lặng; tạm dừng / menu online: nhỏ lại)
      if (draw) SFC.Crowd.sound(app.screen === 'menu' || app.screen === 'story' ? null : g, app.screen === 'pause' || (app.mode === 'online' && SFC.OnlineUI.overlay));
    }
    // SETTINGS > FRAME RATE (Settings.fps): chỉ bỏ bớt lần vẽ — mô phỏng + đọc phím vẫn chạy mỗi lần rAF (60 Hz cố định).
    // Lần vẽ kế tiếp hẹn theo nhịp (cộng dồn) để màn 144 Hz vẫn trung bình đúng 60 / 30; dung sai 2 ms để màn 60 Hz không rớt còn 30
    let lastRaf = performance.now(), nextDraw = 0;
    function frame(now) {
      lastRaf = performance.now();
      const cap = SFC.Settings.fps, draw = !cap || now >= nextDraw - 2;
      if (draw && cap) nextDraw = Math.max(nextDraw + 1000 / cap, now);
      step(now, draw);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // Tab bị ẩn / cửa sổ mất focus, thu nhỏ hay bị che: requestAnimationFrame dừng (hoặc bị hãm) -> đồng hồ Worker (không bị trình duyệt
    // hãm) chạy tiếp mô phỏng, không vẽ. Mọi trận (chơi đơn lẫn online — user 2026-10-17: trận không được đứng khi không focus);
    // host online vẫn mô phỏng, khách vẫn nhận / gửi dữ liệu. Menu chỉ chạy khi đang tìm trận (đồng hồ chờ + ghép trận — Menu.searchTick,
    // user 2026-10-17), cut scene thì không. Màn tạm dừng vẫn dừng như cũ (tick)
    const background = () => {
      const now = performance.now();
      const live = app.screen === 'menu' ? !!(SFC.Menu && SFC.Menu.search) : app.screen !== 'story';
      if (live && now - lastRaf > 50) step(now, false);
    };
    try {
      const src = 'setInterval(function(){postMessage(0)},16)';
      const clock = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      clock.onmessage = background;
    } catch (e) {
      // file:// có thể chặn Worker: dùng hẹn giờ của trang (tab ẩn bị hãm còn ~1 lần/giây, nhưng cửa sổ mất focus / bị che vẫn chạy đủ nhịp)
      setInterval(background, 16);
    }
    window.SFC.app = app; // debug
  }

  // chờ font pixel tải xong để background vẽ chữ đúng font + SDK cửa hàng (ngôn ngữ cửa hàng cần trước I18n.init)
  const fonts = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('16px "VT323"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]).catch(() => {})
    : Promise.resolve();
  Promise.all([fonts, SFC.Platform.ready()]).finally(boot);
})();
