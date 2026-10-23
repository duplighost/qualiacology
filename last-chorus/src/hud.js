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
  }

  loading(p) { this.load.textContent = p >= 1 ? '' : 'LOADING ' + Math.round(p * 100); }

  showTitle(song, info = {}) {
    this.title.classList.remove('off');
    this.title.querySelector('.song').textContent = song.title;
    this.title.querySelector('.num').textContent = String((info.index ?? 0) + 1).padStart(2, '0');
    this.title.querySelector('.best').textContent = info.best ? 'BEST ' + (info.best / 1000).toFixed(2) + ' KM' : '';
    this.bar.classList.remove('on'); this.speed.classList.remove('on'); this.gems.classList.remove('on');
    this.results.classList.remove('on'); this.results.innerHTML = '';
  }

  hideAll() {
    this.title.classList.add('off');
    this.bar.classList.remove('on'); this.speed.classList.remove('on'); this.gems.classList.remove('on');
    this.results.classList.remove('on'); this.results.innerHTML = '';
  }

  start(course) {
    this.title.classList.add('off');
    this.bar.classList.add('on'); this.speed.classList.add('on'); this.gems.classList.add('on');
    this.gemN.textContent = '0';
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

  // the counter's icon: a diamond, or for A Million Ducks a duck
  setCollect(kind) {
    this.gems.classList.toggle('duck', kind === 'duck');
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
