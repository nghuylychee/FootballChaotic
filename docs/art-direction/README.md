# Art direction

The game's visual rules: what makes every arena look like one game in one world. Arenas and players are drawn by code, so each rule here ends up as config values and drawing helpers.

| Doc | What it sets |
|---|---|
| [Pillars](pillars.md) | How the game should feel; every visual choice is checked against them |
| [World](world.md) | Why all arenas belong together: one city, one climb |
| [Pixel size and camera](pixel-and-camera.md) | One pixel size, the ¾ view, the scale chart, the room template, the 880×512 wide view |
| [Palette and light](palette-and-light.md) | In-play vs scenery colour, outlines, the floor band, the stage grade, light, shadows, vignette |
| [Village](village.md) | The reference arena, built to these rules and playable in the game |

## Open work

- Redraw the other arenas to the same rules, using the Village code as the kit.
- Spectators are drawn at the one scale (24 px), so arenas need fewer, more individual spectators than today's crowd texture.
- The world doesn't react to the match yet. Big moments (goals, Ultimates) should move it: the crowd jumps or ducks, animals scatter, the edge shakes when the ball hits it.
- Village NPCs need more detail. That's its own pass.
- Menu scenes (TROPHY ROOM, KIT VAN, Story cut scenes) still draw at bigger pixels and must move to the one pixel size.
- Only Village has 880×512 art. Other arenas show their ground colour outside the 640×360 view on non-16:9 screens until they're redrawn.
- Domino Hall: either keep its domino-table pitch as the one fantasy arena, or make it the yard in front of the domino café.

## Words used in these docs

- **Value**: how light or dark a colour is, ignoring hue. Readability is mostly a value problem.
- **Saturation**: how strong a colour is. Grey has none.
- **Outline**: a dark line around a shape. Who gets a black one is a rule ([palette and light](palette-and-light.md)).
- **Pixel size**: how big one art pixel is on screen. Mixing sizes makes things look like they come from different games.
- **¾ view**: ground seen from above, standing things seen from the front with a thin strip of their top.
- **Stage**: everything that isn't in play: sky, ground, walls, houses, trees, props, villagers.
- **In play**: players, the ball, goals, pitch-rule objects, Core and Ultimate props, VFX, popups.
