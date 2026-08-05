// =============================================================================
// CINDERBLOOM — front end: loading presentation, title, settings, pause.
// Owner: hud agent. See docs/CONTRACT.md §4.
// =============================================================================
//
// Two halves, and they run at different times.
//
// 1. THE LOADING SCREEN installs itself from module scope — i.e. the instant
//    main.js imports this file, long before any `init()` runs. It cannot be a
//    system, because by the time systems initialise the player has already been
//    staring at index.html's placeholder for several seconds and that is the
//    first thing they ever see. It does NOT remove index.html's #boot elements:
//    main.js writes `#boot-bar.style.width`, `#boot-stage.textContent` and
//    `#boot-err.textContent` and would throw if they vanished. It hides them,
//    reads them, and draws the real thing on a canvas over the top. index.html
//    and main.js are untouched.
//
// 2. THE MENU is an ordinary system. One full-screen canvas with its own hit
//    testing rather than DOM controls, for the same reason the HUD is canvas:
//    a <select> and a <input type=range> are the two most browser-looking
//    objects in existence (CRITIC.md automatic failure #13). Everything here is
//    drawn with the HUD's typeface.
//
// HARNESS SAFETY: the title screen would cover every review capture, so it is
// suppressed when `navigator.webdriver` is true. Set `ctx.debug.menu.force =
// true` (or `?menu` on the URL) to photograph it. `ctx.sys.menu.show('title'|
// 'settings'|'pause')` / `.hide()` are the programmatic entry points.
// =============================================================================

import { Type, PALETTE, rule, brackets } from './hud.js';
import { clamp, sat, TAU, DEG } from '../util/math.js';
import { RNG } from '../util/rng.js';

const STORE = 'cinderbloom.settings.v1';

