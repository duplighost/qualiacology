// Your Apartment Smells Like Summer: her rooms. The walls are old paper with faded stripes and
// little flowers, honey floorboards in the living room, the dusty rose carpet in the bedroom, the
// kitchen's black and white tiles; a window in every stretch with the city in it, sheers at the
// sides; fairy lights pinned along the top of every wall (they chase in the last chorus). The war
// inside the wall, the neighbours fighting through the paint, the busted hallway light. Her
// building's front with her window open, lit, a curtain out of it. After the walls fall the floor
// runs on into the tar of the roof. (Room itself is summer.js's: this is only the table and paint.)

import * as THREE from 'three';
import { AA_GLSL } from './aa.js';
import { U } from './yas-kit.js';

// ring: the outline across the course; part: 0 floor, 1/2 walls, 3 ceiling (caps: 6 wall, 7 front, 8 trim)
const RINGS = {
  apartment: (W = 38, H = 38) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-26, 0, 1, 0], [-13, 0, 1, 0], [0, 0, 1, 0], [13, 0, 1, 0], [26, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ],
  hallway: (W = 13, H = 30) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-6, 0, 1, 0], [0, 0, 1, 0], [6, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ],
};
// the same rooms as before (living 0, bedroom 1, hallway 2, kitchen 3)
export const YAS_ROOMS = {
  rings: RINGS,
  ringOf: (s) => (s === 'hallway' ? 'hallway' : 'apartment'),
  styles: { living: 0, bedroom: 1, hallway: 2, kitchen: 3 },
  dims: { living: [38, 38], bedroom: [38, 38], kitchen: [38, 38], hallway: [13, 30] },
  lights: (id) => (id === 2 ? [24, 0] : [64, 32]),
};

