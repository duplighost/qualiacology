import { ACTS, FIXED_STEP, HEIGHT, PLAYER, WIDTH } from './constants.js';
import { hashString, RNG } from './rng.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const moveToward = (value, target, amount) => value < target
  ? Math.min(target, value + amount)
  : Math.max(target, value - amount);

function round(value, places = 3) {
  const p = 10 ** places;
  return Math.round(value * p) / p;
}

function pathPoint(path, t) {
  if (!path.length) return { x: 0, y: 0 };
  if (path.length === 1) return path[0];
  const scaled = clamp(t, 0, 1) * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(scaled));
  const f = scaled - index;
  return {
    x: lerp(path[index].x, path[index + 1].x, f),
    y: lerp(path[index].y, path[index + 1].y, f)
  };
}

export class GameSim {
  constructor({ seed = 1337 } = {}) {
    this.seed = Number(seed) || 1337;
    this._eventSeq = 0;
    this.events = [];
    this.reset();
  }

  reset() {
    this.mode = 'title';
    this.t = 0;
    this.runTime = 0;
    this.actTime = 0;
    this.act = 0;
    this.actStartY = 0;
    this.finaleTop = -2600;
    this.clearTimer = 0;
    this.seamEngaged = false;
    this.sourceSerial = 0;
    this.rainSerial = 0;
    this.worldLights = 0;
    this.repaired = [];
    this.sources = [];
    this.rain = [];
    this.caught = [];
    this.input = { hold: false, steer: 0 };
    this.lastInput = { hold: false, steer: 0 };
    this.gameplayRng = new RNG(this.seed);
    this.player = {
      x: WIDTH * 0.5,
      y: 0,
      vx: 0,
      vy: 225,
      open: 0,
      tilt: 0,
      strain: 0,
      panels: PLAYER.panels,
      invulnerable: 0,
      damageFlash: 0,
      seamFlash: 0
    };
    this.stats = {
      catches: 0,
      returns: 0,
      releases: 0,
      damage: 0,
      seams: 0,
      sourceHits: 0,
      fastestFall: 0,
      repaired: 0
    };
    this.metricsState = {
      maxRain: 0,
      maxCaught: 0,
      steps: 0,
      poolsRejected: 0
    };
    this.events.length = 0;
    this._emit('reset', { seed: this.seed });
  }

  start(atAct = 1) {
    if (this.mode === 'playing' && this.act === atAct) return;
    this.mode = 'playing';
    this.player.x = WIDTH * 0.5;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 225;
    this.player.panels = PLAYER.panels;
    this.worldLights = Math.max(0, Math.min(3, atAct - 1));
    this.repaired = [];
    for (let i = 1; i < atAct && i <= 3; i += 1) {
      this.repaired.push({ id: `wound-${i}`, act: i, x: WIDTH * 0.5, y: -1200 + i * 900 });
    }
    this._beginAct(atAct, true);
    this._emit('start', { act: atAct });
  }

  pause(paused = true) {
    if (paused && this.mode === 'playing') {
      this.mode = 'paused';
      this._emit('pause', {});
    } else if (!paused && this.mode === 'paused') {
      this.mode = 'playing';
      this._emit('resume', {});
    }
  }

  setInput(next = {}) {
    if (typeof next.hold === 'boolean') this.input.hold = next.hold;
    if (Number.isFinite(next.steer)) this.input.steer = clamp(next.steer, -1, 1);
  }

  clearInput({ preserveHold = false } = {}) {
    if (!preserveHold) this.input.hold = false;
    this.input.steer = 0;
  }

