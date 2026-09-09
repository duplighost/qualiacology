// Lookout keepers use the same living, damageable people as the settlements.
// Recorded stock Windows speech is loaded locally and routed through the game's mixer.

export class Mechanics {
  static id='mechanics';
  constructor(ctx){this.ctx=ctx;this.keepers=new Map();this.clock=0;this.hold=0;this.target='';this.release=false;this.bytes=[];this.buffers=[];}
  _sys(id){return this.ctx.systems.get(id);}
  async init(){
    const files=['mechanic-hello-1.wav','mechanic-hello-2.wav','mechanic-fixed.wav'];
    this.bytes=await Promise.all(files.map(async f=>{const r=await fetch(new URL('../../assets/voices/'+f,import.meta.url));if(!r.ok)throw new Error('Missing mechanic speech: '+f);return r.arrayBuffer();}));
    this.off=this.ctx.bus.on('enemy:killed',p=>{const id=p.e?.siteGuard;if(id?.startsWith('mechanic:'))this._sys('progress').flag(id+':dead',1);});
  }
  ready(){return this.bytes.length===3;}
  async _voice(i,k){
    const audio=this._sys('audio');if(!audio?.actx||!audio.enabled)return;
    this.buffers[i]??=audio.actx.decodeAudioData(this.bytes[i].slice(0));
    const buffer=await this.buffers[i];
    if(!k.e?.alive)return;
    const s=audio.spec();s.x=k.e.pos.x;s.y=k.e.pos.y+1.5;s.z=k.e.pos.z;
    s.bus='world';s.gain=.82;s.ref=18;s.roll=1.05;s.maxDist=80;s.occl=false;s.priority=1;s.send=.06;
    audio.playBuf(buffer,s);
  }
  step(dt){
    if(!this.ctx.playing||this.ctx.paused)return;this.clock+=dt;
    const p=this._sys('player'),en=this._sys('enemies'),pr=this._sys('progress'),car=this._sys('car'),wild=this._sys('wilds');
    const use=this.ctx.input.held('use');if(!use)this.release=false;
    let target=null,nearest=Infinity;
    const towers=wild.lookouts();
    for(let i=0;i<towers.length;i++){
      const t=towers[i],dist=Math.hypot(p.pos.x-t.x,p.pos.z-t.z),id='mechanic:'+t.id;
      let k=this.keepers.get(id);
      if(dist>155){if(k?.e?.alive&&k.e.gen===k.gen)en._release(k.e);if(k)k.e=null;continue;}
      if(!t.rec||!t.topY||pr.flag(id+':dead'))continue;
      if(!k){k={id,e:null,gen:0,helloAt:0,variant:i%2};this.keepers.set(id,k);}
      if(!k.e||k.e.gen!==k.gen){
        const cy=Math.cos(t.yaw),sy=Math.sin(t.yaw),lx=1.15,lz=-1.25;
        k.e=en.spawn('resident',t.x+lx*cy+lz*sy,t.z-lx*sy+lz*cy,{feetY:t.topY,staged:true,neutral:true,siteGuard:id,yaw:t.yaw+Math.PI});
        if(!k.e)continue;k.gen=k.e.gen;
      }
      if(!k.e.alive||!k.e.neutral)continue;
      if(dist<40&&this.clock>=k.helloAt&&!p.dead){
        k.helloAt=this.clock+65;this._voice(k.variant,k).catch(e=>console.warn('Mechanic speech:',e));
        this.ctx.bus.emit('mechanic:near',{id:t.id,x:t.x,z:t.z});
      }
      const pos=k.e.pos,d=Math.hypot(p.pos.x-pos.x,p.pos.z-pos.z),dy=Math.abs(p.pos.y-pos.y);
      if(d<2.9&&dy<1.2&&d<nearest){
        const cam=this._sys('camera'),dot=((pos.x-p.pos.x)*-Math.sin(cam.yaw)+(pos.z-p.pos.z)*-Math.cos(cam.yaw))/(d||1);
        if(dot>.60&&this._sys('collision').segmentClear(p.pos.x,p.eyeY,p.pos.z,pos.x,pos.y+1.5,pos.z)){nearest=d;target=k;}
      }
    }
    if(!target){this.hold=0;this.target='';return;}
    if(this.target!==target.id){this.target=target.id;this.hold=0;}
    const price=Math.max(5,Math.ceil(car.wear*32)),needed=car.wear>.005,can=pr.cash()>=price;
    const e=target.e;
    this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:6,x:e.pos.x,y:e.pos.y+1.38,z:e.pos.z,k:this.hold/1.1,
      detail:needed?'FULL CAR REPAIR · '+price+' COINS':'YOUR CAR IS IN GOOD SHAPE',
      subdetail:needed?(can?'ENGINE · BRAKES · ELECTRICS':'YOU HAVE '+pr.cash()+' COINS'):'',unavailable:!needed||!can});
    if(!use||this.release||!needed||!can){this.hold=0;return;}
    this.hold+=dt;
    if(this.hold>=1.1&&pr.spendCash(price,'full-car-repair')){
      car.repairFull();this.release=true;this.hold=0;this._voice(2,target).catch(e=>console.warn('Mechanic speech:',e));
    }
  }
  state(){return{keepers:[...this.keepers.values()].map(k=>({id:k.id,alive:!!k.e?.alive,position:k.e?.pos.toArray()}))};}
  dispose(){this.off?.();}
}
