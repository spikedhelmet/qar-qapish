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
// The team's own downloads (assets-src/sounds/new/, not fetched by script): "FREE FPS SFX Pack" and others.
const NEW = `${SRC}/new`, FPS = `${NEW}/fps-pack`;
const nums = (n, f) => Array.from({ length: n }, (_, i) => f(String(i + 1).padStart(3, '0')));
const five = (name) => [0, 1, 2, 3, 4].map(i => `${KENNEY}/${name}_00${i}.ogg`);
// Up to three of the separate shots in a gun recording (they're seconds apart), as variants. The
// recordings are stereo from two mics; most guns use the louder mic alone, because mixing the two
// cancels part of the sound (it comes out hollow). The AK mixes well.
const gun = (file, len, gain = 0, ch = 'loud') => [0, 1, 2].map(shot => ({ src: `${GUNS}/${file}`, shot, len, gain, ch }));
const PUNCH = [0, 1, 2, 3, 4].map(i => readdirSync(MELEE).find(f => f.startsWith(`impact_punch_heavy_00${i}`)));

// id: [{ src, seg (which sound in the recording, see --segments) or shot (which gunshot), len (max seconds),
//        at/to (seconds, instead of seg), gain (dB), ch ('mix', or 'loud': the louder channel alone),
//        lowpass (Hz), fadeIn (seconds) }]. Without seg/shot/at: from the recording's first sound.
const SOUNDS = {
  // Gunshots: the near take, and the mid-distance take for far away.
  shot_rifle: gun('AK-47/C_28P.wav', 1.4, 0, 'mix'),
  far_rifle: gun('AK-47/C_31P.wav', 1.6, 0, 'mix'),
  shot_vsk: gun('SKS/U_14P.wav', 1.2, -5),
  far_vsk: gun('SKS/U_19P.wav', 1.4, -5),
  shot_sniper: gun('Mosin Nagant/M_21P.wav', 2.2),
  far_sniper: gun('Mosin Nagant/M_26P.wav', 2.4),
  shot_pistol: gun('1911/A_42P.wav', 1.1, -2),
  far_pistol: gun('1911/A_34P.wav', 1.2, -2),
  shot_makarov: gun('Bersa/F_47P.wav', 1.0, -3),
  far_makarov: gun('Bersa/F_41P.wav', 1.2, -3),
  shot_smg: gun('Carl Gustav M45/G_31P.wav', 0.9, -2),
  far_smg: gun('Carl Gustav M45/G_20P.wav', 1.2, -2),
  shot_shotgun: nums(4, n => ({ src: `${FPS}/Shotgun_Shot-${n}.wav`, len: 0.75 })),
  far_shotgun: nums(4, n => ({ src: `${FPS}/Shotgun_Shot-${n}.wav`, len: 0.75, lowpass: 2200, gain: -4 })),
  // Reloads
  magOut: [{ src: `${SRC}/handgun-reload/reload.wav`, seg: 0, len: 0.5, gain: -4 }],
  magIn: [{ src: `${SRC}/handgun-reload/reload.wav`, seg: 1, len: 0.5, gain: -4 }],
  rack: [{ src: `${SRC}/handgun-reload/reload.wav`, seg: 2, len: 0.6, gain: -4 }],
  pump: [{ src: `${FPS}/Shotgun_Pump.wav`, len: 0.72, gain: -3 }],
  scope: [{ src: `${FPS}/Sniper_Scope .wav`, len: 0.54, gain: -6 }],
  shell: [{ src: `${SRC}/shotgun-reload/ShotgunSounds/Subsequent Shells.mp3`, len: 0.5, gain: -6 }],
  empty: [{ src: `${SRC}/equipment-clicks/equipmentclicks.wav`, seg: 0, len: 0.15, gain: -8 }],
  // Knife, grenades, explosions
  swish: [1, 2, 3, 4].map(i => ({ src: `${SRC}/swishes/swishes/swish-${i}.wav`, len: 0.4, gain: -8 })),
  clink: ['clink1_0', 'clink2', 'clink3'].map(n => ({ src: `${SRC}/metal-impact/${n}.wav`, len: 0.4, gain: -10 })),
  frag: [{ src: `${BOOM}/explosion_crunch_004_48kHz_16bit_1.98s_b6838d5c_s04.wav`, len: 2 }, { src: `${BOOM}/explosion_crunch_003_48kHz_16bit_1.55s_4b973e9c_s04.wav`, len: 1.6 }],
  charge: [{ src: `${BOOM}/low_frequency_explosion_000_48kHz_16bit_2s_84586419_s04.wav`, len: 2 }],
  flash: [{ src: `${SRC}/flash-bang/flash_bang.wav`, len: 1.6, gain: -2 }],
  // Footsteps by surface, landing, bullet impacts
  // Footsteps are softened: the click at the start of each step is cut down (lowpass, slower fade-in).
  step_concrete: nums(17, n => ({ src: `${FPS}/Footstep_Boot_Concrete-${n}.wav`, len: 0.32, gain: -8, lowpass: 3500, fadeIn: 0.004 })),
  step_wood: five('footstep_wood').map(src => ({ src, len: 0.3, gain: -9, lowpass: 1600, fadeIn: 0.008 })),
  step_grass: five('footstep_grass').map(src => ({ src, len: 0.3, gain: -9, lowpass: 1800, fadeIn: 0.008 })),
  step_metal: five('impact_plate_light').map(src => ({ src, len: 0.25, gain: -14, lowpass: 2500, fadeIn: 0.006 })),
  land: five('impact_soft_heavy').map(src => ({ src, len: 0.4, gain: -6 })),
  jump: [{ src: `${FPS}/Player_Jump.wav`, len: 0.6, gain: -6 }],
  hit_concrete: five('impact_mining').map(src => ({ src, len: 0.35, gain: -8 })),
  hit_wood: five('impact_wood_light').map(src => ({ src, len: 0.35, gain: -8 })),
  hit_metal: five('impact_metal_light').map(src => ({ src, len: 0.35, gain: -10 })),
  hit_body: five('impact_punch_medium').map(src => ({ src, len: 0.3, gain: -6 })),
  // Kill confirmation: a heavy, low body hit.
  kill: PUNCH.map(f => ({ src: `${MELEE}/${f}`, len: 0.5, gain: -3, lowpass: 2400 })),
};

