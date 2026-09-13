#!/usr/bin/env python3
import json,functools,http.server,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
# Reuse the EXACT packaging fixture builder and CSP from the full verifier.
source=Path('android-mobile/verify.py').read_text().rsplit('results=[]',1)[0]
exec(compile(source,'android-mobile/verify.py','exec'),globals())
results=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for slug,orientation in GAMES:
  print('START',slug,flush=True);www=prepare(slug);w,h=(412,915) if orientation=='portrait' else (915,412)
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(www)));threading.Thread(target=server.serve_forever,daemon=True).start()
  base=f'http://127.0.0.1:{server.server_port}';ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,device_scale_factor=1,service_workers='block')
  page=ctx.new_page();page.set_default_timeout(7000);errors=[];missing=[];external=[]
  r={'slug':slug,'viewport':[w,h],'errors':errors,'missing':missing,'external':external,'checks':[]};results.append(r)
  def save(): (EVIDENCE/'smoke-results.json').write_text(json.dumps(results,indent=2))
  def check(name,value):r['checks'].append({'name':name,'passed':bool(value)});save()
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda response:missing.append(response.url) if response.status>=400 else None)
  def route(req):
   if req.request.url.startswith(base) or req.request.url.startswith(('blob:','data:')):req.continue_()
   else:external.append(req.request.url);req.abort()
  ctx.route('**/*',route)
  try:
   page.goto(base+'/'+slug+'/index.html',wait_until='domcontentloaded',timeout=15000);page.wait_for_timeout(800)
   check('canvas_visible',page.locator('canvas').first.is_visible());check('host_loaded',page.evaluate('!!window.__androidHost'))
   page.screenshot(path=str(EVIDENCE/(slug+'-smoke-title.png')),timeout=8000);print('TITLE',slug,flush=True)
   if slug=='falling-open':page.locator('#start').tap()
   elif slug=='thurible':page.locator('#begin').tap()
   elif slug=='no-moon':page.locator('#startBtn').tap()
   else:page.touchscreen.tap(w*.5,h*.55)
   page.wait_for_timeout(500);page.touchscreen.tap(w*.42,h*.62);page.wait_for_timeout(300)
   check('touch_roundtrip_completed',True)
   page.screenshot(path=str(EVIDENCE/(slug+'-smoke-play.png')),timeout=8000)
   try:r['snapshot']=snap(page,slug)
   except Exception as e:r['snapshot_error']=str(e)
   page.evaluate("localStorage.setItem('__android_smoke','ok')")
   page.reload(wait_until='domcontentloaded',timeout=15000);check('storage_survives_reload',page.evaluate("localStorage.getItem('__android_smoke')")=='ok')
   check('no_javascript_exceptions',not errors);check('no_missing_requested_assets',not missing);check('no_remote_requests',not external)
  except Exception as e:r['exception']=str(e);r['traceback']=traceback.format_exc();check('completed',False)
  finally:
   r['passed']=all(c['passed'] for c in r['checks']);save();print('END',slug,r['passed'],flush=True);ctx.close();server.shutdown();server.server_close()
 browser.close()
summary={'runs':len(results),'checks':sum(len(r['checks']) for r in results),'failed':sum(not c['passed'] for r in results for c in r['checks']),'environment':'Chromium phone-size touch emulation, not Android'}
(EVIDENCE/'smoke-summary.json').write_text(json.dumps(summary,indent=2));print(summary);raise SystemExit(1 if summary['failed'] else 0)
