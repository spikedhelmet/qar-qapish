// Objective mode on the client: the charge in the world (dropped or planted), its beeping,
// the explosion, and what the local player can do right now (plant / defuse).
import * as THREE from 'three';
import { MAP } from './shared/map.js';
import { MODES, siteAt, onSiteFloor } from './shared/config.js';
import { propModel } from './assets.js';
import { playBeep, playExplosion } from './audio.js';

function standInCharge() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.24), new THREE.MeshStandardMaterial({ color: 0x3b3d33, roughness: 0.8 }));
  body.position.y = 0.035;
  body.castShadow = true;
  g.add(body);
  return g;
}

export class ObjectiveView {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.charge = propModel('charge') || standInCharge();
    this.charge.visible = false;
    // Blinking red light on top while planted.
    this.led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
    this.led.position.y = 0.09;
    this.glow = new THREE.PointLight(0xff3020, 0, 3, 2);
    this.glow.position.y = 0.15;
    this.charge.add(this.led, this.glow);
    scene.add(this.charge);
    this.state = null;
    this.beepT = 0;
  }

  // ob: objective part of the server snapshot (or undefined outside objective mode)
  update(dt, ob) {
    this.state = ob || null;
    const where = ob?.planted?.pos || ob?.dropped;
    this.charge.visible = !!where;
    if (!where) { this.glow.intensity = 0; return; }
    this.charge.position.fromArray(where);

    const planted = ob.planted;
    this.led.visible = !!planted;
    if (!planted) { this.glow.intensity = 0; return; }
    // Beeps speed up from once a second to ten a second as the fuse runs down.
    const frac = 1 - planted.left / planted.fuse;
    const interval = Math.max(0.1, 1 - frac * 0.95);
    this.beepT -= dt;
    if (this.beepT <= 0) {
      this.beepT = interval;
      playBeep(this.charge.position.clone().setY(0.2), frac > 0.8);
      this.blink = 0.08;
    }
    this.blink = Math.max(0, (this.blink || 0) - dt);
    this.led.material.color.setHex(this.blink > 0 ? 0xff3a2a : 0x401010);
    this.glow.intensity = this.blink > 0 ? 3 : 0;
  }

  explode(pos) {
    const p = new THREE.Vector3().fromArray(pos);
    this.effects.explosion(p);
    playExplosion(p.clone().setY(1));
    this.charge.visible = false;
  }

  // What the local player could do by holding E: 'plant', 'defuse' or null.
  // The server decides for real; this only drives the prompt and keeps the player still.
  available(myId, team, pos, alive) {
    const ob = this.state;
    if (!ob || !alive) return null;
    const cfg = MODES.obj;
    const site = siteAt(MAP, pos[0], pos[2]);
    if (!ob.planted && ob.carrier === myId && site && onSiteFloor(site, pos[1])) return 'plant';
    if (ob.planted && team !== ob.att) {
      const d = Math.hypot(pos[0] - ob.planted.pos[0], pos[2] - ob.planted.pos[2]);
      if (d < cfg.defuseRange && Math.abs(pos[1] - ob.planted.pos[1]) < 1.5) return 'defuse';
    }
    return null;
  }
}
