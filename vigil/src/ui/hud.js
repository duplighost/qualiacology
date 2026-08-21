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
    <div id="hurt-vignette"></div>
    <canvas id="reticle" width="220" height="220"></canvas>
    <canvas id="dmgdir" width="360" height="360"></canvas>
    <div id="ammo"><span class="mag">30</span> <span class="res">/ 210</span></div>
    <div id="vitals"><span class="pips"></span><span class="hp">100</span></div>
    <div id="banner"></div>
    <div class="shell" id="shell">
      <h1>VIGIL</h1>
      <p>The relay is dark. The eclipse is rising.<br/>Hold the deck until dawn.</p>
      <button class="go" id="go">BEGIN THE WATCH</button>
      <div class="keys">WASD move &nbsp;·&nbsp; SHIFT sprint &nbsp;·&nbsp; CTRL crouch / slide &nbsp;·&nbsp; SPACE jump<br/>
      MOUSE aim &nbsp;·&nbsp; LMB fire &nbsp;·&nbsp; RMB sights &nbsp;·&nbsp; R reload &nbsp;·&nbsp; V melee</div>
      <div id="boot-note"></div>
    </div>`;

  const el = (id) => document.getElementById(id);
  const shell = el('shell'), go = el('go'), banner = el('banner');
  const ammoEl = el('ammo'), ammoMag = ammoEl.querySelector('.mag'), ammoRes = ammoEl.querySelector('.res');
  const vitalsEl = el('vitals'), hpNum = vitalsEl.querySelector('.hp'), hpPips = vitalsEl.querySelector('.pips');
  const PIPS = 5;
  for (let i = 0; i < PIPS; i++) hpPips.appendChild(document.createElement('i'));
  const pipEls = [...hpPips.children];
  const dmgV = el('dmg-vignette'), hurtV = el('hurt-vignette');
  const ret = el('reticle').getContext('2d');
  const dd = el('dmgdir').getContext('2d');

  go.addEventListener('click', (e) => { e.stopPropagation(); ctx.bus.emit('ui:start'); });
  shell.addEventListener('click', () => ctx.bus.emit('ui:start'));

  let marker = null;            // {kind, age}
  let bannerT = 99, bannerHold = 2.4;
  let dmgFlash = 0;
  let dmgDirs = [];             // {angle, age}
  let pendingAmmo = null, pendingT = 0;
  let shownAmmo = { ammo: 30, reserve: 210 };
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
      dmgDirs.push({ angle: worldA + cam.yaw + Math.PI, age: 0 });
      if (dmgDirs.length > 4) dmgDirs.shift();
    }
  });
  ctx.bus.on('weapon:ammo', (a) => { pendingAmmo = { ...a }; pendingT = 0.2; });
  ctx.bus.on('wave:start', ({ wave, final }) => {
    setBanner(`WATCH ${ROMAN[wave] || wave}`, wave === 1 ? 'hold until dawn' : wave === final ? 'the last of the night' : '');
  });
  ctx.bus.on('wave:clear', () => setBanner('CLEAR', 'breathe'));
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
      const alpha = (1 - d.age / 1.1) * 0.8;
      dd.strokeStyle = `rgba(255,90,120,${alpha})`;
      dd.lineWidth = 5;
      dd.beginPath();
      dd.arc(180, 180, 120, rel - Math.PI / 2 - 0.4, rel - Math.PI / 2 + 0.4);
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
      ammoEl.style.opacity = ctx.state === 'playing' ? 1 : 0;

      // health vignettes
      dmgFlash = Math.max(0, dmgFlash - dt * 6);
      dmgV.style.opacity = dmgFlash * 0.9;
      const hp = ctx.systems.player.hp;
      const lowHp = clamp01((42 - hp) / 42);
      hurtV.style.opacity = lowHp * (0.55 + Math.sin(ctx.time * (3 + lowHp * 4)) * 0.18);

      // vitals: same weight and rhythm as the ammo readout, opposite corner —
      // five pips that drain, and a number you only read if you want it
      const shown = Math.max(0, Math.ceil(hp));
      hpNum.textContent = shown;
      const filled = hp / 100 * PIPS;
      for (let i = 0; i < PIPS; i++) {
        const f = clamp01(filled - i);
        pipEls[i].style.opacity = 0.18 + f * 0.82;
        pipEls[i].style.transform = `scaleY(${0.55 + f * 0.45})`;
      }
      vitalsEl.className = hp <= 25 ? 'crit' : hp <= 55 ? 'low' : '';
      vitalsEl.style.opacity = ctx.state === 'playing'
        ? (hp <= 25 ? 0.85 + Math.sin(ctx.time * 7) * 0.15 : 1)
        : 0;

      // banner
      bannerT += dt;
      const bA = bannerT < 0.3 ? bannerT / 0.3 : bannerT < bannerHold ? 1 : Math.max(0, 1 - (bannerT - bannerHold) / 0.6);
      banner.style.opacity = bA;
    },
  };
}
