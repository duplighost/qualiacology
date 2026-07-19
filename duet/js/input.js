// DUET — input. Keyboard + mouse fold into one intent {dx,dy,focus,fire,bomb}. Instant, zero smoothing.
// Two schemes live at once, no mode select. Mouse pointer drives the pip 1:1 (0.45x delta in Focus).
window.Input = (() => {
  const keys = new Set();
  let mouseX = CFG.W / 2, mouseY = CFG.H * 0.72, mouseActive = false;
  let device = 'key';              // which device owns the pip; latched so key-release never yanks to a stale cursor
  let mL = false, mR = false;
  const MOVE_KEYS = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const edges = { bomb: false, pause: false, confirm: false, mute: false };
  let canvas = null;
  // scripted override for headless tests (set via Input.inject / cleared with null)
  let scripted = null;

  function bind(cv) {
    canvas = cv;
    addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!keys.has(k)) {
        if (k === 'x') edges.bomb = true;
        if (k === 'Escape' || k === 'p') edges.pause = true;
        if (k === 'z' || k === ' ' || k === 'Enter') edges.confirm = true;
        if (k === 'm') edges.mute = true;
      }
      if (MOVE_KEYS.includes(k)) device = 'key';    // pressing a move key takes ownership of the pip
      keys.add(k);
    });
    addEventListener('keyup', (e) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
    // mouse
    const relayMove = (e) => {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      mouseX = U.clamp((e.clientX - r.left) / r.width * CFG.W, 0, CFG.W);
      mouseY = U.clamp((e.clientY - r.top) / r.height * CFG.H, 0, CFG.H);
      mouseActive = true; device = 'mouse';         // moving the cursor takes ownership of the pip
    };
    canvas.addEventListener('mousemove', relayMove);
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) mL = true;
      if (e.button === 2) mR = true;
      if (e.button === 1) { edges.bomb = true; e.preventDefault(); }
      edges.confirm = edges.confirm || e.button === 0;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) mL = false; if (e.button === 2) mR = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('blur', () => { keys.clear(); mL = mR = false; });
  }

  const down = (...ks) => ks.some(k => keys.has(k));

  // one frame of intent. player x/y passed so mouse-follow can compute a per-frame delta.
  function sample(px, py) {
    if (scripted) {
      const s = scripted; return {
        dx: s.dx || 0, dy: s.dy || 0, focus: !!s.focus, fire: !!s.fire, bomb: !!s.bomb,
        mouse: false, mx: px, my: py,
      };
    }
    let dx = (down('a', 'ArrowLeft') ? -1 : 0) + (down('d', 'ArrowRight') ? 1 : 0);
    let dy = (down('w', 'ArrowUp') ? -1 : 0) + (down('s', 'ArrowDown') ? 1 : 0);
    [dx, dy] = U.normDiag(dx, dy);
    const focus = down('Shift') || mR;
    const fire = down('z', ' ') || mL;
    // the pip follows the mouse only while the mouse is the latched device (key-release leaves the pip put)
    const useMouse = device === 'mouse' && dx === 0 && dy === 0;
    return { dx, dy, focus, fire, bomb: false, mouse: useMouse, mx: mouseX, my: mouseY };
  }

  // consume a one-shot edge (bomb/pause/confirm/mute)
  function takeEdge(name) {
    if (scripted && name === 'bomb') { const b = !!scripted.bomb; return b; }
    const v = edges[name]; edges[name] = false; return v;
  }
  function inject(intent) { scripted = intent; }           // headless: hold an intent
  function clearInject() { scripted = null; }

  return { bind, sample, takeEdge, inject, clearInject,
           get mouseActive(){ return mouseActive; } };
})();
