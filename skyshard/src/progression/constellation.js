// Enemy soul motes become Aster and fund a small optional constellation.
// Every node is a sidegrade, readability aid, or recovery affordance; none
// grants damage, health capacity, a guardian verb, or a weapon evolution.

import { G } from '../state.js';
import { save } from '../core/save.js';
import { sfx } from '../core/audio.js';
import { TRIAL_DESTS, isTrialCleared, isTrialComplete } from '../world/trialdata.js';
import { DESTS, SPIRE } from '../world/destdata.js';

export const SKILL_BRANCHES = [
  {
    id: 'hunter', name: 'HUNTER', color: '#ffc98c',
    nodes: [
      { id: 'core-sight', name: 'CORE SIGHT', cost: 8, description: 'Wounded enemies reveal their core nearby.' },
      { id: 'resonant-hit', name: 'RESONANT HIT', cost: 14, requires: 'core-sight', description: 'Precision hits ring harder and brighter.' },
      { id: 'chain-memory', name: 'CHAIN MEMORY', cost: 22, requires: 'resonant-hit', description: 'The kill-chain breath lasts 0.35s longer.' },
      { id: 'trophy-light', name: 'TROPHY LIGHT', cost: 34, requires: 'chain-memory', description: 'Named victories kindle the Spire reliquary.' },
    ],
  },
  {
    id: 'vessel', name: 'VESSEL', color: '#8de9ff',
    nodes: [
      { id: 'soul-draw', name: 'SOUL DRAW', cost: 8, description: 'Aster notices you from farther away.' },
      { id: 'kind-vessel', name: 'KIND VESSEL', cost: 14, requires: 'soul-draw', description: 'Health motes travel faster; drops stay unchanged.' },
      { id: 'last-lantern', name: 'LAST LANTERN', cost: 22, requires: 'kind-vessel', description: 'Once per visit, a full soul streak catches a fatal blow.' },
      { id: 'quiet-camp', name: 'QUIET CAMP', cost: 34, requires: 'last-lantern', description: 'Cleared sanctums mend you slowly out of combat.' },
    ],
  },
  {
    id: 'wayfinder', name: 'WAYFINDER', color: '#bda2ff',
    nodes: [
      { id: 'far-bell', name: 'FAR BELL', cost: 8, description: 'A nearby undiscovered place answers softly.' },
      { id: 'current-sight', name: 'CURRENT SIGHT', cost: 14, requires: 'far-bell', description: 'Currents and ascension winds burn clearer.' },
      { id: 'ruin-memory', name: 'RUIN MEMORY', cost: 22, requires: 'current-sight', description: 'Cleared expeditions retain a relic silhouette.' },
      { id: 'star-compass', name: 'STAR COMPASS', cost: 34, requires: 'ruin-memory', description: 'The Spire points toward unfinished ruins.' },
    ],
  },
];

export const SKILLS = Object.fromEntries(SKILL_BRANCHES.flatMap((b) => b.nodes.map((n) => [n.id, { ...n, branch: b.id }])));

export function hasSkill(id) { return !!G.save?.skills?.[id]; }

