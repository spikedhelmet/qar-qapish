// What the asset build tool (/dev/build.html) turns raw downloads in assets-src/ into game files.
// Paths are relative to assets-src/. Output goes to public/assets/game/.

// Every weapon is baked into the same frame: barrel along -Z, top up +Y, origin at the top of the
// pistol grip (where the trigger hand sits), real-world length in meters.
// grip / muzzle: [fraction from the back, fraction from the bottom] of the visible model's bounding box.
// rotateZ levels a model that was posed tilted (applied before rotateY). cuts: see applyCuts in build.html.
export const WEAPONS = {
  knife: {
    src: 'weapons/m9_bayonet.glb', length: 0.31, rotateY: 180,
    grip: [0.21, 0.43], muzzle: [1, 0.45],
  },
};
// The guns come from the animated sets below (VIEWMODELS). The static models used before them (AK-74M,
// M1911, sniper, Remington, MP5K, AR-15, FN SCAR, Colt Python) are still in assets-src/weapons/; to
// bring one back, add an entry here like the knife's (see git history for their settings).

// First-person weapons with arms and animations: "FPS … animations" sets by Cransh (Sketchfab, CC-BY),
// one glTF each with the arms, the gun and its clips. Built into a viewmodel (arms + gun + clips, eye at
// the origin, real size) and a gun-only copy for other players to hold.
// length: the gun's real length in meters (sets the scale). eye: bone or node the creator's camera sits
// on (default: 'Camera', else 'Head_Cam'); eyeOffset moves it (meters: right, up, back) for a set
// without a camera. clips: game action → clip name (without the 'Rig|' prefix).
// armsFrom: take the arms from that set instead (same bone names), so every weapon shows the same arms.
// scope: aim along the scope (instead of the line from the rear to the front sight).
const AN = 'weapons/animated/';
export const VIEWMODELS = {
  rifle: {
    src: `${AN}fps_ak-74m_animations.glb`, length: 0.94,
    clips: { idle: 'AK_Idle', draw: 'AK_Draw', walk: 'AK_Walk', run: 'AK_Run', fire: 'AK_Shot', reload: 'AK_Reload_var2', reloadEmpty: 'AK_Reload_full' },
  },
  sniper: {
    src: `${AN}fps_animations_sniper_rifle.glb`, length: 1.15, scope: true,
    clips: { idle: 'SRifle_Idle', walk: 'SRifle_Walk', fire: 'SRifle_Shot_nosight', reload: 'SRifle_Reload', reloadEmpty: 'SRifle_Reload_Full' },
  },
  pistol: {
    src: `${AN}fps_pistol_animations.glb`, length: 0.19,
    clips: { idle: 'FPS_Pistol_Idle', walk: 'FPS_Pistol_Walk', fire: 'FPS_Pistol_Fire', reload: 'FPS_Pistol_Reload_easy', reloadEmpty: 'FPS_Pistol_Reload_full' },
  },
  smg: {
    src: `${AN}smg_fps_animations.glb`, length: 0.6,
    clips: { idle: 'KDW_DPose_Idle', draw: 'KDW_Draw', walk: 'KDW_Walk', run: 'KDW_Run', fire: 'KDW_Shot', reload: 'KDW_Reload_fast', reloadEmpty: 'KDW_Reload_full' },
  },
  shotgun: {
    src: `${AN}fps_arms_remington_shotgun.glb`, length: 1.0, eye: 'Head_Cam', armsFrom: 'rifle',
    clips: { idle: 'SG_FPS_Idle', walk: 'SG_FPS_Walk', fire: 'SG_FPS_Shot', reload: 'SG_FPS_Reload' },
  },
  makarov: {
    src: `${AN}makarov_pm_fps_animations.glb`, length: 0.161, eye: 'Head_Cam', armsFrom: 'rifle',
    clips: { idle: 'MK_Idle', walk: 'MK_walk', fire: 'MK_Shot', reload: 'MK_ReloadFast', reloadEmpty: 'MK_ReloadFull' },
  },
  vsk: {
    src: `${AN}fps_animations_vsk.glb`, length: 0.89, eye: 'Root', eyeOffset: [0, 0.18, 0.1], // no camera: placed like the AK's
    clips: { idle: 'VSK_Idle', walk: 'VSK_Walk', run: 'VSK_Sprint', fire: 'VSK_Fire', reload: 'VSK_ReloadNotFull', reloadEmpty: 'VSK_ReloadFull' },
  },
};

