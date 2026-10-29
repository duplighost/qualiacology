// Photographic spaghetti artwork for Worlds4–2 through5–2.
// Exact scenery masks come from the preserved original-derived source grids.
// Selected strands use constraints and damping; gameplay bodies remain unchanged.
export function createWorld4252Art({ctx,material,strand,coil,photoShape,drawSprite,getTime=()=>0}) {
  const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const motion=new WeakMap(),flex=new WeakMap();
  const SCENERY={"intro42":{"width":30,"clouds":[{"x":18,"y":2,"w":4,"cells":[[18,2,128],[19,2,129],[20,2,129],[21,2,130],[18,3,131],[19,3,132],[20,3,132],[21,3,133]]},{"x":3,"y":3,"w":4,"cells":[[3,3,128],[4,3,129],[5,3,129],[6,3,130],[3,4,131],[4,4,132],[5,4,132],[6,4,133]]},{"x":9,"y":7,"w":3,"cells":[[9,7,128],[10,7,129],[11,7,130],[9,8,131],[10,8,132],[11,8,133]]},{"x":28,"y":11,"w":3,"cells":[[28,11,128],[28,12,131],[29,12,132],[29,11,129]]}],"trees":[],"fences":[],"mushrooms":[],"hillCells":[],"bushCells":[]},"sky42":{"width":80,"clouds":[{"x":18,"y":2,"w":4,"cells":[[18,2,128],[19,2,129],[20,2,129],[21,2,130],[18,3,131],[19,3,132],[20,3,132],[21,3,133]]},{"x":66,"y":2,"w":4,"cells":[[66,2,128],[67,2,129],[68,2,129],[69,2,130],[66,3,131],[67,3,132],[68,3,132],[69,3,133]]},{"x":3,"y":3,"w":4,"cells":[[3,3,128],[4,3,129],[5,3,129],[6,3,130],[3,4,131],[4,4,132],[5,4,132],[6,4,133]]},{"x":51,"y":3,"w":4,"cells":[[51,3,128],[52,3,129],[53,3,129],[54,3,130]]},{"x":38,"y":6,"w":3,"cells":[[38,6,128],[39,6,129],[40,6,130],[38,7,131],[39,7,132],[40,7,133]]},{"x":9,"y":7,"w":3,"cells":[[9,7,128],[10,7,129],[11,7,130],[9,8,131],[10,8,132],[11,8,133]]},{"x":57,"y":7,"w":3,"cells":[[57,7,128],[58,7,129],[59,7,130],[57,8,131],[58,8,132],[59,8,133]]},{"x":35,"y":7,"w":3,"cells":[[35,7,128],[36,7,129],[37,7,130],[35,8,131],[36,8,132],[37,8,133]]},{"x":28,"y":11,"w":3,"cells":[[28,11,128],[29,11,129],[30,11,130],[28,12,131],[29,12,132],[30,12,133]]},{"x":76,"y":11,"w":3,"cells":[[76,11,128],[77,11,129],[78,11,130],[76,12,131],[77,12,132],[78,12,133]]},{"x":-1,"y":11,"w":3,"cells":[[0,11,130],[0,12,133]]}],"trees":[],"fences":[],"mushrooms":[{"x":30,"y":4,"w":5,"stemCells":[[32,5,79],[32,6,80],[32,7,80],[32,8,80],[32,9,80],[32,11,80],[32,12,80]]},{"x":16,"y":5,"w":3,"stemCells":[[17,6,79],[17,7,80],[17,8,80],[17,9,80],[17,10,80],[17,11,80],[17,12,80]]},{"x":22,"y":5,"w":3,"stemCells":[[23,6,79],[23,7,80],[23,8,80],[23,9,80],[23,10,80],[23,12,80]]},{"x":26,"y":7,"w":3,"stemCells":[[27,8,79],[27,9,80],[27,10,80],[27,11,80],[27,12,80]]},{"x":12,"y":9,"w":3,"stemCells":[[13,10,79],[13,11,80],[13,12,80]]},{"x":31,"y":10,"w":7,"stemCells":[[34,11,79],[34,12,80]]},{"x":18,"y":11,"w":3,"stemCells":[[19,12,79]]},{"x":22,"y":11,"w":5,"stemCells":[[24,12,79]]}],"hillCells":[],"bushCells":[]},"mushrooms43":{"width":173,"clouds":[{"x":18,"y":2,"w":4,"cells":[[18,2,128],[19,2,129],[20,2,129],[21,2,130],[18,3,131],[19,3,132],[20,3,132],[21,3,133]]},{"x":66,"y":2,"w":4,"cells":[[66,2,128],[67,2,129],[68,2,129],[69,2,130],[66,3,131],[67,3,132],[68,3,132],[69,3,133]]},{"x":114,"y":2,"w":4,"cells":[[114,2,128],[115,2,129],[116,2,129],[117,2,130],[114,3,131],[115,3,132],[116,3,132],[117,3,133]]},{"x":3,"y":3,"w":4,"cells":[[3,3,128],[4,3,129],[5,3,129],[6,3,130],[3,4,131],[4,4,132],[5,4,132],[6,4,133]]},{"x":51,"y":3,"w":4,"cells":[[51,3,128],[52,3,129],[53,3,129],[54,3,130],[51,4,131],[52,4,132],[53,4,132],[54,4,133]]},{"x":99,"y":3,"w":4,"cells":[[99,3,128],[100,3,129],[101,3,129],[102,3,130],[99,4,131],[100,4,132],[101,4,132],[102,4,133]]},{"x":38,"y":6,"w":3,"cells":[[38,6,128],[39,6,129],[40,6,130],[38,7,131],[39,7,132],[40,7,133]]},{"x":86,"y":6,"w":3,"cells":[[86,6,128],[87,6,129],[88,6,130],[86,7,131],[87,7,132],[88,7,133]]},{"x":134,"y":6,"w":3,"cells":[[134,6,128],[135,6,129],[136,6,130],[134,7,131],[135,7,132],[136,7,133]]},{"x":9,"y":7,"w":3,"cells":[[9,7,128],[10,7,129],[11,7,130],[9,8,131],[10,8,132],[11,8,133]]},{"x":57,"y":7,"w":3,"cells":[[57,7,128],[58,7,129],[59,7,130],[57,8,131],[58,8,132],[59,8,133]]},{"x":105,"y":7,"w":3,"cells":[[105,7,128],[106,7,129],[107,7,130],[105,8,131],[106,8,132],[107,8,133]]},{"x":35,"y":7,"w":3,"cells":[[35,7,128],[36,7,129],[37,7,130],[35,8,131],[36,8,132],[37,8,133]]},{"x":83,"y":7,"w":3,"cells":[[83,7,128],[84,7,129],[85,7,130],[83,8,131],[84,8,132],[85,8,133]]},{"x":131,"y":7,"w":3,"cells":[[131,7,128],[132,7,129],[133,7,130],[131,8,131],[132,8,132],[133,8,133]]},{"x":28,"y":11,"w":3,"cells":[[28,11,128],[29,11,129],[30,11,130],[28,12,131],[29,12,132],[30,12,133]]},{"x":76,"y":11,"w":3,"cells":[[77,11,129],[78,11,130],[77,12,132],[78,12,133]]},{"x":124,"y":11,"w":3,"cells":[[124,11,128],[125,11,129],[126,11,130],[124,12,131],[125,12,132],[126,12,133]]},{"x":46,"y":11,"w":3,"cells":[[46,11,128],[47,11,129],[48,11,130],[46,12,131],[47,12,132],[48,12,133]]},{"x":94,"y":11,"w":3,"cells":[[94,11,128],[95,11,129],[96,11,130],[94,12,131],[95,12,132],[96,12,133]]}],"trees":[],"fences":[],"mushrooms":[{"x":70,"y":3,"w":3,"stemCells":[[71,4,79],[71,5,80],[71,6,80],[71,7,80],[71,8,80],[71,9,80],[71,10,80],[71,11,80],[71,12,80],[71,13,80],[71,14,80]]},{"x":32,"y":4,"w":3,"stemCells":[[33,5,79],[33,6,80],[33,7,80],[33,8,80],[33,9,80],[33,10,80],[33,11,80],[33,12,80],[33,13,80],[33,14,80]]},{"x":19,"y":5,"w":5,"stemCells":[[21,6,79],[21,7,80],[21,8,80],[21,9,80],[21,10,80],[21,11,80],[21,12,80],[21,13,80],[21,14,80]]},{"x":39,"y":5,"w":5,"stemCells":[[41,6,79],[41,7,80],[41,8,80],[41,9,80],[41,10,80],[41,11,80],[41,13,80],[41,14,80]]},{"x":74,"y":5,"w":5,"stemCells":[[76,6,79],[76,7,80],[76,8,80],[76,9,80],[76,10,80],[76,11,80],[76,12,80],[76,13,80],[76,14,80]]},{"x":117,"y":6,"w":3,"stemCells":[[118,7,79],[118,8,80],[118,9,80],[118,10,80],[118,11,80],[118,12,80],[118,13,80],[118,14,80]]},{"x":67,"y":7,"w":3,"stemCells":[[68,8,79],[68,9,80],[68,10,80],[68,11,80],[68,12,80],[68,14,80]]},{"x":51,"y":8,"w":3,"stemCells":[[52,9,79],[52,10,80],[52,11,80],[52,12,80],[52,13,80],[52,14,80]]},{"x":23,"y":9,"w":7,"stemCells":[[26,10,79],[26,11,80],[26,12,80],[26,13,80],[26,14,80]]},{"x":44,"y":9,"w":3,"stemCells":[[45,10,79],[45,11,80],[45,12,80],[45,13,80],[45,14,80]]},{"x":72,"y":9,"w":3,"stemCells":[[73,10,79],[73,11,80],[73,12,80],[73,13,80],[73,14,80]]},{"x":84,"y":9,"w":3,"stemCells":[[85,10,79],[85,11,80],[85,12,80],[85,13,80],[85,14,80]]},{"x":113,"y":9,"w":5,"stemCells":[[115,10,79],[115,11,80],[115,12,80],[115,13,80],[115,14,80]]},{"x":105,"y":10,"w":3,"stemCells":[[106,11,79],[106,12,80],[106,13,80],[106,14,80]]},{"x":130,"y":10,"w":5,"stemCells":[[132,11,79],[132,12,80],[132,13,80],[132,14,80]]},{"x":99,"y":11,"w":3,"stemCells":[[100,12,79],[100,13,80],[100,14,80]]},{"x":36,"y":12,"w":7,"stemCells":[[39,13,79],[39,14,80]]},{"x":16,"y":13,"w":5,"stemCells":[[18,14,79]]},{"x":65,"y":13,"w":5,"stemCells":[[67,14,79]]},{"x":121,"y":13,"w":7,"stemCells":[[124,14,79]]}],"hillCells":[],"bushCells":[]},"overworld51":{"width":224,"clouds":[{"x":27,"y":2,"w":3,"cells":[[27,2,128],[28,2,129],[29,2,130],[27,3,131],[28,3,132],[29,3,133]]},{"x":75,"y":2,"w":3,"cells":[[75,2,128],[76,2,129],[77,2,130],[75,3,131],[76,3,132],[77,3,133]]},{"x":123,"y":2,"w":3,"cells":[[123,2,128],[124,2,129],[125,2,130],[123,3,131],[124,3,132],[125,3,133]]},{"x":171,"y":2,"w":3,"cells":[[171,2,128],[172,2,129],[173,2,130],[171,3,131],[172,3,132],[173,3,133]]},{"x":219,"y":2,"w":3,"cells":[[219,2,128],[220,2,129],[221,2,130],[219,3,131],[220,3,132],[221,3,133]]},{"x":45,"y":2,"w":3,"cells":[[45,2,128],[46,2,129],[47,2,130],[45,3,131],[46,3,132],[47,3,133]]},{"x":93,"y":2,"w":3,"cells":[[93,2,128],[94,2,129],[95,2,130],[93,3,131],[94,3,132],[95,3,133]]},{"x":141,"y":2,"w":3,"cells":[[141,2,128],[142,2,129],[143,2,130],[141,3,131],[142,3,132],[143,3,133]]},{"x":189,"y":2,"w":3,"cells":[[189,2,128],[190,2,129],[191,2,130],[189,3,131],[190,3,132],[191,3,133]]},{"x":0,"y":3,"w":4,"cells":[[0,3,128],[1,3,129],[2,3,129],[3,3,130],[0,4,131],[1,4,132],[2,4,132],[3,4,133]]},{"x":48,"y":3,"w":4,"cells":[[48,3,128],[49,3,129],[50,3,129],[51,3,130],[48,4,131],[49,4,132],[50,4,132],[51,4,133]]},{"x":96,"y":3,"w":4,"cells":[[96,3,128],[97,3,129],[98,3,129],[99,3,130],[96,4,131],[97,4,132],[98,4,132],[99,4,133]]},{"x":144,"y":3,"w":4,"cells":[[144,3,128],[145,3,129],[146,3,129],[147,3,130],[144,4,131],[145,4,132],[146,4,132],[147,4,133]]},{"x":192,"y":3,"w":4,"cells":[[192,3,128],[193,3,129],[194,3,129],[195,3,130],[192,4,131],[193,4,132],[194,4,132],[195,4,133]]},{"x":18,"y":3,"w":3,"cells":[[18,3,128],[19,3,129],[20,3,130],[18,4,131],[19,4,132],[20,4,133]]},{"x":66,"y":3,"w":3,"cells":[[66,3,128],[67,3,129],[68,3,130],[66,4,131],[67,4,132],[68,4,133]]},{"x":114,"y":3,"w":3,"cells":[[114,3,128],[115,3,129],[116,3,130],[114,4,131],[115,4,132],[116,4,133]]},{"x":162,"y":3,"w":3,"cells":[[162,3,128],[163,3,129],[164,3,130],[162,4,131],[163,4,132],[164,4,133]]},{"x":210,"y":3,"w":3,"cells":[[210,3,128],[211,3,129],[212,3,130],[210,4,131],[211,4,132],[212,4,133]]},{"x":30,"y":3,"w":4,"cells":[[30,3,128],[31,3,129],[32,3,129],[33,3,130],[30,4,131],[31,4,132],[32,4,132],[33,4,133]]},{"x":78,"y":3,"w":4,"cells":[[78,3,128],[79,3,129],[80,3,129],[81,3,130],[78,4,131],[79,4,132],[80,4,132],[81,4,133]]},{"x":126,"y":3,"w":4,"cells":[[126,3,128],[127,3,129],[128,3,129],[129,3,130],[126,4,131],[127,4,132],[128,4,132],[129,4,133]]},{"x":174,"y":3,"w":4,"cells":[[174,3,128],[175,3,129],[176,3,129],[177,3,130],[174,4,131],[175,4,132],[176,4,132],[177,4,133]]},{"x":222,"y":3,"w":4,"cells":[[222,3,128],[223,3,129],[222,4,131],[223,4,132]]}],"trees":[{"x":13,"y":10,"h":3,"cells":[[13,10,13],[13,11,15],[13,12,78]]},{"x":61,"y":10,"h":3,"cells":[[61,10,13],[61,11,15],[61,12,78]]},{"x":109,"y":10,"h":3,"cells":[[109,10,13],[109,11,15],[109,12,78]]},{"x":157,"y":10,"h":3,"cells":[[157,10,13],[157,11,15],[157,12,78]]},{"x":21,"y":10,"h":3,"cells":[[21,10,13],[21,11,15],[21,12,78]]},{"x":69,"y":10,"h":3,"cells":[[69,10,13],[69,11,15],[69,12,78]]},{"x":117,"y":10,"h":3,"cells":[[117,10,13],[117,11,15],[117,12,78]]},{"x":165,"y":10,"h":3,"cells":[[165,10,13],[165,11,15],[165,12,78]]},{"x":213,"y":10,"h":3,"cells":[[213,10,13],[213,11,15],[213,12,78]]},{"x":43,"y":10,"h":3,"cells":[[43,10,13],[43,11,15],[43,12,78]]},{"x":91,"y":10,"h":3,"cells":[[91,10,13],[91,11,15],[91,12,78]]},{"x":139,"y":10,"h":3,"cells":[[139,10,13],[139,11,15],[139,12,78]]},{"x":187,"y":10,"h":3,"cells":[[187,10,13],[187,11,15],[187,12,78]]},{"x":11,"y":11,"h":2,"cells":[[11,11,14],[11,12,78]]},{"x":59,"y":11,"h":2,"cells":[[59,11,14],[59,12,78]]},{"x":107,"y":11,"h":2,"cells":[[107,11,14],[107,12,78]]},{"x":155,"y":11,"h":2,"cells":[[155,11,14],[155,12,78]]},{"x":23,"y":11,"h":2,"cells":[[23,11,14],[23,12,78]]},{"x":71,"y":11,"h":2,"cells":[[71,11,14],[71,12,78]]},{"x":119,"y":11,"h":2,"cells":[[119,11,14],[119,12,78]]},{"x":167,"y":11,"h":2,"cells":[[167,11,14],[167,12,78]]},{"x":215,"y":11,"h":2,"cells":[[215,11,14],[215,12,78]]},{"x":24,"y":11,"h":2,"cells":[[24,11,14],[24,12,78]]},{"x":72,"y":11,"h":2,"cells":[[72,11,14],[72,12,78]]},{"x":120,"y":11,"h":2,"cells":[[120,11,14],[120,12,78]]},{"x":168,"y":11,"h":2,"cells":[[168,11,14],[168,12,78]]},{"x":216,"y":11,"h":2,"cells":[[216,11,14],[216,12,78]]},{"x":40,"y":11,"h":2,"cells":[[40,11,14],[40,12,78]]},{"x":88,"y":11,"h":2,"cells":[[88,11,14],[88,12,78]]},{"x":136,"y":11,"h":2,"cells":[[136,11,14],[136,12,78]]}],"fences":[[14,12,4],[38,12,2],[41,12,1],[62,12,4],[86,12,2],[110,12,1],[112,12,2],[134,12,2],[137,12,1],[158,12,1],[160,12,2],[208,12,2]],"mushrooms":[],"hillCells":[],"bushCells":[]},"overworld52":{"width":225,"clouds":[{"x":27,"y":2,"w":3,"cells":[[27,2,128],[28,2,129],[29,2,130],[27,3,131],[28,3,132],[29,3,133]]},{"x":75,"y":2,"w":3,"cells":[[75,2,128],[76,2,129],[77,2,130],[75,3,131],[76,3,132],[77,3,133]]},{"x":123,"y":2,"w":3,"cells":[[123,2,128],[124,2,129],[125,2,130],[123,3,131],[124,3,132],[125,3,133]]},{"x":171,"y":2,"w":3,"cells":[[171,2,128],[172,2,129],[173,2,130],[171,3,131],[172,3,132],[173,3,133]]},{"x":219,"y":2,"w":3,"cells":[[219,2,128],[220,2,129],[221,2,130],[219,3,131],[220,3,132],[221,3,133]]},{"x":45,"y":2,"w":3,"cells":[[45,2,128],[46,2,129],[47,2,130],[45,3,131],[46,3,132],[47,3,133]]},{"x":93,"y":2,"w":3,"cells":[[93,2,128],[94,2,129],[95,2,130],[93,3,131],[94,3,132],[95,3,133]]},{"x":141,"y":2,"w":3,"cells":[[141,2,128],[142,2,129],[143,2,130],[141,3,131],[142,3,132],[143,3,133]]},{"x":189,"y":2,"w":3,"cells":[[189,2,128],[190,2,129],[191,2,130],[189,3,131],[190,3,132],[191,3,133]]},{"x":0,"y":3,"w":4,"cells":[[0,3,128],[1,3,129],[2,3,129],[3,3,130],[0,4,131],[1,4,132],[2,4,132],[3,4,133]]},{"x":48,"y":3,"w":4,"cells":[[48,3,128],[49,3,129],[50,3,129],[51,3,130],[48,4,131],[49,4,132],[50,4,132],[51,4,133]]},{"x":96,"y":3,"w":4,"cells":[[96,3,128],[97,3,129],[98,3,129],[99,3,130],[96,4,131],[97,4,132],[98,4,132],[99,4,133]]},{"x":144,"y":3,"w":4,"cells":[[144,3,128],[145,3,129],[146,3,129],[147,3,130],[144,4,131],[145,4,132],[146,4,132],[147,4,133]]},{"x":192,"y":3,"w":4,"cells":[[192,3,128],[193,3,129],[194,3,129],[195,3,130],[192,4,131],[193,4,132],[194,4,132],[195,4,133]]},{"x":18,"y":3,"w":3,"cells":[[18,3,128],[19,3,129],[20,3,130],[18,4,131],[19,4,132],[20,4,133]]},{"x":66,"y":3,"w":3,"cells":[[66,3,128],[67,3,129],[68,3,130],[66,4,131],[67,4,132],[68,4,133]]},{"x":114,"y":3,"w":3,"cells":[[114,3,128],[115,3,129],[116,3,130],[114,4,131],[115,4,132],[116,4,133]]},{"x":162,"y":3,"w":3,"cells":[[162,3,128],[163,3,129],[164,3,130],[162,4,131],[163,4,132],[164,4,133]]},{"x":210,"y":3,"w":3,"cells":[[210,3,128],[211,3,129],[212,3,130],[210,4,131],[211,4,132],[212,4,133]]},{"x":30,"y":3,"w":4,"cells":[[30,3,128],[31,3,129],[32,3,129],[33,3,130],[30,4,131],[31,4,132],[32,4,132],[33,4,133]]},{"x":78,"y":3,"w":4,"cells":[[78,3,128],[79,3,129],[80,3,129],[81,3,130],[78,4,131],[79,4,132],[80,4,132],[81,4,133]]},{"x":126,"y":3,"w":4,"cells":[[126,3,128],[127,3,129],[128,3,129],[129,3,130],[126,4,131],[127,4,132],[128,4,132],[129,4,133]]},{"x":174,"y":3,"w":4,"cells":[[174,3,128],[175,3,129],[176,3,129],[177,3,130],[174,4,131],[175,4,132],[176,4,132],[177,4,133]]},{"x":222,"y":3,"w":4,"cells":[[222,3,128],[223,3,129],[224,3,129],[222,4,131],[223,4,132],[224,4,132]]}],"trees":[{"x":13,"y":10,"h":3,"cells":[[13,10,13]]},{"x":61,"y":10,"h":3,"cells":[[61,10,13],[61,11,15],[61,12,78]]},{"x":109,"y":10,"h":3,"cells":[[109,10,13],[109,11,15],[109,12,78]]},{"x":157,"y":10,"h":3,"cells":[[157,10,13],[157,11,15],[157,12,78]]},{"x":21,"y":10,"h":3,"cells":[[21,10,13],[21,11,15],[21,12,78]]},{"x":117,"y":10,"h":3,"cells":[[117,10,13],[117,11,15],[117,12,78]]},{"x":165,"y":10,"h":3,"cells":[[165,10,13],[165,11,15],[165,12,78]]},{"x":213,"y":10,"h":3,"cells":[[213,10,13],[213,11,15],[213,12,78]]},{"x":43,"y":10,"h":3,"cells":[[43,10,13],[43,11,15],[43,12,78]]},{"x":91,"y":10,"h":3,"cells":[[91,10,13],[91,11,15],[91,12,78]]},{"x":139,"y":10,"h":3,"cells":[[139,10,13],[139,11,15],[139,12,78]]},{"x":11,"y":11,"h":2,"cells":[[11,11,14],[11,12,78]]},{"x":59,"y":11,"h":2,"cells":[[59,11,14],[59,12,78]]},{"x":155,"y":11,"h":2,"cells":[[155,11,14],[155,12,78]]},{"x":203,"y":11,"h":2,"cells":[[203,11,14],[203,12,78]]},{"x":23,"y":11,"h":2,"cells":[[23,11,14],[23,12,78]]},{"x":71,"y":11,"h":2,"cells":[[71,11,14],[71,12,78]]},{"x":119,"y":11,"h":2,"cells":[[119,11,14],[119,12,78]]},{"x":167,"y":11,"h":2,"cells":[[167,11,14],[167,12,78]]},{"x":215,"y":11,"h":2,"cells":[[215,11,14],[215,12,78]]},{"x":24,"y":11,"h":2,"cells":[[24,11,14],[24,12,78]]},{"x":72,"y":11,"h":2,"cells":[[72,11,14],[72,12,78]]},{"x":120,"y":11,"h":2,"cells":[[120,11,14],[120,12,78]]},{"x":168,"y":11,"h":2,"cells":[[168,11,14],[168,12,78]]},{"x":216,"y":11,"h":2,"cells":[[216,11,14],[216,12,78]]},{"x":40,"y":11,"h":2,"cells":[[40,11,14],[40,12,78]]},{"x":88,"y":11,"h":2,"cells":[[88,11,14],[88,12,78]]},{"x":136,"y":11,"h":2,"cells":[[136,11,14],[136,12,78]]}],"fences":[[16,12,2],[38,12,2],[41,12,1],[86,12,2],[110,12,4],[134,12,2],[137,12,1],[158,12,4],[182,12,1],[209,12,1]],"mushrooms":[],"hillCells":[],"bushCells":[]},"exit42":{"width":47,"clouds":[{"x":4,"y":2,"w":4,"cells":[[4,2,128],[5,2,129],[6,2,129],[7,2,130],[4,3,131],[5,3,132],[6,3,132],[7,3,133]]},{"x":35,"y":2,"w":3,"cells":[[35,2,128],[36,2,129],[37,2,130],[35,3,131],[36,3,132],[37,3,133]]},{"x":24,"y":3,"w":3,"cells":[[24,3,128],[25,3,129],[26,3,130],[24,4,131],[25,4,132],[26,4,133]]},{"x":43,"y":3,"w":4,"cells":[[43,3,128],[43,4,131],[44,4,132],[45,4,132],[45,3,129],[46,3,129],[46,4,132],[44,3,129]]}],"trees":[],"fences":[],"mushrooms":[],"hillCells":[[18,10,7],[17,11,5],[18,11,6],[19,11,8],[33,11,7],[16,12,5],[17,12,6],[18,12,10],[19,12,9],[20,12,8],[32,12,5],[33,12,6],[34,12,8]],"bushCells":[[31,12,4],[39,12,2],[40,12,3],[41,12,4]]}};
  function tiles(index,x,y,w,h,size=.85){
    // Square photographic cells retain round, visibly separate noodle strands
    // when the enclosing silhouette is wider or thinner than the photograph.
    const left=Math.floor(x/size)*size,top=Math.floor(y/size)*size;
    for(let yy=top;yy<y+h;yy+=size)for(let xx=left;xx<x+w;xx+=size)material(index,xx,yy,size,size);
  }
  function shapedPhoto(index,shape,x,y,w,h,size=.85){ctx.save();shape();ctx.clip();tiles(index,x,y,w,h,size);ctx.restore();}
  function tubePath(points,width){
    const left=[],right=[],r=width*.5;
    for(let i=0;i<points.length;i++){
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1;
      left.push([points[i][0]-dy/d*r,points[i][1]+dx/d*r]);right.push([points[i][0]+dy/d*r,points[i][1]-dx/d*r]);
    }
    ctx.beginPath();ctx.moveTo(...left[0]);for(let i=1;i<left.length;i++)ctx.lineTo(...left[i]);
    const e=points.at(-1);ctx.quadraticCurveTo(e[0]+(e[0]-points.at(-2)[0])*.3,e[1]+(e[1]-points.at(-2)[1])*.3,...right.at(-1));
    for(let i=right.length-2;i>=0;i--)ctx.lineTo(...right[i]);ctx.closePath();
  }
  function photoStrand(points,width,palette='pale',index=5,alpha=1){
    if(points.length<2)return;
    ctx.save();ctx.globalAlpha*=alpha;
    strand(points,width,palette,.85);
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs)-width,y=Math.min(...ys)-width,w=Math.max(...xs)-x+width,h=Math.max(...ys)-y+width;
    shapedPhoto(index,()=>tubePath(points,width*.83),x,y,w,h,.3);
    const hi=points.map(p=>[p[0]-width*.14,p[1]-width*.14]);strand(hi,width*.12,palette,.65);ctx.restore();
  }
  function softStrand(owner,key,x,y,length,width,palette='pale',index=5,{gravity=12,air=.978,angle=0,impulse=0,bend=.17,mirrored=false}={}){
    const now=getTime(),links=6,rest=length/links;
    let entries=motion.get(owner);if(!entries){entries=new Map();motion.set(owner,entries);}
    let m=entries.get(key);
    if(!m||Math.hypot(x-m.ax,y-m.ay)>2){
      const ps=Array.from({length:links+1},(_,i)=>{const d=i*rest,xx=x+Math.sin(angle)*d,yy=y+Math.cos(angle)*d;return{x:xx,y:yy,px:xx,py:yy};});
      m={ps,time:now,ax:x,ay:y,lastImpulse:0,mirrored};entries.set(key,m);
    }
    if(m.mirrored!==mirrored){for(const p of m.ps){p.x+=x-m.ax;p.px+=x-m.ax;p.y=y-(p.y-m.ay);p.py=y-(p.py-m.ay);}m.mirrored=mirrored;}
    const elapsed=clamp(now-m.time,0,1/24);m.time=now;m.ax=x;m.ay=y;
    if(impulse&&!m.lastImpulse){for(let i=1;i<m.ps.length;i++){m.ps[i].px-=Math.sin(angle)*impulse*i/links;m.ps[i].py+=impulse*i/links;}}
    m.lastImpulse=impulse;
    const steps=Math.max(1,Math.ceil(elapsed*120)),dt=elapsed/steps;
    for(let sub=0;elapsed>0&&sub<steps;sub++){
      for(let i=1;i<m.ps.length;i++){
        const p=m.ps[i],vx=(p.x-p.px)*Math.pow(air,dt*120),vy=(p.y-p.py)*Math.pow(air,dt*120);
        p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+gravity*dt*dt;
        // A weak bending memory keeps a cooked spine curled while allowing
        // the tip to lag behind a changing shell or cloud anchor.
        const t=i/links,rx=x+Math.sin(angle)*i*rest,ry=y+Math.cos(angle)*i*rest;
        p.x+=(rx-p.x)*bend*dt*120*(1-t*.75);p.y+=(ry-p.y)*bend*dt*120*(1-t*.75);
      }
      for(let pass=0;pass<7;pass++){
        m.ps[0].x=x;m.ps[0].y=y;
        for(let i=1;i<m.ps.length;i++){
          const a=m.ps[i-1],b=m.ps[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-8,f=(d-rest)/d;
          if(i===1){b.x-=dx*f;b.y-=dy*f;}else{a.x+=dx*f*.5;a.y+=dy*f*.5;b.x-=dx*f*.5;b.y-=dy*f*.5;}
        }
      }
      m.ps[0].x=x;m.ps[0].y=y;
      for(let i=1;i<m.ps.length;i++){
        const a=m.ps[i-1],b=m.ps[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-8;b.x=a.x+dx/d*rest;b.y=a.y+dy/d*rest;
      }
    }
    photoStrand(m.ps.map(p=>[p.x,p.y]),width,palette,index);
  }
  function shadedShape(mat,shape,x,y,w,h,size=.75){
    shapedPhoto(mat,shape,x,y,w,h,size);
    ctx.save();shape();ctx.clip();
    const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#fff6dc28');g.addColorStop(.4,'#ffffff00');g.addColorStop(1,'#0d100c66');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.restore();
  }
  function visible(e){return e&&!e.removed&&!e.hidden&&e.active!==false&&!(e.dead&&e.deathTimer<=0);}
  function drawEnemy(e,{area=''}={}){
    const kind=e?.kind||e?.type;
    if(kind!=='buzzy'&&kind!=='bulletbill'&&!e?.buzzy)return false;
    if(!visible(e))return true;
    const blue=area==='underground42',mat=blue?7:9,palette=blue?'blue':'dark',face=e.facing??Math.sign(e.vx||-1),flip=face>0;
    if(kind==='bulletbill'){
      const w=e.w??1,bodyY=e.y+.5;
      drawSprite(27,e.x,bodyY,w,1,{flip,flipY:!!e.flipped,alpha:e.dead?.8:1});
      if(!e.dead){
        const rear=e.x+(flip?.05:w-.05),angle=flip?-Math.PI/2:Math.PI/2;
        for(let k=0;k<3;k++)softStrand(e,'bill-tail'+k,rear,bodyY+.32+k*.17,.12+(k===1?.035:0),.023,'dark',9,{gravity:3,air:.966,angle,bend:.075});
      }
      return true;
    }
    const w=e.w??.92,h=e.h??1;
    if(kind==='shell'||e.type==='shell'||e.shell){
      const shape=()=>{ctx.beginPath();ctx.moveTo(e.x+.04,e.y+h*.83);ctx.bezierCurveTo(e.x-.025,e.y+h*.33,e.x+w*.16,e.y+.025,e.x+w*.5,e.y+.025);ctx.bezierCurveTo(e.x+w*.84,e.y+.025,e.x+w+.025,e.y+h*.33,e.x+w-.04,e.y+h*.83);ctx.quadraticCurveTo(e.x+w*.5,e.y+h+.02,e.x+.04,e.y+h*.83);ctx.closePath();};
      shadedShape(mat,shape,e.x,e.y,w,h,.5);
      for(let k=0;k<4;k++)coil(e.x+w*.5,e.y+h*.54,w*(.44-k*.08),h*(.42-k*.07),palette,.035,1.08);
      photoStrand([[e.x+.06,e.y+h*.82],[e.x+w*.5,e.y+h*.94],[e.x+w-.06,e.y+h*.82]],.055,'pale',5);
      return true;
    }
    drawSprite(blue?26:28,e.x-.015,e.y-.015,w+.03,h+.03,{flip,flipY:!!e.flipped,alpha:e.dead?.82:1});
    if(!e.dead){
      const rear=e.x+(flip?w*.21:w*.79),normalY=e.y+h*.77,anchorY=e.flipped?2*(e.y-.015)+h+.03-normalY:normalY;
      for(let k=0;k<2;k++)softStrand(e,'buzzy-rim'+k,rear+(k-.5)*.08,anchorY,.075,.02,palette,mat,{gravity:5,air:.974,angle:e.flipped?Math.PI:0,bend:.11,mirrored:!!e.flipped});
    }
    return true;
  }
  function drawRevealedBoss(b){
    if(!b||b.removed||b.active===false||b.y>17)return false;
    if((b.revealedKind||b.revealedEnemy)!=='spiny'||!(b.revealed||b.dead))return false;
    const w=b.w??2,h=b.h??2;drawSprite(25,b.x+w*.2,b.y+h*.33,w*.65,h*.58,{flip:b.facing>0,flipY:!!b.dead});return true;
  }
  function elastic(owner,key,target,impulse=0){
    const now=getTime();let all=flex.get(owner);if(!all){all=new Map();flex.set(owner,all);}
    let m=all.get(key);if(!m){m={time:now,value:0,v:0,impulse:null};all.set(key,m);}
    if(impulse&&impulse!==m.impulse){m.v+=.9;m.impulse=impulse;}
    const dt=clamp(now-m.time,0,1/24),steps=Math.max(1,Math.ceil(dt*120)),step=dt/steps;m.time=now;
    for(let k=0;dt>0&&k<steps;k++){m.v+=((target-m.value)*135-m.v*20)*step;m.value+=m.v*step;}
    return m.value;
  }
  function drawCannon(c){
    if(!c||c.removed)return;
    const x=c.x,y=c.y,w=c.w??1,h=c.h??2,shot=c.shots??c.lastShotAt??0;
    const bend=elastic(c,'recoil',0,shot),shape=()=>{ctx.beginPath();ctx.roundRect(x+.035,y+.025,w-.07,h-.025,.06);};
    shadedShape(9,shape,x,y,w,h,.62);
    for(let k=0;k<6;k++){
      const px=x+.1+k*(w-.2)/5;
      photoStrand([[px,y+h-.04],[px+(k-2.5)*.006,y+h*.56],[px+(k-2.5)*bend*.075,y+.14]],.045,'dark',9,.92);
    }
    for(let row=1;row<h;row++)photoStrand([[x+.055,y+row],[x+w*.5,y+row+.015],[x+w-.055,y+row]],.035,'pale',24,.7);
    const rim=()=>{ctx.beginPath();ctx.roundRect(x+.025,y+.045,w-.05,.65,.1);};
    shadedShape(24,rim,x+.025,y+.045,w-.05,.65,.45);
    const hole=()=>{ctx.beginPath();ctx.ellipse(x+w*.5,y+.365,w*.34,.235,0,0,TAU);};
    shadedShape(9,hole,x+.15,y+.12,w-.3,.49,.34);
    for(let k=0;k<2;k++)coil(x+w*.5,y+.365,w*(.34-k*.055),.235-k*.034,k?'dark':'pale',.036,1.1);
    for(const px of[x+.105,x+w-.105]){
      coil(px,y+.76,.048,.047,'pale',.026,1.13);
      softStrand(c,'cannon-fringe'+px,px,y+.67+bend*.15,.12,.024,'dark',9,{gravity:8,air:.973,angle:(px<x+w*.5?-1:1)*.35,bend:.1,impulse:Math.abs(bend)*.1});
    }
    return true;
  }
  function drawMushroom(t,{area='mushrooms43',player}={}){
    if(!t||t.removed)return;
    const x=t.x,y=t.y,w=t.w,h=t.h??1,data=SCENERY[area],source=data?.mushrooms.find(q=>q.x===x&&q.y===y),stemX=t.trunkX??x+Math.floor(w/2),stemW=t.trunkWidth??1;
    const cells=source?.stemCells??Array.from({length:Math.max(0,15-Math.ceil(y+h))},(_,k)=>[stemX,y+h+k,80]);
    const bottom=cells.length?Math.max(...cells.map(c=>c[1]))+1:y+h;
    if(cells.length){
      ctx.save();ctx.beginPath();for(const[cx,cy]of cells)ctx.rect(cx,cy,1,1);ctx.clip();
      shadedShape(22,()=>{ctx.beginPath();ctx.rect(stemX+.035,y+h,stemW-.07,bottom-y-h);},stemX,y+h,stemW,bottom-y-h,.65);
      for(let k=0;k<7;k++){
        const xx=stemX+.1+k*(stemW-.2)/6,points=[];
        for(let j=0;j<=Math.ceil((bottom-y-h)*3);j++){
          const yy=y+h+(bottom-y-h)*j/Math.max(1,Math.ceil((bottom-y-h)*3));points.push([xx+Math.sin(yy*2.5+k*.4)*.014,yy]);
        }
        photoStrand(points,.045,k%2?'coral':'pale',22,.8);
      }
      ctx.restore();
    }
    const loaded=player&&!player.hidden&&player.grounded&&Math.abs(player.y+player.h-y)<.09&&player.x+player.w>x&&player.x<x+w;
    const bend=elastic(t,'cap-load',loaded?.04:0),shape=()=>{
      ctx.beginPath();ctx.moveTo(x+.17,y+.025);ctx.lineTo(x+w-.17,y+.025);ctx.quadraticCurveTo(x+w-.025,y+.025,x+w-.025,y+.17);ctx.lineTo(x+w-.025,y+h-.14);ctx.quadraticCurveTo(x+w-.025,y+h-.035,x+w-.17,y+h-.035);ctx.quadraticCurveTo(x+w*.5,y+h-.035+bend,x+.17,y+h-.035);ctx.quadraticCurveTo(x+.025,y+h-.035,x+.025,y+h-.14);ctx.lineTo(x+.025,y+.17);ctx.quadraticCurveTo(x+.025,y+.025,x+.17,y+.025);ctx.closePath();
    };
    shadedShape(0,shape,x,y,w,h+bend,.7);
    ctx.save();shape();ctx.clip();
    for(let k=0;k<Math.ceil(w*2);k++){
      const xx=x+.27+k*.5,yy=y+(k%2?.25:.72);
      shadedShape(6,()=>{ctx.beginPath();ctx.ellipse(xx,yy,.205,.225,0,0,TAU);},xx-.22,yy-.24,.44,.48,.34);
      coil(xx,yy,.157,.172,'red',.027,1.08);
    }
    ctx.restore();
    photoStrand([[x+.07,y+.065],[x+w*.5,y+.06],[x+w-.07,y+.065]],.037,'pale',5,.82);
    photoStrand([[x+.07,y+h-.08],[x+w*.5,y+h-.06+bend],[x+w-.07,y+h-.08]],.047,'gold',0,.9);
    if(cells.length)for(let k=0;k<4;k++)photoStrand([[stemX+.06+k*.23,y+h-.01],[stemX+.17+k*.23,y+h+.18],[stemX+.28+k*.23,y+h-.01]],.027,'coral',22,.85);
    return true;
  }
  function clipCells(cells){ctx.beginPath();for(const[x,y]of cells)ctx.rect(x,y,1,1);ctx.clip();}
  function cloudPath(x,y,w){
    ctx.beginPath();ctx.moveTo(x+.025,y+1.96);ctx.lineTo(x+.025,y+1.15);
    for(let k=0;k<w;k++){
      const xx=x+k;ctx.bezierCurveTo(xx-.02,y+.42,xx+.22,y+.04,xx+.5,y+.15);ctx.bezierCurveTo(xx+.78,y+.01,xx+1.04,y+.48,xx+.985,y+1.18);
    }
    ctx.lineTo(x+w-.025,y+1.96);ctx.closePath();
  }
  function drawCloud(c){
    const{x,y,w}=c;ctx.save();clipCells(c.cells);shadedShape(5,()=>cloudPath(x,y,w),x,y,w,2,.9);
    for(let k=0;k<w*2;k++)coil(x+.25+k*.5,y+1.45,.22,.2,'pale',.034,1.12);
    for(const dx of[-.16,.16])photoShape(9,()=>{ctx.beginPath();ctx.ellipse(x+w*.5+dx,y+.94,.044,.115,0,0,TAU);},x+w*.5+dx-.05,y+.81,.1,.26);
    photoStrand([[x+.08,y+1.82],[x+w*.5,y+1.85],[x+w-.08,y+1.82]],.031,'pale',5,.8);ctx.restore();
  }
  function drawTree(t){
    const{x,y,h}=t,cx=x+.5,crownH=h-.72,rootY=y+crownH*.68;
    ctx.save();clipCells(t.cells);
    shapedPhoto(24,()=>{ctx.beginPath();ctx.roundRect(cx-.075,rootY,.15,y+h-rootY,.05);},cx-.075,rootY,.15,y+h-rootY,.5);
    for(let k=-1;k<=1;k++)photoStrand([[cx+k*.043,rootY],[cx+k*.047+.012,y+h-.46],[cx+k*.045,y+h]],.026,'pale',24);
    const shape=()=>{ctx.beginPath();ctx.moveTo(cx,y+.025);ctx.bezierCurveTo(x-.08,y+.09,x-.1,y+crownH*.77,x+.12,y+crownH*.95);ctx.quadraticCurveTo(cx,y+crownH*1.065,x+.88,y+crownH*.95);ctx.bezierCurveTo(x+1.1,y+crownH*.77,x+1.08,y+.09,cx,y+.025);ctx.closePath();};
    shadedShape(27,shape,x,y,1,crownH*1.07,.62);
    for(let k=0;k<5;k++){
      const f=k/4,px=x+.14+f*.72;
      photoStrand([[cx+(f-.5)*.17,y+.07],[px,y+crownH*.36],[px+(f-.5)*.025,y+crownH*.77],[cx+(f-.5)*.54,y+crownH*.97]],.033,'pale',27,.8);
    }
    ctx.restore();
  }
  function drawFence(x,y,w){
    for(const yy of[y+.28,y+.72])photoStrand([[x,yy],[x+w*.5,yy+.008],[x+w,yy]],.07,'pale',27,.85);
    for(let px=x+.13;px<x+w;px+=.5)photoStrand([[px,y+.04],[px+.012,y+.47],[px,y+.96]],.07,'pale',27,.9);
  }
  function drawHill(peak,cells){
    const[x,y]=peak,h=13-y,w=h*2-1,left=x-(h-1),right=left+w,cx=x+.5;
    ctx.save();clipCells(cells.filter(c=>c[0]>=left&&c[0]<right));
    const shape=()=>{ctx.beginPath();ctx.moveTo(left,13);ctx.lineTo(x,y+1);ctx.quadraticCurveTo(x,y+.16,cx,y+.12);ctx.quadraticCurveTo(x+1,y+.16,x+1,y+1);ctx.lineTo(right,13);ctx.closePath();};
    shadedShape(3,shape,left,y,w,h,.85);ctx.save();shape();ctx.clip();
    for(let k=0;k<7;k++){const f=k/6,px=left+.16+f*(w-.32),top=y+.2+Math.abs(f-.5)*h*1.5;photoStrand([[px,12.96],[px+(cx-px)*.17,(top+13)*.5],[cx+(px-cx)*.34,top]],.035,'green',3,.8);}
    ctx.restore();ctx.restore();
  }
  function drawBush(cells){
    const first=cells[0],last=cells.at(-1),left=first[0]-(first[2]===2?0:1),right=last[0]+1,w=right-left;
    ctx.save();clipCells(cells);
    const shape=()=>{ctx.beginPath();ctx.moveTo(left,13);ctx.quadraticCurveTo(left+.01,12.34,left+.45,12.25);for(let x=left+.45;x<right-.45;x+=.55)ctx.quadraticCurveTo(x+.22,11.98,Math.min(right-.45,x+.55),12.25);ctx.quadraticCurveTo(right-.01,12.34,right,13);ctx.closePath();};
    shapedPhoto(3,shape,left,12,w,1,.65);for(let x=left+.22;x<right;x+=.38)coil(x,12.71,.17,.18,'green',.03,1.13);ctx.restore();
  }
  for(const data of Object.values(SCENERY)){
    data.bushGroups=[];for(const cell of data.bushCells){const group=data.bushGroups.at(-1);if(!group||cell[0]!==group.at(-1)[0]+1)data.bushGroups.push([cell]);else group.push(cell);}
  }
  function drawScenery({area,level,camera=0,viewWidth=20}={}){
    const data=SCENERY[area];if(!data)return false;
    for(const c of data.clouds)if(c.x+c.w>camera-.1&&c.x<camera+viewWidth+.1)drawCloud(c);
    for(const t of data.trees)if(t.x+1>camera&&t.x<camera+viewWidth)drawTree(t);
    for(const[x,y,w]of data.fences)if(x+w>camera&&x<camera+viewWidth)drawFence(x,y,w);
    for(const[x,y,id]of data.hillCells)if(id===7&&x+3>camera&&x-3<camera+viewWidth)drawHill([x,y],data.hillCells);
    for(const cells of data.bushGroups)if(cells.at(-1)[0]+1>camera&&cells[0][0]<camera+viewWidth)drawBush(cells);
    return true;
  }
  return {drawEnemy,drawCannon,drawMushroom,drawScenery,drawRevealedBoss};
}
