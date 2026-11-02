// Key bindings. The game reads every action by its default key; a rebound key is translated to
// that default as it comes in, and the default key itself goes quiet unless something else uses it.
// Number keys stay fixed: 1–4 pick weapons, and 1–6 pick a class in the class menu.

export const ACTIONS = [
  { id: 'forward', label: 'Move forward', key: 'KeyW' },
  { id: 'back', label: 'Move back', key: 'KeyS' },
  { id: 'left', label: 'Move left', key: 'KeyA' },
  { id: 'right', label: 'Move right', key: 'KeyD' },
  { id: 'jump', label: 'Jump', key: 'Space' },
  { id: 'sprint', label: 'Sprint (hold, moving forward)', key: 'ShiftLeft' },
  { id: 'walk', label: 'Walk quietly', key: 'AltLeft' },
  { id: 'crouch', label: 'Crouch · while sprinting: slide', key: 'KeyC' },
  { id: 'reload', label: 'Reload', key: 'KeyR' },
  { id: 'use', label: 'Plant / defuse the charge (hold)', key: 'KeyE' },
  { id: 'quickThrow', label: 'Quick-throw grenade', key: 'KeyG' },
  { id: 'lastWeapon', label: 'Last weapon', key: 'KeyQ' },
  { id: 'scoreboard', label: 'Scoreboard', key: 'Tab' },
  { id: 'classMenu', label: 'Choose class', key: 'KeyB' },
  { id: 'team', label: 'Switch team', key: 'KeyM' },
];
const BY_ID = Object.fromEntries(ACTIONS.map(a => [a.id, a]));

// Keys that can't be bound: Esc leaves the game, Cmd is the browser's, 1–6 are weapons and classes.
export const RESERVED = /^(Escape|Meta|OS|Digit[1-6]$)/;

const custom = {};     // action → key, only where it differs from the default
let remap = new Map(); // key pressed → key the game reads (null: ignored)

function rebuild() {
  remap = new Map();
  for (const a of ACTIONS) if (custom[a.id]) remap.set(a.key, null);
  for (const a of ACTIONS) remap.set(keyFor(a.id), a.key);
}

function setOne(id, code) {
  if (code === BY_ID[id].key) delete custom[id];
  else custom[id] = code;
}

export function keyFor(id) { return custom[id] || BY_ID[id].key; }
export function keyName(id) { return keyLabel(keyFor(id)); }
export function translate(code) { return remap.has(code) ? remap.get(code) : code; }

// Load saved bindings ({ action: key }); returns what's actually in use.
export function setBindings(saved = {}) {
  for (const id of Object.keys(custom)) delete custom[id];
  for (const [id, code] of Object.entries(saved)) if (BY_ID[id] && typeof code === 'string' && !RESERVED.test(code)) setOne(id, code);
  rebuild();
  return { ...custom };
}

// Bind an action to a key. An action already on that key takes over this one's old key.
export function bindKey(id, code) {
  const prev = keyFor(id);
  const other = ACTIONS.find(a => a.id !== id && keyFor(a.id) === code);
  if (other) setOne(other.id, prev);
  setOne(id, code);
  rebuild();
  return { ...custom };
}

const NAMES = {
  Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Right Shift', AltLeft: 'Alt / Option', AltRight: 'Right Alt',
  ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl', Tab: 'Tab', CapsLock: 'Caps Lock', Enter: 'Return',
  Backspace: 'Backspace', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
  Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
};
export function keyLabel(code) {
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  if (code.startsWith('Arrow')) return `${code.slice(5)} arrow`;
  return code;
}
