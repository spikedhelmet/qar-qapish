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
}

export function setVolume(v) { if (master) master.gain.value = v; }

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

export function playClick(kind) {
  if (!ctx) return;
  const presets = {
    hit: { dur: 0.05, freq: 2400, q: 6, type: 'bandpass', gain: 0.5 },
    head: { dur: 0.12, freq: 4200, q: 12, type: 'bandpass', gain: 0.7 },
    kill: { dur: 0.25, freq: 1500, q: 10, type: 'bandpass', gain: 0.6 },
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
