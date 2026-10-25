// The screens around the rides: the album (pick a song), the loading card, pause,
// and the end of a song. Plain DOM over the canvas; keys and mouse both work.
// While one of these is up it owns the keys: arrows move, Enter or Space picks.

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COLLECT = { duck: 'DUCKS', key: 'KEYS', lily: 'LILIES', corn: 'CANDY CORN', chip: 'CHIPS', pick: 'PICKS', star: 'STARS', coin: 'COINS', quill: 'QUILLS', flake: 'SNOWFLAKES', apple: 'APPLES', bulb: 'LIGHTS', like: 'LIKES', ember: 'EMBERS', pearl: 'PEARLS', lips: 'KISSES', shell: 'SHELLS', candy: 'CANDIES', perfume: 'PERFUMES', donut: 'DONUTS', cuffs: 'CUFFS', coffee: 'COFFEES', crown: 'CROWNS', popsicle: 'ICE POPS', drink: 'DRINKS', pin: 'PINS', heart: 'HEARTS' };
export const collectName = (k) => COLLECT[k] || 'DIAMONDS';

export class Screens {
  constructor() {
    this.root = $('#screens');
    this.menu = $('#menu'); this.list = $('#menu .list'); this.bgA = $('#menu .bg .a'); this.bgB = $('#menu .bg .b');
    this.load = $('#load'); this.loadBar = $('#load .bar i'); this.loadName = $('#load .name'); this.loadImg = $('#load .img');
    this.end = $('#end'); this.pause = $('#pause');
    this.meEl = $('#menu .me'); this.locker = $('#menu .locker'); this.lockerOn = false;
    this.active = null;       // 'menu' | 'end' | 'pause' | null
    this.sel = 0; this.items = []; this.buttons = []; this.btn = 0;
    this._bgFront = this.bgA;
    this.sfx = null;          // (kind, i) => a sound for the screens: move, pick, open, close, unlock, no
    window.addEventListener('mousemove', () => { this.mouse = true; });
    // a click (or tap) anywhere outside the locker closes it
    this.menu.addEventListener('click', (e) => { if (this.lockerOn && !this.locker.contains(e.target)) this.closeLocker(); });
  }
  _sfx(kind, i) { if (this.sfx) this.sfx(kind, i); }

  // ---------- the album ----------
  showMenu(songs, selected, onChoose, me) {
    this.active = 'menu'; this.onChoose = onChoose; this.songs = songs; this.me = me || null;
    this._renderMe();
    this.closeLocker(true);
    this.list.innerHTML = songs.map((s, i) => `
      <li data-i="${i}" style="--accent:${s.accent}"${s.title.length > 34 ? ' class="long"' : ''}>
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="title">${esc(s.title)}</span>
        <span class="best">${s.best ? s.best.toLocaleString('en-US') : ''}</span>
        <span class="pct${s.grade ? ' g' + s.grade : ''}">${s.grade || ''}</span>
      </li>`).join('');
    this.items = [...this.list.querySelectorAll('li')];
    // fade the edge the list goes on past
    if (!this._edges) { this._edges = () => { const L = this.list; L.classList.toggle('more-up', L.scrollTop > 2); L.classList.toggle('more-down', L.scrollTop + L.clientHeight < L.scrollHeight - 2); }; this.list.addEventListener('scroll', this._edges); window.addEventListener('resize', this._edges); }
    this.items.forEach((li) => {
      li.addEventListener('mouseenter', () => this._select(+li.dataset.i));
      li.addEventListener('click', (e) => { e.stopPropagation(); this._select(+li.dataset.i); this._choose(); });
    });
    this._select(Math.max(0, Math.min(songs.length - 1, selected)), true);
    this.menu.classList.add('on');
    this.root.classList.add('on');
  }
  _select(i, instant = false) {
    if (i === this.sel && !instant && this.items[i]?.classList.contains('sel')) return;
    if (!instant) this._sfx('move', i);
    this.sel = i;
    this.items.forEach((li, k) => li.classList.toggle('sel', k === i));
    if (instant) this._reveal();
    const src = this.songs[i].image;
    // crossfade the picture behind the list
    const back = this._bgFront === this.bgA ? this.bgB : this.bgA;
    if (this._bgFront.dataset.src !== src) {
      back.src = src; back.dataset.src = src;
      back.classList.add('show'); this._bgFront.classList.remove('show');
      this._bgFront = back;
    }
    this.menu.style.setProperty('--accent', this.songs[i].accent);
  }
  // on a short window the list scrolls: keep the pick in view
  _reveal() { const li = this.items[this.sel]; if (li) li.scrollIntoView({ block: 'nearest' }); this._edges && this._edges(); }
  _choose() {
    if (this.active !== 'menu') return;
    const i = this.sel;
    this.hideMenu();
    this.onChoose && this.onChoose(i);
    this._sfx('pick');
  }
  hideMenu() { this.menu.classList.remove('on'); this.closeLocker(true); if (this.active === 'menu') this.active = null; this._rootOff(); }