  step(dt = FIXED_STEP) {
    if (this.mode !== 'playing') return;
    const h = clamp(dt, 0, 1 / 20);
    this.metricsState.steps += 1;
    this.t += h;
    this.runTime += h;
    this.actTime += h;

    const p = this.player;
    p.invulnerable = Math.max(0, p.invulnerable - h);
    p.damageFlash = Math.max(0, p.damageFlash - h * 2.8);
    p.seamFlash = Math.max(0, p.seamFlash - h * 3.4);

    const opening = this.input.hold;
    if (opening && !this.lastInput.hold) this._emit('open', { x: p.x, y: p.y });
    if (!opening && this.lastInput.hold) this._releaseCaught();

    const openTarget = opening ? 1 : 0;
    p.open = moveToward(p.open, openTarget, h * (opening ? PLAYER.openRate : PLAYER.closeRate));
    p.tilt = moveToward(p.tilt, this.input.steer, h * 6.8);

    const wind = this.windAt(p.y);
    const steerSpeed = lerp(PLAYER.closedSteer, PLAYER.openSteer, p.open);
    const steerAccel = lerp(PLAYER.closedAccel, PLAYER.openAccel, p.open);
    const targetVx = this.input.steer * steerSpeed;
    p.vx = moveToward(p.vx, targetVx, steerAccel * h);
    p.vx += wind * p.open * h * 0.46;
    p.vx *= Math.pow(p.open > 0.3 ? 0.995 : 0.998, h * 120);

    if (this.act === 4) {
      const targetRise = opening ? -735 : -285;
      p.vy = moveToward(p.vy, targetRise, (opening ? 1160 : 650) * h);
    } else {
      const targetFall = lerp(PLAYER.closedFall, PLAYER.openFall, p.open);
      p.vy = moveToward(p.vy, targetFall, lerp(920, 1680, p.open) * h);
    }

    p.x += p.vx * h;
    p.y += p.vy * h;
    this.stats.fastestFall = Math.max(this.stats.fastestFall, p.vy);

    const edge = 54 + p.open * 84;
    if (p.x < edge) {
      p.x = edge;
      p.vx = Math.max(34, Math.abs(p.vx) * 0.28);
      p.seamFlash = Math.max(p.seamFlash, 0.45);
    } else if (p.x > WIDTH - edge) {
      p.x = WIDTH - edge;
      p.vx = -Math.max(34, Math.abs(p.vx) * 0.28);
      p.seamFlash = Math.max(p.seamFlash, 0.45);
    }

    if (opening && this.act <= 3) {
      const load = this.caught.length / PLAYER.maxCaught;
      p.strain += h * (0.025 + load * 0.24 + Math.abs(wind) / 4200);
      if (p.strain >= 1) this._overload();
    } else {
      p.strain = Math.max(0, p.strain - h * 2.35);
    }

    this._updateSources(h);
    this._updateRain(h);
    this._resolveStormSeam(h);

    if (this.clearTimer > 0) {
      this.clearTimer -= h;
      if (this.clearTimer <= 0) {
        if (this.act < 3) this._beginAct(this.act + 1);
        else if (this.act === 3) this._beginAct(4);
      }
    }

    if (this.act === 4 && p.y <= this.finaleTop) {
      this.mode = 'victory';
      this._emit('victory', { time: this.runTime, damage: this.stats.damage });
    }

    this.metricsState.maxRain = Math.max(this.metricsState.maxRain, this.rain.length);
    this.metricsState.maxCaught = Math.max(this.metricsState.maxCaught, this.caught.length);
    this.lastInput.hold = this.input.hold;
    this.lastInput.steer = this.input.steer;
  }

  windAt(y = this.player.y) {
    if (this.act === 1 || this.act === 0) return 16 * Math.sin(this.t * 0.7 + y * 0.001);
    if (this.act === 2) {
      return 205 * Math.sin(this.t * 0.78 + y * 0.0021)
        + 62 * Math.sin(this.t * 1.83 - y * 0.004);
    }
    if (this.act === 3) {
      const wounded = this.sources[0] ? 1 - this.sources[0].hp / this.sources[0].maxHp : 1;
      return (230 + wounded * 125) * Math.sin(this.t * (0.72 + wounded * 0.25))
        + 78 * Math.sin(this.t * 2.1 + y * 0.003);
    }
    if (this.act === 4) return 88 * Math.sin(this.t * 0.52 + y * 0.0016);
    return 0;
  }

