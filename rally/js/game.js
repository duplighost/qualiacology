// RALLY — sim + render + states. One verb: move your hand through the ball.
(() => {
const C = window.CFG, A = window.AUDIO, RIV = window.RIVALS, DLG = window.DIALOGUE;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, l, dt) => b + (a - b) * Math.exp(-l * dt);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- persistent ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('rally_v1_' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rally_v1_' + k, JSON.stringify(v)); } catch {} },
};

// ---------- state ----------
const S = {
  mode: 'title',          // title | vignette | serve | rally | point | burnout | finale | ending | duet
  rivalIdx: 0,
  rival: RIV[0],
  score: { p: 0, r: 0 },
  server: 'p',
  rally: 0,
  bestRallyThisPoint: 0,
  longestRally: 0,
  coop: false,            // finale / duet: nobody scores, everyone wins
  finaleBars: 0,
  duet: false,
  duetBest: store.get('duetBest', 0),
  finished: store.get('done', false),
  serveTimer: 0,
  pointTimer: 0,
  tossed: false,          // serve toss is in the air, pre-first-contact
  calloutsFired: new Set(),
  julesMemory: { lob: 0, drive: 0, drop: 0 },  // what beat you (jules remembers)
  ended: false,
};

// ---------- time ----------
let last = 0, acc = 0;
const DT = 1 / 120;
let timeScale = 1, slowmoT = 0, slowmoV = 1, hitstop = 0;
let trauma = 0, zoom = 1, tNow = 0;

// ---------- entities ----------
const ball = { x: 300, y: 300, vx: 0, vy: 0, spin: 0, alive: false, lastHit: null, trail: [], visible: false };
const mittP = { x: 300, y: 480, px: 300, py: 480, vx: 0, vy: 0, cool: 0, hist: [], ghosts: [] };
const mittR = { x: 980, y: 480, vx: 0, vy: 0, cool: 0, home: { x: 1000, y: 470 }, plan: null, react: 0, ghosts: [], face: 'idle', faceT: 0, blink: 0 };
const cursor = { x: 300, y: 480, inside: false };
let netWobble = 0, netWobbleV = 0;
const particles = [];

// ---------- input ----------
function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * C.W, y: (e.clientY - r.top) / r.height * C.H };
}
window.addEventListener('pointermove', e => {
  const w = toWorld(e); cursor.x = w.x; cursor.y = w.y; cursor.inside = true;
});
window.addEventListener('pointerdown', e => {
  A.resume();   // any gesture re-arms audio after an OS/browser interruption
  if (S.mode === 'title' || S.mode === 'vignette' || S.mode === 'ending') return; // DOM handles
  const w = toWorld(e); cursor.x = w.x; cursor.y = w.y;
  if (S.mode === 'serve' && S.server === 'p' && !S.tossed && !ball.alive) playerToss();
});
document.addEventListener('visibilitychange', () => {
  // hide = pause the whole audio clock (music resumes mid-bar on return; the sim
  // freezes with rAF anyway, so the song and the ball stay in agreement)
  if (!A.ready) return;
  if (document.hidden) A.suspend(); else A.resume();
});
window.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') {
    // preventDefault only where the game consumes the key — a lingering focused button
    // must never be re-activated by gameplay keys, but Tab+Enter on the visible title
    // buttons still works for keyboard users
    if (S.mode === 'vignette') { e.preventDefault(); advanceDialog(); }
    else if (S.mode === 'serve' && S.server === 'p' && !S.tossed && !ball.alive) { e.preventDefault(); playerToss(); }
  }
  if (e.key === 'm' || e.key === 'M') {
    const m = A.toggleMute();
    showCallout(m ? 'sound off' : 'sound on', 'soft');
  }
});
window.addEventListener('blur', () => { /* nothing time-critical persists on blur; sim clamps dt */ });

// ---------- juice helpers ----------
function addTrauma(t) { trauma = clamp(trauma + (C.REDUCED_MOTION ? t * 0.15 : t), 0, 1); }
function stopFor(ms) { if (ms > 0) hitstop = Math.max(hitstop, ms / 1000); }
function slowmo(scale, t) { if (C.REDUCED_MOTION) return; slowmoV = scale; slowmoT = t; }
function burst(x, y, n, col, spd = 300, life = 0.5, up = 0) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, life: life * (0.5 + Math.random() * 0.5), t: 0, col, r: 1.5 + Math.random() * 2.5 });
  }
}

// ---------- DOM UI ----------
function showCallout(txt, cls = '') {
  const el = document.createElement('div');
  el.className = 'callout ' + cls; el.textContent = txt;
  $('callouts').appendChild(el);
  void el.offsetWidth; el.classList.add('in');
  setTimeout(() => el.remove(), 1600);
}
function setHint(txt) { $('hint').textContent = txt || ''; $('hint').classList.toggle('on', !!txt); }
function updateScoreboard() {
  if (S.coop) {
    $('sb-left').textContent = 'you'; $('sb-right').textContent = 'jules';
    $('sb-score').textContent = '∞';
    return;
  }
  $('sb-left').textContent = 'you'; $('sb-right').textContent = S.rival.name.toLowerCase();
  $('sb-score').textContent = S.score.p + ' — ' + S.score.r;
}

// ---------- dialogue ----------
let dlgQueue = [], dlgPos = 0, dlgThen = null, duetReserveIdx = 0;
function startDialog(lines, then) {
  dlgQueue = lines; dlgPos = 0; dlgThen = then;
  S.mode = 'vignette';
  $('dialog').classList.add('on');
  renderDialogLine();
}
function renderDialogLine() {
  const [who, text] = dlgQueue[dlgPos];
  const r = RIV.find(x => x.id === who);
  $('dlg-name').textContent = who === 'you' ? 'you' : who === 'voice' ? '' : who;
  $('dlg-name').style.color = r ? r.color : '#f3e9d2';
  $('dlg-swatch').style.background = r ? r.color : 'transparent';
  $('dlg-swatch').style.display = r ? 'inline-block' : 'none';
  $('dlg-text').textContent = text;
}
function advanceDialog() {
  A.ui();
  dlgPos++;
  if (dlgPos >= dlgQueue.length) {
    $('dialog').classList.remove('on');
    const f = dlgThen; dlgThen = null;
    if (f) f();
  } else renderDialogLine();
}
$('dialog').addEventListener('pointerdown', e => { e.stopPropagation(); advanceDialog(); });
$('rivalcard').addEventListener('pointerdown', e => { e.stopPropagation(); dismissRivalCard(); });

