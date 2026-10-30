// Other players: snapshot buffering, interpolation and their soldier models.
import * as THREE from 'three';
import { INTERP_DELAY, TEAMS } from './shared/config.js';
import { Soldier } from './models.js';
import { AnimatedSoldier } from './soldier.js';
import { assets } from './assets.js';
import { playStep, playSlide } from './audio.js';

function nameTag(name, team) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 30px Helvetica, Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.7)';
  g.strokeText(name, 128, 32);
  g.fillStyle = TEAMS[team].css;
  g.fillText(name, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.2, 0.3, 1);
  s.renderOrder = 10;
  return s;
}

const lerpAngle = (a, b, t) => a + (Math.atan2(Math.sin(b - a), Math.cos(b - a))) * t;

export class Remotes {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.myTeam = null;
    this.hiddenId = null;
  }

  applySnapshot(list, myId, myTeam) {
    const t = performance.now();
    const seen = new Set();
    for (const s of list) {
      if (s.id === myId) continue;
      seen.add(s.id);
      let r = this.players.get(s.id);
      if (!r || r.team !== s.tm || r.name !== s.n || this.myTeam !== myTeam) {
        if (r) this.remove(s.id);
        r = this.create(s, myTeam);
      }
      // A respawn teleports; don't slide across the map from the death spot.
      const last = r.buf[r.buf.length - 1];
      if (last && !last.al && s.al) r.buf.length = 0;
      r.buf.push({ t, x: s.x, y: s.y, z: s.z, yw: s.yw, pt: s.pt, cr: s.cr, sl: s.sl, al: s.al, w: s.w });
      if (r.buf.length > 30) r.buf.shift();
    }
    this.myTeam = myTeam;
    for (const id of [...this.players.keys()]) if (!seen.has(id)) this.remove(id);
  }

  create(s, myTeam) {
    const soldier = assets.ready ? new AnimatedSoldier(s.tm) : new Soldier(s.tm);
    this.scene.add(soldier.root);
    const r = { id: s.id, team: s.tm, name: s.n, soldier, buf: [], state: null, stepDist: 0 };
    if (s.tm === myTeam) {
      r.tag = nameTag(s.n, s.tm);
      this.scene.add(r.tag);
    }
    this.players.set(s.id, r);
    return r;
  }

  remove(id) {
    const r = this.players.get(id);
    if (!r) return;
    this.scene.remove(r.soldier.root);
    if (r.tag) this.scene.remove(r.tag);
    this.players.delete(id);
  }

  update(dt) {
    const renderT = performance.now() - INTERP_DELAY;
    for (const r of this.players.values()) {
      const buf = r.buf;
      if (!buf.length) continue;
      let a = buf[0], b = buf[0];
      for (let i = buf.length - 1; i >= 0; i--) {
        if (buf[i].t <= renderT) { a = buf[i]; b = buf[i + 1] || buf[i]; break; }
      }
      const span = b.t - a.t;
      const k = span > 0 ? Math.min(1, Math.max(0, (renderT - a.t) / span)) : 0;
      const prev = r.state;
      const st = {
        x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k,
        yaw: lerpAngle(a.yw, b.yw, k), pitch: a.pt + (b.pt - a.pt) * k,
        crouch: k < 0.5 ? a.cr : b.cr, sliding: k < 0.5 ? a.sl : b.sl, alive: b.al, weapon: b.w,
      };
      const secs = span / 1000;
      st.vx = span > 0 ? (b.x - a.x) / secs : 0;
      st.vy = span > 0 ? (b.y - a.y) / secs : 0;
      st.vz = span > 0 ? (b.z - a.z) / secs : 0;
      st.speed = Math.hypot(st.vx, st.vz);
      r.state = st;

      const sol = r.soldier;
      sol.root.visible = r.id !== this.hiddenId; // hidden while we watch through their eyes
      sol.root.position.set(st.x, st.y, st.z);
      sol.setWeapon(st.weapon);
      sol.update(dt, st);
      if (r.tag) {
        r.tag.visible = st.alive && r.id !== this.hiddenId;
        r.tag.position.set(st.x, st.y + (st.crouch ? 1.5 : 2.1), st.z);
      }

      if (prev && st.sliding && !prev.sliding) playSlide(new THREE.Vector3(st.x, st.y, st.z));
      // Footsteps for running players; walking and crouching are silent.
      if (prev && st.alive && st.speed > 3.4 && Math.abs(st.y - prev.y) < 0.2) {
        r.stepDist += Math.hypot(st.x - prev.x, st.z - prev.z);
        if (r.stepDist > 2.3) {
          r.stepDist = 0;
          playStep(new THREE.Vector3(st.x, st.y, st.z), 1.4);
        }
      }
    }
  }

  // Enemy positions exactly as drawn on screen, for hit detection.
  targets(myTeam) {
    const out = [];
    for (const r of this.players.values()) {
      if (!r.state || !r.state.alive || r.team === myTeam) continue;
      out.push({ id: r.id, x: r.state.x, y: r.state.y, z: r.state.z, crouch: r.state.crouch });
    }
    return out;
  }
}
