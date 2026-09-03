// input — the ONE path every control takes, real or synthetic.
//
// Donor: VIGIL src/engine/input.js:1-87 (held/pressed/released sets, a mouse delta
// accumulated between frames and consumed once per step, the noLock escape hatch).
// Ported to a class because main.js constructs it, and hardened in three places that
// have each cost a shipped game:
//
//  1. FLARE shipped a broken trigger through 967 green checks because every suite called
//     the fire function directly and no suite ever pressed a mouse button. ARC shipped
//     with the right button's bit swapped for the same reason. So `set()` — the test
//     door — does not set flags of its own: it calls the SAME _down/_up that the DOM
//     listeners call. If the binding is wrong, the tests are wrong with it, loudly.
//  2. A press that happens BETWEEN two fixed steps used to vanish. VIGIL cleared
//     `pressed` every rAF; a 8 ms tap inside a 30 fps frame was simply never seen. Here
//     edges are cleared per fixed STEP, and a button released before any step observed
//     it holds its `held` bit until exactly one step has read it (the latch below).
//     That is what "a press slightly early still fires" means at this layer.
//  3. CFG.weapons.core.inputBuffer (0.220 s) is exposed as a real queue —
//     `buffered(action)` / `consumePress(action)` — so a consumer that was busy when the
//     press arrived can still honour it. weapons/weapon.js does its own buffering off the
//     held booleans (see weapon.js:602-607), so today nothing consumes this queue; it is
//     here because the queue, not the consumer, is the input layer's contract.
//
// The look delta is ACCUMULATED by the event and consumed once per fixed step. Reading
// mousemove inside the step would give you whatever fraction of the motion happened to
// land in that window and makes sensitivity frame-rate dependent.

import { CFG } from '../config.js';

// Every action name in the game. The controller reads forward/back/left/right/jump/
// sprint/crouch/tacsprint (player HANDOFF A.1); weapons reads the fire/aim/reload/melee
// booleans (weapons HANDOFF §7); torch is toggled by main on the press edge.
export const ACTIONS = Object.freeze([
  'forward', 'back', 'left', 'right',
  'jump', 'sprint', 'crouch', 'tacsprint',
  'fire', 'aim', 'reload', 'melee', 'torch',
  // The car's two verbs. The vehicle lane shipped a shim that binds KeyE and KeyH through
  // this file's own _down/_up and stands itself down the moment the engine adopts these two
  // names — so adopting them here is the handover, and the shim becomes dead weight rather
  // than a second input path competing with this one.
  'use', 'horn',
  'menu',
]);

// e.code, never e.key: e.key is layout- and modifier-dependent and 'W' with shift held
// is a different string from 'w'. Ctrl AND C both crouch; F is the torch (VIGIL bound F
// to melee — melee here is V and the middle mouse button, per this brief).
const KEYMAP = Object.freeze({
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  ControlLeft: 'crouch', ControlRight: 'crouch', KeyC: 'crouch',
  KeyR: 'reload',
  KeyV: 'melee',
  KeyF: 'torch',
  KeyE: 'use',
  KeyH: 'horn',
  // ROUND 5 (NEXT.md item 3): the arsenal. Q cycles the owned weapons, 1 and 2 pick a slot.
  // weapons/weapon.js reads these through held() on the same edge path as reload.
  KeyQ: 'swap',
  Digit1: 'slot1', Digit2: 'slot2',
  Escape: 'menu',
});

// Mouse buttons, written out because ARC shipped with these two swapped. MouseEvent.button:
// 0 = left (primary), 1 = middle (auxiliary), 2 = right (secondary). NOT the `buttons` bitmask.
const BUTTON_ACTION = Object.freeze({ 0: 'fire', 1: 'melee', 2: 'aim' });

// Aliases accepted by set() so a test can say what it means.
const ALIAS = Object.freeze({
  ads: 'aim', shoot: 'fire', attack: 'fire', run: 'sprint', ctrl: 'crouch',
  flashlight: 'torch', light: 'torch', tac: 'tacsprint', tacSprint: 'tacsprint',
});

// Reused by consumeLook(). One object for the life of the page: the look is consumed
// exactly once per fixed step, synchronously, by the camera and by nobody else, so a
// fresh object per step would be pure garbage on the hot path.
const _look = { dx: 0, dy: 0 };

export class Input {
  // Deliberately NO `static id`: tests/reverse-manifest.mjs treats any file with a
  // `static id` as a SYSTEMS entry, and input is the engine's own layer, not a manifest
  // system. main.js still publishes it at ctx.input and ctx.systems.get('input').

