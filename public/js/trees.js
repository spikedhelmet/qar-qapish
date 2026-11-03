// Trees on the maps, built in code: a tapered, slightly bent trunk with branches, and clusters of
// leaf cards at the branch ends. The bark and leaves are photos (ambientCG, CC0); the leaf cards are
// painted once from a sheet of single leaves. Without the photos, painted stand-ins are used.
// Only the trunk is solid: the map gives it a box (see tree() in shared/maps/builder.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DIR = '/assets/game/textures/';

// Deterministic random numbers, so every player sees the same tree for the same seed.
function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- materials

let materials = null;

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// A leaf card: many leaves around a center, as if on a twig seen from any side. drawLeaf(g, rand) draws
// one leaf, stem at the origin, pointing up the canvas, in light or shade.
function paintCard(drawLeaf, rand) {
  const S = 512, c = canvas(S), g = c.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * S * 0.34;
    g.save();
    g.translate(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d);
    g.rotate(a + Math.PI / 2 + (rand() - 0.5) * 1.2);        // leaves point outward from the middle
    const k = 0.75 + rand() * 0.5;
    g.scale(k, k);
    drawLeaf(g, rand);
    g.restore();
  }
  return c;
}

// Stand-in leaves: plain green ovals.
function paintedLeaf(g, rand) {
  g.fillStyle = ['#3a5228', '#4d6b34', '#5e7d40'][Math.floor(rand() * 3)];
  g.beginPath();
  g.ellipse(0, -34, 16, 34, 0, 0, Math.PI * 2);
  g.fill();
}

// Cuts the leaves out of the photo sheet (color + opacity) and returns a function drawing a random one.
function photoLeaves(color, opacity) {
  const w = color.width, h = color.height, sheet = canvas(w, h), g = sheet.getContext('2d');
  g.drawImage(color, 0, 0);
  const rgba = g.getImageData(0, 0, w, h);
  const m = canvas(w, h).getContext('2d');
  m.drawImage(opacity, 0, 0);
  const alpha = m.getImageData(0, 0, w, h).data;
  for (let i = 0; i < alpha.length; i += 4) rgba.data[i + 3] = alpha[i];
  g.putImageData(rgba, 0, 0);
  // The same sheet in shade: the card mixes leaves in light and in shadow.
  const sheets = [0.6, 0.78, 1].map(k => {
    const c = canvas(w, h), cg = c.getContext('2d'), d = new ImageData(new Uint8ClampedArray(rgba.data), w, h);
    for (let i = 0; i < d.data.length; i += 4) for (let j = 0; j < 3; j++) d.data[i + j] *= k;
    cg.putImageData(d, 0, 0);
    return c;
  });
  // Each leaf (or twig) is a run of columns with something in them.
  const used = x => { for (let y = 0; y < h; y += 2) if (alpha[(y * w + x) * 4] > 128) return true; return false; };
  const parts = [];
  for (let x = 0, start = -1; x <= w; x++) {
    const on = x < w && used(x);
    if (on && start < 0) start = x;
    if (!on && start >= 0) { if (x - start > 20) parts.push([start, x]); start = -1; }
  }
  const rows = parts.map(([x0, x1]) => {
    let y0 = h, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = x0; x < x1; x += 2) if (alpha[(y * w + x) * 4] > 128) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return [x0, y0, x1 - x0, y1 - y0 + 1];
  });
  return (ctx, rand) => {
    const [x, y, sw, sh] = rows[Math.floor(rand() * rows.length)];
    const k = 80 / Math.max(sw, sh);                          // about 80 px long on the card
    const s = sheets[Math.floor(rand() * sheets.length)];
    ctx.drawImage(s, x, y, sw, sh, -sw * k / 2, -sh * k, sw * k, sh * k); // stem (bottom) at the origin
  };
}

function cardTexture(c, renderer) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Bark and leaf materials, shared by every tree. They start painted and switch to the photos once loaded.
export function treeMaterials(renderer) {
  if (materials) return materials;
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.95 });
  const leaves = new THREE.MeshStandardMaterial({
    map: cardTexture(paintCard(paintedLeaf, rng(7)), renderer),
    alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85,
  });
  materials = { bark, leaves };
  loadPhotos(renderer).catch(() => { /* keep the painted ones */ });
  return materials;
}

