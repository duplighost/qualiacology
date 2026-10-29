import { installWorld4252 } from './world4252-engine.js';
import { installWorld5363 } from './world5363-engine.js';
import { installWorld6484 } from './world6484-engine.js';
/* Worlds 1-1 through 8-4 and the first second-quest course. World coordinates are 16px-era tiles; y points down.
   The renderer supplies the pasta surface and soft-strand simulation. */
const LEVELS = ['1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4','3-1','3-2','3-3','3-4','4-1','4-2','4-3','4-4','5-1','5-2','5-3','5-4','6-1','6-2','6-3','6-4','7-1','7-2','7-3','7-4','8-1','8-2','8-3','8-4','q1-1'];
const GROUND = 13;
const EPS = 0.00001;
const NES_HZ = 60.0988;
const BOWSER_WAITS = [33,65,17,49];
const BOWSER_BREATHS = [191,64,191,191,191,64,64,191];
const overlap = (a, b) => a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const approach = (v, goal, amount) => v < goal ? Math.min(goal, v + amount) : Math.max(goal, v - amount);

// Original-game-derived 1-2 metatile grid, compressed as [firstX,lastX,tileId].
// Screen rows 2..12 are the underground structures; floor runs are separate.
const WORLD12_ROWS = {
2:[[0,0,82],[6,88,82],[89,89,94],[90,137,82],[161,167,82],[170,186,82],[190,205,82]],
3:[[0,0,82],[54,55,82],[58,63,82],[66,69,82],[76,79,82],[170,176,82],[190,205,82]],
4:[[0,0,82],[54,55,82],[58,63,82],[66,69,82],[76,79,82],[170,176,82],[190,205,82]],
5:[[0,0,82],[41,44,194],[52,53,82],[62,63,82],[67,67,82],[72,73,82],[84,89,194],[170,176,82],[190,205,82]],
6:[[0,0,82],[52,53,82],[62,63,82],[67,67,82],[72,73,82],[170,176,82],[190,205,82]],
7:[[0,0,82],[39,39,82],[41,44,82],[46,46,92],[52,53,82],[62,63,82],[67,67,82],[72,73,82],[84,89,82],[170,176,82],[190,205,82]],
8:[[0,0,82],[29,29,93],[39,39,82],[40,40,194],[41,41,82],[44,44,82],[45,45,194],[46,46,82],[52,53,82],[58,61,194],[62,63,82],[67,67,82],[68,68,194],[69,69,90],[72,72,82],[73,73,93],[84,89,82],[145,149,82],[150,150,90],[170,176,82],[190,205,82]],
9:[[0,0,82],[10,10,193],[11,14,192],[23,23,97],[25,25,97],[39,41,82],[44,46,82],[52,55,82],[58,63,82],[67,69,82],[72,73,82],[76,79,82],[136,137,97],[170,176,82],[190,205,82]],
10:[[0,0,82],[21,21,97],[23,23,97],[25,25,97],[27,27,97],[31,31,97],[54,55,82],[122,123,82],[135,137,97],[160,176,82],[190,205,82]],
11:[[0,0,82],[19,19,97],[21,21,97],[23,23,97],[25,25,97],[27,27,97],[31,31,97],[33,33,97],[54,55,82],[122,123,82],[134,137,97],[160,176,82],[190,205,82]],
12:[[0,0,82],[17,17,97],[19,19,97],[21,21,97],[23,23,97],[25,25,97],[27,27,97],[31,31,97],[33,33,97],[122,123,82],[133,137,97],[160,176,82],[190,205,82]]
};

// World 1-3 crowns and coins from the original-game-derived metatile grid.
// Crown tiles are fully solid. The long stems below them are decoration only.
const WORLD13_TREES = [[18,12,4],[24,9,8],[26,5,5],[32,12,3],[35,8,5],[40,4,7],[50,13,4],[59,13,5],[60,5,4],[65,13,5],[70,9,3],[76,6,6],[98,11,4],[104,7,8],[113,13,3],[116,9,4],[122,9,4]];
const WORLD13_COINS = [[37,2],[38,2],[27,4],[28,4],[29,4],[60,4],[61,4],[62,4],[63,4],[93,4],[94,4],[97,4],[98,4],[85,5],[86,5],[120,5],[121,5],[50,6],[51,6],[33,11],[113,12],[114,12],[115,12]];

// Castle 1-4 static metatiles from the original-game-derived grid.
const WORLD14_ROWS = {"2":[[0,159,98]],"3":[[0,23,98],[37,71,98],[80,80,98],[88,88,98],[97,103,98],[123,127,98],[142,143,98]],"4":[[0,23,98],[37,71,98],[80,80,196],[88,88,196],[97,103,98],[123,127,98],[142,143,98]],"5":[[23,23,98],[37,71,98],[107,107,95],[110,110,95],[113,113,95],[142,143,98]],"6":[[23,23,196],[30,30,193],[37,37,196],[49,49,196],[60,60,196],[67,67,196]],"7":[[0,2,98]],"8":[[0,3,98],[141,141,197]],"9":[[0,4,98],[35,71,98],[76,76,196],[84,84,196],[92,92,196],[106,106,95],[109,109,95],[112,112,95],[140,140,12],[141,143,98]],"10":[[0,12,98],[15,25,98],[29,29,98],[30,30,196],[31,31,98],[35,103,98],[116,119,98],[123,127,98],[128,140,137],[141,143,98]],"11":[[0,12,98],[15,25,98],[29,31,98],[35,103,98],[116,119,98],[123,127,98],[141,143,98]],"12":[[0,12,98],[13,14,134],[15,25,98],[29,31,98],[35,103,98],[116,119,98],[123,127,98],[141,143,98]],"13":[[0,12,98],[13,14,135],[15,25,98],[26,28,134],[29,31,98],[32,34,134],[35,127,98],[128,140,134],[141,159,98]],"14":[[0,12,98],[13,14,135],[15,25,98],[26,28,135],[29,31,98],[32,34,135],[35,127,98],[128,140,135],[141,159,98]]};

// Original-derived World 2-1 collision metatiles and Coin Heaven coins.
const WORLD21_ROWS = {"3":[[190,191,97]],"4":[[190,191,97]],"5":[[28,28,96],[29,31,81],[53,57,192],[69,69,87],[70,72,81],[81,82,81],[83,83,86],[84,85,81],[92,95,81],[125,125,85],[126,128,81],[164,168,81],[172,172,85],[186,186,95],[190,191,97]],"6":[[190,191,97]],"7":[[190,191,97]],"8":[[24,24,97],[190,191,97]],"9":[[15,15,81],[16,16,85],[17,17,81],[23,24,97],[28,28,95],[34,34,97],[53,53,193],[54,57,192],[68,68,81],[79,82,192],[85,87,192],[161,161,88],[170,170,192],[185,186,81],[190,191,97]],"10":[[22,24,97],[34,34,97],[154,154,97],[190,191,97]],"11":[[21,24,97],[34,35,97],[154,154,97],[190,191,97]],"12":[[20,24,97],[34,35,97],[154,154,97],[190,191,97],[200,200,97]]};
const WORLD21_SKY_COINS = [[32,4],[33,4],[34,4],[53,4],[54,4],[55,4],[36,5],[37,5],[38,5],[39,5],[40,5],[41,5],[42,5],[43,5],[44,5],[45,5],[46,5],[47,5],[48,5],[49,5],[50,5],[51,5],[15,6],[16,6],[17,6],[18,6],[19,6],[20,6],[21,6],[22,6],[23,6],[24,6],[25,6],[26,6],[27,6],[28,6],[29,6],[30,6],[69,12],[70,12],[71,12]];


// World 2-2 and 2-3 metatiles extracted from the original level data.
const WORLD22_ROWS = {"2":[[78,79,105],[131,131,105],[188,205,105]],"3":[[78,79,105],[131,131,105],[188,205,105]],"4":[[78,79,105],[131,139,105],[188,205,105]],"5":[[82,84,105],[156,158,105],[162,164,105],[172,176,105],[180,183,105],[188,205,105]],"6":[[156,156,105],[164,164,105],[190,205,105]],"7":[[156,156,105],[164,164,105],[190,205,105]],"8":[[65,65,105],[71,71,105],[115,116,105],[156,156,105],[164,164,105],[190,205,105]],"9":[[18,20,105],[42,43,105],[65,65,105],[71,71,105],[102,103,105],[129,129,105],[141,141,105],[156,156,105],[164,164,105],[172,176,105],[180,183,105],[188,205,105]],"10":[[64,65,105],[71,72,105],[78,79,105],[129,129,105],[141,141,105],[156,156,105],[164,164,105],[187,205,105]],"11":[[64,65,105],[71,72,105],[78,79,105],[129,130,105],[140,141,105],[156,156,105],[164,164,105],[186,205,105]],"12":[[64,65,105],[71,72,105],[78,79,105],[129,130,105],[140,141,105],[156,156,105],[164,164,105],[185,205,105]]};
const WORLD22_COINS = [[27,5],[28,5],[29,5],[113,6],[114,6],[115,6],[159,9],[160,9],[161,9],[67,10],[68,10],[69,10],[101,11],[102,11],[103,11],[133,11],[137,11],[14,12],[15,12],[36,12],[37,12],[38,12],[134,12],[135,12],[136,12],[159,12],[160,12],[161,12]];
const WORLD22_CORALS = [{"x":11,"y":10,"w":1,"h":3},{"x":33,"y":8,"w":1,"h":5},{"x":42,"y":7,"w":1,"h":2},{"x":50,"y":9,"w":1,"h":4},{"x":83,"y":3,"w":1,"h":2},{"x":89,"y":10,"w":1,"h":3},{"x":102,"y":5,"w":1,"h":4},{"x":120,"y":9,"w":1,"h":4},{"x":147,"y":11,"w":1,"h":2},{"x":149,"y":10,"w":1,"h":3},{"x":173,"y":3,"w":1,"h":2}];
const WORLD23_ROWS = {"5":[[102,102,193],[215,216,97]],"6":[[214,216,97]],"7":[[213,216,97]],"8":[[212,216,97]],"9":[[99,99,97],[105,105,97],[211,216,97]],"10":[[12,14,97],[31,31,97],[47,47,97],[63,63,97],[68,68,97],[79,79,97],[84,84,97],[95,95,97],[99,99,97],[105,105,97],[127,127,97],[143,143,97],[159,159,97],[168,168,97],[183,183,97],[193,194,97],[210,216,97]],"11":[[11,14,97],[31,31,97],[47,47,97],[63,63,97],[68,68,97],[79,79,97],[84,84,97],[95,95,97],[99,99,97],[105,105,97],[127,127,97],[143,143,97],[159,159,97],[168,168,97],[183,183,97],[193,195,97],[209,216,97]],"12":[[10,14,97],[31,31,97],[47,47,97],[63,63,97],[68,68,97],[79,79,97],[84,84,97],[95,95,97],[99,99,97],[105,105,97],[127,127,97],[143,143,97],[146,146,97],[155,155,97],[159,159,97],[168,168,97],[183,183,97],[193,196,97],[208,216,97],[225,225,97]],"13":[[31,31,97],[47,47,97],[63,63,97],[68,68,97],[79,79,97],[84,84,97],[95,95,97],[99,99,97],[105,105,97],[127,127,97],[143,143,97],[146,146,97],[155,155,97],[159,159,97],[168,168,97],[183,183,97]],"14":[[31,31,97],[47,47,97],[63,63,97],[68,68,97],[79,79,97],[84,84,97],[95,95,97],[99,99,97],[105,105,97],[127,127,97],[143,143,97],[146,146,97],[155,155,97],[159,159,97],[168,168,97],[183,183,97]]};
const WORLD23_COINS = [[73,4],[74,4],[36,5],[37,5],[38,5],[39,5],[55,5],[57,5],[59,5],[72,5],[75,5],[97,5],[98,5],[99,5],[108,5],[109,5],[110,5],[133,5],[134,5],[135,5],[136,5],[137,5],[138,5],[56,6],[58,6],[173,6],[174,6],[175,6],[176,6],[177,6],[178,6],[149,8],[150,8],[151,8],[152,8]];
const WORLD23_BRIDGES = [{"x":100,"y":9,"w":5,"h":1},{"x":15,"y":10,"w":16,"h":1},{"x":32,"y":10,"w":15,"h":1},{"x":48,"y":10,"w":15,"h":1},{"x":69,"y":10,"w":10,"h":1},{"x":85,"y":10,"w":10,"h":1},{"x":122,"y":10,"w":3,"h":1},{"x":128,"y":10,"w":15,"h":1},{"x":160,"y":10,"w":8,"h":1},{"x":171,"y":10,"w":2,"h":1},{"x":175,"y":10,"w":2,"h":1},{"x":179,"y":10,"w":2,"h":1},{"x":184,"y":10,"w":9,"h":1},{"x":147,"y":12,"w":8,"h":1}];
const WORLD23_TREES = [{"x":8,"y":13,"w":8,"h":1},{"x":112,"y":13,"w":8,"h":1},{"x":192,"y":13,"w":13,"h":1}];
const FLY_FISH_X = [128,48,64,128,48,80,80,112,32,64,128,160,112,64,144,104];
const FLY_FISH_SPEED = [14,5,6,14,28,32,16,12,30,34,24,20];
const FLY_FISH_WAIT = [16,96,32,72];
const SWIM_FISH_Y = [64,48,144,80,32,96,160,112];


// Worlds 2–4 and 3–1 collision and item metatiles from the original data.
const WORLD24_ROWS = {"2":[[0,15,98],[34,82,98],[93,98,98],[115,159,98]],"3":[[0,15,98],[23,23,193],[34,82,98],[93,98,98],[115,127,98],[142,143,98]],"4":[[0,15,98],[34,82,98],[93,98,98],[115,127,98],[142,143,98]],"5":[[34,54,98],[55,55,196],[56,82,98],[128,133,82],[142,143,98]],"6":[[82,82,196]],"7":[[0,2,98],[22,22,98],[23,23,196],[24,24,98]],"8":[[0,3,98],[102,104,194],[141,141,197]],"9":[[0,4,98],[18,19,98],[27,28,98],[37,48,98],[49,49,196],[50,60,98],[61,61,196],[62,72,98],[73,73,196],[141,143,98]],"10":[[0,15,98],[32,33,98],[80,83,98],[92,92,196],[93,98,98],[108,108,98],[111,112,98],[115,119,98],[122,123,98],[126,127,98],[128,140,137],[141,143,98]],"11":[[0,15,98],[32,33,98],[80,83,98],[92,98,98],[103,103,196],[108,108,98],[111,112,98],[115,119,98],[122,123,98],[126,127,98],[141,143,98]],"12":[[0,15,98],[32,33,98],[80,83,98],[92,98,98],[102,104,194],[108,108,98],[111,112,98],[115,119,98],[122,123,98],[126,127,98],[141,143,98]],"13":[[0,15,98],[16,31,134],[32,42,98],[43,43,196],[44,54,98],[55,55,196],[56,66,98],[67,67,196],[68,83,98],[92,108,98],[109,110,134],[111,112,98],[113,114,134],[115,127,98],[128,140,134],[141,159,98]],"14":[[0,15,98],[16,31,135],[32,83,98],[92,108,98],[109,110,135],[111,112,98],[113,114,135],[115,127,98],[128,140,135],[141,159,98]]};
const WORLD31_ROWS = {"5":[[82,82,96],[90,90,87],[91,92,81],[111,112,81],[113,113,192],[114,116,81],[117,117,193],[118,120,81],[129,130,81],[131,131,86],[150,150,81],[151,151,192],[152,152,81],[155,155,81],[156,156,192],[157,157,81],[190,191,97]],"6":[[189,191,97]],"7":[[141,141,97],[175,175,97],[188,191,97]],"8":[[19,19,192],[22,22,193],[129,131,81],[140,141,97],[175,175,97],[187,191,97]],"9":[[16,16,192],[26,28,81],[61,61,81],[76,76,97],[85,85,97],[88,88,97],[111,121,81],[139,141,97],[150,150,81],[151,151,192],[152,152,81],[155,155,81],[156,156,193],[157,157,81],[166,166,81],[167,167,88],[168,170,81],[175,175,97],[186,191,97]],"10":[[75,76,97],[85,85,97],[88,88,97],[138,141,97],[174,175,97],[185,191,97]],"11":[[74,76,97],[85,85,97],[88,89,97],[137,141,97],[174,175,97],[184,191,97]],"12":[[73,76,97],[85,85,97],[88,89,97],[136,141,97],[174,175,97],[183,191,97],[200,200,97]]};

const WORLD31_BONUS_ROWS = {"2":[[0,0,82]],"3":[[0,0,82],[7,8,194]],"4":[[0,0,82],[6,9,194]],"5":[[0,0,82],[3,4,82],[5,5,90],[7,8,82],[10,12,82]],"6":[[0,0,82],[3,4,82],[6,6,194],[7,8,82],[9,9,194],[11,12,82]],"7":[[0,0,82],[3,3,82],[5,5,194],[6,6,82],[9,9,82],[10,10,194],[12,12,82]],"8":[[0,0,82],[3,3,82],[4,4,194],[5,5,82],[10,10,82],[11,11,194],[12,12,82]],"9":[[0,0,82],[4,4,82],[11,11,82]],"10":[[0,0,82]],"11":[[0,0,82]],"12":[[0,0,82]]};
const WORLD31_SKY_COINS = [[53,5],[54,5],[55,5],[56,5],[57,5],[58,5],[59,5],[71,5],[72,5],[73,5],[74,5],[75,5],[76,5],[77,5],[78,5],[79,5],[80,5],[15,6],[16,6],[17,6],[18,6],[19,6],[20,6],[21,6],[22,6],[23,6],[24,6],[25,6],[26,6],[27,6],[28,6],[29,6],[30,6],[34,6],[35,6],[36,6],[37,6],[38,6],[39,6],[40,6],[41,6],[42,6],[43,6],[44,6],[45,6],[46,6],[47,6],[48,6],[49,6],[85,11],[86,11],[87,11]];
const WORLD31_SKY_CLOUDS = [[67,6,2],[71,6,1],[73,6,1],[75,6,1],[77,6,1],[79,6,1],[51,7,1],[61,7,1],[32,8,1],[51,8,1],[61,8,1],[0,13,4],[5,13,78]];

// Nighttime World 3–2 and 3–3 terrain, from the original metatile data.
const WORLD32_ROWS = {5:[[77,77,87],[199,200,97]],6:[[60,60,193],[126,126,81],[168,171,194],[198,200,97]],7:[[197,200,97]],8:[[196,200,97]],9:[[55,57,194],[77,77,88],[195,200,97]],10:[[60,60,97],[194,200,97]],11:[[60,60,97],[75,75,97],[79,79,97],[126,126,97],[193,200,97]],12:[[49,49,97],[60,60,97],[75,75,97],[79,79,97],[126,126,97],[192,200,97],[209,209,97]]};
const WORLD33_TREES = [[18,10,5],[22,7,6],[30,13,3],[36,12,7],[43,9,4],[46,11,10],[47,7,6],[55,3,4],[65,7,3],[65,13,16],[69,7,3],[73,7,3],[77,4,3],[84,11,4],[97,9,3],[104,5,4],[107,11,5],[108,7,3],[116,13,3],[119,10,12]];
const WORLD33_COINS = [[56,2],[57,2],[78,3],[105,4],[106,4],[81,5],[88,5],[90,5],[37,6],[42,6],[43,6],[44,6],[66,6],[70,6],[74,6],[109,6],[52,9],[53,9],[54,9],[108,10],[31,12],[32,12]];
const SHELL_CHAIN_POINTS = [500,800,1000,2000,4000,5000,8000];

