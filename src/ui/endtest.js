/* DEV: thử màn kết quả (WIN / LOSE / PROMOTE / DEMOTE / BEAT 1) — gắn vào SFC.UI (ui/matchui.js), mở từ SETTINGS › TEST.
 * Chỉ SFC_DEBUG: scripts/strip-debug.js xoá cả khối khi đóng gói
 */
window.SFC = window.SFC || {};

(function () {
  if (SFC_DEBUG) {
    const { $, CORES } = SFC.UIHelpers;

    Object.assign(SFC.UI, {
        devEndBar(cur) {
          const btns = [
            ['back', '◀ BACK'],
            ['win', 'WIN'],
            ['lose', 'LOSE'],
            ['promote', 'PROMOTE'],
            ['demote', 'DEMOTE'],
            ['outro', 'BEAT 1'],
          ].map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-devend="${k}">${l}</button>`).join('');
          return `<div class="dev-endbar"><span>DEV</span>${btns}</div>`;
        },

        devEndTest(mode = 'win', fromMenu = false) {
          if (mode === 'back') {
            cancelAnimationFrame(this.rwRaf);
            clearTimeout(this.revealTimer);
            clearTimeout(this.outroTimer);
            clearTimeout(this.sbTimer);
            this.pendingReveal = null;
            this.app.toMenu('test');
            return;
          }
          if (mode === 'outro' && this.app.game && this.app.game.state === 'ended') {
            cancelAnimationFrame(this.rwRaf);
            clearTimeout(this.revealTimer);
            clearTimeout(this.sbTimer);
            this.pendingReveal = null;
            if (this.app.game.effects && this.app.game.cfg) {
              this.app.game.effects.shakeA = this.app.game.cfg.fx.shakeShot;
              this.app.game.effects.shakeT = 0.5;
            }
            this.beginOutro(this.app.game);
            return;
          }
          const PF = SFC.Profile, MP = SFC.MainPath, C = SFC_CONFIG.game;
          if (!this._devBackup) {
            this._devBackup = {
              pf: JSON.parse(JSON.stringify(PF.data)),
              mp: JSON.parse(JSON.stringify(MP.state)),
            };
            const origToMenu = this.app.toMenu.bind(this.app);
            this.app.toMenu = (page) => {
              if (this._devBackup) {
                PF.data = JSON.parse(JSON.stringify(this._devBackup.pf));
                MP.state = JSON.parse(JSON.stringify(this._devBackup.mp));
                PF.sandbox = false;
                this._devBackup = null;
                this._devEndMode = null;
              }
              return origToMenu(page);
            };
          } else {
            PF.data = JSON.parse(JSON.stringify(this._devBackup.pf));
            MP.state = JSON.parse(JSON.stringify(this._devBackup.mp));
          }
          PF.sandbox = true;
          this._devEndMode = mode;

          const st = MP.state;
          if (mode === 'demote') {
            if (st.area < 1) st.area = 1;
            st.elo = MP.area(st.area).elo + 2;
            st.id = MP.area(st.area).id;
          } else if (mode === 'promote') {
            const maxA = MP.areas().length - 2;
            if (st.area > maxA) st.area = Math.max(0, maxA);
            const nextElo = MP.area(st.area + 1).elo;
            st.elo = nextElo - 4;
            st.id = MP.area(st.area).id;
            st.best = Math.max(st.best, st.area + 1);
            st.peak = Math.max(st.peak, nextElo + 30);
            MP.backfill(st);
          }

          cancelAnimationFrame(this.rwRaf);
          clearTimeout(this.revealTimer);
          clearTimeout(this.outroTimer);
          clearTimeout(this.sbTimer);
          this.pendingReveal = null;
          SFC.Reveal.active = false;
          SFC.Drill.close();

          const role = this.app.myRole();
          const lb = MP.matchmake(0, role, null);
          const soloIdx = Math.max(0, C.roles.indexOf(lb.role));
          const avatar = Object.assign(PF.avatar(), { role: C.roles[soloIdx] }, this.app.avatarStats());
          SFC_CONFIG.teams.list[SFC_CONFIG.mainPath.playerTeam.id].name = SFC_CONFIG.mainPath.playerTeam.nameFormat.replace('{name}', avatar.name);
          const opts = {
            home: SFC_CONFIG.mainPath.playerTeam.id, away: MP.rivalClub(lb.opps[0].name), difficulty: 'normal',
            aiProfile: lb.aiProfile, mateProfile: lb.aiProfile,
            humanTeam: 0, solo: [soloIdx, null], avatars: [avatar, null], arena: lb.arena,
            coreUnlocks: [PF.unlockedCores(), null], coreFresh: [[], null],
            mates: [lb.mates, lb.opps],
            mainPath: { area: st.area, elo: st.elo, reward: lb.reward, myElo: lb.myElo, oppElo: lb.oppElo, party: false },
          };
          this.app.mode = 'single';
          this.app.lastOpts = opts;
          this.app.screen = 'game';
          const g = new SFC.Game(opts);
          this.app.game = g;
          g.draft = null;
          g.state = 'play';
          g.events.length = 0;

          // đặt vị trí cầu thủ trên sân + cấp Core + chỉ số mẫu
          const spots = [
            [190, 145, 0], [275, 225, -0.3], [360, 165, 0.2],
            [445, 185, Math.PI], [335, 130, 2.8], [240, 200, -2.9],
          ];
          const sampleCores = [
            ['sniper_foot', 'fire_shot', 'cannon_leg', 'leg_day'],
            ['silk_pass', 'eagle_eye', 'one_two'],
            ['safe_hands', 'giant_keeper', 'aegis_wall'],
            ['heavy_hands', 'heavy_boot', 'wall_slam', 'leg_day'],
            ['leg_day', 'phantom_step', 'quick_feet'],
            ['close_control', 'counter_attack', 'rubber_arm'],
          ];
          const win = mode === 'win' || mode === 'promote';
          g.teams[0].score = win ? 3 : 1;
          g.teams[1].score = win ? 1 : 3;
          const winStats = [
            { goals: 2, assists: 1, saves: 0, shots: 5 },
            { goals: 1, assists: 2, saves: 0, shots: 3 },
            { goals: 0, assists: 0, saves: 3, shots: 1 },
          ];
          const loseStats = [
            { goals: 1, assists: 0, saves: 0, shots: 4 },
            { goals: 0, assists: 1, saves: 1, shots: 2 },
            { goals: 0, assists: 0, saves: 1, shots: 1 },
          ];
          g.players.forEach((p, idx) => {
            const [px, py, pf] = spots[idx] || [320, 180, 0];
            p.x = px; p.y = py; p.facing = pf; p.vx = 0; p.vy = 0;
            const cList = sampleCores[idx] || [];
            for (const cid of cList) if (CORES().list[cid]) g.cores.add(p, cid);
          });
          const myOrder = [g.controlled].concat(g.teams[0].players.filter((p) => p !== g.controlled));
          myOrder.forEach((p, i) => { p.mstats = Object.assign({}, (win ? winStats : loseStats)[i]); });
          g.teams[1].players.forEach((p, i) => { p.mstats = Object.assign({}, (win ? loseStats : winStats)[i]); });

          const stayBeat2 = !fromMenu && !this.outroActive && this.current === 'end';
          g.end();
          this.consume(g);
          if (stayBeat2) this.finishOutro();
        },
    });
  }
})();
