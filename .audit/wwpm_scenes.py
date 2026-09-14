from pathlib import Path
import os,json,time,traceback,shutil,threading,http.server,functools,math
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ['WWPM_SOURCE']).resolve();OUT=Path('audit-evidence').resolve();OUT.mkdir(exist_ok=True);(OUT/'screenshots').mkdir(exist_ok=True)
R={'revision':'616f75690c54ee37a53f603ecc6d7a0d1ca13b17','started':time.time(),'method':'Unchanged native game, 960x540, original graphics settings, one rendered frame per photograph. Position assistance and invulnerability, no claims of unassisted travel or target-hardware performance.','cases':[],'shots':[],'events':[],'exceptions':[]}
def save():(OUT/'scenes-report.json').write_text(json.dumps(R,indent=2,default=str))
def case(name,fn):
 try:R['cases'].append({'name':name,'result':fn()})
 except Exception:R['exceptions'].append({'name':name,'traceback':traceback.format_exc()});print(traceback.format_exc(),flush=True)
 save();print('CASE '+name,flush=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',4173),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as w:
 b=w.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 c=b.new_context(viewport={'width':960,'height':540});p=c.new_page();p.set_default_timeout(180000)
 p.on('pageerror',lambda e:R['events'].append({'kind':'pageerror','text':str(e)}));p.on('console',lambda m:R['events'].append({'kind':'console-'+m.type,'text':m.text}) if m.type in ['error','warning'] else None)
 def ev(js,a=None):return p.evaluate(js,a)
 def step(s=.1):return ev('s=>A.stepWith(s,{})',s)
 def view(x,z,tx,tz,ty=None,y=None):
  ev('q=>{A.clearInput();const pl=S("player"),cam=S("camera");A.teleport(q.x,q.z,Math.atan2(q.x-q.tx,q.z-q.tz));if(q.y!==null){pl.pos.y=q.y;pl._sync();}if(q.ty!==null)cam.setAim(cam.yaw,Math.atan2(q.ty-(pl.pos.y+1.7),Math.hypot(q.x-q.tx,q.z-q.tz)));pl.invuln=100000;A.stepWith(.15,{});}',{'x':x,'z':z,'tx':tx,'tz':tz,'ty':ty,'y':y});p.wait_for_timeout(700);step(.1)
 def shot(name,caption,setup='position-assisted native render'):
  ev('()=>A.settle(1)');f='screenshots/scenes-'+name+'.png';p.screenshot(path=str(OUT/f));R['shots'].append({'file':f,'caption':caption,'setup':setup,'state':ev('()=>A.state()'),'stats':ev('()=>A.frameStats()')});save();print('SHOT '+name,flush=True)
 def key(k,s):p.keyboard.down(k);ev('s=>A.step(1/60,Math.ceil(s*60))',s);p.keyboard.up(k);ev('()=>A.step(1/60,1)')
 try:
  p.goto('http://127.0.0.1:4173/curfew/?test=1&seed=1337',wait_until='domcontentloaded');p.wait_for_function('window.__CURFEW?.ready||window.__CURFEW?.bootError',timeout=240000);R['boot']=ev('()=>({ready:__CURFEW.ready,error:__CURFEW.bootError})');save()
  if not R['boot']['ready']:raise RuntimeError(str(R['boot']))
  ev('()=>{window.A=__CURFEW;window.C=A.ctx;window.S=id=>C.systems.get(id);A.noLock=true;S("player").invuln=100000;}');shot('opening','Fresh opening, supplementary run')
  town=ev('async()=>{const {HOLDFAST_TOWN}=await import("/curfew/src/world/holdfast-town-layout.js");const r=S("places").nodes.get("holdfast");return {town:HOLDFAST_TOWN,x:r.def.x,z:r.def.z,y:r.padY,yaw:r.yaw}}');R['holdfast_frame']=town
  def tw(x,z):a=town['yaw'];return town['x']+x*math.cos(a)+z*math.sin(a),town['z']-x*math.sin(a)+z*math.cos(a)
  def townpose(label,x,z,tx,tz,y=0,ty=3):
   px,pz=tw(x,z);qx,qz=tw(tx,tz);view(px,pz,qx,qz,town['y']+ty,town['y']+y+.2);shot('holdfast-'+label,'Holdfast '+label+' using the live local-to-world rotation')
  for row in [('front-gate',0,110,0,50,0,16),('market',0,54,0,24,0,5),('keep-stairs',3.8,-5,-3.8,-5,.2,5),('upper-lane',-44,41,-44,16,6.42,9),('keep-roof',-5,-6,12,58,38,4),('sealed-stair',43.4,-39,45,-43,0,0)]:case(row[0],lambda row=row:townpose(*row))
  def doors():
   return ev('t=>{const r=S("places").nodes.get("holdfast"),co=Math.cos(r.yaw),si=Math.sin(r.yaw),col=S("collision");return t.buildings.map(b=>{const d=b.door,dx=b.x-d.x,dz=b.z-d.z,len=Math.hypot(dx,dz),x=r.def.x+d.x*co+d.z*si,z=r.def.z-d.x*si+d.z*co,mx=(dx*co+dz*si)/len*2.5,mz=(-dx*si+dz*co)/len*2.5,y=r.padY+b.y+.2;return {id:b.id,name:b.name,x,z,y,entranceFits:col.fits(x,z,y,.32,1.7),entryFraction:col.travelFraction(x,z,y,mx,mz,.32,1.7,true)}})}',town['town'])
  case('40 authored doorway collision probes, not complete room traversal',doors)
  for id in ['armourer','engine-house','school','archive','upper-arms','bell-keeper']:
   def doorway(id=id):
    h=next(h for h in town['town']['buildings'] if h['id']==id);d=h['door'];px,pz=tw(d['x'],d['z']);qx,qz=tw(h['x'],h['z']);view(px,pz,qx,qz,town['y']+h['y']+2,town['y']+h['y']+.2);shot('door-'+id,h['name']+' at its actual authored doorway');return ev('()=>({player:A.state(),target:S("holdfast-life").state().target})')
   case('door '+id,doorway)
  def shop():
   r=ev('()=>S("holdfast-life").state().residents.find(r=>r.id==="holdfast-engine")');v=r['pos'];view(v[0]+2,v[2],v[0],v[2],v[1]+1.5,v[1]+.02);ev('()=>S("progress").payCash(1000,0,0,0,"audit-preparation")');before=ev('()=>({cash:S("progress").cash(),upgrades:S("progress").upgrades(),target:S("holdfast-life").state().target})');shot('physical-garage','Holdfast mechanic shop with offer visible','currency injected; actual physical shop UI');key('e',1);after=ev('()=>({cash:S("progress").cash(),upgrades:S("progress").upgrades(),target:S("holdfast-life").state().target})');shot('physical-garage-purchase','Physical garage after an actual one-second E hold');return {'before':before,'after':after,'spent':after['cash']<before['cash']}
  case('physical garage purchase via real DOM E',shop)
  def procession():
   ev('()=>S("clock").setPhase("black",.3)');q=ev('()=>S("lore-procession").state().frame');view(q['x']+18,q['z']+20,q['x'],q['z'],q['padY']+2);step(12);shot('black-rib-procession','Seven mourners passing through the Black Rib during Black Hour');return ev('()=>S("lore-procession").state()')
  case('Black Rib procession',procession)
  def lookout():
   q=ev('()=>{const r=S("places").nodes.get("great-tree");return {x:r.def.x,z:r.def.z,y:S("lore-lookout").deckY}}');view(q['x']+3,q['z'],q['x']+300,q['z'],q['y']+15,q['y']+.1);shot('great-tree-count','Great Tree lookout and currently powered-destination horizon');return ev('()=>S("lore-lookout").state()')
  case('Great Tree powered-light count',lookout)
  def lighthouse():
   q=ev('()=>{const r=S("places").nodes.get("lighthouse");return {x:r.def.x,z:r.def.z,y:r.padY,yaw:r.yaw}}');view(q['x']+20,q['z']+28,q['x'],q['z'],q['y']+15);shot('lighthouse-reservoir','Lighthouse and terrain-shaped reservoir');return q
  case('lighthouse reservoir view',lighthouse)
  def story(id):
   q=ev('id=>S("world-stories").state().targets.find(t=>t.id===id)',id)
   if not q:return {'missingTarget':id}
   # Try ground-level approaches; read only when the actual interaction selects the target.
   trials=[]
   for a in [0,math.pi/2,math.pi,math.pi*1.5]:
    view(q['x']+math.sin(a)*2,q['z']+math.cos(a)*2,q['x'],q['z'],q['y']);selected=ev('()=>S("world-stories").state().target');trials.append(selected)
    if selected==id:break
   shot('story-'+id,'Physical story fixture '+id);key('e',.5);shot('story-'+id+'-read','Actual E reading / interaction at '+id);return {'trials':trials,'flag':ev('id=>S("progress").flag("story:"+id)',id),'world':ev('()=>S("world-stories").state()')}
  for id in ['road-card','sinkhole-view','xmas-power']:case('story '+id,lambda id=id:story(id))
  def dealer():
   q=ev('()=>S("dealer").state()');view(q['x']+5,q['z']+5,q['x'],q['z'],q['y']+1.5);shot('travelling-dealer','Current travelling arms dealer and camp');return ev('()=>S("dealer").state()')
  case('travelling dealer',dealer)
  R['final']=ev('()=>({state:A.state(),errors:A.errors(),stats:A.frameStats()})')
 except BaseException:R['exceptions'].append({'name':'outer','traceback':traceback.format_exc()});print(traceback.format_exc(),flush=True)
 finally:R['finished']=time.time();save();b.close();server.shutdown()
