// Procedurally painted stand-in textures. Real photo textures (ambientCG / Poly Haven) can replace these later.
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

function crate(size) {
  const c = canvas(size), ctx = c.getContext('2d');
  paintNoise(ctx, size, [150, 112, 70], fbm(size, 31, [[2, 0.3], [32, 0.4], [128, 0.3]]), 0.4, 0.05, 17);
  // grain streaks
  const r = rng(19);
  for (let i = 0; i < 220; i++) {
    ctx.strokeStyle = `rgba(70,45,20,${0.05 + r() * 0.12})`;
    ctx.lineWidth = 1 + r() * 2;
    const y = r() * size;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(size / 3, y + (r() - 0.5) * 8, size * 2 / 3, y + (r() - 0.5) * 8, size, y); ctx.stroke();
  }
  // plank seams
  ctx.strokeStyle = 'rgba(45,28,12,0.7)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, i * size / 5); ctx.lineTo(size, i * size / 5); ctx.stroke(); }
  // frame and diagonal brace
  const f = size * 0.1;
  ctx.fillStyle = 'rgba(115,82,48,1)';
  ctx.fillRect(0, 0, size, f); ctx.fillRect(0, size - f, size, f); ctx.fillRect(0, 0, f, size); ctx.fillRect(size - f, 0, f, size);
  ctx.save();
  ctx.translate(size / 2, size / 2); ctx.rotate(Math.PI / 4);
  ctx.fillRect(-size * 0.7, -f / 2, size * 1.4, f);
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,25,10,0.8)'; ctx.lineWidth = 3;
  ctx.strokeRect(f, f, size - 2 * f, size - 2 * f);
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
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
export function createSurfaces(renderer) {
  const size = 512;
  const make = (canvasEl, scale, roughness, metalness = 0) => ({
    scale,
    material: new THREE.MeshStandardMaterial({ map: toTexture(canvasEl, renderer), roughness, metalness }),
  });
  return {
    concrete: make(concrete(size), 3, 0.92),
    asphalt: make(asphalt(size), 6, 0.95),
    brick: make(brick(size), 2.2, 0.9),
    crate: make(crate(size), 0, 0.85),
    container_red: make(container(size, [150, 52, 40], 41), 2.6, 0.55, 0.45),
    container_blue: make(container(size, [45, 78, 120], 43), 2.6, 0.55, 0.45),
    container_green: make(container(size, [60, 98, 64], 47), 2.6, 0.55, 0.45),
  };
}
