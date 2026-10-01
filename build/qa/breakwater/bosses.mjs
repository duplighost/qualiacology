// Actual Playwright input drives all seven boss duels. Debug fixtures skip
// earlier arenas; exact aim/telegraph telemetry and controlled fixed steps
// assist the player. No HP, damage, invulnerability or purchased-skill bypass.
// These are assisted completion samples, not human playtime or visual QA.
// Serve the repo, then run this script. BREAKWATER_QA_URL, BREAKWATER_QA_OUT,
// and BREAKWATER_CHROMIUM are optional; BREAKWATER_QA_BOSS filters comma-separated
// boss IDs and BREAKWATER_QA_CAPTURE=1 enables slower rendered screenshots.
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const directory = process.env.BREAKWATER_QA_OUT || `${tmpdir()}/breakwater-boss-qa`;
const url = process.env.BREAKWATER_QA_URL || 'http://127.0.0.1:4173/breakwater/?dev=1';
await mkdir(directory, { recursive: true });
const report = { suite: 'all-boss-actual-input-controlled-simulation', started: new Date().toISOString(), checks: [], notes: [
  'Actual Playwright mouse/keyboard events drive all attacks, catches, parries, movement, and retry buttons.',
  'Aim can be measured/set through the documented development bridge.',
  'simulatedSeconds measures the controller interval after1.667 seconds of setup; arenaSeconds includes that real-engine spawn/setup interval. Button event counts can exceed successful catches/parries.',
  'After the actual start click, requestAnimationFrame rendering is temporarily held and the real engine fixed step is explicitly advanced. This accelerates software-WebGL testing; it is not a human playtime or frame-rate measurement.',
  'Every boss setup skips earlier campaign encounters with a development fixture. There is no health, damage, armor, invulnerability, skill, or projectile modification. Telemetry assists aim, telegraph reactions, distance, and catch/parry timing; actual Playwright events drive actions. Results are mechanically assisted completion samples, not human playtime or an optimal-route measurement.'
], errors: [], captures: [] };
const browser = await chromium.launch({ executablePath: process.env.BREAKWATER_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 450 } });
page.setDefaultTimeout(25000);
page.on('pageerror', (e) => report.errors.push(e.stack || e.message));
page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/breakwater/')) report.errors.push(`HTTP ${r.status()} ${r.url()}`); });
await page.addInitScript(() => {
  try { if (!localStorage.getItem('qualiacology.breakwater.v1')) localStorage.setItem('qualiacology.breakwater.v1', JSON.stringify({ version: 1, settings: { quality: 'low', volume: 0, music: 0, shake: 0 } })); } catch {}
  const nativeRAF = window.requestAnimationFrame.bind(window);
  window.__combatQA = { manual: false, pending: null, frames: 0, steps: 0 };
  window.requestAnimationFrame = (callback) => nativeRAF((t) => {
    if (window.__combatQA.manual) window.__combatQA.pending = callback;
    else { window.__combatQA.frames++; callback(t); }
  });
});

