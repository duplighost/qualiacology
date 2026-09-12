import { buildHoldfastTown } from './holdfast-town.js';

// The existing keep and curtain surround a continuous, inhabited town. Geometry,
// people, shop interactions and rumour markers use the same local-space plan.
export const DRESS = { holdfast: api => buildHoldfastTown(api) };
export default DRESS;
