// Map props: everything on a map that isn't a plain box. Plants (trees.js), boulders, pitched roofs
// and ladders. Props are only drawn; their solid parts (trunks, a boulder's core, a ladder's steps)
// are hidden boxes in the map, added by the helpers in shared/maps/builder.js.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { plantMeshes, rng } from './trees.js';

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
export function propMeshes(props, surfaces, renderer) {
  const out = plantMeshes(props, renderer);
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
