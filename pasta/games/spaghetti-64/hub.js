import * as THREE from './vendor/three.module.js';
import {createPastaKit} from './pasta.js';
import {createPastaFace} from './face.js';
import {createDorrieModel} from './hmc-world.js';
import {createKleptoModel} from './ssl-world.js';
import {createSubmarineModel} from './ddd-world.js';
import {createSnowmanFace,createSlPenguinModel} from './sl-world.js';
import {createPiranhaModel} from './thi-world.js';
import {CanvasPastaRenderer} from './compat-renderer.js';
import {PastaAudio} from './audio.js';
import {COURSES,COURSE_IDS,COURSE_COUNT,getProgress,starsCollected} from './courses.js';
import {getAdventure,collectionTotal,STAR_TOTAL} from './adventure.js';

const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const canvas=$('face-canvas'),audio=new PastaAudio(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(),intersection=new THREE.Vector3();
let renderer,scene,camera,kit,face,texture,mode='title',time=0,dragId=null,dragDistance=0,dragHandle=null,lastStatus=-1,demo=null,thumbnailTask=null;
let courseFilter='all',visibleCourses=COURSE_IDS.slice();
let priorPad=[],selectedCourse=0,selectedDestination='bob',titleSelection=0,softness=.65,renderNeeded=true;
const arenaIds=['bowser_1','bowser_2','bowser_3'];
const navigationIds=()=>[...visibleCourses,...arenaIds,'castle'];
const destinationElement=id=>$(id==='castle'?'enter-castle':arenaIds.includes(id)?'arena-'+id:'course-'+id);
const destinationHref=id=>'./play.html?course='+id+(id==='castle'?'&entry=resume':'');
function stepTitle(){titleSelection=1-titleSelection;$(titleSelection?'title-castle':'start').focus();}
function safeRead(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
function makeRenderer(target,width,height){const gl=target.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});let r;if(gl)r=new THREE.WebGLRenderer({canvas:target,context:gl,antialias:true});else r=new CanvasPastaRenderer({canvas:target});r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.07;r.setPixelRatio(Math.min(devicePixelRatio,1.6));r.setSize(width,height,false);return r;}
function updateProgress(){const progress=getProgress();const adventure=getAdventure(),total=collectionTotal(progress,adventure);$('star-total').textContent=`${total} / ${STAR_TOTAL}`;$('kingdom-progress').textContent=`${total} / ${STAR_TOTAL} pasta stars`;$('key-record').textContent=`${Number(adventure.keys.basement)+Number(adventure.keys.upper)} / 2 keys`;$('cap-record').textContent=`${Object.values(adventure.caps).filter(Boolean).length} / 3 cap switches`;$('ending-record').textContent=adventure.finished?'Grand Star collected':'The Grand Star awaits';for(const id of COURSE_IDS){const done=!!progress[id]?.completed;$(id+'-star').textContent=done?'★':'☆';$(id+'-star').classList.toggle('collected',done);$(id+'-star').setAttribute('aria-label',done?'First star collected':'Star not collected');$(id+'-progress').textContent=done?`STAR COLLECTED · BEST ${formatTime(progress[id].bestTime??progress[id].time)}`:`${COURSES[id].kind==='secret'?'SECRET STAR':COURSES[id].kind==='bonus'?'BONUS STAR':'FIRST STAR'} · READY TO PLAY`;}}
function formatTime(seconds){return `${Math.floor((seconds||0)/60)}:${String(Math.floor((seconds||0)%60)).padStart(2,'0')}`;}
function setMode(next,updateHash=true){mode=next;renderNeeded=true;face?.endDrag();dragId=null;demo=null;canvas.classList.remove('dragging');$('title-screen').classList.toggle('hidden',next!=='title');$('course-select').classList.toggle('hidden',next!=='courses');$('hub').classList.toggle('selecting',next==='courses');if(updateHash&&location.hash!==`#${next}`)history.replaceState(null,'',`#${next}`);updateProgress();if(next==='courses'){renderThumbnails();destinationElement(selectedDestination).focus();$('face-status').textContent=`Level select. ${collectionTotal(getProgress(),getAdventure())} of ${STAR_TOTAL} stars collected. All ${COURSE_COUNT} courses and the castle are available.`;}else{titleSelection=0;$('start').focus();$('face-status').textContent='Spaghetti Mario face. Drag a feature to stretch the noodles.';}}
function setTip(text){$('face-tip').textContent=text;}
function resize(){if(!renderer)return;renderNeeded=true;const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<700?44:42;camera.position.set(w>900?.18:0,.14,w<700?Math.max(10,1.8/(Math.tan(22*Math.PI/180)*(w/h))+.7):h<620?7.2:7.6);camera.lookAt(w>900?.18:0,.14,0);camera.updateProjectionMatrix();face.group.position.set(w>900?.65:0,w<700?.10:0,0);}
function createLighting(){scene.add(new THREE.HemisphereLight('#fff1d4','#463019',1.1));const key=new THREE.DirectionalLight('#fff1d0',3.2);key.position.set(-3,5,6);scene.add(key);const fill=new THREE.DirectionalLight('#e4d9c4',.8);fill.position.set(4,1,4);scene.add(fill);const rim=new THREE.DirectionalLight('#ffcb7c',1.7);rim.position.set(2,3,-3);scene.add(rim);if(renderer.isSoftware)return;const ec=document.createElement('canvas');ec.width=512;ec.height=256;const c=ec.getContext('2d'),g=c.createLinearGradient(0,0,0,256);g.addColorStop(0,'#fff3db');g.addColorStop(.5,'#c9b28a');g.addColorStop(1,'#43301d');c.fillStyle=g;c.fillRect(0,0,512,256);const glow=c.createRadialGradient(90,60,2,90,60,80);glow.addColorStop(0,'#ffffff');glow.addColorStop(1,'#ffffff00');c.fillStyle=glow;c.fillRect(0,0,512,256);const et=new THREE.CanvasTexture(ec);et.colorSpace=THREE.SRGBColorSpace;et.mapping=THREE.EquirectangularReflectionMapping;const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromEquirectangular(et).texture;scene.environmentIntensity=.8;pm.dispose();et.dispose();}
async function init(){renderer=makeRenderer(canvas,innerWidth,innerHeight);if(renderer.isSoftware)renderer.maxSegments=9500;scene=new THREE.Scene();scene.background=new THREE.Color('#2d1b0c');camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.08,100);kit=createPastaKit();await kit.loadPhotographicSurfaces?.();face=createPastaFace(kit);scene.add(face.group);const savedSoftness=Number(safeRead('spaghetti64-softness','.65'));softness=clamp(Number.isFinite(savedSoftness)?savedSoftness:.65,0,1);face.setSoftness(softness);$('face-softness').value=String(softness);updateSoftnessLabel();createLighting();
  texture=await new THREE.TextureLoader().loadAsync('./assets/spaghetti-surface.png');texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const curtainTexture=texture.clone();curtainTexture.repeat.set(5,4);const curtainMaterial=new THREE.MeshPhysicalMaterial({map:curtainTexture,color:'#49311a',roughness:.62,metalness:0,clearcoat:.12,side:THREE.DoubleSide});const curtain=new THREE.Mesh(new THREE.PlaneGeometry(34,25),curtainMaterial);curtain.position.z=-5;scene.add(curtain);
  for(let i=0;i<2;i++){const star=kit.star(.3);star.position.set(i?2.8:-2.8,.7+(i?.7:-.8),-.6);star.rotation.z=i?-.25:.2;star.name='Opening pasta star';star.userData.floatPhase=i*2;scene.add(star);}
  resize();wire();updateProgress();$('start').disabled=false;$('start-label').textContent='PRESS START';setMode(location.hash==='#courses'?'courses':'title',false);$('face-status').textContent=`Spaghetti face ready. 15 draggable features. ${renderer.isSoftware?'Compatibility visuals.':'Physical pasta lighting.'}`;
  let last=performance.now();function frame(now){const dt=Math.min(.10,Math.max(.001,(now-last)/1000));last=now;time+=dt;try{update(dt);if(mode==='title'||renderNeeded){renderer.render(scene,camera);renderNeeded=false;}}catch(error){errorView(error);return;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
function update(dt){if(mode!=='title'){pollGamepad();return;}if(demo){demo.time+=dt;const t=Math.min(1,demo.time/.5),eased=Math.sin(t*Math.PI/2);face.drag(demo.origin.clone().addScaledVector(demo.delta,eased));if(demo.time>.9){face.endDrag();demo=null;setTip('Let go. Watch the noodles settle.');}}face.update(dt,time);if(!face.activeHandle){face.group.rotation.y=Math.sin(time*.36)*.025;face.group.rotation.z=Math.sin(time*.28)*.008;}for(const o of scene.children)if(o.name==='Opening pasta star'){o.rotation.y+=dt*.35;o.position.y+=Math.cos(time+o.userData.floatPhase)*dt*.055;}pollGamepad();if(face.activeHandle){dragDistance=face.activeHandle.position.distanceTo(face.activeHandle.rest);if(Math.floor(time*3)!==lastStatus){lastStatus=Math.floor(time*3);$('face-status').textContent=`Pulling ${face.activeHandle.label}. Stretch ${dragDistance.toFixed(2)}. Noodle geometry deformed. Revision ${face.revision}.`;}}}
function pointRay(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);scene.updateMatrixWorld(true);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);}
function release(){if(dragId===null&&!demo)return;face.endDrag();dragId=null;demo=null;canvas.classList.remove('dragging');if(dragHandle){$('face-status').textContent=`Released ${dragHandle.label} after stretching ${dragDistance.toFixed(2)}. Noodles springing back.`;setTip('Let go. Watch the noodles settle.');audio.squish(Math.min(1,dragDistance));}dragHandle=null;}
function pullFeature(id){if(mode!=='title'||!face)return;release();audio.start();scene.updateMatrixWorld(true);const handle=face.handles.find(h=>h.id===id)||face.handles.find(h=>h.id.includes(id));if(!handle)return;const origin=face.group.localToWorld(handle.position.clone());face.beginDrag(handle,origin);demo={time:0,origin,delta:new THREE.Vector3(id.includes('ear')?-1.2:.85,.42,.28)};dragHandle=handle;setTip(`Pulling ${handle.label.toLowerCase()}…`);}
function updateSoftnessLabel(){$('face-softness-label').textContent=softness<.3?'Al dente':softness>.78?'Overcooked':'Tender';}
function filterCourses(filter){
  courseFilter=filter;visibleCourses=COURSE_IDS.filter(id=>filter==='all'||(filter==='main'?!COURSES[id].kind:COURSES[id].kind===filter));
  for(const id of COURSE_IDS){$('course-'+id).hidden=!visibleCourses.includes(id);}
  for(const button of document.querySelectorAll('[data-filter]'))button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
  if(!navigationIds().includes(selectedDestination)){selectedDestination=visibleCourses[0];selectedCourse=COURSE_IDS.indexOf(selectedDestination);}
}
function stepCourse(direction){const ids=navigationIds(),index=ids.indexOf(selectedDestination);selectedDestination=ids[(index+direction+ids.length)%ids.length];if(COURSES[selectedDestination])selectedCourse=COURSE_IDS.indexOf(selectedDestination);destinationElement(selectedDestination).focus();}
function wire(){
  for(const button of document.querySelectorAll('[data-filter]'))button.onclick=()=>filterCourses(button.dataset.filter);

  $('start').onclick=()=>{audio.start();audio.coin();setMode('courses');};$('back-face').onclick=()=>{setMode('title');audio.squish(.2);};$('brand').onclick=e=>{e.preventDefault();setMode('title');};$('reset-face').onclick=()=>{release();face.reset();setTip('Freshly untangled. Go again.');$('face-status').textContent='Face reset. All noodle features returned to their original positions.';audio.squish(.35);};$('pull-nose').onclick=()=>pullFeature('nose');$('pull-ear').onclick=()=>pullFeature('ear');
  $('face-softness').oninput=e=>{softness=+e.target.value;face.setSoftness(softness);updateSoftnessLabel();try{localStorage.setItem('spaghetti64-softness',String(softness));}catch{}};
  canvas.addEventListener('pointerdown',e=>{if(mode!=='title'||dragId!==null)return;pointRay(e);const handle=face.pick(raycaster);if(!handle)return;e.preventDefault();release();audio.start();dragId=e.pointerId;dragHandle=handle;dragDistance=0;const normal=camera.getWorldDirection(new THREE.Vector3());plane.setFromNormalAndCoplanarPoint(normal,handle.worldPoint);face.beginDrag(handle,handle.worldPoint);canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');setTip(`Pulling ${handle.label.toLowerCase()}…`);});
  canvas.addEventListener('pointermove',e=>{if(mode!=='title')return;pointRay(e);if(dragId===e.pointerId){if(raycaster.ray.intersectPlane(plane,intersection))face.drag(intersection);e.preventDefault();}else if(dragId===null){const h=face.pick(raycaster);canvas.style.cursor=h?'grab':'default';}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===dragId)release();});
  for(const [i,id]of COURSE_IDS.entries())$('course-'+id).addEventListener('focus',()=>{selectedCourse=i;selectedDestination=id;});
  for(const id of[...arenaIds,'castle'])destinationElement(id).addEventListener('focus',()=>{selectedDestination=id;});
  $('start').addEventListener('focus',()=>titleSelection=0);$('title-castle').addEventListener('focus',()=>titleSelection=1);
  addEventListener('resize',resize);addEventListener('hashchange',()=>setMode(location.hash==='#courses'?'courses':'title',false));addEventListener('pageshow',updateProgress);addEventListener('blur',()=>release());addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(e.code==='Escape'){release();setMode('title');return;}if(mode==='title'&&['Enter','Space'].includes(e.code)&&!e.target.matches('button,a')){e.preventDefault();audio.start();setMode('courses');}if(mode==='title'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();stepTitle();}if(mode==='title'&&e.code==='KeyR')$('reset-face').click();if(mode==='title'&&e.code==='KeyN')pullFeature('nose');if(mode==='courses'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();stepCourse(['ArrowLeft','ArrowUp'].includes(e.code)?-1:1);}});
}
function pollGamepad(){const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);if(!pad)return;const down=i=>pad.buttons[i]?.pressed&&!priorPad[i];if(mode==='title'){if(down(14)||down(15)||down(12)||down(13))stepTitle();if(down(9)||down(0)){audio.start();if(down(0)&&titleSelection===1)location.href=destinationHref('castle');else setMode('courses');}if(down(2))pullFeature('nose');if(down(1))face.reset();}else{if(down(14)||down(15)||down(12)||down(13)){stepCourse(down(14)||down(12)?-1:1);}if(down(0))location.href=destinationHref(selectedDestination);if(down(1))setMode('title');}priorPad=pad.buttons.map(b=>b.pressed);}

