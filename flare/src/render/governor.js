// THE QUALITY GOVERNOR — and the four knobs it is allowed to touch.
//
// C2-F6: "The quality governor and the LOW/ULTRA light-count tiers trigger the
// exact recompile stall the rover pool exists to prevent, and autotest runs at a
// shader set no player will ever see."
//
// Moot for lights and shadows by construction — the shipping page contains zero
// THREE.Light objects, so NUM_POINT_LIGHTS is 0 for the process lifetime and no
// tier can change it. What remains is a rule, and the rule is enforced here
// rather than remembered: this governor may change renderScale, bloom chain
// resolution, fog distance and particle budgets. NOTHING ELSE, EVER, because
// everything else is a relink. set() throws on an unknown knob, which turns
// "someone added a shadow tier" from a six-second mid-fight freeze into a stack
// trace on the line that did it.
//
// It also measures honestly. docs/RENDER.md: gl.finish() is not a GPU metric on
// ANGLE/D3D11 and every millisecond figure in the sibling repo from before that
// was discovered is fiction. This samples the rAF-paced render dt the game loop
// already produces and reports a p95 — contention can move it, but it cannot
// invent the monotonic degradation a finish() loop produces.

import FEEL from '../feel.js';

export const GOVERNOR_TABLE = Object.freeze({
  knobs: Object.freeze(['renderScale', 'bloomScale', 'fogScale', 'particleScale']),
  tiers: Object.freeze([
    Object.freeze({ name: 'high', renderScale: 1, bloomScale: 1, fogScale: 1, particleScale: 1 }),
    Object.freeze({ name: 'mid', renderScale: 0.85, bloomScale: 0.85, fogScale: 1.12, particleScale: 0.7 }),
    Object.freeze({ name: 'low', renderScale: 0.7, bloomScale: 0.7, fogScale: 1.25, particleScale: 0.5 }),
  ]),
  window: 120,          // frames in the rolling sample
  settle: 90,           // frames ignored after a change, so a resize is not a verdict
  climbFraction: 0.72,  // must be this good to climb back a tier
  cooldown: 2.5,        // seconds between tier changes
});

const G = GOVERNOR_TABLE;

export function makeGovernor(ctx) {
  const samples = new Float32Array(G.window);
  const scratch = new Float32Array(G.window);
  let head = 0, filled = 0, settle = G.settle;
  let tier = 0;
  let cooldown = 0;
  let lastP95 = 0;
  let changes = 0;
  let enabled = true;

  const state = {
    renderScale: G.tiers[0].renderScale,
    bloomScale: G.tiers[0].bloomScale,
    fogScale: G.tiers[0].fogScale,
    particleScale: G.tiers[0].particleScale,
  };

  const budgetMs = FEEL.render.budget.p95ms;
  const listeners = [];

  /** The only way a knob moves. An unknown key is a hard error, not a no-op. */
  function set(key, value) {
    if (!G.knobs.includes(key)) {
      throw new Error(`governor: "${key}" is not a legal quality knob. Legal knobs are ${G.knobs.join(', ')}. Anything else is a shader relink (docs/RENDER.md).`);
    }
    if (state[key] === value) return false;
    state[key] = value;
    return true;
  }

  function applyTier(next) {
    const t = G.tiers[next];
    let changed = false;
    for (const k of G.knobs) changed = set(k, t[k]) || changed;
    tier = next;
    settle = G.settle;
    cooldown = G.cooldown;
    changes++;
    if (changed) for (const fn of listeners) fn({ ...state, tier, name: t.name });
    return changed;
  }

  function p95() {
    if (filled === 0) return 0;
    scratch.set(samples.subarray(0, filled));
    const view = scratch.subarray(0, filled);
    view.sort();
    return view[Math.min(filled - 1, Math.floor(filled * 0.95))];
  }

  /** Feed the honest instrument: the same render dt the frame loop measured. */
  function sample(rdtSeconds) {
    samples[head] = rdtSeconds * 1000;
    head = (head + 1) % G.window;
    filled = Math.min(G.window, filled + 1);
  }

  function update(rdt) {
    sample(rdt);
    if (cooldown > 0) cooldown = Math.max(0, cooldown - rdt);
    if (settle > 0) { settle--; return false; }
    if (!enabled || filled < G.window || cooldown > 0) return false;

    lastP95 = p95();
    if (lastP95 > budgetMs && tier < G.tiers.length - 1) return applyTier(tier + 1);
    if (lastP95 < budgetMs * G.climbFraction && tier > 0) return applyTier(tier - 1);
    return false;
  }

  return {
    set,
    update,
    onChange(fn) { listeners.push(fn); },
    forceTier(i) { return applyTier(Math.max(0, Math.min(G.tiers.length - 1, i | 0))); },
    setEnabled(v) { enabled = !!v; },
    get tier() { return tier; },
    get tierName() { return G.tiers[tier].name; },
    get renderScale() { return state.renderScale; },
    get bloomScale() { return state.bloomScale; },
    get fogScale() { return state.fogScale; },
    get particleScale() { return state.particleScale; },
    get p95ms() { return lastP95; },
    /** The gate reads this: a governor with any other knob has broken the rule. */
    knobs() { return G.knobs.slice(); },
    snapshot() {
      return { tier, name: G.tiers[tier].name, ...state, p95ms: lastP95, budgetMs, changes, samples: filled, knobs: G.knobs.slice() };
    },
    reset() { head = 0; filled = 0; settle = G.settle; cooldown = 0; changes = 0; applyTier(0); },
  };
}

export default makeGovernor;
