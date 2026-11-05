// Builds the 3D scene for the map: geometry, materials, sky and lighting.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSurfaces, siteDecal, photosLoaded } from './textures.js';
import { propMeshes } from './props.js';

// Box geometry in world space with UVs in meters projected from world coordinates (each texture's
// repeat sets its tile size), so textures keep the same density and line up across neighbouring boxes.
// scale 0: the texture is stretched over each face instead.
// Boxes that touch can have faces in exactly the same plane, and those flicker (z-fighting). Each
// visible box is drawn a few millimeters bigger or smaller than its neighbors: largest first, each
// takes the lowest step its neighbors don't use, so big walls stay put and thin glass stays on top.
const GROW_STEP = 0.003;
const SKY_SUN = 0.597;     // where the sun is in the sky photo: atan2(z, x) in radians
function growSteps(boxes) {
  const volume = b => (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]);
  const touch = (a, b) => [0, 1, 2].every(i => a.min[i] <= b.max[i] + 0.001 && b.min[i] <= a.max[i] + 0.001);
  const order = [...boxes].sort((a, b) => volume(b) - volume(a)), steps = new Map();
  for (const b of order) {
    const used = new Set();
    for (const [o, step] of steps) if (touch(b, o)) used.add(step);
    let step = 0;
    while (used.has(step)) step++;
    steps.set(b, step);
  }
  return steps;
}

function boxGeometry(b, scale, grow = 0) {
  // The ground's top stays exact (ground cover sits a few millimeters above it), and so does anything's foot.
  const top = b.max[1] > 0.001 ? grow : 0, bottom = b.min[1] > 0.001 ? grow : 0;
  const sx = b.max[0] - b.min[0] + 2 * grow, sy = b.max[1] - b.min[1] + top + bottom, sz = b.max[2] - b.min[2] + 2 * grow;
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1] + top - bottom) / 2, (b.min[2] + b.max[2]) / 2);
  if (scale > 0) {
    const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      if (nx > 0.5) uv.setXY(i, z, y);
      else if (ny > 0.5) uv.setXY(i, x, z);
      else uv.setXY(i, x, y);
    }
  } else {
    // One picture per face (crates): repeated about every 1.25 m, so a long box is a row of crates.
    const uv = g.attributes.uv, nrm = g.attributes.normal, n = v => Math.max(1, Math.round(v / 1.25));
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      const [a, b] = nx > 0.5 ? [sz, sy] : ny > 0.5 ? [sx, sz] : [sx, sy];
      uv.setXY(i, uv.getX(i) * n(a), uv.getY(i) * n(b));
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
  // The sky you see: a photo of clouds (Poly Haven, CC0), if it's there; the computed sky stays
  // behind it and still lights the map.
  new THREE.TextureLoader().load('/assets/game/sky/sky.jpg', t => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
    sky.visible = false;
  });

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const cam = sun.shadow.camera;
  cam.left = -48; cam.right = 48; cam.top = 48; cam.bottom = -48; cam.near = 1; cam.far = 220;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xbcd3ee, 0x5a5146, 0.5);
  scene.add(hemi);
  scene.fog = new THREE.Fog(0xc6d3df, 70, 260);
  scene.environmentIntensity = 0.55;

  scene.userData.world = { renderer, surfaces: createSurfaces(renderer), sky, sun, hemi, level: null };
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

  // Indoors (map.interiors: [x0, y0, z0, x1, y1, z1] boxes) the sky light is turned down to
  // map.indoorAmbient: big roofed spaces are dim, lit by their openings and their lamps.
  const interiors = map.interiors || [];
  const inside = (x, y, z) => interiors.some(([x0, y0, z0, x1, y1, z1]) => x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1);
  const indoorMats = [];                 // [copy, original, from a kit]
  const indoor = (m, kit = false) => {
    const c = m.clone();
    indoorMats.push([c, m, kit]);
    return c;
  };

  // Merge all boxes that share a surface (and are on the same side of a wall) into one mesh.
  const groups = {}, steps = growSteps(map.boxes.filter(b => !b.hidden));
  for (const b of [...map.boxes, ...(map.decals || [])]) {
    if (b.hidden) continue;
    const c = [0, 1, 2].map(i => (b.min[i] + b.max[i]) / 2);
    (groups[b.mat + (inside(...c) ? '|in' : '')] ||= []).push(boxGeometry(b, w.surfaces[b.mat].scale, (steps.get(b) || 0) * GROW_STEP));
  }
  for (const [key, geos] of Object.entries(groups)) {
    const [mat, where] = key.split('|');
    const mesh = new THREE.Mesh(mergeGeometries(geos), where ? indoor(w.surfaces[mat].material) : w.surfaces[mat].material);
    mesh.castShadow = mat !== 'asphalt';
    mesh.receiveShadow = true;
    level.add(mesh);
  }

  for (const mesh of propMeshes(map.props || [], w.surfaces, w.renderer, interiors.length ? { inside, material: indoor } : null)) {
    mesh.userData.onLoad = () => w.refreshIndoor?.();     // kit pieces arrive later
    level.add(mesh);
  }
  for (const [x, y, z, intensity, distance, color = 0xffe2b8] of map.lights || []) {
    const lamp = new THREE.PointLight(color, intensity, distance, 2);
    lamp.position.set(x, y, z);
    level.add(lamp);
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
  const envScene = new THREE.Scene(), envSky = w.sky.clone();
  envSky.visible = true;
  envScene.add(envSky);
  // Turn the photo so its sun sits where this map's sun is, and shadows fall the right way.
  scene.backgroundRotation.y = SKY_SUN - Math.PI / 2 + THREE.MathUtils.degToRad(map.sun.azimuth);
  scene.environment?.dispose();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.environmentIntensity = map.ambient ?? 0.55;
  w.hemi.intensity = map.hemi ?? 0.5;
  // Indoor materials: the same sky light, but only map.indoorAmbient of it. (A material without its
  // own environment map gets the scene's strength, so each one gets the map explicitly.) Copies of
  // the box surfaces are refreshed once the photo textures are on them.
  const refresh = () => {
    for (const [m, base, kit] of indoorMats) {
      if (!kit) m.copy(base);
      m.envMap = scene.environment;
      m.envMapIntensity = map.indoorAmbient ?? 0.2;
      m.needsUpdate = true;
    }
  };
  refresh();
  photosLoaded.then(refresh);
  w.refreshIndoor = refresh;
  pmrem.dispose();
}