// World 3–4 uses CastleArea4: separate lava islands and opposing firebar pairs.
const WORLD34_ROWS = {"2":[[0,159,98]],"3":[[0,15,98],[35,45,98],[53,55,98],[63,65,98],[79,81,98],[90,95,98],[111,127,98],[132,133,82],[142,143,98]],"4":[[0,15,98],[35,45,98],[53,55,98],[63,65,98],[79,81,98],[90,95,98],[111,127,98],[132,133,82],[142,143,98]],"5":[[54,54,196],[64,64,196],[80,80,196],[132,133,82],[142,143,98]],"6":[[81,83,194]],"7":[[0,2,98]],"8":[[0,3,98],[141,141,197]],"9":[[0,4,98],[42,42,192],[43,43,193],[44,44,192],[141,143,98]],"10":[[0,15,98],[18,20,98],[23,25,98],[28,30,98],[33,34,98],[90,95,98],[99,101,98],[105,107,98],[111,115,98],[118,127,98],[128,140,137],[141,143,98]],"11":[[0,15,98],[18,18,98],[19,19,196],[20,20,98],[23,23,98],[24,24,196],[25,25,98],[28,28,98],[29,29,196],[30,30,98],[33,34,98],[54,54,196],[64,64,196],[80,80,196],[90,95,98],[99,101,98],[105,107,98],[111,115,98],[118,127,98],[141,143,98]],"12":[[0,15,98],[18,20,98],[23,25,98],[28,30,98],[33,34,98],[53,55,98],[63,65,98],[79,81,98],[90,95,98],[99,101,98],[105,107,98],[111,115,98],[118,127,98],[141,143,98]],"13":[[0,15,98],[18,20,98],[23,25,98],[28,30,98],[33,45,98],[46,47,134],[48,87,98],[88,89,134],[90,95,98],[96,98,134],[99,101,98],[102,104,134],[105,107,98],[108,110,134],[111,127,98],[128,140,134],[141,159,98]],"14":[[0,15,98],[18,20,98],[23,25,98],[28,30,98],[33,45,98],[46,47,135],[48,87,98],[88,89,135],[90,95,98],[96,98,135],[99,101,98],[102,104,135],[105,107,98],[108,110,135],[111,127,98],[128,140,135],[141,159,98]]};
const WORLD41_ROWS = {"5":[[25,25,192],[64,64,192],[66,66,192],[92,92,96],[148,151,192],[215,216,97]],"6":[[105,108,194],[119,122,194],[135,138,194],[214,216,97]],"7":[[213,216,97]],"8":[[42,43,194],[212,216,97]],"9":[[25,25,193],[41,41,194],[44,44,194],[64,64,192],[66,66,192],[90,93,192],[146,147,192],[148,148,193],[149,150,81],[151,153,192],[211,216,97],[220,220,88]],"10":[[103,103,97],[189,189,97],[210,216,97]],"11":[[103,103,97],[189,189,97],[209,216,97]],"12":[[103,103,97],[189,189,97],[208,216,97],[225,225,97],[232,232,82]]};
const WORLD41_BONUS_ROWS = {"2":[[0,0,82],[3,14,82],[17,31,82]],"3":[[0,0,82]],"4":[[0,0,82]],"5":[[0,0,82]],"6":[[0,0,82]],"7":[[0,0,82]],"8":[[0,0,82],[3,10,194]],"9":[[0,0,82],[3,10,82],[13,13,90]],"10":[[0,0,82],[3,3,82],[10,10,82]],"11":[[0,0,82],[3,3,82],[10,10,82]],"12":[[0,0,82],[3,12,194]]};

export class Game {
  constructor({ onEvent, startLevel = '1-1' } = {}) {
    this.selectedLevel = LEVELS.includes(startLevel) ? startLevel : '1-1';
    this.onEvent = onEvent || (() => {});
    this.viewWidth = 20;
    this.reset(true);
  }

  emit(type, subject = this.player, detail = {}) {
    this.onEvent({ type, x: subject.x + (subject.w || 0) / 2, y: subject.y + (subject.h || 0) / 2, ...detail });
  }

  reset(full = true) {
    if (full) { this.score = 0; this.coins = 0; this.lives = 3; this.checkpoint = 0; this.world21OneUpAvailable = true; this.world31OneUpAvailable = true; this.world41OneUpAvailable = true; this.world51OneUpAvailable = true; this.world61OneUpAvailable = true; this.world71OneUpAvailable = true; this.world81OneUpAvailable = true; }
    this.world6484=false;this.savedLateMain=null;this.lateBonusRoute=null;this.castle84Stage=0;this.castle84Loops=0;this.princess=null;this.world5363=false;this.bulletFrenzy=null;this.savedWorld62=null;this.bonus62Route=null;this.newAreaKey=null;this.newAreaInfo=null;this.cannons=[];this.savedNewMain=null;this.castleRoomOffset=0;this.maze=null;
    this.levelCoins = 0;
    this.level = this.selectedLevel;
    this.primaryHardMode=this.level==='q1-1';
    this.secondaryHardMode=this.primaryHardMode||LEVELS.indexOf(this.level)>=18;
    this.quest=this.primaryHardMode?2:1;
    this.worldLabel = this.primaryHardMode?'1-1':this.level;
    this.platforms = [];
    this.scales = [];
    this.treetops = [];
    this.vines = []; this.springboards = []; this.clouds = []; this.savedWorld21 = null;
    this.corals = []; this.currents = []; this.fishSpawner = null;
    this.podoboos=[];this.hammers=[];this.ponds=[];this.savedWorld31=null;this.savedWorld41=null;this.lakituSpawner=null;this.levelRandom={bytes:[0xa5,0,0,0,0,0,0],clock:0,frame:0};
    this.lava = []; this.firebars = []; this.bridge = []; this.bossFlames = [];
    this.boss = null; this.axe = null; this.toad = null; this.castleEnding = null;
    this.savedWorld12 = null;
    this.warpDestination = null;
    this.warpVisible = false;
    this.flagX = 198;
    this.time = 400;
    this.area = 'overworld';
    this.worldWidth = 224;
    this.camera = this.checkpoint ? Math.max(0, this.checkpoint - 3) : 0;
    this.state = full ? 'title' : 'playing';
    this.clock = 0;
    this.flagY = 3;
    this.castleX = 204;
    this.stateTime = 0;
    this.messageTimer = 0;
    this.accumulator = 0;
    this.inputBefore = {};
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.savedOverworld = null;
    this.effects = [];
    this.items = [];
    this.shots = [];
    this.player = { x: this.checkpoint || 2.5, y: 12, w: 0.8, h: 1, vx: 0, vy: 0, facing: 1, big: false, fire: false, star: 0, invincible: 0, grounded: true, walk: 0, dead: false, squash: 0, crouching: false, fireCooldown: 0 };
    if (this.level==='q1-1') this.createSecondQuest11();
    else if (['6-4','7-1','7-2','7-3','7-4','8-1','8-2','8-3','8-4'].includes(this.level))this.createWorld6484(this.level.replace('-',''));
    else if (this.level === '6-3') this.createWorld63();
    else if (this.level === '6-2') this.createWorld62();
    else if (this.level === '6-1') this.createWorld61();
    else if (this.level === '5-4') this.createWorld54();
    else if (this.level === '5-3') this.createWorld53();
    else if (this.level === '5-2') this.createWorld52();
    else if (this.level === '5-1') this.createWorld51();
    else if (this.level === '4-4') this.createWorld44();
    else if (this.level === '4-3') this.createWorld43();
    else if (this.level === '4-2') this.createWorld42();
    else if (this.level === '4-1') this.createWorld41();
    else if (this.level === '3-4') this.createWorld34();
    else if (this.level === '3-3') this.createWorld33();
    else if (this.level === '3-2') this.createWorld32();
    else if (this.level === '3-1') this.createWorld31();
    else if (this.level === '2-4') this.createWorld24();
    else if (this.level === '2-3') this.createWorld23();
    else if (this.level === '2-2') this.createWorld22();
    else if (this.level === '2-1') this.createWorld21();
    else if (this.level === '1-4') this.createWorld14();
    else if (this.level === '1-3') this.createWorld13();
    else if (this.level === '1-2') this.createWorld12();
    else this.createOverworld();
    return this;
  }

  start() {
    if (this.state === 'gameover' || this.state === 'won') this.reset(true);
    if (this.state === 'title') { if(this.level==='1-2')this.createIntro12();else if(this.level==='2-2')this.createIntro22();else if(this.level==='7-2')this.createIntro72();else if(this.level==='4-2')this.createIntro42();else this.state = 'playing'; this.emit('start'); }
  }

  selectLevel(level) {
    if (!LEVELS.includes(level)) return this;
    this.selectedLevel = level;
    return this.reset(true);
  }

  advanceLevel() {
    const next=LEVELS.indexOf(this.level)+1;
    if (next<=0||next>=LEVELS.length||this.state!=='won'||this.level==='8-4'||this.level==='q1-1')return false;
    if(this.level==='1-3')this.world21OneUpAvailable=this.levelCoins>=21;
    if(this.level==='2-3')this.world31OneUpAvailable=this.levelCoins>=35;
    if(this.level==='3-3')this.world41OneUpAvailable=this.levelCoins>=22;
    if(this.level==='4-3')this.world51OneUpAvailable=this.levelCoins>=27;
    if(this.level==='5-3')this.world61OneUpAvailable=this.levelCoins>=23;
    if(this.level==='6-3')this.world71OneUpAvailable=this.levelCoins>=24;
    if(this.level==='7-3')this.world81OneUpAvailable=this.levelCoins>=35;
    const power = { big: this.player.big, fire: this.player.fire };
    this.selectedLevel = LEVELS[next]; this.checkpoint = 0;
    this.reset(false);
    if (power.big) Object.assign(this.player, { ...power, h: 1.9, y: this.player.y - 0.9 });
    if (this.level === '1-2') this.createIntro12();
    else if (this.level === '2-2') this.createIntro22();
    else if (this.level === '7-2') this.createIntro72();
    else if (this.level === '4-2') this.createIntro42();
    this.emit('start');
    return true;
  }

  createOverworld() {
    this.floors = [ [0, 69], [71, 15], [89, 64], [155, 69] ].map(([x, w]) => ({ x, y: GROUND, w, h: 2, type: 'ground' }));
    this.blocks = [];
    const put = (x, y, type = 'brick', content = null) => this.blocks.push({ x, y, w: 1, h: 1, type, content, used: false, removed: false, bump: 0, bumpVelocity: 0, coinsLeft: content === 'multi' ? 10 : 0 });
    const question = (x, y, content = 'coin') => put(x, y, 'question', content);
    question(16, 9);
    for (const x of [20, 22, 24]) put(x, 9);
    question(21, 9, 'mushroom'); question(23, 9); question(22, 5);
    put(64, 8, 'hidden', '1up');
    put(77, 9); question(78, 9, 'mushroom'); put(79, 9);
    for (let x = 80; x <= 87; x++) put(x, 5);
    for (let x = 91; x <= 93; x++) put(x, 5);
    question(94, 5); put(94, 9, 'brick', 'multi');
    put(100, 9); put(101, 9, 'brick', 'star');
    for (const x of [106, 109, 112]) question(x, 9);
    question(109, 5, 'mushroom'); put(118, 9);
    for (let x = 121; x <= 123; x++) put(x, 5);
    put(128, 5); question(129, 5); question(130, 5); put(131, 5);
    put(129, 9); put(130, 9);
    for (const x of [168, 169, 171]) put(x, 9);
    question(170, 9);
    const stair = (x, height) => { for (let y = GROUND - height; y < GROUND; y++) put(x, y, 'solid'); };
    [[134,1],[135,2],[136,3],[137,4],[140,4],[141,3],[142,2],[143,1],[148,1],[149,2],[150,3],[151,4],[152,4],[155,4],[156,3],[157,2],[158,1]].forEach(([x,h]) => stair(x,h));
    for (let x = 181; x <= 188; x++) stair(x, x - 180);
    stair(189, 8); stair(198, 1);
    this.pipes = [[28,2],[38,3],[46,4],[57,4],[163,2],[179,2]].map(([x,h]) => ({ x, y: GROUND-h, w: 2, h, enter: x === 57, exit: x === 163, type: 'pipe' }));
    this.enemies = [22,42.5,51.5,52.75,80,82,97,98.5,114,115.5,124,126,128,130,174,175.5].map(x => this.makeEnemy('goomba', x, x === 80 || x === 82 ? 5 : GROUND));
    this.enemies.push(this.makeEnemy('koopa', 107, GROUND));
  }

  makeBlock(x, y, type='brick', content=null, unbreakable=false) {
    return {x,y,w:1,h:1,type,content,used:false,removed:false,bump:0,bumpVelocity:0,coinsLeft:content==='multi'?10:0,unbreakable};
  }

  makeCoin(x,y) {
    return {kind:'coin',type:'coin',x,y,w:0.7,h:0.8,vx:0,vy:0,age:0,removed:false};
  }

  createWorld12() {
    this.area='underworld'; this.worldWidth=206; this.flagX=null; this.castleX=null;
    this.floors=[[0,80],[83,37],[122,2],[126,12],[145,8],[160,46]].map(([x,w])=>({x,y:13,w,h:2,type:'ground'}));
    this.blocks=[]; this.items=[]; this.shots=[]; this.effects=[];
    for(const [row,runs] of Object.entries(WORLD12_ROWS)) for(const [first,last,id] of runs) for(let x=first;x<=last;x++) {
      const y=Number(row);
      if(id===194){this.items.push(this.makeCoin(x+0.125,y+0.125));continue;}
      const content=({90:'mushroom',92:'star',93:'multi',94:'1up',192:'coin',193:'mushroom'})[id]||null;
      this.blocks.push(this.makeBlock(x,y,id===97?'solid':id===192||id===193?'question':'brick',content));
    }
    this.pipes=[
      {x:103,y:10,w:2,h:3,type:'pipe',enter:true,action:'bonus12'},
      {x:109,y:9,w:2,h:4,type:'pipe'},
      {x:115,y:11,w:2,h:2,type:'pipe',exit:true},
      {x:166,y:8,w:2,h:2,type:'pipe',horizontal:true,action:'exit12'},
      {x:168,y:2,w:2,h:8,type:'pipe',shaft:true},
      ...[[178,4],[182,3],[186,2]].map(([x,warp])=>({x,y:10,w:2,h:3,type:'pipe',enter:true,warp}))
    ];
    this.platforms=[];
    for(const [column,vy,heights] of [[139.75,3.5214,[7,13]],[154.75,-3.5214,[1,9]]]) heights.forEach((y,n)=>{
      this.platforms.push({id:'lift-'+column+'-'+n,x:column,y,w:3,h:0.38,vy,loopMin:-.5,loopMax:15.5,dx:0,dy:0});
    });
    this.enemies=[];
    for(const [x,feet] of [[16,13],[17,12],[29,13],[62,13],[64,13],[73,5],[76,9],[77.5,9],[99,13],[100.5,13],[102,13],[113,13],[135,10],[136.5,9]]) this.enemies.push(this.makeEnemy('goomba',x,feet));
    for(const x of [44,45.5,59]) this.enemies.push(this.makeEnemy('koopa',x,13));
    this.enemies.push({...this.makeEnemy('koopa',146,13),smart:true,red:true});
    for(const pipe of this.pipes.filter(p=>[103,109,115].includes(p.x))) this.enemies.push(this.makePiranha(pipe));
    this.camera=this.checkpoint?Math.max(0,this.checkpoint-3):0;
    const p=this.player;
    Object.assign(p,{x:this.checkpoint||1.7,y:this.checkpoint?13-p.h:3,vx:0,vy:0,grounded:!!this.checkpoint,hidden:false,supportPlatform:null});
    this.warpVisible=false;
  }

  createWorld13() {
    this.area='treetops';this.worldWidth=178;this.time=300;this.flagX=152;this.castleX=159;this.flagY=3;
    this.floors=[[0,16],[129,49]].map(([x,w])=>({x,y:13,w,h:2,type:'ground'}));
    this.treetops=WORLD13_TREES.map(([x,y,w])=>({x,y,w,h:1,type:'treetop',trunkX:x+1,trunkWidth:w-2}));
    this.blocks=[this.makeBlock(59,10,'question','mushroom')];
    for(const [x,top] of [[138,9],[139,9],[140,7],[141,7],[142,5],[143,5],[152,12]]) {
      for(let y=top;y<13;y++)this.blocks.push(this.makeBlock(x,y,'solid'));
    }
    this.pipes=[];this.shots=[];this.effects=[];
    this.items=WORLD13_COINS.map(([x,y])=>this.makeCoin(x+.125,y+.125));
    this.platforms=[
      {id:'tree-lift-55',x:55,y:6,w:3,h:.38,axis:'y',motion:'vertical-oscillate',min:6,max:14,center:10,acceleration:5/256*60.0988**2/16,maxSpeed:3*60.0988/16,active:false,dx:0,dy:0,vx:0,vy:0},
      ...[[86,8],[94,9],[131,6]].map(([x,y])=>({id:'tree-lift-'+x,x,y,w:3,h:.38,axis:'x',motion:'horizontal-oscillate',originX:x,min:x-3.28125,max:x,phase:0,motionFrame:0,primary:0,secondary:0,active:false,dx:0,dy:0,vx:0,vy:0}))
    ];
    this.enemies=[];
    for(const [x,feet] of [[44,4],[46,4],[80,6]])this.enemies.push(this.makeEnemy('goomba',x,feet));
    for(const [x,feet] of [[30,5],[110,7],[133,13]])this.enemies.push({...this.makeEnemy('koopa',x,feet),red:true,smart:true});
    for(const [x,top] of [[74,3.5],[114,4.5]]) {
      this.enemies.push({...this.makeEnemy('koopa',x,top+1.4),red:true,smart:true,winged:true,flightMinY:top,flightMaxY:top+6,flightCenter:top+3,flightAcceleration:3/256*60.0988**2/16,flightMaxSpeed:2*60.0988/16,flightPhase:0,vx:0,vy:0});
    }
    this.camera=this.checkpoint?64:0;
    Object.assign(this.player,{x:this.checkpoint?66.5:2.5,y:13-this.player.h,vx:0,vy:0,grounded:true,hidden:false,supportPlatform:null});
  }


  createWorld24() {
    // The boss room shares its coordinates with1–4; rebuild all preceding
    // terrain and hazards from2–4's separate source data.
    this.createWorld14();this.area='castle24';
    this.blocks=[];this.floors=[];this.lava=[];this.bridge=[];this.items=[];this.firebars=[];
    for(const[row,runs]of Object.entries(WORLD24_ROWS))for(const[first,last,id]of runs){
      const y=Number(row);
      if(id===98&&y===13){this.floors.push({x:first,y,w:last-first+1,h:2,type:'ground',castleTile:98});continue;}
      if(id===134){this.lava.push({x:first,y,w:last-first+1,h:15.5-y});continue;}
      if(id===135)continue;
      for(let x=first;x<=last;x++){
        // Three floor pivots replace row13 only. Their row14 remains stone.
        if(id===98&&y===14&&![43,55,67].includes(x))continue;
        if(id===98||id===196){const b=this.makeBlock(x,y,'solid');b.castleTile=id;b.pivot=id===196;this.blocks.push(b);}
        else if(id===82)this.blocks.push(this.makeBlock(x,y,'brick'));
        else if(id===193)this.blocks.push(this.makeBlock(x,y,'question','mushroom'));
        else if(id===194)this.items.push(this.makeCoin(x+.125,y+.125));
        else if(id===137)this.bridge.push({x,y,w:1,h:1,visualHeight:.5,type:'bridge',removed:false,fallTime:0});
        else if(id===197)this.axe={x,y,w:1,h:1,triggered:false};
      }
    }
    for(const[x,y,direction]of[[49,9,-1],[55,5,-1],[61,9,-1],[73,9,-1],[82,6,-1],[92,10,1]])this.firebars.push({x:x+.5,y:y+.5,anchorX:x,anchorY:y,angle:-Math.PI/2,angularVelocity:direction*NES_HZ*40/256/32*Math.PI*2,count:6,spacing:.5,radius:.23,active:false,balls:[]});
    this.updateFirebars(0,false);
    this.podoboos=[16,30].map((x,n)=>({id:'podoboo24-'+n,x,y:16.125,w:1,h:1,vy:0,active:false,hidden:true,phase:'wait',timer:21/NES_HZ,slot:n,clock:0,trail:[],jumps:0}));
    for(const[x,vy]of[[85.75,-15/16*NES_HZ/16],[88.75,15/16*NES_HZ/16]])for(const y of[2,10])this.platforms.push({id:'castle24-lift-'+x+'-'+y,x,y,w:1.5,h:.375,vy,loopMin:0,loopMax:16,dx:0,dy:0,motion:'small-lift',active:false});
    this.boss.disguise='koopa';this.flameGenerator.x=98;
  }

