export class PastaAudio {
  constructor(){this.ctx=null;this.enabled=true;this.musicClock=0;this.step=0;this.nextNote=0;this.immersion=0;}
  start(){if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.24;this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=18000;this.filter.Q.value=.45;this.master.connect(this.filter);this.filter.connect(this.ctx.destination);}this.ctx.resume();}
  setUnderwater(value){this.immersion=Math.max(0,Math.min(1,value||0));if(this.filter)this.filter.frequency.setTargetAtTime(18000*(1-this.immersion)+950*this.immersion,this.ctx.currentTime,.12);}
  setSliding(speed=0,braking=false){
    if(!this.ctx)return;
    if(!this.slideSound&&speed>.2){
      const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate),samples=buffer.getChannelData(0);let smooth=0;
      for(let i=0;i<samples.length;i++){smooth=(smooth+(Math.random()*2-1)*.13)/1.13;samples[i]=smooth*2.5;}
      const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='bandpass';filter.Q.value=.6;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();this.slideSound={source,filter,gain};
    }
    if(this.slideSound){const {source,filter,gain}=this.slideSound,amount=Math.min(1,speed/24),t=this.ctx.currentTime;gain.gain.setTargetAtTime(speed>.2?.035+amount*.1+(braking?.055:0):0,t,.12);filter.frequency.setTargetAtTime(380+amount*1000+(braking?350:0),t,.12);source.playbackRate.setTargetAtTime(.65+amount*.8,t,.12);}
  }
  setEnabled(value){this.enabled=value;if(this.master)this.master.gain.setTargetAtTime(value?.24:0,this.ctx.currentTime,.1);}
  tone(f,duration=.1,type='sine',gain=.25,delay=0,end){if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);}
  squish(amount=.5){if(!this.ctx||!this.enabled)return;const dur=.1+amount*.09,n=Math.floor(this.ctx.sampleRate*dur),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=b;f.type='bandpass';f.frequency.value=500+amount*850;f.Q.value=1.2;g.gain.value=.23+amount*.22;s.connect(f);f.connect(g);g.connect(this.master);s.start();this.tone(130+amount*30,.11,'sine',.15,0,48);}
  jump(){this.tone(230,.19,'triangle',.17,0,590);}
  coin(){this.tone(880,.09,'sine',.25);this.tone(1318,.2,'sine',.2,.07);}
  hit(){this.squish(1);this.tone(95,.3,'triangle',.28,0,36);}
  grab(){this.tone(155,.1,'triangle',.2,0,310);this.squish(.25);}
  throw(){this.tone(490,.2,'sine',.15,0,140);}
  star(){[523.25,659.25,783.99,1046.5,1318.5,1568,2093].forEach((f,i)=>this.tone(f,.48,'triangle',.18,i*.12));this.tone(261.6,1.3,'sine',.18,.2);}
  update(dt,playing){if(!this.ctx||!this.enabled||!playing)return;this.musicClock+=dt;if(this.musicClock<this.nextNote)return;this.nextNote=this.musicClock+.31;const notes=[196,0,293.66,392,0,329.63,261.63,0,220,329.63,440,0,392,293.66,0,246.94,174.61,261.63,349.23,0,293.66,220,0,261.63,196,293.66,392,493.88,440,349.23,293.66,0];const f=notes[this.step%notes.length];if(f)this.tone(f,.18,'triangle',.035);if(this.step%4===0)this.tone([98,110,87.3,98][Math.floor(this.step/8)%4],.28,'sine',.06);this.step++;}
}
