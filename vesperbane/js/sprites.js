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

// The Eclipse hunter uses the same authored grids and frame counts as the
// original 16x24 player.  A separate palette lets the hero read as pale ivory
// against violet stone without recolouring enemies which share these indices.
// Cyan is both a value edge and a directional rim, so the cue survives common
// red/green colour-vision deficiencies.
const HUNTER_PAL = Object.freeze(Object.assign({}, PAL, {
  'K': '#0b0b14', // near-black silhouette
  'R': '#74edf4', // scarf / forward motion cue
  'r': '#247f98',
  'D': '#29273b', // violet plate shadow
  'd': '#c8c1ad', // ivory coat body
  'L': '#eee7d2',
  'S': '#fff9df', // blade / highest ivory
  's': '#78dce8',
  'F': '#eed4ae',
  'f': '#b9916f',
  'H': '#fff7dc',
  'h': '#bfb79f',
}));

// ── raw art ──────────────────────────────────────────────────────────
const ART = {};

// The Vesper. 16x24 logical art: ivory hunter, cyan scarf and moonlit rim.
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
'...c...',
'..cCc..',
'.cCHCc.',
'cCHHHCc',
'.cHSCc.',
'..cCc..',
'...c...',
],[
'...C...',
'..CHC..',
'.CHSHC.',
'CHHSHHC',
'.CHHHC.',
'..CHC..',
'...C...',
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

// Legacy 28x34 Shade study retained as an authored-grid reference. The
// shipping 62x62 bell-armoured boss is assembled by makeShade() below.
ART.shade = {
float: [[
'............KKKK............',
'..........KKDDDDKK..........',
'.........KDDddddDDK.........',
'........KDdddddddDK.........',
'........KDdKKKKKKdDK........',
'.......KDdK......KdDK.......',
'.......KDdK.R..R.KdDK.......',
'.......KDdK......KdDK.......',
'........KdK.KKKK.KdK........',
'......KKDddKKKKKKddDKK......',
'.....KDDdddddddddddDDK......',
'....KDdddddddddddddddDK.....',
'...KDddDdddddddddddDddDK....',
'...KDdK.DdddddddddD.KdDK....',
'...KDdK.DdddddddddD.KdDK....',
'...KdK..DdddddddddD..KdK....',
'..KdK..KDdddddddddDK..KdK...',
'..KdK.KWWK.ddddd.KWWK.KdK...',
'..K...KWwWKdddddKWwWK...K...',
'......KWwWK.ddd.KWwWK.......',
'......KWWWK.ddd.KWWWK.......',
'.......KKK..ddd..KKK........',
'............ddd.............',
'...........Kdddd............',
'..........KdKdddK...........',
'..........Kd.KddK...........',
'.........KdK..KdK...........',
'.........Kd....Kd...........',
'........KdK....KdK..........',
'........CK......KC..........',
'.......C..........C.........',
'......C.....C......C........',
'............C...............',
'............................',
],[
'............................',
'............KKKK............',
'..........KKDDDDKK..........',
'.........KDDddddDDK.........',
'........KDdddddddDK.........',
'........KDdKKKKKKdDK........',
'.......KDdK.R..R.KdDK.......',
'.......KDdK......KdDK.......',
'........KdKKKKKKKKdK........',
'......KKDddddddddddDKK......',
'....KKDdddddddddddddDKK.....',
'..KKDdddddddddddddddddKK....',
'.KDddDdddddddddddddddDdK....',
'.KDdK.DdddddddddddddD.KdK...',
'.KdK..DdddddddddddddD..KK...',
'.KK..KDdddddddddddddDK......',
'.....KWWK.ddddddd.KWWK......',
'.....KWwWKdddddddKWwWK......',
'.....KWwWK.ddddd.KWwWK......',
'.....KWWWK.ddddd.KWWWK......',
'......KKK..ddddd..KKK.......',
'...........ddddd............',
'..........Kddddd.C..........',
'.........KdKdddK.C..........',
'.........Kd.KddKC...........',
'........KdK..KdK.C..........',
'........Kd....KdC...........',
'.......KdK....C.............',
'.......CK....C..............',
'......C...C.................',
'............................',
'............................',
'............................',
'............................',
'............................',
]],
};

// bone pile decor — 14x6
ART.bones = [[
'..............',
'....KK...KHHK.',
'.KHHhHK.KHhhK.',
'KhHKKhHK.KKK..',
'.KK..KK.KHhK..',
'.........KK...',
]];

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
function bakeRows(rows, name, palette) {
  palette = palette || PAL;
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
      const col = palette[rows[y][x]];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  }
  return c;
}

