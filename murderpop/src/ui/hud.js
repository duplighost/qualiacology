// The fight HUD: minimal and honest. Her name and bar top centre (lost health lingers, then drains; gold
// notches crack when broken), your hearts bottom left (they shatter when lost), the spotlight meter under
// them, score and combo small in the top right. No words that explain anything.

const HEART = '<svg viewBox="0 0 32 30"><path d="M16 29 C6 21 1 15.5 1 9.5 C1 4.8 4.8 1 9.4 1 C12.3 1 14.7 2.6 16 5 C17.3 2.6 19.7 1 22.6 1 C27.2 1 31 4.8 31 9.5 C31 15.5 26 21 16 29 Z"/></svg>';

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
      <div class="mp-banner"></div>`;
    this.el = {
      boss: root.querySelector('.mp-boss'), name: root.querySelector('.mp-boss-name'), fill: root.querySelector('.mp-bar-fill'), ghost: root.querySelector('.mp-bar-ghost'),
      notches: root.querySelector('.mp-notches'), hearts: root.querySelector('.mp-hearts'), meter: root.querySelector('.mp-meter'), meterFill: root.querySelector('.mp-meter-fill'),
      score: root.querySelector('.mp-score-n'), combo: root.querySelector('.mp-combo'), comboN: root.querySelector('.mp-combo-n'), pops: root.querySelector('.mp-pops'), banner: root.querySelector('.mp-banner'),
    };
    this.ghostK = 1; this.shownK = 1; this.ghostHold = 0; this.lastHearts = -1; this.shownScore = 0;
  }

  setBoss(name, notches) {
    this.el.name.textContent = name;
    this.el.notches.innerHTML = notches.map((n, i) => `<i data-i="${i}" style="left:${n * 100}%"></i>`).join('');
    this.ghostK = this.shownK = 1;
    this.el.boss.classList.remove('mp-empty', 'mp-gone');
  }
  setHearts(n, max) {
    if (this.el.hearts.children.length !== max) this.el.hearts.innerHTML = Array.from({ length: max }, () => `<b class="mp-heart">${HEART}</b>`).join('');
    const hs = this.el.hearts.children;
    for (let i = 0; i < max; i++) hs[i].classList.toggle('lost', i >= n);
    if (this.lastHearts > n && n >= 0) { const h = hs[n]; if (h) { h.classList.remove('break'); void h.offsetWidth; h.classList.add('break'); } }
    if (this.lastHearts >= 0 && n > this.lastHearts) { const h = hs[n - 1]; if (h) { h.classList.remove('gain'); void h.offsetWidth; h.classList.add('gain'); } }
    this.lastHearts = n;
  }
  breakNotch(i) { const n = this.el.notches.querySelector(`[data-i="${i}"]`); if (n) n.classList.add('broken'); this.el.boss.classList.remove('mp-shake'); void this.el.boss.offsetWidth; this.el.boss.classList.add('mp-shake'); }
  restoreNotches(broken) { this.el.notches.querySelectorAll('i').forEach((n, i) => n.classList.toggle('broken', i < broken)); }

  pop(text, x, y, cls = '') {
    const d = document.createElement('div'); d.className = 'mp-pop ' + cls; d.textContent = text;
    d.style.left = (x * 100) + '%'; d.style.top = (y * 100) + '%';
    this.el.pops.appendChild(d); setTimeout(() => d.remove(), 900);
  }
  banner(text, cls = '', ms = 1600) {
    const b = this.el.banner; b.textContent = text; b.className = 'mp-banner show ' + cls;
    clearTimeout(this._bt); this._bt = setTimeout(() => { b.className = 'mp-banner'; }, ms);
  }
  show(on) { this.root.classList.toggle('mp-hidden', !on); }

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
