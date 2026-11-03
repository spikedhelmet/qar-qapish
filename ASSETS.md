# Asset list

Everything the game needs to look and sound finished. Right now it runs on stand-ins built in code, so nothing here blocks playing; each item replaces a stand-in as it arrives.

**Who gets what**
- **You:** anything behind a login (Mixamo, Sketchfab, Freesound) and your own voice recordings.
- **Claude, with your OK:** sites with no login (ambientCG, Poly Haven). Claude asks before downloading anything.

Everything listed is free for games; **CC-BY** items need credit, which the game shows automatically under **Credits** in the menu.

### How assets get into the game

1. Put raw downloads in **`assets-src/`** (`characters/`, `animations/`, `weapons/`). This folder is **not** in git: the originals are huge (the black SWAT alone is 136 MB). Keep a backup elsewhere, such as iCloud or Google Drive; everything here can also be re-downloaded from the links below.
2. If a file is new, add it to `public/dev/assets.config.js`.
3. With the server running, open **http://localhost:3000/dev/build.html** on the host Mac and click **Build all assets**. It shrinks textures (2K for your own gun, 1K for everything else), converts characters and animations, sizes every gun the same way, reads each model's licence, and writes everything to `public/assets/game/`. That's what gets committed (about 50 MB, no Git LFS needed).
4. **http://localhost:3000/dev/viewer.html** previews any raw character, animation or weapon if you want to check a download first.

Sound effects are built by script: `bash scripts/fetch-sounds.sh` downloads the CC0 packs into `assets-src/sounds/` (about 610 MB unpacked), and `node scripts/build-sounds.mjs` cuts, levels and converts the ones the game uses into `public/assets/game/sounds/` (1.2 MB, committed). See section 4. Announcer lines and your own hit sounds don't need building; they go straight into `public/assets/sounds/`.

Priority: **P1** = first swap, the biggest visual and audio jump · **P2** = needed for milestones 2 to 4 · **P3** = polish.

---

## 1. Characters and animations: Mixamo (you)

Site: https://www.mixamo.com (free Adobe account). Licence: free for games, no credit required.

### Characters → `assets-src/characters/`
Download: **FBX Binary (.fbx)**, **T-pose**, **With Skin**.

| File | What | Priority |
|---|---|---|
| `team_a.fbx` | Soldier or tactical character for the Falcons | P1 |
| `team_b.fbx` | A visibly different soldier for the Jackals | P1 |

### Animations → `assets-src/animations/`
**In use:** Mixamo's **Pro Rifle Pack**, **Basic Shooter Pack** and **Pistol Handgun Locomotion Pack** (one zip each) cover almost all of the list below. Only a slide and a knife attack are still missing.

Select one of your characters first, then search. Download: **FBX Binary, Without Skin, 30 fps**, and tick **In Place** whenever it appears.

| File | Search Mixamo for | Priority |
|---|---|---|
| `rifle_idle.fbx` | rifle aiming idle | P1 |
| `rifle_run_forward.fbx` | rifle run | P1 |
| `death.fbx` | dying / death from the front | P1 |
| `rifle_sprint.fbx` | rifle sprint / sprint forward rifle | P1 |
| `rifle_run_backward.fbx` | run backward rifle | P2 |
| `rifle_strafe_left.fbx` | strafe left rifle | P2 |
| `rifle_strafe_right.fbx` | strafe right rifle | P2 |
| `rifle_walk.fbx` | walking rifle | P2 |
| `crouch_idle.fbx` | crouch idle rifle | P2 |
| `crouch_walk.fbx` | crouch walk rifle | P2 |
| `slide.fbx` | running slide (any slide works) | P2 |
| `jump.fbx` | rifle jump | P2 |
| `rifle_fire.fbx` | firing rifle | P2 |
| `reload.fbx` | reloading | P2 |
| `pistol_idle.fbx` | pistol idle | P2 |
| `pistol_run.fbx` | pistol run | P2 |
| `knife_attack.fbx` | stabbing / knife attack | P3 |
| `throw.fbx` | throw grenade | P2 (milestone 4) |
| `plant.fbx` | kneeling / crouch to stand, used for plant and defuse | P2 (milestone 3) |

