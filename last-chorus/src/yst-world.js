// If You See This. A missed-connections post that never wants an answer, ridden through the places
// it almost happened. Tuesday night: the street outside the laundromat, then in through its door:
// the washers and dryers going round on both sides, the table where she folded chaos into squares,
// the change machine, her paints and the cerulean (or teal) handprint on the glass, the thick Russian
// book left open on the bench. Out the back into the dark for the ritual: keys the size of rooms
// pressed, F5, F5, F5, and the page coming back as a spinner of candle-lights. The choruses are the
// street papered with the flyers, IF YOU SEE THIS on every pole, tabs torn off, chairs on the
// sidewalk with coats on them, saved. The band stops and you fly the silence into the coffee shop
// on Seventh: the counter, the cream where she cried, the camera
// that turns it into a scene, the clapperboard, the director's chair nobody sits in, the hundred
// endings coming down crumpled, and the whole picture fading to gray. The ritual again in the
// gray, then colour back for the second chorus. Inside the screen for "I found your name": a grid
// of her photos, her hands with the paint under the nails, the lines of the algorithm, the school,
// the birthday cake, the message bubble typing... and the tab closing. Then the night street at
// full tilt, the laundromat and the café dark as you pass them, doors you'll never open; the
// flyers turning their backs on "I don't want you to see this", the lamps going out ahead of you
// on "don't find me yet"; and the coffee shop at closing, chairs up, one table in the back where
// nobody sits, the laptop open on it. That's the point.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, col } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room } from './summer.js';
import * as Y from './yst-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cleared = (z, t, side) => (z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side));
const WARM_WIN = [1, 0.72, 0.42], COOL_WIN = [0.75, 1, 0.95];
const LAMP = [1, 0.8, 0.55], TUBE = [0.85, 1, 0.95], SCREEN = [0.55, 0.75, 1], CANDLE = [1, 0.7, 0.36], LAMP_POST = [0.22, 0.22, 0.26];

// ---------- materials ----------
// vertex-coloured, and lit a little by itself (so the night doesn't swallow it)
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
const FOG = /* glsl */`float fogK(vec3 w){ return clamp(1.0 - exp(-pow(length(uCam - w) * uFogDensity, 1.5)), 0.0, 1.0); }`;
const fogUniforms = () => ({ uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() } });

// the round glass of a washer or a dryer, the washing going round in it, lit from inside
function drumMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, ...fogUniforms() },
    vertexShader: /* glsl */`
      attribute float aSeed; attribute float aWake; attribute float aKind; varying vec2 vUv; varying float vSeed, vWake, vKind; varying vec3 vW;
      void main(){ vUv = uv; vSeed = aSeed; vWake = aWake; vKind = aKind; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFogDensity; uniform vec3 uFog, uCam;
      varying vec2 vUv; varying float vSeed, vWake, vKind; varying vec3 vW;
      ${FOG}
      vec3 cloth(float k){ k = fract(k); return k < 0.2 ? vec3(0.85, 0.28, 0.26) : k < 0.4 ? vec3(0.25, 0.45, 0.9) : k < 0.6 ? vec3(0.95, 0.92, 0.85) : k < 0.8 ? vec3(0.95, 0.75, 0.25) : vec3(0.25, 0.6, 0.45); }
      void main(){
        vec2 q = vUv * 2.0 - 1.0; float r = length(q);
        float spin = uTime * mix(3.4, 1.4, vKind) * (0.35 + 0.65 * vWake) + vSeed * 40.0;
        vec3 light = mix(vec3(0.7, 0.9, 1.0), vec3(1.0, 0.7, 0.4), vKind) * (0.22 + 0.7 * vWake);
        float a = atan(q.y, q.x) + spin * 0.25;
        float holes = smoothstep(0.24, 0.12, length(fract(vec2(a * 4.0, r * 7.0)) - 0.5));
        vec3 col = light * (0.35 + 0.5 * (1.0 - r)) * (1.0 - 0.4 * holes);
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          float ang = spin + fi * 1.26 + sin(spin * 0.7 + fi) * 0.4;
          vec2 c = vec2(cos(ang), sin(ang)) * (0.42 + 0.2 * sin(fi * 2.3 + vSeed * 9.0));
          c.y -= 0.2 * max(0.0, sin(ang));
          col = mix(col, cloth(vSeed * 7.0 + fi * 0.21) * (0.3 + 0.75 * vWake), smoothstep(0.34, 0.18, length(q - c)) * 0.92);
        }
        if (vKind < 0.5) { float lvl = -0.38 + 0.07 * sin(spin * 1.3 + q.x * 3.0); col = mix(col, col * vec3(0.55, 0.8, 1.0) + vec3(0.02, 0.06, 0.1) * vWake, step(q.y, lvl) * 0.7); }
        float hl = smoothstep(0.1, 0.0, abs(q.x + q.y * 0.9 - 0.35)) * smoothstep(1.0, 0.3, r) * 0.45;
        col = col * smoothstep(1.0, 0.8, r) + vec3(hl);
        gl_FragColor = vec4(mix(col, uFog, fogK(vW)), 1.0);
      }`,
  });
}

