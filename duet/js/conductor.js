// DUET — the conductor. One scalar (CLOSENESS) runs the game; UNISON is its overflow.
// Rises ONLY while grazing, decays fastest near the top (max is a held note, never a plateau).
// It drives fire, warmth, score, music, camera — but NEVER the lethal layer (that carve-out lives in render/audio).
window.Conductor = (() => {
  let closeness = 0, unison = 0;
  let tier = 0;                       // 0..4, crosses at 0.3/0.5/0.7/0.9 (a music layer opens)
  const TIERS = [0.3, 0.5, 0.7, 0.9];
  let justCrossed = -1;              // tier index crossed this frame, or -1 (for tier-up sfx)
  let enteredUnison = false;         // one-shot this frame
  let hasEnteredUnison = false;      // latch: only arm enteredUnison the first time per life (no re-fire when unison dips/rebuilds)

  function reset() { closeness = 0; unison = 0; tier = 0; justCrossed = -1; enteredUnison = false; hasEnteredUnison = false; }

  // grazing: bool. n: bullets currently in band. focus: bool. mvt: 0..4. decayScale: 1 normally, 0.5 in the Cadence rest.
  function update(grazing, n, focus, mvt, dt, decayScale) {
    justCrossed = -1; enteredUnison = false;
    if (grazing) {
      let gain = Math.min(CFG.CLOSE_GAIN_PER_BULLET * n, CFG.CLOSE_GAIN_CAP);
      if (focus) gain *= CFG.FOCUS_GRAZE_MULT;
      gain *= (CFG.GRAZE_GAIN_MULT_BY_MVT[mvt] || 1);
      closeness += gain * dt;
    } else {
      const decay = (CFG.CLOSE_DECAY_BASE + CFG.CLOSE_DECAY_K * closeness * closeness) * (decayScale == null ? 1 : decayScale);
      closeness -= decay * dt;
    }
    closeness = U.clamp(closeness, 0, 1);

    // tier crossing (rising only)
    let t = 0; for (let i = 0; i < TIERS.length; i++) if (closeness >= TIERS[i]) t = i + 1;
    if (t > tier) justCrossed = t - 1;
    tier = t;

    // UNISON overflow
    if (closeness >= CFG.UNISON_ENTER) unison += (1 / CFG.UNISON_FILL_TIME) * dt;
    else unison -= CFG.UNISON_DECAY * dt;
    unison = U.clamp(unison, 0, 1);
    if (!hasEnteredUnison && unison > 0) { hasEnteredUnison = true; enteredUnison = true; }
  }

  function onHit() { closeness = 0; unison = 0; tier = 0; hasEnteredUnison = false; }   // snap the duet; re-arm the unison one-shot

  // ---- outputs (all downstream of the one scalar) ----
  const warmth = () => closeness;                                              // 0 cold -> 1 warm dawn
  const fireIntervalMs = () => U.lerp(CFG.FIRE_INTERVAL_LOW, CFG.FIRE_INTERVAL_HIGH, closeness);
  const spreadIndex = () => (closeness >= 0.85 ? 2 : closeness >= 0.45 ? 1 : 0);
  const fanCount = () => CFG.FIRE_SPREAD_STEPS[spreadIndex()];
  const mult = () => {
    const base = 1 + closeness * CFG.SCORE_MULT_SLOPE;                          // 1..8
    return unison > 0 ? U.lerp(CFG.SCORE_MULT_SLOPE + 1, CFG.SCORE_MULT_UNISON_CAP, unison) : base;
  };
  const cameraZoom = () => U.lerp(1.0, CFG.CAMERA_ZOOM_MAX, Math.max(closeness * 0.4, unison));

  return {
    reset, update, onHit,
    warmth, fireIntervalMs, spreadIndex, fanCount, mult, cameraZoom,
    get closeness(){ return closeness; }, set closeness(v){ closeness = U.clamp(v, 0, 1); },
    get unison(){ return unison; }, set unison(v){ unison = U.clamp(v, 0, 1); },
    get tier(){ return tier; },
    get justCrossedTier(){ return justCrossed; },
    get enteredUnison(){ return enteredUnison; },
  };
})();
