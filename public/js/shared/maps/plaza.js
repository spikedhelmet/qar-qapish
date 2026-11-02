// "Plaza" — drawn by the team: a walled, paved plaza in the middle with a raised, roofed pavilion at
// each end; each team spawns behind a wall, crosses a band of cover and reaches the plaza through a
// covered passage, or climbs stairs up into a pavilion. Mirrored north/south (team A north) and
// east/west, so both teams have the same routes to both pavilions.
import { builder } from './builder.js';

const { boxes, box } = builder();

const W = 40, D = 28;       // half extents of the playable area
const H = 2.2;              // pavilion floor: too high to climb, so the stairs matter

// Copies mirrored east/west, north/south, or into all four quarters.
const ew = (x, z, sx, sz, h, mat, y = 0) => { box(x, z, sx, sz, h, mat, y); box(-x, z, sx, sz, h, mat, y); };
const ns = (x, z, sx, sz, h, mat, y = 0) => { box(x, z, sx, sz, h, mat, y); box(x, -z, sx, sz, h, mat, y); };
const all = (x, z, sx, sz, h, mat, y = 0) => { ew(x, z, sx, sz, h, mat, y); ew(x, -z, sx, sz, h, mat, y); };

// Ground and outer walls
boxes.push({ min: [-W - 1, -1, -D - 1], max: [W + 1, 0, D + 1], mat: 'asphalt' });
box(0, -D - 0.5, 2 * W + 2, 1, 8, 'concrete');
box(0, D + 0.5, 2 * W + 2, 1, 8, 'concrete');
box(-W - 0.5, 0, 1, 2 * D, 8, 'concrete');
box(W + 0.5, 0, 1, 2 * D, 8, 'concrete');

// ---- the plaza: x ±23, z ±8.7, paved, walled (3 m) on the long sides
box(0, 0, 46, 17.4, 0.02, 'paving');
all(13.15, 8.7, 19.7, 0.6, 3, 'stone');

// Covered passages from each team's band into the plaza (the gap in the plaza wall).
all(3.3, 11.6, 0.6, 5.8, 3, 'stone');
ns(0, 11.6, 7.2, 5.8, 0.3, 'concrete', 3);

// ---- each team's side (south half shown; mirrored north)
// Wall between the band of cover and the lane, open at the passage.
all(15.25, 14.5, 23.9, 0.6, 3, 'stone');
// Short walls closing the band's ends off from the stairs.
all(27.2, 16.9, 0.6, 4.8, 3, 'stone');
// Spawn wall with a doorway near each end.
ns(0, 23.1, 54, 0.6, 3, 'concrete');
all(36.75, 23.1, 6.5, 0.6, 3, 'concrete');

// ---- pavilions: x 23 … 40, z ±9.6, floor at H, roof at 5 m
ew(31.5, 0, 17, 19.2, H, 'stone');
ew(31.5, 0, 17, 19.2, 0.3, 'concrete', 5);
// Side walls (north and south), with a doorway at the top of the lane stairs.
all(26.25, 9.35, 6.5, 0.5, 2.8, 'plaster', H);
all(38.25, 9.35, 3.5, 0.5, 2.8, 'plaster', H);
// Plaza side: a half wall with a window band above it and a doorway in the middle.
all(23.25, 5.8, 0.5, 7.6, 1.0, 'plaster', H);
ew(23.25, 0, 0.5, 19.2, 0.6, 'plaster', H + 2.2);
all(23.25, 2.3, 0.5, 0.6, 1.2, 'plaster', H + 1.0);

// Stairs: from each lane up into the pavilion (8 steps of 0.275 m, 0.6 m deep) …
for (let i = 1; i <= 8; i++) all(33, 14.5 - (i - 1) * 0.6 - 0.3, 6, 0.6, H * i / 8, 'concrete');
// … and from the plaza up through the doorway.
for (let i = 1; i <= 8; i++) ew(23 - (8 - i) * 0.6 - 0.3, 0, 0.6, 4, H * i / 8, 'concrete');

// ---- cover
// Bands
all(20, 18.5, 1.4, 1.4, 1.4, 'crate');
all(9, 16.6, 1.2, 1.2, 1.2, 'crate');
ns(0, 19, 4, 0.6, 1.2, 'concrete');
all(14, 20.5, 0.6, 3, 1.2, 'concrete');
// Spawn strips: a little cover by each doorway
all(25, 25.5, 1.2, 1.2, 1.2, 'crate');
// Lanes
all(12, 11.6, 1.2, 1.2, 1.2, 'crate');
all(18.5, 12.6, 3, 0.6, 1.2, 'concrete');
// Plaza: a fountain in the middle, crates and low walls around it
box(0, 0, 6, 6, 0.6, 'stone');
box(0, 0, 3, 3, 0.6, 'stone', 0.6);
box(0, 0, 1, 1, 1.8, 'stone', 1.2);
all(13, 4.5, 1.5, 1.5, 1.5, 'crate');
ew(8.5, 0, 0.6, 4, 1.2, 'concrete');
all(4.5, 5.6, 1.1, 1.1, 1.0, 'crate');
// Pavilions
ew(31.5, 0, 1.5, 1.5, 1.5, 'crate', H);
all(37, 5, 1.2, 1.2, 1.2, 'crate', H);
all(27.5, 6.2, 2.5, 0.6, 1.2, 'concrete', H);

// Spawns behind each spawn wall, facing the middle.
const spawnsFor = side => [-37, -20, -7, 7, 20, 37].map(x => ({ x, z: side * 25.5, yaw: side < 0 ? Math.PI : 0 }));

export const PLAZA = {
  id: 'plaza',
  name: 'Plaza',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  spawns: { A: spawnsFor(-1), B: spawnsFor(1) },
  // Plant sites for objective mode: inside the two pavilions (y: their floor).
  sites: [
    { name: 'A', min: [-39, -8.5], max: [-24, 8.5], y: H },
    { name: 'B', min: [24, -8.5], max: [39, 8.5], y: H },
  ],
  sun: { elevation: 42, azimuth: 205 },
};
