"""Supplementary inspection only; original curfew source is not modified."""
from pathlib import Path
base=Path('.audit/wwpm_scenes.py').read_text();base=base[:base.index(' try:\n  p.goto')]
base=base.replace('scenes-report.json','final-report.json').replace("'screenshots/scenes-'","'screenshots/final-'")
body=r''' try:
  p.goto('http://127.0.0.1:4173/curfew/?test=1&seed=1337',wait_until='domcontentloaded');p.wait_for_function('window.__CURFEW?.ready||window.__CURFEW?.bootError',timeout=240000);R['boot']=ev('()=>({ready:__CURFEW.ready,error:__CURFEW.bootError})');save()
  if not R['boot']['ready']:raise RuntimeError(str(R['boot']))
  ev('()=>{window.A=__CURFEW;window.C=A.ctx;window.S=id=>C.systems.get(id);A.noLock=true;S("player").invuln=100000;}');step(.2)
  def gate():
   q=ev('()=>S("holdfast-life").world(5.8,62,0)');view(q['x'],q['z'],q['x'],q['z']+4,q['y']+1.3,q['y']+.05);before=ev('()=>S("places").gateIsOpen("holdfast")');shot('inner-crank-before','Holdfast inner gate crank before E');key('e',.2);step(1);shot('inner-crank-after','Holdfast gate after the actual E input');return {'before':before,'after':ev('()=>S("places").gateIsOpen("holdfast")')}
  case('inside-only gate crank actual E',gate)
  def stairs():
   q=ev('()=>S("boss-sites")._hatch()');view(q['x'],q['z']+6,q['x'],q['z']-4,q['y']-1,q['y']+.05);shot('crypt-walk-top','The real descending crypt stair before walking');trace=[]
   for i in range(10):
    key('w',.3);trace.append(ev('()=>({pos:A.state().simPos,inside:S("boss-sites").inside})'))
    if trace[-1]['inside']:break
   shot('crypt-walk-end','Position reached by keyboard walking down the crypt stair');return {'setup':'placed at top of stair; ordinary W input, no _transfer call','trace':trace,'entered':trace[-1]['inside']}
  case('walked crypt entrance',stairs)
  for id in ['underkeep','antler','fieldmaw']:
   def boss(id=id):
    if id!='underkeep':ev('()=>{if(S("boss-sites").inside)S("boss-sites")._transfer(false)}')
    q=ev('id=>{const k=S("boss-encounters").all.find(k=>k.id===id);return {x:k.home.x,y:k.home.y,z:k.home.z,name:k.def.name}}',id)
    view(q['x']+12,q['z']+29,q['x'],q['z'],q['y']+4,q['y']+.08);step(3.7);shot('boss-'+id+'-awake',q['name']+' awake')
    # This is an input-path combat exercise with invulnerability and replenished reserve, not a balanced natural victory.
    ev('()=>S("weapons").addReserveTo("bolt",160)');hits=[]
    for i in range(12):
     state=ev('id=>{const k=S("boss-encounters").all.find(k=>k.id===id);return {alive:k.alive,hp:k.hp,weakOpen:k.weakOpen,state:k.state}}',id)
     if not state['alive']:break
     for j in range(50):
      if ev('id=>S("boss-encounters").all.find(k=>k.id===id).weakOpen',id):break
      step(.3)
     p.mouse.move(480,270);ev('id=>{A.clearInput();const k=S("boss-encounters").all.find(k=>k.id===id),o=C.camera.position;k.rig.root.updateMatrixWorld(true);const t=k.rig.weak.getWorldPosition(o.clone()),cam=S("camera");cam.setAim(Math.atan2(o.x-t.x,o.z-t.z),Math.atan2(t.y-o.y,Math.hypot(t.x-o.x,t.z-o.z)));}',id)
     p.mouse.down();ev('()=>A.step(1/60,3)');p.mouse.up();step(.8);hits.append(ev('id=>{const k=S("boss-encounters").all.find(k=>k.id===id);return {hp:k.hp,alive:k.alive,combat:S("combat").dump()}}',id));key('r',.1);step(3)
     if i==3:shot('boss-'+id+'-combat',q['name']+' after real mouse-fired weak-tissue shots','assisted aim, invulnerability and reserve ammunition; real mouse/weapon/combat path')
    result=ev('id=>{const b=S("boss-encounters"),k=b.all.find(k=>k.id===id),pr=S("progress"),natural=!k.alive;if(k.alive)b.damage(k,100000,{zone:"heart"});const cash=pr.cash();b.damage(k,100000,{zone:"heart"});return {id,cleared:pr.bossCleared(id),cash,duplicateCash:pr.cash(),clearedByMouseShots:natural,remainingAfterShots:k.hp}}',id)
    step(7);shot('boss-'+id+'-cleared',q['name']+' defeated remains','see case log: actual mouse victory when clearedByMouseShots is true, otherwise direct damage fallback');result['shots']=hits;return result
   case('remaining boss '+id,boss)
  for k in ev('()=>S("kneeler").list()'):
   def kn(k=k):
    view(k['x']+10,k['z']+21,k['x'],k['z'],k['y']+4.5,k['y']+.1);step(7);shot('kneeler-'+k['id'],'Original Kneeler at '+k['id']);return ev('id=>S("kneeler").list().find(k=>k.id===id)',k['id'])
   case('Kneeler '+k['id'],kn)
  def generator():
   q=ev('()=>S("world-stories").state().targets.find(t=>t.id==="xmas-power")');view(q['x'],q['z']+2,q['x'],q['z'],q['y']);step(16);before=ev('()=>({flag:S("progress").flag("story:xmas-power"),bulbs:S("dusk-to-dawn").state().bulbs,cash:S("progress").cash()})');key('e',1.5);step(.2);shot('christmas-restored','Christmas generator after the actual 1.5-second E hold','normal interaction; no repair flag injected');after=ev('()=>({flag:S("progress").flag("story:xmas-power"),bulbs:S("dusk-to-dawn").state().bulbs,cash:S("progress").cash()})');key('e',1.5);return {'before':before,'after':after,'duplicate':ev('()=>({bulbs:S("dusk-to-dawn").state().bulbs,cash:S("progress").cash()})')}
  case('Christmas generator full hold and duplicate reward',generator)
  def lake():
   q=ev('()=>{const r=S("places").nodes.get("drowned-light"),d=S("late-bell").drowned;return {x:r.def.x,z:r.def.z,y:r.padY,keys:Object.keys(S("late-bell"))}}');R['lakeInfo']=q
   view(q['x']+20,q['z']+24,q['x'],q['z'],q['y']+12);step(16);shot('drowned-light-reservoir','The Drowned Light and its terrain-shaped reservoir')
   ev('()=>S("places").claim("drowned-light")');step(3)
   data=ev('()=>{const l=S("late-bell");for(const key of Object.keys(l)){const v=l[key];if(v&&typeof v.state==="function"&&"points" in v&&"time" in v)return {key,state:v.state(),points:v.points.map(p=>p.position.toArray())}}return null}');R['boatSystem']=data
   if not data:return {'fixtureProblem':'could not locate memory instance','info':q}
   points=data['points'];mx=sum(v[0] for v in points)/len(points);mz=sum(v[2] for v in points)/len(points)
   view(q['x']+3,q['z']+3,mx,mz,points[0][1],q['y']+23);shot('nine-lanterns-all','Nine reservoir lanterns after power restoration','place.claim injected to isolate the story consequence; player camera placed on upper lighthouse')
   rows=[data['state']]
   for label,s in [('first-lost',10),('several-lost',7),('all-lost',10)]:
    step(s);rows.append(ev('key=>S("late-bell")[key].state()',data['key']));shot('nine-lanterns-'+label,'Reservoir lanterns: '+label)
   return {'setup':'claim method injection, actual subsequent animation and persistence state','states':rows,'saved':ev('()=>({done:S("progress").flag("story:nine-boats"),pending:S("progress").flag("story:nine-boats-pending")})')}
  case('lighthouse nine-lantern sequence',lake)
  def lookout():
   q=ev('()=>{const r=S("places").nodes.get("great-tree"),l=S("lore-lookout");return {x:r.def.x,z:r.def.z,y:l.deckY,point:l.points.find(p=>p.mesh.visible)?.mesh.position.toArray()}}');view(q['x']+8,q['z']+3,q['x']+200,q['z']+100,q['y']+12,q['y']+.1);step(16);shot('lookout-clear-view','Great Tree outer lookout view, avoiding the tree-trunk-obstructed earlier camera');return ev('()=>S("lore-lookout").state()')
  case('lookout unobstructed photographic revisit',lookout)
  def all_rewards():
   return ev('()=>{const b=S("boss-encounters"),pr=S("progress"),out=[];for(const k of b.all){const before=pr.cash();if(k.alive)b.damage(k,100000,{zone:"heart"});const once=pr.cash();b.damage(k,100000,{zone:"heart"});out.push({id:k.id,cleared:pr.bossCleared(k.id),before,once,twice:pr.cash()});}pr.save.flush();return {rows:out,finishes:pr.unlockedFinishes()}}')
  case('all eleven boss reward paths and duplicate refusal in one native save',all_rewards)
  for name in ['home','perks','map','weapons','ledger','controls']:
   def ui(name=name):
    ev('name=>{S("hud").pause(true);S("hud").menu.show(name);}',name);shot('ui-'+name,'Pause page: '+name,'actual live menu; boss reward paths exercised before capture');return ev('name=>({name,text:document.getElementById("curfew-pause").innerText,rect:document.getElementById("curfew-pause").getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight]})',name)
   case('UI '+name,ui)
  def map_click():
   ev('()=>S("hud").menu.show("map")');loc=p.locator('canvas.map');rect=loc.bounding_box() if loc.count() else None
   if not rect:return {'fixtureProblem':'canvas.map selector missing'}
   p.mouse.click(rect['x']+rect['width']*.65,rect['y']+rect['height']*.4);way=ev('()=>S("progress").waypoint()');shot('waypoint-click','Waypoint placed by a real click on the map');return {'waypoint':way}
  case('map waypoint DOM click',map_click)
  ev('()=>{S("hud").pause(false);S("progress").save.flush()}');R['preReload']=ev('()=>({finishes:S("progress").unlockedFinishes(),waypoint:S("progress").waypoint(),save:S("progress").save.data})')
  p.reload(wait_until='domcontentloaded');p.wait_for_function('window.__CURFEW?.ready',timeout=240000);ev('()=>{window.A=__CURFEW;window.C=A.ctx;window.S=id=>C.systems.get(id);A.noLock=true;}');step(.3);R['postReload']=ev('()=>({finishes:S("progress").unlockedFinishes(),waypoint:S("progress").waypoint(),bosses:S("boss-encounters").state(),generator:S("progress").flag("story:xmas-power"),boats:S("progress").flag("story:nine-boats"),errors:A.errors()})');shot('reward-save-reload','Real reload after all eleven rewards, repair, reservoir sequence and map click')
 except BaseException:R['exceptions'].append({'name':'outer','traceback':traceback.format_exc()});print(traceback.format_exc(),flush=True)
 finally:R['finished']=time.time();save();b.close();server.shutdown()
'''
source=base+body;Path('audit-evidence').mkdir(exist_ok=True);Path('audit-evidence/executed-final.py').write_text(source);exec(compile(source,'executed-final.py','exec'),{'__name__':'__main__'})