  createWorld34() {
    this.createWorld14();this.area='castle34';
    this.blocks=[];this.floors=[];this.lava=[];this.bridge=[];this.items=[];this.firebars=[];
    for(const[row,runs]of Object.entries(WORLD34_ROWS))for(const[first,last,id]of runs){
      const y=Number(row);
      if(id===98&&y===13){this.floors.push({x:first,y,w:last-first+1,h:2,type:'ground',castleTile:98});continue;}
      if(id===98&&y===14||id===135)continue;
      if(id===134){this.lava.push({x:first,y,w:last-first+1,h:15.5-y});continue;}
      for(let x=first;x<=last;x++){
        if(id===98||id===196){const b=this.makeBlock(x,y,'solid');b.castleTile=id;b.pivot=id===196;this.blocks.push(b);}
        else if(id===82)this.blocks.push(this.makeBlock(x,y,'brick'));
        else if(id===192||id===193)this.blocks.push(this.makeBlock(x,y,'question',id===193?'mushroom':'coin'));
        else if(id===194)this.items.push(this.makeCoin(x+.125,y+.125));
        else if(id===137)this.bridge.push({x,y,w:1,h:1,visualHeight:.5,type:'bridge',removed:false,fallTime:0});
        else if(id===197)this.axe={x,y,w:1,h:1,triggered:false};
      }
    }
    for(const[x,y,direction]of[[19,11,-1],[24,11,-1],[29,11,-1],[54,5,-1],[54,11,1],[64,5,-1],[64,11,1],[80,5,1],[80,11,-1]])this.firebars.push({x:x+.5,y:y+.5,anchorX:x,anchorY:y,angle:-Math.PI/2,angularVelocity:direction*NES_HZ*40/256/32*Math.PI*2,count:6,spacing:.5,radius:.23,active:false,balls:[]});
    this.updateFirebars(0,false);
    this.podoboos=[16,26,88,97,103,109].map((x,n)=>({id:'podoboo34-'+n,x,y:16.125,w:1,h:1,vy:0,active:false,hidden:true,phase:'wait',timer:21/NES_HZ,slot:n,clock:0,trail:[],jumps:0}));
    this.boss.disguise='buzzy';this.flameGenerator.x=103;
  }

  createWorld41() {
    this.area='overworld41';this.worldWidth=250;this.time=400;this.flagX=225;this.castleX=231;this.flagY=3;
    this.floors=[[0,32],[34,44],[82,67],[151,23],[177,3],[182,8],[192,58]].map(([x,w])=>({x,y:13,w,h:2,type:'ground'}));
    this.blocks=[];this.items=[];this.shots=[];this.effects=[];this.platforms=[];this.treetops=[];this.clouds=[];this.vines=[];this.bridge=[];this.ponds=[];
    for(const[row,runs]of Object.entries(WORLD41_ROWS))for(const[first,last,id]of runs)for(let x=first;x<=last;x++){
      const y=Number(row);
      if(id===194){this.items.push(this.makeCoin(x+.125,y+.125));continue;}
      if(id===96&&!this.world41OneUpAvailable)continue;
      const content=({88:'multi',96:'1up',192:'coin',193:'mushroom'})[id]||null;
      const type=id===97?'solid':id===96?'hidden':id===192||id===193?'question':'brick';
      const b=this.makeBlock(x,y,type,content);b.world41OneUp=id===96;if(x===232&&y===12)b.castleStop=true;this.blocks.push(b);
    }
    this.pipes=[[21,10],[116,9],[132,9],[163,11]].map(([x,y])=>({x,y,w:2,h:13-y,type:'pipe',enter:x===132,exit:x===163,action:x===132?'bonus41':null}));
    this.enemies=this.pipes.map(p=>this.makePiranha(p));
    this.lakituSpawner=this.makeLakituSpawner();
    this.camera=this.checkpoint?96:0;
    Object.assign(this.player,{x:this.checkpoint?98.5:2.5,y:13-this.player.h,vx:0,vy:0,grounded:true,hidden:false,supportPlatform:null});
  }

  makeLakituSpawner() {
    return {active:false,timer:0,reappear:0,serial:0,stopX:222,stopped:false,triggers:[14,112,193].map(x=>({x,y:2.5,seen:false}))};
  }

  saveWorld41() {
    this.savedWorld41={area:this.area,worldWidth:this.worldWidth,flagX:this.flagX,castleX:this.castleX,flagY:this.flagY,floors:this.floors,blocks:this.blocks,pipes:this.pipes,enemies:this.enemies,items:this.items,camera:this.camera};
  }

  createBonus41() {
    this.area='bonus41';this.worldWidth=32;this.camera=0;this.flagX=null;this.castleX=null;this.lakituSpawner=null;
    this.floors=[{x:0,y:13,w:32,h:2,type:'ground'}];this.blocks=[];this.enemies=[];this.items=[];this.shots=[];this.effects=[];this.platforms=[];
    for(const[row,runs]of Object.entries(WORLD41_BONUS_ROWS))for(const[first,last,id]of runs)for(let x=first;x<=last;x++){
      const y=Number(row);if(id===194)this.items.push(this.makeCoin(x+.125,y+.125));else this.blocks.push(this.makeBlock(x,y,'brick',id===90?'mushroom':null));
    }
    this.pipes=[{x:13,y:11,w:2,h:2,type:'pipe',horizontal:true,exit:true},{x:15,y:2,w:2,h:11,type:'pipe',exit:true}];
    Object.assign(this.player,{x:1.7,y:3,vx:0,vy:0,grounded:false,supportPlatform:null});
    this.emit('area',this.player,{area:this.area,level:this.level});
  }

  restoreWorld41() {
    const p=this.player,saved=this.savedWorld41,remaining=this.time;
    if(saved)Object.assign(this,saved);else this.createWorld41();
    this.savedWorld41=null;this.time=remaining;this.shots=[];this.effects=[];this.state='pipe';this.stateTime=0;this.jumpBuffer=0;
    // Reloading an area clears its sprite/frenzy slots. The remaining encoded
    // Lakitu at193 starts the next pursuit after the underground shortcut.
    this.enemies=this.pipes.filter(q=>q.x>=155).map(q=>this.makePiranha(q));
    this.lakituSpawner=this.makeLakituSpawner();for(const trigger of this.lakituSpawner.triggers)if(trigger.x<155)trigger.seen=true;
    this.camera=Math.max(this.camera,163-this.viewWidth*.36);this.checkpoint=98.5;
    Object.assign(p,{x:163.6,y:11,vx:0,vy:0,grounded:false,supportPlatform:null,hidden:false});
    this.emergeTargetY=11;this.pipeMode='emerge12';this.emit('area',p,{area:this.area,level:this.level});
  }

  lakituSlots() {
    return this.enemies.filter(e=>!e.removed&&e.active&&e.x>=this.camera-(e.kind==='piranha'?1:4.5));
  }

  spawnLakitu(x,y=2,respawn=false) {
    const s=this.lakituSpawner;
    const e={...this.makeEnemy('lakitu',x,y+1.5),id:'lakitu41-'+s.serial++,y,w:1,h:1.5,vx:0,vy:0,active:true,sourceDirection:0,sourceSpeed:0,motionClock:0,throwPose:false,throwTimer:0};
    this.enemies.push(e);s.active=true;s.reappear=0;this.emit('lakitu-appear',e,{respawn});return e;
  }

  updateLakituSpawner(dt) {
    const s=this.lakituSpawner;if(!s||!['overworld41','overworld61','overworld82'].includes(this.area))return;
    // Pipe plants share the five ordinary sprite slots with Lakitu and eggs.
    // A pipe whose parser cannot find a slot does not manufacture a sixth.
    for(const e of this.enemies)if(e.kind==='piranha'&&!e.removed){
      if(e.x<this.camera-1){e.removed=true;continue;}
      if(!e.active&&e.x<this.camera+this.viewWidth+.75){if(this.lakituSlots().length<5)e.active=true;else e.removed=true;}
    }
    if(!s.stopped&&this.camera+this.viewWidth>=s.stopX){s.stopped=true;s.active=false;for(const e of this.enemies)if(e.kind==='lakitu'&&!e.dead&&!e.removed){e.departing=true;e.throwPose=false;e.throwTimer=0;}this.emit('lakitu-leave',{x:s.stopX,y:2});}
    if(s.stopped)return;
    for(const trigger of s.triggers){
      if(trigger.seen||trigger.x>=this.camera+this.viewWidth+.75)continue;
      trigger.seen=true;
      if(trigger.x>=this.camera&&!s.active&&this.lakituSlots().length<5)this.spawnLakitu(trigger.x,trigger.y);
    }
    if(!s.active)return;
    s.timer=Math.max(0,s.timer-dt);if(s.timer>0||this.lakituSlots().length>=5)return;
    s.timer=128/NES_HZ;
    const lakitu=this.enemies.find(e=>e.kind==='lakitu'&&!e.removed);
    if(!lakitu){if(++s.reappear>=7)this.spawnLakitu(this.camera+this.viewWidth+2,2,true);return;}
    if(lakitu.dead||this.player.y<44/16)return;
    const egg={...this.makeEnemy('spiny',lakitu.x,lakitu.y+1),id:'spiny41-'+s.serial++,y:lakitu.y-.5,w:1,h:1.5,vx:0,vy:-3*NES_HZ/16,active:true,egg:true,eggAngle:0,slot:this.lakituSlots().length};
    // SmallBBox overwrites the computed horizontal speed in the NES routine.
    // Eggs therefore launch straight upward; retain that original behavior.
    this.enemies.push(egg);lakitu.throwTimer=s.timer;lakitu.throwPose=false;
    this.emit('spiny-throw',egg,{ownerId:lakitu.id});
  }

  lakituHitbox(e) {return{x:e.x+2/16,y:e.y+9/16,w:12/16,h:12/16};}
  spinyHitbox(e) {return{x:e.x+3/16,y:e.y+14/16,w:10/16,h:6/16};}

  updateLakitu(e,dt,p,priorFeet) {
    e.throwTimer=this.lakituSpawner?.timer||0;e.throwPose=!e.departing&&!!this.lakituSpawner?.active&&e.throwTimer<16/NES_HZ;e.motionClock+=dt*NES_HZ;
    while(e.motionClock>=1-1e-10){
      e.motionClock=Math.max(0,e.motionClock-1);
      if(e.departing){e.facing=-1;e.sourceDirection=0;e.sourceSpeed=16;e.vx=-NES_HZ/16;e.x-=1/16;continue;}
      const difference=(e.x-p.x)*16,distance=Math.min(60,Math.floor(Math.abs(difference))),wanted=difference<0?1:0;
      let braking=false;
      if(Math.abs(difference)>=60&&wanted!==e.sourceDirection){
        if(e.sourceDirection===1&&--e.sourceSpeed!==0)braking=true;else e.sourceDirection=wanted;
      }
      if(!braking){
        let offset=0;
        if(e.sourceDirection===1&&p.vx!==0&&this.scrollAmount41>0){offset=1;if(p.vx*256/NES_HZ>=25&&this.scrollAmount41>=2)offset=2;}
        e.sourceSpeed=[21,48,64][offset]-Math.floor(distance/4)-1;
      }
      e.facing=e.sourceDirection?1:-1;e.vx=e.facing*e.sourceSpeed*NES_HZ/256;e.x+=e.vx/NES_HZ;
    }
    e.walk+=Math.abs(e.vx)*dt;
    if(e.x<this.camera-4.5||e.x>this.camera+this.viewWidth+4.5){e.removed=true;return;}
    const body=this.lakituHitbox(e);if(this.state!=='playing'||!overlap(p,body))return;
    if(p.star>0)this.killEnemy(e,'star');else if(p.vy>0&&priorFeet<=body.y+.4)this.stomp(e);else this.hurt();
  }

  updateSpiny(e,dt,p) {
    e.eggAngle+=dt*12;
    e.vy=Math.min(3*NES_HZ/16,e.vy+(e.egg?32:61)/256*NES_HZ**2/16*dt);
    let motion;
    if(e.egg&&e.y<37/16){e.x+=e.vx*dt;e.y+=e.vy*dt;motion={hitSide:false,landed:false};}
    else motion=this.move(e,dt);
    if(motion.hitSide)e.vx*=-1;
    if(e.egg&&motion.landed){
      e.egg=false;e.facing=this.levelRandom.frame%8===0?1:p.x<e.x?-1:1;e.vx=e.facing*8*NES_HZ/256;this.emit('spiny-hatch',e);
    }
    if(e.stunned&&motion.landed){e.stunned=false;e.flipped=false;e.facing=this.levelRandom.frame&1?-1:1;e.vx=e.facing*8*NES_HZ/256;this.emit('spiny-recover',e);}
    if(e.vx)e.facing=e.vx<0?-1:1;e.walk+=Math.abs(e.vx)*dt;
    if(e.y>16||e.x<this.camera-4.5||!e.egg&&e.x>this.camera+this.viewWidth+4.5){e.removed=true;return;}
    for(const other of this.enemies)if(other!==e&&other.kind==='spiny'&&other.active&&!other.dead&&!other.removed&&e.x<other.x&&overlap(this.spinyHitbox(e),this.spinyHitbox(other))){e.vx=-Math.abs(e.vx);other.vx=Math.abs(other.vx);}
    if(this.state==='playing'&&overlap(p,this.spinyHitbox(e))){if(p.star>0)this.killEnemy(e,'star');else this.hurt();}
  }

  createWorld31() {
    this.area='overworld31';this.worldWidth=225;this.time=400;this.flagX=200;this.castleX=206;this.flagY=3;
    this.floors=[[0,45],[48,29],[85,1],[88,40],[132,10],[144,33],[180,45]].map(([x,w])=>({x,y:13,w,h:2,type:'ground'}));
    this.blocks=[];this.items=[];this.shots=[];this.effects=[];this.platforms=[];this.treetops=[];this.clouds=[];this.vines=[];this.hammers=[];
    for(const[row,runs]of Object.entries(WORLD31_ROWS))for(const[first,last,id]of runs)for(let x=first;x<=last;x++){
      if(id===96&&!this.world31OneUpAvailable)continue;
      const content=({86:'vine',87:'star',88:'multi',96:'1up',192:'coin',193:'mushroom'})[id]||null;
      const type=id===97?'solid':id===96?'hidden':id===192||id===193?'question':'brick';
      const b=this.makeBlock(x,Number(row),type,content);b.world31OneUp=id===96;this.blocks.push(b);
    }
    this.blocks.push({...this.makeBlock(207,12,'solid'),castleStop:true});
    this.pipes=[[32,10],[38,9],[57,10],[67,11],[103,9]].map(([x,y])=>({x,y,w:2,h:13-y,type:'pipe',enter:x===38,exit:x===67,action:x===38?'bonus31':null}));
    this.bridge=[{id:'bridge31',x:77,y:9,w:8,h:1,type:'bridge',load:0}];
    this.ponds=[{x:77,y:12,w:8,h:3},{x:86,y:12,w:2,h:3}];
    this.springboards=[{id:'spring31',x:126,y:11,w:1,h:2,baseY:13,restY:11,compression:0,phase:'idle',active:true,type:'spring',elapsed:0,boosted:false,launched:false}];
    this.enemies=[];
    for(const[x,feet]of[[37,13],[53,13],[54.5,13],[56,13],[82,9],[83.5,9],[85,9],[94,13],[95.5,13],[139,9],[140,8],[154,13],[155.5,13],[157,13]])this.enemies.push(this.makeEnemy('goomba',x,feet));
    for(const[x,feet]of[[65,13],[101,13],[149,13],[152,5],[170,8],[188,7],[191,5]])this.enemies.push(this.makeEnemy('koopa',x,feet));
    for(const[x,feet]of[[25,13],[28,12],[165,13],[168,12],[171,13]])this.enemies.push({...this.makeEnemy('koopa',x,feet),winged:true,jumping:true,vx:-NES_HZ/32,flightPhase:0,hopVelocity:-3*NES_HZ/16,hopGravity:0x1c/256*NES_HZ**2/16});
    for(const[x,feet]of[[113,9],[116,13]])this.enemies.push({...this.makeEnemy('hammerbro',x,feet),id:'hammerbro31-'+x,y:feet-1.5,h:1.5,vx:0,homeX:x,throwPose:false,throwTimer:0,throwSerial:0,jumpTimer:0,jumpPassTimer:0,walkingTimer:128*21/NES_HZ,jumping:false,slot:x===113?0:1});
    for(const pipe of this.pipes)this.enemies.push(this.makePiranha(pipe));
    this.camera=this.checkpoint?96:0;
    Object.assign(this.player,{x:this.checkpoint?98.5:2.5,y:13-this.player.h,vx:0,vy:0,grounded:true,hidden:false,supportPlatform:null,climbing:false,vineId:null,springRider:null,springFlight:false});
  }

  createWorld32() {
    this.area='overworld32';this.worldWidth=234;this.time=300;this.flagX=209;this.castleX=215;this.flagY=3;
    this.floors=[[0,80],[82,41],[125,3],[130,104]].map(([x,w])=>({x,y:13,w,h:2,type:'ground'}));
    this.blocks=[];this.items=[];this.shots=[];this.effects=[];this.platforms=[];this.scales=[];this.treetops=[];this.clouds=[];this.vines=[];
    for(const[row,runs]of Object.entries(WORLD32_ROWS))for(const[first,last,id]of runs)for(let x=first;x<=last;x++){
      const y=Number(row);if(id===194){this.items.push(this.makeCoin(x+.125,y+.125));continue;}
      this.blocks.push(this.makeBlock(x,y,id===97?'solid':id===193?'question':'brick',({87:'star',88:'multi',193:'mushroom'})[id]||null));
    }
    this.blocks.push({...this.makeBlock(216,12,'solid'),castleStop:true});
    this.pipes=[{x:169,y:10,w:2,h:3,type:'pipe'}];
    this.enemies=[];
    for(const x of[24,25.5,27,71,72.5,74,119,120.5,122,179,180.5,182,188,189.5,191])this.enemies.push(this.makeEnemy('goomba',x,13));
    for(const x of[17,33,34.5,36,43,44.5,66,78,111,134,140,141.5,143,150,151.5,162,163.5,165,175])this.enemies.push(this.makeEnemy('koopa',x,13));
    this.enemies.push({...this.makeEnemy('koopa',92,13),winged:true,jumping:true,vx:-NES_HZ/32,flightPhase:0,hopVelocity:-3*NES_HZ/16,hopGravity:0x1c/256*NES_HZ**2/16});
    this.enemies.push(this.makePiranha(this.pipes[0]));
    this.camera=this.checkpoint?96:0;
    Object.assign(this.player,{x:this.checkpoint?98.5:2.5,y:13-this.player.h,vx:0,vy:0,grounded:true,hidden:false,supportPlatform:null});
  }

  createWorld33() {
    this.area='treetops33';this.worldWidth=177;this.time=300;this.flagX=151;this.castleX=156;this.flagY=3;
    this.floors=[[0,16],[144,33]].map(([x,w])=>({x,y:13,w,h:2,type:'ground'}));
    this.treetops=WORLD33_TREES.map(([x,y,w])=>({x,y,w,h:1,type:'treetop',trunkX:x+1,trunkWidth:w-2}));
    this.blocks=[this.makeBlock(49,3,'question','mushroom'),this.makeBlock(151,12,'solid'),... [157,159].map(x=>({...this.makeBlock(x,12,'solid'),castleStop:true}))];
    this.pipes=[];this.shots=[];this.effects=[];this.clouds=[];this.vines=[];this.items=WORLD33_COINS.map(([x,y])=>this.makeCoin(x+.125,y+.125));
    this.platforms=[[30,4],[33,8],[94,9],[96,5],[103,11],[132,6]].map(([x,y])=>({id:'night-lift-'+x,x,y,w:3,h:13/16,visualHeight:.375,solidSides:true,axis:'x',motion:'horizontal-oscillate',originX:x,min:x-3.28125,max:x,phase:0,motionFrame:0,primary:0,secondary:0,active:false,dx:0,dy:0,vx:0,vy:0}));
    this.platforms.push({id:'night-drop-60',x:60,y:6,w:3,h:13/16,visualHeight:.375,solidSides:true,motion:'drop',active:false,dx:0,dy:0,vx:0,vy:0,load:0,falling:false});
    this.scales=[];
    for(const[index,leftX,leftY,rightX,rightY]of[[0,81,5.875,88,7.875],[1,136,4.875,140,7.875]]){
      const id='night-scale-'+index,pan=(side,x,y)=>({id:id+'-'+side,x,y,w:3,h:13/16,visualHeight:.375,solidSides:true,motion:'balance',scaleId:id,side,active:false,dx:0,dy:0,vx:0,vy:0,load:0,broken:false,removed:false});
      const left=pan('left',leftX,leftY),right=pan('right',rightX,rightY);
      this.platforms.push(left,right);this.scales.push({id,left,right,topY:2.5,leftX:leftX+1.5,rightX:rightX+1.5,sumY:leftY+rightY,active:false,broken:false,velocity:0,bonusAwarded:false});
    }
    for(const platform of this.platforms)platform.playerOnly=true;
    this.enemies=[this.makeEnemy('goomba',26,7)];
    for(const[x,feet]of[[52,7],[54,11],[73,13],[124,10],[126,10]])this.enemies.push({...this.makeEnemy('koopa',x,feet),red:true,smart:true});
    this.enemies.push({...this.makeEnemy('koopa',114,5.9),red:true,smart:true,winged:true,flightMinY:4.5,flightMaxY:10.5,flightCenter:7.5,flightAcceleration:3/256*NES_HZ**2/16,flightMaxSpeed:2*NES_HZ/16,flightPhase:0,vx:0,vy:0});
    this.camera=this.checkpoint?64:0;
    Object.assign(this.player,{x:this.checkpoint?66.5:2.5,y:13-this.player.h,vx:0,vy:0,grounded:true,hidden:false,supportPlatform:null});
  }