function bakeHunterRows(rows, name) {
  const base = bakeRows(rows, name + '.base', HUNTER_PAL);
  const c = document.createElement('canvas');
  c.width = base.width; c.height = base.height;
  const g = c.getContext('2d', { willReadFrequently: true });

  // A one-pixel cardinal expansion makes the hunter feel broader and more
  // armoured while preserving the exact canvas and logical hitbox contract.
  const edge = silhouette(base, HUNTER_PAL.K);
  g.drawImage(edge, -1, 0); g.drawImage(edge, 1, 0);
  g.drawImage(edge, 0, -1); g.drawImage(edge, 0, 1);
  g.drawImage(base, 0, 0);

  // Pick out the authored forward/right contour in cyan.  The left-facing
  // bake is flipped later, so this becomes a reliable facing cue in motion.
  const pixels = g.getImageData(0, 0, c.width, c.height);
  const d = pixels.data;
  for (let y = 3; y < c.height - 2; y++) {
    for (let x = Math.floor(c.width * 0.44); x < c.width - 1; x++) {
      const i = (y * c.width + x) * 4;
      const right = i + 4;
      if (d[i + 3] && !d[right + 3] && (x + y) % 3 !== 1) {
        const bright = (x + y) % 4 === 0;
        d[i] = bright ? 116 : 36;
        d[i + 1] = bright ? 237 : 127;
        d[i + 2] = bright ? 244 : 152;
        d[i + 3] = 255;
      }
    }
  }
  g.putImageData(pixels, 0, 0);
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

function paintRects(g, color, rects) {
  g.fillStyle = color;
  for (const r of rects) g.fillRect(r[0], r[1], r[2], r[3]);
}

function pixelLine(g, x0, y0, x1, y1, color) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  g.fillStyle = color;
  while (true) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ── procedural tiles ────────────────────────────────────────────────
function makeStoneTile(seed) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true });
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
// Zone materials share collision-readable light caps, then vary their middle
// values and tiny motifs. Background courses deliberately stay lower contrast
// so a player never has to infer solidity from colour alone.
const ZONE_MATERIAL = Object.freeze({
  exterior: Object.freeze({
    base: '#343850', dark: '#202339', light: '#7f88a7', chip: '#4d5575',
    bg: '#171a2a', bgLine: '#0f111d', accent: '#b8c5d7', glow: '#659fb4',
  }),
  nave: Object.freeze({
    base: '#352d4d', dark: '#1d182e', light: '#8a759a', chip: '#534369',
    bg: '#171322', bgLine: '#0d0a15', accent: '#d1a854', glow: '#7a5d34',
  }),
  ossuary: Object.freeze({
    base: '#393545', dark: '#211d2a', light: '#aca38f', chip: '#575063',
    bg: '#18151f', bgLine: '#0c0a11', accent: '#e8e0c9', glow: '#3fa8bd',
  }),
});

function makeZoneStoneTile(zone, seed, background) {
  const p = ZONE_MATERIAL[zone] || ZONE_MATERIAL.exterior;
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed * 31 + zone.length * 17 + (background ? 101 : 0));
  g.fillStyle = background ? p.bg : p.base;
  g.fillRect(0, 0, 16, 16);
  g.fillStyle = background ? p.bgLine : p.dark;
  g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1);
  g.fillRect(seed % 2 ? 4 : 11, 0, 1, 7);
  g.fillRect(seed % 2 ? 12 : 3, 8, 1, 7);
  if (!background) {
    // The continuous bright cap is the shape cue for solid masonry.
    g.fillStyle = p.light; g.fillRect(0, 0, 16, 1);
    g.fillStyle = p.chip; g.fillRect(0, 1, 1, 6); g.fillRect(0, 8, 1, 7);
  }
  for (let i = 0; i < (background ? 4 : 8); i++) {
    g.fillStyle = rnd() < 0.7 ? p.chip : p.dark;
    g.fillRect(Math.floor(rnd() * 16), 2 + Math.floor(rnd() * 13), 1, 1);
  }
  if (!background) {
    if (zone === 'exterior') {
      g.fillStyle = p.accent; g.fillRect(seed % 2 ? 13 : 6, 2, 1, 2);
      g.fillStyle = p.glow; g.fillRect(seed % 2 ? 12 : 5, 4, 1, 1);
    } else if (zone === 'nave') {
      g.fillStyle = p.accent; g.fillRect(7, 3, 2, 1); g.fillRect(8, 2, 1, 3);
      g.fillStyle = p.glow; g.fillRect(6, 5, 1, 1); g.fillRect(10, 5, 1, 1);
    } else {
      g.fillStyle = p.accent; g.fillRect(2, 11, 4, 1); g.fillRect(11, 4, 3, 1);
      pixelLine(g, 9, 8, 12, 12, p.glow);
    }
  }
  return c;
}