// ---------- flow ----------
function startLadder() {
  S.rivalIdx = 0; S.duet = false; S.ended = false; S.finaleBars = 0;
  $('endcard').classList.remove('on');
  $('songbar').classList.remove('on');
  $('duet-rally').classList.remove('on');
  startMatch(0, true);
}
function startMatch(idx, withPre) {
  S.rivalIdx = idx; S.rival = RIV[idx];
  S.score.p = 0; S.score.r = 0; S.server = 'p'; S.coop = false;
  A.setRival(S.rival);
  updateScoreboard();
  $('scoreboard').classList.remove('burning');   // defensive: never let the burn state leak
  $('scoreboard').classList.add('on');
  const go = () => beginServe();
  // withPre: show the rival's nameplate (NAME + small-caps title), then the vignette.
  // Four crisp epithets teach the pattern so "you know jules" breaks it on screen.
  if (withPre) showRivalCard(S.rival, () => startDialog(DLG['pre_' + S.rival.id], go));
  else go();
}

// ---------- rival nameplate ----------
let rcTimer = null, rcThen = null;
function showRivalCard(rival, then) {
  S.mode = 'vignette';                 // block canvas input; auto-advances
  $('rc-name').textContent = rival.name;
  $('rc-name').style.color = rival.color;
  $('rc-title').textContent = rival.title;
  $('rivalcard').classList.add('on');
  rcThen = then;
  clearTimeout(rcTimer);
  rcTimer = setTimeout(dismissRivalCard, 2100);
}
function dismissRivalCard() {
  clearTimeout(rcTimer); rcTimer = null;
  const card = $('rivalcard');
  if (!card.classList.contains('on')) return;   // guard: manual skip + timer can't double-fire
  card.classList.remove('on');
  const then = rcThen; rcThen = null;
  setTimeout(() => { if (then) then(); }, 340);  // let it fade before the dialogue opens
}
function beginServe(keepFaults) {
  S.mode = 'serve';
  if (!keepFaults) S.serveFaults = 0;
  S.rally = 0; S.calloutsFired.clear(); S.tossed = false;
  ball.alive = false; ball.visible = false; ball.trail.length = 0; ball.spin = 0;
  mittP.cool = 0; mittR.cool = 0; mittR.plan = null;
  S.serveTimer = S.server === 'r' || S.coop ? C.SERVE_DELAY_AI : 0;
  if (S.server === 'p' && !S.coop) setHint('click to toss — then swing through the ball');
  else setHint('');
}
function playerToss() {
  S.tossed = true;
  ball.x = mittP.x; ball.y = mittP.y - 52;   // spawns OUTSIDE mitt radius (43px) — no self-contact
  ball.vx = 0; ball.vy = C.TOSS_VY; ball.spin = 0;
  ball.alive = true; ball.visible = true; ball.lastHit = null;
  A.toss(); setHint('');
  S.mode = 'rally';
}
function rivalToss() {
  S.tossed = true;
  ball.x = mittR.x; ball.y = mittR.y - 52;
  ball.vx = 0; ball.vy = C.TOSS_VY; ball.spin = 0;
  ball.alive = true; ball.visible = true; ball.lastHit = null;
  A.toss();
  S.mode = 'rally';
  mittR.plan = { type: 'serve', t: 0.42 };
}

function pointEnds(loser, why) {
  // loser = side whose court failed ('p' or 'r'); null in coop (nobody loses)
  window.__rally.lastDeath = { x: ball.x | 0, y: ball.y | 0, lastHit: ball.lastHit, loser, why: why || 'floor-or-edge', rally: S.rally };
  A.cutMusic();
  ball.alive = false;
  addTrauma(C.SHAKE_POINT);
  S.longestRally = Math.max(S.longestRally, S.rally);
  if (S.coop) {
    // the ball died; the song pauses; jules waits
    if (S.duet) {
      if (S.rally > 4 && S.rally >= S.duetBest) showCallout('best rally — ' + S.duetBest, 'warm');
      else showCallout(DLG.duet_reserve[duetReserveIdx++ % DLG.duet_reserve.length], 'soft');
      $('duet-rally').textContent = 'rally 0  ·  best ' + S.duetBest;
    } else {
      showCallout(DLG.finale_drop, 'soft');   // the one rally where failing gets a voice
    }
    S.rally = 0;
    S.server = 'r';
    S.mode = 'point'; S.pointTimer = 0.9;
    return;
  }
  const winner = loser === 'p' ? 'r' : 'p';
  // jules remembers what beat you (drive/lob/drop weights feed the aim table)
  if (winner === 'r' && ball.lastHit === 'r' && S.lastRivalShot) {
    const kind = S.lastRivalShot === 'lob' ? 'lob' : S.lastRivalShot === 'drop' ? 'drop' : 'drive';
    S.julesMemory[kind] = Math.min(S.julesMemory[kind] + 0.5, 2.5);
  }
  S.score[winner]++;
  updateScoreboard();
  mittR.face = winner === 'r' ? 'happy' : 'sad'; mittR.faceT = 1.2;
  const flash = $('sb-' + (winner === 'p' ? 'left' : 'right'));
  flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash');
  showCallout(why || (winner === 'p' ? 'your point' : S.rival.name.toLowerCase() + "'s point"), 'soft');
  S.mode = 'point'; S.pointTimer = 1.35;
}

function afterPoint() {
  const need = C.MATCH_POINTS[S.rivalIdx];
  if (S.coop) { beginServe(); return; }
  // jules finale trigger: player reaches match point
  if (S.rival.id === 'jules' && S.score.p === need - 1 && !S.ended) { startBurnout(); return; }
  if (S.score.p >= need) { matchWon(); return; }
  if (S.score.r >= need) { matchLost(); return; }
  S.server = S.server === 'p' ? 'r' : 'p';
  beginServe();
}
function matchWon() {
  $('scoreboard').classList.remove('on');
  const id = S.rival.id;
  const next = S.rivalIdx + 1;
  if (next >= RIV.length) { startBurnout(); return; }   // never index past the ladder
  startDialog(DLG['post_' + id], () => startMatch(next, true));
}
function matchLost() {
  $('scoreboard').classList.remove('on');
  const line = DLG.retry[S.rival.id][0];
  startDialog([[S.rival.id, line]], () => startMatch(S.rivalIdx, false));
}