async function loadPhotos(renderer) {
  const list = await (await fetch(DIR + 'textures.json', { cache: 'no-cache' })).json();
  const loader = new THREE.TextureLoader();
  const load = async (file, srgb) => {
    const t = await loader.loadAsync(DIR + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  if (list.bark) {
    const [map, normalMap] = await Promise.all([load('bark_color.jpg', true), load('bark_normal.jpg')]);
    Object.assign(materials.bark, { map, normalMap });
    materials.bark.color.setRGB(0.62, 0.52, 0.44); // the photo is olive; a darker, browner trunk
    materials.bark.needsUpdate = true;
  }
  if (list.leaves) {
    const [color, opacity] = await Promise.all([load('leaves_color.jpg'), load('leaves_opacity.jpg')]);
    const old = materials.leaves.map;
    materials.leaves.map = cardTexture(paintCard(photoLeaves(color.image, opacity.image), rng(7)), renderer);
    materials.leaves.color.setRGB(0.78, 0.86, 0.72);
    materials.leaves.needsUpdate = true;
    old.dispose(); color.dispose(); opacity.dispose();
  }
}

// ---------------------------------------------------------------- geometry

const _t = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3();

// A tube through points with a radius at each point (8 sides), bark tiled about once per meter.
function tube(points, radii) {
  const sides = 8, pos = [], nrm = [], uv = [], index = [];
  let along = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    _t.subVectors(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]).normalize();
    // Each ring's orientation carries on from the one before (picking it fresh can flip it, which
    // twists that stretch of the tube inside out).
    if (i === 0) {
      _up.set(0, 1, 0);
      if (Math.abs(_t.y) > 0.9) _up.set(1, 0, 0);
      _n.crossVectors(_t, _up).normalize();
    } else {
      _n.addScaledVector(_t, -_n.dot(_t)).normalize();
    }
    _b.crossVectors(_t, _n).normalize();
    if (i > 0) along += p.distanceTo(points[i - 1]);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2, cx = Math.cos(a), sx = Math.sin(a);
      const dx = _n.x * cx + _b.x * sx, dy = _n.y * cx + _b.y * sx, dz = _n.z * cx + _b.z * sx;
      pos.push(p.x + dx * radii[i], p.y + dy * radii[i], p.z + dz * radii[i]);
      nrm.push(dx, dy, dz);
      uv.push(j / sides, along);
    }
  }
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1); // counter-clockwise seen from outside
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

// A bending limb from `from` in direction `dir`: points and radii (r0 at the base, r1 at the tip).
function limb(from, dir, length, r0, r1, rand, { rise = 0.15, steps = 6, bend = 0.25 } = {}) {
  const pts = [from.clone()], radii = [r0], d = dir.clone().normalize(), p = from.clone();
  for (let i = 1; i <= steps; i++) {
    d.x += (rand() - 0.5) * bend; d.z += (rand() - 0.5) * bend; d.y += rise; // wander, and curve up toward the light
    d.normalize();
    p.addScaledVector(d, length / steps);
    pts.push(p.clone());
    radii.push(r0 + (r1 - r0) * (i / steps));
  }
  return { pts, radii };
}

// Leaf cards: three crossed squares around `at`, size s, with normals pointing out from the crown's
// middle so the canopy shades like one rounded mass instead of flat cards.
function cluster(out, at, s, center, rand) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI));
  const normal = new THREE.Vector3().subVectors(at, center).normalize();
  normal.y += 0.25;          // a little toward the sky
  normal.normalize();
  for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
    const plane = new THREE.PlaneGeometry(s, s);
    if (axis[0]) plane.rotateY(Math.PI / 2);
    if (axis[1]) plane.rotateX(Math.PI / 2);
    plane.applyQuaternion(q);
    plane.translate(at.x, at.y, at.z);
    const n = plane.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, normal.x, normal.y, normal.z);
    out.push(plane);
  }
}

