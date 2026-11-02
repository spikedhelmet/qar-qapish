// Client entry point: renderer, menu, network messages and the frame loop.
import * as THREE from 'three';
import { MAP, MAPS, MAP_ORDER, setMap } from './shared/map.js';
import { WEAPONS, TEAMS, SEND_RATE, MODES, MODE_ORDER, PLAYER, CLASSES, CLASS_ORDER, DEFAULT_CLASS, classOffered, GRENADES, THROW, loadoutFor } from './shared/config.js';
import { throwVelocity } from './shared/grenade.js';
import { GrenadeView } from './grenades.js';
import { buildWorld, showMap } from './world.js';
import { photoTextures } from './textures.js';
import { Input, LocalPlayer } from './player.js';
import { Arsenal } from './weapons.js';
import { Remotes } from './remote.js';
import { ViewModel, flashSize, hasOptic } from './models.js';
import { Effects } from './effects.js';
import { Hud } from './hud.js';
import { Net } from './net.js';
import * as audio from './audio.js';
import { initAnnouncer, announce, setAnnouncerMode } from './announcer.js';
import { loadAssets } from './assets.js';
import { ObjectiveView } from './objective.js';
import { ACTIONS, RESERVED, keyFor, keyName, keyLabel, setBindings, bindKey } from './keys.js';

// ---------------------------------------------------------------- settings

const DEFAULTS = { name: '', sens: 1.2, fov: 90, vol: 0.7, announcer: 'voice', graphics: 'high', crosshair: 'static', cls: DEFAULT_CLASS, keys: {} };
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('qapishma.settings') || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
const settings = loadSettings();
if (!classOffered(settings.cls)) settings.cls = DEFAULT_CLASS;
settings.keys = setBindings(settings.keys);
function saveSettings() {
  try { localStorage.setItem('qapishma.settings', JSON.stringify(settings)); } catch { /* private mode */ }
}

// ---------------------------------------------------------------- rendering

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
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

// The server says which map is on (when we join and whenever the host switches).
function changeMap(id) {
  if (id === MAP.id || !setMap(id)) return;
  showMap(scene, MAP);
  viewScene.environment = scene.environment;
  grenadeView?.clear();
}

