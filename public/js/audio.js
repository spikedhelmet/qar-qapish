// Synthesized stand-in sounds with 3D positioning. Recorded sounds can replace these later.
import * as THREE from 'three';

let ctx = null, master = null, noise = null;

export function initAudio(volume) {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  loadUiSounds();
}

// Hit / headshot / kill confirmations: your own files in public/assets/sounds/ui/ (hit, head, kill:
// .ogg, .mp3, .wav or .m4a) play instead of the built-in ones below.
const uiSounds = {};
async function loadUiSounds() {
  try {
    const files = await (await fetch('/api/sounds/ui')).json();
    await Promise.all(files.map(async f => {
      const id = f.replace(/\.[^.]+$/, '');
      uiSounds[id] = await ctx.decodeAudioData(await (await fetch('/assets/sounds/ui/' + encodeURIComponent(f))).arrayBuffer());
    }));
  } catch { /* none added */ }
}

// A pure tone with a fast attack and an exponential fade (bell-like when partials are stacked).
function ping(dest, freq, dur, gain, at = 0) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
}

export function setVolume(v) { if (master) master.gain.value = v; }

export function audioGraph() { return { ctx, master }; }

const fwd = new THREE.Vector3(), up = new THREE.Vector3();
export function updateListener(camera) {
  if (!ctx) return;
  const l = ctx.listener, p = camera.position;
  camera.getWorldDirection(fwd);
  up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  if (l.positionX) {
    l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
    l.forwardX.value = fwd.x; l.forwardY.value = fwd.y; l.forwardZ.value = fwd.z;
    l.upX.value = up.x; l.upY.value = up.y; l.upZ.value = up.z;
  } else {
    l.setPosition(p.x, p.y, p.z);
    l.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
  }
}

// Output node: positioned in the world, or straight to the speakers for the local player.
function output(pos) {
  if (!pos) return master;
  const p = ctx.createPanner();
  p.panningModel = 'HRTF';
  p.distanceModel = 'inverse';
  p.refDistance = 4;
  p.rolloffFactor = 1.1;
  p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
  p.connect(master);
  return p;
}

function burst(dest, { dur, freq, q = 0.8, type = 'lowpass', gain = 1, attack = 0.002, sweep = 0 }) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.7 + Math.random() * 0.6;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}

function thump(dest, { freq, dur, gain }) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
}

const SHOTS = {
  rifle: { crack: 2600, dur: 0.22, boom: 95, gain: 0.9 },
  pistol: { crack: 3200, dur: 0.16, boom: 130, gain: 0.7 },
  smg: { crack: 3000, dur: 0.14, boom: 120, gain: 0.7 },
  shotgun: { crack: 1500, dur: 0.38, boom: 65, gain: 1.0 },
  sniper: { crack: 2200, dur: 0.5, boom: 55, gain: 1.1 },
  vsk: { crack: 1400, dur: 0.16, boom: 70, gain: 0.55 }, // suppressed: a dull thud
  makarov: { crack: 3300, dur: 0.14, boom: 140, gain: 0.6 },
};

export function playShot(weapon, pos) {
  if (!ctx) return;
  if (weapon === 'knife') { playSwish(pos); return; }
  const s = SHOTS[weapon] || SHOTS.rifle;
  const out = output(pos);
  burst(out, { dur: s.dur, freq: s.crack, q: 0.5, gain: s.gain, sweep: 0.15 });
  burst(out, { dur: s.dur * 2.5, freq: 900, q: 0.3, gain: s.gain * 0.35, sweep: 0.3 }); // tail
  thump(out, { freq: s.boom, dur: 0.18, gain: s.gain * 0.8 });
}

export function playSwish(pos) {
  if (!ctx) return;
  burst(output(pos), { dur: 0.18, freq: 1800, q: 2, type: 'bandpass', gain: 0.35, attack: 0.06, sweep: 0.4 });
}

export function playStep(pos, loud = 1) {
  if (!ctx) return;
  const out = output(pos);
  burst(out, { dur: 0.09, freq: 420, q: 1.2, gain: 0.25 * loud });
  thump(out, { freq: 70, dur: 0.07, gain: 0.25 * loud });
}

// Charge beep: a short tone from where the charge is.
export function playBeep(pos, urgent = false) {
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = urgent ? 2600 : 2100;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 4000;
  o.connect(f).connect(g).connect(output(pos));
  o.start(t); o.stop(t + 0.08);
}

export function playExplosion(pos) {
  if (!ctx) return;
  const out = output(pos);
  burst(out, { dur: 2.2, freq: 900, q: 0.4, gain: 1.6, attack: 0.004, sweep: 0.08 });
  burst(out, { dur: 0.35, freq: 3000, q: 0.3, gain: 1.0, sweep: 0.2 });
  thump(out, { freq: 70, dur: 1.2, gain: 1.6 });
}

// ---------------------------------------------------------------- grenades

export function playThrow() {
  if (!ctx) return;
  burst(master, { dur: 0.25, freq: 1200, q: 1.5, type: 'bandpass', gain: 0.3, attack: 0.08, sweep: 0.5 });
}

