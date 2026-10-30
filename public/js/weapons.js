// The local player's weapons: ammo, fire timing, spread, recoil and hit detection.
import * as THREE from 'three';
import { WEAPONS, LOADOUT } from './shared/config.js';
import { raycastMap, rayPlayer } from './shared/collision.js';

export class Arsenal {
  constructor() {
    this.recoil = { pitch: 0, yaw: 0 };
    this.reset();
  }

  reset() {
    this.ammo = {};
    for (const w of LOADOUT) if (!WEAPONS[w].melee) this.ammo[w] = { mag: WEAPONS[w].mag, reserve: WEAPONS[w].reserve };
    this.current = LOADOUT[0];
    this.previous = LOADOUT[1];
    this.drawT = 0;
    this.reloadT = -1;
    this.cooldown = 0;
    this.heat = 0;
    this.shots = 0;
    this.triggerReady = true;
    this.recoil.pitch = 0; this.recoil.yaw = 0;
  }

  get def() { return WEAPONS[this.current]; }

  select(kind) {
    if (kind === this.current || !LOADOUT.includes(kind)) return false;
    this.previous = this.current;
    this.current = kind;
    this.drawT = 0;
    this.reloadT = -1;
    this.heat = 0;
    return true;
  }

  cycle(step) {
    const i = LOADOUT.indexOf(this.current);
    return this.select(LOADOUT[(i + step + LOADOUT.length) % LOADOUT.length]);
  }

  startReload() {
    const a = this.ammo[this.current];
    if (!a || this.reloadT >= 0 || a.mag >= this.def.mag || a.reserve <= 0) return false;
    this.reloadT = 0;
    return true;
  }

  // Current inaccuracy in radians, based on movement and sustained fire.
  spread(moveSpeed, onGround, crouching) {
    const s = this.def.spread;
    if (!s) return 0;
    let v = s.base + s.move * Math.min(1, moveSpeed / 5) + (onGround ? 0 : s.air) + this.heat;
    if (crouching && onGround) v *= s.crouch;
    return v;
  }

  update(dt, triggerDown) {
    const def = this.def;
    this.drawT = Math.min(def.draw, this.drawT + dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!triggerDown) this.triggerReady = true;
    if (def.spread) this.heat = Math.max(0, this.heat - def.spread.recover * dt);
    if (this.cooldown <= 0 && def.recoil) {
      const k = Math.exp(-def.recoil.recover * dt);
      this.recoil.pitch *= k; this.recoil.yaw *= k;
      if (!triggerDown) this.shots = 0;
    }
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      if (this.reloadT >= def.reload) {
        const a = this.ammo[this.current];
        const take = Math.min(def.mag - a.mag, a.reserve);
        a.mag += take; a.reserve -= take;
        this.reloadT = -1;
        return 'reloaded';
      }
    }
    return null;
  }

  canFire(triggerDown) {
    if (!triggerDown || this.cooldown > 0 || this.drawT < this.def.draw || this.reloadT >= 0) return false;
    if (!this.def.auto && !this.triggerReady) return false;
    return true;
  }

  // Fires one shot. `view` = { eye: Vector3, dir: Vector3 } with recoil already applied.
  // Returns { empty } or { hits, impacts } where impacts are world points the bullets stopped at.
  fire(view, ctx) {
    const def = this.def;
    this.triggerReady = false;
    this.cooldown = def.fireInterval;
    const ammo = this.ammo[this.current];
    if (ammo && ammo.mag <= 0) {
      this.cooldown = 0.25;
      return { empty: true };
    }
    if (ammo) ammo.mag--;

    const spread = this.spread(ctx.speed, ctx.onGround, ctx.crouching);
    const results = [];
    for (let i = 0; i < def.pellets; i++) {
      const dir = coneSample(view.dir, spread);
      results.push(trace(view.eye, dir, def.melee ? def.range : def.range, ctx));
    }

    if (def.spread) this.heat = Math.min(def.spread.max, this.heat + def.spread.perShot);
    if (def.recoil) {
      this.shots++;
      this.recoil.pitch += def.recoil.pitch * (1 + Math.min(this.shots, 10) * 0.12);
      this.recoil.yaw += (Math.random() - 0.5) * 2 * def.recoil.yaw * (this.shots > 4 ? 1.6 : 1);
    }
    return { results };
  }
}

const _up = new THREE.Vector3(0, 1, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3();

function coneSample(dir, angle) {
  if (angle <= 0) return dir.clone();
  _a.crossVectors(dir, Math.abs(dir.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : _up).normalize();
  _b.crossVectors(dir, _a).normalize();
  const r = angle * Math.sqrt(Math.random()), t = Math.random() * Math.PI * 2;
  return dir.clone().addScaledVector(_a, Math.cos(t) * r).addScaledVector(_b, Math.sin(t) * r).normalize();
}

// Finds what a ray hits first: the map or one of the enemy hitboxes.
function trace(eye, dir, range, ctx) {
  const o = [eye.x, eye.y, eye.z], d = [dir.x, dir.y, dir.z];
  const wall = raycastMap(ctx.map, o, d, range);
  let best = null;
  for (const t of ctx.targets) {
    const hit = rayPlayer(o, d, t.x, t.y, t.z, t.crouch, Math.min(range, wall.t));
    if (hit && (!best || hit.t < best.t)) best = { ...hit, id: t.id };
  }
  if (best) return { player: best, point: eye.clone().addScaledVector(dir, best.t), dir };
  if (wall.t < Infinity) {
    return { wall: true, point: eye.clone().addScaledVector(dir, wall.t), normal: new THREE.Vector3().fromArray(wall.normal), dir };
  }
  return { point: eye.clone().addScaledVector(dir, Math.min(range, 300)), dir };
}
