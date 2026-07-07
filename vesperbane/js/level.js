// ── VESPERBANE · level.js ────────────────────────────────────────────
// One continuous 420x30 map. Two forks (rooftops/catacombs, then
// rafters/crypt); the fast route is always the risky one, and falling
// off it drops you into the slow route instead of killing you.
//
// Movement budget (see entities.js CONFIG): held jump clears ~4 tiles
// up; a full-speed jump crosses ~6-7 tiles; dash-jump at velocity
// tier 1+ crosses ~9. Gaps are sized against those numbers.
//
// Grid legend: '#' solid  '=' one-way platform  '^' spikes
//              '|' chain decor  ' ' air
'use strict';

const TW = 16;             // tile size in px
const LEVEL_W = 420, LEVEL_H = 30;

class LevelBuilder {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.g = [];
    for (let y = 0; y < h; y++) this.g.push(new Array(w).fill(' '));
    this.spawns = [];
    this.zones = [];
    this.interiors = [];
  }
  fill(x, y, w, h, ch) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < this.w && j >= 0 && j < this.h) this.g[j][i] = ch;
  }
  clear(x, y, w, h) { this.fill(x, y, w, h, ' '); }
  put(x, y, ch) { if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.g[y][x] = ch; }
  // spawn(type, tx, ty): ty is the tile the entity's FEET occupy (the
  // air tile directly above its floor), except fliers which float.
  spawn(type, tx, ty, props) { this.spawns.push(Object.assign({ type, tx, ty }, props || {})); }
  zone(x0, y0, x1, y1, name, group) { this.zones.push({ x0, y0, x1, y1, name, group }); }
  interior(x0, x1, windows) { this.interiors.push({ x0, x1, windows: !!windows }); }
}

