// "Depot" — an original, tighter map: a roofed hall in the middle, a raised loading dock along the
// north wall and a rail yard of parked wagons to the south. Mirrored left/right like Yard.
import { builder } from './builder.js';

const { boxes, box, both, arena, spawnColumn } = builder();

const W = 32, D = 26; // half extents of the playable area

arena(W, D);

// Central hall: x ±8, z ±7, walls 5 m high under a roof. Doorways east/west (4 m wide) and
// two on each long side (2.5 m wide), all 3 m high with lintels above.
const HW = 8, HD = 7, HH = 5, T = 0.6;
for (const z of [-HD, HD]) {
  both(7.025, z, 2.55, T, HH, 'brick');         // corners
  box(0, z, 6.5, T, HH, 'brick');                // middle
  both(4.5, z, 2.5, T, HH - 3, 'brick', 3);      // lintels over the side doors
}
for (const x of [-HW, HW]) {
  box(x, -4.65, T, 5.3, HH, 'brick');
  box(x, 4.65, T, 5.3, HH, 'brick');
  box(x, 0, T, 4, HH - 3, 'brick', 3);           // lintel over the end door
}
box(0, 0, 2 * HW + T, 2 * HD + T, 0.4, 'concrete', HH); // roof
// Inside: a crate stack in the middle, wide enough to block the line from door to door
// (and so spawn to spawn), and pillars.
box(0, -1.1, 2, 2.2, 2, 'crate');
box(0, 1.1, 2, 2.2, 2, 'crate');
box(0, 0, 1.1, 1.1, 1.1, 'crate', 2);
both(4, -3, 0.8, 0.8, HH, 'concrete');
both(4, 3, 0.8, 0.8, HH, 'concrete');
both(6.3, -5.6, 1.2, 1.2, 1.2, 'crate');
both(2.2, 4.8, 1.1, 1.1, 1.0, 'crate');

// North: raised loading dock (1.2 m) along the outer wall with stairs at both ends.
box(0, -23.5, 36, 5, 1.2, 'concrete');
for (let i = 1; i <= 4; i++) both(18 + 0.6 * (4 - i) + 0.3, -23.5, 0.6, 3, 0.3 * i, 'concrete');
both(9, -24.5, 1.2, 1.2, 1.2, 'crate', 1.2);
both(9, -23.2, 1.1, 1.1, 1.0, 'crate', 1.2);
box(0, -24.6, 3, 2, 2.4, 'crate', 1.2);
// North lane cover: containers standing north–south, crates, a low wall.
both(14, -14, 2.5, 6, 2.6, 'container_green');
both(5, -14.5, 1.5, 1.5, 1.5, 'crate');
both(22, -10.5, 4, 0.6, 1.3, 'concrete');
box(0, -11, 4, 0.6, 1.3, 'concrete');

// South: rail yard. Two rows of wagons lying east–west with gaps to run through.
both(7.5, 13, 9, 2.6, 2.6, 'container_blue');
box(0, 9.5, 1.4, 1.4, 1.4, 'crate'); // breaks the long diagonal past the hall
box(0, 9.5, 1, 1, 1, 'crate', 1.4);
box(0, 20, 10, 2.6, 2.6, 'container_red');
both(19, 20, 8, 2.6, 2.6, 'container_red');
box(0, 20, 4, 2.6, 2.6, 'container_blue', 2.6);
both(21, 13.5, 1.2, 1.2, 1.2, 'crate');
both(13, 16.5, 1.5, 1.5, 1.5, 'crate');
both(3, 24.2, 1.2, 1.2, 1.0, 'crate');
both(26, 24, 2, 2, 2, 'crate');

// Middle: between the hall and the spawns.
both(14, 0, 0.6, 4, 1.3, 'concrete');
both(19, -4, 1.2, 1.2, 1.2, 'crate');
both(19, 4, 1.2, 1.2, 1.2, 'crate');
both(19, 4, 1.0, 1.0, 1.0, 'crate', 1.2);

// Spawn cover
both(24.5, -5, 0.6, 4, 1.3, 'concrete');
both(24.5, 5, 0.6, 4, 1.3, 'concrete');
both(27, -17, 1.2, 1.2, 1.2, 'crate');
both(27, 17, 1.2, 1.2, 1.2, 'crate');

const spawnsFor = side => [...spawnColumn(side, 28.5, [-6, -3, 0, 3, 6]), ...spawnColumn(side, 28, [-13, 13])];

export const DEPOT = {
  id: 'depot',
  name: 'Depot',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  spawns: { A: spawnsFor(-1), B: spawnsFor(1) },
  // Plant sites for objective mode, on the defenders' (east) half.
  sites: [
    { name: 'A', min: [17, -21], max: [27, -11] },
    { name: 'B', min: [16, 10], max: [26, 18] },
  ],
  sun: { elevation: 30, azimuth: 225 },
};
