// Scripted hauntings: room triggers, ambient scares, apparitions, and the
// final meeting on the grand staircase.
import * as THREE from 'three';

export class Events {
  constructor(ctx) {
    this.ctx = ctx;               // { game, world, fx, audio, ui, player, props, ... }
    this.time = 0;
    this.idleT = 20;              // first ambient scare comes early
    this.finaleActive = false;
    this.horseRock = 0;
    this.triggers = this.buildTriggers();
  }

  buildTriggers() {
    const C = this.ctx;
    const t = [];
    const add = (id, x0, z0, x1, z1, level, fire, cond) =>
      t.push({ id, x0, z0, x1, z1, level, fire, cond, done: false });

    add('corridor1', 0, 26, 60, 30, 'ground', () => {
      C.audio.whisper();
      C.ui.subtitle('…a whisper, in no direction at all. It might have been a name.');
      C.fx.fearTarget = 0.18;
      setTimeout(() => (C.fx.fearTarget = 0), 3200);
    });

    add('ballroom', 0, 16, 18, 26, 'ground', () => {
      setTimeout(() => {
        C.audio.pianoNote(196, 0.16);
        C.ui.subtitle('A single piano note, from the dark end of the ballroom. The lid is closed.');
        C.fx.fearTarget = 0.3;
        setTimeout(() => (C.fx.fearTarget = 0), 4200);
      }, 1400);
    });

    add('music', 12, 0, 24, 12, 'ground', () => {
      setTimeout(() => {
        C.audio.lavenders();
        C.ui.subtitle('“Lavender’s blue, dilly dilly…” — the piano plays eight notes, and stops mid-phrase.');
      }, 2000);
    });

    add('gallery-portraits', 24, 0, 36, 12, 'ground', () => {
      C.ui.subtitle('Six generations of painted eyes. You would swear the newest portrait had been weeping — the varnish below her eyes is crazed.');
    });

    add('chapel', 0, 0, 12, 12, 'ground', () => {
      C.audio.ghostChord(0.12);
      C.fx.showGhost(8, 0, 2.6, Math.PI, 0.32);
      setTimeout(() => C.fx.hideGhost(), 2600);
      C.ui.subtitle('For a moment — a grey figure kneeling at the altar. Then only candle smoke.');
    });

    add('crypt', 2, 2, 8, 14, 'basement', () => {
      C.fx.fearTarget = 0.35;
      C.audio.whisper();
      C.ui.subtitle('The Blackthorns sleep in rows. The cold here is older than the house.');
      setTimeout(() => (C.fx.fearTarget = 0), 5000);
    });

    add('tunnel', 8, 10, 40, 14, 'basement', () => {
      setTimeout(() => {
        C.audio.pianoNote(392, 0.05);
        C.audio.pianoNote(349.2, 0.04);
        C.ui.subtitle('Very faint, through the earth — singing? Two notes, high and small. Then nothing. Sir Edmund heard it too.');
      }, 2500);
    });

    add('upstairs', 0, 26, 60, 30, 'first', () => {
      C.audio.doorSlam();
      C.ui.subtitle('Somewhere down the corridor, a door slams. The air moves past you as if something went by in a hurry.');
      C.fx.fearTarget = 0.28;
      setTimeout(() => (C.fx.fearTarget = 0), 3000);
    });

    add('nursery', 36, 16, 48, 26, 'first', () => {
      this.horseRock = 6;      // seconds of rocking
      C.audio.creak(0.8);
      C.ui.subtitle('The rocking horse is rocking. It slows, politely, as though someone small has just climbed down to look at you.');
      C.fx.fearTarget = 0.4;
      setTimeout(() => (C.fx.fearTarget = 0), 5000);
    });

    add('eastwing', 36, 12, 60, 16, 'first', () => {
      C.ui.subtitle('Beyond the seal the air is different — five years stiller. Your breath fogs. It is not cold enough for that.');
      C.fx.fearTarget = 0.25;
      setTimeout(() => (C.fx.fearTarget = 0), 4000);
    });

    add('retreat', 36, 0, 46, 12, 'first', () => {
      C.audio.heartbeat(true);
      setTimeout(() => C.audio.heartbeat(false), 6000);
      C.ui.subtitle('He slept here at the end, beside his maps of the walls. The bed is made. The pillow is worn through where a man lay listening, night after night.');
    });

    add('attic', 24, 0, 60, 16, 'attic', () => {
      C.audio.creak(1);
      C.ui.subtitle('Sheeted furniture, like a congregation waiting. One sheet has slipped to the floor — recently. There is no draught up here.');
      C.fx.fearTarget = 0.3;
      setTimeout(() => (C.fx.fearTarget = 0), 4000);
    });

    add('priesthole', 2, 14, 8, 18, 'basement', () => {
      C.audio.heartbeat(true);
      C.fx.fearTarget = 0.45;
      setTimeout(() => {
        C.audio.heartbeat(false);
        C.fx.fearTarget = 0;
        C.audio.ghostChord(0.1);
      }, 6000);
    });

    // apparition at the end of the long corridor, once you know too much
    add('hallGhost', 0, 26, 30, 30, 'ground', () => {
      C.fx.showGhost(56, 0, 28, -Math.PI / 2, 0.4);
      C.audio.ghostChord(0.1);
      C.ui.subtitle('At the far end of the corridor, sixty feet of shadow away — she is standing quite still, facing you.');
      C.fx.fearTarget = 0.5;
      setTimeout(() => { C.fx.hideGhost(); C.fx.fearTarget = 0; }, 3800);
    }, () => this.ctx.game.coreCluesFound() >= 3);

    add('galleryGhost', 22, 30, 38, 40, 'first', () => {
      C.fx.showGhost(36.4, 4.2, 35, -Math.PI / 2, 0.5);
      C.audio.whisper();
      C.ui.subtitle('She stands at the broken rail, looking down at the marble where she died. Her hands are folded. She is waiting for you to understand.');
      C.fx.fearTarget = 0.5;
      setTimeout(() => { C.fx.hideGhost(); C.fx.fearTarget = 0; }, 5000);
    }, () => this.ctx.game.coreCluesFound() >= 5);

    return t;
  }