  restartAct() {
    const targetAct = clamp(this.act || 1, 1, 4);
    this.mode = 'playing';
    this.player.y = this.actStartY;
    this.player.x = WIDTH * 0.5;
    this.player.vx = 0;
    this.player.vy = targetAct === 4 ? -220 : 225;
    this.player.open = 0;
    this.player.strain = 0;
    this.player.panels = PLAYER.panels;
    this.player.invulnerable = 0.8;
    this.caught.length = 0;
    this.rain.length = 0;
    this.repaired = this.repaired.filter((entry) => entry.act < targetAct);
    this.worldLights = Math.max(0, targetAct - 1);
    this._beginAct(targetAct, true);
    this.lastInput.hold = this.input.hold;
    this._emit('restart', { act: targetAct });
  }

  loadScenario(id) {
    this.reset();
    if (id === 'return' || id === 'return-collapse' || id === 'mixed-owner') {
      this.start(1);
      this.sources[0].x = WIDTH * 0.5 - 150;
      this.sources[0].y = -250;
      this.sources[0].hp = this.sources[0].maxHp = 2;
      if (id === 'return-collapse') this.sources[0].hp = this.sources[0].maxHp = 1;
      this.rain.length = 0;
      this.player.y = 0;
      this.player.open = 1;
      const first = this._spawnRain(this.sources[0], {
        x: this.player.x - 20,
        y: this.player.y - PLAYER.canopyOffset,
        vx: 0,
        vy: 0,
        lethal: true
      });
      first.history = [
        { x: this.sources[0].x, y: this.sources[0].y },
        { x: this.player.x - 20, y: this.player.y - 160 }
      ];
      if (id === 'mixed-owner') {
        const secondSource = this._makeSource({
          act: 9,
          x: WIDTH * 0.5 + 190,
          y: -240,
          hp: 2,
          fireEvery: 99,
          scale: 0.75
        });
        this.sources.push(secondSource);
        const second = this._spawnRain(secondSource, {
          x: this.player.x + 24,
          y: this.player.y - PLAYER.canopyOffset,
          vx: 0,
          vy: 0,
          lethal: true
        });
        second.history = [
          { x: secondSource.x, y: secondSource.y },
          { x: this.player.x + 24, y: this.player.y - 160 }
        ];
      }
      this.setInput({ hold: true, steer: 0 });
      this.lastInput.hold = true;
      return;
    }
    if (id === 'finale') {
      this.start(3);
      this.repaired = [
        { id: 'wound-1', act: 1, x: 360, y: -1800 },
        { id: 'wound-2', act: 2, x: 570, y: -900 },
        { id: 'wound-3', act: 3, x: 450, y: 0 }
      ];
      this.worldLights = 3;
      this._beginAct(4, true);
      return;
    }
    this.start(clamp(Number(id) || 1, 1, 4));
  }

  snapshot() {
    const source = this.sources[0];
    return Object.freeze({
      build: 'falling-open-1.0.0',
      mode: this.mode,
      act: this.act,
      time: round(this.runTime, 2),
      player: Object.freeze({
        x: round(this.player.x),
        y: round(this.player.y),
        vx: round(this.player.vx),
        vy: round(this.player.vy),
        open: round(this.player.open),
        panels: this.player.panels,
        strain: round(this.player.strain)
      }),
      source: source ? Object.freeze({
        id: source.id,
        hp: source.hp,
        maxHp: source.maxHp,
        active: source.active,
        x: round(source.x),
        y: round(source.y)
      }) : null,
      rain: this.rain.filter((drop) => !drop.dead).length,
      caught: this.caught.length,
      repaired: this.worldLights,
      stats: Object.freeze({ ...this.stats })
    });
  }

