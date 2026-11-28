/* LOOSE END — input, sound, scenes and a small DOM interface. */
(() => {
  'use strict';
  const VERSION = '5.1.0-after-hours';
  const $ = id => document.getElementById(id);
  const canvas = $('world');
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const settings = read('loose-end-settings-v1', { muted: false });
  let scene = 'menu', practice = false, encounter = null, match, renderer, lastTime = 0, accumulator = 0, frames = 0;
  let frameAverage = 16.7, renderAverage = 0;
  let demoTime = 0, bannerUntil = 0, hintUntil = 0, dashQueued = false;
  let audioContext, noiseBuffer, lastImpactSound = -1000, lastWhoosh = -1000;
  const keys = new Set(), pointer = { x: 0, y: 0, seen: false };
  const touches = { move: null, aim: null };
  const input = { mx: 0, my: 0, target: null, dash: false, view: null };

  function unlockAudio() {
    if (settings.muted) return;
    try {
      if (!audioContext) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioContext = new AC();
        noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * .5, audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch {}
  }
  function tone(frequency, end, duration, gain, type = 'triangle', delay = 0) {
    if (!audioContext || settings.muted || audioContext.state !== 'running') return;
    const ac = audioContext, time = ac.currentTime + delay;
    const osc = ac.createOscillator(), volume = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), time + duration);
    volume.gain.setValueAtTime(gain, time); volume.gain.exponentialRampToValueAtTime(.001, time + duration);
    osc.connect(volume); volume.connect(ac.destination); osc.start(time); osc.stop(time + duration + .02);
    osc.onended = () => { osc.disconnect(); volume.disconnect(); };
  }
  function sound(kind, power = .5, material = '') {
    if (!audioContext || settings.muted || audioContext.state !== 'running') return;
    const now = performance.now();
    if ((kind === 'hit' || kind === 'break') && now - lastImpactSound < 35) return;
    if (kind === 'hit' || kind === 'break') lastImpactSound = now;
    try {
      if (kind === 'exit' || kind === 'win') {
        tone(220, 220, .12, .08, 'sine'); tone(330, 330, .15, .07, 'sine', .09);
        tone(440, 660, .25, .07, 'sine', .18); return;
      }
      const ac = audioContext, time = ac.currentTime;
      const noise = ac.createBufferSource(), filter = ac.createBiquadFilter(), volume = ac.createGain();
      const glass = material === 'glass', soft = kind === 'whoosh';
      const duration = soft ? .12 : glass ? .26 : kind === 'break' ? .21 : .10;
      noise.buffer = noiseBuffer; filter.type = glass ? 'highpass' : 'bandpass';
      filter.frequency.value = soft ? 500 : glass ? 3000 : kind === 'hurt' ? 290 : 800 + power * 1300;
      filter.Q.value = .6;
      volume.gain.setValueAtTime(.001, time);
      volume.gain.linearRampToValueAtTime(soft ? .025 + power * .025 : .08 + power * .13, time + .003);
      volume.gain.exponentialRampToValueAtTime(.001, time + duration);
      noise.connect(filter); filter.connect(volume); volume.connect(ac.destination);
      noise.start(time); noise.stop(time + duration + .01);
      noise.onended = () => { noise.disconnect(); filter.disconnect(); volume.disconnect(); };
      if (!soft) tone(kind === 'hurt' ? 120 : glass ? 520 : 150 + power * 100, kind === 'hurt' ? 35 : 55, .12, .10 + power * .07, 'triangle');
      if (glass && kind === 'break') {
        tone(1900, 850, .12, .035, 'sine'); tone(2700, 1700, .16, .025, 'sine', .025);
      }
    } catch {}
  }
  function setMuted(value, interact = true) {
    settings.muted = value; save('loose-end-settings-v1', settings);
    $('sound').setAttribute('aria-pressed', String(value));
    $('sound').setAttribute('aria-label', value ? 'Unmute sound' : 'Mute sound');
    $('sound').title = value ? 'Sound off' : 'Sound on';
    if (!value && interact) unlockAudio();
  }
  function clearInputs() {
    keys.clear(); touches.move = null; touches.aim = null; pointer.seen = false;
    input.mx = input.my = 0; input.target = null; input.dash = false; dashQueued = false;
  }
  function banner(kicker, title, note = '', duration = 1.5) {
    $('banner-kicker').textContent = kicker; $('banner-title').textContent = title;
    $('banner-note').textContent = note; $('room-banner').classList.add('show');
    bannerUntil = performance.now() + duration * 1000;
  }
  function roomBanner() {
    const s = match.state;
    banner(practice ? 'FREE SMASH' : encounter !== null ? 'ENCOUNTER PRACTICE' : (s.roomType === 'boss' ? 'GUARDIAN' : 'STAGE') + ' ' + String(s.roomIndex + 1).padStart(2, '0') + ' / ' + String(s.roomCount || 6).padStart(2, '0'),
      s.roomName, s.roomSubtitle || 'Break enough targets to open the exit.', 1.45);
  }
  function onEvent(event) {
    if (scene !== 'play') return;
    const power = clamp(event.power ?? .6, 0, 1);
    if (event.type === 'hit' || event.type === 'break') {
      // A lethal hit emits both events; let the material's break sound own that impact.
      if (event.type === 'break' || event.hp !== 0) sound(event.type, power, event.kind || event.material || '');
      if (event.type === 'break') {
        if (match.state.destroyed >= 2) $('hint').hidden = true;
        if (coarse() && power > .7 && navigator.vibrate) navigator.vibrate(10);
      }
    } else if (event.type === 'boss-hit' || event.type === 'boss-part') {
      sound('break', .85, 'machine');
      if (event.type === 'boss-part') { tone(460, 120, .24, .10, 'sawtooth'); }
    } else if (event.type === 'boss-block') {
      tone(180, 55, .09, .075, 'square');
    } else if (event.type === 'reflect') {
      sound('hit', .8, 'core'); tone(240, 740, .16, .09, 'triangle');
    } else if (event.type === 'boss-open') {
      tone(220, 560, .22, .09, 'triangle'); tone(660, 440, .18, .055, 'sine', .1);
    } else if (event.type === 'boss-break') {
      sound('win'); banner('GUARDIAN DOWN', 'WAY CLEAR', 'Take the open exit.', 1.4);
    } else if (event.type === 'hazard-disabled') {
      sound('whoosh', .8); tone(430, 95, .18, .065);
    } else if (event.type === 'boss-phase') {
      if (['windup','warning','aim','charge-warning','sweep-windup','pulse-windup'].includes(event.phase)) tone(190, 120, .15, .06, 'triangle');
    } else if (event.type === 'hurt') {
      sound('hurt', .7); $('game').classList.remove('damage-flash');
      void $('game').offsetWidth; $('game').classList.add('damage-flash');
      if (coarse() && navigator.vibrate) navigator.vibrate(25);
    } else if (event.type === 'dash') sound('whoosh', .85);
    else if (event.type === 'exit') {
      sound('exit'); banner(match.state.roomType === 'boss' ? 'GUARDIAN DOWN' : 'WAY CLEAR', 'EXIT OPEN', 'Walk through the open archway.', 1.2);
    } else if (event.type === 'room') roomBanner();
    else if (event.type === 'win' || event.type === 'dead') showResult(event.type === 'win');
  }
  function showGameUI(visible) {
    for (const id of ['hud','footer','room-heading','pause']) $(id).hidden = !visible;
    $('touch-dash').hidden = !visible || !coarse();
    if (!visible) $('boss-hud').hidden = true;
    document.body.classList.toggle('playing', visible);
  }
  function startGame(free = false, chosenEncounter = null) {
    unlockAudio(); practice = free; encounter = chosenEncounter; clearInputs(); scene = 'starting';
    match = new WreckPhysics.Match({ onEvent, practice, encounter });
    scene = 'play'; match.start();
    $('menu').hidden = true; $('encounter-panel').hidden = true; $('pause-panel').hidden = true; $('result-panel').hidden = true;
    $('combo').hidden = true; showGameUI(true);
    $('hint').textContent = coarse()
      ? 'Left thumb moves. Sweep your right thumb to smash the marked targets.'
      : 'Sweep the weight through targets. WASD moves you. Space dodges.';
    $('hint').hidden = match.state.roomType === 'boss'; hintUntil = performance.now() + 6500;
    accumulator = 0; lastTime = performance.now();
    roomBanner(); updateHUD(); canvas.focus({ preventScroll: true });
  }
  function pauseGame() {
    if (scene !== 'play') return;
    scene = 'pause'; clearInputs(); $('pause-panel').hidden = false;
    $('room-banner').classList.remove('show'); $('hint').hidden = true;
    $('resume').focus({ preventScroll: true }); updateHUD();
  }
  function resumeGame() {
    if (scene !== 'pause') return;
    unlockAudio(); clearInputs(); scene = 'play'; $('pause-panel').hidden = true;
    accumulator = 0; lastTime = performance.now(); canvas.focus({ preventScroll: true }); updateHUD();
  }
  function retryRoom() {
    unlockAudio(); clearInputs(); scene = 'starting';
    match.retry(); scene = 'play'; match.start();
    $('pause-panel').hidden = true; $('result-panel').hidden = true; $('combo').hidden = true;
    showGameUI(true); accumulator = 0; lastTime = performance.now(); roomBanner();
    canvas.focus({ preventScroll: true }); updateHUD();
  }
  function showResult(won) {
    scene = 'over'; clearInputs(); $('result-panel').hidden = false;
    $('room-banner').classList.remove('show'); $('hint').hidden = true; $('combo').hidden = true;
    $('touch-dash').hidden = true;
    const s = match.state;
    $('result-kicker').textContent = won ? (encounter !== null ? 'GUARDIAN DEFEATED' : 'AFTER HOURS · COMPLETE') : 'ONE MORE SWING';
    $('result-title').innerHTML = won ? (encounter !== null ? 'Well<br><em>swung.</em>' : 'Some<br><em>night.</em>') : 'Down.<br><em>Not done.</em>';
    $('result-copy').textContent = won ? (encounter !== null ? s.roomName + ' defeated. Try another guardian or take on the whole park.' : 'Six stages. Three guardians. A spectacularly rearranged pleasure park.') : 'Retry this stage with full health. Your progress through the park is kept.';
    $('final-score').textContent = Math.round(s.score).toLocaleString();
    $('final-room').textContent = (s.roomIndex + 1) + ' / ' + (s.roomCount || 6);
    $('retry').textContent = won ? (encounter !== null ? 'Fight again' : 'One more night') : 'Try this stage again';
    $('retry').dataset.won = String(won);
    if (won) sound('win');
    const best = Math.max(Number(read('loose-end-afterhours-best-v1', 0)) || 0, s.score);
    if (encounter === null) save('loose-end-afterhours-best-v1', best); updateRecord();
    $('retry').focus({ preventScroll: true }); updateHUD();
  }
  function updateRecord() {
    const best = Number(read('loose-end-afterhours-best-v1', 0)) || 0;
    $('record').hidden = !best; $('record').textContent = 'BEST NIGHT  ' + Math.round(best).toLocaleString();
  }
  function makeDemo() {
    match = new WreckPhysics.Match({ onEvent, practice: true, seed: 842 });
    match.start(); demoTime = 0;
  }
  function toMenu() {
    clearInputs(); scene = 'menu'; showGameUI(false);
    $('menu').hidden = false; $('encounter-panel').hidden = true; $('pause-panel').hidden = true; $('result-panel').hidden = true;
    $('room-banner').classList.remove('show'); $('combo').hidden = true; $('hint').hidden = true;
    practice = false; encounter = null; makeDemo(); updateRecord(); $('play').focus({ preventScroll: true });
  }
  function updateHUD() {
    if (!match || !renderer) return;
    const s = match.state, p = s.player;
    $('room-number').textContent = practice ? 'FREE SMASH' : encounter !== null ? 'ENCOUNTER PRACTICE' : 'STAGE ' + String(s.roomIndex + 1).padStart(2, '0') + ' / ' + String(s.roomCount || 6).padStart(2, '0');
    document.body.dataset.theme = s.theme || 'garden';
    $('room-name').textContent = s.roomName;
    $('score').textContent = Math.round(s.score).toLocaleString();
    $('break-count').textContent = Math.min(s.destroyed, s.required) + ' / ' + s.required;
    const threats = s.enemies.filter(e => !e.destroyed).length;
    $('enemy-count').textContent = String(threats);
    $('enemy-status').hidden = practice || s.roomType === 'boss' || s.exit.open;
    $('break-fill').style.width = clamp(s.destroyed / Math.max(1, s.required), 0, 1) * 100 + '%';
    $('objective').textContent = s.exit.open ? 'EXIT OPEN' : s.roomType === 'boss' ? 'GUARDIAN' : 'BREAK TARGETS';
    document.querySelector('.progress').hidden = s.roomType === 'boss' && !s.exit.open;
    document.querySelector('.progress').classList.toggle('open', s.exit.open);
    $('exit-status').textContent = s.exit.open ? 'THROUGH THE OPEN ARCHWAY' : s.roomType === 'boss' ? 'WATCH. DODGE. SWING.' : threats > 0 ? 'CLEAR THE THREATS' : 'BREAK YOUR WAY THROUGH';
    const boss = s.boss;
    $('boss-hud').hidden = !boss || boss.destroyed || scene !== 'play';
    if (boss && !boss.destroyed) {
      $('boss-name').textContent = boss.name;
      $('boss-hp').textContent = Math.ceil(boss.hp) + ' / ' + boss.maxHp;
      $('boss-fill').style.width = clamp(boss.hp / boss.maxHp, 0, 1) * 100 + '%';
      const danger = ['windup','warning','aim','charge-warning','charge','sweep','sweep-windup','pulse-windup','pulse','volley','slam-warning','slam','double-windup','double-charge'].includes(boss.phase);
      $('boss-hud').classList.toggle('exposed', !!boss.vulnerable);
      $('boss-hud').classList.toggle('danger', danger);
      $('boss-phase').textContent = boss.displayPhase || (danger ? (['charge','sweep'].includes(boss.phase) ? 'DODGE NOW' : 'WATCH THE WINDUP') : boss.vulnerable ? 'OPEN TO STRIKE' : 'ARMORED');
      $('boss-hint').textContent = boss.hint || 'Watch for an opening.';
      const parts = boss.parts || [];
      $('boss-parts').textContent = parts.length ? parts.filter(part => part.destroyed).length + ' / ' + parts.length + ' JOINTS BROKEN' : boss.kind === 'bathmaster' && boss.vulnerable ? boss.openCharges + ' / 2 SHUTTERS OPEN' : boss.stage === 2 ? 'PHASE II' : '';
    }
    const health = Math.ceil(p.hp);
    const healthKey = (practice ? 'free' : health) + ':' + p.maxHp;
    if ($('health-pips').dataset.value !== healthKey) {
      $('health-pips').dataset.value = healthKey;
      $('health-pips').innerHTML = Array.from({ length: p.maxHp }, (_, i) => '<i class="health-pip' + (i >= health && !practice ? ' empty' : '') + '"></i>').join('');
      document.querySelector('.health').setAttribute('aria-label', practice ? 'Free smash: no damage' : 'Health ' + health + ' of ' + p.maxHp);
    }
    const ready = p.dashCooldown <= .01;
    $('dash-ready').textContent = practice ? 'NO DAMAGE' : ready ? 'DASH READY' : 'DASH ' + Math.max(0, p.dashCooldown).toFixed(1) + 's';
    $('dash-ready').classList.toggle('cooling', !ready); $('touch-dash').classList.toggle('cooling', !ready);
    const combo = s.combo || 0, comboTime = s.comboTimer || 0;
    $('combo').hidden = scene !== 'play' || combo < 2 || comboTime <= 0;
    $('combo-number').textContent = combo + '×';
    $('combo-label').textContent = combo >= 8 ? 'BEAUTIFUL DAMAGE' : combo >= 4 ? 'FULL SWING' : 'KEEP BREAKING';
    $('combo-fill').style.transform = 'scaleX(' + clamp(comboTime / (s.comboDuration || 3), 0, 1) + ')';
    const pos = renderer.worldToScreen(p.x, p.y), head = renderer.worldToScreen(p.headX, p.headY);
    const nodes = p.rope.nodes, anchor = nodes[0];
    const center = renderer.worldToScreen(s.exit.x + s.exit.w / 2, s.exit.y + s.exit.h / 2);
    const number = x => Math.round((Number(x) || 0) * 10) / 10;
    canvas.dataset.state = JSON.stringify({
      version: VERSION, scene, phase: s.phase, time: number(s.time), frameMS:number(frameAverage),renderMS:number(renderAverage),roomIndex: s.roomIndex,
      roomName: s.roomName, roomType: s.roomType, theme: s.theme, roomCount: s.roomCount, encounter, destroyed: s.destroyed, required: s.required, score: s.score, combo: s.combo,
      player: { x: number(p.x), y: number(p.y), hp: p.hp, screenX: number(pos.x), screenY: number(pos.y), headX: number(p.headX), headY: number(p.headY), headScreenX: number(head.x), headScreenY: number(head.y), dashCooldown: number(p.dashCooldown) },
      rope: { length: p.rope.length, nodes: nodes.length, span: number(Math.hypot(p.headX - anchor.x, p.headY - anchor.y)) },
      exit: { ...s.exit, screenX: number(center.x), screenY: number(center.y) },
      objects: s.objects.filter(o => !o.destroyed).map(o => { const q = renderer.worldToScreen(o.x, o.y); return { id: o.id, kind: o.kind, x: number(o.x), y: number(o.y), hp: number(o.hp), required: o.required, screenX: number(q.x), screenY: number(q.y) }; }),
      enemies: s.enemies.filter(e => e.hp > 0).map(e => ({ id: e.id, x: number(e.x), y: number(e.y), hp: number(e.hp), phase: e.phase, kind:e.archetype, r:e.r, angle:number(e.angle), telegraph:e.telegraph, screen:renderer.worldToScreen(e.x,e.y) })),
      boss: s.boss ? {kind:s.boss.kind,name:s.boss.name,x:number(s.boss.x),y:number(s.boss.y),r:s.boss.r,hp:s.boss.hp,maxHp:s.boss.maxHp,phase:s.boss.phase,phaseTimer:number(s.boss.phaseTimer),displayPhase:s.boss.displayPhase,stage:s.boss.stage,openCharges:s.boss.openCharges,telegraph:s.boss.telegraph,pulse:s.boss.pulse,angle:number(s.boss.angle),vulnerable:s.boss.vulnerable,destroyed:s.boss.destroyed,hint:s.boss.hint,screen:renderer.worldToScreen(s.boss.x,s.boss.y),parts:(s.boss.parts||[]).map(part=>({id:part.id,x:number(part.x),y:number(part.y),hp:part.hp,maxHp:part.maxHp,destroyed:part.destroyed,screen:renderer.worldToScreen(part.x,part.y)}))} : null,
      projectiles:(s.projectiles||[]).map(q=>({x:number(q.x),y:number(q.y),r:q.r,kind:q.kind,reflectable:q.reflectable,reflected:q.reflected,screen:renderer.worldToScreen(q.x,q.y)})),
      hazards:(s.hazards||[]).map(h=>({id:h.id,x:h.x,y:h.y,r:h.r,phase:h.phase,timer:number(h.timer),disabled:h.disabled})),
      art: renderer.assets ? [...renderer.assets].filter(([,value])=>value.ready).map(([key])=>key) : [],
      combat:s.combat,view:input.view,
      input: { mx: input.mx, my: input.my, target: input.target }, touches: { move: !!touches.move, aim: !!touches.aim }
    });
  }
  function gatherInput() {
    const viewA = renderer.screenToWorld(0, 0);
    const viewB = renderer.screenToWorld(innerWidth, innerHeight);
    input.view = { left: Math.min(viewA.x, viewB.x), right: Math.max(viewA.x, viewB.x),
      top: Math.min(viewA.y, viewB.y), bottom: Math.max(viewA.y, viewB.y) };
    input.mx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    input.my = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    if (touches.move) {
      const t = touches.move, dx = t.x - t.ox, dy = t.y - t.oy, distance = Math.hypot(dx, dy);
      if (distance > 5) {
        const strength = clamp((distance - 5) / 49, 0, 1);
        input.mx = dx / distance * strength; input.my = dy / distance * strength;
      }
    }
    const length = Math.hypot(input.mx, input.my);
    if (length > 1) { input.mx /= length; input.my /= length; }
    const movement = renderer.screenVectorToWorld(input.mx, input.my);
    input.mx = movement.x; input.my = movement.y; input.target = null;
    if (touches.aim) {
      const t = touches.aim, dx = t.x - t.ox, dy = t.y - t.oy, distance = Math.hypot(dx, dy);
      if (distance > 4) {
        const direction = renderer.screenVectorToWorld(dx / distance, dy / distance);
        const reach = match.state.player.rope.length + 25;
        const amount = clamp(distance / 75, .15, 1);
        input.target = { x: match.state.player.x + direction.x * reach * amount, y: match.state.player.y + direction.y * reach * amount };
      }
    } else if (pointer.seen) input.target = renderer.screenToWorld(pointer.x, pointer.y);
    input.dash = dashQueued;
  }
  function animateDemo(dt) {
    demoTime += dt;
    if (demoTime > 22 || match.state.phase === 'won' || match.state.phase === 'dead') makeDemo();
    const p = match.state.player;
    const destinationX = 850 + Math.sin(demoTime * .46) * 320;
    const destinationY = 500 + Math.sin(demoTime * .7) * 250;
    match.update(dt, { mx: clamp((destinationX - p.x) / 160, -1, 1), my: clamp((destinationY - p.y) / 160, -1, 1),
      target: { x: p.x + Math.cos(demoTime * 3.7) * 235, y: p.y + Math.sin(demoTime * 3.7) * 235 }, dash: false });
  }
  function tick(now) {
    try {
      const elapsed = Math.max(0, now - lastTime);
      if (elapsed < 500) frameAverage += (elapsed - frameAverage) * .05;
      const dt = clamp(elapsed / 1000, 0, .065); lastTime = now;
      if (scene === 'play') {
        gatherInput(); accumulator += dt;
        for (let step = 0; accumulator >= 1 / 120 && step < 9; step++) {
          match.update(1 / 120, input); accumulator -= 1 / 120;
          input.dash = false; dashQueued = false;
          if (scene !== 'play') { accumulator = 0; break; }
        }
        const p = match.state.player, speed = Math.hypot(p.headVX || 0, p.headVY || 0);
        if (speed > 1100 && now - lastWhoosh > 300) { sound('whoosh', clamp(speed / 3200, 0, 1)); lastWhoosh = now; }
      } else if (scene === 'menu' || scene === 'select') animateDemo(dt);
      if (reducedMotion) match.state.shake = 0;
      const renderStart = performance.now();
      renderer.render(match.state, { ...input, touches, pointer: pointer.seen ? pointer : null, scene, reducedMotion });
      renderAverage += (performance.now() - renderStart - renderAverage) * .05;
      if (++frames % 5 === 0) updateHUD();
      if (now > bannerUntil) $('room-banner').classList.remove('show');
      if (now > hintUntil) $('hint').hidden = true;
      requestAnimationFrame(tick);
    } catch (error) { console.error('Loose End game error:', error); $('error-message').hidden = false; }
  }

  canvas.addEventListener('pointerdown', event => {
    if (scene !== 'play') return;
    unlockAudio(); canvas.focus({ preventScroll: true });
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      pointer.seen = false; event.preventDefault();
      const role = event.clientX < innerWidth / 2 ? 'move' : 'aim';
      if (!touches[role]) {
        touches[role] = { id: event.pointerId, ox: event.clientX, oy: event.clientY, x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
      }
    } else { pointer.x = event.clientX; pointer.y = event.clientY; pointer.seen = true; }
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      for (const role of ['move','aim']) {
        const t = touches[role];
        if (t && t.id === event.pointerId) { t.x = event.clientX; t.y = event.clientY; event.preventDefault(); }
      }
    } else if (scene === 'play') { pointer.x = event.clientX; pointer.y = event.clientY; pointer.seen = true; }
  });
  function releaseTouch(event) { for (const role of ['move','aim']) if (touches[role]?.id === event.pointerId) touches[role] = null; }
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, releaseTouch);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  $('touch-dash').addEventListener('pointerdown', event => {
    event.preventDefault(); if (scene === 'play') { dashQueued = true; unlockAudio(); }
  });
  const movementKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  document.addEventListener('keydown', event => {
    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (scene === 'play' || scene === 'pause' || scene === 'select') event.preventDefault();
      if (!event.repeat) { if (scene === 'play') pauseGame(); else if (scene === 'pause') resumeGame(); else if (scene === 'select') { scene = 'menu'; $('encounter-panel').hidden = true; $('encounters').focus(); } }
      return;
    }
    if (scene === 'over' && event.code === 'KeyR' && !event.repeat) { event.preventDefault(); if (match.state.phase === 'won') startGame(false, encounter); else retryRoom(); return; }
    if (scene !== 'play') return;
    if (movementKeys.has(event.code)) { event.preventDefault(); keys.add(event.code); unlockAudio(); }
    if (['Space','ShiftLeft','ShiftRight'].includes(event.code)) { event.preventDefault(); if (!event.repeat) dashQueued = true; unlockAudio(); }
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { if (scene === 'play') pauseGame(); else clearInputs(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && scene === 'play') pauseGame(); });
  $('play').addEventListener('click', () => startGame(false));
  $('practice').addEventListener('click', () => startGame(true));
  $('encounters').addEventListener('click', () => { scene = 'select'; $('encounter-panel').hidden = false; document.querySelector('.encounter-button').focus(); });
  $('encounter-back').addEventListener('click', () => { scene = 'menu'; $('encounter-panel').hidden = true; $('encounters').focus(); });
  for (const button of document.querySelectorAll('.encounter-button')) button.addEventListener('click', () => startGame(false, Number(button.dataset.encounter)));
  $('pause').addEventListener('click', pauseGame); $('resume').addEventListener('click', resumeGame);
  $('restart').addEventListener('click', retryRoom); $('quit').addEventListener('click', toMenu);
  $('home').addEventListener('click', () => { if (scene === 'play') pauseGame(); else if (scene === 'pause') resumeGame(); else if (scene === 'over') toMenu(); });
  $('retry').addEventListener('click', () => { if ($('retry').dataset.won === 'true') startGame(false, encounter); else retryRoom(); });
  $('result-menu').addEventListener('click', toMenu);
  $('sound').addEventListener('click', () => setMuted(!settings.muted));
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('game').requestFullscreen) await $('game').requestFullscreen(); } catch {}
  });
  document.addEventListener('fullscreenchange', () => $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit full screen' : 'Enter full screen'));
  function resize() { renderer.resize(innerWidth, innerHeight); }
  try {
    renderer = new WreckRenderer(canvas); makeDemo(); resize();
    setMuted(settings.muted, false); updateRecord();
    window.addEventListener('resize', () => { clearInputs(); resize(); });
    lastTime = performance.now(); requestAnimationFrame(tick);
    window.looseEnd = Object.freeze({ getState: () => JSON.parse(canvas.dataset.state || '{}'), version: VERSION });
  } catch (error) { console.error('Loose End startup error:', error); $('error-message').hidden = false; }
})();
