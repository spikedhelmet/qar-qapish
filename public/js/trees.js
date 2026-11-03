// Plants on the maps, built in code: broadleaf trees, pines, bushes and tufts of tall grass.
// Trunks and branches are tapered tubes; leaves, needles and grass are cards (flat squares with a
// cut-out picture). The pictures on the cards are painted once at load time: tree leaves, dry bush
// leaves and grass blades are cut out of photo sheets (ambientCG, CC0), pine needles are drawn as
// strokes. Without the photos, painted stand-ins are used.
// Only trunks are solid: the map gives them a box (see tree() / pine() in shared/maps/builder.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DIR = '/assets/game/textures/';

// Deterministic random numbers, so every player sees the same plant for the same seed.
export function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- card pictures

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Leaves around a center, as if on a twig seen from any side. draw(g, rand, length) draws one leaf,
// stem at the origin, pointing up the canvas.
function paintRadial(draw, rand, { count = 70, spread = 0.34, length = 80 } = {}) {
  const S = 512, c = canvas(S), g = c.getContext('2d');
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * S * spread;
    g.save();
    g.translate(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d);
    g.rotate(a + Math.PI / 2 + (rand() - 0.5) * 1.2);        // leaves point outward from the middle
    draw(g, rand, length * (0.75 + rand() * 0.5));
    g.restore();
  }
  return c;
}

// Grass blades fanning up from the bottom middle of the card.
function paintTuft(draw, rand) {
  const S = 512, c = canvas(S), g = c.getContext('2d');
  for (let i = 0; i < 34; i++) {
    g.save();
    g.translate(S / 2 + (rand() - 0.5) * 160, S);
    g.rotate((rand() - 0.5) * 0.9);
    draw(g, rand, S * (0.55 + rand() * 0.42));
    g.restore();
  }
  return c;
}

// Pine twigs across the card (the card lies along a branch: u runs out along it), thick with needles.
function paintNeedles(rand) {
  const S = 512, c = canvas(S), g = c.getContext('2d');
  const greens = ['#1f3320', '#2a4429', '#335232', '#3d5f38', '#24392a'];
  const twig = (x0, y0, x1, y1, needle) => {
    g.strokeStyle = '#4a3a2a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const n = Math.hypot(x1 - x0, y1 - y0) / 2.5, ang = Math.atan2(y1 - y0, x1 - x0);
    g.lineWidth = 2.6;
    for (let i = 0; i < n; i++) {
      const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k, len = needle * (0.6 + rand() * 0.6) * (1 - 0.4 * k);
      for (const side of [-1, 1]) {
        const a = ang + side * (0.7 + rand() * 0.5);
        g.strokeStyle = greens[Math.floor(rand() * greens.length)];
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
      }
    }
  };
  twig(10, S / 2, S - 20, S / 2 + (rand() - 0.5) * 30, 70);
  for (let i = 0; i < 18; i++) {
    const x = 30 + rand() * (S - 140), side = rand() < 0.5 ? -1 : 1, len = 100 + rand() * 120;
    twig(x, S / 2, x + len * 0.75, S / 2 + side * len * 0.62, 44);
  }
  return c;
}

// Stand-ins: plain ovals and strokes.
const paintedLeaf = colors => (g, rand, length) => {
  g.fillStyle = colors[Math.floor(rand() * colors.length)];
  g.beginPath();
  g.ellipse(0, -length / 2, length / 4.5, length / 2, 0, 0, Math.PI * 2);
  g.fill();
};
const paintedBlade = (g, rand, length) => {
  g.fillStyle = ['#4e6b2e', '#5f7d36', '#6c8a3c'][Math.floor(rand() * 3)];
  g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-2, -length * 0.6, (rand() - 0.5) * 30, -length); g.lineTo(5, 0); g.fill();
};

