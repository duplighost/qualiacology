import * as THREE from 'three';

// visions.js — THE HALLUCINATIONS, painted rather than built.
//
// ALEX, 2026-09-21: "we need more hallucinatory visuals in the woods. like you'll see a
// beautiful oasis with beautiful women and it would be a hallucination. a few things like
// that. but variety. you can't get the same one too often. It doesn't even have to be really
// something you build in a way. almost like a hazy video would look like its there in the
// distance."
//
// So none of this is built. Each vision is a PICTURE, painted once at boot into one atlas,
// and shown on a single camera-facing quad seventy metres into the trees. That is the whole
// trick, and it is the right one twice over: a thing you can never reach does not have to
// survive being walked up to, and a picture through that much night air is exactly what the
// eye expects a lie to look like. The cost is one draw and one program.
//
// WHY AN ATLAS AND NOT SIX TEXTURES. dread.js's own law is that every material it owns
// shares one program cache key, and three puts `map` in that key: six maps would still be
// one program, but six textures is six uploads and six things to dispose. One 2048 atlas of
// 512 px cells is a single upload, and switching vision is two numbers on map.offset.
//
// HOW THEY ARE PAINTED, and it is not "draw a palm tree". At seventy metres through haze a
// vision is a SILHOUETTE and a COLOUR TEMPERATURE and nothing else survives. So every cell
// is built the same way: a warm or cold ground glow, a few big dark shapes with soft edges,
// figures as simple standing forms, and a radial alpha falloff that has no edge anywhere -
// a hard border is the one thing that would say "quad". The palette is deliberately warmer
// and brighter than the county: DREAD_TABLE's note already allows it, "a lie is allowed to
// be brighter than the sky; it is the only thing here that is".
export const CELL = 512;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 2;

/**
 * The roster. `sound` must be a name dread.js's BEAT_SOUNDS already carries - a vision that
 * asks for a sound nobody baked is a silent vision, and answer() drops it. `near` is the
 * metres at which the lie gives up rather than let you resolve it.
 */
export const VISIONS = Object.freeze([
  { id: 'oasis',   sound: 'shore',  warm: 1.00, near: 34, hold: [7, 11] },
  { id: 'bathers', sound: 'giggle', warm: 0.96, near: 38, hold: [6, 9] },
  { id: 'window',  sound: 'call',   warm: 0.88, near: 30, hold: [8, 13] },
  { id: 'bonfire', sound: 'giggle', warm: 1.00, near: 32, hold: [7, 11] },
  { id: 'meadow',  sound: 'call',   warm: 0.70, near: 36, hold: [8, 12] },
  { id: 'lake',    sound: 'shore',  warm: 0.30, near: 30, hold: [9, 14] },
]);

/* ------------------------------------------------------------------ painting -- */

function soft(g, x, y, r, inner, outer) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

/** A standing figure: a head, shoulders that fall into a hem. Read at 70 m, not up close. */
function figure(g, x, groundY, h, fill) {
  const w = h * 0.19;
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, groundY - h * 0.90, w * 0.52, 0, Math.PI * 2);   // head
  g.fill();
  g.beginPath();
  g.moveTo(x - w * 0.42, groundY - h * 0.80);
  g.quadraticCurveTo(x - w * 0.95, groundY - h * 0.30, x - w * 0.78, groundY);
  g.lineTo(x + w * 0.78, groundY);
  g.quadraticCurveTo(x + w * 0.95, groundY - h * 0.30, x + w * 0.42, groundY - h * 0.80);
  g.closePath();
  g.fill();
}

/** A trunk silhouette with a soft crown, for the frames that need woodland in front. */
function trunk(g, x, baseY, h, w, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(x - w * 0.5, baseY);
  g.lineTo(x - w * 0.34, baseY - h);
  g.lineTo(x + w * 0.34, baseY - h);
  g.lineTo(x + w * 0.5, baseY);
  g.closePath();
  g.fill();
}

