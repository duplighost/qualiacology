import { groundY, shell, gableFloor, glowColumn, PANE_WINDOW, ON_APRON } from './sites.js';
import { P, solid, banner, icicles, lantern, chair, chest, arch, snowCap, stucco } from './holdfast-town-art.js';

export function furnishRoom(k, api, b, y) {
  const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), P2 = (x, z) => [b.x + x * cy + z * sy, b.z - x * sy + z * cy];
  const mineral = c => c === P.stone || c === P.darkStone || c === P.edge;
  const box = (w, h, d, x, yy, z, c = P.wood, tag = 'wood') => {
    const [px, pz] = P2(x, z); solid(mineral(c) ? k : { solid: k.cloth }, api, w, h, d, px, y + yy, pz, c, b.yaw, tag);
  };
  const detail = (w, h, d, x, yy, z, c = P.wood) => { const [px, pz] = P2(x, z); (mineral(c) ? k.solid : k.cloth).box(w, h, d, px, y + yy, pz, c, b.yaw); };
  // Furnishings sit at the edges; the actual resident and shopkeeper stand on the
  // clear axis between the door and room centre from the shared town plan.
  const back = b.d / 2 - 0.62;
  box(b.w * 0.60, 2.65, 0.48, 0, 1.325, back);
  for (let row = 0; row < 3; row++) {
    detail(b.w * 0.61, 0.08, 0.65, 0, 0.55 + row * 0.79, back - 0.12, P.cutWood);
    for (let j = 0; j < 7; j++) {
      const px = (j - 3) * b.w * 0.075, base = 0.59 + row * 0.79;
      if (b.use === 'archive' || b.use === 'school') {
        const h = 0.25 + (j + row) % 3 * 0.075;
        detail(0.14 + j % 3 * 0.04, h, 0.20, px, base + h / 2, back - 0.38, [0.08 + j % 3 * 0.022, 0.055, 0.04]);
        detail(0.07, 0.025, 0.012, px, base + h * 0.72, back - 0.488, P.paper);
      } else {
        const [xx, zz] = P2(px, back - 0.38);
        if ((j + row) % 3 === 0) {
          const h = 0.20 + j % 2 * 0.09;
          k.cloth.cyl(0.10, 0.115, h, 10, xx, y + base + h / 2, zz, [0.042, 0.070, 0.055]);
          k.cloth.cyl(0.047, 0.093, 0.06, 10, xx, y + base + h + 0.03, zz, P.cloth);
          k.cloth.cyl(0.044, 0.044, 0.08, 8, xx, y + base + h + 0.10, zz, P.cutWood);
          k.cloth.cyl(0.104, 0.116, 0.047, 10, xx, y + base + h * 0.55, zz, P.paper);
        } else if (b.use === 'bakery' && j % 2) {
          k.cloth.cyl(0.13, 0.16, 0.15, 12, xx, y + base + 0.075, zz, P.cutWood);
          k.cloth.cone(0.132, 0.095, 12, xx, y + base + 0.19, zz, P.cutWood);
          for (let score = -1; score <= 1; score++) detail(0.016, 0.012, 0.14, px + score * 0.05, base + 0.20, back - 0.38, P.paper);
        } else {
          const h = 0.20 + (j + row) % 3 * 0.05;
          k.cloth.cyl(0.13, 0.16, h, 10, xx, y + base + h / 2, zz, j % 2 ? P.paper : P.cloth);
          k.cloth.cone(0.13, 0.10, 10, xx, y + base + h + 0.05, zz, j % 2 ? P.paper : P.cloth);
          k.cloth.cyl(0.032, 0.046, 0.065, 8, xx, y + base + h + 0.11, zz, P.wood);
        }
      }
    }
  }
  const hearthX = -b.w / 2 + 1.0;
  if (!b.id.startsWith('keep-')) {
  box(1.3, 0.20, 1.3, hearthX, 0.10, 1.1, P.darkStone, 'stone');
  for (const off of [-0.63, 0.63]) box(0.22, 1.30, 1.0, hearthX + off, 0.70, 1.1, P.stone, 'stone');
  detail(1.65, 0.22, 1.25, hearthX, 1.42, 1.1, P.edge);
  const [fx, fz] = P2(hearthX, 1.1); glowColumn(k.live, fx, y + 0.18, fz, 0.23, 0.77, 0.21);
  }
  const [lampX, lampZ] = P2(b.w / 2 - 0.72, -b.d / 2 + 0.32);
  lantern(k, lampX, y + 2.5, lampZ, b.yaw);
  k.solid.cyl(0.016, 0.016, 0.62, 5, lampX, y + 2.99, lampZ, P.iron);
  const tableX = b.w * 0.25, roomTable = !b.id.startsWith('keep-');
  if (roomTable) {
  box(2.0, 0.13, 1.25, tableX, 0.89, 0.55, P.cutWood);
  for (const xx of [-0.80, 0.80]) for (const zz of [-0.45, 0.45]) detail(0.11, 0.85, 0.11, tableX + xx, 0.43, 0.55 + zz);
  for (const zz of [-0.72, 1.85]) { const [px, pz] = P2(tableX, zz); chair(k, api, px, y, pz, b.yaw + (zz < 0 ? Math.PI : 0)); }
  }
  if (b.use === 'weapons') {
    for (let j = 0; j < 5; j++) {
      const xx = -2.2 + j * 1.1;
      detail(0.11, 1.05, 0.12, xx, 1.45, back - 0.55, P.iron);
      detail(0.18, 0.45, 0.22, xx, 0.83, back - 0.56, P.cutWood);
      detail(0.26, 0.18, 0.26, xx, 1.17, back - 0.55, P.iron);
    }
    detail(0.70, 0.12, 0.28, tableX, 1.00, 0.5, P.iron);
    detail(0.54, 0.18, 0.42, tableX - 0.62, 1.06, 0.70, P.paper);
  } else if (b.use === 'car') {
    const [tx, tz] = P2(-b.w * 0.25, -1.25);
    for (let i = 0; i < 3; i++) k.solid.tube(0.58, 0.58, 0.27, 12, tx, y + 0.15 + i * 0.28, tz, P.iron);
    box(1.05, 0.60, 0.75, tableX, 1.18, 0.5, P.iron);
    for (let i = 0; i < 4; i++) detail(0.08, 0.26, 0.79, tableX - 0.36 + i * 0.24, 1.50, 0.5, P.edge);
    detail(1.25, 0.04, 0.15, tableX - 0.25, 0.99, 0.05, P.iron);
  } else if (b.use === 'home' || b.use === 'inn' || b.use === 'infirmary') {
    box(1.55, 0.43, 2.65, -b.w * 0.24, 0.27, -1.18);
    detail(1.40, 0.18, 2.40, -b.w * 0.24, 0.55, -1.18, b.use === 'infirmary' ? P.paper : P.purple);
    detail(1.12, 0.19, 0.54, -b.w * 0.24, 0.72, -0.37, P.paper);
    if (b.use === 'infirmary') {
      detail(0.75, 0.05, 0.23, -b.w * 0.24, 0.665, -1.6, P.red);
      detail(0.23, 0.05, 0.75, -b.w * 0.24, 0.668, -1.6, P.red);
    }
  } else if (b.use === 'kitchen' || b.use === 'bakery') {
    if (roomTable) for (let i = 0; i < 5; i++) {
      const [px, pz] = P2(tableX - 0.72 + (i % 3) * 0.6, 0.27 + Math.floor(i / 3) * 0.6);
      k.solid.cyl(0.18, 0.13, 0.10, 10, px, y + 1.0, pz, b.use === 'bakery' ? P.cutWood : P.iron);
    }
    const [px, pz] = P2(hearthX, 1.1); if (!b.id.startsWith('keep-')) k.solid.cyl(0.32, 0.23, 0.36, 12, px, y + 0.71, pz, P.iron);
  } else if (b.use === 'school' || b.use === 'archive') {
    box(2.8, 1.6, 0.12, -b.w / 2 + 1.62, 2.10, -b.d / 2 + 0.3, P.darkStone);
    for (let i = 0; i < 17; i++) detail(0.025, 0.20, 0.02, -b.w / 2 + 0.43 + (i % 9) * 0.27, 2.42 - Math.floor(i / 9) * 0.43, -b.d / 2 + 0.22, P.paper);
    if (roomTable) detail(0.8, 0.045, 0.57, tableX, 0.98, 0.6, P.paper);
  } else if (b.use === 'garden') {
    for (let i = 0; i < 6; i++) {
      const [px, pz] = P2(-3 + i * 1.2, back - 1.2);
      k.solid.cyl(0.29, 0.22, 0.5, 9, px, y + 0.25, pz, P.cutWood);
      for (let j = 0; j < 4; j++) k.solid.cone(0.12, 0.5, 5, px + Math.sin(j * 2) * 0.1, y + 0.61, pz + Math.cos(j * 2) * 0.1, [0.037, 0.078, 0.052], j, 0.22, 0.22);
    }
  } else if (b.use === 'bells') {
    for (let i = 0; i < 3; i++) { const [px, pz] = P2(-2 + i * 2 + (i === 1 ? 0.75 : 0), -1.0); k.solid.cyl(0.11, 0.38, 0.52, 12, px, y + 2.9, pz, P.iron); k.solid.cyl(0.02, 0.02, 2.1, 4, px, y + 1.7, pz, P.paper); }
  } else if (b.use === 'memorial') {
    for (let i = 0; i < 4; i++) {
      const [px, pz] = P2(-3 + i * 1.8, -1.8); chair(k, api, px, y, pz, b.yaw);
      detail(0.33, 0.09, 0.28, -3 + i * 1.8, 0.61, -1.8, i % 2 ? P.purple : P.paper);
    }
  } else if (b.use === 'candles') {
    if (roomTable) for (let i = 0; i < 12; i++) { const [px, pz] = P2(tableX - 0.7 + i % 4 * 0.42, 0.14 + Math.floor(i / 4) * 0.35); k.solid.cyl(0.055, 0.068, 0.27 + i % 3 * 0.09, 7, px, y + 1.14, pz, P.paper); }
  } else if (b.use === 'cloth') {
    box(2.0, 1.8, 0.17, -b.w * 0.27, 1.2, -0.8);
    for (let i = 0; i < 9; i++) detail(0.035, 1.42, 0.022, -b.w * 0.27 - 0.75 + i * 0.19, 1.20, -0.92, P.paper);
    detail(1.5, 0.77, 0.025, -b.w * 0.27, 0.8, -0.93, P.purple);
  }
  if (['archive', 'inn', 'memorial'].includes(b.use) || b.id === 'outer-home') {
    const [cx, cz] = P2(b.w / 2 - 1.0, back - 0.7); chest(k, api, cx, y, cz, b.yaw);
  }
}

