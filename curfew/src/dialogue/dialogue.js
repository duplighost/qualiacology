// CURFEW — DIALOGUE. The Eleven rewire.
//
// ONE SYSTEM OWNS EVERY SPOKEN LINE IN THE COUNTY. Before this, three half-systems did it:
// the Holdfast's own conversation card, world-stories' caption, and the keepers playing wavs
// straight out of their own file. They could talk over each other, they had no notion of
// priority, and a line that mattered could be buried under a resident saying hello.
//
// THE CONTRACT. An NPC file, a companion or a set piece REQUESTS a line by id and is done
// with it. It never decodes, never schedules, never writes to the DOM, never decides who
// wins. This file owns the queue, the one subtitle element, overlap, interruption and
// resumption, distance and audibility, the one-time memory and the moving anchors.
//
// THE NO-WORDS LAW. The subtitle is display:none whenever nothing is being said, and while
// paused, dead, or not playing. tests/progression.mjs walks the DOM during play and a
// caption that lingers is a failure, not a feature.
//
// A MISSING WAV IS NOT AN ERROR. Most of the catalogue has no audio on purpose (lines.js
// says why). A line with no file, or whose file is not on disk, shows its subtitle for its
// reading time and logs once. Nothing here may ever throw into a fixed step: mechanics.js
// loads its wavs with a throw on a missing file and that pattern is not copied here.

import { LINES, readingTime } from './lines.js';

// How far a world speaker carries by default, and where a line gives up when the speaker
// walks away mid-sentence. The radio and the car are exempt: you are inside them.
const DEFAULT_AUDIBLE_R = 24;
const ABANDON_R = 30;
const FADE_S = 0.35;

export class Dialogue {
  static id = 'dialogue';

  constructor(ctx) {
    this.ctx = ctx;
    this.queue = [];          // pending {line, id, opts}, highest priority first
    this.active = null;       // the one line being spoken
    this.time = 0;
    this._buffers = new Map();  // file name -> AudioBuffer (or null once known missing)
    this._loading = new Map();  // file name -> Promise
    this._warned = new Set();
    this._cool = new Map();     // line id -> the time it may be said again
    this._offs = [];
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    if (typeof document !== 'undefined') {
      this.el = document.createElement('section');
      this.el.id = 'dialogue-subtitle';
      this.el.setAttribute('aria-live', 'polite');
      // The Holdfast card's look, because that is the one the county already speaks in.
      this.el.style.cssText = 'position:fixed;left:50%;bottom:10%;transform:translateX(-50%);'
        + 'width:min(650px,76vw);padding:20px 26px;color:#e3e1db;'
        + 'background:linear-gradient(110deg,rgba(13,17,27,.96),rgba(20,24,33,.93));'
        + 'border:1px solid #76798b66;border-left:3px solid #b7b0d0;box-shadow:0 18px 70px #0008;'
        + 'border-radius:3px;font:17px/1.6 Georgia,serif;z-index:22;display:none;pointer-events:none';
      this.whoEl = document.createElement('div');
      this.whoEl.style.cssText = 'font:11px/1.4 system-ui;letter-spacing:.17em;text-transform:uppercase;'
        + 'color:#b8b3d0;margin-bottom:9px';
      this.textEl = document.createElement('div');
      this.el.append(this.whoEl, this.textEl);
      document.body.append(this.el);
    }
    // A load wipes the one-time memory's owner, so drop anything in flight with it.
    this._offs.push(this.ctx.bus.on('save:loaded', () => { this._hardStop(); this._cool.clear(); }));
    this._offs.push(this.ctx.bus.on('player:died', () => this._hardStop()));
  }

  ready() { return typeof document === 'undefined' || !!this.el; }

  /* ------------------------------------------------------------------ the door -- */

  /**
   * SAY A LINE. `idOrSpec` is a catalogue id, or an ad-hoc line object of the same shape for
   * text that is authored somewhere else and is not going to be recorded (the Holdfast's
   * resident stories are the only ones of those). Returns true when it was accepted.
   *
   * opts:
   *   speakerEntity   a body with .pos; the anchor follows it every step
   *   x, y, z         a fixed world point
   *   anchor          'radio' | 'car' — non-positional, always audible
   *   name            override the eyebrow (a resident's own name)
   */
  say(idOrSpec, opts = {}) {
    const id = typeof idOrSpec === 'string' ? idOrSpec : (idOrSpec && idOrSpec.id) || '';
    const line = typeof idOrSpec === 'string' ? LINES[idOrSpec] : idOrSpec;
    if (!line || !line.text) return false;

    const pr = this._sys('progress');
    if (line.once && id && pr?.saidOnce?.(id)) return false;
    if (id && (this._cool.get(id) || 0) > this.time) return false;
    if (typeof line.when === 'function') { try { if (!line.when(this.ctx)) return false; } catch (e) { void e; return false; } }

    // AUDIBILITY IS A GATE, NOT A VOLUME. A line spoken sixty metres away did not happen: it
    // must not be queued, or it plays when you happen to walk back into range a minute later.
    const at = this._anchorOf(opts);
    if (at.positional) {
      const p = this._sys('player');
      const r = line.audibleR || DEFAULT_AUDIBLE_R;
      if (p?.pos && Math.hypot(p.pos.x - at.x, p.pos.z - at.z) > r) return false;
    }

    const item = { id, line, opts, at, priority: line.priority || 3 };

    // A higher priority takes the floor from an interruptible line. An equal or lower one
    // waits its turn, and the queue stays short: two waiting lines is a conversation, five
    // is a backlog nobody will listen to.
    if (this.active) {
      if (item.priority > this.active.priority && this.active.line.interrupt !== false) {
        this._cut(this.active);
      } else if (item.priority <= this.active.priority) {
        this.queue.push(item);
        this.queue.sort((a, b) => b.priority - a.priority);
        if (this.queue.length > 4) this.queue.length = 4;
        return true;
      }
    }
    this._begin(item);
    return true;
  }

