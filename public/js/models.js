// Stand-in models built from primitives: a jointed soldier and simple guns.
// They expose the same small interface the real Mixamo / Sketchfab models will use later.
import * as THREE from 'three';
import { TEAMS } from './shared/config.js';

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

export function buildGun(kind) {
  const g = new THREE.Group();
  const muzzle = new THREE.Object3D();
  if (kind === 'rifle') {
    g.add(box(0.055, 0.085, 0.36, MATS.metal, 0, 0.03, -0.08));
    g.add(box(0.064, 0.07, 0.26, MATS.polymer, 0, 0.02, -0.38));
    g.add(cyl(0.011, 0.24, MATS.metal, 0, 0.035, -0.6));
    g.add(cyl(0.017, 0.05, MATS.metal, 0, 0.035, -0.73));
    g.add(box(0.05, 0.075, 0.24, MATS.polymer, 0, 0.005, 0.2));
    g.add(box(0.052, 0.11, 0.04, MATS.polymer, 0, -0.005, 0.33));
    g.add(box(0.03, 0.03, 0.12, MATS.metal, 0, 0.09, -0.07));
    g.add(box(0.008, 0.05, 0.01, MATS.metal, 0, 0.08, -0.48));
    const mag = box(0.032, 0.17, 0.065, MATS.polymer, 0, -0.1, -0.15);
    mag.rotation.x = 0.28;
    g.add(mag);
    const grip = box(0.034, 0.1, 0.045, MATS.polymer, 0, -0.05, 0.02);
    grip.rotation.x = -0.3;
    g.add(grip);
    muzzle.position.set(0, 0.035, -0.77);
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
  pistol: { mount: [0.03, -0.12, -0.5], right: [0.03, -0.16, -0.48], left: [0.0, -0.17, -0.46] },
  knife: { mount: [0.2, -0.3, -0.36], right: [0.2, -0.3, -0.34], left: [-0.26, -0.5, -0.05] },
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
    const pose = GRIPS[kind];
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
  }

  muzzleWorld(target) {
    return this.gun.userData.muzzle.getWorldPosition(target);
  }
}

export function teamColor(team) {
  return TEAMS[team].color;
}

// ---------------------------------------------------------------- first-person hands + gun

export class ViewModel {
  constructor(team) {
    this.group = new THREE.Group();
    this.holder = new THREE.Group();
    this.group.add(this.holder);
    this.sleeve = mat(UNIFORMS[team].shirt, 0.95);
    this.kick = 0;
    this.swing = 0;
    this.bobT = 0;
    this.sway = new THREE.Vector2();
  }

  setTeam(team) { this.sleeve.color.setHex(UNIFORMS[team].shirt); }

  setWeapon(kind) {
    this.kind = kind;
    this.holder.clear();
    this.gun = buildGun(kind);
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
    };
    if (kind === 'rifle') {
      arm(0, -0.05, 0.03, -1.0, 0.35);
      arm(-0.01, -0.03, -0.36, -0.95, -0.75, 0.55);
      this.base = new THREE.Vector3(0.19, -0.23, -0.48);
    } else if (kind === 'pistol') {
      arm(0, -0.04, 0.02, -1.05, 0.3);
      arm(-0.03, -0.05, 0.03, -1.05, -0.45);
      this.base = new THREE.Vector3(0.14, -0.17, -0.42);
    } else {
      arm(0, 0, 0.03, -1.0, 0.35);
      this.base = new THREE.Vector3(0.2, -0.22, -0.36);
      this.gun.rotation.set(0.2, 0.1, 0.4);
    }
    this.gun.traverse(o => { o.castShadow = false; });
  }

  // drawT: 0→1 raise progress, reloadT: 0→1 reload progress (or -1)
  update(dt, { speed, onGround, drawT, reloadT, lookDX, lookDY }) {
    this.kick += (0 - this.kick) * Math.min(1, dt * 14);
    this.swing = Math.max(0, this.swing - dt * 3.5);
    this.sway.x += (Math.max(-1, Math.min(1, -lookDX * 0.02)) - this.sway.x) * Math.min(1, dt * 8);
    this.sway.y += (Math.max(-1, Math.min(1, lookDY * 0.02)) - this.sway.y) * Math.min(1, dt * 8);
    const moving = onGround ? Math.min(1, speed / 5) : 0;
    this.bobT += dt * (6 + speed);

    const p = this.holder.position.copy(this.base);
    p.x += Math.sin(this.bobT) * 0.012 * moving + this.sway.x * 0.02;
    p.y += Math.abs(Math.cos(this.bobT)) * 0.012 * moving - this.sway.y * 0.015;
    p.z += this.kick * 0.06;
    let rx = this.kick * 0.12, rz = 0, ry = this.sway.x * 0.05;
    const lower = 1 - Math.min(1, drawT);
    p.y -= lower * 0.25;
    rx -= lower * 0.6;
    if (reloadT >= 0) {
      const k = Math.sin(Math.min(1, reloadT) * Math.PI);
      p.y -= k * 0.08;
      rx -= k * 0.35;
      rz += k * 0.5;
    }
    if (this.swing > 0) {
      const s = Math.sin((1 - this.swing) * Math.PI);
      p.x -= s * 0.16; p.z -= s * 0.12;
      ry += s * 0.9;
    }
    this.holder.rotation.set(rx, ry, rz);
  }

  fireKick() { this.kick = 1; }
  slash() { this.swing = 1; }
  muzzleWorld(target) { return this.gun.userData.muzzle.getWorldPosition(target); }
}
