export function detectTouch() {
  const query = new URLSearchParams(location.search);
  return query.get('touch') === '1' || matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

export class Input {
  constructor({ canvas, moveZone, moveKnob, singButton, dashButton, onPause }) {
    this.canvas = canvas;
    this.moveZone = moveZone;
    this.moveKnob = moveKnob;
    this.singButton = singButton;
    this.dashButton = dashButton;
    this.onPause = onPause;
    this.keys = new Set();
    this.move = { x: 0, y: 0 };
    this.stickPointer = null;
    this.pulseQueued = false;
    this.dashQueued = false;
    this.noteQueued = null;
    this.enabled = false;
    this.touch = detectTouch();
    this.listeners = [];
    this.bind();
  }

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.listeners.push(() => target.removeEventListener(type, handler, options));
  }

  bind() {
    this.listen(window, 'keydown', (event) => {
      if (this.enabled && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
      if (!event.repeat) {
        if (this.enabled && (event.code === 'Space' || event.code === 'KeyE')) this.pulseQueued = true;
        if (this.enabled && (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyQ')) this.dashQueued = true;
        if (this.enabled && event.code === 'Digit1') this.noteQueued = 0;
        if (this.enabled && event.code === 'Digit2') this.noteQueued = 1;
        if (this.enabled && event.code === 'Digit3') this.noteQueued = 2;
        if (event.code === 'Escape') this.onPause?.();
      }
      if (this.enabled) this.keys.add(event.code);
    }, { passive: false });
    this.listen(window, 'keyup', (event) => this.keys.delete(event.code));
    this.listen(window, 'blur', () => { this.keys.clear(); this.resetStick(); });
    this.listen(this.canvas, 'pointerdown', (event) => {
      if (!this.enabled || event.pointerType === 'touch' || event.button !== 0) return;
      this.pulseQueued = true;
    });
    this.listen(this.canvas, 'contextmenu', (event) => event.preventDefault());
    this.listen(this.canvas, 'pointerdown', (event) => {
      if (!this.enabled || event.pointerType === 'touch' || event.button !== 2) return;
      event.preventDefault();
      this.dashQueued = true;
    });

    if (this.moveZone) {
      const updateStick = (event) => {
        if (event.pointerId !== this.stickPointer) return;
        const rect = this.moveZone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const radius = Math.min(rect.width, rect.height) * 0.3;
        let x = (event.clientX - cx) / radius;
        let y = (event.clientY - cy) / radius;
        const length = Math.hypot(x, y);
        if (length > 1) { x /= length; y /= length; }
        this.move.x = x;
        this.move.y = y;
        this.moveKnob.style.transform = `translate(calc(-50% + ${x * radius}px), calc(-50% + ${y * radius}px))`;
      };
      this.listen(this.moveZone, 'pointerdown', (event) => {
        if (!this.enabled || this.stickPointer !== null) return;
        this.stickPointer = event.pointerId;
        this.moveZone.setPointerCapture?.(event.pointerId);
        updateStick(event);
      });
      this.listen(this.moveZone, 'pointermove', updateStick);
      const release = (event) => {
        if (event.pointerId === this.stickPointer) this.resetStick();
      };
      this.listen(this.moveZone, 'pointerup', release);
      this.listen(this.moveZone, 'pointercancel', release);
      this.listen(this.moveZone, 'lostpointercapture', release);
    }

    if (this.singButton) this.listen(this.singButton, 'pointerdown', (event) => { event.preventDefault(); if (this.enabled) this.pulseQueued = true; });
    if (this.dashButton) this.listen(this.dashButton, 'pointerdown', (event) => { event.preventDefault(); if (this.enabled) this.dashQueued = true; });
  }

  resetStick() {
    this.stickPointer = null;
    this.move.x = 0;
    this.move.y = 0;
    if (this.moveKnob) this.moveKnob.style.transform = 'translate(-50%, -50%)';
  }

  getMovement() {
    let x = this.move.x;
    let y = this.move.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    return { x, y, length: Math.min(1, length) };
  }

  consumePulse() { const value = this.pulseQueued; this.pulseQueued = false; return value; }
  consumeDash() { const value = this.dashQueued; this.dashQueued = false; return value; }
  consumeNote() { const value = this.noteQueued; this.noteQueued = null; return value; }
  queuePulse() { this.pulseQueued = true; }
  queueDash() { this.dashQueued = true; }
  queueNote(note) { this.noteQueued = note; }
  clearQueues() { this.pulseQueued = false; this.dashQueued = false; this.noteQueued = null; this.keys.clear(); }

  dispose() {
    this.listeners.forEach((off) => off());
    this.listeners.length = 0;
    this.resetStick();
  }
}