// Alternatives to compare on /dev/sounds.html (not used in the game): id → { label: variants }.
// To use one, copy its variants into SOUNDS above and rebuild.
const STEPS_F = `${SRC}/footsteps-fantozzi/Fantozzi-footsteps/ogg/Fantozzi`;
const HITS = `${SRC}/hits-punches/hits`;
const ALTS = {
  shot_pistol: { 'Walther PPQ (before)': gun('Walther PPQ/X_39P.wav', 1.0, -2, 'mix'), 'Walther PPQ, one mic': gun('Walther PPQ/X_39P.wav', 1.0, -2), 'S&W 642 revolver': gun('Smith & Wesson 642/V_27P.wav', 1.1, -2), 'Bersa .380': gun('Bersa/F_47P.wav', 1.0, -2) },
  shot_sniper: {
    'FPS pack sniper': nums(4, n => ({ src: `${FPS}/Sniper_Shot-${n}.wav`, len: 1.8 })),
    'SPR-208': [{ src: `${NEW}/SPR - 208.mp3`, at: 0.47, to: 2.0, gain: 0 }],
  },
  rack: { 'Hammer cocking back': [{ src: `${NEW}/Hammer Cocking Back On Pistol.mp3`, len: 0.5, gain: -4 }] },
  frag: {
    'Small explosion': [{ src: `${NEW}/Small Explosion.mp3`, len: 1.2 }],
    'FPS pack rocket explosion': nums(4, n => ({ src: `${FPS}/Rocket_Explosion-${n}.wav`, len: 1.7 })),
  },
  shot_shotgun: { 'Winchester Model 12 (before)': gun('Model 12/K_22P.wav', 1.6), 'Benelli Nova (older)': gun('Nova/O_21P.wav', 1.6, 0, 'mix'), 'Benelli Nova, one mic': gun('Nova/O_21P.wav', 1.6), 'Charles Daly pump': gun('CD/H_21P.wav', 1.6), 'Mossberg 190': gun('Mossberg/N_30P.wav', 1.6) },
  pump: {
    'Shotgun cock (before)': [{ src: `${SRC}/gun-reload-sounds/shotguncock_0.wav`, len: 0.45, gain: -3 }],
    'Rack (older)': [{ src: `${SRC}/shotgun-reload/ShotgunSounds/Rack.mp3`, len: 0.8, gain: -4 }],
    'Model 12, from the gunshot recording': [{ src: `${GUNS}/Model 12/K_22P.wav`, ch: 'loud', at: 4.2, to: 5.05, gain: -3, lowpass: 6000 }],
    'Shell in chamber': [{ src: `${SRC}/shotgun-reload/ShotgunSounds/Shell in Chamber.mp3`, seg: 1, len: 0.7, gain: -4 }],
  },
  step_concrete: {
    'Kenney, softened (before)': five('footstep_concrete').map(src => ({ src, len: 0.3, gain: -9, lowpass: 1600, fadeIn: 0.008 })),
    'Kenney, unsoftened (older)': five('footstep_concrete').map(src => ({ src, len: 0.3, gain: -6 })),
    'Fantozzi stone': ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'].map(n => ({ src: `${STEPS_F}-Stone${n}.ogg`, len: 0.35, gain: -9, lowpass: 2500 })),
  },
  step_grass: { 'Fantozzi sand': ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'].map(n => ({ src: `${STEPS_F}-Sand${n}.ogg`, len: 0.35, gain: -9, lowpass: 2500 })) },
  kill: {
    'Kenney heavy punch': five('impact_punch_heavy').map(src => ({ src, len: 0.45, gain: -3, lowpass: 2400 })),
    'Recorded hits': ['05', '12', '20', '27'].map(n => ({ src: `${HITS}/hit${n}.mp3.flac`, len: 0.45, gain: -3, lowpass: 3000 })),
  },
};

const tmp = join(tmpdir(), 'qapishma-sounds');
mkdirSync(tmp, { recursive: true });

// Any source → mono samples (Float32Array), via afconvert. ch 'mix' mixes the channels down; 'loud'
// keeps only the louder one.
function decode(src, ch = 'mix') {
  const wav = join(tmp, 'in.wav'), n = ch === 'mix' ? 1 : 2;
  execFileSync('afconvert', ['-f', 'WAVE', '-d', `LEI16@${RATE}`, '-c', String(n), src, wav]);
  const buf = readFileSync(wav);
  let p = 12;
  while (buf.toString('ascii', p, p + 4) !== 'data') p += 8 + buf.readUInt32LE(p + 4);
  const len = buf.readUInt32LE(p + 4) / 2 / n, chans = Array.from({ length: n }, () => new Float32Array(len));
  for (let i = 0; i < len; i++) for (let c = 0; c < n; c++) chans[c][i] = buf.readInt16LE(p + 8 + (i * n + c) * 2) / 32768;
  const energy = a => a.reduce((e, v) => e + v * v, 0);
  return n === 1 ? chans[0] : energy(chans[0]) >= energy(chans[1]) ? chans[0] : chans[1];
}

// Two-pole lowpass (RBJ biquad), in place.
function lowpass(y, hz) {
  const w = 2 * Math.PI * hz / RATE, al = Math.sin(w) / Math.SQRT2, c = Math.cos(w), a0 = 1 + al;
  const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < y.length; i++) {
    const x0 = y[i], out = b0 * x0 + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = out; y[i] = out;
  }
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

// Gunshots: loud sounds (at least half the recording's peak) a second or more after the previous
// shot. Skips each shot's echo, and the quieter handling noise (a pump racked between shots).
function shots(x) {
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0), out = [];
  for (const [a, b] of segments(x)) {
    let p = 0;
    for (let i = a; i <= b; i++) p = Math.max(p, Math.abs(x[i]));
    if (p >= peak * 0.5 && (!out.length || a - out[out.length - 1] > RATE)) out.push(a);
  }
  return out;
}

