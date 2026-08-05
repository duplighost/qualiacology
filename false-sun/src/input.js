const MOVE_CODES = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight",
]);

const DASH_CODES = new Set(["Space", "ShiftLeft", "ShiftRight"]);
const PIN_CODES = new Set(["KeyE"]);

function clamp(value, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalized(x, y) {
  const length = Math.hypot(x, y);
  if (length <= 1 || length === 0) return { x, y, magnitude: length };
  return { x: x / length, y: y / length, magnitude: 1 };
}

function unitVector(x, y, fallback = { x: 1, y: 0 }) {
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length < 0.0001) return fallback;
  return { x: x / length, y: y / length };
}

function radialDeadzone(x, y, deadzone = 0.18) {
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length <= deadzone) return { x: 0, y: 0, magnitude: 0 };
  const scaled = clamp((length - deadzone) / (1 - deadzone), 0, 1);
  return {
    x: (x / length) * scaled,
    y: (y / length) * scaled,
    magnitude: scaled,
  };
}

function isEditableTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));
}

function buttonValue(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  if (!button) return 0;
  return Math.max(button.pressed ? 1 : 0, Number(button.value) || 0);
}

/**
 * Unified input adapter for FALSE SUN.
 *
 * `getFrame()` is intentionally side-effect-light: edge actions remain set until
 * `consumePressed()` clears them, so several fixed simulation ticks cannot lose
 * a click that arrived between renders.
 */
