// Animated soldier built from the Mixamo character and clips. Same interface as the stand-in
// Soldier in models.js: root, setWeapon(kind), update(dt, state), muzzleWorld(v), fireKick().
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { assets, weaponModel } from './assets.js';

const PISTOL_HOLD = new Set(['pistol', 'knife']);
const DIRS = ['f', 'fr', 'r', 'br', 'b', 'bl', 'l', 'fl']; // 45° sectors, clockwise from forward
// Ground speed (m/s) each moving clip was animated at, so playback matches how fast the player moves.
const CLIP_SPEED = { walk: 1.92, run: 4.8, sprint: 7.2, crouch: 2.04, pistol_walk_f: 2.55, pistol_walk_b: 1.41,
  pistol_run_f: 4.74, pistol_run_b: 3.3, pistol_strafe_l: 2.14, pistol_strafe_r: 2.42 };
const DEATHS = ['death_front', 'death_back', 'death_right', 'death_head_front', 'death_head_back'];

// Clips keep only tracks for bones this character has (the two models differ by a few face bones).
const clipCache = new Map();
function clipsFor(team, boneNames) {
  if (!clipCache.has(team)) {
    const out = {};
    for (const [id, clip] of Object.entries(assets.clips)) {
      out[id] = new THREE.AnimationClip(id, clip.duration, clip.tracks.filter(t => boneNames.has(t.name.split('.')[0])));
    }
    clipCache.set(team, out);
  }
  return clipCache.get(team);
}

const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _axis = new THREE.Vector3();

export class AnimatedSoldier {
  constructor(team) {
    this.team = team;
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(assets.characters[team]);
    this.root.add(this.model);
    this.bones = {};
    this.model.traverse(o => { if (o.isBone) this.bones[o.name.replace('mixamorig', '')] = o; });
    this.clips = clipsFor(team, new Set(Object.keys(this.bones).map(n => 'mixamorig' + n)));
    this.mixer = new THREE.AnimationMixer(this.model);
    this.current = null;
    this.dying = null;
    this.kick = 0;
    this.gunMount = new THREE.Group();
    this.bones.RightHand.add(this.gunMount);
    this.grips = {};
    this.setWeapon('rifle');
    this.play('rifle_idle', 0);
  }

  action(id) {
    return this.mixer.clipAction(this.clips[id]);
  }

  play(id, fade = 0.2, timeScale = 1) {
    const next = this.action(id);
    next.timeScale = timeScale;
    if (this.current === next) return;
    next.reset().setEffectiveWeight(1).play();
    if (this.current && fade > 0) this.current.crossFadeTo(next, fade, false);
    else if (this.current) this.current.stop();
    this.current = next;
  }

  // Where the gun sits in the hand: posed so the barrel points straight ahead in the hold's idle pose.
  gripFor(hold) {
    if (this.grips[hold]) return this.grips[hold];
    const prev = this.current;
    this.mixer.stopAllAction();
    const pose = this.action(hold === 'pistol' ? 'pistol_idle' : 'rifle_idle');
    pose.reset().play();
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);
    const hand = this.bones.RightHand, finger = this.bones.RightHandMiddle1;
    const palm = hand.getWorldPosition(new THREE.Vector3())
      .lerp(finger.getWorldPosition(new THREE.Vector3()), 0.6);
    const rootInv = this.root.matrixWorld.clone().invert();
    const target = new THREE.Matrix4().makeTranslation(palm.applyMatrix4(rootInv)); // facing = soldier's forward
    const local = hand.matrixWorld.clone().premultiply(rootInv).invert().multiply(target);
    this.grips[hold] = local;
    pose.stop();
    if (prev) { prev.reset().play(); this.current = prev; }
    return local;
  }

  setWeapon(kind) {
    if (this.weaponKind === kind) return;
    this.weaponKind = kind;
    this.hold = PISTOL_HOLD.has(kind) ? 'pistol' : 'rifle';
    this.gunMount.clear();
    this.gun = weaponModel(kind, 'tp');
    if (this.gun) this.gunMount.add(this.gun);
    this.gripFor(this.hold).decompose(this.gunMount.position, this.gunMount.quaternion, this.gunMount.scale);
  }

  fireKick() { this.kick = 1; }

  // Picks the clip for how the player is moving: s = { yaw, pitch, crouch, sliding, alive, vx, vy, vz }
  chooseClip(s) {
    const speed = Math.hypot(s.vx, s.vz);
    const fwd = -s.vx * Math.sin(s.yaw) - s.vz * Math.cos(s.yaw);
    const right = s.vx * Math.cos(s.yaw) - s.vz * Math.sin(s.yaw);
    const sector = ((Math.round(Math.atan2(right, fwd) / (Math.PI / 4)) % 8) + 8) % 8;
    const dir = DIRS[sector];
    const rate = (base) => Math.min(1.6, Math.max(0.6, speed / base));

    if (Math.abs(s.vy) > 2.5) return ['jump_loop', 1];
    if (s.crouch || s.sliding) return speed < 0.4 || s.sliding ? ['crouch_idle', 1] : [`crouch_walk_${dir}`, rate(CLIP_SPEED.crouch)];
    if (speed < 0.4) return [this.hold === 'pistol' ? 'pistol_idle' : 'rifle_idle', 1];

    if (this.hold === 'pistol') {
      const fb = dir.includes('b') ? 'b' : 'f';
      const id = dir === 'l' || dir === 'r' ? `pistol_strafe_${dir}` : `pistol_${speed > 3.4 ? 'run' : 'walk'}_${fb}`;
      return [id, rate(CLIP_SPEED[id])];
    }
    if (speed > 6.2 && dir === 'f') return ['sprint_f', rate(CLIP_SPEED.sprint)];
    if (speed > 3.4) return [`rifle_run_${dir}`, rate(CLIP_SPEED.run)];
    return [`rifle_walk_${dir}`, rate(CLIP_SPEED.walk)];
  }

  update(dt, s) {
    this.root.rotation.y = s.yaw;
    if (!s.alive) {
      if (!this.dying) {
        const id = s.crouch ? 'death_crouch' : DEATHS[Math.floor(Math.random() * DEATHS.length)];
        this.dying = this.action(id);
        this.dying.setLoop(THREE.LoopOnce, 1);
        this.dying.clampWhenFinished = true;
        this.play(id, 0.12);
      }
      this.mixer.update(dt);
      return;
    }
    if (this.dying) {
      this.dying.stop();
      this.dying = null;
      this.current = null;
    }
    const [id, timeScale] = this.chooseClip(s);
    this.play(id, 0.2, timeScale);
    this.current.timeScale = timeScale;
    this.mixer.update(dt);

    // Lean the spine to follow the player's aim, plus a little kick when firing.
    this.kick = Math.max(0, this.kick - dt * 8);
    const pitch = (s.pitch + this.kick * 0.06) / 3;
    this.root.updateMatrixWorld(true);
    for (const name of ['Spine', 'Spine1', 'Spine2']) {
      const bone = this.bones[name];
      _axis.set(1, 0, 0).applyQuaternion(this.root.quaternion);                 // soldier's right, in world space
      _axis.applyQuaternion(bone.getWorldQuaternion(_q).invert()).normalize();  // …in the bone's own space
      bone.quaternion.multiply(_q.setFromAxisAngle(_axis, pitch));
      bone.updateMatrixWorld(true);
    }
  }

  muzzleWorld(target) {
    if (this.gun) return this.gun.userData.muzzle.getWorldPosition(target);
    return this.bones.RightHand.getWorldPosition(target);
  }
}
