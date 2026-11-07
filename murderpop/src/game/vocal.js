// Lip-sync from word timings: how open the narrator's mouth is at song time t (0..1).
export class Vocal {
  constructor(data) {
    this.w = (data && data.words) || [];
    this.i = 0; this.open = 0;
  }
  static async load(id) { try { const r = await fetch(`data/vocals/${id}.json`); return new Vocal(r.ok ? await r.json() : null); } catch (e) { return new Vocal(null); } }
  singing(t) { return this._word(t) !== null; }
  _word(t) {
    const w = this.w; if (!w.length) return null;
    if (this.i >= w.length || w[this.i][0] > t) this.i = 0;
    while (this.i < w.length - 1 && w[this.i][1] < t) this.i++;
    const x = w[this.i];
    return x && t >= x[0] - 0.03 && t <= x[1] + 0.04 ? x : null;
  }
  // smoothed openness; syllables flutter at roughly the word's letters / 3
  at(t, dt = 1 / 60) {
    const x = this._word(t);
    let target = 0;
    if (x) {
      const syl = Math.max(1, Math.round(x[2].replace(/[^a-z]/gi, '').length / 3));
      const k = (t - x[0]) / Math.max(0.05, x[1] - x[0]);
      target = 0.35 + 0.65 * Math.abs(Math.sin(Math.min(1, Math.max(0, k)) * Math.PI * syl));
    }
    this.open += (target - this.open) * Math.min(1, dt * 22);
    return this.open;
  }
}
