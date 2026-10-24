import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ART_BOARDS, createArtBoard } from './boards-art.js';
import { SPEED_BOARDS, createSpeedBoard } from './boards-speed.js';

export const CATALOG = [
  {id:'stained-saint',name:'Stained Saint',tag:'Cathedral glass / blackened brass',color:'#d777ff',secondary:'#60e9eb',trail:'Prismatic shards',description:'A gothic cruiser with a rose-window heart, jewel-like inlays, and a cathedral of light in its wake.'},
  {id:'afterburn',name:'Afterburn',tag:'Hot-rod lacquer / polished alloy',color:'#ff6548',secondary:'#ffb33a',trail:'Braided fire',description:'A split-nose rocket in crimson lacquer. Twin molten ribbons unravel into bright, restless sparks.'},
  {id:'razor-bloom',name:'Razor Bloom',tag:'Obsidian / rose enamel',color:'#ff50ab',secondary:'#a44fff',trail:'Petal storm',description:'Swept blades, sculpted roses, and a sharp black silhouette. A satin wake sheds spinning petals.'},
  {id:'deep-cut',name:'Deep Cut',tag:'Smoked metal / cyan signal',color:'#61f8e8',secondary:'#dcff5f',trail:'Oscilloscope',description:'Turntable hardware turned flight hardware. Twin waveforms and pulsing signal marks trace every turn.'},
  {id:'midnight-koi',name:'Midnight Koi',tag:'Indigo enamel / champagne gold',color:'#83b8ff',secondary:'#f5c376',trail:'Liquid gold',description:'Flowing pearl and indigo, a split tail, and gilded wave work. Blue currents curl around a golden wake.'},
  {id:'lovebite',name:'Lovebite',tag:'Candy lacquer / gold zipper',color:'#ff61ae',secondary:'#ffd39a',trail:'Heartbreaker',description:'A heart-cut nose and a gold zipper spine, finished in candy pink and burgundy. Broken hearts fly behind it.'},
  {id:'ghost-orchid',name:'Ghost Orchid',tag:'Porcelain / cold opal',color:'#dfd5ff',secondary:'#95f7fa',trail:'Spectral wings',description:'Porcelain petals curl beneath a quiet, sculpted deck. Pale wings drift through a translucent violet veil.'},
  {id:'dead-channel',name:'Dead Channel',tag:'Stealth composite / acid signal',color:'#d2ff4a',secondary:'#54ecff',trail:'Signal loss',description:'Offset armor, an asymmetric outline, and exposed digital inlays. A fractured signal drops pixels into space.'}
];
export const MODEL_DETAILS = [...ART_BOARDS,...SPEED_BOARDS];

/** Flatten static meshes into one mesh per shared material. Preserve attachment empties. */
export function optimizeBoard(source){
  source.updateMatrixWorld(true);
  const result=new THREE.Group(); result.name=source.name;
  result.userData={...source.userData};
  const buckets=new Map();
  const positions=[];
  source.traverse(o=>{
    if(o.isMesh && !Array.isArray(o.material)){
      let g=o.geometry.clone();
      if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}
      g.applyMatrix4(o.matrixWorld);
      for(const key of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(key))g.deleteAttribute(key);
      if(!g.attributes.normal)g.computeVertexNormals();
      if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      if(!g.attributes.color)g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(1),3));
      let b=buckets.get(o.material.uuid); if(!b)buckets.set(o.material.uuid,b={mat:o.material,geos:[]});
      b.geos.push(g);
    }else if(!o.isMesh && /^(trail_|foot_)/.test(o.name)){
      const anchor=new THREE.Object3D();anchor.name=o.name;anchor.position.setFromMatrixPosition(o.matrixWorld);anchor.userData={...o.userData};positions.push(anchor);
    }
  });
  for(const b of buckets.values()){
    const merged=mergeGeometries(b.geos,false);if(!merged)throw new Error('Unable to merge '+b.mat.name);
    if(!b.mat.vertexColors)merged.deleteAttribute('color');
    const g=mergeVertices(merged,1e-6);merged.dispose();
    const m=new THREE.Mesh(g,b.mat);m.name=b.mat.name||'board-part';m.castShadow=true;m.receiveShadow=true;result.add(m);
    b.geos.forEach(g=>g.dispose());
  }
  positions.forEach(o=>result.add(o));
  source.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  return result;
}

export function createBoard(id,{optimize=true}={}){
  const info=CATALOG.find(x=>x.id===id);if(!info)throw new Error('Unknown board: '+id);
  let board=['stained-saint','razor-bloom','midnight-koi','ghost-orchid'].includes(id)?createArtBoard(id):createSpeedBoard(id);
  board.name=id;
  if(optimize)board=optimizeBoard(board);
  const defaults={trail_left:[-.20,-.11,.90],trail_right:[.20,-.11,.90],foot_front:[0,.14,-.38],foot_back:[0,.14,.38]};
  for(const [name,pos] of Object.entries(defaults))if(!board.getObjectByName(name)){const o=new THREE.Object3D();o.name=name;o.position.fromArray(pos);board.add(o);}
  board.userData={...board.userData,id,title:info.name,units:'meters',forward:'-Z',up:'+Y',trailPreset:id};
  return board;
}

export function disposeBoard(board){
  const mats=new Set(),geos=new Set();board.traverse(o=>{if(o.isMesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});
  geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());board.removeFromParent();
}

export function boardStats(board){
  let triangles=0,drawCalls=0;board.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;drawCalls+=Array.isArray(o.material)?o.material.length:1;}});
  const box=new THREE.Box3().setFromObject(board),size=box.getSize(new THREE.Vector3());
  return {triangles:Math.round(triangles),drawCalls,sizeMeters:size.toArray().map(x=>+x.toFixed(3))};
}
