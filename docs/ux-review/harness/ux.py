"""Bộ khung chụp / quay UX cho Street Football Chaos (Playwright + Chrome).
Dùng chung cho cả bản trước (main) và bản sau (worktree): chỉ khác base URL.
  shot(base, steps, out)            -> ảnh PNG
  record(base, steps, out_mp4)      -> video MP4 (có con trỏ chuột giả vì Playwright không quay con trỏ thật)
steps(page, h) nhận page + helper H (đi trang, rê chuột, bấm phím, chờ).
"""
import os, json, time, shutil, subprocess, tempfile
from playwright.sync_api import sync_playwright

try:
    import imageio_ffmpeg   # pip install imageio-ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG = 'ffmpeg'   # ffmpeg trong PATH
W, H = 1280, 720

# hồ sơ giữa game: đã xong PROLOGUE, có tên, có gold, vài trận
PROFILE = {"v": 2, "name": "LONG", "level": 9, "xp": 120, "gold": 640, "items": {}, "cores": {},
           "boxes": {}, "tut": {"done": True, "heirloom": True},
           "stats": {"matches": 31, "wins": 18, "draws": 4, "losses": 9, "goals": 57, "boxes": 2}}
SETTINGS = {"lang": "en", "music": 0, "sfx": 0}

CURSOR_JS = r"""
(() => {
  const add = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div'); c.id = '__cur';
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);transition:none';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 14 L10.5 20.5 L13 19.4 L10 13 L16 13 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    window.__curPos = window.__curPos || [-50, -50];
    c.style.left = window.__curPos[0] + 'px'; c.style.top = window.__curPos[1] + 'px';
    const mv = (e) => { window.__curPos = [e.clientX, e.clientY]; c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; };
    window.addEventListener('mousemove', mv, true);
    window.addEventListener('mousedown', () => { c.firstChild.style.transform = 'scale(.85)'; }, true);
    window.addEventListener('mouseup', () => { c.firstChild.style.transform = ''; }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
"""

# phím bấm hiện ở góc (để người xem video biết đang bấm gì)
KEYS_JS = r"""
(() => {
  const add = () => {
    if (document.getElementById('__keys')) return;
    const k = document.createElement('div'); k.id = '__keys';
    k.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:2147483646;pointer-events:none;font:bold 15px/1 monospace;color:#fff;background:rgba(0,0,0,.72);padding:6px 9px;border-radius:5px;display:none;border:1px solid rgba(255,255,255,.4)';
    document.documentElement.appendChild(k);
    let t = 0;
    window.__showKey = (name) => { k.textContent = '⌨ ' + name; k.style.display = 'block'; clearTimeout(t); t = setTimeout(() => k.style.display = 'none', 650); };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
"""


class Helper:
    def __init__(self, page):
        self.p = page
        self.mx, self.my = 640, 360

    def wait(self, ms):
        self.p.wait_for_timeout(ms)

    def js(self, code, arg=None):
        return self.p.evaluate(code, arg) if arg is not None else self.p.evaluate(code)

    def go(self, page_name, wait=500):
        self.p.evaluate(f"SFC.Menu.go({json.dumps(page_name)})")
        self.wait(wait)

    def key(self, name, wait=380, label=None):
        self.p.evaluate(f"window.__showKey && window.__showKey({json.dumps(label or name)})")
        self.p.keyboard.press(name)
        self.wait(wait)

    def move(self, x, y, steps=18, wait=250):
        """Rê chuột mượt tới (x, y) theo toạ độ viewport."""
        self.p.mouse.move(x, y, steps=steps)
        self.mx, self.my = x, y
        self.wait(wait)

    def hover(self, selector, steps=18, wait=350, nth=0, dx=0.5, dy=0.5):
        el = self.p.locator(selector).nth(nth)
        bb = el.bounding_box()
        if not bb:
            raise RuntimeError('không thấy ' + selector)
        self.move(bb['x'] + bb['width'] * dx, bb['y'] + bb['height'] * dy, steps, wait)
        return bb

    def click(self, selector=None, wait=500, nth=0):
        if selector:
            self.hover(selector, nth=nth, wait=150)
        self.p.mouse.down(); self.wait(70); self.p.mouse.up()
        self.wait(wait)

    def shot(self, path):
        self.p.screenshot(path=path)

    def boxes(self, selector):
        return self.p.evaluate("""(s) => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height, cls: e.className, txt: (e.innerText || '').slice(0, 40) }; })""", selector)


def _launch(p, video_dir=None, profile=None, settings=None, extra_init=None):
    b = p.chromium.launch(channel='chrome', args=['--autoplay-policy=no-user-gesture-required'])
    kw = dict(viewport={'width': W, 'height': H})
    if video_dir:
        kw['record_video_dir'] = video_dir
        kw['record_video_size'] = {'width': W, 'height': H}
    ctx = b.new_context(**kw)
    prof = profile if profile is not None else PROFILE
    sett = settings if settings is not None else SETTINGS
    ctx.add_init_script("""(() => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1');
      localStorage.clear();
      localStorage.setItem('sfc_profile_v1', %s); localStorage.setItem('sfc_settings', %s); } })();"""
                        % (json.dumps(json.dumps(prof)), json.dumps(json.dumps(sett))))
    ctx.add_init_script(CURSOR_JS)
    ctx.add_init_script(KEYS_JS)
    if extra_init:
        ctx.add_init_script(extra_init)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.on('console', lambda m: print('CONSOLE', m.text) if m.type == 'error' else None)
    return b, ctx, pg


def _boot(pg, base, query=''):
    pg.goto(base.rstrip('/') + '/index.html' + query)
    pg.wait_for_function('window.SFC && SFC.Menu && SFC.app && document.fonts.status === "loaded"', timeout=20000)
    pg.wait_for_timeout(1200)


def shot(base, steps, out, query='', profile=None, settings=None, extra_init=None):
    with sync_playwright() as p:
        b, ctx, pg = _launch(p, None, profile, settings, extra_init)
        _boot(pg, base, query)
        h = Helper(pg)
        r = steps(pg, h)
        pg.screenshot(path=out)
        b.close()
        return r


def record(base, steps, out_mp4, query='', profile=None, settings=None, extra_init=None, trim_start=0.0, speed=1.0):
    """Quay video. trim_start: cắt phần đầu (lúc tải game). Trả về đường dẫn mp4."""
    vdir = tempfile.mkdtemp(prefix='uxv_')
    with sync_playwright() as p:
        b, ctx, pg = _launch(p, vdir, profile, settings, extra_init)
        t0 = time.time()
        _boot(pg, base, query)
        h = Helper(pg)
        # mốc bắt đầu thật: lúc gọi steps (bỏ phần tải game)
        start = time.time() - t0
        steps(pg, h)
        h.wait(400)
        vid = pg.video
        ctx.close()
        src = vid.path()
        b.close()
    ss = max(0.0, start - 0.3) + trim_start
    vf = 'setpts=PTS/%s' % speed if speed != 1.0 else 'null'
    os.makedirs(os.path.dirname(out_mp4) or '.', exist_ok=True)
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-ss', '%.2f' % ss, '-i', src, '-vf', vf, '-an',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out_mp4],
                   check=True)
    shutil.rmtree(vdir, ignore_errors=True)
    return out_mp4