  stateHash() {
    const compact = {
      mode: this.mode,
      act: this.act,
      t: round(this.t),
      p: [round(this.player.x), round(this.player.y), round(this.player.vx), round(this.player.vy), round(this.player.open), this.player.panels],
      s: this.sources.map((source) => [source.id, source.hp, round(source.x), round(source.y), source.active]),
      r: this.rain.filter((drop) => !drop.dead).map((drop) => [drop.id, drop.ownerId, drop.state, round(drop.x), round(drop.y)]),
      c: this.caught.map((drop) => drop.ownerId),
      l: this.worldLights,
      rng: this.gameplayRng.state
    };
    return hashString(JSON.stringify(compact));
  }

  metrics() {
    return Object.freeze({
      ...this.metricsState,
      activeRain: this.rain.filter((drop) => !drop.dead).length,
      caught: this.caught.length,
      eventCount: this.events.length
    });
  }

  eventsSince(sequence = 0) {
    return this.events.filter((event) => event.seq > sequence).map((event) => Object.freeze({ ...event }));
  }

  _beginAct(act, keepPosition = false) {
    this.act = act;
    this.actTime = 0;
    this.clearTimer = 0;
    this.seamEngaged = false;
    this.rain.length = 0;
    this.caught.length = 0;
    this.sources.length = 0;
    this.player.strain = 0;
    this.player.invulnerable = Math.max(this.player.invulnerable, 0.45);
    if (!keepPosition) this.player.y += 90;
    this.actStartY = this.player.y;
    this.gameplayRng = new RNG((this.seed + act * 0x9e3779b9) >>> 0);

    if (act >= 1 && act <= 3) {
      const config = ACTS[act];
      const source = this._makeSource({
        act,
        x: act === 2 ? 330 : WIDTH * 0.5,
        y: this.player.y - config.sourceGap,
        hp: config.hp,
        fireEvery: config.fireEvery,
        scale: config.sourceScale
      });
      this.sources.push(source);
      this._emit('act', { act, plate: config.plate, sourceId: source.id });
    } else if (act === 4) {
      this.player.vy = -235;
      this.player.open = 0;
      const ascentStart = this.player.y;
      const finaleOrder = [...this.repaired].sort((a, b) => b.act - a.act);
      finaleOrder.forEach((entry, index) => {
        entry.y = ascentStart - 1200 - index * 1900;
      });
      this.finaleTop = ascentStart - 6800;
      this._emit('reverse', { top: this.finaleTop });
    }
  }

  _makeSource({ act, x, y, hp, fireEvery, scale }) {
    this.sourceSerial += 1;
    return {
      id: act <= 3 ? `wound-${act}` : `test-wound-${this.sourceSerial}`,
      act,
      x,
      baseX: x,
      y,
      baseY: y,
      hp,
      maxHp: hp,
      active: true,
      fireEvery,
      fireTimer: act === 1 ? 0.7 : 0.35,
      shot: 0,
      scale,
      hitFlash: 0,
      collapseT: 0
    };
  }

  _updateSources(dt) {
    for (const source of this.sources) {
      source.hitFlash = Math.max(0, source.hitFlash - dt * 4.2);
      if (!source.active) {
        source.collapseT += dt;
        continue;
      }

      if (source.act === 2) {
        source.x = source.baseX + 195 * Math.sin(this.t * 0.62);
        source.y = source.baseY + 30 * Math.sin(this.t * 1.05);
      } else if (source.act === 3) {
        const hurt = 1 - source.hp / source.maxHp;
        source.x = source.baseX + (105 + hurt * 82) * Math.sin(this.t * (0.42 + hurt * 0.18));
        source.y = source.baseY + 46 * Math.sin(this.t * 0.76);
      }

      source.fireTimer -= dt;
      if (source.fireTimer <= 0) {
        this._fire(source);
        source.shot += 1;
        const hurt = 1 - source.hp / source.maxHp;
        source.fireTimer += Math.max(0.19, source.fireEvery * (1 - hurt * 0.23));
      }
    }
  }

