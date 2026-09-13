#!/usr/bin/env python3
"""Browser tests, not Android-device tests. Exercises the APK's exact asset tree."""
import functools, hashlib, http.server, json, shutil, threading, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd(); OUT=Path('/tmp/android-browser'); PROJECTS=OUT/'projects'; EVIDENCE=OUT/'evidence'; EVIDENCE.mkdir(parents=True,exist_ok=True)
GAMES=[('lil-big-bang','portrait'),('falling-open','portrait'),('i-seent-it','portrait'),('no-moon','landscape'),('thurible','landscape'),('thrown','portrait')]
INJECTION='<!-- QUALIACOLOGY_ANDROID_HOST_BEGIN -->\n<script src="/android-host.js"></script>\n<script src="/android-game-adapter.js"></script>\n<!-- QUALIACOLOGY_ANDROID_HOST_END -->\n'
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):
  self.send_header('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-src 'none'")
  super().end_headers()
def prepare(slug):
 www=PROJECTS/slug;www.mkdir(parents=True,exist_ok=True);shutil.copytree(ROOT/slug,www/slug,dirs_exist_ok=True)
 if slug=='no-moon':shutil.rmtree(www/slug/'codex',ignore_errors=True)
 if slug=='i-seent-it':(www/slug/'og.png').unlink(missing_ok=True)
 (www/'assets').mkdir(exist_ok=True)
 for f in ['favicon.svg','icon-192.png','icon-512.png']:shutil.copy2(ROOT/'assets'/f,www/'assets'/f)
 if slug=='no-moon':shutil.copytree(ROOT/'assets/no-moon',www/'assets/no-moon',dirs_exist_ok=True)
 for f in ['android-host.js','android-game-adapter.js']:shutil.copy2(ROOT/'android-mobile'/f,www/f)
 p=www/slug/'index.html';raw=p.read_bytes();i=raw.lower().find(b'<head>')+6;p.write_bytes(raw[:i]+b'\n'+INJECTION.encode()+raw[i:])
 manifest={p.relative_to(www).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in www.rglob('*') if p.is_file()}
 (EVIDENCE/(slug+'-asset-hashes.json')).write_text(json.dumps(manifest,indent=2))
 return www
def snap(page,slug):
 expr={'lil-big-bang':'window.__LBB.state()','falling-open':'({mode:document.body.dataset.mode,ready:document.body.dataset.gameReady})','i-seent-it':'window.__SEENT_IT__.snapshot()','no-moon':'({mode:window.state?.mode,player:window.state?.player?{x:window.state.player.x,y:window.state.player.y,hp:window.state.player.hp}:null})','thurible':'window.__THURIBLE3D__.info()','thrown':'window.__THROWN__.snapshot()'}[slug]
 return page.evaluate(expr)
def touch(cdp,kind,x=0,y=0):
 cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ('touchEnd','touchCancel') else [{'x':x,'y':y,'id':1,'radiusX':7,'radiusY':7,'force':1}]})
