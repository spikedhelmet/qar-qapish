// Stand-in models built from primitives: a jointed soldier and simple guns.
// They expose the same small interface the real Mixamo / Sketchfab models will use later.
import * as THREE from 'three';
import { TEAMS, WEAPONS } from './shared/config.js';
import { weaponModel, weaponInfo, armsModel, characterModel, viewmodelAsset } from './assets.js';
import { FpArms, RIGS } from './fparms.js';
import { FpRig } from './fprig.js';
import { playMech } from './audio.js';

const mat = (color, roughness = 0.85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

const MATS = {
  metal: mat(0x2a2c2f, 0.38, 0.75),
  polymer: mat(0x1b1c1e, 0.7, 0.05),
  skin: mat(0xc39577, 0.7),
  boot: mat(0x1d1a17, 0.8),
  glove: mat(0x23221f, 0.9),
  blade: mat(0x9aa0a6, 0.25, 0.9),
};

const UNIFORMS = {
  A: { pants: 0x2c3442, shirt: 0x3a4555, vest: 0x31435c, helmet: 0x2b3646 },
  B: { pants: 0x7a6a4f, shirt: 0x8a7a5c, vest: 0x6b5b3e, helmet: 0x5f553f },
};

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const box = (w, h, d, material, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
const cyl = (r, len, material, x, y, z) => {
  const m = mesh(new THREE.CylinderGeometry(r, r, len, 12), material, x, y, z);
  m.rotation.x = Math.PI / 2;
  return m;
};
// Capsule hanging down from its parent's origin.
function limb(radius, length, material) {
  const g = new THREE.CapsuleGeometry(radius, length - radius * 2, 4, 10);
  g.translate(0, -length / 2, 0);
  return mesh(g, material);
}

// ---------------------------------------------------------------- guns
// Barrel points along -z; origin is at the pistol grip. `userData.muzzle` marks the barrel tip.

// Guns without a stand-in model of their own borrow one (and its hand placement) from a similar gun.
const LIKE = { vsk: 'rifle', makarov: 'pistol' };

export function buildGun(kind) {
  kind = LIKE[kind] || kind;
  const g = new THREE.Group();
  const muzzle = new THREE.Object3D();
  if (kind === 'rifle') {
    g.add(box(0.055, 0.085, 0.36, MATS.metal, 0, 0.03, -0.08));
    g.add(box(0.064, 0.07, 0.26, MATS.polymer, 0, 0.02, -0.38));
    g.add(cyl(0.011, 0.24, MATS.metal, 0, 0.035, -0.6));
    g.add(cyl(0.017, 0.05, MATS.metal, 0, 0.035, -0.73));
    g.add(box(0.05, 0.075, 0.24, MATS.polymer, 0, 0.005, 0.2));
    g.add(box(0.052, 0.11, 0.04, MATS.polymer, 0, -0.005, 0.33));
    g.add(box(0.03, 0.012, 0.12, MATS.metal, 0, 0.078, -0.07));   // top rail
    for (const x of [-0.011, 0.011]) g.add(box(0.007, 0.03, 0.012, MATS.metal, x, 0.093, -0.02)); // rear notch
    g.add(box(0.004, 0.05, 0.008, MATS.metal, 0, 0.08, -0.48));    // front post, tip on the sight line
    const mag = box(0.032, 0.17, 0.065, MATS.polymer, 0, -0.1, -0.15);
    mag.rotation.x = 0.28;
    g.add(mag);
    const grip = box(0.034, 0.1, 0.045, MATS.polymer, 0, -0.05, 0.02);
    grip.rotation.x = -0.3;
    g.add(grip);
    muzzle.position.set(0, 0.035, -0.77);
  } else if (kind === 'sniper') {
    g.add(box(0.05, 0.07, 0.42, MATS.metal, 0, 0.03, -0.06));
    g.add(cyl(0.011, 0.62, MATS.metal, 0, 0.035, -0.58));
    g.add(cyl(0.017, 0.07, MATS.metal, 0, 0.035, -0.92));            // muzzle brake
    g.add(box(0.055, 0.09, 0.32, MATS.polymer, 0, -0.005, 0.27));    // stock
    g.add(box(0.045, 0.035, 0.16, MATS.polymer, 0, 0.055, 0.22));    // cheek rest
    g.add(box(0.06, 0.05, 0.26, MATS.polymer, 0, 0.0, -0.36));       // fore-stock
    g.add(cyl(0.021, 0.3, MATS.polymer, 0, 0.115, -0.06));           // scope tube
    g.add(cyl(0.03, 0.07, MATS.polymer, 0, 0.115, -0.24));           // objective bell
    g.add(cyl(0.026, 0.05, MATS.polymer, 0, 0.115, 0.1));            // eyepiece
    for (const z of [-0.14, 0.02]) g.add(box(0.03, 0.035, 0.025, MATS.metal, 0, 0.08, z)); // rings
    const bolt = cyl(0.008, 0.05, MATS.metal, 0.04, 0.05, 0.06);
    bolt.rotation.set(0, 0, Math.PI / 2);
    g.add(bolt);
    g.add(box(0.03, 0.06, 0.06, MATS.polymer, 0, -0.035, -0.12));   // magazine
    const grip = box(0.034, 0.1, 0.045, MATS.polymer, 0, -0.05, 0.04);
    grip.rotation.x = -0.35;
    g.add(grip);
    muzzle.position.set(0, 0.035, -0.96);
  } else if (kind === 'shotgun') {
    g.add(box(0.055, 0.08, 0.3, MATS.metal, 0, 0.025, -0.04));
    g.add(cyl(0.014, 0.52, MATS.metal, 0, 0.05, -0.45));
    g.add(cyl(0.012, 0.4, MATS.metal, 0, 0.018, -0.4));              // magazine tube
    const pump = box(0.062, 0.052, 0.17, MATS.polymer, 0, 0.018, -0.38);
    g.add(pump);
    g.userData.pump = pump;
    g.add(box(0.05, 0.09, 0.3, MATS.polymer, 0, -0.01, 0.25));
    g.add(box(0.052, 0.12, 0.04, MATS.polymer, 0, -0.02, 0.4));
    g.add(box(0.006, 0.008, 0.006, MATS.blade, 0, 0.067, -0.69));    // bead sight
    const grip = box(0.034, 0.1, 0.045, MATS.polymer, 0, -0.05, 0.05);
    grip.rotation.x = -0.3;
    g.add(grip);
    muzzle.position.set(0, 0.05, -0.72);
  } else if (kind === 'smg') {
    g.add(box(0.05, 0.075, 0.28, MATS.metal, 0, 0.03, -0.06));
    g.add(box(0.056, 0.06, 0.12, MATS.polymer, 0, 0.028, -0.25));
    g.add(cyl(0.01, 0.1, MATS.metal, 0, 0.04, -0.36));
    g.add(box(0.03, 0.18, 0.045, MATS.polymer, 0, -0.1, -0.13));     // straight magazine
    for (const x of [-0.018, 0.018]) g.add(box(0.008, 0.012, 0.22, MATS.metal, x, 0.02, 0.18)); // folding stock
    g.add(box(0.05, 0.08, 0.015, MATS.metal, 0, 0.0, 0.29));
    g.add(box(0.03, 0.012, 0.1, MATS.metal, 0, 0.073, -0.06));
    for (const x of [-0.01, 0.01]) g.add(box(0.006, 0.025, 0.01, MATS.metal, x, 0.085, 0.0));
    g.add(box(0.004, 0.035, 0.008, MATS.metal, 0, 0.078, -0.29));
    const grip = box(0.034, 0.1, 0.045, MATS.polymer, 0, -0.05, 0.03);
    grip.rotation.x = -0.25;
    g.add(grip);
    muzzle.position.set(0, 0.04, -0.42);
  } else if (kind === 'pistol') {
    g.add(box(0.03, 0.035, 0.19, MATS.metal, 0, 0.055, -0.06));
    g.add(box(0.028, 0.025, 0.15, MATS.polymer, 0, 0.026, -0.05));
    const grip = box(0.03, 0.11, 0.046, MATS.polymer, 0, -0.025, 0.015);
    grip.rotation.x = -0.22;
    g.add(grip);
    g.add(box(0.006, 0.01, 0.006, MATS.metal, 0, 0.078, -0.145));
    muzzle.position.set(0, 0.055, -0.16);
  } else if (kind === 'knife') {
    const handle = cyl(0.014, 0.11, MATS.polymer, 0, 0, 0.02);
    g.add(handle);
    g.add(box(0.05, 0.012, 0.012, MATS.metal, 0, 0, -0.04));
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.014); shape.lineTo(0.15, -0.012); shape.lineTo(0.19, 0.006);
    shape.lineTo(0.15, 0.016); shape.lineTo(0, 0.016);
    const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false });
    bladeGeo.translate(0, 0, -0.002);
    const blade = mesh(bladeGeo, MATS.blade);
    blade.rotation.y = Math.PI / 2;
    blade.position.z = -0.045;
    g.add(blade);
    muzzle.position.set(0, 0, -0.24);
  } else if (WEAPONS[kind]?.grenade) {
    const color = { frag: 0x3c4630, smoke: 0x5a5d58, flash: 0x30343a }[kind];
    const body = kind === 'frag' ? mesh(new THREE.SphereGeometry(0.032, 14, 10), mat(color, 0.7))
      : mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.11, 14), mat(color, 0.6));
    g.add(body);
    g.add(box(0.012, 0.03, 0.012, MATS.metal, 0, 0.06, 0)); // fuse
    muzzle.position.set(0, 0.08, 0);
  }
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  return g;
}