const PAINT = {
  // Warm water under low palms, lit from the far side so everything near is a silhouette.
  oasis(g, S) {
    soft(g, S * 0.5, S * 0.62, S * 0.52, 'rgba(255,214,150,0.95)', 'rgba(150,96,40,0)');
    g.fillStyle = 'rgba(255,236,196,0.55)';
    g.beginPath(); g.ellipse(S * 0.5, S * 0.70, S * 0.31, S * 0.075, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 5; i++) {
      const x = S * (0.14 + i * 0.18), h = S * (0.42 + (i % 3) * 0.075);
      trunk(g, x, S * 0.66, h, S * 0.022, 'rgba(24,16,10,0.88)');
      for (let f = 0; f < 5; f++) {
        const a = -0.5 + f * 0.52;
        g.strokeStyle = 'rgba(24,16,10,0.86)'; g.lineWidth = S * 0.018;
        g.beginPath();
        g.moveTo(x, S * 0.66 - h);
        g.quadraticCurveTo(x + Math.cos(a) * S * 0.09, S * 0.66 - h - S * 0.05,
          x + Math.cos(a) * S * 0.21, S * 0.66 - h + Math.abs(Math.sin(a)) * S * 0.048);
        g.stroke();
      }
    }
  },
  // The one he asked for. Figures in the shallows, lit from behind, no faces at this range.
  bathers(g, S) {
    soft(g, S * 0.5, S * 0.58, S * 0.50, 'rgba(255,206,164,0.95)', 'rgba(128,70,44,0)');
    g.fillStyle = 'rgba(255,230,200,0.50)';
    g.beginPath(); g.ellipse(S * 0.5, S * 0.72, S * 0.34, S * 0.08, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 4; i++) {
      const x = S * (0.28 + i * 0.145), h = S * (0.33 + ((i * 7) % 3) * 0.040);
      figure(g, x, S * 0.73 - (i % 2) * S * 0.014, h, 'rgba(26,15,11,0.84)');
    }
    trunk(g, S * 0.10, S * 0.74, S * 0.44, S * 0.030, 'rgba(18,12,9,0.90)');
    trunk(g, S * 0.90, S * 0.74, S * 0.40, S * 0.026, 'rgba(18,12,9,0.90)');
  },
  // A lit window where the county has no house. The warmest thing in the game.
  window(g, S) {
    soft(g, S * 0.5, S * 0.55, S * 0.42, 'rgba(255,198,120,0.80)', 'rgba(120,60,20,0)');
    g.fillStyle = 'rgba(28,22,18,0.92)';
    g.fillRect(S * 0.24, S * 0.38, S * 0.52, S * 0.40);
    g.beginPath();
    g.moveTo(S * 0.19, S * 0.38); g.lineTo(S * 0.50, S * 0.18); g.lineTo(S * 0.81, S * 0.38);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,214,150,0.96)';
    g.fillRect(S * 0.41, S * 0.47, S * 0.18, S * 0.20);
    g.fillStyle = 'rgba(28,22,18,0.92)';
    g.fillRect(S * 0.497, S * 0.47, S * 0.008, S * 0.20);
    g.fillRect(S * 0.41, S * 0.562, S * 0.18, S * 0.008);
    trunk(g, S * 0.12, S * 0.80, S * 0.52, S * 0.034, 'rgba(14,11,9,0.92)');
    trunk(g, S * 0.88, S * 0.80, S * 0.48, S * 0.030, 'rgba(14,11,9,0.92)');
  },
  // A fire with people round it, which is the loneliest of the six.
  bonfire(g, S) {
    soft(g, S * 0.5, S * 0.60, S * 0.40, 'rgba(255,186,96,0.92)', 'rgba(130,52,16,0)');
    soft(g, S * 0.5, S * 0.58, S * 0.13, 'rgba(255,244,214,0.98)', 'rgba(255,170,70,0)');
    for (let i = 0; i < 5; i++) {
      const a = 0.45 + i * 0.52;
      const x = S * 0.5 + Math.cos(a) * S * 0.33;
      const h = S * (0.28 + ((i * 5) % 3) * 0.032);
      figure(g, x, S * 0.74 + Math.sin(a) * S * 0.025, h, 'rgba(18,10,8,0.88)');
    }
    trunk(g, S * 0.07, S * 0.82, S * 0.56, S * 0.036, 'rgba(12,10,8,0.94)');
    trunk(g, S * 0.93, S * 0.82, S * 0.52, S * 0.032, 'rgba(12,10,8,0.94)');
  },
  // DAYLIGHT. Nothing in the county is allowed this and that is the whole point of it.
  meadow(g, S) {
    soft(g, S * 0.5, S * 0.40, S * 0.56, 'rgba(226,226,196,0.90)', 'rgba(120,124,90,0)');
    g.fillStyle = 'rgba(178,176,116,0.62)';
    g.beginPath();
    g.moveTo(0, S * 0.74);
    g.quadraticCurveTo(S * 0.5, S * 0.64, S, S * 0.74);
    g.lineTo(S, S); g.lineTo(0, S); g.closePath(); g.fill();
    for (let i = 0; i < 9; i++) {
      const x = S * (0.06 + i * 0.11), h = S * (0.10 + ((i * 3) % 4) * 0.035);
      trunk(g, x, S * 0.70, h, S * 0.012, 'rgba(70,72,48,0.55)');
    }
    figure(g, S * 0.46, S * 0.76, S * 0.26, 'rgba(52,52,40,0.68)');
  },
  // Still water and a boat nobody is in. The only cold one, so the set is not all firelight.
  lake(g, S) {
    soft(g, S * 0.5, S * 0.36, S * 0.50, 'rgba(176,202,236,0.72)', 'rgba(52,70,104,0)');
    g.fillStyle = 'rgba(150,182,226,0.40)';
    g.beginPath();
    g.moveTo(0, S * 0.58); g.lineTo(S, S * 0.58); g.lineTo(S, S); g.lineTo(0, S);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(206,226,252,0.42)';
    for (let i = 0; i < 7; i++) {
      g.fillRect(S * (0.42 - i * 0.008), S * (0.60 + i * 0.045), S * (0.16 + i * 0.016), S * 0.008);
    }
    g.fillStyle = 'rgba(18,22,30,0.88)';
    g.beginPath();
    g.moveTo(S * 0.33, S * 0.68); g.quadraticCurveTo(S * 0.50, S * 0.77, S * 0.67, S * 0.68);
    g.lineTo(S * 0.61, S * 0.655); g.quadraticCurveTo(S * 0.50, S * 0.725, S * 0.39, S * 0.655);
    g.closePath(); g.fill();
    trunk(g, S * 0.08, S * 0.72, S * 0.46, S * 0.030, 'rgba(10,14,20,0.92)');
    trunk(g, S * 0.92, S * 0.72, S * 0.42, S * 0.026, 'rgba(10,14,20,0.92)');
  },
};