const state = () => page.evaluate(() => {
  const g = window.__BREAKWATER__, s = g.snapshot(); delete s.frames; delete s.diagnostics;
  return { ...s, simTime: g.combat.time, locked: g.input.locked,
    enemies: g.combat.enemies.filter(e => e.alive).map(e => ({ id: e.id, type: e.type, position: e.position.toArray(), health: e.health, state: e.state, boss: e.boss, phase: e.phase, attackKind: e.attackKind })) };
});
function check(name, detail) { report.checks.push({ name, passed: true, ...detail }); console.log(`PASS ${name}`); }
const steps = async (n) => page.evaluate((n) => { const q = window.__combatQA; for (let i = 0; i < n; i++) { window.__BREAKWATER__.step(1 / 60); q.steps++; } }, n);
async function manual() {
  await page.evaluate(() => { window.__combatQA.manual = true; });
  await page.waitForFunction(() => !!window.__combatQA.pending, null, { timeout: 25000, polling: 50 });
}
async function liveFrames(n = 2) {
  const frames = await page.evaluate(() => {
    const q = window.__combatQA; q.manual = false;
    if (q.pending) { const callback = q.pending; q.pending = null; window.requestAnimationFrame(callback); }
    return q.frames;
  });
  await page.waitForFunction(([before, n]) => window.__combatQA.frames >= before + n, [frames, n], { timeout: 30000, polling: 50 });
}
async function capture(name) {
  if(process.env.BREAKWATER_QA_CAPTURE!=='1')return;
  await liveFrames(2); await manual();
  const path = `${directory}/${name}.png`; await page.screenshot({ path }); report.captures.push(path);
}
const heldKeys = new Set();
async function setKeys(wanted) {
  const next = new Set(wanted);
  for (const key of heldKeys) if (!next.has(key)) { await page.keyboard.up(key); heldKeys.delete(key); }
  for (const key of next) if (!heldKeys.has(key)) { await page.keyboard.down(key); heldKeys.add(key); }
}
async function duel(sector, bossType) {
  await setKeys([]); await page.mouse.up({button:'left'});
  await page.evaluate((sector)=>{
    const g=window.__BREAKWATER__; g.loadSector(sector,true);
    window.__combatQA.bossEvents=[];window.__combatQA.positionSamples=[];g.combat.cleared.add(0);g.combat.cleared.add(1);g.world.setGate(0,true);g.world.setGate(1,true);
    const a=g.world.arenas[2];g.setPosition(a.center.x,a.center.y,a.center.z+8);g.setAim(0,0);g.combat.startArena(2);
  },sector);
  if(!await page.evaluate(()=>window.__BREAKWATER__.input.locked)) { await page.click('#game',{position:{x:300,y:200}}); }
  await steps(100);
  let leftDown=false, thrown=0, recalled=0, parried=0, jumps=0, dashes=0, catches=0, lowest=100, damaged=0, lastHealth=100, side=1;
  const before=await state(), phases=new Set(), attacks=new Set(), openings=new Set();
  for(let tick=0;tick<60*240;tick+=3){
    const t=await page.evaluate(({side,tick})=>{
      const g=window.__BREAKWATER__,p=g.player,c=g.combat,w=g.weapon,e=c.enemies.find(e=>e.alive&&e.boss);
      if(!e)return {done:c.cleared.has(2),mode:g.snapshot().mode,health:p.health};
      e.mesh.updateMatrixWorld(true);const target=e.position.clone();target.y+=e.def.height*.52;
      e.mesh.userData.parts.cores[0]?.getWorldPosition(target);
      const eye=p.eye(),d=target.clone().sub(eye),distance=Math.hypot(d.x,d.z),a=g.world.arenas[2];
      if(tick%300===0)window.__combatQA.positionSamples.push({t:+c.time.toFixed(2),player:p.position.toArray(),boss:e.position.toArray(),bossState:e.state,bossHealth:e.health,los:c._lineOfSight(e),playerVelocity:p.velocity.toArray()});
      let keys=[], jump=false,dash=false,defending=false;
      const limitX=a.width*.5-3,limitZ=a.length*.5-3;
      const atEdge=Math.abs(p.position.x-a.center.x)>limitX||Math.abs(p.position.z-a.center.z)>limitZ;
      const coreAim={yaw:Math.atan2(-d.x,-d.z),pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))};
      // A targeted ground mark and a committed charge require physical movement.
      for(const h of c.hazards){
        if(h.fired||h.time<0)continue;
        if(h.shape==='disc'&&!h.outlineOnly&&Math.hypot(p.position.x-h.position.x,p.position.z-h.position.z)<h.radius+1.1){defending=true;keys.push(side>0?'KeyA':'KeyD');if(h.time<.45)dash=true;}
        if(h.shape==='cone'&&e.attackKind==='furnace-cone'&&distance<12.5){defending=true;keys.push(side>0?'KeyA':'KeyD');if(h.time<.4)dash=true;}
        if(h.shape==='line'&&h.width>1.5){
          const dx=h.target.x-h.position.x,dz=h.target.z-h.position.z,n=dx*dx+dz*dz;
          const u=Math.max(0,Math.min(1,((p.position.x-h.position.x)*dx+(p.position.z-h.position.z)*dz)/n));
          if(Math.hypot(p.position.x-h.position.x-dx*u,p.position.z-h.position.z-dz*u)<h.width*.5+1){defending=true;keys.push(side>0?'KeyA':'KeyD');if(h.time<.5)dash=true;}
        }
      }
      // Jump the actual moving pressure edge or cable; do not synthesize immunity.
      for(const s of c.sweeps){
        const dist=Math.hypot(p.position.x-s.position.x,p.position.z-s.position.z);
        if(s.kind==='ring'&&dist-s.radius>-.3&&dist-s.radius<3.2)jump=true;
        if(s.kind==='cable'){
          const dx=Math.sin(s.angle+.18*s.angularSpeed)*s.length,dz=Math.cos(s.angle+.18*s.angularSpeed)*s.length;
          const u=Math.max(0,Math.min(1,((p.position.x-s.position.x)*dx+(p.position.z-s.position.z)*dz)/(s.length*s.length)));
          if(Math.hypot(p.position.x-s.position.x-dx*u,p.position.z-s.position.z-dz*u)<2.1)jump=true;
        }
      }
      if(e.attackKind==='furnace-cone'&&e.state==='attack'&&distance<12.7){defending=true;keys.push(side>0?'KeyA':'KeyD');dash=p.dashCd<=0;}
      const ideal=e.type==='crucible'?9.3:13;
      if(!defending&&distance>ideal+2)keys.push('KeyW');
      if(!defending&&distance<ideal-4)keys.push('KeyS');
      // When health is low, ordinary strafing is preferable to trading damage.
      if(p.health<40&&!defending)keys.push(side>0?'KeyA':'KeyD');
      const incoming=c.projectiles.filter(q=>!q.friendly&&q.position.distanceTo(eye)<3.75&&q.position.distanceTo(eye)>.7&&q.velocity.dot(eye.clone().sub(q.position))>=-1).sort((a,b)=>a.position.distanceToSquared(eye)-b.position.distanceToSquared(eye))[0];
      let aim=coreAim,parry=false;
      if(incoming&&w.parryCd<=0){const v=incoming.position.clone().sub(eye);aim={yaw:Math.atan2(-v.x,-v.z),pitch:Math.atan2(v.y,Math.hypot(v.x,v.z))};parry=true;}
      g.setAim(aim.yaw,aim.pitch);
      return {done:false,mode:g.snapshot().mode,health:p.health,keys,jump:jump&&p.grounded,dash:dash&&p.dashCd<=0,parry,atEdge,
        state:w.state,charge:w.charge,lanceDistance:w.position.distanceTo(eye),outDistance:w.distance,targetDistance:d.length(),
        phase:e.phase,attack:e.attackKind,exposed:e.exposed,counterMessage:e.lastCounterMessage??-10,
        bossHealth:e.health,bossState:e.state,simTime:c.time};
    },{side,tick});
    if(t.health<lastHealth)damaged+=lastHealth-t.health;lastHealth=t.health;lowest=Math.min(lowest,t.health);
    if(t.mode==='dead') return {bossType,sector,passed:false,reason:'AI killed player',simulatedSeconds:+((await state()).simTime-before.simTime).toFixed(2),arenaSeconds:+(await state()).simTime.toFixed(2),thrown,recalled,parryInputs:parried,jumps,dashes,catchInputs:catches,lowestHealth:lowest,damageReceived:damaged,phases:[...phases],attacks:[...attacks],finalBossHealth:t.bossHealth};
    if(t.done) return {bossType,sector,passed:true,simulatedSeconds:+((await state()).simTime-before.simTime).toFixed(2),arenaSeconds:+(await state()).simTime.toFixed(2),thrown,recalled,parryInputs:parried,jumps,dashes,catchInputs:catches,lowestHealth:lowest,damageReceived:damaged,finalHealth:t.health,phases:[...phases],attacks:[...attacks]};
    if(t.phase)phases.add(t.phase);if(t.attack)attacks.add(t.attack);
    if(t.atEdge)side*=-1;
    await setKeys(t.keys||[]);
    if(t.jump){await page.keyboard.press('Space');jumps++;}
    if(t.dash){await page.keyboard.press('ShiftLeft');dashes++;}
    if(t.parry){await page.keyboard.press('KeyE');parried++;}
    else if(t.state==='returning'&&t.lanceDistance<9&&t.lanceDistance>2){await page.keyboard.press('KeyE');catches++;}
    if(t.state==='held'){
      if(!leftDown){await page.mouse.down({button:'left'});leftDown=true;}
      else if(t.charge>=.98&&!t.parry){await page.mouse.up({button:'left'});leftDown=false;thrown++;}
    }else if(t.state==='lodged'||t.state==='outbound'&&t.outDistance>t.targetDistance+4){await page.mouse.click(400,250,{button:'right'});recalled++;}
    await steps(3);
  }
  return {bossType,sector,passed:false,reason:'240 simulated second controller timeout',state:await state()};
}
try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__BREAKWATER__?.ready,null,{timeout:90000});
  await page.evaluate(()=>window.__BREAKWATER__.settings({quality:'low',volume:0,music:0,shake:0}));
  await page.evaluate(()=>{const c=window.__BREAKWATER__.combat;for(const name of ['_executeBoss','_counterOpen']){const original=c[name];c[name]=function(...args){const e=args[0];window.__combatQA.bossEvents?.push({kind:name,attack:e.attackKind,phase:e.phase,t:+this.time.toFixed(3),message:name==='_counterOpen'?args[2]:undefined});return original.apply(this,args);};}});
  await page.click('[data-action="new"]');await page.waitForFunction(()=>window.__BREAKWATER__.input.locked);await manual();
  report.bosses=[];
  for(const [sector,type] of [[3,'counterweight'],[7,'switchman'],[11,'glasskeeper'],[15,'crucible'],[19,'floodgate'],[23,'warden'],[24,'heart']].filter(pair=>!process.env.BREAKWATER_QA_BOSS||process.env.BREAKWATER_QA_BOSS.split(',').includes(pair[1]))){
    const result=await duel(sector,type);result.bossEvents=await page.evaluate(()=>window.__combatQA.bossEvents);result.positionSamples=await page.evaluate(()=>window.__combatQA.positionSamples);report.bosses.push(result);console.log(JSON.stringify({...result,positionSamples:undefined,bossEvents:undefined}));
    if(result.passed){await capture(`${type}-verified`);}else{await capture(`${type}-failure`);}
    await writeFile(`${directory}/bosses-report.json`,JSON.stringify(report,null,2));
  }
  report.passed=report.bosses.every(b=>b.passed)&&report.errors.length===0;
}catch(error){report.passed=false;report.failure={message:error.message,stack:error.stack};try{report.lastState=await state();await capture('all-boss-failure');}catch{}console.error(error.stack);}
finally{report.finished=new Date().toISOString();await writeFile(`${directory}/bosses-report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({passed:report.passed,report:`${directory}/bosses-report.json`}));if(!report.passed)process.exitCode=1;}
