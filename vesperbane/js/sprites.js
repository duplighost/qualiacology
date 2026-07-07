// ── VESPERBANE · sprites.js ──────────────────────────────────────────
// All art is authored as palette-indexed string grids, baked to
// canvases at boot. Right-facing is the authored direction; flipped
// and silhouette (afterimage) variants are baked too.
'use strict';

const PAL = {
  '.': null,
  'K': '#14121f', // outline
  'R': '#c22e46', // crimson bright
  'r': '#7e1830', // crimson dark
  'D': '#23263d', // coat dark
  'd': '#3a3f61', // coat mid
  'L': '#565d85', // coat light
  'S': '#dfe2ee', // steel bright
  's': '#8d94b3', // steel shadow
  'F': '#eed9b6', // skin
  'f': '#c7a37f', // skin shadow
  'H': '#f4f2fa', // hair white
  'h': '#b6b3cf', // hair shadow
  'O': '#ff9b2f', // flame orange
  'Y': '#ffe27a', // flame yellow
  'G': '#4bd48e', // ghoul light
  'g': '#2b8256', // ghoul dark
  'B': '#8d7bd0', // bat light
  'b': '#574a82', // bat dark
  'M': '#9a9ab8', // stone light
  'm': '#61617f', // stone dark
  'W': '#d1a854', // brass light
  'w': '#8e6f30', // brass dark
  'C': '#7fe9f5', // cyan bright
  'c': '#3fa8bd', // cyan dark
  'P': '#ff6b8f', // heart pink
};

// ── raw art ──────────────────────────────────────────────────────────
const ART = {};

