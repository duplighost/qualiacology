// Pretty Until Proven Guilty: the newspaper. The front page is pasted over the courtroom's doors
// at the end of the red hall, CRIME OF THE CENTURY on it while it's sung, and on the chorus's
// first beat she goes through it. The sheet splits up a ragged line from where she hits, the
// middle goes to scraps that fly on with her and flutter down, the two halves whip open into the
// courtroom on the door frame and hang there flapping, and the rip is heard on that beat, under
// the band. After it the press: front pages coming down through the courtroom in the choruses.

import * as THREE from 'three';
import { prepare, floorAt } from './trail.js';
import { seeded } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- the front page ----------
const PAGES = {};
export function ppgFrontPage(head = 'CRIME OF\nTHE CENTURY', deck = '') {
  const key = head + '|' + deck;
  if (PAGES[key]) return PAGES[key];
  const W = 1024, H = 1126, M = 34;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), R = seeded(97);
  const ink = '#141418', grey = '#56565c';
  // newsprint, a little uneven, the fibres in it
  g.fillStyle = '#ece5d1'; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 1400; k++) { g.fillStyle = R() < 0.5 ? 'rgba(110,90,60,0.05)' : 'rgba(255,255,248,0.07)'; g.fillRect(R() * W, R() * H, 2 + R() * 30, 1 + R() * 2); }
  // the masthead: heavy rules, a name in blackletter you never quite read, the scales in the middle
  g.fillStyle = ink; g.fillRect(M, 26, W - 2 * M, 10); g.fillRect(M, 42, W - 2 * M, 3);
  g.strokeStyle = ink; g.lineCap = 'butt';
  for (let x = M + 26; x < W - M - 40;) {
    if (Math.abs(x - W / 2) < 62) { x += 14; continue; }
    const h = 50 + R() * 8, y1 = 128, y0 = y1 - h;
    g.lineWidth = 9; g.beginPath(); g.moveTo(x, y0 + 8); g.lineTo(x, y1); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(x - 6, y0 + 12); g.lineTo(x + 2, y0); g.lineTo(x + 10, y0 + 8); g.stroke();
    const kind = R();
    if (kind < 0.45) { g.lineWidth = 7; g.beginPath(); g.moveTo(x, y0 + 14); g.quadraticCurveTo(x + 22, y0 + 20, x + 18, y1 - 8); g.lineTo(x + 6, y1); g.stroke(); x += 34; }
    else if (kind < 0.75) { g.lineWidth = 9; g.beginPath(); g.moveTo(x + 16, y0 + 12); g.lineTo(x + 16, y1); g.stroke(); x += 30; }
    else x += 18;
    x += 8 + R() * 6;
  }
  // the seal: scales in a ring
  const cx = W / 2, cy = 88;
  g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 40, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy - 28); g.lineTo(cx, cy + 26); g.moveTo(cx - 26, cy - 14); g.lineTo(cx + 26, cy - 14); g.stroke();
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * 26, cy - 14); g.lineTo(cx + sx * 34, cy + 6); g.lineTo(cx + sx * 18, cy + 6); g.closePath(); g.stroke(); g.beginPath(); g.arc(cx + sx * 26, cy + 6, 9, 0, Math.PI); g.fill(); }
  g.fillRect(cx - 14, cy + 24, 28, 5);
  // the date line, too small to read, between rules
  g.fillRect(M, 142, W - 2 * M, 3);
  g.fillStyle = grey; for (let x = M + 6; x < W - M - 40; x += 30 + R() * 40) g.fillRect(x, 150, 14 + R() * 30, 7);
  g.fillStyle = ink; g.fillRect(M, 166, W - 2 * M, 7);
  // the headline: his line, as big as the page will take it
  const lines = head.split('\n');
  let size = 230;
  const font = (s) => `900 ${s}px Georgia, "Times New Roman", "Liberation Serif", serif`;
  g.font = font(size);
  while (Math.max(...lines.map((l) => g.measureText(l).width)) > W - 2 * M - 24 && size > 60) { size -= 4; g.font = font(size); }
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = ink;
  let y = 182 + size * 0.86;
  for (const l of lines) { g.fillText(l, W / 2, y); y += size * 0.98; }
  y -= size * 0.98;
  // the rest of the line under it, smaller
  if (deck) {
    let ds = 64; const df = (s) => `italic 700 ${s}px Georgia, "Times New Roman", "Liberation Serif", serif`; g.font = df(ds);
    while (g.measureText(deck).width > W - 2 * M - 40 && ds > 24) { ds -= 2; g.font = df(ds); }
    y += 26 + ds; g.fillText(deck, W / 2, y);
  }
  y += 24; g.fillRect(M, y, W - 2 * M, 4); y += 18;
  // her picture: the mugshot, the height chart behind her, in halftone
  const px = M, pw = 500, ph = Math.min(430, H - y - 120), py = y;
  g.fillStyle = '#a49e92'; g.fillRect(px, py, pw, ph);
  g.strokeStyle = 'rgba(40,38,36,0.55)'; g.lineWidth = 3;
  for (let k = 1; k < 9; k++) { const ly = py + ph - k * (ph / 9); g.beginPath(); g.moveTo(px, ly); g.lineTo(px + pw, ly); g.stroke(); g.fillStyle = 'rgba(40,38,36,0.55)'; g.fillRect(px + 10, ly - 12, 26, 8); }
  g.fillStyle = '#26221f';
  const hx = px + pw / 2, hy = py + ph * 0.36;
  g.beginPath(); g.ellipse(hx, hy + 6, 92, 104, 0, 0, Math.PI * 2); g.fill();                                   // the hair
  g.beginPath(); g.ellipse(hx - 70, hy + 70, 48, 92, 0.25, 0, Math.PI * 2); g.ellipse(hx + 70, hy + 70, 48, 92, -0.25, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4a4440'; g.beginPath(); g.ellipse(hx, hy + 18, 58, 72, 0, 0, Math.PI * 2); g.fill();           // the face, turned a little
  g.fillStyle = '#26221f'; g.fillRect(hx - 24, hy + 80, 48, 60);
  g.beginPath(); g.moveTo(hx - 170, py + ph); g.quadraticCurveTo(hx - 150, hy + 128, hx, hy + 122); g.quadraticCurveTo(hx + 150, hy + 128, hx + 170, py + ph); g.closePath(); g.fill();
  g.fillStyle = '#7a1a22'; g.beginPath(); g.ellipse(hx, hy + 56, 18, 7, 0, 0, Math.PI * 2); g.fill();             // lipstick on, even here
  g.fillStyle = 'rgba(20,18,16,0.22)';
  for (let yy = py + 3; yy < py + ph; yy += 7) for (let xx = px + 3 + ((yy / 7) % 2) * 3.5; xx < px + pw; xx += 7) { g.beginPath(); g.arc(xx, yy, 1.4, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(px, py, pw, ph);
  g.fillStyle = grey; for (let k = 0; k < 2; k++) g.fillRect(px, py + ph + 14 + k * 14, pw * (k ? 0.6 : 0.95), 7);
  // the columns of print
  const colX = [px + pw + 26, px + pw + 26 + (W - M - (px + pw + 26)) / 2 + 8], colW = (W - M - (px + pw + 26)) / 2 - 8;
  for (const x0 of colX) for (let yy = py; yy < H - M - 10; yy += 13) { if (R() < 0.06) { yy += 8; continue; } g.fillRect(x0, yy, colW * (R() < 0.15 ? 0.4 + R() * 0.5 : 1), 6); }
  for (let c = 0; c < 2; c++) for (let yy = py + ph + 50; yy < H - M - 10; yy += 13) g.fillRect(px + c * (pw / 2 + 6), yy, pw / 2 - 12 - (R() < 0.15 ? R() * 90 : 0), 6);
  g.fillStyle = ink; g.fillRect(px + pw + 12, py, 2, H - M - py - 10);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  PAGES[key] = t;
  return t;
}

// newsprint, lit a little by itself so it reads in a dim room; a scrap or a page shows only its
// own patch of the front page (aUvo: offset and size in the page)
function paperMaterial(tex, instanced, k = 0.42) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    if (instanced) sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aUvo;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = aUvo.xy + vMapUv * aUvo.zw;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';');
  };
  return m;
}