---

## 2. Weapons: Sketchfab (you)

Site: https://sketchfab.com (free account). On each page: **Download 3D Model → glTF Binary (.glb)**. Save into `assets-src/weapons/`.
All picks were checked as **CC Attribution (CC-BY 4.0)** and downloadable; confirm the page still says so before downloading.

| File | Model / creator | Link | Tris | Priority |
|---|---|---|---|---|
| `rifle.glb` | AK-74M Assault Rifle / FJH | https://sketchfab.com/3d-models/ak-74m-assault-rifle-9084c3bae8224d338103997bc3101480 | 17.6k | P1 |
| `pistol.glb` | Colt M1911 & Silencer / FJH | https://sketchfab.com/3d-models/colt-m1911-silencer-066b5650970e4d01b721fd4d19ab8065 | 8.8k | P1 |
| `knife.glb` | M9 Bayonet / FJH | https://sketchfab.com/3d-models/m9-bayonet-933c897ce36d44ebb06a9500f13b77c9 | 2.9k | P1 |
| `sniper.glb` | Modern Sniper Rifle, Free Lowpoly / dan741vlasov | https://sketchfab.com/3d-models/modern-sniper-rifle-free-lowpoly-45c99509f1ee4c2a8c9c3336d3e2ff5a | 19.7k | P2 |
| `shotgun.glb` | Remington 870 Police Magnum / haoliu95 | https://sketchfab.com/3d-models/remington-870-police-magnum-12-gauge-shotgun-eea11de7e9d24b6683962b8388c319eb | 17.5k | P2 |
| `smg.glb` | HK MP5 SMG / dani-zzz | https://sketchfab.com/3d-models/hk-mp5-smg-fad0226e1dcf4af180f707a5509d3a4e | 32.2k | P2 |
| `frag.glb` | M67 Fragmentation Grenade / FJH | https://sketchfab.com/3d-models/m67-fragmentation-grenade-26eda181849f4d188f69105302fd7b65 | 13.1k | P2 |
| `smoke.glb` | M18 Smoke Grenade / vanillatography | https://sketchfab.com/3d-models/m18-smoke-grenade-46343925ad0e47cf927e66da7953c372 | 5.1k | P2 |
| `flash.glb` | M84 Stun Grenade "Flashbang" / vanillatography | https://sketchfab.com/3d-models/m84-stun-grenade-flashbang-3dbda8fe68ff4efdbf59f7d414c5619c | 11.4k | P2 |
| `charge.glb` | Any CC-BY / CC0 "C4" or "explosive charge" model, for objective mode | search Sketchfab | <10k | P2 (milestone 3) |
| `fp_arms.glb` | First-person arms / gloved hands, rigged (search "fps arms", CC-BY or CC0) | search Sketchfab | <15k | P3 |

**Backups** if a primary is gone or looks off:
- Rifle: M16 Assault Rifle / jeandiz: https://sketchfab.com/3d-models/m16-assault-rifle-339d0f7b21024387853dd926a5d51b50
- Pistol: Pistol 43 Tactical / dan741vlasov: https://sketchfab.com/3d-models/pistol-43-tactical-free-lowpoly-ec43fa0124084f739887e322646912bf
- Knife: Gerber Combat Knife / lucassoler: https://sketchfab.com/3d-models/gerber-combat-knife-low-poly-f8991297774e415c976cc8d476ca21e0
- Sniper: Remington 700 BDL / haoliu95: https://sketchfab.com/3d-models/remington-model-700-bdl-09c6c23bde8547b1880d76d6b95cd481 (48k tris, heavy)
- Shotgun: Remington 870 / milinam2002: https://sketchfab.com/3d-models/remington-870-shotgun-6db0ad4764d14eee8f063eea3600071b
- SMG: Škorpion vz. 61 / kutejnikov: https://sketchfab.com/3d-models/skorpion-vz-61-07bc7764f1d2460586c2907ff7f32753
- Frag: MK2 Fragmentation Grenade / rookieray: https://sketchfab.com/3d-models/mk2-fragmentation-grenade-54af0de447594e5680d657e9f9e1089d
- Smoke: M18 Smoke Grenade / RedRogueXIII: https://sketchfab.com/3d-models/m18-smoke-grenade-6dbb48151a9147b4830aa7bf55fc8282
- Flash: Flashbang grenade / knik211: https://sketchfab.com/3d-models/flashbang-grenade-2799b0b859c74db6ae8752fdc6bb4c04

