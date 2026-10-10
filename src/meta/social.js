/* Social — phòng chờ PLAY (party), bạn bè, chat, mời vào phòng (số liệu: config/social.config.js).
 * PLACEHOLDER: bạn bè là người chơi giả do bot đóng vai, sinh 1 lần bằng MainPath.fakePlayer và lưu ở key sfc_social_v1:
 *   { friends: [{ id, name, elo, ovr, ratings, deck, main, look }], chats: { id: [{ me, txt, t }] } }
 * Trạng thái online / trận / offline, phòng, lời mời đang chờ, "đang gõ" chỉ sống trong phiên chạy game.
 * Menu gọi: tick(dt) mỗi khung hình · onChange = hàm vẽ lại khi có gì đổi (bạn vào phòng, tin nhắn mới...).
 */
window.SFC = window.SFC || {};

(function () {
  const C = () => SFC_CONFIG.social;
  const KEY = 'sfc_social_v1';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const now = () => performance.now() / 1000;

  const Social = {
    data: null,
    status: {},        // id -> online | match | offline
    party: [],         // id bạn bè đang trong phòng (không tính bạn)
    pending: {},       // id -> giây (now) sẽ trả lời lời mời
    typing: {},        // id -> giây (now) sẽ gửi tin trả lời
    unread: {},        // id -> số tin chưa đọc
    chatWith: null,    // id đang mở khung chat
    statusT: 0,
    onChange: null,

    /* ---------- lưu / đọc ---------- */
    load() {
      const raw = SFC.Storage.getJSON(KEY, null);
      const known = (id) => !!SFC_CONFIG.cores.list[id];
      const friends = raw && Array.isArray(raw.friends) ? raw.friends.filter((f) => f && f.name && f.look && f.ratings).map((f) => Object.assign(f, {
        deck: Array.isArray(f.deck) ? f.deck.filter(known) : [], elo: Math.max(0, f.elo | 0),
      })) : [];
      this.data = { friends, chats: (raw && raw.chats && typeof raw.chats === 'object') ? raw.chats : {} };
      if (!friends.length) this.generate();
      const S = C().status;
      for (const f of this.data.friends) this.status[f.id] = this.rollStatus(S);
    },
    save() { SFC.Storage.set(KEY, JSON.stringify(this.data)); },
    reset() { SFC.Storage.remove(KEY); this.data = null; this.party = []; this.pending = {}; this.typing = {}; this.unread = {}; },

    // bạn bè giả lần đầu: Elo quanh Elo của bạn, OVR / deck / ngoại hình theo Elo (giống người chơi giả lúc ghép trận)
    generate() {
      const MP = SFC.MainPath, me = MP.state.elo, taken = [SFC.Profile.data.name];
      this.data.friends = [];
      for (let i = 0; i < C().friends; i++) {
        const m = MP.fakePlayer(Math.max(0, Math.round(me + rnd(-C().eloSpread, C().eloSpread))), taken);
        this.data.friends.push({ id: i + 1, name: m.name, elo: m.elo, ovr: m.ovr, ratings: m.ratings, deck: m.deck, main: m.main, look: m.look });
      }
      this.save();
    },
    rollStatus(S) { const r = Math.random(); return r < S.online ? 'online' : r < S.online + S.match ? 'match' : 'offline'; },

    get ready() { return !!this.data; },
    friends() {
      if (!this.data) this.load();
      // online trước, rồi đang trong trận, offline cuối; cùng nhóm xếp theo tên
      const rank = { online: 0, match: 1, offline: 2 };
      return this.data.friends.slice().sort((a, b) => (this.inParty(a.id) ? -1 : 0) - (this.inParty(b.id) ? -1 : 0)
        || rank[this.status[a.id]] - rank[this.status[b.id]] || a.name.localeCompare(b.name));
    },
    friend(id) { return this.data && this.data.friends.find((f) => f.id === id); },
    onlineCount() { return this.data ? this.data.friends.filter((f) => this.status[f.id] !== 'offline').length : 0; },
    changed() { if (this.onChange) this.onChange(); },

    /* ---------- phòng ---------- */
    inParty(id) { return this.party.includes(id); },
    partyFull() { return this.party.length + 1 >= C().partyMax; },
    canInvite(id) { return this.status[id] !== 'offline' && !this.inParty(id) && !this.pending[id] && !this.partyFull(); },
    invite(id) {
      if (!this.canInvite(id)) return false;
      const [a, b] = C().inviteWait;
      this.pending[id] = now() + rnd(a, b);
      this.changed();
      return true;
    },
    // trả lời lời mời: đang trong trận luôn từ chối; online nhận lời theo acceptChance (phòng đầy lúc đó cũng từ chối)
    answerInvite(id) {
      delete this.pending[id];
      const f = this.friend(id);
      if (!f) return;
      const R = C().replies;
      if (this.status[id] === 'online' && !this.partyFull() && Math.random() < C().acceptChance) {
        this.party.push(id);
        this.status[id] = 'online';
        this.say(id, pick(R.accept));
        this.toast(SFC.t('{name} joined your party', { name: f.name }));
      } else {
        this.say(id, pick(this.status[id] === 'match' ? R.busy : R.decline));
        this.toast(SFC.t('{name} declined the invite', { name: f.name }), true);
      }
    },
    kick(id) { this.party = this.party.filter((x) => x !== id); this.changed(); },
    leaveParty() { this.party = []; this.changed(); },
    // người bạn trong phòng -> dữ liệu đồng đội cho trận (MainPath.matchmake): chỉ số / deck / ngoại hình riêng, nhãn Elo
    partyMate(role) {
      const f = this.friend(this.party[0]);
      if (!f) return null;
      return Object.assign(SFC.Mates.spec(f, role), { elo: f.elo, fake: true, friend: true });
    },
    // hết trận party: người bạn nhắn 1 câu (vd. "gg! again?")
    afterMatch() { for (const id of this.party) this.reply(id, 'after'); },

    /* ---------- chat ---------- */
    chat(id) { return (this.data && this.data.chats[id]) || []; },
    openChat(id) { this.chatWith = id; this.unread[id] = 0; this.changed(); },
    closeChat() { this.chatWith = null; this.changed(); },
    push(id, me, txt) {
      const list = this.data.chats[id] = this.chat(id).concat([{ me, txt, t: Date.now() }]).slice(-C().chatKeep);
      if (!me && this.chatWith !== id) this.unread[id] = (this.unread[id] || 0) + 1;
      this.save();
      return list;
    },
    // gửi tin cho bạn bè: bạn online / đang trong trận trả lời sau vài giây theo ý tin nhắn; offline thì không ai trả lời
    send(id, txt) {
      txt = String(txt || '').trim().slice(0, C().chatMax);
      if (!txt || !this.friend(id)) return false;
      this.push(id, true, txt);
      if (this.status[id] !== 'offline') this.reply(id, this.intent(txt));
      this.changed();
      return true;
    },
    intent(txt) {
      const t = txt.toLowerCase(), K = C().keywords;
      for (const k of ['play', 'gg', 'hello']) if (K[k].some((w) => t.includes(w))) return k;
      return 'other';
    },
    // hẹn 1 câu trả lời (hiện "đang gõ..." tới lúc gửi)
    reply(id, kind) {
      const [a, b] = C().replyWait;
      this.typing[id] = { at: now() + rnd(a, b), kind };
    },
    say(id, txt) { this.push(id, false, txt.replace('{name}', SFC.Profile.data.name)); },
    toast(msg, err) { if (SFC.Menu && SFC.Menu.page === 'party') SFC.Menu.setMsg(msg, err); },

    /* ---------- mỗi khung hình ---------- */
    tick(dt) {
      if (!this.data) return;
      const t = now();
      let dirty = false;
      for (const id in this.pending) if (t >= this.pending[id]) { this.answerInvite(+id); dirty = true; }
      for (const id in this.typing) {
        const ty = this.typing[id];
        if (t < ty.at) continue;
        delete this.typing[id];
        this.say(+id, pick(C().replies[ty.kind] || C().replies.other));
        dirty = true;
      }
      // trạng thái đổi dần (bạn đang trong phòng / đang chờ trả lời mời thì giữ nguyên)
      this.statusT += dt;
      if (this.statusT >= C().statusEvery) {
        this.statusT = 0;
        for (const f of this.data.friends) {
          if (this.inParty(f.id) || this.pending[f.id] || Math.random() >= C().statusFlip) continue;
          this.status[f.id] = this.rollStatus(C().status);
          dirty = true;
        }
      }
      if (dirty) this.changed();
    },
  };

  SFC.Social = Social;
})();