// ---------- the rip: paper going fast, in the song's time ----------
let RIPBUF = null;
function ripBuffer(c) {
  const sr = c.sampleRate, n = Math.floor(sr * 0.6), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
  const R = seeded(311);
  // a run of tiny cracks, packed tight while it goes fast, thinning out as it slows
  for (let t = 0.002; t < 0.52;) {
    const env = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 6.0);
    const amp = env * (0.3 + 0.7 * R());
    const len = Math.max(8, Math.floor(sr * (0.0003 + R() * 0.0018)));
    const i0 = Math.floor(t * sr);
    for (let k = 0; k < len && i0 + k < n; k++) d[i0 + k] += (R() * 2 - 1) * amp * Math.exp(-k / (len * 0.3));
    t += 0.0004 + R() * 0.0024 * (1 + t * 10);
  }
  // and under it the hiss of the sheet giving way
  for (let i = 0; i < n; i++) { const tt = i / sr; d[i] += (R() * 2 - 1) * 0.28 * (tt < 0.01 ? tt / 0.01 : Math.exp(-(tt - 0.01) * 11)); }
  let mx = 1e-6; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(d[i]));
  for (let i = 0; i < n; i++) d[i] /= mx;
  return b;
}
function playRip(snd, when, level = 1) {
  const c = snd.ctx; RIPBUF = RIPBUF || ripBuffer(c);
  const src = c.createBufferSource(); src.buffer = RIPBUF;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 650; hp.Q.value = 0.6;
  const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 2500; pk.gain.value = 4; pk.Q.value = 0.8;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6800; lp.Q.value = 0.5;
  const g = c.createGain(); g.gain.value = 0.19 * level;
  src.connect(hp).connect(pk).connect(lp).connect(g).connect(snd.sfx); src.start(when);
  // her going through it: a soft low push, felt more than heard
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(118, when); o.frequency.exponentialRampToValueAtTime(46, when + 0.16);
  const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, when); g2.gain.exponentialRampToValueAtTime(0.2 * level, when + 0.005); g2.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
  o.connect(g2).connect(snd.sfx); o.start(when); o.stop(when + 0.3);
  return [src, o];
}

