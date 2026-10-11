# Director guide: building hook-test clips in parallel

You build a **batch** of clips (e.g. S11–S23). Several batches run at the same time on one machine (6 cores), so stay inside your own files and keep at most **2 headless Chromes** busy at once.

Work from `E:\FootballChaotic\brag-output\hook-test\work\` (all commands below run there). Plans: `../plan.md` (batch 1, what's already done) and `../plan-v2.md` (your clip list). Batch 1's finished clips are in `../out/` and are the quality bar.

## Files: what's yours, what isn't
- **Yours:** `scenes_<batch>.js` (your staged scenes), `edl_<batch>.py` (your cuts and captions), your `frames/<scene>_s<seed>/`, `render_<ID>/`, `stills_<ID>/`, `short_<ID>.wav`, `../out/<ID>.mp4|jpg`, `sheets/<batch>_*`.
- **Read-only (shared):** `scenes.js`, `edl.py`, `comp.html`, `audio.py`, `encode.py`, `render.py`, `build.py`, `look.py`, `sheet.py`, `real.py`, `render_BODY/`, every other batch's files, `../../tools/clip-pack/capture.py`, the game source (`E:\FootballChaotic\src`, `config`). Never edit the game. If a shared tool truly blocks you, say so in your report instead of changing it.
- The web server must be running on `http://127.0.0.1:8765` (`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8765/index.html` → 200). If it isn't, start `python serve.py` in the background. Don't kill it.
- Windows + Git Bash. Use `PYTHONIOENCODING=utf-8` when printing titles with emoji. Python heredocs work (`python - <<'PYEOF' … PYEOF`); for big files use the Write tool.

## 1. Write scenes (`scenes_<batch>.js`)
Each scene is a function that sets up a real match through the game's own code and then drives it every sim step. Template:

```js
/* <batch> scenes: added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js). */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, mark, match, cast, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;
  Object.assign(B.SCENES, {
    /* S11 MELON: the shot turns into a watermelon and splats on the keeper */
    melon() {
      const g = match({});                       // a live 2v2 match, state 'play'
      const { mate, me, o1, o2 } = cast(g);      // me = our player (team 0, attacks the RIGHT goal); o1/o2 = opponents
      const G = g.attackGoal(0);                 // {x: 584, y: 203} right goal centre
      place(me, G.x - 220, G.y, 0); place(o2, G.x - 20, G.y, PI); /* ...everyone you use */
      give(g, me);                               // ball to me
      B.puppets = new Set([o1, o2, mate]);       // puppets skip the real AI: you set their intents
      noAttack(o1, o2, mate);                    // they never punch / kick on their own
      let shot = false;
      B.dir = (dt, g, t) => {                    // runs every sim step after the AI; t = scene time (s)
        if (!shot && t > 0.8) { face(me, G); Act.shoot(g, me, 0.6, 0); shot = true; mark('shot'); }
      };
      B.focusFn = () => (shot ? g.ball : me);    // camera target (what the vertical crop follows)
    },
  });
})();
```

**Geometry** (logical px; the captured frame is 1920×1080 = ×3): pitch x 56–584, y 80–326, centre (320, 203). Team 0 attacks the right goal (x 584, mouth y 164–242); team 1 attacks x 56. Player radius 6. Vertical crop at zoom 2 shows ~180×320 logical px around the focus, so keep the action within ~80 px of the focus.

**Helpers (`BRAG.lib`):** `place(p, x, y, facing)` · `give(g, p)` ball to p · `face(p, q)` · `steer(p, x, y, sprint)` walk toward a point · `still(p)` · `mark('name')` records the first time (shows in the capture log as `marks`, use it to time cuts) · `at(t, fn)` run once at scene time t · `ult(g, p, coreId)` gives the Core with a full ultimate bar · `noAttack(...ps)` · `extra(g, team, n)` adds n more real players to a team (pins, walls of defenders…) · `t0focus(a, b)` midpoint.

