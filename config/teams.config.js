/* =========================================================
 * TEAMS CONFIG — bản sắc từng đội.
 * stats: hệ số nhân (1.0 = chuẩn)
 * coreWeights: độ ưu tiên nhóm Core khi random 3 lựa chọn / khi AI chọn
 * aiStyle: thiên hướng AI (slide/body = tần suất xoạc/va chạm)
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.teams = {
  order: ['street_kings', 'neon_strikers', 'cyber_united', 'underground_fc'],

  list: {
    street_kings: {
      name: 'Street Kings',
      short: 'SKG',
      tagline: 'POWER + COMBAT',
      desc: 'Áp sát, phá bóng, thắng bằng sức mạnh.',
      kit: { shirt: '#d7263d', shirtDark: '#8c1427', shorts: '#221b26', accent: '#ffcf3f', gk: '#f08a24', hair: ['#1a1216', '#3b2415', '#f2d16b'] },
      stats: { speed: 0.96, power: 1.15, pass: 0.95, tackle: 1.25, dribble: 0.92, accuracy: 0.95 },
      coreWeights: { combat: 3, shooting: 2, movement: 1, tactical: 1, chaos: 0.6 },
      aiStyle: { slide: 1.6, body: 1.8 },
      players: ['BRUNO', 'TANK', 'KAI'],
    },

    neon_strikers: {
      name: 'Neon Strikers',
      short: 'NEO',
      tagline: 'SPEED + SKILL',
      desc: 'Combo, rê dắt, tạo highlight.',
      kit: { shirt: '#ff3fb4', shirtDark: '#a31a72', shorts: '#1b1f3a', accent: '#3ff6ff', gk: '#b4ff3f', hair: ['#3ff6ff', '#1a1216', '#ff8a3f'] },
      stats: { speed: 1.14, power: 0.95, pass: 1.05, tackle: 0.85, dribble: 1.25, accuracy: 1.05 },
      coreWeights: { movement: 3, shooting: 2, combat: 1, tactical: 1, chaos: 1 },
      aiStyle: { slide: 0.7, body: 0.5 },
      players: ['VEX', 'LUMI', 'ZIP'],
    },

    cyber_united: {
      name: 'Cyber United',
      short: 'CYB',
      tagline: 'TECHNOLOGY',
      desc: 'Kiểm soát, đặt bẫy, chiến thuật.',
      kit: { shirt: '#2fb8ff', shirtDark: '#1a5f9e', shorts: '#e8ecf5', accent: '#c6ff3f', gk: '#7a5cff', hair: ['#d9e2ec', '#1a1216', '#4a4f63'] },
      stats: { speed: 1.0, power: 1.0, pass: 1.2, tackle: 1.05, dribble: 1.0, accuracy: 1.12 },
      coreWeights: { tactical: 3, shooting: 1.5, movement: 1.5, combat: 1, chaos: 0.5 },
      aiStyle: { slide: 0.9, body: 0.8 },
      players: ['UNIT-7', 'ADA', 'NEX'],
    },

    underground_fc: {
      name: 'Underground FC',
      short: 'UFC',
      tagline: 'CHAOS',
      desc: 'Hiệu ứng ngẫu nhiên, phá luật.',
      kit: { shirt: '#6bff4f', shirtDark: '#2f8f2a', shorts: '#3a1f4f', accent: '#b43fff', gk: '#ff3f3f', hair: ['#b43fff', '#ff3f3f', '#1a1216'] },
      stats: { speed: 1.02, power: 1.05, pass: 0.98, tackle: 1.0, dribble: 1.05, accuracy: 0.92 },
      coreWeights: { chaos: 4, combat: 1.5, shooting: 1.5, movement: 1, tactical: 0.8 },
      aiStyle: { slide: 1.2, body: 1.2 },
      players: ['RAT', 'JINX', 'MOLE'],
    },
  },

  // Tông da cho cầu thủ (random theo index)
  skins: ['#f1c7a0', '#d99a6c', '#a86a43', '#6e4428', '#f5d6b8'],
};