function makeZonePlatformTile(zone) {
  const p = ZONE_MATERIAL[zone] || ZONE_MATERIAL.exterior;
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = p.base; g.fillRect(0, 0, 16, 6);
  g.fillStyle = p.light; g.fillRect(0, 0, 16, 1);
  g.fillStyle = p.accent; g.fillRect(0, 1, 16, 1);
  g.fillStyle = p.dark; g.fillRect(0, 5, 16, 1);
  g.fillRect(3, 2, 1, 3); g.fillRect(12, 2, 1, 3);
  g.fillStyle = p.chip; g.fillRect(4, 3, 3, 1); g.fillRect(9, 4, 2, 1);
  return c;
}

function makeBreakableTile() {
  const c = makeZoneStoneTile('ossuary', 17, false);
  const g = c.getContext('2d');
  // Broad branching fracture: ivory shadow plus a cyan core stays legible at
  // speed and never depends on red/green discrimination.
  pixelLine(g, 8, 0, 7, 5, '#e8e0c9');
  pixelLine(g, 7, 5, 10, 8, '#e8e0c9');
  pixelLine(g, 7, 5, 4, 9, '#e8e0c9');
  pixelLine(g, 10, 8, 9, 15, '#e8e0c9');
  pixelLine(g, 10, 8, 14, 11, '#e8e0c9');
  pixelLine(g, 6, 1, 6, 5, '#3fa8bd');
  pixelLine(g, 6, 5, 9, 8, '#7fe9f5');
  pixelLine(g, 6, 5, 3, 8, '#3fa8bd');
  pixelLine(g, 9, 8, 8, 14, '#7fe9f5');
  pixelLine(g, 9, 8, 13, 10, '#3fa8bd');
  return c;
}

function makeGhostPlatform(active) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 8;
  const g = c.getContext('2d');
  if (active) {
    paintRects(g, '#e9fbf8', [[1, 0, 14, 1], [3, 1, 4, 1], [10, 1, 3, 1]]);
    paintRects(g, '#7fe9f5', [[0, 1, 16, 2], [2, 3, 12, 1], [4, 4, 3, 1], [10, 4, 2, 1]]);
    paintRects(g, '#3fa8bd', [[1, 4, 3, 1], [7, 4, 3, 2], [13, 4, 2, 1], [5, 6, 1, 1], [11, 6, 1, 1]]);
  } else {
    paintRects(g, 'rgba(111,97,142,0.72)', [[1, 1, 14, 1], [0, 2, 16, 1], [3, 3, 4, 1], [9, 3, 4, 1]]);
    paintRects(g, 'rgba(63,168,189,0.48)', [[2, 0, 3, 1], [11, 0, 2, 1], [5, 4, 1, 1], [12, 4, 1, 1]]);
  }
  return c;
}