  saveWorld31() {
    this.savedWorld31={area:this.area,worldWidth:this.worldWidth,flagX:this.flagX,castleX:this.castleX,flagY:this.flagY,floors:this.floors,blocks:this.blocks,pipes:this.pipes,enemies:this.enemies,items:this.items,platforms:this.platforms,treetops:this.treetops,clouds:this.clouds,vines:this.vines,springboards:this.springboards,bridge:this.bridge,ponds:this.ponds,camera:this.camera};
  }

  restoreWorld31(from='pipe') {
    const p=this.player,saved=this.savedWorld31,remaining=this.time;
    if(saved)Object.assign(this,saved);else this.createWorld31();
    this.savedWorld31=null;this.time=remaining;this.shots=[];this.hammers=[];this.effects=[];this.state='playing';this.stateTime=0;this.jumpBuffer=0;
    Object.assign(p,{vx:0,vy:0,climbing:false,vineId:null,springRider:null,springFlight:false,supportPlatform:null,hidden:false,grounded:false});
    if(from==='sky'){
      this.camera=Math.min(160,this.worldWidth-this.viewWidth);p.x=162.5;p.y=2-p.h;p.invincible=Math.max(p.invincible,.5);this.checkpoint=98.5;
      this.emit('sky-return',p,{level:this.level});
    }else{
      this.camera=Math.max(this.camera,67-this.viewWidth*.36);p.x=67.6;p.y=11;
      this.emergeTargetY=11;this.pipeMode='emerge12';this.state='pipe';
    }
    this.emit('area',p,{area:this.area,level:this.level});
  }

  createBonus31() {
    this.area='bonus31';this.worldWidth=32;this.camera=0;this.flagX=null;this.castleX=null;
    this.floors=[{x:0,y:13,w:32,h:2,type:'ground'}];this.blocks=[];this.enemies=[];this.items=[];this.shots=[];this.hammers=[];this.effects=[];this.platforms=[];this.bridge=[];this.ponds=[];this.vines=[];this.springboards=[];
    for(const[row,runs]of Object.entries(WORLD31_BONUS_ROWS))for(const[first,last,id]of runs)for(let x=first;x<=last;x++){
      const y=Number(row);if(id===194)this.items.push(this.makeCoin(x+.125,y+.125));else this.blocks.push(this.makeBlock(x,y,'brick',id===90?'mushroom':null));
    }
    this.pipes=[{x:13,y:11,w:2,h:2,type:'pipe',horizontal:true,exit:true},{x:15,y:2,w:2,h:11,type:'pipe',exit:true}];
    Object.assign(this.player,{x:1.7,y:3,vx:0,vy:0,grounded:false,supportPlatform:null});
    this.emit('area',this.player,{area:this.area,level:this.level});
  }

  createSky31() {
    this.area='sky31';this.worldWidth=104;this.camera=0;this.flagX=null;this.castleX=null;
    this.floors=[];this.blocks=[];this.pipes=[];this.enemies=[];this.shots=[];this.hammers=[];this.effects=[];this.treetops=[];this.springboards=[];this.bridge=[];this.ponds=[];
    this.clouds=WORLD31_SKY_CLOUDS.map(([x,y,w])=>({x,y,w,h:1,type:'cloud'}));
    this.items=WORLD31_SKY_COINS.map(([x,y])=>this.makeCoin(x+.125,y+.125));
    this.platforms=[{id:'cloud-ride31',kind:'cloud',motion:'cloud-transport',x:16,y:10,w:3,h:.5,active:false,started:false,vx:0,vy:0,dx:0,dy:0}];
    this.vines=[{id:'sky-vine31',x:4.35,y:15,w:.3,h:0,baseY:15,maxHeight:6,growing:true,growth:0,active:true}];
    Object.assign(this.player,{x:3.5,y:17-this.player.h,vx:0,vy:0,grounded:false,hidden:false,climbing:true,vineId:'sky-vine31',supportPlatform:null});
    this.state='sky-enter';this.stateTime=0;this.skyEntryPhase='grow';
    this.emit('area',this.player,{area:this.area,level:this.level});
  }

  updateLevelRandom(dt) {
    if(!['2-4','3-1','3-4','4-1','4-2','4-3','4-4','5-1','5-2'].includes(this.level))return;
    const r=this.levelRandom;r.clock+=dt*NES_HZ;
    while(r.clock>=1){r.clock--;r.frame++;let carry=((r.bytes[0]^r.bytes[1])&2)?1:0;for(let n=0;n<7;n++){const next=r.bytes[n]&1;r.bytes[n]=(r.bytes[n]>>1)|(carry<<7);carry=next;}}
  }

  updatePodoboos(dt) {
    for(const e of this.podoboos){
      if(!e.active&&e.x<this.camera+this.viewWidth+.75)e.active=true;
      if(!e.active)continue;
      e.clock+=dt;e.timer-=dt;
      if(e.timer<=0){const seed=this.levelRandom.bytes[e.slot+1];e.timer=((seed&15)|6)*21/NES_HZ;e.y=16.125;e.vy=(-7+(seed|128)/256)*NES_HZ/16;e.phase='rise';e.jumps++;e.trail=[];this.emit('podoboo-leap',e);}
      e.vy=Math.min(3*NES_HZ/16,e.vy+28/256*NES_HZ**2/16*dt);e.y+=e.vy*dt;e.hidden=e.y>=15.5;
      e.phase=e.hidden?'wait':e.vy<0?'rise':'fall';
      e.trail.unshift({x:e.x+.5,y:e.y+.5});if(e.trail.length>10)e.trail.pop();
      if(!e.hidden&&this.state==='playing'&&overlap(this.player,{x:e.x+3/16,y:e.y+14/16,w:10/16,h:6/16}))this.hurt();
    }
  }

  spawnHammer(e) {
    const random=this.levelRandom.bytes[1],slot=(random&7)||(random&8);
    if(this.hammers.some(h=>!h.removed&&h.slot===slot))return false;
    this.hammers.push({id:e.id+'-'+e.throwSerial++,ownerId:e.id,slot,x:e.x+2/16,y:e.y-10/16,w:.5,h:.5,vx:0,vy:0,angle:0,age:0,held:true,holdTimer:15/NES_HZ,removed:false});
    e.throwPose=true;this.emit('hammer-ready',e);return true;
  }

  updateHammerBro(e,dt,p,priorFeet) {
    e.throwTimer=Math.max(0,e.throwTimer-dt);e.jumpTimer=Math.max(0,e.jumpTimer-dt);e.jumpPassTimer=Math.max(0,e.jumpPassTimer-dt);e.walkingTimer=Math.max(0,e.walkingTimer-dt);
    const seed=this.levelRandom.bytes[e.slot+1];
    if(e.jumpTimer<=0&&!e.jumping){
      const screenY=e.y*16;const velocity=screenY>=128?-6:screenY<112?-3:(seed&1)?-3:-6;
      e.vy=velocity*NES_HZ/16;e.jumping=true;e.grounded=false;e.jumpPassTimer=(this.world6484&&screenY<112&&(seed&1)?55:32)/NES_HZ;e.jumpTimer=(seed|192)/NES_HZ;this.emit('hammerbro-jump',e);
    }else if(e.throwTimer<=0&&e.x>this.camera-.8&&e.x<this.camera+this.viewWidth){e.throwTimer=(this.world6484?28:48)/NES_HZ;this.spawnHammer(e);}
    e.facing=p.x>e.x?1:-1;e.vx=(this.levelRandom.frame&64?-4:4)*NES_HZ/256;
    if(e.facing<0&&e.walkingTimer<=0)e.vx=-8*NES_HZ/256;
    const oldX=e.x,oldFeet=e.y+e.h;e.x+=e.vx*dt;
    if(e.grounded)for(const b of this.nearbyColliders(e))if(overlap(e,b)){if(e.vx>0&&oldX+e.w<=b.x+.15)e.x=b.x-e.w;else if(e.vx<0&&oldX>=b.x+b.w-.15)e.x=b.x+b.w;}
    e.vy=Math.min(3*NES_HZ/16,e.vy+61/256*NES_HZ**2/16*dt);e.y+=e.vy*dt;e.grounded=false;
    if(e.vy>=0&&e.jumpPassTimer<=0)for(const b of this.nearbyColliders(e))if(e.x+e.w>b.x&&e.x<b.x+b.w&&oldFeet<=b.y+.13&&e.y+e.h>=b.y){e.y=b.y-e.h;e.vy=0;e.grounded=true;e.jumping=false;}
    e.walk+=Math.abs(e.vx)*dt;
    if(e.y>17||e.x<this.camera-3){e.removed=true;return;}
    const body={x:e.x+4/16,y:e.y+4/16,w:8/16,h:24/16};
    if(this.state!=='playing'||!overlap(p,body))return;
    if(p.star>0){this.killEnemy(e,'star');return;}
    if(p.vy>0&&priorFeet<=body.y+.4){this.stomp(e);return;}
    this.hurt();
  }

  updateHammers(dt) {
    for(const h of this.hammers){
      if(h.removed)continue;h.age+=dt;
      if(h.held){
        const e=this.enemies.find(e=>e.id===h.ownerId)||(this.boss?.id===h.ownerId?this.boss:null);
        if(!e||e.removed||e.dead){h.removed=true;continue;}
        h.x=e.x+2/16;h.y=e.y-10/16;h.holdTimer-=dt;
        if(h.holdTimer<=0){h.held=false;h.vx=e.facing*NES_HZ/16;h.vy=-2*NES_HZ/16;e.throwPose=false;this.emit('hammer-throw',h);}
      }else{
        h.vy=Math.min(4*NES_HZ/16,h.vy+16/256*NES_HZ**2/16*dt);h.x+=h.vx*dt;h.y+=h.vy*dt;h.angle+=dt*14;
        const contact=this.state==='playing'&&overlap(this.player,h);
        if(contact&&!h.contact){h.vx*=-1;this.hurt();}h.contact=contact;
      }
      if(h.y>17||h.x<this.camera-3||h.x>this.camera+this.viewWidth+5)h.removed=true;
    }
    this.hammers=this.hammers.filter(h=>!h.removed);
  }

  createWorld21() {
    this.area='overworld21';this.worldWidth=225;this.time=400;this.flagX=200;this.castleX=206;this.flagY=3;
    this.floors=[[0,92],[96,10],[109,30],[142,10],[154,71]].map(([x,w])=>({x,y:13,w,h:2,type:'ground'}));
    this.blocks=[];this.items=[];this.shots=[];this.effects=[];this.platforms=[];this.treetops=[];this.clouds=[];this.vines=[];
    for(const[row,runs]of Object.entries(WORLD21_ROWS))for(const[first,last,id]of runs)for(let x=first;x<=last;x++){
      if(id===96&&!this.world21OneUpAvailable)continue;
      const content=({85:'mushroom',86:'vine',87:'star',88:'multi',95:'coin',96:'1up',192:'coin',193:'mushroom'})[id]||null;
      const type=id===97?'solid':id===95||id===96?'hidden':id===192||id===193?'question':'brick';
      const b=this.makeBlock(x,Number(row),type,content);b.world21OneUp=id===96;this.blocks.push(b);
    }
    this.pipes=[[46,9],[74,9],[103,9],[115,11],[122,9],[126,10],[130,8],[176,10]].map(([x,y])=>({x,y,w:2,h:13-y,type:'pipe',enter:x===103,exit:x===115,action:x===103?'bonus21':null}));
    this.springboards=[{id:'spring21',x:188,y:11,w:1,h:2,baseY:13,restY:11,compression:0,phase:'idle',active:true,type:'spring',elapsed:0,boosted:false,launched:false}];
    this.enemies=[];
    for(const[x,feet]of[[24,7],[42,13],[43.5,13],[59,13],[60.5,13],[68,13],[69.5,13],[71,13],[87,13],[88.5,13],[90,13],[103,9],[116,11],[120,13],[162,13],[163.5,13]])this.enemies.push(this.makeEnemy('goomba',x,feet));
    for(const[x,feet]of[[32,13],[33,13],[55,9],[66,13],[137,13],[185,13]])this.enemies.push(this.makeEnemy('koopa',x,feet));
    for(const x of[151,169,171])this.enemies.push({...this.makeEnemy('koopa',x,13),winged:true,jumping:true,vx:-NES_HZ/32,flightPhase:0,hopVelocity:-3*NES_HZ/16,hopGravity:0x1c/256*NES_HZ**2/16});
    for(const pipe of this.pipes)this.enemies.push(this.makePiranha(pipe));
    this.camera=this.checkpoint?96:0;
    Object.assign(this.player,{x:this.checkpoint?98.5:2.5,y:13-this.player.h,vx:0,vy:0,grounded:true,hidden:false,supportPlatform:null,climbing:false,vineId:null,springRider:null,springFlight:false});
  }

  saveWorld21() {
    this.savedWorld21={area:this.area,worldWidth:this.worldWidth,flagX:this.flagX,castleX:this.castleX,flagY:this.flagY,floors:this.floors,blocks:this.blocks,pipes:this.pipes,enemies:this.enemies,items:this.items,platforms:this.platforms,treetops:this.treetops,clouds:this.clouds,vines:this.vines,springboards:this.springboards,camera:this.camera};
  }

  restoreWorld21(from='pipe') {
    const p=this.player,saved=this.savedWorld21,remaining=this.time;
    if(saved)Object.assign(this,saved);else this.createWorld21();
    this.savedWorld21=null;this.time=remaining;this.shots=[];this.effects=[];this.state='playing';this.stateTime=0;this.jumpBuffer=0;
    Object.assign(p,{vx:0,vy:0,climbing:false,vineId:null,springRider:null,springFlight:false,supportPlatform:null,hidden:false,grounded:false});
    if(from==='sky'){
      this.camera=Math.min(160,this.worldWidth-this.viewWidth);p.x=162.5;p.y=2-p.h;p.invincible=Math.max(p.invincible,.5);this.checkpoint=98.5;
      this.emit('sky-return',p);
    }else{
      this.camera=Math.max(this.camera,115-this.viewWidth*.36);p.x=115.6;p.y=11;
      this.emergeTargetY=11;this.pipeMode='emerge12';this.state='pipe';
    }
    this.emit('area',p,{area:this.area,level:this.level});
  }

  createSky21() {
    this.area='sky21';this.worldWidth=88;this.camera=0;this.flagX=null;this.castleX=null;
    this.floors=[];this.blocks=[];this.pipes=[];this.enemies=[];this.shots=[];this.effects=[];this.treetops=[];this.springboards=[];
    this.clouds=[[0,4],[5,57]].map(([x,w])=>({x,y:13,w,h:1,type:'cloud'}));
    this.items=WORLD21_SKY_COINS.map(([x,y])=>this.makeCoin(x+.125,y+.125));
    this.platforms=[{id:'cloud-ride21',kind:'cloud',motion:'cloud-transport',x:16,y:10,w:3,h:.5,active:false,started:false,vx:0,vy:0,dx:0,dy:0}];
    this.vines=[{id:'sky-vine21',x:4.35,y:15,w:.3,h:0,baseY:15,maxHeight:6,growing:true,growth:0,active:true}];
    Object.assign(this.player,{x:3.5,y:17-this.player.h,vx:0,vy:0,grounded:false,hidden:false,climbing:true,vineId:'sky-vine21',supportPlatform:null});
    this.state='sky-enter';this.stateTime=0;this.skyEntryPhase='grow';
    this.emit('area',this.player,{area:this.area,level:this.level});
  }

  growVines(dt) {
    for(const v of this.vines){
      if(!v.growing)continue;
      v.h=Math.min(v.maxHeight,v.h+NES_HZ/32*dt);v.y=v.baseY-v.h;v.growth=v.h/v.maxHeight;
      if(v.h>=v.maxHeight-1e-6){v.h=v.maxHeight;v.y=v.baseY-v.h;v.growing=false;}
    }
  }

  updateVineEntry(dt) {
    const p=this.player;this.stateTime+=dt;this.growVines(dt);
    if(this.state==='vine-enter'){
      p.y-=.875*NES_HZ/16*dt;p.walk+=dt*3;
      if(p.y+p.h<.25){if(this.level==='4-2'){this.saveNewMain();this.createSky42();}else if(this.level==='5-2'){this.saveNewMain();this.createSky52();}else if(this.level==='6-2'){this.saveWorld62({target:'sky62',returnX:162.5});this.createSky62();}else if(this.level==='3-1'){this.saveWorld31();this.createSky31();}else{this.saveWorld21();this.createSky21();}}
      return;
    }
    const vine=this.vines[0];
    if(this.skyEntryPhase==='grow'){if(!vine.growing)this.skyEntryPhase='climb';}
    else if(this.skyEntryPhase==='climb'){
      p.y-=.875*NES_HZ/16*dt;p.walk+=dt*3;
      if(p.y+p.h<11.5625){p.climbing=false;p.vineId=null;this.skyEntryPhase='step';}
    }else{
      p.x=Math.min(4.5,p.x+2.8*dt);p.walk+=2.8*dt;
      if(p.x>=4.5){if(!['sky42','sky52','sky62'].includes(this.area))this.clouds.push({x:4,y:13,w:1,h:1,type:'cloud'});this.state='playing';this.stateTime=0;this.jumpBuffer=0;this.emit('vine-exit',p);}
    }
  }

  updateVines(dt,input) {
    this.growVines(dt);const p=this.player;
    let v=this.vines.find(v=>v.id===p.vineId);
    const jumpOff=input.jumpOff||input.jump&&!input.up;
    if(p.climbing&&v){
      if(jumpOff&&this.jumpBuffer>0){
        p.climbing=false;p.vineId=null;p.vx=(input.left?-1:1)*5.8;p.facing=input.left?-1:1;p.vy=-14;p.vineGrace=.22;this.jumpBuffer=0;this.emit('vine-jump',p);return false;
      }
      const direction=(input.down?1:0)-(input.up?1:0);
      p.x=v.x-p.w*.75;p.vx=0;p.vy=0;p.grounded=false;p.supportPlatform=null;
      p.y+=direction*(direction<0?.875:1.99609375)*NES_HZ/16*dt;p.y=clamp(p.y,v.y-.4,v.baseY-p.h);p.walk+=Math.abs(direction)*dt*3;
      this.jumpBuffer=0;
      if(['overworld21','overworld31','underground42','overworld52','overworld62'].includes(this.area)&&p.y+p.h<4&&input.up){this.state='vine-enter';this.stateTime=0;this.emit('vine-climb',p);}
      else if(input.down&&p.y+p.h>=v.baseY-.01){p.climbing=false;p.vineId=null;p.vineGrace=.2;}
      return true;
    }
    p.vineGrace=Math.max(0,(p.vineGrace||0)-dt);
    if(p.vineGrace||jumpOff||!(input.up||input.down))return false;
    v=this.vines.find(v=>v.active&&v.h>.5&&Math.abs((p.x+p.w/2)-(v.x+v.w/2))<.25&&p.y+p.h>v.y+.15&&p.y<v.baseY);
    if(!v)return false;
    p.climbing=true;p.vineId=v.id;p.vx=0;p.vy=0;p.grounded=false;p.supportPlatform=null;this.jumpBuffer=0;this.emit('vine-grab',p);return true;
  }

