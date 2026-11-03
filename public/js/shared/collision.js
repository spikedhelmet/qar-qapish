// Collision and ray tests against the box map and player hitboxes. Shared by client and server.
import { PLAYER } from './config.js';

const EPS = 1e-4;

// Slab test. Returns distance along the ray to the box, or Infinity. `d` must be normalized.
export function rayBox(o, d, min, max, maxDist = Infinity) {
  let tmin = 0, tmax = maxDist, axis = -1, sign = 0;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < min[i] || o[i] > max[i]) return { t: Infinity };
      continue;
    }
    const inv = 1 / d[i];
    let t1 = (min[i] - o[i]) * inv, t2 = (max[i] - o[i]) * inv;
    let s = -1;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
    if (t1 > tmin) { tmin = t1; axis = i; sign = s; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return { t: Infinity };
  }
  const normal = [0, 0, 0];
  if (axis >= 0) normal[axis] = sign;
  return { t: tmin, normal };
}

// Nearest map hit along a ray: { t, normal, box } or { t: Infinity }.
export function raycastMap(map, o, d, maxDist = 500) {
  let best = { t: Infinity };
  for (const b of map.boxes) {
    const hit = rayBox(o, d, b.min, b.max, maxDist);
    if (hit.t < best.t) best = { t: hit.t, normal: hit.normal, box: b };
  }
  return best;
}

// Hitboxes for a player standing with feet at (x, y, z). Heights match the soldier model's poses.
const STAND_BOXES = [['head', 0.15, 1.46, 1.82], ['body', 0.26, 0.88, 1.46], ['legs', 0.2, 0, 0.88]];
const CROUCH_BOXES = [['head', 0.15, 1.15, 1.47], ['body', 0.27, 0.6, 1.15], ['legs', 0.24, 0, 0.6]];

export function getHitboxes(x, y, z, crouching) {
  return (crouching ? CROUCH_BOXES : STAND_BOXES).map(([zone, half, y0, y1]) => ({
    zone,
    min: [x - half, y + y0, z - half],
    max: [x + half, y + y1, z + half],
  }));
}

// Nearest hitbox hit on one player: { t, zone } or null.
export function rayPlayer(o, d, x, y, z, crouching, maxDist) {
  let best = null;
  for (const hb of getHitboxes(x, y, z, crouching)) {
    const hit = rayBox(o, d, hb.min, hb.max, maxDist);
    if (hit.t < (best ? best.t : maxDist)) best = { t: hit.t, zone: hb.zone };
  }
  return best;
}

const touches = (b, x, y, z, r, h) =>
  x + r > b.min[0] + EPS && x - r < b.max[0] - EPS &&
  y + h > b.min[1] + EPS && y < b.max[1] - EPS &&
  z + r > b.min[2] + EPS && z - r < b.max[2] - EPS;

function overlapsAny(map, x, y, z, r, h) {
  for (const b of map.boxes) if (touches(b, x, y, z, r, h)) return b;
  return null;
}

// Every box the body would overlap (a body can touch a floor, a wall and a step at once).
function overlapsAll(map, x, y, z, r, h) {
  const out = [];
  for (const b of map.boxes) if (touches(b, x, y, z, r, h)) out.push(b);
  return out;
}

export function canStand(map, pos, height) {
  return !overlapsAny(map, pos[0], pos[1], pos[2], PLAYER.radius, height);
}

// The material of the ground under a body at pos (including ground cover like lawn or floorboards).
export function surfaceUnder(map, pos) {
  let best = null;
  for (const b of [...map.boxes, ...(map.decals || [])]) {
    if (pos[0] < b.min[0] || pos[0] > b.max[0] || pos[2] < b.min[2] || pos[2] > b.max[2]) continue;
    if (b.max[1] > pos[1] + 0.05 || b.max[1] < pos[1] - 0.3) continue;
    if (!best || b.max[1] > best.max[1]) best = b;
  }
  return best?.mat;
}