  _fire(source) {
    if (!source.active) return;
    const openingGrace = source.act === 1 && this.actTime < 5.2;
    if (source.act === 1) {
      const lane = ((source.shot % 7) - 3) * 64;
      this._spawnRain(source, {
        x: clamp(source.x + lane, 80, WIDTH - 80),
        y: source.y + 48,
        vx: Math.sin(source.shot * 1.7) * 22,
        vy: 690 + (source.shot % 3) * 48,
        lethal: !openingGrace
      });
      return;
    }

    if (source.act === 2) {
      const side = source.shot % 2 ? 1 : -1;
      const burst = source.shot % 4 === 0 ? 3 : 1;
      for (let i = 0; i < burst; i += 1) {
        this._spawnRain(source, {
          x: source.x + (i - (burst - 1) / 2) * 38,
          y: source.y + 52,
          vx: side * (112 + i * 34) + this.windAt(source.y) * 0.17,
          vy: 650 + i * 60,
          lethal: true
        });
      }
      return;
    }

    const hurt = 1 - source.hp / source.maxHp;
    const phrase = source.shot % 6;
    if (phrase === 0 || phrase === 3) {
      const count = hurt > 0.55 ? 7 : 5;
      for (let i = 0; i < count; i += 1) {
        const f = count === 1 ? 0 : i / (count - 1);
        this._spawnRain(source, {
          x: source.x + (f - 0.5) * 82,
          y: source.y + 65,
          vx: lerp(-235, 235, f),
          vy: 620 + 160 * Math.sin(f * Math.PI),
          lethal: true
        });
      }
    } else {
      const aim = clamp((this.player.x - source.x) * 0.28, -190, 190);
      this._spawnRain(source, {
        x: source.x,
        y: source.y + 58,
        vx: aim + 105 * Math.sin(source.shot * 1.31),
        vy: 760 + hurt * 80,
        lethal: true
      });
    }
  }

  _spawnRain(source, options = {}) {
    if (this.rain.length >= 260) {
      this.metricsState.poolsRejected += 1;
      return { dead: true, history: [] };
    }
    this.rainSerial += 1;
    const drop = {
      id: this.rainSerial,
      ownerId: source.id,
      state: 'live',
      x: options.x ?? source.x,
      y: options.y ?? source.y,
      px: options.x ?? source.x,
      py: options.y ?? source.y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 300,
      lethal: options.lethal !== false,
      dead: false,
      age: 0,
      sampleTimer: 0,
      history: [{ x: options.x ?? source.x, y: options.y ?? source.y }],
      returnPath: null,
      returnT: 0,
      collapseT: 0,
      collapseFrom: null
    };
    this.rain.push(drop);
    return drop;
  }