function cut(x, { seg = 0, shot, len = 1, at, to, gain = 0, lowpass: lp, fadeIn = 0.002, fadeOut = 0.35 }) {
  let a, b;
  if (at !== undefined) { a = Math.round(at * RATE); b = Math.round((to ?? at + len) * RATE); }
  else {
    const start = shot !== undefined ? (shots(x)[shot] ?? shots(x)[0]) : segments(x)[seg][0];
    a = Math.max(0, start - RATE * 0.004); b = a + len * RATE;
  }
  const y = x.slice(a, Math.min(x.length, b));
  if (lp) lowpass(y, lp);
  const fade = Math.min(y.length, Math.round(y.length * fadeOut)), fin = Math.min(y.length, Math.round(RATE * fadeIn));
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
  segments(x).forEach(([a, b], i) => console.log(i, (a / RATE).toFixed(3), '…', (b / RATE).toFixed(3), 'peak', x.slice(a, b + 1).reduce((m, v) => Math.max(m, Math.abs(v)), 0).toFixed(2)));
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const manifest = {};
for (const [id, list] of Object.entries(SOUNDS)) {
  manifest[id] = list.map((v, i) => {
    const spec = typeof v === 'string' ? { src: v } : v, file = `${id}_${i}.m4a`;
    encode(cut(decode(spec.src, spec.ch), spec), join(OUT, file));
    return file;
  });
}
writeFileSync(join(OUT, 'sounds.json'), JSON.stringify(manifest, null, 1) + '\n');

// Alternatives for the comparison page
const ALT_OUT = 'public/dev/sounds';
rmSync(ALT_OUT, { recursive: true, force: true });
mkdirSync(ALT_OUT, { recursive: true });
const alts = {};
for (const [id, options] of Object.entries(ALTS)) {
  alts[id] = Object.entries(options).map(([label, list], k) => ({
    label,
    files: list.map((spec, i) => {
      const file = `${id}-${k}_${i}.m4a`;
      encode(cut(decode(spec.src, spec.ch), spec), join(ALT_OUT, file));
      return file;
    }),
  }));
}
writeFileSync(join(ALT_OUT, 'alts.json'), JSON.stringify(alts, null, 1) + '\n');

// Announcer recordings: every line in them, for labelling on /dev/sounds.html (lines: sounds less than
// 0.6 s apart belong together). The labels are saved to public/assets/game/announcer-map.json, and the
// lines labelled there are cut into public/assets/sounds/announcer/<line id>.m4a for the game.
const PACKS = {
  warlord: `${NEW}/voicebosch-warlord-fps-game-announcer-pack-186108.mp3`,
  pack2: `${NEW}/Announcer Pack 2.mp3`,
};
const lines = [];
mkdirSync(join(ALT_OUT, 'announcer'), { recursive: true });
for (const [pack, src] of Object.entries(PACKS)) {
  let x;
  try { x = decode(src); } catch { continue; }
  const merged = [];
  for (const [a, b] of segments(x)) {
    const last = merged[merged.length - 1];
    if (last && a - last[1] < RATE * 0.6) last[1] = b; else merged.push([a, b]);
  }
  merged.forEach(([a, b], i) => {
    const spec = { at: Math.max(0, a / RATE - 0.05), to: b / RATE + 0.15, fadeOut: 0.08 }, file = `announcer/${pack}-${i}.m4a`;
    encode(cut(x, spec), join(ALT_OUT, file));
    lines.push({ file, pack, at: +spec.at.toFixed(3), to: +spec.to.toFixed(3) });
  });
}
writeFileSync(join(ALT_OUT, 'announcer.json'), JSON.stringify(lines, null, 1) + '\n');
const MAP_FILE = 'public/assets/game/announcer-map.json', VOICE = 'public/assets/sounds/announcer';
let labelled = 0;
try {
  const map = JSON.parse(readFileSync(MAP_FILE, 'utf8'));  // { line id: { pack, at, to } }
  for (const [id, { pack, at, to }] of Object.entries(map)) {
    if (!PACKS[pack] || !/^\w+$/.test(id)) continue;
    encode(cut(decode(PACKS[pack]), { at, to, fadeOut: 0.08 }), join(VOICE, `${id}.m4a`));
    labelled++;
  }
} catch { /* nothing labelled yet */ }
console.log(`announcer: ${lines.length} lines to label, ${labelled} labelled lines written to ${VOICE}`);
const bytes = readdirSync(OUT).reduce((n, f) => n + readFileSync(join(OUT, f)).length, 0);
console.log(`${Object.keys(manifest).length} sounds, ${Object.values(manifest).flat().length} files, ${(bytes / 1e6).toFixed(1)} MB in ${OUT}`);
