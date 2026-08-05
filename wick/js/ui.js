// ui.js — the small amount of text this game is willing to say out loud.

export class UI {
  constructor() {
    this.el = {
      title: document.getElementById('title'),
      card: document.getElementById('card'),
      cardNum: document.querySelector('#card .num'),
      cardName: document.querySelector('#card .nm'),
      hint: document.getElementById('hint'),
      wicks: document.getElementById('wicks'),
      menu: document.getElementById('menu'),
      fade: document.getElementById('fade'),
      err: document.getElementById('err'),
    };
    // the hand — a ring where your breath is
    const h = document.createElement('div');
    h.id = 'hand';
    h.style.cssText = 'position:absolute;left:0;top:0;width:74px;height:74px;margin:-37px 0 0 -37px;' +
      'border-radius:50%;pointer-events:none;opacity:0;transition:opacity .5s ease;' +
      'box-shadow:inset 0 0 0 1px rgba(240,214,170,.20), 0 0 22px rgba(255,180,110,.05);' +
      'will-change:transform';
    document.getElementById('ui').appendChild(h);
    this.hand = h;
    this._hint = '';
    this._pips = 0;
  }

  layer(name, on) { this.el[name].classList.toggle('on', !!on); }

  showTitle(on) { this.layer('title', on); }

  card(numeral, name) {
    this.el.cardNum.textContent = numeral;
    this.el.cardName.textContent = name || '';
    this.layer('card', true);
  }
  hideCard() { this.layer('card', false); }

  hint(text) {
    if (text === this._hint) return;
    this._hint = text;
    if (!text) { this.el.hint.classList.remove('on'); return; }
    this.el.hint.classList.remove('on');
    setTimeout(() => { this.el.hint.textContent = text; this.el.hint.classList.add('on'); }, 260);
  }

  /** One pip per thing left to light. */
  setWicks(total, lit) {
    const w = this.el.wicks;
    if (this._pips !== total) {
      w.innerHTML = '';
      for (let i = 0; i < total; i++) w.appendChild(document.createElement('i'));
      this._pips = total;
    }
    const kids = w.children;
    for (let i = 0; i < kids.length; i++) kids[i].classList.toggle('lit', i < lit);
    w.classList.toggle('on', total > 0);
  }

  setHand(x, y, hold, visible) {
    const s = hold ? 0.52 : 1;
    this.hand.style.transform = `translate(${x}px,${y}px) scale(${s})`;
    this.hand.style.opacity = visible ? (hold ? 0.95 : 0.5) : 0;
    this.hand.style.boxShadow = hold
      ? 'inset 0 0 0 1px rgba(255,200,150,.55), 0 0 34px rgba(255,170,90,.20)'
      : 'inset 0 0 0 1px rgba(240,214,170,.20), 0 0 22px rgba(255,180,110,.05)';
  }

  menu(items, onPick) {
    const m = this.el.menu;
    m.innerHTML = '';
    const t = document.createElement('div');
    t.className = 'ttl'; t.textContent = 'movements';
    m.appendChild(t);
    for (const it of items) {
      const r = document.createElement('div');
      r.className = 'row' + (it.available ? ' avail' : '');
      r.textContent = it.label;
      if (it.available) r.onclick = (e) => { e.stopPropagation(); onPick(it.id); };
      m.appendChild(r);
    }
    this.layer('menu', true);
  }
  hideMenu() { this.layer('menu', false); }

  blackout(on, ms = 1100) {
    this.el.fade.style.transitionDuration = ms + 'ms';
    this.el.fade.classList.toggle('clear', !on);
  }

  error(msg) {
    this.el.err.textContent = msg;
    this.el.err.classList.add('on');
  }
}
