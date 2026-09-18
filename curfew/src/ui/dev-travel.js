// THE PLAYTEST PANEL. Off unless the URL says ?dev=1, so the shipped game never sees it.
//
// ALEX, 2026-09-18: "its hard for me to playtest. i'll never make it to the settlements. i
// can't playtest an open world game. i'm the only one playtesting."
//
// That is a tooling problem, not a design one, and it should not be answered by putting fast
// travel in the game. The county is 8 x 8 km and the hamlets sit 40 m off a road that is a
// long drive from the start, so testing the thing you just built costs a quarter of an hour of
// driving before you can look at it. This panel is the short way round FOR HIM: open the pause
// card with ?dev=1 on the URL and every destination in the county is a button. It moves the
// player, brings the car, and can hand over the things a test needs (fuel, guns, coins, the
// hour) so the trip is not the test.
//
// It is deliberately NOT a system: no static id, no manifest row, no step(), nothing in
// ctx.systems. main.js constructs it only when the flag is set. With the flag absent this
// file is imported, does nothing, and adds no DOM, no listener and no frame cost.
//
// Everything it does is something a test door already does: player.teleport / carryTo,
// car.placeAt / refuel / repairFull, weapons.grant, progress.payCash, clock.setPhase. It
// invents no new game verb, so nothing here can change how the game plays.

const PANEL_ID = 'curfew-dev-travel';

export class DevTravel {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = null;
    this.list = null;
    this.note = null;
    this._onKey = null;
    this._built = false;
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    if (typeof document === 'undefined' || !document.body) return;
    const el = document.createElement('section');
    el.id = PANEL_ID;
    el.setAttribute('aria-label', 'playtest travel');
    el.style.cssText = [
      'position:fixed', 'left:18px', 'top:18px', 'bottom:18px', 'width:268px',
      'z-index:9999', 'overflow:auto', 'padding:12px 12px 16px',
      'background:rgba(6,9,13,.93)', 'border:1px solid #2b3543', 'border-radius:6px',
      'color:#c9d4e6', 'font:12px/1.5 Consolas,ui-monospace,monospace',
      'display:none',
    ].join(';');
    const h = document.createElement('div');
    h.textContent = 'PLAYTEST  ·  ?dev=1';
    h.style.cssText = 'letter-spacing:.16em;color:#8fa4c4;margin-bottom:8px';
    el.append(h);

    // The kit row: what a test usually needs before it can start.
    const kit = document.createElement('div');
    kit.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px';
    for (const [label, fn] of [
      ['fuel + fix', () => this._kitCar()],
      ['all guns', () => this._kitGuns()],
      ['+1000 coins', () => this._kitCoins()],
      ['dusk', () => this._phase('dusk')],
      ['night', () => this._phase('night')],
      ['black', () => this._phase('black')],
    ]) kit.append(this._btn(label, fn, true));
    el.append(kit);

    const note = document.createElement('div');
    note.style.cssText = 'color:#7f8a99;margin:0 0 8px;min-height:1.5em';
    note.textContent = 'a button moves you and brings the car.';
    el.append(note);
    this.note = note;

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:3px';
    el.append(list);
    this.list = list;

    document.body.append(el);
    this.el = el;

