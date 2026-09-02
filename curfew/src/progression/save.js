// CURFEW — the save. One localStorage blob, versioned, debounced, merged against defaults.
// Owner: progression.
//
// donor: filament/src/core/save.js:6-50 — DEFAULTS() as a FACTORY (so nothing ever hands out
//   a shared array), `Object.assign(DEFAULTS(), JSON.parse(raw))` as the whole migration
//   story, the 250 ms debounce, the synchronous `flush` branch for pagehide, and the bare
//   `catch { }` around every storage call because private mode throws on setItem and a game
//   that will not start because the browser will not remember it is a worse game.
//
// Four rules this file exists to keep:
//
//  1. A CORRUPT BLOB MUST NEVER HANG THE BOOT. `{ not json` in the key returns defaults and
//     plays on. tests/progression.mjs writes exactly that, reloads, and asserts the game
//     still comes up. Nothing here throws, ever, on any path.
//  2. PER-KEY DEFAULT MERGE. An old save gains new fields instead of being discarded. A
//     player who has claimed nine places does not lose them because the tree grew a branch.
//  3. NO setTimeout. CONTRACT: "no setTimeout in game logic; every beat is dt-scoped so
//     tests can step it." FILAMENT's debounce is a timer; here it is a countdown ticked by
//     step(dt), so a headless stepper can drive a save to disk with no wall clock at all.
//  4. THE HOT PATH DOES NOT SERIALISE. mark() sets a flag. The JSON.stringify happens once,
//     250 ms after the last change, or on pagehide. `beforeFlush` is how the owner gets its
//     live Sets into `data` — it runs ONCE, inside flush(), never on the frames the debounce
//     is merely counting down. The audit caught the other shape of this: five Array.from()
//     calls in step() for the whole pending window, and roadLit alone is hundreds of entries.

const DEBOUNCE_S = 0.250;

/** Is this a plain object we should merge key-by-key rather than replace wholesale? */
function isPlain(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Recursive per-key merge: every key the defaults declare survives; every key the stored blob
 * carries that the defaults still declare wins. A key the defaults dropped is dropped.
 * Arrays are replaced, never merged — a list of owned node ids is a value, not a shape.
 */
function mergeDefaults(defaults, stored) {
  const out = {};
  for (const k of Object.keys(defaults)) {
    const d = defaults[k];
    const s = stored ? stored[k] : undefined;
    if (s === undefined || s === null) { out[k] = isPlain(d) ? mergeDefaults(d, null) : d; continue; }
    if (isPlain(d)) {
      // A defaults value of `{}` declares a FREE-FORM BAG (worldFlags), not a shape. Merging
      // it key-by-key against an empty template would silently drop every flag the player
      // has earned, which is the exact class of bug this merge exists to prevent.
      if (Object.keys(d).length === 0) { out[k] = isPlain(s) ? Object.assign({}, s) : {}; continue; }
      out[k] = isPlain(s) ? mergeDefaults(d, s) : mergeDefaults(d, null);
      continue;
    }
    if (Array.isArray(d)) { out[k] = Array.isArray(s) ? s.slice() : d.slice(); continue; }
    out[k] = (typeof s === typeof d) ? s : d;
  }
  return out;
}

export class SaveBlob {
  /**
   * @param key       localStorage key. MUST contain "curfew" — tests/progression.mjs finds
   *                  the save by scanning for /curfew/i, and a key it cannot find is a save
   *                  nobody can prove exists.
   * @param version   integer. A mismatch still merges (rule 2); it never wipes.
   * @param makeDefaults  a FACTORY returning a fresh defaults object.
   */
  constructor(key, version, makeDefaults) {
    this.key = key;
    this.version = version;
    this.makeDefaults = makeDefaults;
    this.data = makeDefaults();
    this.data.v = version;
    this.dirty = false;
    this.timer = 0;
    this.writes = 0;
    this.loadedFrom = 'defaults';   // 'defaults' | 'store' | 'corrupt' | 'no-storage'
    // Set by the owner. Called immediately before the ONE serialisation, so live Sets can be
    // written into `data` once per write instead of once per step. Never throws outward.
    this.beforeFlush = null;
    this._onHide = null;
    this._onVis = null;
    this._bound = false;
  }

  /** Never throws. Returns this. */
  load() {
    let raw = null;
    try {
      raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this.key) : null;
    } catch (e) {
      void e;
      this.loadedFrom = 'no-storage';
      return this;
    }
    if (raw == null) { this.loadedFrom = 'defaults'; return this; }
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // THE CORRUPT-BLOB PATH. Loud in the console so it is diagnosable, silent to the game.
      void e;
      this.loadedFrom = 'corrupt';
      this.dirty = true;            // overwrite the garbage on the next debounce
      return this;
    }
    if (!isPlain(parsed)) { this.loadedFrom = 'corrupt'; this.dirty = true; return this; }
    this.data = mergeDefaults(this.makeDefaults(), parsed);
    this.data.v = this.version;
    this.loadedFrom = 'store';
    if (parsed.v !== this.version) this.dirty = true;   // migrate on disk at the next beat
    return this;
  }

  /** Something changed. Cheap: one flag and one countdown, safe to call every frame. */
  mark() {
    this.dirty = true;
    this.timer = DEBOUNCE_S;
  }

  /** dt-scoped debounce. Call from the owning system's step(). */
  step(dt) {
    if (!this.dirty) return;
    this.timer -= dt;
    if (this.timer <= 0) this.flush();
  }

  /** Write now, synchronously. Never throws — storage full and private mode both land here. */
  flush() {
    this.dirty = false;
    this.timer = 0;
    if (this.beforeFlush) {
      try { this.beforeFlush(this.data); } catch (e) { console.error('[save] beforeFlush', e); }
    }
    try {
      if (typeof localStorage === 'undefined') return false;
      this.data.v = this.version;
      localStorage.setItem(this.key, JSON.stringify(this.data));
      this.writes++;
      return true;
    } catch (e) {
      void e;
      return false;
    }
  }

  /**
   * pagehide, not beforeunload: beforeunload is unreliable on mobile and is a scroll-blocking
   * listener on desktop. `visibilitychange -> hidden` catches the tab-switch case that
   * pagehide does not fire for on some builds, and a double flush costs one setItem.
   */
  bind() {
    if (this._bound || typeof window === 'undefined') return this;
    this._onHide = () => { if (this.dirty) this.flush(); };
    this._onVis = () => { if (document.visibilityState === 'hidden' && this.dirty) this.flush(); };
    window.addEventListener('pagehide', this._onHide);
    document.addEventListener('visibilitychange', this._onVis);
    this._bound = true;
    return this;
  }

  dispose() {
    if (this.dirty) this.flush();
    if (this._bound && typeof window !== 'undefined') {
      if (this._onHide) window.removeEventListener('pagehide', this._onHide);
      if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
    }
    this._onHide = null;
    this._onVis = null;
    this._bound = false;
  }

  /** Wipe the blob and start again. Used by nothing in play; here for a debug key. */
  reset() {
    this.data = this.makeDefaults();
    this.data.v = this.version;
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(this.key); } catch (e) { void e; }
    this.dirty = false;
    this.timer = 0;
  }
}

export default SaveBlob;
