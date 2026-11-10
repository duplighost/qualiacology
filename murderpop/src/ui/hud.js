// The fight HUD: minimal and honest. Her name and bar top centre (lost health lingers, then drains; gold
// notches crack when broken), your hearts bottom left (they shatter when lost), the spotlight meter under
// them, score small in the top right, your combo big at the bottom (its multiplier is what everything's worth),
// the finale's points under her bar once it's empty, and a Q over YOU's head when the spotlight is yours to take.

const HEART_PATH = '<path d="M16 29 C6 21 1 15.5 1 9.5 C1 4.8 4.8 1 9.4 1 C12.3 1 14.7 2.6 16 5 C17.3 2.6 19.7 1 22.6 1 C27.2 1 31 4.8 31 9.5 C31 15.5 26 21 16 29 Z"/>';
// a heart is its empty shape with the pink on top: half a heart shows the pink on its left half
const HEART = `<svg class="h-bg" viewBox="0 0 32 30">${HEART_PATH}</svg><svg class="h-fg" viewBox="0 0 32 30">${HEART_PATH}</svg>`;

// the four presses, drawn: a mouse with the button lit, or a key
const MOUSE = (side) => `<svg viewBox="0 0 64 88"><rect x="4" y="4" width="56" height="80" rx="28" fill="rgba(12,6,10,.82)" stroke="#f7efe4" stroke-width="3"/><path d="${side === 'L' ? 'M32 6 C17 6 6 17 6 32 V40 H32 Z' : 'M32 6 C47 6 58 17 58 32 V40 H32 Z'}" fill="#f2c25b"/><path d="M32 6 V40 M6 40 H58" stroke="#f7efe4" stroke-width="3" fill="none"/></svg>`;
const CAP = (t) => `<span class="mp-cap">${t}</span>`;
const KEY_ART = { mouse: { strike: MOUSE('L'), parry: MOUSE('R'), jump: CAP('SPACE'), dash: CAP('SHIFT') }, keys: { strike: CAP('J'), parry: CAP('K'), jump: CAP('I'), dash: CAP('L') } };