export function building(k, api, b, rng) {
  const y = (b.y ? api.padY + b.y : groundY(api,b.x,b.z)) + ON_APRON;
  const cy=Math.cos(b.yaw),sy=Math.sin(b.yaw),P2=(x,z)=>[b.x+x*cy+z*sy,b.z-x*sy+z*cy];
  const dw=b.use==='car'?3.2:2.35, front=-b.d/2, hash=[...b.id].reduce((a,c)=>a+c.charCodeAt(0),0);
  const plaster=[[.135,.137,.141],[.116,.133,.140],[.150,.128,.108],[.121,.114,.139]][hash%4];
  const timber=hash%2?P.wood:[.046,.034,.030];
  const put=(kit,w,h,d,x,yy,z,c=P.stone,physical=false)=>{
    const [px,pz]=P2(x,z);
    if(physical)solid({solid:kit},api,w,h,d,px,y+yy,pz,c,b.yaw,c===timber?'wood':'wall');
    else (c===P.snow?k.cloth:kit).box(w,h,d,px,y+yy,pz,c,b.yaw);
  };
  // Footings and upper plaster are disjoint surfaces. Upper houses start at their
  // terrace, not at terrain height; their walls never grow down through lower rooms.
  const wall=(w,d,x,z,door=false)=>{
    const lower=Math.min(3.2,b.h),top=b.h;
    put(k.solid,w,lower,d,x,lower/2,z,P.stone,true);
    if(top>lower){const[px,pz]=P2(x,z);stucco(k,w,top-lower,d,px,y+(top+lower)/2,pz,plaster,b.yaw,hash);api.emit({kind:'obb',x:px,z:pz,halfX:w/2,halfZ:d/2,yaw:b.yaw,y0:y+lower,y1:y+top,tag:'wall'});}
  };
  wall(b.w,.44,0,b.d/2);wall(.44,b.d,-b.w/2,0);wall(.44,b.d,b.w/2,0);
  const flank=(b.w-dw)/2;
  for(const side of[-1,1])wall(flank,.44,side*(dw+flank)/2,front);
  put(k.solid,dw,b.h-3.12,.44,0,(b.h+3.12)/2,front,P.stone,true);
  solid(k,api,b.w,.14,b.d,b.x,y-.005,b.z,P.darkStone,b.yaw,'floor');
  const[dx,dz]=P2(0,front-.17);arch(k,api,dx,dz,dw,2.24,.64,.64,y,b.yaw);
  // Irregular stone quoins, carved lintels, exposed braces and deeply framed glass
  // give each facade depth without painting a grid over every material.
  for(const side of[-1,1]){
    put(k.solid,.63,b.h+.12,.69,side*(b.w/2-.10),b.h/2,front-.08,P.darkStone);
    for(let i=0;i<Math.ceil(b.h/.57);i++)put(k.solid,i%2?.76:.57,.23,.76,side*(b.w/2-.1),.38+i*.57,front-.08,P.edge);
    put(k.cloth,.19,Math.max(.1,b.h-3.15),.22,side*b.w*.21,(b.h+3.15)/2,front-.31,timber);
    for(const zz of[front,b.d/2])put(k.cloth,b.w+.28,.18,.23,0,3.19,zz,timber);
    put(k.solid,.68,.37,b.d+.62,side*b.w/2,.16,0,P.darkStone);
  }
  for(const row of b.h>5.5?[0,1]:[0])for(const side of[-1,1]){
    const wx=side*b.w*.29,wy=row?Math.min(b.h-1.35,4.90):1.85;
    put(k.solid,1.55,1.95,.20,wx,wy,front-.27,P.darkStone);
    const[gx,gz]=P2(wx,front-.395);
    k.live.pane(1.12,1.47,gx,y+wy,gz,PANE_WINDOW,b.yaw+Math.PI,0,4,5);
    put(k.cloth,.075,1.66,.23,wx,wy,front-.405,timber);
    put(k.cloth,1.34,.075,.23,wx,wy,front-.405,timber);
    put(k.solid,1.82,.18,.57,wx,wy-.99,front-.32,P.edge);
    put(k.solid,1.82,.21,.42,wx,wy+1.02,front-.30,P.edge);
    for(const ss of[-1,1])put(k.cloth,.37,1.79,.18,wx+ss*.92,wy,front-.34,hash%3?P.purple:P.cloth);
    const[ix,iz]=P2(wx,front-.53);icicles(k,ix,y+wy+1.08,iz,1.80,b.yaw,rng);
    if(!row&&b.use==='garden')for(let i=0;i<3;i++){
      const[px,pz]=P2(wx+(i-1)*.38,front-.65);
      k.cloth.cyl(.14,.10,.27,8,px,y+wy-.80,pz,P.cutWood);
      k.cloth.cone(.16,.45,6,px,y+wy-.46,pz,[.04,.078,.05]);
    }
  }
  const faceWindow=(ux,uz,angle,wy,wide=1.02)=>{
    const[x,z]=P2(ux,uz),a=b.yaw+angle,nx=Math.sin(a),nz=Math.cos(a);
    k.solid.box(wide+.38,1.95,.19,x+nx*.255,y+wy,z+nz*.255,P.darkStone,a);
    k.live.pane(wide,1.43,x+nx*.365,y+wy,z+nz*.365,PANE_WINDOW,a,0,4,5);
    k.cloth.box(.06,1.65,.20,x+nx*.38,y+wy,z+nz*.38,timber,a);
    k.cloth.box(wide+.18,.07,.20,x+nx*.38,y+wy,z+nz*.38,timber,a);
    k.solid.box(wide+.65,.19,.47,x+nx*.28,y+wy-1.04,z+nz*.28,P.edge,a);
    k.solid.box(wide+.55,.17,.32,x+nx*.29,y+wy+1.03,z+nz*.29,P.edge,a);
    snowCap(k,x+nx*.31,y+wy+1.125,z+nz*.31,wide+.67,.39,a,.10,hash+wy);
    for(const side of[-1,1]){
      const dx=Math.cos(a)*side*(wide/2+.29),dz=-Math.sin(a)*side*(wide/2+.29);
      k.cloth.box(.21,1.80,.17,x+dx+nx*.30,y+wy,z+dz+nz*.30,hash%2?P.purple:timber,a);
    }
  };
  for(const side of[-1,1]){
    for(const zz of[-b.d*.27,b.d*.27])for(const wy of b.h>5.6?[1.85,4.85]:[1.85])faceWindow(side*b.w/2,zz,side*Math.PI/2,wy);
    for(const zz of[-b.d*.47,0,b.d*.47]){
      const[x,z]=P2(side*(b.w/2+.28),zz);
      k.cloth.box(.19,Math.max(.1,b.h-3.14),.20,x,y+(b.h+3.14)/2,z,timber,b.yaw);
    }
    for(const yy of[3.23,b.h-.06]){
      const[x,z]=P2(side*(b.w/2+.28),0);k.cloth.box(.22,.19,b.d+.20,x,y+yy,z,timber,b.yaw);
    }
    // A diagonal brace cuts the large upper panels into smaller bays.
    if(b.h>5.7){const[x,z]=P2(side*(b.w/2+.32),b.d*.20);k.cloth.box(.17,2.55,.15,x,y+4.55,z,timber,b.yaw,side*.36);}
  }
  for(const xx of[-b.w*.28,b.w*.28])for(const wy of b.h>5.6?[1.85,4.85]:[1.85])faceWindow(xx,b.d/2,0,wy);
  const[backX,backZ]=P2(0,b.d/2+.27);k.cloth.box(b.w+.22,.20,.22,backX,y+3.23,backZ,timber,b.yaw);
  // Supported roof terraces are actual addresses reached from the high streets.
  if(b.terrace){
    solid(k,api,b.w+.60,.30,b.d+.60,b.x,y+b.h-.15,b.z,P.edge,b.yaw,'floor');
    for(const side of[-1,1]){
      put(k.solid,.25,.85,b.d+.46,side*(b.w/2+.14),b.h+.425,0,P.stone,true);
      put(k.solid,.41,.09,b.d+.52,side*(b.w/2+.14),b.h+.91,0,P.snow);
    }
    for(const side of[-1,1]){
      const[x,z]=P2(side*(b.w/2+.14),0);snowCap(k,x,y+b.h+.96,z,.51,b.d+.65,b.yaw,.12,hash+side);
    }
    // End parapets flank a central door-sized passage on each face.
    for(const zz of[-b.d/2-.13,b.d/2+.13])for(const side of[-1,1]){
      const w=(b.w-3.0)/2;put(k.solid,w,.85,.25,side*(1.5+w/2),b.h+.425,zz,P.stone,true);
      put(k.solid,w+.03,.09,.41,side*(1.5+w/2),b.h+.91,zz,P.snow);
    }
  }else{
    const roofYaw=b.yaw+Math.PI/2,rise=b.y?1.35:1.8+(hash%3)*.35;
    k.solid.gable(b.d+.75,b.w+.70,y+b.h,rise,b.x,0,b.z,P.slate,roofYaw);
    gableFloor(api,b.x,b.z,b.d+.75,b.w+.70,y+b.h,rise,roofYaw);
    snowCap(k,b.x,y+b.h+.075,b.z,b.w+.56,b.d+.60,b.yaw,.17,hash,(x,z)=>rise*(1-Math.abs(z)/((b.d+.75)/2)));
    // The roof has a small lit dormer on one pitch, with a supported cap.
    if(b.w>=10&&hash%3!==0){
      const uz=(hash%2?1:-1)*b.d*.26,[x,z]=P2(b.w*.21,uz),base=y+b.h+rise*(1-Math.abs(uz)/((b.d+.75)/2));
      const angle=b.yaw+(uz>0?0:Math.PI),nx=Math.sin(angle),nz=Math.cos(angle);
      solid(k,api,1.7,1.15,1.05,x,base+.35,z,P.darkStone,b.yaw);
      k.live.pane(.78,.71,x+nx*.55,base+.53,z+nz*.55,PANE_WINDOW,angle,0,4,4);
      k.cloth.box(.06,.88,.11,x+nx*.59,base+.53,z+nz*.59,timber,angle);
      k.solid.gable(1.96,1.35,base+.94,.68,x,0,z,P.slate,b.yaw);
      gableFloor(api,x,z,1.96,1.35,base+.94,.68,b.yaw);
      snowCap(k,x,base+1.01,z,1.88,1.28,b.yaw,.11,hash,(x)=>.68*(1-Math.abs(x)/.98));
    }
    // Roof seams sit above the true pitch, never approximately through it.
    for(const side of[-1,1])for(let i=0;i<4;i++){
      const lx=side*(.8+i*(b.d/2-.9)/4),zz=-b.w/2;
      const[x,z]=P2(0,lx),height=y+b.h+rise*(1-Math.abs(lx)/((b.d+.75)/2))+.105;
      k.solid.box(b.w+.76,.045,.075,x,height,z,P.edge,b.yaw);
    }
    const[rx,rz]=P2(0,front-.45);icicles(k,rx,y+b.h-.07,rz,b.w+.90,b.yaw,rng);
    const[chx,chz]=P2(-b.w*.32,b.d*.2);
    k.solid.box(.78,2.30,.85,chx,y+b.h+.70,chz,P.darkStone,b.yaw);
    k.solid.box(1.06,.20,1.11,chx,y+b.h+1.93,chz,P.snow,b.yaw);
  }
  const[bx,bz]=P2(-b.w*.30,front-.66);banner(k,bx,y+Math.min(b.h-.2,4.4),bz,.72,1.55,b.yaw+Math.PI);
  const[lx,lz]=P2(dw/2+.48,front-.51);lantern(k,lx,y+2.70,lz,b.yaw+Math.PI);
  for(let i=0;i<8;i++){
    const[fx,fz]=P2(-b.w/2+.75+i%4*.28,front-.71);
    k.cloth.cyl(.11,.12,.64,6,fx,y+.13+Math.floor(i/4)*.24,fz,P.cutWood,b.yaw,Math.PI/2);
  }
  furnishRoom(k,api,b,y+.075);
}
