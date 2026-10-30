// Try Me Free! The record's bonus track, a Saturday-morning cereal commercial for the whole record:
// a breakfast table the size of a town, red gingham to the horizon, and on it the cereals standing
// like tower blocks, every song on the record a cereal of its own, its name and its number on the
// box. The TV at the start line plays the commercial (TRY ME FREE! in its starburst, the mascot
// winking), and on "snap, crackle, pop" the big yellow box tips and pours. Each time the megamix
// quotes a song, that song's colours take the sky and the road, a whole shelf of that cereal lines
// the way, its box lights up (and tips and pours on its line), and its own things are out on the
// table: the judge's bench and the gavel on "court"; the open casket and the open bar, the lipstick;
// the TVs going LIVE for the new subscriber, "ding" four times, SWIPE UP; the coffee he bought; the
// lectern for the eulogy; the blue nail polish and the ambulance sirens; the locker with the love
// note. Then the jump over the bowl: the alphabet in the milk rises letter by letter as it's sung,
// R.I.P. I.G. F.M.L. O.M.G. The family aisle in a sick light, its boxes in rows like shelves, one
// face down; the mascot's cartoon grin; ten million on the counter; the milk turning pink, this
// balanced breakfast, the mascot winking from the shelf. The cereal's own chorus: the whole record
// both sides, starbursts down the middle, the blue check, the target, COLLECT THEM ALL and the
// nutrition facts stood up like hoardings. The mug, the funeral, the vanity's colours; the scales
// of the courthouse and the key thrown away; Saturday morning communion down a nave of stained
// glass in cereal colours, the font of holy water; the bathroom's white; the beautiful bomb; the
// family scales levelling on "equalize", the guestbook, the mourning bouquet thrown across the road
// and caught; the cuffs, the receipts, the casket again; every cereal at once, and at the end the
// prize inside: the packet, the toy board in it, the card behind it, FREE PRIZE INSIDE.
// The things are in tmf-props.js, the course and looks in tmf-song.js.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, signV } from './scenery.js';
import { prepare } from './trail.js';
import { AA_GLSL } from './aa.js';
import { ALBUM } from './album.js';
import { TM, QUOTED, CELL, ART_COLS, ART_ROWS, TITLE_COLS, TITLE_ROWS, LETTERS, cellOf, artSheet, titleSheet, screenTexture, letterTexture, burstTexture } from './tmf-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);                    // beside the road, its front to the road
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.42 : -Math.PI / 2 - 0.42);      // and turned to you coming up it
const hex3 = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const CYANL = [0.35, 0.95, 1], CYANP = [0.4, 0.9, 1], WHITEL = [1, 0.97, 0.92], WARM = [1, 0.84, 0.56], GOLDL = [1, 0.78, 0.3], REDL = [1, 0.16, 0.22], BLUEL = [0.25, 0.5, 1], PINKL = [1, 0.4, 0.72], MILKL = [0.96, 0.97, 1], SCREENL = [0.55, 0.7, 1];
const LOOPS = ['#ff3a4a', '#ffd21a', '#2ad86a', '#ff8a1a', '#a85aff', '#3ab8ff', '#ff6ab0'].map(hex3);
// each quoted song's colour (its band on the box) and the cereal's own
const BAND = Object.fromEntries(QUOTED.map((q) => [q.id, hex3(q.band)]));
BAND.free = hex3(0xffd21a);
const TINT = Object.fromEntries(QUOTED.map((q) => [q.id, hex3(q.bg)]));
TINT.free = hex3(0xffd21a);

// the record, for the boxes: its name, colour and number
let SONGS = null;
const songs = () => SONGS || (SONGS = ALBUM.map((e, i) => ({ id: e.id, title: e.title, accent: e.accent || '#ff4f9a', num: i + 1 })));

// ---------- materials ----------
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const glossM = (M) => VC(M, 'tmfGlossM', 0.25, { roughness: 0.3, metalness: 0.05 });
const chromeM = (M) => VC(M, 'tmfChromeM', 0.18, { roughness: 0.2, metalness: 0.75 });
const ceramicM = (M) => VC(M, 'tmfCeramicM', 0.22, { roughness: 0.22, metalness: 0.0, side: THREE.DoubleSide });

// the light every lit shader here shares, set once a frame by the world (the sun, the sky, the fog)
const LIGHT = {
  uSun: { value: new THREE.Color(1, 1, 1) }, uSunDir: { value: new THREE.Vector3(0.4, 0.6, 0.7).normalize() },
  uSky: { value: new THREE.Color(1, 1, 1) }, uBounce: { value: new THREE.Color(0.5, 0.4, 0.4) },
  uFill: { value: new THREE.Color(0, 0, 0) }, uFillDir: { value: new THREE.Vector3(0, 0, 1) },
  uFog: { value: new THREE.Color(0.9, 0.85, 0.8) }, uFogDensity: { value: 0.0011 }, uCam: { value: new THREE.Vector3() },
  uTime: { value: 0 }, uBeat: { value: 0 }, uNight: { value: 0 },
};
const LIGHT_GLSL = /* glsl */`
  uniform vec3 uSun, uSunDir, uSky, uBounce, uFill, uFillDir, uFog, uCam; uniform float uFogDensity, uTime, uBeat, uNight;
  vec3 lit(vec3 n){ return mix(uBounce, uSky, 0.5 + 0.5 * n.y) + uSun * max(dot(n, uSunDir), 0.0) + uFill * max(dot(n, uFillDir), 0.0); }
  vec3 fogged(vec3 c, vec3 w){ float d = length(uCam - w); float f = 1.0 - exp(-pow(d * uFogDensity, 1.5)); return mix(c, uFog, clamp(f, 0.0, 1.0)); }`;