function makeZoneProp(zone, kind) {
  const p = ZONE_MATERIAL[zone] || ZONE_MATERIAL.exterior;
  const c = document.createElement('canvas'); c.width = 16; c.height = 32;
  const g = c.getContext('2d');
  if (zone === 'exterior' && kind === 'buttress') {
    paintRects(g, p.dark, [[7, 0, 2, 5], [5, 5, 6, 8], [3, 13, 10, 12], [1, 25, 14, 7]]);
    paintRects(g, p.base, [[7, 4, 2, 9], [5, 12, 4, 13], [3, 24, 6, 7]]);
    paintRects(g, p.light, [[7, 4, 1, 20], [5, 24, 1, 6]]);
    paintRects(g, p.accent, [[8, 8, 1, 3], [6, 18, 1, 2]]);
  } else if (zone === 'exterior') {
    paintRects(g, p.dark, [[5, 1, 6, 2], [3, 3, 10, 26], [1, 29, 14, 3]]);
    paintRects(g, p.base, [[4, 4, 8, 24]]);
    paintRects(g, '#111521', [[6, 5, 4, 20]]);
    paintRects(g, p.glow, [[7, 7, 2, 16], [6, 13, 4, 1]]);
    paintRects(g, p.light, [[4, 5, 1, 22], [11, 5, 1, 22]]);
  } else if (zone === 'nave' && kind === 'organPipes') {
    paintRects(g, p.dark, [[0, 28, 16, 4], [1, 7, 3, 21], [5, 2, 3, 26], [9, 5, 3, 23], [13, 10, 3, 18]]);
    paintRects(g, p.accent, [[2, 8, 1, 18], [6, 3, 1, 23], [10, 6, 1, 20], [14, 11, 1, 15]]);
    paintRects(g, p.light, [[1, 7, 3, 1], [5, 2, 3, 1], [9, 5, 3, 1], [13, 10, 3, 1]]);
  } else if (zone === 'nave') {
    paintRects(g, p.dark, [[5, 1, 6, 2], [3, 3, 10, 27], [1, 30, 14, 2]]);
    paintRects(g, '#0d0a15', [[5, 6, 6, 20]]);
    paintRects(g, p.light, [[4, 5, 1, 23], [11, 5, 1, 23], [5, 4, 6, 1]]);
    paintRects(g, '#a9a1a8', [[7, 9, 2, 4], [6, 13, 4, 8], [7, 21, 2, 4]]);
    paintRects(g, p.accent, [[7, 15, 1, 4], [9, 15, 1, 4]]);
  } else if (kind === 'reliquary') {
    paintRects(g, p.dark, [[1, 2, 14, 30]]);
    paintRects(g, p.base, [[2, 3, 12, 28]]);
    paintRects(g, '#17131e', [[3, 5, 10, 22]]);
    for (const y of [7, 15, 23]) {
      paintRects(g, p.accent, [[4, y, 3, 3], [9, y, 3, 3], [5, y + 3, 1, 1], [10, y + 3, 1, 1]]);
      paintRects(g, p.dark, [[5, y + 1, 1, 1], [10, y + 1, 1, 1]]);
    }
    paintRects(g, p.glow, [[2, 12, 1, 6], [13, 20, 1, 5]]);
  } else {
    paintRects(g, p.dark, [[5, 0, 6, 32], [2, 6, 12, 4], [1, 22, 14, 4]]);
    paintRects(g, p.accent, [[7, 1, 2, 30], [3, 7, 10, 1], [2, 23, 12, 1]]);
    paintRects(g, p.base, [[5, 9, 2, 4], [9, 15, 2, 5], [4, 26, 3, 3]]);
    paintRects(g, p.glow, [[9, 5, 1, 3], [6, 18, 1, 4], [10, 27, 1, 3]]);
  }
  return c;
}

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
  // Skyline generation samples pixels repeatedly before placing windows.
  // Tell Chromium this canvas is intentionally read-heavy so it keeps the
  // backing store optimized for getImageData instead of warning every load.
  const g = c.getContext('2d', { willReadFrequently: true });
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

// The Pale Hound (Night II hunter) — a low spectral chaser, authored
// facing LEFT. 24x14, two run frames. Dark keeper-purple with a cyan
// spine-crack and a red eye; wisps off the tail.
function makeHound(frame) {
  const D = '#23263d', d = '#3a3f61', L = '#565d85', C = '#7fe9f5', c2 = '#3fa8bd', R = '#c22e46', K = '#14121f';
  // Build the solid body on an offscreen canvas, then wrap it in a 1px
  // outline "halo" so the silhouette reads crisply. Facing LEFT: raised
  // haunch (right) slopes down an arched back to a lowered head (left).
  const body = document.createElement('canvas'); body.width = 26; body.height = 16;
  const bg = body.getContext('2d');
  bg.fillStyle = d;
  bg.fillRect(16, 4, 8, 7);        // haunch (tall, rear)
  bg.fillRect(10, 5, 8, 5);        // arched back
  bg.fillRect(6, 6, 6, 5);         // shoulder
  bg.fillRect(2, 8, 6, 4);         // lowered head
  bg.fillRect(0, 9, 3, 3);         // snout
  bg.fillRect(6, 4, 2, 3);         // ear laid back
  // galloping legs (front reaches left, rear pushes right; swap per frame)
  const legs = frame === 0
    ? [[4, 11, 2, 4], [8, 11, 2, 3], [16, 11, 2, 4], [20, 11, 2, 3]]
    : [[4, 11, 2, 3], [8, 11, 2, 4], [16, 11, 2, 3], [20, 11, 2, 4]];
  for (const [lx, ly, lw, lh] of legs) bg.fillRect(lx, ly, lw, lh);
  // dark under-shadow (belly + far side)
  bg.fillStyle = D;
  bg.fillRect(6, 10, 16, 2); bg.fillRect(2, 11, 6, 1); bg.fillRect(16, 9, 8, 2); bg.fillRect(0, 12, 3, 1);
  for (const [lx, ly, lw, lh] of legs) bg.fillRect(lx, ly + lh - 1, lw, 1);
  // cold rim light along the very top of back + haunch
  bg.fillStyle = L;
  bg.fillRect(10, 5, 7, 1); bg.fillRect(16, 4, 7, 1);

  const c = document.createElement('canvas'); c.width = 26; c.height = 16;
  const g = c.getContext('2d');
  const halo = silhouette(body, K);
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]])
    g.drawImage(halo, ox, oy);
  g.drawImage(body, 0, 0);
  // details on top: red eye, dark maw, cyan spine-cracks + belly seam, wisp tail
  g.fillStyle = R; g.fillRect(3, 9, 2, 1);
  g.fillStyle = K; g.fillRect(0, 11, 3, 1);
  g.fillStyle = C;
  for (const x of [11, 14, 17, 20]) g.fillRect(x, x < 16 ? 6 : 5, 1, 1);
  g.fillStyle = c2; g.fillRect(7, 10, 13, 1);
  g.fillStyle = C; g.fillRect(22, 3, 1, 1); g.fillRect(23, 2, 1, 1); g.fillRect(24, 1, 1, 1);
  g.fillStyle = c2; g.fillRect(21, 4, 2, 1); g.fillRect(23, 3, 2, 1);
  return c;
}

