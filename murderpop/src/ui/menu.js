// The title and the record's track list (DOM beside the 3D record).
// Progress lives in localStorage 'mp-progress' (wrapped: a private window can throw).

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem('mp-progress')) || { won: {}, best: {}, plays: 0 }; } catch (e) { return { won: {}, best: {}, plays: 0 }; }
}
export function saveProgress(p) { try { localStorage.setItem('mp-progress', JSON.stringify(p)); } catch (e) { /* fine */ } }
const RANK = { S: 5, A: 4, B: 3, C: 2, D: 1 };
export function better(a, b) { return (RANK[a] || 0) > (RANK[b] || 0); }

export class MenuDOM {
  constructor(root, app) {
    this.root = root; this.app = app;
    root.innerHTML = `
      <div class="mp-title">
        <div class="mp-logo"><span>MURDER</span><span>POP</span></div>
        <div class="mp-press">press any key</div>
      </div>
      <div class="mp-list">
        <div class="mp-side"><button class="mp-side-a">Side A</button><button class="mp-side-b">Side B</button><button class="mp-encore" hidden>Encore</button></div>
        <ol class="mp-tracks"></ol>
        <div class="mp-detail"><div class="mp-d-boss"></div><div class="mp-d-keep"></div></div>
      </div>`;
    this.tracksEl = root.querySelector('.mp-tracks');
    root.querySelector('.mp-side-a').addEventListener('click', () => this.onSide && this.onSide('A'));
    root.querySelector('.mp-side-b').addEventListener('click', () => this.onSide && this.onSide('B'));
    root.querySelector('.mp-encore').addEventListener('click', () => this.onEncore && this.onEncore());
    this.tracksEl.addEventListener('mousemove', (e) => { const li = e.target.closest('li'); if (li && this.onHover) this.onHover(+li.dataset.i); });
    this.tracksEl.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li && !li.classList.contains('locked') && this.onPick) this.onPick(+li.dataset.i); });
  }
  mode(m) { this.root.className = 'mp-menu ' + m; document.body.classList.toggle('menu', m !== 'hidden'); }
  encore(unlocked, on) { const b = this.root.querySelector('.mp-encore'); b.hidden = !unlocked; b.classList.toggle('on', !!on); }
  setSide(side, tracks, progress, unlocked) {
    this.root.querySelector('.mp-side-a').classList.toggle('on', side === 'A');
    this.root.querySelector('.mp-side-b').classList.toggle('on', side === 'B');
    this.tracks = tracks;
    this.tracksEl.innerHTML = tracks.map((t, i) => {
      const g = progress.won[t.id], locked = !unlocked(t);
      const mm = Math.floor((t.length || 0) / 60), ss = String(Math.round((t.length || 0) % 60)).padStart(2, '0');
      return `<li data-i="${i}" class="${locked ? 'locked' : ''} ${g ? 'won' : ''}"><span class="n">${t.side === 'Bonus' ? '★' : t.side === 'Credits' ? '·' : t.n}</span><span class="t"><i class="${!locked && t.title.length > 26 ? 'long' : ''}">${locked ? '— — —' : t.title}</i><em>${locked ? '' : t.boss}</em></span><span class="g">${g || ''}</span><span class="l">${mm}:${ss}</span></li>`;
    }).join('');
  }
  highlight(i) {
    this.tracksEl.querySelectorAll('li').forEach((li, k) => li.classList.toggle('hot', k === i));
    const t = this.tracks && this.tracks[i];
    this.root.querySelector('.mp-d-boss').textContent = '';
    this.root.querySelector('.mp-d-keep').textContent = t && this.app.progress.won[t.id] && t.keepsake ? t.keepsake : '';
  }
}
