// "Freight" — a riverside cold-storage depot at the edge of a town (original layout, 90 × 64 m). Every
// area has a job, so the place reads as somewhere people work:
//
//   rail spur with freight wagons along the north, the loading dock on it
//   town square (A) │ cannery lane │ COLD STORE │ truck yard (B), with a water tower
//   back alley along the store's south side
//   south row: canteen with flats above │ side yard │ boiler house with its chimney │ scrapyard
//
// The cold store: dock doors into three cold rooms, a dim main floor, offices on a mezzanine, and a
// pipe catwalk over the back alley to the gantry in the boiler house. Attackers have one main route
// (the lane to the west doors) and two flanks: north along the dock, south down the back alley.
import { builder } from './builder.js';

const { boxes, decals, props, box, decal, tree, bush, piece, cyl, sign, arena } = builder();

const W = 45, D = 32;
const T = 0.5;          // building wall thickness
const M = 4.5;          // mezzanine, catwalk and gantry height

arena(W, D, 12, 'brick');

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
// A wall along x (at z) or along z (at x) in bands [[top, mat], …], holes [center, width, bottom, top].
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
const door = (c, w = 1.6, h = 2.5) => [c, w, 0, h];
const win = (c, w = 1.6) => [c, w, 1, 2.3];
// A roofed building: walls with holes { n, s, e, w }, a thin lining inside them and under the roof (so
// the inside can be dim while the outside faces stay lit), and its inside marked as indoors.
const interiors = [];
function building(x0, x1, z0, z1, h, bands, holes, roofMat = 'concrete') {
  wall(false, x0, z0, z1, bands, holes.w || []);
  wall(false, x1, z0, z1, bands, holes.e || []);
  wall(true, z0, x0, x1, bands, holes.n || []);
  wall(true, z1, x0, x1, bands, holes.s || []);
  box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 0.6, z1 - z0 + 0.6, 0.4, roofMat, h);
  const IN = T / 2 + 0.03;
  wall(false, x0 + IN, z0 + IN, z1 - IN, bands, holes.w || [], 0.06);
  wall(false, x1 - IN, z0 + IN, z1 - IN, bands, holes.e || [], 0.06);
  wall(true, z0 + IN, x0 + IN, x1 - IN, bands, holes.n || [], 0.06);
  wall(true, z1 - IN, x0 + IN, x1 - IN, bands, holes.s || [], 0.06);
  box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0.05, 'concrete', h - 0.05);
  interiors.push([x0 + 0.25, -1, z0 + 0.25, x1 - 0.25, h, z1 - 0.25]);
}
// A building front: window frames with dark glass, floor by floor, and doors at street level. Along x
// at z facing +z (out = 1) or -z (-1), or along z at x facing +x / -x.
function front(alongX, at, a0, a1, out, { sills = [4.4, 7.6], every = 3.4, doors = [], door: kind = 'oldDark', ground = true } = {}) {
  const r = alongX ? 1 : 0;
  const pos = (c, d) => (alongX ? [c, at + out * d] : [at + out * d, c]);
  for (let c = a0 + every / 2; c < a1 - 0.8; c += every) {
    const street = ground && !doors.some(d => Math.abs(d - c) < 1.2) ? [1.1] : [];
    for (const sill of [...street, ...sills]) {
      const [gx, gz] = pos(c, 0.01);
      decal(gx, gz, alongX ? 1.2 : 0.02, alongX ? 0.02 : 1.2, 'glass', 1.35, sill + 0.05);   // flat on the wall: not solid
      const [fx, fz] = pos(c, 0.07);
      piece('room', 'windowFrame', fx, fz, r, sill);
    }
  }
  for (const d of doors) {
    const [fx, fz] = pos(d, 0.075), [lx, lz] = pos(d, 0.105);
    piece('doors', kind + 'Frame', fx, fz, r);
    piece('doors', kind, lx, lz, r);
  }
}
function stack(x, z, kind, n, rot = 0, y = 0) {
  const h = { large: 0.7, largeNew: 0.7, small: 0.49, smallNew: 0.49, tall: 1.55, tallNew: 1.55 }[kind];
  for (let i = 0; i < n; i++) piece('crates', kind, x, z, rot, y + i * h);
}
const barrels = (x, z, kinds, y = 0) => kinds.forEach((k, i) => piece('barrels', k, x + (i % 2) * 0.62, z + Math.floor(i / 2) * 0.62, 0, y));