// The Tollbearer (Night II boss) — a hulking hooded keeper with your
// cracked bell embedded, glowing, in its chest. 34x34.
function makeTollbearer() {
  const c = document.createElement('canvas'); c.width = 34; c.height = 34;
  const g = c.getContext('2d');
  const K = '#14121f', D = '#1b1d30', d = '#2b2f4d', L = '#3a3f61', W = '#d1a854', w = '#8e6f30',
        C = '#7fe9f5', c2 = '#3fa8bd', Y = '#ffe27a', R = '#c22e46';
  // hood + robe silhouette
  g.fillStyle = K;
  g.fillRect(9, 1, 16, 33);            // torso column
  g.fillRect(5, 12, 24, 20);           // shoulders/robe flare
  g.fillRect(11, 0, 12, 4);            // hood peak
  // robe fills
  g.fillStyle = d;
  g.fillRect(10, 2, 14, 30);
  g.fillRect(6, 13, 22, 18);
  g.fillStyle = D;
  g.fillRect(10, 2, 5, 30);            // left shade
  g.fillRect(19, 4, 5, 28);            // right shade
  // hood opening (dark) with two cold eyes
  g.fillStyle = K; g.fillRect(13, 4, 8, 6);
  g.fillStyle = C; g.fillRect(14, 6, 2, 2); g.fillRect(18, 6, 2, 2);
  // heavy arms
  g.fillStyle = L;
  g.fillRect(5, 15, 4, 10); g.fillRect(25, 15, 4, 10);
  g.fillStyle = D; g.fillRect(5, 22, 4, 3); g.fillRect(25, 22, 4, 3);
  // the captured bell in the chest — brass rim, cyan core, a crack
  g.fillStyle = w; g.fillRect(12, 14, 10, 12);
  g.fillStyle = W; g.fillRect(12, 14, 10, 2); g.fillRect(11, 25, 12, 2);
  g.fillStyle = c2; g.fillRect(13, 16, 8, 9);
  g.fillStyle = C; g.fillRect(14, 17, 6, 6);
  g.fillStyle = Y; g.fillRect(16, 18, 2, 4);       // clapper glow
  g.fillStyle = K; g.fillRect(17, 15, 1, 11);      // the crack
  g.fillStyle = R; g.fillRect(15, 20, 1, 1); g.fillRect(19, 19, 1, 1);
  // hem
  g.fillStyle = K; g.fillRect(6, 31, 22, 1);
  g.fillStyle = L; g.fillRect(8, 30, 3, 1); g.fillRect(15, 30, 4, 1); g.fillRect(23, 30, 3, 1);
  return c;
}

