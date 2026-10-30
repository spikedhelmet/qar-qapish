# Real art assets: shopping list

The game currently uses stand-in models built in code. This is the list of free assets to download so we can swap in realistic characters and guns. Both sites need a free account, so **you** download them; put the files in the folders below and tell Claude they're there.

Everything here is free to use in a game. CC-BY items need the creator credited; we'll add a credits screen.

## 1. Characters and animations: Mixamo

Site: https://www.mixamo.com (free Adobe account)

**Characters** go in `public/assets/characters/`
- Pick **two** soldier or tactical looking characters, one per team (Falcons / Jackals).
- Download each: Format **FBX Binary (.fbx)**, Pose **T-pose**, **With Skin**.
- Name them `team_a.fbx` and `team_b.fbx`.

**Animations** go in `public/assets/animations/`
Select a character first, then search for each animation. Download settings: **FBX Binary, Without Skin, 30 fps**, and tick **In Place** whenever that box appears.

| Save as | Search Mixamo for | Needed for |
|---|---|---|
| `rifle_idle.fbx` | "rifle idle" | milestone 1 swap |
| `rifle_run_forward.fbx` | "rifle run" | milestone 1 swap |
| `rifle_run_backward.fbx` | "run backward rifle" | |
| `rifle_strafe_left.fbx` | "strafe left rifle" | |
| `rifle_strafe_right.fbx` | "strafe right rifle" | |
| `rifle_walk.fbx` | "walking rifle" | |
| `crouch_idle.fbx` | "crouch idle rifle" | |
| `crouch_walk.fbx` | "crouch walk rifle" | |
| `jump.fbx` | "rifle jump" | |
| `rifle_fire.fbx` | "firing rifle" | |
| `reload.fbx` | "reloading" | |
| `pistol_idle.fbx` | "pistol idle" | |
| `throw.fbx` | "throw grenade" | milestone 4 |
| `death.fbx` | "dying" or "death from front headshot" | milestone 1 swap |

Characters plus `rifle_idle`, `rifle_run_forward` and `death` are enough to start the swap.

## 2. Weapons: Sketchfab

Site: https://sketchfab.com (free account). On each page click **Download 3D Model** and choose **glTF Binary (.glb)**.
Put them in `public/assets/weapons/` with the file name shown.

All picks below were checked via Sketchfab's API as **CC Attribution (CC-BY 4.0)** and downloadable. Before downloading, open each page and check it still says CC Attribution.

| Save as | Model / creator | Link | Triangles |
|---|---|---|---|
| `rifle.glb` | AK-74M Assault Rifle / FJH | https://sketchfab.com/3d-models/ak-74m-assault-rifle-9084c3bae8224d338103997bc3101480 | 17.6k |
| `pistol.glb` | Colt M1911 & Silencer / FJH | https://sketchfab.com/3d-models/colt-m1911-silencer-066b5650970e4d01b721fd4d19ab8065 | 8.8k |
| `knife.glb` | M9 Bayonet / FJH | https://sketchfab.com/3d-models/m9-bayonet-933c897ce36d44ebb06a9500f13b77c9 | 2.9k |
| `sniper.glb` | Modern Sniper Rifle, Free Lowpoly / dan741vlasov | https://sketchfab.com/3d-models/modern-sniper-rifle-free-lowpoly-45c99509f1ee4c2a8c9c3336d3e2ff5a | 19.7k |
| `shotgun.glb` | Remington 870 Police Magnum / haoliu95 | https://sketchfab.com/3d-models/remington-870-police-magnum-12-gauge-shotgun-eea11de7e9d24b6683962b8388c319eb | 17.5k |
| `smg.glb` | HK MP5 SMG / dani-zzz | https://sketchfab.com/3d-models/hk-mp5-smg-fad0226e1dcf4af180f707a5509d3a4e | 32.2k |
| `frag.glb` | M67 Fragmentation Grenade / FJH | https://sketchfab.com/3d-models/m67-fragmentation-grenade-26eda181849f4d188f69105302fd7b65 | 13.1k |
| `smoke.glb` | M18 Smoke Grenade / vanillatography | https://sketchfab.com/3d-models/m18-smoke-grenade-46343925ad0e47cf927e66da7953c372 | 5.1k |
| `flash.glb` | M84 Stun Grenade "Flashbang" / vanillatography | https://sketchfab.com/3d-models/m84-stun-grenade-flashbang-3dbda8fe68ff4efdbf59f7d414c5619c | 11.4k |

The FJH models (rifle, pistol, knife, frag) share one look, so start with those. For milestone 1 only `rifle`, `pistol` and `knife` are needed.

**Backups**, if a primary is gone or looks off:
- Rifle: M16 Assault Rifle / jeandiz: https://sketchfab.com/3d-models/m16-assault-rifle-339d0f7b21024387853dd926a5d51b50
- Pistol: Pistol 43 Tactical / dan741vlasov: https://sketchfab.com/3d-models/pistol-43-tactical-free-lowpoly-ec43fa0124084f739887e322646912bf
- Knife: Gerber Combat Knife / lucassoler: https://sketchfab.com/3d-models/gerber-combat-knife-low-poly-f8991297774e415c976cc8d476ca21e0
- Sniper: Remington 700 BDL / haoliu95: https://sketchfab.com/3d-models/remington-model-700-bdl-09c6c23bde8547b1880d76d6b95cd481 (48k triangles, heavy)
- Shotgun: Remington 870 / milinam2002: https://sketchfab.com/3d-models/remington-870-shotgun-6db0ad4764d14eee8f063eea3600071b
- SMG: Škorpion vz. 61 / kutejnikov: https://sketchfab.com/3d-models/skorpion-vz-61-07bc7764f1d2460586c2907ff7f32753
- Frag: MK2 Fragmentation Grenade / rookieray: https://sketchfab.com/3d-models/mk2-fragmentation-grenade-54af0de447594e5680d657e9f9e1089d
- Smoke: M18 Smoke Grenade / RedRogueXIII: https://sketchfab.com/3d-models/m18-smoke-grenade-6dbb48151a9147b4830aa7bf55fc8282
- Flash: Flashbang grenade / knik211: https://sketchfab.com/3d-models/flashbang-grenade-2799b0b859c74db6ae8752fdc6bb4c04

**Watch for:** some models may have real manufacturer logos in their textures (likeliest: the MP5 and the Remingtons). We'll paint those out if they show.

## 3. Textures (Claude can fetch these, with your OK)

Photo-realistic, free (CC0) surface textures for concrete, brick, asphalt, wood and painted metal from https://ambientcg.com or https://polyhaven.com. No account needed.

## Credits (fill in as assets are added)

- _none yet_
