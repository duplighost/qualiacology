import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
const dir='android-test-results';
fs.mkdirSync(dir,{recursive:true});
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024}).trim();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const app='com.qualiacology.pocketsun';
const report={environment:'Android 16 / API 36 emulator; not a physical Pixel test',checks:[],snapshots:{},exceptions:[]};
const stage=name=>{report.stage=name;console.log('STAGE '+name);fs.writeFileSync(dir+'/checks.json',JSON.stringify(report,null,2));};
const check=(name,ok)=>{console.log((ok?'PASS ':'FAIL ')+name);report.checks.push({name,passed:!!ok});fs.writeFileSync(dir+'/checks.json',JSON.stringify(report,null,2));assert.ok(ok,name);};
const screenshot=name=>fs.writeFileSync(dir+'/'+name+'.png',execFileSync('adb',['exec-out','screencap','-p'],{timeout:30000,maxBuffer:16*1024*1024}));
let socket;
let logProcess;
let logFd;
let sequence=0;
const pending=new Map();
async function connect(){
  if(socket)socket.close();
  for(let attempt=0;attempt<60;attempt++){
    try {
      const pid=adb('shell','pidof',app).split(/\s+/)[0];
      if(!pid)throw new Error('No application process');
      adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
      const pages=await fetch('http://127.0.0.1:9222/json').then(r=>r.json());
      const page=pages.find(p=>p.type==='page'&&p.url.startsWith('https://localhost'));
      if(!page)throw new Error('No local game WebView yet');
      socket=new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
      socket.addEventListener('message',event=>{
        const response=JSON.parse(event.data);
        if(response.method==='Runtime.exceptionThrown')report.exceptions.push(response.params.exceptionDetails);
        const request=pending.get(response.id);
        if(request){clearTimeout(request.timer);pending.delete(response.id);if(response.error)request.reject(new Error(JSON.stringify(response.error)));else request.resolve(response.result);}
      });
      await send('Runtime.enable');
      return;
    }catch(error){if(attempt===59)throw error;await delay(1000);}
  }
}
function send(method,params={}){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout at '+report.stage+': '+method+' '+String(params.expression||'').slice(0,160)));},15000);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}
async function ready(){
  for(let n=0;n<100;n++){
    if(await evaluate('document.body?.dataset.gameReady === "true" && !!window.__POCKET_SUN__'))return;
    await delay(100);
  }
  throw new Error('Game never became ready');
}
const state=()=>evaluate('window.__POCKET_SUN__.snapshot()');
const resume=()=>evaluate('if(window.__POCKET_SUN__.snapshot().paused) document.querySelector(".pause-screen")?.click()');
try {
  stage('install and cold launch');
  adb('install','-r','pocket-sun-android/POCKET-SUN-Android-test.apk');
  adb('logcat','-c');
  logFd=fs.openSync(dir+'/logcat.txt','a');
  logProcess=spawn('adb',['logcat','-v','threadtime'],{stdio:['ignore',logFd,logFd]});
  adb('shell','settings','put','secure','immersive_mode_confirmations','confirmed');
  adb('shell','settings','put','system','accelerometer_rotation','0');
  adb('shell','settings','put','system','user_rotation','0');
  adb('shell','wm','size','1080x2400');
  adb('shell','wm','density','420');
  adb('shell','svc','wifi','disable');
  adb('shell','svc','data','disable');
  adb('shell','am','start','-n',app+'/.MainActivity');
  await connect();await ready();
  check('Offline cold launch loads exact Long Moonrise build',await evaluate('document.body.dataset.buildId === "pocket-sun-3.2.0-long-moonrise"'));
  check('Portrait viewport',await evaluate('innerHeight > innerWidth'));
  check('Canvas fills a usable playfield without horizontal overflow',await evaluate('document.querySelector("canvas").clientWidth > 250 && document.querySelector("canvas").clientHeight > 500 && document.documentElement.scrollWidth <= innerWidth'));
  check('Native Capacitor runtime present',await evaluate('!!window.Capacitor?.isNativePlatform?.()'));
  report.snapshots.initial=await state();
  screenshot('01-portrait-game');
  stage('trusted Android touch');
  await resume();
  await evaluate('window.__touchEvidence=[]; for(const type of ["pointerdown","pointermove","pointerup","pointercancel"]) document.querySelector("canvas").addEventListener(type,event=>window.__touchEvidence.push({type:event.type,trusted:event.isTrusted}));');
  adb('shell','input','tap','540','1350');
  adb('shell','input','swipe','350','1300','700','1100','750');
  await delay(300);
  const inputs=await evaluate('window.__touchEvidence');
  report.snapshots.touchEvents=inputs;
  check('Real Android touch reaches existing canvas controls',inputs.some(e=>e.type==='pointerdown'&&e.trusted)&&inputs.some(e=>e.type==='pointerup'&&e.trusted)&&inputs.some(e=>e.type==='pointermove'&&e.trusted));
  screenshot('02-after-touch');
  stage('original game self-checks');
  const smoke=await evaluate('window.__POCKET_SUN__.runSmoke()');
  report.snapshots.builtinSmoke=smoke;
  check('Original game built-in smoke checks pass',smoke.ok);
  stage('app switching and held-touch cancellation');
  await resume();
  await evaluate('window.__lifecycleEvidence=[]; document.addEventListener("visibilitychange",()=>window.__lifecycleEvidence.push({hidden:document.hidden,paused:window.__POCKET_SUN__.snapshot().paused,...window.PocketSunAndroid.diagnostics()}));');
  adb('shell','input','motionevent','DOWN','540','1350');
  await delay(150);
  check('Android hold is tracked before app switch',await evaluate('window.PocketSunAndroid.diagnostics().pointers > 0'));
  adb('shell','input','keyevent','KEYCODE_HOME');
  await delay(700);
  // Inspect transitions after returning, rather than evaluate a background-frozen WebView.
  adb('shell','am','start','-n',app+'/.MainActivity');
  await delay(800);
  const history=await evaluate('window.__lifecycleEvidence');
  report.snapshots.lifecycleHistory=history;
  check('Leaving app records a hidden, paused state',history.some(event=>event.hidden&&event.paused));
  check('Game remains paused after returning',!!(await state()).paused);
  const background=await evaluate('window.PocketSunAndroid.diagnostics()');
  report.snapshots.afterReturn=background;
  check('App switching releases an actually held touch',background.pointers===0);
  check('Created audio contexts remain suspended until a tap',background.audio.length>0&&background.audio.every(s=>s!=='running'));
  check('Returning preserves original pause overlay',await evaluate('window.__POCKET_SUN__.snapshot().paused && !!document.querySelector(".pause-screen")'));
  screenshot('03-resume-overlay');
  adb('shell','input','tap','540','1200');
  await delay(400);
  check('Existing resume overlay works with Android touch',!(await state()).paused);
  check('A real resume tap wakes audio',await evaluate('window.PocketSunAndroid.diagnostics().audio.some(state=>state === "running")'));
  stage('native Back button');
  adb('shell','input','keyevent','KEYCODE_BACK');
  await delay(400);
  check('Android Back pauses without quitting',!!(await state()).paused);
  adb('shell','input','keyevent','KEYCODE_BACK');
  await delay(400);
  const resumedActivity=adb('shell','dumpsys','activity','activities').split('\n').filter(line=>line.includes('mResumedActivity')||line.includes('topResumedActivity')).join('\n');
  check('Second Back backgrounds app',!resumedActivity.includes(app));
  adb('shell','am','start','-n',app+'/.MainActivity');await delay(400);
  stage('portrait orientation lock');
  adb('shell','settings','put','system','user_rotation','1');await delay(600);
  check('Phone rotation does not force landscape',await evaluate('innerHeight > innerWidth'));
  adb('shell','settings','put','system','user_rotation','0');
  stage('persisted data after process restart');
  await evaluate('localStorage.setItem("pocket-sun-android-storage-test","persisted")');
  adb('shell','am','force-stop',app);
  adb('shell','am','start','-n',app+'/.MainActivity');
  await connect();await ready();
  check('Local storage survives process restart',await evaluate('localStorage.getItem("pocket-sun-android-storage-test") === "persisted"'));
  await evaluate('localStorage.removeItem("pocket-sun-android-storage-test")');
  check('No uncaught JavaScript runtime exceptions',report.exceptions.length===0);
  report.snapshots.final=await state();
  screenshot('04-offline-relaunch');
  stage('complete');
  report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack||error);try{screenshot('failure');}catch{};process.exitCode=1;}
finally {
  if(logProcess)logProcess.kill('SIGTERM');
  if(logFd!==undefined)fs.closeSync(logFd);
  try{fs.writeFileSync(dir+'/host-memory.txt',execFileSync('free',['-h'],{encoding:'utf8'}));}catch{}
  fs.writeFileSync(dir+'/checks.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(socket)socket.close();
}
