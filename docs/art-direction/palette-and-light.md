# Palette and light

Everything on screen is either **in play** or **stage** (scenery). The stage stays dark and muted so the play is always the brightest, strongest thing on screen.

## In play vs stage

| | In play | Stage |
|---|---|---|
| What | Players, kits, the ball, goals, pitch-rule objects, Core and Ultimate props, VFX, popups | Sky, ground, walls, backdrop, houses, trees, decoration props, villagers, menu scenes |
| Colour | Free | Free, as long as it stays darker and less saturated than the players |
| Outline | Black (`Sprites.OUT`, `#140c16`) | A darker shade of its own colour, never black |

There is no fixed palette.

## The floor band

- Pitch floors stay between **L 30 and L 50** after the stage grade. Dark kits and the black outline read on the low end, light kits and chalk lines on the high end.
- Floor texture (stains, cracks, planks, tiles) stays within **±5 L** of the base colour, in a few large flat patches, never per-pixel noise.
- Floor saturation stays below **45**.
- Night arenas keep the pitch inside the band too. Night darkens the margins and the backdrop, not the pitch.

## Scenery shading

- **Flat and clean.** Ground is flat tones in large patches with clustered tufts; no per-pixel noise or grain.
- **Simple shapes.** Trees and bushes are a few big clumps with 3–4 tones, not leaf-level detail.
- **Muted greens.** Grass is an olive green (Village: `#69784a`, patches `#73834f`), never a bright lawn green.
- **Hue shift.** Shadows lean cool (blue, purple), highlights lean warm (yellow).

## The stage grade

After the stage is drawn, the whole stage gets one colour grade: **22% darker, 18% less saturated, 8% more contrast** (`bright 0.78`, `sat 0.82`, `contrast 1.08`). Players, the ball, VFX and popups are not graded. This keeps the stage heavy and keeps the action the brightest thing on screen.

## Light

- **Every arena is lit from behind and above the top wall, a little left of centre.** By day the sun sits high behind the top wall; at night the lamps, lanterns and floodlights hang on or above it.
- The light is high, so tops of things are brightest and front faces are mid-tone, never dark.
- **Time of day changes the light's colour and how dark the margins get, never its direction:**

| Time | Light colour | Margins and backdrop |
|---|---|---|
| Day | Warm white | Graded stage |
| Afternoon | Golden | Graded stage |
| Dusk | Orange-pink | Darker, the sky glows |
| Night | Warm lamp yellow | Darker; lit pools around each lamp |
| Floodlights | Cool white, the one cool light, kept for the top of the climb | Stands lit, sky dark |

Night means warm lamp pools, never cold neon washes.

## Shadows

Shadows give the arena its depth.

- **Every standing thing casts one**: houses, trees, walls, the top-wall lattice, props, villagers, goals. Flat things (mats, trays, tarps, rims, wires, birds in flight) don't.
- **Direction and length:** a point h px above the ground lands **0.21·h px lower and 0.16·h px to the right**. A 24 px figure casts a 5 px shadow.
- **Shape: one simple blob per object.** The shadow follows the object's rough shape (an oval for a person, a rounded block for a house, a round crown for a tree), never its details (fingers, lattice mesh, wires). Edges are hard pixels.
- **Colour:** `#2a2038` at 38%. All shadows sit in one layer, so where two overlap they don't get darker.
- **Goals** cast the shadow of their frame and net, worked out from the real crossbar and back-frame heights.
- **Players** get a black blob shadow (38%, like the sprite's own shadow in other arenas) at their feet, nudged 1 px down and to the right, and only that one: in an arena with a scene the sprite doesn't draw its own shadow (`PlayerSprite.sceneShadow`). The blob follows the player's state like the old sprite shadow did (`PlayerSprite.groundShadow`): it shrinks and slides further out with jump height, becomes a long ellipse under a body lying on the ground, and stretches along a diving keeper. A player replaced by an Ultimate prop (chicken, King Kong) takes the prop's shadow. The ball's shadow and the landing marker stay directly under the ball, because gameplay needs them exact.

## Vignette

The dark screen-edge vignette stays (`render.vignette` 0.6). It pulls the eye to the pitch and keeps the margins from reading as a bright postcard.
