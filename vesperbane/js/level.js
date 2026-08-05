// ── VESPERBANE · level.js ────────────────────────────────────────────
// One continuous 420x30 map. Two forks (rooftops/catacombs, then
// rafters/crypt); the fast route is always the risky one, and falling
// off it drops you into the slow route instead of killing you.
//
// Movement budget (see entities.js CONFIG): held jump clears ~4 tiles
// up; a full-speed jump crosses ~6-7 tiles; dash-jump at velocity
// tier 1+ crosses ~9. Gaps are sized against those numbers.
//
// Grid legend: '#' solid  'B' breakable solid  '=' one-way platform
//              '^' spikes  '|' chain decor  'G' ward-ghost platform
//              ' ' air
//
// 'G' tiles are spectral shortcuts grouped by a nearby Ward Bell. A group
// becomes solid when the player strikes its bell and remains so for that life.
// The distant Vesper Toll may still drive ambience / enemies through
// level.tollActive, but it no longer owns platform collision.
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
    this.ghostGroups = new Map();       // "tx,ty" -> Ward Bell group id
    this.breakableFaces = [];           // authored connected B-tile faces
  }
  fill(x, y, w, h, ch) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < this.w && j >= 0 && j < this.h) this.g[j][i] = ch;
  }
  clear(x, y, w, h) { this.fill(x, y, w, h, ' '); }
  put(x, y, ch) { if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.g[y][x] = ch; }
  ghostFill(group, x, y, w, h) {
    this.fill(x, y, w, h, 'G');
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < this.w && j >= 0 && j < this.h)
          this.ghostGroups.set(i + ',' + j, group);
  }
  wardBell(group, tx, ty, props) {
    this.spawn('wardbell', tx, ty, Object.assign({ group }, props || {}));
  }
  breakableFace(id, x, y, w, h, props) {
    const tiles = [];
    this.fill(x, y, w, h, 'B');
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < this.w && j >= 0 && j < this.h) tiles.push({ x: i, y: j });
    this.breakableFaces.push(Object.assign({ id, tiles }, props || {}));
  }
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
  L.spawn('check', 84, 25, { whisper: 'THE BELLKEEPER IS DEAD. THE NIGHT FORGOT TO END.' });
  L.spawn('signup', 87, 25); L.spawn('signdown', 90, 27);
  // A permanent upper micro-route teaches that height is optional: every miss
  // lands on the main walk, while the Ward Bell ledges remain faster lines.
  L.fill(29, 20, 5, 1, '='); L.fill(47, 19, 5, 1, '=');
  L.fill(64, 18, 5, 1, '='); L.fill(75, 20, 6, 1, '=');
  // Ward groups: RAMPART_WEST / MID / EAST each owns one ghost bridge.
  L.ghostFill('RAMPART_WEST', 33, 22, 5, 1);
  L.ghostFill('RAMPART_MID', 51, 21, 5, 1);
  L.ghostFill('RAMPART_EAST', 69, 22, 5, 1);
  L.wardBell('RAMPART_WEST', 32, 25, { whisper: 'STRIKE THE WARD. THE DEAD WILL HOLD.' });
  L.wardBell('RAMPART_MID', 50, 25);
  L.wardBell('RAMPART_EAST', 68, 25);
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
  L.fill(142, 12, 2, 2, '#'); L.fill(166, 12, 2, 2, '#');
  // ── THE SPIRE: secret third route over everything ──────────────────
  // A wall-kick shaft rises from the first roof (jump into the mouth at
  // x106-109); the right wall is shorter so you exit east onto a sky-run
  // of narrow platforms that skips the whole rooftop line.
  L.fill(104, 0, 2, 11, '#');                   // left tower wall, rows 0-10
  L.fill(110, 3, 2, 8, '#');                    // right tower wall, rows 3-10
  L.spawn('spark', 107, 12); L.spawn('spark', 107, 9); L.spawn('spark', 108, 6); L.spawn('spark', 107, 4);
  const sky = [[114, 4], [121, 3], [128, 5], [135, 3], [142, 4], [149, 3], [156, 5], [163, 3], [170, 4], [177, 5]];
  for (const [x, top] of sky) L.fill(x, top, 4, 1, '=');
  for (const [x, top] of sky) L.spawn('spark', x + 2, top - 2);
  L.spawn('heart', 143, 2);
  L.spawn('bat', 132, 1); L.spawn('bat', 160, 1);
  L.zone(104, 0, 183, 6, 'THE SPIRE', 'split1');   // checked before ROOFTOPS
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
  for (const x of [96, 111, 127, 145, 167]) L.spawn('bones', x, 27);
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
  L.spawn('check', 192, 27, { whisper: 'EVERY UNRUNG HOUR, THE DEAD GROW BOLDER.' });
  L.spawn('candle', 188, 27); L.spawn('candle', 197, 27);
  // Ward group PLAZA_RISE: optional stair from the converged plaza back to height.
  L.ghostFill('PLAZA_RISE', 186, 20, 4, 1); L.ghostFill('PLAZA_RISE', 192, 17, 4, 1);
  L.ghostFill('PLAZA_RISE', 198, 14, 4, 1); L.ghostFill('PLAZA_RISE', 204, 12, 5, 1);
  L.wardBell('PLAZA_RISE', 185, 27, { whisper: 'ONE STRIKE. ONE ROAD HELD FAST.' });
  L.zone(184, 0, 199, 29, 'BELL PLAZA', null);

  // ══ C · THE NAVE (x 200-249) — interior, vertical play ════════════
  L.interior(200, 249, true);      // moonlit windows
  L.interior(250, 341, false);     // crypt: windowless dark
  L.fill(200, 2, 150, 2, '#');                  // cathedral ceiling C+D
  L.fill(200, 28, 50, 2, '#');
  // balconies
  L.fill(204, 23, 6, 1, '='); L.fill(212, 19, 6, 1, '='); L.fill(220, 23, 8, 1, '=');
  L.fill(230, 16, 6, 1, '='); L.fill(238, 20, 6, 1, '='); L.fill(244, 24, 4, 1, '=');
  // Nave crosslinks make the high heart route reachable without an enemy pogo.
  // They are one-way, so dropping always returns to the combat floor.
  L.fill(226, 20, 4, 1, '='); L.fill(236, 17, 4, 1, '=');
  L.fill(246, 21, 4, 1, '=');
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
  L.spawn('check', 248, 27, { whisper: 'THE CHOIR FLED. YOU STAYED.' });
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
  for (const x of [261, 287, 311, 331]) L.spawn('bones', x, 27);
  // Ward group CRYPT_CHOIR: one player-triggered express lane over the furniture.
  L.ghostFill('CRYPT_CHOIR', 264, 20, 4, 1); L.ghostFill('CRYPT_CHOIR', 272, 21, 4, 1);
  L.ghostFill('CRYPT_CHOIR', 280, 20, 4, 1); L.ghostFill('CRYPT_CHOIR', 288, 21, 4, 1);
  L.ghostFill('CRYPT_CHOIR', 296, 20, 4, 1); L.ghostFill('CRYPT_CHOIR', 304, 21, 4, 1);
  L.ghostFill('CRYPT_CHOIR', 312, 20, 4, 1);
  L.wardBell('CRYPT_CHOIR', 255, 27, { whisper: 'WAKE THE CHOIR. RUN ABOVE ITS TEETH.' });
  L.spawn('signup', 251, 27); L.spawn('signdown', 254, 27);
  L.zone(250, 0, 341, 16, 'THE RAFTERS', 'split2');
  L.zone(250, 17, 341, 29, 'THE CRYPT', 'split2');

  // ══ E · THE ASCENT + THE VESPER BELL (x 342-419) ══════════════════
  L.fill(342, 28, 76, 2, '#');                  // convergence shaft floor
  L.spawn('check', 352, 27, { whisper: 'THE SHADE KEEPS YOUR BELL. GO TAKE IT BACK.' });
  // Ward group ASCENT_PEAL: the fastest line, activated before the first step.
  L.ghostFill('ASCENT_PEAL', 368, 19, 4, 1); L.ghostFill('ASCENT_PEAL', 377, 15, 4, 1);
  L.ghostFill('ASCENT_PEAL', 386, 12, 4, 1); L.ghostFill('ASCENT_PEAL', 394, 10, 4, 1);
  L.wardBell('ASCENT_PEAL', 356, 27, { whisper: 'RING YOUR OWN ROAD INTO BEING.' });
  const steps = [[358, 26], [364, 24], [370, 22], [376, 20], [382, 18], [388, 16], [394, 14]];
  for (const [x, top] of steps) L.fill(x, top, 6, 30 - top, '#');
  // A middle line crosses the solid stair in short, safe jumps. Missing it
  // drops onto the staircase rather than into damage or a reset.
  L.fill(361, 22, 5, 1, '='); L.fill(367, 21, 5, 1, '=');
  L.fill(373, 18, 5, 1, '='); L.fill(380, 16, 5, 1, '=');
  L.fill(387, 14, 5, 1, '='); L.fill(394, 12, 5, 1, '=');
  L.fill(400, 12, 20, 18, '#');                 // summit platform
  for (const [x, top] of steps) L.spawn('candle', x + 2, top - 1);
  L.spawn('wretch', 366, 23); L.spawn('wretch', 378, 19); L.spawn('wretch', 390, 15);
  L.spawn('bat', 372, 16); L.spawn('bat', 386, 12);
  L.spawn('garg', 384, 17);   // moved off the boss-door checkpoint; feet on step5
  for (const [x, y] of [[360, 24], [366, 22], [372, 20], [378, 18], [384, 16], [390, 14], [396, 12]])
    L.spawn('spark', x, y);
  // Boss-door lantern: x400 is on the summit and is touched before the x402
  // trigger. Explicit pixel respawn metadata avoids the legacy 20px-player /
  // 16px-lantern floor overlap while older runtimes can still use tx / ty.
  L.spawn('check', 400, 11, {
    whisper: 'NO MORE STAIRS. ONLY THE BELLKEEPER.',
    bossDoor: true,
    respawnX: 400 * TW + 3,
    respawnY: 12 * TW - 20,
  });
  // belfry: two posts and a beam; the bell entity hangs beneath
  L.fill(404, 9, 2, 3, '#'); L.fill(414, 9, 2, 3, '#');
  L.fill(404, 8, 12, 1, '#');
  // Classic far-right wall chicken. x419 remains an unbreakable world seal.
  L.breakableFace('BOSS_CHICKEN_WALL', 418, 10, 1, 2, {
    hiddenSpawn: { type: 'chicken', tx: 418, ty: 11, heal: 3 },
  });
  L.spawn('bell', 409.5, 9);   // centered under the 404-415 beam
  L.zone(342, 0, 399, 29, 'THE ASCENT', null);
  L.zone(400, 0, 419, 29, 'THE VESPER BELL', null);

  return finalizeLevel(L, {
    id: 0, name: 'NIGHT I', sub: 'THE UNRUNG BELL',
    playerStart: { x: 5 * TW, y: 24 * TW },
    bossAt: { x: 402, kind: 'shade' },
  });
}

