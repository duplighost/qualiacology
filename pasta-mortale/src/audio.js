const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const safeStop = (source, when) => {
  try {
    source.stop(when);
  } catch {
    // A source may already have ended or been stopped by voice eviction.
  }
};

/**
 * Procedural sound design for Spaghetti House.
 *
 * The AudioContext is intentionally created and resumed only by unlock(), so
 * callers can invoke it directly from a click, pointer, touch, or key gesture.
 */
export class SpaghettiAudio {
  constructor({ disabled = false, maxVoices = 18 } = {}) {
    this.disabled = Boolean(disabled);
    this.maxVoices = Math.max(6, Math.floor(maxVoices) || 18);
    this.supported =
      !this.disabled &&
      typeof globalThis !== "undefined" &&
      Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);

    this.context = null;
    this.master = null;
    this.ambienceBus = null;
    this.sfxBus = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.brownNoiseBuffer = null;
    this.ambience = null;
    this.voices = new Set();

    this.unlocked = false;
    this.muted = false;
    this.audioState = this.disabled ? "disabled" : this.supported ? "locked" : "unsupported";
    this.lastError = null;

    this.stepEvents = 0;
    this.wetStepEvents = 0;
    this.parkourEvents = {
      jump: 0,
      land: 0,
      mantle: 0,
      slide: 0,
      noodleImpact: 0
    };
    this.combatEvents = {
      fire: 0,
      dryFire: 0,
      ammoTail: 0,
      ammoLow: 0,
      ammoCritical: 0,
      magEmpty: 0,
      reloadStart: 0,
      reloadEject: 0,
      reloadInsert: 0,
      reloadEnd: 0,
      punchSwing: 0,
      punchHit: 0,
      punchMiss: 0,
      enemyHit: 0,
      enemyDeath: 0,
      enemyShot: 0,
      playerHit: 0,
      spaghettiBurn: 0,
      sauceBomb: 0,
      pickup: 0,
      waveStart: 0,
      bossSpawn: 0
    };
    this.audibleCombatEvents = Object.fromEntries(
      Object.keys(this.combatEvents).map((name) => [name, 0])
    );
    this.recentCombatCues = [];
    this.lastSfxAt = {
      jump: -Infinity,
      land: -Infinity,
      mantle: -Infinity,
      slide: -Infinity,
      noodleImpact: -Infinity
    };
    this.stepParity = -1;
    this.depth = 0;
    this.danger = 0;
    this.playerPosition = { x: 0, y: 0, z: 0 };

