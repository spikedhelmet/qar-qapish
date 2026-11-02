// Builds the 3D scene for the map: geometry, materials, sky and lighting.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSurfaces, siteDecal } from './textures.js';

// Box geometry in world space with UVs in meters projected from world coordinates (each texture's
// repeat sets its tile size), so textures keep the same density and line up across neighbouring boxes.
// scale 0: the texture is stretched over each face instead.
function boxGeometry(b, scale) {
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
  if (scale > 0) {
    const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      if (nx > 0.5) uv.setXY(i, z, y);
      else if (ny > 0.5) uv.setXY(i, x, z);
      else uv.setXY(i, x, y);
    }
  }
  return g;
}

// The scene with sky, sun and lighting; the map's own geometry goes in with showMap().
export function buildWorld(renderer, map) {
  const scene = new THREE.Scene();

  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 6;
  u.rayleigh.value = 1.6;
  u.mieCoefficient.value = 0.005;
  u.mieDirectionalG.value = 0.8;
  scene.add(sky);

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const cam = sun.shadow.camera;
  cam.left = -48; cam.right = 48; cam.top = 48; cam.bottom = -48; cam.near = 1; cam.far = 220;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  scene.add(new THREE.HemisphereLight(0xbcd3ee, 0x5a5146, 0.5));
  scene.fog = new THREE.Fog(0xc6d3df, 70, 260);
  scene.environmentIntensity = 0.55;

  scene.userData.world = { renderer, surfaces: createSurfaces(renderer), sky, sun, level: null };
  showMap(scene, map);
  return scene;
}

// Replaces the level geometry (and the sun's direction) with this map's.
export function showMap(scene, map) {
  const w = scene.userData.world;
  if (w.level) {
    scene.remove(w.level);
    w.level.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      if (o.userData.own) { o.material.map?.dispose(); o.material.dispose(); } // surfaces are shared
    });
  }
  const level = w.level = new THREE.Group();

  // Merge all boxes that share a surface into one mesh.
  const groups = {};
  for (const b of map.boxes) (groups[b.mat] ||= []).push(boxGeometry(b, w.surfaces[b.mat].scale));
  for (const [mat, geos] of Object.entries(groups)) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), w.surfaces[mat].material);
    mesh.castShadow = mat !== 'asphalt';
    mesh.receiveShadow = true;
    level.add(mesh);
  }

  for (const site of map.sites) {
    const sx = site.max[0] - site.min[0], sz = site.max[1] - site.min[1];
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(sx, sz),
      new THREE.MeshStandardMaterial({ map: siteDecal(site.name), transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(site.min[0] + sx / 2, (site.y || 0) + 0.01, site.min[1] + sz / 2);
    decal.receiveShadow = true;
    decal.userData.own = true;
    level.add(decal);
  }
  scene.add(level);

  // Sun direction, and image-based lighting from the sky so metal and rough surfaces pick up ambient color.
  const sunDir = new THREE.Vector3().setFromSphericalCoords(
    1, THREE.MathUtils.degToRad(90 - map.sun.elevation), THREE.MathUtils.degToRad(map.sun.azimuth));
  w.sky.material.uniforms.sunPosition.value.copy(sunDir);
  w.sun.position.copy(sunDir).multiplyScalar(80);
  const pmrem = new THREE.PMREMGenerator(w.renderer);
  const envScene = new THREE.Scene();
  envScene.add(w.sky.clone());
  scene.environment?.dispose();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
}