  /** Say these ids one after another. Each carries the same anchor. */
  conversation(ids, opts = {}) {
    if (!Array.isArray(ids) || !ids.length) return false;
    const ok = this.say(ids[0], opts);
    this._chain = ids.slice(1);
    this._chainOpts = opts;
    return ok;
  }

  /** Shut this speaker up now. Danger cuts chatter; this is how. */
  stop(speaker) {
    if (this.active && (!speaker || this.active.line.speaker === speaker)) this._cut(this.active, true);
    if (speaker) this.queue = this.queue.filter(q => q.line.speaker !== speaker);
    else this.queue.length = 0;
  }

  active_() { return this.active; }
  /** The id being spoken, or ''. */
  activeId() { return this.active ? this.active.id : ''; }
  speaking() { return !!this.active; }

  /* ------------------------------------------------------------------ internals -- */

  _anchorOf(opts) {
    if (opts.anchor === 'radio' || opts.anchor === 'car') {
      return { positional: false, anchor: opts.anchor, x: 0, y: 0, z: 0 };
    }
    if (opts.speakerEntity) {
      const e = opts.speakerEntity;
      return { positional: true, entity: e, x: e.pos.x, y: e.pos.y + 1.55, z: e.pos.z };
    }
    if (Number.isFinite(opts.x)) {
      return { positional: true, x: opts.x, y: Number.isFinite(opts.y) ? opts.y : 1.5, z: opts.z };
    }
    // No anchor at all: a note, a card, the county talking to itself. Non-positional.
    return { positional: false, x: 0, y: 0, z: 0 };
  }

  _begin(item) {
    this.active = item;
    item.t = 0;
    item.dur = item.line.durS || readingTime(item.line.text);
    item.voice = null;
    item.src = null;
    const pr = this._sys('progress');
    if (item.line.once && item.id) pr?.markSaid?.(item.id);
    if (item.id && item.line.cooldownS) this._cool.set(item.id, this.time + item.line.cooldownS);
    this._paint(item);
    this.ctx.bus.emit('dialogue:start', { id: item.id, speaker: item.line.speaker });
    if (item.line.file) this._playFile(item);
  }

  /**
   * CUT. Stop the audio — and only ours: the voice pool reclaims voices, so the source node
   * we booked has to still be the one in the slot before we touch it. `resume` decides
   * whether the chain this line was part of survives being interrupted.
   */
  _cut(item, abandon = false) {
    if (item.voice && item.src && item.voice.src === item.src) {
      try { item.src.stop(); } catch (e) { void e; }
    }
    const next = (!abandon && item.line.resume && item.line.next) ? item.line.next : null;
    this.ctx.bus.emit('dialogue:end', { id: item.id, cut: true });
    this.active = null;
    if (abandon) { this._chain = null; return; }
    // Only a line that EXISTS goes back on the queue: a chain naming a missing id must end
    // quietly, not put an undefined on the queue for _begin to read a duration off.
    if (next && LINES[next]) this.queue.unshift({ id: next, line: LINES[next], opts: item.opts,
      at: item.at, priority: LINES[next].priority || 3 });
  }

  _hardStop() {
    if (this.active) this._cut(this.active, true);
    this.queue.length = 0;
    this._chain = null;
    if (this.el) this.el.style.display = 'none';
  }

  _paint(item) {
    if (!this.el) return;
    this.whoEl.textContent = item.opts.name || item.line.speaker || '';
    this.whoEl.style.display = this.whoEl.textContent ? '' : 'none';
    this.textEl.textContent = item.line.text;
    this.el.style.display = 'block';
  }

  /* --------------------------------------------------------------------- audio -- */

