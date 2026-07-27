// Input: pointer lock mouse-look + key state. Consumers read `input.look`
// deltas once per frame (they are zeroed after each read) and query keys via
// down()/pressed(). pressed() is edge-triggered and consumed per frame.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouseDown = [false, false, false];
    this.mousePressed = [false, false, false];
    this.lookX = 0;              // accumulated mouse delta this frame
    this.lookY = 0;
    this.sensitivity = 0.0021;
    this.locked = false;
    this.onLockChange = null;    // game pauses/resumes off this
    this.wheel = 0;

    // --- touch ---------------------------------------------------------
    // A thumb cannot press a key, so on-screen buttons hold and release the same
    // key codes the keyboard uses, and the left stick supplies an analog move
    // vector that moveAxis() folds in beside WASD. Look deltas go straight into
    // lookX/lookY, the same accumulators the mouse writes, so nothing downstream
    // knows the difference.
    this.touch = false;          // true once a real touch has happened
    this.touchHeld = new Set();
    this.touchPressed = new Set();
    this.touchMove = { f: 0, s: 0 };
    this.touchSensitivity = 0.0030;   // a thumb travels less than a mouse

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressedKeys.add(e.code);
      // Keep the browser from scrolling/attention-stealing during play.
      if (this.locked && (e.code === 'Space' || e.code === 'Tab')) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = [false, false, false]; });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      // Clamp: pointer-lock can emit a giant delta on re-lock glitches.
      const mx = Math.max(-200, Math.min(200, e.movementX));
      const my = Math.max(-200, Math.min(200, e.movementY));
      this.lookX += mx;
      this.lookY += my;
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button <= 2) { this.mouseDown[e.button] = true; this.mousePressed[e.button] = true; }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button <= 2) this.mouseDown[e.button] = false;
    });
    document.addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('contextmenu', (e) => { if (this.locked) e.preventDefault(); });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) { this.keys.clear(); this.mouseDown = [false, false, false]; }
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  requestLock() {
    if (this.locked) return;
    // No mobile browser implements Pointer Lock, and calling it there throws
    // synchronously, aborting whatever was mid-flight. Bail out quietly; callers
    // gate on Input.pointerLockSupported() before starting a run.
    if (!Input.pointerLockSupported()) return;
    try {
      // unadjustedMovement disables OS mouse accel where supported = cleaner aim.
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

  down(code) { return this.keys.has(code) || this.touchHeld.has(code); }
  pressed(code) {
    if (this.pressedKeys.has(code)) { this.pressedKeys.delete(code); return true; }
    if (this.touchPressed.has(code)) { this.touchPressed.delete(code); return true; }
    return false;
  }

  // An on-screen button behaves exactly like the key it stands for.
  setTouchHeld(code, isDown) {
    if (isDown) { if (!this.touchHeld.has(code)) this.touchPressed.add(code); this.touchHeld.add(code); }
    else this.touchHeld.delete(code);
  }

  // Forward/strafe intent from keys AND the left stick. Keys stay ±1; the stick
  // is analog, and the pair is clamped rather than normalised so a gentle push
  // stays gentle while a diagonal never exceeds full speed.
  moveAxis() {
    let f = (this.down('KeyW') ? 1 : 0) - (this.down('KeyS') ? 1 : 0) + this.touchMove.f;
    let s = (this.down('KeyD') ? 1 : 0) - (this.down('KeyA') ? 1 : 0) + this.touchMove.s;
    const len = Math.hypot(f, s);
    if (len > 1) { f /= len; s /= len; }
    return { f, s };
  }

  releaseTouch() {
    this.touchHeld.clear();
    this.touchMove.f = 0; this.touchMove.s = 0;
    this.mouseDown = [false, false, false];
  }
  firePressed() { if (this.mousePressed[0]) { this.mousePressed[0] = false; return true; } return false; }
  altPressed() { if (this.mousePressed[2]) { this.mousePressed[2] = false; return true; } return false; }

  // Call at end of frame: hand back look deltas and clear one-frame state.
  consumeLook() {
    const x = this.lookX * this.sensitivity;
    const y = this.lookY * this.sensitivity;
    this.lookX = 0; this.lookY = 0;
    return { x, y };
  }
  endFrame() {
    this.pressedKeys.clear();
    this.touchPressed.clear();
    this.mousePressed = [false, false, false];
    this.wheel = 0;
  }
}
