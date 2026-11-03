// "Bastion" — a walled courtyard with four stone towers, laid out after the team's screenshots.
// Each tower has a door, stairs inside up to a hatch, a ladder outside, and a roofed wooden lookout
// on top. An H-shaped wooden walkway at lookout height joins the four towers. A small stone outpost
// stands against the north wall and another against the south; low walls, fences, pines, dry bushes, boulders and tall grass fill the yard. Teams spawn inside the west and
// east gates. Mirrored both ways (team A west).
import { builder } from './builder.js';

const { boxes, decals, props, box, decal, pine, bush, rock, roof, ladder, grass, arena, spawnColumn } = builder();

const W = 29, D = 22;
const TOP = 5;          // tower tops and the walkway deck
const T = 0.6;          // tower wall thickness

arena(W, D, 7, 'castle');
decal(0, 0, 2 * W, 2 * D, 'grass', 0.01);

// Every placement four times: (x, z), (-x, z), (x, -z), (-x, -z). f(sx, sz) gets the two signs.
const four = f => { for (const sx of [1, -1]) for (const sz of [1, -1]) f(sx, sz); };
const two = f => { for (const s of [1, -1]) f(s); };

// A wall with holes along x (at z) or along z (at x), like Villa's: holes [center, width, bottom, top].
function pieces(a0, a1, y, h, holes, put) {
  let a = a0;
  for (const [c, w, bottom = 0, top = 2.6] of [...holes].sort((p, q) => p[0] - q[0])) {
    const s = c - w / 2, e = c + w / 2;
    if (s > a) put(a, s, y, h);
    if (bottom > 0) put(s, e, y, bottom);
    if (top < h) put(s, e, y + top, h - top);
    a = e;
  }
  if (a1 > a) put(a, a1, y, h);
}
const wallX = (z, x0, x1, h, mat, holes = [], y = 0, t = T) => pieces(Math.min(x0, x1), Math.max(x0, x1), y, h, holes, (a, b, yy, hh) => box((a + b) / 2, z, b - a, t, hh, mat, yy));
const wallZ = (x, z0, z1, h, mat, holes = [], y = 0, t = T) => pieces(Math.min(z0, z1), Math.max(z0, z1), y, h, holes, (a, b, yy, hh) => box(x, (a + b) / 2, t, b - a, hh, mat, yy));
const win = c => [c, 1.4, 1.0, 2.4];
// A slab over x0…x1, z0…z1 at height y, with a rectangular hole (hx0…hx1, hz0…hz1) in it.
function slab(x0, x1, z0, z1, hx0, hx1, hz0, hz1, y, t, mat) {
  const r = (a0, a1, b0, b1) => { if (a1 - a0 > 0.01 && b1 - b0 > 0.01) box((a0 + a1) / 2, (b0 + b1) / 2, a1 - a0, b1 - b0, t, mat, y); };
  r(x0, x1, z0, hz0); r(x0, x1, hz1, z1); r(x0, hx0, hz0, hz1); r(hx1, x1, hz0, hz1);
}

