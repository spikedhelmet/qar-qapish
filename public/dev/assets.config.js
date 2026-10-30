// What the asset build tool (/dev/build.html) turns raw downloads in assets-src/ into game files.
// Paths are relative to assets-src/. Output goes to public/assets/game/.

// Every weapon is baked into the same frame: barrel along -Z, top up +Y, origin at the top of the
// pistol grip (where the trigger hand sits), real-world length in meters.
// grip / muzzle: [fraction from the back, fraction from the bottom] of the visible model's bounding box.
export const WEAPONS = {
  rifle: {
    src: 'weapons/ak-74m_assault_rifle.glb', length: 0.94,
    hide: /^(Round|Shell)_/, grip: [0.30, 0.66], muzzle: [1, 0.80], // display round + shell beside the gun
  },
  pistol: {
    src: 'weapons/colt_m1911__silencer.glb', length: 0.22,
    hide: /^(Silencer|Round|Shell)_/, grip: [0.21, 0.67], muzzle: [1, 0.88], // display bullet + shell lie under the gun
  },
  knife: {
    src: 'weapons/m9_bayonet.glb', length: 0.31, rotateY: 180,
    grip: [0.21, 0.43], muzzle: [1, 0.45],
  },
  sniper: {
    src: 'weapons/modern_sniper_rifle__free_lowpoly.glb', length: 1.15,
    grip: [0.29, 0.37], muzzle: [1, 0.59],
  },
  shotgun: {
    src: 'weapons/remington_870_police_magnum_12_gauge_shotgun.glb', length: 0.98,
    hide: /^Object_[23]$/, grip: [0.29, 0.53], muzzle: [1, 0.91],
  },
  smg: {
    src: 'weapons/mp5k.glb', length: 0.33,
    grip: [0.17, 0.52], muzzle: [1, 0.84],
  },
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
