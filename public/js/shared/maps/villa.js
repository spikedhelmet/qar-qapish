// "Villa" — an original map with one theme: a walled estate around a two-storey house.
// The attackers (team A) start out on the street; the defenders (team B) start by the pool behind the
// house. Not mirrored: each side has its own routes and distances.
//
// Street (z 23 … 30) │ estate wall with a gate, a side door and a collapsed stretch │ front garden
// with a fountain, hedges and a gazebo │ the house (x ±22, z -14 … 6): hall with a grand staircase,
// living room, dining room, library, kitchen; upstairs bedrooms, a gallery and a balcony │ garage and
// garden shed at the sides │ back terrace, lawn and pool (z -30 … -14).
import { builder } from './builder.js';

const { boxes, box, arena } = builder();

const W = 40, D = 30;
const T = 0.4;          // wall thickness
const UP = 3.8;         // upstairs floor height (the slab is 3.5 … 3.8)

arena(W, D, 8);

// A straight wall with holes: along x at z (wallX) or along z at x (wallZ), from y up `h` meters.
// holes: [center, width, bottom, top] in meters above the wall's base; a door is [center, width]
// (open to 2.6 m), a window [center, width, 0.9, 2.4].
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
const wallX = (z, x0, x1, y, h, mat, holes = []) => pieces(x0, x1, y, h, holes, (a, b, yy, hh) => box((a + b) / 2, z, b - a, T, hh, mat, yy));
const wallZ = (x, z0, z1, y, h, mat, holes = []) => pieces(z0, z1, y, h, holes, (a, b, yy, hh) => box(x, (a + b) / 2, T, b - a, hh, mat, yy));
const win = (c, w = 2) => [c, w, 0.9, 2.4];
const tree = (x, z) => { box(x, z, 0.5, 0.5, 2.6, 'floor'); box(x, z, 3, 3, 2.2, 'hedge', 2.6); };
const car = (x, z, mat) => { box(x, z, 4.4, 1.9, 1.0, mat, 0.25); box(x - 0.2, z, 2.4, 1.7, 0.7, 'concrete', 1.25); };

// ---- ground: street, lawns, paths (thin layers on the asphalt, low enough to walk straight over)
box(0, 23.4, 2 * W, 1.6, 0.02, 'paving');                     // pavement along the estate wall
box(0, -4, 2 * W, 52.4, 0.01, 'grass');                        // the estate's lawns
box(0, 14, 6, 16, 0.02, 'paving');                             // driveway …
box(0, 14, 10, 10, 0.022, 'paving');                           // … round the fountain
box(23.5, -4, 3, 20, 0.02, 'paving');                          // side passage by the garage
box(0, -17, 28, 6, 0.02, 'paving');                            // back terrace

// ---- the street (team A)
car(-12, 26, 'container_blue');
car(15, 26.6, 'container_red');
car(31, 25.6, 'container_green');
for (const x of [-24, -9, 12]) box(x, 23.2, 0.25, 0.25, 4.5, 'concrete'); // street lamps
box(-33, 27.5, 3, 1, 1.2, 'concrete');                         // a planter across the street

// ---- estate wall: the gate, a side door and a stretch that has fallen in
wallX(22.2, -W, W, 0, 2.6, 'stone', [[0, 8, 0, 9], [27, 1.6, 0, 9], [-29.5, 3.4, 0, 9]]);
box(-4.4, 22.2, 0.9, 0.9, 3.2, 'stone');                       // gate pillars
box(4.4, 22.2, 0.9, 0.9, 3.2, 'stone');
box(-30.6, 22.6, 1.2, 1.0, 0.6, 'stone');                      // rubble from the collapse
box(-28.6, 21.4, 1.0, 1.2, 0.4, 'stone');

// ---- front garden
box(0, 14, 5, 5, 0.6, 'stone');                                // fountain
box(0, 14, 2.5, 2.5, 0.6, 'stone', 0.6);
box(0, 14, 0.6, 0.6, 1.6, 'stone', 1.2);
box(0, 14, 2.3, 2.3, 0.05, 'water', 1.15);
for (const x of [-6, 6]) box(x, 9, 0.9, 0.9, 1.8, 'stone');      // statues by the porch
box(-14, 12, 12, 0.8, 1.4, 'hedge');
box(-27, 16.5, 10, 0.8, 1.4, 'hedge');
box(-34, 9, 0.8, 8, 1.4, 'hedge');
box(13, 17, 10, 0.8, 1.4, 'hedge');
box(21.5, 11, 0.8, 7, 1.4, 'hedge');
tree(-30, 12); tree(-11, 18.5); tree(16, 9.5); tree(37, 19);
// gazebo
for (const [x, z] of [[29, 8], [35, 8], [29, 14], [35, 14]]) box(x, z, 0.4, 0.4, 3, 'floor');
box(32, 11, 7, 7, 0.3, 'floor', 3);
box(32, 11, 3, 1, 0.8, 'crate');

