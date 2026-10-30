// Client entry point: renderer, menu, network messages and the frame loop.
import * as THREE from 'three';
import { MAP } from './shared/map.js';
import { WEAPONS, TEAMS, SEND_RATE, MODES, PLAYER } from './shared/config.js';
import { buildWorld } from './world.js';
import { Input, LocalPlayer } from './player.js';
import { Arsenal } from './weapons.js';
import { Remotes } from './remote.js';
import { ViewModel } from './models.js';
import { Effects } from './effects.js';
import { Hud } from './hud.js';
import { Net } from './net.js';
import * as audio from './audio.js';
import { initAnnouncer, announce, setAnnouncerMode } from './announcer.js';

// ---------------------------------------------------------------- settings

const DEFAULTS = { name: '', sens: 1.2, fov: 90, vol: 0.7, announcer: 'voice' };
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('qapishma.settings') || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
const settings = loadSettings();
function saveSettings() {
  try { localStorage.setItem('qapishma.settings', JSON.stringify(settings)); } catch { /* private mode */ }
}

// ---------------------------------------------------------------- rendering

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.autoClear = false;

const scene = buildWorld(renderer, MAP);
const camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 1200);
camera.rotation.order = 'YXZ';

// The first-person gun is drawn in its own pass so it never clips into walls.
const viewScene = new THREE.Scene();
const viewCamera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 10);
viewScene.add(new THREE.HemisphereLight(0xdde8f5, 0x4a443c, 0.7));
const viewSun = new THREE.DirectionalLight(0xfff1dc, 1.6);
viewSun.position.set(0.5, 1, 0.3);
viewScene.add(viewSun);
viewScene.environment = scene.environment;
viewScene.environmentIntensity = 0.3;

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = viewCamera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  viewCamera.updateProjectionMatrix();
});

// ---------------------------------------------------------------- game objects

const input = new Input(canvas);
const me = new LocalPlayer(MAP);
const arsenal = new Arsenal();
const remotes = new Remotes(scene);
const effects = new Effects(scene, viewScene);
const hud = new Hud();
let viewModel = null;

const game = {
  joined: false,
  myId: null,
  team: null,
  players: [],          // latest snapshot list
  score: { A: 0, B: 0 },
  timeLeft: 0,
  matchState: 'live',
  winner: null,
  deathInfo: null,      // { killer, at }
  sendTimer: 0,
  roll: 0,
  killsThisMatch: 0,
  streak: 0,            // my kills since my last death
  recentKills: [],      // timestamps of my recent kills, for multi-kills
  leading: null,        // was my team ahead at the last snapshot
};

const net = new Net(onMessage, () => {
  game.joined = false;
  hud.show(false);
  document.exitPointerLock();
  showMenu('Lost connection to the server. Reload the page to rejoin.');
});

function playerById(id) { return game.players.find(p => p.id === id); }

function onMessage(msg) {
  switch (msg.t) {
    case 'welcome':
      game.myId = msg.id;
      setTeam(msg.team);
      game.joined = true;
      hud.show(true);
      break;
    case 'team':
      setTeam(msg.team);
      break;
    case 'spawn':
      me.spawn(msg.pos, msg.yaw, msg.life);
      me.hp = PLAYER.maxHp;
      arsenal.reset();
      viewModel.setWeapon(arsenal.current);
      game.deathInfo = null;
      break;
    case 'snap':
      game.players = msg.ps;
      if (game.synced) announceScoreChanges(game.score, msg.sc, game.timeLeft, msg.tl, msg.st);
      game.synced = true; // don't announce the score we joined into
      game.score = msg.sc;
      game.timeLeft = msg.tl;
      game.matchState = msg.st;
      { const mine = msg.ps.find(p => p.id === game.myId); if (mine) me.hp = mine.hp; }
      remotes.applySnapshot(msg.ps, game.myId, game.team);
      break;
    case 'fx': onRemoteFire(msg); break;
    case 'hurt': {
      const prevHp = me.hp;
      me.hp = msg.hp;
      const dx = msg.from[0] - me.pos[0], dz = msg.from[2] - me.pos[2];
      const fwd = -dx * Math.sin(me.yaw) - dz * Math.cos(me.yaw);
      const right = dx * Math.cos(me.yaw) - dz * Math.sin(me.yaw);
      hud.hurt(Math.atan2(right, fwd));
      if (msg.hp < prevHp) audio.playClick('hurt');
      break;
    }
    case 'hitok':
      hud.hitmarker(msg.kill ? 'kill' : msg.hs ? 'head' : '');
      audio.playClick(msg.kill ? 'kill' : msg.hs ? 'head' : 'hit');
      break;
    case 'kill': {
      const killer = playerById(msg.k), victim = playerById(msg.v);
      hud.killfeed(killer, victim, msg.w, msg.hs, msg.k === game.myId || msg.v === game.myId);
      if (msg.v === game.myId) {
        me.alive = false;
        game.deathInfo = { killer, at: performance.now() };
        if (game.streak >= 5) announce('streak_ended');
        game.streak = 0;
      }
      announceKill(msg);
      const r = remotes.players.get(msg.v);
      if (r?.state) effects.blood(new THREE.Vector3(r.state.x, r.state.y + 1.2, r.state.z), null);
      break;
    }
    case 'match':
      game.matchState = msg.state;
      game.winner = msg.winner ?? null;
      if (msg.state === 'live') {
        Object.assign(game, { killsThisMatch: 0, streak: 0, recentKills: [], leading: null });
        announce('match_start', { priority: 2 });
      } else {
        announce(!game.winner ? 'draw' : game.winner === game.team ? 'victory' : 'defeat', { priority: 2 });
      }
      break;
    case 'notice': hud.notice(msg.text); break;
  }
}