Some textures may carry real manufacturer logos (likeliest: the MP5 and the Remingtons). We'll paint those out if they show.

---

## 3. Announcer voice lines: you record these

Save into `public/assets/sounds/announcer/`. The **file name** must match the ID; the words are up to you. Any line you haven't recorded is read by the Mac's built-in voice as a placeholder (switchable in the menu), so you can record them gradually. New files are picked up when players reload the page; no server restart needed.

| File (ID) | Suggested line | When it plays | Priority |
|---|---|---|---|
| `match_start` | "Fight!" | A match begins | P1 |
| `victory` | "Victory!" | Your team wins | P1 |
| `defeat` | "Defeat." | Your team loses | P1 |
| `draw` | "Draw." | Match tied at time limit | P3 |
| `first_blood` | "First blood!" | First kill of the match (everyone hears it) | P1 |
| `headshot` | "Headshot!" | You kill with a headshot | P1 |
| `double_kill` | "Double kill!" | 2 kills within 4 s | P1 |
| `triple_kill` | "Triple kill!" | 3 kills within 4 s | P1 |
| `multi_kill` | "Multi kill!" | 4+ kills within 4 s | P2 |
| `streak_5` | "Killing spree!" | 5 kills without dying | P1 |
| `streak_10` | "Unstoppable!" | 10 kills without dying | P2 |
| `streak_ended` | "Streak ended." | You die after a 5+ streak | P3 |
| `knife_kill` | "Humiliation!" | You get a knife kill | P2 |
| `lead_taken` | "We've taken the lead." | Your team goes ahead | P2 |
| `lead_lost` | "We've lost the lead." | Your team falls behind | P2 |
| `one_minute` | "One minute remaining." | 60 s left | P2 |
| `ten_kills_left` | "Ten kills to win." | Your team is 10 kills from winning | P2 |
| `one_kill_left` | "One kill to win." | Your team is 1 kill from winning | P2 |
| `round_start` | "Round start." | Elimination / objective round begins (milestone 2) | P2 |
| `round_won` | "Round won." | Your team takes the round | P2 |
| `round_lost` | "Round lost." | Your team loses the round | P2 |
| `last_alive` | "You're the last one standing." | You're the last player alive on your team | P2 |
| `match_point` | "Match point." | One round from winning | P2 |
| `final_round` | "Final round." | Both teams one round from winning | P3 |

| `charge_planted` | "The charge has been planted." | Objective mode: charge planted (everyone hears it) | P2 |
| `charge_defused` | "The charge has been defused." | Objective mode: charge defused | P2 |
| `halftime` | "Half time. Switching sides." | Objective mode: teams swap attack and defense | P3 |

**Recording tips**
- **Voice Memos** on Mac or iPhone works fine. Share or export the memo, and the `.m4a` file plays as-is. `.mp3`, `.wav` and `.ogg` also work.
- Rename each file exactly to its ID, for example `first_blood.m4a`.
- Record in a quiet, soft room (a closet full of clothes is great). Keep the mic about a hand's width away.
- Trim silence at the start so lines hit instantly. Keep most lines under 2 seconds.
- Record everything in one session at the same distance so the volume matches. Do 2 to 3 takes and keep the best.
- An over-the-top delivery works well for kill lines; a calm one for "One minute remaining".

---

## 4. Sound effects (done: CC0 packs, fetched and built by script)

