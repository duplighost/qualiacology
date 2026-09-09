// The station's small, authored exploration loop. Coordinates are relative to its pad.
export const OPENING = Object.freeze({
  id:'filling-station', x:-520, z:240,
  tower:{x:16,z:-17,deck:12},
  car:{x:13,z:11,heading:-2.49},
  path:[[7,5],[9,-7],[9,-16],[9,-24],[17,-28],[26,-24],[29,-14],[28,-3],[21,4],[13,9]],
  trees:[[-36,-21,0,.94],[-32,-29,4,.85],[-23,-30,1,1.1],[-11,-29,0,.9],[-3,-33,4,1.15],
    [7,-35,1,1.2],[16,-36,0,1.05],[25,-32,4,.93],[33,-25,1,1.1],[36,-14,0,1.14],
    [35,-3,4,1.1],[32,8,1,.85],[28,16,0,1.08],[22,24,4,1],[7,31,1,1.1],
    [-5,32,0,1.14],[-17,29,4,1.1],[-31,22,1,.92],[-38,12,0,1],[-39,-3,4,.9],
    [28,-18,4,.72],[30,-6,0,.85],[6,-27,1,.80],[-3,-22,4,.72]],
  supplies:[
    {id:'woodstore',x:2.6,z:-20.7,kind:'crate'},
    {id:'tower-foot',x:19,z:-17,kind:'crate'},
    {id:'tower-top',x:18.5,z:-14.3,y:12.08,kind:'crate',cash:60,xp:60},
    {id:'fallen-log',x:29,z:-22,kind:'crate'},
    {id:'cedar',x:31,z:-2,kind:'crate'},
    {id:'garden',x:6,z:-24,kind:'dig'},
    {id:'roots',x:26,z:-28,kind:'dig'},
    {id:'old-fence',x:29,z:5,kind:'dig'},
  ],
});
