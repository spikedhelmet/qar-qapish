// "Freight" — an original warehouse-assault map. The defenders (team B) hold a big warehouse and the
// truck depot behind it; the attackers (team A) come from a rail yard across an open loading yard.
//
//   rail yard (A) │ loading yard │ WAREHOUSE │ truck depot (B)
//   with a street along the north side and a truck lot with loading docks along the south.
//
// The warehouse: two roller doors onto the yard, doors on the other three sides; pallet rows on the
// floor; a long ramp along the south wall and a stair on the north up to a mezzanine along the east
// wall, with a glass-fronted office on it; a hatch in the roof drops onto the mezzanine, and a fire
// escape outside runs up to the roof. Not mirrored.
import { builder } from './builder.js';

const { boxes, decals, props, box, decal, arena } = builder();

const W = 40, D = 30;
const T = 0.5;          // warehouse wall thickness

arena(W, D, 9, 'concrete');

// Walls with holes, along x (at z) or along z (at x): holes [center, width, bottom, top] in meters
// from the ground. The warehouse's walls are concrete to 3.2 m and corrugated metal above.
function pieces(a0, a1, y, h, holes, put) {
  let a = a0;
  for (const [c, w, bottom, top] of [...holes].sort((p, q) => p[0] - q[0])) {
    const s = c - w / 2, e = c + w / 2;
    if (s > a) put(a, s, y, h);
    if (bottom > 0) put(s, e, y, bottom);
    if (top < h) put(s, e, y + top, h - top);
    a = e;
  }
  if (a1 > a) put(a, a1, y, h);
}
// One wall from y0 to y1 in bands [[top, mat], …], holes in absolute heights.
function wall(alongX, at, a0, a1, bands, holes = [], t = T, y0 = 0) {
  let y = y0;
  for (const [top, mat] of bands) {
    const local = holes.filter(([, , b, tp]) => tp > y && b < top).map(([c, w, b, tp]) => [c, w, Math.max(0, b - y), Math.min(top - y, tp - y)]);
    pieces(a0, a1, y, top - y, local, (p, q, yy, hh) => alongX
      ? box((p + q) / 2, at, q - p, t, hh, mat, yy)
      : box(at, (p + q) / 2, t, q - p, hh, mat, yy));
    y = top;
  }
}
const WALL = [[3.2, 'concrete'], [8, 'corrugated']];
const door = (c, w = 1.6, h = 2.5) => [c, w, 0, h];
const strip = c => [c, 3, 5.6, 6.8];       // high windows that light the floor

// Stairs: n steps of `rise`, `tread` deep, from (x, z) going along +x / -x / +z / -z, width w.
// Each step is solid down to `base` (default the ground).
function stairs(x, z, dir, n, rise, tread, w, y0 = 0, mat = 'concrete', base = 0) {
  const [dx, dz] = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }[dir];
  for (let i = 0; i < n; i++) {
    const cx = x + dx * (i + 0.5) * tread, cz = z + dz * (i + 0.5) * tread, top = y0 + (i + 1) * rise;
    box(cx, cz, dx ? tread : w, dz ? tread : w, top - base, mat, base);
  }
}

