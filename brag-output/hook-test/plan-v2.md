# Hook test, batch 2: 150 more Shorts (plan 2026-10-10, built 2026-10-11)

## What was actually built (read this first)
- **All 150 are in `out/`** (R11–R60, G11–G60, S11–S60), next to batch 1's 30. Open **`review.html`** in a browser to watch all 180 in a grid with their captions; `share-copy.txt` has a title for every clip.
- The tables below are the plan. The builders kept the plan's idea for almost every row but often **moved the plan's caption to the payoff** and opened on a setup line instead, so the opening caption doesn't give the joke away (e.g. S14 opens `6 defenders on the line`, ends `parking the bus didn't work`). The real captions are in `review.html` / `share-copy.txt`.
- **Rows that changed shape** (because the engine couldn't do it, or it repeated an earlier clip): S13 the wheel laps the chasers; S26 both meteor strikers kick the same fireball; S27 the clones are real players; S28 a normal guy gets squished between two Titans; S38 respawn kills; S42 the chicken jukes everyone and scores; S44 time stop ends in a goal from nowhere; S47 bicycle kick then lands on his back; S51 the three keepers dive the same way ("synchronized diving"); S52 a 10-man free-kick wall jumps; S54 a cartoon fight cloud; S60 a nutmeg on a Titan keeper. G40's hot potato is between teammates; G44 opens with the PROLOGUE cut scene; G51–G60 are caption variants (footage identical to G1, G2, G3, G5, G12, G17, G22, G24, G26, G27).
- **R sources:** 71 clips downloaded (45 searched shorts + 25 clean 4K scene packs + the two batch-1 compilations); 50 moments survived the scan (low resolution, tiny players and uploader text that can't be cropped out disqualified the rest). Every crop was checked so no watermark, caption or emoji shows. Each R clip's in-game echo was matched by meaning (Balotelli "why always me" → the ball hits the same guy three times; Salgado's wild kick at Ronaldinho → Matrix dodge; Alisson at the striker's feet → the keeper dropkicks the striker).
- **Look at these first; the builders were least sure about them:** G21 Freight Train (small knockback), G30 Giant Keeper (only 1.4× growth), G15/G34/G37 (fakes / chaos skins are small at phone size), S12 cube, S15 tiny keeper, S31 trick shot, S35 bad pass, S47, S48, S53, S55, R34 Higuita and R25/R27/R29 (low-resolution sources), R14 (blurred frame 0 from a whip pan).
- **Shared footage across groups** (fine for the test, but don't post them next to each other): R26 reuses S40's take and R59 reuses S16's; R12 and R51 share one SIUUU-then-dropkicked take; G43's payoff is G5's black hole.

# Plan

Same format and rules as batch 1 (`plan.md`): vertical 1080×1920 @30fps, meme captions already on screen at frame 0, real footage muted, the game's own SFX plus a chiptune bed. R and G clips keep **the same shared body** (4.0 → 11.4 s) so batch 2 stays comparable with batch 1. S clips are standalone loops of 4–7 s.

IDs continue from batch 1: **R11–R60, G11–G60, S11–S60** → `out/<ID>.mp4`.

## R11–R60: real hooks (50)
New sources: 45 clips found on YouTube by searching for specific moments and keeping the most-viewed short versions (`work/sources.json`, downloaded video-only to `source/r2/`, never committed). The two compilations from batch 1 (Ronaldo, Zlatan) still hold ~5 unused incidents.

| Moment family | Sources | In-game echo |
|---|---|---|
| Kung-fu kicks and stamps | Cantona 1995, De Jong on Xabi Alonso (2010 final), Pepe ×2, Keane on Haaland, Müller's high kick | dropkick into the wall / Flying Kick |
| Headbutts, bites, punches | Zidane on Materazzi, Suárez on Chiellini, keeper Goss punches a player, Diego Costa vs Fazio | punch / Giant Fist / Hundred Fists |
| Dives and flops | Neymar's roll, Rivaldo 2002, Busquets' peek, a dive at the referee's touch, Cuadrado's red card | the tiniest touch → he flies across the pitch / `*faints*` |
| Power shots | Roberto Carlos 1997 (curve), Hulk ×2, Ronaldo's knuckleball at 1000 fps | Dragon Curl / Meteor Shot / Thunder Kick |
| Bicycle kicks | Zlatan vs England, Rooney's derby goal | Scissor Kick (pierces 2 players) |
| Keepers | Higuita's scorpion, a "world's best" penalty save, Rimando's face save, a keeper knocks himself out, Zieler's punch, the Feyenoord keeper | keeper saves / gets blasted / Giant Keeper |
| Speed and skill | Messi vs USA, Messi vs 8 Atlético players, Mbappé at 39 km/h, Neymar's rainbow flick, Ronaldinho's no-look | Lightning Dash / Shadow Clone / Clone Army |
| Celebrations and aura | Ronaldo SIUUU, Cole Palmer "cold", Haaland, Balotelli "why always me", Rodrygo + Vinícius dance | Aura Farming / Titan |
| Chaos | worst open-goal misses ×2, Haiti keeper's own goal, Maguire's own-goal celebration, clumsy own goal, a referee blocks a goal-bound shot | skits in the game's own style |

Caption pattern as in batch 1: `<who / what> irl:` → `<…> in my game:`. Picks, cut points and echo scenes go into `work/hooks2.json` + `work/echo2.json` after scanning (one pick per source, two where a source holds two clean moments).

## G11–G60: gameplay hooks (50)
One distinct Core / screen per clip wherever the game has it, so batch 2 also tells us **which mechanic hooks best**.

| # | Hook → payoff | Opening caption |
|---|---|---|
| G11 | Fireball: charged shot sets the pitch on fire, defenders hop through the flames | `the pitch is lava now` |
| G12 | Thunder Kick: the lightning ball goes straight through a defender | `it went THROUGH him` |
| G13 | Dragon Curl: the ball bends around the keeper on its own | `the ball has GPS` |
| G14 | Phantom Step: teleport, the defender chases the illusion | `he chased a ghost` |
| G15 | Fake Run: a fake runs the other way, both defenders follow it | `wrong way bro` |
| G16 | Wind Blade: a kick fires a wind slash that drops the carrier | `he kicked the air. the air won` |
| G17 | Aegis Shield blocks a sure goal on the line | `the goal has a shield` |
| G18 | EMP Mine: a defender steps on it and freezes | `watch your step` |
| G19 | Phantom Pass: an unstoppable golden beam through three players | `unstoppable pass` |
| G20 | Sonic Boom: brushing past blasts both defenders away | `he didn't even touch them` |
| G21 | Freight Train: head-on collision, he flies | `human freight train` |
| G22 | Energy Wave: a beam fires with the ball and pushes everyone aside | `kamehameha but football` |
| G23 | Fist Storm: 4 punches in one second | `4 punches. 1 second.` |
| G24 | Giant Fist: a punch 4× bigger than the player | `the fist was bigger than him` |
| G25 | Wall Slam into the wall, the loose ball bounces back to him | `wall: 1. defender: 0.` |
| G26 | Ground Slam: a shockwave launches everyone | `he hit the ground. everyone flew` |
| G27 | Perfect Dodge: the whole pitch slows down, he walks past | `matrix dodge` |
| G28 | Shadow Clone: 2 clones block the lanes | `which one is real?` |
| G29 | Bulldozer: he grows and can't be tackled | `you can't tackle him` |
| G30 | Giant Keeper: our keeper grows when the ball comes near | `our keeper had a growth spurt` |
| G31 | Rubber Arm: yanks the ball from across the pitch | `stretchy arms` |
| G32 | Dragon Uppercut | `uppercut to the moon` |
| G33 | Scissor Kick: bicycle kick that pierces 2 players | `bicycle kick through 2 players` |
| G34 | Ghost Ball: 3 balls, the keeper picks the wrong one | `the keeper picked the wrong ball` |
| G35 | Flying Kick powered by Momentum | `he flew` |
| G36 | Endless Tiki-Taka: 4 auto passes, opponents in slow motion | `they can't touch the ball` |
| G37 | Chaos Ball: the shot turns into a melon / cube / wheel | `the ball turned into a melon` |
| G38 | Warp Walls: the ball enters a portal and comes out the other wall | `the ball teleported` |
| G39 | Counter Attack: win the ball → the whole team surges | `counter attack` |
| G40 | Bomb Ball passed back and forth, explodes on the last touch | `don't pass it to me` |
| G41 | Legend Box gacha: reel spins → legendary reveal | `opening a legendary box` |
| G42 | Character screen: fast costume swaps | `drip check` |
| G43 | Core draft: three superpowers, pick one | `pick your superpower` |
| G44 | Main Path map: story areas as silhouettes | `wait, it has a story mode?` |
| G45 | Final Push: goals count ×2 in the last seconds | `goals count double now` |
| G46 | Titan vs Titan | `kaiju football` |
| G47 | Meteor Drop on two defenders | `2 for 1` |
| G48 | Lightning Dash straight from kickoff → goal | `fastest goal ever` |
| G49 | Keeper full-stretch save (PARRY) | `the keeper said no` |
| G50 | Juggle up to 10 HIT | `10 hit combo` |
| G51–G60 | **Caption variants** of the 10 strongest batch-1/2 hooks: same footage, new opening line | tests the words, not the picture |