// ---------- burnout + finale ----------
function startBurnout() {
  S.mode = 'burnout'; S.pointTimer = 2.3;
  A.burnout();
  $('scoreboard').classList.add('burning');
  addTrauma(0.5);
}
function startFinale() {
  $('scoreboard').classList.remove('burning');
  $('scoreboard').classList.remove('on');
  startDialog(DLG.finale, () => {
    S.coop = true; S.finaleBars = 0; S.server = 'r';
    $('songbar').classList.add('on');
    updateSongbar();
    beginServe();
  });
}
function updateSongbar() {
  const f = $('songbar-fill');
  f.style.width = clamp(S.finaleBars / C.FINALE_BARS * 100, 0, 100) + '%';
}
// finale bar progress runs on the SIM clock, not the audio clock — the song must be
// completable even if the AudioContext stalls (tab switch, blocked audio)
let finaleT = 0;
function tickFinale(dt) {
  if (!S.coop || S.duet || S.mode !== 'rally' || S.ended) return;
  if (S.rally < C.FINALE_MIN_LAYERS) return;
  const barLen = 240 / S.rival.music.bpm;   // 4 beats
  finaleT += dt;
  while (finaleT >= barLen) {
    finaleT -= barLen;
    S.finaleBars++;
    updateSongbar();
    if (S.finaleBars >= C.FINALE_BARS) { endingBegins(); return; }
  }
}
function endingBegins() {
  if (S.ended) return;
  S.ended = true;
  S.mode = 'ending';
  A.cutMusic();
  A.finalChord();
  slowmo(0.22, 2.6);
  // the ball becomes light
  burst(ball.x, ball.y, 60, '#ffe9b0', 260, 1.6, 120);
  burst(ball.x, ball.y, 30, '#f3e9d2', 140, 2.2, 60);
  ball.alive = false; ball.visible = false;
  $('songbar').classList.remove('on');
  S.finished = true; store.set('done', true);
  setTimeout(() => {
    startDialog(DLG.ending, () => {
      $('end-rally').textContent = 'longest rally — ' + S.longestRally;
      $('endcard').classList.add('on');
    });
  }, 2800);
}
$('end-again').addEventListener('click', e => { e.currentTarget.blur(); location.reload(); });
$('end-duet').addEventListener('click', e => {
  e.currentTarget.blur();
  $('endcard').classList.remove('on');
  startDuet();
});

function startDuet() {
  S.duet = true; S.coop = true; S.ended = false;
  S.rival = RIV[4]; S.rivalIdx = 4;
  A.setRival(S.rival);
  S.longestRally = 0;
  $('scoreboard').classList.remove('on');
  $('duet-rally').classList.add('on');
  $('duet-rally').textContent = 'rally 0  ·  best ' + S.duetBest;
  S.server = 'r';
  beginServe();
}

// ---------- contact ----------
function tryContact(mitt, side) {
  if (!ball.alive || mitt.cool > 0) return;
  // swept circle test: relative motion of ball vs mitt across this substep
  const rs = C.BALL_R + C.MITT_R;
  const rx = ball.x - mitt.x, ry = ball.y - mitt.y;
  const d2 = rx * rx + ry * ry;
  if (d2 > rs * rs) {
    // sweep: does the relative path cross within the sum radius this step?
    const rvx = (ball.vx - mitt.vx) * DT, rvy = (ball.vy - mitt.vy) * DT;
    const a = rvx * rvx + rvy * rvy;
    if (a < 1e-6) return;
    const t = clamp(-(rx * rvx + ry * rvy) / a, 0, 1);
    const cx = rx + rvx * t, cy = ry + rvy * t;
    if (cx * cx + cy * cy > rs * rs) return;
  }
  // normal from mitt to ball
  let nx = rx, ny = ry; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
  const relvx = ball.vx - mitt.vx, relvy = ball.vy - mitt.vy;
  const vn = relvx * nx + relvy * ny;
  if (vn >= 0 && d2 > rs * rs * 0.8) return;   // separating and not embedded
  // reflect relative velocity, add mitt velocity (the shot IS the hand)
  const rvx2 = relvx - 2 * vn * nx, rvy2 = relvy - 2 * vn * ny;
  ball.vx = rvx2 * C.RESTITUTION + mitt.vx * C.TRANSFER;
  ball.vy = rvy2 * C.RESTITUTION + mitt.vy * C.TRANSFER;
  // spin: tangential mitt-relative velocity at contact
  const tx = -ny, ty = nx;
  const vt = (mitt.vx - ball.vx) * tx + (mitt.vy - ball.vy) * ty;
  ball.spin = clamp(ball.spin * 0.35 + vt * C.SPIN_TRANSFER, -C.SPIN_MAX, C.SPIN_MAX);
  if (side === 'r' && S.rival.ai.spin) ball.spin = clamp(ball.spin + S.rival.ai.spin, -C.SPIN_MAX, C.SPIN_MAX);
  // fuse
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp > C.BALL_MAX_SPEED) { ball.vx *= C.BALL_MAX_SPEED / sp; ball.vy *= C.BALL_MAX_SPEED / sp; }
  // push ball out of mitt
  ball.x = mitt.x + nx * (rs + 1);
  ball.y = mitt.y + ny * (rs + 1);
  mitt.cool = C.HIT_COOLDOWN;
  contactJuice(side, Math.abs(vn));
}

// shared aftermath for any contact: rally accounting, music, callouts, juice
function contactJuice(side, relSpeed) {
  window.__rally.lastContact = {
    side, relSpeed: relSpeed | 0, t: tNow,
    mv: side === 'p' ? { x: mittP.vx | 0, y: mittP.vy | 0 } : { x: mittR.vx | 0, y: mittR.vy | 0 },
    exit: { x: ball.vx | 0, y: ball.vy | 0 }, spin: +ball.spin.toFixed(1),
    at: { x: ball.x | 0, y: ball.y | 0 },
  };
  // rally accounting: only alternating hits count (no self-juggling the meter)
  if (ball.lastHit !== side) {
    S.rally++;
    S.longestRally = Math.max(S.longestRally, S.rally);
    if (!A.playing && A.ready) A.startMusic();
    A.setLayers(S.rally);
    for (const th of C.CALLOUTS) {
      if (S.rally === th && !S.calloutsFired.has(th)) {
        S.calloutsFired.add(th);
        showCallout('rally ×' + th, th >= 15 ? 'big' : '');
        A.callout(C.CALLOUTS.indexOf(th));
      }
    }
    if (S.duet) {
      if (S.rally > S.duetBest) { S.duetBest = S.rally; store.set('duetBest', S.duetBest); }
      $('duet-rally').textContent = 'rally ' + S.rally + '  ·  best ' + S.duetBest;
    }
  }
  ball.lastHit = side;

  A.pok(relSpeed, Math.abs(ball.spin));
  let stop = 0;
  for (const [th, ms] of C.HITSTOP) { if (relSpeed >= th) { stop = ms; break; } }
  const isSave = side === 'p' && ball.y > C.FLOOR - C.SAVE_FLOOR_DIST;
  if (isSave) {
    stop = C.SAVE_HITSTOP;
    slowmo(C.SAVE_SLOWMO, C.SAVE_SLOWMO_T);
    showCallout('save!', 'warm');
    A.saveSting();
  }
  stopFor(stop);
  if (relSpeed > 1200) addTrauma(C.SHAKE_SMASH);
  burst(ball.x, ball.y, Math.min(4 + relSpeed / 120, 18) | 0, side === 'p' ? '#f3e9d2' : S.rival.color, 120 + relSpeed * 0.16, 0.35);
  if (side === 'r') { mittR.face = 'hit'; mittR.faceT = 0.3; }
}

