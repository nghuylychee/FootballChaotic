# UX harness (docs/ux-review/harness)

Python Playwright + installed Chrome, already working. Folder: this file's folder (call it UX).

- `ux.py`: `shot(base, steps, out_png, query='', profile=None)` and `record(base, steps, out_mp4, query='', profile=None)`.
  `steps(page, h)` gets the Playwright page and a `Helper`:
  `h.key('Enter'|'ArrowRight'|'e'|'Escape'...)` (also shows the key name bottom-right in videos), `h.hover(css, nth=)`, `h.click(css, nth=)`,
  `h.move(x, y)`, `h.wait(ms)`, `h.go('pagename')` (= `SFC.Menu.go`), `h.js(code)`, `h.shot(path)`, `h.boxes(css)` (rects + text).
  Videos draw a fake mouse cursor (Playwright does not record the real one). Viewport 1280x720.
- Default save = mid-game profile (name LONG, level 9, PROLOGUE done). `profile=json.load(open(UX+'/profile_run_map.json'))`
  = same profile with a GOAT PATH run in progress, standing on the act 1 map (3 Matchday nodes reachable).
- Example scripts: `s1.py` (home hover), `s2.py` (PLAY tabs), `s4.py`/`s5.py` (start a run: Enter, Enter, click 2 `.pk-bc`, click `.pk-mid [data-rt]`, hold Enter to skip the act scene), `s6.py` (`?runtest=match` → pre-kickoff draft), `s7.py` (KIT VAN via `SFC.RunTest.card('shop')` on `?runtest`).
- Run scripts with `python <file>` from the UX folder (`cd` into it in the same command; the shell resets cwd).
- Main build is served at http://localhost:8701 (do NOT stop it). Ignore the one 404 console line at boot.
- Dev entry points (see AGENTS.md "Commands"): `?runtest` (+ `=map`, `=match`, `=trialcard.<id>`, `=join.<id>`, `=skill.<id>`), `SFC.RunTest.card('shop'|'rest'|'event'|'offer'|'gear'|'legend'|'skill'|'map')`, `?storytest`, `?playtest`, `?ulttest`, `?lang=pseudo`.
  `SFC.app.game` = live match. `SFC.Profile.data` = save (`SFC.Profile.save()`).
- Keyboard: arrows move, Enter confirm, Esc/Backspace back, Q/E switch PLAY tabs.
