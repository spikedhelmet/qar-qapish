// Map surfaces: procedurally painted stand-ins, replaced by photo textures (ambientCG, CC0) once those
// load from public/assets/game/textures/ (built by scripts/build-textures.sh).
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Tileable value noise, `cells` cells across the canvas.
function noiseField(size, cells, seed) {
  const r = rng(seed);
  const grid = Array.from({ length: cells * cells }, r);
  const at = (x, y) => grid[((y % cells) + cells) % cells * cells + ((x % cells) + cells) % cells];
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells, fy = (y / size) * cells;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
      const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
      out[y * size + x] = a + (b - a) * sy;
    }
  }
  return out;
}

function fbm(size, seed, octaves = [[4, 0.5], [8, 0.25], [16, 0.15], [64, 0.1]]) {
  const out = new Float32Array(size * size);
  octaves.forEach(([cells, amp], i) => {
    const n = noiseField(size, cells, seed + i * 977);
    for (let k = 0; k < out.length; k++) out[k] += n[k] * amp;
  });
  return out;
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// Paint a base color modulated by noise: color * (1 - amount/2 + noise*amount).
function paintNoise(ctx, size, rgb, noise, amount, grain = 0.06, seed = 1) {
  const img = ctx.getImageData(0, 0, size, size);
  const r = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const m = 1 - amount / 2 + noise[i] * amount + (r() - 0.5) * grain;
    img.data[i * 4] = Math.min(255, rgb[0] * m);
    img.data[i * 4 + 1] = Math.min(255, rgb[1] * m);
    img.data[i * 4 + 2] = Math.min(255, rgb[2] * m);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function toTexture(c, renderer) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function concrete(size) {
  const c = canvas(size), ctx = c.getContext('2d');
  paintNoise(ctx, size, [122, 120, 115], fbm(size, 11), 0.35, 0.08, 3);
  // formwork panel seams and tie holes
  ctx.strokeStyle = 'rgba(40,40,38,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  ctx.fillStyle = 'rgba(35,35,33,0.5)';
  for (const fx of [0.25, 0.75]) for (const fy of [0.25, 0.75]) {
    ctx.beginPath(); ctx.arc(fx * size, fy * size, size * 0.008, 0, Math.PI * 2); ctx.fill();
  }
  // water stains running down
  const r = rng(5);
  for (let i = 0; i < 6; i++) {
    const x = r() * size, w = 8 + r() * 30;
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, 'rgba(60,58,50,0.18)'); g.addColorStop(1, 'rgba(60,58,50,0)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, w, size * (0.3 + r() * 0.6));
  }
  return c;
}

function asphalt(size) {
  const c = canvas(size), ctx = c.getContext('2d');
  paintNoise(ctx, size, [72, 72, 74], fbm(size, 21), 0.3, 0.35, 7);
  const r = rng(9);
  ctx.strokeStyle = 'rgba(20,20,20,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) { // cracks
    let x = r() * size, y = r() * size;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 14; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  return c;
}

function brick(size) {
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#8f8a80';
  ctx.fillRect(0, 0, size, size);
  const rows = 14, cols = 4;
  const bh = size / rows, bw = size / cols, gap = Math.max(2, size / 160);
  const r = rng(13);
  for (let y = 0; y < rows; y++) {
    const off = (y % 2) * bw / 2;
    for (let x = -1; x <= cols; x++) {
      const shade = 0.75 + r() * 0.35;
      ctx.fillStyle = `rgb(${142 * shade | 0},${70 * shade | 0},${52 * shade | 0})`;
      ctx.fillRect(x * bw + off + gap / 2, y * bh + gap / 2, bw - gap, bh - gap);
    }
  }
  // grime overlay
  const n = fbm(size, 17);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < size * size; i++) {
    const m = 0.8 + n[i] * 0.35;
    img.data[i * 4] *= m; img.data[i * 4 + 1] *= m; img.data[i * 4 + 2] *= m;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// photo: plank image to build the crate from (a corner of it, about six planks); painted if absent.
// Market awning: faded canvas stripes.
function awning(size) {
  const c = canvas(size), ctx = c.getContext('2d'), r = rng(137), n = 8;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? '#d9cfb8' : '#a2452f';
    ctx.fillRect((i * size) / n, 0, size / n, size);
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(40,30,20,${r() * 0.05})`;
    ctx.fillRect(r() * size, r() * size, 4 + r() * 40, 2 + r() * 14);
  }
  return c;
}

function crate(size, photo) {
  const c = canvas(size), ctx = c.getContext('2d');
  if (!photo) {
    paintNoise(ctx, size, [150, 112, 70], fbm(size, 31, [[2, 0.3], [32, 0.4], [128, 0.3]]), 0.4, 0.05, 17);
    const r = rng(19);
    for (let i = 0; i < 220; i++) { // grain streaks
      ctx.strokeStyle = `rgba(70,45,20,${0.05 + r() * 0.12})`;
      ctx.lineWidth = 1 + r() * 2;
      const y = r() * size;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(size / 3, y + (r() - 0.5) * 8, size * 2 / 3, y + (r() - 0.5) * 8, size, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(45,28,12,0.7)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, i * size / 5); ctx.lineTo(size, i * size / 5); ctx.stroke(); }
  }
  const f = size * 0.11, src = photo ? photo.width : 0;
  // A board from the photo, grain along its length, laid from (x, y) w × h (rotated when tall).
  const board = (x, y, w, h, from) => {
    if (!photo) { ctx.fillStyle = 'rgba(115,82,48,1)'; ctx.fillRect(x, y, w, h); return; }
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (w >= h) ctx.drawImage(photo, 0, from * src, src, src * 0.12, x, y, w, h);
    else { ctx.translate(x + w, y); ctx.rotate(Math.PI / 2); ctx.drawImage(photo, 0, from * src, src, src * 0.12, 0, 0, h, w); }
    ctx.restore();
  };
  // The face: boards from the photo (a darker stretch, as the inside of a frame sits in shadow).
  if (photo) {
    ctx.drawImage(photo, 0, src * 0.2, src * 0.6, src * 0.6, 0, 0, size, size);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, size, size);
  }
  // Diagonal brace, then the frame over it, each with a soft shadow along its edges.
  const shadow = (draw) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = size * 0.02; ctx.shadowOffsetY = size * 0.006; draw(); ctx.restore(); };
  shadow(() => {
    ctx.save();
    ctx.translate(size / 2, size / 2); ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#000'; ctx.fillRect(-size * 0.7, -f / 2, size * 1.4, f);
    ctx.restore();
  });
  ctx.save();
  ctx.translate(size / 2, size / 2); ctx.rotate(-Math.PI / 4);
  board(-size * 0.7, -f / 2, size * 1.4, f, 0.55);
  ctx.restore();
  shadow(() => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, size, f); ctx.fillRect(0, size - f, size, f); ctx.fillRect(0, 0, f, size); ctx.fillRect(size - f, 0, f, size); });
  board(0, 0, size, f, 0.05); board(0, size - f, size, f, 0.3);
  board(0, f, f, size - 2 * f, 0.68); board(size - f, f, f, size - 2 * f, 0.82);
  // Worn edges: a dark line where the boards meet.
  ctx.strokeStyle = 'rgba(25,15,6,0.55)'; ctx.lineWidth = 2;
  ctx.strokeRect(f, f, size - 2 * f, size - 2 * f);
  ctx.strokeRect(1, 1, size - 2, size - 2);
  return c;
}

function container(size, rgb, seed) {
  const c = canvas(size), ctx = c.getContext('2d');
  paintNoise(ctx, size, rgb, fbm(size, seed), 0.25, 0.04, seed);
  // corrugation ribs
  const ribs = 16, w = size / ribs;
  for (let i = 0; i < ribs; i++) {
    const g = ctx.createLinearGradient(i * w, 0, (i + 1) * w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(0.3, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g; ctx.fillRect(i * w, 0, w, size);
  }
  // rust streaks
  const r = rng(seed + 3);
  for (let i = 0; i < 25; i++) {
    ctx.fillStyle = `rgba(110,55,25,${0.08 + r() * 0.2})`;
    const x = r() * size;
    ctx.fillRect(x, r() * size * 0.5, 2 + r() * 5, 20 + r() * size * 0.4);
  }
  return c;
}

// Grass or hedge: green noise with darker speckles.
function lawn(size, rgb, seed) {
  const c = canvas(size), ctx = c.getContext('2d');
  paintNoise(ctx, size, rgb, fbm(size, seed, [[8, 0.4], [32, 0.3], [128, 0.3]]), 0.45, 0.25, seed);
  return c;
}

// Stone blocks or paving slabs: a noisy base color cut into a grid (alternate rows offset for blocks).
function slabs(size, rgb, rows, cols, offset, seed) {
  const c = canvas(size), ctx = c.getContext('2d');
  paintNoise(ctx, size, rgb, fbm(size, seed), 0.25, 0.05, seed);
  ctx.strokeStyle = 'rgba(40,36,30,0.45)';
  ctx.lineWidth = Math.max(2, size / 200);
  const h = size / rows, w = size / cols;
  for (let y = 0; y < rows; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * h); ctx.lineTo(size, y * h); ctx.stroke();
    const shift = offset && y % 2 ? w / 2 : 0;
    for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * w + shift, y * h); ctx.lineTo(x * w + shift, (y + 1) * h); ctx.stroke(); }
  }
  return c;
}

// Large site letter painted on the ground.
export function siteDecal(letter) {
  const size = 512, c = canvas(size), ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(232,197,71,0.75)';
  ctx.lineWidth = 14;
  ctx.setLineDash([40, 24]);
  ctx.strokeRect(20, 20, size - 40, size - 40);
  ctx.fillStyle = 'rgba(232,197,71,0.7)';
  ctx.font = 'bold 300px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letter, size / 2, size / 2 + 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Material settings per map surface. `scale` is meters covered by one texture tile (0 = stretch per face).
// Box UVs are in meters (see world.js); each texture's repeat turns that into tiles.
export function createSurfaces(renderer) {
  const size = 512;
  const make = (canvasEl, scale, roughness, metalness = 0) => {
    const map = toTexture(canvasEl, renderer);
    if (scale) map.repeat.set(1 / scale, 1 / scale);
    return { scale, material: new THREE.MeshStandardMaterial({ map, roughness, metalness }) };
  };
  const surfaces = {
    concrete: make(concrete(size), 3, 0.92),
    asphalt: make(asphalt(size), 6, 0.95),
    brick: make(brick(size), 2.2, 0.9),
    crate: make(crate(size), 0, 0.85),
    container_red: make(container(size, [150, 52, 40], 41), 2.6, 0.55, 0.45),
    container_blue: make(container(size, [45, 78, 120], 43), 2.6, 0.55, 0.45),
    container_green: make(container(size, [60, 98, 64], 47), 2.6, 0.55, 0.45),
    paving: make(slabs(size, [150, 145, 134], 4, 4, false, 61), 2, 0.9),
    stone: make(slabs(size, [196, 174, 136], 5, 3, true, 67), 2, 0.9),
    plaster: make(slabs(size, [214, 208, 196], 1, 1, false, 71), 3, 0.95),
    grass: make(lawn(size, [78, 128, 52], 73), 2.5, 0.95),
    hedge: make(lawn(size, [44, 84, 34], 79), 1.2, 0.95),
    floor: make(slabs(size, [128, 88, 56], 8, 2, true, 83), 2.5, 0.8),
    water: make(lawn(size, [34, 92, 120], 89), 3, 0.08, 0.1), // painted only: glossy, deep pool water
    castle: make(slabs(size, [150, 152, 150], 4, 2, true, 97), 3, 0.92),
    corrugated: make(container(size, [118, 122, 126], 53), 2.6, 0.6, 0.4),
    ballast: make(lawn(size, [122, 118, 108], 109), 2, 0.95),
    cobble: make(slabs(size, [128, 122, 110], 8, 8, true, 113), 2.4, 0.9),
    rust: make(lawn(size, [132, 78, 44], 127), 2.5, 0.8, 0.3),
    dirt: make(lawn(size, [84, 66, 50], 131), 3, 0.95),
    awning: make(awning(size), 0, 0.85),
    glass: make(lawn(size, [28, 36, 44], 107), 2, 0.08, 0.6),            // painted only: dark window glass
    shingles: make(slabs(size, [120, 108, 92], 10, 3, true, 101), 2, 0.9),
    rock: make(lawn(size, [118, 116, 110], 103), 3, 0.95),
  };
  loadPhotos(surfaces, renderer);
  return surfaces;
}

// Photo version of each surface: which texture, tile size in meters [across, up], a color tint
// (linear; the containers share one grey steel painted three colors), and `rough`: a flat roughness
// instead of the photo's map (under the open sky the stone maps are glossy enough to look like marble),
// `bump`: how strongly the normal map shows, and `contrast` (0..1) to flatten a blotchy photo:
// close up, the concrete's light and dark clouds read as marble.
const PHOTO = {
  concrete: { tex: 'concrete', tile: [4, 4], tint: [0.68, 0.68, 0.66], rough: 0.95, bump: 0.4, contrast: 0.4 }, // the photo is pale
  asphalt: { tex: 'asphalt', tile: [4, 4], rough: 0.95 },
  brick: { tex: 'brick', tile: [2.6, 1.3], rough: 0.92 },
  container_red: { tex: 'steel', tile: [3, 3], tint: [0.62, 0.13, 0.08], metalness: 0.3 },
  container_blue: { tex: 'steel', tile: [3, 3], tint: [0.1, 0.2, 0.42], metalness: 0.3 },
  container_green: { tex: 'steel', tile: [3, 3], tint: [0.14, 0.3, 0.14], metalness: 0.3 },
  paving: { tex: 'paving', tile: [2.5, 2.5], tint: [1.12, 0.98, 0.88], rough: 0.9 }, // olive in the photo; warmer under the blue sky
  stone: { tex: 'stone', tile: [2.4, 2.4], rough: 0.9 },
  plaster: { tex: 'plaster', tile: [3, 3], tint: [0.96, 0.93, 0.87], rough: 0.95, bump: 0.6 },   // warm white paint
  grass: { tex: 'grass', tile: [3, 3], rough: 0.95 },                                         // a worn lawn with bare patches
  hedge: { tex: 'hedge', tile: [1.5, 1.5], tint: [0.6, 0.66, 0.5], rough: 0.95, bump: 1.2 },                     // clipped box hedge (also the tree tops)
  floor: { tex: 'wood', tile: [2.5, 2.5], tint: [0.9, 0.8, 0.72], rough: 0.7 },             // the crate planks as floorboards
  castle: { tex: 'castle', tile: [3, 3], rough: 0.92 },                                       // big grey stone blocks
  ballast: { tex: 'ballast', tile: [3, 3], tint: [0.8, 0.78, 0.74], rough: 0.95 },
  cobble: { tex: 'cobble', tile: [2.6, 2.6], rough: 0.9 },
  rust: { tex: 'rust', tile: [2.5, 2.5], tint: [0.8, 0.72, 0.66], rough: 0.85, metalness: 0.3 },
  dirt: { tex: 'dirt', tile: [3, 3], rough: 0.95 },
  corrugated: { tex: 'steel', tile: [3, 3], tint: [0.56, 0.53, 0.49], metalness: 0.3 },     // warehouse cladding
  shingles: { tex: 'shingles', tile: [2, 2], rough: 0.9 },                                    // weathered wood roof shingles
  rock: { tex: 'rock', tile: [3, 3], rough: 0.95 },
};
const PHOTO_DIR = '/assets/game/textures/';

// Resolves to the list of photo textures in use ({ name: { id, source } }), or null without them.
let resolvePhotos, resolveLoaded;
export const photoTextures = new Promise(r => { resolvePhotos = r; });
// Resolves once the photos are on the surfaces' materials (or there are none).
export const photosLoaded = new Promise(r => { resolveLoaded = r; });

// Copy of a texture with its contrast scaled toward the average color.
function flatten(texture, k, renderer) {
  const img = texture.image, c = canvas(img.width), ctx = c.getContext('2d');
  c.height = img.height;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height), d = data.data, n = d.length / 4;
  const mean = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) mean[j] += d[i + j] / n;
  for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) d[i + j] = mean[j] + (d[i + j] - mean[j]) * k;
  ctx.putImageData(data, 0, 0);
  return toTexture(c, renderer);
}

async function loadPhotos(surfaces, renderer) {
  try { await applyPhotos(surfaces, renderer); } finally { resolveLoaded(); }
}

async function applyPhotos(surfaces, renderer) {
  let list = null;
  try {
    const res = await fetch(PHOTO_DIR + 'textures.json', { cache: 'no-cache' });
    if (res.ok) list = await res.json();
  } catch { /* not built: keep the painted ones */ }
  resolvePhotos(list);
  if (!list) return;

  const loader = new THREE.TextureLoader();
  const cache = new Map();
  const load = (file, srgb) => {
    if (!cache.has(file)) {
      cache.set(file, loader.loadAsync(PHOTO_DIR + file).then(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }));
    }
    // Each surface gets its own copy (sharing the image) so it can have its own tiling.
    return cache.get(file).then(t => t.clone());
  };
  const tiled = (t, [x, y]) => { t.repeat.set(1 / x, 1 / y); t.needsUpdate = true; return t; };

  await Promise.all(Object.entries(PHOTO).filter(([, p]) => list[p.tex]).map(async ([name, p]) => {
    const [map, normalMap, roughnessMap] = await Promise.all([
      load(`${p.tex}_color.jpg`, true), load(`${p.tex}_normal.jpg`), p.rough ? null : load(`${p.tex}_rough.jpg`)]);
    const m = surfaces[name].material;
    m.map.dispose();
    Object.assign(m, { map: tiled(p.contrast ? flatten(map, p.contrast, renderer) : map, p.tile), normalMap: tiled(normalMap, p.tile) });
    if (p.bump !== undefined) m.normalScale.setScalar(p.bump);
    if (p.rough) m.roughness = p.rough;
    else Object.assign(m, { roughnessMap: tiled(roughnessMap, p.tile), roughness: 1 });
    if (p.tint) m.color.setRGB(...p.tint);
    if (p.metalness !== undefined) m.metalness = p.metalness;
    m.needsUpdate = true;
  }));

  // Crates: weathered boards from the photo, with a frame and a diagonal brace cut from the same boards.
  if (list.crate || list.wood) {
    const img = (await load(list.crate ? 'crate_color.jpg' : 'wood_color.jpg', true)).image;
    const m = surfaces.crate.material;
    const c = crate(512, img);
    m.map.dispose();
    m.map = toTexture(c, renderer);
    m.needsUpdate = true;
  }
}
