// Helpers for writing maps. Units are meters. x runs west→east (team A spawns west), z runs
// north→south, y is up. Every solid is an axis-aligned box: { min: [x,y,z], max: [x,y,z], mat }.
export function builder() {
  const boxes = [];
  // Box by center x/z, footprint size, height and base y.
  function box(x, z, sx, sz, h, mat, y = 0) {
    boxes.push({ min: [x - sx / 2, y, z - sz / 2], max: [x + sx / 2, y + h, z + sz / 2], mat });
  }
  // Same box on both halves of the map (mirrored across x = 0).
  function both(x, z, sx, sz, h, mat, y = 0) {
    box(x, z, sx, sz, h, mat, y);
    box(-x, z, sx, sz, h, mat, y);
  }
  // Ground plus outer walls around the playable area (half extents w, d).
  function arena(w, d, wall = 7) {
    boxes.push({ min: [-w - 1, -1, -d - 1], max: [w + 1, 0, d + 1], mat: 'asphalt' });
    box(0, -d - 0.5, 2 * w + 2, 1, wall, 'concrete');
    box(0, d + 0.5, 2 * w + 2, 1, wall, 'concrete');
    box(-w - 0.5, 0, 1, 2 * d, wall, 'concrete');
    box(w + 0.5, 0, 1, 2 * d, wall, 'concrete');
  }
  // Spawn points in a column at x = side * x, facing the middle. (A spawn may also give y: the
// height of the ground it stands on.)
  function spawnColumn(side, x, zs) {
    return zs.map(z => ({ x: side * x, z, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2 }));
  }
  return { boxes, box, both, arena, spawnColumn };
}
