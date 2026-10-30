// Local player: keyboard/mouse input and client-side movement physics.
import { PLAYER } from './shared/config.js';
import { moveBody, canStand } from './shared/collision.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();   // keys pressed since last frame
    this.dx = 0; this.dy = 0;
    this.mouseDown = false;
    this.rightDown = false;
    this.wheel = 0;
    this.locked = false;
    addEventListener('keydown', e => {
      if (e.code === 'Tab' || e.code.startsWith('Alt')) e.preventDefault();
      if (!this.locked) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouseDown = this.rightDown = false; });
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
      if (!this.locked) { this.keys.clear(); this.mouseDown = this.rightDown = false; }
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

  // opts: { speedMult, aiming, firing }. Returns sound events: { step, loud, landed, slide }.
  update(dt, input, { speedMult = 1, aiming = false, firing = false } = {}) {
    const P = PLAYER;
    const ev = { step: false, loud: false, landed: false, slide: false };

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

    const base = this.crouching ? P.crouchSpeed : walking ? P.walkSpeed : this.sprinting ? P.sprintSpeed : P.runSpeed;
    const maxSpeed = base * (this.sprinting ? 1 : speedMult);
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

    if (this.onGround && input.hit('Space') && canStand(this.map, this.pos, P.height)) {
      this.vel[1] = P.jumpSpeed;
      this.onGround = false;
      this.sliding = false; // slide-jump keeps the momentum
    }
    this.vel[1] -= P.gravity * dt;

    const before = [this.pos[0], this.pos[2]];
    const res = moveBody(this.map, this.pos, this.vel, dt, this.height, this.onGround);
    ev.landed = !this.onGround && res.onGround;
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

  speed() { return Math.hypot(this.vel[0], this.vel[2]); }

  eye() { return [this.pos[0], this.pos[1] + this.eyeHeight, this.pos[2]]; }
}