// The Vesper. 16x24. White hair, crimson scarf, slate coat.
ART.player = {
idle: [[
'................',
'................',
'......KHHK......',
'.....KHHHHK.....',
'....KHhFFFK.....',
'....KHhFKFK.....',
'.....KhFFfK.....',
'......KRRK......',
'..RRrKRRRRK.....',
'.Rr..KDddDK.....',
'.....KDdddDK....',
'....KdDdddDK....',
'....KdDdddDK....',
'....Kf.DddD.K...',
'......KDdDK.....',
'......KDdDK.....',
'......KdKdK.....',
'......Kd.dK.....',
'......Kd.dK.....',
'......Kd.dK.....',
'......Kd.dK.....',
'......KD.DK.....',
'.....KDD.DDK....',
'......KK..KK....',
],[
'................',
'................',
'......KHHK......',
'.....KHHHHK.....',
'....KHhFFFK.....',
'....KHhFFFK.....',
'.....KhFFfK.....',
'......KRRK......',
'...RRrKRRRK.....',
'..Rr.KDddDK.....',
'.....KDdddDK....',
'....KdDdddDK....',
'....KdDdddDK....',
'....Kf.DddD.K...',
'......KDdDK.....',
'......KDdDK.....',
'......KdKdK.....',
'......Kd.dK.....',
'......Kd.dK.....',
'......Kd.dK.....',
'......Kd.dK.....',
'......KD.DK.....',
'.....KDD.DDK....',
'......KK..KK....',
]],
// 6-frame sprint. Big strides, scarf streaming behind.
run: [[
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'.RRRrKRRRRK.....',
'Rr...KDddDK.....',
'.....KDdddDK....',
'....KdDdddDK....',
'.....KDdddDK....',
'......KDddK.....',
'......KdddK.....',
'.....KdKKdK.....',
'....KdK..KdK....',
'...KdK....KdK...',
'..KdK......KdK..',
'..KDK.......KdK.',
'.KDDK.......KDK.',
'.KKK.......KDDK.',
'...........KKK..',
'................',
],[
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'..RRrKRRRRK.....',
'.Rr..KDddDK.....',
'.....KDdddDK....',
'....KdDdddDK....',
'.....KDdddDK....',
'......KDddK.....',
'......KdddK.....',
'.....KdKdK......',
'.....Kd.KdK.....',
'....KdK..KdK....',
'....KdK...KdK...',
'....KDK...KDK...',
'...KDDK...KDK...',
'...KKK....KDDK..',
'..........KKK...',
'................',
],[
'................',
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'..RRrKRRRRK.....',
'.....KDddDK.....',
'.....KDdddDK....',
'....KdDdddDK....',
'.....KDdddDK....',
'......KDddK.....',
'......KdddK.....',
'......KdKdK.....',
'......KdKdK.....',
'.....KdKKdK.....',
'.....KDK.KdK....',
'.....KDDK.KDK...',
'......KKK.KDDK..',
'..........KKK...',
'................',
],[
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'.RRRrKRRRRK.....',
'Rr...KDddDK.....',
'.....KDdddDK....',
'....KdDdddDK....',
'.....KDdddDK....',
'......KDddK.....',
'......KdddK.....',
'.....KdKKdK.....',
'....KdK...KdK...',
'....KdK....KdK..',
'...KdK......KdK.',
'...KDK......KDK.',
'..KDDK.......KDK',
'..KKK.......KKDK',
'.............KK.',
'................',
],[
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'..RRrKRRRRK.....',
'.Rr..KDddDK.....',
'.....KDdddDK....',
'....KdDdddDK....',
'.....KDdddDK....',
'......KDddK.....',
'......KdddK.....',
'.....KdKdK......',
'....KdK.KdK.....',
'....KdK..KdK....',
'...KdK....KdK...',
'...KDK....KDK...',
'..KDDK....KDK...',
'..KKK.....KDDK..',
'..........KKK...',
'................',
],[
'................',
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'..RRrKRRRRK.....',
'.....KDddDK.....',
'.....KDdddDK....',
'....KdDdddDK....',
'.....KDdddDK....',
'......KDddK.....',
'......KdddK.....',
'......KdKdK.....',
'......KdKdK.....',
'.....KdK.KdK....',
'.....KdK..KdK...',
'.....KDDK.KDK...',
'......KKK.KDDK..',
'..........KKK...',
'................',
]],
jump: [[
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'..RRrKRRRRK.....',
'.Rr.KdDddDK.....',
'....KdDdddDK....',
'.....KDdddDK....',
'.....KDdddK.....',
'......KdddK.....',
'.....KdKKdK.....',
'.....KdK.KdK....',
'....KdK...KdK...',
'....KDK...KDDK..',
'....KDDK...KKK..',
'.....KKK........',
'................',
'................',
'................',
'................',
],],
fall: [[
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'.RRrKRRRRRK.....',
'.r..KdDddDK.....',
'....KdDdddDK....',
'.....KDdddDK....',
'.....KDdddK.....',
'......KdddK.....',
'......KdKdK.....',
'.....KdK.KdK....',
'.....KdK..KdK...',
'.....KDK..KDK...',
'....KDDK..KDDK..',
'....KKK....KKK..',
'................',
'................',
'................',
'................',
]],
dash: [[
'................',
'................',
'................',
'................',
'................',
'........KHHHK...',
'.......KHHHHHK..',
'......KHhFFFFK..',
'......KHhFKFfK..',
'.......KRRRRK...',
'.RRRRrKRRRRK....',
'RRr..KDdddddDK..',
'Rr..KdDdddddDdK.',
'....KdDdddddDdK.',
'.....KDddddDK...',
'....KdKKKKdK....',
'..KKdK....KKdKK.',
'.KDDK......KKDDK',
'.KKK........KKK.',
'................',
'................',
'................',
'................',
'................',
]],
slide: [[
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'........KHHHK...',
'.......KHHHHHK..',
'..RRRrKHhFFFFK..',
'.RRr..KhFKFfK...',
'.....KRRRRRK....',
'...KDdddddddDK..',
'..KdDdddddddDdK.',
'..KdDdddddddDdK.',
'...KDKKKKKKDDK..',
'....KK.....KKK..',
'................',
'................',
'................',
'................',
]],
// slash: windup, swing (blade out), follow-through
slash: [[
'................',
'................',
'......KHHK......',
'.....KHHHHK.....',
'....KHhFFFK.....',
'....KHhFKFK.....',
'.....KhFFfK.....',
'......KRRK......',
'..RRrKRRRRK.....',
'.Rr.KSDddDK.....',
'....KsSdddDK....',
'.....KsSddDK....',
'.....KDdddDK....',
'......KDddK.....',
'......KdddK.....',
'.....KdKKdK.....',
'.....Kd..KdK....',
'....KdK...KdK...',
'....KDK...KDK...',
'...KDDK...KDDK..',
'...KKK.....KKK..',
'................',
'................',
'................',
],[
'................',
'................',
'......KHHK......',
'.....KHHHHK.....',
'....KHhFFFK.....',
'....KHhFKFK.....',
'.....KhFFfK.....',
'......KRRK......',
'..RRrKRRRRK.....',
'.Rr..KDddDKfK...',
'.....KDdddDfSs..',
'....KdDdddDKSSs.',
'.....KDdddDK.SSs',
'......KDddK.....',
'......KdddK.....',
'.....KdKKdK.....',
'.....Kd..KdK....',
'....KdK...KdK...',
'....KDK...KDK...',
'...KDDK...KDDK..',
'...KKK.....KKK..',
'................',
'................',
'................',
],[
'................',
'................',
'......KHHK......',
'.....KHHHHK.....',
'....KHhFFFK.....',
'....KHhFKFK.....',
'.....KhFFfK.....',
'......KRRK......',
'..RRrKRRRRK.....',
'.Rr..KDddDK.....',
'.....KDdddDfK...',
'....KdDdddDKsK..',
'.....KDdddDK.s..',
'......KDddK.....',
'......KdddK.....',
'.....KdKKdK.....',
'.....Kd..KdK....',
'....KdK...KdK...',
'....KDK...KDK...',
'...KDDK...KDDK..',
'...KKK.....KKK..',
'................',
'................',
'................',
]],
pogo: [[
'................',
'................',
'.......KHHK.....',
'......KHHHHK....',
'.....KHhFFFK....',
'.....KHhFKFK....',
'......KhFFfK....',
'.......KRRK.....',
'..RRrKRRRRK.....',
'.Rr..KDddDK.....',
'.....KDdddDK....',
'.....KDdddDK....',
'......KDddK.....',
'.....KdKKdK.....',
'....KdK..KdK....',
'....KDK..KDK....',
'....KKK..KKK....',
'.......KfK......',
'.......KSK......',
'.......KSK......',
'.......KSK......',
'.......KsK......',
'........s.......',
'................',
]],
hurt: [[
'................',
'................',
'.....KHHK.......',
'....KHHHHK......',
'....KHhFFFK.....',
'....KHhFKFK.....',
'.....KhFFfK.....',
'......KRRK......',
'....KRRRRRRr....',
'....KDddDK..Rr..',
'...KdDdddDK.....',
'...KdDdddDdK....',
'....KDdddDK.....',
'.....KDddK......',
'.....KdddK......',
'....KdK.KdK.....',
'...KdK...KdK....',
'...KDK...KDK....',
'..KDDK...KDDK...',
'..KKK.....KKK...',
'................',
'................',
'................',
'................',
]],
};