def test(browser,slug,www,width,height):
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(www)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=1.5,user_agent='Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',service_workers='block')
 page=ctx.new_page();errors=[];missing=[];external=[];checks=[];result={'slug':slug,'viewport':[width,height],'checks':checks,'errors':errors,'missing_requests':missing,'external_requests':external};prefix=EVIDENCE/f'{slug}-{width}x{height}'
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:missing.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 def route(r):
  if r.request.url.startswith(base) or r.request.url.startswith(('data:','blob:')):r.continue_()
  else:external.append(r.request.url);r.abort()
 ctx.route('**/*',route)
 def check(name,ok,details=None):checks.append({'name':name,'passed':bool(ok),'details':details})
 try:
  page.goto(base+'/'+slug+'/index.html',wait_until='networkidle',timeout=40000)
  api={'lil-big-bang':'__LBB','falling-open':'__androidHost','i-seent-it':'__SEENT_IT__','no-moon':'state','thurible':'__THURIBLE3D__','thrown':'__THROWN__'}[slug]
  page.wait_for_function(f'!!window.{api}',timeout=40000);page.wait_for_timeout(800);check('boot_api_ready',True);check('visible_canvas',page.locator('canvas').first.is_visible());result['initial']=snap(page,slug);page.screenshot(path=str(prefix)+'-title.png')
  if slug=='falling-open':page.locator('#start').tap()
  elif slug=='thurible':page.locator('#begin').tap()
  elif slug=='no-moon':page.locator('#startBtn').tap()
  elif slug=='lil-big-bang':page.touchscreen.tap(width*.5,height*.72)
  elif slug=='thrown':page.touchscreen.tap(width*.5,height*.55)
  else:page.locator('canvas').tap()
  page.wait_for_timeout(1200)
  cdp=ctx.new_cdp_session(page);canvas=page.locator('canvas').first.bounding_box();x=canvas['x']+canvas['width']*.4;y=canvas['y']+canvas['height']*.62
  touch(cdp,'touchStart',x,y);page.wait_for_timeout(100)
  for i in range(1,11):touch(cdp,'touchMove',x+i*min(9,canvas['width']/25),y-15*(i%3));page.wait_for_timeout(25)
  check('trusted_touch_received',page.evaluate('__androidHost.activeTouches')>=1);result['after_touch']=snap(page,slug)
  page.evaluate('__androidHost.pause()');page.wait_for_timeout(200);paused=page.evaluate('({paused:__androidHost.paused,touches:__androidHost.activeTouches,now:performance.now(),pending:__androidHost.pendingFrames})');page.wait_for_timeout(350);later=page.evaluate('performance.now()')
  check('pause_cancels_contacts',paused['paused'] and paused['touches']==0,paused);check('pause_freezes_virtual_clock',abs(later-paused['now'])<.001);check('pause_suspends_audio',page.evaluate("__androidHost.audioStates.every(s=>s!=='running')"),page.evaluate('__androidHost.audioStates'))
  touch(cdp,'touchCancel');page.evaluate('__androidHost.resume()');page.wait_for_timeout(300)
  check('resume_restarts_clock',page.evaluate('!__androidHost.paused&&performance.now()')>later);check('resume_has_frame_callbacks',page.evaluate('__androidHost.pendingFrames')>0)
  touch(cdp,'touchStart',x,y);page.wait_for_timeout(120);touch(cdp,'touchEnd');page.wait_for_timeout(400);check('fresh_touch_releases',page.evaluate('__androidHost.activeTouches')==0);result['after_resume']=snap(page,slug)
  page.evaluate("localStorage.setItem('__android_packaging_test','persisted')");page.screenshot(path=str(prefix)+'-play.png');page.reload(wait_until='networkidle',timeout=40000);page.wait_for_function(f'!!window.{api}',timeout=40000)
  check('storage_survives_real_reload',page.evaluate("localStorage.getItem('__android_packaging_test')")=='persisted');page.evaluate("localStorage.removeItem('__android_packaging_test')")
  check('no_javascript_exceptions',not errors,list(errors));check('all_requested_assets_bundled',not missing,list(missing));check('no_external_runtime_requests',not external,list(external))
 except Exception as e:
  result['exception']=str(e);result['traceback']=traceback.format_exc();check('test_completed',False,str(e))
  try:page.screenshot(path=str(prefix)+'-failure.png')
  except Exception:pass
 finally:ctx.close();server.shutdown();server.server_close()
 result['passed']=all(c['passed'] for c in checks);return result
results=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for slug,orientation in GAMES:
  www=prepare(slug)
  for w,h in ([(360,800),(412,915)] if orientation=='portrait' else [(800,360),(915,412)]):
   r=test(browser,slug,www,w,h);results.append(r);print(slug,w,h,'PASS' if r['passed'] else 'FAIL',flush=True);(EVIDENCE/'browser-results.json').write_text(json.dumps(results,indent=2))
 browser.close()
summary={'runs':len(results),'checks':sum(len(r['checks']) for r in results),'failed':sum(not c['passed'] for r in results for c in r['checks']),'test_environment':'Chromium phone-size touch emulation; not an Android device'};(EVIDENCE/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary));raise SystemExit(1 if summary['failed'] else 0)
