/* =========================================================
 * PRIVACY CONFIG — thông báo quyền riêng tư (SETTINGS > PRIVACY NOTICE, src/ui/menu.js -> renderPrivacy). Giữ nguyên tiếng Anh,
 * không dịch (văn bản pháp lý).
 * lines: '# ...' = tiêu đề mục, còn lại = 1 đoạn. {contact} = contact bên dưới.
 * Sửa nội dung khi game thu thêm dữ liệu (máy chủ trận: server/index.js; lưu máy: docs/SAVE.md).
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.privacy = {
  updated: '2026-10-11',
  contact: 'team41.sfc@gmail.com',   // email liên hệ / yêu cầu xoá dữ liệu
  lines: [
    'Street Football Chaos is made by Team 41. This notice explains what the game stores and shares.',
    '# On your device',
    'Your progress (character name, level, items, Main Path rank) and your settings are saved on your device: in your browser on the web, or in your user data folder on desktop (%APPDATA%\\Street Football Chaos on Windows). Clearing your browser data, or deleting that folder, removes them.',
    'On Steam, Steam Cloud may also back up these save files to your Steam account.',
    'Apart from that, nothing is saved outside your device unless you play online, as described below.',
    '# Online play',
    'When you play an online match, the game connects to our match servers and sends what other players need to see: your character name, appearance, level, Cores, stats and rank. It also sends your controls while you play.',
    'Your IP address is used to connect you and to limit abuse. Our match servers keep it in memory only while you are connected. Our own server logs record matches (room code, game version, score), not names or IP addresses.',
    'Our hosting provider may keep standard connection logs, including IP addresses, for a limited time. In online matches, other participants and the services that connect you may also see your IP address.',
    'Character names shown to other players are filtered for offensive words.',
    '# What we do not do',
    'There are no accounts, email addresses or real names. We do not sell your data and do not use it for advertising.',
    'The website or store you play on has its own privacy policy, which applies to your use of that platform.',
    '# Your data',
    'We do not keep any data that identifies you, so there is nothing for us to look up or delete. Your progress lives on your device (and in Steam Cloud on Steam); you can remove it as described above.',
    '# Children',
    'The game is not directed at children under 13, and we do not knowingly collect personal data from them.',
    '# Changes',
    'If this notice changes, we update the date at the top of this page.',
    '# Contact',
    'Questions? Contact us at {contact}.',
  ],
};
