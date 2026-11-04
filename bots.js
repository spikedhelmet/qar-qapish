// Bots for testing: server-side players that walk the ground floor on a navigation grid, hunt the
// nearest enemy and shoot through the same code as a real player's shots. They stay on the ground (no
// stairs or ladders), ignore objectives and aim badly on purpose. server.js adds and removes them.
import { PLAYER, WEAPONS, TICK_RATE } from './public/js/shared/config.js';
import { MAP } from './public/js/shared/map.js';
import { canStand, moveBody, raycastMap } from './public/js/shared/collision.js';

const CELL = 0.5, DT = 1 / TICK_RATE, REACTION = 0.45;
const NEAR = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// The walkable ground of the current map, on a half-meter grid.
let grid = null;
function nav() {
  if (grid?.id === MAP.id) return grid;
  const [x0, , z0] = MAP.bounds.min, [x1, , z1] = MAP.bounds.max;
  const nx = Math.round((x1 - x0) / CELL), nz = Math.round((z1 - z0) / CELL), ok = new Uint8Array(nx * nz);
  const list = [];
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    if (canStand(MAP, [x0 + (i + 0.5) * CELL, 0.03, z0 + (k + 0.5) * CELL], PLAYER.height)) { ok[i * nz + k] = 1; list.push(i * nz + k); }
  }
  return (grid = { id: MAP.id, x0, z0, nx, nz, ok, list });
}
const cellOf = (g, x, z) => {
  const i = Math.max(0, Math.min(g.nx - 1, Math.floor((x - g.x0) / CELL)));
  const k = Math.max(0, Math.min(g.nz - 1, Math.floor((z - g.z0) / CELL)));
  return i * g.nz + k;
};
const centerOf = (g, c) => [g.x0 + (Math.floor(c / g.nz) + 0.5) * CELL, g.z0 + ((c % g.nz) + 0.5) * CELL];

// Nearest walkable cell to a point (spawns and targets may stand off the grid).
function nearestCell(g, x, z) {
  const c = cellOf(g, x, z);
  if (g.ok[c]) return c;
  const i0 = Math.floor(c / g.nz), k0 = c % g.nz;
  for (let r = 1; r < 12; r++) for (let i = -r; i <= r; i++) for (let k = -r; k <= r; k++) {
    if (Math.max(Math.abs(i), Math.abs(k)) !== r) continue;
    const a = i0 + i, b = k0 + k;
    if (a >= 0 && b >= 0 && a < g.nx && b < g.nz && g.ok[a * g.nz + b]) return a * g.nz + b;
  }
  return -1;
}

// Breadth-first path between two cells, as a list of [x, z], or null. No cutting corners.
function findPath(g, from, to) {
  const prev = new Int32Array(g.ok.length).fill(-1), queue = [from];
  prev[from] = from;
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q];
    if (c === to) break;
    const i = Math.floor(c / g.nz), k = c % g.nz;
    for (const [di, dk] of NEAR) {
      const a = i + di, b = k + dk;
      if (a < 0 || b < 0 || a >= g.nx || b >= g.nz) continue;
      const n = a * g.nz + b;
      if (prev[n] !== -1 || !g.ok[n]) continue;
      if (di && dk && (!g.ok[(i + di) * g.nz + k] || !g.ok[i * g.nz + k + dk])) continue;
      prev[n] = c;
      queue.push(n);
    }
  }
  if (prev[to] === -1) return null;
  const path = [];
  for (let c = to; c !== from; c = prev[c]) path.push(centerOf(g, c));
  return path.reverse();
}

