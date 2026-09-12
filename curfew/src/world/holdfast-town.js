// A continuous inhabited town inside the existing keep and curtain. All rooms have
// actual door gaps; upper lanes have stairs, floors and open arches beneath them.
import { Kit, kits, groundY, ON_APRON, GLOW } from './sites.js';
import { HOLDFAST_TOWN } from './holdfast-town-layout.js';
import { dressHoldfastKeep } from './holdfast-keep.js';
import { building } from './holdfast-town-houses.js';
import { P, solid, cylinder, crescent, banner, icicles, lantern, brazier, statue, arch, path, bakePaths, snowCap, lowWall, chair, chest } from './holdfast-town-art.js';

function upperStreet(k, api, rng) {
  const floorY = api.padY + ON_APRON + 6.30;
  for (const side of [-1, 1]) {
    const x = side * 40;
    for (let i = 0; i < 18; i++) {
      const z = 24.25 + i * 0.92, g = api.padY + ON_APRON;
      solid(k, api, 3.1, (i + 1) * 0.35, 0.95, x, g + (i + 1) * 0.175, z, i % 3 ? P.darkStone : P.stone, 0, 'stone');
      for (const s of [-1, 1]) solid(k, api, 0.20, 0.88, 0.90, x + s * 1.55, g + (i + 1) * 0.35 + 0.44, z, P.stone);
    }
    solid(k, api, 4.0, 0.28, 5.2, x, floorY - 0.14, 42.3, P.stone);
  }
  for (const cx of [-32, -16, 0, 16, 32]) {
    arch(k, api, cx, 42.0, 14.2, 4.00, 1.48, 2.6, api.padY + ON_APRON);
    solid(k, api, 16.08, 0.34, 3.8, cx, floorY - 0.17, 42.0, P.stone);
  }
  for (const z of [40.1, 43.9]) {
    for (let x = -36; x <= 36; x += 4) {
      if(Math.abs(x)===36)continue;
      solid(k, api, 3.97, 0.85, 0.27, x, floorY + 0.42, z, P.stone);
      snowCap(k,x,floorY+.98,z,4.08,.54,0,.14,x+z);
      for (const dx of [-1.84, 1.84]) k.solid.box(0.26, 1.14, 0.42, x + dx, floorY + 0.53, z, P.edge);
    }
  }
  // Four narrow streets make the upper town a connected neighbourhood. The
  // stair flights remain open above; inner and outer lanes pass on either side.
  for (const side of [-1, 1]) {
    for (const lane of [36,44]) {
      for (const [lo,hi] of [[12,35],[35,58]]) solid(k,api,3.0,.28,hi-lo,side*lane,floorY-.14,(lo+hi)/2,P.stone,0,'floor');
      for (const z of [14,22,38,56]) {
        const x=side*(lane+(lane===36?-1.12:1.12));
        solid(k,api,.48,6.0,.48,x,api.padY+ON_APRON+3,z,P.darkStone);
        k.solid.box(.90,.22,.9,x,floorY-.32,z,P.edge);
      }
      for(let z=12.6;z<57.5;z+=1.15)for(const edge of[-1,1]) {
        const bridge=lane===36?[28,31,42,50,51]:[16,34,35,42,52];
        if(bridge.some(v=>Math.abs(v-z)<2.4))continue;
        solid(k,api,.13,.9,1.12,side*lane+edge*1.48,floorY+.45,z,P.iron,0,'metal');
      }
    }
    for(const z of side<0?[31,51]:[28,50]){
      solid(k,api,5.7,.28,2.7,side*33.65,floorY-.14,z,P.stone,0,'floor');
      for(const e of[-1,1])solid(k,api,3.6,.85,.15,side*32.60,floorY+.425,z+e*1.34,P.iron,0,'metal');
    }
    for(const z of side<0?[16,34,52]:[17,35,52]){
      solid(k,api,6.15,.28,2.7,side*46.35,floorY-.14,z,P.stone,0,'floor');
      for(const e of[-1,1])solid(k,api,3.8,.85,.15,side*47.5,floorY+.425,z+e*1.34,P.iron,0,'metal');
    }
    solid(k,api,10.7,.28,3.6,side*40,floorY-.14,42,P.stone,0,'floor');
    for(const z of[17,53]){lantern(k,side*44,floorY+2.1,z,0,true);banner(k,side*44,floorY-.2,z,1.05,2.1,side*Math.PI/2);}
    // The candlehouse and infirmary terraces remain open gardens and laundry yards.
    const tx=side*53,tz=side<0?16:17;
    for(let i=0;i<5;i++){
      k.cloth.cyl(.28,.21,.48,9,tx-2+i,floorY+.24,tz+3.0,P.cutWood);
      k.cloth.cone(.20,.56,6,tx-2+i,floorY+.74,tz+3,[.04,.078,.05]);
    }
    for(const x of[tx-3,tx+3])solid(k,api,.12,2.55,.12,x,floorY+1.275,tz-2.4,P.wood,0,'wood');
    k.cloth.box(6,.028,.028,tx,floorY+2.48,tz-2.4,P.iron);
    for(let i=0;i<4;i++)k.cloth.box(.94,1.1,.035,tx-2.2+i*1.45,floorY+1.94,tz-2.4,i%2?P.paper:P.purple,0,0,.04*(i-2));
  }
  for (const x of [-22, 0, 22]) {
    banner(k, x, floorY - 0.75, 44.13, 1.35, 2.15, 0, x === 0);
    k.solid.cyl(0.055, 0.072, 0.64, 7, x, floorY + 1.10, 43.9, P.iron);
    lantern(k, x, floorY + 1.58, 43.9, 0, true);
  }
  for(const cx of[-32,-16,0,16,32]){icicles(k,cx,floorY-.30,43.86,13,0,rng);snowCap(k,cx,floorY+.025,42.95,15,.85,0,.12,cx);}
  chest(k, api, 40, floorY + 0.02, 44.2);
}

