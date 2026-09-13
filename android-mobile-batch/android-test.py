#!/usr/bin/env python3
"""Smoke-test these apps on a clean Android emulator, not a physical phone."""
import json, pathlib, subprocess, time, urllib.request
import websocket
HERE=pathlib.Path(__file__).resolve().parent
QA=HERE/'out/qa'; QA.mkdir(parents=True,exist_ok=True)
PROJECT=HERE/'out/MobileGamesAndroid'
GAMES=[('fallingopen','falling-open'),('lilbigbang','lil-big-bang'),('thrown','thrown'),('iseentit','i-seent-it')]

def adb(*args,timeout=40,binary=False):
    return subprocess.check_output(['adb',*map(str,args)],timeout=timeout,text=not binary,stderr=subprocess.STDOUT)

def connect(package):
    pid=adb('shell','pidof',package).strip().split()[0]
    adb('forward','tcp:9239','localabstract:webview_devtools_remote_'+pid)
    error=None
    for _ in range(10):
        try:
            targets=json.load(urllib.request.urlopen('http://127.0.0.1:9239/json',timeout=5))
            target=next(t for t in targets if t.get('type')=='page')
            return websocket.create_connection(target['webSocketDebuggerUrl'],timeout=15,suppress_origin=True)
        except Exception as e: error=e;time.sleep(1)
    raise RuntimeError('WebView debugger unavailable: '+str(error))

seq=0

def evaluate(ws,expression):
    global seq
    seq+=1; current=seq
    ws.send(json.dumps({'id':current,'method':'Runtime.evaluate','params':{'expression':expression,'returnByValue':True}}))
    while True:
        response=json.loads(ws.recv())
        if response.get('id')==current:
            if 'error' in response: raise RuntimeError(str(response['error']))
            if response.get('result',{}).get('exceptionDetails'): raise RuntimeError(str(response['result']['exceptionDetails']))
            return response.get('result',{}).get('result',{}).get('value')

reports=[]
adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
for module,slug in GAMES:
    package='com.qualiacology.'+module
    report={'slug':slug,'package':package,'physical_phone':False}
    ws=None
    try:
        apk=PROJECT/module/'build/outputs/apk/debug'/f'{module}-debug.apk'
        report['install']=adb('install','-r',apk,timeout=100)
        adb('logcat','-c')
        report['launch']=adb('shell','am','start','-W','-n',package+'/com.qualiacology.mobilegame.MainActivity')
        time.sleep(5)
        ws=connect(package)
        report['initial']=evaluate(ws,"({title:document.title, url:location.href, canvas:Array.from(document.querySelectorAll('canvas'),c=>({width:c.width,height:c.height})),text:document.body.innerText.slice(0,5000),width:innerWidth,height:innerHeight,visibility:document.visibilityState})")
        evaluate(ws,"window.__nativeSmokeFrames=0;window.__nativeSmokeLoop=()=>{window.__nativeSmokeFrames++;requestAnimationFrame(window.__nativeSmokeLoop)};requestAnimationFrame(window.__nativeSmokeLoop);localStorage.setItem('__android_native_smoke','retained');true")
        size=adb('shell','wm','size').strip().split()[-1].split('x');w,h=map(int,size)
        adb('shell','input','tap',w//2,int(h*.64))
        evaluate(ws,"(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>/^(play|begin|start|enter|continue|fall|accept|sign)(\\b|\\s)/i.test(b.innerText.trim())&&!/restart|again|movement/i.test(b.innerText)&&b.getBoundingClientRect().width>0);if(b){b.click();return b.innerText}return null})()")
        adb('shell','input','swipe',w//2,int(h*.58),int(w*.72),int(h*.46),700)
        time.sleep(3)
        report['renderFrames']=evaluate(ws,'window.__nativeSmokeFrames')
        (QA/(slug+'-android.png')).write_bytes(adb('exec-out','screencap','-p',binary=True,timeout=45))
        adb('shell','input','keyevent','KEYCODE_BACK');time.sleep(1)
        adb('shell','uiautomator','dump','/sdcard/mobile-smoke-ui.xml',timeout=35)
        menu=adb('shell','cat','/sdcard/mobile-smoke-ui.xml')
        report['nativePauseMenu']='Game paused' in menu and 'Resume' in menu
        adb('shell','input','keyevent','KEYCODE_BACK');time.sleep(1)
        adb('shell','input','keyevent','KEYCODE_HOME');time.sleep(1)
        before=evaluate(ws,'window.__nativeSmokeFrames');time.sleep(1);after=evaluate(ws,'window.__nativeSmokeFrames')
        report['backgroundFrameDelta']=after-before
        adb('shell','am','start','-W','-n',package+'/com.qualiacology.mobilegame.MainActivity');time.sleep(2)
        report['resumedFrames']=evaluate(ws,'window.__nativeSmokeFrames')-after
        report['storageRetained']=evaluate(ws,"localStorage.getItem('__android_native_smoke')==='retained'")
        evaluate(ws,"localStorage.removeItem('__android_native_smoke');true")
        logs=adb('logcat','-d','-s','AndroidRuntime:E','Qualiacology:I','QualiacologyJS:D',timeout=30)
        (QA/(slug+'-android-logcat.txt')).write_text(logs)
        report['fatalException']='FATAL EXCEPTION' in logs
        report['passed']=(report['renderFrames']>5 and bool(report['initial']['canvas']) and report['nativePauseMenu'] and report['backgroundFrameDelta']<=2 and report['resumedFrames']>2 and report['storageRetained'] and not report['fatalException'])
    except Exception as e:
        report['passed']=False;report['error']=str(e)
    finally:
        if ws:
            try:ws.close()
            except Exception:pass
        try:adb('shell','am','force-stop',package)
        except Exception:pass
        reports.append(report)
        (QA/'android-report.json').write_text(json.dumps({'environment':'Android API 35 Google APIs x86_64 emulator, network disabled','reports':reports},indent=2))
        print(json.dumps(report),flush=True)
if any(not r['passed'] for r in reports):raise SystemExit(1)
