// Input: held/pressed/released sets + mouse delta accumulated between frames
// and consumed once per step (Duskfall pattern). endFrame() runs
// unconditionally every rAF, even when the sim is paused.

export function create(ctx) {
  const held = new Set();
  const pressed = new Set();
  const released = new Set();
  let dx = 0, dy = 0;
  let fireHeld = false, firePressed = false;
  let aimHeld = false, aimPressed = false;
  const canvas = ctx.canvas;

  const KEYMAP = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    Space: 'jump',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    ControlLeft: 'crouch', ControlRight: 'crouch', KeyC: 'crouch',
    KeyR: 'reload',
    KeyV: 'melee', KeyF: 'melee',
    Escape: 'menu',
  };

  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (!held.has(a)) pressed.add(a);
    held.add(a);
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    held.delete(a);
    released.add(a);
  });
  window.addEventListener('blur', () => { held.clear(); fireHeld = false; aimHeld = false; });

  const locked = () => document.pointerLockElement === canvas || window.__VG?.noLock;
  canvas.addEventListener('mousedown', (e) => {
    if (!locked()) { ctx.bus.emit('input:clickthrough'); return; }
    if (e.button === 0) { fireHeld = true; firePressed = true; }
    if (e.button === 2) { aimHeld = true; aimPressed = true; }
    if (e.button === 1) { e.preventDefault(); if (!held.has('melee')) pressed.add('melee'); held.add('melee'); }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 1) { held.delete('melee'); released.add('melee'); }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) fireHeld = false;
    if (e.button === 2) aimHeld = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('mousemove', (e) => {
    if (!locked()) return;
    dx += e.movementX || 0;
    dy += e.movementY || 0;
  });

  return {
    id: 'input',
    held: (a) => held.has(a),
    pressed: (a) => pressed.has(a),
    released: (a) => released.has(a),
    get fire() { return fireHeld; },
    get firePressed() { return firePressed; },
    get aim() { return aimHeld; },
    get aimPressed() { return aimPressed; },
    /** consume the accumulated mouse delta (once per sim step). */
    consumeLook() { const r = { dx, dy }; dx = 0; dy = 0; return r; },
    endFrame() { pressed.clear(); released.clear(); firePressed = false; aimPressed = false; },
    /** test hook: inject synthetic input through the same paths the sim reads. */
    inject: {
      look(mdx, mdy) { dx += mdx; dy += mdy; },
      key(action, down) {
        if (down) { if (!held.has(action)) pressed.add(action); held.add(action); }
        else { held.delete(action); released.add(action); }
      },
      fire(down) { if (down && !fireHeld) firePressed = true; fireHeld = down; },
      aim(down) { if (down && !aimHeld) aimPressed = true; aimHeld = down; },
    },
  };
}