export function createInput(canvas, { forceTouch = false, onFirstGesture = () => {} } = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError("createInput requires the game canvas");
  }

  const root = document.documentElement;
  const query = new URLSearchParams(window.location.search);
  const mediaCoarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const queryForcesTouch = query.get("touch") === "1" || root.classList.contains("force-touch");
  const isTouch = Boolean(forceTouch || queryForcesTouch || mediaCoarse || navigator.maxTouchPoints > 0);
  const listeners = [];
  const touchResetters = [];
  const keys = new Set();

  let enabled = true;
  let destroyed = false;
  let gestureSent = false;
  let mouseFire = false;
  let mouseAim = { x: 1, y: 0 };
  let aimOrigin = null;
  let mouseClient = null;
  let lastAim = { x: 1, y: 0 };
  let touchMove = { x: 0, y: 0, magnitude: 0 };
  let touchAim = { x: 0, y: 0, magnitude: 0 };
  let touchFire = false;
  let gamepadId = "";
  let previousGamepadButtons = [];

  const pressed = {
    dashPressed: false,
    pinPressed: false,
    pausePressed: false,
  };

  if (isTouch) root.classList.add("touch-mode");

  function listen(target, type, handler, options) {
    target?.addEventListener(type, handler, options);
    listeners.push(() => target?.removeEventListener(type, handler, options));
  }

  function notifyFirstGesture() {
    if (gestureSent || destroyed) return;
    gestureSent = true;
    try {
      Promise.resolve(onFirstGesture()).catch(() => {});
    } catch {
      // Audio unlock and optional analytics must never break input.
    }
  }

  function pulse(action, allowWhenDisabled = false) {
    if ((!enabled && !allowWhenDisabled) || destroyed) return;
    pressed[action] = true;
  }

  function updateMouseAim(clientX, clientY) {
    mouseClient = { x: clientX, y: clientY };
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const originX = Number.isFinite(aimOrigin?.x) ? aimOrigin.x : rect.left + rect.width * 0.5;
    const originY = Number.isFinite(aimOrigin?.y) ? aimOrigin.y : rect.top + rect.height * 0.5;
    const x = clientX - originX;
    const y = clientY - originY;
    const vector = normalized(x, y);
    if (vector.magnitude > 0.001) {
      mouseAim = { x: vector.x, y: vector.y };
      lastAim = mouseAim;
    }
  }

  function onKeyDown(event) {
    if (destroyed) return;
    notifyFirstGesture();

    if (isEditableTarget(event.target) && event.code !== "Escape") return;
    if (!enabled && event.code !== "Escape") return;

    const gameplayKey = MOVE_CODES.has(event.code)
      || DASH_CODES.has(event.code)
      || PIN_CODES.has(event.code)
      || event.code === "Escape";

    if (gameplayKey) event.preventDefault();
    keys.add(event.code);

    if (!event.repeat && DASH_CODES.has(event.code)) pulse("dashPressed");
    if (!event.repeat && PIN_CODES.has(event.code)) pulse("pinPressed");
    if (!event.repeat && event.code === "Escape") pulse("pausePressed", true);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
    if (MOVE_CODES.has(event.code) || DASH_CODES.has(event.code) || PIN_CODES.has(event.code)) {
      event.preventDefault();
    }
  }

  function onCanvasPointerDown(event) {
    if (!enabled || destroyed || event.pointerType === "touch") return;
    notifyFirstGesture();
    canvas.focus({ preventScroll: true });
    updateMouseAim(event.clientX, event.clientY);

    if (event.button === 0) {
      mouseFire = true;
      event.preventDefault();
    } else if (event.button === 2) {
      pulse("pinPressed");
      event.preventDefault();
    }
  }

  function onPointerMove(event) {
    if (!enabled || destroyed || event.pointerType === "touch") return;
    updateMouseAim(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    if (event.button === 0) mouseFire = false;
  }

  function clearPointerState() {
    mouseFire = false;
    touchFire = false;
    touchMove = { x: 0, y: 0, magnitude: 0 };
    touchAim = { x: 0, y: 0, magnitude: 0 };
    for (const reset of touchResetters) reset();
    resetStickVisual(document.querySelector("#move-stick"));
    resetStickVisual(document.querySelector("#aim-stick"));
  }

  function resetStickVisual(element) {
    if (!(element instanceof HTMLElement)) return;
    element.style.setProperty("--stick-x", "0");
    element.style.setProperty("--stick-y", "0");
    element.classList.remove("is-active");
  }

  function bindStick(element, kind) {
    if (!(element instanceof HTMLElement)) return;
    let pointerId = null;

    const setVector = (event) => {
      const rect = element.getBoundingClientRect();
      const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.36);
      const rawX = (event.clientX - (rect.left + rect.width * 0.5)) / radius;
      const rawY = (event.clientY - (rect.top + rect.height * 0.5)) / radius;
      const length = Math.hypot(rawX, rawY);
      const magnitude = Math.min(1, length);
      const x = length > 0 ? clamp((rawX / length) * magnitude) : 0;
      const y = length > 0 ? clamp((rawY / length) * magnitude) : 0;
      const value = { x, y, magnitude };

      element.style.setProperty("--stick-x", String(x));
      element.style.setProperty("--stick-y", String(y));
      if (kind === "move") {
        touchMove = value;
      } else {
        touchAim = value;
        if (value.magnitude > 0.04) {
          lastAim = unitVector(value.x, value.y, lastAim);
        }
      }
    };

    const release = (event) => {
      if (pointerId === null || (event?.pointerId !== undefined && event.pointerId !== pointerId)) return;
      pointerId = null;
      if (kind === "move") touchMove = { x: 0, y: 0, magnitude: 0 };
      else {
        touchAim = { x: 0, y: 0, magnitude: 0 };
        touchFire = false;
      }
      resetStickVisual(element);
    };

    touchResetters.push(() => {
      pointerId = null;
      if (kind === "move") touchMove = { x: 0, y: 0, magnitude: 0 };
      else {
        touchAim = { x: 0, y: 0, magnitude: 0 };
        touchFire = false;
      }
      resetStickVisual(element);
    });

    listen(element, "pointerdown", (event) => {
      if (!enabled || destroyed || pointerId !== null) return;
      notifyFirstGesture();
      event.preventDefault();
      pointerId = event.pointerId;
      element.classList.add("is-active");
      try { element.setPointerCapture(pointerId); } catch { /* capture is an enhancement */ }
      if (kind === "aim") touchFire = true;
      setVector(event);
    });

    listen(element, "pointermove", (event) => {
      if (!enabled || event.pointerId !== pointerId) return;
      event.preventDefault();
      setVector(event);
    });
    listen(element, "pointerup", release);
    listen(element, "pointercancel", release);
    listen(element, "lostpointercapture", release);
  }

  function bindTouchButton(element, action) {
    if (!(element instanceof HTMLElement)) return;
    let activePointer = null;

    const release = (event) => {
      if (activePointer === null || (event?.pointerId !== undefined && event.pointerId !== activePointer)) return;
      activePointer = null;
      element.classList.remove("is-pressed");
    };

    touchResetters.push(() => {
      activePointer = null;
      element.classList.remove("is-pressed");
    });

    listen(element, "pointerdown", (event) => {
      if (!enabled || destroyed || activePointer !== null) return;
      notifyFirstGesture();
      event.preventDefault();
      activePointer = event.pointerId;
      element.classList.add("is-pressed");
      try { element.setPointerCapture(activePointer); } catch { /* optional */ }
      pulse(action);
    });
    listen(element, "pointerup", release);
    listen(element, "pointercancel", release);
    listen(element, "lostpointercapture", release);
  }

  function pollGamepad() {
    const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
    const gamepad = Array.from(pads || []).find((pad) => pad?.connected);
    if (!gamepad || !enabled) {
      gamepadId = "";
      previousGamepadButtons = [];
      return {
        move: { x: 0, y: 0, magnitude: 0 },
        aim: { x: 0, y: 0, magnitude: 0 },
        fire: false,
      };
    }

    if (gamepad.id !== gamepadId) {
      gamepadId = gamepad.id;
      previousGamepadButtons = gamepad.buttons.map(() => false);
    }

    const move = radialDeadzone(Number(gamepad.axes?.[0]) || 0, Number(gamepad.axes?.[1]) || 0);
    const aim = radialDeadzone(Number(gamepad.axes?.[2]) || 0, Number(gamepad.axes?.[3]) || 0, 0.2);
    const currentButtons = gamepad.buttons.map((button) => Boolean(button?.pressed));
    const newlyPressed = (index, threshold = 0.5) => {
      const down = buttonValue(gamepad, index) >= threshold;
      return down && !previousGamepadButtons[index];
    };

    if (newlyPressed(0) || newlyPressed(5)) pulse("dashPressed");
    if (newlyPressed(1) || newlyPressed(4)) pulse("pinPressed");
    if (newlyPressed(9)) pulse("pausePressed");

    if (move.magnitude > 0.08 || aim.magnitude > 0.08 || currentButtons.some(Boolean)) {
      notifyFirstGesture();
    }

    previousGamepadButtons = currentButtons;
    if (aim.magnitude > 0.01) lastAim = unitVector(aim.x, aim.y, lastAim);

    return {
      move,
      aim,
      fire: buttonValue(gamepad, 7) > 0.25,
    };
  }

  function keyboardVector() {
    const x = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0)
      - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const y = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0)
      - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    return normalized(x, y);
  }

  function getFrame() {
    if (!enabled || destroyed) {
      return {
        moveX: 0,
        moveY: 0,
        aimX: lastAim.x,
        aimY: lastAim.y,
        fire: false,
        dashPressed: false,
        pinPressed: false,
        pausePressed: false,
      };
    }

    const keyboard = keyboardVector();
    const gamepad = pollGamepad();
    const combinedMove = normalized(
      keyboard.x + gamepad.move.x + touchMove.x,
      keyboard.y + gamepad.move.y + touchMove.y,
    );

    if (touchAim.magnitude > 0.04) lastAim = unitVector(touchAim.x, touchAim.y, lastAim);
    else if (gamepad.aim.magnitude > 0.04) lastAim = unitVector(gamepad.aim.x, gamepad.aim.y, lastAim);

    const aim = unitVector(lastAim.x, lastAim.y);
    return {
      moveX: combinedMove.x,
      moveY: combinedMove.y,
      aimX: aim.x,
      aimY: aim.y,
      fire: Boolean(mouseFire || touchFire || gamepad.fire),
      dashPressed: pressed.dashPressed,
      pinPressed: pressed.pinPressed,
      pausePressed: pressed.pausePressed,
    };
  }

  function consumePressed(action) {
    if (typeof action === "string") {
      const key = action.endsWith("Pressed") ? action : `${action}Pressed`;
      if (!(key in pressed)) return false;
      const value = pressed[key];
      pressed[key] = false;
      return value;
    }

    const snapshot = { ...pressed };
    pressed.dashPressed = false;
    pressed.pinPressed = false;
    pressed.pausePressed = false;
    return snapshot;
  }

  function clear() {
    keys.clear();
    mouseFire = false;
    touchFire = false;
    touchMove = { x: 0, y: 0, magnitude: 0 };
    touchAim = { x: 0, y: 0, magnitude: 0 };
    previousGamepadButtons = [];
    pressed.dashPressed = false;
    pressed.pinPressed = false;
    pressed.pausePressed = false;
    for (const reset of touchResetters) reset();
    resetStickVisual(document.querySelector("#move-stick"));
    resetStickVisual(document.querySelector("#aim-stick"));
    document.querySelectorAll(".touch-action.is-pressed").forEach((element) => element.classList.remove("is-pressed"));
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) clear();
    canvas.setAttribute("aria-disabled", String(!enabled));
    document.querySelector("#touch-controls")?.setAttribute("aria-hidden", String(!enabled));
  }

  function setAimOrigin(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    aimOrigin = { x: clientX, y: clientY };
    if (mouseClient) updateMouseAim(mouseClient.x, mouseClient.y);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    clear();
    for (const remove of listeners.splice(0)) remove();
    root.classList.remove("touch-mode");
  }

  listen(window, "keydown", onKeyDown, { passive: false });
  listen(window, "keyup", onKeyUp, { passive: false });
  listen(canvas, "pointerdown", onCanvasPointerDown, { passive: false });
  listen(window, "pointermove", onPointerMove, { passive: true });
  listen(window, "pointerup", onPointerUp, { passive: true });
  listen(window, "pointercancel", clearPointerState, { passive: true });
  listen(canvas, "lostpointercapture", clearPointerState, { passive: true });
  listen(canvas, "contextmenu", (event) => event.preventDefault());
  listen(window, "blur", clear);
  listen(document, "visibilitychange", () => {
    if (document.visibilityState !== "visible") clear();
  });

  bindStick(document.querySelector("#move-stick"), "move");
  bindStick(document.querySelector("#aim-stick"), "aim");
  bindTouchButton(document.querySelector("#touch-dash"), "dashPressed");
  bindTouchButton(document.querySelector("#touch-pin"), "pinPressed");
  bindTouchButton(document.querySelector("#touch-pause"), "pausePressed");

  return Object.freeze({
    getFrame,
    consumePressed,
    setEnabled,
    setAimOrigin,
    clear,
    destroy,
    isTouch,
  });
}
