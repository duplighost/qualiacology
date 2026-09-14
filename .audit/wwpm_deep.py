from pathlib import Path
import os,json,time,traceback,shutil,threading,http.server,functools,math
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ['WWPM_SOURCE']).resolve();OUT=Path('audit-evidence').resolve();OUT.mkdir(exist_ok=True);(OUT/'screenshots').mkdir(exist_ok=True)
R={'revision':'616f75690c54ee37a53f603ecc6d7a0d1ca13b17','started':time.time(),'method':'unchanged full game; native Chromium HTTP; test=1 fixed steps. Position/XP/finish/time preparation is explicitly synthetic. Actual input and internal-method checks are distinguished. SwiftShader is NOT target-hardware performance.','cases':[],'shots':[],'events':[],'exceptions':[]}
def save(): (OUT/'deep-report.json').write_text(json.dumps(R,indent=2,default=str))
def case(name,fn):
 try:
  result=fn();R['cases'].append({'name':name,'result':result});print('CASE '+name+' '+str(result)[:500],flush=True)
 except Exception: R['exceptions'].append({'name':name,'traceback':traceback.format_exc()});print(traceback.format_exc(),flush=True)
 save()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',4173),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as w:
 browser=w.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 context=browser.new_context(viewport={'width':1280,'height':720});p=context.new_page();p.set_default_timeout(180000)
 p.on('pageerror',lambda e:R['events'].append({'kind':'pageerror','text':str(e)}));p.on('console',lambda m:R['events'].append({'kind':'console-'+m.type,'text':m.text}) if m.type in ['error','warning'] else None);p.on('response',lambda r:R['events'].append({'kind':'http','status':r.status,'url':r.url}) if r.status>=400 else None)
 def ev(js,a=None):return p.evaluate(js,a)
 def boot(reload=False):
  t=time.time()
  if reload:p.reload(wait_until='domcontentloaded')
  else:p.goto('http://127.0.0.1:4173/curfew/?test=1&seed=1337',wait_until='domcontentloaded')
  p.wait_for_function('window.__CURFEW?.ready||window.__CURFEW?.bootError',timeout=240000)
  data=ev('()=>({ready:__CURFEW.ready,error:__CURFEW.bootError})');R.setdefault('boots',[]).append({'seconds':time.time()-t,**data});save()
  if not data['ready']:raise RuntimeError(str(data))
  ev('()=>{window.A=__CURFEW;window.C=A.ctx;window.S=id=>C.systems.get(id);A.noLock=true;S("player").invuln=100000;}')
 def step(s=.1):return ev('s=>{A.stepWith(s,{});return A.state()}',s)
 def settle():
  for i in range(3):step(.05);p.wait_for_timeout(120)
  ev('()=>A.settle(2)')
 def key(k,s):
  p.keyboard.down(k);ev('s=>A.step(1/60,Math.ceil(s*60))',s);p.keyboard.up(k);ev('()=>A.step(1/60,1)')
 def view(x,z,tx,tz,ty=None,y=None):
  ev('q=>{A.clearInput();const pl=S("player"),cam=S("camera");A.teleport(q.x,q.z,Math.atan2(q.x-q.tx,q.z-q.tz));if(q.y!==null){pl.pos.y=q.y;pl._sync();}if(q.ty!==null)cam.setAim(cam.yaw,Math.atan2(q.ty-(pl.pos.y+1.7),Math.hypot(q.x-q.tx,q.z-q.tz)));pl.invuln=100000;}',{'x':x,'z':z,'tx':tx,'tz':tz,'ty':ty,'y':y});settle()
 def shot(name,caption,setup='position-assisted native render; invulnerability enabled for inspection'):
  ev('()=>A.settle(2)');f='screenshots/deep-'+name+'.png';p.screenshot(path=str(OUT/f));R['shots'].append({'file':f,'caption':caption,'setup':setup,'state':ev('()=>A.state()'),'stats':ev('()=>A.frameStats()')});save();print('SHOT '+name,flush=True)
 def go_site(id,dist=32):
  q=ev('id=>{const r=S("places").nodes.get(id);return {x:r.def.x,z:r.def.z,y:r.padY,yaw:r.yaw}}',id);a=q['yaw'];view(q['x']+math.sin(a)*dist,q['z']+math.cos(a)*dist,q['x'],q['z'],q['y']+4);return q
 try:
  boot();R['browser']=browser.version
  def keyboard():
   before=ev('()=>A.state()');key('w',1);walk=ev('()=>A.state()');p.keyboard.down('Shift');key('w',1);p.keyboard.up('Shift');sprint=ev('()=>A.state()');key('Control',.3);key('Space',.2);key('r',.2);shot('keyboard','Real DOM keyboard walk, sprint, crouch, jump, reload input');return {'before':before,'walk':walk,'sprint':sprint,'finite':all(math.isfinite(x) for x in sprint['pos']),'moved':math.dist(before['pos'],walk['pos'])>1}
  case('actual keyboard input path',keyboard)
  def car_case():
   q=ev('()=>S("car").state()');x=q['x']+math.cos(q['heading'])*2.3;z=q['z']-math.sin(q['heading'])*2.3;view(x,z,q['x'],q['z'],q['y']+1)
   before=ev('()=>S("car").state()');key('e',.12);step(5);entered=ev('()=>S("car").state()');shot('car-entry','Car entry using E, including cabin camera')
   key('w',5);drive=ev('()=>({car:S("car").state(),player:A.state()})');key('d',.6);key('a',.6);key('h',.1);shot('car-driving','Driver viewpoint after acceleration and steering inputs');key('e',.12);step(1);after=ev('()=>S("car").state()');return {'before':before,'entered':entered,'drive':drive,'afterExit':after,'enteredViaE':entered['inCar'],'exitReleased':not after['inCar']}
  case('car E entry, acceleration, steering, horn, E exit',car_case)
  def economy():
   return ev('()=>{const pr=S("progress"),before=pr.state();pr.addCash(1000,"audit-preparation");const u=pr.upgrades().find(u=>!u.owned),cash0=pr.cash(),bought=pr.buyUpgrade(u.id),cash1=pr.cash(),again=pr.buyUpgrade(u.id),cash2=pr.cash();pr.save.flush();return {setup:"1000 coins injected; real purchase method, not UI",before,upgrade:u,bought,again,cash0,cash1,cash2,idempotent:bought&&!again&&cash2===cash1&&cash0-cash1===u.price};}')
  case('garage purchase cost and duplicate refusal',economy)
  def book():
   q=ev('()=>S("planetarium").state().lectern');view(q[0]+1.1,q[2],q[0],q[2],q[1]+1.1,q[1]+.02);key('e',.5);shot('physical-logbook','Reading Emmett Sayer’s actual lectern using E');data=ev('()=>({flag:S("progress").flag("story:site:morning"),ledger:S("lore-ledger").state()})');ev('()=>{S("hud").pause(true);S("hud").menu.show("ledger");}');shot('ledger-read','WHAT WE WERE TOLD after reading a physical record','actual menu, physical-note input previously exercised')
   inputs=p.locator('input[type=search]')
   if inputs.count():inputs.first.fill('Emmett');shot('ledger-search','Ledger search for Emmett','real DOM text input')
   ev('()=>S("hud").pause(false)');return data
  case('physical record and searchable ledger',book)
  def ring():
   q=ev('()=>{const k=S("boss-encounters").all.find(k=>k.def.attacks.includes("ring"));return {id:k.id,x:k.home.x,y:k.home.y,z:k.home.z}}');view(q['x']+18,q['z'],q['x'],q['z'],q['y'],q['y']+.05)
   data=ev('id=>{const b=S("boss-encounters"),k=b.all.find(k=>k.id===id),pl=S("player");b._clearHazards(k);k.state="striking";k.stateT=1;k.attack="ring";k.duration=2.6;k.hitCooldown=0;pl.invuln=0;pl.hp=100;const h=b._hazard(k,{kind:"ring",x:k.home.x,z:k.home.z,r:40,width:1.5,speed:17,damage:23});const before=pl.hp;b._advanceAttack(k,pl,1/60);h.mesh.updateMatrixWorld(true);const positions=h.mesh.geometry.attributes.position,v=pl.pos.clone();let lo=1e9,hi=0;for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(h.mesh.matrixWorld);const d=Math.hypot(v.x-h.x,v.z-h.z);lo=Math.min(lo,d);hi=Math.max(hi,d);}return {boss:id,playerRadius:Math.hypot(pl.pos.x-h.x,pl.pos.z-h.z),playerY:pl.pos.y,kSiteY:k.site.y,visibleRadial:[lo,hi],damageRadial:[15.5,18.5],hpBefore:before,hpAfter:pl.hp,hit:h.hit,confirmed:pl.hp<before&&Math.hypot(pl.pos.x-h.x,pl.pos.z-h.z)>hi};}',q['id']);shot('ring-outside-hit','Damage just outside the drawn expanding ring','isolated attack phase and 18 m player position staged; actual full-game Player.hurt path');ev('id=>{const b=S("boss-encounters"),k=b.all.find(k=>k.id===id);b._reset(k);S("player").invuln=100000;S("player").heal(1000)}',q['id']);return data
  case('full game ring render versus hurt boundary',ring)
  def lore_creatures():
   records=[]
   for species in ['candle','drowned']:
    row=ev('s=>S("lore-dead").rows.find(r=>r.species===s)',species);view(row['x']+45,row['z'],row['x'],row['z']);step(3.3);q=ev('s=>{const r=S("lore-dead").rows.find(r=>r.species===s),e=r.e;return {id:r.id,alive:!!e?.alive,position:e?.pos.toArray(),generation:r.generation};}',species)
    if q['alive']:
     v=q['position'];view(v[0]+8,v[2]+4,v[0],v[2],v[1]+1.3);shot(species,'New '+species+' encounter at its authored location')
    records.append(q)
   return records
  case('authored Candle and Drowned encounter spawning',lore_creatures)
  def kept():
   go_site('holdfast',60);shot('holdfast-before-kept','Holdfast before the Kept blackout');ev('()=>S("boss-sites")._transfer(true)');settle();q=ev('()=>{const k=S("boss-encounters").all.find(k=>k.id==="underkeep");return {x:k.home.x,y:k.home.y,z:k.home.z}}');view(q['x']+10,q['z']+28,q['x'],q['z'],q['y']+4,q['y']+.02);step(3.5);shot('crypt-kept-alive','The Kept and crypt before defeat','real crypt transfer, assisted encounter approach')
   ev('()=>{const b=S("boss-encounters"),k=b.all.find(k=>k.id==="underkeep");b.damage(k,100000,{zone:"heart"});}');step(.1);flash=ev('()=>S("late-bell").state()');shot('crypt-two-second-sun','The two-second crypt sunlight after the Kept dies','boss damage injected; immediate actual defeat consequences, not a natural victory');step(2.2);shot('crypt-after-sun','Crypt after the brief sunlight');ev('()=>S("boss-sites")._transfer(false)');go_site('holdfast',60);shot('holdfast-blackout','Holdfast during the Kept blackout');return {'flash':flash,'after':ev('()=>S("late-bell").state()')}
  case('Kept defeat, crypt sunlight, town blackout',kept)
  def bell():
   result=ev('()=>{const pr=S("progress"),b=S("boss-encounters");pr.save.data.finishes=b.all.map(k=>k.def.skin.id);pr.save.mark();pr.save.flush();S("clock").setPhase("black",.2);const r=S("places").nodes.get("bell-tower"),c=r.def.claim,cy=Math.cos(r.yaw),sy=Math.sin(r.yaw);return {x:r.def.x+c.dx*cy+c.dz*sy,y:r.padY+c.dy,z:r.def.z-c.dx*sy+c.dz*cy,r:c.r}}');R['bell_target']=result
   candidates=[];selected=None
   for i in range(12):
    a=i*math.pi/6;x=result['x']+math.sin(a)*24;z=result['z']+math.cos(a)*24;view(x,z,result['x'],result['z'],result['y']);q=ev('t=>{const o=C.camera.position,d=o.clone().set(t.x,t.y,t.z).sub(o).normalize();return S("combat").probe(o.x,o.y,o.z,d.x,d.y,d.z,100)}',result);candidates.append(q)
    if q and math.dist([q['x'],q['y'],q['z']],[result['x'],result['y'],result['z']])<result['r']:
     selected=[x,z];break
   if not selected:return {'success':False,'reason':'no unobstructed firing position among tested approaches','candidates':candidates}
   ev('q=>S("car").placeAt(q[0]+3,q[1]+3,0)',selected);settle();shot('day-bell-aim','Aiming at the real day bell with all finishes and the car nearby','all eleven finishes injected, Black Hour staged; native hit path under test')
   before=ev('()=>({late:S("late-bell").state(),combat:S("combat").dump(),car:S("car").state()})');attempts=[]
   for i in range(5):
    p.mouse.down();ev('()=>A.step(1/60,3)');p.mouse.up();step(.7);state=ev('()=>({late:S("late-bell").state(),combat:S("combat").dump()})');attempts.append(state)
    if state['late']['lastNight']:break
   shot('day-bell-rung','Day bell after actual mouse fire');return {'success':bool(attempts[-1]['late']['lastNight']),'before':before,'attempts':attempts,'candidates':candidates,'setup':'finishes and phase staged; actual mouse firing, weapon, combat, place bell and finale event chain'}
  case('real mouse shot to begin last honest night',bell)
  def waiting():
   if not ev('()=>!!S("late-bell").last'):return {'skipped':'bell did not begin last night; not fabricating finale success'}
   m=ev('()=>S("places").minorList().find(m=>m.kind==="the-waiting")');R['waitingLocation']=m
   if not m:return {'skipped':'no authored waiting minor found'}
   view(m['x']+16,m['z']+26,m['x'],m['z']);step(1);shot('waiting-begins','The Waiting begin their eastward departure');start=ev('()=>{const r=S("setpieces")._records.find(r=>r.kind==="the-waiting");return r?{leaving:r.leaving,visible:r.bodyTracker.mesh.visible}:null}')
   ev('()=>{S("setpieces")._loreStep(150);S("progress").save.flush();}');gone=ev('()=>{const r=S("setpieces")._records.find(r=>r.kind==="the-waiting");return {leaving:r.leaving,visible:r.bodyTracker.mesh.visible,saved:S("progress").flag("story:waiting-returning")}}');shot('waiting-departed','The Waiting after leaving','150 s local animation acceleration through actual system method')
   boot(True);view(m['x']+16,m['z']+26,m['x'],m['z']);step(.1);again=ev('()=>{const r=S("setpieces")._records.find(r=>r.kind==="the-waiting");return r?{leaving:r.leaving,visible:r.bodyTracker.mesh.visible,saved:S("progress").flag("story:waiting-returning")}:null}');shot('waiting-returned-on-reload','The same Waiting location after a real page reload');return {'start':start,'departed':gone,'reloaded':again,'confirmedRestart':bool(gone and not gone['visible'] and again and again['visible'] and again['saved'])}
  case('Waiting departure persistence across real reload',waiting)
  def dawn():
   if not ev('()=>!!S("late-bell").last'):return {'skipped':'no legitimately triggered final bell'}
   q=go_site('morning',34);view(q['x']-35,q['z']+30,q['x']+200,q['z']+30, q['y']+10);rows=[]
   for t in [749,751,795,840]:
    ev('t=>{S("clock").beginLastNight(t);A.step(1/60,1)}',t);shot('dawn-'+str(t),'True morning sky at final-night second '+str(t),'clock accelerated after a real bell hit; full normal visual systems');rows.append(ev('()=>({late:S("late-bell").state(),clock:S("clock").state?.(),lamps:S("dusk-to-dawn").state?.(),planetarium:S("planetarium").state()})'))
   seat=ev('()=>S("planetarium").state().seats[0]');view(seat[0],seat[2],seat[0]+20,seat[2],seat[1]+1.7,seat[1]+.02);key('e',.6);seated=ev('()=>S("planetarium").state()');shot('morning-seated','Actual E interaction with a Morning bench','position placed on an authored seat, actual E hold; sunrise reached by clock acceleration');step(3.2);completion=ev('()=>({late:S("late-bell").state(),date:document.getElementById("morning-date")?.textContent,player:A.state()})');shot('november-2','Final date card after remaining seated facing east')
   key('w',.2);afterInput=ev('()=>({date:!!document.getElementById("morning-date"),planetarium:S("planetarium").state(),player:A.state()})');shot('morning-control-return','Morning immediately after dismissing the date card by walking');ev('()=>S("progress").save.flush()');boot(True);restored=ev('()=>({late:S("late-bell").state(),save:S("progress").save.data,planetarium:S("planetarium").state()})');shot('morning-completion-reload','Reload after completing the ending');return {'timeline':rows,'seatedViaE':seated['seated'],'completion':completion,'afterInput':afterInput,'reload':restored,'completedAndPersisted':bool(completion['late']['lastNight'] and completion['late']['lastNight']['complete'] and restored['late']['lastNight']['complete'])}
  case('sunrise, actual bench E, date card, control and completion reload',dawn)
  R['final']=ev('()=>({state:A.state(),errors:A.errors(),stats:A.frameStats()})')
 except Exception:R['exceptions'].append({'name':'outer','traceback':traceback.format_exc()});print(traceback.format_exc(),flush=True)
 finally:R['finished']=time.time();save();browser.close();server.shutdown()