// the photo grid inside the screen: each square a picture of somebody's life; hers among them.
// aFall folds a square back off the wall when the tab closes
function tileMaterial(hand) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHand: { value: hand }, ...fogUniforms() },
    vertexShader: /* glsl */`
      attribute float aSeed; attribute float aWake; attribute float aFall; attribute float aKind;
      varying vec2 vUv; varying float vSeed, vWake, vKind, vFall; varying vec3 vW;
      void main(){
        vUv = uv; vSeed = aSeed; vWake = aWake; vKind = aKind; vFall = aFall;
        vec3 p = position;
        float f = aFall * 1.65, y0 = p.y + 0.5;
        p.y = -0.5 + y0 * cos(f); p.z = -y0 * sin(f);
        p *= 1.0 - 0.6 * aFall;
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFogDensity; uniform vec3 uFog, uCam; uniform sampler2D uHand;
      varying vec2 vUv; varying float vSeed, vWake, vKind, vFall; varying vec3 vW;
      ${FOG}
      vec3 hsv(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
      vec3 photo(vec2 uv, float s){
        float k = fract(s * 7.31), hue = fract(s * 3.7);
        vec3 c = mix(hsv(vec3(fract(hue + 0.12), 0.55, 0.42)), hsv(vec3(hue, 0.42, 0.95)), smoothstep(0.15, 0.95, uv.y));
        if (k < 0.3) {          // somewhere by the water, the sun going down
          float hz = 0.38 + 0.1 * fract(s * 13.0);
          c = mix(c, c * 0.45 + vec3(0.04, 0.07, 0.14), step(uv.y, hz));
          c = mix(c, vec3(1.0, 0.88, 0.62), smoothstep(0.12, 0.1, length(uv - vec2(0.3 + 0.4 * fract(s * 5.0), hz + 0.07))));
        } else if (k < 0.55) {  // a cup from above
          float r = length(uv - 0.5);
          c = mix(c, vec3(0.95, 0.93, 0.9), smoothstep(0.31, 0.29, r)); c = mix(c, vec3(0.32, 0.18, 0.09), smoothstep(0.22, 0.2, r));
          c = mix(c, vec3(0.92, 0.82, 0.66), smoothstep(0.035, 0.0, abs(r - 0.11)) * 0.8);
        } else if (k < 0.8) {   // a lit window at night, from across the street
          c = mix(vec3(0.04, 0.05, 0.1), c * 0.3, uv.y);
          vec2 w = abs(uv - vec2(0.5, 0.52)); float win = step(w.x, 0.22) * step(w.y, 0.28);
          c = mix(c, hsv(vec3(0.09, 0.5, 1.0)), win * (1.0 - step(abs(uv.x - 0.5), 0.015)) * (1.0 - step(abs(uv.y - 0.52), 0.015)));
        } else {                 // two people, out of focus
          for (int i = 0; i < 2; i++) { vec2 cc = vec2(0.36 + 0.28 * float(i), 0.45); float d = length((uv - cc) * vec2(1.0, 0.8)); c = mix(c, hsv(vec3(fract(s * 2.0 + float(i) * 0.3), 0.4, 0.3)), smoothstep(0.2, 0.1, d) * 0.85); c = mix(c, vec3(0.9, 0.75, 0.62), smoothstep(0.08, 0.04, length(uv - cc - vec2(0.0, 0.17))) * 0.9); }
        }
        return c;
      }
      void main(){
        vec2 uv = vUv;
        vec3 c = vKind > 0.5 ? texture2D(uHand, uv).rgb : photo(uv, vSeed);
        // a thin pale edge, the way the grid leaves a gap
        float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
        c = mix(vec3(0.02, 0.03, 0.06), c, smoothstep(0.0, 0.03, e));
        c *= (0.35 + 0.95 * vWake) * (1.0 - 0.7 * vFall);
        gl_FragColor = vec4(mix(c, uFog, fogK(vW)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// the flyers: a picture from the flyer atlas on the front, plain paper behind (with the words showing
// through, backwards); lit by the street, more when you pass them in time
function flyerMaterial(atlas) {
  return new THREE.ShaderMaterial({
    uniforms: { tAtlas: { value: atlas }, uLight: { value: new THREE.Color(1, 1, 1) }, ...fogUniforms() },
    vertexShader: /* glsl */`
      attribute float aIdx; attribute float aWake; varying vec2 vUv; varying float vWake; varying vec3 vW;
      void main(){
        float col = mod(aIdx, ${Y.FLYER_COLS.toFixed(1)}), row = floor(aIdx / ${Y.FLYER_COLS.toFixed(1)});
        vUv = vec2((col + 0.01 + 0.98 * uv.x) / ${Y.FLYER_COLS.toFixed(1)}, 1.0 - (row + 1.0 - (0.01 + 0.98 * uv.y)) / ${Y.FLYER_ROWS.toFixed(1)});
        vWake = aWake;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tAtlas; uniform vec3 uLight; uniform float uFogDensity; uniform vec3 uFog, uCam;
      varying vec2 vUv; varying float vWake; varying vec3 vW;
      ${FOG}
      void main(){
        vec3 t = texture2D(tAtlas, vUv).rgb;
        vec3 c;
        if (gl_FrontFacing) c = t * (0.42 + 0.85 * vWake) * (0.55 + 0.45 * uLight);
        else c = mix(vec3(0.72, 0.69, 0.62), vec3(0.45, 0.43, 0.4), (1.0 - dot(t, vec3(0.333))) * 0.35) * (0.3 + 0.55 * vWake);
        gl_FragColor = vec4(mix(c, uFog, fogK(vW)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// something that only glows, in a colour of its own (a shop window, the light round a door)
function glowTint() {
  return new THREE.ShaderMaterial({
    uniforms: { ...fogUniforms() },
    vertexShader: `attribute vec3 aTint; varying vec3 vTint; varying vec3 vW; void main(){ vTint = aTint; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uFogDensity; uniform vec3 uFog, uCam; varying vec3 vTint; varying vec3 vW; ${FOG} void main(){ gl_FragColor = vec4(mix(vTint, uFog, fogK(vW)), 1.0); }`,
    side: THREE.DoubleSide,
  });
}

// ---------- what each thing hands its layer (filled and handed over again and again) ----------
const _drum = { aSeed: 0, aWake: 0, aKind: 0 }, _fly = { aIdx: 0, aWake: 0 }, _tile = { aSeed: 0, aWake: 0, aFall: 0, aKind: 0 }, _tint = { aTint: null };
const drumV = (s, w, k) => { _drum.aSeed = s; _drum.aWake = w; _drum.aKind = k; return _drum; };
const flyV = (i, w) => { _fly.aIdx = i; _fly.aWake = w; return _fly; };
const tileV = (s, w, f, k) => { _tile.aSeed = s; _tile.aWake = w; _tile.aFall = f; _tile.aKind = k; return _tile; };
const tintV = (c) => { _tint.aTint = c; return _tint; };
const _c3 = [0, 0, 0];
const scaled = (c, k) => { _c3[0] = c[0] * k; _c3[1] = c[1] * k; _c3[2] = c[2] * k; return _c3; };

// the flyers' pictures: a few that paper every street, then every line he sings on one
const GENERIC = [
  { text: 'IF YOU SEE THIS', doodle: 'heart' },
  { text: 'IF YOU SEE THIS', doodle: 'washer', ink: '#2a3a8a' },
  { text: "I'M STILL WAITING", doodle: 'chair' },
  { text: 'IF YOU SEE THIS', doodle: 'cup', ink: '#7a1a2a' },
  { text: "I'VE BEEN SAVING YOU A SEAT", doodle: 'chair', ink: '#2a3a8a' },
  { text: 'MEET ME IN THE PLACE WE ALMOST MET', doodle: 'door' },
];
function flyers(S) {
  if (!S.mats.ystFlyerTex) S.mats.ystFlyerTex = Y.flyerAtlas([...GENERIC, ...(S.plan.ystFlyers || [])]);
  return S.mats.ystFlyerTex;
}

let TEX = null;
const tex = () => TEX || (TEX = {
  page: Y.pageTexture(), key: Y.keyTexture(), hand: Y.handTexture(), handPhoto: Y.handPhotoTexture(), post: Y.postTexture(),
  winL: Y.shopWindowTexture('laundry'), winC: Y.shopWindowTexture('cafe'),
  laundry: Y.signTexture('LAUNDROMAT', 'OPEN 24 HRS', '#071624', '#7ff0ff'), cafe: Y.signTexture('COFFEE', 'No. 7', '#0c2a20', '#f0c860'),
});

// ---------- layers ----------
// (every layer a set-piece might use, made before the ride so none compiles mid-ride)
const PROP_LAYERS = ['ystWash', 'ystDrum', 'ystFold', 'ystChange', 'ystQuarter', 'ystBench', 'ystPaints', 'ystBook', 'ystPages', 'ystHand', 'ystCork', 'ystFlyer', 'ystCounter', 'ystPastry', 'ystCase', 'ystCream', 'ystTissue', 'ystTable', 'ystCup', 'ystChair', 'ystCamera', 'ystLight', 'ystLens', 'ystSlate', 'ystSticks', 'ystDirector', 'ystScript', 'ystSchool', 'ystCake', 'ystStore', 'ystStoreWin', 'ystWinL', 'ystWinC', 'ystSignLaundry', 'ystSignCafe'];
const one =(geo, key, k = 0.25, opts = { roughness: 0.6 }, max = 4) => (M) => [geo(), VCm(M, key, k, opts), max, {}];
extend({
  layers: {
    ystWash: one(Y.washTower, 'ystWashM', 0.3, { roughness: 0.35, metalness: 0.15 }, 220),
    ystDrum: (M) => [Y.drumDisc(), M.ystDrumM || (M.ystDrumM = drumMaterial()), 440, { aSeed: 1, aWake: 1, aKind: 1 }],
    ystFold: one(Y.foldTable, 'ystFoldM', 0.3, { roughness: 0.8 }),
    ystChange: one(Y.changeMachine, 'ystChangeM', 0.3, { roughness: 0.4, metalness: 0.4 }),
    ystQuarter: one(Y.quarter, 'ystQuarterM', 0.6, { roughness: 0.2, metalness: 0.8 }, 60),
    ystBench: one(Y.bench, 'ystBenchM', 0.2, { roughness: 0.7 }),
    ystPaints: one(Y.paints, 'ystPaintsM', 0.4, { roughness: 0.5 }),
    ystBook: one(Y.book, 'ystBookM', 0.25, { roughness: 0.8 }),
    ystPages: (M) => [Y.bookPages(), pic(M, 'ystPagesM', tex().page, 0.45), 4, {}],
    ystHand: (M) => [new THREE.PlaneGeometry(1, 1), M.ystHandM || (M.ystHandM = new THREE.ShaderMaterial({ uniforms: { uMap: { value: tex().hand } }, vertexShader: 'attribute vec3 aTint; varying vec2 vUv; varying vec3 vT; void main(){ vUv = uv; vT = aTint; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform sampler2D uMap; varying vec2 vUv; varying vec3 vT; void main(){ float a = texture2D(uMap, vUv).a; if (a < 0.05) discard; gl_FragColor = vec4(vT, a * 0.92); }', transparent: true, depthWrite: false, side: THREE.DoubleSide })), 8, { aTint: 3 }],
    ystCork: one(Y.corkboard, 'ystCorkM', 0.25, { roughness: 0.9 }, 8),
    ystKey: one(Y.keycap, 'ystKeyM', 0.35, { roughness: 0.45 }, 12),
    ystKeyLabel: (M) => [Y.keyLabel(), pic(M, 'ystKeyLabelM', tex().key, 0.7), 12, {}],
    ystSpoke: (M) => [Y.spoke(), M.ystSpokeM || (M.ystSpokeM = glowTint()), 48, { aTint: 3 }],
    ystKeyPlate: (M) => [Y.paint(Y.box(10, 1.2, 10, 0, -0.6, 0), [0.07, 0.075, 0.09]), VCm(M, 'ystKeyPlateM', 0.1, { roughness: 0.6 }), 12, {}],
    ystPole: one(Y.pole, 'ystPoleM', 0.15, { roughness: 0.9 }, 120),
    ystFlyer: (M) => [Y.flyerSheet(), M.ystFlyerM || (M.ystFlyerM = flyerMaterial(M.ystFlyerTex)), 140, { aIdx: 1, aWake: 1 }],
    ystTape: one(Y.flyerTape, 'ystTapeM', 0.3, { roughness: 0.8 }, 140),
    ystChair: one(Y.chair, 'ystChairM', 0.3, { roughness: 0.6 }, 90),
    ystCoat: one(Y.coat, 'ystCoatM', 0.55, { roughness: 0.9 }, 40),
    ystTable: one(Y.cafeTable, 'ystTableM', 0.25, { roughness: 0.5 }, 40),
    ystCup: (M) => [Y.cup(), VCm(M, 'ystCupM', 0.35, { roughness: 0.3 }), 40, {}],
    ystCounter: one(Y.counter, 'ystCounterM', 0.25, { roughness: 0.4, metalness: 0.3 }),
    ystPastry: one(Y.pastries, 'ystPastryM', 0.6, { roughness: 0.6 }),
    ystCase: (M) => [Y.caseGlass(), M.ystCaseM || (M.ystCaseM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.55), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })), 4, {}],
    ystCream: one(Y.creamStation, 'ystCreamM', 0.3, { roughness: 0.4, metalness: 0.3 }),
    ystTissue: one(Y.tissue, 'ystTissueM', 0.4, { roughness: 0.9 }),
    ystCamera: one(Y.filmCamera, 'ystCameraM', 0.15, { roughness: 0.4, metalness: 0.4 }),
    ystLight: one(Y.filmLight, 'ystLightM', 0.15, { roughness: 0.5, metalness: 0.3 }, 8),
    ystLens: (M) => [Y.lightLens(), M.ystLensM || (M.ystLensM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.9) })), 8, {}],
    ystSlate: one(Y.slate, 'ystSlateM', 0.2, { roughness: 0.6 }),
    ystSticks: one(Y.clapSticks, 'ystSticksM', 0.45, { roughness: 0.6 }),
    ystDirector: one(Y.directorChair, 'ystDirectorM', 0.2, { roughness: 0.8 }),
    ystScript: one(Y.scriptChair, 'ystScriptM', 0.3, { roughness: 0.6 }),
    ystCrumple: (M) => [Y.crumple(), VCm(M, 'ystCrumpleM', 0.45, { roughness: 0.9, flatShading: true }), 160, {}],
    ystTile: (M) => [Y.tile(), M.ystTileM || (M.ystTileM = tileMaterial(tex().handPhoto)), 400, { aSeed: 1, aWake: 1, aFall: 1, aKind: 1 }],
    ystWire: (M) => [Y.wire(), M.ystWireM || (M.ystWireM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.4, 2.4) })), 120, {}],
    ystBubble: one(Y.bubble, 'ystBubbleM', 0.9, { roughness: 0.3 }),
    ystSchool: one(Y.school, 'ystSchoolM', 0.3, { roughness: 0.7 }),
    ystCake: one(Y.cake, 'ystCakeM', 0.4, { roughness: 0.6 }),
    ystDoor: one(Y.door, 'ystDoorM', 0.2, { roughness: 0.6 }, 40),
    ystSeam: (M) => [Y.doorSeam(), M.ystSeamM || (M.ystSeamM = glowTint()), 40, { aTint: 3 }],
    ystStore: one(Y.storefront, 'ystStoreM', 0.2, { roughness: 0.8 }, 6),
    ystStoreWin: (M) => [Y.storeWindow(), M.ystWinM || (M.ystWinM = glowTint()), 8, { aTint: 3 }],
    ystWinL: (M) => [Y.storeWindow(), pic(M, 'ystWinLM', tex().winL, 1.1), 4, {}],
    ystWinC: (M) => [Y.storeWindow(), pic(M, 'ystWinCM', tex().winC, 1.1), 4, {}],
    ystSignLaundry: (M) => [Y.storeSign(), pic(M, 'ystSignLM', tex().laundry, 1.4), 4, {}],
    ystSignCafe: (M) => [Y.storeSign(), pic(M, 'ystSignCM', tex().cafe, 1.4), 4, {}],
    ystClosed: one(Y.closedTable, 'ystClosedM', 0.2, { roughness: 0.7 }, 40),
  },
  parts: {
    // a washer with its dryer on top, both going round, brighter for passing in time
    ystWash(S, it, p, q, yaw) {
      const L = S.layers; void L.ystWash; void L.ystDrum;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1, wk = it.wakeNow ?? 0.3;
      p.y = it.h ?? 0;
      m.compose(p, q, S._s.set(s, s, s)); L.ystWash.add(m);
      for (let k = 0; k < 2; k++) {
        const y = k ? 15.6 : 4.6, r = k ? 3.5 : 3.1;
        const w = local(p, yaw, 0, y * s, 5.27 * s, S._o);
        m.compose(w, q, S._s.set(r * s, r * s, 1)); L.ystDrum.add(m, drumV(it.seed + k * 0.37, wk, k));
        if (it.lit) { const g = local(p, yaw, 0, y * s, 7 * s, S._o); glowAt(S, g.x, g.y, g.z, 7 * s, k ? CANDLE : TUBE, 0.12 + 0.3 * wk); }
      }
    },
    // the set-pieces, each where he sings it
    ystProp(S, it, p, q, yaw) {
      const L = S.layers;
      if (!S.track) { for (const k of PROP_LAYERS) void L[k]; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._ystv || (S._ystv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 6, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.5, c = LAMP, r = 40, x = 0, z = 0) => { const w = local(at, yaw, x * s, 0, z * s, S._o); poolAt(S, w.x, (it.h ?? 0) + 0.15, w.z, r * s, c, k2); };
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const wk = it.wakeNow ?? 0.5;
      if (k === 'fold') { put('ystFold'); light(14, 34, TUBE, 0.2); spot(0.4, TUBE); }
      else if (k === 'change') {
        put('ystChange'); light(17.4, 10, [0.4, 0.7, 1], 0.6, 3);
        // a couple of spares: the quarters come out as she goes by
        const t0 = it.spill ?? 1e9;
        if (T > t0) for (let j = 0; j < 9; j++) {
          const u = T - t0 - j * 0.05; if (u < 0) continue;
          const fall = Math.min(u, 0.9);
          const y = Math.max(0.4, 3 - 14 * fall * fall + 6 * fall), x = (j - 4) * 0.5 + Math.sin(j * 7.1) * 1.2 * fall, z = 4 + fall * (5 + (j % 3));
          put('ystQuarter', x, y, z, quat('_ystqq', T * 6 + j, T * 4 + j * 1.7, 0), s * 2.2);
          if (u < 0.6) light(y, 2.2, [1, 0.95, 0.85], 0.8 * (1 - u / 0.6), z, x);
        }
      }
      else if (k === 'bench') { put('ystBench'); if (it.paints) put('ystPaints', -4, 0, 0); if (it.book) { put('ystBook', 3, 6.6, -0.2, q, s * 1.7); put('ystPages', 3, 6.6, -0.2, q, s * 1.7); const fl = Math.sin(T * 3.1) * 0.5 + 0.5; light(11.5, 12, [1, 0.95, 0.85], 0.15 + 0.2 * fl, 0, 4); } light(12, 30, TUBE, 0.15); spot(0.35, TUBE); }
      else if (k === 'hand') {
        // her handprint on the glass, in her blue; on "or maybe teal" it isn't so sure
        const u = it.teal !== undefined ? smooth(it.teal - 0.2, it.teal + 0.8, T) : 0;
        const c = _c3; for (let j = 0; j < 3; j++) c[j] = (Y.CERULEAN[j] * (1 - u) + Y.TEAL[j] * u) * 1.05;
        put('ystWash');
        for (let j = 0; j < 2; j++) { const dw = local(at, yaw, 0, (j ? 15.6 : 4.6) * s, 5.27 * s, S._o); m.compose(dw, q, S._s.set((j ? 3.5 : 3.1) * s, (j ? 3.5 : 3.1) * s, 1)); L.ystDrum.add(m, drumV(it.seed + j * 0.37, 0.8, j)); }
        const w = local(at, yaw, (it.hx ?? -1.2) * s, (it.hy ?? 17.4) * s, 5.72 * s, S._o);
        m.compose(w, quat('_ysthq', 0, 0, it.rz ?? 0.2), S._s.set(8.4 * s, 8.4 * s, 1)); L.ystHand.add(m, tintV(c));
        light(it.hy ?? 17.4, 14, c, 0.3, 8);
      }
      else if (k === 'counter') { put('ystCounter'); put('ystPastry'); put('ystCase'); light(15.7, 16, [1, 0.8, 0.5], 0.5, 3, 11); spot(0.5, LAMP, 34); const st = Math.sin(T * 2.2) * 0.5 + 0.5; light(23 + st * 2, 6 + st * 4, [1, 1, 1], 0.12 + 0.1 * st, 2, -10); }
      else if (k === 'cream') { put('ystCream'); light(18, 22, LAMP, 0.3, 2); spot(0.45); if (it.tissue) { put('ystTable', 14, 0, 2); put('ystCup', 14 - 1.5, 0, 1); put('ystTissue', 14 + 1.5, 0, 2.2); } }
      else if (k === 'table') { put('ystTable'); if (it.cup !== false) put('ystCup', it.cx ?? 0, 0, it.cz ?? 0); for (const [cx, ry] of it.chairs || []) put('ystChair', cx, 0, 0, quat('_ystcq', ry)); light(22, 28, LAMP, 0.25 * (0.5 + wk)); spot(0.4 + 0.2 * wk); }
      else if (k === 'camera') { put('ystCamera'); const rec = it.rec !== undefined ? smooth(it.rec - 0.1, it.rec, T) : 1; light(18.6, 2.4, [1, 0.1, 0.05], (0.6 + 0.6 * Math.sin(T * 6)) * rec, -1.6, 2.6); }
      else if (k === 'light') {
        // a film light: it comes on with a thump of white on its cue
        const on = it.on !== undefined ? smooth(it.on - 0.05, it.on + 0.05, T) : 1;
        put('ystLight'); if (on > 0.02) put('ystLens');
        light(23.5, 16, [1, 0.96, 0.9], 0.9 * on, 4); spot(0.7 * on, [1, 0.96, 0.9], 44, 0, 18);
      }
      else if (k === 'slate') {
        put('ystSlate');
        // the sticks: up, then clapped down on "from a movie"
        const c0 = it.clap ?? 1e9, up = T < c0 ? smooth(c0 - 1.2, c0 - 0.5, T) : 1 - smooth(c0 - 0.02, c0 + 0.06, T);
        put('ystSticks', -4.5, 19.0, 0.05, quat('_ystsq', 0, 0, 0.75 * up));
        if (T > c0 && T < c0 + 0.25) light(19.5, 10, [1, 1, 1], 1.2 * (1 - (T - c0) / 0.25), 1);
      }
      else if (k === 'director') { put('ystDirector'); spot(0.55, [1, 0.96, 0.9], 30); light(30, 30, [1, 0.96, 0.9], 0.18); }
      else if (k === 'script') { put('ystScript'); spot(0.45, [1, 0.96, 0.9], 26); }
      else if (k === 'school') { put('ystSchool'); light(28, 30, SCREEN, 0.2); }
      else if (k === 'cake') { put('ystCake'); for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2; light(15 + Math.sin(T * 9 + j) * 0.15, 2.2, CANDLE, 1.2, Math.sin(a) * 3.8, Math.cos(a) * 3.8); } light(12, 40, CANDLE, 0.25); spot(0.5, CANDLE, 40); }
      else if (k === 'store') {
        // the laundromat and the café from the street, on the way past: lit, or shut for the night
        put('ystStore');
        const lit = it.lit ?? 1;
        put('ystStoreWin', 0, 0, 0, q, s, tintV(scaled(it.sign === 'cafe' ? WARM_WIN : COOL_WIN, 0.11 + 1.1 * lit)));
        put(it.sign === 'cafe' ? 'ystSignCafe' : 'ystSignLaundry');
        if (lit > 0.05) spot(0.6 * lit, it.sign === 'cafe' ? LAMP : TUBE, 34, 0, 10);
      }
      else if (k === 'entrance') {
        // the front of the place as you come up to its door: the shop windows either side lit up, the sign over the door
        const c = it.sign === 'cafe' ? WARM_WIN : COOL_WIN;
        const back = quat('_ystbk', Math.PI);
        for (const sd of [-1, 1]) { put(it.sign === 'cafe' ? 'ystWinC' : 'ystWinL', sd * 30, 1.2, -0.9, back); light(7, 30, c, 0.3, -4, sd * 30); spot(0.6, c, 30, sd * 30, -10); }
        put(it.sign === 'cafe' ? 'ystSignCafe' : 'ystSignLaundry', 0, (it.hh ?? 24) - 12.2, -1.5, back);
        light((it.hh ?? 24) + 1.6, 34, c, 0.3, -3);
      }
      else if (k === 'cork') {
        // the corkboard: the flyer for this line pinned on it
        put('ystCork');
        if (it.idx !== undefined) put('ystFlyer', 0, 2.4, 0.15, q, s * 0.95, flyV(it.idx, 0.4 + 0.6 * wk));
        light(9, 22, LAMP, 0.25 + 0.25 * wk, 4);
      }
    },
    // a key the size of a room: pressed on each F5
    ystKey(S, it, p, q, yaw) {
      const L = S.layers; void L.ystKey; void L.ystKeyLabel; void L.ystKeyPlate;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      let dn = 0, hit = 0;
      for (const t0 of it.press || []) { const u = T - t0; if (u > -0.08 && u < 0.5) { dn = Math.max(dn, u < 0 ? 1 + u / 0.08 : Math.exp(-u * 7)); hit = Math.max(hit, u < 0 ? 0 : Math.exp(-u * 5)); } }
      const ky = (it._cy ?? (it._cy = S.course.sample(it.t, S._ysts || (S._ysts = {})).y)) + (it.dy ?? -6);
      m.compose(p, q, S._s.set(s * 0.5, Math.max(1, (ky - 4 * s) / 1.2), s * 0.5)); L.ystKeyPlate.add(m);
      const side = it.x > 0 ? 1 : -1;
      S._e.set(-1.05, yaw - side * 0.5, 0, 'YXZ'); const kq = (S._ystkq || (S._ystkq = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
      const w = S._ystk || (S._ystk = new THREE.Vector3()); w.set(0, -1.6 * dn * s, 0).applyQuaternion(kq); w.x += p.x; w.y += ky; w.z += p.z;
      m.compose(w, kq, S._s.set(s, s, s)); L.ystKey.add(m); L.ystKeyLabel.add(m);
      glowAt(S, p.x, ky + (6.5 - 1.6 * dn) * s, p.z, (16 + 18 * hit) * s, SCREEN, 0.22 + 1.1 * hit);
      poolAt(S, p.x, p.y + 0.1, p.z, 40 * s, SCREEN, 0.1 + 0.6 * hit);
    },
    // the page reloading: a ring of lights going round, candle-coloured (refreshing as a form of faith)
    ystSpinner(S, it, p, q, yaw) {
      void S.layers.ystSpoke;
      if (!S.track) return;
      const T = S.tNow ?? 0;
      const k = smooth(it.from - 0.6, it.from, T) * (1 - smooth(it.to - 0.3, it.to + 0.3, T));
      if (k < 0.01) return;
      const n = 12, R0 = it.r ?? 16, head = T * (it.speed ?? 5.5), c = Math.cos(yaw), sn = Math.sin(yaw);
      const cy = (it._cy ?? (it._cy = S.course.sample(it.t, S._ysts || (S._ysts = {})).y)) + (it.dy ?? 40);
      for (let j = 0; j < n; j++) {
        const a = j / n * Math.PI * 2;
        let d = (head - a) % (Math.PI * 2); if (d < 0) d += Math.PI * 2;
        const b = Math.exp(-d * 0.9);
        const ox = Math.cos(a) * R0, oy = Math.sin(a) * R0;
        const at = S._ysta || (S._ysta = new THREE.Vector3()); at.set(p.x + ox * c * 0.62, cy + oy * 0.62, p.z - ox * sn * 0.62);
        S._e.set(0, yaw, a - Math.PI / 2); const sq = (S._ystsq2 || (S._ystsq2 = new THREE.Quaternion())).setFromEuler(S._e);
        S._m.compose(at, sq, S._s.set(R0 / 16, R0 / 16, 1)); S.layers.ystSpoke.add(S._m, tintV(scaled(it.c || CANDLE, (0.12 + 2.6 * b) * k)));
        if (b > 0.5) glowAt(S, p.x + ox * c, cy + oy, p.z - ox * sn, 9 * (it.s ?? 1), it.c || CANDLE, 0.5 * b * k);
      }
      glowAt(S, p.x, cy, p.z, R0 * 2.4, it.c || CANDLE, 0.1 * k);
    },
    // a pole with a flyer on it (or a flyer on its own, on a board); it can turn its back on you
    ystFlyer(S, it, p, q, yaw) {
      const L = S.layers; void L.ystPole; void L.ystFlyer; void L.ystTape;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, wk = it.keep ? 1 : (it.wakeNow ?? 0.4);
      // (hung at her height, wherever the road is: the pole goes up to it)
      const fy = it.y !== undefined ? it.y * s : Math.max(5 * s, (it._cy ?? (it._cy = S.course.sample(it.t, S._ysts || (S._ysts = {})).y)) + (it.dy ?? -5) - p.y);
      if (it.pole !== false) { m.compose(p, q, S._s.set(s, (fy + 11 * s) / 22, s)); L.ystPole.add(m); }
      const fl = it.flipAt !== undefined ? smooth(it.flipAt - 0.35, it.flipAt, T) : 0;
      const w = local(p, yaw, 0, fy, 0.75 * s, S._o);
      S._e.set(0, yaw + (it.tilt ?? 0) + fl * Math.PI * 1.04, (it.seed - 0.5) * 0.1 + Math.sin(T * 1.7 + it.seed * 9) * 0.015);
      const fq = (S._ystfq || (S._ystfq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(w, fq, S._s.set(s, s, s)); L.ystFlyer.add(m, flyV(it.idx, wk)); L.ystTape.add(m);
      if (it.lamp !== false) { const g = local(p, yaw, 0, fy + 4.5 * s, 2.5 * s, S._o); glowAt(S, g.x, g.y, g.z, 9 * s, LAMP, (0.06 + 0.16 * wk) * (1 - 0.7 * fl)); }
    },
    // a street lamp that can go out (don't find me yet)
    ystLamp(S, it, p, q, yaw) {
      if (!S.track) { void S.layers.lamp; return; }
      const T = S.tNow ?? 0, m = S._m;
      m.compose(p, q, S._s.set(1.4, 1.4, 1.4)); S.layers.lamp.add(m, tintV(LAMP_POST));
      let k = 1;
      if (it.out !== undefined) { const u = T - it.out; k = u < -0.4 ? 1 : u < 0 ? (Math.sin(T * 60 + it.seed * 20) > 0 ? 1 : 0.3) : Math.max(0.0, 1 - u * 3) * 0.15; }
      const wk = it.wakeNow ?? 0.5, w = local(p, yaw, 0, 7.75 * 1.4, 2.1 * 1.4, S._o);
      glowAt(S, w.x, w.y, w.z, 5, LAMP, (0.5 + 0.8 * wk) * k);
      poolAt(S, w.x, p.y + 0.06, w.z, 18, LAMP, (0.3 + 0.6 * wk) * k);
    },
    // a chair out on the sidewalk, a coat on it: saved
    ystSeat(S, it, p, q, yaw) {
      const L = S.layers; void L.ystChair; void L.ystCoat; void L.ystCup;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1, wk = it.wakeNow ?? 0.4;
      p.y = it.h ?? 0;
      m.compose(p, q, S._s.set(s, s, s)); L.ystChair.add(m);
      if (it.coat !== false) L.ystCoat.add(m);
      else { const w = local(p, yaw, 0, -5.3 * s, 0, S._o); m.compose(w, q, S._s.set(s, s, s)); L.ystCup.add(m); }
      const g = local(p, yaw, 0, 24 * s, 2 * s, S._o);
      glowAt(S, g.x, g.y, g.z, 10 * s, LAMP, 0.35 + 0.7 * wk);
      glowAt(S, g.x, p.y + 12 * s, g.z, 26 * s, LAMP, 0.08 + 0.12 * wk);
      poolAt(S, p.x, p.y + 0.1, p.z, 22 * s, LAMP, 0.55 + 0.45 * wk);
    },
    // a column of her photos, standing in the grid; folded away when the tab closes
    ystTiles(S, it, p, q, yaw) {
      const L = S.layers; void L.ystTile;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, sz = it.size ?? 9;
      const shown = it.on !== undefined ? smooth(it.on - 0.4, it.on, T) : 1;
      const fall = it.fall !== undefined ? smooth(it.fall + it.stagger, it.fall + it.stagger + 0.45, T) : 0;
      if (shown < 0.01 || fall > 0.99) return;
      for (let r = 0; r < (it.rows ?? 4); r++) {
        const w = local(p, yaw, 0, (it.y0 ?? 6) + r * (sz + 0.5) + sz / 2, 0, S._o);
        const sc = sz * (0.6 + 0.4 * shown);
        m.compose(w, q, S._s.set(sc, sc, 1));
        L.ystTile.add(m, tileV(it.seed + r * 0.131, (it.wakeNow ?? 0.5) * shown, fall, it.hand && r === it.handRow ? 1 : 0));
      }
    },
    // the algorithm's lines: who knows who, lighting up toward her
    ystNet(S, it, p, q, yaw) {
      const L = S.layers; void L.ystWire;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      const k = smooth(it.on - 0.5, it.on + 0.5, T) * (1 - smooth(it.off - 0.3, it.off + 0.3, T));
      if (k < 0.01) return;
      const pts = it._pts || (it._pts = []);
      const nodes = it.nodes;
      for (let i = 0; i < nodes.length; i++) { const n = nodes[i]; const v = pts[i] || (pts[i] = new THREE.Vector3()); local(p, yaw, n[0], n[1], n[2], v); }
      const up = S._ystup || (S._ystup = new THREE.Vector3(0, 1, 0));
      for (let e = 0; e < it.edges.length; e++) {
        const [a, b, d] = it.edges[e];
        const lit = smooth(it.on + d * 0.5, it.on + d * 0.5 + 0.3, T) * k;
        if (lit < 0.02) continue;
        const A = pts[a], B = pts[b], len = A.distanceTo(B);
        m.lookAt(B, A, up); m.scale(S._s.set(lit, lit, len)); m.setPosition(A); L.ystWire.add(m);
      }
      for (let i = 0; i < nodes.length; i++) { const v = pts[i], hub = i === 0; glowAt(S, v.x, v.y, v.z, hub ? 9 : 4, hub ? [1, 0.85, 0.6] : SCREEN, (hub ? 1.4 : 0.7) * k); }
    },
    // the message, typed and not sent: the dots going, then stopping, then the bubble taken back
    ystBubble(S, it, p, q, yaw) {
      const L = S.layers; void L.ystBubble;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      const grow = smooth(it.at - 0.4, it.at, T), gone = smooth(it.del, it.del + 0.9, T);
      const sc = s * grow * (1 - gone);
      if (sc < 0.01) return;
      const ry = S.course.sample(it.t, S._ysts || (S._ysts = {})).y;
      const w = local(p, yaw, 0, ry + (it.y ?? 16), 0, S._o);
      S._e.set(0, yaw + Math.PI, 0); const fq = (S._ystbq || (S._ystbq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(w, fq, S._s.set(sc, sc, sc)); L.ystBubble.add(m);
      const typing = T < it.stop;
      for (let j = 0; j < 3; j++) {
        const b = typing ? Math.max(0, Math.sin(T * 7 - j * 0.9)) : 0.25;
        const d = local(w, yaw, (j - 1) * 3.6 * sc, (1.2 * b) * sc, -1.4 * sc, S._o);
        glowAt(S, d.x, d.y, d.z, 2.4 * sc, [1, 1, 1], 0.7 + 0.8 * b);
      }
      glowAt(S, w.x, w.y, w.z, 30 * sc, SCREEN, 0.18);
    },
    // a door that stays shut, the light on behind it
    ystDoor(S, it, p, q, yaw) {
      const L = S.layers; void L.ystDoor; void L.ystSeam;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1, wk = it.wakeNow ?? 0.4;
      m.compose(p, q, S._s.set(s, s, s)); L.ystDoor.add(m); L.ystSeam.add(m, tintV(scaled(LAMP, 1.2 + 1.8 * wk)));
      const w = local(p, yaw, 0, 1, 4 * s, S._o); poolAt(S, w.x, p.y + 0.08, w.z, 14 * s, LAMP, 0.25 + 0.5 * wk);
      const g = local(p, yaw, 0, 10 * s, 1.5 * s, S._o); glowAt(S, g.x, g.y, g.z, 14 * s, LAMP, 0.08 + 0.18 * wk);
    },
    // a crumpled page: one of the hundred endings, coming down
    ystCrumple(S, it, p, q, yaw) {
      void S.layers.ystCrumple;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, u = T - it.drop;
      if (u < 0) return;
      const fall = Math.min(1, u / 0.85);
      p.y = (it.h ?? 0) + (it.y0 ?? 26) * (1 - fall * fall) + 1.2 * (it.s ?? 1);
      S._e.set(it.seed * 9 + u * 3 * (1 - fall), it.seed * 17, u * 2 * (1 - fall));
      const cq = (S._ystcr || (S._ystcr = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, cq, S._s.set(it.s ?? 1.4, it.s ?? 1.4, it.s ?? 1.4)); S.layers.ystCrumple.add(m);
    },
    // a table at closing, the chairs up on it
    ystClosed(S, it, p, q) { void S.layers.ystClosed; if (!S.track) return; const m = S._m, s = it.s ?? 1; p.y = it.h ?? 0; m.compose(p, q, S._s.set(s, s, s)); S.layers.ystClosed.add(m); },
  },
  kits: {
    ystProps(S, z) {
      flyers(S);
      for (const c of z.at) {
        const it = { ...c, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), h: 0, parts: 'ystProp', ahead: c.ahead ?? 40, seed: c.seed ?? 0.5, wake0: c.wake0 ?? 0.4 };
        if (c.kind === 'cork') it.idx = flyerIndex(S, c.line);
        if (c.kind === 'entrance') it.rot = c.rot ?? 0;
        if (c.kind === 'store') it.rot = c.rot ?? SIDE(c.x);
        S.items.push(c.floor ? onFloor(S, it) : it);
      }
    },
    // the washers and dryers along both walls, a gap wherever something else stands
    ystWashers(S, z, R) {
      for (const side of [-1, 1]) for (let t = z.from + (side > 0 ? 0.17 : 0); t < z.to; t += z.every ?? 0.34) {
        if (cleared(z, t, side)) continue;
        S.items.push(onFloor(S, { t, x: side * (z.x ?? 25), rot: SIDE(side), s: 1, seed: R(), parts: 'ystWash', wake0: 0.3, lit: R() < 0.5, ahead: 40 }));
      }
    },
    ystKeys(S, z) { for (const c of z.at) S.items.push({ t: c.t, x: c.x, rot: 0, s: c.s ?? 1, press: c.press, h: 0, parts: 'ystKey', seed: 0.5 }); },
    ystSpinner(S, z) { S.items.push({ t: z.at, x: 0, rot: 0, from: z.from, to: z.to, dy: z.dy, r: z.r, s: z.s, speed: z.speed, c: z.c, parts: 'ystSpinner', h: 0, seed: 0.5, ahead: 44 }); },
    // every line he sings, on a flyer: on a pole outside, on a corkboard inside
    ystFlyers(S, z) {
      flyers(S);
      (S.plan.ystFlyers || []).forEach((f, i) => {
        if (f.cork) return;
        const side = f.side ?? (i % 2 ? -1 : 1), t = f.t + (f.lead ?? 1.4);
        const it = { t, x: side * (f.x ?? 19), rot: FACE(side) + (f.turn ?? 0), s: f.s ?? 1.25, y: f.y, idx: GENERIC.length + i, flipAt: f.flip, pole: f.pole, keep: true, seed: (i * 0.37) % 1, parts: 'ystFlyer', h: 0, wake0: 1 };
        S.items.push(f.floor ? onFloor(S, it) : it);
      });
    },
    // the street at night: brick fronts, the lamps, a flyer on every other pole, chairs saved on the sidewalk
    ystStreet(S, z, R) {
      flyers(S);
      const bricks = [0x8a5244, 0x9a6050, 0x7a4a42, 0xa86e58, 0x6e4a4a, 0x8a6a62];
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.33 + R() * 0.08) {
          if (cleared(z, t, side)) continue;
          S.items.push({ t, x: side * ((z.x ?? 27) + R() * 1.5), rot: SIDE(side), s: 0.95 + R() * 0.1, sy: 0.6 + R() * 0.3, parts: 'tenement', tint: col(pick(R, bricks)), seed: R(), escape: R() < 0.55, wake0: z.wake0 ?? 0.45 });
          if (R() < 0.5) S.items.push({ t: t + R() * 0.2, x: side * (52 + R() * 40), rot: SIDE(side), s: 0.9 + R() * 0.3, sy: 0.7 + R() * 0.8, parts: 'block', tint: col(pick(R, bricks)), seed: R(), wake0: 0.35, noShop: true });
        }
      }
      for (let t = z.from; t < z.to; t += 0.42) for (const side of [-1, 1]) {
        const out = z.out && t > z.out[0] && t < z.out[1] ? t - (z.out[2] ?? 1.2) : undefined;
        S.items.push({ t, x: side * 14.5, rot: SIDE(side), parts: 'ystLamp', seed: R(), out });
      }
      if (z.flyers !== false) for (let t = z.from + 0.3; t < z.to; t += (z.every ?? 0.8) + R() * 0.4) {
        const side = R() < 0.5 ? -1 : 1;
        if (cleared(z, t, side)) continue;
        const flip = z.flip && t > z.flip[0] && t < z.flip[1] ? t - (z.flip[2] ?? 1.3) : undefined;
        S.items.push({ t, x: side * (18.5 + R() * 1.5), rot: FACE(side) + (R() - 0.5) * 0.3, s: 1.1 + R() * 0.2, dy: -9 + R() * 6, idx: Math.floor(R() * GENERIC.length), seed: R(), flipAt: flip, parts: 'ystFlyer', wake0: 0.3 });
      }
      if (z.seats) for (let t = z.from + 0.6; t < z.to; t += z.seats + R() * 0.3) {
        const side = R() < 0.5 ? -1 : 1;
        if (cleared(z, t, side)) continue;
        S.items.push({ t, x: side * (21 + R() * 2), rot: FACE(side) + (R() - 0.5) * 0.5, s: 1.05, coat: R() < 0.7, seed: R(), parts: 'ystSeat', wake0: 0.35 });
      }
    },
    // one chair, saved, in a pool of light by the road
    ystSeat(S, z) { S.items.push({ t: z.at, x: z.x, rot: FACE(z.x) + (z.turn ?? 0), s: z.s ?? 1.2, coat: z.coat, seed: 0.5, parts: 'ystSeat', wake0: 1, keepLit: true }); },
    // the grid: her photos in columns either side, folding away when the tab closes
    ystGrid(S, z, R) {
      for (const side of [-1, 1]) for (let t = z.from; t < z.to; t += z.every ?? 0.32) {
        if (cleared(z, t, side)) continue;
        const hand = z.hand && Math.abs(t - z.hand) < (z.every ?? 0.32) * 0.6 && side === (z.handSide ?? 1);
        S.items.push({ t, x: side * (z.x ?? 22) + side * (R() - 0.5) * 1.2, rot: SIDE(side) + side * 0.12, rows: z.rows ?? 4, size: z.size ?? 9, y0: z.y0, seed: R(), on: z.on !== undefined ? Math.max(z.on, t - (z.lead ?? 6)) : undefined, fall: z.fall, stagger: R() * 0.35 + Math.max(0, (t - z.fall) * 0.12), hand, handRow: 1, parts: 'ystTiles', wake0: 0.45 });
      }
    },
    ystNet(S, z, R) {
      const nodes = [[0, z.y ?? 70, z.depth ?? 60]];
      for (let k = 0; k < (z.n ?? 22); k++) { const a = R() * Math.PI * 2, r = 30 + R() * 70; nodes.push([Math.cos(a) * r, (z.y ?? 70) - 25 + R() * 60, (z.depth ?? 60) + Math.sin(a) * r * 0.6]); }
      const edges = [];
      for (let i = 1; i < nodes.length; i++) {
        const d = Math.hypot(nodes[i][0], nodes[i][1] - nodes[0][1]) / 100;
        edges.push([i, 0, 0.8 + d * 2]);
        let best = -1, bd = 1e9; for (let j = 1; j < nodes.length; j++) if (j !== i) { const dd = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1], nodes[i][2] - nodes[j][2]); if (dd < bd) { bd = dd; best = j; } }
        if (best > 0 && R() < 0.8) edges.push([i, best, d * 2]);
      }
      S.items.push({ t: z.at, x: 0, rot: 0, nodes, edges, on: z.on, off: z.off, parts: 'ystNet', h: 0, seed: 0.5, ahead: 44 });
    },
    ystBubble(S, z) { S.items.push({ t: z.at2 ?? z.at + 3, x: z.x ?? 0, rot: 0, at: z.at, stop: z.stop, del: z.del, y: z.y, s: z.s ?? 1.6, parts: 'ystBubble', h: 0, seed: 0.5, ahead: 44 }); },
    // doors you'll never open, along both sides, the light on behind them
    ystDoors(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.1, x: side * ((z.x ?? 22) + R() * 2), rot: FACE(side) - side * 0.2, s: (z.s ?? 1.2) * (0.92 + R() * 0.16), seed: R(), parts: 'ystDoor', wake0: 0.4 }); },
    // the hundred endings, crumpled, coming down on the café's floor and tables
    ystCrumples(S, z, R) {
      for (let j = 0; j < (z.n ?? 100); j++) {
        const t = z.from + R() * (z.to - z.from), side = R() < 0.5 ? -1 : 1;
        S.items.push(onFloor(S, { t, x: side * (12 + R() * 16), rot: 0, s: 1.1 + R() * 0.8, drop: Math.min(t - 0.6, z.start + R() * (z.spread ?? 4)), y0: 24 + R() * 6, seed: R(), parts: 'ystCrumple', ahead: 40 }));
      }
    },
    ystClosing(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.7) for (const side of [-1, 1]) { if (cleared(z, t, side)) continue; S.items.push(onFloor(S, { t: t + R() * 0.2, x: side * ((z.x ?? 21) + R() * 4), rot: R() * 0.5, s: 1, seed: R(), parts: 'ystClosed', ahead: 40 })); } },
  },
});

