// GOODFIRE screens.js — title, lookout hub (calendar + logbook), ledger ceremony,
// winter card, epilogue framing. Screens own a single overlay canvas and draw with
// plain 2D text in the two-register voice; the live game renders beneath where the
// scene calls for it (title = ambient mountain at dawn). Input is never stolen: every
// ceremony line advances on any input, and nothing here pauses the sim.

import { CEREMONY, TICK_HZ } from './canon.js';
import { FIRES, RX_UNITS } from './season.js';
import { LINES, TYPE_CPS } from './radio.js';
import { countCompleted } from './save.js';

const CREAM = '#f2e9d8', EMBER = '#e07a35', DIM = 'rgba(242,233,216,0.55)',
      PAPER = '#e8dfc8', INK = '#2b2620', RED = '#d1452e';
const MONO = "13px ui-monospace, 'Cascadia Code', Consolas, monospace";

// the two rx gaps and the authored window strings they open (season.js RX_UNITS.windows).
// A unit offered outside its window is a lie the picker used to tell in both gaps.
export const RX_WINDOW = Object.freeze({ five: 'sep1-8', six: 'sep20-30' });

const CHORUS_TICKS = 8 * TICK_HZ;   // PROVISIONAL: canon-final §9 — audio's roll-call rebuild is ~8 s
const STAMP_BEAT_TICKS = TICK_HZ;   // PROVISIONAL: 1 s of quiet before a chorusless stamp (rx)
const READ_BEAT_TICKS = 45;         // PROVISIONAL: 1.5 s to read a finished line before a card leaves

// Ceremony clocks count 30 Hz TICKS, but tick() is called once per rAF FRAME — so main.js
// hands us the frame's length in ticks. Counting frames instead made every ceremony run at
// the display's mercy: 2× fast on a 60 Hz panel, 4.8× on a 144 Hz one, which truncated her
// lines mid-word and stamped the medal through the middle of the birds.

