import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const failures = [];

function source(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function expectSource(text, needle, message) {
  expect(text.includes(needle), message);
}

function numberFrom(text, pattern, label) {
  const match = text.match(pattern);
  if (!match) {
    failures.push(`Could not read ${label} from source.`);
    return Number.NaN;
  }
  return Number(match[1]);
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) files.push(...walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const motes = source('skyshard/src/fx/motes.js');
const projectiles = source('skyshard/src/combat/projectiles.js');
const html = source('skyshard/index.html');
const hud = source('skyshard/src/ui/hud.js');
const relics = source('skyshard/src/progression/relics.js');
const weapon = source('skyshard/src/player/weapon.js');
const player = source('skyshard/src/player/controller.js');
const main = source('skyshard/src/main.js');
const saveSource = source('skyshard/src/core/save.js');
const interiors = source('skyshard/src/interiors/builder.js');
const trials = source('skyshard/src/interiors/trials.js');
const trialData = source('skyshard/src/world/trialdata.js');
const destinationStatus = source('skyshard/src/world/destinationstatus.js');
const destinations = source('skyshard/src/world/destinations.js');
const monuments = source('skyshard/src/world/monuments.js');
const worldBosses = source('skyshard/src/world/worldbosses.js');

// Reward motes and hostile fire must not share a silhouette. The collectible
// core is deliberately 2-3x the bolt radius, and its orbit/tails add non-ball
// shape and non-ballistic motion without growing the object pool at runtime.
const boltRadius = numberFrom(projectiles, /SphereGeometry\(\s*([\d.]+)/, 'hostile bolt radius');
const declaredBoltRadius = numberFrom(motes, /hostileBoltRadius:\s*([\d.]+)/, 'declared hostile bolt radius');
const soulCoreSize = numberFrom(
  motes,
  /soul:\s*Object\.freeze\(\{[\s\S]*?coreSize:\s*([\d.]+)/,
  'Aster core size',
);
const healthCoreSize = numberFrom(
  motes,
  /health:\s*Object\.freeze\(\{[\s\S]*?coreSize:\s*([\d.]+)/,
  'health core size',
);
const soulToBoltRatio = soulCoreSize / boltRadius;

expect(Number.isFinite(boltRadius) && boltRadius > 0, 'Hostile bolt radius must be a positive source constant.');
expect(declaredBoltRadius === boltRadius, 'Mote visual contract must track the actual hostile bolt radius.');
expect(soulToBoltRatio >= 2 && soulToBoltRatio <= 3,
  `Aster core must remain 2-3x the hostile bolt radius (found ${soulToBoltRatio.toFixed(2)}x).`);
expect(healthCoreSize < soulCoreSize, 'Health pickups must remain smaller than Aster pickups.');
expectSource(motes, "silhouette: 'faceted-star-diamond-constellation-seed'",
  'Aster contract must name its non-spherical constellation-seed silhouette.');
expectSource(motes, "motion: 'corkscrew-homing'",
  'Aster contract must preserve its non-ballistic corkscrew homing motion.');
expectSource(motes, 'brokenOrbit: true', 'Aster contract must preserve a broken orbit glyph.');
expectSource(motes, 'braidedTailCount: 2', 'Aster contract must preserve two braided tail strands.');
expectSource(motes, 'facetPaletteSize: 8', 'Aster core must preserve eight authored face colors.');
expectSource(motes, 'bloomSafe: true', 'Aster contract must preserve its bloom-safe visual treatment.');
expectSource(motes, 'new THREE.OctahedronGeometry(1, 0)', 'Aster core must remain explicitly faceted.');
expectSource(motes, 'paintAsterFacets(', 'Aster geometry must receive per-face constellation colors.');
expectSource(motes, 'vertexColors: true', 'Aster material must render its authored face colors.');
expect(!motes.includes('THREE.AdditiveBlending'),
  'Aster pieces must not additively composite into a featureless white bloom.');
expectSource(motes, 'new THREE.TorusGeometry(1, 0.085, 4, 18, Math.PI * 1.58)',
  'Aster orbit must remain an incomplete low-poly torus.');
expectSource(motes, 'N * TAIL_SEGMENTS', 'Braided tails must remain fixed-capacity instanced geometry.');
expectSource(motes, 'new Pool(', 'Motes must remain backed by the shared fixed-size pool.');
expectSource(motes, 'this.pool.releaseAll();', 'Scene moves must release active motes.');
expectSource(motes, 'scene.add(this.group);', 'Scene moves must transfer the complete mote group.');
expect(
  /discardUnclaimed\(\)\s*\{[\s\S]*?this\._hideMote\(mote\.i\);[\s\S]*?this\.pool\.releaseAll\(\);[\s\S]*?this\.streak\s*=\s*0;[\s\S]*?this\.lastCollect\s*=\s*-9;[\s\S]*?this\._markMatricesDirty\(\);[\s\S]*?\n\s*\}\n\n\s*spawn\(/.test(motes),
  'Mote death cleanup must release/hide unclaimed pickups and reset its streak state.',
);
expectSource(motes, 'describe() {', 'Motes must expose a debug-readable visual/count contract.');
expectSource(motes, 'new THREE.IcosahedronGeometry(1, 1)',
  'Health pickups must preserve a separate icosahedral mesh.');
expectSource(motes, "silhouette: 'green-icosahedron'",
  'Health pickup contract must remain distinct from the Aster language.');

// Source-level contracts for the progression/UI work currently in this branch.
expectSource(html, 'id="challenge-progress"', 'Optional challenges need a bottom progress surface.');
expectSource(html, 'id="reward-toast"', 'Earned rewards need a dedicated announcement surface.');
expectSource(html, 'id="skin-list"', 'The Tab menu needs a Sparkcaster skin selector.');
expectSource(hud, 'challengeStart(', 'HUD must expose challenge progress start.');
expectSource(hud, 'challengeUpdate(', 'HUD must expose challenge progress updates.');
expectSource(hud, 'challengeComplete(', 'HUD must expose explicit challenge completion.');
expectSource(hud, 'reward({', 'HUD must expose a queued earned-reward ceremony.');
expectSource(relics, 'equipSkin(id)', 'The Tab menu skin selector must be interactive.');
expectSource(relics, 'G.weapon?.applySkin(id);', 'Selecting a skin must apply it to the weapon.');
expectSource(weapon, "hasSkill('trophy-light')", 'Late weapon capstone must affect primary fire.');
expectSource(weapon, 'const shotDamage = comet ? 3 : W.damage;',
  'Trophy Round must produce a three-damage heavy shot.');
expectSource(player, "hasSkill('quiet-camp') ? 1 : 0",
  'Deep Vessel must grant one derived health pip.');

// Completion truth and architecture contracts. Guardian defeat is not
// completion until the actual verb is owned; interior enemies follow the
// active scene; ornamental route graphics never become ankle-high colliders.
expectSource(destinationStatus, "state: complete ? 'complete' : cleared ? 'reward-pending' : 'active'",
  'Guardian/trial status must represent a pending reward separately from completion.');
expectSource(destinationStatus, "saveState?.found?.[`shard-${dest.id}`]",
  'Minor completion must be based on the claimed shard rather than entry.');
expectSource(interiors, 'if (isMajorRewardPending(G.save, dest)) this._spawnRewardPedestal(this.active);',
  'A defeated guardian must reconstruct its unclaimed reward on re-entry.');
expectSource(interiors, 'G.enemies.setScene(scene);',
  'Interior entry must move enemy rendering into the active scene.');
expectSource(interiors, 'G.enemies.setScene(G.worldScene);',
  'Interior exit must restore enemy rendering to the world scene.');
expectSource(trials, 'function inlay(', 'Expedition routes must use a dedicated flush visual inlay primitive.');
const inlayBody = trials.match(/function inlay\([\s\S]*?\n\}/)?.[0] || '';
expect(inlayBody.length > 0 && !inlayBody.includes('collide.addBox'),
  'Expedition inlays must never register a blocking collider.');
expectSource(trials, 'const gate = new THREE.Group();',
  'Expedition battle seals must be thick architecture rather than additive planes.');
expectSource(monuments, 'mill: 72', 'The Hollow Mill must have a horizon-scale monument height contract.');
expectSource(monuments, 'tower: 98', 'The Inverted Tower must have a horizon-scale monument height contract.');
expectSource(destinations, 'if (d.kind !== \'major\') addCullable(g, d.x, d.z);',
  'Giant guardian silhouettes must not disappear at the ordinary 330m detail cull wall.');
expectSource(destinations, 'if (site.monument && next.complete && !site.progress?.complete)',
  'Monument collapse must begin only on canonical completion transition.');
expectSource(destinations, 'if (G.worldBosses?.isSealed?.(door.dest))',
  'A living forecourt boss must seal its expedition door.');

// Five high-level exterior bosses own a separate save namespace and must not
// counterfeit canonical guardian or expedition completion.
expectSource(saveSource, 'worldBossesDown: {}', 'Forecourt clears need a normalized persistent save map.');
expectSource(saveSource, "'worldBossesDown'", 'Old saves must normalize the forecourt-clear map.');
expect((trialData.match(/apex:\s*true/g) || []).length === 5,
  'Exactly five optional expeditions must be marked as apex sites.');
expect(Object.keys({ mossglass: 1, ashenamphitheater: 1, glacierossuary: 1, capcathedral: 1, suspendedtribunal: 1 })
  .every((id) => worldBosses.includes(`${id}: Object.freeze({`)),
  'Every biome apex site must have an authored forecourt boss definition.');
expectSource(worldBosses, 'G.save.worldBossesDown[this.site.id] = true;',
  'Forecourt victory must write only its dedicated clear map.');
expect(!worldBosses.includes('G.save.bossesDown[') && !worldBosses.includes('G.save.trialsDown['),
  'Forecourt bosses must never write canonical guardian or expedition maps.');
expectSource(worldBosses, 'G.constellation?.collect(this.def.reward);',
  'Forecourt victory must pay its named Aster reward directly and clearly.');
expectSource(main, 'G.worldBosses = new WorldBosses(worldScene);',
  'The world-boss manager must boot with the game.');
expectSource(main, 'G.worldBosses?.onPlayerDeath?.();',
  'Player death must reset an active forecourt encounter.');
expectSource(main, 'G.worldBosses?.update(rawDt, t);',
  'Forecourt bosses must update during world play.');

// Parse every gameplay module with Node. This catches accidental syntax damage
// without importing WebGL/browser-only modules or requiring a server/port.
const syntaxFiles = walk(path.join(repoRoot, 'skyshard', 'src'))
  .filter((file) => file.endsWith('.js'))
  .sort();
for (const file of syntaxFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    const relative = path.relative(repoRoot, file).replaceAll('\\', '/');
    const detail = String(error.stderr || error.message || error).trim().split(/\r?\n/).at(-1);
    failures.push(`${relative} failed node --check: ${detail}`);
  }
}

if (failures.length) {
  throw new Error(`SKYSHARD progression contract failed:\n- ${failures.join('\n- ')}`);
}

console.log(
  `SKYSHARD progression contract passed: Aster core ${soulToBoltRatio.toFixed(2)}x hostile bolt radius, ` +
  `faceted seed + broken orbit + 2 braided tails, distinct health mesh, ${syntaxFiles.length} modules parsed.`,
);