// ---------- rival AI ----------
function predictBall(untilX, maxT = 2.4) {
  // integrate a copy of the ball forward; return earliest reachable state in rival half
  let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy, spin = ball.spin;
  const h = 1 / 60;
  for (let t = 0; t < maxT; t += h) {
    vx += (-C.AIR_DRAG * vx + C.MAGNUS * spin * -vy) * h;
    vy += (C.GRAVITY - C.AIR_DRAG * vy + C.MAGNUS * spin * vx) * h;
    x += vx * h; y += vy * h;
    if (y > C.FLOOR - C.BALL_R) return { x, y: C.FLOOR - C.BALL_R, t, floor: true };
    if (x > untilX && vx > 0) return { x, y, t, floor: false };
    if (x > C.W + 40) break;
  }
  return null;
}
function updateAI(dt) {
  const ai = S.rival.ai;
  const m = mittR;
  m.blink -= dt; if (m.blink < 0) m.blink = 2 + Math.random() * 3;
  if (m.faceT > 0) { m.faceT -= dt; if (m.faceT <= 0) m.face = 'idle'; }

  // serve plan
  if (m.plan && m.plan.type === 'serve') {
    m.plan.t -= dt;
    // drift under the toss
    m.x = damp(m.x, ball.x + 10, 8, dt);
    if (m.plan.t <= 0 && ball.alive) {
      // serves are honest deep drives — the rally starts fair
      swingAt(S.coop ? chooseTarget('rally') : { x: 160 + Math.random() * 260, kind: 'serve' });
      m.plan = null;
    }
    return;
  }

  const incoming = ball.alive && (ball.lastHit === 'p' || (ball.lastHit === null && S.server === 'r'));
  if (!incoming) {
    m.react = ai.react;
    // return home; net-rusher hovers at the net, coop jules keeps a deep goalkeeper post
    const home = S.coop ? { x: 1050, y: 420 } : ai.style === 'net' ? { x: C.NET_X + 150, y: 450 } : m.home;
    m.x = damp(m.x, home.x, 3.2, dt);
    m.y = damp(m.y, home.y, 3.2, dt);
    m.vx = 0; m.vy = 0;
    return;
  }
  // reaction: rival "sees" the shot a beat after you hit it
  if (m.react > 0) { m.react -= dt; return; }

  const interceptX = S.coop ? 1070 : ai.style === 'net' ? C.NET_X + 130 : 940;
  const P = predictBall(interceptX);
  if (!P) return;
  let ix = clamp(P.x, C.REACH_RIVAL.x0 + 30, Math.min(ai.retreat || 9999, C.REACH_RIVAL.x1 - 20));
  let iy = clamp(P.y, C.MITT_Y_MIN, C.FLOOR - 26);
  if (ai.ceiling && iy < ai.ceiling) {
    // OTTO cannot reach the sky. He knows. He stays low and glowers.
    iy = Math.max(iy, ai.ceiling);
  }
  // approach the intercept, capped by rival speed
  const dx = ix - m.x, dy = iy - m.y;
  const dist = Math.hypot(dx, dy);
  const maxStep = ai.speed * (S.coop ? 1.15 : 1) * dt;
  if (dist > maxStep) { m.x += dx / dist * maxStep; m.y += dy / dist * maxStep; m.vx = dx / dist * ai.speed; m.vy = dy / dist * ai.speed; }
  else { m.x = ix; m.y = iy; m.vx *= 0.5; m.vy *= 0.5; }
  if (ai.ceiling) m.y = Math.max(m.y, ai.ceiling);

  // swing when the ball is in the pocket — but never reach over the net
  const d = Math.hypot(ball.x - m.x, ball.y - m.y);
  if (d < C.BALL_R + C.MITT_R + 30 && m.cool <= 0 && ball.x > C.NET_X + 10) {
    swingAt(chooseTarget('rally'));
  }
}
function chooseTarget(kind) {
  const ai = S.rival.ai;
  if (S.coop) {
    // JUDGE-SPEC: aim for the edge of your reach — stretchy, never cruel
    const px = mittP.x;
    const stretch = (C.REACH_PLAYER.x1 - C.REACH_PLAYER.x0) * (1 - C.DUET_REACH_EDGE);
    const tx = px < C.NET_X / 2 ? px + stretch * 1.6 : px - stretch * 1.6;
    return { x: clamp(tx, 120, 560), clear: 120 + Math.random() * 160, power: 640 + Math.random() * 160, kind: 'duet' };
  }
  const deep = { x: 140 + Math.random() * 220, clear: 80, power: ai.power, kind: 'drive' };
  const atFeet = { x: clamp(mittP.x + (Math.random() - 0.5) * 120, 100, 560), clear: 60, power: ai.power * 1.05, kind: 'drive' };
  const lob = { x: 90 + Math.random() * 160, clear: 430, power: ai.power * 0.85, kind: 'lob' };
  const drop = { x: C.NET_X - 90 - Math.random() * 60, clear: 46, power: ai.power * 0.5, kind: 'drop' };
  switch (ai.style) {
    case 'book': return deep;
    case 'net': return Math.random() < 0.7 ? atFeet : deep;
    case 'spin': return Math.random() < 0.6 ? deep : atFeet;
    case 'touch': {
      // if you're camped deep, drop it short; if you're crowding the net, lob you
      return mittP.x > 380 ? drop : lob;
    }
    case 'jules': {
      // jules remembers what beat you last (the memory is a weight table)
      const mem = S.julesMemory;
      const pool = [
        { w: 1 + mem.drive, o: deep }, { w: 0.8 + mem.drive * 0.5, o: atFeet },
        { w: 0.7 + mem.lob, o: lob }, { w: 0.7 + mem.drop, o: drop },
      ];
      let tot = pool.reduce((s, p) => s + p.w, 0), r = Math.random() * tot;
      for (const p of pool) { r -= p.w; if (r <= 0) return p.o; }
      return deep;
    }
  }
  return deep;
}
function swingAt(target) {
  // Rival shots are SOLVED BALLISTICS ("opponents are data, not code"): pick a landing
  // point and a flight time, derive the exit velocity, then jitter it by the rival's
  // error model. The player's contact stays pure physics; the rival's is pure intent.
  const ai = S.rival.ai;
  const m = mittR;
  S.lastRivalShot = target.kind;   // jules memory: what kind of shot this was
  const FLIGHT = { drive: 0.62, lob: 1.2, drop: 0.78, duet: 0.95, serve: 0.7 };
  let T = FLIGHT[target.kind] || 0.65;
  // faster drives when the target is far, floatier when close
  if (target.kind === 'drive') T = clamp(Math.abs(target.x - ball.x) / 1050, 0.55, 0.75);
  const tx = target.x, ty = C.FLOOR - 22;
  let vx = 0, vy = 0;
  for (let tries = 0; tries < 5; tries++) {
    vx = (tx - ball.x) / T;
    vy = (ty - ball.y) / T - 0.5 * C.GRAVITY * T;
    // net clearance check (drag/Magnus are mild; margin absorbs them)
    const tn = (C.NET_X - ball.x) / vx;
    if (tn > 0 && tn < T) {
      const yn = ball.y + vy * tn + 0.5 * C.GRAVITY * tn * tn;
      const margin = target.kind === 'drop' ? 18 : 30;
      if (yn > C.NET_TOP - margin) { T *= 1.16; continue; }   // arc higher
    }
    break;
  }
  // error model: rotate + power jitter
  const err = (Math.random() - 0.5) * 2 * (ai.err / 900);
  const ca = Math.cos(err), sa = Math.sin(err);
  const jitter = 1 + (Math.random() - 0.5) * ai.err / 800;
  const nvx = (vx * ca - vy * sa) * jitter;
  const nvy = (vx * sa + vy * ca) * jitter;
  const prevVx = ball.vx, prevVy = ball.vy;
  ball.vx = nvx; ball.vy = nvy;
  // spin: ai.spin > 0 means topspin (dips). Magnus accel_y = MAGNUS*spin*vx, so a
  // leftward ball dips when spin < 0 — hence sign(vx) carries the convention
  ball.spin = ai.spin ? clamp(ai.spin * Math.sign(ball.vx || -1), -C.SPIN_MAX, C.SPIN_MAX) : ball.spin * 0.3;
  m.cool = C.HIT_COOLDOWN;
  // the mitt visually follows through along the shot
  m.vx = nvx * 0.9; m.vy = nvy * 0.9;
  contactJuice('r', Math.hypot(nvx - prevVx, nvy - prevVy) * 0.6);
  m.vx *= 0.25; m.vy *= 0.25;
}

