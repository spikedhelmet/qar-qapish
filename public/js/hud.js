// DOM heads-up display.
import { TEAMS, WEAPONS, MODES } from './shared/config.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export class Hud {
  constructor() {
    this.el = $('hud');
    this.hp = $('hp-val');
    this.ammo = $('ammo-val');
    this.weapon = $('weapon-name');
    this.clock = $('clock');
    this.cross = $('crosshair');
    this.hit = $('hitmarker');
    this.center = $('center-msg');
    this.board = $('scoreboard');
    document.querySelector('#scorebar .a .tname').textContent = TEAMS.A.name;
    document.querySelector('#scorebar .b .tname').textContent = TEAMS.B.name;
    this.scoreA = document.querySelector('#scorebar .a .tscore');
    this.scoreB = document.querySelector('#scorebar .b .tscore');
    this.clock.innerHTML = `--:--<small>first to ${MODES.tdm.killLimit}</small>`;
    this.last = {};
  }

  show(on) { this.el.classList.toggle('hidden', !on); }

  // Only touch the DOM when a value actually changes.
  set(key, value, fn) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    fn(value);
  }

  vitals(hp, weapon, mag, reserve) {
    this.set('hp', hp, v => { this.hp.textContent = v; this.hp.classList.toggle('low', v <= 25); });
    this.set('wname', weapon, v => { this.weapon.textContent = WEAPONS[v].name; });
    const ammo = WEAPONS[weapon].melee ? '—' : `${mag}|${reserve}`;
    this.set('ammo', ammo, () => {
      if (WEAPONS[weapon].melee) { this.ammo.textContent = '—'; this.ammo.classList.remove('empty'); return; }
      this.ammo.innerHTML = `${mag}<small>/ ${reserve}</small>`;
      this.ammo.classList.toggle('empty', mag === 0);
    });
  }

  match(score, secondsLeft) {
    this.set('sa', score.A, v => { this.scoreA.textContent = v; });
    this.set('sb', score.B, v => { this.scoreB.textContent = v; });
    const m = Math.floor(secondsLeft / 60), s = String(secondsLeft % 60).padStart(2, '0');
    this.set('clock', `${m}:${s}`, v => { this.clock.firstChild.textContent = v; });
  }

  crosshair(spreadPx, visible) {
    this.cross.style.setProperty('--gap', `${Math.round(4 + spreadPx)}px`);
    this.set('crossVis', visible, v => { this.cross.style.display = v ? '' : 'none'; });
  }

  hitmarker(kind) {
    this.hit.className = '';
    void this.hit.offsetWidth; // restart the animation
    this.hit.className = `show ${kind}`;
  }

  hurt(angle) {
    this.el.classList.remove('hurt');
    void this.el.offsetWidth;
    this.el.classList.add('hurt');
    if (angle === null) return;
    const arc = document.createElement('div');
    arc.className = 'dmg-arc';
    arc.style.transform = `rotate(${angle}rad)`;
    $('damage').appendChild(arc);
    setTimeout(() => arc.remove(), 1300);
  }

  killfeed(killer, victim, weapon, headshot, involvesMe) {
    const row = document.createElement('div');
    row.className = 'kf' + (involvesMe ? ' me' : '');
    const name = p => p ? `<span style="color:${TEAMS[p.tm].css}">${esc(p.n)}</span>` : '<span>world</span>';
    row.innerHTML = `${name(killer)}<span class="wpn">${esc(WEAPONS[weapon]?.name || weapon)}</span>${headshot ? '<span class="hs">HS</span>' : ''}${name(victim)}`;
    const feed = $('killfeed');
    feed.appendChild(row);
    while (feed.children.length > 5) feed.firstChild.remove();
    setTimeout(() => row.remove(), 6000);
  }

  notice(text) {
    const n = document.createElement('div');
    n.textContent = text;
    $('notices').appendChild(n);
    setTimeout(() => n.remove(), 6000);
  }

  message(html) { this.set('center', html, v => { this.center.innerHTML = v; }); }

  scoreboard(visible, players, myId, score) {
    this.board.classList.toggle('hidden', !visible);
    if (!visible) return;
    const side = team => {
      const rows = players.filter(p => p.tm === team).sort((a, b) => b.k - a.k || a.d - b.d)
        .map(p => `<tr class="${p.id === myId ? 'me' : ''} ${p.al ? '' : 'dead'}"><td>${esc(p.n)}</td><td>${p.k}</td><td>${p.d}</td></tr>`).join('');
      return `<div class="side ${team.toLowerCase()}"><h3><span>${TEAMS[team].name}</span><span>${score[team]}</span></h3>
        <table><tr><th>Player</th><th>K</th><th>D</th></tr>${rows}</table></div>`;
    };
    this.set('board', JSON.stringify([players.map(p => [p.id, p.k, p.d, p.al, p.tm]), score]), () => {
      this.board.innerHTML = side('A') + side('B');
    });
  }
}