// the cereal boxes: front, back and sides from a sheet of pictures (per instance: which picture,
// the box's own colour, how lit). The art sheet has the quoted songs and the cereal; the title
// sheet the whole record as plain boxes.
function boxMaterial(map, cols, rows, title) {
  return new THREE.ShaderMaterial({
    uniforms: { ...LIGHT, map: { value: map } },
    vertexShader: /* glsl */`
      attribute float aCell; attribute vec3 aTint; attribute float aK;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW; flat varying float vFace; flat varying float vCell; flat varying vec3 vTint; varying float vK;
      void main(){
        vUv = uv;
        vFace = normal.z > 0.5 ? 0.0 : (normal.z < -0.5 ? 1.0 : (normal.x > 0.5 ? 2.0 : (normal.x < -0.5 ? 3.0 : (normal.y > 0.5 ? 4.0 : 5.0))));
        vCell = aCell; vTint = aTint; vK = aK;
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * (viewMatrix * w);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map;
      ${LIGHT_GLSL}
      ${AA_GLSL}
      varying vec2 vUv; varying vec3 vN; varying vec3 vW; flat varying float vFace; flat varying float vCell; flat varying vec3 vTint; varying float vK;
      vec3 cellAt(float c, vec2 uv){ float cx = mod(c, ${cols.toFixed(1)}), cy = floor(c / ${cols.toFixed(1)} + 0.01); uv = clamp(uv, 0.004, 0.996); return texture2D(map, vec2((cx + uv.x) / ${cols.toFixed(1)}, 1.0 - (cy + 1.0 - uv.y) / ${rows.toFixed(1)}), 0.5).rgb; }
      void main(){
        int face = int(vFace + 0.5);
        vec3 alb; float glow = 0.0;
        if (face == 0) { alb = cellAt(vCell, vUv); glow = 1.0; }
        ${title ? 'else if (face == 1) { alb = vTint * 0.85; }' : `else if (face == 1) { alb = cellAt(${CELL.BACK}.0, vUv); glow = 0.6; }`}
        else if (face == 2 || face == 3) {
          // the sides: the box's colour, a white panel down the middle with the facts in black lines
          alb = vTint;
          float u = vUv.x, v = vUv.y;
          float pan = step(0.16, u) * step(u, 0.84) * step(0.08, v) * step(v, 0.62);
          alb = mix(alb, vec3(0.97), pan);
          float lines = aaPulse(v * 22.0, 0.12) * pan * step(v, 0.5);
          alb = mix(alb, vec3(0.08), lines * 0.8);
          alb = mix(alb, vec3(0.08), pan * aaBand(v, 0.56, 0.035));
        } else alb = vTint * (face == 4 ? 0.95 : 0.4);
        vec3 n = normalize(vN);
        vec3 col = alb * lit(n) * 0.55;
        col += alb * (0.08 + 0.2 * uNight + vK * 0.9) * glow;
        gl_FragColor = vec4(fogged(col, vW), 1.0);
      }`,
  });
}
// a picture from a cell sheet on a flat thing (the TV's screen, the panels): which cell, how lit
function cellMat(map, cols, rows, base = 0.2, gain = 1.0, alpha = false) {
  return new THREE.ShaderMaterial({
    uniforms: { ...LIGHT, map: { value: map } },
    vertexShader: /* glsl */`
      attribute float aCell; attribute float aK; varying vec2 vUv; varying float vK; varying vec3 vW;
      void main(){
        float c = mod(aCell, ${cols.toFixed(1)}), r = floor(aCell / ${cols.toFixed(1)} + 0.01);
        vUv = vec2((uv.x + c) / ${cols.toFixed(1)}, 1.0 - (r + 1.0 - uv.y) / ${rows.toFixed(1)}); vK = aK;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * (viewMatrix * w);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map;
      ${LIGHT_GLSL}
      varying vec2 vUv; varying float vK; varying vec3 vW;
      void main(){ vec4 t = texture2D(map, vUv); ${alpha ? 'if (t.a < 0.45) discard;' : ''} vec3 c = t.rgb * (${base.toFixed(3)} + ${gain.toFixed(3)} * vK); gl_FragColor = vec4(fogged(c, vW), 1.0); }`,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
}
// the cereal pieces: an O each, its own colour (aTint), lit like the rest
function pieceMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...LIGHT },
    vertexShader: /* glsl */`
      attribute vec3 aTint; attribute float aK; varying vec3 vC; varying vec3 vN; varying vec3 vW; varying float vK;
      void main(){ vC = aTint; vK = aK; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      ${LIGHT_GLSL}
      varying vec3 vC; varying vec3 vN; varying vec3 vW; varying float vK;
      void main(){ vec3 n = normalize(vN); vec3 c = vC * lit(n) * 0.55 + vC * (0.12 + vK); c += vec3(0.25) * pow(max(dot(reflect(-uSunDir, n), normalize(uCam - vW)), 0.0), 18.0) * uSun; gl_FragColor = vec4(fogged(c, vW), 1.0); }`,
  });
}
// the milk in a bowl: white, a sheen, loops floating; pink from its moment (aK carries how pink)
function milkMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...LIGHT },
    vertexShader: /* glsl */`
      attribute float aK; varying float vK; varying vec3 vW; varying vec2 vP;
      void main(){ vK = aK; vP = position.xz; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      ${LIGHT_GLSL}
      varying float vK; varying vec3 vW; varying vec2 vP;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 milk = mix(vec3(0.97, 0.96, 0.94), vec3(1.0, 0.55, 0.75), vK);
        float r = length(vP);
        vec3 c = milk * (0.55 + 0.45 * smoothstep(1.0, 0.6, r)) * lit(vec3(0.0, 1.0, 0.0)) * 0.6 + milk * 0.25;
        // the sheen: a ring of light round the bowl's edge, moving a little
        c += vec3(1.0) * 0.25 * exp(-pow((r - 0.86 - 0.02 * sin(uTime * 1.3 + vP.x * 6.0)) * 18.0, 2.0));
        gl_FragColor = vec4(fogged(c, vW), 1.0);
      }`,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
}
// stained glass in an arched window: leaded panes in cereal colours round a rose of loops, lit from
// behind (aK), the lead dark
function stainedMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...LIGHT },
    vertexShader: /* glsl */`
      attribute float aK; attribute float aSeed; varying vec2 vUv; varying float vK; flat varying float vSeed; varying vec3 vW;
      void main(){ vUv = uv; vK = aK; vSeed = aSeed; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      ${LIGHT_GLSL}
      ${AA_GLSL}
      varying vec2 vUv; varying float vK; flat varying float vSeed; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      const vec3 C0 = vec3(1.0, 0.2, 0.25), C1 = vec3(1.0, 0.8, 0.1), C2 = vec3(0.15, 0.75, 0.35), C3 = vec3(0.2, 0.45, 1.0), C4 = vec3(0.7, 0.35, 1.0), C5 = vec3(1.0, 0.5, 0.1);
      vec3 pal(float k){ k = fract(k) * 6.0; return k < 1.0 ? C0 : k < 2.0 ? C1 : k < 3.0 ? C2 : k < 4.0 ? C3 : k < 5.0 ? C4 : C5; }
      void main(){
        vec2 p = vec2((vUv.x - 0.5) * 22.6, vUv.y * 49.2);
        // panes: diamond quarries, the colours in bands up the window; a rose at the top (a loop of loops)
        vec2 q = vec2(p.x / 2.3 + p.y / 3.4, p.x / 2.3 - p.y / 3.4); vec2 cq = floor(q);
        float band = floor((cq.x - cq.y) * 0.5 / 4.0);
        // (a pane smaller than a pixel takes its band's colour, and close by, rushing past the edge of
        // the picture, the panes and the lead calm down: both strobed)
        float small = smoothstep(0.25, 0.8, max(fwidth(q.x), fwidth(q.y)));
        float pass = smoothstep(46.0, 14.0, length(uCam - vW));
        vec3 col = pal(band * 0.17 + vSeed + step(0.8, h2(cq + vSeed * 7.0)) * 0.5 * (1.0 - max(small, pass * 0.7)));
        // (filtered on q itself: fract(q) jumps at every line, and its fwidth there broke the lead into beads)
        float lead = max(aaPulse(q.x + 0.07, 0.14), aaPulse(q.y + 0.07, 0.14));
        // the mullions: two upright bars of lead and the sill
        lead = max(lead, max(aaBand(abs(p.x), 5.6, 0.35), aaBand(p.y, 1.2, 0.35)));
        vec2 rc = p - vec2(0.0, 38.0); float rr = length(rc);
        if (rr < 9.5) {
          float a = atan(rc.y, rc.x), seg = floor((a + 3.14159) / 6.28318 * 10.0);
          float ring = abs(rr - 5.6);
          col = pal(seg * 0.37 + vSeed);
          lead = max(aaBand(ring, 2.0, 0.25), aaBand(rr, 9.3, 0.3));
          if (ring < 1.6) col = mix(vec3(1.0, 0.85, 0.4), col, 0.3);
          lead = max(lead, aaBand(rr, 1.4, 0.3));
        }
        // the glass's grain (half-metre cells), gone where a cell is under a pixel or two: it sparkled
        float grain = smoothstep(0.3, 0.9, max(fwidth(p.x), fwidth(p.y)) * 2.0);
        col *= 0.75 + 0.5 * mix(h2(floor(p * 2.0) + vSeed), 0.5, max(max(small, pass), grain));
        lead *= 1.0 - 0.75 * max(small, pass * 0.6);
        col = pow(col, vec3(1.4));
        vec3 c = col * (0.1 + 0.85 * vK) * (1.0 - clamp(lead, 0.0, 1.0)) + vec3(0.015) * clamp(lead, 0.0, 1.0);
        gl_FragColor = vec4(fogged(c, vW), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}
// the tablecloth: red gingham, the weave, a fold now and then, crumbs; lit by the sky and the sun,
// the pools of light the things throw drawn over it by the scenery
function clothMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...LIGHT, uA: { value: new THREE.Color(0xfff8f0) }, uB: { value: new THREE.Color(0xe8283c) }, uDark: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uA, uB; uniform float uDark;
      ${LIGHT_GLSL}
      ${AA_GLSL}
      varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vW.xz / 9.0;
        float sx = aaSq(p.x), sz = aaSq(p.y);
        float k = (sx + sz) * 0.5;
        vec3 col = mix(uA, uB, k * k * 0.75 + k * 0.25);
        // the weave, where it's near enough to see
        float near = 1.0 - smoothstep(0.02, 0.12, fwidth(p.x) + fwidth(p.y));
        col *= 1.0 - 0.06 * near * (aaPulse(vW.x * 1.4, 0.5) + aaPulse(vW.z * 1.4, 0.5));
        // folds: long soft creases
        float fold = n2(vW.xz * vec2(0.004, 0.011));
        col *= 0.86 + 0.14 * smoothstep(0.2, 0.8, fold);
        // crumbs
        float cr = step(0.985, h2(floor(vW.xz * 0.5))) * near;
        col = mix(col, vec3(0.85, 0.6, 0.3), cr * 0.7);
        vec3 c = col * lit(vec3(0.0, 1.0, 0.0)) * 0.5;
        c *= 1.0 - 0.6 * uDark;
        gl_FragColor = vec4(fogged(c, vW), 1.0);
      }`,
    depthWrite: true,
  });
}