  // ---------- you: level, the bar to the next, who and what you ride, and the locker ----------
  _renderMe() {
    const me = this.me && this.me.get();
    if (!me || !this.meEl) { if (this.meEl) this.meEl.innerHTML = ''; return; }
    const board = me.boards.find((b) => b.id === me.board) || me.boards[0];
    const rider = me.riders.find((r) => r.id === me.rider) || me.riders[0];
    this.meEl.innerHTML = `<span class="lv">LEVEL <b>${me.level}</b></span><span class="xp"><i style="width:${(100 * me.xpFrac).toFixed(1)}%"></i></span>`
      + `<button class="bd${me.picks ? ' hot' : ''}">${me.picks ? `<span class="pk">${me.picks} TO PICK</span>` : ''}<b>${esc(rider.name)}</b><span class="on">ON</span><b>${esc(board.name)}</b><span class="k">B</span></button>`;
    this.meEl.querySelector('.bd').addEventListener('click', (e) => { e.stopPropagation(); this.openLocker(); });
  }
  // riders first (one row), then the boards (rows of three)
  _lockerItems(me) { return [...me.riders, ...me.boards]; }
  openLocker() {
    if (!this.me || this.lockerOn) return;
    this.lockerOn = true;
    const me = this.me.get();
    this.lsel = Math.max(0, me.riders.findIndex((r) => r.id === me.rider));
    this._renderLocker();
    this.locker.classList.add('on'); this.menu.classList.add('locked');
    this._sfx('open');
  }
  closeLocker(quiet) {
    if (!this.locker) return;
    if (!quiet && this.lockerOn) this._sfx('close');
    this.lockerOn = false; this.locker.classList.remove('on'); this.menu.classList.remove('locked');
    if (!quiet) this._renderMe();
  }
  _renderLocker() {
    const me = this.me.get();
    const nR = me.riders.length;
    const card = (it, i) => {
      const cur = it.kind === 'rider' ? it.id === me.rider : it.id === me.board;
      const line = it.owned ? (cur ? 'RIDING' : (it.trail ? esc(it.trail) : '&nbsp;')) : (me.picks ? 'PICK' : 'LOCKED');
      return `<div class="bcard ${it.kind}${it.owned ? '' : ' shut'}${cur ? ' cur' : ''}${i === this.lsel ? ' foc' : ''}" data-i="${i}" style="--bc:${it.color}">
          <div class="pic"${it.image ? ` style="background-image:url(${it.image})"` : ''}></div>
          <div class="nm">${esc(it.name)}</div>
          <div class="tr">${line}</div>
        </div>`;
    };
    this.locker.innerHTML = `<div class="lhead"><span>RIDERS</span><span class="lp">${me.picks ? me.picks + ' TO PICK' : 'LEVEL UP TO PICK ANOTHER'}</span></div>
      <div class="grid riders">${me.riders.map((r, i) => card(r, i)).join('')}</div>
      <div class="lhead sub"><span>BOARDS</span></div>
      <div class="grid">${me.boards.map((b, i) => card(b, nR + i)).join('')}</div>
      <div class="foot"><span class="kb"><b>&larr; &rarr; &uarr; &darr;</b>&nbsp; look &nbsp;&nbsp;<b>enter</b>&nbsp; ride it &nbsp;&nbsp;<b>esc</b>&nbsp; songs</span><span class="tp">tap one to ride it &nbsp;&middot;&nbsp; tap outside for the songs</span></div>`;
    this.locker.querySelectorAll('.bcard').forEach((el) => {
      el.addEventListener('mouseenter', () => { if (this.lsel !== +el.dataset.i) this._sfx('move', +el.dataset.i); this.lsel = +el.dataset.i; this._lockerFocus(); });
      el.addEventListener('click', (e) => { e.stopPropagation(); this.lsel = +el.dataset.i; this._lockerPick(); });
    });
  }
  _lockerFocus() { this.locker.querySelectorAll('.bcard').forEach((el) => el.classList.toggle('foc', +el.dataset.i === this.lsel)); }
  // arrows: along a row, and between the riders' row and the boards' rows of three
  _lockerMove(k) {
    const me = this.me.get(), nR = me.riders.length, nB = me.boards.length, n = nR + nB, i = this.lsel;
    if (k === 'right') this.lsel = (i + 1) % n;
    else if (k === 'left') this.lsel = (i - 1 + n) % n;
    else if (k === 'down') {
      if (i < nR) this.lsel = nR + Math.min(2, Math.floor(i * 3 / nR));
      else this.lsel = Math.min(n - 1, i + 3);
    } else if (k === 'up') {
      if (i >= nR + 3) this.lsel = i - 3;
      else if (i >= nR) this.lsel = Math.min(nR - 1, Math.round((i - nR) * (nR - 1) / 2));
    }
    if (this.lsel !== i) this._sfx('move', this.lsel);
    this._lockerFocus();
  }
  _lockerPick() {
    const me = this.me.get(), it = this._lockerItems(me)[this.lsel];
    if (!it) return;
    const ok = this.me.pick(it.kind, it.id);
    const el = () => this.locker.querySelector(`.bcard[data-i="${this.lsel}"]`);
    if (ok === 'unlocked') { this._renderLocker(); const e = el(); if (e) e.classList.add('won'); this._sfx('unlock'); }
    else if (ok) { this._renderLocker(); this._sfx('pick'); }
    else { const e = el(); if (e) { e.classList.remove('no'); void e.offsetWidth; e.classList.add('no'); } this._sfx('no'); }
  }