// ---- the four towers: stone, 9 × 9 m, 5 m tall, centered at (±18.5, ±9.5)
const TX = 18.5, TZ = 9.5, HALF = 4.5;
four((sx, sz) => {
  const cx = sx * TX, cz = sz * TZ, inner = HALF - T;           // inside faces at ±inner from the center
  const outerZ = cz + sz * HALF, innerZ = cz - sz * HALF;       // the walls facing the outer wall / the middle
  const outerX = cx + sx * HALF, innerX = cx - sx * HALF;       // the walls facing the gate side / the middle
  wallX(innerZ + sz * T / 2, cx - HALF, cx + HALF, TOP - 0.3, 'castle', [[cx, 1.6]]);       // door toward the middle
  wallX(outerZ - sz * T / 2, cx - HALF, cx + HALF, TOP - 0.3, 'castle');                     // the stairs run along it
  wallZ(outerX - sx * T / 2, cz - HALF, cz + HALF, TOP - 0.3, 'castle', [win(cz)]);
  wallZ(innerX + sx * T / 2, cz - HALF, cz + HALF, TOP - 0.3, 'castle', [win(cz + sz * 1.5)]);
  // Stairs inside along the outer wall, rising toward the gate side: 12 steps of 0.42 × 0.55 m.
  const rise = TOP / 12, tread = 0.55, x0 = cx - sx * (inner - 0.3), zIn = cz + sz * (inner - 1.4), zOut = cz + sz * inner;
  for (let k = 1; k <= 12; k++) {
    const a = x0 + sx * (k - 1) * tread, b = a + sx * tread;
    box((a + b) / 2, (zIn + zOut) / 2, tread, 1.4, k * rise, 'castle');
  }
  // The wooden top over the whole tower, with a hatch above the upper stairs (from the 5th step, so
  // your head clears the edge).
  const hx = [x0 + sx * 4 * tread, cx + sx * inner].sort((p, q) => p - q), hz = [zIn - sz * 0.1, zOut].sort((p, q) => p - q);
  slab(cx - HALF, cx + HALF, cz - HALF, cz + HALF, hx[0], hx[1], hz[0], hz[1], TOP - 0.3, 0.3, 'floor');
  // The lookout: posts, a railing (open where the walkway and the ladder arrive), and a hip roof.
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
    box(cx + px * (HALF - 0.2), cz + pz * (HALF - 0.2), 0.3, 0.3, 2.8, 'floor', TOP);
  }
  const ladderX = cx - sx * 2;
  wallX(outerZ - sz * 0.2, cx - HALF, cx + HALF, 1.0, 'floor', [[ladderX, 1.4, 0, 9]], TOP, 0.12);
  wallX(innerZ + sz * 0.2, cx - HALF, cx + HALF, 1.0, 'floor', [], TOP, 0.12);
  wallZ(outerX - sx * 0.2, cz - HALF, cz + HALF, 1.0, 'floor', [], TOP, 0.12);
  wallZ(innerX + sx * 0.2, cz - HALF, cz + HALF, 1.0, 'floor', [[sz * 7.5, 3.6, 0, 9]], TOP, 0.12);
  roof(cx, cz, TOP + 2.8, 10.8, 10.8, 2.6);
  // A ladder up the outer face, from the yard to the lookout.
  ladder(ladderX, outerZ + sz * 0.01, sz > 0 ? 'n' : 's', TOP);
  // Crate by the door, a boulder and a dry bush at the corner.
  box(cx - sx * 2.2, cz - sz * (HALF + 1.4), 1.2, 1.2, 1.2, 'crate');
  rock(cx - sx * (HALF + 0.6), cz + sz * (HALF + 1.4), 2.2, 1.3, 1.7);
  bush(cx - sx * (HALF + 1.2), cz + sz * (HALF - 0.4), 1.5, true);
});

// ---- the walkway: an H of wooden deck at the lookouts' height, on posts
two(sz => {
  const z = sz * 7.5;
  box(0, z, 2 * (TX - HALF), 3.6, 0.3, 'floor', TOP - 0.3);
  for (const x of [-9.5, -4, 4, 9.5]) for (const dz of [-1.5, 1.5]) box(x, z + dz, 0.35, 0.35, TOP - 0.3, 'floor');
});
box(0, 0, 3.6, 11.4, 0.3, 'floor', TOP - 0.3);
for (const z of [-2.8, 2.8]) for (const x of [-1.5, 1.5]) box(x, z, 0.35, 0.35, TOP - 0.3, 'floor');
// Planks piled on the walkway: cover up top (point-symmetric, as in the screenshots).
two(s => {
  box(s * 5.5, -s * 8.3, 5, 0.7, 0.45, 'floor', TOP);
  box(s * 5.2, -s * 7.1, 4.4, 0.6, 0.3, 'floor', TOP);
});

// ---- under the walkway: a table, a row of crates, and a crate stack in the very middle
box(-2.9, 1.2, 1.4, 6.5, 0.85, 'floor');
box(2.9, -1.2, 1.4, 6.5, 1.2, 'crate');
box(0, 0, 2.2, 2.2, 2.2, 'crate');