// high drifting night clouds for the rooftops / spire
// The Eclipse Ossuary Shade deliberately overdraws its compact gameplay
// hitbox. It is authored facing left; the existing SPR.shadeL mirror remains
// the right-facing variant. Frame 1 leans and trails for the dive/slam state.
function makeShade(frame) {
  const c = document.createElement('canvas'); c.width = 62; c.height = 62;
  const g = c.getContext('2d');
  const K = '#090812', V0 = '#171326', V1 = '#29203f', V2 = '#49365f';
  const I0 = '#9e9789', I1 = '#e8e0c9';
  const W0 = '#775726', W1 = '#d1a854', Y = '#ffe27a';
  const C0 = '#247f98', C1 = '#7fe9f5', CW = '#e9fbf8';
  const ox = frame ? 2 : 1, oy = frame ? 2 : 1;
  const layer = (color, rects) => paintRects(g, color,
    rects.map(r => [r[0] + ox, r[1] + oy, r[2], r[3]]));

  // Spectral drag lives behind the silhouette and makes frame 1 directional.
  if (frame) {
    paintRects(g, C0, [[0, 8, 4, 2], [3, 11, 6, 2], [0, 17, 7, 2], [4, 43, 5, 2], [1, 47, 6, 2]]);
    paintRects(g, C1, [[1, 9, 2, 1], [5, 12, 3, 1], [1, 18, 4, 1], [3, 46, 3, 1]]);
  }

  // Broad bell/armour silhouette, hood crown, gauntlets and torn hem.
  layer(K, [[23, 0, 14, 2], [18, 2, 24, 3], [15, 5, 30, 6], [13, 10, 34, 8],
    [8, 15, 44, 9], [4, 21, 52, 11], [0, 25, 11, 14], [49, 23, 11, 16],
    [8, 30, 44, 18], [6, 42, 48, 10], [2, 48, 17, 4], [21, 48, 14, 5],
    [38, 48, 20, 4], [6, 52, 9, 4], [19, 52, 11, 7], [34, 52, 9, 6], [47, 52, 8, 4]]);

  // Hood and layered violet cuirass.
  layer(V1, [[20, 3, 20, 4], [17, 6, 26, 8], [15, 11, 30, 7],
    [10, 17, 40, 8], [9, 25, 42, 18], [10, 39, 40, 9]]);
  layer(V0, [[17, 10, 10, 9], [38, 10, 7, 9], [10, 28, 10, 17], [40, 27, 11, 19],
    [15, 42, 9, 8], [33, 42, 12, 8]]);
  layer(V2, [[20, 4, 18, 2], [15, 14, 8, 3], [37, 14, 8, 3],
    [12, 18, 13, 2], [36, 18, 13, 2], [12, 31, 7, 8], [43, 30, 6, 9]]);

  // Bell-shaped pauldrons make the boss readable before its central bell is
  // even visible. Their bright horizontal lips carry the silhouette.
  layer(W0, [[3, 24, 12, 10], [47, 22, 11, 11]]);
  layer(W1, [[5, 23, 8, 2], [2, 33, 14, 3], [49, 21, 7, 2], [46, 32, 13, 3],
    [5, 27, 2, 5], [53, 25, 2, 6]]);
  layer(I1, [[3, 34, 13, 1], [47, 33, 11, 1]]);
  layer(C0, [[1, 29, 2, 7], [57, 27, 2, 7]]);
  layer(C1, [[0, 31, 1, 5], [58, 29, 1, 4]]);

  // Ivory funerary plates and cold edge-light separate armour from robe.
  layer(I0, [[10, 20, 8, 2], [42, 19, 8, 2], [12, 36, 5, 6], [45, 35, 4, 7]]);
  layer(I1, [[11, 20, 5, 1], [43, 19, 5, 1], [13, 36, 2, 5], [46, 35, 2, 5]]);
  layer(C0, [[13, 8, 1, 9], [8, 18, 1, 7], [7, 38, 1, 9], [5, 47, 1, 4]]);
  layer(C1, [[14, 8, 1, 6], [9, 18, 1, 5], [8, 38, 1, 6], [6, 47, 1, 3]]);

  // Void visor, split ivory brow and cyan eyes: huge shape, tiny intent.
  layer(K, [[21, 7, 18, 9], [23, 15, 14, 3]]);
  layer(I0, [[20, 6, 9, 1], [32, 6, 8, 1], [20, 7, 2, 5], [38, 7, 2, 5]]);
  layer(C1, [[22, 11, 5, 2], [32, 11, 5, 2]]);
  layer(CW, [[22, 11, 2, 1], [32, 11, 2, 1]]);

  // The cracked ward-bell is the boss's breastplate, not a handheld prop.
  layer(K, [[26, 19, 8, 2], [22, 21, 16, 3], [20, 24, 20, 15],
    [18, 38, 24, 4], [22, 42, 16, 3], [27, 45, 6, 5]]);
  layer(W0, [[26, 20, 8, 2], [23, 22, 14, 3], [21, 25, 18, 13], [20, 38, 20, 2]]);
  layer(W1, [[26, 20, 8, 1], [23, 23, 14, 2], [21, 37, 18, 2], [19, 39, 22, 2],
    [23, 42, 14, 2], [28, 45, 4, 3]]);
  layer(V0, [[24, 26, 12, 10], [27, 24, 6, 2]]);
  layer(C0, [[25, 27, 10, 8]]);
  layer(C1, [[27, 28, 6, 6]]);
  layer(CW, [[29, 29, 2, 4]]);
  pixelLine(g, 31 + ox, 24 + oy, 29 + ox, 31 + oy, K);
  pixelLine(g, 29 + ox, 31 + oy, 32 + ox, 35 + oy, K);
  pixelLine(g, 32 + ox, 35 + oy, 30 + ox, 40 + oy, K);
  layer(Y, [[29, 43, 2, 3]]);

  // Sparse chain pixels and asymmetric fist reinforce authored facing left.
  pixelLine(g, 13 + ox, 35 + oy, 20 + ox, 40 + oy, W0);
  pixelLine(g, 46 + ox, 34 + oy, 40 + ox, 40 + oy, W0);
  layer(I1, [[1, 36, 7, 3], [3, 39, 5, 2], [52, 36, 6, 3]]);
  layer(K, [[1, 37, 2, 2], [5, 39, 3, 2], [55, 37, 3, 2]]);

  // Tattered robe and cyan spirit-fire keep the lower mass supernatural.
  layer(V1, [[8, 47, 10, 4], [22, 47, 12, 5], [39, 47, 14, 4],
    [8, 51, 6, 4], [20, 51, 9, 7], [35, 51, 7, 6], [48, 51, 6, 4]]);
  layer(C0, [[7, 52, 2, 3], [14, 50, 2, 3], [20, 57, 3, 2], [28, 54, 2, 4],
    [35, 56, 3, 2], [42, 52, 2, 4], [53, 51, 2, 3]]);
  layer(C1, [[6, 55, 2, 2], [19, 58, 2, 1], [34, 58, 2, 1], [42, 56, 1, 2], [54, 54, 1, 2]]);
  return c;
}