// ---- the house: x -22 … 22, z -14 (back) … 6 (front)
box(0, -4, 44, 20, 0.025, 'floor');                             // floorboards
// ground floor, outside walls
wallX(6, -22, 22, 0, UP, 'plaster', [win(-18.5), [-13, 1.8], win(-9), [0, 3, 0, 3], win(9.5), win(14), win(18.5)]);
wallX(-14, -22, 22, 0, UP, 'plaster', [win(-19.5), [-15, 1.6], win(-10), win(10), win(13.5, 1.4), [17, 1.6]]);
wallZ(-22, -14, 6, 0, UP, 'plaster', [win(1), win(-9)]);
wallZ(22, -14, 6, 0, UP, 'plaster', [win(1), [-9, 1.6]]);
// ground floor, inside: hall in the middle; living room (front) and dining room west; library and kitchen east
wallZ(-6, -14, 6, 0, UP, 'plaster', [[1, 1.8], [-9, 1.8]]);
wallZ(6, -14, 6, 0, UP, 'plaster', [[1, 1.8], [-9, 1.8]]);
wallX(-4, -22, -6, 0, UP, 'plaster', [[-16, 1.8]]);
wallX(-4, 6, 22, 0, UP, 'plaster', [[14, 1.8]]);
// upstairs floors: both wings and the gallery at the back of the hall (the rest of the hall is open to the roof)
box(-14, -4, 16, 20, 0.3, 'floor', UP - 0.3);
box(14, -4, 16, 20, 0.3, 'floor', UP - 0.3);
box(0, -11.75, 12, 4.5, 0.3, 'floor', UP - 0.3);
box(2, -9.6, 8, 0.15, 1.0, 'floor', UP);                       // gallery railing
// grand staircase up the west side of the hall to the gallery (15 steps)
for (let i = 1; i <= 15; i++) box(-3.75, -1 - (i - 0.5) * (8.5 / 15), 3.5, 8.5 / 15, (UP * i) / 15, 'floor');
// upstairs walls
const UH = 7 - UP;
wallX(6, -22, 22, UP, UH, 'plaster', [win(-18.5), [-13, 1.6], win(-9, 1.6), [0, 6, 0.9, 2.8], win(9.5), win(14), win(18.5)]);
wallX(-14, -22, 22, UP, UH, 'plaster', [win(-18), win(-10), win(0, 3), win(10), win(18)]);
wallZ(-22, -14, 6, UP, UH, 'plaster', [win(-4)]);
wallZ(22, -14, 6, UP, UH, 'plaster', [win(-4), win(3)]);
wallZ(-6, -14, 6, UP, UH, 'plaster', [[-12, 1.6], [-3, 2, 1, 2.4], [3, 2, 1, 2.4]]);   // doors to the gallery,
wallZ(6, -14, 6, UP, UH, 'plaster', [[-12, 1.6], [-3, 2, 1, 2.4], [3, 2, 1, 2.4]]);    // windows over the hall
wallX(-4, -22, -6, UP, UH, 'plaster', [[-10, 1.6]]);
wallX(-4, 6, 22, UP, UH, 'plaster', [[10, 1.6]]);
box(0, -4, 45, 21, 0.4, 'concrete', 7);                        // roof
// balcony off the west bedroom, over the garden, on two pillars
box(-13, 7.5, 9, 2.6, 0.3, 'stone', UP - 0.3);
box(-13, 8.7, 9, 0.2, 1.0, 'stone', UP);
box(-17.4, 7.5, 0.2, 2.6, 1.0, 'stone', UP);
box(-8.6, 7.5, 0.2, 2.6, 1.0, 'stone', UP);
box(-17.2, 8.5, 0.5, 0.5, UP - 0.3, 'stone');
box(-8.8, 8.5, 0.5, 0.5, UP - 0.3, 'stone');
// porch roof over the front door
box(0, 7.5, 7, 2.6, 0.3, 'concrete', 3.4);
box(-3.2, 8.5, 0.5, 0.5, 3.4, 'stone');
box(3.2, 8.5, 0.5, 0.5, 3.4, 'stone');
// furniture
box(-14, 1.5, 3, 1, 0.8, 'crate');                             // living room sofa
box(-19.5, -9, 1, 3, 0.9, 'crate');                            // dining: sideboard …
box(-12, -9, 4, 1.6, 0.8, 'floor');                            // … and table
box(14, 3, 6, 0.6, 2.2, 'floor');                              // library shelves
box(18, -3, 0.6, 2, 2.2, 'floor');
box(11.5, -12.6, 5, 1.2, 0.95, 'stone');                       // kitchen counter
box(10, -8, 1.6, 1.6, 0.95, 'stone');                          // kitchen island
box(-14, 1, 2.2, 2.6, 0.6, 'crate', UP);                       // bed (west bedroom)
box(-16, -10, 1.2, 1.2, 1.2, 'crate', UP);
box(16, 2, 2.2, 2.6, 0.6, 'crate', UP);                        // bed (east bedroom)
box(16, -10, 1.6, 0.8, 1.8, 'floor', UP);                      // wardrobe