// Cuts the pieces (leaves, blades) out of a photo sheet, color + opacity, and returns a function
// drawing a random one: draw(g, rand, length), its bottom at the origin, `length` pixels long.
// `shades`: copies of the sheet darkened, so a card mixes pieces in light and in shade.
function photoSheet(color, opacity, shades = [0.6, 0.78, 1]) {
  const w = color.width, h = color.height, g = canvas(w, h).getContext('2d');
  g.drawImage(color, 0, 0);
  const rgba = g.getImageData(0, 0, w, h);
  const m = canvas(w, h).getContext('2d');
  m.drawImage(opacity, 0, 0);
  const alpha = m.getImageData(0, 0, w, h).data;
  for (let i = 0; i < alpha.length; i += 4) rgba.data[i + 3] = alpha[i];
  const sheets = shades.map(k => {
    const c = canvas(w, h), d = new ImageData(new Uint8ClampedArray(rgba.data), w, h);
    for (let i = 0; i < d.data.length; i += 4) for (let j = 0; j < 3; j++) d.data[i + j] *= k;
    c.getContext('2d').putImageData(d, 0, 0);
    return c;
  });
  // Pieces: runs of columns with something in them, then runs of rows within each (sheets are grids).
  const on = (x, y) => alpha[(y * w + x) * 4] > 128;
  const runs = (n, used) => {
    const out = [];
    for (let i = 0, start = -1; i <= n; i++) {
      const u = i < n && used(i);
      if (u && start < 0) start = i;
      if (!u && start >= 0) { if (i - start > 12) out.push([start, i]); start = -1; }
    }
    return out;
  };
  const pieces = [];
  for (const [x0, x1] of runs(w, x => { for (let y = 0; y < h; y += 2) if (on(x, y)) return true; return false; })) {
    for (const [y0, y1] of runs(h, y => { for (let x = x0; x < x1; x += 2) if (on(x, y)) return true; return false; })) {
      pieces.push([x0, y0, x1 - x0, y1 - y0]);
    }
  }
  return (ctx, rand, length) => {
    const [x, y, sw, sh] = pieces[Math.floor(rand() * pieces.length)];
    const k = length / Math.max(sw, sh), s = sheets[Math.floor(rand() * sheets.length)];
    ctx.drawImage(s, x, y, sw, sh, -sw * k / 2, -sh * k, sw * k, sh * k);
  };
}

function cardTexture(c, renderer) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// ---------------------------------------------------------------- materials

let materials = null;

// Materials shared by every plant. They start painted and switch to the photos once loaded.
export function plantMaterials(renderer) {
  if (materials) return materials;
  const card = (c, opts = {}) => new THREE.MeshStandardMaterial({
    map: cardTexture(c, renderer), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, ...opts,
  });
  materials = {
    bark: new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.95 }),
    leaves: card(paintRadial(paintedLeaf(['#3a5228', '#4d6b34', '#5e7d40']), rng(7))),
    dry: card(paintRadial(paintedLeaf(['#8a6a34', '#a07c3c', '#b89450']), rng(11), { count: 90, spread: 0.36, length: 64 })),
    needles: card(paintNeedles(rng(13))),
    grass: card(paintTuft(paintedBlade, rng(17)), { alphaTest: 0.4 }),
  };
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
  // A card material's picture, repainted from a photo sheet.
  const repaint = async (name, mat, paint, tint) => {
    if (!list[name]) return;
    const [color, opacity] = await Promise.all([load(`${name}_color.jpg`), load(`${name}_opacity.jpg`)]);
    const old = mat.map;
    mat.map = cardTexture(paint(photoSheet(color.image, opacity.image)), renderer);
    mat.color.setRGB(...tint);
    mat.needsUpdate = true;
    old.dispose(); color.dispose(); opacity.dispose();
  };
  await Promise.all([
    repaint('leaves', materials.leaves, draw => paintRadial(draw, rng(7)), [0.78, 0.86, 0.72]),
    repaint('dryleaves', materials.dry, draw => paintRadial(draw, rng(11), { count: 90, spread: 0.36, length: 64 }), [1, 0.92, 0.7]),
    repaint('blades', materials.grass, draw => paintTuft(draw, rng(17)), [0.72, 0.8, 0.55]),
  ]);
}

