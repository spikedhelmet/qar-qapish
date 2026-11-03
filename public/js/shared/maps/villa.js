// "Villa" — a walled estate around a one-storey house, laid out after the team's schematic.
// x runs west → east, z north → south (meters). From the north:
//   barn (north-west) │ carport where the defenders (team B) start │ a road in from the west gate,
//   with a long walled alley beside the estate │ storehouse in the north-east
//   front lawn │ pool (west) and the house: lounge, dining room, study across the front;
//   back room and bedroom behind; a closed garage annex (south-east)
//   back yard where the attackers (team A) start (south-east).
// Not mirrored: the attackers start right behind the bedroom, the defenders across the road at the front.
import { builder } from './builder.js';

const { boxes, decals, props, box, decal, tree, arena } = builder();

const W = 31, D = 30;
const T = 0.4;   // wall thickness
const H = 3.2;   // house walls

arena(W, D, 8);

// The pool is sunk into the ground, so the ground is four slabs around it instead of one.
const POOL = { x0: -19, x1: -12, z0: 0.5, z1: 13.5, depth: 1.4 };
boxes.shift();
const ground = (x0, x1, z0, z1) => boxes.push({ min: [x0, -1.6, z0], max: [x1, 0, z1], mat: 'asphalt' });
ground(-W - 1, POOL.x0, -D - 1, D + 1);
ground(POOL.x1, W + 1, -D - 1, D + 1);
ground(POOL.x0, POOL.x1, -D - 1, POOL.z0);
ground(POOL.x0, POOL.x1, POOL.z1, D + 1);

