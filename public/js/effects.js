// Short-lived visual effects: tracers, muzzle flashes, impact sparks, bullet holes and blood.
import * as THREE from 'three';

// Muzzle flashes: four irregular bursts in a 2×2 atlas (one picked per shot), each a hot white core
// with a few uneven petals, the way a real flash looks from behind the gun.
function flashTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let cell = 0; cell < 4; cell++) {
    const cx = (cell % 2) * 128 + 64, cy = Math.floor(cell / 2) * 128 + 64;
    const petals = 4 + Math.floor(rnd() * 3), turn = rnd() * Math.PI;
    for (let i = 0; i < petals; i++) {
      const a = turn + (i / petals) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
      const len = 30 + rnd() * 30, wide = 5 + rnd() * 5;
      g.save();
      g.translate(cx, cy); g.rotate(a);
      const grad = g.createLinearGradient(0, 0, len, 0);
      grad.addColorStop(0, 'rgba(255,225,150,0.9)');
      grad.addColorStop(1, 'rgba(255,120,30,0)');
      g.fillStyle = grad;
      g.beginPath(); g.moveTo(0, -wide); g.quadraticCurveTo(len * 0.6, 0, len, 0); g.quadraticCurveTo(len * 0.6, 0, 0, wide); g.fill();
      g.restore();
    }
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, 26);
    core.addColorStop(0, 'rgba(255,255,240,1)');
    core.addColorStop(0.35, 'rgba(255,215,130,0.85)');
    core.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = core;
    g.fillRect(cx - 32, cy - 32, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(0.5, 0.5);
  return t;
}
const pickFlash = map => map.offset.set(Math.random() < 0.5 ? 0 : 0.5, Math.random() < 0.5 ? 0 : 0.5);