// ---------------------------------------------------------------- soldier

const ARM = { upper: 0.3, fore: 0.3 };
const DOWN = new THREE.Vector3(0, -1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

// Where the gun sits and where each hand goes, in the shoulder-height aim frame.
const GRIPS = {
  rifle: { mount: [0.08, -0.2, -0.3], right: [0.08, -0.25, -0.28], left: [0.08, -0.22, -0.5] },
  sniper: { mount: [0.08, -0.2, -0.32], right: [0.08, -0.25, -0.28], left: [0.08, -0.21, -0.52] },
  shotgun: { mount: [0.08, -0.2, -0.3], right: [0.08, -0.25, -0.25], left: [0.08, -0.19, -0.56] },
  smg: { mount: [0.08, -0.18, -0.36], right: [0.08, -0.23, -0.33], left: [0.08, -0.25, -0.5] },
  pistol: { mount: [0.03, -0.12, -0.5], right: [0.03, -0.16, -0.48], left: [0.0, -0.17, -0.46] },
  knife: { mount: [0.2, -0.3, -0.36], right: [0.2, -0.3, -0.34], left: [-0.26, -0.5, -0.05] },
  frag: { mount: [0.2, -0.25, -0.36], right: [0.2, -0.27, -0.34], left: [-0.26, -0.5, -0.05] },
  smoke: { mount: [0.2, -0.25, -0.36], right: [0.2, -0.27, -0.34], left: [-0.26, -0.5, -0.05] },
  flash: { mount: [0.2, -0.25, -0.36], right: [0.2, -0.27, -0.34], left: [-0.26, -0.5, -0.05] },
};

// Two-bone IK: point the arm at the target and bend the elbow so the hand lands on it.
function solveArm(arm, target) {
  const v = target.clone().sub(arm.shoulder.position);
  const L1 = ARM.upper, L2 = ARM.fore;
  const d = Math.max(0.05, Math.min(v.length(), L1 + L2 - 0.001));
  const a = Math.acos(Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const b = Math.PI - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
  arm.shoulder.quaternion.setFromUnitVectors(DOWN, v.normalize())
    .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -a));
  arm.elbow.rotation.set(b, 0, 0);
}

export class Soldier {
  constructor(team) {
    this.team = team;
    this.root = new THREE.Group();
    this.walkPhase = 0;
    this.deathT = -1;
    this.crouch = 0;
    this.slide = 0;
    this.build();
    this.setWeapon('rifle');
  }

  build() {
    const u = UNIFORMS[this.team];
    const pants = mat(u.pants, 0.95), shirt = mat(u.shirt, 0.95);
    const vest = mat(u.vest, 0.8), helmet = mat(u.helmet, 0.55, 0.1);

    this.hips = new THREE.Group();
    this.root.add(this.hips);
    this.hips.add(mesh(new THREE.CapsuleGeometry(0.15, 0.08, 4, 10), pants, 0, 0.02, 0));

    this.legs = [-1, 1].map(side => {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.1, 0, 0);
      thigh.add(limb(0.075, 0.46, pants));
      const knee = new THREE.Group();
      knee.position.y = -0.44;
      knee.add(limb(0.062, 0.44, pants));
      const boot = box(0.11, 0.08, 0.24, MATS.boot, 0, -0.42, -0.04);
      knee.add(boot);
      thigh.add(knee);
      this.hips.add(thigh);
      return { thigh, knee };
    });

