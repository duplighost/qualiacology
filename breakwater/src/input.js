export class Input {
  constructor(canvas) {
    this.canvas=canvas; this.keys=new Set(); this.buttons=new Set(); this.events=new Map();
    this.dx=0; this.dy=0; this.locked=false; this.sensitivity=.002; this.inverted=false;
    this.onUnlock=null; this.onMenu=null; this.onSkills=null; this.lastMouse=0;
    const enqueue=code=>this.events.set(code,performance.now());
    document.addEventListener('keydown',e=>{
      if (['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code) && (this.locked||e.code==='Tab'&&this.playing)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code); enqueue(e.code);
      if(e.code==='Tab'&&this.playing)this.onSkills?.();
      if(e.code==='Escape'&&this.playing)this.onMenu?.();
    });
    document.addEventListener('keyup',e=>{this.keys.delete(e.code);enqueue(`${e.code}:up`);});
    document.addEventListener('mousemove',e=>{
      if(!this.locked)return;
      this.dx+=Math.max(-180,Math.min(180,e.movementX));
      this.dy+=Math.max(-180,Math.min(180,e.movementY));
    });
    document.addEventListener('mousedown',e=>{if(!this.locked)return;this.buttons.add(e.button);enqueue(`Mouse${e.button}`);});
    document.addEventListener('mouseup',e=>{this.buttons.delete(e.button);if(this.locked)enqueue(`Mouse${e.button}:up`);});
    document.addEventListener('contextmenu',e=>{if(this.locked||e.target===canvas)e.preventDefault();});
    document.addEventListener('pointerlockchange',()=>{
      const before=this.locked;this.locked=document.pointerLockElement===canvas;
      if(!this.locked){this.clear();if(before)this.onUnlock?.();}
    });
    window.addEventListener('blur',()=>{this.clear();this.onUnlock?.();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();this.onUnlock?.();}});
  }
  async lock(){
    if(document.pointerLockElement===this.canvas){this.locked=true;return true;}
    this.locked=false;
    try{await this.canvas.requestPointerLock({unadjustedMovement:true});}
    catch{try{await this.canvas.requestPointerLock();}catch{return false;}}
    // Chromium can resolve the request before dispatching pointerlockchange.
    // Start/resume must observe the actual lock immediately, or the public
    // route mistakenly opens Pause while the mouse is already captured.
    this.locked=document.pointerLockElement===this.canvas;
    return this.locked;
  }
  unlock(){if(document.pointerLockElement===this.canvas)document.exitPointerLock();this.clear();}
  down(code){return this.keys.has(code);}
  mouse(button){return this.buttons.has(button);}
  // Consume each edge once. Render stalls must never erase a jump or release;
  // pause, focus loss and sector changes explicitly clear queued input.
  pressed(code){if(!this.events.has(code))return false;this.events.delete(code);return true;}
  look(){const x=this.dx*this.sensitivity,y=this.dy*this.sensitivity*(this.inverted?-1:1);this.dx=this.dy=0;return{x,y};}
  axis(){let x=Number(this.down('KeyD')||this.down('ArrowRight'))-Number(this.down('KeyA')||this.down('ArrowLeft'));let z=Number(this.down('KeyW')||this.down('ArrowUp'))-Number(this.down('KeyS')||this.down('ArrowDown'));const n=Math.hypot(x,z)||1;return{x:x/n,z:z/n};}
  clear(){this.keys.clear();this.buttons.clear();this.events.clear();this.dx=this.dy=0;}
}
