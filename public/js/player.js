// Local player: keyboard/mouse input and client-side movement physics.
import { PLAYER } from './shared/config.js';
import { moveBody, canStand, findLedge, findVault, touchingMat } from './shared/collision.js';
import { translate } from './keys.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();      // held, by the key the game reads (see keys.js)
    this.pressed = new Set();   // keys pressed since last frame
    this.held = new Map();      // physical key → what it was read as when pressed
    this.dx = 0; this.dy = 0;
    this.mouseDown = false;
    this.rightDown = false;
    this.wheel = 0;
    this.locked = false;
    addEventListener('keydown', e => {
      if (e.code === 'Tab' || e.code.startsWith('Alt')) e.preventDefault();
      if (!this.locked) return;
      const code = translate(e.code);
      if (code === null || e.repeat) return;
      this.held.set(e.code, code);
      if (!this.keys.has(code)) this.pressed.add(code);
      this.keys.add(code);
    });
    addEventListener('keyup', e => {
      const code = this.held.get(e.code);
      this.held.delete(e.code);
      if (code) this.keys.delete(code);
    });
    addEventListener('blur', () => { this.keys.clear(); this.held.clear(); this.mouseDown = this.rightDown = false; });
    addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.dx += e.movementX; this.dy += e.movementY;
    });
    addEventListener('mousedown', e => {
      if (!this.locked) return;
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightDown = true;
    });
    addEventListener('mouseup', e => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('wheel', e => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) { this.keys.clear(); this.held.clear(); this.mouseDown = this.rightDown = false; }
    });
  }

  async lock() {
    try { await this.canvas.requestPointerLock({ unadjustedMovement: true }); }
    catch { try { await this.canvas.requestPointerLock(); } catch { /* user must click again */ } }
  }

  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }

  endFrame() {
    this.pressed.clear();
    this.dx = 0; this.dy = 0; this.wheel = 0;
  }
}

export class LocalPlayer {
  constructor(map) {
    this.map = map;
    this.pos = [0, 0, 0];
    this.vel = [0, 0, 0];
    this.yaw = 0;
    this.pitch = 0;
    this.height = PLAYER.height;
    this.eyeHeight = PLAYER.eye;
    this.onGround = false;
    this.alive = false;
    this.life = 0;
    this.resetMotion();
  }

  resetMotion() {
    this.crouching = false;
    this.sprinting = false;
    this.sliding = false;
    this.slideT = 0;
    this.slideCooldown = 0;
    this.sprintRecover = 0;
    this.stepDist = 0;
    this.landT = 0;
    this.jumped = false;
    this.climb = null;    // pulling up onto a ledge: { from, to, t, dur }, or through a window: also { via }
    this.groundY = this.pos ? this.pos[1] : 0;
    this.stepOffset = 0;  // camera lag behind a step up or down, eased out (see viewEye)
    this.slowT = 0; this.slowK = 0; // stagger after being hit: seconds left, how much slower
  }

  spawn(pos, yaw, life) {
    this.pos = pos.slice();
    this.vel = [0, 0, 0];
    this.yaw = yaw;
    this.pitch = 0;
    this.height = PLAYER.height;
    this.eyeHeight = PLAYER.eye;
    this.alive = true;
    this.life = life;
    this.resetMotion();
  }