// ---------------------------------------------------------------- ground
decal(0, -27.5, 2 * W, 9, 'ballast', 0.012);            // rail spur
decal(-36, 4.5, 18, 55, 'cobble', 0.012);               // town square
decal(31, -4.5, 28, 37, 'concrete', 0.012);             // truck yard
decal(37, 23, 16, 18, 'dirt', 0.012);                   // scrapyard
decal(-14.2, -3, 2.4, 30, 'paving', 0.02);              // pavement along the store
decal(-13, 17, 24, 1.6, 'paving', 0.02);                // … and the canteen
for (const z of [-29, -25.6]) {                         // two tracks
  decal(0, z - 0.75, 2 * W, 0.1, 'corrugated', 0.09);
  decal(0, z + 0.75, 2 * W, 0.1, 'corrugated', 0.09);
  for (let x = -W + 0.5; x < W; x += 1.1) decal(x, z, 0.3, 2.5, 'floor', 0.06);
}

// ---------------------------------------------------------------- rail spur: wagons you can climb or go around
function wagon(x, z, mat, full = true) {
  box(x, z, 12.5, 2.7, 1.1, 'rust');
  if (full) box(x, z, 11.8, 2.45, 2.6, mat, 1.1);
}
wagon(-26, -29, 'container_blue');
wagon(-4, -29, 'container_red');
wagon(30, -29, 'container_green');
wagon(-33, -25.6, 'container_green', false);
stack(-34, -25.6, 'large', 2, 1, 1.1); stack(-30.6, -25.2, 'tall', 1, 0, 1.1);
wagon(12, -25.6, 'container_red');

// ---------------------------------------------------------------- town square (team A): the town's edge
// Shop fronts of different heights along the west side.
for (const [z0, z1, h, mat, doors, kind, name] of [
  [-23, -8, 14, 'plaster', [-14.4], 'green', 'PHARMACY'],
  [-8, 6, 11, 'brick', [-0.2], 'oldDark', 'BAKERY'],
  [6, 20, 15, 'concrete', [12.8], 'oldWhite', 'HOTEL'],
  [20, 30.5, 12, 'plaster', [26], 'oldDark', 'BARBER'],
]) {
  box(-44.25, (z0 + z1) / 2, 1.5, z1 - z0, h, mat);
  front(false, -43.5, z0, z1, 1, { doors, door: kind, sills: h > 12 ? [4.4, 7.6, 10.8] : [4.4, 7.6] });
  sign(-43.43, 3.3, (z0 + z1) / 2, 6, 0.8, 1, name);
}
box(-35, 31.25, 20, 1.5, 11, 'brick');
front(true, 30.5, -45, -25, -1, { doors: [-36], door: 'green' });
// Market stalls: a counter under a striped awning.
function stall(x, z) {
  for (const [dx, dz] of [[-1.6, -0.9], [1.6, -0.9], [-1.6, 0.9], [1.6, 0.9]]) box(x + dx, z + dz, 0.1, 0.1, 2.4, 'floor');
  box(x, z, 3.5, 2.2, 0.08, 'awning', 2.4);
  box(x, z + 0.4, 3.2, 0.8, 0.9, 'floor');
  stack(x - 0.9, z + 0.4, 'small', 1, 1, 0.9);
  stack(x + 0.7, z + 0.4, 'smallNew', 1, 1, 0.9);
}
for (const [x, z] of [[-38.5, -16], [-33.5, -16], [-38.5, 13], [-33.5, 13], [-31, -7]]) stall(x, z);
// Kiosk and bus stop.
box(-30, -20.5, 3, 3, 2.8, 'plaster');
box(-30, -20.5, 3.8, 3.8, 0.15, 'concrete', 2.8);
box(-30, -18.99, 2.2, 0.02, 1.1, 'glass', 1.1);
sign(-30, 2.5, -18.96, 2.6, 0.45, 0, 'KIOSK', { bg: '#7a2a22' });
box(-30.5, 25.5, 5, 0.1, 2.3, 'glass');
box(-30.5, 24.6, 5.4, 2.1, 0.12, 'corrugated', 2.4);
for (const x of [-33, -28]) box(x, 25.5, 0.12, 0.12, 2.4, 'corrugated');
box(-30.5, 25.1, 3.4, 0.45, 0.45, 'floor');
tree(-41, -20, 8); tree(-41, 21, 8.5); tree(-29, 19, 6.5);
bush(-37, 27, 1.5); bush(-41.5, 17, 1.2);
piece('lamp', 'street', -35.5, -21, 0);
piece('lamp', 'street', -35.5, 22, 2);
barrels(-28.8, 4, ['oil', 'blue']);

