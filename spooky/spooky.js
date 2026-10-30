/* Spooky Games (/spooky/). No dependencies. Everything here is decoration: the page reads
   and links the same without it. Each effect sleeps while it is off screen, and the whole
   loop stops while the tab is hidden. */
(() => {
  "use strict";

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

  /* ================= THE SONG ================= */

  // The trailer has its own song; the page's steps aside while it plays.
  const music = { duck() {}, unduck() {} };

  /* One More House, quietly. Browsers keep a page silent until it is touched, so it starts
     on the first click or key, fades in low, and the corner button turns it off for good. */
  {
    const button = document.querySelector(".sound");
    const label = button && button.querySelector(".sound-label");
    if (button && label) {
      const VOLUME = 0.28;
      let audio = null;
      let playing = false;
      let fade = 0;
      let wanted = true;
      try {
        wanted = localStorage.getItem("spooky-sound") !== "off";
      } catch {
        wanted = true;
      }

      const show = () => {
        button.setAttribute("aria-pressed", String(playing));
        button.classList.toggle("is-on", playing);
        label.textContent = playing ? "Sound on" : "Sound off";
      };
      const fadeTo = (target, ms, done) => {
        cancelAnimationFrame(fade);
        const from = audio.volume;
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          audio.volume = clamp(from + (target - from) * k, 0, 1);
          if (k < 1) fade = requestAnimationFrame(step);
          else if (done) done();
        };
        fade = requestAnimationFrame(step);
      };
      const play = () => {
        if (!audio) {
          audio = new Audio("/spooky/audio/one-more-house.mp3");
          audio.loop = true;
          audio.volume = 0;
        }
        playing = true;
        show();
        const p = audio.play();
        if (p && p.catch) p.catch(() => {
          playing = false;
          show();
        });
        fadeTo(VOLUME, 2800);
      };
      const pause = () => {
        playing = false;
        show();
        if (audio) fadeTo(0, 600, () => audio.pause());
      };

      button.hidden = false;
      show();
      button.addEventListener("click", () => {
        wanted = !playing;
        try {
          localStorage.setItem("spooky-sound", wanted ? "on" : "off");
        } catch {
          /* private window: the choice lasts this visit */
        }
        if (wanted) play();
        else pause();
      });

      const first = (e) => {
        if (e.type === "keydown" && (e.key === "Tab" || e.key === "Shift" || e.key === "Escape" || e.metaKey || e.ctrlKey || e.altKey)) return;
        removeEventListener("pointerdown", first, true);
        removeEventListener("keydown", first, true);
        if (e.target && e.target.closest && e.target.closest(".sound, .trailer")) return; // they decide for themselves
        if (wanted && !playing) play();
      };
      music.duck = () => {
        if (playing) pause();
      };
      music.unduck = () => {
        if (wanted && !playing) play();
      };
      addEventListener("pointerdown", first, true);
      addEventListener("keydown", first, true);

      document.addEventListener("visibilitychange", () => {
        if (!audio) return;
        if (document.hidden) audio.pause();
        else if (playing) audio.play().catch(() => {});
      });
    }
  }

  /* ================= THE TRAILER ================= */

  {
    const video = document.querySelector(".trailer-video");
    const cover = document.querySelector(".trailer-play");
    if (video && cover) {
      cover.hidden = false;
      video.controls = false; // the big button starts it; the player's own bar comes with it
      cover.addEventListener("click", () => {
        cover.hidden = true;
        video.controls = true;
        const p = video.play();
        if (p && p.catch) p.catch(() => {
          cover.hidden = false;
        });
      });
      video.addEventListener("play", () => {
        cover.hidden = true;
        video.controls = true;
        music.duck();
      });
      video.addEventListener("pause", () => {
        if (!video.ended && !video.seeking) music.unduck();
      });
      video.addEventListener("ended", () => {
        cover.hidden = false;
        music.unduck();
      });
    }
  }

  if (reduce) return; // the still version: Alex's paintings, the words and the links. Nothing moves.

  /* ================= HERO: the painted graveyard, kept alive ================= */

  const hero = document.querySelector(".hero");
  const heroStage = hero.querySelector(".hero-stage");
  const skyFront = hero.querySelector(".sky-front");
  const tallArt = matchMedia("(max-aspect-ratio: 3/4)");

  // Where things are in the two paintings, in percent of the picture (the moon's radius in percent of its width).
  const ART = {
    wide: {
      moon: [82.5, 16.8, 7.3],
      belfry: [93.8, 34.8],
      drips: [[26.8, 33], [32.4, 31], [44, 32], [54.5, 33], [67.3, 32.5], [73.6, 33.5], [33.3, 54.5], [37.2, 53.5], [44.2, 54.5], [46.7, 53.5], [51, 54], [58.8, 56.5]],
      sky: [[2, 1.5, 98, 9], [80, 29, 98, 45], [2, 9, 19, 40]],
      shoot: [5, 1.5, 60, 7],
    },
    tall: {
      moon: [79.3, 10.4, 15.6],
      belfry: [91.9, 51.3],
      drips: [[26.7, 30.7], [43, 31.5], [57, 31.3], [75.9, 30.8], [84.9, 31.3], [23.7, 44], [42.2, 43.3], [59.3, 43.2], [64.7, 45.4]],
      sky: [[2, 1, 62, 16], [2, 44, 80, 54], [86, 20, 98, 45]],
      shoot: [5, 1, 55, 12],
    },
  };

  const moon = { x: 0, y: 0, r: 0 };
  const belfry = { x: 0, y: 0 };
  const heroGlow = sprite(255, 150, 50);
  const starGlow = sprite(225, 232, 255);
  let art = ART.wide;
  let stage = { x: 0, y: 0, w: 1, h: 1 };
  let heroW = 0;
  let bats = [];
  let twinkles = [];
  let wax = [];
  let cloud = null;
  let shooting = null;
  let nextShooting = 4;
  let view = null;

  const at = (px, py) => ({ x: stage.x + (stage.w * px) / 100, y: stage.y + (stage.h * py) / 100 });

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
      gr.addColorStop(0, "rgba(30,34,62,0.7)");
      gr.addColorStop(0.6, "rgba(30,34,62,0.28)");
      gr.addColorStop(1, "rgba(30,34,62,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, rx, 0, TAU);
      g.fill();
      g.restore();
    }
    g.globalCompositeOperation = "source-atop";
    const lit = g.createLinearGradient(0, h * 0.2, 0, h * 0.62);
    lit.addColorStop(0, "rgba(190,200,240,0.6)");
    lit.addColorStop(1, "rgba(190,200,240,0)");
    g.fillStyle = lit;
    g.fillRect(0, 0, w, h);
    return c;
  }

  function layoutHero() {
    art = tallArt.matches ? ART.tall : ART.wide;
    const hr = hero.getBoundingClientRect();
    const sr = heroStage.getBoundingClientRect();
    heroW = hr.width;
    stage = { x: sr.left - hr.left, y: sr.top - hr.top, w: sr.width, h: sr.height };
    const m = at(art.moon[0], art.moon[1]);
    moon.x = m.x;
    moon.y = m.y;
    moon.r = (stage.w * art.moon[2]) / 100;
    const b = at(art.belfry[0], art.belfry[1]);
    belfry.x = b.x;
    belfry.y = b.y;

    const rnd = seeded(21);
    twinkles = [];
    for (const [x0, y0, x1, y1] of art.sky) {
      const n = Math.round(((x1 - x0) * (y1 - y0)) / 34);
      for (let i = 0; i < n; i++) {
        const p = at(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0));
        if (Math.hypot(p.x - moon.x, p.y - moon.y) < moon.r * 1.35) continue;
        twinkles.push({ x: p.x, y: p.y, s: 1 + rnd() * 2.2, tw: 0.35 + rnd() * 1.4, ph: rnd() * TAU });
      }
    }

    const bead = Math.max(1.6, stage.w * 0.0028);
    wax = art.drips.map(([px, py]) => {
      const p = at(px, py);
      return { x: p.x, y: p.y, r: bead, grow: rand(0.22, 0.55), wait: rand(0.4, 7), size: 0, drop: null };
    });

    if (!cloud) cloud = { img: makeCloud(520, 190, 44), x: null, v: 0 };
    cloud.w = moon.r * 4.6;
    cloud.h = cloud.w * 0.36;
    cloud.y = moon.y - cloud.h * 0.45;
    cloud.v = moon.r * 0.09;
    if (cloud.x === null) cloud.x = moon.x - moon.r * 1.2 - cloud.w * 0.5;

    view = sizeCanvas(skyFront, 2);
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
        gr.addColorStop(0, `rgba(206,206,226,${a})`);
        gr.addColorStop(1, "rgba(206,206,226,0)");
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

  /* ---- bats: out of the painted belfry, round the painted moon, away from your hand ---- */

  function makeBats() {
    const narrow = heroW < 760;
    const n = narrow ? 12 : 22;
    const now = performance.now() / 1000;
    bats = Array.from({ length: n }, (_, i) => ({
      x: belfry.x,
      y: belfry.y,
      vx: rand(-60, 60),
      vy: rand(-140, -60),
      s: rand(9, 16) * (narrow ? 0.7 : 1) * (i % 6 === 0 ? 1.5 : 1),
      ph: rand(0, TAU),
      fs: rand(3.6, 5.6),
      orbit: rand(1.3, 3),
      ecc: rand(0.42, 0.75),
      w: rand(0.18, 0.5) * (Math.random() < 0.5 ? -1 : 1),
      a0: rand(0, TAU),
      wob: rand(0.4, 1.4),
      seed: rand(0, 100),
      release: now + 0.8 + i * rand(0.14, 0.32),
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

  /* ---- wax: a bead swells on a painted drip and lets go ---- */

  function tickWax(g, dt) {
    for (const d of wax) {
      if (d.drop) {
        d.drop.v += 760 * dt;
        d.drop.y += d.drop.v * dt;
        d.drop.a -= dt * 1.25;
        if (d.drop.a <= 0) d.drop = null;
      }
      if (d.wait > 0) d.wait -= dt;
      else {
        d.size += dt * d.grow;
        if (d.size >= 1) {
          d.drop = { y: d.y + d.r * 1.2, v: 40, a: 1 };
          d.size = 0;
          d.wait = rand(2.5, 9);
          d.grow = rand(0.22, 0.55);
        }
      }
      const r = d.r;
      if (d.size > 0.02) {
        const k = d.size;
        const by = d.y + r * 0.8 * k;
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 0.45 * k;
        g.drawImage(heroGlow, d.x - r * 4, by - r * 4, r * 8, r * 8);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = Math.min(1, k * 1.6);
        g.fillStyle = "#ff7a1e";
        g.beginPath();
        g.ellipse(d.x, by, r * (0.45 + 0.55 * k), r * (0.55 + 0.75 * k), 0, 0, TAU);
        g.fill();
        g.fillStyle = "rgba(255,226,170,0.85)";
        g.beginPath();
        g.arc(d.x - r * 0.3 * k, by - r * 0.35 * k, r * 0.28 * k, 0, TAU);
        g.fill();
      }
      if (d.drop) {
        const a = Math.max(0, d.drop.a);
        const stretch = Math.min(2.4, 1 + d.drop.v * 0.003);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 0.4 * a;
        g.drawImage(heroGlow, d.x - r * 4, d.drop.y - r * 4, r * 8, r * 8);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = a;
        g.fillStyle = "#ff6f16";
        g.beginPath();
        g.ellipse(d.x, d.drop.y, r * 0.8, r * 0.8 * stretch, 0, 0, TAU);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  const heroFrame = {
    wake() {
      view = sizeCanvas(skyFront, 2);
    },
    tick(t, dt) {
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0 || !view) return;
      const g = view.ctx;
      g.clearRect(0, 0, view.w, view.h);

      // stars that still twinkle in the painted sky
      for (const s of twinkles) {
        const a = Math.sin(t * s.tw + s.ph);
        if (a < 0.05) continue;
        const k = s.s * a;
        g.globalAlpha = a * 0.55;
        g.fillStyle = "#f3f6ff";
        g.fillRect(s.x - k, s.y - 0.4, k * 2, 0.8);
        g.fillRect(s.x - 0.4, s.y - k, 0.8, k * 2);
        g.globalAlpha = a * 0.8;
        g.drawImage(starGlow, s.x - 4, s.y - 4, 8, 8);
      }
      g.globalAlpha = 1;

      // now and then a shooting star, kept to the open sky
      nextShooting -= dt;
      if (!shooting && nextShooting <= 0) {
        const [x0, y0, x1, y1] = art.shoot;
        const p = at(rand(x0 + (x1 - x0) * 0.4, x1), rand(y0, y1));
        shooting = { x: p.x, y: p.y, vx: -rand(520, 760), vy: rand(60, 120), life: 0, max: rand(0.5, 0.8) };
        nextShooting = rand(8, 16);
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

      // a cloud slides across the painted moon
      cloud.x += cloud.v * dt;
      if (cloud.x > moon.x + moon.r * 1.3) cloud.x = moon.x - moon.r * 1.3 - cloud.w;
      g.save();
      g.beginPath();
      g.arc(moon.x, moon.y, moon.r * 1.02, 0, TAU);
      g.clip();
      g.globalAlpha = 0.6;
      g.drawImage(cloud.img, cloud.x, cloud.y, cloud.w, cloud.h);
      g.restore();
      g.globalAlpha = 1;

      // the bats
      g.fillStyle = "#050409";
      g.strokeStyle = "rgba(150,160,215,0.18)";
      g.lineWidth = 0.7;
      const px = pointer.x - r.left;
      const py = pointer.y - r.top;
      for (const b of bats) {
        if (t < b.release) continue;
        const ang = b.a0 + t * b.w;
        const orbit = b.orbit * moon.r;
        const tx = moon.x + Math.cos(ang) * orbit + Math.sin(t * b.wob + b.seed) * 34;
        const ty = moon.y + Math.sin(ang) * orbit * b.ecc + Math.cos(t * b.wob * 1.3 + b.seed) * 24;
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
        drawBat(g, b);
      }

      // the painted wax keeps running
      tickWax(g, dt);
    },
  };
  system(hero, heroFrame);
  tallArt.addEventListener("change", () => {
    layoutHero();
    makeBats();
  });

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
  start();
})();