## S11–S60: staged skits (50)
| # | Skit | Opening caption |
|---|---|---|
| S11 | The shot turns into a watermelon and SPLATs on the keeper | `fruit ninja` |
| S12 | The ball turns into a cube and rolls like one | `who made this ball` |
| S13 | The ball turns into a wheel and rolls away, everyone chases it | `the ball is running away` |
| S14 | All 6 opponents stand on the goal line; Meteor Shot goes through them anyway | `parking the bus didn't work` |
| S15 | Their keeper is 0.4× size | `budget keeper` |
| S16 | Scorer does a celebration jump, gets dropkicked mid-air | `don't celebrate too early` |
| S17 | Ball rolling into the net, a teammate sprints in and taps it over the line | `my teammate stealing my goal` |
| S18 | Dribbles past everyone… into his own goal | `wrong goal bro` |
| S19 | Finally gets the ball, 4 players dropkick him at once | `when you finally get the ball` |
| S20 | 8 players in a line, one punch, they fall like dominoes | `domino effect` |
| S21 | The ball ricochets off walls, players and portals like a pinball | `pinball mode` |
| S22 | Gravity switches off: everyone floats up slowly | `someone turned off gravity` |
| S23 | The Titan jumps, the whole pitch shakes, everyone falls | `when the big guy jumps` |
| S24 | The ball stops on the goal line, wobbles… then rolls in | `the ball had second thoughts` |
| S25 | The keeper walks off the pitch; empty net; the striker hits the post | `no keeper. still missed.` |
| S26 | Two Meteor Shots collide mid-air | `unstoppable vs unstoppable` |
| S27 | Clone Army vs Clone Army, 16 clones brawl | `clone wars` |
| S28 | Two Titans run into each other | `titan vs titan` |
| S29 | Kickoff → Lightning Dash → goal in one second | `fastest goal in history` |
| S30 | Two defenders dropkick from both sides, he steps back, they hit each other | `they hit each other` |
| S31 | Shot off five walls and in | `trick shot` |
| S32 | The ball hits the keeper's face, BONK, KO, rebound goal | `save with the face` |
| S33 | The guy from the first dropkick comes back as a Titan | `he came back for revenge` |
| S34 | Aura: four players faint in a circle around him | `main character energy` |
| S35 | Teammate passes straight to the opponent | `my teammate's passing` |
| S36 | Goal-line clearance… with a dropkick on the striker | `defending 100` |
| S37 | The keeper dropkicks the striker before the penalty | `keepers in my league` |
| S38 | Whistle blows and the opponent is dropkicked instantly | `spawn kill` |
| S39 | Giant Fist punches the ball out of the stadium | `home run` |
| S40 | The ball hits the same guy three times in a row | `why always me` |
| S41 | 50/50 ball: both players punch each other on repeat | `50/50 ball` |
| S42 | The ball turns into a chicken and runs from everyone | `catch the chicken` |
| S43 | Keeper lying down "asleep" until the shot, then dropkicks it away | `keeper on 1% battery` |
| S44 | Time stops: everyone frozen, one player walks the ball in | `time stop` |
| S45 | Bowling, part 2: one pin left standing, he dropkicks it | `picking up the spare` |
| S46 | Falls dramatically from a tiny touch, gets up, scores | `oscar worthy` |
| S47 | Perfect cross → bicycle kick goal | `when the cross is perfect` |
| S48 | "He's open!" — he's dropkicked the moment the pass arrives | `he WAS open` |
| S49 | The keeper uses Hundred Fists on the striker | `the keeper went super saiyan` |
| S50 | The shot splits into two balls, both go in | `2 goals 1 shot` |
| S51 | Three keepers (Shadow Clone) | `triple keeper` |
| S52 | A wall of 10 clones on the line, the Meteor breaks through | `the wall` |
| S53 | Rubber Arm steals the ball from the other half | `long arm of the law` |
| S54 | All four sprint for a loose ball and collide in the middle | `50/50/50/50` |
| S55 | Dropkicked over the wall into the crowd | `into the stands` |
| S56 | Last second: post, post, in | `last second` |
| S57 | After the goal, clones of the scorer dance in a circle | `celebration` |
| S58 | Bomb ball explodes on the keeper, the ball rolls in | `keeper got bombed` |
| S59 | Everyone dodges a Meteor Shot, it goes in | `everyone dodged` |
| S60 | The keeper is a Titan, the striker is tiny: penalty | `penalty but unfair` |

## How it's built
Same pipeline as batch 1. To build in parallel without stepping on each other, every batch has its own files: `work/scenes_<batch>.js` (scenes), `work/edl_<batch>.py` (cuts and captions). The shared `scenes.js`, `edl.py`, `comp.html` and the shared body stay untouched. Rules for whoever builds a batch: `work/DIRECTOR_GUIDE.md`.