    this.spine = new THREE.Group();
    this.hips.add(this.spine);
    this.spine.add(mesh(new THREE.CapsuleGeometry(0.16, 0.32, 4, 12), shirt, 0, 0.3, 0));
    this.spine.add(box(0.38, 0.4, 0.27, vest, 0, 0.32, 0));
    for (const x of [-0.11, 0, 0.11]) this.spine.add(box(0.08, 0.1, 0.05, vest, x, 0.22, -0.155)); // pouches
    this.spine.add(box(0.26, 0.08, 0.05, vest, 0, 0.5, 0.06));

    this.neck = new THREE.Group();
    this.neck.position.y = 0.58;
    this.spine.add(this.neck);
    this.neck.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 10), MATS.skin, 0, 0.03, 0));
    const head = mesh(new THREE.SphereGeometry(0.115, 18, 14), MATS.skin, 0, 0.14, 0);
    head.scale.set(0.92, 1.05, 1);
    this.neck.add(head);
    const lid = mesh(new THREE.SphereGeometry(0.135, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), helmet, 0, 0.16, 0.005);
    lid.scale.set(1, 0.9, 1.05);
    this.neck.add(lid);
    this.neck.add(box(0.2, 0.035, 0.03, MATS.polymer, 0, 0.165, -0.115)); // goggles strap / visor band

    // Arms and weapon pivot together around the shoulders so they follow aim pitch.
    this.aim = new THREE.Group();
    this.aim.position.y = 0.5;
    this.spine.add(this.aim);
    this.armR = this.arm(1, shirt);
    this.armL = this.arm(-1, shirt);
    this.gunMount = new THREE.Group();
    this.gunMount.position.set(0.1, -0.12, -0.32);
    this.aim.add(this.gunMount);
  }

  arm(side, sleeve) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.21, 0, 0);
    shoulder.add(limb(0.06, ARM.upper + 0.02, sleeve));
    const elbow = new THREE.Group();
    elbow.position.y = -ARM.upper;
    elbow.add(limb(0.05, ARM.fore, sleeve));
    elbow.add(mesh(new THREE.SphereGeometry(0.045, 8, 8), MATS.glove, 0, -ARM.fore, 0));
    shoulder.add(elbow);
    this.aim.add(shoulder);
    return { shoulder, elbow };
  }

  setWeapon(kind) {
    if (this.weaponKind === kind) return;
    this.weaponKind = kind;
    this.gunMount.clear();
    this.gun = buildGun(kind);
    this.gunMount.add(this.gun);
    const pose = GRIPS[kind] || GRIPS[LIKE[kind]];
    this.gunMount.position.fromArray(pose.mount);
    solveArm(this.armR, new THREE.Vector3().fromArray(pose.right));
    solveArm(this.armL, new THREE.Vector3().fromArray(pose.left));
  }

  // state: { yaw, pitch, crouch, speed, alive }
  update(dt, s) {
    this.root.rotation.y = s.yaw;
    this.crouch += ((s.crouch ? 1 : 0) - this.crouch) * Math.min(1, dt * 12);
    const c = this.crouch;

    if (!s.alive) {
      if (this.deathT < 0) this.deathT = 0;
      this.deathT = Math.min(1, this.deathT + dt * 2.2);
      const e = 1 - Math.pow(1 - this.deathT, 3);
      this.root.rotation.x = e * 1.45;
      this.hips.position.y = 0.92 - c * 0.34 - e * 0.68;
      return;
    }
    this.deathT = -1;
    this.root.rotation.x = 0;

    const moving = Math.min(1, s.speed / 4.5);
    this.walkPhase += dt * (4 + s.speed * 1.6) * (moving > 0.05 ? 1 : 0);
    const swing = Math.sin(this.walkPhase) * 0.55 * moving;
    this.legs.forEach((leg, i) => {
      const ph = i === 0 ? swing : -swing;
      const lift = Math.max(0, Math.sin(this.walkPhase + (i === 0 ? Math.PI / 2 : -Math.PI / 2))) * 0.8 * moving;
      leg.thigh.rotation.x = ph * (1 - c) + 1.2 * c * (i === 0 ? 1 : 0.85);
      leg.knee.rotation.x = -lift * (1 - c) - 1.6 * c;
    });
    const bob = Math.abs(Math.sin(this.walkPhase)) * 0.025 * moving;
    this.hips.position.y = 0.92 - c * 0.34 + bob;
    this.spine.rotation.x = -0.18 * c;
    this.aim.rotation.x = s.pitch + 0.18 * c;
    this.neck.rotation.x = s.pitch * 0.6;

    // Slide: legs out in front, leaning back, still aiming.
    this.slide += ((s.sliding ? 1 : 0) - this.slide) * Math.min(1, dt * 14);
    const k = this.slide;
    if (k > 0.01) {
      this.legs.forEach((leg, i) => {
        leg.thigh.rotation.x += (1.35 + i * 0.15 - leg.thigh.rotation.x) * k;
        leg.knee.rotation.x += ((i ? -0.9 : -0.2) - leg.knee.rotation.x) * k;
      });
      this.hips.position.y += (0.36 - this.hips.position.y) * k;
      this.spine.rotation.x += (0.5 - this.spine.rotation.x) * k;
      this.aim.rotation.x = s.pitch - this.spine.rotation.x;
    }
  }

  muzzleWorld(target) {
    return this.gun.userData.muzzle.getWorldPosition(target);
  }
}

export function teamColor(team) {
  return TEAMS[team].color;
}

// ---------------------------------------------------------------- first-person hands + gun

