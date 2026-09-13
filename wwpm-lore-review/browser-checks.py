# Fixture teleports and boss awards are not a full campaign playthrough.
# E and gunfire use the same input path as a player.
import json
results=[]
def record(name, code):
    try:
        data=page.evaluate(code)
        ok=not isinstance(data,dict) or data.get('ok',True)
        results.append({'name':name,'ok':ok,'result':data})
    except Exception as exc:
        results.append({'name':name,'ok':False,'error':str(exc)})
    out.joinpath('interaction-checks.json').write_text(json.dumps(results,indent=2))
    return results[-1]
page.evaluate('''() => {
 window.Q={A:window.__CURFEW};const q=Q;q.c=q.A.ctx;q.s=id=>q.c.systems.get(id);q.l=q.s('lore');
 q.move=async(x,z,y)=>{q.A.clearInput();q.s('hud').pause(false);q.c.paused=false;q.s('planetarium')._stand(q.s('player'));q.A.teleport(x,z,0);q.A.step(1/60,45);await q.A.settle(2);const p=q.s('player');p.dead=false;p.hp=p.hpMax;p.invuln=100000;p.carried=false;q.c.shared.inCar=false;if(Number.isFinite(y)){p.pos.set(x,y,z);p.vel.set(0,0,0);p._sync();}q.s('clock').setRate(0);};
 q.aim=(x,y,z)=>{const p=q.s('player'),dx=x-p.pos.x,dz=z-p.pos.z,dy=y-p.eyeY;q.s('camera').setAim(Math.atan2(-dx,-dz),Math.atan2(dy,Math.hypot(dx,dz)));p.yaw=q.s('camera').yaw;p._sync();};
 q.read=async(id)=>{const t=q.s('world-stories').targets.find(t=>t.id===id);if(!t)return {ok:false,id,reason:'missing target'};await q.move(t.x,t.z);const col=q.s('collision'),p=q.s('player'),spots=[];
 for(const r of [.8,1.25,1.8,2.5,3.05])for(let i=0;i<24;i++){const a=i*Math.PI/12,x=t.x+Math.sin(a)*r,z=t.z+Math.cos(a)*r;if(!col._bestSupport(x,z,t.y+.05,.3,0,3.4))continue;const y=col._supH+.025;if(!col.fits(x,z,y,.3,1.75))continue;const eye=y+1.62,dx=t.x-x,dz=t.z-z,dy=t.y-eye,d=Math.hypot(dx,dy,dz),h=col.raycast({x,y:eye,z},{x:dx/d,y:dy/d,z:dz/d},d,1);if(Math.abs(dy)<2.05&&(!h||h.t>=d-.68))spots.push({x,y,z});}
 const attempts=[];for(const a of spots.slice(0,18)){q.A.clearInput();p.pos.set(a.x,a.y,a.z);p.vel.set(0,0,0);p._sync();q.aim(t.x,t.y,t.z);q.A.stepWith(.08,{use:false});q.A.stepWith(.36,{use:true});q.A.stepWith(.05,{use:false});const active=q.s('world-stories').target?.id;attempts.push({a,active});if(q.s('progress').flag('story:'+id))return {ok:true,id,at:a,ledger:q.l.unlocked.has(id.slice(5)),spots:spots.length};}
 return {ok:false,id,target:{x:t.x,y:t.y,z:t.z},spots:spots.length,attempts};};
}''')
record('manifest and fresh ledger', '''()=>({ok:Q.c.systems.has('lore')&&Q.l.readables.notes.length===21,entries:Q.l.entries().map(e=>e.id),pages:Q.l.readables.notes.length,final:Q.l.s.final})''')
ids=page.evaluate('Q.l.readables.notes.map(n=>n.target.id)')
for ident in ids:
    record('E reads '+ident, 'async()=>await Q.read('+json.dumps(ident)+')')
