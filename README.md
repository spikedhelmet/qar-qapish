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

## Controls

| Key | Action |
|---|---|
| WASD | Move |
| Mouse / left click | Aim / fire |
| Space | Jump |
| Shift | Walk quietly (no footsteps) |
| C (or Ctrl) | Crouch |
| R | Reload |
| 1 / 2 / 3, Q, mouse wheel | Rifle / pistol / knife, last weapon, cycle |
| Tab | Scoreboard |
| M | Switch team (only if it keeps teams balanced) |
| Esc | Menu (sensitivity, field of view, volume) |

## Current state: milestone 1

- Team Deathmatch: first team to 50 kills, 15-minute time limit, then a new match starts automatically.
- Teams auto-balance on join. Respawn after 3 s with 2 s of spawn protection.
- Rifle, pistol and knife with spread, recoil, reloads, headshots (×4 damage) and leg shots (×0.75).
- One map, "Yard": three lanes, containers, crates, raised decks, and sites A/B painted for the objective mode later.
- Characters, guns, textures and sounds are **stand-ins** built in code. See [ASSETS.md](ASSETS.md) for the real models we're swapping in.

### Roadmap

1. ~~Core: movement, LAN play, rifle/pistol/knife, Team Deathmatch~~
2. Classes (Assault, Marksman, Breacher, Runner) with sniper, shotgun and SMG; Elimination mode
3. Objective mode (plant / defuse at A or B)
4. Grenades: frag, smoke, flash
5. Polish: real sounds, settings, more maps

## How it works

- `server.js` serves the game files and runs the match over WebSockets (`/ws`). It owns health, kills, score and respawns, and checks every reported hit for range, fire rate and walls in the way.
- The browser (`public/js/`) handles rendering (three.js), movement, and finding what your shots hit, which keeps aiming feeling instant on a LAN.
- `public/js/shared/` holds rules both sides use: weapon stats and player speeds (`config.js`), the map layout (`map.js`), and collision (`collision.js`). Tweak numbers in `config.js` and restart the server.
