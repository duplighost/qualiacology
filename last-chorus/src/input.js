// One button and a direction. Hold space or the mouse button to press down;
// steer with the mouse (where the pointer is across the screen is where you
// are across the road) or with A/D or the arrow keys.

const PRESS_KEYS = new Set(['Space', 'KeyJ', 'KeyK', 'ShiftLeft', 'ShiftRight', 'ArrowDown', 'KeyS']);

export class Input {
  constructor(el) {
    this.keys = new Set();
    this.mouseDown = false;
    this.mouseX = 0; this.mouseMoved = 0;
    this.keySteer = 0; this.mode = 'mouse';
    this.onPress = null; this.onKey = null;
    this.auto = false;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (PRESS_KEYS.has(e.code) || e.code.startsWith('Arrow')) e.preventDefault(); return; }
      this.keys.add(e.code);
      if (PRESS_KEYS.has(e.code)) { e.preventDefault(); this.onPress && this.onPress(e); }
      if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); this.mode = 'keys'; }
      this.onKey && this.onKey(e);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
    el.addEventListener('pointerdown', (e) => { if (e.button === 0) { this.mouseDown = true; this.onPress && this.onPress(e); } });
    window.addEventListener('pointerup', (e) => { if (e.button === 0) this.mouseDown = false; });
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
      const l = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
      const r = this.keys.has('KeyD') || this.keys.has('ArrowRight');
      const dir = (r ? 1 : 0) - (l ? 1 : 0);
      this.keySteer += dir * dt * 2.6;
      if (!dir) this.keySteer *= Math.exp(-dt * 0.6);
      this.keySteer = Math.max(-1, Math.min(1, this.keySteer));
      return this.keySteer;
    }
    // a little dead band in the middle, full road by ~80% of the screen
    const x = this.mouseX;
    const s = Math.sign(x) * Math.max(0, Math.abs(x) - 0.03) / 0.77;
    this.keySteer = Math.max(-1, Math.min(1, s));
    return this.keySteer;
  }
}