// A graffiti fence between the square and the lane, with gaps: the square's edge, and cover for the spawn.
for (const z of [-21, -17, -13, -5, -1, 9, 13]) piece('fence', z % 4 === 1 || z % 4 === -3 ? 'panelA' : 'panelB', -27, z, 1);
for (const z of [-23, -19, -15, -11, -7, -3, 1, 7, 11, 15]) piece('fence', 'postConcrete', -27, z);

// ---------------------------------------------------------------- the cold store: x -13 … 17, z -18 … 12
const X0 = -13, X1 = 17, Z0 = -18, Z1 = 12, H = 8.5;
const strip = c => [c, 3, 5.8, 7.2];
decal(2, -3, X1 - X0, Z1 - Z0, 'concrete', 0.02);
building(X0, X1, Z0, Z1, H, [[3.2, 'concrete'], [H, 'corrugated']], {
  w: [[2, 5, 0, 4.5], door(-8), strip(-13 + 4), strip(9)],            // wide doors onto the lane, a side door
  n: [[-8, 3, 1.2, 3.3], [12, 3, 1.2, 3.3], strip(2)],                // dock doors, into the cold rooms
  s: [door(-6), [12, 1.4, M, M + 2.4], strip(4), strip(-8)],          // alley door, catwalk door
  e: [[-1, 4, 0, 4.2], door(8.6)],                                     // onto the truck yard
});
sign(X0 - 0.05, 5.4, 2, 7, 1, 3, 'COLD STORE 3', { bg: '#1f3a4a' });
// Cold rooms along the north wall: three white rooms, doors south to the floor and between them.
const COLD = [[3.4, 'plaster']];
wall(true, -11.75, X0 + 0.25, X1 - 0.25, COLD, [door(-8), door(2), door(12)]);
wall(false, -2.75, -17.75, -11.75, COLD, [door(-14.5, 1.4)], 0.3);
wall(false, 7.25, -17.75, -11.75, COLD, [door(-14.5, 1.4)], 0.3);
box(2, -14.75, X1 - X0 - 0.5, 6.1, 0.25, 'plaster', 3.4);
for (const x of [-8, 12]) stairs(x, -15.7, '-z', 4, 0.3, 0.5, 3);    // steps down from the dock doors
for (const [x, z, k, n] of [[-12, -13, 'tall', 2], [-4, -17, 'large', 3], [-3.9, -12.8, 'small', 2], [6.2, -13, 'tall', 2], [-1.6, -17, 'large', 2], [0.4, -17, 'tall', 1], [4.6, -17, 'large', 3], [15.8, -13, 'tall', 2], [15.8, -17, 'large', 2]]) stack(x, z, k, n);

