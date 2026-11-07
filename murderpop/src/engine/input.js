// Keyboard and mouse. Presses are stamped with the frame time they arrived in (performance.now())
// and kept in a short buffer, so an action pressed a little early still happens when it can.
// Desktop only: WASD/arrows move, the mouse aims, LMB strike, RMB parry (hold to aim a throw),
// Space dash, Q/E/F spotlight, Esc pause.

const BIND = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash', KeyQ: 'spot', KeyE: 'spot', KeyF: 'spot',
  KeyJ: 'strike', KeyK: 'parry', KeyL: 'throw',
  Escape: 'pause', KeyP: 'pause', Enter: 'confirm', NumpadEnter: 'confirm', KeyR: 'retry', KeyM: 'menu', Backspace: 'back',
};

export class Input {
  constructor(el) {
    this.el = el;
    this.down = new Set();         // actions held
    this.pressed = [];             // {action, t} not yet consumed
    this.released = [];
    this.mouse = { x: 0.5, y: 0.5, px: 0, py: 0, moved: false, inside: false };
    this.held = { strike: 0, parry: 0 }; // press times of held buttons (0 = up)
    this.enabled = true;
    this.lastDevice = 'mouse';
    const kd = (e) => {
      if (e.repeat) return;
      const a = BIND[e.code];
      if (!a) return;
      if (a === 'dash' || a === 'up' || a === 'down' || e.code === 'Space') e.preventDefault();
      this._press(a, e.timeStamp);
    };
    const ku = (e) => { const a = BIND[e.code]; if (a) this._release(a, e.timeStamp); };
    const md = (e) => {
      this._mousePos(e);
      if (e.button === 0) this._press('strike', e.timeStamp);
      else if (e.button === 2) this._press('parry', e.timeStamp);
      else if (e.button === 1) { e.preventDefault(); this._press('spot', e.timeStamp); }
    };
    const mu = (e) => {
      if (e.button === 0) this._release('strike', e.timeStamp);
      else if (e.button === 2) this._release('parry', e.timeStamp);
      else if (e.button === 1) this._release('spot', e.timeStamp);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    el.addEventListener('mousedown', md);
    window.addEventListener('mouseup', mu);
    window.addEventListener('mousemove', (e) => this._mousePos(e));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('mouseenter', () => { this.mouse.inside = true; });
    el.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    window.addEventListener('blur', () => { this.down.clear(); this.held.strike = this.held.parry = 0; this.onBlur && this.onBlur(); });
  }

  _mousePos(e) {
    const r = this.el.getBoundingClientRect();
    this.mouse.px = e.clientX - r.left; this.mouse.py = e.clientY - r.top;
    this.mouse.x = this.mouse.px / r.width; this.mouse.y = this.mouse.py / r.height;
    this.mouse.moved = true; this.lastDevice = 'mouse';
  }

  _press(a, t) {
    if (this.down.has(a)) return;
    this.down.add(a);
    if (a in this.held) this.held[a] = t;
    this.pressed.push({ action: a, t });
    if (this.pressed.length > 16) this.pressed.shift();
    this.onPress && this.onPress(a, t);
  }
  _release(a, t) {
    this.down.delete(a);
    if (a in this.held) { this.released.push({ action: a, t, heldFor: t - this.held[a] }); this.held[a] = 0; if (this.released.length > 16) this.released.shift(); }
  }

  // take the oldest press of `action` made within `window` ms of now (and drop older ones)
  take(action, now, window = 160) {
    for (let i = 0; i < this.pressed.length; i++) {
      const p = this.pressed[i];
      if (p.action !== action) continue;
      if (now - p.t > window) { this.pressed.splice(i, 1); i--; continue; }
      this.pressed.splice(i, 1);
      return p;
    }
    return null;
  }
  takeRelease(action) {
    const i = this.released.findIndex((r) => r.action === action);
    if (i < 0) return null;
    return this.released.splice(i, 1)[0];
  }
  peek(action, now, window = 160) { return this.pressed.some((p) => p.action === action && now - p.t <= window); }
  isDown(a) { return this.down.has(a); }
  clear() { this.pressed.length = 0; this.released.length = 0; }

  // movement as a unit vector in screen terms (x right, y down)
  move() {
    let x = 0, y = 0;
    if (this.down.has('left')) x -= 1;
    if (this.down.has('right')) x += 1;
    if (this.down.has('up')) y -= 1;
    if (this.down.has('down')) y += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
}