function market(k, api, rng) {
  for (const side of [-1, 1]) for (const [index, z] of [52].entries()) {
    const x = side * 17, y = groundY(api, x, z) + ON_APRON, yaw = side * Math.PI / 2;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), point = (px, pz) => [x + px * cy + pz * sy, z - px * sy + pz * cy];
    for (const px of [-1.65, 1.65]) for (const pz of [-0.95, 0.95]) {
      const [xx, zz] = point(px, pz);
      k.solid.cyl(0.075, 0.11, 2.75, 7, xx, y + 1.375, zz, P.wood);
      api.emit({ kind: 'circle', x: xx, z: zz, r: 0.11, y0: y, y1: y + 2.75, tag: 'wood' });
    }
    k.cloth.box(3.85, 0.085, 2.75, x, y + 2.63, z, index === 1 ? P.violet : P.purple, yaw, -0.12);
    const [edgeX, edgeZ] = point(0, -1.35);
    k.cloth.box(3.85, 0.42, 0.075, edgeX, y + 2.32, edgeZ, P.purple, yaw);
    crescent(k.cloth, edgeX - sy * 0.06, y + 2.31, edgeZ - cy * 0.06, 0.16, yaw + Math.PI);
    icicles(k, edgeX, y + 2.58, edgeZ, 3.8, yaw, rng);
    const [tx, tz] = point(0, -0.39);
    solid(k, api, 3.15, 0.16, 0.96, tx, y + 0.97, tz, P.cutWood, yaw, 'wood');
    for (const px of [-1.35, 1.35]) { const [xx, zz] = point(px, -0.4); k.solid.box(0.17, 0.92, 0.62, xx, y + 0.46, zz, P.wood, yaw); }
    for (let i = 0; i < 4; i++) {
      const [xx, zz] = point(-1.12 + i * 0.73, -0.40);
      if (index === 0) {
        k.solid.cyl(0.10, 0.14, 0.32 + i % 2 * 0.11, 9, xx, y + 1.21, zz, P.iron);
        k.solid.cyl(0.07, 0.07, 0.10, 8, xx, y + 1.45 + i % 2 * 0.11, zz, P.paper);
      } else if (index === 1) {
        k.cloth.box(0.58, 0.18 + i % 2 * 0.07, 0.60, xx, y + 1.13, zz, i % 2 ? P.cloth : P.violet, yaw);
        k.cloth.box(0.47, 0.12, 0.51, xx, y + 1.32, zz, P.paper, yaw);
      } else {
        k.solid.cyl(0.24, 0.17, 0.19, 10, xx, y + 1.14, zz, P.cutWood);
        for (let j = 0; j < 3; j++) k.solid.cyl(0.06, 0.10, 0.16, 6, xx + (j - 1) * 0.13, y + 1.3, zz, P.paper, 0, 0.30);
      }
    }
    for (let i = 0; i < 3; i++) {
      const [xx, zz] = point(-1.05 + i * 1.03, 0.60);
      solid(k, api, 0.67, 0.49, 0.63, xx, y + 0.25, zz, P.cutWood, yaw, 'wood');
      k.solid.box(0.71, 0.08, 0.67, xx, y + 0.49, zz, P.wood, yaw);
    }
    const [lx, lz] = point(1.28, -1.14); lantern(k, lx, y + 2.18, lz, yaw + Math.PI, true);
    // A small hanging pan and tied bundles give each stall a silhouette beyond a box.
    const [hx, hz] = point(-1.30, 0.13);
    k.solid.cyl(0.012, 0.012, 0.68, 5, hx, y + 2.25, hz, P.iron);
    k.solid.cyl(0.28, 0.10, 0.10, 10, hx, y + 1.90, hz, P.iron);
  }
  for (const side of [-1, 1]) {
    brazier(k, api, side * 7.8, 55, true);
    const x = side * 19.5, z = 45.9, y = groundY(api, x, z) + ON_APRON;
    solid(k, api, 1.75, 0.18, 2.45, x, y + 0.73, z, P.wood, 0, 'wood');
    for (const dx of [-1.04, 1.04]) for (const dz of [-0.85, 0.85]) k.solid.tube(0.46, 0.46, 0.18, 12, x + dx, y + 0.46, z + dz, P.iron, 0, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) k.cloth.box(0.64, 0.60, 0.61, x + (i % 2 - 0.5) * 0.69, y + 1.10, z - 0.69 + Math.floor(i / 2) * 1.0, i % 2 ? P.paper : P.cloth, i * 0.1);
  }
}