// Graphics quality: render resolution (on Retina screens) and shadow detail.
const GRAPHICS = {
  low: { pixelRatio: 1, shadow: 1024 },
  medium: { pixelRatio: 1.5, shadow: 2048 },
  high: { pixelRatio: 2, shadow: 4096 },
};
function applyGraphics() {
  const g = GRAPHICS[settings.graphics] || GRAPHICS.high;
  renderer.setPixelRatio(Math.min(devicePixelRatio, g.pixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  scene.traverse(o => {
    if (!o.isDirectionalLight || !o.castShadow || o.shadow.mapSize.x === g.shadow) return;
    o.shadow.mapSize.set(g.shadow, g.shadow);
    o.shadow.map?.dispose();
    o.shadow.map = null; // rebuilt at the new size on the next frame
  });
}
applyGraphics();

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
let objective = null; // created once models have loaded (it uses the charge model)
const grenadeView = new GrenadeView(scene, effects);
const hud = new Hud();
let viewModel = null;

const game = {
  joined: false,
  host: false,
  myId: null,
  team: null,
  cls: settings.cls,
  mode: 'tdm',
  players: [],          // latest snapshot list
  score: { A: 0, B: 0 },
  timeLeft: 0,
  phase: 'live',        // 'freeze' | 'live' | 'roundEnd' | 'over'
  round: 0,
  winner: null,
  roundWinner: undefined,
  deathInfo: null,      // { killer, at }
  specId: null,         // teammate being spectated (Elimination)
  picker: false,        // class picker open
  sendTimer: 0,
  roll: 0,
  prevMouse: false,
  synced: false,
  killsThisMatch: 0,
  streak: 0,            // my kills since my last death
  recentKills: [],      // timestamps of my recent kills, for multi-kills
  leading: null,        // was my team ahead at the last snapshot
  lastAliveSaid: false,
  ob: null,             // objective-mode state from the server
  roundReason: null,    // why the last round ended
  usingE: false,        // E held state last sent to the server
  throwing: null,       // grenade throw in progress: { far, t, released }
  quickThrow: false,    // G pressed: throw as soon as the grenade is out
  prevRight: false,
  blind: null,          // flashbang: { amount, at, seconds }
};
const modeCfg = () => MODES[game.mode];

const net = new Net(onMessage, () => {
  game.joined = false;
  hud.show(false);
  document.exitPointerLock();
  showMenu('Lost connection to the server. Reload the page to rejoin.');
});

function playerById(id) { return game.players.find(p => p.id === id); }

function equip(cls) {
  game.cls = cls;
  arsenal.reset(loadoutFor(cls));
  viewModel?.setWeapon(arsenal.current);
}

function onMessage(msg) {
  switch (msg.t) {
    case 'welcome':
      game.myId = msg.id;
      game.host = msg.host;
      game.mode = msg.mode;
      game.even = msg.even !== false;
      changeMap(msg.map);
      setTeam(msg.team);
      game.joined = true;
      hud.show(true);
      updateHostPanel();
      break;
    case 'team':
      setTeam(msg.team);
      renderTeamButtons();
      break;
    case 'host':
      game.even = msg.even;
      updateHostPanel();
      break;
    case 'spawn':
      me.spawn(msg.pos, msg.yaw, msg.life);
      me.hp = PLAYER.maxHp;
      equip(msg.cls);
      game.deathInfo = null;
      game.specId = null;
      game.throwing = null;
      game.quickThrow = false;
      break;
    case 'loadout':
      equip(msg.cls);
      break;
    case 'snap': {
      game.players = msg.ps;
      if (!menu.classList.contains('hidden')) renderTeamButtons(); // keeps the menu's team counts current
      if (game.synced) announceScoreChanges(game.score, msg.sc, game.timeLeft, msg.tl, msg.st);
      game.synced = true; // don't announce the score we joined into
      game.mode = msg.m;
      game.score = msg.sc;
      game.timeLeft = msg.tl;
      game.phase = msg.st;
      game.round = msg.rd;
      game.ob = msg.ob || null;
      const mine = msg.ps.find(p => p.id === game.myId);
      if (mine) me.hp = mine.hp;
      remotes.applySnapshot(msg.ps, game.myId, game.team);
      announceLastAlive();
      break;
    }
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
      audio.playConfirm(msg.kill ? 'kill' : msg.hs ? 'head' : 'hit');
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
    case 'round':
      onRound(msg);
      break;
    case 'match':
      game.phase = msg.state;
      game.winner = msg.winner ?? null;
      if (msg.map) changeMap(msg.map);
      if (msg.mode) { game.mode = msg.mode; updateHostPanel(); }
      if (msg.state === 'live') {
        Object.assign(game, { killsThisMatch: 0, streak: 0, recentKills: [], leading: null, synced: false });
        if (modeCfg().respawn) announce('match_start', { priority: 2 });
      } else {
        announce(!game.winner ? 'draw' : game.winner === game.team ? 'victory' : 'defeat', { priority: 2 });
      }
      break;
    case 'notice': hud.notice(msg.text); break;
    case 'obj': onObjective(msg); break;
    case 'gren':
      grenadeView.thrown(msg);
      if (msg.owner !== game.myId) remotes.players.get(msg.owner)?.soldier.playThrow?.();
      break;
    case 'gdet': {
      const fx = grenadeView.detonated(msg, camera, me.alive);
      if (fx.shake && viewModel) viewModel.shake.kick(fx.shake, (Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
      if (fx.blind > 0.05) {
        const seconds = GRENADES.flash.maxBlind * fx.blind + 0.3;
        game.blind = { amount: fx.blind, at: performance.now(), seconds };
        audio.playEarRing(fx.blind, seconds);
        audio.deafen(fx.blind, seconds);
      }
      break;
    }
    case 'gclear': grenadeView.clear(); break;
    case 'rl': remotes.players.get(msg.id)?.soldier.playReload?.(); break;
  }
}

function onObjective(msg) {
  const name = id => escapeHtml(playerById(id)?.n || 'Someone');
  const attacking = game.ob ? game.ob.att === game.team : false;
  switch (msg.ev) {
    case 'planted':
      announce('charge_planted', { priority: 2 });
      hud.notice(`${playerById(msg.id)?.n || 'Someone'} planted the charge at ${msg.site}`);
      break;
    case 'defused':
      announce('charge_defused', { priority: 2 });
      break;
    case 'exploded':
      objective?.explode(msg.pos);
      { // camera jolt that fades with distance
        const d = Math.hypot(me.pos[0] - msg.pos[0], me.pos[2] - msg.pos[2]);
        const k = Math.max(0, 1 - d / 40) * 0.08;
        viewModel?.shake.kick(k, (Math.random() - 0.5) * k, (Math.random() - 0.5) * k * 2);
      }
      break;
    case 'dropped':
      if (attacking) hud.notice('The charge was dropped. Pick it up!');
      break;
    case 'picked':
      if (attacking) hud.notice(msg.id === game.myId ? 'You picked up the charge' : `${name(msg.id)} picked up the charge`);
      break;
    case 'halftime':
      announce('halftime', { priority: 2 });
      hud.notice('Half time: teams switch sides');
      break;
  }
}

function onRound(msg) {
  game.score = msg.score;
  if (msg.phase === 'freeze') {
    game.roundWinner = undefined;
    game.lastAliveSaid = false;
    const need = modeCfg().roundsToWin - 1;
    const us = msg.score[game.team], them = msg.score[game.team === 'A' ? 'B' : 'A'];
    if (us === need && them === need) announce('final_round', { priority: 2 });
    else if (us === need) announce('match_point', { priority: 2 });
    else if (msg.n === 1) announce('match_start', { priority: 2 });
  } else if (msg.phase === 'live') {
    announce('round_start', { priority: 2 });
  } else if (msg.phase === 'end') {
    game.roundWinner = msg.winner;
    game.roundReason = msg.reason;
    const lastRound = Math.max(msg.score.A, msg.score.B) >= modeCfg().roundsToWin;
    if (msg.winner && !lastRound) announce(msg.winner === game.team ? 'round_won' : 'round_lost', { priority: 2 });
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

function announceScoreChanges(before, after, timeBefore, timeAfter, phase) {
  if (!game.team || phase !== 'live' || !modeCfg().respawn) return;
  const mine = after[game.team], theirs = after[game.team === 'A' ? 'B' : 'A'];
  const leading = mine > theirs ? true : mine < theirs ? false : game.leading;
  if (game.leading !== null && leading !== game.leading) announce(leading ? 'lead_taken' : 'lead_lost');
  game.leading = leading;

  const limit = modeCfg().killLimit;
  if (before[game.team] < limit - 10 && mine >= limit - 10) announce('ten_kills_left');
  if (before[game.team] < limit - 1 && mine >= limit - 1) announce('one_kill_left', { priority: 2 });
  if (timeBefore > 60 && timeAfter <= 60) announce('one_minute', { priority: 2 });
}

function announceLastAlive() {
  if (modeCfg().respawn || game.phase !== 'live' || game.lastAliveSaid || !me.alive) return;
  const mates = game.players.filter(p => p.tm === game.team && p.al).length;
  const enemies = game.players.filter(p => p.tm !== game.team && p.al).length;
  const teamSize = game.players.filter(p => p.tm === game.team).length;
  if (mates === 1 && enemies > 0 && teamSize > 1) {
    game.lastAliveSaid = true;
    announce('last_alive', { priority: 2 });
  }
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
  r?.soldier.fireKick?.();
  const muzzle = r ? r.soldier.muzzleWorld(new THREE.Vector3()) : new THREE.Vector3().fromArray(msg.o);
  audio.playShot(msg.w, muzzle);
  if (WEAPONS[msg.w]?.melee) return;
  effects.muzzleFlash(muzzle, null, flashSize(msg.w));
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
  const kind = arsenal.current, def = WEAPONS[kind];
  if (out.empty) {
    audio.playClick('empty');
    beginReload();
    return;
  }

  if (def.melee) {
    viewModel.slash();
    audio.playSwish(null);
  } else {
    // Pump and bolt guns cycle their action after each shot.
    viewModel.fireKick(def.fireInterval > 0.5 ? 0.6 : 0, arsenal.adsT);
    audio.playShot(kind, null);
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const worldMuzzle = eye.clone().addScaledVector(_dir, 0.7).addScaledVector(_right, 0.14).addScaledVector(_up, -0.12);
    effects.muzzleFlash(worldMuzzle, viewModel.muzzleWorld(new THREE.Vector3()), flashSize(kind));
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
  if (!def.melee && arsenal.ammo[kind].mag === 0) beginReload();
}

// Starts a reload if one is possible: first-person animation, and other players see it too.
function beginReload() {
  const kind = arsenal.current, mag = arsenal.ammo[kind]?.mag ?? 0;
  if (!arsenal.startReload()) return;
  viewModel?.startReload(WEAPONS[kind].mag - mag);
  net.send({ t: 'reload' });
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
  const canLook = playing && me.alive && (game.phase === 'live' || game.phase === 'freeze');
  const canAct = canLook && game.phase === 'live';   // freeze time: look around, don't move or shoot

  if (game.joined) {
    if (playing) handleMenuKeys();
    if (canLook) {
      me.look(input.dx, input.dy, settings.sens * arsenal.fovMult); // slower aim when zoomed
      if (!game.picker) handleWeaponKeys();
    }
    const trigger = canAct && input.mouseDown;
    const aimHeld = canAct && input.rightDown && !me.sprinting;
    // Objective: hold E to plant / defuse. The server times it; we keep the player still and kneeling.
    const action = objective && canAct ? objective.available(game.myId, game.team, me.pos, me.alive) : null;
    const using = !!action && input.down('KeyE');
    if (using !== game.usingE) { game.usingE = using; net.send({ t: 'use', on: using }); }
    if (me.alive) {
      const ev = me.update(dt, using ? KNEEL_INPUT : canAct ? input : NO_INPUT, { speedMult: arsenal.moveMult * CLASSES[game.cls].speed, sprintMult: CLASSES[game.cls].speed, aiming: arsenal.aiming, firing: trigger });
      if (ev.step) audio.playStep(null, ev.loud ? 0.9 : 0.6);
      if (ev.slide) audio.playSlide(null);
      if (ev.climb) audio.playStep(null, 1.1);
    }

    if (arsenal.update(dt, trigger, aimHeld) === 'reloaded') audio.playClick('reload');
    if (canAct && !arsenal.def.grenade && arsenal.canFire(trigger, me.sprintRecover > 0 || me.climbing)) shoot();
    updateThrow(dt, canAct);

    game.sendTimer -= dt;
    if (me.alive && game.sendTimer <= 0) {
      game.sendTimer = 1 / SEND_RATE;
      const r = v => Math.round(v * 1000) / 1000;
      net.send({ t: 's', l: me.life, p: me.pos.map(r), yw: r(me.yaw), pt: r(me.pitch + arsenal.recoil.pitch), cr: me.crouching, sl: me.sliding, w: arsenal.current });
    }
    updateCamera(dt, playing);
  } else {
    menuOrbit += dt * 0.04;
    camera.position.set(Math.sin(menuOrbit) * 46, 24, Math.cos(menuOrbit) * 46);
    camera.lookAt(0, 0, 0);
  }

  remotes.update(dt);
  objective?.update(dt, game.ob);
  grenadeView.update(dt);
  effects.update(dt);
  audio.updateListener(camera);
  if (game.joined) updateHud();
  game.prevMouse = input.mouseDown;
  game.prevRight = input.rightDown;
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
      adsT: arsenal.adsT, sprinting: me.sprinting, sliding: me.sliding, climbing: me.climbing,
    });
    renderer.clearDepth();
    renderer.render(viewScene, viewCamera);
  }
}

const NO_INPUT = { down: () => false, hit: () => false };
const KNEEL_INPUT = { down: code => code === 'KeyC', hit: () => false };

// Keys that work whether or not you're alive: class picker and team switch.
function handleMenuKeys() {
  if (input.hit('KeyB')) game.picker = !game.picker; // keys are read by their default (see keys.js)
  if (input.hit('KeyM')) net.send({ t: 'team' });
  if (!game.picker) return;
  CLASS_ORDER.forEach((cls, i) => {
    if (input.hit(`Digit${i + 1}`)) { chooseClass(cls); game.picker = false; }
  });
  if (input.hit('Escape')) game.picker = false;
}

function chooseClass(cls) {
  settings.cls = cls;
  saveSettings();
  renderClassButtons();
  if (game.joined) net.send({ t: 'class', cls });
}

function handleWeaponKeys() {
  let changed = false;
  if (game.throwing) return; // mid-throw: finish it first
  const [primary, secondary, melee, nade] = arsenal.loadout;
  if (input.hit('Digit1')) changed = arsenal.select(primary);
  if (input.hit('Digit2')) changed = arsenal.select(secondary);
  if (input.hit('Digit3')) changed = arsenal.select(melee);
  if (input.hit('Digit4')) changed = arsenal.select(nade);
  if (input.hit('KeyG') && arsenal.grenadesLeft > 0) { // quick-throw: pull it out and throw far
    changed = arsenal.select(nade) || changed;
    game.quickThrow = true;
  }
  if (input.hit('KeyQ')) changed = arsenal.select(arsenal.previous);
  if (input.wheel) changed = arsenal.cycle(input.wheel > 0 ? 1 : -1);
  if (changed) viewModel.setWeapon(arsenal.current);
  if (input.hit('KeyR')) beginReload();
}

// Alive teammates to watch after dying in Elimination (anyone alive if the team is wiped).
function spectateTarget(playing) {
  const alive = [...remotes.players.values()].filter(r => r.state?.alive);
  const pool = alive.filter(r => r.team === game.team).length ? alive.filter(r => r.team === game.team) : alive;
  if (!pool.length) return null;
  let i = pool.findIndex(r => r.id === game.specId);
  const clicked = playing && input.mouseDown && !game.prevMouse;
  if (i < 0 || clicked) i = (i + 1) % pool.length;
  game.specId = pool[i].id;
  return pool[i];
}

// Grenade throw: click → wind-up → release (server takes over the flight) → back to the previous weapon.
const _fwd = new THREE.Vector3(), _side = new THREE.Vector3(), _upv = new THREE.Vector3();
function updateThrow(dt, canAct) {
  const def = arsenal.def;
  if (!game.throwing) {
    if (!canAct || !def.grenade || arsenal.drawT < def.draw || arsenal.grenadesLeft <= 0) return;
    const far = (input.mouseDown && !game.prevMouse) || game.quickThrow;
    const lob = input.rightDown && !game.prevRight;
    if (!far && !lob) return;
    game.throwing = { far: far, t: 0, released: false };
    game.quickThrow = false;
    viewModel.throwGrenade(THROW.windup);
    audio.playThrow();
    return;
  }
  const th = game.throwing;
  th.t += dt;
  if (!th.released && th.t >= THROW.windup) {
    th.released = true;
    if (!me.alive) { game.throwing = null; return; }
    camera.getWorldDirection(_fwd);
    _side.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _upv.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const eye = new THREE.Vector3().fromArray(me.eye());
    const o = eye.addScaledVector(_fwd, 0.35).addScaledVector(_side, 0.12).addScaledVector(_upv, -0.06);
    const r = v => Math.round(v * 1000) / 1000;
    net.send({ t: 'throw', kind: arsenal.current, o: o.toArray().map(r), v: throwVelocity(_fwd.toArray(), th.far, me.vel).map(r) });
    arsenal.ammo[arsenal.current].mag--;
  }
  if (th.released && th.t >= THROW.windup + 0.45) {
    game.throwing = null;
    const back = WEAPONS[arsenal.previous]?.grenade ? arsenal.loadout[0] : arsenal.previous;
    if (arsenal.select(back) || arsenal.select(arsenal.loadout[0])) viewModel.setWeapon(arsenal.current);
  }
}

function updateCamera(dt, playing) {
  remotes.hiddenId = null;
  if (me.alive) {
    const eye = me.eye();
    camera.position.set(eye[0], eye[1], eye[2]);
    game.roll += ((me.sliding ? 0.07 : 0) - game.roll) * Math.min(1, dt * 10);
    const jolt = viewModel ? viewModel.shake.x : { x: 0, y: 0, z: 0 };
    camera.rotation.set(me.pitch + arsenal.recoil.pitch + jolt.x, me.yaw + arsenal.recoil.yaw + jolt.y, game.roll + jolt.z);
  } else {
    const deathCam = game.deathInfo && performance.now() - game.deathInfo.at < 2500;
    const spec = !modeCfg().respawn && game.phase !== 'over' && !deathCam ? spectateTarget(playing) : null;
    if (spec) {
      // Watch through the teammate's eyes.
      const s = spec.state;
      camera.position.set(s.x, s.y + (s.crouch ? PLAYER.crouchEye : PLAYER.eye), s.z);
      camera.rotation.set(s.pitch, s.yaw, 0);
      remotes.hiddenId = spec.id;
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
  }
  const fov = me.alive ? settings.fov * arsenal.fovMult : settings.fov;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

function updateHud() {
  const ammo = arsenal.ammo[arsenal.current];
  const cfg = modeCfg();
  hud.vitals(Math.max(0, me.hp | 0), arsenal.current, ammo?.mag ?? 0, ammo?.reserve ?? 0);
  const alive = team => game.players.filter(p => p.tm === team).map(p => p.al);
  hud.match(game.score, game.timeLeft, {
    goal: cfg.respawn ? `first to ${cfg.killLimit}` : `round ${game.round || 1} · first to ${cfg.roundsToWin}`,
    pips: cfg.respawn ? null : { A: alive('A'), B: alive('B') },
  });
  const spread = arsenal.spread(me.speed(), me.onGround, me.crouching);
  // Dynamic crosshair: the gap shows the current spread. Static: always the same.
  const px = settings.crosshair === 'dynamic' ? (spread / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * (innerHeight / 2) : 0;
  hud.crosshair(px, me.alive && !WEAPONS[arsenal.current].melee && arsenal.adsT < 0.3 && !me.sprinting);
  hud.scope(me.alive && !!arsenal.def.ads?.scope && arsenal.adsT > 0.9);
  hud.reticle(me.alive && hasOptic(arsenal.current) && arsenal.adsT > 0.85 && arsenal.reloadT < 0);
  hud.scoreboard(input.down('Tab') || game.phase === 'over', game.players, game.myId, game.score);
  hud.classPicker(game.picker, settings.cls);
  updateObjectiveHud();
  const nadeLeft = arsenal.grenadesLeft;
  hud.grenade(nadeLeft && !arsenal.def.grenade ? `${WEAPONS[arsenal.grenade].name} ×${nadeLeft} · G` : '');
  let blind = 0;
  if (game.blind) {
    const t = (performance.now() - game.blind.at) / 1000, { amount, seconds } = game.blind;
    // Fully white for the first half, then clears; a strong flash stays opaque even below 1.
    const hold = seconds * 0.5;
    blind = Math.min(1, amount * 1.3) * (t < hold ? 1 : Math.max(0, 1 - (t - hold) / (seconds - hold)));
    if (t > seconds) game.blind = null;
  }
  hud.flash(blind);
  hud.smoke(game.joined ? grenadeView.smokeAt(camera.position) : 0);

  let msg = '';
  const color = team => TEAMS[team].css;
  if (game.phase === 'over') {
    const w = game.winner;
    const title = w ? `${TEAMS[w].name} win` : 'Draw';
    msg = `<span class="big" style="color:${w ? color(w) : 'inherit'}">${title}</span><small>Next match in ${game.timeLeft}s</small>`;
  } else if (game.phase === 'roundEnd') {
    const w = game.roundWinner;
    const title = w ? `<span style="color:${color(w)}">${TEAMS[w].name}</span> win the round` : 'Round draw';
    const why = { detonated: 'The charge detonated', defused: 'The charge was defused', time: 'Time ran out' }[game.roundReason];
    msg = `${title}<small>${why ? why + ' · ' : ''}Next round in ${game.timeLeft}s</small>`;
  } else if (game.phase === 'freeze') {
    const role = game.mode === 'obj' && game.ob
      ? (game.ob.att === game.team ? 'Attack: plant the charge at A or B' : 'Defend sites A and B') + ' · ' : '';
    msg = `Round ${game.round}<small>${role}Starts in ${game.timeLeft}s · press ${keyName('classMenu')} to change class</small>`;
  } else if (!me.alive && cfg.respawn && game.deathInfo) {
    const left = Math.max(0, Math.ceil(PLAYER.respawnTime - (performance.now() - game.deathInfo.at) / 1000));
    msg = `${killedBy()}<small>Respawning in ${left}s</small>`;
  } else if (!me.alive && !cfg.respawn) {
    const spec = remotes.hiddenId && playerById(remotes.hiddenId);
    if (spec) msg = `Spectating <span style="color:${color(spec.tm)}">${escapeHtml(spec.n)}</span><small>Click to switch player</small>`;
    else if (game.deathInfo) msg = `${killedBy()}<small>Waiting for the next round</small>`;
    else msg = 'Waiting for the next round';
  } else if (!input.locked) {
    msg = 'Click to resume';
  }
  hud.message(msg);
}

function updateObjectiveHud() {
  const ob = game.mode === 'obj' ? game.ob : null;
  if (!ob) { hud.objective(''); hud.usePrompt(''); hud.useProgress(null); return; }
  const attacking = ob.att === game.team;
  const role = `<span class="role">${attacking ? 'Attack' : 'Defend'}</span>`;
  const clock = s => `${Math.floor(s / 60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`;
  let text, danger = false;
  if (ob.planted) {
    text = `Charge planted at ${ob.planted.site} · ${clock(ob.planted.left)}`;
    danger = !attacking;
    if (!attacking) text += ' · defuse it!';
  } else if (!attacking) {
    text = 'Stop the charge from being planted at A or B';
  } else if (ob.carrier === game.myId) {
    text = 'You carry the charge · plant it at A or B';
  } else if (ob.carrier) {
    text = `Charge carried by ${escapeHtml(playerById(ob.carrier)?.n || 'a teammate')}`;
  } else if (ob.dropped) {
    text = 'The charge is on the ground · pick it up';
  } else {
    text = 'Plant the charge at A or B';
  }
  hud.objective(role + text, danger);

  const action = objective?.available(game.myId, game.team, me.pos, me.alive && game.phase === 'live');
  const mine = ob.act && ob.act.id === game.myId;
  hud.useProgress(mine ? (ob.act.kind === 'plant' ? 'Planting…' : 'Defusing…') : null, mine ? ob.act.p : 0);
  hud.usePrompt(action && !mine ? `Hold <kbd>${keyName('use')}</kbd> to ${action}` : '');
}

function killedBy() {
  const k = game.deathInfo?.killer;
  return k ? `Killed by <span style="color:${TEAMS[k.tm].css}">${escapeHtml(k.n)}</span>` : 'You died';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
}

// ---------------------------------------------------------------- menu

const menu = document.getElementById('menu');
const status = document.getElementById('menu-status');
const playBtn = document.getElementById('play');
const fields = { name: 'name', sens: 'sens', fov: 'fov', vol: 'vol', announcer: 'announcer', graphics: 'graphics', crosshair: 'crosshair-style' };
const TEXT_FIELDS = new Set(['name', 'announcer', 'graphics', 'crosshair']);

for (const [key, id] of Object.entries(fields)) {
  const el = document.getElementById(id);
  const out = document.getElementById(`${id}-out`);
  el.value = settings[key];
  const show = () => { if (out) out.textContent = key === 'vol' ? `${Math.round(el.value * 100)}%` : el.value; };
  show();
  el.addEventListener('input', () => {
    settings[key] = TEXT_FIELDS.has(key) ? el.value : Number(el.value);
    show();
    if (key === 'vol') audio.setVolume(settings.vol);
    if (key === 'announcer') setAnnouncerMode(settings.announcer);
    if (key === 'graphics') applyGraphics();
    saveSettings();
  });
}

// Key bindings: click a key, then press the new one (Esc cancels).
const keyList = document.getElementById('key-list');
let rebinding = null;
function renderKeys() {
  keyList.innerHTML = ACTIONS.map(a => `<dt><button type="button" class="bind${rebinding === a.id ? ' waiting' : ''}" data-action="${a.id}">${
    rebinding === a.id ? 'Press a key…' : escapeHtml(keyLabel(keyFor(a.id)))}</button></dt><dd>${a.label}</dd>`).join('');
}
keyList.addEventListener('click', e => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  rebinding = rebinding === b.dataset.action ? null : b.dataset.action;
  renderKeys();
});
addEventListener('keydown', e => {
  if (!rebinding) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.code !== 'Escape' && !RESERVED.test(e.code)) {
    settings.keys = bindKey(rebinding, e.code);
    saveSettings();
  }
  rebinding = null;
  renderKeys();
}, true);
document.getElementById('keys-reset').addEventListener('click', () => {
  settings.keys = setBindings({});
  saveSettings();
  rebinding = null;
  renderKeys();
});
renderKeys();

// Class buttons in the menu
const classButtons = document.getElementById('class-buttons');
classButtons.innerHTML = CLASS_ORDER.map(c =>
  `<button type="button" data-cls="${c}"><b>${CLASSES[c].name}</b><span>${WEAPONS[CLASSES[c].primary].name}</span></button>`).join('');
classButtons.addEventListener('click', e => {
  const b = e.target.closest('button[data-cls]');
  if (b) chooseClass(b.dataset.cls);
});
function renderClassButtons() {
  for (const b of classButtons.children) b.classList.toggle('active', b.dataset.cls === settings.cls);
}
renderClassButtons();

// Host controls (only for whoever plays on the Mac running the server)
const hostPanel = document.getElementById('host-panel');
const hostMode = document.getElementById('host-mode');
hostMode.innerHTML = MODE_ORDER.map(m => `<option value="${m}">${MODES[m].name}</option>`).join('');
hostMode.addEventListener('change', () => net.send({ t: 'host', mode: hostMode.value }));
const hostEven = document.getElementById('host-even');
hostEven.addEventListener('change', () => net.send({ t: 'host', even: hostEven.checked }));
const hostMap = document.getElementById('host-map');
hostMap.innerHTML = MAP_ORDER.map(m => `<option value="${m}">${MAPS[m].name}</option>`).join('');
hostMap.addEventListener('change', () => net.send({ t: 'host', map: hostMap.value }));
document.getElementById('host-restart').addEventListener('click', () => net.send({ t: 'host', restart: true }));
function updateHostPanel() {
  hostPanel.classList.toggle('hidden', !game.host);
  hostMode.value = game.mode;
  hostMap.value = MAP.id;
  hostEven.checked = game.even !== false;
  document.querySelector('.tagline').textContent = `LAN team shooter · ${MODES[game.mode].name} · ${MAP.name}`;
}

function showMenu(text = '') {
  menu.classList.remove('hidden');
  status.textContent = text;
  updateHostPanel();
  teamKey = '';
  renderTeamButtons();
}

// Team buttons in the menu, once in a game: your team is highlighted, click the other to switch.
const teamButtons = document.getElementById('team-buttons');
let teamKey = '';
function renderTeamButtons() {
  teamButtons.parentElement.classList.toggle('hidden', !game.joined);
  if (!game.joined) return;
  const count = t => (game.players || []).filter(p => p.tm === t).length;
  const key = `${game.team}${count('A')}:${count('B')}`;
  if (key === teamKey) return;
  teamKey = key;
  teamButtons.innerHTML = Object.entries(TEAMS).map(([t, info]) =>
    `<button type="button" data-team="${t}" class="${t === game.team ? 'active' : ''}" style="--team:${info.css}">` +
    `<b>${info.name}</b><span>${count(t)} player${count(t) === 1 ? '' : 's'}${t === game.team ? ' · your team' : ''}</span></button>`).join('');
}
teamButtons.addEventListener('click', e => {
  const b = e.target.closest('button[data-team]');
  if (b && b.dataset.team !== game.team) net.send({ t: 'team' });
});

let connecting = null;
playBtn.addEventListener('click', async () => {
  audio.initAudio(settings.vol);
  if (!connecting) {
    const { ctx, master } = audio.audioGraph();
    setAnnouncerMode(settings.announcer);
    initAnnouncer(ctx, master, text => hud.announce(text));
    playBtn.disabled = true;
    status.textContent = 'Connecting…';
    connecting = net.connect().then(() => net.send({ t: 'join', name: settings.name, cls: settings.cls }));
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
  if (input.locked || !game.joined) return;
  if (game.picker) { game.picker = false; menu.classList.add('hidden'); return; } // Esc just closes the picker
  showMenu(`Paused · the match keeps running · ping ${net.ping} ms`);
});

hud.message('');
requestAnimationFrame(frame);

// Load the real models before anyone can join; the game falls back to stand-ins without them.
playBtn.disabled = true;
loadAssets((done, total) => { status.textContent = `Loading models… ${done}/${total}`; }).then(a => {
  playBtn.disabled = false;
  status.textContent = a.ready ? '' : 'Using stand-in models (run /dev/build.html on the host to build the real ones).';
  renderCredits(a.manifest);
  objective = new ObjectiveView(scene, effects);
});

function renderCredits(manifest) {
  const list = document.getElementById('credits-list');
  const items = { ...(manifest?.weapons || {}), ...(manifest?.props || {}) };
  const rows = Object.entries(items).map(([kind, w]) => {
    const c = w.credit || {};
    const author = escapeHtml((c.author || 'unknown').replace(/\s*\(.*\)$/, ''));
    const label = WEAPONS[kind]?.name || kind[0].toUpperCase() + kind.slice(1);
    return `<li><b>${escapeHtml(label)}</b>: “${escapeHtml(c.title || '')}” by ${author}` +
      (c.source ? ` · <a href="${escapeHtml(c.source)}" target="_blank" rel="noopener">source</a>` : '') +
      ` · ${escapeHtml((c.license || '').split(' ')[0])}</li>`;
  });
  rows.push('<li><b>Characters and animations</b>: Mixamo (Adobe)</li>');
  list.innerHTML = rows.join('');
  photoTextures.then(t => {
    if (!t) return;
    const ids = Object.values(t).map(x => `<a href="${escapeHtml(x.source)}" target="_blank" rel="noopener">${escapeHtml(x.id)}</a>`);
    list.insertAdjacentHTML('beforeend', `<li><b>Map textures</b>: ambientCG (${ids.join(', ')}) · CC0</li>`);
  });
}

// Handy for poking at the game from the browser console.
window.qapishma = { THREE, game, me, arsenal, input, remotes, camera, viewCamera, viewScene, effects, get viewModel() { return viewModel; }, get objective() { return objective; }, grenadeView };