/**
 * Paint every vision into one atlas and return the texture. Offscreen-safe: without a DOM
 * this returns a 1x1 transparent texture and the beat simply never reads anything, which is
 * what every headless CPU suite in this project needs.
 */
export function buildVisionAtlas() {
  if (typeof document === 'undefined' || !document.createElement) {
    const data = new Uint8Array(4);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }
  const W = CELL * ATLAS_COLS, H = CELL * ATLAS_ROWS;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, W, H);
  for (let i = 0; i < VISIONS.length; i++) {
    const col = i % ATLAS_COLS, row = (i / ATLAS_COLS) | 0;
    g.save();
    g.translate(col * CELL, row * CELL);
    g.beginPath(); g.rect(0, 0, CELL, CELL); g.clip();
    const paint = PAINT[VISIONS[i].id];
    if (paint) paint(g, CELL);
    // THE FALLOFF, and it is the difference between a vision and a poster. Every cell is
    // multiplied by a radial alpha that reaches zero well inside its own edge, so the quad
    // has no border anywhere and the picture simply stops being there.
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createRadialGradient(CELL * 0.5, CELL * 0.55, CELL * 0.10,
      CELL * 0.5, CELL * 0.55, CELL * 0.50);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.62, 'rgba(0,0,0,0.85)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, CELL, CELL);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** The atlas offset for one vision index, for map.offset. repeat is 1/cols, 1/rows. */
export function cellOffset(i) {
  const col = i % ATLAS_COLS, row = (i / ATLAS_COLS) | 0;
  // three's texture origin is bottom-left; the canvas painted top-down.
  return { x: col / ATLAS_COLS, y: (ATLAS_ROWS - 1 - row) / ATLAS_ROWS };
}
