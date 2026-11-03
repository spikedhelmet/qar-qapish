# Qapishma: roadmap and progress

A record of where the game is going, what's done, and why things were decided the way they were.
Newest entries at the top of each section.

## The game

An original round-based team shooter for 4–6 friends on a home network. One Mac runs the server; everyone plays in the browser, nothing to install. Works on Apple Silicon (M1 and later).

## Roadmap

| # | Milestone | Status |
|---|---|---|
| 1 | Core: movement, LAN play, rifle / pistol / knife, Team Deathmatch | ✅ Done |
| – | Playtest feedback: sprint, slide, aim down sights, announcer | ✅ Done |
| 2 | Classes (Assault, Marksman, Breacher, Runner), sniper / shotgun / SMG, Elimination mode | ✅ Done |
| – | Real assets: animated SWAT soldiers, real guns, asset build pipeline | ✅ Done, playtested |
| – | Weapon feel: closer guns, centered sights, punchier recoil, shell casings | ✅ Done, needs a playtest |
| 3 | Objective mode: plant / defuse a charge at site A or B | ✅ Done, needs a playtest |
| 4 | Grenades: frag, smoke, flashbang | ✅ Done, needs a playtest |
| 5 | Polish: real sounds, map textures, first-person arms, reloads, more maps, settings | 🚧 In progress (reloads, arms, 2nd map, settings, map textures, new guns done) |

### Milestone 5: polish (in progress)
- ~~**Per-weapon reload animations**~~ done (see log).
- ~~**First-person arms**~~ done with the animated gun sets (part 11).
- Real sounds: gunshots, reloads, footsteps, impacts (ASSETS.md §4).
- ~~**Photo textures for the maps**~~ done (see log).
- ~~**Other players' animations**~~ done: recoil and reload were already in, the grenade toss is now added.
- ~~**Second map, key rebinding, graphics quality**~~ done (see log).
- Your recorded announcer lines (ASSETS.md §3).

### Ideas parked for later
- A climb-up animation for other players (Mixamo "Climb Up Wall"); for now they see a quick rise.
- Slide and knife-attack animations (Mixamo).
- Kill-cam, round MVP, match stats.
- Gun skins per team.

## Progress log

### 2026-11-03 · Credit and licence for the FPS SFX pack (`feature/milestone-5`)
- The pack is "FREE FPS SFX" by LMGLolo (lmglolo.itch.io/free-fps-sfx), CC BY-ND 4.0: credit, and no modified copies.
- Its files were being trimmed, filtered and re-leveled by the build. Now they're only converted to AAC (same length, level and stereo). The far-away muffling, footstep softening and volume are applied in the game as the sounds play.
- Credited in the menu's Credits and in ASSETS.md.

### 2026-11-03 · Freight reworked: a tight city block (`feature/milestone-5`)
- **Why:** play-testing found the first version an open field: wide yards and long sightlines around a lone warehouse.
- **Now 56 × 44 m** (was 80 × 60). The warehouse fills the middle, and solid buildings 6–11 m tall close in on every side.
  - **Streets:** 6 m along the north and west, 4 m alleys along the south and east. The fire escape narrows the south alley to 2.4 m.
  - **Attackers** start in a walled back yard (south-west), with three ways out: the west street, the south alley, and a covered hallway through the west buildings to the north street. The hallway has a side room with a window onto the west street.
  - **Defenders** start in a loading court (north-east), reached from the north street and the east alley.
  - **Warehouse** (20 × 18 m, 7 m high):
    - a roller door and a side door onto the west street, a dock door onto the south alley, a door north;
    - a back door east into a storeroom under the mezzanine;
    - a mezzanine door with stairs down the east alley;
    - two pallet rows; the ramp along the south wall and a stair along the north up to the mezzanine and its office;
    - a roof hatch.
  - Cover in the streets: a van, a car, dumpsters, barriers, crates.
- **Checks:**
  - Map check: no open spawn lines, all ground reachable.
  - 60 random wandering runs never got stuck.
  - Walking by script: yard → west street → roller door → ramp → office; yard → hallway → north street → north door → stair; south alley → fire escape → roof → hatch; court → east alley → back door → storeroom; east alley stairs → mezzanine door.
  - That walk found two bugs, now fixed: the fire escape's top landing overlapped its last steps, and the east-alley stairs started against a building.

### 2026-11-03 · Freight map (`feature/milestone-5`)
- **New map "Freight"**, an original warehouse-assault layout, 80 × 60 m, not mirrored. The team's references (a callout overview and a model of an existing game's level) were used only for the kind of map: a defended warehouse with a ramp and an upstairs office, streets and yards outside. Nothing was traced or imported.
  - **Warehouse** (32 × 24 m, 8 m high, concrete to 3.2 m, corrugated cladding above, high window strips):
    - two roller doors onto the loading yard, a dock door to the south lot, doors north and east;
    - pallet rows of different heights with gaps between them;
    - a long ramp along the south wall and a stair on the north, both up to a mezzanine along the east wall;
    - a glass-fronted office on the mezzanine;
    - a hatch in the roof that drops onto the mezzanine (a 4.7 m drop: a little fall damage).
  - **Outside:**
    - A fire escape up the south wall to the roof; vents on the roof for cover.
    - The attackers' rail yard has tracks, two freight wagons and a signal hut. A loading yard with containers and pallets leads to the roller doors.
    - The defenders' truck depot is fenced from the warehouse's corners, with gates north and south, a truck, an office cabin and stairs up to the mezzanine's back door.
    - A street along the north (parked trucks, barriers, a booth); a truck lot along the south (loading docks, trailers, dumpsters).
  - Objective sites: under the mezzanine, and in the truck depot.