// ---------------------------------------------------------------- announcer triggers

function announceKill(msg) {
  game.killsThisMatch++;
  if (game.killsThisMatch === 1) { announce('first_blood', { priority: 2 }); return; }
  if (msg.k !== game.myId || msg.v === game.myId) return;

  const now = performance.now();
  game.streak++;
  game.recentKills = game.recentKills.filter(t => now - t < 4000);
  game.recentKills.push(now);
  const multi = game.recentKills.length;
  if (multi >= 4) announce('multi_kill', { priority: 2 });
  else if (multi === 3) announce('triple_kill', { priority: 2 });
  else if (multi === 2) announce('double_kill', { priority: 2 });
  else if (game.streak === 10) announce('streak_10', { priority: 2 });
  else if (game.streak === 5) announce('streak_5', { priority: 2 });
  else if (msg.w === 'knife') announce('knife_kill');
  else if (msg.hs) announce('headshot');
}

function announceScoreChanges(before, after, timeBefore, timeAfter, state) {
  if (!game.team || state !== 'live') return;
  const mine = after[game.team], theirs = after[game.team === 'A' ? 'B' : 'A'];
  const leading = mine > theirs ? true : mine < theirs ? false : game.leading;
  if (game.leading !== null && leading !== game.leading) announce(leading ? 'lead_taken' : 'lead_lost');
  game.leading = leading;

  const limit = MODES.tdm.killLimit;
  if (before[game.team] < limit - 10 && mine >= limit - 10) announce('ten_kills_left');
  if (before[game.team] < limit - 1 && mine >= limit - 1) announce('one_kill_left', { priority: 2 });
  if (timeBefore > 60 && timeAfter <= 60) announce('one_minute', { priority: 2 });
}

function setTeam(team) {
  game.team = team;
  if (!viewModel) {
    viewModel = new ViewModel(team);
    viewScene.add(viewModel.group);
    viewModel.setWeapon(arsenal.current);
  }
  viewModel.setTeam(team);
}

const _v = new THREE.Vector3();
function onRemoteFire(msg) {
  const r = remotes.players.get(msg.id);
  const muzzle = r ? r.soldier.muzzleWorld(new THREE.Vector3()) : new THREE.Vector3().fromArray(msg.o);
  audio.playShot(msg.w, muzzle);
  if (WEAPONS[msg.w]?.melee) return;
  effects.muzzleFlash(muzzle, null);
  for (const e of msg.e || []) {
    const end = _v.fromArray(e).clone();
    effects.tracer(muzzle, end);
    effects.particles(end, null, 0xffd28a, 4, 3, 0.2, 0.04);
  }
}

// ---------------------------------------------------------------- shooting

const _dir = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3();
function shoot() {
  const eyeArr = me.eye();
  const eye = new THREE.Vector3().fromArray(eyeArr);
  camera.getWorldDirection(_dir);
  const out = arsenal.fire({ eye, dir: _dir.clone() }, {
    map: MAP, targets: remotes.targets(game.team),
    speed: me.speed(), onGround: me.onGround, crouching: me.crouching,
  });
  const kind = arsenal.current;
  if (out.empty) {
    audio.playClick('empty');
    if (arsenal.startReload()) audio.playClick('reload');
    return;
  }

  if (WEAPONS[kind].melee) {
    viewModel.slash();
    audio.playSwish(null);
  } else {
    viewModel.fireKick();
    audio.playShot(kind, null);
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const worldMuzzle = eye.clone().addScaledVector(_dir, 0.7).addScaledVector(_right, 0.14).addScaledVector(_up, -0.12);
    effects.muzzleFlash(worldMuzzle, viewModel.muzzleWorld(new THREE.Vector3()));
    for (const res of out.results) {
      effects.tracer(worldMuzzle, res.point);
      if (res.wall) { effects.impact(res.point, res.normal); audio.playImpact(res.point); }
    }
  }
  for (const res of out.results) if (res.player) effects.blood(res.point, res.dir.clone().negate());

  net.send({
    t: 'fire', w: kind, o: eyeArr,
    e: out.results.map(r => r.point.toArray().map(v => Math.round(v * 100) / 100)),
    hits: out.results.filter(r => r.player).map(r => ({ id: r.player.id, zone: r.player.zone })),
  });
  if (!WEAPONS[kind].melee && arsenal.ammo[kind].mag === 0 && arsenal.startReload()) audio.playClick('reload');
}

