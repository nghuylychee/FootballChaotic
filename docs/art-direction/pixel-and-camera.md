# Pixel size and camera

## One pixel size

- The match canvas is 1x: one canvas pixel is one **game pixel** (the 640×360 view, up to 880×512 on wide screens). Scaling to the screen happens only at the end.
- **Everything on screen shows the same pixel size:** arenas, props, crowd, players, menu scenes, cut scenes.
- There is no half pixel: player motion frames, smears and VFX draw on the same grid as scenery.
- Getting "closer" in a scene means more detail, never bigger pixels.
- Art is never smoothly rotated or scaled. Rotation (airborne players) and zoom (the goal camera) use nearest-pixel sampling.

## The ¾ view

1. **Ground from above, everything standing from the front**, with a thin strip of its top. No side faces, no slanted perspective.
2. **We look over the side and bottom walls.** They show only their top edge. The bottom wall also shows its outside face, which points at the camera.
3. **The farther away, the flatter.** Backdrop layers use fewer colours and less contrast the farther they are. The skyline on the horizon is the palest thing on screen.
4. **Depth comes from shadows**, not from extra faces on props or ground levels. Every standing thing casts a shadow down and to the right ([palette and light](palette-and-light.md)).

## Scale

A player is 24 px tall. Characters have big heads, so size everything against the player, not against real-world sizes.

| Thing | Height |
|---|---|
| Plastic stool | ~6 px |
| Bin, crate | ~10 px |
| Scooter | ~14 px |
| Child | ~18 px |
| Player, adult | 24 px |
| Door | ~32 px |
| One storey, a shopfront | ~46 px |

One storey is the height of the top wall, so a shopfront fits the top wall exactly.

## The room template

Every arena has the same zones, in the same places:

| Zone | Size |
|---|---|
| Sky and backdrop | above the top wall |
| Top wall | 46 px tall, seen from the front |
| Side rims | 16 px, seen from above |
| Bottom rim | 18 px, seen from above, plus its outside face |
| Ground outside the walls | the margins around the room |

New arenas fill these zones; they don't add or move zones. The HUD stays where it is today, not on the walls.

## The edge

The ball bounces off every edge of the pitch, so the edge must look solid enough to explain the bounce.

- **Solid edges** (walls, fences, stalls, containers): a see-through edge such as a lattice, chain-link or net is fine and lets the world show behind it.
- **Open edges** (the street in front of the arcade, the stadium): an invisible wall, with a visible effect where the ball touches it.

## The wide view

- Every arena draws **880×512 game pixels**: the 640×360 view plus 120 px each side and 76 px above and below. That covers 16:9 up to 21:9 ultrawide and 4:3 / 5:4 screens.
- The pitch sits at the same place in every arena: the 640×360 view starts at (120, 76) inside the 880×512 area.
- **The camera follows the screen shape**, in matches and behind the menus. The pitch keeps its size in the middle; a wider or taller screen shows more of the arena around it, up to 880×512 (`render.maxView`). Beyond that (32:9), black bars.

| Screen | Visible area (game px) |
|---|---|
| 16:9 | 640×360 |
| 16:10 | 640×400 |
| 3:2 | 640×426 |
| 4:3 | 640×480 |
| 5:4 | 640×512 |
| 21:9 | ~852×360 |
| 32:9 | 880×360 |

- An arena without 880×512 art shows its ground colour outside the 640×360 view.
- **The UI follows too:** menus and the match HUD stretch to the real screen edges. Screens that are one fixed picture (Story cut scenes, TROPHY ROOM, KIT VAN) stay a centred 640×360 box with their background colour around it.
