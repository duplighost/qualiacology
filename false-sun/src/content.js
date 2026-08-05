// FALSE SUN - authoritative hand-authored campaign content.
// Rectangles are center based. Circles are center based. Polygon points are
// absolute room coordinates. Gameplay code should clone room state before use.

export const ROOM_W = 1600;
export const ROOM_H = 900;

const rect = (id, x, y, w, h, options = {}) => ({
  id,
  shape: 'rect',
  x,
  y,
  w,
  h,
  solid: true,
  castsShadow: true,
  material: 'cream-stone',
  breakable: false,
  hp: 0,
  secretTarget: null,
  interactive: null,
  ...options,
});

const circle = (id, x, y, r, options = {}) => ({
  id,
  shape: 'circle',
  x,
  y,
  r,
  solid: true,
  castsShadow: true,
  material: 'cream-stone',
  breakable: false,
  hp: 0,
  secretTarget: null,
  interactive: null,
  ...options,
});

const poly = (id, points, options = {}) => ({
  id,
  shape: 'poly',
  points,
  solid: true,
  castsShadow: true,
  material: 'cream-stone',
  breakable: false,
  hp: 0,
  secretTarget: null,
  interactive: null,
  ...options,
});

const roomExit = (id, side, to, at, span = 160, options = {}) => ({
  id,
  side,
  to,
  at,
  span,
  requires: null,
  bossGate: false,
  secret: false,
  ...options,
});

const receiver = (id, x, y, alignment, target, options = {}) => ({
  id,
  x,
  y,
  radius: 27,
  alignment,
  target,
  requiredCaster: null,
  tone: 440,
  edgePattern: 'cyan-crescent',
  secret: false,
  ...options,
});

const hazard = (id, type, x, y, options = {}) => ({
  id,
  type,
  shape: 'circle',
  x,
  y,
  r: 42,
  damage: 1,
  telegraph: 'white-core-pulse',
  audioCue: 'hazard-rise',
  ...options,
});

const enemy = (id, type, x, y, variant = 'base', options = {}) => ({
  id,
  type,
  x,
  y,
  variant,
  ...options,
});

const pickup = (id, type, x, y, value, options = {}) => ({
  id,
  type,
  x,
  y,
  value,
  requires: null,
  secret: false,
  ...options,
});

const setDress = (id, type, x, y, options = {}) => ({
  id,
  type,
  x,
  y,
  solid: false,
  castsShadow: false,
  layer: 'mid',
  parallax: 1,
  ...options,
});

export const DISTRICTS = Object.freeze([
  {
    id: 'gilt-garden',
    name: 'The Gilt Garden',
    order: 0,
    floor: '#10152f',
    architecture: '#fff1c9',
    shadow: '#17103d',
    actionEdge: '#66efff',
    dangerCore: '#fffdf2',
    accent: '#ffd45f',
    landmark: 'A walking hedge orbiting a bone-white sundial.',
    rule: 'Living casters bend and shorten their shadows while they move.',
  },
  {
    id: 'bellworks',
    name: 'The Bellworks',
    order: 1,
    floor: '#101b3f',
    architecture: '#f8e6b6',
    shadow: '#24134b',
    actionEdge: '#58e8ff',
    dangerCore: '#ffffff',
    accent: '#b884ff',
    landmark: 'A silent bell suspended inside rotating cobalt machinery.',
    rule: 'Rotors move shadow lanes; bells announce danger with shape, pulse, and pitch.',
  },
  {
    id: 'drowned-archive',
    name: 'The Drowned Archive',
    order: 2,
    floor: '#08172b',
    architecture: '#e9e5d2',
    shadow: '#10113a',
    actionEdge: '#74f3ff',
    dangerCore: '#fffaf0',
    accent: '#9d74ff',
    landmark: 'Pale shelves reflected in water darker than the room.',
    rule: 'Reflections make dashed decoy shadows; authoritative edges remain solid and sing.',
  },
  {
    id: 'glass-orchard',
    name: 'The Glass Orchard',
    order: 3,
    floor: '#17233e',
    architecture: '#eaffff',
    shadow: '#211448',
    actionEdge: '#4feaff',
    dangerCore: '#ffffff',
    accent: '#f2cf64',
    landmark: 'Clear trees splitting one captive sun into paired shadows.',
    rule: 'Glass casters create two separated lobes and overlapping umbra lanes.',
  },
  {
    id: 'false-noon',
    name: 'False Noon',
    order: 4,
    floor: '#efe8cc',
    architecture: '#fffdf4',
    shadow: '#251447',
    actionEdge: '#26dff5',
    dangerCore: '#35135f',
    accent: '#ffca4c',
    landmark: 'A white prison wrapped around a patch of real sky.',
    rule: 'Hostile lights rewrite geometry; cast shadows are scarce, deliberate, and precious.',
  },
]);

const readableTelegraph = (shape, motion, audio) => ({
  shape,
  motion,
  audio,
  luminance: 'white-core with dark silhouette and cyan timing rim',
});

export const ENEMY_ARCHETYPES = Object.freeze({
  moth: {
    id: 'moth',
    name: 'Sun Moth',
    hp: 26,
    speed: 178,
    radius: 17,
    contact: 1,
    score: 100,
    behavior: 'orbits the player, then lunges toward the captive sun',
    telegraph: readableTelegraph('folding diamond', 'wings clamp twice before lunge', 'two dry wing clicks'),
    bulletPatterns: [
      { id: 'sun-lunge', kind: 'dash', count: 1, speed: 470, cooldown: 1.45, interruptibleByCut: true },
    ],
  },
  husk: {
    id: 'husk',
    name: 'Garden Husk',
    hp: 44,
    speed: 104,
    radius: 24,
    contact: 1,
    score: 145,
    behavior: 'pressures at melee range and turns broadside to expose a long cuttable shadow',
    telegraph: readableTelegraph('wide bracket', 'shoulders flare outward before sweep', 'low wooden knock'),
    bulletPatterns: [
      { id: 'root-sweep', kind: 'arc', count: 5, speed: 210, spread: 0.72, cooldown: 1.9, interruptibleByCut: true },
    ],
  },
  bell: {
    id: 'bell',
    name: 'Bell Node',
    hp: 58,
    speed: 0,
    radius: 27,
    contact: 1,
    score: 190,
    behavior: 'rotates in place and emits radial volleys whose shadow can be cut to cancel them',
    telegraph: readableTelegraph('expanding ring with one missing notch', 'ring contracts into the core', 'rising three-note chime'),
    bulletPatterns: [
      { id: 'radial-eight', kind: 'radial', count: 8, speed: 235, cooldown: 2.2, interruptibleByCut: true },
      { id: 'radial-offset', kind: 'radial', count: 10, speed: 185, angleStep: 0.314, cooldown: 3.4, interruptibleByCut: true },
    ],
  },
  needle: {
    id: 'needle',
    name: 'Index Needle',
    hp: 34,
    speed: 128,
    radius: 18,
    contact: 1,
    score: 175,
    behavior: 'keeps a long sightline, fires a narrow triplet, then relocates',
    telegraph: readableTelegraph('long tapered line', 'line narrows and flashes at the origin', 'stereo page-slice'),
    bulletPatterns: [
      { id: 'needle-triplet', kind: 'aimed', count: 3, speed: 410, interval: 0.11, cooldown: 1.75, interruptibleByCut: true },
    ],
  },
  warden: {
    id: 'warden',
    name: 'Noon Warden',
    hp: 82,
    speed: 78,
    radius: 30,
    contact: 1,
    score: 255,
    behavior: 'shielded in light; becomes vulnerable while standing in edged shade or after a cut',
    telegraph: readableTelegraph('split shield chevron', 'shield halves peel apart', 'brass latch followed by breath'),
    bulletPatterns: [
      { id: 'shield-fan', kind: 'fan', count: 7, speed: 250, spread: 1.08, cooldown: 2.35, interruptibleByCut: true },
    ],
  },
  twin: {
    id: 'twin',
    name: 'Prism Twin',
    hp: 68,
    speed: 132,
    radius: 22,
    contact: 1,
    score: 310,
    behavior: 'carries a hostile lamp and mirrors the player aim to alter nearby shadows',
    telegraph: readableTelegraph('paired opposing crescents', 'crescents exchange sides before firing', 'two tones crossing in stereo'),
    bulletPatterns: [
      { id: 'cross-light', kind: 'cross', count: 8, speed: 275, cooldown: 2.0, interruptibleByCut: true },
      { id: 'mirror-shot', kind: 'mirrored-aimed', count: 2, speed: 360, interval: 0.18, cooldown: 2.8, interruptibleByCut: true },
    ],
  },
  'hedge-guardian': {
    id: 'hedge-guardian',
    name: 'THE HEDGE THAT KEPT WALKING',
    boss: true,
    hp: 760,
    speed: 86,
    radius: 78,
    contact: 1,
    score: 3500,
    behavior: 'four root limbs orbit independently; severing their shadows opens the heart',
    telegraph: readableTelegraph('four root wedges', 'one wedge goes bone-white before each sweep', 'four descending wood knocks'),
    bulletPatterns: [
      { id: 'root-cardinals', kind: 'radial', count: 12, speed: 205, cooldown: 2.6, interruptibleByCut: true },
      { id: 'walking-wall', kind: 'sweeping-wall', count: 7, speed: 165, cooldown: 4.4, interruptibleByCut: false },
    ],
  },
  'bell-guardian': {
    id: 'bell-guardian',
    name: 'THE BELL WITHOUT A MOUTH',
    boss: true,
    hp: 920,
    speed: 0,
    radius: 92,
    contact: 1,
    score: 5000,
    behavior: 'a receiver shell rotates around a silent core; three aligned shadows break each phase',
    telegraph: readableTelegraph('concentric broken circles', 'the missing notches align before impact', 'sub-bass toll plus three clear pips'),
    bulletPatterns: [
      { id: 'mouthless-rings', kind: 'radial-waves', count: 18, waves: 3, speed: 205, cooldown: 3.2, interruptibleByCut: true },
      { id: 'clapper-lanes', kind: 'lane', count: 5, speed: 285, cooldown: 4.7, interruptibleByCut: false },
    ],
  },
  'reader-guardian': {
    id: 'reader-guardian',
    name: 'THE READER UNDER WATER',
    boss: true,
    hp: 980,
    speed: 108,
    radius: 68,
    contact: 1,
    score: 6000,
    behavior: 'creates dashed reflection doubles; the true body disturbs water and carries the audible cadence',
    telegraph: readableTelegraph('solid eye among dashed copies', 'true eye blinks one beat later', 'wet page-turn centered on the real body'),
    bulletPatterns: [
      { id: 'footnote-stream', kind: 'aimed-curve', count: 9, speed: 230, cooldown: 2.3, interruptibleByCut: true },
      { id: 'redaction-bars', kind: 'lane', count: 6, speed: 190, cooldown: 4.2, interruptibleByCut: false },
    ],
  },
  'noon-guardian': {
    id: 'noon-guardian',
    name: 'YOUR OTHER NOON',
    boss: true,
    hp: 1320,
    speed: 142,
    radius: 58,
    contact: 1,
    score: 10000,
    behavior: 'mirrors cuts, carries a rival sun, and finally makes the screen boundary itself cast inward',
    telegraph: readableTelegraph('player-shaped negative silhouette', 'rival sun crosses through its chest', 'the player cut sound reversed, then snapped forward'),
    bulletPatterns: [
      { id: 'mirrored-cut', kind: 'dash-copy', count: 1, speed: 760, cooldown: 1.55, interruptibleByCut: true },
      { id: 'inward-horizon', kind: 'boundary-wall', count: 4, speed: 155, cooldown: 4.8, interruptibleByCut: false },
      { id: 'two-noons', kind: 'spiral-pair', count: 24, speed: 245, cooldown: 3.7, interruptibleByCut: true },
    ],
  },
});

export const UPGRADES = Object.freeze({
  cut: {
    id: 'cut',
    name: 'Shadow Cut',
    source: 'starting-verb',
    description: 'Dash across an authoritative shadow edge to sever its caster and refund movement.',
  },
  'root-cut': {
    id: 'root-cut',
    name: 'Root Cut',
    source: 'gg-walking-hedge',
    description: 'A successful cut carries through living root barriers and wakes old garden routes.',
  },
  pin: {
    id: 'pin',
    name: 'Pin / Recall',
    source: 'bw-mouthless-bell',
    description: 'Throw the False Sun to a fixed point, leaving aim and movement independent until recall.',
  },
  'edge-sight': {
    id: 'edge-sight',
    name: 'Reader\'s Edge',
    source: 'da-reader-under-water',
    description: 'Authoritative shadows carry a solid cyan-white rim; reflections become dashed and quiet.',
  },
  split: {
    id: 'split',
    name: 'Split Noon',
    source: 'go-mirror-grove',
    description: 'Three consecutive cuts briefly create a second light and a powerful overlap umbra.',
  },
  'true-noon': {
    id: 'true-noon',
    name: 'A Sun With a Shadow',
    source: 'fn-other-noon',
    description: 'The prison learns a day-night cycle. Full shadow-language completion changes the ending.',
  },
});

