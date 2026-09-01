const ACTION_KEYS = {
  quick: ['Mouse0', 'KeyJ'],
  heavy: ['Mouse2', 'KeyK'],
  jump: ['Space'],
  dodge: ['ShiftLeft', 'ShiftRight'],
  parry: ['KeyE', 'KeyL'],
  chase: ['KeyF', 'KeyO'],
  shot: ['KeyR', 'KeyI'],
  lock: ['KeyQ', 'Mouse1'],
  special: ['KeyX'],
  pause: ['Escape', 'KeyP'],
  start: ['Enter']
};

const KEY_ACTION = new Map();
for (const [action, codes] of Object.entries(ACTION_KEYS)) {
  for (const code of codes) KEY_ACTION.set(code, action);
}

export class InputManager {
  constructor(element = window) {
    this.element = element;
    this.down = new Set();
    this.pressedAt = new Map();
    this.pressedDevice = new Map();
    this.releasedAt = new Map();
    this.consumedAt = new Map();
    this.cameraDX = 0;
    this.cameraDY = 0;
    this.wheel = 0;
    this.usingGamepad = false;
    this.lastDevice = 'keyboard';
    this.lastActionDevice = 'keyboard';
    this.enabled = true;
    this.gamepadDown = new Map();
    this.bufferSeconds = 0.18;
    this.rawEventCount = 0;
    this.trustedEventCount = 0;
    this.untrustedEventCount = 0;
    this._listeners = [];
    this._install();
  }

  _on(target, event, fn, options) {
    target.addEventListener(event, fn, options);
    this._listeners.push(() => target.removeEventListener(event, fn, options));
  }

