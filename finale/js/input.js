// FINALE — input. Keyboard and mouse both live at once, no mode select. Device latch: whichever you
// touched last owns the ship, so releasing a key never yanks you to a stale cursor position.
// There is no FIRE button. The gun is always on. Three verbs and a panic button, that is all.
window.Input = (() => {
  const keys = new Set();
  let mouseX = CFG.W / 2, mouseY = CFG.H * 0.74;
  let device = 'key';
  let mL = false, mR = false, mM = false;
  let canvas = null;
  let scripted = null;                 // headless test override
  const edges = { misfire: false, flare: false, pause: false, confirm: false, mute: false };
  const MOVE_KEYS = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  function bind(cv) {
    canvas = cv;
    addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!keys.has(k)) {
        if (k === ' ') edges.misfire = true;
        if (k === 'e') edges.flare = true;
        if (k === 'Escape' || k === 'p') edges.pause = true;
        if (k === 'Enter' || k === ' ') edges.confirm = true;
        if (k === 'm') edges.mute = true;
      }
      if (MOVE_KEYS.includes(k)) device = 'key';
      keys.add(k);
    });
    addEventListener('keyup', (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));

    const move = (e) => {
      const r = canvas.getBoundingClientRect();
      mouseX = U.clamp((e.clientX - r.left) / r.width * CFG.W, 0, CFG.W);
      mouseY = U.clamp((e.clientY - r.top) / r.height * CFG.H, 0, CFG.H);
      device = 'mouse';
    };
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { mL = true; edges.confirm = true; }
      if (e.button === 2) mR = true;
      if (e.button === 1) { mM = true; edges.flare = true; e.preventDefault(); }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) mL = false;
      if (e.button === 2) mR = false;
      if (e.button === 1) mM = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('blur', () => { keys.clear(); mL = mR = mM = false; });
  }

  const down = (...ks) => ks.some(k => keys.has(k));

  // One frame of intent. Movement is a raw direction; the player module owns accel/decel, because
  // "how fast the ship reaches top speed" is a FEEL decision and belongs in the feel kernel.
  function sample() {
    if (scripted) {
      const s = scripted;
      return {
        dx: (s.right ? 1 : 0) - (s.left ? 1 : 0),
        dy: (s.down ? 1 : 0) - (s.up ? 1 : 0),
        focus: !!s.focus, mouse: s.mouseX !== undefined,
        mx: s.mouseX === undefined ? mouseX : s.mouseX,
        my: s.mouseY === undefined ? mouseY : s.mouseY,
      };
    }
    const dx = (down('d', 'ArrowRight') ? 1 : 0) - (down('a', 'ArrowLeft') ? 1 : 0);
    const dy = (down('s', 'ArrowDown') ? 1 : 0) - (down('w', 'ArrowUp') ? 1 : 0);
    const useMouse = device === 'mouse' && dx === 0 && dy === 0;
    return { dx, dy, focus: down('Shift') || mR, mouse: useMouse, mx: mouseX, my: mouseY };
  }

  // one-shot edges; scripted input fires them once per injection
  function takeEdge(name) {
    if (scripted) {
      if (name === 'flare' && scripted.flare) { scripted.flare = false; return true; }
      if (name === 'misfire' && scripted.misfire) { scripted.misfire = false; return true; }
      return false;
    }
    const v = edges[name]; edges[name] = false; return v;
  }
  function inject(o) { scripted = o; }
  function clearInject() { scripted = null; }

  return { bind, sample, takeEdge, inject, clearInject };
})();