// Wretch — hunched grave-thing. 16x20. walk x2 + lunge.
ART.wretch = {
walk: [[
'................',
'................',
'.....KGGK.......',
'....KGGGGK......',
'....KgKGgK......',
'....KGGGGK......',
'.....KggK.......',
'...KGGGGGGK.....',
'..KGGgGGgGGK....',
'..KGgGGGGgGK....',
'..KGGGGGGGGK....',
'..KgGGGGGGgK....',
'...KgGGGGgK.....',
'....KgGGgK......',
'....KgKKgK......',
'....Kg..gK......',
'...KgK..KgK.....',
'...KK....KK.....',
'................',
'................',
],[
'................',
'................',
'.....KGGK.......',
'....KGGGGK......',
'....KgKGgK......',
'....KGGGGK......',
'.....KggK.......',
'...KGGGGGGK.....',
'..KGGgGGgGGK....',
'..KGgGGGGgGK....',
'..KGGGGGGGGK....',
'..KgGGGGGGgK....',
'...KgGGGGgK.....',
'....KgGGgK......',
'....KgKgK.......',
'....Kg.gK.......',
'....KgKKgK......',
'....KK..KK......',
'................',
'................',
]],
lunge: [[
'................',
'................',
'................',
'......KGGK......',
'.....KGGGGK.....',
'.....KgKGgKK....',
'.....KGGGGGK....',
'...KGGGGGGGGK...',
'..KGGgGGgGGGGK..',
'..KGgGGGGgGGGK..',
'..KGGGGGGGGGK...',
'..KgGGGGGGgK....',
'...KgGGGGgK.....',
'...KgKKKKgK.....',
'..KgK....KgK....',
'..KK......KK....',
'................',
'................',
'................',
'................',
]],
};

