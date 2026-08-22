/* Persistence. Small, forgiving, and never a reason for the game to crash. */

export class Save {
  constructor(key, defaults) {
    this.key = key;
    this.defaults = defaults;
    this.data = this.load();
    this._pending = null;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return structuredClone(this.defaults);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(this.defaults), ...parsed };
    } catch (e) {
      return structuredClone(this.defaults);
    }
  }

  /* Coalesce writes: gameplay can call set() every frame without cost. */
  set(patch) {
    Object.assign(this.data, patch);
    if (this._pending) return;
    this._pending = setTimeout(() => { this._pending = null; this.flush(); }, 400);
  }

  flush() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* private mode */ }
  }

  best(field, value) {
    if (!(field in this.data) || value > this.data[field]) { this.set({ [field]: value }); return true; }
    return false;
  }

  wipe() {
    this.data = structuredClone(this.defaults);
    try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ }
  }
}
