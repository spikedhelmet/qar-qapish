import KITS from '../../../assets/game/kits/kits.json' with { type: 'json' };

// Helpers for writing maps. Units are meters. x runs west→east (team A spawns west), z runs
// north→south, y is up. Every solid is an axis-aligned box: { min: [x,y,z], max: [x,y,z], mat }.
// What a kit's pieces sound like when hit or walked on (a map material; see SURFACE in audio.js).
const KIT_MAT = { room: 'plaster', fence: 'corrugated', crates: 'crate', barrels: 'container_red', pillars: 'concrete', fort: 'concrete', doors: 'floor', lamp: 'container_blue', vents: 'container_blue' };

export function builder() {
  const boxes = [];
  const decals = []; // flat ground cover (lawn, paths, floorboards): drawn, but not solid
  const props = [];  // things drawn on the map that aren't boxes (plants, rocks, roofs, ladders; see
                     // public/js/props.js); their solid parts are hidden boxes
  // Box by center x/z, footprint size, height and base y.
  function box(x, z, sx, sz, h, mat, y = 0) {
    boxes.push({ min: [x - sx / 2, y, z - sz / 2], max: [x + sx / 2, y + h, z + sz / 2], mat });
  }
  // Ground cover over x/z, its top `top` meters up (a few mm; overlapping layers need different tops).
  function decal(x, z, sx, sz, mat, top = 0.01, y = 0) {
    decals.push({ min: [x - sx / 2, y, z - sz / 2], max: [x + sx / 2, y + top, z + sz / 2], mat });
  }
  // A tree `h` meters tall (built in public/js/trees.js; seed picks its shape). Its trunk is an
  // invisible box: you can't walk or shoot through it, but the leaves don't stop you.
  function tree(x, z, h = 7, seed = Math.round(x * 31 + z * 17), y = 0) {
    boxes.push({ min: [x - 0.25, y, z - 0.25], max: [x + 0.25, y + h * 0.45, z + 0.25], mat: 'bark', hidden: true });
    props.push({ kind: 'tree', x, y, z, h, seed });
  }
  // A pine `h` meters tall. Solid trunk; its branches start low, but don't stop you either.
  function pine(x, z, h = 8, seed = Math.round(x * 29 + z * 13), y = 0) {
    boxes.push({ min: [x - 0.22, y, z - 0.22], max: [x + 0.22, y + h * 0.6, z + 0.22], mat: 'bark', hidden: true });
    props.push({ kind: 'pine', x, y, z, h, seed });
  }
  // A bush about `size` meters across, green or dry (yellow-brown). Not solid: you can walk through it.
  function bush(x, z, size = 1.4, dry = false, seed = Math.round(x * 23 + z * 19), y = 0) {
    props.push({ kind: 'bush', x, y, z, size, dry, seed });
  }
  // A boulder sx × sy × sz meters; a box a little smaller than it is solid.
  function rock(x, z, sx, sy, sz, seed = Math.round(x * 37 + z * 11), y = 0) {
    boxes.push({ min: [x - sx * 0.38, y, z - sz * 0.38], max: [x + sx * 0.38, y + sy * 0.8, z + sz * 0.38], mat: 'rock', hidden: true });
    props.push({ kind: 'rock', x, y, z, sx, sy, sz, seed });
  }
  // A hip roof w × d meters with its eaves at height y, rising h. Only drawn.
  function roof(x, z, y, w, d, h) {
    props.push({ kind: 'roof', x, y, z, w, d, h });
  }
  // A ladder up a wall to height `top`. (x, z): the middle of its top, against the wall's face; side:
  // which way the wall is from the ladder ('n', 's', 'e', 'w'). Behind it are hidden steep steps
  // (0.4 m rise, 0.2 m deep) that you walk up like stairs; the game slows you to 30% on them.
  function ladder(x, z, side, top, width = 0.8) {
    const [dx, dz] = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[side];
    const n = Math.ceil(top / 0.4), rise = top / n, tread = 0.2;
    for (let i = 1; i <= n; i++) {
      const d0 = (n - i) * tread, d1 = d0 + tread, mid = (d0 + d1) / 2; // distance out from the wall
      const cx = x - dx * mid, cz = z - dz * mid, sx = dx ? tread : width, sz = dz ? tread : width;
      boxes.push({ min: [cx - sx / 2, 0, cz - sz / 2], max: [cx + sx / 2, i * rise, cz + sz / 2], mat: 'ladder', hidden: true });
    }
    props.push({ kind: 'ladder', x, z, side, top, run: n * tread, width });
  }
  // Tufts of tall grass scattered over x0…x1, z0…z1, kept off anything standing on the ground. Call
  // it last, after the boxes are placed.
  function grass(count, x0, x1, z0, z1, seed = 1) {
    let a = seed * 9301 + 49297;
    const rand = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
    const points = [];
    for (let i = 0; i < count * 3 && points.length < count; i++) {
      const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0), s = 0.7 + rand() * 0.7;
      const blocked = boxes.some(b => b.min[1] <= 0.1 && b.max[1] > 0.1 &&
        x > b.min[0] - 0.4 && x < b.max[0] + 0.4 && z > b.min[2] - 0.4 && z < b.max[2] + 0.4);
      if (!blocked) points.push([+x.toFixed(2), +z.toFixed(2), +s.toFixed(2), +(rand() * 3.14).toFixed(2)]);
    }
    props.push({ kind: 'grass', points });
  }
  // A piece of a model kit (public/dev/kits.config.js; built by /dev/kitbuild.html) standing at x, z
  // (its center) on height y, turned by rot quarter turns (0 … 3, counter-clockwise seen from above).
  // Its collision boxes go into the map, turned with it; the model is drawn by public/js/props.js.
  function piece(kit, name, x, z, rot = 0, y = 0) {
    const p = KITS[kit]?.pieces[name];
    if (!p) throw new Error(`no kit piece ${kit}.${name}`);
    const r = ((rot % 4) + 4) % 4;
    const turn = (px, pz) => [[px, pz], [pz, -px], [-px, -pz], [-pz, px]][r]; // rotation about y by r × 90°
    for (const [x0, y0, z0, x1, y1, z1] of p.boxes) {
      const [ax, az] = turn(x0, z0), [bx, bz] = turn(x1, z1);
      boxes.push({ min: [x + Math.min(ax, bx), y + y0, z + Math.min(az, bz)], max: [x + Math.max(ax, bx), y + y1, z + Math.max(az, bz)], mat: KIT_MAT[kit] || 'concrete', hidden: true });
    }
    props.push({ kind: 'piece', kit, name, x, y, z, rot: r });
  }
  // Size of a kit piece [x, y, z] in meters, before turning.
  const pieceSize = (kit, name) => KITS[kit].pieces[name].size;
  // Same box on both halves of the map (mirrored across x = 0).
  function both(x, z, sx, sz, h, mat, y = 0) {
    box(x, z, sx, sz, h, mat, y);
    box(-x, z, sx, sz, h, mat, y);
  }
  // Ground plus outer walls around the playable area (half extents w, d).
  function arena(w, d, wall = 7, mat = 'concrete') {
    boxes.push({ min: [-w - 1, -1, -d - 1], max: [w + 1, 0, d + 1], mat: 'asphalt' });
    box(0, -d - 0.5, 2 * w + 2, 1, wall, mat);
    box(0, d + 0.5, 2 * w + 2, 1, wall, mat);
    box(-w - 0.5, 0, 1, 2 * d, wall, mat);
    box(w + 0.5, 0, 1, 2 * d, wall, mat);
  }
  // Spawn points in a column at x = side * x, facing the middle. (A spawn may also give y: the
// height of the ground it stands on.)
  function spawnColumn(side, x, zs) {
    return zs.map(z => ({ x: side * x, z, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2 }));
  }
  return { boxes, decals, props, box, decal, tree, pine, bush, rock, roof, ladder, grass, piece, pieceSize, both, arena, spawnColumn };
}