// =============================================================================
// 1. LOADING PRESENTATION — module scope
// =============================================================================
(function installLoader() {
  if (typeof document === 'undefined') return;
  const boot = document.getElementById('boot');
  if (!boot || boot.dataset.cbSkin) return;
  boot.dataset.cbSkin = '1';

  const st = document.createElement('style');
  st.textContent = `
    #boot{background:#040302 !important;}
    #boot .wrap{position:absolute;inset:0;width:auto !important;}
    #boot h1,#boot .sub,#boot .bar,#boot .stage{
      position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;
      opacity:0 !important;pointer-events:none;margin:0 !important;}
    #boot .err{position:absolute;left:6vw;right:6vw;bottom:7vh;margin:0 !important;
      font:11px/1.6 ui-monospace,monospace;color:#FF6B2C;letter-spacing:.04em;
      max-height:30vh;overflow:auto;text-align:left;}
    #cb-load{position:absolute;inset:0;width:100%;height:100%;display:block;}
  `;
  document.head.appendChild(st);

  const cv = document.createElement('canvas');
  cv.id = 'cb-load';
  boot.insertBefore(cv, boot.firstChild);
  const g = cv.getContext('2d');

  const bar = document.getElementById('boot-bar');
  const stage = document.getElementById('boot-stage');
  const rng = new RNG('cinderbloom:load');

  // Drifting embers. ART_DIRECTION §1: the world is a furnace that has been
  // running for a billion years — the loading screen is the inside of it,
  // seen from very far away.
  //
  // THE FIRST CAPTURE (tests/shots/menu-loading-b.png, via tools/menushots.mjs)
  // is why this section was rebuilt. Eighty 1-2 px `fillRect` embers at up to
  // 0.75 alpha over a near-black field did not read as embers; they read as
  // stuck pixels, and a couple of them landed on red and green subpixel values
  // that made the frame look like a broken sensor. Embers are now a single
  // prebaked soft sprite (one radial gradient, baked once) blitted with
  // `lighter`, which is both cheaper per ember and the only way a 2 px mark
  // reads as *hot* rather than as noise.
  const N = 170;
  const emb = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) {
    emb[i * 6] = rng.next();                       // x
    emb[i * 6 + 1] = rng.next();                   // y
    emb[i * 6 + 2] = 0.008 + rng.next() * 0.034;   // rise
    emb[i * 6 + 3] = 0.9 + rng.next() * 3.4;       // radius
    emb[i * 6 + 4] = rng.next() * TAU;             // flicker phase
    emb[i * 6 + 5] = rng.next();                   // colour / drift bias
  }

  /** One soft ember, baked once. 32 px is enough — it is always drawn small. */
  const spark = (() => {
    const s = document.createElement('canvas');
    s.width = s.height = 32;
    const sg = s.getContext('2d');
    const gr = sg.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,238,206,1)');
    gr.addColorStop(0.20, 'rgba(255,190,110,0.90)');
    gr.addColorStop(0.48, 'rgba(238,110,40,0.34)');
    gr.addColorStop(1, 'rgba(170,50,12,0)');
    sg.fillStyle = gr; sg.fillRect(0, 0, 32, 32);
    return s;
  })();

  /**
   * The static field — base gradient, horizon glow, vignette, and DITHER —
   * baked once per resize and blitted as one image.
   *
   * The dither is not decoration. This screen is ~1.5 million pixels of a very
   * dark, very smooth radial ramp written to an 8-bit surface, which is
   * textbook CRITIC.md #9 ("banding in gradients"): between #150C06 and #030201
   * there are about eighteen distinct values across 900 px of ramp. A ±1.5 LSB
   * ordered-ish noise breaks every one of those steps. Baking it means it costs
   * nothing per frame *and* it stays fixed instead of crawling, which is what
   * per-frame noise would do.
   */
  let field = null;
  function bakeField() {
    // Baked at CSS resolution, never at DPR. `getImageData` over a 4K backing
    // store is a 33 MB read-modify-write and on a 2x display that is a
    // quarter-second hitch during the exact seconds the boot queue is trying to
    // hold 60 fps. Upscaled 2x the dither becomes 2x2 blocks, which is still
    // far above the frequency of the banding it is there to break.
    const f = document.createElement('canvas');
    f.width = Math.max(1, Math.round(W)); f.height = Math.max(1, Math.round(H));
    const fg = f.getContext('2d');

    const bg = fg.createRadialGradient(W * 0.5, H * 0.60, 0, W * 0.5, H * 0.60, Math.max(W, H) * 0.80);
    bg.addColorStop(0, '#17100A');
    bg.addColorStop(0.42, '#0B0704');
    bg.addColorStop(1, '#030201');
    fg.fillStyle = bg; fg.fillRect(0, 0, W, H);

    // The basin burning somewhere below the frame. Warmer and taller than the
    // first pass, because it is the only thing separating this from a black rect.
    const hz = fg.createLinearGradient(0, H * 1.02, 0, H * 0.40);
    hz.addColorStop(0, 'rgba(255,104,38,0.30)');
    hz.addColorStop(0.34, 'rgba(206,72,24,0.13)');
    hz.addColorStop(0.72, 'rgba(150,50,16,0.045)');
    hz.addColorStop(1, 'rgba(0,0,0,0)');
    fg.fillStyle = hz; fg.fillRect(0, H * 0.38, W, H * 0.64);

    // a cold counter-light from the upper left, so the field has a direction
    const cl = fg.createRadialGradient(W * 0.16, -H * 0.10, 0, W * 0.16, -H * 0.10, Math.max(W, H) * 0.62);
    cl.addColorStop(0, 'rgba(96,120,132,0.075)');
    cl.addColorStop(0.55, 'rgba(70,92,104,0.026)');
    cl.addColorStop(1, 'rgba(0,0,0,0)');
    fg.fillStyle = cl; fg.fillRect(0, 0, W, H);

    const vg = fg.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.30, W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.52)');
    fg.fillStyle = vg; fg.fillRect(0, 0, W, H);

    // dither, ±~1.7 LSB, deterministic
    const img = fg.getImageData(0, 0, f.width, f.height);
    const d = img.data, dr = rng.fork('dither');
    for (let i = 0; i < d.length; i += 4) {
      const n = (dr.next() - 0.5) * 3.4;
      d[i] = clamp(d[i] + n, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n, 0, 255);
    }
    fg.putImageData(img, 0, 0);
    field = f;
  }

  let dpr = 1, W = 0, H = 0, t0 = performance.now(), raf = 0, shown = 0;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, window.innerWidth | 0); H = Math.max(1, window.innerHeight | 0);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    bakeField();
  }
  size();
  addEventListener('resize', size, { passive: true });

  function frame(now) {
    if (boot.classList.contains('done')) {
      // the CSS opacity transition is 600 ms; stop drawing once it is gone
      if (!frame._doneAt) frame._doneAt = now;
      if (now - frame._doneAt > 700) { cancelAnimationFrame(raf); cv.remove(); return; }
    }
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;

    const u = clamp(H / 1080, 0.6, 1.7);
    g.clearRect(0, 0, W, H);

    // --- field ---------------------------------------------------------------
    g.drawImage(field, 0, 0, W, H);

    // Slow smoke. Three very large soft lobes on `lighter` at drifting phases —
    // the whole point is that the field is never the same two seconds running,
    // which is what stops a loading screen reading as a still image with a
    // progress bar taped to it.
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const ph = t * (0.030 + i * 0.017) + i * 2.1;
      const px = W * (0.50 + 0.34 * Math.sin(ph));
      const py = H * (0.74 - 0.20 * Math.sin(ph * 0.71 + i));
      const r = Math.max(W, H) * (0.24 + 0.07 * Math.sin(ph * 1.7));
      const sm = g.createRadialGradient(px, py, 0, px, py, r);
      const a = (0.050 - i * 0.010) * (0.7 + 0.3 * Math.sin(ph * 2.3));
      sm.addColorStop(0, `rgba(190,88,34,${Math.max(0, a).toFixed(4)})`);
      sm.addColorStop(0.55, `rgba(140,60,24,${Math.max(0, a * 0.35).toFixed(4)})`);
      sm.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sm;
      g.fillRect(px - r, py - r, r * 2, r * 2);
    }
    g.restore();

    // --- embers --------------------------------------------------------------
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const y = (emb[i * 6 + 1] - t * emb[i * 6 + 2]) % 1;
      const yy = (y < 0 ? y + 1 : y) * H;
      const bias = emb[i * 6 + 5];
      const xx = (emb[i * 6] + Math.sin(t * (0.22 + bias * 0.3) + emb[i * 6 + 4]) * 0.014) * W;
      const fl = 0.30 + 0.70 * (0.5 + 0.5 * Math.sin(t * (1.6 + bias * 1.4) + emb[i * 6 + 4] * 3.1));
      const r = emb[i * 6 + 3] * u * (0.8 + 0.35 * fl);
      // brighter low in the frame, where the fire is
      const a = fl * (0.16 + 0.62 * Math.pow(yy / H, 1.4));
      g.globalAlpha = a;
      g.drawImage(spark, xx - r, yy - r, r * 2, r * 2);
      // the faster ones streak
      if (emb[i * 6 + 2] > 0.030) {
        g.globalAlpha = a * 0.30;
        g.drawImage(spark, xx - r * 0.5, yy - r * 0.6, r, r * 5.5);
      }
    }
    g.restore();
    g.globalAlpha = 1;

    // --- wordmark ------------------------------------------------------------
    const cx = W * 0.5, cy = H * 0.44;
    const size1 = 45 * u;
    Type.draw(g, 'CINDERBLOOM', cx, cy, {
      size: size1, tracking: 15 * u, weight: 3.9 * u, align: 'center',
      color: '#F3E2C6', alpha: 0.96, halo: 0,
    });
    // a second, offset ember pass under it — the wordmark reads as hot metal
    g.save();
    g.globalCompositeOperation = 'lighter';
    Type.draw(g, 'CINDERBLOOM', cx, cy + 1.4 * u, {
      size: size1, tracking: 15 * u, weight: 1.1 * u, align: 'center',
      color: '#FF7A2E', alpha: 0.42, halo: 0,
    });
    g.restore();

    Type.draw(g, 'SURVEY 9 · THESSALY BASIN · KILN SYSTEM', cx, cy + 30 * u, {
      size: 9.4 * u, tracking: 7.2 * u, weight: 1.3 * u, align: 'center',
      color: PALETTE.dim, alpha: 0.62, halo: 0,
    });

    // --- progress ------------------------------------------------------------
    const bw = Math.min(W * 0.52, 520 * u), bx = cx - bw * 0.5, by = cy + 76 * u;
    const pct = parseFloat((bar && bar.style.width) || '0') / 100 || 0;
    shown += (pct - shown) * 0.14;

    g.globalAlpha = 0.16; g.fillStyle = PALETTE.ink2;
    g.fillRect(bx, by, bw, Math.max(1, 1 * u));
    // tick scale, every tenth
    for (let i = 0; i <= 10; i++) {
      g.globalAlpha = i % 5 === 0 ? 0.34 : 0.16;
      g.fillRect(bx + (bw - 1) * i / 10, by - 3.5 * u, Math.max(1, 1 * u), 3.5 * u);
    }
    g.globalAlpha = 1;
    const grd = g.createLinearGradient(bx, 0, bx + bw, 0);
    grd.addColorStop(0, '#B8622A'); grd.addColorStop(1, '#FFC978');
    g.fillStyle = grd;
    g.fillRect(bx, by - 0.5 * u, bw * shown, Math.max(1.6, 2.2 * u));
    // head glow
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55;
    g.fillStyle = '#FFD79A';
    g.fillRect(bx + bw * shown - 12 * u, by - 1.5 * u, 12 * u, Math.max(2, 4 * u));
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    const label = ((stage && stage.textContent) || 'initialising').toUpperCase();
    Type.draw(g, label, bx, by + 20 * u, {
      size: 9 * u, tracking: 4.4 * u, weight: 1.25 * u,
      color: PALETTE.ink2, alpha: 0.55, halo: 0,
    });
    Type.draw(g, Math.round(shown * 100) + '%', bx + bw, by + 20 * u, {
      size: 9 * u, tracking: 2.6 * u, weight: 1.25 * u, align: 'right',
      color: PALETTE.amber, alpha: 0.72, halo: 0,
    });
    // cursor
    if ((t * 2) % 2 < 1) {
      const lw = Type.measure(label, 9 * u, 4.4 * u, 1.25 * u);
      g.globalAlpha = 0.5; g.fillStyle = PALETTE.amber;
      g.fillRect(bx + lw + 3 * u, by + 12 * u, 5 * u, 8 * u);
      g.globalAlpha = 1;
    }

    // --- frame furniture ------------------------------------------------------
    const m = Math.round(38 * u);
    brackets(g, m, m, W - m * 2, H - m * 2, 22 * u, PALETTE.dim, 0.20, Math.max(1, 1 * u));
    Type.draw(g, 'EXPEDITION MATERIEL · CLASSIFIED', m + 6 * u, H - m - 8 * u, {
      size: 8 * u, tracking: 3.4 * u, weight: 1.2 * u,
      color: PALETTE.dim, alpha: 0.22, halo: 0,
    });
    Type.draw(g, '0.2.0', W - m - 6 * u, H - m - 8 * u, {
      size: 8 * u, tracking: 2.4 * u, weight: 1.2 * u, align: 'right',
      color: PALETTE.dim, alpha: 0.22, halo: 0,
    });
  }
  raf = requestAnimationFrame(frame);
})();

