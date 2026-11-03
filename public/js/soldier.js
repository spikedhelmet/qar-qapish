// Animated soldier built from the Mixamo character and clips. Same interface as the stand-in
// Soldier in models.js: root, setWeapon(kind), update(dt, state), muzzleWorld(v), fireKick().
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { assets, weaponModel } from './assets.js';
import { WEAPONS } from './shared/config.js';

const PISTOL_HOLD = new Set(['pistol', 'makarov', 'knife', 'frag', 'smoke', 'flash']);
const DIRS = ['f', 'fr', 'r', 'br', 'b', 'bl', 'l', 'fl']; // 45° sectors, clockwise from forward
// Ground speed (m/s) each moving clip was animated at, so playback matches how fast the player moves.
const CLIP_SPEED = { walk: 1.92, run: 4.8, sprint: 7.2, crouch: 2.04, pistol_walk_f: 2.55, pistol_walk_b: 1.41,
  pistol_run_f: 4.74, pistol_run_b: 3.3, pistol_strafe_l: 2.14, pistol_strafe_r: 2.42 };
// Seconds into the throw clip where the grenade leaves the hand.
const THROW_RELEASE = 1.8;
const DEATHS = ['death_front', 'death_back', 'death_right', 'death_head_front', 'death_head_back'];
// Leg cycles: switching between these keeps the stride's phase, so the feet don't jump.
const LOCOMOTION = /walk|run|sprint|strafe/;

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

// Copy of a clip with only the spine, head, arm and hand tracks, cached per team.
const UPPER = /Spine|Neck|Head|Shoulder|Arm|Hand/;
const upperCache = new Map();
function upperBody(team, clip) {
  if (!clip) return null;
  const key = team + clip.name;
  if (!upperCache.has(key)) {
    upperCache.set(key, new THREE.AnimationClip(clip.name + '_upper', clip.duration, clip.tracks.filter(t => UPPER.test(t.name.split('.')[0]))));
  }
  return upperCache.get(key);
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
    this.vel = [0, 0];      // smoothed ground velocity (snapshots are 30 a second and a little jittery)
    this.sector = 0;        // movement direction, 0 … 7, see DIRS
    this.gait = 'idle';     // idle / walk / run
    this.airT = 0;          // how long the player has been off the ground
    this.rate = 1;          // smoothed playback speed
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
    const prev = this.current;
    next.reset().setEffectiveWeight(1).play();
    if (prev && LOCOMOTION.test(prev.getClip().name) && LOCOMOTION.test(id)) {
      next.time = (prev.time / prev.getClip().duration) * next.getClip().duration; // same point in the stride
    }
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

  // Reload on the upper body only, on top of whatever the legs are doing, timed to the weapon.
  playReload() {
    this.playUpper('rifle_reload', WEAPONS[this.weaponKind]?.reload);
  }

  // Grenade toss. The server reports the throw at the moment of release, so the clip starts
  // just before its own release point and plays the follow-through.
  playThrow() {
    this.playUpper('throw', null, THROW_RELEASE - 0.25);
  }

  // Plays a clip once on the arms and spine. seconds: how long it should take (default: its own
  // length); from: where in the clip to start.
  playUpper(id, seconds, from = 0) {
    const clip = upperBody(this.team, this.clips[id]);
    if (!clip) return;
    const a = this.mixer.clipAction(clip);
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = false;
    a.timeScale = seconds ? clip.duration / seconds : 1;
    a.reset().setEffectiveWeight(3).play(); // weight 3 vs the walk/run's 1: the arms mostly follow this clip
    a.time = Math.max(0, from);
  }

  // Picks the clip for how the player is moving: s = { yaw, pitch, crouch, sliding, sprint, air, kneel, alive, vx, vy, vz }.
  // Reads a smoothed velocity, and only changes direction or gait once the change is clear, so the
  // legs don't flick between clips on every jittery snapshot.
  chooseClip(s, dt) {
    const k = 1 - Math.exp(-dt * 10);
    this.vel[0] += (s.vx - this.vel[0]) * k;
    this.vel[1] += (s.vz - this.vel[1]) * k;
    const [vx, vz] = this.vel, speed = Math.hypot(vx, vz);
    const fwd = -vx * Math.sin(s.yaw) - vz * Math.cos(s.yaw);
    const right = vx * Math.cos(s.yaw) - vz * Math.sin(s.yaw);
    if (speed > 0.5) {
      const angle = Math.atan2(right, fwd) / (Math.PI / 4);                 // in sectors
      const off = Math.abs(((angle - this.sector + 12) % 8) - 4);            // how far from the current one
      if (off > 0.5 + 0.2) this.sector = ((Math.round(angle) % 8) + 8) % 8;  // past the edge by a margin
    }
    const dir = DIRS[this.sector];
    this.gait = this.gait === 'idle' ? (speed > 0.7 ? 'walk' : 'idle')
      : speed < 0.35 ? 'idle'
      : this.gait === 'run' ? (speed < 3.0 ? 'walk' : 'run')
      : speed > 3.7 ? 'run' : 'walk';
    this.airT = s.air || (s.air === undefined && Math.abs(s.vy) > 3.5) ? this.airT + dt : 0;
    const rate = (base) => Math.min(1.5, Math.max(0.7, speed / base));

    if (s.kneel) return ['kneel_idle', 1]; // planting or defusing
    if (this.airT > 0.12) return ['jump_loop', 1];
    if (s.crouch || s.sliding) return this.gait === 'idle' || s.sliding ? ['crouch_idle', 1] : [`crouch_walk_${dir}`, rate(CLIP_SPEED.crouch)];
    if (this.gait === 'idle') return [this.hold === 'pistol' ? 'pistol_idle' : 'rifle_idle', 1];

    if (this.hold === 'pistol') {
      const fb = dir.includes('b') ? 'b' : 'f';
      const id = dir === 'l' || dir === 'r' ? `pistol_strafe_${dir}` : `pistol_${this.gait}_${fb}`;
      return [id, rate(CLIP_SPEED[id])];
    }
    if ((s.sprint ?? speed > 5.8) && dir === 'f' && this.gait === 'run') return ['sprint_f', rate(CLIP_SPEED.sprint)];
    if (this.gait === 'run') return [`rifle_run_${dir}`, rate(CLIP_SPEED.run)];
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
    const [id, timeScale] = this.chooseClip(s, dt);
    const switching = this.current !== this.action(id);
    this.rate = switching ? timeScale : this.rate + (timeScale - this.rate) * Math.min(1, dt * 6);
    this.play(id, 0.25, this.rate);
    this.current.timeScale = this.rate;
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
