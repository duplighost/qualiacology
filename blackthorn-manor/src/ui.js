// DOM overlays: prompt, toasts, subtitles, the paper-reading view, the case
// journal, the accusation board, and the ending.
import { CLUES, KEYS, PERSONS, DOCS, OBJECTIVES, ACCUSE, ENDINGS } from './story.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.modal = null;          // 'paper' | 'journal' | 'accuse' | 'ending' | null
    this.onModalChange = null;  // (open) => {}
    this.onDocClosed = null;
    this.onAccuse = null;       // (answers) => boolean correct
    this._toastT = null;
    this._subT = null;
    this._currentDoc = null;
    this.journalTab = 'clues';

    document.querySelectorAll('#journal .tabs div').forEach(el => {
      el.addEventListener('click', () => {
        this.journalTab = el.dataset.tab;
        document.querySelectorAll('#journal .tabs div').forEach(e2 => e2.classList.toggle('sel', e2 === el));
        this.renderJournal();
      });
    });
  }

  /* ---------- HUD ---------- */
  prompt(inter) {
    const el = $('prompt');
    const ch = $('crosshair');
    if (!inter) { el.innerHTML = ''; ch.classList.remove('active'); return; }
    const text = typeof inter.prompt === 'function' ? inter.prompt() : inter.prompt;
    el.innerHTML = `<span class="key">E</span>${text}`;
    ch.classList.add('active');
  }

  hud(roomName) {
    $('roomname').textContent = roomName || '';
    const n = this.game.coreCluesFound(), total = this.game.coreCluesTotal();
    $('cluecount').textContent = n > 0 ? `evidence · ${n} of ${total}` : '';
  }

  toast(text, ms = 5200) {
    const el = $('toast');
    el.textContent = text;
    el.style.opacity = 1;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { el.style.opacity = 0; }, ms);
  }

  objectiveFlash(text) { this.toast('✦ ' + text, 6500); }

  subtitle(text, ms = 6000) {
    const el = $('subtitle');
    el.textContent = text;
    el.style.opacity = 1;
    clearTimeout(this._subT);
    this._subT = setTimeout(() => { el.style.opacity = 0; }, ms);
  }

  /* ---------- modal management ---------- */
  setModal(name) {
    this.modal = name;
    $('paper').classList.toggle('hidden', name !== 'paper');
    $('journal').classList.toggle('hidden', name !== 'journal');
    $('accuse').classList.toggle('hidden', name !== 'accuse');
    $('ending').classList.toggle('hidden', name !== 'ending');
    if (this.onModalChange) this.onModalChange(!!name);
  }

  /* ---------- paper ---------- */
  readDoc(id) {
    const d = DOCS[id];
    if (!d) return;
    this._currentDoc = id;
    this.game.docsRead.add(id);
    let newClue = false;
    if (d.clue) newClue = this.game.addClue(d.clue);
    this.showPaper(d.title, d.body, d.clue && newClue ? CLUES[d.clue].title : null);
  }

  readText(title, body, clueId) {
    this._currentDoc = null;
    let newClue = false;
    if (clueId) newClue = this.game.addClue(clueId);
    this.showPaper(title, body, clueId && newClue ? CLUES[clueId].title : null);
  }

  showPaper(title, body, clueTitle) {
    $('paperTitle').textContent = title;
    $('paperBody').innerHTML = body.replace(/\n/g, '\n');
    $('paperClue').textContent = clueTitle ? `✦ Entered into evidence: ${clueTitle}` : '';
    this.setModal('paper');
  }

  closePaper() {
    const id = this._currentDoc;
    this.setModal(null);
    if (this.onDocClosed) this.onDocClosed(id);
  }

  /* ---------- journal ---------- */
  openJournal() {
    this.renderJournal();
    this.setModal('journal');
  }

  renderJournal() {
    const page = $('journalPage');
    const g = this.game;
    if (this.journalTab === 'clues') {
      const found = Object.keys(CLUES).filter(c => g.clues.has(c));
      let html = '<h3>Evidence</h3>';
      if (!found.length) html += '<div class="d" style="opacity:.5;font-style:italic">Nothing yet. The house is keeping its secrets — search desks, shelves, floors and walls.</div>';
      for (const c of found) {
        html += `<div class="clueitem"><div class="t">${CLUES[c].core ? '✦ ' : ''}${CLUES[c].title}</div><div class="d">${CLUES[c].desc}</div></div>`;
      }
      const missing = Object.keys(CLUES).filter(c => CLUES[c].core && !g.clues.has(c)).length;
      if (missing) html += `<div style="margin-top:18px;font-style:italic;font-size:14px;color:rgba(207,198,176,.4)">The case wants ${missing} more piece${missing > 1 ? 's' : ''} of material evidence.</div>`;
      page.innerHTML = html;
    } else if (this.journalTab === 'objectives') {
      let html = '<h3>Lines of Inquiry</h3>';
      for (const o of OBJECTIVES) {
        html += `<div class="objitem ${o.done(g) ? 'done' : ''}">${o.text}</div>`;
      }
      page.innerHTML = html;
    } else if (this.journalTab === 'keys') {
      let html = '<h3>Keys</h3>';
      if (!g.keys.size) html += '<div style="opacity:.5;font-style:italic;font-size:14px">No keys yet. Locked doors remember who kept their keys.</div>';
      for (const k of g.keys) {
        if (KEYS[k]) html += `<div class="keyitem" title="${KEYS[k].desc}">🗝 ${KEYS[k].name}</div>`;
      }
      html += '<div style="margin-top:22px;font-size:13px;opacity:.5;font-style:italic">Hover a key for where it came from.</div>';
      page.innerHTML = html;
    } else {
      let html = '<h3>Persons of Interest</h3>';
      for (const p of PERSONS) {
        html += `<div class="clueitem"><div class="t">${p.name}</div><div class="d">${p.note}</div></div>`;
      }
      page.innerHTML = html;
    }
  }

  /* ---------- accusation ---------- */
  openAccuse() {
    const el = $('accuse');
    this.answers = {};
    let html = `<h2>SPEAK THE TRUTH</h2><div class="whisper">${ACCUSE.intro}</div><div class="qs">`;
    for (const q of ACCUSE.questions) {
      html += `<div class="q"><div class="ql">${q.label}</div><div class="opts">`;
      for (const o of q.options) {
        html += `<div class="opt" data-q="${q.id}" data-o="${o.id}">${o.text}</div>`;
      }
      html += '</div></div>';
    }
    html += `</div><button class="declare" id="declareBtn" disabled>So it happened</button>`;
    el.innerHTML = html;
    el.querySelectorAll('.opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const q = opt.dataset.q;
        this.answers[q] = opt.dataset.o;
        el.querySelectorAll(`.opt[data-q="${q}"]`).forEach(o2 => o2.classList.toggle('sel', o2 === opt));
        $('declareBtn').disabled = Object.keys(this.answers).length < ACCUSE.questions.length;
      });
    });
    $('declareBtn').addEventListener('click', () => {
      const correct = ACCUSE.questions.every(q => this.answers[q.id] === q.answer);
      this.setModal(null);
      if (this.onAccuse) this.onAccuse(correct);
      if (correct) setTimeout(() => this.showEnding(), 2600);
    });
    this.setModal('accuse');
  }

  /* ---------- ending ---------- */
  showEnding() {
    this.setModal('ending');
    const el = $('endingTxt');
    el.textContent = ENDINGS.win;
    requestAnimationFrame(() => { el.style.opacity = 1; });
  }
}
