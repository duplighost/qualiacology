/* Pointer, touch, keys. One heading out the other side.
 *
 * Deliberately not a control scheme with modes: on a desktop you fly at the
 * cursor, on a phone you fly at your thumb, and A/D or the arrows turn if you
 * would rather. Nothing is bound to a verb, because there is only one verb.
 */

export class Input {
  constructor(canvas, toWorld) {
    this.aimX = 0; this.aimY = 0;
    this.aimActive = false;
    this.keyTurn = 0;
    this.touched = false;
    this.firstInput = false;
    this._left = false; this._right = false;
    this.onFirst = null;
    this.onKey = null;

    const aim = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      const p = toWorld(clientX - r.left, clientY - r.top);
      this.aimX = p.x; this.aimY = p.y;
      this.aimActive = true;
      this.mark();
    };

    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" && !this.touched) return;
      aim(e.clientX, e.clientY);
    }, { passive: true });

    canvas.addEventListener("pointerdown", (e) => {
      this.touched = true;
      aim(e.clientX, e.clientY);
      canvas.setPointerCapture && e.pointerId != null && canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointerleave", () => {
      /* Keep the last heading rather than snapping straight: the flock should
       * not lurch because a cursor crossed the window edge. */
      this.aimActive = false;
    });

    addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "a" || k === "arrowleft") { this._left = true; e.preventDefault(); }
      else if (k === "d" || k === "arrowright") { this._right = true; e.preventDefault(); }
      else if (this.onKey) this.onKey(k);
      if (k === "a" || k === "d" || k === "arrowleft" || k === "arrowright") this.mark();
      this.sync();
    });

    addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      if (k === "a" || k === "arrowleft") this._left = false;
      if (k === "d" || k === "arrowright") this._right = false;
      this.sync();
    });

    addEventListener("blur", () => { this._left = this._right = false; this.sync(); });
  }

  mark() {
    if (!this.firstInput) {
      this.firstInput = true;
      this.onFirst && this.onFirst();
    }
  }

  sync() {
    /* Keys beat the pointer while they are held, and release hands it back. */
    this.keyTurn = (this._right ? 1 : 0) - (this._left ? 1 : 0);
    if (this.keyTurn !== 0) this.aimActive = false;
  }
}
