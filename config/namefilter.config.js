/* =========================================================
 * NAME FILTER — chặn tên character tục tĩu / xúc phạm (tên hiện cho người lạ ở trận online: MATCH FOUND, intro, HUD, kết quả).
 * Code: SFC.Profile.nameAllowed (src/meta/profile.js)
 *  - đặt tên / đổi tên: tên bị chặn thì không nhận, báo người chơi chọn tên khác
 *  - nhận hồ sơ người khác (Profile.sanitizePublic: thành viên phòng, ghế trong trận; tên CLB ở Session.guestStart): tên bị chặn -> fallback.
 *    Chỉ lọc ở máy người chơi: máy chủ riêng không nạp file này (scripts/manifest.js), không cần deploy lại khi sửa danh sách
 * Tên chỉ gồm A-Z 0-9 dấu cách _ - (Profile.cleanName). Trước khi so: bỏ dấu cách / _ / -, đổi số kiểu leet (0->O 1->I 3->E 4->A
 * 5->S 7->T 8->B 9->G), so cả dạng gộp chữ lặp (FUUUCK -> FUCK).
 * Danh sách chưa đầy đủ: thêm từ danh sách CrazyGames gợi ý (https://docs.crazygames.com/requirements/multiplayer/) khi cần.
 * Chữ IN HOA.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.nameFilter = {
  // cấm ở bất kỳ đâu trong tên (kể cả dính liền chữ khác)
  anywhere: [
    // English
    'FUCK', 'FUCC', 'FCUK', 'SHIT', 'CUNT', 'NIGGER', 'NIGGA', 'NIGGUH', 'FAGGOT', 'FAGOT', 'RETARD', 'WHORE', 'SLUT',
    'PUSSY', 'PENIS', 'VAGINA', 'DILDO', 'BLOWJOB', 'HANDJOB', 'RAPIST', 'PEDOPHILE', 'PAEDO', 'MOLEST', 'BITCH', 'BASTARD',
    'ASSHOLE', 'JIZZ', 'CUMSHOT', 'ORGASM', 'PORN', 'TWAT', 'WANKER', 'TRANNY', 'NAZI', 'HITLER', 'SIEGHEIL', 'KKK', '1488',
    // Español
    'PENDEJ', 'MIERDA', 'CABRON', 'MARICON', 'CHINGA', 'CULERO', 'GILIPOLLA',
    // Português
    'CARALHO', 'BUCETA', 'VIADO', 'FODASE', 'ARROMBAD', 'CUZAO', 'PIROCA', 'MERDA',
  ],
  // cấm khi đứng thành 1 từ riêng (tách bởi dấu cách / _ / -, cả số nhiều -S / -ES): ngắn, dễ nằm trong từ vô hại (CLASSIC, GRAPE, DICKENS)
  words: [
    'ASS', 'ARSE', 'COCK', 'DICK', 'TIT', 'CUM', 'SEX', 'FAG', 'HOE', 'RAPE', 'PEDO', 'WANK',
    'SPIC', 'KIKE', 'CHINK', 'DYKE', 'COON', 'GOOK',
    'PUTA', 'PUTO', 'CULO', 'VERGA', 'POLLA', 'ZORRA', 'PORRA', 'FODA', 'BOSTA',
  ],
  fallback: 'PLAYER',   // tên thay thế khi hồ sơ người khác mang tên bị chặn
};