const eye = p => [p.pos[0], p.pos[1] + PLAYER.eye, p.pos[2]];
function canSee(p, e) {
  const o = eye(p), v = [e.pos[0] - o[0], e.pos[1] + 1.2 - o[1], e.pos[2] - o[2]];
  const d = Math.hypot(v[0], v[1], v[2]);
  return d > 0 && raycastMap(MAP, o, v.map(x => x / d), d).t >= d - 0.2;
}
const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// One tick of a bot. api: { players, live, now, fire(bot, msg) }.
export function botThink(b, api) {
  const s = b.bot ||= { path: null, step: 0, vy: 0, ground: true, seen: 0, target: null, burst: 0, rest: 0, strafe: 1, flip: 0, stuck: 0, replan: 0, look: 0 };
  if (!b.alive || !api.live()) return;
  const t = api.now(), g = nav();

  // Look around four times a second: the nearest enemy in sight.
  if (t >= s.look) {
    s.look = t + 0.25;
    let best = null, bestD = Infinity;
    for (const e of api.players.values()) {
      if (!e.alive || e.team === b.team) continue;
      const d = Math.hypot(e.pos[0] - b.pos[0], e.pos[2] - b.pos[2]);
      if (d < bestD && canSee(b, e)) { best = e; bestD = d; }
    }
    if (best !== s.target) s.seen = t;
    s.target = best;
  }

  const vel = [0, s.vy, 0], e = s.target?.alive ? s.target : null;
  if (e) {
    // In sight: face it, sidestep, and fire in bursts after a moment to react.
    const dx = e.pos[0] - b.pos[0], dz = e.pos[2] - b.pos[2], d = Math.hypot(dx, dz);
    b.yaw = turn(b.yaw, Math.atan2(-dx, -dz), Math.min(1, DT * 8));
    b.pitch = Math.atan2(e.pos[1] + 1.2 - (b.pos[1] + PLAYER.eye), d);
    if (t >= s.flip) { s.flip = t + 0.6 + Math.random(); s.strafe = Math.random() < 0.5 ? -1 : 1; }
    const speed = PLAYER.runSpeed * 0.6;
    vel[0] = (Math.cos(b.yaw)) * s.strafe * speed;
    vel[2] = (-Math.sin(b.yaw)) * s.strafe * speed;
    if (t >= s.rest && t - s.seen >= REACTION) {
      if (!s.burst) s.burst = t + 0.5 + Math.random() * 0.4;
      if (t < s.burst) shoot(b, e, d, t, api);
      else { s.burst = 0; s.rest = t + 0.4 + Math.random() * 0.6; }
    }
    s.path = null;
  } else {
    // Otherwise walk: toward an enemy most of the time, somewhere else now and then.
    if (!s.path || s.step >= s.path.length || t >= s.replan) {
      s.replan = t + 8;
      const enemies = [...api.players.values()].filter(o => o.alive && o.team !== b.team);
      const goal = enemies.length && Math.random() < 0.75 ? enemies[Math.floor(Math.random() * enemies.length)] : null;
      const from = nearestCell(g, b.pos[0], b.pos[2]);
      const to = goal ? nearestCell(g, goal.pos[0], goal.pos[2]) : g.list[Math.floor(Math.random() * g.list.length)];
      s.path = from >= 0 && to >= 0 ? findPath(g, from, to) : null;
      s.step = 0;
    }
    if (s.path?.length) {
      const [wx, wz] = s.path[Math.min(s.step + 2, s.path.length - 1)];
      const dx = wx - b.pos[0], dz = wz - b.pos[2], d = Math.hypot(dx, dz) || 1;
      if (Math.hypot(s.path[s.step][0] - b.pos[0], s.path[s.step][1] - b.pos[2]) < 0.6) s.step++;
      b.yaw = turn(b.yaw, Math.atan2(-dx, -dz), Math.min(1, DT * 8));
      b.pitch = 0;
      vel[0] = (dx / d) * PLAYER.runSpeed * 0.9;
      vel[2] = (dz / d) * PLAYER.runSpeed * 0.9;
    }
  }

  vel[1] -= PLAYER.gravity * DT;
  const before = [b.pos[0], b.pos[2]];
  b.history.unshift({ pos: b.pos.slice(), crouch: false, t });
  if (b.history.length > 12) b.history.pop();
  const res = moveBody(MAP, b.pos, vel, DT, PLAYER.height, s.ground);
  s.ground = res.onGround;
  s.vy = vel[1];
  // Blocked (by another player's path, a corner): pick a new way.
  if (!e && Math.hypot(b.pos[0] - before[0], b.pos[2] - before[1]) < 0.01) {
    if (++s.stuck > 15) { s.stuck = 0; s.path = null; }
  } else s.stuck = 0;
}

// A shot through the normal fire path: usually a miss, more often the closer the target.
function shoot(b, e, d, t, api) {
  const w = WEAPONS[b.weapon];
  if (t - (b.lastFire[b.weapon] || 0) < w.fireInterval * 1.3) return;
  const o = eye(b), chance = Math.max(0.1, Math.min(0.45, 0.5 - d / 60));
  const hit = Math.random() < chance, roll = Math.random();
  const miss = () => (Math.random() - 0.5) * 1.6;
  api.fire(b, {
    w: b.weapon, o,
    e: [[e.pos[0] + (hit ? 0 : miss()), e.pos[1] + 1.2 + (hit ? 0 : miss() / 2), e.pos[2] + (hit ? 0 : miss())]],
    hits: hit ? [{ id: e.id, zone: roll < 0.06 ? 'head' : roll < 0.7 ? 'body' : 'legs' }] : [],
  });
}
