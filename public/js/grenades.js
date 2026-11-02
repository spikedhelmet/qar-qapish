// Grenades on the client: flying models (same physics as the server), detonation effects,
// smoke clouds, and how blinded the local player is by a flashbang.
import * as THREE from 'three';
import { MAP } from './shared/map.js';
import { GRENADES } from './shared/config.js';
import { stepGrenade } from './shared/grenade.js';
import { raycastMap } from './shared/collision.js';
import { weaponModel } from './assets.js';
import { buildGun } from './models.js';
import * as audio from './audio.js';

export class GrenadeView {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.flying = new Map(); // id → { kind, g, mesh, spin }
    this.smokes = [];        // active clouds: { pos, radius, until }
  }

  // Server says a grenade left someone's hand.
  thrown(msg) {
    const mesh = weaponModel(msg.kind, 'tp') || buildGun(msg.kind);
    mesh.position.fromArray(msg.pos);
    this.scene.add(mesh);
    const spin = new THREE.Vector3(Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 12 - 6);
    this.flying.set(msg.id, { kind: msg.kind, g: { pos: msg.pos.slice(), vel: msg.vel.slice(), resting: false }, mesh, spin });
  }

  // Server says it went off. Returns the effect on the local player: { blind, shake }.
  detonated(msg, camera, alive) {
    const f = this.flying.get(msg.id);
    if (f) { this.scene.remove(f.mesh); this.flying.delete(msg.id); }
    const pos = new THREE.Vector3().fromArray(msg.pos);
    const dist = camera.position.distanceTo(pos);
    if (msg.kind === 'frag') {
      this.effects.fragBlast(pos);
      audio.playFrag(pos.clone().setY(pos.y + 0.5));
      return { blind: 0, shake: Math.max(0, 1 - dist / 20) * 0.05 };
    }
    if (msg.kind === 'smoke') {
      const { radius, duration } = GRENADES.smoke;
      this.smokes.push(this.effects.smokeCloud(pos, radius, duration));
      audio.playSmoke(pos, duration);
      return { blind: 0, shake: 0 };
    }
    this.effects.flashBurst(pos);
    audio.playFlashBang(pos);
    return { blind: alive ? this.flashAmount(pos, camera) : 0, shake: Math.max(0, 1 - dist / 15) * 0.02 };
  }

  // 0..1: how hard a flash at `pos` blinds whoever looks through `camera`.
  // Needs a clear line of sight; looking at it is worst, facing away still dazzles a little.
  flashAmount(pos, camera) {
    const { radius } = GRENADES.flash;
    const from = [pos.x, pos.y + 0.2, pos.z];
    const eye = camera.position;
    const d = Math.hypot(eye.x - from[0], eye.y - from[1], eye.z - from[2]);
    if (d > radius) return 0;
    const dir = [(eye.x - from[0]) / d, (eye.y - from[1]) / d, (eye.z - from[2]) / d];
    if (raycastMap(MAP, from, dir, d).t < d - 0.2) return 0;
    if (this.smokes.some(c => segmentHitsSphere(from, [eye.x, eye.y, eye.z], c))) return 0;
    const look = camera.getWorldDirection(new THREE.Vector3());
    const facing = -(look.x * dir[0] + look.y * dir[1] + look.z * dir[2]); // 1 = looking straight at it
    const turn = facing > 0.5 ? 1 : facing > 0 ? 0.6 + facing * 0.8 : 0.3;
    return Math.min(1, turn * (1 - (d / radius) * 0.75));
  }

  update(dt) {
    for (const f of this.flying.values()) {
      const bounces = stepGrenade(MAP, f.g, dt);
      f.mesh.position.fromArray(f.g.pos);
      if (!f.g.resting) {
        f.mesh.rotation.x += f.spin.x * dt; f.mesh.rotation.y += f.spin.y * dt; f.mesh.rotation.z += f.spin.z * dt;
      }
      if (bounces) audio.playClink(f.mesh.position, Math.min(1, Math.hypot(...f.g.vel) / 8 + 0.3));
    }
    const now = performance.now();
    this.smokes = this.smokes.filter(c => c.until > now);
  }

  // How deep the camera is inside a smoke cloud: 0 outside, 1 in the middle (fades the screen grey).
  smokeAt(point) {
    let k = 0;
    const now = performance.now();
    for (const c of this.smokes) {
      const left = (c.until - now) / 1000;
      const d = point.distanceTo(c.pos.clone().setY(Math.min(Math.max(point.y, 0.5), 2.5)));
      const depth = 1 - d / (c.radius * 0.95);
      k = Math.max(k, depth * Math.min(1, left / 3));
    }
    return Math.max(0, Math.min(1, k * 1.6));
  }

  clear() {
    for (const f of this.flying.values()) this.scene.remove(f.mesh);
    this.flying.clear();
  }
}

function segmentHitsSphere(a, b, cloud) {
  const c = [cloud.pos.x, 1.5, cloud.pos.z], r = cloud.radius * 0.7;
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = Math.max(0, Math.min(1, (ac[0] * ab[0] + ac[1] * ab[1] + ac[2] * ab[2]) / len2));
  const p = [a[0] + ab[0] * t - c[0], a[1] + ab[1] * t - c[1], a[2] + ab[2] * t - c[2]];
  return p[0] ** 2 + p[1] ** 2 + p[2] ** 2 < r * r;
}
