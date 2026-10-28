// The few words on screen: the song's shape across the top (where you are in it,
// and how much of it you lit), speed, the title, the end of a song.

const $ = (s) => document.querySelector(s);
// a new multiplier slamming in; Groovy's button coming up, and flaring as it goes on
const SLAM = [{ transform: 'scale(2.1)', filter: 'brightness(2.6)' }, { transform: 'scale(.92)', filter: 'brightness(1.4)', offset: 0.45 }, { transform: 'scale(1)', filter: 'brightness(1)' }];
const GR_IN = [{ opacity: 0, transform: 'translateY(-8px) scale(.7)' }, { opacity: 1, transform: 'translateY(0) scale(1.12)', offset: 0.55 }, { opacity: 1, transform: 'none' }];
const GR_GO = [{ transform: 'scale(1.5)', filter: 'brightness(2.4)' }, { transform: 'none', filter: 'none' }];
const KIND_COLOR = ['#8a7aa8', '#b78bd6', '#ff9ec9', '#ff5fa2', '#ff7fbf', '#7fd8ff', '#ffffff', '#ff3d8b', '#8a7aa8', '#5cffa8'];

export class Hud {
  constructor() {
    this.bar = $('#songbar'); this.shape = $('#shape'); this.title = $('#title'); this.speed = $('#speed');
    this.results = $('#results'); this.load = $('#loading');
    this.jw = $('#judge .word'); this.js = $('#judge .streak'); this.gems = $('#gems'); this.gemN = $('#gems .n'); this.gemIcon = $('#gems .icon');
    this.g = this.shape.getContext('2d');
    this.lit = null;
    this.scoreEl = $('#score'); this.scoreN = $('#score .n'); this.pops = $('#pops');
    this.comboEl = $('#combo'); this.comboM = $('#combo .m'); this.comboMx = $('#combo .mx'); this.comboN = $('#combo .ct b'); this.pips = [...document.querySelectorAll('#combo .pips i')];
    this.target = 0; this.shown = 0; this.multNow = 1; this.streakNow = -1;
  }

