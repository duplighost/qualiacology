// B5 — PTSDream Girl — PTSDREAM GIRL. Count to four.
// Your life three years later, built as a music-video set on a soundstage: rooms fly in and out on cables, her
// flickers are the cuts. Her big moves tick four times and land on the next beat; her perfume grenade is pink:
// catch it on four and it goes off on her. The song is the clock (its bar line is one beat before the beat file's).
import * as THREE from 'three';
import { CharacterKit } from '../../engine/character.js';
import { Boss } from '../../game/boss.js';
import { buildGirl } from './girl.js';
import { Her, clamp } from './her.js';
import { Sounds } from './sounds.js';
import { buildSet } from './set.js';
import { choreography, SECTIONS, sectionPose } from './script.js';
import { death, Kill } from './death.js';

const HP = 3350;
let kit = null;

export default {
  id: 'ptsdream-girl', beats: 'ptsdream-girl', par: 120000, lastHit: 257.88,
  // the song's bar line is three beats into the beat file. Said here, so the fight has it before it measures the
  // song's drums against the grid (set later, in buildArena, the accents sat three beats early and on the off-beats)
  downbeat: 3,
  spawn: { player: [-9.4, 3.2, Math.PI / 2], boss: [0, -7.7, 0] },

  async buildArena(f) {
    f.bm.downbeat = 3;
    this.f = f;
    this.snd = new Sounds(f); this.snd.init();
    this.set = await buildSet(f, this);
    this.wrecked = false; this.baseExpr = 'smug'; this._inited = false; this.log = []; this.kill = null;
    const set = this.set;
    return {
      arena: set.arena, bounds: set.bounds, room: set.room,
      resolve: (x, z, r) => set.resolve(x, z, r),
      strikeArc: (x, z, ang, range, arc, s, ff) => set.strikeArc(x, z, ang, range, arc, s, ff),
      update: (dt, t, ff) => set.update(dt, t, ff),
      dispose: () => { this.kill && this.kill.reset(); set.dispose(); },
    };
  },

  async buildBoss(f) {
    if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
    const { fig, extra } = await buildGirl(kit, f);
    f.scene.add(fig.root);
    this.extra = extra;
    const b = new Boss({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'PTSDREAM GIRL', hp: HP, radius: 0.6, pieces: ['skirtHem', 'hair', 'forearm_l'] });
    b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop');
    b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Sprint_Loop';
    b.faceTarget = f.player;
    b.behaveOpts = { r: 5.5, rMin: 4, rMax: 7, speed: 1.6, dir: 1 };
    fig.setExpression('smug', { fade: 0.01 });
    try { await fig.prepare(f.app.renderer, f.cam.cam, f.scene); } catch (e) { console.warn('ptsd figurine prepare', e.message); }
    this.her = new Her(f, this);
    this.kill = new Kill(f, this);       // her death scene's things (death.js)
    this.set.addCasters && this.set.addCasters(f.player.root, fig.root);
    try { this.set.warm([...this.her.warmObjects(), ...(extra && extra.warmObjects ? extra.warmObjects() : [])], fig); } catch (e) { console.warn('ptsd warm-up', e.message); }
    return b;
  },

  script(T, f) {
    f.bm.downbeat = 3;
    for (const s of SECTIONS) T.section(s.name, s.from, s.to, s.opts || {});
    choreography(T, f, this);
  },

  // ---------------------------------------------------------------- the song's hooks
  onStart(f) { this.setupAt(f, 0); },
  // put the fight in the state the song says for time t (a rewind, ?at=, a new play)
  setupAt(f, t) {
    this._inited = true;
    const b = f.boss;
    this.her.reset();
    this.kill && this.kill.reset();
    this.snd.stopQueued();
    this.set.setStateAt(t);
    b.arena = f.arena;
    this.wrecked = b.state === 'desperate';
    if (b.fig) b.fig.setExpression(this.wrecked ? 'smug' : 'smug', { fade: 0.01 });
    // the hair and the arm follow the breaks she had at the checkpoint
    if (this.extra) { if (b.broken >= 2) { if (!this.extra.hairGone) { this.extra.hairGone = true; for (const h of this.extra.hair) h.visible = false; } } else this.extra.restoreHair(); if (b.broken >= 3) this.extra.breakArm(true); else this.extra.restoreArm(); }
    const p = sectionPose(t, f);
    b.behave = p.behave || 'hold';
    b.idle = p.idle || 'Idle_Talking_Loop';
    if (b.rig) b.loop(b.idleClip);
    this.her.slapOn = !!p.slap;
    if (p.her) b.place(p.her[0], p.her[1], p.face ?? Math.atan2(f.player.x - p.her[0], f.player.z - p.her[1]));
    this.her.hide(!!p.hidden);
    b.root.position.y = 0;
    if (p.gone) { b.state = 'gone'; } else if (b.state === 'gone') b.state = b.hp <= 0 ? 'desperate' : 'perform';
    this.hudBoss(t >= 3.76 || t > 0.5);
  },
  onRewind(f, t) { this.setupAt(f, t); },
  onSection(f, sec, prev) { this.set.onSection && this.set.onSection(sec, prev); },
  onBreak(f, i) {
    const b = f.boss, her = this.her;
    // a two-beat stagger, the piece falls and shatters, she touches the broken place and nods
    if (i === 1 && this.extra) this.extra.breakHair();
    if (i === 2 && this.extra) this.extra.breakArm();
    her.expr('fury', f.t, f.beat * 1.2);
    b.perform('Idle_Shield_Break', { duration: f.beat * 2, then: 'idle' });
    f.at(f.t + f.beat * 2, () => { if (b.state === 'perform') her.act('Interact', f.t + 0.3, { contact: 0.4, dur: 0.7 }); });
    f.at(f.t + f.beat * 3.6, () => { if (b.state === 'perform') her.act('Yes', f.t + 0.25, { contact: 0.3, dur: 0.9 }); });
    this.snd.play('glassburst', { x: b.x, gain: 0.45 });   // under the fight's own break crash, not on top of it
    this.log.push(['break', i, +f.t.toFixed(2)]);
  },
  onEmpty(f) {
    // harmless from this frame: everything of hers turns to glitter; wrecked, limping, still performing
    this.wrecked = true;
    this.her.glitterAll();
    const b = f.boss;
    b.walkClip = 'Zombie_Walk_Fwd_Loop';
    if (b.fig) b.fig.setExpression('smug', { fade: 0.4 });
    b.perform('Idle_Shield_Break', { duration: f.beat * 2, then: 'idle' });
    this.set.wrecked && this.set.wrecked(f.t);
    // (the pin and the last count are her death scene's: it takes them up wherever in the last bars her bar empties)
    this.log.push(['empty', +f.t.toFixed(2)]);
  },
  onFinish(f) { this.set.finish && this.set.finish(f.t); this.log.push(['finish', +f.t.toFixed(2)]); },
  onEncore(f) { this.her.reset(); this.log.push(['encore', +f.t.toFixed(2)]); },
  onSpotlight(f, on) { this.set.spotlight && this.set.spotlight(on); },
  update(f, dt) {
    // a start part-way in (?at=, practice) gets no start or rewind hook: set up on the first frame. Rewinds and
    // encores come through onRewind
    if (!this._inited) this.setupAt(f, f.t);
    if (f.state === 'dying' && !this._dying) { this._dying = true; this.snd.stopQueued(); this.log.push(['death', +f.t.toFixed(2)]); }
    if (f.state !== 'dying' && f.state !== 'rewinding') this._dying = false;
    // what hurt YOU (for the tests)
    const hz = f.player.hearts; if (this._hz !== undefined && hz < this._hz && f.state === 'play') this.log.push(['hurt', +f.t.toFixed(2), f.player.lastHitBy, hz]); this._hz = hz;
    this.her.update(dt);
    this.kill && this.kill.update(dt);
    // wrecked: the cracked bottle at her chest trails a thin pink mist (in her death scene the bottle's in her hand)
    if (this.wrecked && !(this.kill && this.kill.on) && f.boss.state !== 'finished' && (this._mist = (this._mist || 0) + dt) > 0.12) { this._mist = 0; const b = f.boss; f.fx.glitter(b.x + Math.sin(b.facing) * 0.25, 1.75, b.z + Math.cos(b.facing) * 0.25, new THREE.Color(2.6, 0.5, 1.2), 2, 0.25); }
    this.extra && this.extra.update(dt);
    this.snd.update();
    // her things are solid: her shots stop at them (the island is cover, so is the bathroom door)
    for (const p of f.proj.list) {
      if (p.owner !== 'boss' || p.dead) continue;
      if (this.set.blocks(p.x, p.z, p.radius * 0.6)) { p.dead = true; f.fx.sparks(p.x, p.y, p.z, new THREE.Color(2, 2, 2.2), 4); p.onBlocked && p.onBlocked(p); }
    }
  },
  // the boss bar fades in when her reflection first shows in the mirror
  hudBoss(on) { const el = this.f && this.f.hud && this.f.hud.el && this.f.hud.el.boss; if (el) { el.style.transition = 'opacity 1.2s'; el.style.opacity = on ? '' : '0'; } },
  // a grenade's landing spot: inside the stage, clear of solid props
  death,
  safeSpot(x, z, m) { const p = this.set.clearOf(clamp(x, -10.2, 10.2), clamp(z, -6.2, 6.2), m); return p; },
};