// Grenades: held upright, sized by `height` instead of length, origin at the middle of the body.
// Each download contains extra copies (pin pulled, exploded views) that are hidden.
export const GRENADES = {
  frag: { src: 'weapons/m67_fragmentation_grenade.glb', height: 0.095, hide: /lowTris001/, grip: [0.5, 0.4], muzzle: [0.5, 1] },
  smoke: { src: 'weapons/m18_smoke_grenade.glb', height: 0.145, hide: /PainterExport00[12]/, grip: [0.5, 0.4], muzzle: [0.5, 1] },
  flash: { src: 'weapons/m84_stun_grenade_flashbang.glb', height: 0.135, hide: /_low00[23]_/, grip: [0.5, 0.4], muzzle: [0.5, 1] },
};

// First-person arms (rigged). Scaled to meters, turned to face -Z, origin between the shoulders.
// texture: swap in another skin from the same pack. credit: for models without licence data inside.
export const ARMS = {
  src: 'arms/psx-first-person-arms-free-game-assets/arms_rig.glb', scale: 1, rotateY: 180,
  shoulders: ['upper_armL', 'upper_armR'],
  texture: 'arms/psx-first-person-arms-free-game-assets/arms_gloves_01.png',
  credit: { title: 'PSX First Person Arms', author: 'Drillimpact', license: 'CC0 1.0', source: 'https://drillimpact.itch.io/psx-first-person-arms-free' },
};

// World objects (not held in first person): same frame as weapons, one 1K file each.
export const PROPS = {
  charge: { src: 'weapons/ied.glb', length: 0.24, grip: [0.5, 0], muzzle: [1, 0.5] }, // origin: center of its base
};

// One character per team (Mixamo FBX, T-pose, with skin). Scaled to `height` meters.
export const CHARACTERS = {
  A: { src: 'characters/swat_blue_mesh.fbx', height: 1.8 },
  B: { src: 'characters/swat_black_mesh.fbx', height: 1.8 },
};

// Animation clips the game uses: id → source FBX. `move: true` keeps the clip's own travel
// (deaths fall naturally); everything else is stripped to play in place.
const R = 'animations/pro-rifle/', B = 'animations/Basic Shooter Pack/', P = 'animations/Pistol_Handgun Locomotion Pack/';
const dirs = { f: 'forward', b: 'backward', l: 'left', r: 'right', fl: 'forward left', fr: 'forward right', bl: 'backward left', br: 'backward right' };
const eightWay = (prefix, file) => Object.fromEntries(Object.entries(dirs).map(([k, d]) => [`${prefix}_${k}`, `${R}${file} ${d}.fbx`]));

export const ANIMATIONS = {
  rifle_idle: `${R}idle aiming.fbx`,
  ...eightWay('rifle_walk', 'walk'),
  ...eightWay('rifle_run', 'run'),
  sprint_f: `${R}sprint forward.fbx`,
  crouch_idle: `${R}idle crouching aiming.fbx`,
  ...eightWay('crouch_walk', 'walk crouching'),
  jump_up: `${R}jump up.fbx`,
  jump_loop: `${R}jump loop.fbx`,
  jump_down: `${R}jump down.fbx`,
  death_front: { src: `${R}death from the front.fbx`, move: true },
  death_back: { src: `${R}death from the back.fbx`, move: true },
  death_right: { src: `${R}death from right.fbx`, move: true },
  death_head_front: { src: `${R}death from front headshot.fbx`, move: true },
  death_head_back: { src: `${R}death from back headshot.fbx`, move: true },
  death_crouch: { src: `${R}death crouching headshot front.fbx`, move: true },
  rifle_fire: `${B}firing rifle.fbx`,
  rifle_reload: `${B}reloading.fbx`,
  hit: `${B}hit reaction.fbx`,
  throw: `${B}Toss Grenade.fbx`,
  pistol_idle: `${P}pistol idle.fbx`,
  pistol_walk_f: `${P}pistol walk.fbx`,
  pistol_walk_b: `${P}pistol walk backward.fbx`,
  pistol_run_f: `${P}pistol run.fbx`,
  pistol_run_b: `${P}pistol run backward.fbx`,
  pistol_strafe_l: `${P}pistol strafe.fbx`,
  pistol_strafe_r: `${P}pistol strafe (2).fbx`,
  kneel_down: `${P}pistol stand to kneel.fbx`,
  kneel_idle: `${P}pistol kneeling idle.fbx`,
};

export const TEXTURE_SIZE = { firstPerson: 2048, thirdPerson: 1024, character: 1024 };
