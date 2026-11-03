// "Freight" — an original warehouse-assault map in a tight city block. The warehouse fills the middle
// and tall buildings close in on every side: narrow streets and alleys, short sightlines, chokepoints.
//
//   north street (6 m) ────────────────────────────── loading court (B, north-east)
//   │ west street (6 m) │ WAREHOUSE │ east alley (4 m) │
//   back yard (A, south-west) ── south alley (4 m, the fire escape narrows it) ──
//   and a covered hallway through the west buildings, from the back yard to the north street.
//
// The warehouse: a roller door and a side door onto the west street, a dock door onto the south alley,
// doors north and east; pallet rows; a ramp along the south wall and a stair along the north up to a
// mezzanine along the east wall, with a glass-fronted office; a storeroom under the mezzanine by the
// back door; a hatch in the roof (the fire escape climbs to the roof from the south alley). Not mirrored.
import { builder } from './builder.js';

const { boxes, decals, props, box, decal, arena } = builder();

const W = 28, D = 22;
const T = 0.5;          // warehouse wall thickness

arena(W, D, 10, 'brick');

// Walls with holes, along x (at z) or along z (at x): holes [center, width, bottom, top] in meters
// from the ground, in bands of material [[top, mat], …].
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
const door = (c, w = 1.6, h = 2.5) => [c, w, 0, h];
const strip = c => [c, 2.5, 4.8, 6];       // high windows that light the floor

// Stairs: n steps of `rise`, `tread` deep, from (x, z) along '+x' / '-x' / '+z' / '-z', width w,
// each solid down to the ground.
function stairs(x, z, dir, n, rise, tread, w, mat = 'concrete', y0 = 0) {
  const [dx, dz] = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }[dir];
  for (let i = 0; i < n; i++) {
    box(x + dx * (i + 0.5) * tread, z + dz * (i + 0.5) * tread, dx ? tread : w, dz ? tread : w, y0 + (i + 1) * rise, mat);
  }
}
// A solid building block from x0…x1, z0…z1, h tall.
const block = (x0, x1, z0, z1, h, mat) => box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, h, mat);

// ---- the city block around the warehouse
block(-W, W - 10, -D, -16, 11, 'brick');        // north side of the north street
block(-W, -22, -16, -10, 9, 'plaster');         // the north street's west end
block(-6, -2, 12, 14, 6, 'plaster');            // a low building between the south alley and the back yard
block(2, W - 10, 12, D, 9, 'concrete');         // south side of the south alley
block(W - 10, W, -4, D, 10, 'plaster');         // east of the east alley

// West buildings (x -28 … -12, z -10 … 14) with a covered hallway through them (x -20 … -16) from the
// back yard to the north street, and a side room with a window onto the west street.
block(-W, -20, -10, 14, 9, 'brick');
block(-16, -12, -10, -4, 9, 'brick');
block(-16, -12, 4, 14, 9, 'brick');
wall(true, -10 + 0.25, -20, -16, [[3.4, 'brick']], [door(-18, 2.2, 2.8)]);   // hallway ends
wall(true, 14 - 0.25, -20, -16, [[3.4, 'brick']], [door(-18, 2.2, 2.8)]);
wall(false, -12.25, -4, 4, [[3.4, 'brick']], [[0, 2, 1.0, 2.2]]);            // the side room's window
box(-18, 2, 4, 24, 0.4, 'concrete', 3.4);                                    // ceiling, then the storeys above
box(-14, 0, 4, 8, 0.4, 'concrete', 3.4);
box(-17, 2, 10, 24, 5.2, 'brick', 3.8);
box(-17.2, -6, 1.2, 1.2, 1.2, 'crate');                                      // in the hallway
box(-18.8, 7, 1.2, 2.4, 1.2, 'crate');
box(-13, 2.5, 1.4, 0.7, 0.9, 'floor');                                       // side room: a table

