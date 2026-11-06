# đo ảnh: saliency (spectral residual trên L, a, b), mật độ cạnh, số họ màu
import sys, os, json
import numpy as np, cv2
from PIL import Image

def load(p):
    return cv2.cvtColor(np.asarray(Image.open(p).convert('RGB')), cv2.COLOR_RGB2BGR)

def saliency(bgr):
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    acc = None
    for c in range(3):
        ch = cv2.resize(lab[..., c], (160, 90), interpolation=cv2.INTER_AREA)
        F = np.fft.fft2(ch)
        logA = np.log(np.abs(F) + 1e-6); ph = np.angle(F)
        sr = logA - cv2.blur(logA, (3, 3))
        s = np.abs(np.fft.ifft2(np.exp(sr + 1j * ph))) ** 2
        s = cv2.GaussianBlur(s, (0, 0), 2.5)
        s = s / (s.max() + 1e-9)
        acc = s if acc is None else acc + s
    acc = acc / acc.max()
    return cv2.resize(acc, (bgr.shape[1], bgr.shape[0]), interpolation=cv2.INTER_CUBIC)

def heat(bgr, s):
    g = cv2.cvtColor(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR).astype(np.float32) * 0.35
    hm = cv2.applyColorMap((np.clip(s, 0, 1) * 255).astype(np.uint8), cv2.COLORMAP_INFERNO).astype(np.float32)
    a = np.clip(s * 1.3, 0, 0.85)[..., None]
    return (g * (1 - a) + hm * a).astype(np.uint8)

def peaks(s, n=6, r=70):
    s = s.copy(); out = []
    for _ in range(n):
        y, x = np.unravel_index(np.argmax(s), s.shape)
        out.append((int(x), int(y), round(float(s[y, x]), 2)))
        cv2.circle(s, (int(x), int(y)), r, 0, -1)
    return out

def edges(bgr, box=None):
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    if box: x0, y0, x1, y1 = box; g = g[y0:y1, x0:x1]
    e = cv2.Canny(g, 60, 140)
    return float((e > 0).mean() * 100)

def hues(bgr, box=None):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    if box: x0, y0, x1, y1 = box; hsv = hsv[y0:y1, x0:x1]
    h, s, v = hsv[..., 0].astype(int) * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    m = (s > 0.45) & (v > 0.45)
    sat_pct = float(m.mean() * 100)
    hist = np.bincount((h[m] // 30) % 12, minlength=12)
    fam = int((hist > max(1, m.size * 0.0008)).sum())
    return fam, round(sat_pct, 2)

if __name__ == '__main__':
    out = {}
    os.makedirs('sal', exist_ok=True)
    for p in sys.argv[1:]:
        name = os.path.splitext(os.path.basename(p))[0]
        b = load(p)
        s = saliency(b)
        cv2.imwrite(os.path.join('sal', name + '.sal.png'), heat(b, s))
        box = (60, 40, 1220, 700)   # trong khung thẻ che (bỏ viền map)
        fam, sat = hues(b, box)
        out[name] = dict(edge=round(edges(b, box), 2), hue_families=fam, saturated_pct=sat, peaks=peaks(s))
        print(name, out[name])
    json.dump(out, open('imgmetrics.json', 'w'), indent=1)