// A ledge to climb onto in direction (dx, dz) (unit): the top of a box just in front, higher than a
// step and no higher than `maxTop`, with room to stand on it and nothing overhead on the way up.
// Returns the standing position on top, or null.
export function findLedge(map, pos, height, dx, dz, maxTop) {
  const r = PLAYER.radius;
  for (const reach of [r + 0.08, r + PLAYER.climbReach]) {
    const x = pos[0] + dx * reach, z = pos[2] + dz * reach;
    let best = null;
    for (const b of map.boxes) {
      if (x < b.min[0] || x > b.max[0] || z < b.min[2] || z > b.max[2]) continue;
      const top = b.max[1];
      if (top <= pos[1] + PLAYER.stepHeight || top > maxTop) continue;
      if (!best || top > best) best = top;
    }
    if (best === null) continue;
    const stand = [pos[0] + dx * (reach + r * 0.6), best + EPS, pos[2] + dz * (reach + r * 0.6)];
    if (overlapsAny(map, stand[0], stand[1], stand[2], r, height)) continue;          // no room on top
    if (overlapsAny(map, pos[0], best + EPS, pos[2], r, height)) continue;            // ceiling above us
    return stand;
  }
  return null;
}

// A window (or a low wall) to climb through in direction (dx, dz): a sill just in front, higher than
// a step and no higher than `maxTop`, with an opening above it at least `gap` tall, and room to come
// down on the far side. Returns { over, to }: the point on the sill and the landing spot beyond it
// (at sill height; the player drops from there), or null.
export function findVault(map, pos, dx, dz, maxTop, gap) {
  const r = PLAYER.radius;
  for (const reach of [r + 0.08, r + PLAYER.climbReach]) {
    const x = pos[0] + dx * reach, z = pos[2] + dz * reach;
    let sill = null;
    for (const b of map.boxes) {
      if (x < b.min[0] || x > b.max[0] || z < b.min[2] || z > b.max[2]) continue;
      if (b.max[1] <= pos[1] + PLAYER.stepHeight || b.max[1] > maxTop) continue;
      if (!sill || b.max[1] > sill.max[1]) sill = b;
    }
    if (!sill) continue;
    const y = sill.max[1] + EPS;
    // Through the opening: the body (only `gap` tall while ducking through) must fit all the way over.
    for (let d = reach; d < reach + 2; d += 0.1) {
      const px = pos[0] + dx * d, pz = pos[2] + dz * d;
      if (overlapsAny(map, px, y, pz, r * 0.8, gap)) break;
      const clear = px - r > sill.max[0] || px + r < sill.min[0] || pz - r > sill.max[2] || pz + r < sill.min[2];
      if (clear && !overlapsAny(map, px, y, pz, r, gap)) {
        return { over: [x, y, z], to: [px + dx * 0.05, y, pz + dz * 0.05] };
      }
    }
  }
  return null;
}

// Moves a player body through the map one axis at a time, stepping up small ledges.
// Mutates pos and vel; returns { onGround }.
export function moveBody(map, pos, vel, dt, height, wasOnGround) {
  const r = PLAYER.radius;
  let onGround = false;

  for (const axis of [0, 2]) {
    const delta = vel[axis] * dt;
    if (delta === 0) continue;
    const next = pos.slice();
    next[axis] += delta;
    const hits = overlapsAll(map, next[0], next[1], next[2], r, height);
    if (!hits.length) { pos[axis] = next[axis]; continue; }

    // Try stepping up onto the obstacle (onto the highest of everything we'd touch).
    const top = Math.max(...hits.map(b => b.max[1]));
    const rise = top - pos[1];
    if (wasOnGround && rise > 0 && rise <= PLAYER.stepHeight &&
        !overlapsAny(map, next[0], top + EPS, next[2], r, height)) {
      pos[axis] = next[axis];
      pos[1] = top + EPS;
      continue;
    }
    // Slide flush against the nearest face.
    pos[axis] = delta > 0 ? Math.min(...hits.map(b => b.min[axis])) - r - EPS * 2 : Math.max(...hits.map(b => b.max[axis])) + r + EPS * 2;
    if (overlapsAny(map, pos[0], pos[1], pos[2], r, height)) pos[axis] = next[axis] - delta;
    vel[axis] = 0;
  }

  const dy = vel[1] * dt;
  const next = pos.slice();
  next[1] += dy;
  const hits = overlapsAll(map, next[0], next[1], next[2], r, height);
  if (!hits.length) {
    pos[1] = next[1];
  } else if (dy <= 0) {
    pos[1] = Math.max(...hits.map(b => b.max[1])) + EPS; // land on the highest thing underfoot
    vel[1] = 0;
    onGround = true;
  } else {
    pos[1] = Math.min(...hits.map(b => b.min[1])) - height - EPS;
    vel[1] = 0;
  }
  // Treat a tiny gap below the feet as ground so walking down stairs stays smooth.
  if (!onGround && vel[1] <= 0 && overlapsAny(map, pos[0], pos[1] - 0.02, pos[2], r, height)) onGround = true;
  return { onGround };
}