function buildLevel() {
  const L = new LevelBuilder(LEVEL_W, LEVEL_H);

  // world seals
  L.fill(0, 29, LEVEL_W, 1, '#');   // bottom is always solid: no void deaths
  L.fill(0, 0, 2, 30, '#');
  L.fill(418, 0, 2, 30, '#');

  // ══ A · THE RAMPARTS (x 2-89) — teach sprint, jump, dash ══════════
  L.fill(0, 26, 90, 4, '#');                    // main walk at row 26
  // step ledge with candles
  L.fill(20, 25, 3, 1, '#');
  L.fill(23, 23, 5, 3, '#');
  // pits: first safe, then spiked
  L.clear(34, 26, 3, 3);
  L.clear(52, 26, 4, 3);  L.fill(52, 28, 4, 1, '^');
  L.clear(70, 26, 4, 3);  L.fill(70, 28, 4, 1, '^');
  // one-way ledges over the runs
  L.fill(40, 22, 6, 1, '=');
  L.fill(58, 21, 5, 1, '=');
  // props & pickups
  for (const x of [12, 18, 31, 48, 66, 78]) L.spawn('candle', x, 25);
  L.spawn('candle', 41, 21); L.spawn('candle', 44, 21);
  for (let x = 8; x <= 16; x += 3) L.spawn('spark', x, 24);
  L.spawn('spark', 34, 23); L.spawn('spark', 35, 22); L.spawn('spark', 36, 23);
  L.spawn('spark', 53, 23); L.spawn('spark', 54, 22.5); L.spawn('spark', 55, 23);
  L.spawn('spark', 71, 23); L.spawn('spark', 72, 22.5); L.spawn('spark', 73, 23);
  L.spawn('wretch', 28, 25); L.spawn('wretch', 47, 25); L.spawn('wretch', 63, 25);
  L.spawn('check', 84, 25);
  L.spawn('signup', 87, 25); L.spawn('signdown', 90, 27);
  L.zone(0, 0, 89, 29, 'THE RAMPARTS', null);

  // ══ B · SPLIT 1 (x 90-189): ROOFTOPS over CATACOMBS ═══════════════
  L.fill(90, 28, 100, 2, '#');                  // shared low floor
  // buildings (solid mass, roofs on top, corridor carved through)
  // NOTE: the speed-gate landing (x158) must be level with takeoff (x137
  // roof, row 14) — a higher lip walls off the intended tier1+dash jump.
  const roofs = [[104, 13, 11], [121, 11, 12], [137, 14, 12], [158, 14, 13], [175, 13, 9]];
  for (const [x, top, w] of roofs) L.fill(x, top, w, 19 - top, '#');
  L.clear(104, 19, 80, 9);                      // catacomb corridor rows 19-27
  // chimneys (roof obstacles)
  L.fill(107, 11, 2, 2, '#'); L.fill(142, 12, 2, 2, '#'); L.fill(166, 12, 2, 2, '#');
  // stair up to the roofs
  L.fill(91, 23, 4, 1, '='); L.fill(96, 20, 4, 1, '='); L.fill(100, 16, 4, 1, '=');
  // catacomb furniture: pillars up from floor, fangs down from ceiling
  L.fill(112, 25, 2, 3, '#'); L.fill(130, 25, 2, 3, '#'); L.fill(148, 25, 2, 3, '#'); L.fill(168, 25, 2, 3, '#');
  L.fill(120, 19, 2, 3, '#'); L.fill(139, 19, 2, 3, '#'); L.fill(160, 19, 2, 3, '#');
  L.fill(108, 27, 3, 1, '^'); L.fill(128, 27, 2, 1, '^'); L.fill(163, 27, 3, 1, '^');
  L.fill(117, 19, 1, 3, '|'); L.fill(135, 19, 1, 4, '|'); L.fill(156, 19, 1, 3, '|');
  // catacomb population & rewards
  for (const x of [100, 115, 124, 141, 157, 171, 181]) L.spawn('wretch', x, 27);
  L.spawn('heart', 126, 26); L.spawn('heart', 166, 26);
  for (const x of [106, 122, 138, 154, 176]) L.spawn('candle', x, 27);
  // rooftop population & rewards
  L.spawn('bat', 118, 7); L.spawn('bat', 135, 8); L.spawn('bat', 153, 6); L.spawn('bat', 163, 7);
  for (let x = 105; x <= 113; x += 3) L.spawn('spark', x, 12);
  for (let x = 122; x <= 131; x += 3) L.spawn('spark', x, 10);
  L.spawn('spark', 116, 10); L.spawn('spark', 118, 9); L.spawn('spark', 120, 10);
  L.spawn('spark', 151, 9); L.spawn('spark', 153, 8); L.spawn('spark', 155, 8); L.spawn('spark', 157, 9);
  for (let x = 159; x <= 169; x += 3) L.spawn('spark', x, 11);
  for (let x = 176; x <= 182; x += 3) L.spawn('spark', x, 12);
  L.spawn('signup', 146, 13);                  // warns: the long jump
  L.zone(90, 0, 183, 18, 'THE ROOFTOPS', 'split1');
  L.zone(90, 19, 183, 29, 'THE CATACOMBS', 'split1');

  // ══ BELL PLAZA (x 184-199) — converge, breathe, checkpoint ════════
  L.fill(184, 28, 16, 2, '#');
  L.spawn('check', 192, 27);
  L.spawn('candle', 188, 27); L.spawn('candle', 197, 27);
  L.zone(184, 0, 199, 29, 'BELL PLAZA', null);

  // ══ C · THE NAVE (x 200-249) — interior, vertical play ════════════
  L.interior(200, 249, true);      // moonlit windows
  L.interior(250, 341, false);     // crypt: windowless dark
  L.fill(200, 2, 150, 2, '#');                  // cathedral ceiling C+D
  L.fill(200, 28, 50, 2, '#');
  // balconies
  L.fill(204, 23, 6, 1, '='); L.fill(212, 19, 6, 1, '='); L.fill(220, 23, 8, 1, '=');
  L.fill(230, 16, 6, 1, '='); L.fill(238, 20, 6, 1, '='); L.fill(244, 24, 4, 1, '=');
  // floor pillars
  L.fill(210, 25, 2, 3, '#'); L.fill(226, 25, 2, 3, '#'); L.fill(242, 25, 2, 3, '#');
  L.fill(222, 27, 3, 1, '^');
  L.fill(206, 4, 1, 5, '|'); L.fill(233, 4, 1, 7, '|'); L.fill(247, 4, 1, 4, '|');
  L.spawn('garg', 214, 18); L.spawn('garg', 240, 19);
  L.spawn('wretch', 208, 27); L.spawn('wretch', 224, 27); L.spawn('wretch', 236, 27);
  L.spawn('candle', 205, 22); L.spawn('candle', 221, 22); L.spawn('candle', 245, 23);
  L.spawn('candle', 216, 27); L.spawn('candle', 232, 27);
  L.spawn('heart', 231, 15);
  L.spawn('spark', 206, 21); L.spawn('spark', 214, 17); L.spawn('spark', 223, 21);
  L.spawn('spark', 232, 14); L.spawn('spark', 240, 18); L.spawn('spark', 245, 22);
  L.spawn('check', 248, 27);
  L.zone(200, 0, 249, 29, 'THE NAVE', null);

  // ══ D · SPLIT 2 (x 250-349): RAFTERS over CRYPT ═══════════════════
  L.fill(250, 15, 92, 2, '#');                  // crypt roof slab, x250-341
  // funnels through the slab (fall between beams = demotion to the slab
  // top or, at a funnel, all the way to the crypt)
  L.clear(250, 15, 4, 2); L.clear(288, 15, 3, 2); L.clear(310, 15, 3, 2); L.clear(332, 15, 3, 2);
  L.fill(250, 28, 100, 2, '#');                 // crypt floor
  // rafters entry: a one-way ladder rising straight through the left
  // funnel (climbing under the slab anywhere else bonks on its underside)
  L.fill(250, 24, 4, 1, '='); L.fill(250, 20, 4, 1, '='); L.fill(250, 16, 4, 1, '=');
  // rafter beams (one-way: dropping off is always possible)
  L.fill(262, 12, 10, 1, '='); L.fill(276, 10, 5, 1, '='); L.fill(284, 13, 6, 1, '=');
  L.fill(293, 10, 5, 1, '='); L.fill(301, 12, 6, 1, '='); L.fill(310, 10, 5, 1, '=');
  L.fill(318, 13, 6, 1, '='); L.fill(327, 10, 5, 1, '='); L.fill(334, 12, 6, 1, '=');
  L.spawn('bat', 274, 8); L.spawn('bat', 290, 7); L.spawn('bat', 306, 8); L.spawn('bat', 322, 7);
  for (const [x, y] of [[266, 11], [278, 9], [287, 12], [295, 9], [304, 11], [312, 9], [320, 12], [329, 9], [337, 11]])
    L.spawn('spark', x, y);
  // crypt furniture
  L.fill(258, 25, 3, 3, '#'); L.fill(274, 25, 2, 3, '#'); L.fill(302, 25, 3, 3, '#'); L.fill(328, 25, 2, 3, '#');
  L.fill(270, 17, 2, 3, '#'); L.fill(296, 17, 2, 3, '#'); L.fill(320, 17, 2, 3, '#');
  L.fill(280, 27, 3, 1, '^'); L.fill(298, 27, 3, 1, '^'); L.fill(324, 27, 2, 1, '^');
  L.fill(262, 17, 1, 3, '|'); L.fill(285, 17, 1, 4, '|'); L.fill(316, 17, 1, 3, '|');
  for (const x of [256, 269, 283, 294, 308, 322, 336]) L.spawn('wretch', x, 27);
  L.spawn('garg', 303, 24);
  L.spawn('heart', 278, 26); L.spawn('heart', 314, 26);
  for (const x of [254, 272, 290, 316, 334]) L.spawn('candle', x, 27);
  L.spawn('signup', 251, 27); L.spawn('signdown', 254, 27);
  L.zone(250, 0, 341, 16, 'THE RAFTERS', 'split2');
  L.zone(250, 17, 341, 29, 'THE CRYPT', 'split2');

  // ══ E · THE ASCENT + THE VESPER BELL (x 342-419) ══════════════════
  L.fill(342, 28, 76, 2, '#');                  // convergence shaft floor
  L.spawn('check', 352, 27);
  const steps = [[358, 26], [364, 24], [370, 22], [376, 20], [382, 18], [388, 16], [394, 14]];
  for (const [x, top] of steps) L.fill(x, top, 6, 30 - top, '#');
  L.fill(400, 12, 20, 18, '#');                 // summit platform
  for (const [x, top] of steps) L.spawn('candle', x + 2, top - 1);
  L.spawn('wretch', 366, 23); L.spawn('wretch', 378, 19); L.spawn('wretch', 390, 15);
  L.spawn('bat', 372, 16); L.spawn('bat', 386, 12);
  L.spawn('garg', 396, 13);   // feet on step7 (top row 14)
  for (const [x, y] of [[360, 24], [366, 22], [372, 20], [378, 18], [384, 16], [390, 14], [396, 12]])
    L.spawn('spark', x, y);
  // belfry: two posts and a beam; the bell entity hangs beneath
  L.fill(404, 9, 2, 3, '#'); L.fill(414, 9, 2, 3, '#');
  L.fill(404, 8, 12, 1, '#');
  L.spawn('bell', 409.5, 9);   // centered under the 404-415 beam
  L.zone(342, 0, 399, 29, 'THE ASCENT', null);
  L.zone(400, 0, 419, 29, 'THE VESPER BELL', null);

  // ── finalize ──────────────────────────────────────────────────────
  const rows = L.g.map(r => r.join(''));
  return {
    w: LEVEL_W, h: LEVEL_H, rows,
    spawns: L.spawns, zones: L.zones, interiors: L.interiors,
    playerStart: { x: 5 * TW, y: 24 * TW },
    tileAt(tx, ty) {
      if (tx < 0 || tx >= this.w) return '#';
      if (ty >= this.h) return '#';
      if (ty < 0) return ' ';
      return this.rows[ty][tx];
    },
    solidAt(tx, ty) { return this.tileAt(tx, ty) === '#'; },
    oneWayAt(tx, ty) { return this.tileAt(tx, ty) === '='; },
    spikeAt(tx, ty) { return this.tileAt(tx, ty) === '^'; },
    zoneAt(px, py) {
      const tx = px / TW, ty = py / TW;
      for (const z of this.zones)
        if (tx >= z.x0 && tx <= z.x1 + 1 && ty >= z.y0 && ty <= z.y1 + 1) return z;
      return null;
    },
    isInterior(tx) {
      for (const r of this.interiors) if (tx >= r.x0 && tx <= r.x1) return r;
      return null;
    },
  };
}
