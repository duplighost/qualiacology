// THE ONE SHOP MENU (D7). The travelling dealer, the four Holdfast counters and the tower
// keepers used to be three shops with three keys, three hold times and three cards: a DOM
// section on the right, a DOM aside on the right, and an invisible rail pick that drew
// nothing but the E prompt. T stepped two of them, and T is the car radio.
//
// ALEX: "Shop menus navigated with T feel awful." So: one menu, drawn beside the crosshair,
// picked the way the county already teaches — LOOK at the thing on the counter — or with the
// number keys, and bought with a CLICK (instant, if you can pay) or the same hold on E that
// claims a place. This is a helper, not a system: no static id, no manifest row. Each shop
// owns one and drives it every step it is in focus (show), and closes it when it is not.
// Money never moves here — buy(offer) belongs to the owner, and progress.spendCash sounds it.
//
// C7 (weapons/weapon.js): while ctx.shared.shopOpen is truthy the gun ignores fire, aim,
// melee, reload, swap, the number keys and X, so the click that buys never fires and the
// digit that picks a row never swaps a gun. The menu sets it true on every step it shows and
// false on the step it closes; it never writes false while another menu could be showing.
//
// THE SPEC an owner drives it with:
//   { key, title, rank, cash, x, y, z, offers, buy }
//   key      what is being shopped at (a resident id, 'dealer', a tower); a new key resets the row
//   title    the one word over the list
//   rank     the E prompt's rank on the one bus (dealer 4, keepers 6, Holdfast 9)
//   cash     the purse, read fresh by the owner every step
//   x,y,z    where the E prompt hangs when the picked row has no thing of its own to hang over
//   offers   [{ id, name, price, line, owned, full, unavailable, tag, note, x, y, z }] — at most
//            six get a digit; a row with a finite x/z is a THING on the counter you can look at
//            (the dealer's rail, his carton, his ammunition box); `tag` replaces the price
//            column ('FITTED'); `note` replaces the wallet line while the row is unavailable
//   buy(o)   called once per purchase, only when the row can be bought and the purse covers it
//
// Nothing is allocated in the steady state: the prompt strings and the canvas repaint only
// when a numeric hash of what is on the list changes.

const HOLD_S = 0.8;      // one hold for every counter in the county (dealer was .85, keepers 1.1, Holdfast .8)
const PICK_R = 2.6;      // m: the dealer's rail reach plus a step, so a row on the far crate still picks
const PICK_DOT = 0.66;   // the dealer's old rail cone, about 48 degrees off the gaze
const PROMPT_LIFT = 0.30; // m the E prompt floats over a thing on the counter so it never covers it
const ROWS_MAX = 6;      // Digit1..Digit6 exist as actions (C7); a seventh row has no key
const W = 300, PAD = 12, TITLE_H = 26, ROW_H = 22, LINE_H = 20, DPR_CAP = 2;
const INK = '#e8eef8', PLATE = 'rgba(4,6,9,0.86)', WARM = '#f0dfba', DIM = '#6f7680', SHORT = '#edb09a';
const MONO = 'ui-monospace, Consolas, "Courier New", monospace';

export class ShopMenu {
  constructor(ctx) {
    this.ctx = ctx;
    // The one E prompt this menu emits. Owners that used to own a prompt object alias this
    // one (dealer.prompt) so the tests that read it keep reading the real thing.
    this.prompt = { kind: 'hold', label: 'E', rank: 4, x: 0, y: 0, z: 0, k: 0, detail: '', subdetail: '', unavailable: false };
    this.showing = false; this.key = null; this.row = 0; this.hover = -1;
    this.hold = 0; this.lock = false; this.armed = false;
    this.count = 0; this._hash = 0; this._can = false;
    this.canvas = null; this.g = null;
    if (typeof document !== 'undefined' && document.createElement) {
      try {
        const c = document.createElement('canvas');
        if (c && c.style && document.body && document.body.appendChild) {
          c.className = 'curfew-shop';
          c.setAttribute('aria-hidden', 'true');
          // Beside the crosshair, to the right, so the row you are choosing is where you are
          // looking. pointer-events:none: play is pointer-locked and nothing here takes a click.
          c.style.cssText = 'position:fixed;left:calc(50% + 52px);top:50%;transform:translateY(-50%);'
            + 'width:' + W + 'px;pointer-events:none;z-index:21;opacity:0;transition:opacity .12s';
          document.body.appendChild(c);
          this.canvas = c;
          this.g = c.getContext('2d', { alpha: true });
        }
      } catch (e) { void e; }
    }
  }

