// Qapishma LAN server: serves the browser client and runs the match over WebSockets.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MAP, MAPS, setMap } from './public/js/shared/map.js';
import { TICK_RATE, PLAYER, MODES, WEAPONS, TEAMS, CLASSES, DEFAULT_CLASS, classOffered, GRENADES, THROW, loadoutFor, damageFor, spawnSide, siteAt } from './public/js/shared/config.js';
import { stepGrenade } from './public/js/shared/grenade.js';
import { raycastMap, getHitboxes } from './public/js/shared/collision.js';

const PORT = Number(process.env.PORT) || 3000;
// The Mac running the server: its player is the host, and only it can use the dev tools.
const isLocal = addr => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr);
const ROOT = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- static files

const STATIC = [
  ['/vendor/three/addons/', 'node_modules/three/examples/jsm/'],
  ['/vendor/three/', 'node_modules/three/build/'],
  ['/assets-src/', 'assets-src/'],
  ['/', 'public/'],
];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.fbx': 'application/octet-stream', '.bin': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://host').pathname); } catch { url = '/'; }
  const local = isLocal(req.socket.remoteAddress);
  if (url.startsWith('/assets-src/') && !local) { res.writeHead(403).end(); return; }
  if (url === '/api/dev/save' && req.method === 'POST') { // asset build tool writes optimized files here
    const rel = new URL(req.url, 'http://host').searchParams.get('path') || '';
    if (!local || !/^game\/[\w\-./]+\.(glb|json)$/.test(rel) || rel.includes('..')) { res.writeHead(403).end(); return; }
    const out = path.join(ROOT, 'public/assets', rel);
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.concat(chunks));
      res.writeHead(200).end('ok');
    });
    return;
  }
  if (url === '/api/assets') { // raw model files for the dev tools (/dev/viewer.html, /dev/build.html)
    const list = (dir, ext) => {
      const base = path.join(ROOT, 'assets-src', dir);
      try {
        return fs.readdirSync(base, { recursive: true })
          .filter(f => ext.test(f)).map(f => `${dir}/${f.split(path.sep).join('/')}`).sort();
      } catch { return []; }
    };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({
      characters: [...list('characters', /\.fbx$/i), ...list('animations', /\.fbx$/i)],
      weapons: list('weapons', /\.(glb|gltf)$/i),
    }));
    return;
  }
  if (url === '/api/announcer' || url === '/api/sounds/ui') { // which voice lines / UI sounds have been added
    const dir = url === '/api/announcer' ? 'announcer' : 'ui';
    fs.readdir(path.join(ROOT, 'public/assets/sounds', dir), (err, files) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(err ? [] : files.filter(f => /\.(m4a|mp3|wav|ogg)$/i.test(f))));
    });
    return;
  }
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

// Start-up mode: `npm start -- --mode=elim` or MODE=elim npm start. The host can change it in game.
const argMode = (process.argv.find(a => a.startsWith('--mode=')) || '').split('=')[1] || process.env.MODE;

// phase: 'freeze' (round start, can't move) → 'live' → 'roundEnd' → … → 'over'.
// Team Deathmatch only uses 'live' and 'over'. score = team kills (TDM) or rounds won (round modes).
// Objective mode: `attackers` is the team planting this half; `charge` tracks the explosive.
const match = {
  mode: MODES[argMode] ? argMode : 'tdm',
  map: MAP.id,
  evenTeams: true, // team switches may not leave one team two players ahead (host can turn this off)
  phase: 'live', phaseEnds: 0, round: 0,
  score: { A: 0, B: 0 }, winner: null, teamsAtStart: { A: 0, B: 0 },
  attackers: 'A', charge: null,
};
const cfg = () => MODES[match.mode];

function now() { return performance.now() / 1000; }

function setPhase(phase, seconds) {
  match.phase = phase;
  match.phaseEnds = now() + seconds;
}