// ---- the warehouse: x -6 … 14, z -10 … 8
const X0 = -6, X1 = 14, Z0 = -10, Z1 = 8, ROOF = 7, MEZZ = 3.6;
const WALL = [[3.2, 'concrete'], [ROOF, 'corrugated']];
decal((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, 'concrete', 0.02);
wall(false, X0, Z0, Z1, WALL, [[-4, 4, 0, 4.2], door(5), strip(1.5)]);       // west: roller door, side door
wall(true, Z0, X0, X1, WALL, [door(0, 1.4), strip(-3), [11.5, 2, 4.6, 5.8]]);  // north (office window)
wall(true, Z1, X0, X1, WALL, [[-4, 3.5, 0, 4], strip(6)]);                    // south: dock door
wall(false, X1, Z0, Z1, WALL, [door(-6), [4, 1.4, MEZZ, MEZZ + 2.4]]);        // east: back door, mezzanine door
// Roof with a hatch over the mezzanine, and a parapet open where the fire escape arrives.
const hole = [10.6, 12.2, -1, 0.6];
for (const [a0, a1, b0, b1] of [[X0 - 0.25, X1 + 0.25, Z0 - 0.25, hole[2]], [X0 - 0.25, X1 + 0.25, hole[3], Z1 + 0.25],
  [X0 - 0.25, hole[0], hole[2], hole[3]], [hole[1], X1 + 0.25, hole[2], hole[3]]]) {
  box((a0 + a1) / 2, (b0 + b1) / 2, a1 - a0, b1 - b0, 0.3, 'concrete', ROOF);
}
const RT = ROOF + 0.3;
box((X0 + X1) / 2, Z0 - 0.1, X1 - X0 + 0.5, 0.3, 0.8, 'concrete', RT);
wall(true, Z1 + 0.1, X0 - 0.25, X1 + 0.25, [[RT + 0.8, 'concrete']], [[10.5, 2, 0, 99]], 0.3, RT);
box(X0 - 0.1, (Z0 + Z1) / 2, 0.3, Z1 - Z0, 0.8, 'concrete', RT);
box(X1 + 0.1, (Z0 + Z1) / 2, 0.3, Z1 - Z0, 0.8, 'concrete', RT);
for (const [x, z] of [[-2, -5], [4, 2], [1, -7.5]]) box(x, z, 1.8, 1.8, 1.2, 'corrugated', RT);   // vents: cover on the roof
box(11.4, -1.5, 2.2, 0.5, 0.9, 'corrugated', RT);

// Mezzanine along the east wall, on columns, railing open at the ramp and the stair.
box(11.4, (Z0 + Z1) / 2, 4.7, Z1 - Z0 - 0.5, 0.3, 'floor', MEZZ - 0.3);
for (const z of [-2, 3]) box(9.25, z, 0.4, 0.4, MEZZ - 0.3, 'corrugated');
wall(false, 9.1, Z0 + 0.25, Z1 - 0.25, [[MEZZ + 1, 'corrugated']], [[-9, 1.6, 0, 99], [6.1, 3.2, 0, 99]], 0.1, MEZZ);
stairs(-1.5, 6.1, '+x', 12, 0.3, 0.88, 3.3);    // ramp along the south wall (x -1.5 … 9)
stairs(3, -9, '+x', 12, 0.3, 0.5, 1.4);          // stair along the north wall (x 3 … 9)
// Storeroom under the mezzanine (x 9 … 14, z -10 … -2): door to the floor, the back door out east.
wall(false, 9.2, -8.3, -2, [[MEZZ - 0.3, 'plaster']], [door(-4.5, 1.4)], 0.2);
wall(true, -2, 9.1, X1 - 0.25, [[MEZZ - 0.3, 'plaster']], [], 0.2);
box(12.6, -8.6, 2, 1.2, 1.8, 'floor');           // shelves
box(10.6, -3, 1.2, 1.2, 1.2, 'crate');
// Office on the mezzanine: glass front over the floor, a door.
wall(false, 10, Z0 + 0.25, -4.5, [[MEZZ + 2.6, 'plaster']], [[-6, 1.2, MEZZ, MEZZ + 2.2], [-8.3, 2, MEZZ + 1, MEZZ + 2.2]], 0.2, MEZZ);
wall(true, -4.5, 10, X1 - 0.25, [[MEZZ + 2.6, 'plaster']], [[12, 2, MEZZ + 1, MEZZ + 2.2]], 0.2, MEZZ);
box(11.9, -7.2, 3.8, 5.6, 0.2, 'plaster', MEZZ + 2.6);
box(12.6, -9.2, 2, 0.8, 0.8, 'floor', MEZZ);     // desk
box(13.3, -6, 0.7, 1.6, 1.8, 'floor', MEZZ);     // cabinets
box(11.2, 1.5, 1.2, 1.2, 1.2, 'crate', MEZZ);    // crates out on the mezzanine

// The floor: two pallet rows with gaps between the stacks.
for (const [z, runs] of [[-5.6, [[-5, -2, 2.4], [-0.5, 3, 1.2], [4.5, 7.5, 3.6]]], [-0.4, [[-4.5, -1.5, 3.6], [0, 3.5, 2.4], [5, 8, 1.2]]]]) {
  for (const [a, b, h] of runs) box((a + b) / 2, z, b - a, 1.2, h, 'crate');
}
box(-3.5, 3.4, 1.2, 2.2, 1.3, 'container_red');  // forklift
box(-3.5, 2.1, 1.0, 0.2, 2.4, 'corrugated');
box(6, 3.2, 1.2, 1.2, 1.2, 'crate');
box(-5, -8.8, 1.2, 1.2, 1.2, 'crate');

// ---- outside the warehouse
// Fire escape up the south wall from the south alley (18 steps), landing at the roof.
stairs(-1, 8.95, '+x', 18, RT / 18, 0.6, 1.4, 'corrugated');
box(10.6, 8.95, 1.6, 1.4, 0.3, 'corrugated', RT - 0.3);   // after the last step
// Mezzanine back door: a landing, then stairs down the east alley to the north.
box(15, 4, 1.4, 1.4, MEZZ, 'concrete');
stairs(15, -4.14, '+z', 12, MEZZ / 12, 0.62, 1.4, 'concrete');
// North street: a van, a dumpster, barriers.
box(-9, -13.2, 4.6, 2, 1.1, 'container_blue', 0.3);
box(-10.8, -13.2, 1.2, 2, 1.0, 'corrugated', 1.4);
box(9, -14.6, 3.2, 1.6, 1.5, 'container_green');
box(3, -12.6, 2.4, 0.6, 1.1, 'concrete');
box(17, -12.4, 0.6, 2.8, 1.1, 'concrete');
// West street: a car at the corner, crates, a barrier.
box(-9, -6.5, 1.9, 4.2, 1.0, 'container_red', 0.25);
box(-9, -6.8, 1.7, 2.2, 0.7, 'concrete', 1.25);
box(-11.2, 6, 1.2, 1.2, 1.2, 'crate');
box(-7.2, 10.5, 2.8, 0.6, 1.1, 'concrete');
// South alley: a dumpster, pallets.
box(-3.5, 10.8, 3, 1.6, 1.5, 'container_green');
// East alley: crates.
box(16.6, -7, 1.2, 1.2, 1.2, 'crate');
box(17.2, 1, 1.2, 2.4, 1.2, 'crate');

// ---- back yard (team A, south-west): a car, crates, a shed
box(-22, 18, 4.4, 1.9, 1.0, 'container_blue', 0.25);
box(-22.2, 18, 2.4, 1.7, 0.7, 'concrete', 1.25);
box(-13, 19.5, 1.2, 1.2, 1.2, 'crate');
box(-4, 17, 2.4, 1.2, 1.2, 'crate');
box(-26, 15.5, 3.6, 2.6, 2.6, 'corrugated');

// ---- loading court (team B, north-east): a truck, pallets
box(24, -20.7, 7, 2.6, 2.8, 'container_red', 0.6);
box(19.6, -20.7, 2.2, 2.4, 2.6, 'corrugated', 0.6);
box(21, -9, 2.4, 1.2, 1.2, 'crate');
box(26.5, -11, 1.2, 1.2, 2.4, 'crate');

const spawnsA = [[-25, 20.5], [-21, 20.5], [-17, 20.5], [-26.5, 17.5], [-17, 17], [-13, 16]].map(([x, z]) => ({ x, z, yaw: -Math.PI / 2 }));
const spawnsB = [[23, -15.5], [26, -15.5], [20, -14.5], [26.5, -13], [23.5, -7], [26.5, -6]].map(([x, z]) => ({ x, z, yaw: Math.PI / 2 }));

export const FREIGHT = {
  id: 'freight',
  name: 'Freight',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  decals,
  props,
  spawns: { A: spawnsA, B: spawnsB },
  // Plant sites for objective mode (attackers from the back yard): the warehouse floor, and the
  // storeroom under the mezzanine.
  sites: [
    { name: 'A', min: [-5, 1], max: [2.5, 5.2] },
    { name: 'B', min: [9.6, -9.5], max: [13.5, -2.5] },
  ],
  sun: { elevation: 62, azimuth: 150 },   // high, so the streets aren't all in shadow
};
