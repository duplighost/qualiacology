const $ = (id) => document.getElementById(id);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class GameUI {
  constructor() {
    this.shell = $('game-shell');
    this.title = $('title-card');
    this.hud = $('hud');
    this.pause = $('pause-panel');
    this.result = $('result-panel');
    this.status = $('status-line');
    this.controls = $('controls');
    this.bossHealth = $('boss-health');
    this.bossHealthTrack = $('boss-health-track');
    this.phaseHealth = $('phase-health');
    this.playerHealth = $('player-health');
    this.phaseName = $('phase-name');
    this.styleRank = $('style-rank');
    this.cadenceFill = $('cadence-fill');
    this.combo = $('combo-readout');
    this.specialReady = $('special-ready');
    this.resolvePips = Array.from($('resolve-pips').children);
    this.telegraphElement = $('boss-telegraph');
    this.calloutElement = $('combat-callout');
    this.reticle = $('reticle');
    this.flash = $('impact-flash');
    this.mute = $('mute-button');
    this.startButton = $('start-button');
    this.resumeButton = $('resume-button');
    this.restartButton = $('restart-button');
    this.rematchButton = $('rematch-button');
    this._calloutTimer = 0;
    this._damageTimer = 0;
    this._perfectTimer = 0;
    this._last = {};
  }

  setReady(message = 'Click to enter the Meridian') {
    this.status.textContent = message;
    this.status.style.opacity = '0';
    this.startButton.disabled = false;
  }

  showGame() {
    this.title.setAttribute('aria-hidden', 'true');
    this.hud.setAttribute('aria-hidden', 'false');
    this.pause.setAttribute('aria-hidden', 'true');
    this.result.setAttribute('aria-hidden', 'true');
    this.mute.setAttribute('aria-hidden', 'false');
    this.mute.classList.remove('context-hidden');
    this.status.style.opacity = '0';
    this.controls.setAttribute('aria-hidden', 'false');
    this.controls.classList.remove('hidden');
  }

  showTitle() {
    this.title.setAttribute('aria-hidden', 'false');
    this.hud.setAttribute('aria-hidden', 'true');
    this.controls.setAttribute('aria-hidden', 'true');
  }

  setPaused(paused) {
    this.pause.setAttribute('aria-hidden', paused ? 'false' : 'true');
  }

  showResult({ victory, time = 0, rank = 'STILL', damage = 0, parries = 0 }) {
    $('result-eyebrow').textContent = victory ? 'THE DIAL IS YOURS' : 'THE SECOND CLOSES';
    $('result-title').innerHTML = victory ? 'SECOND<br><strong>RESTORED</strong>' : 'MEASURE<br><strong>BROKEN</strong>';
    $('result-time').textContent = `${Math.floor(time / 60).toString().padStart(2,'0')}:${Math.floor(time % 60).toString().padStart(2,'0')}`;
    $('result-rank').textContent = rank;
    $('result-damage').textContent = String(Math.round(damage));
    $('result-parries').textContent = String(parries);
    this.rematchButton.textContent = victory ? 'REMATCH  ↵' : 'RISE AGAIN  ↵';
    this.result.querySelector(':scope > p:last-child').textContent = victory ? 'Restarted in place. No reload. No mercy.' : 'Failure is only a timing note.';
    this.hud.setAttribute('aria-hidden', 'true');
    this.controls.setAttribute('aria-hidden', 'false');
    this.controls.classList.remove('hidden');
    this.mute.setAttribute('aria-hidden', 'true');
    this.mute.classList.add('context-hidden');
    this.result.setAttribute('aria-hidden', 'false');
  }

  hideResult() { this.result.setAttribute('aria-hidden', 'true'); }

  update(state, dt) {
    const playerRatio = clamp01(state.player.hp / state.player.maxHp);
    const bossRatio = clamp01(state.boss.hp / state.boss.maxHp);
    this.playerHealth.style.transform = `scaleX(${playerRatio})`;
    this.bossHealth.style.transform = `scaleX(${bossRatio})`;
    this.bossHealth.style.filter = state.boss.invulnerable ? 'saturate(.2) brightness(.7)' : '';
    const phase = Math.max(1, Math.min(3, state.boss.phase || 1));
    const phaseMax = Number.isFinite(state.boss.phaseMaxHp) ? state.boss.phaseMaxHp : [0, 2000, 2400, 3000][phase];
    const phaseFloor = [0, 5400, 3000, 0][phase];
    const phaseHp = Number.isFinite(state.boss.phaseHp)
      ? state.boss.phaseHp
      : clamp01((state.boss.hp - phaseFloor) / phaseMax) * phaseMax;
    const roundedTotal = Math.max(0, Math.round(state.boss.hp));
    const roundedPhase = Math.max(0, Math.round(phaseHp));
    const healthKey = `${phase}:${roundedPhase}:${roundedTotal}`;
    if (this._last.health !== healthKey) {
      const phaseLabel = ['','I','II','III'][phase];
      const phaseText = `${roundedPhase.toLocaleString('en-US')} / ${phaseMax.toLocaleString('en-US')}`;
      this.phaseHealth.textContent = `PHASE RESERVE · ${phaseText}`;
      this.bossHealthTrack.setAttribute('aria-valuenow', String(roundedTotal));
      this.bossHealthTrack.setAttribute('aria-valuemax', String(Math.round(state.boss.maxHp)));
      this.bossHealthTrack.setAttribute('aria-valuetext', `Phase ${phaseLabel}, ${phaseText} phase health; ${roundedTotal.toLocaleString('en-US')} total health remaining`);
      this._last.health = healthKey;
    }
    for (let i = 0; i < this.resolvePips.length; i++) this.resolvePips[i].classList.toggle('spent', i >= state.player.resolve);
    this.phaseName.textContent = ['','I · THE MEASURED HAND','II · THE BROKEN DIAL','III · BLACK NOON'][phase] || '';
    const style = state.player.styleName || 'STILL';
    if (this._last.style !== style) {
      this.styleRank.textContent = style;
      this.styleRank.animate?.([
        { transform: 'translateX(10px) scale(.86)', opacity: .2 },
        { transform: 'translateX(0) scale(1.08)', opacity: 1 },
        { transform: 'scale(1)' }
      ], { duration: 360, easing: 'cubic-bezier(.2,.9,.2,1)' });
      this._last.style = style;
    }
    this.cadenceFill.style.transform = `scaleX(${clamp01(state.player.meter / 100)})`;
    this.specialReady.classList.toggle('ready', state.player.meter >= 100);
    this.combo.textContent = state.player.combo > 1 ? `${state.player.combo} cuts · ${state.player.seams} seams` : state.player.seams ? `${state.player.seams} seam${state.player.seams > 1 ? 's' : ''} waiting` : 'vary your route';
    this.reticle.classList.toggle('active', state.player.locked);

    if (this._calloutTimer > 0) {
      this._calloutTimer -= dt;
      if (this._calloutTimer <= 0) this.calloutElement.classList.remove('show');
    }
    if (this._damageTimer > 0) {
      this._damageTimer -= dt;
      if (this._damageTimer <= 0) this.shell.classList.remove('damage');
    }
    if (this._perfectTimer > 0) {
      this._perfectTimer -= dt;
      if (this._perfectTimer <= 0) this.shell.classList.remove('perfect');
    }
  }

  callout(text, tone = 'cyan') {
    this.calloutElement.textContent = text;
    this.calloutElement.style.color = tone === 'amber' ? 'var(--amber)' : tone === 'danger' ? 'var(--danger)' : 'var(--cyan-hot)';
    this.calloutElement.classList.remove('show');
    void this.calloutElement.offsetWidth;
    this.calloutElement.classList.add('show');
    this._calloutTimer = .72;
  }

  telegraph(duration = .55, active = true) {
    this.telegraphElement.classList.remove('active');
    this.telegraphElement.style.setProperty('--telegraph', `${duration}s`);
    if (active) {
      void this.telegraphElement.offsetWidth;
      this.telegraphElement.classList.add('active');
    }
  }

  positionTelegraph(xPercent, yPercent, visible = true) {
    this.telegraphElement.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible) return;
    this.telegraphElement.style.left = `${Math.max(4, Math.min(96, xPercent))}%`;
    this.telegraphElement.style.top = `${Math.max(8, Math.min(88, yPercent))}%`;
  }

  impact(weight = 1) {
    if (weight < .72) return;
    this.flash.classList.remove('flash');
    void this.flash.offsetWidth;
    this.flash.classList.add('flash');
  }

  damage() {
    this.shell.classList.remove('damage');
    void this.shell.offsetWidth;
    this.shell.classList.add('damage');
    this._damageTimer = .24;
  }

  perfect() {
    this.shell.classList.add('perfect');
    this._perfectTimer = .28;
  }

  setMuted(muted) { this.mute.textContent = muted ? 'SOUND OFF' : 'SOUND ON'; }
}