  beginSpring(spring) {
    if(spring.phase!=='idle')return;
    spring.phase='compress';spring.elapsed=0;spring.boosted=false;spring.launched=false;
    this.player.springRider=spring.id;this.player.vx=0;this.player.vy=0;this.player.springFlight=false;this.jumpBuffer=0;
    this.emit('spring-compress',spring);
  }

  updateSprings(dt,input) {
    const p=this.player;let controlled=false;
    for(const s of this.springboards){
      if(s.phase==='idle')continue;
      s.elapsed+=dt;const frame=s.elapsed*NES_HZ;
      if(p.springRider===s.id)this.jumpBuffer=0;
      const poses=[.5,1,.5,0],index=frame<3?0:frame<7?1:frame<11?2:3;
      s.compression=poses[index];s.y=s.restY+s.compression;s.h=s.baseY-s.y;s.phase=index<2?'compress':'release';
      if(p.springRider===s.id){
        if(index===3&&!s.launched){
          s.launched=true;p.springRider=null;p.grounded=false;p.supportPlatform=null;p.springFlight=true;
          p.vy=-(s.boosted?12:7)*NES_HZ/16;p.y=s.restY-p.h;this.coyote=0;this.jumpBuffer=0;
          this.emit('spring-release',s,{boosted:s.boosted});
        }else{
          p.y=s.y-p.h;p.vx=0;p.vy=0;p.grounded=true;p.supportPlatform=null;controlled=true;
        }
      }
      if(frame>=15){s.phase='idle';s.compression=0;s.y=s.restY;s.h=2;}
    }
    return controlled;
  }


  createIntro22() {
    this.createIntro12('intro22');
    this.worldWidth=24;this.floors[0].w=24;
  }

  createWorld22() {
    this.area='underwater22';this.worldWidth=206;this.time=400;this.flagX=null;this.castleX=null;
    this.floors=[[0,66],[71,60],[140,17],[164,42]].map(([x,w])=>({x,y:13,w,h:2,type:'ground',submerged:true}));
    this.blocks=[];this.shots=[];this.effects=[];this.platforms=[];this.treetops=[];this.bridge=[];this.clouds=[];this.vines=[];this.springboards=[];
    for(const[row,runs]of Object.entries(WORLD22_ROWS))for(const[first,last]of runs)for(let x=first;x<=last;x++)this.blocks.push({...this.makeBlock(x,Number(row),'solid'),submerged:true});
    this.corals=WORLD22_CORALS.map(c=>({...c,type:'coral'}));
    this.currents=[[65,7],[130,11],[156,9]].map(([x,w],index)=>({id:'current22-'+index,x,y:2,w,h:14,center:x+w/2,active:false}));
    this.pipes=[{x:189,y:7,w:1,h:2,type:'pipe',horizontal:true,action:'exit22',submerged:true}];
    this.items=WORLD22_COINS.map(([x,y])=>this.makeCoin(x+.125,y+.125));
    // The encoded Blooper at column71 is consumed inside the stone wall by
    // the original parser. Hard-mode-only entries are not part of this run.
    this.enemies=[[22,11],[46,9],[55,10],[83,8],[94,3],[105,11]].map(([x,y])=>({
      kind:'blooper',type:'blooper',x,y,w:.92,h:1.5,vx:0,vy:0,facing:-1,walk:0,active:false,dead:false,removed:false,
      deathTimer:0,kickGrace:0,phase:'pulse',pulse:0,swimPhase:0,swimSpeed:0,moveCounter:0,frameClock:0,frame:0,sinkTimer:0,slot:null
    }));
    this.fishSpawner=this.makeFishSpawner('swim',[[80,true],[96,true],[192,false]]);
    this.camera=this.checkpoint?80:0;
    Object.assign(this.player,{x:this.checkpoint?82.5:2.5,y:(this.checkpoint?13:2)-this.player.h,vx:0,vy:0,grounded:!!this.checkpoint,hidden:false,supportPlatform:null,
      climbing:false,vineId:null,springRider:null,springFlight:false,crouching:false,swimming:true,swimStroke:0,swimPhase:0,swimTimer:0,swimHeld:false,current:false});
    if(this.state!=='title'&&!this.checkpoint){this.state='water-enter';this.stateTime=0;}
  }

  createExit22() {
    this.area='exit22';this.worldWidth=47;this.camera=0;this.flagX=22;this.castleX=28;this.flagY=3;
    this.floors=[{x:0,y:13,w:47,h:2,type:'ground'}];this.blocks=[];this.items=[];this.shots=[];this.effects=[];this.platforms=[];this.corals=[];this.currents=[];this.fishSpawner=null;
    for(let x=5;x<=13;x++)for(let y=13-Math.min(8,x-4);y<13;y++)this.blocks.push(this.makeBlock(x,y,'solid'));
    this.blocks.push(this.makeBlock(22,12,'solid'));
    this.pipes=[{x:3,y:11,w:2,h:2,type:'pipe',exit:true}];this.enemies=[this.makePiranha(this.pipes[0])];
    Object.assign(this.player,{x:3.6,y:11,vx:0,vy:0,grounded:false,swimming:false,current:false,swimStroke:0,supportPlatform:null});
    this.emergeTargetY=11;this.pipeMode='emerge12';this.state='pipe';this.stateTime=0;
    this.emit('splash',this.player);this.emit('area',this.player,{area:this.area,level:this.level});
  }

  createWorld23() {
    this.area='bridges23';this.worldWidth=251;this.time=300;this.flagX=225;this.castleX=232;this.flagY=3;
    this.floors=[[0,7],[207,44]].map(([x,w])=>({x,y:13,w,h:2,type:'ground'}));
    this.blocks=[];this.pipes=[];this.enemies=[];this.shots=[];this.effects=[];this.platforms=[];this.clouds=[];this.vines=[];this.springboards=[];this.corals=[];this.currents=[];
    for(const[row,runs]of Object.entries(WORLD23_ROWS))for(const[first,last,id]of runs)for(let x=first;x<=last;x++)this.blocks.push(this.makeBlock(x,Number(row),id===193?'question':'solid',id===193?'mushroom':null));
    this.bridge=WORLD23_BRIDGES.map((b,index)=>({...b,id:'bridge23-'+index,type:'bridge',load:0}));
    this.treetops=WORLD23_TREES.map(t=>({...t,type:'treetop',trunkX:t.x+1,trunkWidth:t.w-2}));
    this.items=WORLD23_COINS.map(([x,y])=>this.makeCoin(x+.125,y+.125));
    this.fishSpawner=this.makeFishSpawner('fly',[[26,true],[137,true],[197,false]]);
    this.camera=this.checkpoint?112:0;
    Object.assign(this.player,{x:this.checkpoint?114.5:2.5,y:13-this.player.h,vx:0,vy:0,grounded:true,hidden:false,supportPlatform:null,swimming:false,current:false});
  }

  makeFishSpawner(kind,commands) {
    return {kind,commands,nextCommand:0,active:false,timer:0,frameClock:0,frame:0,random:[0xa5,0,0,0,0,0,0],filter:0,serial:0};
  }

  updateFishSpawner(dt) {
    const f=this.fishSpawner;if(!f)return;
    f.frameClock+=dt*NES_HZ;
    while(f.frameClock>=1){
      f.frameClock--;f.frame++;
      let carry=((f.random[0]^f.random[1])&2)?1:0;
      for(let n=0;n<7;n++){const next=f.random[n]&1;f.random[n]=(f.random[n]>>1)|(carry<<7);carry=next;}
    }
    while(f.nextCommand<f.commands.length&&this.camera+24>=f.commands[f.nextCommand][0]){
      f.active=f.commands[f.nextCommand][1];f.nextCommand++;
    }
    f.timer=Math.max(0,f.timer-dt);
    // Original aquatic and flying-fish frenzies use only the first three
    // object slots. A nearby Blooper can occupy one of those slots too.
    const occupied=()=>new Set(this.enemies.filter(e=>e.active&&!e.removed).map(e=>e.slot));
    if(f.kind==='swim')for(const e of this.enemies){
      if(e.kind!=='blooper'||e.active||e.removed||e.x>=this.camera+this.viewWidth+.75)continue;
      const slots=occupied(),slot=[0,1,2,3,4].find(n=>!slots.has(n));
      if(slot!==undefined){e.slot=slot;e.active=true;}
    }
    if(!f.active||f.timer>0)return;
    const slots=occupied(),slot=[0,1,2].find(n=>!slots.has(n));if(slot===undefined)return;
    const seed=f.random[slot],seed2=f.random[slot+1],seed3=f.random[slot+2];
    const e={kind:'cheep',type:'cheep',x:0,y:0,w:.92,h:.9,vx:0,vy:0,facing:-1,walk:0,active:true,dead:false,removed:false,deathTimer:0,kickGrace:0,slot,swimPhase:0,serial:f.serial++,flying:f.kind==='fly',red:true};
    if(f.kind==='swim'){
      if(f.filter===255)f.filter=0;
      let index=seed&7;while(f.filter&(1<<index))index=(index+1)&7;f.filter|=1<<index;
      e.x=this.camera+this.viewWidth+2;e.y=SWIM_FISH_Y[index]/16+.5;e.baseY=e.y;e.red=seed>=0xaa;
      e.vx=-(e.red?.5:.25)*NES_HZ/16;e.swimDir=(seed&16)?1:-1;
      f.timer=32/NES_HZ;
    }else{
      const p=this.player,still=Math.abs(p.vx)<.01;
      const group=still?0:p.vx<0||p.vx>=25*NES_HZ/256?8:4;
      let index=group+(seed&3);if(still&&(seed2&3))index=seed3&15;
      e.vx=FLY_FISH_SPEED[group+(seed&3)]*NES_HZ/256;
      e.facing=1;if(still&&(index&2)){e.vx=-e.vx;e.facing=-1;}
      e.x=p.x+(index&2?1:-1)*FLY_FISH_X[index]/16;e.y=16;e.vy=-5*NES_HZ/16;
      f.timer=FLY_FISH_WAIT[seed2&3]/NES_HZ;this.emit('fish-leap',e);
    }
    this.enemies.push(e);
  }

  updateSwimming(dt,input) {
    const p=this.player;
    p.swimPhase+=dt;p.swimStroke=Math.max(0,p.swimStroke-dt);p.swimTimer=Math.max(0,p.swimTimer-dt);
    const oldCurrent=p.current;
    for(const c of this.currents)c.active=p.x>=c.x&&p.x<=c.x+c.w;
    const current=this.currents.find(c=>c.active);p.current=!!current;
    if(p.current&&!oldCurrent)this.emit('current-enter',p);
    const controllable=p.y+p.h<15;
    const direction=controllable?Number(input.right)-Number(input.left):0;
    if(p.crouching){p.y-=.9;p.h=1.9;p.crouching=false;}
    const speed=(p.grounded?1:1.5)*NES_HZ/16,friction=152/256*NES_HZ**2/256;
    if(direction){p.facing=direction;p.vx=approach(p.vx,direction*speed,friction*(Math.sign(p.vx)&&Math.sign(p.vx)!==direction?2:1)*dt);}
    else if(p.grounded)p.vx=approach(p.vx,0,friction*dt);
    this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    if(controllable&&this.jumpBuffer>0&&(p.grounded||p.swimTimer>0||p.vy>=0)){
      this.jumpBuffer=0;p.grounded=false;p.swimTimer=32/NES_HZ;p.swimStroke=.28;p.swimHeld=true;
      p.vy=-(current?1:1.5)*NES_HZ/16;
      if(p.y+p.h<3.25)p.vy=0;
      this.emit('swim',p);
    }
    if(!input.jump)p.swimHeld=false;
    const force=p.y+p.h<3.25?24:p.vy<0&&p.swimHeld?(current?4:13):(current?9:10);
    p.vy=Math.min(4*NES_HZ/16,p.vy+force/256*NES_HZ**2/16*dt);
    this.move(p,dt,true);p.walk+=Math.abs(p.vx)*dt;
    if(current){
      p.vy=Math.min(NES_HZ/16,p.vy+16/256*NES_HZ**2/16*dt);
      const oldSpeed=p.vx;p.vx=(current.center>p.x?1:-1)*NES_HZ/32;
      this.move(p,dt,true);p.vx=oldSpeed;
    }
    // Surface strokes are suppressed by the original threshold. Clamp only
    // the upper edge, preserving the initial automatic drop into the water.
    if(p.y+p.h<3.25&&p.vy<0){p.y=3.25-p.h;p.vy=0;}
  }

  aquaticHitbox(e) {
    return {x:e.x+3/16,y:e.y+(e.kind==='blooper'?14:6)/16,w:10/16,h:6/16};
  }

  updateAquaticEnemy(e,dt,p,priorFeet) {
    e.swimPhase+=dt;e.walk+=dt*3;
    if(e.kind==='blooper'){
      e.frameClock+=dt*NES_HZ;
      while(e.frameClock>=1){
        e.frameClock--;e.frame++;
        const random=this.fishSpawner?.random[(e.slot||0)+1]??1;
        if((random&(this.secondaryHardMode?3:63))===0)e.facing=e.slot%2?(p.vx<0?-1:1):(e.x>p.x?-1:1);
        if(e.phase==='pulse'){
          if((e.frame&7)===0){
            if(e.moveCounter===0){e.swimSpeed++;if(e.swimSpeed>=2)e.moveCounter=1;}
            else{e.swimSpeed--;if(e.swimSpeed<=0){e.phase='sink';e.sinkTimer=42/NES_HZ;}}
          }
          e.y=Math.max(2,e.y-e.swimSpeed/16);e.x+=e.facing*e.swimSpeed/16;e.pulse=e.swimSpeed/2;
        }else{
          e.sinkTimer=Math.max(0,e.sinkTimer-1/NES_HZ);e.pulse=0;
          if(e.sinkTimer>0||e.y+1<p.y+p.h-2){if(!(e.frame&1))e.y+=1/16;}
          else{e.phase='pulse';e.moveCounter=0;e.swimSpeed=0;}
        }
      }
    }else if(e.flying){
      e.vy=Math.min(5*NES_HZ/16,e.vy+13/256*NES_HZ**2/16*dt);e.x+=e.vx*dt;e.y+=e.vy*dt;
      e.facing=e.vx<0?-1:1;
    }else{
      e.x+=e.vx*dt;
      if(e.slot===2){e.y+=e.swimDir*NES_HZ/128*dt;if(e.y>=e.baseY+15/16){e.y=e.baseY+15/16;e.swimDir=-1;}if(e.y<=e.baseY-15/16){e.y=e.baseY-15/16;e.swimDir=1;}}
    }
    if(e.x<this.camera-3||e.y>17||(e.flying&&e.x>this.camera+this.viewWidth+8)){e.removed=true;return;}
    const body=this.aquaticHitbox(e);
    if(this.state!=='playing'||!overlap(p,body))return;
    if(p.star>0){this.killEnemy(e,'star');return;}
    if(e.flying&&p.vy>0&&priorFeet<=body.y+.4){this.stomp(e);return;}
    this.hurt();
  }

  createWorld14() {
    this.area='castle';this.worldWidth=160;this.time=300;this.flagX=null;this.castleX=null;this.checkpoint=0;
    this.blocks=[];this.floors=[];this.pipes=[];this.enemies=[];this.items=[];this.shots=[];this.effects=[];this.treetops=[];
    this.lava=[];this.bridge=[];this.firebars=[];this.bossFlames=[];this.castleEnding=null;this.camera=0;
    for(const [row,runs]of Object.entries(WORLD14_ROWS))for(const [first,last,id]of runs){
      const y=Number(row);
      if(id===98&&y===13){this.floors.push({x:first,y,w:last-first+1,h:2,type:'ground',castleTile:98});continue;}
      if(id===98&&y>=14)continue;
      if(id===134){this.lava.push({x:first,y,w:last-first+1,h:15.5-y});continue;}
      if(id===135)continue;
      for(let x=first;x<=last;x++){
        if(id===98||id===196){const b=this.makeBlock(x,y,'solid');b.castleTile=id;b.pivot=id===196;this.blocks.push(b);}
        else if(id===95)this.blocks.push(this.makeBlock(x,y,'hidden','coin'));
        else if(id===193)this.blocks.push(this.makeBlock(x,y,'question','mushroom'));
        else if(id===137)this.bridge.push({x,y,w:1,h:1,visualHeight:.5,type:'bridge',removed:false,fallTime:0});
        else if(id===197)this.axe={x,y,w:1,h:1,triggered:false};
      }
    }
    for(const[x,y,direction]of[[30,10,-1],[49,6,-1],[60,6,-1],[67,6,-1],[76,9,-1],[84,9,-1],[88,4,1]]){
      this.firebars.push({x:x+.5,y:y+.5,anchorX:x,anchorY:y,angle:-Math.PI/2,angularVelocity:direction*60.0988*40/256/32*Math.PI*2,count:6,spacing:.5,radius:.23,active:false,balls:[]});
    }
    this.updateFirebars(0,false);
    this.platforms=[{id:'castle-lift',x:138,y:6,w:2,h:.5,axis:'x',motion:'horizontal-oscillate',originX:138,min:134.71875,max:138,phase:0,motionFrame:0,primary:0,secondary:0,active:false,dx:0,dy:0,vx:0,vy:0}];
    this.boss={kind:'bowser',type:'bowser',x:135,y:8,w:2,h:2,homeX:135,vx:0,vy:0,facing:-1,health:5,active:false,dead:false,removed:false,grounded:true,phase:'patrol',mouthOpen:false,fireTimer:255/NES_HZ,jumpTimer:32/NES_HZ,walkTimer:0,hitFlash:0,defeatCause:null,revealedKind:null,breathIndex:0,jumpIndex:0,walkIndex:0,walkDirection:1,motionFrame:0,motionPhase:0,firstStep:true,walkDistance:33/16};
    this.flameGenerator={x:104,active:false,timer:223/NES_HZ,count:0};
    this.toad={x:153,y:11.5,w:1,h:1.5};
    Object.assign(this.player,{x:2.5,y:7-this.player.h,vx:0,vy:0,grounded:true,hidden:false,supportPlatform:null});
  }

  updateFirebars(dt,collide=true) {
    const p=this.player;
    for(const bar of this.firebars){
      if(!bar.active&&bar.x<this.camera+this.viewWidth+.75)bar.active=true;
      if(bar.active)bar.angle=(bar.angle+bar.angularVelocity*dt)%(Math.PI*2);
      bar.balls=Array.from({length:bar.count},(_,i)=>({x:bar.x+Math.cos(bar.angle)*bar.spacing*i,y:bar.y+Math.sin(bar.angle)*bar.spacing*i,r:bar.radius}));
      if(!collide||!bar.active||bar.x<this.camera-3||this.state!=='playing')continue;
      for(const ball of bar.balls){
        const dx=ball.x-clamp(ball.x,p.x+.04,p.x+p.w-.04),dy=ball.y-clamp(ball.y,p.y+.05,p.y+p.h-.03);
        if(dx*dx+dy*dy<ball.r*ball.r){this.hurt();break;}
      }
    }
  }

  spawnBossFlame(fromBoss=true) {
    const b=this.boss;
    if(!b||b.dead||this.state!=='playing')return;
    const index=fromBoss?b.breathIndex:this.flameGenerator.count;
    const targetY=[9,8,7,9][index%4];
    const x=fromBoss?b.x-.875:Math.min(134+this.castleRoomOffset,this.camera+this.viewWidth+.4);
    const y=fromBoss?b.y+.5:targetY;
    this.bossFlames.push({x,y,w:1.5,h:.5,vx:-(this.secondaryHardMode?1.375:1.25)*NES_HZ/16,vy:0,targetY,age:0,removed:false,hitbox:{x:x+.375,y:y+.25,w:.25,h:.25}});
    this.emit('boss-fire',{x,y,w:1.5,h:.5});
  }

  defeatBoss(cause='fire') {
    const b=this.boss;if(!b||b.dead)return false;
    b.health=0;b.dead=true;b.phase='fall';b.defeatCause=cause;b.mouthOpen=false;b.vx=0;b.vy=cause==='axe'?0:-5;b.grounded=false;
    if(cause==='fire'){b.revealedKind=b.disguise||'goomba';this.addScore(5000,b.x,b.y);}
    else if(cause==='star')this.addScore(200,b.x,b.y);
    this.emit('boss-defeat',b,{cause});return true;
  }

