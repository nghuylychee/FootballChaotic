/* =========================================================
 * SOCIAL CONFIG — phòng chờ PLAY (party), danh sách bạn bè, chat, mời vào phòng. Logic: src/meta/social.js, UI: src/ui/menu.js (trang 'party').
 *
 * PLACEHOLDER: chưa có server. Bạn bè là người chơi GIẢ do bot đóng vai (sinh 1 lần, lưu ở key sfc_social_v1):
 *  - trạng thái online / đang trong trận / offline đổi ngẫu nhiên theo thời gian,
 *  - chat: bot tự trả lời bằng câu soạn sẵn sau vài giây (có "đang gõ..."),
 *  - mời vào phòng: bạn online nhận lời / từ chối theo tỉ lệ; bạn đang trong trận luôn từ chối.
 * Phòng tối đa partyMax người (tính cả bạn). Trận party: cả phòng chung 1 đội vs đối thủ giả (matchmaking placeholder).
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.social = {
  partyMax: 2,                  // số người tối đa trong phòng (bạn + 1 người bạn)
  friends: 8,                   // số bạn bè giả sinh ra lần đầu
  eloSpread: 250,               // Elo bạn bè giả: quanh Elo của bạn ± bấy nhiêu (không dưới 0)

  // trạng thái: tỉ lệ lúc đầu phiên (online / in match / offline) · mỗi statusEvery giây có statusFlip phần bạn bè đổi trạng thái
  status: { online: 0.45, match: 0.2, offline: 0.35 },
  statusEvery: 25, statusFlip: 0.15,

  // mời: chờ inviteWait giây rồi trả lời · tỉ lệ nhận lời khi đang online
  inviteWait: [1.5, 3.5], acceptChance: 0.8,

  // chat: chờ replyWait giây (hiện "đang gõ...") rồi trả lời · giữ tối đa chatKeep tin mỗi người · độ dài tối đa 1 tin
  replyWait: [1.2, 3.2], chatKeep: 40, chatMax: 60,

  // câu trả lời soạn sẵn (theo ý tin nhắn của bạn: chào / rủ chơi / khen / còn lại). {name} = tên bạn
  replies: {
    hello: ['yo {name}!', 'heyy', 'sup', 'what up {name}', 'ayo'],
    play: ['send invite', 'ok 1 game', 'down, invite me', 'lets gooo', 'sure, quick one'],
    gg: ['gg wp', 'ggs', 'that was nuts', 'ez clap', 'we cooked'],
    other: ['lol', 'fr', 'true', 'haha', 'no way', 'bet', 'ok', 'idk man', 'same', 'real'],
    accept: ['omw', 'joining', 'here!', 'lets run it'],
    decline: ['cant rn sorry', 'next one', 'brb 5 min', 'not now'],
    busy: ['in a match, after this', 'mid game, gimme a sec'],
    after: ['gg! again?', 'one more?', 'nice one', 'run it back'],
  },
  // từ khoá nhận ý tin nhắn của bạn (chữ thường)
  keywords: {
    hello: ['hi', 'hey', 'yo', 'hello', 'sup', 'chao', 'hola', 'oi'],
    play: ['play', 'game', 'join', 'invite', 'match', 'duo', 'ranked', 'choi'],
    gg: ['gg', 'nice', 'wp', 'good game'],
  },
};
