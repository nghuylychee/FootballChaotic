# Sound effects list

Every sound in the game is synthesized at runtime in `src/engine/audio.js`. There are no audio files yet.
This is the shopping list for replacing them with recorded or generated files.

Gameplay code plays a sound with `g.sfx('<name>', arg)`, which calls `SFC.Audio[<name>]`. UI code calls `SFC.Audio.<name>()` directly.
Online matches send the sound name to the other player (`src/net/sync.js`), so keep the names when you swap in files.

Columns:
- **Name**: the `SFC.Audio` method
- **Plays when**: where it fires in the game
- **Current sound**: what the synth makes now
- **Look for**: search terms for a replacement
- **Variants**: how many versions you need

## Gameplay

| Name | Plays when | Current sound | Look for | Variants |
|---|---|---|---|---|
| `touch` | A player takes control of the ball | Soft low blip | ball touch, soft footstep tap | 2–3 |
| `pass` | Pass | Short thud and falling tone | soccer pass, ball kick light | 2–3 |
| `kick(p)` | Shot. `p` is shot power, 0..1 | Thump that gets louder with power | soccer kick, ball strike hard | 3 (light / medium / hard) |
| `wall` | Ball bounces off the boundary wall | Low dull bump | ball bounce wall, thud | 2 |
| `clang` | Ball hits the post or crossbar | Metallic ring, then crowd "ooh" | goal post hit, metal pipe clang | 1–2 |
| `tackle` | Tackle / slide tackle | Short noise thud | body tackle, cloth impact, slide | 2–3 |
| `hit` | Heavy impact (skill hits, knockdowns) | Low heavy boom | punch heavy, body slam, impact | 2–3 |
| `whoosh` | Dash, fast moves, UI swipes | Airy sweep | whoosh, swish, swing | 2–3 |
| `block` | Shield / block skill | Rising square chirp | shield block, deflect, energy shield | 1 |
| `zap` | Electric / laser skills | Falling sawtooth laser | laser zap, electric shock | 1–2 |
| `fire` | Fire skill | Low noise rumble | fire whoosh, flame burst | 1 |
| `save` | Goalkeeper save | Rising tone, then crowd "ooh" | keeper catch, glove save, ball catch | 1–2 |
| `read(g)` | Shot-read timing grade. `g`: 0 PERFECT, 1 GREAT, 2 GOOD | 3 / 2 / 1 rising notes; PERFECT adds a shimmer | rhythm hit perfect, combo chime | 3 (one per grade) |

## Ultimates

Every Ultimate has its own sounds (2026-10-17: before this they all reused `whoosh` / `hit` / `zap` / `wall` and the cut-in was `upgrade`).
Gameplay plays them with `g.sfx('ult', '<key>')`, which calls `SFC.Audio.ult(key)` in `src/engine/ultsfx.js` (synth recipes built on `SFC.Audio.synth`).
Online they travel by name like every other sound, so the packet format is unchanged. Generic impact sounds (`hit`, `kick`) stay at the impact so pad rumble still works;
the `ult` sound is the part that tells you which Ultimate it is. Loudness was checked with an `OfflineAudioContext` render: big blasts peak ~2–3× a normal `hit`, everything else sits near it.