// ---------- sim ----------
function stepSim(dt) {
  tNow += dt;
  // player mitt: crisp tracking (judge fix: never mush)
  const tx = clamp(cursor.x, C.REACH_PLAYER.x0, C.REACH_PLAYER.x1);
  const ty = clamp(cursor.y, C.MITT_Y_MIN, C.FLOOR - 14);
  mittP.px = mittP.x; mittP.py = mittP.y;
  mittP.x = damp(mittP.x, tx, C.MITT_LAMBDA, dt);
  mittP.y = damp(mittP.y, ty, C.MITT_LAMBDA, dt);
  // smoothed velocity (3-sample) — jitter can't fake a swing, flicks survive
  mittP.hist.push({ vx: (mittP.x - mittP.px) / dt, vy: (mittP.y - mittP.py) / dt });
  if (mittP.hist.length > C.MITT_VEL_SMOOTH) mittP.hist.shift();
  mittP.vx = mittP.hist.reduce((s, h) => s + h.vx, 0) / mittP.hist.length;
  mittP.vy = mittP.hist.reduce((s, h) => s + h.vy, 0) / mittP.hist.length;
  if (mittP.cool > 0) mittP.cool -= dt;
  if (mittR.cool > 0) mittR.cool -= dt;

  // ghosts
  const pSpeed = Math.hypot(mittP.vx, mittP.vy);
  if (pSpeed > C.AFTERIMAGE_SPEED && (mittP.ghosts.length === 0 || Math.hypot(mittP.x - mittP.ghosts[mittP.ghosts.length - 1].x, mittP.y - mittP.ghosts[mittP.ghosts.length - 1].y) > 18)) mittP.ghosts.push({ x: mittP.x, y: mittP.y, t: 0.22 });
  for (const g of mittP.ghosts) g.t -= dt;
  mittP.ghosts = mittP.ghosts.filter(g => g.t > 0);

  if (S.mode === 'serve') {
    S.serveTimer -= dt;
    if ((S.server === 'r' || S.coop) && S.serveTimer <= 0 && !ball.alive) rivalToss();
  }
  if (S.mode === 'point' || S.mode === 'burnout') {
    S.pointTimer -= dt;
    if (S.pointTimer <= 0) {
      if (S.mode === 'burnout') startFinale();
      else afterPoint();
    }
  }

  if (ball.alive) {
    // flight: gravity + drag + Magnus (spin curves the ball)
    ball.vx += (-C.AIR_DRAG * ball.vx + C.MAGNUS * ball.spin * -ball.vy) * dt;
    ball.vy += (C.GRAVITY - C.AIR_DRAG * ball.vy + C.MAGNUS * ball.spin * ball.vx) * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.spin *= Math.max(0, 1 - C.SPIN_DECAY * dt);
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > C.TRAIL_LEN) ball.trail.shift();

    // net
    if (Math.abs(ball.x - C.NET_X) < C.BALL_R + 4 && ball.y > C.NET_TOP - C.BALL_R) {
      if (ball.y < C.NET_TOP + 16) {
        // cord clip: the ball staggers over (or doesn't) — drama either way
        ball.vx *= 0.32; ball.vy = Math.min(ball.vy * 0.3, -120);
        ball.x = C.NET_X + (ball.vx >= 0 ? C.BALL_R + 5 : -(C.BALL_R + 5));
        netWobbleV += 260;
        A.netThunk();
        burst(ball.x, C.NET_TOP, 6, '#ddd6c4', 120, 0.3);
      } else {
        // body of the net: the hitter's fault
        netWobbleV += 180;
        A.netThunk();
        ball.vx *= -0.18;
        if (!S.coop && S.rally <= 1 && ball.lastHit === 'p' && S.server === 'p' && S.serveFaults === 0) {
          S.serveFaults = 1;
          A.cutMusic();
          ball.alive = false; ball.visible = false;
          showCallout('fault. one more.', 'soft');
          beginServe(true);
          return;
        }
        if (!S.coop) { pointEnds(ball.lastHit === 'p' ? 'p' : 'r', 'the net has opinions'); }
        else pointEnds(null, 'net');
        return;
      }
    }
    // floor
    if (ball.y > C.FLOOR - C.BALL_R) {
      if (S.mode === 'rally' && ball.lastHit === null) {
        // serve toss dropped untouched: friendly re-toss, no penalty
        ball.alive = false; ball.visible = false;
        S.mode = 'serve'; S.tossed = false;
        if (S.server === 'p' && !S.coop) setHint('no harm. click to toss again');
        else S.serveTimer = 0.6;
        return;
      }
      // second serve: a fluffed serve stroke that dies on your own side costs a
      // whisper, not a point — once. (Real tennis got this right first.)
      if (!S.coop && S.rally <= 1 && ball.lastHit === 'p' && S.server === 'p' && ball.x < C.NET_X && S.serveFaults === 0) {
        S.serveFaults = 1;
        A.bounceThud();
        A.cutMusic();
        burst(ball.x, C.FLOOR - 6, 8, '#c98f5f', 160, 0.4, 40);
        showCallout('fault. one more.', 'soft');
        beginServe(true);
        return;
      }
      A.bounceThud();
      burst(ball.x, C.FLOOR - 6, 14, '#c98f5f', 200, 0.5, 60);
      addTrauma(0.18);
      pointEnds(S.coop ? null : (ball.x < C.NET_X ? 'p' : 'r'));
      return;
    }
    // out of bounds: the screen is the court. A ball that leaves it without touching
    // the floor is OUT — the hitter's fault. (Winners must be angled DOWN into court,
    // which is what keeps flat max-power smash spam from dominating.)
    if (ball.x < -50 || ball.x > C.W + 50) {
      const faulter = ball.lastHit || (S.server === 'p' ? 'p' : 'r');
      pointEnds(S.coop ? null : faulter, 'out');
      return;
    }
    // ceiling is forgiving — lobs may leave the frame and return
    if (ball.y < -700) ball.y = -700;

    tryContact(mittP, 'p');
    updateAI(dt);
    tickFinale(dt);
  } else {
    updateAI(dt);
  }

  // net wobble spring
  netWobbleV += -netWobble * 90 * dt - netWobbleV * 4 * dt;
  netWobble += netWobbleV * dt;

  // particles
  for (const p of particles) {
    p.t += dt;
    p.vy += 900 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y > C.FLOOR - 2) { p.y = C.FLOOR - 2; p.vy *= -0.4; p.vx *= 0.7; }
  }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].t > particles[i].life) particles.splice(i, 1);
}