record('ledger UI opens', '''()=>{Q.s('hud').pause(true);return {ok:!document.querySelector('#curfew-pause').hidden}}''')
page.locator('#curfew-pause .menu-nav button[data-page="ledger"]').click()
page.get_by_role('searchbox',name='Search discovered ledger entries').fill('Springfield')
record('search uses discovered Relay log, not shortcuts', '''()=>({ok:Q.s('hud').menu.page==='ledger'&&document.querySelectorAll('.ledger-index button').length>0,results:[...document.querySelectorAll('.ledger-index button')].map(b=>b.textContent)})''')
if page.locator('.ledger-index button').count():page.locator('.ledger-index button').first.click()
page.screenshot(path=str(out/'ledger-relay.png'))
page.get_by_role('searchbox',name='Search discovered ledger entries').fill('')
record('reading never reveals the true-account essay or ending instructions', '''()=>({ok:!Q.l.entries().some(e=>e.id.includes('ending')||e.id.includes('true-account')||e.title==='The Late Bell'),count:Q.l.entries().length})''')
record('officers render and banking removes Auditor', '''async()=>{await Q.move(-700,200);const pr=Q.s('progress');pr.save.data.unbanked=240;Q.l.officers.threshold=0;Q.l.officers._auditor();Q.l.officers.present();const visible=!!Q.l.officers.auditor,threshold=Q.l.officers.threshold;await Q.A.settle(2);Q.c.bus.emit('xp:banked',{});pr.save.data.unbanked=0;return {ok:visible&&!Q.l.officers.auditor&&threshold===2,visible,threshold,combat:Q.s('enemies').all.some(e=>['auditor','pale','pacer'].includes(e.species))};}''')
record('regional Warden effect expires', '''()=>{const d=Q.s('dusk-to-dawn'),p=d.poles[0],clock=Q.s('clock');clock.setPhase('black',.2);Q.l.wardenKilled(p.hx,p.hz);const on=Q.l.poleProtected(p),outside=Q.l.poleProtected({hx:p.hx+1000,hz:p.hz});clock.advance(clock.cycleLength);return {ok:on&&!outside&&!Q.l.poleProtected(p),on,outside,remaining:Q.l.s.wardenShields};}''')
record('boss rewards remain one-time and activate permanent consequences', '''()=>{const ids=['blacktide','rootmother','bellwether','choir','furnace','lantern','mire','moth','antler','underkeep','fieldmaw'],pr=Q.s('progress'),results=[];for(const id of ids)results.push([id,pr.completeBoss({id,finishId:id,xp:0,cash:0}),pr.completeBoss({id,finishId:id,xp:0,cash:0})]);Q.A.step(1/60,1);return {ok:results.every(r=>r[1]&&!r[2])&&Q.c.shared.northSnowStopped&&Q.c.shared.crossingSilenced&&Q.c.shared.holdfastBlackout,results,lore:Q.l.state()};}''')
record('Kept flash renders and blackout lasts one cycle', '''async()=>{Q.l.effects.present();await Q.A.settle(2);const before=Q.l.s.blackout,flash=Q.l.effects.cryptFlash;Q.s('clock').advance(840);Q.A.step(1/60,1);return {ok:before>839&&flash>0&&Q.l.s.blackout===0&&Q.l.s.handlit,before,flash,after:Q.l.s.blackout,handlit:Q.l.s.handlit};}''')
record('car carries eleven pieces and selected finish', '''()=>{const ok=Q.l.effects.setCarFinish('underkeep');Q.l.effects.refreshCar();const s=Q.l.effects.state();return {ok:ok&&s.pieces===11&&s.carFinish==='underkeep',state:s};}''')
record('Cal audio decodes', '''async()=>{const bytes=await(await fetch('/curfew/assets/radio/cal-home.mp3')).arrayBuffer(),a=new AudioContext(),b=await a.decodeAudioData(bytes);await a.close();return {ok:b.duration>2,seconds:b.duration,channels:b.numberOfChannels};}''')
record('Waiting scene retains exact chairs and passive people', '''async()=>{await Q.move(1483,92);const rec=(Q.s('setpieces')._records||[]).find(r=>r.kind==='waiting');return {ok:!!rec&&rec.loreCrowd?.length===40,found:!!rec,count:rec?.loreCrowd?.length,keys:rec?Object.keys(rec):[]};}''')
record('Watch Tree hour faces', '''async()=>{await Q.move(240,-2160);const r=(Q.s('setpieces')._records||[]).find(r=>r.kind==='watchtree'||r.loreWatches);const ws=r?.loreWatches;return {ok:ws?.length>=100&&ws.every(w=>w.minute>=0&&w.minute<60),count:ws?.length,sample:ws?.slice(0,3)};}''')
record('Jam 4 sun drawing', '''async()=>{await Q.move(2136.4,-364.9);const r=(Q.s('setpieces')._records||[]).find(r=>r.loreDrawing);return {ok:!!r,at:r?.loreDrawing};}''')
record('real bullet rings already-claimed day bell and starts final night', '''async()=>{const r=Q.s('places').nodes.get('bell-tower'),b={x:r.def.x,y:r.padY+r.def.claim.dy,z:r.def.z};await Q.move(b.x,b.z);
 const pr=Q.s('progress'),cast=Q.s('places')._casts.get('major:bell-tower');if(cast)cast.cast.forEach((c,i)=>{if(!c.neutral)pr.flag('cast-killed:'+cast.key+':'+i,true);});pr.flag('secured:bell-tower',true);Q.s('places').claimed.add('bell-tower');Q.s('clock').setPhase('dusk',.1);const wrong=Q.l.tryLateBell();Q.s('clock').setPhase('black',.35);const col=Q.s('collision'),p=Q.s('player'),car=Q.s('car'),tries=[];let chosen=null;
 for(const radius of [24,32,42,58])for(let i=0;i<24&&!chosen;i++){const a=i*Math.PI/12,x=b.x+Math.sin(a)*radius,z=b.z+Math.cos(a)*radius,y=col.groundHeight(x,z)+.05;if(!col.fits(x,z,y,.34,1.8))continue;const eye=y+1.62,dx=b.x-x,dy=b.y-eye,dz=b.z-z,len=Math.hypot(dx,dy,dz),hit=col.raycast({x,y:eye,z},{x:dx/len,y:dy/len,z:dz/len},len+3,col.MASK.SIGHT|col.MASK.GROUND);if(!hit||Math.hypot(hit.x-b.x,hit.y-b.y,hit.z-b.z)>2.55)continue;chosen={x,y,z};}
 if(!chosen)return {ok:false,reason:'no real firing position',wrong,mask:col.MASK};car.x=chosen.x+2;car.z=chosen.z+2;car.y=col.groundHeight(car.x,car.z);car.exists=true;car._sync();p.pos.set(chosen.x,chosen.y,chosen.z);p.vel.set(0,0,0);p._sync();const shots=Q.s('combat').shots;
 for(let i=0;i<4&&Q.l.s.final.stage==='waiting';i++){Q.A.clearInput();Q.aim(b.x,b.y,b.z);const w=Q.s('weapons');w.ammo=w.def.mag;w.chambered=true;Q.A.stepWith(.1,{ads:true,fire:false});Q.A.stepWith(.12,{ads:true,fire:true});Q.A.stepWith(1.3,{fire:false,ads:false});tries.push(Q.l.lastBellCheck);}
 return {ok:!wrong&&Q.s('combat').shots>shots&&Q.l.s.final.stage==='drive',chosen,shots:Q.s('combat').shots-shots,checks:tries,final:Q.l.s.final,territory:Q.s('territory').status('bell-tower')};}''')
