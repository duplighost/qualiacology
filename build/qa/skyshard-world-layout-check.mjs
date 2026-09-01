import { DESTS } from '../../skyshard/src/world/destdata.js';
import { dominantRegion, regionWeights } from '../../skyshard/src/world/regions.js';
import { R6_THRESHOLDS, WONDERS } from '../../skyshard/src/world/wonderdata.js';

const MIN_EDGE_CLEARANCE = 20;

const sites = [
  ...WONDERS.map((site) => ({ ...site, source: 'wonder', footprint: site.radius })),
  ...R6_THRESHOLDS.map((site) => ({ ...site, source: 'threshold', footprint: site.radius })),
  ...DESTS.map((site) => ({ ...site, source: site.kind, footprint: site.r })),
];

const ids = new Set();
for (const site of sites) {
  if (ids.has(site.id)) throw new Error(`Duplicate SKYSHARD site id: ${site.id}`);
  ids.add(site.id);
}

const regionFailures = [];
for (const site of sites) {
  const dominant = dominantRegion(site.x, site.z);
  const weights = { ...regionWeights(site.x, site.z) };
  if (dominant !== site.region) {
    regionFailures.push(
      `${site.id} declares ${site.region}, but ${dominant} dominates at (${site.x}, ${site.z}) ` +
      `(declared weight ${(weights[site.region] || 0).toFixed(3)})`,
    );
  }
}

const spacingFailures = [];
let minimumEdge = Infinity;
let minimumPair = '';
for (let i = 0; i < sites.length; i++) {
  const a = sites[i];
  for (let j = i + 1; j < sites.length; j++) {
    const b = sites[j];
    const centerDistance = Math.hypot(a.x - b.x, a.z - b.z);
    const edgeDistance = centerDistance - a.footprint - b.footprint;
    if (edgeDistance < minimumEdge) {
      minimumEdge = edgeDistance;
      minimumPair = `${a.id} / ${b.id}`;
    }
    if (edgeDistance < MIN_EDGE_CLEARANCE) {
      spacingFailures.push(
        `${a.id} (${a.source}) and ${b.id} (${b.source}) leave only ` +
        `${edgeDistance.toFixed(1)}m between authored footprints`,
      );
    }
  }
}

const failures = [...regionFailures, ...spacingFailures];
if (failures.length) {
  throw new Error(`SKYSHARD world-layout contract failed:\n- ${failures.join('\n- ')}`);
}

console.log(
  `SKYSHARD world-layout contract passed: ${sites.length} sites, ` +
  `all in their declared biome, minimum edge clearance ${minimumEdge.toFixed(1)}m (${minimumPair}).`,
);
