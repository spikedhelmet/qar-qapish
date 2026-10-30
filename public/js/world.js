// Builds the 3D scene for the map: geometry, materials, sky and lighting.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSurfaces, siteDecal } from './textures.js';

// Box geometry in world space with UVs projected from world coordinates,
// so textures keep the same density and line up across neighbouring boxes.
function boxGeometry(b, scale) {
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
  if (scale > 0) {
    const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      if (nx > 0.5) uv.setXY(i, z / scale, y / scale);
      else if (ny > 0.5) uv.setXY(i, x / scale, z / scale);
      else uv.setXY(i, x / scale, y / scale);
    }
  }
  return g;
}

export function buildWorld(renderer, map) {
  const scene = new THREE.Scene();
  const surfaces = createSurfaces(renderer);

  // Merge all boxes that share a surface into one mesh.
  const groups = {};
  for (const b of map.boxes) (groups[b.mat] ||= []).push(boxGeometry(b, surfaces[b.mat].scale));
  for (const [mat, geos] of Object.entries(groups)) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), surfaces[mat].material);
    mesh.castShadow = mat !== 'asphalt';
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  for (const site of map.sites) {
    const w = site.max[0] - site.min[0], d = site.max[1] - site.min[1];
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ map: siteDecal(site.name), transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(site.min[0] + w / 2, 0.01, site.min[1] + d / 2);
    decal.receiveShadow = true;
    scene.add(decal);
  }

  // Sky and sun
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 6;
  u.rayleigh.value = 1.6;
  u.mieCoefficient.value = 0.005;
  u.mieDirectionalG.value = 0.8;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(
    1, THREE.MathUtils.degToRad(90 - map.sun.elevation), THREE.MathUtils.degToRad(map.sun.azimuth));
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);

  // Image-based lighting from the sky so metal and rough surfaces pick up ambient color.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.clone());
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.environmentIntensity = 0.55;

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.position.copy(sunDir).multiplyScalar(80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const cam = sun.shadow.camera;
  cam.left = -48; cam.right = 48; cam.top = 48; cam.bottom = -48; cam.near = 1; cam.far = 220;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  scene.add(new THREE.HemisphereLight(0xbcd3ee, 0x5a5146, 0.5));
  scene.fog = new THREE.Fog(0xc6d3df, 70, 260);

  return scene;
}