// a line's flyer, by its words (for the corkboards indoors)
function flyerIndex(S, text) {
  flyers(S);
  const i = (S.plan.ystFlyers || []).findIndex((f) => f.text === text);
  return i < 0 ? 0 : GENERIC.length + i;
}

// ---------- the laundromat and the coffee shop ----------
const ringFlat = (W, H) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const PLACE = {
  rings: { flat: ringFlat },
  ringOf: () => 'flat',
  styles: { laundry: 0, cafe: 1, closed: 2 },
  dims: { laundry: [31, 34], cafe: [32, 30], closed: [40, 30] },
  lights: (id) => ({ 0: [12, 6], 1: [14, 7], 2: [21, 10] }[id] || null),
};
function placeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyLo: { value: new THREE.Color(0x1a1a34) }, uSkyHi: { value: new THREE.Color(0x05060f) }, uWin: { value: new THREE.Color(0xffd0a0) }, uNight: { value: 1 }, uRain: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uNight, uRain; uniform vec3 uFog, uCam, uLight, uSkyLo, uSkyHi, uWin;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      float box2(vec2 p, vec2 a, vec2 b){ return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float notCap = part == 6 ? 0.0 : 1.0;
        float wa = part == 6 ? x : (side > 0.0 ? along + 5.0 : along);
        vec3 glow = vec3(0.0); vec3 col;
        if (part == 7) {
          // the building from the street: brick, the flats upstairs (a few lit), a cornice
          vec2 br = vec2(x / 1.6 + 0.5 * mod(floor(h / 0.7), 2.0), h / 0.7);
          float mortar = 1.0 - edge(fract(br), 0.06);
          vec3 brick = st == 0 ? vec3(0.34, 0.2, 0.17) : vec3(0.28, 0.17, 0.15);
          col = mix(brick * (0.8 + 0.3 * h2(floor(br))), vec3(0.42, 0.4, 0.38), mortar) * 0.75;
          vec2 wq = vec2(x / 9.0, (h - 4.0) / 9.0); vec2 wf = fract(wq);
          float win = step(30.0, h) * box2(wf, vec2(0.28, 0.2), vec2(0.72, 0.82));
          float lit = step(0.6, h2(floor(wq) + 3.0));
          col = mix(col, mix(vec3(0.03, 0.035, 0.05), uWin * 0.9, lit), win); glow += uWin * win * lit * 0.7;
          col = mix(col, vec3(0.6, 0.58, 0.55), step(abs(fract(h / 9.0 + 0.3) - 0.5), 0.03) * 0.5);
        }
        else if (part == 8) { col = st == 1 ? vec3(0.1, 0.22, 0.16) : vec3(0.75, 0.78, 0.8); glow += vec3(0.05); }
        else if (part == 0) {
          if (st == 0) {
            // linoleum: cream and mint squares, worn where everyone walks
            vec2 q = vec2(x, along) / 4.0;
            col = mix(vec3(0.86, 0.84, 0.76), vec3(0.5, 0.66, 0.62), mod(floor(q.x) + floor(q.y), 2.0)) * (0.9 + 0.1 * edge(fract(q), 0.04));
            col *= 0.9 + 0.1 * h2(floor(q * 3.0));
            // the tubes overhead, mirrored in it
            col += vec3(0.25, 0.3, 0.28) * step(abs(abs(x) - 10.0), 3.0) * smoothstep(3.0, 0.0, abs(mod(along, 12.0) - 6.0));
          } else {
            // old floorboards, a runner by the door
            vec2 pl = vec2(x / 1.3, along / 8.0 + 0.37 * floor(x / 1.3)); float pid = h2(floor(pl));
            col = vec3(0.36, 0.22, 0.13) * (0.75 + 0.4 * pid) * (0.86 + 0.14 * edge(fract(pl), 0.03));
            if (st == 2) col *= 0.75;
          }
        }
        else if (part == 3) {
          if (st == 0) {
            vec2 cq = vec2(x / 4.0, along / 4.0);
            col = vec3(0.6, 0.63, 0.62) * (0.88 + 0.12 * edge(fract(cq), 0.05));
            float tube = step(abs(abs(x) - 10.0), 2.2) * step(abs(mod(along, 12.0) - 6.0), 3.2);
            col = mix(col, vec3(0.9), tube); glow += vec3(0.8, 0.95, 0.9) * tube * 0.75;
          } else {
            // dark beams across, pressed tin between
            float beam = step(0.82, fract(along / 7.0));
            vec2 tq = fract(vec2(x, along) / 1.6);
            col = mix(vec3(0.42, 0.36, 0.3) * (0.85 + 0.15 * edge(tq, 0.2)), vec3(0.16, 0.1, 0.07), beam);
            if (st == 2) col *= 0.7;
          }
        }
        else {
          if (st == 0) {
            // white tile to the chair rail, mint paint above, a row of windows high up onto the night
            col = vec3(0.5, 0.62, 0.58);
            vec2 tq = vec2(wa / 1.2 + 0.5 * mod(floor(h / 0.8), 2.0), h / 0.8);
            col = mix(col, vec3(0.74, 0.76, 0.75) * (0.9 + 0.1 * edge(fract(tq), 0.08)), step(h, 9.0));
            col = mix(col, vec3(0.25, 0.52, 0.48), step(abs(h - 9.2), 0.35));
            float per = 16.0; vec2 wv = vec2(mod(wa, per), h);
            float win = notCap * box2(wv, vec2(1.5, 25.0), vec2(14.5, 31.5));
            vec3 sky = mix(uSkyLo, uSkyHi, clamp((h - 25.0) / 6.5, 0.0, 1.0));
            vec2 fq = vec2((wv.x - 1.5) / 2.6, (wv.y - 25.0) / 2.2); vec2 ff = fract(fq);
            float far = step(0.72, h2(floor(fq) + floor(wa / per) * 7.0)) * box2(ff, vec2(0.2, 0.25), vec2(0.8, 0.75)) * step(26.0, h) * uNight;
            // the rain on them
            float drops = step(0.985, h2(floor(vec2(wv.x * 3.0, wv.y * 2.0 + uTime * 6.0 + floor(wv.x * 3.0) * 0.37)))) * uRain;
            vec3 glass = sky + uWin * far * 0.8 + vec3(0.5) * drops;
            col = mix(col, glass, win); glow += glass * win * 0.55;
            col = mix(col, vec3(0.86, 0.88, 0.87), notCap * win * clamp(step(abs(wv.x - 8.0), 0.22) + (1.0 - edge(vec2((wv.x - 1.5) / 13.0, (wv.y - 25.0) / 6.5), 0.04)), 0.0, 1.0));
            // a clock between the windows: twenty past something
            vec2 cv = vec2(mod(wa + 8.0, 64.0) - 8.0, h - 28.0); float cr = length(cv);
            col = mix(col, vec3(0.96), notCap * step(cr, 2.4)); col = mix(col, vec3(0.15), notCap * step(abs(cr - 2.4), 0.2));
            float hand1 = step(abs(dot(cv, vec2(0.9, -0.43))), 0.15) * step(dot(cv, vec2(0.43, 0.9)), 0.0) * step(-1.6, dot(cv, vec2(0.43, 0.9)));
            col = mix(col, vec3(0.1), notCap * hand1 * step(cr, 2.0));
          } else {
            // brick to the shoulder, cream plaster above; the big windows onto the wet street; chalkboards between
            col = vec3(0.86, 0.78, 0.62);
            vec2 br = vec2(wa / 1.6 + 0.5 * mod(floor(h / 0.7), 2.0), h / 0.7);
            vec3 brick = mix(vec3(0.46, 0.22, 0.16) * (0.8 + 0.35 * h2(floor(br))), vec3(0.62, 0.56, 0.5), 1.0 - edge(fract(br), 0.07));
            col = mix(col, brick, step(h, 10.0));
            col = mix(col, vec3(0.2, 0.12, 0.08), step(abs(h - 10.2), 0.3));
            float per = 30.0; vec2 wv = vec2(mod(wa, per), h);
            float win = notCap * box2(wv, vec2(2.0, 4.0), vec2(16.0, 24.0));
            vec3 sky = mix(uSkyLo * 1.4, uSkyHi, clamp((h - 4.0) / 20.0, 0.0, 1.0));
            float streak = smoothstep(0.92, 1.0, h2(vec2(floor(wv.x * 4.0), 0.0))) * fract(h * 0.12 + uTime * (0.6 + h2(vec2(floor(wv.x * 4.0), 1.0)))) * uRain;
            vec3 glass = sky;
            float wid = floor(wa / per);
            for (int k = 0; k < 5; k++) {
              float fk = float(k);
              vec2 bc = vec2(3.5 + 11.0 * h2(vec2(wid, fk)), 6.0 + 15.0 * h2(vec2(fk, wid + 3.0)));
              float br = 0.9 + 1.5 * h2(vec2(wid + fk, 7.0));
              vec3 bcol = h2(vec2(fk + 2.0, wid)) < 0.6 ? uWin : vec3(0.55, 0.72, 1.0);
              glass += bcol * smoothstep(br, br * 0.4, length(wv - bc)) * 0.6 * clamp(uNight, 0.3, 1.0);
            }
            glass += vec3(0.25, 0.3, 0.35) * streak;
            if (st == 2) glass *= 0.6;
            col = mix(col, glass, win); glow += glass * win * 0.6;
            col = mix(col, vec3(0.14, 0.1, 0.07), notCap * clamp(box2(wv, vec2(1.2, 3.2), vec2(16.8, 24.8)) - win + step(abs(wv.x - 9.0), 0.25) * win, 0.0, 1.0));
            // the chalkboard between them: today's things, written and rubbed out
            vec2 cv = vec2(mod(wa + 6.0, per), h);
            float board = notCap * box2(cv, vec2(0.0, 12.0), vec2(9.0, 21.0));
            vec2 sq = vec2(cv.x * 3.0, floor(cv.y * 1.1));
            float chalk = step(0.55, h2(vec2(floor(sq.x * 0.7), sq.y))) * step(0.6, fract(cv.y * 1.1)) * step(1.0, cv.x) * step(cv.x, 8.0);
            col = mix(col, mix(vec3(0.08, 0.1, 0.09), vec3(0.75), chalk * 0.6), board);
            col = mix(col, vec3(0.3, 0.2, 0.12), notCap * clamp(box2(cv, vec2(-0.4, 11.6), vec2(9.4, 21.4)) - board, 0.0, 1.0));
            if (st == 2) col *= 0.75;
          }
        }
        col *= uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the table in the back, where nobody sits ----------
export class YstFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery;
    this.t = cfg.t; this.x = cfg.x ?? -36;
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = selfLit({ roughness: 0.6 }, 0.22);
    const add = (geo, x, y, z, ry = 0, m = mat) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; this.group.add(o); return o; };
    // (its near side faces the road: her chair pulled out on this side, the laptop open toward it,
    // and across the table the other chair, saved, the coat over it)
    add(Y.backTable(), 0, 0, 0);
    add(Y.chair(), 4.5, 0, 10.5, Math.PI + 0.6);
    add(Y.chair(), 0, 0, -9.4, 0);
    add(Y.coat(), 0, 0, -9.4, 0);
    add(Y.laptop(), -1.5, 0, 2.2, 0.15);
    add(Y.laptopScreen(), -1.5, 0, 2.2, 0.15, new THREE.MeshBasicMaterial({ map: tex().post, color: new THREE.Color(1.6, 1.6, 1.7), side: THREE.DoubleSide }));
    const cupG = Y.cup(); cupG.translate(0, 0.3, 0); add(cupG, 5.2, 0, 2.6);
    this.group.scale.setScalar(cfg.s ?? 1.5);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    prepare(this.course, null);
    track.ground(this.t, this.x, this._p); this._p.y = floorAt(this.course, this.t);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.5;
    this._w.set(0, 23, 0).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 12 * s, LAMP, 1.2);
    S.glow(this._w.x, this._w.y - 6 * s, this._w.z, 34 * s, LAMP, 0.16);
    S.pool(this._w.x, this._p.y + 0.2, this._w.z, 34 * s, LAMP, 0.85);
    this._w.set(-1.5, 18.5, 1.2).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 10 * s, SCREEN, 0.5 + 0.08 * Math.sin(songT * 2.1));
  }
}