// Soft round dot so particles read as puffs and sparks rather than squares.
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function holeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(10,10,10,0.95)');
  grad.addColorStop(0.3, 'rgba(25,25,25,0.8)');
  grad.addColorStop(1, 'rgba(40,40,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Effects {
  constructor(scene, viewScene) {
    this.scene = scene;
    this.items = [];
    this.flashMat = new THREE.SpriteMaterial({ map: flashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.holeMat = new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.holeGeo = new THREE.PlaneGeometry(0.09, 0.09);
    this.dotTex = dotTexture();
    this.holes = [];
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.8 });
    this.light = new THREE.PointLight(0xffc070, 0, 8, 2);
    scene.add(this.light);
    this.lightT = 0;

    // First-person muzzle flash lives in the viewmodel scene so it draws over the world.
    this.viewFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.viewFlash.visible = false;
    viewScene.add(this.viewFlash);
    this.viewFlashT = 0;
  }

  add(obj, life, update) {
    this.scene.add(obj);
    this.items.push({ obj, life, age: 0, update });
  }

  tracer(from, to) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 1) return;
    // A short streak that travels along the path, faster than the eye can follow but visible.
    const seg = Math.min(4, len * 0.5);
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, seg)]);
    const line = new THREE.Line(geo, this.tracerMat.clone());
    line.position.copy(from);
    line.lookAt(to);
    const speed = 400;
    this.add(line, (len - seg) / speed + 0.02, (it, dt) => {
      line.translateZ(speed * dt); // lookAt points +z at the target
      it.obj.material.opacity = 0.8 * (1 - it.age / it.life);
    });
  }

  // size: 1 for rifles; bigger for the shotgun and sniper, smaller for the pistol and SMG.
  muzzleFlash(worldPos, viewPos, size = 1) {
    this.light.position.copy(worldPos);
    this.light.intensity = 18 * size;
    this.lightT = 0.04;
    if (viewPos) {
      const m = this.viewFlash.material;
      this.viewFlash.position.copy(viewPos);
      this.viewFlash.scale.setScalar((0.09 + Math.random() * 0.05) * size);
      m.rotation = Math.random() * Math.PI * 2;
      pickFlash(m.map);
      this.viewFlash.visible = true;
      this.viewFlashT = 0.03; // about two frames
    } else {
      const s = new THREE.Sprite(this.flashMat);
      s.position.copy(worldPos);
      s.scale.setScalar(0.3 * size);
      this.add(s, 0.04);
    }
    this.muzzleSmoke(worldPos, size);
  }

  // A faint wisp of smoke that drifts up from the muzzle and fades.
  muzzleSmoke(pos, size = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dotTex, color: 0xa8a8a4, transparent: true, opacity: 0, depthWrite: false }));
    s.position.copy(pos);
    const drift = new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.25 + Math.random() * 0.15, (Math.random() - 0.5) * 0.15);
    this.add(s, 0.9, (it, dt) => {
      const k = it.age / it.life;
      s.position.addScaledVector(drift, dt);
      s.scale.setScalar((0.08 + k * 0.35) * size);
      s.material.opacity = 0.22 * Math.min(1, k * 8) * (1 - k);
    });
  }

  particles(pos, normal, color, count, speed, life, size, gravity = 9) {
    const positions = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      positions.set([pos.x, pos.y, pos.z], i * 3);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      if (normal) v.add(normal.clone().multiplyScalar(1.2)).normalize();
      vel.push(v.multiplyScalar(speed * (0.4 + Math.random() * 0.8)));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: this.dotTex, transparent: true, depthWrite: false }));
    this.add(pts, life, (it, dt) => {
      const a = geo.attributes.position;
      for (let i = 0; i < count; i++) {
        vel[i].y -= gravity * dt;
        a.setXYZ(i, a.getX(i) + vel[i].x * dt, a.getY(i) + vel[i].y * dt, a.getZ(i) + vel[i].z * dt);
      }
      a.needsUpdate = true;
      pts.material.opacity = (1 - it.age / it.life) * (size > 0.5 ? 0.55 : 1); // big puffs (smoke) stay see-through
    });
  }

  impact(pos, normal) {
    this.particles(pos, normal, 0xffd28a, 6, 5, 0.25, 0.04);
    this.particles(pos, normal, 0x9c9488, 8, 1.5, 0.6, 0.07, 3);
    const hole = new THREE.Mesh(this.holeGeo, this.holeMat);
    hole.position.copy(pos).addScaledVector(normal, 0.005);
    hole.lookAt(pos.clone().add(normal));
    hole.rotation.z = Math.random() * Math.PI;
    this.scene.add(hole);
    this.holes.push(hole);
    if (this.holes.length > 150) this.scene.remove(this.holes.shift());
  }

  fragBlast(pos) {
    const flash = new THREE.Sprite(this.flashMat.clone());
    flash.position.copy(pos).add(new THREE.Vector3(0, 0.4, 0));
    this.add(flash, 0.3, it => {
      const k = it.age / it.life;
      flash.scale.setScalar(2 + k * 4);
      flash.material.opacity = 1 - k;
    });
    const light = new THREE.PointLight(0xffa040, 250, 25, 2);
    light.position.copy(flash.position);
    this.add(light, 0.3, it => { light.intensity = 250 * (1 - it.age / it.life); });
    this.particles(pos, new THREE.Vector3(0, 1, 0), 0xffb050, 35, 10, 0.5, 0.18, 4);
    this.particles(pos, new THREE.Vector3(0, 1, 0), 0x3a352f, 30, 8, 1.0, 0.12, 12);
    this.particles(pos, new THREE.Vector3(0, 1.5, 0), 0x77736d, 25, 2, 2.2, 0.7, -0.5);
  }

  flashBurst(pos) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dotTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.copy(pos).add(new THREE.Vector3(0, 0.2, 0));
    this.add(s, 0.25, it => { s.scale.setScalar(3 + it.age * 20); s.material.opacity = 1 - it.age / it.life; });
    const light = new THREE.PointLight(0xffffff, 900, 30, 2);
    light.position.copy(s.position);
    this.add(light, 0.18, it => { light.intensity = 900 * (1 - it.age / it.life); });
    this.particles(pos, new THREE.Vector3(0, 1, 0), 0xffffff, 20, 6, 0.3, 0.08, 3);
  }

  // A smoke screen: soft grey puffs that billow out, hang, then thin away.
  // Returns { pos, radius, until } so the game can grey the screen for anyone standing inside.
  smokeCloud(pos, radius, duration) {
    const cloud = { pos: pos.clone(), radius, until: performance.now() + duration * 1000 };
    const puffs = 46;
    for (let i = 0; i < puffs; i++) {
      const mat = new THREE.SpriteMaterial({ map: this.dotTex, color: 0x9c9b97, transparent: true, depthWrite: false, opacity: 0 });
      const s = new THREE.Sprite(mat);
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius * 0.8;
      const target = new THREE.Vector3(pos.x + Math.cos(a) * r, 0.4 + Math.random() * 2.6, pos.z + Math.sin(a) * r);
      const size = 2.6 + Math.random() * 2.2;
      const drift = new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.02, (Math.random() - 0.5) * 0.08);
      s.position.copy(pos);
      const grow = 1.4 + Math.random() * 0.6, fadeOut = 3.5;
      this.add(s, duration, it => {
        const k = Math.min(1, it.age / grow), e = 1 - Math.pow(1 - k, 3);
        s.position.lerpVectors(pos, target, e).addScaledVector(drift, it.age);
        s.scale.setScalar(size * (0.3 + 0.7 * e));
        const out = Math.max(0, (it.age - (it.life - fadeOut)) / fadeOut);
        mat.opacity = 0.62 * Math.min(1, it.age / 0.4) * (1 - out);
      });
    }
    return cloud;
  }

  explosion(pos) {
    const flash = new THREE.Sprite(this.flashMat.clone());
    flash.position.copy(pos).add(new THREE.Vector3(0, 1, 0));
    this.add(flash, 0.45, it => {
      const k = it.age / it.life;
      flash.scale.setScalar(4 + k * 9);
      flash.material.opacity = 1 - k;
    });
    const light = new THREE.PointLight(0xffa040, 600, 45, 2);
    light.position.copy(flash.position);
    this.add(light, 0.5, it => { light.intensity = 600 * (1 - it.age / it.life); });
    this.particles(pos, new THREE.Vector3(0, 1, 0), 0xffb050, 70, 14, 0.7, 0.25, 4);   // fireball
    this.particles(pos, new THREE.Vector3(0, 1, 0), 0x3a352f, 45, 9, 1.4, 0.18, 12);   // debris
    this.particles(pos, new THREE.Vector3(0, 1.5, 0), 0x77736d, 60, 3, 3.5, 0.9, -0.6); // rising smoke
  }

  blood(pos, dir) {
    this.particles(pos, dir, 0x7a0f0a, 12, 2.2, 0.45, 0.06, 6);
  }

  update(dt) {
    this.lightT -= dt;
    if (this.lightT <= 0) this.light.intensity = 0;
    this.viewFlashT -= dt;
    if (this.viewFlashT <= 0) this.viewFlash.visible = false;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      if (it.update) it.update(it, dt);
      if (it.age >= it.life) {
        this.scene.remove(it.obj);
        if (it.obj.isLight) it.obj.dispose();
        else if (!it.obj.isSprite) {
          it.obj.geometry.dispose();
          if (it.obj.material !== this.tracerMat) it.obj.material.dispose();
        } else if (it.obj.material !== this.flashMat) {
          it.obj.material.dispose();
        }
        this.items.splice(i, 1);
      }
    }
  }
}