function clearGrenades() {
  grenades.clear();
  broadcast({ t: 'gclear' });
}

function startMatch() {
  clearGrenades();
  match.score = { A: 0, B: 0 };
  match.winner = null;
  match.round = 0;
  match.attackers = 'A';
  match.charge = null;
  for (const p of players.values()) { p.kills = 0; p.deaths = 0; }
  broadcast({ t: 'match', state: 'live', mode: match.mode, map: match.map });
  if (cfg().respawn) {
    setPhase('live', cfg().timeLimit);
    for (const p of players.values()) spawn(p);
  } else {
    startRound();
  }
}

function startRound() {
  clearGrenades();
  match.round++;
  setPhase('freeze', cfg().freezeTime);
  match.teamsAtStart = { A: teamCount('A'), B: teamCount('B') };
  if (match.mode === 'obj') resetCharge();
  for (const p of players.values()) spawn(p);
  if (match.mode === 'obj') giveCharge();
  broadcast({ t: 'round', phase: 'freeze', n: match.round, score: match.score, att: match.attackers });
}

// reason: 'eliminated' | 'time' | 'defused' | 'detonated'
function endRound(winner, reason = 'eliminated') {
  if (winner) match.score[winner]++;
  setPhase('roundEnd', cfg().roundEnd);
  broadcast({ t: 'round', phase: 'end', n: match.round, winner, reason, score: match.score });
}

function endMatch() {
  const { A, B } = match.score;
  match.winner = A === B ? null : A > B ? 'A' : 'B';
  setPhase('over', cfg().endScreen);
  broadcast({ t: 'match', state: 'over', winner: match.winner, score: match.score });
}

function teamCount(team) {
  let n = 0;
  for (const p of players.values()) if (p.team === team) n++;
  return n;
}

function aliveCount(team) {
  let n = 0;
  for (const p of players.values()) if (p.team === team && p.alive) n++;
  return n;
}

