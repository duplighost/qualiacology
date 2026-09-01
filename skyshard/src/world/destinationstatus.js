// Canonical destination progress. Boss defeat and reward ownership are separate
// states: a guardian can be down while its movement verb is still waiting on
// the plinth. Exteriors, beacons, reload reconstruction, and monument collapse
// all consume this one contract so the world never lies about completion.

import { isTrialCleared, isTrialComplete } from './trialdata.js';
import { ownsGuardianReward } from '../player/abilities.js';

export function isMajorRewardOwned(saveState, dest) {
  return !!(dest?.kind === 'major' && ownsGuardianReward(saveState, dest.reward));
}

export function isMajorCleared(saveState, dest) {
  return !!(dest?.kind === 'major' && saveState?.bossesDown?.[dest.boss]);
}

export function isMajorRewardPending(saveState, dest) {
  return isMajorCleared(saveState, dest) && !isMajorRewardOwned(saveState, dest);
}

export function isMinorComplete(saveState, dest) {
  return !!(dest?.kind === 'minor' && saveState?.found?.[`shard-${dest.id}`]);
}

export function destinationStatus(saveState, dest) {
  if (!dest) return { state: 'unseen', cleared: false, complete: false, pendingReward: false };

  if (dest.kind === 'major') {
    const cleared = isMajorCleared(saveState, dest);
    const complete = isMajorRewardOwned(saveState, dest);
    return {
      state: complete ? 'complete' : cleared ? 'reward-pending' : 'active',
      cleared,
      complete,
      pendingReward: cleared && !complete,
    };
  }

  if (dest.kind === 'trial') {
    const cleared = isTrialCleared(saveState, dest);
    const complete = isTrialComplete(saveState, dest);
    return {
      state: complete ? 'complete' : cleared ? 'reward-pending' : 'active',
      cleared,
      complete,
      pendingReward: cleared && !complete,
    };
  }

  if (dest.kind === 'minor') {
    const complete = isMinorComplete(saveState, dest);
    return { state: complete ? 'complete' : 'active', cleared: complete, complete, pendingReward: false };
  }

  return { state: 'active', cleared: false, complete: false, pendingReward: false };
}

export function isDestinationComplete(saveState, dest) {
  return destinationStatus(saveState, dest).complete;
}
