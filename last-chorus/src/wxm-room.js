// White Christmas: the rooms of grandma's house, drawn round the course (summer.js Room): her pink
// bathroom (the tiles, the wallpaper roses, the hexagon floor), the dining room where the table is
// the floor and we ride the tablecloth with the carpet far below, the hall of family photographs,
// and the living room at 2 a.m. with the snow in its windows. The ends of a room are her house from
// the street (white siding, lit windows, a string of lights) or a plain wall with a door or a window.

import * as THREE from 'three';

// the cross-sections: [x across, y up (from the floor), measured from the floor, part]
// parts: 0 floor (or the tabletop), 1 left wall, 2 right wall, 3 ceiling, 4 the tablecloth's drop,
// 5 the dining room's real floor, far below
const box = (W, H) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
// the dining room: the table's top is the floor we ride, its cloth falls off both edges to the
// carpet, the walls are a long way off
export const TABLE = { half: 40, drop: 26 };
const dining = (W, H) => {
  const T = TABLE.half, D = TABLE.drop;
  return [
    [-W, H, 1, 1], [-W, -D, 1, 1],
    [-W, -D, 1, 5], [-T - 2, -D, 1, 5],
    [-T, -D * 0.62, 1, 4], [-T, 0, 1, 4],
    [-T, 0, 1, 0], [-T * 0.6, 0, 1, 0], [-T * 0.25, 0, 1, 0], [0, 0, 1, 0], [T * 0.25, 0, 1, 0], [T * 0.6, 0, 1, 0], [T, 0, 1, 0],
    [T, 0, 1, 4], [T, -D * 0.62, 1, 4],
    [T + 2, -D, 1, 5], [W, -D, 1, 5],
    [W, -D, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ];
};

export const HOUSE = {
  rings: { box, dining },
  ringOf: (s) => (s === 'dining' ? 'dining' : 'box'),
  styles: { bath: 0, dining: 1, hall: 2, living: 3 },
  dims: { bath: [36, 38], dining: [130, 56], hall: [22, 40], living: [52, 40] },
  // the ceiling lights: how far apart along the room, and the first one's offset
  lights: (id) => ({ 0: [30, 12], 1: [70, 30], 2: [26, 8] }[id] || null),
};

export function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uSkyLo: { value: new THREE.Color(0x1a1a34) }, uSkyHi: { value: new THREE.Color(0x05060f) },
      uSnow: { value: 0.5 }, uBeat: { value: 0 }, uLamps: { value: 1 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uSnow, uBeat, uLamps; uniform vec3 uFog, uCam, uLight, uSkyLo, uSkyHi;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      float box2(vec2 p, vec2 a, vec2 b){ return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
      // snow falling past a window: little bright flecks drifting down
      float snowfall(vec2 q, float k){
        float s = 0.0;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 g = q * (0.55 + 0.35 * fi) + vec2(sin(uTime * 0.6 + fi * 2.0 + q.y * 0.3) * 0.6, uTime * (1.3 + 0.5 * fi));
          vec2 c = floor(g), f = fract(g) - 0.5;
          vec2 o = vec2(h2(c + fi), h2(c + 3.1 + fi)) - 0.5;
          s += smoothstep(0.16, 0.0, length(f - o * 0.6)) * step(0.45, h2(c + 7.0 + fi));
        }
        return s * k;
      }
      // a window onto the night: the sky, the snow coming down, now and then a lit window across the way
      vec3 night(vec2 wv, float along, float per){
        vec3 sky = mix(uSkyLo, uSkyHi, clamp((wv.y - 10.0) / 16.0, 0.0, 1.0));
        vec2 cq = vec2(floor(wv.x * 0.9 + floor(along / per) * 7.0), floor(wv.y * 0.8));
        float far = step(0.86, h2(cq)) * step(wv.y, 15.0);
        sky += vec3(1.0, 0.72, 0.4) * far * 0.6;
        sky += vec3(0.9, 0.93, 1.0) * snowfall(wv * 0.9, 0.7 * uSnow + 0.15);
        // the drift on the sill
        sky = mix(sky, vec3(0.86, 0.9, 0.98), smoothstep(1.6, 0.6, wv.y - 10.0) * 0.9);
        return sky;
      }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float wa = (part == 6 || part == 7 || part == 8) ? x : (side > 0.0 ? along + 9.0 : along);
        vec3 glow = vec3(0.0); vec3 col;
        if (part == 7) {
          // her house from the street: white clapboard, lit windows with the snow on their sills,
          // a string of lights along the eaves of the porch
          float board = fract(h / 1.1);
          col = vec3(0.86, 0.87, 0.9) * (0.82 + 0.18 * smoothstep(0.0, 0.12, board)) * (0.94 + 0.06 * h2(vec2(floor(h / 1.1), floor(x / 14.0))));
          vec2 wq = vec2(mod(abs(x) - 22.0, 34.0), h); float win = step(22.0, abs(x)) * box2(wq, vec2(4.0, 6.0), vec2(16.0, 20.0));
          vec3 warm = vec3(1.0, 0.74, 0.42) * (0.75 + 0.25 * h2(vec2(floor((abs(x) - 22.0) / 34.0), side)));
          float pane = step(0.06, abs(fract((wq.x - 4.0) / 6.0) - 0.5) * 2.0 - 0.0) * step(0.06, abs(fract((wq.y - 6.0) / 7.0) - 0.5) * 2.0);
          col = mix(col, mix(vec3(0.95), warm, pane), win); glow += warm * win * pane * 0.9;
          col = mix(col, vec3(0.96, 0.97, 1.0), win * step(wq.y, 6.8) * step(5.6, wq.y));           // snow on the sill
          col = mix(col, vec3(0.2, 0.3, 0.24), step(22.0, abs(x)) * box2(wq, vec2(1.5, 5.0), vec2(3.6, 21.0)));   // shutters
          col = mix(col, vec3(0.2, 0.3, 0.24), step(22.0, abs(x)) * box2(wq, vec2(16.4, 5.0), vec2(18.5, 21.0)));
          // the lights strung along the porch roof over the door
          float lr = h - 28.5 - 0.8 * sin(x * 0.42);
          float bulb = smoothstep(0.55, 0.15, length(vec2(fract(x / 2.2) - 0.5, lr / 2.2) * vec2(2.2, 2.2)));
          vec3 bc = vec3(h2(vec2(floor(x / 2.2), 1.0)), h2(vec2(floor(x / 2.2), 2.0)), h2(vec2(floor(x / 2.2), 3.0)));
          bc = normalize(bc + 0.15) * 1.3; float tw = 0.6 + 0.4 * sin(uTime * 2.0 + floor(x / 2.2) * 1.7);
          glow += bc * bulb * tw * 1.4; col = mix(col, bc, bulb);
          col *= 0.8;
        }
        else if (part == 8) { col = vec3(0.93, 0.92, 0.9); glow += vec3(0.05); }
        else if (part == 5) {
          // the dining room's carpet, far below the table
          vec2 q = vec2(x, along) / 9.0;
          col = vec3(0.32, 0.07, 0.08) * (0.85 + 0.15 * h2(floor(q))) * (0.8 + 0.2 * smoothstep(0.3, 0.5, abs(sin(q.x * 3.14) * sin(q.y * 3.14))));
          col *= 0.7;
        }
        else if (part == 4) {
          // the cloth falling off the table's edge in soft folds, a gold band along its hem
          float fold = 0.5 + 0.5 * sin(along * 0.55 + sin(along * 0.13) * 2.0);
          col = vec3(0.92, 0.9, 0.86) * (0.72 + 0.28 * fold);
          col = mix(col, vec3(0.75, 0.58, 0.25), step(h, -14.0) * step(-15.6, h));
        }
        else if (part == 0) {
          if (st == 0) {
            // her bathroom floor: little white hexagons, a black one in a flower now and then
            vec2 q = vec2(x, along) / 1.6; q.x *= 1.1547; vec2 r = vec2(1.0, 1.7320508);
            vec2 a = mod(q, r) - r * 0.5, b = mod(q - r * 0.5, r) - r * 0.5;
            vec2 g = dot(a, a) < dot(b, b) ? a : b; vec2 id = q - g;
            float d = max(abs(g.x) * 0.866 + abs(g.y) * 0.5, abs(g.y));
            float grout = smoothstep(0.4, 0.46, d);
            float flower = step(0.9, h2(floor(id * 0.34)));
            col = mix(vec3(0.93, 0.93, 0.9), vec3(0.08, 0.08, 0.1), flower * step(0.5, h2(id)));
            col = mix(col, vec3(0.62, 0.62, 0.6), grout);
            // the bath mat
            col = mix(col, vec3(0.86, 0.5, 0.58) * (0.85 + 0.15 * sin(x * 3.0) * sin(along * 3.0)), step(abs(x), 15.0) * step(0.5, fract(along / 90.0)) * step(fract(along / 90.0), 0.78));
          } else if (st == 1) {
            // the tablecloth: white damask, a plaid runner down the middle, a gold line near the edge
            vec2 q = vec2(x, along) / 3.0;
            float dam = smoothstep(0.55, 0.75, abs(sin(q.x * 1.3) * sin(q.y * 1.3 + sin(q.x * 0.6))));
            col = vec3(0.94, 0.92, 0.88) * (0.93 + 0.07 * dam);
            float run = step(abs(x), 16.0);
            vec2 pq = vec2(x, along) / 2.0;
            float pl = 0.55 * step(0.5, fract(pq.x * 0.25)) + 0.45 * step(0.5, fract(pq.y * 0.25));
            vec3 plaid = mix(vec3(0.62, 0.06, 0.08), vec3(0.12, 0.3, 0.16), pl) * (0.85 + 0.25 * step(0.92, fract(pq.x)) + 0.25 * step(0.92, fract(pq.y)));
            col = mix(col, plaid, run);
            col = mix(col, vec3(0.8, 0.62, 0.26), step(abs(abs(x) - 35.0), 0.5));
          } else if (st == 2) {
            // the hall: oak boards and the long runner
            vec2 pl = vec2(x / 1.6, along / 10.0 + 0.37 * floor(x / 1.6));
            col = vec3(0.45, 0.28, 0.16) * (0.78 + 0.35 * h2(floor(pl))) * (0.88 + 0.12 * edge(fract(pl), 0.03));
            float rug = step(abs(x), 13.0);
            vec2 mq = vec2(x / 2.0, along / 2.0); float motif = step(0.7, abs(sin(mq.x * 2.0) * sin(mq.y * 1.4)));
            vec3 rc = mix(vec3(0.42, 0.08, 0.1), vec3(0.12, 0.16, 0.34), motif);
            col = mix(col, mix(rc, vec3(0.86, 0.72, 0.42), step(11.6, abs(x))), rug);
          } else {
            // the living room's carpet in the dark, the wrapping paper still on it
            vec2 q = vec2(x, along) / 1.2;
            col = vec3(0.5, 0.44, 0.36) * (0.85 + 0.15 * h2(floor(q)));
            vec2 pq = vec2(x, along) / 11.0; vec2 pc = floor(pq);
            float paper = step(0.8, h2(pc)) * step(length(fract(pq) - 0.5), 0.3) * step(16.0, abs(x));
            col = mix(col, mix(vec3(0.75, 0.1, 0.12), vec3(0.15, 0.45, 0.25), h2(pc + 1.0)) * (0.8 + 0.2 * sin(x * 2.0 + along)), paper);
          }
        }
        else if (part == 3) {
          col = st == 3 ? vec3(0.42, 0.42, 0.46) : vec3(0.92, 0.9, 0.86);
          col *= 0.9 + 0.1 * edge(fract(vec2(x / 8.0, along / 8.0)), 0.02);
          col *= 0.75;
        }
        else {
          // the walls
          float H = st == 0 ? 38.0 : (st == 1 ? 56.0 : 40.0);
          if (st == 0) {
            // her bathroom: pink tile to above the shoulder, a maroon line, cream paper with roses
            float tileTop = 20.0;
            vec2 tq = vec2(wa / 1.9, h / 1.9);
            vec3 tile = vec3(0.93, 0.66, 0.72) * (0.93 + 0.07 * h2(floor(tq))) * (0.86 + 0.14 * edge(fract(tq), 0.07));
            vec2 rq = vec2(wa / 2.6 + 0.5 * mod(floor(h / 2.6), 2.0), h / 2.6); vec2 rf = fract(rq) - 0.5;
            float rose = smoothstep(0.2, 0.12, length(rf)), leaf = smoothstep(0.1, 0.04, length(rf - vec2(0.18, -0.12)));
            vec3 paper = mix(vec3(0.95, 0.9, 0.82), vec3(0.85, 0.42, 0.5), rose * 0.8);
            paper = mix(paper, vec3(0.42, 0.6, 0.44), leaf * 0.7);
            col = h < tileTop ? tile : paper;
            col = mix(col, vec3(0.45, 0.1, 0.18), step(abs(h - tileTop), 0.55));
            col = mix(col, vec3(0.45, 0.1, 0.18), step(h, 0.9));
            // the frosted window in each wall now and then, the night soft behind it
            vec2 wv = vec2(mod(wa + 10.0, 90.0) - 10.0, h); float win = box2(wv, vec2(0.0, 22.0), vec2(14.0, 34.0)) * (part == 6 ? 0.0 : 1.0);
            vec3 frost = mix(night(wv, along, 90.0), vec3(0.75, 0.8, 0.9), 0.55);
            col = mix(col, frost, win); glow += frost * win * 0.5;
            col = mix(col, vec3(0.95), win * (1.0 - edge(vec2(wv.x / 14.0, (wv.y - 22.0) / 12.0), 0.07)));
          } else if (st == 1) {
            // the dining room: green damask over dark wainscot, tall windows on the night, paintings
            float wain = 15.0;
            vec2 dq = fract(vec2(wa / 5.0, h / 6.0) + vec2(0.0, 0.5 * mod(floor(wa / 5.0), 2.0))) - 0.5;
            float dam = smoothstep(0.22, 0.12, length(dq * vec2(1.0, 0.7)));
            col = mix(vec3(0.1, 0.24, 0.16), vec3(0.62, 0.52, 0.26), dam * 0.55);
            vec2 pq = vec2(fract(wa / 9.0), (h + 26.0) / (wain + 26.0)); float panel = edge(vec2(pq.x, clamp(pq.y, 0.0, 1.0)), 0.08);
            col = mix(col, vec3(0.3, 0.17, 0.09) * (0.85 + 0.15 * panel), step(h, wain));
            col = mix(col, vec3(0.58, 0.44, 0.22), step(abs(h - wain), 0.6));
            float per = 70.0;
            vec2 wv = vec2(mod(wa + 12.0, per) - 12.0, h); float win = (part == 6 ? 0.0 : 1.0) * box2(wv, vec2(0.0, 16.0), vec2(22.0, 50.0));
            vec3 sky = night(wv - vec2(0.0, 6.0), along, per);
            col = mix(col, sky, win); glow += sky * win * 0.55;
            float frame = win * (1.0 - edge(vec2(wv.x / 22.0, (wv.y - 16.0) / 34.0), 0.04)) + win * (step(abs(wv.x - 11.0), 0.4) + step(abs(fract((wv.y - 16.0) / 8.5) - 0.5), 0.03));
            col = mix(col, vec3(0.9, 0.88, 0.82), clamp(frame, 0.0, 1.0));
            // the garland along the top of the windows, its lights
            float gar = (part == 6 ? 0.0 : 1.0) * step(abs(h - 52.0 - 1.2 * sin(wa * 0.25)), 1.3);
            col = mix(col, vec3(0.08, 0.22, 0.1), gar);
            float gb = (part == 6 ? 0.0 : 1.0) * smoothstep(0.6, 0.1, length(vec2(fract(wa / 3.0) - 0.5, (h - 52.0 - 1.2 * sin(wa * 0.25)) / 3.0) * 3.0));
            glow += vec3(1.0, 0.75, 0.4) * gb * (0.8 + 0.2 * sin(uTime * 3.0 + wa)) * uLamps;
            vec2 av = vec2(mod(wa + 12.0 - per * 0.5, per) - 12.0, h); float pf = (part == 6 ? 0.0 : 1.0) * box2(av, vec2(1.0, 24.0), vec2(21.0, 42.0)), pin = (part == 6 ? 0.0 : 1.0) * box2(av, vec2(2.2, 25.2), vec2(19.8, 40.8));
            float pid = h2(vec2(floor((wa + 12.0 - per * 0.5) / per), 5.0));
            vec3 art = mix(vec3(0.2, 0.3, 0.4), vec3(0.6, 0.45, 0.25), pid) * (0.7 + 0.3 * sin(av.x * 0.4 + av.y * 0.3 + pid * 6.0));
            col = mix(col, vec3(0.62, 0.48, 0.2), pf); col = mix(col, art, pin);
          } else if (st == 2) {
            // the hall: sage stripes, a picture rail, the family in frames all the way along
            float stripe = step(0.5, fract(wa / 2.4));
            col = mix(vec3(0.66, 0.72, 0.6), vec3(0.74, 0.79, 0.68), stripe);
            col = mix(col, vec3(0.88, 0.85, 0.78), step(h, 9.0));
            col = mix(col, vec3(0.95, 0.93, 0.88), step(abs(h - 9.0), 0.4) + step(abs(h - 31.0), 0.4));
            vec2 fq = vec2(mod(wa, 13.0), h); float fid = floor(wa / 13.0);
            float fh = 14.0 + 3.0 * h2(vec2(fid, 1.0)), fw = 5.0 + 3.0 * h2(vec2(fid, 2.0));
            float frame = (part == 6 ? 0.0 : 1.0) * box2(fq, vec2(3.0, fh), vec2(3.0 + fw, fh + fw * 1.25));
            float photo = (part == 6 ? 0.0 : 1.0) * box2(fq, vec2(3.6, fh + 0.6), vec2(2.4 + fw, fh + fw * 1.25 - 0.6));
            // the photographs: a blur of faces and Christmases
            vec2 pp = vec2((fq.x - 3.6) / (fw - 1.2), (fq.y - fh - 0.6) / (fw * 1.25 - 1.2));
            vec3 pc = mix(vec3(0.55, 0.42, 0.32), vec3(0.3, 0.38, 0.5), h2(vec2(fid, 3.0)));
            pc += vec3(0.4, 0.3, 0.25) * smoothstep(0.18, 0.05, length(pp - vec2(0.35 + 0.3 * h2(vec2(fid, 4.0)), 0.6))) + vec3(0.35, 0.28, 0.22) * smoothstep(0.15, 0.04, length(pp - vec2(0.7, 0.55)));
            col = mix(col, vec3(0.5, 0.36, 0.18) * (0.8 + 0.4 * h2(vec2(fid, 6.0))), frame); col = mix(col, pc, photo);
          } else {
            // the living room at 2 a.m.: the paper in the dark, a window on the snow
            float stripe = step(0.5, fract(wa / 3.0));
            col = mix(vec3(0.52, 0.4, 0.3), vec3(0.47, 0.36, 0.28), stripe);
            col = mix(col, vec3(0.4, 0.28, 0.2), step(h, 7.0));
            float per = 80.0;
            vec2 wv = vec2(mod(wa + 14.0, per) - 14.0, h); float win = (part == 6 ? 0.0 : 1.0) * box2(wv, vec2(0.0, 12.0), vec2(26.0, 34.0));
            vec3 sky = night(wv - vec2(0.0, 2.0), along, per) * 1.2;
            col = mix(col, sky, win); glow += sky * win * 0.6;
            float frame = win * (1.0 - edge(vec2(wv.x / 26.0, (wv.y - 12.0) / 22.0), 0.04)) + win * (step(abs(wv.x - 13.0), 0.4) + step(abs(wv.y - 23.0), 0.4));
            col = mix(col, vec3(0.86, 0.84, 0.8), clamp(frame, 0.0, 1.0));
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
