# Focused follow-up to run 4. Actual E input; teleport/immortality are setup.
import json
page.set_default_timeout(45000)
page.set_viewport_size({'width':1100,'height':700})
results=[]
def record(name,code):
    try:
        data=page.evaluate(code)
        results.append({'name':name,'ok':data.get('ok',True),'result':data})
    except Exception as exc: results.append({'name':name,'ok':False,'error':str(exc)})
    out.joinpath('followup-checks.json').write_text(json.dumps(results,indent=2))
    return results[-1]
page.evaluate('''()=>{window.Q={A:__CURFEW};Q.c=Q.A.ctx;Q.s=id=>Q.c.systems.get(id);Q.l=Q.s('lore');
 Q.move=async(x,z)=>{Q.A.clearInput();Q.s('hud').pause(false);Q.c.paused=false;Q.s('planetarium')._stand(Q.s('player'));Q.A.teleport(x,z,0);Q.A.step(1/60,40);await Q.A.settle(2);const p=Q.s('player');p.dead=false;p.hp=p.hpMax;p.invuln=100000;p.carried=false;Q.c.shared.inCar=false;Q.s('clock').setRate(0);};
 Q.aim=(x,y,z)=>{const p=Q.s('player'),dx=x-p.pos.x,dz=z-p.pos.z,dy=y-p.eyeY;Q.s('camera').setAim(Math.atan2(-dx,-dz),Math.atan2(dy,Math.hypot(dx,dz)));p.yaw=Q.s('camera').yaw;p._sync();};
 Q.read=async(id)=>{const t=Q.s('world-stories').targets.find(t=>t.id===id);await Q.move(t.x,t.z);const c=Q.s('collision'),p=Q.s('player'),spots=[],stats={support:0,fit:0,sight:0};
 for(const r of [.8,1.25,1.8,2.5,3.05])for(let i=0;i<24;i++){const a=i*Math.PI/12,x=t.x+Math.sin(a)*r,z=t.z+Math.cos(a)*r;if(!c._bestSupport(x,z,t.y+.05,.3,0,3.4))continue;stats.support++;const y=c._supH+.025;if(!c.fits(x,z,y,.3,1.75))continue;stats.fit++;const dy=t.y-y-1.62,dx=t.x-x,dz=t.z-z,d=Math.hypot(dx,dy,dz),h=c.raycast({x,y:y+1.62,z},{x:dx/d,y:dy/d,z:dz/d},d,1);if(Math.abs(dy)<2.05&&(!h||h.t>=d-.68)){spots.push({x,y,z});stats.sight++;}}
 const attempts=[];for(const a of spots.slice(0,24)){Q.A.clearInput();p.pos.set(a.x,a.y,a.z);p.vel.set(0,0,0);p._sync();Q.aim(t.x,t.y,t.z);Q.A.stepWith(.08,{use:false});Q.A.stepWith(.36,{use:true});Q.A.stepWith(.05,{use:false});attempts.push({at:a,after:{x:p.pos.x,y:p.pos.y,z:p.pos.z},active:Q.s('world-stories').target?.id});if(Q.s('progress').flag('story:'+id))return {ok:true,id,at:a,stats,ledger:Q.l.unlocked.has(id.slice(5))};}
 return {ok:false,id,stats,target:{x:t.x,y:t.y,z:t.z},attempts};};}''')
for ident in ['avery-house','holdfast','cathedral','choir-vault','red-quarry']:
    r=record('E reads corrected '+ident, 'async()=>await Q.read('+json.dumps('lore-note:'+ident)+')')
    if r['ok']:
        page.evaluate('async()=>await Q.A.settle(1)')
        page.screenshot(path=str(out/('note-'+ident+'.png')))
record('Waiting exists under its actual the-waiting kind', '''async()=>{await Q.move(1483,92);const r=Q.s('setpieces')._records.find(r=>r.kind==='the-waiting');const scene=r?.loreScene;return {ok:r?.loreCrowd?.length===40&&r.loreCrowd.filter(p=>p.standing).length===1&&scene?.people?.length===40,kind:r?.kind,count:r?.loreCrowd?.length,seated:r?.loreCrowd?.filter(p=>!p.standing).length,standing:r?.loreCrowd?.filter(p=>p.standing).length,rendered:scene?.people?.length};}''')
record('Waiting departs without giving kills or replacing chairs', '''async()=>{const r=Q.s('setpieces')._records.find(r=>r.kind==='the-waiting');if(!r)return {ok:false};Q.c.shared.finalNight=true;const before=r.loreScene.people[0].home.x;for(let i=0;i<480;i++)r.loreScene.step(1/60);r.loreScene.present();const moved=r.loreScene.people[0].rig.group.position.x;Q.c.shared.finalNight=false;return {ok:moved>before&&r.loreCrowd.length===40,before,moved};}''')
record('final dawn sky is rendered at Morning with projector off', '''async()=>{await Q.move(2980,580);const clock=Q.s('clock');Q.l.s.final={stage:'dawn',elapsed:828,bellsPlayed:true};clock.beginLastNight(828);clock.setRate(0);Q.l._publish();const v=Q.s('planetarium'),seat=v._seats[0],p=Q.s('player');p.pos.set(seat.x,seat.y+.05,seat.z);p.vel.set(0,0,0);p._sync();Q.aim(p.pos.x+100,p.eyeY+3,p.pos.z);Q.A.step(1/60,2);await Q.A.settle(3);return {ok:Q.c.shared.trueDawn>.8&&v.phase==='off'&&Q.l.effects.lastSweep>0,day:Q.c.shared.trueDawn,sweep:Q.l.effects.lastSweep,projector:v.phase};}''')
page.screenshot(path=str(out/'morning-true-dawn.png'))
record('no simulation errors', '''()=>({ok:Q.A.errors().length===0,errors:Q.A.errors()})''')
assert all(r['ok'] for r in results),json.dumps([r for r in results if not r['ok']],indent=2)