// =============================================================================
// 2. THE MENU SYSTEM
// =============================================================================

const PAGES = {
  title: ['BEGIN SURVEY', 'CONTROLS', 'SETTINGS'],
  pause: ['RESUME', 'CONTROLS', 'SETTINGS', 'ABANDON SURVEY'],
  controls: ['BACK'],
  failed: ['RETRY SURVEY', 'RETURN TO TITLE'],
  complete: ['BEGIN ANOTHER SURVEY', 'RETURN TO TITLE'],
};

export class Menu {
  static id = 'menu';
  static deps = [];

  constructor(ctx) {
    this.ctx = ctx;
    this.page = null;          // null | 'title' | 'pause' | 'settings'
    this.back = 'title';
    this.sel = 0;
    this.hover = -1;
    this.rows = [];
    this.hit = [];
    this.dirty = true;
    this.t = 0;
    this.dragging = null;
    this._hadLock = false;
    this._cine = null;
    this.outcome = null;
    this._menuPadPrev = {
      up: false, down: false, left: false, right: false,
      accept: false, back: false, start: false,
    };
    this._menuRaf = 0;
    this.k = ctx.debug.menu = {
      force: false,
      scrim: 0.72,
      titleCamera: true,   // move the camera to an authored vantage behind the title
      titleVista: 'ridge', // which VISTAS entry that vantage comes from
    };
  }

  async init() {
    const root = document.createElement('div');
    root.id = 'menu';
    root.innerHTML = `<style>
      #menu{position:fixed;inset:0;z-index:60;pointer-events:none;opacity:0;
            transition:opacity .22s ease;contain:layout style paint;}
      #menu.on{pointer-events:auto;opacity:1;cursor:default;}
      #menu canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
    </style>`;
    this.cv = document.createElement('canvas');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-hidden', 'true');
    root.inert = true;
    this.cv.tabIndex = 0;
    this.cv.setAttribute('role', 'application');
    root.appendChild(this.cv);
    this.live = document.createElement('div');
    this.live.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;';
    this.live.setAttribute('aria-live', 'polite');
    root.appendChild(this.live);
    (document.getElementById('ui') || document.body).appendChild(root);
    this.root = root;
    this.g = this.cv.getContext('2d');

    this._buildSettings();
    this._load();
    this._resize();

    root.addEventListener('mousemove', e => this._onMove(e));
    root.addEventListener('mousedown', e => this._onDown(e));
    addEventListener('mouseup', () => { this.dragging = null; });
    addEventListener('keydown', e => this._onKey(e), true);
    this.ctx.bus.on('pointerlock', on => {
      if (on) { this._hadLock = true; this.hide(); }
      else if (this._hadLock && !this.page) this.show('pause');
    });
    this.ctx.bus.on('mission:failed', p => {
      this.outcome = { kind: 'failed', detail: p?.reason || 'objective unresolved' };
      if (!this._headless()) { this.show('failed'); document.exitPointerLock?.(); }
    });
    this.ctx.bus.on('mission:complete', p => {
      this.outcome = { kind: 'complete', detail: p?.deaths ? `${p.deaths} signal losses` : 'all objectives resolved' };
      if (!this._headless()) { this.show('complete'); document.exitPointerLock?.(); }
    });
    this.ctx.bus.on('ui:pause', () => {
      if (this.page || this._headless()) return;
      // Consume the Start edge that opened this page. The UI rAF sees the same
      // physical press a moment later; without priming it, pause instantly
      // closes itself before the player can even see it.
      this._menuPadPrev.start = true;
      this.show('pause');
      document.exitPointerLock?.();
    });

    // Fixed simulation is intentionally frozen on every menu page, so gamepad
    // navigation must live on the UI clock. Otherwise a controller can play the
    // mission but can never press BEGIN, RESUME, or RETRY.
    const pollPad = () => {
      if (this.page) this._pollMenuGamepad();
      this._menuRaf = requestAnimationFrame(pollPad);
    };
    this._menuRaf = requestAnimationFrame(pollPad);

    // The harness must never photograph a menu it did not ask for.
    const forced = this.k.force || /[?&]menu\b/.test(location.search);
    const headless = typeof navigator !== 'undefined' && navigator.webdriver;
    this.ctx.bus.on('ready', () => { if (forced || !headless) this.show('title'); });
  }

