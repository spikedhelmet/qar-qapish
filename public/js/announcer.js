// Announcer: plays recorded voice lines from public/assets/sounds/announcer/<id>.<ext>.
// Lines without a recording fall back to the system's text-to-speech voice (or silence).

const DIR = '/assets/sounds/announcer/';

// Every line the game can say. `text` is shown on screen and used for the placeholder voice.
export const LINES = {
  match_start:     { text: 'Fight!' },
  victory:         { text: 'Victory!' },
  defeat:          { text: 'Defeat.' },
  draw:            { text: 'Draw.' },
  first_blood:     { text: 'First blood!' },
  headshot:        { text: 'Headshot!' },
  double_kill:     { text: 'Double kill!' },
  triple_kill:     { text: 'Triple kill!' },
  multi_kill:      { text: 'Multi kill!' },
  streak_5:        { text: 'Killing spree!' },
  streak_10:       { text: 'Unstoppable!' },
  streak_ended:    { text: 'Streak ended.' },
  knife_kill:      { text: 'Humiliation!' },
  lead_taken:      { text: 'You have taken the lead.' },
  lead_lost:       { text: 'You have lost the lead.' },
  one_minute:      { text: 'One minute remaining.' },
  ten_kills_left:  { text: 'Ten kills to win.' },
  one_kill_left:   { text: 'One kill to win.' },
  // Elimination / objective modes
  round_start:     { text: 'Round start.' },
  round_won:       { text: 'Round won.' },
  round_lost:      { text: 'Round lost.' },
  last_alive:      { text: 'You are the last one standing.' },
  match_point:     { text: 'Match point.' },
  final_round:     { text: 'Final round.' },
};

let audioCtx = null, gain = null;
const buffers = {};       // id -> AudioBuffer once loaded
let mode = 'voice';       // 'voice' (recordings, else TTS) | 'recordings' (recordings only) | 'off'
let busyUntil = 0;
let onShow = () => {};

async function loadLine(file) {
  const id = file.replace(/\.[^.]+$/, '');
  if (!LINES[id] || buffers[id]) return;
  try {
    const res = await fetch(DIR + encodeURIComponent(file));
    buffers[id] = await audioCtx.decodeAudioData(await res.arrayBuffer());
  } catch (e) {
    console.warn(`Announcer: could not load ${file}`, e);
  }
}

// Loads whatever recordings exist (m4a from Voice Memos, mp3, wav or ogg).
export async function initAnnouncer(ctx, destination, showText) {
  audioCtx = ctx;
  gain = ctx.createGain();
  gain.gain.value = 1.2;
  gain.connect(destination);
  onShow = showText;
  try {
    const files = await (await fetch('/api/announcer')).json();
    await Promise.all(files.map(loadLine));
  } catch { /* no recordings yet */ }
}

export function setAnnouncerMode(m) { mode = m; }

export function recordedLines() { return Object.keys(buffers); }

// Plays a line. Lower-priority lines are dropped if another line is still playing.
export function announce(id, { priority = 1 } = {}) {
  const line = LINES[id];
  if (!line || mode === 'off') return;
  const now = performance.now();
  if (now < busyUntil && priority < 2) return;
  onShow(line.text);

  const buf = buffers[id];
  if (buf && audioCtx) {
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start();
    busyUntil = now + buf.duration * 1000;
  } else if (mode === 'voice' && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(line.text);
    u.rate = 1.05;
    u.pitch = 0.8;
    speechSynthesis.speak(u);
    busyUntil = now + 1200;
  }
}
