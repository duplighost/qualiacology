// Reward ceremonies. A boss falls → the world slows → the Sparkcaster grows
// a new piece → one whisper names the verb and its key — then the game gets
// out of the way and lets you feel it.

import { G } from '../state.js';
import { save } from '../core/save.js';
import { sfx } from '../core/audio.js';
import { juice } from '../fx/juice.js';

// A phone has no SHIFT or Q to name, so each reward carries a thumb wording too.
const TOUCH_PRIMARY = !!(typeof window !== "undefined" && window.matchMedia
  && window.matchMedia("(pointer: coarse)").matches
  && !window.matchMedia("(any-pointer: fine)").matches);

const REWARDS = {
  dash: {
    name: 'DASH', owned: (s) => !!s.abilities.dash,
    apply: (s) => { s.abilities.dash = true; },
    line: 'SHIFT', touchLine: 'THE DASH PAD',
  },
  lance: {
    name: 'LANCE', owned: (s) => !!s.altFires.lance,
    apply: (s) => { s.altFires.lance = true; },
    line: 'HOLD RIGHT CLICK', touchLine: 'HOLD FIRE TO CHARGE',
  },
  wings: {
    name: 'WINGS', owned: (s) => !!s.abilities.doubleJump && !!s.abilities.glide,
    apply: (s) => { s.abilities.doubleJump = true; s.abilities.glide = true; },
    line: 'JUMP TWICE · HOLD TO GLIDE', touchLine: 'TAP JUMP TWICE · HOLD TO GLIDE',
  },
  seeker: {
    name: 'SEEKERS', owned: (s) => !!s.altFires.seeker,
    apply: (s) => { s.altFires.seeker = true; },
    line: 'Q', touchLine: 'THE SEEK PAD',
  },
  grapple: {
    name: 'GRAPPLE · SLAM', owned: (s) => !!s.abilities.grapple && !!s.abilities.slam,
    apply: (s) => { s.abilities.grapple = true; s.abilities.slam = true; },
    line: 'GRAPPLE E · SLAM C IN AIR', touchLine: 'HOOK PAD · SLAM PAD IN AIR',
  },
};

// Guardian boss death and guardian reward ownership are separate states. This
// helper is the save-compatible authority for pending pedestals, completed
// monuments, and collapse timing; bossesDown alone only means "do not respawn."
export function ownsGuardianReward(saveState, key) {
  return !!REWARDS[key]?.owned?.(saveState);
}

export function grantReward(key) {
  const r = REWARDS[key];
  if (!r) return;
  const fresh = !r.owned(G.save);
  r.apply(G.save);
  save();
  juice.slowmo('unlock');
  sfx('unlock');
  G.hud?.syncVerbs(G.save);
  if (fresh) {
    G.hud?.reward({
      kind: 'GUARDIAN POWER AWAKENED',
      name: r.name,
      detail: (TOUCH_PRIMARY && r.touchLine) || r.line,
      duration: 5200,
    });
  } else {
    G.hud?.whisper(`${r.name} · RESTORED`, 2.2);
  }
  G.syncAbilityPads?.();   // the new verb gets its on-screen pad immediately
  G.weapon?.syncEvolution(G.save);
  G.player && (G.player.iFrames = Math.max(G.player.iFrames, 2.5));
}

export function discover(dest) {
  if (G.save.found[dest.id]) return;
  G.save.found[dest.id] = true;
  save();
  sfx('discover');
  G.hud?.whisper(dest.name, 3.6);
}
