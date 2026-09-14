"""Read-only WWPM QA, pinned source in a separate directory; never deploys."""
from pathlib import Path
import os,sys,json,time,traceback,shutil,threading,http.server,functools,math
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ['WWPM_SOURCE']).resolve(); OUT=Path('audit-evidence').resolve(); OUT.mkdir(exist_ok=True)
(OUT/'screenshots').mkdir(exist_ok=True)
report={'source_revision':'616f75690c54ee37a53f603ecc6d7a0d1ca13b17','mode':'native Chromium, local HTTP, original source and assets, built-in deterministic test API','started':time.time(),'screenshots':[],'checks':[],'events':[],'exceptions':[]}
def save(): (OUT/'runtime-report.json').write_text(json.dumps(report,indent=2,default=str))
def check(name,passed,detail=None): report['checks'].append({'name':name,'passed':bool(passed),'detail':detail}); print(('PASS ' if passed else 'FAIL ')+name,flush=True);save()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',4173),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 exe=shutil.which('google-chrome') or shutil.which('chromium')
 browser=pw.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 context=browser.new_context(viewport={'width':1280,'height':720},device_scale_factor=1);page=context.new_page();page.set_default_timeout(180000)
 report['browser']=browser.version;report['gpu']='SwiftShader software renderer; timings are not target-hardware FPS'
 page.on('pageerror',lambda e:report['events'].append({'kind':'pageerror','text':str(e)}))
 page.on('console',lambda m:report['events'].append({'kind':'console-'+m.type,'text':m.text}) if m.type in ['error','warning'] else None)
 page.on('requestfailed',lambda r:report['events'].append({'kind':'requestfailed','url':r.url,'failure':r.failure}))
 page.on('response',lambda r:report['events'].append({'kind':'http-error','url':r.url,'status':r.status}) if r.status>=400 else None)
 cdp=context.new_cdp_session(page);cdp.send('Profiler.enable');cdp.send('Profiler.startPreciseCoverage',{'callCount':True,'detailed':True})
 def ev(js,arg=None): return page.evaluate(js,arg)
 def step(seconds=.25): return ev('(s)=>{__CURFEW.stepWith(s,{});return __CURFEW.state()}',seconds)
 def settle(n=4):
  for _ in range(n):
   step(.05);page.wait_for_timeout(80)
  ev('()=>__CURFEW.settle(2)')
 def shot(name,caption,setup='teleport-assisted visual inspection; ordinary game rendering'):
  ev('()=>__CURFEW.settle(2)');path='screenshots/'+name+'.png';page.screenshot(path=str(OUT/path))
  row={'file':path,'caption':caption,'setup':setup,'state':ev('()=>__CURFEW.state()'),'stats':ev('()=>__CURFEW.frameStats()')};report['screenshots'].append(row);save();print('SHOT '+name,flush=True)
 def view(x,z,tx,tz,ty=None,y=None):
  ev('''q=>{const a=__CURFEW,c=a.ctx,p=c.systems.get('player'),cam=c.systems.get('camera');a.clearInput();a.teleport(q.x,q.z,Math.atan2(q.x-q.tx,q.z-q.tz));if(q.y!==null){p.pos.y=q.y;p._sync();}if(q.ty!==null){const d=Math.hypot(q.x-q.tx,q.z-q.tz);cam.setAim(cam.yaw,Math.atan2(q.ty-(p.pos.y+1.7),d));}p.invuln=100000;a.step(1/60,1);}''',{'x':x,'z':z,'tx':tx,'tz':tz,'ty':ty,'y':y});settle()
 try:
  t=time.time();page.goto('http://127.0.0.1:4173/curfew/?test=1&seed=1337',wait_until='domcontentloaded');page.wait_for_function('window.__CURFEW?.ready||window.__CURFEW?.bootError',timeout=240000)
  report['boot_seconds']=time.time()-t;report['boot']=ev('()=>({ready:__CURFEW.ready,error:__CURFEW.bootError,stage:__CURFEW.bootStage})');check('native HTTP boot',report['boot']['ready'],report['boot'])
  if not report['boot']['ready']: raise RuntimeError(report['boot']['error'])
  report['inventory']=ev('''()=>{const a=__CURFEW,c=a.ctx,systems={};for(const [id,s]of c.systems){let state;try{state=s.state?.()}catch(e){state={error:String(e)}}systems[id]={methods:Object.getOwnPropertyNames(Object.getPrototypeOf(s)).filter(k=>typeof s[k]==='function'),keys:Object.keys(s).filter(k=>typeof s[k]!=='function'),state};}return {systems,api:Object.keys(a),majors:c.systems.get('places').list(),minors:c.systems.get('places').minorList(),bosses:a.bosses.list(),kneelers:c.systems.get('kneeler').list(),save:c.systems.get('progress').save.data};}''')
  (OUT/'inventory.json').write_text(json.dumps(report.pop('inventory'),indent=2,default=str))
  ev('()=>{__CURFEW.noLock=true;__CURFEW.clearInput();}');settle();shot('001-opening','Fresh seed 1337 at the opening','fresh game, no movement or progression injection')
  route=ev('''()=>{const a=__CURFEW,out=[];for(const [seconds,controls] of [[1,{forward:true}],[1,{forward:true,sprint:true}],[.35,{forward:true,sprint:false,crouch:true}],[.3,{forward:true,crouch:false,jump:true}],[.3,{forward:false,jump:false,fire:true}],[.3,{fire:false,reload:true}],[.2,{reload:false}]]){a.stepWith(seconds,controls);out.push(a.state());}a.clearInput();return out;}''');report['opening_input_route']=route
  check('opening movement input changes position',math.dist(route[0]['pos'],route[1]['pos'])>1,route[:2]);check('opening route finite',all(all(math.isfinite(v) for v in s['pos']+[s['hp'],s['yaw'],s['pitch']]) for s in route));shot('002-opening-input','Opening after forward, sprint, crouch, jump, fire and reload inputs','real input-path synthetic controls, not manual damage calls')
  ev('()=>{__CURFEW.ctx.systems.get("clock").setPhase("dusk",.35);__CURFEW.ctx.systems.get("player").invuln=100000;}')
  majors=ev('()=>__CURFEW.ctx.systems.get("places").list()');report['major_visits']=[]
  for i,s in enumerate(majors):
   try:
    rec=ev('id=>{const r=__CURFEW.ctx.systems.get("places").nodes.get(id);return {yaw:r.def.yaw||0,padY:r.padY}}',s['id']);ang=rec['yaw'];dist=100 if s['id']=='holdfast' else 42
    view(s['x']+math.sin(ang)*dist,s['z']+math.cos(ang)*dist,s['x'],s['z'],s['y']+5)
    result=ev('id=>{const a=__CURFEW,c=a.ctx;return {id,state:a.state(),stats:a.frameStats(),fixture:c.systems.get("places").fixtureOf(id),territory:c.systems.get("territory").state?.(),worker:c.systems.get("chunks").workerNote}}',s['id']);report['major_visits'].append(result);shot('major-'+s['id'],s['name']+' approach')
   except Exception: report['exceptions'].append({'case':'major-'+s['id'],'error':traceback.format_exc()});save()
  # Holdfast details use the exact shared local-space plan, transformed by the live place.
  town=ev('''async()=>{const {HOLDFAST_TOWN}=await import('/curfew/src/world/holdfast-town-layout.js');const r=__CURFEW.ctx.systems.get('places').nodes.get('holdfast');return {town:HOLDFAST_TOWN,x:r.def.x,z:r.def.z,y:r.padY,yaw:r.def.yaw||0};}''')
  def tw(x,z):
   a=town['yaw'];return town['x']+x*math.cos(a)+z*math.sin(a),town['z']-x*math.sin(a)+z*math.cos(a)
  for label,x,z,tx,tz,y,ty in [('market',0,60,0,20,0,5),('keep',0,20,0,-6,0,21),('roof',0,-5,0,35,39.5,8),('upper-street',-44,42,-44,13,6.6,8),('sealed-stair',42,-36,45,-43,0,0)]:
   px,pz=tw(x,z);qx,qz=tw(tx,tz);view(px,pz,qx,qz,town['y']+ty,town['y']+y+.2);shot('holdfast-'+label,'Holdfast '+label,'position-assisted detail inspection; elevated viewpoints placed at authored heights')
  for b in town['town']['buildings']:
   if b['id'] not in ['armourer','inn','engine-house','archive','school','bell-keeper']: continue
   door=b['door'];px,pz=tw(door['x'],door['z']);qx,qz=tw(b['x'],b['z']);view(px,pz,qx,qz,town['y']+b.get('y',0)+2,town['y']+b.get('y',0)+.3);shot('holdfast-'+b['id'],b['name']+' doorway')
  report['boss_exercises']=[]
  for b in ev('()=>__CURFEW.bosses.list()'):
   try:
    # Preparation states are explicit. No claim that these are unaided victories.
    view(b['x']+14,b['z']+29,b['x'],b['z'],b['y']+5,b['y']+.1)
    step(3.4);settle(2);shot('boss-'+b['id']+'-awake',b['name']+' awake / first opening')
    trace=[]
    for tick in range(14):
     trace.append(ev('id=>{const a=__CURFEW,k=a.ctx.systems.get("boss-encounters").all.find(k=>k.id===id);a.stepWith(.75,{});return {state:k.state,stateT:k.stateT,attack:k.attack,hp:k.hp,weakOpen:k.weakOpen,pos:k.pos.toArray(),hazards:k.hazards.map(h=>({kind:h.kind,x:h.x,z:h.z,r:h.r,width:h.width}))}}',b['id']))
     if trace[-1]['state']=='warning': break
    settle(2);shot('boss-'+b['id']+'-attack',b['name']+' attack / telegraph')
    proof=ev('''id=>{const a=__CURFEW,c=a.ctx,bs=c.systems.get('boss-encounters'),k=bs.all.find(k=>k.id===id),p=c.systems.get('player'),cam=c.systems.get('camera'),pr=c.systems.get('progress');const before={hp:k.hp,cash:pr.cash(),finishes:[...(pr.save.data.finishes||[])]};const anchor=k.site.anchors[0];bs.damage(anchor.enemy,40,{zone:'anchor'});k.rig.root.updateMatrixWorld(true);const target=k.rig.weak.getWorldPosition(p.pos.clone()),origin=c.camera.position.clone(),dir=target.clone().sub(origin).normalize();const hit=bs.raycast(origin,dir,200);const weakProbe=hit?{owner:hit.enemy.id,zone:hit.zone,t:hit.t}:null;const afterAnchor={hp:k.hp,spent:anchor.spent,weakOpen:k.weakOpen};bs.damage(k,100000,{zone:'heart'});const after={hp:k.hp,alive:k.alive,cleared:pr.bossCleared(k.id),cash:pr.cash(),finishes:[...(pr.save.data.finishes||[])]};bs.damage(k,100000,{zone:'heart'});return {id,before,afterAnchor,weakProbe,after,duplicateCash:pr.cash()};}''',b['id']);proof['trace']=trace;report['boss_exercises'].append(proof);check('boss '+b['id']+' clear reward is idempotent',proof['after']['cleared'] and proof['after']['cash']==proof['duplicateCash'],proof)
    step(6.5);settle(2);shot('boss-'+b['id']+'-cleared',b['name']+' defeated and altered arena','developer damage-path injection to verify reward/world state; not a natural victory')
   except Exception: report['exceptions'].append({'case':'boss-'+b['id'],'error':traceback.format_exc()});save()
  for k in ev('()=>__CURFEW.ctx.systems.get("kneeler").list()'):
   try:
    view(k['x']+12,k['z']+24,k['x'],k['z'],k['y']+5,k['y']+.2);step(4);settle(2);shot('kneeler-'+k['id'],'Original Kneeler at '+k['id'])
   except Exception: report['exceptions'].append({'case':'kneeler-'+k['id'],'error':traceback.format_exc()})
  report['pre_reload_save']=ev('()=>{const p=__CURFEW.ctx.systems.get("progress");p.save.flush();return p.save.data}');report['pre_reload_bosses']=ev('()=>__CURFEW.bosses.state()')
  for name in ['home','perks','map','weapons','ledger','controls']:
   ev('id=>{const c=__CURFEW.ctx,h=c.systems.get("hud");h.pause(true);h.menu.show(id);}',name);shot('ui-'+name,'Pause menu: '+name,'actual menu rendering with accumulated audit progression')
   report.setdefault('ui_layout',[]).append(ev('id=>({id,viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],pause:document.getElementById("curfew-pause").getBoundingClientRect().toJSON(),text:document.getElementById("curfew-pause").innerText})',name))
  ev('()=>__CURFEW.ctx.systems.get("hud").pause(false)')
  report['end_state']=ev('()=>({state:__CURFEW.state(),stats:__CURFEW.frameStats(),errors:__CURFEW.errors(),lore:__CURFEW.ctx.systems.get("lore-ledger").state()})')
  coverage=cdp.send('Profiler.takePreciseCoverage')['result'];(OUT/'v8-coverage.json').write_text(json.dumps([x for x in coverage if '/curfew/src/' in x['url']]))
  page.reload(wait_until='domcontentloaded');page.wait_for_function('window.__CURFEW?.ready||window.__CURFEW?.bootError',timeout=240000);step(.2)
  report['post_reload']=ev('()=>({ready:__CURFEW.ready,error:__CURFEW.bootError,save:__CURFEW.ctx.systems.get("progress").save.data,bosses:__CURFEW.bosses.state(),lateBell:__CURFEW.ctx.systems.get("late-bell").state()})')
  check('all earned boss finishes persist through real page reload',set(report['pre_reload_save'].get('finishes',[]))<=set(report['post_reload']['save'].get('finishes',[])))
  check('no uncaught runtime page errors',not any(e['kind']=='pageerror' for e in report['events']))
  check('no failed HTTP game assets',not any(e['kind']=='http-error' and '/curfew/' in e['url'] for e in report['events']))
 except Exception: report['exceptions'].append({'case':'outer','error':traceback.format_exc()});print(traceback.format_exc(),flush=True)
 finally:
  report['finished']=time.time();save();browser.close();server.shutdown()