let TEX = null;
const tex = () => TEX || (TEX = { screen: screenTexture(), letters: letterTexture(), burst: burstTexture() });
const KV = { aK: 0 }, CK = { aCell: 0, aK: 0 }, BX = { aCell: 0, aTint: null, aK: 0 }, PK = { aTint: null, aK: 0 }, SK = { aK: 0, aSeed: 0 };
const kv = (k) => { KV.aK = k; return KV; };
const ck = (c, k) => { CK.aCell = c; CK.aK = k; return CK; };
const bx = (c, tint, k) => { BX.aCell = c; BX.aTint = tint; BX.aK = k; return BX; };
const pk = (tint, k) => { PK.aTint = tint; PK.aK = k; return PK; };
const sk = (k, seed) => { SK.aK = k; SK.aSeed = seed; return SK; };

// ---------- the pieces, registered ----------
const PROP_LAYERS = {
  tv: ['tmfTV', 'tmfScreen'], bowl: ['tmfBowl', 'tmfMilk', 'tmfLetter', 'tmfPiece'], spoon: ['tmfSpoon'], carton: ['tmfCarton'], glass: ['tmfGlass', 'tmfGlassShell'],
  mascot: ['tmfMascot', 'tmfEye', 'tmfGrin'], badge: ['tmfBadge'], target: ['tmfTarget'], panel: ['tmfPanel', 'tmfPanelFace'], down: ['tmfBox', 'tmfFlap'], font: ['tmfBowl', 'tmfMilk', 'tmfPedestal'],
};