  updateBoss(dt,collide=true) {
    const b=this.boss,p=this.player;if(!b||b.removed)return;
    if(b.dead){b.vy+=25*dt;b.y+=b.vy*dt;if(b.y>16)b.removed=true;return;}
    if(!b.active&&b.x<this.camera+this.viewWidth+1)b.active=true;
    if(!b.active)return;
    b.hitFlash=Math.max(0,b.hitFlash-dt);b.walkTimer+=dt;b.fireTimer-=dt;
    b.facing=p.x>b.x+b.w?1:-1;
    b.mouthOpen=b.fireTimer<32/NES_HZ;
    if(b.fireTimer<=0){this.spawnBossFlame(true);b.breathIndex++;b.fireTimer+=(BOWSER_BREATHS[b.breathIndex%8]+(this.secondaryHardMode?16:32))/NES_HZ;}
    if(b.grounded)b.jumpTimer-=dt;
    if(b.grounded&&b.jumpTimer<=0){b.vy=-2*NES_HZ/16;b.grounded=false;b.jumpTimer=BOWSER_WAITS[b.jumpIndex++%4]/NES_HZ;}
    // Retain the NES four-frame walking cadence and original displacement
    // choices, with deterministic choices so a route can be replayed exactly.
    b.motionPhase+=dt*NES_HZ;let dx=0;
    while(b.motionPhase>=1){
      if((b.motionFrame&3)===0){
        const previous=b.x+dx;dx+=b.walkDirection*(b.firstStep?2:1)/16;
        const next=b.x+dx;
        if((previous<b.homeX&&next>=b.homeX)||(previous>b.homeX&&next<=b.homeX))b.walkDistance=BOWSER_WAITS[++b.walkIndex%4]/16;
        if((b.walkDirection>0&&next>=b.homeX+b.walkDistance)||(b.walkDirection<0&&next<=b.homeX-b.walkDistance)){b.walkDirection*=-1;b.firstStep=false;}
      }
      b.motionFrame++;b.motionPhase-=1;
    }
    b.vx=dx/dt;b.vy=Math.min(2*NES_HZ/16,b.vy+15/256*NES_HZ**2/16*dt);
    const motion=this.move(b,dt);if(motion.hitSide)b.walkDirection*=-1;
    b.phase=b.grounded?'patrol':'jump';
    if(collide&&this.state==='playing'&&overlap(p,{x:b.x+.2,y:b.y+.18,w:b.w-.35,h:b.h-.18})){
      if(p.star>0)this.defeatBoss('star');else this.hurt();
    }
  }

  updateCastle(dt) {
    if(!['castle','castle24','castle34','castle44','castle54'].includes(this.area)&&!this.newAreaInfo?.castleArea)return;
    this.updateFirebars(dt);this.updatePodoboos(dt);
    if(this.state!=='playing')return;
    const p=this.player;
    // Original lava metatiles have no collision. They are lethal pits through
    // the ordinary below-screen death check, even with a star or fire power.
    const inLava=this.lava.some(pool=>overlap(p,pool));
    if(inLava&&!p.inLava)this.emit('lava',p);p.inLava=inLava;
    if(this.axe&&!this.axe.triggered&&p.vy>=0&&[p.x+3/16,p.x+12/16].some(x=>x>=this.axe.x&&x<this.axe.x+1)&&p.y+p.h>=this.axe.y&&p.y+p.h<this.axe.y+1){this.beginCastleEnd();return;}
    const generator=this.flameGenerator;
    if(generator&&!this.boss?.dead){
      if(this.camera+this.viewWidth>=generator.x)generator.active=true;
      if(generator.active&&!this.boss.active){generator.timer-=dt;if(generator.timer<=0){this.spawnBossFlame(false);generator.count++;generator.timer+=(BOWSER_BREATHS[generator.count%8]+(this.secondaryHardMode?16:32))/NES_HZ;}}
    }
    this.updateBoss(dt);
    for(const flame of this.bossFlames){
      if(flame.removed)continue;flame.age+=dt;flame.x+=flame.vx*dt;flame.y=approach(flame.y,flame.targetY,NES_HZ/16*dt);
      flame.hitbox={x:flame.x+.375,y:flame.y+.25,w:.25,h:.25};
      if(flame.x<this.camera-2||flame.age>9)flame.removed=true;
      else if(this.state==='playing'&&overlap(p,flame.hitbox))this.hurt();
    }
    this.bossFlames=this.bossFlames.filter(f=>!f.removed);
  }

  beginCastleEnd() {
    if((!['castle','castle24','castle34','castle44','castle54'].includes(this.area)&&!this.newAreaInfo?.castleArea)||this.state!=='playing'||this.axe.triggered)return false;
    this.axe.triggered=true;this.state='castle-end';this.stateTime=0;
    Object.assign(this.player,{x:Math.max(this.player.x,141.2+this.castleRoomOffset),y:9-this.player.h,vx:0,vy:0,grounded:true,facing:1,invincible:0});
    const defeated=!!this.boss?.dead;
    this.castleEnding={phase:defeated?'walk':'collapse',time:0,totalTime:0,removedSegments:0,messageProgress:0,messageTime:0};
    this.bossFlames=[];this.shots=[];this.podoboos=[];if(this.boss)this.boss.mouthOpen=false;
    this.emit('axe',this.axe);return true;
  }

  updateCastleEnd(dt) {
    const end=this.castleEnding,p=this.player,b=this.boss;if(!end)return;
    end.time+=dt;end.totalTime+=dt;this.stateTime+=dt;
    if(end.phase==='collapse'){
      // The axe and chain take the first two four-frame deletion steps.
      const count=Math.min(this.bridge.length,Math.max(0,Math.floor(end.time*60.0988/4)-2));
      while(end.removedSegments<count){
        const piece=this.bridge[this.bridge.length-1-end.removedSegments];piece.removed=true;piece.fallTime=0;end.removedSegments++;
        this.emit('bridge-snap',piece,{index:end.removedSegments});
      }
      for(const piece of this.bridge)if(piece.removed)piece.fallTime+=dt;
      if(end.removedSegments===this.bridge.length){this.defeatBoss('axe');end.phase='fall';end.time=0;}
    }else if(end.phase==='fall'){
      this.updateBoss(dt,false);
      if(!b||b.removed||b.y>=14){end.phase='walk';end.time=0;}
    }else if(end.phase==='walk'){
      if(b?.dead&&!b.removed)this.updateBoss(dt,false);
      p.facing=1;p.vx=3;p.vy=Math.min(24,p.vy+47*dt);this.move(p,dt,true);p.walk+=3*dt;
      if(p.x>=150+this.castleRoomOffset){p.x=150+this.castleRoomOffset;p.vx=0;end.phase='message';end.time=0;end.messageTime=0;end.messageProgress=1;this.emit('rescue',this.princess||this.toad,{final:!!this.princess});}
    }else{
      end.messageTime+=dt;end.messageProgress=end.messageTime>=128/NES_HZ?3:1;
      if(end.messageTime>=5.8){this.state='won';this.emit('win');}
    }
    const finalCamera=Math.max(0,Math.min(144+this.castleRoomOffset,this.worldWidth-this.viewWidth));
    this.camera=Math.min(finalCamera,Math.max(this.camera,this.camera+(end.phase==='walk'||end.phase==='message'?NES_HZ*1.5/16*dt:0)));
  }

  createIntro12(area='intro12') {
    this.corals=[];this.currents=[];this.bridge=[];this.treetops=[];this.fishSpawner=null;this.player.swimming=false;
    this.area=area;this.worldWidth=30;this.camera=0;this.flagX=null;this.castleX=null;
    this.floors=[{x:0,y:13,w:30,h:2,type:'ground'}];this.blocks=[];this.items=[];this.shots=[];this.effects=[];this.enemies=[];this.platforms=[];
    this.pipes=[{x:10,y:11,w:2,h:2,type:'pipe',horizontal:true},{x:12,y:9,w:2,h:4,type:'pipe'}];
    Object.assign(this.player,{x:3,y:13-this.player.h,vx:2.8,vy:0,grounded:true,facing:1,hidden:false,supportPlatform:null});
    this.state='intro';this.stateTime=0;this.emit('area',this.player,{area:this.area,level:this.level});
  }

  createBonus12() {
    this.area='bonus12';this.worldWidth=17;this.camera=0;this.flagX=null;this.castleX=null;
    this.floors=[{x:0,y:13,w:17,h:2,type:'ground'}];this.blocks=[];this.enemies=[];this.items=[];this.shots=[];this.effects=[];this.platforms=[];
    const brick=(x,y,content=null)=>this.blocks.push(this.makeBlock(x,y,'brick',content,!content));
    for(let y=2;y<13;y++)brick(0,y);
    for(let x=3;x<=11;x++)brick(x,9);
    for(let x=3;x<=12;x++)for(let y=2;y<=5;y++)brick(x,y);
    brick(12,9,'multi');
    for(let x=13;x<=14;x++)for(let y=2;y<=10;y++)brick(x,y);
    this.pipes=[{x:13,y:11,w:2,h:2,type:'pipe',horizontal:true,exit:true},{x:15,y:0.5,w:2,h:12.5,type:'pipe',exit:true}];
    for(let x=3;x<=11;x++)this.items.push(this.makeCoin(x+.125,12.125));
    for(let x=4;x<=11;x++)this.items.push(this.makeCoin(x+.125,8.125));
    Object.assign(this.player,{x:1.7,y:3,vx:0,vy:0,grounded:false,supportPlatform:null});
    this.emit('area',this.player,{area:this.area,level:this.level});
  }

  createExit12() {
    this.area='exit12';this.worldWidth=35;this.camera=0;this.flagX=19;this.castleX=25;this.flagY=3;
    this.floors=[{x:0,y:13,w:35,h:2,type:'ground'}];this.blocks=[];this.items=[];this.shots=[];this.effects=[];this.platforms=[];
    for(let x=2;x<=10;x++)for(let y=13-Math.min(8,x-1);y<13;y++)this.blocks.push(this.makeBlock(x,y,'solid'));
    this.blocks.push(this.makeBlock(19,12,'solid'));
    this.pipes=[{x:0,y:11,w:2,h:2,type:'pipe',exit:true}];
    this.enemies=[this.makePiranha(this.pipes[0])];
    Object.assign(this.player,{x:0.6,y:11,vx:0,vy:0,grounded:false,supportPlatform:null});
    this.emergeTargetY=11;this.pipeMode='emerge12';this.state='pipe';this.stateTime=0;
    this.emit('area',this.player,{area:this.area,level:this.level});
  }

  makePiranha(pipe) {
    return {kind:'piranha',type:'piranha',x:pipe.x+.61,y:pipe.y+.1,w:.78,h:1.65,pipeY:pipe.y,pipeX:pipe.x,phase:0,extension:0,hidden:true,vx:0,vy:0,walk:0,active:false,dead:false,removed:false,deathTimer:0,kickGrace:0};
  }

  piranhaHitbox(e) {
    return e.invisibleSourcePlant?{x:e.pipeX+11/16,y:e.pipeY-1.5*e.extension+14/16,w:10/16,h:6/16}:e;
  }

  platformHasPlayer(platform) {
    const p=this.player;
    return p.grounded&&p.supportPlatform===platform.id&&p.x+p.w>platform.x&&p.x<platform.x+platform.w;
  }

  carryPlatformRiders(platform,wrapped=false) {
    for(const entity of [this.player,...this.enemies,...this.items])if(entity.grounded&&entity.supportPlatform===platform.id){
      if(platform.playerOnly&&entity!==this.player)continue;
      if(wrapped||platform.removed){entity.supportPlatform=null;entity.grounded=false;}
      else{entity.y+=platform.dy;entity.x+=platform.dx;}
    }
  }

  updateScales(dt) {
    const acceleration=5/256*NES_HZ**2/16,maxSpeed=3*NES_HZ/16;
    for(const scale of this.scales){
      const {left,right}=scale;
      scale.active=left.active&&right.active;
      left.dx=right.dx=left.dy=right.dy=0;
      if(!scale.active)continue;
      const leftLoaded=this.platformHasPlayer(left),rightLoaded=this.platformHasPlayer(right);
      left.load=approach(left.load,leftLoaded?1:0,dt*6);right.load=approach(right.load,rightLoaded?1:0,dt*6);
      const oldLeft=left.y,oldRight=right.y;
      if(scale.broken){
        // After the rope breaks, both boards fall independently and continue
        // to carry a standing rider. Leaving a board does not stop its fall.
        for(const pan of[left,right]){pan.vy=Math.min(maxSpeed,pan.vy+32/256*NES_HZ**2/16*dt);pan.y+=pan.vy*dt;if(pan.y>32)pan.removed=true;}
      }else if(left.y<=45/16||right.y<=45/16){
        const raisedLeft=left.y<=45/16;
        if(raisedLeft?rightLoaded:leftLoaded){
          scale.broken=true;scale.velocity=0;left.broken=right.broken=true;left.vy=right.vy=0;
          if(!scale.bonusAwarded){scale.bonusAwarded=true;this.addScore(1000,this.player.x,this.player.y);this.emit('scale-snap',this.player,{scaleId:scale.id});}
        }else{
          // An unloaded pair stops at the original two-pixel safety clamp.
          const raised=raisedLeft?left:right;
          raised.y=47/16;scale.sumY=left.y+right.y;scale.velocity=0;left.vy=right.vy=0;
        }
      }else{
        if(leftLoaded)scale.velocity=clamp(scale.velocity+acceleration*dt,-maxSpeed,maxSpeed);
        else if(rightLoaded)scale.velocity=clamp(scale.velocity-acceleration*dt,-maxSpeed,maxSpeed);
        else scale.velocity=approach(scale.velocity,0,acceleration*dt);
        left.y+=scale.velocity*dt;right.y=scale.sumY-left.y;left.vy=scale.velocity;right.vy=-scale.velocity;
      }
      left.dy=left.y-oldLeft;right.dy=right.y-oldRight;
      this.carryPlatformRiders(left);this.carryPlatformRiders(right);
    }
  }

  updatePlatforms(dt) {
    if(dt<=0)return;
    for(const platform of this.platforms)if(platform.motion&&!platform.active&&platform.x<this.camera+this.viewWidth+.75)platform.active=true;
    this.updateScales(dt);
    for(const platform of this.platforms) {
      if(platform.removed||platform.motion==='balance')continue;
      const beforeX=platform.x,beforeY=platform.y;
      if(platform.motion&&!platform.active){
        if(platform.x<this.camera+this.viewWidth+.75)platform.active=true;
        else{platform.dx=0;platform.dy=0;continue;}
      }
      let wrapped=false;
      if(platform.motion==='drop'){
        const loaded=this.platformHasPlayer(platform);
        platform.load=approach(platform.load,loaded?1:0,dt*6);
        if(loaded){
          if(!platform.falling)this.emit('drop-start',platform);
          platform.vy=Math.min(2*NES_HZ/16,platform.vy+127/256*NES_HZ**2/16*dt);platform.y+=platform.vy*dt;
        }
        platform.falling=loaded;
        if(platform.y>32)platform.removed=true;
      }else if(platform.motion==='small-lift'){
        const rawY=platform.y+platform.vy*dt;wrapped=rawY<0||rawY>=16;platform.y=(rawY+16)%16;platform.hidden=platform.y<2;
      }else if(platform.motion==='cloud-transport'){
        if(platform.started)platform.x+=platform.vx*dt;
        if(platform.x>this.camera+this.viewWidth+4.5){platform.removed=true;wrapped=true;}
      }else if(platform.motion==='vertical-oscillate'){
        platform.vy=clamp(platform.vy+(platform.y<platform.center?1:-1)*platform.acceleration*dt,-platform.maxSpeed,platform.maxSpeed);
        platform.y+=platform.vy*dt;
        if(platform.y<platform.min){platform.y=platform.min;platform.vy=Math.max(0,platform.vy);}
        if(platform.y>platform.max){platform.y=platform.max;platform.vy=Math.min(0,platform.vy);}
      }else if(platform.motion==='horizontal-oscillate'){
        // The original horizontal lift uses a four-frame velocity counter.
        // 0..14..0 speed ramps alternate left/right every 120 NTSC frames.
        platform.phase+=dt*60.0988;
        while(platform.phase>=1){
          if((platform.motionFrame&3)===0){
            if(!(platform.primary&1)){if(platform.secondary===14)platform.primary++;else platform.secondary++;}
            else{if(platform.secondary===0)platform.primary++;else platform.secondary--;}
            platform.primary&=3;
          }
          platform.x+=(platform.primary&2?1:-1)*platform.secondary/256;
          platform.motionFrame++;platform.phase-=1;
        }
        platform.vx=(platform.x-beforeX)/dt;
      }else{
        platform.y+=platform.vy*dt;
        if(platform.y>platform.loopMax){platform.y=platform.loopMin;wrapped=true;}
        if(platform.y<platform.loopMin){platform.y=platform.loopMax;wrapped=true;}
      }
      platform.dy=wrapped?0:platform.y-beforeY;platform.dx=wrapped?0:platform.x-beforeX;
      this.carryPlatformRiders(platform,wrapped);
    }
  }

  returnFromWarp() {
    if(this.state!=='warped')return false;
    const pipe=this.pipes.find(p=>p.warp===this.warpDestination);
    if(!pipe)return false;
    Object.assign(this.player,{x:pipe.x+(pipe.w-this.player.w)/2,y:pipe.y-this.player.h,vx:0,vy:0,grounded:true,hidden:false});
    this.state='playing';this.stateTime=0;this.inputBefore={};this.jumpBuffer=0;this.warpDestination=null;
    this.emit('area',this.player,{area:this.area,level:this.level});return true;
  }

  makeEnemy(kind, x, feet) {
    const h = kind === 'koopa' ? 1.4 : 0.95;
    return { kind, type: kind, x, y: feet - h, w: 0.92, h, vx: -1.25, vy: 0, facing: -1, walk: 0, active: false, grounded: false, dead: false, removed: false, deathTimer: 0, shellTimer: 0, kickGrace: 0 };
  }

  createUnderground(area='underground') {
    this.area = area;this.platforms=[];this.treetops=[];this.clouds=[];this.vines=[];this.springboards=[]; this.worldWidth = 17;
    this.camera = 0;
    this.floors = [{ x: 0, y: GROUND, w: 17, h: 2, type: 'ground' }];
    this.blocks = [];
    const brick = (x,y) => this.blocks.push({ x,y,w:1,h:1,type:'brick',content:null,used:false,removed:false,bump:0,bumpVelocity:0,unbreakable:true });
    for (let y = 2; y < 13; y++) brick(0,y);
    for (let x = 4; x <= 10; x++) { brick(x,2); for (let y = 10; y < 13; y++) brick(x,y); }
    this.pipes = [
      { x: 15, y: 2, w: 2, h: 11, enter: false, exit: true, type: 'pipe' },
      { x: 13, y: 11, w: 2, h: 2, enter: false, exit: true, horizontal: true, type: 'pipe' }
    ];
    this.enemies = []; this.items = []; this.shots = [];
    for (const height of [3.875,5.875]) for (let x = 4; x <= 10; x++) this.items.push({ kind:'coin',type:'coin',x:x+0.125,y:GROUND-height,w:0.7,h:0.8,vx:0,vy:0,age:0,removed:false });
    for (let x=5; x<=9; x++) this.items.push({ kind:'coin',type:'coin',x:x+0.125,y:GROUND-7.875,w:0.7,h:0.8,vx:0,vy:0,age:0,removed:false });
    Object.assign(this.player, { x: 1.7, y: 3, vx: 0, vy: 0, grounded: false });
    this.emit('area', this.player, { area: this.area });
  }

  addScore(points, x, y) {
    this.score += points;
    this.effects.push({ type:'score',kind:'score',x,y,w:0,h:0,text:String(points),life:0.9,vy:-1.2 });
  }

  collectCoin(subject, points = 200) {
    this.coins++;this.levelCoins++;
    this.addScore(points, subject.x, subject.y - 0.4);
    this.emit('coin', subject);
    if (this.coins >= 100) { this.coins -= 100; this.lives++; this.emit('1up', subject); }
  }

  nearbyColliders(entity, includeHidden = false) {
    return [...this.floors, ...this.pipes, ...this.blocks, ...this.treetops, ...this.bridge, ...this.clouds, ...this.springboards, ...this.corals, ...this.cannons].filter(b => !b.removed && (includeHidden || b.type !== 'hidden') && b.x < entity.x + entity.w + 1.1 && b.x + b.w > entity.x - 1.1);
  }