- New surface: corrugated metal (the container photo, untinted grey-brown).
- Checks:
  - Map check: no open spawn lines, all ground reachable.
  - 60 random wandering runs never got stuck.
  - Walking by script: yard → roller door → ramp → mezzanine → office; the north stair; fire escape → roof → down the hatch; depot stairs → mezzanine door.

### 2026-11-03 · Jump and landing sounds (`feature/milestone-5`)
- **Jump:** no sound. The pack's jump was a whoosh.
- **Landing:** was a soft-impact recording that sounded like a bounce. It's now both feet on the surface you land on (two footsteps 35 ms apart, slightly deeper and louder than a step).

### 2026-11-03 · Play-test notes: smooth stairs, fall damage, stagger, crates, new sounds (`feature/milestone-5`)
- **Smooth camera on stairs and ladders.** Two parts:
  - Walking down steps now keeps you on the ground. You used to fall off each step for a few frames.
  - The camera eases over each step up or down instead of jumping. It lags a step behind and catches up in a fraction of a second.
  - Measured by script on Bastion's tower stairs: the camera moved at most 0.12 m a frame, which is just the climbing speed; before, it jumped 0.42 m at every step. Ladders: 0.13 m (was 0.39 m).
  - The random-wandering check caught a fall-through-the-floor bug while this was being written, fixed before commit.
- **Ladders** slow you to 30% (the check now looks at your whole footprint, so it notices the steep step just ahead).
- **Fall damage.** The server tracks the highest point while you're in the air and compares it with where you land. Free up to 3.5 m, then 18 HP per meter. Walking off Bastion's walkway (5 m) costs 27; a 12 m fall kills ("Fall" in the kill feed). Tested end to end on the server.
- **Stagger.** A hit cuts your speed at once and slows you for half a second, scaled by damage (a 30 HP hit fully: half speed). Falls don't stagger.
- **Crates:** weathered boards (Planks012), with the frame and brace cut from the photo instead of painted flat. Long crate boxes repeat the face about every 1.25 m.
- **Bastion:** the ropes are gone; the pine by each tower door moved out of the way.
- **Sounds from the team's downloads:**
  - Shotgun shots and pump, 17 boot footsteps on concrete, a jump sound, and a scope sound when the sniper scopes in.
  - More alternatives on the sound board: SPR-208, the pack's sniper shots, the hammer cock, explosions.
  - The two announcer recordings are split into 60 lines to label on the board; the build cuts labelled lines into the announcer folder.

### 2026-11-03 · Bastion map; pines, bushes, grass, boulders, roofs and ladders (`feature/milestone-5`)
- **New map "Bastion"**, built after the team's screenshots of a towered courtyard. 58 × 44 m, mirrored both ways.
  - **Four stone towers** (9 × 9 m, 5 m): a door toward the middle, stairs inside up to a hatch, a ladder outside, and a wooden lookout on top with posts, a railing and a hip roof.
  - **An H-shaped wooden walkway** at lookout height joins the four towers, with planks piled on it for cover; a table and crates under it.
  - **Stone outposts** against the north and south walls, with a door and windows; stacked crates to climb onto the roof.
  - **Gates:** west and east, with a barricade in front of each that covers the spawn.
  - **Around the yard:** low stone walls with a rope between them, fences, crates, pines, dry bushes, boulders and about 900 tufts of tall grass.
- **New props** (`public/js/props.js`, `public/js/trees.js`; placed with builder helpers):
  - `pine()`: a straight trunk with 11–13 whorls of branches, long and drooping low down, short near the tip. Three needle cards on each branch; the needles are drawn in code.
  - `bush()`: green or dry, leaf cards in a low dome. Not solid.
  - `grass()`: tufts of two crossed cards painted from grass-blade photos, scattered clear of everything on the ground. Not solid.
  - `rock()`: a lumpy smoothed sphere with a rock photo; a slightly smaller hidden box is solid.
  - `roof()`: a hip roof with shingles and a wooden underside.
  - `ladder()`: rails and rungs, with hidden steep steps behind (0.4 m rise, 0.2 m deep). You walk up them like stairs, and the game slows you to 40% on them.
- New surfaces: grey stone blocks (Bricks066), shingles (WoodSiding011), rock (Rock030). Leaf and grass sheets: LeafSet030, Foliage001.
- Checks:
  - Map check: no open spawn lines, all ground reachable.
  - 60 random wandering runs never got stuck.
  - Walking by script: in a tower door, up the stairs, out of the hatch, across the walkway into the far tower; up a ladder to a lookout; onto an outpost roof by the crates. That walk found the stair ceiling too low at the 6th step, so the hatch now starts at the 5th.

### 2026-11-03 · Real trees (`feature/milestone-5`)
- The cube trees are gone. Trees are now built in code (`public/js/trees.js`, original):
  - A tapered, slightly bent trunk with a flared foot, 5–7 branches off the upper trunk, each with two side branches.
  - About 170 leaf cards in crossed clusters at the branch ends. Their normals point out from the crown, so it shades as one rounded mass.
  - Photo bark (ambientCG Bark012). Leaves are painted onto the cards at load time from ambientCG's LeafSet005 sheet of single leaves, some darkened as if in shade.
  - About 1,600 triangles a tree; all of a map's trees draw in two calls. A seed picks each tree's shape, so every player sees the same trees.
