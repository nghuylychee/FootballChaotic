/* PlayerSprite · torso.js — Thân chuyển động (đã duyệt 2026-11-01, chỉ cho động tác mới: chuyền, sút mạnh, chạy nước rút, bước nặng):
 * thân nghiêng thật, vai vặn ngược hông, lai quần nhấc theo đùi. Thay thân đóng dấu cứng BODY.front khi draw.js cần.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { SHIRT } = Sprite;
  // bản đồ px mịn (scale 1) của thân, gốc như BODY.front (x -5, y -11 ô thế giới). Toạ độ màn hình (không lật theo hướng mặt, như thân đứng):
  //  lean (px mịn): vai đi theo thân (draw đã dịch thân), hông kéo ngược về trên chân -> hàng dưới lệch -lean, hàng giữa lệch dần
  //  twist -1 / 0 / 1: mép tối của áo đổi bên / dày ra, khe ống quần lệch ngược chiều (nhìn lên: chỉ khe quần)
  //  hemL / hemR: lai quần bên đó nhấc lên 1 px mịn (đùi đang nhấc)
  const cache = new Map();
  //  turn (chéo lên, thấy lưng): 1 = nhìn phải, -1 = nhìn trái -> cổ áo sau lệch 1 cột ngược hướng mặt như BODY.bdiag / bdiagL
  function torsoPart(back, lean = 0, twist = 0, hemL = false, hemR = false, turn = 0) {
    const id = [back ? 1 : 0, lean, twist, hemL ? 1 : 0, hemR ? 1 : 0, turn].join();
    let part = cache.get(id);
    if (part) return part;
    let shirt = SHIRT(back);
    if (back && turn) shirt = [turn > 0 ? 'KTtttttTTtK' : 'KTTTttttttK'].concat(shirt.slice(1));
    if (!back && twist > 0) shirt = shirt.map(() => 'KTTTTTTTttK');
    if (!back && twist < 0) shirt = shirt.map(() => 'KtTTTTTTTTK');
    const slit = twist > 0 ? 'KPPPKPPPPPK' : twist < 0 ? 'KPPPPPKPPPK' : 'KPPPPKPPPPK';
    const rows = ['KTKKKKKKKTK'].concat(shirt, ['KtttttttttK', 'KPPPPPPPPPK', slit, 'KKKKKKKKKKK']);
    const fine = [];
    rows.forEach((r) => { const d = r.split('').map((ch) => ch + ch).join(''); fine.push(d, d); });
    const n = fine.length;
    // lai quần: bên nhấc chân thì viền đáy dịch lên 1 px mịn (hàng n - 3 thành viền, hàng cuối trống)
    fine.forEach((row, j) => {
      const s = row.split('');
      for (const [on, a, b] of [[hemL, 0, 11], [hemR, 11, 22]]) {
        if (!on) continue;
        for (let i = a; i < b; i++) { if (j === n - 3 && s[i] !== '.') s[i] = 'K'; if (j === n - 1) s[i] = '.'; }
      }
      fine[j] = s.join('');
    });
    const offs = fine.map((r, j) => Math.round((-lean * j) / (n - 1))), lo = Math.min(0, ...offs), hi = Math.max(0, ...offs);
    part = { x: -10 + lo, y: -22, scale: 1, rows: fine.map((r, j) => '.'.repeat(offs[j] - lo) + r + '.'.repeat(hi - offs[j])) };
    cache.set(id, part);
    return part;
  }
  // vặn thân theo pha đá (hình nhìn phải): lấy đà = vai mở ra sau (-1) · vung = vai xoay theo chân (+1) · về = 0
  const kickTwist = (atk) => (!atk || atk.kp == null ? 0 : atk.kp === 'in' ? (atk.u > 0.4 ? -1 : 0) : atk.kp === 'go' ? (atk.u > 0.25 ? 1 : -1) : atk.u < 0.5 ? 1 : 0);
  // động tác dùng thân chuyển động (bảng KICKS theo atk.kt)
  const MOVING_TORSO = { pass: 1, lob: 1, push: 1, power: 1 };

  Object.assign(Sprite, { torsoPart, kickTwist, MOVING_TORSO });
})();
