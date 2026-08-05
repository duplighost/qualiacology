// fluid.js — incompressible 2D flow on the GPU, with combustion coupled in.
//
// Per fixed step (1/60 s):
//   advect velocity (RK2)  ->  advect medium (MacCormack)  ->  combust (MRT)
//   -> curl -> forces (buoyancy, vorticity confinement, hand, draughts)
//   -> divergence (+ the inhale's mass sink) -> Jacobi pressure -> project
//
// Obstacles are handled in divergence/Jacobi/project with reflected velocity
// and Neumann pressure; `open` cells get p = 0 so air can leave the world.

import * as S from './shaders.js';
import { AsyncReader } from './gl.js';

export const PARAMS = {
  jacobi: 26,
  dt: 1 / 60,
  maxSubSteps: 2,

  velDiss: 0.03,          // per-second decay applied during advection
  mediumDiss: [0.015, 0.055, 0.010, 0.030],

  buoy: 100,               // cells/s^2 per unit heat
  smokeWeight: 26,
  vort: 1.35,
  damp: 0.85,
  ambientSwirl: 26,

  pointerForce: 13,       // multiplies hand velocity (cells/s) into acceleration
  pointerRadius: 0.085,   // in aspect-corrected uv
  pointerMaxSpeed: 430,   // a hard human flick; beyond this the room is a pinball table
  sink: 4.8,              // inhale strength (mass sink in the projection)
  sinkRadius: 0.135,

  ignite: 0.47,
  burnRate: 2.6,
  heatYield: 4.4,
  smokeYield: 0.26,
  cool: 0.92,
  quench: 2.6,
  smokeFade: 0.16,
  humidFade: 0.10,
  heatCap: 2.4,
  conduct: 1.25,
  flame: 1.85,          // the temperature a lit wick holds
  wet: 0.62,            // humidity that puts a flame out (scaled by fuel kind)

  emberEmit: 2.3,
  emberEmitR: 0.0062,
  emberSmoke: 0.05,    // a spark is a spark; it must not smother itself
  ignR: 0.023,          // how far a spark can set something alight (uv)

  sparkSpawn: 0.55,
  sparkLife: 1.15,
  moteLife: 9.0,
};

const PROBES = 48;
const PART_W = 64, PART_H = 64;

export class Fluid {
  constructor(glx) {
    this.glx = glx;
    this.base = Object.assign({}, PARAMS);
    this.p = Object.assign({}, PARAMS);
    this.gw = 0; this.gh = 0;
    this.time = 0;
    this.acc = 0;
    this.probeUv = new Float32Array(PROBES * 2);
    this.gustA = new Float32Array(16);
    this.gustB = new Float32Array(16);
    this.ventGain = 1;
    this.rain = 0;
    this.pointer = [0.5, 0.5];
    this.handActive = false;
    this.pointerForce = [0, 0];
    this.sink = 0;
    this.ember = { uv: [0.5, 0.5], heat: 0, emit: 1 };
    this._progs = null;
  }

  programs() {
    if (this._progs) return this._progs;
    const g = this.glx;
    this._progs = {
      advectVel: g.prog(S.ADVECT_VEL),
      advectMed: g.prog(S.ADVECT_MEDIUM),
      combust: g.prog(S.COMBUST),
      curl: g.prog(S.CURL),
      forces: g.prog(S.FORCES),
      divergence: g.prog(S.DIVERGENCE),
      jacobi: g.prog(S.JACOBI),
      gradient: g.prog(S.GRADIENT),
      probe: g.prog(S.PROBE),
      part: g.prog(S.PART_UPDATE),
    };
    return this._progs;
  }