const rooms = [
  {
    id: 'gg-awakening',
    name: 'Where Your Shadow Woke First',
    district: 'gilt-garden',
    spawn: { x: 150, y: 450 },
    exits: [
      roomExit('gg-awake-east', 'east', 'gg-lattice', 450, 190),
      roomExit('gg-awake-root-exit', 'south', 'gg-rootways', 1280, 150, {
        requires: 'break:gg-awake-crack',
        secret: true,
      }),
    ],
    obstacles: [
      rect('gg-awake-north-hedge', 560, 118, 690, 72, { material: 'ink-hedge' }),
      rect('gg-awake-south-hedge', 620, 782, 590, 76, { material: 'ink-hedge' }),
      circle('gg-awake-pillar', 650, 440, 62, { material: 'bone-sundial', interactive: 'aim-teacher' }),
      rect('gg-awake-trellis-a', 930, 290, 62, 260, { material: 'gilt-trellis' }),
      rect('gg-awake-trellis-b', 1080, 610, 62, 260, { material: 'gilt-trellis' }),
      circle('gg-awake-pot-a', 365, 285, 44, { material: 'porcelain' }),
      circle('gg-awake-pot-b', 390, 630, 36, { material: 'porcelain' }),
      rect('gg-awake-crack', 1280, 824, 178, 54, {
        material: 'cracked-cream-stone',
        breakable: true,
        hp: 22,
        secretTarget: 'gg-awake-first-lens',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('gg-awake-receiver', 825, 442, 'gg-first-song', 'gg-awake-flow-shard', {
        requiredCaster: 'gg-awake-pillar',
        tone: 523.25,
      }),
    ],
    hazards: [
      hazard('gg-awake-thorns', 'thorn-bed', 1170, 195, { shape: 'rect', w: 250, h: 48, r: undefined }),
    ],
    enemies: [
      enemy('gg-awake-husk', 'husk', 535, 545, 'young'),
      enemy('gg-awake-moth', 'moth', 980, 430, 'slow-wing'),
    ],
    pickups: [
      pickup('gg-awake-flow-shard', 'dash-shard', 825, 442, 1, { requires: 'alignment:gg-first-song' }),
      pickup('gg-awake-first-lens', 'beam-lens', 1280, 730, 0.06, {
        requires: 'break:gg-awake-crack',
        secret: true,
      }),
    ],
    decor: [
      setDress('gg-awake-title-tree', 'crooked-gold-tree', 225, 160, { scale: 1.5, layer: 'back', parallax: 0.82 }),
      setDress('gg-awake-cyan-bed-a', 'cyan-flower-bed', 275, 710, { scale: 1.2 }),
      setDress('gg-awake-cyan-bed-b', 'cyan-flower-bed', 760, 690, { scale: 0.9 }),
      setDress('gg-awake-cyan-bed-c', 'cyan-flower-bed', 1260, 310, { scale: 0.8 }),
      setDress('gg-awake-distant-hedge', 'walking-hedge-silhouette', 1400, 115, { layer: 'back', parallax: 0.7 }),
      setDress('gg-awake-motes', 'sun-motes', 700, 430, { count: 28, radius: 370 }),
    ],
    inscription: 'Nothing moved until your shadow disagreed.',
  },
  {
    id: 'gg-lattice',
    name: 'The Lattice That Refused Noon',
    district: 'gilt-garden',
    spawn: { x: 155, y: 450 },
    exits: [
      roomExit('gg-lattice-west', 'west', 'gg-awakening', 450, 190),
      roomExit('gg-lattice-north', 'north', 'gg-walking-hedge', 800, 180, {
        requires: 'alignment:gg-lattice-song',
        bossGate: true,
      }),
      roomExit('gg-lattice-east', 'east', 'bw-throat', 450, 180, {
        requires: 'boss:boss-gg-walking-hedge',
        bossGate: true,
      }),
    ],
    obstacles: [
      rect('gg-lattice-left-rail', 420, 305, 58, 430, { material: 'gilt-trellis' }),
      rect('gg-lattice-right-rail', 1085, 600, 58, 430, { material: 'gilt-trellis' }),
      poly('gg-lattice-diagonal-a', [[560, 150], [630, 150], [850, 470], [795, 505]], { material: 'bone-lattice' }),
      poly('gg-lattice-diagonal-b', [[985, 745], [920, 750], [720, 460], [775, 425]], { material: 'bone-lattice' }),
      circle('gg-lattice-caster-a', 645, 625, 52, { material: 'pruned-tree' }),
      circle('gg-lattice-caster-b', 1010, 270, 48, { material: 'pruned-tree' }),
      rect('gg-lattice-root-gate', 800, 88, 210, 56, {
        material: 'living-root',
        interactive: 'receiver-gate',
      }),
      rect('gg-lattice-crack', 1430, 695, 58, 190, {
        material: 'cracked-cream-stone',
        breakable: true,
        hp: 28,
        secretTarget: 'gg-lattice-secret-shard',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('gg-lattice-receiver-a', 590, 275, 'gg-lattice-song', 'gg-lattice-root-gate', {
        requiredCaster: 'gg-lattice-caster-a',
        tone: 392,
      }),
      receiver('gg-lattice-receiver-b', 1015, 630, 'gg-lattice-song', 'gg-lattice-root-gate', {
        requiredCaster: 'gg-lattice-caster-b',
        tone: 523.25,
      }),
    ],
    hazards: [
      hazard('gg-lattice-thorns-a', 'thorn-bed', 755, 735, { shape: 'rect', w: 280, h: 46, r: undefined }),
      hazard('gg-lattice-thorns-b', 'thorn-bed', 860, 170, { shape: 'rect', w: 230, h: 42, r: undefined }),
    ],
    enemies: [
      enemy('gg-lattice-moth-a', 'moth', 580, 450, 'garden'),
      enemy('gg-lattice-moth-b', 'moth', 960, 430, 'garden'),
      enemy('gg-lattice-husk', 'husk', 1235, 465, 'trellis'),
    ],
    pickups: [
      pickup('gg-lattice-name', 'night-name', 800, 155, 1, { requires: 'alignment:gg-lattice-song' }),
      pickup('gg-lattice-secret-shard', 'dash-shard', 1460, 695, 1, {
        requires: 'break:gg-lattice-crack',
        secret: true,
      }),
    ],
    decor: [
      setDress('gg-lattice-arch', 'bone-arch', 800, 72, { layer: 'back', scale: 1.2 }),
      setDress('gg-lattice-flower-a', 'cyan-flower-bed', 270, 180, { scale: 0.8 }),
      setDress('gg-lattice-flower-b', 'cyan-flower-bed', 1315, 225, { scale: 1.1 }),
      setDress('gg-lattice-topiary-a', 'animal-topiary', 275, 675, { facing: 0.3 }),
      setDress('gg-lattice-topiary-b', 'animal-topiary', 1290, 725, { facing: -2.5 }),
      setDress('gg-lattice-thread', 'cyan-thread', 800, 450, { path: [[590, 275], [800, 450], [1015, 630]] }),
    ],
    inscription: 'A straight line is only a cage viewed end-on.',
  },
  {
    id: 'gg-rootways',
    name: 'Rootways Beneath the Manners',
    district: 'gilt-garden',
    spawn: { x: 1260, y: 740 },
    exits: [
      roomExit('gg-rootways-north', 'north', 'gg-awakening', 1280, 150, {
        requires: 'break:gg-awake-crack',
        secret: true,
      }),
      roomExit('gg-rootways-east', 'east', 'go-threshold', 610, 150, {
        requires: 'upgrade:pin',
        secret: true,
      }),
      roomExit('gg-rootways-south', 'south', 'da-stacks', 420, 150, {
        requires: 'upgrade:edge-sight',
        secret: true,
      }),
    ],
    obstacles: [
      poly('gg-rootways-root-a', [[120, 180], [480, 120], [520, 205], [205, 300]], { material: 'living-root' }),
      poly('gg-rootways-root-b', [[495, 300], [930, 185], [975, 265], [555, 395]], { material: 'living-root' }),
      poly('gg-rootways-root-c', [[870, 610], [1460, 520], [1480, 630], [910, 720]], { material: 'living-root' }),
      circle('gg-rootways-knot-a', 515, 560, 76, { material: 'root-knot', interactive: 'living-caster' }),
      circle('gg-rootways-knot-b', 1110, 360, 64, { material: 'root-knot', interactive: 'living-caster' }),
      rect('gg-rootways-pin-gate', 1530, 610, 54, 166, {
        material: 'root-and-bone',
        interactive: 'pin-gate',
      }),
      rect('gg-rootways-crack', 520, 824, 180, 54, {
        material: 'cracked-root-shell',
        breakable: true,
        hp: 36,
        secretTarget: 'gg-rootways-health',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('gg-rootways-receiver-a', 720, 500, 'gg-root-memory', 'gg-rootways-name', {
        requiredCaster: 'gg-rootways-knot-a',
        tone: 311.13,
        secret: true,
      }),
      receiver('gg-rootways-receiver-b', 980, 450, 'gg-root-memory', 'gg-rootways-name', {
        requiredCaster: 'gg-rootways-knot-b',
        tone: 466.16,
        secret: true,
      }),
    ],
    hazards: [
      hazard('gg-rootways-spore-a', 'sleep-spore', 760, 205, { r: 58, damage: 0, status: 'slow' }),
      hazard('gg-rootways-spore-b', 'sleep-spore', 1260, 710, { r: 52, damage: 0, status: 'slow' }),
    ],
    enemies: [
      enemy('gg-rootways-husk-a', 'husk', 350, 470, 'buried'),
      enemy('gg-rootways-husk-b', 'husk', 1240, 420, 'buried'),
      enemy('gg-rootways-warden', 'warden', 835, 650, 'sleeping', { dormantUntil: 'upgrade:root-cut' }),
    ],
    pickups: [
      pickup('gg-rootways-health', 'health-knot', 520, 745, 1, {
        requires: 'break:gg-rootways-crack',
        secret: true,
      }),
      pickup('gg-rootways-name', 'night-name', 840, 470, 1, {
        requires: 'alignment:gg-root-memory',
        secret: true,
      }),
    ],
    decor: [
      setDress('gg-rootways-bones-a', 'buried-statue', 170, 665, { rotation: -0.4, scale: 1.3 }),
      setDress('gg-rootways-bones-b', 'buried-statue', 1370, 210, { rotation: 2.2, scale: 0.8 }),
      setDress('gg-rootways-fungus-a', 'cyan-root-fungus', 475, 500, { count: 12 }),
      setDress('gg-rootways-fungus-b', 'cyan-root-fungus', 1140, 420, { count: 16 }),
      setDress('gg-rootways-sky-slit', 'gold-sky-slit', 810, 92, { layer: 'back', parallax: 0.75 }),
      setDress('gg-rootways-memory', 'shadow-family-tableau', 825, 475, { requires: 'alignment:gg-root-memory', layer: 'back' }),
    ],
    inscription: 'The garden buried every root that remembered choosing a direction.',
  },
  {
    id: 'gg-walking-hedge',
    name: 'The Hedge That Kept Walking',
    district: 'gilt-garden',
    spawn: { x: 800, y: 780 },
    exits: [
      roomExit('gg-hedge-south', 'south', 'gg-lattice', 800, 180, {
        requires: 'alignment:gg-lattice-song',
        bossGate: true,
      }),
    ],
    obstacles: [
      circle('gg-hedge-dial', 800, 430, 128, { solid: false, material: 'bone-sundial', interactive: 'boss-dial' }),
      rect('gg-hedge-limb-n', 800, 235, 54, 220, { material: 'living-root', interactive: 'boss-rotor', rotationSpeed: 0.36 }),
      rect('gg-hedge-limb-e', 995, 430, 220, 54, { material: 'living-root', interactive: 'boss-rotor', rotationSpeed: -0.31 }),
      rect('gg-hedge-limb-s', 800, 625, 54, 220, { material: 'living-root', interactive: 'boss-rotor', rotationSpeed: 0.28 }),
      rect('gg-hedge-limb-w', 605, 430, 220, 54, { material: 'living-root', interactive: 'boss-rotor', rotationSpeed: -0.39 }),
      circle('gg-hedge-pillar-a', 275, 230, 58, { material: 'pruned-tree' }),
      circle('gg-hedge-pillar-b', 1325, 230, 58, { material: 'pruned-tree' }),
      circle('gg-hedge-pillar-c', 275, 670, 58, { material: 'pruned-tree' }),
      circle('gg-hedge-pillar-d', 1325, 670, 58, { material: 'pruned-tree' }),
      rect('gg-hedge-crack', 1455, 250, 54, 180, {
        material: 'cracked-cream-stone',
        breakable: true,
        hp: 44,
        secretTarget: 'gg-hedge-secret-lens',
        interactive: 'breakable',
      }),
    ],
    receivers: [],
    hazards: [
      hazard('gg-hedge-thorn-ring', 'rotating-thorn-ring', 800, 430, { r: 285, damage: 1, speed: 0.28 }),
    ],
    enemies: [
      enemy('gg-hedge-moth-a', 'moth', 350, 450, 'guardian-attendant'),
      enemy('gg-hedge-moth-b', 'moth', 1250, 450, 'guardian-attendant'),
    ],
    pickups: [
      pickup('gg-hedge-rootcut', 'ability', 800, 430, 'root-cut', { requires: 'boss:boss-gg-walking-hedge' }),
      pickup('gg-hedge-secret-lens', 'beam-lens', 1445, 250, 0.06, {
        requires: 'break:gg-hedge-crack',
        secret: true,
      }),
    ],
    decor: [
      setDress('gg-hedge-crown', 'topiary-crown', 800, 112, { layer: 'back', scale: 1.5 }),
      setDress('gg-hedge-crowd-left', 'shadow-gardeners', 155, 450, { count: 7, layer: 'back' }),
      setDress('gg-hedge-crowd-right', 'shadow-gardeners', 1445, 450, { count: 7, layer: 'back' }),
      setDress('gg-hedge-flowers-nw', 'cyan-flower-bed', 270, 225, { scale: 1.1 }),
      setDress('gg-hedge-flowers-se', 'cyan-flower-bed', 1330, 675, { scale: 1.1 }),
      setDress('gg-hedge-pollen', 'gold-pollen', 800, 430, { count: 42, radius: 520 }),
    ],
    inscription: 'It was trimmed into obedience. It learned to walk anyway.',
    boss: {
      id: 'boss-gg-walking-hedge',
      type: 'hedge-guardian',
      x: 800,
      y: 430,
      reward: 'upgrade:root-cut',
      phases: 3,
      arenaLock: true,
    },
  },
  {
    id: 'bw-throat',
    name: 'The Throat Before the Bell',
    district: 'bellworks',
    spawn: { x: 145, y: 450 },
    exits: [
      roomExit('bw-throat-west', 'west', 'gg-lattice', 450, 180, {
        requires: 'boss:boss-gg-walking-hedge',
        bossGate: true,
      }),
      roomExit('bw-throat-east', 'east', 'bw-rotor', 450, 170),
      roomExit('bw-throat-north', 'north', 'bw-resonance', 1170, 150),
    ],
    obstacles: [
      rect('bw-throat-pipe-a', 430, 210, 390, 66, { material: 'cobalt-machine' }),
      rect('bw-throat-pipe-b', 550, 690, 510, 66, { material: 'cobalt-machine' }),
      circle('bw-throat-gear-a', 860, 305, 76, { material: 'cream-brass', interactive: 'rotor', rotationSpeed: 0.45 }),
      circle('bw-throat-gear-b', 1110, 575, 90, { material: 'cream-brass', interactive: 'rotor', rotationSpeed: -0.34 }),
      rect('bw-throat-column-a', 1280, 250, 76, 280, { material: 'bell-brass' }),
      rect('bw-throat-column-b', 1320, 650, 76, 260, { material: 'bell-brass' }),
      rect('bw-throat-crack', 835, 824, 176, 54, {
        material: 'cracked-cobalt',
        breakable: true,
        hp: 38,
        secretTarget: 'bw-throat-secret-shard',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('bw-throat-receiver', 1045, 255, 'bw-throat-overtone', 'bw-throat-name', {
        requiredCaster: 'bw-throat-gear-a',
        tone: 587.33,
      }),
    ],
    hazards: [
      hazard('bw-throat-steam-a', 'steam-vent', 700, 430, { r: 44, period: 2.4 }),
      hazard('bw-throat-steam-b', 'steam-vent', 1180, 420, { r: 44, period: 2.4, phase: 1.2 }),
    ],
    enemies: [
      enemy('bw-throat-bell', 'bell', 690, 390, 'throat'),
      enemy('bw-throat-husk', 'husk', 980, 610, 'brass-root'),
      enemy('bw-throat-needle', 'needle', 1310, 430, 'apprentice'),
    ],
    pickups: [
      pickup('bw-throat-name', 'night-name', 1045, 255, 1, { requires: 'alignment:bw-throat-overtone' }),
      pickup('bw-throat-secret-shard', 'dash-shard', 835, 748, 1, {
        requires: 'break:bw-throat-crack',
        secret: true,
      }),
    ],
    decor: [
      setDress('bw-throat-bell-silhouette', 'distant-mouthless-bell', 1260, 105, { layer: 'back', parallax: 0.68, scale: 1.35 }),
      setDress('bw-throat-cable-a', 'hanging-cable', 350, 120, { length: 240 }),
      setDress('bw-throat-cable-b', 'hanging-cable', 920, 95, { length: 190 }),
      setDress('bw-throat-violet-furnace', 'violet-furnace-window', 1450, 210, { layer: 'back' }),
      setDress('bw-throat-sparks', 'cyan-machine-sparks', 990, 450, { count: 20, radius: 410 }),
    ],
    inscription: 'The machine kept a throat ready for a voice it had forbidden.',
  },
  {
    id: 'bw-rotor',
    name: 'Five Shadows on One Axle',
    district: 'bellworks',
    spawn: { x: 145, y: 450 },
    exits: [
      roomExit('bw-rotor-west', 'west', 'bw-throat', 450, 170),
      roomExit('bw-rotor-east', 'east', 'bw-resonance', 630, 150),
      roomExit('bw-rotor-north', 'north', 'bw-mouthless', 800, 180, {
        requires: 'alignment:bw-rotor-chord',
        bossGate: true,
      }),
      roomExit('bw-rotor-south', 'south', 'fn-processional', 1320, 140, {
        requires: 'upgrade:split',
        secret: true,
      }),
    ],
    obstacles: [
      circle('bw-rotor-hub', 800, 450, 102, { material: 'cream-brass', interactive: 'rotor-hub' }),
      rect('bw-rotor-arm-a', 800, 245, 52, 250, { material: 'cobalt-machine', interactive: 'rotor', rotationSpeed: 0.42 }),
      rect('bw-rotor-arm-b', 995, 390, 250, 52, { material: 'cobalt-machine', interactive: 'rotor', rotationSpeed: 0.42 }),
      rect('bw-rotor-arm-c', 920, 625, 52, 250, { material: 'cobalt-machine', interactive: 'rotor', rotationSpeed: 0.42 }),
      poly('bw-rotor-arm-d', [[610, 610], [655, 650], [470, 765], [430, 710]], { material: 'cobalt-machine', interactive: 'rotor', rotationSpeed: 0.42 }),
      poly('bw-rotor-arm-e', [[615, 310], [650, 255], [455, 140], [420, 205]], { material: 'cobalt-machine', interactive: 'rotor', rotationSpeed: 0.42 }),
      rect('bw-rotor-north-gate', 800, 86, 210, 52, { material: 'bell-brass', interactive: 'receiver-gate' }),
      rect('bw-rotor-crack', 1455, 655, 54, 178, {
        material: 'cracked-cobalt',
        breakable: true,
        hp: 42,
        secretTarget: 'bw-rotor-health',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('bw-rotor-receiver-a', 345, 300, 'bw-rotor-chord', 'bw-rotor-north-gate', {
        requiredCaster: 'bw-rotor-arm-b',
        tone: 293.66,
      }),
      receiver('bw-rotor-receiver-b', 1110, 230, 'bw-rotor-chord', 'bw-rotor-north-gate', {
        requiredCaster: 'bw-rotor-arm-d',
        tone: 440,
      }),
      receiver('bw-rotor-receiver-c', 1160, 690, 'bw-rotor-chord', 'bw-rotor-north-gate', {
        requiredCaster: 'bw-rotor-arm-e',
        tone: 587.33,
      }),
    ],
    hazards: [
      hazard('bw-rotor-furnace-a', 'furnace-void', 230, 180, { r: 80, damage: 1 }),
      hazard('bw-rotor-furnace-b', 'furnace-void', 1370, 260, { r: 72, damage: 1 }),
      hazard('bw-rotor-furnace-c', 'furnace-void', 270, 720, { r: 68, damage: 1 }),
    ],
    enemies: [
      enemy('bw-rotor-bell-a', 'bell', 310, 470, 'syncopated'),
      enemy('bw-rotor-bell-b', 'bell', 1280, 480, 'syncopated'),
      enemy('bw-rotor-moth-a', 'moth', 650, 160, 'soot'),
      enemy('bw-rotor-moth-b', 'moth', 980, 760, 'soot'),
    ],
    pickups: [
      pickup('bw-rotor-health', 'health-knot', 1450, 655, 1, {
        requires: 'break:bw-rotor-crack',
        secret: true,
      }),
      pickup('bw-rotor-chord-shard', 'dash-shard', 800, 130, 1, { requires: 'alignment:bw-rotor-chord' }),
    ],
    decor: [
      setDress('bw-rotor-floor-rings', 'concentric-floor-rings', 800, 450, { radius: 430, layer: 'back' }),
      setDress('bw-rotor-counterweight-a', 'hanging-counterweight', 180, 420, { scale: 1.2 }),
      setDress('bw-rotor-counterweight-b', 'hanging-counterweight', 1420, 420, { scale: 1.2 }),
      setDress('bw-rotor-sparks', 'cyan-machine-sparks', 800, 450, { count: 36, radius: 380 }),
      setDress('bw-rotor-score', 'floor-music-notation', 800, 820, { layer: 'back', width: 620 }),
    ],
    inscription: 'Five shadows kept time. The sixth was whoever crossed them.',
  },
  {
    id: 'bw-resonance',
    name: 'Resonance Foundry',
    district: 'bellworks',
    spawn: { x: 1165, y: 760 },
    exits: [
      roomExit('bw-resonance-south', 'south', 'bw-throat', 1170, 150),
      roomExit('bw-resonance-west', 'west', 'bw-rotor', 630, 150),
      roomExit('bw-resonance-east', 'east', 'bw-mouthless', 450, 170, { bossGate: true }),
      roomExit('bw-resonance-north', 'north', 'da-vestibule', 380, 150, {
        requires: 'upgrade:pin',
        bossGate: true,
      }),
    ],
    obstacles: [
      rect('bw-resonance-anvil-a', 350, 550, 210, 105, { material: 'cream-brass' }),
      rect('bw-resonance-anvil-b', 780, 340, 240, 105, { material: 'cream-brass' }),
      rect('bw-resonance-anvil-c', 1210, 590, 210, 105, { material: 'cream-brass' }),
      circle('bw-resonance-bell-a', 390, 250, 58, { material: 'bell-brass', interactive: 'swing-caster', swing: 0.38 }),
      circle('bw-resonance-bell-b', 800, 665, 70, { material: 'bell-brass', interactive: 'swing-caster', swing: -0.31 }),
      circle('bw-resonance-bell-c', 1190, 245, 54, { material: 'bell-brass', interactive: 'swing-caster', swing: 0.45 }),
      rect('bw-resonance-crack', 1455, 220, 54, 180, {
        material: 'cracked-cobalt',
        breakable: true,
        hp: 46,
        secretTarget: 'bw-resonance-secret-lens',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('bw-resonance-receiver-a', 580, 440, 'bw-foundry-triad', 'bw-resonance-secret-lens', {
        requiredCaster: 'bw-resonance-bell-a',
        tone: 349.23,
        secret: true,
      }),
      receiver('bw-resonance-receiver-b', 990, 430, 'bw-foundry-triad', 'bw-resonance-secret-lens', {
        requiredCaster: 'bw-resonance-bell-b',
        tone: 440,
        secret: true,
      }),
      receiver('bw-resonance-receiver-c', 795, 180, 'bw-foundry-triad', 'bw-resonance-secret-lens', {
        requiredCaster: 'bw-resonance-bell-c',
        tone: 523.25,
        secret: true,
      }),
    ],
    hazards: [
      hazard('bw-resonance-hammer-a', 'falling-hammer', 560, 690, { shape: 'rect', w: 90, h: 90, r: undefined, period: 2.1 }),
      hazard('bw-resonance-hammer-b', 'falling-hammer', 1010, 205, { shape: 'rect', w: 90, h: 90, r: undefined, period: 2.7 }),
    ],
    enemies: [
      enemy('bw-resonance-needle-a', 'needle', 525, 190, 'foundry'),
      enemy('bw-resonance-needle-b', 'needle', 1060, 700, 'foundry'),
      enemy('bw-resonance-husk', 'husk', 805, 500, 'iron-root'),
      enemy('bw-resonance-bell', 'bell', 1320, 420, 'deep-tone'),
    ],
    pickups: [
      pickup('bw-resonance-secret-lens', 'beam-lens', 1450, 220, 0.06, {
        requires: 'break:bw-resonance-crack',
        secret: true,
      }),
      pickup('bw-resonance-triad-name', 'night-name', 795, 180, 1, {
        requires: 'alignment:bw-foundry-triad',
        secret: true,
      }),
    ],
    decor: [
      setDress('bw-resonance-furnace', 'violet-furnace-mouth', 800, 105, { layer: 'back', scale: 1.5 }),
      setDress('bw-resonance-chain-a', 'hanging-chain', 250, 120, { length: 250 }),
      setDress('bw-resonance-chain-b', 'hanging-chain', 1360, 105, { length: 230 }),
      setDress('bw-resonance-slag-a', 'cyan-slag-river', 440, 800, { width: 420, layer: 'back' }),
      setDress('bw-resonance-slag-b', 'cyan-slag-river', 1160, 105, { width: 290, layer: 'back' }),
    ],
    inscription: 'The workers tuned the bell to the pitch of a locked door.',
  },
  {
    id: 'bw-mouthless',
    name: 'The Bell Without a Mouth',
    district: 'bellworks',
    spawn: { x: 800, y: 785 },
    exits: [
      roomExit('bw-mouthless-south', 'south', 'bw-rotor', 800, 180, {
        requires: 'alignment:bw-rotor-chord',
        bossGate: true,
      }),
      roomExit('bw-mouthless-west', 'west', 'bw-resonance', 450, 170, { bossGate: true }),
    ],
    obstacles: [
      circle('bw-mouthless-shell', 800, 410, 148, {
        solid: false,
        castsShadow: false,
        material: 'receiver-shell',
        interactive: 'boss-receiver-shell',
      }),
      rect('bw-mouthless-rail-a', 425, 260, 290, 48, { material: 'cobalt-machine', interactive: 'boss-rotor', rotationSpeed: 0.28 }),
      rect('bw-mouthless-rail-b', 1175, 260, 290, 48, { material: 'cobalt-machine', interactive: 'boss-rotor', rotationSpeed: -0.28 }),
      rect('bw-mouthless-rail-c', 425, 630, 290, 48, { material: 'cobalt-machine', interactive: 'boss-rotor', rotationSpeed: -0.34 }),
      rect('bw-mouthless-rail-d', 1175, 630, 290, 48, { material: 'cobalt-machine', interactive: 'boss-rotor', rotationSpeed: 0.34 }),
      circle('bw-mouthless-caster-a', 300, 440, 64, { material: 'cream-brass', interactive: 'boss-caster' }),
      circle('bw-mouthless-caster-b', 800, 180, 64, { material: 'cream-brass', interactive: 'boss-caster' }),
      circle('bw-mouthless-caster-c', 1300, 440, 64, { material: 'cream-brass', interactive: 'boss-caster' }),
      rect('bw-mouthless-crack', 1455, 700, 54, 170, {
        material: 'cracked-cobalt',
        breakable: true,
        hp: 50,
        secretTarget: 'bw-mouthless-secret-name',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('bw-mouthless-receiver-a', 520, 390, 'bw-mouthless-shell-break', 'bw-mouthless-shell', {
        requiredCaster: 'bw-mouthless-caster-a',
        tone: 261.63,
      }),
      receiver('bw-mouthless-receiver-b', 800, 630, 'bw-mouthless-shell-break', 'bw-mouthless-shell', {
        requiredCaster: 'bw-mouthless-caster-b',
        tone: 392,
      }),
      receiver('bw-mouthless-receiver-c', 1080, 390, 'bw-mouthless-shell-break', 'bw-mouthless-shell', {
        requiredCaster: 'bw-mouthless-caster-c',
        tone: 523.25,
      }),
    ],
    hazards: [
      hazard('bw-mouthless-clapper', 'sweeping-clapper', 800, 410, { shape: 'rect', w: 72, h: 520, r: undefined, speed: 0.55 }),
    ],
    enemies: [],
    pickups: [
      pickup('bw-mouthless-pin', 'ability', 800, 410, 'pin', { requires: 'boss:bw-mouthless-bell' }),
      pickup('bw-mouthless-secret-name', 'night-name', 1450, 700, 1, {
        requires: 'break:bw-mouthless-crack',
        secret: true,
      }),
    ],
    decor: [
      setDress('bw-mouthless-giant-bell', 'mouthless-bell', 800, 315, { layer: 'back', scale: 2.3 }),
      setDress('bw-mouthless-rope', 'cut-rope', 800, 92, { layer: 'back', length: 250 }),
      setDress('bw-mouthless-audience-left', 'shadow-workers', 150, 450, { count: 9, layer: 'back' }),
      setDress('bw-mouthless-audience-right', 'shadow-workers', 1450, 450, { count: 9, layer: 'back' }),
      setDress('bw-mouthless-dust', 'bell-dust', 800, 410, { count: 56, radius: 600 }),
    ],
    inscription: 'It had been built to toll once, for the end of privacy.',
    boss: {
      id: 'bw-mouthless-bell',
      type: 'bell-guardian',
      x: 800,
      y: 410,
      reward: 'upgrade:pin',
      phases: 3,
      arenaLock: true,
      alignment: 'bw-mouthless-shell-break',
    },
  },
  {
    id: 'da-vestibule',
    name: 'Vestibule of Dry Footnotes',
    district: 'drowned-archive',
    spawn: { x: 380, y: 135 },
    exits: [
      roomExit('da-vestibule-south', 'south', 'bw-resonance', 380, 150, {
        requires: 'upgrade:pin',
        bossGate: true,
      }),
      roomExit('da-vestibule-east', 'east', 'da-stacks', 520, 170),
    ],
    obstacles: [
      rect('da-vestibule-shelf-a', 420, 330, 430, 62, { material: 'pale-shelf' }),
      rect('da-vestibule-shelf-b', 1030, 235, 510, 62, { material: 'pale-shelf' }),
      rect('da-vestibule-shelf-c', 940, 665, 590, 62, { material: 'pale-shelf' }),
      circle('da-vestibule-globe', 770, 470, 78, { material: 'ink-globe', interactive: 'reflection-caster' }),
      rect('da-vestibule-desk', 1230, 475, 220, 92, { material: 'waterlogged-desk' }),
      rect('da-vestibule-crack', 190, 700, 54, 180, {
        material: 'cracked-pale-stone',
        breakable: true,
        hp: 48,
        secretTarget: 'da-vestibule-secret-shard',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('da-vestibule-receiver-a', 560, 550, 'da-dry-footnote', 'da-vestibule-name', {
        requiredCaster: 'da-vestibule-globe',
        tone: 329.63,
      }),
      receiver('da-vestibule-receiver-b', 990, 465, 'da-dry-footnote', 'da-vestibule-name', {
        requiredCaster: 'da-vestibule-globe',
        tone: 493.88,
      }),
    ],
    hazards: [
      hazard('da-vestibule-water-a', 'deep-water', 365, 610, { shape: 'rect', w: 300, h: 150, r: undefined, damage: 0, status: 'slow' }),
      hazard('da-vestibule-reflection', 'decoy-shadow', 770, 630, { shape: 'rect', w: 240, h: 80, r: undefined, damage: 0 }),
    ],
    enemies: [
      enemy('da-vestibule-needle-a', 'needle', 610, 210, 'wet-ink'),
      enemy('da-vestibule-needle-b', 'needle', 1260, 730, 'wet-ink'),
      enemy('da-vestibule-bell', 'bell', 1190, 360, 'submerged'),
    ],
    pickups: [
      pickup('da-vestibule-name', 'night-name', 790, 530, 1, {
        requires: 'alignment:da-dry-footnote',
        secret: true,
      }),
      pickup('da-vestibule-secret-shard', 'dash-shard', 190, 700, 1, {
        requires: 'break:da-vestibule-crack',
        secret: true,
      }),
    ],
    decor: [
      setDress('da-vestibule-page-field', 'floating-pages', 800, 450, { count: 34, radius: 610 }),
      setDress('da-vestibule-waterline', 'black-waterline', 800, 760, { width: 1500, layer: 'back' }),
      setDress('da-vestibule-statue', 'reader-statue', 1430, 155, { layer: 'back', scale: 1.25 }),
      setDress('da-vestibule-lamp-a', 'cyan-reading-lamp', 520, 265, { pulse: 0.2 }),
      setDress('da-vestibule-lamp-b', 'cyan-reading-lamp', 1170, 620, { pulse: 0.35 }),
    ],
    inscription: 'The first drowned word was not lost. It was relieved.',
  },
  {
    id: 'da-stacks',
    name: 'Stacks That Remember Both Ways',
    district: 'drowned-archive',
    spawn: { x: 145, y: 520 },
    exits: [
      roomExit('da-stacks-west', 'west', 'da-vestibule', 520, 170),
      roomExit('da-stacks-south', 'south', 'da-black-index', 1140, 150),
      roomExit('da-stacks-north', 'north', 'gg-rootways', 420, 150, {
        requires: 'upgrade:edge-sight',
        secret: true,
      }),
      roomExit('da-stacks-boughs', 'north', 'go-boughs', 680, 145, {
        requires: 'alignment:da-stacks-backchannel',
        secret: true,
      }),
    ],
    obstacles: [
      rect('da-stacks-shelf-a', 380, 220, 470, 58, { material: 'pale-shelf' }),
      rect('da-stacks-shelf-b', 420, 510, 470, 58, { material: 'pale-shelf' }),
      rect('da-stacks-shelf-c', 780, 720, 520, 58, { material: 'pale-shelf' }),
      rect('da-stacks-shelf-d', 1020, 360, 510, 58, { material: 'pale-shelf' }),
      rect('da-stacks-shelf-e', 1320, 570, 300, 58, { material: 'pale-shelf' }),
      circle('da-stacks-index-wheel', 790, 470, 74, { material: 'ivory-index', interactive: 'rotor', rotationSpeed: -0.23 }),
      rect('da-stacks-backchannel-gate', 1530, 680, 54, 150, { material: 'waterlogged-door', interactive: 'receiver-gate' }),
      rect('da-stacks-crack', 540, 92, 190, 54, {
        material: 'cracked-pale-stone',
        breakable: true,
        hp: 52,
        secretTarget: 'da-stacks-secret-name',
        interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('da-stacks-receiver-a', 645, 325, 'da-stacks-backchannel', 'da-stacks-backchannel-gate', {
        requiredCaster: 'da-stacks-index-wheel',
        tone: 277.18,
        secret: true,
      }),
      receiver('da-stacks-receiver-b', 945, 585, 'da-stacks-backchannel', 'da-stacks-backchannel-gate', {
        requiredCaster: 'da-stacks-index-wheel',
        tone: 415.3,
        secret: true,
      }),
    ],
    hazards: [
      hazard('da-stacks-water-a', 'deep-water', 780, 120, { shape: 'rect', w: 360, h: 120, r: undefined, damage: 0, status: 'slow' }),
      hazard('da-stacks-water-b', 'deep-water', 1180, 785, { shape: 'rect', w: 430, h: 100, r: undefined, damage: 0, status: 'slow' }),
      hazard('da-stacks-redaction', 'sliding-page-wall', 820, 450, { shape: 'rect', w: 36, h: 340, r: undefined, speed: 0.32 }),
    ],
    enemies: [
      enemy('da-stacks-needle-a', 'needle', 350, 350, 'catalogue'),
      enemy('da-stacks-needle-b', 'needle', 1110, 190, 'catalogue'),
      enemy('da-stacks-bell', 'bell', 1250, 700, 'muffled'),
      enemy('da-stacks-warden', 'warden', 780, 590, 'archivist'),
    ],
    pickups: [
      pickup('da-stacks-secret-name', 'night-name', 540, 150, 1, {
        requires: 'break:da-stacks-crack',
        secret: true,
      }),
      pickup('da-stacks-backchannel-shard', 'dash-shard', 1450, 680, 1, {
        requires: 'alignment:da-stacks-backchannel',
        secret: true,
      }),
    ],
    decor: [
      setDress('da-stacks-page-river', 'floating-page-river', 800, 470, { path: [[100, 760], [530, 650], [910, 520], [1500, 260]] }),
      setDress('da-stacks-ladder-a', 'rolling-ladder', 560, 200, { rotation: 0.12 }),
      setDress('da-stacks-ladder-b', 'rolling-ladder', 1190, 345, { rotation: -0.18 }),
      setDress('da-stacks-fish-a', 'ink-fish', 940, 800, { count: 5, layer: 'back' }),
      setDress('da-stacks-fish-b', 'ink-fish', 270, 120, { count: 3, layer: 'back' }),
      setDress('da-stacks-backchannel-mark', 'cyan-crescent-chain', 1450, 680, { requires: 'alignment:da-stacks-backchannel' }),
    ],
    inscription: 'A shelf is a wall that admits it can be moved.',
  },
  {
    id: 'da-black-index',
    name: 'The Black Index',
    district: 'drowned-archive',
    spawn: { x: 1140, y: 140 },
    exits: [
      roomExit('da-index-north', 'north', 'da-stacks', 1140, 150),
      roomExit('da-index-east', 'east', 'da-reader', 450, 180, {
        requires: 'alignment:da-index-citation',
        bossGate: true,
      }),
    ],
    obstacles: [
      rect('da-index-table-a', 380, 250, 320, 82, { material: 'black-index-stone' }),
      rect('da-index-table-b', 790, 650, 390, 82, { material: 'black-index-stone' }),
      rect('da-index-table-c', 1210, 260, 310, 82, { material: 'black-index-stone' }),
      circle('da-index-orrey', 800, 435, 94, { material: 'ivory-index', interactive: 'reflection-caster' }),
      rect('da-index-reader-gate', 1530, 450, 54, 210, { material: 'redaction-door', interactive: 'receiver-gate' }),
      rect('da-index-crack', 210, 700, 54, 178, {
        material: 'cracked-pale-stone', breakable: true, hp: 54,
        secretTarget: 'da-index-secret-name', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('da-index-receiver-a', 530, 485, 'da-index-citation', 'da-index-reader-gate', {
        requiredCaster: 'da-index-orrey', tone: 246.94,
      }),
      receiver('da-index-receiver-b', 1070, 485, 'da-index-citation', 'da-index-reader-gate', {
        requiredCaster: 'da-index-orrey', tone: 369.99,
      }),
      receiver('da-index-receiver-c', 800, 185, 'da-index-citation', 'da-index-reader-gate', {
        requiredCaster: 'da-index-orrey', tone: 554.37,
      }),
    ],
    hazards: [
      hazard('da-index-ink-a', 'rising-ink', 430, 655, { shape: 'rect', w: 270, h: 110, r: undefined, status: 'slow' }),
      hazard('da-index-ink-b', 'rising-ink', 1170, 630, { shape: 'rect', w: 280, h: 115, r: undefined, status: 'slow' }),
    ],
    enemies: [
      enemy('da-index-needle-a', 'needle', 410, 420, 'redactor'),
      enemy('da-index-needle-b', 'needle', 1190, 440, 'redactor'),
      enemy('da-index-warden', 'warden', 800, 710, 'index-keeper'),
      enemy('da-index-bell', 'bell', 800, 240, 'silent'),
    ],
    pickups: [
      pickup('da-index-secret-name', 'night-name', 210, 700, 1, {
        requires: 'break:da-index-crack', secret: true,
      }),
      pickup('da-index-citation-shard', 'dash-shard', 1440, 450, 1, {
        requires: 'alignment:da-index-citation',
      }),
    ],
    decor: [
      setDress('da-index-ceiling-eye', 'reader-eye-mosaic', 800, 90, { layer: 'back', scale: 1.4 }),
      setDress('da-index-ledger-a', 'open-ledger', 380, 250, { rotation: 0.2 }),
      setDress('da-index-ledger-b', 'open-ledger', 1210, 260, { rotation: -0.15 }),
      setDress('da-index-fish', 'ink-fish', 820, 780, { count: 8, layer: 'back' }),
      setDress('da-index-lines', 'cyan-citation-lines', 800, 435, { radius: 410, layer: 'back' }),
    ],
    inscription: 'Every forbidden book was indexed perfectly.',
  },
  {
    id: 'da-reader',
    name: 'The Reader Under Water',
    district: 'drowned-archive',
    spawn: { x: 150, y: 450 },
    exits: [
      roomExit('da-reader-west', 'west', 'da-black-index', 450, 180, {
        requires: 'alignment:da-index-citation', bossGate: true,
      }),
      roomExit('da-reader-north', 'north', 'go-threshold', 800, 170, {
        requires: 'boss:da-reader-under-water', bossGate: true,
      }),
    ],
    obstacles: [
      rect('da-reader-island-a', 390, 260, 320, 74, { material: 'pale-shelf' }),
      rect('da-reader-island-b', 800, 690, 380, 74, { material: 'pale-shelf' }),
      rect('da-reader-island-c', 1210, 260, 320, 74, { material: 'pale-shelf' }),
      circle('da-reader-lamp-a', 390, 520, 62, { material: 'reading-lamp', interactive: 'boss-caster' }),
      circle('da-reader-lamp-b', 1210, 520, 62, { material: 'reading-lamp', interactive: 'boss-caster' }),
      rect('da-reader-crack', 1390, 824, 180, 54, {
        material: 'cracked-pale-stone', breakable: true, hp: 58,
        secretTarget: 'da-reader-health', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('da-reader-anchor-a', 540, 410, 'da-reader-truth', 'da-reader-under-water', {
        requiredCaster: 'da-reader-lamp-a', tone: 220,
      }),
      receiver('da-reader-anchor-b', 1060, 410, 'da-reader-truth', 'da-reader-under-water', {
        requiredCaster: 'da-reader-lamp-b', tone: 440,
      }),
    ],
    hazards: [
      hazard('da-reader-water', 'deep-water', 800, 450, { shape: 'rect', w: 1040, h: 410, r: undefined, damage: 0, status: 'slow' }),
      hazard('da-reader-redaction-a', 'sliding-page-wall', 610, 450, { shape: 'rect', w: 34, h: 520, r: undefined, speed: 0.31 }),
      hazard('da-reader-redaction-b', 'sliding-page-wall', 990, 450, { shape: 'rect', w: 34, h: 520, r: undefined, speed: -0.31 }),
    ],
    enemies: [],
    pickups: [
      pickup('da-reader-edge-sight', 'ability', 800, 450, 'edge-sight', { requires: 'boss:da-reader-under-water' }),
      pickup('da-reader-health', 'health-knot', 1390, 748, 1, {
        requires: 'break:da-reader-crack', secret: true,
      }),
    ],
    decor: [
      setDress('da-reader-reflections', 'dashed-reader-reflections', 800, 570, { count: 5, layer: 'back' }),
      setDress('da-reader-page-halo', 'page-halo', 800, 420, { count: 28, radius: 250 }),
      setDress('da-reader-audience-a', 'submerged-readers', 230, 720, { count: 6, layer: 'back' }),
      setDress('da-reader-audience-b', 'submerged-readers', 1370, 720, { count: 6, layer: 'back' }),
      setDress('da-reader-water-stars', 'water-stars', 800, 450, { count: 45, radius: 650, layer: 'back' }),
    ],
    inscription: 'The reflection read the sentence. The body read what was missing.',
    boss: {
      id: 'da-reader-under-water', type: 'reader-guardian', x: 800, y: 430,
      reward: 'upgrade:edge-sight', phases: 3, arenaLock: true, alignment: 'da-reader-truth',
    },
  },
  {
    id: 'go-threshold',
    name: 'A Tree With Two Afternoons',
    district: 'glass-orchard',
    spawn: { x: 800, y: 760 },
    exits: [
      roomExit('go-threshold-south', 'south', 'da-reader', 800, 170, {
        requires: 'boss:da-reader-under-water', bossGate: true,
      }),
      roomExit('go-threshold-west', 'west', 'gg-rootways', 610, 150, {
        requires: 'upgrade:pin', secret: true,
      }),
      roomExit('go-threshold-east', 'east', 'go-boughs', 450, 180),
    ],
    obstacles: [
      circle('go-threshold-tree-a', 520, 420, 78, { material: 'glass-splitter', interactive: 'split-caster' }),
      circle('go-threshold-tree-b', 1080, 420, 78, { material: 'glass-splitter', interactive: 'split-caster' }),
      poly('go-threshold-root-a', [[350, 600], [610, 525], [650, 570], [390, 690]], { material: 'glass-root' }),
      poly('go-threshold-root-b', [[1250, 600], [990, 525], [950, 570], [1210, 690]], { material: 'glass-root' }),
      rect('go-threshold-pin-gate', 70, 610, 54, 170, { material: 'root-and-glass', interactive: 'pin-gate' }),
      rect('go-threshold-crack', 1320, 105, 185, 54, {
        material: 'cracked-glass-bark', breakable: true, hp: 56,
        secretTarget: 'go-threshold-secret-name', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('go-threshold-receiver-a', 725, 350, 'go-twin-afternoon', 'go-threshold-name', {
        requiredCaster: 'go-threshold-tree-a', tone: 415.3,
      }),
      receiver('go-threshold-receiver-b', 875, 350, 'go-twin-afternoon', 'go-threshold-name', {
        requiredCaster: 'go-threshold-tree-b', tone: 622.25,
      }),
    ],
    hazards: [
      hazard('go-threshold-shard-bed-a', 'glass-shards', 300, 180, { shape: 'rect', w: 250, h: 54, r: undefined }),
      hazard('go-threshold-shard-bed-b', 'glass-shards', 1280, 710, { shape: 'rect', w: 250, h: 54, r: undefined }),
    ],
    enemies: [
      enemy('go-threshold-twin', 'twin', 800, 470, 'young-prism'),
      enemy('go-threshold-moth-a', 'moth', 350, 450, 'glass-wing'),
      enemy('go-threshold-moth-b', 'moth', 1250, 450, 'glass-wing'),
    ],
    pickups: [
      pickup('go-threshold-name', 'night-name', 800, 260, 1, {
        requires: 'alignment:go-twin-afternoon', secret: true,
      }),
      pickup('go-threshold-secret-name', 'night-name', 1320, 170, 1, {
        requires: 'break:go-threshold-crack', secret: true,
      }),
    ],
    decor: [
      setDress('go-threshold-canopy', 'glass-canopy', 800, 92, { layer: 'back', parallax: 0.75, scale: 1.5 }),
      setDress('go-threshold-fruit-a', 'cyan-glass-fruit', 470, 315, { count: 9 }),
      setDress('go-threshold-fruit-b', 'gold-glass-fruit', 1130, 315, { count: 9 }),
      setDress('go-threshold-animal', 'glass-deer-tableau', 800, 155, { layer: 'back' }),
      setDress('go-threshold-pollen', 'prismatic-pollen', 800, 430, { count: 34, radius: 580 }),
    ],
    inscription: 'The glass did not copy the sun. It remembered another one.',
  },
  {
    id: 'go-boughs',
    name: 'Boughs for Running, Roots for Return',
    district: 'glass-orchard',
    spawn: { x: 150, y: 450 },
    exits: [
      roomExit('go-boughs-west', 'west', 'go-threshold', 450, 180),
      roomExit('go-boughs-east', 'east', 'go-prismatory', 450, 175),
      roomExit('go-boughs-stacks', 'south', 'da-stacks', 680, 145, {
        requires: 'alignment:da-stacks-backchannel', secret: true,
      }),
    ],
    obstacles: [
      poly('go-boughs-branch-a', [[260, 160], [330, 135], [650, 370], [600, 420]], { material: 'glass-bough' }),
      poly('go-boughs-branch-b', [[550, 690], [610, 735], [930, 485], [875, 440]], { material: 'glass-bough' }),
      poly('go-boughs-branch-c', [[980, 355], [1035, 305], [1360, 550], [1300, 605]], { material: 'glass-bough' }),
      circle('go-boughs-tree-a', 415, 520, 68, { material: 'glass-splitter', interactive: 'split-caster' }),
      circle('go-boughs-tree-b', 810, 230, 64, { material: 'glass-splitter', interactive: 'split-caster' }),
      circle('go-boughs-tree-c', 1190, 660, 70, { material: 'glass-splitter', interactive: 'split-caster' }),
      rect('go-boughs-backgate', 680, 824, 170, 54, { material: 'page-glass', interactive: 'receiver-gate' }),
      rect('go-boughs-crack', 1440, 225, 54, 180, {
        material: 'cracked-glass-bark', breakable: true, hp: 60,
        secretTarget: 'go-boughs-secret-shard', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('go-boughs-receiver-a', 655, 540, 'go-running-bough', 'go-boughs-name', {
        requiredCaster: 'go-boughs-tree-a', tone: 349.23,
      }),
      receiver('go-boughs-receiver-b', 965, 360, 'go-running-bough', 'go-boughs-name', {
        requiredCaster: 'go-boughs-tree-c', tone: 698.46,
      }),
    ],
    hazards: [
      hazard('go-boughs-shards-a', 'glass-shards', 710, 145, { shape: 'rect', w: 270, h: 48, r: undefined }),
      hazard('go-boughs-shards-b', 'glass-shards', 1040, 760, { shape: 'rect', w: 260, h: 48, r: undefined }),
    ],
    enemies: [
      enemy('go-boughs-twin-a', 'twin', 570, 280, 'bough-runner'),
      enemy('go-boughs-twin-b', 'twin', 1120, 470, 'bough-runner'),
      enemy('go-boughs-needle', 'needle', 820, 620, 'glass-spine'),
      enemy('go-boughs-moth', 'moth', 1320, 170, 'glass-wing'),
    ],
    pickups: [
      pickup('go-boughs-name', 'night-name', 810, 450, 1, {
        requires: 'alignment:go-running-bough', secret: true,
      }),
      pickup('go-boughs-secret-shard', 'dash-shard', 1440, 225, 1, {
        requires: 'break:go-boughs-crack', secret: true,
      }),
    ],
    decor: [
      setDress('go-boughs-vista', 'infinite-glass-orchard', 800, 90, { layer: 'back', parallax: 0.62, scale: 1.5 }),
      setDress('go-boughs-birds-a', 'cyan-glass-birds', 520, 150, { count: 5 }),
      setDress('go-boughs-birds-b', 'gold-glass-birds', 1210, 295, { count: 4 }),
      setDress('go-boughs-fruit', 'mixed-glass-fruit', 850, 480, { count: 24, radius: 530 }),
      setDress('go-boughs-root-map', 'root-map-lines', 680, 785, { layer: 'back', width: 430 }),
    ],
    inscription: 'Some branches only grow toward the place you already left.',
  },
  {
    id: 'go-prismatory',
    name: 'The Prismatory',
    district: 'glass-orchard',
    spawn: { x: 145, y: 450 },
    exits: [
      roomExit('go-prismatory-west', 'west', 'go-boughs', 450, 175),
      roomExit('go-prismatory-north', 'north', 'go-mirror-grove', 800, 180, {
        requires: 'alignment:go-prism-chord', bossGate: true,
      }),
    ],
    obstacles: [
      poly('go-prismatory-prism-a', [[380, 275], [475, 220], [530, 320], [430, 370]], { material: 'glass-prism', interactive: 'split-caster' }),
      poly('go-prismatory-prism-b', [[1070, 230], [1170, 275], [1130, 380], [1025, 330]], { material: 'glass-prism', interactive: 'split-caster' }),
      poly('go-prismatory-prism-c', [[730, 560], [825, 505], [880, 605], [780, 660]], { material: 'glass-prism', interactive: 'split-caster' }),
      rect('go-prismatory-screen-a', 610, 300, 42, 260, { material: 'clear-screen' }),
      rect('go-prismatory-screen-b', 990, 560, 42, 260, { material: 'clear-screen' }),
      rect('go-prismatory-gate', 800, 86, 220, 52, { material: 'prism-door', interactive: 'receiver-gate' }),
      rect('go-prismatory-crack', 210, 720, 54, 176, {
        material: 'cracked-glass-bark', breakable: true, hp: 62,
        secretTarget: 'go-prismatory-lens', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('go-prism-receiver-a', 660, 425, 'go-prism-chord', 'go-prismatory-gate', {
        requiredCaster: 'go-prismatory-prism-a', tone: 311.13,
      }),
      receiver('go-prism-receiver-b', 940, 425, 'go-prism-chord', 'go-prismatory-gate', {
        requiredCaster: 'go-prismatory-prism-b', tone: 466.16,
      }),
      receiver('go-prism-receiver-c', 800, 220, 'go-prism-chord', 'go-prismatory-gate', {
        requiredCaster: 'go-prismatory-prism-c', tone: 622.25,
      }),
    ],
    hazards: [
      hazard('go-prismatory-beam-a', 'refracted-beam', 565, 550, { shape: 'rect', w: 38, h: 300, r: undefined, rotation: 0.6 }),
      hazard('go-prismatory-beam-b', 'refracted-beam', 1040, 410, { shape: 'rect', w: 38, h: 300, r: undefined, rotation: -0.6 }),
    ],
    enemies: [
      enemy('go-prismatory-twin-a', 'twin', 460, 520, 'prismatic'),
      enemy('go-prismatory-twin-b', 'twin', 1140, 520, 'prismatic'),
      enemy('go-prismatory-warden', 'warden', 800, 390, 'glass-shield'),
    ],
    pickups: [
      pickup('go-prismatory-lens', 'beam-lens', 210, 720, 0.06, {
        requires: 'break:go-prismatory-crack', secret: true,
      }),
      pickup('go-prismatory-chord-shard', 'dash-shard', 800, 145, 1, {
        requires: 'alignment:go-prism-chord',
      }),
    ],
    decor: [
      setDress('go-prismatory-spectrum', 'luminance-spectrum', 800, 450, { layer: 'back', width: 980 }),
      setDress('go-prismatory-lens-a', 'suspended-lens', 305, 130, { scale: 1.1 }),
      setDress('go-prismatory-lens-b', 'suspended-lens', 1295, 130, { scale: 1.1 }),
      setDress('go-prismatory-motes', 'prismatic-pollen', 800, 430, { count: 45, radius: 620 }),
      setDress('go-prismatory-glyph', 'split-noon-glyph', 800, 95, { layer: 'back' }),
    ],
    inscription: 'One sun entered. Two accusations left.',
  },
  {
    id: 'go-mirror-grove',
    name: 'The Grove That Saw Twice',
    district: 'glass-orchard',
    spawn: { x: 800, y: 770 },
    exits: [
      roomExit('go-grove-south', 'south', 'go-prismatory', 800, 180, {
        requires: 'alignment:go-prism-chord', bossGate: true,
      }),
      roomExit('go-grove-east', 'east', 'fn-gate', 450, 180, {
        requires: 'upgrade:split', bossGate: true,
      }),
    ],
    obstacles: [
      circle('go-grove-heart-tree', 800, 420, 112, { material: 'glass-heart-tree', interactive: 'split-caster' }),
      circle('go-grove-tree-a', 350, 270, 68, { material: 'glass-splitter', interactive: 'split-caster' }),
      circle('go-grove-tree-b', 1250, 270, 68, { material: 'glass-splitter', interactive: 'split-caster' }),
      circle('go-grove-tree-c', 350, 650, 68, { material: 'glass-splitter', interactive: 'split-caster' }),
      circle('go-grove-tree-d', 1250, 650, 68, { material: 'glass-splitter', interactive: 'split-caster' }),
      rect('go-grove-noon-gate', 1530, 450, 54, 210, { material: 'white-noon-door', interactive: 'upgrade-gate' }),
      rect('go-grove-crack', 180, 450, 54, 190, {
        material: 'cracked-glass-bark', breakable: true, hp: 66,
        secretTarget: 'go-grove-secret-name', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('go-grove-receiver-a', 580, 300, 'go-fourfold-noon', 'go-grove-heart-tree', {
        requiredCaster: 'go-grove-tree-a', tone: 261.63,
      }),
      receiver('go-grove-receiver-b', 1020, 300, 'go-fourfold-noon', 'go-grove-heart-tree', {
        requiredCaster: 'go-grove-tree-b', tone: 329.63,
      }),
      receiver('go-grove-receiver-c', 580, 600, 'go-fourfold-noon', 'go-grove-heart-tree', {
        requiredCaster: 'go-grove-tree-c', tone: 392,
      }),
      receiver('go-grove-receiver-d', 1020, 600, 'go-fourfold-noon', 'go-grove-heart-tree', {
        requiredCaster: 'go-grove-tree-d', tone: 523.25,
      }),
    ],
    hazards: [
      hazard('go-grove-shard-ring', 'rotating-glass-ring', 800, 420, { r: 270, speed: 0.24 }),
    ],
    enemies: [
      enemy('go-grove-twin-a', 'twin', 505, 450, 'elder-prism'),
      enemy('go-grove-twin-b', 'twin', 1095, 450, 'elder-prism'),
      enemy('go-grove-warden-a', 'warden', 800, 210, 'orchard-keeper'),
      enemy('go-grove-warden-b', 'warden', 800, 665, 'orchard-keeper'),
    ],
    pickups: [
      pickup('go-grove-split', 'ability', 800, 420, 'split', { requires: 'alignment:go-fourfold-noon' }),
      pickup('go-grove-secret-name', 'night-name', 180, 450, 1, {
        requires: 'break:go-grove-crack', secret: true,
      }),
    ],
    decor: [
      setDress('go-grove-double-sun', 'paired-sun-reflection', 800, 105, { layer: 'back', scale: 1.4 }),
      setDress('go-grove-glass-herd', 'glass-animal-herd', 800, 760, { count: 11, layer: 'back' }),
      setDress('go-grove-fruit-a', 'cyan-glass-fruit', 340, 265, { count: 12 }),
      setDress('go-grove-fruit-b', 'gold-glass-fruit', 1260, 265, { count: 12 }),
      setDress('go-grove-umbra', 'overlap-umbra-glyph', 800, 420, { layer: 'back', radius: 210 }),
    ],
    inscription: 'The orchard did not need another sun. It needed proof that one was not inevitable.',
  },
  {
    id: 'fn-gate',
    name: 'The Gate With No Evening Side',
    district: 'false-noon',
    spawn: { x: 145, y: 450 },
    exits: [
      roomExit('fn-gate-west', 'west', 'go-mirror-grove', 450, 180, {
        requires: 'upgrade:split', bossGate: true,
      }),
      roomExit('fn-gate-east', 'east', 'fn-processional', 450, 180),
    ],
    obstacles: [
      rect('fn-gate-wall-a', 430, 210, 390, 70, { material: 'white-noon-stone' }),
      rect('fn-gate-wall-b', 430, 690, 390, 70, { material: 'white-noon-stone' }),
      rect('fn-gate-wall-c', 1030, 260, 450, 70, { material: 'white-noon-stone' }),
      rect('fn-gate-wall-d', 1120, 650, 520, 70, { material: 'white-noon-stone' }),
      circle('fn-gate-caster-a', 760, 455, 60, { material: 'black-noon-pillar' }),
      circle('fn-gate-caster-b', 1260, 455, 60, { material: 'black-noon-pillar' }),
      rect('fn-gate-inner-seal', 1410, 450, 60, 220, { material: 'noon-seal', interactive: 'receiver-gate' }),
      rect('fn-gate-crack', 810, 824, 178, 54, {
        material: 'cracked-white-noon', breakable: true, hp: 70,
        secretTarget: 'fn-gate-health', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('fn-gate-receiver-a', 940, 405, 'fn-gate-eclipse', 'fn-gate-inner-seal', {
        requiredCaster: 'fn-gate-caster-a', tone: 440,
      }),
      receiver('fn-gate-receiver-b', 1060, 495, 'fn-gate-eclipse', 'fn-gate-inner-seal', {
        requiredCaster: 'fn-gate-caster-b', tone: 659.25,
      }),
    ],
    hazards: [
      hazard('fn-gate-sweep-a', 'hostile-light-sweep', 650, 450, { shape: 'rect', w: 44, h: 600, r: undefined, speed: 0.38 }),
      hazard('fn-gate-sweep-b', 'hostile-light-sweep', 1190, 450, { shape: 'rect', w: 44, h: 600, r: undefined, speed: -0.31 }),
    ],
    enemies: [
      enemy('fn-gate-warden-a', 'warden', 540, 460, 'noon-guard'),
      enemy('fn-gate-warden-b', 'warden', 1060, 460, 'noon-guard'),
      enemy('fn-gate-twin', 'twin', 1310, 440, 'hostile-sun'),
    ],
    pickups: [
      pickup('fn-gate-health', 'health-knot', 810, 748, 1, {
        requires: 'break:fn-gate-crack', secret: true,
      }),
      pickup('fn-gate-eclipse-shard', 'dash-shard', 1410, 450, 1, { requires: 'alignment:fn-gate-eclipse' }),
    ],
    decor: [
      setDress('fn-gate-sky-slice', 'real-sky-slice', 800, 85, { layer: 'back', width: 440, parallax: 0.6 }),
      setDress('fn-gate-banner-a', 'noon-banner', 350, 120, { length: 230 }),
      setDress('fn-gate-banner-b', 'noon-banner', 1250, 120, { length: 230 }),
      setDress('fn-gate-prisoners', 'shadow-prisoners', 800, 700, { count: 9, layer: 'back' }),
      setDress('fn-gate-dust', 'white-noon-dust', 800, 450, { count: 42, radius: 650 }),
    ],
    inscription: 'Noon had walls. That was how you knew it was afraid.',
  },
  {
    id: 'fn-processional',
    name: 'Processional for a Captive Sun',
    district: 'false-noon',
    spawn: { x: 150, y: 450 },
    exits: [
      roomExit('fn-processional-west', 'west', 'fn-gate', 450, 180),
      roomExit('fn-processional-north', 'north', 'fn-oculus', 800, 170),
      roomExit('fn-processional-rotor', 'north', 'bw-rotor', 1320, 140, {
        requires: 'upgrade:split', secret: true,
      }),
    ],
    obstacles: [
      circle('fn-processional-column-a', 340, 260, 54, { material: 'white-noon-column' }),
      circle('fn-processional-column-b', 620, 640, 54, { material: 'white-noon-column' }),
      circle('fn-processional-column-c', 900, 260, 54, { material: 'white-noon-column' }),
      circle('fn-processional-column-d', 1180, 640, 54, { material: 'white-noon-column' }),
      rect('fn-processional-dais', 1380, 390, 260, 110, { material: 'white-noon-stone' }),
      rect('fn-processional-crack', 1420, 690, 54, 180, {
        material: 'cracked-white-noon', breakable: true, hp: 74,
        secretTarget: 'fn-processional-secret-shard', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('fn-processional-receiver-a', 500, 450, 'fn-processional-name', 'fn-processional-name-pickup', {
        requiredCaster: 'fn-processional-column-a', tone: 293.66, secret: true,
      }),
      receiver('fn-processional-receiver-b', 1080, 450, 'fn-processional-name', 'fn-processional-name-pickup', {
        requiredCaster: 'fn-processional-column-d', tone: 587.33, secret: true,
      }),
    ],
    hazards: [
      hazard('fn-processional-lane-a', 'noon-lance-lane', 760, 180, { shape: 'rect', w: 520, h: 34, r: undefined, period: 2.2 }),
      hazard('fn-processional-lane-b', 'noon-lance-lane', 830, 720, { shape: 'rect', w: 520, h: 34, r: undefined, period: 2.2, phase: 1.1 }),
    ],
    enemies: [
      enemy('fn-processional-warden-a', 'warden', 470, 430, 'processional'),
      enemy('fn-processional-warden-b', 'warden', 1050, 430, 'processional'),
      enemy('fn-processional-needle-a', 'needle', 720, 250, 'white-index'),
      enemy('fn-processional-needle-b', 'needle', 840, 650, 'white-index'),
      enemy('fn-processional-twin', 'twin', 1300, 460, 'court-light'),
    ],
    pickups: [
      pickup('fn-processional-name-pickup', 'night-name', 800, 450, 1, {
        requires: 'alignment:fn-processional-name', secret: true,
      }),
      pickup('fn-processional-secret-shard', 'dash-shard', 1420, 690, 1, {
        requires: 'break:fn-processional-crack', secret: true,
      }),
    ],
    decor: [
      setDress('fn-processional-crowd-a', 'white-mask-crowd', 200, 180, { count: 8, layer: 'back' }),
      setDress('fn-processional-crowd-b', 'white-mask-crowd', 1360, 180, { count: 8, layer: 'back' }),
      setDress('fn-processional-carpet', 'cyan-processional-line', 800, 450, { width: 1120, layer: 'back' }),
      setDress('fn-processional-sun-cage', 'distant-sun-cage', 1400, 280, { layer: 'back', scale: 1.25 }),
      setDress('fn-processional-petals', 'white-paper-petals', 800, 450, { count: 40, radius: 610 }),
    ],
    inscription: 'They held a parade every day so nobody would notice day had stopped.',
  },
  {
    id: 'fn-oculus',
    name: 'Oculus of the Unblinking Hour',
    district: 'false-noon',
    spawn: { x: 800, y: 760 },
    exits: [
      roomExit('fn-oculus-south', 'south', 'fn-processional', 800, 170),
      roomExit('fn-oculus-east', 'east', 'fn-other-noon', 450, 190, {
        requires: 'alignment:fn-oculus-eclipse', bossGate: true,
      }),
    ],
    obstacles: [
      circle('fn-oculus-ring', 800, 420, 148, { solid: false, material: 'oculus-ring', interactive: 'rotor' }),
      circle('fn-oculus-pillar-a', 360, 240, 60, { material: 'black-noon-pillar' }),
      circle('fn-oculus-pillar-b', 1240, 240, 60, { material: 'black-noon-pillar' }),
      circle('fn-oculus-pillar-c', 360, 650, 60, { material: 'black-noon-pillar' }),
      circle('fn-oculus-pillar-d', 1240, 650, 60, { material: 'black-noon-pillar' }),
      rect('fn-oculus-seal', 1530, 450, 54, 230, { material: 'last-noon-seal', interactive: 'receiver-gate' }),
      rect('fn-oculus-crack', 200, 450, 54, 190, {
        material: 'cracked-white-noon', breakable: true, hp: 78,
        secretTarget: 'fn-oculus-secret-name', interactive: 'breakable',
      }),
    ],
    receivers: [
      receiver('fn-oculus-receiver-a', 585, 305, 'fn-oculus-eclipse', 'fn-oculus-seal', {
        requiredCaster: 'fn-oculus-pillar-a', tone: 220,
      }),
      receiver('fn-oculus-receiver-b', 1015, 305, 'fn-oculus-eclipse', 'fn-oculus-seal', {
        requiredCaster: 'fn-oculus-pillar-b', tone: 329.63,
      }),
      receiver('fn-oculus-receiver-c', 585, 555, 'fn-oculus-eclipse', 'fn-oculus-seal', {
        requiredCaster: 'fn-oculus-pillar-c', tone: 440,
      }),
      receiver('fn-oculus-receiver-d', 1015, 555, 'fn-oculus-eclipse', 'fn-oculus-seal', {
        requiredCaster: 'fn-oculus-pillar-d', tone: 659.25,
      }),
    ],
    hazards: [
      hazard('fn-oculus-iris', 'closing-iris', 800, 420, { r: 295, damage: 1, period: 5.5 }),
      hazard('fn-oculus-sweep', 'hostile-light-sweep', 800, 420, { shape: 'rect', w: 42, h: 670, r: undefined, speed: 0.48 }),
    ],
    enemies: [
      enemy('fn-oculus-warden-a', 'warden', 500, 430, 'oculus'),
      enemy('fn-oculus-warden-b', 'warden', 1100, 430, 'oculus'),
      enemy('fn-oculus-twin-a', 'twin', 800, 220, 'oculus'),
      enemy('fn-oculus-twin-b', 'twin', 800, 620, 'oculus'),
    ],
    pickups: [
      pickup('fn-oculus-secret-name', 'night-name', 200, 450, 1, {
        requires: 'break:fn-oculus-crack', secret: true,
      }),
      pickup('fn-oculus-door-shard', 'dash-shard', 1430, 450, 1, { requires: 'alignment:fn-oculus-eclipse' }),
    ],
    decor: [
      setDress('fn-oculus-real-sky', 'real-sky-oculus', 800, 420, { layer: 'back', radius: 260 }),
      setDress('fn-oculus-hours', 'broken-hour-marks', 800, 420, { layer: 'back', radius: 390, count: 11 }),
      setDress('fn-oculus-shadow-language', 'complete-shadow-glyph', 200, 450, { requires: 'night-names:14', layer: 'back' }),
      setDress('fn-oculus-cage', 'sun-cage-silhouette', 1435, 450, { layer: 'back', scale: 1.3 }),
      setDress('fn-oculus-dust', 'white-noon-dust', 800, 420, { count: 55, radius: 650 }),
    ],
    inscription: 'An unblinking eye does not see more. It merely refuses to dream.',
  },
  {
    id: 'fn-other-noon',
    name: 'Your Other Noon',
    district: 'false-noon',
    spawn: { x: 150, y: 450 },
    exits: [
      roomExit('fn-other-west', 'west', 'fn-oculus', 450, 190, {
        requires: 'alignment:fn-oculus-eclipse', bossGate: true,
      }),
    ],
    obstacles: [
      circle('fn-other-rival-sun', 1120, 450, 86, { solid: false, material: 'rival-sun', interactive: 'hostile-light' }),
      circle('fn-other-caster-a', 430, 230, 62, { material: 'black-noon-pillar', interactive: 'boss-caster' }),
      circle('fn-other-caster-b', 800, 180, 62, { material: 'black-noon-pillar', interactive: 'boss-caster' }),
      circle('fn-other-caster-c', 1170, 230, 62, { material: 'black-noon-pillar', interactive: 'boss-caster' }),
      circle('fn-other-caster-d', 430, 670, 62, { material: 'black-noon-pillar', interactive: 'boss-caster' }),
      circle('fn-other-caster-e', 800, 720, 62, { material: 'black-noon-pillar', interactive: 'boss-caster' }),
      circle('fn-other-caster-f', 1170, 670, 62, { material: 'black-noon-pillar', interactive: 'boss-caster' }),
      rect('fn-other-horizon-n', 800, 38, 1540, 48, { material: 'screen-caster', interactive: 'boss-boundary' }),
      rect('fn-other-horizon-s', 800, 862, 1540, 48, { material: 'screen-caster', interactive: 'boss-boundary' }),
    ],
    receivers: [
      receiver('fn-other-receiver-a', 610, 360, 'fn-give-sun-shadow', 'fn-other-true-noon', {
        requiredCaster: 'fn-other-caster-a', tone: 261.63, secret: true,
      }),
      receiver('fn-other-receiver-b', 990, 360, 'fn-give-sun-shadow', 'fn-other-true-noon', {
        requiredCaster: 'fn-other-caster-c', tone: 392, secret: true,
      }),
      receiver('fn-other-receiver-c', 800, 590, 'fn-give-sun-shadow', 'fn-other-true-noon', {
        requiredCaster: 'fn-other-caster-e', tone: 523.25, secret: true,
      }),
    ],
    hazards: [
      hazard('fn-other-boundary', 'inward-horizon', 800, 450, { shape: 'rect', w: 1500, h: 800, r: undefined, damage: 1, phase: 3 }),
    ],
    enemies: [],
    pickups: [
      pickup('fn-other-true-noon', 'ability', 1120, 450, 'true-noon', {
        requires: 'boss:boss-fn-other-noon',
      }),
      pickup('fn-other-perfect-ending', 'ending-key', 800, 450, 1, {
        requires: 'boss:boss-fn-other-noon', secret: true,
      }),
    ],
    decor: [
      setDress('fn-other-real-sky', 'real-sky-vault', 800, 450, { layer: 'back', radius: 720 }),
      setDress('fn-other-mirror-player', 'other-player-silhouette', 1120, 450, { scale: 1.15 }),
      setDress('fn-other-all-names', 'night-name-constellation', 800, 115, { requires: 'night-names:14', layer: 'back' }),
      setDress('fn-other-world-shadows', 'restored-world-tableau', 800, 790, { layer: 'back', width: 1320 }),
      setDress('fn-other-day-night', 'day-night-ring', 800, 450, { requires: 'night-names:14', layer: 'back', radius: 610 }),
    ],
    inscription: 'The last false thing was the belief that light had no shadow.',
    boss: {
      id: 'boss-fn-other-noon', type: 'noon-guardian', x: 1120, y: 450,
      reward: 'upgrade:true-noon', phases: 4, arenaLock: true,
      trueEndingRequires: 'night-names:14', alignment: 'fn-give-sun-shadow',
    },
  },
];

export const ROOMS = rooms;
export const NIGHT_NAME_TOTAL = rooms.reduce(
  (sum, room) => sum + room.pickups.filter((pickupItem) => pickupItem.type === 'night-name').length,
  0,
);

export const ROOM_ORDER = Object.freeze([
  'gg-awakening', 'gg-lattice', 'gg-rootways', 'gg-walking-hedge',
  'bw-throat', 'bw-rotor', 'bw-resonance', 'bw-mouthless',
  'da-vestibule', 'da-stacks', 'da-black-index', 'da-reader',
  'go-threshold', 'go-boughs', 'go-prismatory', 'go-mirror-grove',
  'fn-gate', 'fn-processional', 'fn-oculus', 'fn-other-noon',
]);

const ROOM_BY_ID = new Map(ROOMS.map((room) => [room.id, room]));

export function getRoom(id) {
  return ROOM_BY_ID.get(id) ?? null;
}

const OPPOSITE_SIDE = Object.freeze({ north: 'south', south: 'north', east: 'west', west: 'east' });
const MEANINGFUL_SECRET_PICKUPS = new Set([
  'health-knot', 'beam-lens', 'night-name', 'dash-shard', 'ability', 'ending-key',
]);

function geometryInBounds(item) {
  if (item.shape === 'rect') {
    return Number.isFinite(item.x) && Number.isFinite(item.y)
      && Number.isFinite(item.w) && Number.isFinite(item.h)
      && item.w > 0 && item.h > 0
      && item.x - item.w / 2 >= 0 && item.x + item.w / 2 <= ROOM_W
      && item.y - item.h / 2 >= 0 && item.y + item.h / 2 <= ROOM_H;
  }
  if (item.shape === 'circle') {
    return Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.r)
      && item.r > 0 && item.x - item.r >= 0 && item.x + item.r <= ROOM_W
      && item.y - item.r >= 0 && item.y + item.r <= ROOM_H;
  }
  if (item.shape === 'poly') {
    return Array.isArray(item.points) && item.points.length >= 3
      && item.points.every((point) => Array.isArray(point) && point.length === 2
        && Number.isFinite(point[0]) && Number.isFinite(point[1])
        && point[0] >= 0 && point[0] <= ROOM_W && point[1] >= 0 && point[1] <= ROOM_H);
  }
  return false;
}

function pointInBounds(item) {
  return item && Number.isFinite(item.x) && Number.isFinite(item.y)
    && item.x >= 0 && item.x <= ROOM_W && item.y >= 0 && item.y <= ROOM_H;
}

export function validateContent() {
  const errors = [];
  const warnings = [];
  const ids = new Map();
  const alignments = new Map();
  const bossIds = new Set();
  const districtIds = new Set(DISTRICTS.map((district) => district.id));

  const addId = (id, kind, roomId, object) => {
    if (!id || typeof id !== 'string') {
      errors.push(`${roomId}: ${kind} is missing a string id`);
      return;
    }
    if (ids.has(id)) errors.push(`duplicate id ${id} in ${roomId} and ${ids.get(id).roomId}`);
    else ids.set(id, { kind, roomId, object });
  };

  for (const room of ROOMS) {
    addId(room.id, 'room', room.id, room);
    if (!districtIds.has(room.district)) errors.push(`${room.id}: unknown district ${room.district}`);
    if (!pointInBounds(room.spawn)) errors.push(`${room.id}: spawn is out of bounds`);
    if (!Array.isArray(room.exits) || room.exits.length === 0) errors.push(`${room.id}: room has no exits`);
    if (!room.inscription || typeof room.inscription !== 'string') warnings.push(`${room.id}: missing inscription`);

    for (const obstacle of room.obstacles ?? []) {
      addId(obstacle.id, 'obstacle', room.id, obstacle);
      if (!geometryInBounds(obstacle)) errors.push(`${room.id}: obstacle ${obstacle.id} is out of bounds or malformed`);
      if ((String(obstacle.material).includes('cracked') || obstacle.interactive === 'breakable')
        && (!obstacle.breakable || !(obstacle.hp > 0) || !obstacle.secretTarget)) {
        errors.push(`${room.id}: cracked wall ${obstacle.id} is a fake or lacks hp/target`);
      }
    }
    for (const exit of room.exits ?? []) {
      addId(exit.id, 'exit', room.id, exit);
      const limit = exit.side === 'north' || exit.side === 'south' ? ROOM_W : ROOM_H;
      if (!OPPOSITE_SIDE[exit.side]) errors.push(`${room.id}: exit ${exit.id} has invalid side ${exit.side}`);
      if (!Number.isFinite(exit.at) || !Number.isFinite(exit.span) || exit.span <= 0
        || exit.at - exit.span / 2 < 0 || exit.at + exit.span / 2 > limit) {
        errors.push(`${room.id}: exit ${exit.id} is out of bounds`);
      }
    }
    for (const item of room.receivers ?? []) {
      addId(item.id, 'receiver', room.id, item);
      if (!pointInBounds(item) || !(item.radius > 0)) errors.push(`${room.id}: receiver ${item.id} is out of bounds`);
      if (!item.alignment || !item.target) errors.push(`${room.id}: receiver ${item.id} lacks alignment/target`);
      if (item.alignment) {
        const entry = alignments.get(item.alignment) ?? { targets: new Set(), receivers: [] };
        entry.targets.add(item.target);
        entry.receivers.push(item.id);
        alignments.set(item.alignment, entry);
      }
    }
    for (const item of room.hazards ?? []) {
      addId(item.id, 'hazard', room.id, item);
      if (!geometryInBounds(item)) errors.push(`${room.id}: hazard ${item.id} is out of bounds or malformed`);
      if (!item.telegraph || !item.audioCue) errors.push(`${room.id}: hazard ${item.id} lacks redundant telegraphing`);
    }
    for (const item of room.enemies ?? []) {
      addId(item.id, 'enemy', room.id, item);
      if (!pointInBounds(item)) errors.push(`${room.id}: enemy ${item.id} is out of bounds`);
      if (!ENEMY_ARCHETYPES[item.type]) errors.push(`${room.id}: enemy ${item.id} has unknown type ${item.type}`);
    }
    for (const item of room.pickups ?? []) {
      addId(item.id, 'pickup', room.id, item);
      if (!pointInBounds(item)) errors.push(`${room.id}: pickup ${item.id} is out of bounds`);
      if (item.value === undefined || item.value === null) errors.push(`${room.id}: pickup ${item.id} has no value`);
    }
    for (const item of room.decor ?? []) {
      addId(item.id, 'decor', room.id, item);
      if (!pointInBounds(item)) errors.push(`${room.id}: decor ${item.id} is out of bounds`);
      if (item.solid) warnings.push(`${room.id}: decor ${item.id} is solid; keep set dressing noncolliding`);
    }
    if (room.boss) {
      addId(room.boss.id, 'boss', room.id, room.boss);
      bossIds.add(room.boss.id);
      if (!pointInBounds(room.boss)) errors.push(`${room.id}: boss is out of bounds`);
      if (!ENEMY_ARCHETYPES[room.boss.type]?.boss) errors.push(`${room.id}: boss type ${room.boss.type} is missing or not marked boss`);
      if (!room.boss.reward) errors.push(`${room.id}: boss has no authored reward`);
    }
  }

  const requirementExists = (requirement) => {
    if (!requirement) return true;
    const colon = requirement.indexOf(':');
    if (colon < 1) return false;
    const kind = requirement.slice(0, colon);
    const value = requirement.slice(colon + 1);
    if (kind === 'upgrade') return Boolean(UPGRADES[value]);
    if (kind === 'boss') return bossIds.has(value);
    if (kind === 'break') return ids.get(value)?.kind === 'obstacle' && ids.get(value).object.breakable;
    if (kind === 'alignment') return alignments.has(value);
    if (kind === 'pickup') return ids.get(value)?.kind === 'pickup';
    if (kind === 'night-names') return Number.isInteger(Number(value)) && Number(value) > 0;
    return false;
  };

  let secretObjectCount = 0;
  const secretTargets = new Set();
  for (const room of ROOMS) {
    for (const exit of room.exits) {
      if (!ROOM_BY_ID.has(exit.to)) errors.push(`${room.id}: exit ${exit.id} points to missing room ${exit.to}`);
      else {
        const reciprocal = ROOM_BY_ID.get(exit.to).exits.some((other) => other.to === room.id && other.side === OPPOSITE_SIDE[exit.side]);
        if (!reciprocal) errors.push(`${room.id}: exit ${exit.id} has no opposite reciprocal exit in ${exit.to}`);
      }
      if (!requirementExists(exit.requires)) errors.push(`${room.id}: exit ${exit.id} has missing requirement ${exit.requires}`);
      if (exit.secret) secretObjectCount += 1;
    }
    for (const obstacle of room.obstacles) {
      if (obstacle.secretTarget) {
        secretObjectCount += 1;
        const target = ids.get(obstacle.secretTarget);
        if (!target) errors.push(`${room.id}: breakable ${obstacle.id} points to missing target ${obstacle.secretTarget}`);
        else if (target.kind === 'pickup' && !MEANINGFUL_SECRET_PICKUPS.has(target.object.type)) {
          errors.push(`${room.id}: breakable ${obstacle.id} points to trivial pickup ${obstacle.secretTarget}`);
        } else if (target.kind !== 'pickup' && target.kind !== 'exit') {
          errors.push(`${room.id}: breakable ${obstacle.id} must reveal a reward or shortcut, not ${target.kind}`);
        }
        if (secretTargets.has(obstacle.secretTarget)) warnings.push(`secret target ${obstacle.secretTarget} is reused`);
        secretTargets.add(obstacle.secretTarget);
      }
    }
    for (const item of room.receivers) {
      if (!ids.has(item.target)) errors.push(`${room.id}: receiver ${item.id} points to missing target ${item.target}`);
      if (item.requiredCaster && ids.get(item.requiredCaster)?.kind !== 'obstacle') {
        errors.push(`${room.id}: receiver ${item.id} points to missing caster ${item.requiredCaster}`);
      }
      if (item.secret) secretObjectCount += 1;
    }
    for (const item of room.pickups) {
      if (!requirementExists(item.requires)) errors.push(`${room.id}: pickup ${item.id} has missing requirement ${item.requires}`);
      if (item.secret) secretObjectCount += 1;
    }
    if (room.boss && !requirementExists(room.boss.reward)) errors.push(`${room.id}: boss reward ${room.boss.reward} is missing`);
    if (room.boss?.trueEndingRequires && !requirementExists(room.boss.trueEndingRequires)) {
      errors.push(`${room.id}: true ending requirement ${room.boss.trueEndingRequires} is invalid`);
    }
  }

  for (const [alignment, entry] of alignments) {
    if (entry.targets.size !== 1) errors.push(`alignment ${alignment} disagrees about its target`);
  }

  for (const [key, archetype] of Object.entries(ENEMY_ARCHETYPES)) {
    if (archetype.id !== key) errors.push(`enemy archetype key/id mismatch: ${key}/${archetype.id}`);
    if (!(archetype.hp > 0) || !(archetype.radius > 0) || archetype.speed < 0) errors.push(`enemy archetype ${key} has invalid stats`);
    if (!Array.isArray(archetype.bulletPatterns) || archetype.bulletPatterns.length === 0) errors.push(`enemy archetype ${key} has no attack pattern`);
    if (!archetype.telegraph?.shape || !archetype.telegraph?.motion || !archetype.telegraph?.audio || !archetype.telegraph?.luminance) {
      errors.push(`enemy archetype ${key} depends on incomplete or hue-only telegraphing`);
    }
  }

  if (ROOMS.length !== 20) errors.push(`expected 20 rooms, found ${ROOMS.length}`);
  if (ROOM_ORDER.length !== ROOMS.length || new Set(ROOM_ORDER).size !== ROOMS.length
    || ROOM_ORDER.some((id) => !ROOM_BY_ID.has(id))) errors.push('ROOM_ORDER does not contain every room exactly once');
  if (ROOM_ORDER[0] !== 'gg-awakening') errors.push('campaign must begin in gg-awakening');
  if (bossIds.size !== 4) errors.push(`expected four guardian rooms, found ${bossIds.size}`);
  for (const district of DISTRICTS) {
    const count = ROOMS.filter((room) => room.district === district.id).length;
    if (count !== 4) errors.push(`${district.id}: expected four compact rooms, found ${count}`);
  }
  if (secretObjectCount < 12) errors.push(`expected at least 12 worthwhile secret objects, found ${secretObjectCount}`);
  const first = getRoom('gg-awakening');
  if (!first || first.enemies.length < 1 || first.receivers.length < 1
    || !first.obstacles.some((item) => item.breakable) || !first.pickups.some((item) => item.secret)) {
    errors.push('first room lacks immediate combat, alignment, or a real secret reward');
  }

  const visited = new Set();
  const queue = [ROOM_ORDER[0]];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id) || !ROOM_BY_ID.has(id)) continue;
    visited.add(id);
    for (const exit of ROOM_BY_ID.get(id).exits) queue.push(exit.to);
  }
  if (visited.size !== ROOMS.length) errors.push(`room graph is disconnected: reached ${visited.size}/${ROOMS.length}`);
  const undirectedEdges = ROOMS.reduce((sum, room) => sum + room.exits.length, 0) / 2;
  if (undirectedEdges < ROOMS.length + 3) errors.push('room graph lacks enough revisit loops and shortcuts');

  return {
    ok: errors.length === 0,
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      rooms: ROOMS.length,
      districts: DISTRICTS.length,
      guardians: bossIds.size,
      enemyArchetypes: Object.keys(ENEMY_ARCHETYPES).length,
      enemies: ROOMS.reduce((sum, room) => sum + room.enemies.length + (room.boss ? 1 : 0), 0),
      receivers: ROOMS.reduce((sum, room) => sum + room.receivers.length, 0),
      nightNames: NIGHT_NAME_TOTAL,
      breakableSecrets: ROOMS.reduce((sum, room) => sum + room.obstacles.filter((item) => item.secretTarget).length, 0),
      secretObjects: secretObjectCount,
      graphEdges: undirectedEdges,
    },
  };
}