// ---- garage (east, behind a passage) and garden shed (west)
wallX(0, 25, 38, 0, 4, 'plaster', [[35.5, 1.4]]);
wallX(-14, 25, 38, 0, 4, 'plaster', [[31.5, 6, 0, 3.2]]);
wallZ(25, -14, 0, 0, 4, 'plaster', [[-6, 1.4]]);
wallZ(38, -14, 0, 0, 4, 'plaster');
box(31.5, -7, 13.4, 14.4, 0.3, 'concrete', 4);
car(30.5, -6, 'container_red');
box(37, -9, 1, 5, 2.2, 'crate');                               // shelving
box(27, -2, 1.2, 1.2, 1.2, 'crate');
wallX(-6, -36, -31, 0, 2.8, 'floor');                          // shed
wallX(-1, -36, -31, 0, 2.8, 'floor');
wallZ(-36, -6, -1, 0, 2.8, 'floor');
wallZ(-31, -6, -1, 0, 2.8, 'floor', [[-3.5, 1.4]]);
box(-33.5, -3.5, 5.4, 5.4, 0.25, 'concrete', 2.8);
tree(-30, -10); tree(-36, 2);

// ---- back: terrace, lawn, pool (team B)
box(-23, -20.25, 14, 0.5, 0.45, 'stone');                      // pool rim
box(-23, -27.75, 14, 0.5, 0.45, 'stone');
box(-29.75, -24, 0.5, 7, 0.45, 'stone');
box(-16.25, -24, 0.5, 7, 0.45, 'stone');
box(-23, -24, 13, 7, 0.15, 'water');
box(-12, -22, 0.8, 2, 0.5, 'crate');                           // sun loungers
box(-12, -25.5, 0.8, 2, 0.5, 'crate');
for (const x of [-13, 13]) box(x, -19.5, 1, 1, 1, 'stone');   // terrace planters
box(4, -17.5, 1.6, 1.6, 0.8, 'floor');                         // terrace table
box(6, -23, 8, 0.8, 1.4, 'hedge');
box(17, -20.5, 0.8, 6, 1.4, 'hedge');
box(29, -22, 6, 0.8, 1.4, 'hedge');
tree(-4, -24); tree(25, -27); tree(36, -18);

export const VILLA = {
  id: 'villa',
  name: 'Villa',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  spawns: {
    A: [-26, -16, -6, 6, 18, 26].map((x, i) => ({ x, z: 27 + (i % 2) * 1.2, yaw: 0 })),          // the street, facing the estate
    B: [[-3, -27], [3, -28], [9, -27], [14, -28], [20, -26], [33, -26]].map(([x, z]) => ({ x, y: 0.01, z, yaw: Math.PI })), // by the pool, facing the house
  },
  // Plant sites for objective mode (attackers come from the street): the living room and the garage.
  sites: [
    { name: 'A', min: [-21.5, -3.5], max: [-6.5, 5.5] },
    { name: 'B', min: [25.5, -13.5], max: [37.5, -0.5] },
  ],
  sun: { elevation: 52, azimuth: 140 },
};