// ---- the warehouse: x -6 … 26, z -14 … 10
const X0 = -6, X1 = 26, Z0 = -14, Z1 = 10, ROOF = 8, MEZZ = 3.6;
decal((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, 'concrete', 0.02);
wall(false, X0, Z0, Z1, WALL, [[-7, 4.5, 0, 4.2], [3.5, 4.5, 0, 4.2], strip(-11.2), strip(8.2)]);   // west: roller doors
wall(true, Z0, X0, X1, WALL, [door(2, 1.4), strip(-2), strip(8), [23, 2, 4.7, 6.0]]);                 // north (office window)
wall(true, Z1, X0, X1, WALL, [[2, 4, 0, 4.2], strip(-2.5), strip(16)]);                               // south: dock door
wall(false, X1, Z0, Z1, WALL, [door(-2), [6, 1.4, MEZZ, MEZZ + 2.4]]);                               // east: door, mezzanine door
// Roof, with a hatch over the mezzanine and a low parapet (open where the fire escape arrives).
const roofHole = [21, 22.6, 2, 3.6];
for (const [a0, a1, b0, b1] of [[X0 - 0.25, X1 + 0.25, Z0 - 0.25, roofHole[2]], [X0 - 0.25, X1 + 0.25, roofHole[3], Z1 + 0.25],
  [X0 - 0.25, roofHole[0], roofHole[2], roofHole[3]], [roofHole[1], X1 + 0.25, roofHole[2], roofHole[3]]]) {
  box((a0 + a1) / 2, (b0 + b1) / 2, a1 - a0, b1 - b0, 0.3, 'concrete', ROOF);
}
const RT = ROOF + 0.3;
box((X0 + X1) / 2, Z0 - 0.1, X1 - X0 + 0.5, 0.3, 0.7, 'concrete', RT);
wall(true, Z1 + 0.1, X0 - 0.25, X1 + 0.25, [[RT + 0.7, 'concrete']], [[24.4, 2.2, 0, 99]], 0.3, RT);
box(X0 - 0.1, (Z0 + Z1) / 2, 0.3, Z1 - Z0, 0.7, 'concrete', RT);
box(X1 + 0.1, (Z0 + Z1) / 2, 0.3, Z1 - Z0, 0.7, 'concrete', RT);
for (const [x, z] of [[2, -8], [10, 4], [-1, 3], [15, -9]]) box(x, z, 2, 2, 1.2, 'corrugated', RT);   // roof vents: cover up top
box(21.8, 1.6, 2.4, 0.6, 0.9, 'corrugated', RT);                                                    // a lip by the hatch

// Mezzanine along the east wall, on columns, with a railing (open at the ramp and the stair).
box(21.9, (Z0 + Z1) / 2, 7.7, Z1 - Z0 - 0.5, 0.3, 'floor', MEZZ - 0.3);
for (const z of [-10, -4, 2]) box(18.2, z, 0.4, 0.4, MEZZ - 0.3, 'corrugated');
wall(false, 18.15, Z0 + 0.25, Z1 - 0.25, [[MEZZ + 1, 'corrugated']], [[-13, 1.6, 0, 99], [8.1, 3.2, 0, 99]], 0.1, MEZZ);
// Ramp along the south wall: up from the floor to the mezzanine (12 steps of 0.3 m).
stairs(4.6, 8.1, '+x', 12, 0.3, 1.12, 3.3, 0, 'concrete');
// Stair along the north wall.
stairs(12, -13, '+x', 12, 0.3, 0.5, 1.4, 0, 'concrete');
// Office on the mezzanine: glass front over the floor, a door, desks.
wall(false, 20, Z0 + 0.25, -7.5, [[MEZZ + 2.8, 'plaster']], [[-9, 1.2, MEZZ, MEZZ + 2.2], [-12, 2.2, MEZZ + 1, MEZZ + 2.2]], 0.2, MEZZ);
wall(true, -7.5, 20, X1 - 0.25, [[MEZZ + 2.8, 'plaster']], [[22.8, 2.4, MEZZ + 1, MEZZ + 2.2]], 0.2, MEZZ);
box(22.9, -10.7, 5.8, 6.4, 0.2, 'plaster', MEZZ + 2.8);
box(23.5, -12.6, 2.2, 0.8, 0.8, 'floor', MEZZ);       // desk
box(25, -9, 0.8, 2.4, 1.9, 'floor', MEZZ);            // filing cabinets
box(21.5, -3, 1.2, 1.2, 1.2, 'crate', MEZZ);          // crates out on the mezzanine
box(21.5, 4.5, 2.4, 1.2, 1.2, 'crate', MEZZ);

// The floor: pallet rows with gaps to cross between them, a forklift.
const rows = [
  [-9.5, [[-2, 2, 2.4], [3.5, 7.5, 3.6], [9, 12.5, 1.2]]],
  [-3.2, [[-2.5, 1.5, 1.2], [3, 6.5, 2.4], [8.5, 12.5, 3.6]]],
  [2.6, [[-2, 1, 3.6], [2.5, 6.5, 1.2], [8, 12, 2.4]]],
];
for (const [z, runs] of rows) for (const [a, b, h] of runs) box((a + b) / 2, z, b - a, 1.2, h, 'crate');
box(15, -5.5, 1.2, 2.2, 1.3, 'container_red');        // forklift
box(15, -6.9, 1.0, 0.2, 2.4, 'corrugated');
box(-3.5, -12.4, 1.2, 1.2, 1.2, 'crate');
box(-3.5, 7.5, 2.4, 1.2, 1.2, 'crate');

// Fire escape up the outside of the south wall to the roof (20 steps of 0.415 m).
stairs(13.2, 10.95, '+x', 20, (ROOF + 0.3) / 20, 0.52, 1.4, 0, 'corrugated');
box(24.4, 10.95, 2.2, 1.4, 0.3, 'corrugated', RT - 0.3);   // landing at the top

// ---- truck lot along the south: a loading dock beside the dock door, trailers, dumpsters
box(-2.6, 11.4, 4.6, 2.3, 1.2, 'concrete');          // loading docks either side of the door
box(6.6, 11.4, 4.6, 2.3, 1.2, 'concrete');
stairs(-5.4, 11.4, '-x', 3, 0.4, 0.5, 2.3, 0, 'concrete');
box(-1.8, 19, 2.6, 11, 2.8, 'container_blue', 0.4);   // a parked trailer
box(-1.8, 12.8, 2.4, 1.4, 1.2, 'corrugated', 0.4);    // its landing legs
box(9.5, 22, 2.6, 12, 2.8, 'container_green', 0.4);
box(20, 17, 1.8, 3.2, 1.6, 'container_green');        // dumpsters
box(-12, 16, 1.8, 3.2, 1.6, 'container_red');
box(18, 26, 7, 2.6, 3, 'container_red');              // a trailer near the depot's south gate
box(-14, 25.5, 3, 3, 1.2, 'crate');

// ---- street along the north: parked trucks, barriers, a booth
box(-18, -23, 12, 2.6, 2.8, 'container_red', 0.5);
box(-11, -23, 2.4, 2.6, 2.4, 'corrugated', 0.5);      // its cab
box(8, -25.5, 2.4, 2.4, 2.6, 'corrugated');           // a booth
for (const x of [0, 16]) box(x, -19, 3.6, 0.6, 1.1, 'concrete');   // barriers
box(20, -25, 9, 2.6, 2.8, 'container_blue', 0.5);

// ---- loading yard in the middle-west: containers, pallets, a forklift
box(-17, -9, 6, 2.5, 2.6, 'container_green');
box(-17, -9, 6, 2.5, 2.6, 'container_red', 2.6);
box(-14, 5, 2.5, 6, 2.6, 'container_blue');
box(-21, 12, 2.4, 1.2, 1.2, 'crate');
box(-10.5, -1.5, 1.2, 1.2, 1.2, 'crate');
box(-10.5, -1.5, 1.2, 1.2, 1.2, 'crate', 1.2);
box(-9.8, 9.5, 1.2, 2.2, 1.3, 'container_red');       // forklift
box(-22, -18, 3, 1.2, 1.2, 'crate');

// ---- rail yard (team A): tracks, two freight wagons, a signal hut
for (const x of [-30, -35]) {
  decal(x - 0.75, 0, 0.12, 2 * D, 'corrugated', 0.08);   // rails
  decal(x + 0.75, 0, 0.12, 2 * D, 'corrugated', 0.08);
}
box(-30, -12, 3, 13, 1.1, 'corrugated');               // flatcar …
box(-30, -12, 2.5, 12, 2.6, 'container_green', 1.1);   // … with a container
box(-35, 13, 3, 13, 1.1, 'corrugated');
box(-35, 13, 2.5, 6, 2.6, 'container_red', 1.1);
box(-38, -24, 3, 3, 3, 'brick');                       // signal hut

// ---- truck depot (team B): fenced, gates north and south, a truck and an office cabin
// The fence runs from the warehouse's corners to the outer wall; the warehouse's east wall is the
// depot's west side. A 3 m gate each side.
for (const [z0, z1] of [[-D, -23.5], [-20.5, Z0], [Z1, 18.5], [21.5, D]]) box(26.1, (z0 + z1) / 2, 0.2, z1 - z0, 2.6, 'corrugated');
box(34, -18, 2.6, 9, 2.8, 'container_red', 0.6);       // truck
box(34, -12.2, 2.4, 2.4, 2.6, 'corrugated', 0.6);
box(37.5, 9, 3, 7, 2.8, 'container_blue');             // office cabin
// stairs down from the mezzanine door
box(27, 6, 2, 2, MEZZ, 'concrete');
stairs(33.4, 6, '-x', 12, MEZZ / 12, 0.45, 1.4, 0, 'concrete');
box(33.5, 14, 1.2, 1.2, 1.2, 'crate');
box(32, -3, 2.4, 1.2, 1.2, 'crate');

const spawnsA = [[-37, -6], [-37, -2], [-37, 2], [-37, 6], [-33, -3], [-33, 3]].map(([x, z]) => ({ x, z, yaw: -Math.PI / 2 }));
const spawnsB = [[36, -6], [36, -2], [36, 0.5], [38.5, -4], [38.5, -1], [33.5, -7]].map(([x, z]) => ({ x, z, yaw: Math.PI / 2 }));

export const FREIGHT = {
  id: 'freight',
  name: 'Freight',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  decals,
  props,
  spawns: { A: spawnsA, B: spawnsB },
  // Plant sites for objective mode (attackers from the rail yard): the warehouse floor under the
  // mezzanine, and the truck depot.
  sites: [
    { name: 'A', min: [13, -2], max: [17.8, 6] },
    { name: 'B', min: [30, 14], max: [38, 22] },
  ],
  sun: { elevation: 55, azimuth: 150 },
};