  _sys(id) { return this.ctx.systems.get(id); }

  /** Drive the menu for one fixed step. The owner calls this EVERY step the shop is in focus. */
  show(spec, dt) {
    const offers = spec.offers || [], n = Math.min(offers.length, ROWS_MAX);
    if (!this.showing || spec.key !== this.key) {
      this.showing = true; this.key = spec.key; this.row = 0; this.hover = -1;
      this.hold = 0; this.lock = false; this._hash = 0;
      // The step a menu opens, weapon.js may already have read this step's click as a shot
      // (it steps before the shops). The buy edge is armed one step later.
      this.armed = false;
    }
    this.ctx.shared.shopOpen = true;
    this.count = n;
    const input = this.ctx.input;

    // 1. LOOK-TO-HOVER on the physical stock: the row nearest the gaze, if one is inside the
    // cone. A change of gaze takes the row; a number key can move it off until the gaze moves.
    let best = -1, bestDot = PICK_DOT;
    const cam = this._sys('camera'), player = this._sys('player');
    if (cam && player && player.pos) {
      const yaw = cam.yaw || 0, pitch = cam.pitch || 0, cp = Math.cos(pitch);
      const fx = -Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(yaw) * cp;
      const ex = player.pos.x, ey = Number.isFinite(player.eyeY) ? player.eyeY : player.pos.y + 1.6, ez = player.pos.z;
      for (let i = 0; i < n; i++) {
        const o = offers[i];
        if (!Number.isFinite(o.x) || !Number.isFinite(o.z)) continue;
        const dx = o.x - ex, dz = o.z - ez, d2 = dx * dx + dz * dz;
        if (d2 > PICK_R * PICK_R) continue;
        const dy = (Number.isFinite(o.y) ? o.y : ey) - ey;
        const dot = (fx * dx + fy * dy + fz * dz) / (Math.sqrt(d2 + dy * dy) || 0.001);
        if (dot > bestDot) { bestDot = dot; best = i; }
      }
    }
    if (best !== this.hover) { this.hover = best; if (best >= 0 && best !== this.row) { this.row = best; this.hold = 0; } }
    // 2. NUMBER KEYS pick a row outright (C7: input.js Digit1..Digit6 -> slot1..slot6).
    if (input && typeof input.pressed === 'function') {
      for (let k = 1; k <= n; k++) {
        if (input.pressed('slot' + k)) { if (this.row !== k - 1) { this.row = k - 1; this.hold = 0; } break; }
      }
    }
    if (this.row >= n) this.row = Math.max(0, n - 1);

    // 3. WHAT THE ROW IS: buyable only when it is nobody's yet, not full, not refused, and paid for.
    const o = n ? offers[this.row] : null, cash = spec.cash | 0;
    const can = !!o && !o.owned && !o.full && !o.unavailable && cash >= (o.price | 0);
    this._can = can;

    // 4. REPAINT AND RE-WORD only when something on the list changed.
    const h = this._hashOf(spec, offers, n, cash);
    if (h !== this._hash) { this._hash = h; this._words(spec, o, cash, can); this._paint(spec, offers, n, cash); }

    // 5. THE ONE E PROMPT, every step, on the bus. It hangs over the picked thing when the row
    // has one (the dealer's gun on the rail), else over the person (spec.x/y/z).
    const p = this.prompt;
    p.rank = Number.isFinite(spec.rank) ? spec.rank : 4;
    if (o && Number.isFinite(o.x) && Number.isFinite(o.z)) { p.x = o.x; p.y = (Number.isFinite(o.y) ? o.y : 1.2) + PROMPT_LIFT; p.z = o.z; }
    else { p.x = spec.x || 0; p.y = spec.y || 0; p.z = spec.z || 0; }
    p.unavailable = !can;
    p.k = this.hold / HOLD_S;
    this.ctx.bus.emit('prompt', p);

    // 6. BUY: a click is instant when the purse covers it; the hold on E is the same action
    // with the same ring the county already taught. One buy per edge, one per hold.
    const held = !!(input && typeof input.held === 'function' && input.held('use'));
    if (!held) this.lock = false;
    if (can && this.armed && input && typeof input.pressed === 'function' && input.pressed('fire')) {
      this.hold = 0; spec.buy(o);
    } else if (can && held && !this.lock) {
      this.hold += dt;
      if (this.hold >= HOLD_S) { this.hold = 0; this.lock = true; spec.buy(o); }
    } else this.hold = 0;
    this.armed = true;
  }

