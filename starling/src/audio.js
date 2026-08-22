/* Sound, made from noise and two oscillators. No files.
 *
 * A murmuration is loud in a way people never expect — it is not birdsong, it
 * is weather. The wing bed here is filtered noise whose brightness tracks how
 * agitated the flock is, so a wave rolling out is something you hear a moment
 * before you have finished reading it on screen. That ordering is deliberate.
 */

const noiseBuffer = (ctx, seconds) => {
  const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    /* Brown-ish. White noise reads as a hiss, brown reads as air. */
    last = (last + Math.random() * 2 - 1) * 0.5;
    d[i] = last * 1.4;
  }
  return b;
};

export class Audio {
  constructor() {
    this.ok = false;
    this.muted = false;
    this.ctx = null;
  }

  start() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = 0.0;
      this.master.connect(ctx.destination);

      const buf = noiseBuffer(ctx, 3);

      /* Wind: always there, barely. */
      const wind = ctx.createBufferSource();
      wind.buffer = buf; wind.loop = true;
      const windF = ctx.createBiquadFilter();
      windF.type = "lowpass"; windF.frequency.value = 380;
      this.windG = ctx.createGain(); this.windG.gain.value = 0.16;
      wind.connect(windF).connect(this.windG).connect(this.master);
      wind.start();

      /* Wings: the flock itself. Brightness and level both ride on alarm. */
      const wings = ctx.createBufferSource();
      wings.buffer = buf; wings.loop = true;
      this.wingF = ctx.createBiquadFilter();
      this.wingF.type = "bandpass";
      this.wingF.frequency.value = 900;
      this.wingF.Q.value = 0.7;
      this.wingG = ctx.createGain(); this.wingG.gain.value = 0.05;
      wings.connect(this.wingF).connect(this.wingG).connect(this.master);
      wings.start();

      /* Night drone, faded in with the dark. */
      this.drone = ctx.createOscillator();
      this.drone.type = "sine";
      this.drone.frequency.value = 54;
      this.droneG = ctx.createGain(); this.droneG.gain.value = 0;
      this.drone.connect(this.droneG).connect(this.master);
      this.drone.start();

      this.buf = buf;
      this.ok = true;
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, ctx.currentTime, 1.2);
    } catch (e) {
      this.ok = false;
    }
  }

  /* Called every frame with the state of the flock. */
  set(alarm, night, density) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    this.wingG.gain.setTargetAtTime(0.035 + alarm * 0.16 + density * 0.02, t, 0.08);
    this.wingF.frequency.setTargetAtTime(720 + alarm * 2300, t, 0.09);
    this.windG.gain.setTargetAtTime(0.13 + night * 0.07, t, 0.5);
    this.droneG.gain.setTargetAtTime(night * night * 0.09, t, 1.0);
  }

  /* A wave leaving you: a short intake of air, pitched up with its strength. */
  wave(strength) {
    if (!this.ok || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.buf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2600 * (0.7 + strength * 0.5), t + 0.26);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * strength, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + 0.45);
  }

  shriek() {
    if (!this.ok || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(1750, t);
    o.frequency.exponentialRampToValueAtTime(760, t + 0.34);
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 5;
    f.frequency.setValueAtTime(2100, t);
    f.frequency.exponentialRampToValueAtTime(900, t + 0.34);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.075, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(f).connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.4);
  }

  /* A hit. Low, short, and it does not sound like a game — it sounds like
   * something soft meeting something fast. */
  strike(count) {
    if (!this.ok || this.muted || count <= 0) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const amount = Math.min(1, count / 60);
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * amount + 0.05, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.52);

    const s = ctx.createBufferSource(); s.buffer = this.buf; s.loop = true;
    const bf = ctx.createBiquadFilter(); bf.type = "lowpass"; bf.frequency.value = 1400;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.exponentialRampToValueAtTime(0.11 * amount + 0.02, t + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    s.connect(bf).connect(bg).connect(this.master);
    s.start(t); s.stop(t + 0.36);
  }

  toggle() {
    this.muted = !this.muted;
    if (this.ok) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.08);
    return this.muted;
  }
}
