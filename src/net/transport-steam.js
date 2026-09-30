/* NetSteam — backend Steam: lobby để tìm phòng + P2P (ISteamNetworking) đi qua relay của Steam khi không nối thẳng được.
 * Chỉ có khi chạy bản Electron và steamworks.js khởi động được (electron/preload.js -> window.SFC_STEAM).
 * Mã phòng = 32 bit thấp của lobby id (32 bit cao luôn là LOBBY_HIGH), mã hoá bằng codeChars (transport.js).
 * Giao diện chung: xem transport.js. id khách = steamId64 dạng chuỗi.
 *
 * Callback của steamworks.js đi qua JSON nên steamId 64 bit trong đó bị làm tròn -> không dùng id trong callback,
 * mỗi lần có callback thì đọc lại danh sách thành viên lobby (getMembers trả bigint chính xác).
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;
  const S = () => window.SFC_STEAM;
  const LOBBY_HIGH = 0x01860000n;    // 32 bit cao của mọi Steam lobby id (universe public, loại chat, cờ lobby)
  const LOBBY_PUBLIC = 2;            // matchmaking.LobbyType.Public
  const SEND_RELIABLE = 2;           // networking.SendType.Reliable: đúng thứ tự, không mất gói (sync.js cần vậy)
  const CB = { LobbyChatUpdate: 5, P2PSessionRequest: 6, P2PSessionConnectFail: 7 };   // callback.SteamCallback
  const POLL_MS = 4;
  const PENDING_MAX = 16;            // gói từ người chưa thấy trong lobby: giữ tạm tối đa bấy nhiêu gói / người

  const idOf = (p) => p.steamId64.toString();

  const NetSteam = {
    lobby: null,
    hosting: false,
    code: null,
    handlers: {},
    meId: null,          // steamId64 (bigint) của máy này
    hostId: null,        // khách: steamId64 của host
    members: new Map(),  // id -> steamId64: thành viên lobby lần đọc gần nhất (trừ mình)
    conns: new Map(),    // host: id khách đã gửi gói đầu -> steamId64
    banned: new Set(),   // host: khách đã drop, bỏ qua gói tới khi rời lobby
    pending: new Map(),  // host: id chưa thấy trong lobby -> gói nhận sớm (lobby cập nhật chậm hơn P2P)
    timer: null,
    cbs: [],

    available() { return !!(S() && S().client); },
    message(err) { return SFC.NetCommon.message(err); },
    get client() { return S().client; },

    on(handlers) { this.handlers = handlers || {}; },
    emit(name, a, b) { const h = this.handlers[name]; if (h) h(a, b); },
    get connected() { return this.hosting ? this.conns.size > 0 : !!this.hostId; },
    get id() {
      if (this.hosting) return 'host';
      if (!this.meId) this.meId = this.client.localplayer.getSteamId().steamId64;
      return this.meId.toString();
    },

    /** Tạo phòng -> resolve(mã phòng) */
    async host() {
      this.close();
      let lobby;
      try { lobby = await this.client.matchmaking.createLobby(LOBBY_PUBLIC, N().maxPlayers); }
      catch (e) { console.warn('[steam] createLobby', e); throw { type: 'steam-lobby' }; }
      if ((lobby.id >> 32n) !== LOBBY_HIGH) {
        // không đúng định dạng id đã biết -> mã phòng sẽ sai, báo lỗi thay vì hiện mã hỏng
        console.error('[steam] lobby id ngoài định dạng mong đợi', lobby.id.toString(16));
        try { lobby.leave(); } catch (e) { /* bỏ qua */ }
        throw { type: 'steam-lobby' };
      }
      this.lobby = lobby;
      this.hosting = true;
      this.code = SFC.NetCommon.encodeCode(Number(lobby.id & 0xffffffffn));
      this.start();
      return this.code;
    },

    /** Vào phòng theo mã -> resolve khi đã vào lobby (gói đầu tiên tự mở phiên P2P tới host) */
    async join(code) {
      this.close();
      const n = SFC.NetCommon.decodeCode(code);
      if (n == null) throw { type: 'peer-unavailable' };
      const joining = this.client.matchmaking.joinLobby((LOBBY_HIGH << 32n) | BigInt(n));
      let timer;
      const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej({ type: 'timeout' }), N().connectTimeout * 1000); });
      let lobby;
      try { lobby = await Promise.race([joining, timeout]); }
      catch (e) {
        if (e && e.type === 'timeout') { joining.then((l) => l.leave(), () => {}); throw e; }
        throw { type: 'peer-unavailable' };
      }
      finally { clearTimeout(timer); }
      this.lobby = lobby;
      this.code = code;
      this.hostId = lobby.getOwner().steamId64;
      this.start();
    },

    start() {
      this.meId = this.client.localplayer.getSteamId().steamId64;
      // bỏ gói còn sót của phiên trước (chưa ai trong phòng mới kịp gửi gì)
      const net = this.client.networking;
      let size;
      while ((size = net.isP2PPacketAvailable()) > 0) net.readP2PPacket(size);
      const reg = (cb, fn) => this.cbs.push(this.client.callback.register(cb, fn));
      reg(CB.LobbyChatUpdate, () => this.refreshMembers(true));
      reg(CB.P2PSessionRequest, () => this.refreshMembers(true));
      reg(CB.P2PSessionConnectFail, () => { if (!this.hosting) this.lost(); });
      this.refreshMembers(false);
      this.timer = setInterval(() => this.poll(), POLL_MS);
    },

    // đọc lại thành viên lobby: chấp nhận phiên P2P của họ, báo close cho người đã rời
    refreshMembers(notify) {
      if (!this.lobby) return;
      const now = new Map();
      for (const p of this.lobby.getMembers()) if (p.steamId64 !== this.meId) now.set(idOf(p), p.steamId64);
      const gone = [...this.members.keys()].filter((id) => !now.has(id));
      this.members = now;
      for (const sid of now.values()) this.client.networking.acceptP2PSession(sid);
      if (!notify) return;
      if (!this.hosting) {
        if (this.hostId && !now.has(this.hostId.toString())) this.lost();
        return;
      }
      for (const id of gone) {
        this.banned.delete(id);
        this.pending.delete(id);
        if (this.conns.delete(id)) this.emit('close', id);
      }
      for (const [id, msgs] of [...this.pending]) {
        if (!now.has(id)) continue;
        this.pending.delete(id);
        for (const m of msgs) this.receive(id, now.get(id), m);
      }
    },

    // khách: mất host (host rời lobby / phiên P2P hỏng)
    lost() {
      if (!this.hostId) return;
      this.close();
      this.emit('close', 'host');
    },

    poll() {
      const net = this.client.networking;
      let size;
      while (this.lobby && (size = net.isP2PPacketAvailable()) > 0) {
        const pk = net.readP2PPacket(size);
        let msg;
        try { msg = JSON.parse(S().fromBuffer(pk.data)); } catch (e) { continue; }
        const sid = pk.steamId.steamId64;
        if (!this.hosting) {
          if (this.hostId && sid === this.hostId) this.emit('data', msg, 'host');
          continue;
        }
        const id = sid.toString();
        if (this.members.has(id)) { this.receive(id, sid, msg); continue; }
        const q = this.pending.get(id) || [];
        if (q.length < PENDING_MAX) { q.push(msg); this.pending.set(id, q); }
      }
    },

    // host: gói từ 1 thành viên lobby. Gói đầu = khách mới -> open (online.js chờ gói hello)
    receive(id, sid, msg) {
      if (this.banned.has(id)) return;
      if (!this.conns.has(id)) { this.conns.set(id, sid); this.emit('open', id); }
      this.emit('data', msg, id);
    },

    // khách: gửi cho host · host: gửi cho khách id (bỏ id = gửi mọi khách)
    send(msg, id) {
      if (!this.lobby) return;
      const net = this.client.networking, buf = S().toBuffer(JSON.stringify(msg));
      if (!this.hosting) { if (this.hostId) net.sendP2PPacket(this.hostId, SEND_RELIABLE, buf); return; }
      if (id != null) { const to = this.conns.get(id); if (to) net.sendP2PPacket(to, SEND_RELIABLE, buf); return; }
      for (const to of this.conns.values()) net.sendP2PPacket(to, SEND_RELIABLE, buf);
    },

    // host: ngừng nhận 1 khách (phòng vẫn mở). steamworks.js không có hàm đóng phiên P2P -> chỉ bỏ qua gói của họ
    drop(id) {
      this.conns.delete(id);
      this.banned.add(id);
    },

    close() {
      clearInterval(this.timer);
      this.timer = null;
      for (const h of this.cbs) try { h.disconnect(); } catch (e) { /* bỏ qua */ }
      this.cbs = [];
      if (this.lobby) try { this.lobby.leave(); } catch (e) { /* bỏ qua */ }
      this.lobby = null;
      this.hostId = null;
      this.code = null;
      this.hosting = false;
      this.members.clear();
      this.conns.clear();
      this.banned.clear();
      this.pending.clear();
    },
  };

  SFC.NetSteam = NetSteam;
})();