  /** The owner is no longer at a counter. Idempotent; called freely. */
  close() {
    if (!this.showing) return;
    this.showing = false; this.key = null; this.hold = 0; this.lock = false; this._hash = 0; this.count = 0;
    this.ctx.shared.shopOpen = false;
  }

  /** Render-side: the canvas follows showing, and hides under the pause card and the title. */
  present() {
    if (!this.canvas) return;
    const on = this.showing && !!this.ctx.playing && !this.ctx.paused;
    const op = on ? '1' : '0';
    if (this.canvas.style.opacity !== op) this.canvas.style.opacity = op;
  }

  /* ------------------------------------------------------------------ internals -- */

  _hashOf(spec, offers, n, cash) {
    let h = (this.row * 31 + n) | 0;
    h = (h * 31 + cash) | 0;
    const t = spec.title || '';
    for (let j = 0; j < t.length; j++) h = (h * 31 + t.charCodeAt(j)) | 0;
    for (let i = 0; i < n; i++) {
      const o = offers[i];
      h = (h * 31 + (o.price | 0) + (o.owned ? 4093 : 0) + (o.full ? 8191 : 0) + (o.unavailable ? 16381 : 0)) | 0;
      const s = o.name || '';
      for (let j = 0; j < s.length; j++) h = (h * 31 + s.charCodeAt(j)) | 0;
      const g = o.tag || '';
      for (let j = 0; j < g.length; j++) h = (h * 31 + g.charCodeAt(j)) | 0;
      if (i === this.row) {
        const l = o.line || '', m = o.note || '';
        for (let j = 0; j < l.length; j++) h = (h * 31 + l.charCodeAt(j)) | 0;
        for (let j = 0; j < m.length; j++) h = (h * 31 + m.charCodeAt(j)) | 0;
      }
    }
    return h;
  }

  /**
   * The prompt's two lines. COINS stays in both: weapons/weapon.js lowers the gun for the
   * length of any E prompt that says COINS, BUY, PAY or REPAIR, and a counter is where it
   * should be lowered.
   */
  _words(spec, o, cash, can) {
    const p = this.prompt;
    if (!o) { p.detail = spec.empty || 'NOTHING TONIGHT'; p.subdetail = 'YOU HAVE ' + cash + ' COINS'; return; }
    const price = o.price | 0;
    p.detail = o.owned ? o.name + ' · OWNED'
      : o.full ? o.name + ' · FULL'
      : o.tag ? o.name + ' · ' + o.tag
      : price > 0 ? o.name + ' · ' + price + ' COINS'
      : o.name + ' · FREE';
    p.subdetail = can ? 'YOU HAVE ' + cash + ' COINS · CLICK TO BUY'
      : o.unavailable && o.note ? o.note
      : (!o.owned && !o.full && !o.unavailable && cash < price) ? 'YOU HAVE ' + cash + ' COINS · NEED ' + (price - cash)
      : 'YOU HAVE ' + cash + ' COINS';
  }

