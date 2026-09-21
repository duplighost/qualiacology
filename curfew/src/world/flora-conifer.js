// New diffuse/alpha art authored from twigs and individual needles. No bitmap is
// filtered into a silhouette: empty space between shoots stays transparent.
// Coordinates below describe one 2.25 m branch, projected into a padded cell.
const TAU = Math.PI * 2;
function hash(i, j, seed) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
const mix = (a, b, t) => a + (b - a) * t;
const gray = value => `rgb(${value|0},${value|0},${value|0})`;

/** Draw a complete open needle bough into a 1024-square local canvas space. */
export function drawConiferBough(g, variant) {
  const seed = 8279 + variant * 907, strokes = [];
  const project = p => [512 + (p[0] + p[2] * .24) * 490, 947 - (p[1] + p[2] * .13) * 376];
  const curve = (a, b, t, bend) => [
    mix(a[0], b[0], t) + Math.sin(t * Math.PI) * bend[0],
    mix(a[1], b[1], t) + Math.sin(t * Math.PI) * bend[1],
    mix(a[2], b[2], t) + Math.sin(t * Math.PI) * bend[2],
  ];
  const stemAt = t => [.028 * Math.sin(t * 5.4) - t * .055, t * 2.25, .055 * Math.sin(t * 4.1)];
  function twig(a, b, width, key, needles = true, bend = [0, 0, 0]) {
    const nodes = [];
    for (let j = 0; j <= 7; j++) nodes.push(curve(a, b, j / 7, bend));
    strokes.push({kind: 0, nodes, width, depth: (a[2] + b[2]) * .5, value: 82 + hash(key, 3, seed) * 40});
    if (!needles) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.hypot(dx, dy, dz), inv = 1 / Math.max(.001, Math.hypot(dx, dy));
    const sx = -dy * inv, sy = dx * inv;
    // Spiral attachment and a depth projection make an actual round shoot. The
    // fir's flattened leaves lean toward two sides without becoming paired teeth.
    const count = Math.max(18, Math.ceil(length / .0019));
    for (let i = 0; i < count; i++) {
      const t = (i + .15 + hash(i, key + 11, seed) * .7) / count;
      const p = curve(a, b, t, bend), phase = i * 2.39996323 + key * 1.71;
      const radial = variant ? (i & 1 ? -1 : 1) * (.72 + hash(i, key + 17, seed) * .28) : Math.cos(phase);
      const depth = variant ? Math.sin(phase) * .36 : Math.sin(phase);
      const needleLength = (variant ? .053 : .046) * (.72 + hash(i, key + 23, seed) * .66);
      const lean = .23 + hash(i, key + 29, seed) * .45;
      const q = [p[0] + (sx * radial + dx / length * lean) * needleLength,
        p[1] + (sy * radial + dy / length * lean) * needleLength,
        p[2] + (depth + dz / length * lean) * needleLength];
      strokes.push({kind: 1, a: p, b: q, width: (variant ? .0037 : .0031) * (.8 + hash(i, key + 31, seed) * .45),
        depth: (p[2] + q[2]) * .5, value: 136 + hash(i, key + 37, seed) * 83 + depth * 14});
    }
  }
  twig(stemAt(0), stemAt(1), .014, 1, false, [.014, 0, .036]);
  // The two sides are deliberately staggered; unequal subsidiary shoots leave
  // connected woody anatomy with irregular windows of sky between the needles.
  for (let row = 0; row < 12; row++) for (const side of [-1, 1]) {
    const key = row * 61 + (side + 1) * 17;
    const t = .10 + row * .066 + hash(row, side + 4, seed) * .024 + (side > 0 ? .021 : 0);
    const start = stemAt(t);
    const span = (.31 + Math.sin(t * Math.PI) * .64) * (1 - t * .44)
      * (.84 + hash(row, side + 9, seed) * .20);
    const tip = [start[0] + side * span,
      start[1] + .17 + t * .19 + hash(row, side + 13, seed) * .13,
      start[2] + (hash(row, side + 19, seed) - .5) * .38];
    const bend = [-side * .028, -.036, .043 * side];
    twig(start, tip, .0065 * (1 - t * .47), key, true, bend);
    const shoots = 6 + (row % 3);
    for (let j = 0; j < shoots; j++) {
      const s = .19 + j / shoots * .68 + hash(j, key + 41, seed) * .025;
      const a = curve(start, tip, s, bend);
      const alternate = j & 1 ? 1 : -1;
      const extension = (.16 + hash(j, key + 43, seed) * .15) * (1 - t * .50);
      const b = [a[0] + side * extension * (.47 + hash(j, key + 47, seed) * .32),
        a[1] + alternate * extension * .63 + .028,
        a[2] + (hash(j, key + 53, seed) - .5) * extension * .9];
      twig(a, b, .0035, key + j * 101 + 47, true, [side * .018, .028, 0]);
    }
  }
  twig(stemAt(.80), [.02, 2.31, .07], .005, 971, true, [.035, 0, -.024]);
  strokes.sort((a, b) => a.depth - b.depth);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.kind === 0) {
      g.beginPath();stroke.nodes.forEach((p, i) => {const xy = project(p);if(i)g.lineTo(...xy);else g.moveTo(...xy);});
      g.strokeStyle = gray(stroke.value);g.lineWidth = stroke.width * 376;g.stroke();
    } else {
      const a = project(stroke.a), b = project(stroke.b), dx = b[0]-a[0], dy=b[1]-a[1];
      const inverse = 1 / Math.max(.001, Math.hypot(dx,dy)), width = stroke.width * 188;
      const nx = -dy * inverse * width, ny = dx * inverse * width;
      const gradient = g.createLinearGradient(...a,...b);
      gradient.addColorStop(0,gray(stroke.value*.66));gradient.addColorStop(.36,gray(stroke.value));gradient.addColorStop(1,gray(stroke.value*.91));
      g.fillStyle = gradient;g.beginPath();g.moveTo(a[0]-nx*.35,a[1]-ny*.35);
      g.quadraticCurveTo(mix(a[0],b[0],.44)-nx,mix(a[1],b[1],.44)-ny,b[0],b[1]);
      g.quadraticCurveTo(mix(a[0],b[0],.44)+nx,mix(a[1],b[1],.44)+ny,a[0]+nx*.35,a[1]+ny*.35);g.closePath();g.fill();
    }
  }
}