  constructor(ctx) {
    this.ctx = ctx;
    this.canvas = ctx.canvas || (typeof document !== 'undefined' ? document.getElementById('gl') : null);

    this._held = new Set();
    this._pressed = new Set();
    this._released = new Set();
    // Actions whose press has not yet been seen by a fixed step. A release while latched
    // is DEFERRED so a sub-frame tap survives to exactly one step.
    this._latch = new Set();
    this._pendingUp = new Set();
    // action -> seconds of CFG.weapons.core.inputBuffer left on an unconsumed press.
    this._queue = new Map();

    this._dx = 0;
    this._dy = 0;

    this.enabled = true;
    this.pointerLocked = false;
    // Set of actions currently held by a synthetic driver, so a blur() from the headless
    // browser losing focus cannot silently zero a test's inputs.
    this._synthetic = new Set();

    this._bound = false;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onContextMenu = (e) => e.preventDefault();
    this._onLockChange = this._onLockChange.bind(this);
  }

  async init() {
    if (this._bound || typeof window === 'undefined') return;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('pointerlockchange', this._onLockChange);
    if (this.canvas) {
      this.canvas.addEventListener('mousedown', this._onMouseDown);
      this.canvas.addEventListener('contextmenu', this._onContextMenu);
    }
    this._bound = true;
  }

  ready() { return this._bound || typeof window === 'undefined'; }

  /**
   * VIGIL's noLock, kept alive on the public test object (player HANDOFF A.2): with it
   * set, mousemove is accepted with no pointer lock, so a headless run can drive look
   * through the real listener instead of a side door.
   */
  get noLock() {
    return typeof window !== 'undefined' && !!(window.__CURFEW && window.__CURFEW.noLock);
  }

  _locked() {
    if (this.noLock) return true;
    return typeof document !== 'undefined'
      && this.canvas != null && document.pointerLockElement === this.canvas;
  }

  /* ------------------------------------------------------------------ edges */

  /** The ONE place an action goes down. Both the DOM and set() come through here. */
  _down(action) {
    if (!action) return;
    if (!this._held.has(action)) {
      this._pressed.add(action);
      this._latch.add(action);
      this._queue.set(action, CFG.weapons.core.inputBuffer);
    }
    this._pendingUp.delete(action);
    this._held.add(action);
  }

  /** The ONE place an action goes up. */
  _up(action) {
    if (!action) return;
    if (this._latch.has(action)) {
      // Pressed and released inside the same frame: hold the bit until one fixed step
      // has read it, then release at the end of that step. Without this a fast tap is
      // invisible to weapons, which derives its own edges from the held booleans.
      this._pendingUp.add(action);
      return;
    }
    if (this._held.delete(action)) this._released.add(action);
  }

  /* ------------------------------------------------------------------ DOM */

  _onKeyDown(e) {
    if (!this.enabled || e.repeat) return;
    const a = KEYMAP[e.code];
    if (!a) return;
    // Space scrolls the page and the arrows scroll it too — both would fight the game.
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    this._down(a);
  }

  _onKeyUp(e) {
    const a = KEYMAP[e.code];
    if (!a) return;
    this._up(a);
  }

  _onMouseDown(e) {
    if (!this.enabled) return;
    if (!this._locked()) {
      // Not playing yet: the click is a request to play, not a shot.
      this.ctx.bus.emit('input:clickthrough', null);
      return;
    }
    const a = BUTTON_ACTION[e.button];
    if (!a) return;
    if (e.button === 1) e.preventDefault();   // middle click otherwise starts autoscroll
    this._down(a);
  }

  _onMouseUp(e) {
    const a = BUTTON_ACTION[e.button];
    if (!a) return;
    this._up(a);
  }

  _onMouseMove(e) {
    if (!this.enabled || !this._locked()) return;
    // movementX/Y, never clientX deltas: under pointer lock the cursor does not move.
    this._dx += e.movementX || 0;
    this._dy += e.movementY || 0;
  }

  _onBlur() {
    // Alt-tabbing away must not leave the player sprinting into a tree forever. Synthetic
    // holds are exempt: a headless page can lose focus mid-measurement.
    for (const a of this._held) {
      if (!this._synthetic.has(a)) { this._released.add(a); this._held.delete(a); }
    }
    this._latch.clear();
    this._pendingUp.clear();
    this._dx = 0; this._dy = 0;
  }

  _onLockChange() {
    this.pointerLocked = typeof document !== 'undefined'
      && this.canvas != null && document.pointerLockElement === this.canvas;
    this.ctx.bus.emit('input:lock', this.pointerLocked);
  }

  requestLock() {
    if (this.canvas && this.canvas.requestPointerLock) this.canvas.requestPointerLock();
  }

  /* ------------------------------------------------------------------ reads */