// A straight wall with holes: along x at z (wallX) or along z at x (wallZ), from y up `h` meters.
// holes: [center, width, bottom, top] in meters above the wall's base; a door is [center, width]
// (open to 2.6 m), a window win(center): a sill at 0.9 m and open to 2.5 m, big enough to climb through.
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
const wallX = (z, x0, x1, h, mat, holes = [], y = 0) => pieces(x0, x1, y, h, holes, (a, b, yy, hh) => box((a + b) / 2, z, b - a, T, hh, mat, yy));
const wallZ = (x, z0, z1, h, mat, holes = [], y = 0) => pieces(z0, z1, y, h, holes, (a, b, yy, hh) => box(x, (a + b) / 2, T, b - a, hh, mat, yy));
const win = (c, w = 1.6) => [c, w, 0.9, 2.5];
const open = (c, w) => [c, w, 0, 99];
const lawn = (x0, x1, z0, z1) => decal((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 'grass', 0.01);

// ---- ground cover: lawns everywhere but the road, the driveway and the carport (asphalt)
lawn(-W, -22.5, -D, -14.5);                     // alley, north of the road
lawn(-W, -22.5, -8.5, 19.5);                    // alley, south of the road
lawn(-22.5, 0, -D, -14.5);                      // round the barn
lawn(0, 2.5, -17.4, -14.5);
lawn(10, W, -17.4, -8.5);
lawn(12.5, W, -D, -17.4);                       // round the storehouse
lawn(-22.5, W, -8.5, POOL.z0);                  // front lawn …
lawn(-22.5, POOL.x0, POOL.z0, POOL.z1);         // … either side of the pool …
lawn(POOL.x1, W, POOL.z0, POOL.z1);
lawn(-22.5, W, POOL.z1, D);                     // … and the back yard
// pool deck
decal(-15.5, POOL.z0 - 0.5, 9, 1, 'paving', 0.02);
decal(-15.5, POOL.z1 + 0.5, 9, 1, 'paving', 0.02);
decal(POOL.x0 - 0.5, 7, 1, 13, 'paving', 0.02);
decal(POOL.x1 + 0.5, 7, 1, 13, 'paving', 0.02);

// ---- the estate wall between the alley and the grounds: the road gate, and a gap at the far end
wallZ(-22.5, -D, D, 3, 'stone', [open(-11.5, 6), open(16.5, 1.4)]);
box(-26.75, 24.75, 8.5, 10.5, 8, 'concrete');   // the alley ends at the back yard's wall
for (const z of [-14.9, -8.1]) box(-22.5, z, 0.8, 0.8, 1.3, 'container_red'); // barrier posts at the gate
box(-27, -23, 1.2, 1.2, 1.2, 'crate');
box(-25, -4, 1.2, 2.4, 1.2, 'crate');
box(-28.5, 6, 1.4, 1.4, 1.4, 'crate');
box(-24.2, 13, 1.2, 1.2, 1.2, 'crate');

// ---- barn (north-west): two doors and windows onto the yard, a side door onto the gap by the carport
wallZ(-21.5, -D, -18, 3.4, 'floor');
wallZ(-2, -D, -18, 3.4, 'floor', [[-22.5, 1.4]]);
wallX(-18, -21.5, -2, 3.4, 'floor', [win(-19.3), [-16, 2.4], win(-11.5), [-7, 2.4], win(-4)]);
box(-11.75, -24, 20, 12.6, 0.3, 'floor', 3.4);
decal(-11.75, -24, 19.5, 12, 'floor', 0.02);
box(-19, -27.5, 2.4, 2.4, 1.2, 'crate');        // hay bales
box(-19, -27.5, 1.2, 1.2, 1.2, 'crate', 1.2);
box(-11, -28.6, 3.6, 1.6, 1.2, 'crate');
box(-5, -24.5, 1.4, 1.4, 1.4, 'crate');
box(-13, -21.5, 1.2, 1.2, 1.2, 'crate');

// ---- carport (north): defenders' spawn, open to the driveway
for (const [x, z] of [[0.3, -17.7], [6.3, -17.7], [12.2, -17.7], [12.2, -24], [0.3, -24]]) box(x, z, 0.4, 0.4, 3.2, 'floor');
box(6.25, -23.7, 12.9, 12.9, 0.25, 'floor', 3.2);
box(9.5, -25.5, 1.9, 4.4, 1.0, 'container_blue', 0.25);   // a parked car
box(9.5, -25.8, 1.7, 2.4, 0.7, 'concrete', 1.25);

// ---- storehouse (north-east): a corridor along the east side and a front room; the north-west
// corner is a locked store. Doors to the lawn, the yard behind it, and between the two.
const SX0 = 19, SX1 = 30.8, SZ0 = -24.5, SZ1 = -8.5, SH = 3;
wallZ(SX0, -15.5, SZ1, SH, 'stone', [[-12, 1.6]]);
wallX(SZ1, SX0, SX1, SH, 'stone', [win(22), win(28)]);
wallX(SZ0, 25.4, SX1, SH, 'stone', [[28, 1.4]]);
wallZ(25.4, -15.5, SZ1, SH, 'stone', [[-12, 2]]);
box((SX0 + 25.4) / 2, (SZ0 - 15.5) / 2 - 0.2, 25.4 - SX0 + 0.4, -15.5 - SZ0 + 0.4, SH, 'stone'); // the locked store
box((SX0 + SX1) / 2, (SZ0 + SZ1) / 2, SX1 - SX0 + 0.6, SZ1 - SZ0 + 0.6, 0.3, 'concrete', SH);
decal((SX0 + SX1) / 2, (SZ0 + SZ1) / 2, SX1 - SX0, SZ1 - SZ0, 'paving', 0.02);
decal(17.5, -12, 3, 3.6, 'paving', 0.02);       // stone step outside the door
box(29.6, -10.2, 1.2, 1.2, 1.2, 'crate');
box(29.6, -11.4, 1.2, 1.2, 1.2, 'crate');
box(29.7, -17.5, 1, 1.6, 1.4, 'crate');
box(27, -21.5, 1.2, 1.2, 1.2, 'crate');
box(23, -28, 1.2, 2.4, 1.2, 'crate');           // yard behind it

// ---- front lawn
box(-6, -6, 1.2, 1.2, 0.9, 'stone');            // urn
tree(-16, -5, 8); tree(17, -5.5, 7);

// ---- pool: sunk 1.4 m, steps at the south end, a diving board at the north end
const PX = (POOL.x0 + POOL.x1) / 2, PZ = (POOL.z0 + POOL.z1) / 2, PW = POOL.x1 - POOL.x0, PD = POOL.z1 - POOL.z0;
box(PX, PZ, PW, PD, 0.2, 'stone', -POOL.depth - 0.2);
box(PX, POOL.z0 + 0.05, PW, 0.1, POOL.depth, 'stone', -POOL.depth);
box(PX, POOL.z1 - 0.05, PW, 0.1, POOL.depth, 'stone', -POOL.depth);
box(POOL.x0 + 0.05, PZ, 0.1, PD, POOL.depth, 'stone', -POOL.depth);
box(POOL.x1 - 0.05, PZ, 0.1, PD, POOL.depth, 'stone', -POOL.depth);
for (let i = 1; i <= 3; i++) box(POOL.x1 - 1.1, POOL.z1 - 0.1 - i * 0.6 + 0.3, 2, 0.6, POOL.depth - 0.35 * (i - 1) - 0.35, 'stone', -POOL.depth);
decal(PX, PZ, PW, PD, 'water', 0.02, -0.4);
box(-15.5, -0.3, 1, 1.2, 0.5, 'stone');         // diving board
box(-15.5, 1.3, 0.9, 2.6, 0.12, 'floor', 0.5);
box(-21, 4, 0.8, 2, 0.45, 'crate');             // sun loungers
box(-21, 9, 0.8, 2, 0.45, 'crate');

// ---- the house: x -9 … 25, z -3.3 (front) … 19.4 (back)
// front row: lounge (x -9 … 0.2), dining room (… 14.4), study (… 25)
// back row: back room (x -9 … 0.2, to z 13.8), bedroom (x 0.2 … 14.4), garage annex (closed)
const HX0 = -9, HX1 = 25, HZ0 = -3.3, HZ1 = 19.4, MID = 5.4;
decal(8, 5.25, 34, 17.1, 'floor', 0.02);                       // floorboards (not under the corner by the back room)
decal(7.3, 16.6, 14.2, 5.6, 'floor', 0.02);
wallX(HZ0, HX0, HX1, H, 'plaster', [win(-6.5), win(-2.5), win(4), [7.5, 2.2], win(11.5), win(17.5), [21, 1.4]]);
wallZ(HX0, HZ0, 13.8, H, 'plaster', [win(-1), [1.4, 1.6], win(8), win(11.5)]);
wallX(13.8, HX0, 0.2, H, 'plaster', [win(-6.5), [-2.5, 1.4]]);
wallZ(0.2, 13.8, HZ1, H, 'plaster', [win(16.6)]);
wallX(HZ1, 0.2, 14.4, H, 'plaster', [[3.2, 1.6], win(8.5), [12.6, 1.4]]);
wallZ(HX1, HZ0, 4.6, H, 'plaster', [win(-1.2), [2.6, 1.4]]);
// inside
wallZ(0.2, HZ0, MID, H, 'plaster', [[3.3, 3.4]]);              // lounge | dining room: a wide opening
wallZ(0.2, MID, 13.8, H, 'plaster');                          // back room | bedroom
wallX(MID, HX0, 0.2, H, 'plaster', [[-4.6, 1.6]]);             // lounge | back room
wallX(MID, 0.2, 14.4, H, 'plaster', [[3.8, 5]]);               // dining room | bedroom: wide opening
wallZ(14.4, HZ0, 4.6, H, 'plaster', [[2.8, 1.6]]);             // dining room | study
// closed garage annex
box((14.4 + HX1) / 2, (4.6 + HZ1) / 2, HX1 - 14.4 + T, HZ1 - 4.6 + T, H, 'plaster');
box(19.7, HZ1 + 0.22, 6, 0.06, 2.6, 'floor');                  // its (shut) garage door
// roof
box((HX0 + HX1) / 2, (HZ0 + HZ1) / 2, HX1 - HX0 + 0.8, HZ1 - HZ0 + 0.8, 0.3, 'concrete', H);
// furniture
box(-4.5, -2.5, 2.4, 0.9, 0.8, 'crate');         // lounge: sofa, table, fireplace
box(-5, 1.2, 1.4, 0.8, 0.45, 'floor');
box(-8.4, 3.9, 0.8, 1.8, 1.2, 'stone');
box(9.5, -0.6, 2.6, 1.4, 0.8, 'floor');          // dining table and cabinet
box(1.6, -2.7, 1.6, 0.6, 1.0, 'floor');
box(20.5, 0.5, 2.2, 0.9, 0.8, 'floor');         // study: desk, shelves
box(18, 4.1, 3, 0.6, 2.2, 'floor');
box(-8.3, 7.6, 0.7, 0.7, 1.2, 'hedge');          // back room: plant, long cabinet
box(-0.6, 9.5, 0.7, 6, 1.0, 'floor');
box(12.8, 8.6, 2.4, 1.9, 0.6, 'crate');          // bedroom: two beds, boxes along the west wall
box(12.8, 13.2, 2.4, 1.9, 0.6, 'crate');
for (const z of [7, 9.6, 12.2]) box(1.1, z, 1.1, 1.1, 1.1, 'crate');
box(1, 14.5, 1, 1.6, 1.6, 'floor');

// ---- east path and back yard (attackers' spawn)
box(30, -1.4, 1.2, 1.6, 1.2, 'crate');
box(30, 5.4, 1.2, 1.2, 1.2, 'crate');
box(29.8, 15.8, 1.4, 1.4, 1.4, 'crate');
box(19.9, 28.3, 2.6, 3, 1.3, 'crate');
box(19.9, D - 0.1, 9, 0.2, 2.8, 'floor');        // the back gate (shut)
box(6, 24, 2.4, 1.2, 1.2, 'crate');
box(-4, 23, 1.2, 1.2, 1.2, 'crate');
box(-14, 22, 3, 0.8, 1.4, 'hedge');
tree(-17, 26, 8.5); tree(9, 27.5, 6.5); tree(-27, -26, 7.5); tree(-29, 2, 7); tree(15.5, -27.5, 6);

export const VILLA = {
  id: 'villa',
  name: 'Villa',
  bounds: { min: [-W, -2, -D], max: [W, 20, D] },
  boxes,
  decals,
  props,
  spawns: {
    A: [[15.5, 22.5], [18, 22.5], [20.5, 22.5], [23, 22.5], [16.5, 25], [23, 25.5]].map(([x, z]) => ({ x, z, yaw: 0 })),          // back yard
    B: [[2, -27], [4.5, -27], [2, -24], [4.5, -24], [2, -21], [4.5, -21]].map(([x, z]) => ({ x, z, yaw: Math.PI })),           // carport
  },
  // Plant sites for objective mode (attackers come from the back yard): the lounge and the storehouse.
  sites: [
    { name: 'A', min: [-8.6, -2.9], max: [-0.2, 5] },
    { name: 'B', min: [19.4, -15.1], max: [30.4, -8.9] },
  ],
  sun: { elevation: 55, azimuth: 150 },
};
