// Loads the optimized models built by /dev/build.html (public/assets/game/manifest.json).
// If they're missing, `assets.ready` stays false and the game uses its stand-in models.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const assets = {
  ready: false,
  manifest: null,
  characters: {},          // team → scene (clone with SkeletonUtils before use)
  clips: {},               // clip id → AnimationClip
  weapons: { fp: {}, tp: {} },
};

const BASE = '/assets/game/';

export async function loadAssets(onProgress = () => {}) {
  let manifest;
  try {
    const res = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
    if (!res.ok) return assets;
    manifest = await res.json();
  } catch {
    return assets;
  }

  const loader = new GLTFLoader();
  const jobs = [];
  const add = (file, use) => jobs.push({ file, use });
  for (const [team, c] of Object.entries(manifest.characters)) add(c.file, g => { assets.characters[team] = g.scene; });
  add(manifest.animations.file, g => { for (const clip of g.animations) assets.clips[clip.name] = clip; });
  for (const [kind, w] of Object.entries(manifest.weapons)) {
    add(w.fp, g => { assets.weapons.fp[kind] = g.scene; });
    add(w.tp, g => { assets.weapons.tp[kind] = g.scene; });
  }

  let done = 0;
  onProgress(0, jobs.length);
  try {
    await Promise.all(jobs.map(async ({ file, use }) => {
      const gltf = await loader.loadAsync(BASE + file.replace(/^game\//, ''));
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.isSkinnedMesh) o.frustumCulled = false; // animated poses leave the bind-pose bounds
      });
      use(gltf);
      onProgress(++done, jobs.length);
    }));
  } catch (e) {
    console.warn('Could not load game models, using stand-ins.', e);
    return assets;
  }
  assets.manifest = manifest;
  assets.ready = true;
  return assets;
}

export function weaponInfo(kind) {
  return assets.manifest?.weapons[kind] || null;
}

// A fresh copy of a weapon model ('fp' = first person, 'tp' = held by other players), or null.
export function weaponModel(kind, view) {
  const src = assets.weapons[view][kind];
  if (!src) return null;
  const g = src.clone();
  const muzzle = new THREE.Object3D();
  muzzle.position.fromArray(weaponInfo(kind).muzzle);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  return g;
}
