(function(global){
  'use strict';
  const C=global.PotCore;
  const AC=global.AudioContext||global.webkitAudioContext;

  class PotAudioEngine{
    constructor(){
      this.ctx=null;this.master=null;this.music=null;this.sfxBus=null;this.ambience=null;this.rain=null;this.rainGain=null;this.windGain=null;this.rainLowGain=null;
      this.enabled=true;this.started=false;this.timer=null;this.nextNote=0;this.step=0;this.stage=0;this.intensity=0;this.lowClarity=0;
      this.noiseBuffer=null;this.active=[];this.musicSeed=0;
    }
    async start(){
      if(!this.enabled||!AC)return false;
      if(!this.ctx){
        this.ctx=new AC();
        this.master=this.ctx.createGain();this.master.gain.value=.78;this.master.connect(this.ctx.destination);
        this.music=this.ctx.createGain();this.music.gain.value=.22;this.music.connect(this.master);
        this.sfxBus=this.ctx.createGain();this.sfxBus.gain.value=.82;this.sfxBus.connect(this.master);
        this.ambience=this.ctx.createGain();this.ambience.gain.value=.3;this.ambience.connect(this.master);
        this.noiseBuffer=this.makeNoise(2);
        this.startRain();
      }
      if(this.ctx.state==='suspended')await this.ctx.resume();
      if(!this.timer){this.nextNote=this.ctx.currentTime+.05;this.timer=setInterval(()=>this.schedule(),50);}
      this.started=true;return true;
    }
    setEnabled(v,startIfNeeded=true){this.enabled=!!v;if(this.master)this.master.gain.setTargetAtTime(this.enabled?.72:0,this.ctx.currentTime,.04);if(v&&startIfNeeded)this.start();}
    setStage(stage){this.stage=stage|0;this.musicSeed=(stage*3)%7;}
    setIntensity(v){this.intensity=C.clamp(v,0,1);if(this.music&&this.ctx)this.music.gain.setTargetAtTime(.19+this.intensity*.19,this.ctx.currentTime,.12);}
    setClarity(v){this.lowClarity=1-C.clamp(v,0,1);if(this.rain&&this.ctx)this.rain.playbackRate.setTargetAtTime(1+this.lowClarity*.2,this.ctx.currentTime,.2);}
    setWeather(level=1,wind=0){
      if(!this.ctx)return;const storm=C.clamp(level,0,1.5),gust=C.clamp(Math.abs(wind),0,1);
      if(this.rainGain)this.rainGain.gain.setTargetAtTime(.2+storm*.22,this.ctx.currentTime,.35);
      if(this.rainLowGain)this.rainLowGain.gain.setTargetAtTime(.035+storm*.055,this.ctx.currentTime,.45);
      if(this.windGain)this.windGain.gain.setTargetAtTime(.018+gust*.055+Math.max(0,storm-1)*.04,this.ctx.currentTime,.6);
    }
    makeNoise(seconds){
      const sr=this.ctx.sampleRate,len=Math.floor(sr*seconds),b=this.ctx.createBuffer(1,len,sr),d=b.getChannelData(0);let last=0;
      for(let i=0;i<len;i++){const white=Math.random()*2-1;last=last*.985+white*.015;d[i]=white*.55+last*.65;}
      return b;
    }
    startRain(){
      const src=this.ctx.createBufferSource();src.buffer=this.noiseBuffer;src.loop=true;
      const hp=this.ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=750;
      const lp=this.ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=6200;
      const gain=this.ctx.createGain();gain.gain.value=.38;
      src.connect(hp);hp.connect(lp);lp.connect(gain);gain.connect(this.ambience);src.start();this.rain=src;this.rainGain=gain;
      const low=this.ctx.createBufferSource(),lowFilter=this.ctx.createBiquadFilter(),lowGain=this.ctx.createGain();low.buffer=this.noiseBuffer;low.loop=true;low.playbackRate.value=.47;lowFilter.type='bandpass';lowFilter.frequency.value=340;lowFilter.Q.value=.55;lowGain.gain.value=.07;low.connect(lowFilter);lowFilter.connect(lowGain);lowGain.connect(this.ambience);low.start();this.rainLow=low;this.rainLowGain=lowGain;
      const wind=this.ctx.createBufferSource(),windFilter=this.ctx.createBiquadFilter(),windGain=this.ctx.createGain();wind.buffer=this.noiseBuffer;wind.loop=true;wind.playbackRate.value=.22;windFilter.type='lowpass';windFilter.frequency.value=920;windFilter.Q.value=.7;windGain.gain.value=.035;wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(this.ambience);wind.start();this.wind=wind;this.windGain=windGain;
      const hum=this.ctx.createOscillator(),hg=this.ctx.createGain();hum.type='sine';hum.frequency.value=43;hg.gain.value=.014;hum.connect(hg);hg.connect(this.ambience);hum.start();this.hum=hum;
    }
    schedule(){
      if(!this.ctx||this.ctx.state!=='running'||!this.enabled)return;
      const horizon=this.ctx.currentTime+.22;
      while(this.nextNote<horizon){this.scheduleStep(this.nextNote,this.step++);const bpm=104+this.stage*4+this.intensity*28;this.nextNote+=60/bpm/2;}
    }
    scheduleStep(t,step){
      const scales=[
        [0,3,7,10],[0,5,7,12],[0,2,7,9],[0,3,8,10],[0,5,9,12],[0,4,7,11]
      ];
      const roots=[45,41,48,43,38,40];
      const scale=scales[this.stage%scales.length],root=roots[this.stage%roots.length];
      const bar=Math.floor(step/8),pos=step%8;
      const chordRoot=root+[0,-2,3,-4][bar%4];
      if(pos===0||pos===4){this.tone(this.midi(chordRoot),t,.34,'triangle',.07,this.music,.02);this.tone(this.midi(chordRoot+12),t,.26,'sine',.025,this.music,.03);}
      if(this.intensity>.08&&(pos%2===0||this.intensity>.65)){
        const n=chordRoot+12+scale[(step+this.musicSeed)%scale.length]+(step%16>11?12:0);
        this.tone(this.midi(n),t,.08+this.intensity*.04,'square',.025+this.intensity*.02,this.music,.008);
      }
      if(this.intensity>.22&&(pos===2||pos===6))this.noiseHit(t,.045,.07+this.intensity*.07,1800,5200,this.music);
      if(this.intensity>.52&&pos%2===1)this.tick(t,.018,.02,this.music);
    }
    midi(n){return 440*Math.pow(2,(n-69)/12);}
    tone(freq,time,dur,type='sine',vol=.1,bus=this.sfxBus,attack=.005,slide=1){
      if(!this.ctx||!this.enabled)return;
      const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();
      o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),time);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),time+dur);
      f.type='lowpass';f.frequency.value=Math.min(12000,Math.max(500,freq*6));
      g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol),time+attack);g.gain.exponentialRampToValueAtTime(.0001,time+dur);
      o.connect(f);f.connect(g);g.connect(bus||this.master);o.start(time);o.stop(time+dur+.03);
    }
    noiseHit(time,dur,vol,lo,hi,bus=this.sfxBus){
      if(!this.ctx||!this.enabled)return;
      const s=this.ctx.createBufferSource(),bp=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=this.noiseBuffer;
      bp.type='bandpass';bp.frequency.value=(lo+hi)/2;bp.Q.value=1.2;
      g.gain.setValueAtTime(vol,time);g.gain.exponentialRampToValueAtTime(.0001,time+dur);
      s.connect(bp);bp.connect(g);g.connect(bus||this.master);s.start(time,Math.random());s.stop(time+dur+.02);
    }
    tick(time,dur,vol,bus=this.sfxBus){this.noiseHit(time,dur,vol,4500,9000,bus);}
    now(){return this.ctx?this.ctx.currentTime:0;}
    shot(power=1,echo=false){const t=this.now(),p=C.clamp(power,.35,1.35);this.tone(echo?760:410,t,.075,'square',.055*p,this.sfxBus,.0015,echo?1.22:1.72);this.tone(echo?430:92,t,.1,'triangle',.045*p,this.sfxBus,.002,.58);this.noiseHit(t,.032,.055*p,2200,9800);}
    blade(step=0){const t=this.now(),finisher=step===2;this.noiseHit(t,finisher?.18:.13,finisher?.17:.12,420,5200);this.tone(150+step*38,t,finisher?.23:.17,'sawtooth',finisher?.085:.06,this.sfxBus,.002,finisher?3.1:2.55);this.tone(finisher?78:112,t+.018,.11,'triangle',finisher?.075:.038,this.sfxBus,.002,.56);}
    dash(perfect=false){const t=this.now();this.noiseHit(t,.11,perfect?.14:.08,700,7000);this.tone(perfect?760:260,t,.13,'triangle',perfect?.09:.05,this.sfxBus,.002,perfect?1.8:.75);}
    hit(heavy=false){const t=this.now();this.noiseHit(t,heavy?.2:.1,heavy?.2:.11,70,2100);this.tone(heavy?54:86,t,heavy?.26:.13,'square',heavy?.14:.075,this.sfxBus,.002,.4);}
    enemyHit(heavy=false){const t=this.now();this.noiseHit(t,heavy?.09:.045,heavy?.105:.055,500,4100);this.tone(heavy?82:126,t,heavy?.14:.075,'square',heavy?.085:.047,this.sfxBus,.001,.52);}
    enemyShot(power=.6){const t=this.now(),p=C.clamp(power,.25,1);this.tone(185+this.stage*12,t,.13,'sawtooth',.025+.04*p,this.sfxBus,.004,.62);this.noiseHit(t,.055,.025+.035*p,1300,6500);}
    kill(heavy=false){const t=this.now();this.noiseHit(t,heavy?.22:.09,heavy?.16:.09,120,3600);this.tone(heavy?96:220,t,heavy?.25:.14,'triangle',heavy?.085:.06,this.sfxBus,.002,1.9);this.tone(heavy?384:520,t+.035,heavy?.28:.18,'sine',heavy?.06:.045,this.sfxBus,.002,1.46);}
    splash(power=.5){const t=this.now(),p=C.clamp(power,.15,1);this.noiseHit(t,.045+.05*p,.018+.045*p,700,5200,this.ambience);if(p>.65)this.tone(92,t,.09,'sine',.018,this.ambience,.002,.72);}
    rainImpact(){const t=this.now();this.noiseHit(t,.12,.055,1200,7600,this.ambience);}
    parry(){const t=this.now();this.tone(1100,t,.17,'sine',.11,this.sfxBus,.001,1.8);this.noiseHit(t,.05,.08,4500,11000);}
    pulse(){const t=this.now();this.tone(74,t,.55,'sine',.15,this.sfxBus,.012,2.7);this.tone(148,t+.02,.4,'triangle',.08,this.sfxBus,.01,1.8);this.noiseHit(t,.2,.11,100,3000);}
    focus(on=true){const t=this.now();this.tone(on?330:520,t,.42,'sine',.07,this.sfxBus,.015,on?2:.5);this.tone(on?495:390,t+.05,.35,'triangle',.04,this.sfxBus,.01,on?1.5:.7);}
    care(index=0){const t=this.now(),root=[261.63,293.66,329.63,392,440,523.25][index%6];[0,4,7,12].forEach((n,i)=>this.tone(root*Math.pow(2,n/12),t+i*.075,.5-i*.04,'sine',.07-i*.008,this.sfxBus,.015,1.02));}
    chime(x=0){const t=this.now();[0,7,12].forEach((n,i)=>this.tone(660*Math.pow(2,n/12),t+i*.035,.72,'sine',.035,this.ambience,.005,.998));}
    boss(){const t=this.now();this.tone(55,t,.9,'sawtooth',.12,this.music,.02,.5);this.noiseHit(t,.5,.18,60,1600,this.music);}
    victory(){const t=this.now();[0,4,7,11,14,19].forEach((n,i)=>this.tone(261.63*Math.pow(2,n/12),t+i*.12,1.2-i*.08,'sine',.075,this.music,.02,1.01));}
  }

  global.PotAudio=new PotAudioEngine();
})(window);