// Mezzanine along the east wall, on columns; stairs along the cold rooms and the south wall.
box(12.4, 0.1, 8.7, 23.3, 0.3, 'concrete', M - 0.3);
for (const z of [-6, 0, 6]) box(8.25, z, 0.4, 0.4, M - 0.3, 'concrete');
wall(false, 8.1, -11.5, 11.7, [[M + 1, 'corrugated']], [[-10.6, 1.8, 0, 99], [10.9, 1.8, 0, 99]], 0.1, M);
stairs(-1, -10.6, '+x', 15, 0.3, 0.6, 1.6);
stairs(-1, 10.9, '+x', 15, 0.3, 0.6, 1.6);
// Two offices on it, from the room kit.
function office(z0, front3) {
  front3.forEach((p, i) => piece('room', p, 10, z0 + 1 + i * 2, 0, M));
  for (let i = 0; i < 3; i++) {
    piece('room', 'wall2', 16, z0 + 1 + i * 2, 0, M);
    piece('room', 'wall2', 11 + i * 2, z0, 1, M);
    piece('room', 'wall2', 11 + i * 2, z0 + 6, 1, M);
    for (let k = 0; k < 3; k++) {
      piece('room', 'floor', 11 + i * 2, z0 + 1 + k * 2, 0, M - 0.1);
      piece('room', 'ceiling', 11 + i * 2, z0 + 1 + k * 2, 0, M + 3);
    }
  }
}
office(-8, ['window', 'doorway', 'window']);
office(2, ['window', 'doorway', 'window']);
stack(14.8, -6.8, 'small', 2); stack(11.4, -2.8, 'large', 1, 1, M); stack(14.6, 3, 'tall', 1, 0, M); barrels(11, 7, ['blue'], M);

// The main floor: pallet rows with gaps, barrels by the walls.
for (const [x, n] of [[-10.5, 3], [-9.7, 2], [-6, 2], [-5.2, 3], [-1, 2], [-0.2, 1], [3.5, 3], [4.3, 2]]) stack(x, -6.4, 'large', n);
for (const [x, k, n] of [[-10, 'tall', 2], [-9.2, 'tall', 1], [-5, 'large', 2], [-4.2, 'large', 1], [0, 'tall', 1], [0.8, 'tall', 2], [4.6, 'large', 2]]) stack(x, 6.4, k, n);
stack(2, 0.2, 'large', 3, 1); stack(2, -1.4, 'tall', 2);
barrels(-12, 9.4, ['oil', 'rusty', 'oil']);
barrels(6.4, -9, ['hazard', 'red']);

// The loading dock along the north wall, raised 1.2 m, under a canopy; steps at both ends.
box(2, -20.5, X1 - X0, 5, 1.2, 'concrete');
stairs(-15, -20.5, '+x', 4, 0.3, 0.5, 5);
stairs(19, -20.5, '-x', 4, 0.3, 0.5, 5);
box(2, -20.8, X1 - X0, 4.6, 0.25, 'corrugated', 4.5);
for (const x of [-10, 2, 14]) piece('pillars', 'm', x, -22.6, 0, 1.2);
stack(-3, -20, 'large', 2, 1, 1.2); stack(-1.3, -20.4, 'large', 3, 1, 1.2); stack(6, -19.4, 'tall', 2, 0, 1.2);
barrels(-11.5, -20.8, ['oil', 'oil'], 1.2);
barrels(15.4, -22, ['blue'], 1.2);
sign(2, 3.9, -18.3, 6, 0.7, 2, 'LOADING DOCK B');

// ---------------------------------------------------------------- cannery lane
piece('lamp', 'street', -14, -13, 3);
piece('lamp', 'street', -14, 9, 3);
stack(-20, -9, 'large', 2); stack(-19.2, -9.2, 'tall', 1); stack(-20, -7.6, 'large', 1, 1);
barrels(-25.2, -3.6, ['rusty', 'crushed', 'oil']);
stack(-17, 8, 'tall', 2); stack(-16.2, 8.2, 'large', 2);
box(-21.5, 12.6, 3, 1.5, 1.4, 'container_green');          // a dumpster

