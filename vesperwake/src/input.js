/* input.js — keyboard, gamepad-friendly key sets, and on-canvas touch.
 *
 * The one rule that matters: `pressed` edge flags are cleared by the SIM step,
 * never by the render frame. On a 144Hz display a render frame happens more
 * often than a 120Hz sim step, and clearing per render silently eats presses.
 * (VESPERBANE shipped that bug; it is why its controls felt "off".)
 */

const KEY_MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump',
  KeyJ: 'attack', KeyX: 'attack',
  KeyK: 'step', ShiftLeft: 'step', ShiftRight: 'step',
  KeyM: 'map', Tab: 'map',
};

const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'step', 'map'];
const EDGE_ACTIONS = ['jump', 'attack', 'step', 'up', 'down', 'map'];

export class Input {
  constructor() {
    this.held = Object.create(null);
    this.pressed = Object.create(null);
    this.released = Object.create(null);
    for (const a of ACTIONS) { this.held[a] = false; this.pressed[a] = false; this.released[a] = false; }
    this.anyKeyThisFrame = false;
    this.touch = null; // set by TouchPad when a coarse pointer is detected
    this._listeners = [];
  }

  attach(target = window) {
    const onDown = (e) => {
      const a = KEY_MAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!this.held[a]) this.pressed[a] = true;
      this.held[a] = true;
      this.anyKeyThisFrame = true;
    };
    const onUp = (e) => {
      const a = KEY_MAP[e.code];
      if (!a) return;
      e.preventDefault();
      this.held[a] = false;
      this.released[a] = true;
    };
    const onBlur = () => this.releaseAll();
    target.addEventListener('keydown', onDown, { passive: false });
    target.addEventListener('keyup', onUp, { passive: false });
    target.addEventListener('blur', onBlur);
    this._listeners.push([target, 'keydown', onDown], [target, 'keyup', onUp], [target, 'blur', onBlur]);
  }

  detach() {
    for (const [t, k, fn] of this._listeners) t.removeEventListener(k, fn);
    this._listeners.length = 0;
  }

  releaseAll() {
    for (const a of ACTIONS) { this.held[a] = false; }
  }

  /* Programmatic press — used by the touch pad and by tests. */
  set(action, down) {
    if (!ACTIONS.includes(action)) return;
    if (down && !this.held[action]) this.pressed[action] = true;
    if (!down && this.held[action]) this.released[action] = true;
    this.held[action] = down;
  }

  tap(action) { this.pressed[action] = true; this.held[action] = true; }

  /* Called at the END of each consumed sim step. */
  clearEdges() {
    for (const a of EDGE_ACTIONS) { this.pressed[a] = false; this.released[a] = false; }
    this.released.jump = false;
    this.anyKeyThisFrame = false;
  }

  get moveX() { return (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0); }
}

/* ------------------------------------------------------------------ *
 * TOUCH — drawn on the canvas, not in the DOM, so it scales with the view
 * and never fights the page. A floating stick on the left half, three
 * buttons on the right.
 * ------------------------------------------------------------------ */
export class TouchPad {
  constructor(canvas, input, view) {
    this.canvas = canvas;
    this.input = input;
    this.view = view;              // { w, h } in virtual units
    this.active = false;
    this.stick = null;             // { id, ox, oy, x, y }
    this.buttons = [];
    this.pointers = new Map();
    this.visible = false;
    this._bind();
  }

  layout() {
    const { w, h } = this.view;
    const r = 40;
    this.buttons = [
      { id: 'attack', label: 'WHIP', x: w - 78, y: h - 88, r: r + 6 },
      { id: 'jump', label: 'JUMP', x: w - 166, y: h - 62, r },
      { id: 'step', label: 'STEP', x: w - 78, y: h - 186, r: r - 4 },
    ];
  }

  _toView(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.view.w,
      y: ((e.clientY - rect.top) / rect.height) * this.view.h,
    };
  }

  _bind() {
    const down = (e) => {
      this.visible = true;
      for (const p of e.changedTouches ? Array.from(e.changedTouches) : [e]) {
        const v = this._toView(p);
        const id = p.identifier ?? 'mouse';
        let hitButton = null;
        for (const b of this.buttons) {
          if (Math.hypot(v.x - b.x, v.y - b.y) <= b.r * 1.18) { hitButton = b; break; }
        }
        if (hitButton) {
          this.pointers.set(id, { kind: 'button', button: hitButton.id });
          this.input.set(hitButton.id, true);
        } else if (v.x < this.view.w * 0.55) {
          this.pointers.set(id, { kind: 'stick', ox: v.x, oy: v.y, x: v.x, y: v.y });
        }
      }
      e.preventDefault();
    };
    const move = (e) => {
      for (const p of e.changedTouches ? Array.from(e.changedTouches) : [e]) {
        const id = p.identifier ?? 'mouse';
        const st = this.pointers.get(id);
        if (!st || st.kind !== 'stick') continue;
        const v = this._toView(p);
        st.x = v.x; st.y = v.y;
      }
      this._applyStick();
      e.preventDefault();
    };
    const up = (e) => {
      for (const p of e.changedTouches ? Array.from(e.changedTouches) : [e]) {
        const id = p.identifier ?? 'mouse';
        const st = this.pointers.get(id);
        if (!st) continue;
        if (st.kind === 'button') this.input.set(st.button, false);
        this.pointers.delete(id);
      }
      this._applyStick();
      e.preventDefault();
    };
    this.canvas.addEventListener('touchstart', down, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    this.canvas.addEventListener('touchend', up, { passive: false });
    this.canvas.addEventListener('touchcancel', up, { passive: false });
  }

  _applyStick() {
    let stick = null;
    for (const st of this.pointers.values()) if (st.kind === 'stick') stick = st;
    this.stick = stick;
    if (!stick) {
      this.input.set('left', false); this.input.set('right', false);
      this.input.set('down', false); this.input.set('up', false);
      return;
    }
    const dx = stick.x - stick.ox;
    const dy = stick.y - stick.oy;
    const dead = 12;
    this.input.set('left', dx < -dead);
    this.input.set('right', dx > dead);
    this.input.set('down', dy > dead * 1.5 && Math.abs(dy) > Math.abs(dx) * 0.7);
    this.input.set('up', dy < -dead * 1.8 && Math.abs(dy) > Math.abs(dx) * 0.9);
  }

  draw(ctx) {
    if (!this.visible) return;
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 2;
    for (const b of this.buttons) {
      const held = this.input.held[b.id];
      ctx.strokeStyle = held ? '#ffe9a8' : 'rgba(226,240,240,.7)';
      ctx.fillStyle = held ? 'rgba(255,233,168,.16)' : 'rgba(8,16,24,.42)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = held ? '#ffe9a8' : 'rgba(226,240,240,.8)';
      ctx.font = '700 10px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x, b.y);
    }
    if (this.stick) {
      const s = this.stick;
      ctx.strokeStyle = 'rgba(226,240,240,.6)';
      ctx.beginPath(); ctx.arc(s.ox, s.oy, 46, 0, Math.PI * 2); ctx.stroke();
      const dx = s.x - s.ox; const dy = s.y - s.oy;
      const d = Math.min(46, Math.hypot(dx, dy)) || 0;
      const a = Math.atan2(dy, dx);
      ctx.fillStyle = 'rgba(169,244,243,.5)';
      ctx.beginPath(); ctx.arc(s.ox + Math.cos(a) * d, s.oy + Math.sin(a) * d, 18, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