  held(action) { return this._held.has(action); }
  /** Strict one-fixed-step edge. Cleared by endStep(), not by the frame. */
  pressed(action) { return this._pressed.has(action); }
  released(action) { return this._released.has(action); }

  /** Is there an unconsumed press inside CFG.weapons.core.inputBuffer? */
  buffered(action) { return (this._queue.get(action) || 0) > 0; }
  /** Seconds of buffer left on the queued press, 0 if none. */
  pressAge(action) {
    const left = this._queue.get(action) || 0;
    return left > 0 ? CFG.weapons.core.inputBuffer - left : 0;
  }
  /** Take the queued press. Returns true if there was one. */
  consumePress(action) {
    if ((this._queue.get(action) || 0) <= 0) return false;
    this._queue.set(action, 0);
    return true;
  }

  // The four booleans weapons reads off ctx.input (weapons HANDOFF §7). They are plain
  // getters over the same held set, so there is no second source of truth to disagree.
  get fire() { return this._held.has('fire'); }
  get aim() { return this._held.has('aim'); }
  get ads() { return this._held.has('aim'); }
  get reload() { return this._held.has('reload'); }
  get melee() { return this._held.has('melee'); }
  get torch() { return this._held.has('torch'); }

  /** Consume the accumulated mouse delta. Exactly once per fixed step, by the camera. */
  consumeLook() {
    _look.dx = this._dx; _look.dy = this._dy;
    this._dx = 0; this._dy = 0;
    return _look;
  }

  /* ------------------------------------------------------------------ frame */

  /**
   * Called by main.js at the end of every FIXED STEP (not every frame). Order matters:
   * clear the edges the step just consumed, THEN apply deferred releases, so the next
   * step sees the button up and a `released` edge exactly once.
   */
  endStep(dt) {
    this._pressed.clear();
    this._released.clear();
    if (this._pendingUp.size) {
      for (const a of this._pendingUp) {
        if (this._held.delete(a)) this._released.add(a);
        this._synthetic.delete(a);
      }
      this._pendingUp.clear();
    }
    this._latch.clear();
    if (this._queue.size) {
      const d = dt || CFG.loop.FIXED;
      for (const [a, left] of this._queue) {
        if (left > 0) this._queue.set(a, Math.max(0, left - d));
      }
    }
  }

  /**
   * Called every rAF, even when zero steps ran. Nothing to clear here today — edges are
   * per-step — but the hook exists so a frame-scoped input (wheel notches, gamepad
   * polling) has an obvious home instead of being bolted onto endStep.
   */
  endFrame() {}

  /* ------------------------------------------------------------------ test door */

  /**
   * Synthetic input, through the SAME _down/_up the DOM uses. Partial: only the keys
   * present are changed, so setInput({fire:false}) does not stop a walk.
   * Accepts look as lookX/lookY (or dx/dy, or look:{dx,dy}) in mouse pixels.
   */
  set(partial) {
    if (!partial) return;
    for (const rawKey of Object.keys(partial)) {
      const key = ALIAS[rawKey] || rawKey;
      const v = partial[rawKey];
      if (key === 'lookX' || key === 'dx') { this.injectLook(+v || 0, 0); continue; }
      if (key === 'lookY' || key === 'dy') { this.injectLook(0, +v || 0); continue; }
      if (key === 'look' && v && typeof v === 'object') {
        this.injectLook(+v.dx || 0, +v.dy || 0);
        continue;
      }
      if (ACTIONS.indexOf(key) < 0) continue;   // unknown key: ignored, never invented
      if (v) { this._synthetic.add(key); this._down(key); }
      else { this._synthetic.delete(key); this._up(key); }
    }
  }

  /** Accumulate look exactly where a mousemove would. */
  injectLook(dx, dy) { this._dx += dx; this._dy += dy; }

  /** Everything up, look zeroed. Used between test scenarios. */
  clear() {
    for (const a of this._held) this._released.add(a);
    this._held.clear();
    this._latch.clear();
    this._pendingUp.clear();
    this._synthetic.clear();
    this._queue.clear();
    this._dx = 0; this._dy = 0;
  }

  /** Readable snapshot for __CURFEW.state(). Allocates; never called in the loop. */
  snapshot() {
    const out = {};
    for (let i = 0; i < ACTIONS.length; i++) out[ACTIONS[i]] = this._held.has(ACTIONS[i]);
    out.lookPending = { dx: this._dx, dy: this._dy };
    out.pointerLocked = this.pointerLocked;
    return out;
  }

  dispose() {
    if (!this._bound || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this._onMouseDown);
      this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    }
    this._bound = false;
  }
}

export default Input;
