// Optional expedition rewards are presentation relics. One can be equipped at
// a time, all are displayed at the Spire, and none modifies combat numbers or
// unlock requirements.

import * as THREE from 'three';
import { G } from '../state.js';
import { save } from '../core/save.js';
import { sfx } from '../core/audio.js';
import { RELIC_BY_ID, TRIAL_DESTS } from '../world/trialdata.js';
import { SKINS } from '../world/features.js';

const relicOrder = TRIAL_DESTS.map((d) => d.relic.id);

export class RelicSystem {
  constructor() {
    this.active = null;
    this.t = 0;
    this.emitT = 0;
    this.soundT = 0;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.renderOrder = 3;
    this.listEl = document.getElementById('relic-list');
    this.detailEl = document.getElementById('relic-detail');
    this.skinListEl = document.getElementById('skin-list');
    this.skinDetailEl = document.getElementById('skin-detail');
    this._buildList();
    this._buildSkins();
    this.sync();
  }

  _buildSkins() {
    if (!this.skinListEl) return;
    this.skinListEl.innerHTML = '';
    for (const [id, skin] of Object.entries(SKINS)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skin-chip';
      button.dataset.skin = id;
      button.style.setProperty('--skin-body', `#${skin.body.toString(16).padStart(6, '0')}`);
      button.style.setProperty('--skin-glow', `#${skin.glow.toString(16).padStart(6, '0')}`);
      button.innerHTML = `<span class="skin-swatch" aria-hidden="true"></span><span>${skin.name}</span><small class="skin-state"></small>`;
      button.addEventListener('click', () => this.equipSkin(id));
      this.skinListEl.appendChild(button);
    }
  }

  _buildList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';
    for (const id of relicOrder) {
      const relic = RELIC_BY_ID[id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'relic-chip';
      button.dataset.relic = id;
      button.style.setProperty('--relic', `rgb(${relic.color.map((v) => Math.round(v * 255)).join(',')})`);
      button.innerHTML = `<span class="relic-gem" aria-hidden="true"></span><span>${relic.name}</span>`;
      button.addEventListener('click', () => this.equip(id));
      this.listEl.appendChild(button);
    }
  }

  unlock(relic) {
    if (!relic || !RELIC_BY_ID[relic.id]) return;
    const fresh = !G.save.relics[relic.id];
    G.save.relics[relic.id] = true;
    G.save.activeRelic = relic.id;
    save();
    this.sync();
    sfx('unlock');
    G.postfx?.pulse(1.05);
    if (fresh) {
      G.hud?.reward({ kind: 'RELIC AWAKENED', name: relic.name, detail: 'EQUIPPED · TAB OPENS THE RELIC VAULT' });
    } else {
      G.hud?.whisper(`${relic.name} · EQUIPPED`, 2.2);
    }
  }

  equip(id) {
    if (!G.save.relics[id]) return false;
    G.save.activeRelic = G.save.activeRelic === id ? null : id;
    save();
    this.sync();
    sfx('pickup', { gain: 0.8 });
    return true;
  }

  equipSkin(id) {
    if (!SKINS[id] || (id !== 'default' && !G.save.skins[id])) return false;
    G.save.skin = id;
    G.weapon?.applySkin(id);
    save();
    this.syncSkins();
    sfx('pickup', { gain: 0.9 });
    G.hud?.whisper(`${SKINS[id].name} · EQUIPPED`, 1.8);
    return true;
  }

  sync() {
    this.active = RELIC_BY_ID[G.save.activeRelic] || null;
    for (const button of this.listEl?.querySelectorAll('.relic-chip') || []) {
      const id = button.dataset.relic;
      const owned = !!G.save.relics[id];
      button.classList.toggle('owned', owned);
      button.classList.toggle('equipped', this.active?.id === id);
      button.disabled = !owned;
      button.setAttribute('aria-pressed', this.active?.id === id ? 'true' : 'false');
      const relic = RELIC_BY_ID[id];
      const label = button.querySelector('span:last-child');
      if (label) label.textContent = owned ? relic.name : 'UNDISCOVERED';
      button.setAttribute('aria-label', owned ? `${relic.name}. ${relic.description}. ${this.active?.id === id ? 'Equipped' : 'Equip'}` : 'Undiscovered relic');
    }
    const relicCount = relicOrder.filter((id) => G.save.relics[id]).length;
    if (this.detailEl) this.detailEl.textContent = this.active
      ? `${relicCount} / ${relicOrder.length} FOUND · ${this.active.name} EQUIPPED — ${this.active.description}`
      : `${relicCount} / ${relicOrder.length} FOUND · NONE EQUIPPED · RELICS CHANGE PRESENTATION, NEVER YOUR NUMBERS`;
    this._rebuildCompanion();
    G.weapon?.setRelicAccent?.(this.active);
    this.syncSkins();
  }

