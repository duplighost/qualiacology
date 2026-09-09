// MARROW src/audio.js whisper/moan: original formants, envelopes and sawtooth throat.
// Bake into WWPM's existing spatial voice pool rather than allocating live oscillators.
export async function bakeMarrowVoices(sampleRate,random){
  const bake=async(moan)=>{
    const ctx=new OfflineAudioContext(1,Math.round(sampleRate*(moan?3.1:3.6)),sampleRate);
    const noise=ctx.createBuffer(1,Math.round(sampleRate*2.2),sampleRate),data=noise.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=random()*2-1;
    for(const t of moan?[.2]:[.12,1.95]){
      const s=ctx.createBufferSource();s.buffer=noise;
      const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=moan?4:8;
      bp.frequency.setValueAtTime(moan?300:700,t);
      bp.frequency.linearRampToValueAtTime(moan?520:1600,t+(moan?1:.4));
      bp.frequency.linearRampToValueAtTime(moan?260:900,t+(moan?2:.9));
      const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);
      g.gain.linearRampToValueAtTime(moan ? .05 : .06,t+(moan ? .5 : .15));
      g.gain.linearRampToValueAtTime(.0001,t+(moan?2:1));
      s.connect(bp).connect(g).connect(ctx.destination);s.start(t);s.stop(t+(moan?2.1:1.1));
      if(moan){
        const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(90,t);
        o.frequency.linearRampToValueAtTime(110,t+1);o.frequency.linearRampToValueAtTime(80,t+2);
        const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;
        const og=ctx.createGain();og.gain.setValueAtTime(.0001,t);og.gain.linearRampToValueAtTime(.04,t+.6);og.gain.linearRampToValueAtTime(.0001,t+2);
        o.connect(lp).connect(og).connect(ctx.destination);o.start(t);o.stop(t+2.1);
      }
    }
    const buffer=await ctx.startRendering(),out=buffer.getChannelData(0);
    let peak=0;for(const x of out)peak=Math.max(peak,Math.abs(x));
    if(peak)for(let i=0;i<out.length;i++)out[i]*=.65/peak;
    return buffer;
  };
  return{whisper:await bake(false),moan:await bake(true)};
}
