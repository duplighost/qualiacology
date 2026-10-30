/* Spooky Games (/spooky/). No dependencies. Everything here is decoration: the page reads
   and links the same without it. Each effect sleeps while it is off screen, and the whole
   loop stops while the tab is hidden. */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[(Math.random() * list.length) | 0];

  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sizeCanvas(canvas, maxDpr) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const W = Math.max(1, Math.round(w * dpr));
    const H = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  /* A soft round sprite, drawn once, stamped many times (cheaper than shadowBlur). */
  function sprite(r, g, b) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, 64, 64);
    return c;
  }

  // Hold the title until Archivo Black is in, so it never shows in a stand-in face.
  const titleFont = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load('280px "Archivo Black"'), new Promise((r) => setTimeout(r, 2200))])
    : Promise.resolve();
  titleFont.then(() => root.classList.add("fonts-ready"), () => root.classList.add("fonts-ready"));

  /* ---------------- pointer ---------------- */

  const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0, fine: finePointer };
  let lastMove = 0;
  addEventListener("pointermove", (e) => {
    const now = performance.now();
    const dt = Math.max(8, now - lastMove) / 1000;
    if (pointer.x > -1e3 && now - lastMove < 120) {
      pointer.vx = lerp(pointer.vx, (e.clientX - pointer.x) / dt, 0.4);
      pointer.vy = lerp(pointer.vy, (e.clientY - pointer.y) / dt, 0.4);
    }
    lastMove = now;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.t = now;
    if (e.pointerType === "mouse") pointer.fine = true;
  }, { passive: true });
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget) pointer.x = pointer.y = -1e4;
  });

  /* ---------------- the loop ---------------- */

  const systems = [];
  let raf = 0;
  let last = 0;
  let scrollPrev = window.scrollY;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const t = now / 1000;
    const sy = window.scrollY;
    const dScroll = sy - scrollPrev;
    scrollPrev = sy;
    const decay = Math.exp(-dt * 7);
    pointer.vx *= decay;
    pointer.vy *= decay;
    for (const s of systems) if (s.live) s.tick(t, dt, dScroll);
  }
  function start() {
    if (raf || reduce) return;
    last = performance.now();
    scrollPrev = window.scrollY;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  const watcher = new IntersectionObserver((entries) => {
    for (const e of entries) for (const s of e.target.__systems || []) {
      const was = s.live;
      s.live = e.isIntersecting || s.always === true;
      if (s.live && !was && s.wake) s.wake();
      if (!s.live && was && s.sleep) s.sleep();
    }
  }, { rootMargin: "160px 0px" });

  function system(el, s) {
    s.live = false;
    systems.push(s);
    if (el) {
      (el.__systems || (el.__systems = [])).push(s);
      watcher.observe(el);
    } else {
      s.live = true;
    }
    return s;
  }

  /* ---------------- scenes light up as you reach them ---------------- */

  const scenes = [...document.querySelectorAll(".scene")];
  const lighter = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      e.target.classList.add("is-lit");
      lighter.unobserve(e.target);
    }
  }, { threshold: 0.28 });
  scenes.forEach((s) => lighter.observe(s));

  if (reduce) scenes.forEach((s) => s.classList.add("is-lit"));

  /* where on the page are we: decides the weather */
  const zones = [...document.querySelectorAll("[data-zone]")];
  let zone = "hero";
  function readZone() {
    const mid = window.innerHeight * 0.5;
    zone = "none";
    for (const z of zones) {
      const r = z.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) {
        zone = z.dataset.zone;
        break;
      }
    }
  }
  addEventListener("scroll", readZone, { passive: true });
  addEventListener("resize", readZone);
  readZone();

  /* ================= HERO ================= */

  const hero = document.querySelector(".hero");
  const skyBack = hero.querySelector(".sky-back");
  const skyFront = hero.querySelector(".sky-front");
  const landCanvas = hero.querySelector(".land");
  const moon = { x: 0, y: 0, r: 0, img: null };
  const belfry = { x: 0, y: 0 };
  let heroW = 0;
  let heroH = 0;
  let stars = [];
  let clouds = [];
  let bats = [];
  let shooting = null;
  let nextShooting = 3;
  let backView = null;
  let frontView = null;

  function renderMoon(r) {
    const pad = r * 3.2;
    const size = Math.ceil((r + pad) * 2);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(size * dpr);
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;

    let grad = g.createRadialGradient(cx, cy, r * 0.92, cx, cy, r + pad);
    grad.addColorStop(0, "rgba(230,236,255,0.42)");
    grad.addColorStop(0.1, "rgba(200,212,255,0.17)");
    grad.addColorStop(0.42, "rgba(150,170,255,0.05)");
    grad.addColorStop(1, "rgba(150,170,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);

    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.clip();
    grad = g.createRadialGradient(cx - r * 0.28, cy - r * 0.3, r * 0.08, cx, cy, r * 1.05);
    grad.addColorStop(0, "#fffef6");
    grad.addColorStop(0.55, "#f2ecd9");
    grad.addColorStop(1, "#cbc2a8");
    g.fillStyle = grad;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    const rnd = seeded(11);
    for (let i = 0; i < 9; i++) {
      const a = rnd() * TAU;
      const d = rnd() * r * 0.62;
      const mr = r * (0.16 + rnd() * 0.3);
      const mx = cx + Math.cos(a) * d;
      const my = cy + Math.sin(a) * d;
      const mg = g.createRadialGradient(mx, my, 0, mx, my, mr);
      mg.addColorStop(0, "rgba(128,126,118,0.3)");
      mg.addColorStop(1, "rgba(128,126,118,0)");
      g.fillStyle = mg;
      g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    }
    for (let i = 0; i < 12; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * r * 0.86;
      const cr = r * (0.02 + rnd() * 0.05);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const cg = g.createRadialGradient(x + cr * 0.2, y + cr * 0.2, 0, x, y, cr);
      cg.addColorStop(0, "rgba(105,100,92,0.22)");
      cg.addColorStop(1, "rgba(105,100,92,0)");
      g.fillStyle = cg;
      g.beginPath();
      g.arc(x, y, cr, 0, TAU);
      g.fill();
    }
    grad = g.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
    grad.addColorStop(0, "rgba(60,55,72,0)");
    grad.addColorStop(1, "rgba(60,55,72,0.38)");
    g.fillStyle = grad;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
    return { canvas: c, size };
  }

  function makeCloud(w, h, seed) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w);
    c.height = Math.ceil(h);
    const g = c.getContext("2d");
    const rnd = seeded(seed);
    for (let i = 0; i < 18; i++) {
      const x = w * (0.1 + rnd() * 0.8);
      const y = h * (0.38 + rnd() * 0.3);
      const rx = w * (0.07 + rnd() * 0.15);
      const ry = rx * (0.42 + rnd() * 0.22);
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, "rgba(26,30,56,0.62)");
      gr.addColorStop(0.6, "rgba(26,30,56,0.24)");
      gr.addColorStop(1, "rgba(26,30,56,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, rx, 0, TAU);
      g.fill();
      g.restore();
    }
    g.globalCompositeOperation = "source-atop";
    const lit = g.createLinearGradient(0, h * 0.2, 0, h * 0.62);
    lit.addColorStop(0, "rgba(170,182,230,0.55)");
    lit.addColorStop(1, "rgba(170,182,230,0)");
    g.fillStyle = lit;
    g.fillRect(0, 0, w, h);
    return c;
  }

  function layoutHero() {
    heroW = hero.clientWidth;
    heroH = hero.clientHeight;
    const narrow = heroW < 760;
    moon.r = narrow ? Math.min(heroW * 0.14, 64) : Math.min(heroW * 0.082, heroH * 0.135, 150);
    moon.x = narrow ? heroW * 0.8 : heroW * 0.79;
    moon.y = narrow ? heroH * 0.075 + moon.r : heroH * 0.235;
    moon.img = renderMoon(moon.r);

    const rnd = seeded(7);
    const count = Math.round(clamp((heroW * heroH) / 2600, 120, 460));
    stars = Array.from({ length: count }, () => ({
      x: rnd(),
      y: Math.pow(rnd(), 1.5) * 0.8,
      r: rnd() < 0.08 ? 1.2 + rnd() * 0.6 : 0.4 + rnd() * 0.7,
      a: 0.35 + rnd() * 0.65,
      tw: 0.5 + rnd() * 2.2,
      ph: rnd() * TAU,
    }));

    clouds = [0, 1, 2, 3].map((i) => {
      const w = (narrow ? 260 : 520) * (0.7 + i * 0.18);
      const h = w * 0.36;
      return {
        img: makeCloud(w, h, 40 + i),
        w,
        h,
        x: rnd() * heroW - w * 0.5,
        y: i < 2 ? moon.y - h * (0.7 - i * 0.35) : heroH * (0.02 + i * 0.03),
        v: 5 + i * 2.5,
        a: i < 2 ? 0.9 : 0.28,
      };
    });

    drawLand();
    backView = sizeCanvas(skyBack, 1.5);
    frontView = sizeCanvas(skyFront, 2);
  }

  /* ---- the land: drawn once per size ---- */

  function drawLand() {
    const { ctx: g, w, h } = sizeCanvas(landCanvas, 2);
    g.clearRect(0, 0, w, h);
    const narrow = w < 760;
    const rnd = seeded(31);

    // far hills, with a pine line on the farthest
    const hill = (base, amp, waves, color, pines) => {
      const ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU];
      const y = (x) => {
        const u = x / w;
        return base - amp * (Math.sin(u * waves + ph[0]) * 0.6 + Math.sin(u * waves * 2.3 + ph[1]) * 0.3 + Math.sin(u * waves * 5.1 + ph[2]) * 0.1);
      };
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, y(x));
      g.lineTo(w, h);
      g.closePath();
      g.fill();
      if (pines) {
        for (let x = 0; x < w; x += 3 + rnd() * 9) {
          if (rnd() < 0.35) continue;
          const ph2 = (5 + rnd() * 14) * pines;
          const pw = ph2 * (0.28 + rnd() * 0.1);
          const by = y(x) + 2;
          g.beginPath();
          g.moveTo(x - pw, by);
          g.lineTo(x, by - ph2);
          g.lineTo(x + pw, by);
          g.fill();
        }
      }
      return y;
    };
    hill(h * 0.79, h * 0.035, 3.2, "#100e25", narrow ? 0.7 : 1);
    // a few far windows still lit
    for (let i = 0; i < 7; i++) {
      const x = w * (0.08 + rnd() * 0.84);
      const yy = h * (0.775 + rnd() * 0.03);
      const gr = g.createRadialGradient(x, yy, 0, x, yy, 7);
      gr.addColorStop(0, "rgba(255,200,120,0.85)");
      gr.addColorStop(1, "rgba(255,160,60,0)");
      g.fillStyle = gr;
      g.fillRect(x - 7, yy - 7, 14, 14);
    }
    hill(h * 0.855, h * 0.03, 4.4, "#0a0918", 0);

    // the church with the belfry, on the right
    {
      const s = narrow ? h * 0.3 : Math.min(h * 0.44, w * 0.28);
      const tx = w * (narrow ? 0.9 : 0.885);
      const base = h * 0.9;
      const tw = s * 0.21;
      g.fillStyle = "#07060e";
      const naveW = s * 0.5;
      const naveH = s * 0.3;
      const nx = tx - tw * 0.5 - naveW;
      g.fillRect(nx, base - naveH, naveW + 2, naveH);
      g.beginPath();
      g.moveTo(nx - s * 0.02, base - naveH);
      g.lineTo(nx + naveW * 0.5, base - naveH - s * 0.17);
      g.lineTo(nx + naveW + 2, base - naveH);
      g.fill();
      g.fillRect(tx - tw / 2, base - s * 0.8, tw, s * 0.8);
      g.fillRect(tx - tw * 0.62, base - s * 0.81, tw * 1.24, s * 0.04);
      g.beginPath();
      g.moveTo(tx - tw * 0.56, base - s * 0.8);
      g.lineTo(tx, base - s * 1.22);
      g.lineTo(tx + tw * 0.56, base - s * 0.8);
      g.fill();
      g.fillRect(tx - 1.2, base - s * 1.3, 2.4, s * 0.1);
      g.fillRect(tx - s * 0.026, base - s * 1.27, s * 0.052, 2.4);
      // the belfry opening, faintly lit, with its bell
      const bw = tw * 0.5;
      const bh = s * 0.14;
      const bx = tx - bw / 2;
      const by = base - s * 0.7;
      const glow = g.createRadialGradient(tx, by + bh * 0.55, 0, tx, by + bh * 0.55, bh * 1.6);
      glow.addColorStop(0, "rgba(255,170,80,0.32)");
      glow.addColorStop(1, "rgba(255,140,60,0)");
      g.fillStyle = glow;
      g.fillRect(tx - bh * 1.6, by - bh, bh * 3.2, bh * 3.2);
      g.fillStyle = "#3a2318";
      g.beginPath();
      g.moveTo(bx, by + bh);
      g.lineTo(bx, by + bw * 0.5);
      g.arc(tx, by + bw * 0.5, bw / 2, Math.PI, 0);
      g.lineTo(bx + bw, by + bh);
      g.fill();
      g.fillStyle = "#07060e";
      g.beginPath();
      g.moveTo(tx - bw * 0.3, by + bh * 0.9);
      g.quadraticCurveTo(tx - bw * 0.26, by + bh * 0.35, tx, by + bh * 0.32);
      g.quadraticCurveTo(tx + bw * 0.26, by + bh * 0.35, tx + bw * 0.3, by + bh * 0.9);
      g.fill();
      belfry.x = tx;
      belfry.y = by + bh * 0.5;
      // lit nave windows
      for (let i = 0; i < 3; i++) {
        const wx = nx + naveW * (0.22 + i * 0.28);
        const wy = base - naveH * 0.7;
        const ww = s * 0.028;
        const wh = s * 0.075;
        g.fillStyle = "rgba(255,160,80,0.42)";
        g.beginPath();
        g.moveTo(wx - ww / 2, wy + wh);
        g.lineTo(wx - ww / 2, wy + ww / 2);
        g.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0);
        g.lineTo(wx + ww / 2, wy + wh);
        g.fill();
      }
    }

    // the dead tree on the left
    {
      const trnd = seeded(5);
      const x0 = w * (narrow ? 0.03 : 0.06);
      const y0 = h * 0.93;
      const len = narrow ? h * 0.12 : Math.min(h * 0.2, w * 0.13);
      g.strokeStyle = "#05040b";
      g.lineCap = "round";
      const branch = (x, y, a, l, width, depth) => {
        const x2 = x + Math.cos(a) * l;
        const y2 = y + Math.sin(a) * l;
        const mx = (x + x2) / 2 + (trnd() - 0.5) * l * 0.3;
        const my = (y + y2) / 2 + (trnd() - 0.5) * l * 0.3;
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(mx, my, x2, y2);
        g.stroke();
        if (depth > 7 || l < 5) return;
        const n = depth < 2 ? 2 : trnd() < 0.7 ? 2 : 3;
        for (let i = 0; i < n; i++) {
          const spread = (trnd() - 0.5) * 0.9 + (i - (n - 1) / 2) * 0.62;
          branch(x2, y2, a + spread + 0.1, l * (0.68 + trnd() * 0.14), width * 0.66, depth + 1);
        }
      };
      branch(x0, y0, -Math.PI / 2 + 0.16, len, Math.max(8, len * 0.13), 0);
    }

    // iron railings between the graves and the church
    if (!narrow) {
      g.fillStyle = "#06050c";
      const fx0 = w * 0.72;
      const fx1 = w * 0.83;
      const fy = h * 0.905;
      const fh = h * 0.06;
      g.fillRect(fx0, fy - fh * 0.82, fx1 - fx0, 2);
      g.fillRect(fx0, fy - fh * 0.25, fx1 - fx0, 2);
      for (let x = fx0; x <= fx1; x += 9) {
        g.fillRect(x, fy - fh, 1.8, fh);
        g.beginPath();
        g.moveTo(x - 2.4, fy - fh);
        g.lineTo(x + 0.9, fy - fh - 6);
        g.lineTo(x + 4.2, fy - fh);
        g.fill();
      }
    }

    // near ground and its grass
    const groundY = (x) => {
      const u = x / w;
      return h * 0.905 - Math.sin(u * 3.3 + 1) * h * 0.016 - Math.sin(u * 9 + 2) * h * 0.005;
    };
    g.fillStyle = "#040308";
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w + 6; x += 6) g.lineTo(x, groundY(x));
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    g.strokeStyle = "#040308";
    g.lineWidth = 1.3;
    for (let x = 0; x < w; x += 2.5) {
      const y = groundY(x);
      const gl = 3 + rnd() * 11;
      g.beginPath();
      g.moveTo(x, y + 2);
      g.quadraticCurveTo(x + (rnd() - 0.5) * 6, y - gl * 0.6, x + (rnd() - 0.5) * 8, y - gl);
      g.stroke();
    }
  }

  /* ---- fog: a tileable texture, drifted by CSS ---- */

  function fogTexture(seed) {
    const W = 1024;
    const H = 256;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const rnd = seeded(seed);
    for (let i = 0; i < 74; i++) {
      const x = rnd() * W;
      const y = H * (0.34 + rnd() * 0.56);
      const r = 40 + rnd() * 130;
      const a = 0.05 + rnd() * 0.09;
      for (const ox of [-W, 0, W]) {
        const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, r);
        gr.addColorStop(0, `rgba(196,206,236,${a})`);
        gr.addColorStop(1, "rgba(196,206,236,0)");
        g.fillStyle = gr;
        g.fillRect(x + ox - r, y - r, r * 2, r * 2);
      }
    }
    g.globalCompositeOperation = "destination-in";
    const v = g.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.45, "rgba(0,0,0,1)");
    v.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    return `url(${c.toDataURL("image/png")})`;
  }
  hero.style.setProperty("--fog-a", fogTexture(3));
  hero.style.setProperty("--fog-b", fogTexture(8));

  /* ---- bats: out of the belfry, round the moon, away from your hand ---- */

  function makeBats() {
    const narrow = heroW < 760;
    const n = narrow ? 12 : 24;
    const now = performance.now() / 1000;
    bats = Array.from({ length: n }, (_, i) => ({
      x: belfry.x,
      y: belfry.y,
      vx: rand(-60, 60),
      vy: rand(-140, -60),
      s: rand(9, 16) * (narrow ? 0.75 : 1) * (i % 6 === 0 ? 1.6 : 1),
      ph: rand(0, TAU),
      fs: rand(3.6, 5.6),
      orbit: rand(moon.r * 1.3, moon.r * 3),
      ecc: rand(0.42, 0.75),
      w: rand(0.18, 0.5) * (Math.random() < 0.5 ? -1 : 1),
      a0: rand(0, TAU),
      wob: rand(0.4, 1.4),
      seed: rand(0, 100),
      release: now + 0.6 + i * rand(0.12, 0.3),
      scare: 0,
    }));
  }

  function drawBat(g, b) {
    const s = b.s;
    const f = Math.sin(b.ph);
    const tip = -f * s * 0.6;
    g.save();
    g.translate(b.x, b.y);
    g.rotate(clamp(b.vx / 700, -0.5, 0.5));
    g.beginPath();
    for (const k of [-1, 1]) {
      g.moveTo(0, -s * 0.1);
      g.quadraticCurveTo(k * s * 0.5, tip - s * 0.38, k * s * 1.05, tip);
      g.quadraticCurveTo(k * s * 0.88, tip * 0.6 + s * 0.12, k * s * 0.74, tip * 0.45 + s * 0.22);
      g.quadraticCurveTo(k * s * 0.6, tip * 0.4 + s * 0.08, k * s * 0.46, tip * 0.3 + s * 0.3);
      g.quadraticCurveTo(k * s * 0.3, tip * 0.15 + s * 0.16, 0, s * 0.22);
      g.closePath();
    }
    g.ellipse(0, s * 0.06, s * 0.13, s * 0.24, 0, 0, TAU);
    g.moveTo(-s * 0.11, -s * 0.12);
    g.lineTo(-s * 0.08, -s * 0.36);
    g.lineTo(-s * 0.01, -s * 0.17);
    g.lineTo(s * 0.01, -s * 0.17);
    g.lineTo(s * 0.08, -s * 0.36);
    g.lineTo(s * 0.11, -s * 0.12);
    g.fill();
    g.stroke();
    g.restore();
  }

  hero.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a")) return;
    const r = hero.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    for (const b of bats) {
      const dx = b.x - px;
      const dy = b.y - py;
      const d = Math.hypot(dx, dy) + 1;
      const f = 1400 * clamp(1 - d / 700, 0.15, 1);
      b.vx += (dx / d) * f;
      b.vy += (dy / d) * f;
      b.scare = 1;
    }
  });

  const heroFrame = {
    wake() {
      backView = sizeCanvas(skyBack, 1.5);
      frontView = sizeCanvas(skyFront, 2);
    },
    tick(t, dt) {
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0) return;
      // ---- back: stars, a shooting star now and then, the moon, clouds
      const g = backView.ctx;
      const w = backView.w;
      const h = backView.h;
      g.clearRect(0, 0, w, h);
      g.fillStyle = "#eef1ff";
      for (const s of stars) {
        const x = s.x * w;
        const y = s.y * h;
        const dm = Math.hypot(x - moon.x, y - moon.y);
        if (dm < moon.r * 1.2) continue;
        g.globalAlpha = s.a * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph)) * clamp(dm / (moon.r * 3.2), 0.2, 1);
        if (s.r > 1) {
          g.beginPath();
          g.arc(x, y, s.r, 0, TAU);
          g.fill();
        } else {
          g.fillRect(x, y, s.r * 1.6, s.r * 1.6);
        }
      }
      g.globalAlpha = 1;

      nextShooting -= dt;
      if (!shooting && nextShooting <= 0) {
        shooting = { x: rand(w * 0.15, w * 0.7), y: rand(h * 0.04, h * 0.26), vx: rand(-900, -600), vy: rand(220, 360), life: 0, max: rand(0.6, 0.95) };
        nextShooting = rand(7, 15);
      }
      if (shooting) {
        shooting.life += dt;
        shooting.x += shooting.vx * dt;
        shooting.y += shooting.vy * dt;
        const k = shooting.life / shooting.max;
        const a = Math.sin(Math.min(1, k) * Math.PI);
        const tx = shooting.x - shooting.vx * 0.12;
        const ty = shooting.y - shooting.vy * 0.12;
        const grad = g.createLinearGradient(shooting.x, shooting.y, tx, ty);
        grad.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.strokeStyle = grad;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(shooting.x, shooting.y);
        g.lineTo(tx, ty);
        g.stroke();
        if (k >= 1) shooting = null;
      }

      const m = moon.img;
      g.drawImage(m.canvas, moon.x - m.size / 2, moon.y - m.size / 2, m.size, m.size);
      for (const c of clouds) {
        c.x += c.v * dt;
        if (c.x > w + 40) c.x = -c.w - 40;
        g.globalAlpha = c.a;
        g.drawImage(c.img, c.x, c.y, c.w, c.h);
      }
      g.globalAlpha = 1;

      // ---- front: the bats
      const f = frontView.ctx;
      f.clearRect(0, 0, frontView.w, frontView.h);
      f.fillStyle = "#040309";
      f.strokeStyle = "rgba(150,160,215,0.16)";
      f.lineWidth = 0.7;
      const px = pointer.x - r.left;
      const py = pointer.y - r.top;
      for (const b of bats) {
        if (t < b.release) continue;
        const ang = b.a0 + t * b.w;
        const tx = moon.x + Math.cos(ang) * b.orbit + Math.sin(t * b.wob + b.seed) * 34;
        const ty = moon.y + Math.sin(ang) * b.orbit * b.ecc + Math.cos(t * b.wob * 1.3 + b.seed) * 24;
        let ax = (tx - b.x) * 1.5 - b.vx * 0.85;
        let ay = (ty - b.y) * 1.5 - b.vy * 0.85;
        const dx = b.x - px;
        const dy = b.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < 180 * 180) {
          const d = Math.sqrt(d2) + 0.01;
          const push = (1 - d / 180) * 3200;
          ax += (dx / d) * push;
          ay += (dy / d) * push;
          b.scare = 1;
        }
        b.scare = Math.max(0, b.scare - dt * 0.7);
        b.vx += ax * dt;
        b.vy += ay * dt;
        const sp = Math.hypot(b.vx, b.vy);
        const max = 240 + b.scare * 420;
        if (sp > max) {
          b.vx *= max / sp;
          b.vy *= max / sp;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.ph += dt * TAU * b.fs * (1 + b.scare * 0.9);
        drawBat(f, b);
      }

      // ---- the title's wax keeps running
      tickDrips(t, dt);
    },
  };

  /* ---- the title drips ---- */

  const drips = [];
  function setupDrips() {
    const face = document.querySelector(".title-face");
    const group = face && face.querySelector(".drips");
    if (!group) return;
    const texts = face.querySelectorAll("g[filter] text");
    const spots = { S: [0.5], P: [0.2], O: [0.5], K: [0.15, 0.86], Y: [0.5], G: [0.62], A: [0.12, 0.88], M: [0.1, 0.9], E: [0.3, 0.72] };
    const rnd = seeded(13);
    const ns = "http://www.w3.org/2000/svg";
    texts.forEach((text) => {
      const str = text.textContent;
      const baseline = Number(text.getAttribute("y"));
      for (let i = 0; i < str.length; i++) {
        let box;
        try {
          box = text.getExtentOfChar(i);
        } catch {
          continue;
        }
        for (const f of spots[str[i]] || []) {
          if (rnd() > 0.5) continue;
          const body = document.createElementNS(ns, "path");
          const shine = document.createElementNS(ns, "path");
          const drop = document.createElementNS(ns, "ellipse");
          shine.setAttribute("fill", "none");
          shine.setAttribute("stroke", "rgba(255,236,190,0.5)");
          shine.setAttribute("stroke-linecap", "round");
          group.append(body, shine, drop);
          const wdt = 8 + rnd() * 9;
          drips.push({
            x: box.x + box.width * f,
            y: baseline - 7,
            w: wdt,
            len: 14,
            max: rnd() < 0.35 ? 18 + rnd() * 14 : 36 + rnd() * 58,
            shine,
            speed: 3 + rnd() * 7,
            state: "grow",
            hold: 0,
            body,
            drop,
            dropY: 0,
            dropV: 0,
            dropA: 0,
            delay: rnd() * 3,
          });
        }
      }
    });
  }

  function dripPath(d) {
    const { x, y, w } = d;
    const r = w / 2;
    const bulb = r * 1.2;
    const len = Math.max(d.len, bulb * 1.6);
    const end = y + len;
    const f = (n) => n.toFixed(1);
    return `M${f(x - r * 1.9)} ${f(y)}Q${f(x - r)} ${f(y + 2)} ${f(x - r * 0.88)} ${f(y + len * 0.25)}` +
      `Q${f(x - r * 0.62)} ${f(y + len * 0.6)} ${f(x - r * 0.8)} ${f(end - bulb)}` +
      `C${f(x - bulb * 1.2)} ${f(end - bulb * 0.15)} ${f(x - bulb * 0.92)} ${f(end + bulb)} ${f(x)} ${f(end + bulb)}` +
      `C${f(x + bulb * 0.92)} ${f(end + bulb)} ${f(x + bulb * 1.2)} ${f(end - bulb * 0.15)} ${f(x + r * 0.8)} ${f(end - bulb)}` +
      `Q${f(x + r * 0.62)} ${f(y + len * 0.6)} ${f(x + r * 0.88)} ${f(y + len * 0.25)}` +
      `Q${f(x + r)} ${f(y + 2)} ${f(x + r * 1.9)} ${f(y)}Z`;
  }
  function shinePath(d) {
    const r = d.w / 2;
    const len = Math.max(d.len, r * 2);
    return `M${(d.x - r * 0.42).toFixed(1)} ${(d.y + len * 0.18).toFixed(1)}L${(d.x - r * 0.5).toFixed(1)} ${(d.y + len - r * 0.2).toFixed(1)}`;
  }

  function tickDrips(t, dt) {
    for (const d of drips) {
      if (d.delay > 0) {
        d.delay -= dt;
        continue;
      }
      if (d.state === "grow") {
        d.len += (d.max - d.len) * Math.min(1, dt * d.speed * 0.08) + dt * 1.5;
        if (d.len >= d.max - 1) {
          d.state = "hold";
          d.hold = rand(0.6, 2.2);
        }
      } else if (d.state === "hold") {
        d.hold -= dt;
        if (d.hold <= 0) {
          d.state = "grow";
          d.dropY = d.y + d.len + d.w * 0.6;
          d.dropV = 20;
          d.dropA = 1;
          d.len *= 0.62;
          d.max = d.len + 18 + Math.random() * 50;
          if (d.max > 120) d.max = 30 + Math.random() * 30;
        }
      }
      d.body.setAttribute("d", dripPath(d));
      d.shine.setAttribute("d", shinePath(d));
      d.shine.setAttribute("stroke-width", (d.w * 0.16).toFixed(1));
      if (d.dropA > 0) {
        d.dropV += 900 * dt;
        d.dropY += d.dropV * dt;
        d.dropA -= dt * 0.9;
        d.drop.setAttribute("cx", d.x.toFixed(1));
        d.drop.setAttribute("cy", d.dropY.toFixed(1));
        d.drop.setAttribute("rx", (d.w * 0.42).toFixed(1));
        d.drop.setAttribute("ry", (d.w * 0.42 + Math.min(10, d.dropV * 0.012)).toFixed(1));
        d.drop.setAttribute("opacity", Math.max(0, d.dropA).toFixed(2));
      } else {
        d.drop.setAttribute("opacity", "0");
      }
    }
  }

  if (reduce) {
    // The still version: the moon, the stars, the land and the fog, the bats where they are. Nothing moves.
    const still = () => {
      layoutHero();
      makeBats();
      for (const b of bats) {
        b.x = moon.x + Math.cos(b.a0) * b.orbit;
        b.y = moon.y + Math.sin(b.a0) * b.orbit * b.ecc;
        b.release = 0;
        b.vx = b.vy = 0;
      }
      heroFrame.tick(0, 0);
    };
    still();
    addEventListener("resize", () => {
      clearTimeout(still.timer);
      still.timer = setTimeout(still, 150);
    });
    return;
  }
  system(hero, heroFrame);

  /* ================= WEATHER (one canvas over the whole page) ================= */

  const weather = document.querySelector(".weather");
  let wv = sizeCanvas(weather, 1.5);
  const parts = [];
  const projectiles = [];
  const glowWarm = sprite(255, 168, 72);
  const glowCyan = sprite(120, 240, 236);
  const glowGold = sprite(255, 214, 120);
  const glowBlue = sprite(170, 214, 255);
  const glowWhite = sprite(235, 240, 255);
  const leafColors = ["#c7381b", "#e2662a", "#a8301c", "#d98f2e", "#8e2a18", "#f0a040"];
  const spawnAcc = {};

  const LEAF = [[0, -1], [0.18, -0.55], [0.62, -0.74], [0.42, -0.28], [0.96, -0.1], [0.5, 0.1], [0.56, 0.46], [0.12, 0.3], [0, 0.62], [-0.12, 0.3], [-0.56, 0.46], [-0.5, 0.1], [-0.96, -0.1], [-0.42, -0.28], [-0.62, -0.74], [-0.18, -0.55]];

  const modes = {
    hero: { rate: 7, max: 46, make: (w, h) => ({ k: "ember", x: rand(w * 0.05, w * 0.95), y: h * rand(0.86, 0.98), vx: rand(-14, 14), vy: rand(-55, -22), r: rand(0.8, 2), life: 0, max: rand(2.2, 4.6), z: rand(0.5, 1) }) },
    leaves: { rate: 6, max: 56, make: (w, h) => {
      const fromSide = Math.random() < 0.35;
      return { k: "leaf", x: fromSide ? w + 20 : rand(-w * 0.1, w * 1.05), y: fromSide ? rand(-20, h * 0.5) : -20, vx: rand(-70, -18), vy: rand(36, 78), r: rand(6, 13), rot: rand(0, TAU), vr: rand(-2.4, 2.4), flip: rand(0, TAU), vf: rand(2, 5), sway: rand(0, TAU), color: pick(leafColors), z: rand(0.55, 1) };
    } },
    rain: { rate: 150, max: 280, make: (w, h) => {
      const z = rand(0.35, 1);
      return { k: "rain", x: rand(-w * 0.1, w * 1.15), y: rand(-60, -10), vx: -170 * z, vy: 1400 * z, len: 0.018 + z * 0.012, a: 0.1 + z * 0.24, z };
    } },
    motes: { rate: 14, max: 90, make: (w, h) => ({ k: "mote", x: rand(0, w), y: h + 10, vx: 0, vy: rand(-34, -12), r: rand(1, 2.8), sway: rand(0, TAU), gold: Math.random() < 0.22, life: 0, max: rand(5, 9), z: rand(0.5, 1) }) },
    snow: { rate: 28, max: 180, make: (w, h) => {
      const z = rand(0.35, 1);
      return { k: "snow", x: rand(-w * 0.05, w * 1.05), y: -8, vx: rand(-12, 12), vy: 26 + 60 * z, r: 0.7 + 2.3 * z, sway: rand(0, TAU), a: 0.45 + 0.5 * z, z };
    } },
    glitter: { rate: 20, max: 120, make: (w, h) => ({ k: "glint", x: rand(0, w), y: rand(0, h), vx: rand(-6, 6), vy: rand(4, 16), r: rand(0.6, 1.7), life: 0, max: rand(1.2, 2.8), z: rand(0.4, 1) }) },
  };

  function spawnWisp(x, y) {
    parts.push({ k: "wisp", x, y, vx: rand(-20, 20), vy: rand(-30, 0), r: rand(14, 30), life: 0, max: rand(0.45, 0.8), z: 0 });
  }
  function burst(x, y, n, gold) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(80, 380);
      parts.push({ k: "spark", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(1, 2.4), life: 0, max: rand(0.35, 0.8), gold, z: 0 });
    }
  }

  function drawStar(g, x, y, s, rot, a) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.globalAlpha = a;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 === 0 ? s : s * 0.3;
      const aa = (i / 8) * TAU;
      g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
    }
    g.closePath();
    const grad = g.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, "#fff3c4");
    grad.addColorStop(0.5, "#d9a63a");
    grad.addColorStop(1, "#7a5114");
    g.fillStyle = grad;
    g.fill();
    g.beginPath();
    g.arc(0, 0, s * 0.16, 0, TAU);
    g.fillStyle = "#2a1a08";
    g.fill();
    g.restore();
    g.globalAlpha = 1;
  }

  system(null, {
    always: true,
    tick(t, dt, dScroll) {
      const g = wv.ctx;
      const w = wv.w;
      const h = wv.h;
      g.clearRect(0, 0, w, h);

      const mode = modes[zone];
      if (mode) {
        spawnAcc[zone] = (spawnAcc[zone] || 0) + mode.rate * dt;
        while (spawnAcc[zone] >= 1) {
          spawnAcc[zone] -= 1;
          if (parts.length < mode.max + 60) {
            const p = mode.make(w, h);
            p.zone = zone;
            p.fade = 1;
            parts.push(p);
          }
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.y -= dScroll * (p.z || 0) * 0.85;
        let dead = false;
        switch (p.k) {
          case "leaf":
            p.sway += dt * 1.3;
            p.x += (p.vx + Math.sin(p.sway) * 40) * dt;
            p.y += p.vy * dt;
            p.rot += p.vr * dt;
            p.flip += p.vf * dt;
            dead = p.y > h + 30 || p.x < -40;
            break;
          case "rain":
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            dead = p.y > h + 40;
            break;
          case "snow":
            p.sway += dt * 1.1;
            p.x += (p.vx + Math.sin(p.sway) * 16) * dt;
            p.y += p.vy * dt;
            dead = p.y > h + 10;
            break;
          case "mote":
          case "ember":
          case "glint":
          case "wisp":
          case "spark":
            p.life += dt;
            if (p.k === "mote") {
              p.sway += dt;
              p.x += Math.sin(p.sway) * 14 * dt;
            }
            if (p.k === "ember") p.x += Math.sin(t * 3 + p.y * 0.05) * 12 * dt;
            if (p.k === "spark") {
              p.vx *= Math.exp(-dt * 4);
              p.vy = p.vy * Math.exp(-dt * 4) + 260 * dt;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            dead = p.life >= p.max;
            break;
          default:
            dead = true;
        }
        if (p.zone && p.zone !== zone) {
          p.fade -= dt * 1.4;
          if (p.fade <= 0) dead = true;
        }
        if (dead || p.y < -200 || p.y > h + 200) {
          parts.splice(i, 1);
          continue;
        }
        draw(g, p, p.fade === undefined ? 1 : p.fade);
      }

      for (let i = projectiles.length - 1; i >= 0; i--) {
        const s = projectiles[i];
        s.t += dt;
        if (s.state === "fly") {
          const k = Math.min(1, s.t / s.dur);
          const e = 1 - Math.pow(1 - k, 2);
          s.x = lerp(s.x0, s.x1, e);
          s.y = lerp(s.y0, s.y1, e) - Math.sin(k * Math.PI) * s.arc;
          s.rot += dt * 28;
          if (k >= 1) {
            s.state = "stuck";
            s.t = 0;
            burst(s.x, s.y, 14, true);
          }
        } else {
          s.rot += dt * 0.6;
          if (s.t > 2) s.a -= dt * 2;
        }
        s.y -= dScroll;
        if (s.a <= 0) {
          projectiles.splice(i, 1);
          continue;
        }
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 0.35 * s.a;
        g.drawImage(glowGold, s.x - s.size * 2, s.y - s.size * 2, s.size * 4, s.size * 4);
        g.globalCompositeOperation = "source-over";
        drawStar(g, s.x, s.y, s.size, s.rot, s.a);
      }
      g.globalAlpha = 1;
    },
  });

  function draw(g, p, fade) {
    switch (p.k) {
      case "leaf": {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.scale(Math.cos(p.flip), 1);
        g.globalAlpha = (0.55 + 0.4 * p.z) * fade;
        g.fillStyle = p.color;
        g.beginPath();
        for (const [lx, ly] of LEAF) g.lineTo(lx * p.r, ly * p.r);
        g.closePath();
        g.fill();
        g.strokeStyle = "rgba(60,16,6,0.6)";
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(0, p.r * 0.95);
        g.lineTo(0, -p.r * 0.6);
        g.stroke();
        g.restore();
        g.globalAlpha = 1;
        break;
      }
      case "rain":
        g.strokeStyle = `rgba(190,215,255,${p.a * fade})`;
        g.lineWidth = p.z > 0.8 ? 1.3 : 1;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * p.len, p.y - p.vy * p.len);
        g.stroke();
        break;
      case "snow":
        g.globalAlpha = p.a * fade;
        g.fillStyle = "#f4f7ff";
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, TAU);
        g.fill();
        g.globalAlpha = 1;
        break;
      default: {
        const k = p.life / p.max;
        let a;
        let img;
        let r = p.r;
        if (p.k === "ember") {
          a = Math.sin(Math.min(1, k) * Math.PI) * (0.6 + 0.4 * Math.random());
          img = glowWarm;
          r *= 5;
        } else if (p.k === "mote") {
          a = Math.sin(Math.min(1, k) * Math.PI) * 0.85;
          img = p.gold ? glowGold : glowCyan;
          r *= 5;
        } else if (p.k === "glint") {
          a = Math.pow(Math.sin(Math.min(1, k) * Math.PI), 2);
          img = glowBlue;
          r *= 4.5;
        } else if (p.k === "wisp") {
          a = (1 - k) * 0.72;
          img = glowBlue;
          r *= 1 + k;
        } else {
          a = 1 - k;
          img = p.gold ? glowGold : glowWhite;
          r *= 4;
        }
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = clamp(a * fade, 0, 1);
        g.drawImage(img, p.x - r, p.y - r, r * 2, r * 2);
        g.globalAlpha = 1;
        g.globalCompositeOperation = "source-over";
      }
    }
  }

  /* ================= SCENES ================= */

  /* every picture leans a little toward your hand and drifts against the scroll */
  for (const scene of scenes) {
    const stage = scene.querySelector(".stage");
    const state = { ox: 0, oy: 0 };
    system(scene, {
      tick(t, dt) {
        const r = scene.getBoundingClientRect();
        const vh = window.innerHeight;
        let tx = 0;
        let ty = clamp((r.top + r.height / 2 - vh / 2) * -0.05, -26, 26);
        if (pointer.fine && pointer.y > r.top && pointer.y < r.bottom && window.innerWidth > 760) {
          tx += ((pointer.x / window.innerWidth) - 0.5) * -18;
          ty += (((pointer.y - r.top) / r.height) - 0.5) * -12;
        }
        if (window.innerWidth <= 760) ty = 0;
        const k = 1 - Math.exp(-dt * 4);
        state.ox += (tx - state.ox) * k;
        state.oy += (ty - state.oy) * k;
        stage.style.transform = `translate3d(${state.ox.toFixed(2)}px, ${state.oy.toFixed(2)}px, 0)`;
      },
    });
  }

  /* stage-relative point (percent of the picture) -> viewport point */
  function stagePoint(stage, xPct, yPct) {
    const r = stage.getBoundingClientRect();
    return { x: r.left + (r.width * xPct) / 100, y: r.top + (r.height * yPct) / 100, r };
  }

  /* ---- OLLY OLLY: the tall one hides when you look for it ---- */
  {
    const scene = document.getElementById("olly-olly");
    const stage = scene.querySelector(".stage");
    const patch = scene.querySelector(".haunt");
    let hidden = 0;
    system(scene, {
      tick(t, dt) {
        const p = stagePoint(stage, 86, 33);
        let want;
        if (pointer.fine && pointer.x > -1e3) {
          const d = Math.hypot(pointer.x - p.x, (pointer.y - p.y) * 0.7);
          want = clamp(1 - (d - p.r.width * 0.07) / (p.r.width * 0.16), 0, 1);
        } else {
          want = Math.sin(t * 0.7) > 0.35 ? 1 : 0;
        }
        hidden += (want - hidden) * (1 - Math.exp(-dt * (want > hidden ? 5 : 1.3)));
        patch.style.opacity = hidden.toFixed(3);
      },
    });
  }

  /* ---- FETCH: a skull that comes back ---- */
  {
    const scene = document.getElementById("fetch");
    const stage = scene.querySelector(".stage");
    const pet = document.createElement("div");
    pet.className = "pet";
    pet.setAttribute("aria-hidden", "true");
    pet.innerHTML = `<svg viewBox="0 0 64 64">
      <defs><radialGradient id="pet-bone" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fbf4e4"/><stop offset=".6" stop-color="#d9cdb2"/><stop offset="1" stop-color="#9c8e72"/></radialGradient>
      <radialGradient id="pet-eye"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#bfeaff"/><stop offset="1" stop-color="#3d9bff" stop-opacity="0"/></radialGradient></defs>
      <path d="M32 5C17 5 8 16 8 29c0 8 4 13 8.5 15.5V51c0 3 2 5 5 5h21c3 0 5-2 5-5v-6.5C52 42 56 37 56 29 56 16 47 5 32 5Z" fill="url(#pet-bone)"/>
      <path d="M21 9c-2 4 0 6-3 9m26-11c1 4 4 5 3 8" stroke="#7d6c52" stroke-width="1.2" fill="none" opacity=".7"/>
      <ellipse cx="22" cy="30" rx="7" ry="7.6" fill="#1b130d"/><ellipse cx="42" cy="30" rx="7" ry="7.6" fill="#1b130d"/>
      <circle class="pet-eye" cx="22" cy="30.5" r="5.5" fill="url(#pet-eye)"/><circle class="pet-eye" cx="42" cy="30.5" r="5.5" fill="url(#pet-eye)"/>
      <path d="M32 37.5l-3.2 6.5q3.2 1.6 6.4 0z" fill="#1b130d"/>
      <path d="M20.5 47.5h23V54c0 1.6-1.2 2.6-2.6 2.6H23.1c-1.4 0-2.6-1-2.6-2.6z" fill="#cbbd9f"/>
      <path d="M24.5 47.5v9M28.5 47.5v9M32.5 47.5v9M36.5 47.5v9M40 47.5v9" stroke="#2a1d12" stroke-width="1.3"/>
      <path d="M20.5 51.5h23" stroke="#2a1d12" stroke-width="1" opacity=".6"/>
      <g transform="translate(43 49) rotate(-12)"><rect x="0" y="-1.4" width="16" height="2.8" rx="1.2" fill="#8a5a24"/><circle cx="19" cy="0" r="4" fill="none" stroke="#8a5a24" stroke-width="2.4"/><rect x="2" y="1" width="2.4" height="4" fill="#8a5a24"/><rect x="5.6" y="1" width="2" height="3" fill="#8a5a24"/></g>
    </svg>`;
    document.body.append(pet);
    const s = { x: -200, y: -200, vx: 0, vy: 0, rot: 0, vr: 0, state: "home", t: 0, out: false };
    let inScene = false;

    function home() {
      const p = stagePoint(stage, 40, 33);
      return p;
    }

    scene.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a")) return;
      if (!s.out) {
        const h = home();
        s.x = h.x;
        s.y = h.y;
      }
      // a flick throws it the way your hand is moving; a still click sends it at the one by the gate
      let dx = pointer.vx;
      let dy = pointer.vy;
      let sp = Math.hypot(dx, dy);
      if (e.pointerType !== "mouse") {
        dx = e.clientX - s.x;
        dy = e.clientY - s.y;
        sp = Math.hypot(dx, dy) || 1;
      } else if (sp < 240) {
        const gate = stagePoint(stage, 70, 36);
        dx = gate.x - s.x;
        dy = gate.y - s.y;
        sp = Math.hypot(dx, dy);
        if (sp < 60) {
          dx = rand(-1, 1);
          dy = -1;
          sp = Math.hypot(dx, dy);
        }
      }
      s.vx = (dx / sp) * 2300;
      s.vy = (dy / sp) * 2300;
      s.vr = (dx >= 0 ? 1 : -1) * 26;
      s.state = "thrown";
      s.t = 0;
      s.out = true;
      pet.classList.add("is-out");
    });

    system(scene, {
      sleep() {
        pet.classList.remove("is-out");
        s.out = false;
        s.state = "home";
      },
      tick(t, dt) {
        const r = scene.getBoundingClientRect();
        inScene = pointer.y > r.top && pointer.y < r.bottom && pointer.x > -1e3;
        const following = pointer.fine && inScene;
        if (following && !s.out) {
          const h = home();
          s.x = h.x;
          s.y = h.y;
          s.vx = 0;
          s.vy = -200;
          s.out = true;
          s.state = "follow";
          pet.classList.add("is-out");
        }
        if (!s.out) return;

        const target = following
          ? { x: pointer.x - 52, y: pointer.y - 46 + Math.sin(t * 2.6) * 6 }
          : home();
        if (s.state === "thrown") {
          s.t += dt;
          const drag = Math.exp(-dt * 3.2);
          s.vx *= drag;
          s.vy *= drag;
          spawnWisp(s.x, s.y);
          if (s.t > 0.34) s.state = "return";
        } else {
          const k = s.state === "return" ? 70 : 34;
          const c = s.state === "return" ? 11 : 8.5;
          s.vx += ((target.x - s.x) * k - s.vx * c) * dt;
          s.vy += ((target.y - s.y) * k - s.vy * c) * dt;
          if (s.state === "return") {
            spawnWisp(s.x, s.y);
            if (Math.hypot(target.x - s.x, target.y - s.y) < 26) s.state = following ? "follow" : "home";
          }
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.state === "thrown" || s.state === "return") s.rot += s.vr * dt;
        else {
          s.vr = 0;
          s.rot = ((((s.rot + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
          s.rot += (clamp(s.vx / 900, -0.45, 0.45) - s.rot) * Math.min(1, dt * 6);
        }
        if (!following && s.state === "home" && !inScene) {
          pet.classList.remove("is-out");
          s.out = false;
        }
        pet.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) rotate(${s.rot.toFixed(3)}rad)`;
      },
    });
  }

  /* ---- STARSTRUCK: flashbulbs on the hill; throw a star ---- */
  {
    const scene = document.getElementById("starstruck");
    const stage = scene.querySelector(".stage");
    const flashes = scene.querySelector(".flashes");
    let next = 1;
    system(scene, {
      tick(t, dt) {
        next -= dt;
        if (next > 0) return;
        next = Math.random() < 0.3 ? rand(0.12, 0.25) : rand(0.7, 2.4);
        const f = document.createElement("b");
        f.className = "flash";
        const onBeach = Math.random() < 0.25;
        f.style.left = `${onBeach ? rand(82, 97) : rand(58, 98)}%`;
        f.style.top = `${onBeach ? rand(40, 48) : rand(4, 40)}%`;
        f.style.width = `${rand(1.6, 3)}%`;
        flashes.append(f);
        f.addEventListener("animationend", () => f.remove());
      },
    });
    scene.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a")) return;
      const from = stagePoint(stage, 37, 70);
      const dist = Math.hypot(e.clientX - from.x, e.clientY - from.y);
      projectiles.push({
        state: "fly",
        t: 0,
        dur: clamp(dist / 1700, 0.18, 0.5),
        x0: from.x,
        y0: from.y,
        x1: e.clientX,
        y1: e.clientY,
        x: from.x,
        y: from.y,
        arc: Math.min(90, dist * 0.12),
        rot: 0,
        size: window.innerWidth > 760 ? 23 : 15,
        a: 1,
      });
    });
  }

  /* ---- BELFRY: the picture is dark until something makes a sound ---- */
  {
    const scene = document.getElementById("belfry");
    const stage = scene.querySelector(".stage");
    const canvas = scene.querySelector(".echo");
    const rings = [];
    let view = null;
    let nextClick = 0.4;
    let nextShout = 4;
    let moveAcc = 0;
    let lastX = 0;
    let lastY = 0;
    const SCALE = 0.5;

    function local(x, y) {
      const r = stage.getBoundingClientRect();
      return { x: ((x - r.left) / r.width) * view.w, y: ((y - r.top) / r.height) * view.h };
    }
    function ring(x, y, big) {
      rings.push({ x, y, r: 0, v: (big ? 0.7 : 0.38) * view.w, max: (big ? 0.95 : 0.3) * view.w, band: (big ? 0.07 : 0.035) * view.w, a: 1 });
    }
    function fit() {
      const w = canvas.clientWidth * SCALE;
      const h = canvas.clientHeight * SCALE;
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      view = { ctx: canvas.getContext("2d"), w: canvas.width, h: canvas.height };
      view.ctx.fillStyle = "#000";
      view.ctx.fillRect(0, 0, view.w, view.h);
    }

    scene.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a") || !view) return;
      const p = local(e.clientX, e.clientY);
      ring(p.x, p.y, true);
    });

    system(scene, {
      wake() {
        fit();
        ring(view.w * 0.33, view.h * 0.49, true);
      },
      tick(t, dt) {
        if (!view || Math.round(canvas.clientWidth * SCALE) !== view.w) fit();
        const g = view.ctx;
        // the dark comes back
        g.globalCompositeOperation = "source-over";
        g.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 2.2)})`;
        g.fillRect(0, 0, view.w, view.h);

        nextClick -= dt;
        nextShout -= dt;
        if (nextClick <= 0) {
          nextClick = rand(1.6, 2.6);
          ring(view.w * 0.33, view.h * 0.49, false);
        }
        if (nextShout <= 0) {
          nextShout = rand(7, 10);
          ring(view.w * 0.33, view.h * 0.49, true);
        }
        const r = scene.getBoundingClientRect();
        if (pointer.fine && pointer.y > r.top && pointer.y < r.bottom && pointer.x > -1e3) {
          moveAcc += Math.hypot(pointer.x - lastX, pointer.y - lastY);
          if (moveAcc > 230) {
            moveAcc = 0;
            const p = local(pointer.x, pointer.y);
            ring(p.x, p.y, false);
          }
        }
        lastX = pointer.x;
        lastY = pointer.y;

        g.globalCompositeOperation = "destination-out";
        for (let i = rings.length - 1; i >= 0; i--) {
          const k = rings[i];
          k.r += k.v * dt;
          k.a = 1 - k.r / k.max;
          if (k.a <= 0) {
            rings.splice(i, 1);
            continue;
          }
          const inner = Math.max(0, k.r - k.band);
          const grad = g.createRadialGradient(k.x, k.y, inner, k.x, k.y, k.r + k.band * 0.25);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(0.75, `rgba(0,0,0,${k.a})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = grad;
          g.beginPath();
          g.arc(k.x, k.y, k.r + k.band * 0.25, 0, TAU);
          g.fill();
        }
        g.globalCompositeOperation = "source-over";
      },
    });
  }

  /* ================= go ================= */

  function relayout() {
    layoutHero();
    wv = sizeCanvas(weather, 1.5);
  }
  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(relayout, 120);
  });

  layoutHero();
  makeBats();
  titleFont.then(setupDrips);
  start();
})();