// ---------------------------------------------------------------- frame loop

me.hp = 0;
let menuOrbit = 0;
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const playing = game.joined && input.locked;
  const canAct = playing && me.alive && game.matchState === 'live';

  if (game.joined) {
    if (canAct) {
      me.look(input.dx, input.dy, settings.sens * arsenal.fovMult); // slower aim when zoomed
      handleWeaponKeys();
    }
    const trigger = canAct && input.mouseDown;
    const aimHeld = canAct && input.rightDown && !me.sprinting;
    if (me.alive) {
      const ev = me.update(dt, canAct ? input : NO_INPUT, { speedMult: arsenal.moveMult, aiming: arsenal.aiming, firing: trigger });
      if (ev.step) audio.playStep(null, ev.loud ? 0.9 : 0.6);
      if (ev.slide) audio.playSlide(null);
    }
    if (playing && input.hit('KeyM')) net.send({ t: 'team' });

    if (arsenal.update(dt, trigger, aimHeld) === 'reloaded') audio.playClick('reload');
    if (canAct && arsenal.canFire(trigger, me.sprintRecover > 0)) shoot();

    game.sendTimer -= dt;
    if (me.alive && game.sendTimer <= 0) {
      game.sendTimer = 1 / SEND_RATE;
      const r = v => Math.round(v * 1000) / 1000;
      net.send({ t: 's', l: me.life, p: me.pos.map(r), yw: r(me.yaw), pt: r(me.pitch + arsenal.recoil.pitch), cr: me.crouching, sl: me.sliding, w: arsenal.current });
    }
    updateCamera(dt);
  } else {
    menuOrbit += dt * 0.04;
    camera.position.set(Math.sin(menuOrbit) * 46, 24, Math.cos(menuOrbit) * 46);
    camera.lookAt(0, 0, 0);
  }

  remotes.update(dt);
  effects.update(dt);
  audio.updateListener(camera);
  if (game.joined) updateHud();
  input.endFrame();

  renderer.clear();
  renderer.render(scene, camera);
  const scoped = arsenal.def.ads?.scope && arsenal.adsT > 0.9;
  if (game.joined && me.alive && viewModel && !scoped) {
    viewModel.update(dt, {
      speed: me.speed(), onGround: me.onGround,
      drawT: arsenal.drawT / arsenal.def.draw,
      reloadT: arsenal.reloadT >= 0 ? arsenal.reloadT / arsenal.def.reload : -1,
      lookDX: playing ? input.dx : 0, lookDY: playing ? input.dy : 0,
      adsT: arsenal.adsT, sprinting: me.sprinting, sliding: me.sliding,
    });
    renderer.clearDepth();
    renderer.render(viewScene, viewCamera);
  }
}

const NO_INPUT = { down: () => false, hit: () => false };

function handleWeaponKeys() {
  let changed = false;
  if (input.hit('Digit1')) changed = arsenal.select('rifle');
  if (input.hit('Digit2')) changed = arsenal.select('pistol');
  if (input.hit('Digit3')) changed = arsenal.select('knife');
  if (input.hit('KeyQ')) changed = arsenal.select(arsenal.previous);
  if (input.wheel) changed = arsenal.cycle(input.wheel > 0 ? 1 : -1);
  if (changed) viewModel.setWeapon(arsenal.current);
  if (input.hit('KeyR') && arsenal.startReload()) audio.playClick('reload');
}