  look(dx, dy, sensitivity) {
    const k = 0.0022 * sensitivity;
    this.yaw -= dx * k;
    this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - dy * k));
  }

  get climbing() { return !!this.climb; }

  // opts: { speedMult, sprintMult, aiming, firing }. Returns sound events: { step, loud, landed, hard (a real
  // drop, not a stair), slide, climb, jump }.
  update(dt, input, { speedMult = 1, sprintMult = 1, aiming = false, firing = false } = {}) {
    const P = PLAYER;
    const ev = { step: false, loud: false, landed: false, hard: false, slide: false, climb: false, jump: false };
    if (this.climb) return this.updateClimb(dt, ev);

    let fx = 0, fz = 0;
    if (input.down('KeyW')) fz -= 1;
    if (input.down('KeyS')) fz += 1;
    if (input.down('KeyA')) fx -= 1;
    if (input.down('KeyD')) fx += 1;
    const len = Math.hypot(fx, fz) || 1;
    fx /= len; fz /= len;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wish = [fx * cos + fz * sin, fz * cos - fx * sin];

    const walking = input.down('AltLeft') || input.down('AltRight');
    const shift = input.down('ShiftLeft') || input.down('ShiftRight');
    const crouchHeld = input.down('KeyC') || input.down('ControlLeft');
    const crouchPressed = input.hit('KeyC') || input.hit('ControlLeft');
    const hSpeed = this.speed();

    // Slide: tap crouch while sprinting.
    this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    if (!this.sliding && crouchPressed && this.onGround && this.sprinting && hSpeed > P.runSpeed && this.slideCooldown <= 0) {
      this.sliding = true;
      this.slideT = P.slideTime;
      this.slideCooldown = P.slideTime + P.slideCooldown;
      const boost = Math.max(hSpeed, P.slideSpeed) / hSpeed;
      this.vel[0] *= boost; this.vel[2] *= boost;
      ev.slide = true;
    }
    if (this.sliding) {
      this.slideT -= dt;
      if (this.slideT <= 0 || hSpeed < P.crouchSpeed) this.sliding = false;
    }

    if (crouchHeld || this.sliding) this.crouching = true;
    else if (this.crouching && canStand(this.map, this.pos, P.height)) this.crouching = false;
    this.height = this.crouching ? P.crouchHeight : P.height;
    const eyeTarget = this.sliding ? P.slideEye : this.crouching ? P.crouchEye : P.eye;
    this.eyeHeight += (eyeTarget - this.eyeHeight) * Math.min(1, dt * 14);

    // Sprint: Shift while moving forward, not aiming, firing or crouched. Keeps state mid-air.
    const wasSprinting = this.sprinting;
    const sprintOk = shift && fz < 0 && !aiming && !firing && !walking && !this.crouching;
    this.sprinting = sprintOk && (this.onGround || wasSprinting);
    if (this.sprinting) this.sprintRecover = P.sprintRecover;
    else this.sprintRecover = Math.max(0, this.sprintRecover - dt);

    // Just landed: slower for a moment, so hopping doesn't keep speed up.
    this.landT = Math.max(0, this.landT - dt);
    const fresh = 1 - P.landSlow * (this.landT / P.landRecover);
    const base = this.crouching ? P.crouchSpeed : walking ? P.walkSpeed : this.sprinting ? P.sprintSpeed : P.runSpeed;
    let maxSpeed = base * (this.sprinting ? sprintMult : speedMult) * fresh;
    if (this.onGround && touchingMat(this.map, this.pos, 'ladder')) maxSpeed *= 0.3; // climbing a ladder
    this.slowT = Math.max(0, this.slowT - dt);
    maxSpeed *= 1 - this.slowK * (this.slowT / P.staggerTime);                          // staggered after a hit
    if (!this.onGround) maxSpeed = Math.min(maxSpeed, P.jumpMaxSpeed); // no speeding up mid-air
    const wishSpeed = (fx || fz) && !this.sliding ? maxSpeed : 0;

    if (this.onGround) {
      const speed = this.speed();
      if (speed > 0) {
        const drop = Math.max(speed, 1.5) * (this.sliding ? P.slideFriction : P.friction) * dt;
        const scale = Math.max(0, speed - drop) / speed;
        this.vel[0] *= scale; this.vel[2] *= scale;
      }
    }
    const current = this.vel[0] * wish[0] + this.vel[2] * wish[1];
    const add = wishSpeed - current;
    if (add > 0) {
      const a = Math.min(add, (this.onGround ? P.accel : P.airAccel) * dt * Math.max(1, wishSpeed / 4));
      this.vel[0] += a * wish[0]; this.vel[2] += a * wish[1];
    }

    // Climbing: jump at a ledge or a window while moving toward it (or keep jump held as you reach it mid-air).
    if (fz < 0 && (input.hit('Space') || (!this.onGround && input.down('Space'))) && (this.tryClimb(wish) || this.tryVault(wish))) {
      ev.climb = true;
      return ev;
    }
    if (this.onGround && input.hit('Space') && canStand(this.map, this.pos, P.height)) {
      // Jumps carry at most jumpMaxSpeed forward, less right after a landing.
      const cap = P.jumpMaxSpeed * fresh, speed = this.speed();
      if (speed > cap) { this.vel[0] *= cap / speed; this.vel[2] *= cap / speed; }
      this.vel[1] = P.jumpSpeed * (1 - 0.3 * (1 - fresh) / P.landSlow);
      this.onGround = false;
      this.sliding = false;
      this.jumped = true;
      ev.jump = true;
    }
    this.vel[1] -= P.gravity * dt;

    const before = [this.pos[0], this.pos[2]], fall = -this.vel[1], yBefore = this.pos[1];
    const res = moveBody(this.map, this.pos, this.vel, dt, this.height, this.onGround);
    ev.landed = !this.onGround && res.onGround;
    ev.hard = ev.landed && fall > 4;
    if (ev.landed && this.jumped) this.landT = P.landRecover; // stepping off a ledge or stairs doesn't count
    if (this.onGround) { this.jumped = false; this.groundY = this.pos[1]; }
    // Stairs and ladders move the body up or down a step at a time; the camera eases over each one.
    const dy = this.pos[1] - yBefore;
    if (this.onGround && res.onGround && Math.abs(dy) > 1e-3 && Math.abs(dy) <= P.stepHeight + 0.01) this.stepOffset -= dy;
    this.stepOffset = Math.max(-0.9, Math.min(0.9, this.stepOffset * Math.exp(-dt * 16)));
    this.onGround = res.onGround;
    if (this.pos[1] < -20) this.pos = [0, 2, 0]; // safety net

    // Footsteps: running and sprinting are audible; walking, crouching and sliding are silent.
    if (this.onGround && !walking && !this.crouching) {
      this.stepDist += Math.hypot(this.pos[0] - before[0], this.pos[2] - before[1]);
      const stride = this.sprinting ? 2.7 : 2.2;
      if (this.stepDist > stride) {
        this.stepDist = 0;
        ev.step = true;
        ev.loud = this.sprinting;
      }
    }
    return ev;
  }

  // Starts pulling up onto a ledge in the direction we're moving, if there's one within reach.
  tryClimb(wish) {
    const len = Math.hypot(wish[0], wish[1]);
    if (!len) return false;
    const base = this.onGround ? this.pos[1] : this.groundY;
    const to = findLedge(this.map, this.pos, PLAYER.height, wish[0] / len, wish[1] / len, base + PLAYER.climbHeight);
    if (!to) return false;
    const rise = to[1] - this.pos[1];
    this.climb = { from: this.pos.slice(), to, t: 0, dur: 0.3 + rise * 0.22 };
    this.vel = [0, 0, 0];
    this.sprinting = this.sliding = false;
    this.crouching = false;
    this.height = PLAYER.height;
    return true;
  }

  // Starts climbing through a window (or over a wall too low to stand under): up onto the sill,
  // ducked, then across and down on the far side.
  tryVault(wish) {
    const len = Math.hypot(wish[0], wish[1]);
    if (!len) return false;
    const base = this.onGround ? this.pos[1] : this.groundY;
    const dir = [wish[0] / len, wish[1] / len];
    const v = findVault(this.map, this.pos, dir[0], dir[1], base + PLAYER.climbHeight, PLAYER.crouchHeight);
    if (!v) return false;
    this.climb = { from: this.pos.slice(), via: v.over, to: v.to, dir, t: 0, dur: 0.45 + (v.over[1] - this.pos[1]) * 0.2 };
    this.vel = [0, 0, 0];
    this.sprinting = this.sliding = false;
    this.crouching = true;
    this.height = PLAYER.crouchHeight;
    return true;
  }

  // Up first (hands on the edge), then forward onto the top.
  updateClimb(dt, ev) {
    const c = this.climb;
    c.t = Math.min(1, c.t + dt / c.dur);
    if (c.via) return this.updateVault(c, dt, ev);
    const up = Math.min(1, c.t / 0.7), across = Math.max(0, (c.t - 0.55) / 0.45);
    const ease = k => k * k * (3 - 2 * k);
    this.pos[1] = c.from[1] + (c.to[1] - c.from[1]) * (1 - (1 - up) * (1 - up));
    this.pos[0] = c.from[0] + (c.to[0] - c.from[0]) * ease(across);
    this.pos[2] = c.from[2] + (c.to[2] - c.from[2]) * ease(across);
    this.eyeHeight += ((c.t < 0.7 ? PLAYER.crouchEye : PLAYER.eye) - this.eyeHeight) * Math.min(1, dt * 10); // head ducks over the edge
    if (c.t >= 1) {
      this.pos = c.to.slice();
      this.climb = null;
      this.onGround = true;
      this.groundY = this.pos[1];
      ev.landed = true;
    }
    return ev;
  }

  updateVault(c, dt, ev) {
    const ease = k => k * k * (3 - 2 * k);
    const a = Math.min(1, c.t / 0.45), b = Math.max(0, (c.t - 0.45) / 0.55);
    const [p, q] = c.t < 0.45 ? [c.from, c.via] : [c.via, c.to];
    const k = ease(c.t < 0.45 ? a : b);
    this.pos[0] = p[0] + (q[0] - p[0]) * k;
    this.pos[2] = p[2] + (q[2] - p[2]) * k;
    this.pos[1] = c.t < 0.45 ? c.from[1] + (c.via[1] - c.from[1]) * (1 - (1 - a) * (1 - a)) : c.via[1];
    this.eyeHeight += (PLAYER.crouchEye - this.eyeHeight) * Math.min(1, dt * 12);
    if (c.t >= 1) {
      this.pos = c.to.slice();
      this.climb = null;
      this.vel = [c.dir[0] * 2, 0, c.dir[1] * 2]; // keep going and drop down on the far side
      this.onGround = false;
      ev.climb = true;
    }
    return ev;
  }

  speed() { return Math.hypot(this.vel[0], this.vel[2]); }

  eye() { return [this.pos[0], this.pos[1] + this.eyeHeight, this.pos[2]]; }

  // Where the camera goes: the eye, eased over steps (shots still come from eye()).
  viewEye() { return [this.pos[0], this.pos[1] + this.eyeHeight + this.stepOffset, this.pos[2]]; }

  // Being hit slows you for a moment (k: 0…1, how hard): you lose speed at once and get it back.
  stagger(k) {
    k = Math.max(0, Math.min(1, k));
    this.vel[0] *= 1 - 0.55 * k; this.vel[2] *= 1 - 0.55 * k;
    this.slowT = PLAYER.staggerTime;
    this.slowK = Math.max(this.slowK * (this.slowT / PLAYER.staggerTime), PLAYER.staggerSlow * k);
  }
}