    this._visibilityHandler = () => this._handleVisibilityChange();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this._visibilityHandler, { passive: true });
    }
    this._publishState();
  }

  async unlock() {
    if (this.disabled || !this.supported) {
      this._publishState();
      return false;
    }

    try {
      if (!this.context || this.context.state === "closed") {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        this.context = new Context({ latencyHint: "interactive" });
        this.context.onstatechange = () => {
          this.unlocked = this.context?.state === "running";
          this._publishState();
        };
        this._buildGraph();
      }

      if (this.context.state === "suspended") {
        await this.context.resume();
      }

      this.unlocked = this.context.state === "running";
      this._setMasterLevel(this.muted ? 0.0001 : 0.78, 0.025);
      this._publishState();
      return this.unlocked;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.unlocked = false;
      this.audioState = "error";
      this._publishState("error");
      return false;
    }
  }

  /**
   * Plays one footfall through the pasta. Depth is expected in the 0..1 range,
   * speed in ordinary player-world units, and side may be "left", "right",
   * -1, or 1. If side is omitted, stereo placement alternates automatically.
   */
  step(depth = this.depth, speed = 1, side) {
    const wetness = clamp(depth);
    const pace = clamp((Math.abs(Number(speed) || 0) - 0.08) / 5.2);
    const sideSign = this._resolveSide(side);

    this.stepEvents += 1;
    if (wetness > 0.045) this.wetStepEvents += 1;

    if (!this._readyForSound()) return false;

    const now = this.context.currentTime;
    const duration = 0.19 + wetness * 0.43 + pace * 0.08;
    const pan = clamp(sideSign * (0.17 + pace * 0.09), -0.42, 0.42);
    const voice = this._createVoice(duration + 0.12, pan);
    if (!voice) return false;

    // Noodle slap: a bright, fibrous impact that gets heavier and duller as
    // the rising spaghetti reaches the player's knees.
    this._addNoise(voice, {
      buffer: this.noiseBuffer,
      at: now,
      duration: 0.055 + pace * 0.065 + wetness * 0.055,
      gain: 0.055 + pace * 0.075 + wetness * 0.06,
      filterType: "bandpass",
      frequency: 1180 - wetness * 710 + pace * 360,
      endFrequency: 470 - wetness * 170,
      q: 0.75 + wetness * 1.4,
      playbackRate: 0.9 + pace * 0.34 - wetness * 0.17
    });

    // Suction: a sticky downward pitch curl, delayed just behind the slap so
    // each step feels as if it has to tear itself free.
    this._addTone(voice, {
      at: now + 0.018,
      duration: 0.11 + wetness * 0.29,
      type: wetness > 0.58 ? "sawtooth" : "triangle",
      frequency: 210 + pace * 90 - wetness * 58,
      endFrequency: 48 + wetness * 32,
      gain: 0.025 + wetness * 0.09 + pace * 0.025,
      attack: 0.012,
      release: 0.12 + wetness * 0.12
    });

    // Gurgle: filtered brown noise and a frequency-modulated bubble. It is
    // nearly absent at ankle depth and becomes the dominant layer when wading.
    if (wetness > 0.09) {
      const gurgleStart = now + 0.045 + (1 - pace) * 0.018;
      const gurgleDuration = 0.12 + wetness * 0.34;
      this._addNoise(voice, {
        buffer: this.brownNoiseBuffer,
        at: gurgleStart,
        duration: gurgleDuration,
        gain: 0.018 + wetness * 0.105,
        filterType: "bandpass",
        frequency: 215 + wetness * 140,
        endFrequency: 92 + wetness * 80,
        q: 2.2 + wetness * 4.3,
        playbackRate: 0.72 + pace * 0.23
      });
      this._addBubble(voice, gurgleStart, gurgleDuration, wetness, pace);
    }

    return true;
  }

  /**
   * A compact upward sole-scrape and body-effort sound. Intensity accepts the
   * usual 0..1 range (values up to 1.25 are tolerated for unusually hard
   * jumps). Calls inside 90ms are ignored to protect against input repeats.
   */
  jump(intensity = 1) {
    const strength = clamp(intensity, 0, 1.25);
    this.parkourEvents.jump += 1;
    if (strength <= 0 || !this._allowSfx("jump", 0.09)) return false;

    const now = this.context.currentTime;
    const duration = 0.18 + strength * 0.08;
    const voice = this._createVoice(duration + 0.08, 0);
    if (!voice) return false;

    this._addNoise(voice, {
      buffer: this.noiseBuffer,
      at: now,
      duration: 0.075 + strength * 0.035,
      gain: 0.018 + strength * 0.027,
      filterType: "bandpass",
      frequency: 520 + strength * 260,
      endFrequency: 1180 + strength * 310,
      q: 0.72,
      playbackRate: 0.82 + strength * 0.22
    });
    this._addTone(voice, {
      at: now + 0.012,
      duration,
      type: "triangle",
      frequency: 82 + strength * 24,
      endFrequency: 146 + strength * 42,
      gain: 0.014 + strength * 0.025,
      attack: 0.018,
      release: 0.095
    });
    return true;
  }

  /**
   * Landing weight with an optional sticky pasta layer. Wetness is 0..1 and
   * should generally match the spaghetti depth at the player's feet.
   */
  land(intensity = 1, wetness = 0) {
    const strength = clamp(intensity, 0, 1.25);
    const wet = clamp(wetness);
    this.parkourEvents.land += 1;
    if (strength <= 0 || !this._allowSfx("land", 0.075)) return false;

    const now = this.context.currentTime;
    const duration = 0.17 + strength * 0.13 + wet * 0.19;
    const voice = this._createVoice(duration + 0.14, 0);
    if (!voice) return false;

    this._addNoise(voice, {
      buffer: wet > 0.18 ? this.brownNoiseBuffer : this.noiseBuffer,
      at: now,
      duration: 0.075 + strength * 0.07 + wet * 0.09,
      gain: 0.035 + strength * 0.075 + wet * 0.035,
      filterType: "lowpass",
      frequency: 690 + strength * 460 - wet * 310,
      endFrequency: 130 + wet * 55,
      q: 0.68 + wet * 1.1,
      playbackRate: 0.76 + strength * 0.16 - wet * 0.12
    });
    this._addTone(voice, {
      at: now,
      duration: 0.13 + strength * 0.1,
      type: "sine",
      frequency: 88 + strength * 26,
      endFrequency: 37 + wet * 9,
      gain: 0.035 + strength * 0.062,
      attack: 0.006,
      release: 0.1
    });

    if (wet > 0.06) {
      const stickyAt = now + 0.025;
      this._addNoise(voice, {
        buffer: this.brownNoiseBuffer,
        at: stickyAt,
        duration: 0.11 + wet * 0.24,
        gain: 0.018 + wet * 0.065,
        filterType: "bandpass",
        frequency: 350 + wet * 90,
        endFrequency: 92 + wet * 45,
        q: 2.1 + wet * 2.4,
        playbackRate: 0.68 + strength * 0.13
      });
      this._addBubble(voice, stickyAt, 0.1 + wet * 0.21, wet, strength * 0.5);
    }
    return true;
  }

  /** Plays the short sticky pull and hand/ledge scrape of a completed mantle. */
  mantle(intensity = 1) {
    const strength = clamp(intensity, 0, 1.25);
    this.parkourEvents.mantle += 1;
    if (strength <= 0 || !this._allowSfx("mantle", 0.16)) return false;

    const now = this.context.currentTime;
    const duration = 0.28 + strength * 0.12;
    const voice = this._createVoice(duration + 0.1, -0.035);
    if (!voice) return false;

    this._addNoise(voice, {
      buffer: this.noiseBuffer,
      at: now,
      duration: 0.14 + strength * 0.09,
      gain: 0.022 + strength * 0.038,
      filterType: "bandpass",
      frequency: 1260 + strength * 410,
      endFrequency: 430,
      q: 0.82,
      playbackRate: 0.72 + strength * 0.16
    });
    this._addTone(voice, {
      at: now + 0.028,
      duration,
      type: "triangle",
      frequency: 132 + strength * 34,
      endFrequency: 61,
      gain: 0.018 + strength * 0.035,
      attack: 0.025,
      release: 0.16
    });
    this._addNoise(voice, {
      buffer: this.brownNoiseBuffer,
      at: now + 0.13,
      duration: 0.1 + strength * 0.06,
      gain: 0.014 + strength * 0.024,
      filterType: "lowpass",
      frequency: 520,
      endFrequency: 150,
      q: 0.8,
      playbackRate: 0.82
    });
    return true;
  }

  /**
   * A brief continuous scrape suitable for repeated slide ticks. The 145ms
   * gate lets movement code call this every frame without building polyphony.
   */
  slide(intensity = 1, wetness = 0) {
    const strength = clamp(intensity, 0, 1.25);
    const wet = clamp(wetness);
    this.parkourEvents.slide += 1;
    if (strength <= 0 || !this._allowSfx("slide", 0.145)) return false;

    const now = this.context.currentTime;
    const duration = 0.16 + strength * 0.1 + wet * 0.1;
    const voice = this._createVoice(duration + 0.08, 0);
    if (!voice) return false;

    this._addNoise(voice, {
      buffer: wet > 0.14 ? this.brownNoiseBuffer : this.noiseBuffer,
      at: now,
      duration,
      gain: 0.018 + strength * 0.035 + wet * 0.027,
      filterType: wet > 0.14 ? "bandpass" : "highpass",
      frequency: wet > 0.14 ? 410 : 720,
      endFrequency: wet > 0.14 ? 150 : 1370,
      q: 0.65 + wet * 1.7,
      playbackRate: 0.72 + strength * 0.24 - wet * 0.1
    });
    if (wet > 0.09) {
      this._addTone(voice, {
        at: now + 0.018,
        duration: 0.12 + wet * 0.13,
        type: "triangle",
        frequency: 105 + strength * 25,
        endFrequency: 48 + wet * 16,
        gain: 0.012 + wet * 0.03,
        attack: 0.018,
        release: 0.1
      });
    }
    return true;
  }

  /**
   * A small wet strand slap for falling-spaghetti collisions. Distance is in
   * world metres and attenuates the event; the 65ms gate caps the entire rain
   * field to roughly fifteen light impacts per second.
   */
  noodleImpact(intensity = 1, distance = 0) {
    const rawStrength = clamp(intensity, 0, 1.25);
    const metres = clamp(Math.abs(Number(distance) || 0), 0, 80);
    const strength = rawStrength / (1 + metres * 0.105);
    this.parkourEvents.noodleImpact += 1;
    if (strength < 0.045 || !this._allowSfx("noodleImpact", 0.065)) return false;

    const now = this.context.currentTime;
    const duration = 0.1 + strength * 0.13;
    const pan = (Math.random() * 2 - 1) * Math.min(0.34, 0.08 + metres * 0.012);
    const voice = this._createVoice(duration + 0.07, pan);
    if (!voice) return false;

    this._addNoise(voice, {
      buffer: this.noiseBuffer,
      at: now,
      duration: 0.035 + strength * 0.055,
      gain: 0.01 + strength * 0.04,
      filterType: "bandpass",
      frequency: 1080 - Math.min(530, metres * 18),
      endFrequency: 330 - Math.min(160, metres * 3.5),
      q: 0.92 + strength * 1.1,
      playbackRate: 0.82 + strength * 0.24
    });
    this._addTone(voice, {
      at: now + 0.008,
      duration,
      type: "triangle",
      frequency: 174 + strength * 78,
      endFrequency: 55 + strength * 22,
      gain: 0.006 + strength * 0.022,
      attack: 0.008,
      release: 0.085
    });
    return true;
  }

  update(depth = this.depth, danger = this.danger, playerPosition = this.playerPosition) {
    this.depth = clamp(depth);
    this.danger = clamp(danger);
    this.playerPosition = this._coercePosition(playerPosition);

    if (!this.context || !this.ambience) {
      this._publishState();
      return this.audioState;
    }

    this._pruneVoices();
    const now = this.context.currentTime;
    const { humGain, humOsc, roomGain, pourGain, pourFilter, pourPan } = this.ambience;

    this._target(humGain.gain, 0.022 + this.depth * 0.012 + this.danger * 0.018, now, 0.32);
    this._target(humOsc.frequency, 47 + this.danger * 8 - this.depth * 3, now, 0.45);
    this._target(roomGain.gain, 0.012 + this.depth * 0.025 + this.danger * 0.008, now, 0.35);
    this._target(pourGain.gain, 0.026 + this.depth * 0.046 + this.danger * 0.015, now, 0.28);
    this._target(pourFilter.frequency, 690 - this.depth * 310 + this.danger * 85, now, 0.38);

    if (pourPan?.pan) {
      this._target(pourPan.pan, clamp(-this.playerPosition.x / 12, -0.34, 0.34), now, 0.4);
    }
    this._updateListener(this.playerPosition, now);
    this._publishState();
    // Per-frame hot path: the main loop ignores this return, so hand back the
    // cheap status string instead of allocating a deep telemetry snapshot every
    // frame. Callers that need the full state call getState() directly.
    return this.audioState;
  }

  combat(name, intensity = 1, pan = 0) {
    const eventName = Object.hasOwn(this.combatEvents, name) ? name : "enemyHit";
    this.combatEvents[eventName] += 1;
    const strength = clamp(intensity, 0.05, 1.5);
    const stereo = clamp(pan, -0.85, 0.85);
    const gates = {
      fire: 0.055,
      dryFire: 0.12,
      ammoTail: 0.055,
      ammoLow: 0.08,
      ammoCritical: 0.08,
      magEmpty: 0.1,
      reloadStart: 0.12,
      reloadEject: 0.1,
      reloadInsert: 0.1,
      reloadEnd: 0.12,
      punchSwing: 0.1,
      punchHit: 0.08,
      punchMiss: 0.12,
      enemyHit: 0.04,
      enemyDeath: 0.08,
      enemyShot: 0.09,
      playerHit: 0.08,
      spaghettiBurn: 0.16,
      sauceBomb: 0.25,
      pickup: 0.12,
      waveStart: 0.35,
      bossSpawn: 0.6
    };
    if (!this._allowSfx(`combat:${eventName}`, gates[eventName] || 0.06)) return false;

    const now = this.context.currentTime;
    const durations = {
      fire: 0.15,
      dryFire: 0.065,
      ammoTail: 0.09,
      ammoLow: 0.22,
      ammoCritical: 0.26,
      magEmpty: 0.19,
      reloadStart: 0.2,
      reloadEject: 0.16,
      reloadInsert: 0.24,
      reloadEnd: 0.18,
      punchSwing: 0.24,
      punchHit: 0.38,
      punchMiss: 0.26,
      enemyHit: 0.16,
      enemyDeath: 0.58,
      enemyShot: 0.22,
      playerHit: 0.32,
      spaghettiBurn: 0.46,
      sauceBomb: 1.0,
      pickup: 0.42,
      waveStart: 0.85,
      bossSpawn: 1.35
    };
    const duration = durations[eventName] || 0.24;
    const voice = this._createVoice(duration + 0.18, stereo);
    if (!voice) return false;
    this.audibleCombatEvents[eventName] += 1;
    this.recentCombatCues.push({ name: eventName, at: now, played: true, intensity: strength });
    if (this.recentCombatCues.length > 32) this.recentCombatCues.shift();

    if (eventName === "punchSwing") {
      this._addNoise(voice, {
        buffer: this.noiseBuffer,
        at: now,
        duration: 0.18,
        gain: 0.09 * strength,
        filterType: "bandpass",
        frequency: 1840,
        endFrequency: 310,
        q: 0.48,
        playbackRate: 1.26
      });
      this._addTone(voice, {
        at: now + 0.018,
        duration: 0.14,
        type: "triangle",
        frequency: 310,
        endFrequency: 92,
        gain: 0.026 * strength,
        attack: 0.002,
        release: 0.11
      });
    } else if (eventName === "punchHit") {
      this._addNoise(voice, {
        buffer: this.brownNoiseBuffer,
        at: now,
        duration: 0.16,
        gain: 0.19 * strength,
        filterType: "lowpass",
        frequency: 820,
        endFrequency: 72,
        q: 1.12,
        playbackRate: 0.78
      });
      this._addTone(voice, {
        at: now,
        duration: 0.25,
        type: "sine",
        frequency: 148,
        endFrequency: 38,
        gain: 0.12 * strength,
        attack: 0.001,
        release: 0.21
      });
      this._addBubble(voice, now + 0.012, 0.34, 0.78, strength * 1.18);
    } else if (eventName === "punchMiss") {
      this._addNoise(voice, {
        buffer: this.noiseBuffer,
        at: now,
        duration: 0.2,
        gain: 0.072 * strength,
        filterType: "highpass",
        frequency: 2350,
        endFrequency: 540,
        q: 0.62,
        playbackRate: 1.4
      });
      this._addTone(voice, {
        at: now + 0.045,
        duration: 0.12,
        type: "triangle",
        frequency: 220,
        endFrequency: 105,
        gain: 0.018 * strength,
        attack: 0.002,
        release: 0.09
      });
    } else if (eventName === "fire" || eventName === "enemyShot") {
      const enemy = eventName === "enemyShot";
      this._addNoise(voice, {
        buffer: this.noiseBuffer,
        at: now,
        duration: 0.055 + strength * 0.025,
        gain: (enemy ? 0.055 : 0.11) * strength,
        filterType: "bandpass",
        frequency: enemy ? 920 : 1850,
        endFrequency: enemy ? 230 : 410,
        q: enemy ? 0.8 : 0.55,
        playbackRate: enemy ? 0.74 : 1.22
      });
      this._addTone(voice, {
        at: now,
        duration: 0.17,
        type: enemy ? "sawtooth" : "square",
        frequency: enemy ? 190 : 340,
        endFrequency: enemy ? 64 : 92,
        gain: (enemy ? 0.04 : 0.075) * strength,
        attack: 0.003,
        release: 0.12
      });
    } else if (eventName === "ammoTail") {
      this._addTone(voice, {
        at: now + 0.014,
        duration: 0.07,
        type: "triangle",
        frequency: 1280 + strength * 760,
        endFrequency: 620 + strength * 310,
        gain: 0.018 + strength * 0.026,
        attack: 0.001,
        release: 0.05
      });
      this._addNoise(voice, {
        buffer: this.noiseBuffer,
        at: now + 0.01,
        duration: 0.035,
        gain: 0.022 * strength,
        filterType: "highpass",
        frequency: 2100,
        endFrequency: 940,
        q: 0.7,
        playbackRate: 1.42
      });
    } else if (eventName === "ammoLow" || eventName === "ammoCritical") {
      const critical = eventName === "ammoCritical";
      const count = critical ? 3 : 2;
      for (let index = 0; index < count; index += 1) {
        this._addTone(voice, {
          at: now + index * (critical ? 0.052 : 0.075),
          duration: critical ? 0.07 : 0.09,
          type: "square",
          frequency: (critical ? 1480 : 940) + index * (critical ? 280 : 190),
          endFrequency: (critical ? 930 : 610) + index * 120,
          gain: (critical ? 0.034 : 0.026) * strength,
          attack: 0.002,
          release: 0.045
        });
      }
    } else if (eventName === "magEmpty") {
      this._addNoise(voice, {
        buffer: this.noiseBuffer,
        at: now,
        duration: 0.105,
        gain: 0.09 * strength,
        filterType: "bandpass",
        frequency: 1520,
        endFrequency: 220,
        q: 1.1,
        playbackRate: 0.82
      });
      this._addTone(voice, {
        at: now + 0.018,
        duration: 0.16,
        type: "triangle",
        frequency: 260,
        endFrequency: 66,
        gain: 0.075 * strength,
        attack: 0.002,
        release: 0.12
      });
    } else if (eventName === "dryFire") {
      this._addNoise(voice, {
        buffer: this.noiseBuffer,
        at: now,
        duration: 0.03,
        gain: 0.07 * strength,
        filterType: "highpass",
        frequency: 2800,
        endFrequency: 1250,
        q: 0.5,
        playbackRate: 1.65
      });
      this._addTone(voice, {
        at: now,
        duration: 0.045,
        type: "square",
        frequency: 1180,
        endFrequency: 520,
        gain: 0.028 * strength,
        attack: 0.001,
        release: 0.032
      });
    } else if (["reloadStart", "reloadEject", "reloadInsert", "reloadEnd"].includes(eventName)) {
      const eject = eventName === "reloadEject";
      const insert = eventName === "reloadInsert";
      const end = eventName === "reloadEnd";
      this._addNoise(voice, {
        buffer: eject || end ? this.noiseBuffer : this.brownNoiseBuffer,
        at: now,
        duration: insert ? 0.16 : end ? 0.06 : 0.095,
        gain: (insert ? 0.07 : end ? 0.08 : 0.065) * strength,
        filterType: eject || end ? "highpass" : "bandpass",
        frequency: end ? 2450 : eject ? 1650 : insert ? 760 : 520,
        endFrequency: end ? 1120 : eject ? 620 : insert ? 260 : 130,
        q: insert ? 1.2 : 0.7,
        playbackRate: end ? 1.48 : eject ? 1.18 : 0.8
      });
      this._addTone(voice, {
        at: now + (insert ? 0.025 : 0),
        duration: insert ? 0.2 : end ? 0.14 : 0.13,
        type: end ? "triangle" : "square",
        frequency: end ? 620 : eject ? 420 : insert ? 250 : 180,
        endFrequency: end ? 1180 : eject ? 170 : insert ? 510 : 72,
        gain: (end ? 0.052 : 0.041) * strength,
        attack: 0.002,
        release: insert ? 0.15 : 0.09
      });
    } else if (eventName === "sauceBomb" || eventName === "bossSpawn") {
      this._addNoise(voice, {
        buffer: this.brownNoiseBuffer,
        at: now,
        duration,
        gain: (eventName === "bossSpawn" ? 0.16 : 0.21) * strength,
        filterType: "lowpass",
        frequency: eventName === "bossSpawn" ? 620 : 1100,
        endFrequency: 78,
        q: 1.4,
        playbackRate: 0.62
      });
      this._addTone(voice, {
        at: now,
        duration,
        type: "sawtooth",
        frequency: eventName === "bossSpawn" ? 92 : 138,
        endFrequency: 34,
        gain: 0.13 * strength,
        attack: 0.012,
        release: duration * 0.7
      });
      this._addBubble(voice, now + 0.02, Math.min(duration, 0.82), 1, strength);
    } else if (eventName === "spaghettiBurn") {
      this._addNoise(voice, {
        buffer: this.brownNoiseBuffer,
        at: now,
        duration: 0.34,
        gain: 0.15 * strength,
        filterType: "bandpass",
        frequency: 780,
        endFrequency: 135,
        q: 1.35,
        playbackRate: 0.72
      });
      this._addTone(voice, {
        at: now,
        duration: 0.42,
        type: "sawtooth",
        frequency: 118,
        endFrequency: 46,
        gain: 0.052 * strength,
        attack: 0.01,
        release: 0.34
      });
      this._addBubble(voice, now + 0.02, 0.4, 1, strength * 1.15);
    } else if (eventName === "enemyHit" || eventName === "enemyDeath" || eventName === "playerHit") {
      const death = eventName === "enemyDeath";
      const player = eventName === "playerHit";
      this._addNoise(voice, {
        buffer: player ? this.brownNoiseBuffer : this.noiseBuffer,
        at: now,
        duration: death ? 0.34 : 0.12,
        gain: (player ? 0.16 : death ? 0.13 : 0.07) * strength,
        filterType: player ? "lowpass" : "bandpass",
        frequency: player ? 480 : 760,
        endFrequency: player ? 95 : 180,
        q: 1.1,
        playbackRate: death ? 0.58 : 0.92
      });
      this._addBubble(voice, now, death ? 0.46 : 0.18, 0.92, strength);
    } else {
      const bright = eventName === "pickup" || eventName === "reloadEnd" || eventName === "waveStart";
      this._addTone(voice, {
        at: now,
        duration,
        type: bright ? "triangle" : "square",
        frequency: bright ? 520 : 210,
        endFrequency: bright ? 940 : 118,
        gain: 0.045 * strength,
        attack: 0.006,
        release: duration * 0.68
      });
    }
    return true;
  }

  win() {
    if (!this._readyForSound()) return false;
    const now = this.context.currentTime;
    const voice = this._createVoice(2.55, 0);
    if (!voice) return false;

    [196, 247, 294, 392, 494].forEach((frequency, index) => {
      this._addTone(voice, {
        at: now + index * 0.075,
        duration: 1.45 + index * 0.08,
        type: index % 2 ? "triangle" : "sine",
        frequency,
        endFrequency: frequency * 1.018,
        gain: 0.055 - index * 0.004,
        attack: 0.025,
        release: 0.9
      });
    });
    this._addNoise(voice, {
      buffer: this.noiseBuffer,
      at: now + 0.12,
      duration: 0.62,
      gain: 0.035,
      filterType: "highpass",
      frequency: 1250,
      endFrequency: 3100,
      q: 0.45,
      playbackRate: 1.08
    });
    return true;
  }

  drown() {
    if (!this._readyForSound()) return false;
    const now = this.context.currentTime;
    const voice = this._createVoice(3.35, 0);
    if (!voice) return false;

    this._addTone(voice, {
      at: now,
      duration: 2.75,
      type: "sawtooth",
      frequency: 118,
      endFrequency: 27,
      gain: 0.16,
      attack: 0.018,
      release: 1.25
    });
    this._addTone(voice, {
      at: now + 0.09,
      duration: 2.35,
      type: "sine",
      frequency: 73,
      endFrequency: 34,
      gain: 0.13,
      attack: 0.045,
      release: 1.1
    });
    this._addNoise(voice, {
      buffer: this.brownNoiseBuffer,
      at: now,
      duration: 3.0,
      gain: 0.21,
      filterType: "lowpass",
      frequency: 790,
      endFrequency: 95,
      q: 1.8,
      playbackRate: 0.58
    });
    this._addBubble(voice, now + 0.03, 2.1, 1, 0.22);
    return true;
  }

  toggleMute(force) {
    this.muted = typeof force === "boolean" ? force : !this.muted;
    this._setMasterLevel(this.muted ? 0.0001 : 0.78, 0.035);
    this._publishState();
    return this.muted;
  }

  getState() {
    return {
      supported: this.supported,
      unlocked: this.unlocked,
      running: this.context?.state === "running",
      muted: this.muted,
      audioState: this.audioState,
      contextState: this.context?.state || "none",
      stepEvents: this.stepEvents,
      wetStepEvents: this.wetStepEvents,
      parkourEvents: { ...this.parkourEvents },
      combatEvents: { ...this.combatEvents },
      audibleCombatEvents: { ...this.audibleCombatEvents },
      recentCombatCues: this.recentCombatCues.map((cue) => ({ ...cue })),
      activeVoices: this.voices.size,
      maxVoices: this.maxVoices,
      depth: this.depth,
      danger: this.danger,
      playerPosition: { ...this.playerPosition },
      lastError: this.lastError
    };
  }

  _buildGraph() {
    const context = this.context;
    const now = context.currentTime;

    this.master = context.createGain();
    this.ambienceBus = context.createGain();
    this.sfxBus = context.createGain();
    this.compressor = context.createDynamicsCompressor();

    this.master.gain.setValueAtTime(this.muted ? 0.0001 : 0.78, now);
    this.ambienceBus.gain.setValueAtTime(0.78, now);
    this.sfxBus.gain.setValueAtTime(0.94, now);
    this.compressor.threshold.setValueAtTime(-18, now);
    this.compressor.knee.setValueAtTime(18, now);
    this.compressor.ratio.setValueAtTime(5, now);
    this.compressor.attack.setValueAtTime(0.004, now);
    this.compressor.release.setValueAtTime(0.18, now);

    this.ambienceBus.connect(this.compressor);
    this.sfxBus.connect(this.compressor);
    this.compressor.connect(this.master);
    this.master.connect(context.destination);

    this.noiseBuffer = this._makeNoiseBuffer(false);
    this.brownNoiseBuffer = this._makeNoiseBuffer(true);
    this._startAmbience();
  }

  _startAmbience() {
    const context = this.context;
    const now = context.currentTime;

    const humOsc = context.createOscillator();
    const humGain = context.createGain();
    humOsc.type = "sine";
    humOsc.frequency.setValueAtTime(47, now);
    humGain.gain.setValueAtTime(0.022, now);
    humOsc.connect(humGain).connect(this.ambienceBus);

    const roomSource = context.createBufferSource();
    const roomFilter = context.createBiquadFilter();
    const roomGain = context.createGain();
    roomSource.buffer = this.brownNoiseBuffer;
    roomSource.loop = true;
    roomFilter.type = "lowpass";
    roomFilter.frequency.setValueAtTime(155, now);
    roomFilter.Q.setValueAtTime(0.72, now);
    roomGain.gain.setValueAtTime(0.012, now);
    roomSource.connect(roomFilter).connect(roomGain).connect(this.ambienceBus);

    const pourSource = context.createBufferSource();
    const pourFilter = context.createBiquadFilter();
    const pourSoftener = context.createBiquadFilter();
    const pourGain = context.createGain();
    const pourPan = context.createStereoPanner ? context.createStereoPanner() : null;
    pourSource.buffer = this.noiseBuffer;
    pourSource.loop = true;
    pourSource.playbackRate.setValueAtTime(0.82, now);
    pourFilter.type = "bandpass";
    pourFilter.frequency.setValueAtTime(690, now);
    pourFilter.Q.setValueAtTime(1.35, now);
    pourSoftener.type = "lowpass";
    pourSoftener.frequency.setValueAtTime(2350, now);
    pourGain.gain.setValueAtTime(0.026, now);
    pourSource.connect(pourFilter).connect(pourSoftener).connect(pourGain);
    if (pourPan) pourGain.connect(pourPan).connect(this.ambienceBus);
    else pourGain.connect(this.ambienceBus);

    const pourLfo = context.createOscillator();
    const pourLfoGain = context.createGain();
    pourLfo.type = "sine";
    pourLfo.frequency.setValueAtTime(0.115, now);
    pourLfoGain.gain.setValueAtTime(0.009, now);
    pourLfo.connect(pourLfoGain).connect(pourGain.gain);

    humOsc.start(now);
    roomSource.start(now, Math.random() * Math.max(0.01, this.brownNoiseBuffer.duration - 0.1));
    pourSource.start(now, Math.random() * Math.max(0.01, this.noiseBuffer.duration - 0.1));
    pourLfo.start(now);

    this.ambience = {
      humOsc,
      humGain,
      roomSource,
      roomFilter,
      roomGain,
      pourSource,
      pourFilter,
      pourSoftener,
      pourGain,
      pourPan,
      pourLfo,
      pourLfoGain
    };
  }

  _makeNoiseBuffer(brown) {
    const context = this.context;
    const length = Math.max(1, Math.floor(context.sampleRate * 2.4));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        previous = (previous + 0.018 * white) / 1.018;
        data[index] = clamp(previous * 3.35, -1, 1);
      } else {
        data[index] = white;
      }
    }
    return buffer;
  }

  _createVoice(duration, pan) {
    if (!this._readyForSound()) return null;
    this._pruneVoices();
    while (this.voices.size >= this.maxVoices) {
      const oldest = this.voices.values().next().value;
      if (!oldest) break;
      this._stopVoice(oldest, 0.018);
    }

    const context = this.context;
    const input = context.createGain();
    const output = context.createGain();
    const panner = context.createStereoPanner ? context.createStereoPanner() : null;
    input.gain.setValueAtTime(1, context.currentTime);
    output.gain.setValueAtTime(1, context.currentTime);
    input.connect(output);
    if (panner) {
      panner.pan.setValueAtTime(clamp(pan, -1, 1), context.currentTime);
      output.connect(panner).connect(this.sfxBus);
    } else {
      output.connect(this.sfxBus);
    }

    const voice = {
      input,
      output,
      panner,
      sources: [],
      nodes: [input, output, panner].filter(Boolean),
      expiresAt: context.currentTime + duration,
      stopped: false,
      cleaned: false,
      timer: 0
    };
    voice.timer = globalThis.setTimeout?.(() => this._cleanupVoice(voice), Math.ceil((duration + 0.16) * 1000));
    this.voices.add(voice);
    return voice;
  }

  _addTone(voice, { at, duration, type, frequency, endFrequency, gain, attack, release }) {
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const end = at + duration;
    const attackEnd = at + Math.min(duration * 0.45, Math.max(0.004, attack));
    const releaseStart = Math.max(attackEnd, end - Math.max(0.018, release));

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), end);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), attackEnd);
    envelope.gain.setValueAtTime(Math.max(0.0002, gain), releaseStart);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope).connect(voice.input);

    oscillator.start(at);
    oscillator.stop(end + 0.025);
    voice.sources.push(oscillator);
    voice.nodes.push(oscillator, envelope);
  }

  _addNoise(voice, { buffer, at, duration, gain, filterType, frequency, endFrequency, q, playbackRate }) {
    const context = this.context;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const end = at + duration;
    const attackEnd = at + Math.min(0.014, duration * 0.24);
    const offsetRoom = Math.max(0.01, buffer.duration - duration * Math.max(0.25, playbackRate) - 0.03);

    source.buffer = buffer;
    source.playbackRate.setValueAtTime(Math.max(0.25, playbackRate), at);
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(25, frequency), at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), end);
    filter.Q.setValueAtTime(Math.max(0.001, q), at);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), attackEnd);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(filter).connect(envelope).connect(voice.input);

    source.start(at, Math.random() * offsetRoom);
    source.stop(end + 0.025);
    voice.sources.push(source);
    voice.nodes.push(source, filter, envelope);
  }

  _addBubble(voice, at, duration, wetness, pace) {
    const context = this.context;
    const carrier = context.createOscillator();
    const modulation = context.createOscillator();
    const modulationDepth = context.createGain();
    const envelope = context.createGain();
    const end = at + duration;

    carrier.type = "sine";
    carrier.frequency.setValueAtTime(82 + wetness * 54 + pace * 18, at);
    carrier.frequency.exponentialRampToValueAtTime(46 + wetness * 38, end);
    modulation.type = "sine";
    modulation.frequency.setValueAtTime(7 + wetness * 8 + pace * 7, at);
    modulationDepth.gain.setValueAtTime(12 + wetness * 31, at);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(0.018 + wetness * 0.07, at + Math.min(0.035, duration * 0.28));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    modulation.connect(modulationDepth).connect(carrier.frequency);
    carrier.connect(envelope).connect(voice.input);
    carrier.start(at);
    modulation.start(at);
    carrier.stop(end + 0.025);
    modulation.stop(end + 0.025);
    voice.sources.push(carrier, modulation);
    voice.nodes.push(carrier, modulation, modulationDepth, envelope);
  }

  _stopVoice(voice, fade = 0.015) {
    if (!voice || voice.stopped || !this.context) return;
    voice.stopped = true;
    this.voices.delete(voice);
    const now = this.context.currentTime;
    voice.output.gain.cancelScheduledValues(now);
    voice.output.gain.setValueAtTime(Math.max(0.0001, voice.output.gain.value), now);
    voice.output.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    voice.sources.forEach((source) => safeStop(source, now + fade + 0.01));
    globalThis.setTimeout?.(() => this._cleanupVoice(voice), Math.ceil((fade + 0.04) * 1000));
  }

  _cleanupVoice(voice) {
    if (!voice || voice.cleaned) return;
    voice.cleaned = true;
    this.voices.delete(voice);
    if (voice.timer) globalThis.clearTimeout?.(voice.timer);
    for (const node of voice.nodes) {
      try {
        node.disconnect();
      } catch {
        // Disconnected nodes are harmless and may throw in older Safari builds.
      }
    }
  }

  _pruneVoices() {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const voice of this.voices) {
      if (voice.expiresAt <= now) this._cleanupVoice(voice);
    }
  }

  _readyForSound() {
    return Boolean(
      this.context &&
      this.context.state === "running" &&
      this.master &&
      this.sfxBus &&
      !this.muted
    );
  }

  _allowSfx(name, minimumInterval) {
    if (!this._readyForSound()) return false;
    const now = this.context.currentTime;
    const previous = Number(this.lastSfxAt[name]);
    if (Number.isFinite(previous) && now - previous < minimumInterval) return false;
    this.lastSfxAt[name] = now;
    return true;
  }

  _resolveSide(side) {
    this.stepParity *= -1;
    if (typeof side === "string") {
      const normalized = side.toLowerCase();
      if (normalized.startsWith("l")) return -1;
      if (normalized.startsWith("r")) return 1;
    }
    if (Number.isFinite(Number(side)) && Number(side) !== 0) return Math.sign(Number(side));
    return this.stepParity;
  }

  _coercePosition(position) {
    if (Array.isArray(position)) {
      return {
        x: Number(position[0]) || 0,
        y: Number(position[1]) || 0,
        z: Number(position[2]) || 0
      };
    }
    return {
      x: Number(position?.x) || 0,
      y: Number(position?.y) || 0,
      z: Number(position?.z) || 0
    };
  }

  _updateListener(position, now) {
    const listener = this.context?.listener;
    if (!listener) return;
    if (listener.positionX) {
      this._target(listener.positionX, position.x, now, 0.08);
      this._target(listener.positionY, position.y, now, 0.08);
      this._target(listener.positionZ, position.z, now, 0.08);
    } else if (typeof listener.setPosition === "function") {
      listener.setPosition(position.x, position.y, position.z);
    }
  }

  _target(param, value, now, timeConstant) {
    if (!param) return;
    try {
      param.setTargetAtTime(value, now, timeConstant);
    } catch {
      param.value = value;
    }
  }

  _setMasterLevel(value, timeConstant) {
    if (!this.master || !this.context || this.context.state === "closed") return;
    this._target(this.master.gain, value, this.context.currentTime, timeConstant);
  }

  _handleVisibilityChange() {
    if (
      typeof document === "undefined" ||
      !document.hidden ||
      !this.context ||
      this.context.state !== "running"
    ) {
      this._publishState();
      return;
    }

    this.context
      .suspend()
      .then(() => {
        this.unlocked = false;
        this._publishState();
      })
      .catch((error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
        this._publishState("error");
      });
  }

  _effectiveState() {
    if (this.disabled) return "disabled";
    if (!this.supported) return "unsupported";
    if (this.lastError && !this.context) return "error";
    if (this.muted) return "muted";
    if (!this.context) return "locked";
    return this.context.state || "locked";
  }

  _publishState(explicitState) {
    this.audioState = explicitState || this._effectiveState();
    if (typeof document !== "undefined" && document.body) {
      document.body.dataset.audioState = this.audioState;
    }
  }
}

export default SpaghettiAudio;
