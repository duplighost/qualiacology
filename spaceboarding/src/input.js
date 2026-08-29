const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// There is no throttle key. The board always runs; every one of these earns
// speed rather than requesting it. See docs/PLAN.md "Controls".
const STEER_LEFT = new Set(['KeyA', 'ArrowLeft']);
const STEER_RIGHT = new Set(['KeyD', 'ArrowRight']);
const PITCH_UP = new Set(['KeyW', 'ArrowUp']);
const PITCH_DOWN = new Set(['KeyS', 'ArrowDown']);
const HOP_KEYS = new Set(['Space']);
// The board flip. Alex: "there should be tricks where your flip your board".
//
// Rotation about the board's LONG axis, which is the third and last axis a
// board has -- yaw is the spin on A/D, pitch is the flip on W/S, and this is
// the one a skater calls a kickflip. Q and E because they sit under the same
// two fingers already on W and A, so a spin and a flip can be thrown together
// without moving a hand.
const ROLL_LEFT = new Set(['KeyQ']);
const ROLL_RIGHT = new Set(['KeyE']);
const GRAB_KEYS = new Set(['ShiftLeft', 'ShiftRight']);
const RESPAWN_KEYS = new Set(['KeyR']);
const GAME_KEYS = new Set([
  ...STEER_LEFT, ...STEER_RIGHT, ...PITCH_UP, ...PITCH_DOWN,
  ...ROLL_LEFT, ...ROLL_RIGHT, ...HOP_KEYS, ...GRAB_KEYS, ...RESPAWN_KEYS,
]);

export class InputManager {
  constructor({ canvas, root = document, forceTouch = false, onStart = () => {}, onMute = () => {}, onPause = () => {} }) {
    this.canvas = canvas;
    this.root = root;
    this.forceTouch = forceTouch;
    this.onStart = onStart;
    this.onMute = onMute;
    this.onPause = onPause;
    this.keys = new Set();
    this.mouseHop = false;
    this.mouseGrab = false;
    this.touchHop = new Set();
    this.touchGrab = new Set();
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
      if (event.button === 0) this.mouseHop = true;
      if (event.button === 2) this.mouseGrab = true;
      this.onStart();
    }, { signal });
    window.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (event.button === 0) this.mouseHop = false;
      if (event.button === 2) this.mouseGrab = false;
    }, { signal });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });

    this.bindButton(this.root.querySelector('[data-control="hop"]'), this.touchHop);
    this.bindButton(this.root.querySelector('[data-control="grab"]'), this.touchGrab);
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
      return { steer: 0, pitch: 0, hop: false, grab: false };
    }
    const deadzone = (raw) => (Math.abs(raw) < 0.12 ? 0 : Math.sign(raw) * ((Math.abs(raw) - 0.12) / 0.88));
    const steer = deadzone(Number(pad.axes?.[0]) || 0);
    // Inverted so pushing the stick forward pitches the nose up, matching W.
    const pitch = -deadzone(Number(pad.axes?.[1]) || 0);
    const hop = Boolean(pad.buttons?.[0]?.pressed);
    const grab = Boolean(pad.buttons?.[2]?.pressed || pad.buttons?.[6]?.value > 0.35);
    // The shoulders throw the board flip -- left shoulder rolls left, right
    // rolls right, which is the mapping every board game uses because it is the
    // one that needs no explaining.
    const roll = (pad.buttons?.[5]?.pressed ? 1 : 0) - (pad.buttons?.[4]?.pressed ? 1 : 0);
    this.gamepadActive = Math.abs(steer) > 0.05 || Math.abs(pitch) > 0.05 || roll !== 0 || hop || grab;
    if (this.gamepadActive) this.onStart();
    return { steer, pitch, roll, hop, grab };
  }

  read() {
    const keyboardSteer = (this.hasAny(STEER_RIGHT) ? 1 : 0) - (this.hasAny(STEER_LEFT) ? 1 : 0);
    const keyboardPitch = (this.hasAny(PITCH_UP) ? 1 : 0) - (this.hasAny(PITCH_DOWN) ? 1 : 0);
    const keyboardRoll = (this.hasAny(ROLL_RIGHT) ? 1 : 0) - (this.hasAny(ROLL_LEFT) ? 1 : 0);
    const touchSteer = this.touchSteer.size
      ? [...this.touchSteer.values()].reduce((sum, value) => sum + value, 0) / this.touchSteer.size
      : 0;
    const pad = this.readGamepad();
    const strongest = (...values) => values.sort((a, b) => Math.abs(b) - Math.abs(a))[0] || 0;
    return {
      steer: clamp(strongest(keyboardSteer, touchSteer, pad.steer), -1, 1),
      pitch: clamp(strongest(keyboardPitch, pad.pitch), -1, 1),
      roll: clamp(strongest(keyboardRoll, pad.roll ?? 0), -1, 1),
      hop: this.hasAny(HOP_KEYS) || this.mouseHop || this.touchHop.size > 0 || pad.hop,
      grab: this.hasAny(GRAB_KEYS) || this.mouseGrab || this.touchGrab.size > 0 || pad.grab,
      respawn: this.hasAny(RESPAWN_KEYS),
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
    this.mouseHop = false;
    this.mouseGrab = false;
    this.touchHop.clear();
    this.touchGrab.clear();
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
