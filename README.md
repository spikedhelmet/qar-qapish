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

**Choosing the mode.** The player on the host Mac sees **Host controls** in the Esc menu: switch between Team Deathmatch and Elimination, or restart the match. To start the server straight into Elimination:

```bash
npm start -- --mode=elim
```

## Controls

| Key | Action |
|---|---|
| WASD | Move |
| Mouse / left click | Aim / fire |
| Right click (hold) | Aim down sights: zoom, tighter spread, slower movement |
| Space | Jump |
| Shift (hold, moving forward) | Sprint. You can't fire while sprinting |
| Alt / Option | Walk quietly (no footsteps) |
| C (or Ctrl) | Crouch. While sprinting: **slide** (jump out of it to keep the speed) |
| R | Reload |
| 1 / 2 / 3, Q, mouse wheel | Primary / pistol / knife, last weapon, cycle |
| Tab | Scoreboard |
| B | Choose class (then 1–4) |
| M | Switch team (only if it keeps teams balanced) |
| Esc | Menu (sensitivity, field of view, volume) |

## Current state: milestone 2

**Modes**
- **Team Deathmatch:** first team to 50 kills (15-minute limit). Respawn after 3 s with 2 s of spawn protection.
- **Elimination:** no respawns. Last team standing wins the round; if time runs out, the team with more players alive wins. First to 7 rounds. Each round opens with 5 s of freeze time to look around and change class. When you die you watch a teammate (click to switch).

**Classes** (pick in the menu, or press B in game; also pistol + knife each)

| Class | Primary | Notes |
|---|---|---|
| Assault | Rifle | All-rounder |
| Marksman | Scoped sniper | One-shot body kill, drops out of scope after each shot, moves a bit slower |
| Breacher | Pump shotgun | 8 pellets, damage drops off with distance |
| Runner | SMG | Moves 8% faster, accurate on the move |

Class changes apply instantly during freeze time or right after spawning, otherwise on your next spawn.

**Also in**
- Sprinting, sliding, quiet walking, aiming down sights (scope on the sniper).
- Headshots and leg shots, recoil, spread, reloads, pump/bolt animations.
- Announcer: plays your own recorded voice lines from `public/assets/sounds/announcer/`. Lines not recorded yet use the Mac's built-in voice. See [ASSETS.md](ASSETS.md#3-announcer-voice-lines-you-record-these).
- One map, "Yard": three lanes, containers, crates, raised decks, and sites A/B ready for objective mode.
- **Real models:** animated SWAT soldiers (blue Falcons, black Jackals) with walk/run/sprint/crouch/jump/death animations and their guns in hand; realistic first-person guns. Map textures and sounds are still stand-ins. See [ASSETS.md](ASSETS.md) for how assets are added and built.

### Roadmap

1. ~~Core: movement, LAN play, rifle/pistol/knife, Team Deathmatch~~
2. ~~Classes (Assault, Marksman, Breacher, Runner) with sniper, shotgun and SMG; Elimination mode~~
3. Objective mode (plant / defuse at A or B)
4. Grenades: frag, smoke, flash
5. Polish: real sounds, settings, more maps

## How it works

- `server.js` serves the game files and runs the match over WebSockets (`/ws`). It owns health, kills, score and respawns, and checks every reported hit for range, fire rate and walls in the way.
- The browser (`public/js/`) handles rendering (three.js), movement, and finding what your shots hit, which keeps aiming feeling instant on a LAN.
- `public/js/assets.js` + `public/js/soldier.js` load the built models and animate other players; if `public/assets/game/` is missing the game falls back to stand-in models.
- `public/dev/` has two host-only tools: the asset **builder** and **viewer** (see ASSETS.md).
- `public/js/shared/` holds rules both sides use: weapon stats and player speeds (`config.js`), the map layout (`map.js`), and collision (`collision.js`). Tweak numbers in `config.js` and restart the server.
