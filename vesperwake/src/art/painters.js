/* art/painters.js — one painter per area, keyed by level.painter. */

import { orchardPainter } from './orchard.js';
import { reliquaryPainter } from './reliquary.js';
import { belfryPainter } from './belfry.js';

export const PAINTERS = {
  orchard: orchardPainter,
  reliquary: reliquaryPainter,
  belfry: belfryPainter,
};