// ---------- render ----------
function skyGrad() {
  if (!skyGrad._g) {
    const g = ctx.createLinearGradient(0, 0, 0, C.H);
    g.addColorStop(0, '#2b2140');
    g.addColorStop(0.42, '#5d3a52');
    g.addColorStop(0.68, '#b46345');
    g.addColorStop(0.8, '#d98e52');
    skyGrad._g = g;
  }
  return skyGrad._g;
}
function draw(rdt = 1 / 60) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, C.W, C.H);

  // camera: zoom about court center + trauma shake (rdt = real frame delta, so the
  // cinematic creep speed doesn't depend on the display refresh rate)
  const targetZoom = 1 + clamp(S.rally, 0, 14) * C.ZOOM_RALLY;
  zoom = damp(zoom, Math.min(targetZoom, C.ZOOM_MAX), C.ZOOM_LAMBDA, rdt);
  const sh = trauma * trauma * (C.REDUCED_MOTION ? 3 : 13);
  const ox = Math.sin(tNow * 37.1) * sh + Math.sin(tNow * 13.7) * sh * 0.6;
  const oy = Math.cos(tNow * 41.3) * sh + Math.cos(tNow * 17.9) * sh * 0.6;
  ctx.translate(C.W / 2 + ox, C.H / 2 + oy);
  ctx.scale(zoom, zoom);
  ctx.translate(-C.W / 2, -C.H / 2);

  // sky
  ctx.fillStyle = skyGrad();
  ctx.fillRect(-60, -60, C.W + 120, C.H + 120);
  const HORIZON = 556;
  // sun, half-set on the horizon
  ctx.fillStyle = 'rgba(255, 170, 90, 0.14)';
  ctx.beginPath(); ctx.arc(C.W * 0.78, HORIZON, 170, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(-60, -60, C.W + 120, HORIZON + 60);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 205, 130, 0.9)';
  ctx.beginPath(); ctx.arc(C.W * 0.78, HORIZON + 26, 88, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // distant hills against the dusk
  ctx.fillStyle = 'rgba(45, 28, 52, 0.85)';
  ctx.beginPath();
  ctx.moveTo(-60, HORIZON);
  ctx.quadraticCurveTo(200, HORIZON - 46, 470, HORIZON - 6);
  ctx.quadraticCurveTo(700, HORIZON + 10, 980, HORIZON - 30);
  ctx.quadraticCurveTo(1160, HORIZON - 44, C.W + 60, HORIZON - 8);
  ctx.lineTo(C.W + 60, HORIZON); ctx.closePath(); ctx.fill();
  // stands: a low crowd band between the hills and the court, lanterns warming with the rally
  ctx.fillStyle = '#33202e';
  ctx.fillRect(-60, HORIZON, C.W + 120, C.FLOOR - HORIZON);
  const glow = clamp(S.rally / 12, 0, 1);
  for (let i = 0; i < 52; i++) {
    const lx = 30 + (i * 113.7) % (C.W - 40);
    const ly = HORIZON + 14 + ((i * 37.3) % (C.FLOOR - HORIZON - 26));
    const tw = 0.55 + 0.45 * Math.sin(tNow * 1.7 + i * 2.4);
    ctx.fillStyle = `rgba(255, ${170 + glow * 60 | 0}, ${90 + glow * 60 | 0}, ${0.18 + glow * 0.5 * tw})`;
    ctx.beginPath(); ctx.arc(lx, ly, 2.5 + glow * 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // court: clay, darkening toward the player (gradient cached — hot path)
  if (!draw._court) {
    const cg = ctx.createLinearGradient(0, C.FLOOR, 0, C.H + 60);
    cg.addColorStop(0, '#b06040');
    cg.addColorStop(1, '#7c3f2b');
    draw._court = cg;
  }
  ctx.fillStyle = draw._court;
  ctx.fillRect(-60, C.FLOOR, C.W + 120, C.H - C.FLOOR + 60);
  ctx.strokeStyle = 'rgba(243, 233, 210, 0.75)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-60, C.FLOOR + 2); ctx.lineTo(C.W + 60, C.FLOOR + 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(243, 233, 210, 0.3)'; ctx.lineWidth = 3;
  for (const lx of [70, 350, 930, 1210]) {
    ctx.beginPath(); ctx.moveTo(lx, C.FLOOR + 10); ctx.lineTo(lx, C.FLOOR + 52); ctx.stroke();
  }

  // net
  const nw = Math.sin(tNow * 21) * netWobble * 0.06;
  ctx.strokeStyle = '#efe6d0'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(C.NET_X - 2, C.FLOOR); ctx.lineTo(C.NET_X - 2 + nw, C.NET_TOP); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(239, 230, 208, 0.55)';
  for (let y = C.NET_TOP + 12; y < C.FLOOR; y += 14) {
    const w = nw * (1 - (y - C.NET_TOP) / (C.FLOOR - C.NET_TOP));
    ctx.beginPath(); ctx.moveTo(C.NET_X - 8 + w, y); ctx.lineTo(C.NET_X + 6 + w, y); ctx.stroke();
  }
  // cord
  ctx.strokeStyle = '#f3e9d2'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(C.NET_X - 9 + nw, C.NET_TOP); ctx.lineTo(C.NET_X + 7 + nw, C.NET_TOP); ctx.stroke();
  // base
  ctx.fillStyle = 'rgba(20, 10, 8, 0.3)';
  ctx.beginPath(); ctx.ellipse(C.NET_X - 1, C.FLOOR + 6, 26, 6, 0, 0, Math.PI * 2); ctx.fill();

  // shadows ground everything: you judge a landing by its shadow
  if (ball.visible) {
    const bh = clamp((C.FLOOR - ball.y) / 500, 0, 1);
    ctx.fillStyle = `rgba(20, 10, 8, ${0.34 * (1 - bh * 0.7)})`;
    ctx.beginPath(); ctx.ellipse(ball.x, C.FLOOR + 8, C.BALL_R * (1.4 - bh * 0.7), 5 - bh * 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const mm of [mittP, mittR]) {
    const mh = clamp((C.FLOOR - mm.y) / 500, 0, 1);
    ctx.fillStyle = `rgba(20, 10, 8, ${0.26 * (1 - mh * 0.7)})`;
    ctx.beginPath(); ctx.ellipse(mm.x, C.FLOOR + 10, C.MITT_R * (1.5 - mh * 0.8), 6 - mh * 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  // particles
  for (const p of particles) {
    const a = 1 - p.t / p.life;
    ctx.fillStyle = p.col;
    ctx.globalAlpha = a * 0.9;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a + 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ball trail: velocity-stretched, curvature shows the spin
  if (ball.visible && ball.trail.length > 2) {
    for (let i = 1; i < ball.trail.length; i++) {
      const a = i / ball.trail.length;
      ctx.strokeStyle = `rgba(255, 236, 180, ${a * 0.45})`;
      ctx.lineWidth = C.BALL_R * 1.7 * a;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ball.trail[i - 1].x, ball.trail[i - 1].y);
      ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
      ctx.stroke();
    }
  }
  // ball
  if (ball.visible) {
    const sp = Math.hypot(ball.vx, ball.vy);
    const stretch = clamp(sp / 2600, 0, 0.42);
    const ang = Math.atan2(ball.vy, ball.vx);
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ang);
    ctx.scale(1 + stretch, 1 - stretch * 0.6);
    ctx.fillStyle = '#ffedb8';
    ctx.beginPath(); ctx.arc(0, 0, C.BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(200, 140, 60, 0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, C.BALL_R * 0.62, tNow * ball.spin * 0.5, tNow * ball.spin * 0.5 + 1.9); ctx.stroke();
    ctx.restore();
  }

  // player mitt ghosts
  for (const g of mittP.ghosts) {
    ctx.globalAlpha = g.t / 0.22 * 0.13;
    drawMittShape(g.x, g.y, '#c73e2e', '#8c2418');
    ctx.globalAlpha = 1;
  }
  // swing ribbon (judge fix: the swing made visible)
  const pv = Math.hypot(mittP.vx, mittP.vy);
  if (pv > C.RIBBON_MIN) {
    const len = Math.min((pv - C.RIBBON_MIN) * C.RIBBON_SCALE, C.RIBBON_MAXLEN);
    const rx = mittP.vx / pv, ry = mittP.vy / pv;
    const px2 = -ry, py2 = rx;
    ctx.fillStyle = `rgba(255, 220, 160, ${clamp((pv - C.RIBBON_MIN) / 2200, 0.12, 0.5)})`;
    ctx.beginPath();
    ctx.moveTo(mittP.x + px2 * 9, mittP.y + py2 * 9);
    ctx.lineTo(mittP.x + rx * len, mittP.y + ry * len);
    ctx.lineTo(mittP.x - px2 * 9, mittP.y - py2 * 9);
    ctx.closePath(); ctx.fill();
  }
  // mitts
  drawMittShape(mittP.x, mittP.y, '#c73e2e', '#8c2418', mittP.cool > 0);
  drawRivalMitt();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // vignette, cached
  if (!draw._vig) {
    const v = ctx.createRadialGradient(C.W / 2, C.H / 2, C.H * 0.52, C.W / 2, C.H / 2, C.H * 1.02);
    v.addColorStop(0, 'rgba(16, 8, 20, 0)');
    v.addColorStop(1, 'rgba(16, 8, 20, 0.42)');
    draw._vig = v;
  }
  ctx.fillStyle = draw._vig;
  ctx.fillRect(0, 0, C.W, C.H);
}
function drawMittShape(x, y, col, dark, limp) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = limp ? dark : col;
  ctx.beginPath(); ctx.arc(0, 0, C.MITT_R, 0, Math.PI * 2); ctx.fill();
  // thumb bump
  ctx.beginPath(); ctx.arc(-C.MITT_R * 0.75, C.MITT_R * 0.45, C.MITT_R * 0.42, 0, Math.PI * 2); ctx.fill();
  // stitching
  ctx.strokeStyle = 'rgba(255, 240, 210, 0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, C.MITT_R * 0.7, -0.6, 1.4); ctx.stroke();
  ctx.restore();
}
function drawRivalMitt() {
  const r = S.rival, m = mittR;
  drawMittShape(m.x, m.y, r.color, r.dark, m.cool > 0);
  // face: rivals have faces. you don't. you're you.
  ctx.save();
  ctx.translate(m.x, m.y);
  const blink = m.blink < 0.12;
  ctx.fillStyle = r.eye;
  if (m.face === 'happy') {
    ctx.strokeStyle = r.eye; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(-8, -4, 5, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, -4, 5, Math.PI, 0); ctx.stroke();
  } else if (blink || m.face === 'sad') {
    ctx.fillRect(-11, -5, 7, 2.4); ctx.fillRect(5, -5, 7, 2.4);
  } else {
    ctx.beginPath(); ctx.arc(-8, -5, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -5, 3.4, 0, Math.PI * 2); ctx.fill();
  }
  // mouth
  ctx.strokeStyle = r.eye; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath();
  if (m.face === 'hit') { ctx.arc(0, 7, 4, 0, Math.PI * 2); }
  else if (m.face === 'sad') { ctx.arc(0, 12, 6, Math.PI * 1.15, Math.PI * 1.85); }
  else { ctx.arc(0, 4, 6, Math.PI * 0.15, Math.PI * 0.85); }
  ctx.stroke();
  ctx.restore();
}

// ---------- debug ----------
const debugOn = location.search.includes('debug');
window.__rally = {
  aiOff: false,
  skip(i) { $('title').classList.remove('on'); A.init(); startMatch(i, false); },
  setRally(n) { S.rally = n; A.setLayers(n); },
  spawn(vx, vy) { ball.x = 400; ball.y = 300; ball.vx = vx; ball.vy = vy; ball.alive = true; ball.visible = true; ball.lastHit = 'p'; S.mode = 'rally'; },
  duet() { $('title').classList.remove('on'); A.init(); startDuet(); },
  finale() { $('title').classList.remove('on'); A.init(); S.rivalIdx = 4; S.rival = RIV[4]; A.setRival(RIV[4]); startFinale(); },
  state: S, ball, mittP, mittR, cursor,
  // headless test harness (house pattern, ported: vesperbane DEBUG.step):
  // steps the sim deterministically and renders one frame — works with rAF throttled
  step(n = 1, perStep) {
    for (let i = 0; i < n; i++) {
      if (hitstop > 0) { hitstop -= DT; }
      else if (S.mode !== 'title') {
        if (slowmoT > 0) { slowmoT -= DT; timeScale = slowmoV; }
        else timeScale = Math.min(1, timeScale + C.SLOWMO_RECOVER * DT * (timeScale * timeScale + 0.2));
        stepSim(DT * timeScale);
      }
      if (perStep) perStep(i);
    }
    draw();
    return { mode: S.mode, rally: S.rally, score: { ...S.score }, ball: { x: ball.x | 0, y: ball.y | 0, vx: ball.vx | 0, vy: ball.vy | 0, spin: +ball.spin.toFixed(1), alive: ball.alive }, hitstop: +hitstop.toFixed(3) };
  },
  toss() { if (S.mode === 'serve' && S.server === 'p') playerToss(); },
  shot() {
    // capture the canvas for headless screenshots
    const c = document.createElement('canvas'); c.width = 960; c.height = 540;
    c.getContext('2d').drawImage(canvas, 0, 0, 960, 540);
    return c.toDataURL('image/png');
  },
};
function drawDebug() {
  if (!debugOn) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '12px monospace'; ctx.fillStyle = '#0f0';
  ctx.fillText(`mode=${S.mode} rally=${S.rally} spin=${ball.spin.toFixed(1)} bv=(${ball.vx | 0},${ball.vy | 0}) mv=(${mittP.vx | 0},${mittP.vy | 0}) bars=${S.finaleBars}`, 10, C.H - 12);
  ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mittP.x, mittP.y); ctx.lineTo(mittP.x + mittP.vx * 0.08, mittP.y + mittP.vy * 0.08); ctx.stroke();
}

// ---------- main loop ----------
function frame(ts) {
  requestAnimationFrame(frame);
  if (!last) { last = ts; return; }
  let real = Math.min((ts - last) / 1000, 0.05);   // GC hitch must not tunnel the ball
  last = ts;

  // slow-mo envelope
  if (slowmoT > 0) { slowmoT -= real; timeScale = slowmoV; }
  else timeScale = Math.min(1, timeScale + C.SLOWMO_RECOVER * real * (timeScale * timeScale + 0.2));

  if (hitstop > 0) {
    hitstop -= real;
    // world frozen; particles keep blooming at 55% so stops read as impact, not lag
    for (const p of particles) { p.t += real * 0.55; p.x += p.vx * real * 0.55; p.y += p.vy * real * 0.55; }
  } else if (S.mode !== 'title') {
    acc += real * timeScale;
    let n = 0;
    while (acc >= DT && n < 8) { stepSim(DT); acc -= DT; n++; }
  }
  trauma = Math.max(0, trauma - C.SHAKE_DECAY * real * trauma - 0.15 * real);
  A.frame(Math.hypot(mittP.vx, mittP.vy), clamp(S.rally / 12, 0, 1) + clamp(Math.hypot(ball.vx, ball.vy) / 4000, 0, 0.3));

  draw(real);
  drawDebug();
}
requestAnimationFrame(frame);

// ---------- title wiring ----------
function boot() {
  updateScoreboard();
  $('title').classList.add('on');
  if (S.finished) $('title-duet').classList.add('on');
  $('title-play').addEventListener('click', e => {
    e.currentTarget.blur();
    A.init(); A.resume(); A.ui();
    $('title').classList.remove('on');
    startLadder();
  });
  $('title-duet').addEventListener('click', e => {
    e.stopPropagation(); e.currentTarget.blur();
    A.init(); A.resume(); A.ui();
    $('title').classList.remove('on');
    startDuet();
  });
}
boot();
})();
