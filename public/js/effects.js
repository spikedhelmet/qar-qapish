// Short-lived visual effects: tracers, muzzle flashes, impact sparks, bullet holes and blood.
import * as THREE from 'three';

function flashTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,250,220,1)');
  grad.addColorStop(0.25, 'rgba(255,200,90,0.9)');
  grad.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < 16; i++) { // star-shaped flash
    const a = (i / 16) * Math.PI * 2, r = i % 2 ? 22 : 64;
    g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
  }
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
    this.holes = [];
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.8 });
    this.light = new THREE.PointLight(0xffc070, 0, 8, 2);
    scene.add(this.light);
    this.lightT = 0;

    // First-person muzzle flash lives in the viewmodel scene so it draws over the world.
    this.viewFlash = new THREE.Sprite(this.flashMat);
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

  muzzleFlash(worldPos, viewPos) {
    this.light.position.copy(worldPos);
    this.light.intensity = 30;
    this.lightT = 0.05;
    if (viewPos) {
      this.viewFlash.position.copy(viewPos);
      this.viewFlash.scale.setScalar(0.18 + Math.random() * 0.08);
      this.viewFlash.material.rotation = Math.random() * Math.PI;
      this.viewFlash.visible = true;
      this.viewFlashT = 0.045;
    } else {
      const s = new THREE.Sprite(this.flashMat);
      s.position.copy(worldPos);
      s.scale.setScalar(0.45);
      this.add(s, 0.05);
    }
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
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false }));
    this.add(pts, life, (it, dt) => {
      const a = geo.attributes.position;
      for (let i = 0; i < count; i++) {
        vel[i].y -= gravity * dt;
        a.setXYZ(i, a.getX(i) + vel[i].x * dt, a.getY(i) + vel[i].y * dt, a.getZ(i) + vel[i].z * dt);
      }
      a.needsUpdate = true;
      pts.material.opacity = 1 - it.age / it.life;
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
        if (!it.obj.isSprite) {
          it.obj.geometry.dispose();
          if (it.obj.material !== this.tracerMat) it.obj.material.dispose();
        }
        this.items.splice(i, 1);
      }
    }
  }
}