function makeChicken() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 12;
  const g = c.getContext('2d');
  // Roast body, white bone handle and a tiny cyan freshness glint.
  paintRects(g, '#0b0b14', [[3, 2, 6, 1], [1, 3, 10, 2], [0, 5, 12, 4],
    [1, 9, 10, 1], [3, 10, 6, 1], [10, 4, 4, 4], [13, 3, 3, 2], [13, 7, 3, 2]]);
  paintRects(g, '#8e6f30', [[3, 3, 6, 1], [2, 4, 8, 5], [3, 9, 6, 1]]);
  paintRects(g, '#d1a854', [[3, 4, 6, 4], [2, 5, 2, 3], [4, 8, 5, 1]]);
  paintRects(g, '#ffe27a', [[4, 4, 4, 1], [3, 5, 2, 2]]);
  paintRects(g, '#dfe2ee', [[10, 5, 4, 2], [13, 4, 2, 1], [13, 7, 2, 1]]);
  paintRects(g, '#7fe9f5', [[2, 4, 1, 1], [1, 5, 1, 1]]);
  paintRects(g, '#14121f', [[1, 11, 14, 1]]);
  paintRects(g, '#8d94b3', [[3, 10, 10, 1]]);
  return c;
}

function makeWardBell(active) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 20;
  const g = c.getContext('2d');
  const K = '#0b0b14', dim = '#73582a', gold = '#d1a854', hi = '#ffe27a';
  const cyan = '#7fe9f5', cyanDark = '#247f98', ivory = '#e9fbf8';
  if (active) paintRects(g, cyanDark, [[1, 5, 1, 4], [14, 5, 1, 4], [2, 2, 2, 1], [12, 2, 2, 1], [1, 14, 2, 1], [13, 14, 2, 1]]);
  paintRects(g, K, [[6, 0, 4, 1], [5, 1, 6, 3], [4, 4, 8, 2], [3, 6, 10, 3],
    [2, 9, 12, 6], [1, 14, 14, 3], [4, 17, 8, 1], [6, 18, 4, 2]]);
  paintRects(g, dim, [[6, 2, 4, 2], [5, 5, 6, 2], [4, 7, 8, 7], [3, 10, 10, 5]]);
  paintRects(g, gold, [[6, 1, 4, 1], [5, 5, 6, 1], [3, 14, 10, 2], [2, 15, 12, 1], [6, 18, 4, 1]]);
  paintRects(g, active ? cyanDark : '#2a2637', [[6, 7, 4, 7], [5, 10, 6, 4]]);
  if (active) {
    paintRects(g, cyan, [[7, 7, 2, 6], [6, 9, 4, 3]]);
    paintRects(g, ivory, [[7, 8, 1, 3], [4, 14, 8, 1]]);
    paintRects(g, hi, [[7, 17, 2, 2]]);
    pixelLine(g, 9, 6, 7, 11, K); pixelLine(g, 7, 11, 9, 14, K);
  } else {
    paintRects(g, '#4b4058', [[7, 8, 2, 4], [5, 14, 6, 1]]);
  }
  return c;
}

