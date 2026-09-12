// A quiet, original music-box phrase under a latched door. No stream or external player.
export class RefugeMusic {
  constructor(ctx,audio){this.ctx=ctx;this.audio=audio;this.source=null;this.gain=null;this.active=false;}
  step(){
    const A=this.audio,p=this.ctx.systems.get('player'),refuge=this.ctx.systems.get('refuge');
    const active=!!(p&&refuge?.isProtected(p.pos.x,p.pos.y,p.pos.z));
    this.active=active;
    if(!A.actx||!A.preMaster||!A.enabled)return;
    if(active&&!this.source){
      const sr=22050,duration=32,N=sr*duration,buf=A.actx.createBuffer(2,N,sr);
      const phrase=[[0,60],[2,67],[4,71],[6,74],[9,69],[11,67],[14,64],[17,62],[19,69],[21,72],[24,71],[27,67]];
      for(let channel=0;channel<2;channel++){
        const data=buf.getChannelData(channel);
        for(const [at,midi] of phrase){
          const freq=440*Math.pow(2,(midi-69)/12)*(channel?1.0008:.9992);
          const offset=Math.round((at+channel*.023)*sr);
          for(let j=0;j<sr*5;j++){
            const t=j/sr,env=(1-Math.exp(-t*120))*Math.exp(-t*1.25);
            const v=(Math.sin(t*freq*Math.PI*2)+.25*Math.sin(t*freq*4.01*Math.PI)+.08*Math.sin(t*freq*6*Math.PI))*env*.16;
            data[(offset+j)%N]+=v;
          }
        }
      }
      this.gain=A.actx.createGain();this.gain.gain.value=0;this.gain.connect(A.preMaster);
      this.source=A.actx.createBufferSource();this.source.buffer=buf;this.source.loop=true;this.source.connect(this.gain);this.source.start();
    }
    if(this.gain)this.gain.gain.setTargetAtTime(active?.12:0,A.actx.currentTime,active?.65:.16);
  }
  dispose(){try{this.source?.stop();}catch{}this.source?.disconnect();this.gain?.disconnect();}
}
