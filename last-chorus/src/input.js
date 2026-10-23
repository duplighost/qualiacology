// One button and a direction. Hold space or the mouse button to press down;
// steer with the mouse (where the pointer is across the screen is where you
// are across the road) or with A/D or the arrow keys.
// The moment of each press and release is kept from the event itself, so a pump
// is judged on when you actually let go, not on the next frame.

const PRESS_KEYS = new Set(['Space', 'KeyJ', 'KeyK', 'ShiftLeft', 'ShiftRight', 'ArrowDown', 'KeyS']);

export class Input {
  constructor(el) {
    this.keys = new Set();
    this.mouseDown = false;
    this.mouseX = 0;
    this.keySteer = 0; this.mode = 'mouse';
    this.onPress = null; this.onKey = null;
    this.auto = false;
    this.downAt = -1e9; this.upAt = -1e9;
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
    window.addEventListener('blur', () => { if (was()) this.upAt = performance.now(); this.keys.clear(); this.mouseDown = false; });
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const before = was();
      this.mouseDown = true;
      if (!before) this.downAt = stamp(e);
      this.onPress && this.onPress(e);
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      const before = was();
      this.mouseDown = false;
      if (before && !was()) this.upAt = stamp(e);
    });
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      if (Math.abs(nx - this.mouseX) > 0.002) { this.mouseX = nx; this.mode = 'mouse'; }
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get press() {
    if (this.mouseDown) return true;
    for (const k of PRESS_KEYS) if (this.keys.has(k)) return true;
    return false;
  }

  // -1..1 across the road
  steer(dt) {
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
