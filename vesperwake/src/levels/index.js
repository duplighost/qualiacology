/* levels/index.js — the three chapters, in order. */

import { buildOrchard } from './orchard.js';
import { buildReliquary } from './reliquary.js';
import { buildBelfry } from './belfry.js';

export const LEVELS = [
  { id: 'orchard', build: buildOrchard },
  { id: 'reliquary', build: buildReliquary },
  { id: 'belfry', build: buildBelfry },
];