function outskirts(k, api) {
  path(k, api, [[0, 166], [0, 133], [0, 101], [0, 69]], 9.6);
  for (const side of [-1, 1]) {
    path(k, api, [[side * 43, 159], [side * 21, 147], [side * 18, 117], [side * 18, 85], [side * 10, 75]], 4.3);
    path(k, api, [[side * 18, 99], [side * 27, 99]], 3.4);
    path(k, api, [[side * 19, 130], [side * 30, 130]], 3.4);
    path(k,api,[[side*42,86],[side*42,148]],3.8);
    for(const z of[96,119,141])path(k,api,[[side*42,z],[side*48,z]],3.5);
    path(k,api,[[side*18,119],[side*42,119]],3.5);
    // Short protective walls, with frequent, visibly paved gaps for people and cars.
    for (const z of [86, 108, 134]) lowWall(k, api, side * 11, z, 11, Math.PI / 2);
    for (const [x, z, len] of [[31, 150, 19], [61, 133, 14], [61, 108, 15], [41, 83, 19]]) lowWall(k, api, side * x, z, len, x === 61 ? Math.PI / 2 : 0);
    for (const z of [80, 117, 146]) {
      const x = side * 13, g = groundY(api, x, z);
      cylinder(k, api, 0.48, 1.5, x, g + 0.75, z, P.darkStone);
      k.solid.cyl(0.052, 0.067, 0.49, 7, x, g + 1.71, z, P.iron);
      lantern(k, x, g + 2.12, z, 0, true);
      crescent(k.solid, x, g + 1.13, z + 0.48, 0.23, 0, P.moon);
    }
    brazier(k, api, side * 22, 116, true);
    statue(k, api, side * 12, 157, side > 0 ? -0.25 : 0.25, 0.95);
    for (let i = 0; i < 3; i++) {
      const x = side * (26 + i * 1.3), z = 117, g = groundY(api, x, z);
      k.solid.tube(0.30, 0.24, 0.58, 10, x, g + 0.30, z, P.cutWood);
    }
    const bx = side * 32, bz = 142, by = groundY(api, bx, bz);
    solid(k, api, 4.0, 0.20, 0.72, bx, by + 0.51, bz, P.wood, 0, 'wood');
    for (const off of [-1.5, 1.5]) k.solid.box(0.34, 0.45, 0.57, bx + off, by + 0.22, bz, P.darkStone);
  }
  arch(k, api, 0, 158, 10.8, 3.5, 1.9, 1.2, groundY(api, 0, 158));
  banner(k, -6.4, groundY(api, -6.4, 158) + 3.7, 158.7, 1.25, 2.4, 0);
  banner(k, 6.4, groundY(api, 6.4, 158) + 3.7, 158.7, 1.25, 2.4, 0);
}

