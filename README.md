# Qapishma

An original team shooter you play in the browser over your home network (LAN).
One Mac hosts; everyone else just opens a link. Works on Apple Silicon (M1 and later) and Intel Macs.

## Hosting a game

You need [Node.js](https://nodejs.org) 18 or newer on the host Mac (only the host).

```bash
npm install
npm start
```

The server prints the links to use:

```
Qapishma server running.
  On this Mac:      http://localhost:3000
  Friends on LAN:   http://192.168.0.107:3000
```

- The host plays at `http://localhost:3000`.
- Friends on the same Wi-Fi open the **Friends on LAN** link in Chrome, Safari or Firefox. Nothing to install.
- If macOS asks whether to allow incoming connections for `node`, click **Allow**, otherwise friends can't connect.
- Stop the server with `Ctrl+C`.

**Choosing the mode and map.** On the host Mac, the menu shows **Host controls**, before you join as well as in game (Esc): switch between Team Deathmatch, Elimination and Objective, pick the map (Yard, Depot, Plaza, Old Town, Villa or Bastion), or restart the match. Switching either one restarts the match for everyone. To start the server straight into a mode (`elim` or `obj`):

```bash
npm start -- --mode=obj
```

**Port already in use?** If another app on the Mac uses port 3000 (Next.js and other dev servers do), start the game on another port and share that link instead:

```bash
PORT=3001 npm start
```

## Controls

| Key | Action |
|---|---|
| WASD | Move |
| Mouse / left click | Aim / fire |
| Right click (hold) | Sniper: look through the scope (other guns don't aim down sights for now) |
| Space | Jump. Sprint jumps carry less speed, and jumping again right after landing is lower and slower (no bunny hopping). **Climb:** jump at a ledge up to about 1.9 m (crates, low walls, the loading dock) while moving toward it, or keep jump held as you reach it. **Ladders:** walk into one and keep moving to climb (slowly). Falls over 3.5 m hurt (18 HP per meter beyond), and getting hit slows you for half a second. **Windows:** jump at a window the same way to climb through it, ducked |
| Shift (hold, moving forward) | Sprint. You can't fire while sprinting |
| Alt / Option | Walk quietly (no footsteps) |
| C (or Ctrl) | Crouch. While sprinting: **slide** |
| R | Reload |
| E (hold) | Objective mode: plant the charge in a site / defuse it |
| 1 / 2 / 3, Q, mouse wheel | Primary / sidearm / knife, last weapon, cycle |
| 4, then left / right click | Grenade: throw far / lob short |
| G | Quick-throw your grenade |
| Tab | Scoreboard |
| B | Choose class (then 1–4) |
| M | Switch team (also in the Esc menu). By default only if it keeps teams even; the host can allow uneven teams |
| Esc | Menu (sensitivity, field of view, volume, crosshair, graphics) |

These are the default keys. To change one, open **Controls** in the menu, click a key, and press the new one; **Reset keys** puts them back. Your settings and keys are saved in your browser. Mouse buttons, 1–4 and Esc can't be changed.

**Graphics:** High (default) renders at full Retina resolution with sharp shadows. On an older or busy Mac, Medium or Low lowers both and runs smoother.

## Current state: milestone 4

**Modes**
- **Team Deathmatch:** first team to 50 kills (15-minute limit). Respawn after 3 s with 2 s of spawn protection.
- **Elimination:** no respawns. Last team standing wins the round; if time runs out, the team with more players alive wins. First to 7 rounds. Each round opens with 5 s of freeze time to look around and change class. When you die you watch a teammate (click to switch).
- **Objective:** one team attacks, the other defends; sides swap after round 6. One attacker carries the charge (it drops where they die; any attacker can pick it up). Hold E inside site A or B for 3.5 s to plant. Defenders then have 40 s to defuse it (hold E next to it for 6 s). Attackers win by detonation or by eliminating the defenders; defenders win by defusing, by eliminating the attackers before a plant, or when time runs out without a plant. First to 7 rounds.

**Classes** (pick in the menu, or press B in game; each also carries a sidearm and a knife)

| Class | Primary | Grenade | Notes |
|---|---|---|---|
| Assault | Rifle | Frag | All-rounder |
| Marksman | Scoped sniper | Smoke | One-shot body kill, drops out of scope after each shot, moves a bit slower |
| Breacher | Pump shotgun | Flashbang | 8 pellets, full damage to 12 m, then dropping off to 40 m |
| Runner | SMG | Smoke | Moves 8% faster, accurate on the move |
| Vanguard *(hidden for now)* | Battle rifle (VSK-94) | Frag | Three hits kill but it kicks; 20-round magazine; carries a **Makarov** (8 rounds, weaker than the pistol) instead of the pistol |

**Grenades** (one per life): bounce off walls and roll. **Frag** explodes after 2.2 s, damage falls off over 7 m and walls block it (it can hurt you, not teammates). **Smoke** makes a 5 m cloud for 16 s. **Flashbang** whites out anyone who can see it, worst if they're looking at it; walls and smoke block it.

Class changes apply instantly during freeze time or right after spawning, otherwise on your next spawn.

**Also in**
- Sprinting, sliding, quiet walking, aiming down sights (scope on the sniper).
- Headshots and leg shots, recoil, spread, reloads, pump/bolt animations.
- Announcer: plays your own recorded voice lines from `public/assets/sounds/announcer/`. Lines not recorded yet use the Mac's built-in voice. See [ASSETS.md](ASSETS.md#3-announcer-voice-lines-you-record-these).
- Six maps:
  - **Yard:** three long lanes with containers, crates and raised decks.
  - **Depot:** smaller and closer. A roofed hall in the middle, a raised loading dock to the north, and a rail yard of parked wagons to the south.
  - **Plaza** (drawn by the team): a paved plaza with a fountain, walled on its long sides, between two raised pavilions with plaster walls, a roof and windows onto the plaza. Each team spawns behind a wall, crosses a band of cover, and either takes a covered passage into the plaza or climbs stairs from the lane into a pavilion. The plaza has stairs up into both pavilions too. Mirrored both ways.
  - **Old Town:** close quarters. Narrow alleys between solid buildings, and rooms you fight through: a hall onto a small courtyard with a well, two houses with inner rooms, and a chapel. Each team spawns in a walled yard at its end, with four ways out. Mirrored east/west.
  - **Villa** (laid out after the team's schematic): a walled estate around a one-storey house. Defenders start in the carport at the front, across the road from the lawn; attackers start in the back yard behind the bedroom. The house has a lounge, dining room and study across the front, and a back room and a bedroom behind. Its windows can be climbed through. Around it: a sunken pool you can jump into, a barn, a storehouse with a corridor and a front room, and a long walled alley along the west side, reached through the road gate. Not mirrored.
  - **Bastion** (after the team's screenshots): a walled courtyard with four stone towers. Each tower has a door, stairs up to a hatch, a ladder outside, and a roofed wooden lookout on top; an H-shaped walkway joins the four lookouts. Stone outposts on the north and south walls (climb the crates to their roofs), low walls, fences, pines, dry bushes, boulders and tall grass. Teams spawn inside the west and east gates, behind a barricade. Mirrored both ways.
  - All but Villa are mirrored so neither team has an edge.
  - All six have plant sites A and B for objective mode.
- **Real models:** animated SWAT soldiers (blue Falcons, black Jackals) with walk/run/sprint/crouch/jump/death animations and their guns in hand; first-person guns with arms and hand-made animations (idle, walk, fire, reload) by Cransh, photo textures on the maps (ambientCG), and recorded CC0 sounds: real gunshots (a close and a far take for each gun), reloads, footsteps that change with the surface, landings, bullet impacts, knife and grenades. See [ASSETS.md](ASSETS.md) for how assets are added and built.

### Roadmap

See [ROADMAP.md](ROADMAP.md) for the plan, the progress log, and the decisions made along the way.

## How it works

- `server.js` serves the game files and runs the match over WebSockets (`/ws`). It owns health, kills, score and respawns, and checks every reported hit for range, fire rate and walls in the way.
- The browser (`public/js/`) handles rendering (three.js), movement, and finding what your shots hit, which keeps aiming feeling instant on a LAN.
- `public/js/assets.js` + `public/js/soldier.js` load the built models and animate other players; if `public/assets/game/` is missing the game falls back to stand-in models.
- `public/dev/` has the asset **builder** and **viewer** (host only, see ASSETS.md), and **arms.html**, which shows the first-person arms holding each weapon.
- `public/js/shared/` holds rules both sides use: weapon stats and player speeds (`config.js`), the maps (`maps/yard.js`, `maps/depot.js`, listed in `map.js`), and collision (`collision.js`). Tweak numbers in `config.js` and restart the server.