extend({
  layers: {
    tmfBox: (M) => [TM.cereal(), M.tmfBoxM || (M.tmfBoxM = boxMaterial(artSheet(songs()).tex, ART_COLS, ART_ROWS, false)), 60, { aCell: 1, aTint: 3, aK: 1 }],
    tmfBoxT: (M) => [TM.cereal(), M.tmfBoxTM || (M.tmfBoxTM = boxMaterial(titleSheet(songs()).tex, TITLE_COLS, TITLE_ROWS, true)), 420, { aCell: 1, aTint: 3, aK: 1 }],
    tmfFlap: (M) => [TM.flaps(), M.tmfPieceM || (M.tmfPieceM = pieceMaterial()), 480, { aTint: 3, aK: 1 }],
    tmfPiece: (M) => [TM.piece(), M.tmfPieceM || (M.tmfPieceM = pieceMaterial()), 1800, { aTint: 3, aK: 1 }],
    tmfTV: (M) => [TM.tv(), glossM(M), 4, {}],
    tmfScreen: (M) => [TM.tvScreen(), M.tmfScreenM || (M.tmfScreenM = cellMat(tex().screen, 3, 2, 0.15, 1.15)), 4, { aCell: 1, aK: 1 }],
    tmfBowl: (M) => [TM.bowl(), ceramicM(M), 4, {}],
    tmfMilk: (M) => [TM.milk(), M.tmfMilkM || (M.tmfMilkM = milkMaterial()), 4, { aK: 1 }],
    tmfPedestal: (M) => [TM.pedestal(), ceramicM(M), 2, {}],
    tmfLetter: (M) => [TM.letter(), M.tmfLetterM || (M.tmfLetterM = cellMat(tex().letters, 10, 1, 0.3, 0.9, true)), 24, { aCell: 1, aK: 1 }],
    tmfSpoon: (M) => [TM.spoon(), chromeM(M), 6, {}],
    tmfCarton: (M) => [TM.carton(), glossM(M), 12, {}],
    tmfGlass: (M) => [TM.glass(), VC(M, 'tmfJuiceM', 0.45, { roughness: 0.2 }), 12, {}],
    tmfGlassShell: (M) => [TM.glassShell(), M.tmfShellM || (M.tmfShellM = new THREE.MeshStandardMaterial({ color: 0xe8f6ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, emissive: 0x1a2028 })), 12, {}],
    tmfMascot: (M) => [TM.mascotRing(), glossM(M), 4, {}],
    tmfEye: (M) => [TM.mascotEye(), glossM(M), 8, {}],
    tmfGrin: (M) => [TM.mascotGrin(), glossM(M), 4, {}],
    tmfBadge: (M) => [TM.badge(), VC(M, 'tmfBadgeM', 0.45, { roughness: 0.25, metalness: 0.2 }), 2, {}],
    tmfTarget: (M) => [TM.target(), glossM(M), 2, {}],
    tmfPanel: (M) => [TM.panel(), glossM(M), 6, {}],
    tmfPanelFace: (M) => [TM.panelFace(), M.tmfPanelM || (M.tmfPanelM = cellMat(artSheet(songs()).tex, ART_COLS, ART_ROWS, 0.35, 0.8)), 6, { aCell: 1, aK: 1 }],
    tmfBurstPole: (M) => [TM.burstPole(), glossM(M), 60, {}],
    tmfBurstFace: (M) => [TM.burstFace(), M.tmfBurstM || (M.tmfBurstM = cellMat(tex().burst, 3, 1, 0.45, 0.85, true)), 60, { aCell: 1, aK: 1 }],
    tmfArch: (M) => [TM.archFrame(), VC(M, 'tmfLeadM', 0.12, { roughness: 0.5, metalness: 0.4 }), 80, {}],
    tmfArchGlass: (M) => [TM.archGlass(), M.tmfStainM || (M.tmfStainM = stainedMaterial()), 80, { aK: 1, aSeed: 1 }],
    tmfBoard: (M) => [TM.board(), glossM(M), 30, {}],
    tmfBoardFace: (M) => [TM.boardFace(), M.sign, 30, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // ---- a cereal box: the record's (title sheet) or a quoted song's or the cereal's own (art) ----
    // it.cell, it.title, it.tint, it.s; a quoted song's box lights for its lines (it.lit), tips
    // toward the road (it.tip over it.tipAt) and pours (it.pour)
    tmfBox(S, it, p, q, yaw) {
      const L = S.layers;
      if (!S.track) { void L.tmfBox; void L.tmfBoxT; void L.tmfFlap; void L.tmfPiece; return; }
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      const W = 24 * s * (it.sw ?? 1), H = 32 * s * (it.sh ?? 1), D = 8 * s;
      let k = 0.08 + 0.25 * (it.wakeNow ?? 0);
      if (it.lit) k = Math.max(k, 0.85 * smooth(it.lit[0] - 0.3, it.lit[0] + 0.1, T) * (1 - smooth(it.lit[1], it.lit[1] + 0.8, T)));
      if (it.flash) k += 0.5 * Math.exp(-Math.max(0, T - it.flash) * 3) * (T > it.flash ? 1 : 0);
      // tipping on its front bottom edge, toward the road
      const tip = it.tip ? it.tip * smooth(it.tipAt[0], it.tipAt[1], T) : (it.lean ?? 0);
      const qq = S._tmq || (S._tmq = new THREE.Quaternion()), qx = S._tmqx || (S._tmqx = new THREE.Quaternion());
      qx.setFromAxisAngle(S._tmX || (S._tmX = new THREE.Vector3(1, 0, 0)), tip); qq.copy(q).multiply(qx);
      // the pivot (front bottom edge) stays put: p + R(yaw) (pivot - Rx pivot)
      const dz = D / 2, ry = dz * Math.sin(tip), rz = dz - dz * Math.cos(tip);
      const at = local(p, yaw, 0, ry, rz, S._tmo || (S._tmo = new THREE.Vector3()));
      at.y = (it.h ?? 0) + ry;
      m.compose(at, qq, S._s.set(W, H, D));
      (it.title ? L.tmfBoxT : L.tmfBox).add(m, bx(it.cell, it.tint, k));
      L.tmfFlap.add(m, pk(it.tint, k * 0.5));
      // its light on the table and in the air when it's lit
      if (it.lit && k > 0.12) {
        const c = it.band || GOLDL;
        const w = local(p, yaw, 0, H * 0.6, D * 0.5 + 6, S._o); glowAt(S, w.x, w.y, w.z, 46 * s, c, 0.22 * k);
        poolAt(S, p.x, 0.15, p.z, 70 * s, c, 0.5 * k);
      }
      // pouring: loops out of the top in an arc to the table
      if (it.pour && T > it.pour[0] - 0.1 && T < it.pour[1] + 1.4) {
        const on = smooth(it.pour[0], it.pour[0] + 0.15, T) * (1 - smooth(it.pour[1], it.pour[1] + 0.5, T));
        const top = S._tmt || (S._tmt = new THREE.Vector3());
        // the top's middle after tipping: up H*cos, out H*sin toward the road (+z local)
        local(p, yaw, 0, 0, H * Math.sin(tip) - dz * Math.cos(tip) + dz, top); top.y = H * Math.cos(tip) + dz * Math.sin(tip) + (it.h ?? 0);
        const fx = Math.sin(yaw), fz = Math.cos(yaw);
        const e = S._tme || (S._tme = new THREE.Euler()), pq = S._tmpq || (S._tmpq = new THREE.Quaternion());
        const pn = it.pn ?? 70;
        for (let j = 0; j < pn; j++) {
          const ph = ((T - it.pour[0]) * 0.9 + j / pn) % 1, age = ph * 1.6;
          if (T - it.pour[0] < age) continue;
          if (on * (1 - ph * 0.3) < 0.05 && T > it.pour[1]) continue;
          const sp = 9 + 6 * hash(j * 3.1), side = (hash(j * 7.7) - 0.5) * 8;
          const x = top.x + fx * sp * age + Math.cos(yaw) * side * age, z = top.z + fz * sp * age - Math.sin(yaw) * side * age;
          const y = top.y + 3 * age - 15 * age * age;
          if (y < 0.6) continue;
          e.set(T * 3 + j, j, T * 2.2 + j * 0.7); pq.setFromEuler(e);
          m.compose(S._o.set(x, y, z), pq, S._s.set(1.05 * s, 1.05 * s, 1.05 * s));
          L.tmfPiece.add(m, pk(LOOPS[j % LOOPS.length], 0.35));
        }
      }
    },
    // ---- the cereal spilled on the table: a scatter of loops round it.t, it.x ----
    tmfPile(S, it, p) {
      const L = S.layers;
      if (!S.track) { void L.tmfPiece; return; }
      const m = S._m, e = S._tme || (S._tme = new THREE.Euler()), pq = S._tmpq || (S._tmpq = new THREE.Quaternion());
      const n = it.n ?? 10, sc = it.s ?? 1.8;
      for (let j = 0; j < n; j++) {
        const a = hash(it.seed * 13 + j) * 6.28, r = 2 + hash(it.seed * 7 + j * 1.7) * Math.min(14, Math.abs(it.x) - 11);
        e.set(Math.PI / 2 + (hash(j + it.seed) - 0.5) * 0.5, 0, (hash(j * 3.3 + it.seed) - 0.5) * 0.5); pq.setFromEuler(e);
        m.compose(S._o.set(p.x + Math.cos(a) * r, (0.66 + 0.16 * (j % 4)) * sc, p.z + Math.sin(a) * r), pq, S._s.set(sc, sc, sc));
        L.tmfPiece.add(m, pk(LOOPS[(j + it.c) % LOOPS.length], 0.05));
      }
    },
    // ---- a starburst on a pole: TRY ME FREE!, NOW WITH MORE!, COLLECT THEM ALL ----
    tmfBurst(S, it, p, q, yaw) {
      const L = S.layers;
      if (!S.track) { void L.tmfBurstPole; void L.tmfBurstFace; return; }
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      const sm = S.course.sample(it.t, S._tmSm || (S._tmSm = {}));
      const e = S._tme || (S._tme = new THREE.Euler()), fq = S._tmfq || (S._tmfq = new THREE.Quaternion());
      const beat = S.beat ?? 0;
      e.set(0, sm.yaw + Math.PI + (it.x > 0 ? -0.45 : 0.45), Math.sin(T * 1.7 + it.t) * 0.06); fq.setFromEuler(e);
      m.compose(p, fq, S._s.set(s, s * (1 + 0.04 * beat), s));
      L.tmfBurstPole.add(m); L.tmfBurstFace.add(m, ck(it.cell, 0.6 + 0.4 * (it.wakeNow ?? 0) + 0.3 * beat));
    },
    // ---- a stained-glass window on its frame, lit from behind as you pass in time ----
    tmfArch(S, it, p, q) {
      const L = S.layers;
      if (!S.track) { void L.tmfArch; void L.tmfArchGlass; return; }
      const m = S._m, s = it.s ?? 1, T = S.tNow ?? 0;
      m.compose(p, q, S._s.set(s, s, s));
      const k = 0.25 + 0.75 * (it.wakeNow ?? 0) + 0.2 * (S.beat ?? 0);
      L.tmfArch.add(m); L.tmfArchGlass.add(m, sk(k, it.seed));
      // its light falling across the table toward the road
      glowAt(S, p.x, p.y + 30 * s, p.z, 30 * s, it.c, 0.12 * k);
      poolAt(S, p.x, 0.2, p.z, 46 * s, it.c, 0.35 * k * smooth(188.0, 189.5, T));
    },
    // ---- a lyric board: the back of a box hung over the road ----
    tmfBoard(S, it, p) {
      const L = S.layers; void L.tmfBoard; void L.tmfBoardFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, sm = c.sample(it.t, S._tmSl || (S._tmSl = {})), yaw = sm.yaw + Math.PI;
      S._e.set(0, yaw, Math.sin(T * 1.1 + it.t) * 0.03); const fq = (S._tmbd || (S._tmbd = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.h || 13);
      const m = S._m, s = it.s ?? 1;
      m.compose(p, fq, S._s.set(s, s, s)); L.tmfBoard.add(m); L.tmfBoardFace.add(m, signV(it.idx, 1));
      glowAt(S, p.x, p.y, p.z, 30 * s, WHITEL, 0.07);
    },
    // ---- the commercial's things, each where it's sung ----
    tmfProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      const at = S._tmv || (S._tmv = new THREE.Vector3()); at.set(p.x, it.h ?? 0, p.z);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2); };
      const spot = (k2, cl = WHITEL, r = 40) => poolAt(S, at.x, 0.2, at.z, r * s, cl, k2);
      if (k === 'tv') {
        // the set, its screen on whatever it's showing now; the screen's light on the table
        let cell = 0; for (const [t0, c] of it.cells) if (T >= t0) cell = c;
        const flick = 0.85 + 0.15 * Math.sin(T * 37 + it.t) * Math.sin(T * 11);
        put('tmfTV'); put('tmfScreen', 0, 0, 0, q, s, ck(cell, flick));
        light(-6, 31, 26, 60, cell === 1 ? [1, 0.3, 0.4] : SCREENL, 0.18);
        spot(0.45, cell === 1 ? [1, 0.35, 0.45] : SCREENL, 70);
      } else if (k === 'bowl' || k === 'font') {
        // the bowl, its milk (pink from its moment), loops floating; letters rising out of it
        const font = k === 'font';
        if (font) put('tmfPedestal', 0, 0, 0, q, s);
        // (a bowl you fly over is a shallow one, so you can see into it from the air)
        const y0 = font ? 16 : 0, sy = it.sy ?? 1, mh = (y0 + 13.2 * sy) * s;
        { const w = local(at, yaw, 0, y0 * s, 0, S._o); m.compose(w, q, S._s.set(s, s * sy, s)); L.tmfBowl.add(m); }
        const pink = it.pink ? smooth(it.pink, it.pink + 0.9, T) : 0;
        const mw = local(at, yaw, 0, mh, 0, S._o); m.compose(mw, q, S._s.set((24.6 - 2.6 * (1 - sy)) * s, 1, (24.6 - 2.6 * (1 - sy)) * s)); L.tmfMilk.add(m, kv(pink));
        const e = S._tme || (S._tme = new THREE.Euler()), pq = S._tmpq || (S._tmpq = new THREE.Quaternion());
        for (let j = 0; j < (font ? 0 : 28); j++) {
          const a = hash(j * 3.7 + it.t) * 6.28, r = (3 + hash(j * 1.3) * 19) * s;
          const bob = Math.sin(T * 1.6 + j) * 0.25;
          e.set(Math.PI / 2 + Math.sin(T + j) * 0.2, 0, Math.cos(T * 0.8 + j) * 0.2); pq.setFromEuler(e);
          const w = local(at, yaw, Math.cos(a) * r, mh + 0.2 * s + bob, Math.sin(a) * r, S._o);
          m.compose(w, pq, S._s.set(1.6 * s, 1.6 * s, 1.6 * s)); L.tmfPiece.add(m, pk(LOOPS[j % LOOPS.length], 0.1 + 0.2 * pink));
        }
        // the alphabet: [sung at, letter, row, slot]. Each jumps out of the milk on its letter and hangs
        // in an arch across her way at that row (it.rows: when she's there), three arches she flies
        // through, reading left to right; once she's through one its letters drop back in
        if (it.letters) {
          const c = S.course, tr = S.track, sm = S._tmSm || (S._tmSm = {});
          const lq = S._tmlq || (S._tmlq = new THREE.Quaternion()), g = S._tmlg || (S._tmlg = new THREE.Vector3());
          for (const [t0, li, row, slot] of it.letters) {
            const u = smooth(t0 - 0.1, t0 + 0.22, T);
            if (u <= 0) continue;
            const rt = it.rows[row], n = it.slots[row], a = Math.PI * (1 - (slot + 0.5) / n), R = n > 3 ? 13 : 11;
            c.sample(rt, sm);
            const top = sm.y - 2.2 + R * Math.sin(a), side = R * Math.cos(a);
            const drop = T > rt + 0.25 ? (T - rt - 0.25) : 0;
            if (drop > 1.2) continue;
            tr.ground(rt, side, g);
            const rise = mh - 3 + (top - mh + 3) * Math.min(1.08, u + 0.08 * Math.sin(Math.min(1, u) * Math.PI));
            g.y = Math.max(mh - 3, rise - 30 * drop * drop);
            S._e.set(0, sm.yaw + Math.PI, Math.sin(T * 1.7 + li) * 0.08 + (slot - (n - 1) / 2) * -0.12); lq.setFromEuler(S._e);
            const pop = 1 + 0.3 * Math.exp(-Math.max(0, T - t0) * 6) * (T > t0 ? 1 : 0);
            m.compose(g, lq, S._s.set(0.9 * pop, 0.9 * pop, 1)); L.tmfLetter.add(m, ck(li, 0.9 + 0.7 * Math.exp(-Math.max(0, T - t0) * 3)));
            glowAt(S, g.x, g.y, g.z, 8, GOLDL, 0.25 + 0.5 * Math.exp(-Math.max(0, T - t0) * 3));
          }
        }
        // the vitamins: [said at, letter, across]; each jumps out of the milk on its word and stands over it
        if (it.pops) {
          const sm = S.course.sample(it.t, S._tmSm || (S._tmSm = {}));
          const lq = S._tmlq || (S._tmlq = new THREE.Quaternion());
          for (const [t0, li, dx] of it.pops) {
            const u = smooth(t0 - 0.08, t0 + 0.2, T);
            if (u <= 0) continue;
            const w = local(at, yaw, dx * s, mh + (-4 + 13 * Math.min(1.06, u + 0.06 * Math.sin(Math.min(1, u) * Math.PI))) * s + Math.sin(T * 2 + li) * 0.4, 0, S._o);
            S._e.set(0, sm.yaw + Math.PI, Math.sin(T * 1.5 + li) * 0.1); lq.setFromEuler(S._e);
            const pop = 1.5 * (1 + 0.3 * Math.exp(-Math.max(0, T - t0) * 6) * (T > t0 ? 1 : 0));
            m.compose(w, lq, S._s.set(pop * s, pop * s, 1)); L.tmfLetter.add(m, ck(li, 1.0 + 0.6 * Math.exp(-Math.max(0, T - t0) * 3)));
            glowAt(S, w.x, w.y, w.z, 14 * s, GOLDL, 0.3 + 0.6 * Math.exp(-Math.max(0, T - t0) * 3));
          }
        }
        light(0, y0 + 16 * sy, 0, 54, pink > 0.1 ? PINKL : MILKL, 0.12 + 0.1 * pink);
        spot(0.3, pink > 0.1 ? PINKL : MILKL, 70);
      } else if (k === 'spoon') { put('tmfSpoon', 0, 0, 0, quat('_tmsq', it.rot ?? 0)); light(0, 3, 0, 20, WHITEL, 0.15); }
      else if (k === 'carton') { put('tmfCarton'); spot(0.25, WHITEL, 40); }
      else if (k === 'glass') { put('tmfGlass'); put('tmfGlassShell'); light(0, 10, 0, 26, [1, 0.6, 0.2], 0.2); spot(0.35, [1, 0.62, 0.2], 40); }
      else if (k === 'mascot') {
        // the O with a face: it grins on its word, it winks on its word
        const hop = it.grin ? 1.6 * Math.exp(-Math.max(0, T - it.grin) * 4) * (T > it.grin ? 1 : 0) : 0;
        const at2 = S._tmv2 || (S._tmv2 = new THREE.Vector3()); at2.copy(at); at2.y += hop * s;
        const w0 = local(at2, yaw, 0, 0, 0, S._o); m.compose(w0, q, S._s.set(s, s, s)); L.tmfMascot.add(m); L.tmfGrin.add(m);
        const wink = it.wink ? Math.exp(-Math.pow((T - it.wink - 0.15) / 0.18, 2)) : 0;
        for (const sd of [-1, 1]) {
          const lid = sd > 0 ? 1 - 0.92 * wink : 1;
          const w = local(at2, yaw, sd * 3.1 * s, 21.4 * s, 3.2 * s, S._o);
          m.compose(w, q, S._s.set(s, s * lid, s)); L.tmfEye.add(m);
        }
        light(0, 13, 4, 40, GOLDL, 0.18 + 0.5 * wink + 0.4 * hop / 1.6);
        spot(0.4, GOLDL, 46);
      } else if (k === 'badge') {
        // the blue check: in on its word, turning
        const u = smooth(it.on - 0.15, it.on + 0.15, T);
        if (u <= 0) return;
        const by = S._tmv2 || (S._tmv2 = new THREE.Vector3()); by.copy(at); by.y = 24 * s;
        const w = local(by, yaw, 0, 0, 0, S._o); m.compose(w, quat('_tmbq', Math.sin(T * 1.4) * 0.5), S._s.set(s * u, s * u, s * u)); L.tmfBadge.add(m);
        light(0, 24, 3, 40, BLUEL, 0.35 * u + 0.6 * Math.exp(-Math.max(0, T - it.on) * 3));
        spot(0.5 * u, BLUEL, 50);
      } else if (k === 'spot') {
        // a product shot: a pool of light on the table round one of the songs' own things, a soft
        // column over it, brighter as its line comes
        const on = it.on ? 0.55 + 0.45 * smooth(it.on - 0.6, it.on, T) * (1 - smooth(it.on + 2.5, it.on + 4, T)) : 1;
        const cl = it.c || WARM;
        poolAt(S, at.x, 0.25, at.z, (it.r ?? 34) * s, cl, 0.7 * on);
        glowAt(S, at.x, (it.y ?? 14) * s, at.z, (it.r ?? 34) * 0.9 * s, cl, 0.16 * on);
        glowAt(S, at.x, (it.y ?? 14) * s * 2.2, at.z, 6 * s, WHITEL, 0.5 * on);
      } else if (k === 'target') { put('tmfTarget'); light(0, 22, 2, 34, REDL, 0.2); spot(0.35, REDL, 40); }
      else if (k === 'panel') {
        // the back of the box and its side, stood up on the table like hoardings
        const sc = it.s;
        const w = local(at, yaw, 0, sc * 0.5, 0, S._o); m.compose(w, q, S._s.set(sc * 0.75, sc, sc)); L.tmfPanel.add(m); L.tmfPanelFace.add(m, ck(it.cell, 0.55 + 0.45 * (it.wakeNow ?? 0)));
        light(0, sc * 0.5 + 6, 3, sc * 1.4, WHITEL, 0.1);
      } else if (k === 'down') {
        // a box lying face down in the aisle, its name to the table
        const e = S._tmeY || (S._tmeY = new THREE.Euler(0, 0, 0, 'YXZ')); e.set(Math.PI / 2, yaw + 0.3, 0); const dq = (S._tmdq || (S._tmdq = new THREE.Quaternion())).setFromEuler(e);
        const w = local(at, yaw, 0, 4.1 * s, 0, S._o); m.compose(w, dq, S._s.set(24 * s, 32 * s, 8 * s)); L.tmfBox.add(m, bx(CELL.FREE, TINT.free, 0.05)); L.tmfFlap.add(m, pk(TINT.free, 0.02));
      }
    },
  },
  kits: {
    // the record's boxes in rows both sides: plain boxes of the whole record, or a shelf of one
    // quoted song's cereal (z.song), the cereal itself now and then (z.free), every cereal (z.mix)
    tmfBoxes(S, z, R) {
      const all = songs(), regular = all.filter((s) => !(ALBUM[s.num - 1] || {}).bonus);
      const rows = z.rows ?? 1, clear = keepOut(S.plan);
      for (let t = z.from; t < z.to; t += (z.every ?? 0.6) * (0.85 + R() * 0.3)) for (const side of [-1, 1]) {
        for (let r = 0; r < rows; r++) {
          if (r === 0 && R() < 0.12) continue;
          const tt = t + R() * 0.12 + (side > 0 ? 0.2 : 0) + r * 0.13;
          if (r < 2 && clear.some(([ct, cs, w]) => cs === side && Math.abs(tt - ct) < w)) continue;
          const x = side * ((z.x ?? 34) + r * 30 + R() * 6);
          const s = (0.85 + R() * 0.45) * (1 + r * 0.25);
          const rot = z.aisle ? SIDE(side) : FACE(side) + (R() - 0.5) * 0.3;
          let it;
          if (z.song || (z.free && R() < z.free) || (z.mix && R() < 0.5)) {
            const id = z.song || (z.mix ? QUOTED[Math.floor(R() * QUOTED.length)].id : 'free');
            const pick = z.mix && R() < 0.3 ? 'free' : id;
            it = { t: tt, x, rot, s, parts: 'tmfBox', cell: pick === 'free' ? CELL.FREE : cellOf(pick), tint: TINT[pick], band: BAND[pick], seed: R(), wake0: z.wake0 ?? 0.25 };
            if (z.pours && r === 0 && R() < z.pours) { const t0 = Math.max(z.from, tt - 3.5) + R() * 1.5; Object.assign(it, { tip: 0.4 + R() * 0.2, tipAt: [t0, t0 + 0.5], pour: [t0 + 0.3, z.to], pn: 26, lit: [z.from, z.to + 1] }); }
          } else {
            const sg = regular[Math.floor(R() * regular.length)];
            it = { t: tt, x, rot, s, parts: 'tmfBox', title: true, cell: sg.num - 1, tint: hex3(sg.accent), seed: R(), wake0: z.wake0 ?? 0.25 };
          }
          S.items.push(it);
        }
      }
    },
    // the far boxes: towers of them away to the horizon both sides
    tmfFar(S, z, R) {
      const all = songs();
      for (let t = z.from; t < z.to; t += (z.every ?? 1.3) * (0.8 + R() * 0.4)) for (const side of [-1, 1]) {
        const sg = all[Math.floor(R() * Math.min(42, all.length))];
        S.items.push({ t: t + R() * 0.6, x: side * (150 + R() * 420), rot: FACE(side) + (R() - 0.5) * 0.8, s: 2.2 + R() * 2.4, parts: 'tmfBox', title: true, cell: sg.num - 1, tint: hex3(sg.accent), seed: R(), wake0: 0.2 });
      }
    },
    // the quoted songs' own boxes, big and close, lit for their lines
    tmfHero(S, z) {
      for (const a of z.at) {
        const id = a.song;
        S.items.push({ t: a.t, x: a.x, rot: a.rot ?? FACE(a.x), s: a.s ?? 1.5, parts: 'tmfBox', cell: id === 'free' ? CELL.FREE : cellOf(id), tint: TINT[id], band: BAND[id], lit: a.lit, tip: a.tip, tipAt: a.tipAt, pour: a.pour, wake0: 0.3, ahead: 46 });
      }
    },
    // the set-pieces, each at its moment
    tmfProps(S, z) {
      for (const a of z.at) S.items.push({ ...a, parts: 'tmfProp', rot: a.kind === 'bowl' || a.kind === 'font' ? 0 : (a.rot !== undefined && a.kind !== 'spoon' ? a.rot : FACE(a.x)), s: a.s ?? 1, h: 0, ahead: 46 });
    },
    // cereal spilled on the table both sides
    tmfPiles(S, z, R) {
      for (let t = z.from; t < z.to; t += (z.every ?? 0.9) * (0.7 + R() * 0.6)) {
        const side = R() < 0.5 ? -1 : 1;
        S.items.push({ t, x: side * (16 + R() * 26), rot: 0, parts: 'tmfPile', seed: R() * 100, c: Math.floor(R() * 7), n: 6 + Math.floor(R() * 8), s: 1.6 + R() * 0.8 });
      }
    },
    // starbursts on poles, both sides
    tmfBursts(S, z, R) {
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 1.2) { const side = k++ % 2 ? 1 : -1; S.items.push({ t: t + R() * 0.1, x: side * ((z.x ?? 20) + R() * 4), rot: 0, s: 0.9 + R() * 0.2, cell: z.cell ?? 0, parts: 'tmfBurst', wake0: 0.4 }); }
    },
    // the nave: stained glass both sides
    tmfArches(S, z, R) {
      const cols = [[1, 0.5, 0.3], [0.5, 0.6, 1], [1, 0.8, 0.3], [0.8, 0.4, 1], [0.4, 1, 0.6]];
      // (every other window a step further out: when she's slow they overlap, and two in one plane fought)
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.6) { k++; for (const side of [-1, 1]) S.items.push({ t: t + (side > 0 ? 0.3 : 0), x: side * ((z.x ?? 30) + (k % 2) * 2.2), rot: SIDE(side), s: 1.0, seed: R() * 10, c: cols[Math.floor(R() * cols.length)], parts: 'tmfArch', wake0: 0.2 }); }
    },
  },
});

