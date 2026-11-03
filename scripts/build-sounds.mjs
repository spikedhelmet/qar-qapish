// Builds the game's recorded sounds from the packs in assets-src/sounds/ (scripts/fetch-sounds.sh
// downloads them). Each sound is cut from its source, faded out, leveled, and saved as a small mono
// .m4a in public/assets/game/sounds/, with sounds.json listing the variants of each sound.
// Uses macOS's built-in afconvert. Run from the project folder: node scripts/build-sounds.mjs
//   node scripts/build-sounds.mjs --segments <file>   lists the separate sounds inside a recording
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SRC = 'assets-src/sounds', OUT = 'public/assets/game/sounds', RATE = 44100;
const GUNS = `${SRC}/firearms/Prepared SFX Library`;
const KENNEY = `${SRC}/kenney-impact/kenney-impact-sounds-for-godot-main/addons/kenney impact sounds`;
const MELEE = `${SRC}/combat-150/01_combat_melee`, BOOM = `${SRC}/combat-150/03_explosions_destruction`;
const five = (name) => [0, 1, 2, 3, 4].map(i => `${KENNEY}/${name}_00${i}.ogg`);
// Up to three of the separate shots in a gun recording (they're seconds apart), as variants.
const gun = (file, len, gain = 0) => [0, 1, 2].map(shot => ({ src: `${GUNS}/${file}`, shot, len, gain }));

// id: [{ src, seg (which sound in the recording, see --segments) or shot (which gunshot), len (max seconds),
//        at/to (seconds, instead of seg), gain (dB) }]. Without seg/shot/at: from the recording's first sound.
const SOUNDS = {
  // Gunshots: the near take, and the mid-distance take for far away.
  shot_rifle: gun('AK-47/C_28P.wav', 1.4),
  far_rifle: gun('AK-47/C_31P.wav', 1.6),
  shot_vsk: gun('SKS/U_14P.wav', 1.2, -5),
  far_vsk: gun('SKS/U_19P.wav', 1.4, -5),
  shot_sniper: gun('Mosin Nagant/M_21P.wav', 2.2),
  far_sniper: gun('Mosin Nagant/M_26P.wav', 2.4),
  shot_pistol: gun('Walther PPQ/X_39P.wav', 1.0, -2),
  far_pistol: gun('Walther PPQ/X_31P.wav', 1.2, -2),
  shot_makarov: gun('Bersa/F_47P.wav', 1.0, -3),
  far_makarov: gun('Bersa/F_41P.wav', 1.2, -3),
  shot_smg: gun('Carl Gustav M45/G_31P.wav', 0.9, -2),
  far_smg: gun('Carl Gustav M45/G_20P.wav', 1.2, -2),
  shot_shotgun: gun('Nova/O_21P.wav', 1.6),
  far_shotgun: gun('Nova/O_17P.wav', 1.8),
  // Reloads
  magOut: [{ src: `${SRC}/handgun-reload/reload.wav`, seg: 0, len: 0.5, gain: -4 }],
  magIn: [{ src: `${SRC}/handgun-reload/reload.wav`, seg: 1, len: 0.5, gain: -4 }],
  rack: [{ src: `${SRC}/handgun-reload/reload.wav`, seg: 2, len: 0.6, gain: -4 }],
  pump: [{ src: `${SRC}/shotgun-reload/ShotgunSounds/Rack.mp3`, len: 0.8, gain: -4 }],
  shell: [{ src: `${SRC}/shotgun-reload/ShotgunSounds/Subsequent Shells.mp3`, len: 0.5, gain: -6 }],
  empty: [{ src: `${SRC}/equipment-clicks/equipmentclicks.wav`, seg: 0, len: 0.15, gain: -8 }],
  // Knife, grenades, explosions
  swish: [1, 2, 3, 4].map(i => ({ src: `${SRC}/swishes/swishes/swish-${i}.wav`, len: 0.4, gain: -8 })),
  clink: ['clink1_0', 'clink2', 'clink3'].map(n => ({ src: `${SRC}/metal-impact/${n}.wav`, len: 0.4, gain: -10 })),
  frag: [{ src: `${BOOM}/explosion_crunch_004_48kHz_16bit_1.98s_b6838d5c_s04.wav`, len: 2 }, { src: `${BOOM}/explosion_crunch_003_48kHz_16bit_1.55s_4b973e9c_s04.wav`, len: 1.6 }],
  charge: [{ src: `${BOOM}/low_frequency_explosion_000_48kHz_16bit_2s_84586419_s04.wav`, len: 2 }],
  flash: [{ src: `${SRC}/flash-bang/flash_bang.wav`, len: 1.6, gain: -2 }],
  // Footsteps by surface, landing, bullet impacts
  step_concrete: five('footstep_concrete').map(src => ({ src, len: 0.3, gain: -6 })),
  step_wood: five('footstep_wood').map(src => ({ src, len: 0.3, gain: -6 })),
  step_grass: five('footstep_grass').map(src => ({ src, len: 0.3, gain: -6 })),
  step_metal: five('impact_plate_light').map(src => ({ src, len: 0.25, gain: -12 })),
  land: five('impact_soft_heavy').map(src => ({ src, len: 0.4, gain: -6 })),
  hit_concrete: five('impact_mining').map(src => ({ src, len: 0.35, gain: -8 })),
  hit_wood: five('impact_wood_light').map(src => ({ src, len: 0.35, gain: -8 })),
  hit_metal: five('impact_metal_light').map(src => ({ src, len: 0.35, gain: -10 })),
  hit_body: five('impact_punch_medium').map(src => ({ src, len: 0.3, gain: -6 })),
};

