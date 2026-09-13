import {LORE_ENTRIES, LORE_BY_ID, LORE_SECTIONS, VIGIL_IDS} from './catalog.js';

const SAVE_KEY='lore:ledger';
const OFFICERS=new Set(['pale','pacer','auditor']);
const SLEEP_ENTRIES=['carried-light','powering','refuges','nine-lights','bulbs','car'];
const WILD_KIND={treehouse:'stand',pond:'water',stream:'water',barn:'farm',cabin:'camp',tent:'camp',ruin:'chapel'};
const clean=(value,max=120)=>typeof value==='string'?value.slice(0,max):'';
const noteKey=id=>'note:'+id;
const known=id=>Object.hasOwn(LORE_BY_ID,id);

/** Pure saved-state reader. Bad/new fields cannot discard existing progress or expose entries. */
export function normalizeLedger(value){
  const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const notes={};
  if(v.notes&&typeof v.notes==='object'&&!Array.isArray(v.notes)){
    for(const [id,n] of Object.entries(v.notes).slice(0,256)){
      if((!id.startsWith('note:')&&!id.startsWith('resident:'))||id.length>180||!n||typeof n!=='object'||!clean(n.text,8000))continue;
      notes[id]={id,title:clean(n.title)||'A note',section:id.startsWith('resident:')?'people':'found',text:clean(n.text,8000),source:clean(n.source,200)||'Copied into the ledger',hand:clean(n.hand,120),circled:false};
    }
  }
  const valid=id=>typeof id==='string'&&(known(id)||Object.hasOwn(notes,id));
  const unlocked=[...new Set((Array.isArray(v.unlocked)?v.unlocked:[]).filter(valid))];
  if(!unlocked.includes('county'))unlocked.unshift('county');
  const allowed=new Set(unlocked);
  const read=[...new Set((Array.isArray(v.read)?v.read:[]).filter(id=>allowed.has(id)))];
  return {v:1,unlocked,read,notes};
}

/** Domain events express things actually done/heard, never booted meshes or nearby bosses. */
export function unlocksForEvent(type,p={}){
  const id=clean(p.id,180),rawSpecies=clean(p.species||p.e?.species||p.e?.def?.id);
  const species=rawSpecies==='spider'?'pale':rawSpecies==='dogcaller'?'hunter':rawSpecies;
  switch(type){
    case 'place:discovered': case 'map:discovered':
      return ['place:'+id,...(id==='holdfast'?['moon']:[])];
    case 'dusk-to-dawn:relit': return ['road-lamps'];
    case 'enemy:killed': return OFFICERS.has(species)?[]:['species:'+species];
    case 'lore:sighting': return OFFICERS.has(species)?['species:'+species]:[];
    case 'phase:warning': return ['watches'];
    case 'map:rumour': return VIGIL_IDS.includes(id)?['vigil:'+id]:[];
    case 'boss:cleared': return VIGIL_IDS.includes(id)?['after:'+id]:[];
    case 'holdfast:conversation':
      if(!p.final)return [];
      return ['resident:'+id,...(VIGIL_IDS.includes(p.rumour)?['vigil:'+p.rumour]:[]),...(id==='teacher'?['meteors']:[])];
    case 'holdfast:address': return ['address:'+id,...(id==='upper-school'?['turbines']:[])];
    case 'place:rest': return [...SLEEP_ENTRIES.map(id=>'rule:'+id),'turbines'];
    case 'loot:searched': return ['rule:coins'];
    case 'radio:raid': return ['wrong-turn'];
    case 'radio:segment': return p.station==='wrong-turn'&&p.file==='wrong-turn-raid.mp3'?['wrong-turn']:[];
    case 'story:read': return [noteKey(id),...(id==='xmas-letter'?['service17']:[]),...(id==='sinkhole-view'?['house-below']:[])];
    case 'sanctuary:found': case 'sanctuary:claimed': case 'sanctuary:lit': return ['wild:sanctuary'];
    case 'dealer:bought': return ['wild:dealer'];
    case 'lore:observed': return [id];
    default:return [];
  }
}