// Bat — 14x10, wings up / down.
ART.bat = {
fly: [[
'.bK........Kb.',
'bBbK......KbBb',
'bBBbK....KbBBb',
'.bBBbKKKKbBBb.',
'..bBKBBBBKBb..',
'....KBKKBK....',
'.....KBBK.....',
'......KK......',
'..............',
'..............',
],[
'..............',
'..............',
'......KK......',
'..K.KBBBBK.K..',
'.KbKBBKKBBKbK.',
'.KbBbKBBKbBbK.',
'..KbBbKKbBbK..',
'...KbbK.KbbK..',
'....KK...KK...',
'..............',
]],
};

// Gargoyle — stone diver. 16x14 perched, 16x12 flying.
ART.garg = {
perch: [[
'.....KMMK.......',
'....KMmMMK......',
'....KmKRmK......',
'....KMMMMK......',
'..KMKMmmMKMK....',
'.KMmKMMMMKmMK...',
'.KMmMKmmKMmMK...',
'.KmMMKMMKMMmK...',
'..KmKMmmMKmK....',
'....KMmmMK......',
'....KmKKmK......',
'...KmK..KmK.....',
'...KK....KK.....',
'................',
],],
fly: [[
'KMMK........KMMK',
'KmMMK......KMMmK',
'.KmMMK....KMMmK.',
'..KmMMKKKKMMmK..',
'...KMKMMMMKMK...',
'....KMmKRmMK....',
'....KMMMMMMK....',
'.....KMmmMK.....',
'.....KmKKmK.....',
'....KmK..KmK....',
'....KK....KK....',
'................',
]],
};

// Candle — 8x6 brass base; flame is separate (8x6, 2 frames).
ART.candle = {
base: [[
'..KWWK..',
'..KwwK..',
'.KWwwWK.',
'.KwWWwK.',
'..KwwK..',
'.KWWWWK.',
]],
flame: [[
'...YY...',
'..YYYY..',
'..YOOY..',
'..OYYO..',
'...OO...',
'...KK...',
],[
'..YY....',
'..YYYY..',
'.YOOYY..',
'..OYYO..',
'...OO...',
'...KK...',
]],
};

ART.heart = [[
'.PP..PP.',
'PPPHPPPP',
'PPPPPPPP',
'KPPPPPPK',
'.KPPPPK.',
'..KPPK..',
'...KK...',
]];

ART.spark = [[
'...C...',
'..CCC..',
'.CCHCC.',
'..CCC..',
'...C...',
'.......',
],[
'...c...',
'..cCc..',
'.cCHCc.',
'..cCc..',
'...c...',
'.......',
]];