  _updateRain(dt) {
    const p = this.player;
    const canopyDirection = this.act === 4 ? 1 : -1;
    const canopy = {
      x: p.x + p.tilt * 16 * p.open,
      y: p.y + canopyDirection * PLAYER.canopyOffset,
      rx: PLAYER.canopyX * Math.max(0.12, p.open),
      ry: PLAYER.canopyY * Math.max(0.18, p.open)
    };

    for (const drop of this.rain) {
      if (drop.dead) continue;
      drop.age += dt;
      drop.px = drop.x;
      drop.py = drop.y;

      if (drop.state === 'live') {
        drop.vx += this.windAt(drop.y) * dt * 0.045;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.sampleTimer -= dt;
        if (drop.sampleTimer <= 0) {
          drop.sampleTimer += 0.035;
          drop.history.push({ x: drop.x, y: drop.y });
          if (drop.history.length > 68) drop.history.shift();
        }

        if (p.open > 0.62 && this.act <= 3) {
          const dx = (drop.x - canopy.x) / canopy.rx;
          const dy = (drop.y - canopy.y) / canopy.ry;
          if (dx * dx + dy * dy <= 1 && drop.y <= p.y + 2) {
            if (this.caught.length < PLAYER.maxCaught) {
              this._catch(drop);
              continue;
            }
            const side = Math.sign(drop.x - canopy.x) || (drop.id % 2 ? 1 : -1);
            drop.vx += side * 210;
            drop.y = canopy.y + 4;
            this._emit('spill', { x: drop.x, y: drop.y, ownerId: drop.ownerId });
          }
        }

        const bodyDistance = Math.hypot(drop.x - p.x, drop.y - p.y);
        if (drop.lethal && bodyDistance < PLAYER.bodyRadius + 7) {
          drop.dead = true;
          this._damage('rain');
          continue;
        }

        if (drop.y > p.y + HEIGHT * 0.78 || drop.y < p.y - HEIGHT * 0.78 || drop.x < -180 || drop.x > WIDTH + 180) {
          drop.dead = true;
        }
      } else if (drop.state === 'returning') {
        const rewindDrive = 0.14 + (1 - p.open) * 0.86;
        drop.returnT += dt / 0.52 * rewindDrive;
        const owner = this.sources.find((source) => source.id === drop.ownerId);
        if (owner && drop.returnPath && drop.returnPath.length) {
          const point = pathPoint(drop.returnPath, drop.returnT);
          const bend = Math.sin(clamp(drop.returnT, 0, 1) * Math.PI) * 18 * (drop.id % 2 ? 1 : -1);
          drop.x = point.x + bend;
          drop.y = point.y;
          if (drop.returnT > 0.82) {
            const f = (drop.returnT - 0.82) / 0.18;
            drop.x = lerp(drop.x, owner.x, f);
            drop.y = lerp(drop.y, owner.y, f);
          }
        }
        if (!owner || !owner.active) {
          drop.dead = true;
        } else if (drop.returnT >= 1) {
          drop.dead = true;
          this._hitSource(owner, 1, drop);
        }
      } else if (drop.state === 'collapsing') {
        drop.collapseT += dt / 0.48;
        const owner = this.sources.find((source) => source.id === drop.ownerId);
        if (!owner) {
          drop.dead = true;
          continue;
        }
        const from = drop.collapseFrom || { x: drop.x, y: drop.y };
        const f = clamp(drop.collapseT, 0, 1);
        const curl = Math.sin(f * Math.PI) * (drop.id % 2 ? 34 : -34);
        drop.x = lerp(from.x, owner.x, f) + curl;
        drop.y = lerp(from.y, owner.y, f);
        if (f >= 1) drop.dead = true;
      }
    }

    if (this.rain.length > 320 || this.metricsState.steps % 120 === 0) {
      this.rain = this.rain.filter((drop) => !drop.dead);
    }
  }

  _catch(drop) {
    drop.dead = true;
    const path = drop.history.map((point) => ({ x: point.x, y: point.y }));
    path.push({ x: drop.x, y: drop.y });
    this.caught.push({
      ownerId: drop.ownerId,
      path,
      x: drop.x,
      y: drop.y,
      lethal: drop.lethal
    });
    this.stats.catches += 1;
    this._emit('catch', {
      x: drop.x,
      y: drop.y,
      ownerId: drop.ownerId,
      count: this.caught.length
    });
  }

  _releaseCaught() {
    this.stats.releases += 1;
    if (!this.caught.length) {
      this._emit('close', { x: this.player.x, y: this.player.y, count: 0 });
      return;
    }
    const count = this.caught.length;
    for (let i = 0; i < this.caught.length; i += 1) {
      const caught = this.caught[i];
      const reverse = caught.path.slice().reverse();
      reverse.unshift({
        x: this.player.x + (i - (count - 1) / 2) * 12,
        y: this.player.y - PLAYER.canopyOffset
      });
      this.rainSerial += 1;
      this.rain.push({
        id: this.rainSerial,
        ownerId: caught.ownerId,
        state: 'returning',
        x: reverse[0].x,
        y: reverse[0].y,
        px: reverse[0].x,
        py: reverse[0].y,
        vx: 0,
        vy: 0,
        lethal: false,
        dead: false,
        age: 0,
        sampleTimer: 0,
        history: [],
        returnPath: reverse,
        returnT: -i * 0.045,
        collapseT: 0,
        collapseFrom: null
      });
      this.stats.returns += 1;
    }
    this.caught.length = 0;
    this.player.strain *= 0.72;
    this.player.vy += 42;
    this._emit('release', { x: this.player.x, y: this.player.y, count });
  }