  // ---------------------------------------------------------------------------
  _buildSettings() {
    const c = this.ctx;
    const cmb = () => (c.debug.combat || (c.debug.combat = {}));
    const hud = () => c.debug.hud || {};
    const inp = () => c.sys.input;
    const aud = () => c.sys.audio;

    // COMBAT_FEEL §1.1:  vFOV = 2·atan( tan(hFOV4:3 / 2) · 0.75 )
    // so the slider figure every shooter shows is the INVERSE. Dividing, not
    // multiplying — the first build of this printed "51" for the 65° vertical
    // default, i.e. it was showing a number narrower than the vertical FOV.
    const hFovFromV = v => 2 * Math.atan(Math.tan(v * DEG / 2) / 0.75) / DEG;

    this.rows = [
      { t: 'head', label: 'DISPLAY' },
      {
        t: 'enum', label: 'QUALITY PRESET', key: 'quality',
        values: ['low', 'medium', 'high', 'ultra'],
        show: v => v.toUpperCase(),
        get: () => c.quality.preset,
        set: v => { c.setQuality(v); },
        // PLAYER-FACING COPY ONLY, EVERYWHERE IN THIS TABLE. The first version
        // of these notes cited section numbers out of docs/COMBAT_FEEL.md
        // ("COMBAT_FEEL §1.2", "0.0022 rad per count") straight onto the screen.
        // A shipped options menu does not quote its own design document at the
        // player, and a settings page that does is CRITIC.md #13 with extra
        // steps. Say what the setting does to the game.
        note: 'HIGHER PRESETS ADD SHADOW RESOLUTION, VOLUMETRIC STEPS AND REFLECTIONS.',
      },
      {
        t: 'range', label: 'FIELD OF VIEW', key: 'fov', min: 47, max: 90, step: 1,
        show: v => Math.round(hFovFromV(v)) + '  (' + Math.round(v) + ' VERT)',
        get: () => c.camera.fov,
        set: v => { c.camera.fov = v; c.camera.updateProjectionMatrix(); cmb().fovWorld = v; },
        note: 'THE HORIZONTAL FIGURE, MEASURED THE WAY OTHER SHOOTERS MEASURE IT.',
      },
      {
        t: 'range', label: 'HUD OPACITY', key: 'hudOpacity', min: 0.2, max: 1, step: 0.05,
        show: v => Math.round(v * 100) + '%', get: () => hud().opacity ?? 1,
        set: v => { if (c.debug.hud) { c.debug.hud.opacity = v; c.sys.hud?._markAll(); } },
      },
      {
        t: 'range', label: 'HUD SCALE', key: 'hudScale', min: 0.8, max: 1.35, step: 0.05,
        show: v => v.toFixed(2) + '×', get: () => hud().scale ?? 1,
        set: v => { if (c.debug.hud) { c.debug.hud.scale = v; c.sys.hud?.resize(); } },
      },

      { t: 'head', label: 'CONTROL' },
      {
        t: 'range', label: 'SENSITIVITY', key: 'sens', min: 0.15, max: 3.0, step: 0.05,
        show: v => v.toFixed(2), get: () => (inp()?.sensitivity ?? 0.0022) / 0.0022,
        set: v => { const i = inp(); if (i) i.sensitivity = 0.0022 * v; },
        note: 'HOW FAR THE VIEW TURNS PER CENTIMETRE OF MOUSE. 1.00 IS THE DEFAULT.',
      },
      {
        t: 'range', label: 'AIM SENSITIVITY', key: 'adsCoupling', min: 0, max: 1, step: 0.05,
        show: v => v === 0 ? 'MATCHED' : v === 1 ? 'RAW' : v.toFixed(2),
        get: () => cmb().adsSensCoupling ?? 0,
        set: v => { cmb().adsSensCoupling = v; },
        note: 'MATCHED KEEPS THE SAME TURN SPEED THROUGH THE SIGHT. RAW DOES NOT.',
      },
      {
        t: 'range', label: 'CROSSHAIR', key: 'crosshair', min: 0, max: 1, step: 0.05,
        show: v => v === 0 ? 'OFF' : Math.round(v * 100) + '%', get: () => hud().crosshair ?? 1,
        set: v => { if (c.debug.hud) { c.debug.hud.crosshair = v; c.sys.hud && (c.sys.hud._dRet = true); } },
      },

      { t: 'head', label: 'FEEDBACK' },
      {
        t: 'bool', label: 'DAMAGE NUMBERS', key: 'dmgNum',
        get: () => !!hud().damageNumbers,
        set: v => { if (c.debug.hud) c.debug.hud.damageNumbers = v; },
        note: 'HIT MARKERS ALREADY TELL YOU. NUMBERS COMPETE WITH THEM.',
      },
      {
        t: 'bool', label: 'COMPASS', key: 'compass',
        get: () => hud().compass !== false,
        set: v => { if (c.debug.hud) { c.debug.hud.compass = v; c.sys.hud && (c.sys.hud._dCom = true); } },
      },
      {
        // The front end force-disables motion blur while a page is up (see
        // _enterCinematic). Left naive, this row would then READ that forced
        // value, display OFF, and `_save()` would write OFF into localStorage on
        // hide — the player would lose motion blur permanently by opening the
        // pause menu once. So while the cinematic hold is active the row is a
        // view onto the stashed value, not onto the live flag.
        t: 'bool', label: 'MOTION BLUR', key: 'motionBlur',
        get: () => (this._cine ? this._cine.mblur !== false : c.debug.flags.motionBlur !== false),
        set: v => {
          if (this._cine) { this._cine.mblur = v; return; }
          c.debug.flags.motionBlur = v;
          c.bus.emit('debugFlag', { flag: 'motionBlur', on: v });
        },
      },
      { t: 'head', label: 'AUDIO' },
      {
        // audio.js publishes setMasterVolume/K.master. Guarded: it is a large
        // system and this row must not be the thing that throws if it is
        // mid-build or if WebAudio never got a user gesture to start.
        t: 'range', label: 'MASTER VOLUME', key: 'vol', min: 0, max: 1.2, step: 0.05,
        show: v => Math.round(v * 100) + '%',
        get: () => aud()?.K?.master ?? 0.85,
        set: v => { try { aud()?.setMasterVolume?.(v); } catch { /* audio mid-build */ } },
      },
      {
        t: 'bool', label: 'MUTE', key: 'mute',
        get: () => !!aud()?.K?.mute,
        set: v => { try { aud()?.mute?.(v); } catch { /* audio mid-build */ } },
      },

      { t: 'action', label: 'BACK', act: () => this.show(this.back) },
    ];
  }

  _save() {
    try {
      const o = {};
      for (const r of this.rows) if (r.key) o[r.key] = r.get();
      localStorage.setItem(STORE, JSON.stringify(o));
    } catch { /* private mode — settings are simply not persisted */ }
  }

