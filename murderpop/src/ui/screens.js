// DOM screens over the canvas: the pause card (the only place keys are written down), the results card,
// the loading veil and the title. Everything else is in the world.

export class Screens {
  constructor(root, app) {
    this.root = root; this.app = app;
    root.innerHTML = `
      <div class="mp-veil"><div class="mp-veil-art"></div><div class="mp-veil-in"><div class="mp-veil-boss"></div><div class="mp-veil-title"></div><div class="mp-veil-line"></div><div class="mp-veil-bar"><i></i></div></div></div>
      <div class="mp-pause">
        <div class="mp-card">
          <div class="mp-card-h">PAUSED</div>
          <div class="mp-card-song"></div>
          <div class="mp-keys">
            <div><b>WASD</b><span>move</span></div><div><b>Left click</b><span>strike</span></div>
            <div><b>Hold left click</b><span>the heavy</span></div><div><b>Space</b><span>jump</span></div>
            <div class="wide"><b>Space in a combo</b><span>lift her</span></div>
            <div class="wide"><b>Right click as it lands</b><span>send it back</span></div>
            <div><b>Hold right click</b><span>block</span></div><div><b>Shift</b><span>dash</span></div>
            <div class="wide"><b>Q</b><span>take the spotlight</span></div>
            <div><b>F</b><span>full screen</span></div><div><b>M</b><span>mute</span></div>
          </div>
          <div class="mp-sliders">
            <label>Music <input type="range" min="0" max="100" value="100" data-k="music"></label>
            <label>Sounds <input type="range" min="0" max="100" value="100" data-k="sfx"></label>
            <label class="mp-check"><input type="checkbox" data-k="calm"> Fewer flashes and shakes</label>
          </div>
          <div class="mp-from"></div>
          <div class="mp-btns">
            <button data-a="resume">Back to it <kbd>Esc</kbd></button>
            <button data-a="restart">From the top <kbd>R</kbd></button>
            <button data-a="record">The record <kbd>M</kbd></button>
          </div>
        </div>
      </div>
      <div class="mp-results">
        <div class="mp-res-in">
          <div class="mp-res-grade"></div>
          <div class="mp-res-side">
            <div class="mp-res-song"></div>
            <div class="mp-res-boss"></div>
            <div class="mp-res-score"></div>
            <div class="mp-res-stats"></div>
            <div class="mp-res-keep"></div>
            <div class="mp-btns">
              <button data-a="next">Next track <kbd>Enter</kbd></button>
              <button data-a="again">Again <kbd>R</kbd></button>
              <button data-a="record">The record <kbd>Esc</kbd></button>
            </div>
          </div>
        </div>
      </div>`;
    this.el = (s) => root.querySelector(s);
    root.addEventListener('click', (e) => { const b = e.target.closest('button[data-a]'); if (b) { app.sfx.ui && app.sfx.ui('confirm'); this.onAction && this.onAction(b.dataset.a); } });
    root.addEventListener('mouseover', (e) => { if (e.target.closest('button')) app.sfx.ui && app.sfx.ui('hover'); });
    root.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => this.onSetting && this.onSetting(r.dataset.k, r.value / 100)));
    root.querySelectorAll('input[type=checkbox]').forEach((r) => r.addEventListener('change', () => this.onSetting && this.onSetting(r.dataset.k, r.checked)));
  }
  // art: { img, boss, line }: a song's loading picture (the song's name over it, who's singing, her first words)
  veil(on, title = '', k = 0, art = null) {
    const v = this.el('.mp-veil'); v.classList.toggle('on', on);
    if (title) this.el('.mp-veil-title').textContent = title;
    this.el('.mp-veil-bar i').style.transform = `scaleX(${k})`;
    if (!on) return;
    const key = art && art.img ? art.img : '';
    if (key === this._veilArt) return;
    this._veilArt = key;
    const a = this.el('.mp-veil-art');
    v.classList.toggle('art', !!key); a.classList.remove('in');
    this.el('.mp-veil-boss').textContent = art && art.boss ? art.boss : '';
    this.el('.mp-veil-line').textContent = art && art.line ? `\u201c${art.line}\u201d` : '';
    if (key) { const im = new Image(); im.onload = () => { if (this._veilArt === key) { a.style.backgroundImage = `url("${key}")`; a.classList.add('in'); } }; im.src = key; }
    else a.style.backgroundImage = '';
  }
  // sections: on a track you've won, start again from any of its sections (practice)
  pause(on, song = '', sections = null) {
    this.el('.mp-pause').classList.toggle('on', on); this.el('.mp-card-song').textContent = song; document.body.classList.toggle('menu', on);
    const fr = this.el('.mp-from');
    fr.innerHTML = on && sections && sections.length > 1 ? `<span>From</span>${sections.map((s, i) => `<button data-a="from:${i}" title="${String(s.name || '').replace(/"/g, '')}">${i + 1}</button>`).join('')}` : '';
  }
  results(on, r = null, meta = null) {
    const el = this.el('.mp-results'); el.classList.toggle('on', on); document.body.classList.toggle('menu', on);
    if (!on || !r) return;
    const g = this.el('.mp-res-grade'); g.textContent = r.grade; g.className = 'mp-res-grade g' + r.grade; void g.offsetWidth; g.classList.add('stamp');
    this.el('.mp-res-song').textContent = meta.title;
    this.el('.mp-res-boss').textContent = meta.boss;
    this.el('.mp-res-score').textContent = r.score.toLocaleString('en-US');
    const s = r.stats;
    const rows = [
      ['On the beat', s.hits ? `${Math.round((s.onBeat / s.hits) * 100)}%` : '—'],
      ['Sent back', `${s.catches}`], ['Perfect', `${s.perfect}`], ['Close calls', `${s.nearMiss}`],
      ['In the air', `${s.air || 0}`], ['Hits you took', `${s.hurt}`],
      ['Rewinds', `${r.rewinds}`], ['Encores', `${r.encores}`],
    ];
    // the finale: its points (doubled if YOU took her keepsake back), and the rings landed as they closed
    if (r.finale) rows.push(['Finale' + (r.finale.kept ? ' \u00d72' : ''), r.finale.bonus.toLocaleString('en-US')], ['Rings', `${r.finale.rings} / ${r.finale.of}`]);
    // her end: the presses landed
    if (r.kill && r.kill.of) rows.push(['Her end', `${r.kill.hits} / ${r.kill.of}`]);
    this.el('.mp-res-stats').innerHTML = rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    this.el('.mp-res-keep').textContent = meta.keepsake ? `Kept: ${meta.keepsake}` : '';
  }
}