| Key | Ultimate · when | Sound |
|---|---|---|
| `cut.<school>` | Every Ultimate · cut-in (school of its first tag) | Short stinger per school: runner = fast saw arpeggio, playmaker = major triangle arpeggio, striker = power chord, brawler = punch + low chord, launcher = rising boom, trickster = wobbly sine notes, iron = metallic ring, chaos = random detuned blips |
| `cycle.start` / `cycle.zap` | Light Cycle · start / someone crosses the wall | Electric engine rev · buzzing 60 Hz zap |
| `tiki.start` / `tiki.pass0..3` / `tiki.finale` | Endless Tiki-Taka · start / each pass / final shot | Samba flute run · marimba note rising each pass · chord |
| `meteor.leap` / `meteor.fall` / `meteor.boom` | Meteor Shot | Rising whoosh · falling bomb whistle · deep blast |
| `fists.pop` / `fists.final` | Hundred Fists · every punch / finisher | Machine-gun pops · heavy punch with a ring |
| `moon.stomp` / `moon.float` | Moon Stomp · landing | Thud · floaty theremin |
| `clone.poof` / `clone.strike` | Clone Army | Four staggered puffs + chime · double blip |
| `titan.grow` / `titan.step` | Titan · grow / each giant step | Bass sliding up + rising notes · footstep boom |
| `tilt.creak` | Pitch Tilt | Creaking wobble |
| `awaken` | Every awakened (X4) Ultimate · cut-in, layered over `cut.<school>` (`docs/ULT_AWAKEN.md`) | Low roar sliding up + golden bell notes + wind sweep |
| `cycle.cage` | Storm Cycle · the lightning loop closes | Low blast + buzzing saw + crackles |
| `tiki.twang` | Eternal Tiki-Taka · the harp strings ring at the end of the chain | Fast rising harp strum |
| `meteor.rebound` | Meteor Breaker · the ball bounces back and floats on fire | Sizzle + two warning beeps |
| `fists.charge` | Thousand Fists · wind-up before each chain dash | Rising saw + clenched-fist hiss |
| `moon.lift` | Full Moon Stomp · someone gets lifted by the moving moon | Short rising theremin |
| `clone.legion` / `clone.pop` | Clone Legion · clones stay on the pitch / a clone pops | Three low magic bell notes · puff |
| `titan.grab` / `titan.throw` / `titan.pin` | Mega Titan · grab / throw / someone knocked down like a pin | Metal screech · deep whoosh · wooden bowling clatter |
| `tilt.warn` / `tilt.roll` / `tilt.clang` | Pitch Landslide · warning sign / junk starts rolling / junk hits someone | Double beep · rumbling clatter · metal clang |
| `comet.one` / `comet.two` / `comet.bike` / `comet.strike` | Comet One-Two | Two crisp ticks · spinning whoosh · sparkly strike |
| `dragon.up` / `dragon.roar` | Rising Dragon · uppercut / dragon kick | Rising square sweep · growling roar |
| `hurricane` | Hurricane Kick · whole spin (`params.time`) | Howling wind |
| `smoke.pop` | Smoke Bomb | Pop + long hiss |
| `chain.rattle` / `chain.trip` | Iron Chain · start / someone trips | Chain rattle + clank · metal clink |
| `hammer.spin` / `hammer.slam` | Iron Hammer · each spin turn / slam | Heavy whoosh · blast + steel ring + quake rumble |
| `phase.blink` | Phase Step · each blink | Portal "vwomp" in and out + sparkle |
| `sling.stretch` / `sling.release` | Slingshot | Rubber creak · boing twang |
| `storm.warn` / `storm.bolt` | Thunderstorm · each warning circle / each strike | Tiny tick · thunder crack + rumble |
| `bullet.slow` / `bullet.boom` | Bullet Time · slow-mo starts / shot | Time slowing "bwoom" + heartbeat · sonic boom |
| `rocket.ignite` / `rocket.launch` / `rocket.boom` | Rocket Punch | Engine ignition · rocket jet · explosion |
| `truck.horn` / `truck.engine` / `truck.crash` | Monster Truck · summon / drive (`params.time`) / knocked out | Two-tone horn · engine rumble · crash + debris |
| `boomer.throw` / `boomer.catch` | Mega Boomerang · whole flight / catch | Whirring rotor · wooden clack |
| `puppet.shoot` / `puppet.link` / `puppet.gotcha` / `puppet.snap` | Puppet Master · string flies / linking / puppets / string cut | String zing · tension creak · minor music box · snap |
| `rage.roar` / `rage.stomp` | Rage · roar / each stomp | Ape roar + chest drums · blast + long quake rumble |
| `cannon.fire` / `cannon.whistle` / `cannon.boom` | Cannonball | Cannon boom · falling whistle · big explosion |
| `boulder.summon` / `boulder.grow1..3` / `boulder.miss` / `boulder.crumble` / `boulder.roll` | Boulder Rider | Rock thunk · crunch + rising notes per size · wobble · rocks rattling apart · rolling rumble |
| `ghost.rise` / `ghost.grab` | Ghost Hands | Ghostly "ooo" · snatch |
| `portal.open` / `portal.kick` | Portal Kicks · each portal / each kick | Rising "vwip" · kick through the portal |
| `spike.erupt` | Earth Spike · each eruption | Rock crunch + thud |
| `medusa.hiss` / `medusa.stone` | Medusa Gaze | Snake hiss · stone crackle |
| `vhs.stop` | VHS Rewind · before `rewind` | Tape-stop slide |
| `wall.hand0..2` / `wall.arrive` | Magic Wall Pass · each magic hand / ball arrives | Chime rising per hand · "ta-da" |
| `chicken.ray` / `chicken.bawk` | Chicken Ray · beam / each chicken | Wobbly ray · "bawk-bawk-BAWK" |
| `jack.crank` / `jack.pop` | Jack-in-the-Box · boxes placed / glove pops | Music-box crank tune · spring boing |
| `pinball.flip` / `pinball.ding` | Pinball Kick · launch / each bounce | Flipper clack · bumper bell |
| `panic.spook` / `panic.boo` | Panic Ball · ball released / someone panics | Spooky theremin · falling scream |
| `magnet.drop` / `magnet.hum` | Mega Magnet · falls / pulls | Falling whistle · magnetic hum |
| `stat.slip` | Shared slip status (`CoreStat.slip`): someone falls flat on their back | Shoe squeak + body thud (no punch `hit`: a slip is not a hit) |

