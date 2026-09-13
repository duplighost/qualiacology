/* Qualiacology offline Android host. Loaded before the unmodified game scripts. */
(()=>{'use strict';
 if(window.__androidHost)return;
 const realNow=performance.now.bind(performance), raf=window.requestAnimationFrame.bind(window), caf=window.cancelAnimationFrame.bind(window);
 let paused=false, began=0, offset=0, sequence=1;
 const pending=new Map(), contacts=new Map(), touches=new Map(), keys=new Map(), contexts=new Set(), resumeContexts=new Set();
 let media=[];
 const now=()=>paused?began-offset:realNow()-offset;
 try{Object.defineProperty(performance,'now',{configurable:true,value:now});}catch(_){}
 const arm=(id,entry)=>{entry.native=raf(t=>{entry.native=0;if(paused)return;pending.delete(id);entry.cb(t-offset);});};
 window.requestAnimationFrame=cb=>{const id=sequence++;const entry={cb,native:0};pending.set(id,entry);if(!paused)arm(id,entry);return id;};
 window.cancelAnimationFrame=id=>{const e=pending.get(id);if(e){if(e.native)caf(e.native);pending.delete(id);}};
 for(const name of ['AudioContext','webkitAudioContext']){
  const Native=window[name];if(!Native)continue;
  window[name]=new Proxy(Native,{construct(target,args){
   const ctx=Reflect.construct(target,args), nativeResume=ctx.resume.bind(ctx);
   ctx.resume=()=>{if(paused){resumeContexts.add(ctx);return Promise.resolve();}return nativeResume();};
   contexts.add(ctx);if(paused){resumeContexts.add(ctx);ctx.suspend().catch(()=>{});}return ctx;
  }});
 }
 // A platform can deliver coalesced input after cancellation. Keep it outside
 // both the tracker and the original game until the native Continue action.
 // Synthetic cancellation events remain allowed through to clear game state.
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel','mousedown','mousemove','mouseup','click','keydown','keyup']){
  addEventListener(type,e=>{if(paused&&e.isTrusted){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
 }
 addEventListener('pointerdown',e=>{if(e.isTrusted&&!paused)contacts.set(e.pointerId,{target:e.target,x:e.clientX,y:e.clientY,type:e.pointerType});},true);
 addEventListener('pointermove',e=>{if(contacts.has(e.pointerId)){const p=contacts.get(e.pointerId);p.x=e.clientX;p.y=e.clientY;}},true);
 for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>contacts.delete(e.pointerId),true);
 for(const type of ['touchstart','touchmove'])addEventListener(type,e=>{if(e.isTrusted&&!paused)for(const t of e.changedTouches)touches.set(t.identifier,t);},true);
 for(const type of ['touchend','touchcancel'])addEventListener(type,e=>{for(const t of e.changedTouches)touches.delete(t.identifier);},true);
 addEventListener('keydown',e=>{if(e.isTrusted)keys.set(e.code,e.key);},true);addEventListener('keyup',e=>keys.delete(e.code),true);
 function clearInput(){
  // Touch-only games require the real target AND a nonempty changedTouches list.
  const touchGroups=new Map();for(const t of touches.values()){if(!touchGroups.has(t.target))touchGroups.set(t.target,[]);touchGroups.get(t.target).push(t);}touches.clear();
  for(const [target,changed] of touchGroups){try{target.dispatchEvent(new TouchEvent('touchcancel',{bubbles:true,cancelable:true,touches:[],targetTouches:[],changedTouches:changed}));}catch(_){} }
  for(const [id,p] of [...contacts]){try{p.target.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:id,pointerType:p.type,clientX:p.x,clientY:p.y,buttons:0}));if(p.target.hasPointerCapture?.(id))p.target.releasePointerCapture(id);}catch(_){} }
  contacts.clear();
  for(const [code,key] of keys)document.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,code,key}));keys.clear();
 }
 function pause(){
  if(paused)return;began=realNow();paused=true;
  document.dispatchEvent(new CustomEvent('androidwillpause'));clearInput();
  for(const e of pending.values()){if(e.native)caf(e.native);e.native=0;}
  for(const ctx of contexts)if(ctx.state==='running'){resumeContexts.add(ctx);ctx.suspend().catch(()=>{});}
  media=[...document.querySelectorAll('audio,video')].filter(el=>!el.paused);media.forEach(el=>el.pause());
  document.dispatchEvent(new CustomEvent('androidpause'));
 }
 function resume(){
  if(!paused)return;clearInput();offset+=realNow()-began;paused=false;
  for(const [id,e] of pending)arm(id,e);
  for(const ctx of resumeContexts)if(ctx.state!=='closed')ctx.resume().catch(()=>{});resumeContexts.clear();
  media.forEach(el=>{const p=el.play();if(p)p.catch(()=>{});});media=[];
  document.dispatchEvent(new CustomEvent('androidresume'));
 }
 window.__androidHost={pause,resume,get paused(){return paused;},get activeTouches(){return Math.max(contacts.size,touches.size);},get pendingFrames(){return pending.size;},get audioContexts(){return contexts.size;},get audioStates(){return [...contexts].map(c=>c.state);},version:'1.0.1'};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 if(window.QualiacologyNative){try{Object.defineProperty(navigator,'vibrate',{value:p=>window.QualiacologyNative.vibrate(Math.max(1,Math.min(65,Number(Array.isArray(p)?p[0]:p)||1)))});}catch(_){} }
 // All assets are already in the APK. Never install a web cache over a new app version.
 if('serviceWorker' in navigator){try{const registration={active:null,waiting:null,installing:null,update:()=>Promise.resolve(),unregister:()=>Promise.resolve(true),addEventListener(){},removeEventListener(){}};Object.defineProperty(navigator,'serviceWorker',{value:{controller:null,ready:Promise.resolve(registration),register:()=>Promise.resolve(registration),getRegistrations:()=>Promise.resolve([]),getRegistration:()=>Promise.resolve(undefined),addEventListener(){},removeEventListener(){}},configurable:true});}catch(_){} }
 const style=document.createElement('style');style.textContent='html,body{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}a[href="/"],a[href="/games/"],#q-home,.q-home,.q-site-home,.site-home-link{display:none!important}';document.head.appendChild(style);
 addEventListener('contextmenu',e=>e.preventDefault());
})();