// ---------- the sheet over the doors ----------
// In the door's own frame (the frame the room's end wall is drawn in): X across (+X her left),
// Y up from the floor, Z on along the road. The sheet is on the hall's side of the frame.
export class PpgPaper {
  constructor(scene, S, cfg) {
    this.S = S; this.cfg = cfg;
    const c = S.course; prepare(c, S.plan);
    this.t = c.beats[c.nearestBeatIndex(cfg.t)];          // on the chorus's first beat
    this.HW = cfg.hw ?? 12; this.HH = cfg.hh ?? 26.6; this.Z = -0.34;
    this.NU = 10; this.NV = 34; this.RH = cfg.hole ?? 3.4; this.thEnd = cfg.open ?? 2.05;
    this.tex = ppgFrontPage(cfg.text, cfg.deck);
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    this.mat = paperMaterial(this.tex, false);
    this.whole = new THREE.Mesh(this._wholeGeo(), this.mat); this.whole.frustumCulled = false; this.group.add(this.whole);
    const n = (this.NU + 1) * (this.NV + 1);
    this.halves = [-1, 1].map((s) => {
      const geo = new THREE.BufferGeometry();
      const h = { s, n, geo, pos: new Float32Array(n * 3), uv: new Float32Array(n * 2), col: new Float32Array(n * 3), rx: new Float32Array(n), ry: new Float32Array(n), rd: new Float32Array(n), rL: new Float32Array(n), cr: new Float32Array(n) };
      const idx = [];
      for (let j = 0; j < this.NV; j++) for (let i = 0; i < this.NU; i++) { const a = j * (this.NU + 1) + i, b = a + 1, cc = a + this.NU + 1, d = cc + 1; idx.push(a, b, cc, b, d, cc); }
      geo.setIndex(idx);
      geo.setAttribute('position', new THREE.BufferAttribute(h.pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('uv', new THREE.BufferAttribute(h.uv, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(h.col, 3));
      h.mesh = new THREE.Mesh(geo, this.mat); h.mesh.frustumCulled = false; h.mesh.visible = false; this.group.add(h.mesh);
      return h;
    });
    // the scraps: bits of the page from round the hole, each showing its own patch of print
    this.NS = 150;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.42, 0, 0.46, -0.5, 0, 0.52, 0.38, 0, -0.4, 0.5, 0]), 3));
    sg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
    sg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12).fill(1), 3));
    sg.setIndex([0, 1, 2, 0, 2, 3]);
    this.uvo = new THREE.InstancedBufferAttribute(new Float32Array(this.NS * 4), 4); sg.setAttribute('aUvo', this.uvo);
    this.scraps = new THREE.InstancedMesh(sg, paperMaterial(this.tex, true, 0.62), this.NS);
    this.scraps.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scraps.frustumCulled = false; this.scraps.count = 0;
    this.group.add(this.scraps);
    this.sc = Array.from({ length: this.NS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), ax: new THREE.Vector3(), k: 2, fall: 1.5, size: 1, w0: 8, w1: 2, ph: 0, sw: 0 }));
    this._rest(0, 12); this._spawn(0, 12, 40);
    this.hitT = null; this.played = false; this.lastT = -1e9; this.srcs = null;
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._v = new THREE.Vector3();
  }

  // the whole page, before
  _wholeGeo() {
    const { HW, HH, Z } = this, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([HW, 0, Z, -HW, 0, Z, -HW, HH, Z, HW, HH, Z]), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12).fill(1), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  }

  // the halves as they were the instant before: torn up a wandering line through where she hit
  // (xt across, yi up), a ragged hole round her
  _rest(xt, yi) {
    const { HW, HH, NU, NV, RH } = this, R = seeded(77);
    xt = clamp(xt, -HW + RH + 2, HW - RH - 2); yi = clamp(yi, RH + 0.6, HH - RH - 0.6);
    this.xt = xt; this.yi = yi;
    const tear = new Float32Array(NV + 1), ragged = new Float32Array(NV + 1);
    let w = (R() - 0.5) * 1.0;
    for (let j = 0; j <= NV; j++) { w += (R() - 0.5) * 1.3; w *= 0.84; tear[j] = xt + w + (j / NV - yi / HH) * 1.6; ragged[j] = 0.75 + 0.5 * R(); }
    for (const h of this.halves) {
      const s = h.s, hx = s * HW;
      for (let j = 0; j <= NV; j++) {
        const Y = HH * j / NV, dy = (Y - yi) / RH;
        const hole = Math.abs(dy) < 1 ? RH * Math.sqrt(1 - dy * dy) * ragged[j] : 0.03;
        const inner = clamp(tear[j] + s * hole, -HW + 1.2, HW - 1.2), L = Math.abs(inner - hx);
        for (let i = 0; i <= NU; i++) {
          const k = j * (NU + 1) + i, f = i / NU, X = hx + (inner - hx) * f;
          h.rx[k] = X; h.ry[k] = Y; h.rd[k] = L * f; h.rL[k] = L;
          h.uv[k * 2] = (HW - X) / (2 * HW); h.uv[k * 2 + 1] = Y / HH;
          const e = i === NU ? 1.3 : i === NU - 1 ? 1.06 : 1;   // the torn edge shows white fibre
          h.col[k * 3] = e; h.col[k * 3 + 1] = e; h.col[k * 3 + 2] = e * 0.97;
          h.cr[k] = (R() - 0.5) * 0.7 * f * f * f;
        }
      }
      h.geo.attributes.uv.needsUpdate = true; h.geo.attributes.color.needsUpdate = true;
    }
    this._pose(0, 0);
  }

  // the halves at tau seconds after: each swings open on its side of the frame, the torn edge
  // leading (so the sheet bends), the middle of the sheet first; flapping, the free corners sagging
  _pose(tau, beat) {
    const { thEnd, yi } = this;
    for (const h of this.halves) {
      const s = h.s, hx = s * this.HW, p = h.pos;
      for (let k = 0; k < h.n; k++) {
        const d = h.rd[k], L = h.rL[k], dn = L > 0 ? d / L : 0, Y = h.ry[k];
        const vf = 1 - 0.34 * Math.min(1, Math.abs(Y - yi) / 13);
        const x = Math.max(0, tau) * 7.5 * (0.48 + 0.52 * dn) * vf;
        const th = tau > 0 ? thEnd * (1 - Math.exp(-3 * x) * (1 + 3 * x)) : 0;
        const cs = Math.cos(th), sn = Math.sin(th);
        const amp = (0.9 * Math.exp(-1.6 * tau) + 0.12 + 0.2 * beat) * dn;
        const fl = (tau > 0 ? amp * Math.sin(2.0 * d - 9.5 * tau + 0.33 * Y + s) : 0) + h.cr[k] * Math.min(1, Math.max(0, tau) * 5);
        const sag = 0.08 * dn * dn * L * Math.min(1, Math.max(0, tau) * 1.2);
        p[k * 3] = hx - s * cs * d - s * sn * fl;
        p[k * 3 + 1] = Y - sag;
        p[k * 3 + 2] = this.Z + sn * d - cs * fl;
      }
      h.geo.attributes.position.needsUpdate = true;
      h.geo.computeVertexNormals();
    }
  }

  // the scraps' flights: from round the hole, on with her (some faster for a moment), out from
  // the hole across the sheet, then tumbling down slowly the way paper does
  _spawn(xt, yi, vr) {
    const R = seeded(131), { HW, HH, RH } = this, uv = this.uvo.array;
    for (let i = 0; i < this.NS; i++) {
      const q = this.sc[i];
      // most from round the hole, the rest from up and down the tear
      const fromTear = i >= this.NS * 0.7;
      const a = R() * Math.PI * 2, r = fromTear ? RH * (0.6 + R() * 0.6) : Math.sqrt(R()) * RH * 1.05;
      const along = fromTear ? (R() - 0.35) * HH * 0.8 : 0;
      q.p.set(xt + Math.cos(a) * r * (fromTear ? 0.4 : 1), clamp(yi + Math.sin(a) * r + along, 0.4, HH - 0.4), this.Z);
      // flung out from where she hit, wide; most keep up with her for a moment, a few hang back
      const out = 4 + R() * 11, keep = R() < 0.72;
      q.v.set(Math.cos(a) * out, Math.sin(a) * out * 0.75 + 1.5 + R() * 3.5, vr * (keep ? 0.78 + 0.45 * R() : 0.3 + 0.4 * R()));
      q.ax.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
      q.k = 1.8 + R() * 1.4; q.fall = 1.0 + R() * 1.2; q.size = 0.22 + R() * R() * 0.75;
      q.w0 = 8 + R() * 16; q.w1 = 1.5 + R() * 2.5; q.ph = R() * 6.28; q.sw = 0.3 + R() * 0.7;
      // what's printed on it: mostly bits of the headline's letters, so the cloud reads as the page
      const du = q.size / (2 * HW) * 1.6, dv = q.size / HH * 1.6;
      const u0 = R() < 0.75 ? 0.08 + R() * 0.84 : (HW - q.p.x) / (2 * HW), v0 = R() < 0.75 ? 0.46 + R() * 0.36 : 0.86 + R() * 0.1;
      uv[i * 4] = clamp(u0 - du / 2, 0, 1 - du); uv[i * 4 + 1] = clamp(v0 - dv / 2, 0, 1 - dv); uv[i * 4 + 2] = du; uv[i * 4 + 3] = dv;
    }
    this.uvo.needsUpdate = true;
  }

  update(S, dt, camera, time) {
    const T = S.rider.t, c = S.course, t = this.t;
    // a ride started over, or from further back: whole again
    if (T < t - 0.6) { this.hitT = null; if (this.played && !this.srcs) this.played = false; }
    const show = T > t - 46 && T < t + 4.5;
    this.group.visible = show;
    if (show && T < t + 2.4) {
      // stand where the room's end wall stands
      S.track.ground(t, 0, this._p);
      this.group.position.set(this._p.x, floorAt(c, t), this._p.z);
      this.group.rotation.set(0, c.sample(t).yaw, 0);
      this.group.updateMatrixWorld(true);
    }
    // the rip, scheduled on the song's own clock so it lands on the beat she hits it on
    const snd = window.__LC && window.__LC.sound;
    if (snd) {
      if (snd._frozen != null && this.srcs && snd.ctx.currentTime < this.ripAt) { for (const s of this.srcs) { try { s.stop(); } catch (e) { /* gone */ } } this.srcs = null; this.played = false; }
      if (!this.played && T > t - 0.3 && T < t + 0.08 && snd.src && snd.ctx.state === 'running' && snd._frozen == null) {
        this.played = true; this.ripAt = Math.max(snd.ctx.currentTime, snd.t0 + t); this.srcs = playRip(snd, this.ripAt, this.cfg.level ?? 1);
      }
      if (this.srcs && snd.ctx.currentTime > this.ripAt + 0.7) this.srcs = null;
    }
    if (!show) { this.lastT = T; return; }
    if (T < t) {
      this.whole.visible = true; for (const h of this.halves) h.mesh.visible = false; this.scraps.count = 0;
      this.lastT = T; return;
    }
    // the moment she goes through: the tear and the hole are where she actually is
    if (this.hitT === null) {
      this.hitT = t;
      let xt = 0, yi = 12, vr = 40;
      const live = this.lastT > t - 0.5 && this.lastT < t;
      if (live && S.view) {
        this._v.copy(S.view.root.position); this.group.worldToLocal(this._v);
        xt = this._v.x; yi = this._v.y + 1.1; vr = Math.max(20, S.rider.v);
      } else {
        const s = c.sample(t); yi = s.y - floorAt(c, t) + 1.1; vr = 40;
      }
      this._rest(xt, yi); this._spawn(this.xt, this.yi, vr);
    }
    this.lastT = T;
    const tau = T - t, beat = S.town ? S.town.beat || 0 : 0;
    this.whole.visible = false;
    for (const h of this.halves) h.mesh.visible = tau < 4.2;
    if (tau < 4.2) this._pose(tau, beat);
    // the scraps
    let n = 0;
    if (tau < 4.4) {
      const m = this._m, q = this._q, sc = this._s, p = this._p;
      for (let i = 0; i < this.NS; i++) {
        const o = this.sc[i], e = Math.exp(-o.k * tau), a = (1 - e) / o.k;
        p.set(o.p.x + o.v.x * a + Math.sin(tau * 2.1 + o.ph) * o.sw * Math.min(1, tau), o.p.y + o.v.y * a - o.fall * (tau - a) - 3.5 * a * a, o.p.z + o.v.z * a);
        let size = o.size * Math.min(1, (4.4 - tau) / 0.5);
        if (p.y < 0.05) { p.y = 0.05; size *= 0.85; }
        const ang = o.ph + o.w1 * tau + (o.w0 - o.w1) * (1 - Math.exp(-2.2 * tau)) / 2.2;
        q.setFromAxisAngle(o.ax, ang);
        m.compose(p, q, sc.set(size, size, size));
        this.scraps.setMatrixAt(n++, m);
      }
    }
    this.scraps.count = n; this.scraps.instanceMatrix.needsUpdate = true;
  }
}

