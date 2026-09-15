import * as THREE from 'three';

// A persistent bonnet plume and a brief impact receipt share the real condition state.
export class CarDistress {
  constructor(ctx) {
    this.ctx=ctx;this.until=0;this.root=new THREE.Group();this.root.name='car-engine-smoke';ctx.scene.add(this.root);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,1,32,32,31);
    g.addColorStop(0,'rgba(210,216,211,.72)');g.addColorStop(.4,'rgba(150,158,153,.46)');g.addColorStop(1,'rgba(80,87,83,0)');c.fillStyle=g;c.fillRect(0,0,64,64);
    this.texture=new THREE.CanvasTexture(canvas);this.puffs=[];
    for(let i=0;i<22;i++){const material=new THREE.SpriteMaterial({map:this.texture,transparent:true,depthWrite:false,color:0x9da29d});const puff=new THREE.Sprite(material);this.root.add(puff);this.puffs.push(puff);}
    this.cue=document.createElement('div');this.cue.id='car-condition-feedback';this.cue.style.cssText='position:fixed;left:50%;top:22%;transform:translateX(-50%);padding:12px 22px;background:#0b1217dd;border:1px solid #ba9b6477;color:#e7d6b4;font:15px Georgia;text-align:center;pointer-events:none;z-index:16;letter-spacing:.06em';this.cue.hidden=true;document.body.append(this.cue);
  }
  hit(shield){this.until=(this.ctx.time?.t||0)+3;this.blocked=shield;}
  update(car,time){
    // The SMOKE follows the needle (car.wearShown), not the raw number, so it thins out over
    // the pour instead of vanishing on one frame. The disabled test is the real wear.
    const shown=car.wearShown===undefined?car.wear:car.wearShown;
    const failed=car.wear>=.999,severity=Math.max(0,(shown-.64)/.36),front=1.5;
    this.root.visible=car.exists&&severity>0;
    this.root.position.set(car.x-Math.sin(car.heading)*front,car.y+1.28,car.z-Math.cos(car.heading)*front);
    for(let i=0;i<this.puffs.length;i++){
      const p=this.puffs[i],u=((time*.25+i/this.puffs.length)%1),age=u*4;
      p.visible=failed||i<12;p.position.set(Math.sin(i*2.4+age)*(.12+u*.5)+u*.6,age*(failed?1.15:.65),Math.cos(i*1.7)*(.12+u*.5));
      p.scale.setScalar((.48+u*2.9)*(failed?1:.64));p.material.opacity=Math.sin(u*Math.PI)*severity*(failed?.72:.4);p.material.rotation=i*2.1+time*.12;
    }
    // ALEX, 2026-09-15: "i don't thing we need that big rectangle on screen ... it already
    // tells them that in the audio message and at the hover over on the car."
    //
    // This used to stand on screen for as long as you were within 8 m of a disabled car, and
    // since the night now starts beside one it was simply UP from the first frame, over the
    // opening. It said nothing the message and the car's own E prompt do not. What is left is
    // the three-second RECEIPT for a hit you just took, which is the other half this element
    // was built for and is not a standing sign.
    const player=this.ctx.systems.get('player');
    this.cue.hidden=this.ctx.paused||!this.ctx.playing||player?.dead||!(time<this.until);
    if(!this.cue.hidden)this.cue.textContent=failed?'CAR DISABLED · USE GAS AT THE CAP':this.blocked?'WARD ABSORBED THE HIT · '+Math.floor(car.shield)+' CHARGES':'BODY HIT · CAR CONDITION '+Math.max(0,Math.round((1-shown)*100))+'%';
  }
  dispose(){this.root.removeFromParent();this.puffs.forEach(p=>p.material.dispose());this.texture.dispose();this.cue.remove();}
}