record('accelerated final night reaches real dawn without wrapping', '''async()=>{if(Q.l.s.final.stage==='waiting')return {ok:false,reason:'real bell test did not start ending'};Q.s('clock').setRate(120);const phases=[];const off=Q.c.bus.on('phase:changed',p=>phases.push(p.phase));Q.A.step(1/60,383);off();Q.s('clock').setRate(0);Q.l.persist(true);await Q.A.settle(3);const c=Q.s('clock');return {ok:c.phase==='dawn'&&Q.c.shared.trueDawn>0&&Q.l.effects.lastSweep>0,phases,cycle:c.cycleT,phase:c.phase,dawn:Q.c.shared.trueDawn,photocells:Q.l.effects.lastSweep,restSkipped:c.advance(100)};}''')
page.screenshot(path=str(out/'final-dawn-road.png'))
record('save/reload preserves final night and restored photocell sweep', '''async()=>{if(Q.l.s.final.stage==='waiting')return {ok:false,reason:'no final night to restore'};Q.l.persist(true);return {ok:true,final:Q.l.s.final,keys:Object.keys(localStorage)};}''')
if page.evaluate("Q.l.s.final.stage!=='waiting'"):
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function('window.__CURFEW?.ctx?.ready || window.__CURFEW?.ctx?.bootError')
    page.evaluate('''()=>{window.Q={A:__CURFEW};Q.c=Q.A.ctx;Q.s=id=>Q.c.systems.get(id);Q.l=Q.s('lore');}''')
    record('restored final stage and rendering', '''async()=>{Q.s('clock').setRate(0);Q.A.step(1/60,2);await Q.A.settle(2);return {ok:Q.l.s.final.stage==='dawn'&&Q.l.effects.lastSweep>0,final:Q.l.s.final,effects:Q.l.effects.state()};}''')
    record('actual E seat completes November 2 with projector off', '''async()=>{const v=Q.s('planetarium'),s=v._seats[0],p=Q.s('player');Q.A.teleport(s.x,s.z,0);Q.A.step(1/60,40);await Q.A.settle(3);p.dead=false;p.hp=p.hpMax;p.invuln=100000;p.pos.set(s.x,s.y+.03,s.z);p.vel.set(0,0,0);p._sync();Q.s('clock').setRate(120);Q.A.clearInput();Q.A.stepWith(.08,{use:false});Q.A.stepWith(.7,{use:true});Q.A.stepWith(.9,{use:false});await Q.A.settle(3);const state=Q.l.state();return {ok:v.seated&&v.phase==='off'&&state.final.stage==='complete'&&!!document.getElementById('meridian-november-two'),planetarium:v.state(),lore:state};}''')
    page.wait_for_timeout(3300)
    page.screenshot(path=str(out/'november-two.png'))
record('no simulation exception or browser error', '''()=>({ok:Q.A.errors().length===0,errors:Q.A.errors()})''')
out.joinpath('final-state.json').write_text(json.dumps(page.evaluate('Q.l.state()'),indent=2))
assert all(r['ok'] for r in results), json.dumps([{'name':r['name'],'error':r.get('error'),'result':r.get('result')} for r in results if not r['ok']],indent=2)