// Checkpoint lantern — 10x16, unlit / lit.
ART.lantern = {
off: [[
'....KK....',
'...KwwK...',
'..KwKKwK..',
'..KwKKwK..',
'.KWwwwwWK.',
'.KwKKKKwK.',
'.Kw.mm.wK.',
'.Kw.mm.wK.',
'.Kw....wK.',
'.KwKKKKwK.',
'.KWwwwwWK.',
'..KwwwwK..',
'...KWWK...',
'....KK....',
'..........',
'..........',
]],
on: [[
'....KK....',
'...KwwK...',
'..KwKKwK..',
'..KwKKwK..',
'.KWwwwwWK.',
'.KwKKKKwK.',
'.Kw.CC.wK.',
'.KwCCCCwK.',
'.Kw.CC.wK.',
'.KwKKKKwK.',
'.KWwwwwWK.',
'..KwwwwK..',
'...KWWK...',
'....KK....',
'..........',
'..........',
]],
};

// Route signpost — 12x12, arrow painted crimson.
ART.sign = {
up: [[
'..KKKKKKKK..',
'.KwwwRRwwwK.',
'.KwwRRRRwwK.',
'.KwRRRRRRwK.',
'.KwwwRRwwwK.',
'.KwwwRRwwwK.',
'..KKKKKKKK..',
'.....KK.....',
'.....KK.....',
'.....KK.....',
'.....KK.....',
'....KKKK....',
]],
down: [[
'..KKKKKKKK..',
'.KwwwRRwwwK.',
'.KwwwRRwwwK.',
'.KwRRRRRRwK.',
'.KwwRRRRwwK.',
'.KwwwRRwwwK.',
'..KKKKKKKK..',
'.....KK.....',
'.....KK.....',
'.....KK.....',
'.....KK.....',
'....KKKK....',
]],
};

// The Vesper Bell — 26x26 brass.
ART.bell = [[
'...........KKKK...........',
'..........KKWWKK..........',
'..........KWWWWK..........',
'.........KKWWWWKK.........',
'........KWWWWWWWWK........',
'.......KWWWwwwWWWWK.......',
'......KWWWwwwwwWWWWK......',
'......KWWwwwwwwwWWWK......',
'.....KWWWwwwwwwwwWWK......',
'.....KWWwwwwwwwwwWWWK.....',
'....KWWWwwwwwwwwwwWWK.....',
'....KWWwwwwwwwwwwwWWWK....',
'...KWWWwwwwwwwwwwwwWWK....',
'...KWWwwwwwwwwwwwwwWWWK...',
'...KWWwwwwwwwwwwwwwwWWK...',
'..KWWWwwwwwwwwwwwwwwWWK...',
'..KWWwwwwwwwwwwwwwwwWWWK..',
'..KWWwwwwwwwwwwwwwwwwWWK..',
'.KWWWWWWWWWWWWWWWWWWWWWWK.',
'.KWwwwwwwwwwwwwwwwwwwwwWK.',
'KWWWWWWWWWWWWWWWWWWWWWWWWK',
'KKKKKKKKKKKKKKKKKKKKKKKKKK',
'..........KKKKKK..........',
'..........KWWWWK..........',
'...........KWWK...........',
'............KK............',
]];

// ── baking ───────────────────────────────────────────────────────────
function bakeRows(rows, name) {
  const h = rows.length, w = rows[0].length;
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w)
      console.error('SPRITE ROW LENGTH MISMATCH', name, 'row', y, 'is', rows[y].length, 'want', w);
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < Math.min(w, rows[y].length); x++) {
      const col = PAL[rows[y][x]];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  }
  return c;
}

function flipCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.translate(src.width, 0); g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

function silhouette(src, color) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// ── procedural tiles ────────────────────────────────────────────────
function makeStoneTile(seed) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  g.fillStyle = '#2c2f4a';
  g.fillRect(0, 0, 16, 16);
  // brick courses, offset alternating rows
  g.fillStyle = '#1d1f33';
  g.fillRect(0, 7, 16, 1);
  g.fillRect(0, 15, 16, 1);
  const off = seed % 2 ? 4 : 10;
  g.fillRect(off, 0, 1, 7);
  g.fillRect((off + 8) % 16, 8, 1, 7);
  // speckle
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(rnd() * 16), y = Math.floor(rnd() * 16);
    g.fillStyle = rnd() < 0.5 ? '#343a58' : '#252840';
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

