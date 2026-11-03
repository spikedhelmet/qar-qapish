// "Freight" — an original warehouse-assault map in an industrial street block, built from real model
// kits (public/dev/kits.config.js) on top of plain boxes: building fronts with window frames, glass
// and doors; graffiti fences; crates, barrels, pillars, street lamps; offices from a modular room kit.
//
//   north street (6 m, building fronts along it) ─────────────────────────────┐
//   fenced lot (A) │ west street (8 m) │ WAREHOUSE │ loading yard (B)          │
//   south street (6 m) with a covered arcade along the building fronts ───────┘
//
// The warehouse: a wide opening and a side door on the west, doors north and south, a wide opening on
// the east; crate stacks and barrels on the floor; two offices on a mezzanine along the north wall,
// reached by a stair in the middle and one along the east wall. Not mirrored.
import { builder } from './builder.js';

const { boxes, decals, props, box, decal, piece, arena } = builder();

const W = 35, D = 25;
const T = 0.5;          // warehouse wall thickness

arena(W, D, 11, 'brick');

// ---------------------------------------------------------------- helpers
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
// A wall along x (at z) or along z (at x) in bands [[top, mat], …], with holes [center, width, bottom, top].
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
function stairs(x, z, dir, n, rise, tread, w, mat = 'concrete') {
  const [dx, dz] = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }[dir];
  for (let i = 0; i < n; i++) box(x + dx * (i + 0.5) * tread, z + dz * (i + 0.5) * tread, dx ? tread : w, dz ? tread : w, (i + 1) * rise, mat);
}
const block = (x0, x1, z0, z1, h, mat) => box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, h, mat);

// A building front along x at z, facing +z (out = 1) or -z (-1), from a0 to a1: window frames with
// dark glass on each upper floor and at street level, and old wooden doors (the windows skip them).
function frontX(z, a0, a1, out, { sills = [4.4, 7.6], every = 3.6, doors = [], door = 'oldDark' } = {}) {
  for (let x = a0 + every / 2; x < a1; x += every) {
    const ground = doors.some(d => Math.abs(d - x) < 1.2) ? [] : [1.1];
    for (const sill of [...ground, ...sills]) {
      box(x, z + out * 0.01, 1.2, 0.02, 1.35, 'glass', sill + 0.05);
      piece('room', 'windowFrame', x, z + out * 0.07, 1, sill);
    }
  }
  for (const d of doors) {
    piece('doors', door + 'Frame', d, z + out * 0.075, 1);
    piece('doors', door, d, z + out * 0.105, 1);
  }
}
// A stack of n kit crates.
function stack(x, z, kind, n, rot = 0) {
  const h = { large: 0.7, largeNew: 0.7, small: 0.49, smallNew: 0.49, tall: 1.55, tallNew: 1.55 }[kind];
  for (let i = 0; i < n; i++) piece('crates', kind, x, z, rot, i * h);
}
const barrels = (x, z, kinds) => kinds.forEach((k, i) => piece('barrels', k, x + (i % 2) * 0.62, z + Math.floor(i / 2) * 0.62));

// ---------------------------------------------------------------- the street block
// North buildings (their front along the north street) and south buildings (an arcade in front).
block(-20, W, -D, -19, 11, 'brick');
frontX(-19, -20, W, 1, { doors: [-13.4, 2.8, 17.2, 31.6] });
decal(7.5, -18.25, 55, 1.5, 'paving', 0.02);                      // pavement
block(-20, W, 20.5, D, 10, 'concrete');
frontX(20.5, -20, W, -1, { doors: [-6.2, 12.4, 26.8], door: 'green' });
decal(7.5, 19.5, 55, 2, 'paving', 0.02);
// The arcade: a roof on concrete pillars along the south street's buildings.
for (const x of [-16, -9.6, -3.2, 3.2, 9.6, 16, 22.4, 28.8]) piece('pillars', 'l', x, 18.9);
box(7.5, 19.6, 55, 2.2, 0.35, 'concrete', 3.3);

// ---------------------------------------------------------------- fenced lot (team A, west)
// Graffiti fence along the lot's east side, a gate into the west street; the street mouths stay open.
for (const z of [-11, -7, 1, 5, 9]) piece('fence', z % 2 ? 'panelA' : 'panelB', -20, z, 1);
for (const z of [-13, -9, -5, -1, 3, 7, 11]) piece('fence', 'postConcrete', -20, z);
box(-28, -15, 2.5, 6, 2.6, 'container_green');
box(-28, -15, 2.5, 6, 2.6, 'container_red', 2.6);
stack(-24, 14, 'large', 2, 1); stack(-23.1, 14, 'large', 1, 1);
stack(-32.5, 18, 'tall', 1); stack(-31.7, 18, 'tall', 2);
barrels(-25, -22, ['oil', 'rusty', 'red', 'oil']);
barrels(-33.5, 3, ['hazard', 'blue']);
piece('lamp', 'street', -21.5, -3, 3);
decal(-27.5, 0, 15, 2 * D, 'concrete', 0.015);

