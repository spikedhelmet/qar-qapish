// Map sanity check: spawn clearance, spawn-to-spawn sightlines and ground reachability (flood fill).
// Run from the project folder: node scripts/check-map.mjs oldtown
const root = process.cwd(), id = process.argv[2];
const { MAPS } = await import(root + '/public/js/shared/map.js');
if (!MAPS[id]) { console.log('Usage: node scripts/check-map.mjs <' + Object.keys(MAPS).join(' | ') + '>'); process.exit(1); }
const { raycastMap, canStand } = await import(root + '/public/js/shared/collision.js');
const m = MAPS[id];
console.log(id, 'boxes', m.boxes.length);
for (const s of [...m.spawns.A, ...m.spawns.B]) if (!canStand(m, [s.x, (s.y || 0) + 0.001, s.z], 1.8)) console.log('  blocked spawn', s);
let open = [];
for (const a of m.spawns.A) for (const b of m.spawns.B) for (const h of [1.0, 1.6]) {
  const from = [a.x, (a.y || 0) + h, a.z], to = [b.x, (b.y || 0) + h, b.z];
  const d = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const dir = to.map((v, i) => (v - from[i]) / d);
  if (raycastMap(m, from, dir, d).t >= d - 0.01) open.push([a.x, a.z, b.x, b.z, h]);
}
console.log('  open spawn-to-spawn lines:', open.length, JSON.stringify(open.slice(0, 4)));
// Ground-level flood fill on a 0.5 m grid (cells where a standing player fits at y = 0).
const [x0, , z0] = m.bounds.min, [x1, , z1] = m.bounds.max, S = 0.5;
const nx = Math.round((x1 - x0) / S), nz = Math.round((z1 - z0) / S);
const ok = new Uint8Array(nx * nz), seen = new Uint8Array(nx * nz);
for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) ok[i * nz + k] = canStand(m, [x0 + (i + 0.5) * S, 0.03, z0 + (k + 0.5) * S], 1.8) ? 1 : 0;
const s0 = m.spawns.A[0]; const si = Math.floor((s0.x - x0) / S), sk = Math.floor((s0.z - z0) / S);
const stack = [si * nz + sk]; seen[stack[0]] = 1; let count = 0;
while (stack.length) { const c = stack.pop(); count++; const i = Math.floor(c / nz), k = c % nz; for (const [di, dk] of [[1,0],[-1,0],[0,1],[0,-1]]) { const a = i + di, b = k + dk; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const n = a * nz + b; if (ok[n] && !seen[n]) { seen[n] = 1; stack.push(n); } } }
const total = ok.reduce((a, b) => a + b, 0);
const lost = []; for (let c = 0; c < ok.length; c++) if (ok[c] && !seen[c]) lost.push([+(x0 + (Math.floor(c / nz) + 0.5) * S).toFixed(1), +(z0 + (c % nz + 0.5) * S).toFixed(1)]);
console.log(`  ground cells reachable from team A spawn: ${count}/${total}`, lost.length ? 'unreached e.g. ' + JSON.stringify(lost.slice(0, 6)) : '');
const sB = m.spawns.B[0]; console.log('  team B spawn reachable:', !!seen[Math.floor((sB.x - x0) / S) * nz + Math.floor((sB.z - z0) / S)]);