  // ---------- loading ----------
  showLoading(song) {
    this.loadName.textContent = song.title;
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
        <div class="head"><div class="grade g${d.grade}">${d.grade}</div><div class="pts"><div class="n">0</div><div class="sub">${d.newBest ? '<span class="nb">NEW BEST</span>' : (d.best ? 'BEST ' + d.best.toLocaleString('en-US') : '')}</div></div></div>
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
      else { gEl.classList.add('in'); if (fx.grade) fx.grade(d.grade); setTimeout(() => { if (alive()) this._levelAnim(d, fx, token); }, 650); }
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
          ln.textContent = L.level + 1; up.textContent = '+1 BOARD';
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

  _rootOff() { if (!this.menu.classList.contains('on') && !this.load.classList.contains('on') && !this.end.classList.contains('on') && !this.pause.classList.contains('on')) this.root.classList.remove('on'); }

  // keys while a screen is up; returns true if it used the key
  key(e) {
    if (!this.active) return false;
    const k = e.code;
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
      if (k === 'KeyB') { this.openLocker(); return true; }
      if (k === 'ArrowDown' || k === 'KeyS') { this._select((this.sel + 1) % this.items.length); this._reveal(); return true; }
      if (k === 'ArrowUp' || k === 'KeyW') { this._select((this.sel - 1 + this.items.length) % this.items.length); this._reveal(); return true; }
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
