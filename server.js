// Qapishma LAN server: serves the browser client and runs the match over WebSockets.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MAP } from './public/js/shared/map.js';
import { TICK_RATE, PLAYER, MODES, WEAPONS, TEAMS, LOADOUT, damageFor } from './public/js/shared/config.js';
import { raycastMap, getHitboxes } from './public/js/shared/collision.js';

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- static files

const STATIC = [
  ['/vendor/three/addons/', 'node_modules/three/examples/jsm/'],
  ['/vendor/three/', 'node_modules/three/build/'],
  ['/', 'public/'],
];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.fbx': 'application/octet-stream', '.bin': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://host').pathname); } catch { url = '/'; }
  const route = STATIC.find(([prefix]) => url.startsWith(prefix));
  const base = path.join(ROOT, route[1]);
  const file = path.join(base, url.slice(route[0].length) || 'index.html');
  if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------------------------------------------------------------- match state

const players = new Map();
let nextId = 1;
const mode = MODES.tdm;
const match = { state: 'live', score: { A: 0, B: 0 }, endsAt: 0, restartAt: 0, winner: null };

function now() { return performance.now() / 1000; }

function startMatch() {
  match.state = 'live';
  match.score = { A: 0, B: 0 };
  match.winner = null;
  match.endsAt = now() + mode.timeLimit;
  for (const p of players.values()) {
    p.kills = 0; p.deaths = 0;
    spawn(p);
  }
  broadcast({ t: 'match', state: 'live' });
}

function endMatch() {
  match.state = 'over';
  const { A, B } = match.score;
  match.winner = A === B ? null : A > B ? 'A' : 'B';
  match.restartAt = now() + mode.endScreen;
  broadcast({ t: 'match', state: 'over', winner: match.winner, score: match.score });
}

function teamCount(team) {
  let n = 0;
  for (const p of players.values()) if (p.team === team) n++;
  return n;
}

function pickSpawn(p) {
  const enemies = [...players.values()].filter(e => e.alive && e.team !== p.team);
  const scored = MAP.spawns[p.team].map(s => {
    let nearest = Infinity;
    for (const e of enemies) nearest = Math.min(nearest, Math.hypot(e.pos[0] - s.x, e.pos[2] - s.z));
    const crowded = [...players.values()].some(o => o !== p && o.alive && Math.hypot(o.pos[0] - s.x, o.pos[2] - s.z) < 1);
    return { s, score: nearest - (crowded ? 1000 : 0) + Math.random() * 4 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].s;
}

function spawn(p) {
  const s = pickSpawn(p);
  p.pos = [s.x, 0, s.z];
  p.yaw = s.yaw; p.pitch = 0;
  p.crouch = false;
  p.hp = PLAYER.maxHp;
  p.alive = true;
  p.life++;
  p.weapon = LOADOUT[0];
  p.protectedUntil = now() + PLAYER.spawnProtection;
  p.history = [];
  p.lastFire = {};
  send(p, { t: 'spawn', life: p.life, pos: p.pos, yaw: p.yaw });
}

function kill(victim, killer, weapon, headshot) {
  victim.alive = false;
  victim.hp = 0;
  victim.deaths++;
  victim.respawnAt = now() + PLAYER.respawnTime;
  if (killer && killer !== victim) {
    killer.kills++;
    match.score[killer.team]++;
  }
  broadcast({ t: 'kill', k: killer ? killer.id : null, v: victim.id, w: weapon, hs: headshot });
  if (match.state === 'live' && match.score[killer?.team] >= mode.killLimit) endMatch();
}

// Positions of a player over the last 350 ms, so hits on slightly stale positions still validate.
const HISTORY_WINDOW = 0.35;
function recentPositions(p) {
  const cutoff = now() - HISTORY_WINDOW;
  return [{ pos: p.pos, crouch: p.crouch }, ...p.history.filter(h => h.t >= cutoff)];
}

function eyeOf(p) {
  return [p.pos[0], p.pos[1] + (p.crouch ? PLAYER.crouchEye : PLAYER.eye), p.pos[2]];
}

// The shooter's client found the hit; the server checks it was possible: in range and not through a wall.
function hitIsPlausible(shooter, target, weapon, zone) {
  const eye = eyeOf(shooter);
  const w = WEAPONS[weapon];
  for (const sample of recentPositions(target)) {
    const hb = getHitboxes(sample.pos[0], sample.pos[1], sample.pos[2], sample.crouch).find(h => h.zone === zone);
    const c = [(hb.min[0] + hb.max[0]) / 2, (hb.min[1] + hb.max[1]) / 2, (hb.min[2] + hb.max[2]) / 2];
    const v = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]];
    const dist = Math.hypot(v[0], v[1], v[2]);
    if (dist > w.range + 1.5) continue;
    const dir = v.map(x => x / dist);
    const wall = raycastMap(MAP, eye, dir, dist);
    if (wall.t >= dist - 0.4) return true;
  }
  return false;
}