// where the boxes keep clear: round every set-piece, on its side of the road (its song time, side,
// how far either way in seconds), worked out once from the zones
const KEEP_KITS = new Set(['tmfProps', 'fdProps', 'oaProps', 'judgeBench', 'casket', 'bar', 'lipstick', 'lectern', 'openLocker', 'guestbook', 'cuffs']);
function keepOut(plan) {
  if (plan._tmfKeep) return plan._tmfKeep;
  const out = [];
  for (const z of plan.zones || []) {
    if (!z.kits.some((k) => KEEP_KITS.has(k))) continue;
    if (Array.isArray(z.at)) {
      for (const a of z.at) {
        const t = Array.isArray(a) ? a[0] : a.t, x = Array.isArray(a) ? a[1] : a.x;
        if (x === 0 || x === undefined) continue;
        const big = !Array.isArray(a) && (a.kind === 'tv' || a.kind === 'panel' || a.kind === 'mascot');
        out.push([t, Math.sign(x), big ? 1.3 : 0.95]);
      }
    } else if (typeof z.at === 'number' && z.x) out.push([z.at, Math.sign(z.x), 0.95]);
  }
  for (const z of plan.zones || []) if (z.kits.includes('tmfHero')) for (const a of z.at) out.push([a.t, Math.sign(a.x), 0.75]);
  // and the prize at the end, on its side
  if (plan.finale) out.push([plan.finale.t, Math.sign(plan.finale.x ?? -30), 2.2]);
  return (plan._tmfKeep = out);
}

