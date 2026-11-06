/* =========================================================
 * MOTION CONFIG — nhịp hiện + khoá phím của các màn (review staggered reveal 2026-11-06, docs/ux-motion/README.md, owner chọn phương án A).
 * Chỉ máy người chơi đọc (manifest target game, máy chủ không load) -> đổi số ở đây không cần bump máy chủ.
 * Độ dài / độ trễ từng phần tử nằm ở css/style.css (chú thích "motion review"); ở đây là số JS cần biết: lúc CTA nhận phím, lúc màn
 * coi như hiện đủ (bấm trước lúc đó = hiện đủ ngay, không bấm nút), nhịp đếm số, chuỗi hẹn giờ.
 * 4 nhóm (tần suất vào × cảm xúc): vào nhiều + thấp -> không anim / fade ≤ 0.15s · vào nhiều + cao -> pop phần chính 0.3–0.5s
 * · vào ít + thấp -> fade đơn giản · vào ít + cao -> stagger 1–3s, bấm = hiện đủ.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.motion = {
  lock: 0.3,                // bấm "hiện đủ" xong: CTA còn khoá thêm bấy nhiêu giây (bấm liên tay không trúng luôn nút)

  // màn kết quả nhịp 2 (endscreen.js): bố cục cuối đứng yên, số đếm từ count[0] trong count[1] giây, nút nhận phím từ grace
  results: { count: [0.1, 0.35], grace: 0.5 },

  // thẻ che map GOAT PATH (runmap.js): dur = lúc hiện đủ (CSS .rm-in), cta = lúc nút nhận phím
  run: {
    // màn GEAR (review GEAR 2026-11-06, phương án B; vào nhiều + cảm xúc cao: pop ≤ 0.5s): chọn món · ai đeo (chip món bay lên, người lớn lên)
    // · mở món bỏ ra trong thẻ người đủ ô
    gear: { dur: 0.5, cta: 0.5 },
    gearwho: { dur: 0.5, cta: 0.5 },
    gearswap: { dur: 0.3, cta: 0.3 },
    end: { dur: 2.3, cta: 2.4, gold: [1.25, 0.6] },   // RUN OVER / CHAMPIONS; gold = [bắt đầu, độ dài] đếm số GOLD mang về
    offer: { dur: 1.5, cta: 1.5 },                     // chọn BADGE
    join: { dur: 0.95, cta: 1.0 },                     // LEGEND "Who gets him?"
    act: { dur: 1.1, cta: 1.2 },                       // thẻ ACT
    signHold: 0.75,                                    // ký LEGEND bị bấm bỏ qua: giữ trạng thái cuối bấy nhiêu giây rồi về map
  },

  // mở hộp (gacha.js): tính từ lúc dải quay dừng — kết quả hiện đủ ở reveal, OPEN ANOTHER nhận phím từ cta
  box: { reveal: 1.0, cta: 1.15 },

  // chọn lá Core (draft.js; trước đây 1.53s): lá bay ở fly, ô đầy ở slot, xong ở end, khối build bay xuống thanh kỹ năng trong morph giây.
  // Độ dài trong CSS phải khớp: .card.flying-card 0.3s (= slot - fly), .d-slot.impact 0.25s, .morphing-square 0.3s (= morph), #draft mờ 0.25s
  draft: { fly: 0.1, slot: 0.4, end: 0.55, morph: 0.3 },

  // banner giữa màn (hud.js): vào in giây + giữ dur (tham số banner) + ra out giây
  banner: { in: 0.35, out: 0.3 },

  // NEW ULTIMATE (recipefx.js): lá Tuyệt kỹ lật ở flip, tự đóng ở close
  recipe: { flip: 0.6, close: 2.5 },
};
