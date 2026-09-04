(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // GORETHREAD // HELLSPINDLE — FUSION 3.0
  // A dependency-free canvas action game rebuilt from the strongest parts of both releases.
  // ---------------------------------------------------------------------------

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  const hashSeeded = n => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };

  // The whole game is authored in a fixed 1600x900 design space. The canvas
  // backing store is sized to what the display can actually resolve and render()
  // applies the one scale, so a phone never paints more pixels than it owns and
  // nothing else in the file has to know the difference.
  const W = 1600;
  const H = 900;
  let renderScale = 1;
  const BG_PATHS = [
    'assets/bg_nave.webp',
    'assets/bg_foundry.webp',
    'assets/bg_spire.webp',
    'assets/bg_boss.webp',
    'assets/bg_cloister.webp',
    'assets/bg_glass.webp',
    'assets/bg_library.webp',
    'assets/bg_iron.webp'
  ];
  const bgImages = BG_PATHS.map(src => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    return image;
  });
  const SPRITE_PATHS = {
    hunter: 'assets/sprites/hunter.png',
    crawler: 'assets/sprites/crawler.png',
    bat: 'assets/sprites/bat.png',
    knight: 'assets/sprites/knight.png',
    censer: 'assets/sprites/censer.png',
    executioner: 'assets/sprites/executioner.png',
    boss: 'assets/sprites/boss.png',
    wheel: 'assets/sprites/wheel.png',
    hook: 'assets/sprites/hook.png',
    goreweave: 'assets/sprites/goreweave.png',
    tileNave: 'assets/sprites/tile_nave.png',
    tileFoundry: 'assets/sprites/tile_foundry.png',
    tileSpire: 'assets/sprites/tile_spire.png'
  };
  const sprites = {};
  for (const [key, src] of Object.entries(SPRITE_PATHS)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    sprites[key] = image;
  }
  const tilePatterns = { nave: null, foundry: null, spire: null };

  // The painted source frames are three to six times bigger than they are ever
  // drawn — a 405x671 walk frame lands on screen about 90px tall. Rescaling that
  // every frame, for every actor, is work the browser has to redo forever. Bake
  // each size once into a small canvas and blit that instead.
  const scaledCache = new Map();
  let scaledCachePixels = 0;
  const SCALED_CACHE_PIXELS = 7 * 1024 * 1024;

  function scaledSprite(img, w, h) {
    if (!img || !img.complete || !img.naturalWidth) return img;
    // Quantise so a pulsing draw height does not mint a new canvas every frame.
    const dh = Math.max(2, Math.round(h / 3) * 3);
    if (img.naturalHeight <= dh * 1.3) return img;
    const dw = Math.max(2, Math.round(dh * img.naturalWidth / img.naturalHeight));
    const key = img.src + '|' + dw + 'x' + dh;
    const hit = scaledCache.get(key);
    if (hit) return hit;
    if (scaledCachePixels + dw * dh > SCALED_CACHE_PIXELS) return img;
    const c = document.createElement('canvas');
    c.width = dw;
    c.height = dh;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = true;
    if (cx.imageSmoothingQuality) cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, 0, 0, dw, dh);
    scaledCache.set(key, c);
    scaledCachePixels += dw * dh;
    return c;
  }

  function loadAnim(folder, count) {
    const frames = [];
    for (let i = 0; i < count; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `assets/sprites/anim/${folder}/${String(i).padStart(2, '0')}.png`;
      frames.push(img);
    }
    return frames;
  }
  const anims = {
    hunterWalk: loadAnim('hunter_walk', 12),
    hunterIdle: loadAnim('hunter_idle', 8),
    hunterAir: loadAnim('hunter_air', 11),
    knightWalk: loadAnim('knight_walk', 6),
    crawlerWalk: loadAnim('crawler_walk', 8),
    batFlap: loadAnim('bat_flap', 18),
    censerFloat: loadAnim('censer_float', 12),
    executionerWalk: loadAnim('executioner_walk', 12),
    bossIdle: loadAnim('boss_idle', 8)
  };

  function animReady(frames) {
    return !!(frames && frames[0] && frames[0].complete && frames[0].naturalWidth > 0);
  }

  function animImg(frames, t, fps) {
    if (!animReady(frames)) return null;
    const i = ((Math.floor(t * fps) % frames.length) + frames.length) % frames.length;
    const img = frames[i];
    return (img && img.complete && img.naturalWidth) ? img : frames[0];
  }

  function drawAnimGround(g, img, x, y, drawH, facing, opts = {}) {
    const w = drawH * (img.naturalWidth / img.naturalHeight);
    const ax = opts.ax != null ? opts.ax : 0.5;
    g.save();
    g.translate(x, y);
    if (opts.rot) g.rotate(opts.rot);
    g.scale(facing, opts.scaleY || 1);
    if (opts.alpha != null) g.globalAlpha *= opts.alpha;
    if (opts.flash) { g.shadowColor = '#ffe6d4'; g.shadowBlur = 20; }
    g.drawImage(scaledSprite(img, w, drawH), -w * ax, -drawH + (opts.sit || 2), w, drawH);
    g.restore();
    return true;
  }

  function drawAnimCenter(g, img, x, y, drawH, facing, opts = {}) {
    const w = drawH * (img.naturalWidth / img.naturalHeight);
    g.save();
    g.translate(x, y);
    if (opts.rot) g.rotate(opts.rot);
    g.scale(facing, opts.scaleY || 1);
    if (opts.alpha != null) g.globalAlpha *= opts.alpha;
    if (opts.flash) { g.shadowColor = '#ffe6d4'; g.shadowBlur = 18; }
    g.drawImage(scaledSprite(img, w, drawH), -w * (opts.ax || 0.5), -drawH * (opts.ay || 0.5), w, drawH);
    g.restore();
    return true;
  }
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 192;
  grainCanvas.height = 192;
  const grainContext = grainCanvas.getContext('2d');
  const grainData = grainContext.createImageData(grainCanvas.width, grainCanvas.height);
  for (let i = 0; i < grainData.data.length; i += 4) {
    const n = Math.floor(hashSeeded(i * 0.017) * 255);
    grainData.data[i] = n;
    grainData.data[i + 1] = n;
    grainData.data[i + 2] = n;
    grainData.data[i + 3] = 18;
  }
  grainContext.putImageData(grainData, 0, 0);
  let grainPattern = null;
  const TAU = Math.PI * 2;
  const WORLD_W = 38400;
  const PLAYER_W = 46;
  const PLAYER_H = 82;
  const BASE_CHAIN = 330;
  let MAX_CHAIN = BASE_CHAIN;
  // Rope feel. The pump is deliberately arcade-strong: one held key should start
  // a useful arc from a dead hang without the player having to find the
  // pendulum's resonant frequency by ear.
  const BASE_PUMP = 3900;
  const BASE_SWING = 1120;
  let SWING_PUMP = BASE_PUMP;
  let MAX_SWING = BASE_SWING;
  // How fast the rope is allowed to take up slack, in pixels per second. High
  // enough that reel-in reads as a yank, low enough that it is a pull and not a
  // teleport.
  const ROPE_TAKEUP = 1500;
  // A pointer that vanishes for a frame — a stray pointercancel on a phone, a
  // dropped button — should not cost you the ring you are hanging from.
  const HOLD_GRACE = 0.18;
  const FIXED_DT = 1 / 120;
  const COARSE_POINTER = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const PARTICLE_CAP = COARSE_POINTER ? 320 : 760;

  // Size the backing store to the display instead of always painting 1600x900.
  // A phone canvas is usually shown at well under 1600 CSS pixels, so the old
  // fixed buffer was rendering pixels that got thrown away on the way to the
  // screen. Capped so a big desktop never supersamples either.
  function sizeBackingStore() {
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || canvas.clientWidth || W;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const ceiling = COARSE_POINTER ? 1280 : 1600;
    const wanted = Math.max(640, Math.min(ceiling, Math.round(cssW * dpr)));
    const scale = wanted / W;
    const pxW = Math.round(W * scale);
    const pxH = Math.round(H * scale);
    if (canvas.width === pxW && canvas.height === pxH) return;
    canvas.width = pxW;
    canvas.height = pxH;
    renderScale = scale;
  }


  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (v, target, delta) => v < target ? Math.min(target, v + delta) : Math.max(target, v - delta);
  const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
  const hypot = (x, y) => Math.hypot(x, y);
  const sign0 = v => (v < 0 ? -1 : v > 0 ? 1 : 0);
  const wrapAngle = a => {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  };
  const smoothstep = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const choose = arr => arr[(Math.random() * arr.length) | 0];
  const hash = n => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleRect(cx, cy, r, rect) {
    const qx = clamp(cx, rect.x, rect.x + rect.w);
    const qy = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - qx;
    const dy = cy - qy;
    return dx * dx + dy * dy <= r * r;
  }

  function pointSegmentDistance(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const denom = abx * abx + aby * aby || 1;
    const t = clamp(((px - ax) * abx + (py - ay) * aby) / denom, 0, 1);
    const qx = ax + abx * t;
    const qy = ay + aby * t;
    return hypot(px - qx, py - qy);
  }

  function lineHitsRect(ax, ay, bx, by, rect, padding = 0) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const radius = hypot(rect.w / 2, rect.h / 2) + padding;
    if (pointSegmentDistance(cx, cy, ax, ay, bx, by) > radius) return false;

    // Cheap robust refinement: sample the segment. This is plenty for combat hitboxes.
    const len = hypot(bx - ax, by - ay);
    const steps = Math.max(2, Math.ceil(len / 18));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(ax, bx, t);
      const y = lerp(ay, by, t);
      if (x >= rect.x - padding && x <= rect.x + rect.w + padding &&
          y >= rect.y - padding && y <= rect.y + rect.h + padding) return true;
    }
    return false;
  }

  function roundedRectPath(g, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }

  function sprReady(name) {
    const img = sprites[name];
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function spriteSize(name, drawH) {
    const img = sprites[name];
    return { w: drawH * (img.naturalWidth / img.naturalHeight), h: drawH, img };
  }

  function drawGroundSprite(g, name, x, y, drawH, facing, opts = {}) {
    if (!sprReady(name)) return false;
    const { w, h, img } = spriteSize(name, drawH);
    const ax = opts.ax != null ? opts.ax : 0.5;
    g.save();
    g.translate(x, y);
    if (opts.rot) g.rotate(opts.rot);
    g.scale(facing, opts.scaleY || 1);
    if (opts.alpha != null) g.globalAlpha *= opts.alpha;
    if (opts.flash) {
      g.shadowColor = '#ffe6d4';
      g.shadowBlur = 20;
    }
    g.drawImage(scaledSprite(img, w, h), -w * ax, -h + (opts.sit || 2), w, h);
    g.restore();
    return true;
  }

  function drawCenterSprite(g, name, x, y, drawH, facing, opts = {}) {
    if (!sprReady(name)) return false;
    const { w, h, img } = spriteSize(name, drawH);
    g.save();
    g.translate(x, y);
    if (opts.rot) g.rotate(opts.rot);
    g.scale(facing, opts.scaleY || 1);
    if (opts.alpha != null) g.globalAlpha *= opts.alpha;
    if (opts.flash) {
      g.shadowColor = '#ffe6d4';
      g.shadowBlur = 18;
    }
    g.drawImage(scaledSprite(img, w, h), -w * (opts.ax || 0.5), -h * (opts.ay || 0.5), w, h);
    g.restore();
    return true;
  }

  // Canvas gradients are objects the browser has to build and hand to the
  // rasteriser. The masonry alone was minting two or three of them per platform
  // per frame for shapes that never change. Build each one once, in local
  // vertical space, and translate to use it.
  const gradientCache = new Map();
  function cachedVGradient(g, key, height, stops) {
    let grad = gradientCache.get(key);
    if (grad) return grad;
    grad = g.createLinearGradient(0, 0, 0, height);
    for (let i = 0; i < stops.length; i++) grad.addColorStop(stops[i][0], stops[i][1]);
    gradientCache.set(key, grad);
    return grad;
  }
  function cachedRGradient(g, key, r0, r1, stops) {
    let grad = gradientCache.get(key);
    if (grad) return grad;
    grad = g.createRadialGradient(0, 0, r0, 0, 0, r1);
    for (let i = 0; i < stops.length; i++) grad.addColorStop(stops[i][0], stops[i][1]);
    gradientCache.set(key, grad);
    return grad;
  }

  function ensurePatterns(g) {
    if (!tilePatterns.nave && sprReady('tileNave')) tilePatterns.nave = g.createPattern(sprites.tileNave, 'repeat');
    if (!tilePatterns.foundry && sprReady('tileFoundry')) tilePatterns.foundry = g.createPattern(sprites.tileFoundry, 'repeat');
    if (!tilePatterns.spire && sprReady('tileSpire')) tilePatterns.spire = g.createPattern(sprites.tileSpire, 'repeat');
  }

  // ---------------------------------------------------------------------------
  // Input: keyboard + mouse, two-thumb touch, and controller.
  // ---------------------------------------------------------------------------

  class Input {
    constructor(target) {
      this.target = target;
      this.keys = new Set();
      this.pressed = new Set();
      this.anyPressed = false;
      this.jumpQueued = false;
      this.mouse = { x: W * 0.75, y: H * 0.45, down: false };
      this.pointerKind = 'mouse';
      this.leftTouch = null;
      this.rightTouch = null;
      this.gamepadJumpPrev = false;
      this.gamepadPausePrev = false;
      this.pauseQueued = false;
      this.leftJumpLatch = false;
      this.lastInputWasTouch = false;
      this.tapQueue = null;

      window.addEventListener('keydown', e => {
        const code = e.code;
        if (!this.keys.has(code)) {
          this.pressed.add(code);
          this.anyPressed = true;
          if (['Space', 'KeyW', 'ArrowUp'].includes(code)) this.jumpQueued = true;
          if (['Escape', 'KeyP'].includes(code)) this.pauseQueued = true;
        }
        this.keys.add(code);
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) e.preventDefault();
        audio.ensure();
      }, { passive: false });

      window.addEventListener('keyup', e => this.keys.delete(e.code));

      const logicalPoint = e => {
        const r = target.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) * W / r.width,
          y: (e.clientY - r.top) * H / r.height
        };
      };

      target.addEventListener('contextmenu', e => e.preventDefault());

      target.addEventListener('pointerdown', e => {
        e.preventDefault();
        audio.ensure();
        const p = logicalPoint(e);
        this.anyPressed = true;
        this.tapQueue = { x: p.x, y: p.y };
        this.pointerKind = e.pointerType || 'mouse';
        this.lastInputWasTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
        try { target.setPointerCapture(e.pointerId); } catch (_) { /* no-op */ }

        if (e.pointerType === 'mouse') {
          this.mouse.x = p.x;
          this.mouse.y = p.y;
          if (e.button === 0) this.mouse.down = true;
        } else if (p.x < W * 0.48) {
          // The left half is the movement thumb and nothing else. A second
          // finger over here used to fall through to the AIM stick, which then
          // steered the wheel from the wrong side of the screen.
          if (!this.leftTouch) this.leftTouch = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y };
        } else if (!this.rightTouch) {
          this.rightTouch = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y };
        } else if (!this.leftTouch) {
          this.leftTouch = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y };
        }
      }, { passive: false });

      target.addEventListener('pointermove', e => {
        e.preventDefault();
        const p = logicalPoint(e);
        if (e.pointerType === 'mouse') {
          this.mouse.x = p.x;
          this.mouse.y = p.y;
        }
        if (this.leftTouch && this.leftTouch.id === e.pointerId) {
          this.leftTouch.x = p.x;
          this.leftTouch.y = p.y;
          const dy = p.y - this.leftTouch.sy;
          if (dy < -42 && !this.leftJumpLatch) {
            this.jumpQueued = true;
            this.leftJumpLatch = true;
          }
          if (dy > -20) this.leftJumpLatch = false;
        }
        if (this.rightTouch && this.rightTouch.id === e.pointerId) {
          this.rightTouch.x = p.x;
          this.rightTouch.y = p.y;
        }
      }, { passive: false });

      const release = e => {
        e.preventDefault();
        // pointercancel reports button -1, not 0. Testing for 0 meant a
        // cancelled mouse pointer never cleared the flag and the wheel stayed
        // held down for the rest of the session.
        if (e.pointerType === 'mouse' && e.button <= 0) this.mouse.down = false;
        if (this.leftTouch && this.leftTouch.id === e.pointerId) {
          this.leftTouch = null;
          this.leftJumpLatch = false;
        }
        if (this.rightTouch && this.rightTouch.id === e.pointerId) this.rightTouch = null;
      };

      target.addEventListener('pointerup', release, { passive: false });
      target.addEventListener('pointercancel', release, { passive: false });
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.mouse.down = false;
        this.leftTouch = null;
        this.rightTouch = null;
      });
    }

    pollGamepad() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = [...pads].find(Boolean);
      this.pad = pad || null;
      if (!pad) return;
      const jump = !!(pad.buttons[0] && pad.buttons[0].pressed);
      if (jump && !this.gamepadJumpPrev) {
        this.jumpQueued = true;
        this.anyPressed = true;
      }
      this.gamepadJumpPrev = jump;

      const pause = !!(pad.buttons[9] && pad.buttons[9].pressed);
      if (pause && !this.gamepadPausePrev) this.pauseQueued = true;
      this.gamepadPausePrev = pause;
    }

    moveX() {
      let x = 0;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
      if (this.leftTouch) x += clamp((this.leftTouch.x - this.leftTouch.sx) / 72, -1, 1);
      if (this.pad && Math.abs(this.pad.axes[0] || 0) > 0.16) x += this.pad.axes[0];
      return clamp(x, -1, 1);
    }

    jumpHeld() {
      if (this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp')) return true;
      if (this.leftTouch && this.leftTouch.y - this.leftTouch.sy < -34) return true;
      return !!(this.pad && this.pad.buttons[0] && this.pad.buttons[0].pressed);
    }

    downHeld() {
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) return true;
      if (this.leftTouch && this.leftTouch.y - this.leftTouch.sy > 42) return true;
      return !!(this.pad && (this.pad.axes[1] || 0) > 0.5);
    }

    consumeJump() {
      const value = this.jumpQueued;
      this.jumpQueued = false;
      return value;
    }

    consumePause() {
      const value = this.pauseQueued;
      this.pauseQueued = false;
      return value;
    }

    consumeTap() {
      const value = this.tapQueue;
      this.tapQueue = null;
      return value;
    }

    consumeAny() {
      const value = this.anyPressed;
      this.anyPressed = false;
      return value;
    }

    keyPressed(code) {
      if (!this.pressed.has(code)) return false;
      this.pressed.delete(code);
      return true;
    }

    aim(player, camera) {
      const px = player.x;
      const py = player.y - PLAYER_H * 0.56;

      if (this.rightTouch) {
        const dx = this.rightTouch.x - this.rightTouch.sx;
        const dy = this.rightTouch.y - this.rightTouch.sy;
        const len = hypot(dx, dy);
        if (len < 3) return { active: true, dx: player.facing, dy: 0, mag: 0.02, angle: 0 };
        return {
          active: true,
          dx: dx / len,
          dy: dy / len,
          mag: clamp(len / 115, 0.02, 1),
          angle: Math.atan2(dy, dx)
        };
      }

      if (this.mouse.down) {
        const wx = this.mouse.x + camera.x;
        const wy = this.mouse.y + camera.y;
        const dx = wx - px;
        const dy = wy - py;
        const len = hypot(dx, dy) || 1;
        return {
          active: true,
          dx: dx / len,
          dy: dy / len,
          mag: clamp(len / MAX_CHAIN, 0.02, 1),
          angle: Math.atan2(dy, dx),
          worldX: wx,
          worldY: wy
        };
      }

      if (this.pad) {
        const dx = this.pad.axes[2] || 0;
        const dy = this.pad.axes[3] || 0;
        const len = hypot(dx, dy);
        // A right bumper or trigger counts as holding the wheel. Without it the
        // stick recentring for an instant let go of the ring you were hanging
        // from, so keeping a hook meant never letting the stick rest.
        const gripped = !!(this.pad.buttons[5] && this.pad.buttons[5].pressed) ||
                        !!(this.pad.buttons[7] && this.pad.buttons[7].pressed);
        if (len <= 0.18 && gripped) {
          return { active: true, dx: player.facing, dy: 0, mag: 0.4, angle: player.facing > 0 ? 0 : Math.PI };
        }
        if (len > 0.18) {
          return {
            active: true,
            dx: dx / len,
            dy: dy / len,
            mag: clamp((len - 0.18) / 0.82, 0.05, 1),
            angle: Math.atan2(dy, dx)
          };
        }
      }

      return { active: false, dx: player.facing, dy: 0, mag: 0, angle: 0 };
    }

    endFrame() {
      this.pressed.clear();
      this.anyPressed = false;
      this.tapQueue = null;
    }
  }

  const input = new Input(canvas);

  // ---------------------------------------------------------------------------
  // Procedural audio.
  // ---------------------------------------------------------------------------

  const audio = {
    ctx: null,
    master: null,
    humOsc: null,
    humGain: null,
    muted: false,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.42;
        this.master.connect(this.ctx.destination);

        const droneGain = this.ctx.createGain();
        droneGain.gain.value = 0.018;
        droneGain.connect(this.master);
        const drone = this.ctx.createOscillator();
        drone.type = 'sawtooth';
        drone.frequency.value = 43.65;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 170;
        lp.Q.value = 1.2;
        drone.connect(lp);
        lp.connect(droneGain);
        drone.start();

        const fifth = this.ctx.createOscillator();
        fifth.type = 'sine';
        fifth.frequency.value = 65.4;
        const fifthGain = this.ctx.createGain();
        fifthGain.gain.value = 0.008;
        fifth.connect(fifthGain);
        fifthGain.connect(this.master);
        fifth.start();

        this.humOsc = this.ctx.createOscillator();
        this.humOsc.type = 'triangle';
        this.humOsc.frequency.value = 90;
        this.humGain = this.ctx.createGain();
        this.humGain.gain.value = 0;
        const humFilter = this.ctx.createBiquadFilter();
        humFilter.type = 'bandpass';
        humFilter.frequency.value = 620;
        humFilter.Q.value = 2.8;
        this.humOsc.connect(humFilter);
        humFilter.connect(this.humGain);
        this.humGain.connect(this.master);
        this.humOsc.start();
      } catch (_) {
        this.ctx = null;
      }
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.ctx.currentTime, 0.03);
      }
    },

    tone(freq = 220, duration = 0.1, type = 'sine', volume = 0.08, slide = 0) {
      if (!this.ctx || !this.master || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), now);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },

    noise(duration = 0.08, volume = 0.08, cutoff = 1200) {
      if (!this.ctx || !this.master || this.muted) return;
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
    },

    hit(big = false) {
      this.noise(big ? 0.16 : 0.07, big ? 0.16 : 0.075, big ? 700 : 1300);
      this.tone(big ? 58 : 95, big ? 0.22 : 0.09, 'sawtooth', big ? 0.12 : 0.055, big ? -22 : -35);
    },

    kill() {
      this.noise(0.25, 0.18, 550);
      this.tone(72, 0.32, 'square', 0.09, -38);
    },

    jump() {
      this.tone(135, 0.11, 'triangle', 0.045, 85);
    },

    hurt() {
      this.noise(0.16, 0.13, 900);
      this.tone(88, 0.22, 'sawtooth', 0.09, -48);
    },

    seal() {
      this.noise(0.55, 0.22, 500);
      this.tone(49, 0.75, 'sawtooth', 0.12, 90);
    },

    update(yoyo, state) {
      if (!this.ctx || !this.humGain || !this.humOsc) return;
      const speed = hypot(yoyo.vx, yoyo.vy);
      const target = state === 'playing' && yoyo.active ? 0.014 + clamp(speed / 1500, 0, 1) * 0.045 : 0;
      this.humGain.gain.setTargetAtTime(this.muted ? 0 : target, this.ctx.currentTime, 0.045);
      this.humOsc.frequency.setTargetAtTime(80 + speed * 0.18 + yoyo.charge * 130, this.ctx.currentTime, 0.03);
    }
  };

  // ---------------------------------------------------------------------------
  // World geometry and spawn data.
  // ---------------------------------------------------------------------------

  const platforms = [];
  // Static masonry is bucketed by x once at boot so the collision queries read
  // the buckets instead of walking the whole cathedral.
  const SOLID_BUCKET = 1024;
  const solidBuckets = [];
  let solidBucketsBuilt = false;
  const hooks = [];
  const hazards = [];
  const seals = [];

  function platform(x, y, w, h = 40, oneWay = false, zone = 0) {
    platforms.push({ x, y, w, h, oneWay, zone });
  }

  function hook(x, y, zone = 0) {
    hooks.push({ x, y, r: 22, zone, pulse: Math.random() * TAU });
  }

  function hazard(x, y, w, h, type = 'spikes') {
    hazards.push({ x, y, w, h, type });
  }

  function makeMembrane(x, y, w, h, zone, bandCount = 17, bandHp = 30) {
    const bandH = h / bandCount;
    return {
      x, y, w, h, zone, bandH,
      alive: true,
      breached: false,
      breachFlash: 0,
      pulse: hash(x * 0.013) * TAU,
      bands: Array.from({ length: bandCount }, (_, i) => ({
        hp: bandHp + (i % 3) * 3,
        maxHp: bandHp + (i % 3) * 3,
        flash: 0,
        seed: hash(x * 0.019 + i * 8.173)
      }))
    };
  }

  function resetMembrane(membrane, destroyed = false) {
    for (const band of membrane.bands) {
      band.hp = destroyed ? 0 : band.maxHp;
      band.flash = 0;
    }
    membrane.alive = !destroyed;
    membrane.breached = destroyed;
    membrane.breachFlash = 0;
    invalidateMembraneSolids();
  }

  // Band geometry is fixed for the life of the membrane, so build each rect once
  // and hand the same object back. handleYoyoCombat asks for all 216 of them
  // every simulation step; allocating them fresh was pure garbage.
  function membraneBandRect(membrane, index) {
    let cache = membrane.bandRects;
    if (!cache) cache = membrane.bandRects = [];
    let rect = cache[index];
    if (rect) return rect;
    const inset = 3 + Math.sin(index * 1.71) * 1.8;
    rect = cache[index] = {
      x: membrane.x + inset,
      y: membrane.y + index * membrane.bandH - 1,
      w: membrane.w - inset * 2,
      h: membrane.bandH + 2,
      oneWay: false,
      membrane,
      bandIndex: index
    };
    return rect;
  }

  let membraneSolidCache = [];
  let membraneSolidsDirty = true;

  function invalidateMembraneSolids() {
    membraneSolidsDirty = true;
  }

  function getMembraneSolids() {
    if (!membraneSolidsDirty) return membraneSolidCache;
    const list = [];
    for (const membrane of seals) {
      if (!membrane.alive) continue;
      for (let i = 0; i < membrane.bands.length; i++) {
        if (membrane.bands[i].hp > 0) list.push(membraneBandRect(membrane, i));
      }
    }
    membraneSolidCache = list;
    membraneSolidsDirty = false;
    return list;
  }

  // Whether a hole is actually a doorway.
  //
  // The old test called a curtain breached at four dead bands wherever they
  // happened to be. Four bands is 104px of hole, which is enough — but only if
  // the hole sits on the floor. Cut high and the game announced GOREWEAVE
  // BREACHED while a live band still crossed the doorway, and you walked into
  // a few pixels of curtain with nothing telling you why you had stopped. This
  // measures the doorway instead of counting bands: the strip a body has to
  // pass through, from the floor on either side up by her own height, has to be
  // clear of live band.
  function membranePassable(membrane) {
    const leftFloor = groundYNear(membrane.x - 44, 760);
    const rightFloor = groundYNear(membrane.x + membrane.w + 44, 760);
    let floorLo = 760;
    let floorHi = 760;
    if (leftFloor != null && rightFloor != null) {
      floorLo = Math.min(leftFloor, rightFloor);
      floorHi = Math.max(leftFloor, rightFloor);
    } else if (leftFloor != null) {
      floorLo = floorHi = leftFloor;
    } else if (rightFloor != null) {
      floorLo = floorHi = rightFloor;
    }
    const top = floorLo - PLAYER_H - 6;
    for (let i = 0; i < membrane.bands.length; i++) {
      if (membrane.bands[i].hp <= 0) continue;
      const r = membraneBandRect(membrane, i);
      if (r.y + r.h > top && r.y < floorHi) return false;
    }
    return true;
  }

  const AREAS = [
    { name: 'THE HANGING NAVE', x0: 0, x1: 3400, bg: 0, pal: ['#05040a', '#210813', '#650c20'] },
    { name: 'THE BELL FOUNDRY', x0: 3400, x1: 6400, bg: 1, pal: ['#080305', '#321008', '#8b2b0a'] },
    { name: 'THE OSSUARY SPIRE', x0: 6400, x1: 8550, bg: 2, pal: ['#03040a', '#130918', '#3b1020'] },
    { name: 'THE RAIN CLOISTER', x0: 8550, x1: 11850, bg: 4, pal: ['#04060c', '#0c1a28', '#1a3a52'] },
    { name: 'THE BLOOD CRYPT', x0: 11850, x1: 15150, bg: 3, pal: ['#030204', '#19050a', '#680b19'] },
    { name: 'THE GLASSWORKS', x0: 15150, x1: 18450, bg: 5, pal: ['#04080c', '#0a2830', '#1a5a48'] },
    { name: 'THE IRON CLOISTER', x0: 18450, x1: 21750, bg: 7, pal: ['#080305', '#2a0c08', '#6b1a0a'] },
    { name: 'THE MOON WELL', x0: 21750, x1: 25050, bg: 2, pal: ['#03040a', '#101828', '#3a4868'] },
    { name: 'THE RED LIBRARY', x0: 25050, x1: 28350, bg: 6, pal: ['#080206', '#2a0810', '#5a1020'] },
    { name: 'THE CHOIR LOFT', x0: 28350, x1: 31650, bg: 0, pal: ['#05040a', '#210813', '#4a1028'] },
    { name: 'THE IRON RIBS', x0: 31650, x1: 34950, bg: 7, pal: ['#080204', '#220808', '#5a1010'] },
    { name: 'THE THRONE OF THE RED ABBOT', x0: 34950, x1: 38400, bg: 3, pal: ['#030204', '#19050a', '#680b19'] }
  ];

  let spawnTemplates = [];

  function areaIndexAt(x) {
    for (let i = AREAS.length - 1; i >= 0; i--) if (x >= AREAS[i].x0) return i;
    return 0;
  }

  function bossGateRect() {
    const cx = AREAS[AREAS.length - 1].x0 + 8;
    return { x: cx - 21, y: 250, w: 42, h: 510, oneWay: false, bossGate: true };
  }

  // Zone I — The Hanging Nave. The three wide voids teach the real swing.
  platform(-200, 760, 1080, 220, false, 0);
  platform(1120, 760, 650, 220, false, 0);
  platform(2020, 760, 650, 220, false, 0);
  platform(2930, 760, 570, 220, false, 0);
  platform(430, 610, 320, 34, true, 0);
  platform(1180, 555, 250, 34, true, 0);
  platform(1825, 465, 190, 34, true, 0);
  platform(2080, 590, 300, 34, true, 0);
  platform(2440, 445, 280, 34, true, 0);
  platform(2980, 570, 310, 34, true, 0);
  hook(1000, 425, 0);
  hook(1885, 420, 0);
  hook(2795, 420, 0);
  hook(3240, 395, 0);

  // Zone II — The Bell Foundry.
  platform(3450, 760, 520, 220, false, 1);
  platform(4200, 700, 520, 280, false, 1);
  platform(4920, 760, 670, 220, false, 1);
  platform(5780, 760, 640, 220, false, 1);
  platform(3600, 560, 270, 34, true, 1);
  platform(4270, 480, 330, 34, true, 1);
  platform(4740, 370, 250, 34, true, 1);
  platform(5120, 560, 300, 34, true, 1);
  platform(5520, 425, 250, 34, true, 1);
  platform(5910, 560, 270, 34, true, 1);
  hook(4075, 435, 1);
  hook(4825, 335, 1);
  hook(5670, 390, 1);
  hook(6320, 405, 1);
  hazard(3650, 736, 180, 24, 'spikes');
  hazard(5180, 736, 150, 24, 'spikes');

  // Zone III — The Ossuary Spire.
  platform(6420, 760, 560, 220, false, 2);
  platform(7130, 700, 500, 280, false, 2);
  platform(7800, 760, 820, 220, false, 2);
  platform(6570, 555, 280, 34, true, 2);
  platform(7010, 410, 270, 34, true, 2);
  platform(7440, 520, 260, 34, true, 2);
  platform(7880, 420, 270, 34, true, 2);
  platform(8260, 560, 250, 34, true, 2);
  hook(7040, 360, 2);
  hook(7700, 365, 2);
  hook(8390, 405, 2);

  seals.push(makeMembrane(1608, 300, 112, 460, 0, 18, 27));
  seals.push(makeMembrane(6184, 290, 112, 470, 1, 18, 33));
  seals.push(makeMembrane(8118, 300, 108, 460, 2, 18, 36));

  spawnTemplates.push(
    { type: 'crawler', x: 610, y: 760 },
    { type: 'bat', x: 1000, y: 390 },
    { type: 'knight', x: 1320, y: 760 },
    { type: 'crawler', x: 2040, y: 760 },
    { type: 'bat', x: 2220, y: 420 },
    { type: 'knight', x: 2460, y: 760 },
    { type: 'censer', x: 2990, y: 390 },
    { type: 'crawler', x: 3580, y: 760 },
    { type: 'knight', x: 3860, y: 760 },
    { type: 'bat', x: 4360, y: 370 },
    { type: 'censer', x: 4690, y: 360 },
    { type: 'knight', x: 5150, y: 760 },
    { type: 'crawler', x: 5480, y: 760 },
    { type: 'executioner', x: 6010, y: 760 },
    { type: 'bat', x: 6600, y: 390 },
    { type: 'knight', x: 6780, y: 760 },
    { type: 'crawler', x: 7240, y: 700 },
    { type: 'censer', x: 7580, y: 350 },
    { type: 'knight', x: 8060, y: 760 },
    { type: 'bat', x: 8350, y: 390 }
  );

  // The walkable top nearest a height you had in mind. Asking simply for the
  // highest slab over a column is the wrong question once a district has a
  // vault above the road and an undercroft beneath it.
  function groundYNear(px, preferY) {
    let best = null;
    let bestGap = Infinity;
    for (const p of platforms) {
      if (p.oneWay) continue;
      if (px < p.x + 6 || px > p.x + p.w - 6) continue;
      const gap = Math.abs(p.y - preferY);
      if (gap < bestGap) { bestGap = gap; best = p.y; }
    }
    return best;
  }

  // Reliquary caches. The reason to leave the road.
  const caches = [];
  function cache(x, y, zone, xp) {
    caches.push({ x, y, zone, xp, taken: false, pulse: hash(x * 0.021) * TAU });
  }

  // A district is four heights, not one corridor.
  //
  //   THE VAULT      y~300   solid ledges you can only reach off a high ring,
  //                          and some of those rings are out of chain range
  //                          until THE CHAIN says otherwise
  //   THE GALLERY    y~545   one-way ledges; a parallel route you can jump to
  //                          and drop off wherever you like
  //   THE ROAD       y=760   the floor, with the same lethal gaps as before,
  //                          except one slab is a grate you can drop through
  //   THE UNDERCROFT y=960   under the road, its own gaps, its own cache, and
  //                          a stair of ledges back up
  function buildWing(x0, width, zone, kind) {
    const gaps = 3;
    const gapW = 210 + (kind % 3) * 18;
    const usable = width - 100;
    const slabW = (usable - gaps * gapW) / (gaps + 1);
    const roster = ['crawler', 'knight', 'bat', 'censer'];
    const grateSlab = 1 + (kind % 2);     // which road slab is a grate
    const lastDistrict = zone >= AREAS.length - 1;

    const slabX = [];
    let x = x0 + 16;
    for (let s = 0; s <= gaps; s++) {
      const floorY = 760 - ((s + kind) % 4 === 2 ? 48 : 0);
      slabX.push({ x, floorY });

      if (s === grateSlab && !lastDistrict) {
        // A grate: stand on it, hold down, fall into the undercroft.
        platform(x, floorY, slabW, 30, true, zone);
      } else {
        platform(x, floorY, slabW, 70, false, zone);
      }

      const type = roster[(s + kind) % 4];
      const spawnY = (type === 'bat' || type === 'censer') ? floorY - 118 : floorY;
      spawnTemplates.push({ type, x: x + slabW * 0.38, y: spawnY });
      if (s % 2 === 1) spawnTemplates.push({ type: 'bat', x: x + slabW * 0.72, y: 360 + (s % 2) * 30 });
      if ((s + kind) % 3 === 0 && s !== grateSlab) hazard(x + 40, floorY - 24, 130, 24, 'spikes');

      // The gallery: reachable with a jump, and it runs the other way round the
      // gaps so taking it is a real choice rather than a shortcut.
      platform(x + 30, 545 - (s % 2) * 62, 210 + (s % 2) * 30, 30, true, zone);
      if (s < gaps) platform(x + slabW + gapW * 0.18, 600 - (s % 2) * 40, gapW * 0.64, 26, true, zone);

      if (s < gaps) hook(x + slabW + gapW * 0.5, 345 + (s % 2) * 48, zone);
      x += slabW + gapW;
    }
    const roadEnd = x - gapW;

    // The vault. Two solid ledges high over the district, each under its own
    // ring. The rings sit out of reach of the road on purpose — you get up
    // there from the gallery, or with more chain.
    const vaultA = x0 + width * 0.30;
    const vaultB = x0 + width * 0.66;
    platform(vaultA - 150, 300, 300, 26, false, zone);
    platform(vaultB - 130, 336, 260, 26, false, zone);
    hook(vaultA, 204, zone);
    hook(vaultB, 236, zone);
    hook(x0 + width * 0.48, 328, zone);
    spawnTemplates.push({ type: 'bat', x: vaultA + 60, y: 236 });
    spawnTemplates.push({ type: 'censer', x: vaultB - 40, y: 250 });
    cache(vaultA + 20, 300, zone, 190 + zone * 42);

    // The undercroft.
    if (!lastDistrict) {
      const g = slabX[grateSlab];
      // The landing floor spans the whole grate and then some. Dropping in is
      // a decision, never a death — the hole in the road has to be somewhere
      // you can commit to without reading the level first.
      platform(g.x - 60, 960, slabW + 120, 120, false, zone);
      spawnTemplates.push({ type: 'crawler', x: g.x + slabW * 0.6, y: 960 });

      // One real jump inside the crypt, and the reliquary is on the far side of
      // it. The gap is the price of the thing, and the spikes are the guard.
      //
      // 120px, not 170. A jump you HOLD carries 260px, but a jump you TAP —
      // which is most of them — releases early into the 1.85x cut-off gravity
      // and carries 166. At 170 the crypt was demanding a perfect held jump
      // with four pixels of margin, and it killed a competent run eight times
      // out of eight. This clears on a tap with room to spare.
      const farX = g.x + slabW + 180;
      platform(farX, 960, 340, 120, false, zone);
      hazard(farX + 24, 936, 104, 24, 'spikes');
      cache(farX + 250, 960, zone, 150 + zone * 34);
      spawnTemplates.push({ type: 'bat', x: farX + 60, y: 872 });

      // The stair out stands under the LEFT end of the grate, behind you as you
      // land. Put it between the drop and the reliquary and every instinct to
      // run forward carries you up and out of the room instead of across to the
      // thing you came down for.
      const stairX = g.x + slabW * 0.06;
      platform(stairX, 892, 120, 22, true, zone);
      platform(stairX + 96, 846, 120, 22, true, zone);
      platform(stairX + 24, 800, 120, 22, true, zone);
    }

    if (kind === 4 || kind === 6 || kind === 8 || kind === 10) {
      const ex = x0 + width * 0.7;
      spawnTemplates.push({ type: 'executioner', x: ex, y: groundYNear(ex, 760) || 760 });
    }
    if (zone < AREAS.length - 1) {
      seals.push(makeMembrane(x0 + width - 96, 290, 112, 470, zone, 18, 28 + zone * 2));
    }
    return roadEnd;
  }

  for (let i = 3; i < AREAS.length; i++) {
    const a = AREAS[i];
    buildWing(a.x0, a.x1 - a.x0, i, i);
  }

  // The three hand-authored districts get the same shape: a vault over the
  // nave, a crypt under the foundry, and something worth the trip in each.
  platform(1180, 300, 300, 26, false, 0);
  hook(1330, 168, 0);
  cache(1330, 300, 0, 150);
  platform(2380, 322, 260, 26, false, 0);
  hook(2510, 196, 0);
  cache(2510, 322, 0, 170);
  spawnTemplates.push({ type: 'bat', x: 1400, y: 232 });

  platform(4300, 300, 300, 26, false, 1);
  hook(4450, 176, 1);
  cache(4450, 300, 1, 210);
  spawnTemplates.push({ type: 'censer', x: 4430, y: 244 });

  platform(7300, 316, 280, 26, false, 2);
  hook(7440, 188, 2);
  cache(7440, 316, 2, 230);
  spawnTemplates.push({ type: 'bat', x: 7500, y: 240 });

  spawnTemplates.push({ type: 'boss', x: 36880, y: groundYNear(36880, 760) || 760 });

  function checkpointBlocked(px, py) {
    const rect = { x: px - PLAYER_W / 2, y: py - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
    for (const hz of hazards) if (rectsOverlap(rect, hz)) return true;
    return false;
  }

  const AREA_CHECKPOINTS = AREAS.map(area => {
    let x = area.x0 + 90;
    const limit = Math.min(area.x0 + 720, area.x1 - 40);
    for (let i = 0; i < 80; i++) {
      const y = groundYNear(x, 760);
      if (y != null && Math.abs(y - 760) < 90 && !checkpointBlocked(x, y)) return { x, y };
      x += 12;
      if (x > limit) break;
    }
    const y = groundYNear(area.x0 + 90, 760);
    return { x: area.x0 + 90, y: y == null ? 760 : y };
  });

  // ---------------------------------------------------------------------------
  // Entity state.
  // ---------------------------------------------------------------------------

  // The relics. Six lines, each one changing how she plays rather than only what
  // her numbers say. Levelling hands over a relic to spend; it never spends
  // itself.
  const RELICS = [
    { key: 'vessel',  name: 'THE VESSEL',   max: 5, blurb: 'More of her left to spend.',
      rank: r => `+${r * 16} life` },
    { key: 'edge',    name: 'THE EDGE',     max: 5, blurb: 'The wheel bites deeper.',
      rank: r => `+${r * 10}% wheel damage` },
    { key: 'chain',   name: 'THE CHAIN',    max: 4, blurb: 'Longer reach, wider arc, rings you could not touch.',
      rank: r => `+${r * 38}px chain` },
    { key: 'tendon',  name: 'THE TENDON',   max: 4, blurb: 'The arc builds faster and carries further.',
      rank: r => `+${r * 14}% swing` },
    { key: 'carrion', name: 'THE CARRION',  max: 4, blurb: 'What you kill, you keep a little of.',
      rank: r => `+${r * 3} life on kill` },
    { key: 'spite',   name: 'THE SPITE',    max: 3, blurb: 'Letting go throws you harder.',
      rank: r => `+${r * 45}% release fling` }
  ];

  const player = {
    x: 250,
    y: 760,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    coyote: 0.1,
    jumpBuffer: 0,
    wallDir: 0,
    health: 100,
    maxHealth: 100,
    invuln: 0,
    hurtFlash: 0,
    runTime: 0,
    animTime: 0,
    animState: 'idle',
    stepTimer: 0,
    dead: false,
    checkpointX: 250,
    checkpointY: 760,
    dropThrough: 0,
    grapple: null,
    killStreak: 0,
    streakTimer: 0,
    level: 1,
    xp: 0,
    power: 1,
    relicPoints: 0,
    relics: { vessel: 0, edge: 0, chain: 0, tendon: 0, carrion: 0, spite: 0 },
    visited: [0],
    levelFlash: 0,
    // Animation-only state: a landing compresses her, a takeoff stretches her,
    // and idle breathes. None of it touches the simulation.
    squash: 0,
    airTime: 0,
    lastVy: 0
  };

  const yoyo = {
    x: player.x + 42,
    y: player.y - 48,
    vx: 0,
    vy: 0,
    r: 25,
    angle: 0,
    active: false,
    charge: 0,
    lastAimAngle: null,
    angularInput: 0,
    latched: null,
    ropeLength: 220,
    ropeTarget: 220,
    latchCooldown: 0,
    holdGrace: 0,
    blockedHook: null,
    trail: [],
    hitPulse: 0,
    targetX: player.x + 42,
    targetY: player.y - 48,
    prevX: player.x + 42,
    prevY: player.y - 48
  };

  let enemies = [];
  let projectiles = [];
  let particles = [];
  let decals = [];

  function enemyStats(type) {
    switch (type) {
      case 'crawler': return { w: 68, h: 44, hp: 56, flying: false };
      case 'bat': return { w: 64, h: 48, hp: 40, flying: true };
      case 'knight': return { w: 62, h: 102, hp: 165, flying: false };
      case 'censer': return { w: 58, h: 74, hp: 92, flying: true };
      case 'executioner': return { w: 88, h: 132, hp: 380, flying: false };
      case 'boss': return { w: 132, h: 184, hp: 1350, flying: false };
      default: return { w: 50, h: 70, hp: 50, flying: false };
    }
  }

  function createEnemy(t) {
    const stats = enemyStats(t.type);
    const areaI = areaIndexAt(t.x);
    const scale = 1 + areaI * 0.2;
    const xpBase = { crawler: 22, bat: 16, knight: 48, censer: 36, executioner: 140, boss: 1200 }[t.type] || 12;
    const hp = Math.floor(stats.hp * scale);
    return {
      type: t.type,
      x: t.x,
      y: t.y,
      baseX: t.x,
      baseY: t.y,
      vx: 0,
      vy: 0,
      w: stats.w,
      h: stats.h,
      hp,
      maxHp: hp,
      xp: Math.floor(xpBase * (1 + areaI * 0.16)),
      flying: stats.flying,
      alive: true,
      deadTimer: 0,
      facing: -1,
      state: 'idle',
      stateT: 0,
      cooldown: 0.5 + Math.random(),
      attackHit: false,
      yoyoCooldown: 0,
      chainCooldown: 0,
      flash: 0,
      shield: t.type === 'knight' ? 90 : 0,
      maxShield: t.type === 'knight' ? 90 : 0,
      poise: 0,
      phase: 1,
      seed: Math.random() * 1000,
      groundY: t.y,
      bossAwake: false,
      armorStage: 0,
      patrolDir: hash(t.x * 0.037 + t.y * 0.011) > 0.5 ? 1 : -1,
      hitWall: false,
      grounded: !stats.flying
    };
  }

  function resetEnemies() {
    enemies = spawnTemplates.map(createEnemy);
    for (const e of enemies) {
      if (e.type !== 'boss' && e.x < player.checkpointX - 160) e.alive = false;
    }
  }

  function syncBossState() {
    const boss = enemies.find(e => e.type === 'boss');
    if (!boss) return;
    if (game.completed) {
      boss.alive = false;
      boss.hp = 0;
      boss.deadTimer = 0;
      boss.bossAwake = false;
      game.bossActive = false;
      game.bossDeadTimer = 0;
      return;
    }
    const atFinale = areaIndexAt(player.checkpointX) >= AREAS.length - 1;
    game.bossActive = atFinale;
    if (atFinale && boss.alive) boss.bossAwake = true;
  }

  resetEnemies();

  function enemyRect(e) {
    return e.flying
      ? { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h }
      : { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
  }

  function playerRect() {
    return { x: player.x - PLAYER_W / 2, y: player.y - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
  }

  function playerCenter() {
    return { x: player.x, y: player.y - PLAYER_H * 0.56 };
  }

  function solidRects() {
    const solids = platforms;
    return solids;
  }

  // ---------------------------------------------------------------------------
  // Particles, decals, impact language.
  // ---------------------------------------------------------------------------

  function addParticle(p) {
    if (particles.length >= PARTICLE_CAP) particles.splice(0, Math.max(1, particles.length - PARTICLE_CAP + 1));
    particles.push({
      x: p.x,
      y: p.y,
      vx: p.vx || 0,
      vy: p.vy || 0,
      life: p.life || 0.5,
      maxLife: p.life || 0.5,
      size: p.size || 4,
      color: p.color || '#d42038',
      gravity: p.gravity === undefined ? 800 : p.gravity,
      drag: p.drag === undefined ? 0.98 : p.drag,
      type: p.type || 'dot',
      rot: p.rot || Math.random() * TAU,
      vr: p.vr || (Math.random() - 0.5) * 10,
      glow: p.glow || 0
    });
  }

  function bloodBurst(x, y, count = 12, force = 420, dirX = 0, dirY = -0.25) {
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(dirY, dirX || (Math.random() - 0.5)) + (Math.random() - 0.5) * 2.5;
      const speed = force * (0.25 + Math.random() * 0.9);
      addParticle({
        x, y,
        vx: Math.cos(a) * speed + dirX * 80,
        vy: Math.sin(a) * speed + dirY * 80,
        life: 0.35 + Math.random() * 0.85,
        size: 2 + Math.random() * 7,
        color: choose(['#ff2445', '#bb0d25', '#6d0716', '#2a0208']),
        gravity: 1150,
        drag: 0.992,
        type: Math.random() < 0.3 ? 'streak' : 'blood',
        glow: Math.random() < 0.25 ? 8 : 0
      });
    }
    if (Math.random() < 0.65) {
      if (decals.length >= (COARSE_POINTER ? 38 : 90)) decals.shift();
      decals.push({ x, y: 754, r: 16 + Math.random() * 35, a: 0.34, life: 18 });
    }
  }

  function sparkBurst(x, y, count = 8, force = 500, color = '#ffb15c') {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const speed = force * (0.25 + Math.random());
      addParticle({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.12 + Math.random() * 0.32,
        size: 1 + Math.random() * 2.5,
        color,
        gravity: 680,
        drag: 0.985,
        type: 'spark',
        glow: 12
      });
    }
  }

  function stoneBurst(x, y, count = 10, force = 360) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const speed = force * (0.2 + Math.random());
      addParticle({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 100,
        life: 0.5 + Math.random() * 0.8,
        size: 3 + Math.random() * 8,
        color: choose(['#2a2024', '#4b3438', '#170f13']),
        gravity: 1250,
        type: 'debris'
      });
    }
  }

  function smokePuff(x, y, count = 5, color = '#24131a') {
    for (let i = 0; i < count; i++) {
      addParticle({
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 18,
        vx: (Math.random() - 0.5) * 55,
        vy: -35 - Math.random() * 90,
        life: 0.55 + Math.random() * 0.8,
        size: 12 + Math.random() * 22,
        color,
        gravity: -10,
        drag: 0.985,
        type: 'smoke'
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === 'blood' && p.y > 754 && p.vy > 0) {
        p.y = 754;
        p.vy *= -0.12;
        p.vx *= 0.45;
        p.life *= 0.45;
      }
    }
    for (let i = decals.length - 1; i >= 0; i--) {
      decals[i].life -= dt;
      if (decals[i].life <= 0) decals.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Global game state.
  // ---------------------------------------------------------------------------

  const game = {
    state: 'title',
    paused: false,
    time: 0,
    realTime: 0,
    hitStop: 0,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    flash: 0,
    redFlash: 0,
    titleFade: 1,
    helpFade: 1,
    zone: 0,
    zoneTitle: 'THE HANGING NAVE',
    zoneTitleTimer: 0,
    bossActive: false,
    completed: false,
    bossDeadTimer: 0,
    deathTimer: 0,
    victoryTimer: 0,
    kills: 0,
    maxCombo: 0,
    relicsOpen: false,
    relicCursor: 0,
    relicNudge: 0,
    camera: { x: 0, y: 0, targetX: 0, targetY: 0, look: 0 },
    fps: 60,
    accumulator: 0,
    lastFrame: performance.now()
  };

  function setZone(z) {
    if (z === game.zone) return;
    game.zone = z;
    game.zoneTitle = (AREAS[z] && AREAS[z].name) || '';
    game.zoneTitleTimer = 3.2;
    audio.tone(55 + z * 12, 0.7, 'sawtooth', 0.055, 32);
  }

  function xpToNext(level) {
    return Math.floor(75 * Math.pow(level, 1.32));
  }

  function applyPower() {
    const r = player.relics;
    player.power = 1 + (player.level - 1) * 0.055 + r.edge * 0.10;
    player.maxHealth = 100 + (player.level - 1) * 8 + r.vessel * 16;
    player.health = Math.min(player.health, player.maxHealth);
    MAX_CHAIN = BASE_CHAIN + r.chain * 38;
    SWING_PUMP = BASE_PUMP * (1 + r.tendon * 0.14);
    MAX_SWING = BASE_SWING * (1 + r.tendon * 0.14);
  }

  function relicDef(key) {
    for (let i = 0; i < RELICS.length; i++) if (RELICS[i].key === key) return RELICS[i];
    return null;
  }

  function spendRelic(key) {
    const def = relicDef(key);
    if (!def || player.relicPoints <= 0) return false;
    if (player.relics[key] >= def.max) return false;
    player.relics[key]++;
    player.relicPoints--;
    applyPower();
    if (key === 'vessel') player.health = Math.min(player.maxHealth, player.health + 16);
    addShake(6);
    game.flash = Math.max(game.flash, 0.5);
    audio.tone(196, 0.28, 'triangle', 0.09, 120);
    audio.tone(392, 0.4, 'sine', 0.05, 60);
    saveGame();
    return true;
  }

  function gainXP(amount) {
    if (!amount || amount <= 0) return;
    player.xp += Math.floor(amount);
    let leveled = false;
    while (player.level < 50 && player.xp >= xpToNext(player.level)) {
      player.xp -= xpToNext(player.level);
      player.level++;
      player.relicPoints++;
      applyPower();
      player.health = Math.min(player.maxHealth, player.health + 16 + player.level);
      leveled = true;
    }
    if (leveled) {
      player.levelFlash = 2.4;
      game.relicNudge = 3.2;
      game.zoneTitle = 'LEVEL ' + player.level + '  \u2014  A RELIC WAITS';
      game.zoneTitleTimer = 1.9;
      audio.tone(110, 0.35, 'triangle', 0.09, 90);
      audio.tone(220, 0.5, 'sine', 0.06, 50);
    }
    saveGame();
  }

  const SAVE_KEY = 'gorethread-cathedral-v1';

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        level: player.level,
        xp: player.xp,
        relicPoints: player.relicPoints,
        relics: player.relics,
        checkpointX: player.checkpointX,
        checkpointY: player.checkpointY,
        kills: game.kills,
        maxCombo: game.maxCombo,
        visited: player.visited,
        completed: !!game.completed,
        seals: seals.map(m => m.bands.map(b => b.hp)),
        caches: caches.map(c => (c.taken ? 1 : 0))
      }));
    } catch (_) { /* private mode */ }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s || !s.checkpointX) return false;
      player.level = clamp(s.level || 1, 1, 50);
      player.xp = Math.max(0, s.xp || 0);
      if (s.relics) {
        for (const def of RELICS) player.relics[def.key] = clamp(s.relics[def.key] | 0, 0, def.max);
      }
      // Saves from before the relics existed banked their levels silently; give
      // those points back rather than eating them.
      const spent = RELICS.reduce((n, def) => n + player.relics[def.key], 0);
      player.relicPoints = s.relicPoints != null
        ? Math.max(0, s.relicPoints | 0)
        : Math.max(0, player.level - 1 - spent);
      applyPower();
      player.checkpointX = s.checkpointX;
      player.checkpointY = s.checkpointY || 760;
      player.visited = Array.isArray(s.visited) ? s.visited : [0];
      game.kills = s.kills || 0;
      game.maxCombo = s.maxCombo || 0;
      if (Array.isArray(s.seals)) {
        for (let i = 0; i < seals.length && i < s.seals.length; i++) {
          const bandHp = s.seals[i];
          if (!Array.isArray(bandHp)) continue;
          for (let b = 0; b < seals[i].bands.length && b < bandHp.length; b++) {
            seals[i].bands[b].hp = bandHp[b];
          }
          seals[i].alive = seals[i].bands.some(band => band.hp > 0);
          seals[i].breached = membranePassable(seals[i]);
        }
      }
      if (Array.isArray(s.caches)) {
        for (let i = 0; i < caches.length && i < s.caches.length; i++) caches[i].taken = !!s.caches[i];
      }
      game.zone = areaIndexAt(player.checkpointX);
      game.zoneTitle = AREAS[game.zone].name;
      game.completed = !!s.completed;
      game.bossActive = !game.completed && game.zone >= AREAS.length - 1;
      invalidateMembraneSolids();
      return true;
    } catch (_) {
      return false;
    }
  }

  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (_) { return false; }
  }

  function addShake(amount) {
    game.shake = Math.min(30, game.shake + amount);
  }

  function hitStop(seconds, flash = 0.08) {
    game.hitStop = Math.max(game.hitStop, seconds);
    game.flash = Math.max(game.flash, flash);
  }

  function startGame() {
    if (game.state !== 'title') return;
    if (hasSave()) {
      loadGame();
      restartFromCheckpoint();
    }
    if (game.completed) {
      game.state = 'victory';
      game.victoryTimer = 1.2;
      game.titleFade = 0;
    } else {
      game.state = 'playing';
      game.titleFade = 1;
      game.zoneTitleTimer = 3.2;
    }
    audio.ensure();
    if (input.lastInputWasTouch && document.fullscreenElement == null && canvas.parentElement.requestFullscreen) {
      canvas.parentElement.requestFullscreen().catch(() => {});
    }
  }

  function restartFromCheckpoint() {
    player.x = player.checkpointX;
    player.y = player.checkpointY;
    player.vx = 0;
    player.vy = 0;
    player.health = player.maxHealth;
    player.invuln = 1.1;
    player.dead = false;
    player.grapple = null;
    player.dropThrough = 0;
    player.killStreak = 0;
    player.streakTimer = 0;
    player.jumpBuffer = 0;
    player.hurtFlash = 0;
    // A jump pressed during the death fall used to sit in the queue with
    // nothing consuming it, and came straight back out on the respawn's first
    // frame. Same for a pause tapped while dead.
    input.jumpQueued = false;
    input.pauseQueued = false;
    input.pressed.clear();
    yoyo.x = player.x + 35;
    yoyo.y = player.y - 48;
    yoyo.prevX = yoyo.x;
    yoyo.prevY = yoyo.y;
    yoyo.vx = 0;
    yoyo.vy = 0;
    yoyo.latched = null;
    yoyo.latchCooldown = 0;
    yoyo.blockedHook = null;
    yoyo.charge = 0;
    yoyo.ropeLength = 220;
    yoyo.ropeTarget = 220;
    yoyo.trail.length = 0;
    projectiles.length = 0;
    particles.length = 0;
    game.state = 'playing';
    game.paused = false;
    game.deathTimer = 0;
    game.bossDeadTimer = 0;
    game.camera.look = 0;
    game.camera.x = clamp(player.x - 420, 0, WORLD_W - W);
    game.camera.targetX = game.camera.x;
    game.camera.y = clamp(player.y - H * 0.70, 0, 210);
    game.camera.targetY = game.camera.y;

    // Cuts persist through death. Repeating the same gore curtain because the
    // next jump killed you was punishment without learning. Curtains behind a
    // reached checkpoint are forced fully open; current-zone wounds stay as cut.
    for (const membrane of seals) {
      if (player.checkpointX > membrane.x + 140) resetMembrane(membrane, true);
    }
    resetEnemies();
    syncBossState();
  }

  function resetRelics() {
    for (const def of RELICS) player.relics[def.key] = 0;
    player.relicPoints = 0;
    game.relicsOpen = false;
    game.relicCursor = 0;
  }

  function restartFullRun() {
    player.checkpointX = 250;
    player.checkpointY = 760;
    game.kills = 0;
    game.maxCombo = 0;
    game.zone = 0;
    game.zoneTitle = AREAS[0].name;
    game.zoneTitleTimer = 3.2;
    game.bossActive = false;
    game.completed = false;
    game.bossDeadTimer = 0;
    game.victoryTimer = 0;
    game.time = 0;
    game.helpFade = 1;
    player.level = 1;
    player.xp = 0;
    player.visited = [0];
    for (const c of caches) c.taken = false;
    resetRelics();
    applyPower();
    player.health = player.maxHealth;
    for (const membrane of seals) resetMembrane(membrane, false);
    try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* ignore */ }
    restartFromCheckpoint();
  }

  function killPlayer() {
    if (player.dead || game.state !== 'playing') return;
    player.dead = true;
    player.health = 0;
    player.vx = 0;
    player.vy = -240;
    game.state = 'dead';
    game.deathTimer = 2.1;
    hitStop(0.12, 0.25);
    addShake(22);
    bloodBurst(player.x, player.y - 40, 28, 520, 0, -0.4);
    audio.kill();
  }

  // ---------------------------------------------------------------------------
  // Physics helpers.
  // ---------------------------------------------------------------------------

  // Static masonry never moves, so bucket it by x once and look up the few
  // buckets a query actually spans. The old version walked every platform and
  // every live goreweave band on every call — and the rope solver alone calls
  // this hundreds of times a second — which is several million rectangle tests
  // per second for a world that is the same shape it was at boot.
  function buildSolidBuckets() {
    solidBuckets.length = 0;
    const count = Math.ceil(WORLD_W / SOLID_BUCKET) + 2;
    for (let i = 0; i < count; i++) solidBuckets.push([]);
    for (const p of platforms) {
      const a = Math.max(0, Math.floor(p.x / SOLID_BUCKET));
      const b = Math.min(count - 1, Math.floor((p.x + p.w) / SOLID_BUCKET));
      for (let i = a; i <= b; i++) solidBuckets[i].push(p);
    }
    solidBucketsBuilt = true;
  }

  // One shared scratch for throwaway queries, plus dedicated buffers for the
  // callers that keep the result alive across a whole collision pass.
  const solidScratch = [];
  const playerSolids = [];
  const enemySolids = [];
  const yoyoSolids = [];

  function getDynamicSolids(aroundX, margin = 2800, out) {
    if (!solidBucketsBuilt) buildSolidBuckets();
    const list = out || solidScratch;
    list.length = 0;
    if (aroundX == null) {
      for (const p of platforms) list.push(p);
      for (const m of getMembraneSolids()) list.push(m);
      if (game.bossActive && bossAlive()) list.push(bossGateRect());
      return list;
    }
    const x0 = aroundX - margin;
    const x1 = aroundX + margin;
    const last = solidBuckets.length - 1;
    const a = Math.max(0, Math.min(last, Math.floor(x0 / SOLID_BUCKET)));
    const b = Math.max(0, Math.min(last, Math.floor(x1 / SOLID_BUCKET)));
    for (let i = a; i <= b; i++) {
      const bucket = solidBuckets[i];
      for (let j = 0; j < bucket.length; j++) {
        const p = bucket[j];
        if (p.x + p.w < x0 || p.x > x1) continue;
        // A platform straddling two buckets would otherwise be listed twice.
        if (i > a && p.x < i * SOLID_BUCKET) continue;
        list.push(p);
      }
    }
    const bands = getMembraneSolids();
    for (let i = 0; i < bands.length; i++) {
      const m = bands[i];
      if (m.x + m.w < x0 || m.x > x1) continue;
      list.push(m);
    }
    if (game.bossActive && bossAlive()) {
      const gate = bossGateRect();
      if (!(gate.x + gate.w < x0 || gate.x > x1)) list.push(gate);
    }
    return list;
  }


  function playerRectAt(px, py) {
    return { x: px - PLAYER_W / 2, y: py - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
  }

  function playerPositionBlocked(px, py) {
    const rect = playerRectAt(px, py);
    for (const solid of getDynamicSolids(px)) {
      if (solid.oneWay) continue;
      if (rectsOverlap(rect, solid)) return true;
    }
    return false;
  }

  function standingOnOneWay() {
    if (!player.grounded) return false;
    const r = playerRect();
    for (const p of platforms) {
      if (!p.oneWay) continue;
      if (Math.abs(player.y - p.y) > 5) continue;
      if (r.x + r.w > p.x + 4 && r.x < p.x + p.w - 4) return true;
    }
    return false;
  }

  function pushCircleOutOfRect(cx, cy, r, rect) {
    const nearestX = clamp(cx, rect.x, rect.x + rect.w);
    const nearestY = clamp(cy, rect.y, rect.y + rect.h);
    let dx = cx - nearestX;
    let dy = cy - nearestY;
    const d2 = dx * dx + dy * dy;
    if (d2 > r * r) return null;
    if (d2 < 1e-8) {
      const left = cx - rect.x;
      const right = rect.x + rect.w - cx;
      const top = cy - rect.y;
      const bottom = rect.y + rect.h - cy;
      const m = Math.min(left, right, top, bottom);
      if (m === top) return { x: cx, y: rect.y - r, nx: 0, ny: -1 };
      if (m === bottom) return { x: cx, y: rect.y + rect.h + r, nx: 0, ny: 1 };
      if (m === left) return { x: rect.x - r, y: cy, nx: -1, ny: 0 };
      return { x: rect.x + rect.w + r, y: cy, nx: 1, ny: 0 };
    }
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    return { x: nearestX + nx * r, y: nearestY + ny * r, nx, ny };
  }

  function resolveYoyoWorld() {
    const solids = getDynamicSolids(yoyo.x, 900, yoyoSolids);
    for (let pass = 0; pass < 3; pass++) {
      let hit = false;
      for (const p of solids) {
        if (p.oneWay || p.membrane || p.bandIndex != null) continue;
        const out = pushCircleOutOfRect(yoyo.x, yoyo.y, yoyo.r, p);
        if (!out) continue;
        yoyo.x = out.x;
        yoyo.y = out.y;
        const vn = yoyo.vx * out.nx + yoyo.vy * out.ny;
        if (vn < 0) {
          yoyo.vx -= out.nx * vn;
          yoyo.vy -= out.ny * vn;
        }
        hit = true;
      }
      if (!hit) break;
    }
  }

  function hasGroundAhead(e, dir) {
    const probeX = e.x + dir * (e.w * 0.55 + 24);
    const footY = e.y;
    for (const p of getDynamicSolids(e.x)) {
      if (probeX <= p.x + 4 || probeX >= p.x + p.w - 4) continue;
      if (p.y >= footY - 10 && p.y <= footY + 32) return true;
    }
    return false;
  }

  function movePlayerAndCollide(dt) {
    const solids = getDynamicSolids(player.x, 2800, playerSolids);
    const rect = () => playerRect();
    // Hanging ledges are scenery while you are on the rope. Catching an arc on
    // the lip of a one-way slab was most of what "getting stuck" felt like; now
    // you pass through them and choose to land by letting go.
    const swinging = !!yoyo.latched;
    player.wallDir = 0;

    player.x += player.vx * dt;
    let r = rect();
    let blocked = 0;
    for (const p of solids) {
      if (p.oneWay) continue;
      if (!rectsOverlap(r, p)) continue;
      // Resolve out of THIS block, then keep going. The old loop zeroed vx on
      // the first hit, so a body overlapping two abutting slabs never got out
      // of the second one and wedged in the seam between them.
      const outLeft = player.x - (p.x - PLAYER_W / 2);
      const outRight = (p.x + p.w + PLAYER_W / 2) - player.x;
      let pushRight;
      if (player.vx > 0) pushRight = false;
      else if (player.vx < 0) pushRight = true;
      else pushRight = outRight < outLeft;
      if (pushRight) {
        player.x = p.x + p.w + PLAYER_W / 2;
        blocked = -1;
      } else {
        player.x = p.x - PLAYER_W / 2;
        blocked = 1;
      }
      r = rect();
    }
    if (blocked !== 0) {
      player.wallDir = blocked;
      // Grazing a corner mid-swing should cost a little speed, not the arc.
      player.vx = swinging ? -player.vx * 0.2 : 0;
    }

    const prevBottom = player.y;
    const prevTop = prevBottom - PLAYER_H;
    player.y += player.vy * dt;
    player.grounded = false;
    r = rect();

    for (const p of solids) {
      if (p.oneWay) {
        if (swinging || player.dropThrough > 0 || input.downHeld()) continue;
        const horizontal = r.x + r.w > p.x + 4 && r.x < p.x + p.w - 4;
        if (player.vy >= 0 && prevBottom <= p.y + 6 && player.y >= p.y && horizontal) {
          player.y = p.y;
          player.vy = 0;
          player.grounded = true;
          r = rect();
        }
        continue;
      }
      if (!rectsOverlap(r, p)) continue;
      // Only call it a landing (or a head bonk) when the body actually came
      // from outside that face this step. Without the check, brushing the SIDE
      // of a block while descending snapped the player up onto its roof.
      if (player.vy >= 0 && prevBottom <= p.y + 10) {
        player.y = p.y;
        player.vy = 0;
        player.grounded = true;
      } else if (player.vy <= 0 && prevTop >= p.y + p.h - 10) {
        player.y = p.y + p.h + PLAYER_H;
        player.vy = 0;
      } else {
        // A genuine side overlap. Push out horizontally instead of wedging.
        const outLeft = player.x - (p.x - PLAYER_W / 2);
        const outRight = (p.x + p.w + PLAYER_W / 2) - player.x;
        if (outRight < outLeft) player.x = p.x + p.w + PLAYER_W / 2;
        else player.x = p.x - PLAYER_W / 2;
        if (!swinging) player.vx = 0;
      }
      r = rect();
    }

    player.x = clamp(player.x, 25, WORLD_W - 25);
  }

  function moveGroundEnemy(e, dt) {
    const solids = getDynamicSolids(e.x, 2800, enemySolids);
    e.hitWall = false;
    e.x += e.vx * dt;
    let r = enemyRect(e);
    for (const p of solids) {
      if (p.oneWay) continue;
      if (!rectsOverlap(r, p)) continue;
      if (e.vx > 0) e.x = p.x - e.w / 2;
      else if (e.vx < 0) e.x = p.x + p.w + e.w / 2;
      e.vx = 0;
      e.hitWall = true;
      r = enemyRect(e);
    }

    const prevBottom = e.y;
    e.vy += 1900 * dt;
    e.vy = Math.min(e.vy, 1200);
    e.y += e.vy * dt;
    r = enemyRect(e);
    let grounded = false;
    for (const p of solids) {
      const horizontal = r.x + r.w > p.x + 3 && r.x < p.x + p.w - 3;
      if (p.oneWay) {
        if (e.vy >= 0 && prevBottom <= p.y + 6 && e.y >= p.y && horizontal) {
          e.y = p.y;
          e.vy = 0;
          grounded = true;
          r = enemyRect(e);
        }
      } else if (rectsOverlap(r, p)) {
        if (e.vy > 0) {
          e.y = p.y;
          e.vy = 0;
          grounded = true;
        } else if (e.vy < 0) {
          e.y = p.y + p.h + e.h;
          e.vy = 0;
        }
        r = enemyRect(e);
      }
    }
    e.grounded = grounded;
    if (e.hitWall) e.patrolDir *= -1;
    if (e.y > 1120) e.alive = false;
  }

  // The rope.
  //
  // The old solver worked by searching for a legal pendulum pose and TELEPORTING
  // the player onto it, walking outward through neighbouring arcs and shorter
  // radii when the ideal pose clipped masonry — and letting go of the hook
  // entirely when nothing in that tiny search window fit. That is why grazing a
  // slab dropped you, and why a swing that brushed geometry went dead instead of
  // sliding: every rejected candidate silently deformed the arc.
  //
  // This is a constraint instead. The player is an ordinary body moved by
  // movePlayerAndCollide like everywhere else in the game; the rope only removes
  // outward radial velocity and takes up slack, and it is a rope, not a rod —
  // slack does nothing at all, so being closer to the ring than the rope is
  // long is simply allowed. Nothing here can release the hook. Only the player
  // lets go.
  function applyGrappleConstraint(dt) {
    if (!yoyo.latched) return;
    const h = yoyo.latched;

    yoyo.ropeLength = clamp(lerp(yoyo.ropeLength, yoyo.ropeTarget, 1 - Math.exp(-dt * 12)), 105, MAX_CHAIN);

    const anchorDrop = PLAYER_H * 0.56;
    let ax = player.x - h.x;
    let ay = (player.y - anchorDrop) - h.y;
    let dist = hypot(ax, ay) || 1;
    let nx = ax / dist;
    let ny = ay / dist;
    let tx = -ny;
    let ty = nx;

    const move = input.moveX();
    if (Math.abs(move) > 0.06) {
      // Left/right becomes torque along whichever tangent actually carries the
      // body that way.
      const direction = sign0(move * tx) || sign0(move);
      player.vx += tx * direction * SWING_PUMP * dt;
      player.vy += ty * direction * SWING_PUMP * dt;
      player.facing = move > 0 ? 1 : -1;
    }

    const rope = yoyo.ropeLength;
    if (dist > rope) {
      // Taut. Kill only the outward radial component; the tangential speed IS
      // the swing and is never touched.
      const radial = player.vx * nx + player.vy * ny;
      if (radial > 0) {
        player.vx -= nx * radial;
        player.vy -= ny * radial;
      }

      // Take up the slack positionally, capped per step so it reads as a pull.
      // If the corrected pose is inside geometry the correction is simply
      // skipped and the rope stretches for a step — the alternative used to be
      // dropping the player, which is never the right answer.
      const overshoot = dist - rope;
      const pull = Math.min(overshoot, ROPE_TAKEUP * dt);
      if (pull > 0.02) {
        const px = player.x - nx * pull;
        const py = player.y - ny * pull;
        if (!playerPositionBlocked(px, py)) {
          player.x = px;
          player.y = py;
          if (ny > 0.15) {
            // The rope lifted them; do not let a stale grounded flag from this
            // step's collision pass glue them back to the floor.
            player.grounded = false;
            player.coyote = 0;
          }
          ax = player.x - h.x;
          ay = (player.y - anchorDrop) - h.y;
          dist = hypot(ax, ay) || 1;
          nx = ax / dist; ny = ay / dist; tx = -ny; ty = nx;
        }
      }

      // Safety valve only: something outside the rope (a checkpoint reset, a
      // teleport) has torn the player off the arc entirely.
      if (dist > MAX_CHAIN * 1.6) {
        releaseHook(false);
        return;
      }
    }

    const tangential = player.vx * tx + player.vy * ty;
    if (Math.abs(tangential) > MAX_SWING) {
      const excess = tangential - clamp(tangential, -MAX_SWING, MAX_SWING);
      player.vx -= tx * excess;
      player.vy -= ty * excess;
    }

    yoyo.x = h.x;
    yoyo.y = h.y;
  }

  // ---------------------------------------------------------------------------
  // Player and yo-yo simulation.
  // ---------------------------------------------------------------------------

  function releaseHook(boost = false) {
    if (!yoyo.latched) return;
    const h = yoyo.latched;
    const pc = playerCenter();
    const dx = pc.x - h.x;
    const dy = pc.y - h.y;
    const dist = hypot(dx, dy) || 1;
    const tx = -dy / dist;
    const ty = dx / dist;
    const tangential = player.vx * tx + player.vy * ty;
    if (boost) {
      const spite = 1 + player.relics.spite * 0.45;
      const direction = sign0(tangential) || sign0(input.moveX()) || player.facing;
      player.vx += tx * direction * 115 * spite;
      player.vy += ty * direction * 80 * spite - 155 * spite;
    }
    yoyo.blockedHook = h;
    yoyo.holdGrace = 0;
    yoyo.latched = null;
    yoyo.latchCooldown = boost ? 0.24 : 0.13;
    player.grapple = null;
    yoyo.vx = player.vx * 0.72;
    yoyo.vy = player.vy * 0.72;
    yoyo.ropeTarget = yoyo.ropeLength;
    sparkBurst(h.x, h.y, 7, 240, '#ff6678');
    audio.tone(125, 0.12, 'triangle', 0.04, -35);
  }

  function updateYoyo(dt) {
    yoyo.prevX = yoyo.x;
    yoyo.prevY = yoyo.y;
    yoyo.latchCooldown = Math.max(0, yoyo.latchCooldown - dt);
    const pc = playerCenter();
    const aim = input.aim(player, game.camera);
    yoyo.active = aim.active;

    if (!aim.active) {
      yoyo.blockedHook = null;
    } else if (yoyo.blockedHook) {
      const desiredDistance = 42 + aim.mag * (MAX_CHAIN - 42);
      const desiredX = pc.x + aim.dx * desiredDistance;
      const desiredY = pc.y + aim.dy * desiredDistance;
      if (hypot(desiredX - yoyo.blockedHook.x, desiredY - yoyo.blockedHook.y) > 135) yoyo.blockedHook = null;
    }

    if (aim.active) {
      if (yoyo.lastAimAngle != null) {
        const delta = wrapAngle(aim.angle - yoyo.lastAimAngle);
        const angular = Math.abs(delta) / Math.max(dt, 1 / 240);
        yoyo.angularInput = lerp(yoyo.angularInput, angular, 0.22);
        yoyo.charge = clamp(yoyo.charge + Math.abs(delta) * 0.18 + Math.max(0, angular - 2) * dt * 0.025, 0, 1);
      }
      yoyo.lastAimAngle = aim.angle;
      yoyo.charge = Math.max(0, yoyo.charge - dt * 0.06);
    } else {
      yoyo.lastAimAngle = null;
      yoyo.angularInput = lerp(yoyo.angularInput, 0, 0.16);
      yoyo.charge = Math.max(0, yoyo.charge - dt * 0.38);
    }

    if (yoyo.latched) {
      yoyo.x = yoyo.latched.x;
      yoyo.y = yoyo.latched.y;
      yoyo.vx = 0;
      yoyo.vy = 0;
      yoyo.targetX = yoyo.x;
      yoyo.targetY = yoyo.y;
      // Phones fire pointercancel for all sorts of reasons that are not "the
      // player let go". Give the grip a beat before it counts as release.
      if (aim.active) {
        yoyo.holdGrace = 0;
      } else {
        yoyo.holdGrace += dt;
        if (yoyo.holdGrace >= (COARSE_POINTER ? HOLD_GRACE : 0.05)) releaseHook(false);
      }
    } else {
      let targetX = pc.x + player.facing * 43;
      let targetY = pc.y + 5;
      if (aim.active) {
        const dist = 42 + aim.mag * (MAX_CHAIN - 42);
        targetX = pc.x + aim.dx * dist;
        targetY = pc.y + aim.dy * dist;
      }
      yoyo.targetX = targetX;
      yoyo.targetY = targetY;

      // Soft magnetic assistance around visible hooks. It never latches a hook
      // outside chain range or behind the player's aim, but removes pixel hunting.
      let magnet = null;
      let magnetScore = Infinity;
      if (aim.active && yoyo.latchCooldown <= 0) {
        for (const h of hooks) {
          if (h === yoyo.blockedHook) continue;
          const reachable = hypot(pc.x - h.x, pc.y - h.y) < MAX_CHAIN + 42;
          if (!reachable) continue;
          const desiredDistance = 42 + aim.mag * (MAX_CHAIN - 42);
          const desiredX = pc.x + aim.dx * desiredDistance;
          const desiredY = pc.y + aim.dy * desiredDistance;
          const aimError = hypot(desiredX - h.x, desiredY - h.y);
          if (aimError < 132 && aimError < magnetScore) { magnet = h; magnetScore = aimError; }
        }
      }
      if (magnet) {
        const assist = smoothstep(1 - magnetScore / 132);
        targetX = lerp(targetX, magnet.x, 0.30 + assist * 0.48);
        targetY = lerp(targetY, magnet.y, 0.30 + assist * 0.48);
      }

      const spring = aim.active ? 82 : 190;
      const damping = aim.active ? 8.0 : 18.0;
      yoyo.vx += (targetX - yoyo.x) * spring * dt;
      yoyo.vy += (targetY - yoyo.y) * spring * dt;
      const damp = Math.exp(-damping * dt);
      yoyo.vx *= damp;
      yoyo.vy *= damp;

      const speed = hypot(yoyo.vx, yoyo.vy);
      const maxSpeed = 1550 + yoyo.charge * 450;
      if (speed > maxSpeed) { yoyo.vx *= maxSpeed / speed; yoyo.vy *= maxSpeed / speed; }

      yoyo.x += yoyo.vx * dt;
      yoyo.y += yoyo.vy * dt;

      let dx = yoyo.x - pc.x;
      let dy = yoyo.y - pc.y;
      let dist = hypot(dx, dy) || 1;
      if (dist > MAX_CHAIN) {
        dx /= dist; dy /= dist;
        yoyo.x = pc.x + dx * MAX_CHAIN;
        yoyo.y = pc.y + dy * MAX_CHAIN;
        const outward = yoyo.vx * dx + yoyo.vy * dy;
        if (outward > 0) { yoyo.vx -= dx * outward * 1.55; yoyo.vy -= dy * outward * 1.55; }
      }

      resolveYoyoWorld();
      dx = yoyo.x - pc.x;
      dy = yoyo.y - pc.y;
      dist = hypot(dx, dy) || 1;
      if (dist > MAX_CHAIN) {
        dx /= dist; dy /= dist;
        yoyo.x = pc.x + dx * MAX_CHAIN;
        yoyo.y = pc.y + dy * MAX_CHAIN;
        resolveYoyoWorld();
      }

      if (magnet) {
        const near = hypot(yoyo.x - magnet.x, yoyo.y - magnet.y);
        if (near < magnet.r + yoyo.r + 20) {
          yoyo.latched = magnet;
          player.grapple = magnet;
          yoyo.ropeLength = clamp(hypot(pc.x - magnet.x, pc.y - magnet.y), 110, MAX_CHAIN);
          // A hook should catch and lift, not nail the player to the lip of the
          // floor. A short automatic take-up gives the pendulum room to exist.
          yoyo.ropeTarget = clamp(yoyo.ropeLength - (player.grounded ? 58 : 22), 150, MAX_CHAIN);
          if (player.grounded) {
            // A ring should catch and lift, not nail you to the lip of the
            // floor. Get the body clear so the pendulum has somewhere to exist.
            player.vy = Math.min(player.vy, -190);
            player.grounded = false;
            player.coyote = 0;
          }
          yoyo.holdGrace = 0;
          yoyo.x = magnet.x;
          yoyo.y = magnet.y;
          yoyo.vx = 0;
          yoyo.vy = 0;
          sparkBurst(magnet.x, magnet.y, 16, 420, '#ff6a80');
          addShake(3.5);
          audio.tone(240, 0.16, 'square', 0.07, -70);
        }
      }
    }

    const speed = hypot(yoyo.vx, yoyo.vy);
    yoyo.angle += (speed * 0.026 + 5 + yoyo.charge * 20) * dt;
    yoyo.hitPulse = Math.max(0, yoyo.hitPulse - dt * 5);
    yoyo.trail.unshift({ x: yoyo.x, y: yoyo.y, charge: yoyo.charge });
    const maxTrail = yoyo.active ? 26 : 12;
    if (yoyo.trail.length > maxTrail) yoyo.trail.length = maxTrail;
  }

  function updatePlayer(dt) {
    player.invuln = Math.max(0, player.invuln - dt);
    player.hurtFlash = Math.max(0, player.hurtFlash - dt * 5);
    player.dropThrough = Math.max(0, player.dropThrough - dt);
    player.coyote = player.grounded ? 0.105 : Math.max(0, player.coyote - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.streakTimer = Math.max(0, player.streakTimer - dt);
    if (player.streakTimer <= 0) player.killStreak = 0;

    const move = input.moveX();
    const jumpPressed = input.consumeJump();
    if (jumpPressed) player.jumpBuffer = 0.13;

    if (yoyo.latched && jumpPressed) {
      releaseHook(true);
      player.jumpBuffer = 0;
      audio.jump();
    }

    if (!yoyo.latched && player.grounded && standingOnOneWay() && input.downHeld()) {
      player.dropThrough = 0.22;
      player.grounded = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      player.vy = Math.max(player.vy, 260);
    }

    if (!yoyo.latched) {
      const accel = player.grounded ? 2500 : 1500;
      const maxSpeed = 360;
      if (Math.abs(move) > 0.08) {
        player.vx += move * accel * dt;
        player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
        player.facing = move > 0 ? 1 : -1;
        player.runTime += Math.abs(player.vx) * dt * 0.018;
      } else {
        const friction = player.grounded ? 0.72 : 0.96;
        player.vx *= Math.pow(friction, dt * 60);
        if (Math.abs(player.vx) < 2) player.vx = 0;
      }
    } else {
      player.runTime += Math.abs(player.vx) * dt * 0.005;
    }

    {
      let next = 'idle';
      if (!player.grounded || yoyo.latched) next = 'air';
      else if (Math.abs(player.vx) > 48) next = 'walk';
      if (next !== player.animState) {
        player.animState = next;
        player.animTime = 0;
      }
      const rate = next === 'walk' ? Math.max(0.75, Math.abs(player.vx) / 300) : 1;
      player.animTime += dt * rate;
    }

    if (player.jumpBuffer > 0 && !yoyo.latched) {
      if (player.coyote > 0) {
        player.vy = -760;
        player.grounded = false;
        player.coyote = 0;
        player.jumpBuffer = 0;
        audio.jump();
        smokePuff(player.x, player.y - 2, 3, '#32141e');
      } else if (player.wallDir !== 0) {
        player.vx = -player.wallDir * 470;
        player.vy = -700;
        player.jumpBuffer = 0;
        audio.jump();
      }
    }

    let gravity = yoyo.latched ? 1180 : 2100;
    if (!input.jumpHeld() && player.vy < -80 && !yoyo.latched) gravity *= 1.85;
    player.vy += gravity * dt;
    player.vy = Math.min(player.vy, 1200);

    const wasAirborne = !player.grounded;
    const fallSpeed = player.vy;
    movePlayerAndCollide(dt);
    applyGrappleConstraint(dt);

    // Squash on impact, stretch on the way up. It reads as weight and costs
    // nothing but a number.
    player.squash = approach(player.squash, 0, dt * 7.5);
    if (player.grounded) {
      player.airTime = 0;
      if (wasAirborne && fallSpeed > 240) {
        player.squash = -clamp(fallSpeed / 1500, 0.10, 0.30);
        smokePuff(player.x, player.y - 2, fallSpeed > 800 ? 6 : 3, '#32141e');
      }
    } else {
      player.airTime += dt;
      if (player.vy < -300) player.squash = Math.max(player.squash, clamp(-player.vy / 2600, 0, 0.16));
    }
    player.lastVy = player.vy;

    if (player.grounded && Math.abs(player.vx) > 100) {
      player.stepTimer -= dt;
      if (player.stepTimer <= 0) {
        player.stepTimer = 0.24 - Math.min(0.08, Math.abs(player.vx) / 5000);
        addParticle({ x: player.x - player.facing * 10, y: player.y - 2, vx: -player.vx * 0.08, vy: -35, life: 0.35, size: 9, color: '#24151b', gravity: -10, type: 'smoke' });
      }
    }

    for (const hz of hazards) if (rectsOverlap(playerRect(), hz)) damagePlayer(18, sign0(player.x - (hz.x + hz.w / 2)) || 1, -260);

    for (const c of caches) {
      if (c.taken) continue;
      if (Math.abs(c.x - player.x) > 150) continue;
      if (!rectsOverlap(playerRect(), { x: c.x - 30, y: c.y - 96, w: 60, h: 96 })) continue;
      c.taken = true;
      gainXP(c.xp);
      game.zoneTitle = 'RELIQUARY BROKEN';
      game.zoneTitleTimer = 1.15;
      sparkBurst(c.x, c.y - 48, 26, 620, '#ffd88a');
      bloodBurst(c.x, c.y - 48, 12, 380, 0, -0.4);
      hitStop(0.05, 0.16);
      addShake(12);
      audio.seal();
      saveGame();
    }
    if (player.y > 1080) killPlayer();

    const areaI = areaIndexAt(player.x);
    setZone(areaI);
    if (player.visited.indexOf(areaI) < 0) player.visited.push(areaI);
    const area = AREAS[areaI];
    if (area && player.x > area.x0 + 70 && player.checkpointX < area.x0 + 40) {
      const cp = AREA_CHECKPOINTS[areaI];
      player.checkpointX = cp ? cp.x : area.x0 + 90;
      player.checkpointY = cp ? cp.y : (groundYNear(player.checkpointX, 760) || 760);
      player.health = Math.min(player.maxHealth, player.health + 22 + areaI * 2);
      saveGame();
      if (areaI === AREAS.length - 1 && !game.completed) {
        game.bossActive = true;
        const boss = enemies.find(e => e.type === 'boss');
        if (boss && boss.alive) boss.bossAwake = true;
        addShake(14); audio.tone(46, 1.2, 'sawtooth', 0.11, 38);
      }
    }
  }

  function damagePlayer(amount, knockX = 0, knockY = -180) {
    if (player.invuln > 0 || player.dead || game.state !== 'playing') return;
    amount *= 1 + areaIndexAt(player.x) * 0.06;
    player.health = Math.max(0, player.health - amount);
    player.invuln = 0.78;
    player.hurtFlash = 1;
    player.vx = knockX * 360;
    player.vy = knockY;
    player.killStreak = 0;
    addShake(11);
    game.redFlash = Math.max(game.redFlash, 0.35);
    bloodBurst(player.x, player.y - 45, 10, 300, -knockX, -0.2);
    audio.hurt();
    if (player.health <= 0) killPlayer();
  }

  // ---------------------------------------------------------------------------
  // Enemy AI and combat.
  // ---------------------------------------------------------------------------

  function spawnProjectile(p) {
    projectiles.push({
      x: p.x,
      y: p.y,
      vx: p.vx || 0,
      vy: p.vy || 0,
      r: p.r || 10,
      life: p.life || 4,
      damage: p.damage || 10,
      type: p.type || 'bolt',
      hostile: p.hostile !== false,
      gravity: p.gravity || 0,
      trail: [],
      reflected: false
    });
  }

  function spawnShockwave(x, y, dir, strong = false) {
    spawnProjectile({
      x, y: y - 13,
      vx: dir * (strong ? 560 : 430),
      vy: 0,
      r: strong ? 28 : 20,
      damage: strong ? 24 : 15,
      life: 2.2,
      type: strong ? 'bigWave' : 'wave',
      hostile: true
    });
  }

  function enemyMeleeHits(e, rangeX, rangeY, frontOnly = true) {
    const pr = playerRect();
    const er = enemyRect(e);
    const hb = {
      x: frontOnly ? (e.facing > 0 ? er.x + er.w * 0.55 : er.x - rangeX + er.w * 0.45) : er.x - rangeX / 2,
      y: er.y + er.h * 0.15,
      w: rangeX,
      h: Math.min(rangeY, er.h * 0.9)
    };
    return rectsOverlap(pr, hb);
  }

  function updateCrawler(e, dt) {
    const dx = player.x - e.x;
    const engaged = Math.abs(dx) < 650;
    if (engaged) e.facing = dx >= 0 ? 1 : -1;
    e.cooldown -= dt;

    if (e.state === 'coil') {
      e.stateT -= dt;
      e.vx = approach(e.vx, 0, 900 * dt);
      if (e.stateT <= 0) {
        e.state = 'pounce'; e.stateT = 0.52; e.attackHit = false;
        e.vx = e.facing * 520; e.vy = -390;
      }
    } else if (e.state === 'pounce') {
      e.stateT -= dt;
      if (!e.attackHit && rectsOverlap(enemyRect(e), playerRect())) {
        damagePlayer(13, e.facing, -260); e.attackHit = true;
      }
      if (e.stateT <= 0 || (e.grounded && e.attackHit)) {
        e.state = 'recover'; e.stateT = 0.34; e.cooldown = 0.9 + hash(e.seed + game.time) * 0.5;
      }
    } else if (e.state === 'recover') {
      e.stateT -= dt;
      e.vx = approach(e.vx, 0, 720 * dt);
      if (e.stateT <= 0) e.state = 'idle';
    } else {
      const dir = engaged ? e.facing : e.patrolDir;
      if (e.grounded && !hasGroundAhead(e, dir)) { e.patrolDir *= -1; e.vx = 0; }
      else e.vx = approach(e.vx, dir * (engaged ? 150 : 78), 520 * dt);
      if (engaged && Math.abs(dx) < 185 && e.cooldown <= 0 && e.grounded) {
        e.state = 'coil'; e.stateT = 0.23; e.vx = 0;
      }
    }
    moveGroundEnemy(e, dt);
  }

  function updateKnight(e, dt) {
    const dx = player.x - e.x;
    const engaged = Math.abs(dx) < 720;
    if (engaged) e.facing = dx >= 0 ? 1 : -1;
    e.cooldown -= dt;

    if (e.state === 'windup') {
      e.stateT -= dt; e.vx = approach(e.vx, 0, 1200 * dt);
      if (e.stateT <= 0) { e.state = 'swing'; e.stateT = 0.28; e.attackHit = false; e.vx = e.facing * 125; }
    } else if (e.state === 'swing') {
      e.stateT -= dt;
      if (!e.attackHit && e.stateT < 0.20 && enemyMeleeHits(e, 132, 98, true)) {
        damagePlayer(19, e.facing, -240); e.attackHit = true;
      }
      if (e.stateT <= 0) { e.state = 'recover'; e.stateT = 0.44; e.cooldown = 0.9 + hash(e.seed + game.time) * 0.4; }
    } else if (e.state === 'recover') {
      e.stateT -= dt; e.vx = approach(e.vx, 0, 700 * dt);
      if (e.stateT <= 0) e.state = 'idle';
    } else if (e.state === 'stagger') {
      e.stateT -= dt; e.vx = approach(e.vx, 0, 480 * dt);
      if (e.stateT <= 0) e.state = 'idle';
    } else {
      const dir = engaged ? e.facing : e.patrolDir;
      if (e.grounded && !hasGroundAhead(e, dir)) { e.patrolDir *= -1; e.vx = 0; }
      else if (engaged && Math.abs(dx) > 112) e.vx = approach(e.vx, dir * 108, 440 * dt);
      else e.vx = approach(e.vx, dir * (engaged ? 0 : 48), 560 * dt);
      if (engaged && Math.abs(dx) < 138 && e.cooldown <= 0) { e.state = 'windup'; e.stateT = 0.31; e.vx = 0; }
    }
    moveGroundEnemy(e, dt);
  }

  function updateBat(e, dt) {
    e.cooldown -= dt;
    const dx = player.x - e.x;
    e.facing = dx >= 0 ? 1 : -1;
    const perchX = e.baseX + Math.sin(game.time * 0.58 + e.seed) * 95;
    const perchY = e.baseY + Math.sin(game.time * 1.18 + e.seed * 0.37) * 36;

    if (e.state === 'telegraph') {
      e.stateT -= dt;
      e.vx = approach(e.vx, 0, 500 * dt); e.vy = approach(e.vy, 0, 500 * dt);
      if (e.stateT <= 0) {
        e.state = 'dive'; e.stateT = 0.82; e.attackHit = false;
        const tx = player.x - e.x; const ty = player.y - 48 - e.y; const len = hypot(tx, ty) || 1;
        e.vx = tx / len * 520; e.vy = ty / len * 520;
      }
    } else if (e.state === 'dive') {
      e.stateT -= dt;
      if (!e.attackHit && rectsOverlap(enemyRect(e), playerRect())) { damagePlayer(12, e.facing, -210); e.attackHit = true; }
      if (e.stateT <= 0 || e.attackHit) { e.state = 'return'; e.stateT = 0.9; e.cooldown = 1.1 + hash(e.seed + game.time) * 0.7; }
    } else if (e.state === 'return') {
      e.stateT -= dt;
      e.vx = approach(e.vx, clamp((perchX - e.x) * 2.4, -320, 320), 620 * dt);
      e.vy = approach(e.vy, clamp((perchY - e.y) * 2.4, -320, 320), 620 * dt);
      if (e.stateT <= 0 || hypot(perchX - e.x, perchY - e.y) < 45) e.state = 'idle';
    } else {
      e.vx = approach(e.vx, clamp((perchX - e.x) * 1.5, -150, 150), 300 * dt);
      e.vy = approach(e.vy, clamp((perchY - e.y) * 1.5, -150, 150), 300 * dt);
      if (e.cooldown <= 0 && Math.abs(dx) < 650) {
        if (hash(e.seed + Math.floor(game.time * 2.3)) < 0.62) { e.state = 'telegraph'; e.stateT = 0.36; }
        else {
          const tx = player.x - e.x; const ty = player.y - 45 - e.y; const len = hypot(tx, ty) || 1;
          spawnProjectile({ x: e.x, y: e.y, vx: tx / len * 360, vy: ty / len * 360, r: 9, damage: 10, life: 3.5, type: 'bloodBolt' });
          e.cooldown = 1.5 + hash(e.seed + game.time) * 0.8; audio.tone(170, 0.13, 'square', 0.035, -60);
        }
      }
    }
    e.x += e.vx * dt; e.y += e.vy * dt;
  }

  function updateCenser(e, dt) {
    e.cooldown -= dt;
    const dx = player.x - e.x;
    e.facing = dx >= 0 ? 1 : -1;
    const away = Math.abs(dx) < 250 ? -e.facing : 0;
    const desiredX = e.baseX + Math.sin(game.time * 0.55 + e.seed) * 105 + away * 90;
    const desiredY = e.baseY + Math.sin(game.time * 1.25 + e.seed * 0.4) * 42;

    if (e.state === 'cast') {
      e.stateT -= dt;
      e.vx = approach(e.vx, 0, 260 * dt); e.vy = approach(e.vy, 0, 260 * dt);
      if (!e.attackHit && e.stateT < 0.36) {
        e.attackHit = true;
        const tx = player.x - e.x; const ty = player.y - 52 - e.y; const len = hypot(tx, ty) || 1;
        spawnProjectile({ x: e.x, y: e.y + 20, vx: tx / len * 300, vy: ty / len * 300 - 70, gravity: 260, r: 15, damage: 15, life: 5, type: 'censer' });
        audio.tone(110, 0.22, 'triangle', 0.05, -20);
      }
      if (e.stateT <= 0) { e.state = 'idle'; e.cooldown = 1.7 + hash(e.seed + game.time) * 0.8; }
    } else {
      e.vx = approach(e.vx, clamp((desiredX - e.x) * 1.2, -145, 145), 250 * dt);
      e.vy = approach(e.vy, clamp((desiredY - e.y) * 1.5, -145, 145), 250 * dt);
      if (e.cooldown <= 0 && Math.abs(dx) < 760) { e.state = 'cast'; e.stateT = 0.68; e.attackHit = false; }
    }
    e.x += e.vx * dt; e.y += e.vy * dt;
  }

  function updateExecutioner(e, dt) {
    const dx = player.x - e.x;
    const engaged = Math.abs(dx) < 830;
    if (engaged) e.facing = dx >= 0 ? 1 : -1;
    e.cooldown -= dt;
    if (e.state === 'windup') {
      e.stateT -= dt; e.vx = approach(e.vx, 0, 1000 * dt);
      if (e.stateT <= 0) { e.state = 'slam'; e.stateT = 0.26; e.attackHit = false; }
    } else if (e.state === 'slam') {
      e.stateT -= dt;
      if (!e.attackHit && e.stateT < 0.20) {
        e.attackHit = true; spawnShockwave(e.x, e.y, -1, false); spawnShockwave(e.x, e.y, 1, false);
        addShake(12); audio.hit(true);
        if (Math.abs(player.x - e.x) < 110 && player.y > e.y - 120) damagePlayer(22, sign0(player.x - e.x), -340);
      }
      if (e.stateT <= 0) { e.state = 'recover'; e.stateT = 0.62; e.cooldown = 1.35; }
    } else if (e.state === 'recover') {
      e.stateT -= dt; e.vx = approach(e.vx, 0, 600 * dt); if (e.stateT <= 0) e.state = 'idle';
    } else {
      const dir = engaged ? e.facing : e.patrolDir;
      if (e.grounded && !hasGroundAhead(e, dir)) { e.patrolDir *= -1; e.vx = 0; }
      else if (engaged && Math.abs(dx) > 165) e.vx = approach(e.vx, dir * 88, 360 * dt);
      else e.vx = approach(e.vx, dir * (engaged ? 0 : 38), 430 * dt);
      if (engaged && Math.abs(dx) < 245 && e.cooldown <= 0) { e.state = 'windup'; e.stateT = 0.50; e.vx = 0; }
    }
    moveGroundEnemy(e, dt);
  }

  function updateBoss(e, dt) {
    if (!game.bossActive || !e.bossAwake) return;
    const dx = player.x - e.x;
    e.facing = dx >= 0 ? 1 : -1;
    e.cooldown -= dt;
    e.phase = e.hp < e.maxHp * 0.52 ? 2 : 1;

    if (e.state === 'slam') {
      e.stateT -= dt;
      if (!e.attackHit && e.stateT < (e.phase === 2 ? 0.38 : 0.5)) {
        e.attackHit = true;
        spawnShockwave(e.x, e.y, -1, true);
        spawnShockwave(e.x, e.y, 1, true);
        if (e.phase === 2) {
          spawnShockwave(e.x + 30, e.y, -1, false);
          spawnShockwave(e.x - 30, e.y, 1, false);
        }
        addShake(24);
        hitStop(0.06, 0.13);
        audio.hit(true);
        if (Math.abs(player.x - e.x) < 150 && player.y > e.y - 150) damagePlayer(30, sign0(player.x - e.x), -430);
      }
      if (e.stateT <= 0) {
        e.state = 'idle';
        e.cooldown = e.phase === 2 ? 0.75 : 1.15;
      }
    } else if (e.state === 'charge') {
      e.stateT -= dt;
      if (e.stateT > 0.72) {
        e.vx *= 0.85;
      } else {
        e.vx = e.facing * (e.phase === 2 ? 650 : 520);
        if (!e.attackHit && rectsOverlap(enemyRect(e), playerRect())) {
          damagePlayer(28, e.facing, -320);
          e.attackHit = true;
        }
      }
      if (e.stateT <= 0) {
        e.state = 'idle';
        e.vx *= 0.15;
        e.cooldown = 1.0;
      }
    } else if (e.state === 'leap') {
      e.stateT -= dt;
      if (e.grounded && e.stateT < 0.75 && !e.attackHit) {
        e.attackHit = true;
        spawnShockwave(e.x, e.y, -1, true);
        spawnShockwave(e.x, e.y, 1, true);
        addShake(28);
        hitStop(0.07, 0.16);
        audio.hit(true);
      }
      if (e.stateT <= 0 && e.grounded) {
        e.state = 'idle';
        e.cooldown = 0.9;
      }
    } else if (e.state === 'summon') {
      e.stateT -= dt;
      if (!e.attackHit && e.stateT < 0.75) {
        e.attackHit = true;
        for (let i = 0; i < (e.phase === 2 ? 3 : 2); i++) {
          const bat = createEnemy({ type: 'bat', x: e.x + (i - 1) * 110, y: e.y - 220 - Math.random() * 90 });
          bat.cooldown = 0.6 + Math.random() * 0.5;
          enemies.push(bat);
          smokePuff(bat.x, bat.y, 7, '#3b0b18');
        }
      }
      if (e.stateT <= 0) {
        e.state = 'idle';
        e.cooldown = 1.2;
      }
    } else {
      if (Math.abs(dx) > 190) e.vx += e.facing * (e.phase === 2 ? 520 : 360) * dt;
      else e.vx *= Math.pow(0.78, dt * 60);
      e.vx = clamp(e.vx, e.phase === 2 ? -155 : -110, e.phase === 2 ? 155 : 110);
      if (e.cooldown <= 0) {
        const roll = Math.random();
        if (Math.abs(dx) < 250 && roll < 0.42) {
          e.state = 'slam';
          e.stateT = e.phase === 2 ? 0.72 : 0.95;
          e.attackHit = false;
          e.vx = 0;
        } else if (roll < 0.70) {
          e.state = 'charge';
          e.stateT = 1.05;
          e.attackHit = false;
        } else if (roll < 0.90) {
          e.state = 'leap';
          e.stateT = 1.3;
          e.attackHit = false;
          e.vy = e.phase === 2 ? -840 : -720;
          e.vx = e.facing * (e.phase === 2 ? 300 : 240);
        } else {
          e.state = 'summon';
          e.stateT = 1.15;
          e.attackHit = false;
          e.vx = 0;
        }
      }
    }
    moveGroundEnemy(e, dt);
  }

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) {
        e.deadTimer -= dt;
        if (e.deadTimer <= 0 && e.type !== 'boss') enemies.splice(i, 1);
        continue;
      }
      e.flash = Math.max(0, e.flash - dt * 7);
      e.yoyoCooldown = Math.max(0, e.yoyoCooldown - dt);
      e.chainCooldown = Math.max(0, e.chainCooldown - dt);
      e.poise = Math.max(0, e.poise - dt * 25);
      if (e.type !== 'boss' && Math.abs(e.x - player.x) > 2400) continue;

      switch (e.type) {
        case 'crawler': updateCrawler(e, dt); break;
        case 'knight': updateKnight(e, dt); break;
        case 'bat': updateBat(e, dt); break;
        case 'censer': updateCenser(e, dt); break;
        case 'executioner': updateExecutioner(e, dt); break;
        case 'boss': updateBoss(e, dt); break;
      }
    }
  }

  function damageEnemy(e, amount, hitX, hitY, knockX, knockY, big = false) {
    if (!e.alive) return;
    e.hp -= amount;
    e.flash = 1;
    e.poise += amount;
    if (!e.flying) {
      e.vx += knockX;
      e.vy += knockY;
    } else {
      e.vx += knockX * 0.7;
      e.vy += knockY * 0.7;
    }

    const bloodCount = big ? 16 : 6 + Math.floor(amount / 7);
    bloodBurst(hitX, hitY, bloodCount, big ? 590 : 360, sign0(knockX), -0.15);
    sparkBurst(hitX, hitY, big ? 12 : 5, big ? 620 : 360, big ? '#ffdfaa' : '#ff5268');
    yoyo.hitPulse = 1;

    if (big) {
      hitStop(e.type === 'boss' ? 0.045 : 0.06, 0.12);
      addShake(e.type === 'boss' ? 12 : 15);
      audio.hit(true);
    } else {
      hitStop(0.018, 0.04);
      addShake(4.5);
      audio.hit(false);
    }

    if (e.type === 'knight' && e.poise > 85 && e.state !== 'stagger') {
      e.state = 'stagger';
      e.stateT = 0.58;
      e.poise = 0;
    }

    if (e.hp <= 0) killEnemy(e, hitX, hitY, knockX, knockY);
    else if (e.type === 'boss') {
      const stage = e.hp < e.maxHp * 0.25 ? 3 : e.hp < e.maxHp * 0.5 ? 2 : e.hp < e.maxHp * 0.75 ? 1 : 0;
      if (stage > e.armorStage) {
        e.armorStage = stage;
        stoneBurst(e.x, e.y - e.h * 0.65, 22, 520);
        bloodBurst(e.x, e.y - e.h * 0.58, 18, 500, -e.facing, -0.35);
        addShake(20);
        audio.seal();
      }
    }
  }

  function killEnemy(e, hitX, hitY, knockX, knockY) {
    if (player.relics.carrion > 0 && e.alive) {
      player.health = Math.min(player.maxHealth, player.health + player.relics.carrion * 3);
    }
    e.alive = false;
    e.deadTimer = e.type === 'boss' ? 99 : 1.4;
    e.vx = knockX * 2;
    e.vy = knockY * 2 - 180;
    game.kills++;
    player.killStreak++;
    player.streakTimer = 3.4;
    game.maxCombo = Math.max(game.maxCombo, player.killStreak);
    player.health = Math.min(player.maxHealth, player.health + (e.type === 'boss' ? 0 : 2 + Math.min(5, player.killStreak * 0.4)));
    gainXP((e.xp || 12) * (1 + Math.min(8, player.killStreak) * 0.04));

    const size = e.type === 'boss' ? 70 : e.type === 'executioner' ? 36 : 20;
    bloodBurst(hitX, hitY, e.type === 'boss' ? 75 : 24, e.type === 'boss' ? 820 : 620, sign0(knockX), -0.45);
    stoneBurst(hitX, hitY, e.type === 'boss' ? 45 : 10, e.type === 'boss' ? 740 : 420);
    for (let i = 0; i < (e.type === 'boss' ? 18 : 5); i++) {
      addParticle({
        x: e.x + (Math.random() - 0.5) * e.w,
        y: e.y - Math.random() * e.h,
        vx: (Math.random() - 0.5) * size * 14,
        vy: -180 - Math.random() * size * 10,
        life: 0.8 + Math.random() * 1.5,
        size: 5 + Math.random() * size * 0.35,
        color: choose(['#0d0a0c', '#33242a', '#5a111e']),
        gravity: 1100,
        type: 'debris'
      });
    }
    hitStop(e.type === 'boss' ? 0.24 : 0.095, e.type === 'boss' ? 0.4 : 0.2);
    addShake(e.type === 'boss' ? 35 : 20);
    audio.kill();

    if (e.type === 'boss') {
      game.bossDeadTimer = 3.5;
      game.victoryTimer = 0;
      game.completed = true;
      game.bossActive = false;
      saveGame();
    }
  }

  function handleYoyoCombat(dt) {
    const pc = playerCenter();
    const ySpeed = hypot(yoyo.vx, yoyo.vy);
    const effective = ySpeed + yoyo.angularInput * 42 + yoyo.charge * 620;
    const chainHot = yoyo.active && yoyo.charge > 0.34;

    // The wheel is one small disc on a chain. Anything further away than the
    // chain can reach cannot be hit this step, so do not build its rectangle.
    const reachX = MAX_CHAIN + 120;
    for (const e of enemies) {
      if (!e.alive || (e.type === 'boss' && !game.bossActive)) continue;
      if (Math.abs(e.x - yoyo.x) > reachX && Math.abs(e.x - pc.x) > reachX) continue;
      const er = enemyRect(e);

      if (e.yoyoCooldown <= 0 && circleRect(yoyo.x, yoyo.y, yoyo.r + 3, er)) {
        let base = (4.5 + effective * 0.0125) * (player.power || 1);
        if (!yoyo.active) base *= 0.42;
        const big = effective > 930 || yoyo.charge > 0.76;
        if (big) base *= 1.3;

        // Armored wardens punish lazy frontal pokes but can be circled or overwhelmed.
        if (e.type === 'knight' && e.shield > 0) {
          const frontSide = sign0(yoyo.x - e.x) === e.facing;
          if (frontSide && effective < 980 && yoyo.charge < 0.72) {
            e.shield -= Math.max(4, base * 0.9);
            e.flash = 0.55;
            e.yoyoCooldown = 0.075;
            const nx = sign0(yoyo.x - e.x) || 1;
            yoyo.vx += nx * 320;
            yoyo.vy -= 80;
            sparkBurst(yoyo.x, yoyo.y, 12, 520, '#ffd18a');
            addShake(4);
            audio.hit(false);
            if (e.shield <= 0) {
              e.shield = 0;
              e.state = 'stagger';
              e.stateT = 0.85;
              stoneBurst(e.x + e.facing * 30, e.y - 58, 14, 510);
              sparkBurst(e.x + e.facing * 30, e.y - 58, 20, 680, '#ffe5b5');
              hitStop(0.09, 0.16);
              addShake(18);
              audio.seal();
            }
            continue;
          }
        }

        if (e.type === 'boss' && yoyo.charge < 0.18 && effective < 430) base *= 0.5;
        const velLen = hypot(yoyo.vx, yoyo.vy) || 1;
        const kx = yoyo.vx / velLen * (big ? 140 : 55);
        const ky = yoyo.vy / velLen * (big ? 90 : 35) - (big ? 55 : 10);
        damageEnemy(e, base, yoyo.x, yoyo.y, kx, ky, big);
        e.yoyoCooldown = yoyo.charge > 0.62 ? 0.043 : 0.068;
      }

      if (chainHot && e.chainCooldown <= 0 && lineHitsRect(pc.x, pc.y, yoyo.x, yoyo.y, er, 3)) {
        const chainDamage = (2.2 + yoyo.charge * 5.2) * (player.power || 1);
        const side = sign0(e.x - player.x) || player.facing;
        damageEnemy(e, chainDamage, clamp(e.x, pc.x, yoyo.x), e.y - e.h * 0.5, side * 18, -8, yoyo.charge > 0.9);
        e.chainCooldown = 0.12;
      }
    }

    for (const membrane of seals) {
      if (!membrane.alive) continue;
      if (yoyo.x + yoyo.r < membrane.x - 8 && pc.x < membrane.x - 8) continue;
      if (yoyo.x - yoyo.r > membrane.x + membrane.w + 8 && pc.x > membrane.x + membrane.w + 8) continue;
      let hitSomething = false;
      for (let i = 0; i < membrane.bands.length; i++) {
        const band = membrane.bands[i];
        if (band.hp <= 0 || band.flash > 0) continue;
        const rect = membraneBandRect(membrane, i);
        const swept = lineHitsRect(yoyo.prevX, yoyo.prevY, yoyo.x, yoyo.y, rect, yoyo.r + 2);
        const disc = circleRect(yoyo.x, yoyo.y, yoyo.r + 2, rect);
        const chainCut = chainHot && lineHitsRect(pc.x, pc.y, yoyo.x, yoyo.y, rect, 2);
        if (!swept && !disc && !chainCut) continue;

        const big = effective > 900 || yoyo.charge > 0.72;
        const damage = chainCut && !disc ? 4 + yoyo.charge * 8 : 8 + effective * 0.020;
        band.hp -= damage;
        band.flash = 0.065;
        hitSomething = true;
        const cy = membrane.y + (i + 0.5) * membrane.bandH;
        bloodBurst(membrane.x + membrane.w * 0.5, cy, big ? 14 : 8, big ? 590 : 390, sign0(yoyo.vx), -0.12);
        sparkBurst(clamp(yoyo.x, membrane.x, membrane.x + membrane.w), cy, big ? 10 : 5, big ? 560 : 350, '#ff8a92');
        if (band.hp <= 0) {
          band.hp = 0;
          for (let k = 0; k < 5; k++) addParticle({
            x: membrane.x + hash(i * 17 + k) * membrane.w,
            y: cy + (hash(i * 31 + k) - 0.5) * membrane.bandH,
            vx: (hash(i * 47 + k) - 0.5) * 430,
            vy: -90 - hash(i * 59 + k) * 280,
            life: 0.65 + hash(i * 71 + k) * 0.65,
            size: 4 + hash(i * 83 + k) * 8,
            color: choose(['#8e142a', '#d52a45', '#5c0a18', '#d7a9a0']),
            gravity: 1050,
            type: 'debris'
          });
          hitStop(big ? 0.055 : 0.032, big ? 0.12 : 0.06);
          addShake(big ? 12 : 7);
        } else {
          hitStop(big ? 0.032 : 0.012, big ? 0.08 : 0.025);
          addShake(big ? 7 : 3);
        }
        audio.hit(big);
        break;
      }

      if (!membrane.breached && membranePassable(membrane)) {
        membrane.breached = true;
        membrane.breachFlash = 1;
        game.zoneTitle = 'GOREWEAVE BREACHED';
        game.zoneTitleTimer = 1.15;
        hitStop(0.11, 0.20);
        addShake(22);
        bloodBurst(membrane.x + membrane.w * 0.5, membrane.y + membrane.h * 0.52, 34, 720, sign0(yoyo.vx), -0.18);
        smokePuff(membrane.x + membrane.w * 0.5, membrane.y + membrane.h * 0.52, 12, '#40101c');
        audio.seal();
      }
      membrane.alive = membrane.bands.some(b => b.hp > 0);
      if (hitSomething) {
        invalidateMembraneSolids();
        yoyo.hitPulse = 1;
      }
    }
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        projectiles.splice(i, 1);
        continue;
      }
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 10) p.trail.length = 10;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.hostile && !p.reflected && circleRect(yoyo.x, yoyo.y, yoyo.r + 7, { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 })) {
        if (p.type === 'wave' || p.type === 'bigWave') {
          sparkBurst(p.x, p.y, 8, 420, '#ff6e4a');
          projectiles.splice(i, 1);
          continue;
        }
        const dx = p.x - yoyo.x;
        const dy = p.y - yoyo.y;
        const len = hypot(dx, dy) || 1;
        const speed = Math.max(480, hypot(p.vx, p.vy) * 1.35);
        p.vx = dx / len * speed + yoyo.vx * 0.35;
        p.vy = dy / len * speed + yoyo.vy * 0.35;
        p.hostile = false;
        p.reflected = true;
        sparkBurst(p.x, p.y, 10, 520, '#fff0c2');
        hitStop(0.025, 0.06);
        audio.tone(330, 0.08, 'square', 0.05, 140);
      }

      if (p.hostile && circleRect(p.x, p.y, p.r, playerRect())) {
        damagePlayer(p.damage, sign0(p.vx) || 1, -220);
        projectiles.splice(i, 1);
        continue;
      }

      if (!p.hostile) {
        let consumed = false;
        for (const e of enemies) {
          if (!e.alive || e.type === 'boss' && !game.bossActive) continue;
          if (circleRect(p.x, p.y, p.r, enemyRect(e))) {
            damageEnemy(e, 18 + yoyo.charge * 10, p.x, p.y, p.vx * 0.12, p.vy * 0.08, true);
            consumed = true;
            break;
          }
        }
        if (consumed) {
          projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.y > 950 || p.x < -300 || p.x > WORLD_W + 300) projectiles.splice(i, 1);
    }
  }

  function bossAlive() {
    const boss = enemies.find(e => e.type === 'boss');
    return !!(boss && boss.alive);
  }

  // ---------------------------------------------------------------------------
  // Camera and main simulation.
  // ---------------------------------------------------------------------------

  function updateCamera(dt) {
    // Lookahead used to be raw velocity, so the target jumped 115px the instant
    // she stopped and 230px on a turn, and the camera visibly recoiled chasing
    // it. Easing the lookahead slower than the camera follows means the target
    // never presents a step to chase.
    game.camera.look = lerp(game.camera.look, player.vx * 0.32, 1 - Math.exp(-dt * 3.0));
    let desired = player.x - W * 0.38 + game.camera.look;
    if (game.bossActive && bossAlive()) {
      const throne = AREAS[AREAS.length - 1];
      desired = clamp(desired, throne.x0 + 40, WORLD_W - W);
    }
    desired = clamp(desired, 0, WORLD_W - W);
    game.camera.targetX = desired;
    game.camera.x = lerp(game.camera.x, desired, 1 - Math.exp(-dt * 5.5));
    const desiredY = clamp(player.y - H * 0.70 + player.vy * 0.10, 0, 210);
    game.camera.targetY = desiredY;
    game.camera.y = lerp(game.camera.y, desiredY, 1 - Math.exp(-dt * 5.2));

    game.shake = Math.max(0, game.shake - dt * 28);
    const magnitude = game.shake;
    const phase = game.realTime * 48;
    game.shakeX = Math.sin(phase * 1.13 + 0.7) * magnitude * 0.82 + Math.sin(phase * 2.31) * magnitude * 0.18;
    game.shakeY = Math.sin(phase * 1.73 + 2.1) * magnitude * 0.56;
  }

  function updateGame(dt) {
    game.titleFade = Math.max(0, game.titleFade - dt * 0.7);

    if (input.consumePause() && game.state !== 'title' && game.state !== 'victory') {
      if (game.relicsOpen) game.relicsOpen = false;
      else {
        game.paused = !game.paused;
        if (game.paused) saveGame();
      }
    }

    game.relicNudge = Math.max(0, game.relicNudge - dt);

    if (game.state === 'playing' && !game.paused && !game.relicsOpen && player.relicPoints > 0) {
      const tap = input.tapQueue;
      const b = RELIC_BADGE;
      if (tap && tap.x >= b.x && tap.x <= b.x + b.w && tap.y >= b.y && tap.y <= b.y + b.h) {
        input.consumeTap();
        game.relicsOpen = true;
        game.relicNudge = 0;
        saveGame();
        audio.tone(320, 0.1, 'triangle', 0.05, 60);
      }
    }

    if (game.state === 'playing' && !game.paused && (input.keyPressed('Tab') || input.keyPressed('KeyE'))) {
      game.relicsOpen = !game.relicsOpen;
      if (game.relicsOpen) { saveGame(); game.relicNudge = 0; }
      audio.tone(game.relicsOpen ? 320 : 180, 0.1, 'triangle', 0.05, game.relicsOpen ? 60 : -60);
    }

    if (game.relicsOpen) {
      if (game.state !== 'playing') { game.relicsOpen = false; }
      else {
        if (input.keyPressed('KeyW') || input.keyPressed('ArrowUp')) {
          game.relicCursor = (game.relicCursor + RELICS.length - 1) % RELICS.length;
          audio.tone(300, 0.05, 'square', 0.03, 0);
        }
        if (input.keyPressed('KeyS') || input.keyPressed('ArrowDown')) {
          game.relicCursor = (game.relicCursor + 1) % RELICS.length;
          audio.tone(300, 0.05, 'square', 0.03, 0);
        }
        if (input.keyPressed('Space') || input.keyPressed('Enter') || input.keyPressed('KeyD') || input.keyPressed('ArrowRight')) {
          if (!spendRelic(RELICS[game.relicCursor].key)) audio.tone(90, 0.08, 'square', 0.03, -30);
        }
        const tap = input.consumeTap();
        if (tap) {
          let onRow = false;
          for (const r of relicHit) {
            if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) {
              onRow = true;
              game.relicCursor = r.index;
              if (!spendRelic(r.key)) audio.tone(90, 0.08, 'square', 0.03, -30);
              break;
            }
          }
          if (!onRow) {
            game.relicsOpen = false;
            audio.tone(180, 0.1, 'triangle', 0.05, -60);
          }
        }
        input.consumeJump();
        audio.update(yoyo, 'paused');
        return;
      }
    }
    if (input.keyPressed('KeyM')) audio.toggleMute();
    if (input.keyPressed('KeyF')) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else canvas.parentElement.requestFullscreen?.().catch(() => {});
    }
    if (input.keyPressed('KeyR') && game.state !== 'title') {
      if (game.state === 'victory') restartFullRun();
      else restartFromCheckpoint();
    }

    if (game.state === 'title') {
      if (input.keyPressed('KeyN')) {
        restartFullRun();
        audio.ensure();
      } else if (input.consumeAny() || input.mouse.down || input.rightTouch || input.leftTouch) {
        startGame();
      }
      updateYoyo(dt * 0.25);
      updateParticles(dt);
      updateCamera(dt);
      return;
    }

    if (game.paused) {
      audio.update(yoyo, 'paused');
      return;
    }

    game.zoneTitleTimer = Math.max(0, game.zoneTitleTimer - dt);
    player.levelFlash = Math.max(0, player.levelFlash - dt);
    game.flash = Math.max(0, game.flash - dt * 4.8);
    game.redFlash = Math.max(0, game.redFlash - dt * 2.5);
    for (const membrane of seals) {
      membrane.breachFlash = Math.max(0, membrane.breachFlash - dt * 2.4);
      for (const band of membrane.bands) band.flash = Math.max(0, band.flash - dt);
    }

    if (game.state === 'playing') {
      game.time += dt;
      game.helpFade = Math.max(0, game.helpFade - dt * 0.07);
    }

    if (game.state === 'dead') {
      game.deathTimer -= dt;
      player.vy += 1800 * dt;
      player.y += player.vy * dt;
      updateParticles(dt);
      updateCamera(dt);
      if (game.deathTimer <= 0) restartFromCheckpoint();
      return;
    }

    if (game.state === 'victory') {
      game.victoryTimer += dt;
      updateParticles(dt);
      updateCamera(dt);
      if (game.victoryTimer > 0.8 && input.consumeAny()) restartFullRun();
      return;
    }

    updateYoyo(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    handleYoyoCombat(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateCamera(dt);
    audio.update(yoyo, game.state);

    if (game.bossDeadTimer > 0) {
      game.bossDeadTimer -= dt;
      if (game.bossDeadTimer <= 0) {
        game.state = 'victory';
        game.victoryTimer = 0;
        audio.tone(65, 1.8, 'triangle', 0.09, 130);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering.
  // ---------------------------------------------------------------------------

  function zoneAtX(x) {
    return areaIndexAt(x);
  }

  function drawArch(g, x, y, w, h, fill, stroke, alpha = 1) {
    g.save();
    g.globalAlpha = alpha;
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + w * 0.52);
    g.arc(x + w / 2, y + w * 0.52, w / 2, Math.PI, 0);
    g.lineTo(x + w, y + h);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); }
    g.restore();
  }

  // One cathedral, not twelve rooms in a row. Near a district line the two
  // districts are mixed — palette, panorama and the air itself — so the picture
  // changes the way walking changes it instead of cutting when the title card
  // fires. The blend is centred on the boundary: it starts BLEND_SPAN before the
  // line and finishes BLEND_SPAN after it.
  const BLEND_SPAN = 900;
  const districtMix = { from: 0, to: 0, t: 0 };

  function districtMixAt(x) {
    const i = areaIndexAt(x);
    const area = AREAS[i];
    const toStart = x - area.x0;
    const toEnd = area.x1 - x;
    districtMix.from = i;
    districtMix.to = i;
    districtMix.t = 0;
    if (i > 0 && toStart < BLEND_SPAN) {
      districtMix.from = i - 1;
      districtMix.to = i;
      districtMix.t = 0.5 + 0.5 * (toStart / BLEND_SPAN);
    } else if (i < AREAS.length - 1 && toEnd < BLEND_SPAN) {
      districtMix.from = i;
      districtMix.to = i + 1;
      districtMix.t = 0.5 - 0.5 * (toEnd / BLEND_SPAN);
    }
    return districtMix;
  }

  const hexCache = new Map();
  function parseHex(hex) {
    let v = hexCache.get(hex);
    if (v) return v;
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(hex, v);
    return v;
  }

  function mixHex(a, b, t) {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const ca = parseHex(a);
    const cb = parseHex(b);
    return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * t)},${Math.round(ca[1] + (cb[1] - ca[1]) * t)},${Math.round(ca[2] + (cb[2] - ca[2]) * t)})`;
  }

  function drawPanorama(g, image, camX, parallax, alpha) {
    if (alpha <= 0.004) return;
    if (!image || !image.complete || !image.naturalWidth) return;
    const scale = H / image.naturalHeight;
    const span = image.naturalWidth * scale;
    const raw = Math.round(camX * parallax);
    const offset = Math.round(((raw % span) + span) % span);
    g.save();
    g.globalAlpha = alpha;
    for (let x = -offset - span; x < W + span; x += span) g.drawImage(image, x, 0, span, H);
    g.restore();
  }

  // District-specific air. Continuous motion, fixed particles, and now fadeable
  // so two districts' weather can overlap across a boundary.
  function drawAtmosphere(g, bgId, zoneSeed, alpha) {
    if (alpha <= 0.01) return;
    if (bgId === 1 || bgId === 7) {
      g.save();
      g.globalAlpha = alpha;
      g.globalCompositeOperation = 'screen';
      for (let i = 0; i < (COARSE_POINTER ? 44 : 90); i++) {
        const speed = 22 + (i % 9) * 7;
        const x = (hash(i * 41 + zoneSeed * 71) * (W + 160) + game.time * (6 + i % 5)) % (W + 160) - 80;
        const y = (hash(i * 73 + zoneSeed * 13) * H - game.time * speed + H * 8) % H;
        const a = 0.10 + hash(i * 19) * 0.30;
        g.fillStyle = bgId === 1 ? `rgba(255,118,43,${a})` : `rgba(255,54,75,${a * 0.72})`;
        g.fillRect(x, y, 1 + (i % 2), 2 + (i % 4));
      }
      g.restore();
    } else if (bgId === 2 || bgId === 4) {
      g.save();
      g.globalAlpha = alpha;
      g.strokeStyle = 'rgba(130,148,190,0.105)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (let i = 0; i < (COARSE_POINTER ? 34 : 70); i++) {
        const x = (hash(i * 31) * (W + 260) + game.time * 150) % (W + 260) - 130;
        const y = (hash(i * 53) * H + game.time * (280 + i % 5 * 24)) % H;
        g.moveTo(x, y); g.lineTo(x - 22, y + 54);
      }
      g.stroke();
      g.restore();
    } else {
      g.save();
      g.globalAlpha = alpha;
      g.fillStyle = 'rgba(196,172,180,0.14)';
      for (let i = 0; i < (COARSE_POINTER ? 28 : 55); i++) {
        const x = (hash(i * 47) * (W + 100) + game.time * (3 + i % 4)) % (W + 100) - 50;
        const y = (hash(i * 79) * H - game.time * (2 + i % 3) + H * 4) % H;
        g.fillRect(x, y, 1, 1);
      }
      g.restore();
    }
  }

  function drawBackground(g, camX) {
    const mix = districtMixAt(player.x);
    const from = AREAS[mix.from] || AREAS[0];
    const to = AREAS[mix.to] || from;
    const t = mix.from === mix.to ? 0 : smoothstep(clamp(mix.t, 0, 1));

    const fallback = g.createLinearGradient(0, 0, 0, H);
    fallback.addColorStop(0, mixHex(from.pal[0], to.pal[0], t));
    fallback.addColorStop(0.62, mixHex(from.pal[1], to.pal[1], t));
    fallback.addColorStop(1, mixHex(from.pal[2], to.pal[2], t));
    g.fillStyle = fallback;
    g.fillRect(0, 0, W, H);

    // Both panoramas ride the same parallax rate through the crossing, so the
    // two pictures slide together and the seam never reads as two walls.
    const rateFrom = from.bg === 3 ? 0.08 : 0.16;
    const rateTo = to.bg === 3 ? 0.08 : 0.16;
    const parallax = lerp(rateFrom, rateTo, t);
    if (from.bg === to.bg) {
      drawPanorama(g, bgImages[from.bg], camX, parallax, 0.98);
    } else {
      drawPanorama(g, bgImages[from.bg], camX, parallax, 0.98);
      drawPanorama(g, bgImages[to.bg], camX, parallax, 0.98 * t);
    }

    // Soft play-band dim so painted architecture stays behind the actors.
    g.save();
    g.translate(0, H * 0.28);
    g.fillStyle = cachedVGradient(g, 'playDim', H * 0.72, [
      [0, 'rgba(0,0,0,0)'],
      [0.55, 'rgba(4,1,6,0.10)'],
      [1, 'rgba(2,1,3,0.22)']
    ]);
    g.fillRect(0, -H * 0.28, W, H);
    g.restore();

    if (from.bg === to.bg) {
      drawAtmosphere(g, from.bg, mix.from, 1);
    } else {
      drawAtmosphere(g, from.bg, mix.from, 1 - t);
      drawAtmosphere(g, to.bg, mix.to, t);
    }

    const mistFrom = mix.from === 1 ? 'rgba(88,20,8,0.08)' : 'rgba(45,10,24,0.10)';
    const mistTo = mix.to === 1 ? 'rgba(88,20,8,0.08)' : 'rgba(45,10,24,0.10)';
    const floorMist = g.createLinearGradient(0, H * 0.70, 0, H);
    floorMist.addColorStop(0, 'rgba(7,4,8,0)');
    floorMist.addColorStop(0.72, t < 0.5 ? mistFrom : mistTo);
    floorMist.addColorStop(1, 'rgba(2,1,3,0.28)');
    g.fillStyle = floorMist;
    g.fillRect(0, H * 0.62, W, H * 0.38);
  }

  function drawBackgroundChain(g, x, y, length, radius, alpha = 1) {
    g.save();
    g.globalAlpha = alpha;
    g.strokeStyle = '#24191d';
    g.lineWidth = 3;
    const links = Math.ceil(length / (radius * 1.55));
    for (let i = 0; i < links; i++) {
      g.save();
      g.translate(x, y + i * radius * 1.55);
      g.rotate(i % 2 ? Math.PI / 2 : 0);
      g.beginPath();
      g.ellipse(0, 0, radius * 0.55, radius, 0, 0, TAU);
      g.stroke();
      g.restore();
    }
    g.restore();
  }

  function drawPlatform(g, p) {
    const zone = p.zone;
    const isFoundry = zone === 1 || zone === 6 || zone === 10;
    const isBone = zone === 2 || zone === 7 || zone === 11;
    const kind = isFoundry ? 'f' : isBone ? 'b' : 'n';
    ensurePatterns(g);
    const pat = isFoundry ? tilePatterns.foundry : isBone ? tilePatterns.spire : tilePatterns.nave;

    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(p.x + 8, p.y + 14, p.w, Math.max(18, p.h));

    // Gradients below are authored from y=0 and used under a y-translate, which
    // is exactly equivalent to the old per-platform ones and lets them be cached.
    g.translate(0, p.y);

    if (pat) {
      g.fillStyle = pat;
      g.fillRect(p.x, 0, p.w, p.h);
      const shadeH = Math.min(p.h, 240);
      g.fillStyle = cachedVGradient(g, 'shade' + shadeH, shadeH, [
        [0, 'rgba(0,0,0,0.08)'],
        [0.08, 'rgba(0,0,0,0.38)'],
        [1, 'rgba(0,0,0,0.72)']
      ]);
      g.fillRect(p.x, 0, p.w, p.h);
      if (isBone && pat !== tilePatterns.spire) {
        g.fillStyle = 'rgba(24, 14, 38, 0.34)';
        g.fillRect(p.x, 0, p.w, p.h);
      }
    } else {
      const bodyH = Math.min(p.h, 220);
      g.fillStyle = cachedVGradient(g, 'body' + kind + bodyH, bodyH, [
        [0, isFoundry ? '#5e271c' : isBone ? '#38202b' : '#3c252d'],
        [0.05, isFoundry ? '#26100d' : '#1b1218'],
        [0.42, '#0e0b0f'],
        [1, '#050406']
      ]);
      g.fillRect(p.x, 0, p.w, p.h);
    }

    g.fillStyle = cachedVGradient(g, 'cap' + kind, 12, [
      [0, isFoundry ? 'rgba(210,140,90,0.38)' : isBone ? 'rgba(180,150,170,0.28)' : 'rgba(210,180,175,0.32)'],
      [0.4, 'rgba(12,8,10,0.55)'],
      [1, 'rgba(0,0,0,0)']
    ]);
    g.fillRect(p.x, 0, p.w, p.oneWay ? 10 : 12);
    g.translate(0, -p.y);
    g.fillStyle = 'rgba(255,220,200,0.22)';
    g.fillRect(p.x, p.y, p.w, 2);

    if (p.oneWay) {
      g.fillStyle = '#09070a';
      for (let x = p.x + 12; x < p.x + p.w - 10; x += 34) {
        g.beginPath();
        g.moveTo(x, p.y + p.h - 2); g.lineTo(x + 10, p.y + p.h + 16 + hash(x * 0.11) * 15); g.lineTo(x + 21, p.y + p.h - 2);
        g.closePath(); g.fill();
      }
      g.strokeStyle = isFoundry ? '#6d3726' : '#4e2a36';
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(p.x, p.y + p.h - 4); g.lineTo(p.x + p.w, p.y + p.h - 4); g.stroke();
    }
    g.restore();
  }

  function drawHazard(g, h) {
    if (h.type !== 'spikes') return;
    const count = Math.ceil(h.w / 22);
    g.save();
    g.shadowColor = '#d8273e';
    g.shadowBlur = 8;
    for (let i = 0; i < count; i++) {
      const x = h.x + i * h.w / count;
      const w = h.w / count;
      const grad = g.createLinearGradient(x, h.y, x + w, h.y + h.h);
      grad.addColorStop(0, '#d6a0a1');
      grad.addColorStop(0.22, '#7d3844');
      grad.addColorStop(0.75, '#241016');
      grad.addColorStop(1, '#070407');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x, h.y + h.h);
      g.lineTo(x + w * 0.48, h.y - (i % 3) * 5);
      g.lineTo(x + w, h.y + h.h);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,221,208,0.20)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + w * 0.48, h.y + 1); g.lineTo(x + w * 0.22, h.y + h.h - 2); g.stroke();
    }
    g.restore();
  }

  function drawHook(g, h) {
    const latched = yoyo.latched === h;
    const pc = playerCenter();
    const reachable = hypot(pc.x - h.x, pc.y - h.y) < MAX_CHAIN + 48;
    const close = hypot(yoyo.x - h.x, yoyo.y - h.y) < 125;
    const pulse = 0.5 + Math.sin(game.time * 3.2 + h.pulse) * 0.5;
    const active = latched || (yoyo.active && reachable && close);

    const hookPainted = sprReady('hook');
    const hookH = 118;
    const hookAy = 0.65;
    drawBackgroundChain(g, h.x, 0, Math.max(0, h.y - (hookPainted ? hookH * hookAy - 10 : 38)), 9, 0.92);
    g.save();
    g.translate(h.x, h.y);

    // Three states, three cached halos; the breathing is carried by alpha.
    const haloKey = latched ? 'haloLatched' : active ? 'haloActive' : 'haloIdle';
    g.save();
    g.globalAlpha = latched ? 1 : 0.72 + pulse * 0.28;
    g.fillStyle = cachedRGradient(g, haloKey, 5, active ? 104 : 73, [
      [0, latched ? 'rgba(255,239,224,0.62)' : 'rgba(255,83,104,0.32)'],
      [0.28, active ? 'rgba(255,35,70,0.25)' : 'rgba(177,16,44,0.13)'],
      [1, 'rgba(255,0,40,0)']
    ]);
    g.fillRect(-115, -115, 230, 230);
    g.restore();

    if (hookPainted) {
      const { w, img } = spriteSize('hook', hookH);
      g.rotate(Math.sin(game.time * 0.55 + h.pulse) * 0.025);
      g.drawImage(scaledSprite(img, w, hookH), -w * 0.492, -hookH * hookAy, w, hookH);
      g.restore();
      return;
    }

    g.rotate(Math.sin(game.time * 0.55 + h.pulse) * 0.025);
    // Ceiling clevis.
    const clevis = g.createLinearGradient(-26, -48, 26, -18);
    clevis.addColorStop(0, '#161217'); clevis.addColorStop(0.48, '#7c4e58'); clevis.addColorStop(1, '#0b090d');
    g.fillStyle = clevis;
    roundedRectPath(g, -25, -45, 50, 25, 8); g.fill();
    g.strokeStyle = '#a04455'; g.lineWidth = 2; g.stroke();

    // Triple-claw grapple ring. High-contrast center is the aim target.
    const metal = g.createRadialGradient(-10, -12, 3, 0, 0, 42);
    metal.addColorStop(0, latched ? '#fff4e7' : '#c9959d');
    metal.addColorStop(0.28, '#5d3b43');
    metal.addColorStop(0.62, '#191318');
    metal.addColorStop(1, '#050406');
    g.fillStyle = metal;
    g.beginPath(); g.arc(0, 8, 37, 0, TAU); g.fill();
    g.strokeStyle = active ? '#e84b63' : '#7c2d3d'; g.lineWidth = active ? 5 : 4; g.stroke();
    g.fillStyle = '#050407'; g.beginPath(); g.arc(0, 8, 19, 0, TAU); g.fill();
    g.strokeStyle = latched ? '#ffe6d7' : '#ba4054'; g.lineWidth = 3; g.stroke();

    for (let i = 0; i < 3; i++) {
      g.save(); g.rotate(i * TAU / 3 + Math.PI / 2);
      const claw = g.createLinearGradient(20, 0, 54, 0);
      claw.addColorStop(0, '#2b1b21'); claw.addColorStop(0.65, '#6d3d47'); claw.addColorStop(1, '#c65a67');
      g.fillStyle = claw;
      g.beginPath();
      g.moveTo(25, -8); g.quadraticCurveTo(49, -12, 58, -2); g.lineTo(43, 4); g.lineTo(26, 8); g.closePath();
      g.fill(); g.strokeStyle = '#180d12'; g.lineWidth = 2; g.stroke();
      g.restore();
    }
    g.fillStyle = latched ? '#fff1dc' : '#ff4c68';
    g.beginPath(); g.arc(0, 8, 5 + (active ? pulse * 2 : 0), 0, TAU); g.fill();
    g.restore();
  }

  // A cache is a small hung reliquary. It has to read as "worth the detour"
  // from across a district, so it breathes light rather than sitting still.
  function drawCache(g, c) {
    const pulse = 0.5 + Math.sin(game.time * 2.6 + c.pulse) * 0.5;
    const bob = Math.sin(game.time * 1.5 + c.pulse) * 4;
    g.save();
    g.translate(c.x, c.y - 52 + bob);

    g.globalAlpha = 0.35 + pulse * 0.4;
    g.fillStyle = cachedRGradient(g, 'cacheHalo', 4, 86, [
      [0, 'rgba(255,226,150,0.55)'],
      [0.34, 'rgba(226,140,40,0.20)'],
      [1, 'rgba(210,110,0,0)']
    ]);
    g.fillRect(-92, -92, 184, 184);
    g.globalAlpha = 1;

    // Chain up into the dark.
    g.strokeStyle = 'rgba(46,32,30,0.85)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -30); g.lineTo(0, -30 - (c.y - 220)); g.stroke();

    g.rotate(Math.sin(game.time * 0.8 + c.pulse) * 0.06);
    const body = cachedVGradient(g, 'cacheBody', 54, [
      [0, '#d8b25e'],
      [0.3, '#8a5f24'],
      [0.72, '#3a2410'],
      [1, '#140c07']
    ]);
    g.save();
    g.translate(0, -27);
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(0, -30); g.lineTo(22, -10); g.lineTo(22, 16); g.lineTo(0, 32); g.lineTo(-22, 16); g.lineTo(-22, -10);
    g.closePath(); g.fill();
    g.strokeStyle = '#f0d089'; g.lineWidth = 2; g.stroke();
    g.fillStyle = `rgba(255,236,182,${0.45 + pulse * 0.55})`;
    g.beginPath(); g.arc(0, 2, 7 + pulse * 2.5, 0, TAU); g.fill();
    g.restore();
    g.restore();
  }

  function drawSeal(g, membrane) {
    if (!membrane.alive) return;
    const cx = membrane.x + membrane.w / 2;
    const cy = membrane.y + membrane.h / 2;
    g.save();

    const glow = g.createRadialGradient(cx, cy, 8, cx, cy, 190);
    glow.addColorStop(0, membrane.breachFlash > 0 ? `rgba(255,230,220,${0.30 * membrane.breachFlash})` : 'rgba(178,18,48,0.16)');
    glow.addColorStop(1, 'rgba(255,0,30,0)');
    g.fillStyle = glow; g.fillRect(cx - 210, cy - 260, 420, 520);

    // Black iron vertebrae on either edge frame the living curtain.
    for (const side of [-1, 1]) {
      const x = cx + side * (membrane.w * 0.57);
      const rail = g.createLinearGradient(x - 8, 0, x + 8, 0);
      rail.addColorStop(0, '#050406'); rail.addColorStop(0.5, '#4b232e'); rail.addColorStop(1, '#080609');
      g.fillStyle = rail; g.fillRect(x - 7, membrane.y - 16, 14, membrane.h + 32);
      for (let yy = membrane.y - 5; yy < membrane.y + membrane.h; yy += 30) {
        g.fillStyle = '#7b2638'; g.beginPath(); g.arc(x, yy, 4, 0, TAU); g.fill();
      }
    }

    // Intact bands are independent physical tissue. Broken bands leave actual
    // holes and ragged, moving stumps rather than turning the whole wall off.
    for (let i = 0; i < membrane.bands.length; i++) {
      const band = membrane.bands[i];
      const y0 = membrane.y + i * membrane.bandH;
      const bh = membrane.bandH + 1;
      const wobble = Math.sin(game.time * 1.45 + band.seed * 9) * 2.1;
      if (band.hp <= 0) {
        const stub = 12 + band.seed * 13;
        g.fillStyle = '#42101d';
        g.beginPath();
        g.moveTo(membrane.x - 2, y0); g.lineTo(membrane.x + stub, y0 + bh * 0.34 + wobble);
        g.lineTo(membrane.x + 4, y0 + bh); g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(membrane.x + membrane.w + 2, y0); g.lineTo(membrane.x + membrane.w - stub, y0 + bh * 0.62 - wobble);
        g.lineTo(membrane.x + membrane.w - 4, y0 + bh); g.closePath(); g.fill();
        continue;
      }

      const health = clamp(band.hp / band.maxHp, 0, 1);
      const flash = clamp(band.flash * 16, 0, 1);
      const left = membrane.x + 4 + Math.sin(i * 1.31) * 3;
      const right = membrane.x + membrane.w - 4 + Math.sin(i * 1.83) * 3;

      if (sprReady('goreweave')) {
        g.save();
        g.beginPath();
        g.moveTo(left, y0 + 1);
        g.quadraticCurveTo(cx + wobble * 3, y0 - 5 + band.seed * 7, right, y0 + 2);
        g.lineTo(right - 1, y0 + bh - 1);
        g.quadraticCurveTo(cx - wobble * 2, y0 + bh + 5 - band.seed * 7, left + 1, y0 + bh - 1);
        g.closePath();
        g.clip();
        const img = sprites.goreweave;
        const srcY = (i / membrane.bands.length) * img.naturalHeight;
        const srcH = Math.max(1, img.naturalHeight / membrane.bands.length);
        g.globalAlpha = 0.82 + health * 0.18;
        g.drawImage(img, 0, srcY, img.naturalWidth, srcH, membrane.x - 6, y0 - 2, membrane.w + 12, bh + 4);
        if (flash > 0) {
          g.fillStyle = `rgba(255,230,220,${flash * 0.45})`;
          g.fillRect(membrane.x, y0, membrane.w, bh);
        }
        g.restore();
        g.strokeStyle = flash > 0 ? `rgba(255,245,230,${0.4 + flash * 0.5})` : 'rgba(246,87,102,0.22)';
        g.lineWidth = 1.2 + health;
        g.beginPath();
        g.moveTo(left + 4, y0 + bh * 0.55);
        g.bezierCurveTo(cx - 22, y0 + bh * (0.10 + band.seed * 0.4), cx + 19, y0 + bh * (0.9 - band.seed * 0.35), right - 4, y0 + bh * 0.46);
        g.stroke();
        continue;
      }

      const tissue = g.createLinearGradient(left, y0, right, y0 + bh);
      tissue.addColorStop(0, '#17070d');
      tissue.addColorStop(0.24, flash > 0 ? '#ffd2cd' : '#75172b');
      tissue.addColorStop(0.52, flash > 0 ? '#fff2e7' : `rgb(${Math.floor(112 + health * 45)},${Math.floor(17 + health * 15)},${Math.floor(35 + health * 18)})`);
      tissue.addColorStop(0.8, flash > 0 ? '#b76068' : '#45101d');
      tissue.addColorStop(1, '#10070b');
      g.fillStyle = tissue;
      g.beginPath();
      g.moveTo(left, y0 + 1);
      g.quadraticCurveTo(cx + wobble * 3, y0 - 5 + band.seed * 7, right, y0 + 2);
      g.lineTo(right - 1, y0 + bh - 1);
      g.quadraticCurveTo(cx - wobble * 2, y0 + bh + 5 - band.seed * 7, left + 1, y0 + bh - 1);
      g.closePath(); g.fill();

      g.strokeStyle = flash > 0 ? `rgba(255,245,230,${0.4 + flash * 0.5})` : 'rgba(246,87,102,0.27)';
      g.lineWidth = 1.5 + health * 1.5;
      g.beginPath();
      g.moveTo(left + 4, y0 + bh * 0.55);
      g.bezierCurveTo(cx - 22, y0 + bh * (0.10 + band.seed * 0.4), cx + 19, y0 + bh * (0.9 - band.seed * 0.35), right - 4, y0 + bh * 0.46);
      g.stroke();
      g.fillStyle = '#d63b53';
      g.beginPath(); g.arc(cx + Math.sin(i * 2.3) * 16, y0 + bh * 0.5, 2 + health * 1.4, 0, TAU); g.fill();
    }

    // A few long tendons bind adjacent surviving strips into one wet organism.
    g.strokeStyle = 'rgba(119,25,44,0.58)';
    g.lineWidth = 5;
    for (let cord = 0; cord < 4; cord++) {
      const x = membrane.x + 18 + cord * (membrane.w - 36) / 3;
      g.beginPath();
      let drawing = false;
      for (let i = 0; i < membrane.bands.length; i++) {
        if (membrane.bands[i].hp <= 0) { drawing = false; continue; }
        const yy = membrane.y + (i + 0.5) * membrane.bandH;
        const xx = x + Math.sin(i * 0.8 + cord * 2.1 + game.time * 0.45) * 4;
        if (!drawing) { g.moveTo(xx, yy); drawing = true; } else g.lineTo(xx, yy);
      }
      g.stroke();
    }
    g.restore();
  }

  function drawBossGate(g) {
    if (!game.bossActive || !bossAlive()) return;
    const gate = bossGateRect();
    const x = gate.x + gate.w / 2;
    const grad = g.createLinearGradient(x - 35, 0, x + 35, 0);
    grad.addColorStop(0, 'rgba(80,0,15,0)');
    grad.addColorStop(0.5, 'rgba(245,20,48,0.62)');
    grad.addColorStop(1, 'rgba(80,0,15,0)');
    g.fillStyle = grad;
    g.fillRect(x - 45, 180, 90, 580);
    for (let yy = 200; yy < 760; yy += 38) {
      g.strokeStyle = '#351017';
      g.lineWidth = 8;
      g.beginPath();
      g.arc(x, yy, 20, 0, TAU);
      g.stroke();
    }
  }

  function drawYoyoTrail(g) {
    if (yoyo.trail.length < 2) return;
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.globalCompositeOperation = 'screen';
    const passes = [
      { width: 30 + yoyo.charge * 20, alpha: 0.055, color: '255,0,35' },
      { width: 12 + yoyo.charge * 10, alpha: 0.17, color: '255,24,57' },
      { width: 3 + yoyo.charge * 4, alpha: 0.62, color: '255,118,124' }
    ];
    for (const pass of passes) {
      for (let i = 1; i < yoyo.trail.length; i++) {
        const a = 1 - i / yoyo.trail.length;
        const p0 = yoyo.trail[i - 1]; const p1 = yoyo.trail[i];
        g.strokeStyle = `rgba(${pass.color},${pass.alpha * a})`;
        g.lineWidth = pass.width * (0.35 + a * 0.65);
        g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
      }
    }
    g.restore();
  }

  function handPosition() {
    const pc = playerCenter();
    const dx = yoyo.x - pc.x;
    const dy = yoyo.y - pc.y;
    const len = hypot(dx, dy) || 1;
    return { x: pc.x + dx / len * 23, y: pc.y + dy / len * 23 + 4 };
  }

  function drawChain(g) {
    const hand = handPosition();
    const endX = yoyo.latched ? yoyo.latched.x : yoyo.x;
    const endY = yoyo.latched ? yoyo.latched.y : yoyo.y;
    const dx = endX - hand.x;
    const dy = endY - hand.y;
    const len = hypot(dx, dy) || 1;
    const links = Math.max(1, Math.floor(len / 11));
    const hot = yoyo.charge;

    g.save();
    const sagAmount = yoyo.latched ? 0 : Math.min(18, len * 0.035);
    const pointAt = t => ({ x: hand.x + dx * t, y: hand.y + dy * t + Math.sin(t * Math.PI) * sagAmount });

    if (hot > 0.20) {
      g.globalCompositeOperation = 'screen';
      g.strokeStyle = `rgba(255,24,58,${0.10 + hot * 0.25})`;
      g.lineWidth = 9 + hot * 9;
      g.beginPath();
      for (let i = 0; i <= 18; i++) { const p = pointAt(i / 18); if (!i) g.moveTo(p.x,p.y); else g.lineTo(p.x,p.y); }
      g.stroke();
      g.globalCompositeOperation = 'source-over';
    }

    // Dark load-bearing cable beneath individual links keeps the rope readable.
    g.strokeStyle = '#09070a'; g.lineWidth = 5;
    g.beginPath();
    for (let i = 0; i <= 18; i++) { const p = pointAt(i / 18); if (!i) g.moveTo(p.x,p.y); else g.lineTo(p.x,p.y); }
    g.stroke();

    for (let i = 0; i <= links; i++) {
      const t = i / links;
      const p = pointAt(t);
      const next = pointAt(Math.min(1, t + 0.02));
      const a = Math.atan2(next.y - p.y, next.x - p.x) + (i % 2 ? Math.PI / 2 : 0);
      g.save(); g.translate(p.x, p.y); g.rotate(a);
      g.strokeStyle = hot > 0.62 ? '#e05266' : '#5d444b'; g.lineWidth = 2.4;
      g.beginPath(); g.ellipse(0, 0, 5.2, 3.1, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(245,205,204,0.18)'; g.lineWidth = 0.8;
      g.beginPath(); g.arc(-0.8, -0.5, 3.8, Math.PI * 1.05, Math.PI * 1.72); g.stroke();
      g.restore();
    }
    g.restore();
  }

  function drawYoyo(g) {
    const speed = hypot(yoyo.vx, yoyo.vy);
    const heat = clamp(speed / 1050 + yoyo.charge * 1.15, 0.12, 1.55);
    g.save();
    g.translate(yoyo.x, yoyo.y);
    g.rotate(yoyo.angle);

    g.globalCompositeOperation = 'screen';
    const glow = g.createRadialGradient(0, 0, 2, 0, 0, 78 + yoyo.charge * 42);
    glow.addColorStop(0, `rgba(255,243,225,${0.20 + yoyo.hitPulse * 0.45})`);
    glow.addColorStop(0.16, `rgba(255,54,75,${0.22 + heat * 0.18})`);
    glow.addColorStop(1, 'rgba(255,0,30,0)');
    g.fillStyle = glow; g.fillRect(-130, -130, 260, 260);
    g.globalCompositeOperation = 'source-over';

    if (sprReady('wheel')) {
      const d = 78 + yoyo.charge * 8;
      g.drawImage(scaledSprite(sprites.wheel, d, d), -d / 2, -d / 2, d, d);
      g.restore();
      return;
    }

    // Twenty hooked teeth read cleanly at speed and make contact feel vicious.
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * TAU;
      g.save(); g.rotate(a);
      const tooth = g.createLinearGradient(24, -5, 40, 4);
      tooth.addColorStop(0, '#171115');
      tooth.addColorStop(0.55, heat > 0.9 ? '#a24650' : '#584048');
      tooth.addColorStop(1, heat > 1.1 ? '#ffd4bc' : '#a2777c');
      g.fillStyle = tooth;
      g.beginPath(); g.moveTo(22, -5); g.lineTo(39 + (i % 2) * 3, -1); g.lineTo(31, 7); g.lineTo(22, 5); g.closePath(); g.fill();
      g.restore();
    }

    const outer = g.createRadialGradient(-10, -12, 2, 0, 0, 31);
    outer.addColorStop(0, yoyo.hitPulse > 0 ? '#fff8ed' : '#b99599');
    outer.addColorStop(0.25, '#5f464d');
    outer.addColorStop(0.56, '#25191e');
    outer.addColorStop(0.82, '#09070a');
    outer.addColorStop(1, '#020102');
    g.fillStyle = outer; g.beginPath(); g.arc(0, 0, 29, 0, TAU); g.fill();
    g.strokeStyle = heat > 0.75 ? '#dd3d55' : '#7d2b3b'; g.lineWidth = 4; g.stroke();

    // Spokes and counter-rotating inner spool.
    g.strokeStyle = heat > 1 ? 'rgba(255,191,177,0.72)' : 'rgba(146,65,77,0.66)';
    g.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); g.stroke();
    }
    g.rotate(-yoyo.angle * 1.7);
    const core = g.createRadialGradient(-3, -3, 1, 0, 0, 12);
    core.addColorStop(0, '#fff1dc'); core.addColorStop(0.22, '#ff5a70'); core.addColorStop(0.62, '#701326'); core.addColorStop(1, '#090509');
    g.fillStyle = core; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();
    g.strokeStyle = '#2a0b13'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#fff3df'; g.beginPath(); g.arc(-2, -2, 2.4 + yoyo.charge * 1.7, 0, TAU); g.fill();
    g.restore();
  }

  function drawPlayer(g) {
    const pc = playerCenter();
    const aimA = Math.atan2(yoyo.y - pc.y, yoyo.x - pc.x);
    const stride = Math.sin(player.runTime * 2.2);
    const airborne = !player.grounded;
    const lean = clamp(player.vx / 820, -0.28, 0.28);
    const swingAngle = yoyo.latched ? clamp(Math.atan2(player.vy, player.vx) * 0.08, -0.18, 0.18) : 0;

    // Grounding shadow.
    g.save();
    g.globalAlpha = player.grounded ? 0.42 : 0.18;
    g.fillStyle = '#000';
    g.beginPath(); g.ellipse(player.x, player.y + 3, airborne ? 17 : 31, 7, 0, 0, TAU); g.fill();
    g.restore();

    if (sprReady('hunter') || animReady(anims.hunterWalk)) {
      let img = null;
      if (player.animState === 'air') {
        // Air poses are chosen by what the body is DOING, not by a clock. A
        // time-cycled jump loop reads as a flipbook; picking the rise, the
        // apex, the fall and the dive off vertical speed reads as a jump.
        // The air set is ordered by meaning, not by time:
        //   0        the leap        rising hard
        //   1..8     the float loop  near the apex, where a body actually hangs
        //   9        the fall        descending
        //   10       the dive        falling fast, or moving fast on the rope
        // Eight of those eleven are a hang loop rather than an arc, so they are
        // cycled while she floats and the three arc poses are picked off speed.
        const air = anims.hunterAir;
        if (animReady(air)) {
          const vy = player.vy;
          const last = air.length - 1;
          const fast = yoyo.latched && hypot(player.vx, player.vy) > 720;
          let i;
          if (fast || vy > 520) i = last;
          else if (vy > 210) i = last - 1;
          else if (vy < -430) i = 0;
          else i = 1 + (Math.floor(player.animTime * 9) % Math.max(1, last - 2));
          img = air[clamp(i, 0, last)];
        }
      } else if (player.animState === 'walk') {
        img = animImg(anims.hunterWalk, player.animTime, 14);
      } else {
        img = animImg(anims.hunterIdle, player.animTime, 6);
      }
      if (!img || !img.complete || !img.naturalWidth) img = animImg(anims.hunterWalk, 0, 1) || sprites.hunter;
      if (img && img.complete && img.naturalWidth) {
        // The idle loop carries its own weight shift now that there are eight
        // real poses for it, so the procedural breath is only a whisper on top.
        const breath = player.animState === 'idle' ? Math.sin(game.realTime * 1.9) * 0.005 : 0;
        const sq = player.squash;
        const scaleY = 1 + sq + breath;
        const scaleX = 1 - sq * 0.72 - breath * 0.5;
        g.save();
        g.translate(player.x, player.y);
        g.rotate(lean * player.facing + swingAngle);
        if (player.invuln > 0) g.globalAlpha = 0.74 + Math.sin(game.realTime * 26) * 0.16;
        if (player.hurtFlash > 0) { g.shadowColor = '#ffe6d4'; g.shadowBlur = 22; }
        // Her body fills 0.747 of the new frame (the rest is headroom for a
        // sash that streams well past her boots), so the draw height has to be
        // 197 for her to stand the same 147px tall the game shipped with.
        const drawH = 197;
        const w = drawH * (img.naturalWidth / img.naturalHeight);
        g.scale(player.facing * scaleX, scaleY);
        g.drawImage(scaledSprite(img, w, drawH), -w * 0.50, -drawH + 3, w, drawH);
        g.restore();
        return;
      }
    }

    g.save();
    g.translate(player.x, player.y);
    g.scale(player.facing, 1);
    g.rotate(lean * player.facing + swingAngle);
    if (player.invuln > 0) g.globalAlpha = 0.74 + Math.sin(game.realTime * 26) * 0.16;

    const rim = g.createRadialGradient(-4, -55, 2, -4, -55, 86);
    rim.addColorStop(0, player.hurtFlash > 0 ? 'rgba(255,238,225,0.52)' : 'rgba(210,30,65,0.19)');
    rim.addColorStop(1, 'rgba(120,0,25,0)');
    g.fillStyle = rim; g.fillRect(-105, -155, 210, 205);

    const legPhase = airborne ? 0.45 : stride * 0.68;
    // Rear leg and boot.
    drawLimb(g, -8, -38, -11 + legPhase * 10, -18, -15 + legPhase * 16, 0, 11, '#0a090c');
    g.fillStyle = '#030304'; roundedRectPath(g, -25 + legPhase * 15, -7, 30, 10, 4); g.fill();
    // Front leg.
    drawLimb(g, 8, -39, 12 - legPhase * 10, -18, 16 - legPhase * 16, 0, 12, '#151116');
    g.fillStyle = '#050406'; roundedRectPath(g, -1 - legPhase * 15, -7, 32, 10, 4); g.fill();

    // Long split hunter coat with velocity-driven tails.
    const tail = clamp(-player.vx * 0.065, -30, 30);
    const coat = g.createLinearGradient(-36, -82, 30, -18);
    coat.addColorStop(0, '#3a252d'); coat.addColorStop(0.24, '#161116'); coat.addColorStop(0.72, '#08070a'); coat.addColorStop(1, '#020203');
    g.fillStyle = coat; g.strokeStyle = '#612333'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-24,-75); g.lineTo(21,-74); g.lineTo(27,-35);
    g.quadraticCurveTo(38-tail,-18,47-tail,-1);
    g.lineTo(8,-16); g.lineTo(-2,-37); g.lineTo(-16,-14);
    g.lineTo(-51-tail,-2); g.quadraticCurveTo(-39-tail,-28,-27,-38); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(186,63,81,0.28)';
    g.beginPath(); g.moveTo(-2,-68); g.lineTo(-2,-26); g.stroke();

    // Torso plates and red thread sash.
    const armor = g.createLinearGradient(-22, -84, 25, -38);
    armor.addColorStop(0, '#5d4b50'); armor.addColorStop(0.18, '#2b2428'); armor.addColorStop(0.58, '#0c0a0d'); armor.addColorStop(1, '#35121e');
    g.fillStyle = armor;
    g.beginPath(); g.moveTo(-22,-84); g.lineTo(19,-82); g.lineTo(24,-43); g.lineTo(0,-33); g.lineTo(-21,-44); g.closePath(); g.fill();
    g.strokeStyle = '#7f3141'; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = '#413137'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-16,-75); g.lineTo(15,-46); g.moveTo(15,-74); g.lineTo(-10,-47); g.stroke();
    g.fillStyle = '#a91835'; g.fillRect(-24,-50,49,6);
    g.fillStyle = '#e64a5e'; g.fillRect(1,-49,18,2);

    // Rear arm and shoulder pauldron.
    drawLimb(g, -13,-73,-31,-56,-36,-34,9,'#171218');
    const pauldron = g.createRadialGradient(-18,-75,2,-18,-75,18);
    pauldron.addColorStop(0,'#67535a'); pauldron.addColorStop(1,'#100c10');
    g.fillStyle=pauldron; g.beginPath(); g.ellipse(-18,-73,16,10,-0.3,0,TAU); g.fill(); g.strokeStyle='#6d2637'; g.stroke();

    // Hood and porcelain execution mask.
    g.fillStyle = '#08070a';
    g.beginPath(); g.moveTo(-18,-103); g.quadraticCurveTo(-5,-124,17,-108); g.lineTo(24,-87); g.lineTo(-18,-85); g.closePath(); g.fill();
    g.strokeStyle='#3f202b'; g.lineWidth=2; g.stroke();
    const mask = g.createLinearGradient(-10,-108,17,-87);
    mask.addColorStop(0, player.hurtFlash > 0 ? '#fff7ed' : '#e0d2cd'); mask.addColorStop(0.55,'#9d8a89'); mask.addColorStop(1,'#46383d');
    g.fillStyle=mask;
    g.beginPath(); g.moveTo(-9,-107); g.quadraticCurveTo(11,-112,19,-98); g.lineTo(14,-84); g.lineTo(-5,-87); g.closePath(); g.fill();
    g.strokeStyle='#2d1a20'; g.stroke();
    g.fillStyle='#17070c'; g.fillRect(1,-99,16,3);
    g.fillStyle='#ff3a55'; g.fillRect(10,-98,6,2);
    // Scarf/ribbon secondary motion.
    g.fillStyle='#8e1730';
    g.beginPath(); g.moveTo(-14,-88); g.quadraticCurveTo(-43-tail,-76,-58-tail,-55); g.lineTo(-25-tail,-64); g.lineTo(-8,-81); g.closePath(); g.fill();
    g.restore();

    // Weapon arm aims in world space so facing changes never invert controls.
    g.save();
    g.translate(player.x, player.y);
    const shoulderX = Math.cos(aimA) * 3;
    const shoulderY = -65 + Math.sin(aimA) * 3;
    const elbowX = shoulderX + Math.cos(aimA) * 26;
    const elbowY = shoulderY + Math.sin(aimA) * 26;
    const hand = handPosition();
    drawLimbAbsolute(g, shoulderX, shoulderY, elbowX, elbowY, hand.x - player.x, hand.y - player.y, 10, '#21181e');
    g.fillStyle='#6b2838'; g.beginPath(); g.arc(shoulderX,shoulderY,8,0,TAU); g.fill();
    g.fillStyle='#0b090c'; g.beginPath(); g.arc(hand.x-player.x,hand.y-player.y,7.5,0,TAU); g.fill();
    g.strokeStyle='#b74655'; g.lineWidth=2; g.stroke();
    g.restore();
  }

  function drawLimb(g, x1, y1, x2, y2, x3, y3, width, color) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.stroke();
  }

  function drawLimbAbsolute(g, x1, y1, x2, y2, x3, y3, width, color) {
    drawLimb(g, x1, y1, x2, y2, x3, y3, width, color);
  }

  function drawActorShadow(g, e, width, alpha = 0.34) {
    if (e.flying) return;
    g.save(); g.globalAlpha = alpha; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(e.x, e.y + 4, width, 7, 0, 0, TAU); g.fill(); g.restore();
  }

  function drawCrawler(g, e) {
    drawActorShadow(g, e, 34, 0.38);
    const coil = e.state === 'coil' ? 0.72 : e.state === 'pounce' ? 0.90 : 1;
    if (e.state === 'coil') {
      g.save(); g.translate(e.x, e.y);
      const warning = g.createRadialGradient(0,-24,3,0,-24,58); warning.addColorStop(0,'rgba(255,74,80,0.35)'); warning.addColorStop(1,'rgba(255,0,30,0)');
      g.fillStyle=warning; g.fillRect(-65,-85,130,120);
      g.restore();
    }
    {
      const img = animImg(anims.crawlerWalk, game.time * 1.35 + e.seed * 6, 12);
      if (img && drawAnimGround(g, img, e.x, e.y, 62, e.facing, { scaleY: coil, ax: 0.55, flash: e.flash > 0 })) return;
    }
    if (drawGroundSprite(g, 'crawler', e.x, e.y, 62, e.facing, { scaleY: coil, ax: 0.58, flash: e.flash > 0 })) return;
    const scuttle = Math.sin(game.time * 12 + e.seed) * 0.5;
    g.save(); g.translate(e.x, e.y); g.scale(e.facing, coil);
    if (e.state === 'coil') {
      const warning = g.createRadialGradient(0,-24,3,0,-24,58); warning.addColorStop(0,'rgba(255,74,80,0.35)'); warning.addColorStop(1,'rgba(255,0,30,0)');
      g.fillStyle=warning; g.fillRect(-65,-85,130,120);
    }
    // Six jointed limbs.
    for (let i=0;i<3;i++) {
      const yy=-10-i*10;
      drawLimb(g,-14,yy,-35-i*5,yy-8+scuttle*6,-48-i*6,2-i*4,6,'#1b1116');
      drawLimb(g,14,yy,35+i*5,yy-8-scuttle*6,48+i*6,2-i*4,6,'#120d11');
    }
    const body=g.createRadialGradient(-12,-30,3,0,-24,43);
    body.addColorStop(0,e.flash>0?'#fff0e7':'#a64a59'); body.addColorStop(.26,'#4b1b2a'); body.addColorStop(.68,'#160b12'); body.addColorStop(1,'#050306');
    g.fillStyle=body; g.beginPath(); g.ellipse(0,-25,36,24,0,0,TAU); g.fill(); g.strokeStyle='#6d2538'; g.lineWidth=3; g.stroke();
    // Bone faceplate and mandibles.
    g.fillStyle=e.flash>0?'#fff8ed':'#b5a39f';
    g.beginPath(); g.moveTo(13,-42); g.lineTo(36,-34); g.lineTo(31,-17); g.lineTo(10,-13); g.closePath(); g.fill();
    g.strokeStyle='#332128'; g.stroke();
    g.fillStyle='#ff294a'; g.fillRect(22,-31,9,3);
    g.strokeStyle='#7c2638'; g.lineWidth=4;
    g.beginPath(); g.moveTo(28,-18); g.lineTo(43,-7); g.moveTo(22,-15); g.lineTo(35,1); g.stroke();
    g.restore();
  }

  function drawBat(g, e) {
    const flap = Math.sin(game.time * (e.state === 'dive' ? 18 : 8) + e.seed) * 0.55;
    const diveAngle = e.state === 'dive' ? Math.atan2(e.vy,e.vx) * 0.45 : 0;
    g.save(); g.translate(e.x,e.y); g.scale(e.facing,1); g.rotate(diveAngle * e.facing);
    if (e.state === 'telegraph') {
      const rg=g.createRadialGradient(0,0,2,0,0,75); rg.addColorStop(0,'rgba(255,62,78,0.45)'); rg.addColorStop(1,'rgba(255,0,30,0)'); g.fillStyle=rg; g.fillRect(-85,-85,170,170);
    }
    {
      const fps = e.state === 'dive' ? 22 : 14;
      const img = animImg(anims.batFlap, game.time + e.seed * 4, fps);
      if (img && drawAnimCenter(g, img, 0, 0, 96, 1, { ax: 0.55, ay: 0.50, flash: e.flash > 0 })) { g.restore(); return; }
    }
    if (drawCenterSprite(g, 'bat', 0, 0, 96, 1, { ax: 0.58, ay: 0.48, flash: e.flash > 0 })) { g.restore(); return; }
    // Ragged membrane wings.
    for (const side of [-1,1]) {
      g.save(); g.scale(side,1);
      const wing=g.createLinearGradient(12,-10,68,28); wing.addColorStop(0,'#4d1c2b'); wing.addColorStop(.45,'#1b0c14'); wing.addColorStop(1,'#060407');
      g.fillStyle=wing;
      g.beginPath(); g.moveTo(8,-12); g.quadraticCurveTo(42,-50-flap*18,72,-27-flap*12); g.lineTo(56,3); g.lineTo(68,22); g.lineTo(39,13); g.lineTo(27,31); g.lineTo(9,8); g.closePath(); g.fill();
      g.strokeStyle='#783047'; g.lineWidth=2; g.stroke();
      g.strokeStyle='rgba(176,72,91,0.35)';
      g.beginPath(); g.moveTo(12,-6); g.lineTo(62,-25-flap*12); g.moveTo(18,2); g.lineTo(55,9); g.stroke();
      g.restore();
    }
    const body=g.createRadialGradient(-6,-8,2,0,0,25); body.addColorStop(0,e.flash>0?'#fff0ea':'#6f3a48'); body.addColorStop(.55,'#171016'); body.addColorStop(1,'#050306');
    g.fillStyle=body; g.beginPath(); g.ellipse(0,0,18,25,0,0,TAU); g.fill(); g.strokeStyle='#5f2537'; g.stroke();
    // Cage-skull.
    g.fillStyle='#b8a7a4'; g.beginPath(); g.moveTo(-11,-18); g.lineTo(11,-20); g.lineTo(15,-5); g.lineTo(0,6); g.lineTo(-15,-5); g.closePath(); g.fill();
    g.fillStyle='#10070c'; g.fillRect(-9,-12,7,4); g.fillRect(3,-12,7,4);
    g.fillStyle='#ff3150'; g.fillRect(5,-11,4,2);
    g.restore();
  }

  function drawKnight(g, e) {
    drawActorShadow(g,e,34,0.42);
    const wind = e.state === 'windup' ? 1-invLerp(0.31,0,e.stateT) : e.state === 'swing' ? 1 : 0;
    g.save(); g.translate(e.x,e.y); g.scale(e.facing,1);
    if (e.state==='windup') {
      const rg=g.createRadialGradient(0,-65,4,0,-65,82); rg.addColorStop(0,'rgba(255,60,75,0.22)'); rg.addColorStop(1,'rgba(255,0,30,0)'); g.fillStyle=rg; g.fillRect(-95,-155,190,180);
    }
    {
      const attacking = e.state === 'windup' || e.state === 'swing' || e.state === 'recover' || e.state === 'stagger';
      const lunge = anims.knightWalk[anims.knightWalk.length - 1];
      const img = attacking
        ? (lunge && lunge.complete ? lunge : animImg(anims.knightWalk, 0, 1))
        : animImg(anims.knightWalk, game.time * 0.95 + e.seed * 5, 9);
      const rot = e.state === 'swing' ? -0.12 : e.state === 'windup' ? 0.08 : 0;
      if (img && drawAnimGround(g, img, 0, 0, 136, 1, { ax: 0.48, flash: e.flash > 0, rot })) { g.restore(); return; }
    }
    if (drawGroundSprite(g, 'knight', 0, 0, 136, 1, { ax: 0.48, flash: e.flash > 0, rot: e.state === 'swing' ? -0.12 : e.state === 'windup' ? 0.08 : 0 })) { g.restore(); return; }
    // Legs.
    drawLimb(g,-14,-44,-17,-22,-20,0,13,'#0c0a0d'); drawLimb(g,14,-44,17,-22,20,0,13,'#080709');
    g.fillStyle='#050406'; g.fillRect(-32,-8,28,10); g.fillRect(5,-8,29,10);
    // Layered plate body.
    const armor=g.createLinearGradient(-34,-104,38,-40); armor.addColorStop(0,e.flash>0?'#fff7ed':'#8a7479'); armor.addColorStop(.18,'#44383d'); armor.addColorStop(.55,'#161217'); armor.addColorStop(.82,'#080609'); armor.addColorStop(1,'#4b1726');
    g.fillStyle=armor; g.beginPath(); g.moveTo(-31,-100); g.lineTo(29,-101); g.lineTo(39,-56); g.lineTo(20,-37); g.lineTo(-23,-40); g.lineTo(-39,-63); g.closePath(); g.fill(); g.strokeStyle='#793144'; g.lineWidth=3; g.stroke();
    g.strokeStyle='#4f3d42'; g.lineWidth=3; for(let y=-89;y<-48;y+=13){g.beginPath();g.moveTo(-25,y);g.lineTo(27,y+1);g.stroke();}
    // Helmet.
    const helm=g.createLinearGradient(-24,-130,25,-89); helm.addColorStop(0,'#5e5357'); helm.addColorStop(.35,'#1a171b'); helm.addColorStop(1,'#070608');
    g.fillStyle=helm; g.beginPath(); g.moveTo(-23,-126); g.lineTo(18,-129); g.lineTo(29,-104); g.lineTo(17,-87); g.lineTo(-20,-90); g.lineTo(-30,-107); g.closePath(); g.fill(); g.strokeStyle='#6c3644'; g.stroke();
    g.fillStyle='#050306'; g.fillRect(-19,-111,42,8); g.fillStyle='#ff334f'; g.fillRect(2,-108,20,3);
    // Shield.
    if(e.shield>0){g.save();g.translate(31,-63);g.rotate(-.10);
      const sh=g.createRadialGradient(-10,-16,2,0,0,48);sh.addColorStop(0,'#817076');sh.addColorStop(.23,'#3e3438');sh.addColorStop(.68,'#121014');sh.addColorStop(1,'#050406');g.fillStyle=sh;
      g.beginPath();g.moveTo(-8,-48);g.lineTo(33,-30);g.lineTo(31,28);g.lineTo(-7,48);g.lineTo(-30,17);g.lineTo(-28,-28);g.closePath();g.fill();g.strokeStyle=e.shield<30?'#ef6a72':'#783145';g.lineWidth=4;g.stroke();
      g.strokeStyle='#4f2b36';g.lineWidth=4;g.beginPath();g.moveTo(0,-37);g.lineTo(0,35);g.moveTo(-20,0);g.lineTo(24,0);g.stroke();g.restore();}
    // Sword arm with explicit attack pose.
    g.save();g.translate(-20,-72);g.rotate(-1.35 + wind*2.05);
    drawLimb(g,0,0,18,8,31,16,10,'#20191e');
    const blade=g.createLinearGradient(30,8,113,18);blade.addColorStop(0,'#2d2529');blade.addColorStop(.55,'#9b8c8d');blade.addColorStop(1,'#e8c3bb');g.strokeStyle=blade;g.lineWidth=8;g.beginPath();g.moveTo(30,16);g.lineTo(112,16);g.stroke();
    g.strokeStyle='#d44558';g.lineWidth=2;g.beginPath();g.moveTo(34,12);g.lineTo(106,12);g.stroke();g.restore();
    g.restore();
  }

  function drawCenser(g, e) {
    const bob=Math.sin(game.time*2+e.seed)*2;
    const casting=e.state==='cast';
    g.save();g.translate(e.x,e.y+bob);g.scale(e.facing,1);
    if(casting){const rg=g.createRadialGradient(22,42,3,22,42,95);rg.addColorStop(0,'rgba(255,82,46,0.42)');rg.addColorStop(1,'rgba(255,0,20,0)');g.fillStyle=rg;g.fillRect(-80,-55,190,190);}
    {
      const img = animImg(anims.censerFloat, game.time * 0.7 + e.seed * 3, 8);
      if (img && drawAnimCenter(g, img, 0, 0, 108, 1, { ax: 0.48, ay: 0.52, flash: e.flash > 0 })) { g.restore(); return; }
    }
    if (drawCenterSprite(g, 'censer', 0, 0, 108, 1, { ax: 0.48, ay: 0.52, flash: e.flash > 0 })) { g.restore(); return; }
    // Tattered floating vestments.
    const robe=g.createLinearGradient(-32,-55,34,44);robe.addColorStop(0,e.flash>0?'#fff3e9':'#59303e');robe.addColorStop(.24,'#25121e');robe.addColorStop(.7,'#09070b');robe.addColorStop(1,'#3c1021');
    g.fillStyle=robe;g.beginPath();g.moveTo(-18,-50);g.lineTo(20,-50);g.lineTo(34,-8);g.lineTo(24,43);g.lineTo(6,27);g.lineTo(-7,47);g.lineTo(-26,23);g.lineTo(-34,-9);g.closePath();g.fill();g.strokeStyle='#6f2940';g.lineWidth=3;g.stroke();
    // Hooded void and mask shard.
    g.fillStyle='#050407';g.beginPath();g.ellipse(0,-32,20,23,0,0,TAU);g.fill();
    g.fillStyle='#b9a6a2';g.beginPath();g.moveTo(1,-43);g.lineTo(15,-35);g.lineTo(11,-20);g.lineTo(1,-18);g.closePath();g.fill();
    g.fillStyle='#ff3550';g.fillRect(7,-33,7,2);
    // Arm and censer chain.
    drawLimb(g,13,-24,29,-8,34,12,7,'#171016');
    drawBackgroundChain(g,34,10,64,5,.9);
    const fire=g.createRadialGradient(34,83,1,34,83,48);fire.addColorStop(0,'rgba(255,238,190,.9)');fire.addColorStop(.16,'rgba(255,93,42,.72)');fire.addColorStop(1,'rgba(255,0,30,0)');g.fillStyle=fire;g.fillRect(-15,34,98,98);
    const pot=g.createRadialGradient(27,74,2,34,82,19);pot.addColorStop(0,'#8c665f');pot.addColorStop(.35,'#2e1b20');pot.addColorStop(1,'#090609');g.fillStyle=pot;g.beginPath();g.arc(34,82,17,0,TAU);g.fill();g.strokeStyle='#a63a4a';g.lineWidth=3;g.stroke();
    for(let a=0;a<3;a++){g.fillStyle='rgba(255,115,64,.52)';g.beginPath();g.arc(27+a*7,79+(a%2)*5,2,0,TAU);g.fill();}
    g.restore();
  }

  function drawExecutioner(g, e, boss = false) {
    drawActorShadow(g,e,boss?68:46,boss?.50:.43);
    const scale=boss?1.18:1;
    const wind = (e.state==='windup'||e.state==='slam') ? (e.state==='windup'?1-invLerp(.5,0,e.stateT):1) : 0;
    const bossWind = e.state==='slam' && boss ? invLerp(e.phase===2?.72:.95,.2,e.stateT) : wind;
    g.save();g.translate(e.x,e.y);g.scale(e.facing*scale,scale);
    const aura=g.createRadialGradient(0,-82,5,0,-82,boss?150:100);aura.addColorStop(0,boss&&e.phase===2?'rgba(255,35,55,.31)':'rgba(145,18,38,.14)');aura.addColorStop(1,'rgba(255,0,20,0)');g.fillStyle=aura;g.fillRect(-175,-240,350,290);
    {
      const busy = e.state === 'windup' || e.state === 'slam' || e.state === 'recover' || e.state === 'charge' || e.state === 'leap';
      const frames = boss ? anims.bossIdle : anims.executionerWalk;
      const img = busy
        ? (frames[0] && frames[0].complete ? frames[0] : null)
        : animImg(frames, game.time * (boss ? 0.55 : 0.85) + e.seed * 4, boss ? 6 : 9);
      const rot = (e.state === 'slam' || e.state === 'windup') ? -0.08 * (boss ? bossWind : wind) : 0;
      if (img && drawAnimGround(g, img, 0, 0, 172, 1, { ax: 0.48, flash: e.flash > 0, rot })) { g.restore(); return; }
    }
    if (drawGroundSprite(g, boss ? 'boss' : 'executioner', 0, 0, 172, 1, { ax: 0.48, flash: e.flash > 0, rot: (e.state === 'slam' || e.state === 'windup') ? -0.08 * (boss ? bossWind : wind) : 0 })) { g.restore(); return; }
    // Heavy legs.
    drawLimb(g,-22,-70,-25,-36,-30,0,boss?25:21,'#0b090c');drawLimb(g,22,-70,25,-36,30,0,boss?25:21,'#070608');
    g.fillStyle='#040304';g.fillRect(-49,-9,39,12);g.fillRect(11,-9,42,12);
    // Apron and torso.
    const armor=g.createLinearGradient(-57,-160,59,-55);armor.addColorStop(0,e.flash>0?'#fff8ec':'#7d676c');armor.addColorStop(.18,'#3d3136');armor.addColorStop(.50,'#161117');armor.addColorStop(.78,'#070608');armor.addColorStop(1,'#5d1526');g.fillStyle=armor;
    g.beginPath();g.moveTo(-51,-148);g.lineTo(46,-150);g.lineTo(62,-80);g.lineTo(34,-51);g.lineTo(-40,-55);g.lineTo(-64,-88);g.closePath();g.fill();g.strokeStyle=boss?'#9a3045':'#713043';g.lineWidth=4;g.stroke();
    g.fillStyle='#18080f';g.beginPath();g.moveTo(-32,-92);g.lineTo(34,-94);g.lineTo(27,-30);g.lineTo(-27,-30);g.closePath();g.fill();
    g.strokeStyle='#6a1c31';g.lineWidth=3;for(let y=-83;y<-37;y+=15){g.beginPath();g.moveTo(-27,y);g.lineTo(28,y-2);g.stroke();}
    // Bell execution helm.
    const helm=g.createLinearGradient(-40,-204,44,-139);helm.addColorStop(0,'#67595e');helm.addColorStop(.22,'#2c272b');helm.addColorStop(.65,'#0f0d11');helm.addColorStop(1,'#060507');g.fillStyle=helm;
    g.beginPath();g.moveTo(-35,-190);g.quadraticCurveTo(0,-221,38,-188);g.lineTo(51,-145);g.lineTo(-50,-145);g.closePath();g.fill();g.strokeStyle=boss?'#a42e46':'#65404a';g.lineWidth=4;g.stroke();
    g.fillStyle='#050306';g.fillRect(-35,-171,75,12);g.fillStyle='#ff2f4e';g.fillRect(-22,-166,56,4);
    if(boss){g.strokeStyle='#9c2943';g.lineWidth=5;g.beginPath();g.arc(0,-190,23,Math.PI,0);g.stroke();for(let i=0;i<Math.max(0,3-e.armorStage);i++){g.fillStyle='#6b1529';g.fillRect(-44+i*32,-137,22,9);}}
    // Giant hooked axe.
    g.save();g.translate(-37,-111);
    let a=-1.72+(boss?bossWind:wind)*2.18;if(e.state==='leap')a=-.62;if(e.state==='charge')a=-2.05;g.rotate(a);
    g.strokeStyle='#191318';g.lineWidth=boss?15:12;g.beginPath();g.moveTo(0,0);g.lineTo(165,0);g.stroke();
    g.strokeStyle='rgba(151,83,88,.35)';g.lineWidth=3;g.beginPath();g.moveTo(5,-4);g.lineTo(153,-4);g.stroke();
    const blade=g.createLinearGradient(126,-62,207,55);blade.addColorStop(0,'#d3b9b5');blade.addColorStop(.18,'#76666a');blade.addColorStop(.52,'#272025');blade.addColorStop(.82,'#0b080b');blade.addColorStop(1,'#6f172b');g.fillStyle=blade;
    g.beginPath();g.moveTo(127,-15);g.quadraticCurveTo(174,-78,208,-50);g.lineTo(177,0);g.lineTo(210,48);g.quadraticCurveTo(168,74,127,16);g.closePath();g.fill();g.strokeStyle='#932a43';g.lineWidth=4;g.stroke();
    g.restore();g.restore();
  }

  function drawEnemy(g, e) {
    if (!e.alive && e.type !== 'boss') return;
    if (e.type === 'boss' && !game.bossActive) return;
    switch (e.type) {
      case 'crawler': drawCrawler(g, e); break;
      case 'bat': drawBat(g, e); break;
      case 'knight': drawKnight(g, e); break;
      case 'censer': drawCenser(g, e); break;
      case 'executioner': drawExecutioner(g, e, false); break;
      case 'boss': if (e.alive) drawExecutioner(g, e, true); break;
    }
  }

  function drawProjectile(g, p) {
    g.save();
    g.globalCompositeOperation = 'screen';
    if (p.trail.length > 1) {
      g.beginPath();
      for (let i = 0; i < p.trail.length; i++) {
        if (i === 0) g.moveTo(p.trail[i].x, p.trail[i].y);
        else g.lineTo(p.trail[i].x, p.trail[i].y);
      }
      g.strokeStyle = p.hostile ? 'rgba(255,42,59,0.42)' : 'rgba(255,235,180,0.5)';
      g.lineWidth = p.r * 0.8;
      g.lineCap = 'round';
      g.stroke();
    }
    const rg = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r * 2.5);
    rg.addColorStop(0, p.hostile ? '#fff1e8' : '#fffbe0');
    rg.addColorStop(0.25, p.hostile ? '#ff304c' : '#ffd66e');
    rg.addColorStop(1, 'rgba(255,0,20,0)');
    g.fillStyle = rg;
    g.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
    g.globalCompositeOperation = 'source-over';

    if (p.type === 'wave' || p.type === 'bigWave') {
      g.strokeStyle = '#8f1a2d';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(p.x - p.r, p.y + p.r * 0.4);
      g.lineTo(p.x, p.y - p.r);
      g.lineTo(p.x + p.r, p.y + p.r * 0.4);
      g.stroke();
    } else if (p.type === 'censer') {
      g.fillStyle = '#221219';
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, TAU);
      g.fill();
      g.strokeStyle = '#ac3144';
      g.lineWidth = 3;
      g.stroke();
    } else {
      g.fillStyle = p.hostile ? '#6d0f22' : '#b88227';
      g.beginPath();
      g.arc(p.x, p.y, p.r * 0.75, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  // Every glowing particle was minting its own radial gradient, every frame,
  // up to the particle cap. The glow is the same shape every time — only its
  // colour and radius change — so cache a unit-radius gradient per colour and
  // let the transform do the sizing.
  const glowCache = new Map();
  function particleGlow(g, color) {
    let grad = glowCache.get(color);
    if (grad) return grad;
    grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    if (glowCache.size < 64) glowCache.set(color, grad);
    return grad;
  }

  function drawParticle(g, p) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    g.save();
    g.globalAlpha = Math.min(1, a * 1.5);
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    if (p.glow) {
      g.globalCompositeOperation = 'screen';
      g.save();
      g.scale(p.glow, p.glow);
      g.fillStyle = particleGlow(g, p.color);
      g.fillRect(-1, -1, 2, 2);
      g.restore();
      g.globalCompositeOperation = 'source-over';
    }
    g.fillStyle = p.color;
    if (p.type === 'spark') {
      g.fillRect(-p.size * 3, -p.size / 2, p.size * 6, p.size);
    } else if (p.type === 'streak') {
      g.fillRect(-p.size * 2.5, -p.size * 0.35, p.size * 5, p.size * 0.7);
    } else if (p.type === 'debris') {
      g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
    } else if (p.type === 'smoke') {
      g.globalAlpha *= 0.24;
      g.beginPath();
      g.arc(0, 0, p.size * (1.3 - a * 0.3), 0, TAU);
      g.fill();
    } else {
      g.beginPath();
      g.ellipse(0, 0, p.size * 0.65, p.size, 0, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  function drawWorld(g) {
    g.save();
    // Pixel-snapped camera presentation keeps thin masonry and chains stable,
    // while actors still simulate at full subpixel precision.
    g.translate(-Math.round(game.camera.x), -Math.round(game.camera.y));

    const viewL = game.camera.x - 240;
    const viewR = game.camera.x + W + 240;
    const onScreen = (x, w = 0) => x + w >= viewL && x <= viewR;

    for (const d of decals) {
      if (!onScreen(d.x, d.r || 0)) continue;
      g.save(); g.globalAlpha = d.a * clamp(d.life / 2, 0, 1); g.fillStyle = '#3a0711';
      g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * 0.28, 0, 0, TAU); g.fill(); g.restore();
    }

    for (const p of platforms) if (onScreen(p.x, p.w)) drawPlatform(g, p);
    for (const h of hazards) if (onScreen(h.x, h.w)) drawHazard(g, h);
    for (const h of hooks) if (onScreen(h.x, 40)) drawHook(g, h);
    for (const c of caches) if (!c.taken && onScreen(c.x, 40)) drawCache(g, c);
    for (const membrane of seals) if (onScreen(membrane.x, membrane.w)) drawSeal(g, membrane);
    drawBossGate(g);

    drawYoyoTrail(g);
    drawChain(g);
    for (const p of projectiles) if (onScreen(p.x, 40)) drawProjectile(g, p);
    for (const e of enemies) if (onScreen(e.x, e.w || 80)) drawEnemy(g, e);
    drawPlayer(g);
    drawYoyo(g);
    for (const p of particles) if (onScreen(p.x, p.size || 8)) drawParticle(g, p);
    g.restore();
  }

  function drawHUD(g) {
    if (game.state === 'title') return;
    g.save();
    g.globalAlpha = 0.96;

    // Angled reliquary frame.
    g.fillStyle='rgba(4,3,6,0.82)';
    g.beginPath();g.moveTo(34,31);g.lineTo(478,31);g.lineTo(458,128);g.lineTo(52,128);g.closePath();g.fill();
    g.strokeStyle='#5f2938';g.lineWidth=2;g.stroke();
    g.strokeStyle='rgba(255,170,166,0.13)';g.beginPath();g.moveTo(47,38);g.lineTo(462,38);g.stroke();

    const health=clamp(player.health/player.maxHealth,0,1);
    g.fillStyle='#0d080c';roundedRectPath(g,55,48,344,18,5);g.fill();
    const hg=g.createLinearGradient(58,0,396,0);hg.addColorStop(0,'#6b0b20');hg.addColorStop(.55,'#c51d3a');hg.addColorStop(1,'#ff7880');g.fillStyle=hg;roundedRectPath(g,58,50,338*health,14,4);g.fill();
    g.fillStyle='#d8c6c8';g.font='700 13px Georgia,serif';g.fillText('LIFE',407,63);

    const charge=clamp(yoyo.charge,0,1);
    g.fillStyle='#0d080c';roundedRectPath(g,68,72,292,9,4);g.fill();
    const cg=g.createLinearGradient(68,0,360,0);cg.addColorStop(0,'#512036');cg.addColorStop(.55,'#e42b50');cg.addColorStop(1,'#fff1dc');g.fillStyle=cg;roundedRectPath(g,70,73,288*charge,7,3);g.fill();
    g.fillStyle=yoyo.latched?'#ffe2d5':'rgba(222,201,205,.72)';g.font='700 12px Georgia,serif';g.fillText(yoyo.latched?'CHAIN LOCKED':'SPINDLE',370,82);

    const need=xpToNext(player.level);
    const xpR=player.level>=50?1:clamp(player.xp/need,0,1);
    g.fillStyle='#0d080c';roundedRectPath(g,68,90,292,8,3);g.fill();
    const xg=g.createLinearGradient(68,0,360,0);xg.addColorStop(0,'#3a2a10');xg.addColorStop(.55,'#c9a24a');xg.addColorStop(1,'#fff1c4');
    g.fillStyle=xg;roundedRectPath(g,70,91,288*xpR,6,2);g.fill();
    g.fillStyle=player.levelFlash>0?'#ffe7b0':'#d8c6c8';
    g.font='700 12px Georgia,serif';
    g.fillText('LV '+player.level, 370, 99);

    if(player.relicPoints>0){
      const pulse=0.62+Math.sin(game.realTime*4.4)*0.38;
      const b=RELIC_BADGE;
      g.fillStyle=`rgba(96,10,28,${0.5+pulse*0.35})`;roundedRectPath(g,b.x,b.y,b.w,b.h,7);g.fill();
      g.strokeStyle=`rgba(255,110,132,${0.55+pulse*0.45})`;g.lineWidth=2;g.stroke();
      g.fillStyle='#ffe7e2';g.font='700 15px Georgia,serif';
      g.fillText((input.lastInputWasTouch?'TAP':'TAB')+`  \u00b7  ${player.relicPoints} RELIC${player.relicPoints>1?'S':''} WAIT${player.relicPoints>1?'':'S'}`,b.x+14,b.y+23);
    }

    if(player.killStreak>=2&&player.streakTimer>0){g.textAlign='center';g.fillStyle='#f8e5df';g.font=`900 ${24+Math.min(16,player.killStreak)}px Georgia,serif`;g.shadowColor='#e02548';g.shadowBlur=16;g.fillText(`${player.killStreak}× REND`,W/2,96);g.shadowBlur=0;g.textAlign='left';}

    // Contextual swing instruction only in the teaching chamber.
    if(player.x<1260&&game.time<30&&game.state==='playing'){
      const a=clamp(1-game.time/30,0,.78);g.globalAlpha=a;g.textAlign='center';
      g.fillStyle='rgba(5,3,6,.70)';roundedRectPath(g,W/2-310,H-92,620,46,11);g.fill();g.strokeStyle='rgba(130,55,72,.65)';g.stroke();
      g.fillStyle='#ead8d9';g.font='700 17px Georgia,serif';
      g.fillText(input.lastInputWasTouch?'Hold the blade on a ring  •  Left thumb pumps the arc  •  Swipe up to release':'Hold the blade on a ring  •  A / D pumps the arc  •  SPACE releases',W/2,H-63);g.textAlign='left';g.globalAlpha=.96;
    }

    const boss=enemies.find(e=>e.type==='boss');
    if(game.bossActive&&boss&&boss.alive){const ratio=clamp(boss.hp/boss.maxHp,0,1);const bw=850;const bx=(W-bw)/2;const by=H-56;
      g.fillStyle='rgba(3,2,4,.88)';roundedRectPath(g,bx,by,bw,22,7);g.fill();g.strokeStyle='#6e2939';g.lineWidth=2;g.stroke();
      const bg=g.createLinearGradient(bx,0,bx+bw,0);bg.addColorStop(0,'#5b0718');bg.addColorStop(.62,'#be1735');bg.addColorStop(1,'#ff6670');g.fillStyle=bg;roundedRectPath(g,bx+4,by+4,(bw-8)*ratio,14,5);g.fill();
      g.textAlign='center';g.fillStyle='#eee0df';g.font='700 17px Georgia,serif';g.fillText('THE RED ABBOT',W/2,by-10);g.textAlign='left';}
    g.restore();
  }

  function drawTouchControls(g) {
    if (!input.lastInputWasTouch || game.state !== 'playing' || game.helpFade <= 0) return;
    const alpha = Math.min(0.34, game.helpFade * 0.34);
    g.save();
    g.globalAlpha = alpha;
    g.strokeStyle = '#d7aeb6';
    g.lineWidth = 3;

    const left = input.leftTouch || { sx: 170, sy: H - 170, x: 170, y: H - 170 };
    g.beginPath();
    g.arc(left.sx, left.sy, 72, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(left.x, left.y, 28, 0, TAU);
    g.stroke();

    const right = input.rightTouch || { sx: W - 180, sy: H - 170, x: W - 180, y: H - 170 };
    g.beginPath();
    g.arc(right.sx, right.sy, 82, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(right.x, right.y, 25, 0, TAU);
    g.stroke();
    g.restore();
  }

  function drawZoneTitle(g) {
    if (game.zoneTitleTimer <= 0 || game.state !== 'playing') return;
    const total = 3.2;
    const t = game.zoneTitleTimer;
    const fade = Math.min(1, (total - t) * 2.4, t * 1.2);
    g.save();
    g.globalAlpha = fade * 0.88;
    g.textAlign = 'center';
    g.fillStyle = '#eadde0';
    g.font = '700 28px Georgia, serif';
    g.shadowColor = '#c21c39';
    g.shadowBlur = 18;
    g.fillText(game.zoneTitle, W / 2, 150);
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(170,45,65,0.5)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(W / 2 - 230, 168);
    g.lineTo(W / 2 + 230, 168);
    g.stroke();
    g.restore();
  }

  function drawTitle(g) {
    if (game.state !== 'title') return;
    g.save();
    const pulse=0.5+Math.sin(game.realTime*1.8)*0.5;
    const shade=g.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(1,1,3,.12)');shade.addColorStop(.42,'rgba(3,1,4,.36)');shade.addColorStop(1,'rgba(2,1,3,.90)');g.fillStyle=shade;g.fillRect(0,0,W,H);

    // Monumental spindle sigil behind the wordmark.
    g.save();g.translate(W/2,350);g.rotate(game.realTime*.08);g.globalAlpha=.18+pulse*.05;g.strokeStyle='#b11f3d';g.lineWidth=8;g.beginPath();g.arc(0,0,205,0,TAU);g.stroke();g.lineWidth=3;
    for(let i=0;i<24;i++){const a=i*TAU/24;g.beginPath();g.moveTo(Math.cos(a)*116,Math.sin(a)*116);g.lineTo(Math.cos(a)*198,Math.sin(a)*198);g.stroke();}
    g.beginPath();g.arc(0,0,116,0,TAU);g.stroke();g.restore();

    g.textAlign='center';g.shadowColor='#d11c40';g.shadowBlur=26+pulse*18;
    g.fillStyle='#d44a61';g.font='700 27px Georgia,serif';g.fillText('G O R E T H R E A D',W/2,278);
    const tg=g.createLinearGradient(0,310,0,465);tg.addColorStop(0,'#fff3e7');tg.addColorStop(.22,'#d8aaa8');tg.addColorStop(.48,'#a83a4d');tg.addColorStop(.78,'#4d0c1c');tg.addColorStop(1,'#120409');g.fillStyle=tg;g.font='900 126px Georgia,serif';g.fillText('HELLSPINDLE',W/2,424);
    g.shadowBlur=0;g.strokeStyle='#6f1e31';g.lineWidth=2;g.strokeText('HELLSPINDLE',W/2,424);
    g.fillStyle='rgba(242,222,219,.84)';g.font='italic 25px Georgia,serif';g.fillText('Cut the veil. Ride the chain. Bring the wheel back hungry.',W/2,485);

    g.fillStyle=`rgba(255,238,229,${.56+pulse*.38})`;g.font='700 21px Georgia,serif';
    g.fillText(hasSave()
      ? (input.lastInputWasTouch ? 'TOUCH TO CONTINUE' : 'CLICK TO CONTINUE    •    N FOR A NEW DESCENT')
      : (input.lastInputWasTouch ? 'TOUCH TO DESCEND' : 'CLICK OR PRESS ANY KEY'), W/2, 642);
    g.fillStyle='rgba(220,198,201,.69)';g.font='17px Georgia,serif';g.fillText(input.lastInputWasTouch
      ? 'LEFT THUMB MOVES   •   SWIPE UP JUMP   •   SWIPE DOWN DROP   •   RIGHT THUMB IS THE WHEEL'
      : 'A / D MOVE & PUMP   •   SPACE JUMP & RELEASE   •   S DROP   •   HOLD MOUSE TO COMMAND THE WHEEL',W/2,690);
    g.fillStyle='rgba(188,154,161,.50)';g.font='14px Georgia,serif';g.fillText('TWELVE DISTRICTS  •  THE WHEEL GROWS WITH THE BLOOD YOU SPEND',W/2,730);
    g.restore();
  }

  // The reliquary. Levels hand over relics; this is where you spend them, when
  // you decide to, not the instant the bar fills.
  const relicHit = [];
  const RELIC_BADGE = { x: 34, y: 136, w: 234, h: 34 };

  function drawRelics(g) {
    if (!game.relicsOpen) return;
    g.save();
    g.fillStyle = 'rgba(3,1,5,0.88)';
    g.fillRect(0, 0, W, H);

    const panelW = 980;
    const panelX = (W - panelW) / 2;
    const panelY = 96;
    const rowH = 78;
    const panelH = 214 + RELICS.length * rowH;

    g.fillStyle = 'rgba(9,4,9,0.96)';
    g.beginPath();
    g.moveTo(panelX + 26, panelY);
    g.lineTo(panelX + panelW - 26, panelY);
    g.lineTo(panelX + panelW, panelY + 34);
    g.lineTo(panelX + panelW, panelY + panelH - 34);
    g.lineTo(panelX + panelW - 26, panelY + panelH);
    g.lineTo(panelX + 26, panelY + panelH);
    g.lineTo(panelX, panelY + panelH - 34);
    g.lineTo(panelX, panelY + 34);
    g.closePath();
    g.fill();
    g.strokeStyle = '#7d2f42';
    g.lineWidth = 2;
    g.stroke();

    g.textAlign = 'center';
    g.fillStyle = '#f2dcdf';
    g.font = '600 40px Georgia, serif';
    g.fillText('THE RELIQUARY', W / 2, panelY + 62);

    g.font = '18px Georgia, serif';
    g.fillStyle = player.relicPoints > 0 ? '#ff7d92' : 'rgba(226,200,205,0.5)';
    const pts = player.relicPoints;
    g.fillText(pts > 0 ? (pts === 1 ? 'ONE RELIC UNSPENT' : pts + ' RELICS UNSPENT') : 'NOTHING LEFT TO SPEND', W / 2, panelY + 92);

    // Level and the bar toward the next relic.
    const need = xpToNext(player.level);
    const frac = clamp(player.xp / Math.max(1, need), 0, 1);
    const barW = panelW - 160;
    const barX = panelX + 80;
    const barY = panelY + 112;
    g.fillStyle = '#140a10';
    roundedRectPath(g, barX, barY, barW, 12, 4); g.fill();
    g.fillStyle = '#a01b34';
    roundedRectPath(g, barX, barY, barW * frac, 12, 4); g.fill();
    g.strokeStyle = 'rgba(255,170,166,0.22)'; g.lineWidth = 1;
    roundedRectPath(g, barX, barY, barW, 12, 4); g.stroke();
    g.textAlign = 'left';
    g.fillStyle = 'rgba(226,200,205,0.62)';
    g.font = '15px Georgia, serif';
    g.fillText('LEVEL ' + player.level, barX, barY - 8);
    g.textAlign = 'right';
    g.fillText(Math.floor(player.xp) + ' / ' + need, barX + barW, barY - 8);

    relicHit.length = 0;
    for (let i = 0; i < RELICS.length; i++) {
      const def = RELICS[i];
      const rank = player.relics[def.key];
      const y = panelY + 158 + i * rowH;
      const selected = i === game.relicCursor;
      const affordable = player.relicPoints > 0 && rank < def.max;
      relicHit.push({ key: def.key, index: i, x: panelX + 30, y, w: panelW - 60, h: rowH - 10 });

      if (selected) {
        g.fillStyle = affordable ? 'rgba(120,18,38,0.55)' : 'rgba(60,40,48,0.32)';
        g.fillRect(panelX + 30, y, panelW - 60, rowH - 10);
        g.strokeStyle = affordable ? '#ff5c74' : 'rgba(180,150,155,0.35)';
        g.lineWidth = 2;
        g.strokeRect(panelX + 30, y, panelW - 60, rowH - 10);
      }

      g.textAlign = 'left';
      g.font = '600 25px Georgia, serif';
      g.fillStyle = rank >= def.max ? '#8f7a7e' : selected ? '#fff0e6' : '#e2c8cd';
      g.fillText(def.name, panelX + 54, y + 30);

      g.font = '15px Georgia, serif';
      g.fillStyle = 'rgba(214,182,188,0.62)';
      g.fillText(rank > 0 ? def.rank(rank) + '  \u00b7  ' + def.blurb : def.blurb, panelX + 54, y + 54);

      // Rank pips.
      const pipX = panelX + panelW - 74;
      for (let r = def.max - 1; r >= 0; r--) {
        const cx = pipX - (def.max - 1 - r) * 26;
        g.beginPath();
        g.arc(cx, y + 34, 8, 0, TAU);
        if (r < rank) { g.fillStyle = '#ff4f6a'; g.fill(); g.strokeStyle = '#ffd0cf'; }
        else { g.fillStyle = '#150b11'; g.fill(); g.strokeStyle = 'rgba(180,120,130,0.45)'; }
        g.lineWidth = 2;
        g.stroke();
      }
    }

    g.textAlign = 'center';
    g.font = '16px Georgia, serif';
    g.fillStyle = 'rgba(226,200,205,0.55)';
    const hint = COARSE_POINTER
      ? 'Tap a relic to spend  \u00b7  tap outside to close'
      : 'W / S choose  \u00b7  Space or D spends  \u00b7  Tab or Esc closes';
    g.fillText(hint, W / 2, panelY + panelH - 26);
    g.restore();
  }

  function drawPause(g) {
    if (!game.paused) return;
    g.save();
    g.fillStyle = 'rgba(2,1,3,0.82)';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    g.fillStyle = '#eadde0';
    g.font = '700 52px Georgia, serif';
    g.fillText('PAUSED', W / 2, 118);
    g.font = '700 22px Georgia, serif';
    g.fillStyle = '#e8c07a';
    g.fillText('LV ' + player.level, W / 2, 168);
    const need = xpToNext(player.level);
    const xpR = player.level >= 50 ? 1 : clamp(player.xp / need, 0, 1);
    g.fillStyle = '#0d080c';
    roundedRectPath(g, W / 2 - 220, 184, 440, 16, 6); g.fill();
    g.fillStyle = '#c9a24a';
    roundedRectPath(g, W / 2 - 218, 186, 436 * xpR, 12, 5); g.fill();
    g.fillStyle = 'rgba(234,221,224,0.72)';
    g.font = '16px Georgia, serif';
    g.fillText(player.level >= 50 ? 'MAX' : `${player.xp} / ${need}`, W / 2, 220);
    g.fillStyle = '#eadde0';
    g.font = '700 20px Georgia, serif';
    g.fillText((AREAS[game.zone] && AREAS[game.zone].name) || '', W / 2, 258);

    g.font = '15px Georgia, serif';
    g.textAlign = 'left';
    const col = 2;
    const startX = W / 2 - 430;
    for (let i = 0; i < AREAS.length; i++) {
      const seen = player.visited.indexOf(i) >= 0;
      const here = i === game.zone;
      g.fillStyle = here ? '#e8c07a' : seen ? 'rgba(234,221,224,0.78)' : 'rgba(234,221,224,0.22)';
      const cx = startX + (i % col) * 460;
      const cy = 310 + Math.floor(i / col) * 32;
      g.fillText((here ? '▸ ' : '  ') + (seen ? AREAS[i].name : '—'), cx, cy);
    }

    g.textAlign = 'center';
    g.fillStyle = 'rgba(234,221,224,0.7)';
    g.font = '18px Georgia, serif';
    g.fillText(input.lastInputWasTouch
      ? 'PAUSE TO RETURN     •     SWIPE DOWN DROPS A LEDGE'
      : 'P / ESC TO RETURN     •     R CHECKPOINT     •     S DROPS A LEDGE', W / 2, H - 70);
    g.restore();
  }

  function drawDeath(g) {
    if (game.state !== 'dead') return;
    const a = clamp(1 - game.deathTimer / 2.1, 0, 1);
    g.save();
    g.fillStyle = `rgba(25,0,7,${a * 0.55})`;
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    g.fillStyle = `rgba(245,220,222,${a})`;
    g.font = '700 54px Georgia, serif';
    g.fillText('THE STRING BREAKS', W / 2, H / 2);
    g.restore();
  }

  function drawVictory(g) {
    if (game.state !== 'victory') return;
    const a = clamp(game.victoryTimer / 2.5, 0, 1);
    g.save();
    g.fillStyle = `rgba(2,1,3,${a * 0.68})`;
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    g.shadowColor = '#d31d42';
    g.shadowBlur = 28;
    g.fillStyle = `rgba(255,238,233,${a})`;
    g.font = '900 78px Georgia, serif';
    g.fillText('THE ABBOT UNRAVELED', W / 2, 370);
    g.shadowBlur = 0;
    g.font = '24px Georgia, serif';
    g.fillStyle = `rgba(235,213,218,${a * 0.86})`;
    g.fillText(`${game.kills} enemies rendered into regrettable architecture`, W / 2, 430);
    g.fillText(`Best rend: ${game.maxCombo}×     •     Level ${player.level}`, W / 2, 470);
    g.font = '700 19px Georgia, serif';
    g.fillText(input.lastInputWasTouch ? 'TAP TO DESCEND AGAIN' : 'PRESS R OR CLICK TO DESCEND AGAIN', W / 2, 590);
    g.restore();
  }

  function drawPost(g) {
    const vg=g.createRadialGradient(W/2,H/2,H*.18,W/2,H/2,H*.82);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(.68,'rgba(0,0,0,.06)');vg.addColorStop(1,'rgba(0,0,0,.74)');g.fillStyle=vg;g.fillRect(0,0,W,H);
    if(!grainPattern) grainPattern=g.createPattern(grainCanvas,'repeat');
    if(grainPattern && !COARSE_POINTER){g.save();g.globalAlpha=.026;g.fillStyle=grainPattern;g.fillRect(0,0,W,H);g.restore();}
    if(game.redFlash>0){g.fillStyle=`rgba(150,0,20,${game.redFlash*.16})`;g.fillRect(0,0,W,H);}
    if(game.flash>0){g.globalCompositeOperation='screen';g.fillStyle=`rgba(255,226,218,${game.flash*.24})`;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';}
    g.fillStyle='rgba(0,0,0,.42)';g.fillRect(0,0,W,10);g.fillRect(0,H-10,W,10);
  }

  // Paint straight onto the visible canvas. The old build composed every frame
  // into a second, never-displayed canvas and blitted it across at the end; a
  // canvas that is never presented does not get hardware acceleration, so that
  // one line was uploading 1600x900 pixels from the CPU every single frame and
  // eating roughly nine tenths of the frame budget. Browsers already present a
  // canvas atomically at the end of a rAF callback, and this function never
  // yields, so there is no half-painted frame to protect against.
  function render() {
    ctx.setTransform(renderScale,0,0,renderScale,0,0);
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    ctx.imageSmoothingEnabled=true;
    // 'low' is the cheap bilinear sampler. Every scaled sprite already goes
    // through the pre-scaled cache below, so there is nothing left for the
    // expensive resampler to improve.
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'low';
    drawBackground(ctx,game.camera.x);
    ctx.save();ctx.translate(game.shakeX,game.shakeY);drawWorld(ctx);ctx.restore();
    drawHUD(ctx);
    drawTouchControls(ctx);
    drawZoneTitle(ctx);
    drawPost(ctx);
    drawTitle(ctx);
    drawPause(ctx);
    drawRelics(ctx);
    drawDeath(ctx);
    drawVictory(ctx);
  }

  // ---------------------------------------------------------------------------
  // Frame loop with fixed-step simulation.
  // ---------------------------------------------------------------------------

  function frame(now) {
    const realDt = Math.min(0.05, Math.max(0, (now - game.lastFrame) / 1000));
    game.lastFrame = now;
    game.realTime += realDt;
    game.fps = lerp(game.fps, realDt > 0 ? 1 / realDt : 60, 0.05);
    input.pollGamepad();

    let stepped = 0;
    if (game.hitStop > 0 && game.state !== 'title') {
      game.hitStop -= realDt;
      game.flash = Math.max(0, game.flash - realDt * 2.5);
      updateParticles(realDt * 0.18);
      updateCamera(realDt * 0.25);
    } else {
      game.accumulator += realDt;
      let safety = 0;
      while (game.accumulator >= FIXED_DT && safety++ < 10) {
        updateGame(FIXED_DT);
        game.accumulator -= FIXED_DT;
        stepped++;
      }
    }

    render();
    if (stepped > 0) input.endFrame();
    requestAnimationFrame(frame);
  }

  // Lightweight inspection hooks used by the included QA harness. They do not
  // alter normal play and keep the entire build dependency-free.
  window.__HELLSPINDLE__ = {
    snapshot() {
      const boss = enemies.find(e => e.type === 'boss');
      return {
        state: game.state,
        paused: game.paused,
        time: game.time,
        helpFade: game.helpFade,
        completed: !!game.completed,
        bossActive: !!game.bossActive,
        player: {
          x: player.x, y: player.y, vx: player.vx, vy: player.vy,
          health: player.health, grounded: player.grounded,
          checkpointX: player.checkpointX, checkpointY: player.checkpointY,
          dead: player.dead, level: player.level, xp: player.xp,
          helpFade: game.helpFade, invuln: player.invuln
        },
        yoyo: {
          x: yoyo.x, y: yoyo.y, vx: yoyo.vx, vy: yoyo.vy,
          active: yoyo.active, charge: yoyo.charge,
          latched: !!yoyo.latched
        },
        enemiesAlive: enemies.filter(e => e.alive).length,
        enemySample: enemies.map(e => ({
          type: e.type, alive: e.alive, x: e.x, y: e.y, vx: e.vx, vy: e.vy,
          hp: e.hp, state: e.state, grounded: e.grounded,
          flying: !!e.flying, baseY: e.baseY, h: e.h
        })),
        projectiles: projectiles.map(p => ({
          x: p.x, y: p.y, vx: p.vx, vy: p.vy, r: p.r,
          hostile: p.hostile, reflected: !!p.reflected, type: p.type
        })),
        kills: game.kills,
        zone: game.zone,
        area: (AREAS[game.zone] && AREAS[game.zone].name) || '',
        worldW: WORLD_W,
        fps: game.fps,
        particleCount: particles.length,
        hooks: hooks.map((h, index) => ({ index, x: h.x, y: h.y, zone: h.zone, latched: yoyo.latched === h })),
        seals: seals.map(m => ({
          x: m.x, y: m.y, w: m.w, h: m.h, alive: m.alive, breached: m.breached,
          intactBands: m.bands.filter(b => b.hp > 0).length,
          bands: m.bands.map(b => b.hp)
        })),
        boss: boss ? { alive: boss.alive, hp: boss.hp, awake: boss.bossAwake, state: boss.state, x: boss.x, y: boss.y } : null,
        cameraX: game.camera.x,
        zoneTitle: game.zoneTitle,
        relicPoints: player.relicPoints,
        caches: caches.map(c => ({ x: c.x, y: c.y, zone: c.zone, xp: c.xp, taken: !!c.taken })),
        bossGate: bossGateRect()
      };
    },
    world() {
      return {
        platforms: platforms.map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, oneWay: p.oneWay, zone: p.zone })),
        hazards: hazards.map(h => ({ x: h.x, y: h.y, w: h.w, h: h.h, type: h.type })),
        checkpoints: AREA_CHECKPOINTS.map(c => ({ x: c.x, y: c.y })),
        spawns: spawnTemplates.map(t => ({ type: t.type, x: t.x, y: t.y })),
        gate: bossGateRect(),
        membraneSolidCount: getMembraneSolids().length
      };
    },
    start() { startGame(); },
    restart() { restartFromCheckpoint(); },
    restartFull() { restartFullRun(); },
    teleport(x, y = 760) {
      player.x = clamp(Number(x) || 250, 25, WORLD_W - 25);
      player.y = Number(y) || 760;
      player.vx = 0;
      player.vy = 0;
      yoyo.x = player.x + player.facing * 43;
      yoyo.y = player.y - PLAYER_H * 0.56 + 5;
      yoyo.vx = 0;
      yoyo.vy = 0;
      game.camera.look = 0;
      game.camera.x = clamp(player.x - W * 0.38, 0, WORLD_W - W);
      game.camera.y = clamp(player.y - H * 0.70, 0, 210);
      game.camera.targetY = game.camera.y;
    },
    latchHook(index = 0) {
      const h = hooks[clamp(Number(index) || 0, 0, hooks.length - 1) | 0];
      const pc = playerCenter();
      if (!h || hypot(pc.x - h.x, pc.y - h.y) > MAX_CHAIN + 60) return false;
      yoyo.latched = h; player.grapple = h; yoyo.x = h.x; yoyo.y = h.y;
      yoyo.ropeLength = clamp(hypot(pc.x - h.x, pc.y - h.y), 110, MAX_CHAIN);
      yoyo.ropeTarget = clamp(yoyo.ropeLength - (player.grounded ? 58 : 22), 150, MAX_CHAIN);
      if (player.grounded) { player.vy = Math.min(player.vy, -190); player.grounded = false; player.coyote = 0; }
      yoyo.holdGrace = 0;
      return true;
    },
    breakMembrane(index = 0, startBand = 7, count = 5) {
      const m = seals[clamp(Number(index) || 0, 0, seals.length - 1) | 0];
      if (!m) return false;
      for (let i = Math.max(0, startBand | 0); i < Math.min(m.bands.length, (startBand | 0) + (count | 0)); i++) m.bands[i].hp = 0;
      m.breached = membranePassable(m); m.alive = m.bands.some(b => b.hp > 0); invalidateMembraneSolids(); return true;
    },
    setHealth(value) { player.health = clamp(Number(value) || 0, 0, player.maxHealth); },
    grantXP(amount = 500) { gainXP(Number(amount) || 0); },
    openRelics(open = true) { game.relicsOpen = !!open; },
    relicState() { return { points: player.relicPoints, ranks: Object.assign({}, player.relics), maxHealth: player.maxHealth, power: player.power, chain: MAX_CHAIN, pump: SWING_PUMP, swing: MAX_SWING }; },
    setInvulnerable(seconds = 10) { player.invuln = Math.max(player.invuln, Math.max(0, Number(seconds) || 0)); },
    setPlayerVelocity(vx = 0, vy = 0) { player.vx = Number(vx) || 0; player.vy = Number(vy) || 0; },
    damageBoss(amount = 100) {
      const boss = enemies.find(e => e.type === 'boss');
      if (boss && boss.alive) damageEnemy(boss, Number(amount) || 100, boss.x, boss.y - boss.h * 0.5, 0, -30, true);
    },
    setYoyo(x, y, vx = 0, vy = 0) {
      yoyo.x = Number(x) || 0;
      yoyo.y = Number(y) || 0;
      yoyo.vx = Number(vx) || 0;
      yoyo.vy = Number(vy) || 0;
      yoyo.prevX = yoyo.x;
      yoyo.prevY = yoyo.y;
    },
    spawnBolt(spec = {}) {
      spawnProjectile({
        x: spec.x || yoyo.x,
        y: spec.y || yoyo.y,
        vx: spec.vx || 0,
        vy: spec.vy || 0,
        r: spec.r || 10,
        damage: spec.damage || 10,
        type: spec.type || 'bloodBolt',
        hostile: spec.hostile !== false,
        life: spec.life || 4
      });
    },
    solidsAt(x) {
      return getDynamicSolids(x).map(s => ({
        x: s.x, y: s.y, w: s.w, h: s.h, oneWay: !!s.oneWay, bossGate: !!s.bossGate
      }));
    }
  };

  sizeBackingStore();
  window.addEventListener('resize', sizeBackingStore);
  window.addEventListener('orientationchange', () => setTimeout(sizeBackingStore, 120));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', sizeBackingStore);

  requestAnimationFrame(frame);
})();