export function createScreens(container, viewport) {
  const cv = document.createElement('canvas');
  cv.style.zIndex = 40;
  container.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = viewport.w, H = viewport.h, DPR = Math.min(2, window.devicePixelRatio || 1);
  function resize(w, h) {
    W = w; H = h;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize(W, H);

  const text = (s, x, y, { size = 13, color = CREAM, ls = 0, align = 'left', font = 'ui-monospace, Consolas, monospace' } = {}) => {
    ctx.font = `${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    if (ls > 0) {
      // letter-spaced (liturgy register)
      const chars = [...s];
      const wAll = chars.reduce((a, c) => a + ctx.measureText(c).width + ls, 0);
      let cx = align === 'center' ? x - wAll / 2 : x;
      ctx.textAlign = 'left';
      for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + ls; }
    } else ctx.fillText(s, x, y);
  };
  const clear = () => ctx.clearRect(0, 0, W, H);
  const dim = (a = 0.55) => { ctx.fillStyle = `rgba(16,12,9,${a})`; ctx.fillRect(0, 0, W, H); };

  // ---------- TITLE ----------
  function titleScreen(app) {
    let t = 0;
    const items = () => {
      const has = !!app.save && countCompleted(app.save) + (app.save.nextFire > 0 ? 1 : 0) > 0;
      const list = [];
      list.push({ id: 'begin', label: app.save && app.save.seasonClosed ? 'begin another season' : (has ? 'begin the season (new save)' : 'begin the season') });
      if (has && !app.save.seasonClosed) list.push({ id: 'continue', label: `continue — ${FIRES[Math.min(6, app.save.nextFire)].date}` });
      if (has) list.push({ id: 'logbook', label: 'the logbook' });
      return list;
    };
    let sel = 0, confirmNew = false;
    return {
      name: 'title',
      tick() { t++; },
      render() {
        clear();
        dim(0.52); // the mountain shows through, the words stay legible
        text('GOODFIRE', W / 2, H * 0.30, { size: 42, color: EMBER, ls: 14, align: 'center' });
        text('a season on ninemile mountain', W / 2, H * 0.30 + 30, { color: DIM, align: 'center', ls: 2 });
        const list = items();
        list.forEach((it, k) => {
          const y = H * 0.52 + k * 30;
          const on = k === sel;
          text((on ? '· ' : '  ') + it.label + (on ? ' ·' : ''), W / 2, y,
            { align: 'center', color: on ? CREAM : DIM, size: 14 });
        });
        if (confirmNew)
          text('new season? the ledger keeps. the mountain starts over.  (enter = yes · esc = no)',
            W / 2, H * 0.52 + list.length * 30 + 34, { align: 'center', color: EMBER });
        text('wasd move · lmb cut line · rmb drip torch · space stomp · x give ground · g the tanker · m the tower',
          W / 2, H - 28, { align: 'center', color: 'rgba(242,233,216,0.35)', size: 11 });
      },
      input(ev) {
        if (ev.type === 'key') {
          const list = items();
          if (ev.key === 'ArrowDown' || ev.key === 's') sel = (sel + 1) % list.length;
          if (ev.key === 'ArrowUp' || ev.key === 'w') sel = (sel + list.length - 1) % list.length;
          if (ev.key === 'Escape') confirmNew = false;
          if (ev.key === 'Enter' || ev.key === ' ') {
            const it = list[sel];
            if (it.id === 'begin') {
              const hasProgress = app.save && (countCompleted(app.save) > 0 || app.save.nextFire > 0);
              if (hasProgress && !confirmNew) { confirmNew = true; return; }
              app.newSeason();
            } else if (it.id === 'continue') app.continueSeason();
            else if (it.id === 'logbook') app.openLookout('logbook');
          }
        }
      },
      exit() { clear(); },
    };
  }

  // ---------- LOOKOUT (calendar + logbook) ----------
  function lookoutScreen(app, tab = 'calendar') {
    let sel = 0;
    const entries = () => {
      const list = [];
      for (let k = 0; k < FIRES.length; k++) {
        const f = FIRES[k], st = app.save.fires[k];
        if (st.status === 'done') list.push({ kind: 'done', k, label: `${f.date} — ${(f.calendarLine || '').replace('{medal}', st.bestMedal || '')}` });
        else if (k === app.save.nextFire) list.push({ kind: 'next', k, label: `${f.date} — smoke reported — ${f.name}. answer it.` });
        else list.push({ kind: 'later', k, label: `${f.date} — · · ·` });
      }
      // rx windows
      if (app.save.sawTwist && !app.save.seasonClosed) {
        const gaps = [];
        if (app.save.nextFire === 5 && app.save.rxUsed.five < 2) gaps.push({ kind: 'rx', gap: 'five', label: `sep — rx window (${2 - app.save.rxUsed.five} left) — pick a unit.` });
        if (app.save.nextFire === 6 && app.save.rxUsed.six < 2) gaps.push({ kind: 'rx', gap: 'six', label: `sep — rx window (${2 - app.save.rxUsed.six} left) — pick a unit.` });
        for (const g of gaps) list.splice(app.save.nextFire, 0, g);
      }
      if (app.save.seasonClosed && !app.save.epilogueSeen)
        list.push({ kind: 'epilogue', label: 'april. — walk the mountain.' });
      list.push({ kind: 'back', label: '(title)' });
      return list;
    };
    let rxPick = null; // list of units when picking
    return {
      name: 'lookout',
      tick() {},
      render() {
        clear(); dim(0.62);
        text('NINEMILE LOOKOUT', W / 2, 64, { size: 18, color: CREAM, ls: 6, align: 'center' });
        text('dispatch log — v. hollis', W / 2, 86, { color: DIM, align: 'center', size: 11 });
        text('nine miles of road to climb four as the crow flies. the crow is not impressed.',
          W / 2, 104, { color: 'rgba(242,233,216,0.30)', align: 'center', size: 11 });
        const list = rxPick || entries();
        const y0 = 150;
        list.forEach((it, k) => {
          const on = k === sel;
          let color = on ? CREAM : DIM;
          if (it.kind === 'later') color = 'rgba(242,233,216,0.25)';
          if (it.kind === 'next' || it.kind === 'rx') color = on ? EMBER : 'rgba(224,122,53,0.75)';
          text((on ? '· ' : '  ') + it.label, W / 2 - 300, y0 + k * 26, { color, size: 13 });
        });
        if (app.save.towerScorched)
          text('(the tower wears last july. it is not discussed.)', W / 2, H - 40, { align: 'center', color: 'rgba(242,233,216,0.25)', size: 11 });
      },
      input(ev) {
        if (ev.type !== 'key') return;
        const list = rxPick || entries();
        if (ev.key === 'ArrowDown' || ev.key === 's') sel = (sel + 1) % list.length;
        if (ev.key === 'ArrowUp' || ev.key === 'w') sel = (sel + list.length - 1) % list.length;
        if (ev.key === 'Escape') { if (rxPick) { rxPick = null; sel = 0; } else app.toTitle(); }
        if (ev.key === 'Enter' || ev.key === ' ') {
          const it = list[sel];
          if (rxPick) {
            if (it.kind === 'unit') app.startRx(it.unit, rxPick.gap);
            else { rxPick = null; sel = 0; }
            return;
          }
          if (it.kind === 'next') app.startFire(it.k);
          else if (it.kind === 'done') app.showLedgerPage(it.k);
          else if (it.kind === 'rx') {
            const win = RX_WINDOW[it.gap];
            const units = RX_UNITS.filter(u => !app.save.rxDone.includes(u.id) && u.windows.includes(win))
              .map(u => ({ kind: 'unit', unit: u, label: `${u.id} — ${u.name} (${u.acres} ac) — ${u.payoff}` }));
            units.push({ kind: 'back', label: '(leave it)' });
            units.gap = it.gap;
            rxPick = units; sel = 0;
          } else if (it.kind === 'epilogue') app.startEpilogue();
          else if (it.kind === 'back') app.toTitle();
        }
      },
      exit() { clear(); },
    };
  }

  // ---------- the page itself (shared by the ceremony and the logbook) ----------
  const PAGE = (extra = 0) => { // → {px,py,pw,ph}: the sheet, centered, room reserved below
    const pw = Math.min(640, W - 80), px = (W - pw) / 2, py = 60, ph = H - 120 - extra;
    return { px, py, pw, ph };
  };
  function drawSheet(p) {
    ctx.fillStyle = 'rgba(16,12,9,0.78)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PAPER;
    ctx.fillRect(p.px, p.py, p.pw, p.ph);
    ctx.strokeStyle = 'rgba(43,38,32,0.35)'; ctx.strokeRect(p.px + 8, p.py + 8, p.pw - 16, p.ph - 16);
  }
  // one typed row of the ledger. Returns the y advance. 'medal' never comes through here —
  // the medal is stamped after the birds, never typed with the rows (canon-final §9).
  function drawRow(ln, p, y) {
    const style = ln.style || 'row';
    if (style === 'header') { text(ln.text, p.px + 36, y, { color: INK, size: 15, ls: 1 }); return 30; }
    if (style === 'strike') {
      text(ln.text, p.px + 48, y, { color: 'rgba(43,38,32,0.55)', size: 12 });
      const w = ctx.measureText(ln.text).width;
      ctx.strokeStyle = 'rgba(160,40,30,0.8)';
      ctx.beginPath(); ctx.moveTo(p.px + 46, y - 4); ctx.lineTo(p.px + 50 + w, y - 4); ctx.stroke();
    } else if (style === 'given') text(ln.text, p.px + 48, y, { color: 'rgba(90,60,40,0.9)', size: 12 });
    else if (style === 'audit') text(ln.text, p.px + 48, y, { color: INK, size: 12 });
    else text(ln.text, p.px + 36, y, { color: INK, size: 12 });
    return 20;
  }
  const drawStamps = (stamps, p, y0) =>
    stamps.forEach((s, i) => text(s, p.px + p.pw / 2, y0 + i * 22, { color: RED, size: 15, ls: 4, align: 'center' }));

  // ---------- LEDGER CEREMONY ----------
  // opts: { retro, chorusless (rx stamp: no birds to rebuild), intro (radio id — the
  //         dispatcher's opening), radioId (her line ON the card), onDone }
  function ledgerScreen(app, result, opts = {}) {
    // result.ledger: { lines:[{text,style}], chorus:{tier,value}|null, medal }
    const L = result.ledger;
    const retro = !!opts.retro;
    // the rows type; the medal-styled lines are held back and STAMPED once, after the birds
    const rows = L.lines.filter(l => l.style !== 'medal');
    const stamps = L.lines.filter(l => l.style === 'medal').map(l => l.text);
    if (!stamps.length && L.medal) stamps.push(L.medal);
    const chorusless = !!opts.chorusless || !L.chorus;
    const introText = opts.intro ? LINES[opts.intro] : null;
    const whisper = opts.radioId ? LINES[opts.radioId] : null;
    const onDone = opts.onDone || (() => app.afterLedger(result, retro));
    const stampTicks = chorusless ? STAMP_BEAT_TICKS : CHORUS_TICKS; // the birds' roll-call, or one beat
    let shown = 0, t = 0, chorusT = -1, done = false, opened = false;
    const lineDelay = 14; // ticks between typed rows (any input → instant)
    return {
      name: 'ledger',
      tick(dt = 1) {
        t += dt;
        if (!opened) { opened = true; if (introText && app.audio) app.audio.radioKey(); } // squelch opens the book
        if (shown < rows.length) {
          const want = Math.min(rows.length, Math.floor(t / lineDelay));
          while (shown < want) { shown++; if (app.audio) app.audio.typeTick(); }
        } else if (chorusT < 0) { chorusT = t; if (app.audio && !chorusless) app.audio.chord('ledger'); }
        else if (!done && t - chorusT >= stampTicks) { done = true; if (app.audio && stamps.length) app.audio.chord('medal'); }
      },
      render() {
        clear();
        const p = PAGE();
        drawSheet(p);
        if (introText) { // she types at 18 cps up here whatever the page is doing
          const n = Math.floor(t / TICK_HZ * TYPE_CPS);
          text(introText.slice(0, n), W / 2, 40, { color: DIM, size: 12, align: 'center' });
        }
        let y = p.py + 48;
        for (let k = 0; k < shown && k < rows.length; k++) y += drawRow(rows[k], p, y);
        // chorus performance — the audio rebuilds the birds, the page counts them in
        const base = p.py + p.ph;
        if (!chorusless && chorusT > 0) {
          const ct = Math.min(1, (t - chorusT) / CHORUS_TICKS);
          const birds = Math.floor(ct * 12);
          let bs = '';
          for (let b = 0; b < 12; b++) bs += b < birds ? '♪ ' : '· ';
          text(bs, p.px + p.pw / 2, base - 96, { color: 'rgba(43,38,32,0.7)', align: 'center', size: 13 });
          if (ct >= 1) text(L.chorus.tier + '.', p.px + p.pw / 2, base - 70, { color: INK, size: 14, ls: 3, align: 'center' });
        }
        if (done && whisper) text(whisper, p.px + p.pw / 2, base - 70, { color: 'rgba(43,38,32,0.6)', size: 12, align: 'center' });
        if (done) {
          drawStamps(stamps, p, base - 20 - (stamps.length - 1) * 22);
          text('(any key)', W / 2, H - 24, { align: 'center', color: DIM, size: 11 });
        }
      },
      input(ev) {
        if (ev.type !== 'key' && ev.type !== 'mouse') return;
        if (shown < rows.length) { shown = rows.length; return; }
        if (chorusT > 0 && !done && t - chorusT > READ_BEAT_TICKS) { done = true; return; }
        if (done) onDone();
      },
      exit() { clear(); },
    };
  }

  // ---------- LOGBOOK PAGE (a completed fire, re-read; the door back to that morning) ----------
  // rec: save.fires[k] — { lastLedger:{lines,chorus,medal}, bestMedal, retold }
  function logbookScreen(app, k, rec) {
    const fire = FIRES[k];
    const page = rec.lastLedger;
    const post = !!app.save.seasonClosed;
    const rows = page ? page.lines.filter(l => l.style !== 'medal') : [];
    const stamps = page ? page.lines.filter(l => l.style === 'medal').map(l => l.text)
                        : (rec.bestMedal ? [rec.bestMedal] : []);
    // The templates supply their own article, and FIRES[].name carries one ('the bride creek
    // fire') — strip it or she says "the the", exactly as game.js does for D-38's {name}.
    const name = fire.name.replace(/^the /, '');
    // in-season the copy is authored (spec-season §18); the winter retelling's is PROVISIONAL
    const prompt = post
      ? `tell the ${name} again? the mountain keeps its scars either way. (only the shelf can change.)`
      : `re-fight the ${name}? the season picks it up from that morning — later pages come out of the book. (best medals stay on the shelf.)`;
    const buttons = [post ? 'tell it again' : 'tear the pages', 'leave it'];
    let sel = 1; // 'leave it' is the default — tearing pages is a thing you choose twice
    return {
      name: 'logbook',
      tick() {},
      render() {
        clear();
        const p = PAGE(52); // the prompt gets the foot of the screen, off the paper
        drawSheet(p);
        let y = p.py + 48;
        for (const ln of rows) y += drawRow(ln, p, y);
        if (!page) text('(the page is lost. the medal is not.)', p.px + 36, y, { color: 'rgba(43,38,32,0.6)', size: 12 });
        const base = p.py + p.ph;
        if (page && page.chorus) text(page.chorus.tier + '.', p.px + p.pw / 2, base - 70, { color: INK, size: 14, ls: 3, align: 'center' });
        if (rec.retold) text('retold', p.px + p.pw - 90, p.py + 40, { color: 'rgba(160,40,30,0.55)', size: 12, ls: 2 });
        drawStamps(stamps, p, base - 20 - (stamps.length - 1) * 22);
        text(prompt, W / 2, H - 44, { align: 'center', color: DIM, size: 12 });
        let bx = W / 2 - 110;
        buttons.forEach((b, i) => {
          const on = i === sel;
          text((on ? '· ' : '  ') + b + (on ? ' ·' : ''), bx + i * 190, H - 20,
            { color: on ? (i === 0 ? EMBER : CREAM) : DIM, size: 13 });
        });
      },
      input(ev) {
        if (ev.type !== 'key') return;
        if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'ArrowRight' || ev.key === 'd') sel = 1 - sel;
        if (ev.key === 'Escape') return app.openLookout();
        if (ev.key === 'Enter' || ev.key === ' ') {
          if (sel === 0) app.refightFire(k);
          else app.openLookout();
        }
      },
      exit() { clear(); },
    };
  }

  // ---------- WINTER CARD ----------
  // opts.radioId: her line under the word (D-48 — she says it as the season closes)
  function winterScreen(app, opts = {}) {
    let t = 0;
    const line = opts.radioId ? LINES[opts.radioId] : null;
    // the card waits out her line (at 18 cps) plus a beat to read it — never less than the
    // wordless card's own 5 s. She does not get cut off saying the season is over.
    const holdTicks = Math.max(5 * TICK_HZ,
      line ? Math.ceil(line.length / TYPE_CPS * TICK_HZ) + READ_BEAT_TICKS : 0);
    return {
      name: 'winter',
      tick(dt = 1) { t += dt; if (t > holdTicks) app.toLookout(); },
      render() {
        clear(); dim(0.85);
        text('WINTER.', W / 2, H / 2, { size: 26, color: CREAM, ls: 10, align: 'center' });
        if (line) { // typed at her speed, so the card is her voice and not a title screen
          const n = Math.floor(t / TICK_HZ * TYPE_CPS);
          text(line.slice(0, n), W / 2, H / 2 + 34, { color: DIM, size: 12, align: 'center' });
        }
      },
      input(ev) { if (t > 20) app.toLookout(); },
      exit() { clear(); },
    };
  }

  // ---------- PAUSE HINT ----------
  // Non-modal by law (canon-final §8/§9): no dim, no box, no menu — one lowercase word so
  // a paused game can never read as a hang. Owns the screens canvas only when no screen does.
  let pauseShown = false;
  function pauseHint(on) {
    if (!on) { if (pauseShown) { clear(); pauseShown = false; } return; }
    clear(); // text is drawn semi-transparent: re-stacking it every frame would darken it
    text('paused', W / 2, H - 46, { align: 'center', color: DIM, size: 13, ls: 3 });
    text('(esc or p)', W / 2, H - 30, { align: 'center', color: 'rgba(242,233,216,0.30)', size: 11 });
    pauseShown = true;
  }

  return { titleScreen, lookoutScreen, ledgerScreen, logbookScreen, winterScreen, pauseHint,
           resize, canvas: cv };
}
