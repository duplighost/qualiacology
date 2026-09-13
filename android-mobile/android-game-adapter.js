/* Integration only: preserve the game's own pause screen and original control rules. */
(()=>{'use strict';let continueFalling=false,continueThurible=false;
 document.addEventListener('androidwillpause',()=>{
  continueFalling=document.body?.dataset.mode==='playing'&&!!document.getElementById('resume-button');
  continueThurible=window.__THURIBLE3D__?.phase()==='play';
  if(continueThurible)window.__THURIBLE3D__.pauseGame();
 });
 document.addEventListener('androidresume',()=>{
  if(continueFalling&&document.getElementById('pause-panel')?.hidden===false)document.getElementById('resume-button').click();
  if(continueThurible&&window.__THURIBLE3D__?.phase()==='paused')window.__THURIBLE3D__.resumeGame();
  continueFalling=false;continueThurible=false;
 });
})();