// ---------- the place, per frame ----------
// (the song's own shaders, handed the clock, the fog and where the camera is)
const SHADED = ['ystDrumM', 'ystTileM', 'ystFlyerM', 'ystSeamM', 'ystWinM', 'ystSpokeM'];
const ROW2 = [-10, 10], ROW1 = [0];
export class YstWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = placeMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, PLACE));
    this._g = new THREE.Vector3();
    this.gray = S.plan.gray || null;
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyLo.value.set(P.horizon); u.uSkyHi.value.set(P.zenith); u.uWin.value.set(P.window); u.uNight.value = clamp(P.stars ?? 0, 0, 1) * 2; u.uRain.value = P.rain ?? 0;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    const M = S.town.mats;
    for (const k of SHADED) {
      const m = M[k]; if (!m) continue;
      if (m.uniforms.uTime) m.uniforms.uTime.value = time;
      m.uniforms.uFog.value.set(P.fog); m.uniforms.uFogDensity.value = P.fogDensity; m.uniforms.uCam.value.copy(camera.position);
      if (m.uniforms.uLight) m.uniforms.uLight.value.set(P.skyLight ?? 0xffffff);
    }
    // "I like you better in the fade to gray display": the colour goes out of everything until the chorus
    if (this.gray) {
      const [a, b, c] = this.gray;
      const k = smooth(a, b, t) * (t < c ? 1 : 0);
      if (k > 0) S.drain = Math.max(S.drain || 0, k * 1.5);
    }
  }
  // the lights overhead: the fluorescent tubes in the laundromat, the pendants in the café
  draw(T) {
    const g = this._g;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      const laundry = r.style === 0, closed = r.style === 2;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        for (const x of laundry ? ROW2 : ROW1) {
          this.S.track.ground(f.t, x, g);
          T.glow(g.x, fy + r.H - 1.2, g.z, laundry ? 9 : 7, laundry ? TUBE : LAMP, laundry ? 0.35 : (closed ? 0.5 : 0.9));
          T.pool(g.x, fy + 0.08, g.z, laundry ? 26 : 30, laundry ? TUBE : LAMP, laundry ? 0.2 : (closed ? 0.12 : 0.3));
        }
      }
    }
  }
}
