// What the asset build tool (/dev/build.html) turns raw downloads in assets-src/ into game files.
// Paths are relative to assets-src/. Output goes to public/assets/game/.

// Every weapon is baked into the same frame: barrel along -Z, top up +Y, origin at the top of the
// pistol grip (where the trigger hand sits), real-world length in meters.
// grip / muzzle: [fraction from the back, fraction from the bottom] of the visible model's bounding box.
// rotateZ levels a model that was posed tilted (applied before rotateY). cuts: see applyCuts in build.html.
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
  carbine: {
    src: 'weapons/ar-15.glb', length: 0.86, rotateY: 90, rotateZ: 15, // posed muzzle-down 15°
    grip: [0.27, 0.62], muzzle: [1, 0.77],
    // Staged for a picture: a spare magazine top sits on the rail (dropped), and the magazine lies
    // beside the gun. It's moved into the magazine well; the matrix was worked out once from its shape
    // (long axis up, floorplate down, curve forward, 30% inside the well).
    cuts: [
      { mesh: /^Object_4$/, box: [[0.2, 0.7, -0.12], [0.72, 1.1, 0.19]], any: true },
      { mesh: /^Object_4$/, box: [[-9, -9, 0.19], [9, 9, 9]], any: true, name: 'Magazine',
        matrix: [-0.9145, 0.4004, -0.058, 0, 0.3802, 0.8014, -0.4617, 0, -0.1384, -0.4443, -0.8851, 0, -0.2784, -0.3384, 0.5244, 1] },
    ],
  },
  scar: {
    src: 'weapons/fn_scar.glb', length: 0.99, rotateY: 90,
    hide: /foregrip/, // the vertical foregrip would sit in the support hand
    grip: [0.25, 0.52], muzzle: [1, 0.69],
    // The sight's own reticle (one small plane between the glass panes): the game draws its own.
    cuts: [{ mesh: /Scope/, box: [[0.035, 0.588, -0.05], [0.058, 0.616, -0.01]] }],
  },
  revolver: {
    src: 'weapons/gameready_colt_python_revolver.glb', length: 0.29,
    grip: [0.24, 0.68], muzzle: [1, 0.82],
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
