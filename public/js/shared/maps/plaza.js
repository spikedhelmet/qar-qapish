// "Plaza" — drawn by the team: a walled plaza in the middle with a roofed pavilion at each end, and
// each team's raised terrace behind it (spawn behind a wall, a band of cover, stairs down at the east
// end and a covered stairway into the plaza). Mirrored north/south: team A north, team B south.
import { builder } from './builder.js';

const { boxes, box } = builder();

const W = 40, D = 28;       // half extents of the playable area
const TERRACE = 2.2;        // terrace height: too high to climb, so stairs and the tunnels matter

// Same box on the north half and mirrored onto the south half.
const ns = (x, z, sx, sz, h, mat, y = 0) => { box(x, z, sx, sz, h, mat, y); box(x, -z, sx, sz, h, mat, y); };
// Stairs from the terrace edge at z = edge down toward the middle (8 steps of 0.275 m, 0.6 m deep).
const stairs = (x, sx, edge) => {
  for (let i = 1; i <= 8; i++) ns(x, edge + (8 - i) * 0.6 + 0.3, sx, 0.6, TERRACE * i / 8, 'concrete');
};

// Ground and outer walls
boxes.push({ min: [-W - 1, -1, -D - 1], max: [W + 1, 0, D + 1], mat: 'asphalt' });
box(0, -D - 0.5, 2 * W + 2, 1, 8, 'concrete');
box(0, D + 0.5, 2 * W + 2, 1, 8, 'concrete');
box(-W - 0.5, 0, 1, 2 * D, 8, 'concrete');
box(W + 0.5, 0, 1, 2 * D, 8, 'concrete');

// Terraces: z -28 … -14.5 (and mirrored), solid to the top.
const EDGE = -14.5;
ns(0, (-D + EDGE) / 2, 2 * W, EDGE + D, TERRACE, 'concrete');

// Spawn wall across each terrace (3 m) with a doorway at each end.
const SPAWN_WALL = -23.1;
ns(-36.95, SPAWN_WALL, 6.1, 0.6, 3, 'brick', TERRACE);
ns(-2.5, SPAWN_WALL, 49.4, 0.6, 3, 'brick', TERRACE);
ns(35.3, SPAWN_WALL, 9.4, 0.6, 3, 'brick', TERRACE);

// Parapet along the terrace edge (shoot over it into the lane below), open at the tunnel.
ns(-21.65, EDGE - 0.25, 36.7, 0.5, 1.1, 'concrete', TERRACE);
ns(15.25, EDGE - 0.25, 23.9, 0.5, 1.1, 'concrete', TERRACE);
// Short wall closing the cover band off from the stairs landing.
ns(27.2, (-19.3 + EDGE) / 2, 0.6, EDGE + 19.3, 3, 'brick', TERRACE);

// East stairs down to the lane, next to the pavilion.
stairs(34, 8, EDGE);

// Covered stairway from each terrace down into the plaza: walls, roof, steps.
const PLAZA_WALL = -8.7;
ns(-3.3, (EDGE + PLAZA_WALL) / 2, 0.6, PLAZA_WALL - EDGE, 5.2, 'brick');
ns(3.3, (EDGE + PLAZA_WALL) / 2, 0.6, PLAZA_WALL - EDGE, 5.2, 'brick');
ns(0, (EDGE + PLAZA_WALL) / 2, 7.2, PLAZA_WALL - EDGE, 0.3, 'concrete', 5.0);
stairs(0, 6, EDGE);

// Plaza walls (3 m), open at the tunnel and at both ends into the pavilions.
ns(-12.9, PLAZA_WALL, 19.2, 0.6, 3, 'brick');
ns(12.45, PLAZA_WALL, 18.3, 0.6, 3, 'brick');

// Pavilions: a roof on pillars at each end of the plaza.
for (const [x0, x1] of [[-39.6, -23.1], [21.6, 39.4]]) {
  const cx = (x0 + x1) / 2, w = x1 - x0;
  box(cx, 0, w, 19.2, 0.3, 'concrete', 4);
  for (const px of [x0 + 0.5, cx, x1 - 0.5]) ns(px, 9.1, 0.6, 0.6, 4, 'concrete');
}

// ---- cover (north half, mirrored to the south)

// On the terrace: the band between the spawn wall and the parapet.
ns(-30, -18.5, 1.4, 1.4, 1.4, 'crate', TERRACE);
ns(-18, -16.4, 1.2, 1.2, 1.2, 'crate', TERRACE);
ns(-9, -19, 4, 0.6, 1.2, 'concrete', TERRACE);
ns(4, -17.5, 1.5, 1.5, 1.5, 'crate', TERRACE);
ns(15, -19.5, 0.6, 3, 1.2, 'concrete', TERRACE);
ns(21, -16.5, 1.2, 1.2, 1.2, 'crate', TERRACE);
// Spawn strip: a little cover by each doorway.
ns(-25, -25.5, 1.2, 1.2, 1.2, 'crate', TERRACE);
ns(19, -25.5, 1.2, 1.2, 1.2, 'crate', TERRACE);

// The lane below the terrace.
ns(-31, -11.6, 1.2, 1.2, 1.2, 'crate');
ns(-15, -12, 1.5, 1.5, 1.5, 'crate');
ns(11, -11.2, 1.2, 1.2, 1.2, 'crate');
ns(19, -12.2, 3, 0.6, 1.2, 'concrete');

// Plaza: a fountain in the middle, crates and low walls around it.
box(0, 0, 6, 6, 0.6, 'concrete');
box(0, 0, 3, 3, 0.6, 'concrete', 0.6);
box(0, 0, 1, 1, 1.8, 'concrete', 1.2);
ns(-15, -4.5, 1.2, 1.2, 1.2, 'crate');
ns(13.5, -5, 1.5, 1.5, 1.5, 'crate');
box(-8.5, 0, 0.6, 4, 1.2, 'concrete');
box(8.5, 0, 0.6, 4, 1.2, 'concrete');
ns(-4, -6, 1.1, 1.1, 1.0, 'crate');

// Pavilions: cover under the roofs.
box(-31.5, 0, 1.5, 1.5, 1.5, 'crate');
ns(-36, -4.5, 1.2, 1.2, 1.2, 'crate');
ns(-27, 5.5, 0.6, 3, 1.2, 'concrete');
box(30.5, 0, 1.5, 1.5, 1.5, 'crate');
ns(35.5, 4.5, 1.2, 1.2, 1.2, 'crate');
ns(26, -5.5, 0.6, 3, 1.2, 'concrete');

// Spawns on each terrace, behind the spawn wall, facing the middle.
const spawnsFor = side => [-37, -20, -7, 7, 16, 36].map(x =>
  ({ x, y: TERRACE, z: side * 25.5, yaw: side < 0 ? Math.PI : 0 }));

export const PLAZA = {
  id: 'plaza',
  name: 'Plaza',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  spawns: { A: spawnsFor(-1), B: spawnsFor(1) },
  // Plant sites for objective mode: under the two pavilions.
  sites: [
    { name: 'A', min: [-38.5, -8], max: [-24.5, 8] },
    { name: 'B', min: [23, -8], max: [38, 8] },
  ],
  sun: { elevation: 42, azimuth: 205 },
};