  _install() {
    this._on(window, 'keydown', (event) => {
      this._recordRaw(event);
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.code)) event.preventDefault();
      if (!event.repeat) this._pressCode(event.code, performance.now() / 1000, 'keyboard');
      this.down.add(event.code);
      this.lastDevice = 'keyboard';
    }, { passive: false });
    this._on(window, 'keyup', (event) => {
      this._recordRaw(event);
      this.down.delete(event.code);
      this.releasedAt.set(KEY_ACTION.get(event.code) || event.code, performance.now() / 1000);
    });
    this._on(window, 'mousedown', (event) => {
      this._recordRaw(event);
      if (!this.enabled) return;
      const code = `Mouse${event.button}`;
      this._pressCode(code, performance.now() / 1000, 'mouse');
      this.down.add(code);
      this.lastDevice = 'mouse';
      if (event.button !== 0) event.preventDefault();
    }, { passive: false });
    this._on(window, 'mouseup', (event) => {
      this._recordRaw(event);
      const code = `Mouse${event.button}`;
      this.down.delete(code);
      this.releasedAt.set(KEY_ACTION.get(code) || code, performance.now() / 1000);
    });
    this._on(window, 'mousemove', (event) => {
      if (!this.enabled) return;
      this.cameraDX += event.movementX || 0;
      this.cameraDY += event.movementY || 0;
      if (event.movementX || event.movementY) this.lastDevice = 'mouse';
    });
    this._on(window, 'wheel', (event) => {
      if (!this.enabled) return;
      this.wheel += Math.sign(event.deltaY);
      this.lastDevice = 'mouse';
    }, { passive: true });
    this._on(window, 'contextmenu', (event) => event.preventDefault());
    this._on(window, 'blur', () => this.clearHeld());
    this._on(document, 'visibilitychange', () => {
      if (document.hidden) this.clearHeld();
    });
  }

  _recordRaw(event) {
    this.rawEventCount++;
    if (event.isTrusted) this.trustedEventCount++;
    else this.untrustedEventCount++;
  }

  _pressCode(code, now, device = this.lastDevice) {
    const action = KEY_ACTION.get(code);
    if (action && !this.down.has(code)) {
      this.pressedAt.set(action, now);
      this.pressedDevice.set(action, device);
    }
  }

  beginFrame(now = performance.now() / 1000) {
    this.now = now;
    this._pollGamepad(now);
  }

  _pollGamepad(now) {
    const pads = navigator.getGamepads?.() || [];
    const pad = Array.from(pads).find(Boolean);
    this.pad = pad || null;
    if (!pad) {
      this.usingGamepad = false;
      return;
    }
    const map = {
      quick: 2,
      heavy: 3,
      jump: 0,
      dodge: 1,
      parry: 4,
      shot: 6,
      chase: 7,
      lock: 11,
      special: 5,
      pause: 9,
      start: 9
    };
    let activity = false;
    for (const [action, index] of Object.entries(map)) {
      const isDown = Boolean(pad.buttons[index]?.pressed || pad.buttons[index]?.value > 0.55);
      const wasDown = Boolean(this.gamepadDown.get(action));
      if (isDown && !wasDown) {
        this.pressedAt.set(action, now);
        this.pressedDevice.set(action, 'gamepad');
      }
      this.gamepadDown.set(action, isDown);
      activity ||= isDown;
    }
    activity ||= Math.abs(pad.axes[0] || 0) > 0.18 || Math.abs(pad.axes[1] || 0) > 0.18 || Math.abs(pad.axes[2] || 0) > 0.18 || Math.abs(pad.axes[3] || 0) > 0.18;
    if (activity) {
      this.lastDevice = 'gamepad';
      this.usingGamepad = true;
    }
  }

  consume(action, buffer = this.bufferSeconds) {
    const pressed = this.pressedAt.get(action);
    if (pressed == null || this.now - pressed > buffer) return false;
    if ((this.consumedAt.get(action) ?? -1) >= pressed) return false;
    this.consumedAt.set(action, pressed);
    this.lastActionDevice = this.pressedDevice.get(action) || this.lastDevice;
    return true;
  }

  peek(action, buffer = this.bufferSeconds) {
    const pressed = this.pressedAt.get(action);
    return pressed != null && this.now - pressed <= buffer && (this.consumedAt.get(action) ?? -1) < pressed;
  }

  held(actionOrCode) {
    if (ACTION_KEYS[actionOrCode]?.some((code) => this.down.has(code))) return true;
    if (this.gamepadDown.get(actionOrCode)) return true;
    return this.down.has(actionOrCode);
  }

  getMove() {
    let x = 0;
    let y = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) x -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) x += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) y += 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) y -= 1;
    if (this.pad) {
      const dead = (value) => Math.abs(value) < 0.16 ? 0 : Math.sign(value) * (Math.abs(value) - 0.16) / 0.84;
      x += dead(this.pad.axes[0] || 0);
      y += -dead(this.pad.axes[1] || 0);
    }
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    return { x, y, length: Math.min(1, length) };
  }

  consumeCamera() {
    let x = this.cameraDX;
    let y = this.cameraDY;
    this.cameraDX = 0;
    this.cameraDY = 0;
    if (this.pad) {
      const ax = this.pad.axes[2] || 0;
      const ay = this.pad.axes[3] || 0;
      x += Math.abs(ax) > 0.14 ? ax * 18 : 0;
      y += Math.abs(ay) > 0.14 ? ay * 14 : 0;
    }
    const wheel = this.wheel;
    this.wheel = 0;
    return { x, y, wheel };
  }

  clearHeld() {
    this.down.clear();
    this.gamepadDown.clear();
    this.cameraDX = 0;
    this.cameraDY = 0;
  }

  clearBuffers() {
    this.pressedAt.clear();
    this.pressedDevice.clear();
    this.consumedAt.clear();
    this.releasedAt.clear();
  }

  vibrate(duration = 70, strong = 0.35, weak = 0.6) {
    const actuator = this.pad?.vibrationActuator;
    if (!actuator?.playEffect) return false;
    actuator.playEffect('dual-rumble', {
      duration,
      strongMagnitude: Math.max(0, Math.min(1, strong)),
      weakMagnitude: Math.max(0, Math.min(1, weak))
    }).catch(() => {});
    return true;
  }

  snapshot() {
    const move = this.getMove();
    const buffered = [];
    for (const [action, pressed] of this.pressedAt) {
      if (this.now - pressed <= this.bufferSeconds && (this.consumedAt.get(action) ?? -1) < pressed) buffered.push(action);
    }
    return {
      device: this.lastDevice,
      move,
      held: Array.from(this.down),
      buffered,
      rawEventCount: this.rawEventCount,
      trustedEventCount: this.trustedEventCount,
      untrustedEventCount: this.untrustedEventCount
    };
  }

  dispose() {
    for (const off of this._listeners.splice(0)) off();
    this.clearHeld();
    this.clearBuffers();
  }
}