// How each gun kicks in your hands (the aim kick itself lives in weapons.js).
// back/up in meters, pitch/yaw/roll in radians at the peak; shake = camera jolt.
// Per shot: the gun snaps straight back into the shoulder (back, up: meters), the muzzle rises a little
// (pitch, radians) with a touch of random yaw and roll, and the camera jolts (shake). Kept small: the
// aim itself climbs through the weapon's recoil pattern, the gun only shows the punch.
// flash: muzzle flash size.
const KICK = {
  rifle:   { back: 0.032, up: 0.004, pitch: 0.035, yaw: 0.01, roll: 0.015, shake: 0.003, flash: 1 },
  smg:     { back: 0.022, up: 0.003, pitch: 0.025, yaw: 0.01, roll: 0.012, shake: 0.002, flash: 0.8 },
  pistol:  { back: 0.028, up: 0.008, pitch: 0.09, yaw: 0.012, roll: 0.02, shake: 0.003, flash: 0.7 },
  shotgun: { back: 0.065, up: 0.01, pitch: 0.12, yaw: 0.02, roll: 0.035, shake: 0.012, flash: 1.5 },
  sniper:  { back: 0.075, up: 0.01, pitch: 0.1, yaw: 0.012, roll: 0.025, shake: 0.012, flash: 1.4 },
  vsk:     { back: 0.042, up: 0.006, pitch: 0.05, yaw: 0.014, roll: 0.02, shake: 0.005, flash: 0.6 }, // suppressed
  makarov: { back: 0.024, up: 0.008, pitch: 0.08, yaw: 0.012, roll: 0.02, shake: 0.0025, flash: 0.6 },
};
export const flashSize = kind => KICK[kind]?.flash ?? 1;
// Does this weapon aim through an optic (so the HUD draws a reticle when aiming)?
export const hasOptic = kind => !!REAL_VIEW[kind]?.optic && !!weaponInfo(kind);
// The bolt or slide cycles on every shot of a self-loading gun: back in a blink, then home.
const SHOT_CYCLE = 0.07; // seconds

// Where spent casings leave the gun (gun space) and what they look like.
const EJECT = {
  rifle:   { port: [0.025, 0.045, -0.12], size: [0.0045, 0.03], color: 0xb08d3c },
  smg:     { port: [0.022, 0.05, -0.08], size: [0.0042, 0.02], color: 0xb08d3c },
  pistol:  { port: [0.012, 0.045, -0.04], size: [0.0045, 0.02], color: 0xb08d3c },
  sniper:  { port: [0.03, 0.045, -0.04], size: [0.005, 0.045], color: 0xb08d3c },
  shotgun: { port: [0.025, 0.03, -0.08], size: [0.009, 0.05], color: 0x9a2a22 },
  makarov: { port: [0.012, 0.04, -0.03], size: [0.0045, 0.018], color: 0xb08d3c },
  vsk:     { port: [0.025, 0.05, -0.1], size: [0.005, 0.04], color: 0xb08d3c },
};

const rndSpin = () => (Math.random() * 2 - 1) * 25;

// How the real first-person hands hold each weapon, in the gun's frame (barrel -Z, up +Y).
// fingers: where the fingers point; across: pinky knuckle → index knuckle; off: nudge from the
// stand-in hand position to the palm; curl: how tightly the fingers close (0 open … 1 fist);
// thumb: where the thumb points (optional).
// Right hand on a pistol grip: wrist→knuckles runs forward along the grip, palm on its right side,
// fingers curling round the front.
const GRIP_RIGHT = { fingers: [0, 0.2, -1], across: [0, 1, 0.2], thumb: [-0.4, 0.1, -1], off: [0.03, -0.01, 0.025], curl: 0.85, trigger: 0.55 };
// Support hand under the handguard: palm cupping its underside, fingers wrapping up its right side,
// thumb running forward along its left.
const SUPPORT = { fingers: [0.8, 0.6, 0], across: [0, 0, -1], thumb: [0.1, 0.25, -1], off: [0.015, 0.02, 0], curl: 0.75 };
const HAND_POSES = {
  rifle: { right: GRIP_RIGHT, left: SUPPORT },
  smg: { right: GRIP_RIGHT, left: SUPPORT },
  sniper: { right: GRIP_RIGHT, left: SUPPORT },
  shotgun: { right: GRIP_RIGHT, left: { ...SUPPORT, curl: 0.8 } },
  pistol: { right: { ...GRIP_RIGHT, curl: 1.1, trigger: 0.5 }, left: null }, // one-handed; tighter fist on the small grip
  knife: { right: { fingers: [-1, -0.3, 0], across: [0, 0.2, -1], off: [0.02, 0, 0], curl: 1 }, left: null },
  frag: { right: { fingers: [-0.7, 0.4, -0.5], across: [0, 1, 0.2], off: [0.035, -0.01, 0.01], curl: 0.75 }, left: null },
};
HAND_POSES.smoke = HAND_POSES.flash = HAND_POSES.frag;
HAND_POSES.vsk = HAND_POSES.rifle;
HAND_POSES.makarov = HAND_POSES.pistol;

// First-person hands are off for now: the guns float on their own. Set to true to bring back the
// rigged arms (or the stand-in sleeves when no arms model is built).
const SHOW_HANDS = false;

// How far forward of the grip the support hand holds the handguard (rifle-shaped guns).
const SUPPORT_Z = { rifle: -0.27, vsk: -0.27 };

// Where the arms' shoulders sit relative to the eye. The soldier's sit a little ahead of the eye
// (its arms are shorter) — its chest stays below the bottom of the view.
const ARMS_PLACE = {
  arms: new THREE.Vector3(0, -0.47, -0.2),
  soldier: new THREE.Vector3(0, -0.42, -0.14),
};
// Slightly long arms so the support hand reaches a rifle's handguard.
const ARMS_SCALE = { arms: 1.15, soldier: 1.1 };

// Moving parts inside the real gun models (matched by mesh name): the magazine that comes out
// on a reload, and the bolt / slide that gets racked afterwards.
const PARTS = {
  rifle:  { mag: /^Magazine_/, bolt: /^Shutter_/, rack: 0.07 },
  pistol: { mag: /^(Magazine|MagFollower)_/, bolt: /^Shutter_/, rack: 0.035 },
  sniper: { mag: /^Cube054_/ },
  smg:    { mag: /^Object_5$/ },
};

// Returns a function that offsets `part` by (dx, dy, dz) meters in the gun's own frame,
// whatever scaling and rotation sit between the gun and that part.
function partMover(gun, part) {
  gun.updateMatrixWorld(true);
  const toParent = gun.matrixWorld.clone().invert().multiply(part.parent.matrixWorld).invert();
  const origin = new THREE.Vector3().applyMatrix4(toParent);
  const base = part.position.clone();
  const v = new THREE.Vector3();
  return (dx, dy, dz) => part.position.copy(base).add(v.set(dx, dy, dz).applyMatrix4(toParent).sub(origin));
}

const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

