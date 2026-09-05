import { ACTS, HEIGHT, PALETTE, PLAYER, WIDTH } from './constants.js';
import { RNG } from './rng.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;

function rgba(hex, alpha) {
  const value = hex.replace('#', '');
  const parsed = Number.parseInt(value.length === 3
    ? value.split('').map((part) => part + part).join('')
    : value, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas, { seed = 7331 } = {}) {
    this.canvas = canvas;
    // Not desynchronized: on Windows Chrome that presents half-drawn frames.
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = true;
    this.cameraY = -HEIGHT * 0.6;
    this.lastEvent = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flash = 0;
    this.flashColor = PALETTE.paper;
    this.plate = '';
    this.plateT = 0;
    this.reverseT = 0;
    this.catchPulse = 0;
    this.releasePulse = 0;
    this.sourcePulse = 0;
    this.particles = [];
    this.rings = [];
    this.trail = [];
    this.reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.cosmetic = new RNG(seed);
    this.clouds = Array.from({ length: 150 }, (_, index) => ({
      x: this.cosmetic.range(-140, WIDTH + 140),
      y: this.cosmetic.range(-7600, 5500),
      r: this.cosmetic.range(46, 210),
      squish: this.cosmetic.range(0.28, 0.72),
      depth: this.cosmetic.range(0.1, 1),
      wobble: this.cosmetic.range(0, Math.PI * 2),
      family: index % 4
    }));
    this.specks = Array.from({ length: 110 }, () => ({
      x: this.cosmetic.range(0, WIDTH),
      y: this.cosmetic.range(0, HEIGHT),
      r: this.cosmetic.range(0.5, 2.2),
      phase: this.cosmetic.range(0, Math.PI * 2)
    }));
  }

  consume(events) {
    for (const event of events) {
      if (event.seq <= this.lastEvent) continue;
      this.lastEvent = event.seq;
      if (event.type === 'act') {
        this.plate = event.plate;
        this.plateT = 2.1;
        this._ring(WIDTH * 0.5, HEIGHT * 0.34, 32, PALETTE.rain, 1.1);
      } else if (event.type === 'catch') {
        this.catchPulse = Math.min(1, this.catchPulse + 0.32);
        this.shake = Math.max(this.shake, 2.3);
        this._burst(event.x, event.y, PALETTE.rain, 7, 95);
      } else if (event.type === 'release') {
        this.releasePulse = 1;
        this.shake = Math.max(this.shake, 3.5 + event.count * 0.55);
        this._ring(event.x, event.y, 28, PALETTE.gold, 0.52);
        this._burst(event.x, event.y - 45, PALETTE.gold, 5 + event.count * 2, 165);
      } else if (event.type === 'source-hit') {
        this.sourcePulse = 1;
        this.shake = Math.max(this.shake, 7);
        this.flash = Math.max(this.flash, 0.13);
        this.flashColor = PALETTE.gold;
        this._ring(event.x, event.y, 48, PALETTE.gold, 0.42);
        this._burst(event.x, event.y, PALETTE.coral, 16, 260);
      } else if (event.type === 'source-collapse') {
        this.shake = Math.max(this.shake, this.reducedMotion ? 5 : 19);
        this.flash = 0.72;
        this.flashColor = PALETTE.paper;
        this._ring(event.x, event.y, 70, PALETTE.paper, 1.05);
        this._ring(event.x, event.y, 38, PALETTE.gold, 1.55);
        this._burst(event.x, event.y, PALETTE.gold, this.reducedMotion ? 24 : 64, 420);
      } else if (event.type === 'damage' || event.type === 'overload') {
        this.shake = Math.max(this.shake, this.reducedMotion ? 5 : 15);
        this.flash = 0.5;
        this.flashColor = PALETTE.coral;
        this._burst(event.x, event.y, PALETTE.coral, 34, 320);
      } else if (event.type === 'seam') {
        this.shake = Math.max(this.shake, 5);
        this._ring(event.x, event.y, 54, PALETTE.bruise, 0.6);
      } else if (event.type === 'reverse') {
        this.reverseT = 1;
        this.plate = 'FALLING OPEN';
        this.plateT = 3.3;
        this.shake = Math.max(this.shake, this.reducedMotion ? 6 : 22);
        this.flash = 0.9;
        this.flashColor = PALETTE.gold;
        this._ring(WIDTH * 0.5, HEIGHT * 0.55, 80, PALETTE.gold, 2.2);
      } else if (event.type === 'victory') {
        this.flash = 1;
        this.flashColor = PALETTE.paper;
      }
    }
  }

  render(sim, alpha = 1, dt = 1 / 60) {
    const ctx = this.ctx;
    const player = sim.player;
    const targetBias = sim.act === 4 ? 0.47 : 0.60;
    let targetCamera = player.y - HEIGHT * targetBias;
    const activeSource = sim.sources.find((source) => source.active);
    if (sim.act <= 3 && activeSource) {
      const sourceMargin = 105 + (activeSource.scale || 1) * 32;
      targetCamera = Math.min(targetCamera, activeSource.y - sourceMargin);
    }
    const cameraRate = sim.act === 4 ? 0.075 : 0.11;
    this.cameraY = lerp(this.cameraY, targetCamera, 1 - Math.pow(1 - cameraRate, dt * 60));

    this.plateT = Math.max(0, this.plateT - dt);
    this.reverseT = Math.max(0, this.reverseT - dt * 0.22);
    this.catchPulse = Math.max(0, this.catchPulse - dt * 2.8);
    this.releasePulse = Math.max(0, this.releasePulse - dt * 2.5);
    this.sourcePulse = Math.max(0, this.sourcePulse - dt * 3.1);
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.shake *= Math.pow(0.005, dt);
    const shakeAmount = this.reducedMotion ? this.shake * 0.25 : this.shake;
    this.shakeX = (this.cosmetic.next() * 2 - 1) * shakeAmount;
    this.shakeY = (this.cosmetic.next() * 2 - 1) * shakeAmount;

    this._updateFx(dt);

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);
    this._drawBackground(sim);
    this._drawRepairs(sim);
    this._drawWind(sim);
    this._drawSources(sim);
    this._drawReturnPaths(sim);
    this._drawRain(sim, alpha);
    this._drawParticles();
    this._drawPlayer(sim);
    this._drawRings();
    this._drawForegroundRain(sim);
    ctx.restore();

    this._drawVignette(sim);
    this._drawPlate(sim);
    this._drawTutorial(sim);
    this._drawFailure(sim);
    this._drawFlash();
  }

  screenY(worldY) { return worldY - this.cameraY; }

  _drawBackground(sim) {
    const ctx = this.ctx;
    const light = clamp(sim.worldLights / 3, 0, 1);
    const rise = sim.act === 4 ? 1 : 0;
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, light > 0.66 || rise
      ? `rgb(${Math.round(lerp(20, 104, light))},${Math.round(lerp(29, 77, light))},${Math.round(lerp(54, 98, light))})`
      : '#090d18');
    gradient.addColorStop(0.52, light > 0
      ? `rgb(${Math.round(lerp(15, 63, light))},${Math.round(lerp(25, 64, light))},${Math.round(lerp(45, 82, light))})`
      : '#111a2c');
    gradient.addColorStop(1, rise ? '#a36466' : '#1b2840');
    ctx.fillStyle = gradient;
    ctx.fillRect(-30, -30, WIDTH + 60, HEIGHT + 60);

    for (const speck of this.specks) {
      const twinkle = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(sim.t * 0.9 + speck.phase));
      ctx.fillStyle = rgba(light > 0.4 ? PALETTE.gold : PALETTE.rain, twinkle * (0.08 + light * 0.28));
      ctx.beginPath();
      ctx.arc(speck.x, speck.y, speck.r * (0.7 + light * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    for (const cloud of this.clouds) {
      const parallax = 0.28 + cloud.depth * 0.55;
      const sy = cloud.y - this.cameraY * parallax;
      if (sy < -cloud.r * 2 || sy > HEIGHT + cloud.r * 2) continue;
      const drift = Math.sin(sim.t * (0.07 + cloud.depth * 0.09) + cloud.wobble) * (18 + cloud.depth * 35);
      const x = cloud.x + drift;
      const alpha = 0.035 + cloud.depth * 0.075 + (1 - light) * 0.045;
      const puff = ctx.createRadialGradient(x, sy, cloud.r * 0.05, x, sy, cloud.r);
      puff.addColorStop(0, rgba(cloud.family === 2 ? PALETTE.bruise : PALETTE.paper, alpha));
      puff.addColorStop(0.55, rgba(PALETTE.storm, alpha * 0.72));
      puff.addColorStop(1, rgba(PALETTE.ink, 0));
      ctx.save();
      ctx.translate(x, sy);
      ctx.scale(1, cloud.squish);
      ctx.translate(-x, -sy);
      ctx.fillStyle = puff;
      ctx.beginPath();
      ctx.arc(x, sy, cloud.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const horizon = ctx.createLinearGradient(0, HEIGHT * 0.72, 0, HEIGHT);
    horizon.addColorStop(0, rgba(PALETTE.ink, 0));
    horizon.addColorStop(1, rgba(PALETTE.ink, 0.48 - light * 0.2));
    ctx.fillStyle = horizon;
    ctx.fillRect(0, HEIGHT * 0.68, WIDTH, HEIGHT * 0.32);
  }

  _drawRepairs(sim) {
    const ctx = this.ctx;
    for (let i = 0; i < sim.repaired.length; i += 1) {
      const repair = sim.repaired[i];
      const y = this.screenY(repair.y);
      if (y < -500 || y > HEIGHT + 500) continue;
      const pulse = 0.82 + Math.sin(sim.t * 1.4 + i) * 0.18;
      const glow = ctx.createRadialGradient(repair.x, y, 10, repair.x, y, 270);
      glow.addColorStop(0, rgba(PALETTE.gold, 0.44 * pulse));
      glow.addColorStop(0.24, rgba(PALETTE.coral, 0.13 * pulse));
      glow.addColorStop(1, rgba(PALETTE.gold, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(repair.x - 280, y - 280, 560, 560);

      ctx.strokeStyle = rgba(PALETTE.gold, 0.32);
      ctx.lineWidth = 2;
      for (let ring = 0; ring < 4; ring += 1) {
        ctx.beginPath();
        ctx.arc(repair.x, y, 42 + ring * 24 + Math.sin(sim.t + ring) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let ray = 0; ray < 12; ray += 1) {
        const a = ray / 12 * Math.PI * 2 + sim.t * 0.05;
        const r0 = 100;
        const r1 = 158 + 15 * Math.sin(sim.t * 0.8 + ray);
        ctx.beginPath();
        ctx.moveTo(repair.x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(repair.x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        ctx.stroke();
      }
    }
  }

  _drawWind(sim) {
    const ctx = this.ctx;
    const wind = sim.windAt(sim.player.y);
    const strength = clamp(Math.abs(wind) / 370, 0, 1);
    if (strength < 0.04 && sim.act !== 4) return;
    const direction = Math.sign(wind) || 1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 24; i += 1) {
      const y = (i * 67 + sim.t * (42 + strength * 110)) % (HEIGHT + 130) - 65;
      const offset = ((i * 131 + Math.floor(sim.t * 20)) % 900);
      const x = direction > 0 ? offset - 160 : WIDTH - offset + 160;
      const length = 32 + strength * 120 + (i % 4) * 11;
      ctx.strokeStyle = rgba(sim.act === 4 ? PALETTE.gold : PALETTE.rain, 0.025 + strength * 0.12);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + direction * length * 0.34, y - 9 * Math.sin(i),
        x + direction * length * 0.68, y + 9 * Math.cos(i * 0.7),
        x + direction * length, y
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawStormSeam(sim) {
    if (sim.act < 1 || sim.act > 3) return;
    const source = sim.sources.find((entry) => entry.active);
    if (!source) return;
    const y = this.screenY(source.y + ACTS[sim.act].gateBelow);
    if (y < -120 || y > HEIGHT + 120) return;
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, y - 90, 0, y + 90);
    gradient.addColorStop(0, rgba(PALETTE.ink, 0));
    gradient.addColorStop(0.5, rgba(PALETTE.bruise, 0.13 + sim.player.seamFlash * 0.12));
    gradient.addColorStop(1, rgba(PALETTE.ink, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 100, WIDTH, 200);
    ctx.strokeStyle = rgba(PALETTE.rain, 0.12 + sim.player.seamFlash * 0.35);
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 22]);
    ctx.lineDashOffset = -sim.t * 80;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= WIDTH; x += 45) {
      ctx.lineTo(x, y + Math.sin(x * 0.025 + sim.t * 2) * 15);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawSources(sim) {
    for (const source of sim.sources) {
      const y = this.screenY(source.y);
      if (y < -420 || y > HEIGHT + 420) continue;
      this._drawSource(source, y, sim);
    }
  }

  _drawSource(source, y, sim) {
    const ctx = this.ctx;
    const scale = source.scale || 1;
    const hurt = 1 - source.hp / source.maxHp;
    const pulse = 1 + Math.sin(sim.t * (2.1 + hurt) + source.act) * 0.035;
    const radius = 94 * scale * pulse;
    ctx.save();
    ctx.translate(source.x, y);
    ctx.rotate(Math.sin(sim.t * 0.23 + source.act) * 0.08);
    ctx.globalCompositeOperation = 'screen';
    const halo = ctx.createRadialGradient(0, 0, 12, 0, 0, radius * 2.8);
    halo.addColorStop(0, rgba(source.active ? PALETTE.coral : PALETTE.gold, 0.3 + source.hitFlash * 0.35));
    halo.addColorStop(0.3, rgba(PALETTE.bruise, 0.14));
    halo.addColorStop(1, rgba(PALETTE.ink, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-radius * 3, -radius * 3, radius * 6, radius * 6);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = source.active ? '#060811' : rgba(PALETTE.gold, 0.12);
    ctx.beginPath();
    for (let i = 0; i < 24; i += 1) {
      const a = i / 24 * Math.PI * 2;
      const r = radius * (0.82 + Math.sin(i * 2.3 + sim.t * 0.7) * 0.09 + (i % 3) * 0.035);
      const x = Math.cos(a) * r;
      const yy = Math.sin(a) * r * (0.72 + hurt * 0.08);
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.closePath();
    ctx.fill();

    for (let ring = 0; ring < 4; ring += 1) {
      const broken = hurt * (ring + 1) * 0.85;
      ctx.strokeStyle = rgba(ring < 2 ? PALETTE.paper : PALETTE.rain, source.active ? 0.24 + source.hitFlash * 0.35 : 0.08);
      ctx.lineWidth = Math.max(1.5, (4 - ring) * 1.25 * scale);
      ctx.beginPath();
      const start = -Math.PI * (0.82 - broken * 0.06) + ring * 0.17;
      const end = Math.PI * (0.82 - broken * 0.08) - ring * 0.11;
      ctx.ellipse(0, 0, radius * (0.74 - ring * 0.12), radius * (0.42 - ring * 0.055), ring * 0.23 + sim.t * (ring % 2 ? -0.04 : 0.03), start, end);
      ctx.stroke();
    }

    const slit = radius * (0.42 + hurt * 0.17);
    ctx.strokeStyle = rgba(PALETTE.coral, source.active ? 0.72 + source.hitFlash * 0.25 : 0.15);
    ctx.lineWidth = 7 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-slit, 0);
    ctx.quadraticCurveTo(0, 18 * Math.sin(sim.t * 1.3), slit, 0);
    ctx.stroke();
    ctx.fillStyle = rgba(PALETTE.paper, source.active ? 0.8 : 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, 7 + source.hitFlash * 8, 16 + hurt * 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const wounds = Math.max(1, Math.ceil(source.hp / Math.max(1, source.maxHp / 5)));
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI * 0.82 + i / 4 * Math.PI * 1.64;
      const alive = i < wounds && source.active;
      ctx.fillStyle = alive ? rgba(PALETTE.rain, 0.7) : rgba(PALETTE.gold, 0.18);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * radius * 0.68, Math.sin(a) * radius * 0.68, alive ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawReturnPaths(sim) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const drop of sim.rain) {
      if (drop.dead || drop.state !== 'returning' || !drop.returnPath?.length) continue;
      ctx.strokeStyle = rgba(PALETTE.gold, 0.1 + clamp(drop.returnT, 0, 1) * 0.2);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 13]);
      ctx.lineDashOffset = drop.returnT * 120;
      ctx.beginPath();
      for (let i = 0; i < drop.returnPath.length; i += 1) {
        const point = drop.returnPath[i];
        const y = this.screenY(point.y);
        if (i === 0) ctx.moveTo(point.x, y);
        else ctx.lineTo(point.x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawRain(sim, alpha) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const drop of sim.rain) {
      if (drop.dead) continue;
      const x = lerp(drop.px, drop.x, alpha);
      const worldY = lerp(drop.py, drop.y, alpha);
      const y = this.screenY(worldY);
      if (y < -100 || y > HEIGHT + 100) continue;
      if (drop.state === 'live') {
        const speed = Math.hypot(drop.vx, drop.vy) || 1;
        const nx = drop.vx / speed;
        const ny = drop.vy / speed;
        const length = 26 + clamp(speed / 18, 0, 24);
        ctx.strokeStyle = rgba(drop.lethal ? PALETTE.rain : PALETTE.paper, drop.lethal ? 0.68 : 0.38);
        ctx.lineWidth = drop.lethal ? 2.4 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x - nx * length, y - ny * length);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = rgba(drop.lethal ? PALETTE.paper : PALETTE.rain, drop.lethal ? 0.9 : 0.55);
        ctx.beginPath();
        ctx.moveTo(x, y + 7);
        ctx.quadraticCurveTo(x + 6, y, x, y - 7);
        ctx.quadraticCurveTo(x - 6, y, x, y + 7);
        ctx.fill();
        ctx.strokeStyle = rgba(PALETTE.ink, 0.75);
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (drop.state === 'returning') {
        const tail = 34 + clamp(drop.returnT, 0, 1) * 42;
        const dx = drop.x - drop.px;
        const dy = drop.y - drop.py;
        const d = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = rgba(PALETTE.gold, 0.9);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - dx / d * tail, y - dy / d * tail);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = PALETTE.paper;
        ctx.beginPath();
        ctx.arc(x, y, 6.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (drop.state === 'collapsing') {
        ctx.strokeStyle = rgba(PALETTE.gold, 0.34);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(drop.px, this.screenY(drop.py));
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = rgba(PALETTE.paper, 0.46);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawPlayer(sim) {
    const ctx = this.ctx;
    const p = sim.player;
    const x = p.x;
    const y = this.screenY(p.y);
    const orientation = sim.act === 4 ? 1 : -1;
    const openness = p.open;
    const canopyY = y + orientation * PLAYER.canopyOffset;
    const canopyX = x + p.tilt * 16 * openness;
    const width = lerp(16, PLAYER.canopyX, openness);
    const height = lerp(38, PLAYER.canopyY, openness);

    this.trail.push({ x, y, t: 1, open: openness, act: sim.act });
    if (this.trail.length > 34) this.trail.shift();
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < this.trail.length; i += 1) {
      const point = this.trail[i];
      const a = (i / this.trail.length) ** 2 * 0.07;
      ctx.fillStyle = rgba(sim.act === 4 ? PALETTE.gold : PALETTE.rain, a);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3 + point.open * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const glow = ctx.createRadialGradient(x, y, 2, x, y, 100 + this.catchPulse * 50);
    glow.addColorStop(0, rgba(PALETTE.gold, 0.18 + this.catchPulse * 0.16));
    glow.addColorStop(1, rgba(PALETTE.gold, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - 160, y - 160, 320, 320);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(clamp(p.vx / 1100, -0.24, 0.24));
    ctx.fillStyle = p.damageFlash > 0 ? PALETTE.paper : '#d55354';
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.quadraticCurveTo(-24, 9, -18, 48);
    ctx.lineTo(0, 58);
    ctx.lineTo(18, 48);
    ctx.quadraticCurveTo(24, 9, 0, -17);
    ctx.fill();
    ctx.fillStyle = PALETTE.paper;
    ctx.beginPath();
    ctx.arc(0, -26, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(PALETTE.ink, 0.8);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, 54);
    ctx.lineTo(-12 - p.tilt * 7, 75);
    ctx.moveTo(6, 54);
    ctx.lineTo(12 - p.tilt * 5, 75);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(canopyX, canopyY);
    ctx.rotate(p.tilt * 0.23 * orientation);
    ctx.strokeStyle = rgba(PALETTE.paper, 0.9);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x - canopyX, y - canopyY - orientation * 8);
    ctx.stroke();

    const strainBend = p.strain * 13;
    ctx.scale(1, orientation);
    for (let panel = 0; panel < PLAYER.panels; panel += 1) {
      const left = lerp(-width, width, panel / PLAYER.panels);
      const right = lerp(-width, width, (panel + 1) / PLAYER.panels);
      const intact = panel < p.panels;
      ctx.fillStyle = intact
        ? rgba(panel % 2 ? PALETTE.paper : '#d8e6e6', 0.94 - p.strain * 0.18)
        : rgba(PALETTE.ink, 0.18);
      ctx.strokeStyle = intact ? rgba(PALETTE.ink, 0.72) : rgba(PALETTE.coral, 0.72);
      ctx.lineWidth = intact ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo((left + right) * 0.28, -height - strainBend, right, 2 + Math.abs(right / Math.max(1, width)) * height * 0.12);
      ctx.lineTo(left, 2 + Math.abs(left / Math.max(1, width)) * height * 0.12);
      ctx.quadraticCurveTo((left + right) * 0.18, -height - strainBend, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!intact && openness > 0.4) {
        ctx.strokeStyle = rgba(PALETTE.coral, 0.72);
        ctx.beginPath();
        ctx.moveTo(left, 0);
        ctx.lineTo((left + right) * 0.48, -height * 0.35);
        ctx.lineTo(right, 0);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = rgba(PALETTE.paper, 0.95);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-width, 2);
    ctx.quadraticCurveTo(0, -height * 1.52 - strainBend, width, 2);
    ctx.stroke();
    ctx.restore();

    if (sim.caught.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < sim.caught.length; i += 1) {
        const t = sim.caught.length === 1 ? 0.5 : i / (sim.caught.length - 1);
        const bx = canopyX + lerp(-width * 0.76, width * 0.76, t);
        const arc = Math.sin(t * Math.PI);
        const by = canopyY - orientation * (height * (0.3 + arc * 0.72) + p.strain * 10);
        const pulse = 1 + Math.sin(sim.t * 8 + i) * 0.15;
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(bx, by, 6.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba(PALETTE.paper, 0.65);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(canopyX, canopyY);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (p.invulnerable > 0) {
      ctx.strokeStyle = rgba(PALETTE.paper, 0.22 + 0.18 * Math.sin(sim.t * 24));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 42 + p.invulnerable * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawForegroundRain(sim) {
    const ctx = this.ctx;
    const speed = sim.act === 4 ? -1 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = rgba(sim.act === 4 ? PALETTE.gold : PALETTE.rain, sim.act === 4 ? 0.12 : 0.055);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 44; i += 1) {
      const x = (i * 137 + Math.sin(i * 4.7) * 60 + sim.t * sim.windAt(sim.player.y) * 0.11) % (WIDTH + 180) - 90;
      const y = (i * 79 + sim.t * 270 * speed) % (HEIGHT + 160) - 80;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - sim.windAt(sim.player.y) * 0.035, y - speed * 38);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawParticles() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const particle of this.particles) {
      ctx.fillStyle = rgba(particle.color, clamp(particle.life, 0, 1) * particle.alpha);
      if (particle.shape === 'line') {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = particle.size;
        ctx.beginPath();
        ctx.moveTo(particle.x, this.screenY(particle.y));
        ctx.lineTo(particle.x - particle.vx * 0.04, this.screenY(particle.y - particle.vy * 0.04));
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, this.screenY(particle.y), particle.size * easeOut(particle.life), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawRings() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const ring of this.rings) {
      ctx.strokeStyle = rgba(ring.color, clamp(ring.life, 0, 1) * 0.7);
      ctx.lineWidth = 2 + ring.life * 3;
      ctx.beginPath();
      ctx.arc(ring.x, this.screenY(ring.y), ring.radius * (1 + (1 - ring.life) * 2.2), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawVignette(sim) {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.48, HEIGHT * 0.18, WIDTH * 0.5, HEIGHT * 0.5, HEIGHT * 0.75);
    gradient.addColorStop(0, rgba(PALETTE.ink, 0));
    gradient.addColorStop(0.74, rgba(PALETTE.ink, 0.12));
    gradient.addColorStop(1, rgba(PALETTE.ink, 0.72 - sim.worldLights * 0.08));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (sim.player.seamFlash > 0) {
      ctx.strokeStyle = rgba(PALETTE.bruise, sim.player.seamFlash * 0.42);
      ctx.lineWidth = 12 * sim.player.seamFlash;
      ctx.strokeRect(5, 5, WIDTH - 10, HEIGHT - 10);
    }
  }

  _drawPlate(sim) {
    if (this.plateT <= 0 || !this.plate) return;
    const ctx = this.ctx;
    const total = this.plate === 'FALLING OPEN' ? 3.3 : 2.1;
    const elapsed = total - this.plateT;
    const fadeIn = clamp(elapsed / 0.24, 0, 1);
    const fadeOut = clamp(this.plateT / 0.52, 0, 1);
    const alpha = fadeIn * fadeOut;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = this.plate === 'THE CLOSED SKY' ? '900 76px Impact, sans-serif' : '900 88px Impact, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = rgba(PALETTE.paper, alpha * 0.9);
    ctx.shadowColor = rgba(PALETTE.ink, alpha);
    ctx.shadowBlur = 28;
    ctx.fillText(this.plate, WIDTH * 0.5, HEIGHT * 0.34);
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillStyle = rgba(this.plate === 'FALLING OPEN' ? PALETTE.gold : PALETTE.rain, alpha * 0.68);
    ctx.fillText(this.plate === 'FALLING OPEN' ? 'the same hand / the other direction' : 'hold / let go', WIDTH * 0.5, HEIGHT * 0.34 + 76);
    ctx.restore();
  }

  _drawTutorial(sim) {
    if (sim.mode !== 'playing' || sim.act !== 1 || sim.actTime > 9 || sim.stats.catches > 0) return;
    const ctx = this.ctx;
    const t = sim.actTime;
    const alpha = clamp(t / 0.8, 0, 1) * clamp((9 - t) / 2, 0, 1);
    const y = HEIGHT * 0.82;
    ctx.save();
    ctx.strokeStyle = rgba(PALETTE.rain, alpha * 0.58);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(WIDTH * 0.5, y - 12, 20 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(WIDTH * 0.5, y + 8);
    ctx.lineTo(WIDTH * 0.5, y + 31);
    ctx.quadraticCurveTo(WIDTH * 0.5 + 2, y + 43, WIDTH * 0.5 + 12, y + 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(WIDTH * 0.5 - 92, y + 10);
    ctx.lineTo(WIDTH * 0.5 - 42, y + 10);
    ctx.moveTo(WIDTH * 0.5 - 92, y + 10);
    ctx.lineTo(WIDTH * 0.5 - 76, y - 1);
    ctx.moveTo(WIDTH * 0.5 - 92, y + 10);
    ctx.lineTo(WIDTH * 0.5 - 76, y + 21);
    ctx.moveTo(WIDTH * 0.5 + 92, y + 10);
    ctx.lineTo(WIDTH * 0.5 + 42, y + 10);
    ctx.moveTo(WIDTH * 0.5 + 92, y + 10);
    ctx.lineTo(WIDTH * 0.5 + 76, y - 1);
    ctx.moveTo(WIDTH * 0.5 + 92, y + 10);
    ctx.lineTo(WIDTH * 0.5 + 76, y + 21);
    ctx.stroke();
    ctx.restore();
  }

  _drawFailure(sim) {
    if (sim.mode !== 'defeat') return;
    const ctx = this.ctx;
    ctx.fillStyle = rgba(PALETTE.ink, 0.58);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.paper;
    ctx.font = '900 76px Impact, sans-serif';
    ctx.fillText('THE WEATHER GOT IN', WIDTH * 0.5, HEIGHT * 0.48);
    ctx.font = '500 19px system-ui, sans-serif';
    ctx.fillStyle = rgba(PALETTE.rain, 0.78);
    ctx.fillText('touch · space · A', WIDTH * 0.5, HEIGHT * 0.55);
  }

  _drawFlash() {
    if (this.flash <= 0) return;
    this.ctx.fillStyle = rgba(this.flashColor, clamp(this.flash, 0, 1) * 0.62);
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  _updateFx(dt) {
    for (const particle of this.particles) {
      particle.life -= dt / particle.duration;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.12, dt);
      particle.vy *= Math.pow(0.2, dt);
      particle.vy += particle.gravity * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    for (const ring of this.rings) ring.life -= dt / ring.duration;
    this.rings = this.rings.filter((ring) => ring.life > 0);
  }

  _burst(x, worldY, color, count, speed) {
    const n = this.reducedMotion ? Math.ceil(count * 0.45) : count;
    for (let i = 0; i < n && this.particles.length < 520; i += 1) {
      const angle = this.cosmetic.range(0, Math.PI * 2);
      const velocity = this.cosmetic.range(speed * 0.3, speed);
      this.particles.push({
        x,
        y: worldY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        gravity: this.cosmetic.range(-30, 120),
        life: 1,
        duration: this.cosmetic.range(0.3, 0.85),
        color,
        alpha: this.cosmetic.range(0.35, 0.95),
        size: this.cosmetic.range(1.3, 4.8),
        shape: i % 3 ? 'line' : 'dot'
      });
    }
  }

  _ring(x, worldY, radius, color, duration) {
    if (this.rings.length > 80) this.rings.shift();
    this.rings.push({ x, y: worldY, radius, color, duration, life: 1 });
  }
}