  /** (Re)allocate everything for a level of gw x gh cells and upload its fields. */
  load(level) {
    const g = this.glx, gl = g.gl;
    const { gw, gh } = level;
    if (this.gw !== gw || this.gh !== gh) {
      this.dispose();
      this.gw = gw; this.gh = gh;
      this.vel = g.double(gw, gh, 'rg16f', 'linear');
      this.medium = g.double(gw, gh, 'rgba16f', 'linear');
      this.fuel = g.double(gw, gh, 'rgba16f', 'linear');
      this.pressure = g.double(gw, gh, 'r16f', 'nearest');
      this.divergence = g.target(gw, gh, 'r16f', 'nearest');
      this.curl = g.target(gw, gh, 'r16f', 'nearest');
      this.solidT = g.target(gw, gh, 'rgba16f', 'linear');
      this.ventT = g.target(gw, gh, 'rg16f', 'linear');
      this.probeT = g.target(PROBES, 2, 'rgba32f', 'nearest');
      this.reader = new AsyncReader(g, PROBES, 2, 3);
      this.parts = g.double(PART_W, PART_H, 'rgba32f', 'nearest');
    }
    g.upload(this.solidT.tex, gw, gh, 'rgba16f', level.solid);
    g.upload(this.ventT.tex, gw, gh, 'rg16f', level.vent);
    g.upload(this.fuel.a.tex, gw, gh, 'rgba16f', level.fuel);
    g.upload(this.fuel.b.tex, gw, gh, 'rgba16f', level.fuel);
    g.upload(this.medium.a.tex, gw, gh, 'rgba16f', level.medium);
    g.upload(this.medium.b.tex, gw, gh, 'rgba16f', level.medium);
    const zeros = new Float32Array(gw * gh * 2);
    g.upload(this.vel.a.tex, gw, gh, 'rg16f', zeros);
    g.upload(this.vel.b.tex, gw, gh, 'rg16f', zeros);
    const zp = new Float32Array(gw * gh);
    g.upload(this.pressure.a.tex, gw, gh, 'r16f', zp);
    g.upload(this.pressure.b.tex, gw, gh, 'r16f', zp);

    const pd = new Float32Array(PART_W * PART_H * 4); // all dead, they wake in
    g.upload(this.parts.a.tex, PART_W, PART_H, 'rgba32f', pd);
    g.upload(this.parts.b.tex, PART_W, PART_H, 'rgba32f', pd);

    this.texel = [1 / gw, 1 / gh];
    this.aspect = [1, gh / gw];   // makes radial splats round in uv space
    this.time = 0; this.acc = 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  dispose() {
    const gl = this.glx.gl;
    if (this.reader) { this.reader.dispose(); this.reader = null; }
    for (const fbo of this.glx._mrtFbos.values()) gl.deleteFramebuffer(fbo);
    this.glx._mrtFbos.clear();
    const kill = (t) => { if (!t) return; if (t.a) { kill(t.a); kill(t.b); return; } gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); };
    ['vel', 'medium', 'fuel', 'pressure', 'divergence', 'curl', 'solidT', 'ventT', 'probeT', 'parts'].forEach((k) => { kill(this[k]); this[k] = null; });
  }

  /** Reset to the base tuning, then apply a movement's overrides. */
  applySim(o) { Object.assign(this.p, this.base); if (o) Object.assign(this.p, o); }

  setProbe(i, u, v) { this.probeUv[i * 2] = u; this.probeUv[i * 2 + 1] = v; }
  /** row 0 -> [velX, velY, heat, smoke]; row 1 -> [solid, fuel, humidity, material] */
  probe(i, row = 0) {
    const d = this.reader.data;
    const o = (row * PROBES + i) * 4;
    return [d[o], d[o + 1], d[o + 2], d[o + 3]];
  }

  setGust(i, uvx, uvy, radius, strength, dx, dy) {
    this.gustA[i * 4] = uvx; this.gustA[i * 4 + 1] = uvy;
    this.gustA[i * 4 + 2] = radius; this.gustA[i * 4 + 3] = strength;
    this.gustB[i * 4] = dx; this.gustB[i * 4 + 1] = dy;
  }
  clearGusts() { this.gustA.fill(0); this.gustB.fill(0); }

  /** Advance by real seconds, in fixed sub-steps. Returns steps taken. */
  advance(seconds, onStep) {
    const p = this.p;
    this.acc += Math.min(seconds, 0.25);
    let n = 0;
    while (this.acc >= p.dt && n < p.maxSubSteps) {
      if (onStep) onStep(p.dt, n);
      this.step(p.dt);
      this.acc -= p.dt;
      n++;
    }
    if (this.acc > p.dt) this.acc = p.dt; // drop the backlog rather than spiral
    return n;
  }

