// Map props: everything on a map that isn't a plain box. Plants (trees.js), boulders, pitched roofs
// and ladders. Props are only drawn; their solid parts (trunks, a boulder's core, a ladder's steps)
// are hidden boxes in the map, added by the helpers in shared/maps/builder.js.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { plantMeshes, rng } from './trees.js';

// Kit pieces (props of kind 'piece': { kit, name, x, y, z, rot }): each kit's GLB loads once; every
// copy of a piece is drawn as one instanced mesh per part. The group fills in when the kit has loaded.
const kitFiles = new Map();
const loadKit = kit => {
  if (!kitFiles.has(kit)) kitFiles.set(kit, new GLTFLoader().loadAsync(`/assets/game/kits/${kit}.glb`).then(g => g.scene));
  return kitFiles.get(kit);
};
function kitPieces(props, indoor) {
  const group = new THREE.Group(), byKit = new Map();
  for (const p of props) if (p.kind === 'piece') (byKit.get(p.kit) || byKit.set(p.kit, []).get(p.kit)).push(p);
  for (const [kit, list] of byKit) {
    loadKit(kit).then(scene => {
      scene.updateMatrixWorld(true);
      const byPiece = new Map();
      for (const p of list) (byPiece.get(p.name) || byPiece.set(p.name, []).get(p.name)).push(p);
      for (const [name, places] of byPiece) {
        const holder = scene.getObjectByName(name);
        if (!holder) { console.warn(`kit ${kit}: no piece ${name}`); continue; }
        const inv = holder.matrixWorld.clone().invert(), at = new THREE.Matrix4(), part = new THREE.Matrix4();
        // Indoors and outdoors get separate meshes: indoor ones use a dimmer copy of the material.
        const sides = indoor ? [places.filter(p => !indoor.inside(p.x, (p.y || 0) + 0.5, p.z)), places.filter(p => indoor.inside(p.x, (p.y || 0) + 0.5, p.z))] : [places, []];
        holder.traverse(o => {
          if (!o.isMesh) return;
          part.multiplyMatrices(inv, o.matrixWorld);                 // the part, relative to the piece
          sides.forEach((list, k) => {
            if (!list.length) return;
            const mat = k ? indoor.material(o.material, true) : o.material;
            const mesh = new THREE.InstancedMesh(o.geometry, mat, list.length);
            list.forEach((p, i) => {
              at.makeRotationY(p.rot * Math.PI / 2).setPosition(p.x, p.y || 0, p.z);
              mesh.setMatrixAt(i, at.clone().multiply(part));
            });
            mesh.castShadow = mesh.receiveShadow = true;
            mesh.computeBoundingSphere();
            group.add(mesh);
          });
        });
        group.userData.onLoad?.();
      }
    }).catch(e => console.warn(`kit ${kit} didn't load`, e));
  }
  return group;
}

// UVs in meters, projected along each vertex's main normal axis (like the boxes in world.js).
function meterUVs(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ax >= ay && ax >= az ? [p.getZ(i), p.getY(i)] : ay >= az ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// A boulder sx × sy × sz meters: a lumpy sphere, flattened underneath and sunk a little.
function rockGeometry(seed, sx, sy, sz) {
  const rand = rng(seed + 9);
  const waves = Array.from({ length: 6 }, () => [new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), 1.5 + rand() * 3, rand() * 6]);
  let g = new THREE.IcosahedronGeometry(1, 3);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let k = 1;
    for (const [d, f, ph] of waves) k += 0.09 * Math.sin(v.dot(d) * f + ph);    // the same at the same spot: no seams
    v.multiplyScalar(k);
    if (v.y < 0) v.y *= 0.35;                                                   // sits flat on the ground
    p.setXYZ(i, v.x * sx / 2, v.y * sy * 0.75 + sy * 0.1, v.z * sz / 2);
  }
  g.computeVertexNormals();
  return meterUVs(g);
}

// A hip roof w × d meters (eaves at y = 0) rising h to its ridge; a pyramid when square.
function roofGeometry(w, d, h) {
  const swap = d > w, W = (swap ? d : w) / 2, D = (swap ? w : d) / 2, R = W - D; // ridge along x (swapped back below)
  const pos = [], uv = [];
  const tri = (pts, along, inward) => { // along/inward: per-point eave coordinate and distance in from the eave
    for (let i = 0; i < 3; i++) { pos.push(...pts[i]); uv.push(along[i], Math.hypot(pts[i][1], inward[i])); }
  };
  // Long sides (trapezoids, two triangles each), then the hipped ends.
  for (const s of [1, -1]) {
    const e0 = [-W * s, 0, D * s], e1 = [W * s, 0, D * s], r0 = [-R * s, h, 0], r1 = [R * s, h, 0];
    tri([e0, e1, r1], [-W * s, W * s, R * s], [0, 0, D]);
    tri([e0, r1, r0], [-W * s, R * s, -R * s], [0, D, D]);
    const f0 = [W * s, 0, D * s], f1 = [W * s, 0, -D * s], r = [R * s, h, 0];
    tri([f0, f1, r], [D * s, -D * s, 0], [0, 0, W - R]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (swap) g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// A ladder leaning against a wall: two rails and rungs from its foot to just above the top.
const SIDE = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }; // direction from the ladder to the wall
function ladderGeometry({ x, z, side, top, run, width }) {
  const [dx, dz] = SIDE[side], wall = new THREE.Vector3(x, top + 0.7, z);
  const foot = new THREE.Vector3(x - dx * run, 0, z - dz * run), axis = new THREE.Vector3().subVectors(wall, foot);
  const across = new THREE.Vector3(-dz, 0, dx), len = axis.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
  const parts = [];
  for (const s of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.07, len, 0.07).applyQuaternion(q);
    const mid = foot.clone().addScaledVector(axis, 0.5).addScaledVector(across, s * width / 2);
    parts.push(rail.translate(mid.x, mid.y, mid.z));
  }
  for (let t = 0.3; t < len - 0.1; t += 0.3) {
    const rung = new THREE.BoxGeometry(width, 0.05, 0.05);
    if (dx) rung.rotateY(Math.PI / 2);
    const at = foot.clone().addScaledVector(axis, t / len);
    parts.push(rung.translate(at.x, at.y, at.z));
  }
  return mergeGeometries(parts.map(p => { p.deleteAttribute('uv'); return meterUVs(p); }));
}

// All of a map's props as meshes, merged by material. surfaces: the map's box materials (world.js).
export function propMeshes(props, surfaces, renderer, indoor = null) {
  const out = plantMeshes(props, renderer);
  if (props.some(p => p.kind === 'piece')) out.push(kitPieces(props, indoor));
  const rocks = [], roofs = [], undersides = [], ladders = [];
  for (const p of props) {
    if (p.kind === 'rock') rocks.push(rockGeometry(p.seed, p.sx, p.sy, p.sz).translate(p.x, p.y || 0, p.z));
    if (p.kind === 'roof') {
      roofs.push(roofGeometry(p.w, p.d, p.h).translate(p.x, p.y, p.z));
      undersides.push(meterUVs(new THREE.PlaneGeometry(p.w, p.d).rotateX(Math.PI / 2).translate(p.x, p.y - 0.02, p.z)));
    }
    if (p.kind === 'ladder') ladders.push(ladderGeometry(p));
  }
  const add = (list, mat, shadow = true) => {
    if (!list.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(list), mat);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    out.push(mesh);
  };
  add(rocks, surfaces.rock.material);
  add(roofs, surfaces.shingles.material);
  add(undersides, surfaces.floor.material, false);
  add(ladders, surfaces.floor.material);
  return out;
}
