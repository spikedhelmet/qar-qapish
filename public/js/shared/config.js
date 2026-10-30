// Game rules shared by the server and the browser client.

export const TICK_RATE = 30;        // server snapshots per second
export const SEND_RATE = 30;        // client state updates per second
export const INTERP_DELAY = 100;    // ms other players are rendered in the past

export const TEAMS = {
  A: { name: 'Falcons', color: 0x3f6fb5, css: '#5b8fe0' },
  B: { name: 'Jackals', color: 0xb8742e, css: '#e0954a' },
};

export const PLAYER = {
  radius: 0.35,
  height: 1.8,
  crouchHeight: 1.5,
  eye: 1.62,
  crouchEye: 1.26,
  maxHp: 100,
  runSpeed: 5.2,
  sprintSpeed: 7.0,
  walkSpeed: 2.6,
  crouchSpeed: 2.1,
  slideSpeed: 9.0,      // initial slide speed (or current speed if faster)
  slideTime: 0.8,       // seconds
  slideFriction: 1.3,
  slideCooldown: 0.9,   // seconds after a slide ends before the next one
  slideEye: 0.95,
  sprintRecover: 0.15,  // seconds after sprinting before you can fire
  accel: 70,
  airAccel: 14,
  friction: 11,
  gravity: 22,
  jumpSpeed: 7.2,
  stepHeight: 0.45,
  respawnTime: 3,       // seconds
  spawnProtection: 2,   // seconds, ends early when the player fires
};

export const MODES = {
  tdm: { name: 'Team Deathmatch', killLimit: 50, timeLimit: 15 * 60, endScreen: 12, respawn: true },
  elim: {
    name: 'Elimination', roundsToWin: 7, endScreen: 12, respawn: false,
    freezeTime: 5,    // seconds at round start: pick a class, can look but not move
    roundTime: 120,
    roundEnd: 5,      // seconds to show the round result
  },
};
export const MODE_ORDER = ['tdm', 'elim'];

export const CLASSES = {
  assault:  { name: 'Assault',  primary: 'rifle',   grenade: 'frag',  speed: 1.0,  desc: 'Rifle. Reliable at every range.' },
  marksman: { name: 'Marksman', primary: 'sniper',  grenade: 'smoke', speed: 0.96, desc: 'Scoped bolt-action. One shot, one kill.' },
  breacher: { name: 'Breacher', primary: 'shotgun', grenade: 'flash', speed: 1.0,  desc: 'Pump shotgun. Owns close quarters.' },
  runner:   { name: 'Runner',   primary: 'smg',     grenade: 'smoke', speed: 1.08, desc: 'SMG. Fastest on foot, accurate on the move.' },
};
export const CLASS_ORDER = ['assault', 'marksman', 'breacher', 'runner'];
export const DEFAULT_CLASS = 'assault';

export function loadoutFor(cls) {
  return [(CLASSES[cls] || CLASSES[DEFAULT_CLASS]).primary, 'pistol', 'knife'];
}

// Spread values are radians of random cone; recoil values are radians of view kick per shot.
// ads: right-click aim. fov = zoom multiplier, spread/speed = multipliers while aiming,
// time = seconds to aim in, scope = show a scope overlay instead of iron sights.
// falloff: damage scales down from 1 at `start` meters to `min` at `end` meters.
export const WEAPONS = {
  rifle: {
    name: 'Rifle', slot: 1, auto: true, pellets: 1,
    damage: 30, headMult: 4, legMult: 0.75, range: 250,
    fireInterval: 0.1, mag: 30, reserve: 90, reload: 2.4, draw: 0.5,
    spread: { base: 0.003, move: 0.04, air: 0.12, crouch: 0.6, perShot: 0.007, max: 0.06, recover: 0.15 },
    recoil: { pitch: 0.011, yaw: 0.004, recover: 6 },
    ads: { fov: 0.72, spread: 0.35, speed: 0.7, time: 0.18 },
    speedMult: 0.94,
  },
  pistol: {
    name: 'Pistol', slot: 2, auto: false, pellets: 1,
    damage: 25, headMult: 4, legMult: 0.75, range: 150,
    fireInterval: 0.16, mag: 12, reserve: 48, reload: 1.8, draw: 0.35,
    spread: { base: 0.005, move: 0.025, air: 0.09, crouch: 0.7, perShot: 0.012, max: 0.05, recover: 0.12 },
    recoil: { pitch: 0.016, yaw: 0.005, recover: 8 },
    ads: { fov: 0.85, spread: 0.55, speed: 0.8, time: 0.12 },
    speedMult: 1.0,
  },
  sniper: {
    name: 'Sniper', slot: 1, auto: false, pellets: 1,
    damage: 105, headMult: 2, legMult: 0.7, range: 400,
    fireInterval: 1.35, mag: 5, reserve: 20, reload: 3.0, draw: 0.8,
    spread: { base: 0.06, move: 0.1, air: 0.2, crouch: 0.8, perShot: 0, max: 0, recover: 1 },
    recoil: { pitch: 0.05, yaw: 0.01, recover: 5 },
    ads: { fov: 0.25, spread: 0.008, speed: 0.55, time: 0.25, scope: true },
    speedMult: 0.9,
  },
  shotgun: {
    name: 'Shotgun', slot: 1, auto: false, pellets: 8,
    damage: 16, headMult: 1.5, legMult: 0.75, range: 45,
    falloff: { start: 7, end: 25, min: 0.2 },
    fireInterval: 0.85, mag: 6, reserve: 24, reload: 2.8, draw: 0.55,
    spread: { base: 0.055, move: 0.012, air: 0.03, crouch: 0.9, perShot: 0, max: 0, recover: 1 },
    recoil: { pitch: 0.045, yaw: 0.012, recover: 5 },
    ads: { fov: 0.88, spread: 0.8, speed: 0.85, time: 0.15 },
    speedMult: 0.95,
  },
  smg: {
    name: 'SMG', slot: 1, auto: true, pellets: 1,
    damage: 22, headMult: 3.5, legMult: 0.75, range: 120,
    falloff: { start: 12, end: 35, min: 0.65 },
    fireInterval: 0.07, mag: 30, reserve: 120, reload: 2.0, draw: 0.4,
    spread: { base: 0.006, move: 0.018, air: 0.08, crouch: 0.7, perShot: 0.006, max: 0.05, recover: 0.2 },
    recoil: { pitch: 0.008, yaw: 0.005, recover: 8 },
    ads: { fov: 0.82, spread: 0.5, speed: 0.85, time: 0.14 },
    speedMult: 1.0,
  },
  knife: {
    name: 'Knife', slot: 3, melee: true, auto: true, pellets: 1,
    damage: 55, headMult: 1, legMult: 1, range: 2.2,
    fireInterval: 0.5, draw: 0.3,
    speedMult: 1.08,
  },
};

export function damageFor(weapon, zone, dist = 0) {
  const w = WEAPONS[weapon];
  const mult = zone === 'head' ? w.headMult : zone === 'legs' ? w.legMult : 1;
  let fall = 1;
  if (w.falloff) {
    const { start, end, min } = w.falloff;
    fall = dist <= start ? 1 : dist >= end ? min : 1 - (1 - min) * (dist - start) / (end - start);
  }
  return w.damage * mult * fall;
}
