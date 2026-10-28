// The screens around the rides: the title, the album (pick a song, a rider and a board), the
// loading card, pause, and the end of a song. Plain DOM over the canvas; keys, mouse and thumbs.
// While one of these is up it owns the keys.

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COLLECT = { duck: 'DUCKS', key: 'KEYS', lily: 'LILIES', corn: 'CANDY CORN', chip: 'CHIPS', pick: 'PICKS', star: 'STARS', coin: 'COINS', quill: 'QUILLS', flake: 'SNOWFLAKES', apple: 'APPLES', bulb: 'LIGHTS', like: 'LIKES', ember: 'EMBERS', pearl: 'PEARLS', lips: 'KISSES', shell: 'SHELLS', candy: 'CANDIES', perfume: 'PERFUMES', donut: 'DONUTS', cuffs: 'CUFFS', coffee: 'COFFEES', crown: 'CROWNS', popsicle: 'ICE POPS', drink: 'DRINKS', pin: 'PINS', heart: 'HEARTS', polaroid: 'PHOTOS', whistle: 'WHISTLES', cup: 'CUPS', tab: 'TABS' };
export const collectName = (k) => COLLECT[k] || 'DIAMONDS';
// the course's parts, coloured as the ride's own songbar has them
const KIND_COLOR = ['#8a7aa8', '#b78bd6', '#ff9ec9', '#ff5fa2', '#ff7fbf', '#7fd8ff', '#ffffff', '#ff3d8b', '#8a7aa8', '#5cffa8'];
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="5" y="10" width="14" height="11" rx="2.5" fill="currentColor"/></svg>';
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export class Screens {
  constructor() {
    this.root = $('#screens');
    this.intro = $('#intro'); this.film = $('#intro .film');
    this.menu = $('#menu'); this.list = $('#menu .list'); this.bgA = $('#menu .bg .a'); this.bgB = $('#menu .bg .b');
    this.picA = $('#menu .detail .pic .a'); this.picB = $('#menu .detail .pic .b'); this.picNum = $('#menu .detail .pic .num');
    this.dName = $('#menu .detail .name'); this.dFacts = $('#menu .detail .facts'); this.prof = $('#menu .detail .profile');
    this.rideBtn = $('#menu .ride'); this.rideWhat = $('#menu .ride .what'); this.gear = $('#menu .gear');
    this.load = $('#load'); this.loadBar = $('#load .bar i'); this.loadName = $('#load .name'); this.loadImg = $('#load .img');
    this.end = $('#end'); this.pause = $('#pause');
    this.meEl = $('#menu .me'); this.locker = $('#menu .locker'); this.lockerOn = false;
    this.active = null;       // 'intro' | 'menu' | 'end' | 'pause' | null
    this.sel = 0; this.items = []; this.buttons = []; this.btn = 0;
    this._bgFront = this.bgA; this._picFront = this.picA;
    this.sfx = null;          // (kind, i) => a sound for the screens: move, pick, open, close, unlock, no, start, ride, gear
    this.hooks = {};          // preview(i), stopPreview()
    this.profiles = null;
    fetch('data/profiles.json').then((r) => r.json()).then((p) => { this.profiles = p; if (this.active === 'menu') this._detail(); }).catch(() => { /* drawn without it */ });
    // a click (or tap) anywhere outside the locker closes it
    this.menu.addEventListener('click', (e) => { if (this.lockerOn && !this.locker.contains(e.target) && !e.target.closest('.gear')) this.closeLocker(); });
    this.rideBtn.addEventListener('click', (e) => { e.stopPropagation(); this._choose(); });
    window.addEventListener('resize', () => { if (this.active === 'menu') this._drawProfile(); if (this.active === 'intro') this._film(); });
  }
  _sfx(kind, i) { if (this.sfx) this.sfx(kind, i); }

  // ---------- the title ----------
  // The game's film behind the name (assets/intro: the wide one, or the tall one on a phone held
  // upright); any key, click or tap goes on to the songs.
  showIntro(onStart) {
    this.active = 'intro'; this.onStart = onStart;
    this._film();
    this.intro.classList.add('on'); this.root.classList.add('on');
    // (on the click, the last of a tap's events: on the lift the songs came up under the finger and
    // the tap's click landed on them, RIDE among them)
    this.intro.onclick = () => { if (this.active === 'intro') this._introGo(); };
  }
  _film() {
    const tall = window.innerHeight > window.innerWidth;
    const want = tall ? 'tall' : 'wide';
    if (this.film.dataset.shape === want) return;
    this.film.dataset.shape = want;
    this.film.poster = `assets/intro/poster-${want}.jpg`;
    this.film.src = `assets/intro/intro-${want}.mp4`;
    const r = this.film.play(); if (r && r.catch) r.catch(() => { /* the poster stands in */ });
  }
  _introGo() {
    this.active = null;
    this.intro.classList.add('going');
    // and nothing on the songs answers a finger until the title has gone and a moment more: a
    // second tap on the title (it fades for most of a second, and seemed not to have heard the
    // first) landed on the board button under its middle and opened the locker
    this.menu.classList.add('arriving');
    clearTimeout(this._arriveT);
    this._arriveT = setTimeout(() => this.menu.classList.remove('arriving'), 1100);
    this._sfx('start');
    const done = this.onStart; this.onStart = null;
    setTimeout(() => { this.intro.classList.remove('on', 'going'); this.film.pause(); this._rootOff(); }, 700);
    if (done) done();
  }

  // ---------- the album ----------
  showMenu(songs, selected, onChoose, me, hooks = {}) {
    this.active = 'menu'; this.onChoose = onChoose; this.songs = songs; this.me = me || null; this.hooks = hooks;
    this._renderMe();
    this._renderGear();
    this.closeLocker(true);
    this.list.innerHTML = songs.map((s, i) => `
      <li data-i="${i}" style="--accent:${s.accent}"${s.title.length > 30 ? ' class="long"' : ''}>
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="title">${esc(s.title)}</span>
        <span class="grade${s.grade ? ' g' + s.grade : ''}">${s.grade || ''}</span>
      </li>`).join('');
    this.items = [...this.list.querySelectorAll('li')];
    // fade the edge the list goes on past
    if (!this._edges) {
      this._edges = () => { const L = this.list; L.classList.toggle('more-up', L.scrollTop > 2); L.classList.toggle('more-down', L.scrollTop + L.clientHeight < L.scrollHeight - 2); };
      // and a soft click for each song that goes by under a finger or the wheel
      this._rowAt = 0;
      this.list.addEventListener('scroll', () => {
        this._edges();
        const li = this.items[0]; if (!li) return;
        const r = Math.round(this.list.scrollTop / Math.max(20, li.offsetHeight));
        if (r !== this._rowAt) { this._rowAt = r; if (performance.now() - (this._selAt || 0) > 400) this._sfx('tick', r); }
      }, { passive: true });
      window.addEventListener('resize', this._edges);
    }
    this.items.forEach((li) => {
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = +li.dataset.i;
        // a song you're already on: ride it; another: go to it (and hear it)
        if (i === this.sel && li.classList.contains('sel')) this._choose();
        else this._select(i);
      });
    });
    this.menu.classList.add('on');
    this.root.classList.add('on');
    this._select(Math.max(0, Math.min(songs.length - 1, selected)), true);
  }
  _select(i, instant = false) {
    if (i === this.sel && !instant && this.items[i]?.classList.contains('sel')) return;
    if (!instant) this._sfx('move', i);
    this._selAt = performance.now();   // (the list scrolling to keep it in view isn't a finger: no clicks for it)
    this.sel = i;
    this.items.forEach((li, k) => li.classList.toggle('sel', k === i));
    this._reveal(instant);
    const s = this.songs[i];
    // crossfade the picture behind everything, and the one in the panel
    const swap = (front, a, b, src) => {
      if (front.dataset.src === src) return front;
      const back = front === a ? b : a;
      back.src = src; back.dataset.src = src;
      back.classList.add('show'); front.classList.remove('show');
      return back;
    };
    this._bgFront = swap(this._bgFront, this.bgA, this.bgB, s.image);
    this._picFront = swap(this._picFront, this.picA, this.picB, s.image);
    this.menu.style.setProperty('--accent', s.accent);
    this._detail();
    // hear it, once you've stopped on it a moment
    clearTimeout(this._pvT);
    this._pvT = setTimeout(() => { if (this.active === 'menu' && this.sel === i && this.hooks.preview) this.hooks.preview(i); }, instant ? 150 : 380);
  }
  _detail() {
    const s = this.songs && this.songs[this.sel];
    if (!s) return;
    const pr = this.profiles && this.profiles[s.id];
    this.picNum.textContent = String(this.sel + 1).padStart(2, '0');
    this.dName.textContent = s.title;
    this.dName.classList.toggle('long', s.title.length > 26);
    this.rideWhat.textContent = s.title;
    const facts = [];
    if (pr) facts.push(mmss(pr.dur), pr.bpm + ' BPM');
    if (pr && pr.rails.length) facts.push(pr.rails.length + (pr.rails.length > 1 ? ' RAILS' : ' RAIL'));
    if (pr && pr.gaps.length) facts.push(pr.gaps.length + (pr.gaps.length > 1 ? ' GAPS' : ' GAP'));
    this.dFacts.innerHTML = `<span class="f">${facts.join('<i>&middot;</i>')}</span>`
      + `<span class="b">${s.best ? 'BEST <b>' + s.best.toLocaleString('en-US') + '</b>' : 'NOT RIDDEN YET'}</span>`
      + (s.grade ? `<span class="g g${s.grade}">${s.grade}</span>` : '');
    this._drawProfile();
  }
  // the course: its hills over the song, each part in its colour, the rails and the gaps marked
  _drawProfile() {
    const cv = this.prof, s = this.songs && this.songs[this.sel];
    if (!cv || !s) return;
    const pr = this.profiles && this.profiles[s.id];
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!pr) return;
    const y = pr.y, n = y.length;
    let lo = Infinity, hi = -Infinity; for (const v of y) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const top = 9, base = H - 2, sy = (v) => base - (v - lo) / Math.max(1, hi - lo) * (base - top);
    const sx = (i) => (i / (n - 1)) * W;
    // the ground under it, the song's colour, fading down
    const grad = g.createLinearGradient(0, top, 0, H);
    grad.addColorStop(0, s.accent + '55'); grad.addColorStop(1, s.accent + '00');
    g.beginPath(); g.moveTo(0, H);
    for (let i = 0; i < n; i++) g.lineTo(sx(i), sy(y[i]));
    g.lineTo(W, H); g.closePath(); g.fillStyle = grad; g.fill();
    // the line itself, each part in its colour
    g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round';
    for (let i = 1; i < n; i++) {
      g.strokeStyle = KIND_COLOR[pr.k[i]] || '#ffffff';
      g.beginPath(); g.moveTo(sx(i - 1), sy(y[i - 1])); g.lineTo(sx(i), sy(y[i])); g.stroke();
    }
    // rails: a bright bar over the stretch; gaps: the line broken
    const at = (f) => sy(y[Math.min(n - 1, Math.round(f * (n - 1)))]);
    g.fillStyle = '#ffffff';
    for (const [a, b] of pr.rails) { const x0 = a * W, x1 = Math.max(x0 + 3, b * W); g.fillRect(x0, at(a) - 7, x1 - x0, 2.5); }
    for (const [a, b] of pr.gaps) g.clearRect(a * W, 0, Math.max(3, (b - a) * W), H);
  }
  // keep the pick in view
  _reveal(instant) { const li = this.items[this.sel]; if (li) li.scrollIntoView({ block: 'nearest', behavior: instant ? 'auto' : 'smooth' }); if (this._edges) setTimeout(this._edges, 260); }
  _choose() {
    if (this.active !== 'menu') return;
    const i = this.sel;
    clearTimeout(this._pvT);
    if (this.hooks.stopPreview) this.hooks.stopPreview();
    this._sfx('ride');
    this.hideMenu();
    if (this.onChoose) this.onChoose(i);
  }
  hideMenu() { this.menu.classList.remove('on'); this.closeLocker(true); if (this.active === 'menu') this.active = null; clearTimeout(this._pvT); this._rootOff(); }

  // ---------- you: your level and how far to the next, who you ride and what on ----------
  _renderMe() {
    const me = this.me && this.me.get();
    if (!me || !this.meEl) { if (this.meEl) this.meEl.innerHTML = ''; return; }
    this.meEl.innerHTML = `<span class="lv">LEVEL <b>${me.level}</b></span>`
      + `<span class="xp"><i style="width:${(100 * me.xpFrac).toFixed(1)}%"></i></span>`
      + `<span class="xpn">${Math.round(me.xp).toLocaleString('en-US')} / ${me.need.toLocaleString('en-US')}</span>`
      + (me.picks ? `<button class="pk">${me.picks} TO PICK</button>` : '');
    const pk = this.meEl.querySelector('.pk');
    if (pk) pk.addEventListener('click', (e) => { e.stopPropagation(); this.openLocker(); });
  }
  // a rider or a board as a card: its picture, its name, and a lock (or PICK, with a pick to spend)
  _card(it, cur, picks, i) {
    const state = it.owned ? (cur ? 'cur' : '') : (picks ? 'pick' : 'shut');
    return `<button class="card ${it.kind} ${state}" data-kind="${it.kind}" data-id="${esc(it.id)}"${i !== undefined ? ` data-i="${i}"` : ''} style="--bc:${it.color}" title="${esc(it.name)}">
        <span class="pic"${it.image ? ` style="background-image:url(${it.image})"` : ''}></span>
        <span class="nm">${esc(it.name)}</span>
        ${it.owned ? '' : `<span class="lk">${picks ? 'PICK' : LOCK}</span>`}
      </button>`;
  }
  // on a wide screen the riders and the boards are right there; on a phone, two buttons that
  // open them
  _renderGear() {
    const me = this.me && this.me.get();
    if (!me || !this.gear) { if (this.gear) this.gear.innerHTML = ''; return; }
    const rider = me.riders.find((r) => r.id === me.rider) || me.riders[0];
    const board = me.boards.find((b) => b.id === me.board) || me.boards[0];
    const strip = (kind, list, cur) => `<div class="row ${kind}"><div class="lbl">${kind === 'rider' ? 'RIDER' : 'BOARD'}<span class="nm">${esc(cur.name)}</span></div><div class="strip">${list.map((it) => this._card(it, it.id === cur.id, me.picks)).join('')}</div></div>`;
    const btn = (kind, cur) => `<button class="pickbtn ${kind}" data-kind="${kind}"><span class="pic"${cur.image ? ` style="background-image:url(${cur.image})"` : ''}></span><span class="t"><span class="l">${kind === 'rider' ? 'RIDER' : 'BOARD'}</span><span class="n">${esc(cur.name)}</span></span>${me.picks ? '<span class="hot"></span>' : ''}</button>`;
    this.gear.innerHTML = `<div class="strips">${strip('rider', me.riders, rider)}${strip('board', me.boards, board)}</div>`
      + `<div class="btns">${btn('rider', rider)}${btn('board', board)}</div>`;
    this.gear.querySelectorAll('.strips .card').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this._gearPick(el.dataset.kind, el.dataset.id, el); }));
    this.gear.querySelectorAll('.pickbtn').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this.openLocker(el.dataset.kind); }));
  }
  // choose a rider or board you have; spend a pick on one you don't; or no
  _gearPick(kind, id, el) {
    const ok = this.me.pick(kind, id);
    if (ok === 'unlocked') { this._sfx('unlock'); this._afterGear(kind, id, 'won'); }
    else if (ok === 'chosen') { this._sfx('gear', id.length); this._afterGear(kind, id, 'took'); }
    else { if (el) { el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); } this._sfx('no'); }
  }
  _afterGear(kind, id, fx) {
    this._renderMe(); this._renderGear();
    if (this.lockerOn) this._renderLocker();
    for (const el of this.menu.querySelectorAll(`.card[data-kind="${kind}"][data-id="${CSS.escape(id)}"]`)) el.classList.add(fx);
  }
  // the keys: left and right for the rider, B for the board (each through the ones you have)
  _cycle(kind, dir) {
    const me = this.me && this.me.get();
    if (!me) return;
    const list = (kind === 'rider' ? me.riders : me.boards).filter((x) => x.owned);
    if (list.length < 2) { this.openLocker(kind); return; }
    const cur = kind === 'rider' ? me.rider : me.board;
    const k = Math.max(0, list.findIndex((x) => x.id === cur));
    this._gearPick(kind, list[(k + dir + list.length) % list.length].id);
  }

  // the locker: every rider and board in a grid, over the album (on a phone, all of the screen)
  openLocker(focus = 'rider') {
    if (!this.me || this.lockerOn) return;
    this.lockerOn = true;
    const me = this.me.get();
    this.lsel = focus === 'board' ? me.riders.length + Math.max(0, me.boards.findIndex((b) => b.id === me.board)) : Math.max(0, me.riders.findIndex((r) => r.id === me.rider));
    this._renderLocker();
    this.locker.classList.add('on'); this.menu.classList.add('locked');
    if (focus === 'board') { const b = this.locker.querySelector('.lhead.sub'); if (b) b.scrollIntoView({ block: 'start' }); }
    this._sfx('open');
  }
  closeLocker(quiet) {
    if (!this.locker) return;
    if (!quiet && this.lockerOn) this._sfx('close');
    this.lockerOn = false; this.locker.classList.remove('on'); this.menu.classList.remove('locked');
    if (!quiet) { this._renderMe(); this._renderGear(); }
  }
  _lockerItems(me) { return [...me.riders, ...me.boards]; }
  _renderLocker() {
    const me = this.me.get();
    const nR = me.riders.length;
    this.locker.innerHTML = `<div class="lhead"><span>RIDERS</span><span class="lp">${me.picks ? me.picks + ' TO PICK' : 'ONE MORE EACH LEVEL'}</span><button class="x" aria-label="close">&times;</button></div>
      <div class="grid riders">${me.riders.map((r, i) => this._card(r, r.id === me.rider, me.picks, i)).join('')}</div>
      <div class="lhead sub"><span>BOARDS</span></div>
      <div class="grid boards">${me.boards.map((b, i) => this._card(b, b.id === me.board, me.picks, nR + i)).join('')}</div>
      <div class="foot"><span class="kb"><b>&larr; &rarr; &uarr; &darr;</b>&nbsp; look &nbsp;&middot;&nbsp; <b>enter</b>&nbsp; ride it &nbsp;&middot;&nbsp; <b>esc</b>&nbsp; songs</span><span class="tp">tap one to ride it &nbsp;&middot;&nbsp; tap outside for the songs</span></div>`;
    this.locker.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); this.closeLocker(); });
    this.locker.querySelectorAll('.card').forEach((el) => {
      el.addEventListener('mouseenter', () => { if (this.lsel !== +el.dataset.i) this._sfx('move', +el.dataset.i); this.lsel = +el.dataset.i; this._lockerFocus(); });
      el.addEventListener('click', (e) => { e.stopPropagation(); this.lsel = +el.dataset.i; this._lockerPick(); });
    });
    this._lockerFocus();
  }
  _lockerFocus() { this.locker.querySelectorAll('.card').forEach((el) => el.classList.toggle('foc', +el.dataset.i === this.lsel)); }
  // arrows: along a row, and between the riders and the boards
  _lockerMove(k) {
    const me = this.me.get(), nR = me.riders.length, nB = me.boards.length, n = nR + nB, i = this.lsel;
    const cols = window.innerWidth < 700 && window.innerHeight > window.innerWidth ? 3 : 5;
    if (k === 'right') this.lsel = (i + 1) % n;
    else if (k === 'left') this.lsel = (i - 1 + n) % n;
    else if (k === 'down') this.lsel = i < nR ? Math.min(n - 1, nR + Math.min(nB - 1, i)) : Math.min(n - 1, i + cols);
    else if (k === 'up') this.lsel = i >= nR + cols ? i - cols : (i >= nR ? Math.min(nR - 1, i - nR) : i);
    if (this.lsel !== i) this._sfx('move', this.lsel);
    this._lockerFocus();
    const el = this.locker.querySelector(`.card[data-i="${this.lsel}"]`); if (el) el.scrollIntoView({ block: 'nearest' });
  }
  _lockerPick() {
    const me = this.me.get(), it = this._lockerItems(me)[this.lsel];
    if (!it) return;
    this._gearPick(it.kind, it.id, this.locker.querySelector(`.card[data-i="${this.lsel}"]`));
  }

  // ---------- loading ----------
  showLoading(song) {
    this.loadName.innerHTML = (song.num ? `<span class="n">${String(song.num).padStart(2, '0')}</span>` : '') + esc(song.title);
    this.load.style.setProperty('--accent', song.accent || '#fff');
    this.loadImg.style.backgroundImage = `url(${song.image})`;
    this.loadBar.style.width = '0%';
    this.load.classList.add('on'); this.root.classList.add('on');
  }
  setLoading(p) { this.loadBar.style.width = (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%'; }
  hideLoading() { this.load.classList.remove('on'); this._rootOff(); }

  // ---------- the end of a song ----------
  // The points count up, the grade lands, then the level bar fills with what they were worth
  // (and goes round again for each level). Buttons work from the first moment.
  showEnd(d, buttons, fx = {}) {
    this.active = 'end';
    const row = (a, b) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;
    const lv = d.level;
    this.end.innerHTML = `
      <div class="card" style="--accent:${d.accent}">
        <div class="song">${esc(d.title)}</div>
        <div class="head"><div class="grade g${d.grade}">${d.grade}<i class="stamp"></i></div><div class="pts"><div class="n">0</div><div class="sub">${d.newBest ? '<span class="nb">NEW BEST</span>' : (d.best ? 'BEST ' + d.best.toLocaleString('en-US') : '')}</div></div></div>
        <div class="rows">
          ${row('IN TIME', d.inTime + '%')}
          ${row('PERFECT', d.perfects)}
          ${row('LONGEST RUN', '×' + d.bestStreak)}
          ${row(collectName(d.collect), d.notes + ' / ' + d.notesTotal)}
          ${d.tricks ? row('TRICKS', d.tricks) : ''}
          ${row('DISTANCE', (d.dist / 1000).toFixed(2) + ' KM')}
        </div>
        ${lv ? `<div class="level"><div class="lt"><span>LEVEL <b class="ln">${lv.before.level}</b></span><span class="up"></span></div><div class="lbar"><i style="width:${(100 * lv.before.xp / lv.need(lv.before.level)).toFixed(1)}%"></i></div></div>` : ''}
        <div class="btns">${buttons.map((b, i) => `<button data-i="${i}" class="${i === 0 ? 'primary' : ''}">${esc(b.label)}<span class="k">${esc(b.key || '')}</span></button>`).join('')}</div>
      </div>`;
    this._buttons(buttons, this.end);
    this.end.classList.add('on'); this.root.classList.add('on');
    this._endAnim(d, fx);
  }
  _endAnim(d, fx) {
    const card = this.end.querySelector('.card'), nEl = card.querySelector('.pts .n'), gEl = card.querySelector('.grade');
    const token = (this._endToken = {});
    const alive = () => this._endToken === token && this.active === 'end';
    const T = 1500, t0 = performance.now() + 350;
    let lastTick = 0;
    const count = () => {
      if (!alive()) return;
      const f = Math.min(1, Math.max(0, (performance.now() - t0) / T));
      const e = 1 - Math.pow(1 - f, 3);
      nEl.textContent = Math.round(d.points * e).toLocaleString('en-US');
      if (f > 0 && f < 1 && performance.now() - lastTick > 55) { lastTick = performance.now(); if (fx.tick) fx.tick(1 - f * 0.6); }
      if (f < 1) requestAnimationFrame(count);
      else {
        gEl.classList.add('in'); if (fx.grade) fx.grade(d.grade);
        // it lands like a stamp: the card jolts, a ring goes out from it (gold for an S)
        const big = d.grade === 'S' || d.grade === 'A';
        card.animate([{ translate: '0 0' }, { translate: `${big ? -6 : -4}px ${big ? 4 : 3}px`, offset: 0.18 }, { translate: '4px -3px', offset: 0.42 }, { translate: '-2px 1px', offset: 0.68 }, { translate: '0 0' }], { duration: big ? 360 : 280, delay: 90, easing: 'ease-out' });
        const st = card.querySelector('.stamp');
        if (st) st.animate([{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0, transform: `scale(${big ? 16 : 11})` }], { duration: big ? 620 : 480, delay: 90, easing: 'cubic-bezier(.2,.8,.3,1)' });
        setTimeout(() => { if (alive()) this._levelAnim(d, fx, token); }, 650);
      }
    };
    requestAnimationFrame(count);
  }
  // the bar fills from where it was by what this ride was worth; a full bar is a new level
  _levelAnim(d, fx, token) {
    const lv = d.level; if (!lv) return;
    const card = this.end.querySelector('.card'); if (!card) return;
    const bar = card.querySelector('.lbar i'), ln = card.querySelector('.ln'), up = card.querySelector('.up'), box = card.querySelector('.level');
    const alive = () => this._endToken === token && this.active === 'end';
    const legs = [];
    let level = lv.before.level, xp = lv.before.xp, gain = lv.gained;
    while (gain > 0) { const need = lv.need(level), room = need - xp, take = Math.min(room, gain); legs.push({ level, from: xp / need, to: (xp + take) / need, full: take >= room }); gain -= take; xp += take; if (xp >= need) { level++; xp = 0; } }
    let i = 0;
    const next = () => {
      if (!alive() || i >= legs.length) return;
      const L = legs[i++], dur = 380 + 900 * (L.to - L.from), s0 = performance.now();
      bar.style.width = (L.from * 100).toFixed(1) + '%';
      if (fx.rise) fx.rise(dur / 1000);
      const step = () => {
        if (!alive()) return;
        const f = Math.min(1, (performance.now() - s0) / dur), e = f * (2 - f);
        bar.style.width = ((L.from + (L.to - L.from) * e) * 100).toFixed(1) + '%';
        if (f < 1) { requestAnimationFrame(step); return; }
        if (L.full) {
          ln.textContent = L.level + 1; up.textContent = '+1 PICK';   // (a rider or a board: the song list says "TO PICK")
          box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
          if (fx.levelUp) fx.levelUp();
          setTimeout(next, 700);
        } else next();
      };
      requestAnimationFrame(step);
    };
    next();
  }
  hideEnd() { this.end.classList.remove('on'); if (this.active === 'end') this.active = null; this._rootOff(); }

  // ---------- pause ----------
  showPause(buttons) {
    this.active = 'pause';
    this.pause.innerHTML = `<div class="card"><div class="song">PAUSED</div><div class="btns">${buttons.map((b, i) => `<button data-i="${i}" class="${i === 0 ? 'primary' : ''}">${esc(b.label)}<span class="k">${esc(b.key || '')}</span></button>`).join('')}</div></div>`;
    this._buttons(buttons, this.pause);
    this.pause.classList.add('on'); this.root.classList.add('on');
  }
  hidePause() { this.pause.classList.remove('on'); if (this.active === 'pause') this.active = null; this._rootOff(); }

  _buttons(buttons, el) {
    this.buttons = buttons; this.btn = 0;
    const bs = [...el.querySelectorAll('button')];
    this.btnEls = bs;
    bs.forEach((b) => {
      b.addEventListener('mouseenter', () => this._focus(+b.dataset.i));
      b.addEventListener('click', (e) => { e.stopPropagation(); this._press(+b.dataset.i); });
    });
    this._focus(0, true);
  }
  _focus(i, quiet) { if (!quiet && i !== this.btn) this._sfx('move', i + 2); this.btn = i; (this.btnEls || []).forEach((b, k) => b.classList.toggle('focus', k === i)); }
  _press(i) { const b = this.buttons[i]; if (b && b.go) { this._sfx('pick'); b.go(); } }

  _rootOff() { if (!this.intro.classList.contains('on') && !this.menu.classList.contains('on') && !this.load.classList.contains('on') && !this.end.classList.contains('on') && !this.pause.classList.contains('on')) this.root.classList.remove('on'); }

  // keys while a screen is up; returns true if it used the key
  key(e) {
    if (!this.active) return false;
    const k = e.code;
    // the title: any key but the ones that belong to the browser
    if (this.active === 'intro') {
      if (!(e.metaKey || e.ctrlKey || e.altKey || k === 'Tab' || /^F\d/.test(k))) this._introGo();
      return true;
    }
    if (this.active === 'menu' && this.lockerOn) {
      if (k === 'Escape' || k === 'KeyB') { this.closeLocker(); return true; }
      if (k === 'ArrowRight' || k === 'KeyD') this._lockerMove('right');
      else if (k === 'ArrowLeft' || k === 'KeyA') this._lockerMove('left');
      else if (k === 'ArrowDown' || k === 'KeyS') this._lockerMove('down');
      else if (k === 'ArrowUp' || k === 'KeyW') this._lockerMove('up');
      else if (k === 'Enter' || k === 'Space') this._lockerPick();
      return true;
    }
    if (this.active === 'menu') {
      if (k === 'KeyB') { if (e.shiftKey) this.openLocker('board'); else this._cycle('board', 1); return true; }
      if (k === 'ArrowRight' || k === 'KeyD') { this._cycle('rider', 1); return true; }
      if (k === 'ArrowLeft' || k === 'KeyA') { this._cycle('rider', -1); return true; }
      if (k === 'KeyL') { this.openLocker(); return true; }
      if (k === 'ArrowDown' || k === 'KeyS') { this._select((this.sel + 1) % this.items.length); return true; }
      if (k === 'ArrowUp' || k === 'KeyW') { this._select((this.sel - 1 + this.items.length) % this.items.length); return true; }
      if (k === 'Enter' || k === 'Space') { this._choose(); return true; }
      return true;
    }
    // end and pause: left/right (or up/down) between buttons, Enter/Space presses, letters are shortcuts
    if (k === 'ArrowRight' || k === 'ArrowDown') { this._focus((this.btn + 1) % this.buttons.length); return true; }
    if (k === 'ArrowLeft' || k === 'ArrowUp') { this._focus((this.btn - 1 + this.buttons.length) % this.buttons.length); return true; }
    if (k === 'Enter' || k === 'Space') { this._press(this.btn); return true; }
    const hot = this.buttons.findIndex((b) => b.code === k);
    if (hot >= 0) { this._press(hot); return true; }
    return true;
  }
}
