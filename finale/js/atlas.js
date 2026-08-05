// FINALE — sprite atlas. EVERY bullet sprite, including its glow halo, is baked ONCE at boot into a
// single offscreen canvas. At runtime a bullet costs exactly one drawImage with no state change.
//
// THE RULE THAT DECIDES WHETHER THIS GAME HITS 60fps:
//   never shadowBlur, never createRadialGradient, never arc()+fill() per bullet. Ever.
// Gradients are legal here because this file runs once.
window.Atlas = (() => {
  const CELL = 48, COLS = 32;
  const ROTS = 16;                    // rotation steps for directional shapes (22.5 deg apart)
  let cv = null, ctx = null;
  const sx = [], sy = [];             // flat cell index -> source pixel
  let next = 0;

  // reserve a run of `count` consecutive cells, return the first index
  function alloc(count) { const base = next; next += count; return base; }
  function cellXY(i) { return [(i % COLS) * CELL, ((i / COLS) | 0) * CELL]; }

  // slot bases, filled by bake()
  const S = { CIRCLE: 0, COMET: 0, AMBER: 0, PETAL0: 0, PETAL1: 0, PETAL2: 0, PEA: 0, SPARKLE: 0 };

  function radial(g, cx, cy, r, stops) {
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (let i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
    return grd;
  }

  // A lethal bullet: white pinpoint core, saturated body, soft halo. The white core is what makes a
  // magenta circle legible against a magenta curtain 40 bullets deep.
  function drawCircle(g, cx, cy, R, hex) {
    const rgb = U.hex2rgb(hex);
    g.fillStyle = radial(g, cx, cy, R * 2.4, [
      [0, U.rgba(rgb, 0.55)], [0.35, U.rgba(rgb, 0.22)], [1, U.rgba(rgb, 0)],
    ]);
    g.beginPath(); g.arc(cx, cy, R * 2.4, 0, U.TAU); g.fill();
    g.fillStyle = hex;
    g.beginPath(); g.arc(cx, cy, R, 0, U.TAU); g.fill();
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.arc(cx, cy, Math.max(1.2, R * 0.34), 0, U.TAU); g.fill();
  }

  // A petal: DIAMOND, pointing +x at rot 0. Shape-coded so the colour-blind read survives, and so a
  // 2000-bullet screen still separates "mine" from "lethal" at a glance.
  function drawDiamond(g, cx, cy, R, hex, ang) {
    const rgb = U.hex2rgb(hex);
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = radial(g, 0, 0, R * 2.6, [
      [0, U.rgba(rgb, 0.5)], [0.4, U.rgba(rgb, 0.18)], [1, U.rgba(rgb, 0)],
    ]);
    g.beginPath(); g.arc(0, 0, R * 2.6, 0, U.TAU); g.fill();
    g.fillStyle = hex;
    g.beginPath();
    g.moveTo(R * 1.75, 0); g.lineTo(0, R * 0.72); g.lineTo(-R * 0.85, 0); g.lineTo(0, -R * 0.72);
    g.closePath(); g.fill();
    g.fillStyle = '#FFFFFF'; g.globalAlpha = 0.85;
    g.beginPath();
    g.moveTo(R * 0.9, 0); g.lineTo(0, R * 0.3); g.lineTo(-R * 0.3, 0); g.lineTo(0, -R * 0.3);
    g.closePath(); g.fill();
    g.restore();
  }

  // Amber: TRIANGLE. Unconvertible, must be dodged. Distinct silhouette AND distinct hue, always.
  function drawTri(g, cx, cy, R, hex, ang) {
    const rgb = U.hex2rgb(hex);
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = radial(g, 0, 0, R * 2.4, [
      [0, U.rgba(rgb, 0.5)], [0.4, U.rgba(rgb, 0.18)], [1, U.rgba(rgb, 0)],
    ]);
    g.beginPath(); g.arc(0, 0, R * 2.4, 0, U.TAU); g.fill();
    g.fillStyle = hex;
    g.beginPath();
    g.moveTo(R * 1.6, 0); g.lineTo(-R, R * 1.0); g.lineTo(-R, -R * 1.0);
    g.closePath(); g.fill();
    g.restore();
  }

  // Your peashooter: a dim LINE. Deliberately the least interesting thing on screen — it is an
  // igniter, not a weapon, and it must never compete for attention with a fuse ring.
  function drawPea(g, cx, cy, R, hex, ang) {
    const rgb = U.hex2rgb(hex);
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = U.rgba(rgb, 0.30);
    g.fillRect(-R * 2.2, -R * 0.9, R * 4.4, R * 1.8);
    g.fillStyle = hex;
    g.fillRect(-R * 1.8, -R * 0.42, R * 3.6, R * 0.84);
    g.restore();
  }

  function drawComet(g, cx, cy, R, hex, ang) {
    const rgb = U.hex2rgb(hex);
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = radial(g, 0, 0, R * 2.6, [
      [0, U.rgba(rgb, 0.6)], [0.35, U.rgba(rgb, 0.25)], [1, U.rgba(rgb, 0)],
    ]);
    g.beginPath(); g.arc(0, 0, R * 2.6, 0, U.TAU); g.fill();
    g.fillStyle = U.rgba(rgb, 0.5);                       // baked tail, trailing -x
    g.beginPath(); g.moveTo(0, -R * 0.7); g.lineTo(-R * 2.4, 0); g.lineTo(0, R * 0.7); g.closePath(); g.fill();
    g.fillStyle = hex; g.beginPath(); g.arc(0, 0, R, 0, U.TAU); g.fill();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(0, 0, R * 0.4, 0, U.TAU); g.fill();
    g.restore();
  }

  function bakeSet(base, count, fn) {
    for (let k = 0; k < count; k++) {
      const i = base + k, [px, py] = cellXY(i);
      sx[i] = px; sy[i] = py;
      ctx.save();
      ctx.translate(px, py);
      fn(ctx, CELL / 2, CELL / 2, k / count * U.TAU);
      ctx.restore();
    }
  }

  function bake() {
    if (cv) return;
    const C = CFG.COL;
    const rows = 8;
    cv = document.createElement('canvas');
    cv.width = COLS * CELL; cv.height = rows * CELL;
    ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);

    // Non-directional shapes get 1 cell; directional shapes get ROTS cells.
    S.CIRCLE = alloc(1);  bakeSet(S.CIRCLE, 1, (g, cx, cy) => drawCircle(g, cx, cy, 7, C.danger));
    S.SPARKLE = alloc(1); bakeSet(S.SPARKLE, 1, (g, cx, cy) => drawCircle(g, cx, cy, 4, '#FFFFFF'));
    next = COLS * 1;                                  // start each directional set on a fresh row for clarity
    S.COMET = alloc(ROTS);  bakeSet(S.COMET, ROTS, (g, cx, cy, a) => drawComet(g, cx, cy, 8, C.danger, a));
    next = COLS * 2;
    S.AMBER = alloc(ROTS);  bakeSet(S.AMBER, ROTS, (g, cx, cy, a) => drawTri(g, cx, cy, 7, C.amber, a));
    next = COLS * 3;
    S.PETAL0 = alloc(ROTS); bakeSet(S.PETAL0, ROTS, (g, cx, cy, a) => drawDiamond(g, cx, cy, 6.5, C.mineA, a));
    next = COLS * 4;
    S.PETAL1 = alloc(ROTS); bakeSet(S.PETAL1, ROTS, (g, cx, cy, a) => drawDiamond(g, cx, cy, 6.5, C.mineB, a));
    next = COLS * 5;
    S.PETAL2 = alloc(ROTS); bakeSet(S.PETAL2, ROTS, (g, cx, cy, a) => drawDiamond(g, cx, cy, 6.5, C.mineC, a));
    next = COLS * 6;
    S.PEA = alloc(ROTS);    bakeSet(S.PEA, ROTS, (g, cx, cy, a) => drawPea(g, cx, cy, 4, C.pea, a));
  }

  // Runtime lookup. `rot` is an angle in radians; quantised to ROTS steps.
  // atan2 returns -PI..PI, and `+0.5 | 0` truncates toward zero — which is NOT rounding for negatives,
  // so every upward-moving bullet (vy<0) got a sprite one 22.5deg step off. Normalise to 0..TAU first
  // so the +0.5 truncation is a true round. This straightened every peashooter line and the top half
  // of every amber/petal spread.
  const rotIdx = (ang) => {
    if (ang < 0) ang += U.TAU;
    let k = ((ang / U.TAU) * ROTS + 0.5) | 0;
    k %= ROTS; if (k < 0) k += ROTS;
    return k;
  };
  // base cell for a (type, stage) pair — game inlines this into its draw loop
  function base(type, stage) {
    const T = Pool.T;
    switch (type) {
      case T.CIRCLE: return S.CIRCLE;
      case T.COMET: return S.COMET;
      case T.AMBER: return S.AMBER;
      case T.PETAL: return stage >= 2 ? S.PETAL2 : (stage === 1 ? S.PETAL1 : S.PETAL0);
      case T.PEA: return S.PEA;
      default: return S.SPARKLE;
    }
  }
  const directional = (type) => type !== Pool.T.CIRCLE && type !== Pool.T.SPARKLE;
  // The core radius each type was baked at, indexed by Pool.T. The draw loop scales a bullet by
  // r / BAKE_R[type] so a single baked cell serves every size that type ever takes.
  const BAKE_R = [7, 8, 7, 6.5, 4, 4];

  return {
    bake, CELL, ROTS, S, rotIdx, base, directional, BAKE_R,
    get canvas() { return cv; },
    sx, sy,
  };
})();
