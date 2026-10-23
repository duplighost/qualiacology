// The screens around the rides: the album (pick a song), the loading card, pause,
// and the end of a song. Plain DOM over the canvas; keys and mouse both work.
// While one of these is up it owns the keys: arrows move, Enter or Space picks.

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Screens {
  constructor() {
    this.root = $('#screens');
    this.menu = $('#menu'); this.list = $('#menu .list'); this.bgA = $('#menu .bg .a'); this.bgB = $('#menu .bg .b');
    this.load = $('#load'); this.loadBar = $('#load .bar i'); this.loadName = $('#load .name'); this.loadImg = $('#load .img');
    this.end = $('#end'); this.pause = $('#pause');
    this.active = null;       // 'menu' | 'end' | 'pause' | null
    this.sel = 0; this.items = []; this.buttons = []; this.btn = 0;
    this._bgFront = this.bgA;
    window.addEventListener('mousemove', () => { this.mouse = true; });
  }

  // ---------- the album ----------
  showMenu(songs, selected, onChoose) {
    this.active = 'menu'; this.onChoose = onChoose; this.songs = songs;
    this.list.innerHTML = songs.map((s, i) => `
      <li data-i="${i}" style="--accent:${s.accent}">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="title">${esc(s.title)}</span>
        <span class="best">${s.best ? (s.best / 1000).toFixed(2) + ' KM' : ''}</span>
        <span class="pct">${s.inTime ? s.inTime + '%' : ''}</span>
      </li>`).join('');
    this.items = [...this.list.querySelectorAll('li')];
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
    this.sel = i;
    this.items.forEach((li, k) => li.classList.toggle('sel', k === i));
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
  _choose() {
    if (this.active !== 'menu') return;
    const i = this.sel;
    this.hideMenu();
    this.onChoose && this.onChoose(i);
  }
  hideMenu() { this.menu.classList.remove('on'); if (this.active === 'menu') this.active = null; this._rootOff(); }

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
  showEnd(d, buttons) {
    this.active = 'end';
    const row = (a, b) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;
    this.end.innerHTML = `
      <div class="card" style="--accent:${d.accent}">
        <div class="song">${esc(d.title)}</div>
        <div class="km">${(d.dist / 1000).toFixed(2)} KM${d.newBest ? '<span class="nb">NEW BEST</span>' : ''}</div>
        <div class="rows">
          ${row('IN TIME', d.inTime + '%')}
          ${row('PERFECT', d.perfects)}
          ${row('LONGEST RUN', '×' + d.bestStreak)}
          ${row(d.collect === 'duck' ? 'DUCKS' : 'DIAMONDS', d.notes + ' / ' + d.notesTotal)}
          ${row('TOP SPEED', Math.round(d.top * 3.6) + ' KM/H')}
          ${d.best && !d.newBest ? row('BEST', (d.best / 1000).toFixed(2) + ' KM') : ''}
        </div>
        <div class="btns">${buttons.map((b, i) => `<button data-i="${i}" class="${i === 0 ? 'primary' : ''}">${esc(b.label)}<span class="k">${esc(b.key || '')}</span></button>`).join('')}</div>
      </div>`;
    this._buttons(buttons, this.end);
    this.end.classList.add('on'); this.root.classList.add('on');
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
    this._focus(0);
  }
  _focus(i) { this.btn = i; (this.btnEls || []).forEach((b, k) => b.classList.toggle('focus', k === i)); }
  _press(i) { const b = this.buttons[i]; if (b && b.go) b.go(); }

  _rootOff() { if (!this.menu.classList.contains('on') && !this.load.classList.contains('on') && !this.end.classList.contains('on') && !this.pause.classList.contains('on')) this.root.classList.remove('on'); }

  // keys while a screen is up; returns true if it used the key
  key(e) {
    if (!this.active) return false;
    const k = e.code;
    if (this.active === 'menu') {
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
