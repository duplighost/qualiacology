// Keyboard + mouse-drag camera. Desktop only.
const MOVE = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
const JUMP = new Set(['Space', 'KeyK', 'KeyJ']);

export class Input {
  constructor(el) {
    this.keys = new Set();
    this.jumpPressed = false; this.jumpHeld = false;
    this.dragDX = 0; this.dragDY = 0; this.dragging = false; this.lastManual = -99;
    this.onFirst = null; this.onKey = null;
    this.time = 0;
    const first = () => { if (this.onFirst) { const f = this.onFirst; this.onFirst = null; f(); } };
    window.addEventListener('keydown', (e) => {
      if (MOVE[e.code] || JUMP.has(e.code)) e.preventDefault();
      first();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (JUMP.has(e.code)) { this.jumpPressed = true; this.jumpHeld = true; }
      this.onKey?.(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (JUMP.has(e.code)) this.jumpHeld = [...JUMP].some(k => this.keys.has(k));
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.jumpHeld = false; this.dragging = false; });
    el.addEventListener('pointerdown', (e) => {
      first();
      this.dragging = true; this.px = e.clientX; this.py = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* fine */ }
      el.focus({ preventScroll: true });
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.dragDX += e.clientX - this.px; this.dragDY += e.clientY - this.py;
      this.px = e.clientX; this.py = e.clientY;
      this.lastManual = this.time;
    });
    const up = (e) => { this.dragging = false; try { el.releasePointerCapture(e.pointerId); } catch (_) { /* fine */ } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  axis() {
    let x = 0, y = 0;
    for (const k of this.keys) { const m = MOVE[k]; if (m) { x += m[0]; y += m[1]; } }
    x = Math.max(-1, Math.min(1, x)); y = Math.max(-1, Math.min(1, y));
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  camKeys() { return (this.keys.has('KeyE') ? 1 : 0) - (this.keys.has('KeyQ') ? 1 : 0); }
  endFrame() { this.jumpPressed = false; this.dragDX = 0; this.dragDY = 0; }
}
