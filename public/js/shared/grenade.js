// Grenade flight: gravity, bounces off map boxes, rolling to a stop. Shared by server and client
// so both trace the same path from the same throw.
import { THROW } from './config.js';

const STEP = 1 / 240;

// Inside box b grown by r on every side?
function inside(b, p, r) {
  return p[0] > b.min[0] - r && p[0] < b.max[0] + r &&
         p[1] > b.min[1] - r && p[1] < b.max[1] + r &&
         p[2] > b.min[2] - r && p[2] < b.max[2] + r;
}

// Advances g = { pos: [x,y,z], vel: [x,y,z], resting } by dt seconds.
// Returns the number of hard bounces (for clink sounds).
export function stepGrenade(map, g, dt) {
  if (g.resting) return 0;
  const r = THROW.radius;
  let bounces = 0;
  for (let t = 0; t < dt; t += STEP) {
    const h = Math.min(STEP, dt - t);
    g.vel[1] -= THROW.gravity * h;
    const prev = g.pos.slice();
    for (let i = 0; i < 3; i++) g.pos[i] += g.vel[i] * h;

    for (const b of map.boxes) {
      if (!inside(b, g.pos, r)) continue;
      // The axis we crossed into the box on is the one we were outside of last step.
      let axis = 1;
      for (let i = 0; i < 3; i++) {
        if (prev[i] <= b.min[i] - r || prev[i] >= b.max[i] + r) { axis = i; break; }
      }
      const fromLow = prev[axis] < (b.min[axis] + b.max[axis]) / 2;
      g.pos[axis] = fromLow ? b.min[axis] - r - 1e-4 : b.max[axis] + r + 1e-4;
      if (Math.abs(g.vel[axis]) > 1.5) bounces++;
      g.vel[axis] = -g.vel[axis] * THROW.bounce;
      for (let i = 0; i < 3; i++) if (i !== axis) g.vel[i] *= THROW.friction;
    }

    // Lying on something: roll with friction and settle.
    const speed = Math.hypot(g.vel[0], g.vel[1], g.vel[2]);
    const grounded = map.boxes.some(b => inside(b, [g.pos[0], g.pos[1] - 0.02, g.pos[2]], r));
    if (grounded && Math.abs(g.vel[1]) < 0.6) {
      g.vel[1] = 0;
      const k = Math.max(0, 1 - 3 * h);
      g.vel[0] *= k; g.vel[2] *= k;
      if (speed < 0.15) { g.resting = true; g.vel = [0, 0, 0]; return bounces; }
    }
  }
  return bounces;
}

// Throw velocity from a view direction: fast for left click, a soft lob for right click,
// tilted up a little so throws arc, plus some of the thrower's own movement.
export function throwVelocity(dir, far, moveVel = [0, 0, 0]) {
  const speed = far ? THROW.far : THROW.near;
  const d = [dir[0], dir[1] + THROW.lift, dir[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return [0, 1, 2].map(i => (d[i] / len) * speed + moveVel[i] * 0.6);
}
