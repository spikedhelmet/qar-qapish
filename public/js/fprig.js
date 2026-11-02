// Animated first-person weapon: the arms and gun of an "FPS animations" set playing its own clips
// (idle, walk, run, fire, reload, draw), and aiming down the sights by turning and moving the whole
// set so the gun's sight line runs straight out of the eye.
import * as THREE from 'three';

const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
const FORWARD = new THREE.Vector3(0, 0, -1), Z = new THREE.Vector3(0, 0, 1);
const ONE_SHOTS = ['fire', 'reload', 'reloadEmpty', 'draw'];

export class FpRig {
  // asset: { scene, clips, info } — scene has the eye at the origin looking down -Z (see build.html);
  // info.rig: the gun's body bone and, in that bone's frame, its forward / up axes, muzzle, sight line, port.
  constructor(asset) {
    this.scene = asset.scene;
    this.info = asset.info.rig;
    this.aimer = new THREE.Group(); // the aiming correction, blended in by how far aimed in we are
    this.aimer.add(this.scene);
    this.scene.traverse(o => {
      if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; }
      if (o.name === this.info.bone) this.body = o;
    });
    this.mixer = new THREE.AnimationMixer(this.scene);
    this.actions = {};
    for (const clip of asset.clips) {
      const a = this.mixer.clipAction(clip);
      if (ONE_SHOTS.includes(clip.name)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      a.setEffectiveWeight(0).play();
      this.actions[clip.name] = a;
    }
    this.base = { idle: 1, walk: 0, run: 0 };
    this.shot = null;     // the one-shot clip playing: { action, fade }
    this.fixQ = new THREE.Quaternion();
    this.fixP = new THREE.Vector3();
    this.smoothQ = null;
  }

  get hasRun() { return !!this.actions.run; }

  // Plays a one-shot clip over the idle / walk loop. seconds: stretch it to this long.
  play(id, seconds) {
    const a = this.actions[id];
    if (!a) return false;
    if (this.shot && this.shot.action !== a) this.shot.action.setEffectiveWeight(0);
    a.reset();
    a.timeScale = seconds ? a.getClip().duration / seconds : 1;
    a.play();
    this.shot = { action: a, id };
    return true;
  }

  fire() { this.play('fire'); }
  draw(seconds) { this.play('draw', seconds); }
  reload(seconds, empty) { this.play(empty && this.actions.reloadEmpty ? 'reloadEmpty' : 'reload', seconds); }
  stopReload() { if (this.shot && /reload/.test(this.shot.id)) this.shot = null; }

  // state: { speed, sprinting, adsT, relief }
  update(dt, { speed, sprinting, adsT, relief }) {
    // Locomotion loop: idle when still, walk when moving, the run clip (if any) when sprinting.
    const want = { idle: 0, walk: 0, run: 0 };
    if (sprinting && this.hasRun) want.run = 1;
    else { want.walk = Math.min(1, speed / 4) * (1 - adsT * 0.8); want.idle = 1 - want.walk; }
    const k = Math.min(1, dt * 8);
    for (const id of ['idle', 'walk', 'run']) this.base[id] += (want[id] - this.base[id]) * k;
    if (this.actions.walk) this.actions.walk.timeScale = Math.max(0.6, Math.min(1.5, speed / 4.5));

    // One-shot on top: full weight while it plays, fading out over its last 0.12 s.
    let over = 0;
    if (this.shot) {
      const a = this.shot.action, clip = a.getClip();
      const left = (clip.duration - a.time) / Math.max(0.01, a.timeScale);
      over = a.time === 0 && !a.isRunning() ? 0 : Math.min(1, left / 0.12);
      if (left <= 0) { a.setEffectiveWeight(0); this.shot = null; over = 0; }
      else a.setEffectiveWeight(over);
    }
    for (const id of ['idle', 'walk', 'run']) this.actions[id]?.setEffectiveWeight(this.base[id] * (1 - over) + 1e-4);
    this.mixer.update(dt);

    this.aim(dt, adsT, relief);
  }

  // Aiming: turn and move the set so the sight line runs straight out of the eye, with the rear sight
  // `relief` meters in front of it. Worked out from a smoothed pose, so the idle sway settles but a
  // shot still kicks.
  aim(dt, adsT, relief) {
    if (adsT <= 0) { this.aimer.position.set(0, 0, 0); this.aimer.quaternion.identity(); this.smoothQ = null; return; }
    this.scene.updateMatrixWorld(true);
    _m.copy(this.aimer.matrixWorld).invert().multiply(this.body.matrixWorld).decompose(_p, _q, _s);
    if (!this.smoothQ) { this.smoothQ = _q.clone(); this.smoothP = _p.clone(); }
    const k = Math.min(1, dt * 10);
    this.smoothQ.slerp(_q, k); this.smoothP.lerp(_p, k);
    const i = this.info;
    const fwd = new THREE.Vector3().fromArray(i.forward).applyQuaternion(this.smoothQ);
    const up = new THREE.Vector3().fromArray(i.up).applyQuaternion(this.smoothQ);
    const sight = new THREE.Vector3().fromArray(i.sight).applyQuaternion(this.smoothQ).add(this.smoothP);
    // Turn: barrel to -Z, then roll so the gun's top faces up.
    const turn = new THREE.Quaternion().setFromUnitVectors(fwd, FORWARD);
    up.applyQuaternion(turn);
    turn.premultiply(new THREE.Quaternion().setFromAxisAngle(Z, Math.atan2(up.x, up.y)));
    sight.applyQuaternion(turn);
    this.fixQ.copy(turn);
    this.fixP.set(-sight.x, -sight.y, -relief - sight.z);
    this.aimer.quaternion.identity().slerp(this.fixQ, adsT);
    this.aimer.position.copy(this.fixP).multiplyScalar(adsT);
  }

  // A point given in the gun's body-bone frame (muzzle, ejection port) in world space.
  gunPoint(local, target) {
    this.scene.updateMatrixWorld(true);
    this.body.matrixWorld.decompose(_p, _q, _s);
    return target.fromArray(local).applyQuaternion(_q).add(_p);
  }
  muzzleWorld(target) { return this.gunPoint(this.info.muzzle, target); }
  portWorld(target) { return this.gunPoint(this.info.port, target); }
  gunQuaternion(target) { this.body.matrixWorld.decompose(_p, target, _s); return target; }
}
