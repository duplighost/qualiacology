// Marnie's lookout sees the places the player has actually lit, in their real bearings.
// Far destinations exceed the terrain draw distance. These small optical horizon points
// extend their lamps into the distant view only while the player stands on the lookout.
import * as THREE from 'three';
import { MAJORS, MAJOR_BY_ID } from './placedata.js';
import { clamp01 } from '../engine/math.js';

export function poweredDestinations(places) {
  return MAJORS.filter(d => d.lit || !!places?.isClaimed?.(d.id));
}

export class LoreLookout {
  static id='lore-lookout';
  constructor(ctx){this.ctx=ctx;this.points=[];this.root=null;this.count=0;this.visible=false;}
  _sys(id){return this.ctx.systems?.get(id);}
  async init(){this._build();}
  _build(){
    if(this.root||!this.ctx.scene)return;
    const places=this._sys('places');if(!places?.matGlow)return;
    this.root=new THREE.Group();this.root.name='great-tree-distant-lamps';this.root.visible=false;this.ctx.scene.add(this.root);
    this.geo=new THREE.SphereGeometry(1,6,4);
    // Same Basic material family used by dread: no point lights, rover slots or new effects.
    this.mat=this._sys('dread')?.matLantern?.clone() || new THREE.MeshBasicMaterial({transparent:true,
      fog:false,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
    // Reuse the prewarmed distant-lantern recipe exactly. The separate name keeps
    // airlight from mistaking these optical horizon points for ground-level lamps.
    this.mat.name='lookout-horizon';this.mat.color.setHex(0xe8ba78);this.mat.opacity=.85;
    const tree=MAJOR_BY_ID['great-tree'],rec=places.nodes?.get(tree.id),base=rec?.padY||this._sys('terrain')?.heightAt?.(tree.x,tree.z)||0;
    this.deckY=base+(tree.claim?.dy||12.9);
    for(const d of MAJORS){
      const mesh=new THREE.Mesh(this.geo,this.mat);mesh.name='lookout-light:'+d.id;mesh.visible=false;
      if(d.id===tree.id){mesh.position.set(tree.x+4.2,this.deckY+1.15,tree.z+.6);mesh.scale.setScalar(.065);}
      else{
        const dx=d.x-tree.x,dz=d.z-tree.z,dist=Math.hypot(dx,dz),r=Math.min(640,dist);
        const realY=(places.nodes?.get(d.id)?.padY||0)+(d.claim?.dy||7);
        // Optical compression preserves compass bearing; enough height to clear the near canopy.
        mesh.position.set(tree.x+dx/dist*r,Math.max(this.deckY+12,this.deckY+(realY-this.deckY)*r/dist),tree.z+dz/dist*r);
        mesh.scale.setScalar(.6+r*.0011);
      }
      this.root.add(mesh);this.points.push({id:d.id,mesh});
    }
  }
  getPoweredCount(){const places=this._sys('places');let n=0;for(const d of MAJORS)if(d.lit||places?.isClaimed?.(d.id))n++;return n;}
  step(dt){
    if(!this.root)this._build();if(!this.root)return;
    const tree=MAJOR_BY_ID['great-tree'],pos=this._sys('player')?.pos;
    const onDeck=!!pos&&Math.hypot(pos.x-tree.x,pos.z-tree.z)<20&&pos.y>this.deckY-1.8;
    this.visible=onDeck;this.root.visible=onDeck;
    this.ctx.shared.lookoutPoweredCount=this.getPoweredCount();
    if(!onDeck)return;
    const places=this._sys('places');this.count=0;
    for(const p of this.points){p.mesh.visible=!!MAJOR_BY_ID[p.id].lit||!!places?.isClaimed?.(p.id);if(p.mesh.visible)this.count++;}
    this.mat.opacity=.85*(1-clamp01(this.ctx.shared.trueDawn||0));
    if(this.ctx.shared.morningReturned)this.mat.opacity=0;
  }
  state(){return{onDeck:this.visible,powered:this.getPoweredCount(),visiblePoints:this.visible?this.count:0};}
  ready(){return !!this.root;}
  dispose(){this.root?.removeFromParent();this.geo?.dispose();this.mat?.dispose();}
}