// Damped spring on three axes: kicked with a velocity, it snaps back with a small overshoot.
class Spring {
  constructor(stiffness, damping) {
    this.k = stiffness;
    this.c = damping;
    this.x = new THREE.Vector3();
    this.v = new THREE.Vector3();
    // Damping lowers the first peak; scale kicks up so they reach the requested size.
    const w = Math.sqrt(stiffness), zeta = damping / (2 * w), wd = Math.sqrt(1 - zeta * zeta);
    this.gain = w / Math.exp(-zeta * Math.atan2(wd, zeta) / wd);
  }
  // Adds a kick whose peak displacement is (x, y, z).
  kick(x, y, z) {
    this.v.x += x * this.gain; this.v.y += y * this.gain; this.v.z += z * this.gain;
  }
  update(dt) {
    for (let t = 0; t < dt; t += 1 / 240) {
      const h = Math.min(1 / 240, dt - t);
      this.v.x += (-this.k * this.x.x - this.c * this.v.x) * h;
      this.v.y += (-this.k * this.x.y - this.c * this.v.y) * h;
      this.v.z += (-this.k * this.x.z - this.c * this.v.z) * h;
      this.x.addScaledVector(this.v, h);
    }
  }
}

// Animated first-person sets (fprig.js): hip moves the whole set from where its creator framed it
// (meters: right, up, back) and turn tilts it (radians: pitch, yaw, roll), both easing out when aiming.
// relief: how far in front of the eye the rear sight sits when aiming (meters).
const ANIM_VIEW = {
  rifle:   { hip: [0, 0, 0], relief: 0.2 },
  vsk:     { hip: [0.11, -0.14, -0.22], turn: [0.06, 0.12, 0.08], relief: 0.16 }, // no camera in the set: framed by hand
  smg:     { hip: [0, 0, 0], relief: 0.14 },
  shotgun: { hip: [0.02, -0.02, -0.08], relief: 0.18 },
  sniper:  { hip: [0, 0, 0], relief: 0.07 },
  pistol:  { hip: [0, 0, 0], relief: 0.36 },
  makarov: { hip: [0.02, -0.09, 0], relief: 0.36 },
};

// Real gun models: where the grip sits at the hip, and how far in front of the eye the gun
// sits when aiming (adsZ; the rear sight ends up roughly a hand's width from the eye).
// Iron sights: the top of the gun lines up with the eye; adsY nudges that when the highest point
// isn't the sight. optic: guns with a red dot / holographic sight. `y` is the middle of its window
// (gun frame, meters above the grip, found by casting rays through the sight of the built model;
// re-measure after rebuilding with a different grip), lined up with the eye so the game's own
// reticle, drawn at the screen center where shots go, sits in the window. Built-in reticles are cut
// out of the models (assets.config.js) so they can't disagree with it.
const REAL_VIEW = {
  rifle:   { hip: [0.15, -0.18, -0.33], adsZ: 0.05 },
  sniper:  { hip: [0.15, -0.19, -0.36], adsZ: -0.1 },
  shotgun: { hip: [0.15, -0.19, -0.31], adsZ: -0.24 },
  smg:     { hip: [0.13, -0.16, -0.29], adsZ: -0.15, adsY: 0.012 }, // look through the rear drum, not over it
  pistol:  { hip: [0.12, -0.14, -0.42], adsZ: -0.42 }, // far enough out that both hands fit on screen
  knife:   { hip: [0.17, -0.19, -0.29] },
  frag:    { hip: [0.15, -0.15, -0.28] },
  smoke:   { hip: [0.15, -0.15, -0.28] },
  flash:   { hip: [0.15, -0.15, -0.28] },
};

export class ViewModel {
  constructor(team) {
    this.group = new THREE.Group();
    this.holder = new THREE.Group();
    this.group.add(this.holder);
    this.sleeve = mat(UNIFORMS[team].shirt, 0.95);
    this.buildArms(team);
    // Stiff, well-damped springs: a sharp kick that settles in about a tenth of a second, no wobble.
    this.recoilPos = new Spring(1100, 60);
    this.recoilRot = new Spring(700, 45);
    this.shake = new Spring(500, 30);   // camera jolt, read by main.js
    this.shells = [];
    this.swing = 0;
    this.bobT = 0;
    this.sway = new THREE.Vector2();
    this.sprintT = 0;
  }

  setTeam(team) {
    this.sleeve.color.setHex(UNIFORMS[team].shirt);
    if (team !== this.team) {
      this.buildArms(team);
      if (this.kind) this.setWeapon(this.kind);
    }
  }

  // Real arms: the PSX first-person arms when built, else your team's own soldier cut down to its
  // arms, else the stand-in sleeves. With real arms the stand-in sleeves only mark where the hands go.
  buildArms(team) {
    this.team = team;
    if (this.armsBody) this.group.remove(this.armsBody);
    this.armsRig = null;
    this.armsBody = null;
    if (!SHOW_HANDS) return;
    let body = armsModel(), rig = RIGS.psx, kind = 'arms';
    if (!body) { body = characterModel(team); rig = RIGS.mixamo; kind = 'soldier'; }
    this.armsBody = body;
    if (!body) return;
    body.scale.setScalar(ARMS_SCALE[kind]);
    const shoulders = ARMS_PLACE[kind];
    this.armsRig = new FpArms(body, rig);
    const mid = this.armsRig.shoulderMid(); // measure before moving the body
    body.position.copy(shoulders).sub(mid);
    this.group.add(body);
  }