// ═══════════════════════════════════════════════════════════════════
// NIGHT II · THE UNDERTOLL
// You rang the bell; dawn broke; then the cracked bell's sound FELL,
// and you follow it underground. The Pale Hound hunts you — and where
// the toll gave you shortcuts, here it SURGES the Hound. Keep moving.
// ═══════════════════════════════════════════════════════════════════
function buildLevelTwo() {
  const W2 = 400;
  const L = new LevelBuilder(W2, LEVEL_H);
  L.fill(0, 29, W2, 1, '#');                    // seal (no void deaths)
  L.fill(0, 0, 2, 30, '#');
  L.fill(W2 - 2, 0, 2, 30, '#');

  // ══ A · THE STAIR DOWN (x2-70) — descend to the baseline ══════════
  L.fill(2, 16, 15, 2, '#');                    // high start landing
  L.spawn('check', 6, 15, { whisper: 'THE BELL CRACKED AT DAWN. ITS LAST NOTE FELL. FOLLOW.' });
  L.fill(20, 19, 8, 1, '=');
  L.fill(30, 22, 8, 1, '=');
  L.fill(40, 25, 8, 1, '=');
  L.fill(44, 27, 26, 3, '#');                   // baseline floor rows27-29
  for (const [x, y] of [[22, 18], [32, 21], [42, 24], [56, 25]]) L.spawn('spark', x, y);
  L.spawn('candle', 50, 26); L.spawn('candle', 64, 26);
  L.spawn('wretch', 60, 26);
  L.spawn('bones', 47, 26);
  L.zone(0, 0, 70, 29, 'THE STAIR DOWN', null);

  // ══ B · THE OSSUARY (x70-172) — corridor; toll arcs are shortcuts ═
  L.fill(70, 27, 102, 3, '#');
  L.fill(84, 26, 3, 1, '^');                    // small spike hop
  // spiked pit — jumpable at speed; the ghost arc is the faster line
  L.clear(104, 27, 6, 2); L.fill(104, 28, 6, 1, '^');
  // Ward group OSSUARY_ARC: a player-triggered shortcut over the pit.
  L.ghostFill('OSSUARY_ARC', 104, 24, 6, 1);
  L.wardBell('OSSUARY_ARC', 101, 26, { whisper: 'STRIKE. CROSS. DO NOT WAIT.' });
  L.spawn('check', 122, 26, { whisper: 'IT GAINS WHEN THE BELL RINGS. SPEND THE TOLL AND GO.' });
  // pillars & hanging fangs
  L.fill(130, 24, 2, 3, '#'); L.fill(146, 24, 2, 3, '#'); L.fill(160, 24, 2, 3, '#');
  L.fill(138, 21, 2, 3, '#');
  L.fill(126, 21, 1, 3, '|'); L.fill(153, 21, 1, 4, '|');
  L.fill(166, 26, 3, 1, '^');
  for (const x of [74, 118, 143, 168]) L.spawn('bones', x, 26);
  for (const x of [80, 134, 150, 170]) L.spawn('candle', x, 26);
  L.spawn('heart', 106, 22);
  for (const x of [96, 142, 158]) L.spawn('wretch', x, 26);
  L.spawn('bat', 140, 20); L.spawn('bat', 162, 19);
  for (const [x, y] of [[106, 23], [131, 23], [150, 23]]) L.spawn('spark', x, y);
  L.zone(70, 0, 172, 29, 'THE OSSUARY', null);

  // ══ C · THE DROWNED NAVE (x172-268) — interior, vertical climb ════
  L.interior(172, 268, false);
  L.fill(172, 2, 96, 2, '#');                   // ceiling
  L.fill(172, 27, 96, 3, '#');                  // continuous floor (no forced gap)
  L.spawn('check', 178, 26, { whisper: 'THE HOUND WAS A KEEPER ONCE. NOW IT ONLY RUNS YOU DOWN.' });
  L.fill(190, 26, 3, 1, '^');                   // spike hop
  // balconies to climb for the heart (optional height route)
  L.fill(184, 23, 6, 1, '='); L.fill(196, 20, 6, 1, '='); L.fill(208, 17, 6, 1, '=');
  L.fill(220, 20, 6, 1, '='); L.fill(232, 23, 6, 1, '=');
  // a jumpable spiked pit with a ghost shortcut over it
  L.clear(244, 27, 6, 2); L.fill(244, 28, 6, 1, '^');
  // Ward group DROWNED_CROSSING: an optional high line over the flooded pit.
  L.ghostFill('DROWNED_CROSSING', 245, 24, 5, 1);
  L.wardBell('DROWNED_CROSSING', 242, 26, { whisper: 'THE DROWNED STILL ANSWER A BELL.' });
  L.fill(210, 4, 1, 6, '|'); L.fill(240, 4, 1, 7, '|');
  L.spawn('garg', 204, 16); L.spawn('garg', 258, 26);
  L.spawn('bat', 216, 12); L.spawn('bat', 236, 10);
  L.spawn('heart', 209, 16);
  for (const [x, y] of [[186, 22], [197, 19], [209, 16], [246, 23]]) L.spawn('spark', x, y);
  L.spawn('candle', 176, 26); L.spawn('candle', 260, 26);
  L.spawn('wretch', 226, 26); L.spawn('bones', 254, 26);
  L.zone(172, 0, 268, 29, 'THE DROWNED NAVE', null);

  // ══ D · THE HOLLOW STAIR (x268-330) — tight climb ════════════════
  L.fill(268, 27, 62, 3, '#');
  const st = [[276, 25], [284, 23], [292, 21], [300, 19], [308, 21], [316, 23]];
  for (const [x, top] of st) L.fill(x, top, 6, 30 - top, '#');
  L.fill(288, 26, 2, 1, '^'); L.fill(320, 26, 2, 1, '^');
  L.spawn('wretch', 278, 24); L.spawn('wretch', 302, 18); L.spawn('wretch', 322, 22);
  L.spawn('bat', 296, 16); L.spawn('garg', 312, 20);
  L.spawn('heart', 301, 17);
  for (const [x, y] of [[276, 24], [292, 20], [308, 20], [324, 22]]) L.spawn('spark', x, y);
  for (const x of [282, 318] ) L.spawn('candle', x, 22);
  L.zone(268, 0, 330, 29, 'THE HOLLOW STAIR', null);

  // ══ E · THE UNDERTOLL (x330-399) — the Tollbearer arena ══════════
  L.fill(330, 27, 70, 3, '#');
  L.spawn('check', 336, 26, { whisper: 'IT KEEPS YOUR BELL IN ITS CHEST. TAKE IT BACK.' });
  L.fill(330, 3, 70, 1, '#');                   // arena ceiling
  L.fill(352, 22, 2, 5, '#'); L.fill(376, 22, 2, 5, '#');   // cover pillars
  L.fill(364, 18, 4, 1, '=');                   // center perch
  L.spawn('candle', 333, 26); L.spawn('candle', 396, 26);
  L.zone(330, 0, 399, 29, 'THE UNDERTOLL', null);

  return finalizeLevel(L, {
    id: 1, name: 'NIGHT II', sub: 'THE UNDERTOLL',
    playerStart: { x: 6 * TW, y: 13 * TW },
    bossAt: { x: 342, kind: 'tollbearer' },
    hunter: { startX: -6 },
  });
}