export function yasRoomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffc070) }, uLight: { value: new THREE.Color(1, 1, 1) }, uCity: { value: new THREE.Color(0x3a2a4a) },
      uSkyTop: { value: new THREE.Color(0x0c0a24) }, uSkyLow: { value: new THREE.Color(0x6a3a5a) },
      uFlicker: { value: 1 }, uBust: { value: -1e5 }, uRoofT: { value: 1e5 }, uFairy: { value: 1 },
      uWar: { value: new THREE.Vector2(-1e5, -1e5) }, uFight: { value: new THREE.Vector2(-1e5, -1e5) }, uHands: { value: new THREE.Vector2(-1e5, -1e5) },
      uTime: U.uTime, uBeat: U.uBeat, uBeatPos: U.uBeatPos, uParty: U.uParty, uWind: U.uWind,
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uFlicker, uBust, uRoofT, uFairy, uBeat, uBeatPos, uParty, uWind;
      uniform vec3 uFog, uCam, uWarm, uLight, uCity, uSkyTop, uSkyLow;
      uniform vec2 uWar, uFight, uHands;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float box2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      // the city at night through a window: u across, v up, both 0..1
      vec3 nightCity(float u, float v, float seed){
        vec3 col = mix(uSkyLow, uSkyTop, smoothstep(0.05, 0.9, v));
        col += vec3(1.0, 0.95, 0.85) * step(0.996, h2(floor(vec2(u * 160.0, v * 100.0)) + seed)) * smoothstep(0.5, 0.8, v) * 0.8;
        float c2 = floor(u * 11.0 + seed * 3.0), hf = 0.42 + 0.3 * h2(vec2(c2, seed + 5.0));
        col = mix(col, uCity * 0.6, step(v, hf));
        float c = floor(u * 6.0 + seed * 7.0), hb = 0.25 + 0.38 * h2(vec2(c, seed));
        vec2 wg = vec2(fract(u * 30.0), fract(v * 22.0));
        float lit = step(0.45, h2(floor(vec2(u * 30.0, v * 22.0)) + seed * 11.0)) * step(0.25, wg.x) * step(wg.x, 0.75) * step(0.3, wg.y) * step(wg.y, 0.8);
        col = mix(col, uCity * 0.22 + uWarm * lit * 1.4, step(v, hb));
        col = mix(col, vec3(0.02), step(abs(fract(u * 3.0) - 0.5), 0.012) * step(v, hb) * 0.8);
        return col;
      }
      // fairy lights pinned along the top of a wall: a sag between pins every 9 m, a bulb every 0.9 m
      vec3 fairy(float wa, float h, float top){
        float seg = fract(wa / 9.0), y = top - 1.2 - 1.4 * sin(3.14159 * seg);
        float wire = smoothstep(0.07, 0.0, abs(h - y));
        float bi = floor(wa / 0.9), bx = fract(wa / 0.9) - 0.5;
        float bulb = smoothstep(0.26, 0.1, length(vec2(bx * 0.9, h - y + 0.18)));
        vec3 bc = mix(vec3(1.0, 0.78, 0.45), mix(vec3(1.0, 0.45, 0.65), vec3(0.45, 0.8, 1.0), step(0.5, h2(vec2(bi, 3.0)))), step(0.66, h2(vec2(bi, 1.0))) * (0.3 + 0.7 * uParty));
        float chase = pow(0.5 + 0.5 * cos(6.2832 * (bi / 8.0 - uBeatPos * 0.5)), 6.0);
        float k = (1.1 + 0.25 * uBeat + uParty * (0.5 + 2.2 * chase)) * uFairy;
        return vec3(0.04) * wire * (1.0 - bulb) + bc * bulb * k;
      }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        vec3 col = vec3(0.0);
        vec3 glow = vec3(0.0);
        float side = x < 0.0 ? -1.0 : 1.0;
        float roof = step(uRoofT, vT) * step(vT, 1e4);
        if (part == 8) { col = vec3(0.82, 0.78, 0.7) * uLight * 0.9; }
        else if (part == 7) {
          // her building's front: courses of brick, a cornice, lit windows with sheers in them,
          // a flower box under some, the street light on it
          vec2 b = vec2(x / 0.9 + (mod(floor(h / 0.34), 2.0) * 0.5), h / 0.34);
          vec2 bf = fract(b);
          col = vec3(0.4, 0.18, 0.13) * (0.75 + 0.4 * h2(floor(b))) * (0.75 + 0.25 * step(0.08, bf.x) * step(0.12, bf.y));
          vec2 wc = vec2(fract(x / 6.0) - 0.5, fract((h - 1.5) / 7.0) - 0.5);
          vec2 wq = wc * vec2(6.0, 7.0);
          float win = step(box2(wq, vec2(1.5, 2.3)), 0.0) * step(5.0, h);
          float on = step(0.3, h2(floor(vec2(x / 6.0, (h - 1.5) / 7.0))));
          float sheer = smoothstep(0.8, 1.45, abs(wq.x)) * (0.7 + 0.3 * sin(wq.y * 3.0 + uTime));
          vec3 inside = mix(vec3(0.02, 0.02, 0.04), uWarm * 1.5, on);
          inside = mix(inside, mix(vec3(0.95, 0.85, 0.75), vec3(1.0, 0.8, 0.85), step(0.5, h2(floor(vec2(x / 6.0, h / 7.0)) + 7.0))) * (0.4 + 0.9 * on), sheer * 0.85);
          col = mix(col, inside, win);
          // lintel and sill, and a box of geraniums under some
          col = mix(col, vec3(0.72, 0.66, 0.56), step(box2(wq - vec2(0.0, 2.6), vec2(1.8, 0.3)), 0.0) * step(5.0, h));
          float fb = step(box2(wq + vec2(0.0, 2.7), vec2(1.6, 0.35)), 0.0) * step(0.5, h2(floor(vec2(x / 6.0, h / 7.0)) + 3.0)) * step(5.0, h);
          col = mix(col, mix(vec3(0.25, 0.5, 0.18), vec3(1.0, 0.2, 0.25), step(0.6, h2(floor(vec2(x * 3.0, h * 3.0))))), fb);
          col = mix(col, vec3(0.62, 0.55, 0.46), step(abs(h - 58.0), 1.2));
          col *= uLight;
          col += uWarm * exp(-max(h, 0.0) * 0.08) * 0.28;
          glow += inside * win * 0.35 * on;
        } else if (uStyle < 1.5 || uStyle > 2.5) {
          // her apartment
          float fx = mod(along, 64.0) - 32.0;
          float lightK = 0.55 + 0.75 * exp(-fx * fx / 900.0);
          if (part == 0) {
            if (roof > 0.5) {
              // the roof: tar paper in sheets, seams, gravel, the odd drain
              vec2 rq = vec2(x, along);
              col = vec3(0.12, 0.11, 0.12) * (0.8 + 0.3 * n2(rq * 0.6) + 0.15 * h2(floor(rq * 6.0)));
              col *= 0.82 + 0.18 * smoothstep(0.0, 0.05, abs(fract(along / 3.6) - 0.5));
              col = mix(col, vec3(0.32, 0.3, 0.28), smoothstep(0.62, 0.8, n2(rq * 0.15)) * 0.5);
              col *= 0.9 + 0.5 * uParty;
            } else if (uStyle > 2.5) {
              // the kitchen: big black and white tiles, not very clean
              vec2 tq = vec2(x, along) / 3.4;
              col = mix(vec3(0.66, 0.63, 0.58), vec3(0.06, 0.06, 0.07), aaChk(tq));
              col *= 0.82 + 0.18 * n2(vec2(x, along) * 0.15);
            } else if (uStyle < 0.5) {
              // floorboards, honey and worn, along the room
              float id = floor(x / 2.4);
              float jl = fract((along + h2(vec2(id, 1.0)) * 40.0) / 40.0);
              float grain = n2(vec2(x * 0.9 + id * 7.0, along * 0.05)) * 0.5 + n2(vec2(x * 3.0, along * 0.2)) * 0.25;
              col = vec3(0.46, 0.29, 0.15) * (0.7 + 0.35 * h2(vec2(id, 3.0)) + 0.3 * grain);
              col *= 0.6 + 0.4 * smoothstep(0.0, 0.03, fract(x / 2.4)) * smoothstep(0.0, 0.004, jl) * smoothstep(1.0, 0.996, jl);
              // a rag rug in the middle of the room
              vec2 rg = vec2(x, mod(along, 64.0) - 30.0);
              float rug = step(box2(rg, vec2(16.0, 10.0)), 0.0);
              vec3 rugC = mix(vec3(0.8, 0.42, 0.3), vec3(0.32, 0.5, 0.62), step(0.5, fract(rg.y / 2.2 + 0.25 * step(0.5, fract(rg.x / 5.0)))));
              col = mix(col, rugC * (0.8 + 0.2 * n2(rg * 1.5)), rug);
            } else {
              // the carpet: dusty rose, a little worn where people walk
              col = vec3(0.4, 0.26, 0.28) * (0.85 + 0.15 * h2(floor(vec2(x, along) * 3.0)) + 0.2 * n2(vec2(x, along) * 0.08));
            }
            col *= mix(lightK, 1.0, roof);
          } else if (part == 3) {
            col = vec3(0.62, 0.58, 0.52) * (0.9 + 0.1 * n2(vec2(x, along) * 0.1));
            float r = length(vec2(x, fx));
            col *= 0.5 + 0.5 * exp(-r * r / 700.0);
            glow += uWarm * (smoothstep(3.6, 3.0, r) * 2.6 + exp(-r * r / 60.0) * 0.6);
          } else {
            // the walls: old paper with faded stripes and little flowers, a skirting board, a
            // window in every stretch with the city in it
            float wa = part == 6 ? x * 1.3 + 7.0 : (side > 0.0 ? along + 30.0 : along);
            float onWall = part == 6 ? 0.0 : 1.0;
            vec3 paperC = uStyle < 0.5 ? vec3(0.66, 0.56, 0.4) : (uStyle > 2.5 ? vec3(0.62, 0.62, 0.5) : vec3(0.52, 0.56, 0.5));
            col = paperC * (0.85 + 0.15 * n2(vec2(wa * 0.05, h * 0.05)));
            float st = abs(fract(wa / 4.2) - 0.5);
            col *= 1.0 - 0.12 * smoothstep(0.06, 0.03, st);
            vec2 fl = vec2(fract(wa / 2.1) - 0.5, fract(h / 2.6 + floor(wa / 2.1) * 0.5) - 0.5);
            col = mix(col, uStyle < 0.5 ? vec3(0.72, 0.38, 0.3) : vec3(0.38, 0.5, 0.56), smoothstep(0.13, 0.07, length(fl)) * 0.5);
            col *= 0.8 + 0.2 * smoothstep(0.0, 0.6, n2(vec2(wa * 0.02, h * 0.04)));
            col = mix(col, vec3(0.82, 0.78, 0.7), step(h, 1.6));
            col = mix(col, vec3(0.82, 0.78, 0.7), step(36.6, h));
            // the kitchen's right side: cupboards, the counter, white tiles, cupboards above
            if (uStyle > 2.5 && side > 0.0 && onWall > 0.5) {
              float dq = fract(wa / 6.0);
              vec3 cab = vec3(0.56, 0.7, 0.62) * (0.92 + 0.08 * step(0.05, dq) * step(dq, 0.95));
              cab = mix(cab, vec3(0.9, 0.86, 0.7), step(abs(dq - 0.5), 0.02) * step(abs(mod(h, 12.0) - 8.0), 1.6));
              vec2 tq = fract(vec2(wa, h) / 1.2);
              vec3 tile = vec3(0.84, 0.84, 0.8) * (0.8 + 0.2 * step(0.06, tq.x) * step(0.06, tq.y));
              col = h < 11.0 ? cab : (h < 12.4 ? vec3(0.2, 0.18, 0.17) : (h < 21.0 ? tile : (h < 33.0 ? cab : col)));
            }
            col *= lightK;
            // the fairy lights she pinned up
            if (onWall > 0.5) { vec3 fy = fairy(wa, h, 36.4); col = mix(col, vec3(0.04), smoothstep(0.07, 0.0, abs(h - (35.2 - 1.4 * sin(3.14159 * fract(wa / 9.0)))))); glow += fy; }
            // the window
            float wx = mod(wa, 64.0) - 20.0;
            if (abs(wx) < 10.0 && h > 7.0 && h < 31.0 && onWall > 0.5) {
              vec2 wp = vec2(wx, h - 19.0);
              float inner = step(abs(wx), 9.0) * step(abs(wp.y), 11.0);
              vec3 city = nightCity(0.5 + (wx * side) / 18.0, (h - 8.0) / 22.0, floor(wa / 64.0) + side * 3.0);
              // sheers at the sides, moving in the hot air (in the chorus they fill the window)
              float curtain = smoothstep(5.5 - 3.0 * uWind, 8.6 - 2.0 * uWind, abs(wx) + 0.8 * sin(wp.y * 0.4 + uTime * 1.7 + wx)) * (0.75 + 0.25 * sin(wx * 4.0 + h * 0.3 + uTime * 2.0));
              city = mix(city, vec3(0.92, 0.84, 0.74) * (0.6 + 0.6 * uLight * lightK), curtain * 0.72);
              float fanW = step(0.5, h2(vec2(floor(wa / 64.0), side)));
              vec2 fp = vec2(wx, h - 11.6);
              float fanBox = step(box2(fp, vec2(3.4, 3.4)), 0.0) * fanW;
              float fr = length(fp);
              float grille = step(fr, 3.0) * (0.5 + 0.5 * aaSq(fr * 1.6));
              city = mix(city, vec3(0.08, 0.08, 0.1) * (1.0 - 0.6 * grille) + vec3(0.5) * step(3.0, fr) * 0.2, fanBox);
              float mull = step(abs(wx), 0.25) + step(abs(h - 19.0), 0.25);
              vec3 frameC = vec3(0.88, 0.85, 0.78) * uLight * lightK;
              col = mix(frameC, city, inner * (1.0 - clamp(mull, 0.0, 1.0)));
              glow += city * inner * 0.2 * (1.0 - fanBox);
            }
            // the war inside the wall: cracks, and the light of it through them
            float war = uWar.y * smoothstep(9.0, 0.0, abs(vT - uWar.x)) * step(side, 0.0) * onWall;
            if (war > 0.001) {
              float la = (vT - uWar.x) * 40.0;
              float path = 18.0 + 7.0 * sin(la * 0.045) + 5.0 * (n2(vec2(la * 0.12, 3.0)) - 0.5) + 2.0 * (n2(vec2(la * 0.6, 7.0)) - 0.5);
              float wdt = 0.35 + 1.1 * n2(vec2(la * 0.2, 1.0));
              float branch = abs(h - (path + (la - floor(la / 23.0) * 23.0 - 11.5) * 0.9)) - 0.25;
              float cr = min(abs(h - path) - wdt, mix(9.0, branch, step(fract(la / 23.0), 0.45) * step(abs(fract(la / 23.0) - 0.22), 0.2)));
              float crack = smoothstep(0.25, -0.1, cr);
              float boom = 0.45 + 0.55 * step(0.6, h2(vec2(floor(uTime * 7.0), 1.0))) + 0.3 * sin(uTime * 31.0) + 0.6 * uBeat;
              col = mix(col, vec3(0.05, 0.03, 0.02), crack * war);
              glow += vec3(1.0, 0.5, 0.18) * crack * war * boom * 1.8 + vec3(1.0, 0.45, 0.15) * war * boom * 0.08;
            }
            // the neighbours fighting: their shadows on the paint
            float fight = uFight.y * smoothstep(10.0, 0.0, abs(vT - uFight.x)) * step(side, 0.0) * onWall;
            if (fight > 0.001) {
              float sh = 0.0;
              for (int k = 0; k < 2; k++) {
                float fk = float(k), dir = fk * 2.0 - 1.0;
                float cx = uFight.x + dir * 0.18;
                vec2 q = vec2((vT - cx) * 40.0, h - 14.0);
                float lean = sin(uTime * (2.6 + fk) + fk * 2.0) * 1.4;
                float body = step(length(vec2(q.x / 3.4 - lean * 0.15, q.y / 8.0)), 1.0);
                float head = step(length(vec2(q.x - lean, q.y - 10.2)), 2.4);
                float arm = step(abs((q.x + dir * 2.0) - (q.y - 4.0) * (0.6 + 0.6 * sin(uTime * (5.0 + fk * 1.3)) ) * -dir), 0.6) * step(0.0, q.y - 2.0) * step(q.y - 2.0, 7.0);
                sh = max(sh, max(body, max(head, arm)));
              }
              col *= 1.0 - 0.65 * sh * fight;
              glow *= 1.0 - 0.6 * sh * fight;
            }
            // "but your hand finds mine": two shadows on the paint, reaching, their hands meeting
            float hands = uHands.y * smoothstep(9.0, 0.0, abs(vT - uHands.x)) * step(0.0, side) * onWall;
            if (hands > 0.001) {
              float hs = 0.0;
              for (int k = 0; k < 2; k++) {
                float fk = float(k), dir = fk * 2.0 - 1.0;
                vec2 q = vec2((vT - uHands.x - dir * 0.15) * 40.0, h - 13.0);
                float sway = sin(uTime * 1.1 + fk * 2.0) * 0.4;
                float body = step(length(vec2((q.x - sway) / 3.0, q.y / 7.6)), 1.0);
                float head = step(length(vec2(q.x - sway * 1.3, q.y - 9.6)), 2.2);
                float ax = -dir * q.x;
                float arm = step(abs(q.y - 3.6 + ax * 0.16), 0.6) * step(0.0, ax) * step(ax, 6.6);
                hs = max(hs, max(body, max(head, arm)));
              }
              col *= 1.0 - 0.62 * hs * hands;
              glow *= 1.0 - 0.6 * hs * hands;
            }
          }
          col *= uLight;
        } else {
          // the hallway: a red runner, green below the rail, doors both sides, a light every so
          // often, one of them busted
          float fa = mod(along + 12.0, 24.0) - 12.0;
          float fixture = floor((along + 12.0) / 24.0) * 24.0;
          float busted = step(abs(fixture - uBust), 12.0);
          float lk = mix(1.0, uFlicker, busted);
          float lightK = 0.3 + 0.9 * exp(-fa * fa / 70.0) * lk;
          if (part == 0) {
            col = mix(vec3(0.52, 0.5, 0.46), vec3(0.08, 0.08, 0.08), aaChk(vec2(x / 1.3, along / 1.3)));
            col *= 0.8 + 0.2 * n2(vec2(x, along) * 0.3);
            float run = step(abs(x), 8.2);
            col = mix(col, vec3(0.34, 0.05, 0.06) * (0.8 + 0.25 * n2(vec2(x, along) * 0.5)), run);
            col = mix(col, vec3(0.62, 0.46, 0.18), step(abs(abs(x) - 7.4), 0.25) * run);
            col *= lightK;
          } else if (part == 3) {
            col = vec3(0.5, 0.5, 0.44) * (0.5 + 0.5 * exp(-fa * fa / 60.0) * lk);
            float r = length(vec2(x, fa));
            glow += vec3(1.0, 0.95, 0.8) * smoothstep(2.6, 2.0, r) * 2.4 * lk;
          } else {
            float da = part == 6 ? x + 200.0 : (side > 0.0 ? along : along + 17.0);
            col = h < 10.0 ? vec3(0.1, 0.24, 0.17) * (0.85 + 0.15 * step(0.04, abs(fract(da / 6.0) - 0.5))) : vec3(0.64, 0.6, 0.44) * (0.88 + 0.12 * n2(vec2(da, h) * 0.08));
            col = mix(col, vec3(0.32, 0.2, 0.1), step(abs(h - 10.0), 0.35));
            col = mix(col, vec3(0.2, 0.2, 0.18), step(h, 1.2));
            // a door, its number, the light under it
            float dx = mod(da, 34.0) - 17.0;
            if (abs(dx) < 7.6 && h < 27.0 && part != 6) {
              float frame = 1.0 - step(abs(dx), 6.6) * step(h, 26.0);
              vec3 wood = vec3(0.24, 0.13, 0.07) * (0.8 + 0.25 * n2(vec2(dx * 0.4, h * 4.0)));
              vec2 pq = vec2(abs(dx) - 3.1, mod(h, 12.5) - 6.25);
              wood *= 1.0 - 0.25 * step(box2(pq, vec2(2.2, 4.6)), 0.0) * (1.0 - step(box2(pq, vec2(1.9, 4.3)), 0.0));
              col = mix(wood, vec3(0.75, 0.72, 0.64), frame);
              col = mix(col, vec3(0.95, 0.75, 0.32) * 1.4, step(length(vec2(dx - 4.6 * side, h - 12.0)), 0.55));
              col = mix(col, vec3(0.85, 0.66, 0.28), step(box2(vec2(dx, h - 20.5), vec2(1.3, 0.7)), 0.0));
              glow += uWarm * 1.4 * step(abs(dx), 6.4) * smoothstep(0.9, 0.0, h) * step(0.45, h2(vec2(floor(da / 34.0), side)));
            }
            col *= lightK;
          }
          col *= uLight;
        }
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}
