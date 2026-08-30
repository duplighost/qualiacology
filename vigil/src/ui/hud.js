// HUD: delete words, show state. The crosshair renders the REAL spread cone.
// Health is a vignette. Ammo is subdued (the mag window and last-3 tracers
// carry it in-world); the HUD number updates 200 ms AFTER the seat clack —
// the sound leads the number, never the reverse. The wave is written in the
// sky; the banner is brief.

import { clamp, clamp01, lerp, DEG, ease } from '../engine/math.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function create(ctx) {
  const hud = document.getElementById('hud');
  hud.innerHTML = `
    <div id="vignette"></div>
    <div id="dmg-vignette"></div>
    <div id="shield-vignette"></div>
    <div id="hurt-vignette"></div>
    <canvas id="reticle" width="220" height="220"></canvas>
    <canvas id="dmgdir" width="360" height="360"></canvas>
    <div id="ammo"><span class="mag">30</span> <span class="res">/ 210</span></div>
    <div id="vitals"><span class="pips"></span><span class="hp">100</span><span class="shield"></span></div>
    <div id="banner"></div>
    <div id="salvage-confirm"><strong>SALVAGE SECURED</strong> <small>+45 AMMO // +20 HEALTH</small></div>
    <div class="shell" id="shell">
      <h1>VIGIL</h1>
      <p>The relay is dark. The eclipse is rising.<br/>Hold the deck until dawn.</p>
      <button class="go" id="go">BEGIN THE WATCH</button>
      <div class="keys">WASD move &nbsp;·&nbsp; SHIFT sprint &nbsp;·&nbsp; HOLD CTRL crouch &nbsp;·&nbsp; SPRINT + CTRL slide &nbsp;·&nbsp; SPACE jump<br/>
      MOUSE aim &nbsp;·&nbsp; LMB fire &nbsp;·&nbsp; RMB sights &nbsp;·&nbsp; R reload &nbsp;·&nbsp; V melee</div>
      <div id="boot-note"></div>
    </div>`;

  const el = (id) => document.getElementById(id);
  const shell = el('shell'), go = el('go'), banner = el('banner');
  const salvageConfirm = el('salvage-confirm');
  const salvageDetail = salvageConfirm.querySelector('small');
  const ammoEl = el('ammo'), ammoMag = ammoEl.querySelector('.mag'), ammoRes = ammoEl.querySelector('.res');
  const vitalsEl = el('vitals'), hpNum = vitalsEl.querySelector('.hp');
  const shieldNum = vitalsEl.querySelector('.shield'), hpPips = vitalsEl.querySelector('.pips');
  const PIPS = 5;
  for (let i = 0; i < PIPS; i++) hpPips.appendChild(document.createElement('i'));
  const pipEls = [...hpPips.children];
  const dmgV = el('dmg-vignette'), shieldV = el('shield-vignette'), hurtV = el('hurt-vignette');
  const ret = el('reticle').getContext('2d');
  const dd = el('dmgdir').getContext('2d');

  go.addEventListener('click', (e) => { e.stopPropagation(); ctx.bus.emit('ui:start'); });
  shell.addEventListener('click', () => ctx.bus.emit('ui:start'));

  let marker = null;            // {kind, age}
  let bannerT = 99, bannerHold = 2.4;
  let dmgFlash = 0, shieldFlash = 0;
  let dmgDirs = [];             // {angle, age, shield}
  let pendingAmmo = null, pendingT = 0;
  let shownAmmo = { ammo: 30, reserve: 210 };
  let reloadFeedback = null;
  let salvageT = 99, salvageShowing = false;
  let deadStats = { wave: 1, kills: 0 };
  let kills = 0;

  function setBanner(main, sub = '') {
    banner.innerHTML = `${main}${sub ? `<small>${sub}</small>` : ''}`;
    bannerT = 0;
  }

  ctx.bus.on('combat:marker', ({ kind }) => { marker = { kind, age: 0 }; });
  ctx.bus.on('combat:kill', () => { kills++; });
  ctx.bus.on('player:hurt', ({ fromDir }) => {
    dmgFlash = 1;
    if (fromDir) {
      const cam = ctx.systems.camera;
      const worldA = Math.atan2(fromDir.x, fromDir.z);
      dmgDirs.push({ angle: worldA + cam.yaw + Math.PI, age: 0, shield: false });
      if (dmgDirs.length > 4) dmgDirs.shift();
    }
  });
  ctx.bus.on('player:shield-hit', ({ fromDir }) => {
    shieldFlash = 1;
    if (fromDir) {
      const cam = ctx.systems.camera;
      const worldA = Math.atan2(fromDir.x, fromDir.z);
      dmgDirs.push({ angle: worldA + cam.yaw + Math.PI, age: 0, shield: true });
      if (dmgDirs.length > 4) dmgDirs.shift();
    }
  });
  ctx.bus.on('weapon:ammo', (a) => { pendingAmmo = { ...a }; pendingT = 0.2; });
  ctx.bus.on('weapon:reload:start', () => { reloadFeedback = null; });
  ctx.bus.on('weapon:reload:active', (a) => { reloadFeedback = { ...a, age: 0 }; });
  ctx.bus.on('wave:start', ({ wave, final }) => {
    setBanner(`WATCH ${ROMAN[wave] || wave}`, wave === 1 ? 'hold until dawn' : wave === final ? 'the last of the night' : '');
  });
  ctx.bus.on('wave:clear', () => setBanner('CLEAR', 'breathe'));
  ctx.bus.on('rock:upgrade', ({ kind, value }) => {
    if (kind === 'cinder') setBanner('CINDER CORE', value > 0 ? `${value} charged rounds` : 'charge full');
    else if (kind === 'aegis') setBanner('AEGIS CORE', value > 0 ? `+${value} shield` : 'shield full');
  });
  ctx.bus.on('supply:collect', ({ kind, ammo, heal, awardAmmo, awardHeal }) => {
    if (kind !== 'satellite') return;
    const ammoGain = Number.isFinite(ammo) ? ammo : (awardAmmo ?? 45);
    const healGain = Number.isFinite(heal) ? heal : (awardHeal ?? 20);
    const ammoRead = ammoGain > 0 ? `+${ammoGain} AMMO` : 'AMMO FULL';
    const healRead = healGain > 0 ? `+${healGain} HEALTH` : 'HEALTH FULL';
    salvageDetail.textContent = `${ammoRead} // ${healRead}`;
    salvageT = 0;
    salvageShowing = true;
  });
  ctx.bus.on('run:won', () => {
    showShell('DAWN.', `The watch held. ${kills} put down.`, 'STAND ANOTHER WATCH');
  });
  ctx.bus.on('state', ({ next }) => {
    if (next === 'playing') shell.classList.add('hidden');
    else if (next === 'paused') showShell('HELD', 'The night waits.', 'RETURN TO THE WATCH');
    else if (next === 'dead') {
      showShell('THE WATCH ENDS', `Watch ${ROMAN[ctx.systems.director.wave]} · ${kills} put down.`, 'STAND AGAIN');
    } else if (next === 'menu') shell.classList.remove('hidden');
  });

  function showShell(title, sub, cta) {
    shell.querySelector('h1').textContent = title;
    shell.querySelector('p').innerHTML = sub;
    go.textContent = cta;
    shell.classList.remove('hidden');
  }

  function drawActiveReload(wep, dt, cx, cy) {
    const live = wep.reloadState?.();
    let rl = live;
    if (reloadFeedback) {
      reloadFeedback.age += dt;
      if (!rl && reloadFeedback.age < 0.30) {
        rl = {
          progress: reloadFeedback.progress,
          windowStart: reloadFeedback.windowStart,
          windowEnd: reloadFeedback.windowEnd,
          attempted: true,
          outcome: reloadFeedback.outcome,
          jamFrac: reloadFeedback.outcome === 'fail' ? 1 : 0,
        };
      }
      if (reloadFeedback.age >= 0.30 && !live) reloadFeedback = null;
    }
    if (!rl) return;

    const resolved = rl.attempted && rl.outcome !== 'pending';
    const resolveAge = resolved ? (reloadFeedback?.age ?? 0) : 0;
    const alpha = resolved ? clamp01(1 - resolveAge / 0.30) : 1;
    if (alpha <= 0) return;

    const w = 172, h = 8;
    const x = cx - w / 2, y = cy + 58;
    const fail = rl.outcome === 'fail';
    const success = rl.outcome === 'success';
    const pulse = success ? 1 + Math.sin(clamp01(resolveAge / 0.22) * Math.PI) * 0.36 : 1;

    ret.save();
    ret.globalAlpha = alpha;
    ret.shadowColor = success ? 'rgba(93,247,255,0.92)' : fail ? 'rgba(255,230,109,0.76)' : 'rgba(93,247,255,0.42)';
    ret.shadowBlur = success ? 14 : 5;
    ret.fillStyle = 'rgba(7,12,23,0.76)';
    ret.fillRect(x - 4, y - 4, w + 8, h + 8);
    ret.shadowBlur = 0;
    ret.fillStyle = fail ? 'rgba(255,230,109,0.30)' : 'rgba(137,109,255,0.24)';
    ret.fillRect(x, y, w, h);

    const wx = x + rl.windowStart * w;
    const ww = Math.max(8, (rl.windowEnd - rl.windowStart) * w);
    ret.fillStyle = success ? `rgba(93,247,255,${0.92 * pulse})` : fail ? 'rgba(255,230,109,0.74)' : 'rgba(93,247,255,0.70)';
    ret.fillRect(wx, y - (pulse - 1) * 4, ww, h + (pulse - 1) * 8);

    // Brackets and a centre notch make the target readable without hue.
    ret.strokeStyle = `rgba(233,250,255,${0.82 * alpha})`;
    ret.lineWidth = 1;
    ret.beginPath();
    ret.moveTo(wx, y - 4); ret.lineTo(wx, y + h + 4);
    ret.moveTo(wx + ww, y - 4); ret.lineTo(wx + ww, y + h + 4);
    const mid = wx + ww * 0.5;
    ret.moveTo(mid, y - 3); ret.lineTo(mid, y + 1);
    ret.moveTo(mid, y + h - 1); ret.lineTo(mid, y + h + 3);
    ret.stroke();

    // A resolved success gains a bright enclosing frame and diamond at the
    // needle: the result remains legible even without colour perception.
    if (success) {
      ret.strokeStyle = `rgba(222,255,255,${0.92 * alpha})`;
      ret.lineWidth = 2;
      ret.strokeRect(x - 3 - (pulse - 1) * 2, y - 3 - (pulse - 1) * 2,
        w + 6 + (pulse - 1) * 4, h + 6 + (pulse - 1) * 4);
    }

    const nx = x + clamp01(rl.progress) * w;
    ret.translate(nx, y + h * 0.5);
    if (fail) ret.rotate(-0.22 * (rl.jamFrac || 1));
    ret.fillStyle = fail ? 'rgba(255,230,109,0.98)' : 'rgba(250,253,255,0.98)';
    ret.fillRect(-1.5, -8, 3, 16);
    if (success) {
      ret.rotate(Math.PI * 0.25);
      ret.strokeStyle = 'rgba(222,255,255,0.98)';
      ret.lineWidth = 1.5;
      ret.strokeRect(-5, -5, 10, 10);
    }
    ret.restore();
  }

  function drawReticle(dt) {
    const w = 220, h = 220, cx = w / 2, cy = h / 2;
    ret.clearRect(0, 0, w, h);
    if (ctx.state !== 'playing') return;
    const wep = ctx.systems.weapons;
    const cam = ctx.camera;
    // real cone -> pixels
    const vh = window.innerHeight;
    const conePx = Math.tan(wep.spreadDeg * DEG) / Math.tan(cam.fov * DEG / 2) * (vh / 2);
    const gap = clamp(4 + conePx, 4, 70);
    const adsFade = 1 - wep.adsT * 0.55;
    ret.strokeStyle = `rgba(226,242,255,${0.75 * adsFade})`;
    ret.lineWidth = 1.6;
    const len = 7;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ret.beginPath();
      ret.moveTo(cx + dx * gap, cy + dy * gap);
      ret.lineTo(cx + dx * (gap + len), cy + dy * (gap + len));
      ret.stroke();
    }
    ret.fillStyle = `rgba(226,242,255,${0.9 * adsFade})`;
    ret.fillRect(cx - 1, cy - 1, 2, 2);

    drawActiveReload(wep, dt, cx, cy);

    // hitmarker: 4 diagonal ticks; deflect angles INWARD; kill adds the X bar
    if (marker) {
      const m = marker;
      const life = m.kind === 'kill' ? 0.26 : 0.21;
      const t = m.age / life;
      let alpha = t < 0.286 ? 1 : t < 0.476 ? 1 : 1 - (t - 0.476) / 0.524;
      const ex = t < 0.286 ? lerp(4, 8, ease.outQuad(t / 0.286)) : 8;
      const kcol = m.kind === 'kill' ? '255,82,56' : m.kind === 'weak' ? '255,220,90'
        : m.kind === 'deflect' ? '140,158,178' : '245,250,255';
      const scale = m.kind === 'kill' ? 1.4 : m.kind === 'weak' ? 1.25 : m.kind === 'deflect' ? 0.8 : 1;
      ret.strokeStyle = `rgba(${kcol},${alpha * 0.92})`;
      ret.lineWidth = 2;
      const tick = 9 * scale;
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        ret.beginPath();
        if (m.kind === 'deflect') {
          // inward: wrongness you read pre-attentively
          ret.moveTo(cx + sx * (ex + tick), cy + sy * (ex + tick));
          ret.lineTo(cx + sx * ex, cy + sy * ex);
        } else {
          ret.moveTo(cx + sx * ex, cy + sy * ex);
          ret.lineTo(cx + sx * (ex + tick), cy + sy * (ex + tick));
        }
        ret.stroke();
      }
      if (m.kind === 'kill') {
        ret.beginPath();
        ret.moveTo(cx - ex - tick, cy);
        ret.lineTo(cx - ex, cy);
        ret.moveTo(cx + ex, cy);
        ret.lineTo(cx + ex + tick, cy);
        ret.stroke();
      }
      m.age += dt;
      if (m.age > life) marker = null;
    }
  }

  function drawDmgDir(dt) {
    dd.clearRect(0, 0, 360, 360);
    if (!dmgDirs.length) return;
    for (let i = dmgDirs.length - 1; i >= 0; i--) {
      const d = dmgDirs[i];
      d.age += dt;
      if (d.age > 1.1) { dmgDirs.splice(i, 1); continue; }
      const cam = ctx.systems.camera;
      const rel = d.angle - cam.yaw;
      const alpha = (1 - d.age / 1.1) * (d.shield ? 0.9 : 0.8);
      dd.strokeStyle = d.shield
        ? `rgba(93,247,255,${alpha})`
        : `rgba(255,90,120,${alpha})`;
      dd.lineWidth = d.shield ? 4 : 5;
      dd.beginPath();
      const radius = d.shield ? 128 : 120;
      dd.arc(180, 180, radius, rel - Math.PI / 2 - 0.4, rel - Math.PI / 2 + 0.4);
      dd.stroke();
    }
  }

  return {
    id: 'hud',
    onResize() {},
    update(dt) {
      drawReticle(dt);
      drawDmgDir(dt);

      // ammo: number trails the seat sound by 200 ms
      if (pendingAmmo) {
        pendingT -= dt;
        if (pendingT <= 0) { shownAmmo = pendingAmmo; pendingAmmo = null; }
      }
      const live = ctx.systems.weapons.ammoState();
      if (!pendingAmmo && live.ammo !== shownAmmo.ammo) shownAmmo = { ammo: live.ammo, reserve: live.reserve };
      ammoMag.textContent = shownAmmo.ammo;
      ammoRes.textContent = `/ ${shownAmmo.reserve}`;
      ammoEl.classList.toggle('low', shownAmmo.ammo <= 10 && shownAmmo.ammo > 0);
      ammoEl.classList.toggle('dry', shownAmmo.ammo === 0);
      ammoEl.classList.toggle('boosted', !!live.boosted);
      ammoEl.style.opacity = ctx.state === 'playing' ? 1 : 0;

      // health vignettes
      dmgFlash = Math.max(0, dmgFlash - dt * 6);
      shieldFlash = Math.max(0, shieldFlash - dt * 7.5);
      dmgV.style.opacity = dmgFlash * 0.9;
      shieldV.style.opacity = shieldFlash * 0.82;
      const hp = ctx.systems.player.hp;
      const lowHp = clamp01((42 - hp) / 42);
      hurtV.style.opacity = lowHp * (0.55 + Math.sin(ctx.time * (3 + lowHp * 4)) * 0.18);

      // vitals: same weight and rhythm as the ammo readout, opposite corner —
      // five pips that drain, and a number you only read if you want it
      const shown = Math.max(0, Math.ceil(hp));
      hpNum.textContent = shown;
      const shield = Math.max(0, Math.ceil(ctx.systems.player.shield || 0));
      shieldNum.textContent = shield > 0 ? `+${shield}` : '';
      const filled = hp / 100 * PIPS;
      for (let i = 0; i < PIPS; i++) {
        const f = clamp01(filled - i);
        pipEls[i].style.opacity = 0.18 + f * 0.82;
        pipEls[i].style.transform = `scaleY(${0.55 + f * 0.45})`;
      }
      vitalsEl.className = hp <= 25 ? 'crit' : hp <= 55 ? 'low' : '';
      vitalsEl.classList.toggle('shielded', shield > 0);
      vitalsEl.style.opacity = ctx.state === 'playing'
        ? (hp <= 25 ? 0.85 + Math.sin(ctx.time * 7) * 0.15 : 1)
        : 0;

      // banner
      bannerT += dt;
      const bA = bannerT < 0.3 ? bannerT / 0.3 : bannerT < bannerHold ? 1 : Math.max(0, 1 - (bannerT - bannerHold) / 0.6);
      banner.style.opacity = bA;

      // Satellite confirmation is independent of the wave banner: the wreck
      // can open during CONTACT without overwriting the watch's only title.
      if (salvageShowing) {
        salvageT += dt;
        const salvageIn = clamp01(salvageT / 0.18);
        const salvageOut = clamp01((salvageT - 1.65) / 0.48);
        salvageConfirm.style.opacity = ctx.state === 'playing' ? salvageIn * (1 - salvageOut) : 0;
        salvageConfirm.style.transform = `translate(-50%, ${lerp(9, -7, salvageIn) - salvageOut * 7}px)`;
        if (salvageOut >= 1) {
          salvageShowing = false;
          salvageConfirm.style.opacity = 0;
        }
      }
    },
  };
}
