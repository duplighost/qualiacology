(() => {
  'use strict';

const VERSION = '1.2.1-release';
  const W = 720;
  const H = 1080;
  const TAU = Math.PI * 2;
  const STEP = 1 / 120;
  const MAX_ZONES = 6;
  const INTRO_DURATION = 2.4;
  const REENTRY_INTRO_DURATION = .82;
  const BOSS_DEATH_DURATION = 3.2;
  const PASSAGE_DURATION = 4.2;
  const FOCUS_KEY_CODES = ['Space', 'KeyZ'];
  const PLAYER_MAX_HEALTH = 5;
  const FIELD_ENEMY_HP_SCALE = .84;
  const BOSS_HP_SCALE = .9;
  const ENEMY_FIRE_INTERVAL_SCALE = 1.12;
  const BOSS_FIRE_INTERVAL_SCALE = 1.08;
  const HIT_RECOVERY_DURATION = 2.45;
  const HIT_CLEAR_RADIUS = 155;
  const MUSIC_GAIN = .34;
  const MUSIC_VOICE_LIMIT = 24;
  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#game');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const scene = document.createElement('canvas');
  scene.width = W;
  scene.height = H;
  let g = scene.getContext('2d', { alpha: false });

  if (!ctx || !g) {
    $('#boot-error').textContent = 'RAIN ANIMAL could not create a 2D drawing surface.';
    return;
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
  const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const shortestAngle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const approach = (v, target, amount) => v < target ? Math.min(target, v + amount) : Math.max(target, v - amount);
  const fmt = (n) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
  const mixHexColor = (a, b, t) => {
    const channel = (hex, offset) => parseInt(hex.slice(offset, offset + 2), 16);
    const r = Math.round(lerp(channel(a, 1), channel(b, 1), t));
    const gg = Math.round(lerp(channel(a, 3), channel(b, 3), t));
    const bb = Math.round(lerp(channel(a, 5), channel(b, 5), t));
    return `rgb(${r} ${gg} ${bb})`;
  };

  // These collections are touched at 120 Hz. Rebuilding them with Array.filter
  // produces a steady stream of short-lived arrays precisely when dense play
  // needs predictable frame pacing. Stable in-place compaction preserves order
  // and object identity while producing no garbage.
  function compactNotDead(list) {
    let write = 0;
    for (let read = 0; read < list.length; read++) {
      const value = list[read];
      if (!value.dead) list[write++] = value;
    }
    list.length = write;
  }

  function compactPositiveLife(list) {
    let write = 0;
    for (let read = 0; read < list.length; read++) {
      const value = list[read];
      if (value.life > 0) list[write++] = value;
    }
    list.length = write;
  }

  function compactTelegraphs(list) {
    let write = 0;
    for (let read = 0; read < list.length; read++) {
      const value = list[read];
      if (value.life > 0 && !value.source?.dead) list[write++] = value;
    }
    list.length = write;
  }

  function relativeSegmentDistanceSquared(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const den = dx * dx + dy * dy;
    if (den < 1e-8) return ax * ax + ay * ay;
    const t = clamp(-(ax * dx + ay * dy) / den, 0, 1);
    const x = ax + dx * t;
    const y = ay + dy * t;
    return x * x + y * y;
  }

  function segmentIntersection(ax, ay, bx, by, cx, cy, dx, dy) {
    const rX = bx - ax, rY = by - ay, sX = dx - cx, sY = dy - cy;
    const den = rX * sY - rY * sX;
    if (Math.abs(den) < 1e-7) return null;
    const qx = cx - ax, qy = cy - ay;
    const t = (qx * sY - qy * sX) / den;
    const u = (qx * rY - qy * rX) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { x: ax + rX * t, y: ay + rY * t, t, u };
  }

  function pointSegmentDistanceSquared(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const den = dx * dx + dy * dy;
    if (den < 1e-8) return dist2(px, py, ax, ay);
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / den, 0, 1);
    return dist2(px, py, ax + dx * t, ay + dy * t);
  }

  function segmentDistanceSquared(ax, ay, bx, by, cx, cy, dx, dy) {
    if (segmentIntersection(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
    return Math.min(
      pointSegmentDistanceSquared(ax, ay, cx, cy, dx, dy), pointSegmentDistanceSquared(bx, by, cx, cy, dx, dy),
      pointSegmentDistanceSquared(cx, cy, ax, ay, bx, by), pointSegmentDistanceSquared(dx, dy, ax, ay, bx, by)
    );
  }

  class RNG {
    constructor(seed = 0x9e3779b9) { this.s = (seed >>> 0) || 1; }
    next() {
      let x = this.s;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      this.s = x >>> 0;
      return this.s / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return Math.floor(this.range(a, b + 1)); }
    sign() { return this.next() < .5 ? -1 : 1; }
  }

  const query = new URLSearchParams(location.search);
  const qaMode = query.get('qa') === '1';
  const initialSeed = qaMode ? (Number(query.get('seed')) || 260826) : 260826;
  let logicRng = new RNG(initialSeed);
  let visualRng = new RNG(initialSeed ^ 0xa5a5a5a5);

  const palettes = [
    { sky0: '#091326', sky1: '#18384b', sky2: '#eebf86', deep: '#07111e', bone: '#f3ead3', rain: '#b9f1f4', gold: '#ffca70', coral: '#ff746b', hostile: '#ff806d', hostile2: '#ffd083', player: '#c9fbff', leaf: '#7ad5b2' },
    { sky0: '#122219', sky1: '#405b3d', sky2: '#e7c67b', deep: '#101c18', bone: '#f3e6bc', rain: '#d6fff0', gold: '#ffd36d', coral: '#ff746b', hostile: '#ff7b69', hostile2: '#ffd074', player: '#d9ffff', leaf: '#82d68c' },
    { sky0: '#4a2025', sky1: '#b25342', sky2: '#e7bf84', deep: '#160f19', bone: '#f4e3be', rain: '#d9f6ef', gold: '#ffd06a', coral: '#ff665d', hostile: '#ff6c62', hostile2: '#ffe079', player: '#d7ffff', leaf: '#bcce74' },
    { sky0: '#08242d', sky1: '#17636a', sky2: '#b6dfca', deep: '#06161f', bone: '#e8f1d2', rain: '#cfffff', gold: '#f4d178', coral: '#ff736b', hostile: '#ff786e', hostile2: '#f6d681', player: '#d7ffff', leaf: '#6fd0bb' },
    { sky0: '#111422', sky1: '#343245', sky2: '#d48c6d', deep: '#080b14', bone: '#ece4cf', rain: '#c6f2ff', gold: '#ffc96b', coral: '#ff6e62', hostile: '#ff7467', hostile2: '#ffd27a', player: '#d7fbff', leaf: '#75c6a0' },
    { sky0: '#197fc1', sky1: '#69bee2', sky2: '#ffd4a0', deep: '#114469', bone: '#fff3d5', rain: '#e7ffff', gold: '#ffd171', coral: '#f45351', hostile: '#f55f58', hostile2: '#ffcd68', player: '#f2ffff', leaf: '#8ad5c0' }
  ];

  // The collision core stays consistent across the voyage; the visible shell
  // changes material with the place. That preserves learned dodge judgment
  // while preventing six alien biomes from firing the same coral jewellery.
  const hostileTokens = Object.freeze({ danger: '#ff655f', ink: '#17111f', warning: '#fff0c9' });
  const projectileMaterials = Object.freeze([
    Object.freeze({ primary: '#ff806d', edge: '#baf4f5', accent: '#ffd083', core: '#3d1b27' }),
    Object.freeze({ primary: '#dff08a', edge: '#efffd1', accent: '#ffbd70', core: '#283124' }),
    Object.freeze({ primary: '#f1e4c7', edge: '#fff8dc', accent: '#ff675e', core: '#4a1d28' }),
    Object.freeze({ primary: '#ff91ad', edge: '#b9fff1', accent: '#f5d37f', core: '#25203b' }),
    Object.freeze({ primary: '#ff985c', edge: '#bcefff', accent: '#ffc45f', core: '#11192b' }),
    Object.freeze({ primary: '#ff647d', edge: '#e9ffff', accent: '#ffd270', core: '#123653' })
  ]);

  const zones = [{
    number: 'I', name: 'LOW TIDE UNDER HEAVEN', subtitle: 'The sea touches a sleeping god.', boss: 'TRAWLMOTHER',
    duration: 68,
    waves: [
      // Three readable opening encounters: scouts + choir, a crosscurrent
      // that introduces the fence and ray separately, then one all-species
      // weather congregation. The old off-centre presets clamped bodies onto
      // each other and made the first twenty seconds look like unrelated
      // spawn demos.
      { t: 1.25, kind: 'kiteV', args: [4, 360] },
      { t: 4.75, kind: 'bellPair', args: [360] },
      { t: 9.25, kind: 'thimbles', args: [3, 1] },
      { t: 12.25, kind: 'rams', args: [1] },
      { t: 15.25, kind: 'kiteCross', args: [4] },
      { t: 20, kind: 'weatherMix', args: [] },
      { t: 29.5, kind: 'kiteV', args: [6, 360] },
      { t: 34.5, kind: 'rams', args: [2] },
      { t: 39, kind: 'thimbles', args: [4, -1] },
      { t: 44.5, kind: 'kiteCross', args: [6] },
      { t: 49, kind: 'weatherMix', args: [] },
      { t: 56, kind: 'bellPair', args: [540] },
      { t: 62, kind: 'weatherMix', args: [] }
    ]
  }, {
    number: 'II', name: 'THE HANGING ACRE', subtitle: 'Every harvest dreams of falling upward.', boss: 'THE HUNDRED-HAND GARDENER', duration: 62,
    waves: [
      // Three authored harvest sentences.  Each one adds a verb to the Acre's
      // updraft grammar instead of dumping another generic species preset.
      { t: 1, kind: 'acreMoths', args: [5, 1] },
      { t: 7, kind: 'acreBulbs', args: [2] },
      { t: 14, kind: 'acreHounds', args: [2] },

      { t: 22, kind: 'acreHands', args: [3, -1] },
      { t: 28, kind: 'acreMoths', args: [6, 1] },
      { t: 35, kind: 'acreBulbs', args: [3] },
      { t: 41, kind: 'acreHounds', args: [2] },

      { t: 48, kind: 'acreMix', args: [-1] },
      { t: 55, kind: 'acreMix', args: [1] }
    ]
  }, {
    number: 'III', name: 'SPINE COUNTRY', subtitle: 'A horizon can have a heartbeat.', boss: 'THE CATHEDRAL STAG', duration: 61,
    waves: [
      // I. GLASSBONE RAVINE — fast marrow fauna reveal the country.
      { t: 1.25, kind: 'spineSkates', args: [6, 1] },
      { t: 6.25, kind: 'spineTicks', args: [3] },
      { t: 11.5, kind: 'spineBanners', args: [2, -1] },

      // II. THE BONE NAVE — living arches enter, then the ecology gathers.
      { t: 18, kind: 'spineGates', args: [2] },
      { t: 23.5, kind: 'spineSkates', args: [8, -1] },
      { t: 29, kind: 'spineMix', args: [1] },

      // III. THE BEATING HORIZON — architecture becomes a procession.
      { t: 38.5, kind: 'spineBanners', args: [4, 1] },
      { t: 44.5, kind: 'spineGates', args: [3] },
      { t: 51.5, kind: 'spineMix', args: [-1] }
    ]
  }, {
    number: 'IV', name: 'THE LUNG SEA', subtitle: 'The world breathes. PETREL does not drift.', boss: 'THE NINE THROATS', duration: 63,
    waves: [
      // I. ALVEOLAR SHALLOWS
      { t: 1.25, kind: 'lungLeeches', args: [6, 1] },
      { t: 6.75, kind: 'lungWheels', args: [2] },
      { t: 12.5, kind: 'lungValves', args: [3] },

      // II. PRESSURE CHAMBER
      { t: 21, kind: 'lungPearls', args: [3] },
      { t: 27, kind: 'lungLeeches', args: [8, -1] },
      { t: 34, kind: 'lungWheels', args: [3] },
      { t: 40.5, kind: 'lungValves', args: [4] },

      // III. THE HELD BREATH
      { t: 48, kind: 'lungPearls', args: [4] },
      { t: 54, kind: 'lungMix', args: [1] }
    ]
  }, {
    number: 'V', name: 'THE BORROWED CITY', subtitle: 'It learned our streets incorrectly.', boss: 'THE BORROWED CITY', duration: 64,
    waves: [
      // I. FALSE UMBRELLA WEATHER
      { t: 1, kind: 'cityMites', args: [8] },
      { t: 6.5, kind: 'cityHerons', args: [3] },
      { t: 12.5, kind: 'citySignals', args: [4] },

      // II. RUSH-HOUR MOLT
      { t: 18.5, kind: 'cityTrams', args: [2, 1] },
      { t: 24, kind: 'cityMites', args: [10] },
      { t: 29.5, kind: 'citySignals', args: [5] },
      { t: 35, kind: 'cityHerons', args: [4] },

      // III. THE CITY STANDS UP
      { t: 41, kind: 'cityTrams', args: [3, -1] },
      { t: 46.5, kind: 'cityProcession', args: [-1] },
      { t: 53.5, kind: 'cityProcession', args: [1] },
      { t: 60, kind: 'cityMites', args: [8] }
    ]
  }, {
    number: 'VI', name: 'THE FIRST BLUE', subtitle: 'At last, the whole animal beneath you.', boss: 'THE CROWN LOUSE', duration: 58,
    waves: [
      // I. SKIN OF SKY
      { t: 1.15, kind: 'blueScriveners', args: [4, 1] },
      { t: 6.75, kind: 'blueShedlings', args: [6] },
      { t: 12.75, kind: 'blueBladders', args: [2] },

      // II. WEATHER LEARNS A BODY
      { t: 19.25, kind: 'blueThorns', args: [4, -1] },
      { t: 25.25, kind: 'blueScriveners', args: [6, -1] },
      { t: 31.75, kind: 'blueShedlings', args: [8] },
      { t: 37.5, kind: 'blueBladders', args: [3] },

      // III. THE WHOLE ANIMAL TURNS
      { t: 43, kind: 'blueThorns', args: [6, 1] },
      { t: 48.5, kind: 'blueClimax', args: [-1] }
    ]
  }];

  const bossConfigs = [{
    id: 'trawlmother', name: 'TRAWLMOTHER', hp: 3600, r: 92, phaseCount: 3,
    thresholds: [.66, .32], intro: 'THE HARBOR OPENS ITS MOUTH', defeat: 'THE ROOT PULLS TAUT',
    phases: ['THE DRAG', 'BELOW THE HARBOR', 'FEEDING WHEEL']
  }, {
    id: 'hundred-hand-gardener', name: 'THE HUNDRED-HAND GARDENER', hp: 4050, r: 98, phaseCount: 3,
    thresholds: [.66, .32], intro: 'THE ORCHARD GROWS A HAND', defeat: 'THE ACRE LETS GO',
    phases: ['SEED OF THE FALL', 'A THOUSAND SCISSORS', 'HARVEST UPWARD']
  }, {
    id: 'cathedral-stag', name: 'THE CATHEDRAL STAG', hp: 4350, r: 102, phaseCount: 3,
    thresholds: [.66, .32], intro: 'THE COUNTRY STANDS', defeat: 'THE BELL FINDS A BODY',
    phases: ['PROCESSIONAL RIBS', 'VESPER ANTLERS', 'HEART OF THE HORIZON']
  }, {
    id: 'nine-throats', name: 'THE NINE THROATS', hp: 4650, r: 106, phaseCount: 3,
    thresholds: [.66, .32], intro: 'THE SEA TAKES A BREATH', defeat: 'NINE VOICES BECOME ONE',
    phases: ['INHALE', 'VALVE PSALM', 'THE LAST EXHALE']
  }, {
    id: 'borrowed-city', name: 'THE BORROWED CITY', hp: 5350, r: 112, phaseCount: 4,
    thresholds: [.75, .5, .25], intro: 'THE CITY REMEMBERS YOUR SHAPE', defeat: 'THE STREETS RETURN THEIR NAMES',
    phases: ['BAD ADDRESS', 'RUSH HOUR MOLTS', 'THE CITY STANDS UP', 'LAST LIGHT IN EVERY ROOM']
  }, {
    id: 'crown-louse', name: 'THE CROWN LOUSE', hp: 6250, r: 108, phaseCount: 4,
    thresholds: [.75, .5, .25], intro: 'THE SKY SCRATCHES BACK', defeat: 'THE WEATHER IS ITS OWN',
    phases: ['HORIZON PARASITE', 'SUN-SKIN MOLTING', 'MIGRATION CROWN', 'THE FIRST BLUE']
  }];

  // Each passage keeps the same heartbeat, but changes its weather-instrument:
  // tide bells, hanging wood, bone percussion, breathing reeds, traffic relays,
  // then an exposed high sky. Bosses tighten the cadence without changing the
  // player's control rhythm.
  const musicThemes = [
    {
      roots: [55, 65.41, 73.42, 82.41], field: .285, boss: .235, bass: 'triangle', bassEvery: 4,
      accentEvery: 8, accentAt: 6, high: 3, slide: .96, drone: [2, 3], cutoff: 5200,
      voice: 'triangle', noteLength: .68, motif: [2, 0, 2.25, 0, 1.5, 0, 2.667, 0, 2, 0, 3, 0, 2.25, 0, 1.5, 0]
    }, {
      roots: [49, 58.27, 65.41, 77.78], field: .315, boss: .245, bass: 'sine', bassEvery: 6,
      accentEvery: 8, accentAt: 5, high: 2.5, slide: 1.04, drone: [2, 3.75], cutoff: 3100,
      voice: 'square', noteLength: .32, motif: [2, 0, 2.378, 1.5, 0, 2.667, 0, 1.782, 2, 0, 1.5, 0, 2.378, 0, 2.667, 0]
    }, {
      roots: [41.2, 51.91, 61.74, 69.3], field: .26, boss: .218, bass: 'sawtooth', bassEvery: 4,
      accentEvery: 6, accentAt: 3, high: 4, slide: .88, drone: [2, 3], cutoff: 1900,
      voice: 'triangle', noteLength: .24, motif: [0, 2, 0, 2.997, 1.5, 0, 2.378, 0, 0, 2.667, 0, 2, 1.782, 0, 2.997, 0]
    }, {
      roots: [46.25, 55, 61.74, 69.3], field: .325, boss: .252, bass: 'sine', bassEvery: 8,
      accentEvery: 10, accentAt: 7, high: 3, slide: 1.08, drone: [2, 2.67], cutoff: 2400,
      voice: 'sine', noteLength: 1.8, motif: [2, 0, 0, 0, 2.667, 0, 0, 0, 2.378, 0, 0, 0, 1.5, 0, 0, 0]
    }, {
      roots: [61.74, 69.3, 82.41, 92.5], field: .248, boss: .205, bass: 'square', bassEvery: 4,
      accentEvery: 7, accentAt: 4, high: 3.5, slide: 1, drone: [2, 3], cutoff: 6400,
      voice: 'square', noteLength: .2, motif: [2, 0, 2.378, 0, 2.997, 2.667, 0, 2.378, 2, 0, 1.5, 0, 2.378, 2.667, 0, 2.997]
    }, {
      roots: [73.42, 82.41, 98, 110], field: .305, boss: .228, bass: 'sine', bassEvery: 4,
      accentEvery: 8, accentAt: 2, high: 3, slide: 1.015, drone: [2, 4], cutoff: 7600,
      voice: 'sine', noteLength: .72, motif: [1.5, 0, 1.782, 0, 2, 0, 2.378, 0, 2.667, 0, 2.997, 0, 3.564, 0, 4, 0]
    }
  ];

  const save = loadSave();
  const settings = {
    muted: !!save.muted,
    reduced: !!save.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  function loadSave() {
    try {
      const parsed = JSON.parse(localStorage.getItem('rain-animal-save') || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
  }

  function writeSave() {
    try {
      save.best = Math.max(save.best || 0, world.score || 0);
      save.reached = Math.max(save.reached || 0, world.zone || 0);
      localStorage.setItem('rain-animal-save', JSON.stringify({
        muted: settings.muted,
        reduced: settings.reduced,
        best: save.best,
        reached: save.reached,
        cleared: !!save.cleared
      }));
    } catch (_) { /* play remains available without persistence */ }
  }

  class Sound {
    constructor() {
      this.ac = null;
      this.master = null;
      this.music = null;
      this.sfxBus = null;
      this.limiter = null;
      this.noiseBuffer = null;
      this.noiseCursor = 0;
      this.audioSeed = 0x51f15e5d;
      this.musicPanBuses = null;
      this.sfxPanBuses = null;
      this.musicNodes = new Set();
      this.nextBeat = 0;
      this.beat = 0;
    }
    async unlock(resync = false) {
      if (settings.muted) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      let schedulerChanged = false;
      if (!this.ac) {
        this.ac = new AudioContext();
        this.master = this.ac.createGain();
        this.master.gain.value = .42;
        this.master.connect(this.ac.destination);
        if (this.ac.createDynamicsCompressor) {
          this.limiter = this.ac.createDynamicsCompressor();
          this.limiter.threshold.value = -15;
          this.limiter.knee.value = 12;
          this.limiter.ratio.value = 5;
          this.limiter.attack.value = .006;
          this.limiter.release.value = .16;
          this.limiter.connect(this.master);
        }
        const mixTarget = this.limiter || this.master;
        this.music = this.ac.createGain();
        this.music.gain.value = MUSIC_GAIN;
        this.music.connect(mixTarget);
        this.sfxBus = this.ac.createGain();
        this.sfxBus.gain.value = .94;
        this.sfxBus.connect(mixTarget);
        if (this.ac.createStereoPanner) {
          const makePanBus = (pan, destination) => {
            const node = this.ac.createStereoPanner();
            node.pan.value = pan;
            node.connect(destination);
            return node;
          };
          this.musicPanBuses = [makePanBus(-.32, this.music), makePanBus(.32, this.music)];
          this.sfxPanBuses = [makePanBus(-.58, this.sfxBus), makePanBus(.58, this.sfxBus)];
        }
        this.buildNoiseBuffer();
        schedulerChanged = true;
      }
      if (this.ac.state === 'suspended') {
        await this.ac.resume().catch(() => {});
        schedulerChanged = true;
      }
      if (schedulerChanged || resync) this.nextBeat = this.ac.currentTime + .05;
    }
    setMuted(value) {
      settings.muted = value;
      if (this.master) this.master.gain.setTargetAtTime(value ? 0 : .42, this.ac.currentTime, .02);
      if (value) this.pauseMusic();
      writeSave();
    }
    buildNoiseBuffer() {
      if (!this.ac || this.noiseBuffer) return;
      const count = Math.ceil(this.ac.sampleRate * 1.1);
      const buffer = this.ac.createBuffer(1, count, this.ac.sampleRate);
      const data = buffer.getChannelData(0);
      let s = 0x31415926;
      for (let i = 0; i < count; i++) {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        data[i] = (s >>> 0) / 2147483648 - 1;
      }
      this.noiseBuffer = buffer;
    }
    variation() {
      let x = this.audioSeed;
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      this.audioSeed = x >>> 0;
      return this.audioSeed / 2147483648 - 1;
    }
    connectVoice(gain, destination, pan = 0) {
      const panBuses = destination === this.music ? this.musicPanBuses
        : destination === this.sfxBus ? this.sfxPanBuses : null;
      if (panBuses && Math.abs(pan) > .01) gain.connect(pan < 0 ? panBuses[0] : panBuses[1]);
      else gain.connect(destination);
    }
    trackVoiceNode(node, destination, cleanupNodes) {
      if (destination === this.music) this.musicNodes.add(node);
      node.addEventListener('ended', () => {
        this.musicNodes.delete(node);
        for (const cleanupNode of cleanupNodes) {
          try { cleanupNode.disconnect?.(); } catch (_) { /* already disconnected */ }
        }
      }, { once: true });
    }
    tone(freq, duration = .08, type = 'sine', volume = .12, slide = 1, destination = null, when = null, pan = 0) {
      if (!this.ac || settings.muted || this.ac.state !== 'running') return;
      const target = destination || this.sfxBus || this.master;
      if (target === this.music && this.musicNodes.size >= MUSIC_VOICE_LIMIT) return;
      const t = Math.max(this.ac.currentTime, when ?? this.ac.currentTime);
      const o = this.ac.createOscillator();
      const v = this.ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(20, freq), t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + duration);
      v.gain.setValueAtTime(.0001, t);
      v.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), t + .008);
      v.gain.exponentialRampToValueAtTime(.0001, t + duration);
      o.connect(v);
      this.connectVoice(v, target, pan);
      this.trackVoiceNode(o, target, [o, v]);
      o.start(t);
      o.stop(t + duration + .02);
    }
    noise(duration = .08, volume = .08, cutoff = 1000, destination = null, when = null, pan = 0) {
      if (!this.ac || settings.muted || this.ac.state !== 'running') return;
      this.buildNoiseBuffer();
      const target = destination || this.sfxBus || this.master;
      if (target === this.music && this.musicNodes.size >= MUSIC_VOICE_LIMIT) return;
      const t = Math.max(this.ac.currentTime, when ?? this.ac.currentTime);
      const src = this.ac.createBufferSource();
      const filter = this.ac.createBiquadFilter();
      const gain = this.ac.createGain();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      src.buffer = this.noiseBuffer;
      src.connect(filter); filter.connect(gain); this.connectVoice(gain, target, pan);
      this.trackVoiceNode(src, target, [src, filter, gain]);
      const available = Math.max(.01, 1.08 - Math.min(duration, 1));
      const offset = (this.noiseCursor++ * .137) % available;
      src.start(t, offset, Math.min(duration, 1));
      src.stop(t + duration + .02);
    }
    pauseMusic() {
      if (!this.ac || !this.music) return;
      const now = this.ac.currentTime;
      this.music.gain.cancelScheduledValues(now);
      this.music.gain.setValueAtTime(Math.max(.0001, this.music.gain.value), now);
      this.music.gain.linearRampToValueAtTime(.0001, now + .05);
      for (const node of this.musicNodes) {
        try { node.stop(now + .06); } catch (_) { /* already ended */ }
      }
      this.musicNodes.clear();
    }
    restartMusic(resetPhrase = false) {
      if (!this.ac || !this.music || this.ac.state !== 'running' || settings.muted) return;
      const now = this.ac.currentTime;
      for (const node of this.musicNodes) {
        try { node.stop(now + .04); } catch (_) { /* already ended */ }
      }
      this.musicNodes.clear();
      this.music.gain.cancelScheduledValues(now);
      this.music.gain.setValueAtTime(Math.max(.0001, this.music.gain.value), now);
      this.music.gain.linearRampToValueAtTime(.0001, now + .035);
      this.music.gain.setValueAtTime(.0001, now + .055);
      this.music.gain.linearRampToValueAtTime(MUSIC_GAIN, now + .18);
      if (resetPhrase) this.beat = 0;
      this.nextBeat = now + .08;
    }
    duckMusic(floor = .12, recovery = .42) {
      if (!this.ac || !this.music || this.ac.state !== 'running' || settings.muted) return;
      const now = this.ac.currentTime;
      this.music.gain.cancelScheduledValues(now);
      this.music.gain.setValueAtTime(Math.max(.0001, Math.min(MUSIC_GAIN, this.music.gain.value || MUSIC_GAIN)), now);
      this.music.gain.linearRampToValueAtTime(Math.max(.0001, floor), now + .025);
      this.music.gain.setTargetAtTime(MUSIC_GAIN, now + .04, Math.max(.05, recovery * .22));
    }
    sfx(name, x = W / 2, variant = 0) {
      const pan = clamp((x - W / 2) / (W / 2) * .7, -.7, .7);
      const tone = (freq, duration, type, volume, slide = 1, localPan = pan) => this.tone(freq, duration, type, volume, slide, this.sfxBus, null, localPan);
      const noise = (duration, volume, cutoff, localPan = pan) => this.noise(duration, volume, cutoff, this.sfxBus, null, localPan);
      const material = [
        [330, 'triangle', 2500], [285, 'square', 1900], [220, 'triangle', 1350],
        [260, 'sine', 1700], [390, 'square', 3600], [470, 'sine', 5200]
      ][world.zone] || [330, 'triangle', 2500];
      if (name === 'graze') tone(720 + (world.chain % 12) * 18, .05, 'sine', .044, 1.34);
      else if (name === 'hit') {
        tone(material[0] + (world.frame % 4) * 31, .042, material[1], .032, 1.46);
        if (world.frame % 4 === 0) noise(.026, .012, material[2]);
      }
      else if (name === 'pluck') { const n = 430 + (world.pluckChain % 9) * 42; tone(n, .07, 'triangle', .075, 1.8); tone(n * 2, .045, 'sine', .035, .75); }
      else if (name === 'livePluck') { const n = 620 + (world.pluckChain % 7) * 55; tone(n, .1, 'triangle', .12, 2.2); tone(n * 1.5, .08, 'sine', .07, .7); }
      else if (name === 'counterHit') { tone(235, .09, 'square', .045, 2.25); tone(940, .12, 'triangle', .06, .54); }
      else if (name === 'liveCounterHit') { tone(180, .14, 'square', .075, 3.1); tone(1280, .18, 'triangle', .09, .42); noise(.07, .03, 2100); this.duckMusic(.2, .22); }
      else if (name === 'shot') tone(410, .03, 'triangle', .02, 1.42, 0);
      else if (name === 'focusShot') tone(610, .038, 'sine', .023, 1.16, 0);
      else if (name === 'focusIn') { tone(360, .07, 'triangle', .035, 1.72, 0); tone(720, .05, 'sine', .018, .82, 0); }
      else if (name === 'focusOut') tone(520, .055, 'triangle', .025, .68, 0);
      else if (name === 'hurt') { tone(170, .35, 'square', .2, .32, 0); tone(92, .24, 'sine', .11, .58, 0); noise(.28, .16, 700, 0); this.duckMusic(.07, .62); }
      else if (name === 'kill') { const n = material[0] * .58 + this.variation() * 14; tone(n, .1, material[1], .06, .43); tone(n * 1.5, .055, 'sine', .026, 1.62); }
      else if (name === 'heavyKill') { const n = material[0] * .38 + this.variation() * 10; tone(n, .22, 'triangle', .1, .38); tone(n * 2, .13, material[1], .05, 1.76); noise(.13, .052, material[2]); }
      else if (name === 'shield') { tone(1240, .045, 'square', .036, .61); tone(540, .08, 'sine', .028, 1.32); }
      else if (name === 'phase') { tone(196, .58, 'sine', .14, 2.65, 0); tone(294, .68, 'triangle', .095, 2.08, 0); tone(588, .28, 'sine', .04, .72, 0); this.duckMusic(.11, .55); }
      else if (name === 'boss') { tone(55, 1.2, 'sawtooth', .16, .7, 0); tone(82.41, .9, 'triangle', .08, .82, 0); noise(.55, .1, 450, 0); this.duckMusic(.1, .7); }
      else if (name === 'bossDefeat') { tone(73.42, .72, 'sawtooth', .17, .34, 0); noise(.62, .13, 820, 0); tone(220, .9, 'triangle', .12, 2, 0); tone(330, 1.12, 'sine', .09, 2, 0); this.duckMusic(.055, .9); }
      else if (name === 'ending') {
        const roots = [293.66, 369.99, 440, 587.33, 739.99];
        const n = roots[clamp(variant, 0, roots.length - 1)];
        tone(n, .75, 'sine', .075, 1.002, 0); tone(n * 1.5, .9, 'triangle', .04, .998, 0);
      }
      else if (name === 'ready') { tone(560, .14, 'sine', .09, 1.5, 0); tone(840, .2, 'sine', .07, 1.1, 0); }
    }
    updateMusic() {
      if (!this.ac || settings.muted || this.ac.state !== 'running' || world.mode !== 'playing') return;
      const theme = musicThemes[world.zone] || musicThemes[0];
      const beatLength = world.boss ? theme.boss : theme.field;
      const now = this.ac.currentTime;
      if (this.nextBeat < now - beatLength * .75) this.nextBeat = now + .025;
      let scheduled = 0;
      while (this.nextBeat < now + .08 && scheduled < 2) {
        const when = this.nextBeat;
        const b = this.beat++;
        const root = theme.roots[Math.floor(b / 16) % theme.roots.length];
        const phaseOffset = world.boss ? (world.boss.phase - 1) * 2 : 0;
        const motif = theme.motif[(b + phaseOffset) % theme.motif.length];
        const relayPan = world.zone === 4 ? (b % 2 ? -.38 : .38) : world.zone === 1 ? (b % 4 < 2 ? -.16 : .16) : 0;
        if (b % theme.bassEvery === 0) this.tone(root, beatLength * .86, theme.bass, theme.bass === 'square' ? .045 : .076, theme.slide, this.music, when, 0);
        if (motif) this.tone(root * motif, beatLength * theme.noteLength, theme.voice, theme.voice === 'square' ? .019 : .028, theme.slide > 1 ? 1.012 : .994, this.music, when, relayPan);
        if (b % theme.accentEvery === theme.accentAt) this.tone(root * theme.high, beatLength * .48, 'sine', .038, .72, this.music, when, -relayPan);
        if (b % 2 === 1 && world.zone !== 3) this.noise(.02, world.zone === 2 || world.zone === 4 ? .013 : .009, theme.cutoff, this.music, when, relayPan);
        if (world.zone === 3 && b % 8 === 0) this.noise(beatLength * 2.2, .011, theme.cutoff, this.music, when, 0);
        if (world.boss && b % 4 === 2) this.tone(root * (world.boss.phase >= 3 ? 1.5 : 1), beatLength * 1.45, 'triangle', .031, .78, this.music, when, 0);
        if (b % 16 === 0) {
          this.tone(root * theme.drone[0], beatLength * 12, 'sine', .021, 1.12, this.music, when, -.12);
          this.tone(root * theme.drone[1], beatLength * 10, 'triangle', .015, .91, this.music, when, .12);
        }
        this.nextBeat += beatLength;
        scheduled++;
      }
      if (scheduled >= 2 && this.nextBeat < now) this.nextBeat = now + beatLength;
    }
    profile() {
      return {
        themes: musicThemes.length,
        musicGain: MUSIC_GAIN,
        musicVoiceLimit: MUSIC_VOICE_LIMIT,
        cachedNoise: !!this.noiseBuffer,
        lookahead: .08
      };
    }
  }
  const sound = new Sound();

  const input = {
    keys: new Set(), pointerId: null, pointerStartX: 0, pointerStartY: 0,
    playerStartX: W / 2, playerStartY: H * .82, targetX: W / 2, targetY: H * .82,
    pointerActive: false, focusPointer: false, focusPointerId: null,
    gamepadPrev: 0, gamepadState: null, touchMode: matchMedia('(pointer: coarse)').matches
  };

  let cssW = innerWidth;
  let cssH = innerHeight;
  let dpr = 1;
  let playRect = { x: 0, y: 0, w: W, h: H, scale: 1, scaleX: 1, scaleY: 1 };
  let ambientGradientCache = null;
  let ambientGradientWidth = 0;
  let ambientGradientHeight = 0;
  let ambientGradientPlayWidth = 0;
  let ambientGradientPlayHeight = 0;
  let ambientGradientSky1 = '';
  let ambientGradientSky0 = '';
  let ambientGradientDeep = '';

  const world = {
    mode: 'title', seed: initialSeed, zone: 0, zoneTime: 0, totalTime: 0,
    phase: 'field', waveIndex: 0, boss: null, bossIntro: 0, bossDeath: 0,
    transition: 0, titleTime: 0, introTime: 0, score: 0, chain: 0,
    chainTimer: 0, shake: 0, flash: 0, flashColor: '#ffffff', timeScale: 1,
    god: qaMode && query.get('god') === '1', manual: qaMode && query.get('manual') === '1',
    pausedByVisibility: false, frame: 0, stress: false, pluckChain: 0, pluckTimer: 0, hitSound: 0,
    grazeSound: 0, shieldSound: 0,
    endingTime: 0, endingCue: -1, droppedBullets: 0,
    launching: false, launchToken: 0
  };

  let player = makePlayer();
  let enemies = [];
  let enemyBullets = [];
  let playerBullets = [];
  let particles = [];
  let texts = [];
  let telegraphs = [];
  let counterNeedles = [];

  function makePlayer() {
    return {
      x: W / 2, y: H * .83, px: W / 2, py: H * .83, vx: 0, vy: 0,
      radius: 4.5, focus: false, shot: 0, health: PLAYER_MAX_HEALTH, maxHealth: PLAYER_MAX_HEALTH, invuln: 0, deathTimer: 0,
      wake: [], wakeEcho: [], wakeSample: 0, counterPulse: 0, grazePulse: 0,
      bank: 0, wing: 0, hitPulse: 0, dead: false,
      firePulse: 0, focusPulse: 0, clearPulse: 0, volleyIndex: 0, focusVolley: 0
    };
  }

  function resetArrays() {
    enemies = [];
    enemyBullets = [];
    playerBullets = [];
    particles = [];
    texts = [];
    telegraphs = [];
    counterNeedles = [];
  }

  function clearTransientInput() {
    try { if (input.pointerId !== null && canvas.hasPointerCapture?.(input.pointerId)) canvas.releasePointerCapture(input.pointerId); } catch (_) { /* capture already gone */ }
    try { if (input.focusPointerId !== null && canvas.hasPointerCapture?.(input.focusPointerId)) canvas.releasePointerCapture(input.focusPointerId); } catch (_) { /* capture already gone */ }
    try { if (input.focusPointerId !== null && $('#touch-focus').hasPointerCapture?.(input.focusPointerId)) $('#touch-focus').releasePointerCapture(input.focusPointerId); } catch (_) { /* capture already gone */ }
    input.keys.clear();
    input.pointerActive = false;
    input.pointerId = null;
    input.focusPointer = false;
    input.focusPointerId = null;
    input.gamepadState = null;
    const stick = $('#touch-stick');
    stick?.classList.remove('active');
    if (stick) {
      stick.style.left = '';
      stick.style.top = '';
      stick.style.bottom = '';
    }
    const knob = stick?.querySelector('i');
    if (knob) knob.style.transform = 'translate(0px, 0px)';
  }

  function resetRun(zone = 0, keepScore = false, reentry = false) {
    logicRng = new RNG(world.seed + zone * 9973);
    visualRng = new RNG((world.seed ^ 0xa5a5a5a5) + zone * 7919);
    resetArrays();
    bulletStampCache.clear();
    clearTransientInput();
    player = makePlayer();
    world.zone = clamp(zone, 0, zones.length - 1);
    world.zoneTime = 0;
    world.totalTime = 0;
    world.phase = 'field';
    world.waveIndex = 0;
    world.boss = null;
    world.bossIntro = 0;
    world.bossDeath = 0;
    world.transition = 0;
    world.introTime = reentry ? REENTRY_INTRO_DURATION : INTRO_DURATION;
    world.chain = 0;
    world.chainTimer = 0;
    world.pluckChain = 0;
    world.pluckTimer = 0;
    world.hitSound = 0;
    world.grazeSound = 0;
    world.shieldSound = 0;
    world.endingTime = 0;
    world.endingCue = -1;
    world.droppedBullets = 0;
    world.stress = false;
    world.pausedByVisibility = false;
    world.shake = 0;
    world.flash = 0;
    world.mode = 'playing';
    world.launching = false;
    world.frame = 0;
    if (!keepScore) world.score = 0;
    input.targetX = player.x;
    input.targetY = player.y;
    updatePanels();
    sound.unlock(true).then(() => { if (world.mode === 'playing') sound.restartMusic(true); });
  }

  function advanceZone() {
    const next = world.zone + 1;
    if (next >= MAX_ZONES) return;
    resetArrays();
    bulletStampCache.clear();
    logicRng = new RNG(world.seed + next * 9973);
    visualRng = new RNG((world.seed ^ 0xa5a5a5a5) + next * 7919);
    world.zone = next;
    world.zoneTime = 0;
    world.phase = 'field';
    world.waveIndex = 0;
    world.boss = null;
    world.bossIntro = 0;
    world.bossDeath = 0;
    world.transition = 0;
    world.stress = false;
    world.introTime = INTRO_DURATION;
    world.chain = 0;
    world.chainTimer = 0;
    world.pluckChain = 0;
    world.pluckTimer = 0;
    world.pausedByVisibility = false;
    player.health = Math.min(player.maxHealth, player.health + 1);
    player.invuln = Math.max(player.invuln, 1.5);
    player.dead = false;
    player.shot = 0;
    player.wake.length = 0;
    player.wakeEcho.length = 0;
    if (!input.pointerActive) {
      input.targetX = player.x;
      input.targetY = player.y;
    }
    save.reached = Math.max(save.reached || 0, next);
    writeSave();
    sound.restartMusic(true);
    sound.sfx('ready');
  }

  function startVoyage() {
    world.seed = initialSeed;
    resetRun(0, false);
  }

  function setLaunchStatus(message = '', failed = false) {
    const status = $('#launch-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('failed', failed);
  }

  async function launchPreparedRun(zone = 0, keepScore = false) {
    if (world.launching) return;
    const targetZone = clamp(Math.floor(Number(zone) || 0), 0, zones.length - 1);
    world.launching = true;
    const token = ++world.launchToken;
    const voyage = $('#voyage');
    const practice = $('#practice');
    voyage.disabled = true;
    practice.disabled = true;
    $('#title-screen')?.setAttribute('aria-busy', 'true');
    setLaunchStatus(`OPENING PASSAGE ${zones[targetZone].number}`);
    sound.unlock(true);
    const ready = await window.RAIN_ART?.decodeZoneArt?.(targetZone);
    if (token !== world.launchToken) return;
    $('#title-screen')?.removeAttribute('aria-busy');
    world.launching = false;
    if (!ready) {
      updatePanels();
      setLaunchStatus('THE PASSAGE DID NOT OPEN · TRY AGAIN', true);
      return;
    }
    setLaunchStatus('');
    if (targetZone === 0 && !keepScore) world.seed = initialSeed;
    resetRun(targetZone, keepScore);
  }

  function retryZone() {
    writeSave();
    const score = Math.floor(world.score * .72);
    resetRun(world.zone, true, true);
    world.score = score;
  }

  function backToTitle() {
    world.launchToken++;
    world.launching = false;
    writeSave();
    resetArrays();
    player = makePlayer();
    world.mode = 'title';
    world.zone = 0;
    world.zoneTime = 0;
    world.totalTime = 0;
    world.phase = 'field';
    world.waveIndex = 0;
    world.boss = null;
    world.bossIntro = 0;
    world.bossDeath = 0;
    world.transition = 0;
    world.endingTime = 0;
    world.endingCue = -1;
    world.introTime = 0;
    world.titleTime = 0;
    world.flash = 0;
    world.shake = 0;
    world.chain = 0;
    world.chainTimer = 0;
    world.pluckChain = 0;
    world.pluckTimer = 0;
    world.hitSound = 0;
    world.grazeSound = 0;
    world.shieldSound = 0;
    world.droppedBullets = 0;
    world.stress = false;
    world.pausedByVisibility = false;
    world.score = 0;
    clearTransientInput();
    sound.pauseMusic();
    updatePanels();
    $('#title-screen')?.removeAttribute('aria-busy');
    setLaunchStatus('');
  }

  function togglePause(force) {
    if (world.mode === 'playing') { world.mode = 'paused'; clearTransientInput(); sound.pauseMusic(); }
    else if (world.mode === 'paused' && force !== true) { world.mode = 'playing'; world.pausedByVisibility = false; }
    else return;
    updatePanels();
    if (world.mode === 'playing') sound.unlock(true).then(() => sound.restartMusic(false));
  }

  function updatePanels() {
    const titleOpen = world.mode === 'title';
    const pauseOpen = world.mode === 'paused';
    const endOpen = world.mode === 'gameover' || world.mode === 'victory';
    const setPanel = (selector, open) => {
      const panel = $(selector);
      panel.classList.toggle('open', open);
      panel.inert = !open;
      panel.setAttribute('aria-hidden', String(!open));
    };
    setPanel('#title-screen', titleOpen);
    setPanel('#pause-screen', pauseOpen);
    setPanel('#end-screen', endOpen);
    const endScreen = $('#end-screen');
    endScreen.classList.toggle('victory', world.mode === 'victory');
    endScreen.classList.toggle('defeat', world.mode === 'gameover');
    canvas.inert = world.mode !== 'playing';
    canvas.setAttribute('aria-hidden', String(world.mode !== 'playing'));
    $('#touch-ui').classList.toggle('playing', world.mode === 'playing');
    for (const selector of ['#audio-toggle', '#pause-audio-toggle']) {
      $(selector).textContent = settings.muted ? 'SOUND OFF' : 'SOUND ON';
      $(selector).setAttribute('aria-pressed', String(!settings.muted));
    }
    for (const selector of ['#effects-toggle', '#pause-effects-toggle']) {
      $(selector).textContent = settings.reduced ? 'CALM EFFECTS' : 'FULL EFFECTS';
      $(selector).setAttribute('aria-pressed', String(!settings.reduced));
    }
    const practice = $('#practice');
    $('#voyage').disabled = world.launching;
    const practiceZone = clamp(Number(save.reached) || 0, 0, zones.length - 1);
    practice.disabled = world.launching || practiceZone < 1;
    practice.textContent = practiceZone < 1 ? 'ZONE PRACTICE · LOCKED' : `PRACTICE ${zones[practiceZone].number} · ${zones[practiceZone].name}`;
    if (updatePanels.lastMode !== world.mode) {
      updatePanels.lastMode = world.mode;
      if (world.mode === 'playing') canvas.focus({ preventScroll: true });
      else if (world.mode === 'paused') $('#resume').focus({ preventScroll: true });
      else if (world.mode === 'gameover' || world.mode === 'victory') $('#retry').focus({ preventScroll: true });
      else if (world.mode === 'title') $('#voyage').focus({ preventScroll: true });
    }
  }

  function showEnd(victory) {
    if (victory) save.cleared = true;
    world.mode = victory ? 'victory' : 'gameover';
    sound.pauseMusic();
    $('#end-eyebrow').textContent = victory ? 'SIX PASSAGES HELD' : zones[world.zone].name;
    $('#end-title').textContent = victory ? 'THE ANIMAL WAKES' : 'THE RAIN CLOSES';
    $('#end-copy').textContent = victory
      ? `The Crown Louse is gone. Beneath PETREL, a continent-sized body takes its first unborrowed breath. Score ${fmt(world.score)}.`
      : `You reached ${fmt(world.score)}. The passage remembers your shape; re-entry is immediate.`;
    $('#retry').textContent = victory ? 'FLY IT AGAIN' : 'RE-ENTER PASSAGE';
    writeSave();
    updatePanels();
  }

  function mapPointer(clientX, clientY) {
    return {
      x: (clientX - playRect.x) / playRect.scaleX,
      y: (clientY - playRect.y) / playRect.scaleY
    };
  }

  function playerEdgeMargin() {
    // The collision core owns one invariant boundary. Wing art folds against
    // that boundary, but changing Focus must never move PETREL without input.
    return 36;
  }

  function lowTideCurrent() {
    if (world.mode !== 'playing' || world.zone !== 0 || world.phase === 'passage' || world.phase === 'ending') return 0;
    const progress = world.phase === 'field'
      ? clamp(world.zoneTime / Math.max(1, zones[0].duration), 0, 1)
      : 1;
    const strength = lerp(13, 36, ease(invLerp(.08, .78, progress)));
    const cadence = lerp(.58, .82, ease(progress));
    return Math.sin(world.totalTime * cadence + Math.sin(world.totalTime * .17) * .24) * strength;
  }

  function hangingAcreHarvestLift() {
    if (world.mode !== 'playing' || world.zone !== 1 || world.phase === 'passage' || world.phase === 'ending') return 0;
    const progress = world.phase === 'field'
      ? clamp(world.zoneTime / Math.max(1, zones[1].duration), 0, 1)
      : 1;
    const introduced = ease(invLerp(.035, .24, progress));
    const inhale = Math.max(0, Math.sin(world.totalTime * .72 - .9));
    return introduced * inhale * inhale;
  }

  function hangingAcreCurrent() {
    if (world.zone !== 1) return 0;
    const progress = world.phase === 'field'
      ? clamp(world.zoneTime / Math.max(1, zones[1].duration), 0, 1)
      : 1;
    return -lerp(24, 86, ease(progress)) * hangingAcreHarvestLift();
  }

  function glassboneHeartbeatCurrent() {
    if (world.mode !== 'playing' || world.zone !== 2 || world.phase !== 'field') return 0;
    const progress = clamp(world.zoneTime / Math.max(1, zones[2].duration), 0, 1);
    const awaken = ease(invLerp(.14, .34, progress));
    const release = 1 - ease(invLerp(.92, 1, progress));
    const strength = lerp(16, 38, ease(invLerp(.34, .82, progress))) * awaken * release;
    const cadence = lerp(.78, 1.06, ease(progress));
    return Math.sin(world.totalTime * cadence - .55) * strength;
  }

  const orbitNow = { x: 0, y: 0 };
  const orbitBefore = { x: 0, y: 0 };
  const orbitDelta = { x: 0, y: 0 };
  const orbitRender = { x: 0, y: 0 };

  function alveolarOrbitOffset(out, time = world.totalTime, zoneTime = world.zoneTime) {
    if (world.mode !== 'playing' || world.zone !== 3 || world.phase !== 'field') {
      out.x = 0; out.y = 0;
      return out;
    }
    const progress = clamp(zoneTime / Math.max(1, zones[3].duration), 0, 1);
    const awake = ease(invLerp(.06, .25, progress)) * (1 - ease(invLerp(.94, 1, progress)));
    const phase = time * 1.02;
    out.x = Math.sin(phase) * 22 * awake;
    out.y = Math.cos(phase) * 12 * awake;
    return out;
  }

  function alveolarOrbitDelta(dt) {
    alveolarOrbitOffset(orbitNow, world.totalTime, world.zoneTime);
    alveolarOrbitOffset(orbitBefore, world.totalTime - dt, world.zoneTime - dt);
    orbitDelta.x = orbitNow.x - orbitBefore.x;
    orbitDelta.y = orbitNow.y - orbitBefore.y;
    return orbitDelta;
  }

  function borrowedAddressOffset(time = world.totalTime, zoneTime = world.zoneTime) {
    if (world.mode !== 'playing' || world.zone !== 4 || world.phase !== 'field') return 0;
    const progress = clamp(zoneTime / Math.max(1, zones[4].duration), 0, 1);
    const awaken = ease(invLerp(.16, .58, progress));
    const settle = 1 - ease(invLerp(.94, 1, progress));
    const strength = 48 * awaken * settle;
    const beat = time / 4.8;
    const addresses = [-1, 0, 1, 0];
    const floorBeat = Math.floor(beat);
    const index = ((floorBeat % addresses.length) + addresses.length) % addresses.length;
    const local = beat - floorBeat;
    const relocation = ease(invLerp(.68, .9, local));
    return lerp(addresses[index], addresses[(index + 1) % addresses.length], relocation) * strength;
  }

  function borrowedAddressDelta(dt) {
    return borrowedAddressOffset(world.totalTime, world.zoneTime)
      - borrowedAddressOffset(world.totalTime - dt, world.zoneTime - dt);
  }

  function borrowedAddressVelocity() {
    const sample = 1 / 120;
    return (borrowedAddressOffset() - borrowedAddressOffset(world.totalTime - sample, world.zoneTime - sample)) / sample;
  }

  function firstBlueRollAngle(time = world.totalTime, zoneTime = world.zoneTime) {
    if (world.mode !== 'playing' || world.zone !== 5 || world.phase !== 'field') return 0;
    const progress = clamp(zoneTime / Math.max(1, zones[5].duration), 0, 1);
    const wake = ease(invLerp(.08, .25, progress));
    const crown = ease(invLerp(.58, .82, progress));
    const settle = 1 - ease(invLerp(.9, .99, progress));
    const amplitude = lerp(.035, .13, crown) * wake * settle;
    const phrase = time * .46 + Math.sin(time * .13) * .28;
    return Math.sin(phrase) * amplitude;
  }

  function firstBlueRollDelta(dt) {
    return firstBlueRollAngle(world.totalTime, world.zoneTime)
      - firstBlueRollAngle(world.totalTime - dt, world.zoneTime - dt);
  }

  const tickMotion = { currentX: 0, currentY: 0, orbitX: 0, orbitY: 0, cityShift: 0, blueRoll: 0 };

  function prepareTickMotion(dt) {
    tickMotion.currentX = 0;
    tickMotion.currentY = 0;
    tickMotion.orbitX = 0;
    tickMotion.orbitY = 0;
    tickMotion.cityShift = 0;
    tickMotion.blueRoll = 0;
    if (world.zone === 0) tickMotion.currentX = lowTideCurrent();
    else if (world.zone === 1) tickMotion.currentY = hangingAcreCurrent();
    else if (world.zone === 2) tickMotion.currentX = glassboneHeartbeatCurrent();
    else if (world.zone === 3) {
      const orbit = alveolarOrbitDelta(dt);
      tickMotion.orbitX = orbit.x;
      tickMotion.orbitY = orbit.y;
    } else if (world.zone === 4) tickMotion.cityShift = borrowedAddressDelta(dt);
    else if (world.zone === 5) tickMotion.blueRoll = firstBlueRollDelta(dt);
    return tickMotion;
  }

  function rollFirstBlueEnemy(e, angle) {
    if (!angle) return;
    const c = Math.cos(angle), s = Math.sin(angle);
    let dx = e.x - player.x, dy = e.y - player.y;
    e.x = player.x + dx * c - dy * s;
    e.y = player.y + dx * s + dy * c;
    dx = e.baseX - player.x; dy = e.baseY - player.y;
    e.baseX = player.x + dx * c - dy * s;
    e.baseY = player.y + dx * s + dy * c;
  }

  function rollFirstBlueBullet(b, angle) {
    if (!angle) return;
    const c = Math.cos(angle), s = Math.sin(angle);
    let dx = b.x - player.x, dy = b.y - player.y;
    b.x = player.x + dx * c - dy * s;
    b.y = player.y + dx * s + dy * c;
    dx = b.px - player.x; dy = b.py - player.y;
    b.px = player.x + dx * c - dy * s;
    b.py = player.y + dx * s + dy * c;
    const vx = b.vx, vy = b.vy;
    b.vx = vx * c - vy * s;
    b.vy = vx * s + vy * c;
    b.angle += angle;
    if (b.radial) {
      dx = b.radial.x - player.x; dy = b.radial.y - player.y;
      b.radial.x = player.x + dx * c - dy * s;
      b.radial.y = player.y + dx * s + dy * c;
    }
    if (b.dipole) {
      dx = b.dipole.x1 - player.x; dy = b.dipole.y1 - player.y;
      b.dipole.x1 = player.x + dx * c - dy * s;
      b.dipole.y1 = player.y + dx * s + dy * c;
      dx = b.dipole.x2 - player.x; dy = b.dipole.y2 - player.y;
      b.dipole.x2 = player.x + dx * c - dy * s;
      b.dipole.y2 = player.y + dx * s + dy * c;
    }
    if (b.refractX || b.refractY) {
      dx = b.refractX - player.x; dy = b.refractY - player.y;
      b.refractX = player.x + dx * c - dy * s;
      b.refractY = player.y + dx * s + dy * c;
    }
  }

  function resize() {
    cssW = Math.max(1, innerWidth);
    cssH = Math.max(1, innerHeight);
    dpr = clamp(devicePixelRatio || 1, 1, settings.reduced ? 1.25 : 1.75);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ambientGradientCache = null;
    const scale = Math.min(cssH / H, cssW / W);
    const baseWidth = W * scale;
    // A strict 2:3 simulation remains the collision authority, but a large
    // desktop should not present it as a phone-sized strip.  A bounded
    // horizontal optical expansion spends some of the otherwise dead gutters
    // on the live world while keeping mobile, portrait and narrow landscape
    // completely uniform. Pointer/touch mapping uses the same anisotropic
    // transform, so the display never lies about where PETREL is.
    const expansiveDesktop = cssW > cssH * 1.42 && cssW - baseWidth > 360 && scale >= .58;
    const maximumWorldWidth = Math.max(baseWidth, cssW - 620);
    const worldWidth = expansiveDesktop ? Math.min(baseWidth * 1.2, maximumWorldWidth) : baseWidth;
    playRect = {
      x: (cssW - worldWidth) / 2,
      y: (cssH - H * scale) / 2,
      w: worldWidth,
      h: H * scale,
      scale,
      scaleX: worldWidth / W,
      scaleY: scale
    };
    // A floating touch origin belongs to the viewport in which it was born.
    // Rotating with that inline origin intact can strand the control entirely
    // off-screen, so orientation/layout changes release it back to the CSS
    // home position just as lifting the thumb releases movement.
    if (input.touchMode) clearTransientInput();
    // Some mobile engines preserve a tiny visual-viewport offset when a
    // focused control survives an orientation change. The game shell is fixed;
    // normalize that stale offset so touch coordinates and authored gutters
    // remain pixel-aligned after rotation.
    if (scrollX || scrollY) scrollTo(0, 0);
    requestAnimationFrame(() => { if (scrollX || scrollY) scrollTo(0, 0); });
  }

  const keyDirectionState = { x: 0, y: 0 };

  function keyDirection() {
    let x = 0, y = 0;
    if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) x--;
    if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) x++;
    if (input.keys.has('ArrowUp') || input.keys.has('KeyW')) y--;
    if (input.keys.has('ArrowDown') || input.keys.has('KeyS')) y++;
    keyDirectionState.x = x;
    keyDirectionState.y = y;
    return keyDirectionState;
  }

  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    if (pads) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i]) { pad = pads[i]; break; }
      }
    }
    if (!pad) return null;
    const dead = (v) => Math.abs(v) < .16 ? 0 : Math.sign(v) * ((Math.abs(v) - .16) / .84);
    const pressed = (index) => !!pad.buttons[index]?.pressed;
    let x = dead(pad.axes[0] || 0) + (pressed(15) ? 1 : 0) - (pressed(14) ? 1 : 0);
    let y = dead(pad.axes[1] || 0) + (pressed(13) ? 1 : 0) - (pressed(12) ? 1 : 0);
    x = clamp(x, -1, 1);
    y = clamp(y, -1, 1);
    const focus = !!(pad.buttons[6]?.pressed || pad.buttons[7]?.pressed || pad.buttons[4]?.pressed || pad.buttons[5]?.pressed);
    let buttons = 0;
    for (const index of [0, 1, 2, 3, 9]) if (pressed(index)) buttons |= 1 << index;
    return { x, y, focus, buttons };
  }

  function updateGamepadLifecycle() {
    const pad = pollGamepad();
    input.gamepadState = pad;
    const held = pad?.buttons || 0;
    const fresh = held & ~input.gamepadPrev;
    input.gamepadPrev = held;
    if (!fresh) return;
    const A = 1 << 0, B = 1 << 1, X = 1 << 2, Y = 1 << 3, START = 1 << 9;
    if ((fresh & START) && (world.mode === 'playing' || world.mode === 'paused')) {
      togglePause();
      return;
    }
    if (world.mode === 'title') {
      if (fresh & A) launchPreparedRun(0, false);
      else if ((fresh & Y) && (Number(save.reached) || 0) > 0) launchPreparedRun(clamp(Number(save.reached) || 0, 0, zones.length - 1), false);
    } else if (world.mode === 'paused') {
      if (fresh & A) togglePause();
      else if (fresh & X) retryZone();
      else if (fresh & B) backToTitle();
    } else if (world.mode === 'gameover') {
      if (fresh & A) retryZone();
      else if (fresh & B) backToTitle();
    } else if (world.mode === 'victory') {
      if (fresh & A) resetRun(0, false);
      else if (fresh & B) backToTitle();
    }
  }

  function wrapOpenDialogFocus(event) {
    const dialog = world.mode === 'paused'
      ? $('#pause-screen')
      : (world.mode === 'gameover' || world.mode === 'victory' ? $('#end-screen') : null);
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.inert && element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      wrapOpenDialogFocus(event);
      return;
    }
    const interactive = event.target instanceof Element && !!event.target.closest('button, a, input, select, textarea');
    if (!interactive && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
    if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) {
      if (world.mode === 'playing' || world.mode === 'paused') togglePause();
      return;
    }
    if (interactive) return;
    input.keys.add(event.code);
  }, { passive: false });

  addEventListener('keyup', (event) => input.keys.delete(event.code));
  addEventListener('blur', clearTransientInput);

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('pointerdown', (event) => {
    if (world.mode !== 'playing') return;
    event.preventDefault();
    sound.unlock();
    canvas.setPointerCapture?.(event.pointerId);
    if (event.button === 2) {
      input.focusPointer = true;
      input.focusPointerId = event.pointerId;
      return;
    }
    const p = mapPointer(event.clientX, event.clientY);
    input.pointerId = event.pointerId;
    input.pointerStartX = p.x;
    input.pointerStartY = p.y;
    input.playerStartX = player.x;
    input.playerStartY = player.y;
    input.targetX = player.x;
    input.targetY = player.y;
    input.pointerActive = true;
    if (input.touchMode || event.pointerType === 'touch') {
      const stick = $('#touch-stick');
      stick.style.left = `${event.clientX - 71}px`;
      stick.style.top = `${event.clientY - 71}px`;
      stick.style.bottom = 'auto';
      stick.classList.add('active');
      stick.querySelector('i').style.transform = 'translate(0px, 0px)';
    }
  }, { passive: false });

  canvas.addEventListener('pointermove', (event) => {
    if (!input.pointerActive || event.pointerId !== input.pointerId) return;
    const p = mapPointer(event.clientX, event.clientY);
    const edgeMargin = playerEdgeMargin();
    input.targetX = clamp(input.playerStartX + (p.x - input.pointerStartX), edgeMargin, W - edgeMargin);
    input.targetY = clamp(input.playerStartY + (p.y - input.pointerStartY), 90, H - 34);
    if (input.touchMode || event.pointerType === 'touch') {
      const rawX = (p.x - input.pointerStartX) * playRect.scaleX;
      const rawY = (p.y - input.pointerStartY) * playRect.scaleY;
      const length = Math.hypot(rawX, rawY) || 1;
      const scale = Math.min(1, 42 / length);
      $('#touch-stick i').style.transform = `translate(${(rawX * scale).toFixed(1)}px, ${(rawY * scale).toFixed(1)}px)`;
    }
  });

  function endPointer(event) {
    if (event.pointerId === input.focusPointerId) {
      input.focusPointer = false;
      input.focusPointerId = null;
    }
    if (event.pointerId === input.pointerId) {
      input.pointerActive = false;
      input.pointerId = null;
      const stick = $('#touch-stick');
      stick.classList.remove('active');
      stick.querySelector('i').style.transform = 'translate(0px, 0px)';
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  addEventListener('pointerup', endPointer);
  addEventListener('pointercancel', endPointer);

  $('#voyage').addEventListener('click', () => launchPreparedRun(0, false));
  $('#practice').addEventListener('click', () => launchPreparedRun(clamp(Number(save.reached) || 0, 0, zones.length - 1), false));
  $('#resume').addEventListener('click', () => togglePause());
  $('#restart-zone').addEventListener('click', retryZone);
  $('#quit-title').addEventListener('click', backToTitle);
  $('#retry').addEventListener('click', () => world.mode === 'victory' ? resetRun(0, false) : retryZone());
  $('#end-title-button').addEventListener('click', backToTitle);
  const toggleAudioSetting = () => {
    sound.setMuted(!settings.muted);
    if (!settings.muted) sound.unlock(true).then(() => { if (world.mode === 'playing') sound.restartMusic(false); });
    updatePanels();
  };
  const toggleEffectsSetting = () => { settings.reduced = !settings.reduced; writeSave(); resize(); updatePanels(); };
  $('#audio-toggle').addEventListener('click', toggleAudioSetting);
  $('#pause-audio-toggle').addEventListener('click', toggleAudioSetting);
  $('#effects-toggle').addEventListener('click', toggleEffectsSetting);
  $('#pause-effects-toggle').addEventListener('click', toggleEffectsSetting);
  $('#touch-focus').addEventListener('pointerdown', (event) => {
    event.preventDefault();
    input.focusPointer = true;
    input.focusPointerId = event.pointerId;
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch (_) { /* synthetic or already-cancelled pointer */ }
  });
  $('#touch-pause').addEventListener('click', () => togglePause());
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.mode === 'playing') {
      world.pausedByVisibility = true;
      clearTransientInput();
      togglePause(true);
    }
  });

  function spawnPlayerBullet(x, y, vx, vy, damage = 5, radius = 3, counter = false) {
    const trailCapacity = counter ? 7 : 3;
    playerBullets.push({
      x, y, px: x, py: y, vx, vy, damage, r: radius, age: 0, life: 2.4, counter, dead: false,
      trail: new Float64Array(trailCapacity * 2), trailCapacity, trailCount: 0, trailHead: 0
    });
  }

  function firePlayer() {
    player.firePulse = 1;
    player.volleyIndex++;
    if (player.focus) {
      spawnPlayerBullet(player.x - 6, player.y - 23, -22, -980, 7, 2.8);
      spawnPlayerBullet(player.x + 6, player.y - 23, 22, -980, 7, 2.8);
      if (player.focusVolley % 2 === 0) spawnPlayerBullet(player.x, player.y - 28, 0, -1080, 5, 2.2);
      player.focusVolley++;
      player.shot = [.06, .06, .105][(player.volleyIndex - 1) % 3];
    } else {
      spawnPlayerBullet(player.x - 13, player.y - 16, -100, -900, 4.2, 3.1);
      spawnPlayerBullet(player.x + 13, player.y - 16, 100, -900, 4.2, 3.1);
      spawnPlayerBullet(player.x - 4, player.y - 26, -28, -1030, 4.8, 2.4);
      spawnPlayerBullet(player.x + 4, player.y - 26, 28, -1030, 4.8, 2.4);
      player.shot = [.066, .066, .118][(player.volleyIndex - 1) % 3];
    }
    if (player.volleyIndex % 3 === 1) sound.sfx(player.focus ? 'focusShot' : 'shot');
  }

  function nearestEnemy(x, y) {
    let best = null, bestD = Infinity;
    for (const e of enemies) {
      if (e.dead || e.enter > 0) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (world.boss && !world.boss.dead && world.boss.enter <= 0) return world.boss;
    return best;
  }

  function findEmitter(id) {
    if (!id) return null;
    if (world.boss && world.boss.id === id && !world.boss.dead) return world.boss;
    return enemies.find((e) => e.id === id && !e.dead) || null;
  }

  function counterwakePluck(b, hit, wakeAge) {
    b.wakePlucked = true;
    b.pluckPulse = .5;
    const live = wakeAge <= .085;
    const emitter = findEmitter(b.source);
    const damage = (live ? 46 : 22) + b.r * (live ? .8 : .55) + (b.kind === 'chime' ? 3 : 0);
    const tx = emitter ? emitter.x : hit.x;
    const ty = emitter ? emitter.y : Math.max(-40, hit.y - 260);
    counterNeedles.push({
      x: hit.x, y: hit.y, tx, ty, source: emitter?.id || null,
      life: live ? .23 : .18, max: live ? .23 : .18, live, damage, impacted: false
    });
    player.counterPulse = live ? .24 : .15;
    world.pluckChain = Math.min(999, world.pluckChain + (live ? 2 : 1));
    world.pluckTimer = .9;
    world.chainTimer = Math.max(world.chainTimer, 1.25);
    world.score += (live ? 620 : 260) + world.pluckChain * 6;
    burst(hit.x, hit.y, live ? '#fff0b0' : '#d8fbff', live ? 7 : 4, live ? 145 : 90, live ? 3.2 : 2.2);
    sound.sfx(live ? 'livePluck' : 'pluck');
    if (live && world.pluckChain % 8 === 0) addText(player.x, player.y - 66, `LIVE WAKE × ${world.pluckChain}`, '#fff0b0', .72, 12);
  }

  function updatePlayer(dt) {
    player.px = player.x;
    player.py = player.y;
    const kd = keyDirection();
    const pad = input.gamepadState;
    let dx = kd.x + (pad?.x || 0);
    let dy = kd.y + (pad?.y || 0);
    const wasFocused = player.focus;
    player.focus = FOCUS_KEY_CODES.some((code) => input.keys.has(code)) || input.focusPointer || !!pad?.focus;
    if (player.focus !== wasFocused) {
      player.focusPulse = 1;
      if (player.focus) player.focusVolley = 0;
      sound.sfx(player.focus ? 'focusIn' : 'focusOut');
    }

    let desiredX = 0, desiredY = 0;
    if (Math.abs(dx) + Math.abs(dy) > .05) {
      input.pointerActive = false;
      const len = Math.hypot(dx, dy) || 1;
      dx /= Math.max(1, len);
      dy /= Math.max(1, len);
      const speed = player.focus ? 255 : 535;
      desiredX = dx * speed;
      desiredY = dy * speed;
    } else if (input.pointerActive) {
      const tx = input.targetX - player.x;
      const ty = input.targetY - player.y;
      const d = Math.hypot(tx, ty);
      if (d > 1) {
        const speed = Math.min(player.focus ? 255 : 535, d * 18);
        desiredX = tx / d * speed;
        desiredY = ty / d * speed;
      }
    }

    const sameX = Math.sign(desiredX) === Math.sign(player.vx);
    const sameY = Math.sign(desiredY) === Math.sign(player.vy);
    const ax = desiredX === 0 ? 11400 : (sameX ? 9800 : 15000);
    const ay = desiredY === 0 ? 11400 : (sameY ? 9800 : 15000);
    player.vx = approach(player.vx, desiredX, ax * dt);
    player.vy = approach(player.vy, desiredY, ay * dt);
    player.wing = lerp(player.wing, player.focus ? 1 : 0, 1 - Math.exp(-18 * dt));
    const edgeMargin = playerEdgeMargin();
    // A held relative-drag target is the player's intention, not PETREL's
    // current wing pose. Keep that goal stable while the wings animate; only
    // the physical body is clamped. Folding can then reveal the last few pixels
    // of the already-held route without a seam or pose change rewriting input.
    player.x = clamp(player.x + player.vx * dt, edgeMargin, W - edgeMargin);
    player.y = clamp(player.y + player.vy * dt, 100, H - 32);
    player.bank = lerp(player.bank, clamp(player.vx / 520, -1, 1), 1 - Math.exp(-16 * dt));

    player.shot -= dt;
    const combatPhase = world.phase === 'field' || world.phase === 'boss';
    if (player.shot <= 0 && !player.dead && combatPhase) firePlayer();
    else if (!combatPhase) player.shot = 0;
    player.invuln = Math.max(0, player.invuln - dt);
    player.counterPulse = Math.max(0, player.counterPulse - dt);
    player.grazePulse = Math.max(0, player.grazePulse - dt);
    player.hitPulse = Math.max(0, player.hitPulse - dt);
    player.firePulse = Math.max(0, player.firePulse - dt * 12);
    player.focusPulse = Math.max(0, player.focusPulse - dt * 4.4);
    player.clearPulse = Math.max(0, player.clearPulse - dt);

    player.wakeSample -= dt;
    if (player.wakeSample <= 0) {
      const last = player.wake[player.wake.length - 1];
      if (!last || dist2(last.x, last.y, player.x, player.y) > 3.5 ** 2) {
        const point = { x: player.x, y: player.y, t: world.totalTime };
        player.wake.push(point);
        player.wakeEcho.push(point);
      }
      player.wakeSample = .022;
    }
    while (player.wake.length && world.totalTime - player.wake[0].t > .31) player.wake.shift();
    while (player.wakeEcho.length && world.totalTime - player.wakeEcho[0].t > .62) player.wakeEcho.shift();
  }

  function spawnEnemy(type, x, y, options = {}) {
    const stats = {
      skifftick: [96, 24], buoychoir: [260, 44], netkite: [175, 36], lanternray: [240, 40],
      prunerhand: [145, 28], milkmoth: [82, 25], pendulumbulb: [220, 36], grafthound: [175, 30],
      marrowskate: [130, 28], spinetick: [175, 30], bannerkite: [225, 40], ribshepherd: [300, 48],
      ciliawheel: [235, 37], valveray: [220, 38], nacreleech: [112, 25], airpearl: [270, 41],
      chimneyheron: [220, 35], tramcentipede: [340, 46], signaltripod: [185, 32], umbrellamite: [92, 23],
      skyscrivener: [210, 36], shedling: [128, 27], sunbladder: [330, 46], migrationthorn: [240, 38]
    }[type] || [100, 24];
    const tunedHp = Math.max(1, Math.round((options.hp ?? stats[0]) * FIELD_ENEMY_HP_SCALE));
    const e = {
      id: `${world.frame}-${logicRng.int(1, 999999)}`, type, x, y, px: x, py: y,
      baseX: x, baseY: y, vx: 0, vy: 0, age: 0, hp: tunedHp, maxHp: tunedHp,
      r: stats[1], fire: options.fire ?? logicRng.range(.5, 1.2), enter: options.enter ?? .7,
      side: options.side || 1, lane: options.lane || 0, seed: logicRng.next() * TAU,
      dead: false, leaving: false, charge: 0, telegraph: 0, flash: 0,
      hitPulse: 0, firePulse: 0, name: options.name || type
    };
    enemies.push(e);
    return e;
  }

  function spawnWave(kind, args) {
    const topFan = (type, count, stagger = .12, firstFire = null, enterBase = 0) => {
      for (let i = 0; i < count; i++) spawnEnemy(type, 58 + (i + .5) * (W - 116) / count, -55 - (i % 3) * 38, {
        side: i % 2 ? 1 : -1,
        lane: i,
        enter: enterBase + i * stagger,
        ...(firstFire ? { fire: firstFire(i) } : {})
      });
    };
    const sideFile = (type, count, side, gap = 82, firstFire = null, enterBase = 0) => {
      for (let i = 0; i < count; i++) spawnEnemy(type, side > 0 ? -58 : W + 58, 125 + i * gap, {
        side,
        lane: i,
        enter: enterBase + i * .14,
        ...(firstFire ? { fire: firstFire(i) } : {})
      });
    };
    if (kind === 'kiteV') {
      const [count, center] = args;
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 2);
        const side = i % 2 ? 1 : -1;
        spawnEnemy('skifftick', clamp(center + side * (45 + row * 58), 55, W - 55), -50 - row * 45, {
          side, fire: .68 + row * .14, enter: .16 + row * .12
        });
      }
    } else if (kind === 'kiteCross') {
      const [count] = args;
      for (let i = 0; i < count; i++) {
        const side = i % 2 ? 1 : -1;
        spawnEnemy('skifftick', side < 0 ? -45 : W + 45, 120 + Math.floor(i / 2) * 58, {
          side: -side, fire: .62 + Math.floor(i / 2) * .12, enter: i * .055
        });
      }
    } else if (kind === 'bellPair') {
      const [center] = args;
      spawnEnemy('buoychoir', clamp(center - 110, 90, W - 90), -70, { side: -1, fire: .78 });
      spawnEnemy('buoychoir', clamp(center + 110, 90, W - 90), -110, { side: 1, fire: .92, enter: 1.15 });
    } else if (kind === 'rams') {
      const [count] = args;
      for (let i = 0; i < count; i++) {
        const side = i % 2 ? 1 : -1;
        spawnEnemy('lanternray', side < 0 ? 86 : W - 86, 150 + i * 125, {
          side: -side, fire: .58 + i * .32, enter: i * .65
        });
      }
    } else if (kind === 'thimbles') {
      const [count, side] = args;
      for (let i = 0; i < count; i++) spawnEnemy('netkite', side < 0 ? W + 55 : -55, 130 + i * 88, {
        side, fire: .7 + i * .16, enter: i * .17
      });
    } else if (kind === 'weatherMix') {
      spawnEnemy('buoychoir', W / 2, -80, { hp: 280, fire: .9, enter: .15 });
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1;
        spawnEnemy('skifftick', side < 0 ? 85 : W - 85, -50 - i * 38, {
          side, hp: 96, fire: .65 + i * .14, enter: .3 + i * .18
        });
      }
      spawnEnemy('netkite', -55, 240, { side: 1, hp: 190, fire: .82, enter: .55 });
      spawnEnemy('netkite', W + 55, 380, { side: -1, hp: 190, fire: 1.05, enter: .95 });
      spawnEnemy('lanternray', 92, 360, { side: 1, hp: 260, fire: .62, enter: 1.4 });
      spawnEnemy('lanternray', W - 92, 440, { side: -1, hp: 260, fire: .7, enter: 2.1 });
    } else if (kind === 'acreMoths') {
      sideFile('milkmoth', args[0], args[1], 72, i => .82 + i * .08);
    } else if (kind === 'acreBulbs') {
      topFan('pendulumbulb', args[0], .28, i => 1.05 + i * .16);
    } else if (kind === 'acreHands') {
      sideFile('prunerhand', args[0], args[1], 86, i => .88 + i * .11);
    } else if (kind === 'acreHounds') {
      topFan('grafthound', args[0], .42, i => 1.22 + i * .18);
    } else if (kind === 'acreMix') {
      const side = args[0] || 1;
      topFan('pendulumbulb', 2, .34, i => 1.05 + i * .22);
      sideFile('milkmoth', 4, side, 82, i => .78 + i * .1);
      sideFile('prunerhand', 2, -side, 148, i => 1.05 + i * .18);
      topFan('grafthound', 1, .42, () => 1.42);
    } else if (kind === 'spineSkates') {
      const [count, side] = args;
      for (let i = 0; i < count; i++) spawnEnemy('marrowskate', side > 0 ? -58 : W + 58, 125 + i * 66, {
        side, lane: i, enter: i * .09, fire: .78 + (i % 3) * .1
      });
    } else if (kind === 'spineTicks') {
      const [count] = args;
      for (let i = 0; i < count; i++) spawnEnemy('spinetick', 58 + (i + .5) * (W - 116) / count, -55 - (i % 3) * 38, {
        side: i % 2 ? 1 : -1, lane: i, enter: i * .16, fire: .84 + (i % 3) * .1
      });
    } else if (kind === 'spineBanners') {
      const [count, side] = args;
      for (let i = 0; i < count; i++) spawnEnemy('bannerkite', side > 0 ? -58 : W + 58, 125 + i * 145, {
        side, lane: i, enter: i * .17, fire: 1 + i * .12
      });
    } else if (kind === 'spineGates') {
      const [count] = args;
      for (let i = 0; i < count; i++) spawnEnemy('ribshepherd', 58 + (i + .5) * (W - 116) / count, -55 - (i % 3) * 38, {
        side: i % 2 ? 1 : -1, lane: i, enter: i * .32, fire: 1.05 + i * .16
      });
    } else if (kind === 'spineMix') {
      const side = args[0] || 1;
      for (let i = 0; i < 4; i++) spawnEnemy('marrowskate', side > 0 ? -58 : W + 58, 140 + i * 78, {
        side, lane: i, enter: .1 + i * .12, fire: .78 + i * .08
      });
      for (let i = 0; i < 3; i++) spawnEnemy('spinetick', 170 + i * 190, -70 - (i % 2) * 38, {
        side: i % 2 ? 1 : -1, lane: i, enter: 1.15 + i * .16, fire: .84 + i * .1
      });
      for (let i = 0; i < 3; i++) spawnEnemy('bannerkite', side > 0 ? W + 58 : -58, 170 + i * 165, {
        side: -side, lane: i, enter: 2.25 + i * .18, fire: 1 + i * .12
      });
      for (let i = 0; i < 2; i++) spawnEnemy('ribshepherd', 240 + i * 240, -90 - i * 38, {
        side: i ? 1 : -1, lane: i, enter: 3.15 + i * .35, fire: 1.05 + i * .16
      });
    } else if (kind === 'lungLeeches') {
      sideFile('nacreleech', args[0], args[1], 82, i => .72 + i * .08);
    } else if (kind === 'lungWheels') {
      topFan('ciliawheel', args[0], .34, i => .9 + i * .12);
    } else if (kind === 'lungValves') {
      topFan('valveray', args[0], .22, i => .96 + i * .12);
    } else if (kind === 'lungPearls') {
      topFan('airpearl', args[0], .26, i => .72 + i * .1);
    } else if (kind === 'lungMix') {
      const side = args[0] || 1;
      sideFile('nacreleech', 3, side, 96, i => .72 + i * .08, .15);
      topFan('ciliawheel', 2, .34, i => .9 + i * .12, 1.25);
      topFan('valveray', 2, .22, i => .96 + i * .12, 2.55);
      topFan('airpearl', 2, .26, i => .72 + i * .1, 3.65);
    } else if (kind === 'cityMites') {
      const [count] = args;
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 4);
        const column = i % 4;
        spawnEnemy('umbrellamite', clamp(100 + column * 173 + (row % 2 ? 44 : 0), 55, W - 55), -55 - row * 72, {
          side: column % 2 ? 1 : -1,
          lane: i,
          enter: row * .38 + column * .06,
          fire: .62 + column * .09 + row * .06
        });
      }
    } else if (kind === 'cityHerons') {
      topFan('chimneyheron', args[0], .4, i => 1.04 + i * .18);
    } else if (kind === 'citySignals') {
      topFan('signaltripod', args[0], .25, i => .88 + i * .13);
    } else if (kind === 'cityTrams') {
      sideFile('tramcentipede', args[0], args[1], 210, i => .86 + i * .19);
    } else if (kind === 'cityProcession') {
      const side = args[0] || 1;
      for (let i = 0; i < 2; i++) spawnEnemy('tramcentipede', side > 0 ? -58 : W + 58, i ? 440 : 160, {
        side, lane: i, enter: .15 + i * .28, fire: .86 + i * .19
      });
      for (let i = 0; i < 2; i++) spawnEnemy('chimneyheron', i ? 490 : 230, -70 - i * 38, {
        side: i ? 1 : -1, lane: i, enter: 1.1 + i * .32, fire: 1.06 + i * .18
      });
      for (let i = 0; i < 3; i++) spawnEnemy('signaltripod', 165 + i * 195, -70 - (i % 2) * 38, {
        side: i % 2 ? 1 : -1, lane: i, enter: 2.05 + i * .22, fire: .9 + i * .14
      });
      const miteXs = [[150, 360, 570], [80, 290, 500]];
      for (let row = 0; row < 2; row++) for (let column = 0; column < 3; column++) {
        spawnEnemy('umbrellamite', miteXs[row][column], -60 - row * 72, {
          side: column % 2 ? 1 : -1,
          lane: row * 3 + column,
          enter: 3.05 + row * .3 + column * .08,
          fire: .62 + column * .09 + row * .05
        });
      }
    } else if (kind === 'blueScriveners') {
      sideFile('skyscrivener', args[0], args[1], 115, i => .78 + i * .085);
    } else if (kind === 'blueShedlings') {
      topFan('shedling', args[0], .16, i => .68 + (i % 4) * .08);
    } else if (kind === 'blueBladders') {
      topFan('sunbladder', args[0], .38, i => 1.08 + i * .16);
    } else if (kind === 'blueThorns') {
      sideFile('migrationthorn', args[0], args[1], 96, i => .92 + i * .075);
    } else if (kind === 'blueClimax') {
      const side = args[0] || 1;
      topFan('sunbladder', 2, .5, i => 1.15 + i * .18, .1);
      sideFile('skyscrivener', 4, side, 150, i => .84 + i * .1, .85);
      topFan('shedling', 6, .16, i => .72 + (i % 3) * .09, 1.75);
      sideFile('migrationthorn', 3, -side, 170, i => 1.05 + i * .12, 2.7);
    }
  }

  function spawnEnemyBullet(x, y, angle, speed, options = {}) {
    if (enemyBullets.length >= 1500) { world.droppedBullets++; return null; }
    const vx = options.vx ?? Math.cos(angle) * speed;
    const vy = options.vy ?? Math.sin(angle) * speed;
    const bulletZone = clamp(Number.isInteger(options.zone) ? options.zone : world.zone, 0, projectileMaterials.length - 1);
    const b = {
      x, y, px: x, py: y, vx, vy,
      angle: Math.atan2(vy, vx), speed: Math.hypot(vx, vy), r: options.r || 6, age: 0, flightAge: 0, life: options.life || 8,
      zone: bulletZone,
      color: options.color || projectileMaterials[bulletZone].primary, kind: options.kind || 'pearl',
      turn: options.turn || 0, accel: options.accel || 0, grazed: false, wakePlucked: false, pluckPulse: 0,
      delay: options.delay || 0, dead: false, source: options.source || null,
      pulse: options.pulse || 0, split: options.split || 0, splitDone: false, splitChild: !!options.splitChild,
      turnTime: options.turnTime || 0, turnFlipAt: options.turnFlipAt || 0, turnAfter: options.turnAfter || 0, turnEnd: options.turnEnd || 0,
      reverseAt: options.reverseAt || 0, reversed: false,
      gravityX: options.gravityX || 0, gravityY: options.gravityY || 0, maxSpeed: options.maxSpeed || 0,
      hingeAt: options.hingeAt || 0, hingeAngle: options.hingeAngle || 0, hinged: false,
      hinge2At: options.hinge2At || 0, hinge2Angle: options.hinge2Angle || 0, hinged2: false,
      shearAmp: options.shearAmp || 0, shearFreq: options.shearFreq || 0, shearPhase: options.shearPhase || 0,
      refractY: options.refractY || 0, refractX: options.refractX || 0, refractRadius: options.refractRadius || 0,
      refractSide: options.refractSide || 0, refracted: false,
      dipole: options.dipole || null, radial: options.radial || null,
      stopAt: options.stopAt || 0, stopDuration: options.stopDuration || 0, resumeSpeed: options.resumeSpeed || 0,
      stopped: false, stopDone: false, stopTimer: 0
    };
    b.patternId = options.patternId || (b.source
      ? `${b.source}:${b.kind}:${Math.floor(world.totalTime * 8)}`
      : null);
    enemyBullets.push(b);
    const emitter = findEmitter(b.source);
    if (emitter) emitter.firePulse = 1;
    return b;
  }

  function aimedBurst(e, count, spread, speed, options = {}) {
    const center = angleTo(e.x, e.y, player.x, player.y);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - .5;
      spawnEnemyBullet(e.x, e.y, center + t * spread, speed, { ...options, source: e.id });
    }
  }

  function ringBurst(e, count, speed, offset = 0, options = {}) {
    for (let i = 0; i < count; i++) spawnEnemyBullet(e.x, e.y, offset + TAU * i / count, speed, { ...options, source: e.id });
  }

  function updateEnemy(e, dt, motion) {
    e.px = e.x; e.py = e.y;
    e.age += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.hitPulse = Math.max(0, (e.hitPulse || 0) - dt);
    e.firePulse = Math.max(0, (e.firePulse || 0) - dt * 4.6);
    if (world.zone === 3) {
      e.x += motion.orbitX; e.y += motion.orbitY;
      e.baseX += motion.orbitX; e.baseY += motion.orbitY;
    } else if (world.zone === 4) {
      e.x += motion.cityShift;
      e.baseX += motion.cityShift;
    }
    if (e.enter > 0) {
      if (world.zone === 5) rollFirstBlueEnemy(e, motion.blueRoll);
      e.enter -= dt;
      return;
    }
    e.fire -= dt / ENEMY_FIRE_INTERVAL_SCALE;

    if (e.type === 'skifftick') {
      if (e.baseY < 0) {
        e.y += 132 * dt;
        e.x += Math.sin(e.age * 2.2 + e.seed) * 45 * dt + e.side * 16 * dt;
      } else {
        e.x += e.side * 122 * dt;
        e.y += Math.sin(e.age * 2.5 + e.seed) * 48 * dt;
      }
      if (e.fire <= 0 && e.y > 50 && e.y < 700) {
        aimedBurst(e, 5, .46, 285, { r: 4.8, kind: 'drop' });
        e.fire = 1.48 + logicRng.range(0, .25);
      }
    } else if (e.type === 'buoychoir') {
      const targetY = 180 + (e.seed % 1) * 120;
      if (!e.leaving) e.y = lerp(e.y, targetY, 1 - Math.exp(-2.4 * dt));
      e.x += Math.sin(e.age * .9 + e.seed) * 28 * dt;
      if (e.fire <= 0) {
        const gap = angleTo(e.x, e.y, player.x, player.y);
        const count = 24;
        for (let i = 0; i < count; i++) {
          const a = TAU * i / count + e.age * .12;
          if (Math.abs(shortestAngle(a, gap)) < .33) continue;
          spawnEnemyBullet(e.x, e.y + 12, a, 185, { r: 6.2, kind: 'bead', pulse: e.age, source: e.id });
        }
        for (let bulb = -1; bulb <= 1; bulb++) {
          const bx = e.x + bulb * 24 + Math.sin(e.age * 2.2 + bulb) * 10;
          const by = e.y + 20 + Math.cos(e.age * 2.2 + bulb) * 9;
          const aim = angleTo(bx, by, player.x, player.y);
          spawnEnemyBullet(bx, by, aim, 330 + bulb * 18, { r: 5, kind: 'drop', source: e.id });
        }
        e.fire = 2.15;
      }
      if (e.age > 8.4) e.leaving = true;
    } else if (e.type === 'netkite') {
      e.x += e.side * 96 * dt;
      e.y += Math.sin(e.age * 2 + e.seed) * 32 * dt;
      if (e.fire <= 0) {
        const down = Math.PI / 2;
        const gap = (Math.floor(e.age * 2) % 7) - 3;
        for (let i = -4; i <= 4; i++) {
          if (i === gap) continue;
          spawnEnemyBullet(e.x + i * 10, e.y + 12, down + i * .045, 252 + Math.abs(i) * 13, { r: 4.5, kind: i % 2 ? 'bead' : 'needle', source: e.id });
        }
        e.fire = 1.18;
      }
    } else if (e.type === 'lanternray') {
      if (!e.charge) {
        e.x += Math.sin(e.age * 1.4 + e.seed) * 12 * dt;
        if (e.fire <= 0) {
          e.charge = 1;
          e.fire = 3.05;
          e.aimAngle = angleTo(e.x, e.y, player.x, player.y);
          telegraphs.push({ type: 'ray', x: e.x, y: e.y, angle: e.aimAngle, life: .82, max: .82, source: e });
          e.telegraph = .82;
        }
      } else {
        e.telegraph -= dt;
        if (e.telegraph <= 0 && e.charge === 1) {
          const a = e.aimAngle;
          e.charge = 2;
          for (let i = -6; i <= 6; i++) spawnEnemyBullet(e.x, e.y, a + i * .085, 220 + Math.abs(i) * 18, { r: 5.2, kind: i % 3 ? 'drop' : 'needle', source: e.id });
          e.telegraph = .62;
        }
        if (e.charge === 2) {
          e.telegraph -= dt;
          if (e.telegraph <= 0) { e.charge = 0; e.fire = 1.55; }
        }
      }
    } else if (e.type === 'milkmoth') {
      e.x += e.side * 118 * dt;
      e.y += Math.sin(e.age * 3.1 + e.seed) * 62 * dt;
      if (e.fire <= 0) {
        const down = Math.PI / 2 + Math.sin(e.age * 2) * .16;
        for (let i = -3; i <= 3; i++) spawnEnemyBullet(e.x, e.y, down + i * .16, 205 + Math.abs(i) * 18, { r: 5, kind: 'seed', turn: e.side * (i % 2 ? .13 : -.09), turnTime: 1.25, source: e.id });
        e.fire = 1.55;
      }
    } else if (e.type === 'pendulumbulb') {
      if (!e.leaving) e.y = lerp(e.y, 195 + e.lane * 18, 1 - Math.exp(-2.2 * dt));
      e.x = e.baseX + Math.sin(e.age * 1.55 + e.seed) * 82;
      if (e.fire <= 0) {
        const tangent = Math.cos(e.age * 1.55 + e.seed);
        const base = Math.PI / 2 + tangent * .46;
        for (let petal = -4; petal <= 4; petal++) spawnEnemyBullet(e.x, e.y + 22, base + petal * .17, 135 + Math.abs(petal) * 12, { r: 5.5, kind: 'seed', gravityY: 235, maxSpeed: 345, source: e.id });
        e.fire = 1.72;
      }
      if (e.age > 10.2) e.leaving = true;
    } else if (e.type === 'prunerhand') {
      e.x += e.side * 94 * dt;
      e.y += Math.sin(e.age * 1.8 + e.seed) * 24 * dt;
      if (e.fire <= 0) {
        const aim = angleTo(e.x, e.y, player.x, player.y);
        for (let i = -3; i <= 3; i++) {
          const offset = i * 7;
          spawnEnemyBullet(e.x + offset, e.y + 8, aim + i * .075, 275 + Math.abs(i) * 13, { r: 4.4, kind: 'thorn', delay: Math.abs(i) * .055, accel: 85, source: e.id });
        }
        e.fire = 1.38;
      }
    } else if (e.type === 'grafthound') {
      e.y += 96 * dt;
      e.x += Math.sin(e.age * 2.5 + e.seed) * 88 * dt;
      if (e.fire <= 0 && e.y < 650) {
        for (let i = -5; i <= 5; i++) {
          if ((i + e.lane) % 5 === 0) continue;
          spawnEnemyBullet(e.x + i * 25, e.y + 8, Math.PI / 2, 55, { r: 5, kind: 'thorn', delay: .62 + Math.abs(i) * .035, accel: 310, source: e.id });
        }
        e.fire = 2.05;
      }
    } else if (e.type === 'marrowskate') {
      e.x += e.side * 172 * dt;
      e.y += Math.sin(e.age * 4 + e.seed) * 20 * dt;
      if (e.fire <= 0) {
        const base = Math.PI / 2 - e.side * .12;
        for (let i = -3; i <= 3; i++) spawnEnemyBullet(e.x, e.y, base + i * .12, 250 + (3 - Math.abs(i)) * 24, { r: 4.8, kind: 'thorn', source: e.id });
        e.fire = 1.12;
      }
    } else if (e.type === 'spinetick') {
      if (!e.leaving) e.y = lerp(e.y, 165 + (e.lane % 3) * 82, 1 - Math.exp(-2.4 * dt));
      e.x += Math.sin(e.age * 1.1 + e.seed) * 18 * dt;
      if (e.fire <= 0) {
        const aim = angleTo(e.x, e.y, player.x, player.y);
        for (let i = -3; i <= 3; i++) {
          if (i === 0) continue;
          const side = Math.sign(i);
          spawnEnemyBullet(e.x, e.y, aim + i * .13, 238, { r: 4.8, kind: 'thorn', delay: .5, hingeAt: .38, hingeAngle: side * Math.PI / 3, hinge2At: .76, hinge2Angle: -side * Math.PI * 2 / 3, source: e.id });
        }
        e.fire = 2.15;
      }
      if (e.age > 9.5) e.leaving = true;
    } else if (e.type === 'bannerkite') {
      e.x += e.side * 78 * dt;
      e.y += Math.sin(e.age * 1.7 + e.seed) * 38 * dt;
      if (e.fire <= 0) {
        const gap = Math.floor(e.age * 1.8) % 7 - 3;
        for (let i = -5; i <= 5; i++) {
          if (Math.abs(i - gap) <= 1) continue;
          spawnEnemyBullet(e.x + i * 13, e.y + i * 2, Math.PI / 2 + e.side * .055, 285 + Math.abs(i) * 6, { r: 4.6, kind: 'thorn', source: e.id });
        }
        e.fire = 1.2;
      }
    } else if (e.type === 'ribshepherd') {
      if (!e.leaving) e.y = lerp(e.y, 210 + (e.lane % 2) * 90, 1 - Math.exp(-1.9 * dt));
      e.x = e.baseX + Math.sin(e.age * .86 + e.seed) * 46;
      if (e.fire <= 0) {
        const aim = angleTo(e.x, e.y, player.x, player.y);
        for (let i = -6; i <= 6; i++) {
          if (Math.abs(i) <= 1) continue;
          const side = Math.sign(i);
          spawnEnemyBullet(e.x, e.y + 22, aim + i * .105, 185 + Math.abs(i) * 18, { r: 5.7, kind: 'bead', delay: .42, hingeAt: .56, hingeAngle: side * Math.PI / 2, source: e.id });
        }
        e.fire = 1.68;
      }
      if (e.age > 11) e.leaving = true;
    } else if (e.type === 'nacreleech') {
      e.x += e.side * 116 * dt;
      e.y += Math.sin(e.age * 2.8 + e.seed) * 55 * dt;
      if (e.fire <= 0) {
        const aim = angleTo(e.x, e.y, player.x, player.y);
        for (let i = -2; i <= 2; i++) spawnEnemyBullet(e.x, e.y, aim + i * .19, 230, { r: 5.2, kind: 'seed', turn: -e.side * .34, turnTime: .72, source: e.id });
        e.fire = 1.42;
      }
    } else if (e.type === 'ciliawheel') {
      if (!e.leaving) e.y = lerp(e.y, 175 + (e.lane % 3) * 72, 1 - Math.exp(-2 * dt));
      e.x += Math.sin(e.age * .8 + e.seed) * 22 * dt;
      if (e.fire <= 0) {
        for (let i = 0; i < 14; i++) spawnEnemyBullet(e.x, e.y, Math.PI / 2 + (i - 6.5) * .115, 205 + (i % 2) * 28, { r: 4.8, kind: 'bead', shearAmp: 105, shearFreq: TAU / 1.55, shearPhase: i * TAU / 7, maxSpeed: 345, source: e.id });
        e.fire = 1.88;
      }
      if (e.age > 10.5) e.leaving = true;
    } else if (e.type === 'valveray') {
      if (!e.leaving) e.y = lerp(e.y, 150 + (e.lane % 4) * 80, 1 - Math.exp(-2.2 * dt));
      e.x += Math.sin(e.age * 1.15 + e.seed) * 44 * dt;
      if (e.fire <= 0) {
        const aim = angleTo(e.x, e.y, player.x, player.y);
        for (let i = -3; i <= 3; i++) spawnEnemyBullet(e.x, e.y, aim + i * .22, 155 + Math.abs(i) * 18, { r: 7, kind: 'bell', reverseAt: 1.65, source: e.id });
        e.fire = 2.35;
      }
      if (e.age > 10) e.leaving = true;
    } else if (e.type === 'airpearl') {
      if (!e.leaving) e.y = lerp(e.y, 185 + (e.lane % 3) * 85, 1 - Math.exp(-1.7 * dt));
      e.x = e.baseX + Math.sin(e.age * .72 + e.seed) * 34;
      if (e.fire <= 0 && !e.charge) { e.charge = 1; e.telegraph = .72; }
      if (e.charge) {
        e.telegraph -= dt;
        if (e.telegraph <= 0) {
          ringBurst(e, 22, 265, e.age * .13, { r: 4.8, kind: 'thorn', delay: 0 });
          e.charge = 0; e.fire = 2.65;
        }
      }
      if (e.age > 11) e.leaving = true;
    } else if (e.type === 'umbrellamite') {
      e.y += 105 * dt; e.x += Math.sin(e.age * 3 + e.seed) * 33 * dt;
      if (e.fire <= 0 && e.y < 720) {
        const base = Math.PI / 2;
        for (let i = -5; i <= 5; i++) spawnEnemyBullet(e.x, e.y, base + i * .15, 205 + Math.abs(i) * 12, { r: 4.7, kind: 'drop', delay: Math.abs(i) * .035, source: e.id });
        e.fire = 1.42;
      }
    } else if (e.type === 'chimneyheron') {
      if (!e.leaving) e.y = lerp(e.y, 165 + (e.lane % 3) * 95, 1 - Math.exp(-2.1 * dt));
      e.x += Math.sin(e.age * .9 + e.seed) * 32 * dt;
      if (e.fire <= 0) {
        const gap = Math.floor(player.x / 48);
        for (let col = 1; col < 15; col++) {
          if (Math.abs(col - gap) <= 1) continue;
          spawnEnemyBullet(col * 48, e.y + 24, Math.PI / 2, 245, { r: 5.2, kind: 'bead', delay: (col % 3) * .08, source: e.id });
        }
        e.fire = 1.72;
      }
      if (e.age > 10.5) e.leaving = true;
    } else if (e.type === 'signaltripod') {
      if (!e.leaving) e.y = lerp(e.y, 190 + (e.lane % 4) * 75, 1 - Math.exp(-2.2 * dt));
      e.x += Math.sin(e.age * .7 + e.seed) * 25 * dt;
      if (e.fire <= 0) {
        const aim = angleTo(e.x, e.y, player.x, player.y);
        const hinge = Math.floor(e.age) % 2 ? Math.PI / 2 : -Math.PI / 2;
        for (let i = -4; i <= 4; i++) spawnEnemyBullet(e.x, e.y, aim + i * .11, 230 + Math.abs(i) * 12, { r: 4.8, kind: 'thorn', delay: .48, hingeAt: .42, hingeAngle: hinge, hinge2At: .78, hinge2Angle: -hinge, source: e.id });
        e.fire = 1.55;
      }
      if (e.age > 10) e.leaving = true;
    } else if (e.type === 'tramcentipede') {
      e.x += e.side * 72 * dt; e.y += Math.sin(e.age * 1.3 + e.seed) * 20 * dt;
      if (e.fire <= 0) {
        for (let seg = -3; seg <= 3; seg++) {
          const sx = e.x - e.side * seg * 22, sy = e.y + seg * 7;
          const aim = angleTo(sx, sy, player.x, player.y);
          const hinge = ((seg + e.lane) % 2 ? 1 : -1) * Math.PI / 2;
          spawnEnemyBullet(sx, sy, aim, 245 + Math.abs(seg) * 12, { r: 5.2, kind: seg % 2 ? 'bead' : 'drop', delay: .46 + (seg + 3) * .045, hingeAt: .4, hingeAngle: hinge, hinge2At: .72, hinge2Angle: -hinge, source: e.id });
        }
        e.fire = 1.2;
      }
    } else if (e.type === 'skyscrivener') {
      e.x += e.side * 88 * dt; e.y += Math.sin(e.age * 1.25 + e.seed) * 35 * dt;
      if (e.fire <= 0) {
        const aim = angleTo(e.x, e.y, player.x, player.y);
        for (let i = -4; i <= 4; i++) spawnEnemyBullet(e.x, e.y, aim + i * .13, 205, { r: 5.2, kind: 'seed', turn: e.side * (.12 + i * .015), turnTime: 1.55, delay: Math.abs(i) * .04, source: e.id });
        e.fire = 1.46;
      }
    } else if (e.type === 'shedling') {
      e.y += 122 * dt; e.x += Math.sin(e.age * 2.2 + e.seed) * 66 * dt;
      if (e.fire <= 0 && e.y < 710) {
        const ox = e.x, oy = e.y;
        for (let i = -4; i <= 4; i++) spawnEnemyBullet(ox + i * 23, oy, Math.PI / 2, 85, { r: 4.7, kind: 'thorn', delay: .75 + Math.abs(i) * .035, accel: 260, source: e.id });
        e.fire = 1.65;
      }
    } else if (e.type === 'sunbladder') {
      if (!e.leaving) e.y = lerp(e.y, 165 + (e.lane % 3) * 88, 1 - Math.exp(-1.6 * dt));
      e.x = e.baseX + Math.sin(e.age * .62 + e.seed) * 52;
      if (e.fire <= 0) {
        for (let i = 0; i < 18; i++) {
          const a = Math.PI / 2 + (i - 8.5) * .14;
          spawnEnemyBullet(e.x + (i - 8.5) * 5, e.y, a, 105 + (i % 3) * 22, { r: 6.2, kind: 'bell', radial: { x: W / 2, y: 130, strength: 350 }, maxSpeed: 365, delay: .42 + (i % 3) * .06, source: e.id });
        }
        e.fire = 2.6;
      }
      if (e.age > 11) e.leaving = true;
    } else if (e.type === 'migrationthorn') {
      e.x += e.side * 105 * dt; e.y += Math.sin(e.age * 2 + e.seed) * 42 * dt;
      if (e.fire <= 0) {
        const base = Math.PI / 2 - e.side * .12;
        for (let i = -5; i <= 5; i++) {
          if (Math.abs(i) === 1) continue;
          const curve = e.side * (.72 + Math.abs(i) * .025);
          spawnEnemyBullet(e.x, e.y, base + i * .075, 245 + Math.abs(i) * 12, { r: 4.8, kind: i % 2 ? 'thorn' : 'seed', delay: .34, turn: curve, turnFlipAt: .36, turnAfter: -curve, turnEnd: .72, source: e.id });
        }
        e.fire = 1.18;
      }
    }

    if (world.zone === 0) e.x += motion.currentX * dt;
    else if (world.zone === 1) e.y += motion.currentY * .22 * dt;
    else if (world.zone === 2) {
      const heartbeat = motion.currentX * dt;
      e.x += heartbeat;
      e.baseX += heartbeat;
    }
    if (e.leaving) e.y -= 180 * dt;
    if (world.zone === 5) rollFirstBlueEnemy(e, motion.blueRoll);
    if (e.x < -130 || e.x > W + 130 || e.y < -180 || e.y > H + 140) e.dead = true;
  }

  function spawnBoss() {
    enemies.length = 0;
    world.phase = 'boss';
    world.bossIntro = 2.2;
    clearPhaseBullets();
    player.invuln = Math.max(player.invuln, 2.25);
    const config = bossConfigs[world.zone];
    const tunedHp = Math.max(1, Math.round(config.hp * BOSS_HP_SCALE));
    world.boss = {
      id: config.id, type: config.id, name: config.name, configIndex: world.zone, x: W / 2, y: -190,
      px: W / 2, py: -190, r: config.r, hp: tunedHp, maxHp: tunedHp, phase: 1,
      age: 0, phaseAge: 0, enter: 1.45, fire: .28, sub: 0, flash: 0, dead: false,
      hitPulse: 0, firePulse: 0,
      shieldPulse: 0, targetX: W / 2, targetY: 210, pendulum: 0, phaseShield: 0
    };
    sound.sfx('boss');
    addText(W / 2, 300, config.intro, '#ffc979', 1.45, 14);
  }

  function clearPhaseBullets() {
    let count = 0;
    for (const b of enemyBullets) {
      if (b.dead) continue;
      b.dead = true;
      count++;
      if (count <= 180) particles.push({ type: 'rain', x: b.x, y: b.y, vx: 0, vy: 140 + visualRng.range(0, 160), life: .9, max: .9, size: b.r * .7, color: '#ffd483' });
    }
    telegraphs.length = 0;
    world.score += count * 25;
  }

  function changeBossPhase(phase) {
    const b = world.boss;
    const config = bossConfigs[b.configIndex];
    b.phase = phase;
    b.phaseAge = 0;
    b.fire = .62;
    b.sub = 0;
    b.phaseShield = .72;
    clearPhaseBullets();
    world.flash = settings.reduced ? .06 : .16;
    world.flashColor = '#ffd483';
    world.shake = settings.reduced ? 2 : 10;
    sound.sfx('phase');
    addText(W / 2, 390, config.phases[phase - 1], '#ffd483', 1.15, 19);
  }

  function fitBossVisual(b) {
    const footprint = window.RAIN_ART && window.RAIN_ART.getBossVisualFootprint
      ? window.RAIN_ART.getBossVisualFootprint(b)
      : null;
    if (!footprint) return;
    const margin = 18;
    const halfWidth = footprint.width * .52;
    const halfHeight = footprint.height * .52;
    b.x = clamp(b.x, margin + halfWidth, W - margin - halfWidth);
    b.y = Math.max(b.y, margin + halfHeight - footprint.offsetY);
  }

  function updateTrawlmother(b) {
    b.pendulum = Math.sin(b.phaseAge * (b.phase === 3 ? 2.1 : 1.35));
    if (b.phase === 1) {
      b.x = W / 2 + Math.sin(b.phaseAge * .62) * 155;
      b.y = 205 + Math.sin(b.phaseAge * 1.1) * 24;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const missing = Math.floor(b.phaseAge * 1.3) % 7 - 3;
        for (let side = -1; side <= 1; side += 2) {
          const ox = b.x + side * 142, oy = b.y + 52;
          for (let i = -4; i <= 4; i++) {
            if (i === missing * side) continue;
            const a = Math.PI / 2 + i * .075 + side * .05;
            spawnEnemyBullet(ox, oy, a, 220 + Math.abs(i) * 18, { r: 5.2, kind: i % 2 ? 'bead' : 'drop', source: b.id });
          }
          const aim = angleTo(ox, oy, player.x, player.y);
          for (let j = -1; j <= 1; j++) spawnEnemyBullet(ox, oy, aim + j * .14, 315, { r: 5, kind: 'needle', source: b.id });
        }
        b.fire = .98;
      }
    } else if (b.phase === 2) {
      b.x = W / 2 + Math.sin(b.phaseAge * .73) * 210;
      b.y = 170 + Math.sin(b.phaseAge * 1.15) * 42;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const safeX = clamp(player.x + player.vx * .52, 76, W - 76);
        const secondSafeX = clamp(
          safeX + (safeX < W / 2 ? 300 : -300) + Math.sin(b.phaseAge * .31) * 24,
          76, W - 76
        );
        // A three-knot chain net folds twice as it descends.  Adjacent strands
        // alternate their hinges, leaving two broad, continuous tears in the
        // mesh instead of disguising a rain curtain as a trawl.
        for (let lane = 0; lane < 15; lane++) {
          const x = 30 + lane * 47;
          if (Math.abs(x - safeX) < 70 || Math.abs(x - secondSafeX) < 70) continue;
          const side = (lane + cycle) % 2 ? 1 : -1;
          for (let knot = 0; knot < 3; knot++) {
            spawnEnemyBullet(x + (knot - 1) * 4, -16 - knot * 7, Math.PI / 2 + side * .025, 226 + knot * 24, {
              r: knot === 1 ? 6.2 : 5.15, kind: knot === 1 ? 'bell' : (lane % 2 ? 'bead' : 'drop'),
              delay: .46 + lane * .018 + knot * .085,
              hingeAt: .7, hingeAngle: side * .24,
              hinge2At: 1.12, hinge2Angle: -side * .48,
              source: b.id
            });
          }
        }
        if (cycle % 2 === 0) {
          for (const side of [-1, 1]) {
            const ox = side < 0 ? -6 : W + 6;
            for (let i = 0; i < 8; i++) {
              const ty = 260 + i * 94;
              const a = angleTo(ox, b.y, W / 2 + side * 80, ty);
              spawnEnemyBullet(ox, b.y + side * 8, a, 222, {
                r: 4.9, kind: 'needle', delay: .42 + i * .055,
                turn: -side * .035, turnTime: 1.45, source: b.id
              });
            }
          }
        }
        b.fire = 1.3;
      }
    } else {
      b.x = W / 2 + Math.sin(b.phaseAge * .9) * 125;
      b.y = 190 + Math.sin(b.phaseAge * 1.7) * 27;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const dir = Math.floor(b.phaseAge / 4) % 2 ? 1 : -1;
        const base = b.phaseAge * .83 * dir;
        for (let arm = 0; arm < 7; arm++) {
          for (let j = 0; j < 3; j++) {
            const a = base + arm * TAU / 7 + j * .072 * dir;
            spawnEnemyBullet(b.x, b.y + 18, a, 155 + j * 46, { r: 4.8 + j, kind: j === 2 ? 'bead' : 'drop', turn: .14 * dir, source: b.id });
          }
        }
        aimedBurst(b, 9, .86, 325, { r: 4.4, kind: 'needle' });
        b.fire = .58;
      }
    }
  }

  function updateGardener(b) {
    if (b.phase === 1) {
      b.x = W / 2 + Math.sin(b.phaseAge * .58) * 180;
      b.y = 190 + Math.sin(b.phaseAge * 1.35) * 24;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const sweep = b.sub++ % 2 ? 1 : -1;
        for (const side of [-1, 1]) {
          const ox = b.x + side * 86, oy = b.y + 24;
          for (let finger = -4; finger <= 4; finger++) {
            const a = Math.PI / 2 + finger * .105 + side * .035;
            spawnEnemyBullet(ox + finger * 6, oy + Math.abs(finger) * 3, a, 180 + Math.abs(finger) * 15, {
              r: 5.1, kind: finger % 2 ? 'seed' : 'thorn', turn: sweep * side * .09, turnTime: 1.35, delay: Math.abs(finger) * .025, source: b.id
            });
          }
        }
        if (b.sub % 2 === 0) aimedBurst(b, 5, .54, 315, { r: 4.5, kind: 'needle' });
        b.fire = .78;
      }
    } else if (b.phase === 2) {
      b.x = W / 2 + Math.sin(b.phaseAge * .82) * 220;
      b.y = 164 + Math.cos(b.phaseAge * 1.1) * 33;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const safeX = clamp(player.x + player.vx * .24, 72, W - 72);
        const sweep = b.sub++ % 2;
        for (let x = 30; x < W; x += 36) {
          if (Math.abs(x - safeX) < 57) continue;
          spawnEnemyBullet(x, -14, Math.PI / 2 + (sweep ? .025 : -.025), 275, {
            r: 5.2, kind: x % 4 ? 'thorn' : 'seed', delay: ((x / 36 + sweep * 2) % 5) * .055, source: b.id
          });
        }
        for (const side of [-1, 1]) {
          for (let row = 0; row < 7; row++) {
            const sy = 285 + row * 97;
            spawnEnemyBullet(side < 0 ? -10 : W + 10, sy, side < 0 ? 0 : Math.PI, 205, {
              r: 4.7, kind: 'needle', delay: row * .045 + (sweep ? side > 0 ? .18 : 0 : side < 0 ? .18 : 0), source: b.id
            });
          }
        }
        b.fire = 1.08;
      }
    } else {
      b.x = W / 2 + Math.sin(b.phaseAge * 1.05) * 132;
      b.y = 182 + Math.sin(b.phaseAge * 1.9) * 29;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const offset = cycle * .19;
        for (let i = 0; i < 22; i++) {
          const a = offset + i * TAU / 22;
          spawnEnemyBullet(b.x, b.y + 8, a, 132 + (i % 2) * 34, {
            r: i % 3 ? 5.6 : 7, kind: i % 3 ? 'seed' : 'bell', turn: (cycle % 2 ? 1 : -1) * .06,
            turnTime: 1.7, split: i % 6 === 0 ? 1.2 + (i % 2) * .08 : 0,
            reverseAt: 1.95 + (i % 3) * .12, source: b.id
          });
        }
        if (cycle % 2 === 0) aimedBurst(b, 7, .72, 325, { r: 4.4, kind: 'thorn' });
        b.fire = .7;
      }
    }
  }

  function updateStag(b) {
    if (b.phase === 1) {
      b.x = W / 2 + Math.sin(b.phaseAge * .42) * 120;
      b.y = 182 + Math.sin(b.phaseAge * 1.05) * 18;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const gates = [54, 142, 230, 318, 406, 494, 582, 670];
        const predicted = clamp(player.x + player.vx * .72, 45, W - 45);
        let near = 0;
        for (let i = 1; i < gates.length; i++) if (Math.abs(gates[i] - predicted) < Math.abs(gates[near] - predicted)) near = i;
        const omit = new Set([near, (near + 4 + Math.floor(cycle / 4) % 2) % gates.length]);
        // Paired horn tips build a bone arcade across the whole stage.  Each
        // surviving gate receives a left and right rib, while two absent bays
        // remain traversable naves through consecutive volleys.
        for (let gate = 0; gate < gates.length; gate++) {
          if (omit.has(gate)) continue;
          for (const side of [-1, 1]) {
            const ox = b.x + side * (78 + gate % 3 * 12);
            const oy = b.y - 4 + gate % 3 * 12;
            for (let echo = 0; echo < 3; echo++) {
              const targetX = gates[gate] + side * (echo - 1) * 7;
              const a = angleTo(ox, oy, targetX, H + 28);
              spawnEnemyBullet(ox, oy, a, 184 + echo * 27, {
                r: 4.45 + echo * .22,
                kind: echo === 1 ? 'chime' : 'thorn',
                delay: .46 + gate * .025 + echo * .095,
                turn: side * (cycle % 2 ? .018 : -.018), turnTime: 1.65,
                source: b.id
              });
            }
          }
        }
        b.fire = 1.22;
      }
    } else if (b.phase === 2) {
      b.x = W / 2 + Math.sin(b.phaseAge * .52) * 175;
      b.y = 185 - 42 * Math.abs(Math.sin(Math.PI * b.phaseAge / .78));
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const bays = [70, 186, 302, 418, 534, 650];
        const predicted = clamp(player.x + player.vx * .72, 42, W - 42);
        let nearest = 0;
        for (let i = 1; i < bays.length; i++) if (Math.abs(bays[i] - predicted) < Math.abs(bays[nearest] - predicted)) nearest = i;
        const omit = new Set([nearest, (nearest + 3) % bays.length]);
        const archY = 220 + cycle % 2 * 145;
        // OSSUARY PROCESSION: complete rib gates materialize as warned arches
        // and descend intact.  Two opposite bays are physically absent from
        // every row, so the lattice offers architecture to navigate rather
        // than a prettier version of random ballistic rain.
        for (let bay = 0; bay < bays.length; bay++) {
          if (omit.has(bay)) continue;
          const points = [];
          for (let step = 0; step <= 6; step++) {
            const a = Math.PI + step * Math.PI / 6;
            points.push([bays[bay] + Math.cos(a) * 36, archY + 38 + Math.sin(a) * 38]);
          }
          for (let rib = 0; rib < 3; rib++) {
            const y = archY + 64 + rib * 29;
            points.push([bays[bay] - 36, y], [bays[bay] + 36, y]);
          }
          for (let point = 0; point < points.length; point++) {
            const [px, py] = points[point];
            const keystone = point === 3;
            spawnEnemyBullet(px, py, Math.PI / 2, 68, {
              vx: 0, vy: 68, gravityY: 72, maxSpeed: 240,
              r: keystone ? 6 : 4.55 + point % 2 * .25,
              kind: keystone ? 'chime' : (point % 2 ? 'thorn' : 'bead'),
              delay: .64 + point * .006, life: 7.6, source: b.id
            });
          }
          telegraphs.push({
            type: 'route',
            points: [
              [bays[bay] - 36, archY + 122], [bays[bay] - 36, archY + 38],
              [bays[bay] - 31, archY + 19], [bays[bay], archY], [bays[bay] + 31, archY + 19],
              [bays[bay] + 36, archY + 38], [bays[bay] + 36, archY + 122]
            ],
            life: .64, max: .64, source: b
          });
        }
        b.fire = 1.55;
      }
    } else {
      b.x = W / 2 + Math.sin(b.phaseAge * .92) * 115;
      b.y = 195 + Math.sin(b.phaseAge * 1.7) * 22;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const bays = [70, 186, 302, 418, 534, 650];
        const predicted = clamp(player.x + player.vx * .76, 42, W - 42);
        let nearest = 0;
        for (let i = 1; i < bays.length; i++) if (Math.abs(bays[i] - predicted) < Math.abs(bays[nearest] - predicted)) nearest = i;
        const omit = new Set([nearest, (nearest + 3) % bays.length]);
        const top = 245 + cycle % 2 * 118;
        const drift = cycle % 2 ? 28 : -28;
        // COLLAPSING NAVE: two complete rhombus courses translate as intact
        // woven panels.  Adjacent cells share their scale, while two opposite
        // missing bays become broad moving corridors through every course.
        for (let tier = 0; tier < 2; tier++) {
          const centerY = top + tier * 270;
          for (let bay = 0; bay < bays.length; bay++) {
            if (omit.has(bay)) continue;
            const halfW = 58, halfH = 76;
            const corners = [[0, -halfH], [halfW, 0], [0, halfH], [-halfW, 0]];
            for (let edge = 0; edge < corners.length; edge++) {
              const from = corners[edge], to = corners[(edge + 1) % corners.length];
              for (let step = 0; step < 3; step++) {
                const t = step / 3;
                const x = bays[bay] + lerp(from[0], to[0], t);
                const y = centerY + lerp(from[1], to[1], t);
                spawnEnemyBullet(x, y, Math.PI / 2, 92, {
                  vx: drift, vy: 92,
                  r: step === 0 ? 5.65 : 4.7,
                  kind: step === 0 ? 'chime' : ((edge + tier) % 2 ? 'thorn' : 'bead'),
                  delay: .7 + tier * .06, life: 8.2, source: b.id
                });
              }
            }
            telegraphs.push({
              type: 'route',
              points: corners.concat([corners[0]]).map(([x, y]) => [bays[bay] + x, centerY + y]),
              life: .7 + tier * .06, max: .7 + tier * .06, source: b
            });
          }
        }
        b.fire = 1.75;
      }
    }
  }

  function updateThroats(b) {
    if (b.phase === 1) {
      b.x = W / 2 + Math.sin(b.phaseAge * .48) * 118;
      b.y = 185 + Math.sin(b.phaseAge * .92) * 34;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const firstTarget = clamp(player.x + player.vx * .68, 64, W - 64);
        const secondTarget = clamp(firstTarget + (firstTarget < W / 2 ? 292 : -292), 64, W - 64);
        const gaps = [
          angleTo(b.x, b.y, firstTarget, H + 38),
          angleTo(b.x, b.y, secondTarget, H + 38)
        ];
        // Nine mouths share one breathing halo: nested lower semicircles exhale
        // on alternating speeds while four large chimes visibly inhale.  The
        // two missing arcs are real routes through every concentric shell.
        for (let i = 0; i < 36; i++) {
          const a = .1 + i * (Math.PI - .2) / 35;
          if (gaps.some((gap) => Math.abs(shortestAngle(a, gap)) < .092)) continue;
          const throat = (i + cycle * 2) % 9;
          const ox = b.x + (throat - 4) * 21;
          const oy = b.y + 24 + Math.abs(throat - 4) * 5;
          const inhale = i % 9 === 0;
          spawnEnemyBullet(ox, oy, a, 158 + cycle % 3 * 13 + i % 2 * 42, {
            r: inhale ? 6.25 : 4.65 + i % 3 * .16,
            kind: inhale ? 'bell' : (i % 2 ? 'chime' : 'drop'),
            delay: .42 + (i % 6) * .035,
            turn: (cycle % 2 ? 1 : -1) * .022, turnTime: 1.7,
            reverseAt: inhale ? 2.34 : 0,
            source: b.id
          });
        }
        b.fire = .72;
      }
    } else if (b.phase === 2) {
      b.x = W / 2 + Math.sin(b.phaseAge * .76) * 205;
      b.y = 177 + Math.cos(b.phaseAge * 1.42) * 25;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const rows = Array.from({ length: 9 }, (_, i) => 280 + i * 82);
        const predictedY = clamp(player.y + player.vy * .52, rows[0], rows[rows.length - 1]);
        let near = 0;
        for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i] - predictedY) < Math.abs(rows[near] - predictedY)) near = i;
        const omit = new Set([near, (near + 4 + Math.floor(cycle / 3) % 2) % rows.length]);
        // Opposed lips close, hold, and reopen in broad horizontal valves.  Two
        // omitted rows migrate between breaths, making the safe spaces part of
        // the organ's peristalsis rather than a lucky gap in scattered fire.
        for (let row = 0; row < rows.length; row++) {
          if (omit.has(row)) continue;
          for (const side of [-1, 1]) {
            const ox = side < 0 ? -14 : W + 14;
            for (let echo = 0; echo < 3; echo++) {
              spawnEnemyBullet(ox - side * echo * 5, rows[row] + (echo - 1) * 6, side < 0 ? 0 : Math.PI, 208 + echo * 18, {
                r: echo === 1 ? 5.85 : 4.75,
                kind: echo === 1 ? 'bell' : (row % 2 ? 'drop' : 'chime'),
                delay: .42 + row * .022 + echo * .095,
                stopAt: .95 + echo * .08, stopDuration: .32,
                resumeSpeed: 232 + echo * 14, reverseAt: 2.15 + echo * .08,
                source: b.id
              });
            }
          }
        }
        b.fire = 1.5;
      }
    } else {
      b.x = W / 2 + Math.sin(b.phaseAge * 1.06) * 145;
      b.y = 188 + Math.sin(b.phaseAge * 1.86) * 30;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const gates = Array.from({ length: 9 }, (_, i) => 58 + i * 75.5);
        const predicted = clamp(player.x + player.vx * .78, 45, W - 45);
        let near = 0;
        for (let i = 1; i < gates.length; i++) if (Math.abs(gates[i] - predicted) < Math.abs(gates[near] - predicted)) near = i;
        const omit = new Set([near, (near + 4 + Math.floor(cycle / 6) % 2) % gates.length]);
        // The final choir gives every mouth a coherent vocal ribbon.  Registers
        // share a sinusoidal phase per throat, so the screen reads as nine
        // braided voices with two deliberately silent columns.
        for (let throat = 0; throat < 9; throat++) {
          if (omit.has(throat)) continue;
          const ox = b.x + (throat - 4) * 22;
          const oy = b.y + 25 + Math.abs(throat - 4) * 4;
          for (let register = 0; register < 4; register++) {
            const a = angleTo(ox, oy, gates[throat] + (register - 1.5) * 5, H + 30);
            spawnEnemyBullet(ox, oy, a, 205 + register * 26, {
              r: 4.35 + register * .2,
              kind: register === 1 ? 'chime' : (register % 2 ? 'bead' : 'drop'),
              delay: .36 + throat * .022 + register * .1,
              shearAmp: (throat % 2 ? 1 : -1) * (168 + register * 18), shearFreq: 4.35,
              shearPhase: cycle * .34 + throat * TAU / 9 + register * .48,
              maxSpeed: 345, source: b.id
            });
          }
        }
        b.fire = .66;
      }
    }
  }

  function updateCityBoss(b) {
    if (b.phase === 1) {
      b.x = W / 2 + Math.sin(b.phaseAge * .31) * 55;
      b.y = 183 + Math.sin(b.phaseAge * 1.1) * 24;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const predicted = clamp(player.x + player.vx * .65, 45, W - 45);
        const candidates = Array.from({ length: 6 }, (_, i) => ({ i, x: 80 + i * 112 }));
        const nearest = [...candidates].sort((a, c) => Math.abs(a.x - predicted) - Math.abs(c.x - predicted))[0].i;
        const omit = new Set([nearest, (nearest + 3) % candidates.length]);
        for (const { i, x } of candidates) {
          if (omit.has(i)) continue;
          const side = (i + cycle) % 2 ? 1 : -1;
          // Two parallel rails carry four-car consists around hard right-angle
          // streets.  The missing routes stay opposite one another, so the
          // player always reads two genuine avenues through the traffic plan.
          for (const track of [-1, 1]) {
            for (let car = 0; car < 4; car++) {
              spawnEnemyBullet(x + track * 7, -16 - car * 5, Math.PI / 2, 238 + car * 14, {
                r: car === 1 || car === 2 ? 5.35 : 4.7,
                kind: car % 2 ? 'chime' : 'bead',
                delay: .54 + i * .02 + car * .09 + (track > 0 ? .035 : 0),
                hingeAt: .4, hingeAngle: side * Math.PI / 2,
                hinge2At: .78, hinge2Angle: -side * Math.PI / 2,
                source: b.id
              });
            }
          }
          telegraphs.push({ type: 'route', points: [[x, -12], [x, 88], [x + side * 96, 88], [x + side * 96, 390]], life: .7, max: .7, source: b });
        }
        b.fire = 1.18;
      }
    } else if (b.phase === 2) {
      b.x = W / 2 + Math.sin(b.phaseAge * .5) * 168;
      b.y = 165 + Math.cos(b.phaseAge * 1.18) * 30;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const shafts = [72, 168, 264, 360, 456, 552, 648];
        let nearest = 0;
        const predicted = clamp(player.x + player.vx * .9, 45, W - 45);
        for (let i = 1; i < shafts.length; i++) if (Math.abs(shafts[i] - predicted) < Math.abs(shafts[nearest] - predicted)) nearest = i;
        const omit = new Set([nearest, (nearest + 3 + Math.floor(cycle / 4) % 2) % shafts.length]);
        // Elevator banks descend on paired cables, arrest at four legible
        // floors, then drop together.  Empty shafts are the moving corridors.
        for (let shaft = 0; shaft < shafts.length; shaft++) {
          if (omit.has(shaft)) continue;
          for (const rail of [-1, 1]) {
            for (let floor = 0; floor < 4; floor++) {
              spawnEnemyBullet(shafts[shaft] + rail * 7, -18 - floor * 9, Math.PI / 2, 218 + floor * 18, {
                r: floor === 1 || floor === 2 ? 5.35 : 4.65,
                kind: floor % 2 ? 'chime' : 'bead',
                delay: .46 + shaft * .02 + floor * .075 + (rail > 0 ? .03 : 0),
                stopAt: .78 + floor * .22, stopDuration: .42,
                resumeSpeed: 288 + floor * 10, source: b.id
              });
            }
          }
          telegraphs.push({ type: 'route', points: [[shafts[shaft], -12], [shafts[shaft], 250], [shafts[shaft], 520]], life: .66, max: .66, source: b });
        }
        b.fire = 1.48;
      }
    } else if (b.phase === 3) {
      b.x = W / 2 + Math.sin(b.phaseAge * .9) * 175;
      b.y = 177 + Math.sin(b.phaseAge * 1.55) * 26;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const direction = Math.floor(cycle / 2) % 4;
        const ga = direction * Math.PI / 2;
        const rooms = [70, 186, 302, 418, 534, 650];
        const predicted = clamp(player.x + player.vx * .85, 42, W - 42);
        let nearest = 0;
        for (let i = 1; i < rooms.length; i++) if (Math.abs(rooms[i] - predicted) < Math.abs(rooms[nearest] - predicted)) nearest = i;
        const omit = new Set([nearest, (nearest + 3) % rooms.length]);
        const roomY = 390 + cycle % 2 * 190;
        const spin = (cycle % 2 ? 1 : -1) * .24;
        for (let room = 0; room < rooms.length; room++) {
          if (omit.has(room)) continue;
          const points = [];
          for (let edge = 0; edge < 5; edge++) {
            const px = rooms[room] - 34 + edge * 17;
            points.push([px, roomY - 72], [px, roomY + 72]);
          }
          for (let edge = 1; edge < 4; edge++) {
            const py = roomY - 72 + edge * 36;
            points.push([rooms[room] - 34, py], [rooms[room] + 34, py]);
          }
          for (let point = 0; point < points.length; point++) {
            const [px, py] = points[point];
            const vx = Math.cos(ga) * 44 - (py - roomY) * spin;
            const vy = Math.sin(ga) * 44 + (px - rooms[room]) * spin;
            spawnEnemyBullet(px, py, Math.atan2(vy, vx), Math.hypot(vx, vy), {
              vx, vy, r: point % 5 === 0 ? 5.6 : 4.65,
              kind: point % 5 === 0 ? 'chime' : (point % 2 ? 'seed' : 'bead'),
              gravityX: Math.cos(ga) * 82,
              gravityY: Math.sin(ga) * 82 + 28,
              maxSpeed: 245, delay: .66 + point * .008, life: 7.4, source: b.id
            });
          }
          telegraphs.push({
            type: 'route',
            points: [[rooms[room] - 34, roomY - 72], [rooms[room] + 34, roomY - 72], [rooms[room] + 34, roomY + 72], [rooms[room] - 34, roomY + 72], [rooms[room] - 34, roomY - 72]],
            life: .72, max: .72, source: b
          });
        }
        b.fire = 1.55;
      }
    } else {
      b.x = W / 2 + Math.sin(b.phaseAge * 1.05) * 126;
      b.y = 185 + Math.sin(b.phaseAge * 2.05) * 31;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const aim = angleTo(b.x, b.y, player.x, player.y);
        for (let i = 0; i < 30; i++) {
          const a = cycle * .21 + i * TAU / 30;
          if (Math.abs(shortestAngle(a, aim)) < .2) continue;
          spawnEnemyBullet(b.x, b.y, a, 145 + (i % 2) * 72, {
            r: i % 5 ? 5.2 : 7.4, kind: i % 5 ? 'bead' : 'bell', reverseAt: i % 5 === 0 ? 2.15 : 0,
            turn: (cycle % 2 ? .05 : -.05), turnTime: 1.5, source: b.id
          });
        }
        if (cycle % 3 === 2) aimedBurst(b, 9, .82, 370, { r: 4.1, kind: 'needle', delay: .1 });
        b.fire = .56;
      }
    }
  }

  function updateCrown(b) {
    if (b.phase === 1) {
      b.x = W / 2 + Math.sin(b.phaseAge * .38) * 135;
      b.y = 165 + Math.sin(b.phaseAge * .9) * 24;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const gates = [64, 163, 262, 360, 458, 557, 656];
        const predicted = clamp(player.x + player.vx * .82, 45, W - 45);
        let nearest = 0;
        for (let i = 1; i < gates.length; i++) if (Math.abs(gates[i] - predicted) < Math.abs(gates[nearest] - predicted)) nearest = i;
        const omit = new Set([nearest, (nearest + 3 + Math.floor(cycle / 5) % 2) % gates.length]);
        // Five jeweled rays grow from every dangerous socket at once.  Their
        // matched S-curves read as a seven-point coronation fan, with two crown
        // points physically absent to preserve migrating horizon corridors.
        for (let socket = 0; socket < gates.length; socket++) {
          if (omit.has(socket)) continue;
          const ox = b.x + (socket - 3) * 26;
          const oy = b.y + 30 + Math.abs(socket - 3) * 4;
          const curve = (socket % 2 ? 1 : -1) * .42;
          for (let jewel = 0; jewel < 5; jewel++) {
            const aim = angleTo(ox, oy, gates[socket] + (jewel - 2) * 7, H + 24);
            spawnEnemyBullet(ox, oy, aim, 212 + jewel * 21, {
              r: jewel === 2 ? 5.75 : 4.2 + jewel * .13,
              kind: jewel === 2 ? 'bell' : (jewel % 2 ? 'thorn' : 'chime'),
              color: jewel === 2 ? '#ffd270' : (socket % 2 ? '#ff7596' : '#d9fdff'),
              delay: .44 + socket * .022 + jewel * .075,
              turn: curve, turnFlipAt: .5, turnAfter: -curve, turnEnd: 1.02,
              source: b.id
            });
          }
        }
        b.fire = .68;
      }
    } else if (b.phase === 2) {
      b.x = W / 2 + Math.sin(b.phaseAge * .56) * 148;
      b.y = 168 + Math.sin(b.phaseAge * 1.7) * 34;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const f1 = { x: b.x - 110, y: b.y + 120 }, f2 = { x: b.x + 110, y: b.y + 120 };
        const gates = [60, 160, 260, 360, 460, 560, 660];
        const predicted = clamp(player.x + player.vx * .88, 45, W - 45);
        let nearest = 0;
        for (let i = 1; i < gates.length; i++) if (Math.abs(gates[i] - predicted) < Math.abs(gates[nearest] - predicted)) nearest = i;
        const omit = new Set([nearest, (nearest + 3 + Math.floor(cycle / 5) % 2) % gates.length]);
        // The molting skin peels from two luminous foci.  Oppositely charged
        // four-bead bands braid toward the same five gates, making the dipole
        // field visible in the projectile architecture rather than as garnish.
        for (const [focusIndex, focus] of [f1, f2].entries()) {
          const side = focusIndex ? 1 : -1;
          for (let gate = 0; gate < gates.length; gate++) {
            if (omit.has(gate)) continue;
            for (let thread = 0; thread < 4; thread++) {
              const a = angleTo(focus.x, focus.y, gates[gate] + (thread - 1.5) * 8, H + 28);
              spawnEnemyBullet(focus.x + side * thread * 3, focus.y + (thread - 1.5) * 5, a, 168 + thread * 27, {
                r: thread === 1 || thread === 2 ? 5.2 : 4.3,
                kind: thread === 1 || thread === 2 ? 'chime' : (gate % 2 ? 'drop' : 'seed'),
                color: thread === 1 || thread === 2 ? '#ff7596' : (side < 0 ? '#d8fdff' : '#ffd270'),
                delay: .5 + gate * .022 + thread * .095 + focusIndex * .04,
                maxSpeed: 360,
                dipole: {
                  x1: f1.x, y1: f1.y, x2: f2.x, y2: f2.y,
                  strength: 165, charge: side * ((gate + thread) % 2 ? 1 : -1), down: 54
                },
                source: b.id
              });
            }
          }
        }
        telegraphs.push({ type: 'field', points: [[f1.x, f1.y], [f2.x, f2.y]], life: .82, max: .82, source: b });
        b.fire = .78;
      }
    } else if (b.phase === 3) {
      b.x = W / 2 + Math.sin(b.phaseAge * .32) * 120;
      b.y = 184 + Math.cos(b.phaseAge * 1.95) * 29;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        const lensX = W / 2 + Math.sin(b.phaseAge * .32) * 120;
        const lensY = 520, radius = 172;
        const gates = [80, 173, 267, 360, 453, 547, 640];
        const predicted = clamp(player.x + player.vx * .9, 45, W - 45);
        const nearest = [...gates.keys()].sort((a, c) => Math.abs(gates[a] - predicted) - Math.abs(gates[c] - predicted))[0];
        const omit = new Set([nearest, (nearest + 3 + Math.floor(cycle / 5) % 2) % gates.length]);
        for (let i = 0; i < gates.length; i++) {
          if (omit.has(i)) continue;
          for (const strand of [-1, 1]) {
            const ox = b.x + (i - 3) * 18 + strand * 7;
            const oy = b.y + 30 + strand * 3;
            for (let echo = 0; echo < 3; echo++) {
              const aim = angleTo(ox, oy, gates[i] + strand * (15 + echo * 3), H + 24);
              spawnEnemyBullet(ox, oy, aim, 232 + echo * 27, {
                r: echo === 1 ? 5.05 : 4.15,
                kind: echo === 1 ? 'chime' : (i % 2 ? 'thorn' : 'seed'),
                color: strand < 0 ? '#d9fdff' : (echo === 1 ? '#ffd270' : '#ff7596'),
                delay: .54 + i * .022 + echo * .09 + (strand > 0 ? .04 : 0),
                refractY: lensY, refractX: lensX, refractRadius: radius,
                refractSide: strand, source: b.id
              });
            }
          }
        }
        if (cycle % 2 === 0) {
          const corridorAngles = [...omit].map((index) => angleTo(lensX, lensY, gates[index], H + 24));
          for (let jewel = 0; jewel < 20; jewel++) {
            const a = jewel * TAU / 20 + cycle * .11;
            if (corridorAngles.some((gap) => Math.abs(shortestAngle(a, gap)) < .13)) continue;
            const ox = lensX + Math.cos(a) * radius;
            const oy = lensY + Math.sin(a) * radius;
            spawnEnemyBullet(ox, oy, a, 128 + jewel % 2 * 22, {
              r: jewel % 5 === 0 ? 5.6 : 4.1,
              kind: jewel % 5 === 0 ? 'bell' : (jewel % 2 ? 'chime' : 'bead'),
              color: jewel % 5 === 0 ? '#ffd270' : (jewel % 2 ? '#d9fdff' : '#ff7596'),
              delay: .78, turn: cycle % 4 < 2 ? .028 : -.028, turnTime: 1.35,
              life: 5.4, source: b.id
            });
          }
        }
        telegraphs.push({ type: 'lens', x: lensX, y: lensY, r: radius, life: .78, max: .78, source: b });
        b.fire = .94;
      }
    } else {
      b.x = W / 2 + Math.sin(b.phaseAge * .72) * 112;
      b.y = 175 + Math.sin(b.phaseAge * 1.6) * 28;
      fitBossVisual(b);
      if (b.fire <= 0) {
        const cycle = b.sub++;
        // THE FIRST BLUE: concentric eclipse shells remain legible because two
        // routes are physically absent from every halo. Their targets migrate
        // slowly enough that consecutive gaps overlap, producing continuous
        // player-sized corridors instead of a momentary decorative opening.
        const corridorY = H + 70;
        const leftTarget = clamp(172 + Math.sin(b.phaseAge * .34) * 62, 86, 284);
        const rightTarget = clamp(548 + Math.sin(b.phaseAge * .29 + 2.35) * 62, 436, 634);
        const corridorAngles = [
          angleTo(b.x, b.y, leftTarget, corridorY),
          angleTo(b.x, b.y, rightTarget, corridorY)
        ];
        const haloRotation = cycle * .173 + b.phaseAge * .055;
        const crownNotch = -Math.PI / 2 + Math.sin(b.phaseAge * .22) * .21;
        const haloRadius = 112 + cycle % 3 * 13;
        const haloSpeed = 154 + cycle % 3 * 16;
        const haloTurn = cycle % 4 < 2 ? .042 : -.042;
        for (let i = 0; i < 40; i++) {
          const a = haloRotation + i * TAU / 40;
          if (corridorAngles.some((gap) => Math.abs(shortestAngle(a, gap)) < .098) ||
              Math.abs(shortestAngle(a, crownNotch)) < .086) continue;
          const ox = b.x + Math.cos(a) * haloRadius;
          const oy = b.y + Math.sin(a) * haloRadius;
          const jewel = i % 6 === 0;
          spawnEnemyBullet(ox, oy, a, haloSpeed, {
            r: jewel ? 5.8 : 4.35 + i % 3 * .16,
            kind: jewel ? 'bell' : (i % 2 ? 'chime' : 'bead'),
            color: jewel ? '#ffd270' : (i % 2 ? '#ff6f91' : '#c9fbff'),
            turn: haloTurn, turnTime: 1.55, life: 7.2, source: b.id
          });
        }

        // Every second shell grows five or fewer feathered prism spokes through
        // the dangerous bands between the corridors. The rail and its bullets
        // share one exact line, so the richer telegraph remains mechanically
        // honest; three offset feathers launch together after it contracts.
        if (cycle % 2 === 0) {
          const spokeY = 760;
          const corridorAtSpoke = [leftTarget, rightTarget].map((targetX) => (
            b.x + (targetX - b.x) * (spokeY - b.y) / (corridorY - b.y)
          ));
          const spokeTargets = [70, 166, 262, 358, 454, 550, 646];
          for (let i = 0; i < spokeTargets.length; i++) {
            const tx = spokeTargets[i] + Math.sin(b.phaseAge * .41 + i * 1.7) * 16;
            if (corridorAtSpoke.some((gapX) => Math.abs(tx - gapX) < 72)) continue;
            const a = angleTo(b.x, b.y, tx, spokeY);
            const railStart = [b.x + Math.cos(a) * 106, b.y + Math.sin(a) * 106];
            for (let feather = 0; feather < 3; feather++) {
              const radius = 106 + feather * 24;
              const ox = b.x + Math.cos(a) * radius;
              const oy = b.y + Math.sin(a) * radius;
              spawnEnemyBullet(ox, oy, a, 304 + feather * 24, {
                r: 4.05 + feather * .24,
                kind: feather === 1 ? 'needle' : 'seed',
                color: feather === 0 ? '#ffd270' : (feather === 1 ? '#e9ffff' : '#ff7596'),
                delay: .58, life: 5.2, source: b.id
              });
            }
            telegraphs.push({
              type: 'eclipseRail', points: [railStart, [tx, spokeY]],
              life: .58, max: .58, source: b, phase: cycle + i * .17
            });
          }
        }
        b.fire = .98;
      }
    }
  }

  function updateBoss(dt) {
    const b = world.boss;
    if (!b || b.dead) return;
    b.px = b.x; b.py = b.y;
    b.age += dt; b.phaseAge += dt;
    b.flash = Math.max(0, b.flash - dt);
    b.hitPulse = Math.max(0, (b.hitPulse || 0) - dt);
    b.firePulse = Math.max(0, (b.firePulse || 0) - dt * 3.8);
    b.shieldPulse = Math.max(0, (b.shieldPulse || 0) - dt * 5.5);
    b.phaseShield = Math.max(0, b.phaseShield - dt);
    if (b.enter > 0) {
      b.enter -= dt;
      b.y = lerp(b.y, 205, 1 - Math.exp(-2.3 * dt));
      return;
    }

    const config = bossConfigs[b.configIndex];
    if (b.hp <= 0) { defeatBoss(); return; }
    const threshold = config.thresholds[b.phase - 1];
    if (threshold != null && b.hp <= b.maxHp * threshold) changeBossPhase(b.phase + 1);
    b.fire -= dt / BOSS_FIRE_INTERVAL_SCALE;

    if (b.configIndex === 0) updateTrawlmother(b);
    else if (b.configIndex === 1) updateGardener(b);
    else if (b.configIndex === 2) updateStag(b);
    else if (b.configIndex === 3) updateThroats(b);
    else if (b.configIndex === 4) updateCityBoss(b);
    else updateCrown(b);

    if (b.hp <= 0) defeatBoss();
  }

  function defeatBoss() {
    const b = world.boss;
    if (!b || b.dead) return;
    b.dead = true;
    clearPhaseBullets();
    world.bossDeath = BOSS_DEATH_DURATION;
    world.phase = 'bossDeath';
    world.score += 50000 + player.health * 7500;
    world.shake = settings.reduced ? 3 : 16;
    world.flash = settings.reduced ? .08 : .24;
    world.flashColor = '#fff2c3';
    for (let i = 0; i < 90; i++) {
      const a = visualRng.range(0, TAU), s = visualRng.range(45, 460);
      particles.push({ type: i % 3 ? 'rain' : 'shard', x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: visualRng.range(.7, 2.2), max: 2.2, size: visualRng.range(2, 11), color: i % 4 ? '#ffd483' : '#d9fbff' });
    }
    sound.sfx('bossDefeat');
    addText(W / 2, 360, bossConfigs[b.configIndex].defeat, '#fff0ba', 3, 25);
  }

  function damageEnemy(e, damage, x, y) {
    if (e.dead) return;
    if (e.phaseShield > 0) {
      e.shieldPulse = 1;
      if (world.shieldSound <= 0) {
        sound.sfx('shield', x);
        world.shieldSound = .09;
      }
      if (world.frame % 7 === 0) {
        particles.push({
          type: 'ring', x, y, vx: 0, vy: 0, life: .18, max: .18,
          size: 24, start: 3, color: '#fff0a8'
        });
      }
      return;
    }
    if (e === world.boss && e.captureLock && qaMode) {
      e.flash = .045;
      e.hitPulse = .08;
      return;
    }
    e.hp -= damage;
    e.flash = .08;
    e.hitPulse = .12;
    if (world.hitSound <= 0) { sound.sfx('hit', x); world.hitSound = .055; }
    if ((world.frame + Math.floor(e.hp)) % 3 === 0) burst(x, y, '#c9fbff', 1, 35, 1.7);
    if (e.hp <= 0 && e !== world.boss) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    world.chain = Math.min(99, world.chain + 1);
    world.chainTimer = 2.4;
    const reward = {
      skifftick: [900, 12], buoychoir: [2600, 22], netkite: [1600, 15], lanternray: [2300, 20],
      milkmoth: [950, 12], prunerhand: [1700, 16], pendulumbulb: [2750, 23], grafthound: [2100, 19],
      marrowskate: [1150, 13], spinetick: [1700, 16], bannerkite: [2200, 20], ribshepherd: [3250, 26],
      nacreleech: [1100, 13], ciliawheel: [2500, 22], valveray: [2350, 20], airpearl: [3050, 25],
      umbrellamite: [1000, 12], chimneyheron: [2550, 21], signaltripod: [2150, 18], tramcentipede: [4300, 32],
      skyscrivener: [2250, 19], shedling: [1150, 13], sunbladder: [4100, 31], migrationthorn: [2700, 23]
    }[e.type] || [1000, 12];
    const [value, burstCount] = reward;
    world.score += value * (1 + world.chain * .035);
    burst(e.x, e.y, '#ffd083', burstCount, 185 + burstCount * 2.8, 4 + Math.min(3, burstCount / 12));
    particles.push({
      type: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: burstCount >= 22 ? .38 : .25,
      max: burstCount >= 22 ? .38 : .25, size: Math.max(34, e.r * (burstCount >= 22 ? 2.4 : 1.7)),
      start: Math.max(5, e.r * .35), color: burstCount >= 22 ? '#fff0a8' : '#ffd083'
    });
    if (burstCount >= 22) world.shake = Math.max(world.shake, settings.reduced ? .6 : 1.8);
    sound.sfx(burstCount >= 22 ? 'heavyKill' : 'kill', e.x);
  }

  function damagePlayer() {
    if (player.invuln > 0 || player.dead || world.god) return;
    player.health--;
    player.invuln = HIT_RECOVERY_DURATION;
    player.hitPulse = .5;
    player.clearPulse = .42;
    player.wake.length = 0;
    player.wakeEcho.length = 0;
    world.chain = 0;
    world.chainTimer = 0;
    world.shake = settings.reduced ? 3 : 13;
    world.flash = settings.reduced ? .07 : .2;
    world.flashColor = '#ff746b';
    let cleared = 0;
    for (const b of enemyBullets) {
      if (!b.dead && dist2(b.x, b.y, player.x, player.y) < HIT_CLEAR_RADIUS ** 2) { b.dead = true; cleared++; burst(b.x, b.y, '#ffb18c', 1, 50, 2); }
    }
    burst(player.x, player.y, '#fff0d4', 30, 360, 7);
    sound.sfx('hurt');
    addText(player.x, player.y - 80, cleared ? `BREATH LOST · ${cleared} CLEARED` : 'BREATH LOST', '#ffb09f', 1.5, 14);
    if (player.health <= 0) {
      player.dead = true;
      player.invuln = 99;
      player.deathTimer = .82;
    }
  }

  function updateBullets(dt, motion) {
    const arenaCurrentX = world.zone === 0
      ? motion.currentX
      : world.zone === 2 ? motion.currentX
        : world.zone === 3 && dt > 0 ? motion.orbitX / dt
          : world.zone === 4 && dt > 0 ? motion.cityShift / dt : 0;
    const arenaCurrentY = world.zone === 1
      ? motion.currentY
      : world.zone === 3 && dt > 0 ? motion.orbitY / dt : 0;
    for (const b of enemyBullets) {
      if (b.dead) continue;
      b.px = b.x; b.py = b.y;
      if (b.zone === 5 && world.zone === 5) rollFirstBlueBullet(b, motion.blueRoll);
      b.age += dt;
      b.pluckPulse = Math.max(0, b.pluckPulse - dt);
      if (b.delay > 0) {
        b.delay -= dt;
        if ((b.zone === 0 || b.zone === 2 || b.zone === 3 || b.zone === 4) && b.zone === world.zone) b.x += arenaCurrentX * dt;
        if ((b.zone === 1 || b.zone === 3) && b.zone === world.zone) b.y += arenaCurrentY * dt;
        continue;
      }
      b.flightAge += dt;
      let turnRate = b.turn;
      if (b.turnFlipAt && b.flightAge > b.turnFlipAt) turnRate = b.turnAfter;
      if (b.turnEnd && b.flightAge > b.turnEnd) turnRate = 0;
      if (turnRate && (!b.turnTime || b.flightAge <= b.turnTime)) {
        b.angle += turnRate * dt;
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(b.angle) * speed; b.vy = Math.sin(b.angle) * speed;
      }
      if (b.hingeAt && !b.hinged && b.flightAge >= b.hingeAt) {
        b.hinged = true;
        b.angle += b.hingeAngle;
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(b.angle) * speed; b.vy = Math.sin(b.angle) * speed;
      }
      if (b.hinge2At && !b.hinged2 && b.flightAge >= b.hinge2At) {
        b.hinged2 = true;
        b.angle += b.hinge2Angle;
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(b.angle) * speed; b.vy = Math.sin(b.angle) * speed;
      }
      if (b.accel) {
        const s = Math.hypot(b.vx, b.vy) + b.accel * dt;
        b.vx = Math.cos(b.angle) * s; b.vy = Math.sin(b.angle) * s;
      }
      if (b.gravityX || b.gravityY) {
        b.vx += b.gravityX * dt; b.vy += b.gravityY * dt;
      }
      if (b.shearAmp) b.vx += b.shearAmp * Math.sin(b.flightAge * b.shearFreq + b.shearPhase) * dt;
      if (b.dipole) {
        const { x1, y1, x2, y2, strength, charge = 1, down = 45 } = b.dipole;
        const d1x = b.x - x1, d1y = b.y - y1, d2x = b.x - x2, d2y = b.y - y2;
        const l1 = Math.max(28, Math.hypot(d1x, d1y)), l2 = Math.max(28, Math.hypot(d2x, d2y));
        b.vx += charge * strength * (d1x / l1 - d2x / l2) * dt;
        b.vy += (charge * strength * (d1y / l1 - d2y / l2) + down) * dt;
      }
      if (b.radial) {
        const dx = b.x - b.radial.x, dy = b.y - b.radial.y, len = Math.max(24, Math.hypot(dx, dy));
        b.vx += dx / len * b.radial.strength * dt;
        b.vy += dy / len * b.radial.strength * dt;
      }
      if (b.maxSpeed) {
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > b.maxSpeed) { b.vx *= b.maxSpeed / speed; b.vy *= b.maxSpeed / speed; }
      }
      b.angle = Math.atan2(b.vy, b.vx);
      if (b.reverseAt && !b.reversed && b.flightAge >= b.reverseAt) {
        b.reversed = true; b.angle += Math.PI; b.vx *= -1; b.vy *= -1;
      }
      let moveBullet = true;
      if (b.stopAt && !b.stopDone && !b.stopped && b.flightAge >= b.stopAt) {
        b.stopped = true; b.stopTimer = b.stopDuration; b.stopDone = true;
      }
      if (b.stopped) {
        b.stopTimer -= dt;
        moveBullet = false;
        if (b.stopTimer <= 0) {
          b.stopped = false; moveBullet = true;
          if (b.resumeSpeed) {
            const current = Math.hypot(b.vx, b.vy) || 1;
            b.vx = b.vx / current * b.resumeSpeed; b.vy = b.vy / current * b.resumeSpeed;
          }
        }
      }
      if (moveBullet) {
        const currentX = (b.zone === 0 || b.zone === 2 || b.zone === 3 || b.zone === 4) && b.zone === world.zone ? arenaCurrentX : 0;
        const currentY = (b.zone === 1 || b.zone === 3) && b.zone === world.zone ? arenaCurrentY : 0;
        b.x += (b.vx + currentX) * dt; b.y += (b.vy + currentY) * dt;
      }
      const insideLens = !b.refractRadius || Math.abs(b.x - b.refractX) <= b.refractRadius;
      if (b.refractY && !b.refracted && insideLens && b.py < b.refractY && b.y >= b.refractY) {
        b.refracted = true;
        const speed = Math.hypot(b.vx, b.vy);
        const nvx = -.65 * b.vx + (b.refractSide || 1) * 190;
        const nvy = b.vy;
        const nlen = Math.hypot(nvx, nvy) || 1;
        b.vx = nvx / nlen * speed; b.vy = nvy / nlen * speed; b.angle = Math.atan2(b.vy, b.vx);
        burst(b.x, b.y, '#e8ffff', 4, 70, 2.2);
      }
      if (b.split && !b.splitDone && b.age > b.split) {
        b.splitDone = true;
        for (let i = -1; i <= 1; i += 2) spawnEnemyBullet(b.x, b.y, b.angle + i * .42, Math.hypot(b.vx, b.vy) * .8, {
          r: b.r * .72, kind: 'needle', source: b.source, splitChild: true, zone: b.zone
        });
      }
      const relAx = b.px - player.px, relAy = b.py - player.py;
      const relBx = b.x - player.x, relBy = b.y - player.y;
      const hit = player.radius + b.r * .72;
      const graze = hit + 23;
      const near2 = relativeSegmentDistanceSquared(relAx, relAy, relBx, relBy);

      if (!b.wakePlucked && b.delay <= 0 && player.wake.length > 1) {
        for (let i = player.wake.length - 2; i >= 0; i--) {
          const a = player.wake[i], c = player.wake[i + 1];
          const wakeAge = world.totalTime - c.t;
          if (wakeAge < .014 || wakeAge > .29 || dist2(a.x, a.y, c.x, c.y) < 2.5 ** 2) continue;
          if (Math.max(b.px, b.x) + b.r < Math.min(a.x, c.x) || Math.min(b.px, b.x) - b.r > Math.max(a.x, c.x) ||
              Math.max(b.py, b.y) + b.r < Math.min(a.y, c.y) || Math.min(b.py, b.y) - b.r > Math.max(a.y, c.y)) continue;
          const crossing = segmentIntersection(b.px, b.py, b.x, b.y, a.x, a.y, c.x, c.y);
          const touch = segmentDistanceSquared(b.px, b.py, b.x, b.y, a.x, a.y, c.x, c.y) <= (b.r + 2) ** 2;
          if (crossing || touch) { counterwakePluck(b, crossing || { x: (b.x + b.px) / 2, y: (b.y + b.py) / 2 }, wakeAge); break; }
        }
      }

      if (!b.grazed && near2 < graze * graze && near2 > hit * hit) {
        b.grazed = true;
        player.grazePulse = .22;
        world.score += 90 + world.chain * 4;
        world.chainTimer = Math.max(world.chainTimer, 1.1);
        if (world.grazeSound <= 0) {
          sound.sfx('graze', b.x);
          world.grazeSound = .055;
        }
        burst(b.x, b.y, '#d8fbff', 3, 65, 2);
      }
      if (near2 < hit * hit) { b.dead = true; damagePlayer(); }
      if (b.age > b.life || b.x < -90 || b.x > W + 90 || b.y < -110 || b.y > H + 110) b.dead = true;
    }

    for (const b of playerBullets) {
      if (b.dead) continue;
      b.px = b.x; b.py = b.y; b.age += dt;
      if (b.counter) {
        const target = nearestEnemy(b.x, b.y);
        if (target) {
          const desired = angleTo(b.x, b.y, target.x, target.y);
          const current = Math.atan2(b.vy, b.vx);
          const angle = current + shortestAngle(current, desired) * (1 - Math.exp(-6 * dt));
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const trailIndex = b.trailHead * 2;
      b.trail[trailIndex] = b.x;
      b.trail[trailIndex + 1] = b.y;
      b.trailHead = (b.trailHead + 1) % b.trailCapacity;
      if (b.trailCount < b.trailCapacity) b.trailCount++;
      let hit = null;
      if (world.boss && !world.boss.dead && world.boss.enter <= 0 && bossShotOverlap(b, world.boss)) hit = world.boss;
      if (!hit) {
        for (const e of enemies) {
          if (!e.dead && e.enter <= 0 && fieldEnemyShotOverlap(b, e)) { hit = e; break; }
        }
      }
      if (hit) { damageEnemy(hit, b.damage, b.x, b.y); b.dead = true; }
      if (b.age > b.life || b.x < -50 || b.x > W + 50 || b.y < -80 || b.y > H + 50) b.dead = true;
    }

    compactNotDead(enemyBullets);
    compactNotDead(playerBullets);
  }

  function bossShotOverlap(bullet, boss) {
    // The lethal/projectile-emitting core remains the guaranteed target, but
    // the painted bosses are much larger than that old circle. A conservative
    // central ellipse makes shots through solid visible anatomy register while
    // leaving decorative antlers, tendrils and corona outside the hurt body.
    const coreRadius = boss.r * .72 + bullet.r;
    if (dist2(bullet.x, bullet.y, boss.x, boss.y) < coreRadius * coreRadius) return true;
    const footprint = window.RAIN_ART?.getBossVisualFootprint?.(boss);
    if (!footprint) return false;
    const dx = bullet.x - boss.x;
    const dy = bullet.y - (boss.y + footprint.offsetY);
    const radiusX = Math.max(boss.r * .72, footprint.width * .3) + bullet.r;
    const radiusY = Math.max(boss.r * .72, footprint.height * .3) + bullet.r;
    return dx * dx / (radiusX * radiusX) + dy * dy / (radiusY * radiusY) < 1;
  }

  function fieldEnemyShotOverlap(bullet, enemy) {
    const footprint = window.RAIN_ART?.getFieldEnemyVisualFootprint?.(enemy);
    if (!footprint) return dist2(bullet.x, bullet.y, enemy.x, enemy.y) < (bullet.r + enemy.r * .78) ** 2;
    const dx = bullet.x - enemy.x;
    const dy = bullet.y - enemy.y;
    const cosine = Math.cos(footprint.rotation);
    const sine = Math.sin(footprint.rotation);
    const localX = dx * cosine + dy * sine;
    const localY = -dx * sine + dy * cosine;
    const radiusX = Math.max(enemy.r * .78, footprint.rx) + bullet.r;
    const radiusY = Math.max(enemy.r * .78, footprint.ry) + bullet.r;
    return localX * localX / (radiusX * radiusX) + localY * localY / (radiusY * radiusY) < 1;
  }

  function burst(x, y, color, count, speed, size) {
    const actual = settings.reduced ? Math.ceil(count * .45) : count;
    for (let i = 0; i < actual; i++) {
      const a = visualRng.range(0, TAU), s = visualRng.range(speed * .25, speed);
      particles.push({ type: i % 3 ? 'spark' : 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: visualRng.range(.18, .62), max: .62, size: visualRng.range(size * .4, size), color });
    }
  }

  function addText(x, y, text, color, life = 1, size = 14) {
    texts.push({ x, y, text, color, life, max: life, size });
  }

  function updateEffects(dt) {
    const horizontalDrag = Math.exp(-2.8 * dt);
    const verticalDrag = Math.exp(-1.6 * dt);
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= horizontalDrag;
      p.vy = p.vy * verticalDrag + (p.type === 'rain' ? 210 : 20) * dt;
    }
    compactPositiveLife(particles);
    for (const t of texts) { t.life -= dt; t.y -= 18 * dt; }
    compactPositiveLife(texts);
    for (const t of telegraphs) t.life -= dt;
    compactTelegraphs(telegraphs);
    for (const n of counterNeedles) {
      n.life -= dt;
      const emitter = findEmitter(n.source);
      if (emitter) { n.tx = emitter.x; n.ty = emitter.y; }
      if (n.life <= 0 && !n.impacted) {
        n.impacted = true;
        if (emitter) {
          damageEnemy(emitter, n.damage, emitter.x, emitter.y);
          emitter.hitPulse = Math.max(emitter.hitPulse || 0, n.live ? .22 : .15);
          particles.push({
            type: 'ring', x: emitter.x, y: emitter.y, vx: 0, vy: 0,
            life: n.live ? .42 : .3, max: n.live ? .42 : .3,
            size: n.live ? 76 : 48, start: n.live ? 8 : 6,
            color: n.live ? '#fff0a8' : '#d8fbff'
          });
          burst(emitter.x, emitter.y, n.live ? '#fff0a8' : '#d8fbff', n.live ? 13 : 7, n.live ? 260 : 165, n.live ? 5.2 : 3.4);
          world.shake = Math.max(world.shake, settings.reduced ? .7 : (n.live ? 2.4 : 1.2));
          sound.sfx(n.live ? 'liveCounterHit' : 'counterHit', emitter.x);
        }
      }
    }
    compactPositiveLife(counterNeedles);
    world.shake = Math.max(0, world.shake - dt * 28);
    world.flash = Math.max(0, world.flash - dt * 1.4);
  }

  function updateGame(dt) {
    world.frame++;
    world.totalTime += dt;
    world.introTime = Math.max(0, world.introTime - dt);
    world.bossIntro = Math.max(0, world.bossIntro - dt);
    world.chainTimer = Math.max(0, world.chainTimer - dt);
    if (world.chainTimer <= 0) world.chain = Math.max(0, world.chain - dt * 9);
    world.pluckTimer = Math.max(0, world.pluckTimer - dt);
    if (world.pluckTimer <= 0) world.pluckChain = 0;
    world.hitSound = Math.max(0, world.hitSound - dt);
    world.grazeSound = Math.max(0, world.grazeSound - dt);
    world.shieldSound = Math.max(0, world.shieldSound - dt);

    updatePlayer(dt);
    if (player.dead) {
      player.deathTimer = Math.max(0, player.deathTimer - dt);
      if (player.deathTimer <= 0) {
        showEnd(false);
        return;
      }
    }
    if (world.phase === 'field') {
      world.zoneTime += dt;
      const zone = zones[world.zone];
      while (world.waveIndex < zone.waves.length && world.zoneTime >= zone.waves[world.waveIndex].t) {
        const wave = zone.waves[world.waveIndex++];
        spawnWave(wave.kind, wave.args);
      }
      if (world.zoneTime >= zone.duration) spawnBoss();
    }

    const motion = prepareTickMotion(dt);
    for (const e of enemies) if (!e.dead) updateEnemy(e, dt, motion);
    compactNotDead(enemies);
    updateBoss(dt);
    updateBullets(dt, motion);
    updateEffects(dt);

    if (world.phase === 'bossDeath') {
      world.bossDeath -= dt;
      if (world.bossDeath > 0 && Math.floor(world.bossDeath * 12) !== Math.floor((world.bossDeath + dt) * 12)) {
        const b = world.boss;
        const x = b.x + visualRng.range(-95, 95), y = b.y + visualRng.range(-75, 75);
        burst(x, y, visualRng.next() < .5 ? '#ffd483' : '#d8fbff', 12, 260, 6);
        world.shake = Math.max(world.shake, settings.reduced ? 1 : 5);
      }
      if (world.bossDeath <= 0) {
        world.bossDeath = 0;
        world.phase = 'passage';
        world.transition = PASSAGE_DURATION;
        world.boss = null;
      }
    } else if (world.phase === 'passage') {
      world.transition -= dt;
      if (world.transition <= 0) {
        world.transition = 0;
        if (world.zone + 1 >= MAX_ZONES) {
          world.phase = 'ending'; world.endingTime = 16; world.endingCue = -1;
          addText(W / 2, 380, 'THE ANIMAL OPENS ITS EYE', '#fff2c3', 3.4, 24);
        } else advanceZone();
      }
    } else if (world.phase === 'ending') {
      world.endingTime -= dt;
      const cue = Math.floor((16 - world.endingTime) / 3.2);
      if (cue !== world.endingCue) {
        world.endingCue = cue;
        const lines = ['RAIN BECOMES WATER', 'THE COAST REMEMBERS MORNING', 'PETREL REMAINS YOURS', 'THE FIRST BLUE', 'A NEW MIGRATION WAITS'];
        if (lines[cue]) {
          addText(W / 2, 340 + (cue % 2) * 55, lines[cue], cue === 3 ? '#fff2c3' : '#d8fbff', 2.8, cue === 3 ? 27 : 16);
          sound.sfx('ending', W / 2, cue);
        }
      }
      if (Math.floor(world.endingTime * 12) !== Math.floor((world.endingTime + dt) * 12)) {
        particles.push({ type: 'rain', x: visualRng.range(20, W - 20), y: -20, vx: -18, vy: 210, life: 4.5, max: 4.5, size: visualRng.range(2, 5), color: '#e8ffff' });
      }
      if (world.endingTime <= 0) {
        world.endingTime = 0;
        showEnd(true);
      }
    }
    sound.updateMusic();
  }

  function drawCloud(x, y, scale, alpha) {
    g.save();
    g.globalAlpha = alpha;
    const grad = g.createRadialGradient(x, y, 0, x, y, 120 * scale);
    grad.addColorStop(0, 'rgba(242,238,218,.32)');
    grad.addColorStop(.55, 'rgba(174,216,213,.13)');
    grad.addColorStop(1, 'rgba(110,156,172,0)');
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(x, y, 170 * scale, 66 * scale, -.1, 0, TAU); g.fill();
    g.restore();
  }

  function drawHarborLandmark(kind, x, y, scale, alpha) {
    g.save(); g.translate(x, y); g.scale(scale, scale); g.globalAlpha = alpha;
    if (kind === 0) {
      g.fillStyle = '#182934'; g.fillRect(-72, -42, 144, 84);
      g.fillStyle = '#263e46'; g.fillRect(-58, -64, 116, 25);
      g.strokeStyle = 'rgba(255,213,154,.48)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-58, -64); g.lineTo(0, -102); g.lineTo(58, -64); g.stroke();
      g.fillStyle = 'rgba(255,205,126,.16)';
      for (let ix = -2; ix <= 2; ix++) { g.fillRect(ix * 22 - 6, -28, 12, 18); }
      g.strokeStyle = 'rgba(184,235,235,.25)'; g.beginPath(); g.moveTo(-90, 22); g.lineTo(90, 22); g.stroke();
    } else if (kind === 1) {
      g.strokeStyle = '#172630'; g.lineWidth = 13; g.beginPath(); g.moveTo(-38, 46); g.lineTo(-18, -98); g.lineTo(74, -98); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(-17, -78); g.lineTo(76, -33); g.moveTo(-13, -54); g.lineTo(52, -98); g.stroke();
      g.strokeStyle = 'rgba(230,191,126,.52)'; g.lineWidth = 2; g.beginPath(); g.moveTo(72, -97); g.lineTo(72, 3); g.stroke();
      g.fillStyle = '#a95a49'; g.fillRect(61, -3, 23, 18);
    } else if (kind === 2) {
      g.fillStyle = '#1d303a'; g.fillRect(-20, -80, 40, 110);
      g.fillStyle = '#b55b4a'; g.fillRect(-27, -91, 54, 18);
      g.strokeStyle = 'rgba(232,216,178,.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -92); g.lineTo(0, -135); g.stroke();
      g.fillStyle = '#ffd078'; g.beginPath(); g.arc(0, -139, 6, 0, TAU); g.fill();
    } else {
      g.strokeStyle = '#182c35'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 55); g.lineTo(0, -72); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(0, -38); g.lineTo(-35, -70); g.moveTo(0, -38); g.lineTo(31, -77); g.stroke();
      g.fillStyle = '#a95748'; g.beginPath(); g.arc(-37, -72, 8, 0, TAU); g.arc(33, -79, 8, 0, TAU); g.fill();
    }
    g.restore();
  }

  function drawLowTideBackground(time) {
    const progress = world.mode === 'title' ? .08 : world.phase === 'field' ? clamp(world.zoneTime / zones[0].duration, 0, 1) : 1;
    const rootReveal = ease(invLerp(.26, .92, progress));
    const scroll = time * (world.mode === 'title' ? 12 : 68);
    const sky = g.createLinearGradient(0, 0, 0, 550);
    sky.addColorStop(0, '#071224'); sky.addColorStop(.42, '#18394b'); sky.addColorStop(.76, '#b4826d'); sky.addColorStop(1, '#e9b47e');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    const sunX = 565, sunY = 172;
    const sun = g.createRadialGradient(sunX, sunY, 8, sunX, sunY, 200);
    sun.addColorStop(0, 'rgba(255,244,194,.94)'); sun.addColorStop(.14, 'rgba(255,202,122,.35)'); sun.addColorStop(1, 'rgba(255,185,102,0)');
    g.fillStyle = sun; g.fillRect(330, 0, 390, 390);

    for (let i = 0; i < 6; i++) {
      const y = 66 + i * 64 + Math.sin(time * .05 + i) * 13;
      drawCloud((i * 157 + 38) % W, y, .6 + i % 3 * .22, .32);
    }

    g.save(); g.globalAlpha = .55 + rootReveal * .3;
    g.fillStyle = '#0b1824';
    g.beginPath(); g.moveTo(0, 280); g.lineTo(0, 235); g.lineTo(43, 225); g.lineTo(57, 193); g.lineTo(88, 195); g.lineTo(104, 228); g.lineTo(162, 217); g.lineTo(179, 181); g.lineTo(207, 181); g.lineTo(221, 222); g.lineTo(287, 213); g.lineTo(301, 164); g.lineTo(326, 164); g.lineTo(338, 216); g.lineTo(410, 220); g.lineTo(432, 189); g.lineTo(456, 189); g.lineTo(470, 224); g.lineTo(536, 214); g.lineTo(552, 175); g.lineTo(585, 178); g.lineTo(596, 220); g.lineTo(664, 214); g.lineTo(680, 192); g.lineTo(704, 192); g.lineTo(720, 230); g.lineTo(720, 300); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,199,112,.25)';
    for (let i = 0; i < 18; i++) g.fillRect(22 + (i * 83) % 680, 205 + (i * 19) % 42, 5, 8);
    g.restore();

    const water = g.createLinearGradient(0, 250, 0, H);
    water.addColorStop(0, '#17384a'); water.addColorStop(.38, '#214653'); water.addColorStop(.72, '#172f3b'); water.addColorStop(1, '#07131f');
    g.fillStyle = water; g.fillRect(0, 255, W, H - 255);
    g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 34; i++) {
      const y = 275 + ((i * 73 + scroll * (.32 + i % 4 * .06)) % 860);
      const x = (i * 137 + Math.sin(time * .4 + i) * 44) % W;
      g.strokeStyle = `rgba(${i % 3 ? '157,220,222' : '255,203,127'},${.05 + (i % 5) * .015})`;
      g.lineWidth = 1 + i % 2; g.beginPath(); g.moveTo(x - 48 - i % 3 * 22, y); g.quadraticCurveTo(x, y + Math.sin(time + i) * 4, x + 54, y); g.stroke();
    }
    g.restore();

    for (let i = -1; i < 5; i++) {
      const y = ((i * 315 + scroll) % 1575) - 180;
      const kind = (i + 6) % 4;
      const x = 70 + ((i * 193 + kind * 71) % 580);
      drawHarborLandmark(kind, x, y + 410, .72 + (y + 180) / 2600, .18 + clamp((y + 180) / 900, 0, .34));
    }

    g.save(); g.globalAlpha = rootReveal;
    g.fillStyle = '#07101b';
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(120, 34, 180, 70, 305, 42); g.bezierCurveTo(430, 15, 548, 54, 720, 6); g.lineTo(720, 0); g.closePath(); g.fill();
    for (let i = 0; i < 6; i++) {
      const x = 38 + i * 132 + Math.sin(i * 2.2) * 28;
      const sway = Math.sin(time * .35 + i) * 18;
      g.strokeStyle = i === 3 ? 'rgba(3,5,10,.92)' : 'rgba(191,208,182,.38)';
      g.lineWidth = i === 3 ? 22 : 10 + i % 3 * 5;
      g.beginPath(); g.moveTo(x, -30); g.bezierCurveTo(x - 35, 95, x + sway + 45, 170, x + sway, 330 + i * 38); g.stroke();
      if (i !== 3) {
        g.strokeStyle = 'rgba(238,220,178,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 2, -20); g.bezierCurveTo(x - 25, 95, x + sway + 38, 170, x + sway + 3, 325 + i * 38); g.stroke();
      }
    }
    g.restore();

    g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = 'rgba(183,239,239,.18)'; g.lineWidth = 1;
    for (let i = 0; i < 56; i++) {
      const x = (i * 97 + (i % 4) * 31) % W;
      const y = (i * 211 + time * (145 + i % 5 * 22)) % (H + 160) - 80;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 42 + i % 3 * 11); g.stroke();
    }
    g.restore();

    const density = enemyBullets.length;
    if (density > 80) { g.fillStyle = `rgba(3,8,15,${clamp((density - 80) / 650, 0, .34)})`; g.fillRect(0, 0, W, H); }
  }

  const backgroundDrawState = {
    zone: 0, bulletDensity: 0,
    playerX: 0, playerY: 0, playerVX: 0, playerVY: 0,
    currentX: 0, currentY: 0, harvestLift: 0,
    orbitX: 0, orbitY: 0, addressOffset: 0, addressVelocity: 0,
    blueRollAngle: 0, phase: 'field', bossPhase: 0, transition: 0,
    reducedEffects: false
  };
  const backdropDrawState = { time: 0, phase: 'field', bossPhase: 0, reducedEffects: false };

  function drawZoneBackground(index, time, localProgress) {
    if (index === 3) alveolarOrbitOffset(orbitRender);
    const state = backgroundDrawState;
    state.zone = index;
    state.bulletDensity = enemyBullets.length;
    state.playerX = player.x; state.playerY = player.y;
    state.playerVX = player.vx; state.playerVY = player.vy;
    state.currentX = index === 0 ? lowTideCurrent() : index === 2 ? glassboneHeartbeatCurrent() : 0;
    state.currentY = index === 1 ? hangingAcreCurrent() : 0;
    state.harvestLift = index === 1 ? hangingAcreHarvestLift() : 0;
    state.orbitX = index === 3 ? orbitRender.x : 0;
    state.orbitY = index === 3 ? orbitRender.y : 0;
    state.addressOffset = index === 4 ? borrowedAddressOffset() : 0;
    state.addressVelocity = index === 4 ? borrowedAddressVelocity() : 0;
    state.blueRollAngle = index === 5 ? firstBlueRollAngle() : 0;
    state.phase = world.phase;
    state.bossPhase = world.boss?.phase || 0;
    state.transition = world.transition;
    state.reducedEffects = settings.reduced;
    if (!window.RAIN_ART?.drawBackground(g, index, time, localProgress, state)) drawLowTideBackground(time);
  }

  function drawBackground(time) {
    const progress = world.mode === 'title' ? .08 : world.phase === 'field' ? clamp(world.zoneTime / zones[world.zone].duration, 0, 1) : 1;
    drawZoneBackground(world.mode === 'title' ? 0 : world.zone, time, progress);
    if (world.phase === 'passage' && world.zone + 1 < zones.length) {
      const passage = 1 - world.transition / PASSAGE_DURATION;
      const blend = ease(invLerp(.3, .96, passage));
      g.save();
      g.globalAlpha = blend;
      drawZoneBackground(world.zone + 1, time, 0);
      g.restore();
    }
  }

  function drawTelegraphs() {
    for (const t of telegraphs) {
      const alpha = clamp(t.life / t.max, 0, 1);
      if (t.type === 'ray') {
        g.save(); g.translate(t.x, t.y); g.rotate(t.angle);
        const ignition = 1 - alpha;
        const beam = g.createLinearGradient(0, 0, 900, 0);
        beam.addColorStop(0, `rgba(255,236,184,${.14 + ignition * .13})`);
        beam.addColorStop(.35, `rgba(255,207,115,${.07 + ignition * .075})`);
        beam.addColorStop(.78, `rgba(190,242,246,${.025 + ignition * .04})`);
        beam.addColorStop(1, 'rgba(190,242,246,0)');
        g.fillStyle = beam;
        // A slim refracted warning thread: readable in motion, but never a
        // painted runway over the environment or a veil over live bullets.
        g.beginPath(); g.moveTo(0, -3); g.lineTo(900, -18); g.lineTo(900, 18); g.lineTo(0, 3); g.closePath(); g.fill();
        g.globalCompositeOperation = 'screen';
        const pulse = .62 + Math.sin(t.life * 30) * .14;
        g.shadowColor = 'rgba(255,217,139,.65)';
        g.shadowBlur = 6 + ignition * 8;
        for (const side of [-1, 1]) {
          g.strokeStyle = `rgba(255,226,160,${pulse * (.26 + ignition * .24)})`;
          g.lineWidth = 1 + ignition * .65;
          g.beginPath(); g.moveTo(0, side * 3); g.lineTo(900, side * 18); g.stroke();
        }
        g.shadowBlur = 3 + ignition * 5;
        g.strokeStyle = `rgba(239,255,248,${.48 + ignition * .34})`;
        g.lineWidth = 1.1; g.setLineDash([9, 20]);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(900, 0); g.stroke();
        g.setLineDash([]);
        for (let x = 92; x < 840; x += 116) {
          const drift = (t.life * 96 + x * .37) % 116;
          const px = clamp(x + drift - 58, 24, 876);
          const half = 3.2 + px / 900 * 4.8;
          g.globalAlpha = .24 + ignition * .34;
          g.beginPath();
          g.moveTo(px - 4, -half); g.lineTo(px + 2, 0); g.lineTo(px - 4, half);
          g.stroke();
        }
        g.globalAlpha = 1; g.shadowBlur = 0; g.restore();
      } else if (t.type === 'eclipseRail' && t.points?.length > 1) {
        const start = t.points[0], end = t.points[t.points.length - 1];
        const ignition = 1 - alpha;
        const pulse = .78 + Math.sin((t.phase || 0) * 5 + t.life * 34) * .22;
        const rail = g.createLinearGradient(start[0], start[1], end[0], end[1]);
        rail.addColorStop(0, `rgba(255,207,103,${.42 + ignition * .24})`);
        rail.addColorStop(.38, `rgba(204,251,255,${.34 + ignition * .28})`);
        rail.addColorStop(.7, `rgba(255,132,182,${.32 + ignition * .25})`);
        rail.addColorStop(1, `rgba(255,221,128,${.5 + ignition * .3})`);
        const trace = () => {
          g.beginPath(); g.moveTo(start[0], start[1]);
          for (let i = 1; i < t.points.length; i++) g.lineTo(t.points[i][0], t.points[i][1]);
          g.stroke();
        };
        g.save();
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = `rgba(52,20,48,${.52 + ignition * .18})`; g.lineWidth = 7; trace();
        g.globalCompositeOperation = 'screen';
        g.shadowColor = '#ffd270'; g.shadowBlur = 8 + ignition * 9;
        g.strokeStyle = rail; g.lineWidth = 3.2 + ignition * .8; trace();
        g.shadowBlur = 0;
        g.strokeStyle = `rgba(235,255,255,${.5 + ignition * .38})`; g.lineWidth = 1; trace();
        for (const fraction of [.24, .48, .72]) {
          const x = lerp(start[0], end[0], fraction), y = lerp(start[1], end[1], fraction);
          const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
          const size = (2.4 + ignition * 1.8) * pulse;
          g.save(); g.translate(x, y); g.rotate(angle + Math.PI / 4);
          g.fillStyle = fraction === .48 ? '#e9ffff' : '#ffd270';
          g.fillRect(-size / 2, -size / 2, size, size); g.restore();
        }
        for (const point of [start, end]) {
          const radius = 18 + ignition * 7;
          const glow = g.createRadialGradient(point[0], point[1], 1, point[0], point[1], radius);
          glow.addColorStop(0, `rgba(255,255,231,${.78 * pulse})`);
          glow.addColorStop(.28, `rgba(255,202,96,${.52 * pulse})`);
          glow.addColorStop(1, 'rgba(255,116,175,0)');
          g.fillStyle = glow; g.fillRect(point[0] - radius, point[1] - radius, radius * 2, radius * 2);
          g.strokeStyle = `rgba(255,226,137,${.55 + ignition * .35})`; g.lineWidth = 1.5;
          g.beginPath(); g.arc(point[0], point[1], 5 + alpha * 8, 0, TAU); g.stroke();
          g.fillStyle = '#fff8d8'; g.beginPath(); g.arc(point[0], point[1], 2.2 + ignition * 1.8, 0, TAU); g.fill();
        }
        g.restore();
      } else if (t.type === 'route' && t.points?.length > 1) {
        g.save();
        g.globalAlpha = .28 + (1 - alpha) * .32;
        g.strokeStyle = '#fff0c9';
        g.lineWidth = 2;
        g.setLineDash([8, 10]);
        g.beginPath(); g.moveTo(t.points[0][0], t.points[0][1]);
        for (let i = 1; i < t.points.length; i++) g.lineTo(t.points[i][0], t.points[i][1]);
        g.stroke();
        g.setLineDash([]);
        for (let i = 1; i < t.points.length - 1; i++) {
          g.fillStyle = '#ffd083'; g.beginPath(); g.arc(t.points[i][0], t.points[i][1], 4 + (1 - alpha) * 3, 0, TAU); g.fill();
        }
        g.restore();
      } else if (t.type === 'field' && t.points?.length === 2) {
        g.save(); g.globalCompositeOperation = 'screen';
        for (let i = 0; i < 2; i++) {
          const point = t.points[i];
          const radius = 26 + (1 - alpha) * 42;
          const glow = g.createRadialGradient(point[0], point[1], 2, point[0], point[1], radius);
          glow.addColorStop(0, i ? 'rgba(255,208,116,.62)' : 'rgba(201,251,255,.62)');
          glow.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = glow; g.fillRect(point[0] - radius, point[1] - radius, radius * 2, radius * 2);
        }
        g.strokeStyle = `rgba(235,246,224,${.18 + (1 - alpha) * .3})`; g.lineWidth = 1.5; g.setLineDash([4, 9]);
        for (let arc = -2; arc <= 2; arc++) {
          g.beginPath(); g.moveTo(t.points[0][0], t.points[0][1]);
          g.bezierCurveTo(W / 2, t.points[0][1] + arc * 42, W / 2, t.points[1][1] - arc * 42, t.points[1][0], t.points[1][1]); g.stroke();
        }
        g.setLineDash([]); g.restore();
      } else if (t.type === 'lens') {
        g.save(); g.globalCompositeOperation = 'screen';
        g.globalAlpha = .2 + (1 - alpha) * .34;
        const lens = g.createRadialGradient(t.x - t.r * .25, t.y - t.r * .25, 8, t.x, t.y, t.r);
        lens.addColorStop(0, 'rgba(255,245,190,.22)'); lens.addColorStop(.65, 'rgba(174,242,255,.08)'); lens.addColorStop(1, 'rgba(255,183,214,.18)');
        g.fillStyle = lens; g.beginPath(); g.arc(t.x, t.y, t.r, 0, TAU); g.fill();
        g.strokeStyle = '#e8ffff'; g.lineWidth = 2; g.setLineDash([12, 10]); g.beginPath(); g.arc(t.x, t.y, t.r, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,236,183,.55)'; g.beginPath(); g.moveTo(0, t.y); g.lineTo(W, t.y); g.stroke();
        g.setLineDash([]); g.restore();
      }
    }
  }

  function bulletTransformRemaining(b) {
    let remaining = Infinity;
    let time;
    if (!b.hinged && b.hingeAt) { time = b.hingeAt - b.flightAge; if (time > 0 && time < remaining) remaining = time; }
    if (!b.hinged2 && b.hinge2At) { time = b.hinge2At - b.flightAge; if (time > 0 && time < remaining) remaining = time; }
    if (!b.reversed && b.reverseAt) { time = b.reverseAt - b.flightAge; if (time > 0 && time < remaining) remaining = time; }
    if (!b.splitDone && b.split) { time = b.split - b.flightAge; if (time > 0 && time < remaining) remaining = time; }
    if (!b.stopDone && b.stopAt) { time = b.stopAt - b.flightAge; if (time > 0 && time < remaining) remaining = time; }
    if (!b.refracted && b.refractY && b.vy > 0) { time = (b.refractY - b.y) / b.vy; if (time > 0 && time < remaining) remaining = time; }
    return remaining;
  }

  let buildingBulletStamp = false;

  function projectileNearPlayer(b) {
    if (buildingBulletStamp || b.delay > 0 || player.dead || world.mode !== 'playing') return false;
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const reach = player.radius + b.r * .72 + 29;
    return dx * dx + dy * dy < reach * reach;
  }

  function drawProjectileFlightCue(b, zone, material) {
    if (b.delay > 0) return;
    const speed = Math.hypot(b.vx, b.vy);
    const tail = clamp(speed * .031, 4.5, 14.5);
    const radius = b.r;
    g.save();
    g.rotate(Math.atan2(b.vy, b.vx));
    g.globalCompositeOperation = 'screen';
    g.globalAlpha *= .09 + clamp((speed - 130) / 500, 0, .11);
    g.strokeStyle = material.edge;
    g.lineWidth = .75;
    g.beginPath();
    if (zone === 4) {
      // Rain caught in the bevel of a moving pane: an L-shaped reflection,
      // not another free-floating city window.
      g.moveTo(-radius * .95, -radius * .42);
      g.lineTo(-radius * .95 - tail, -radius * .42);
      g.lineTo(-radius * .95 - tail * 1.12, radius * .05);
    } else if (zone === 5) {
      // A split comet hair makes the astral glyphs read as tiny migrating
      // organisms while preserving the exact lethal nucleus at their centre.
      g.moveTo(-radius * .9, 0); g.lineTo(-radius * .9 - tail, 0);
      g.moveTo(-radius * .9 - tail * .54, 0); g.lineTo(-radius * .9 - tail * .82, -radius * .34);
      g.moveTo(-radius * .9 - tail * .54, 0); g.lineTo(-radius * .9 - tail * .82, radius * .34);
    } else {
      g.moveTo(-radius * .95, 0);
      g.quadraticCurveTo(-radius * .95 - tail * .48, zone === 1 ? -radius * .28 : radius * .16, -radius * .95 - tail, 0);
    }
    g.stroke();
    g.restore();
  }

  function drawProjectileNearCue(b, material) {
    if (!projectileNearPlayer(b)) return;
    const outer = b.r + 4.8;
    const flicker = .72 + Math.sin(b.age * 18 + b.pulse) * .12;
    g.save();
    g.rotate(Math.atan2(b.vy, b.vx));
    g.globalAlpha *= flicker;
    g.strokeStyle = hostileTokens.ink;
    g.lineWidth = 3.2;
    g.beginPath();
    g.arc(0, 0, outer, -.74, .02);
    g.moveTo(Math.cos(Math.PI - .74) * outer, Math.sin(Math.PI - .74) * outer);
    g.arc(0, 0, outer, Math.PI - .74, Math.PI + .02);
    g.stroke();
    g.globalCompositeOperation = 'screen';
    g.strokeStyle = material.edge;
    g.lineWidth = 1.05;
    g.stroke();
    g.restore();
  }

  function drawProjectileMaterial(b, zone) {
    const material = projectileMaterials[zone] || projectileMaterials[0];
    const family = b.kind === 'pearl' ? 'drop' : b.kind;
    const r = b.r;
    g.save();
    g.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (zone === 0) {
      g.strokeStyle = family === 'needle' || family === 'thorn' ? material.accent : material.edge;
      g.lineWidth = 1.15;
      if (family === 'bead' || family === 'bell') {
        g.beginPath(); g.arc(0, 0, r * 1.28, -.72, .25); g.moveTo(0, r * 1.28); g.arc(0, 0, r * 1.28, 1.35, 2.32); g.stroke();
        g.strokeStyle = material.accent; g.lineWidth = .72;
        g.beginPath(); g.arc(-r * .13, -r * .08, r * .74, -1.45, -.38); g.stroke();
        g.fillStyle = material.edge; g.beginPath(); g.arc(-r * .3, -r * .43, Math.max(.7, r * .12), 0, TAU); g.fill();
      } else if (family === 'needle' || family === 'thorn') {
        g.beginPath(); g.moveTo(0, -r * 1.45); g.quadraticCurveTo(r * 1.1, -r * .2, r * .45, r * .88); g.stroke();
        g.strokeStyle = material.accent; g.lineWidth = .75;
        g.beginPath(); g.moveTo(-r * .42, r * .18); g.lineTo(r * .56, r * .45); g.stroke();
      } else {
        g.beginPath(); g.moveTo(-r * .42, -r * .72); g.quadraticCurveTo(0, -r * 1.45, r * .35, -r * .55); g.stroke();
        g.fillStyle = material.accent; g.beginPath(); g.arc(r * .08, -r * .62, Math.max(.65, r * .1), 0, TAU); g.fill();
      }
    } else if (zone === 1) {
      // Acre shots cross pale fog, glassy seedpods and pollen highlights.  A
      // vegetal ink keyline keeps the tiny glyph readable without changing its
      // collision radius.
      const acreInk = '#14231b';
      if (family === 'bell' || family === 'bead') {
        g.strokeStyle = acreInk; g.lineWidth = 3.4;
        g.beginPath(); g.arc(0, 0, r * 1.28, .08, Math.PI - .08); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.1; g.stroke();
        g.strokeStyle = material.accent; g.beginPath(); g.moveTo(-r * .7, 0); g.lineTo(0, r * .72); g.lineTo(r * .7, 0); g.stroke();
        g.fillStyle = material.edge; g.beginPath(); g.ellipse(0, -r * .27, Math.max(.7, r * .12), r * .27, 0, 0, TAU); g.fill();
      } else if (family === 'needle' || family === 'thorn') {
        g.strokeStyle = acreInk; g.lineWidth = 3.6;
        g.beginPath(); g.moveTo(0, -r * 1.46); g.lineTo(0, r * .86); g.moveTo(0, -r * .3); g.lineTo(-r * .66, r * .12); g.moveTo(0, .05); g.lineTo(r * .6, r * .45); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.1; g.stroke();
      } else {
        for (let side = -1; side <= 1; side += 2) {
          g.strokeStyle = acreInk; g.lineWidth = 3.4;
          g.beginPath(); g.moveTo(0, r * .18); g.quadraticCurveTo(side * r * 1.35, -r * .08, side * r * .62, -r * 1.24); g.quadraticCurveTo(side * r * .2, -r * .42, 0, r * .18); g.stroke();
          g.strokeStyle = material.edge; g.lineWidth = 1.1; g.stroke();
        }
        g.strokeStyle = material.accent; g.lineWidth = .72;
        g.beginPath(); g.moveTo(0, r * .24); g.lineTo(0, -r * .82); g.stroke();
      }
    } else if (zone === 2) {
      if (family === 'bead' || family === 'bell') {
        g.strokeStyle = '#2c1019'; g.lineWidth = 4.5; g.beginPath(); g.arc(0, 0, r * 1.32, .18, TAU - .18); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.25; g.stroke();
        g.strokeStyle = material.accent; g.beginPath(); g.moveTo(-r * .65, 0); g.lineTo(r * .65, 0); g.stroke();
        g.fillStyle = material.accent; g.beginPath(); g.arc(0, r * .08, Math.max(.75, r * .13), 0, TAU); g.fill();
      } else if (family === 'chime') {
        g.strokeStyle = '#2c1019'; g.lineWidth = 4.4; g.beginPath(); g.moveTo(-r, r); g.quadraticCurveTo(-r * .8, -r * 1.2, 0, -r * .7); g.quadraticCurveTo(r * .8, -r * 1.2, r, r); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.25; g.stroke();
        g.fillStyle = material.accent; g.beginPath(); g.arc(0, r * .72, Math.max(.75, r * .14), 0, TAU); g.fill();
      } else {
        g.strokeStyle = '#2c1019'; g.lineWidth = 4.7; g.beginPath(); g.moveTo(-r * .82, r * 1.04); g.lineTo(0, -r * 1.52); g.lineTo(r * .82, r * 1.04); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.25; g.stroke();
        g.strokeStyle = material.accent; g.lineWidth = 1.15; g.beginPath(); g.moveTo(0, -r * .86); g.lineTo(0, r * .76); g.stroke();
        g.strokeStyle = 'rgba(255,248,220,.68)'; g.lineWidth = .7;
        g.beginPath(); g.moveTo(-r * .42, r * .32); g.lineTo(0, r * .04); g.lineTo(r * .42, r * .32); g.stroke();
      }
    } else if (zone === 3) {
      if (family === 'chime') {
        g.beginPath(); g.moveTo(-r * .72, r); g.quadraticCurveTo(-r * .3, -r * 1.35, 0, -r * .45); g.quadraticCurveTo(r * .3, -r * 1.35, r * .72, r);
        g.strokeStyle = hostileTokens.ink; g.lineWidth = 3.8; g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.15; g.stroke();
        g.fillStyle = material.accent; g.beginPath(); g.arc(0, r * .52, Math.max(.7, r * .12), 0, TAU); g.fill();
      } else if (family === 'needle' || family === 'thorn') {
        g.beginPath(); g.moveTo(0, -r * 1.45); g.lineTo(0, r); g.moveTo(-r * .7, -.05); g.lineTo(r * .7, -.05);
        g.strokeStyle = hostileTokens.ink; g.lineWidth = 3.8; g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.15; g.stroke();
        g.fillStyle = material.accent; g.beginPath(); g.arc(0, 0, Math.max(.75, r * .13), 0, TAU); g.fill();
      } else {
        g.beginPath(); g.arc(0, 0, r * 1.34, -.58, 1.92);
        g.strokeStyle = hostileTokens.ink; g.lineWidth = 3.8; g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.15; g.stroke();
        g.strokeStyle = material.accent; g.beginPath(); g.arc(0, 0, r * 1.12, 2.3, 5.16); g.stroke();
        g.strokeStyle = 'rgba(232,255,249,.74)'; g.lineWidth = .65;
        g.beginPath(); g.arc(0, 0, r * .72, -.92, .72); g.stroke();
      }
    } else if (zone === 4) {
      const s = r * 1.25;
      if (family === 'seed') {
        // A clipped, double-depth address pane. The dark extrusion and cold
        // inner glass keep it dimensional even over the City's lit facades.
        g.fillStyle = hostileTokens.ink;
        g.beginPath(); g.moveTo(-s * .8, -s); g.lineTo(s * .46, -s); g.lineTo(s * .82, -s * .64); g.lineTo(s * .82, s); g.lineTo(-s * .8, s); g.closePath(); g.fill();
        g.fillStyle = material.core;
        g.beginPath(); g.moveTo(-s * .56, -s * .76); g.lineTo(s * .38, -s * .76); g.lineTo(s * .58, -s * .56); g.lineTo(s * .58, s * .72); g.lineTo(-s * .56, s * .72); g.closePath(); g.fill();
        g.strokeStyle = material.edge; g.lineWidth = 1.05; g.stroke();
        g.strokeStyle = material.accent; g.lineWidth = .82;
        g.beginPath(); g.moveTo(-s * .48, .04); g.lineTo(s * .48, .04); g.moveTo(-s * .4, -s * .56); g.lineTo(s * .2, -s * .56); g.stroke();
        g.strokeStyle = 'rgba(224,250,255,.72)'; g.lineWidth = .65;
        g.beginPath(); g.moveTo(-s * .4, -s * .64); g.lineTo(s * .44, s * .34); g.stroke();
      } else if (family === 'needle' || family === 'thorn') {
        g.strokeStyle = hostileTokens.ink; g.lineWidth = 3.5;
        g.beginPath(); g.moveTo(0, -s); g.lineTo(0, s); g.moveTo(-s * .78, -s * .42); g.lineTo(s * .78, s * .42); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.05; g.stroke();
      } else if (family === 'bead' || family === 'bell') {
        // Four inhabited panes sit behind a wet bevel rather than reading as
        // one flat debug square.
        g.fillStyle = hostileTokens.ink;
        g.beginPath(); g.moveTo(-s * .78, -s * .54); g.lineTo(-s * .54, -s * .78); g.lineTo(s * .54, -s * .78); g.lineTo(s * .78, -s * .54); g.lineTo(s * .78, s * .54); g.lineTo(s * .54, s * .78); g.lineTo(-s * .54, s * .78); g.lineTo(-s * .78, s * .54); g.closePath(); g.fill();
        g.fillStyle = material.core; g.fillRect(-s * .55, -s * .55, s * 1.1, s * 1.1);
        g.strokeStyle = material.edge; g.lineWidth = 1.05; g.strokeRect(-s * .55, -s * .55, s * 1.1, s * 1.1);
        g.strokeStyle = material.accent; g.lineWidth = .72;
        g.beginPath(); g.moveTo(0, -s * .48); g.lineTo(0, s * .48); g.moveTo(-s * .48, 0); g.lineTo(s * .48, 0); g.stroke();
        g.strokeStyle = 'rgba(224,250,255,.76)'; g.lineWidth = .68;
        g.beginPath(); g.moveTo(-s * .45, -s * .42); g.lineTo(s * .34, -s * .16); g.stroke();
      } else {
        g.strokeStyle = hostileTokens.ink; g.lineWidth = 4;
        g.beginPath(); g.moveTo(-s, -s * .42); g.lineTo(-s, -s); g.lineTo(-s * .42, -s); g.moveTo(s * .42, s); g.lineTo(s, s); g.lineTo(s, s * .42); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.05; g.stroke();
        g.fillStyle = material.core;
        g.beginPath(); g.moveTo(0, -s * .62); g.lineTo(s * .48, 0); g.lineTo(0, s * .62); g.lineTo(-s * .48, 0); g.closePath(); g.fill();
        g.strokeStyle = material.accent; g.lineWidth = .8; g.stroke();
        g.strokeStyle = 'rgba(224,250,255,.7)'; g.lineWidth = .65;
        g.beginPath(); g.moveTo(-s * .2, -s * .34); g.lineTo(s * .2, -s * .06); g.stroke();
      }
      if (family === 'needle' || family === 'thorn') {
        // A semaphore cap prevents sodium needles from masquerading as lit
        // windows or rain strokes in the Borrowed City.
        g.strokeStyle = hostileTokens.ink; g.lineWidth = 3.2;
        g.beginPath(); g.moveTo(-s * .78, s * .52); g.lineTo(s * .78, s * .52); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-s * .72, s * .52); g.lineTo(s * .72, s * .52); g.stroke();
        // A cold diamond head breaks the silhouette away from every straight
        // amber rain/window stroke in the city plate.
        g.fillStyle = hostileTokens.ink;
        g.beginPath(); g.moveTo(0, -s * 1.58); g.lineTo(s * .72, -s * .9); g.lineTo(0, -s * .22); g.lineTo(-s * .72, -s * .9); g.closePath(); g.fill();
        g.fillStyle = material.edge;
        g.beginPath(); g.moveTo(0, -s * 1.34); g.lineTo(s * .42, -s * .9); g.lineTo(0, -s * .46); g.lineTo(-s * .42, -s * .9); g.closePath(); g.fill();
        g.fillStyle = hostileTokens.danger; g.beginPath(); g.arc(0, -s * .9, Math.max(1.35, r * .2), 0, TAU); g.fill();
      }
    } else {
      const s = r * 1.38;
      if (family === 'bell') {
        g.strokeStyle = material.core; g.lineWidth = 4.2;
        g.beginPath(); g.arc(0, 0, s * .78, .22, TAU - .22); g.moveTo(-s * .46, -s * .56); g.lineTo(-s * .82, -s); g.moveTo(s * .46, -s * .56); g.lineTo(s * .82, -s); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = material.accent; g.beginPath(); g.arc(0, s * .83, Math.max(.75, r * .13), 0, TAU); g.fill();
      } else if (family === 'seed' || family === 'thorn') {
        g.fillStyle = material.core;
        g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * .42, -s * .34, 0, s); g.quadraticCurveTo(-s * .42, -s * .34, 0, -s); g.fill();
        g.strokeStyle = material.core; g.lineWidth = 4;
        g.beginPath();
        g.moveTo(0, -s * .62); g.lineTo(-s * .68, -s * 1.02); g.moveTo(0, -s * .62); g.lineTo(s * .68, -s * 1.02);
        g.moveTo(-s * .15, s * .22); g.lineTo(-s * .72, s * .68); g.moveTo(s * .15, s * .22); g.lineTo(s * .72, s * .68);
        g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.18; g.stroke();
        g.strokeStyle = material.accent; g.lineWidth = .8;
        g.beginPath(); g.moveTo(0, -s * .68); g.lineTo(0, s * .68); g.stroke();
      } else if (family === 'needle') {
        g.strokeStyle = material.core; g.lineWidth = 4.2;
        g.beginPath(); g.moveTo(0, -s * 1.14); g.lineTo(0, s * 1.14); g.moveTo(-s * .78, -s * .64); g.lineTo(s * .78, s * .64); g.moveTo(s * .78, -s * .64); g.lineTo(-s * .78, s * .64); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.18; g.stroke();
        g.fillStyle = material.accent;
        g.beginPath(); g.moveTo(0, -s * .38); g.lineTo(s * .3, 0); g.lineTo(0, s * .38); g.lineTo(-s * .3, 0); g.closePath(); g.fill();
      } else {
        g.fillStyle = material.core;
        g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .52, 0); g.lineTo(0, s); g.lineTo(-s * .52, 0); g.closePath(); g.fill();
        g.strokeStyle = material.core; g.lineWidth = 4;
        g.beginPath(); g.moveTo(-s * .18, -s * .18); g.quadraticCurveTo(-s * 1.08, -s * .68, -s * .86, s * .16); g.moveTo(s * .18, -s * .18); g.quadraticCurveTo(s * 1.08, -s * .68, s * .86, s * .16); g.stroke();
        g.strokeStyle = material.edge; g.lineWidth = 1.2; g.stroke();
        g.strokeStyle = material.accent; g.lineWidth = .78;
        g.beginPath(); g.moveTo(-s * .3, 0); g.lineTo(s * .3, 0); g.stroke();
      }
    }
    g.restore();
  }

  function drawHostileNucleus(b, zone) {
    // The learned collision truth is never smaller than a ten-pixel lethal
    // silhouette in the three particulate-heavy biomes.
    const particulateZone = zone === 1 || zone === 3 || zone === 4;
    const outerMinimum = particulateZone ? 5 : (zone === 2 ? 3.4 : 3);
    const coreMinimum = particulateZone ? 2.35 : (zone === 2 ? 2.1 : 1.7);
    const outer = Math.max(outerMinimum, b.r * .42);
    const core = Math.max(coreMinimum, b.r * .21);
    const heading = Math.atan2(b.vy, b.vx);
    g.save();
    if (b.kind === 'needle' || b.kind === 'thorn') {
      g.rotate(heading);
      g.fillStyle = hostileTokens.ink;
      g.beginPath(); g.moveTo(outer * 1.55, 0); g.lineTo(0, outer * .68); g.lineTo(-outer * 1.08, 0); g.lineTo(0, -outer * .68); g.closePath(); g.fill();
      g.fillStyle = hostileTokens.danger;
      g.beginPath(); g.moveTo(core * 1.25, 0); g.lineTo(-core * .7, core * .42); g.lineTo(-core * .7, -core * .42); g.closePath(); g.fill();
      g.strokeStyle = hostileTokens.warning; g.lineWidth = .75;
      g.beginPath(); g.moveTo(-outer * .5, -outer * .35); g.lineTo(outer * .75, -outer * .12); g.stroke();
    } else if (b.kind === 'chime') {
      g.rotate(heading + Math.PI * .25);
      g.fillStyle = hostileTokens.ink; g.fillRect(-outer * .86, -outer * .86, outer * 1.72, outer * 1.72);
      g.fillStyle = hostileTokens.danger; g.fillRect(-core * .58, -core * .58, core * 1.16, core * 1.16);
      g.strokeStyle = hostileTokens.warning; g.lineWidth = .7; g.strokeRect(-outer * .58, -outer * .58, outer * 1.16, outer * 1.16);
    } else if (b.kind === 'seed') {
      g.rotate(heading);
      g.fillStyle = hostileTokens.ink;
      g.beginPath(); g.ellipse(0, 0, outer * 1.28, outer * .72, 0, 0, TAU); g.fill();
      g.fillStyle = hostileTokens.danger;
      g.beginPath(); g.ellipse(core * .12, 0, core * .95, core * .56, 0, 0, TAU); g.fill();
      g.strokeStyle = hostileTokens.warning; g.lineWidth = .7;
      g.beginPath(); g.moveTo(-outer * .72, -outer * .24); g.lineTo(outer * .62, -outer * .12); g.stroke();
    } else if (b.kind === 'bead' || b.kind === 'bell') {
      g.fillStyle = hostileTokens.ink; g.beginPath(); g.arc(0, 0, outer, 0, TAU); g.fill();
      g.strokeStyle = hostileTokens.danger; g.lineWidth = Math.max(1.5, core * .72); g.beginPath(); g.arc(0, 0, core * .72, 0, TAU); g.stroke();
      g.fillStyle = hostileTokens.warning; g.beginPath(); g.arc(-core * .18, -core * .18, Math.max(.7, core * .24), 0, TAU); g.fill();
    } else {
      g.fillStyle = hostileTokens.ink; g.beginPath(); g.arc(0, 0, outer, 0, TAU); g.fill();
      g.fillStyle = hostileTokens.danger; g.beginPath(); g.arc(0, 0, core, 0, TAU); g.fill();
      g.strokeStyle = hostileTokens.warning; g.lineWidth = .7;
      g.beginPath(); g.arc(0, 0, outer * .72, -1.18, -.12); g.stroke();
    }
    g.restore();
  }

  function drawEnemyBullet(b) {
    g.save(); g.translate(b.x, b.y);
    const bulletZone = clamp(Number.isInteger(b.zone) ? b.zone : world.zone, 0, projectileMaterials.length - 1);
    const material = projectileMaterials[bulletZone];
    const pulse = 1 + Math.sin(b.age * 9 + b.pulse) * .08;
    g.scale(pulse * 1.1, pulse * 1.1);
    g.shadowBlur = b.pluckPulse > 0 ? 10 : 0;
    g.shadowColor = b.pluckPulse > 0 ? '#fff0b0' : b.color;
    if (b.delay > 0) g.globalAlpha = .25 + Math.sin(b.delay * 24) * .12;
    drawProjectileFlightCue(b, bulletZone, material);
    if (b.kind === 'needle' || b.kind === 'thorn') {
      g.save();
      g.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      g.fillStyle = b.color;
      const quiver = b.kind === 'thorn' && b.delay > 0 ? 1 + Math.sin(b.delay * 42) * .22 : 1;
      g.beginPath(); g.moveTo(0, -b.r * 2.1 * quiver); g.lineTo(b.r * .58, b.r); g.lineTo(0, b.r * .55); g.lineTo(-b.r * .58, b.r); g.closePath(); g.fill();
      g.fillStyle = hostileTokens.ink; g.fillRect(-1, -b.r, 2, b.r * 1.4);
      g.restore();
    } else if (b.kind === 'seed') {
      g.save();
      g.rotate(Math.atan2(b.vy, b.vx));
      g.fillStyle = b.color; g.beginPath(); g.moveTo(b.r * 1.35, 0); g.quadraticCurveTo(0, b.r, -b.r * 1.15, 0); g.quadraticCurveTo(0, -b.r, b.r * 1.35, 0); g.fill();
      g.strokeStyle = material.edge; g.lineWidth = 1; g.stroke();
      g.restore();
    } else if (b.kind === 'bead') {
      g.strokeStyle = b.color; g.lineWidth = Math.max(2, b.r * .34);
      g.beginPath(); g.arc(0, 0, b.r * .82, 0, TAU); g.stroke();
      g.strokeStyle = material.accent; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, b.r * 1.18, -.8, .7); g.stroke();
    } else if (b.kind === 'bell') {
      const close = b.reverseAt ? clamp(1 - (b.reverseAt - b.age) / .38, 0, 1) : 0;
      g.strokeStyle = b.color; g.lineWidth = Math.max(2, b.r * .42); g.beginPath(); g.arc(0, 0, b.r * (1 - close * .25), 0, TAU); g.stroke();
      g.fillStyle = material.core; g.globalAlpha *= .35 + close * .55; g.beginPath(); g.arc(0, 0, b.r * .45, 0, TAU); g.fill();
      g.globalAlpha = b.delay > 0 ? .25 + Math.sin(b.delay * 24) * .12 : 1;
      g.strokeStyle = material.edge; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, b.r * 1.28, -.65, .75); g.stroke();
    } else if (b.kind === 'chime') {
      g.save();
      g.rotate(Math.atan2(b.vy, b.vx) - Math.PI / 2);
      g.fillStyle = b.color;
      g.beginPath(); g.moveTo(0, -b.r * 1.35); g.quadraticCurveTo(b.r * 1.2, 0, b.r * .8, b.r * 1.1); g.lineTo(-b.r * .8, b.r * 1.1); g.quadraticCurveTo(-b.r * 1.2, 0, 0, -b.r * 1.35); g.fill();
      g.strokeStyle = material.edge; g.lineWidth = 1; g.stroke();
      g.restore();
    } else {
      g.fillStyle = b.color;
      g.beginPath(); g.ellipse(0, 0, b.r * .72, b.r * 1.18, Math.atan2(b.vy, b.vx) - Math.PI / 2, 0, TAU); g.fill();
      g.strokeStyle = material.edge; g.lineWidth = 1; g.stroke();
    }
    drawProjectileMaterial(b, bulletZone);
    drawHostileNucleus(b, bulletZone);
    drawProjectileNearCue(b, material);
    const transformRemaining = bulletTransformRemaining(b);
    if (transformRemaining < .38) {
      const tell = 1 - transformRemaining / .38;
      g.strokeStyle = `rgba(255,245,211,${.35 + tell * .55})`;
      g.lineWidth = 1.2 + tell * 1.8;
      g.setLineDash([3, 3]);
      g.beginPath(); g.arc(0, 0, b.r * (1.65 + tell * .55), 0, TAU); g.stroke();
      g.setLineDash([]);
    }
    if (b.wakePlucked) {
      g.strokeStyle = 'rgba(216,251,255,.75)'; g.lineWidth = 1.4; g.setLineDash([2, 4]);
      g.beginPath(); g.arc(0, 0, b.r + 4, 0, TAU); g.stroke();
    }
    g.restore();
  }

  // Sparse phrases keep the fully live vector renderer. Dense barrages use a
  // cache built from that exact same material renderer, while bullets near the
  // player or approaching a transform remain live. This preserves the lethal
  // nucleus and authored silhouette without making a 150-shot phrase redraw
  // dozens of tiny paths per bullet every frame.
  const FAST_BULLET_THRESHOLD = 96;
  const BULLET_STAMP_SIZE = 64;
  const BULLET_ANGLE_STEPS = 24;
  const bulletStampCache = new Map();
  const patternGroupsScratch = new Map();
  const patternGroupPool = [];
  const SCAFFOLD_COLORS = Object.freeze(['201,246,255', '202,241,163', '255,218,174', '190,250,239', '144,220,238', '187,242,255']);
  const SCAFFOLD_DASHES = Object.freeze([[7, 10], [5, 9], [2, 8], [5, 9], [10, 5, 2, 5], [5, 9]]);
  const COUNTERWAKE_MATERIALS = Object.freeze([
    [[86, 223, 255], [255, 194, 105]],
    [[173, 247, 163], [255, 207, 111]],
    [[231, 248, 236], [255, 122, 91]],
    [[145, 248, 236], [255, 159, 184]],
    [[106, 224, 255], [255, 116, 80]],
    [[174, 247, 255], [255, 220, 126]]
  ]);

  function bulletStampFor(b) {
    const bulletZone = clamp(Number.isInteger(b.zone) ? b.zone : world.zone, 0, projectileMaterials.length - 1);
    const angle = Math.atan2(b.vy, b.vx);
    const angleStep = ((Math.round(angle / TAU * BULLET_ANGLE_STEPS) % BULLET_ANGLE_STEPS) + BULLET_ANGLE_STEPS) % BULLET_ANGLE_STEPS;
    const quantizedAngle = angleStep / BULLET_ANGLE_STEPS * TAU;
    const radius = Number.isFinite(b.r) ? b.r : 5;
    if (b.renderStamp && b.renderStampZone === bulletZone && b.renderStampAngleStep === angleStep
      && b.renderStampRadius === radius && b.renderStampKind === b.kind && b.renderStampColor === b.color) {
      return b.renderStamp;
    }
    const key = `${bulletZone}|${b.kind}|${radius}|${b.color}|${angleStep}`;
    let stamp = bulletStampCache.get(key);
    if (stamp) {
      b.renderStamp = stamp;
      b.renderStampZone = bulletZone;
      b.renderStampAngleStep = angleStep;
      b.renderStampRadius = radius;
      b.renderStampKind = b.kind;
      b.renderStampColor = b.color;
      return stamp;
    }

    stamp = document.createElement('canvas');
    stamp.width = BULLET_STAMP_SIZE;
    stamp.height = BULLET_STAMP_SIZE;
    const stampContext = stamp.getContext('2d', { alpha: true });
    stampContext.imageSmoothingEnabled = true;
    stampContext.imageSmoothingQuality = 'high';
    const center = BULLET_STAMP_SIZE / 2;
    const speed = Math.max(1, Math.hypot(b.vx, b.vy));
    const glyph = {
      ...b,
      x: center,
      y: center,
      r: radius,
      vx: Math.cos(quantizedAngle) * speed,
      vy: Math.sin(quantizedAngle) * speed,
      age: 0,
      pulse: 0,
      delay: 0,
      pluckPulse: 0,
      wakePlucked: false,
      flightAge: 0,
      hingeAt: 0,
      hinge2At: 0,
      reverseAt: 0,
      split: 0,
      stopAt: 0,
      refractY: 0
    };
    const sceneContext = g;
    try {
      buildingBulletStamp = true;
      g = stampContext;
      drawEnemyBullet(glyph);
    } finally {
      g = sceneContext;
      buildingBulletStamp = false;
    }
    bulletStampCache.set(key, stamp);
    b.renderStamp = stamp;
    b.renderStampZone = bulletZone;
    b.renderStampAngleStep = angleStep;
    b.renderStampRadius = radius;
    b.renderStampKind = b.kind;
    b.renderStampColor = b.color;
    return stamp;
  }

  function drawFastEnemyBullets() {
    const previousAlpha = g.globalAlpha;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    for (const b of enemyBullets) {
      if (b.dead) continue;
      const transformRemaining = bulletTransformRemaining(b);
      const needsLiveVector = b.wakePlucked || b.pluckPulse > 0 || transformRemaining < .38
        || (b.kind === 'thorn' && b.delay > 0)
        || (b.kind === 'bell' && b.reverseAt)
        || projectileNearPlayer(b);
      if (needsLiveVector) {
        g.globalAlpha = previousAlpha;
        drawEnemyBullet(b);
        continue;
      }
      const stamp = bulletStampFor(b);
      const pulse = 1 + Math.sin(b.age * 9 + b.pulse) * .08;
      const size = BULLET_STAMP_SIZE * pulse;
      g.globalAlpha = previousAlpha * (b.delay > 0 ? .25 + Math.sin(b.delay * 24) * .12 : 1);
      g.drawImage(stamp, b.x - size / 2, b.y - size / 2, size, size);
    }
    g.globalAlpha = previousAlpha;
  }

  function drawPatternScaffolds() {
    const groups = patternGroupsScratch;
    groups.clear();
    for (let i = 0; i < patternGroupPool.length; i++) patternGroupPool[i].points.length = 0;
    if (enemyBullets.length < 4 || enemyBullets.length > 520) return;
    let groupCount = 0;
    const maxGroups = settings.reduced ? 8 : 20;
    // Newest formations are the ones the player is currently parsing. Walk
    // backward and cap the phrase count so old off-screen ropes cannot tax the
    // renderer for their entire projectile lifetime.
    for (let bulletIndex = enemyBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
      const bullet = enemyBullets[bulletIndex];
      if (bullet.dead || !bullet.patternId || bullet.age > 4.15) continue;
      let group = groups.get(bullet.patternId);
      if (!group) {
        if (groups.size >= maxGroups) continue;
        group = patternGroupPool[groupCount];
        if (!group) {
          group = { points: [], zone: 0, kind: '', source: null, age: 0 };
          patternGroupPool.push(group);
        }
        groupCount++;
        group.zone = bullet.zone;
        group.kind = bullet.kind;
        group.source = bullet.source;
        group.age = bullet.age;
        groups.set(bullet.patternId, group);
      }
      group.age = Math.min(group.age, bullet.age);
      if (group.points.length < 24) group.points.push(bullet);
    }

    g.save();
    g.globalCompositeOperation = 'screen';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const group of groups.values()) {
      const points = group.points;
      if (points.length < 4) continue;
      const zone = clamp(Number.isInteger(group.zone) ? group.zone : world.zone, 0, 5);
      const alpha = (settings.reduced ? .055 : .105) * clamp(1 - Math.max(0, group.age - 2.7) / 2.4, .25, 1);
      g.strokeStyle = `rgba(${SCAFFOLD_COLORS[zone]},${alpha})`;
      g.lineWidth = zone === 2 || zone === 4 ? 1.05 : 1.35;
      g.setLineDash(SCAFFOLD_DASHES[zone]);

      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const previous = points[i - 1];
        const point = points[i];
        const dx = point.x - previous.x, dy = point.y - previous.y;
        if (dx * dx + dy * dy > 210 * 210) {
          g.moveTo(point.x, point.y);
        } else if (zone === 4) {
          const cornerX = i % 2 ? point.x : previous.x;
          g.lineTo(cornerX, previous.y);
          g.lineTo(cornerX, point.y);
          g.lineTo(point.x, point.y);
        } else if (zone === 0 || zone === 1 || zone === 3) {
          const sag = zone === 3 ? Math.sin(world.totalTime * 2.1 + i) * 7 : (zone === 1 ? -8 : 6);
          g.quadraticCurveTo((previous.x + point.x) * .5, (previous.y + point.y) * .5 + sag, point.x, point.y);
        } else {
          g.lineTo(point.x, point.y);
        }
      }
      const first = points[0], last = points[points.length - 1];
      if (points.length >= 7 && (first.x - last.x) ** 2 + (first.y - last.y) ** 2 < 150 ** 2) g.lineTo(first.x, first.y);
      g.stroke();

      // A faint umbilical from the actual emitter makes anatomy visibly cause
      // the phrase without pretending the scaffold itself can hurt the player.
      const emitter = findEmitter(group.source);
      if (emitter && group.age < 1.15 && points.length <= 18) {
        g.globalAlpha = .72;
        g.beginPath();
        for (let i = 0; i < points.length; i += Math.max(2, Math.floor(points.length / 6))) {
          g.moveTo(emitter.x, emitter.y);
          const point = points[i];
          if (zone === 4) {
            g.lineTo(point.x, emitter.y); g.lineTo(point.x, point.y);
          } else {
            g.quadraticCurveTo((emitter.x + point.x) * .5 + Math.sin(i) * 12, (emitter.y + point.y) * .5, point.x, point.y);
          }
        }
        g.stroke();
        g.globalAlpha = 1;
      }
    }
    g.setLineDash([]);
    g.restore();
  }

  function drawEnemyBullets() {
    if (enemyBullets.length <= FAST_BULLET_THRESHOLD) {
      for (const bullet of enemyBullets) drawEnemyBullet(bullet);
      return;
    }
    drawFastEnemyBullets();
  }

  function drawCounterwake() {
    const visibleWake = player.wakeEcho?.length > 1 ? player.wakeEcho : player.wake;
    if (visibleWake.length > 1) {
      g.save();
      g.lineCap = 'butt';
      g.lineJoin = 'miter';
      // A Counterwake is a hairline rupture with two locally refracted lips.
      // Its deliberately irregular spine keeps straight movement from turning
      // into a rounded progress bar, while the 310ms live edge stays unmistakable.
      const material = COUNTERWAKE_MATERIALS[world.zone] || COUNTERWAKE_MATERIALS[0];
      for (let i = 1; i < visibleWake.length; i++) {
        const a = visibleWake[i - 1], b = visibleWake[i];
        const age = world.totalTime - b.t;
        const alpha = clamp(1 - age / .62, 0, 1);
        const liveCut = age <= .31 ? 1 : clamp(1 - (age - .31) / .31, 0, 1) * .42;
        const dx = b.x - a.x, dy = b.y - a.y;
        const length = Math.hypot(dx, dy) || 1;
        const nx = -dy / length, ny = dx / length;
        const jitterA = Math.sin(a.t * 193.7 + i * 2.17) * (1.1 + liveCut * .8);
        const jitterB = Math.sin(b.t * 193.7 + (i + 1) * 2.17) * (1.1 + liveCut * .8);
        const ax = a.x + nx * jitterA, ay = a.y + ny * jitterA;
        const bx = b.x + nx * jitterB, by = b.y + ny * jitterB;

        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = `rgba(0,4,10,${alpha * (.58 + liveCut * .24)})`;
        g.lineWidth = 2.4 + liveCut * 1.3;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();

        g.globalCompositeOperation = 'screen';
        const fold = 2.2 + alpha * 1.5 + liveCut * 1.25;
        for (let side = -1; side <= 1; side += 2) {
          const color = material[side < 0 ? 0 : 1];
          g.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha * (.22 + liveCut * .42)})`;
          g.lineWidth = .75 + alpha * .45 + liveCut * .55;
          g.beginPath();
          g.moveTo(ax + nx * fold * side, ay + ny * fold * side);
          g.lineTo(bx + nx * fold * side, by + ny * fold * side);
          g.stroke();
        }
        g.strokeStyle = `rgba(235,254,255,${alpha * (.34 + liveCut * .46)})`;
        g.lineWidth = .65 + liveCut * .45;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();

        if (i % 4 === 0 && alpha > .12) {
          const stitch = 2.6 + alpha * 3.8 + liveCut * 1.8;
          g.strokeStyle = `rgba(230,253,255,${alpha * (.16 + liveCut * .2)})`;
          g.lineWidth = .8;
          g.beginPath();
          g.moveTo(bx - nx * stitch, by - ny * stitch);
          g.lineTo(bx + nx * stitch, by + ny * stitch);
          g.stroke();
        }
      }
      g.restore();
    }
    if (counterNeedles.length) {
      g.save(); g.globalCompositeOperation = 'screen';
      for (const n of counterNeedles) {
        const t = 1 - n.life / n.max;
        const head = ease(clamp(t * 1.7, 0, 1));
        const x = lerp(n.x, n.tx, head), y = lerp(n.y, n.ty, head);
        g.strokeStyle = n.live ? `rgba(255,239,170,${1 - t})` : `rgba(210,250,255,${1 - t})`;
        g.lineWidth = n.live ? 3.2 : 1.8;
        g.shadowBlur = n.live ? 14 : 8; g.shadowColor = n.live ? '#ffd36f' : '#bff7ff';
        g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(x, y); g.stroke();
        g.fillStyle = n.live ? '#fff0aa' : '#eaffff'; g.beginPath(); g.arc(x, y, n.live ? 4 : 2.5, 0, TAU); g.fill();
      }
      g.restore();
    }
  }

  const PLAYER_BULLET_STAMP_WIDTH = 48;
  const PLAYER_BULLET_STAMP_HEIGHT = 64;
  const playerBulletStampCache = new Map();

  function playerBulletStampFor(b) {
    if (b.playerRenderStamp && b.playerRenderStampReduced === settings.reduced) return b.playerRenderStamp;
    const key = `${b.counter ? 1 : 0}|${b.r}|${settings.reduced ? 1 : 0}`;
    let stamp = playerBulletStampCache.get(key);
    if (stamp) {
      b.playerRenderStamp = stamp;
      b.playerRenderStampReduced = settings.reduced;
      return stamp;
    }

    stamp = document.createElement('canvas');
    stamp.width = PLAYER_BULLET_STAMP_WIDTH;
    stamp.height = PLAYER_BULLET_STAMP_HEIGHT;
    const layer = stamp.getContext('2d', { alpha: true });
    const length = b.counter ? b.r * 7.2 : b.r * 5.7;
    const width = b.counter ? b.r * 1.9 : b.r * 1.55;
    layer.translate(PLAYER_BULLET_STAMP_WIDTH * .5, PLAYER_BULLET_STAMP_HEIGHT * .5);
    layer.fillStyle = 'rgba(2,13,22,.9)';
    layer.beginPath();
    layer.moveTo(0, -length * .58);
    layer.lineTo(width, length * .14);
    layer.lineTo(0, length * .48);
    layer.lineTo(-width, length * .14);
    layer.closePath();
    layer.fill();

    layer.globalCompositeOperation = 'screen';
    layer.shadowBlur = !settings.reduced && b.counter ? 5 : 0;
    layer.shadowColor = b.counter ? '#ffd07a' : '#63dff3';
    const plasma = layer.createLinearGradient(0, -length * .58, 0, length * .5);
    plasma.addColorStop(0, '#fff7ce');
    plasma.addColorStop(.24, b.counter ? '#ffd166' : '#dffeff');
    plasma.addColorStop(.72, b.counter ? 'rgba(255,166,73,.76)' : 'rgba(72,210,238,.72)');
    plasma.addColorStop(1, 'rgba(45,156,218,0)');
    layer.fillStyle = plasma;
    layer.beginPath();
    layer.moveTo(0, -length * .52);
    layer.quadraticCurveTo(width * .64, -length * .05, width * .42, length * .3);
    layer.lineTo(0, length * .46);
    layer.lineTo(-width * .42, length * .3);
    layer.quadraticCurveTo(-width * .64, -length * .05, 0, -length * .52);
    layer.fill();
    layer.strokeStyle = 'rgba(255,255,255,.86)';
    layer.lineWidth = 1.35;
    layer.beginPath();
    layer.moveTo(0, -length * .43);
    layer.lineTo(0, length * .22);
    layer.stroke();
    playerBulletStampCache.set(key, stamp);
    b.playerRenderStamp = stamp;
    b.playerRenderStampReduced = settings.reduced;
    return stamp;
  }

  function drawPlayerBullet(b) {
    g.save();
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const nx = b.vx / speed;
    const ny = b.vy / speed;
    const trailStartIndex = b.trailCount
      ? ((b.trailHead - b.trailCount + b.trailCapacity) % b.trailCapacity) * 2
      : -1;
    const trailStartX = trailStartIndex >= 0 ? b.trail[trailStartIndex] : b.x - nx * 22;
    const trailStartY = trailStartIndex >= 0 ? b.trail[trailStartIndex + 1] : b.y - ny * 22;

    // A dark material separator keeps friendly fire visible without making it
    // the brightest, least-authored object in the scene.
    g.strokeStyle = 'rgba(1,9,17,.72)';
    g.lineWidth = b.counter ? 9 : 7;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(trailStartX, trailStartY); g.lineTo(b.x, b.y); g.stroke();

    g.globalCompositeOperation = 'screen';
    g.strokeStyle = b.counter ? 'rgba(255,212,116,.78)' : 'rgba(100,224,247,.62)';
    g.lineWidth = b.counter ? 5 : 3.8;
    // Per-shot Canvas shadows force an expensive blur for every pellet. The
    // screened outer stroke already supplies a stable halo; only rare homing
    // counter-shots retain a small accent bloom.
    g.shadowBlur = !settings.reduced && b.counter ? 5 : 0;
    g.shadowColor = b.counter ? '#ffd07a' : '#63dff3';
    if (b.trailCount > 1) {
      g.beginPath(); g.moveTo(trailStartX, trailStartY);
      for (let i = 1; i < b.trailCount; i++) {
        const index = ((b.trailHead - b.trailCount + i + b.trailCapacity) % b.trailCapacity) * 2;
        g.lineTo(b.trail[index], b.trail[index + 1]);
      }
      g.stroke();
    }

    const stamp = playerBulletStampFor(b);
    g.translate(b.x, b.y);
    g.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
    g.globalCompositeOperation = 'source-over';
    g.shadowBlur = 0;
    g.drawImage(stamp, -PLAYER_BULLET_STAMP_WIDTH * .5, -PLAYER_BULLET_STAMP_HEIGHT * .5);
    g.restore();
  }

  function drawLaterEnemy(e) {
    const flash = e.flash > 0;
    if (e.type === 'milkmoth') {
      const flap = Math.sin(e.age * 7 + e.seed) * 8;
      g.fillStyle = flash ? '#fff' : '#e8e1bd';
      g.beginPath(); g.moveTo(0, -8); g.quadraticCurveTo(-26, -24 - flap, -36, 8); g.quadraticCurveTo(-15, 20, 0, 9); g.quadraticCurveTo(15, 20, 36, 8); g.quadraticCurveTo(26, -24 + flap, 0, -8); g.fill();
      g.strokeStyle = '#fff2cc'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#3c3038'; g.beginPath(); g.ellipse(0, 2, 5, 17, 0, 0, TAU); g.fill();
      g.strokeStyle = '#84ba7d'; g.lineWidth = 2; g.beginPath(); g.moveTo(-3, -8); g.lineTo(-23, 8); g.moveTo(3, -8); g.lineTo(23, 8); g.stroke();
    } else if (e.type === 'pendulumbulb') {
      g.strokeStyle = '#9cc881'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -58); g.quadraticCurveTo(-8, -30, 0, -20); g.stroke();
      g.fillStyle = flash ? '#fff' : '#e3be66'; g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(28, -21, 31, 18, 0, 32); g.bezierCurveTo(-31, 18, -28, -21, 0, -28); g.fill();
      g.strokeStyle = '#f7e2a5'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#2f2a35'; g.beginPath(); g.ellipse(0, 5, 11, 15, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,247,210,.5)'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 8, -18); g.lineTo(i * 12, 22); g.stroke(); }
    } else if (e.type === 'prunerhand') {
      g.rotate(e.side * .18 + Math.sin(e.age * 2) * .08);
      g.fillStyle = flash ? '#fff' : '#92b978'; g.beginPath(); g.ellipse(0, 4, 17, 22, 0, 0, TAU); g.fill();
      g.strokeStyle = '#f0e2bc'; g.lineWidth = 5; g.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 6, -7); g.lineTo(i * 10, -30 - Math.abs(i) * 3); g.stroke(); }
      g.strokeStyle = '#c7a65d'; g.lineWidth = 4; g.beginPath(); g.moveTo(-12, 8); g.lineTo(-31, 29); g.moveTo(12, 8); g.lineTo(31, 29); g.stroke();
      g.fillStyle = '#232631'; g.beginPath(); g.arc(0, 5, 6, 0, TAU); g.fill();
    } else if (e.type === 'grafthound') {
      const stride = Math.sin(e.age * 8) * 6;
      g.strokeStyle = flash ? '#fff' : '#d7cf9f'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(0, -20, 23, -2); g.stroke();
      for (const side of [-1, 1]) { g.beginPath(); g.moveTo(side * 13, 0); g.lineTo(side * (20 + stride), 25); g.stroke(); }
      g.fillStyle = '#779666'; g.beginPath(); g.moveTo(18, -7); g.lineTo(35, -20); g.lineTo(31, 4); g.closePath(); g.fill();
      g.fillStyle = '#ffcf71'; g.beginPath(); g.arc(27, -7, 4, 0, TAU); g.fill();
    } else if (e.type === 'marrowskate') {
      g.rotate(e.side * .12);
      g.fillStyle = flash ? '#fff' : '#ead8ae'; g.beginPath(); g.moveTo(0, -25); g.lineTo(34, 20); g.lineTo(0, 10); g.lineTo(-34, 20); g.closePath(); g.fill();
      g.strokeStyle = '#fff0c9'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#7d3b3d'; g.beginPath(); g.moveTo(0, -17); g.lineTo(7, 8); g.lineTo(-7, 8); g.closePath(); g.fill();
      g.strokeStyle = '#d45d4e'; g.beginPath(); g.moveTo(-22, 15); g.lineTo(22, 15); g.stroke();
    } else if (e.type === 'spinetick') {
      g.fillStyle = flash ? '#fff' : '#231c28'; g.beginPath();
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; const r = i % 2 ? 18 : 29; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
      g.strokeStyle = '#e4c895'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#ffcc6c'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,239,196,.55)'; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + e.age; g.beginPath(); g.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); g.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); g.stroke(); }
    } else if (e.type === 'bannerkite') {
      g.rotate(e.side * .12);
      g.fillStyle = flash ? '#fff' : '#a34a42'; g.beginPath(); g.moveTo(-44, -13); g.quadraticCurveTo(0, -28, 44, -8); g.lineTo(31, 15); g.quadraticCurveTo(-8, 3, -44, 13); g.closePath(); g.fill();
      g.strokeStyle = '#f1d5a8'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#262431'; g.beginPath(); g.ellipse(8, 0, 8, 12, 0, 0, TAU); g.fill();
      g.strokeStyle = '#f6c66b'; g.beginPath(); g.moveTo(-38, 4); g.quadraticCurveTo(-66, 25, -83, 6 + Math.sin(e.age * 5) * 8); g.stroke();
    } else if (e.type === 'ribshepherd') {
      g.strokeStyle = flash ? '#fff' : '#e5d5ae'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 12, 34, Math.PI, TAU); g.stroke();
      for (let i = -2; i <= 2; i++) { g.lineWidth = 3; g.beginPath(); g.moveTo(i * 13, -7); g.lineTo(i * 18, 34); g.stroke(); }
      g.fillStyle = '#7a3a3b'; g.beginPath(); g.ellipse(0, 9, 12, 17, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffcf70'; g.beginPath(); g.arc(0, 5, 4, 0, TAU); g.fill();
    } else if (e.type === 'ciliawheel') {
      g.save(); g.rotate(e.age * .6);
      g.strokeStyle = flash ? '#fff' : '#cce8cb'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.stroke();
      g.lineWidth = 3; for (let i = 0; i < 18; i++) { const a = i * TAU / 18; g.beginPath(); g.moveTo(Math.cos(a) * 25, Math.sin(a) * 25); g.lineTo(Math.cos(a) * (35 + Math.sin(e.age * 4 + i) * 4), Math.sin(a) * (35 + Math.sin(e.age * 4 + i) * 4)); g.stroke(); }
      g.fillStyle = '#16313b'; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill(); g.restore();
    } else if (e.type === 'valveray') {
      const open = .72 + Math.sin(e.age * 2.2) * .2;
      g.fillStyle = flash ? '#fff' : 'rgba(190,239,220,.72)'; g.beginPath(); g.moveTo(0, -34 * open); g.lineTo(38, 0); g.lineTo(0, 34 * open); g.lineTo(-38, 0); g.closePath(); g.fill();
      g.strokeStyle = '#e7f3d5'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#17303a'; g.beginPath(); g.ellipse(0, 0, 9, 16, 0, 0, TAU); g.fill();
      g.strokeStyle = '#f3cf72'; g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke();
    } else if (e.type === 'nacreleech') {
      g.rotate(Math.atan2(e.y - e.py, e.x - e.px) + Math.PI / 2);
      g.fillStyle = flash ? '#fff' : '#a9ddc9'; g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(24, -8, 18, 20, -5, 29); g.bezierCurveTo(9, 11, 6, -4, 0, -28); g.fill();
      g.strokeStyle = '#edf7d8'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#26303a'; g.beginPath(); g.arc(4, -9, 5, 0, TAU); g.fill();
    } else if (e.type === 'airpearl') {
      const squeeze = e.charge ? 1 + Math.sin(e.telegraph * 35) * .12 : 1 + Math.sin(e.age * 1.4) * .04;
      g.scale(squeeze, 1 / squeeze);
      g.fillStyle = flash ? '#fff' : 'rgba(211,248,225,.7)'; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill();
      g.strokeStyle = '#f1f5d6'; g.lineWidth = 3; g.stroke();
      g.strokeStyle = 'rgba(99,191,184,.65)'; g.beginPath(); g.arc(-5, -4, 20, -.8, 2.4); g.stroke();
      g.fillStyle = '#ffcf73'; g.beginPath(); g.arc(7, 6, 7, 0, TAU); g.fill();
    } else if (e.type === 'chimneyheron') {
      g.fillStyle = flash ? '#fff' : '#747781'; g.fillRect(-18, -24, 36, 48);
      g.fillStyle = '#a94f45'; g.fillRect(-11, -46, 13, 27); g.fillRect(7, -38, 9, 20);
      g.strokeStyle = '#dad4bd'; g.lineWidth = 4; g.beginPath(); g.moveTo(-10, 23); g.lineTo(-19, 48); g.moveTo(10, 23); g.lineTo(20, 48); g.stroke();
      g.beginPath(); g.moveTo(15, -12); g.lineTo(35, -23); g.stroke();
      g.fillStyle = '#ffcc70'; g.beginPath(); g.arc(13, -15, 4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,219,157,.22)'; for (let y = -12; y <= 11; y += 12) for (let x = -9; x <= 9; x += 9) g.fillRect(x - 2, y - 3, 4, 6);
    } else if (e.type === 'tramcentipede') {
      g.rotate(e.side * .1);
      for (let i = -3; i <= 3; i++) {
        const x = -e.side * i * 20, y = i * 6 + Math.sin(e.age * 3 + i) * 3;
        g.fillStyle = flash ? '#fff' : (i % 2 ? '#b05a4c' : '#555866'); g.fillRect(x - 12, y - 10, 24, 20);
        g.strokeStyle = '#e0d5bb'; g.lineWidth = 1.5; g.strokeRect(x - 12, y - 10, 24, 20);
        g.fillStyle = '#ffd078'; g.fillRect(x - 6, y - 4, 12, 5);
      }
      g.strokeStyle = '#262933'; g.lineWidth = 4; g.beginPath(); g.moveTo(-72, 0); g.lineTo(72, 0); g.stroke();
    } else if (e.type === 'signaltripod') {
      g.strokeStyle = flash ? '#fff' : '#c7c1aa'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, -25); g.lineTo(0, 13); g.lineTo(-24, 36); g.moveTo(0, 13); g.lineTo(24, 36); g.stroke();
      g.fillStyle = '#282b35'; g.fillRect(-22, -34, 44, 22);
      const dir = Math.floor(e.age) % 2 ? 1 : -1; g.fillStyle = '#ffca6d'; g.beginPath(); g.moveTo(dir * 15, -23); g.lineTo(-dir * 2, -31); g.lineTo(-dir * 2, -15); g.closePath(); g.fill();
      g.strokeStyle = '#a85449'; g.lineWidth = 3; g.strokeRect(-22, -34, 44, 22);
    } else if (e.type === 'umbrellamite') {
      const open = .65 + Math.sin(e.age * 4) * .12;
      g.fillStyle = flash ? '#fff' : '#d6cbb5'; g.beginPath(); g.arc(0, 0, 27, Math.PI, TAU); g.lineTo(0, 0); g.closePath(); g.fill();
      g.strokeStyle = '#a64f47'; g.lineWidth = 2; g.stroke();
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(i * 10 * open, -Math.sqrt(Math.max(0, 27 ** 2 - (i * 10) ** 2))); g.stroke(); }
      g.strokeStyle = '#d9d2bc'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(7, 26, -7, 36); g.stroke();
      g.fillStyle = '#242733'; g.beginPath(); g.arc(0, 2, 5, 0, TAU); g.fill();
    } else if (e.type === 'skyscrivener') {
      g.rotate(e.side * .1 + Math.sin(e.age) * .08);
      g.fillStyle = flash ? '#fff' : '#f5f0da'; g.beginPath(); g.moveTo(-45, 4); g.quadraticCurveTo(-8, -26, 21, -9); g.quadraticCurveTo(43, -2, 55, -20); g.quadraticCurveTo(42, 10, 14, 10); g.quadraticCurveTo(-18, 24, -45, 4); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#174469'; g.beginPath(); g.arc(18, -5, 5, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(-38, 8); g.quadraticCurveTo(-61, 30, -83, 8 + Math.sin(e.age * 3) * 9); g.stroke();
    } else if (e.type === 'shedling') {
      g.globalAlpha *= .84;
      g.fillStyle = flash ? '#fff' : 'rgba(239,247,231,.75)'; g.beginPath(); g.ellipse(0, 0, 14, 25, 0, 0, TAU); g.fill();
      g.strokeStyle = '#392d3c'; g.lineWidth = 2; g.stroke();
      for (const side of [-1, 1]) for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(side * 10, i * 8); g.lineTo(side * 27, i * 14 + Math.sin(e.age * 5 + i) * 4); g.stroke(); }
      g.fillStyle = '#f25953'; g.beginPath(); g.arc(0, -9, 4, 0, TAU); g.fill();
    } else if (e.type === 'sunbladder') {
      const pulse = 1 + Math.sin(e.age * 1.1) * .05; g.scale(pulse, pulse);
      const glow = g.createRadialGradient(0, 0, 4, 0, 0, 41); glow.addColorStop(0, 'rgba(255,245,188,.8)'); glow.addColorStop(.45, 'rgba(255,211,123,.25)'); glow.addColorStop(1, 'rgba(255,255,255,.05)');
      g.fillStyle = flash ? '#fff' : glow; g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.fill();
      g.strokeStyle = '#fff5d4'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#1e4a68'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-5, -7, 21, -1.2, .4); g.stroke();
    } else if (e.type === 'migrationthorn') {
      g.rotate(e.side * .18);
      g.fillStyle = flash ? '#fff' : '#f5edd4'; g.beginPath(); g.moveTo(0, -36); g.lineTo(17, -8); g.lineTo(39, 0); g.lineTo(16, 9); g.lineTo(0, 35); g.lineTo(-16, 9); g.lineTo(-39, 0); g.lineTo(-17, -8); g.closePath(); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#1c3650'; g.beginPath(); g.moveTo(0, -22); g.lineTo(8, 0); g.lineTo(0, 22); g.lineTo(-8, 0); g.closePath(); g.fill();
      g.strokeStyle = '#f15c55'; g.lineWidth = 3; g.beginPath(); g.moveTo(-28, 0); g.lineTo(28, 0); g.stroke();
    } else return false;
    return true;
  }

  function drawEnemy(e) {
    g.save(); g.translate(e.x, e.y);
    const enterAlpha = e.enter > 0 ? clamp(1 - e.enter, 0, 1) : 1;
    g.globalAlpha = enterAlpha;
    if (e.flash > 0) { g.shadowBlur = 24; g.shadowColor = '#ffffff'; }
    if (window.RAIN_ART?.drawFieldEnemyLocal(g, e, { zone: world.zone, time: world.totalTime })) {
      g.restore();
      return;
    }
    if (e.type === 'skifftick') {
      const scull = Math.sin(e.age * 9 + e.seed) * 5;
      g.rotate(clamp((e.x - e.px) * .012, -.35, .35));
      g.strokeStyle = 'rgba(188,240,242,.48)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-26, 16); g.quadraticCurveTo(-8, 23 + scull, 22, 18); g.stroke();
      g.fillStyle = e.flash ? '#ffffff' : '#a94f43';
      g.beginPath(); g.moveTo(-22, 5); g.quadraticCurveTo(0, 20, 25, 3); g.lineTo(16, 17); g.quadraticCurveTo(-2, 28, -19, 14); g.closePath(); g.fill();
      g.strokeStyle = '#f1d7ae'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#e8ddc1';
      g.beginPath(); g.moveTo(-7, 3); g.lineTo(4, -25); g.lineTo(17, 3); g.closePath(); g.fill();
      g.strokeStyle = '#2a2530'; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, 3); g.lineTo(4, -25); g.lineTo(4, 6); g.stroke();
      g.fillStyle = '#1a2130'; g.beginPath(); g.arc(-10, 9, 4, 0, TAU); g.fill();
      g.strokeStyle = '#ddb063'; g.lineWidth = 2;
      for (const side of [-1, 1]) { g.beginPath(); g.moveTo(side * 13, 13); g.lineTo(side * (25 + scull * .2), 22 + scull * side); g.stroke(); }
    } else if (e.type === 'buoychoir') {
      g.strokeStyle = '#d9c9a5'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-29, -18); g.quadraticCurveTo(0, -37, 29, -18); g.stroke();
      for (let i = -1; i <= 1; i++) {
        const swing = Math.sin(e.age * 2.2 + i) * 9;
        const x = i * 26 + swing, y = 7 + Math.cos(e.age * 2.2 + i) * 8;
        g.strokeStyle = '#5e5654'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 22, -20); g.lineTo(x, y - 15); g.stroke();
        g.fillStyle = e.flash ? '#ffffff' : (i === 0 ? '#e6c79e' : '#b85d4e');
        g.beginPath(); g.moveTo(x, y - 17); g.quadraticCurveTo(x + 13, y - 5, x + 9, y + 13); g.quadraticCurveTo(x, y + 22, x - 9, y + 13); g.quadraticCurveTo(x - 13, y - 5, x, y - 17); g.fill();
        g.strokeStyle = '#fff0c9'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = '#27232c'; g.beginPath(); g.arc(x, y + 3, 4.5, 0, TAU); g.fill();
        g.fillStyle = '#ffcf78'; g.beginPath(); g.arc(x, y + 17, 3.5, 0, TAU); g.fill();
      }
    } else if (e.type === 'netkite') {
      g.rotate(Math.sin(e.age * 1.7 + e.seed) * .14);
      const flex = Math.sin(e.age * 4) * 3;
      g.fillStyle = e.flash ? 'rgba(255,255,255,.9)' : 'rgba(102,157,156,.48)';
      g.beginPath(); g.moveTo(0, -34); g.lineTo(31 + flex, 0); g.lineTo(0, 34); g.lineTo(-31 - flex, 0); g.closePath(); g.fill();
      g.strokeStyle = '#ead9b6'; g.lineWidth = 3; g.stroke();
      g.lineWidth = 1; g.strokeStyle = 'rgba(236,225,194,.62)';
      for (let i = -2; i <= 2; i++) {
        g.beginPath(); g.moveTo(-25, i * 9); g.lineTo(25, -i * 9); g.stroke();
        g.beginPath(); g.moveTo(i * 9, -27); g.lineTo(-i * 9, 27); g.stroke();
      }
      g.fillStyle = '#202331'; g.beginPath(); g.ellipse(0, 0, 8, 12, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffcc76'; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(201,251,255,.4)'; g.beginPath(); g.moveTo(0, 34); g.quadraticCurveTo(18, 48, 4, 62); g.stroke();
    } else if (e.type === 'lanternray') {
      const flare = e.charge === 1 ? .7 + Math.sin(e.telegraph * 32) * .3 : .35;
      g.fillStyle = e.flash ? '#fff' : '#161c29';
      g.beginPath(); g.moveTo(0, -28); g.quadraticCurveTo(25, -16, 46, 8); g.quadraticCurveTo(20, 5, 13, 26); g.quadraticCurveTo(0, 17, -13, 26); g.quadraticCurveTo(-20, 5, -46, 8); g.quadraticCurveTo(-25, -16, 0, -28); g.fill();
      g.strokeStyle = '#e7d6af'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = 'rgba(202,246,242,.35)'; g.beginPath(); g.moveTo(-35, 5); g.quadraticCurveTo(0, -6, 35, 5); g.stroke();
      g.fillStyle = '#f6d27c'; g.shadowBlur = e.charge === 1 ? 22 : 8; g.shadowColor = '#ffd376';
      g.beginPath(); g.ellipse(0, -5, 10 + flare * 4, 7 + flare * 3, 0, 0, TAU); g.fill();
      g.shadowBlur = 0; g.fillStyle = '#241f2e'; g.beginPath(); g.ellipse(0, -5, 4, 6, 0, 0, TAU); g.fill();
      g.strokeStyle = '#bd5f50'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 20); g.quadraticCurveTo(Math.sin(e.age * 3) * 18, 40, -4, 58); g.stroke();
    } else {
      drawLaterEnemy(e);
    }
    g.restore();
  }

  function drawTrawlmotherBoss(b) {
    if (!b) return;
    g.save(); g.translate(b.x, b.y);
    const alpha = b.dead ? clamp(world.bossDeath / BOSS_DEATH_DURATION, 0, 1) : 1;
    g.globalAlpha = alpha;
    const hurt = b.flash > 0;
    const pulse = 1 + Math.sin(b.age * 1.9) * .018;
    g.scale(pulse, pulse);
    if (b.phase === 2) {
      g.save(); g.globalAlpha *= .3; g.scale(1.35, .58); g.fillStyle = '#06101b';
      g.beginPath(); g.ellipse(0, 20, 106, 88, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(188,235,236,.5)'; g.lineWidth = 7;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(0, 20, 118 + i * 24 + Math.sin(b.age * 3 + i) * 5, 91 + i * 11, 0, 0, TAU); g.stroke(); }
      g.restore();
    }

    g.globalCompositeOperation = 'screen';
    const aura = g.createRadialGradient(0, 8, 20, 0, 8, 178);
    aura.addColorStop(0, hurt ? 'rgba(255,255,255,.5)' : 'rgba(255,198,112,.2)'); aura.addColorStop(1, 'rgba(255,180,90,0)');
    g.fillStyle = aura; g.fillRect(-190, -170, 380, 360);
    g.globalCompositeOperation = 'source-over';

    for (const side of [-1, 1]) {
      g.save(); g.scale(side, 1);
      g.strokeStyle = '#713f38'; g.lineWidth = 17; g.lineCap = 'round';
      g.beginPath(); g.moveTo(56, -15); g.quadraticCurveTo(116, -68, 153, -8); g.quadraticCurveTo(173, 34, 137, 73); g.stroke();
      g.strokeStyle = '#edcf9e'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#242532'; g.beginPath(); g.arc(143, 53, 27, 0, TAU); g.fill();
      g.strokeStyle = '#ffca70'; g.lineWidth = 7; g.beginPath(); g.arc(143, 53, 17, 0, TAU); g.stroke();
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + b.age * .3 * side; g.fillStyle = '#d2b88d'; g.fillRect(141 + Math.cos(a) * 24, 51 + Math.sin(a) * 24, 5, 5); }
      g.strokeStyle = 'rgba(215,238,226,.38)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(145, 74); g.quadraticCurveTo(170, 112, 138 + Math.sin(b.age * 2) * 20, 174); g.stroke();
      g.restore();
    }

    g.fillStyle = hurt ? '#ffffff' : '#d9c9a9';
    g.beginPath();
    g.moveTo(-96, -8); g.bezierCurveTo(-75, -88, -38, -113, 0, -104); g.bezierCurveTo(38, -113, 75, -88, 96, -8);
    g.bezierCurveTo(72, 18, 59, 71, 0, 92); g.bezierCurveTo(-59, 71, -72, 18, -96, -8); g.fill();
    g.strokeStyle = '#fff0c8'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#a95445';
    g.beginPath(); g.moveTo(-88, -4); g.quadraticCurveTo(0, -55, 88, -4); g.lineTo(70, 12); g.quadraticCurveTo(0, -22, -70, 12); g.closePath(); g.fill();

    const jawOpen = b.phase === 3 ? 1 : .55 + Math.sin(b.age * 1.2) * .08;
    g.fillStyle = '#1b1f2a'; g.beginPath(); g.ellipse(0, 19, 54, 47 * jawOpen, 0, 0, TAU); g.fill();
    g.strokeStyle = '#ffcb73'; g.lineWidth = 4; g.stroke();
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7 + (b.phase === 3 ? b.age * .38 : 0);
      const rr = b.phase === 3 ? 43 : 34;
      g.save(); g.translate(Math.cos(a) * rr, 19 + Math.sin(a) * rr * jawOpen); g.rotate(a + Math.PI / 2);
      g.fillStyle = i % 2 ? '#efe0ba' : '#c36a52'; g.beginPath(); g.moveTo(0, -13); g.lineTo(8, 8); g.lineTo(-8, 8); g.closePath(); g.fill(); g.restore();
    }
    g.fillStyle = '#080d16'; g.beginPath(); g.arc(0, 19, 13, 0, TAU); g.fill();
    g.fillStyle = '#c9fbff'; g.beginPath(); g.arc(0, 19, 4, 0, TAU); g.fill();

    g.strokeStyle = 'rgba(218,234,213,.5)'; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const x = -66 + i * 22;
      g.beginPath(); g.moveTo(x, 70); g.quadraticCurveTo(x + Math.sin(b.age * 1.7 + i) * 28, 126, x - 12, 185); g.stroke();
      for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(x + Math.sin(b.age * 1.7 + i) * 8 * k, 72 + k * 29, 3, 0, TAU); g.stroke(); }
    }
    g.restore();
  }

  function drawBoss(b) {
    if (!b) return;
    if (window.RAIN_ART?.drawBoss(g, b, {
      zone: b.configIndex,
      bossDeath: world.bossDeath,
      reducedEffects: settings.reduced
    })) return;
    drawTrawlmotherBoss(b);
  }

  function drawPlayer() {
    if (player.dead && Math.floor(world.totalTime * 18) % 2) return;
    if (window.RAIN_ART?.drawPlayer(g, player, {
      time: world.totalTime,
      bulletDensity: enemyBullets.length,
      reducedEffects: settings.reduced
    })) return;
    g.save(); g.translate(player.x, player.y);
    if (player.invuln > 0 && Math.floor(player.invuln * 14) % 2) g.globalAlpha = .38;
    g.rotate(player.bank * .18);
    const wingFold = player.wing;

    g.globalCompositeOperation = 'screen';
    const tail = g.createLinearGradient(0, 10, 0, 72);
    tail.addColorStop(0, 'rgba(201,251,255,.75)'); tail.addColorStop(1, 'rgba(109,214,232,0)');
    g.fillStyle = tail;
    g.beginPath(); g.moveTo(-7, 14); g.quadraticCurveTo(-12 - player.bank * 8, 45, -2, 72); g.lineTo(3, 72); g.quadraticCurveTo(12 - player.bank * 8, 45, 7, 14); g.fill();
    g.globalCompositeOperation = 'source-over';

    const span = lerp(31, 15, wingFold);
    const back = lerp(10, 22, wingFold);
    g.fillStyle = '#d8eee7';
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, -29); g.quadraticCurveTo(-8, -4, -span, back); g.quadraticCurveTo(-15, 13, 0, 25); g.quadraticCurveTo(15, 13, span, back); g.quadraticCurveTo(8, -4, 0, -29); g.fill(); g.stroke();
    g.fillStyle = '#15283a';
    g.beginPath(); g.moveTo(0, -22); g.quadraticCurveTo(-7, 0, 0, 21); g.quadraticCurveTo(7, 0, 0, -22); g.fill();
    g.strokeStyle = '#ffcf78'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-span * .72, back * .66); g.lineTo(-3, 3); g.lineTo(0, -18); g.lineTo(3, 3); g.lineTo(span * .72, back * .66); g.stroke();

    if (player.focus || player.grazePulse > 0 || enemyBullets.length > 170) {
      g.globalCompositeOperation = 'screen';
      g.shadowBlur = 15; g.shadowColor = '#fff';
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, player.radius, 0, TAU); g.fill();
      g.strokeStyle = '#ffcf78'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, player.radius + 5, 0, TAU); g.stroke();
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();

    if (player.counterPulse > 0) {
      const t = 1 - player.counterPulse / .24;
      g.save(); g.globalCompositeOperation = 'screen';
      g.strokeStyle = `rgba(255,239,170,${1 - t})`; g.lineWidth = 3 * (1 - t) + 1;
      g.beginPath(); g.arc(player.x, player.y, 12 + t * 32, 0, TAU); g.stroke(); g.restore();
    }
  }

  function drawParticles(front = false) {
    g.save(); g.globalCompositeOperation = 'screen';
    for (const p of particles) {
      const frontLayer = p.type !== 'rain';
      if (frontLayer !== front) continue;
      const a = clamp(p.life / p.max, 0, 1);
      g.globalAlpha = a;
      g.fillStyle = p.color;
      if (p.type === 'rain') g.fillRect(p.x, p.y, Math.max(1, p.size * .35), p.size * 4);
      else if (p.type === 'shard') { g.save(); g.translate(p.x, p.y); g.rotate((p.life + p.x) * 4); g.fillRect(-p.size / 2, -p.size / 6, p.size, p.size / 3); g.restore(); }
      else if (p.type === 'ring') {
        const travel = 1 - a;
        g.strokeStyle = p.color;
        g.lineWidth = 1 + a * 3;
        g.beginPath(); g.arc(p.x, p.y, lerp(p.start || 4, p.size, ease(travel)), 0, TAU); g.stroke();
      }
      else { g.beginPath(); g.arc(p.x, p.y, p.size * a, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  function wideWorldPresentation() {
    return cssW > cssH * 1.2 && playRect.x > 72;
  }

  function useScreenHud() {
    return (input.touchMode && playRect.scaleY < .62) || wideWorldPresentation();
  }

  function drawInstrumentPlate(target, x, y, w, h, edge = 'left') {
    target.save();
    target.beginPath();
    if (edge === 'left') {
      target.moveTo(x, y); target.lineTo(x + w - 15, y); target.lineTo(x + w, y + 15);
      target.lineTo(x + w, y + h); target.lineTo(x, y + h); target.closePath();
    } else {
      target.moveTo(x + 15, y); target.lineTo(x + w, y); target.lineTo(x + w, y + h);
      target.lineTo(x, y + h); target.lineTo(x, y + 15); target.closePath();
    }
    const glass = target.createLinearGradient(x, y, x + w, y + h);
    glass.addColorStop(0, 'rgba(2,9,15,.91)');
    glass.addColorStop(.58, 'rgba(3,14,21,.76)');
    glass.addColorStop(1, 'rgba(7,24,30,.52)');
    target.fillStyle = glass; target.fill();
    target.strokeStyle = 'rgba(201,251,255,.24)'; target.lineWidth = 1; target.stroke();
    target.strokeStyle = 'rgba(255,208,131,.82)'; target.lineWidth = 2;
    target.beginPath();
    const edgeX = edge === 'left' ? x + 1 : x + w - 1;
    target.moveTo(edgeX, y + 6); target.lineTo(edgeX, y + h - 6); target.stroke();
    target.globalCompositeOperation = 'screen';
    target.strokeStyle = 'rgba(201,251,255,.09)'; target.lineWidth = 1;
    for (let offset = 26; offset < w - 12; offset += 44) {
      target.beginPath(); target.moveTo(x + offset, y + 6); target.lineTo(x + offset - 12, y + h - 6); target.stroke();
    }
    target.restore();
  }

  function drawHealthPetals(target, right, y, spacing = 29, scale = 1) {
    target.save(); target.lineWidth = 1.25 * scale;
    for (let i = 0; i < player.maxHealth; i++) {
      const x = right - i * spacing;
      target.strokeStyle = i < player.health ? 'rgba(255,242,207,.74)' : 'rgba(255,232,189,.18)';
      target.beginPath();
      target.moveTo(x, y - 10 * scale);
      target.quadraticCurveTo(x - 11 * scale, y, x, y + 14 * scale);
      target.quadraticCurveTo(x + 11 * scale, y, x, y - 10 * scale);
      target.stroke();
      target.fillStyle = i < player.health ? '#ffe8bd' : 'rgba(255,232,189,.14)';
      target.beginPath();
      target.moveTo(x, y - 8 * scale);
      target.quadraticCurveTo(x - 8 * scale, y, x, y + 11 * scale);
      target.quadraticCurveTo(x + 8 * scale, y, x, y - 8 * scale);
      target.fill();
    }
    target.restore();
  }

  function drawBossMeter(target, x, y, w, compact = false, backdropAlpha = compact ? .2 : .88) {
    const b = world.boss;
    if (!b || b.dead) return;
    const h = compact ? 6 : 14;
    const hp = clamp(b.hp / b.maxHp, 0, 1);
    target.save();
    target.fillStyle = `rgba(1,6,11,${backdropAlpha})`; target.fillRect(x - 4, y - 4, w + 8, h + 8);
    const wound = target.createLinearGradient(x, y, x + w, y);
    const paletteAccents = [
      ['#c9fbff', '#ffd083', '#ff746b'], ['#d9f7bc', '#ffd083', '#f07869'],
      ['#f2ecdc', '#ffb271', '#ff675d'], ['#baf8ec', '#ffb0c4', '#f46f66'],
      ['#8eeaff', '#ffbe75', '#fa6555'], ['#d6fbff', '#ffe08d', '#ff758c']
    ][world.zone] || ['#c9fbff', '#ffd083', '#ff746b'];
    wound.addColorStop(0, paletteAccents[0]); wound.addColorStop(.63, paletteAccents[1]); wound.addColorStop(1, paletteAccents[2]);
    target.fillStyle = wound; target.fillRect(x, y, w * hp, h);
    target.strokeStyle = 'rgba(235,253,255,.42)'; target.lineWidth = 1; target.strokeRect(x + .5, y + .5, w - 1, h - 1);
    const thresholds = bossConfigs[b.configIndex]?.thresholds || [];
    for (const threshold of thresholds) { target.fillStyle = '#06101a'; target.fillRect(x + w * threshold - 1.5, y - 1, 3, h + 2); }
    target.fillStyle = '#ffd083'; target.fillRect(x - 5, y - 3, 2, h + 6); target.fillRect(x + w + 3, y - 3, 2, h + 6);
    target.restore();
  }

  function drawCompactFieldStatus(p) {
    const top = 14;
    const height = 64;
    const leftX = 14;
    const leftW = 260;
    const rightW = 268;
    const rightX = W - rightW - 14;

    // Field waves enter through the upper stage. Keep every status instrument,
    // but flatten the panes so threat silhouettes remain visible beneath them.
    g.save();
    g.globalAlpha = .68;
    drawInstrumentPlate(g, leftX, top, leftW, height, 'left');
    drawInstrumentPlate(g, rightX, top, rightW, height, 'right');
    g.restore();

    g.save();
    g.shadowColor = 'rgba(0,0,0,.88)';
    g.shadowBlur = 5;
    g.textAlign = 'left';
    g.fillStyle = p.bone;
    g.font = '900 17px "Segoe UI Variable", sans-serif';
    g.fillText(fmt(world.score).padStart(8, '0'), leftX + 14, top + 19);
    g.fillStyle = 'rgba(243,234,211,.86)';
    g.font = '800 9px "Segoe UI Variable", sans-serif';
    g.fillText(`${zones[world.zone].number} · ${zones[world.zone].name}`, leftX + 14, top + 46);

    drawHealthPetals(g, rightX + rightW - 16, top + 19, 24, .78);
    const statusY = top + 48;
    g.fillStyle = 'rgba(218,252,255,.92)';
    g.font = '900 8px "Segoe UI Variable", sans-serif';
    g.fillText('COUNTERWAKE', rightX + 14, statusY);
    g.fillStyle = world.pluckChain > 0 ? '#fff0b7' : '#dafcff';
    g.font = '900 15px "Segoe UI Variable", sans-serif';
    g.fillText(world.pluckChain > 0 ? `×${world.pluckChain}` : '⌁', rightX + 88, statusY);
    if (world.chain > 1) {
      g.textAlign = 'right';
      g.fillStyle = '#ffd083';
      g.font = '900 9px "Segoe UI Variable", sans-serif';
      g.fillText(`WEATHER CHAIN ×${Math.floor(world.chain)}`, rightX + rightW - 14, statusY);
    }
    g.restore();
  }

  function drawCompactBossStatus(p) {
    const top = 14;
    const height = 56;
    const leftX = 14;
    const leftW = 248;
    const rightW = 236;
    const rightX = W - rightW - 14;

    // Bosses own the upper stage. These narrow panes retain the same weathered
    // instrument material while allowing the creature silhouette to remain
    // legible through and between them.
    g.save();
    g.globalAlpha = .58;
    drawInstrumentPlate(g, leftX, top, leftW, height, 'left');
    drawInstrumentPlate(g, rightX, top, rightW, height, 'right');
    g.restore();

    if (world.boss && !world.boss.dead) {
      const captionLeft = leftX + leftW + 7;
      const captionRight = rightX - 7;
      // A thin smoked-glass title seal occupies only the pre-existing HUD
      // gap. It quiets bullets immediately behind long boss names without
      // turning the upper arena into an opaque banner.
      g.save();
      g.fillStyle = 'rgba(3,8,15,.7)';
      g.strokeStyle = 'rgba(218,252,255,.2)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(captionLeft + 10, top + 5);
      g.lineTo(captionRight - 10, top + 5);
      g.lineTo(captionRight, top + 15);
      g.lineTo(captionRight, top + height - 8);
      g.lineTo(captionLeft, top + height - 8);
      g.lineTo(captionLeft, top + 15);
      g.closePath();
      g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,208,131,.34)';
      g.beginPath(); g.moveTo(captionLeft + 22, top + height - 8); g.lineTo(captionRight - 22, top + height - 8); g.stroke();
      g.restore();
    }

    g.save();
    g.shadowColor = 'rgba(0,0,0,.88)';
    g.shadowBlur = 5;
    g.textAlign = 'left';
    g.fillStyle = p.bone;
    g.font = '900 16px "Segoe UI Variable", sans-serif';
    g.fillText(fmt(world.score).padStart(8, '0'), leftX + 14, top + 18);
    g.fillStyle = 'rgba(243,234,211,.86)';
    g.font = '800 9px "Segoe UI Variable", sans-serif';
    g.fillText(`${zones[world.zone].number} · ${zones[world.zone].name}`, leftX + 14, top + 41);

    drawHealthPetals(g, rightX + rightW - 16, top + 17, 24, .76);
    const statusY = top + 42;
    g.fillStyle = 'rgba(218,252,255,.9)';
    g.font = '900 8px "Segoe UI Variable", sans-serif';
    g.fillText('COUNTERWAKE', rightX + 14, statusY);
    g.fillStyle = world.pluckChain > 0 ? '#fff0b7' : '#dafcff';
    g.font = '900 15px "Segoe UI Variable", sans-serif';
    g.fillText(world.pluckChain > 0 ? `×${world.pluckChain}` : '⌁', rightX + 88, statusY);
    if (world.chain > 1) {
      g.textAlign = 'right';
      g.fillStyle = '#ffd083';
      g.font = '900 10px "Segoe UI Variable", sans-serif';
      g.fillText(`CHAIN ×${Math.floor(world.chain)}`, rightX + rightW - 14, statusY);
    }
    if (world.boss && !world.boss.dead) {
      const centerX = (leftX + leftW + rightX) / 2;
      g.textAlign = 'center';
      g.fillStyle = '#f3ead3';
      g.font = '900 9px "Segoe UI Variable", sans-serif';
      g.fillText(world.boss.name, centerX, top + 20, rightX - leftX - leftW - 12);
      g.fillStyle = 'rgba(255,211,131,.94)';
      g.font = '900 8px "Segoe UI Variable", sans-serif';
      g.fillText(`PHASE ${String(world.boss.phase).padStart(2, '0')}`, centerX, top + 42);
    }
    g.restore();
  }

  function landscapeScreenHud() {
    return useScreenHud() && wideWorldPresentation();
  }

  // The boss wound rail is part of the arena's floor, never a blindfold laid
  // over it. Every lethal glyph, telegraph and PETREL itself composites above
  // this six-pixel trace; landscape touch keeps its rail in the exterior wing.
  function drawLogicalBossUnderlay() {
    if (!world.boss || world.boss.dead || landscapeScreenHud()) return;
    drawBossMeter(g, 38, H - 10, W - 76, true, .16);
  }

  function drawLogicalStatus() {
    const p = palettes[world.zone] || palettes[0];
    if (world.phase === 'boss' || world.phase === 'bossDeath') {
      drawCompactBossStatus(p);
    } else if (world.phase === 'field') {
      drawCompactFieldStatus(p);
    } else {
      drawInstrumentPlate(g, 18, 18, 308, 78, 'left');
      drawInstrumentPlate(g, W - 300, 18, 282, world.chain > 1 ? 146 : 112, 'right');
      g.textAlign = 'left';
      g.font = '900 18px "Segoe UI Variable", sans-serif';
      g.fillStyle = p.bone; g.fillText(fmt(world.score).padStart(8, '0'), 35, 46);
      g.fillStyle = 'rgba(243,234,211,.76)'; g.font = '800 11px "Segoe UI Variable", sans-serif';
      g.fillText(`${zones[world.zone].number} · ${zones[world.zone].name}`, 35, 75);

      drawHealthPetals(g, W - 34, 38);
      const cx = W - 92, cy = 89;
      g.textAlign = 'center';
      g.fillStyle = world.pluckChain > 0 ? '#fff0b7' : 'rgba(218,252,255,.88)';
      g.font = '900 25px "Segoe UI Variable", sans-serif'; g.fillText(world.pluckChain > 0 ? `×${world.pluckChain}` : '⌁', cx, cy - 7);
      g.font = '900 10px "Segoe UI Variable", sans-serif'; g.fillText('COUNTERWAKE', cx, cy + 16);
      if (world.chain > 1) {
        g.textAlign = 'left'; g.fillStyle = '#ffd083'; g.font = '900 22px "Segoe UI Variable", sans-serif'; g.fillText(`×${Math.floor(world.chain)}`, W - 276, 126);
        g.font = '800 9px "Segoe UI Variable", sans-serif'; g.fillStyle = 'rgba(255,222,164,.88)'; g.fillText('WEATHER CHAIN', W - 226, 126);
      }
    }

  }

  function drawHud() {
    const screenSpace = useScreenHud();
    g.save();
    g.textBaseline = 'middle';
    if (!screenSpace) drawLogicalStatus();
    for (const t of texts) {
      const alpha = clamp(t.life / Math.min(.35, t.max), 0, 1) * clamp((t.max - t.life) / .15, 0, 1);
      g.globalAlpha = alpha;
      g.textAlign = 'center'; g.font = `800 ${t.size}px "Segoe UI Variable", sans-serif`; g.fillStyle = t.color;
      g.shadowBlur = 10; g.shadowColor = 'rgba(0,0,0,.8)'; g.fillText(t.text, t.x, t.y);
    }
    g.restore();

    if (world.introTime > 0 && !screenSpace) {
      const a = clamp((INTRO_DURATION - world.introTime) / .36, 0, 1) * clamp(world.introTime / .72, 0, 1);
      g.save(); g.globalAlpha = a; g.textAlign = 'center';
      const plate = g.createLinearGradient(60, 0, W - 60, 0);
      plate.addColorStop(0, 'rgba(3,8,15,0)'); plate.addColorStop(.18, 'rgba(3,8,15,.58)'); plate.addColorStop(.82, 'rgba(3,8,15,.58)'); plate.addColorStop(1, 'rgba(3,8,15,0)');
      g.fillStyle = plate; g.fillRect(36, 438, W - 72, 126);
      g.fillStyle = '#ffd083'; g.font = '800 10px "Segoe UI Variable", sans-serif'; g.fillText(`PASSAGE ${zones[world.zone].number}`, W / 2, 460);
      g.fillStyle = '#f3ead3'; g.font = '900 36px "Segoe UI Variable", sans-serif'; g.fillText(zones[world.zone].name, W / 2, 510);
      g.fillStyle = 'rgba(243,234,211,.7)'; g.font = '500 13px "Segoe UI Variable", sans-serif'; g.fillText(zones[world.zone].subtitle, W / 2, 543);
      g.restore();
    }
  }

  function drawResponsiveHud() {
    if (!useScreenHud() || world.mode !== 'playing') return;
    const landscape = landscapeScreenHud();
    const compactBossHud = world.phase === 'boss' || world.phase === 'bossDeath';
    const compactFieldHud = world.phase === 'field';
    const zone = zones[world.zone];
    ctx.save();
    ctx.textBaseline = 'middle';
    if (landscape) {
      const panelW = Math.min(260, playRect.x - 68);
      const leftX = playRect.x - panelW - 22;
      const rightX = playRect.x + playRect.w + 22;
      drawInstrumentPlate(ctx, leftX, 18, panelW, 82, 'left');
      ctx.textAlign = 'left'; ctx.fillStyle = '#f3ead3'; ctx.font = '900 19px "Segoe UI Variable", sans-serif';
      ctx.fillText(fmt(world.score).padStart(8, '0'), leftX + 18, 45);
      ctx.fillStyle = 'rgba(243,234,211,.8)'; ctx.font = '800 10px "Segoe UI Variable", sans-serif';
      ctx.fillText(`${zone.number} · ${zone.name}`, leftX + 18, 75, panelW - 36);

      drawInstrumentPlate(ctx, rightX, 18, panelW, world.chain > 1 ? 112 : 82, 'right');
      drawHealthPetals(ctx, rightX + panelW - 17, 40, 27, .9);
      ctx.textAlign = 'left'; ctx.fillStyle = world.pluckChain > 0 ? '#fff0b7' : '#dafcff';
      ctx.font = '900 23px "Segoe UI Variable", sans-serif'; ctx.fillText(world.pluckChain > 0 ? `×${world.pluckChain}` : '⌁', rightX + 18, 76);
      ctx.fillStyle = 'rgba(218,252,255,.86)'; ctx.font = '900 9px "Segoe UI Variable", sans-serif'; ctx.fillText('COUNTERWAKE', rightX + 58, 76);
      if (world.chain > 1) {
        ctx.fillStyle = '#ffd083'; ctx.font = '900 18px "Segoe UI Variable", sans-serif'; ctx.fillText(`×${Math.floor(world.chain)}`, rightX + 18, 106);
        ctx.fillStyle = 'rgba(255,222,164,.84)'; ctx.font = '800 8px "Segoe UI Variable", sans-serif'; ctx.fillText('WEATHER CHAIN', rightX + 54, 106);
      }
      if (world.boss && !world.boss.dead) {
        drawBossMeter(ctx, leftX + 4, 136, panelW - 8, true, .72);
        ctx.fillStyle = '#f3ead3'; ctx.font = '900 10px "Segoe UI Variable", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(world.boss.name, leftX + 4, 121);
        ctx.textAlign = 'right'; ctx.fillStyle = '#ffd083'; ctx.fillText(`P${world.boss.phase}`, leftX + panelW - 4, 121);
      }

      // The gutters are world space, not dead letterbox. Carry the title's
      // editorial passage marker into play and let the route advance beside it.
      const routeTop = 190;
      const routeBottom = cssH - 56;
      const routeProgress = world.phase === 'field'
        ? clamp(world.zoneTime / Math.max(1, zone.duration), 0, 1)
        : (world.phase === 'boss' ? .92 : 1);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = 'rgba(202,248,255,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(leftX + 13, routeTop); ctx.lineTo(leftX + 13, routeBottom); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,208,131,.78)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(leftX + 13, routeTop); ctx.lineTo(leftX + 13, lerp(routeTop, routeBottom, routeProgress)); ctx.stroke();
      ctx.fillStyle = 'rgba(255,208,131,.92)';
      ctx.beginPath(); ctx.arc(leftX + 13, lerp(routeTop, routeBottom, routeProgress), 3.2, 0, TAU); ctx.fill();
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(243,234,211,.24)'; ctx.font = '900 72px "Segoe UI Variable", sans-serif';
      ctx.fillText(zone.number, leftX + 28, routeBottom - 35);
      ctx.fillStyle = 'rgba(255,208,131,.72)'; ctx.font = '900 9px "Segoe UI Variable", sans-serif';
      ctx.fillText(world.phase === 'boss' ? 'ENCOUNTER' : 'PASSAGE', leftX + 31, routeBottom + 1);
      ctx.fillStyle = 'rgba(218,252,255,.68)'; ctx.font = '700 10px "Segoe UI Variable", sans-serif';
      ctx.fillText(zone.subtitle.toUpperCase(), rightX + 4, routeBottom - 18, panelW - 8);
      ctx.fillStyle = 'rgba(243,234,211,.38)'; ctx.font = '800 8px "Segoe UI Variable", sans-serif';
      ctx.fillText('THE WORLD CONTINUES BEYOND THE WEATHERLINE', rightX + 4, routeBottom + 5, panelW - 8);
    } else {
      const x = 12, w = cssW - 24;
      if (compactBossHud) {
        const y = Math.max(10, playRect.y - 70);
        ctx.save(); ctx.globalAlpha = .58; drawInstrumentPlate(ctx, x, y, w, 56, 'left'); ctx.restore();
        ctx.textAlign = 'left'; ctx.fillStyle = '#f3ead3'; ctx.font = '900 16px "Segoe UI Variable", sans-serif';
        ctx.fillText(fmt(world.score).padStart(8, '0'), x + 14, y + 18);
        ctx.fillStyle = 'rgba(243,234,211,.9)'; ctx.font = '900 8px "Segoe UI Variable", sans-serif';
        const bossLine = world.boss && !world.boss.dead ? `${world.boss.name} · P${world.boss.phase}` : `${zone.number} · ${zone.name}`;
        ctx.fillText(bossLine, x + 14, y + 41, w * .57);
        drawHealthPetals(ctx, x + w - 14, y + 17, 22, .72);
        ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(218,252,255,.9)'; ctx.font = '900 8px "Segoe UI Variable", sans-serif';
        const counter = world.pluckChain > 0 ? `×${world.pluckChain}` : '⌁';
        ctx.fillText(`COUNTERWAKE ${counter}`, x + w - 14, y + 42);
        if (world.chain > 1) {
          ctx.textAlign = 'center'; ctx.fillStyle = '#ffd083'; ctx.font = '900 9px "Segoe UI Variable", sans-serif';
          ctx.fillText(`CHAIN ×${Math.floor(world.chain)}`, x + w * .57, y + 18);
        }
      } else if (compactFieldHud) {
        const y = Math.max(12, playRect.y - 82);
        ctx.save(); ctx.globalAlpha = .68; drawInstrumentPlate(ctx, x, y, w, 64, 'left'); ctx.restore();
        ctx.textAlign = 'left'; ctx.fillStyle = '#f3ead3'; ctx.font = '900 17px "Segoe UI Variable", sans-serif';
        ctx.fillText(fmt(world.score).padStart(8, '0'), x + 14, y + 20);
        ctx.fillStyle = 'rgba(243,234,211,.86)'; ctx.font = '800 8px "Segoe UI Variable", sans-serif';
        ctx.fillText(`${zone.number} · ${zone.name}`, x + 14, y + 47);
        drawHealthPetals(ctx, x + w - 14, y + 19, 22, .74);
        ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(218,252,255,.92)'; ctx.font = '900 8px "Segoe UI Variable", sans-serif';
        const counter = world.pluckChain > 0 ? `×${world.pluckChain}` : '⌁';
        ctx.fillText(`COUNTERWAKE ${counter}`, x + w - 14, y + 48);
        if (world.chain > 1) {
          ctx.textAlign = 'center'; ctx.fillStyle = '#ffd083'; ctx.font = '900 8px "Segoe UI Variable", sans-serif';
          ctx.fillText(`WEATHER CHAIN ×${Math.floor(world.chain)}`, x + w * .57, y + 20);
        }
      } else {
        const y = Math.max(15, playRect.y - 104);
        drawInstrumentPlate(ctx, x, y, w, 82, 'left');
        ctx.textAlign = 'left'; ctx.fillStyle = '#f3ead3'; ctx.font = '900 19px "Segoe UI Variable", sans-serif';
        ctx.fillText(fmt(world.score).padStart(8, '0'), x + 16, y + 27);
        ctx.fillStyle = 'rgba(243,234,211,.8)'; ctx.font = '800 9px "Segoe UI Variable", sans-serif';
        ctx.fillText(`${zone.number} · ${zone.name}`, x + 16, y + 57);
        drawHealthPetals(ctx, x + w - 14, y + 26, 24, .82);
        ctx.textAlign = 'right'; ctx.fillStyle = world.pluckChain > 0 ? '#fff0b7' : '#dafcff';
        ctx.font = '900 19px "Segoe UI Variable", sans-serif'; ctx.fillText(world.pluckChain > 0 ? `×${world.pluckChain}` : '⌁', x + w - 16, y + 58);
        ctx.fillStyle = 'rgba(218,252,255,.8)'; ctx.font = '900 8px "Segoe UI Variable", sans-serif'; ctx.fillText('COUNTERWAKE', x + w - 48, y + 58);
      }
    }

    if (world.introTime > 0) {
      const a = clamp((INTRO_DURATION - world.introTime) / .36, 0, 1) * clamp(world.introTime / .72, 0, 1);
      const centerY = playRect.y + playRect.h * .47;
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      const plate = ctx.createLinearGradient(playRect.x, 0, playRect.x + playRect.w, 0);
      plate.addColorStop(0, 'rgba(3,8,15,0)'); plate.addColorStop(.15, 'rgba(3,8,15,.78)'); plate.addColorStop(.85, 'rgba(3,8,15,.78)'); plate.addColorStop(1, 'rgba(3,8,15,0)');
      ctx.fillStyle = plate; ctx.fillRect(playRect.x, centerY - 52, playRect.w, 104);
      ctx.fillStyle = '#ffd083'; ctx.font = '800 9px "Segoe UI Variable", sans-serif'; ctx.fillText(`PASSAGE ${zone.number}`, cssW / 2, centerY - 27);
      ctx.fillStyle = '#f3ead3'; ctx.font = `900 ${landscape ? 18 : 24}px "Segoe UI Variable", sans-serif`; ctx.fillText(zone.name, cssW / 2, centerY + 1);
      ctx.fillStyle = 'rgba(243,234,211,.76)'; ctx.font = '500 10px "Segoe UI Variable", sans-serif'; ctx.fillText(zone.subtitle, cssW / 2, centerY + 29);
    }
    ctx.restore();
  }

  function drawVictoryAwakening() {
    g.save();
    g.globalCompositeOperation = 'screen';
    const dawn = g.createRadialGradient(W * .56, H * .18, 12, W * .56, H * .18, H * .72);
    dawn.addColorStop(0, 'rgba(255,245,190,.28)');
    dawn.addColorStop(.34, 'rgba(138,237,255,.12)');
    dawn.addColorStop(1, 'rgba(98,210,238,0)');
    g.fillStyle = dawn; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(222,253,255,.17)'; g.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const x = (i * 97 + 31) % (W + 100) - 50;
      const fall = (world.totalTime * (18 + i % 5) + i * 73) % (H + 180) - 90;
      g.beginPath(); g.moveTo(x, fall); g.lineTo(x - 17, fall + 82); g.stroke();
    }
    g.restore();
  }

  function drawResponsiveSeams() {
    if (!wideWorldPresentation()) return;
    ctx.save();
    for (let side = 0; side < 2; side++) {
      const x = side === 0 ? playRect.x : playRect.x + playRect.w;
      const direction = side === 0 ? 1 : -1;
      const seam = ctx.createLinearGradient(x - 25, 0, x + 25, 0);
      if (direction > 0) {
        seam.addColorStop(0, 'rgba(1,7,12,0)'); seam.addColorStop(.42, 'rgba(1,7,12,.34)');
        seam.addColorStop(.56, 'rgba(5,21,27,.18)'); seam.addColorStop(1, 'rgba(1,7,12,0)');
      } else {
        seam.addColorStop(0, 'rgba(1,7,12,0)'); seam.addColorStop(.44, 'rgba(5,21,27,.18)');
        seam.addColorStop(.58, 'rgba(1,7,12,.34)'); seam.addColorStop(1, 'rgba(1,7,12,0)');
      }
      ctx.fillStyle = seam; ctx.fillRect(x - 25, 0, 50, cssH);
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = direction > 0 ? 'rgba(200,245,255,.12)' : 'rgba(255,208,131,.1)';
      ctx.lineWidth = 1;
      for (let offset = -7; offset <= 7; offset += 7) {
        ctx.beginPath(); ctx.moveTo(x + offset, -10); ctx.lineTo(x + offset - 10 * direction, cssH + 10); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function renderScene() {
    const t = world.mode === 'title' ? world.titleTime : world.totalTime;
    drawBackground(t);
    const cleanVictory = world.mode === 'victory';
    if (cleanVictory) {
      drawVictoryAwakening();
    } else {
      drawLogicalBossUnderlay();
      drawTelegraphs();
      drawPatternScaffolds();
      drawParticles(false);
      for (const e of enemies) if (!e.dead) drawEnemy(e);
      if (world.boss) drawBoss(world.boss);
      for (const b of playerBullets) drawPlayerBullet(b);
      drawEnemyBullets();
      drawParticles(true);
      if (world.mode !== 'title') drawCounterwake();
      if (world.mode !== 'title') drawPlayer();
      if (world.mode !== 'title') drawHud();
    }

    if (world.phase === 'passage') {
      const t2 = 1 - world.transition / PASSAGE_DURATION;
      g.save(); g.globalCompositeOperation = 'screen';
      const grad = g.createRadialGradient(W / 2, H * .43, 10, W / 2, H * .43, lerp(20, 560, t2));
      grad.addColorStop(0, `rgba(255,245,204,${.62 * Math.sin(t2 * Math.PI)})`); grad.addColorStop(1, 'rgba(201,251,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, W, H); g.restore();
    }

    if (world.flash > 0) {
      g.save(); g.globalAlpha = clamp(world.flash, 0, settings.reduced ? .16 : .42); g.fillStyle = world.flashColor; g.fillRect(0, 0, W, H); g.restore();
    }
  }

  function render() {
    renderScene();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const basePalette = palettes[world.mode === 'title' ? 0 : world.zone];
    let ambientPalette = basePalette;
    if (world.phase === 'passage' && world.zone + 1 < palettes.length) {
      const passage = 1 - world.transition / PASSAGE_DURATION;
      const blend = ease(invLerp(.3, .96, passage));
      const nextPalette = palettes[world.zone + 1];
      ambientPalette = {
        deep: mixHexColor(basePalette.deep, nextPalette.deep, blend),
        sky0: mixHexColor(basePalette.sky0, nextPalette.sky0, blend),
        sky1: mixHexColor(basePalette.sky1, nextPalette.sky1, blend)
      };
    }
    const hasGutters = Math.abs(cssW - playRect.w) > 6 || Math.abs(cssH - playRect.h) > 6;
    backdropDrawState.time = world.totalTime;
    backdropDrawState.phase = world.phase;
    backdropDrawState.bossPhase = world.boss?.phase || 0;
    backdropDrawState.reducedEffects = settings.reduced;
    const authoredBackdrop = hasGutters && world.mode !== 'title'
      && !!window.RAIN_ART?.drawBackdrop?.(ctx, world.zone, cssW, cssH, backdropDrawState);
    if (!authoredBackdrop) {
      ctx.fillStyle = ambientPalette.deep; ctx.fillRect(0, 0, cssW, cssH);
    }
    ctx.save();
    ctx.globalAlpha = authoredBackdrop ? (settings.reduced ? .12 : .2) : (settings.reduced ? .28 : .48);
    if (!ambientGradientCache || ambientGradientWidth !== cssW || ambientGradientHeight !== cssH
      || ambientGradientPlayWidth !== playRect.w || ambientGradientPlayHeight !== playRect.h
      || ambientGradientSky1 !== ambientPalette.sky1 || ambientGradientSky0 !== ambientPalette.sky0
      || ambientGradientDeep !== ambientPalette.deep) {
      ambientGradientCache = ctx.createRadialGradient(cssW * .5, cssH * .48, Math.min(playRect.w, playRect.h) * .12, cssW * .5, cssH * .48, Math.max(cssW, cssH) * .72);
      ambientGradientCache.addColorStop(0, ambientPalette.sky1);
      ambientGradientCache.addColorStop(.48, ambientPalette.sky0);
      ambientGradientCache.addColorStop(1, ambientPalette.deep);
      ambientGradientWidth = cssW;
      ambientGradientHeight = cssH;
      ambientGradientPlayWidth = playRect.w;
      ambientGradientPlayHeight = playRect.h;
      ambientGradientSky1 = ambientPalette.sky1;
      ambientGradientSky0 = ambientPalette.sky0;
      ambientGradientDeep = ambientPalette.deep;
    }
    ctx.fillStyle = ambientGradientCache; ctx.fillRect(0, 0, cssW, cssH);
    ctx.restore();
    const shake = world.shake && !settings.reduced ? world.shake : 0;
    const sx = shake ? visualRng.range(-shake, shake) : 0;
    const sy = shake ? visualRng.range(-shake, shake) : 0;
    ctx.fillStyle = wideWorldPresentation() ? 'rgba(2,5,10,.08)' : 'rgba(2,5,10,.28)';
    ctx.fillRect(playRect.x - 3, playRect.y, playRect.w + 6, playRect.h);
    ctx.drawImage(scene, playRect.x + sx, playRect.y + sy, playRect.w, playRect.h);
    drawResponsiveSeams();
    ctx.strokeStyle = wideWorldPresentation() ? 'rgba(201,251,255,.055)' : 'rgba(201,251,255,.12)'; ctx.lineWidth = 1;
    ctx.strokeRect(playRect.x + .5, playRect.y + .5, playRect.w - 1, playRect.h - 1);
    drawResponsiveHud();
  }

  function stateHash() {
    let h = 2166136261 >>> 0;
    const add = (n) => { h ^= Math.round(n * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
    add(world.zone); add(world.zoneTime); add(world.score); add(world.frame);
    add(player.x); add(player.y); add(player.vx); add(player.vy); add(player.health); add(player.wake.length); add(world.pluckChain);
    add(enemies.length); add(enemyBullets.length); add(playerBullets.length);
    for (const e of enemies.slice(0, 32)) { add(e.x); add(e.y); add(e.hp); }
    for (const b of enemyBullets.slice(0, 128)) { add(b.x); add(b.y); add(b.vx); add(b.vy); }
    if (world.boss) { add(world.boss.x); add(world.boss.y); add(world.boss.hp); add(world.boss.phase); }
    return h.toString(16).padStart(8, '0');
  }

  function snapshot() {
    return {
      version: VERSION, mode: world.mode, zone: world.zone, zoneName: zones[world.zone]?.name,
      phase: world.phase, zoneTime: +world.zoneTime.toFixed(3), totalTime: +world.totalTime.toFixed(3),
      frame: world.frame, score: Math.floor(world.score), chain: Math.floor(world.chain),
      lifecycle: {
        transition: +world.transition.toFixed(3), flash: +world.flash.toFixed(3), shake: +world.shake.toFixed(3),
        bossIntro: +world.bossIntro.toFixed(3), bossDeath: +world.bossDeath.toFixed(3), endingTime: +world.endingTime.toFixed(3),
        pausedByVisibility: world.pausedByVisibility
      },
      input: {
        keys: input.keys.size, pointerActive: input.pointerActive, pointerCaptured: input.pointerId !== null,
        focusPointer: input.focusPointer, targetX: +input.targetX.toFixed(2), targetY: +input.targetY.toFixed(2),
        gamepadConnected: !!input.gamepadState, gamepadButtons: input.gamepadState?.buttons || 0
      },
      settings: { muted: settings.muted, reduced: settings.reduced },
      save: { best: Number(save.best) || 0, reached: Number(save.reached) || 0, cleared: !!save.cleared },
      player: { x: +player.x.toFixed(2), y: +player.y.toFixed(2), vx: +player.vx.toFixed(2), vy: +player.vy.toFixed(2), health: player.health, maxHealth: player.maxHealth, dead: player.dead, focus: player.focus, wakePoints: player.wake.length, invuln: +player.invuln.toFixed(2), deathTimer: +player.deathTimer.toFixed(2) },
      counterwake: { chain: world.pluckChain, needles: counterNeedles.length },
      boss: world.boss ? {
        name: world.boss.name,
        x: +world.boss.x.toFixed(2), y: +world.boss.y.toFixed(2),
        hp: Math.max(0, +world.boss.hp.toFixed(1)), phase: world.boss.phase,
        fire: Number.isFinite(world.boss.fire) ? +world.boss.fire.toFixed(4) : null,
        firePulse: +(world.boss.firePulse || 0).toFixed(4),
        dead: world.boss.dead
      } : null,
      counts: {
        enemies: enemies.length, hostile: enemyBullets.length, friendly: playerBullets.length,
        particles: particles.length, telegraphs: telegraphs.length,
        splitPending: enemyBullets.filter((b) => b.split && !b.splitDone).length,
        splitChildren: enemyBullets.filter((b) => b.splitChild).length,
        droppedHostileSpawns: world.droppedBullets
      },
      hash: stateHash()
    };
  }

  function dangerMap(limit = 320) {
    return {
      player: { x: player.x, y: player.y, vx: player.vx, vy: player.vy, radius: player.radius },
      boss: world.boss && !world.boss.dead ? { x: world.boss.x, y: world.boss.y, r: world.boss.r } : null,
      bullets: enemyBullets
        // Delayed hostile glyphs are already visible to the player as quivering,
        // low-alpha warnings. Expose them to QA as warnings too; omitting them
        // made the automated pilot less informed than a real player. Instant
        // acceleration lets the fairness gate project authored curves rather
        // than pretending every thorn and radial bell is ballistic.
        .filter((b) => !b.dead)
        .sort((a, b) => dist2(a.x, a.y, player.x, player.y) - dist2(b.x, b.y, player.x, player.y))
        .slice(0, clamp(Math.floor(Number(limit) || 320), 1, 600))
        .map((b) => {
          let ax = b.gravityX || 0;
          let ay = b.gravityY || 0;
          if (b.accel) {
            ax += Math.cos(b.angle) * b.accel;
            ay += Math.sin(b.angle) * b.accel;
          }
          if (b.shearAmp) ax += b.shearAmp * Math.sin(b.flightAge * b.shearFreq + b.shearPhase);
          if (b.radial) {
            const dx = b.x - b.radial.x;
            const dy = b.y - b.radial.y;
            const length = Math.max(24, Math.hypot(dx, dy));
            ax += dx / length * b.radial.strength;
            ay += dy / length * b.radial.strength;
          }
          if (b.dipole) {
            const { x1, y1, x2, y2, strength, charge = 1, down = 45 } = b.dipole;
            const d1x = b.x - x1, d1y = b.y - y1, d2x = b.x - x2, d2y = b.y - y2;
            const l1 = Math.max(28, Math.hypot(d1x, d1y)), l2 = Math.max(28, Math.hypot(d2x, d2y));
            ax += charge * strength * (d1x / l1 - d2x / l2);
            ay += charge * strength * (d1y / l1 - d2y / l2) + down;
          }
          return {
            x: b.x, y: b.y, vx: b.vx, vy: b.vy, ax, ay, r: b.r,
            delay: Math.max(0, b.delay || 0), maxSpeed: b.maxSpeed || 0
          };
        })
    };
  }

  function campaignInfo() {
    return {
      complete: true,
      zoneCount: zones.length,
      tuning: {
        playerHealth: PLAYER_MAX_HEALTH,
        fieldEnemyHpScale: FIELD_ENEMY_HP_SCALE,
        bossHpScale: BOSS_HP_SCALE,
        enemyFireIntervalScale: ENEMY_FIRE_INTERVAL_SCALE,
        bossFireIntervalScale: BOSS_FIRE_INTERVAL_SCALE,
        hitRecoveryDuration: HIT_RECOVERY_DURATION,
        hitClearRadius: HIT_CLEAR_RADIUS
      },
      zones: zones.map((zone, index) => ({
        index,
        name: zone.name,
        boss: zone.boss,
        phaseCount: bossConfigs[index].phaseCount,
        fieldDuration: zone.duration,
        waveCount: zone.waves.length
      }))
    };
  }

  function woundedEnemyFixture(zone = 0) {
    const zoneIndex = clamp(Math.floor(Number(zone) || 0), 0, zones.length - 1);
    const types = ['buoychoir', 'pendulumbulb', 'ribshepherd', 'airpearl', 'tramcentipede', 'sunbladder'];
    resetRun(zoneIndex, false);
    resetArrays();
    world.introTime = 0;
    world.god = true;
    const enemy = spawnEnemy(types[zoneIndex], W / 2, 310, { enter: 0, fire: 999 });
    enemy.baseY = enemy.y;
    enemy.age = 2.4;
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * .22));
    return debugStep(0, {});
  }

  function debugStep(frames = 1, controls = {}) {
    const wasManual = world.manual;
    world.manual = true;
    for (const code of ['KeyW','KeyA','KeyS','KeyD', ...FOCUS_KEY_CODES]) input.keys.delete(code);
    if (controls.left) input.keys.add('KeyA');
    if (controls.right) input.keys.add('KeyD');
    if (controls.up) input.keys.add('KeyW');
    if (controls.down) input.keys.add('KeyS');
    if (controls.focus) input.keys.add('KeyZ');
    for (let i = 0; i < frames; i++) if (world.mode === 'playing') updateGame(STEP);
    render();
    world.manual = wasManual;
    return snapshot();
  }

  function gotoZone(zone = 0) {
    resetRun(clamp(Math.floor(Number(zone) || 0), 0, zones.length - 1), false);
    return snapshot();
  }

  function gotoBoss(phase = 1, zone = world.zone) {
    const zoneIndex = clamp(Math.floor(Number(zone) || 0), 0, zones.length - 1);
    if (world.mode !== 'playing' || world.zone !== zoneIndex) resetRun(zoneIndex, false);
    resetArrays();
    player.x = W / 2; player.y = 820; player.px = player.x; player.py = player.y; player.vx = 0; player.vy = 0; player.wake.length = 0; player.wakeEcho.length = 0;
    spawnBoss();
    world.boss.enter = 0;
    world.boss.y = 210;
    const config = bossConfigs[zoneIndex];
    const targetPhase = clamp(Math.floor(Number(phase) || 1), 1, config.phaseCount);
    if (targetPhase > 1) {
      world.boss.hp = world.boss.maxHp * Math.max(.01, config.thresholds[targetPhase - 2] - .01);
      changeBossPhase(targetPhase);
      world.boss.phaseShield = 0;
    }
    return snapshot();
  }

  function spawnStress(count = 800) {
    if (world.mode !== 'playing') resetRun(0, false);
    enemyBullets.length = 0;
    for (let i = 0; i < count; i++) {
      const ring = Math.floor(i / 80);
      const a = TAU * (i % 80) / 80 + ring * .17;
      const r = 140 + ring * 38;
      const x = W / 2 + Math.cos(a) * r;
      const y = H / 2 + Math.sin(a) * r * .7;
      spawnEnemyBullet(x, y, a + Math.PI / 2, 70 + (i % 7) * 11, { r: 4 + i % 3, kind: i % 5 === 0 ? 'chime' : (i % 3 === 0 ? 'needle' : 'drop') });
    }
    world.stress = true;
    return snapshot();
  }

  function projectileMaterialSheet(zone = 0, total = 21) {
    const zoneIndex = clamp(Math.floor(Number(zone) || 0), 0, zones.length - 1);
    resetRun(zoneIndex, false);
    resetArrays();
    world.introTime = 0;
    const kinds = ['drop', 'seed', 'bead', 'bell', 'chime', 'needle', 'thorn'];
    const radii = [4, 6, 8];
    for (let row = 0; row < radii.length; row++) {
      for (let column = 0; column < kinds.length; column++) {
        spawnEnemyBullet(74 + column * 95, 275 + row * 170, 0, 60, {
          vx: 60, vy: 0, r: radii[row], kind: kinds[column], life: 999, zone: zoneIndex
        });
      }
    }
    // QA can exercise the exact quality/emergency boundary while keeping the
    // extra fixtures offscreen. Runtime barrages still obey the 1,500-shot cap.
    const requested = clamp(Math.floor(Number(total) || 21), 21, 660);
    while (enemyBullets.length < requested) {
      spawnEnemyBullet(-200, -200, 0, 0, { vx: 0, vy: 0, r: 4, kind: 'drop', life: 999, zone: zoneIndex });
    }
    return debugStep(0, {});
  }

  let counterwakeFixtureEmitterId = null;
  let counterwakeFixtureBeforeHp = 0;

  function prepareCounterwakeFixture() {
    resetRun(0, false);
    resetArrays();
    // The probe is also the deterministic visual fixture for Counterwake.  It
    // must begin in live play, not underneath the opening passage card.
    world.introTime = 0;
    player.x = 360; player.y = 800; player.px = 360; player.py = 800; player.vx = 0; player.vy = 0;
    world.totalTime = 2;
    player.wake = [
      { x: 276, y: 800, t: world.totalTime - .15 },
      { x: 310, y: 800, t: world.totalTime - .1 },
      { x: 342, y: 800, t: world.totalTime - .052 }
    ];
    player.wakeEcho = player.wake.map((point) => ({ ...point }));
    player.wakeSample = .2;
    const emitter = spawnEnemy('skifftick', 360, 180, { enter: 0, hp: 1000 });
    emitter.fire = 999;
    const beforeHp = emitter.hp;
    const bullet = spawnEnemyBullet(320, 770, Math.PI / 2, 300, { r: 6, source: emitter.id, kind: 'drop' });
    counterwakeFixtureEmitterId = emitter.id;
    counterwakeFixtureBeforeHp = beforeHp;
    world.god = true;
    return { emitter, bullet, beforeHp };
  }

  function counterwakeFixtureState() {
    const emitter = findEmitter(counterwakeFixtureEmitterId);
    const bullet = enemyBullets.find((candidate) => candidate.source === counterwakeFixtureEmitterId) || null;
    return {
      snapshot: snapshot(),
      emitter: emitter ? {
        id: emitter.id, x: emitter.x, y: emitter.y,
        hp: emitter.hp,
        hpLoss: +(counterwakeFixtureBeforeHp - emitter.hp).toFixed(2),
        hitPulse: +(emitter.hitPulse || 0).toFixed(4)
      } : null,
      bullet: bullet ? {
        x: bullet.x, y: bullet.y,
        dangerous: !bullet.dead,
        wakePlucked: !!bullet.wakePlucked,
        pluckPulse: +(bullet.pluckPulse || 0).toFixed(4)
      } : null,
      needles: counterNeedles.map((needle) => ({
        x: needle.x, y: needle.y, tx: needle.tx, ty: needle.ty,
        life: +needle.life.toFixed(4), max: +needle.max.toFixed(4),
        live: needle.live, impacted: needle.impacted
      }))
    };
  }

  function setupCounterwakeFixture() {
    prepareCounterwakeFixture();
    return counterwakeFixtureState();
  }

  function counterwakeProbe() {
    const { emitter, bullet, beforeHp } = prepareCounterwakeFixture();
    for (let i = 0; i < 30 && counterNeedles.length === 0; i++) updateGame(STEP);
    const needleLaunched = counterNeedles.length > 0;
    const damageDeferred = needleLaunched && emitter.hp === beforeHp;
    for (let i = 0; i < 40 && counterNeedles.length > 0; i++) updateGame(STEP);
    return {
      plucked: !!bullet.wakePlucked,
      bulletStillDangerous: !bullet.dead && enemyBullets.includes(bullet),
      needleLaunched,
      damageDeferred,
      emitterDamaged: emitter.hp < beforeHp,
      hpLoss: +(beforeHp - emitter.hp).toFixed(2),
      snapshot: snapshot()
    };
  }

  function firstBlueRollProbe() {
    const angle = .113;
    const enemy = {
      x: player.x + 143, y: player.y - 87,
      baseX: player.x - 96, baseY: player.y - 121
    };
    const bullet = {
      x: player.x - 72, y: player.y - 203,
      px: player.x - 76, py: player.y - 207,
      vx: 137, vy: 219, angle: Math.atan2(219, 137),
      radial: { x: player.x + 31, y: player.y - 244, strength: 1 },
      dipole: {
        x1: player.x - 91, y1: player.y - 180,
        x2: player.x + 109, y2: player.y - 175,
        strength: 1
      },
      refractX: player.x + 17, refractY: player.y - 154
    };
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const center = { x: player.x, y: player.y };
    const before = {
      enemy: distance(enemy, center),
      bullet: distance(bullet, center),
      pair: distance(enemy, bullet),
      base: Math.hypot(enemy.baseX - player.x, enemy.baseY - player.y),
      velocity: Math.hypot(bullet.vx, bullet.vy),
      dipole: Math.hypot(bullet.dipole.x2 - bullet.dipole.x1, bullet.dipole.y2 - bullet.dipole.y1),
      radial: Math.hypot(bullet.radial.x - player.x, bullet.radial.y - player.y)
    };
    rollFirstBlueEnemy(enemy, angle);
    rollFirstBlueBullet(bullet, angle);
    const after = {
      enemy: distance(enemy, center),
      bullet: distance(bullet, center),
      pair: distance(enemy, bullet),
      base: Math.hypot(enemy.baseX - player.x, enemy.baseY - player.y),
      velocity: Math.hypot(bullet.vx, bullet.vy),
      dipole: Math.hypot(bullet.dipole.x2 - bullet.dipole.x1, bullet.dipole.y2 - bullet.dipole.y1),
      radial: Math.hypot(bullet.radial.x - player.x, bullet.radial.y - player.y)
    };
    const errors = Object.fromEntries(Object.keys(before).map((key) => [key, Math.abs(before[key] - after[key])]));
    return { pass: Object.values(errors).every((value) => value < 1e-8), angle, errors };
  }

  function selfTest() {
    const results = [];
    results.push({ name: 'finite player', pass: [player.x,player.y,player.vx,player.vy].every(Number.isFinite) });
    results.push({ name: 'logical bounds', pass: player.x >= 28 && player.x <= W - 28 && player.y >= 100 && player.y <= H - 32 });
    results.push({ name: 'bullet cap', pass: enemyBullets.length <= 1500 });
    results.push({ name: 'authored bullet spawns preserved', pass: world.stress || world.droppedBullets === 0 });
    results.push({ name: 'health bounds', pass: player.health >= 0 && player.health <= player.maxHealth });
    results.push({ name: 'phase validity', pass: ['field','boss','bossDeath','passage','ending'].includes(world.phase) });
    results.push({ name: 'finite entities', pass: [...enemies,...enemyBullets,...playerBullets].every((e) => Number.isFinite(e.x) && Number.isFinite(e.y)) });
    const rollProbe = firstBlueRollProbe();
    results.push({ name: 'first blue roll preserves all distances', pass: rollProbe.pass });
    const visualProbeEnemy = { type: 'lanternray', x: 200, y: 240, px: 200, age: .43, seed: 83.125, side: 1, r: 28 };
    const visualProbe = window.RAIN_ART?.getFieldEnemyVisualFootprint?.(visualProbeEnemy);
    if (visualProbe) {
      const probeDistance = visualProbe.rx * .9;
      const visualProbeBullet = {
        x: visualProbeEnemy.x + Math.cos(visualProbe.rotation) * probeDistance,
        y: visualProbeEnemy.y + Math.sin(visualProbe.rotation) * probeDistance,
        r: 2.4
      };
      results.push({
        name: 'visible enemy wings accept player fire',
        pass: fieldEnemyShotOverlap(visualProbeBullet, visualProbeEnemy) &&
          dist2(visualProbeBullet.x, visualProbeBullet.y, visualProbeEnemy.x, visualProbeEnemy.y) > (visualProbeBullet.r + visualProbeEnemy.r * .78) ** 2
      });
    } else {
      results.push({ name: 'visible enemy wings accept player fire', pass: false });
    }
    const bossParityPass = bossConfigs.every((config, zone) => {
      const probeBoss = {
        configIndex: zone,
        id: config.id,
        phase: config.phaseCount,
        r: config.r,
        x: W * .5,
        y: 210
      };
      const footprint = window.RAIN_ART?.getBossVisualFootprint?.(probeBoss);
      if (!footprint) return false;
      const centerY = probeBoss.y + footprint.offsetY;
      const coreRadius = probeBoss.r * .72 + 2.4;
      const anatomyX = probeBoss.x + Math.max(coreRadius + 4, footprint.width * .24);
      const anatomyShot = { x: anatomyX, y: centerY, r: 2.4 };
      const decorativeShot = { x: probeBoss.x + footprint.width * .55, y: centerY, r: 2.4 };
      return bossShotOverlap(anatomyShot, probeBoss)
        && !bossShotOverlap(decorativeShot, probeBoss);
    });
    results.push({ name: 'boss painted anatomy has conservative shot parity', pass: bossParityPass });
    return { pass: results.every((r) => r.pass), results, snapshot: snapshot() };
  }

  if (qaMode) {
    window.__RAIN_ANIMAL__ = Object.freeze({
      version: VERSION, start: startVoyage, retryZone, snapshot, stateHash, step: debugStep,
      gotoZone, gotoBoss, campaignInfo, dangerMap, spawnStress, projectileMaterialSheet,
      woundedEnemyFixture,
      setupCounterwakeFixture, counterwakeFixtureState, counterwakeProbe, firstBlueRollProbe, selfTest,
      audioProfile() { return sound.profile(); },
      lockBossPhase(value = true) { if (world.boss) world.boss.captureLock = !!value; return snapshot(); },
      setGod(value) { world.god = !!value; return world.god; },
      setTimeScale(value) { world.timeScale = clamp(Number(value) || 1, .1, 30); return world.timeScale; },
      damage() { damagePlayer(); return snapshot(); },
      clearBullets() { enemyBullets.length = 0; return snapshot(); },
      resizeInfo() { return { cssW, cssH, dpr, playRect: { ...playRect } }; }
    });
    if (query.get('timeScale')) world.timeScale = clamp(Number(query.get('timeScale')) || 1, .1, 30);
    if (query.get('autostart') === '1') startVoyage();
    const requestedQaZone = query.get('zone')
      ? clamp((Number(query.get('zone')) || 1) - 1, 0, MAX_ZONES - 1)
      : world.zone;
    if (query.get('wounded') === '1') setTimeout(() => woundedEnemyFixture(requestedQaZone), 0);
    else if (query.get('boss')) setTimeout(() => gotoBoss(Number(query.get('boss')) || 1, requestedQaZone), 0);
    else if (query.get('zone')) setTimeout(() => gotoZone(requestedQaZone), 0);
    if (query.get('stress')) setTimeout(() => spawnStress(Number(query.get('stress')) || 800), 0);
  }

  resize();
  updatePanels();
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const realDt = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    updateGamepadLifecycle();
    if (world.mode === 'title') world.titleTime += realDt;
    if (world.mode === 'playing' && !world.manual) {
      accumulator += realDt * world.timeScale;
      let steps = 0;
      const maxSteps = world.timeScale > 1 ? 600 : 12;
      while (accumulator >= STEP && steps++ < maxSteps) { updateGame(STEP); accumulator -= STEP; }
      if (steps >= maxSteps) accumulator = 0;
    } else accumulator = 0;
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