// ---------- the table ----------
// a plane of tablecloth under her, out to the fog, the gingham fixed to the table (world space)
class Cloth {
  constructor(scene) {
    this.mat = clothMaterial();
    const g = new THREE.PlaneGeometry(9000, 9000, 1, 1); g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -6;
    scene.add(this.mesh);
  }
  update(camera) { this.mesh.position.set(camera.position.x, 0, camera.position.z); }
}

// ---------- the end: the prize inside ----------
// The cereal's own box on its back, open, the loops spilled out of it across the table, and the prize
// stood up in front of it: the packet, the toy board in it, the card behind it.
export class TmfFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.t = cfg.t; this.x = cfg.x ?? -30;
    this.group = new THREE.Group(); scene.add(this.group);
    const art = artSheet(songs());
    this.ready = art.ready;
    // the box, standing, its flaps open, the cereal's own front to the road
    const boxMat = boxMaterial(art.tex, ART_COLS, ART_ROWS, false);
    const geo = TM.cereal();
    const n = geo.attributes.position.count;
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array([CELL.FREE]), 1));
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(TINT.free), 3));
    geo.setAttribute('aK', new THREE.InstancedBufferAttribute(new Float32Array([0.3]), 1));
    this.box = new THREE.InstancedMesh(geo, boxMat, 1); this.box.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(-6, 0, -16), new THREE.Quaternion(), new THREE.Vector3(30, 40, 10)));
    this.box.frustumCulled = false; this.group.add(this.box); this.boxMat = boxMat; void n;
    // the packet: see-through, the card in it (FREE PRIZE INSIDE!), the toy board in front of the card
    const card = TM.packetCard(); const uv = card.attributes.uv;
    const c0 = CELL.PRIZE % ART_COLS, r0 = Math.floor(CELL.PRIZE / ART_COLS);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (c0 + uv.getX(i)) / ART_COLS, 1 - (r0 + 1 - uv.getY(i)) / ART_ROWS);
    this.cardMat = new THREE.MeshBasicMaterial({ map: art.tex, color: new THREE.Color(0.9, 0.9, 0.9) });
    const cardM = new THREE.Mesh(card, this.cardMat);
    this.board = new THREE.Mesh(TM.toyBoard(), selfLit({ roughness: 0.2, metalness: 0.3 }, 1.2));
    const pk2 = new THREE.Mesh(TM.packet(), new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.25, depthWrite: false, emissive: 0x30383e }));
    this.prize = new THREE.Group(); this.prize.add(cardM, this.board, pk2); this.prize.position.set(10, 0, 6); this.prize.rotation.set(-0.12, -0.35, 0); this.prize.scale.setScalar(1.6);
    this.group.add(this.prize);
    // the loops spilled out round them
    const pg = TM.piece(); const N = 120;
    const cols = new Float32Array(N * 3), ks = new Float32Array(N);
    pg.setAttribute('aTint', new THREE.InstancedBufferAttribute(cols, 3)); pg.setAttribute('aK', new THREE.InstancedBufferAttribute(ks, 1));
    this.pieces = new THREE.InstancedMesh(pg, pieceMaterial(), N); this.pieces.frustumCulled = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let j = 0; j < N; j++) {
      const a = hash(j * 2.3) * 3.4 - 1.2, r = 8 + hash(j * 5.1) * 34;
      e.set(Math.PI / 2 + (hash(j) - 0.5) * 0.6, hash(j * 9.1) * 6, 0); q.setFromEuler(e);
      m.compose(new THREE.Vector3(-6 + Math.sin(a) * r, 1.3 + (hash(j * 3.3) < 0.2 ? 1.6 : 0), -6 + Math.cos(a) * r * 0.7), q, new THREE.Vector3(1.9, 1.9, 1.9));
      this.pieces.setMatrixAt(j, m); cols.set(LOOPS[j % LOOPS.length], j * 3); ks[j] = 0.12;
    }
    this.group.add(this.pieces);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    this.fired = false; this.fireK = 0;
    prepare(course, null);
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t, this._sm || (this._sm = {})).yaw + (this.cfg.rot ?? -2.0), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1, w = this._w, T = rider.t;
    this.fireK = this.fired ? Math.min(1, this.fireK + dt * 0.8) : 0;
    // the toy board in the packet glows, more once it's won
    const pulse = 0.5 + 0.5 * Math.sin(songT * 3);
    this.board.material.emissiveIntensity = 0.9 + 0.8 * this.fireK + 0.3 * pulse;
    w.set(10, 17, 7).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 16 * s, CYANL, 0.35 + 0.5 * this.fireK);
    w.set(10, 0, 8).applyMatrix4(this.group.matrixWorld); S.pool(w.x, 0.2, w.z, 40 * s, CYANP, 0.4 + 0.5 * this.fireK);
    // the box behind lit, sparkles going up off the prize once it's won
    w.set(-6, 26, -8).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 60 * s, GOLDL, 0.12 + 0.2 * this.fireK);
    if (this.fireK > 0) for (let j = 0; j < 14; j++) { const f = (songT * 0.45 + j / 14) % 1; w.set(10 + Math.sin(j * 2.1 + songT) * (3 + f * 6), 12 + f * 30, 7 + Math.cos(j * 1.7) * 3).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, (1.6 + f * 1.5) * s, j % 3 ? GOLDL : CYANP, 1.4 * (1 - f) * this.fireK); }
    void T;
  }
}