export class Constellation {
  constructor() {
    this.overlay = document.getElementById('constellation');
    this.panel = document.getElementById('constellation-panel');
    this.branchesEl = document.getElementById('constellation-branches');
    this.currencyEls = [...document.querySelectorAll('[data-aster-value]')];
    this.hudButton = document.getElementById('aster-button');
    this.touchButton = document.getElementById('t-skill');
    this.closeButton = document.getElementById('constellation-close');
    this.opened = false;
    this.firstCollectShown = (G.save.aster || 0) > 0;
    this.campT = 0;
    this.bellT = 8;
    this.compassT = 5;
    this._build();
    this.sync();

    this.hudButton?.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
    this.touchButton?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggle(); });
    this.closeButton?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
    addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        if (!this.opened && G.mode !== 'title') {
          e.preventDefault();
          this.open();
        } else if (this.opened) {
          const controls = [...(this.panel?.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) || [])].filter((el) => !el.hidden && el.getClientRects().length > 0);
          if (!controls.length) {
            e.preventDefault();
            this.panel?.focus();
          } else {
            const active = document.activeElement;
            const current = controls.indexOf(active);
            const next = current < 0
              ? (e.shiftKey ? controls.length - 1 : 0)
              : (current + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
            e.preventDefault();
            controls[next].focus();
          }
        }
      } else if (e.code === 'Escape' && this.opened) {
        e.preventDefault();
        this.close();
      }
    }, { capture: true });
  }

  _build() {
    if (!this.branchesEl) return;
    this.branchesEl.innerHTML = '';
    for (const branch of SKILL_BRANCHES) {
      const col = document.createElement('section');
      col.className = 'constellation-branch';
      col.style.setProperty('--branch', branch.color);
      const title = document.createElement('h3');
      title.textContent = branch.name;
      col.appendChild(title);
      const rail = document.createElement('div');
      rail.className = 'node-rail';
      for (const node of branch.nodes) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'skill-node';
        button.dataset.skill = node.id;
        button.innerHTML = `<span class="node-star" aria-hidden="true"></span><span class="node-copy"><b>${node.name}</b><small>${node.description}</small></span><span class="node-cost">${node.cost}</span>`;
        button.addEventListener('click', () => this.buy(node.id));
        rail.appendChild(button);
      }
      col.appendChild(rail);
      this.branchesEl.appendChild(col);
    }
  }

  toggle(force) {
    const next = typeof force === 'boolean' ? force : !this.opened;
    if (next) this.open(); else this.close();
  }

  open() {
    if (this.opened || G.mode === 'title' || !this.overlay) return;
    this.opened = true;
    G.uiOpen = true;
    this.sync();
    this.overlay.classList.add('show');
    this.overlay.removeAttribute('aria-hidden');
    this.hudButton?.setAttribute('aria-expanded', 'true');
    document.exitPointerLock?.();
    setTimeout(() => this.panel?.focus(), 30);
  }

  close() {
    if (!this.opened) return;
    this.opened = false;
    G.uiOpen = false;
    this.overlay.classList.remove('show');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.hudButton?.setAttribute('aria-expanded', 'false');
    // Coarse-pointer devices do not need or support Pointer Lock.
    if (matchMedia('(any-pointer: fine)').matches && G.mode !== 'title') setTimeout(() => G.input?.requestLock(), 40);
  }

  collect(amount = 1) {
    amount = Math.max(1, Math.floor(amount));
    G.save.aster = (G.save.aster || 0) + amount;
    save();
    this.sync();
    this.hudButton?.classList.remove('gain');
    void this.hudButton?.offsetWidth;
    this.hudButton?.classList.add('gain');
    if (!this.firstCollectShown) {
      this.firstCollectShown = true;
      G.hud?.whisper('ASTER REMEMBERS · TAB', 3.2);
    }
  }

  buy(id) {
    const node = SKILLS[id];
    if (!node || hasSkill(id)) return false;
    if (node.requires && !hasSkill(node.requires)) {
      sfx('enemyshoot', { pitch: 0.45, gain: 0.25 });
      const need = SKILLS[node.requires]?.name || 'THE PRIOR STAR';
      this._status(`AWAKEN ${need} FIRST`);
      return false;
    }
    if ((G.save.aster || 0) < node.cost) {
      sfx('enemyshoot', { pitch: 0.55, gain: 0.2 });
      this._status(`${node.cost - (G.save.aster || 0)} ASTER SHORT`);
      return false;
    }
    G.save.aster -= node.cost;
    G.save.skills[id] = true;
    save();
    sfx('unlock');
    G.postfx?.pulse(0.75);
    this._status(`${node.name} AWAKENS`);
    this.sync();
    G.onSkillBought?.(id);
    return true;
  }

  _status(text) {
    const el = document.getElementById('constellation-status');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('speak');
    void el.offsetWidth;
    el.classList.add('speak');
  }

  sync() {
    for (const el of this.currencyEls) el.textContent = String(G.save.aster || 0);
    if (this.hudButton) {
      this.hudButton.classList.toggle('available', Object.values(SKILLS).some((n) => !hasSkill(n.id) && (!n.requires || hasSkill(n.requires)) && (G.save.aster || 0) >= n.cost));
      this.hudButton.toggleAttribute('hidden', !this.firstCollectShown && !(G.save.aster > 0));
    }
    this.touchButton?.toggleAttribute('hidden', !this.firstCollectShown && !(G.save.aster > 0));
    for (const button of this.branchesEl?.querySelectorAll('.skill-node') || []) {
      const node = SKILLS[button.dataset.skill];
      const owned = hasSkill(node.id);
      const linked = !node.requires || hasSkill(node.requires);
      const affordable = (G.save.aster || 0) >= node.cost;
      button.classList.toggle('owned', owned);
      button.classList.toggle('linked', linked);
      button.classList.toggle('affordable', !owned && linked && affordable);
      button.disabled = owned;
      button.setAttribute('aria-label', `${node.name}. ${node.description}. ${owned ? 'Owned' : `${node.cost} Aster`}`);
    }
  }

  update(dt) {
    if (!G.player || G.mode !== 'world') return;
    const pl = G.player;
    this.campT -= dt;
    this.bellT -= dt;
    this.compassT -= dt;

    if (hasSkill('quiet-camp') && this.campT <= 0 && pl.pips < pl.maxPips && G.intensity < 0.08) {
      const nearCleared = TRIAL_DESTS.some((d) => isTrialCleared(G.save, d) && Math.hypot(pl.pos.x - d.x, pl.pos.z - d.z) < 18);
      if (nearCleared) {
        this.campT = 4.8;
        pl.heal(1);
        G.particles?.burst('heal', pl.pos.x, pl.pos.y + 0.4, pl.pos.z, 8);
      }
    }

    if (hasSkill('far-bell') && this.bellT <= 0) {
      this.bellT = 18;
      let nearest = null, nd = 150;
      for (const d of DESTS) {
        if (G.save.found[d.id]) continue;
        const dist = Math.hypot(pl.pos.x - d.x, pl.pos.z - d.z);
        if (dist < nd) { nd = dist; nearest = d; }
      }
      if (nearest) {
        const pitch = 0.8 + Math.max(0, 1 - nd / 150) * 0.7;
        sfx('chime', { pitch, gain: 0.26 });
        G.particles?.burst('spark', pl.pos.x + (nearest.x - pl.pos.x) / nd * 4, pl.pos.y + 2.2,
          pl.pos.z + (nearest.z - pl.pos.z) / nd * 4, 3, { color: [0.72, 0.62, 1] });
      }
    }

    if (hasSkill('star-compass') && this.compassT <= 0 && Math.hypot(pl.pos.x - SPIRE.x, pl.pos.z - SPIRE.z) < 48) {
      this.compassT = 12;
      let nearest = null, nd = Infinity;
      for (const d of TRIAL_DESTS) {
        if (isTrialComplete(G.save, d)) continue;
        const dist = Math.hypot(pl.pos.x - d.x, pl.pos.z - d.z);
        if (dist < nd) { nd = dist; nearest = d; }
      }
      if (nearest) G.onCompassPoint?.(nearest);
    }
  }
}
