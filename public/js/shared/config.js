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
  runSpeed: 5.6,
  walkSpeed: 2.8,
  crouchSpeed: 2.1,
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
  tdm: { name: 'Team Deathmatch', killLimit: 50, timeLimit: 15 * 60, endScreen: 12 },
};

// Spread values are radians of random cone; recoil values are radians of view kick per shot.
export const WEAPONS = {
  rifle: {
    name: 'Rifle', slot: 1, auto: true, pellets: 1,
    damage: 30, headMult: 4, legMult: 0.75, range: 250,
    fireInterval: 0.1, mag: 30, reserve: 90, reload: 2.4, draw: 0.5,
    spread: { base: 0.003, move: 0.04, air: 0.12, crouch: 0.6, perShot: 0.007, max: 0.06, recover: 0.15 },
    recoil: { pitch: 0.011, yaw: 0.004, recover: 6 },
    speedMult: 0.94,
  },
  pistol: {
    name: 'Pistol', slot: 2, auto: false, pellets: 1,
    damage: 25, headMult: 4, legMult: 0.75, range: 150,
    fireInterval: 0.16, mag: 12, reserve: 48, reload: 1.8, draw: 0.35,
    spread: { base: 0.005, move: 0.025, air: 0.09, crouch: 0.7, perShot: 0.012, max: 0.05, recover: 0.12 },
    recoil: { pitch: 0.016, yaw: 0.005, recover: 8 },
    speedMult: 1.0,
  },
  knife: {
    name: 'Knife', slot: 3, melee: true, auto: true, pellets: 1,
    damage: 55, headMult: 1, legMult: 1, range: 2.2,
    fireInterval: 0.5, draw: 0.3,
    speedMult: 1.08,
  },
};

export const WEAPON_ORDER = ['rifle', 'pistol', 'knife'];
export const LOADOUT = ['rifle', 'pistol', 'knife'];

export function damageFor(weapon, zone) {
  const w = WEAPONS[weapon];
  if (zone === 'head') return w.damage * w.headMult;
  if (zone === 'legs') return w.damage * w.legMult;
  return w.damage;
}
