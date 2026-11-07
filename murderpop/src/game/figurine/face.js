// The painted face: brows, liner, lashes, shadow, blush, lipstick, beauty marks and mascara streaks,
// drawn once into a canvas laid over the face's UV island (a planar front projection). Features are
// placed from the body analysis: eye-socket rims and the lip outline come from the mesh itself, so
// the paint sits exactly on the sculpt. Expressions don't repaint: the skin under the paint moves
// (see figExpress in glaze.js) and the lids are painted on the eyeballs.
import * as THREE from 'three';

const S = 1024;

export const FACE_DEFAULT = {
  brows: { color: '#2a1712', shape: 'arch', thick: 1, lift: 0 },
  liner: { color: '#0b0706', thick: 1, wing: 0.7 },
  lashes: { color: '#0b0706', n: 9, len: 1, lower: 0.5 },
  shadow: { color: '#8c5a6e', amount: 0.55 },
  lips: { color: '#b0182e', shape: 'natural', line: 0.35, gloss: 0.35 },
  blush: { color: '#ff6f86', amount: 0.32 },
  streaks: null,    // { color, n, len }
  marks: [],        // [{ at: 'cheek'|'lip'|'eye', side: 1|-1, r }]
  freckles: 0,
};

const merge = (a, b) => { const o = { ...a }; for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] ? { ...a[k], ...b[k] } : b[k]; return o; };