const tmp = join(tmpdir(), 'qapishma-sounds');
mkdirSync(tmp, { recursive: true });

// Any source → mono 16-bit samples (Float32Array), via afconvert.
function decode(src) {
  const wav = join(tmp, 'in.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', `LEI16@${RATE}`, '-c', '1', src, wav]);
  const buf = readFileSync(wav);
  let p = 12;
  while (buf.toString('ascii', p, p + 4) !== 'data') p += 8 + buf.readUInt32LE(p + 4);
  const n = buf.readUInt32LE(p + 4) / 2, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(p + 8 + i * 2) / 32768;
  return out;
}

// Separate sounds in a recording: stretches louder than 6% of its peak, split by 80 ms of quiet.
function segments(x) {
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0), on = peak * 0.06, gap = RATE * 0.08;
  const out = [];
  let start = -1, last = -1;
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(x[i]) < on) continue;
    if (start < 0 || i - last > gap) { if (start >= 0) out.push([start, last]); start = i; }
    last = i;
  }
  if (start >= 0) out.push([start, last]);
  return out;
}

// Gunshots: sounds starting at least a second after the previous shot (skips each shot's echo).
function shots(x) {
  const out = [];
  for (const [a] of segments(x)) if (!out.length || a - out[out.length - 1] > RATE) out.push(a);
  return out;
}

function cut(x, { seg = 0, shot, len = 1, at, to, gain = 0 }) {
  let a, b;
  if (at !== undefined) { a = Math.round(at * RATE); b = Math.round((to ?? at + len) * RATE); }
  else {
    const start = shot !== undefined ? (shots(x)[shot] ?? shots(x)[0]) : segments(x)[seg][0];
    a = Math.max(0, start - RATE * 0.004); b = a + len * RATE;
  }
  const y = x.slice(a, Math.min(x.length, b));
  const fade = Math.min(y.length, Math.round(y.length * 0.35)), fin = Math.min(y.length, RATE * 0.002);
  for (let i = 0; i < fin; i++) y[i] *= i / fin;
  for (let i = 0; i < fade; i++) y[y.length - 1 - i] *= (i / fade) ** 2;
  const peak = y.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9), k = (0.89 / peak) * 10 ** (gain / 20); // -1 dB peak, then gain
  for (let i = 0; i < y.length; i++) y[i] *= k;
  return y;
}

function encode(y, file) {
  const wav = join(tmp, 'out.wav'), buf = Buffer.alloc(44 + y.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + y.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(y.length * 2, 40);
  for (let i = 0; i < y.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, y[i])) * 32767), 44 + i * 2);
  writeFileSync(wav, buf);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '96000', wav, file]);
}

if (process.argv[2] === '--segments') {
  const x = decode(process.argv[3]);
  console.log(`${(x.length / RATE).toFixed(2)} s`);
  segments(x).forEach(([a, b], i) => console.log(i, (a / RATE).toFixed(3), '…', (b / RATE).toFixed(3)));
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const manifest = {};
for (const [id, list] of Object.entries(SOUNDS)) {
  manifest[id] = list.map((v, i) => {
    const spec = typeof v === 'string' ? { src: v } : v, file = `${id}_${i}.m4a`;
    encode(cut(decode(spec.src), spec), join(OUT, file));
    return file;
  });
}
writeFileSync(join(OUT, 'sounds.json'), JSON.stringify(manifest, null, 1) + '\n');
const bytes = readdirSync(OUT).reduce((n, f) => n + readFileSync(join(OUT, f)).length, 0);
console.log(`${Object.keys(manifest).length} sounds, ${Object.values(manifest).flat().length} files, ${(bytes / 1e6).toFixed(1)} MB in ${OUT}`);
