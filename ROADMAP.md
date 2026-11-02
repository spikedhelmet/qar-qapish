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
| 5 | Polish: real sounds, map textures, first-person arms, reloads, more maps, settings | 🚧 In progress (reloads, arms done) |

### Milestone 5: polish (in progress)
- ~~**Per-weapon reload animations**~~ done (see log).
- ~~**First-person arms**~~ done (see log).
- Real sounds: gunshots, reloads, footsteps, impacts (ASSETS.md §4).
- Photo textures for the map (ambientCG / Poly Haven, CC0).
- Firing and reload animations on other players (clips already built).
- More maps, key rebinding, graphics quality setting.
- Your recorded announcer lines (ASSETS.md §3).

### Ideas parked for later
- Slide and knife-attack animations (Mixamo).
- Kill-cam, round MVP, match stats.
- Gun skins per team.

## Progress log

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