// ---------------------------------------------------------------- back alley and the pipe catwalk
box(12, 15, 1.6, 6.5, 0.15, 'corrugated', M - 0.15);
for (const x of [11.25, 12.75]) box(x, 15, 0.08, 6.5, 1, 'corrugated', M);
box(10.6, 15, 0.5, 6.6, 0.5, 'rust', M + 0.8);              // pipes alongside it
box(13.4, 15, 0.35, 6.6, 0.35, 'rust', M + 1.4);
barrels(2.6, 13, ['oil', 'rusty']);
stack(-5, 15.4, 'large', 1, 1);
piece('lamp', 'street', 22, 16.8, 2);

// ---------------------------------------------------------------- canteen, with flats above
const C0 = -25, C1 = -1, C2 = 18, C3 = 32, CH = 3.8;
building(C0, C1, C2, C3 - 1.5, CH, [[CH, 'plaster']], {
  n: [door(-20), win(-16), win(-12.5), door(-9), win(-5.5)],
  w: [door(24)],
  e: [door(24)],
});
box((C0 + C1) / 2, (C2 + C3 - 1.5) / 2, C1 - C0 + 0.6, C3 - C2 - 0.9, 3.6, 'brick', CH + 0.4);  // flats above
front(true, C2 - 0.3, C0, C1, -1, { sills: [5], ground: false });
sign(-14.5, 3.15, C2 - 0.28, 7, 0.75, 2, 'WORKERS CANTEEN', { bg: '#6b2d1e' });
box(-13, 27.6, 10, 0.8, 1, 'floor');                         // the counter
for (const [x, z] of [[-22, 21], [-22, 25], [-17, 21.6], [-17, 25], [-11, 21], [-7, 21], [-5.5, 25]]) box(x, z, 1.5, 0.8, 0.75, 'floor');
barrels(-23.4, 29, ['open']);
stack(-4, 29, 'small', 2);

// ---------------------------------------------------------------- side yard
barrels(0.4, 28, ['rusty', 'oil', 'crushed']);
box(2.6, 23, 1.6, 3, 1.5, 'container_green');

// ---------------------------------------------------------------- boiler house, with its chimney
building(5, 29, 18, 32, 7, [[3.2, 'brick'], [7, 'corrugated']], {
  n: [door(20), [12, 1.4, M, M + 2.4]],
  w: [door(25)],
  e: [door(23.6)],
}, 'corrugated');
sign(23.5, 3, 17.7, 5, 0.7, 2, 'BOILER HOUSE');
// The gantry from the catwalk, and stairs down; two boilers.
box(12, 21.2, 3, 5.9, 0.25, 'corrugated', M - 0.25);
for (const x of [10.55, 13.45]) box(x, 21.2, 0.08, 5.9, 1, 'corrugated', M);
stairs(12, 31.7, '-z', 15, 0.3, 0.5, 2.2, 'corrugated');
for (const [x, z] of [[19, 27], [24, 27]]) {
  cyl(x, z, 2, 3.8, 'rust', { rTop: 2 });
  box(x, z, 0.5, 8, 0.5, 'rust', 3.6);
}
stack(7, 20, 'tall', 2); barrels(7, 29, ['rusty', 'oil']);
cyl(26, 21, 1.5, 22, 'brick', { rTop: 1.05 });               // the chimney

// ---------------------------------------------------------------- scrapyard
for (const x of [31, 41]) piece('fence', 'panelB', x, 14);
piece('fence', 'panelA', 44, 14);
for (const [x, z, rot] of [[34, 20, 0], [40, 18, 1], [38, 27, 0]]) box(x, z, rot ? 2.5 : 6, rot ? 6 : 2.5, 2.6, 'rust');
box(38.4, 27, 5, 2.4, 2.4, 'rust', 2.6);
box(32, 28, 3, 2, 1.4, 'rust');
box(43, 26, 2.4, 3, 1.8, 'container_red');
barrels(31, 17, ['crushed', 'rusty', 'crushed', 'open']);
stack(42.4, 21, 'large', 2); stack(36, 23.4, 'tall', 1);

