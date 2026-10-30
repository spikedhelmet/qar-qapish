# Asset list

Everything the game needs to look and sound finished. Right now it runs on stand-ins built in code, so nothing here blocks playing; each item replaces a stand-in as it arrives.

**Who gets what**
- **You:** anything behind a login (Mixamo, Sketchfab, Freesound) and your own voice recordings.
- **Claude, with your OK:** sites with no login (ambientCG, Poly Haven). Claude asks before downloading anything.

Drop files into the folder listed for each item and tell Claude. Everything listed is free for games; **CC-BY** items need credit, which goes in the [Credits](#credits) section and on an in-game credits screen.

Priority: **P1** = first swap, the biggest visual and audio jump · **P2** = needed for milestones 2 to 4 · **P3** = polish.

---

## 1. Characters and animations: Mixamo (you)

Site: https://www.mixamo.com (free Adobe account). Licence: free for games, no credit required.

### Characters → `public/assets/characters/`
Download: **FBX Binary (.fbx)**, **T-pose**, **With Skin**.

| File | What | Priority |
|---|---|---|
| `team_a.fbx` | Soldier or tactical character for the Falcons | P1 |
| `team_b.fbx` | A visibly different soldier for the Jackals | P1 |

### Animations → `public/assets/animations/`
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

Site: https://sketchfab.com (free account). On each page: **Download 3D Model → glTF Binary (.glb)**. Save into `public/assets/weapons/`.
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

Objective-mode lines (bomb planted, defused, etc.) will be added to this table in milestone 3.

**Recording tips**
- **Voice Memos** on Mac or iPhone works fine. Share or export the memo, and the `.m4a` file plays as-is. `.mp3`, `.wav` and `.ogg` also work.
- Rename each file exactly to its ID, for example `first_blood.m4a`.
- Record in a quiet, soft room (a closet full of clothes is great). Keep the mic about a hand's width away.
- Trim silence at the start so lines hit instantly. Keep most lines under 2 seconds.
- Record everything in one session at the same distance so the volume matches. Do 2 to 3 takes and keep the best.
- An over-the-top delivery works well for kill lines; a calm one for "One minute remaining".

---

## 4. Sound effects (you; Freesound needs a free account)

Save into `public/assets/sounds/sfx/` as `.mp3`, `.ogg` or `.wav`. Good free sources:
- **Freesound.org:** filter by licence **CC0** (no credit) or **Attribution**. Avoid "Noncommercial".
- **Sonniss GDC Game Audio Bundles** (sonniss.com/gameaudiogdc): huge royalty-free packs, no credit needed.
- **Kenney.nl** (CC0): UI clicks and impacts.

| File | Sound | Priority |
|---|---|---|
| `rifle_fire.*` | Rifle shot, close | P1 |
| `pistol_fire.*` | Pistol shot, close | P1 |
| `rifle_reload.*`, `pistol_reload.*` | Mag out, mag in, charge | P1 |
| `dry_fire.*` | Click on empty | P2 |
| `draw.*` | Weapon raise / cloth | P3 |
| `knife_swing.*`, `knife_hit.*` | Whoosh, stab | P2 |
| `sniper_fire.*`, `shotgun_fire.*`, `smg_fire.*` | New weapons (milestone 2) | P2 |
| `shotgun_pump.*`, `sniper_bolt.*` | Cycle actions | P2 |
| `distant_shot.*` | Far-away gunfire tail (one generic is fine) | P3 |
| `step_concrete_1..4.*` | Footsteps on concrete, 4 variations | P1 |
| `step_metal_1..4.*` | Footsteps on containers / metal | P3 |
| `land.*` | Landing from a jump | P2 |
| `slide.*` | Clothing / gravel scrape, about 0.8 s | P2 |
| `impact_concrete.*`, `impact_metal.*`, `impact_wood.*` | Bullet impacts | P2 |
| `impact_body.*` | Bullet hitting a player | P2 |
| `hitmarker.*`, `headshot.*`, `kill_confirm.*` | Your hit feedback | P1 |
| `hurt_1..3.*` | Grunts when you take damage | P3 |
| `grenade_pin.*`, `grenade_bounce.*`, `frag_explode.*`, `smoke_hiss.*`, `flash_bang.*`, `ear_ring.*` | Grenades (milestone 4) | P2 |
| `charge_plant.*`, `charge_beep.*`, `charge_defuse.*`, `charge_explode.*` | Objective mode (milestone 3) | P2 |
| `ui_click.*`, `round_horn.*` | Menu click, round start | P3 |

---

## 5. Textures and sky (Claude can fetch with your OK; CC0, no credit)

From https://ambientcg.com (download the **2K-JPG** zip: Color, NormalGL, Roughness) → `public/assets/textures/`

| Surface | What to look for | Priority |
|---|---|---|
| Outer walls, decks | Concrete (cast / board-formed) | P1 |
| Ground | Asphalt | P1 |
| Lane dividers | Bricks | P1 |
| Crates | Wood planks | P1 |
| Containers | Corrugated or painted metal | P1 |
| Trims, doors | Metal plates / rusted metal | P3 |

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

Fill in as assets are added (needed for every CC-BY item):

- _none yet_