export function buildHoldfastTown(api) {
  const k = kits(); k.cloth = new Kit(); k.live = new Kit(); k.live.additive = true;
  const rng = api.rng;
  for (const b of HOLDFAST_TOWN.buildings) building(k, api, b, rng);
  for(const b of HOLDFAST_TOWN.buildings.filter(b=>!b.y))path(k,api,[[b.door.x,b.door.z],[b.door.x-Math.sin(b.yaw)*3,b.door.z-Math.cos(b.yaw)*3]],3.0);
  path(k, api, [[0, 63], [0, 46], [0, 20], [0, 3]], 11);
  for (const side of [-1, 1]) {
    path(k, api, [[side * 9, 59], [side * 40, 59], [side * 40, 7], [side * 20, 6]], 4.8);
    path(k, api, [[side * 7, 20], [side * 39, 20]], 4.6);
    path(k, api, [[side * 7, 41], [side * 40, 41]], 5.4);
    path(k, api, [[side * 22, 7], [side * 21, -31], [side * 27, -37], [side * 41, -37]], 4.8);
    path(k, api, [[side * 41, -37], [side * 41, -57]], 4.2);
    brazier(k, api, side * 9.5, 12, true);
    brazier(k, api, side * 41, 57, true);
    statue(k, api, side * 8, 19, side > 0 ? -0.18 : 0.18, 0.87);
  }
  path(k, api, [[-41, -36], [-22, -36], [0, -37], [22, -36], [40, -36]], 4.4);
  upperStreet(k, api, rng); market(k, api, rng); outskirts(k, api); dressHoldfastKeep(k, api);
  for (const x of [-37, 37]) banner(k, x, api.padY + 8.7, 64.56, 3.3, 6.6, Math.PI, true);

  for (const side of [-1, 1]) {
    banner(k, side * 64.6, api.padY + 8, -39, 3, 5.6, side > 0 ? -Math.PI / 2 : Math.PI / 2, true);
    statue(k, api, side * 22, -34, Math.PI, 1.13);
  }
  for (const side of [-1, 1]) {
    const x = side * 17, z = 58, y = groundY(api, x, z) + ON_APRON;
    solid(k, api, 3.0, 0.16, 1.05, x, y + 0.84, z, P.cutWood, 0, 'wood');
    for (const off of [-1.17, 1.17]) k.solid.box(0.14, 0.79, 0.77, x + off, y + 0.39, z, P.wood);
    for (let j = 0; j < 3; j++) { chair(k, api, x - 0.88 + j * 0.88, y, z + 1.2); k.solid.cyl(0.13, 0.12, 0.13, 9, x - 0.85 + j * 0.85, y + 1.01, z, P.iron); }
    lantern(k, x, y + 1.34, z);
  }
  // Reclaimed pots behind the keep: a few things still growing in the cold.
  for (let i = 0; i < 9; i++) {
    const x = -9 + i * 2.2, z = -39.5, y = groundY(api, x, z);
    k.solid.cyl(0.21, 0.15, 0.39, 8, x, y + 0.22, z, P.cutWood);
    k.solid.cone(0.22, 0.64, 5, x, y + 0.71, z, i % 3 ? [0.032, 0.070, 0.054] : P.wood, i, 0.2);
  }
  // Root's town system owns named civilians. This keeps the original armed gate cast.
  api.cast?.([
    { species: 'sentry', lx: -3.3, lz: 71, yaw: 0, guard: true, hpScale: 1.5 },
    { species: 'sentry', lx: 3.3, lz: 71, yaw: 0, guard: true, hpScale: 1.5 },
    { species: 'sentry', lx: 9, lz: 72.5, yaw: -0.4, guard: true, hpScale: 1.5 },
    { species: 'marshal', lx: -16, lz: 78, yaw: 0, guard: true },
    { species: 'marshal', lx: 18, lz: 78, yaw: 0, guard: true },
  ]);
  // An inside crank is a physical handle on the return face of the gatehouse.
  {const{x,z}=HOLDFAST_TOWN.insideGate,y=api.padY+1.3;
    k.solid.box(.80,1.12,.20,x,y,z,P.darkStone);
    k.solid.tube(.33,.33,.065,18,x,y,z-.16,P.iron,0,Math.PI/2);
    k.solid.box(.08,.59,.08,x,y,z-.20,P.cutWood);
    k.solid.cyl(.055,.055,.26,8,x,y+.27,z-.32,P.cutWood,0,Math.PI/2);
    lantern(k,x+.7,y+.95,z-.15,Math.PI,true);
  }
  bakePaths(k,api);
  return { solid: k.solid.build(), people: k.cloth.build(), glow: null,
    glowLive: k.live.build(), glowLiveColour: GLOW.ember };
}
