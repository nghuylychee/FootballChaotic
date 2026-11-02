# How to implement + record one UX issue (read fully before starting)

UX = docs/ux-review/harness
Harness: UX/HARNESS.md and UX/ux.py (shot / record). BEFORE = the untouched main build at http://localhost:8701 (never stop it, never edit E:\FootballChaotic itself).
AFTER = your own git worktree (you were started inside it; check with `git rev-parse --show-toplevel` and make sure it is NOT E:\FootballChaotic).

## Setup (once)
1. Serve your worktree in the background: `node scripts/serve.js --port <YOUR_PORT>` (run_in_background). Check http://localhost:<YOUR_PORT>/index.html loads.
2. `git status` must be clean at start.

## Per issue, in order
1. Read the finding (UX/review/*.json) and the code. Implement the fix in the worktree. Follow AGENTS.md: Vietnamese code comments, match the surrounding style, balance numbers in config/, pixel-art look, no key letters in player text (Input.label / {action}), tooltips via SFC.Tip, keep the change small and focused on this issue.
   New player-facing strings: add to EVERY pack in src/i18n/ (pt-BR, pt-PT, es, ja), run `node scripts/i18n-check.js` (must pass). Do NOT run build-ja-font.py (the coordinator rebuilds the font once when patches are combined; a binary font in every patch would conflict). Prefer reusing existing strings.
2. Check it in the browser (screenshots with ux.shot against your port). Check both mouse and keyboard where relevant, and that nothing else on the screen broke.
3. Save the patch for THIS issue only: `git diff --binary > UX/patches/<id>.patch` (unstaged = only this issue, because earlier issues are staged), then `git add -A`. Never commit.
4. Write ONE scenario `UX/scenarios/<id>.py` defining `steps(pg, h)` (+ optional QUERY, PROFILE path, PREP). The SAME steps must run on both builds, so drive the UI by things that exist in both (keys, mouse positions, selectors present in both) and keep it 6–18 s. Show the problem clearly: move the mouse slowly onto the thing, press keys with pauses (h.key shows the key name on screen), hold on the important frame ~1 s. Then record both:
   ```
   import sys, json; sys.path.insert(0, UX); from ux import record
   record('http://localhost:8701', steps, UX + '/videos/<id>-before.mp4', query=QUERY, profile=PROFILE)
   record('http://localhost:<YOUR_PORT>', steps, UX + '/videos/<id>-after.mp4', query=QUERY, profile=PROFILE)
   ```
   Look at 2–3 frames of each video (extract with ffmpeg path in ux.FFMPEG: `-ss 3 -frames:v 1 out.png`) to confirm the video shows what you claim. Re-record if not.
5. Write `UX/issues/<id>.json`:
   { "id", "area": "menus|run|match", "screen", "source": "user|agent", "severity": "high|med|low",
     "title": Vietnamese short title,
     "problem": what the player experiences (Vietnamese, 1–3 sentences),
     "goal": what good looks like (1 sentence),
     "why": why it is worth fixing (1–2 sentences, impact on the player),
     "fix": what you actually changed, in player terms first, then the technical gist (2–4 sentences),
     "why_this": why this approach over the alternatives (1–2 sentences),
     "alternatives": ["option — short pro / con", ...] (2–3 items, or [] if none is worth it),
     "files": ["src/ui/x.js", ...],
     "limits": optional caveat (e.g. not checked on gamepad, co-op view untouched),
     "videoNote": optional one-line hint of what to watch in the videos,
     "before": "videos/<id>-before.mp4", "after": "videos/<id>-after.mp4" }
   Vietnamese: casual, clear, short sentences, game terms stay English (Core, GOAT PATH, SHOP…). The owner reads this.

## At the end
- `git diff --cached --stat` = all your issues. Stop your server. Do not commit, do not remove the worktree.
- Reply with: worktree path, port, per issue: id, one line on what changed, any doubt.