  _rr(g, x0, y0, w, h, r) {
    g.beginPath();
    g.moveTo(x0 + r, y0); g.lineTo(x0 + w - r, y0); g.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    g.lineTo(x0 + w, y0 + h - r); g.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
    g.lineTo(x0 + r, y0 + h); g.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
    g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0); g.closePath();
  }

  /** The plate: a title, one row per offer with its digit, name and price, the picked row's line. */
  _paint(spec, offers, n, cash) {
    const g = this.g, c = this.canvas;
    if (!g || !c) return;
    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, DPR_CAP);
    const H = PAD * 2 + TITLE_H + n * ROW_H + LINE_H;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    c.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.globalAlpha = 1; g.fillStyle = PLATE; this._rr(g, 0.5, 0.5, W - 1, H - 1, 6); g.fill();
    g.strokeStyle = 'rgba(232,238,248,0.30)'; g.lineWidth = 1; this._rr(g, 0.5, 0.5, W - 1, H - 1, 6); g.stroke();
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = '#b9b4a6'; g.font = '600 11px ' + MONO;
    g.fillText(String(spec.title || '').toUpperCase(), PAD, PAD + 10, W - PAD * 2);
    let y = PAD + TITLE_H;
    for (let i = 0; i < n; i++) {
      const o = offers[i], sel = i === this.row, dim = !!(o.owned || o.full || o.unavailable);
      const price = o.price | 0;
      if (sel) {
        g.fillStyle = 'rgba(232,238,248,0.09)'; g.fillRect(6, y, W - 12, ROW_H);
        g.fillStyle = WARM; g.fillRect(6, y + 3, 2, ROW_H - 6);
      }
      // the digit, in a small cap like the E glyph
      const cx = PAD + 8, cy = y + ROW_H * 0.5;
      g.globalAlpha = sel ? 0.95 : 0.55; g.strokeStyle = INK; g.lineWidth = 1;
      this._rr(g, cx - 7, cy - 7, 14, 14, 3); g.stroke();
      g.globalAlpha = 1; g.fillStyle = sel ? INK : '#9aa3ae'; g.font = '700 10px ' + MONO; g.textAlign = 'center';
      g.fillText(String(i + 1), cx, cy + 0.5);
      // the name
      g.textAlign = 'left'; g.font = (sel ? '600 ' : '') + '13px ' + MONO;
      g.fillStyle = dim ? DIM : sel ? WARM : '#c9cfd8';
      g.fillText(o.name || '', PAD + 24, cy + 0.5, W - PAD * 2 - 24 - 74);
      // the price column: OWNED / FULL / a tag / the digits / FREE
      const right = o.owned ? 'OWNED' : o.full ? 'FULL' : o.tag ? o.tag : price > 0 ? String(price) : 'FREE';
      g.textAlign = 'right'; g.font = '12px ' + MONO;
      g.fillStyle = dim ? DIM : (price > cash ? SHORT : WARM);
      g.fillText(right, W - PAD, cy + 0.5);
      g.textAlign = 'left';
      y += ROW_H;
      if (sel) {
        // the one line under the picked row, in the county's reading face
        const line = o.unavailable && o.note ? o.note : (o.line || '');
        g.fillStyle = '#bfb8aa'; g.font = '12px Georgia, serif';
        g.fillText(line, PAD + 24, y + LINE_H * 0.5, W - PAD * 2 - 24);
        y += LINE_H;
      }
    }
  }

  dispose() {
    this.close();
    if (this.canvas) { this.canvas.remove(); this.canvas = null; this.g = null; }
  }
}

export default ShopMenu;