function makeBgBrickTile(seed) {
  // darker interior wall bricks (drawn behind gameplay in nave/crypt)
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed * 7 + 3);
  g.fillStyle = '#191b2e';
  g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#131426';
  g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1);
  g.fillRect(seed % 2 ? 5 : 11, 0, 1, 7);
  g.fillRect(seed % 2 ? 12 : 3, 8, 1, 7);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = '#20223a';
    g.fillRect(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1);
  }
  return c;
}

function makePlatformTile() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#3d2c20';
  g.fillRect(0, 0, 16, 5);
  g.fillStyle = '#5c4430';
  g.fillRect(0, 0, 16, 2);
  g.fillStyle = '#6f5540';
  g.fillRect(0, 0, 16, 1);
  g.fillStyle = '#14121f';
  g.fillRect(0, 5, 16, 1);
  g.fillRect(3, 1, 1, 4); g.fillRect(11, 2, 1, 3);
  return c;
}

function makeSpikeTile() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  for (let i = 0; i < 4; i++) {
    const bx = i * 4;
    g.fillStyle = '#8d94b3';
    g.beginPath();
    g.moveTo(bx, 16); g.lineTo(bx + 2, 6); g.lineTo(bx + 4, 16);
    g.closePath(); g.fill();
    g.fillStyle = '#dfe2ee';
    g.fillRect(bx + 1, 8, 1, 6);
  }
  g.fillStyle = '#14121f';
  g.fillRect(0, 15, 16, 1);
  return c;
}

function makeChainTile() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#4a4f6e';
  g.fillRect(7, 0, 2, 3); g.fillRect(7, 5, 2, 3); g.fillRect(7, 10, 2, 3);
  g.fillStyle = '#61678c';
  g.fillRect(6, 3, 1, 2); g.fillRect(9, 3, 1, 2);
  g.fillRect(6, 8, 1, 2); g.fillRect(9, 8, 1, 2);
  g.fillRect(6, 13, 1, 2); g.fillRect(9, 13, 1, 2);
  return c;
}

// ── parallax background layers ──────────────────────────────────────
function makeMoon() {
  const c = document.createElement('canvas');
  c.width = 44; c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = '#e8e6da';
  g.beginPath(); g.arc(22, 22, 20, 0, 7); g.fill();
  g.fillStyle = '#d3d1c2';
  g.beginPath(); g.arc(15, 14, 5, 0, 7); g.fill();
  g.beginPath(); g.arc(28, 26, 7, 0, 7); g.fill();
  g.beginPath(); g.arc(14, 30, 3, 0, 7); g.fill();
  g.fillStyle = '#c2c0b0';
  g.beginPath(); g.arc(29, 27, 4, 0, 7); g.fill();
  return c;
}

// tileable silhouette skyline. darker + taller for the near layer.
function makeSkyline(seed, baseY, color, spired) {
  const W = 480, H = 270;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  g.fillStyle = color;
  let x = 0;
  while (x < W) {
    const w = 20 + Math.floor(rnd() * 36);
    const h = 30 + Math.floor(rnd() * (spired ? 110 : 70));
    const top = baseY - h;
    g.fillRect(x, top, Math.min(w, W - x), H - top);
    // spires and crenellation
    if (spired && rnd() < 0.6) {
      const sw = 6, sx = x + Math.floor(rnd() * Math.max(1, w - sw));
      g.beginPath();
      g.moveTo(sx, top); g.lineTo(sx + sw / 2, top - 18 - rnd() * 22); g.lineTo(sx + sw, top);
      g.closePath(); g.fill();
    } else if (rnd() < 0.7) {
      for (let cx = x; cx < x + w - 2 && cx < W; cx += 4) g.fillRect(cx, top - 3, 2, 3);
    }
    x += w + Math.floor(rnd() * 8);
  }
  // window lights
  const rnd2 = mulberry32(seed + 99);
  for (let i = 0; i < (spired ? 46 : 26); i++) {
    const wx = Math.floor(rnd2() * W), wy = baseY - Math.floor(rnd2() * 60);
    const px = g.getImageData(wx, wy, 1, 1).data;
    if (px[3] > 0) {
      g.fillStyle = rnd2() < 0.75 ? 'rgba(255,190,90,0.75)' : 'rgba(150,220,255,0.6)';
      g.fillRect(wx, wy, 1, 2);
      g.fillStyle = color;
    }
  }
  return c;
}

