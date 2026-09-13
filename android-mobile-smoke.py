#!/usr/bin/env python3
"""Phone-size Chromium integration tests; no Android runtime or FPS claims.
Page.screenshot timed out in prior runs. Canvas pixel export is kept separate
from checks, and those historical failures remain in the delivery evidence.
"""
import json,functools,http.server,threading,traceback,base64
from pathlib import Path
from playwright.sync_api import sync_playwright
source=Path('android-mobile/verify.py').read_text().rsplit('results=[]',1)[0]
exec(compile(source,'android-mobile/verify.py','exec'),globals())
results=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for slug,orientation in GAMES:
  print('START',slug,flush=True);www=prepare(slug);w,h=(412,915) if orientation=='portrait' else (915,412)
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(www)));threading.Thread(target=server.serve_forever,daemon=True).start()
  base=f'http://127.0.0.1:{server.server_port}';ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,device_scale_factor=1,user_agent='Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',service_workers='block')
  page=ctx.new_page();page.set_default_timeout(7000);errors=[];missing=[];external=[]
  r={'slug':slug,'viewport':[w,h],'errors':errors,'missing':missing,'external':external,'checks':[]};results.append(r)
  def save(): (EVIDENCE/'integration-results.json').write_text(json.dumps(results,indent=2))
  def check(name,value):r['checks'].append({'name':name,'passed':bool(value)});save()
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda response:missing.append(response.url) if response.status>=400 else None)
  def route(req):
   if req.request.url.startswith(base) or req.request.url.startswith(('blob:','data:')):req.continue_()
   else:external.append(req.request.url);req.abort()
  ctx.route('**/*',route)
  try:
   page.goto(base+'/'+slug+'/index.html',wait_until='domcontentloaded',timeout=15000);page.wait_for_timeout(900)
   check('canvas_visible',page.locator('canvas').first.is_visible());check('host_loaded',page.evaluate('!!window.__androidHost'))
   if slug=='falling-open':page.locator('#start').tap()
   elif slug=='thurible':page.locator('#begin').tap()
   elif slug=='no-moon':
    page.locator('#startBtn').tap();page.wait_for_timeout(350);page.locator('#startBtn').tap()
   else:page.touchscreen.tap(w*.5,h*.55)
   page.wait_for_timeout(500)
   active={'lil-big-bang':"__LBB.state().run!==null",'falling-open':"document.body.dataset.mode==='playing'",'i-seent-it':"__SEENT_IT__.snapshot().phase==='playing'",'no-moon':"state.mode==='play'",'thurible':"__THURIBLE3D__.phase()==='play'",'thrown':"__THROWN__.snapshot().phase!=='title'"}[slug]
   r['after_start']=snap(page,slug);check('entered_gameplay_via_real_tap',page.evaluate(active));print('PLAY',slug,flush=True)
   cdp=ctx.new_cdp_session(page);x=w*.4;y=h*.62
   touch(cdp,'touchStart',x,y)
   for i in range(1,7):touch(cdp,'touchMove',x+i*9,y-8*(i%3));page.wait_for_timeout(35)
   check('trusted_touch_received',page.evaluate('__androidHost.activeTouches')>=1);r['after_touch']=snap(page,slug)
   page.evaluate('__androidHost.pause()');page.wait_for_timeout(100);before=page.evaluate('performance.now()');page.wait_for_timeout(220)
   check('pause_freezes_clock',abs(page.evaluate('performance.now()')-before)<.001);check('pause_cancels_contacts',page.evaluate('__androidHost.paused&&__androidHost.activeTouches===0'))
   check('pause_suspends_audio',page.evaluate("__androidHost.audioStates.every(s=>s!=='running')"));touch(cdp,'touchCancel');page.evaluate('__androidHost.resume()');page.wait_for_timeout(200)
   check('resume_advances_clock',page.evaluate('performance.now()')>before);check('resume_schedules_frames',page.evaluate('__androidHost.pendingFrames')>0)
   touch(cdp,'touchStart',x,y);page.wait_for_timeout(50);touch(cdp,'touchEnd');page.wait_for_timeout(150);check('fresh_contact_releases',page.evaluate('__androidHost.activeTouches')==0);r['after_resume']=snap(page,slug);save()
   if slug in ['falling-open','thrown','no-moon']:
    try:
     data=page.evaluate("document.querySelector('canvas').toDataURL('image/png')");(EVIDENCE/(slug+'-canvas-play.png')).write_bytes(base64.b64decode(data.split(',',1)[1]));r['canvas_capture']='exported canvas pixels, not full UI or Android screenshot'
    except Exception as e:r['canvas_capture_error']=str(e)
   page.evaluate("localStorage.setItem('__android_integration','ok')");page.reload(wait_until='domcontentloaded',timeout=15000);page.wait_for_timeout(200)
   check('storage_survives_reload',page.evaluate("localStorage.getItem('__android_integration')")=='ok');page.evaluate("localStorage.removeItem('__android_integration')")
   check('no_javascript_exceptions',not errors);check('no_missing_requested_assets',not missing);check('no_remote_requests',not external)
  except Exception as e:r['exception']=str(e);r['traceback']=traceback.format_exc();check('completed',False)
  finally:
   r['passed']=all(c['passed'] for c in r['checks']);save();print('END',slug,r['passed'],flush=True);ctx.close();server.shutdown();server.server_close()
 browser.close()
summary={'runs':len(results),'checks':sum(len(r['checks']) for r in results),'failed':sum(not c['passed'] for r in results for c in r['checks']),'environment':'Chromium phone-size touch emulation, not Android'}
(EVIDENCE/'integration-summary.json').write_text(json.dumps(summary,indent=2));print(summary);raise SystemExit(1 if summary['failed'] else 0)
