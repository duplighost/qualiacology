const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const STEER_LEFT = new Set(['KeyA', 'ArrowLeft']);
const STEER_RIGHT = new Set(['KeyD', 'ArrowRight']);
const SURGE_KEYS = new Set(['KeyW', 'ArrowUp']);
const SLIP_KEYS = new Set(['Space', 'ShiftLeft', 'ShiftRight']);
const GAME_KEYS = new Set([...STEER_LEFT, ...STEER_RIGHT, ...SURGE_KEYS, ...SLIP_KEYS]);

export class InputManager {
  constructor({ canvas, root = document, forceTouch = false, onStart = () => {}, onMute = () => {}, onPause = () => {} }) {
    this.canvas = canvas;
    this.root = root;
    this.forceTouch = forceTouch;
    this.onStart = onStart;
    this.onMute = onMute;
    this.onPause = onPause;
    this.keys = new Set();
    this.mouseSurge = false;
    this.mouseSlip = false;
    this.touchSurge = new Set();
    this.touchSlip = new Set();
    this.touchSteer = new Map();
    this.pauseQueued = false;
    this.gamepadActive = false;
    this.abort = new AbortController();
    this.bind();
  }

  bind() {
    const signal = this.abort.signal;
    window.addEventListener('keydown', (event) => {
      if (GAME_KEYS.has(event.code)) {
        event.preventDefault();
        this.keys.add(event.code);
        this.onStart();
      } else if (event.code === 'KeyM' && !event.repeat) {
        this.onMute();
      } else if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) {
        this.pauseQueued = true;
        this.onPause();
      } else if (event.code === 'Enter') {
        this.onStart();
      }
    }, { signal });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    }, { signal });
    window.addEventListener('blur', () => this.clear(), { signal });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') this.clear();
    }, { signal });

    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (event.button === 0) this.mouseSurge = true;
      if (event.button === 2) this.mouseSlip = true;
      this.onStart();
    }, { signal });
    window.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (event.button === 0) this.mouseSurge = false;
      if (event.button === 2) this.mouseSlip = false;
    }, { signal });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });

    this.bindButton(this.root.querySelector('[data-control="surge"]'), this.touchSurge);
    this.bindButton(this.root.querySelector('[data-control="slip"]'), this.touchSlip);
    this.bindSteering(this.root.querySelector('[data-control="steer"]'));
  }

  bindButton(element, pointerSet) {
    if (!element) return;
    const signal = this.abort.signal;
    const release = (event) => {
      pointerSet.delete(event.pointerId);
      element.classList.toggle('is-held', pointerSet.size > 0);
    };
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
      pointerSet.add(event.pointerId);
      element.classList.add('is-held');
      this.onStart();
    }, { signal });
    element.addEventListener('pointerup', release, { signal });
    element.addEventListener('pointercancel', release, { signal });
    element.addEventListener('lostpointercapture', release, { signal });
  }

  bindSteering(element) {
    if (!element) return;
    const signal = this.abort.signal;
    const update = (event) => {
      const rect = element.getBoundingClientRect();
      const value = clamp(((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2.4, -1, 1);
      this.touchSteer.set(event.pointerId, value);
      element.style.setProperty('--steer-x', `${(value * 36).toFixed(1)}%`);
      element.classList.add('is-held');
    };
    const release = (event) => {
      this.touchSteer.delete(event.pointerId);
      if (!this.touchSteer.size) {
        element.classList.remove('is-held');
        element.style.setProperty('--steer-x', '0%');
      }
    };
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
      update(event);
      this.onStart();
    }, { signal });
    element.addEventListener('pointermove', (event) => {
      if (this.touchSteer.has(event.pointerId)) update(event);
    }, { signal });
    element.addEventListener('pointerup', release, { signal });
    element.addEventListener('pointercancel', release, { signal });
    element.addEventListener('lostpointercapture', release, { signal });
  }

  readGamepad() {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = [...pads].find(Boolean);
    if (!pad) {
      this.gamepadActive = false;
      return { steer: 0, surge: false, slip: false };
    }
    const raw = Number(pad.axes?.[0]) || 0;
    const steer = Math.abs(raw) < 0.12 ? 0 : Math.sign(raw) * ((Math.abs(raw) - 0.12) / 0.88);
    const surge = Boolean(pad.buttons?.[0]?.pressed || pad.buttons?.[7]?.value > 0.35);
    const slip = Boolean(pad.buttons?.[2]?.pressed || pad.buttons?.[6]?.value > 0.35);
    this.gamepadActive = Math.abs(steer) > 0.05 || surge || slip;
    if (this.gamepadActive) this.onStart();
    return { steer, surge, slip };
  }

  read() {
    const keyboardSteer = (this.hasAny(STEER_RIGHT) ? 1 : 0) - (this.hasAny(STEER_LEFT) ? 1 : 0);
    const touchSteer = this.touchSteer.size
      ? [...this.touchSteer.values()].reduce((sum, value) => sum + value, 0) / this.touchSteer.size
      : 0;
    const pad = this.readGamepad();
    const steerCandidates = [keyboardSteer, touchSteer, pad.steer];
    const steer = steerCandidates.sort((a, b) => Math.abs(b) - Math.abs(a))[0] || 0;
    return {
      steer: clamp(steer, -1, 1),
      surge: this.hasAny(SURGE_KEYS) || this.mouseSurge || this.touchSurge.size > 0 || pad.surge,
      slip: this.hasAny(SLIP_KEYS) || this.mouseSlip || this.touchSlip.size > 0 || pad.slip,
    };
  }

  hasAny(codes) {
    for (const code of codes) if (this.keys.has(code)) return true;
    return false;
  }

  consumePause() {
    const queued = this.pauseQueued;
    this.pauseQueued = false;
    return queued;
  }

  clear() {
    this.keys.clear();
    this.mouseSurge = false;
    this.mouseSlip = false;
    this.touchSurge.clear();
    this.touchSlip.clear();
    this.touchSteer.clear();
    for (const element of this.root.querySelectorAll('.is-held')) element.classList.remove('is-held');
    // clear() is also the emergency recovery path for blur/visibility loss.
    // Reset the steering puck's visual state along with its pointer map so a
    // cancelled touch cannot leave the UI showing a held direction after the
    // simulation has correctly returned to neutral.
    this.root.querySelector('[data-control="steer"]')?.style.setProperty('--steer-x', '0%');
  }

  destroy() {
    this.clear();
    this.abort.abort();
  }
}