// ---------- the place, per frame ----------
export class TmfWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.cloth = new Cloth(scene);
    this._c = new THREE.Color(); this._v = new THREE.Vector3();
    // (the art sheet starts drawing now; the finale waits on it)
    artSheet(songs()); titleSheet(songs());
  }
  update(S, dt, camera, time) {
    const P = S.P, t = S.rider.t;
    // the table instead of the town; the far boxes instead of a skyline
    if (S.ground) S.ground.visible = false;
    if (S.skyline) S.skyline.visible = false;
    this.cloth.update(camera);
    LIGHT.uSun.value.set(P.moon ?? 0xffffff).multiplyScalar((P.sunK ?? 1) * 0.9);
    LIGHT.uSunDir.value.set(...(P.moonDir || [0.4, 0.6, 0.7])).normalize();
    LIGHT.uSky.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.8) * 0.5);
    LIGHT.uBounce.value.set(P.bounce ?? 0x806060).multiplyScalar((P.hemiK ?? 1.8) * 0.5);
    LIGHT.uFill.value.set(P.skyGlow ?? 0xffffff).multiplyScalar((P.fillK ?? 0.6) * 0.4);
    LIGHT.uFillDir.value.set(...(P.glowDir || [0, 0.1, 1])).normalize();
    LIGHT.uFog.value.set(P.fog); LIGHT.uFogDensity.value = P.fogDensity; LIGHT.uCam.value.copy(camera.position);
    LIGHT.uTime.value = time; LIGHT.uBeat.value = S.pulse ?? 0;
    // the cloth darker for the night ones, as their sky is
    const cu = this.cloth.mat.uniforms;
    this._c.set(P.horizon ?? 0xffffff); const lum = 0.3 * this._c.r + 0.55 * this._c.g + 0.15 * this._c.b;
    cu.uDark.value = clamp(0.55 - lum, 0, 0.5);
    LIGHT.uNight.value = clamp((0.45 - lum) * 2.5, 0, 1);
    void t;
  }
  draw() {}
}