  async _playFile(item) {
    const a = this._sys('audio');
    const name = item.line.file;
    if (!a || !a.enabled || a.silent || !a.actx || typeof a.spec !== 'function') return;
    let buf = this._buffers.get(name);
    if (buf === undefined) {
      if (!this._loading.has(name)) this._loading.set(name, this._load(name, a));
      buf = await this._loading.get(name);
    }
    // The line may have finished or been cut while the fetch was in flight.
    if (!buf || this.active !== item) return;
    const s = a.spec();
    if (item.at.positional) {
      s.x = item.at.x; s.y = item.at.y; s.z = item.at.z;
      s.bus = 'world'; s.gain = 0.86; s.ref = 14; s.roll = 1.1; s.maxDist = 60;
      s.occl = true; s.air = true; s.send = 0.07; s.priority = 1;
    } else {
      // A radio or a car speaker: in the room with you, and coloured like a speaker rather
      // than like a mouth, so a voice out of a box never sounds like somebody standing there.
      s.x = null; s.bus = 'world'; s.gain = 0.80;
      s.air = false; s.occl = false; s.filterHz = 1200; s.toneDb = 3; s.send = 0.09; s.priority = 1;
    }
    const v = a.playBuf(buf, s);
    if (!v) return;
    item.voice = v;
    item.src = v.src;
    // The audio, not the reading time, is the length of a line that has audio.
    item.dur = Math.max(item.dur, buf.duration + 0.25);
  }

  async _load(name, a) {
    try {
      const res = await fetch(new URL('../../assets/voices/' + name, import.meta.url));
      if (!res.ok) throw new Error(res.status + '');
      const bytes = await res.arrayBuffer();
      const buf = await a.actx.decodeAudioData(bytes);
      this._buffers.set(name, buf);
      return buf;
    } catch (e) {
      // ONCE. Most of the catalogue has no wav yet on purpose and a console full of this
      // would hide something that actually matters.
      if (!this._warned.has(name)) {
        this._warned.add(name);
        console.info('dialogue: no recording for ' + name + ' — subtitle only (' + e.message + ')');
      }
      this._buffers.set(name, null);
      return null;
    }
  }

  /* ---------------------------------------------------------------------- step -- */

  step(dt) {
    this.time += dt;
    const paused = this.ctx.paused || !this.ctx.playing;
    const p = this._sys('player');
    if (this.el) {
      // Hidden whenever nothing is being said, and whenever the game is not being played.
      const show = !!this.active && !paused && !(p && p.dead);
      this.el.style.display = show ? 'block' : 'none';
    }
    if (paused || !this.active) { if (!this.active && !paused) this._next(); return; }

    const item = this.active;
    item.t += dt;

    // A MOVING SPEAKER. Write the pan every step, but only while the voice we booked is still
    // ours: the pool hands slots on and writing to somebody else's voice moves their sound.
    if (item.at.entity && item.voice && item.src && item.voice.src === item.src) {
      const e = item.at.entity;
      item.at.x = e.pos.x; item.at.y = e.pos.y + 1.55; item.at.z = e.pos.z;
      const pan = item.voice.pan;
      if (pan && pan.positionX) {
        pan.positionX.value = item.at.x; pan.positionY.value = item.at.y; pan.positionZ.value = item.at.z;
      }
    }

    // A speaker who walks off mid-sentence gives up rather than shouting across a field.
    if (item.at.positional && p?.pos
        && Math.hypot(p.pos.x - item.at.x, p.pos.z - item.at.z) > ABANDON_R) {
      this._cut(item, true);
      return;
    }

    if (item.t < item.dur + FADE_S) return;
    this.ctx.bus.emit('dialogue:end', { id: item.id, cut: false });
    this.active = null;
    // The line's own follow-up comes first; an explicit conversation() list comes after.
    if (item.line.next && LINES[item.line.next]) {
      this.say(item.line.next, item.opts);
      return;
    }
    this._next();
  }

  _next() {
    if (this.active) return;
    if (this._chain && this._chain.length) {
      const id = this._chain.shift();
      if (!this._chain.length) this._chain = null;
      if (this.say(id, this._chainOpts || {})) return;
    }
    const item = this.queue.shift();
    if (item && item.line) this._begin(item);
  }

  state() {
    return {
      active: this.active ? this.active.id || this.active.line.speaker : '',
      queued: this.queue.length,
      visible: !!(this.el && this.el.style.display === 'block'),
      recordings: this._buffers.size,
      // SECONDS LEFT ON THE LINE BEING SAID, or -1 when nothing is. A caller that has to act
      // ON a line rather than AFTER it needs this: `dialogue:end` fires at dur + FADE_S, and
      // for a line with a recording `dur` is already the audio plus 0.25 s of pad — so the
      // event lands 0.6 s after the last sample. world/garage-opening.js puts the shutter up
      // on the last WORD of the opening message, which is that 0.6 s earlier.
      remaining: this.active ? Math.max(0, this.active.dur + FADE_S - this.active.t) : -1,
    };
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    this._hardStop();
    this.el?.remove();
    this._buffers.clear();
    this._loading.clear();
  }
}

export default Dialogue;
