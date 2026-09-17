// A quiet, original music-box phrase under a latched door. No stream or external player.
//
// D11 (Alex, 2026-09-16: "the little melody plays too many times before it stops; should play
// once"): the phrase plays ONCE when you come under the door, does not loop, and does not
// play again within REPLAY_GAP_S of the last start, so walking in and out does not replay it.
// Its level follows protection (it fades out on exit, mid-phrase if you leave mid-phrase), and
// `duck(k)` lets the room's other owners (the knock, the Auditor at the table) push it down
// with an eased multiplier. Reachable as `audio.refugeMusic`.
const LEVEL = 0.12;            // under the wind; a phrase you notice ending, not one you hum
const REPLAY_GAP_S = 120;      // one play per entry, and not again inside two minutes
const IN_TAU = 0.65;           // comes up like a door shutting behind you
const OUT_TAU = 0.16;          // and goes the moment the door is not
const DUCK_TAU = 0.25;         // the duck eases; a step in the level is a mixer, not a room
const PHRASE_S = 32;           // the baked phrase's length; the source is forgotten after it
export class RefugeMusic {
  constructor(ctx,audio){
    this.ctx=ctx;this.audio=audio;this.buf=null;this.source=null;this.gain=null;this.duckGain=null;
    this.active=false;this.wasActive=false;this.playedAt=-1e9;this.endsAt=-1e9;this._duck=1;this._duckUntil=Infinity;this.plays=0;
  }
  /** 0..1 multiplier on the room music, eased. `holdS` (optional) lets it go back to 1 by itself. */
  duck(k,holdS){
    this._duck=k>1?1:k<0?0:(k||0);
    this._duckUntil=holdS>0?this._now()+holdS:Infinity;
  }
  _now(){const A=this.audio;return A&&A.actx?A.actx.currentTime:0;}
  _bake(A){
    const sr=22050,duration=PHRASE_S,N=sr*duration,buf=A.actx.createBuffer(2,N,sr);
    const phrase=[[0,60],[2,67],[4,71],[6,74],[9,69],[11,67],[14,64],[17,62],[19,69],[21,72],[24,71],[27,67]];
    for(let channel=0;channel<2;channel++){
      const data=buf.getChannelData(channel);
      for(const [at,midi] of phrase){
        const freq=440*Math.pow(2,(midi-69)/12)*(channel?1.0008:.9992);
        const offset=Math.round((at+channel*.023)*sr);
        for(let j=0;j<sr*5;j++){
          const t=j/sr,env=(1-Math.exp(-t*120))*Math.exp(-t*1.25);
          const v=(Math.sin(t*freq*Math.PI*2)+.25*Math.sin(t*freq*4.01*Math.PI)+.08*Math.sin(t*freq*6*Math.PI))*env*.16;
          if(offset+j<N)data[offset+j]+=v;   // no wrap: the phrase ends, it does not fold onto its own head
        }
      }
    }
    this.buf=buf;
  }
  step(){
    const A=this.audio,p=this.ctx.systems.get('player'),refuge=this.ctx.systems.get('refuge');
    const active=!!(p&&refuge?.isProtected(p.pos.x,p.pos.y,p.pos.z));
    const entered=active&&!this.wasActive;
    this.wasActive=active;this.active=active;
    if(!A.actx||!A.preMaster||!A.enabled)return;
    const T=A.actx.currentTime;
    if(!this.gain){
      this.gain=A.actx.createGain();this.gain.gain.value=0;
      this.duckGain=A.actx.createGain();this.duckGain.gain.value=1;
      this.gain.connect(this.duckGain);this.duckGain.connect(A.preMaster);
    }
    if(entered&&T-this.playedAt>=REPLAY_GAP_S){
      if(!this.buf)this._bake(A);
      this._stopSource();
      const src=A.actx.createBufferSource();src.buffer=this.buf;src.loop=false;src.connect(this.gain);src.start(T);
      this.source=src;this.playedAt=T;this.endsAt=T+PHRASE_S+.1;this.plays++;
    }
    // a finished source is let go on the clock, never on onended (the pool's law)
    if(this.source&&T>this.endsAt)this._stopSource();
    if(this._duckUntil<=T){this._duck=1;this._duckUntil=Infinity;}
    this.gain.gain.setTargetAtTime(active?LEVEL:0,T,active?IN_TAU:OUT_TAU);
    this.duckGain.gain.setTargetAtTime(this._duck,T,DUCK_TAU);
  }
  _stopSource(){
    if(!this.source)return;
    try{this.source.stop();}catch{}
    try{this.source.disconnect();}catch{}
    this.source=null;
  }
  state(){return{active:this.active,playing:!!this.source,plays:this.plays,duck:this._duck,sinceStartS:+(this._now()-this.playedAt).toFixed(1)};}
  dispose(){this._stopSource();this.gain?.disconnect();this.duckGain?.disconnect();}
}