function updateCamera(dt) {
  if (me.alive) {
    const eye = me.eye();
    camera.position.set(eye[0], eye[1], eye[2]);
    game.roll += ((me.sliding ? 0.07 : 0) - game.roll) * Math.min(1, dt * 10);
    camera.rotation.set(me.pitch + arsenal.recoil.pitch, me.yaw + arsenal.recoil.yaw, game.roll);
  } else {
    // Death camera: sink to the floor and turn toward whoever got you.
    camera.position.y += (me.pos[1] + 0.35 - camera.position.y) * Math.min(1, dt * 4);
    const k = game.deathInfo?.killer && remotes.players.get(game.deathInfo.killer.id)?.state;
    if (k) {
      const yaw = Math.atan2(-(k.x - camera.position.x), -(k.z - camera.position.z));
      const d = Math.atan2(Math.sin(yaw - camera.rotation.y), Math.cos(yaw - camera.rotation.y));
      camera.rotation.y += d * Math.min(1, dt * 3);
      camera.rotation.x *= 1 - Math.min(1, dt * 3);
    }
    camera.rotation.z += (0.25 - camera.rotation.z) * Math.min(1, dt * 3);
  }
  const fov = me.alive ? settings.fov * arsenal.fovMult : settings.fov;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

function updateHud() {
  const ammo = arsenal.ammo[arsenal.current];
  hud.vitals(Math.max(0, me.hp | 0), arsenal.current, ammo?.mag ?? 0, ammo?.reserve ?? 0);
  hud.match(game.score, game.timeLeft);
  const spread = arsenal.spread(me.speed(), me.onGround, me.crouching);
  const px = (spread / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * (innerHeight / 2);
  hud.crosshair(px, me.alive && !WEAPONS[arsenal.current].melee && arsenal.adsT < 0.3 && !me.sprinting);
  hud.scope(me.alive && !!arsenal.def.ads?.scope && arsenal.adsT > 0.9);
  hud.scoreboard(input.down('Tab') || game.matchState === 'over', game.players, game.myId, game.score);

  let msg = '';
  if (game.matchState === 'over') {
    const w = game.winner;
    const title = w ? `${TEAMS[w].name} win` : 'Draw';
    const color = w ? TEAMS[w].css : 'inherit';
    msg = `<span class="big" style="color:${color}">${title}</span><small>Next match in ${game.timeLeft}s</small>`;
  } else if (!me.alive && game.deathInfo) {
    const left = Math.max(0, Math.ceil(PLAYER.respawnTime - (performance.now() - game.deathInfo.at) / 1000));
    const by = game.deathInfo.killer ? `Killed by <span style="color:${TEAMS[game.deathInfo.killer.tm].css}">${escapeHtml(game.deathInfo.killer.n)}</span>` : 'You died';
    msg = `${by}<small>Respawning in ${left}s</small>`;
  } else if (!input.locked) {
    msg = 'Click to resume';
  }
  hud.message(msg);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
}

// ---------------------------------------------------------------- menu

const menu = document.getElementById('menu');
const status = document.getElementById('menu-status');
const playBtn = document.getElementById('play');
const fields = { name: 'name', sens: 'sens', fov: 'fov', vol: 'vol', announcer: 'announcer' };

for (const [key, id] of Object.entries(fields)) {
  const el = document.getElementById(id);
  const out = document.getElementById(`${id}-out`);
  el.value = settings[key];
  const show = () => { if (out) out.textContent = key === 'vol' ? `${Math.round(el.value * 100)}%` : el.value; };
  show();
  el.addEventListener('input', () => {
    settings[key] = key === 'name' || key === 'announcer' ? el.value : Number(el.value);
    show();
    if (key === 'vol') audio.setVolume(settings.vol);
    if (key === 'announcer') setAnnouncerMode(settings.announcer);
    saveSettings();
  });
}

function showMenu(text = '') {
  menu.classList.remove('hidden');
  status.textContent = text;
}

let connecting = null;
playBtn.addEventListener('click', async () => {
  audio.initAudio(settings.vol);
  if (!connecting) {
    const { ctx, master } = audio.audioGraph();
    setAnnouncerMode(settings.announcer);
    initAnnouncer(ctx, master, text => hud.announce(text));
  }
  if (!connecting) {
    playBtn.disabled = true;
    status.textContent = 'Connecting…';
    connecting = net.connect().then(() => net.send({ t: 'join', name: settings.name }));
    try {
      await connecting;
    } catch (e) {
      connecting = null;
      status.textContent = e.message;
      playBtn.disabled = false;
      return;
    }
    playBtn.disabled = false;
    playBtn.textContent = 'Resume';
  }
  menu.classList.add('hidden');
  input.lock();
});

canvas.addEventListener('click', () => {
  if (game.joined && !input.locked && menu.classList.contains('hidden')) input.lock();
});

document.addEventListener('pointerlockchange', () => {
  if (!input.locked && game.joined) showMenu(`Paused · the match keeps running · ping ${net.ping} ms`);
});

hud.message('');
document.getElementById('clock').querySelector('small').textContent = `first to ${MODES.tdm.killLimit}`;
requestAnimationFrame(frame);

// Handy for poking at the game from the browser console.
window.qapishma = { THREE, game, me, arsenal, input, remotes, camera, viewCamera, viewScene, get viewModel() { return viewModel; } };
