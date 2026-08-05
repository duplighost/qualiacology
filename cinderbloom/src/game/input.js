// Keyboard/mouse/gamepad + pointer lock, with a synthetic channel so the test
// harness can drive the player deterministically.
//
// INTEGRATOR PASS. COMBAT_FEEL 2.3 filed four asks against this file and none
// had been applied: tactical sprint (double-tap within 260 ms), hold-breath
// (sprint key while ADS), inspect, and — the one that actually changes how the
// game feels — a 220 ms INPUT BUFFER on fire and reload, so a click during
// sprint-out or mid-reload fires on the first legal frame instead of being
// silently dropped. Everything is edge-detected in `update()` at the fixed
// step, never in the DOM handler, so the buffer is deterministic under
// `__CB.advance()` and the byte-identical regression gate still holds.
const BUFFER = 0.220;      // s — COMBAT_FEEL 2.3
const DOUBLE_TAP = 0.260;  // s — tactical-sprint window
const PAD_DEADZONE = 0.18;
const PAD_LOOK_SPEED = 2.65; // rad/s at full deflection

export class Input {
  static id = 'input';
  static deps = [];
  constructor(ctx) {
    this.ctx = ctx;
    this.keys = Object.create(null);
    this.mouse = { dx: 0, dy: 0, wheel: 0 };
    this.buttons = Object.create(null);
    this.locked = false;
    this.sensitivity = 0.0022;
    this.adsSensScale = 0.62;   // COMBAT_FEEL 1.2 — coupled zoom sensitivity
    this.synthetic = Object.create(null);

    // Edge/latch state, all advanced from update() at the fixed step.
    this._t = 0;
    this._fireBuf = -9;
    this._reloadBuf = -9;
    this._sprintTapT = -9;
    this._prevSprint = false;
    this._prevFire = false;
    this._prevReload = false;
    this._prevInspect = false;
    this.tacSprint = false;     // latched until sprint is released
    this.inspect = false;       // one-frame pulse
    this._inspectPulse = false;
    this.gamepad = { connected: false, supported: false, id: '', index: -1, mapping: '' };
    this._padMoveX = 0; this._padMoveY = 0;
    this._padLookX = 0; this._padLookY = 0;
    this._movePad = { x: 0, y: 0 }; this._lookPad = { x: 0, y: 0 };
    this._padFire = false; this._padAim = false; this._padSprint = false;
    this._padCrouch = false; this._padJump = false; this._padReload = false;
    this._padInspect = false; this._padMelee = false; this._padPause = false;
    this._prevPadPause = false;
  }
  async init() {
    const canvas = this.ctx.canvas;
    addEventListener('keydown', e => {
      this.keys[e.code] = true;
      // Never trap Tab. Game keys only suppress browser actions while the
      // pointer is owned, so keyboard users can always leave the canvas.
      if (this.locked && ['Space', 'KeyR', 'KeyF', 'KeyC', 'KeyV'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = Object.create(null); this.buttons = Object.create(null); });
    canvas.addEventListener('mousedown', e => { this.buttons[e.button] = true; });
    addEventListener('mouseup', e => { this.buttons[e.button] = false; });
    addEventListener('contextmenu', e => { if (this.locked) e.preventDefault(); });
    addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.mouse.dx += e.movementX || 0;
      this.mouse.dy += e.movementY || 0;
    });
    addEventListener('wheel', e => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    canvas.addEventListener('click', () => { if (!this.locked) canvas.requestPointerLock?.(); });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.ctx.bus.emit('pointerlock', this.locked);
    });
  }
  setSynthetic(o) { Object.assign(this.synthetic, o); }
  clearSynthetic() { this.synthetic = Object.create(null); }
  resetTemporal() {
    this._fireBuf = -9; this._reloadBuf = -9; this._sprintTapT = -9;
    this._prevFire = this.fire; this._prevReload = this.reload;
    this._prevSprint = this.sprint; this._prevInspect = this.inspectHeld;
    this.tacSprint = false; this.inspect = false;
  }

  // --- raw channels ---------------------------------------------------------
  get fire() { return this.synthetic.fire ?? (!!this.buttons[0] || this._padFire); }
  get aim() { return this.synthetic.aim ?? (!!this.buttons[2] || this._padAim); }
  get sprint() { return this.synthetic.sprint ?? (!!this.keys.ShiftLeft || this._padSprint); }
  get crouch() { return this.synthetic.crouch ?? (!!this.keys.ControlLeft || this._padCrouch); }
  get jump() { return this.synthetic.jump ?? (!!this.keys.Space || this._padJump); }
  get reload() { return this.synthetic.reload ?? (!!this.keys.KeyR || this._padReload); }
  get inspectHeld() { return this.synthetic.inspect ?? (!!this.keys.KeyF || this._padInspect); }
  get melee() { return this.synthetic.melee ?? (!!this.keys.KeyV || this._padMelee); }

  /**
   * Sprint key held while already aiming = steady the sights. Deliberately not
   * a separate key: COMBAT_FEEL 2.3 wants it on the modifier the hand is
   * already on, and the sprint block in weapons.js ignores sprint while ADS.
   */
  get holdBreath() { return (this.synthetic.holdBreath ?? this.sprint) && this.aim; }

  /**
   * True for BUFFER seconds after the trigger went down, so a click that lands
   * during sprint-out or the uncancellable part of a reload still fires on the
   * first legal frame. Consumers that need the raw edge use `.fire`.
   */
  get fireBuffered() { return this.fire || (this._t - this._fireBuf) < BUFFER; }
  get reloadBuffered() { return this.reload || (this._t - this._reloadBuf) < BUFFER; }

  /** Consume the buffer — call this when the action actually happened. */
  consumeFireBuffer() { this._fireBuf = -9; }
  consumeReloadBuffer() { this._reloadBuf = -9; }

  moveVector(out) {
    if (this.synthetic.move) { out.x = this.synthetic.move[0]; out.y = this.synthetic.move[1]; return out; }
    out.x = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0) + this._padMoveX;
    out.y = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0) + this._padMoveY;
    const l = Math.hypot(out.x, out.y);
    if (l > 1) { out.x /= l; out.y /= l; }
    return out;
  }
  consumeLook() {
    if (this.synthetic.look) {
      const l = this.synthetic.look;
      if (!this.synthetic.lookHold) this.synthetic.look = null;
      return l;
    }
    // COMBAT_FEEL 1.2: sensitivity scales with the zoom or the world swings
    // past the sight at the same rate it swings past the hip.
    const s = this.sensitivity * (this.aim ? this.adsSensScale : 1);
    const l = [this.mouse.dx * s + this._padLookX, this.mouse.dy * s + this._padLookY];
    this.mouse.dx = 0; this.mouse.dy = 0;
    this._padLookX = 0; this._padLookY = 0;
    return l;
  }

  _button(pad, i, threshold = 0.5) {
    const b = pad?.buttons?.[i];
    return !!(b && (b.pressed || b.value > threshold));
  }

  _stick(x, y, out) {
    const m = Math.hypot(x, y);
    if (!(m > PAD_DEADZONE)) { out.x = 0; out.y = 0; return out; }
    const n = Math.min(1, (m - PAD_DEADZONE) / (1 - PAD_DEADZONE)) / m;
    out.x = x * n; out.y = y * n; return out;
  }

  _clearPad() {
    this._padMoveX = 0; this._padMoveY = 0;
    this._padFire = false; this._padAim = false; this._padSprint = false;
    this._padCrouch = false; this._padJump = false; this._padReload = false;
    this._padInspect = false; this._padMelee = false; this._padPause = false;
    this._prevPadPause = false;
  }

  _pollGamepad(dt) {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads
      ? navigator.getGamepads() : null;
    let pad = null, unsupported = null;
    if (pads) {
      const preferred = this.gamepad.index >= 0 ? pads[this.gamepad.index] : null;
      if (preferred?.connected && preferred.mapping === 'standard') pad = preferred;
      else for (let i = 0; i < pads.length; i++) {
        if (!pads[i]?.connected) continue;
        if (pads[i].mapping === 'standard') { pad = pads[i]; break; }
        unsupported ||= pads[i];
      }
    }
    if (!pad && unsupported) {
      const changed = !this.gamepad.connected || this.gamepad.supported || this.gamepad.index !== unsupported.index;
      this.gamepad.connected = true; this.gamepad.supported = false;
      this.gamepad.id = unsupported.id || 'Gamepad'; this.gamepad.index = unsupported.index;
      this.gamepad.mapping = unsupported.mapping || '';
      this._clearPad();
      if (changed) this.ctx.bus.emit('gamepad', { ...this.gamepad });
      return;
    }
    if (!pad) {
      if (this.gamepad.connected) this.ctx.bus.emit('gamepad', { connected: false });
      this.gamepad.connected = false; this.gamepad.supported = false;
      this.gamepad.id = ''; this.gamepad.index = -1; this.gamepad.mapping = '';
      this._clearPad();
      return;
    }
    if (!this.gamepad.connected || !this.gamepad.supported || this.gamepad.index !== pad.index) {
      this.ctx.bus.emit('gamepad', {
        connected: true, supported: true, id: pad.id, index: pad.index, mapping: pad.mapping,
      });
    }
    this.gamepad.connected = true; this.gamepad.supported = true;
    this.gamepad.id = pad.id || 'Gamepad'; this.gamepad.index = pad.index; this.gamepad.mapping = pad.mapping;

    const move = this._stick(pad.axes?.[0] || 0, -(pad.axes?.[1] || 0), this._movePad);
    const look = this._stick(pad.axes?.[2] || 0, pad.axes?.[3] || 0, this._lookPad);
    this._padMoveX = move.x; this._padMoveY = move.y;

    // Standard mapping: RT fire, LT aim, L3 sprint, A jump, B crouch,
    // X/R3 melee, Y reload, and Back inspect.
    this._padFire = this._button(pad, 7, 0.18);
    this._padAim = this._button(pad, 6, 0.18);
    this._padSprint = this._button(pad, 10);
    this._padJump = this._button(pad, 0);
    this._padCrouch = this._button(pad, 1);
    this._padMelee = this._button(pad, 2) || this._button(pad, 11);
    this._padReload = this._button(pad, 3);
    this._padInspect = this._button(pad, 8);
    this._padPause = this._button(pad, 9);
    if (this._padPause && !this._prevPadPause) this.ctx.bus.emit('ui:pause', { source: 'gamepad' });
    this._prevPadPause = this._padPause;
    const lookScale = PAD_LOOK_SPEED * dt * (this._padAim ? this.adsSensScale : 1);
    this._padLookX += look.x * lookScale;
    this._padLookY += look.y * lookScale;
  }

  update(dt) {
    this._t += dt;
    this._pollGamepad(dt);
    const f = this.fire, r = this.reload, sp = this.sprint, ins = this.inspectHeld;

    if (f && !this._prevFire) this._fireBuf = this._t;
    if (r && !this._prevReload) this._reloadBuf = this._t;

    // tactical sprint: two taps of the sprint key inside DOUBLE_TAP, latched
    // for as long as the second press is held.
    if (sp && !this._prevSprint) {
      this.tacSprint = (this._t - this._sprintTapT) < DOUBLE_TAP;
      this._sprintTapT = this._t;
    } else if (!sp) this.tacSprint = false;

    this.inspect = ins && !this._prevInspect;

    this._prevFire = f; this._prevReload = r; this._prevSprint = sp; this._prevInspect = ins;
  }

  debugState() {
    return {
      locked: this.locked, fire: this.fire, aim: this.aim, sprint: this.sprint,
      tacSprint: this.tacSprint, holdBreath: this.holdBreath, inspect: this.inspect,
      melee: this.melee, fireBuffered: this.fireBuffered, reloadBuffered: this.reloadBuffered,
      pause: this._padPause,
      gamepad: { ...this.gamepad },
    };
  }
}