  syncSkins() {
    if (!SKINS[G.save.skin]) G.save.skin = 'default';
    const active = G.save.skin || 'default';
    for (const button of this.skinListEl?.querySelectorAll('.skin-chip') || []) {
      const id = button.dataset.skin;
      const owned = id === 'default' || !!G.save.skins[id];
      const equipped = owned && active === id;
      button.classList.toggle('owned', owned);
      button.classList.toggle('equipped', equipped);
      button.disabled = !owned;
      button.setAttribute('aria-pressed', equipped ? 'true' : 'false');
      button.setAttribute('aria-label', owned
        ? `${SKINS[id].name}. ${equipped ? 'Equipped' : 'Equip Sparkcaster skin'}`
        : `${SKINS[id].name}. Locked battle-shrine skin`);
      const state = button.querySelector('.skin-state');
      if (state) state.textContent = equipped ? 'EQUIPPED' : owned ? 'OWNED' : 'LOCKED';
    }
    const shrineSkins = Object.keys(SKINS).filter((id) => id !== 'default');
    const earned = shrineSkins.filter((id) => G.save.skins[id]).length;
    if (this.skinDetailEl) this.skinDetailEl.textContent = `${earned} / ${shrineSkins.length} SHRINE FINISHES EARNED · ${SKINS[active].name} EQUIPPED`;
  }

  _rebuildCompanion() {
    for (const child of [...this.group.children]) {
      child.geometry?.dispose?.(); child.material?.dispose?.(); this.group.remove(child);
    }
    if (!this.active) { this.group.visible = false; return; }
    const c = new THREE.Color(...this.active.color);
    const glow = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.84, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const shell = new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.55), emissive: c, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.25 });
    let geo;
    switch (this.active.shape) {
      case 'moon': geo = new THREE.SphereGeometry(0.24, 12, 8); break;
      case 'moth': geo = new THREE.OctahedronGeometry(0.22, 0); break;
      case 'puff': geo = new THREE.IcosahedronGeometry(0.25, 1); break;
      case 'bell': geo = new THREE.ConeGeometry(0.22, 0.42, 9); break;
      case 'cap': geo = new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); break;
      default: geo = new THREE.OctahedronGeometry(0.22, 1);
    }
    const core = new THREE.Mesh(geo, shell);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.025, 5, 24), glow);
    orbit.rotation.x = Math.PI / 2;
    this.group.add(core, orbit);
    if (this.active.shape === 'moth') {
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8), glow.clone());
        wing.scale.set(1.3, 0.6, 1); wing.position.x = side * 0.22; wing.rotation.y = side * 0.45; this.group.add(wing);
      }
    } else if (this.active.shape === 'moon') {
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), glow.clone());
      moon.position.x = 0.46; orbit.add(moon);
    }
    this.group.visible = ['familiar', 'aura', 'chain'].includes(this.active.effect);
  }

  onKill(enemy) {
    if (!this.active || !['death', 'chain'].includes(this.active.effect)) return;
    const kind = this.active.id === 'velvet-crown' ? 'soul' : 'spark';
    G.particles?.burst(kind, enemy.x, enemy.y + 0.8, enemy.z, this.active.effect === 'chain' ? 7 : 15, { color: this.active.color, sizeMult: 1.25 });
  }

  onPrecision(point) {
    if (this.active?.effect !== 'precision') return;
    G.particles?.burst('spark', point.x, point.y, point.z, 12, { color: this.active.color, sizeMult: 1.5 });
    G.rovers?.pulse(point.x, point.y, point.z, this.active.color, 2, 7, 6);
  }

  onLand(pos) {
    if (this.active?.effect !== 'landing') return;
    G.particles?.burst('soul', pos.x, pos.y + 0.15, pos.z, 14, { color: this.active.color, sizeMult: 1.2 });
  }

  onSoul(pos) {
    if (this.active?.effect !== 'soul') return;
    G.particles?.burst('spark', pos.x, pos.y, pos.z, 8, { color: this.active.color, sizeMult: 0.85 });
  }

  update(dt) {
    this.t += dt;
    this.emitT -= dt;
    this.soundT -= dt;
    if (!this.active || !G.player) return;
    if (this.group.parent !== G.scene) { this.group.removeFromParent(); G.scene?.add(this.group); }
    const pl = G.player;
    const effect = this.active.effect;
    if (this.group.visible) {
      const a = this.t * (effect === 'chain' ? 2.2 : 0.8);
      const r = effect === 'aura' ? 0 : 1.25;
      this.group.position.set(pl.pos.x + Math.cos(a) * r, pl.pos.y + (effect === 'aura' ? 0.08 : 1.6 + Math.sin(a * 1.7) * 0.22), pl.pos.z + Math.sin(a) * r);
      this.group.rotation.y += dt * 1.1;
      this.group.scale.setScalar(effect === 'aura' ? 1.7 : 1);
    }
    if (effect === 'trail' && pl.speedXZ > 2.4 && this.emitT <= 0) {
      this.emitT = pl.dashT > 0 ? 0.035 : 0.12;
      G.particles?.burst(this.active.id === 'snowprint' ? 'heal' : 'dash', pl.pos.x, pl.pos.y + 0.08, pl.pos.z, pl.dashT > 0 ? 3 : 1, { color: this.active.color, sizeMult: 0.8 });
    }
    if (effect === 'aura' && this.emitT <= 0) {
      this.emitT = 0.34;
      G.particles?.burst('soul', pl.pos.x, pl.pos.y + 0.15, pl.pos.z, 2, { color: this.active.color, sizeMult: 0.7 });
    }
    if (effect === 'sound' && pl.speedXZ > 5.4 && this.soundT <= 0) {
      this.soundT = 5.5;
      sfx('chime', { pitch: 1.45 + Math.sin(this.t) * 0.08, gain: 0.12 });
    }
  }
}