  _hitSource(source, amount, drop) {
    if (!source.active) return;
    source.hp = Math.max(0, source.hp - amount);
    source.hitFlash = 1;
    this.stats.sourceHits += amount;
    this._emit('source-hit', {
      sourceId: source.id,
      x: source.x,
      y: source.y,
      hp: source.hp,
      maxHp: source.maxHp,
      dropId: drop.id
    });
    if (source.hp <= 0) this._collapseSource(source);
  }

  _collapseSource(source) {
    if (!source.active) return;
    source.active = false;
    source.collapseT = 0;
    this.worldLights = Math.min(3, this.worldLights + 1);
    this.stats.repaired += 1;
    this.repaired.push({ id: source.id, act: source.act, x: source.x, y: source.y });
    for (const drop of this.rain) {
      if (drop.dead || drop.ownerId !== source.id) continue;
      if (drop.state === 'live') {
        drop.state = 'collapsing';
        drop.lethal = false;
        drop.collapseT = 0;
        drop.collapseFrom = { x: drop.x, y: drop.y };
      } else if (drop.state === 'returning') {
        drop.dead = true;
      }
    }
    this.caught = this.caught.filter((drop) => drop.ownerId !== source.id);
    this.clearTimer = 1.55;
    this._emit('source-collapse', {
      sourceId: source.id,
      act: source.act,
      x: source.x,
      y: source.y,
      lights: this.worldLights
    });
  }

  _overload() {
    if (this.player.invulnerable > 0) {
      this.player.strain = 0.72;
      return;
    }
    const lost = this.caught.length;
    this.caught.length = 0;
    this.player.strain = 0.18;
    this._emit('overload', { x: this.player.x, y: this.player.y, lost });
    this._damage('overload');
  }

  _damage(reason) {
    const p = this.player;
    if (p.invulnerable > 0 || this.mode !== 'playing') return;
    p.panels = Math.max(0, p.panels - 1);
    p.invulnerable = PLAYER.invulnerability;
    p.damageFlash = 1;
    p.vy = this.act === 4 ? Math.min(-90, p.vy * 0.25) : -105;
    p.vx *= -0.36;
    p.strain = 0;
    this.caught.length = 0;
    this.stats.damage += 1;
    for (const drop of this.rain) {
      if (drop.state === 'live' && Math.hypot(drop.x - p.x, drop.y - p.y) < 135) {
        drop.dead = true;
      }
    }
    this._emit('damage', { reason, panels: p.panels, x: p.x, y: p.y });
    if (p.panels <= 0) {
      this.mode = 'defeat';
      this._emit('defeat', { act: this.act, time: this.runTime });
    }
  }

  _resolveStormSeam(dt) {
    if (this.act < 1 || this.act > 3) return;
    const source = this.sources.find((candidate) => candidate.active);
    if (!source) return;
    const gate = ACTS[this.act].gateBelow;
    const gap = this.player.y - source.y;
    if (gap > gate) {
      const carry = gap - gate;
      source.y += carry;
      source.baseY += carry;
      if (!this.seamEngaged) {
        this.seamEngaged = true;
        this.player.seamFlash = 1;
        this.stats.seams += 1;
        this._emit('seam', { x: source.x, y: source.y, sourceId: source.id });
      }
    } else if (gap < gate - 165) {
      this.seamEngaged = false;
    }
  }

  _emit(type, data) {
    const event = Object.freeze({
      seq: ++this._eventSeq,
      type,
      t: this.t,
      ...data
    });
    this.events.push(event);
    if (this.events.length > 800) this.events.splice(0, this.events.length - 800);
  }
}

