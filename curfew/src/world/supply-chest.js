import * as THREE from 'three';
import {Kit} from './sites.js';
import {projectPlaceSurfaceUVs} from './place-surfaces.js';

// Shared hollow, hinged strongbox. Loot systems retain their own saved contents.
export function supplyChestGeometry(){
 const body=new Kit(),lid=new Kit(),inside=new Kit(),W=[.13,.073,.035],D=[.04,.052,.058],B=[.48,.31,.11],P=[.28,.18,.075];
 body.box(1.25,.13,.86,0,.075,0,D);
 for(let i=0;i<6;i++)for(const z of[-.405,.405])body.box(.197,.54,.075,-.512+i*.205,.365,z,i%2?W:P);
 for(const x of[-.58,.58])for(let i=0;i<4;i++)body.box(.085,.54,.18,x,.365,-.285+i*.19,W);
 for(const x of[-.46,.46])for(const z of[-.46,.46]){
  body.box(.145,.62,.095,x,.36,z,B);body.box(.19,.115,.19,x,.115,z,D);
  for(const y of[.20,.47,.62])body.cyl(.027,.027,.03,8,x,y,z+Math.sign(z)*.055,B,0,Math.PI/2);
 }
 for(const y of[.15,.63])for(const z of[-.445,.445])body.box(1.27,.06,.07,0,y,z,B);
 body.box(.24,.27,.10,0,.43,-.47,D);body.box(.145,.16,.035,0,.46,-.53,B);body.cyl(.027,.027,.018,8,0,.48,-.555,D,0,Math.PI/2);
 for(const x of[-.665,.665]){const ring=new THREE.TorusGeometry(.10,.022,5,10);ring.rotateY(Math.PI/2);ring.translate(x,.37,0);body.push(ring,B);body.box(.035,.085,.28,x,.36,0,D);}
 // Lid origin is the rear hinge; its arc rises over the wooden coffer.
 for(let i=0;i<8;i++){const t=(i+.5)/8,a=t*Math.PI,z=-.43-Math.cos(a)*.43,y=Math.sin(a)*.22;lid.box(1.31,.055,.18,0,y,z,i%2?W:P,-0,Math.atan2(.22*Math.cos(a),.43*Math.sin(a)));}
 for(const x of[-.47,.47]){for(let i=0;i<12;i++){const a=(i+.5)/12*Math.PI,z=-.43-Math.cos(a)*.45,y=Math.sin(a)*.24;lid.box(.08,.048,.128,x,y,z,B,0,Math.atan2(.24*Math.cos(a),.45*Math.sin(a)));}lid.box(.09,.08,.91,x,.01,-.43,B);}
 for(const x of[-.47,.47])lid.cyl(.065,.065,.15,10,x,.03,0,D,0,0,Math.PI/2);
 lid.box(.14,.19,.055,0,-.07,-.88,B);lid.box(.42,.025,.24,0,.26,-.43,D);lid.box(.16,.025,.20,0,.278,-.43,B);
 for(let i=0;i<16;i++){const a=i*2.399,r=.08+(i%4)*.075;inside.cyl(.066,.066,.026,10,-.24+Math.sin(a)*r,.23+Math.floor(i/5)*.035,Math.cos(a)*r,B);}
 inside.box(.32,.18,.45,.26,.24,.08,[.085,.16,.14]);for(let i=0;i<5;i++)inside.cyl(.025,.025,.12,7,.13+i*.058,.36,-.12,B);
 const result={wood:body.build(),lid:lid.build(),inside:inside.build()};for(const g of Object.values(result))projectPlaceSurfaceUVs(g,.9);return result;
}