function makeCloudStrip(seed) {
  const c = document.createElement('canvas');
  c.width = 480; c.height = 70;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 480, y = 14 + rnd() * 40;
    // each cloud is a row of overlapping soft discs
    const n = 3 + Math.floor(rnd() * 4);
    for (let j = 0; j < n; j++) {
      const cx = x + j * 14 - n * 7, cy = y + (rnd() - 0.5) * 6, r = 10 + rnd() * 14;
      for (const off of [-480, 0, 480]) {
        const gr = g.createRadialGradient(cx + off, cy, 0, cx + off, cy, r);
        gr.addColorStop(0, 'rgba(90,100,150,0.10)');
        gr.addColorStop(1, 'rgba(90,100,150,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(cx + off, cy, r, 0, 7); g.fill();
      }
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
    SPR.player[k] = P[k].map((rows, i) => bakeHunterRows(rows, 'player.' + k + i));
    SPR.playerL[k] = SPR.player[k].map(flipCanvas);
    SPR.playerSil[k] = SPR.player[k].map(cv => silhouette(cv, '#7fe9f5'));
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
  SPR.shade = [makeShade(0), makeShade(1)];
  SPR.shadeL = SPR.shade.map(flipCanvas);
  SPR.shadeOffset = Object.freeze({ x: -20, y: -32 });
  SPR.shadeCore = Object.freeze({ x: 31, y: 31 });
  SPR.hound = [makeHound(0), makeHound(1)];         // authored facing left
  SPR.houndR = SPR.hound.map(flipCanvas);
  SPR.houndSil = SPR.hound.map(cv => silhouette(cv, '#7fe9f5'));
  SPR.houndSilR = SPR.houndSil.map(flipCanvas);
  SPR.tollbearer = makeTollbearer();
  SPR.tollbearerL = flipCanvas(SPR.tollbearer);
  SPR.bones = bakeRows(ART.bones[0], 'bones');
  SPR.lanternOff = bakeRows(ART.lantern.off[0], 'lanternOff');
  SPR.lanternOn = bakeRows(ART.lantern.on[0], 'lanternOn');
  SPR.signUp = bakeRows(ART.sign.up[0], 'signUp');
  SPR.signDown = bakeRows(ART.sign.down[0], 'signDown');
  SPR.bell = bakeRows(ART.bell[0], 'bell');
  SPR.chicken = makeChicken();
  const wardInactive = makeWardBell(false), wardActive = makeWardBell(true);
  SPR.wardBell = Object.freeze({
    inactive: wardInactive, active: wardActive,
    off: wardInactive, on: wardActive,
  });
  SPR.wardBellInactive = wardInactive;
  SPR.wardBellActive = wardActive;

  SPR.stone = [makeStoneTile(1), makeStoneTile(2), makeStoneTile(3)];
  SPR.bgBrick = [makeBgBrickTile(1), makeBgBrickTile(2)];
  SPR.platform = makePlatformTile();
  SPR.spike = makeSpikeTile();
  SPR.chain = makeChainTile();
  SPR.breakable = makeBreakableTile();
  const ghostInactive = makeGhostPlatform(false), ghostActive = makeGhostPlatform(true);
  SPR.ghostPlatform = Object.freeze({
    inactive: ghostInactive, active: ghostActive,
    off: ghostInactive, on: ghostActive,
  });
  SPR.ghostPlatformInactive = ghostInactive;
  SPR.ghostPlatformActive = ghostActive;

  SPR.materials = {};
  for (const zone of Object.keys(ZONE_MATERIAL)) {
    SPR.materials[zone] = Object.freeze({
      stone: [1, 2, 3].map(seed => makeZoneStoneTile(zone, seed, false)),
      bgBrick: [1, 2].map(seed => makeZoneStoneTile(zone, seed, true)),
      platform: makeZonePlatformTile(zone),
    });
  }
  // Alias kept intentionally terse for game.js render routing.
  SPR.zoneTiles = SPR.materials;
  SPR.zoneProps = Object.freeze({
    exterior: Object.freeze({
      buttress: makeZoneProp('exterior', 'buttress'),
      lancet: makeZoneProp('exterior', 'lancet'),
    }),
    nave: Object.freeze({
      organPipes: makeZoneProp('nave', 'organPipes'),
      saintNiche: makeZoneProp('nave', 'saintNiche'),
    }),
    ossuary: Object.freeze({
      reliquary: makeZoneProp('ossuary', 'reliquary'),
      boneColumn: makeZoneProp('ossuary', 'boneColumn'),
    }),
  });

  SPR.moon = makeMoon();
  SPR.skyFar = makeSkyline(11, 240, '#181a30', false);
  SPR.skyMid = makeSkyline(23, 258, '#10111f', true);
  SPR.mistA = makeMistStrip(5, 0.16);
  SPR.mistB = makeMistStrip(9, 0.11);
  SPR.clouds = makeCloudStrip(31);
}
