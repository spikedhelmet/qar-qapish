// "Yard" — an original three-lane map, mirrored left/right so team deathmatch is fair.
import { builder } from './builder.js';

const { boxes, box, both, arena, spawnColumn } = builder();

const W = 40, D = 30; // half extents of the playable area

arena(W, D);

// Lane dividers with two doorways each
for (const z of [-9, 9]) {
  box(-17, z, 14, 0.8, 4.2, 'brick');
  box(0, z, 12, 0.8, 4.2, 'brick');
  box(17, z, 14, 0.8, 4.2, 'brick');
  // lintels over the doorways
  both(8, z, 4, 0.8, 1.2, 'brick', 3.0);
}

// North lane: central warehouse block and crates
box(0, -19, 10, 8, 5, 'concrete');
both(15, -19.5, 2, 2, 2, 'crate');
both(13.6, -21, 1.1, 1.1, 1.0, 'crate');
both(20, -26, 3, 2, 2, 'crate');
both(20, -26, 1.2, 1.2, 1.2, 'crate', 2);
both(10.5, -12, 1.5, 1.5, 1.5, 'crate');
both(26, -15, 1.2, 4, 1.3, 'concrete');

// South lane: shipping containers
box(0, 15, 6, 2.5, 2.6, 'container_red');
box(0, 15, 6, 2.5, 2.6, 'container_blue', 2.6);
both(14, 17, 6, 2.5, 2.6, 'container_green');
both(6, 24.5, 2.5, 6, 2.6, 'container_blue');
both(20, 26.5, 1.2, 1.2, 1.0, 'crate');
both(22, 12.5, 2, 2, 2, 'crate');
both(26, 20, 1.2, 4, 1.3, 'concrete');

// Middle lane: crate stack, low walls, raised decks with stairs
box(0, 0, 2.4, 2.4, 2.4, 'crate');
both(3.4, 3.4, 1.1, 1.1, 1.0, 'crate');
both(3.4, -3.4, 1.1, 1.1, 1.0, 'crate');
both(12, 0, 0.6, 5, 1.3, 'concrete');
both(23.5, 0, 7, 10, 1.5, 'concrete');
for (let i = 1; i <= 4; i++) both(20 - 0.6 * (4 - i) - 0.3, 0, 0.6, 4, 0.3 * i, 'concrete');

// Spawn cover: walls either side of the middle (2.4 m) so the spawns can't see each other down the
// middle lane; the crate stack in the middle covers the gap between them.
both(30.5, -5, 0.6, 5, 2.4, 'concrete');
both(30.5, 5, 0.6, 5, 2.4, 'concrete');
both(28, -20, 0.6, 4, 1.3, 'concrete');
both(28, 20, 0.6, 4, 1.3, 'concrete');

const spawnsFor = side => [...spawnColumn(side, 36, [-6, -3, 0, 3, 6]), ...spawnColumn(side, 35, [-16, 16])];

export const YARD = {
  id: 'yard',
  name: 'Yard',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  spawns: { A: spawnsFor(-1), B: spawnsFor(1) },
  // Plant sites for objective mode, on the defenders' (east) half.
  sites: [
    { name: 'A', min: [12, -27], max: [24, -13] },
    { name: 'B', min: [12, 13], max: [24, 27] },
  ],
  sun: { elevation: 38, azimuth: 140 },
};