## Match flow

| Name | Plays when | Current sound | Look for | Variants |
|---|---|---|---|---|
| `whistle()` | Kickoff, restarts | One short blast | referee whistle short | 1 |
| `whistle(true)` | Full time | Two long blasts | referee whistle final, long whistle | 1 |
| `goal` | Goal scored | Rising 4-note jingle over a noise burst | goal jingle, victory stinger, retro fanfare | 1 |

## FOOTBALL STORY pitch rules

Synth recipes in `src/engine/ultsfx.js`, played with `g.sfx('ult', 'mod.<event>')` from `src/systems/matchmods.js`.

| Name | Plays when | Current sound |
|---|---|---|
| `mod.thunk` | Ball bounces off a plastic stool, or a thrown stool lands (The Uncles) | Short hollow plastic knock |
| `mod.stool` | A stool breaks (hard shot, or a thrown stool hits) | Plastic crack + pieces clattering |
| `mod.honk` | Delivery lane starts flashing (Moped Boys) | Two-tone moped horn, twice |
| `mod.vroom` | A Moped Boy hitches a ride | Engine rev |
| `mod.bell` | School bell, two ghosts swap (School Ghosts) | Electric school bell ring |
| `mod.vanish` | Two School Ghosts turn invisible | Falling ghostly wail + fading hiss |
| `mod.reveal` | A heavy hit on a visible ghost reveals them all | Pop + rising squeak |
| `mod.grab` | Someone picks up a stool | Plastic scrape |
| `mod.stomp` | ANGRY GIANTS (Block Wardens fall behind) | Two deep stomps |
| `mod.hoo` | The giant owl starts opening its eyes (Night Owls) | Two low wobbly "hoo... hoo" |
| `mod.spotted` | The owl's aim locks onto someone running | Shutter click + falling sting |
| `mod.zap` | The owl fires its eye bolt | Falling laser "pew" |
| `mod.beam` | The eye bolt bursts into a laser beam across the pitch (Night Owls) | Sharp crack + long buzzing hum |
| `mod.fizzle` | The bolt is dodged | Short hiss |
| `mod.petrify` | The bolt hits: turned to stone | Grinding crackle, then a heavy stone thud |
| `mod.crumble` | The statue crumbles when it wears off | Rock crunch + falling pebbles |
| `mod.beep` | (unused since the 2026-10-27 SEARCHLIGHT rework) | Double alarm beep |
| `mod.siren` | LOCKDOWN switches on the second searchlight (Tower Guards, GOAT PATH Elite) | Rising-falling siren |
| `mod.sizzle` | You heat up one more notch in the searchlight | Short hiss |
| `mod.scorch` | Too hot: you catch fire | Whoosh of flame + crackles |
| `mod.pat` | One shake while putting the fire out | Soft pat |
| `mod.tick` | DOUBLE DUTCH count-in beat, 3-2-1 (Rope Skippers, GOAT PATH Elite) | Short wood-block tick |
| `mod.slap` | The giant rope starts a sweep across the pitch | Whip crack + low thud |
| `mod.trip` | You trip on the rope (replaces `stat.slip` here) | Squeak, then a body thud |
| `mod.squeak` | An auntie turns on the tap (WASH DAY, Wash Day Aunties) | Squeaky tap |
| `mod.hose` | The water jet sweeps across the pitch | Long hiss of water |
| `mod.douse` | The jet hits you | Splash + droplets |
| `mod.neonwarn` | NEON ARROWS are about to switch (Neon Arcade) | 8-bit two-note blink |
| `mod.neon` | The arrows switch direction | Rising 8-bit arpeggio |
| `mod.domino` | A line of giant dominoes stands up (Domino Club) | Fast clatter of tiles |
| `mod.tile` | A domino falls in the chain | Single wooden clack |
| `mod.stance` | A Tai Chi Master starts charging his giant palm (QI PALM) | Ringing temple bell |
| `mod.palm` | The giant palm shoots down its path | Rising whoosh + deep thud |
| `mod.break` | A heavy hit breaks the charge | Crack + falling bell tone |
| `mod.coo` | Pigeon flock flies over (Pigeon Gang) | Two coos + wing flaps |
| `mod.splat` | A pigeon bomb lands | Wet low splat |
| `mod.flop` | You step in a splat and fall flat (replaces `stat.slip` here) | Squeak, then a wet "SPLAT" + body thud |
| `mod.wind` | Night wind gust starts (Sky Hoppers, THE STORM card) | Long rising-falling howl |
| `mod.spray` | Spray wall starts (Billboard Kids) | Can rattle + hiss |
| `mod.vault` | A Billboard Kid vaults over a spray wall | Hand slap on concrete + whoosh |
| `mod.fall` | A lantern starts falling (Lantern Crew) | Falling whistle |
| `mod.crash` | Lantern hits the ground | Low boom + paper crack |
| `mod.ignite` | Player catches fire (Lantern Crew) | Whoosh up + crackles |
| `mod.lasso` | Noodle twirled overhead (Noodle Kickers) | Repeating whirl |
| `mod.whip` | Noodle lasso thrown | Rising swish |
| `mod.tie` | Player tied up | Rope zip + knot |
| `mod.wiggle` | One wiggle while tied | Short creak |
| `mod.snap` | Breaks free | Snap + two-note pop |
| `mod.shuffle` | Madame Fate shuffles the deck (Fortune Tellers) | Rapid card riffle |
| `mod.card` | The drawn card flips (Fortune Tellers) | Card flip + mystic chime |
| `mod.lightsout` | THE MOON: lights go out | Switch click + power-down buzz |
| `mod.poof` | THE MAGICIAN: ball splits / a fake ball vanishes | Magic smoke puff |
| `mod.wheel` | THE WHEEL: everyone speeds up | Wheel ticks slowing + ding |
| `mod.chomp` | THE RABBITS: a rabbit bites | Snap + squeak |
| `mod.munch` | THE RABBITS: someone grabs the carrot | Crunch crunch |
| `mod.windup` | Wind-up grunt (King Leo's late tackle) | Grunt + rising whoosh |
| `mod.chopup` | Big Mama reaches down with her giant chopsticks (GIANT CHOPSTICKS) | Creaking wood + whoosh |
| `mod.whoosh` | The chopsticks stop and plunge | Fast whoosh |
| `mod.clack` | The chopsticks miss and clack on the ground | Two wooden clacks |
| `mod.pinch` | The chopsticks grab a player (GOTCHA!) | Pinch + two-note jingle |
| `mod.plop` | The player is dropped into the noodle pot | Deep plop + bubbling broth |
| `mod.boing` | The player springs out of the pot | Spring boing |
| `mod.swell` | The sea pulls back before a rogue wave (Rust Buckets) | Low rumble rising |
| `mod.surge` | The wave crashes onto the pitch | Boom + long water rush |
| `mod.splash` | A player is swept by the wave | Short splash + plop |
| `mod.surf` | A Rust Bucket surfs the wave | Whoosh + two quick notes |
| `mod.record` | Flashback scene in the Legends cut scenes | Vinyl crackle + old tune |
| `mod.gust` | Dust devils rise (Grandpa's Squad) | Howling wind swelling up |
| `mod.toss` | A player is thrown into the sky by a dust devil | Rising whoosh + sand rattle |
| `mod.reel` | King Leo turns into his 1976 self | Projector clatter + 3-note fanfare |
| `mod.fuse` | The other Legends fuse into King Leo (FUSION!) | Boom + rising power chord |
| `mod.bolt` | Fused King Leo runs like lightning | Short electric zap |
| `mod.crack` | A hit cracks King Leo's armor | Film crack + snap |
| `mod.burn` | King Leo's armor breaks (FILM BURN!) | Fire whoosh + boom |
| `mod.late` | King Leo's late tackle dash | Studs scraping the ground |

## Crowd

Crowd volume follows the arena's crowd level (`render/crowd.js`). The settings live under `audio.crowd` in `config/game.config.js`.

| Name | Plays when | Current sound | Look for | Variants |
|---|---|---|---|---|
| `crowdLevel` | Looping background during a match | Two layers of filtered noise murmuring | stadium crowd ambience loop, crowd murmur | 1 loop (seamless, 30s+) |
| `crowdRoar` | After a goal | Big rising cheer, ~3s | stadium crowd cheer goal, crowd roar | 1–2 |
| `crowdOoh` | After a save or a shot off the post | Short groan | crowd ooh, crowd disappointed, near miss | 1–2 |
| `crowdApplause` | Full time | Clapping and a light cheer | crowd applause stadium | 1 |

## Menus, upgrades and gacha

| Name | Plays when | Current sound | Look for | Variants |
|---|---|---|---|---|
| `menu` | Move cursor, open or close panels | Tiny blip | UI click, menu select, retro blip | 1–2 |
| `pick` | Confirm a choice | Two-note confirm | UI confirm, accept | 1 |
| `upgrade` | Upgrade, level up, unlock | Rising 3-note arpeggio | level up, power up, upgrade | 1 |
| `tick` | Gacha strip passing each slot, countdowns | Very short click | roulette tick, click short | 1 |
| `reveal(r)` | Gacha / item reveal. `r` is rarity 0..4 | 2–6 note arpeggio; rarity 3+ adds a shimmer | loot reveal, item get, rare drop | 5 (one per rarity) or 2–3 tiers |
| `dismantle` | Dismantle an item | Crunch then rising chirp | item break, salvage, crystal shatter | 1 |

## Music

The menu song (`config/music.config.js`) is sequenced from synth notes. Replacing it is a separate job from the sound effects.

## Notes for sourcing

- Keep the chiptune feel consistent. jsfxr, ChipTone or Bfxr fit the UI and skill sounds. Real recordings fit the crowd, whistle and ball sounds.
- Accept CC0 or CC-BY only. Write each file's source and license below so credits can be added later.
- Export as `.ogg` (with `.mp3` fallback if needed), mono, trimmed with no silence at the start.

## Chosen files

Source: Universal Sound FX (Imphenzia), in `E:/projects/tool-mvps/Assets/Universal Sound FX`. "Random" means pick one of the files at random each time the sound plays.

| Name | Files | Notes |
|---|---|---|
| `touch` | `SPORTS/Soccer/SOCCER_Bounce_Ball_01..04_mono.wav`, random | |
| `bounce` (new) | Same files as `touch`, random | Ball hitting the ground by itself (`src/entities/ball.js`). Louder the harder it lands |
| `wall` | Same files as `touch`, random | |
| `pass` | `SPORTS/Soccer/SOCCER_Kick_Ball_03..05_mono.wav`, random | |
| `kick(p)` | `SOCCER_Kick_Ball_09` (weak), `_08` (mid), `_07` (strong) | Power 0..1 split in thirds: below 1/3 weak, below 2/3 mid, else strong |
| `punch` (new) | `IMPACTS/Punch/IMPACT_Punch_01..02_mono.wav`, random | Light attack landing on a player. Used to play `tackle`, which still plays for the hard attack wind-up |
| `swing` (new) | `WHOOSHES/Classic/WHOOSH_Quick_mono.wav` | Light attack swing, plays on every jab whether it lands or not. Used to play `whoosh`, which stays synth for dashes and UI. Volume 1.8: the file is ~9 dB quieter than the others |
| `windup` (new) | `FABRIC_CLOTHING/FABRIC_Movement_Fast_01_mono.wav` | Hard attack wind-up (the "!" crouch). Used to play `tackle` |
| `kickSwing` (new) | Step: `HUMAN/Footsteps/Trainers_Asphalt_Run/FOOTSTEP_Trainers_Asphalt_Run_RR2..RR3_mono.wav`, random. Swing: `WHOOSHES/Classic/WHOOSH_Wide_Fast_mono.wav` | Hard attack release; the step and the swing play together, hit or miss. Used to play `whoosh` |
| `hit('hard')` | `IMPACTS/Punch/IMPACT_Punch_08_mono.wav` | Hard kick landing on a player. `Player.hit()` now passes the attack type; every other type keeps the synth `hit` |
| Hard kick on a loose ball | Reuses `kick(0.5)` → `kickMid` | Was silent |

## Suggested files (not chosen yet)

Picked by file name and length only, not by listening. Audition before choosing. All from Universal Sound FX.

| Name | Pick | Alternates |
|---|---|---|
| `clang` | `IMPACTS/Metal/IMPACT_Metal_Cling_Clean` (0.8s) | `_Dual_Tone`, `_Bright` |
| `tackle` | `RETRO_LOFI/RETRO_Melee_Attack_Kick_Punch_01` | `IMPACTS/Punch/IMPACT_Punch_02`, `_10` |
| `hit` | `SPORTS/Boxing/BOXING_Punch_01` | `IMPACT_Punch_04`, `THUDS_THUMPS/THUD_Dark_01` |
| `whoosh` | `WHOOSHES/Classic/WHOOSH_Quick` (0.28s) | `WHOOSH_Fast_Air`, `WHOOSH_Short_02` |
| `block` | `MAGIC_SPELLS/MAGIC_SPELL_Shield` (1s) | — |
| `zap` | `ZAPS/ZAP_Bright_04` (0.2s) | `ZAP_Electric_01` |
| `fire` | `MAGIC_SPELLS/MAGIC_SPELL_Flame_03` (0.55s) | `_02` |
| `save` | `SPORTS/Boxing/BOXING_Pad_01` (glove-like) | `_03` |
| `read(g)` | PERFECT `8BIT/Coin_Collect/8BIT_RETRO_Coin_Collect_Two_Note_Bright_Twinkle`, GREAT `..._Bright_Fast`, GOOD `8BIT/Beeps/8BIT_RETRO_Beep_Short_Bright` | |
| `goal` | `MUSIC_EFFECTS/Solo_Chip_Square/MUSIC_EFFECT_Solo_Chip_Square_Positive_02` (1.36s) | `_01`, `_05` |
| `menu` | `USER_INTERFACES/Clicks_Taps/UI_Click_Tap_01` | `8BIT_RETRO_Beep_1_Very_Short` |
| `pick` | `8BIT/Beeps/8BIT_RETRO_Beep_Glide_Up_Fast` | `UI_Click_Tap_16` |
| `tick` | `UI_Click_Tap_08` (0.02s) | `RETRO_LOFI/LOFI_Tick_01` |
| `upgrade` | `8BIT/Powerups/8BIT_RETRO_Powerup_Spawn_Quick_Climbing` | `RETRO_LOFI/RETRO_Powerup_02` |
| `reveal(r)` | `Solo_Chip_Square_Positive` stingers for r 0–2, `MUSIC_EFFECTS/Solo_Chip_Arp/..._Positive_01–02` for r 3–4 | |
| `dismantle` | `SHATTER/SHATTER_Glass_Medium_02` (0.7s) | `_06` |
| `crowdRoar` | `CROWDS/Medieval_Jousting_Tournament/AUDIENCE_Claps_and_Cheers_09` (9.4s, small crowd) | `_03` (7.1s) |
| `crowdOoh` | `CROWDS/Medieval_Jousting_Tournament/AUDIENCE_Ohh_01` | — |
| `crowdApplause` | `CROWDS/Hall/AUDIENCE_Clapping_Hall_02` (11.7s) | `_08` |

Keep the synth version for these; the pack has nothing that fits:

- `whistle`: only cartoon, train and flute whistles. The current 2100 Hz sine already reads as a referee whistle.
- Crowd murmur loop (`crowdLevel`): only indoor chatter loops and an 8s `CROWDS/Generic/CROWD_Cheer_On_01` loop, which would repeat audibly over a match.

The jousting crowd for `crowdRoar` and `crowdOoh` sounds small. If it's too thin, keep the synth layer under it.

## Sources log

| File | Source | Author | License |
|---|---|---|---|
| `assets/sfx/ball_bounce_1..4.wav` | Universal Sound FX v1.6, `SPORTS/Soccer/SOCCER_Bounce_Ball_01..04_mono.wav` | Imphenzia | Imphenzia license: use in games allowed, no credit needed, no redistributing the raw files |
| `assets/sfx/ball_pass_1..3.wav` | Universal Sound FX v1.6, `SPORTS/Soccer/SOCCER_Kick_Ball_03..05_mono.wav` | Imphenzia | Same as above |
| `assets/sfx/ball_kick_{strong,mid,weak}.wav` | Universal Sound FX v1.6, `SPORTS/Soccer/SOCCER_Kick_Ball_07/08/09_mono.wav` | Imphenzia | Same as above |
| `assets/sfx/punch_light_1..2.wav` | Universal Sound FX v1.6, `IMPACTS/Punch/IMPACT_Punch_01..02_mono.wav` | Imphenzia | Same as above |
| `assets/sfx/swing_light.wav` | Universal Sound FX v1.6, `WHOOSHES/Classic/WHOOSH_Quick_mono.wav` | Imphenzia | Same as above |
| `assets/sfx/hard_windup.wav` | Universal Sound FX v1.6, `FABRIC_CLOTHING/FABRIC_Movement_Fast_01_mono.wav` | Imphenzia | Same as above |
| `assets/sfx/hard_step_1..2.wav` | Universal Sound FX v1.6, `HUMAN/Footsteps/Trainers_Asphalt_Run/FOOTSTEP_Trainers_Asphalt_Run_RR2..RR3_mono.wav` | Imphenzia | Same as above |
| `assets/sfx/hard_swing.wav` | Universal Sound FX v1.6, `WHOOSHES/Classic/WHOOSH_Wide_Fast_mono.wav` | Imphenzia | Same as above |
| `assets/sfx/hard_hit.wav` | Universal Sound FX v1.6, `IMPACTS/Punch/IMPACT_Punch_08_mono.wav` | Imphenzia | Same as above |

Files are listed in `config/game.config.js` under `audio.samples` and played by `sample()` in `src/engine/audio.js`.