// One tree, `height` meters tall: { bark, leaves } geometries with the base at the origin.
export function treeGeometry(seed, height) {
  const rand = rng(seed + 1);
  const bark = [], leaves = [];
  const r0 = height * 0.03, trunkTop = height * (0.42 + rand() * 0.1);
  const crown = new THREE.Vector3(0, height * 0.66, 0);

  // Trunk: flared at the foot, leaning a little, carried on up as the leader.
  const lean = new THREE.Vector3((rand() - 0.5) * 0.25, 1, (rand() - 0.5) * 0.25);
  const trunk = limb(new THREE.Vector3(), lean, height * 0.78, r0, r0 * 0.25, rand, { rise: 0.05, steps: 8, bend: 0.12 });
  trunk.radii[0] *= 1.35;
  // Root it below the ground, straight down, so the open bottom of the tube never shows.
  trunk.pts.unshift(new THREE.Vector3(0, -0.5, 0));
  trunk.radii.unshift(r0 * 1.45);
  bark.push(tube(trunk.pts, trunk.radii));
  trunk.pts.shift(); trunk.radii.shift();
  const leaderTop = trunk.pts[trunk.pts.length - 1];
  for (let k = 0; k < 6; k++) {
    cluster(leaves, leaderTop.clone().add(new THREE.Vector3((rand() - 0.5) * 1.6, (rand() - 0.6) * 1.4, (rand() - 0.5) * 1.6)), height * 0.24, crown, rand);
  }

  // Branches off the upper trunk, each with a couple of side branches, leaves along their outer half.
  const n = 5 + Math.floor(rand() * 3);
  for (let b = 0; b < n; b++) {
    const t = (trunkTop / (height * 0.78)) * (0.75 + 0.45 * (b / n));
    const i = Math.min(trunk.pts.length - 2, Math.floor(t * (trunk.pts.length - 1)));
    const base = trunk.pts[i].clone().lerp(trunk.pts[i + 1], t * (trunk.pts.length - 1) - i);
    const a = (b / n) * Math.PI * 2 + rand() * 0.8;
    const dir = new THREE.Vector3(Math.cos(a), 0.55 + rand() * 0.5, Math.sin(a));
    const len = height * (0.26 + rand() * 0.14);
    const br = limb(base, dir, len, r0 * 0.5, r0 * 0.12, rand);
    bark.push(tube(br.pts, br.radii));
    for (let k = 3; k < br.pts.length; k++) cluster(leaves, br.pts[k], height * (0.2 + rand() * 0.08), crown, rand);
    for (let s = 0; s < 2; s++) {
      const at = br.pts[2 + s * 2], sa = a + (s ? 1 : -1) * (0.6 + rand() * 0.6);
      const side = limb(at, new THREE.Vector3(Math.cos(sa), 0.7 + rand() * 0.4, Math.sin(sa)), len * 0.5, r0 * 0.22, r0 * 0.07, rand, { steps: 4 });
      bark.push(tube(side.pts, side.radii));
      for (let k = 2; k < side.pts.length; k++) cluster(leaves, side.pts[k], height * (0.18 + rand() * 0.07), crown, rand);
    }
  }
  return { bark: mergeGeometries(bark), leaves: mergeGeometries(leaves) };
}

// Meshes for all of a map's trees (props of kind 'tree': { x, y, z, h, seed }), two draw calls in all.
export function treeMeshes(props, renderer) {
  const trees = props.filter(p => p.kind === 'tree');
  if (!trees.length) return [];
  const mats = treeMaterials(renderer), bark = [], leaves = [], m = new THREE.Matrix4();
  for (const p of trees) {
    const g = treeGeometry(p.seed, p.h);
    m.makeRotationY(rng(p.seed)() * Math.PI * 2).setPosition(p.x, p.y || 0, p.z);
    bark.push(g.bark.applyMatrix4(m));
    leaves.push(g.leaves.applyMatrix4(m));
  }
  const out = [new THREE.Mesh(mergeGeometries(bark), mats.bark), new THREE.Mesh(mergeGeometries(leaves), mats.leaves)];
  for (const mesh of out) { mesh.castShadow = true; mesh.receiveShadow = true; }
  return out;
}