  step(dt) {
    const g = this.glx, P = this.programs(), p = this.p;
    const texel = this.texel, aspect = this.aspect;
    this.time += dt;

    // 1. velocity self-advection
    g.draw(P.advectVel, this.vel.write, {
      uVel: this.vel.read.tex, uSolid: this.solidT.tex, uTexel: texel,
      uDt: dt, uDiss: Math.exp(-p.velDiss * dt),
    });
    this.vel.swap();

    // 2. heat / smoke / humidity / ash ride the flow
    const md = p.mediumDiss;
    g.draw(P.advectMed, this.medium.write, {
      uVel: this.vel.read.tex, uSrc: this.medium.read.tex, uSolid: this.solidT.tex,
      uTexel: texel, uDt: dt,
      uDiss: [Math.exp(-md[0] * dt), Math.exp(-md[1] * dt), Math.exp(-md[2] * dt), Math.exp(-md[3] * dt)],
    });
    this.medium.swap();

    // 3. burn
    g.drawMRT(P.combust, [this.medium.write, this.fuel.write], {
      uMedium: this.medium.read.tex, uFuel: this.fuel.read.tex, uSolid: this.solidT.tex,
      uTexel: texel, uDt: dt,
      uIgnite: p.ignite, uBurnRate: p.burnRate, uHeatYield: p.heatYield, uSmokeYield: p.smokeYield,
      uCool: p.cool, uQuench: p.quench, uSmokeFade: p.smokeFade, uHumidFade: p.humidFade,
      uRain: this.rain, uTime: this.time, uHeatCap: p.heatCap, uConduct: p.conduct,
      uFlame: p.flame, uWet: p.wet,
      uEmber: this.ember.uv,
      uEmberEmit: [p.emberEmit * this.ember.heat * this.ember.heat * this.ember.emit, p.emberEmitR, p.emberSmoke * this.ember.heat],
      uAspect: aspect, uIgnR: p.ignR, uEmberHeat: this.ember.heat,
    });
    this.medium.swap(); this.fuel.swap();

    // 4. forces
    g.draw(P.curl, this.curl, { uVel: this.vel.read.tex, uTexel: texel });
    g.draw(P.forces, this.vel.write, {
      uVel: this.vel.read.tex, uMedium: this.medium.read.tex, uCurl: this.curl.tex,
      uSolid: this.solidT.tex, uVent: this.ventT.tex, uTexel: texel, uDt: dt,
      uBuoy: p.buoy, uSmokeW: p.smokeWeight, uVort: p.vort, uDamp: p.damp,
      uVentGain: this.ventGain, uTime: this.time, uAmbientSwirl: p.ambientSwirl,
      uPointer: this.pointer, uPointerForce: this.pointerForce, uPointerR: p.pointerRadius,
      uAspect: aspect, uGustA: this.gustA, uGustB: this.gustB,
    });
    this.vel.swap();

    // 5. projection
    g.draw(P.divergence, this.divergence, {
      uVel: this.vel.read.tex, uSolid: this.solidT.tex, uTexel: texel,
      uPointer: this.pointer, uAspect: aspect, uSink: this.sink, uPointerR: p.sinkRadius,
    });
    g.clear(this.pressure.read, 0, 0, 0, 1);
    for (let i = 0; i < p.jacobi; i++) {
      g.draw(P.jacobi, this.pressure.write, {
        uP: this.pressure.read.tex, uDiv: this.divergence.tex, uSolid: this.solidT.tex, uTexel: texel,
      });
      this.pressure.swap();
    }
    g.draw(P.gradient, this.vel.write, {
      uP: this.pressure.read.tex, uVel: this.vel.read.tex, uSolid: this.solidT.tex, uTexel: texel,
    });
    this.vel.swap();

    // 6. sparks and dust ride the same field
    g.draw(P.part, this.parts.write, {
      uPart: this.parts.read.tex, uVel: this.vel.read.tex, uMedium: this.medium.read.tex,
      uSolid: this.solidT.tex, uTexel: texel, uDt: dt, uTime: this.time,
      uSpawnRate: p.sparkSpawn, uEmberHeat: this.ember.heat, uSparkLife: p.sparkLife,
      uMoteLife: p.moteLife, uEmber: this.ember.uv, uEmberVel: [0, 0], uGrid: [this.gw, this.gh],
      uHand: this.pointer, uHandActive: this.handActive ? 1 : 0,
    });
    this.parts.swap();
  }

  /** Render the point queries and kick off (or harvest) the async readback. */
  readProbes(sync = false) {
    const g = this.glx, P = this.programs();
    g.draw(P.probe, this.probeT, {
      uVel: this.vel.read.tex, uMedium: this.medium.read.tex, uFuel: this.fuel.read.tex,
      uSolid: this.solidT.tex, uProbe: this.probeUv, uTexel: this.texel,
    });
    if (sync) this.reader.readNow(this.probeT);
    else this.reader.update(this.probeT);
  }

  get partCount() { return PART_W * PART_H; }
  get partRes() { return [PART_W, PART_H]; }
}