function makeMistStrip(seed, alpha) {
  const c = document.createElement('canvas');
  c.width = 480; c.height = 60;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 480, y = 12 + rnd() * 36, r = 14 + rnd() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(120,130,180,' + alpha + ')');
    gr.addColorStop(1, 'rgba(120,130,180,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    // wrap for seamless scroll
    g.beginPath(); g.arc(x - 480, y, r, 0, 7); g.fill();
    g.beginPath(); g.arc(x + 480, y, r, 0, 7); g.fill();
  }
  return c;
}

// ── assembled sprite store ──────────────────────────────────────────
const SPR = {};

function initSprites() {
  const P = ART.player;
  SPR.player = {}; SPR.playerL = {}; SPR.playerSil = {}; SPR.playerSilL = {};
  for (const k of Object.keys(P)) {
    SPR.player[k] = P[k].map((rows, i) => bakeRows(rows, 'player.' + k + i));
    SPR.playerL[k] = SPR.player[k].map(flipCanvas);
    SPR.playerSil[k] = SPR.player[k].map(cv => silhouette(cv, '#c22e46'));
    SPR.playerSilL[k] = SPR.playerSil[k].map(flipCanvas);
  }
  SPR.wretch = ART.wretch.walk.map((r, i) => bakeRows(r, 'wretch' + i));
  SPR.wretchL = SPR.wretch.map(flipCanvas);
  SPR.wretchLunge = ART.wretch.lunge.map((r, i) => bakeRows(r, 'wretchLunge' + i));
  SPR.wretchLungeL = SPR.wretchLunge.map(flipCanvas);
  SPR.bat = ART.bat.fly.map((r, i) => bakeRows(r, 'bat' + i));
  SPR.gargPerch = ART.garg.perch.map((r, i) => bakeRows(r, 'gargP' + i));
  SPR.gargPerchL = SPR.gargPerch.map(flipCanvas);
  SPR.gargFly = ART.garg.fly.map((r, i) => bakeRows(r, 'gargF' + i));
  SPR.candleBase = bakeRows(ART.candle.base[0], 'candleBase');
  SPR.flame = ART.candle.flame.map((r, i) => bakeRows(r, 'flame' + i));
  SPR.heart = bakeRows(ART.heart[0], 'heart');
  SPR.spark = ART.spark.map((r, i) => bakeRows(r, 'spark' + i));
  SPR.lanternOff = bakeRows(ART.lantern.off[0], 'lanternOff');
  SPR.lanternOn = bakeRows(ART.lantern.on[0], 'lanternOn');
  SPR.signUp = bakeRows(ART.sign.up[0], 'signUp');
  SPR.signDown = bakeRows(ART.sign.down[0], 'signDown');
  SPR.bell = bakeRows(ART.bell[0], 'bell');

  SPR.stone = [makeStoneTile(1), makeStoneTile(2), makeStoneTile(3)];
  SPR.bgBrick = [makeBgBrickTile(1), makeBgBrickTile(2)];
  SPR.platform = makePlatformTile();
  SPR.spike = makeSpikeTile();
  SPR.chain = makeChainTile();

  SPR.moon = makeMoon();
  SPR.skyFar = makeSkyline(11, 240, '#181a30', false);
  SPR.skyMid = makeSkyline(23, 258, '#10111f', true);
  SPR.mistA = makeMistStrip(5, 0.16);
  SPR.mistB = makeMistStrip(9, 0.11);
}
