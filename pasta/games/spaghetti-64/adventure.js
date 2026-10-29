import {COURSE_IDS} from './courses.js';
// The original course records stay in spaghetti64-progress-v2. Castle state is
// independent, so visiting a new room cannot overwrite a previous best time.
export const ADVENTURE_STORAGE_KEY='spaghetti64-adventure-v1';
export const EXTRA_STAR_IDS=['pss-speed','toad-basement','toad-upper','toad-tippy','mips-1','mips-2'];
export const STAR_TOTAL=30;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const number=(x,fallback=0)=>Number.isFinite(Number(x))?Number(x):fallback;
const initial=()=>({schema:1,keys:{basement:false,upper:false},caps:{wing:false,metal:false,vanish:false},cannons:{wmotr:false},secrets:{},moatDrained:false,finished:false,visited:[],lastCastle:null,returnToCastle:null});
let memory=initial();
const cached=new WeakMap(),failedWrites=new WeakSet();
function storageTarget(storage){try{return storage??globalThis.localStorage;}catch{return null;}}
function checkpoint(value){
  if(!value||!Number.isInteger(value.area)||value.area<1||value.area>5||!Array.isArray(value.position)||value.position.length!==3||!value.position.every(Number.isFinite))return null;
  return{area:value.area,position:value.position.slice(),yaw:number(value.yaw)};
}
function normalize(value){
  const a=initial();if(!value||typeof value!=='object'||Array.isArray(value))return a;
  for(const k of Object.keys(a.keys))a.keys[k]=value.keys?.[k]===true;
  for(const k of Object.keys(a.caps))a.caps[k]=value.caps?.[k]===true;
  for(const k of Object.keys(a.cannons))a.cannons[k]=value.cannons?.[k]===true;
  for(const id of EXTRA_STAR_IDS){const r=value.secrets?.[id];if(r?.completed)a.secrets[id]={completed:true,time:Math.max(0,number(r.time)),bestTime:Math.max(0,number(r.bestTime,number(r.time))),date:typeof r.date==='string'?r.date:''};}
  a.moatDrained=value.moatDrained===true;a.finished=value.finished===true;
  a.visited=Array.isArray(value.visited)?[...new Set(value.visited.filter(v=>typeof v==='string'&&/^[a-z0-9_]{1,18}$/.test(v)))]:[];
  a.lastCastle=checkpoint(value.lastCastle);a.returnToCastle=checkpoint(value.returnToCastle);
  return a;
}
export function getAdventure(storage){
  const target=storageTarget(storage);if(!target)return normalize(memory);
  if(failedWrites.has(target))return normalize(cached.get(target));
  try{const raw=target.getItem(ADVENTURE_STORAGE_KEY),a=raw?normalize(JSON.parse(raw)):initial();cached.set(target,a);memory=normalize(a);return a;}catch{return normalize(cached.get(target));}
}
export function saveAdventure(patch={},storage){
  const a=getAdventure(storage);
  for(const group of ['keys','caps','cannons'])for(const k of Object.keys(a[group]))if(patch[group]?.[k]===true)a[group][k]=true;
  for(const key of ['moatDrained','finished'])if(patch[key]===true)a[key]=true;
  for(const key of ['lastCastle','returnToCastle'])if(own(patch,key)){const point=checkpoint(patch[key]);if(point)a[key]=point;}
  if(Array.isArray(patch.visited))a.visited=[...new Set([...a.visited,...patch.visited.filter(v=>typeof v==='string'&&/^[a-z0-9_]{1,18}$/.test(v))])];
  for(const id of EXTRA_STAR_IDS)if(patch.secrets?.[id]?.completed){const r=patch.secrets[id],old=a.secrets[id],time=Math.max(0,number(r.time));a.secrets[id]={completed:true,time,bestTime:Math.min(old?.bestTime??Infinity,time),date:typeof r.date==='string'?r.date:new Date().toISOString()};}
  memory=normalize(a);const target=storageTarget(storage);
  if(target){cached.set(target,normalize(a));try{target.setItem(ADVENTURE_STORAGE_KEY,JSON.stringify(a));failedWrites.delete(target);}catch{failedWrites.add(target);}}
  return a;
}
export function saveAdventureReward(reward,storage){
  if(typeof reward==='string')reward={id:reward};if(!reward)return getAdventure(storage);
  if(EXTRA_STAR_IDS.includes(reward.id))return saveAdventure({secrets:{[reward.id]:{completed:true,time:number(reward.time)}}},storage);
  if(reward.key1||reward.id==='key1'||reward.type==='key1')return saveAdventure({keys:{basement:true}},storage);
  if(reward.key2||reward.id==='key2'||reward.type==='key2')return saveAdventure({keys:{upper:true}},storage);
  if(reward.ending||reward.id==='grand-star'||reward.type==='grand-star')return saveAdventure({finished:true},storage);
  return getAdventure(storage);
}
export function extraStarsCollected(adventure=getAdventure()){return EXTRA_STAR_IDS.reduce((n,id)=>n+(adventure.secrets?.[id]?.completed?1:0),0);}
export function collectionTotal(courseProgress,adventure=getAdventure()){
  return COURSE_IDS.reduce((n,id)=>n+(courseProgress?.[id]?.completed?1:0),0)+extraStarsCollected(adventure);
}
export function castleCheckpoint(area,player){return checkpoint({area,position:[player.position.x,player.position.y,player.position.z],yaw:player.yaw*180/Math.PI});}
export function castleEntry(params,adventure=getAdventure()){
  if(params.get('entry')==='return'&&adventure.returnToCastle)return adventure.returnToCastle;
  if(params.get('entry')==='resume'&&adventure.lastCastle)return adventure.lastCastle;
  const area=Number(params.get('area'));return Number.isInteger(area)&&area>=1&&area<=5?{area}:null;
}
export function courseEntry(params,id){
  const entry={};
  if(id==='ttc'&&['stopped','slow','fast','random'].includes(params.get('clock')))entry.clockMode=params.get('clock');
  if(id==='thi'&&['1','2'].includes(params.get('area')))entry.area=Number(params.get('area'));
  if(id==='wdw'&&['low','middle','high'].includes(params.get('water')))entry.waterEntry=params.get('water');
  return entry;
}
export function destinationUrl(id,{fromCastle=false,area,clockMode,waterEntry}={}){
  const query=new URLSearchParams({course:id});if(fromCastle)query.set('from','castle');
  if(id==='thi'&&[1,2].includes(area))query.set('area',String(area));
  if(id==='ttc'&&['stopped','slow','fast','random'].includes(clockMode))query.set('clock',clockMode);
  if(id==='wdw'&&['low','middle','high'].includes(waterEntry))query.set('water',waterEntry);
  return './play.html?'+query;
}