// ---------- the press: front pages coming down through the courtroom ----------
// Each page has its place along the road (song time) and across it, and is let go from up near
// the ceiling so that it's in the air in front of her as she comes; the ones that land lie flat.
export class PpgPages {
  constructor(scene, S, cfg) {
    this.S = S; const c = S.course; prepare(c, S.plan);
    this.tex = ppgFrontPage(cfg.text, cfg.deck);
    const R = seeded(53);
    this.list = [];
    for (const [from, to, n, top] of cfg.windows || []) {
      for (let k = 0; k < n; k++) {
        const t = from + (to - from) * (k + R()) / n, side = R() < 0.5 ? -1 : 1;
        const x = side * (R() < 0.55 ? 6 + R() * 16 : 22 + R() * 26);
        const fy = floorAt(c, t), ry = c.sample(t).y;
        const want = ry + 1 + R() * 15, fall = 1.5 + R() * 1.4, ceil = fy + (top ?? 44);
        const t0 = t - 0.9 - Math.max(0, ceil - want) / fall;
        this.list.push({ t, x, fy, ceil, fall, t0, ph: R() * 6.28, sp: 0.6 + R() * 0.9, rk: 0.6 + R() * 0.5, yaw: R() * 6.28, sw: 0.8 + R() * 1.4, s: 0.85 + R() * 0.4 });
      }
    }
    this.list.sort((a, b) => a.t - b.t);
    const g = new THREE.PlaneGeometry(2.3, 2.6);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    const uvo = new THREE.InstancedBufferAttribute(new Float32Array(160 * 4), 4);
    for (let i = 0; i < 160; i++) uvo.array.set([0, 0, 1, 1], i * 4);
    g.setAttribute('aUvo', uvo);
    this.mesh = new THREE.InstancedMesh(g, paperMaterial(this.tex, true), 160);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3();
  }
  update(S) {
    const T = S.rider.t; let n = 0;
    const m = this._m, p = this._p, q = this._q, e = this._e;
    for (const pg of this.list) {
      if (pg.t < T - 1.5) continue;
      if (pg.t > T + 9 || n >= 160) break;
      if (T < pg.t0) continue;
      const u = T - pg.t0;
      let y = pg.ceil - pg.fall * u;
      S.track.ground(pg.t, pg.x + Math.sin(u * pg.sp + pg.ph) * pg.sw, p);
      const yaw = S.course.sample(pg.t).yaw + pg.yaw + u * 0.35;
      if (y <= pg.fy + 0.06) { y = pg.fy + 0.06; e.set(-Math.PI / 2, yaw, 0); }
      // falling paper rocks to and fro, gliding a little each way
      else e.set(Math.sin(u * pg.sp * 2.1 + pg.ph) * 0.9 * pg.rk, yaw, Math.cos(u * pg.sp * 1.7 + pg.ph) * 0.5);
      p.y = y; q.setFromEuler(e);
      m.compose(p, q, this._s.setScalar(pg.s)); this.mesh.setMatrixAt(n++, m);
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}