- Maps place them with `tree(x, z, height)` in the map builder. Only the trunk is solid (an invisible box): you can't walk or shoot through it, but leaves don't stop bullets.
- Free downloadable tree models were too heavy (Poly Haven's lightest is 312k triangles). The ez-tree generator (MIT) would have meant installing outside code, so this is a small builder of our own instead.
- Villa: seven trees, in the front lawn, the back yard, the alley and by the storehouse.
- Fix: the trunk and branch tubes were wound inside out, so you saw the inner side of the far wall and the trunk's foot looked hollow. Faces now point outward (checked over 400 generated trees), rings keep a steady orientation, and the trunk is rooted 0.5 m into the ground.

### 2026-11-03 · Sound and texture pass from play-testing (`feature/milestone-5`)
- **Why some guns sounded hollow or weird:** the recordings are stereo from two mics, and for most guns the mics are partly out of phase (correlation −0.3 to 0), so mixing them to mono cancels part of the sound. All guns except the AK (which mixes well and sounded right) now use the louder mic alone.
- **Pistol:** now a Colt 1911 (.45). **Shotgun:** now a Winchester Model 12. **Pump:** a game-ready shotgun-cock sound instead of the old rack.
- **Shot detection:** gunshot variants are now picked by loudness, so a pump racked between shots in a recording isn't mistaken for a shot.
- **Footsteps** softened: low-passed, a slower start (the click at the front was the crispness), and quieter.
- **Kill confirmation:** a heavy body hit instead of the ding. Hits and headshots keep their tick.
- **Sound board** at `/dev/sounds.html`: every sound in the game, plus alternatives for pistol, shotgun, pump, footsteps and kill, to pick by ear.
- **Textures:**
  - Lawns: a photo-scanned worn lawn (Ground037) instead of a bright, even synthetic one.
  - Hedges and tree tops: clipped box hedge (Moss002).
  - Plastered walls: clean warm-white paint (PaintedPlaster017) instead of the blotchy one.
  - Pool water: darker.

### 2026-11-03 · Villa rebuilt after the schematic; no more getting stuck; window climbing; recorded sounds (`feature/milestone-5`)
- **Getting stuck, found and fixed.** Two causes:
  - The thin ground layers (lawn, paths, floorboards) were solid boxes a few millimeters high, and players stood inside them.
  - When a body touched several boxes at once, movement only looked at the first one. So you could catch on the edge of a floor layer instead of sliding along a wall, or land on a lower box while inside a higher one.
  - Fixes:
    - Ground cover is now `decal()`: drawn, but not solid.
    - Movement considers every box it touches: it steps onto the highest one, slides along the nearest face, and lands on the highest top.
  - Checked with 60 random wandering runs per map (random turns, strafes, sprints and jumps): before the fix, all 60 Villa runs ended with the body inside a box; now none do, on any map.
- **Villa rebuilt after the team's schematic.** Clockwise from the north-west:
  - A barn; the carport where the defenders start; a road in from the west gate; a long walled alley.
  - A storehouse with a locked store, a corridor and a front room.
  - A front lawn; a sunken pool (1.4 m deep, steps at one end, a diving board) beside the house.
  - The house: lounge, dining room and study across the front; a back room and the bedroom behind; a closed garage annex.
  - The back yard where the attackers start.
  - Map check: no open spawn lines, all ground reachable. Walking by script covers the routes, both pool exits, the diving board, and in and out through windows.
- **Climbing through windows** (or over a wall too low to stand under): jump at it while moving toward it. You go up onto the sill ducked, across, and drop down on the far side. Windows are 1.6 m tall with a 0.9 m sill.
- **Sprint** 7.0 → 6.2 m/s.
- **Other players' movement looks smoother:**
  - The animation reads a smoothed velocity, with hysteresis on direction and walk/run, so it no longer flicks between clips on jittery snapshots.
  - Switching between leg cycles keeps the stride's phase, and playback speed eases.
  - Players now send whether they're sprinting and whether they're in the air, so jumps and sprints show for sure. Going up stairs no longer plays the jump animation.
- **Recorded sounds** (CC0) replace the synthesized ones:
  - gunshots, with a far take beyond 30 m;
  - reloads, pump and bolt after shotgun and sniper shots, dry fire;
  - footsteps by surface: concrete, wood, grass, metal;
  - landings, bullet impacts by surface, knife, grenade bounce, explosions, flashbang.
  - `scripts/fetch-sounds.sh` + `scripts/build-sounds.mjs`, 1.2 MB in the game.
- **Server fix:** it clamped every player's height to −1 m or above, which would have shown players in the pool higher than they are.

### 2026-11-02 · Villa map; grass texture (`feature/milestone-5`)
- **New map "Villa"**, an original layout with one theme throughout: a walled estate around a two-storey house. 80 × 60 m.
  - **Street (attackers' spawn):** parked cars and street lamps. Three ways into the grounds: the main gate, a side door by the gazebo, and a collapsed stretch of the estate wall at the west end.
  - **Front garden:** a driveway round a fountain, hedges, trees, statues by the porch, and a gazebo.
  - **The house:**
    - Ground floor: an entrance hall open to the roof, with a grand staircase up to a gallery. Off it are the living room, dining room, library and kitchen, with doors and windows on every side.
    - Upstairs: two bedroom wings with windows over the hall and the gardens, and a balcony over the front garden.
  - **Outbuildings:** a garage on the east side, behind a side passage, and a garden shed on the west.
  - **Back (defenders' spawn):** a terrace, lawn and pool behind the house.
- **Not mirrored.** The defenders are about 10 m from the back doors; the attackers have about 20 m of garden to cross, with three ways in. The objective sites are the living room (A) and the garage (B).
- New surfaces: grass (ambientCG Grass005) for the lawns, hedges and tree tops; plus wooden floorboards and painted pool water.
- Checks:
  - Map check: no open spawn lines, all 15,473 ground cells reachable.
  - Walking it by script: the front door, the stairs up to the gallery, the bedrooms and the balcony; the pool to the kitchen to the garage; the street through the breach into the garden.

### 2026-11-02 · No cut-off shoulder in view (`feature/milestone-5`)
- The arms are cut off at the shoulder, and the shotgun (and a little of the rifle and the SMG's empty reload) showed the cut.
- Found by checking every clip at 11 points on a 16:9 screen for upper-arm vertices in view. The rifle, SMG and shotgun sets now sit closer to the eye and slightly lower, so the guns also look bigger:
  - rifle 5 cm back, 1 cm down;
  - SMG 7 cm back, 1 cm down;
  - shotgun 15 cm back, 7 cm down.
- Result: 0 upper-arm vertices on screen at the hip for every gun. Aiming would still show some on the rifle, but only the sniper aims down sights for now; revisit if aiming comes back.

### 2026-11-02 · Yard: spawn cover (`feature/milestone-5`)
- The map check found 22 open lines between the two Yard spawns, down the middle lane.
- Two 2.4 m walls now stand either side of the middle at each spawn, replacing the two small crates. The crate stack in the middle covers the gap between them, and the far raised deck is too low to see over them.
- Map check: 0 open spawn lines, all ground reachable.

### 2026-11-02 · Old Town map (`feature/milestone-5`)
- **New close-quarters map "Old Town"**, an original layout. It's 64 × 48 m, the smallest map so far.
  - Alleys about 3.5 m wide run between solid 6 m buildings.
  - Buildings you can walk into: a hall with pillars facing the courtyard, with five doorways; two houses with inner rooms; and a chapel with pews, between the two north houses.
  - The middle is a paved courtyard with a well. Market stalls block the east–west alleys in the middle, so there's no straight line from yard to yard.
  - Each team spawns in a walled yard with four ways out: two alleys, a low covered passage and a house door.
  - Mirrored east/west. The objective sites are in the hall and the north house on the defenders' half.
- **New check script for maps** (`node scripts/check-map.mjs <map>`): spawn clearance, spawn-to-spawn sightlines, and a ground flood fill showing every walkable spot is reachable. Old Town: no open spawn lines, all 6,610 ground cells reachable.

### 2026-11-02 · Plaza: firing spots and more doorways (`feature/milestone-5`)
- The band between the spawn wall and the wall in front of it was a dead end. Now:
  - That inner wall is 2.4 m, down from 3 m.
  - Two firing spots against it on each side: a 1.2 m crate with two low steps (0.4 m, 0.8 m), so you walk straight up and stand with your eye 40 cm above the wall.
  - A doorway through the inner wall into the lane.
  - Two more doorways in the spawn wall, either side of the middle.
- Checked by script: the steps walk up without jumping, the doorways lead through, and no spawn can see the other team's spawn.

### 2026-11-02 · Plaza, second version; three more textures (`feature/milestone-5`)
- **Pavilions are raised and enclosed.** The floor is 2.2 m up, too high to climb. Plaster walls close the sides, a roof is at 5 m, and the plaza side has a half wall with a window band above it and a doorway. The objective sites sit inside the pavilions.
- **Stairs go up:**
  - from each team's lane into both pavilions, where the sketch says "stairs here";
  - from the plaza through each pavilion's doorway.
  - The terraces are gone: spawns, bands and lanes are all at ground level, and the passages into the plaza are flat and covered.
- **Mirrored east/west as well as north/south,** so both teams have the same routes to both pavilions.
- **Objective sites can be raised:** each site can give its floor height `y`. Planting checks you're on that floor, and the charge and its ground marking sit there.
- **Less brick:** three more CC0 textures from ambientCG.
  - Paving slabs (PavingStones136) for the plaza floor, warmed up since the photo looks olive under the sky.
  - Limestone blocks (Tiles143) for Plaza's walls.
  - Whitewashed plaster (PaintedPlaster006) for the pavilions.
  - All 8 photo textures together come to 8.5 MB.
- Checked by script and in the browser: every route walks cleanly, no spawn can see the other team's, and the sites register on the raised floors.

### 2026-11-02 · Host controls before joining (`feature/milestone-5`)
- On the host Mac, the menu shows the mode, map and team-rule controls before you join.
  - The changes go to the server over HTTP (`POST /api/host`), and it only accepts them from the host Mac.
  - The menu reads what's on (`GET /api/match`), so the tagline and the background map are right before anyone joins.
- Why Plaza wouldn't stick: the server running at the time was started before Plaza existed, so it ignored the switch and the picker snapped back. After a server restart it works, before joining and in game.

### 2026-11-02 · Milestone 5, part 14: Plaza map (`feature/milestone-5`)
- **New map "Plaza", built from the team's sketch** and mirrored north/south as asked. It's 80 × 56 m.
  - Middle: a walled plaza with a fountain, crates and low walls. It opens at both ends into roofed pavilions on pillars, which hold the objective sites A and B.
  - Each side: a terrace 2.2 m up, too high to climb. The spawn sits behind a 3 m wall with doorways at both ends. A band of cover runs behind a waist-high parapet. Stairs at the east end lead down to the lane, and a covered stairway in the middle leads into the plaza.
  - Checked by script: no spawn can see the other team's spawn, both ways down the terrace walk cleanly, and the terrace can't be climbed from the lane.
- **Spawns can now sit on raised ground:** each spawn point can give its own height (`y`).

### 2026-11-02 · Milestone 5, part 13: climbing, crosshair, hit sounds (`feature/milestone-5`)
- **Climbing:** jump at a ledge while moving toward it, or keep jump held as you reach it mid-air, and you pull yourself up.
  - Ledges count up to 1.9 m above the ground you jumped from: the 1.2 m dock, 1.5 m decks and crates, 1.3 m walls. The 2.4 m crate stacks, 2.6 m containers and 4.2 m walls stay out of reach.
  - There has to be room to stand on top and nothing overhead.
  - The climb takes 0.4–0.7 s: up first with the head ducking over the edge, then forward. The gun drops out of the way and can't fire meanwhile.
  - Built with `findLedge` in `collision.js` and checked with a movement simulation on both maps.
- **Crosshair:** a new menu option, Static (the new default) or Dynamic (opens up with spread, as before).
- **Hit markers:** half as thick.
- **Hit confirmation sounds:** a dry tick on a hit, a bright tink on a headshot and a ding on a kill, all built in code. Your own files in `public/assets/sounds/ui/` (`hit`, `head`, `kill`) play instead if you add them. Kenney's CC0 "Interface Sounds" pack is a good source; its site blocks automated downloads, so I couldn't fetch it.

### 2026-11-02 · Milestone 5, part 12: Vanguard hidden, scope-only aiming (`feature/milestone-5`)
- **Vanguard is hidden for now.** Its VSK set doesn't match the other guns. The class is kept in `config.js` but left out of `CLASS_ORDER`, and the server refuses it.
- **Aiming down sights is off except through the sniper's scope.** One line in `config.js` drops the `ads` settings of non-scoped guns; deleting it brings aiming back. For the other guns, right click does nothing for now.

### 2026-11-02 · Milestone 5, part 11: animated first-person guns (`feature/milestone-5`)
- **Every gun now has arms and its creator's own animations.** They're "FPS … animations" sets by Cransh (CC-BY), covering the rifle (AK-74m), sniper, pistol (Springfield XD), SMG (MPA 30 SST), shotgun (Remington 870), Makarov and battle rifle (VSK-94).
  - Each gun plays idle, walk, fire and reload, plus run and draw where the set has them, and a separate reload when the magazine is empty.
  - Our own motion fills the gaps: look sway, a light recoil spring, a sprint pose and a draw for sets without one.
  - The knife and grenades stay hands-free.
- **The builder handles these sets** (`VIEWMODELS` in `assets.config.js`):
  - It puts the eye at the creator's camera and scales each set by its gun's real length.
  - It renames the clips to the game's actions.
  - It finds the gun's barrel direction, muzzle, sight line (rear sight to front sight), ejection port and grip.
  - It bakes a gun-only copy for other players to hold.
  - The shotgun and Makarov sets came with different arms. The AK set's arms are moved onto their skeletons by bone name, so six of the seven guns show the same arms.
- **Aiming** turns and moves the whole set so its sight line runs straight out of the eye, with the rear sight a set distance in front (`fprig.js`). It works from a smoothed pose, so idle sway settles but each shot still kicks.
- **Classes:** the carbine and the Operator class are gone; two rifles is enough. Vanguard now carries the VSK-94 battle rifle and a Makarov. The FN SCAR, AR-15 and Colt Python static models are retired.
- **Stats:**
  - The Makarov took the pistol's old numbers with its real 8-round magazine (25 damage).
  - The pistol hits harder but fires slower (34 damage, 0.22 s between shots).
  - The shotgun keeps full damage to 12 m (was 7), falls off to 40 m (was 25) with a floor of 30% (was 20%), reaches 60 m and has a slightly tighter spread.
- **Known rough spots:**
  - The VSK set has no camera and comes with its own bare arms, so it's framed by hand and doesn't match the others.
  - The shotgun's reload animation is 6.8 s, so it plays at 2.4× to fit the 2.8 s reload.
  - Aimed views may need per-gun tuning after a playtest (`ANIM_VIEW` in `models.js`).

### 2026-11-02 · Milestone 5, part 10: optics, hands off (`feature/milestone-5`)
- **Optic sights:** the carbine's holographic sight had no reticle, and the battle rifle shot low.
  - The cause: I had lined each optic up by eye, so the rifle's built-in ring sat about 4 mm above the eye line. That's 1.2° high: 60 cm at 30 m.
  - The fix: each sight window's height is measured by casting rays through the built model (carbine 9.4 cm above the grip, battle rifle 14.6 cm), and aiming puts that point exactly on the eye line.
  - The game draws its own red ring-and-dot reticle at the screen center, which is exactly where shots go, whenever you aim an optic. Like a real holographic sight, it stays on the aim point when the gun kicks.
  - The battle rifle's built-in reticle (one small plane inside the sight) is cut out in the build, so there's only ever one reticle.
- **First-person hands are off:** they weren't convincing, and the guns float on their own now. `SHOW_HANDS` in `models.js` brings them back; the rigged-arms code stays.

### 2026-11-02 · Milestone 5, part 9: new guns, firing feel, movement (`feature/milestone-5`)
- **Two new classes and three new guns**, all CC-BY 4.0 from Sketchfab:
  - **Operator** with a carbine (AR-15): 750 rounds per minute, 26 damage, weaker past 25 m, flashbang.
  - **Vanguard** with a battle rifle (FN SCAR): 430 rounds per minute, 40 damage, 20 rounds, hard recoil, frag.
  - Vanguard carries a **revolver** (Colt Python) instead of the pistol: 6 rounds, 45 damage, one-shot headshot. On a reload its cylinder swings out and back.
  - Classes can now name their sidearm.
- **Builder: models staged for a picture.** The asset builder can now level a tilted model (`rotateZ`) and cut parts out of a mesh (`cuts`), either dropping them or moving them. The AR-15 download needed both:
  - it was posed muzzle-down at 15°;
  - its magazine lay beside the gun, and a spare magazine top sat on the rail.
  - The magazine was moved into the well with a matrix worked out once from its shape, so it also drops out on a reload.
  - The builder's bounding box is now exact, not rough. A rough box of a tilted model came out 4 cm too tall, which threw off the aim.
- **Firing looks real, not cartoonish:**
  - The gun snaps straight back and settles in about 0.1 s, with a 1–2° muzzle rise on rifles. Before, the springs were bouncy and the flips were big: 5° on the rifle, 14° on the pistol, 17° on the shotgun.
  - The rifle's bolt and the pistol's slide cycle on every shot.
  - The muzzle flash is a small, irregular burst that lasts about two frames, with four shapes picked at random. It leaves a faint wisp of smoke.
- **Movement:**
  - Jumps carry at most 5.4 m/s forward, so a sprint jump covers 3.5 m instead of 4.5 m. Slide jumps are capped the same way.
  - For 0.45 s after a jump lands, the player is up to 45% slower and jumps lower. Chained hops start at 3 m/s and cover 2.2 m each, so bunny hopping is slower than running.
  - Stepping off a ledge or down stairs doesn't count as a landing.
- **Left hand on long guns:** it now sits under the handguard and wraps its right side. Before, it sat to the left of the gun.
- **Team switching:** Falcons / Jackals buttons in the Esc menu. The host can allow uneven teams.

### 2026-11-02 · Milestone 5, part 8: photo textures (`feature/milestone-5`)
- Both maps now use CC0 photo textures from ambientCG:
  - concrete (Concrete036)
  - asphalt (Road012A)
  - brick (Bricks085)
  - wood planks (Planks020)
  - corrugated steel (CorrugatedSteel005)
- Each surface has a color, a normal and a roughness map, 5 MB in all.
- `scripts/build-textures.sh` turns the downloads into the web copies.
- The painted textures stay as the fallback and show until the photos load.
- Tuning:
  - The concrete is darkened and its contrast halved; close up it looked like marble.
  - The stone surfaces use a flat matte roughness instead of the photo maps, which were glossy enough to mirror the sky.
  - The containers share one grey steel, tinted per color.
  - Crates use a corner of the plank photo, with the painted frame and brace drawn on top.
- Box UVs are now in meters, and each texture's repeat sets its tile size.

### 2026-11-02 · Milestone 5, part 7: Depot map, settings (`feature/milestone-5`)
- **New map "Depot"**, an original design, smaller than Yard (64 × 52 m vs 80 × 60 m).
  - Layout: a roofed brick hall in the middle (end doors, two side doors per long wall, pillars), a raised loading dock with stairs along the north wall, and wagons in rows to the south.
  - Mirrored like Yard. Sites A and B are on the east half.
  - A script checks that no spawn can see the other team's spawn. The crates in the hall and south of it are placed to block those lines.
- **Map choice:** the host picks the map in Host controls. The server tells everyone which map is on when they join and whenever it changes, and the match restarts. Maps live in `shared/maps/`. `shared/map.js` holds the active map and swaps it in place, so every module keeps the same reference.
- **Key rebinding:** in the menu under Controls, click a key and press the new one. Binding a key that is already in use swaps the two actions. On-screen prompts follow your keys, e.g. "Hold E to plant".
- **Graphics quality:** High / Medium / Low sets render resolution and shadow detail. It applies immediately.
- **Other players' grenade throws:** the toss animation now plays on the thrower, timed so the grenade leaves the hand when it appears.

### 2026-11-02 · Milestone 5, part 6: arms fixed (`feature/milestone-5`)
- Playtest: the left arm looked cut off at the elbow, and the pistol hand looked broken.
- Cause of the elbow: an order-of-operations bug placed the shoulders at eye level instead of below the view. It also affected the soldier arms in part 3. With the shoulders below the view, the whole arms are kept. The forearms rise from the bottom edge, and the elbows stay out of sight.
- Cause of the pistol hand: the thumb stuck straight out of the palm. The thumb is now aimed along the gun: down the left side of the frame on grips, forward along the handguard for the support hand. Finger-curl axes are worked out from the hand's own shape. The hands are scaled to 0.8× so they fit the guns.
- New dev page `/dev/arms.html` shows the arms on every weapon, from the eye or with an orbit camera, with team, reload and ADS toggles.

### 2026-11-02 · Milestone 5, part 5: PSX arms (`feature/milestone-5`)
- First person now uses "PSX First Person Arms" by Drillimpact (CC0, itch.io) with its gloves skin: a proper first-person rig with every finger bone, low-poly by design (1,176 triangles, 512 px textures, 0.1 MB built).
- Hand IK generalised again: the hand's own directions are measured from its knuckles, since this rig hangs fingers off palm bones. Upper arms are cut out (forearms and hands only), arms scaled 1.15× so the support hand reaches, fingers curl around −X on both hands.
- Order of preference: PSX arms → team soldier's arms → stand-in sleeves. Checked: rifle, SMG, shotgun, sniper, pistol, knife, frag.
- Also reviewed and set aside: "Fps Arms Rigged" (TALL DOOR, untextured) and "Fps arms" (DJMaesen, not rigged).

### 2026-11-02 · Milestone 5, part 4: smaller left arm (`feature/milestone-5`)
- Playtest feedback: the left arm took up too much of the screen. Measured with an arms-only render: 22.7% of the screen (18.2% in the left half).
- First person now shows forearms and hands only (upper arms cut out), shoulders sit lower, the left elbow tucks down so the forearm comes up from the bottom-left corner, and the support hand grips a little further back (rifle / sniper handguard, shotgun pump). Now about 8% of the screen (≈3% in the left half); pistol 5%.

### 2026-11-02 · Milestone 5, part 3: team-matched arms (`feature/milestone-5`)
- Playtest feedback: the Sketchfab arms (bare forearms, fingerless gloves) didn't fit the SWAT look.
- First person now uses your own team's soldier: a copy cut down to just the triangles skinned to the arm and hand bones (head, body and legs removed; the third-person soldiers are untouched), so the sleeves and gloves match what others see — blue sleeves for the Falcons, black for the Jackals — and switch with your team.
- Same hand IK, generalised for the Mixamo skeleton (its hands hang off the forearms, so out-of-reach targets stop at full stretch instead of stretching). Arms 10% longer and shoulders set low and a little forward so the support hand reaches a rifle's forend.
- Fixed while testing: collapsing the head bone to hide it threw spikes across the screen (replaced by cutting triangles); Mixamo mirrors the left hand's bone axes, so finger curl runs the opposite way per hand.
- The Sketchfab arms remain as a fallback only (not downloaded when the soldiers exist).

### 2026-11-02 · Milestone 5, part 2: first-person arms (`feature/milestone-5`)
- The stand-in sleeves are replaced by the rigged "FREE FPS Arms with glove" model (bare forearms, fingerless gloves).
- Every frame the hands are put on the weapon and the elbows bend to reach (two-bone IK, elbows down and out; the forearm stretches slightly rather than leave a gap when the left hand reaches far up a rifle). Fingers curl around the grip, the index finger less (trigger).
- The old stand-in arm positions now only mark where the hands go, so every existing animation drives the real hands: recoil, sprint, reloads (support hand fetches the magazine / feeds shells), shotgun pump, knife swing, grenade throw.
- Per-weapon hand poses: right hand on the pistol grip, left hand under the forend (rifle, sniper), on the pump (shotgun), on the front grip (SMG); pistol, knife and grenades are one-handed.
- Tuning while testing: first right-hand pose had the palm facing the camera (fingers curling toward you); a two-handed pistol cup looked bunched up, so the pistol is held one-handed and a little further out.

### 2026-11-02 · Milestone 5, part 1: stronger flashbang, per-weapon reloads (`feature/milestone-5`)
- Playtest feedback: the flashbang felt weak. Now up to 5 s (was 3.5 s), fully white for the first half, reaches 34 m, turning away only halves it, and game sound drops away while you're flashed (ear ring stays on top). Looking at one from 6 m: 3.2 s → 5.3 s.
- Reloads per weapon, using each model's own parts: the gun turns its magazine well toward you, the magazine drops out, the support hand fetches a new one, it seats, then the bolt / slide racks (rifle charging handle and pistol slide actually move; sniper and SMG get a flick). The shotgun rolls and feeds red shells one at a time, as many as are missing, then pumps. Clicks for magazine out / in, rack and shell.
- Other players now show a reload on their soldier (upper body only, legs keep running), timed to the weapon.

### 2026-11-02 · Milestone 4: grenades (`feature/milestone-4`)
- Each class carries one grenade per life: Assault frag, Marksman smoke, Breacher flashbang, Runner smoke. Key 4 then left click (far) / right click (lob), or G to quick-throw. Wind-up and throw animation, then back to your previous weapon.
- Shared physics (server and client trace the same path): gravity, bounces off map boxes, rolling to a stop. The server owns the flight and the detonation.
- Frag: 2.2 s fuse, 110 damage at the body falling to 0 at 7 m, blocked by walls; hurts enemies and the thrower, not teammates; kills credited to the thrower.
- Smoke: 1.6 s fuse, billowing 5 m cloud for 16 s; grey screen when you stand inside; blocks flashbangs.
- Flashbang: 1.4 s fuse, white-out up to 3.5 s depending on whether you're looking at it and how close; walls block it; ear-ringing tone.
- Real models (M67, M18, M84) built from the downloads with their extra copies hidden; synthesized throw / clink / blast / hiss / bang sounds.
- Fixed while testing: frag damage was measured to the middle of the body, so a frag at someone's feet couldn't kill; it now measures to the nearest point of the body.
- Verified with bots (12 server checks: wrong type, throw from far away, one per life, fuse, damage, self-damage, teammates safe, wall blocking, smoke, kill credit) and in the browser (in-hand model, throw animation, server-confirmed flight, smoke cloud inside/outside, flash white-out). **Not yet:** a real match.

### 2026-11-02 · Milestone 3: objective mode (`feature/milestone-3`)
- New mode "Objective" (host menu or `npm start -- --mode=obj`). Attackers start west, defenders east; sides swap after round 6; first to 7.
- One attacker carries the charge; it drops where they die and any attacker can pick it up. Hold E for 3.5 s inside site A or B to plant; defenders hold E for 6 s next to it to defuse. Moving, letting go or firing resets the timer. The server times everything.
- 40 s fuse with an accelerating beep and blinking light; detonation damages everyone within 14 m.
- HUD: role and charge status under the score bar (pulses red for defenders once planted), "Hold E" prompt, plant/defuse progress bar, round result reason (detonated / defused / time).
- Players kneel while planting or defusing (Mixamo kneel clip). Explosion with flash, light, fireball, debris and smoke; camera jolt by distance.
- New announcer lines: charge planted, charge defused, half time.
- Charge model: the IED download. Its materials used an old glTF format three.js no longer reads, so the builder now converts it; rigged props are cloned with their skeleton.
- Builder can rebuild single sections (`buildAll({ only: ['props'] })`), so small additions don't re-export every model.
- Verified with bots (18 server checks: carrying, plant/defuse timing and interruption, drops, detonation damage, elimination rules, half-time swap) and in the browser (HUD, planting, kneeling, charge model, explosion). **Not yet:** a real match.

### 2026-11-02 · Weapon feel (`feature/real-assets`)
- Playtest feedback on real guns: too far from the camera, rifle skewed left, SMG skewed right, firing felt flat.
- Guns now centered on their barrel instead of their bounding box (side parts like the AK's scope mount and the MP5K's cocking tube were pulling them 6–10 mm off the sight line).
- Guns sit closer at the hip, and much closer when aiming: the rear sight ends up a hand's width from the eye. SMG now aims through its rear drum; shotgun sights down the barrel to the bead.
- Firing: spring-based kick per weapon (back, up, random twist, with a small overshoot), a camera jolt, calmer when aiming, and brass casings that fly out of the ejection port. The shotgun drops a red shell on the pump and the sniper ejects on the bolt.

### 2026-10-30 · Real assets (`feature/real-assets`)
- Other players are now animated Mixamo soldiers: blue SWAT (Falcons) and black SWAT (Jackals), with 49 clips covering idle, 8-way walk/run, sprint, crouch, jump, 6 deaths and a pistol set. Their upper body follows their aim, and the real gun sits in their hand.
- First person uses the real guns: AK-74M, M1911, M9 bayonet, sniper, Remington 870, MP5K. Sights line up when aiming.
- Asset pipeline: raw downloads in git-ignored `assets-src/` (599 MB); `/dev/build.html` bakes them into `public/assets/game/` (53 MB); `/dev/viewer.html` previews raw files.
- Menu Credits section built from each model's licence data.
- Fixed: stray display bullets and shells on the pistol and AK, the shotgun's loose shells, the sniper's grip point, and character textures exporting before they finished loading.
- Verified in the browser: every first-person gun, soldier poses up close, running/sprinting/death, gun direction, rifle sights. **Not yet verified:** a real match, real mouse play, performance with 6 animated players.

### 2026-10-30 · Milestone 2 (`feature/milestone-2`)
- Four classes chosen in the menu or with B in game. The server rejects weapons outside your class.
- Sniper (scope, one-shot body, unscopes per shot), pump shotgun (8 pellets counted as one hit, damage falloff), SMG (falloff, Runner moves 8% faster).
- Elimination: 5 s freeze time, no respawns, first to 7 rounds, spectate teammates after death, alive pips in the score bar.
- Host controls in the menu (switch mode, restart); `npm start -- --mode=elim`.
- Verified with bots: 17 server-rule checks pass. Visuals checked in the browser.

### 2026-10-30 · Playtest feedback (`feature/playtest-feedback`)
- From the first playtest: Shift sprints, Alt walks quietly, crouch while sprinting slides, right click aims down sights.
- Announcer system: plays your recorded lines, falls back to the Mac's built-in voice.
- Full asset list with recording guide (ASSETS.md).

### 2026-10-30 · Milestone 1 (`main`)
- LAN server + browser client, Team Deathmatch to 50, rifle / pistol / knife, original map "Yard", stand-in models.
- First playtest with friends: networking worked well. Feedback led to the items above.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-02 | Objective mode follows familiar plant/defuse rules: after a plant, defenders must defuse even if every attacker is down | Keeps late rounds tense and gives the defuse a purpose. |
| 2026-10-30 | Raw assets stay out of git; only optimized copies are committed. No Git LFS. | Originals are 599 MB with files over GitHub's 100 MB limit; optimized copies are ~53 MB. LFS adds a tool for everyone and has small free quotas. |
| 2026-10-30 | Download 4K weapon textures, ship 2K (own gun) and 1K (others) | 4K for every gun would need ~3 GB of graphics memory on an 8 GB M1. |
| 2026-10-30 | Mixamo animation packs instead of single downloads | 3 packs cover ~90% of the animations in a few clicks. |
| 2026-10-30 | Two different SWAT characters, one per team | Teams are easy to tell apart at a glance. |
| 2026-10-30 | Realistic art: Mixamo characters, Sketchfab guns (CC-BY) | Players didn't like the blocky look. |
| 2026-10-30 | Classes instead of a buy menu | Picked by the group: simpler, faster rounds. |
| 2026-10-30 | Team Deathmatch to 50 kills | Requested by the group. |
| 2026-10-30 | Browser game (three.js + Node) instead of Godot | Nothing for friends to install, fastest to build, runs on any Mac. |
| 2026-10-30 | Original game, not a copy | Same genre, but our own maps, names and content. |

## Branches

Work so far is on stacked branches; each one builds on the previous:
`main` (milestone 1) → `feature/playtest-feedback` → `feature/milestone-2` → `feature/real-assets`.
Merging `feature/real-assets` into `main` brings in everything.