function handleFire(p, msg) {
  const w = WEAPONS[msg.w];
  if (!p.alive || !w || match.state !== 'live') return;
  const t = now();
  if (t - (p.lastFire[msg.w] || 0) < w.fireInterval * 0.75) return;
  p.lastFire[msg.w] = t;
  p.weapon = msg.w;
  p.protectedUntil = 0;

  broadcast({ t: 'fx', id: p.id, w: msg.w, o: msg.o, e: msg.e }, p);

  const hits = Array.isArray(msg.hits) ? msg.hits.slice(0, w.pellets) : [];
  for (const h of hits) {
    const target = players.get(h.id);
    if (!target || !target.alive || target.team === p.team) continue;
    if (target.protectedUntil > t) continue;
    if (!['head', 'body', 'legs'].includes(h.zone)) continue;
    if (!hitIsPlausible(p, target, msg.w, h.zone)) continue;
    const dmg = Math.round(damageFor(msg.w, h.zone));
    target.hp -= dmg;
    send(target, { t: 'hurt', hp: Math.max(0, target.hp), from: p.pos });
    const killed = target.hp <= 0;
    send(p, { t: 'hitok', hs: h.zone === 'head', kill: killed });
    if (killed) kill(target, p, msg.w, h.zone === 'head');
  }
}

function handleState(p, msg) {
  if (!p.alive || msg.l !== p.life || !Array.isArray(msg.p)) return;
  const [x, y, z] = msg.p.map(Number);
  if (![x, y, z].every(Number.isFinite)) return;
  p.history.unshift({ pos: p.pos, crouch: p.crouch, t: now() });
  if (p.history.length > 12) p.history.pop();
  const b = MAP.bounds;
  p.pos = [Math.min(b.max[0], Math.max(b.min[0], x)), Math.max(-1, y), Math.min(b.max[2], Math.max(b.min[2], z))];
  p.yaw = Number(msg.yw) || 0;
  p.pitch = Number(msg.pt) || 0;
  p.crouch = !!msg.cr;
  if (WEAPONS[msg.w]) p.weapon = msg.w;
}

function switchTeam(p) {
  const other = p.team === 'A' ? 'B' : 'A';
  if (teamCount(other) >= teamCount(p.team)) {
    send(p, { t: 'notice', text: `${TEAMS[other].name} already have enough players` });
    return;
  }
  p.team = other;
  broadcast({ t: 'notice', text: `${p.name} joined the ${TEAMS[other].name}` });
  send(p, { t: 'team', team: other });
  if (p.alive) { p.alive = false; p.respawnAt = now() + 1; }
}

// ---------------------------------------------------------------- networking

function send(p, msg) {
  if (p.ws.readyState === 1) p.ws.send(JSON.stringify(msg));
}
function broadcast(msg, except) {
  const data = JSON.stringify(msg);
  for (const p of players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(data);
}

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', ws => {
  let p = null;
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!p) {
      if (msg.t !== 'join') return;
      const name = String(msg.name || '').replace(/[^\p{L}\p{N} _\-.]/gu, '').trim().slice(0, 16) || `Player${nextId}`;
      const team = teamCount('A') <= teamCount('B') ? 'A' : 'B';
      p = { id: nextId++, ws, name, team, pos: [0, 0, 0], yaw: 0, pitch: 0, crouch: false, weapon: LOADOUT[0],
        hp: 0, alive: false, life: 0, kills: 0, deaths: 0, respawnAt: 0, protectedUntil: 0, history: [], lastFire: {} };
      players.set(p.id, p);
      send(p, { t: 'welcome', id: p.id, team, mode: 'tdm' });
      broadcast({ t: 'notice', text: `${name} joined the ${TEAMS[team].name}` }, p);
      if (match.state === 'live') spawn(p);
      console.log(`+ ${name} joined (${TEAMS[team].name}), ${players.size} online`);
      return;
    }
    switch (msg.t) {
      case 's': handleState(p, msg); break;
      case 'fire': handleFire(p, msg); break;
      case 'team': switchTeam(p); break;
      case 'ping': send(p, { t: 'pong', c: msg.c }); break;
    }
  });
  ws.on('close', () => {
    if (!p) return;
    players.delete(p.id);
    broadcast({ t: 'notice', text: `${p.name} left` });
    console.log(`- ${p.name} left, ${players.size} online`);
  });
});

function tick() {
  const t = now();
  if (match.state === 'live') {
    for (const p of players.values()) if (!p.alive && p.respawnAt && t >= p.respawnAt) spawn(p);
    if (t >= match.endsAt) endMatch();
  } else if (t >= match.restartAt) {
    startMatch();
  }

  const r = v => Math.round(v * 1000) / 1000;
  broadcast({
    t: 'snap',
    st: match.state,
    tl: Math.max(0, Math.ceil((match.state === 'live' ? match.endsAt : match.restartAt) - t)),
    sc: match.score,
    ps: [...players.values()].map(p => ({
      id: p.id, n: p.name, tm: p.team, al: p.alive, hp: p.hp, k: p.kills, d: p.deaths, w: p.weapon,
      x: r(p.pos[0]), y: r(p.pos[1]), z: r(p.pos[2]), yw: r(p.yaw), pt: r(p.pitch), cr: p.crouch,
      sp: p.protectedUntil > t,
    })),
  });
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
}

startMatch();
setInterval(tick, 1000 / TICK_RATE);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nQapishma server running.`);
  console.log(`  On this Mac:      http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  Friends on LAN:   http://${ip}:${PORT}`);
  console.log('');
});