export class HUD {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div class="mp-boss">
        <div class="mp-boss-name"></div>
        <div class="mp-bar"><div class="mp-bar-ghost"></div><div class="mp-bar-fill"></div><div class="mp-bar-shine"></div><div class="mp-notches"></div></div>
      </div>
      <div class="mp-you">
        <div class="mp-hearts"></div>
        <div class="mp-meter"><div class="mp-meter-fill"></div><span class="mp-key">Q</span></div>
      </div>
      <div class="mp-score"><div class="mp-score-n">0</div><div class="mp-combo"><span class="mp-combo-x">×</span><span class="mp-combo-n">1</span></div></div>
      <div class="mp-pops"></div>
      <div class="mp-chain"><b class="mp-chain-n">0</b><i class="mp-chain-x">×1</i></div>
      <div class="mp-bonus"><b class="mp-bonus-n">0</b><i class="mp-bonus-x">×1</i><i class="mp-bonus-k">×2</i></div>
      <div class="mp-keycap">Q</div>
      <div class="mp-hint"></div>
      <div class="mp-qte"><div class="mp-qte-ring"></div><div class="mp-qte-key"></div><div class="mp-qte-dots"></div></div>
      <div class="mp-banner"></div>`;
    this.el = {
      boss: root.querySelector('.mp-boss'), name: root.querySelector('.mp-boss-name'), fill: root.querySelector('.mp-bar-fill'), ghost: root.querySelector('.mp-bar-ghost'),
      notches: root.querySelector('.mp-notches'), hearts: root.querySelector('.mp-hearts'), meter: root.querySelector('.mp-meter'), meterFill: root.querySelector('.mp-meter-fill'),
      score: root.querySelector('.mp-score-n'), combo: root.querySelector('.mp-combo'), comboN: root.querySelector('.mp-combo-n'), pops: root.querySelector('.mp-pops'), banner: root.querySelector('.mp-banner'),
      chain: root.querySelector('.mp-chain'), chainN: root.querySelector('.mp-chain-n'), chainX: root.querySelector('.mp-chain-x'),
      bonus: root.querySelector('.mp-bonus'), bonusN: root.querySelector('.mp-bonus-n'), bonusX: root.querySelector('.mp-bonus-x'), key: root.querySelector('.mp-keycap'),
      hint: root.querySelector('.mp-hint'),
      qte: root.querySelector('.mp-qte'), qteRing: root.querySelector('.mp-qte-ring'), qteKey: root.querySelector('.mp-qte-key'), qteDots: root.querySelector('.mp-qte-dots'),
    };
    this._chain = 0; this._mult = 1; this._bonus = 0;
    this.ghostK = 1; this.shownK = 1; this.ghostHold = 0; this.lastHearts = -1; this.shownScore = 0;
  }

  setBoss(name, notches) {
    this.el.name.textContent = name;
    this.el.notches.innerHTML = notches.map((n, i) => `<i data-i="${i}" style="left:${n * 100}%"></i>`).join('');
    this.ghostK = this.shownK = 1;
    this.el.boss.classList.remove('mp-empty', 'mp-gone');
  }
  // hearts in halves: a hit takes half of one
  setHearts(n, max) {
    if (this.el.hearts.children.length !== max) this.el.hearts.innerHTML = Array.from({ length: max }, () => `<b class="mp-heart">${HEART}</b>`).join('');
    const hs = this.el.hearts.children;
    for (let i = 0; i < max; i++) { const k = n - i; hs[i].classList.toggle('lost', k <= 0.01); hs[i].classList.toggle('half', k > 0.01 && k < 0.99); }
    const at = (v) => hs[Math.max(0, Math.ceil(v - 0.01) - 1)];
    if (this.lastHearts > n + 0.01 && n >= 0) { const h = at(this.lastHearts); if (h) { h.classList.remove('break'); void h.offsetWidth; h.classList.add('break'); } }
    if (this.lastHearts >= 0 && n > this.lastHearts + 0.01) { const h = at(n); if (h) { h.classList.remove('gain'); void h.offsetWidth; h.classList.add('gain'); } }
    this.lastHearts = n;
  }
  breakNotch(i) { const n = this.el.notches.querySelector(`[data-i="${i}"]`); if (n) n.classList.add('broken'); this.el.boss.classList.remove('mp-shake'); void this.el.boss.offsetWidth; this.el.boss.classList.add('mp-shake'); }
  restoreNotches(broken) { this.el.notches.querySelectorAll('i').forEach((n, i) => n.classList.toggle('broken', i < broken)); }

  pop(text, x, y, cls = '') {
    const d = document.createElement('div'); d.className = 'mp-pop ' + cls; d.textContent = text;
    d.style.left = (x * 100) + '%'; d.style.top = (y * 100) + '%';
    this.el.pops.appendChild(d); setTimeout(() => d.remove(), /huge/.test(cls) ? 1600 : 900);
  }
  banner(text, cls = '', ms = 1600) {
    const b = this.el.banner; b.textContent = text; b.className = 'mp-banner show ' + cls;
    clearTimeout(this._bt); this._bt = setTimeout(() => { b.className = 'mp-banner'; }, ms);
  }
  show(on) { this.root.classList.toggle('mp-hidden', !on); }

  // your combo: shown from 3; it pops when its multiplier goes up, and falls apart when you're hit
  chain(n, mult) {
    const el = this.el;
    if (n !== this._chain) {
      if (n < this._chain && this._chain >= 5) { el.chain.classList.remove('broke'); void el.chain.offsetWidth; el.chain.classList.add('broke'); }
      if (n >= 3) { el.chainN.textContent = String(n); el.chain.classList.remove('broke'); }
      this._chain = n;
    }
    if (mult !== this._mult) { if (mult > this._mult) { el.chain.classList.remove('up'); void el.chain.offsetWidth; el.chain.classList.add('up'); } el.chainX.textContent = '\u00d7' + mult; this._mult = mult; }
    el.chain.classList.toggle('on', n >= 3 || el.chain.classList.contains('broke')); el.chain.classList.toggle('hot', mult >= 4);
  }
  // the finale: its points, its multiplier, and the keepsake's x2 once YOU has it
  finale(on, bank, mult, kept, move = 0) {
    const el = this.el;
    el.bonus.classList.toggle('on', on);
    if (!on) { this._bonus = 0; return; }
    if (move !== this._bonusMove) { el.bonus.classList.remove('up', 'down'); if (move) { void el.bonus.offsetWidth; el.bonus.classList.add(move > 0 ? 'up' : 'down'); } this._bonusMove = move; }
    this._bonus += (bank - this._bonus) * 0.25; if (Math.abs(bank - this._bonus) < 1) this._bonus = bank;
    el.bonusN.textContent = Math.round(this._bonus).toLocaleString('en-US');
    el.bonusX.textContent = '\u00d7' + mult;
    el.bonus.classList.toggle('kept', kept > 1);
  }
  // her death scene's press: which of the four it is, big, with its ring closing on it (k: 1 far, 0 now)
  // p: null | { key: 'strike' | 'parry' | 'jump' | 'dash', k, state: 'wait' | 'hit' | 'miss', n, of, dev: 'mouse' | 'keys', last }
  qte(p) {
    const el = this.el.qte; if (!el) return;
    if (!p) { if (this._qteOn) { el.className = 'mp-qte'; this._qteOn = false; this._qteKey = ''; } return;  }
    this._qteOn = true;
    const id = p.key + p.dev;
    if (id !== this._qteKey) { this._qteKey = id; this.el.qteKey.innerHTML = KEY_ART[p.dev === 'keys' ? 'keys' : 'mouse'][p.key] || ''; }
    el.className = 'mp-qte on ' + p.state + (p.last ? ' last' : '') + ' k-' + p.key;
    this.el.qteRing.style.transform = `translate(-50%, -50%) scale(${(1 + 1.9 * p.k).toFixed(3)})`;
    this.el.qteRing.style.opacity = String(Math.min(1, 0.25 + (1 - p.k) * 1.1));
    if (p.of && this._qteOf !== p.of + ':' + p.n) { this._qteOf = p.of + ':' + p.n; this.el.qteDots.innerHTML = Array.from({ length: p.of }, (_, i) => `<i class="${i < p.n ? 'done' : i === p.n ? 'now' : ''}"></i>`).join(''); }
  }
  // a button, small, over one of you: the one that answers what's happening (the first few times it happens)
  // p: null | { key: 'strike' | 'parry' | 'jump' | 'dash', x, y, pulse, dev }
  hint(p) {
    const el = this.el.hint; if (!el) return;
    if (!p) { if (this._hintOn) { el.classList.remove('on'); this._hintOn = false; } return; }
    const id = p.key + (p.dev || 'mouse');
    if (id !== this._hintKey) { this._hintKey = id; el.innerHTML = KEY_ART[p.dev === 'keys' ? 'keys' : 'mouse'][p.key] || ''; }
    el.classList.add('on'); this._hintOn = true;
    el.style.left = (p.x * 100) + '%'; el.style.top = (p.y * 100) + '%'; el.style.setProperty('--pulse', String(p.pulse || 0));
  }
  // the key, over YOU's head (x, y: 0..1 of the screen)
  keycap(on, x = 0.5, y = 0.5, pulse = 0) {
    const k = this.el.key; k.classList.toggle('on', on);
    if (on) { k.style.left = (x * 100) + '%'; k.style.top = (y * 100) + '%'; k.style.setProperty('--pulse', String(pulse)); }
  }

  update(dt, { hpK, empty, hearts, maxHearts, meter, spot, score, mult, beatPulse }) {
    // bar: fill snaps, the ghost waits a moment then drains
    if (hpK < this.shownK - 1e-4) this.ghostHold = 0.45;
    this.shownK = hpK;
    if (this.ghostHold > 0) this.ghostHold -= dt; else this.ghostK += (this.shownK - this.ghostK) * Math.min(1, dt * 5);
    if (this.ghostK < this.shownK) this.ghostK = this.shownK;
    this.el.fill.style.transform = `scaleX(${Math.max(0, hpK)})`;
    this.el.ghost.style.transform = `scaleX(${Math.max(0, this.ghostK)})`;
    this.el.boss.classList.toggle('mp-empty', !!empty);
    this.setHearts(hearts, maxHearts);
    this.el.meterFill.style.transform = `scaleX(${Math.min(1, meter)})`;
    this.el.meter.classList.toggle('full', meter >= 1);
    this.el.meter.classList.toggle('spot', !!spot);
    if (meter >= 1) this.el.meter.style.setProperty('--pulse', String(beatPulse || 0));
    this.shownScore += (score - this.shownScore) * Math.min(1, dt * 12);
    this.el.score.textContent = Math.round(this.shownScore).toLocaleString('en-US');
    this.el.comboN.textContent = String(mult);
    this.el.combo.classList.toggle('hot', mult >= 4);
  }
}
