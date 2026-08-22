/* The feel layer. Everything here exists so the game answers the hand
 * instantly and reads clearly: fixed-step simulation with interpolated
 * drawing, buffered input, hitstop, trauma-decay shake, and a camera that
 * leads the player instead of chasing them. */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
/* Frame-rate independent exponential approach. rate = fraction left per second. */
export const damp = (a, b, rate, dt) => b + (a - b) * Math.pow(rate, dt);
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/* A tiny deterministic PRNG so test runs reproduce exactly. */
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --- input ------------------------------------------------------------- */

export class Input {
  constructor(el = window) {
    this.down = new Set();
    this.pressedAt = new Map();
    this.releasedAt = new Map();
    this.t = 0;
    this.mouse = { x: 0, y: 0, down: false, dx: 0, dy: 0 };
    this.anyPressThisFrame = false;
    this._onFirst = [];

    const norm = (e) => {
      const k = e.key;
      if (k === ' ') return 'space';
      if (k.length === 1) return k.toLowerCase();
      return k.toLowerCase();
    };
    this._kd = (e) => {
      const k = norm(e);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'tab'].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.press(k);
    };
    this._ku = (e) => this.release(norm(e));
    window.addEventListener('keydown', this._kd, { passive: false });
    window.addEventListener('keyup', this._ku);
    window.addEventListener('blur', () => { for (const k of [...this.down]) this.release(k); });
  }

  onFirstInput(fn) { this._onFirst.push(fn); }
  _first() { for (const f of this._onFirst) f(); this._onFirst.length = 0; }

  press(k) {
    this._first();
    if (!this.down.has(k)) { this.down.add(k); this.pressedAt.set(k, this.t); this.anyPressThisFrame = true; }
  }
  release(k) {
    if (this.down.has(k)) { this.down.delete(k); this.releasedAt.set(k, this.t); }
  }

  held(...keys) { return keys.some((k) => this.down.has(k)); }
  /* Buffered press: true if pressed within `window` seconds and not consumed. */
  pressed(keys, window = 0.12) {
    const ks = Array.isArray(keys) ? keys : [keys];
    for (const k of ks) {
      const a = this.pressedAt.get(k);
      if (a != null && this.t - a <= window) return true;
    }
    return false;
  }
  consume(keys) {
    const ks = Array.isArray(keys) ? keys : [keys];
    for (const k of ks) this.pressedAt.delete(k);
  }
  heldFor(k) { const a = this.pressedAt.get(k); return this.down.has(k) && a != null ? this.t - a : 0; }
  releasedWithin(k, window = 0.12) {
    const a = this.releasedAt.get(k);
    return a != null && this.t - a <= window;
  }

  step(dt) { this.t += dt; this.anyPressThisFrame = false; this.mouse.dx = 0; this.mouse.dy = 0; }

  /* Touch. Three zones, no words: the two edges walk you, and the whole
   * middle is the one verb — hold it to hold on, tap it to jump, drag it down
   * to crouch. It is the same shape as the keyboard, which is why it can be
   * learned by doing it once. */
  bindTouch(el) {
    const zone = (x) => {
      const w = window.innerWidth;
      if (x < w * 0.24) return 'left';
      if (x > w * 0.76) return 'right';
      return 'hold';
    };
    const live = new Map();
    const apply = () => {
      let l = false, r = false, hold = false, crouch = false;
      for (const t of live.values()) {
        if (t.zone === 'left') l = true;
        else if (t.zone === 'right') r = true;
        else {
          if (t.dy > 70) crouch = true;
          else if (t.settled) hold = true;
        }
      }
      this._set('a', l); this._set('d', r);
      this._set('shift', hold); this._set('s', crouch);
    };
    const now = () => performance.now();
    el.addEventListener('touchstart', (e) => {
      e.preventDefault(); this._first();
      for (const t of e.changedTouches) {
        /* The middle grips the instant it is touched. Waiting to see whether
         * it becomes a tap makes the game's only verb feel late, and a brief
         * grip on the way to a jump costs nothing. */
        live.set(t.identifier, {
          zone: zone(t.clientX), x0: t.clientX, y0: t.clientY, dy: 0,
          t0: now(), settled: true
        });
      }
      apply();
    }, { passive: false });
    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const o = live.get(t.identifier);
        if (!o) continue;
        o.dy = t.clientY - o.y0;
        /* Held in the middle for a beat: that is a grip, not a tap. */
        if (o.zone === 'hold' && Math.abs(o.dy) > 24) o.tapped = true;
      }
      apply();
    }, { passive: false });
    const end = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const o = live.get(t.identifier);
        if (o && o.zone === 'hold' && !o.tapped && now() - o.t0 < 260) {
          this.press('space');
          setTimeout(() => this.release('space'), 60);
        }
        live.delete(t.identifier);
      }
      apply();
    };
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
    window.addEventListener('blur', () => { live.clear(); apply(); });
  }

  _set(k, v) { if (v) { if (!this.down.has(k)) this.press(k); } else this.release(k); }

  bindMouse(canvas, toWorld) {
    const set = (e) => {
      const r = canvas.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
      const p = toWorld ? toWorld(nx, ny) : { x: nx, y: ny };
      this.mouse.dx += p.x - this.mouse.x; this.mouse.dy += p.y - this.mouse.y;
      this.mouse.x = p.x; this.mouse.y = p.y;
    };
    canvas.addEventListener('mousemove', set);
    canvas.addEventListener('mousedown', (e) => { this._first(); set(e); this.mouse.down = true; this.press('m0'); });
    window.addEventListener('mouseup', () => { this.mouse.down = false; this.release('m0'); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

/* --- camera ------------------------------------------------------------ */

export class Camera {
  constructor(w, h) {
    this.x = 0; this.y = 0;        // centre, world units
    this.px = 0; this.py = 0;      // previous, for interpolated draw
    this.zoom = 1; this.zoomT = 1;
    this.w = w; this.h = h;
    this.trauma = 0;               // 0..1, shake amount
    this.shakeX = 0; this.shakeY = 0;
    this.leadX = 0; this.leadY = 0;
    this.tilt = 0;
    this._seed = mulberry(9731);
  }

  kick(amount) { this.trauma = clamp(this.trauma + amount, 0, 1); }

  /* target: where the camera wants to be. lead: velocity-based look-ahead. */
  follow(tx, ty, dt, { rate = 0.0008, leadX = 0, leadY = 0, leadRate = 0.02 } = {}) {
    this.px = this.x; this.py = this.y;
    this.leadX = damp(this.leadX, leadX, leadRate, dt);
    this.leadY = damp(this.leadY, leadY, leadRate, dt);
    this.x = damp(this.x, tx + this.leadX, rate, dt);
    this.y = damp(this.y, ty + this.leadY, rate, dt);
    this.zoom = damp(this.zoom, this.zoomT, 0.004, dt);
  }

  /* The shake runs on the REAL clock, not the simulation's.
   *
   * It used to live in follow(), which only runs inside game.update(), which
   * the loop skips entirely during a hitstop — so for the whole ninety
   * milliseconds of the freeze the camera held one static offset and did not
   * move, and the shake only began once the freeze was over and the trauma had
   * already decayed by half. Freeze and shake were strictly sequential, and a
   * freeze that does not shake reads as a dropped frame rather than an impact.
   * They have to happen at the same time, because they are the same event. */
  shakeStep(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.1);
    const s = Math.pow(this.trauma, 1.5);
    const n = this._seed;
    this.shakeX = (n() * 2 - 1) * s * 28;
    this.shakeY = (n() * 2 - 1) * s * 28;
    this.tilt = (n() * 2 - 1) * s * 0.02;
  }

  apply(ctx, alpha = 1) {
    const cx = lerp(this.px, this.x, alpha) + this.shakeX;
    const cy = lerp(this.py, this.y, alpha) + this.shakeY;
    ctx.translate(this.w / 2, this.h / 2);
    ctx.rotate(this.tilt);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx, -cy);
    return { cx, cy };
  }
}

/* --- loop -------------------------------------------------------------- */

/* Fixed-step simulation, interpolated rendering, and a hitstop budget that
 * freezes simulation without freezing the draw. `?test=1` hands the clock to
 * the test runner so runs are reproducible. */
export class Loop {
  constructor({ step = 1 / 120, maxFrame = 0.25, update, draw }) {
    this.step = step; this.maxFrame = maxFrame;
    this.update = update; this.draw = draw;
    this.acc = 0; this.last = 0; this.alpha = 0;
    this.time = 0; this.frames = 0;
    this.hitstop = 0;
    this.timeScale = 1;
    this.running = false;
    this.fps = 60; this._fpsAcc = 0; this._fpsN = 0;
  }

  freeze(seconds) { this.hitstop = Math.max(this.hitstop, seconds); }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now() / 1000;
    const frame = () => {
      if (!this.running) return;
      const now = performance.now() / 1000;
      let dt = Math.min(this.maxFrame, now - this.last);
      this.last = now;
      this._fpsAcc += dt; this._fpsN++;
      if (this._fpsAcc > 0.5) { this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; }
      this.advance(dt);
      this.draw(this.alpha);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop() { this.running = false; }

  /* Also used directly by tests to step a fixed amount of wall time. */
  advance(dt) {
    if (this.hitstop > 0) {
      const eat = Math.min(this.hitstop, dt);
      this.hitstop -= eat; dt -= eat;
      if (dt <= 0) return;
    }
    this.acc += dt * this.timeScale;
    let guard = 0;
    while (this.acc >= this.step && guard++ < 240) {
      this.update(this.step);
      this.time += this.step;
      this.frames++;
      this.acc -= this.step;
    }
    this.alpha = this.acc / this.step;
  }
}

/* --- juice ------------------------------------------------------------- */

/* A pooled particle system. One flat array, no allocation in the hot path. */
export class Particles {
  constructor(max = 2200) {
    this.max = max; this.n = 0;
    this.x = new Float32Array(max); this.y = new Float32Array(max);
    this.px = new Float32Array(max); this.py = new Float32Array(max);
    this.vx = new Float32Array(max); this.vy = new Float32Array(max);
    this.life = new Float32Array(max); this.max_ = new Float32Array(max);
    this.size = new Float32Array(max); this.drag = new Float32Array(max);
    this.grav = new Float32Array(max); this.kind = new Int16Array(max);
    this.rot = new Float32Array(max); this.spin = new Float32Array(max);
    this.hue = new Float32Array(max);
  }

  spawn(x, y, vx, vy, life, size, kind = 0, { drag = 0.35, grav = 0, spin = 0, hue = 0 } = {}) {
    let i = this.n;
    if (i >= this.max) { i = (Math.random() * this.max) | 0; } else { this.n++; }
    this.x[i] = this.px[i] = x; this.y[i] = this.py[i] = y;
    this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = this.max_[i] = life; this.size[i] = size;
    this.kind[i] = kind; this.drag[i] = drag; this.grav[i] = grav;
    this.rot[i] = Math.random() * 6.283; this.spin[i] = spin; this.hue[i] = hue;
    return i;
  }

  step(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.px[i] = this.x[i]; this.py[i] = this.y[i];
      const d = Math.pow(this.drag[i], dt);
      this.vx[i] *= d; this.vy[i] *= d;
      this.vy[i] += this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
      this.rot[i] += this.spin[i] * dt;
      this.life[i] -= dt;
    }
    /* Compact from the back so the live range stays dense. */
    while (this.n > 0 && this.life[this.n - 1] <= 0) this.n--;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) {
        const j = --this.n;
        this.x[i] = this.x[j]; this.y[i] = this.y[j];
        this.px[i] = this.px[j]; this.py[i] = this.py[j];
        this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j];
        this.life[i] = this.life[j]; this.max_[i] = this.max_[j];
        this.size[i] = this.size[j]; this.drag[i] = this.drag[j];
        this.grav[i] = this.grav[j]; this.kind[i] = this.kind[j];
        this.rot[i] = this.rot[j]; this.spin[i] = this.spin[j];
        this.hue[i] = this.hue[j];
        while (this.n > 0 && this.life[this.n - 1] <= 0) this.n--;
      }
    }
  }

  clear() { this.n = 0; }
}