  start() {
    const C = this.ctx;
    // opening beat: the letter, then the door
    setTimeout(() => C.readDoc('intro'), 1600);
    this._doorSlammed = false;
  }

  onDocClosed(id) {
    const C = this.ctx;
    if (id === 'intro' && !this._doorSlammed) {
      this._doorSlammed = true;
      C.game.flags.introDone = true;
      setTimeout(() => {
        C.audio.doorSlam();
        C.fx.fearTarget = 0.35;
        C.ui.toast('The front door swings shut behind you — and the bolt falls on the outside.');
        C.ui.objectiveFlash('Search Blackthorn Manor. Learn the truth of All Hallows’ Eve, 1899.');
        setTimeout(() => (C.fx.fearTarget = 0), 3500);
      }, 900);
    }
    if (id === 'lilyDiary') {
      C.ui.objectiveFlash('“Under the church room… behind the wall with the loose stone.” Find the priest hole.');
    }
    if (id === 'coroner') {
      C.ui.objectiveFlash('A brass button, torn from a coat. Find the coat that lost it.');
    }
    if (id === 'wicksLetter') {
      C.audio.ghostChord(0.16);
      C.ui.toast('Somewhere far above, in the bones of the house, something lets out a breath.');
    }
  }

  update(dt) {
    const C = this.ctx;
    this.time += dt;
    const p = C.player.pos;
    const level = C.world.levelAt(p.y);

    // room triggers
    for (const t of this.triggers) {
      if (t.done) continue;
      if (t.level !== level) continue;
      if (p.x < t.x0 || p.x > t.x1 || p.z < t.z0 || p.z > t.z1) continue;
      if (t.cond && !t.cond()) continue;
      t.done = true;
      t.fire();
    }

    // nursery horse rocking
    if (this.horseRock > 0 && C.props.rockingHorse) {
      this.horseRock -= dt;
      const decay = Math.min(1, this.horseRock / 6);
      C.props.rockingHorse.rotation.x = Math.sin(this.time * 3.2) * 0.22 * decay;
    }

    // ambient scares
    this.idleT -= dt;
    if (this.idleT <= 0) {
      this.idleT = 40 + Math.random() * 50;
      const r = Math.random();
      if (r < 0.3) C.audio.doorSlam();
      else if (r < 0.55) C.audio.whisper();
      else if (r < 0.8) {
        // footsteps on the floor above
        let i = 0;
        const step = () => {
          if (i++ > 5) return;
          C.audio.footstep(false, 'first');
          setTimeout(step, 420);
        };
        step();
      } else {
        C.fx.fearTarget = 0.25;
        setTimeout(() => (C.fx.fearTarget = 0), 2500);
      }
    }

    // finale: the lady takes her place on the landing
    if (!this.finaleActive && C.game.readyToAccuse() && !C.game.won) {
      this.finaleActive = true;
      C.fx.showGhost(30, 2.1, 31.9, 0, 0.6);
      C.audio.ghostChord(0.2);
      C.audio.bell();
      C.ui.toast('The candles all lean, as one, toward the grand staircase.');
      C.ui.objectiveFlash('She is waiting on the landing of the grand staircase. Tell her the truth.');
      // interactable presence
      C.interactions.add(C.fx.ghost, () => 'speak the truth to the lady of the house',
        () => C.ui.openAccuse());
    }
    if (this.finaleActive && !C.game.won) {
      // she stays; keep a faint presence
      C.fx.ghostTargetAlpha = Math.max(C.fx.ghostTargetAlpha, 0.55);
      const d = Math.hypot(p.x - 30, p.z - 32);
      C.audio.heartbeat(d < 8);
      C.fx.fearTarget = Math.max(C.fx.fearTarget, d < 8 ? 0.35 : 0.12);
    }
  }

  onAccused(correct) {
    const C = this.ctx;
    if (correct) {
      C.game.won = true;
      C.audio.heartbeat(false);
      C.fx.fearTarget = 0;
      C.audio.dawn();
      C.fx.hideGhost();
    } else {
      C.audio.thunder(1);
      C.fx.fearTarget = 0.85;
      C.ui.toast('The cold deepens. That is not the truth — and she knows it. The house keeps its evidence; look again.');
      setTimeout(() => (C.fx.fearTarget = 0.12), 4000);
    }
  }
}