  setWeapon(kind) {
    this.kind = kind;
    this.pumpArm = null;
    this.support = null;
    this.handR = null;
    this.cycle = 0;
    this.shotT = 0;
    this.throwT = -1;
    this.reload = null;
    this.holder.clear();
    this.rig = null;
    this.holder.position.set(0, 0, 0);
    // Animated set (arms, gun and the creator's clips) when built.
    const anim = viewmodelAsset(kind);
    if (anim) {
      this.rig = new FpRig(anim);
      this.holder.add(this.rig.aimer);
      this.gun = this.rig.scene;
      const v = ANIM_VIEW[kind] || { hip: [0, 0, 0], relief: 0.2 };
      this.base = new THREE.Vector3(...v.hip);
      this.adsPos = this.base; // the set aims itself (FpRig.aim)
      this.adsRelief = v.relief;
      this.hipTurn = new THREE.Vector3(...(v.turn || [0, 0, 0]));
      this.mag = []; this.bolt = [];
      this.rig.draw(WEAPONS[kind].draw);
      return;
    }
    this.gun = weaponModel(kind, 'fp') || buildGun(kind); // real model once built, stand-in otherwise
    this.holder.add(this.gun);
    // Forearm from the hand back toward the camera: rx tilts it down, ry swings it sideways.
    const arm = (x, y, z, rx, ry, len = 0.42) => {
      const a = new THREE.Group();
      a.rotation.order = 'YXZ';
      a.position.set(x, y, z);
      a.rotation.set(rx, ry, 0);
      a.add(limb(0.042, len, this.sleeve));
      a.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), MATS.glove));
      this.holder.add(a);
      if (!this.handR) this.handR = a;
      if (this.armsRig || !SHOW_HANDS) a.children.forEach(c => { c.visible = false; });
      return a;
    };
    if (kind === 'rifle' || kind === 'vsk') {
      arm(0, -0.05, 0.03, -1.0, 0.35);
      this.support = arm(-0.01, -0.03, SUPPORT_Z[kind], -0.95, -0.75, 0.55);
      this.base = new THREE.Vector3(0.19, -0.23, -0.48);
      this.adsPos = new THREE.Vector3(0, -0.105, -0.3); // iron sights on the crosshair
    } else if (kind === 'sniper') {
      arm(0, -0.05, 0.05, -1.0, 0.35);
      this.support = arm(-0.01, -0.02, -0.3, -0.95, -0.75, 0.55);
      this.base = new THREE.Vector3(0.19, -0.24, -0.5);
      this.adsPos = new THREE.Vector3(0, -0.115, -0.25); // hidden behind the scope overlay anyway
    } else if (kind === 'shotgun') {
      arm(0, -0.05, 0.05, -1.0, 0.35);
      this.pumpArm = new THREE.Group();
      this.holder.add(this.pumpArm);
      const a = new THREE.Group();
      a.rotation.order = 'YXZ';
      a.position.set(-0.01, -0.01, -0.33);
      a.rotation.set(-0.95, -0.75, 0);
      a.add(limb(0.042, 0.55, this.sleeve));
      a.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), MATS.glove));
      this.pumpArm.add(a);
      this.support = a;
      if (this.armsRig || !SHOW_HANDS) a.children.forEach(c => { c.visible = false; });
      this.base = new THREE.Vector3(0.19, -0.24, -0.46);
      this.adsPos = new THREE.Vector3(0, -0.068, -0.34);
    } else if (kind === 'smg') {
      arm(0, -0.05, 0.03, -1.0, 0.35);
      this.support = arm(-0.01, -0.04, -0.24, -0.95, -0.6, 0.48);
      this.base = new THREE.Vector3(0.17, -0.21, -0.42);
      this.adsPos = new THREE.Vector3(0, -0.097, -0.3);
    } else if (kind === 'pistol' || kind === 'makarov') {
      arm(0, -0.04, 0.02, -1.05, 0.3);
      this.support = arm(-0.03, -0.05, 0.03, -1.05, -0.45);
      this.base = new THREE.Vector3(0.14, -0.17, -0.42);
      this.adsPos = new THREE.Vector3(0, -0.081, -0.32);
    } else if (WEAPONS[kind]?.grenade) {
      arm(0, -0.03, 0.03, -1.0, 0.35);
      this.base = new THREE.Vector3(0.15, -0.15, -0.28);
      this.adsPos = this.base;
      this.gun.rotation.set(-0.15, 0.3, 0.15);
    } else {
      arm(0, 0, 0.03, -1.0, 0.35);
      this.base = new THREE.Vector3(0.2, -0.22, -0.36);
      this.adsPos = this.base;
      this.gun.rotation.set(0.2, 0.1, 0.4);
    }
    this.gun.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
    // Real models: line the top of the gun (its sights) up with the screen center when aiming.
    const info = weaponInfo(kind);
    this.mag = []; this.bolt = [];
    const parts = info && PARTS[kind];
    if (parts) {
      this.gun.traverse(o => {
        if (!o.isMesh) return;
        if (parts.mag?.test(o.name)) this.mag.push(partMover(this.gun, o));
        if (parts.bolt?.test(o.name)) this.bolt.push(partMover(this.gun, o));
      });
    }
    if (this.support) this.supportBase = this.support.position.clone();
    if (info) {
      const v = REAL_VIEW[kind];
      this.base = new THREE.Vector3(...v.hip);
      const sightLine = v.optic ? v.optic.y : info.sightY + 0.002 - (v.adsY || 0);
      this.adsPos = v.adsZ === undefined ? this.base : new THREE.Vector3(0, -sightLine, v.adsZ);
    }
  }

  // drawT: 0→1 raise progress, reloadT: 0→1 reload progress (or -1), adsT: 0→1 aimed in
  update(dt, { speed, onGround, drawT, reloadT, lookDX, lookDY, adsT = 0, sprinting = false, sliding = false }) {
    this.sprintT += ((sprinting ? 1 : 0) - this.sprintT) * Math.min(1, dt * 10);
    const steady = 1 - adsT * 0.85; // aiming damps bob and sway
    this.recoilPos.update(dt);
    this.recoilRot.update(dt);
    this.shake.update(dt);
    this.updateShells(dt);
    this.swing = Math.max(0, this.swing - dt * 3.5);
    this.sway.x += (Math.max(-1, Math.min(1, -lookDX * 0.02)) - this.sway.x) * Math.min(1, dt * 8);
    this.sway.y += (Math.max(-1, Math.min(1, lookDY * 0.02)) - this.sway.y) * Math.min(1, dt * 8);
    const moving = onGround ? Math.min(1, speed / 5) : 0;
    this.bobT += dt * (6 + speed);

    if (this.rig) return this.updateRig(dt, { speed, onGround, drawT, reloadT, adsT, sprinting, sliding, steady });
    const p = this.holder.position.lerpVectors(this.base, this.adsPos, adsT);
    const bob = (this.sprintT > 0.5 ? 2 : 1) * steady;
    p.x += (Math.sin(this.bobT) * 0.012 * moving + this.sway.x * 0.02) * bob;
    p.y += (Math.abs(Math.cos(this.bobT)) * 0.012 * moving - this.sway.y * 0.015) * bob;
    p.add(this.recoilPos.x);
    let rx = this.recoilRot.x.x, ry = this.sway.x * 0.05 * steady + this.recoilRot.x.y, rz = this.recoilRot.x.z;
    // Sprint: gun swings down and across the body.
    p.x -= this.sprintT * 0.07; p.y -= this.sprintT * 0.07;
    rx -= this.sprintT * 0.35; ry += this.sprintT * 0.75;
    if (sliding) rz += 0.18;
    const lower = 1 - Math.min(1, drawT);
    p.y -= lower * 0.25;
    rx -= lower * 0.6;
    if (reloadT >= 0) {
      const r = this.animateReload(Math.min(1, reloadT));
      p.add(r.pos); rx += r.rx; rz += r.rz;
    } else if (this.reload) {
      this.endReload();
    }
    // Grenade throw: draw back over the shoulder during the wind-up, then fling forward and let go.
    if (this.throwT >= 0) {
      this.throwT += dt;
      const w = this.throwWindup;
      if (this.throwT < w) {
        const k = Math.sin((this.throwT / w) * Math.PI / 2);
        p.x += k * 0.05; p.y += k * 0.12; p.z += k * 0.12;
        rx += k * 0.9; rz -= k * 0.3;
      } else {
        const k = Math.min(1, (this.throwT - w) / 0.25);
        p.y += 0.12 - k * 0.3; p.z += 0.12 - k * 0.35;
        rx += 0.9 - k * 1.8;
        this.gun.visible = false;
      }
    }
    if (this.swing > 0) {
      const s = Math.sin((1 - this.swing) * Math.PI);
      p.x -= s * 0.16; p.z -= s * 0.12;
      ry += s * 0.9;
    }
    // Self-loading guns: the bolt / slide flicks back and returns after each shot.
    if (this.shotT > 0) {
      this.shotT = Math.max(0, this.shotT - dt);
      const ph = 1 - this.shotT / SHOT_CYCLE, back = ph < 0.3 ? ph / 0.3 : (1 - ph) / 0.7;
      const rack = PARTS[this.kind]?.rack || 0;
      if (!this.reload) for (const b of this.bolt) b(0, 0, rack * back);
    }
    // Pump / bolt: slide the forend (and the hand on it) back and forward.
    if (this.cycle > 0) {
      const before = this.cycle;
      this.cycle = Math.max(0, this.cycle - dt);
      if (before > 0.2 && this.cycle <= 0.2) this.ejectShell(); // casing comes out mid-pump / bolt
      const k = this.cycle < 0.45 ? Math.sin((1 - this.cycle / 0.45) * Math.PI) : 0;
      const pump = this.gun.userData.pump;
      if (pump) pump.position.z = -0.38 + k * 0.09;
      if (this.pumpArm) this.pumpArm.position.z = k * 0.09;
      rx -= k * 0.08;
      rz -= k * (pump ? 0.05 : 0.18);
    }
    this.holder.rotation.set(rx, ry, rz);
    if (this.armsRig) this.placeHands();
  }

  // Animated set: its own clips do the walking, firing and reloading; this adds look sway, a small
  // recoil spring, the sprint pose for sets without a run clip, and the draw for sets without one.
  updateRig(dt, { speed, onGround, drawT, reloadT, adsT, sprinting, sliding, steady }) {
    const p = this.holder.position.copy(this.base).multiplyScalar(1 - adsT);
    p.x += this.sway.x * 0.012 * steady;
    p.y -= this.sway.y * 0.01 * steady;
    p.addScaledVector(this.recoilPos.x, 0.4);
    const hip = 1 - adsT;
    let rx = this.recoilRot.x.x * 0.4 + this.hipTurn.x * hip, ry = this.sway.x * 0.03 * steady + this.hipTurn.y * hip,
      rz = this.recoilRot.x.z * 0.4 + this.hipTurn.z * hip;
    if (!this.rig.hasRun) {
      p.x -= this.sprintT * 0.05; p.y -= this.sprintT * 0.06;
      rx -= this.sprintT * 0.3; ry += this.sprintT * 0.6;
    }
    if (sliding) rz += 0.18;
    if (!this.rig.actions.draw) {
      const lower = 1 - Math.min(1, drawT);
      p.y -= lower * 0.25; rx -= lower * 0.6;
    }
    // Reload sounds at the usual beats (the clip does the moving).
    if (reloadT >= 0 && this.reload) {
      const r = this.reload, t = Math.min(1, reloadT), crossed = at => r.last < at && t >= at;
      if (this.kind === 'shotgun') {
        for (let j = 0; j < r.shells; j++) if (crossed(0.15 + 0.65 * (j + 0.5) / r.shells)) playMech('shell');
        if (crossed(0.9)) playMech('rack');
      } else {
        if (crossed(0.25)) playMech('magOut');
        if (crossed(0.6)) playMech('magIn');
        if (r.empty && crossed(0.85)) playMech('rack');
      }
      r.last = t;
    } else if (this.reload) {
      this.reload = null;
      this.rig.stopReload();
    }
    // Pump / bolt guns: the casing comes out partway through the shot clip.
    if (this.cycle > 0) {
      const before = this.cycle;
      this.cycle = Math.max(0, this.cycle - dt);
      if (before > 0.2 && this.cycle <= 0.2) this.ejectShell();
    }
    this.holder.rotation.set(rx, ry, rz);
    this.rig.update(dt, { speed: onGround ? speed : 0, sprinting, adsT, relief: this.adsRelief });
  }

  // Puts the real hands where the stand-in hands are, turned to hold this weapon.
  placeHands() {
    this.group.updateMatrixWorld(true);
    const pose = HAND_POSES[this.kind] || HAND_POSES.rifle;
    const q = this.holder.getWorldQuaternion(new THREE.Quaternion());
    const target = (marker, p) => marker && p && {
      palm: marker.localToWorld(new THREE.Vector3()).add(new THREE.Vector3(...p.off).applyQuaternion(q)),
      fingers: new THREE.Vector3(...p.fingers).applyQuaternion(q),
      across: new THREE.Vector3(...p.across).applyQuaternion(q),
      thumb: p.thumb && new THREE.Vector3(...p.thumb).applyQuaternion(q),
      curl: p.curl, trigger: p.trigger,
    };
    this.armsRig.update(target(this.handR, pose.right), target(this.support, pose.left));
  }

  // `cycleIn` > 0: pump or bolt action plays that many seconds after the shot.
  fireKick(cycleIn = 0, adsT = 0) {
    this.rig?.fire();
    const k = KICK[this.kind] || KICK.rifle;
    const calm = 1 - adsT * 0.5; // aiming down sights steadies the gun
    const rnd = () => Math.random() * 2 - 1;
    this.recoilPos.kick(rnd() * 0.004 * calm, k.up * calm, k.back * calm);
    this.recoilRot.kick(k.pitch * calm, rnd() * k.yaw * calm, rnd() * k.roll * calm);
    this.shake.kick(k.shake * (0.7 + Math.random() * 0.3), rnd() * k.shake * 0.4, rnd() * k.shake);
    if (cycleIn) this.cycle = cycleIn;
    else { this.ejectShell(); this.shotT = SHOT_CYCLE; }
  }

  ejectShell() {
    const e = EJECT[this.kind];
    if (!e) return;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(e.size[0], e.size[0], e.size[1], 8),
      new THREE.MeshStandardMaterial({ color: e.color, metalness: 0.8, roughness: 0.35 }));
    if (this.rig) this.group.worldToLocal(this.rig.portWorld(shell.position));
    else shell.position.fromArray(e.port).applyMatrix4(this.holder.matrix);
    shell.rotation.set(Math.PI / 2, 0, Math.random());
    // Thrown out to the right and up, a little backward, tumbling.
    const v = new THREE.Vector3(1.3 + Math.random() * 0.6, 0.9 + Math.random() * 0.6, 0.25 + Math.random() * 0.3)
      .applyQuaternion(this.holder.quaternion);
    this.group.add(shell);
    this.shells.push({ mesh: shell, v, spin: new THREE.Vector3(rndSpin(), rndSpin(), rndSpin()), age: 0 });
    if (this.shells.length > 12) this.removeShell(this.shells.shift());
  }

  updateShells(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.age += dt;
      s.v.y -= 7 * dt;
      s.mesh.position.addScaledVector(s.v, dt);
      s.mesh.rotation.x += s.spin.x * dt;
      s.mesh.rotation.y += s.spin.y * dt;
      s.mesh.rotation.z += s.spin.z * dt;
      if (s.age > 0.7) { this.removeShell(s); this.shells.splice(i, 1); }
    }
  }

  removeShell(s) {
    this.group.remove(s.mesh);
    s.mesh.geometry.dispose();
    s.mesh.material.dispose();
  }
  slash() { this.swing = 1; }

  // Called when a reload starts. shells: how many the shotgun has to load one by one.
  startReload(shells = 0) {
    this.reload = { last: 0, shells: Math.max(1, shells), shellMesh: null, empty: shells >= (WEAPONS[this.kind]?.mag || 0) };
    this.rig?.reload(WEAPONS[this.kind].reload, this.reload.empty);
  }

  endReload() {
    for (const m of this.mag) m(0, 0, 0);
    for (const b of this.bolt) b(0, 0, 0);
    if (this.support) this.support.position.copy(this.supportBase);
    if (this.reload?.shellMesh) this.holder.remove(this.reload.shellMesh);
    this.reload = null;
  }

  // t: 0→1 through the reload. Returns how much to move / tilt the whole gun this frame,
  // and moves the magazine, bolt and support hand. Plays a click at each step.
  animateReload(t) {
    const r = this.reload || (this.reload = { last: 0, shells: 1, shellMesh: null });
    const crossed = at => r.last < at && t >= at;
    const out = { pos: new THREE.Vector3(), rx: 0, rz: 0 };
    // Turn the underside (magazine well) toward you and lift the gun into view.
    const tilt = smooth(0, 0.12, t) * (1 - smooth(0.85, 1, t));
    out.rz = -tilt * 0.55; out.rx = tilt * 0.3; out.pos.set(-tilt * 0.05, tilt * 0.04, tilt * 0.02);

    if (this.kind === 'shotgun') {
      // Roll the loading port toward you and push shells in one at a time, then pump.
      out.rz = tilt * 0.75; out.pos.x = -tilt * 0.04;
      const n = r.shells, span = 0.78 / n;
      const i = Math.min(n - 1, Math.floor((t - 0.1) / span));
      const k = (t - 0.1 - i * span) / span;
      if (t > 0.1 && t < 0.88) {
        if (!r.shellMesh) {
          r.shellMesh = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 10), mat(0x9a2a22, 0.5, 0.2));
          r.shellMesh.rotation.x = Math.PI / 2;
          this.holder.add(r.shellMesh);
        }
        r.shellMesh.visible = k < 0.8;
        r.shellMesh.position.set(0.015, -0.12 + smooth(0, 0.7, k) * 0.09, -0.12 - smooth(0.4, 0.8, k) * 0.05);
        if (this.support) this.support.position.copy(this.supportBase).add(new THREE.Vector3(0.02, -0.08 + smooth(0, 0.7, k) * 0.06, 0.2));
        for (let j = 0; j < n; j++) if (crossed(0.1 + j * span + span * 0.7)) playMech('shell');
      } else if (r.shellMesh) {
        this.holder.remove(r.shellMesh); r.shellMesh = null;
        if (this.support) this.support.position.copy(this.supportBase);
      }
      if (crossed(0.9)) { this.cycle = 0.45; playMech('rack'); }
      r.last = t;
      return out;
    }

    // Magazine weapons: old magazine drops away, a new one comes up and seats, then rack the bolt.
    const out1 = smooth(0.15, 0.32, t), in1 = smooth(0.4, 0.6, t);
    const swing = PARTS[this.kind]?.swing;
    if (swing) {
      const k = t < 0.36 ? out1 : 1 - in1;
      for (const m of this.mag) m(swing[0] * k, swing[1] * k, swing[2] * k);
    } else {
      const magY = t < 0.36 ? -0.2 * out1 : -0.2 * (1 - in1);
      for (const m of this.mag) m(0, magY, t < 0.36 ? 0.02 * out1 : 0);
    }
    if (crossed(0.18)) playMech('magOut');
    if (crossed(0.58)) { playMech('magIn'); out.pos.y += 0.01; }
    // Support hand goes down for the fresh magazine and brings it up.
    if (this.support) {
      const reach = smooth(0.25, 0.38, t) * (1 - smooth(0.55, 0.7, t));
      this.support.position.copy(this.supportBase).add(new THREE.Vector3(0.03 * reach, -0.13 * reach, 0.06 * reach));
    }
    const rack = PARTS[this.kind]?.rack || 0;
    const pull = smooth(0.7, 0.78, t) * (1 - smooth(0.8, 0.86, t));
    for (const b of this.bolt) b(0, 0, rack * pull);
    if (crossed(0.72)) playMech('rack');
    if (!this.bolt.length && this.mag.length) out.rz -= pull * 0.25; // sniper / SMG: a flick instead
    r.last = t;
    return out;
  }
  throwGrenade(windup) { this.throwT = 0; this.throwWindup = windup; this.gun.visible = true; }
  muzzleWorld(target) { return this.rig ? this.rig.muzzleWorld(target) : this.gun.userData.muzzle.getWorldPosition(target); }
}
