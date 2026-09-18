// A quiet motor and tyre bed, owned by Audio and routed through its world/pause mix.
// Buffers are generated once, reused while driving, and released with the audio context.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export function motorSamples(sr=22050,seconds=2){
  const out=new Float32Array(Math.round(sr*seconds));let state=0x71832aef,grain=0;
  for(let i=0;i<out.length;i++){
    const t=i/sr;state=(Math.imul(state,1664525)+1013904223)>>>0;
    grain+=(state/2147483648-1-grain)*.16;
    const triangle=2/Math.PI*Math.asin(Math.sin(t*50*Math.PI*2));
    const pulse=.90+.10*Math.sin(t*25*Math.PI*2);
    const fade=Math.min(1,i/48,(out.length-1-i)/48);
    out[i]=(.13*triangle+.05*Math.sin(t*25*Math.PI*2)+.024*Math.sin(t*100*Math.PI*2)+.018*grain)*pulse*fade;
  }
  return out;
}

// ALEX, 2026-09-16: "Car running out of health sounds too annoying with constant
// ticking/beeping."
//
// MEASURED, and this is where it came from. Past the 0.80 knee car.js used to collapse the
// top speed to 12% of 22 m/s, so a dying car crawled — and the motor loop is a 50 Hz
// triangle under a 25 Hz amplitude pulse played back at .76 + speed, which at a crawl is a
// 19-22 Hz putt. At full gain. For as long as you limp. A repetitive low pulse held at one
// level is what a fan sounds like, and the county's own earshot lane already learned that
// lesson once (audio/earshot.js, "a true fact reported continuously is indistinguishable
// from a fan").
//
// So the engine BREAKS UP rather than nagging: from the knee it loses gain and loses top
// end, and by the time the car has stopped it has gone quiet. Nothing is added — there was
// never a beep in the code to remove; what there was was one loop that never let up.
//
// D12: the crawl is gone (the cap only ever loses 28%) and the end is a 35 s FAILURE WINDOW
// from wear 0.92 (car.js _stepFailureWindow: coughs, pedal cuts, the stall). The knee moves
// up to 0.88 so the motor comes apart INSIDE that window and not for the last third of a
// lap — the coughs are the tell, and they need a whole engine under them to read.
const WEAR_KNEE = .88;            // where the sound starts coming apart, just under the window's 0.92
export function engineMix(car,allowed=true){
  const active=!!(allowed&&car?.exists&&car.engineOn&&car.wear<.999&&['driving','arriving'].includes(car.mode));
  const speed=clamp(Math.abs(car?.speed||0)/28,0,1),load=clamp(car?.pedal||0,0,1);
  const worn=clamp(((car?.wear||0)-WEAR_KNEE)/(1-WEAR_KNEE),0,1);
  const duck=1-worn*.58;          // a limping engine is a QUIETER engine, not a louder one
  return{active,rate:.76+speed*1.12+load*.26,motor:active?(.38+speed*.24+load*.30)*duck:0,
    tyres:active?speed*speed*.035:0,cutoff:(440+speed*350+load*270)*(1-worn*.46)};
}

export class VehicleEngine {
  constructor(ctx,audio){this.ctx=ctx;this.audio=audio;this.nodes=[];this.sources=[];this.active=false;}
  _build(){
    const c=this.audio.actx,sr=22050;
    const keep=node=>{this.nodes.push(node);return node;};
    const motorBuf=c.createBuffer(1,sr*2,sr);motorBuf.copyToChannel(motorSamples(sr),0);
    const tyreBuf=c.createBuffer(1,sr*2,sr),data=tyreBuf.getChannelData(0);let state=0x83624971;
    for(let i=0;i<data.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;data[i]=(state/2147483648-1)*Math.min(1,i/48,(data.length-1-i)/48);}
    this.motor=keep(c.createBufferSource());this.motor.buffer=motorBuf;this.motor.loop=true;
    this.tyres=keep(c.createBufferSource());this.tyres.buffer=tyreBuf;this.tyres.loop=true;
    this.motorGain=keep(c.createGain());this.motorGain.gain.value=0;
    this.tyreGain=keep(c.createGain());this.tyreGain.gain.value=0;
    this.filter=keep(c.createBiquadFilter());this.filter.type='lowpass';this.filter.frequency.value=440;this.filter.Q.value=.55;
    const tyreHigh=keep(c.createBiquadFilter());tyreHigh.type='highpass';tyreHigh.frequency.value=280;tyreHigh.Q.value=.55;
    const tyreLow=keep(c.createBiquadFilter());tyreLow.type='lowpass';tyreLow.frequency.value=1500;tyreLow.Q.value=.55;
    this.pan=keep(c.createPanner());this.pan.panningModel='equalpower';this.pan.distanceModel='inverse';
    this.pan.refDistance=4;this.pan.rolloffFactor=1.35;this.pan.maxDistance=90;
    this.motor.connect(this.filter);this.filter.connect(this.motorGain);this.motorGain.connect(this.pan);
    this.tyres.connect(tyreHigh);tyreHigh.connect(tyreLow);tyreLow.connect(this.tyreGain);this.tyreGain.connect(this.pan);
    this.pan.connect(this.audio.busWorld);
    this.motor.start();this.tyres.start();this.sources.push(this.motor,this.tyres);
  }
  step(){
    const A=this.audio,car=this.ctx.systems.get('car');
    const mix=engineMix(car,this.ctx.playing&&!this.ctx.paused&&!A.silent);
    this.active=mix.active;
    if(!A.enabled||!A.actx||!A.busWorld)return;
    if(mix.active&&!this.motor)this._build();
    if(!this.motor)return;
    const t=A.actx.currentTime,tau=mix.active?.10:.045;
    this.motor.playbackRate.setTargetAtTime(mix.rate,t,.10);
    this.motorGain.gain.setTargetAtTime(mix.motor,t,tau);
    this.tyreGain.gain.setTargetAtTime(mix.tyres,t,tau);
    this.filter.frequency.setTargetAtTime(mix.cutoff,t,.12);
    if(car){
      const x=car.x-Math.sin(car.heading)*1.25,y=car.y+.75,z=car.z-Math.cos(car.heading)*1.25;
      if(this.pan.positionX){this.pan.positionX.setTargetAtTime(x,t,.035);this.pan.positionY.setTargetAtTime(y,t,.035);this.pan.positionZ.setTargetAtTime(z,t,.035);}
      else this.pan.setPosition(x,y,z);
    }
  }
  dispose(){
    for(const source of this.sources){try{source.stop();}catch{}}
    for(const node of this.nodes)node.disconnect();
    this.sources.length=0;this.nodes.length=0;this.motor=null;this.tyres=null;this.active=false;
  }
}