export function paintFace(I, spec = {}) {
  const f = merge(FACE_DEFAULT, spec || {});
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d');
  const R = I.faceRect;
  const P = (u, v) => [(u - R[0]) / (R[2] - R[0]) * S, (v - R[1]) / (R[3] - R[1]) * S];
  const X = (x, y) => P(...I.toUV(x, y));                        // bind-space face point -> canvas px
  const pxPerM = Math.abs(X(0.01, 0)[0] - X(0, 0)[0]) * 100;     // canvas px per metre
  const side = I.side;
  const eyes = ['l', 'r'].map((s) => ({ s, e: I.EYE[s], rim: I.rims[s], out: s === 'l' ? side : -side }));
  const c = (hex, a = 1) => { const k = new THREE.Color(hex); return `rgba(${Math.round(k.r * 255)},${Math.round(k.g * 255)},${Math.round(k.b * 255)},${a})`; };

  // ---- blush (soft, under everything)
  if (f.blush && f.blush.amount > 0) {
    for (const { e, out } of eyes) {
      const [x, y] = X(e.c.x + out * 0.012, e.c.y - 0.034);
      const r = 0.03 * pxPerM;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c(f.blush.color, f.blush.amount)); g.addColorStop(1, c(f.blush.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
    const [nx, ny] = X(0, I.MOUTH.y + 0.034); const nr = 0.01 * pxPerM;
    const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr); g.addColorStop(0, c(f.blush.color, f.blush.amount * 0.5)); g.addColorStop(1, c(f.blush.color, 0));
    ctx.fillStyle = g; ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
  }
  // ---- freckles
  if (f.freckles) {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const { e, out } of eyes) for (let i = 0; i < 26 * f.freckles; i++) {
      const [x, y] = X(e.c.x + out * (rnd() * 0.03 - 0.008), e.c.y - 0.022 - rnd() * 0.02);
      ctx.fillStyle = c('#7a3b2a', 0.35 + rnd() * 0.3); ctx.beginPath(); ctx.arc(x, y, 1 + rnd() * 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  // ---- eyeshadow: a soft wash from the upper rim toward the brow, heavier at the outer corner
  if (f.shadow && f.shadow.amount > 0) {
    ctx.save(); ctx.filter = `blur(${Math.round(0.0035 * pxPerM)}px)`;
    for (const { e, rim, out } of eyes) {
      if (!rim) continue;
      const up = upperRim(rim);
      ctx.beginPath();
      up.forEach((p, i) => { const [x, y] = P(p.u, p.v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      for (let i = up.length - 1; i >= 0; i--) {
        const p = up[i];
        const k = (rimX(p, I) - e.c.x) * out / 0.018; // -1 inner .. 1 outer
        const lift = 0.009 + 0.006 * Math.max(0, k);
        const [x, y] = X(rimX(p, I) + out * 0.003 * Math.max(0, k), rimY(p, I) + lift);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      const [cx, cy] = X(e.c.x + out * 0.012, e.c.y + 0.008);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.026 * pxPerM);
      g.addColorStop(0, c(f.shadow.color, f.shadow.amount)); g.addColorStop(1, c(f.shadow.color, f.shadow.amount * 0.35));
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.restore();
  }
  // ---- brows
  if (f.brows) {
    const b = f.brows;
    for (const { e, out } of eyes) {
      const shape = BROW[b.shape] || BROW.arch;
      const pts = shape.map(([dx, dy]) => X(e.c.x + out * dx, e.c.y + dy + (b.lift || 0)));
      const thick = 0.0032 * pxPerM * (b.thick ?? 1);
      taperedStroke(ctx, smoothPath(pts, 10), (t) => thick * (t < 0.15 ? 0.7 + 2 * t : 1 - 0.85 * Math.pow((t - 0.15) / 0.85, 1.6)), c(b.color, 0.92));
      // fine hair strokes for a hand-painted edge
      ctx.strokeStyle = c(b.color, 0.5); ctx.lineWidth = 1.2;
      const path = smoothPath(pts, 18);
      for (let i = 1; i < path.length - 1; i++) {
        const [x, y] = path[i]; const [x2, y2] = path[i + 1]; const ang = Math.atan2(y2 - y, x2 - x);
        const len = thick * 1.3; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * len * 0.3, y + thick * 0.4); ctx.lineTo(x + Math.cos(ang - 0.5 * out) * len, y - thick * 0.7); ctx.stroke();
      }
    }
  }
  // ---- liner, wing and lashes on the upper rim
  for (const { e, rim, out } of eyes) {
    if (!rim) continue;
    const up = upperRim(rim);
    const pts = up.map((p) => P(p.u, p.v));
    // order inner -> outer
    if ((rimX(up[0], I) - e.c.x) * out > 0) { pts.reverse(); up.reverse(); }
    const n = pts.length;
    if (f.liner && f.liner.thick > 0) {
      const lt = 0.0016 * pxPerM * f.liner.thick;
      const path = [...pts];
      // the wing: out and up from the outer corner
      const wing = f.liner.wing ?? 0.6;
      if (wing > 0) {
        const last = up[up.length - 1];
        const [wx, wy] = X(rimX(last, I) + out * 0.011 * wing, rimY(last, I) + 0.0065 * wing);
        path.push([wx, wy]);
      }
      taperedStroke(ctx, smoothPath(path, 6), (t) => lt * (0.35 + 1.4 * t) * (t > 0.88 ? (1 - t) / 0.12 : 1), c(f.liner.color, 1), true);
    }
    if (f.lashes && f.lashes.n > 0) {
      const L = f.lashes;
      ctx.strokeStyle = c(L.color, 1); ctx.lineCap = 'round';
      for (let i = 0; i < L.n; i++) {
        const t = (i + 0.5) / L.n;
        const k = Math.min(n - 1, Math.floor(t * (n - 1)));
        const [x, y] = pts[k];
        const [ex, ey] = P(...I.toUV(e.c.x, e.c.y));
        let dx = x - ex, dy = y - ey; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const len = 0.0042 * pxPerM * (L.len ?? 1) * (0.55 + 0.75 * t);
        const curl = out * (side > 0 ? 1 : 1) * 0.6;
        ctx.lineWidth = 2.4 * (1 - t * 0.3);
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + dx * len * 0.6, y + dy * len * 0.6 - len * 0.2, x + (dx + out * 0.35 * t) * len, y + (dy - 0.55) * len);
        ctx.stroke();
      }
      // lower lashes: a few short ticks under the outer half
      if (L.lower > 0) {
        const low = lowerRim(rim); if ((rimX(low[0], I) - e.c.x) * out > 0) low.reverse();
        const m = Math.max(2, Math.round(5 * L.lower));
        ctx.lineWidth = 1.4;
        for (let i = 0; i < m; i++) {
          const t = 0.45 + 0.5 * (i + 0.5) / m;
          const p = low[Math.min(low.length - 1, Math.floor(t * (low.length - 1)))];
          const [x, y] = P(p.u, p.v);
          const len = 0.0018 * pxPerM;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + out * len * 0.4, y + len); ctx.stroke();
        }
      }
    }
  }
  // ---- mascara streaks: graphic, deliberate, running from the lower lid
  if (f.streaks) {
    const st = f.streaks;
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const { e, out } of eyes) {
      for (let i = 0; i < (st.n ?? 2); i++) {
        const x0 = e.c.x + out * (-0.004 + i * 0.009), y0 = e.c.y - e.r * 0.62;
        const len = (st.len ?? 1) * (0.03 + 0.022 * rnd());
        const pts = [];
        for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(X(x0 + out * 0.004 * Math.sin(t * 3 + i) * t, y0 - len * t)); }
        const w = 0.0016 * pxPerM;
        taperedStroke(ctx, pts, (t) => w * (1 - 0.65 * t), c(st.color || '#050404', 0.95));
        const [dx, dy] = pts[pts.length - 1];
        ctx.fillStyle = c(st.color || '#050404', 0.95); ctx.beginPath(); ctx.ellipse(dx, dy + w * 0.6, w * 0.55, w * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // ---- lips, from the mesh's own lip outline
  if (f.lips && I.lips && I.lips.cols.length > 4) {
    const L = f.lips, cols = I.lips.cols;
    const [cu] = I.lips.center;
    const halfU = (cols[cols.length - 1].u - cols[0].u) / 2;
    const shape = (col, edge) => {
      const t = (col.u - cu) / halfU; // -1..1
      let top = col.top, bot = col.bot;
      const mid = I.lips.center[1];
      if (L.shape === 'heart') { top -= (Math.exp(-Math.pow((Math.abs(t) - 0.32) / 0.22, 2)) * 0.0035 - 0.0012 * t * t); bot += 0.0015 * (1 - t * t); }
      if (L.shape === 'overdrawn') { top -= 0.0018 * (1 - t * t); bot += 0.0022 * (1 - t * t); }
      if (L.shape === 'thin') { top = mid - (mid - top) * 0.6; bot = mid + (bot - mid) * 0.6; }
      if (L.shape === 'pout') { bot += 0.002 * (1 - t * t); }
      return edge === 'top' ? top : bot;
    };
    ctx.save();
    ctx.beginPath();
    cols.forEach((col, i) => { const [x, y] = P(col.u, shape(col, 'top')); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    for (let i = cols.length - 1; i >= 0; i--) { const [x, y] = P(cols[i].u, shape(cols[i], 'bot')); ctx.lineTo(x, y); }
    ctx.closePath();
    ctx.fillStyle = c(L.color, 1); ctx.fill();
    ctx.clip();
    // shading: darker at the parting line and the corners, a lit band across the lower lip
    const [, my] = P(cu, I.lips.center[1]);
    ctx.globalCompositeOperation = 'source-atop';
    const k = new THREE.Color(L.color);
    const dark = `rgba(${Math.round(k.r * 90)},${Math.round(k.g * 60)},${Math.round(k.b * 60)},${L.line ?? 0.35})`;
    ctx.strokeStyle = dark; ctx.lineWidth = 0.0014 * pxPerM;
    ctx.beginPath(); cols.forEach((col, i) => { const [x] = P(col.u, 0); i ? ctx.lineTo(x, my) : ctx.moveTo(x, my); }); ctx.stroke();
    const [lx0] = P(cols[0].u, 0), [lx1] = P(cols[cols.length - 1].u, 0);
    const g = ctx.createLinearGradient(lx0, 0, lx1, 0);
    g.addColorStop(0, dark); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fillRect(lx0 - 10, 0, lx1 - lx0 + 20, S);
    const hy = my + 0.0035 * pxPerM;
    const g2 = ctx.createRadialGradient((lx0 + lx1) / 2, hy, 0, (lx0 + lx1) / 2, hy, (lx1 - lx0) * 0.3);
    g2.addColorStop(0, `rgba(255,255,255,${(L.gloss ?? 0.3) * 0.5})`); g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2; ctx.fillRect(lx0, my, lx1 - lx0, 0.01 * pxPerM);
    ctx.restore();
  }
  // ---- beauty marks
  for (const m of f.marks || []) {
    const s = (m.side ?? 1) * side;
    const at = m.at === 'lip' ? [s * (I.MOUTH.halfW + 0.006), I.MOUTH.y + 0.008] : m.at === 'eye' ? [I.EYE.l.c.x * s / side + s * 0.016, I.EYE.l.c.y - 0.016] : [s * 0.04, I.MOUTH.y + 0.02];
    const [x, y] = X(at[0], at[1]);
    ctx.fillStyle = c(m.color || '#1a0d0a', 1); ctx.beginPath(); ctx.arc(x, y, (m.r ?? 0.0014) * pxPerM, 0, Math.PI * 2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.premultiplyAlpha = true;
  tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return { texture: tex, canvas: cv, spec: f };
}

const BROW = {
  // [outward offset from the eye centre, height above it] in metres, inner -> outer
  arch: [[-0.016, 0.0175], [-0.006, 0.0225], [0.006, 0.0262], [0.015, 0.0245], [0.024, 0.0175]],
  straight: [[-0.016, 0.0185], [-0.004, 0.021], [0.008, 0.0222], [0.017, 0.021], [0.025, 0.0165]],
  thin: [[-0.014, 0.019], [-0.003, 0.0245], [0.008, 0.0275], [0.017, 0.025], [0.024, 0.0185]],
  high: [[-0.015, 0.021], [-0.004, 0.0275], [0.007, 0.031], [0.016, 0.0285], [0.024, 0.021]],
  angry: [[-0.016, 0.0135], [-0.006, 0.0185], [0.005, 0.0235], [0.015, 0.0255], [0.024, 0.0215]],
};

function rimX(p) { return p.x; }
function rimY(p) { return p.y; }
function upperRim(rim) { return rim.upper.slice().sort((a, b) => a.u - b.u); }
function lowerRim(rim) { return rim.lower.slice().sort((a, b) => a.u - b.u); }

// Catmull-Rom through the points
function smoothPath(pts, per = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// a filled stroke whose width follows w(t), t = 0..1 along the path
function taperedStroke(ctx, path, w, style, sharpEnd) {
  const n = path.length; if (n < 2) return;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const hw = Math.max(0.3, w(i / (n - 1)) / 2);
    L.push([path[i][0] - dy * hw, path[i][1] + dx * hw]); R.push([path[i][0] + dy * hw, path[i][1] - dx * hw]);
  }
  ctx.fillStyle = style; ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// Expressions: targets for the face uniforms. jaw/smile/pucker/brows drive vertex displacement,
// lids/iris drive the painted eyeballs. Values blend smoothly (see figurine.js).
export const EXPRESSIONS = {
  neutral: { jaw: 0.0, smileL: 0.0, smileR: 0.0, pucker: 0.0, browIL: 0, browOL: 0, browIR: 0, browOR: 0, sneer: 0, pout: 0, cheek: 0, lidT: 0.18, lidB: 0.0, happy: 0, iris: 1, pupil: 1, gazeY: 0 },
  smug: { jaw: 0.0, smileL: 0.85, smileR: 0.1, pucker: 0.0, browIL: 0.1, browOL: 0.75, browIR: -0.2, browOR: 0.1, sneer: 0.0, pout: 0, cheek: 0.3, lidT: 0.5, lidB: 0.18, happy: 0, iris: 1, pupil: 0.9, gazeY: -0.05 },
  fury: { jaw: 0.28, smileL: -0.45, smileR: -0.45, pucker: 0.0, browIL: -1.0, browOL: 0.45, browIR: -1.0, browOR: 0.45, sneer: 0.9, pout: 0, cheek: 0.2, lidT: 0.34, lidB: 0.28, happy: 0, iris: 0.95, pupil: 0.6, gazeY: 0.0 },
  shock: { jaw: 0.78, smileL: -0.15, smileR: -0.15, pucker: 0.35, browIL: 1.0, browOL: 0.8, browIR: 1.0, browOR: 0.8, sneer: 0, pout: 0, cheek: 0, lidT: -0.12, lidB: 0.0, happy: 0, iris: 0.88, pupil: 0.45, gazeY: 0.0 },
  delight: { jaw: 0.32, smileL: 1.0, smileR: 1.0, pucker: 0.0, browIL: 0.45, browOL: 0.25, browIR: 0.45, browOR: 0.25, sneer: 0, pout: 0, cheek: 0.9, lidT: 1.0, lidB: 0.55, happy: 1.0, iris: 1, pupil: 1, gazeY: 0.0 },
  pout: { jaw: 0.05, smileL: -0.6, smileR: -0.6, pucker: 0.85, browIL: 0.85, browOL: -0.3, browIR: 0.85, browOR: -0.3, sneer: 0, pout: 1.0, cheek: 0, lidT: 0.32, lidB: 0.1, happy: 0, iris: 1.05, pupil: 1.15, gazeY: -0.12 },
  hurt: { jaw: 0.45, smileL: -0.4, smileR: -0.5, pucker: 0.1, browIL: 0.9, browOL: -0.4, browIR: 0.9, browOR: -0.4, sneer: 0.2, pout: 0.2, cheek: 0, lidT: 0.55, lidB: 0.35, happy: 0, iris: 1, pupil: 0.7, gazeY: 0.05 },
  sing: { jaw: 0.0, smileL: 0.25, smileR: 0.25, pucker: 0.1, browIL: 0.35, browOL: 0.2, browIR: 0.35, browOR: 0.2, sneer: 0, pout: 0, cheek: 0.2, lidT: 0.38, lidB: 0.05, happy: 0, iris: 1, pupil: 1, gazeY: 0.02 },
};
