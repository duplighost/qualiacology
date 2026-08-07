const MOVE_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight"
]);

const JUMP_CODES = new Set(["Space"]);
const SPRINT_CODES = new Set(["ShiftLeft", "ShiftRight"]);
const CROUCH_CODES = new Set(["ControlLeft", "ControlRight", "KeyC"]);
const RELOAD_CODES = new Set(["KeyR"]);
const SAUCE_CODES = new Set(["KeyQ", "KeyG"]);
const PUNCH_CODES = new Set(["KeyF"]);
const ACTION_CODES = new Set([
  ...JUMP_CODES,
  ...SPRINT_CODES,
  ...CROUCH_CODES,
  ...RELOAD_CODES,
  ...SAUCE_CODES,
  ...PUNCH_CODES
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function clampVector(x, y) {
  const length = Math.hypot(x, y);
  if (length > 1) return { x: x / length, y: y / length };
  return { x, y };
}

function isEditableTarget(target) {
  if (!target || typeof target.closest !== "function") return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export class InputController {
  constructor(canvas) {
    if (!canvas || typeof canvas.addEventListener !== "function") {
      throw new TypeError("InputController requires the #game canvas element");
    }

    this.canvas = canvas;
    this.document = canvas.ownerDocument;
    this.window = this.document.defaultView;

    const params = new URLSearchParams(this.window.location.search);
    this.forceTouch = params.get("touch") === "1";
    this.isAutotest = params.has("autotest");
    this.isQa = this.isAutotest || params.get("qa") === "1";

    const navigatorTouch = Number(this.window.navigator?.maxTouchPoints || 0) > 0;
    const coarsePointer = this.window.matchMedia?.("(pointer: coarse)").matches || false;
    const finePointer = this.window.matchMedia?.("(any-pointer: fine)").matches || false;
    this.isTouch = this.forceTouch || ((navigatorTouch || coarsePointer) && !finePointer);
    this.pointerLocked = this.document.pointerLockElement === this.canvas;
    this.pointerLockTimeoutMs = 1500;
    this.pointerLockState = this.isTouch
      ? "touch"
      : this.isAutotest
        ? "bypassed"
        : this.pointerLocked ? "locked" : "idle";
    this.pointerLockError = null;
    this.pointerLockAttempts = 0;
    this.pointerLockSuccesses = this.pointerLocked ? 1 : 0;
    this.pointerLockFailures = 0;
    this.pointerLockRequestedAt = null;
    this.pointerLockAcquiredAt = this.pointerLocked ? this.window.performance.now() : null;
    this.pointerLockLatencyMs = null;

    this.touchUI = null;
    this.moveZone = null;
    this.moveRing = null;
    this.moveStick = null;
    this.lookZone = null;
    this.jumpTouch = null;
    this.crouchTouch = null;
    this.fireTouch = null;
    this.reloadTouch = null;
    this.sauceTouch = null;
    this.punchTouch = null;

    this._enabled = false;
    this._destroyed = false;
    this._keys = new Set();
    this._move = { x: 0, y: 0 };
    this._touchMove = { x: 0, y: 0 };
    this._testMove = { x: 0, y: 0 };
    this._look = { x: 0, y: 0 };
    this._pauseRequested = false;
    this._jumpRequested = false;
    this._fireRequested = false;
    this._reloadRequested = false;
    this._sauceRequested = false;
    this._punchRequested = false;
    // Desktop mouse input is a chord, not two independent pointer streams.
    // Pointer Events emits `pointerdown` only for the first depressed mouse
    // button, so an authoritative buttons mask is required for RMB+LMB ADS.
    this._mouseButtons = 0;
    this._blockedMouseButtons = 0;
    this._pointerLockPending = false;
    // Some browsers deliver an outsized first movementX/Y on pointer-lock
    // acquisition (notably on resume/re-lock). Drop that single delta so the
    // view never snaps when the player unpauses.
    this._dropNextLookDelta = false;
    this._testFire = false;
    this._testAim = false;

    this._movePointerId = null;
    this._moveOrigin = null;
    this._lookPointerId = null;
    this._lookLast = { x: 0, y: 0 };
    this._jumpPointerId = null;
    this._crouchPointerId = null;
    this._firePointerId = null;
    this._touchActionOriginal = new Map();

    this._onKeyDown = (event) => {
      if (!this._enabled || isEditableTarget(event.target)) return;

      if (event.code === "Escape") {
        if (!event.repeat) this._pauseRequested = true;
        return;
      }

      if (!MOVE_CODES.has(event.code) && !ACTION_CODES.has(event.code)) return;
      event.preventDefault();

      const wasHeld = this._keys.has(event.code);
      this._keys.add(event.code);
      if (JUMP_CODES.has(event.code) && !wasHeld) this._jumpRequested = true;
      if (RELOAD_CODES.has(event.code) && !wasHeld) this._reloadRequested = true;
      if (SAUCE_CODES.has(event.code) && !wasHeld) this._sauceRequested = true;
      if (PUNCH_CODES.has(event.code) && !wasHeld) this._punchRequested = true;
    };

    this._onKeyUp = (event) => {
      if (!MOVE_CODES.has(event.code) && !ACTION_CODES.has(event.code)) return;
      event.preventDefault();
      this._keys.delete(event.code);
    };

    this._onMouseMove = (event) => {
      if (!this._enabled || this.isTouch) return;
      this._syncMouseButtons(event.buttons);
      if (!this.pointerLocked) return;
      if (this._dropNextLookDelta) {
        this._dropNextLookDelta = false;
        return;
      }
      this._look.x += Number.isFinite(event.movementX) ? event.movementX : 0;
      this._look.y += Number.isFinite(event.movementY) ? event.movementY : 0;
    };

    this._onCanvasMouseDown = (event) => {
      if (!this._enabled || this.isTouch || (event.button !== 0 && event.button !== 2)) return;
      if (event.button === 2) event.preventDefault();
      const acquiringPointerLock = !this.pointerLocked && !this.isAutotest;
      this._setMouseButton(event.button, true, event.buttons);
      if (acquiringPointerLock) {
        // Mouse capture is an input-boundary gesture, not a combat action. Gate
        // the held acquisition button until a real release/re-press and erase
        // the one-shot fire edge so the first playing frame cannot inherit it.
        const bit = event.button === 0 ? 1 : 2;
        this._blockedMouseButtons |= bit;
        if (bit === 1) this._fireRequested = false;
        this._requestPointerLock();
      }
    };

    this._onContextMenu = (event) => event.preventDefault();

    this._onPointerLockChange = () => {
      this._pointerLockPending = false;
      const wasLocked = this.pointerLocked;
      this.pointerLocked = this.document.pointerLockElement === this.canvas;
      if (this.pointerLocked) {
        const acquiredAt = this.window.performance.now();
        if (!wasLocked) {
          this._dropNextLookDelta = true;
          this.pointerLockSuccesses += 1;
        }
        this.pointerLockState = "locked";
        this.pointerLockAcquiredAt = acquiredAt;
        this.pointerLockLatencyMs = this.pointerLockRequestedAt == null
          ? null
          : Math.max(0, acquiredAt - this.pointerLockRequestedAt);
        this.pointerLockError = null;
      } else if (wasLocked) {
        this.pointerLockState = "released";
        this.releaseAll();
      }
    };

    this._onPointerLockError = (event) => {
      this._failPointerLock("rejected", event?.error || event);
    };

    this._onMouseUp = (event) => {
      if (this.isTouch) return;
      this._setMouseButton(event.button, false, event.buttons);
    };

    this._onMovePointerDown = (event) => {
      if (!this._enabled || !this.isTouch || this._movePointerId !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      this._movePointerId = event.pointerId;
      this._placeMoveRing(event.clientX, event.clientY);
      try {
        this.moveZone?.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture can fail if the element was detached mid-gesture.
      }
      this._updateTouchMove(event);
    };

    this._onMovePointerMove = (event) => {
      if (event.pointerId !== this._movePointerId) return;
      event.preventDefault();
      this._updateTouchMove(event);
    };

    this._onLookPointerDown = (event) => {
      if (!this._enabled || !this.isTouch || this._lookPointerId !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      this._lookPointerId = event.pointerId;
      this._lookLast.x = event.clientX;
      this._lookLast.y = event.clientY;
      try {
        this.lookZone?.setPointerCapture(event.pointerId);
      } catch {
        // Global pointer-up handling still prevents a sticky look gesture.
      }
    };

    this._onLookPointerMove = (event) => {
      if (event.pointerId !== this._lookPointerId) return;
      event.preventDefault();

      // Clamp a single event so a browser resize or recovered pointer cannot
      // whip the camera around. Normal drags remain one-to-one in CSS pixels.
      const deltaX = clamp(event.clientX - this._lookLast.x, -80, 80);
      const deltaY = clamp(event.clientY - this._lookLast.y, -80, 80);
      this._look.x += deltaX;
      this._look.y += deltaY;
      this._lookLast.x = event.clientX;
      this._lookLast.y = event.clientY;
    };

    this._onJumpPointerDown = (event) => {
      if (!this._enabled || !this.isTouch || this._jumpPointerId !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();
      this._jumpPointerId = event.pointerId;
      this._jumpRequested = true;
      this._setTouchButtonHeld(this.jumpTouch, true);
      try {
        this.jumpTouch?.setPointerCapture(event.pointerId);
      } catch {
        // Global pointer-up and lost-capture handling still prevent sticky jump.
      }
    };

    this._onCrouchPointerDown = (event) => {
      if (!this._enabled || !this.isTouch || this._crouchPointerId !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();
      this._crouchPointerId = event.pointerId;
      this._setTouchButtonHeld(this.crouchTouch, true);
      try {
        this.crouchTouch?.setPointerCapture(event.pointerId);
      } catch {
        // Global pointer-up and lost-capture handling still prevent sticky crouch.
      }
    };

    this._onFirePointerDown = (event) => {
      if (!this._enabled || !this.isTouch || this._firePointerId !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      this._firePointerId = event.pointerId;
      this._fireRequested = true;
      this._setTouchButtonHeld(this.fireTouch, true);
      try {
        this.fireTouch?.setPointerCapture(event.pointerId);
      } catch {
        // Global release handling still prevents sticky automatic fire.
      }
    };

    this._onReloadPointerDown = (event) => {
      if (!this._enabled || !this.isTouch) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      this._reloadRequested = true;
      this._pulseTouchButton(this.reloadTouch);
    };

    this._onSaucePointerDown = (event) => {
      if (!this._enabled || !this.isTouch) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      this._sauceRequested = true;
      this._pulseTouchButton(this.sauceTouch);
    };

    this._onPunchPointerDown = (event) => {
      if (!this._enabled || !this.isTouch) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      this._punchRequested = true;
      this._pulseTouchButton(this.punchTouch);
    };

    this._onGlobalPointerEnd = (event) => {
      if (event.pointerId === this._movePointerId) this._resetMovePointer(event.pointerId);
      if (event.pointerId === this._lookPointerId) this._resetLookPointer(event.pointerId);
      if (event.pointerId === this._jumpPointerId) this._resetJumpPointer(event.pointerId);
      if (event.pointerId === this._crouchPointerId) this._resetCrouchPointer(event.pointerId);
      if (event.pointerId === this._firePointerId) this._resetFirePointer(event.pointerId);
      if (!this.isTouch) this._setMouseButton(event.button, false, event.buttons);
    };

    this._onMoveLostCapture = (event) => {
      if (event.pointerId === this._movePointerId) this._resetMovePointer(event.pointerId, false);
    };

    this._onLookLostCapture = (event) => {
      if (event.pointerId === this._lookPointerId) this._resetLookPointer(event.pointerId, false);
    };

    this._onJumpLostCapture = (event) => {
      if (event.pointerId === this._jumpPointerId) this._resetJumpPointer(event.pointerId, false);
    };

    this._onCrouchLostCapture = (event) => {
      if (event.pointerId === this._crouchPointerId) this._resetCrouchPointer(event.pointerId, false);
    };

    this._onFireLostCapture = (event) => {
      if (event.pointerId === this._firePointerId) this._resetFirePointer(event.pointerId, false);
    };

    this._onBlur = () => this._resetHeldInput();
    this._onPageHide = () => this._resetHeldInput();
    this._onVisibilityChange = () => {
      if (this.document.hidden) this._resetHeldInput();
    };

    this._resolveTouchElements();
  }

  enable() {
    if (this._enabled || this._destroyed) return this;
    this._enabled = true;
    this._resolveTouchElements();
    this._applyTouchUiState();

    this.window.addEventListener("keydown", this._onKeyDown, { passive: false });
    this.window.addEventListener("keyup", this._onKeyUp, { passive: false });
    this.window.addEventListener("blur", this._onBlur);
    this.window.addEventListener("pagehide", this._onPageHide);
    this.window.addEventListener("mouseup", this._onMouseUp, { capture: true, passive: true });
    this.window.addEventListener("pointerup", this._onGlobalPointerEnd, { capture: true, passive: true });
    this.window.addEventListener("pointercancel", this._onGlobalPointerEnd, { capture: true, passive: true });
    this.document.addEventListener("visibilitychange", this._onVisibilityChange);
    this.document.addEventListener("mousemove", this._onMouseMove, { passive: true });
    this.document.addEventListener("pointerlockchange", this._onPointerLockChange);
    this.document.addEventListener("pointerlockerror", this._onPointerLockError);
    this.canvas.addEventListener("mousedown", this._onCanvasMouseDown, { passive: false });
    this.canvas.addEventListener("contextmenu", this._onContextMenu);

    if (this.isTouch) this._enableTouchZones();
    this._onPointerLockChange();
    this.update();
    return this;
  }

  update() {
    if (this._pointerLockPending && this.pointerLockRequestedAt != null) {
      const pendingFor = this.window.performance.now() - this.pointerLockRequestedAt;
      if (pendingFor >= this.pointerLockTimeoutMs && !this.pointerLocked) {
        this._failPointerLock("timed-out", new Error("Mouse capture timed out"));
      }
    }

    const keyX = (this._keys.has("KeyD") || this._keys.has("ArrowRight") ? 1 : 0)
      - (this._keys.has("KeyA") || this._keys.has("ArrowLeft") ? 1 : 0);
    const keyY = (this._keys.has("KeyW") || this._keys.has("ArrowUp") ? 1 : 0)
      - (this._keys.has("KeyS") || this._keys.has("ArrowDown") ? 1 : 0);

    this._move = clampVector(
      keyX + this._touchMove.x + this._testMove.x,
      keyY + this._touchMove.y + this._testMove.y
    );
    return { ...this._move };
  }

  get jumpHeld() {
    return this._keys.has("Space") || this._jumpPointerId !== null;
  }

  get sprintHeld() {
    return this._keys.has("ShiftLeft") || this._keys.has("ShiftRight");
  }

  get crouchHeld() {
    return this._keys.has("ControlLeft")
      || this._keys.has("ControlRight")
      || this._keys.has("KeyC")
      || this._crouchPointerId !== null;
  }

  get fireHeld() {
    const desktopFire = !this.isTouch && (this.pointerLocked || this.isAutotest) &&
      (this._mouseButtons & 1) !== 0 && (this._blockedMouseButtons & 1) === 0;
    return Boolean(desktopFire || this._firePointerId !== null || this._testFire);
  }

  get aimHeld() {
    const desktopAim = !this.isTouch && (this.pointerLocked || this.isAutotest) &&
      (this._mouseButtons & 2) !== 0 && (this._blockedMouseButtons & 2) === 0;
    return Boolean(desktopAim || this._testAim);
  }

  getState() {
    return {
      fireHeld: this.fireHeld,
      fireRequested: Boolean(this._fireRequested),
      aimHeld: this.aimHeld,
      pointerLocked: Boolean(this.pointerLocked),
      pointerLockState: this.pointerLockState,
      pointerLockError: this.pointerLockError,
      pointerLockSupported: typeof this.canvas.requestPointerLock === "function",
      pointerLockAttempts: this.pointerLockAttempts,
      pointerLockSuccesses: this.pointerLockSuccesses,
      pointerLockFailures: this.pointerLockFailures,
      pointerLockRequestedAt: this.pointerLockRequestedAt,
      pointerLockAcquiredAt: this.pointerLockAcquiredAt,
      pointerLockLatencyMs: this.pointerLockLatencyMs,
      pointerLockTimeoutMs: this.pointerLockTimeoutMs,
      mouseButtons: this._mouseButtons,
      blockedMouseButtons: this._blockedMouseButtons,
      pointerLockPending: Boolean(this._pointerLockPending),
      touchFireHeld: this._firePointerId !== null,
      testFireHeld: Boolean(this._testFire),
      testAimHeld: Boolean(this._testAim),
      punchRequested: Boolean(this._punchRequested)
    };
  }

  consumeLook() {
    const look = { x: this._look.x, y: this._look.y };
    this._look.x = 0;
    this._look.y = 0;
    return look;
  }

  getMove() {
    return { ...this._move };
  }

  consumeJump() {
    const requested = this._jumpRequested;
    this._jumpRequested = false;
    return requested;
  }

  consumeFirePress() {
    const requested = this._fireRequested;
    this._fireRequested = false;
    return requested;
  }

  consumePause() {
    const requested = this._pauseRequested;
    this._pauseRequested = false;
    return requested;
  }

  consumeReload() {
    const requested = this._reloadRequested;
    this._reloadRequested = false;
    return requested;
  }

  consumeSauce() {
    const requested = this._sauceRequested;
    this._sauceRequested = false;
    return requested;
  }

  consumePunch() {
    const requested = this._punchRequested;
    this._punchRequested = false;
    return requested;
  }

  requestPunch() {
    if (!this._enabled || this._destroyed) return false;
    this._punchRequested = true;
    return true;
  }

  setTestMove(x, y) {
    const safeX = Number.isFinite(x) ? x : 0;
    const safeY = Number.isFinite(y) ? y : 0;
    this._testMove = clampVector(safeX, safeY);
    this.update();
  }

  setTestFire(pressed) {
    const next = Boolean(pressed);
    if (next && !this._testFire) this._fireRequested = true;
    this._testFire = next;
    return this._testFire;
  }

  setTestAim(pressed) {
    this._testAim = Boolean(pressed);
    return this._testAim;
  }

  requestPointerLock() {
    return this._requestPointerLock();
  }

  simulatePointerLockFailure(reason = "Simulated pointer-lock failure") {
    if (!this.isQa) return false;
    this._failPointerLock("rejected", new Error(String(reason)));
    return true;
  }

  releaseAll() {
    this._resetHeldInput();
    return this;
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._enabled) {
      this.window.removeEventListener("keydown", this._onKeyDown);
      this.window.removeEventListener("keyup", this._onKeyUp);
      this.window.removeEventListener("blur", this._onBlur);
      this.window.removeEventListener("pagehide", this._onPageHide);
      this.window.removeEventListener("mouseup", this._onMouseUp, true);
      this.window.removeEventListener("pointerup", this._onGlobalPointerEnd, true);
      this.window.removeEventListener("pointercancel", this._onGlobalPointerEnd, true);
      this.document.removeEventListener("visibilitychange", this._onVisibilityChange);
      this.document.removeEventListener("mousemove", this._onMouseMove);
      this.document.removeEventListener("pointerlockchange", this._onPointerLockChange);
      this.document.removeEventListener("pointerlockerror", this._onPointerLockError);
      this.canvas.removeEventListener("mousedown", this._onCanvasMouseDown);
      this.canvas.removeEventListener("contextmenu", this._onContextMenu);
      this._disableTouchZones();
    }

    if (this.document.pointerLockElement === this.canvas) {
      try {
        this.document.exitPointerLock?.();
      } catch {
        // Teardown must remain safe even during navigation or browser shutdown.
      }
    }

    this._enabled = false;
    this.pointerLocked = false;
    this._pointerLockPending = false;
    this.pointerLockState = "destroyed";
    this._resetHeldInput(false);
    this._look.x = 0;
    this._look.y = 0;
    this._pauseRequested = false;
    this._reloadRequested = false;
    this._sauceRequested = false;
    this._punchRequested = false;
    this._removeTouchUiState();

    for (const [element, touchAction] of this._touchActionOriginal) {
      element.style.touchAction = touchAction;
    }
    this._touchActionOriginal.clear();
  }

  _requestPointerLock() {
    // Pointer lock is intentionally impossible in query-driven smoke tests.
    if (!this._enabled || this._destroyed) return false;
    if (this.isTouch) {
      this.pointerLockState = "touch";
      return false;
    }
    if (this.isAutotest) {
      this.pointerLockState = "bypassed";
      return false;
    }
    if (!this.canvas.isConnected) {
      this._failPointerLock("rejected", new Error("Game canvas is not connected"));
      return false;
    }
    if (this.document.pointerLockElement === this.canvas) {
      this.pointerLocked = true;
      this.pointerLockState = "locked";
      return true;
    }
    if (this._pointerLockPending) return false;

    const request = this.canvas.requestPointerLock;
    if (typeof request !== "function") {
      this._failPointerLock("unsupported", new Error("Pointer lock is not supported"));
      return false;
    }

    try {
      this.pointerLockAttempts += 1;
      this._pointerLockPending = true;
      this.pointerLockState = "requesting";
      this.pointerLockError = null;
      this.pointerLockRequestedAt = this.window.performance.now();
      const result = request.call(this.canvas);
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            if (this.document.pointerLockElement === this.canvas) this._onPointerLockChange();
          },
          (error) => this._failPointerLock("rejected", error)
        );
      }
      return true;
    } catch (error) {
      this._failPointerLock("rejected", error);
      return false;
    }
  }

  _failPointerLock(state, error) {
    const wasPending = this._pointerLockPending || this.pointerLockState === "requesting";
    this._pointerLockPending = false;
    this.pointerLocked = this.document.pointerLockElement === this.canvas;
    if (this.pointerLocked) {
      this._onPointerLockChange();
      return false;
    }
    this.pointerLockState = state;
    this.pointerLockError = String(error?.name || error?.message || error || "Pointer lock failed").slice(0, 180);
    if (wasPending || state === "unsupported") this.pointerLockFailures += 1;
    this.releaseAll();
    return true;
  }

  _setMouseButton(button, pressed, buttons = null) {
    const bit = button === 0 ? 1 : button === 2 ? 2 : 0;
    if (!bit) {
      this._syncMouseButtons(buttons);
      return;
    }
    if (pressed) {
      if (bit === 1 && (this._mouseButtons & bit) === 0) this._fireRequested = true;
      this._mouseButtons |= bit;
      this._blockedMouseButtons &= ~bit;
    } else {
      this._mouseButtons &= ~bit;
      this._blockedMouseButtons &= ~bit;
    }
    this._syncMouseButtons(buttons);
  }

  _syncMouseButtons(buttons) {
    if (!Number.isFinite(buttons)) return;
    const next = Math.max(0, Math.floor(buttons)) & 3;
    // Only arm a fresh press when the button is not still gated. A held-over
    // left button that survived a focus/pointer-lock loss keeps its block bit,
    // so merely moving the mouse must not leak a shot before a genuine re-press
    // clears the gate in _setMouseButton.
    if ((next & 1) !== 0 && (this._mouseButtons & 1) === 0 && (this._blockedMouseButtons & 1) === 0) this._fireRequested = true;
    const released = this._mouseButtons & ~next;
    this._blockedMouseButtons &= ~released;
    this._mouseButtons = next;
  }

  _resolveTouchElements() {
    this.touchUI ||= this.document.querySelector("#touch-ui");
    this.moveZone ||= this.document.querySelector("#move-zone");
    this.moveRing ||= this.document.querySelector("#move-ring");
    this.moveStick ||= this.document.querySelector("#move-stick");
    this.lookZone ||= this.document.querySelector("#look-zone");
    this.jumpTouch ||= this.document.querySelector("#jump-touch");
    this.crouchTouch ||= this.document.querySelector("#crouch-touch");
    this.fireTouch ||= this.document.querySelector("#touch-fire");
    this.reloadTouch ||= this.document.querySelector("#touch-reload");
    this.sauceTouch ||= this.document.querySelector("#touch-sauce");
    this.punchTouch ||= this.document.querySelector("#touch-punch");
  }

  _applyTouchUiState() {
    const root = this.document.documentElement;
    const body = this.document.body;

    root?.classList.toggle("touch-enabled", this.isTouch);
    body?.classList.toggle("touch-enabled", this.isTouch);
    root?.classList.toggle("force-touch", this.forceTouch);
    body?.classList.toggle("force-touch", this.forceTouch);

    if (this.touchUI) {
      this.touchUI.hidden = !this.isTouch;
      this.touchUI.classList.toggle("is-active", this.isTouch);
      this.touchUI.setAttribute("aria-hidden", String(!this.isTouch));
      this.touchUI.dataset.active = String(this.isTouch);
    }
  }

  _removeTouchUiState() {
    const root = this.document.documentElement;
    const body = this.document.body;

    root?.classList.remove("touch-enabled", "force-touch");
    body?.classList.remove("touch-enabled", "force-touch");
    if (this.touchUI) {
      this.touchUI.hidden = true;
      this.touchUI.classList.remove("is-active");
      this.touchUI.setAttribute("aria-hidden", "true");
      this.touchUI.dataset.active = "false";
    }
  }

  _enableTouchZones() {
    for (const element of [
      this.moveZone,
      this.lookZone,
      this.jumpTouch,
      this.crouchTouch,
      this.fireTouch,
      this.reloadTouch,
      this.sauceTouch,
      this.punchTouch
    ]) {
      if (!element) continue;
      if (!this._touchActionOriginal.has(element)) {
        this._touchActionOriginal.set(element, element.style.touchAction);
      }
      element.style.touchAction = "none";
    }

    this.moveZone?.addEventListener("pointerdown", this._onMovePointerDown, { passive: false });
    this.moveZone?.addEventListener("pointermove", this._onMovePointerMove, { passive: false });
    this.moveZone?.addEventListener("lostpointercapture", this._onMoveLostCapture);
    this.lookZone?.addEventListener("pointerdown", this._onLookPointerDown, { passive: false });
    this.lookZone?.addEventListener("pointermove", this._onLookPointerMove, { passive: false });
    this.lookZone?.addEventListener("lostpointercapture", this._onLookLostCapture);
    this.jumpTouch?.addEventListener("pointerdown", this._onJumpPointerDown, { passive: false });
    this.jumpTouch?.addEventListener("lostpointercapture", this._onJumpLostCapture);
    this.crouchTouch?.addEventListener("pointerdown", this._onCrouchPointerDown, { passive: false });
    this.crouchTouch?.addEventListener("lostpointercapture", this._onCrouchLostCapture);
    this.fireTouch?.addEventListener("pointerdown", this._onFirePointerDown, { passive: false });
    this.fireTouch?.addEventListener("lostpointercapture", this._onFireLostCapture);
    this.reloadTouch?.addEventListener("pointerdown", this._onReloadPointerDown, { passive: false });
    this.sauceTouch?.addEventListener("pointerdown", this._onSaucePointerDown, { passive: false });
    this.punchTouch?.addEventListener("pointerdown", this._onPunchPointerDown, { passive: false });
  }

  _disableTouchZones() {
    this.moveZone?.removeEventListener("pointerdown", this._onMovePointerDown);
    this.moveZone?.removeEventListener("pointermove", this._onMovePointerMove);
    this.moveZone?.removeEventListener("lostpointercapture", this._onMoveLostCapture);
    this.lookZone?.removeEventListener("pointerdown", this._onLookPointerDown);
    this.lookZone?.removeEventListener("pointermove", this._onLookPointerMove);
    this.lookZone?.removeEventListener("lostpointercapture", this._onLookLostCapture);
    this.jumpTouch?.removeEventListener("pointerdown", this._onJumpPointerDown);
    this.jumpTouch?.removeEventListener("lostpointercapture", this._onJumpLostCapture);
    this.crouchTouch?.removeEventListener("pointerdown", this._onCrouchPointerDown);
    this.crouchTouch?.removeEventListener("lostpointercapture", this._onCrouchLostCapture);
    this.fireTouch?.removeEventListener("pointerdown", this._onFirePointerDown);
    this.fireTouch?.removeEventListener("lostpointercapture", this._onFireLostCapture);
    this.reloadTouch?.removeEventListener("pointerdown", this._onReloadPointerDown);
    this.sauceTouch?.removeEventListener("pointerdown", this._onSaucePointerDown);
    this.punchTouch?.removeEventListener("pointerdown", this._onPunchPointerDown);
  }

  _updateTouchMove(event) {
    if (!this.moveZone) return;
    const ringRect = this.moveRing?.getBoundingClientRect();
    const zoneRect = this.moveZone.getBoundingClientRect();
    const ringCenterX = ringRect ? ringRect.left + ringRect.width * 0.5 : null;
    const ringCenterY = ringRect ? ringRect.top + ringRect.height * 0.5 : null;
    const centerX = this._moveOrigin?.x ?? ringCenterX ?? zoneRect.left + zoneRect.width * 0.5;
    const centerY = this._moveOrigin?.y ?? ringCenterY ?? zoneRect.top + zoneRect.height * 0.5;
    const diameter = Math.min(ringRect?.width || 120, ringRect?.height || 120);
    const radius = Math.max(24, diameter * 0.38);
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const distance = Math.hypot(rawX, rawY);
    const directionX = distance > 0 ? rawX / distance : 0;
    const directionY = distance > 0 ? rawY / distance : 0;
    const visualDistance = Math.min(distance, radius);
    const rawMagnitude = clamp(distance / radius, 0, 1);
    const deadZone = 0.08;
    const magnitude = rawMagnitude <= deadZone
      ? 0
      : (rawMagnitude - deadZone) / (1 - deadZone);

    this._touchMove.x = directionX * magnitude;
    this._touchMove.y = -directionY * magnitude;
    this._setStickVisual(directionX * visualDistance, directionY * visualDistance);
  }

  _placeMoveRing(clientX, clientY) {
    if (!this.moveRing || !this.moveZone) {
      this._moveOrigin = { x: clientX, y: clientY };
      return;
    }
    const zone = this.moveZone.getBoundingClientRect();
    const ring = this.moveRing.getBoundingClientRect();
    const half = Math.max(40, Math.min(ring.width, ring.height) * 0.5);
    const x = clamp(clientX, zone.left + half + 6, zone.right - half - 6);
    const y = clamp(clientY, zone.top + half + 6, zone.bottom - half - 6);
    this._moveOrigin = { x, y };
    this.moveRing.style.left = `${x - zone.left - half}px`;
    this.moveRing.style.top = `${y - zone.top - half}px`;
    this.moveRing.style.bottom = "auto";
  }

  _setStickVisual(x, y) {
    if (!this.moveStick) return;
    const roundedX = Math.round(x * 10) / 10;
    const roundedY = Math.round(y * 10) / 10;
    this.moveStick.style.setProperty("--stick-x", `${roundedX}px`);
    this.moveStick.style.setProperty("--stick-y", `${roundedY}px`);
    // The individual translate property composes with an authored centering
    // transform instead of replacing it.
    this.moveStick.style.translate = `${roundedX}px ${roundedY}px`;
  }

  _resetMovePointer(pointerId = this._movePointerId, releaseCapture = true) {
    if (pointerId === null || pointerId !== this._movePointerId) return;
    this._movePointerId = null;
    this._moveOrigin = null;
    this._touchMove.x = 0;
    this._touchMove.y = 0;
    this._setStickVisual(0, 0);
    if (this.moveRing) {
      this.moveRing.style.removeProperty("left");
      this.moveRing.style.removeProperty("top");
      this.moveRing.style.removeProperty("bottom");
    }

    if (releaseCapture) {
      try {
        if (this.moveZone?.hasPointerCapture(pointerId)) {
          this.moveZone.releasePointerCapture(pointerId);
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    }
  }

  _resetLookPointer(pointerId = this._lookPointerId, releaseCapture = true) {
    if (pointerId === null || pointerId !== this._lookPointerId) return;
    this._lookPointerId = null;
    this._lookLast.x = 0;
    this._lookLast.y = 0;

    if (releaseCapture) {
      try {
        if (this.lookZone?.hasPointerCapture(pointerId)) {
          this.lookZone.releasePointerCapture(pointerId);
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    }
  }

  _setTouchButtonHeld(element, held) {
    if (!element) return;
    element.classList.toggle("is-held", held);
    element.setAttribute("aria-pressed", String(held));
  }

  _pulseTouchButton(element) {
    if (!element) return;
    element.classList.remove("is-pulsed");
    void element.offsetWidth;
    element.classList.add("is-pulsed");
    this.window.setTimeout(() => element.classList.remove("is-pulsed"), 150);
  }

  _resetJumpPointer(pointerId = this._jumpPointerId, releaseCapture = true) {
    if (pointerId === null || pointerId !== this._jumpPointerId) return;
    this._jumpPointerId = null;
    this._setTouchButtonHeld(this.jumpTouch, false);

    if (releaseCapture) {
      try {
        if (this.jumpTouch?.hasPointerCapture(pointerId)) {
          this.jumpTouch.releasePointerCapture(pointerId);
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    }
  }

  _resetCrouchPointer(pointerId = this._crouchPointerId, releaseCapture = true) {
    if (pointerId === null || pointerId !== this._crouchPointerId) return;
    this._crouchPointerId = null;
    this._setTouchButtonHeld(this.crouchTouch, false);

    if (releaseCapture) {
      try {
        if (this.crouchTouch?.hasPointerCapture(pointerId)) {
          this.crouchTouch.releasePointerCapture(pointerId);
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    }
  }

  _resetFirePointer(pointerId = this._firePointerId, releaseCapture = true) {
    if (pointerId === null || pointerId !== this._firePointerId) return;
    this._firePointerId = null;
    this._setTouchButtonHeld(this.fireTouch, false);

    if (releaseCapture) {
      try {
        if (this.fireTouch?.hasPointerCapture(pointerId)) {
          this.fireTouch.releasePointerCapture(pointerId);
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    }
  }

  _resetHeldInput(gateMouseButtons = true) {
    if (gateMouseButtons) this._blockedMouseButtons |= this._mouseButtons;
    else this._blockedMouseButtons = 0;
    this._mouseButtons = 0;
    this._keys.clear();
    if (this._movePointerId !== null) this._resetMovePointer(this._movePointerId);
    if (this._lookPointerId !== null) this._resetLookPointer(this._lookPointerId);
    if (this._jumpPointerId !== null) this._resetJumpPointer(this._jumpPointerId);
    if (this._crouchPointerId !== null) this._resetCrouchPointer(this._crouchPointerId);
    if (this._firePointerId !== null) this._resetFirePointer(this._firePointerId);
    this._touchMove.x = 0;
    this._touchMove.y = 0;
    this._testMove.x = 0;
    this._testMove.y = 0;
    this._jumpRequested = false;
    this._fireRequested = false;
    this._reloadRequested = false;
    this._sauceRequested = false;
    this._punchRequested = false;
    this._testFire = false;
    this._testAim = false;
    this._setStickVisual(0, 0);
    this.update();
  }
}