export class LoreLedger {
  static id='lore-ledger';
  constructor(ctx){this.ctx=ctx;this.off=[];this.data=normalizeLedger();this.unlocked=new Set(this.data.unlocked);this.read=new Set();this.scanT=0;this.revision=0;this._loaded=false;}
  _sys(id){return this.ctx.systems.get(id);}
  async init(){
    this.restore();
    for(const type of ['place:discovered','map:discovered','dusk-to-dawn:relit','enemy:killed','lore:sighting','phase:warning','map:rumour','boss:cleared','holdfast:conversation','holdfast:address','place:rest','loot:searched','radio:raid','radio:segment','story:read','sanctuary:found','sanctuary:claimed','sanctuary:lit','dealer:bought','lore:observed']){
      this.off.push(this.ctx.bus.on(type,p=>this.record(type,p||{})));
    }
    this.off.push(this.ctx.bus.on('save:loaded',()=>this.restore()));
  }
  ready(){return this._loaded;}
  restore(){
    const progress=this._sys('progress');
    this.data=normalizeLedger(progress?.flag(SAVE_KEY));
    this.unlocked=new Set(this.data.unlocked);this.read=new Set(this.data.read);this._loaded=true;
    // Old saves retain verifiable discoveries/defeats. A claim never fabricates a read note.
    const save=progress?.save?.data||{};
    for(const id of save.found||[])this._add(['place:'+id,...(id==='holdfast'?['moon']:[])],false);
    for(const id of save.bossesCleared||[])this._add(['after:'+id],false);
    for(const r of save.rumours||[])this._add(VIGIL_IDS.includes(r?.id)?['vigil:'+r.id]:[],false);
    const flags=save.worldFlags||{};
    for(const [key,value] of Object.entries(flags)){
      if(!value)continue;
      if(key.startsWith('story:')){
        const id=key.startsWith('story:read:')?key.slice(11):key.slice(6);
        const target=this._sys('world-stories')?.targets?.find(t=>t.id===id);
        if(target?.text)this.record('story:read',target,false);
        else this._add(unlocksForEvent('story:read',{id}),false);
      }
      if(key.startsWith('bs:'))this._add(['rule:coins'],false);
      if(key.startsWith('sanctuary-found:')||key.startsWith('sanctuary:'))this._add(['wild:sanctuary'],false);
    }
    if(Array.isArray(flags['d2d:relit'])&&flags['d2d:relit'].length)this._add(['road-lamps'],false);
    this.revision++;this._persist();
  }
  _persist(){this.data.unlocked=[...this.unlocked];this.data.read=[...this.read];this._sys('progress')?.flag(SAVE_KEY,this.data);}
  _add(ids,announce=true){
    const added=[];
    for(const id of ids){if(!(known(id)||Object.hasOwn(this.data.notes,id))||this.unlocked.has(id))continue;this.unlocked.add(id);added.push(id);}
    if(!added.length)return false;
    this.revision++;
    if(announce){this._persist();this.ctx.bus.emit('lore:unlocked',{ids:added,count:added.length});}
    return true;
  }
  record(type,p={},announce=true){
    // A physical note's actual wording/hand wins over its static transcription. Kept
    // only after E was pressed; merely discovering its place never exposes the text.
    let changed=false;
    if(type==='story:read'&&clean(p.id,180)&&clean(p.text,8000)){
      const id=noteKey(clean(p.id,160));
      if(Object.hasOwn(this.data.notes,id)||Object.keys(this.data.notes).length<256){
        const old=this.data.notes[id];
        const note={id,title:LORE_BY_ID[id]?.title||clean(p.title)||'A note',section:'found',text:clean(p.text,8000),source:p.id.startsWith('refuge-note:')?'An unsigned note':LORE_BY_ID[id]?.source||'Found on the road',hand:clean(p.hand,120),circled:false};
        this.data.notes[id]=note;
        changed=!old||old.text!==note.text||old.source!==note.source||old.title!==note.title||old.hand!==note.hand;
      }
    }
    if(type==='holdfast:conversation'&&p.final&&!p.privateHint&&clean(p.id)&&clean(p.text,8000)&&!known('resident:'+p.id)){
      const id='resident:'+p.id;
      if(Object.hasOwn(this.data.notes,id)||Object.keys(this.data.notes).length<256){
        this.data.notes[id]={id,title:clean(p.name)||'Someone at the Holdfast',section:'people',text:clean(p.text,8000),source:'A conversation kept',circled:false};changed=true;
      }
    }
    const added=this._add(unlocksForEvent(type,p),announce);
    if(changed&&!added){this.revision++;if(announce)this._persist();}
    return added||changed;
  }
  has(id){return this.unlocked.has(id);}
  entry(id){return this.has(id)?this.data.notes[id]||LORE_BY_ID[id]||null:null;}
  entries(section='',query=''){
    const q=clean(query,200).toLocaleLowerCase().trim();
    const staticEntries=LORE_ENTRIES.filter(e=>this.has(e.id)).map(e=>this.data.notes[e.id]||e);
    const dynamic=Object.values(this.data.notes).filter(e=>this.has(e.id)&&!known(e.id));
    return [...staticEntries,...dynamic].filter(e=>(!section||e.section===section)&&(!q||(e.title+' '+e.text+' '+e.source).toLocaleLowerCase().includes(q)));
  }
  sections(){return LORE_SECTIONS.map(s=>({...s,count:this.entries(s.id).length,unread:this.entries(s.id).filter(e=>!this.read.has(e.id)).length})).filter(s=>s.count>0);}
  unreadCount(){let n=0;for(const id of this.unlocked)if(!this.read.has(id))n++;return n;}
  markRead(id){if(!this.has(id)||this.read.has(id))return false;this.read.add(id);this.revision++;this._persist();return true;}
  step(dt){
    if(this.ctx.paused||this.ctx.playing===false)return;
    // The warning is continuous clock state, not currently an event. Observe its
    // first audible/visible warning; never award this from elapsed play time.
    if(!this.has('watches')&&this._sys('clock')?.isTelegraphing)this._add(['watches']);
    this.scanT-=dt;if(this.scanT>0)return;this.scanT=1;
    const p=this._sys('player');if(!p?.pos||p.dead)return;
    const near=(x,z,r=20)=>Number.isFinite(x)&&Number.isFinite(z)&&(x-p.pos.x)**2+(z-p.pos.z)**2<r*r;
    const ids=[];
    // Match the existing minor discovery radius. Notes, addresses, species and
    // tales never unlock through this scenery pass.
    const places=this._sys('places');
    for(const m of places?.minorList?.()||places?.minors||[]){if(near(m.x,m.z))ids.push('road:'+m.kind,'wild:'+m.kind);}
    for(const s of this._sys('wilds')?.sites||[]){if(near(s.x,s.z,15)){const kind=WILD_KIND[s.variant]||s.variant||WILD_KIND[s.kind]||s.kind;ids.push('wild:'+kind);}}
    const dealer=this._sys('dealer');if(dealer?.pos&&near(dealer.pos.x,dealer.pos.z,6))ids.push('wild:dealer');
    this._add(ids);
  }
  state(){return {entries:this.unlocked.size,unread:this.unreadCount(),sections:this.sections().map(s=>({id:s.id,count:s.count})),revision:this.revision};}
  dispose(){for(const off of this.off)off?.();this.off=[];}
}

export default LoreLedger;
