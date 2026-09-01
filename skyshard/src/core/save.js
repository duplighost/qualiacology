// Progress persistence. Everything the player has earned lives here so a
// refresh never costs progress. Writes are debounced to avoid hammering
// localStorage during rapid pickups.

const KEY = 'skyshard-save-v1';

const DEFAULTS = () => ({
  version: 2,
  abilities: {},        // { dash:true, doubleJump:true, glide:true, grapple:true, slam:true }
  weaponLevel: 0,       // 0..3 visual evolution stage
  altFires: {},         // { lance:true, seeker:true }
  bossesDown: {},       // { mill:true, forge:true, ... }
  found: {},            // destination ids discovered
  shards: 0,            // health core shards (3 => +1 pip)
  maxPips: 4,
  entered: {},          // interiors visited at least once
  skins: {},            // cosmetic gun skins earned at battle shrines
  skin: 'default',      // currently worn
  aster: 0,             // enemy soul motes collected; optional constellation currency
  skills: {},           // purchased constellation node ids
  trialsDown: {},       // optional ruin expedition ids cleared
  worldBossesDown: {},  // optional apex forecourt wardens cleared
  relics: {},           // cosmetic relic ids collected
  activeRelic: null,    // one presentation relic equipped at a time
  finalGateShown: false,
  finalDefeated: false,
  playSeconds: 0,
});

let state = null;
let writeTimer = 0;

export function loadSave() {
  if (state) return state;
  state = DEFAULTS();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Shallow Object.assign loses newly introduced nested defaults when an
        // old save contains an older map. Normalize every expandable map while
        // preserving all known and unknown scalar fields from the old file.
        const base = state;
        state = { ...base, ...parsed };
        for (const key of ['abilities', 'altFires', 'bossesDown', 'found', 'entered', 'skins', 'skills', 'trialsDown', 'worldBossesDown', 'relics']) {
          const incoming = parsed[key];
          state[key] = { ...base[key], ...(incoming && typeof incoming === 'object' ? incoming : {}) };
        }
        state.aster = Math.max(0, Number.isFinite(Number(state.aster)) ? Math.floor(Number(state.aster)) : 0);
        state.version = 2;
        state.finalGateShown = !!state.finalGateShown;
        state.finalDefeated = !!state.finalDefeated;
      }
    }
  } catch (e) { /* corrupted or blocked storage — play with defaults */ }
  return state;
}

export function save() {
  if (!state) return;
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = 0;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }, 250);
}

export function wipeSave() {
  state = DEFAULTS();
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export { KEY as SAVE_KEY, DEFAULTS as makeDefaultSave };