  // the points, top right, rolling up to what you have
  score(points) { this.target = points; }
  // a new multiplier: it slams in
  mult(m) { this._mult(m, true); }
  _mult(m, loud) {
    // (Groovy over with the run still going, x8 back to x4, isn't a fall)
    const settle = this.multNow === 8 && m === 4;
    const up = m > this.multNow, fell = m < this.multNow && this.multNow >= 2 && !settle;
    this.multNow = m;
    this.comboM.textContent = String(m);
    this.comboEl.classList.toggle('m2', m === 2); this.comboEl.classList.toggle('m3', m === 3); this.comboEl.classList.toggle('m4', m >= 4); this.comboEl.classList.toggle('m8', m >= 8);
    if (loud && up) {
      this.comboMx.getAnimations().forEach((a) => a.cancel());
      this.comboMx.animate(SLAM, { duration: 560, easing: 'cubic-bezier(.2,1.4,.4,1)' });
    } else if (loud && fell) {
      // the run broken: the multiplier drops off its perch, red, and climbs back as a x1
      this.comboMx.getAnimations().forEach((a) => a.cancel());
      this.comboMx.animate([{ transform: 'translateY(0) rotate(0)', color: '#ff6b7a', opacity: 1 }, { transform: 'translateY(12px) rotate(-10deg)', color: '#ff6b7a', opacity: 0.35, offset: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'ease-out' });
    }
  }
  // the points just won: the score kicks
  bump(k = 1) {
    const el = this.scoreEl;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate([{ transform: `scale(${(1 + 0.07 * k).toFixed(3)})`, filter: 'brightness(1.6)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 240, easing: 'ease-out' });
  }
  // the run of pumps in time: how many, and the pips to the next multiplier (eight a step; past x4,
  // to Groovy being ready again)
  combo(streak, how = '', arm = 24) {
    if (streak === this.streakNow && !how) return;
    const was = this.streakNow;
    this.streakNow = streak;
    this.comboN.textContent = String(streak);
    const toNext = streak >= 24 ? 8 - Math.max(0, Math.min(8, arm - streak)) : streak % 8;
    this.pips.forEach((p, i) => p.classList.toggle('on', i < toNext));
    this.comboEl.classList.toggle('maxed', streak >= 24 && toNext === 8);
    this.comboEl.classList.toggle('live', streak > 0);
    if (how === 'break' && was >= 3) {
      this.comboEl.getAnimations().forEach((a) => a.cancel());
      this.comboEl.animate([{ transform: 'translateX(0)', color: '#ff6b7a' }, { transform: 'translateX(-7px)', offset: 0.15 }, { transform: 'translateX(6px)', offset: 0.35 }, { transform: 'translateX(-4px)', offset: 0.55 }, { transform: 'translateX(0)', color: '#ff6b7a', offset: 0.75 }, { transform: 'translateX(0)', color: '#ffffff' }], { duration: 620, easing: 'ease-out' });
    } else if (how === 'hit' && streak > was) {
      this.comboN.getAnimations().forEach((a) => a.cancel());
      this.comboN.animate([{ transform: 'scale(1.45)', filter: 'brightness(1.8)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 260, easing: 'ease-out' });
      const p = this.pips[toNext - 1];
      if (p && (streak < 25 || arm >= streak)) p.animate([{ transform: 'scaleY(1.9)', filter: 'brightness(2.4)' }, { transform: 'scaleY(1)', filter: 'brightness(1)' }], { duration: 300, easing: 'ease-out' });
    }
  }
  // what a trick or a gap was worth, rising off her, with its name
  points(p, obj, camera, label = '', small = false) {
    if (!p || !obj) return;
    const w = obj.getWorldPosition ? obj.getWorldPosition(new (obj.position.constructor)()) : null;
    if (!w) return;
    w.y += 2.9; w.project(camera);
    const el = document.createElement('div');
    el.className = 'pop' + (small ? ' small' : '');
    el.innerHTML = (label ? `<span class="nm">${label}</span>` : '') + '<span class="pv">+' + p.toLocaleString('en-US') + '</span>';
    const W = window.innerWidth, m = Math.min(90, W * 0.24);
    el.style.left = Math.max(m, Math.min(W - m, (w.x * 0.5 + 0.5) * W)).toFixed(0) + 'px';
    el.style.top = ((-w.y * 0.5 + 0.5) * window.innerHeight - 40).toFixed(0) + 'px';
    this.pops.appendChild(el);
    el.animate([{ opacity: 0, transform: 'translate(-50%, 6px) scale(0.8)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1.08)', offset: 0.18 }, { opacity: 0, transform: 'translate(-50%, -34px) scale(1)' }], { duration: 1100, easing: 'ease-out' }).onfinish = () => el.remove();
  }

  loading(p) { this.load.textContent = p >= 1 ? '' : 'LOADING ' + Math.round(p * 100); }

  // the ring under the steering thumb on a touchscreen: where it landed, and how far it's pushed
  thumb(f) {
    const el = this.thumbEl || (this.thumbEl = document.getElementById('thumb'));
    if (!el) return;
    if (!f) { if (this._thumbOn) { el.classList.remove('on'); this._thumbOn = false; } return; }
    // (the knob reaches the ring's edge where the push reaches full lock: 180 px, input.js)
    const dx = Math.max(-40, Math.min(40, (f.x - f.x0) * (40 / 180)));
    el.style.transform = `translate(${f.x0.toFixed(0)}px, ${f.y0.toFixed(0)}px)`;
    el.firstElementChild.style.transform = `translate(${dx.toFixed(0)}px, 0)`;
    if (!this._thumbOn) { el.classList.add('on'); this._thumbOn = true; }
  }

  showTitle(song, info = {}) {
    this.warmGroovy();
    this.title.classList.remove('off');
    this.title.querySelector('.song').textContent = song.title;
    this.title.querySelector('.num').textContent = String((info.index ?? 0) + 1).padStart(2, '0');
    this.title.querySelector('.best').innerHTML = info.best ? 'BEST <b>' + info.best.toLocaleString('en-US') + '</b>' + (info.grade ? ' &nbsp;&middot;&nbsp; <b>' + info.grade + '</b>' : '') : '';
    this.bar.classList.remove('on'); this.speed.classList.remove('on'); this.gems.classList.remove('on'); this.scoreEl.classList.remove('on'); this.comboEl.classList.remove('on');
    this.results.classList.remove('on'); this.results.innerHTML = '';
  }

  hideAll() {
    this.groovy(null);
    this.title.classList.add('off');
    this.bar.classList.remove('on'); this.speed.classList.remove('on'); this.gems.classList.remove('on'); this.scoreEl.classList.remove('on'); this.comboEl.classList.remove('on');
    this.results.classList.remove('on'); this.results.innerHTML = '';
  }

  start(course) {
    this.title.classList.add('off');
    this.bar.classList.add('on'); this.speed.classList.add('on'); this.gems.classList.add('on'); this.scoreEl.classList.add('on'); this.comboEl.classList.add('on');
    this.gemN.textContent = '0';
    this.target = 0; this.shown = 0; this.multNow = 0; this._mult(1, false); this.scoreN.textContent = '0';
    this.streakNow = -1; this.armNow = 24; this.combo(0); this.groovy(null);
    this.course = course;
    this.lit = new Float32Array(240).fill(-1);
    // the bars' heights and parts never change: worked out once a song, drawn again only when one
    // lights up (it redrew all 240 from the course every frame); the marker is its own element
    const N = 240; this.barE = new Float32Array(N); this.barK = new Uint8Array(N);
    for (let i = 0; i < N; i++) { const tt = (i / (N - 1)) * course.duration; this.barE[i] = course.sample(tt).energy; this.barK[i] = course.kind[Math.floor((tt - course.t0) * 120)] || 0; }
    this._barDirty = true; this._spd = -1;
    this.markEl = this.markEl || this.bar.querySelector('.mark');
  }

  frame(rider, course) {
    if (!this.lit) return;
    if (this._wh === undefined || (this._whT = (this._whT || 0) + 1) % 30 === 0) { this._wh = [this.shape.clientWidth, this.shape.clientHeight]; }
    const [W, H] = this._wh, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.shape.width !== Math.round(W * dpr)) { this.shape.width = Math.round(W * dpr); this.shape.height = Math.round(H * dpr); this._barDirty = true; }
    const N = this.lit.length, dur = course.duration;
    const t = rider.t, pos = Math.max(0, Math.min(1, t / dur));
    const k = Math.floor(pos * (N - 1));
    if (k >= 0 && this.lit[k] < 0) { this.lit[k] = rider.flow; this._barDirty = true; }
    if (this._barDirty) {
      this._barDirty = false;
      const g = this.g;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        const h = 2 + this.barE[i] * (H - 4);
        const x = (i / N) * W, w = W / N + 0.5;
        const lit = this.lit[i];
        if (lit >= 0) { g.fillStyle = KIND_COLOR[this.barK[i]]; g.globalAlpha = 0.35 + 0.65 * lit; }
        else { g.fillStyle = '#ffffff'; g.globalAlpha = 0.16; }
        g.fillRect(x, (H - h) / 2, w, h);
      }
      g.globalAlpha = 1;
    }
    if (this.markEl) this.markEl.style.transform = `translateX(${(pos * W).toFixed(1)}px)`;
    const spd = Math.round(rider.v * 3.6);
    if (spd !== this._spd) { this._spd = spd; this.speed.textContent = spd + ' KM/H'; }
    this.target = rider.score.points;
    if (this.shown !== this.target) {
      this.shown += Math.max(1, Math.ceil((this.target - this.shown) * 0.18));
      if (this.shown > this.target) this.shown = this.target;
      this.scoreN.textContent = this.shown.toLocaleString('en-US');
    }
    if (rider.score.mult !== this.multNow) this._mult(rider.score.mult, true);
    if (rider.streak !== this.streakNow || rider.groovyArm !== this.armNow) { this.armNow = rider.groovyArm; this.combo(rider.streak, rider.streak > this.streakNow ? 'hit' : rider.streak < this.streakNow ? 'break' : 'arm', rider.groovyArm); }
    this.groovy(rider);
  }

  // Groovy's look drawn once where nobody sees it (at 2%) while she waits on the start line: the
  // first time Chrome draws its rainbow words and glows it builds their shaders, 100-180 ms of
  // stall that landed on the moment the button came up or was pressed (27 Oct 2026)
  warmGroovy() {
    if (this._warmed) return;
    this._warmed = true;
    const g = this.grEl || (this.grEl = $('#groovy')), c = this.comboEl;
    g.classList.add('ready', 'on', 'warm'); c.classList.add('m8', 'groovy', 'warm');
    // (and what they do coming up, going on and at x8, one after another)
    g.animate(GR_IN, { duration: 200 });
    setTimeout(() => { g.animate(GR_GO, { duration: 200 }); this.comboMx.animate(SLAM, { duration: 300 }); }, 220);
    // (then back to what's true: a ride's next frame puts Groovy's own classes back)
    setTimeout(() => { g.classList.remove('ready', 'on', 'warm'); c.classList.remove('groovy', 'warm'); c.classList.toggle('m8', this.multNow >= 8); this._grSt = undefined; }, 700);
  }

  // Groovy: its button when it's yours to press, then how long the trip has left
  groovy(r) {
    const el = this.grEl || (this.grEl = $('#groovy'));
    if (!el) return;
    const st = r && r.groovyOn ? (r.groovyX2 ? 'on' : 'on broke') : r && r.groovyReady ? 'ready' : '';
    if (st !== this._grSt) {
      const was = this._grSt || '';
      this._grSt = st;
      el.className = st;
      this.comboEl.classList.toggle('groovy', !!(r && r.groovyOn));
      if (st === 'ready') el.animate(GR_IN, { duration: 420, easing: 'cubic-bezier(.2,1.4,.4,1)' });
      else if (st === 'on' && was === 'ready') el.animate(GR_GO, { duration: 500, easing: 'ease-out' });
    }
    if (r && r.groovyOn) {
      const left = Math.max(0, Math.min(1, (r.groovyEnd - r.t) / Math.max(0.1, r.groovyEnd - r.groovyT0)));
      const q = Math.round(left * 200);
      if (q !== this._grQ) { this._grQ = q; el.style.setProperty('--left', (q / 200).toFixed(3)); }
    }
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

  // the word for a pump, the moment you let go, and what it was worth under it
  judge(grade, streak, points = 0) {
    const w = this.jw;
    w.className = 'word ' + grade;
    w.textContent = { perfect: 'PERFECT', good: 'GOOD', early: 'EARLY', late: 'LATE', miss: 'MISS' }[grade] || '';
    const big = grade === 'perfect';
    w.getAnimations().forEach((a) => a.cancel());
    w.animate([{ opacity: 1, transform: `scale(${big ? 1.5 : 1.15})` }, { opacity: 1, transform: 'scale(1)', offset: 0.16 }, { opacity: 0, transform: 'scale(0.96)' }], { duration: big ? 640 : 480, easing: 'ease-out' });
    const s = this.js;
    s.getAnimations().forEach((a) => a.cancel());
    if (points > 0 && (big || grade === 'good')) {
      s.textContent = '+' + points.toLocaleString('en-US');
      s.animate([{ opacity: 1, transform: 'translateY(6px) scale(1.25)' }, { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.2 }, { opacity: 0, transform: 'translateY(-12px) scale(1)' }], { duration: 700, easing: 'ease-out' });
    } else s.textContent = '';
  }

  // ndc position of the rider's head: the judgment floats there, smoothed so it doesn't jitter
  placeJudge(x, y) {
    const el = this.jEl || (this.jEl = document.querySelector('#judge'));
    // (kept clear of the screen's edges: on a narrow screen the word ran off the side with her)
    const W = window.innerWidth, m = Math.min(150, W * 0.36);
    const px = Math.max(m, Math.min(W - m, (x * 0.5 + 0.5) * W)), py = (-y * 0.5 + 0.5) * window.innerHeight;
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
    this.groovy(null);
    this.bar.classList.remove('on'); this.speed.classList.remove('on'); this.gems.classList.remove('on');
  }
}