function pickSpawn(p) {
  const enemies = [...players.values()].filter(e => e.alive && e.team !== p.team);
  const scored = MAP.spawns[spawnSide(match.mode, p.team, match.attackers)].map(s => {
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
  p.weapon = loadoutFor(p.cls)[0];
  p.spawnedAt = now();
  p.firedSinceSpawn = false;
  p.protectedUntil = cfg().respawn ? now() + PLAYER.spawnProtection : 0;
  p.history = [];
  p.lastFire = {};
  p.grenades = THROW.perLife;
  send(p, { t: 'spawn', life: p.life, pos: p.pos, yaw: p.yaw, cls: p.cls });
}

// Class changes apply right away during freeze time or just after spawning, otherwise at the next spawn.
function changeClass(p, cls) {
  if (!classOffered(cls) || cls === p.cls) return;
  p.cls = cls;
  const fresh = p.alive && !p.firedSinceSpawn &&
    (match.phase === 'freeze' || (cfg().respawn && now() - p.spawnedAt < 5));
  if (fresh) {
    p.weapon = loadoutFor(cls)[0];
    p.lastFire = {};
    send(p, { t: 'loadout', cls });
  } else {
    send(p, { t: 'notice', text: `${CLASSES[cls].name} on your next ${cfg().respawn ? 'spawn' : 'round'}` });
  }
}

function kill(victim, killer, weapon, headshot) {
  dropCharge(victim);
  victim.alive = false;
  victim.hp = 0;
  victim.deaths++;
  victim.respawnAt = cfg().respawn ? now() + PLAYER.respawnTime : 0;
  if (killer && killer !== victim) {
    killer.kills++;
    if (cfg().respawn) match.score[killer.team]++;
  }
  broadcast({ t: 'kill', k: killer ? killer.id : null, v: victim.id, w: weapon, hs: headshot });
  if (cfg().respawn && killer && match.score[killer.team] >= cfg().killLimit) endMatch();
}

// ---------------------------------------------------------------- objective mode

const defenders = () => (match.attackers === 'A' ? 'B' : 'A');

// The charge is carried by an attacker, lies where its carrier fell, or is planted at a site.
// `act` is the plant or defuse in progress: who, how long they've held E, and where they stand.
function resetCharge() {
  match.charge = { carrier: null, dropped: null, planted: null, act: null };
}

function giveCharge() {
  const att = [...players.values()].filter(p => p.alive && p.team === match.attackers);
  if (!att.length || match.charge.carrier || match.charge.dropped || match.charge.planted) return;
  const p = att[Math.floor(Math.random() * att.length)];
  match.charge.carrier = p.id;
  send(p, { t: 'notice', text: 'You have the charge. Plant it at site A or B (hold E).' });
}

function dropCharge(p) {
  const c = match.charge;
  if (!c || c.carrier !== p.id) return;
  c.carrier = null;
  c.dropped = [p.pos[0], Math.max(0, p.pos[1]), p.pos[2]];
  if (c.act?.id === p.id) c.act = null;
  broadcast({ t: 'obj', ev: 'dropped', pos: c.dropped });
}

function actionAllowed(p, kind) {
  const c = match.charge, o = cfg();
  if (!p.alive) return false;
  if (kind === 'plant') return !c.planted && c.carrier === p.id && !!siteAt(MAP, p.pos[0], p.pos[2]) && p.pos[1] < 0.5;
  return !!c.planted && p.team === defenders() &&
    Math.hypot(p.pos[0] - c.planted.pos[0], p.pos[2] - c.planted.pos[2]) < o.defuseRange &&
    Math.abs(p.pos[1] - c.planted.pos[1]) < 1.5;
}

// Holding E keeps the timer running; moving away, letting go or firing resets it.
function updateAction(dt) {
  const c = match.charge, o = cfg();
  if (c.act) {
    const p = players.get(c.act.id);
    const still = p && Math.hypot(p.pos[0] - c.act.anchor[0], p.pos[2] - c.act.anchor[1]) < 0.5;
    if (!p || !p.use || !still || !actionAllowed(p, c.act.kind)) c.act = null;
  }
  if (!c.act) {
    for (const p of players.values()) {
      if (!p.use) continue;
      const kind = actionAllowed(p, 'plant') ? 'plant' : actionAllowed(p, 'defuse') ? 'defuse' : null;
      if (kind) { c.act = { id: p.id, kind, t: 0, anchor: [p.pos[0], p.pos[2]] }; break; }
    }
  }
  if (!c.act) return;
  c.act.t += dt;
  const p = players.get(c.act.id);
  if (c.act.kind === 'plant' && c.act.t >= o.plantTime) plant(p);
  else if (c.act.kind === 'defuse' && c.act.t >= o.defuseTime) defuse(p);
}

function plant(p) {
  const c = match.charge, site = siteAt(MAP, p.pos[0], p.pos[2]);
  c.carrier = null;
  c.act = null;
  c.planted = { pos: [p.pos[0], 0, p.pos[2]], site: site.name, explodeAt: now() + cfg().fuseTime };
  match.phaseEnds = c.planted.explodeAt; // the clock now counts down the fuse
  broadcast({ t: 'obj', ev: 'planted', site: site.name, pos: c.planted.pos, id: p.id });
}

function defuse(p) {
  const c = match.charge;
  c.act = null;
  broadcast({ t: 'obj', ev: 'defused', id: p.id, pos: c.planted.pos });
  c.planted.defused = true;
  endRound(defenders(), 'defused');
}

function detonate() {
  const c = match.charge, { radius, damage } = cfg().blast, pos = c.planted.pos;
  c.planted = null;
  broadcast({ t: 'obj', ev: 'exploded', pos });
  for (const p of players.values()) {
    if (!p.alive) continue;
    const d = Math.hypot(p.pos[0] - pos[0], p.pos[1] - pos[1], p.pos[2] - pos[2]);
    if (d >= radius) continue;
    p.hp -= Math.round(damage * (1 - d / radius));
    send(p, { t: 'hurt', hp: Math.max(0, p.hp), from: pos });
    if (p.hp <= 0) kill(p, null, 'charge', false);
  }
  endRound(match.attackers, 'detonated');
}

function objectiveTick(dt) {
  const c = match.charge, o = cfg(), t = now();
  if (c.dropped) {
    for (const p of players.values()) {
      if (!p.alive || p.team !== match.attackers) continue;
      const near = Math.hypot(p.pos[0] - c.dropped[0], p.pos[2] - c.dropped[2]) < o.pickupRange &&
        Math.abs(p.pos[1] - c.dropped[1]) < 1.5;
      if (near) {
        c.carrier = p.id;
        c.dropped = null;
        broadcast({ t: 'obj', ev: 'picked', id: p.id });
        break;
      }
    }
  }
  updateAction(dt);
  if (match.phase !== 'live') return;
  if (c.planted && !c.planted.defused && t >= c.planted.explodeAt) { detonate(); return; }

  // Defenders wiped: attackers win. Attackers wiped before planting: defenders win.
  // After a plant the defenders still have to defuse, even with every attacker down.
  const att = match.attackers, def = defenders();
  if (match.teamsAtStart[def] > 0 && aliveCount(def) === 0) endRound(att, 'eliminated');
  else if (!c.planted && match.teamsAtStart[att] > 0 && aliveCount(att) === 0) endRound(def, 'eliminated');
  else if (!c.planted && t >= match.phaseEnds) endRound(def, 'time');
}

// Positions of a player over the last 350 ms, so hits on slightly stale positions still validate.
const HISTORY_WINDOW = 0.35;
function recentPositions(p) {
  const cutoff = now() - HISTORY_WINDOW;
  return [{ pos: p.pos, crouch: p.crouch }, ...p.history.filter(h => h.t >= cutoff)];
}

// ---------------------------------------------------------------- grenades

const grenades = new Map(); // id → { id, kind, owner, team, pos, vel, born, resting }
let nextGrenadeId = 1;

// The client sends where it released the grenade and how fast; the server checks it was
// possible (alive, has one, from its own hand, not absurdly fast) and then owns the flight.
function handleThrow(p, msg) {
  const kind = loadoutFor(p.cls)[3];
  if (!p.alive || match.phase !== 'live' || msg.kind !== kind || !(p.grenades > 0)) return;
  const o = Array.isArray(msg.o) ? msg.o.map(Number) : [], v = Array.isArray(msg.v) ? msg.v.map(Number) : [];
  if (o.length !== 3 || v.length !== 3 || ![...o, ...v].every(Number.isFinite)) return;
  const eye = eyeOf(p);
  if (Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) > 1.5) return;
  if (Math.hypot(v[0], v[1], v[2]) > THROW.far + 10) return;
  p.grenades--;
  p.weapon = kind;
  p.protectedUntil = 0;
  p.firedSinceSpawn = true;
  if (match.charge?.act?.id === p.id) match.charge.act = null;
  const g = { id: nextGrenadeId++, kind, owner: p.id, team: p.team, pos: o, vel: v, born: now(), resting: false };
  grenades.set(g.id, g);
  broadcast({ t: 'gren', id: g.id, kind, owner: p.id, pos: o, vel: v });
}

function updateGrenades(dt) {
  const t = now();
  for (const g of grenades.values()) {
    stepGrenade(MAP, g, dt);
    if (t - g.born >= GRENADES[g.kind].fuse) {
      grenades.delete(g.id);
      detonateGrenade(g);
    }
  }
}

// Smoke and flash only need everyone to see them go off (each client works out its own blindness);
// frags hurt enemies (and the thrower) within the radius, unless a wall is in between.
function detonateGrenade(g) {
  broadcast({ t: 'gdet', id: g.id, kind: g.kind, pos: g.pos.map(v => Math.round(v * 100) / 100), owner: g.owner });
  if (g.kind !== 'frag') return;
  const { damage, radius } = GRENADES.frag;
  const owner = players.get(g.owner) || null;
  const from = [g.pos[0], g.pos[1] + 0.15, g.pos[2]];
  for (const p of players.values()) {
    if (!p.alive || (p.team === g.team && p.id !== g.owner) || p.protectedUntil > now()) continue;
    // Damage by distance to the nearest point of the body, so a frag at someone's feet hits full force;
    // it only counts if the body or head is in sight of the blast.
    const top = p.crouch ? PLAYER.crouchHeight : PLAYER.height, r = PLAYER.radius;
    const near = [
      Math.max(p.pos[0] - r, Math.min(from[0], p.pos[0] + r)),
      Math.max(p.pos[1], Math.min(from[1], p.pos[1] + top)),
      Math.max(p.pos[2] - r, Math.min(from[2], p.pos[2] + r)),
    ];
    const dist = Math.hypot(near[0] - from[0], near[1] - from[1], near[2] - from[2]);
    if (dist >= radius) continue;
    const visible = [0.5, 0.9].some(f => {
      const to = [p.pos[0], p.pos[1] + top * f, p.pos[2]];
      const d = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
      return d < 0.3 || raycastMap(MAP, from, to.map((v, i) => (v - from[i]) / d), d).t >= d - 0.25;
    });
    if (!visible) continue;
    const dmg = Math.round(damage * (1 - dist / radius));
    if (dmg <= 0) continue;
    p.hp -= dmg;
    send(p, { t: 'hurt', hp: Math.max(0, p.hp), from: g.pos });
    const killed = p.hp <= 0;
    if (owner && owner !== p) send(owner, { t: 'hitok', hs: false, kill: killed });
    if (killed) kill(p, owner && owner !== p ? owner : null, 'frag', false);
  }
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
  if (!p.alive || !w || w.grenade || match.phase !== 'live' || !loadoutFor(p.cls).includes(msg.w)) return;
  const t = now();
  if (t - (p.lastFire[msg.w] || 0) < w.fireInterval * 0.75) return;
  p.lastFire[msg.w] = t;
  p.weapon = msg.w;
  p.protectedUntil = 0;
  p.firedSinceSpawn = true;
  if (match.charge?.act?.id === p.id) match.charge.act = null;

  broadcast({ t: 'fx', id: p.id, w: msg.w, o: msg.o, e: Array.isArray(msg.e) ? msg.e.slice(0, w.pellets) : [] }, p);

  // Add up every pellet per target first, so a shotgun blast is one hit, not eight.
  const totals = new Map();
  const hits = Array.isArray(msg.hits) ? msg.hits.slice(0, w.pellets) : [];
  for (const h of hits) {
    const target = players.get(h.id);
    if (!target || !target.alive || target.team === p.team) continue;
    if (target.protectedUntil > t) continue;
    if (!['head', 'body', 'legs'].includes(h.zone)) continue;
    if (!hitIsPlausible(p, target, msg.w, h.zone)) continue;
    const dist = Math.hypot(target.pos[0] - p.pos[0], target.pos[1] - p.pos[1], target.pos[2] - p.pos[2]);
    const sum = totals.get(target) || { dmg: 0, hs: false };
    sum.dmg += damageFor(msg.w, h.zone, dist);
    sum.hs ||= h.zone === 'head';
    totals.set(target, sum);
  }
  for (const [target, { dmg, hs }] of totals) {
    target.hp -= Math.round(dmg);
    send(target, { t: 'hurt', hp: Math.max(0, target.hp), from: p.pos });
    const killed = target.hp <= 0;
    send(p, { t: 'hitok', hs, kill: killed });
    if (killed) kill(target, p, msg.w, hs);
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
  p.slide = !!msg.sl;
  if (loadoutFor(p.cls).includes(msg.w)) p.weapon = msg.w;
}

function switchTeam(p) {
  const other = p.team === 'A' ? 'B' : 'A';
  if (match.evenTeams && teamCount(other) >= teamCount(p.team)) {
    send(p, { t: 'notice', text: `${TEAMS[other].name} already have enough players` });
    return;
  }
  dropCharge(p);
  p.team = other;
  broadcast({ t: 'notice', text: `${p.name} joined the ${TEAMS[other].name}` });
  send(p, { t: 'team', team: other });
  if (cfg().respawn) {
    if (p.alive) { p.alive = false; p.respawnAt = now() + 1; }
  } else if (match.phase === 'freeze') {
    spawn(p);
  } else {
    p.alive = false; // sits out until the next round
  }
}

function handleHost(p, msg) {
  if (!p.host) return;
  if (typeof msg.even === 'boolean' && msg.even !== match.evenTeams) {
    match.evenTeams = msg.even;
    broadcast({ t: 'notice', text: msg.even ? 'Teams must stay even' : 'Anyone can switch teams' });
    broadcast({ t: 'host', even: match.evenTeams });
    return;
  }
  if (msg.map && MAPS[msg.map] && msg.map !== match.map) {
    setMap(msg.map);
    match.map = msg.map;
    broadcast({ t: 'notice', text: `Host switched the map to ${MAP.name}` });
    console.log(`Map: ${MAP.name}`);
    startMatch();
  } else if (msg.mode && MODES[msg.mode] && msg.mode !== match.mode) {
    match.mode = msg.mode;
    broadcast({ t: 'notice', text: `Host switched to ${cfg().name}` });
    console.log(`Mode: ${cfg().name}`);
    startMatch();
  } else if (msg.restart) {
    broadcast({ t: 'notice', text: 'Host restarted the match' });
    startMatch();
  }
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


wss.on('connection', (ws, req) => {
  let p = null;
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!p) {
      if (msg.t !== 'join') return;
      const name = String(msg.name || '').replace(/[^\p{L}\p{N} _\-.]/gu, '').trim().slice(0, 16) || `Player${nextId}`;
      const team = teamCount('A') <= teamCount('B') ? 'A' : 'B';
      const cls = classOffered(msg.cls) ? msg.cls : DEFAULT_CLASS;
      p = { id: nextId++, ws, name, team, cls, host: isLocal(req.socket.remoteAddress),
        pos: [0, 0, 0], yaw: 0, pitch: 0, crouch: false, weapon: loadoutFor(cls)[0],
        hp: 0, alive: false, life: 0, kills: 0, deaths: 0, respawnAt: 0, protectedUntil: 0, history: [], lastFire: {} };
      players.set(p.id, p);
      send(p, { t: 'welcome', id: p.id, team, mode: match.mode, map: match.map, host: p.host, even: match.evenTeams });
      broadcast({ t: 'notice', text: `${name} joined the ${TEAMS[team].name}` }, p);
      if (cfg().respawn ? match.phase === 'live' : match.phase === 'freeze') spawn(p);
      else if (!cfg().respawn) send(p, { t: 'notice', text: 'Round in progress. You join next round.' });
      console.log(`+ ${name} joined (${TEAMS[team].name})${p.host ? ' [host]' : ''}, ${players.size} online`);
      return;
    }
    switch (msg.t) {
      case 's': handleState(p, msg); break;
      case 'fire': handleFire(p, msg); break;
      case 'team': switchTeam(p); break;
      case 'class': changeClass(p, msg.cls); break;
      case 'host': handleHost(p, msg); break;
      case 'use': p.use = !!msg.on; break;
      case 'throw': handleThrow(p, msg); break;
      case 'reload': if (p.alive) broadcast({ t: 'rl', id: p.id }, p); break; // others play the reload animation
      case 'ping': send(p, { t: 'pong', c: msg.c }); break;
    }
  });
  ws.on('close', () => {
    if (!p) return;
    dropCharge(p);
    players.delete(p.id);
    broadcast({ t: 'notice', text: `${p.name} left` });
    console.log(`- ${p.name} left, ${players.size} online`);
  });
});