// ---------------------------------------------------------------- truck yard (team B)
// Water tower: the landmark you can see from everywhere.
for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) box(36 + x, -14 + z, 0.35, 0.35, 10, 'rust');
box(36, -14, 4.6, 0.2, 0.2, 'rust', 5); box(36, -14, 0.2, 4.6, 0.2, 'rust', 5);
cyl(36, -14, 3.3, 3.6, 'corrugated', { y: 10, solid: false });
cyl(36, -14, 3.5, 1.3, 'rust', { y: 13.6, rTop: 0.2, solid: false });
// Weighbridge and its hut.
decal(26, 0, 4, 9, 'corrugated', 0.05);
box(30.5, 0, 3, 4, 2.8, 'plaster');
box(30.5, 0, 3.8, 4.8, 0.15, 'concrete', 2.8);
box(28.99, 0, 0.02, 2.6, 1.1, 'glass', 1.1);
sign(28.96, 2.45, 0, 2.6, 0.4, 3, 'WEIGHBRIDGE');
// Parked trailers and pallets.
box(22, -13, 2.6, 10, 2.8, 'container_blue', 0.9); box(22, -13, 2.2, 8, 0.9, 'rust');
box(41, 9, 10, 2.6, 2.8, 'container_red', 0.9); box(41, 9, 8, 2.2, 0.9, 'rust');
piece('fort', 'wall', 24, 8.2, 1);
stack(31, 9, 'large', 2, 1); stack(32.7, 9.3, 'large', 1, 1); stack(21, 3, 'tall', 2); stack(21.8, 3.2, 'large', 2);
barrels(42.4, -21, ['blue', 'blue', 'hazard']);
piece('lamp', 'street', 18.6, -5, 1);
piece('lamp', 'street', 34, -20.4, 0);

const spawnsA = [[-41, -8], [-41, -4], [-41, 0], [-41, 4], [-37, -5], [-37, 2]].map(([x, z]) => ({ x, z, yaw: -Math.PI / 2 }));
const spawnsB = [[40, -8], [40, -4], [40, 0], [40, 4], [36, -6], [36, 3]].map(([x, z]) => ({ x, z, yaw: Math.PI / 2 }));

export const FREIGHT = {
  id: 'freight',
  name: 'Freight',
  bounds: { min: [-W, 0, -D], max: [W, 26, D] },
  boxes,
  decals,
  props,
  spawns: { A: spawnsA, B: spawnsB },
  // Plant sites for objective mode (attackers from the square): the main floor and the middle cold room.
  sites: [
    { name: 'A', min: [-12, -4.6], max: [-3, 4.6] },
    { name: 'B', min: [-2.4, -16], max: [6.9, -12] },
  ],
  sun: { elevation: 52, azimuth: 150 },
  interiors,
  ambient: 0.75,
  indoorAmbient: 0.12,
  hemi: 0.35,
  lights: [
    [-8, 7.6, 0, 40, 16], [2, 7.6, 3, 40, 16], [-3, 7.6, -8, 26, 12], [12, 3.6, -3, 16, 9],   // main floor
    [-8, 3.2, -15, 12, 7, 0xcfe4ff], [2, 3.2, -15, 12, 7, 0xcfe4ff], [12, 3.2, -15, 12, 7, 0xcfe4ff], // cold rooms
    [13, 7.2, -5, 14, 7], [13, 7.2, 5, 14, 7],                                                  // offices
    [-18, 3.4, 24, 14, 12], [-8, 3.4, 24, 14, 12],                                              // canteen
    [20, 6, 25, 26, 13, 0xffb070],                                                               // boiler house
  ],
};