// ---- gates (west and east), with a barricade in front of each that covers the spawn
two(s => {
  for (const z of [-3.3, 3.3]) box(s * (W - 0.8), z, 1.6, 1.4, 6.5, 'castle');
  box(s * (W - 0.8), 0, 1.6, 5.2, 1.5, 'castle', 5);
  box(s * (W - 0.15), 0, 0.3, 5.2, 5, 'floor');          // the gate itself, shut
  box(s * 23.5, 0, 0.8, 7, 2.2, 'castle');
  box(s * 23.5, 0, 0.8, 2.5, 1.0, 'castle', 2.2);        // with a raised middle
});

// ---- outposts against the north and south walls: a stone hut with a door and windows, and crates
// stacked by it to climb onto its roof
two(sz => {
  const z0 = sz * 17, z1 = sz * D, x0 = -3.25, x1 = 3.25, H = 3.4;
  wallX(z0 + sz * 0.25, x0, x1, H, 'castle', [[0, 1.6]], 0, 0.5);
  wallZ(x0 + 0.25, z0, z1, H, 'castle', [win((z0 + z1) / 2)], 0, 0.5);
  wallZ(x1 - 0.25, z0, z1, H, 'castle', [win((z0 + z1) / 2)], 0, 0.5);
  box(0, (z0 + z1) / 2, 6.5, Math.abs(z1 - z0), 0.3, 'castle', H);
  box(-1.9, (z0 + z1) / 2 + sz * 0.6, 2.7, 3, 1.2, 'castle', H + 0.3);        // a broken upper storey
  box(4.2, z0 + sz * 0.7, 1.2, 1.2, 1.2, 'crate');
  box(4.2, z0 + sz * 1.9, 1.2, 1.2, 2.4, 'crate');
  box(-sz * 2, z0 - sz * 1.6, 1.1, 1.1, 1.1, 'crate');
});

// ---- low stone walls between the towers on the north and south sides, and fences
four((sx, sz) => {
  box(sx * 11.3, sz * 15.2, 1.8, 3.6, 2.4, 'castle');
  box(sx * 11.3 - sx * 1.5, sz * 15.2, 1.2, 1.8, 1.2, 'castle');            // a step down on the inner side
  box(sx * 9.1, sz * 13.4, 2.6, 0.1, 1.0, 'floor');                         // fence
  box(sx * 7.8, sz * 14.9, 0.1, 3.0, 1.0, 'floor');
  bush(sx * 12.3, sz * 17.4, 1.6, true);
  bush(sx * 9.9, sz * 12.2, 1.2, true);
  decal(sx * 4, sz * 16.6, 4.2, 0.35, 'floor', 0.06);                      // a plank lying in the grass
});

// ---- trees: pines in the corners, by the low walls and either side of the middle
four((sx, sz) => {
  pine(sx * 26.3, sz * 19.4, 8.5);
  pine(sx * 13.4, sz * 18.6, 7.5);
  pine(sx * 12.6, sz * 2.6, 6.5);
  bush(sx * 26.8, sz * 17.2, 1.4, true);
});
two(s => pine(s * 10.5, s * 0.6, 7));

// ---- tall grass everywhere it fits (last: it keeps clear of everything above)
grass(900, -W + 0.5, W - 0.5, -D + 0.5, D - 0.5, 7);

const spawnsFor = side => [...spawnColumn(side, 26.5, [-2.4, -0.8, 0.8, 2.4]), ...spawnColumn(side, 27.8, [-1.6, 1.6])];

export const BASTION = {
  id: 'bastion',
  name: 'Bastion',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  decals,
  props,
  spawns: { A: spawnsFor(-1), B: spawnsFor(1) },
  // Plant sites for objective mode, on the defenders' (east) half: the ground floors of the east towers.
  sites: [
    { name: 'A', min: [14.6, -13.4], max: [22.4, -5.6] },
    { name: 'B', min: [14.6, 5.6], max: [22.4, 13.4] },
  ],
  sun: { elevation: 50, azimuth: 135 },
};