    // SHOWN WHEN THERE IS A CURSOR TO CLICK WITH. Not on the 'game:paused' bus event: the
    // pause card can be raised by hud.pause() without that event being emitted, and a panel
    // of buttons is useless while the pointer is locked anyway. Pointer lock is the honest
    // signal — the frames where he has a mouse are exactly the frames he can press these.
    const sync = () => {
      const on = typeof document !== 'undefined' && !document.pointerLockElement;
      if (on) this._refresh();
      el.style.display = on ? 'block' : 'none';
    };
    this._onLock = sync;
    document.addEventListener('pointerlockchange', sync);
    sync();
  }

  _btn(label, fn, small) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = [
      'font:inherit', 'text-align:left', 'cursor:pointer',
      small ? 'padding:3px 7px' : 'padding:5px 8px',
      'color:#dbe4f2', 'background:#10161e', 'border:1px solid #2b3543', 'border-radius:3px',
    ].join(';');
    b.addEventListener('mouseenter', () => { b.style.background = '#1a222d'; });
    b.addEventListener('mouseleave', () => { b.style.background = '#10161e'; });
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); try { fn(); } catch (err) { this._say('failed: ' + err.message); } });
    return b;
  }

  _say(s) { if (this.note) this.note.textContent = s; }

  _refresh() {
    const places = this._sys('places');
    if (!places || !this.list) return;
    let rows = [];
    try { rows = (places.all ? places.all() : places.list()) || []; } catch (e) { rows = []; }
    rows = rows.slice().sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    this.list.replaceChildren();
    for (const r of rows) {
      const mark = r.claimed ? '*' : (r.found ? '+' : ' ');
      this.list.append(this._btn(mark + ' ' + (r.name || r.id), () => this._go(r)));
    }
  }

  /** Put the body at a place, and the car on the ground beside it. */
  _go(r) {
    const A = (typeof window !== 'undefined' && window.__CURFEW) || null;
    const player = this._sys('player');
    const terr = this._sys('terrain');
    const car = this._sys('car');
    // Stand off the centre so he arrives looking AT the place rather than inside its geometry.
    const back = 34;
    const px = r.x + Math.sin(2.2) * back, pz = r.z + Math.cos(2.2) * back;
    const yaw = Math.atan2(-(r.x - px), -(r.z - pz));
    if (A && A.teleport) A.teleport(px, pz, yaw);
    else if (player && player.teleport) player.teleport(px, pz, yaw);
    // The car lands a few metres to the side, on the surface, pointing the same way. Without
    // it he arrives at a settlement on foot with no way to leave, which is the same trap.
    if (car && typeof car.placeAt === 'function') {
      const cx = px + Math.sin(yaw + Math.PI * 0.5) * 6, cz = pz + Math.cos(yaw + Math.PI * 0.5) * 6;
      try {
        car.placeAt(cx, cz, yaw);
        if (typeof car.refuel === 'function') car.refuel();
        if (typeof car.repairFull === 'function') car.repairFull();
      } catch (e) { void e; }
    }
    void terr;
    this._say('at ' + (r.name || r.id) + '. car alongside.');
  }

  _kitCar() {
    const car = this._sys('car');
    if (!car) return this._say('no car');
    try { car.refuel?.(); car.repairFull?.(); } catch (e) { void e; }
    this._say('car fuelled and repaired.');
  }

  _kitGuns() {
    const w = this._sys('weapons');
    if (!w || typeof w.grant !== 'function') return this._say('no weapons system');
    let n = 0;
    for (const id of ['shotgun', 'revolver', 'carbine']) {
      try { if (w.grant(id, { quiet: true })) n++; } catch (e) { void e; }
    }
    try { w.addReserve?.(90); } catch (e) { void e; }
    this._say('granted ' + n + ' gun(s), ammunition all round.');
  }

  _kitCoins() {
    const pr = this._sys('progress');
    if (!pr || typeof pr.payCash !== 'function') return this._say('no progress system');
    const p = this._sys('player');
    try { pr.payCash(1000, p?.pos?.x || 0, 1, p?.pos?.z || 0, 'dev'); } catch (e) { void e; }
    this._say('+1000 coins.');
  }

  _phase(name) {
    const c = this._sys('clock');
    if (!c || typeof c.setPhase !== 'function') return this._say('no clock');
    try { c.setPhase(name, 0.25); } catch (e) { void e; }
    this._say('phase: ' + name + '.');
  }

  dispose() {
    if (this._onLock) document.removeEventListener('pointerlockchange', this._onLock);
    this.el?.remove();
    this.el = null;
  }
}

export default DevTravel;
