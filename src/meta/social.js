/* Social — phòng chờ PLAY (party), bạn bè, chat, mời vào phòng (số liệu: config/social.config.js).
 * PLACEHOLDER: bạn bè là người chơi giả do bot đóng vai, sinh 1 lần bằng MainPath.fakePlayer và lưu ở key sfc_social_v1:
 *   { friends: [{ id, name, elo, ovr, ratings, deck, main, look, ult }], chats: { id: [{ me, txt, t }] },
 *     sent: [{ name, at }] (lời mời kết bạn đã gửi, chờ trả lời), incoming: [{ name, at }] (lời mời người khác gửi tới) }
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
      // bạn bè lưu từ trước khi có Tuyệt kỹ đặc trưng: bốc 1 Tuyệt kỹ theo Elo của họ
      const isUlt = (id) => known(id) && SFC_CONFIG.cores.list[id].role === 'ult';
      const friends = raw && Array.isArray(raw.friends) ? raw.friends.filter((f) => f && f.name && f.look && f.ratings).map((f) => Object.assign(f, {
        deck: Array.isArray(f.deck) ? f.deck.filter(known) : [], elo: Math.max(0, f.elo | 0),
      }, isUlt(f.ult) ? {} : { ult: SFC.U.pick(SFC.MainPath.ultsAt(Math.max(0, f.elo | 0))) })) : [];
      const reqs = (list) => (Array.isArray(list) ? list : []).filter((r) => r && typeof r.name === 'string' && this.cleanName(r.name))
        .map((r) => ({ name: this.cleanName(r.name), at: +r.at || Date.now() }));
      this.data = { friends, chats: (raw && raw.chats && typeof raw.chats === 'object') ? raw.chats : {}, sent: reqs(raw && raw.sent), incoming: reqs(raw && raw.incoming) };
      if (!friends.length) this.generate();
      const S = C().status;
      for (const f of this.data.friends) this.status[f.id] = this.rollStatus(S);
    },
    save() { SFC.Storage.set(KEY, JSON.stringify(this.data)); },
    reset() { SFC.Storage.remove(KEY); this.data = null; this.party = []; this.pending = {}; this.typing = {}; this.unread = {}; this.answers = {}; },

    // bạn bè giả lần đầu: Elo quanh Elo của bạn, OVR / deck / ngoại hình theo Elo (giống người chơi giả lúc ghép trận)
    generate() {
      const MP = SFC.MainPath, me = MP.state.elo, taken = [SFC.Profile.data.name];
      this.data.friends = [];
      for (let i = 0; i < C().friends; i++) {
        const m = MP.fakePlayer(Math.max(0, Math.round(me + rnd(-C().eloSpread, C().eloSpread))), taken);
        this.data.friends.push({ id: i + 1, name: m.name, elo: m.elo, ovr: m.ovr, ratings: m.ratings, deck: m.deck, main: m.main, look: m.look, ult: m.ult });
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
    // xoá bạn bè: rời phòng, đóng chat, xoá lịch sử chat + trạng thái phiên
    removeFriend(id) {
      const f = this.friend(id);
      if (!f) return null;
      this.party = this.party.filter((x) => x !== id);
      if (this.chatWith === id) this.chatWith = null;
      for (const o of [this.status, this.pending, this.typing, this.unread, this.data.chats]) delete o[id];
      this.data.friends = this.data.friends.filter((x) => x.id !== id);
      this.save();
      this.changed();
      return f;
    },
    leaveParty() { this.party = []; this.changed(); },
    // những người bạn trong phòng -> dữ liệu đồng đội cho trận (MainPath.matchmake), mỗi người 1 vị trí trong roles:
    // chỉ số / deck / ngoại hình / Tuyệt kỹ riêng, nhãn Elo
    partyMates(roles) {
      return this.party.map((id) => this.friend(id)).filter(Boolean).slice(0, roles.length)
        .map((f, i) => Object.assign(SFC.Mates.spec(f, roles[i]), { elo: f.elo, fake: true, friend: true }));
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

    /* ---------- kết bạn bằng username (placeholder) ---------- */
    answers: {},       // tên (chữ hoa) -> giây (now) người được mời trả lời lời mời kết bạn
    incomingT: null,   // giây (now) tới lượt kiểm tra có người gửi lời mời tới không
    cleanName(s) { return SFC.Profile.cleanName(String(s || '')).trim(); },
    same(a, b) { return String(a).toUpperCase() === String(b).toUpperCase(); },
    isFriend(name) { return !!this.data && this.data.friends.some((f) => this.same(f.name, name)); },
    full() { return this.data.friends.length >= C().add.maxFriends; },
    // gửi lời mời kết bạn: trả về { ok } hoặc { ok: false, reason: empty | self | friend | sent | incoming | full }
    sendRequest(raw) {
      const name = this.cleanName(raw), A = C().add;
      if (!name) return { ok: false, reason: 'empty' };
      if (this.same(name, SFC.Profile.data.name)) return { ok: false, reason: 'self' };
      if (this.isFriend(name)) return { ok: false, reason: 'friend' };
      if (this.data.sent.some((r) => this.same(r.name, name))) return { ok: false, reason: 'sent' };
      // người đó cũng đang mời mình -> đồng ý luôn
      if (this.data.incoming.some((r) => this.same(r.name, name))) { this.acceptRequest(name); return { ok: true, name, instant: true }; }
      if (this.full()) return { ok: false, reason: 'full' };
      this.data.sent.push({ name, at: Date.now() });
      this.answers[name.toUpperCase()] = now() + rnd(A.requestWait[0], A.requestWait[1]);
      this.save();
      this.changed();
      return { ok: true, name };
    },
    cancelRequest(name) { this.data.sent = this.data.sent.filter((r) => !this.same(r.name, name)); delete this.answers[name.toUpperCase()]; this.save(); this.changed(); },
    // người kia trả lời lời mình gửi: nhận lời -> thành bạn bè; không thì vẫn chờ (tới khi huỷ)
    answerRequest(name) {
      delete this.answers[name.toUpperCase()];
      if (!this.data.sent.some((r) => this.same(r.name, name)) || Math.random() >= C().add.acceptChance || this.full()) return;
      this.data.sent = this.data.sent.filter((r) => !this.same(r.name, name));
      const f = this.makeFriend(name);
      this.reply(f.id, 'friended');
      this.toast(SFC.t('{name} accepted your friend request', { name }));
    },
    acceptRequest(name) {
      if (!this.data.incoming.some((r) => this.same(r.name, name))) return;
      this.data.incoming = this.data.incoming.filter((r) => !this.same(r.name, name));
      if (this.full()) { this.save(); this.changed(); return; }
      const f = this.makeFriend(name);
      this.reply(f.id, 'friended');
      this.toast(SFC.t('{name} is now your friend', { name }));
    },
    declineRequest(name) { this.data.incoming = this.data.incoming.filter((r) => !this.same(r.name, name)); this.save(); this.changed(); },
    // bạn bè mới: người chơi giả (Elo quanh Elo của bạn) mang đúng tên, đang online
    makeFriend(name) {
      const MP = SFC.MainPath, id = this.data.friends.reduce((n, f) => Math.max(n, f.id), 0) + 1;
      const m = MP.fakePlayer(Math.max(0, Math.round(MP.state.elo + rnd(-C().eloSpread, C().eloSpread))), []);
      const f = { id, name, elo: m.elo, ovr: m.ovr, ratings: m.ratings, deck: m.deck, main: m.main, look: m.look, ult: m.ult };
      this.data.friends.push(f);
      this.status[id] = 'online';
      this.save();
      this.changed();
      return f;
    },
    // người chơi giả gửi lời mời tới mình: tên trong matchmaking.names chưa là bạn / chưa có lời mời
    rollIncoming() {
      const A = C().add, names = SFC_CONFIG.mainPath.matchmaking.names.map((n) => this.cleanName(n)).filter((n) => n
        && !this.isFriend(n) && !this.same(n, SFC.Profile.data.name)
        && !this.data.incoming.some((r) => this.same(r.name, n)) && !this.data.sent.some((r) => this.same(r.name, n)));
      if (!names.length || this.data.incoming.length >= A.incomingMax || this.full() || Math.random() >= A.incomingChance) return;
      const name = pick(names);
      this.data.incoming.push({ name, at: Date.now() });
      this.save();
      this.toast(SFC.t('{name} sent you a friend request', { name }));
      this.changed();
    },

    /* ---------- mỗi khung hình ---------- */
    tick(dt) {
      if (!this.data) return;
      const t = now(), A = C().add;
      let dirty = false;
      for (const k in this.answers) if (t >= this.answers[k]) { this.answerRequest(k); dirty = true; }
      // lời mời đã gửi từ phiên trước (chưa có giờ trả lời trong phiên này) -> hẹn lại
      for (const r of this.data.sent) if (this.answers[r.name.toUpperCase()] == null) this.answers[r.name.toUpperCase()] = t + rnd(A.requestWait[0], A.requestWait[1]) * 3;
      if (this.incomingT == null) this.incomingT = t + rnd(A.incomingFirst[0], A.incomingFirst[1]);
      if (t >= this.incomingT) { this.incomingT = t + rnd(A.incomingEvery[0], A.incomingEvery[1]); this.rollIncoming(); }
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