  move(entity, dt, isPlayer = false) {
    const oldX = entity.x, oldY = entity.y;
    let hitSide = false, landed = false, headBlock = null;
    entity.x += entity.vx * dt;
    const platformBodies=isPlayer?this.platforms.filter(p=>p.solidSides&&!p.removed&&p.x<entity.x+entity.w+1.1&&p.x+p.w>entity.x-1.1):[];
    for (const b of [...this.nearbyColliders(entity),...platformBodies]) {
      if (!overlap(entity,b)) continue;
      if (entity.vx > 0 && oldX + entity.w <= b.x + 0.15) { entity.x = b.x - entity.w; hitSide = true; }
      else if (entity.vx < 0 && oldX >= b.x + b.w - 0.15) { entity.x = b.x + b.w; hitSide = true; }
    }
    if (isPlayer && hitSide) entity.vx = 0;
    entity.grounded = false;
    entity.supportPlatform = null;
    const verticalVelocity = entity.vy;
    const headHits = [];
    entity.y += verticalVelocity * dt;
    for (const b of this.nearbyColliders(entity, isPlayer && verticalVelocity < 0)) {
      if (!overlap(entity,b)) continue;
      if (verticalVelocity >= 0 && oldY + entity.h <= b.y + 0.12 && b.type !== 'hidden') {
        entity.y = b.y - entity.h; entity.vy = 0; entity.grounded = true; landed = true;
        if(isPlayer&&b.type==='spring'&&b.phase==='idle')this.beginSpring(b);
      } else if (verticalVelocity < 0 && oldY >= b.y + b.h - 0.12) {
        headHits.push(b);
      }
    }
    if(verticalVelocity<0)for(const platform of platformBodies)if(overlap(entity,platform)&&oldY>=platform.y+platform.h-.12)headHits.push({...platform,type:'platform'});
    if(verticalVelocity>=0)for(const platform of this.platforms){
      if(platform.removed||platform.playerOnly&&!isPlayer||platform.motion==='small-lift'&&platform.y<2)continue;
      if(entity.x+entity.w<=platform.x+EPS||entity.x>=platform.x+platform.w-EPS)continue;
      if(oldY+entity.h<=platform.y+0.16&&entity.y+entity.h>=platform.y&&oldY+entity.h>=platform.y-0.5){
        entity.y=platform.y-entity.h;entity.vy=0;entity.grounded=true;entity.supportPlatform=platform.id;landed=true;
        if(isPlayer&&platform.motion==='cloud-transport'&&!platform.started){platform.started=true;platform.vx=NES_HZ/16;this.emit('cloud-ride',platform);}
      }
    }
    if (headHits.length) {
      headHits.sort((a,b) => Math.min(entity.x+entity.w,b.x+b.w)-Math.max(entity.x,b.x) - (Math.min(entity.x+entity.w,a.x+a.w)-Math.max(entity.x,a.x)));
      entity.y = Math.max(...headHits.map(b=>b.y+b.h)); entity.vy = 0;
      if (isPlayer && !['ground','pipe','treetop','bridge','cloud','spring','coral','platform','cannon'].includes(headHits[0].type)) headBlock = headHits[0];
    }
    if (headBlock) this.hitBlock(headBlock);
    return { hitSide, landed };
  }

  hitBlock(block) {
    if (block.used || block.type === 'solid') { block.bumpVelocity = -1.7; this.emit('bump',block); return; }
    if (block.type === 'hidden') block.type = 'question';
    block.bumpVelocity = -4.5;
    this.emit('bump',block);
    for (const e of this.enemies) {
      if (!e.dead && !e.removed && Math.abs(e.y + e.h - block.y) < 0.18 && e.x + e.w > block.x && e.x < block.x + 1) {
        if(e.buzzy){
          e.kind='shell';e.type='shell';e.y+=e.h-.8-2/16;e.h=.8;e.flipped=true;e.bumpStunned=true;e.shellTimer=(this.primaryHardMode?11:16)*21/NES_HZ;e.vy=-3*NES_HZ/16;e.vx=(e.x<this.player.x?-1:1)*NES_HZ/16;e.grounded=false;
          this.addScore(100,e.x,e.y);this.emit('buzzy-stun',e);
        }else if(e.kind==='spiny'){
          e.egg=false;e.stunned=true;e.flipped=true;e.y-=2/16;e.vy=-3*NES_HZ/16;e.vx=(e.x<this.player.x?-1:1)*NES_HZ/16;e.grounded=false;
          this.addScore(100,e.x,e.y);this.emit('spiny-stun',e);
        }else this.killEnemy(e,'bump');
      }
    }
    if (block.content === 'coin' || block.content === 'multi') {
      this.collectCoin(block);
      this.effects.push({ type:'coin',kind:'coin',x:block.x+0.2,y:block.y-0.4,w:0.6,h:0.75,life:0.55,vy:-5.2 });
      if (block.content === 'multi') { block.coinsLeft--; block.multiTimer ??= 4.5; if (block.coinsLeft <= 0 || block.multiTimer <= 0) block.used = true; }
      else block.used = true;
    } else if(block.content==='vine'){
      block.used=true;this.vines.push({id:'main-vine21',x:block.x+.35,y:block.y,w:.3,h:0,baseY:block.y,maxHeight:6,growing:true,growth:0,active:true});
      this.emit('vine-grow',block);
    } else if (block.content) {
      let kind = block.content;
      if (kind === 'mushroom' && this.player.big) kind = 'flower';
      this.items.push({ kind,type:kind,x:block.x+0.05,y:block.y+0.05,w:0.9,h:0.9,vx:kind==='flower'?0:2.2,vy:0,age:0,emerge:0.7,spawnY:block.y,grounded:false,removed:false });
      block.used = true;
      this.emit('emerge',block,{kind});
    } else if (block.type === 'brick' && this.player.big && !block.unbreakable) {
      block.removed = true; this.addScore(50,block.x,block.y); this.emit('break',block);
    }
  }

  hurt() {
    const p = this.player;
    if (p.invincible > 0 || p.star > 0 || this.state !== 'playing') return;
    if (p.big) {
      const feet = p.y+p.h;
      p.big=false; p.fire=false; p.h=1; p.y=feet-1; p.invincible=2; p.squash=0.15;
      this.emit('hurt',p);
    } else this.die();
  }

  die() {
    if (this.state !== 'playing') return;
    this.state='dead'; this.stateTime=0; this.lives--;
    Object.assign(this.player,{dead:true,vy:-11.5,vx:0,star:0});
    this.emit('death');
  }

  killEnemy(enemy, cause = 'fire', attackingShell = null) {
    if (enemy.dead || enemy.removed) return;
    enemy.dead=true; enemy.deathTimer=1.1; enemy.flipped=true; enemy.vy=-9; enemy.vx=cause==='shell'?(attackingShell?.vx<0?-5:5):2;
    let points=enemy.kind==='lakitu'&&cause==='stomp'?500:enemy.kind==='hammerbro'||cause==='shell-duel'?1000:['blooper','cheep','lakitu','spiny','bulletbill'].includes(enemy.kind)?200:cause==='shell'?200:100;
    if(cause==='shell'&&attackingShell){
      const chain=attackingShell.shellChain||0;attackingShell.shellChain=chain+1;
      if(chain>=SHELL_CHAIN_POINTS.length){
        points=0;this.lives++;this.effects.push({type:'score',kind:'score',x:enemy.x,y:enemy.y,w:0,h:0,text:'1UP',life:1.2,vy:-1});this.emit('1up',enemy,{cause:'shell-chain',chain:chain+1});
      }else points=SHELL_CHAIN_POINTS[chain];
    }
    if(points)this.addScore(points,enemy.x,enemy.y);
    this.emit('defeat',enemy,{cause,points,chain:attackingShell?.shellChain||0});
  }

  stomp(enemy) {
    if(enemy.kind==='spiny'){this.hurt();return;}
    const p=this.player;
    p.y=(enemy.kind==='lakitu'?this.lakituHitbox(enemy).y:enemy.y)-p.h; p.vy=-10.8; p.grounded=false; p.squash=0.2;
    if(enemy.kind==='hammerbro'||enemy.kind==='lakitu'){
      this.killEnemy(enemy,'stomp');
    } else if(enemy.kind==='cheep'&&enemy.flying){
      this.killEnemy(enemy,'stomp');
    } else if (enemy.kind==='goomba') {
      enemy.dead=true; enemy.deathTimer=0.5; enemy.flat=true; enemy.vx=0; enemy.vy=0;
      this.addScore(100,enemy.x,enemy.y);
    } else if (enemy.kind==='koopa'&&enemy.winged) {
      enemy.winged=false;enemy.vx=this.primaryHardMode?-3*NES_HZ/64:(this.world5363||this.world6484)?-NES_HZ/32:-1.25;enemy.vy=0;enemy.grounded=false;
      this.addScore(400,enemy.x,enemy.y);
    } else if (enemy.kind==='koopa') {
      enemy.kind='shell'; enemy.type='shell'; enemy.y+=enemy.h-0.8; enemy.h=0.8; enemy.vx=0; enemy.shellTimer=this.primaryHardMode?11*21/NES_HZ:(this.world5363||this.world6484)?16*21/NES_HZ:8;
      this.addScore(100,enemy.x,enemy.y);
    } else if (enemy.kind==='shell') {
      enemy.vx = Math.abs(enemy.vx)>0.1 ? 0 : (enemy.x+enemy.w/2>p.x+p.w/2?11:-11);
      enemy.kickGrace=0.12; enemy.shellTimer=this.primaryHardMode?11*21/NES_HZ:enemy.buzzy||this.world5363||this.world6484?16*21/NES_HZ:8;
    }
    this.emit('stomp',enemy);
  }

  beginPipe(mode, pipe) {
    this.state='pipe'; this.stateTime=0; this.pipeMode=mode; this.pipeReference=pipe;
    this.player.vx=0; this.player.vy=0;
    if (mode==='enter'||mode==='bonus12-enter'||mode==='bonus21-enter'||mode==='bonus31-enter'||mode==='bonus41-enter'||mode==='warp-enter'||mode==='new-bonus-enter'||mode==='bonus62-enter') this.player.x=pipe.x+(pipe.w-this.player.w)/2;
    this.emit('pipe');
  }

  update(dt, input = {}) {
    dt = Math.min(Math.max(Number(dt)||0,0),0.1);
    const current = {left:!!input.left,right:!!input.right,jump:!!input.jump,run:!!input.run,down:!!input.down,up:!!input.up,jumpOff:!!input.jumpOff,fire:!!input.fire};
    const jumpPressed=current.jump&&!this.inputBefore.jump||current.jumpOff&&!this.inputBefore.jumpOff;
    if(jumpPressed){
      this.jumpBuffer=.12;
      const spring=this.springboards.find(s=>s.id===this.player.springRider);
      if(spring&&spring.elapsed*NES_HZ>=3)spring.boosted=true;
    }
    const firePressed=current.fire && !this.inputBefore.fire;
    this.inputBefore=current;
    if (firePressed && this.state==='playing') this.shoot();
    this.accumulator+=dt;
    while (this.accumulator>=1/120) { this.step(1/120,current); this.accumulator-=1/120; }
  }

  shoot() {
    const p=this.player;
    if (!p.fire || p.fireCooldown>0 || this.shots.filter(s=>!s.removed).length>=2) return;
    p.fireCooldown=0.18;
    this.shots.push({x:p.x+(p.facing>0?p.w:-0.28),y:p.y+0.65,w:0.28,h:0.28,vx:p.facing*13,vy:0,life:3.5,removed:false});
    this.emit('fire');
  }

  step(dt,input) {
    this.clock+=dt; this.messageTimer=Math.max(0,this.messageTimer-dt);
    for(const effect of this.effects){effect.life-=dt;effect.y+=(effect.vy||0)*dt;if(effect.type==='coin')effect.vy+=16*dt;}
    this.effects=this.effects.filter(e=>e.life>0);
    for(const b of this.blocks){if(b.bump||b.bumpVelocity){b.bumpVelocity+=(-95*b.bump-12*b.bumpVelocity)*dt;b.bump+=b.bumpVelocity*dt;if(Math.abs(b.bump)<0.001&&Math.abs(b.bumpVelocity)<0.001){b.bump=0;b.bumpVelocity=0;}}if(b.multiTimer>0)b.multiTimer-=dt;}
    if(this.state==='title'||this.state==='gameover'||this.state==='won'||this.state==='warped')return;
    if(this.state==='dead'){
      this.stateTime+=dt;
      if(this.stateTime>0.18){this.player.vy+=32*dt;this.player.y+=this.player.vy*dt;}
      if(this.stateTime>2.5){if(this.lives<=0){this.state='gameover';this.emit('gameover');}else{this.reset(false);this.emit('respawn');}}
      return;
    }
    if(this.state==='intro'){this.player.x=Math.min(9.2,this.player.x+2.8*dt);this.player.walk+=2.8*dt;if(this.player.x>=9.2)this.beginPipe(this.area==='intro72'?'intro72-enter':this.area==='intro22'?'intro22-enter':this.area==='intro42'?'intro42-enter':'intro12-enter',this.pipes[0]);return;}
    if(this.state==='water-enter'){const p=this.player;p.vy=Math.min(4*NES_HZ/16,p.vy+40/256*NES_HZ**2/16*dt);p.y+=p.vy*dt;if(p.y+p.h>=5){p.y=5-p.h;this.state='playing';p.vy=0;this.emit('splash',p);}return;}
    if(this.state==='pipe'){this.updatePipe(dt);return;}
    if(this.state==='flag'){this.updateFlag(dt);return;}
    if(this.state==='castle-end'){this.updateCastleEnd(dt);return;}
    if(this.state==='vine-enter'||this.state==='sky-enter'){this.updateVineEntry(dt);return;}
    this.time-=dt*2.4;
    if(this.time<=0){this.time=0;this.die();return;}
    const p=this.player;
    this.updateLevelRandom(dt);this.updatePlatforms(dt);
    p.invincible=Math.max(0,p.invincible-dt);p.star=Math.max(0,p.star-dt);p.squash=Math.max(0,p.squash-dt);p.fireCooldown=Math.max(0,p.fireCooldown-dt);
    const wasGrounded=p.grounded,priorFeet=p.y+p.h;
    const onVine=this.updateVines(dt,input),onSpring=this.updateSprings(dt,input);
    if(this.state==='vine-enter')return;
    if(this.area==='underwater22'||this.area==='underwater52'||this.area==='underwater62'||this.newAreaInfo?.water){this.updateSwimming(dt,input);}
    else if(!onVine&&!onSpring){
    const wantedCrouch=p.big&&input.down&&p.grounded;
    if(wantedCrouch&&!p.crouching){p.y+=p.h-1;p.h=1;p.crouching=true;}
    if(!wantedCrouch&&p.crouching){const tall={...p,y:p.y-0.9,h:1.9};if(!this.nearbyColliders(tall).some(b=>overlap(tall,b))){p.y-=0.9;p.h=1.9;p.crouching=false;}}
    const direction=(input.right?1:0)-(input.left?1:0);
    const maxSpeed=input.run?9.3:5.8;
    if(direction&&!p.crouching){p.facing=direction;p.vx=approach(p.vx,direction*maxSpeed,(p.grounded?31:20)*dt);}
    else p.vx=approach(p.vx,0,(p.grounded?24:3)*dt);
    if(p.grounded)this.coyote=0.08;else this.coyote=Math.max(0,this.coyote-dt);
    this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    if(this.jumpBuffer>0&&this.coyote>0&&!p.crouching){p.vy=-(Math.abs(p.vx)>6?20.1:19.8);p.grounded=false;this.coyote=0;this.jumpBuffer=0;p.jumpHeld=true;this.emit('jump');}
    if(!input.jump&&!p.springFlight&&p.vy<-8.7)p.vy=-8.7;
    const gravity=p.springFlight?0x70/256*NES_HZ**2/16:47;
    p.vy=Math.min(24,p.vy+gravity*dt);
    const moved=this.move(p,dt,true);
    if(moved.landed&&!wasGrounded){p.squash=0.15;this.emit('land',p,{speed:Math.max(0,(p.y+p.h-priorFeet)/dt)});}
    if(moved.landed)p.springFlight=false;
    p.walk+=Math.abs(p.vx)*dt;
    }
    p.x=Math.max(this.newAreaKey||['overworld','underworld','exit12','treetops','castle','overworld21','sky21','underwater22','exit22','bridges23','castle24','overworld31','sky31','overworld32','treetops33','castle34','overworld41'].includes(this.area)?this.camera:1,p.x);
    if(this.newAreaKey){if(this.updateNewArea(dt,input))return;}
    else if(['overworld','exit12','treetops','overworld21','sky21','exit22','bridges23','overworld31','sky31','overworld32','treetops33','overworld41'].includes(this.area)){
      const previousCamera=this.camera;
      this.camera=Math.max(this.camera,Math.min(p.x-this.viewWidth*0.36,Math.max(0,this.worldWidth-this.viewWidth)));
      if(this.area==='overworld41')this.scrollAmount41=Math.max(0,Math.round((this.camera-previousCamera)*16/(dt*NES_HZ)));
      if(this.area==='overworld'&&p.x>=100)this.checkpoint=100;
      if(this.area==='treetops'&&this.camera>=64)this.checkpoint=66.5;
      if(this.area==='treetops33'&&this.camera>=64)this.checkpoint=66.5;
      if(this.area==='overworld32'&&this.camera>=96)this.checkpoint=98.5;
      if(this.area==='bridges23'&&this.camera>=112)this.checkpoint=114.5;
      if(this.area==='overworld21'){
        if(this.camera>=96)this.checkpoint=98.5;
        for(const b of this.blocks)if(b.world21OneUp&&!b.loaded&&b.x<this.camera+this.viewWidth+.75){b.loaded=true;this.world21OneUpAvailable=false;}
      }
      if(this.area==='overworld31'){
        if(this.camera>=96)this.checkpoint=98.5;
        for(const b of this.blocks)if(b.world31OneUp&&!b.loaded&&b.x<this.camera+this.viewWidth+.75){b.loaded=true;this.world31OneUpAvailable=false;}
      }
      if(this.area==='overworld41'){
        if(this.camera>=96)this.checkpoint=98.5;
        for(const b of this.blocks)if(b.world41OneUp&&!b.loaded&&b.x<this.camera+this.viewWidth+.75){b.loaded=true;this.world41OneUpAvailable=false;}
      }
      const entry=this.pipes.find(q=>q.enter&&input.down&&p.x+p.w/2>q.x+0.25&&p.x+p.w/2<q.x+q.w-0.25&&Math.abs(p.y+p.h-q.y)<0.12);
      if(entry){this.beginPipe(entry.action==='bonus21'?'bonus21-enter':entry.action==='bonus31'?'bonus31-enter':entry.action==='bonus41'?'bonus41-enter':'enter',entry);return;}
      if(this.flagX!==null&&p.x+p.w>=this.flagX&&p.y<12){this.beginFlag();return;}
    }else if(this.area==='underwater22'){
      this.camera=Math.max(this.camera,Math.min(p.x-this.viewWidth*.36,176));
      if(this.camera>=80)this.checkpoint=82.5;
      const mouth=this.pipes[0];
      if(input.right&&p.x+p.w>=mouth.x-.08&&p.x<mouth.x+1&&p.y>=mouth.y-.15&&p.y+p.h<=mouth.y+mouth.h+.15){p.y=mouth.y+(mouth.h-p.h)/2;this.beginPipe('exit22-enter',mouth);return;}
    }else if(['castle','castle24','castle34','castle44','castle54'].includes(this.area)){
      const roomCamera=Math.max(0,144+this.castleRoomOffset-this.viewWidth);
      this.camera=Math.max(this.camera,Math.min(p.x-this.viewWidth*.36,roomCamera));
      this.updateCastle(dt);if(this.state!=='playing')return;
    }else if(this.area==='underworld'){
      const warpCamera=174-Math.max(0,(this.viewWidth-16)/2);
      this.camera=Math.max(this.camera,Math.min(p.x-this.viewWidth*0.36,warpCamera));
      if(p.x>174)p.x=Math.min(p.x,this.camera+this.viewWidth-p.w);
      if(p.x>=96&&p.x<133)this.checkpoint=96;
      this.warpVisible=p.x>174||this.warpVisible;
      const entry=this.pipes.find(q=>q.enter&&!q.horizontal&&input.down&&p.x+p.w/2>q.x+0.25&&p.x+p.w/2<q.x+q.w-0.25&&Math.abs(p.y+p.h-q.y)<0.12);
      if(entry){this.beginPipe(entry.warp?'warp-enter':'bonus12-enter',entry);return;}
      const mouth=this.pipes.find(q=>q.horizontal&&q.action==='exit12');
      if(mouth&&input.right&&p.x+p.w>=mouth.x-0.08&&p.x<mouth.x+1&&p.y+p.h>mouth.y+0.3&&p.y<mouth.y+mouth.h){this.beginPipe('exit12-enter',mouth);return;}
    }else{
      const mouth=this.pipes.find(q=>q.horizontal);
      if(mouth&&input.right&&p.x+p.w>=mouth.x-0.08&&p.y+p.h>mouth.y+0.3){this.beginPipe(this.area==='bonus12'?'bonus12-leave':this.area==='bonus21'?'bonus21-leave':this.area==='bonus31'?'bonus31-leave':this.area==='bonus41'?'bonus41-leave':'leave',mouth);return;}
    }
    if(['sky21','sky31','sky52','sky62'].includes(this.area))p.x=Math.min(p.x,this.camera+this.viewWidth-p.w);
    if(p.y>16){if(this.area==='sky21')this.restoreWorld21('sky');else if(this.area==='sky31')this.restoreWorld31('sky');else if(this.area==='sky52')this.restoreNewMain('sky');else if(this.area==='sky62')this.restoreWorld62('sky');else this.die();return;}
    this.updateFishSpawner(dt);
    for(const b of this.bridge)if(['bridges23','bridges73','overworld31'].includes(this.area))b.load=approach(b.load,p.grounded&&Math.abs(p.y+p.h-b.y)<.05&&p.x+p.w>b.x&&p.x<b.x+b.w?1:0,dt*6);
    this.updateCannons(dt);this.updateLakituSpawner(dt);this.updateEnemies(dt,p,priorFeet);this.updateHammers(dt);
    this.updateItems(dt);
    this.updateShots(dt);
  }