async function renderThumbnails(){
  if(!texture)return;
  if(!thumbnailTask)thumbnailTask=renderCoursePreviews();
  return thumbnailTask;
}
async function renderCoursePreviews(){
  // Fetch independently, then render in order through one temporary context.
  // The card canvases retain 2D snapshots, so adding courses never adds live
  // WebGL contexts or evicts the interactive opening face.
  const dataResults=await Promise.allSettled(COURSE_IDS.map(id=>Promise.all([fetch('./data/'+COURSES[id].render).then(r=>{if(!r.ok)throw Error('Course preview');return r.json();}),['hmc','lll','ssl','ddd','sl','wdw','ttm','thi','ttc','rr','bitdw','bitfs','bits','pss','cotmc','totwc','vcutm','wmotr','sa'].includes(id)?fetch('./data/'+COURSES[id].data).then(r=>{if(!r.ok)throw Error('Course preview data');return r.json();}):Promise.resolve(null)])));
  const previewCanvas=document.createElement('canvas'),sharedMaterials=new Set(Object.values(kit.materials));
  let r;
  try{
    r=makeRenderer(previewCanvas,580,340);
    for(const [index,id]of COURSE_IDS.entries()){
      let s=null,surface=texture;
      try{
    const result=dataResults[index];if(result.status==='rejected')throw result.reason;
    const [sourceData,previewCourse]=result.value;
    const data=id==='ddd'||id==='thi'?sourceData.interior:sourceData;
    const cv=$('preview-'+id);
    if(['ccm','bbh','hmc','lll','ssl','ddd','sl','wdw','ttm','thi','ttc','rr','bitdw','bitfs','bits','pss','cotmc','totwc','vcutm','wmotr','sa'].includes(id)){surface=await new THREE.TextureLoader().loadAsync('./assets/'+(id==='cotmc'?'rigatoni-pasta-surface.png':id==='totwc'||id==='wmotr'?'tricolor-pasta-surface.png':id==='sa'?'glass-noodle-surface.png':id==='pss'?'cooked-spaghetti-macro.png':id==='vcutm'?'rice-noodle-surface.png':id==='ttc'?'rigatoni-pasta-surface.png':id==='rr'?'tricolor-pasta-surface.png':id==='bitdw'?'ink-noodle-surface.png':id==='bitfs'?'roasted-noodle-surface.png':id==='bits'?'spaghetti-surface.png':id==='sl'?'capellini-pasta-surface.png':id==='ttm'||id==='thi'?'fusilli-pasta-surface.png':id==='wdw'?'tagliatelle-surface.png':id==='ssl'?'orzo-pasta-surface.png':id==='ddd'?'glass-noodle-surface.png':id==='lll'?'roasted-noodle-surface.png':id==='bbh'||id==='hmc'?'ink-noodle-surface.png':'rice-noodle-surface.png'));surface.wrapS=surface.wrapT=THREE.RepeatWrapping;surface.colorSpace=THREE.SRGBColorSpace;surface.anisotropy=8;}
    s=new THREE.Scene();s.background=new THREE.Color(id==='ttc'?'#85745c':id==='rr'?'#9bafb0':id==='bitdw'?'#5f526c':id==='bitfs'?'#ad6740':id==='bits'?'#7d819e':id==='sl'?'#b9cacb':id==='wdw'?'#718f96':id==='ttm'?'#8b9f83':id==='thi'?'#8eac8d':id==='ssl'?'#c9a974':id==='ddd'?'#547f8d':id==='hmc'?'#556c5d':id==='lll'?'#ae5f32':id==='bbh'?'#70637e':id==='ccm'?'#647f8b':id==='jrb'?'#346b71':'#a78b59');const g=new THREE.Group();s.add(g);const buckets=new Map();
    for(const f of data.triangles){
      if(id==='sa'){const ps=f.slice(0,3).map(i=>data.vertices[i]);const a=new THREE.Vector3(...ps[0]),b=new THREE.Vector3(...ps[1]),c=new THREE.Vector3(...ps[2]),n=b.sub(a).cross(c.sub(a));if(n.y<-.1||Math.abs(n.y)<.1&&ps.reduce((v,p)=>v+p[0]+p[2],0)>0)continue;}

      if(id==='ttc'){const ps=f.slice(0,3).map(i=>new THREE.Vector3(...data.vertices[i])),center=ps[0].clone().add(ps[1]).add(ps[2]).multiplyScalar(1/3),n=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0])).normalize();if(Math.hypot(center.x,center.z)>15&&center.x+center.z>0&&Math.abs(n.y)<.3)continue;}

      if(id==='ddd'){const ps=f.slice(0,3).map(i=>new THREE.Vector3(...data.vertices[i])),n=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0])).normalize();if(n.y<-.3||Math.max(...ps.map(p=>p.y))>2&&Math.abs(n.y)<.5)continue;}

      if(id==='hmc'){const roomLists=data.roomDisplayLists?.['6'];if(roomLists&&!roomLists.includes(f[5]))continue;const points=f.slice(0,3).map(i=>data.vertices[i]);if(Math.max(...points.map(p=>p[1]))>-23)continue;const a=new THREE.Vector3(...points[0]),b=new THREE.Vector3(...points[1]),c=new THREE.Vector3(...points[2]);if(b.sub(a).cross(c.sub(a)).y<-.02)continue;}
      if(id==='bbh'&&(!(data.roomDisplayLists?.['13']||[]).includes(f[5])||f[3]==='bbh_seg7_texture_07001800'||f[4]==='LAYER_TRANSPARENT'))continue;
      if(/0900B000/i.test(String(f[3]))||/shadow/i.test(String(f[3])))continue;
      const label=String(f[3]);
      const color=id==='ttc'?(/09001000|09001800/.test(label)?'#b49e76':'#d2bd93'):id==='rr'?(/0700|09005000/.test(label)?'#d7bea2':'#b8b8a4'):id==='bitdw'?(/09004800|09005000|09006000/.test(label)?'#adb585':'#c1b6c6'):id==='bitfs'?(/07001800/.test(label)?'#db9b6d':'#c6b18b'):id==='bits'?(/09003000|09003800/.test(label)?'#b7a5bc':'#d4c394'):id==='sl'?(/09001000|09001800|09003000/i.test(label)?'#b6c9cc':'#f3ead7'):id==='wdw'?(/09001000|09003000/i.test(label)?'#96b2a6':'#cbb891'):id==='ttm'?(/09004800|09005000/i.test(label)?'#a4b479':/07000800|07001800|07002800/i.test(label)?'#ca8658':'#c9b68e'):id==='thi'?(/09005800|09006000/i.test(label)?'#a5b776':'#cabb8f'):id==='ssl'?(/quicksand|09008000/i.test(label)?'#8c6442':/09002000|09002800|09003000/i.test(label)?'#d6b986':'#efcf91'):id==='ddd'?(/0900A000|07001800/i.test(label)?'#dac79d':'#b1c9c5'):id==='hmc'?(/09000000|09003000|09007800|0900A000/i.test(label)?'#859e95':'#d1c69b'):id==='lll'?(/lava|09000000|07000000/i.test(label)?'#e8a77c':'#9d8261'):id==='bbh'?(/09008800|09004800|07000000|09007000/i.test(label)?'#d1c4dc':'#cbb797'):id==='ccm'?(/wood|cabin|roof/i.test(label)?'#ba9974':'#e1e5dd'):id==='jrb'?(/ship|wood|0[6789]000/i.test(label)?'#d2af76':'#729496'):/05800|grass/i.test(label)?'#9aa960':/06000|wood/i.test(label)?'#dec48c':id==='wf'?'#cfa76a':'#c39b5b';
      if(!buckets.has(color))buckets.set(color,[]);buckets.get(color).push(f);
    }
    for(const [color,faces]of buckets){
      const pos=[],uv=[];for(const f of faces){const vs=f.slice(0,3).map(i=>new THREE.Vector3(...data.vertices[i]));const n=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).normalize();const axis=Math.abs(n.y)>.5?'y':Math.abs(n.x)>Math.abs(n.z)?'x':'z';for(const p of vs){pos.push(p.x,p.y,p.z);uv.push((axis==='x'?p.z:p.x)/4.25,(axis==='y'?p.z:p.y)/4.25);}}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();g.add(new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({color,map:(id==='bbh'&&color==='#cbb797')||(id==='hmc'&&color==='#d1c69b')||(id==='lll'&&color==='#9d8261')||(id==='ssl'&&color==='#d6b986')||(id==='ddd'&&color==='#dac79d')?texture:surface,metalness:0,roughness:id==='ccm'?.36:.45,clearcoat:.3,side:THREE.DoubleSide})));
    }
    if(id==='jrb'){const sea=new THREE.Mesh(new THREE.PlaneGeometry(142.96,84.83),new THREE.MeshPhysicalMaterial({map:surface,color:'#4c9a9f',transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide}));sea.rotation.x=-Math.PI/2;sea.position.set(8.44,10.24,35.725);s.add(sea);}
    if(id==='hmc'){const water=new THREE.Mesh(new THREE.PlaneGeometry(81.91,102.13,16,20),new THREE.MeshPhysicalMaterial({map:texture,color:'#779a8b',transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide,roughness:.2}));water.rotation.x=-Math.PI/2;water.position.set(-35.325,-47.91,25.475);s.add(water);const dorrie=createDorrieModel(kit);dorrie.position.set(-48,-49.69,48);dorrie.rotation.y=Math.PI*.75;s.add(dorrie);const star=kit.star(1.35);star.position.set(-36,-40,36);s.add(star);}
    if(id==='lll'){const ps=[],uv=[];for(const f of previewCourse.triangles.filter(f=>f[3]==='SURFACE_BURNING'&&f.slice(0,3).every(i=>previewCourse.vertices[i][1]<.1)))for(const i of f.slice(0,3)){const v=previewCourse.vertices[i];ps.push(v[0],v[1]+.02,v[2]);uv.push(v[0]/6,v[2]/6);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();s.add(new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({map:surface,color:'#e79a71',roughness:.35,side:THREE.DoubleSide})));for(const d of previewCourse.dynamic||[]){if(!d.renderVertices||d.initiallyEnabled===false)continue;const p=[],u=[];for(const f of d.renderTriangles)for(const i of f.slice(0,3)){const v=d.renderVertices[i];p.push(...v);u.push(v[0]/3,v[2]/3);}const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(p,3));dg.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));dg.computeVertexNormals();const m=new THREE.Mesh(dg,new THREE.MeshPhysicalMaterial({color:'#cdb37f',map:texture,roughness:.4,side:THREE.DoubleSide}));m.position.set(...d.position);m.rotation.y=(d.yaw||0)*Math.PI/180;g.add(m);}}
    if(id==='ssl'){
      const bird=createKleptoModel(kit);bird.position.set(22,13,-28.2);bird.rotation.y=-.5;s.add(bird);
    }
    if(id==='ddd'){
      for(const model of data.models||[]){if(model.kind!=='bhvBowsersSub')continue;const sub=createSubmarineModel(kit,model,{ribbon:texture});g.add(sub);}
      const water=new THREE.Mesh(new THREE.PlaneGeometry(90,128,18,24),new THREE.MeshPhysicalMaterial({map:surface,color:'#80b2c2',transparent:true,opacity:.32,alphaTest:.001,depthWrite:false,side:THREE.DoubleSide,roughness:.18,clearcoat:.9}));water.rotation.x=-Math.PI/2;water.position.set(22,0,-1);s.add(water);
      const star=kit.star(1.3);star.position.set(39,8.5,-6);s.add(star);
    }
    if(id==='sl'){g.add(createSnowmanFace(kit));const penguin=createSlPenguinModel(kit);penguin.position.set(10,33.28,13.3);penguin.rotation.y=-Math.PI/2;g.add(penguin);const star=kit.star(1.3);star.position.set(7,45,6.9);g.add(star);}
    if(id==='wdw'){
      for(const d of previewCourse.dynamic||[]){if(!d.renderVertices||d.initiallyEnabled===false)continue;const ps=[],uv=[];for(const f of d.renderTriangles)for(const i of f.slice(0,3)){const v=d.renderVertices[i];ps.push(...v);uv.push(v[0]/3,v[2]/3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({map:texture,color:'#d4bd8b',roughness:.35,side:THREE.DoubleSide}));mesh.position.set(...d.position);mesh.rotation.y=(d.yaw||0)*Math.PI/180;g.add(mesh);}
      const water=new THREE.Mesh(new THREE.PlaneGeometry(81.9,81.9),new THREE.MeshPhysicalMaterial({map:surface,color:'#7dafa8',transparent:true,opacity:.27,depthWrite:false,side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;water.position.y=10.24;s.add(water);
    }
    if(id==='ttm'){const star=kit.star(1.5);star.position.set(12,26,1.5);g.add(star);}
    if(id==='thi'){for(const flower of previewCourse.mission.flowers){const plant=createPiranhaModel(kit);plant.position.set(...flower.position);plant.scale.setScalar(flower.scale);plant.rotation.y=.8;g.add(plant);}const star=kit.star(1.8);star.position.set(...previewCourse.mission.star.position);g.add(star);}
    if(['ttc','rr','bitdw','bitfs','bits','pss','cotmc','totwc','vcutm','wmotr','sa'].includes(id)){
      for(const d of previewCourse.dynamic||[]){
        if(!d.renderVertices?.length||d.initiallyEnabled===false||d.type==='tumbling_bridge')continue;
        const ps=[],uv=[];for(const f of d.renderTriangles)for(const i of f.slice(0,3)){const v=d.renderVertices[i];ps.push(...v);uv.push(v[0]/2.5,v[2]/2.5);}
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
        const carpet=d.type?.includes('carpet'),m=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({map:carpet?surface:texture,color:carpet?'#f1dfca':id==='ttc'?'#dec18a':'#d0bb91',roughness:.4,clearcoat:.4,side:THREE.DoubleSide}));m.position.set(...(carpet&&d.path?.[0]?d.path[0]:d.position));m.rotation.set((d.pitch||0)*Math.PI/180,(d.yaw||0)*Math.PI/180,(d.roll||0)*Math.PI/180,'YXZ');m.scale.setScalar(d.scale||1);g.add(m);
      }
      for(const surfaceData of data.movingSurfaces||[]){const ps=[],uv=[];for(const f of surfaceData.triangles)for(const i of f.slice(0,3)){const v=surfaceData.vertices[i];ps.push(...v);uv.push(v[0]/4,v[2]/4);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();g.add(new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({map:surface,color:'#df8d53',roughness:.25,side:THREE.DoubleSide})));}
      const star=kit.star(1.5);star.position.set(...previewCourse.mission.star.position);g.add(star);
      for(const coin of previewCourse.mission.redCoins||[]){const mesh=kit.coin(.7,true);mesh.position.set(...coin.position);g.add(mesh);}
    }
    const bounds=new THREE.Box3().setFromObject(g),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,size.y*.95);
    const c=new THREE.PerspectiveCamera(37,580/340,.1,1000);if(id==='ttc'){c.position.set(62,35,79);c.lookAt(0,-7,0);}else if(id==='rr'){c.position.copy(center).add(new THREE.Vector3(span*.65,span*.64,span*.98));c.lookAt(center);}else if(['bitdw','bitfs','bits','pss','cotmc','totwc','vcutm','wmotr','sa'].includes(id)){c.position.copy(center).add(new THREE.Vector3(span*.24,span*.52,span*.92));c.lookAt(center);}else if(id==='sl'){c.position.set(77,66,95);c.lookAt(0,20,0);}else if(id==='wdw'){c.position.set(66,64,78);c.lookAt(0,12,0);}else if(id==='ttm'){c.position.set(95,71,114);c.lookAt(4,-10,0);}else if(id==='thi'){c.position.set(-112,72,115);c.lookAt(-8,-8,0);}else if(id==='ssl'){c.position.set(78,84,128);c.lookAt(-3,3,-3);}else if(id==='ddd'){c.position.set(0,50,79);c.lookAt(40,0,6);}else if(id==='hmc'){c.position.set(-62,-38,67);c.lookAt(-35,-45,36);}else if(id==='lll'){c.position.copy(center).add(new THREE.Vector3(span*.65,span*1.0,span*.9));c.lookAt(center);}else if(id==='bbh'){c.position.set(76,58,105);c.lookAt(0,7,10);}else{c.position.copy(center).add(id==='jrb'?new THREE.Vector3(-span*.75,span*1.55,span*.8):id==='ccm'?new THREE.Vector3(span*.9,span*.7,span*1.1):new THREE.Vector3(span*.95,span*.82,span*1.08));c.lookAt(center);}
    s.add(new THREE.HemisphereLight(id==='ccm'?'#f2f7f1':'#fff2d3',id==='ccm'?'#687b82':'#5c4625',1.8));const l=new THREE.DirectionalLight('#fff1d4',2.3);l.position.set(-50,100,70);s.add(l);
    r.render(s,c);
    cv.width=previewCanvas.width;cv.height=previewCanvas.height;
    const snapshot=cv.getContext('2d');if(!snapshot)throw Error('Course preview snapshot');
    snapshot.drawImage(previewCanvas,0,0,cv.width,cv.height);cv.dataset.ready='true';
      }catch(error){$('preview-'+id).setAttribute('aria-label',COURSES[id].name+' — course preview unavailable');console.warn('Course preview unavailable:',id,error.message);}
      finally{
        const geometries=new Set(),materials=new Set();
        s?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m&&!sharedMaterials.has(m))materials.add(m);});
        for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
        if(surface!==texture)surface.dispose();r.renderLists?.dispose();
      }
    }
  }finally{
    r?.dispose();if(r&&!r.isSoftware)r.forceContextLoss?.();
    previewCanvas.width=previewCanvas.height=1;
  }
}
function errorView(error){console.error(error);$('hub-error-text').textContent=error?.message||String(error);$('hub-error').classList.remove('hidden');$('start').disabled=false;$('start-label').textContent='CHOOSE A COURSE';$('start').onclick=()=>setMode('courses');}
init().catch(errorView);
