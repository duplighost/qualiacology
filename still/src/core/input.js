// Input for STILL: pointer lock + keys, plus the thing this game cares about
// more than any other — whether you are truly still. Stillness tracks both
// feet AND hands: WASD held or the mouse trembling both count as movement,
// because being hunted by sound means your own shaking gives you away.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.sensitivity = 0.0019;
    this.locked = false;
    this.onLockChange = null;
    this.mouseMoved = 0;          // accumulated |delta| this frame, for stillness

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressedKeys.add(e.code);
      if (this.locked && (e.code === 'Space' || e.code === 'Tab')) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      const mx = Math.max(-180, Math.min(180, e.movementX));
      const my = Math.max(-180, Math.min(180, e.movementY));
      this.lookX += mx;
      this.lookY += my;
      this.mouseMoved += Math.abs(mx) + Math.abs(my);
    });
    document.addEventListener('contextmenu', (e) => { if (this.locked) e.preventDefault(); });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.keys.clear();
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  requestLock() {
    if (this.locked) return;
    // No mobile browser implements Pointer Lock, and calling it there throws
    // synchronously — which used to abort the caller mid-way through starting
    // the game. Bail out quietly instead; the caller gates on POINTER_LOCK.
    if (!Input.pointerLockSupported()) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { this.canvas.requestPointerLock(); } catch (e) {} });
    } catch (e) { /* older browsers throw on the options form */ }
  }

  // iOS omits the API outright. Android Chrome still EXPOSES requestPointerLock
  // while not supporting it, so a capability check alone waves phones through into
  // a game they cannot play. A device whose pointer is coarse and which has no fine
  // pointer at all is a phone or tablet; a touchscreen laptop reports any-pointer:
  // fine and keeps the desktop path.
  static pointerLockSupported() {
    if (typeof document.body.requestPointerLock !== 'function') return false;
    const mq = window.matchMedia;
    if (!mq) return true;
    return !(mq('(pointer: coarse)').matches && !mq('(any-pointer: fine)').matches);
  }

  down(code) { return this.keys.has(code); }
  pressed(code) {
    if (this.pressedKeys.has(code)) { this.pressedKeys.delete(code); return true; }
    return false;
  }
  anyMoveKey() {
    return this.keys.has('KeyW') || this.keys.has('KeyA') || this.keys.has('KeyS') || this.keys.has('KeyD');
  }

  consumeLook() {
    const x = this.lookX * this.sensitivity;
    const y = this.lookY * this.sensitivity;
    this.lookX = 0; this.lookY = 0;
    return { x, y };
  }
  endFrame() {
    this.pressedKeys.clear();
    this.mouseMoved = 0;
  }
}