  updateEnemies(dt,p,priorFeet) {
    for(const e of this.enemies){
      if(e.removed)continue;
      if((e.kind==='blooper'||e.sourceActor)&&!e.active)continue;
      if(!e.active&&e.x<this.camera+this.viewWidth+0.75)e.active=true;
      if(!e.active)continue;
      if(e.dead){e.deathTimer-=dt;if(e.flipped){e.vy+=28*dt;e.y+=e.vy*dt;e.x+=e.vx*dt;}if(e.deathTimer<=0)e.removed=true;continue;}
      if(e.kind==='bulletbill'){this.updateBulletBill(e,dt,p,priorFeet);continue;}
      if(e.kind==='lakitu'){this.updateLakitu(e,dt,p,priorFeet);continue;}
      if(e.kind==='spiny'){this.updateSpiny(e,dt,p);continue;}
      if(e.kind==='hammerbro'){this.updateHammerBro(e,dt,p,priorFeet);continue;}
      if(e.kind==='blooper'||e.kind==='cheep'){this.updateAquaticEnemy(e,dt,p,priorFeet);continue;}
      if(e.kind==='piranha'){
        if((['overworld41','overworld61','overworld82'].includes(this.area)||e.invisibleSourcePlant)&&e.x<this.camera-1){e.removed=true;continue;}
        const near=Math.abs((p.x+p.w/2)-(e.pipeX+1))<1.7&&p.y+p.h<e.pipeY+1.8;
        if(e.phase<1.15&&near)e.phase=0;else e.phase=(e.phase+dt)%4.2;
        const phase=e.phase;
        e.extension=phase<1.15?0:phase<1.85?(phase-1.15)/.7:phase<3.15?1:phase<3.85?1-(phase-3.15)/.7:0;
        e.extension=clamp(e.extension,0,1);e.hidden=e.extension<.025;e.y=e.pipeY-e.h*e.extension;
        if(!e.hidden&&overlap(p,this.piranhaHitbox(e))&&p.y<e.pipeY&&this.state==='playing'){
          if(p.star>0)this.killEnemy(e,'star');else this.hurt();
        }
        continue;
      }
      e.kickGrace=Math.max(0,e.kickGrace-dt);
      if(e.kind==='shell'&&Math.abs(e.vx)<0.1){e.shellTimer-=dt;if(e.shellTimer<0){e.kind=e.buzzy?'buzzy':'koopa';e.type=e.kind;e.y-=e.buzzy?.2:.6;e.h=e.buzzy?1:1.4;e.vx=e.buzzy?((this.levelRandom.bytes[1]&1)?1:-1)*(this.primaryHardMode?3*NES_HZ/64:NES_HZ/32):this.primaryHardMode?-3*NES_HZ/64:(this.world5363||this.world6484)?-NES_HZ/32:-1.25;e.flipped=false;}}
      if(e.buzzy&&e.bumpStunned){
        e.vy=Math.min(3*NES_HZ/16,e.vy+32/256*NES_HZ**2/16*dt);const motion=this.move(e,dt);if(motion.hitSide)e.vx*=-1;if(motion.landed){e.bumpStunned=false;e.vx=0;e.shellTimer=(this.primaryHardMode?11:16)*21/NES_HZ;}
      }else if(e.winged&&e.kind==='koopa'&&e.jumping){
        e.flightPhase+=dt;e.vy=Math.min(3*NES_HZ/16,e.vy+e.hopGravity*dt);
        const motion=this.move(e,dt);if(motion.hitSide)e.vx*=-1;if(motion.landed)e.vy=e.hopVelocity;e.grounded=false;
      }else if(e.winged&&e.kind==='koopa'&&e.horizontalFlight){
        this.updateLateFlyingKoopa(e,dt);
      }else if(e.winged&&e.kind==='koopa'){
        e.flightPhase+=dt;
        e.vy=clamp(e.vy+(e.y<e.flightCenter?1:-1)*e.flightAcceleration*dt,-e.flightMaxSpeed,e.flightMaxSpeed);
        e.y+=e.vy*dt;
        if(e.y<e.flightMinY){e.y=e.flightMinY;e.vy=Math.max(0,e.vy);}
        if(e.y>e.flightMaxY){e.y=e.flightMaxY;e.vy=Math.min(0,e.vy);}
        e.grounded=false;e.vx=0;
      }else{
        if(e.smart&&e.kind==='koopa'&&e.grounded){const ahead=e.vx<0?e.x-.12:e.x+e.w+.12;const feet=e.y+e.h;const support=[...this.floors,...this.blocks,...this.platforms,...this.treetops].some(b=>!b.removed&&!b.playerOnly&&b.type!=='hidden'&&ahead>=b.x&&ahead<=b.x+b.w&&Math.abs(b.y-feet)<.2);if(!support)e.vx*=-1;}
        e.vy=Math.min(24,e.vy+40*dt);
        const motion=this.move(e,dt);
        if(motion.hitSide){e.vx*=-1;if(e.kind==='shell'&&Math.abs(e.vx)>1)this.emit('bump',e);}
      }
      if(!e.winged||e.jumping)e.facing=e.vx<0?-1:1;e.walk+=Math.abs(e.vx)*dt;
      if(e.y>16||e.x<this.camera-3){e.removed=true;continue;}
      if(e.kind==='shell'&&Math.abs(e.vx)>1){for(const other of this.enemies){if(other!==e&&other.active&&other.kind!=='piranha'&&other.kind!=='lakitu'&&!other.dead&&!other.removed&&overlap(e,other.kind==='spiny'?this.spinyHitbox(other):other)){
        const duel=other.kind==='shell'&&Math.abs(other.vx)>1;
        this.killEnemy(other,'shell',e);if(duel){this.killEnemy(e,'shell-duel');break;}
      }}}
      else if(e.kind!=='shell'){for(const other of this.enemies){if(other!==e&&other.active&&!other.dead&&!other.removed&&other.kind!=='shell'&&other.kind!=='piranha'&&other.kind!=='lakitu'&&e.x<other.x&&overlap(e,other.kind==='spiny'?this.spinyHitbox(other):other)){e.vx=-Math.abs(e.vx);other.vx=Math.abs(other.vx);e.x=other.x-e.w;}}}
      if(e.dead)continue;
      const contact=e.buzzy?this.buzzyHitbox(e):e;
      if(this.state!=='playing'||!overlap(p,contact)||e.kickGrace>0)continue;
      if(p.star>0){this.killEnemy(e,'star');continue;}
      if(p.vy>0&&priorFeet<=contact.y+0.4){this.stomp(e);continue;}
      if(e.kind==='shell'&&Math.abs(e.vx)<0.1){e.vx=e.x+e.w/2>p.x+p.w/2?11:-11;e.kickGrace=0.18;this.addScore(400,e.x,e.y);this.emit('kick',e);}
      else this.hurt();
    }
  }

  updateItems(dt) {
    const p=this.player;
    for(const item of this.items){
      if(item.removed)continue;item.age+=dt;
      if(item.emerge>0){item.emerge-=dt;item.y=item.spawnY-(0.9*(1-Math.max(0,item.emerge)/0.7));continue;}
      if(item.kind!=='coin'&&item.kind!=='flower'){
        item.vy=Math.min(24,item.vy+35*dt);const motion=this.move(item,dt);
        if(motion.hitSide)item.vx*=-1;
        if(item.kind==='star'&&motion.landed)item.vy=-11;
      }
      if(item.y>17||item.x<this.camera-4){item.removed=true;continue;}
      if(!overlap(p,item))continue;
      item.removed=true;
      if(item.kind==='coin'){this.collectCoin(item);continue;}
      if(item.kind==='1up'){this.lives++;this.emit('1up',item);this.effects.push({type:'score',x:item.x,y:item.y,text:'1UP',life:1.2,vy:-1});continue;}
      this.addScore(1000,item.x,item.y);
      if(item.kind==='star'){p.star=12;this.emit('star',item);continue;}
      if(!p.big){p.y-=0.9;p.h=1.9;p.big=true;p.crouching=false;}
      if(item.kind==='flower')p.fire=true;
      p.squash=0.35;this.emit('power',item,{kind:item.kind});
    }
    this.items=this.items.filter(i=>!i.removed);
  }

  updateShots(dt) {
    for(const shot of this.shots){
      if(shot.removed)continue;shot.life-=dt;shot.vy=Math.min(18,shot.vy+34*dt);
      const motion=this.move(shot,dt);
      if(motion.landed)shot.vy=-7.2;
      if(motion.hitSide||shot.life<=0||shot.y>16||shot.x<this.camera-2||shot.x>this.camera+this.viewWidth+2)shot.removed=true;
      if(!shot.removed&&(['castle','castle24','castle34','castle44','castle54'].includes(this.area)||this.newAreaInfo?.castleArea)&&this.boss&&!this.boss.dead&&this.boss.active&&overlap(shot,this.boss)){this.boss.health--;this.boss.hitFlash=.12;shot.removed=true;this.emit('boss-hit',this.boss,{health:this.boss.health});if(this.boss.health<=0)this.defeatBoss('fire');}
      for(const e of this.podoboos)if(!shot.removed&&e.active&&!e.hidden&&overlap(shot,{x:e.x+3/16,y:e.y+14/16,w:10/16,h:6/16})){shot.removed=true;this.emit('fire-hit',shot,{target:'podoboo'});}
      for(const enemy of this.enemies){if(!shot.removed&&!enemy.dead&&!enemy.removed&&!enemy.hidden&&overlap(shot,enemy.invisibleSourcePlant?this.piranhaHitbox(enemy):enemy.kind==='blooper'||enemy.kind==='cheep'?this.aquaticHitbox(enemy):enemy.kind==='lakitu'?this.lakituHitbox(enemy):enemy.kind==='spiny'?this.spinyHitbox(enemy):enemy.kind==='bulletbill'?this.bulletHitbox(enemy):enemy.buzzy?this.buzzyHitbox(enemy):enemy.kind==='hammerbro'?{x:enemy.x+4/16,y:enemy.y+4/16,w:8/16,h:24/16}:enemy)){this.killEnemy(enemy,'fire');shot.removed=true;break;}}
    }
    this.shots=this.shots.filter(s=>!s.removed);
  }

  updatePipe(dt) {
    this.stateTime+=dt;
    const p=this.player;
    if(this.pipeMode==='intro22-enter'){
      p.x+=1.7*dt;if(this.stateTime>1.05){this.createWorld22();this.stateTime=0;this.emit('area',p,{area:this.area,level:this.level});}return;
    }
    if(this.pipeMode==='exit22-enter'){
      p.x+=1.7*dt;if(this.stateTime>1.05)this.createExit22();return;
    }
    if(this.pipeMode==='bonus21-enter'){
      p.y+=1.65*dt;
      if(this.stateTime>1.15){this.saveWorld21();this.createUnderground('bonus21');this.flagX=null;this.castleX=null;this.state='playing';this.stateTime=0;}
      return;
    }
    if(this.pipeMode==='bonus21-leave'){
      p.x+=1.7*dt;if(this.stateTime>1.05)this.restoreWorld21('pipe');return;
    }
    if(this.pipeMode==='bonus31-enter'){
      p.y+=1.65*dt;if(this.stateTime>1.15){this.saveWorld31();this.createBonus31();this.state='playing';this.stateTime=0;}return;
    }
    if(this.pipeMode==='bonus31-leave'){p.x+=1.7*dt;if(this.stateTime>1.05)this.restoreWorld31('pipe');return;}
    if(this.pipeMode==='bonus41-enter'){
      p.y+=1.65*dt;if(this.stateTime>1.15){this.saveWorld41();this.createBonus41();this.state='playing';this.stateTime=0;}return;
    }
    if(this.pipeMode==='bonus41-leave'){p.x+=1.7*dt;if(this.stateTime>1.05)this.restoreWorld41();return;}
    if(this.pipeMode==='intro12-enter'){
      p.x+=1.7*dt;
      if(this.stateTime>1.05){this.createWorld12();this.state='playing';this.stateTime=0;this.emit('area',p,{area:this.area,level:this.level});}
      return;
    }
    if(this.pipeMode==='bonus12-enter'){
      p.y+=1.65*dt;
      if(this.stateTime>1.15){
        this.savedWorld12={floors:this.floors,blocks:this.blocks,pipes:this.pipes,enemies:this.enemies,items:this.items,platforms:this.platforms,camera:this.camera};
        this.createBonus12();this.state='playing';this.stateTime=0;
      }
      return;
    }
    if(this.pipeMode==='bonus12-leave'){
      p.x+=1.7*dt;
      if(this.stateTime>1.05){
        const saved=this.savedWorld12;
        if(saved)Object.assign(this,saved);else this.createWorld12();
        this.area='underworld';this.worldWidth=206;this.flagX=null;this.castleX=null;this.camera=Math.max(this.camera,115-this.viewWidth*.36);this.shots=[];this.effects=[];
        Object.assign(p,{x:115.6,y:11,vx:0,vy:0,grounded:false,supportPlatform:null});
        this.emergeTargetY=11;this.pipeMode='emerge12';this.stateTime=0;this.emit('area',p,{area:this.area,level:this.level});
      }
      return;
    }
    if(this.pipeMode==='exit12-enter'){
      p.x+=1.7*dt;
      if(this.stateTime>1.05)this.createExit12();
      return;
    }
    if(this.pipeMode==='warp-enter'){
      p.y+=1.65*dt;
      if(this.stateTime>1.15){
        const destination=this.pipeReference.warp;
        if(destination>=2&&destination<=8){
          const power={big:p.big,fire:p.fire};
          this.selectedLevel=destination+'-1';this.checkpoint=0;this.world21OneUpAvailable=true;this.world31OneUpAvailable=true;this.world41OneUpAvailable=true;this.world51OneUpAvailable=true;this.world61OneUpAvailable=true;this.world71OneUpAvailable=true;this.world81OneUpAvailable=true;this.reset(false);
          if(power.big)Object.assign(this.player,{...power,h:1.9,y:this.player.y-.9});
          this.emit('warp-level',this.player,{destination,level:this.level});this.emit('start');
        }else{this.warpDestination=destination;this.state='warped';p.hidden=true;this.emit('warp',p,{destination});}
      }
      return;
    }
    if(this.pipeMode==='emerge12'){
      p.y-=1.85*dt;
      if(p.y+p.h<=this.emergeTargetY){p.y=this.emergeTargetY-p.h;this.state='playing';this.stateTime=0;p.grounded=true;p.invincible=Math.max(p.invincible,.5);this.emit('pipe');}
      return;
    }
    if(this.pipeMode==='enter'){
      p.y+=1.65*dt;
      if(this.stateTime>1.15){
        this.savedOverworld={floors:this.floors,blocks:this.blocks,pipes:this.pipes,enemies:this.enemies,items:this.items,camera:this.camera};
        this.createUnderground();this.state='playing';this.stateTime=0;
      }
    }else if(this.pipeMode==='leave'){
      p.x+=1.7*dt;
      if(this.stateTime>1.05){
        const saved=this.savedOverworld;
        if(saved){this.floors=saved.floors;this.blocks=saved.blocks;this.pipes=saved.pipes;this.enemies=saved.enemies;this.items=saved.items;}
        else this.createOverworld();
        this.area='overworld';this.worldWidth=224;this.camera=Math.max(0,163-this.viewWidth*.36);this.shots=[];
        p.x=163.6;p.y=11;p.vx=0;p.vy=0;p.grounded=false;
        this.pipeMode='emerge';this.stateTime=0;this.emit('area',p,{area:this.area});
      }
    }else{
      p.y-=1.85*dt;
      if(p.y+p.h<=11){p.y=11-p.h;this.state='playing';this.stateTime=0;p.grounded=true;p.invincible=Math.max(p.invincible,0.5);this.emit('pipe');}
    }
  }

  beginFlag() {
    const p=this.player;
    if(this.level==='3-3')this.world41OneUpAvailable=this.levelCoins>=22;
    if(this.level==='4-3')this.world51OneUpAvailable=this.levelCoins>=27;
    if(this.level==='5-3')this.world61OneUpAvailable=this.levelCoins>=23;
    if(this.level==='6-3')this.world71OneUpAvailable=this.levelCoins>=24;
    if(this.level==='7-3')this.world81OneUpAvailable=this.levelCoins>=35;
    this.state='flag';this.stateTime=0;this.flagPhase='slide';
    p.x=this.flagX-0.65;p.vx=0;p.vy=0;p.facing=1;
    const height=13-(p.y+p.h);
    const points=height>=8?5000:height>=6?2000:height>=4?800:height>=2?400:100;
    this.addScore(points,this.flagX,p.y);this.emit('flag',p,{points});
  }

  updateFlag(dt) {
    this.stateTime+=dt;
    const p=this.player;
    if(this.flagPhase==='slide'){
      p.y=Math.min(12-p.h,p.y+5*dt);this.flagY=Math.min(11.4,this.flagY+5*dt);
      if(p.y>=12-p.h-0.01&&this.flagY>=11.3){this.flagPhase='walk';p.x=this.flagX+1;p.y=13-p.h;this.stateTime=0;}
    }else if(this.flagPhase==='walk'){
      p.vx=3;p.x=Math.min(this.castleX,p.x+3*dt);p.walk+=3*dt;
      if(p.x>=this.castleX){this.flagPhase='tally';p.vx=0;p.hidden=true;this.stateTime=0;this.tallyRemainder=Math.ceil(this.time);}
    }else{
      const count=Math.min(this.tallyRemainder,Math.max(1,Math.floor(200*dt)));
      this.tallyRemainder-=count;this.score+=count*50;this.time=this.tallyRemainder;
      if(this.tallyRemainder<=0&&this.stateTime>0.7){this.state='won';this.emit('win');}
    }
  }

  snapshot() {
    return {state:this.state,area:this.area,level:this.level,worldLabel:this.worldLabel,quest:this.quest,primaryHardMode:this.primaryHardMode,warpDestination:this.warpDestination,score:this.score,coins:this.coins,lives:this.lives,time:Math.ceil(this.time),camera:this.camera,player:{...this.player},enemyCount:this.enemies.filter(e=>!e.removed&&!e.dead).length,itemCount:this.items.length,boss:this.boss?{...this.boss}:null,castleEnding:this.castleEnding?{...this.castleEnding}:null};
  }
}

installWorld4252(Game,{NES_HZ,overlap,clamp,approach});

installWorld5363(Game,{NES_HZ,overlap,clamp,approach});

installWorld6484(Game,{NES_HZ,overlap,clamp,approach});
