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
| 3 | Objective mode: plant / defuse a charge at site A or B | ⏭ Next |
| 4 | Grenades: frag, smoke, flashbang | Planned |
| 5 | Polish: real sounds, map textures, first-person arms, more maps, settings | Planned |

### Milestone 3: objective mode (next)
- Attackers carry a charge (IED model, already downloaded) and plant it at site A or B; defenders defuse it.
- Plant and defuse use the kneeling animations from the pistol pack (already downloaded).
- Round ends on detonation, defuse, wipe-out, or time running out without a plant.
- Teams swap sides at half time. New announcer lines (planted, defused, etc.).
- **Needs from you:** nothing to download.

### Milestone 4: grenades
- Frag (damage with falloff, blocked by walls), smoke (blocks vision), flashbang (whites out the screen of anyone looking at it).
- Throwing physics with bounces; one grenade per class, as set in the class table.
- Models already downloaded (M67, M18, M84); the throw animation is in place.
- **Needs from you:** grenade sounds (see ASSETS.md §4).

### Milestone 5: polish
- **Per-weapon reload animations** (first person): magazine out / new magazine in / charging handle for the rifle, SMG and pistol, shell-by-shell for the shotgun, bolt + magazine for the sniper. Done in code by moving the gun's own magazine part (the models keep it as a separate piece), timed to each gun's reload length and to reload sounds. Better once real first-person arms are in, so the two go together.
- Real sounds: gunshots, reloads, footsteps, impacts (ASSETS.md §4).
- Photo textures for the map (ambientCG / Poly Haven, CC0).
- First-person arms (model downloaded: "FREE FPS Arms with glove").
- Firing and reload animations on other players (clips already built).
- More maps, key rebinding, graphics quality setting.
- Your recorded announcer lines (ASSETS.md §3).

### Ideas parked for later
- Slide and knife-attack animations (Mixamo).
- Kill-cam, round MVP, match stats.
- Gun skins per team.

## Progress log

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