In the game now (all CC0, from OpenGameArt and a GitHub mirror of Kenney's impact sounds):

| Sound | Source |
|---|---|
| Gunshots, close and mid distance, 3 shots each | "The Free Firearm Sound Library" (Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney). Rifle: AK-47 · battle rifle: SKS, muffled in game · sniper: Mosin Nagant · pistol: Colt 1911 · Makarov: Bersa .380 · SMG: Carl Gustav M45 · shotgun: Winchester Model 12. Each is two-mic stereo; all but the AK use one mic, since mixing the two cancels part of the sound |
| Magazine out / in, slide | "Handgun reload sound effect" |
| Pump | "Gun reload sounds" (SpringySpringo) |
| Shotgun shells | "Shotgun reload sound effects" |
| Kill confirmation | "150 combat sound effects": heavy punch, low-passed (your own `kill.*` in `public/assets/sounds/ui/` still wins) |
| Dry-fire click | "Equipment clicks II" |
| Knife, grenade throw | "Swishes sound pack" |
| Grenade bounce | "Metal impact sounds" (Brian MacIntosh) |
| Frag, charge explosion | "150 combat sound effects" |
| Flashbang | "Flash bang sound" |
| Footsteps (concrete, wood, grass; metal from plate impacts), softened; landing, bullet impacts, bullet hitting you | Kenney "Impact Sounds" |

**Comparing:** open **http://localhost:3000/dev/sounds.html** on the host Mac to hear every sound in the game, with alternatives from other recordings under the ones being tuned (pistol, shotgun, pump, footsteps, kill). The alternatives are listed in `ALTS` in the build script.

To change one: edit `SOUNDS` in `scripts/build-sounds.mjs` (source file, which shot or which part of a recording, length, level) and run `node scripts/build-sounds.mjs`. `node scripts/build-sounds.mjs --segments <file>` lists the separate sounds inside a recording. Anything missing falls back to the built-in synthesized sound.

Still stand-ins: grenade pin, smoke hiss, bolt cycling (uses the slide), weapon draw, metal footsteps (plate impacts), shell casings. Better recordings for these: Sonniss GDC bundles (sonniss.com/gameaudiogdc, manual download, royalty-free) or Freesound (account needed).

Other free sources:
- **Freesound.org:** filter by licence **CC0** (no credit) or **Attribution**. Avoid "Noncommercial".
- **Sonniss GDC Game Audio Bundles** (sonniss.com/gameaudiogdc): huge royalty-free packs, no credit needed.
- **Kenney.nl** (CC0): UI clicks and impacts.


---

## 5. Textures and sky (Claude can fetch with your OK; CC0, no credit)

**Done:** the map textures come from https://ambientcg.com (CC0).
- The **1K-JPG** zips are unzipped in `assets-src/textures/<AssetId>/`.
- `bash scripts/build-textures.sh` recompresses each surface's Color, NormalGL and Roughness maps into `public/assets/game/textures/` (11 MB). It uses macOS's built-in `sips`.
- Tile size, tint and per-surface tweaks live in `PHOTO` in `public/js/textures.js`.
- If the folder is missing, the game falls back to its painted stand-ins.

| Surface | ambientCG asset | Notes |
|---|---|---|
| Outer walls, decks, hall roof | Concrete036 | Darkened, contrast flattened (it looked like marble close up) |
| Ground | Road012A | |
| Lane dividers, hall | Bricks085 | |
| Crates | Planks020 | A corner of the photo, with a painted frame and brace on top |
| Containers | CorrugatedSteel005 | One grey steel, tinted red / blue / green |
| Plaza floor | PavingStones136 | Warmed up (olive in the photo) |
| Plaza walls | Tiles143 | Limestone blocks |
| Plastered walls (pavilions, houses) | PaintedPlaster017 | Warm white paint (was PaintedPlaster006, too blotchy) |
| Lawns | Ground037 | Worn lawn with bare patches (was Grass005, too bright and even) |
| Hedges | Moss002 | Clipped box hedge, toned down |
| Tree trunks and branches | Bark012 | Darkened toward brown |
| Tree leaves | LeafSet005 (an atlas: color + opacity) | The game paints leaf cards from its single leaves, some darkened as if in shade |
| Trims, doors | Metal plates / rusted metal | P3, not yet |

To swap a texture:
1. Download another asset's 1K-JPG zip into `assets-src/textures/<AssetId>/` and unzip it.
2. Change its id in `scripts/build-textures.sh` and run the script.

From https://polyhaven.com (CC0):
- **Sky:** an outdoor HDRI ("clear sky", "overcast", or a sunset for night maps). P2.
- **Props:** barrels, pallets, fences, lamp posts, sandbags, cars. They make the map look real and give more cover. P3.

---

## 6. Interface (optional)

| What | Source | Priority |
|---|---|---|
| Weapon silhouettes for the kill feed and class menu | Can be drawn later, or game-icons.net (CC-BY) | P3 |
| Class icons (Assault, Marksman, Breacher, Runner) | game-icons.net (CC-BY) | P3 |
| Display font for titles | Google Fonts (OFL licence), e.g. "Rajdhani" or "Teko" | P3 |
| Menu music | Your own, or CC0 / CC-BY from Freesound / OpenGameArt | P3 |

---

## Credits

Shown in the game's menu (built from each model's licence data). Currently:

- Guns with first-person arms and animations: "FPS … animations" sets by **Cransh** (sketchfab.com/ccransh), CC-BY 4.0. Each set credits the models inside it:
  - Rifle: "FPS AK-74m animations". AK-74m by creationwasteland.
  - Sniper: "FPS animations sniper rifle". Rifle by Oleg Anufriev (Naches).
  - Pistol: "FPS pistol animations". Springfield Armory XD by raimeiyonke.
  - SMG: "SMG FPS Animations". Masterpiece Arms 30 SST by eNse7en.
  - Shotgun: "FPS Arms remington (shotgun)". Remington 870 by tris09.
  - Makarov: "Makarov PM FPS animations". Makarov PM by Martin Trafas (Bexxie).
  - Battle rifle: "FPS animations VSK". VSK-94 by valterjherson1. This set comes with its own, bare arms.
  - Arms in all the other sets: "FP Arms" by DJMaesen (bumstrum). The shotgun and Makarov sets came with a different version of the arms, so the AK set's arms were moved onto them.
- Knife: "M9 Bayonet" by FJH, CC-BY 4.0
- Charge (objective mode): "IED" by davidthe19th, CC-BY 4.0
- Frag: "M67 Fragmentation Grenade" by FJH, CC-BY 4.0
- Smoke: "M18 Smoke Grenade" by Vanillatography, CC-BY 4.0
- Flashbang: "M84 Stun Grenade "Flashbang"" by Vanillatography, CC-BY 4.0
- Built but switched off: first-person arms "PSX First Person Arms" by Drillimpact, CC0
- Replaced by the animated sets (still in assets-src/weapons/, settings in git history), all CC-BY 4.0:
  - "AK-74M Assault Rifle" (FJH)
  - "Colt M1911 & Silencer" (FJH)
  - "Modern Sniper Rifle" (Vlasov Daniil)
  - "Remington 870 Police Magnum" (8sianDude)
  - "MP5K" (Shorty_Digitan)
  - "Ar-15" (3DYAROSLAV2)
  - "FN SCAR" (nghiakua06)
  - "GameReady: Colt Python Revolver" (HYQQM)
- Downloaded, not used: "FREE FPS Arms with glove" (Alexander_Ovelar), "Fps Arms Rigged" (TALL DOOR), "Fps arms" (DJMaesen), all CC-BY 4.0; L115A3 (Mortavex, CC-BY 4.0, 196k triangles, too heavy for now)
- Characters and animations: Mixamo (Adobe), free for games, no credit required
- Map textures: ambientCG (Concrete036, Road012A, Bricks085, Planks020, CorrugatedSteel005, PavingStones136, Tiles143, PaintedPlaster017, Ground037, Moss002, Bark012, LeafSet005), CC0
- Sounds (all CC0; see section 4): "The Free Firearm Sound Library" by Ben Jaszczak, Brian Nelson, Kevin Heras and Matthew Nanney; Kenney "Impact Sounds"; OpenGameArt packs by SpringySpringo, Brian MacIntosh and others