  _load() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { o = null; }
    if (!o) return;
    for (const r of this.rows) {
      if (!r.key || o[r.key] === undefined) continue;
      try { r.set(r.t === 'range' ? +o[r.key] : o[r.key]); } catch { /* stale setting */ }
    }
  }

  // ---------------------------------------------------------------------------
  /**
   * THE TITLE CAMERA.
   *
   * The first capture of this stage (`tests/shots/menu-title.png`) is why this
   * exists. The title screen renders over the live world, and the live world at
   * boot is the player's spawn pose — mid-fall, one metre from a boulder, with
   * per-object motion blur turning the whole background into a radial smear
   * centred on the frame. Beautiful typography over that reads as a bug.
   *
   * A shipped title screen has an authored camera. So: stash the world state,
   * jump to a vista the orchestrator maintains, freeze the sim so nothing falls
   * or drifts, and put everything back the moment the player begins. The pose
   * is READ from `__CB.VISTAS` rather than copied into this file — HANDOFF's
   * repo-wide note is that a vista pose copied out of another agent's table is
   * stale the moment that agent ships, and two systems have already eaten that.
   *
   * `pause` deliberately does NOT get this. You pause where you are standing.
   */
  _enterCinematic() {
    if (this._cine || !this.k.titleCamera) return;
    const c = this.ctx;
    const pl = c.sys.player;
    if (!pl || typeof pl.teleport !== 'function' || !pl.pos) return;
    let V = null;
    try { V = (typeof window !== 'undefined' && window.__CB && window.__CB.VISTAS) || null; } catch { V = null; }
    const name = V && (V[this.k.titleVista] ? this.k.titleVista : (V.ridge ? 'ridge' : null));
    if (!name) return;
    const sky = c.sys.sky, grade = c.sys.grade;
    this._cine = {
      pos: [pl.pos.x, pl.pos.y, pl.pos.z], yaw: pl.yaw, pitch: pl.pitch,
      time: sky ? sky.timeOfDay : null,
      weather: sky ? sky.weather : null,
      area: grade ? grade._area : null,
      mblur: c.debug.flags.motionBlur,
    };
    // Motion blur off for the whole front end: even a frozen sim leaves one
    // frame of velocity in the buffer, and the pause page is entered from a
    // sprint. Restored on exit, including whatever the settings row had set.
    c.debug.flags.motionBlur = false;
    c.bus.emit('debugFlag', { flag: 'motionBlur', on: false });
    try { window.__CB.gotoVista(name); } catch { /* orchestrator mid-edit */ }
  }

  _exitCinematic() {
    const s = this._cine;
    if (!s) return;
    this._cine = null;
    const c = this.ctx;
    c.debug.flags.motionBlur = s.mblur;
    c.bus.emit('debugFlag', { flag: 'motionBlur', on: s.mblur !== false });
    if (s.time != null) c.sys.sky?.setTimeOfDay?.(s.time);
    if (s.weather) c.sys.sky?.setWeather?.(s.weather);
    if (s.area) c.sys.grade?.setArea?.(s.area, 0);
    // Only the title path moved the camera. `teleport` also zeroes velocity and
    // the bob clock, so calling it on resume-from-pause would eat the player's
    // momentum — a hitch you would feel and never be able to explain.
    if (s.pos) c.sys.player?.teleport?.(s.pos, s.yaw, s.pitch);
    try { window.__CB.resetAllTemporal(); } catch { /* not the harness */ }
  }

  show(page) {
    if (!PAGES[page] && page !== 'settings') return;
    if ((page === 'settings' || page === 'controls') && !this.page) this.back = 'title';
    else if (page !== 'settings' && page !== 'controls') this.back = page;
    const wasPage = this.page;
    this.page = page;
    this.sel = 0; this.hover = -1;
    this.root.inert = false;
    this.root.classList.add('on');
    this.root.setAttribute('aria-hidden', 'false');
    this.dirty = true;
    if (page === 'title') {
      // ABANDON SURVEY goes pause -> title, and the pause path installs a
      // pos-less `_cine` stub that would make _enterCinematic() bail and leave
      // the title over the gameplay pose. Discard the stub, then take the shot.
      if (this._cine && !this._cine.pos) this._exitCinematic();
      this._enterCinematic();
    } else if (page === 'pause' && !wasPage) {
      // Pause keeps the pose but still wants the blur off and one clean frame.
      this._cine = { pos: null, mblur: this.ctx.debug.flags.motionBlur };
      this.ctx.debug.flags.motionBlur = false;
      this.ctx.bus.emit('debugFlag', { flag: 'motionBlur', on: false });
    }
    // Every front-end page freezes the sim. The player is not playing.
    if (!this._headless()) this.ctx.time.scale = 0;
    // A title screen with a live ammo counter under it is not a title screen.
    this.ctx.sys.hud?.setVisible?.(false);
    this._paint();
    this.cv.focus({ preventScroll: true });
    return page;
  }

  hide() {
    if (!this.page) return;
    this.page = null;
    // The menu canvas owns focus while the dialog is open. Move it to the game
    // surface before hiding/inerting the dialog; otherwise Chromium correctly
    // warns that aria-hidden has swallowed the focused accessibility node.
    if (this.root.contains(document.activeElement)) {
      this.ctx.canvas.tabIndex = -1;
      this.ctx.canvas.focus?.({ preventScroll: true });
    }
    this.root.classList.remove('on');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.inert = true;
    this._exitCinematic();
    this.ctx.time.scale = 1;
    this.ctx.sys.hud?.setVisible?.(true);
    this._save();
  }

  _headless() { return typeof navigator !== 'undefined' && !!navigator.webdriver; }

  // See the same trap in hud.js: resize() lands before init().
  resize() { if (!this.cv) return; this._resize(); this._paint(); }

  _resize() {
    const s = this.ctx.size;
    this.W = Math.max(320, s.w | 0); this.H = Math.max(240, s.h | 0);
    this.dpr = clamp(s.dpr || 1, 1, 2);
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.H * this.dpr);
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.u = clamp(this.H / 1080, 0.62, 1.6);
    this.dirty = true;
  }

  update(dt) {
    if (!this.page) return;
    this.t += dt;
    if (this.dirty) { this._paint(); this.dirty = false; }
  }

  /**
   * Repaint NOW, not on the next sim step. The pause page sets
   * `ctx.time.scale = 0`, which means `update()` is never called again — a
   * menu that only repaints from the sim loop is frozen the moment it pauses
   * the sim, and every hover and every slider drag does nothing.
   */
  _repaint() { this.dirty = false; this._paint(); }

  _syncA11y() {
    if (!this.cv || !this.page) return;
    const items = this._items();
    const selected = items[clamp(this.sel, 0, Math.max(0, items.length - 1))];
    const value = selected?.get ? `, ${selected.show ? selected.show(selected.get()) : selected.get()}` : '';
    const label = `${this.page} menu. ${selected ? `Selected ${selected.label}${value}. ` : ''}` +
      `Options: ${items.map(i => i.label).join(', ')}. Use arrow keys and Enter.`;
    this.cv.setAttribute('aria-label', label);
    if (this.live) this.live.textContent = selected ? `${selected.label}${value}` : this.page;
  }

  _requestLock() {
    try {
      const pending = this.ctx.canvas.requestPointerLock?.();
      pending?.catch?.(() => { /* controller play does not require mouse lock */ });
    } catch { /* unsupported or denied outside a pointer gesture */ }
  }

  _pollMenuGamepad() {
    const pads = navigator.getGamepads?.();
    let pad = null;
    if (pads) for (let i = 0; i < pads.length; i++) {
      if (pads[i]?.connected && pads[i].mapping === 'standard') { pad = pads[i]; break; }
    }
    const btn = i => !!(pad?.buttons?.[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
    const now = pad ? {
      up: btn(12) || (pad.axes?.[1] || 0) < -0.55,
      down: btn(13) || (pad.axes?.[1] || 0) > 0.55,
      left: btn(14) || (pad.axes?.[0] || 0) < -0.55,
      right: btn(15) || (pad.axes?.[0] || 0) > 0.55,
      accept: btn(0), back: btn(1), start: btn(9),
    } : { up: false, down: false, left: false, right: false, accept: false, back: false, start: false };
    const prev = this._menuPadPrev;
    const items = this._items();
    if (items.length) {
      if (now.down && !prev.down) this.sel = (this.sel + 1) % items.length;
      if (now.up && !prev.up) this.sel = (this.sel + items.length - 1) % items.length;
      const row = items[clamp(this.sel, 0, items.length - 1)];
      if (now.left && !prev.left) this._nudge(row, -1);
      if (now.right && !prev.right) this._nudge(row, 1);
      if (now.accept && !prev.accept) this._activate(row);
      if ((now.up && !prev.up) || (now.down && !prev.down)) this._repaint();
    }
    if (now.back && !prev.back) {
      if (this.page === 'settings' || this.page === 'controls') this.show(this.back);
      else if (this.page === 'pause') { this.hide(); this._requestLock(); }
    }
    if (now.start && !prev.start) {
      if (this.page === 'settings') this.show(this.back);
      else if (this.page === 'pause') { this.hide(); this._requestLock(); }
    }
    this._menuPadPrev = now;
  }

  // ---------------------------------------------------------------------------
  // input
  // ---------------------------------------------------------------------------
  _items() {
    if (this.page === 'settings') return this.rows.filter(r => r.t !== 'head');
    return (PAGES[this.page] || []).map(label => ({ t: 'action', label }));
  }

  _onKey(e) {
    if (e.code === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (this.page === 'settings') this.show(this.back);
      else if (this.page === 'failed' || this.page === 'complete') return;
      else if (this.page) this.hide();
      else this.show('pause');
      return;
    }
    if (!this.page) return;
    const items = this._items();
    if (!items.length) return;
    const r = items[clamp(this.sel, 0, items.length - 1)];
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { this.sel = (this.sel + 1) % items.length; this._repaint(); e.preventDefault(); }
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') { this.sel = (this.sel + items.length - 1) % items.length; this._repaint(); e.preventDefault(); }
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { this._nudge(r, e.code === 'ArrowRight' ? 1 : -1); e.preventDefault(); }
    else if (e.code === 'Enter' || e.code === 'Space') { this._activate(r); e.preventDefault(); }
  }

  _nudge(r, dir) {
    if (!r) return;
    if (r.t === 'range') { r.set(clamp(+(r.get() + dir * r.step).toFixed(4), r.min, r.max)); }
    else if (r.t === 'enum') { const i = r.values.indexOf(r.get()); r.set(r.values[clamp(i + dir, 0, r.values.length - 1)]); }
    else if (r.t === 'bool') { r.set(dir > 0); }
    else return;
    this._repaint(); this._save();
  }

  _activate(r) {
    if (!r) return;
    if (r.t === 'bool') { r.set(!r.get()); this._repaint(); this._save(); return; }
    if (r.t === 'enum') { const i = r.values.indexOf(r.get()); r.set(r.values[(i + 1) % r.values.length]); this._repaint(); this._save(); return; }
    if (r.act) { r.act(); return; }
    switch (r.label) {
      case 'BEGIN SURVEY':
        this.hide();
        // BEGIN is a new contract, not a synonym for RESUME. Starting here also
        // sets director.active before pointer lock arrives, so the pointer-lock
        // auto-start hook cannot launch a second copy of the mission.
        this.ctx.sys.director?.startFreshMission?.();
        this._requestLock();
        break;
      case 'RESUME':
        this.hide();
        this._requestLock();
        break;
      case 'RETRY SURVEY':
      case 'BEGIN ANOTHER SURVEY':
        this.outcome = null;
        this.hide();
        this.ctx.sys.director?.startFreshMission?.();
        this._requestLock();
        break;
      case 'RETURN TO TITLE':
        this.outcome = null;
        this.ctx.sys.director?.resetSession?.({ loadout: true, teleport: true });
        this.show('title');
        break;
      case 'CONTROLS': this.back = this.page === 'pause' ? 'pause' : 'title'; this.show('controls'); break;
      case 'SETTINGS': this.back = this.page === 'pause' ? 'pause' : 'title'; this.show('settings'); break;
      case 'BACK': this.show(this.back); break;
      case 'ABANDON SURVEY':
        // Tear the run down before the title cinematic snapshots a pose. The old
        // path only painted the title over a still-active director; BEGIN then
        // resumed the abandoned fight because pointer lock saw `active === true`.
        this.ctx.sys.director?.resetSession?.({ loadout: true, teleport: true });
        this.show('title');
        break;
      default: break;
    }
  }

  _pick(e) {
    const r = this.cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = 0; i < this.hit.length; i++) {
      const h = this.hit[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return { i, h, x, y };
    }
    return { i: -1, h: null, x, y };
  }

  _onMove(e) {
    if (!this.page) return;
    const p = this._pick(e);
    if (this.dragging) {
      const r = this.dragging.row, h = this.dragging.h;
      const f = sat((p.x - h.sx) / Math.max(1, h.sw));
      const v = r.min + Math.round(f * (r.max - r.min) / r.step) * r.step;
      r.set(clamp(+v.toFixed(4), r.min, r.max));
      this._repaint();
      return;
    }
    if (p.i !== this.hover) { this.hover = p.i; if (p.i >= 0) this.sel = p.i; this._repaint(); }
  }

  _onDown(e) {
    if (!this.page) return;
    const p = this._pick(e);
    if (p.i < 0) return;
    this.sel = p.i;
    const r = this._items()[p.i];
    if (r && r.t === 'range' && p.h.sw && p.x >= p.h.sx - 8) {
      this.dragging = { row: r, h: p.h };
      this._onMove(e);
      return;
    }
    this._activate(r);
    this._save();
  }

  // ---------------------------------------------------------------------------
  // paint
  // ---------------------------------------------------------------------------
  _paint() {
    if (!this.page) return;
    const g = this.g, W = this.W, H = this.H, u = this.u;
    g.clearRect(0, 0, W, H);

    // Scrim over the live frame. Two layers: a flat warm base so the type
    // always has a value to sit on, plus a left-weighted wash because the copy
    // lives on the left rail and that is where the contrast has to be. The
    // right side stays open so the world is still visibly there — the whole
    // point of rendering the menu over the running game rather than a card.
    // The flat term used to be sc·0.60 across the whole frame, and the first
    // title capture showed what that costs: the ridge behind it — the best frame
    // in the build — was flattened to a uniform mud with no value structure left
    // in it. A title screen dims the world to make room for the copy; it does
    // not erase it. The flat term is now small, the left rail carries almost all
    // of the darkening, and the settings page (which has four times the copy)
    // gets the heavier version.
    const sc = this.k.scrim;
    const detailPage = this.page === 'settings' || this.page === 'controls';
    const flat = sc * (detailPage ? 0.50 : 0.24);
    g.fillStyle = `rgba(6,4,3,${flat.toFixed(3)})`;
    g.fillRect(0, 0, W, H);
    const side = g.createLinearGradient(0, 0, W * (detailPage ? 0.86 : 0.62), 0);
    side.addColorStop(0, `rgba(4,3,2,${(sc * 0.96).toFixed(3)})`);
    side.addColorStop(0.38, `rgba(4,3,2,${(sc * 0.58).toFixed(3)})`);
    side.addColorStop(0.74, `rgba(4,3,2,${(sc * 0.20).toFixed(3)})`);
    side.addColorStop(1, 'rgba(4,3,2,0)');
    g.fillStyle = side; g.fillRect(0, 0, W, H);
    const edge = g.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.30, W * 0.5, H * 0.5, Math.max(W, H) * 0.80);
    edge.addColorStop(0, 'rgba(3,2,1,0)');
    edge.addColorStop(1, `rgba(3,2,1,${(sc * 0.46).toFixed(3)})`);
    g.fillStyle = edge; g.fillRect(0, 0, W, H);

    const m = Math.round(74 * u);
    brackets(g, m * 0.62, m * 0.62, W - m * 1.24, H - m * 1.24, 24 * u, PALETTE.dim, 0.18, Math.max(1, 1 * u));

    const L = m;                       // left rail
    if (this.page === 'settings') this._paintSettings(g, L, u, W, H);
    else if (this.page === 'controls') this._paintControls(g, L, u, W, H);
    else this._paintFront(g, L, u, W, H);

    // footer
    const hintY = H - m * 0.62 - 10 * u;
    const hint = this.page === 'settings' ? 'SELECT · ADJUST · ESC BACK'
      : this.page === 'controls' ? 'ESC OR ENTER · BACK'
      : this.page === 'pause' ? 'ESC RESUME'
        : (this.page === 'failed' || this.page === 'complete') ? 'SELECT · ENTER'
        : 'CLICK OR ENTER TO BEGIN';
    Type.draw(g, hint, L, hintY, {
      size: 8.6 * u, tracking: 3.6 * u, weight: 1.25 * u,
      color: PALETTE.dim, alpha: 0.34, halo: 0,
    });
    this._syncA11y();
  }

  _paintFront(g, L, u, W, H) {
    const title = this.page === 'pause' ? 'PAUSED'
      : this.page === 'failed' ? 'SURVEY LOST'
        : this.page === 'complete' ? 'SURVEY COMPLETE' : 'CINDERBLOOM';
    const compact = this.page !== 'title';
    const ty = H * 0.36;
    Type.draw(g, title, L, ty, {
      size: (compact ? 30 : 44) * u, tracking: 14 * u,
      weight: (compact ? 2.6 : 3.4) * u,
      color: '#F3E2C6', alpha: 0.97, halo: 0,
    });
    g.save(); g.globalCompositeOperation = 'lighter';
    Type.draw(g, title, L, ty + 1.4 * u, {
      size: (compact ? 30 : 44) * u, tracking: 14 * u, weight: 1.1 * u,
      color: '#FF7A2E', alpha: 0.36, halo: 0,
    });
    g.restore();
    const sub = this.page === 'pause' ? 'SURVEY SUSPENDED'
      : this.page === 'failed' ? String(this.outcome?.detail || 'OBJECTIVE UNRESOLVED').toUpperCase()
        : this.page === 'complete' ? String(this.outcome?.detail || 'ALL OBJECTIVES RESOLVED').toUpperCase()
          : 'SURVEY 9 · THESSALY BASIN · KILN SYSTEM';
    Type.draw(g, sub, L, ty + 26 * u, {
      size: 9.2 * u, tracking: 6.8 * u, weight: 1.3 * u,
      color: PALETTE.dim, alpha: 0.6, halo: 0,
    });
    rule(g, L, ty + 42 * u, 210 * u, PALETTE.amber, 0.42, Math.max(1, 1.4 * u));

    const items = this._items();
    this.hit.length = 0;
    let y = ty + 96 * u;
    for (let i = 0; i < items.length; i++) {
      const on = i === this.sel;
      const rowH = 40 * u;
      this.hit.push({ x: L - 14 * u, y: y - 22 * u, w: 380 * u, h: rowH });
      if (on) {
        // A flat highlight block with a hard right edge is a web list item.
        // Fade it out instead.
        const hl = g.createLinearGradient(L - 14 * u, 0, L + 330 * u, 0);
        hl.addColorStop(0, 'rgba(242,165,68,0.16)');
        hl.addColorStop(1, 'rgba(242,165,68,0)');
        g.fillStyle = hl;
        g.fillRect(L - 14 * u, y - 22 * u, 344 * u, rowH);
        g.globalAlpha = 0.9; g.fillStyle = PALETTE.amber;
        g.fillRect(L - 14 * u, y - 22 * u, 2.4 * u, rowH);
        g.globalAlpha = 1;
      }
      Type.draw(g, items[i].label, L + 8 * u, y, {
        size: 15 * u, tracking: 5.4 * u, weight: 1.9 * u,
        color: on ? PALETTE.ink : PALETTE.ink2, alpha: on ? 1 : 0.58, halo: 0,
      });
      y += 46 * u;
    }
  }

  _paintControls(g, L, u, W, H) {
    const top = H * 0.18;
    Type.draw(g, 'CONTROLS', L, top, {
      size: 22 * u, tracking: 11 * u, weight: 2.4 * u,
      color: '#F3E2C6', alpha: 0.95, halo: 0,
    });
    rule(g, L, top + 16 * u, 180 * u, PALETTE.amber, 0.4, Math.max(1, 1.4 * u));

    const keyboard = [
      ['W A S D', 'MOVE'], ['MOUSE', 'LOOK'], ['LEFT MOUSE', 'FIRE'],
      ['RIGHT MOUSE', 'AIM'], ['SHIFT', 'SPRINT'], ['CTRL', 'CROUCH'],
      ['SPACE', 'JUMP'], ['R', 'RELOAD'], ['V', 'MELEE'],
      ['F', 'INSPECT'], ['ESC', 'PAUSE'],
    ];
    const pad = [
      ['LEFT STICK', 'MOVE'], ['RIGHT STICK', 'LOOK'], ['RT', 'FIRE'],
      ['LT', 'AIM'], ['L3', 'SPRINT'], ['B', 'CROUCH'], ['A', 'JUMP'],
      ['Y', 'RELOAD'], ['X / R3', 'MELEE'], ['BACK', 'INSPECT'],
      ['START', 'PAUSE'],
    ];
    const drawColumn = (title, rows, x, valueX) => {
      let y = top + 55 * u;
      Type.draw(g, title, x, y, {
        size: 8.8 * u, tracking: 5.2 * u, weight: 1.25 * u,
        color: PALETTE.amber, alpha: 0.62, halo: 0,
      });
      y += 27 * u;
      for (const [key, action] of rows) {
        Type.draw(g, key, x, y, {
          size: 10.2 * u, tracking: 2.4 * u, weight: 1.45 * u,
          color: PALETTE.ink, alpha: 0.92, halo: 0,
        });
        Type.draw(g, action, valueX, y, {
          size: 9.4 * u, tracking: 2.2 * u, weight: 1.3 * u, align: 'right',
          color: PALETTE.ink2, alpha: 0.58, halo: 0,
        });
        y += 24 * u;
      }
    };

    const colGap = Math.min(410 * u, Math.max(300 * u, (W - L * 2) * 0.52));
    drawColumn('KEYBOARD / MOUSE', keyboard, L, L + 270 * u);
    if (W >= 780) drawColumn('CONTROLLER', pad, L + colGap, L + colGap + 245 * u);

    const items = this._items();
    this.hit.length = 0;
    const y = Math.min(H - 108 * u, top + 350 * u);
    const on = this.sel === 0;
    const rowH = 38 * u;
    this.hit.push({ x: L - 14 * u, y: y - 22 * u, w: 250 * u, h: rowH });
    if (on) {
      const hl = g.createLinearGradient(L - 14 * u, 0, L + 220 * u, 0);
      hl.addColorStop(0, 'rgba(242,165,68,0.16)');
      hl.addColorStop(1, 'rgba(242,165,68,0)');
      g.fillStyle = hl; g.fillRect(L - 14 * u, y - 22 * u, 234 * u, rowH);
      g.fillStyle = PALETTE.amber; g.fillRect(L - 14 * u, y - 22 * u, 2.4 * u, rowH);
    }
    Type.draw(g, items[0]?.label || 'BACK', L + 8 * u, y, {
      size: 14 * u, tracking: 5.0 * u, weight: 1.8 * u,
      color: PALETTE.ink, alpha: 1, halo: 0,
    });
  }

  _paintSettings(g, L, u, W, H) {
    const top = H * 0.20;
    Type.draw(g, 'SETTINGS', L, top, {
      size: 22 * u, tracking: 11 * u, weight: 2.4 * u,
      color: '#F3E2C6', alpha: 0.95, halo: 0,
    });
    rule(g, L, top + 16 * u, 180 * u, PALETTE.amber, 0.4, Math.max(1, 1.4 * u));

    const colW = Math.min(760 * u, W - L * 2);
    const valX = L + colW - 4 * u;
    this.hit.length = 0;
    let y = top + 52 * u;
    let idx = 0;
    let note = '';

    for (const r of this.rows) {
      if (r.t === 'head') {
        y += 20 * u;
        Type.draw(g, r.label, L, y, {
          size: 8.8 * u, tracking: 5.2 * u, weight: 1.25 * u,
          color: PALETTE.amber, alpha: 0.55, halo: 0,
        });
        rule(g, L + Type.measure(r.label, 8.8 * u, 5.2 * u, 1.25 * u) + 14 * u, y - 3 * u,
          colW - Type.measure(r.label, 8.8 * u, 5.2 * u, 1.25 * u) - 14 * u, PALETTE.dim, 0.16, Math.max(1, 1 * u));
        y += 22 * u;
        continue;
      }
      const on = idx === this.sel;
      const rowH = 32 * u;
      const hitRec = { x: L - 12 * u, y: y - 20 * u, w: colW + 12 * u, h: rowH, sx: 0, sw: 0 };

      if (on) {
        const hl = g.createLinearGradient(hitRec.x, 0, hitRec.x + hitRec.w, 0);
        hl.addColorStop(0, 'rgba(242,165,68,0.14)');
        hl.addColorStop(0.72, 'rgba(242,165,68,0.05)');
        hl.addColorStop(1, 'rgba(242,165,68,0)');
        g.fillStyle = hl;
        g.fillRect(hitRec.x, hitRec.y, hitRec.w, rowH);
        g.globalAlpha = 0.85; g.fillStyle = PALETTE.amber;
        g.fillRect(hitRec.x, hitRec.y, 2.2 * u, rowH);
        g.globalAlpha = 1;
        if (r.note) note = r.note;
      }
      Type.draw(g, r.label, L + 6 * u, y, {
        size: 11 * u, tracking: 3.4 * u, weight: 1.5 * u,
        color: on ? PALETTE.ink : PALETTE.ink2, alpha: on ? 1 : 0.62, halo: 0,
      });

      if (r.t === 'range') {
        const v = r.get(), f = sat((v - r.min) / (r.max - r.min));
        const sw = 180 * u, sx = valX - sw - 128 * u;
        hitRec.sx = sx; hitRec.sw = sw;
        g.globalAlpha = on ? 0.28 : 0.16; g.fillStyle = PALETTE.ink2;
        g.fillRect(sx, y - 6 * u, sw, Math.max(1, 1.6 * u));
        g.globalAlpha = on ? 1 : 0.62; g.fillStyle = on ? PALETTE.amber : PALETTE.ink2;
        g.fillRect(sx, y - 6 * u, sw * f, Math.max(1, 1.6 * u));
        g.fillRect(sx + sw * f - 1.2 * u, y - 11 * u, Math.max(2, 2.6 * u), 11 * u);
        g.globalAlpha = 1;
        Type.draw(g, r.show ? r.show(v) : String(v), valX, y, {
          size: 10 * u, tracking: 2.4 * u, weight: 1.4 * u, align: 'right',
          color: on ? PALETTE.ink : PALETTE.ink2, alpha: on ? 0.95 : 0.55, halo: 0,
        });
      } else if (r.t === 'enum') {
        const v = r.get();
        let x = valX;
        for (let i = r.values.length - 1; i >= 0; i--) {
          const lab = r.show ? r.show(r.values[i]) : String(r.values[i]);
          const w = Type.measure(lab, 9.4 * u, 2.4 * u, 1.35 * u);
          const cur = r.values[i] === v;
          if (cur) {
            g.globalAlpha = 0.16; g.fillStyle = PALETTE.amber;
            g.fillRect(x - w - 7 * u, y - 13 * u, w + 14 * u, 19 * u);
            g.globalAlpha = 1;
          }
          Type.draw(g, lab, x, y, {
            size: 9.4 * u, tracking: 2.4 * u, weight: 1.35 * u, align: 'right',
            color: cur ? PALETTE.amber : PALETTE.dim, alpha: cur ? 1 : 0.42, halo: 0,
          });
          x -= w + 22 * u;
        }
      } else if (r.t === 'bool') {
        const v = r.get();
        Type.draw(g, v ? 'ON' : 'OFF', valX, y, {
          size: 10 * u, tracking: 3.0 * u, weight: 1.4 * u, align: 'right',
          color: v ? PALETTE.amber : PALETTE.dim, alpha: v ? 0.95 : 0.5, halo: 0,
        });
        const bx = valX - 74 * u;
        g.globalAlpha = 0.5; g.strokeStyle = v ? PALETTE.amber : PALETTE.dim;
        g.lineWidth = Math.max(1, 1.2 * u);
        g.strokeRect(bx, y - 11 * u, 28 * u, 12 * u);
        g.globalAlpha = v ? 0.95 : 0.3; g.fillStyle = v ? PALETTE.amber : PALETTE.dim;
        g.fillRect(v ? bx + 15 * u : bx + 2 * u, y - 9 * u, 11 * u, 8 * u);
        g.globalAlpha = 1;
      }

      this.hit.push(hitRec);
      y += 32 * u;
      idx++;
    }

    if (note) {
      Type.draw(g, note.toUpperCase(), L, H - 74 * u * 0.62 - 34 * u, {
        size: 8.6 * u, tracking: 2.2 * u, weight: 1.2 * u,
        color: PALETTE.ink2, alpha: 0.40, halo: 0,
      });
    }
  }

  dispose() {
    if (this._menuRaf) cancelAnimationFrame(this._menuRaf);
    this.root?.remove();
  }
}
