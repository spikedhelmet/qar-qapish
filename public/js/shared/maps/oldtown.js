// "Old Town" — an original close-quarters map: narrow alleys between solid buildings, rooms you fight
// through (a hall, two houses, a chapel) and a small courtyard with a well in the middle. Each team
// spawns in a walled yard at its end. Mirrored east/west like Yard and Depot (team A west).
import { builder } from './builder.js';

const { boxes, box, both: ew, arena, spawnColumn } = builder();

const W = 32, D = 24; // half extents of the playable area

arena(W, D, 8);

// A building you can walk into (east half; mirrored west): walls `h` high with a roof on top.
// doors: [side, center, width], side 'n' / 's' (the z0 / z1 walls) or 'w' / 'e' (x0 / x1).
// sides: which walls to build (leave out ones that are the map's outer wall).
const T = 0.4, DOOR = 2.6;
function house(x0, x1, z0, z1, h, mat, doors, sides = 'nsew') {
  for (const side of sides) {
    const along = side === 'n' || side === 's';
    const a0 = along ? x0 : z0, a1 = along ? x1 : z1;
    const at = { n: z0 + T / 2, s: z1 - T / 2, w: x0 + T / 2, e: x1 - T / 2 }[side];
    const seg = (s0, s1, hh, y) => {
      if (s1 - s0 < 0.01) return;
      if (along) ew((s0 + s1) / 2, at, s1 - s0, T, hh, mat, y);
      else ew(at, (s0 + s1) / 2, T, s1 - s0, hh, mat, y);
    };
    let a = a0;
    for (const [, c, w] of doors.filter(d => d[0] === side).sort((p, q) => p[1] - q[1])) {
      seg(a, c - w / 2, h, 0);
      seg(c - w / 2, c + w / 2, h - DOOR, DOOR); // lintel over the doorway
      a = c + w / 2;
    }
    seg(a, a1, h, 0);
  }
  ew((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0.3, 'concrete', h);
}

// Blocks: solid buildings (6 m) that make the alleys. Alleys: z -13 … -9.5 and 9.5 … 13 (east-west),
// x 15 … 18.5 (north-south). Spawn yard: x 25 … 32, z -13 … 13.
ew(25.25, -18.5, 13.5, 11, 6, 'stone');            // north-east block
ew(21.75, -5.5, 6.5, 8, 6, 'brick');               // block between the alley and the yard …
ew(21.75, 5.5, 6.5, 8, 6, 'brick');
ew(21.75, 0, 6.5, 3, 3, 'brick', 3);               // … with a low covered passage through it
box(0, 18.5, 30, 11, 6, 'stone');                  // south block across the middle

// The hall facing the courtyard: doors to the courtyard, the alleys either side and both ends.
house(6, 15, -9.5, 9.5, 5, 'plaster', [['w', 0, 2.6], ['e', -5, 2], ['e', 5, 2], ['n', 10.5, 2.2], ['s', 10.5, 2.2]]);
ew(10.5, -3, 0.7, 0.7, 5, 'stone');                // pillars
ew(10.5, 3, 0.7, 0.7, 5, 'stone');
ew(8, -7.2, 1.2, 1.2, 1.2, 'crate');
ew(13.2, 7.4, 1.2, 1.2, 1.2, 'crate');
ew(12.8, 0, 0.6, 2.5, 1.2, 'concrete');

// North house (two rooms): doors to the alley, the north-south alley and the chapel.
house(6, 15, -24, -13, 4, 'plaster', [['s', 12.5, 2], ['e', -20, 2], ['w', -18, 2]], 'sew');
ew(10.5, -21.25, 0.4, 5.5, 4, 'plaster');          // wall between the rooms, open at the front
ew(8.3, -15.3, 1.2, 1.2, 1.2, 'crate');
ew(13.3, -22.6, 1.2, 1.2, 1.2, 'crate');

// Chapel between the two north houses (their walls are its sides): a door onto the alley.
box(-3.6, -13.2, 4.8, T, 4, 'stone');
box(3.6, -13.2, 4.8, T, 4, 'stone');
box(0, -13.2, 2.4, T, 4 - DOOR, 'stone', DOOR);
box(0, -18.5, 12, 11, 0.3, 'concrete', 4);
for (const z of [-16.5, -19]) { box(-2.6, z, 3.4, 0.6, 0.5, 'crate'); box(2.6, z, 3.4, 0.6, 0.5, 'crate'); } // pews
box(0, -22.6, 3, 1.2, 1.1, 'stone');               // altar

// South house by the yard (two rooms): doors to the yard, the alley and the north-south alley.
house(18.5, 32, 13, 24, 4, 'plaster', [['n', 29, 2.2], ['n', 21.6, 2], ['w', 18.5, 2]], 'nw');
ew(25, 15, 0.4, 4, 4, 'plaster');                  // wall between the rooms, with a doorway
ew(25, 21.5, 0.4, 5, 4, 'plaster');
ew(25, 18, 0.4, 2, 4 - DOOR, 'plaster', DOOR);
ew(21.2, 21.6, 1.2, 1.2, 1.2, 'crate');
ew(29.5, 21, 1.4, 1.4, 1.4, 'crate');

// Market stalls block the east-west alleys in the middle (no straight line from yard to yard).
box(0, -11.25, 3, 3.5, 3, 'plaster');
box(0, 11.25, 3, 3.5, 3, 'plaster');

// Courtyard: paved, a well, some cover.
box(0, 0, 12, 19, 0.02, 'paving');
box(0, 0, 2, 2, 1, 'stone');
ew(3.6, -5.5, 1.2, 1.2, 1.2, 'crate');
ew(3.6, 5.5, 1.1, 1.1, 1, 'crate');

// Alleys
ew(16.75, -18, 1.1, 1.1, 1, 'crate');
ew(16.75, 7, 1.1, 1.1, 1, 'crate');
ew(22, -11.25, 1.2, 1.2, 1.2, 'crate');
ew(8, 11.25, 1.2, 1.2, 1.2, 'crate');

// Spawn yards
ew(26.6, -6, 1.2, 1.2, 1.2, 'crate');
ew(26.6, 6, 1.4, 1.4, 1.4, 'crate');
ew(27, 0, 0.6, 2.6, 1.2, 'concrete');

const spawnsFor = side => spawnColumn(side, 30, [-10.5, -7, -3.5, 3.5, 7, 10.5]);

export const OLDTOWN = {
  id: 'oldtown',
  name: 'Old Town',
  bounds: { min: [-W, 0, -D], max: [W, 20, D] },
  boxes,
  spawns: { A: spawnsFor(-1), B: spawnsFor(1) },
  // Plant sites for objective mode, on the defenders' (east) half: the hall and the north house.
  sites: [
    { name: 'A', min: [6.5, -9], max: [14.5, 9] },
    { name: 'B', min: [6.5, -23.5], max: [14.5, -13.5] },
  ],
  sun: { elevation: 58, azimuth: 160 }, // high sun so the alleys aren't all shadow
};
