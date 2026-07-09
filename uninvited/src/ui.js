// On-screen overlays for UNINVITED: the interaction prompt + reticle, the room
// caption, family speech (subtitle), the player's inner voice (monologue — its
// own channel, styled to read as a thought), and the black arrest end-card.
const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.modal = null;           // 'ending' | null
    this.onModalChange = null;   // (open) => {}
    this._toastT = null;
    this._subT = null;
    this._monoT = null;
    this.touch = false;          // set by main.js when a touch device is detected
  }

  /* ---------- HUD ---------- */
  prompt(inter) {
    const el = $('prompt');
    const ch = $('crosshair');
    if (!inter) { el.innerHTML = ''; ch.classList.remove('active'); return; }
    const text = typeof inter.prompt === 'function' ? inter.prompt() : inter.prompt;
    const key = this.touch ? '<span class="key tap">TAP</span>' : '<span class="key">E</span>';
    el.innerHTML = `${key}${text}`;
    ch.classList.add('active');
  }

  hud(roomName) { $('roomname').textContent = roomName || ''; }

  toast(text, ms = 5200) {
    const el = $('toast');
    el.textContent = text;
    el.style.opacity = 1;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { el.style.opacity = 0; }, ms);
  }
  objectiveFlash(text) { this.toast(text, 6000); }

  // family speech — a caption near the bottom, with the speaker's name
  say(name, text, ms = 5000) {
    const el = $('subtitle');
    el.innerHTML = `<span class="who">${name}</span>${text}`;
    el.style.opacity = 1;
    clearTimeout(this._subT);
    this._subT = setTimeout(() => { el.style.opacity = 0; }, ms);
  }

  // the player's own thought — distinct look, its own fade channel
  monologue(text, ms = 5200) {
    const el = $('monologue');
    el.textContent = text;
    el.style.opacity = 1;
    clearTimeout(this._monoT);
    this._monoT = setTimeout(() => { el.style.opacity = 0; }, ms);
  }

  /* ---------- modal ---------- */
  setModal(name) {
    this.modal = name;
    $('ending').classList.toggle('hidden', name !== 'ending');
    if (this.onModalChange) this.onModalChange(!!name);
  }

  // full-screen text card (the arrest, then the newspaper coda)
  showEnding(text) {
    this.setModal('ending');
    const el = $('endingTxt');
    el.textContent = text;
    el.style.opacity = 0;
    requestAnimationFrame(() => { el.style.opacity = 1; });
  }
  swapEnding(text) {
    const el = $('endingTxt');
    el.style.opacity = 0;
    setTimeout(() => { el.textContent = text; el.style.opacity = 1; }, 2600);
  }
}
