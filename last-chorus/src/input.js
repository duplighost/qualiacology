// One button and a direction. Hold space or the mouse button to press down;
// steer with the mouse (where the pointer is across the screen is where you
// are across the road) or with A/D or the arrow keys.
// On a touchscreen a thumb on the right half holds her down; the left half is a
// stick that appears under your thumb: push from where it landed, lift and she
// stays where you left her. The pressing thumb's own slide steers too, so one
// thumb on the right can play.
// The moment of each press and release is kept from the event itself, so a pump
// is judged on when you actually let go, not on the next frame.

const PRESS_KEYS = new Set(['Space', 'KeyJ', 'KeyK', 'ShiftLeft', 'ShiftRight', 'ArrowDown', 'KeyS']);
const THUMB_DEAD = 6;    // px a thumb can wobble without steering
const THUMB_SPAN = 110;  // px of push past that to full lock

export class Input {
  constructor(el) {
    this.keys = new Set();
    this.mouseDown = false;
    this.mouseX = 0;
    this.keySteer = 0; this.mode = 'mouse';
    this.onPress = null; this.onKey = null; this.onTouch = null;
    this.auto = false;
    this.downAt = -1e9; this.upAt = -1e9;
    this.thumbs = new Map(); this.touchPress = 0; this.touchSteer = 0; this.touched = false;
    const stamp = (e) => (e && e.timeStamp > 0 ? e.timeStamp : performance.now());
    const was = () => this.press;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (PRESS_KEYS.has(e.code) || e.code.startsWith('Arrow')) e.preventDefault(); return; }
      const before = was();
      this.keys.add(e.code);
      if (PRESS_KEYS.has(e.code)) { e.preventDefault(); if (!before) this.downAt = stamp(e); this.onPress && this.onPress(e); }
      if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); this.mode = 'keys'; }
      this.onKey && this.onKey(e);
    });
    window.addEventListener('keyup', (e) => {
      const before = was();
      this.keys.delete(e.code);
      if (before && !was()) this.upAt = stamp(e);
    });
    window.addEventListener('blur', () => { if (was()) this.upAt = performance.now(); this.keys.clear(); this.mouseDown = false; this.thumbs.clear(); this.touchPress = 0; });
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return this._thumbDown(e, stamp(e));
      if (e.button !== 0) return;
      const before = was();
      this.mouseDown = true;
      if (!before) this.downAt = stamp(e);
      this.onPress && this.onPress(e);
    });
    // a lift, or the browser taking the finger for itself (a cancel): both let go
    const up = (e) => {
      if (e.pointerType === 'touch') return this._thumbUp(e, stamp(e));
      if (e.type === 'pointerup' && e.button !== 0) return;
      const before = was();
      this.mouseDown = false;
      if (before && !was()) this.upAt = stamp(e);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') { const f = this.thumbs.get(e.pointerId); if (f) { f.x = e.clientX; f.y = e.clientY; } return; }
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      if (Math.abs(nx - this.mouseX) > 0.002) { this.mouseX = nx; this.mode = 'mouse'; }
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // a thumb lands: on the right half it presses, on the left it steers; either wakes the start line
  _thumbDown(e, at) {
    const role = e.clientX < window.innerWidth * 0.5 ? 'steer' : 'press';
    this.thumbs.set(e.pointerId, { role, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, base: this.touchSteer });
    this.mode = 'touch';
    if (!this.touched) { this.touched = true; this.onTouch && this.onTouch(); }
    const before = this.press;
    if (role === 'press') { this.touchPress++; if (!before) this.downAt = at; }
    this.onPress && this.onPress(e);
  }
  _thumbUp(e, at) {
    const f = this.thumbs.get(e.pointerId);
    if (!f) return;
    if (f === this._steering()) this.touchSteer = this._push(f);   // she stays where the thumb left her
    this.thumbs.delete(e.pointerId);
    const before = this.press;
    if (f.role === 'press') this.touchPress = Math.max(0, this.touchPress - 1);
    if (before && !this.press) this.upAt = at;
    // another thumb takes the steering over from here, not from where it landed
    const n = this._steering();
    if (n) { n.x0 = n.x; n.base = this.touchSteer; }
  }
  // the thumb that steers right now: the left one, else the pressing one
  _steering() {
    let p = null;
    for (const f of this.thumbs.values()) { if (f.role === 'steer') return f; if (!p) p = f; }
    return p;
  }
  _push(f) {
    const dx = f.x - f.x0;
    const s = Math.sign(dx) * Math.max(0, Math.abs(dx) - THUMB_DEAD) / THUMB_SPAN;
    return Math.max(-1, Math.min(1, f.base + s));
  }
  // the left thumb while it's down, for the ring drawn under it
  get thumb() { const f = this._steering(); return f && f.role === 'steer' ? f : null; }

  get press() {
    if (this.mouseDown || this.touchPress > 0) return true;
    for (const k of PRESS_KEYS) if (this.keys.has(k)) return true;
    return false;
  }

  // -1..1 across the road
  steer(dt) {
    if (this.mode === 'touch') {
      const f = this._steering();
      if (f) this.touchSteer = this._push(f);
      this.keySteer = this.touchSteer;
      return this.keySteer;
    }
    if (this.mode === 'keys') {
      // keys slide you across at a steady rate and leave you where you stop
      const l = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
      const r = this.keys.has('KeyD') || this.keys.has('ArrowRight');
      const dir = (r ? 1 : 0) - (l ? 1 : 0);
      this.keySteer = Math.max(-1, Math.min(1, this.keySteer + dir * dt * 2.4));
      return this.keySteer;
    }
    // straight across: the middle 70% of the screen covers the road, edge to edge
    const x = this.mouseX;
    const s = Math.sign(x) * Math.max(0, Math.abs(x) - 0.015) / 0.7;
    this.keySteer = Math.max(-1, Math.min(1, s));
    return this.keySteer;
  }
}
