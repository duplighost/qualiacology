// Input: keyboard + mouse (pointer lock) + gamepad, polled once per frame into a snapshot.
// Tests can inject state through `inject` and the real listeners are on the CANVAS
// (so window.dispatchEvent never reaches them — drive Playwright's real mouse instead).
export class Input {
  constructor(canvas, { lock = true } = {}) {
    this.canvas = canvas;
    this.wantLock = lock;
    this.keys = new Set();
    this.pressed = new Set();     // edge: pressed this frame
    this.released = new Set();
    this.mouse = { dx: 0, dy: 0, buttons: 0, wheel: 0, x: 0, y: 0 };
    this.buttonsPressed = 0;      // edge bits
    this.buttonsReleased = 0;
    this.locked = false;
    this.gamepad = null;
    this.injected = null;         // {keys:Set, dx, dy, buttons}
    this.enabled = true;
    this.onLockChange = null;
    this.onGesture = null;        // first user gesture (for audio)
    this._gestured = false;

    const gesture = () => { if (!this._gestured) { this._gestured = true; this.onGesture && this.onGesture(); } };

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      gesture();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.released.add(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.buttons = 0; });

    canvas.addEventListener('mousedown', (e) => {
      gesture();
      const bit = 1 << e.button;
      if (!(this.mouse.buttons & bit)) this.buttonsPressed |= bit;
      this.mouse.buttons |= bit;
      if (this.wantLock && !this.locked && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock && canvas.requestPointerLock();
      }
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      const bit = 1 << e.button;
      if (this.mouse.buttons & bit) this.buttonsReleased |= bit;
      this.mouse.buttons &= ~bit;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (this.locked || !this.wantLock) { this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0; }
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    });
    window.addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLockChange && this.onLockChange(this.locked);
    });
    window.addEventListener('gamepadconnected', (e) => { this.gamepad = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepad = null; });
  }

  requestLock() { if (this.wantLock && this.canvas.requestPointerLock) this.canvas.requestPointerLock(); }
  releaseLock() { if (document.pointerLockElement === this.canvas && document.exitPointerLock) document.exitPointerLock(); }

  // Returns a snapshot and clears per-frame accumulators.
  poll() {
    const inj = this.injected;
    const keys = inj?.keys || this.keys;
    const down = (...codes) => codes.some(c => keys.has(c));
    let gp = null;
    if (this.gamepad !== null && navigator.getGamepads) {
      const g = navigator.getGamepads()[this.gamepad];
      if (g) gp = g;
    }
    const dead = (v) => Math.abs(v) < 0.14 ? 0 : v;
    const snap = {
      forward: (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0),
      strafe: (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0),
      jump: down('Space'),
      jumpPressed: this.pressed.has('Space'),
      sprint: down('ShiftLeft', 'ShiftRight'),
      crouch: down('ControlLeft', 'ControlRight', 'KeyC'),
      interact: down('KeyE'),
      interactPressed: this.pressed.has('KeyE'),
      escape: this.pressed.has('Escape'),
      restart: this.pressed.has('KeyR'),
      mutePressed: this.pressed.has('KeyM'),
      anyPressed: this.pressed.size > 0 || this.buttonsPressed !== 0,
      lookX: inj ? (inj.dx || 0) : this.mouse.dx,
      lookY: inj ? (inj.dy || 0) : this.mouse.dy,
      // bits follow e.button: left = 1 << 0, MIDDLE = 1 << 1, RIGHT = 1 << 2. The site boot check
      // (the only test with a real mouse) caught these swapped: the right button never called.
      primary: inj ? !!(inj.buttons & 1) : !!(this.mouse.buttons & 1),
      secondary: inj ? !!(inj.buttons & 4) : !!(this.mouse.buttons & 4),
      middle: inj ? !!(inj.buttons & 2) : !!(this.mouse.buttons & 2),
      primaryPressed: inj ? !!(inj.pressed & 1) : !!(this.buttonsPressed & 1),
      secondaryPressed: inj ? !!(inj.pressed & 4) : !!(this.buttonsPressed & 4),
      middlePressed: inj ? !!(inj.pressed & 2) : !!(this.buttonsPressed & 2),
      primaryReleased: inj ? !!(inj.released & 1) : !!(this.buttonsReleased & 1),
      secondaryReleased: inj ? !!(inj.released & 4) : !!(this.buttonsReleased & 4),
      wheel: this.mouse.wheel,
      locked: this.locked,
      gamepad: !!gp,
    };
    if (gp) {
      const lx = dead(gp.axes[0] || 0), ly = dead(gp.axes[1] || 0), rx = dead(gp.axes[2] || 0), ry = dead(gp.axes[3] || 0);
      if (lx || ly) { snap.strafe = lx; snap.forward = -ly; }
      snap.lookX += rx * 18; snap.lookY += ry * 18;
      const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      if (b(0)) { snap.jump = true; }
      if (b(7) || b(5)) snap.primary = true;
      if (b(6) || b(4)) snap.secondary = true;
      if (b(2)) snap.middle = true;
      if (b(1)) snap.sprint = true;
      if (b(9)) snap.escape = snap.escape || !this._gpStart; this._gpStart = b(9);
      // edges for gamepad buttons
      const prev = this._gpPrev || 0;
      const cur = (b(0) ? 1 : 0) | (b(7) || b(5) ? 2 : 0) | (b(6) || b(4) ? 4 : 0) | (b(2) ? 8 : 0);
      if ((cur & 1) && !(prev & 1)) snap.jumpPressed = true;
      if ((cur & 2) && !(prev & 2)) snap.primaryPressed = true;
      if ((cur & 4) && !(prev & 4)) snap.secondaryPressed = true;
      if ((cur & 8) && !(prev & 8)) snap.middlePressed = true;
      if (!(cur & 2) && (prev & 2)) snap.primaryReleased = true;
      if (!(cur & 4) && (prev & 4)) snap.secondaryReleased = true;
      if (cur) snap.anyPressed = snap.anyPressed || (cur & ~prev) !== 0;
      this._gpPrev = cur;
    }
    // clear accumulators
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
    this.pressed.clear(); this.released.clear();
    this.buttonsPressed = 0; this.buttonsReleased = 0;
    if (inj) { inj.dx = 0; inj.dy = 0; inj.pressed = 0; inj.released = 0; }
    return snap;
  }

  // Test injection: returns a controller with key(code, down), look(dx, dy), button(bit, down)
  inject() {
    if (!this.injected) this.injected = { keys: new Set(), dx: 0, dy: 0, buttons: 0, pressed: 0, released: 0 };
    const inj = this.injected;
    return {
      key: (code, d) => { if (d) { if (!inj.keys.has(code)) this.pressed.add(code); inj.keys.add(code); } else { inj.keys.delete(code); this.released.add(code); } },
      look: (dx, dy) => { inj.dx += dx; inj.dy += dy; },
      button: (bit, d) => { if (d) { if (!(inj.buttons & bit)) inj.pressed |= bit; inj.buttons |= bit; } else { if (inj.buttons & bit) inj.released |= bit; inj.buttons &= ~bit; } },
      clear: () => { inj.keys.clear(); inj.buttons = 0; inj.dx = inj.dy = 0; },
      stop: () => { this.injected = null; },
    };
  }
}