export function runSimulationSelfTest() {
  const checks = [];
  const assert = (condition, name) => {
    checks.push({ name, pass: Boolean(condition) });
    if (!condition) throw new Error(`Simulation self-test failed: ${name}`);
  };

  const single = new GameSim({ seed: 1337 });
  single.loadScenario('return');
  single.step(FIXED_STEP);
  assert(single.caught.length === 1, 'open canopy catches a live drop');
  const originalOwner = single.caught[0].ownerId;
  single.setInput({ hold: false });
  single.step(FIXED_STEP);
  assert(single.rain.some((drop) => drop.state === 'returning' && drop.ownerId === originalOwner), 'release creates one owner-stable return');
  const beforeHp = single.sources[0].hp;
  for (let i = 0; i < 90; i += 1) single.step(FIXED_STEP);
  assert(single.sources[0].hp === beforeHp - 1, 'return damages its exact owner once');

  const hesitant = new GameSim({ seed: 1337 });
  const committed = new GameSim({ seed: 1337 });
  for (const candidate of [hesitant, committed]) {
    candidate.loadScenario('return');
    candidate.step(FIXED_STEP);
    candidate.setInput({ hold: false });
    candidate.step(FIXED_STEP);
  }
  hesitant.setInput({ hold: true });
  for (let i = 0; i < 70; i += 1) {
    hesitant.step(FIXED_STEP);
    committed.step(FIXED_STEP);
  }
  assert(hesitant.sources[0].hp === 2, 'reopening early visibly stalls the rewind');
  assert(committed.sources[0].hp === 1, 'staying closed completes the committed return');

  const mixed = new GameSim({ seed: 99 });
  mixed.loadScenario('mixed-owner');
  mixed.step(FIXED_STEP);
  assert(mixed.caught.length === 2, 'mixed-owner canopy can hold two provenances');
  const ids = mixed.caught.map((drop) => drop.ownerId).sort();
  mixed.setInput({ hold: false });
  mixed.step(FIXED_STEP);
  assert(mixed.rain.filter((drop) => drop.state === 'returning').map((drop) => drop.ownerId).sort().join('|') === ids.join('|'), 'mixed-owner release preserves both owners');

  const collapse = new GameSim({ seed: 11 });
  collapse.loadScenario('mixed-owner');
  collapse.step(FIXED_STEP);
  collapse.sources[0].hp = 1;
  collapse._collapseSource(collapse.sources[0]);
  assert(collapse.sources[1].active, 'collapsing one owner does not kill another');
  assert(collapse.rain.filter((drop) => drop.ownerId === collapse.sources[0].id).every((drop) => drop.dead || drop.state === 'collapsing'), 'collapsed owner leaves no live lethal rain');

  const finale = new GameSim({ seed: 55 });
  finale.loadScenario('finale');
  const y0 = finale.player.y;
  finale.setInput({ hold: true, steer: 1 });
  for (let i = 0; i < 120; i += 1) finale.step(FIXED_STEP);
  assert(finale.player.y < y0, 'finale reverses vertical travel');
  assert(finale.player.x > WIDTH * 0.5, 'finale preserves horizontal control direction');

  const deterministicA = new GameSim({ seed: 321 });
  const deterministicB = new GameSim({ seed: 321 });
  deterministicA.start(2);
  deterministicB.start(2);
  for (let i = 0; i < 300; i += 1) {
    const input = { hold: (i % 80) < 45, steer: Math.sin(i * 0.07) };
    deterministicA.setInput(input);
    deterministicB.setInput(input);
    deterministicA.step(FIXED_STEP);
    deterministicB.step(FIXED_STEP);
  }
  assert(deterministicA.stateHash() === deterministicB.stateHash(), 'same seed and input produce the same state hash');

  return Object.freeze({ pass: checks.every((check) => check.pass), checks: Object.freeze(checks) });
}