function tick() {
  const t = now(), c = cfg();
  updateGrenades(1 / TICK_RATE);
  switch (match.phase) {
    case 'live':
      if (c.respawn) {
        for (const p of players.values()) if (!p.alive && p.respawnAt && t >= p.respawnAt) spawn(p);
        if (t >= match.phaseEnds) endMatch();
      } else if (match.mode === 'obj') {
        objectiveTick(1 / TICK_RATE);
      } else {
        // A team that started the round with players and has nobody left standing loses it.
        const a = aliveCount('A'), b = aliveCount('B');
        const outA = match.teamsAtStart.A > 0 && a === 0, outB = match.teamsAtStart.B > 0 && b === 0;
        if (outA || outB) endRound(outA && outB ? null : outA ? 'B' : 'A');
        else if (t >= match.phaseEnds) endRound(a === b ? null : a > b ? 'A' : 'B');
      }
      break;
    case 'freeze':
      if (match.mode === 'obj') giveCharge(); // covers attackers who join or switch during freeze time
      if (t >= match.phaseEnds) {
        setPhase('live', c.roundTime);
        broadcast({ t: 'round', phase: 'live', n: match.round, score: match.score });
      }
      break;
    case 'roundEnd':
      if (t >= match.phaseEnds) {
        if (Math.max(match.score.A, match.score.B) >= c.roundsToWin) endMatch();
        else {
          if (match.mode === 'obj' && match.round === c.halftime) {
            match.attackers = defenders();
            broadcast({ t: 'obj', ev: 'halftime', att: match.attackers });
          }
          startRound();
        }
      }
      break;
    case 'over':
      if (t >= match.phaseEnds) startMatch();
      break;
  }

  const r = v => Math.round(v * 1000) / 1000;
  broadcast({
    t: 'snap',
    m: match.mode,
    st: match.phase,
    rd: match.round,
    tl: Math.max(0, Math.ceil(match.phaseEnds - t - 0.01)),
    sc: match.score,
    ob: match.mode === 'obj' && match.charge ? objectiveSnapshot(t) : undefined,
    ps: [...players.values()].map(p => ({
      id: p.id, n: p.name, tm: p.team, c: p.cls, al: p.alive, hp: p.hp, k: p.kills, d: p.deaths, w: p.weapon,
      x: r(p.pos[0]), y: r(p.pos[1]), z: r(p.pos[2]), yw: r(p.yaw), pt: r(p.pitch), cr: p.crouch, sl: !!p.slide,
      sp: p.protectedUntil > t,
      kn: match.charge?.act?.id === p.id, // kneeling to plant or defuse
    })),
  });
}

function objectiveSnapshot(t) {
  const c = match.charge, o = cfg();
  return {
    att: match.attackers,
    carrier: c.carrier,
    dropped: c.dropped,
    planted: c.planted && { pos: c.planted.pos, site: c.planted.site, left: Math.max(0, c.planted.explodeAt - t), fuse: o.fuseTime },
    act: c.act && { id: c.act.id, kind: c.act.kind, p: Math.min(1, c.act.t / (c.act.kind === 'plant' ? o.plantTime : o.defuseTime)) },
  };
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
}

startMatch();
setInterval(tick, 1000 / TICK_RATE);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nQapishma server running (${cfg().name} on ${MAP.name}).`);
  console.log(`  On this Mac:      http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  Friends on LAN:   http://${ip}:${PORT}`);
  console.log('');
});
