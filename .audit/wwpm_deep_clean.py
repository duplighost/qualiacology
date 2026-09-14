"""Correct the audit harness only. No game files are modified."""
from pathlib import Path
p=Path('.audit/wwpm_deep.py');s=p.read_text()
def replace(old,new):
 global s
 assert old in s,repr(old)
 s=s.replace(old,new)
replace('deep-report.json','deep-clean-report.json')
replace("'screenshots/deep-'","'screenshots/deep-clean-'")
replace('pr.addCash(1000,"audit-preparation")','pr.payCash(1000,0,0,0,"audit-preparation")')
replace("shot('car-driving','Driver viewpoint after acceleration and steering inputs');key('e',.12);step(1);after=", "shot('car-driving','Driver viewpoint after acceleration and steering inputs');key('Space',1.2);key('e',.12);step(1);after=")
replace("  case('car E entry, acceleration, steering, horn, E exit',car_case)","  case('car E entry, acceleration, steering, horn, brake, E exit',car_case)\n  boot(True) # Isolate subsequent scenes regardless of the car result.")
replace(" def view(x,z,tx,tz,ty=None,y=None):\n", " def view(x,z,tx,tz,ty=None,y=None):\n  if ev('()=>!!C.shared.inCar'):raise RuntimeError('HARNESS PRECONDITION: scene requires player on foot')\n")
replace("'y':y});settle()", "'y':y});settle()\n  actual=ev('()=>A.state().simPos')\n  if math.hypot(actual[0]-x,actual[2]-z)>6:raise RuntimeError('HARNESS POSITION GUARD '+str({'requested':[x,z],'actual':actual}))")
replace("  ev('()=>A.settle(2)')\n def key", "  # Rendering is reserved for the photograph, not each setup step.\n def key")
replace("ev('()=>A.settle(2)');f=", "ev('()=>A.settle(1)');f=")
replace("   p.mouse.down();ev('()=>A.step(1/60,3)')", "   p.mouse.move(640,360);ev('t=>{A.clearInput();const cam=S(\"camera\"),o=C.camera.position;cam.setAim(Math.atan2(o.x-t.x,o.z-t.z),Math.atan2(t.y-o.y,Math.hypot(t.x-o.x,t.z-o.z)));}',result);p.mouse.down();ev('()=>A.step(1/60,3)')")
replace("row=ev('s=>S(\"lore-dead\").rows.find(r=>r.species===s)',species)","row=ev('s=>{const r=S(\"lore-dead\").rows.find(r=>r.species===s);return {x:r.x,z:r.z};}',species)")
Path('audit-evidence').mkdir(exist_ok=True)
Path('audit-evidence/executed-deep-clean.py').write_text(s)
exec(compile(s,'.audit/wwpm_deep_clean.executed.py','exec'),{'__name__':'__main__'})
