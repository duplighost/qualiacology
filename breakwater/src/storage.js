export const SETTINGS={sensitivity:.002,volume:.75,music:.5,fov:82,quality:'high',shake:.6,difficulty:'standard',subtitles:true,inverted:false};
const KEY='qualiacology.breakwater.v1';
export function newSave(){return{version:1,sector:0,checkpoint:0,unlockedSector:0,completed:false,xp:0,level:1,skillPoints:1,skills:[],secrets:[],settings:{...SETTINGS},stats:{kills:0,deaths:0,perfectCatches:0,score:0,activeSeconds:0,sectors:[]}};}
export function loadSave(){
  const fresh=newSave();try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||s.version!==1)return fresh;
    for(const key of ['sector','checkpoint','unlockedSector','xp','level','skillPoints'])if(Number.isFinite(s[key]))fresh[key]=Math.max(0,Math.floor(s[key]));
    fresh.sector=Math.min(24,fresh.sector);fresh.unlockedSector=Math.max(fresh.sector,Math.min(24,fresh.unlockedSector));fresh.checkpoint=Math.min(4,fresh.checkpoint);fresh.level=Math.max(1,Math.min(12,fresh.level));fresh.completed=!!s.completed;
    fresh.skills=Array.isArray(s.skills)?[...new Set(s.skills.filter(x=>typeof x==='string'))].slice(0,12):[];fresh.secrets=Array.isArray(s.secrets)?s.secrets.filter(x=>typeof x==='string'):[];
    if(s.settings)for(const k of Object.keys(SETTINGS))if(typeof s.settings[k]===typeof SETTINGS[k])fresh.settings[k]=s.settings[k];
    fresh.settings.sensitivity=Math.max(.0005,Math.min(.006,fresh.settings.sensitivity));fresh.settings.fov=Math.max(60,Math.min(110,fresh.settings.fov));fresh.settings.volume=Math.max(0,Math.min(1,fresh.settings.volume));fresh.settings.music=Math.max(0,Math.min(1,fresh.settings.music));
    if(s.stats){for(const k of ['kills','deaths','perfectCatches','score','activeSeconds'])if(Number.isFinite(s.stats[k]))fresh.stats[k]=Math.max(0,s.stats[k]);fresh.stats.sectors=Array.isArray(s.stats.sectors)?s.stats.sectors.slice(-100):[];}
  }catch{}return fresh;
}
export function saveProgress(save){try{localStorage.setItem(KEY,JSON.stringify(save));return true;}catch{return false;}}
export function xpForLevel(level){return Math.floor(420*Math.pow(Math.max(0,level-1),1.65));}
