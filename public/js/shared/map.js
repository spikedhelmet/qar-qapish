// "Yard" — an original three-lane map, mirrored left/right so team deathmatch is fair.
// Units are meters. x runs west→east (team A spawns west), z runs north→south, y is up.
// Every solid is an axis-aligned box: { min: [x,y,z], max: [x,y,z], mat }.

const boxes = [];

// Box by center x/z, footprint size, height and base y.
function box(x, z, sx, sz, h, mat, y = 0) {
  boxes.push({ min: [x - sx / 2, y, z - sz / 2], max: [x + sx / 2, y + h, z + sz / 2], mat });
}
// Same box on both halves of the map.
function both(x, z, sx, sz, h, mat, y = 0) {
  box(x, z, sx, sz, h, mat, y);
  box(-x, z, sx, sz, h, mat, y);
}

const W = 40, D = 30; // half extents of the playable area

// Ground and outer walls
boxes.push({ min: [-W - 1, -1, -D - 1], max: [W + 1, 0, D + 1], mat: 'asphalt' });
box(0, -D - 0.5, 2 * W + 2, 1, 7, 'concrete');
box(0, D + 0.5, 2 * W + 2, 1, 7, 'concrete');
box(-W - 0.5, 0, 1, 2 * D, 7, 'concrete');
box(W + 0.5, 0, 1, 2 * D, 7, 'concrete');

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

// Spawn cover
both(31, -4.5, 1.2, 1.2, 1.2, 'crate');
both(31, 4.5, 1.2, 1.2, 1.2, 'crate');
both(28, -20, 0.6, 4, 1.3, 'concrete');
both(28, 20, 0.6, 4, 1.3, 'concrete');

function spawnsFor(side) {
  const list = [];
  for (const z of [-6, -3, 0, 3, 6]) list.push({ x: side * 36, z, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
  for (const z of [-16, 16]) list.push({ x: side * 35, z, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
  return list;
}

export const MAP = {
  name: 'Yard',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  spawns: { A: spawnsFor(-1), B: spawnsFor(1) },
  // Plant sites for objective mode (milestone 3); drawn on the ground already.
  sites: [
    { name: 'A', min: [12, -27], max: [24, -13] },
    { name: 'B', min: [12, 13], max: [24, 27] },
  ],
  sun: { elevation: 38, azimuth: 140 },
};