export function playClink(pos, strength = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, out = output(pos);
  for (const f of [2900, 4300]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f * (0.95 + Math.random() * 0.1);
    g.gain.setValueAtTime(0.12 * strength, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.13);
  }
}

export function playFrag(pos) {
  if (!ctx) return;
  const out = output(pos);
  burst(out, { dur: 1.2, freq: 1100, q: 0.4, gain: 1.3, attack: 0.003, sweep: 0.1 });
  burst(out, { dur: 0.25, freq: 3500, q: 0.3, gain: 0.8, sweep: 0.2 });
  thump(out, { freq: 85, dur: 0.6, gain: 1.3 });
}

export function playSmoke(pos, duration) {
  if (!ctx) return;
  const out = output(pos);
  burst(out, { dur: 0.15, freq: 900, q: 1, gain: 0.5 });                                  // pop
  const t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise; src.loop = true;
  f.type = 'highpass'; f.frequency.value = 2500;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.3);
  g.gain.setValueAtTime(0.18, t + duration * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration * 0.6);                     // hiss fades as it empties
  src.connect(f).connect(g).connect(out);
  src.start(t); src.stop(t + duration * 0.6 + 0.1);
}

export function playFlashBang(pos) {
  if (!ctx) return;
  const out = output(pos);
  burst(out, { dur: 0.5, freq: 4000, q: 0.3, gain: 1.4, attack: 0.002, sweep: 0.3 });
  thump(out, { freq: 140, dur: 0.3, gain: 1.0 });
}

// Flashbang deafness: game sound drops away, then slowly returns. The ear ring plays on top.
export function deafen(amount, seconds) {
  if (!ctx) return;
  const t = ctx.currentTime, g = master.gain, normal = g.value;
  g.cancelScheduledValues(t);
  g.setValueAtTime(normal, t);
  g.linearRampToValueAtTime(normal * (1 - 0.85 * amount), t + 0.05);
  g.setValueAtTime(normal * (1 - 0.85 * amount), t + seconds * 0.5);
  g.linearRampToValueAtTime(normal, t + seconds);
}

// High-pitched ringing after being flashed; amount 0..1.
export function playEarRing(amount, seconds) {
  if (!ctx || amount <= 0) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = 3800;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12 * amount * master.gain.value + 0.0001, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  o.connect(g).connect(ctx.destination); // bypasses the deafened master volume
  o.start(t); o.stop(t + seconds + 0.05);
}

// Reload steps: magazine out / in, bolt or slide rack, shotgun shell.
export function playMech(kind) {
  if (!ctx) return;
  const presets = {
    magOut: [{ dur: 0.06, freq: 1800, q: 3, type: 'bandpass', gain: 0.35 }, { dur: 0.12, freq: 600, q: 1, gain: 0.2 }],
    magIn:  [{ dur: 0.05, freq: 2600, q: 4, type: 'bandpass', gain: 0.45 }, { dur: 0.08, freq: 900, q: 1, gain: 0.3 }],
    rack:   [{ dur: 0.07, freq: 2200, q: 3, type: 'bandpass', gain: 0.45 }, { dur: 0.06, freq: 3400, q: 5, type: 'bandpass', gain: 0.35, attack: 0.09 }],
    shell:  [{ dur: 0.05, freq: 1400, q: 3, type: 'bandpass', gain: 0.35 }],
  }[kind];
  for (const p of presets || []) burst(master, p);
}

export function playSlide(pos) {
  if (!ctx) return;
  burst(output(pos), { dur: 0.7, freq: 900, q: 0.7, gain: 0.3, attack: 0.04, sweep: 0.35 });
}

// Hit confirmation: a short dry tick. Headshot: a bright metallic tink on top. Kill: a clear ding.
export function playConfirm(kind) {
  if (!ctx) return;
  if (uiSounds[kind]) {
    const src = ctx.createBufferSource();
    src.buffer = uiSounds[kind];
    src.connect(master);
    src.start();
    return;
  }
  burst(master, { dur: 0.018, freq: 5200, q: 0.7, type: 'highpass', gain: 0.18 });
  ping(master, 1850, 0.045, 0.22);
  if (kind === 'head') { ping(master, 3150, 0.22, 0.14); ping(master, 4730, 0.16, 0.08); }
  if (kind === 'kill') {
    ping(master, 1320, 0.55, 0.2, 0.03); ping(master, 2650, 0.32, 0.09, 0.03); ping(master, 3960, 0.18, 0.05, 0.03);
    thump(master, { freq: 150, dur: 0.09, gain: 0.25 });
  }
}

export function playClick(kind) {
  if (!ctx) return;
  const presets = {
    reload: { dur: 0.04, freq: 3000, q: 4, type: 'bandpass', gain: 0.35 },
    empty: { dur: 0.03, freq: 5000, q: 6, type: 'bandpass', gain: 0.3 },
    hurt: { dur: 0.15, freq: 500, q: 1, type: 'lowpass', gain: 0.5 },
  };
  burst(master, presets[kind]);
}

export function playImpact(pos) {
  if (!ctx) return;
  burst(output(pos), { dur: 0.06, freq: 1800, q: 1.5, type: 'bandpass', gain: 0.25 });
}