// ---------------------------------------------------------------- the warehouse: x -12 … 16, z -13 … 11
const X0 = -12, X1 = 16, Z0 = -13, Z1 = 11, H = 8.5, MEZZ = 4.5;
const WALL = [[3.2, 'concrete'], [H, 'corrugated']];
const strip = c => [c, 3, 5.8, 7.2];
decal((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, 'concrete', 0.02);
const HOLES = {
  west: [[-1.5, 5, 0, 4.5], [7, 1.6, 0, 2.5], strip(-9), strip(5)],     // wide opening, side door
  north: [[4, 1.4, 0, 2.5], strip(-7), strip(11)],                      // door under the mezzanine
  south: [[-6, 1.6, 0, 2.5], [10, 1.6, 0, 2.5], strip(2)],              // two doors
  east: [[6.5, 5, 0, 4.5], [-10, 1.6, 0, 2.5], strip(-2)],              // wide opening, door
};
wall(false, X0, Z0, Z1, WALL, HOLES.west);
wall(true, Z0, X0, X1, WALL, HOLES.north);
wall(true, Z1, X0, X1, WALL, HOLES.south);
wall(false, X1, Z0, Z1, WALL, HOLES.east);
box((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0 + 0.6, Z1 - Z0 + 0.6, 0.4, 'concrete', H);              // roof
// A thin lining inside the walls and under the roof: indoors (dimly lit) while the walls' outside
// faces stay lit like the street.
const IN = T / 2 + 0.03;
wall(false, X0 + IN, Z0 + IN, Z1 - IN, WALL, HOLES.west, 0.06);
wall(true, Z0 + IN, X0 + IN, X1 - IN, WALL, HOLES.north, 0.06);
wall(true, Z1 - IN, X0 + IN, X1 - IN, WALL, HOLES.south, 0.06);
wall(false, X1 - IN, Z0 + IN, Z1 - IN, WALL, HOLES.east, 0.06);
box((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, 0.05, 'concrete', H - 0.05);
for (const [x, z] of [[-4, -4], [6, 3], [11, -9]]) piece('vents', 'tee', x, z, 0, H + 0.4);          // on the roof
for (const [x, z] of [[-6, -1], [6, -1], [-6, 7], [8, 7]]) box(x, z, 1.2, 0.35, 0.12, 'corrugated', 7.75);  // lamp housings

// Mezzanine along the north wall (z -12.75 … -6.75) at 4.5 m, on columns, railing open at both stairs.
box((X0 + X1) / 2, -9.75, X1 - X0 - 0.5, 6, 0.3, 'concrete', MEZZ - 0.3);
for (const x of [-8, -2, 6, 12]) box(x, -6.95, 0.4, 0.4, MEZZ - 0.3, 'concrete');
wall(true, -6.85, X0 + 0.25, X1 - 0.25, [[MEZZ + 1, 'corrugated']], [[1.8, 1.8, 0, 99], [15, 1.7, 0, 99]], 0.1, MEZZ);
stairs(1.8, 1, '-z', 15, 0.3, 0.517, 1.6);          // stair in the middle, up to the north
stairs(15, 2.6, '-z', 15, 0.3, 0.623, 1.5);         // stair along the east wall

// Two offices on the mezzanine, from the room kit (3 m walls in 2 m pieces): front pieces along x at
// z -8.75 (onto the walkway), side pieces along z.
function office(x0, front, sides) {
  front.forEach((p, i) => piece('room', p, x0 + 1 + i * 2, -8.75, 1, MEZZ));
  for (const [x, list] of sides) list.forEach((p, i) => piece('room', p, x, -11.75 + i * 2, 0, MEZZ));
  for (let i = 0; i < 4; i++) for (const z of [-11.75, -9.75]) {
    piece('room', 'floor', x0 + 1 + i * 2, z, 0, MEZZ - 0.1);
    piece('room', 'ceiling', x0 + 1 + i * 2, z, 0, MEZZ + 3);
  }
}
office(-10, ['window', 'doorway', 'window', 'wall2'], [[-10, ['wall2', 'wall2']], [-2, ['window', 'wall2']]]);
office(6, ['wall2', 'window', 'doorway', 'window'], [[6, ['wall2', 'window']], [14, ['wall2', 'wall2']]]);
stack(-8.6, -11.9, 'small', 2); stack(-4, -12, 'large', 1, 1);
stack(12.6, -11.9, 'small', 1); barrels(8, -12.2, ['blue']);

// The floor: rows of crate stacks with gaps between them, barrels.
for (const [x, n] of [[-9.5, 3], [-8.7, 2], [-5.5, 2], [-4.7, 3], [4.5, 2], [5.3, 1], [8.5, 3], [9.3, 2], [12.4, 1]]) stack(x, -3.2, 'large', n);
for (const [x, kind, n] of [[-9, 'tall', 2], [-8.2, 'tall', 1], [-4, 'large', 2], [-3.2, 'large', 1], [5.5, 'tall', 1], [6.3, 'tall', 2], [10.5, 'large', 2]]) stack(x, 4.2, kind, n);
stack(1.8, 3.4, 'large', 2, 1);
barrels(-10.8, 8.6, ['oil', 'rusty', 'oil']);
barrels(13.6, -4.6, ['hazard', 'hazard', 'red']);
barrels(-1.8, -11.6, ['oil', 'open']);

// ---------------------------------------------------------------- west street
piece('lamp', 'street', -13.2, -10, 1);
piece('lamp', 'street', -13.2, 8, 1);
barrels(-18.6, -12, ['rusty', 'crushed']);
stack(-14, 4.5, 'large', 1, 1);
stack(-16.6, -6.5, 'large', 2); stack(-16.6, -5.05, 'large', 1); stack(-17.4, -7.2, 'tall', 1);   // a stack of crates
barrels(-15.8, -8.3, ['oil', 'rusty']);

// ---------------------------------------------------------------- north and south streets
for (const x of [-8, 8, 24]) piece('lamp', 'street', x, -17.8, 0);
for (const x of [-12, 4, 20]) piece('lamp', 'street', x, 17.2, 2);
stack(0, -16.2, 'large', 2, 1); stack(1.5, -16.2, 'large', 2, 1); stack(3, -16.2, 'large', 1, 1);   // pallets half across the north street
stack(0.6, -15.4, 'tall', 1); barrels(3.6, -15.6, ['red', 'oil']);
stack(20, -17, 'tall', 2); stack(20.8, -17, 'tall', 1);
box(-3, 14.4, 2.4, 1.2, 1.4, 'container_green');            // dumpsters by the south doors
box(13, 14.8, 2.4, 1.2, 1.4, 'container_green');
barrels(-17, 15, ['oil', 'oil']);

// ---------------------------------------------------------------- loading yard (team B, east)
piece('fort', 'wall', 21.5, -4, 1);                        // a long concrete wall: cover in the yard
decal(25.5, -1, 19, 36, 'concrete', 0.015);
box(30, -13.5, 7, 2.6, 2.6, 'container_red');              // a shipping container
stack(26, -13, 'tall', 2); stack(26.8, -13, 'tall', 1);
stack(27, 9, 'large', 2, 1); stack(27.9, 9, 'large', 1, 1); stack(31, 12, 'tall', 2);
barrels(18, 13, ['blue', 'blue', 'hazard']);
piece('lamp', 'street', 33.5, 0, 3);

const spawnsA = [[-31, -6], [-31, -2], [-31, 2], [-31, 6], [-27, -4], [-27, 4]].map(([x, z]) => ({ x, z, yaw: -Math.PI / 2 }));
const spawnsB = [[31, -6], [31, -2], [31, 2], [31, 6], [27.5, -6.5], [27.5, 5.5]].map(([x, z]) => ({ x, z, yaw: Math.PI / 2 }));

export const FREIGHT = {
  id: 'freight',
  name: 'Freight',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  decals,
  props,
  spawns: { A: spawnsA, B: spawnsB },
  // Plant sites for objective mode (attackers from the lot): the warehouse floor, and the walkway in
  // front of the offices.
  sites: [
    { name: 'A', min: [-11, -1.5], max: [0, 2.5] },
    { name: 'B', min: [-2, -8.6], max: [6, -7], y: MEZZ },
  ],
  sun: { elevation: 58, azimuth: 150 },
  // Inside the warehouse (inside its walls) the sky light is dim; lamps hang under the roof and in
  // the offices.
  interiors: [[X0 + 0.25, -1, Z0 + 0.25, X1 - 0.25, H, Z1 - 0.25]],
  indoorAmbient: 0.12,
  hemi: 0.3,
  lights: [[-6, 7.6, -1, 40, 16], [6, 7.6, -1, 40, 16], [-6, 7.6, 7, 40, 16], [8, 7.6, 7, 40, 16], [-6, 7.2, -10.75, 15, 7], [10, 7.2, -10.75, 15, 7]],
};
