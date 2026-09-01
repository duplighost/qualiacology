const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const HOLD_KEYS = new Set(['Space', 'KeyW', 'ArrowUp']);
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight']);

export class InputSystem {
  constructor(shell, {
    onActivity = () => {},
    onPause = () => {},
    onMute = () => {},
    onInterrupt = () => {},
    onRestart = () => {}
  } = {}) {
    this.shell = shell;
    this.onActivity = onActivity;
    this.onPause = onPause;
    this.onMute = onMute;
    this.onInterrupt = onInterrupt;
    this.onRestart = onRestart;
    this.keys = new Set();
    this.pointerId = null;
    this.pointerType = '';
    this.pointerHold = false;
    this.pointerSteer = 0;
    this.pointerOrigin = { x: 0, y: 0 };
    this.keyboardHold = false;
    this.gamepadHold = false;
    this.gamepadSteer = 0;
    this.gamepadIndex = null;
    this.gamepadSeen = false;
    this.interrupted = false;
    this.restartStarted = 0;
    this.touchOrigin = document.querySelector('#touch-origin');
    this._listen();
  }

  _listen() {
    this.shell.addEventListener('pointerdown', (event) => this._pointerDown(event), { capture: true });
    window.addEventListener('pointermove', (event) => this._pointerMove(event), { passive: false });
    window.addEventListener('pointerup', (event) => this._pointerUp(event), { passive: false });
    window.addEventListener('pointercancel', (event) => this._pointerCancel(event), { passive: false });
    this.shell.addEventListener('lostpointercapture', (event) => this._pointerCancel(event));

    window.addEventListener('keydown', (event) => this._keyDown(event), { passive: false });
    window.addEventListener('keyup', (event) => this._keyUp(event), { passive: false });
    window.addEventListener('blur', () => this.interrupt('window blur'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.interrupt('tab hidden');
    });
    window.addEventListener('gamepaddisconnected', (event) => {
      if (event.gamepad.index === this.gamepadIndex && this.gamepadHold) this.interrupt('gamepad disconnected');
      if (event.gamepad.index === this.gamepadIndex) this.gamepadIndex = null;
    });
  }

  _isUi(target) {
    return target instanceof Element && Boolean(target.closest('#corner-controls, .panel'));
  }

  _pointerDown(event) {
    if (this._isUi(event.target) || event.button > 0 || this.pointerId !== null) return;
    this.onActivity({ kind: 'pointer', event });
    this.pointerId = event.pointerId;
    this.pointerType = event.pointerType || 'mouse';
    this.pointerHold = true;
    this.pointerSteer = 0;
    this.interrupted = false;
    this.pointerOrigin = { x: event.clientX, y: event.clientY };
    this._showOrigin(event.clientX, event.clientY);
    try { this.shell.setPointerCapture(event.pointerId); } catch { /* capture is an enhancement */ }
    event.preventDefault();
  }

  _pointerMove(event) {
    if (event.pointerId !== this.pointerId) return;
    const shellWidth = Math.max(180, this.shell.getBoundingClientRect().width);
    const range = Math.max(46, Math.min(96, shellWidth * 0.13));
    this.pointerSteer = clamp((event.clientX - this.pointerOrigin.x) / range, -1, 1);
    event.preventDefault();
  }

  _pointerUp(event) {
    if (event.pointerId !== this.pointerId) return;
    this.pointerHold = false;
    this.pointerSteer = 0;
    this.pointerId = null;
    this.pointerType = '';
    this._hideOrigin();
    event.preventDefault();
  }

  _pointerCancel(event) {
    if (event.pointerId !== this.pointerId) return;
    this.interrupt('pointer interrupted');
  }

  _keyDown(event) {
    const gameplayKey = HOLD_KEYS.has(event.code) || LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code);
    if (gameplayKey) {
      if (!event.repeat) this.onActivity({ kind: 'keyboard', event });
      this.keys.add(event.code);
      this.keyboardHold = [...HOLD_KEYS].some((code) => this.keys.has(code));
      this.interrupted = false;
      event.preventDefault();
      return;
    }
    if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) {
      this.onPause();
      event.preventDefault();
    } else if (event.code === 'KeyM' && !event.repeat) {
      this.onMute();
      event.preventDefault();
    } else if (event.code === 'KeyR' && !event.repeat) {
      this.restartStarted = performance.now();
      event.preventDefault();
    }
  }

  _keyUp(event) {
    if (HOLD_KEYS.has(event.code) || LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code)) {
      this.keys.delete(event.code);
      this.keyboardHold = [...HOLD_KEYS].some((code) => this.keys.has(code));
      event.preventDefault();
    } else if (event.code === 'KeyR') {
      if (this.restartStarted && performance.now() - this.restartStarted >= 550) this.onRestart();
      this.restartStarted = 0;
      event.preventDefault();
    }
  }

  _showOrigin(clientX, clientY) {
    if (!this.touchOrigin || this.pointerType === 'mouse') return;
    const rect = this.shell.getBoundingClientRect();
    this.touchOrigin.style.left = `${clientX - rect.left}px`;
    this.touchOrigin.style.top = `${clientY - rect.top}px`;
    this.touchOrigin.classList.add('active');
  }

  _hideOrigin() {
    this.touchOrigin?.classList.remove('active');
  }

  poll() {
    const pads = navigator.getGamepads?.() ?? [];
    let pad = this.gamepadIndex === null ? null : pads[this.gamepadIndex];
    if (!pad) pad = [...pads].find(Boolean) ?? null;
    if (pad) {
      this.gamepadIndex = pad.index;
      const axis = Math.abs(pad.axes[0] ?? 0) > 0.18 ? pad.axes[0] : 0;
      const trigger = Math.max(pad.buttons[6]?.value ?? 0, pad.buttons[7]?.value ?? 0);
      const held = Boolean(pad.buttons[0]?.pressed || trigger > 0.3);
      const active = held || Math.abs(axis) > 0.22;
      if (active && !this.gamepadSeen) this.onActivity({ kind: 'gamepad' });
      this.gamepadSeen = active;
      this.gamepadHold = held;
      this.gamepadSteer = clamp(axis, -1, 1);
    } else {
      this.gamepadHold = false;
      this.gamepadSteer = 0;
      this.gamepadSeen = false;
    }

    const keyboardAxis = ([...RIGHT_KEYS].some((code) => this.keys.has(code)) ? 1 : 0)
      - ([...LEFT_KEYS].some((code) => this.keys.has(code)) ? 1 : 0);
    const pointerAxis = this.pointerHold ? this.pointerSteer : 0;
    const steer = Math.abs(pointerAxis) > 0.01
      ? pointerAxis
      : Math.abs(this.gamepadSteer) > 0.01 ? this.gamepadSteer : keyboardAxis;
    return {
      hold: this.pointerHold || this.keyboardHold || this.gamepadHold,
      steer: clamp(steer, -1, 1),
      source: this.pointerHold ? this.pointerType : this.gamepadHold || this.gamepadSteer ? 'gamepad' : 'keyboard'
    };
  }

  interrupt(reason = 'input interrupted') {
    const wasHolding = this.pointerHold || this.keyboardHold || this.gamepadHold;
    this.pointerHold = false;
    this.pointerSteer = 0;
    this.pointerId = null;
    this.pointerType = '';
    this.keys.clear();
    this.keyboardHold = false;
    this.gamepadHold = false;
    this.gamepadSteer = 0;
    this.interrupted = true;
    this._hideOrigin();
    this.onInterrupt({ reason, wasHolding });
  }
}
