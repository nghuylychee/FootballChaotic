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

## Match flow

| Name | Plays when | Current sound | Look for | Variants |
|---|---|---|---|---|
| `whistle()` | Kickoff, restarts | One short blast | referee whistle short | 1 |
| `whistle(true)` | Full time | Two long blasts | referee whistle final, long whistle | 1 |
| `goal` | Goal scored | Rising 4-note jingle over a noise burst | goal jingle, victory stinger, retro fanfare | 1 |

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
