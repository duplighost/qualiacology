// The few words on screen: the song's shape across the top (where you are in it,
// and how much of it you lit), speed, the title, the end of a song.

const $ = (s) => document.querySelector(s);
const KIND_COLOR = ['#8a7aa8', '#b78bd6', '#ff9ec9', '#ff5fa2', '#ff7fbf', '#7fd8ff', '#ffffff', '#ff3d8b', '#8a7aa8', '#5cffa8'];

export class Hud {
  constructor() {
    this.bar = $('#songbar'); this.shape = $('#shape'); this.title = $('#title'); this.speed = $('#speed');
    this.results = $('#results'); this.load = $('#loading');
    this.jw = $('#judge .word'); this.js = $('#judge .streak'); this.gems = $('#gems'); this.gemN = $('#gems .n'); this.gemIcon = $('#gems .icon');
    this.g = this.shape.getContext('2d');
    this.lit = null;
    this.scoreEl = $('#score'); this.scoreN = $('#score .n'); this.scoreX = $('#score .x'); this.pops = $('#pops');
    this.target = 0; this.shown = 0; this.multNow = 1;
  }

  // the points, top right, rolling up to what you have; the multiplier beside them
  score(points, mult) {
    this.target = points;
    if (mult !== this.multNow) { this.multNow = mult; this.scoreX.textContent = mult > 1 ? '×' + mult : ''; this.scoreEl.classList.toggle('hot', mult >= 4); }
  }
  // a new multiplier: it jumps
  mult(m) {
    this.score(this.target, m);
    this.scoreX.getAnimations().forEach((a) => a.cancel());
    this.scoreX.animate([{ transform: 'scale(1.9)', filter: 'brightness(2.2)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 520, easing: 'cubic-bezier(.2,1.6,.4,1)' });
  }
  // what a trick or a gap was worth, rising off her
  points(p, obj, camera) {
    if (!p || !obj) return;
    const v = this._pv || (this._pv = { x: 0, y: 0, z: 0 });
    const w = obj.getWorldPosition ? obj.getWorldPosition(new (obj.position.constructor)()) : null;
    if (!w) return;
    w.y += 2.9; w.project(camera);
    const el = document.createElement('div');
    el.className = 'pop'; el.textContent = '+' + p;
    el.style.left = ((w.x * 0.5 + 0.5) * window.innerWidth).toFixed(0) + 'px';
    el.style.top = ((-w.y * 0.5 + 0.5) * window.innerHeight - 40).toFixed(0) + 'px';
    this.pops.appendChild(el);
    el.animate([{ opacity: 0, transform: 'translate(-50%, 6px) scale(0.8)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1.08)', offset: 0.18 }, { opacity: 0, transform: 'translate(-50%, -34px) scale(1)' }], { duration: 1100, easing: 'ease-out' }).onfinish = () => el.remove();
  }

  loading(p) { this.load.textContent = p >= 1 ? '' : 'LOADING ' + Math.round(p * 100); }

  showTitle(song, info = {}) {
    this.title.classList.remove('off');
    this.title.querySelector('.song').textContent = song.title;
    this.title.querySelector('.num').textContent = String((info.index ?? 0) + 1).padStart(2, '0');
    this.title.querySelector('.best').textContent = info.best ? 'BEST ' + (info.best / 1000).toFixed(2) + ' KM' : '';
    this.bar.classList.remove('on'); this.speed.classList.remove('on'); this.gems.classList.remove('on'); this.scoreEl.classList.remove('on');
    this.results.classList.remove('on'); this.results.innerHTML = '';
  }

  hideAll() {
    this.title.classList.add('off');
    this.bar.classList.remove('on'); this.speed.classList.remove('on'); this.gems.classList.remove('on'); this.scoreEl.classList.remove('on');
    this.results.classList.remove('on'); this.results.innerHTML = '';
  }

  start(course) {
    this.title.classList.add('off');
    this.bar.classList.add('on'); this.speed.classList.add('on'); this.gems.classList.add('on'); this.scoreEl.classList.add('on');
    this.gemN.textContent = '0';
    this.target = 0; this.shown = 0; this.multNow = 0; this.score(0, 1); this.scoreN.textContent = '0';
    this.course = course;
    this.lit = new Float32Array(240).fill(-1);
  }

  frame(rider, course) {
    if (!this.lit) return;
    const W = this.shape.clientWidth, H = this.shape.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.shape.width !== W * dpr) { this.shape.width = W * dpr; this.shape.height = H * dpr; }
    const g = this.g, N = this.lit.length, dur = course.duration;
    const t = rider.t, pos = Math.max(0, Math.min(1, t / dur));
    const k = Math.floor(pos * (N - 1));
    if (k >= 0 && this.lit[k] < 0) this.lit[k] = rider.flow;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < N; i++) {
      const tt = (i / (N - 1)) * dur;
      const e = course.sample(tt).energy;
      const h = 2 + e * (H - 4);
      const x = (i / N) * W, w = W / N + 0.5;
      const lit = this.lit[i];
      const kind = course.kind[Math.floor((tt - course.t0) * 120)] || 0;
      if (lit >= 0) {
        g.fillStyle = KIND_COLOR[kind];
        g.globalAlpha = 0.35 + 0.65 * lit;
      } else {
        g.fillStyle = '#ffffff'; g.globalAlpha = 0.16;
      }
      g.fillRect(x, (H - h) / 2, w, h);
    }
    g.globalAlpha = 1; g.fillStyle = '#ffffff';
    g.fillRect(pos * W - 1, 0, 2, H);
    this.speed.textContent = Math.round(rider.v * 3.6) + ' KM/H';
    this.target = rider.score.points;
    if (this.shown !== this.target) {
      this.shown += Math.max(1, Math.ceil((this.target - this.shown) * 0.18));
      if (this.shown > this.target) this.shown = this.target;
      this.scoreN.textContent = this.shown.toLocaleString('en-US');
    }
    if (rider.score.mult !== this.multNow) this.score(this.target, rider.score.mult);
  }

  // back from a pause: the beats left before she moves again
  count(n) {
    if (n === this._count) return;
    this._count = n;
    const el = this.countEl || (this.countEl = document.querySelector('#count'));
    if (!el) return;
    el.getAnimations().forEach((a) => a.cancel());
    if (!n) { el.textContent = ''; return; }
    el.textContent = String(n);
    el.animate([{ opacity: 0.95, transform: 'translate(-50%, -50%) scale(1.25)' }, { opacity: 0.85, transform: 'translate(-50%, -50%) scale(1)', offset: 0.3 }, { opacity: 0.25, transform: 'translate(-50%, -50%) scale(0.96)' }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
  }

  // the word for a pump, the moment you let go
  judge(grade, streak) {
    const w = this.jw;
    w.className = 'word ' + grade;
    w.textContent = { perfect: 'PERFECT', good: 'GOOD', early: 'EARLY', late: 'LATE', miss: 'MISS' }[grade] || '';
    const big = grade === 'perfect';
    w.getAnimations().forEach((a) => a.cancel());
    w.animate([{ opacity: 1, transform: `scale(${big ? 1.35 : 1.15})` }, { opacity: 1, transform: 'scale(1)', offset: 0.18 }, { opacity: 0, transform: 'scale(0.96)' }], { duration: big ? 620 : 480, easing: 'ease-out' });
    const s = this.js;
    s.getAnimations().forEach((a) => a.cancel());
    if (streak >= 2 && (grade === 'perfect' || grade === 'good')) {
      s.textContent = '×' + streak;
      s.animate([{ opacity: 0.95, transform: 'translateY(-3px)' }, { opacity: 0.95, transform: 'translateY(0)', offset: 0.25 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
    }
  }

  // ndc position of the rider's head: the judgment floats there, smoothed so it doesn't jitter
  placeJudge(x, y) {
    const el = this.jEl || (this.jEl = document.querySelector('#judge'));
    const px = (x * 0.5 + 0.5) * window.innerWidth, py = (-y * 0.5 + 0.5) * window.innerHeight;
    this.jx = this.jx === undefined ? px : this.jx + (px - this.jx) * 0.25;
    this.jy = this.jy === undefined ? py : this.jy + (py - this.jy) * 0.25;
    el.style.transform = `translate(${(this.jx - window.innerWidth / 2).toFixed(1)}px, ${Math.max(40, this.jy - 70).toFixed(1)}px)`;
  }

  // the counter's icon: the song's own pickup (a diamond if it has none)
  setCollect(kind) {
    if (this._kind) this.gems.classList.remove(this._kind);
    this._kind = kind && kind !== 'diamond' ? kind : null;
    if (this._kind) this.gems.classList.add(this._kind);
  }

  gem(n) {
    this.gemN.textContent = String(n);
    this.gemIcon.getAnimations().forEach((a) => a.cancel());
    this.gemIcon.animate([{ transform: 'scale(1.8)', filter: 'brightness(2)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 260, easing: 'ease-out' });
  }

  showResults(song, stats, best, onAgain) {
    const inTime = stats.valleys ? Math.round(100 * stats.good / stats.valleys) : 0;
    const km = (stats.dist / 1000).toFixed(2);
    const row = (a, b) => `<div style="display:flex;justify-content:space-between;gap:48px;font-size:13px;letter-spacing:.14em;margin:7px 0"><span style="opacity:.55">${a}</span><span>${b}</span></div>`;
    this.results.innerHTML = `
      <div style="font-size:12px;letter-spacing:.4em;opacity:.6;margin-bottom:14px">${song.title.toUpperCase()}</div>
      <div style="font-size:54px;font-weight:700;letter-spacing:.04em;margin-bottom:22px">${km} KM</div>
      <div style="min-width:280px">
        ${row('IN TIME', inTime + '%')}
        ${row('TOP SPEED', Math.round(stats.top * 3.6) + ' KM/H')}
        ${row('NOTES', stats.notes + ' / ' + stats.notesTotal)}
        ${row('CLEAN LANDINGS', stats.clean)}
        ${best ? row('BEST', (best / 1000).toFixed(2) + ' KM') : ''}
      </div>
      <div style="margin-top:34px;font-size:12px;letter-spacing:.2em;opacity:.5">SPACE TO GO AGAIN${onAgain ? '&nbsp;&nbsp;&nbsp;&#9656; NEXT SONG' : ''}</div>`;
    this.results.classList.add('on');
    this.bar.classList.remove('on'); this.speed.classList.remove('on'); this.gems.classList.remove('on');
  }
}