const LEVELS = [
  { build: buildLevel },
  { build: buildLevelTwo },
];

// shared finalize: bakes a LevelBuilder into the runtime level object
function finalizeLevel(L, meta) {
  const W = L.w, H = L.h;
  const rows = L.g.map(r => r.join(''));
  const ghostGroupByTile = new Map(L.ghostGroups);
  const bellGroupSet = new Set();
  const ghosts = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (rows[y][x] === 'G') {
        const group = ghostGroupByTile.get(x + ',' + y) || 'LEGACY_GHOSTS';
        ghostGroupByTile.set(x + ',' + y, group);
        bellGroupSet.add(group);
        ghosts.push({ x, y, group });
      }

  const breakables = L.breakableFaces.map(face => ({
    id: face.id,
    tiles: face.tiles.map(t => ({ x: t.x, y: t.y })),
    hiddenSpawn: face.hiddenSpawn ? Object.assign({}, face.hiddenSpawn) : null,
  }));
  const breakableByTile = new Map();
  for (const face of breakables)
    for (const tile of face.tiles) breakableByTile.set(tile.x + ',' + tile.y, face);
  const activeBellGroups = new Set();
  const brokenTiles = new Set();

  return {
    id: meta.id, name: meta.name, sub: meta.sub,
    bossAt: meta.bossAt || null,
    hunter: meta.hunter || null,          // Night II: { startX } chaser
    ghosts,                               // [{ x, y, group }]
    bellGroups: Array.from(bellGroupSet),
    ghostGroupByTile,
    activeBellGroups,
    breakables,
    hiddenSpawns: breakables.filter(f => f.hiddenSpawn).map(f => Object.assign({ faceId: f.id }, f.hiddenSpawn)),
    brokenTiles,
    w: W, h: H, rows,
    spawns: L.spawns, zones: L.zones, interiors: L.interiors,
    playerStart: meta.playerStart,
    inBounds(tx, ty) {
      return tx >= 0 && tx < this.w && ty >= 0 && ty < this.h;
    },
    rawTileAt(tx, ty) {
      if (tx < 0 || tx >= this.w) return '#';
      if (ty >= this.h) return '#';
      if (ty < 0) return ' ';
      return this.rows[ty][tx];
    },
    tileAt(tx, ty) {
      const ch = this.rawTileAt(tx, ty);
      if (ch === 'B' && this.brokenTiles.has(tx + ',' + ty)) return ' ';
      return ch;
    },
    // Retained for the atmospheric Toll and the Night II Hound. It deliberately
    // no longer changes G-tile collision.
    tollActive: false,
    ghostGroupAt(tx, ty) { return this.ghostGroupByTile.get(tx + ',' + ty) || null; },
    isGhostActiveAt(tx, ty) {
      const group = this.ghostGroupAt(tx, ty);
      return !!group && this.activeBellGroups.has(group);
    },
    activateBellGroup(group) {
      if (!group || !bellGroupSet.has(group)) return false;
      const wasActive = this.activeBellGroups.has(group);
      this.activeBellGroups.add(group);
      return !wasActive;
    },
    resetBellGroups() { this.activeBellGroups.clear(); },
    solidAt(tx, ty) {
      const ch = this.tileAt(tx, ty);
      return ch === '#' || ch === 'B';
    },
    oneWayAt(tx, ty) {
      const ch = this.tileAt(tx, ty);
      return ch === '=' || (ch === 'G' && this.isGhostActiveAt(tx, ty));
    },
    breakTile(tx, ty) {
      tx = Math.floor(tx); ty = Math.floor(ty);
      if (!this.inBounds(tx, ty)) return null;
      const startKey = tx + ',' + ty;
      if (this.rawTileAt(tx, ty) !== 'B' || this.brokenTiles.has(startKey)) return null;

      const authored = breakableByTile.get(startKey) || null;
      let tiles;
      if (authored) {
        tiles = authored.tiles;
      } else {
        // Safe fallback for a hand-authored B without a face declaration:
        // break only its orthogonally connected B component.
        tiles = [];
        const seen = new Set(), stack = [{ x: tx, y: ty }];
        while (stack.length) {
          const cur = stack.pop(), key = cur.x + ',' + cur.y;
          if (seen.has(key) || !this.inBounds(cur.x, cur.y) || this.rawTileAt(cur.x, cur.y) !== 'B') continue;
          seen.add(key); tiles.push(cur);
          stack.push({ x: cur.x + 1, y: cur.y }, { x: cur.x - 1, y: cur.y },
            { x: cur.x, y: cur.y + 1 }, { x: cur.x, y: cur.y - 1 });
        }
      }
      for (const tile of tiles) this.brokenTiles.add(tile.x + ',' + tile.y);
      const xs = tiles.map(t => t.x), ys = tiles.map(t => t.y);
      const bounds = {
        x0: Math.min(...xs), y0: Math.min(...ys),
        x1: Math.max(...xs), y1: Math.max(...ys),
      };
      return {
        id: authored ? authored.id : null,
        tiles: tiles.map(t => ({ x: t.x, y: t.y })),
        bounds,
        worldCenter: {
          x: ((bounds.x0 + bounds.x1 + 1) * TW) / 2,
          y: ((bounds.y0 + bounds.y1 + 1) * TW) / 2,
        },
        hiddenSpawn: authored && authored.hiddenSpawn ? Object.assign({}, authored.hiddenSpawn) : null,
      };
    },
    resetBreakables() { this.brokenTiles.clear(); },
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
