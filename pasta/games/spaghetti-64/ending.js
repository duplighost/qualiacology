import * as THREE from './vendor/three.module.js';
import {createPastaKit} from './pasta.js';
import {createCastleWorld} from './castle-world.js';
import {CoursePhysics} from './physics.js';
import {CanvasPastaRenderer} from './compat-renderer.js';
import {PastaAudio} from './audio.js';
import {getProgress} from './courses.js';
import {getAdventure,collectionTotal,STAR_TOTAL} from './adventure.js';
const $=id=>document.getElementById(id),adventure=getAdventure(),audio=new PastaAudio();
$('ending-stars').textContent=`${collectionTotal(getProgress(),adventure)} / ${STAR_TOTAL}`;$('ending-keys').textContent=`${Number(adventure.keys.basement)+Number(adventure.keys.upper)} / 2`;$('ending-caps').textContent=`${Object.values(adventure.caps).filter(Boolean).length} / 3`;
if(!adventure.finished){$('ending-title').textContent='The kingdom awaits.';$('ending-message').textContent='Bowser is waiting in the sky. Defeat him and bring the Grand Star home.';$('ending-return').href='./play.html?course=bowser_3';$('ending-return').textContent='Face Bowser in the Sky ↗';}
$('ending-sound').onclick=()=>{audio.start();audio.star();$('ending-sound').textContent='Play again';};
function peach(kit){
  const group=new THREE.Group(),dress=[],gold=[],white=[];group.name='Princess Peach made entirely of pasta';
  for(let i=0;i<35;i++){const y=i/34*1.23,r=.62-(y/1.23)*.40,points=[];for(let j=0;j<=48;j++){const a=j/48*Math.PI*2;points.push([Math.sin(a)*r,y+Math.sin(a*7)*.018,Math.cos(a)*r]);}dress.push(kit.noodleGeometry(points,.025,48,6));}
  const gown=new THREE.Mesh(kit.mergeGeometry(dress),kit.materials.pink);gown.castShadow=true;gown.receiveShadow=true;group.add(gown);dress.forEach(g=>g.dispose());
  const head=kit.coilBall(.265,kit.materials.egg,908);head.position.y=1.57;group.add(head);
  const hair=new THREE.Mesh(kit.winding(.32,.47,.26,.027,49,25),kit.materials.saffron);hair.position.set(0,1.42,-.14);group.add(hair);
  for(const side of[-1,1]){const arm=kit.bundle([side*.19,1.21,0],[side*.43,.79,.06],.06,kit.materials.pink,6);group.add(arm);const glove=kit.coilBall(.085,kit.materials.white,4);glove.position.set(side*.43,.78,.06);group.add(glove);group.add(kit.strand([[side*.09,1.61,.24],[side*.09,1.53,.26]],.016,kit.materials.ink,5));}
  for(let row=0;row<3;row++){const points=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;points.push([Math.sin(a)*.18,1.79+row*.034,Math.cos(a)*.18]);}gold.push(kit.noodleGeometry(points,.02,40,6));}
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,b=(i+.5)/5*Math.PI*2,c=(i+1)/5*Math.PI*2;gold.push(kit.noodleGeometry([[Math.sin(a)*.18,1.84,Math.cos(a)*.18],[Math.sin(b)*.20,2.02,Math.cos(b)*.20],[Math.sin(c)*.18,1.84,Math.cos(c)*.18]],.024,12,6));}
  group.add(new THREE.Mesh(kit.mergeGeometry(gold),kit.materials.saffron));gold.forEach(g=>g.dispose());return group;
}
function toad(kit,side){const root=new THREE.Group(),body=kit.coilBall(.22,kit.materials.blue,2),head=kit.coilBall(.19,kit.materials.egg,3),hat=kit.coilBall(.36,kit.materials.white,4);body.position.y=.34;head.position.y=.65;hat.position.y=.88;hat.scale.y=.63;root.add(body,head,hat);for(let i=0;i<5;i++){const a=i/5*Math.PI*2,dot=kit.coilBall(.09,kit.materials.tomato,5+i);dot.position.set(Math.sin(a)*.24,.97,Math.cos(a)*.24);dot.scale.y=.55;root.add(dot);}root.name='Rice-noodle Toad';return root;}
async function init(){
  const canvas=$('ending-scene');let gl;try{gl=canvas.getContext('webgl2',{alpha:false,antialias:true});}catch{}
  const renderer=gl?new THREE.WebGLRenderer({canvas,context:gl,antialias:true}):new CanvasPastaRenderer({canvas});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;if(renderer.isSoftware){renderer.maxSegments=7500;renderer.maxWidth=1100;}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.08,450);scene.background=new THREE.Color('#d3bd8e');scene.fog=new THREE.Fog('#d3bd8e',125,300);scene.add(new THREE.HemisphereLight('#fff3d3','#5f4b27',1.5));const sun=new THREE.DirectionalLight('#ffe9bd',3.1);sun.position.set(-30,65,30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=22;sun.shadow.camera.bottom=-22;sun.shadow.normalBias=.04;scene.add(sun,sun.target);sun.target.position.set(0,8,-22);
  const data=await Promise.all(['castle-course.json','castle-render-mesh.json'].map(name=>fetch('./data/'+name).then(r=>{if(!r.ok)throw Error('Castle data unavailable');return r.json();}))),kit=createPastaKit(),physics=new CoursePhysics(data[0]);const world=await createCastleWorld(scene,kit,data[0],data[1],physics,{});world.setAdventure(adventure);await kit.loadPhotographicSurfaces();
  const characters=new THREE.Group();scene.add(characters);const princess=peach(kit),mario=kit.hero(),left=toad(kit,-1),right=toad(kit,1);princess.position.set(1,0,0);mario.position.set(-1.2,0,.15);left.position.set(-2.8,0,-.4);right.position.set(2.7,0,-.4);characters.add(princess,mario,left,right);characters.position.set(0,8.11,-22.5);
  const star=kit.star(1.7);star.position.set(0,12,-22.5);scene.add(star);
  const backdrop=await new THREE.TextureLoader().loadAsync('./assets/cooked-spaghetti-macro.png');backdrop.mapping=THREE.EquirectangularReflectionMapping;backdrop.colorSpace=THREE.SRGBColorSpace;scene.background=backdrop;
  const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};resize();addEventListener('resize',resize);
  $('ending-status').textContent=adventure.finished?'The Grand Star and castle progress are saved.':'Bring the Grand Star home to complete the journey.';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let last=performance.now(),time=0;
  function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;world.update(time,dt);mario.userData.update?.(dt,{time,speed:0,grounded:true,softness:.6});star.rotation.y=time*.65;star.position.y=12+Math.sin(time*1.2)*.16;
    const narrow=innerWidth<700,orbit=reduced?0:Math.sin(time*.08)*.4;camera.position.set(narrow?7:10+orbit,narrow?12.8:12.2,narrow?-5:-8);camera.lookAt(narrow?0:-5.7,narrow?9.3:9.8,-23);renderer.render(scene,camera);requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  return{scene,renderer,camera,world,characters,star};
}
init().catch(error=>{$('ending-status').textContent='The castle scene could not load. Your saved progress is safe.';console.error(error);});
