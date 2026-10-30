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

function overlapsAny(map, x, y, z, r, h) {
  for (const b of map.boxes) {
    if (x + r > b.min[0] + EPS && x - r < b.max[0] - EPS &&
        y + h > b.min[1] + EPS && y < b.max[1] - EPS &&
        z + r > b.min[2] + EPS && z - r < b.max[2] - EPS) return b;
  }
  return null;
}

export function canStand(map, pos, height) {
  return !overlapsAny(map, pos[0], pos[1], pos[2], PLAYER.radius, height);
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
    const hit = overlapsAny(map, next[0], next[1], next[2], r, height);
    if (!hit) { pos[axis] = next[axis]; continue; }

    // Try stepping up onto the obstacle.
    const rise = hit.max[1] - pos[1];
    if (wasOnGround && rise > 0 && rise <= PLAYER.stepHeight &&
        !overlapsAny(map, next[0], hit.max[1] + EPS, next[2], r, height)) {
      pos[axis] = next[axis];
      pos[1] = hit.max[1] + EPS;
      continue;
    }
    // Slide flush against the face.
    pos[axis] = delta > 0 ? hit.min[axis] - r - EPS * 2 : hit.max[axis] + r + EPS * 2;
    if (overlapsAny(map, pos[0], pos[1], pos[2], r, height)) pos[axis] = next[axis] - delta;
    vel[axis] = 0;
  }

  const dy = vel[1] * dt;
  const next = pos.slice();
  next[1] += dy;
  const hit = overlapsAny(map, next[0], next[1], next[2], r, height);
  if (!hit) {
    pos[1] = next[1];
  } else if (dy <= 0) {
    pos[1] = hit.max[1] + EPS;
    vel[1] = 0;
    onGround = true;
  } else {
    pos[1] = hit.min[1] - height - EPS;
    vel[1] = 0;
  }
  // Treat a tiny gap below the feet as ground so walking down stairs stays smooth.
  if (!onGround && vel[1] <= 0 && overlapsAny(map, pos[0], pos[1] - 0.02, pos[2], r, height)) onGround = true;
  return { onGround };
}