// ---------------------------------------------------------------- geometry

const _t = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3();

// A tube through points with a radius at each point, bark tiled about once per meter.
function tube(points, radii, sides = 8) {
  const pos = [], nrm = [], uv = [], index = [];
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

// A trunk from the ground up, rooted 0.5 m below so the open bottom of the tube never shows.
function trunkTube(trunk, r0, sides = 8) {
  return tube([new THREE.Vector3(0, -0.5, 0), ...trunk.pts], [r0 * 1.45, ...trunk.radii], sides);
}

// One quad from corners a, b, c, d (in order around it), all with the given normal.
function quad(a, b, c, d, normal) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([...normal.toArray(), ...normal.toArray(), ...normal.toArray(), ...normal.toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
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

// A broadleaf tree, `height` meters tall: { bark, leaves } with the base at the origin.
export function treeGeometry(seed, height) {
  const rand = rng(seed + 1);
  const bark = [], leaves = [];
  const r0 = height * 0.03, trunkTop = height * (0.42 + rand() * 0.1);
  const crown = new THREE.Vector3(0, height * 0.66, 0);

  // Trunk: flared at the foot, leaning a little, carried on up as the leader.
  const lean = new THREE.Vector3((rand() - 0.5) * 0.25, 1, (rand() - 0.5) * 0.25);
  const trunk = limb(new THREE.Vector3(), lean, height * 0.78, r0, r0 * 0.25, rand, { rise: 0.05, steps: 8, bend: 0.12 });
  trunk.radii[0] *= 1.35;
  bark.push(trunkTube(trunk, r0));
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

// A pine, `height` meters tall: a straight trunk with whorls of branches, long at the bottom and
// short at the top, drooping low down and reaching up near the tip; needle cards along each branch,
// one lying flat and one standing up. { bark, needles }.
export function pineGeometry(seed, height) {
  const rand = rng(seed + 3);
  const bark = [], needles = [];
  const r0 = height * 0.022;
  const trunk = limb(new THREE.Vector3(), new THREE.Vector3((rand() - 0.5) * 0.06, 1, (rand() - 0.5) * 0.06), height, r0, r0 * 0.1, rand, { rise: 0.02, steps: 8, bend: 0.04 });
  trunk.radii[0] *= 1.3;
  bark.push(trunkTube(trunk, r0));
  const at = y => { // a point on the trunk at height y
    const i = Math.min(trunk.pts.length - 2, Math.floor((y / height) * (trunk.pts.length - 1)));
    return trunk.pts[i].clone().lerp(trunk.pts[i + 1], (y / height) * (trunk.pts.length - 1) - i);
  };
  const whorls = 11 + Math.floor(rand() * 3), low = 0.18 + rand() * 0.06;
  for (let w = 0; w < whorls; w++) {
    const k = w / (whorls - 1), y = height * (low + (0.97 - low) * k);
    const reach = height * 0.3 * (1 - k) ** 0.85 + 0.35;
    const count = 6 + Math.floor(rand() * 2), turn = rand() * Math.PI;
    for (let b = 0; b < count; b++) {
      const a = turn + (b / count) * Math.PI * 2 + (rand() - 0.5) * 0.4;
      const dir = new THREE.Vector3(Math.cos(a), -0.3 + 0.55 * k + (rand() - 0.5) * 0.15, Math.sin(a)).normalize();
      const base = at(y), len = reach * (0.85 + rand() * 0.3), tip = base.clone().addScaledVector(dir, len);
      if (k < 0.25) bark.push(tube([base, base.clone().lerp(tip, 0.5), tip], [r0 * 0.3, r0 * 0.18, r0 * 0.05], 4)); // only the big low ones show
      const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize(), up = new THREE.Vector3().crossVectors(side, dir).normalize();
      const out = new THREE.Vector3(dir.x, 0.7, dir.z).normalize();
      const flat = (0.85 * len + 0.6) / 2, tall = (0.5 * len + 0.4) / 2;
      const from = base.clone().addScaledVector(dir, -0.15);
      // Three cards along the branch: two tipped either way off flat, one standing up.
      for (const [across, w] of [[side.clone().addScaledVector(up, 0.55).normalize(), flat], [side.clone().addScaledVector(up, -0.55).normalize(), flat], [up, tall]]) {
        needles.push(quad(from.clone().addScaledVector(across, -w), tip.clone().addScaledVector(across, -w), tip.clone().addScaledVector(across, w), from.clone().addScaledVector(across, w), out));
      }
    }
  }
  // The leader at the very top.
  const top = trunk.pts[trunk.pts.length - 1];
  for (let s = 0; s < 2; s++) {
    const a = s * Math.PI / 2, side = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.3);
    const base = top.clone().add(new THREE.Vector3(0, -0.9, 0)), tip = top.clone().add(new THREE.Vector3(0, 0.4, 0));
    needles.push(quad(base.clone().sub(side), base.clone().add(side), tip.clone().add(side), tip.clone().sub(side), new THREE.Vector3(Math.cos(a + Math.PI / 2), 0.6, Math.sin(a + Math.PI / 2)).normalize()));
  }
  return { bark: mergeGeometries(bark), needles: mergeGeometries(needles) };
}

// A bush about `size` meters across: clusters of leaf cards in a low dome. { leaves }.
export function bushGeometry(seed, size) {
  const rand = rng(seed + 5), cards = [], center = new THREE.Vector3(0, size * 0.15, 0);
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * size * 0.32;
    const p = new THREE.Vector3(Math.cos(a) * d, size * (0.22 + rand() * 0.38), Math.sin(a) * d);
    cluster(cards, p, size * (0.55 + rand() * 0.2), center, rand);
  }
  return { leaves: mergeGeometries(cards) };
}

// Tufts of tall grass: two crossed upright cards each. points: [x, z, size, turn].
export function grassGeometry(points, y = 0) {
  const cards = [], up = new THREE.Vector3(0, 1, 0);
  for (const [x, z, s, r] of points) {
    const w = 0.42 * s, h = 0.62 * s;
    for (const a of [r, r + Math.PI / 2]) {
      const dx = Math.cos(a) * w, dz = Math.sin(a) * w;
      cards.push(quad(new THREE.Vector3(x - dx, y - 0.03, z - dz), new THREE.Vector3(x + dx, y - 0.03, z + dz),
        new THREE.Vector3(x + dx, y + h, z + dz), new THREE.Vector3(x - dx, y + h, z - dz), up)); // lit like the ground
    }
  }
  return mergeGeometries(cards);
}

// Meshes for all of a map's plants (props of kind tree / pine / bush / grass), merged by material.
export function plantMeshes(props, renderer) {
  const mats = plantMaterials(renderer), parts = { bark: [], leaves: [], needles: [], dry: [], grass: [] };
  const m = new THREE.Matrix4();
  for (const p of props) {
    const place = g => g.applyMatrix4(m.makeRotationY(rng(p.seed)() * Math.PI * 2).setPosition(p.x, p.y || 0, p.z));
    if (p.kind === 'tree') { const g = treeGeometry(p.seed, p.h); parts.bark.push(place(g.bark)); parts.leaves.push(place(g.leaves)); }
    if (p.kind === 'pine') { const g = pineGeometry(p.seed, p.h); parts.bark.push(place(g.bark)); parts.needles.push(place(g.needles)); }
    if (p.kind === 'bush') parts[p.dry ? 'dry' : 'leaves'].push(place(bushGeometry(p.seed, p.size).leaves));
    if (p.kind === 'grass') parts.grass.push(grassGeometry(p.points, p.y || 0));
  }
  const out = [];
  for (const [name, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list), mats[name]);
    mesh.castShadow = name !== 'grass';
    mesh.receiveShadow = true;
    out.push(mesh);
  }
  return out;
}