**Game API you will use:**
- Player `p`: `x y facing state stateT intent{mx,my,sprint} cd{light,hard} res{rage,ult,momentum} airZ airVz kbx kby radius`. `p.hit({stun, kbx, kby, launch, source, type:'hard'|'light'})` knocks a player around (stun>0 → stunned, drops the ball). `p.giant(scale, 0)` grows/shrinks him (visual + collision; 0 = until changed). `p.glow(color, t)`.
- Actions `Act`: `lightAttack(g,p)` punch · `hardAttack(g,p)` dropkick (wind-up ≈0.2 s, then the kick) · `shoot(g,p,charge 0..1, aimY -1..1)` · `skill(g,p,dx,dy)` dash/dodge (Z) · `quickPass(g,p,dx,dy)`. All return false while on cooldown or not in `normal` state; reset with `p.cd.light = p.cd.hard = 0`.
- Cores: `g.cores.add(p, id)`; ultimates fire with `g.cores.activateUltimate(p)` (needs `p.res.ult = 1`, `ult()` does that) and play their own cut-in banner (~0.6 s). Core ids and descriptions: `config/cores.config.js` (print them: `node -e "const vm=require('vm'),fs=require('fs');const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('../../../config/cores.config.js','utf8'),c);for(const[k,v]of Object.entries(c.SFC_CONFIG.cores.list))console.log(k,v.role,v.name,'-',v.desc.slice(0,80))"`). Behaviours live in `src/systems/cores.js` and `cores-new.js`.
- Ball `g.ball`: `owner x y z vx vy vz skin` · `skin` = `'melon' | 'bowling' | 'chicken' | 'wheel' | 'cube'` (null = ball) · `noPickup.set(p.id, 99)` stops p from picking it up (0 clears) · `kick(p, vx, vy, vz)` · `g.gainPossession(p)` · `g.looseBall(p, dx, dy, speed)`.
- Effects `g.effects` (`E`): `comic(x, y, 'POW!', color, size, t)` big comic word (max 3 on screen; to show one counter, filter `E.V.comics` first, see S9 in scenes.js) · `callout(str, color, t)` banner · `cutIn(p.id, 'NAME', color, 0.8)` ultimate-style cut-in · `combo(x, y, n)` "n HIT!" · `burst(x, y, z, color, n, speed, life)` · `flash(a)` · `shake(a, t)` · `impactFrame()` · `ring` · `bolt(x0,y0,x1,y1)` · `beam` · `vortex` · `portal(x, y, t)` · `clone(pid, x, y, vx, vy, t)` + `popClone(pid, x, y)`; live clones are `E.V.clones` (steer them by setting each clone's `vx vy facing`) · `tint(color, t, a)` · `speedLines`.
- `g.later(t, fn)` · `g.sfx(name)` (logged → the soundtrack plays it: hit, kick, punch, whoosh, zap, wall, whistle, land, goal, …) · `g.field` · `g.teams[i].score` · `g.elapsed`, `g.cfg.match.duration`, `g.finalPush`.
- One player hitting his own teammate: set `B.traitor = p` (scenes.js patches the hit test for that player).

**Read `scenes.js` first.** Its batch-1 scenes (S1–S10: `nopass penalty chicken bowling giant_keeper kickoff goliath clones fists_ball orbit`; G: `juggle g_blackhole`; R echoes: `echo_punch echo_bump aura_faint`) show every trick above in working form.

**Lessons from batch 1 (each one cost a re-take):**
- Keepers save on their own (`PARRY`): if a shot must go in, move the keeper out of the path after the shot or `noPickup` him; if it must be blocked, script it.
- Loose balls get picked up by whoever stands near: `noPickup` everyone who shouldn't touch it.
- A sequence that depends on a chase often never happens (S1 first version): put players close, trigger on `t > x && U.dist(...) < r`, and check `marks` in the log.
- Ultimates/Cores sometimes stop or slow the ball (black hole). If the scene needs the ball to keep going, set its velocity yourself every step until `B.marks.goal`.
- Knockback direction = from the attacker through the victim; to send someone into the net, attack from straight in front.
- Comic text stacks; numbers overlapping looks broken.
- The game shows its own `GOAL!` banner and HUD: fine, it's authentic.
- Captures are deterministic for a given scene + seed. Keep takes ≤ 7 s.

## 2. Look, fix, capture
- Quick look (every 6th frame, 2× crop around the focus, time burned in): `python look.py <scene> <secs> [seed] [every]` → `sheets/<scene>_s<seed>.jpg`. Open the sheet with the Read tool and **look at it**; iterate until the beat reads at a glance.
- Full take (30 fps): `python ../../tools/clip-pack/capture.py .. <scene> <secs> <seed>` → `frames/<scene>_s<seed>/` + marks/sfx in the output. Sheets of a finished take: `python sheet.py <scene>_s<seed> [t0] [t1] [step]`.
- Existing batch-1 takes you may reuse as footage (already in `frames/`): `punch_kick_s7 fists_goal_s7 meteor_goal_s7 t_titan_s7 calm_s7 hook_s7 fists_wall_s7 meteor_mid_s4 aura_pose_s7 t_blackhole_s7 g_blackhole_s7 t_bomb_s7 t_lightning_s7 c2_clutch_s7 t_drop_s7 juggle_s7 nopass_s7 penalty_s7 chicken_s7 bowling_s7 giant_keeper_s7 kickoff_s7 goliath_s7 clones_s7 fists_ball_s7 orbit_s7 echo_punch_s7 echo_bump_s7 aura_faint_s7 fire_goal_s7 meteor_angle_s1`.

## 3. Cut it (`edl_<batch>.py`)
`edl.py` runs every `edl_*.py` with its helpers in scope; just add entries to `EDL`:

```python
# S clips: standalone, corner watermark
EDL['S11'] = S(5.2,
  [seg(0, 1.0, 'melon_s7', 0.0, cam=F(1.9, 0.18)),                     # (v0, v1, take, take time at v0, rate=None, cam=...)
   seg(1.0, 2.6, 'melon_s7', 1.0, rate=0.5, cam=F(2.4, 0.2)),           # slow motion
   seg(2.6, 5.2, 'melon_s7', 1.8, cam=F(1.9, 0.2))],
  [meme('fruit ninja', 0, 1.0, pop=False, size=104),                    # caption on screen from frame 0 (pop=False)
   meme('SPLAT.', 1.1, 2.55, size=120), meme('the keeper:<br>💀', 2.65, 5.2, size=96)],
  [['groove', 0, 1.0, {}], ['calm', 1.0, 2.6, {}], ['groove', 2.6, 5.2, {}]],   # music beds
  [[1.35, 1.4]],                                                        # booms [t, size] on impacts
  nocut=[1.0, 2.6])                                                     # speed changes in one take: no flash
# G clips: own 0-4.0 s, then the shared BODY (already rendered) — use rg(...)
EDL['G11'] = rg([seg(0, 4.0, 'fireball_s7', 0.3, cam=F(2.0, 0.2))],
  [meme('the pitch is<br>lava now', 0, 1.9, pop=False), meme('...', 2.1, 3.95)],
  [['pulse', 0, 0.8, {}], ['groove', 0.8, 4.0, {}]], [[0.8, 1.2]])
```
- `cam=F(zoom, smooth, dx=, dy=)` follows the take's focus; `{'z': 2.3, 'fx': 'focus', 'fy': 'focus'}` holds still on the focus at the segment start; `layout='fit', h=1000, cam={'z': 0.95, 'fx': 320, 'fy': 205}` shows the whole pitch in a window (wide chaos).
- Freeze on an impact: `seg(a, a + 0.25, take, t_hit, rate=0, cam={'z': 2.3, 'fx': 'focus', 'fy': 'focus'})`, with a boom and `mute=[[a, a + 0.25]]` (the music stops dead).
- Music kinds: `groove` (main beat), `pulse` (bass+kick), `tension` (build-up + riser at its end), `calm` (soft keys), `outro`, `ingame`. Extras: `heart=[[t0, t1]]` heartbeat, `crowd=[[t0, t1]]`.
- **Captions:** lowercase meme voice, ≤ 6 words per line-pair, readable ≥ 0.3 s per word, the first one on screen from t = 0 (`pop=False`) because frame 0 is the thumbnail. Sizes 84–120. `<br>` to break lines. Emoji allowed sparingly. Follow the plan's opening caption unless the footage suggests a funnier one; keep the joke in the game's own absurdity.
- S clips 4–7 s; G clips are exactly the `rg(...)` shape (0–4.0 own footage, then BODY). Avoid dead time: if nothing happens for 1 s, cut or speed it up.

## 4. Render, check, build
1. `python edl.py` (prints every clip id; `SKIPPED edl_<batch>.py` means your file raised).
2. Stills before the full render: `python render.py <ID> --stills 0,1.2,2.5,4` → `stills_<ID>/`. Combine a few into one image (PIL) and look at it: caption not colliding with the action, the action in frame, nothing unreadable.
3. `python build.py <ID> <ID> ... --jobs 2` renders, mixes and encodes → `../out/<ID>.mp4` + `.jpg`. Don't pass `BODY`.
4. Review sheet for your batch (8 frames per clip across its length) and look at it. Fix anything that doesn't read, then rebuild only that ID.

## 5. Report
Reply with: the IDs finished, one line per clip (what happens + captions), anything you changed from the plan and why, any clip you're not happy with.
