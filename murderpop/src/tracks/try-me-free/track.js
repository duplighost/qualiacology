// BONUS · TRY ME FREE! · THE PRIZE INSIDE. A Saturday-morning cereal commercial the size of a town, and a boss
// rush in one song: when the megamix quotes a boss who is in this game, she brings back that boss's signature
// attack in cereal colours. The record's worst lines get no attack and no show: the commercial cuts out and the
// words land in the dark.
import * as THREE from 'three';
import { Prize, setExpr } from './prize.js';
import { buildSet } from './set.js';
import * as A from './moves.js';

export const SECTIONS = [
  ['S1 commercial', 0.0], ['S2 funeral', 16.61], ['S3 livestream', 37.38], ['S4 coffee', 58.16], ['S5 alphabet', 80.32],
  ['S6 morgue', 103.52], ['S7 cereal', 126.03], ['S8 dad', 152.34], ['S9 courthouse', 175.24], ['S10 bathroom', 211.55],
  ['S11 rights', 247.67], ['S12 every cereal', 271.90],
];

let prize = null;
export default {
  id: 'try-me-free', beats: 'try-me-free', par: 50000, lastHit: 289.54,
  spawn: { player: [0, 4.2, Math.PI], boss: [0, -5.6, 0] },

  async buildArena(f) { this.set = await buildSet(f); return this.set.world; },
  async buildBoss(f) {
    prize = this.prize = await Prize.build(f);
    this.set.attachBoss(prize);
    // plan her shatter and break chunks now (not at the finish), then warm every shader
    try { await prize.fig.prepare(f.app.renderer, f.cam.cam, f.scene); } catch (e) { console.warn('prepare', e.message); }
    this.set.warm(f);
    return prize.boss;
  },

  script(T, f) {
    SECTIONS.forEach(([name, t0], i) => T.section(name, { s: t0 }, { s: i + 1 < SECTIONS.length ? SECTIONS[i + 1][1] : 294.1 }, { final: i === SECTIONS.length - 1 }));
    A.script(T, f, this);
    // whenever the record jumps (a start part-way in, a rewind, an encore), put the commercial in its state at that
    // moment before the next frame's events run (otherwise the events on a section's first beat, a cut, a prop in
    // her hand, the first pour of the final chorus, ran first and were then undone by the set catching up)
    const seek0 = T.seek.bind(T), set = this.set;
    T.seek = (t) => { seek0(t); set.setStateAt(f, t, true); };
  },

  onStart(f) { this.set.setStateAt(f, 0, true); },
  onRewind(f, t) { this.set.setStateAt(f, t, true); },
  onSection(f, sec) {},
  onBreak(f, i) { this.set.onBreak(f, i); },
  onEmpty(f) { this.set.onEmpty(f); },
  onFinish(f) { this.set.onFinish(f); },
  onEncore(f) { this.set.onEncore(f); },
  onSpotlight(f, on) { this.set.onSpotlight(f, on); },
  update(f, dt) {},   // the set runs from the arena's update (once a frame)
};
